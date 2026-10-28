-- Aislamiento entre ETT: un usuario de A no lee ni escribe filas de B.

select plan(43);

-- ---------------------------------------------------------------------------
-- Lectura como admin de A
-- ---------------------------------------------------------------------------
select pg_temp.login('a0000000-0000-0000-0000-000000000001');

select ok((select count(*) from public.catalog_items) > 0, 'admin A ve catalog_items de A');
select is((select count(*)::int from public.catalog_items where tenant_id <> '10000000-0000-0000-0000-00000000000a'), 0, 'admin A no ve catalog_items de otras ETT');
select ok((select count(*) from public.addresses) > 0, 'admin A ve addresses de A');
select is((select count(*)::int from public.addresses where tenant_id <> '10000000-0000-0000-0000-00000000000a'), 0, 'admin A no ve addresses de otras ETT');
select ok((select count(*) from public.companies) > 0, 'admin A ve companies de A');
select is((select count(*)::int from public.companies where tenant_id <> '10000000-0000-0000-0000-00000000000a'), 0, 'admin A no ve companies de otras ETT');
select is((select count(*)::int from public.branches), 2, 'admin A ve sus 2 sucursales');
select is((select count(*)::int from public.branches where tenant_id <> '10000000-0000-0000-0000-00000000000a'), 0, 'admin A no ve branches de otras ETT');
select is((select count(*)::int from public.roles), 5, 'admin A ve los 5 roles de A');
select is((select count(*)::int from public.role_permissions where tenant_id <> '10000000-0000-0000-0000-00000000000a'), 0, 'admin A no ve role_permissions de otras ETT');
select is((select count(*)::int from public.memberships where tenant_id <> '10000000-0000-0000-0000-00000000000a'), 0, 'admin A no ve memberships de otras ETT');
select ok((select count(*) from public.user_contexts) > 0, 'admin A (users.manage) ve user_contexts de A');
select is((select array_agg(id) from public.tenants), array['10000000-0000-0000-0000-00000000000a'::uuid], 'admin A solo ve la ETT A');
select is((select count(*)::int from public.profiles where id = 'b0000000-0000-0000-0000-000000000001'), 0, 'admin A no ve el perfil de admin B');
select is((select count(*)::int from public.profiles where id = 'a0000000-0000-0000-0000-000000000002'), 1, 'admin A ve el perfil de un compañero de A');
select is((select count(*)::int from public.companies where id = '20000000-0000-0000-0000-0000000000b1'), 0, 'admin A no ve la sociedad de B ni pidiéndola por id');

-- ---------------------------------------------------------------------------
-- Escritura como admin de A sobre filas de B
-- ---------------------------------------------------------------------------
select results_eq(
  $$ with u as (update public.companies set name = 'hackeada' where tenant_id = '10000000-0000-0000-0000-00000000000b' returning 1) select count(*)::int from u $$,
  array[0], 'admin A no actualiza sociedades de B');
select results_eq(
  $$ with d as (delete from public.branches where tenant_id = '10000000-0000-0000-0000-00000000000b' returning 1) select count(*)::int from d $$,
  array[0], 'admin A no borra sucursales de B');
select results_eq(
  $$ with u as (update public.tenants set legal_name = 'hackeada' where id = '10000000-0000-0000-0000-00000000000b' returning 1) select count(*)::int from u $$,
  array[0], 'admin A no actualiza la ETT B');
select throws_ok(
  $$ insert into public.companies (tenant_id, code, name) values ('10000000-0000-0000-0000-00000000000b', 'X', 'Intrusa') $$,
  '42501', null, 'admin A no inserta sociedades en B');
select throws_ok(
  $$ insert into public.catalog_items (tenant_id, catalog, code, name) values ('10000000-0000-0000-0000-00000000000b', 'x', 'x', 'x') $$,
  '42501', null, 'admin A no inserta catálogos en B');
select throws_ok(
  $$ update public.companies set tenant_id = '10000000-0000-0000-0000-00000000000b' where id = '20000000-0000-0000-0000-0000000000a1' $$,
  '42501', null, 'admin A no mueve una sociedad a B');
select throws_ok(
  $$ insert into public.memberships (tenant_id, user_id, role_id)
     select '10000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000' $$,
  '42501', null, 'admin A no se da de alta en B');

-- FK compuestas: aunque la fila sea de A, no puede apuntar a filas de B.
select throws_ok(
  $$ insert into public.branches (tenant_id, company_id, code, name)
     values ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000b1', 'X', 'Cruzada') $$,
  '23503', null, 'sucursal de A no puede colgar de una sociedad de B');
