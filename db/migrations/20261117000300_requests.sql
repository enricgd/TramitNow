-- Peticiones (fase 5 de docs/plan-desarrollo.md; pantalla: apps/web/src/views/PeticionesView.jsx y las notas
-- design/cambios/2026-10-28-peticiones-*, 2026-11-09-peticiones-buscador-y-documentos y 2026-11-09-reunion-cpd-presupuestos).
--
--   requests        una petición = UN puesto de una versión ACEPTADA de un presupuesto (un puesto puede tener varias:
--                   una por turno o por fechas). Al crearla, la base de datos COPIA del puesto del presupuesto las
--                   condiciones y el cálculo (convenio, versión del convenio global y su periodo, categoría, salario,
--                   tarifa, conceptos extra, costes y margen). No se recalcula aunque el presupuesto cambie después.
--                   Además: plazas, fechas, horario y jornada, centro del cliente, responsable, sucursal, supuesto de
--                   utilización (para el CPD), estado y el CPD previo (generado, enviado o revisado, a mano).
--   request_slots   una fila por plaza. De momento solo «por cubrir»: proponer personas, el CPD de cada una, el
--                   contrato y el alta son de las fases 6 y 7 (aquí irán la candidatura, la persona y la baja).
--
-- Número: serie `request` de la sociedad (private.next_number), sin huecos: las peticiones no se borran.
--
-- Pendiente de decidir (bloquea las fases 7 a 9): los controles del art. 8 de la Ley 14/1994 (huelga, trabajos
-- especialmente peligrosos, despidos previos). No se implementan; requests.legal_checks queda reservada para ellos.

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------
insert into public.permissions (code, module, description) values
  ('requests.manage', 'seleccion', 'Crear y editar peticiones de sus sucursales y generar su CPD previo');

insert into public.role_permissions (tenant_id, role_id, permission_code)
select r.tenant_id, r.id, 'requests.manage'
from public.roles r
where r.is_system and r.deleted_at is null and r.code in ('admin', 'director_zona', 'comercial', 'seleccion', 'laboral')
on conflict do nothing;

create or replace function private.seed_tenant_roles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.roles (tenant_id, code, name, scope, is_system) values
    (new.id, 'admin', 'Administrador', 'tenant', true),
    (new.id, 'laboral', 'Laboral', 'tenant', true),
    (new.id, 'director_zona', 'Director de zona', 'branches', true),
    (new.id, 'seleccion', 'Selección', 'branch', true),
    (new.id, 'comercial', 'Comercial', 'branch', true);

  insert into public.role_permissions (tenant_id, role_id, permission_code)
  select new.id, r.id, p.permission_code
  from public.roles r
  join (values
    ('admin', 'module.administracion'), ('admin', 'module.laboral'),
    ('admin', 'module.seleccion'), ('admin', 'module.comercial'),
    ('admin', 'tenant.manage'), ('admin', 'companies.manage'), ('admin', 'branches.manage'),
    ('admin', 'catalogs.manage'), ('admin', 'users.manage'), ('admin', 'roles.manage'),
    ('admin', 'addresses.write'), ('admin', 'labor_catalogs.manage'),
    ('admin', 'clients.manage'), ('admin', 'clients.billing.manage'),
    ('admin', 'quotes.manage'), ('admin', 'quotes.approve_margin'), ('admin', 'quotes.view_costs'),
    ('admin', 'requests.manage'),
    ('laboral', 'module.laboral'), ('laboral', 'addresses.write'), ('laboral', 'labor_catalogs.manage'),
    ('laboral', 'clients.manage'), ('laboral', 'requests.manage'),
    ('director_zona', 'module.laboral'), ('director_zona', 'module.seleccion'),
    ('director_zona', 'module.comercial'), ('director_zona', 'addresses.write'), ('director_zona', 'clients.manage'),
    ('director_zona', 'quotes.manage'), ('director_zona', 'quotes.approve_margin'),
    ('director_zona', 'quotes.view_costs'), ('director_zona', 'requests.manage'),
    ('seleccion', 'module.seleccion'), ('seleccion', 'addresses.write'), ('seleccion', 'requests.manage'),
    ('comercial', 'module.comercial'), ('comercial', 'addresses.write'), ('comercial', 'clients.manage'),
    ('comercial', 'quotes.manage'), ('comercial', 'requests.manage')
  ) as p (role_code, permission_code) on p.role_code = r.code
  where r.tenant_id = new.id;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tipos de documento del servicio («Correo del cliente» ya existe desde presupuestos).
