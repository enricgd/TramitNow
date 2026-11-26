-- Contratos y altas, parte 1: expediente y bloqueos legales (fase 7 de docs/plan-desarrollo.md, «Decisiones tomadas
-- (19/11/2026)»; pantalla: apps/web/src/views/LaboralView.jsx).
--
--   hiring_files           expediente por persona y plaza. Se abre solo cuando una candidatura pasa a «confirmada»
--                          (trigger en applications) y se cancela si la candidatura deja de estarlo. Guarda los pasos
--                          que se registran a mano: formación PRL, vigilancia de la salud (solo apto / no apto /
--                          renuncia y la fecha: nunca el diagnóstico), entrega de EPI y alta en la Seguridad Social.
--                          «Listo para empezar» lo calcula la API (depende de la fecha de inicio).
--   employment_contracts   contratos del expediente, registrados a mano: de momento circunstancias de la producción y
--                          sustitución (partes 2 y 4: por día, formativo y fijo-discontinuo; por eso puede haber varios).
--                          Cada uno con su comunicación a Contrat@ y su copia básica.
--   request_declarations   declaraciones de la empresa usuaria del art. 8 de la Ley 14/1994 (huelga en el centro y
--                          puestos amortizados en los 12 meses anteriores). Solo se añaden: la última de cada tipo
--                          vale. Mientras el cliente no firme en la app (parte 3), las registra la ETT en su nombre:
--                          qué contacto declara, cómo, cuándo y quién lo registra.
--
-- También:
--   - requests: CPD firmado por la empresa usuaria (a nivel de petición: documento y fecha) y excepción de trabajos
--     especialmente peligrosos (art. 8.b) con su base, quién y cuándo.
--   - clients.is_ett: la empresa usuaria es una ETT (art. 8.d): se bloquea siempre.
--   - Riesgos del puesto (pregunta 5): pueden venir en la evaluación de riesgos del cliente adjunta a la petición
--     (tipo de documento request_risk_assessment, ya existente) en lugar del texto. Lo comprueba la API.
--   - Documentos con entity_type 'hiring_file' y tipos nuevos de documento.
--   - Permisos por tipo de paso (pregunta 22) y conservación legal al anonimizar (contratos y altas).

-- ---------------------------------------------------------------------------
-- Permisos (pregunta 22): uno por tipo de paso y otro para ver.
-- ---------------------------------------------------------------------------
insert into public.permissions (code, module, description) values
  ('hiring_files.view', 'laboral', 'Ver los expedientes de contratación (personas confirmadas y sus pasos)'),
  ('hiring_files.documentation', 'laboral', 'Paso de documentación: validar o rechazar los documentos del candidato desde el expediente'),
  ('hiring_files.cpd', 'laboral', 'CPD firmado de la petición, declaraciones del art. 8 y excepción de trabajos peligrosos'),
  ('hiring_files.contract', 'laboral', 'Registrar contratos, su comunicación a Contrat@ y la copia básica'),
  ('hiring_files.prl', 'laboral', 'Formación PRL, vigilancia de la salud (apto o no apto) y entrega de EPI'),
  ('hiring_files.ss', 'laboral', 'Alta en la Seguridad Social con su justificante');

