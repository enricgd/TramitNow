-- Row Level Security del núcleo.
--
-- Las políticas leen solo:
--   - auth.uid() y auth.jwt(), que PostgREST rellena a partir del JWT firmado por Supabase Auth.
--     El cliente no puede fijarlos: no hay ninguna función que haga set_config expuesta como RPC.
--   - Tablas que solo se escriben con permisos (memberships, role_permissions, platform_admins).
--
-- El claim `tenant_id` del JWT solo elige la ETT activa. Además se comprueba contra memberships en cada
-- consulta, así que dar de baja una membresía corta el acceso al momento aunque el JWT siga vigente.
-- El superadmin se decide por la tabla platform_admins, nunca por un claim.
-- Los permisos finos se resuelven con role_permissions, no van en el JWT.
--
-- Las funciones son SECURITY DEFINER (propietario postgres, que no está sujeto a RLS en sus tablas)
-- para poder consultar memberships sin recursión de políticas. Viven en `private`, que no expone la API.

-- ---------------------------------------------------------------------------
-- Funciones auxiliares
-- ---------------------------------------------------------------------------
create or replace function private.jwt_tenant_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(auth.jwt() ->> 'tenant_id', '')::uuid
$$;

-- ETT activa del usuario: la del JWT, solo si tiene en ella una membresía activa y la ETT está activa.
create or replace function private.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.tenant_id
  from public.memberships m
  join public.profiles p on p.id = m.user_id
  join public.tenants t on t.id = m.tenant_id
  where m.user_id = auth.uid()
    and m.tenant_id = private.jwt_tenant_id()
    and m.status = 'active' and m.deleted_at is null
    and p.status = 'active' and p.deleted_at is null
    and t.status = 'active' and t.deleted_at is null
$$;

create or replace function private.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.platform_admins pa
    join public.profiles p on p.id = pa.user_id
    where pa.user_id = auth.uid()
      and p.status = 'active' and p.deleted_at is null
  )
$$;

-- ¿Tiene el rol del usuario, en la ETT activa, este permiso?
create or replace function private.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    join public.roles r on r.tenant_id = m.tenant_id and r.id = m.role_id and r.deleted_at is null
    join public.role_permissions rp on rp.tenant_id = m.tenant_id and rp.role_id = m.role_id
    where m.user_id = auth.uid()
      and m.tenant_id = private.current_tenant_id()
      and rp.permission_code = p_permission
  )
$$;

-- ¿Es el usuario miembro activo de esta ETT? (aunque no sea la activa; para elegir ETT).
create or replace function private.is_member_of(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid() and m.tenant_id = p_tenant_id
      and m.status = 'active' and m.deleted_at is null
  )
$$;

-- ¿Pertenece este perfil a la ETT activa del usuario? (para ver nombres de compañeros).
create or replace function private.shares_current_tenant(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = p_user_id and m.tenant_id = private.current_tenant_id() and m.deleted_at is null
  )
$$;

-- ¿Puede el usuario trabajar con esta sucursal? Para las tablas por sucursal de las siguientes fases.
-- Rol con alcance 'tenant': todas. Si no, las de sus user_contexts (branch_id NULL = toda la sociedad).
create or replace function private.can_access_branch(p_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_superadmin() or exists (
    select 1
    from public.memberships m
    join public.roles r on r.tenant_id = m.tenant_id and r.id = m.role_id
    where m.user_id = auth.uid()
      and m.tenant_id = private.current_tenant_id()
      and (
        r.scope = 'tenant'
        or exists (
          select 1
          from public.user_contexts uc
          join public.branches b on b.tenant_id = uc.tenant_id and b.company_id = uc.company_id
          where uc.tenant_id = m.tenant_id and uc.membership_id = m.id and uc.deleted_at is null
            and b.id = p_branch_id
            and (uc.branch_id is null or uc.branch_id = b.id)
        )
      )
  )
$$;

grant execute on function
  private.jwt_tenant_id(),
  private.current_tenant_id(),
  private.is_superadmin(),
  private.has_permission(text),
  private.is_member_of(uuid),
  private.shares_current_tenant(uuid),
  private.can_access_branch(uuid)
to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Privilegios de tabla. RLS filtra filas; además anon no tiene ningún privilegio sobre el núcleo.
-- ---------------------------------------------------------------------------
revoke all on table
  public.tenants, public.catalog_items, public.addresses, public.companies, public.branches,
  public.profiles, public.platform_admins, public.permissions, public.roles, public.role_permissions,
  public.memberships, public.user_contexts
from anon;

-- RLS no se aplica a TRUNCATE.
revoke truncate, references, trigger on table
  public.tenants, public.catalog_items, public.addresses, public.companies, public.branches,
  public.profiles, public.platform_admins, public.permissions, public.roles, public.role_permissions,
  public.memberships, public.user_contexts
from authenticated;

revoke insert, update, delete on table public.permissions, public.platform_admins from authenticated;

-- El perfil lo crea el trigger de auth.users. Desde el cliente solo se editan estas columnas;
-- status y must_change_password se cambian con service_role (API).
revoke insert, update, delete on table public.profiles from authenticated;
grant update (full_name, phone, active_tenant_id) on table public.profiles to authenticated;

-- Las tablas y funciones que se creen después en public tampoco serán accesibles para anon
-- salvo que la migración lo conceda expresamente.
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke all on functions from anon;

-- ---------------------------------------------------------------------------
-- Activar RLS
-- ---------------------------------------------------------------------------
alter table public.tenants enable row level security;
alter table public.catalog_items enable row level security;
alter table public.addresses enable row level security;
alter table public.companies enable row level security;
alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.platform_admins enable row level security;
alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.memberships enable row level security;
alter table public.user_contexts enable row level security;

-- ---------------------------------------------------------------------------
-- Tablas de la ETT: leer si es la ETT activa; escribir además con el permiso indicado.
-- ---------------------------------------------------------------------------
do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('catalog_items', 'catalogs.manage'),
      ('addresses', 'addresses.write'),
      ('companies', 'companies.manage'),
      ('branches', 'branches.manage'),
      ('roles', 'roles.manage'),
      ('role_permissions', 'roles.manage')
    ) as v (tbl, perm)
  loop
    execute format($p$
      create policy %1$I on public.%2$I for select to authenticated
      using ((select private.is_superadmin()) or tenant_id = (select private.current_tenant_id()))
    $p$, t.tbl || '_select', t.tbl);

    execute format($p$
      create policy %1$I on public.%2$I for insert to authenticated
      with check (
        (select private.is_superadmin())
        or (tenant_id = (select private.current_tenant_id()) and (select private.has_permission(%3$L)))
      )
    $p$, t.tbl || '_insert', t.tbl, t.perm);

    execute format($p$
      create policy %1$I on public.%2$I for update to authenticated
      using (
        (select private.is_superadmin())
        or (tenant_id = (select private.current_tenant_id()) and (select private.has_permission(%3$L)))
      )
      with check (
        (select private.is_superadmin())
        or (tenant_id = (select private.current_tenant_id()) and (select private.has_permission(%3$L)))
      )
    $p$, t.tbl || '_update', t.tbl, t.perm);

    execute format($p$
      create policy %1$I on public.%2$I for delete to authenticated
      using (
        (select private.is_superadmin())
        or (tenant_id = (select private.current_tenant_id()) and (select private.has_permission(%3$L)))
      )
    $p$, t.tbl || '_delete', t.tbl, t.perm);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- memberships y user_contexts: cada uno ve lo suyo; users.manage ve y gestiona los de la ETT activa.
