-- Custom Access Token Hook: claims generados para cada tipo de usuario.

select plan(24);

-- admin de A
select is(pg_temp.claims('a0000000-0000-0000-0000-000000000001') ->> 'tenant_id',
  '10000000-0000-0000-0000-00000000000a', 'admin A: tenant_id = A');
select is(pg_temp.claims('a0000000-0000-0000-0000-000000000001') ->> 'app_role', 'admin', 'admin A: app_role = admin');
select is(pg_temp.claims('a0000000-0000-0000-0000-000000000001') -> 'branch_ids', '[]'::jsonb, 'admin A: sin sucursales asignadas');
select is(pg_temp.claims('a0000000-0000-0000-0000-000000000001') ->> 'role', 'authenticated', 'conserva el claim role');
select is(pg_temp.claims('a0000000-0000-0000-0000-000000000001') ->> 'sub',
  'a0000000-0000-0000-0000-000000000001', 'conserva el claim sub');
select ok(not (pg_temp.claims('a0000000-0000-0000-0000-000000000001') ? 'permissions'), 'los permisos finos no van en el JWT');

-- selección de A con una sucursal
select is(pg_temp.claims('a0000000-0000-0000-0000-000000000002') ->> 'app_role', 'seleccion', 'selección A: app_role = seleccion');
select is(pg_temp.claims('a0000000-0000-0000-0000-000000000002') -> 'branch_ids',
  '["30000000-0000-0000-0000-0000000000a1"]'::jsonb, 'selección A: branch_ids = [A1]');

-- usuario en dos ETT: manda active_tenant_id
select is(pg_temp.claims('c0000000-0000-0000-0000-000000000001') ->> 'tenant_id',
  '10000000-0000-0000-0000-00000000000b', 'multi: ETT activa B');
select is(pg_temp.claims('c0000000-0000-0000-0000-000000000001') ->> 'app_role', 'admin', 'multi: rol de B (admin)');

update public.profiles set active_tenant_id = '10000000-0000-0000-0000-00000000000a'
where id = 'c0000000-0000-0000-0000-000000000001';
select is(pg_temp.claims('c0000000-0000-0000-0000-000000000001') ->> 'tenant_id',
  '10000000-0000-0000-0000-00000000000a', 'multi: al cambiar active_tenant_id pasa a A');
select is(pg_temp.claims('c0000000-0000-0000-0000-000000000001') ->> 'app_role', 'laboral', 'multi: rol de A (laboral)');

-- membresía de la ETT activa bloqueada: usa otra membresía activa
update public.memberships set status = 'blocked'
where user_id = 'c0000000-0000-0000-0000-000000000001' and tenant_id = '10000000-0000-0000-0000-00000000000a';
select is(pg_temp.claims('c0000000-0000-0000-0000-000000000001') ->> 'tenant_id',
  '10000000-0000-0000-0000-00000000000b', 'multi: membresía activa bloqueada, cae en B');

-- ETT desactivada: no se emite como activa
update public.tenants set status = 'inactive' where id = '10000000-0000-0000-0000-00000000000b';
select is(pg_temp.claims('b0000000-0000-0000-0000-000000000001') ->> 'tenant_id', null, 'ETT inactiva: tenant_id null');
update public.tenants set status = 'active' where id = '10000000-0000-0000-0000-00000000000b';

-- perfil bloqueado, sin membresías, inexistente
select is(pg_temp.claims('e0000000-0000-0000-0000-000000000001') ->> 'tenant_id', null, 'perfil bloqueado: tenant_id null');
select is(pg_temp.claims('e0000000-0000-0000-0000-000000000001') ->> 'app_role', null, 'perfil bloqueado: app_role null');
select is(pg_temp.claims('f0000000-0000-0000-0000-000000000001') ->> 'tenant_id', null, 'sin membresías: tenant_id null');
select is(pg_temp.claims('f0000000-0000-0000-0000-000000000001') -> 'branch_ids', '[]'::jsonb, 'sin membresías: branch_ids vacío');
select is(pg_temp.claims('99999999-0000-0000-0000-000000000001') ->> 'tenant_id', null, 'usuario sin perfil: tenant_id null');

-- superadmin
select is(pg_temp.claims('d0000000-0000-0000-0000-000000000001') ->> 'app_role', 'superadmin', 'superadmin: app_role = superadmin');
select is(pg_temp.claims('d0000000-0000-0000-0000-000000000001') ->> 'tenant_id',
  '10000000-0000-0000-0000-00000000000b', 'superadmin: ETT activa sin ser miembro');

-- quién puede ejecutar el hook
select ok(has_function_privilege('supabase_auth_admin', 'private.custom_access_token_hook(jsonb)', 'execute'),
  'supabase_auth_admin puede ejecutar el hook');
select ok(not has_function_privilege('authenticated', 'private.custom_access_token_hook(jsonb)', 'execute'),
  'authenticated no puede ejecutar el hook');
select ok(not has_function_privilege('anon', 'private.custom_access_token_hook(jsonb)', 'execute'),
  'anon no puede ejecutar el hook');

select * from finish();