-- Laboral y admin, todo; Selección, ver y documentación (pide y valida papeles); Director de zona, ver.
insert into public.role_permissions (tenant_id, role_id, permission_code)
select r.tenant_id, r.id, p.permission_code
from public.roles r
join (values
  ('admin', 'hiring_files.view'), ('admin', 'hiring_files.documentation'), ('admin', 'hiring_files.cpd'),
  ('admin', 'hiring_files.contract'), ('admin', 'hiring_files.prl'), ('admin', 'hiring_files.ss'),
  ('laboral', 'hiring_files.view'), ('laboral', 'hiring_files.documentation'), ('laboral', 'hiring_files.cpd'),
  ('laboral', 'hiring_files.contract'), ('laboral', 'hiring_files.prl'), ('laboral', 'hiring_files.ss'),
  ('seleccion', 'hiring_files.view'), ('seleccion', 'hiring_files.documentation'),
  ('director_zona', 'hiring_files.view')
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
    ('admin', 'quotes.manage'), ('admin', 'quotes.approve_margin'), ('admin', 'quotes.view_costs'),
    ('admin', 'requests.manage'), ('admin', 'candidates.manage'), ('admin', 'personal_data.view'),
    ('admin', 'privacy.manage'), ('admin', 'privacy.audit'),
    ('admin', 'hiring_files.view'), ('admin', 'hiring_files.documentation'), ('admin', 'hiring_files.cpd'),
    ('admin', 'hiring_files.contract'), ('admin', 'hiring_files.prl'), ('admin', 'hiring_files.ss'),
    ('laboral', 'module.laboral'), ('laboral', 'addresses.write'), ('laboral', 'labor_catalogs.manage'),
    ('laboral', 'clients.manage'), ('laboral', 'requests.manage'), ('laboral', 'candidates.manage'),
    ('laboral', 'personal_data.view'),
    ('laboral', 'hiring_files.view'), ('laboral', 'hiring_files.documentation'), ('laboral', 'hiring_files.cpd'),
    ('laboral', 'hiring_files.contract'), ('laboral', 'hiring_files.prl'), ('laboral', 'hiring_files.ss'),
    ('director_zona', 'module.laboral'), ('director_zona', 'module.seleccion'),
    ('director_zona', 'module.comercial'), ('director_zona', 'addresses.write'), ('director_zona', 'clients.manage'),
    ('director_zona', 'quotes.manage'), ('director_zona', 'quotes.approve_margin'),
    ('director_zona', 'quotes.view_costs'), ('director_zona', 'requests.manage'), ('director_zona', 'candidates.manage'),
    ('director_zona', 'hiring_files.view'),
    ('seleccion', 'module.seleccion'), ('seleccion', 'addresses.write'), ('seleccion', 'requests.manage'),
    ('seleccion', 'candidates.manage'), ('seleccion', 'hiring_files.view'), ('seleccion', 'hiring_files.documentation'),
    ('comercial', 'module.comercial'), ('comercial', 'addresses.write'), ('comercial', 'clients.manage'),
    ('comercial', 'quotes.manage'), ('comercial', 'requests.manage')
  ) as p (role_code, permission_code) on p.role_code = r.code
  where r.tenant_id = new.id;

  return new;
end;
$$;

create or replace function private.hiring_permission_any()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_permission('hiring_files.view') or private.has_permission('hiring_files.documentation')
      or private.has_permission('hiring_files.cpd') or private.has_permission('hiring_files.contract')
      or private.has_permission('hiring_files.prl') or private.has_permission('hiring_files.ss')
$$;

