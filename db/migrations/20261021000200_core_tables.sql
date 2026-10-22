-- Núcleo de la ETT: tenants, catálogos, direcciones, empresas y sucursales.
--
-- Reglas para todas las tablas de negocio (ver db/README.md):
--   - `tenant_id` obligatorio y UNIQUE (tenant_id, id) para que otras tablas referencien con FK compuesta.
--   - Las FK entre tablas de negocio son compuestas (tenant_id, x_id): una fila nunca puede apuntar a otra ETT.
--   - ON DELETE SET NULL (columna) solo pone a NULL la columna de la referencia, nunca tenant_id.
--   - Índices y unicidades empiezan por tenant_id; las unicidades ignoran las filas borradas (deleted_at).

-- ---------------------------------------------------------------------------
-- tenants: cada ETT cliente de la plataforma.
-- ---------------------------------------------------------------------------
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  code varchar(30) not null,
  legal_name varchar(200) not null,
  trade_name varchar(200),
  tax_id varchar(30),
  status varchar(20) not null default 'active' check (status in ('active', 'inactive')),
  default_locale varchar(10) not null default 'es-ES',
  timezone varchar(80) not null default 'Europe/Madrid',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index tenants_code_uniq on public.tenants (code);
create unique index tenants_tax_id_uniq on public.tenants (tax_id) where tax_id is not null;

comment on table public.tenants is 'ETT clientes de la plataforma. Solo el superadmin crea o borra filas.';

-- ---------------------------------------------------------------------------
-- catalog_items: catálogos simples por ETT (provincias, tipos de documento, zonas...).
-- ---------------------------------------------------------------------------
create table public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  catalog varchar(80) not null,
  code varchar(50) not null,
  name varchar(180) not null,
  parent_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  status varchar(20) not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, id),
  foreign key (tenant_id, parent_id) references public.catalog_items (tenant_id, id) on delete set null (parent_id)
);

create unique index catalog_items_tenant_catalog_code_uniq
  on public.catalog_items (tenant_id, catalog, code) where deleted_at is null;
create index catalog_items_tenant_parent_idx on public.catalog_items (tenant_id, parent_id);

-- ---------------------------------------------------------------------------
-- addresses: direcciones reutilizables (empresas, sucursales y, más adelante, clientes y candidatos).
-- ---------------------------------------------------------------------------
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  street_type varchar(20),
  street varchar(200),
  number varchar(20),
  door varchar(20),
  postal_code varchar(20),
  city varchar(120),
  municipality_id uuid,
  province_id uuid,
  country_id uuid,
  geo_zone_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, id),
  foreign key (tenant_id, municipality_id) references public.catalog_items (tenant_id, id) on delete set null (municipality_id),
  foreign key (tenant_id, province_id) references public.catalog_items (tenant_id, id) on delete set null (province_id),
  foreign key (tenant_id, country_id) references public.catalog_items (tenant_id, id) on delete set null (country_id),
  foreign key (tenant_id, geo_zone_id) references public.catalog_items (tenant_id, id) on delete set null (geo_zone_id)
);

create index addresses_tenant_location_idx on public.addresses (tenant_id, country_id, province_id);
create index addresses_tenant_municipality_idx on public.addresses (tenant_id, municipality_id);
create index addresses_tenant_geo_zone_idx on public.addresses (tenant_id, geo_zone_id);

-- ---------------------------------------------------------------------------
-- companies: sociedades de la ETT (la propia ETT, de servicios, merchandising...).
-- La configuración de prevención (prevention_configurations) se añadirá con su pantalla.
-- ---------------------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  code varchar(30) not null,
  name varchar(200) not null,
  tax_id_type_id uuid,
  tax_id varchar(30),
  status varchar(20) not null default 'active' check (status in ('active', 'inactive')),
  company_type varchar(30) not null default 'ett'
    check (company_type in ('ett', 'services', 'merchandising', 'other')),
  phone varchar(40),
  fax varchar(40),
  email varchar(200),
  website varchar(250),
  sms_sender_name varchar(120),
  worker_communications_cc_email varchar(200),
  address_id uuid,
  postal_address_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, id),
  foreign key (tenant_id, tax_id_type_id) references public.catalog_items (tenant_id, id) on delete set null (tax_id_type_id),
  foreign key (tenant_id, address_id) references public.addresses (tenant_id, id) on delete set null (address_id),
  foreign key (tenant_id, postal_address_id) references public.addresses (tenant_id, id) on delete set null (postal_address_id)
);

create unique index companies_tenant_code_uniq on public.companies (tenant_id, code) where deleted_at is null;
create index companies_tenant_tax_id_idx on public.companies (tenant_id, tax_id);
create index companies_tenant_address_idx on public.companies (tenant_id, address_id);
create index companies_tenant_postal_address_idx on public.companies (tenant_id, postal_address_id);
create index companies_tenant_tax_id_type_idx on public.companies (tenant_id, tax_id_type_id);

-- ---------------------------------------------------------------------------
-- branches: sucursales de una sociedad.
-- ---------------------------------------------------------------------------
create table public.branches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  company_id uuid not null,
  code varchar(30) not null,
  name varchar(160) not null,
  address_id uuid,
  phone varchar(40),
  email varchar(200),
  is_default boolean not null default false,
  status varchar(20) not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, id),
  -- Permite exigir en otras tablas que la sucursal sea de la sociedad indicada.
  unique (tenant_id, company_id, id),
  foreign key (tenant_id, company_id) references public.companies (tenant_id, id) on delete cascade,
  foreign key (tenant_id, address_id) references public.addresses (tenant_id, id) on delete set null (address_id)
);

create unique index branches_tenant_company_code_uniq
  on public.branches (tenant_id, company_id, code) where deleted_at is null;
create unique index branches_tenant_company_default_uniq
  on public.branches (tenant_id, company_id) where is_default and deleted_at is null;
create index branches_tenant_address_idx on public.branches (tenant_id, address_id);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create trigger trg_tenants_updated_at before update on public.tenants
  for each row execute function private.touch_updated_at();
create trigger trg_catalog_items_updated_at before update on public.catalog_items
  for each row execute function private.touch_updated_at();
create trigger trg_addresses_updated_at before update on public.addresses
  for each row execute function private.touch_updated_at();
create trigger trg_companies_updated_at before update on public.companies
  for each row execute function private.touch_updated_at();
create trigger trg_branches_updated_at before update on public.branches
  for each row execute function private.touch_updated_at();
