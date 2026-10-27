-- Catálogos oficiales globales: comunes a todas las ETT, de solo lectura y gestionados por la plataforma.
--
--   autonomous_communities  comunidades y ciudades autónomas (INE)
--   provinces               provincias (INE)
--   municipalities          municipios (INE). Los datos se cargan con db/seeds/ine-municipios.sql
--   countries               países (ISO 3166-1)
--   contract_keys           claves de tipo de contrato (codificación unificada TGSS-SEPE, la de Contrat@)
--
-- Diferencias con las tablas de negocio (ver "Catálogos globales" en db/README.md):
--   - Sin tenant_id: los datos son los mismos para todas las ETT y no se copian por ETT.
--   - La clave primaria es el código oficial (texto), no un uuid: es estable, es lo que se intercambia con
--     SEPE/TGSS/INE y las tablas de las ETT lo referencian con una FK simple.
--   - Solo lectura para todos los usuarios autenticados (también el superadmin). Se cambian con una
--     migración o un seed que cite la fuente, nunca desde la aplicación.
--   - Sin deleted_at: lo que deja de estar vigente se marca con active = false, porque contratos y
--     direcciones antiguos lo siguen referenciando.

-- ---------------------------------------------------------------------------
-- autonomous_communities
-- ---------------------------------------------------------------------------
create table public.autonomous_communities (
  code char(2) primary key check (code ~ '^[0-9]{2}$'),
  name varchar(80) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.autonomous_communities is
  'Comunidades y ciudades autónomas. Código CODAUTO del INE. Global, solo lectura.';

-- ---------------------------------------------------------------------------
-- provinces
-- ---------------------------------------------------------------------------
create table public.provinces (
  code char(2) primary key check (code ~ '^[0-9]{2}$'),
  name varchar(80) not null,
  autonomous_community_code char(2) not null references public.autonomous_communities (code),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index provinces_community_idx on public.provinces (autonomous_community_code);

comment on table public.provinces is
  'Provincias. Código CPRO del INE (también los dos primeros dígitos del código postal). Global, solo lectura.';

-- ---------------------------------------------------------------------------
-- municipalities
-- ---------------------------------------------------------------------------
create table public.municipalities (
  -- CPRO + CMUN: los 5 dígitos que usan INE, SEPE y TGSS.
  code char(5) primary key check (code ~ '^[0-9]{5}$'),
  province_code char(2) not null references public.provinces (code),
  -- Dígito de control del INE (DC).
  check_digit char(1) not null check (check_digit ~ '^[0-9]$'),
  name varchar(120) not null,
  -- false: el municipio ya no figura en la relación del INE (fusión, segregación...).
  active boolean not null default true,
  -- Año de la última relación del INE (a 1 de enero) en la que figura.
  ine_year smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (left(code, 2) = province_code)
);

create index municipalities_province_idx on public.municipalities (province_code);
-- Búsqueda por nombre sin acentos ni mayúsculas la resolverá la API; de momento, por prefijo.
create index municipalities_name_idx on public.municipalities (lower(name) text_pattern_ops);

comment on table public.municipalities is
  'Municipios. Código INE de 5 dígitos (provincia + municipio). Global, solo lectura. Se carga con db/seeds/ine-municipios.sql.';

-- ---------------------------------------------------------------------------
-- countries
-- ---------------------------------------------------------------------------
create table public.countries (
  code char(2) primary key check (code ~ '^[A-Z]{2}$'),
  alpha3 char(3) not null unique check (alpha3 ~ '^[A-Z]{3}$'),
  numeric_code char(3) not null unique check (numeric_code ~ '^[0-9]{3}$'),
  name varchar(120) not null,
  -- Unión Europea y Espacio Económico Europeo (UE + Islandia, Liechtenstein y Noruega): las personas con
  -- estas nacionalidades no necesitan autorización de trabajo. Suiza tiene un acuerdo propio (no es EEE).
  eu_member boolean not null default false,
  eea_member boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not eu_member or eea_member)
);

comment on table public.countries is
  'Países. Código ISO 3166-1 alfa-2, con alfa-3 y numérico (el que usan SEPE y TGSS para la nacionalidad). Global, solo lectura.';

-- ---------------------------------------------------------------------------
-- contract_keys: claves oficiales de tipo de contrato.
-- Primera cifra: 1 indefinido TC, 2 indefinido TP, 3 fijo discontinuo, 4 temporal TC, 5 temporal TP.
-- ---------------------------------------------------------------------------
create table public.contract_keys (
  code char(3) primary key check (code ~ '^[1-5][0-9]{2}$'),
  name varchar(200) not null,
  duration varchar(20) not null check (duration in ('indefinite', 'temporary')),
  working_time varchar(20) not null check (working_time in ('full_time', 'part_time', 'fixed_discontinuous')),
  -- Transformación de un contrato temporal en indefinido.
  is_conversion boolean not null default false,
  -- false: ya no se admite para contratos nuevos (se conserva para el histórico).
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((duration = 'indefinite') = (left(code, 1) in ('1', '2', '3'))),
  check (
    (working_time = 'full_time' and left(code, 1) in ('1', '4'))
    or (working_time = 'part_time' and left(code, 1) in ('2', '5'))
    or (working_time = 'fixed_discontinuous' and left(code, 1) = '3')
  )
);

comment on table public.contract_keys is
  'Claves de tipo de contrato de la codificación unificada TGSS-SEPE (Contrat@, Sistema RED). Global, solo lectura.';

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create trigger trg_autonomous_communities_updated_at before update on public.autonomous_communities
  for each row execute function private.touch_updated_at();
create trigger trg_provinces_updated_at before update on public.provinces
  for each row execute function private.touch_updated_at();
create trigger trg_municipalities_updated_at before update on public.municipalities
  for each row execute function private.touch_updated_at();
create trigger trg_countries_updated_at before update on public.countries
  for each row execute function private.touch_updated_at();
create trigger trg_contract_keys_updated_at before update on public.contract_keys
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Privilegios y RLS: cualquier usuario autenticado lee; nadie escribe desde la API.
-- Las escriben las migraciones y los seeds (postgres). anon no tiene nada (default privileges del núcleo).
-- ---------------------------------------------------------------------------
revoke all on table
  public.autonomous_communities, public.provinces, public.municipalities, public.countries, public.contract_keys
from anon;

revoke insert, update, delete, truncate, references, trigger on table
  public.autonomous_communities, public.provinces, public.municipalities, public.countries, public.contract_keys
from authenticated;

grant select on table
  public.autonomous_communities, public.provinces, public.municipalities, public.countries, public.contract_keys
to authenticated;

alter table public.autonomous_communities enable row level security;
alter table public.provinces enable row level security;
alter table public.municipalities enable row level security;
alter table public.countries enable row level security;
alter table public.contract_keys enable row level security;

create policy autonomous_communities_select on public.autonomous_communities for select to authenticated using (true);
create policy provinces_select on public.provinces for select to authenticated using (true);
create policy municipalities_select on public.municipalities for select to authenticated using (true);
create policy countries_select on public.countries for select to authenticated using (true);
create policy contract_keys_select on public.contract_keys for select to authenticated using (true);