-- ---------------------------------------------------------------------------
create or replace function private.seed_request_catalogs(p_tenant_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.catalog_items (tenant_id, catalog, code, name)
  select p_tenant_id, v.catalog, v.code, v.name
  from (values
    ('document_type', 'request_pre_cpd', 'CPD previo (condiciones de la puesta a disposición)'),
    ('document_type', 'request_client_order', 'Pedido u orden de compra del cliente'),
    ('document_type', 'request_risk_assessment', 'Evaluación de riesgos del cliente'),
    ('document_type', 'other', 'Otro documento')
  ) as v (catalog, code, name)
  where not exists (
    select 1 from public.catalog_items c
    where c.tenant_id = p_tenant_id and c.catalog = v.catalog and (c.code = v.code or lower(c.name) = lower(v.name))
  )
$$;

create or replace function private.seed_tenant_request_catalogs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.seed_request_catalogs(new.id);
  return new;
end;
$$;

create trigger trg_tenants_seed_request_catalogs after insert on public.tenants
  for each row execute function private.seed_tenant_request_catalogs();

select private.seed_request_catalogs(id) from public.tenants;

-- ---------------------------------------------------------------------------
-- requests
-- ---------------------------------------------------------------------------
create table public.requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  company_id uuid not null,
  branch_id uuid not null,
  code varchar(30) not null,
  -- Origen (lo pone la base de datos desde el puesto): presupuesto, versión aceptada, puesto y cliente.
  client_id uuid not null,
  quote_id uuid not null,
  quote_version_id uuid not null,
  quote_position_id uuid not null,
  -- Servicio
  client_center_id uuid,
  -- Quién firma el CPD por la empresa usuaria (contacto del cliente).
  client_signer_contact_id uuid,
  responsible_user_id uuid references public.profiles (id) on delete set null,
  status varchar(20) not null default 'new' check (status in (
    'new', 'publishing', 'selecting', 'covered', 'in_progress', 'closed', 'cancelled')),
  cancel_reason varchar(250),
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles (id) on delete set null,
  closed_at timestamptz,
  positions_count integer not null check (positions_count between 1 and 1000),
  start_date date,
  end_date date,
  -- Horario: siete días [{ weekday 1..7, working, start 'HH:MM', end, breakMinutes }]; la API valida y calcula las horas.
  shift_name varchar(120),
  workday_type varchar(10) not null default 'full' check (workday_type in ('full', 'part')),
  schedule jsonb not null default '[]'::jsonb check (jsonb_typeof(schedule) = 'array'),
  weekly_hours numeric(5, 2) check (weekly_hours between 0 and 168),
  order_reference varchar(120),
  notes text,
  -- Para el CPD: tareas, cualificación, riesgos y EPIs (RD 216/1999, art. 2), carnés.
  tasks text,
  qualification text,
  risks text,
  ppe text,
  required_licenses text,
  -- Supuesto de utilización (art. 6 de la Ley 14/1994 y art. 15 ET) [verificar la lista] y su justificación.
  use_case varchar(40) check (use_case in ('production_unforeseen', 'production_foreseeable', 'substitution_leave',
    'substitution_reduced_hours', 'substitution_recruitment', 'training')),
  use_case_justification text,
  -- Reservado para los controles del art. 8 de la Ley 14/1994 (pendiente de decidir). No se rellena.
  legal_checks jsonb,
  -- Copia de las condiciones del puesto del presupuesto (no cambia).
  position_name varchar(200) not null,
  position_description text,
  collective_agreement_id uuid,
  collective_agreement_name varchar(250),
  agreement_version_id uuid references public.agreement_versions (id) on delete restrict,
  agreement_category_id uuid,
  agreement_category_code varchar(40),
  category_name varchar(300),
  level varchar(120),
  agreement_period_from date,
  agreement_period_to date,
  agreement_minimum_salary_hour numeric(12, 4),
  -- Salario por hora comparable con el mínimo del convenio: (base anual + plus mensual × 12) / horas anuales.
  salary_hour numeric(12, 4) not null,
  -- Salario por hora con vacaciones (el de la propuesta) y tarifa por hora.
  gross_salary_hour numeric(12, 4),
  rate_hour numeric(12, 4),
  quote_people integer,
  -- Conceptos extra: [{ code, name, salaryHour, rateHour, print }].
  extras jsonb not null default '[]'::jsonb,
  -- Cálculo completo del puesto (costes y margen incluidos; la API los oculta sin quotes.view_costs).
  calc_result jsonb,
  -- CPD previo: pending (sin generar), generated, sent (enviado a mano), reviewed (revisado por el cliente).
  pre_cpd_status varchar(12) not null default 'pending' check (pre_cpd_status in ('pending', 'generated', 'sent', 'reviewed')),
  -- Algo de lo que sale en el CPD cambió después de generarlo.
  pre_cpd_outdated boolean not null default false,
  pre_cpd_document_id uuid,
  pre_cpd_generated_at timestamptz,
  pre_cpd_generated_by uuid references public.profiles (id) on delete set null,
  pre_cpd_sent_at timestamptz,
  pre_cpd_sent_by uuid references public.profiles (id) on delete set null,
  pre_cpd_sent_to varchar(250),
  pre_cpd_sent_notes text,
  pre_cpd_reviewed_at timestamptz,
  pre_cpd_reviewed_by uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, code),
  foreign key (tenant_id, company_id) references public.companies (tenant_id, id),
  foreign key (tenant_id, company_id, branch_id) references public.branches (tenant_id, company_id, id),
  foreign key (tenant_id, client_id) references public.clients (tenant_id, id),
  foreign key (tenant_id, quote_id, quote_version_id) references public.quote_versions (tenant_id, quote_id, id),
  foreign key (tenant_id, quote_position_id) references public.quote_positions (tenant_id, id),
  foreign key (tenant_id, client_id, client_center_id) references public.client_centers (tenant_id, client_id, id),
  foreign key (tenant_id, client_signer_contact_id) references public.client_contacts (tenant_id, id),
  foreign key (tenant_id, pre_cpd_document_id) references public.documents (tenant_id, id) on delete set null (pre_cpd_document_id),
  check (end_date is null or start_date is null or end_date >= start_date),
  check ((status = 'cancelled') = (cancel_reason is not null)),
  check (jsonb_typeof(extras) = 'array')
);