-- ---------------------------------------------------------------------------
create policy memberships_select on public.memberships for select to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_superadmin())
  or (tenant_id = (select private.current_tenant_id()) and (select private.has_permission('users.manage')))
);

create policy user_contexts_select on public.user_contexts for select to authenticated
using (
  (select private.is_superadmin())
  or (
    tenant_id = (select private.current_tenant_id())
    and (
      (select private.has_permission('users.manage'))
      or membership_id in (select m.id from public.memberships m where m.user_id = (select auth.uid()))
    )
  )
);

do $$
declare
  tbl text;
begin
  foreach tbl in array array['memberships', 'user_contexts'] loop
    execute format($p$
      create policy %1$I on public.%2$I for insert to authenticated
      with check (
        (select private.is_superadmin())
        or (tenant_id = (select private.current_tenant_id()) and (select private.has_permission('users.manage')))
      )
    $p$, tbl || '_insert', tbl);

    execute format($p$
      create policy %1$I on public.%2$I for update to authenticated
      using (
        (select private.is_superadmin())
        or (tenant_id = (select private.current_tenant_id()) and (select private.has_permission('users.manage')))
      )
      with check (
        (select private.is_superadmin())
        or (tenant_id = (select private.current_tenant_id()) and (select private.has_permission('users.manage')))
      )
    $p$, tbl || '_update', tbl);

    execute format($p$
      create policy %1$I on public.%2$I for delete to authenticated
      using (
        (select private.is_superadmin())
        or (tenant_id = (select private.current_tenant_id()) and (select private.has_permission('users.manage')))
      )
    $p$, tbl || '_delete', tbl);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- tenants: cada usuario ve las ETT de las que es miembro (para el selector de ETT).
-- Alta y baja solo superadmin; los datos de la ETT activa, con tenant.manage.
-- ---------------------------------------------------------------------------
create policy tenants_select on public.tenants for select to authenticated
using ((select private.is_superadmin()) or private.is_member_of(id));

create policy tenants_insert on public.tenants for insert to authenticated
with check ((select private.is_superadmin()));

create policy tenants_update on public.tenants for update to authenticated
using (
  (select private.is_superadmin())
  or (id = (select private.current_tenant_id()) and (select private.has_permission('tenant.manage')))
)
with check (
  (select private.is_superadmin())
  or (id = (select private.current_tenant_id()) and (select private.has_permission('tenant.manage')))
);

create policy tenants_delete on public.tenants for delete to authenticated
using ((select private.is_superadmin()));

-- ---------------------------------------------------------------------------
-- profiles: el propio, y los de compañeros de la ETT activa (solo lectura).
-- ---------------------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or (select private.is_superadmin())
  or private.shares_current_tenant(id)
);

create policy profiles_update on public.profiles for update to authenticated
using (id = (select auth.uid()) or (select private.is_superadmin()))
with check (id = (select auth.uid()) or (select private.is_superadmin()));

-- ---------------------------------------------------------------------------
-- platform_admins: cada uno ve si es superadmin. permissions: catálogo de solo lectura.
-- ---------------------------------------------------------------------------
create policy platform_admins_select on public.platform_admins for select to authenticated
using (user_id = (select auth.uid()));

create policy permissions_select on public.permissions for select to authenticated
using (true);