-- ¿Ve los expedientes de esta petición? Un permiso de expedientes y acceso a la sucursal de la petición.
create or replace function private.hiring_file_visible(p_tenant_id uuid, p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_superadmin() or (
    p_tenant_id = private.current_tenant_id()
    and private.hiring_permission_any()
    and exists (select 1 from public.requests r
                where r.tenant_id = p_tenant_id and r.id = p_request_id and private.can_access_branch(r.branch_id))
  )
$$;

-- ¿Puede registrar este tipo de paso en los expedientes de esta petición?
create or replace function private.hiring_step_writable(p_tenant_id uuid, p_request_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_superadmin() or (
    p_tenant_id = private.current_tenant_id()
    and private.has_permission(p_permission)
    and exists (select 1 from public.requests r
                where r.tenant_id = p_tenant_id and r.id = p_request_id and private.can_access_branch(r.branch_id))
  )
$$;

grant execute on function private.hiring_permission_any(), private.hiring_file_visible(uuid, uuid),
  private.hiring_step_writable(uuid, uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Ajustes de la ETT: plazos de los registros que avisan [verificar con la asesoría]
-- ---------------------------------------------------------------------------
alter table public.tenants
  add column contract_communication_days smallint not null default 10 check (contract_communication_days between 1 and 60),
  add column basic_copy_days smallint not null default 10 check (basic_copy_days between 1 and 60);

comment on column public.tenants.contract_communication_days is
  'Días desde el inicio del contrato para comunicarlo a Contrat@ (por defecto 10, art. 8.4 ET) [verificar]';
comment on column public.tenants.basic_copy_days is
  'Días desde la firma del contrato para entregar la copia básica a la representación legal (por defecto 10, art. 8.4 ET) [verificar]';

-- ---------------------------------------------------------------------------
-- Tipos de documento
-- ---------------------------------------------------------------------------
create or replace function private.seed_hiring_catalogs(p_tenant_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.catalog_items (tenant_id, catalog, code, name, retention_required)
  select p_tenant_id, 'document_type', v.code, v.name, v.retention
  from (values
    ('request_cpd_signed', 'CPD firmado por la empresa usuaria', true),
    ('request_client_declaration', 'Declaración de la empresa usuaria (art. 8)', true),
    ('hiring_contract', 'Contrato de trabajo firmado', true),
    ('hiring_prl_training', 'Certificado de formación PRL', true),
    ('hiring_health_fitness', 'Certificado de aptitud (vigilancia de la salud)', true),
    ('hiring_ppe_delivery', 'Entrega de EPI firmada', false),
    ('hiring_ss_registration', 'Justificante de alta en la Seguridad Social', true),
    ('hiring_contrata', 'Comunicación a Contrat@', true),
    ('hiring_basic_copy', 'Copia básica del contrato', true)
  ) as v (code, name, retention)
  where not exists (
    select 1 from public.catalog_items c
    where c.tenant_id = p_tenant_id and c.catalog = 'document_type' and c.deleted_at is null
      and (c.code = v.code or lower(c.name) = lower(v.name))
  )
$$;

create or replace function private.seed_tenant_hiring_catalogs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.seed_hiring_catalogs(new.id);
  return new;
end;
$$;

create trigger trg_tenants_seed_hiring_catalogs after insert on public.tenants
  for each row execute function private.seed_tenant_hiring_catalogs();

select private.seed_hiring_catalogs(id) from public.tenants;

-- ---------------------------------------------------------------------------
-- Clientes y peticiones: art. 8 y CPD firmado
-- ---------------------------------------------------------------------------
alter table public.clients
  add column is_ett boolean not null default false;

comment on column public.clients.is_ett is
  'La empresa usuaria es una ETT: no se le puede ceder personal (art. 8.d de la Ley 14/1994). Bloquea el CPD y los expedientes';

alter table public.requests
  add column cpd_signed_at date,
  add column cpd_signed_document_id uuid,
  add column cpd_signed_recorded_by uuid references public.profiles (id) on delete set null,
  add column cpd_signed_recorded_at timestamptz,
  add column hazardous_exception_basis text check (hazardous_exception_basis is null or length(trim(hazardous_exception_basis)) between 10 and 2000),
  add column hazardous_exception_by uuid references public.profiles (id) on delete set null,
  add column hazardous_exception_at timestamptz,
  add constraint requests_cpd_signed_document_fkey foreign key (tenant_id, cpd_signed_document_id)
    references public.documents (tenant_id, id),
  add constraint requests_cpd_signed_check check ((cpd_signed_at is null) = (cpd_signed_document_id is null)),
  add constraint requests_hazardous_exception_check check ((hazardous_exception_basis is null) = (hazardous_exception_at is null));

comment on column public.requests.cpd_signed_at is
  'Fecha en que la empresa usuaria firmó el CPD (registro a mano con el documento firmado; la firma en la app llega en la parte 3)';
comment on column public.requests.hazardous_exception_basis is
  'Trabajos especialmente peligrosos (art. 8.b): base de la excepción que marca la ETT (RD 216/1999, convenio...) [verificar]';

-- Quién y cuándo, y permiso de expedientes (hiring_files.cpd) para estas columnas.
create or replace function private.requests_hiring_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select p.id from public.profiles p where p.id = auth.uid());
  v_cpd boolean := new.cpd_signed_at is distinct from old.cpd_signed_at
                   or new.cpd_signed_document_id is distinct from old.cpd_signed_document_id;
  v_exc boolean := new.hazardous_exception_basis is distinct from old.hazardous_exception_basis;
begin
  if (v_cpd or v_exc) and not (private.is_superadmin() or private.has_permission('hiring_files.cpd')) then
    raise exception 'No tienes permiso para el CPD firmado ni el art. 8 (hiring_files.cpd)' using errcode = '42501';
  end if;
  if v_cpd then
    if new.cpd_signed_document_id is not null and not exists (
      select 1 from public.documents d where d.tenant_id = new.tenant_id and d.id = new.cpd_signed_document_id
        and d.entity_type = 'request' and d.entity_id = new.id and d.deleted_at is null) then
      raise exception 'El CPD firmado tiene que ser un documento de esta petición' using errcode = 'TN422';
    end if;
    new.cpd_signed_recorded_by := case when new.cpd_signed_at is null then null else v_me end;
    new.cpd_signed_recorded_at := case when new.cpd_signed_at is null then null else now() end;
  end if;
  if v_exc then
    new.hazardous_exception_by := case when new.hazardous_exception_basis is null then null else v_me end;
    new.hazardous_exception_at := case when new.hazardous_exception_basis is null then null else now() end;
  end if;
  return new;
end;
$$;

create trigger trg_requests_hiring_columns before update on public.requests
  for each row execute function private.requests_hiring_columns();

-- La excepción sale en el CPD previo: si cambia, queda desactualizado.
create or replace function private.request_pre_cpd_columns()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['branch_id', 'client_center_id', 'client_signer_contact_id', 'positions_count', 'start_date', 'end_date',
               'shift_name', 'workday_type', 'schedule', 'weekly_hours', 'tasks', 'qualification', 'risks', 'ppe',
               'required_licenses', 'use_case', 'use_case_justification', 'hazardous_work', 'hazardous_exception_basis']
$$;

-- Declaraciones del art. 8 (solo se añaden).
create table public.request_declarations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  request_id uuid not null,
  -- strike: huelga en el centro (art. 8.a); downsized_positions: puestos amortizados en los 12 meses anteriores por
  -- despido improcedente o arts. 50, 51 y 52.c ET (art. 8.c).
  kind varchar(30) not null check (kind in ('strike', 'downsized_positions')),
  -- true: lo hay (bloquea). false: el cliente declara que no.
  affirmative boolean not null,
  contact_id uuid,
  channel varchar(20) not null check (channel in ('email', 'paper', 'phone', 'in_person', 'app', 'other')),
  declared_at date not null,
  document_id uuid,
  notes varchar(1000),
  recorded_by uuid references public.profiles (id) on delete set null,
  recorded_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, request_id) references public.requests (tenant_id, id) on delete cascade,
  foreign key (tenant_id, contact_id) references public.client_contacts (tenant_id, id),
  foreign key (tenant_id, document_id) references public.documents (tenant_id, id)
);

create index request_declarations_request_idx on public.request_declarations (tenant_id, request_id, kind, recorded_at desc);

comment on table public.request_declarations is
  'Declaraciones de la empresa usuaria del art. 8 de la Ley 14/1994. Solo se añaden; vale la última de cada tipo';

create or replace function private.request_declarations_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.recorded_by := (select p.id from public.profiles p where p.id = auth.uid());
  new.recorded_at := now();
  if new.declared_at > current_date then
    raise exception 'La fecha de la declaración no puede ser futura' using errcode = 'TN422';
  end if;
  if new.contact_id is not null and not exists (
    select 1 from public.client_contacts cc join public.requests r on r.tenant_id = cc.tenant_id and r.client_id = cc.client_id
    where cc.tenant_id = new.tenant_id and cc.id = new.contact_id and r.id = new.request_id) then
    raise exception 'El contacto que declara tiene que ser del cliente de la petición' using errcode = 'TN422';
  end if;
  if new.document_id is not null and not exists (
    select 1 from public.documents d where d.tenant_id = new.tenant_id and d.id = new.document_id
      and d.entity_type = 'request' and d.entity_id = new.request_id and d.deleted_at is null) then
    raise exception 'El justificante tiene que ser un documento de la petición' using errcode = 'TN422';
  end if;
  return new;
end;
$$;

create trigger trg_request_declarations_before_insert before insert on public.request_declarations
  for each row execute function private.request_declarations_before_insert();

-- ---------------------------------------------------------------------------
-- Expedientes
-- ---------------------------------------------------------------------------
create table public.hiring_files (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  application_id uuid not null,
  candidate_id uuid not null,
  request_id uuid not null,
  slot_id uuid,
  -- Primer día previsto (de la petición al abrirlo; se puede cambiar). Las comprobaciones se hacen a esta fecha.
  start_date date,
  status varchar(20) not null default 'open' check (status in ('open', 'cancelled')),
  cancelled_at timestamptz,
  cancel_reason varchar(250),
  -- Formación PRL (art. 19 LPRL y art. 28.5 para la ETT) con su certificado.
  prl_training_date date,
  prl_training_hours numeric(5, 1) check (prl_training_hours > 0),
  prl_training_document_id uuid,
  -- Vigilancia de la salud (art. 22 LPRL): SOLO el resultado y la fecha. El diagnóstico no se guarda nunca (RGPD).
  -- waived: la persona renuncia cuando la ley lo permite [verificar: puestos donde es obligatoria].
  health_surveillance_result varchar(10) check (health_surveillance_result in ('fit', 'unfit', 'waived')),
  health_surveillance_date date,
  health_surveillance_document_id uuid,
  -- Entrega de EPI (no bloquea).
  ppe_delivered_at date,
  ppe_notes varchar(500),
  ppe_document_id uuid,
  -- Alta en la Seguridad Social (registro a mano; Sistema RED, más adelante): fecha de efectos y justificante.
  ss_registration_date date,
  ss_registration_document_id uuid,
  ss_registration_recorded_by uuid references public.profiles (id) on delete set null,
  ss_registration_recorded_at timestamptz,
  notes varchar(2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  unique (tenant_id, id),
  unique (application_id),
  foreign key (tenant_id, application_id) references public.applications (tenant_id, id) on delete cascade,
  foreign key (tenant_id, candidate_id) references public.candidates (tenant_id, id) on delete cascade,
  foreign key (tenant_id, request_id) references public.requests (tenant_id, id) on delete cascade,
  foreign key (tenant_id, slot_id) references public.request_slots (tenant_id, id) on delete set null (slot_id),
  foreign key (tenant_id, prl_training_document_id) references public.documents (tenant_id, id),
  foreign key (tenant_id, health_surveillance_document_id) references public.documents (tenant_id, id),
  foreign key (tenant_id, ppe_document_id) references public.documents (tenant_id, id),
  foreign key (tenant_id, ss_registration_document_id) references public.documents (tenant_id, id),
  check ((status = 'cancelled') = (cancelled_at is not null)),
  check ((health_surveillance_result is null) = (health_surveillance_date is null)),
  check (prl_training_document_id is null or prl_training_date is not null),
  check (ss_registration_document_id is null or ss_registration_date is not null)
);

create index hiring_files_request_idx on public.hiring_files (tenant_id, request_id);
create index hiring_files_candidate_idx on public.hiring_files (tenant_id, candidate_id);

comment on table public.hiring_files is
  'Expediente de contratación por persona y plaza: se abre al confirmar la candidatura. Listo para empezar lo calcula la API';
comment on column public.hiring_files.health_surveillance_result is
  'Solo apto (fit), no apto (unfit) o renuncia (waived). Nunca el diagnóstico (RGPD, art. 22.4 LPRL)';

-- Qué columnas puede cambiar cada permiso.
create or replace function private.hiring_file_columns(p_step text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_step
    when 'prl' then array['prl_training_date', 'prl_training_hours', 'prl_training_document_id', 'health_surveillance_result',
                          'health_surveillance_date', 'health_surveillance_document_id', 'ppe_delivered_at', 'ppe_notes',
                          'ppe_document_id']
    when 'ss' then array['ss_registration_date', 'ss_registration_document_id']
    when 'general' then array['start_date', 'notes']
    when 'system' then array['slot_id', 'status', 'cancelled_at', 'cancel_reason']
  end
$$;

create or replace function private.hiring_files_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select p.id from public.profiles p where p.id = auth.uid());
  v_changed text[];
  v_doc record;
  v_system boolean := coalesce(current_setting('tramitnow.hiring_sync', true), '') = 'on';
begin
  if tg_op = 'INSERT' then
    if not v_system then
      raise exception 'Los expedientes se abren al confirmar la candidatura' using errcode = 'TN409';
    end if;
    return new;
  end if;

  select coalesce(array_agg(n.key), '{}') into v_changed
  from jsonb_each(to_jsonb(new)) n join jsonb_each(to_jsonb(old)) o using (key)
  where n.value is distinct from o.value and n.key not in ('updated_at', 'updated_by', 'ss_registration_recorded_by',
                                                           'ss_registration_recorded_at');
  if v_changed = '{}' then
    return new;
  end if;

  if not v_system then
    if not (v_changed <@ (private.hiring_file_columns('prl') || private.hiring_file_columns('ss')
                          || private.hiring_file_columns('general'))) then
      raise exception 'Estos datos del expediente no se cambian a mano' using errcode = 'TN422';
    end if;
    if old.status = 'cancelled' then
      raise exception 'El expediente está cancelado (la candidatura ya no está confirmada)' using errcode = 'TN409';
    end if;
    if not private.is_superadmin() then
      if v_changed && private.hiring_file_columns('prl') and not private.has_permission('hiring_files.prl') then
        raise exception 'No tienes permiso para la PRL y la vigilancia de la salud (hiring_files.prl)' using errcode = '42501';
      end if;
      if v_changed && private.hiring_file_columns('ss') and not private.has_permission('hiring_files.ss') then
        raise exception 'No tienes permiso para el alta en la Seguridad Social (hiring_files.ss)' using errcode = '42501';
      end if;
      if v_changed && private.hiring_file_columns('general') and not (
        private.has_permission('hiring_files.documentation') or private.has_permission('hiring_files.cpd')
        or private.has_permission('hiring_files.contract') or private.has_permission('hiring_files.prl')
        or private.has_permission('hiring_files.ss')) then
        raise exception 'No tienes permiso para cambiar el expediente' using errcode = '42501';
      end if;
    end if;
  end if;

  -- Los justificantes, del propio expediente.
  for v_doc in
    select x.id from unnest(array[new.prl_training_document_id, new.health_surveillance_document_id, new.ppe_document_id,
                                  new.ss_registration_document_id]) as x (id)
    where x.id is not null
  loop
    if not exists (select 1 from public.documents d where d.tenant_id = new.tenant_id and d.id = v_doc.id
                   and d.entity_type = 'hiring_file' and d.entity_id = new.id and d.deleted_at is null) then
      raise exception 'El justificante tiene que ser un documento de este expediente' using errcode = 'TN422';
    end if;
  end loop;

  if v_changed && array['ss_registration_date', 'ss_registration_document_id'] then
    new.ss_registration_recorded_by := case when new.ss_registration_date is null then null else v_me end;
    new.ss_registration_recorded_at := case when new.ss_registration_date is null then null else now() end;
  end if;
  new.updated_at := now();
  new.updated_by := v_me;
  return new;
end;
$$;

create trigger trg_hiring_files_before_write before insert or update on public.hiring_files
  for each row execute function private.hiring_files_before_write();

-- Se abre al confirmar la candidatura y se cancela si deja de estarlo (salvo que empiece la misión, fase 8).
create or replace function private.applications_hiring_file()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.stage = 'confirmed' and (tg_op = 'INSERT' or old.stage is distinct from 'confirmed') then
    perform set_config('tramitnow.hiring_sync', 'on', true);
    insert into public.hiring_files (tenant_id, application_id, candidate_id, request_id, slot_id, start_date)
    select new.tenant_id, new.id, new.candidate_id, new.request_id, new.slot_id, r.start_date
    from public.requests r where r.tenant_id = new.tenant_id and r.id = new.request_id
    on conflict (application_id) do update
      set slot_id = excluded.slot_id, status = 'open', cancelled_at = null, cancel_reason = null;
    perform set_config('tramitnow.hiring_sync', '', true);
  elsif tg_op = 'UPDATE' and old.stage = 'confirmed' and new.stage not in ('confirmed', 'on_mission') then
    perform set_config('tramitnow.hiring_sync', 'on', true);
    update public.hiring_files
       set status = 'cancelled', cancelled_at = now(),
           cancel_reason = case new.stage
             when 'withdrawn' then 'La persona se retira'
             when 'discarded' then coalesce('Descartada: ' || new.discard_reason, 'Candidatura descartada')
             else 'Se libera la plaza' end
     where tenant_id = new.tenant_id and application_id = new.id and status = 'open';
    perform set_config('tramitnow.hiring_sync', '', true);
  end if;
  return null;
end;
$$;

create trigger trg_applications_hiring_file after insert or update of stage on public.applications
  for each row execute function private.applications_hiring_file();

-- Expedientes de las candidaturas ya confirmadas antes de esta migración.
select set_config('tramitnow.hiring_sync', 'on', false);
insert into public.hiring_files (tenant_id, application_id, candidate_id, request_id, slot_id, start_date)
select a.tenant_id, a.id, a.candidate_id, a.request_id, a.slot_id, r.start_date
from public.applications a join public.requests r on r.tenant_id = a.tenant_id and r.id = a.request_id
where a.stage = 'confirmed'
on conflict (application_id) do nothing;
select set_config('tramitnow.hiring_sync', '', false);

-- ---------------------------------------------------------------------------
-- Contratos
-- ---------------------------------------------------------------------------
create table public.employment_contracts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  hiring_file_id uuid not null,
  -- production: circunstancias de la producción (art. 15.2 ET); substitution: sustitución (art. 15.3 ET).
  -- Partes 2 y 4: por día, formativo y fijo-discontinuo de ETT.
  kind varchar(30) not null check (kind in ('production', 'substitution')),
  -- Clave oficial (catálogo public.contract_keys): 402/502 producción, 410/510 sustitución [verificar].
  contract_key char(3) not null references public.contract_keys (code),
  start_date date not null,
  end_date date,
  -- Sustitución: causa (persona sustituida, reducción de jornada...). Sin más datos de la persona sustituida.
  substitution_reason varchar(500),
  signed_at date,
  document_id uuid,
  contrata_communicated_at date,
  contrata_reference varchar(40),
  contrata_document_id uuid,
  basic_copy_delivered_at date,
  basic_copy_document_id uuid,
  status varchar(20) not null default 'active' check (status in ('active', 'cancelled')),
  cancelled_at timestamptz,
  cancel_reason varchar(250),
  notes varchar(1000),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, hiring_file_id) references public.hiring_files (tenant_id, id) on delete cascade,
  foreign key (tenant_id, document_id) references public.documents (tenant_id, id),
  foreign key (tenant_id, contrata_document_id) references public.documents (tenant_id, id),
  foreign key (tenant_id, basic_copy_document_id) references public.documents (tenant_id, id),
  check (end_date is null or end_date >= start_date),
  check ((signed_at is null) = (document_id is null)),
  check ((status = 'cancelled') = (cancelled_at is not null)),
  check (kind <> 'production' or end_date is not null),
  check (kind <> 'substitution' or length(trim(coalesce(substitution_reason, ''))) > 0)
);