create index requests_tenant_status_idx on public.requests (tenant_id, status);
create index requests_tenant_client_idx on public.requests (tenant_id, client_id);
create index requests_tenant_quote_idx on public.requests (tenant_id, quote_id);
create index requests_tenant_position_idx on public.requests (tenant_id, quote_position_id);
create index requests_tenant_branch_idx on public.requests (tenant_id, branch_id);

comment on table public.requests is 'Peticiones: un puesto de un presupuesto aceptado, con sus condiciones copiadas';
comment on column public.requests.legal_checks is
  'Reservado: controles del art. 8 de la Ley 14/1994 (huelga, trabajos especialmente peligrosos, despidos previos). Pendiente de decidir';
comment on column public.requests.salary_hour is
  '(Base anual + plus mensual × 12) / horas anuales, copiado del presupuesto: se compara con el mínimo del convenio (art. 11 Ley 14/1994)';

-- ---------------------------------------------------------------------------
-- request_slots: una fila por plaza (las mantiene la base de datos con positions_count).
-- ---------------------------------------------------------------------------
create table public.request_slots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  request_id uuid not null,
  slot_number integer not null check (slot_number >= 1),
  -- open (por cubrir), reserved (propuesta, pendiente del cliente), covered, started (incorporada), left (baja).
  -- De momento solo open: el resto llega con candidatos (fase 6) y contratos (fase 7).
  status varchar(12) not null default 'open' check (status in ('open', 'reserved', 'covered', 'started', 'left')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (request_id, slot_number),
  foreign key (tenant_id, request_id) references public.requests (tenant_id, id) on delete cascade
);

comment on table public.request_slots is 'Plazas de una petición. Candidatos, CPD por persona y altas: fases 6 y 7';

