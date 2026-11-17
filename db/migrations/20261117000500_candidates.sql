-- Candidatos y selección (fase 6 de docs/plan-desarrollo.md; pantalla: apps/web/src/views/CandidatosView.jsx y las
-- notas design/cambios/*candidat*).
--
--   candidates            la persona, en la bolsa común de la ETT (no por sucursal). Única en la ETT por la huella
--                         HMAC de su documento de identidad (la calcula la API con una clave que no está aquí).
--                         Cifrados por la API (AES-256-GCM, «vN:…»): documento de identidad, número de la Seguridad
--                         Social, IBAN y salud o discapacidad. Para listar y enmascarar sin descifrar, sus cuatro
--                         últimos caracteres en *_hint. Nombre, teléfono, email y localidad, en claro.
--   candidate_attributes  perfiles, carnés, habilidades e idiomas (con nivel), de las tablas maestras con sinónimos.
--   privacy_notices       textos legales de la ETT por finalidad y versión (no cambian una vez creados).
--   candidate_consents    consentimientos: bolsa para futuras ofertas (caduca a los meses que diga la ETT) y datos
--                         de salud. Con la versión del texto aceptado, la fecha y el canal.
--   applications          candidaturas (persona × petición) con etapas; al proponerla al cliente reserva una plaza de
--                         la petición y al confirmarla la cubre. CPD de la persona, contrato y alta: fase 7.
--   access_log            auditoría de accesos a datos personales: solo se añade (ni UPDATE ni DELETE, tampoco desde
--                         la API). La escribe private.log_access(); la leen privacy.audit.
--
-- Supresión (derecho de supresión del RGPD): private.anonymize_candidate() borra o sustituye los datos personales,
-- quita los documentos que no son de conservación obligatoria (la API borra los ficheros), limpia los valores del
-- historial y conserva la auditoría, los consentimientos (prueba de la base legal) y lo que la ley obliga a guardar.

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------
insert into public.permissions (code, module, description) values
  ('candidates.manage', 'seleccion', 'Crear y cambiar candidatos, sus documentos y sus candidaturas'),
  ('personal_data.view', 'laboral', 'Ver completos el documento de identidad, la Seguridad Social, el IBAN y la salud (queda auditado)'),
  ('privacy.manage', 'administracion', 'Anonimizar y exportar los datos de una persona, textos legales y plazos de conservación'),
  ('privacy.audit', 'administracion', 'Leer la auditoría de accesos a datos personales (responsable de protección de datos)');

insert into public.role_permissions (tenant_id, role_id, permission_code)
select r.tenant_id, r.id, p.permission_code
from public.roles r
join (values
  ('admin', 'candidates.manage'), ('admin', 'personal_data.view'), ('admin', 'privacy.manage'), ('admin', 'privacy.audit'),
  ('director_zona', 'candidates.manage'), ('seleccion', 'candidates.manage'),
  ('laboral', 'candidates.manage'), ('laboral', 'personal_data.view')
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
    ('laboral', 'module.laboral'), ('laboral', 'addresses.write'), ('laboral', 'labor_catalogs.manage'),
    ('laboral', 'clients.manage'), ('laboral', 'requests.manage'), ('laboral', 'candidates.manage'),
    ('laboral', 'personal_data.view'),
    ('director_zona', 'module.laboral'), ('director_zona', 'module.seleccion'),
    ('director_zona', 'module.comercial'), ('director_zona', 'addresses.write'), ('director_zona', 'clients.manage'),
    ('director_zona', 'quotes.manage'), ('director_zona', 'quotes.approve_margin'),
    ('director_zona', 'quotes.view_costs'), ('director_zona', 'requests.manage'), ('director_zona', 'candidates.manage'),
    ('seleccion', 'module.seleccion'), ('seleccion', 'addresses.write'), ('seleccion', 'requests.manage'),
    ('seleccion', 'candidates.manage'),
    ('comercial', 'module.comercial'), ('comercial', 'addresses.write'), ('comercial', 'clients.manage'),
    ('comercial', 'quotes.manage'), ('comercial', 'requests.manage')
  ) as p (role_code, permission_code) on p.role_code = r.code
  where r.tenant_id = new.id;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Ajustes de la ETT [verificar con la asesoría]
-- ---------------------------------------------------------------------------
alter table public.tenants
  add column candidate_pool_retention_months smallint not null default 24 check (candidate_pool_retention_months between 1 and 120),
  add column candidate_document_notice_days smallint not null default 30 check (candidate_document_notice_days between 1 and 365),
  add column access_log_retention_months smallint not null default 24 check (access_log_retention_months between 12 and 120);

comment on column public.tenants.candidate_pool_retention_months is
  'Meses que dura el consentimiento de la bolsa de candidatos y plazo de conservación (por defecto 24) [verificar]';
comment on column public.tenants.candidate_document_notice_days is
  'Días antes de caducar un documento del candidato para avisar (por defecto 30)';
comment on column public.tenants.access_log_retention_months is
  'Meses que se conserva la auditoría de accesos (por defecto 24) [verificar]';

-- ---------------------------------------------------------------------------
-- Tablas maestras con sinónimos: perfiles, carnés, habilidades e idiomas.
-- ---------------------------------------------------------------------------
insert into public.catalog_types (code, name, module, description) values
  ('candidate_profile', 'Perfiles profesionales', 'seleccion', 'Perfil principal del candidato (design/cambios/2026-10-28-candidatos-listados-perfiles.md)'),
  ('license', 'Permisos y carnés', 'seleccion', 'Permisos de conducir, carnés y acreditaciones del candidato'),
  ('skill', 'Habilidades', 'seleccion', 'Habilidades del candidato'),
  ('language', 'Idiomas', 'seleccion', 'Idiomas del candidato (con nivel: Nativo, C2…A1)');

alter table public.catalog_items
  add column group_name varchar(80),
  add column synonyms text[] not null default '{}';

comment on column public.catalog_items.synonyms is 'Otros nombres con los que se busca (sin acentos ni mayúsculas)';

-- Texto para buscar sin acentos ni mayúsculas.
create or replace function private.search_norm(p_text text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select regexp_replace(lower(translate(coalesce(p_text, ''),
    'ÁÀÄÂáàäâÉÈËÊéèëêÍÌÏÎíìïîÓÒÖÔóòöôÚÙÜÛúùüûÑñÇç', 'AAAAaaaaEEEEeeeeIIIIiiiiOOOOooooUUUUuuuuNnCc')), '\s+', ' ', 'g')
$$;

grant execute on function private.search_norm(text) to authenticated, service_role;

create or replace function private.seed_candidate_catalogs(p_tenant_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.catalog_items (tenant_id, catalog, code, name, group_name, synonyms)
  select p_tenant_id, v.catalog, v.code, v.name, v.grp, v.syn
  from (values
    -- Perfiles (orientativos: el equipo revisa los sinónimos)
    ('candidate_profile', 'warehouse_operator', 'Operario/a de almacén', 'Logística', array['mozo de almacén', 'mozo/a', 'peón de almacén']),
    ('candidate_profile', 'forklift_operator', 'Carretillero/a', 'Logística', array['carretillera', 'conductor de carretilla', 'operador de carretilla', 'toro', 'mozo especializado']),
    ('candidate_profile', 'picker', 'Preparador/a de pedidos', 'Logística', array['picker', 'picking', 'preparador']),
    ('candidate_profile', 'stocker', 'Reponedor/a', 'Comercio', array['reponedor nocturno', 'reposición']),
    ('candidate_profile', 'cashier', 'Cajero/a', 'Comercio', array['cajera', 'dependiente de caja']),
    ('candidate_profile', 'shop_assistant', 'Dependiente/a', 'Comercio', array['vendedor', 'dependienta']),
    ('candidate_profile', 'truck_driver', 'Conductor/a de camión', 'Transporte', array['camionero', 'chófer', 'conductor profesional']),
    ('candidate_profile', 'delivery_driver', 'Repartidor/a', 'Transporte', array['repartidor de furgoneta', 'reparto última milla']),
    ('candidate_profile', 'production_operator', 'Operario/a de producción', 'Industria', array['peón de producción', 'operario de fábrica', 'operario de línea']),
    ('candidate_profile', 'packing_operator', 'Operario/a de envasado', 'Industria', array['envasador', 'empaquetador']),
    ('candidate_profile', 'maintenance_technician', 'Técnico/a de mantenimiento', 'Industria', array['mecánico de mantenimiento', 'electromecánico']),
    ('candidate_profile', 'waiter', 'Camarero/a', 'Hostelería', array['camarera', 'camarero de sala', 'camarero de barra', 'mesero']),
    ('candidate_profile', 'kitchen_assistant', 'Ayudante de cocina', 'Hostelería', array['pinche', 'auxiliar de cocina']),
    ('candidate_profile', 'cook', 'Cocinero/a', 'Hostelería', array['cocinera', 'cocinero de partida']),
    ('candidate_profile', 'cleaner', 'Limpiador/a', 'Limpieza', array['limpiadora', 'personal de limpieza', 'operario de limpieza']),
    ('candidate_profile', 'administrative', 'Administrativo/a', 'Oficina', array['auxiliar administrativo', 'administrativa']),
    ('candidate_profile', 'receptionist', 'Recepcionista', 'Oficina', array['telefonista']),
    ('candidate_profile', 'farm_worker', 'Peón agrícola', 'Agricultura', array['temporero', 'recolector']),
    ('candidate_profile', 'construction_laborer', 'Peón de construcción', 'Construcción', array['peón de obra', 'albañil ayudante']),
    ('candidate_profile', 'caregiver', 'Auxiliar de ayuda a domicilio', 'Cuidados', array['cuidador', 'gerocultor', 'auxiliar de geriatría']),
    -- Permisos y carnés
    ('license', 'driving_b', 'Permiso B', 'Conducir', array['carnet de coche', 'carné b']),
    ('license', 'driving_c1', 'Permiso C1', 'Conducir', array['carné c1']),
    ('license', 'driving_c', 'Permiso C', 'Conducir', array['carné c', 'carnet de camión']),
    ('license', 'driving_ce', 'Permiso C+E', 'Conducir', array['carné c+e', 'trailer']),
    ('license', 'driving_d', 'Permiso D', 'Conducir', array['carné d', 'autobús']),
    ('license', 'cap', 'CAP', 'Conducir', array['certificado de aptitud profesional']),
    ('license', 'adr', 'ADR', 'Conducir', array['mercancías peligrosas']),
    ('license', 'forklift', 'Carné de carretillero', 'Maquinaria', array['carnet carretillero une 58451', 'carretilla elevadora', 'toro']),
    ('license', 'pemp', 'PEMP', 'Maquinaria', array['plataforma elevadora', 'plataformas elevadoras móviles de personal']),
    ('license', 'overhead_crane', 'Puente grúa', 'Maquinaria', array['grúa puente']),
    ('license', 'food_handler', 'Manipulador de alimentos', 'Formación', array['manipulador/a de alimentos', 'carné de manipulador']),
    ('license', 'prl_20', 'PRL 20 h', 'Formación', array['prevención de riesgos 20 horas']),
    ('license', 'prl_60', 'PRL 60 h', 'Formación', array['prevención de riesgos 60 horas', 'nivel básico prl']),
    ('license', 'other', 'Otros', 'Otros', array[]::text[]),
    -- Habilidades
    ('skill', 'rf_picking', 'Picking con radiofrecuencia', 'Logística', array['picking con pda', 'rf', 'radiofrecuencia']),
    ('skill', 'voice_picking', 'Picking por voz', 'Logística', array['voice picking']),
    ('skill', 'counterbalance_forklift', 'Carretilla frontal', 'Logística', array['frontal', 'contrapesada']),
    ('skill', 'reach_truck', 'Carretilla retráctil', 'Logística', array['retráctil']),
    ('skill', 'pallet_truck', 'Transpaleta eléctrica', 'Logística', array['transpaleta', 'apilador']),
    ('skill', 'palletizing', 'Paletizado', 'Logística', array['filmado', 'flejado']),
    ('skill', 'loading', 'Carga y descarga', 'Logística', array['carga de camiones', 'descarga']),
    ('skill', 'stock_control', 'Control de stock', 'Logística', array['inventario', 'gestión de stock']),
    ('skill', 'wms', 'SGA / SAP', 'Logística', array['sga', 'sap', 'wms']),
    ('skill', 'customer_service', 'Atención al cliente', 'Comercio', array['atención al público']),
    -- Idiomas
    ('language', 'es', 'Español', null, array['castellano']),
    ('language', 'en', 'Inglés', null, array[]::text[]),
    ('language', 'fr', 'Francés', null, array[]::text[]),
    ('language', 'de', 'Alemán', null, array[]::text[]),
    ('language', 'it', 'Italiano', null, array[]::text[]),
    ('language', 'pt', 'Portugués', null, array[]::text[]),
    ('language', 'ca', 'Catalán', null, array['valenciano']),
    ('language', 'eu', 'Euskera', null, array['vasco']),
    ('language', 'gl', 'Gallego', null, array[]::text[]),
    ('language', 'ar', 'Árabe', null, array[]::text[]),
    ('language', 'ro', 'Rumano', null, array[]::text[]),
    ('language', 'zh', 'Chino', null, array['mandarín']),
    -- Tipos de documento del candidato
    ('document_type', 'candidate_id_document', 'DNI o NIE', null, array[]::text[]),
    ('document_type', 'candidate_work_permit', 'Permiso de trabajo y residencia', null, array[]::text[]),
    ('document_type', 'candidate_ss', 'Documento de la Seguridad Social', null, array[]::text[]),
    ('document_type', 'candidate_privacy_consent', 'Consentimiento RGPD firmado', null, array[]::text[]),
    ('document_type', 'candidate_forklift', 'Carné de carretillero', null, array[]::text[]),
    ('document_type', 'candidate_driving_license', 'Permiso de conducir', null, array[]::text[]),
    ('document_type', 'candidate_prl', 'Formación PRL', null, array[]::text[]),
    ('document_type', 'candidate_food_handler', 'Certificado de manipulador de alimentos', null, array[]::text[]),
    ('document_type', 'candidate_medical', 'Reconocimiento médico', null, array[]::text[]),
    ('document_type', 'candidate_cv', 'Currículum', null, array[]::text[]),
    ('document_type', 'other', 'Otro documento', null, array[]::text[])
  ) as v (catalog, code, name, grp, syn)
  where not exists (
    select 1 from public.catalog_items c
    where c.tenant_id = p_tenant_id and c.catalog = v.catalog and c.deleted_at is null
      and (c.code = v.code or lower(c.name) = lower(v.name))
  )
$$;

create or replace function private.seed_tenant_candidate_catalogs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.seed_candidate_catalogs(new.id);
  return new;
end;
$$;

create trigger trg_tenants_seed_candidate_catalogs after insert on public.tenants
  for each row execute function private.seed_tenant_candidate_catalogs();

select private.seed_candidate_catalogs(id) from public.tenants;

-- Quien gestiona candidatos puede añadir valores a estas cuatro tablas maestras desde la ficha («Añadir al listado»),
-- sin catalogs.manage. Los sinónimos y la revisión, en Tablas maestras (catalogs.manage).
create or replace function private.add_candidate_catalog_item(p_catalog text, p_name text, p_group text, p_synonyms text[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not (private.has_permission('candidates.manage') or private.has_permission('catalogs.manage')) then
    raise exception 'No tienes permiso para añadir valores (candidates.manage)' using errcode = '42501';
  end if;
  if p_catalog not in ('candidate_profile', 'license', 'skill', 'language') then
    raise exception 'Solo perfiles, carnés, habilidades e idiomas' using errcode = 'TN422';
  end if;
  insert into public.catalog_items (tenant_id, catalog, name, group_name, synonyms)
  values (private.current_tenant_id(), p_catalog, trim(p_name), nullif(trim(coalesce(p_group, '')), ''), coalesce(p_synonyms, '{}'))
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function private.add_candidate_catalog_item(text, text, text, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Serie de candidatos (CAN2026-00001)
-- ---------------------------------------------------------------------------
alter table public.number_series drop constraint number_series_document_kind_check;
alter table public.number_series add constraint number_series_document_kind_check
  check (document_kind in ('quote', 'request', 'invoice', 'credit_note', 'candidate'));

create or replace function private.next_number(
  p_tenant_id uuid,
  p_document_kind text,
  p_year integer,
  p_company_id uuid default null,
  p_branch_id uuid default null
)
returns table (series_id uuid, number integer, formatted text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_series public.number_series;
begin
  if not (private.is_superadmin() or p_tenant_id = private.current_tenant_id()) then
    raise exception 'Sin acceso a la ETT' using errcode = '42501';
  end if;

  update public.number_series s
     set last_number = s.last_number + 1
   where s.tenant_id = p_tenant_id and s.document_kind = p_document_kind and s.year = p_year
     and s.company_id is not distinct from p_company_id and s.branch_id is not distinct from p_branch_id
  returning s.* into v_series;

  if not found then
    insert into public.number_series (tenant_id, document_kind, company_id, branch_id, year, prefix)
    values (
      p_tenant_id, p_document_kind, p_company_id, p_branch_id, p_year,
      case p_document_kind when 'quote' then 'PRE' when 'request' then 'PET' when 'invoice' then 'FAC'
                           when 'credit_note' then 'REC' when 'candidate' then 'CAN' end || p_year || '-'
    )
    on conflict (tenant_id, document_kind, company_id, branch_id, year) do nothing;

    update public.number_series s
       set last_number = s.last_number + 1
     where s.tenant_id = p_tenant_id and s.document_kind = p_document_kind and s.year = p_year
       and s.company_id is not distinct from p_company_id and s.branch_id is not distinct from p_branch_id
    returning s.* into v_series;
  end if;

  series_id := v_series.id;
  number := v_series.last_number;
  formatted := v_series.prefix || lpad(v_series.last_number::text, greatest(v_series.padding, length(v_series.last_number::text)), '0');
  return next;
end;
$$;

-- ---------------------------------------------------------------------------
-- candidates
-- ---------------------------------------------------------------------------
create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  code varchar(30) not null,
  -- Sucursal que lo dio de alta (informativo: la bolsa es de toda la ETT).
  branch_id uuid,
  first_name varchar(120) not null,
  last_name varchar(180),
  -- Documento de identidad: cifrado, huella HMAC para duplicados y búsqueda, y los 4 últimos para enmascarar.
  id_document_type varchar(10) check (id_document_type in ('dni', 'nie', 'passport', 'other')),
  id_document_number_enc text check (id_document_number_enc ~ '^v[0-9]+:'),
  id_document_fingerprint char(64) check (id_document_fingerprint ~ '^[0-9a-f]{64}$'),
  id_document_hint varchar(4),
  id_document_expires_on date,
  -- Seguridad Social e IBAN: cifrados.
  ss_number_enc text check (ss_number_enc ~ '^v[0-9]+:'),
  ss_number_hint varchar(4),
  iban_enc text check (iban_enc ~ '^v[0-9]+:'),
  iban_hint varchar(4),
  -- Salud y discapacidad: cifrado (JSON) y solo con base legal.
  health_enc text check (health_enc ~ '^v[0-9]+:'),
  health_legal_basis varchar(20) check (health_legal_basis in ('explicit_consent', 'labor_obligation')),
  birth_date date,
  nationality varchar(80),
  phone varchar(40),
  email varchar(200),
  address varchar(250),
  postal_code varchar(10),
  city varchar(120),
  province_code char(2) references public.provinces (code),
  -- Selección
  status varchar(20) not null default 'new' check (status in (
    'new', 'to_contact', 'contacted', 'in_selection', 'available', 'unavailable', 'onboarding', 'in_mission', 'discarded')),
  source varchar(20) not null default 'database' check (source in (
    'candidate_portal', 'infojobs', 'indeed', 'linkedin', 'database', 'referral', 'walk_in', 'other')),
  source_ref varchar(120),
  main_profile_id uuid,
  experience_years smallint check (experience_years between 0 and 70),
  has_car boolean,
  other_licenses_text varchar(500),
  -- [{ company, position, from, to, duties }] y [{ title, center, year }]
  experiences jsonb not null default '[]'::jsonb check (jsonb_typeof(experiences) = 'array'),
  education jsonb not null default '[]'::jsonb check (jsonb_typeof(education) = 'array'),
  -- Disponibilidad
  shifts text[] not null default '{}' check (shifts <@ array['morning', 'afternoon', 'night', 'split', 'weekends']),
  availability varchar(12) check (availability in ('immediate', 'one_week', 'two_weeks', 'from_date')),
  available_from date,
  max_distance_km smallint check (max_distance_km between 0 and 1000),
  availability_notes text,
  auto_expiry_notice boolean not null default true,
  last_contact_at timestamptz,
  -- Supresión
  anonymized_at timestamptz,
  anonymized_by uuid references public.profiles (id) on delete set null,
  anonymization_reason varchar(250),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, code),
  foreign key (tenant_id, branch_id) references public.branches (tenant_id, id) on delete set null (branch_id),
  foreign key (tenant_id, main_profile_id) references public.catalog_items (tenant_id, id),
  check ((id_document_number_enc is null) = (id_document_fingerprint is null)),
  check (id_document_number_enc is null or id_document_type is not null),
  check (health_enc is null or health_legal_basis is not null),
  check (availability is distinct from 'from_date' or available_from is not null)
);

create unique index candidates_fingerprint_uniq on public.candidates (tenant_id, id_document_fingerprint)
  where id_document_fingerprint is not null;
create index candidates_tenant_status_idx on public.candidates (tenant_id, status);
create index candidates_tenant_name_idx on public.candidates (tenant_id, private.search_norm(first_name || ' ' || coalesce(last_name, '')));
create index candidates_tenant_phone_idx on public.candidates (tenant_id, phone);
create index candidates_tenant_email_idx on public.candidates (tenant_id, lower(email));
create index candidates_tenant_city_idx on public.candidates (tenant_id, private.search_norm(city));

comment on table public.candidates is 'Candidatos: bolsa común de la ETT. Datos sensibles cifrados por la API';
comment on column public.candidates.id_document_fingerprint is 'HMAC-SHA256 (clave de la API) del documento normalizado: duplicados sin descifrar';

create table public.candidate_attributes (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  candidate_id uuid not null,
  item_id uuid not null,
  -- candidate_profile (otros perfiles, para buscar), license, skill o language.
  catalog varchar(80) not null check (catalog in ('candidate_profile', 'license', 'skill', 'language')),
  level varchar(10) check (level in ('native', 'C2', 'C1', 'B2', 'B1', 'A2', 'A1')),
  created_at timestamptz not null default now(),
  primary key (candidate_id, item_id),
  foreign key (tenant_id, candidate_id) references public.candidates (tenant_id, id) on delete cascade,
  foreign key (tenant_id, item_id) references public.catalog_items (tenant_id, id),
  check (level is null or catalog = 'language')
);

create index candidate_attributes_item_idx on public.candidate_attributes (tenant_id, item_id);

-- ---------------------------------------------------------------------------
-- Textos legales y consentimientos
-- ---------------------------------------------------------------------------
create table public.privacy_notices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  purpose varchar(20) not null check (purpose in ('talent_pool', 'health_data')),
  version varchar(30) not null check (length(trim(version)) > 0),
  text text not null check (length(trim(text)) > 0),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, purpose, version)
);

comment on table public.privacy_notices is 'Textos legales por finalidad y versión. No cambian: para cambiar el texto, otra versión';

create table public.candidate_consents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  candidate_id uuid not null,
  purpose varchar(20) not null check (purpose in ('talent_pool', 'health_data')),
  notice_id uuid not null,
  given_at timestamptz not null default now(),
  channel varchar(10) not null check (channel in ('portal', 'paper', 'email', 'other')),
  -- Documento firmado, si lo hay.
  document_id uuid,
  -- Bolsa: given_at + los meses de la ETT (lo pone la base de datos).
  expires_at timestamptz,
  withdrawn_at timestamptz,
  withdrawn_by uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, candidate_id) references public.candidates (tenant_id, id) on delete cascade,
  foreign key (tenant_id, notice_id) references public.privacy_notices (tenant_id, id),
  foreign key (tenant_id, document_id) references public.documents (tenant_id, id) on delete set null (document_id)
);

create index candidate_consents_candidate_idx on public.candidate_consents (tenant_id, candidate_id, purpose);

-- ¿Tiene la persona un consentimiento vigente para esa finalidad?
create or replace function private.candidate_has_consent(p_tenant_id uuid, p_candidate_id uuid, p_purpose text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.candidate_consents c
    where c.tenant_id = p_tenant_id and c.candidate_id = p_candidate_id and c.purpose = p_purpose
      and c.withdrawn_at is null and (c.expires_at is null or c.expires_at > now()))
$$;

grant execute on function private.candidate_has_consent(uuid, uuid, text) to authenticated, service_role;

create or replace function private.candidate_consents_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if not exists (select 1 from public.privacy_notices n
                   where n.tenant_id = new.tenant_id and n.id = new.notice_id and n.purpose = new.purpose) then
      raise exception 'El texto legal tiene que ser de la misma finalidad' using errcode = 'TN422';
    end if;
    if exists (select 1 from public.candidates c where c.tenant_id = new.tenant_id and c.id = new.candidate_id
               and c.anonymized_at is not null) then
      raise exception 'La persona está anonimizada' using errcode = 'TN409';
    end if;
    if new.given_at > now() + interval '1 minute' then
      raise exception 'La fecha del consentimiento no puede ser futura' using errcode = 'TN422';
    end if;
    new.expires_at := case when new.purpose = 'talent_pool' then new.given_at + make_interval(months =>
      (select t.candidate_pool_retention_months from public.tenants t where t.id = new.tenant_id)) end;
    new.withdrawn_at := null;
    new.withdrawn_by := null;
    new.created_by := (select p.id from public.profiles p where p.id = auth.uid());
    return new;
  end if;
  -- Solo se retira (una vez): lo demás es la prueba de la base legal y no cambia.
  if (to_jsonb(new) - array['withdrawn_at', 'withdrawn_by', 'document_id']) is distinct from
     (to_jsonb(old) - array['withdrawn_at', 'withdrawn_by', 'document_id']) or old.withdrawn_at is not null then
    raise exception 'Un consentimiento no cambia: solo se retira' using errcode = 'TN409';
  end if;
  if new.withdrawn_at is not null then
    new.withdrawn_at := now();
    new.withdrawn_by := (select p.id from public.profiles p where p.id = auth.uid());
  end if;
  return new;
end;
$$;

create trigger trg_candidate_consents_before_write before insert or update on public.candidate_consents
  for each row execute function private.candidate_consents_before_write();

-- ---------------------------------------------------------------------------
-- Reglas de candidates
-- ---------------------------------------------------------------------------
create or replace function private.candidates_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := (select p.id from public.profiles p where p.id = auth.uid());
    new.anonymized_at := null;
    new.anonymized_by := null;
    new.anonymization_reason := null;
  else
    if new.code <> old.code or new.tenant_id <> old.tenant_id or new.created_by is distinct from old.created_by then
      raise exception 'El código y el alta del candidato no cambian' using errcode = 'TN422';
    end if;
    if old.anonymized_at is not null then
      raise exception 'La persona está anonimizada: no se puede cambiar' using errcode = 'TN409';
    end if;
    if new.anonymized_at is distinct from old.anonymized_at
       and coalesce(current_setting('tramitnow.anonymizing', true), '') <> 'on' then
      raise exception 'Para anonimizar, usa la supresión del RGPD' using errcode = 'TN422';
    end if;
  end if;
  -- Salud con consentimiento explícito: tiene que haber uno vigente.
  if new.health_enc is not null and new.health_legal_basis = 'explicit_consent'
     and (tg_op = 'INSERT' or new.health_enc is distinct from old.health_enc
          or new.health_legal_basis is distinct from old.health_legal_basis)
     and not private.candidate_has_consent(new.tenant_id, new.id, 'health_data') then
    raise exception 'Para guardar datos de salud con consentimiento hace falta un consentimiento «health_data» vigente'
      using errcode = 'TN422';
  end if;
  return new;
end;
$$;

create trigger trg_candidates_before_write before insert or update on public.candidates
  for each row execute function private.candidates_before_write();
create trigger trg_candidates_updated_at before update on public.candidates
  for each row execute function private.touch_updated_at();

create or replace function private.candidate_attributes_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.catalog_items i
                 where i.tenant_id = new.tenant_id and i.id = new.item_id and i.catalog = new.catalog) then
    raise exception 'El valor no es de esa tabla maestra' using errcode = 'TN422';
  end if;
  return new;
end;
$$;

create trigger trg_candidate_attributes_check before insert or update on public.candidate_attributes
  for each row execute function private.candidate_attributes_check();

-- ---------------------------------------------------------------------------
-- Candidaturas
-- ---------------------------------------------------------------------------
alter table public.request_slots
  add column application_id uuid;

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  candidate_id uuid not null,
  request_id uuid not null,
  -- registered (inscrito), preselected, interview, proposed (propuesta al cliente: reserva plaza), confirmed (plaza
  -- cubierta), discarded, withdrawn. on_mission, finished y left: fase 7.
  stage varchar(20) not null default 'registered' check (stage in (
    'registered', 'preselected', 'interview', 'proposed', 'confirmed', 'on_mission', 'finished', 'left',
    'discarded', 'withdrawn')),
  -- applied: se inscribió (medidas precontractuales); sourced: la ETT la saca de la bolsa (consentimiento).
  origin varchar(10) not null check (origin in ('applied', 'sourced')),
  legal_basis varchar(20) not null check (legal_basis in ('precontractual', 'consent')),
  source varchar(20) check (source in ('candidate_portal', 'infojobs', 'indeed', 'linkedin', 'database', 'referral', 'walk_in', 'other')),
  slot_id uuid,
  notes text,
  discard_reason varchar(250),
  stage_changed_at timestamptz not null default now(),
  stage_changed_by uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (request_id, candidate_id),
  foreign key (tenant_id, candidate_id) references public.candidates (tenant_id, id) on delete cascade,
  foreign key (tenant_id, request_id) references public.requests (tenant_id, id) on delete cascade,
  foreign key (tenant_id, slot_id) references public.request_slots (tenant_id, id),
  check ((stage in ('proposed', 'confirmed', 'on_mission')) = (slot_id is not null))
);

-- Una persona ocupa como mucho una plaza a la vez (propuesta o confirmada).
create unique index applications_one_slot_uniq on public.applications (tenant_id, candidate_id)
  where stage in ('proposed', 'confirmed', 'on_mission');
create unique index applications_slot_uniq on public.applications (slot_id) where slot_id is not null;
create index applications_request_idx on public.applications (tenant_id, request_id, stage);

alter table public.request_slots
  add constraint request_slots_application_fkey foreign key (tenant_id, application_id)
    references public.applications (tenant_id, id) on delete set null (application_id);

create or replace function private.applications_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select p.id from public.profiles p where p.id = auth.uid());
  v_slot record;
begin
  if tg_op = 'INSERT' then
    if exists (select 1 from public.candidates c where c.tenant_id = new.tenant_id and c.id = new.candidate_id
               and c.anonymized_at is not null) then
      raise exception 'La persona está anonimizada' using errcode = 'TN409';
    end if;
    if not exists (select 1 from public.requests r where r.tenant_id = new.tenant_id and r.id = new.request_id
                   and r.status not in ('closed', 'cancelled')) then
      raise exception 'La petición está cerrada o cancelada' using errcode = 'TN409';
    end if;
    -- Sacarla de la bolsa exige su consentimiento vigente; si se inscribió, son medidas precontractuales.
    if new.origin = 'sourced' and not private.candidate_has_consent(new.tenant_id, new.candidate_id, 'talent_pool') then
      raise exception 'La persona no tiene el consentimiento de la bolsa vigente: solo puede entrar si se inscribe ella'
        using errcode = 'TN409';
    end if;
    new.legal_basis := case new.origin when 'applied' then 'precontractual' else 'consent' end;
    if new.stage not in ('registered', 'preselected', 'interview') then
      raise exception 'Una candidatura empieza en selección' using errcode = 'TN422';
    end if;
    new.slot_id := null;
    new.stage_changed_at := now();
    new.stage_changed_by := v_me;
    new.created_by := v_me;
    return new;
  end if;

  if (new.tenant_id, new.candidate_id, new.request_id, new.origin, new.legal_basis, new.created_by)
     is distinct from (old.tenant_id, old.candidate_id, old.request_id, old.origin, old.legal_basis, old.created_by) then
    raise exception 'La persona, la petición y el origen de la candidatura no cambian' using errcode = 'TN422';
  end if;
  if new.stage in ('on_mission', 'finished', 'left') and new.stage is distinct from old.stage then
    raise exception 'Las etapas de la misión llegan con Contratos y altas (fase 7)' using errcode = 'TN422';
  end if;
  if old.stage in ('on_mission', 'finished', 'left') then
    raise exception 'La candidatura ya está en la misión' using errcode = 'TN409';
  end if;

  if new.stage is distinct from old.stage then
    new.stage_changed_at := now();
    new.stage_changed_by := v_me;
    if new.stage = 'proposed' and old.stage not in ('registered', 'preselected', 'interview') then
      raise exception 'Solo se propone al cliente desde la selección' using errcode = 'TN409';
    end if;
    if new.stage = 'confirmed' and old.stage <> 'proposed' then
      raise exception 'Solo se confirma una candidatura propuesta al cliente' using errcode = 'TN409';
    end if;
    -- Plaza: al proponer se reserva una por cubrir de la misma petición.
    if new.stage = 'proposed' then
      select s.id, s.status, s.request_id into v_slot from public.request_slots s
      where s.tenant_id = new.tenant_id and s.id = new.slot_id;
      if v_slot.id is null or v_slot.request_id <> new.request_id or v_slot.status <> 'open' then
        raise exception 'La plaza tiene que ser de la petición y estar por cubrir' using errcode = 'TN409';
      end if;
    elsif new.stage = 'confirmed' then
      new.slot_id := old.slot_id;
    elsif new.stage not in ('proposed', 'confirmed') then
      new.slot_id := null;
    end if;
  elsif new.slot_id is distinct from old.slot_id then
    raise exception 'La plaza cambia al proponer, confirmar o liberar' using errcode = 'TN422';
  end if;
  return new;
end;
$$;

create trigger trg_applications_before_write before insert or update on public.applications
  for each row execute function private.applications_before_write();
create trigger trg_applications_updated_at before update on public.applications
  for each row execute function private.touch_updated_at();

-- La plaza sigue a la candidatura: reservada al proponer, cubierta al confirmar, por cubrir al liberar.
create or replace function private.applications_sync_slot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.slot_id is not null and old.slot_id is distinct from new.slot_id then
    update public.request_slots set status = 'open', application_id = null
    where tenant_id = old.tenant_id and id = old.slot_id and application_id = old.id;
  end if;
  if new.slot_id is not null then
    update public.request_slots
       set status = case new.stage when 'proposed' then 'reserved' when 'confirmed' then 'covered' else 'started' end,
           application_id = new.id
     where tenant_id = new.tenant_id and id = new.slot_id;
  end if;
  return null;
end;
$$;

create trigger trg_applications_sync_slot after insert or update of stage, slot_id on public.applications
  for each row execute function private.applications_sync_slot();

-- ---------------------------------------------------------------------------
-- Documentos del candidato: entity_type 'candidate', rechazo con motivo y aviso de renovación.
-- ---------------------------------------------------------------------------
alter table public.documents drop constraint documents_entity_type_check;
alter table public.documents add constraint documents_entity_type_check
  check (entity_type in ('client', 'client_center', 'quote', 'request', 'candidate'));
alter table public.documents drop constraint documents_status_check;
alter table public.documents add constraint documents_status_check
  check (status in ('pending', 'validated', 'draft', 'rejected'));
alter table public.documents
  add column rejection_reason varchar(250),
  add column rejected_at timestamptz,
  add column rejected_by uuid references public.profiles (id) on delete set null,
  add column renewal_notice_sent_at timestamptz,
  add constraint documents_rejection_check check ((status = 'rejected') = (rejection_reason is not null));

create or replace function private.documents_rejection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'rejected' and (tg_op = 'INSERT' or old.status <> 'rejected') then
    new.rejected_at := now();
    new.rejected_by := (select p.id from public.profiles p where p.id = auth.uid());
  elsif new.status <> 'rejected' then
    new.rejection_reason := null;
    new.rejected_at := null;
    new.rejected_by := null;
  elsif tg_op = 'UPDATE' then
    new.rejected_at := old.rejected_at;
    new.rejected_by := old.rejected_by;
  end if;
  return new;
end;
$$;

create trigger trg_documents_rejection before insert or update on public.documents
  for each row execute function private.documents_rejection();

-- Visibilidad y escritura de candidatos
create or replace function private.candidate_visible()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_superadmin() or private.has_permission('candidates.manage')
      or private.has_permission('module.seleccion') or private.has_permission('module.laboral')
$$;

create or replace function private.candidate_writable(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_superadmin() or (p_tenant_id = private.current_tenant_id() and private.has_permission('candidates.manage'))
$$;

grant execute on function private.candidate_visible(), private.candidate_writable(uuid) to authenticated, service_role;

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
      when 'candidate' then private.has_permission('candidates.manage')
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
    else false
  end
$$;

-- ---------------------------------------------------------------------------
-- Auditoría de accesos: solo se añade.
-- ---------------------------------------------------------------------------
create table public.access_log (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  actor_user_id uuid references public.profiles (id) on delete set null,
  action varchar(20) not null check (action in ('view_record', 'view_sensitive', 'download_document', 'export', 'anonymize')),
  candidate_id uuid,
  -- Campos vistos, documento descargado, motivo...: nunca el valor de un dato personal.
  details jsonb not null default '{}'::jsonb,
  unique (tenant_id, id)
);

create index access_log_candidate_idx on public.access_log (tenant_id, candidate_id, occurred_at desc);
create index access_log_actor_idx on public.access_log (tenant_id, actor_user_id, occurred_at desc);

comment on table public.access_log is
  'Auditoría de accesos a datos personales. Solo se añade (private.log_access). Se conserva tenants.access_log_retention_months';

create or replace function private.access_log_append_only()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'TRUNCATE') then
    raise exception 'La auditoría de accesos no se puede cambiar ni vaciar' using errcode = '42501';
  end if;
  -- Borrar: solo al borrar la ETT entera, o lo que ha pasado su plazo de conservación y nunca desde la API.
  if not exists (select 1 from public.tenants t where t.id = old.tenant_id) then
    return old;
  end if;
  if session_user in ('tramitnow_api', 'authenticator', 'authenticated', 'anon')
     or old.occurred_at >= now() - make_interval(months =>
          (select t.access_log_retention_months from public.tenants t where t.id = old.tenant_id)) then
    raise exception 'La auditoría de accesos no se puede borrar' using errcode = '42501';
  end if;
  return old;
end;
$$;

create trigger trg_access_log_append_only before update or delete on public.access_log
  for each row execute function private.access_log_append_only();
create trigger trg_access_log_no_truncate before truncate on public.access_log
  for each statement execute function private.access_log_append_only();

-- Lo único que escribe en la auditoría: la ETT activa y el usuario del token.
create or replace function private.log_access(p_action text, p_candidate_id uuid, p_details jsonb default '{}'::jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.access_log (tenant_id, actor_user_id, action, candidate_id, details)
  values (private.current_tenant_id(), (select p.id from public.profiles p where p.id = auth.uid()), p_action,
          p_candidate_id, coalesce(p_details, '{}'::jsonb))
$$;

grant execute on function private.log_access(text, uuid, jsonb) to authenticated;

-- Purga de lo que ha pasado su plazo (tarea programada, con postgres; nunca desde la API).
create or replace function private.purge_access_log()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.access_log a using public.tenants t
  where t.id = a.tenant_id and a.occurred_at < now() - make_interval(months => t.access_log_retention_months);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function private.purge_access_log() from public;

-- ---------------------------------------------------------------------------
-- Supresión (RGPD): anonimizar. Devuelve las rutas de los ficheros borrados para que la API los quite de Storage.
-- ---------------------------------------------------------------------------
create or replace function private.anonymize_candidate(p_tenant_id uuid, p_candidate_id uuid, p_reason text)
returns table (storage_path text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select p.id from public.profiles p where p.id = auth.uid());
begin
  if not (private.is_superadmin() or (p_tenant_id = private.current_tenant_id() and private.has_permission('privacy.manage'))) then
    raise exception 'No tienes permiso para anonimizar (privacy.manage)' using errcode = '42501';
  end if;
  if not exists (select 1 from public.candidates c where c.tenant_id = p_tenant_id and c.id = p_candidate_id
                 and c.anonymized_at is null) then
    raise exception 'La persona no existe o ya está anonimizada' using errcode = 'TN409';
  end if;
  if exists (select 1 from public.applications a where a.tenant_id = p_tenant_id and a.candidate_id = p_candidate_id
             and a.stage in ('confirmed', 'on_mission')) then
    raise exception 'Tiene una plaza confirmada o está en misión: termina antes la misión' using errcode = 'TN409';
  end if;

  -- Candidaturas: fuera de los procesos abiertos y sin notas.
  update public.applications set stage = 'withdrawn'
  where tenant_id = p_tenant_id and candidate_id = p_candidate_id and stage in ('registered', 'preselected', 'interview', 'proposed');
  update public.applications set notes = null, discard_reason = null
  where tenant_id = p_tenant_id and candidate_id = p_candidate_id;

  delete from public.candidate_attributes where tenant_id = p_tenant_id and candidate_id = p_candidate_id;

  -- Documentos (salvo los de conservación obligatoria). Los consentimientos se quedan como prueba, sin documento.
  return query
    delete from public.documents d
    using public.catalog_items t
    where d.tenant_id = p_tenant_id and d.entity_type = 'candidate' and d.entity_id = p_candidate_id
      and t.tenant_id = d.tenant_id and t.id = d.type_id and not t.retention_required
    returning d.storage_path;

  perform set_config('tramitnow.anonymizing', 'on', true);
  update public.candidates
     set first_name = 'Persona anonimizada', last_name = null, id_document_type = null, id_document_number_enc = null,
         id_document_fingerprint = null, id_document_hint = null, id_document_expires_on = null, ss_number_enc = null,
         ss_number_hint = null, iban_enc = null, iban_hint = null, health_enc = null, health_legal_basis = null,
         birth_date = null, nationality = null, phone = null, email = null, address = null, postal_code = null,
         city = null, province_code = null, source_ref = null, main_profile_id = null, experience_years = null,
         has_car = null, other_licenses_text = null, experiences = '[]', education = '[]', shifts = '{}',
         availability = null, available_from = null, max_distance_km = null, availability_notes = null,
         status = 'discarded', anonymized_at = now(), anonymized_by = v_me, anonymization_reason = p_reason
   where tenant_id = p_tenant_id and id = p_candidate_id;
  perform set_config('tramitnow.anonymizing', '', true);

  -- Historial: sin los valores que había (se queda quién y cuándo).
  update public.activity_log set changes = '{}'::jsonb
  where tenant_id = p_tenant_id
    and ((entity_type = 'candidate' and entity_id = p_candidate_id) or (parent_type = 'candidate' and parent_id = p_candidate_id));

  perform private.log_access('anonymize', p_candidate_id, jsonb_build_object('reason', p_reason));
end;
$$;

grant execute on function private.anonymize_candidate(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Historial
-- ---------------------------------------------------------------------------
create or replace function private.activity_masked_columns()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['iban', 'swift_bic', 'document_number', 'tax_id', 'id_document_number_enc', 'id_document_fingerprint',
               'id_document_hint', 'ss_number_enc', 'ss_number_hint', 'iban_enc', 'iban_hint', 'health_enc']
$$;

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
    else p_entity_type
  end
$$;

create trigger trg_candidates_activity after insert or update on public.candidates
  for each row execute function private.log_activity('candidate', 'code', '', '');
create trigger trg_applications_activity after insert or update on public.applications
  for each row execute function private.log_activity('application', '', 'candidate', 'candidate_id');

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
    else false
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privilegios y RLS
-- ---------------------------------------------------------------------------
revoke all on table public.candidates, public.candidate_attributes, public.privacy_notices, public.candidate_consents,
  public.applications, public.access_log from anon;
revoke delete, truncate, references, trigger on table public.candidates, public.applications, public.candidate_consents
  from authenticated;
revoke update, delete, truncate, references, trigger on table public.privacy_notices from authenticated;
revoke truncate, references, trigger on table public.candidate_attributes from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.access_log from authenticated;

alter table public.candidates enable row level security;
alter table public.candidate_attributes enable row level security;
alter table public.privacy_notices enable row level security;
alter table public.candidate_consents enable row level security;
alter table public.applications enable row level security;
alter table public.access_log enable row level security;

create policy candidates_select on public.candidates for select to authenticated
using (((select private.is_superadmin()) or tenant_id = (select private.current_tenant_id())) and (select private.candidate_visible()));
create policy candidates_insert on public.candidates for insert to authenticated
with check (private.candidate_writable(tenant_id));
create policy candidates_update on public.candidates for update to authenticated
using (private.candidate_writable(tenant_id)) with check (private.candidate_writable(tenant_id));

create policy candidate_attributes_select on public.candidate_attributes for select to authenticated
using (exists (select 1 from public.candidates c where c.tenant_id = candidate_attributes.tenant_id and c.id = candidate_attributes.candidate_id));
create policy candidate_attributes_write on public.candidate_attributes for all to authenticated
using (private.candidate_writable(tenant_id)) with check (private.candidate_writable(tenant_id));

create policy privacy_notices_select on public.privacy_notices for select to authenticated
using ((select private.is_superadmin()) or tenant_id = (select private.current_tenant_id()));
create policy privacy_notices_insert on public.privacy_notices for insert to authenticated
with check ((select private.is_superadmin()) or (tenant_id = (select private.current_tenant_id())
                                                 and (select private.has_permission('privacy.manage'))));

create policy candidate_consents_select on public.candidate_consents for select to authenticated
using (exists (select 1 from public.candidates c where c.tenant_id = candidate_consents.tenant_id and c.id = candidate_consents.candidate_id));
create policy candidate_consents_insert on public.candidate_consents for insert to authenticated
with check (private.candidate_writable(tenant_id));
create policy candidate_consents_update on public.candidate_consents for update to authenticated
using (private.candidate_writable(tenant_id)) with check (private.candidate_writable(tenant_id));

create policy applications_select on public.applications for select to authenticated
using (exists (select 1 from public.candidates c where c.tenant_id = applications.tenant_id and c.id = applications.candidate_id)
       or exists (select 1 from public.requests r where r.tenant_id = applications.tenant_id and r.id = applications.request_id));
create policy applications_insert on public.applications for insert to authenticated
with check (private.candidate_writable(tenant_id) or private.request_writable(tenant_id, request_id));
create policy applications_update on public.applications for update to authenticated
using (private.candidate_writable(tenant_id) or private.request_writable(tenant_id, request_id))
with check (private.candidate_writable(tenant_id) or private.request_writable(tenant_id, request_id));

create policy access_log_select on public.access_log for select to authenticated
using ((select private.is_superadmin())
       or (tenant_id = (select private.current_tenant_id()) and (select private.has_permission('privacy.audit'))));