create index employment_contracts_file_idx on public.employment_contracts (tenant_id, hiring_file_id);

comment on table public.employment_contracts is
  'Contratos del expediente (registro a mano). Varios por expediente: partes 2 y 4 añaden contratos por día y otras modalidades';

create or replace function private.employment_contracts_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_file public.hiring_files;
  v_doc record;
begin
  select * into v_file from public.hiring_files f where f.tenant_id = new.tenant_id and f.id = new.hiring_file_id;
  if tg_op = 'INSERT' then
    new.created_by := (select p.id from public.profiles p where p.id = auth.uid());
    if v_file.status = 'cancelled' then
      raise exception 'El expediente está cancelado' using errcode = 'TN409';
    end if;
  else
    if new.hiring_file_id <> old.hiring_file_id or new.kind <> old.kind then
      raise exception 'El tipo de contrato no cambia: cancélalo y registra otro' using errcode = 'TN422';
    end if;
    if old.status = 'cancelled' then
      raise exception 'El contrato está cancelado' using errcode = 'TN409';
    end if;
    new.updated_at := now();
  end if;
  if (new.kind = 'production' and new.contract_key not in ('402', '502'))
     or (new.kind = 'substitution' and new.contract_key not in ('410', '510')) then
    raise exception 'La clave % no corresponde a ese tipo de contrato', new.contract_key using errcode = 'TN422';
  end if;
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    if nullif(trim(new.cancel_reason), '') is null then
      raise exception 'Para cancelar el contrato hay que indicar el motivo' using errcode = 'TN422';
    end if;
  end if;
  for v_doc in
    select x.id from unnest(array[new.document_id, new.contrata_document_id, new.basic_copy_document_id]) as x (id)
    where x.id is not null
  loop
    if not exists (select 1 from public.documents d where d.tenant_id = new.tenant_id and d.id = v_doc.id
                   and d.entity_type = 'hiring_file' and d.entity_id = new.hiring_file_id and d.deleted_at is null) then
      raise exception 'El documento tiene que ser del expediente' using errcode = 'TN422';
    end if;
  end loop;
  return new;
