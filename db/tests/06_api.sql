-- conexion: tramitnow_api
-- Camino de la API: conecta como tramitnow_api y hace lo mismo que hará apps/api en cada transacción.
-- Los claims van escritos a mano, como los traería un JWT ya verificado.

select plan(19);

select is(current_user::text, 'tramitnow_api', 'conectado como tramitnow_api');
select ok((select not rolsuper and not rolbypassrls and not rolcreaterole and not rolcreatedb and not rolinherit
           from pg_roles where rolname = current_user), 'tramitnow_api: sin superuser, BYPASSRLS, CREATEROLE, CREATEDB ni INHERIT');

-- Sin SET ROLE no tiene ningún privilegio
select throws_ok('select * from public.companies', '42501', null, 'sin set role: no lee companies');
select throws_ok('select * from public.tenants', '42501', null, 'sin set role: no lee tenants');
select throws_ok($$ insert into public.tenants (code, legal_name) values ('X', 'X') $$, '42501', null, 'sin set role: no inserta');
select throws_ok('select private.current_tenant_id()', '42501', null, 'sin set role: no usa private');
select throws_ok('set role postgres', '42501', null, 'no puede pasar a postgres');
select throws_ok('set role service_role', '42501', null, 'no puede pasar a service_role');

-- SET ROLE authenticated sin claims: nada
set local role authenticated;
select is((select count(*)::int from public.companies), 0, 'authenticated sin claims: no ve companies');
select is((select count(*)::int from public.tenants), 0, 'authenticated sin claims: no ve tenants');
select throws_ok(
  $$ insert into public.companies (tenant_id, code, name) values ('10000000-0000-0000-0000-00000000000a', 'X', 'X') $$,
  '42501', null, 'authenticated sin claims: no inserta');

-- Claims de admin de A
select set_config('request.jwt.claims', '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated",
  "tenant_id": "10000000-0000-0000-0000-00000000000a", "app_role": "admin", "branch_ids": []}', true);
select ok((select count(*) from public.companies) > 0, 'claims de A: ve sociedades de A');
select is((select count(*)::int from public.companies where tenant_id <> '10000000-0000-0000-0000-00000000000a'), 0, 'claims de A: no ve sociedades de B');
select is((select array_agg(id) from public.tenants), array['10000000-0000-0000-0000-00000000000a'::uuid], 'claims de A: solo ve la ETT A');
select results_eq(
  $$ with u as (update public.companies set name = 'x' where tenant_id = '10000000-0000-0000-0000-00000000000b' returning 1) select count(*)::int from u $$,
  array[0], 'claims de A: no actualiza B');
select throws_ok(
  $$ insert into public.companies (tenant_id, code, name) values ('10000000-0000-0000-0000-00000000000b', 'X', 'X') $$,
  '42501', null, 'claims de A: no inserta en B');
select lives_ok(
  $$ insert into public.companies (tenant_id, code, name) values ('10000000-0000-0000-0000-00000000000a', 'API', 'Desde la API') $$,
  'claims de A: inserta en A');

-- Mismo usuario con tenant_id de B (no es miembro): nada
select set_config('request.jwt.claims', '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated",
  "tenant_id": "10000000-0000-0000-0000-00000000000b", "app_role": "admin", "branch_ids": []}', true);
select is((select count(*)::int from public.companies), 0, 'tenant_id de una ETT ajena: no ve nada');

-- Al volver al rol de conexión se pierden otra vez los privilegios
reset role;
select throws_ok('select * from public.companies', '42501', null, 'tras reset role: sin privilegios otra vez');

select * from finish();
