-- Mi ETT: lo que la pantalla tenía en «Disponible próximamente».
--
--   company_legal_profiles   datos legales de cada sociedad (cada sociedad es una ETT con su autorización): forma
--                            jurídica, autorización administrativa, registro mercantil, representante legal, mutua,
--                            garantía financiera y metadatos del certificado digital (NUNCA el fichero ni la clave).
--   company_billing_settings facturación emisora de cada sociedad: IBAN, forma de pago, IVA, retención, moneda...
--   contribution_accounts    códigos de cuenta de cotización (CCC) por sociedad, sucursal y tipo de personal.
--   billable_services        servicios que factura la ETT además de las horas (selección, formación...).
--   tenants                  margen mínimo de presupuesto y días sin respuesta para avisar (fase 4).
--   number_series            la ETT configura prefijo, cifras y número de inicio; clase nueva credit_note
--                            (facturas rectificativas).
--   memberships              departamento e invitación (quién y cuándo). El alta la hace la API con la service_role
--                            de Supabase Auth; aquí solo las funciones que la API necesita para leer auth.users.
--
-- Leer: cualquier miembro de la ETT (el representante, la autorización y el IBAN salen en CPD, contratos y facturas).
-- Escribir: tenant.manage (rol admin de serie).

-- ---------------------------------------------------------------------------
-- Datos legales de cada sociedad
-- ---------------------------------------------------------------------------
create table public.company_legal_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  company_id uuid not null,
  trade_name varchar(200),
  legal_form varchar(80),
  -- Clase CNAE-2009 de la actividad (7820 en una ETT).
  cnae_code varchar(4) check (cnae_code ~ '^[0-9]{4}$'),
  -- Convenio del personal de estructura de la ETT.
  staff_agreement_id uuid,
  -- Autorización administrativa de ETT (Ley 14/1994): número, fecha y ámbito (estatal o una comunidad autónoma).
  ett_authorization_number varchar(40),
  ett_authorization_date date,
  ett_authorization_scope varchar(20) check (ett_authorization_scope in ('state', 'regional')),
  ett_authorization_community_code char(2) references public.autonomous_communities (code),
  commercial_registry varchar(120),
  registry_volume varchar(20),
  registry_folio varchar(20),
  registry_sheet varchar(40),
  registry_entry varchar(20),
  -- Representante legal: firma contratos y CPD (salen su nombre, cargo y documento).
  legal_rep_name varchar(160),
  legal_rep_id_type varchar(10) check (legal_rep_id_type in ('dni', 'nie', 'passport')),
  legal_rep_id_number varchar(20),
  legal_rep_position varchar(120),
  mutual_insurer varchar(160),
  prevention_service varchar(200),
  -- Número de autorización del Sistema RED.
  red_authorization varchar(20),
  -- Garantía financiera obligatoria de las ETT (se renueva cada año).
  guarantee_type varchar(30) check (guarantee_type in ('bank_guarantee', 'surety_insurance', 'cash_deposit', 'other')),
  guarantee_entity varchar(160),
  guarantee_amount numeric(14, 2) check (guarantee_amount >= 0),
  guarantee_expires_on date,
  -- Certificado digital de empresa: SOLO metadatos. El fichero y su contraseña no se guardan nunca en TramitNOW.
  certificate_holder varchar(200),
  certificate_issuer varchar(120),
  certificate_expires_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, company_id),
  foreign key (tenant_id, company_id) references public.companies (tenant_id, id) on delete cascade,
  foreign key (tenant_id, staff_agreement_id) references public.collective_agreements (tenant_id, id)
    on delete set null (staff_agreement_id),
  check (
    ett_authorization_scope is null
    or (ett_authorization_scope = 'state' and ett_authorization_community_code is null)
    or (ett_authorization_scope = 'regional' and ett_authorization_community_code is not null)
  ),
  check (legal_rep_id_number is null or legal_rep_id_type is not null)
);

comment on table public.company_legal_profiles is
  'Datos legales de una sociedad de la ETT (1:1). Del certificado digital solo metadatos: nunca el fichero ni la clave.';