end;
$$;

create trigger trg_employment_contracts_before_write before insert or update on public.employment_contracts
  for each row execute function private.employment_contracts_before_write();

-- ---------------------------------------------------------------------------
-- Documentos del expediente
-- ---------------------------------------------------------------------------
alter table public.documents drop constraint documents_entity_type_check;
alter table public.documents add constraint documents_entity_type_check
  check (entity_type in ('client', 'client_center', 'quote', 'request', 'candidate', 'hiring_file'));

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
    when 'candidate' then exists (select 1 from public.candidates where tenant_id = p_tenant_id and id = p_entity_id
                                  and anonymized_at is null)
    when 'hiring_file' then exists (select 1 from public.hiring_files where tenant_id = p_tenant_id and id = p_entity_id)
    else false
  end
$$;

-- Documentos del candidato: también quien lleva la documentación del expediente. Del expediente: quien registra
-- alguno de sus pasos. El CPD firmado y las declaraciones (documentos de la petición): también hiring_files.cpd.
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
        or private.hiring_step_writable(p_tenant_id, p_entity_id, 'hiring_files.cpd')
      when 'candidate' then private.has_permission('candidates.manage') or private.has_permission('hiring_files.documentation')
      when 'hiring_file' then exists (
        select 1 from public.hiring_files f
        where f.tenant_id = p_tenant_id and f.id = p_entity_id
          and (private.hiring_step_writable(p_tenant_id, f.request_id, 'hiring_files.contract')
               or private.hiring_step_writable(p_tenant_id, f.request_id, 'hiring_files.prl')
               or private.hiring_step_writable(p_tenant_id, f.request_id, 'hiring_files.ss')))
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
    when 'candidate' then exists (select 1 from public.candidates where id = p_entity_id)
    when 'hiring_file' then exists (select 1 from public.hiring_files where id = p_entity_id)
    else false
  end
