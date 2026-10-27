-- Catálogos laborales de cada ETT (módulo 1): lo que cada ETT configura a su manera.
--
--   collective_agreements    convenios colectivos que aplica la ETT
--   professional_categories  categorías profesionales / puestos ("Categorías TTI-SRV" del programa anterior)
--   contract_types           tipos de contrato propios, ligados a una clave oficial (contract_keys)
--   payroll_concepts         conceptos de nómina y de coste (hora normal, pluses, SS empresa, EPIs...)
--
-- Siguen las reglas de tablas nuevas de db/README.md. Se editan con el permiso nuevo
-- `labor_catalogs.manage` (roles admin y laboral de serie); cualquier miembro de la ETT los lee, porque
-- comercial y selección los usan en presupuestos y peticiones.
--
-- Los presupuestos, peticiones y contratos que usen estos catálogos deberán copiar los importes y
-- descripciones que necesiten conservar (ver "Histórico de precios" en docs/modelo-backend.md): editar un
-- concepto o un convenio no debe cambiar un presupuesto ya enviado.

-- ---------------------------------------------------------------------------
-- collective_agreements
-- ---------------------------------------------------------------------------
create table public.collective_agreements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  code varchar(30) not null,
  name varchar(250) not null,
  -- Código del convenio en el REGCON (registro de convenios colectivos), 14 dígitos. Opcional.
  official_code varchar(14) check (official_code ~ '^[0-9]{14}$'),
  scope varchar(20) not null default 'provincial'
    check (scope in ('state', 'regional', 'provincial', 'local', 'company', 'other')),
  -- Ámbito territorial, si lo tiene: comunidad autónoma (convenio autonómico) o provincia (provincial).
  autonomous_community_code char(2) references public.autonomous_communities (code),
  province_code char(2) references public.provinces (code),
  valid_from date,
  valid_to date,
  notes text,
  status varchar(20) not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, id),
  check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create unique index collective_agreements_tenant_code_uniq
  on public.collective_agreements (tenant_id, code) where deleted_at is null;
create index collective_agreements_tenant_province_idx on public.collective_agreements (tenant_id, province_code);
create index collective_agreements_tenant_official_code_idx on public.collective_agreements (tenant_id, official_code);

comment on table public.collective_agreements is
  'Convenios colectivos que aplica la ETT (cliente, nómina, GRDA...). Por ETT.';

-- ---------------------------------------------------------------------------
-- professional_categories
-- Ámbito: toda la ETT, una sociedad o una sucursal (company_id / branch_id NULL = más amplio).
-- El ámbito por cliente (client_id) se añadirá con el módulo de clientes.
-- ---------------------------------------------------------------------------
create table public.professional_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  code varchar(30) not null,
  name varchar(200) not null,
  kind varchar(20) not null default 'position' check (kind in ('position', 'category')),
  agreement_id uuid,
  -- Grupo o nivel profesional según el convenio ("Grupo IV", "Nivel III"...).
  agreement_level varchar(60),
  -- Ocupación CNO-11 (4 dígitos). Pasará a ser FK cuando exista el catálogo global de ocupaciones.
  cno_code char(4) check (cno_code ~ '^[0-9]{4}$'),
  -- Grupo de cotización a la Seguridad Social (1 a 11), para el alta en afiliación.
  contribution_group smallint check (contribution_group between 1 and 11),
  statistical_code varchar(30),
  company_id uuid,
  branch_id uuid,
  status varchar(20) not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, id),
  foreign key (tenant_id, agreement_id) references public.collective_agreements (tenant_id, id) on delete set null (agreement_id),
  foreign key (tenant_id, company_id) references public.companies (tenant_id, id) on delete cascade,
  -- La sucursal tiene que ser de la sociedad indicada.
  foreign key (tenant_id, company_id, branch_id) references public.branches (tenant_id, company_id, id) on delete cascade,
  check (branch_id is null or company_id is not null)
);

create unique index professional_categories_scope_code_uniq
  on public.professional_categories (tenant_id, company_id, branch_id, code) nulls not distinct
  where deleted_at is null;
