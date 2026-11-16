-- Presupuestos (fase 4 de docs/plan-desarrollo.md; pantalla: apps/web/src/views/PresupuestosView.jsx y las notas
-- design/cambios/*presupuestos*).
--
--   quotes            el presupuesto: número de la serie `quote`, sociedad, sucursal propietaria, cliente; obsoleto
--                     (motivo, quién, cuándo) y de qué presupuesto se creó.
--   quote_versions    cada versión es una COPIA COMPLETA (cabecera, condiciones, margen objetivo, tipos de la Seguridad
--                     Social, costes internos y extras por defecto). La actual es la de número más alto. Solo se edita
--                     en borrador o en preparación; al enviarla queda cerrada.
--   quote_positions   puestos de una versión: convenio, categoría y nivel, parámetros retributivos (rellenos desde el
--                     convenio global publicado: se guarda la versión del convenio y su periodo, y qué se cambió a mano),
--                     personas y horas, tarifa, margen propio, costes internos aplicados y conceptos extra.
--
-- Costes internos y extras van en jsonb dentro de la versión y del puesto: se copian con la versión y no los
-- consulta nadie por separado. La API valida su forma (apps/api/src/routes/quotes.ts).
--
-- El cálculo (desglose, tarifa sugerida, margen) lo hace la API con apps/api/src/calc/quote.ts y lo guarda en las
-- columnas calc_* (no cuentan como cambios en el historial).
--
-- Reglas que garantiza la base de datos:
--   - Salario por debajo del convenio de la empresa usuaria: SIEMPRE bloquea (art. 11 de la Ley 14/1994), sin
--     aprobación posible. El mínimo lo calcula la base de datos desde las tablas del convenio global (SQLSTATE TNSAL).
--   - Enviar con algún puesto por debajo del margen mínimo de la ETT exige la aprobación de un responsable
--     (quotes.approve_margin), con quién y cuándo (SQLSTATE TNAPR). Cambiar el presupuesto después la anula.
--   - Lo enviado no cambia; las transiciones de estado son las de la pantalla. Nada se borra (los números de serie no
--     dejan huecos).

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------
insert into public.permissions (code, module, description) values
  ('quotes.manage', 'comercial', 'Crear, editar, enviar, aceptar y rechazar presupuestos de sus sucursales'),
  ('quotes.approve_margin', 'comercial', 'Aprobar presupuestos con el margen por debajo del mínimo de la ETT');

insert into public.role_permissions (tenant_id, role_id, permission_code)
select r.tenant_id, r.id, p.permission_code
from public.roles r
join (values
  ('admin', 'quotes.manage'), ('admin', 'quotes.approve_margin'),
  ('director_zona', 'quotes.manage'), ('director_zona', 'quotes.approve_margin'),
  ('comercial', 'quotes.manage')
) as p (role_code, permission_code) on p.role_code = r.code
where r.is_system and r.deleted_at is null
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
    ('admin', 'quotes.manage'), ('admin', 'quotes.approve_margin'),
    ('laboral', 'module.laboral'), ('laboral', 'addresses.write'), ('laboral', 'labor_catalogs.manage'),
    ('laboral', 'clients.manage'),
    ('director_zona', 'module.laboral'), ('director_zona', 'module.seleccion'),
    ('director_zona', 'module.comercial'), ('director_zona', 'addresses.write'), ('director_zona', 'clients.manage'),
    ('director_zona', 'quotes.manage'), ('director_zona', 'quotes.approve_margin'),
    ('seleccion', 'module.seleccion'), ('seleccion', 'addresses.write'),
    ('comercial', 'module.comercial'), ('comercial', 'addresses.write'), ('comercial', 'clients.manage'),
    ('comercial', 'quotes.manage')
  ) as p (role_code, permission_code) on p.role_code = r.code
  where r.tenant_id = new.id;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Valores de serie de las tablas maestras: motivos de rechazo y tipos de documento del presupuesto.
-- ---------------------------------------------------------------------------
create or replace function private.seed_quote_catalogs(p_tenant_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.catalog_items (tenant_id, catalog, code, name)
  select p_tenant_id, v.catalog, v.code, v.name
  from (values
    ('quote_rejection_reason', 'price', 'Precio'),
    ('quote_rejection_reason', 'start_date', 'Plazo de incorporación'),
    ('quote_rejection_reason', 'competitor', 'Eligió a la competencia'),
    ('quote_rejection_reason', 'cancelled', 'Cancela el proyecto'),
    ('quote_rejection_reason', 'no_response', 'Sin respuesta del cliente'),
    ('document_type', 'quote_proposal', 'Propuesta de presupuesto'),
    ('document_type', 'quote_signed', 'Presupuesto firmado por el cliente'),
    ('document_type', 'quote_client_terms', 'Condiciones o pliego del cliente'),
    ('document_type', 'quote_client_email', 'Correo del cliente')
  ) as v (catalog, code, name)
  where not exists (
    select 1 from public.catalog_items c
    where c.tenant_id = p_tenant_id and c.catalog = v.catalog and (c.code = v.code or lower(c.name) = lower(v.name))
  )
$$;

create or replace function private.seed_tenant_quote_catalogs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.seed_quote_catalogs(new.id);
  return new;
end;
$$;

create trigger trg_tenants_seed_quote_catalogs after insert on public.tenants
  for each row execute function private.seed_tenant_quote_catalogs();

select private.seed_quote_catalogs(id) from public.tenants;

-- ---------------------------------------------------------------------------
-- quotes
-- ---------------------------------------------------------------------------
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  company_id uuid not null,
  branch_id uuid not null,
  -- null: duplicado «para otro cliente», todavía sin elegir. Para enviarlo hace falta.
  client_id uuid,
  code varchar(30) not null,
  created_from_quote_id uuid,
  obsolete_at timestamptz,
  obsolete_by uuid references public.profiles (id) on delete set null,
  obsolete_reason varchar(250),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, code),
  foreign key (tenant_id, company_id) references public.companies (tenant_id, id),
  foreign key (tenant_id, company_id, branch_id) references public.branches (tenant_id, company_id, id),
  foreign key (tenant_id, client_id) references public.clients (tenant_id, id),
  foreign key (tenant_id, created_from_quote_id) references public.quotes (tenant_id, id),
  check ((obsolete_at is null) = (obsolete_reason is null))
);

create index quotes_tenant_client_idx on public.quotes (tenant_id, client_id);
create index quotes_tenant_branch_idx on public.quotes (tenant_id, branch_id);
create index quotes_created_from_idx on public.quotes (tenant_id, created_from_quote_id) where created_from_quote_id is not null;

comment on table public.quotes is 'Presupuestos. El contenido y el estado están en su versión actual (quote_versions)';

-- ---------------------------------------------------------------------------
-- quote_versions
-- ---------------------------------------------------------------------------
create table public.quote_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  quote_id uuid not null,
  version_number smallint not null check (version_number >= 1),
  status varchar(20) not null default 'draft' check (status in (
    'draft', 'in_preparation', 'sent', 'pending_signature', 'accepted', 'rejected', 'superseded', 'obsolete')),
  -- Cabecera y condiciones comerciales
  title varchar(250),
  contact_id uuid,
  sales_rep_id uuid references public.profiles (id) on delete set null,
  issue_date date not null default current_date,
  valid_until date,
  expected_start_date date,
  duration_months numeric(5, 1) check (duration_months > 0),
  modality varchar(250),
  payment_method_id uuid,
  vat_rate numeric(5, 2) not null default 21 check (vat_rate between 0 and 100),
  currency char(3) not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  replacement_guarantee varchar(250),
  commercial_notes text,
  -- Condiciones que se imprimen en la propuesta.
  conditions text,
  -- Margen objetivo por defecto: % sobre la tarifa o €/h sobre el coste.
  margin_mode varchar(10) not null default 'percent' check (margin_mode in ('percent', 'per_hour')),
  margin_value numeric(10, 4) not null default 18
    check (margin_value >= 0 and (margin_mode <> 'percent' or margin_value < 100)),
  -- Tipos de la Seguridad Social a cargo de la empresa (%): commonContingencies, unemployment, fogasa,
  -- vocationalTraining, mei, atEp. Los rellena la API con los de por defecto [verificar] y el AT/EP del CNAE del cliente.
  ss_rates jsonb not null check (jsonb_typeof(ss_rates) = 'object'),
  -- Costes internos del presupuesto: [{ code, name, mode: percent|per_hour, value, required, description }].
  cost_concepts jsonb not null default '[]'::jsonb check (jsonb_typeof(cost_concepts) = 'array'),
  -- Conceptos extra por defecto, que se copian a cada puesto nuevo.
  default_extras jsonb not null default '[]'::jsonb check (jsonb_typeof(default_extras) = 'array'),
  -- Aprobación del margen
  approval_status varchar(10) check (approval_status in ('pending', 'approved', 'rejected')),
  approval_requested_by uuid references public.profiles (id) on delete set null,
  approval_requested_at timestamptz,
  approval_decided_by uuid references public.profiles (id) on delete set null,
  approval_decided_at timestamptz,
  approval_notes text,
  -- Margen mínimo de la ETT con el que se comprobó al enviar.
  min_margin_percent numeric(5, 2),
  -- Ciclo
  sent_at timestamptz,
  sent_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null,
  rejected_at timestamptz,
  rejected_by uuid references public.profiles (id) on delete set null,
  rejection_reason_id uuid,
  rejection_notes text,
  closed_at timestamptz,
  -- Cálculo guardado por la API (no cuenta en el historial)
  calc_people integer,
  calc_hours numeric(12, 2),
  calc_revenue numeric(14, 2),
  calc_cost numeric(14, 2),
  calc_margin numeric(14, 2),
  calc_margin_percent numeric(9, 4),
  calc_average_rate numeric(12, 4),
  calc_result jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, quote_id, id),
  unique (quote_id, version_number),
  foreign key (tenant_id, quote_id) references public.quotes (tenant_id, id) on delete cascade,
  foreign key (tenant_id, contact_id) references public.client_contacts (tenant_id, id),
  foreign key (tenant_id, payment_method_id) references public.catalog_items (tenant_id, id),
  foreign key (tenant_id, rejection_reason_id) references public.catalog_items (tenant_id, id),
  check (valid_until is null or valid_until >= issue_date),
  check (status <> 'rejected' or rejection_reason_id is not null)
);

create index quote_versions_tenant_status_idx on public.quote_versions (tenant_id, status);

comment on table public.quote_versions is 'Versiones del presupuesto (copia completa). La actual es la de número más alto';
comment on column public.quote_versions.closed_at is 'Cuándo pasó a sustituida u obsoleta';

-- ---------------------------------------------------------------------------
-- quote_positions
-- ---------------------------------------------------------------------------
create table public.quote_positions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  quote_id uuid not null,
  version_id uuid not null,
  sort_order integer not null default 0,
  name varchar(200) not null check (length(trim(name)) > 0),
  description text,
  -- Convenio de la ETT (tabla maestra) y, si está enlazado al catálogo global, su versión publicada y la categoría.
  collective_agreement_id uuid,
  agreement_version_id uuid references public.agreement_versions (id) on delete restrict,
  agreement_category_id uuid,
  -- Periodo de la versión del convenio usada (lo pone la base de datos).
  agreement_period_from date,
  agreement_period_to date,
  -- Salario mínimo por hora del convenio para esa categoría (lo calcula la base de datos).
  agreement_minimum_salary_hour numeric(12, 4),
  -- Valores que dio el convenio al rellenar y campos cambiados a mano (los pone la API).
  agreement_values jsonb,
  manual_fields text[] not null default '{}',
  -- «Otro / personalizado»: sin tabla de convenio.
  custom_category_name varchar(200),
  level varchar(120),
  -- Parámetros retributivos
  annual_base_salary numeric(12, 2) not null check (annual_base_salary >= 0),
  monthly_bonus numeric(12, 2) not null default 0 check (monthly_bonus >= 0),
  annual_payments smallint check (annual_payments between 1 and 24),
  annual_hours numeric(7, 2) not null check (annual_hours > 0 and annual_hours <= 4000),
  hours_per_day numeric(4, 2) not null default 8 check (hours_per_day > 0 and hours_per_day <= 24),
  vacation_days smallint not null default 30 check (vacation_days between 0 and 366),
  vacation_days_type varchar(12) not null default 'naturales' check (vacation_days_type in ('naturales', 'laborables')),
  -- Servicio
  people integer not null default 1 check (people >= 1),
  hours_per_person numeric(10, 2) not null default 0 check (hours_per_person >= 0),
  hourly_rate numeric(10, 4) check (hourly_rate >= 0),
  margin_mode varchar(10) check (margin_mode in ('percent', 'per_hour')),
  margin_value numeric(10, 4) check (margin_value >= 0 and (margin_mode <> 'percent' or margin_value < 100)),
  -- Costes internos aplicados: [{ code, applies, percent, perHour }] (vacío: los de por defecto de la versión).
  costs jsonb not null default '[]'::jsonb check (jsonb_typeof(costs) = 'array'),
  -- Conceptos extra: todos quedan en la oferta (para poder facturarlos); `print` decide si salen en la propuesta.
  extras jsonb not null default '[]'::jsonb check (jsonb_typeof(extras) = 'array'),
  -- Cálculo guardado por la API
  calc_gross_salary_hour numeric(12, 4),
  calc_cost_hour numeric(12, 4),
  calc_rate_hour numeric(12, 4),
  calc_margin_percent numeric(9, 4),
  calc_result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, quote_id, version_id) references public.quote_versions (tenant_id, quote_id, id) on delete cascade,
  foreign key (tenant_id, collective_agreement_id) references public.collective_agreements (tenant_id, id),
  foreign key (agreement_version_id, agreement_category_id) references public.agreement_categories (version_id, id),
  check ((margin_mode is null) = (margin_value is null)),
  check (agreement_category_id is null or agreement_version_id is not null)
);

create index quote_positions_version_idx on public.quote_positions (tenant_id, version_id, sort_order);
create index quote_positions_agreement_version_idx on public.quote_positions (agreement_version_id)
  where agreement_version_id is not null;

comment on column public.quote_positions.agreement_minimum_salary_hour is
  'Salario mínimo por hora del convenio de la empresa usuaria (art. 11 Ley 14/1994). Lo calcula la base de datos';

-- ---------------------------------------------------------------------------
-- Funciones de acceso
-- ---------------------------------------------------------------------------
-- ¿Puede el usuario editar el presupuesto? quotes.manage y acceso a su sucursal.
create or replace function private.quote_writable(p_tenant_id uuid, p_quote_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_superadmin() or (
    p_tenant_id = private.current_tenant_id()
    and private.has_permission('quotes.manage')
    and exists (select 1 from public.quotes q
                where q.tenant_id = p_tenant_id and q.id = p_quote_id and private.can_access_branch(q.branch_id))
  )
$$;

-- ¿Puede aprobar el margen? quotes.approve_margin y acceso a su sucursal.
create or replace function private.quote_approvable(p_tenant_id uuid, p_quote_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_superadmin() or (
    p_tenant_id = private.current_tenant_id()
    and private.has_permission('quotes.approve_margin')
    and exists (select 1 from public.quotes q
                where q.tenant_id = p_tenant_id and q.id = p_quote_id and private.can_access_branch(q.branch_id))
  )
$$;

-- ¿Ve el usuario los presupuestos de esta sucursal?
create or replace function private.quote_branch_visible(p_tenant_id uuid, p_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_superadmin() or (
    p_tenant_id = private.current_tenant_id()
    and (private.has_permission('module.comercial') or private.has_permission('quotes.manage')
         or private.has_permission('quotes.approve_margin'))
    and private.can_access_branch(p_branch_id)
  )
$$;

grant execute on function
  private.quote_writable(uuid, uuid),
  private.quote_approvable(uuid, uuid),
  private.quote_branch_visible(uuid, uuid)
to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Mínimo de convenio: salario por hora de una categoría en una versión del convenio global.
-- Igual que agreementDefaults() de apps/api/src/calc/quote.ts: base anual (o mensual × (12 + pagas), o diaria × 365)
-- + plus de convenio × 12, entre las horas anuales del convenio. Lo propio de la categoría manda sobre lo general.
-- ---------------------------------------------------------------------------
create or replace function private.agreement_minimum_salary_hour(p_version_id uuid, p_category_id uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_hours numeric;
  v_extra smallint;
  v_base numeric;
  v_bonus numeric := 0;
  v_item numeric;
begin
  select annual_hours, extra_payments into v_hours, v_extra
  from public.agreement_conditions where version_id = p_version_id;
  if v_hours is null then
    return null;
  end if;

  -- Importe de un concepto y unidad: el de la categoría o el de todas.
  v_base := (select i.amount from public.agreement_salary_items i
             where i.version_id = p_version_id and i.concept = 'salario_base' and i.unit = 'anio'
               and (i.category_id = p_category_id or i.category_id is null)
             order by i.category_id is null limit 1);
  if v_base is null then
    v_item := (select i.amount from public.agreement_salary_items i
               where i.version_id = p_version_id and i.concept in ('salario_base_mensual', 'salario_base') and i.unit = 'mes'
                 and (i.category_id = p_category_id or i.category_id is null)
               order by i.category_id is null, i.concept desc limit 1);
    if v_item is not null then
      v_base := v_item * (12 + coalesce(v_extra, 2));
    else
      v_item := (select i.amount from public.agreement_salary_items i
                 where i.version_id = p_version_id and i.concept in ('salario_base_diario', 'salario_base') and i.unit = 'dia'
                   and (i.category_id = p_category_id or i.category_id is null)
                 order by i.category_id is null, i.concept desc limit 1);
      if v_item is not null then
        v_base := v_item * 365;
      end if;
    end if;
  end if;
  if v_base is null then
    return null;
  end if;

  v_item := (select i.amount from public.agreement_salary_items i
             where i.version_id = p_version_id and i.concept = 'plus_convenio' and i.unit = 'mes'
               and (i.category_id = p_category_id or i.category_id is null)
             order by i.category_id is null limit 1);
  if v_item is not null then
    v_bonus := v_item;
  else
    v_item := (select i.amount from public.agreement_salary_items i
               where i.version_id = p_version_id and i.concept = 'plus_convenio' and i.unit = 'anio'
                 and (i.category_id = p_category_id or i.category_id is null)
               order by i.category_id is null limit 1);
    v_bonus := coalesce(v_item / 12, 0);
  end if;

  return round((v_base + v_bonus * 12) / v_hours, 4);
end;
$$;

grant execute on function private.agreement_minimum_salary_hour(uuid, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Reglas de quotes
-- ---------------------------------------------------------------------------
create or replace function private.quotes_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_versions integer;
  v_status text;
begin
  if new.client_id is not null and not exists (
    select 1 from public.clients c
    where c.tenant_id = new.tenant_id and c.id = new.client_id and c.company_id = new.company_id
  ) then
    raise exception 'El cliente tiene que ser de la sociedad del presupuesto' using errcode = 'TN422';
  end if;

  if tg_op = 'INSERT' then
    new.created_by := (select p.id from public.profiles p where p.id = auth.uid());
    new.obsolete_at := null;
    new.obsolete_by := null;
    new.obsolete_reason := null;
    return new;
  end if;

  if new.code <> old.code or new.tenant_id <> old.tenant_id
     or new.created_by is distinct from old.created_by
     or new.created_from_quote_id is distinct from old.created_from_quote_id then
    raise exception 'El número y el origen del presupuesto no cambian' using errcode = 'TN422';
  end if;

  if old.obsolete_at is not null then
    raise exception 'El presupuesto está obsoleto: solo se puede consultar' using errcode = 'TN409';
  end if;

  if (new.client_id, new.company_id, new.branch_id) is distinct from (old.client_id, old.company_id, old.branch_id) then
    select count(*), max(v.status) into v_versions, v_status
    from public.quote_versions v where v.tenant_id = old.tenant_id and v.quote_id = old.id;
    if v_versions > 1 or v_status not in ('draft', 'in_preparation') then
      raise exception 'El cliente y la sucursal solo se cambian mientras el presupuesto no se ha enviado'
        using errcode = 'TN409';
    end if;
  end if;

  if new.obsolete_reason is not null then
    new.obsolete_at := now();
    new.obsolete_by := (select p.id from public.profiles p where p.id = auth.uid());
  end if;
  return new;
end;
$$;

create trigger trg_quotes_before_write before insert or update on public.quotes
  for each row execute function private.quotes_before_write();
create trigger trg_quotes_updated_at before update on public.quotes
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Reglas de quote_versions: lo cerrado no cambia, transiciones de estado y aprobación del margen.
-- ---------------------------------------------------------------------------
-- Columnas del ciclo (estado, aprobación, quién y cuándo): todo lo demás es contenido.
create or replace function private.quote_version_workflow_columns()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['status', 'approval_status', 'approval_requested_by', 'approval_requested_at', 'approval_decided_by',
               'approval_decided_at', 'approval_notes', 'min_margin_percent', 'sent_at', 'sent_by', 'accepted_at',
               'accepted_by', 'rejected_at', 'rejected_by', 'rejection_reason_id', 'rejection_notes', 'closed_at',
               'updated_at']
$$;

create or replace function private.quote_version_editable(p_tenant_id uuid, p_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.quote_versions v
                 where v.tenant_id = p_tenant_id and v.id = p_version_id and v.status in ('draft', 'in_preparation'))
$$;

create or replace function private.quote_versions_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select p.id from public.profiles p where p.id = auth.uid());
  v_latest smallint;
  v_min numeric;
  v_content_changed boolean;
  v_can_manage boolean := private.quote_writable(new.tenant_id, new.quote_id);
begin
  if tg_op = 'INSERT' then
    if exists (select 1 from public.quotes q where q.tenant_id = new.tenant_id and q.id = new.quote_id and q.obsolete_at is not null) then
      raise exception 'El presupuesto está obsoleto: solo se puede consultar' using errcode = 'TN409';
    end if;
    if new.status not in ('draft', 'in_preparation') then
      raise exception 'Una versión nueva empieza en borrador' using errcode = 'TN422';
    end if;
    -- Lo del ciclo lo pone la base de datos.
    new.approval_status := null;
    new.approval_requested_by := null; new.approval_requested_at := null;
    new.approval_decided_by := null; new.approval_decided_at := null; new.approval_notes := null;
    new.min_margin_percent := null;
    new.sent_at := null; new.sent_by := null; new.accepted_at := null; new.accepted_by := null;
    new.rejected_at := null; new.rejected_by := null; new.rejection_reason_id := null; new.rejection_notes := null;
    new.closed_at := null;
    new.created_by := v_actor;
    return new;
  end if;

  if (new.tenant_id, new.quote_id, new.version_number, new.created_by)
     is distinct from (old.tenant_id, old.quote_id, old.version_number, old.created_by) then
    raise exception 'La versión no cambia de presupuesto ni de número' using errcode = 'TN422';
  end if;

  v_content_changed := (to_jsonb(new) - private.quote_version_workflow_columns())
                       is distinct from (to_jsonb(old) - private.quote_version_workflow_columns());
  if v_content_changed and old.status not in ('draft', 'in_preparation') then
    raise exception 'La versión está cerrada (ya se envió): para cambiarla, crea una versión nueva' using errcode = 'TN409';
  end if;
  if v_content_changed and not v_can_manage then
    raise exception 'No tienes permiso para editar este presupuesto' using errcode = '42501';
  end if;

  select max(v.version_number) into v_latest
  from public.quote_versions v where v.tenant_id = new.tenant_id and v.quote_id = new.quote_id;

  -- ---- Estado
  if new.status <> old.status then
    if not v_can_manage then
      raise exception 'No tienes permiso para cambiar el estado de este presupuesto' using errcode = '42501';
    end if;
    if new.status = 'superseded' then
      if old.status in ('superseded', 'obsolete', 'accepted') or old.version_number >= v_latest then
        raise exception 'Solo se sustituye una versión anterior a la actual (y no aceptada)' using errcode = 'TN409';
      end if;
      new.closed_at := now();
    elsif new.status = 'obsolete' then
      if old.status in ('superseded', 'obsolete') or not exists (
        select 1 from public.quotes q where q.tenant_id = new.tenant_id and q.id = new.quote_id and q.obsolete_at is not null) then
        raise exception 'Para pasar a obsoleto se usa la acción del presupuesto' using errcode = 'TN409';
      end if;
      new.closed_at := now();
    else
      if old.version_number < v_latest then
        raise exception 'Solo cambia de estado la versión actual' using errcode = 'TN409';
      end if;
      if not ((old.status, new.status) in (
                ('draft', 'in_preparation'), ('in_preparation', 'draft'),
                ('draft', 'sent'), ('in_preparation', 'sent'),
                ('sent', 'pending_signature'),
                ('sent', 'accepted'), ('pending_signature', 'accepted'),
                ('sent', 'rejected'), ('pending_signature', 'rejected'))) then
        raise exception 'No se puede pasar de «%» a «%»', old.status, new.status using errcode = 'TN409';
      end if;
    end if;

    if new.status = 'sent' then
      if not exists (select 1 from public.quotes q where q.tenant_id = new.tenant_id and q.id = new.quote_id and q.client_id is not null) then
        raise exception 'Falta el cliente' using errcode = 'TN422';
      end if;
      if not exists (select 1 from public.quote_positions p where p.tenant_id = new.tenant_id and p.version_id = new.id) then
        raise exception 'El presupuesto no tiene puestos' using errcode = 'TN422';
      end if;
      if exists (select 1 from public.quote_positions p
                 where p.tenant_id = new.tenant_id and p.version_id = new.id and p.calc_margin_percent is null) then
        raise exception 'Falta calcular algún puesto' using errcode = 'TN422';
      end if;
      -- Margen mínimo de la ETT: por debajo, hace falta la aprobación de un responsable.
      select t.quote_min_margin_percent into v_min from public.tenants t where t.id = new.tenant_id;
      new.min_margin_percent := v_min;
      if v_min is not null and coalesce(new.approval_status, '') <> 'approved' and exists (
        select 1 from public.quote_positions p
        where p.tenant_id = new.tenant_id and p.version_id = new.id and p.calc_margin_percent < v_min - 0.00005) then
        raise exception 'Hay puestos con el margen por debajo del mínimo (% %%): hace falta la aprobación de un responsable', v_min
          using errcode = 'TNAPR';
      end if;
      new.sent_at := now();
      new.sent_by := v_actor;
    elsif new.status = 'accepted' then
      new.accepted_at := now();
      new.accepted_by := v_actor;
    elsif new.status = 'rejected' then
      new.rejected_at := now();
      new.rejected_by := v_actor;
    end if;
  elsif (new.sent_at, new.sent_by, new.accepted_at, new.accepted_by, new.rejected_at, new.rejected_by, new.closed_at,
         new.min_margin_percent)
        is distinct from
        (old.sent_at, old.sent_by, old.accepted_at, old.accepted_by, old.rejected_at, old.rejected_by, old.closed_at,
         old.min_margin_percent) then
    raise exception 'Las fechas del ciclo las pone la base de datos' using errcode = 'TN422';
  end if;

  if new.rejection_reason_id is not null and not exists (
    select 1 from public.catalog_items c
    where c.tenant_id = new.tenant_id and c.id = new.rejection_reason_id and c.catalog = 'quote_rejection_reason') then
    raise exception 'El motivo tiene que ser un motivo de rechazo de presupuesto' using errcode = '23503';
  end if;
  if new.payment_method_id is not null and new.payment_method_id is distinct from old.payment_method_id and not exists (
    select 1 from public.catalog_items c
    where c.tenant_id = new.tenant_id and c.id = new.payment_method_id and c.catalog = 'payment_method') then
    raise exception 'La forma de pago tiene que ser de la tabla de formas de pago' using errcode = '23503';
  end if;

  -- ---- Aprobación del margen
  if new.approval_status is distinct from old.approval_status then
    if old.status not in ('draft', 'in_preparation') and new.status = old.status then
      raise exception 'La aprobación se pide antes de enviar' using errcode = 'TN409';
    end if;
    if new.approval_status = 'pending' then
      if not v_can_manage then
        raise exception 'No tienes permiso para pedir la aprobación' using errcode = '42501';
      end if;
      new.approval_requested_by := v_actor;
      new.approval_requested_at := now();
      new.approval_decided_by := null;
      new.approval_decided_at := null;
    elsif new.approval_status in ('approved', 'rejected') then
      if not private.quote_approvable(new.tenant_id, new.quote_id) then
        raise exception 'Aprobar el margen exige el permiso quotes.approve_margin' using errcode = '42501';
      end if;
      new.approval_decided_by := v_actor;
      new.approval_decided_at := now();
    elsif new.approval_status is null and not v_content_changed
          and coalesce(current_setting('tramitnow.quote_approval_reset', true), '') <> 'on' then
      raise exception 'La aprobación no se quita a mano' using errcode = 'TN409';
    end if;
  elsif (new.approval_requested_by, new.approval_requested_at, new.approval_decided_by, new.approval_decided_at)
        is distinct from
        (old.approval_requested_by, old.approval_requested_at, old.approval_decided_by, old.approval_decided_at) then
    raise exception 'Quién y cuándo de la aprobación lo pone la base de datos' using errcode = 'TN422';
  end if;

  -- Cambiar el contenido (sin contar el cálculo) anula la aprobación pedida o dada.
  if (to_jsonb(new) - private.quote_version_workflow_columns()
        - array['calc_people', 'calc_hours', 'calc_revenue', 'calc_cost', 'calc_margin', 'calc_margin_percent',
                'calc_average_rate', 'calc_result'])
     is distinct from
     (to_jsonb(old) - private.quote_version_workflow_columns()
        - array['calc_people', 'calc_hours', 'calc_revenue', 'calc_cost', 'calc_margin', 'calc_margin_percent',
                'calc_average_rate', 'calc_result'])
     and old.approval_status is not null and new.approval_status is not distinct from old.approval_status then
    new.approval_status := null;
    new.approval_requested_by := null; new.approval_requested_at := null;
    new.approval_decided_by := null; new.approval_decided_at := null;
  end if;
  return new;
end;
$$;

create trigger trg_quote_versions_before_write before insert or update on public.quote_versions
  for each row execute function private.quote_versions_before_write();
create trigger trg_quote_versions_updated_at before update on public.quote_versions
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Reglas de quote_positions: versión editable, convenio publicado y salario nunca por debajo del convenio.
-- ---------------------------------------------------------------------------
create or replace function private.quote_positions_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.quote_positions := coalesce(new, old);
  v_agreement record;
  v_gross numeric;
begin
  -- Borrado en cascada (la ETT entera): la versión ya no está.
  if tg_op = 'DELETE' and not exists (
    select 1 from public.quote_versions v where v.tenant_id = old.tenant_id and v.id = old.version_id) then
    return old;
  end if;
  if not private.quote_version_editable(v_row.tenant_id, v_row.version_id) then
    raise exception 'La versión está cerrada (ya se envió): para cambiarla, crea una versión nueva' using errcode = 'TN409';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  if tg_op = 'UPDATE' and (new.tenant_id, new.quote_id, new.version_id) is distinct from (old.tenant_id, old.quote_id, old.version_id) then
    raise exception 'El puesto no cambia de versión' using errcode = 'TN422';
  end if;

  -- Convenio del catálogo global: versión publicada del mismo convenio que el de la ETT.
  if new.agreement_version_id is null then
    new.agreement_period_from := null;
    new.agreement_period_to := null;
    new.agreement_minimum_salary_hour := null;
  else
    select av.status, av.agreement_id, av.effective_from, av.effective_to into v_agreement
    from public.agreement_versions av where av.id = new.agreement_version_id;
    if tg_op = 'INSERT' or new.agreement_version_id is distinct from old.agreement_version_id then
      -- 'retirada' se admite al copiar una versión del presupuesto que ya la usaba; la API solo ofrece publicadas.
      if coalesce(v_agreement.status, '') not in ('publicada', 'retirada')
         or (v_agreement.status = 'retirada' and tg_op = 'UPDATE') then
        raise exception 'Solo se usan versiones publicadas del convenio' using errcode = 'TN422';
      end if;
    end if;
    if new.collective_agreement_id is null or not exists (
      select 1 from public.collective_agreements ca
      where ca.tenant_id = new.tenant_id and ca.id = new.collective_agreement_id
        and ca.global_agreement_id = v_agreement.agreement_id) then
      raise exception 'La versión del convenio no es del convenio elegido' using errcode = 'TN422';
    end if;
    new.agreement_period_from := v_agreement.effective_from;
    new.agreement_period_to := v_agreement.effective_to;
    new.agreement_minimum_salary_hour := case when new.agreement_category_id is not null
      then private.agreement_minimum_salary_hour(new.agreement_version_id, new.agreement_category_id) end;
  end if;

  -- Art. 11 de la Ley 14/1994: la persona cobra al menos lo del convenio de la empresa usuaria. Sin excepciones.
  v_gross := (new.annual_base_salary + new.monthly_bonus * 12) / new.annual_hours;
  if new.agreement_minimum_salary_hour is not null and v_gross < new.agreement_minimum_salary_hour - 0.005 then
    raise exception 'El salario (% €/h) queda por debajo del convenio de la empresa usuaria (% €/h). La ley no lo permite (art. 11 de la Ley 14/1994)',
      to_char(v_gross, 'FM999990.00'), to_char(new.agreement_minimum_salary_hour, 'FM999990.00')
      using errcode = 'TNSAL';
  end if;
  return new;
end;
$$;

create trigger trg_quote_positions_before_write before insert or update or delete on public.quote_positions
  for each row execute function private.quote_positions_before_write();
create trigger trg_quote_positions_updated_at before update on public.quote_positions
  for each row execute function private.touch_updated_at();

-- Cambiar un puesto (sin contar el cálculo) anula la aprobación del margen de su versión.
create or replace function private.quote_positions_reset_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.quote_positions := coalesce(new, old);
  v_calc text[] := array['calc_gross_salary_hour', 'calc_cost_hour', 'calc_rate_hour', 'calc_margin_percent',
                         'calc_result', 'updated_at'];
begin
  if tg_op = 'UPDATE' and (to_jsonb(new) - v_calc) is not distinct from (to_jsonb(old) - v_calc) then
    return null;
  end if;
  -- quote_versions_before_write no deja quitar la aprobación a mano: esta variable marca que es el reinicio interno.
  perform set_config('tramitnow.quote_approval_reset', 'on', true);
  update public.quote_versions v
     set approval_status = null, approval_requested_by = null, approval_requested_at = null,
         approval_decided_by = null, approval_decided_at = null
   where v.tenant_id = v_row.tenant_id and v.id = v_row.version_id and v.approval_status is not null;
  perform set_config('tramitnow.quote_approval_reset', '', true);
  return null;
end;
$$;

create trigger trg_quote_positions_reset_approval after insert or update or delete on public.quote_positions
  for each row execute function private.quote_positions_reset_approval();


-- ---------------------------------------------------------------------------
-- Documentos del presupuesto: entity_type 'quote'.
-- ---------------------------------------------------------------------------
alter table public.documents drop constraint documents_entity_type_check;
alter table public.documents add constraint documents_entity_type_check
  check (entity_type in ('client', 'client_center', 'quote'));

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
    else p_entity_type
  end
$$;

-- Resumen de los cambios de estado y de aprobación de una versión del presupuesto.
create or replace function private.quote_version_activity_summary(p_old jsonb, p_new jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_new ->> 'status' is distinct from p_old ->> 'status' then
      case p_new ->> 'status'
        when 'draft' then 'Vuelve a borrador'
        when 'in_preparation' then 'Pasa a en preparación'
        when 'sent' then 'Envío al cliente'
        when 'pending_signature' then 'Pendiente de firma'
        when 'accepted' then 'Aceptado por el cliente'
        when 'rejected' then 'Rechazado por el cliente'
        when 'superseded' then 'Sustituida por una versión nueva'
        when 'obsolete' then 'Pasa a obsoleto'
      end || ' (v' || (p_new ->> 'version_number') || ')'
    when p_new ->> 'approval_status' is distinct from p_old ->> 'approval_status' then
      case p_new ->> 'approval_status'
        when 'pending' then 'Petición de aprobación del margen'
        when 'approved' then 'Aprobación del margen'
        when 'rejected' then 'Margen: se piden cambios'
        else 'Se anula la aprobación del margen al cambiar el presupuesto'
      end || ' (v' || (p_new ->> 'version_number') || ')'
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
  v_summary := case
    when v_entity_type = 'document' and v_action = 'update' and v_changes ? 'status'
         and v_new ->> 'status' = 'validated' then 'Validación de documento'
    when v_entity_type = 'client_contact' and v_action = 'update' and v_changes ? 'suspended' then
      case when (v_new ->> 'suspended')::boolean then 'Suspensión de contacto' else 'Reactivación de contacto' end
    when v_entity_type = 'quote_version' and v_action = 'update'
         and private.quote_version_activity_summary(v_old, v_new) is not null then
      private.quote_version_activity_summary(v_old, v_new)
    when v_entity_type = 'quote' and v_action = 'update' and v_changes ? 'obsolete_reason' then
      'Pasa a obsoleto: ' || (v_new ->> 'obsolete_reason')
    when v_entity_type = 'quote_version' and v_action = 'create' then
      'Versión ' || (v_new ->> 'version_number') || ' del presupuesto'
    when v_action = 'create' then 'Alta de ' || private.activity_label(v_entity_type)
    when v_action = 'update' then 'Cambios en ' || private.activity_label(v_entity_type)
    when v_action = 'restore' then 'Restauración de ' || private.activity_label(v_entity_type)
    when tg_op = 'DELETE' then 'Eliminación definitiva de ' || private.activity_label(v_entity_type)
    else 'Eliminación de ' || private.activity_label(v_entity_type)
  end || case when v_entity_type = 'quote_version' then '' else coalesce(' «' || v_label || '»', '') end;

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

create trigger trg_quotes_activity after insert or update on public.quotes
  for each row execute function private.log_activity('quote', 'code', '', '');
create trigger trg_quote_versions_activity after insert or update on public.quote_versions
  for each row execute function private.log_activity('quote_version', '', 'quote', 'quote_id');
create trigger trg_quote_positions_activity after insert or update or delete on public.quote_positions
  for each row execute function private.log_activity('quote_position', 'name', 'quote', 'quote_id');

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
    else false
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privilegios y RLS. Nada se borra salvo los puestos de una versión editable.
-- ---------------------------------------------------------------------------
revoke all on table public.quotes, public.quote_versions, public.quote_positions from anon;
revoke delete, truncate, references, trigger on table public.quotes, public.quote_versions from authenticated;
revoke truncate, references, trigger on table public.quote_positions from authenticated;

alter table public.quotes enable row level security;
alter table public.quote_versions enable row level security;
alter table public.quote_positions enable row level security;

create policy quotes_select on public.quotes for select to authenticated
using (private.quote_branch_visible(tenant_id, branch_id));
create policy quotes_insert on public.quotes for insert to authenticated
with check (
  (select private.is_superadmin()) or (
    tenant_id = (select private.current_tenant_id())
    and (select private.has_permission('quotes.manage'))
    and private.can_access_branch(branch_id)
  )
);
create policy quotes_update on public.quotes for update to authenticated
using (private.quote_writable(tenant_id, id))
with check (
  (select private.is_superadmin()) or (
    tenant_id = (select private.current_tenant_id())
    and (select private.has_permission('quotes.manage'))
    and private.can_access_branch(branch_id)
  )
);

create policy quote_versions_select on public.quote_versions for select to authenticated
using (exists (select 1 from public.quotes q where q.tenant_id = quote_versions.tenant_id and q.id = quote_versions.quote_id));
create policy quote_versions_insert on public.quote_versions for insert to authenticated
with check (private.quote_writable(tenant_id, quote_id));
create policy quote_versions_update on public.quote_versions for update to authenticated
using (private.quote_writable(tenant_id, quote_id) or private.quote_approvable(tenant_id, quote_id))
with check (private.quote_writable(tenant_id, quote_id) or private.quote_approvable(tenant_id, quote_id));

create policy quote_positions_select on public.quote_positions for select to authenticated
using (exists (select 1 from public.quotes q where q.tenant_id = quote_positions.tenant_id and q.id = quote_positions.quote_id));
create policy quote_positions_insert on public.quote_positions for insert to authenticated
with check (private.quote_writable(tenant_id, quote_id));
create policy quote_positions_update on public.quote_positions for update to authenticated
using (private.quote_writable(tenant_id, quote_id))
with check (private.quote_writable(tenant_id, quote_id));
create policy quote_positions_delete on public.quote_positions for delete to authenticated
using (private.quote_writable(tenant_id, quote_id));
