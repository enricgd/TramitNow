-- Datos de prueba comunes. Se cargan como postgres dentro de la transacción de cada test.
-- Todo ficticio: nombres genéricos y correos @example.test.
--
-- ETT A (10..0a)                       ETT B (10..0b)
--   sociedad A (20..a1)                  sociedad B (20..b1)
--     sucursal A1 (30..a1), A2 (30..a2)    sucursal B1 (30..b1)
--
-- Usuarios
--   admin_a  a0..01  admin en A
--   sel_a    a0..02  seleccion en A, solo sucursal A1
--   admin_b  b0..01  admin en B
--   multi    c0..01  laboral en A y admin en B; ETT activa B
--   super    d0..01  superadmin (platform_admins), sin membresías; ETT activa B
--   blocked  e0..01  admin en A con el perfil bloqueado
--   nobody   f0..01  sin membresías

insert into public.tenants (id, code, legal_name) values
  ('10000000-0000-0000-0000-00000000000a', 'ETT-A', 'ETT Ficticia A, S.L.'),
  ('10000000-0000-0000-0000-00000000000b', 'ETT-B', 'ETT Ficticia B, S.L.');

insert into public.catalog_items (id, tenant_id, catalog, code, name) values
  ('40000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', 'geo_zone', 'Z1', 'Zona A'),
  ('40000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', 'geo_zone', 'Z1', 'Zona B');

insert into public.addresses (id, tenant_id, street, province_code, municipality_code, geo_zone_id) values
  ('50000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', 'Calle Ejemplo 1', '08', '08019', '40000000-0000-0000-0000-0000000000a1'),
  ('50000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', 'Calle Ejemplo 2', '28', '28079', '40000000-0000-0000-0000-0000000000b1');

insert into public.companies (id, tenant_id, code, name, address_id) values
  ('20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', 'A', 'Sociedad A', '50000000-0000-0000-0000-0000000000a1'),
  ('20000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', 'B', 'Sociedad B', '50000000-0000-0000-0000-0000000000b1');

insert into public.branches (id, tenant_id, company_id, code, name, is_default) values
  ('30000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1', 'A1', 'Sucursal A1', true),
  ('30000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1', 'A2', 'Sucursal A2', false),
  ('30000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-0000000000b1', 'B1', 'Sucursal B1', true);

-- El trigger on_auth_user_created crea los perfiles.
insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000001', 'admin.a@example.test', '{"full_name": "Admin A"}'),
  ('a0000000-0000-0000-0000-000000000002', 'seleccion.a@example.test', '{"full_name": "Selección A"}'),
  ('b0000000-0000-0000-0000-000000000001', 'admin.b@example.test', '{"full_name": "Admin B"}'),
  ('c0000000-0000-0000-0000-000000000001', 'multi@example.test', '{"full_name": "Multi ETT"}'),
  ('d0000000-0000-0000-0000-000000000001', 'super@example.test', '{"full_name": "Superadmin"}'),
  ('e0000000-0000-0000-0000-000000000001', 'bloqueado@example.test', '{"full_name": "Bloqueado"}'),
  ('f0000000-0000-0000-0000-000000000001', 'nadie@example.test', '{"full_name": "Sin ETT"}');

insert into public.platform_admins (user_id, note) values
  ('d0000000-0000-0000-0000-000000000001', 'superadmin de prueba');

insert into public.memberships (tenant_id, user_id, role_id)
select v.tenant_id::uuid, v.user_id::uuid, r.id
from (values
  ('10000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000001', 'admin'),
  ('10000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000002', 'seleccion'),
  ('10000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-000000000001', 'admin'),
  ('10000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-000000000001', 'laboral'),
  ('10000000-0000-0000-0000-00000000000b', 'c0000000-0000-0000-0000-000000000001', 'admin'),
  ('10000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-000000000001', 'admin')
) as v (tenant_id, user_id, role_code)
join public.roles r on r.tenant_id = v.tenant_id::uuid and r.code = v.role_code;

insert into public.user_contexts (tenant_id, membership_id, company_id, branch_id, is_default)
select m.tenant_id, m.id, '20000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a1', true
from public.memberships m
where m.user_id = 'a0000000-0000-0000-0000-000000000002';

update public.profiles set active_tenant_id = '10000000-0000-0000-0000-00000000000b'
where id in ('c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001');

update public.profiles set status = 'blocked' where id = 'e0000000-0000-0000-0000-000000000001';

-- Claims que generaría el hook para este usuario.
create function pg_temp.claims(p_user_id uuid)
returns jsonb
language sql
as $$
  select private.custom_access_token_hook(jsonb_build_object(
    'user_id', p_user_id,
    'claims', jsonb_build_object('sub', p_user_id, 'role', 'authenticated', 'aud', 'authenticated')
  )) -> 'claims'
$$;

-- Actuar como un usuario autenticado con estos claims, igual que haría PostgREST con su JWT.
-- Llamar como postgres (antes, `reset role;`). Vale hasta el siguiente `reset role`.
create function pg_temp.login_claims(p_claims jsonb)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', p_claims::text, true);
  set local role authenticated;
end;
$$;

create function pg_temp.login(p_user_id uuid)
returns void
language sql
as $$
  select pg_temp.login_claims(pg_temp.claims(p_user_id))
$$;