$$;

-- ---------------------------------------------------------------------------
-- Conservación al anonimizar: quien ha tenido contrato o alta conserva lo que obliga la ley.
-- ---------------------------------------------------------------------------
create or replace function private.candidate_legal_retention(p_tenant_id uuid, p_candidate_id uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select array_remove(array[
    case when exists (
      select 1 from public.employment_contracts c join public.hiring_files f on f.tenant_id = c.tenant_id and f.id = c.hiring_file_id
      where f.tenant_id = p_tenant_id and f.candidate_id = p_candidate_id and c.status = 'active')
    then 'contratos de trabajo (4 años, art. 21 de la LISOS) [verificar]' end,
    case when exists (
      select 1 from public.hiring_files f
      where f.tenant_id = p_tenant_id and f.candidate_id = p_candidate_id and f.ss_registration_date is not null)
    then 'altas en la Seguridad Social (4 años) [verificar]' end
  ], null)
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
    when 'candidate' then 'candidato'
    when 'application' then 'candidatura'
    when 'hiring_file' then 'expediente'
    when 'employment_contract' then 'contrato'
    when 'request_declaration' then 'declaración del art. 8'
    else p_entity_type
  end
$$;

create trigger trg_hiring_files_activity after insert or update on public.hiring_files
  for each row execute function private.log_activity('hiring_file', '', 'request', 'request_id');
create trigger trg_employment_contracts_activity after insert or update on public.employment_contracts
  for each row execute function private.log_activity('employment_contract', 'contract_key', 'hiring_file', 'hiring_file_id');
create trigger trg_request_declarations_activity after insert on public.request_declarations
  for each row execute function private.log_activity('request_declaration', 'kind', 'request', 'request_id');

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
    when 'candidate' then exists (select 1 from public.candidates c where c.id = p_entity_id)
    when 'application' then private.activity_visible(p_parent_type, p_parent_id, null, null)
    when 'hiring_file' then exists (select 1 from public.hiring_files f where f.id = p_entity_id)
    when 'employment_contract' then private.activity_visible(p_parent_type, p_parent_id, null, null)
    when 'request_declaration' then private.activity_visible(p_parent_type, p_parent_id, null, null)
    else false
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privilegios y RLS
-- ---------------------------------------------------------------------------
revoke all on table public.hiring_files, public.employment_contracts, public.request_declarations from anon;
revoke insert, delete, truncate, references, trigger on table public.hiring_files from authenticated;
revoke delete, truncate, references, trigger on table public.employment_contracts from authenticated;
revoke update, delete, truncate, references, trigger on table public.request_declarations from authenticated;

alter table public.hiring_files enable row level security;
alter table public.employment_contracts enable row level security;
alter table public.request_declarations enable row level security;

create policy hiring_files_select on public.hiring_files for select to authenticated
using (private.hiring_file_visible(tenant_id, request_id));
create policy hiring_files_update on public.hiring_files for update to authenticated
using (private.hiring_file_visible(tenant_id, request_id)) with check (private.hiring_file_visible(tenant_id, request_id));

create policy employment_contracts_select on public.employment_contracts for select to authenticated
using (exists (select 1 from public.hiring_files f where f.tenant_id = employment_contracts.tenant_id
               and f.id = employment_contracts.hiring_file_id));
create policy employment_contracts_insert on public.employment_contracts for insert to authenticated
with check (exists (select 1 from public.hiring_files f where f.tenant_id = employment_contracts.tenant_id
                    and f.id = employment_contracts.hiring_file_id
                    and private.hiring_step_writable(f.tenant_id, f.request_id, 'hiring_files.contract')));
create policy employment_contracts_update on public.employment_contracts for update to authenticated
using (exists (select 1 from public.hiring_files f where f.tenant_id = employment_contracts.tenant_id
               and f.id = employment_contracts.hiring_file_id
               and private.hiring_step_writable(f.tenant_id, f.request_id, 'hiring_files.contract')))
with check (exists (select 1 from public.hiring_files f where f.tenant_id = employment_contracts.tenant_id
                    and f.id = employment_contracts.hiring_file_id
                    and private.hiring_step_writable(f.tenant_id, f.request_id, 'hiring_files.contract')));

-- Las declaraciones las ve quien ve la petición o sus expedientes; las registra hiring_files.cpd.
create policy request_declarations_select on public.request_declarations for select to authenticated
using (exists (select 1 from public.requests r where r.tenant_id = request_declarations.tenant_id
               and r.id = request_declarations.request_id)
       or private.hiring_file_visible(tenant_id, request_id));
create policy request_declarations_insert on public.request_declarations for insert to authenticated
with check (private.hiring_step_writable(tenant_id, request_id, 'hiring_files.cpd'));