create index professional_categories_tenant_agreement_idx on public.professional_categories (tenant_id, agreement_id);
create index professional_categories_tenant_company_branch_idx
  on public.professional_categories (tenant_id, company_id, branch_id);
create index professional_categories_tenant_cno_idx on public.professional_categories (tenant_id, cno_code);

comment on table public.professional_categories is
  'Categorías profesionales y puestos de la ETT ("Categorías TTI-SRV"). Por ETT; opcionalmente por sociedad o sucursal.';

-- ---------------------------------------------------------------------------
-- contract_types: tipos de contrato propios de la ETT. La duración y la jornada salen de la clave oficial.
-- ---------------------------------------------------------------------------
create table public.contract_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  code varchar(10) not null,
  name varchar(200) not null,
  -- Clave oficial TGSS-SEPE que se comunica en Contrat@ y en la afiliación.
  contract_key_code char(3) not null references public.contract_keys (code),
  contribution_mode varchar(20) not null default 'percentages'
    check (contribution_mode in ('percentages', 'fixed_amounts')),
  status varchar(20) not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, id)
);

create unique index contract_types_tenant_code_uniq on public.contract_types (tenant_id, code) where deleted_at is null;
create index contract_types_tenant_key_idx on public.contract_types (tenant_id, contract_key_code);

comment on table public.contract_types is
  'Tipos de contrato de la ETT, cada uno ligado a una clave oficial (contract_keys). Al crear la ETT se crea uno por clave activa.';
comment on column public.contract_types.contribution_mode is
  'Cotización: por porcentajes (lo normal) o por importes fijos.';

-- ---------------------------------------------------------------------------
-- payroll_concepts: conceptos de nómina y de coste que usan presupuestos, peticiones y nóminas.
-- ---------------------------------------------------------------------------
create table public.payroll_concepts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  code varchar(30) not null,
  name varchar(200) not null,
  description text,
  concept_type varchar(30) not null default 'other'
    check (concept_type in ('normal_hour', 'overtime', 'salary_supplement', 'allowance', 'employer_cost', 'discount', 'other')),
  -- Cómo se calcula por defecto (el valor se puede cambiar en cada presupuesto o petición).
  calculation varchar(20) not null default 'fixed_hour'
    check (calculation in ('percentage', 'fixed_hour', 'fixed_day', 'fixed_month', 'fixed')),
  default_value numeric(12, 4),
  -- Base sobre la que se aplica un porcentaje.
  calculation_base varchar(30)
    check (calculation_base in ('gross_hourly_salary', 'total_salary_cost', 'contribution_base', 'hourly_rate', 'effective_hours')),
  -- Salarial (cotiza y tributa como salario) o extrasalarial (dietas, plus transporte...).
  is_salary boolean not null default true,
  -- Obligatorio por ley (SS empresa, indemnización fin de contrato...): no se puede quitar de un presupuesto.
  is_mandatory boolean not null default false,
  print_on_offer boolean not null default false,
  print_on_invoice_cpd boolean not null default false,
  print_on_salary_cpd boolean not null default false,
  print_on_contract boolean not null default false,
  status varchar(20) not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, id),
  check ((calculation = 'percentage') = (calculation_base is not null))
);

create unique index payroll_concepts_tenant_code_uniq on public.payroll_concepts (tenant_id, code) where deleted_at is null;
create index payroll_concepts_tenant_type_idx on public.payroll_concepts (tenant_id, concept_type);

comment on table public.payroll_concepts is
  'Conceptos de nómina y de coste de la ETT (hora normal, pluses, SS empresa, EPIs...). Por ETT.';

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create trigger trg_collective_agreements_updated_at before update on public.collective_agreements
  for each row execute function private.touch_updated_at();
create trigger trg_professional_categories_updated_at before update on public.professional_categories
  for each row execute function private.touch_updated_at();
create trigger trg_contract_types_updated_at before update on public.contract_types
  for each row execute function private.touch_updated_at();
