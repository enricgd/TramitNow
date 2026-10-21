-- Custom Access Token Hook de Supabase Auth.
--
-- Supabase Auth (GoTrue) lo llama cada vez que emite un JWT (login y refresh) y añade estos claims:
--   tenant_id   ETT activa (texto uuid) o null si el usuario no tiene ninguna membresía activa.
--   app_role    código del rol en esa ETT, o 'superadmin' si está en platform_admins.
--   branch_ids  sucursales de sus user_contexts en esa ETT (array; vacío si no tiene).
-- No toca el claim `role` (anon/authenticated) que usa PostgREST. Los permisos finos NO van aquí.
--
-- Va en `private` y no en el esquema `auth`, que gestionan las migraciones de Supabase Auth.
-- Se activa en el servicio auth con:
--   GOTRUE_HOOK_CUSTOM_ACCESS_TOKEN_ENABLED=true
--   GOTRUE_HOOK_CUSTOM_ACCESS_TOKEN_URI=pg-functions://postgres/private/custom_access_token_hook
--
-- Cambiar de ETT: el usuario actualiza profiles.active_tenant_id (un trigger exige que sea miembro)
-- y refresca la sesión. El hook vuelve a validar la membresía; si no es válida, usa otra.

create or replace function private.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (event ->> 'user_id')::uuid;
  v_claims jsonb := coalesce(event -> 'claims', '{}'::jsonb);
  v_profile public.profiles%rowtype;
  v_superadmin boolean;
  v_tenant_id uuid;
  v_membership_id uuid;
  v_role text;
  v_branch_ids jsonb := '[]'::jsonb;
begin
  select * into v_profile from public.profiles p where p.id = v_user_id and p.deleted_at is null;

  if found and v_profile.status = 'active' then
    v_superadmin := exists (select 1 from public.platform_admins pa where pa.user_id = v_user_id);

    -- Membresía activa en una ETT activa; primero la elegida en el perfil, si no la más antigua.
    select m.tenant_id, m.id, r.code
      into v_tenant_id, v_membership_id, v_role
    from public.memberships m
    join public.roles r on r.tenant_id = m.tenant_id and r.id = m.role_id and r.deleted_at is null
    join public.tenants t on t.id = m.tenant_id
    where m.user_id = v_user_id
      and m.status = 'active' and m.deleted_at is null
      and t.status = 'active' and t.deleted_at is null
    order by (m.tenant_id = v_profile.active_tenant_id) desc, m.created_at, m.tenant_id
    limit 1;

    if v_membership_id is not null then
      select coalesce(jsonb_agg(distinct uc.branch_id) filter (where uc.branch_id is not null), '[]'::jsonb)
        into v_branch_ids
      from public.user_contexts uc
      where uc.tenant_id = v_tenant_id and uc.membership_id = v_membership_id and uc.deleted_at is null;
    end if;

    if v_superadmin then
      v_role := 'superadmin';
      -- El superadmin puede tener como activa cualquier ETT existente, sea o no miembro.
      if v_profile.active_tenant_id is not null
         and exists (select 1 from public.tenants t where t.id = v_profile.active_tenant_id and t.deleted_at is null)
         and v_profile.active_tenant_id is distinct from v_tenant_id then
        v_tenant_id := v_profile.active_tenant_id;
        v_branch_ids := '[]'::jsonb;
      end if;
    end if;
  end if;

  v_claims := v_claims
    || jsonb_build_object(
      'tenant_id', to_jsonb(v_tenant_id::text),
      'app_role', to_jsonb(v_role),
      'branch_ids', v_branch_ids
    );

  return jsonb_build_object('claims', v_claims);
end;
$$;

revoke execute on function private.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant execute on function private.custom_access_token_hook(jsonb) to supabase_auth_admin;