-- ---------------------------------------------------------------------------
-- Facturación emisora de cada sociedad
-- ---------------------------------------------------------------------------
create table public.company_billing_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  company_id uuid not null,
  iban varchar(34) check (iban ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$'),
  swift_bic varchar(11) check (swift_bic ~ '^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$'),
  -- Forma de pago por defecto en las facturas (tabla maestra payment_method).
  payment_method_id uuid,
  payment_terms varchar(200),
  vat_rate numeric(5, 2) not null default 21 check (vat_rate between 0 and 100),
  withholding_rate numeric(5, 2) not null default 0 check (withholding_rate between 0 and 100),
  currency char(3) not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  billing_email varchar(200),
  -- NULL: la dirección fiscal de la sociedad.
  billing_address_id uuid,
  -- Facturación centralizada en la sociedad o por sucursal (series y datos de cada una).
  branch_mode varchar(20) not null default 'centralized' check (branch_mode in ('centralized', 'per_branch')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, company_id),
  foreign key (tenant_id, company_id) references public.companies (tenant_id, id) on delete cascade,
  foreign key (tenant_id, payment_method_id) references public.catalog_items (tenant_id, id) on delete set null (payment_method_id),
  foreign key (tenant_id, billing_address_id) references public.addresses (tenant_id, id) on delete set null (billing_address_id)
);

comment on table public.company_billing_settings is 'Facturación emisora de una sociedad de la ETT (1:1).';

-- ---------------------------------------------------------------------------
-- Códigos de cuenta de cotización
-- ---------------------------------------------------------------------------
-- CCC: 2 cifras de provincia, 7 de número y 2 de control = (provincia + número) mod 97.
create or replace function private.valid_ccc(p_code text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_code ~ '^[0-9]{11}$' and (left(p_code, 9)::bigint % 97) = right(p_code, 2)::int
$$;

create table public.contribution_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  company_id uuid not null,
  branch_id uuid,
  code char(11) not null check (private.valid_ccc(code)),
  province_code char(2) generated always as (left(code, 2)) stored references public.provinces (code),
  -- Personas en misión o personal de estructura.
  staff_type varchar(20) not null check (staff_type in ('mission', 'structure')),
  status varchar(20) not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, id),
  foreign key (tenant_id, company_id) references public.companies (tenant_id, id) on delete cascade,
  foreign key (tenant_id, company_id, branch_id) references public.branches (tenant_id, company_id, id) on delete cascade
);

create unique index contribution_accounts_tenant_code_uniq on public.contribution_accounts (tenant_id, code) where deleted_at is null;
create index contribution_accounts_tenant_company_branch_idx on public.contribution_accounts (tenant_id, company_id, branch_id);

comment on table public.contribution_accounts is
  'Códigos de cuenta de cotización (CCC) de la ETT: uno por provincia y tipo de personal, opcionalmente por sucursal.';

-- ---------------------------------------------------------------------------
-- Servicios que factura la ETT
-- ---------------------------------------------------------------------------
create table public.billable_services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  code varchar(30) not null,
  name varchar(160) not null,
  -- % del salario bruto anual, por persona, por unidad o importe fijo.
  charge_mode varchar(20) not null check (charge_mode in ('percentage', 'per_person', 'per_unit', 'fixed')),
  -- Porcentaje (si charge_mode = percentage) o precio por defecto. Los de serie empiezan a 0: los pone la ETT.
  default_value numeric(12, 4) not null default 0 check (default_value >= 0),
  -- Cómo se cuenta: proceso, persona, nómina, km...
  unit varchar(30) not null,
  status varchar(20) not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, id),
  check (charge_mode <> 'percentage' or default_value <= 100)
);

create unique index billable_services_tenant_code_uniq on public.billable_services (tenant_id, code) where deleted_at is null;

comment on table public.billable_services is 'Servicios que factura la ETT además de las horas (selección, formación PRL...).';

create or replace function private.billable_service_defaults()
returns table (code varchar, name varchar, charge_mode varchar, default_value numeric, unit varchar)
language sql
immutable
set search_path = ''
as $$
  values
    ('seleccion'::varchar, 'Selección de personal'::varchar, 'percentage'::varchar, 0::numeric, 'proceso'::varchar),
    ('formacion_prl', 'Formación PRL', 'per_person', 0, 'persona'),
    ('reconocimiento', 'Reconocimiento médico', 'per_person', 0, 'persona'),
    ('nominas', 'Gestión de nóminas', 'per_unit', 0, 'nómina'),
    ('desplazamiento', 'Desplazamientos', 'per_unit', 0, 'km')