create trigger trg_payroll_concepts_updated_at before update on public.payroll_concepts
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Permiso nuevo: labor_catalogs.manage, para admin y laboral (de serie y en las ETT ya existentes).
-- ---------------------------------------------------------------------------
insert into public.permissions (code, module, description) values
  ('labor_catalogs.manage', 'laboral', 'Editar convenios, categorías profesionales, tipos de contrato y conceptos de nómina');

insert into public.role_permissions (tenant_id, role_id, permission_code)
select r.tenant_id, r.id, 'labor_catalogs.manage'
from public.roles r
where r.is_system and r.code in ('admin', 'laboral') and r.deleted_at is null
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
    ('laboral', 'module.laboral'), ('laboral', 'addresses.write'), ('laboral', 'labor_catalogs.manage'),
    ('director_zona', 'module.laboral'), ('director_zona', 'module.seleccion'),
    ('director_zona', 'module.comercial'), ('director_zona', 'addresses.write'),
    ('seleccion', 'module.seleccion'), ('seleccion', 'addresses.write'),
    ('comercial', 'module.comercial'), ('comercial', 'addresses.write')
  ) as p (role_code, permission_code) on p.role_code = r.code
  where r.tenant_id = new.id;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tipos de contrato de serie: uno por clave oficial activa, con el mismo código.
-- La ETT los renombra, desactiva o añade otros (por ejemplo, dos tipos internos con la misma clave).
-- ---------------------------------------------------------------------------
create or replace function private.seed_tenant_contract_types()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.contract_types (tenant_id, code, name, contract_key_code)
  select new.id, k.code, k.name, k.code
  from public.contract_keys k
  where k.active;
  return new;
end;
$$;

create trigger trg_tenants_seed_contract_types after insert on public.tenants
  for each row execute function private.seed_tenant_contract_types();

insert into public.contract_types (tenant_id, code, name, contract_key_code)
select t.id, k.code, k.name, k.code
from public.tenants t
cross join public.contract_keys k
where k.active
  and not exists (select 1 from public.contract_types ct where ct.tenant_id = t.id and ct.deleted_at is null);

-- ---------------------------------------------------------------------------
-- Privilegios y RLS: leer, la ETT activa; escribir, además con labor_catalogs.manage.
-- ---------------------------------------------------------------------------
revoke all on table
  public.collective_agreements, public.professional_categories, public.contract_types, public.payroll_concepts
from anon;

revoke truncate, references, trigger on table
  public.collective_agreements, public.professional_categories, public.contract_types, public.payroll_concepts
from authenticated;

alter table public.collective_agreements enable row level security;
alter table public.professional_categories enable row level security;
alter table public.contract_types enable row level security;
alter table public.payroll_concepts enable row level security;

do $$
declare
  tbl text;
begin
  foreach tbl in array array['collective_agreements', 'professional_categories', 'contract_types', 'payroll_concepts'] loop
    execute format($p$
      create policy %1$I on public.%2$I for select to authenticated
      using ((select private.is_superadmin()) or tenant_id = (select private.current_tenant_id()))
    $p$, tbl || '_select', tbl);

    execute format($p$
      create policy %1$I on public.%2$I for insert to authenticated
      with check (
        (select private.is_superadmin())
        or (tenant_id = (select private.current_tenant_id()) and (select private.has_permission('labor_catalogs.manage')))
      )
    $p$, tbl || '_insert', tbl);

    execute format($p$
      create policy %1$I on public.%2$I for update to authenticated
      using (
        (select private.is_superadmin())
        or (tenant_id = (select private.current_tenant_id()) and (select private.has_permission('labor_catalogs.manage')))
      )
      with check (
        (select private.is_superadmin())
        or (tenant_id = (select private.current_tenant_id()) and (select private.has_permission('labor_catalogs.manage')))
      )
    $p$, tbl || '_update', tbl);

    execute format($p$
      create policy %1$I on public.%2$I for delete to authenticated
      using (
        (select private.is_superadmin())
        or (tenant_id = (select private.current_tenant_id()) and (select private.has_permission('labor_catalogs.manage')))
      )
    $p$, tbl || '_delete', tbl);
  end loop;
end;
$$;