select throws_ok(
  $$ insert into public.addresses (tenant_id, street, geo_zone_id)
     values ('10000000-0000-0000-0000-00000000000a', 'Calle', '40000000-0000-0000-0000-0000000000b1') $$,
  '23503', null, 'dirección de A no puede usar un catálogo de B');
select throws_ok(
  $$ update public.companies set address_id = '50000000-0000-0000-0000-0000000000b1' where id = '20000000-0000-0000-0000-0000000000a1' $$,
  '23503', null, 'sociedad de A no puede usar una dirección de B');
select throws_ok(
  $$ insert into public.user_contexts (tenant_id, membership_id, company_id, branch_id)
     select '10000000-0000-0000-0000-00000000000a', m.id, '20000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000b1'
     from public.memberships m where m.user_id = 'a0000000-0000-0000-0000-000000000001' $$,
  '23503', null, 'alcance de A no puede incluir una sucursal de B');

-- Escritura legítima en A
select lives_ok(
  $$ insert into public.companies (tenant_id, code, name) values ('10000000-0000-0000-0000-00000000000a', 'A2', 'Sociedad A2') $$,
  'admin A sí inserta sociedades en A');

-- ---------------------------------------------------------------------------
-- Claims manipulados: tenant_id de B sin ser miembro de B
-- ---------------------------------------------------------------------------
reset role;
select pg_temp.login_claims(pg_temp.claims('a0000000-0000-0000-0000-000000000001')
  || '{"tenant_id": "10000000-0000-0000-0000-00000000000b"}');
select is((select count(*)::int from public.companies), 0, 'tenant_id ajeno en el JWT: no ve sociedades de nadie');
select is((select count(*)::int from public.branches), 0, 'tenant_id ajeno en el JWT: no ve sucursales de nadie');

-- ---------------------------------------------------------------------------
-- Revocación inmediata: bloquear la membresía corta el acceso con el mismo JWT
-- ---------------------------------------------------------------------------
reset role;
select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select ok((select count(*) from public.companies) > 0, 'antes de bloquear: ve sociedades');
reset role;
update public.memberships set status = 'blocked' where user_id = 'a0000000-0000-0000-0000-000000000001';
set local role authenticated;
select is((select count(*)::int from public.companies), 0, 'membresía bloqueada: deja de ver sociedades al momento');
reset role;
update public.memberships set status = 'active' where user_id = 'a0000000-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------------
-- Usuario en dos ETT: ve solo la activa
-- ---------------------------------------------------------------------------
select pg_temp.login('c0000000-0000-0000-0000-000000000001');
select is((select array_agg(distinct tenant_id) from public.companies), array['10000000-0000-0000-0000-00000000000b'::uuid], 'multi con B activa: solo sociedades de B');
select is((select count(*)::int from public.tenants), 2, 'multi: ve las dos ETT para poder elegir');
select is((select count(*)::int from public.memberships where user_id = 'c0000000-0000-0000-0000-000000000001'), 2, 'multi: ve sus dos membresías (también la de A)');

-- ---------------------------------------------------------------------------
-- Permisos finos dentro de la misma ETT (selección de A)
-- ---------------------------------------------------------------------------
reset role;
select pg_temp.login('a0000000-0000-0000-0000-000000000002');
select ok((select count(*) from public.companies) > 0, 'selección A lee sociedades de A');
select throws_ok(
  $$ insert into public.companies (tenant_id, code, name) values ('10000000-0000-0000-0000-00000000000a', 'S', 'Sin permiso') $$,
  '42501', null, 'selección A no crea sociedades (sin companies.manage)');
select results_eq(
  $$ with u as (update public.branches set name = 'x' returning 1) select count(*)::int from u $$,
  array[0], 'selección A no edita sucursales (sin branches.manage)');
select lives_ok(
  $$ insert into public.addresses (tenant_id, street) values ('10000000-0000-0000-0000-00000000000a', 'Calle Nueva') $$,
  'selección A sí crea direcciones (addresses.write)');
select is((select count(*)::int from public.memberships), 1, 'selección A solo ve su membresía');
select ok((select private.can_access_branch('30000000-0000-0000-0000-0000000000a1')), 'selección A accede a su sucursal A1');
select ok(not (select private.can_access_branch('30000000-0000-0000-0000-0000000000a2')), 'selección A no accede a A2');

reset role;
select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select ok((select private.can_access_branch('30000000-0000-0000-0000-0000000000a2')), 'admin A (alcance ETT) accede a A2');

select * from finish();