create trigger trg_request_slots_updated_at before update on public.request_slots
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Funciones de acceso
-- ---------------------------------------------------------------------------
-- ¿Ve el usuario las peticiones de esta sucursal?
create or replace function private.request_branch_visible(p_tenant_id uuid, p_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_superadmin() or (
    p_tenant_id = private.current_tenant_id()
    and (private.has_permission('requests.manage') or private.has_permission('module.seleccion')
         or private.has_permission('module.comercial') or private.has_permission('module.laboral'))
    and private.can_access_branch(p_branch_id)
  )
$$;

-- ¿Puede editarla? requests.manage y acceso a su sucursal.
create or replace function private.request_writable(p_tenant_id uuid, p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_superadmin() or (
    p_tenant_id = private.current_tenant_id()
    and private.has_permission('requests.manage')
    and exists (select 1 from public.requests r
                where r.tenant_id = p_tenant_id and r.id = p_request_id and private.can_access_branch(r.branch_id))
  )
$$;

-- Quien crea peticiones ve los presupuestos ACEPTADOS de su sucursal (para elegir el puesto), aunque no sea comercial.
create or replace function private.quote_visible_for_requests(p_tenant_id uuid, p_quote_id uuid, p_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_tenant_id = private.current_tenant_id()
    and private.has_permission('requests.manage')
    and private.can_access_branch(p_branch_id)
    and exists (select 1 from public.quote_versions v
                where v.tenant_id = p_tenant_id and v.quote_id = p_quote_id and v.status = 'accepted')
$$;

grant execute on function
  private.request_branch_visible(uuid, uuid),
  private.request_writable(uuid, uuid),
  private.quote_visible_for_requests(uuid, uuid, uuid)
to authenticated, service_role;

drop policy quotes_select on public.quotes;
create policy quotes_select on public.quotes for select to authenticated
using (private.quote_branch_visible(tenant_id, branch_id) or private.quote_visible_for_requests(tenant_id, id, branch_id));

-- ---------------------------------------------------------------------------
-- Mínimo del convenio con la versión PUBLICADA vigente hoy, para la misma categoría (por código). Sirve para avisar
-- si las tablas del convenio subieron después de aceptar el presupuesto (art. 11 de la Ley 14/1994).
-- ---------------------------------------------------------------------------
create or replace function private.request_current_agreement(p_tenant_id uuid, p_request_id uuid)
returns table (version_id uuid, effective_from date, effective_to date, minimum_salary_hour numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select av.id, av.effective_from, av.effective_to,
         private.agreement_minimum_salary_hour(av.id, ac.id)
  from public.requests r
  join public.collective_agreements ca on ca.tenant_id = r.tenant_id and ca.id = r.collective_agreement_id
  join public.agreement_versions av on av.agreement_id = ca.global_agreement_id and av.status = 'publicada'
       and av.effective_from <= current_date
  join public.agreement_categories ac on ac.version_id = av.id and ac.code = r.agreement_category_code
  where r.tenant_id = p_tenant_id and r.id = p_request_id and r.agreement_category_code is not null
  order by av.effective_from desc
  limit 1
$$;

grant execute on function private.request_current_agreement(uuid, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Reglas de requests
-- ---------------------------------------------------------------------------
-- Columnas copiadas del presupuesto y origen: no cambian nunca.
create or replace function private.request_fixed_columns()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['tenant_id', 'company_id', 'code', 'client_id', 'quote_id', 'quote_version_id', 'quote_position_id',
               'position_name', 'position_description', 'collective_agreement_id', 'collective_agreement_name',
               'agreement_version_id', 'agreement_category_id', 'agreement_category_code', 'category_name', 'level',
               'agreement_period_from', 'agreement_period_to', 'agreement_minimum_salary_hour', 'salary_hour',
               'gross_salary_hour', 'rate_hour', 'quote_people', 'extras', 'calc_result', 'created_by', 'created_at']
$$;

-- Lo que sale en el CPD previo: si cambia después de generarlo, queda desactualizado.
create or replace function private.request_pre_cpd_columns()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['branch_id', 'client_center_id', 'client_signer_contact_id', 'positions_count', 'start_date', 'end_date',
               'shift_name', 'workday_type', 'schedule', 'weekly_hours', 'tasks', 'qualification', 'risks', 'ppe',
               'required_licenses', 'use_case', 'use_case_justification']
$$;

create or replace function private.requests_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_src record;
  v_me uuid := (select p.id from public.profiles p where p.id = auth.uid());
  v_changed text[];
begin
  if tg_op = 'INSERT' then
    select q.id as quote_id, q.company_id, q.branch_id, q.client_id, q.obsolete_at, v.id as version_id, v.status,
           p.name, p.description, p.collective_agreement_id, ca.name as collective_agreement_name,
           p.agreement_version_id, p.agreement_category_id, ac.code as category_code,
           coalesce(ac.name, p.custom_category_name) as category_name, p.level, p.agreement_period_from,
           p.agreement_period_to, p.agreement_minimum_salary_hour,
           (p.annual_base_salary + p.monthly_bonus * 12) / p.annual_hours as salary_hour,
           p.calc_gross_salary_hour, p.calc_rate_hour, p.people, p.extras, p.calc_result
      into v_src
    from public.quote_positions p
    join public.quote_versions v on v.tenant_id = p.tenant_id and v.id = p.version_id
    join public.quotes q on q.tenant_id = p.tenant_id and q.id = p.quote_id
    left join public.collective_agreements ca on ca.tenant_id = p.tenant_id and ca.id = p.collective_agreement_id
    left join public.agreement_categories ac on ac.id = p.agreement_category_id
    where p.tenant_id = new.tenant_id and p.id = new.quote_position_id;

    if v_src is null then
      raise exception 'El puesto del presupuesto no existe' using errcode = 'TN422';
    end if;
    if v_src.status <> 'accepted' or v_src.obsolete_at is not null then
      raise exception 'Las peticiones salen de un presupuesto aceptado (y no obsoleto)' using errcode = 'TN409';
    end if;
    if v_src.client_id is null then
      raise exception 'El presupuesto no tiene cliente' using errcode = 'TN422';
    end if;
    if v_src.calc_rate_hour is null then
      raise exception 'El puesto del presupuesto no tiene tarifa' using errcode = 'TN422';
    end if;

    new.quote_id := v_src.quote_id;
    new.quote_version_id := v_src.version_id;
    new.company_id := v_src.company_id;
    new.client_id := v_src.client_id;
    new.branch_id := coalesce(new.branch_id, v_src.branch_id);
    new.position_name := v_src.name;
    new.position_description := v_src.description;
    new.collective_agreement_id := v_src.collective_agreement_id;
    new.collective_agreement_name := v_src.collective_agreement_name;
    new.agreement_version_id := v_src.agreement_version_id;
    new.agreement_category_id := v_src.agreement_category_id;
    new.agreement_category_code := v_src.category_code;
    new.category_name := v_src.category_name;
    new.level := v_src.level;
    new.agreement_period_from := v_src.agreement_period_from;
    new.agreement_period_to := v_src.agreement_period_to;
    new.agreement_minimum_salary_hour := v_src.agreement_minimum_salary_hour;
    new.salary_hour := round(v_src.salary_hour, 4);
    new.gross_salary_hour := v_src.calc_gross_salary_hour;
    new.rate_hour := v_src.calc_rate_hour;
    new.quote_people := v_src.people;
    new.calc_result := v_src.calc_result;
    -- Conceptos extra con su salario y tarifa calculados, y si salen en la propuesta.
    new.extras := coalesce((
      select jsonb_agg(jsonb_build_object(
               'code', el.val ->> 'code', 'name', el.val ->> 'name',
               'salaryHour', (cx.calc ->> 'salaryHour')::numeric, 'rateHour', (cx.calc ->> 'rateHour')::numeric,
               'print', coalesce((el.val ->> 'print')::boolean, true)) order by el.ord)
      from jsonb_array_elements(v_src.extras) with ordinality as el (val, ord)
      left join lateral (
        select x.value as calc from jsonb_array_elements(coalesce(v_src.calc_result -> 'extras', '[]'::jsonb)) x
        where x.value ->> 'code' = el.val ->> 'code' limit 1
      ) cx on true
    ), '[]'::jsonb);

    new.status := 'new';
    new.cancel_reason := null;
    new.cancelled_at := null;
    new.cancelled_by := null;
    new.closed_at := null;
    new.legal_checks := null;
    new.pre_cpd_status := 'pending';
    new.pre_cpd_outdated := false;
    new.pre_cpd_document_id := null;
    new.pre_cpd_generated_at := null;
    new.pre_cpd_generated_by := null;
    new.pre_cpd_sent_at := null;
    new.pre_cpd_sent_by := null;
    new.pre_cpd_sent_to := null;
    new.pre_cpd_sent_notes := null;
    new.pre_cpd_reviewed_at := null;
    new.pre_cpd_reviewed_by := null;
    new.created_by := v_me;
  else
    select coalesce(array_agg(n.key), '{}') into v_changed
    from jsonb_each(to_jsonb(new)) n join jsonb_each(to_jsonb(old)) o using (key)
    where n.value is distinct from o.value and n.key <> 'updated_at';

    if v_changed && private.request_fixed_columns() then
      raise exception 'El número, el origen y las condiciones del presupuesto no cambian en la petición: para cambiarlas, crea una versión nueva del presupuesto'
        using errcode = 'TN422';
    end if;

    -- Cerrada o cancelada: solo se reabre (cambio de estado).
    if old.status in ('closed', 'cancelled') and new.status = old.status
       and not (v_changed <@ array['pre_cpd_document_id']) then
      raise exception 'La petición está %: para cambiarla, reábrela', case old.status when 'closed' then 'cerrada' else 'cancelada' end
        using errcode = 'TN409';
    end if;

    if new.status is distinct from old.status then
      if old.status = 'cancelled' then
        new.cancel_reason := null;
        new.cancelled_at := null;
        new.cancelled_by := null;
      end if;
      if new.status = 'cancelled' then
        if nullif(trim(new.cancel_reason), '') is null then
          raise exception 'Para cancelar la petición hay que indicar el motivo' using errcode = 'TN422';
        end if;
        new.cancelled_at := now();
        new.cancelled_by := v_me;
      end if;
      new.closed_at := case when new.status = 'closed' then now() end;
    elsif new.status <> 'cancelled' and new.cancel_reason is not null then
      raise exception 'El motivo de cancelación solo va en una petición cancelada' using errcode = 'TN422';
    end if;

    -- CPD previo generado y después cambia algo de lo que sale en él.
    if old.pre_cpd_status <> 'pending' and new.pre_cpd_generated_at is not distinct from old.pre_cpd_generated_at
       and v_changed && private.request_pre_cpd_columns() then
      new.pre_cpd_outdated := true;
    end if;
  end if;

  if new.client_signer_contact_id is not null and not exists (
    select 1 from public.client_contacts cc
    where cc.tenant_id = new.tenant_id and cc.id = new.client_signer_contact_id and cc.client_id = new.client_id) then
    raise exception 'El contacto que firma tiene que ser del cliente de la petición' using errcode = 'TN422';
  end if;
  return new;
end;
$$;

create trigger trg_requests_before_write before insert or update on public.requests
  for each row execute function private.requests_before_write();
create trigger trg_requests_updated_at before update on public.requests
  for each row execute function private.touch_updated_at();

-- Plazas: tantas filas como positions_count. Bajar el número quita las últimas que estén por cubrir.
create or replace function private.requests_sync_slots()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current integer;
  v_open integer;
begin
  select count(*), count(*) filter (where s.status = 'open') into v_current, v_open
  from public.request_slots s where s.tenant_id = new.tenant_id and s.request_id = new.id;

  if new.positions_count > v_current then
    insert into public.request_slots (tenant_id, request_id, slot_number)
    select new.tenant_id, new.id, coalesce((select max(s.slot_number) from public.request_slots s
                                            where s.tenant_id = new.tenant_id and s.request_id = new.id), 0) + g
    from generate_series(1, new.positions_count - v_current) g;
  elsif new.positions_count < v_current then
    if v_current - new.positions_count > v_open then
      raise exception 'Solo se pueden quitar plazas por cubrir (hay %)', v_open using errcode = 'TN409';
    end if;
    delete from public.request_slots s
    where s.id in (select s2.id from public.request_slots s2
                   where s2.tenant_id = new.tenant_id and s2.request_id = new.id and s2.status = 'open'
                   order by s2.slot_number desc limit v_current - new.positions_count);
  end if;
  return null;
end;
$$;

create trigger trg_requests_sync_slots after insert or update of positions_count on public.requests
  for each row execute function private.requests_sync_slots();

-- ---------------------------------------------------------------------------
-- Documentos de la petición: entity_type 'request'.
-- ---------------------------------------------------------------------------
alter table public.documents drop constraint documents_entity_type_check;
alter table public.documents add constraint documents_entity_type_check
  check (entity_type in ('client', 'client_center', 'quote', 'request'));

create or replace function private.document_entity_exists(p_tenant_id uuid, p_entity_type text, p_entity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_entity_type
    when 'client' then exists (
      select 1 from public.clients where tenant_id = p_tenant_id and id = p_entity_id and deleted_at is null)
    when 'client_center' then exists (
      select 1 from public.client_centers where tenant_id = p_tenant_id and id = p_entity_id and deleted_at is null)
    when 'quote' then exists (select 1 from public.quotes where tenant_id = p_tenant_id and id = p_entity_id)
    when 'request' then exists (select 1 from public.requests where tenant_id = p_tenant_id and id = p_entity_id)
    else false
  end
$$;

create or replace function private.document_entity_writable(p_tenant_id uuid, p_entity_type text, p_entity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_superadmin() or (
    p_tenant_id = private.current_tenant_id()
    and case p_entity_type
      when 'client' then private.has_permission('clients.manage') and exists (
        select 1 from public.clients c
        where c.tenant_id = p_tenant_id and c.id = p_entity_id and private.can_access_branch(c.branch_id))
      when 'client_center' then private.has_permission('clients.manage') and exists (
        select 1 from public.client_centers c
        where c.tenant_id = p_tenant_id and c.id = p_entity_id and private.can_access_branch(c.branch_id))
      when 'quote' then private.quote_writable(p_tenant_id, p_entity_id)
      when 'request' then private.request_writable(p_tenant_id, p_entity_id)
      else false
    end
  )
$$;

create or replace function private.document_entity_visible(p_entity_type text, p_entity_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case p_entity_type
    when 'client' then exists (select 1 from public.clients where id = p_entity_id)
    when 'client_center' then exists (select 1 from public.client_centers where id = p_entity_id)
    when 'quote' then exists (select 1 from public.quotes where id = p_entity_id)
    when 'request' then exists (select 1 from public.requests where id = p_entity_id)
    else false
  end
$$;

-- ---------------------------------------------------------------------------
-- Historial
-- ---------------------------------------------------------------------------
create or replace function private.activity_label(p_entity_type text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_entity_type
    when 'client' then 'cliente'
    when 'client_center' then 'centro de trabajo'
    when 'client_contact' then 'contacto'
    when 'client_billing' then 'facturación'
    when 'document' then 'documento'
    when 'quote' then 'presupuesto'
    when 'quote_version' then 'versión del presupuesto'
    when 'quote_position' then 'puesto'
    when 'request' then 'petición'
    else p_entity_type
  end
$$;

-- Resumen de los cambios de estado y del CPD previo de una petición.
create or replace function private.request_activity_summary(p_old jsonb, p_new jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_new ->> 'status' is distinct from p_old ->> 'status' then
      case p_new ->> 'status'
        when 'new' then 'Pasa a nueva'
        when 'publishing' then 'Pasa a en difusión'
        when 'selecting' then 'Pasa a en selección'
        when 'covered' then 'Pasa a cubierta'
        when 'in_progress' then 'Pasa a en curso'
        when 'closed' then 'Cerrada'
        when 'cancelled' then 'Cancelada: ' || (p_new ->> 'cancel_reason')
      end
    when p_new ->> 'pre_cpd_generated_at' is distinct from p_old ->> 'pre_cpd_generated_at' then
      case when p_old ->> 'pre_cpd_generated_at' is null then 'CPD previo generado' else 'CPD previo generado de nuevo' end
    when p_new ->> 'pre_cpd_status' is distinct from p_old ->> 'pre_cpd_status' then
      case p_new ->> 'pre_cpd_status'
        when 'sent' then 'CPD previo enviado al cliente'
        when 'reviewed' then 'CPD previo revisado por el cliente'
      end
  end
$$;

create or replace function private.log_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entity_type text := tg_argv[0];
  v_label_column text := nullif(tg_argv[1], '');
  v_parent_type text := nullif(tg_argv[2], '');
  v_parent_column text := nullif(tg_argv[3], '');
  v_row jsonb := to_jsonb(coalesce(new, old));
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_action text;
  v_changes jsonb := '{}'::jsonb;
  v_parent_id uuid;
  v_label text;
  v_special text;
  v_summary text;
begin
  -- Al borrar una ETT entera (cascada) no queda nada a lo que apuntar.
  if tg_op = 'DELETE' and not exists (select 1 from public.tenants t where t.id = (v_row ->> 'tenant_id')::uuid) then
    return null;
  end if;

  if tg_op = 'INSERT' then
    v_action := 'create';
  elsif tg_op = 'DELETE' then
    v_action := 'delete';
  elsif v_old ? 'deleted_at' and v_old ->> 'deleted_at' is null and v_new ->> 'deleted_at' is not null then
    v_action := 'delete';
  elsif v_old ? 'deleted_at' and v_old ->> 'deleted_at' is not null and v_new ->> 'deleted_at' is null then
    v_action := 'restore';
  else
    v_action := 'update';
    -- Las columnas calc_* son el cálculo guardado: no son cambios de datos.
    select coalesce(jsonb_object_agg(
             n.key,
             case when n.key = any (private.activity_masked_columns())
                  then jsonb_build_object('masked', true)
                  else jsonb_build_object('old', o.value, 'new', n.value) end),
           '{}'::jsonb)
      into v_changes
    from jsonb_each(v_new) n
    join jsonb_each(v_old) o using (key)
    where n.value is distinct from o.value
      and n.key <> all (private.activity_ignored_columns())
      and n.key not like 'calc\_%';
    if v_changes = '{}'::jsonb then
      return null;
    end if;
  end if;

  -- Ficha padre. Los documentos cuelgan de su entidad; si es un centro, de su cliente.
  if v_entity_type = 'document' then
    if v_row ->> 'entity_type' = 'client_center' then
      v_parent_type := 'client';
      select c.client_id into v_parent_id
      from public.client_centers c
      where c.tenant_id = (v_row ->> 'tenant_id')::uuid and c.id = (v_row ->> 'entity_id')::uuid;
    else
      v_parent_type := v_row ->> 'entity_type';
      v_parent_id := (v_row ->> 'entity_id')::uuid;
    end if;
  elsif v_parent_column is not null then
    v_parent_id := (v_row ->> v_parent_column)::uuid;
  end if;
  if v_parent_id is null then
    v_parent_type := null;
  end if;

  v_label := case when v_label_column is not null then v_row ->> v_label_column end;
  -- Resúmenes propios (sin la etiqueta de la ficha detrás).
  v_special := case
    when v_action <> 'update' then null
    when v_entity_type = 'quote_version' then private.quote_version_activity_summary(v_old, v_new)
    when v_entity_type = 'quote' and v_changes ? 'obsolete_reason' then 'Pasa a obsoleto: ' || (v_new ->> 'obsolete_reason')
    when v_entity_type = 'request' then private.request_activity_summary(v_old, v_new)
  end;
  v_summary := coalesce(v_special, case
    when v_entity_type = 'document' and v_action = 'update' and v_changes ? 'status'
         and v_new ->> 'status' = 'validated' then 'Validación de documento'
    when v_entity_type = 'client_contact' and v_action = 'update' and v_changes ? 'suspended' then
      case when (v_new ->> 'suspended')::boolean then 'Suspensión de contacto' else 'Reactivación de contacto' end
    when v_entity_type = 'quote_version' and v_action = 'create' then
      'Versión ' || (v_new ->> 'version_number') || ' del presupuesto'
    when v_action = 'create' then 'Alta de ' || private.activity_label(v_entity_type)
    when v_action = 'update' then 'Cambios en ' || private.activity_label(v_entity_type)
    when v_action = 'restore' then 'Restauración de ' || private.activity_label(v_entity_type)
    when tg_op = 'DELETE' then 'Eliminación definitiva de ' || private.activity_label(v_entity_type)
    else 'Eliminación de ' || private.activity_label(v_entity_type)
  end || case
    when v_entity_type = 'quote_version' then ''
    else coalesce(' «' || v_label || '»', '')
  end);

  insert into public.activity_log (tenant_id, entity_type, entity_id, parent_type, parent_id, action, actor_user_id, summary, changes)
  values (
    (v_row ->> 'tenant_id')::uuid,
    v_entity_type,
    (v_row ->> 'id')::uuid,
    v_parent_type,
    v_parent_id,
    v_action,
    (select p.id from public.profiles p where p.id = auth.uid()),
    v_summary,
    v_changes
  );
  return null;
end;
$$;

create trigger trg_requests_activity after insert or update on public.requests
  for each row execute function private.log_activity('request', 'code', '', '');

create or replace function private.activity_visible(p_entity_type text, p_entity_id uuid, p_parent_type text, p_parent_id uuid)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
begin
  return case p_entity_type
    when 'client' then exists (select 1 from public.clients c where c.id = p_entity_id)
    when 'client_billing' then
      (private.is_superadmin() or private.has_permission('clients.billing.manage'))
      and private.activity_visible(p_parent_type, p_parent_id, null, null)
    when 'client_center' then private.activity_visible(p_parent_type, p_parent_id, null, null)
    when 'client_contact' then private.activity_visible(p_parent_type, p_parent_id, null, null)
    when 'document' then private.activity_visible(p_parent_type, p_parent_id, null, null)
    when 'quote' then exists (select 1 from public.quotes q where q.id = p_entity_id)
    when 'quote_version' then private.activity_visible(p_parent_type, p_parent_id, null, null)
    when 'quote_position' then private.activity_visible(p_parent_type, p_parent_id, null, null)
    when 'request' then exists (select 1 from public.requests r where r.id = p_entity_id)
    else false
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privilegios y RLS. Las peticiones no se borran (se cancelan); las plazas las mantiene la base de datos.
-- ---------------------------------------------------------------------------
revoke all on table public.requests, public.request_slots from anon;
revoke delete, truncate, references, trigger on table public.requests from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.request_slots from authenticated;

alter table public.requests enable row level security;
alter table public.request_slots enable row level security;

create policy requests_select on public.requests for select to authenticated
using (private.request_branch_visible(tenant_id, branch_id));
create policy requests_insert on public.requests for insert to authenticated
with check (
  (select private.is_superadmin()) or (
    tenant_id = (select private.current_tenant_id())
    and (select private.has_permission('requests.manage'))
    and private.can_access_branch(branch_id)
  )
);
create policy requests_update on public.requests for update to authenticated
using (private.request_writable(tenant_id, id))
with check (
  (select private.is_superadmin()) or (
    tenant_id = (select private.current_tenant_id())
    and (select private.has_permission('requests.manage'))
    and private.can_access_branch(branch_id)
  )
);

create policy request_slots_select on public.request_slots for select to authenticated
using (exists (select 1 from public.requests r where r.tenant_id = request_slots.tenant_id and r.id = request_slots.request_id));