$$;

create or replace function private.seed_tenant_billable_services()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.billable_services (tenant_id, code, name, charge_mode, default_value, unit)
  select new.id, d.code, d.name, d.charge_mode, d.default_value, d.unit from private.billable_service_defaults() d;
  return new;
end;
$$;

create trigger trg_tenants_seed_billable_services after insert on public.tenants
  for each row execute function private.seed_tenant_billable_services();

insert into public.billable_services (tenant_id, code, name, charge_mode, default_value, unit)
select t.id, d.code, d.name, d.charge_mode, d.default_value, d.unit
from public.tenants t cross join private.billable_service_defaults() d
where not exists (
  select 1 from public.billable_services s where s.tenant_id = t.id and s.code = d.code and s.deleted_at is null
);

-- ---------------------------------------------------------------------------
-- Ajustes de presupuestos de la ETT (decisiones de la fase 4)
-- ---------------------------------------------------------------------------
alter table public.tenants
  add column quote_min_margin_percent numeric(6, 2) check (quote_min_margin_percent between -100 and 1000),
  add column quote_no_response_days smallint not null default 15 check (quote_no_response_days between 1 and 365);

comment on column public.tenants.quote_min_margin_percent is
  'Margen mínimo de un presupuesto, en %. NULL: sin mínimo. Por debajo, el presupuesto pide aprobación (fase 4).';
comment on column public.tenants.quote_no_response_days is
  'Días sin respuesta del cliente tras enviar un presupuesto para avisar al comercial (fase 4).';

-- ---------------------------------------------------------------------------
-- Series: rectificativas y configuración por la ETT
-- ---------------------------------------------------------------------------
alter table public.number_series drop constraint number_series_document_kind_check;
alter table public.number_series add constraint number_series_document_kind_check
  check (document_kind in ('quote', 'request', 'invoice', 'credit_note'));

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
                           when 'credit_note' then 'REC' end || p_year || '-'
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

-- La ETT (tenant.manage) crea series y cambia prefijo, cifras y por dónde sigue la numeración (p. ej. al venir de otro
-- programa), pero nunca hacia atrás: eso repetiría números ya usados.
create or replace function private.number_series_manual_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.last_number < old.last_number then
    raise exception 'La numeración no puede ir hacia atrás: ya se han usado números hasta el %', old.last_number
      using errcode = 'TN409';
  end if;
  if tg_op = 'UPDATE' and (new.document_kind, new.company_id, new.branch_id, new.year)
     is distinct from (old.document_kind, old.company_id, old.branch_id, old.year) then
    raise exception 'La clase, el ámbito y el año de una serie no cambian: crea otra' using errcode = 'TN409';
  end if;
  return new;
end;
$$;

create trigger trg_number_series_manual_rules before update on public.number_series
  for each row execute function private.number_series_manual_rules();

grant insert, update on table public.number_series to authenticated;

create policy number_series_insert on public.number_series for insert to authenticated
  with check (
    (select private.is_superadmin())
    or (tenant_id = (select private.current_tenant_id()) and (select private.has_permission('tenant.manage')))
  );
create policy number_series_update on public.number_series for update to authenticated
  using (
    (select private.is_superadmin())
    or (tenant_id = (select private.current_tenant_id()) and (select private.has_permission('tenant.manage')))
  )
  with check (
    (select private.is_superadmin())
    or (tenant_id = (select private.current_tenant_id()) and (select private.has_permission('tenant.manage')))
  );

-- ---------------------------------------------------------------------------
-- updated_at y RLS de las tablas nuevas
-- ---------------------------------------------------------------------------
create trigger trg_company_legal_profiles_updated_at before update on public.company_legal_profiles
  for each row execute function private.touch_updated_at();
create trigger trg_company_billing_settings_updated_at before update on public.company_billing_settings
  for each row execute function private.touch_updated_at();
create trigger trg_contribution_accounts_updated_at before update on public.contribution_accounts
  for each row execute function private.touch_updated_at();
