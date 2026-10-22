-- Identidad sobre Supabase Auth. Sustituye la tabla `users` heredada (firebase_uid, password_hash,
-- email único por tenant): la identidad, el email y la contraseña viven en auth.users (global).
--
--   profiles          1:1 con auth.users. Datos de la persona, no de la ETT.
--   platform_admins   superadmins de la plataforma. Solo se escribe con service_role o por SQL.
--   permissions       catálogo global de permisos finos (los define el código, no la ETT).
--   roles             roles por ETT, editables. Se crean los de serie al dar de alta la ETT.
--   role_permissions  qué permisos tiene cada rol de la ETT.
--   memberships       pertenencia de un usuario a una ETT, con un rol. Un usuario puede estar en varias.
--   user_contexts     alcance de la membresía: sociedades y sucursales en las que trabaja.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name varchar(160) not null default '',
  phone varchar(40),
  status varchar(20) not null default 'active' check (status in ('active', 'blocked', 'inactive')),
  -- ETT con la que el usuario quiere trabajar. El hook de token la valida contra memberships
  -- en cada emisión del JWT; si no es válida, usa otra membresía activa.
  active_tenant_id uuid references public.tenants (id) on delete set null,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index profiles_active_tenant_idx on public.profiles (active_tenant_id);

comment on table public.profiles is
  'Perfil 1:1 con auth.users. El email y el último acceso están en auth.users.';

-- ---------------------------------------------------------------------------
-- platform_admins
-- ---------------------------------------------------------------------------
create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

comment on table public.platform_admins is
  'Superadmins de la plataforma (acceso a todas las ETT). Sin escritura desde el cliente.';

-- ---------------------------------------------------------------------------
-- permissions
-- ---------------------------------------------------------------------------
create table public.permissions (
  code varchar(80) primary key,
  module varchar(40) not null,
  description text not null
);

insert into public.permissions (code, module, description) values
  ('module.administracion', 'administracion', 'Acceso al módulo de administración de la ETT'),
  ('module.laboral', 'laboral', 'Acceso al módulo laboral'),
  ('module.seleccion', 'seleccion', 'Acceso al módulo de selección'),
  ('module.comercial', 'comercial', 'Acceso al módulo comercial'),
  ('tenant.manage', 'administracion', 'Editar los datos de la ETT'),
  ('companies.manage', 'administracion', 'Crear, editar y borrar sociedades'),
  ('branches.manage', 'administracion', 'Crear, editar y borrar sucursales'),
  ('catalogs.manage', 'administracion', 'Editar los catálogos de la ETT'),
  ('users.manage', 'administracion', 'Gestionar usuarios de la ETT y su alcance por sucursal'),
  ('roles.manage', 'administracion', 'Editar roles y sus permisos'),
  ('addresses.write', 'general', 'Crear y editar direcciones');

-- ---------------------------------------------------------------------------
-- roles
-- ---------------------------------------------------------------------------
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  code varchar(50) not null,
  name varchar(120) not null,
  description text,
  -- tenant: toda la ETT. branches: sus sucursales. branch: una sucursal activa.
  scope varchar(20) not null default 'tenant' check (scope in ('tenant', 'branches', 'branch')),
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, id)
);

create unique index roles_tenant_code_uniq on public.roles (tenant_id, code) where deleted_at is null;

comment on column public.roles.is_system is 'Rol de serie (admin, laboral...). Se puede editar, no borrar.';

-- ---------------------------------------------------------------------------
-- role_permissions
-- ---------------------------------------------------------------------------
create table public.role_permissions (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  role_id uuid not null,
  permission_code varchar(80) not null references public.permissions (code) on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tenant_id, role_id, permission_code),
  foreign key (tenant_id, role_id) references public.roles (tenant_id, id) on delete cascade
);

create index role_permissions_permission_idx on public.role_permissions (permission_code);

-- ---------------------------------------------------------------------------
-- memberships
-- ---------------------------------------------------------------------------
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null,
  status varchar(20) not null default 'active' check (status in ('active', 'blocked', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, id),
  unique (tenant_id, user_id),
  -- NO ACTION (no RESTRICT) para que borrar la ETT en cascada funcione.
  foreign key (tenant_id, role_id) references public.roles (tenant_id, id)
);

