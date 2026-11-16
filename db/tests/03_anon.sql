-- anon (petición sin sesión, solo con la anon key) no ve nada del núcleo.

select plan(18);

select set_config('request.jwt.claims', '{"role": "anon"}', true);
set local role anon;

select throws_ok('select * from public.tenants', '42501', null, 'anon no lee tenants');
select throws_ok('select * from public.catalog_items', '42501', null, 'anon no lee catalog_items');
select throws_ok('select * from public.addresses', '42501', null, 'anon no lee addresses');
select throws_ok('select * from public.companies', '42501', null, 'anon no lee companies');
select throws_ok('select * from public.branches', '42501', null, 'anon no lee branches');
select throws_ok('select * from public.profiles', '42501', null, 'anon no lee profiles');
select throws_ok('select * from public.platform_admins', '42501', null, 'anon no lee platform_admins');
select throws_ok('select * from public.permissions', '42501', null, 'anon no lee permissions');
select throws_ok('select * from public.roles', '42501', null, 'anon no lee roles');
select throws_ok('select * from public.role_permissions', '42501', null, 'anon no lee role_permissions');
select throws_ok('select * from public.memberships', '42501', null, 'anon no lee memberships');
select throws_ok('select * from public.user_contexts', '42501', null, 'anon no lee user_contexts');
select throws_ok('select * from public.clients', '42501', null, 'anon no lee clients');
select throws_ok('select * from public.client_contacts', '42501', null, 'anon no lee client_contacts');
select throws_ok($$ insert into public.tenants (code, legal_name) values ('X', 'X') $$, '42501', null, 'anon no inserta tenants');
select throws_ok('select private.current_tenant_id()', '42501', null, 'anon no usa las funciones de private');

-- Ni con un tenant_id en los claims.
reset role;
select set_config('request.jwt.claims', '{"role": "anon", "tenant_id": "10000000-0000-0000-0000-00000000000a"}', true);
set local role anon;
select throws_ok('select * from public.companies', '42501', null, 'anon con tenant_id en claims tampoco lee companies');

-- Las tablas nuevas de public tampoco serán de anon por defecto.
reset role;
create table public.zz_tabla_nueva (id int);
select ok(not has_table_privilege('anon', 'public.zz_tabla_nueva', 'select'), 'tablas nuevas en public: anon sin privilegios');

select * from finish();
