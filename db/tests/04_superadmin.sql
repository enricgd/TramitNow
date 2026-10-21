-- Superadmin: decidido por platform_admins, nunca por claims que pueda manipular el cliente.

select plan(11);

select pg_temp.login('d0000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.tenants), 2, 'superadmin ve todas las ETT');
select is((select count(distinct tenant_id)::int from public.companies), 2, 'superadmin ve sociedades de todas las ETT');
select lives_ok(
  $$ insert into public.tenants (id, code, legal_name) values ('10000000-0000-0000-0000-00000000000c', 'ETT-C', 'ETT Ficticia C, S.L.') $$,
  'superadmin da de alta una ETT');
select is((select array_agg(code order by code) from public.roles where tenant_id = '10000000-0000-0000-0000-00000000000c'),
  array['admin', 'comercial', 'director_zona', 'laboral', 'seleccion']::varchar[], 'la ETT nueva nace con los roles de serie');
select results_eq(
  $$ with u as (update public.companies set name = name where tenant_id = '10000000-0000-0000-0000-00000000000b' returning 1) select count(*)::int from u $$,
  array[1], 'superadmin edita sociedades de cualquier ETT');

-- Claims de superadmin falsificados por un admin de ETT
reset role;
select pg_temp.login_claims(pg_temp.claims('a0000000-0000-0000-0000-000000000001') || '{"app_role": "superadmin"}');
select is((select count(*)::int from public.tenants), 1, 'app_role superadmin falsificado: sigue viendo solo su ETT');
select is((select count(*)::int from public.companies where tenant_id = '10000000-0000-0000-0000-00000000000b'), 0, 'app_role superadmin falsificado: no ve B');
select throws_ok(
  $$ insert into public.tenants (code, legal_name) values ('ETT-X', 'Intrusa') $$,
  '42501', null, 'admin de ETT no da de alta ETT');
select throws_ok(
  $$ insert into public.platform_admins (user_id) values ('a0000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'admin de ETT no se hace superadmin');
select is((select count(*)::int from public.platform_admins), 0, 'admin de ETT no ve la lista de superadmins');

-- Superadmin con el perfil bloqueado pierde el acceso
reset role;
update public.profiles set status = 'blocked' where id = 'd0000000-0000-0000-0000-000000000001';
select pg_temp.login('d0000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.tenants), 0, 'superadmin bloqueado no ve ETT');

select * from finish();