create index memberships_tenant_role_idx on public.memberships (tenant_id, role_id);
-- Excepción a "índices por tenant_id": el hook y las políticas buscan las membresías de un usuario.
create index memberships_user_idx on public.memberships (user_id);

-- ---------------------------------------------------------------------------
-- user_contexts
-- ---------------------------------------------------------------------------
create table public.user_contexts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  membership_id uuid not null,
  company_id uuid not null,
  -- NULL: toda la sociedad.
  branch_id uuid,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, id),
  foreign key (tenant_id, membership_id) references public.memberships (tenant_id, id) on delete cascade,
  foreign key (tenant_id, company_id) references public.companies (tenant_id, id) on delete cascade,
  -- La sucursal tiene que ser de la sociedad indicada.
  foreign key (tenant_id, company_id, branch_id) references public.branches (tenant_id, company_id, id) on delete cascade
);

create unique index user_contexts_scope_uniq
  on public.user_contexts (tenant_id, membership_id, company_id, branch_id) nulls not distinct
  where deleted_at is null;
create unique index user_contexts_default_uniq
  on public.user_contexts (tenant_id, membership_id) where is_default and deleted_at is null;
create index user_contexts_tenant_company_branch_idx on public.user_contexts (tenant_id, company_id, branch_id);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function private.touch_updated_at();
create trigger trg_roles_updated_at before update on public.roles
  for each row execute function private.touch_updated_at();
create trigger trg_memberships_updated_at before update on public.memberships
  for each row execute function private.touch_updated_at();
create trigger trg_user_contexts_updated_at before update on public.user_contexts
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Perfil automático al crear un usuario en Supabase Auth.
-- ---------------------------------------------------------------------------
create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- active_tenant_id solo puede apuntar a una ETT de la que el usuario es miembro activo
-- (o a cualquiera, si es superadmin). No depende de quién haga el UPDATE.
-- ---------------------------------------------------------------------------
create or replace function private.check_profile_active_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.active_tenant_id is not null
     and new.active_tenant_id is distinct from old.active_tenant_id
     and not exists (select 1 from public.platform_admins pa where pa.user_id = new.id)
     and not exists (
       select 1 from public.memberships m
       where m.user_id = new.id and m.tenant_id = new.active_tenant_id
         and m.status = 'active' and m.deleted_at is null
     ) then
    raise exception 'El usuario no pertenece a esa ETT' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger trg_profiles_check_active_tenant before insert or update of active_tenant_id on public.profiles
  for each row execute function private.check_profile_active_tenant();

-- ---------------------------------------------------------------------------
-- Roles de serie al dar de alta una ETT (ver tabla de roles en db/README.md).
-- El superadmin no es un rol de ETT: está en platform_admins.
-- ---------------------------------------------------------------------------
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
    ('admin', 'addresses.write'),
    ('laboral', 'module.laboral'), ('laboral', 'addresses.write'),
    ('director_zona', 'module.laboral'), ('director_zona', 'module.seleccion'),
    ('director_zona', 'module.comercial'), ('director_zona', 'addresses.write'),
    ('seleccion', 'module.seleccion'), ('seleccion', 'addresses.write'),
    ('comercial', 'module.comercial'), ('comercial', 'addresses.write')
  ) as p (role_code, permission_code) on p.role_code = r.code
  where r.tenant_id = new.id;

  return new;
end;
$$;

create trigger trg_tenants_seed_roles after insert on public.tenants
  for each row execute function private.seed_tenant_roles();

-- Los roles de serie no se borran (sí se editan nombre, alcance y permisos).
create or replace function private.protect_system_roles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Borrado en cascada de la ETT: la fila de tenants ya no existe.
  if tg_op = 'DELETE' and not exists (select 1 from public.tenants t where t.id = old.tenant_id) then
    return old;
  end if;
  if old.is_system and (tg_op = 'DELETE' or new.code <> old.code or not new.is_system or new.deleted_at is not null) then
    raise exception 'Los roles de serie no se pueden borrar ni renombrar su código' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger trg_roles_protect_system before update or delete on public.roles
  for each row execute function private.protect_system_roles();