create trigger trg_billable_services_updated_at before update on public.billable_services
  for each row execute function private.touch_updated_at();

do $$
declare
  tbl text;
begin
  foreach tbl in array array['company_legal_profiles', 'company_billing_settings', 'contribution_accounts', 'billable_services'] loop
    execute format('revoke all on table public.%I from anon', tbl);
    execute format('revoke truncate, references, trigger on table public.%I from authenticated', tbl);
    execute format('alter table public.%I enable row level security', tbl);
    execute format($p$
      create policy %1$I on public.%2$I for select to authenticated
      using ((select private.is_superadmin()) or tenant_id = (select private.current_tenant_id()))
    $p$, tbl || '_select', tbl);
    execute format($p$
      create policy %1$I on public.%2$I for insert to authenticated
      with check (
        (select private.is_superadmin())
        or (tenant_id = (select private.current_tenant_id()) and (select private.has_permission('tenant.manage')))
      )
    $p$, tbl || '_insert', tbl);
    execute format($p$
      create policy %1$I on public.%2$I for update to authenticated
      using (
        (select private.is_superadmin())
        or (tenant_id = (select private.current_tenant_id()) and (select private.has_permission('tenant.manage')))
      )
      with check (
        (select private.is_superadmin())
        or (tenant_id = (select private.current_tenant_id()) and (select private.has_permission('tenant.manage')))
      )
    $p$, tbl || '_update', tbl);
    execute format($p$
      create policy %1$I on public.%2$I for delete to authenticated
      using (
        (select private.is_superadmin())
        or (tenant_id = (select private.current_tenant_id()) and (select private.has_permission('tenant.manage')))
      )
    $p$, tbl || '_delete', tbl);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Usuarios: departamento e invitación
-- ---------------------------------------------------------------------------
alter table public.memberships
  add column department varchar(80),
  add column invited_at timestamptz,
  add column invited_by uuid references auth.users (id) on delete set null;

-- ¿Puede quien llama gestionar los usuarios de esta ETT?
create or replace function private.can_manage_users(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_superadmin()
      or (p_tenant_id = private.current_tenant_id() and private.has_permission('users.manage'))
$$;

-- Email, último acceso e invitación pendiente de los usuarios de la ETT (están en auth.users, que la API no lee).
create or replace function private.membership_auth_info(p_tenant_id uuid)
returns table (membership_id uuid, email text, last_sign_in_at timestamptz, invitation_pending boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, u.email::text, u.last_sign_in_at,
         (u.email_confirmed_at is null and u.last_sign_in_at is null)
  from public.memberships m
  join auth.users u on u.id = m.user_id
  where m.tenant_id = p_tenant_id and private.can_manage_users(p_tenant_id)
$$;

-- Usuario de Auth con este email (para invitar a alguien que ya tiene cuenta, p. ej. en otra ETT).
create or replace function private.find_auth_user(p_tenant_id uuid, p_email text)
returns table (user_id uuid, confirmed boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, (u.email_confirmed_at is not null or u.last_sign_in_at is not null)
  from auth.users u
  where lower(u.email) = lower(p_email) and private.can_manage_users(p_tenant_id)
$$;

-- Al revocar una invitación: ¿se puede borrar también el usuario de Auth? Solo si nunca entró, no está en ninguna otra
-- ETT y no es del equipo de TramitNOW.
create or replace function private.invited_user_removable(p_tenant_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_manage_users(p_tenant_id)
     and exists (select 1 from auth.users u where u.id = p_user_id and u.email_confirmed_at is null and u.last_sign_in_at is null)
     and not exists (select 1 from public.memberships m where m.user_id = p_user_id and m.tenant_id <> p_tenant_id)
     and not exists (select 1 from public.platform_admins a where a.user_id = p_user_id)
     and not exists (select 1 from public.platform_content_editors e where e.user_id = p_user_id)
$$;

revoke execute on function private.membership_auth_info(uuid), private.find_auth_user(uuid, text),
  private.invited_user_removable(uuid, uuid), private.can_manage_users(uuid) from public;
grant execute on function private.membership_auth_info(uuid), private.find_auth_user(uuid, text),
  private.invited_user_removable(uuid, uuid), private.can_manage_users(uuid) to authenticated, service_role;
