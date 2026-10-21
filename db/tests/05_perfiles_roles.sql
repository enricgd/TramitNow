-- Perfiles, cambio de ETT activa y roles editables por ETT.

select plan(17);

-- El trigger de auth.users crea el perfil
select is((select full_name from public.profiles where id = 'a0000000-0000-0000-0000-000000000001')::text, 'Admin A',
  'el alta en auth.users crea el perfil');

select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select results_eq(
  $$ with u as (update public.profiles set full_name = 'Admin A editado' where id = 'a0000000-0000-0000-0000-000000000001' returning 1) select count(*)::int from u $$,
  array[1], 'cada uno edita su nombre');
select throws_ok(
  $$ update public.profiles set status = 'active' where id = 'a0000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'nadie cambia su propio status desde el cliente');
select results_eq(
  $$ with u as (update public.profiles set full_name = 'x' where id = 'a0000000-0000-0000-0000-000000000002' returning 1) select count(*)::int from u $$,
  array[0], 'no se edita el perfil de un compañero');
select throws_ok(
  $$ update public.profiles set active_tenant_id = '10000000-0000-0000-0000-00000000000b' where id = 'a0000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'no se puede elegir como activa una ETT de la que no se es miembro');
select throws_ok(
  $$ insert into public.profiles (id) values ('99999999-0000-0000-0000-000000000001') $$,
  '42501', null, 'no se crean perfiles desde el cliente');

reset role;
select pg_temp.login('c0000000-0000-0000-0000-000000000001');
select lives_ok(
  $$ update public.profiles set active_tenant_id = '10000000-0000-0000-0000-00000000000a' where id = 'c0000000-0000-0000-0000-000000000001' $$,
  'un usuario de dos ETT cambia su ETT activa');
reset role;
select is(pg_temp.claims('c0000000-0000-0000-0000-000000000001') ->> 'tenant_id', '10000000-0000-0000-0000-00000000000a',
  'tras refrescar la sesión el JWT lleva la nueva ETT');

-- Roles editables por la ETT
select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select lives_ok(
  $$ insert into public.roles (id, tenant_id, code, name, scope) values
     ('60000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', 'coordinador', 'Coordinador', 'branches') $$,
  'admin A crea un rol propio');
select lives_ok(
  $$ insert into public.role_permissions (tenant_id, role_id, permission_code) values
     ('10000000-0000-0000-0000-00000000000a', '60000000-0000-0000-0000-0000000000a1', 'module.seleccion') $$,
  'admin A le asigna permisos');
select throws_ok(
  $$ insert into public.role_permissions (tenant_id, role_id, permission_code) values
     ('10000000-0000-0000-0000-00000000000a', '60000000-0000-0000-0000-0000000000a1', 'no.existe') $$,
  '23503', null, 'solo permisos del catálogo');
select throws_ok(
  $$ delete from public.roles where tenant_id = '10000000-0000-0000-0000-00000000000a' and code = 'admin' $$,
  '42501', null, 'los roles de serie no se borran');
select lives_ok(
  $$ update public.roles set name = 'Administración' where tenant_id = '10000000-0000-0000-0000-00000000000a' and code = 'admin' $$,
  'los roles de serie sí se renombran');

-- Quitar un permiso tiene efecto inmediato (no está en el JWT)
reset role;
delete from public.role_permissions rp using public.roles r
where rp.tenant_id = r.tenant_id and rp.role_id = r.id
  and r.tenant_id = '10000000-0000-0000-0000-00000000000a' and r.code = 'admin' and rp.permission_code = 'companies.manage';
set local role authenticated;
select throws_ok(
  $$ insert into public.companies (tenant_id, code, name) values ('10000000-0000-0000-0000-00000000000a', 'Z', 'Z') $$,
  '42501', null, 'sin companies.manage ya no crea sociedades, con el mismo JWT');

reset role;
select pg_temp.login('a0000000-0000-0000-0000-000000000002');
select throws_ok(
  $$ insert into public.roles (tenant_id, code, name) values ('10000000-0000-0000-0000-00000000000a', 'x', 'x') $$,
  '42501', null, 'selección no crea roles');

-- Borrar una ETT borra en cascada todo lo suyo (incluidos roles de serie)
reset role;
select lives_ok($$ delete from public.tenants where id = '10000000-0000-0000-0000-00000000000b' $$, 'borrar la ETT B en cascada');
select is((select count(*)::int from public.roles where tenant_id = '10000000-0000-0000-0000-00000000000b'), 0, 'no quedan roles de B');

select * from finish();
