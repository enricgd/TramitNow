-- Catálogos globales (provincias, municipios, países, claves de contrato): los lee cualquier usuario
-- autenticado, aunque no tenga ETT; nadie los escribe desde la API, ni el superadmin; anon no los ve.

select plan(22);

-- ---------------------------------------------------------------------------
-- Lectura: cualquier usuario autenticado, también sin membresías
-- ---------------------------------------------------------------------------
select pg_temp.login('f0000000-0000-0000-0000-000000000001');

select is((select count(*)::int from public.autonomous_communities), 19, 'sin ETT: ve las 19 comunidades y ciudades autónomas');
select is((select count(*)::int from public.provinces), 52, 'sin ETT: ve las 52 provincias');
select is((select name::text from public.provinces where code = '48'), 'Bizkaia', 'provincia 48 = Bizkaia');
select is((select autonomous_community_code::text from public.provinces where code = '51'), '18', 'Ceuta es de la ciudad autónoma 18');
select ok((select count(*) from public.countries) >= 249, 'sin ETT: ve los países');
select is((select numeric_code::text from public.countries where code = 'ES'), '724', 'España: código numérico 724');
select ok((select eu_member and eea_member from public.countries where code = 'RO'), 'Rumanía es UE y EEE');
select ok((select not eu_member and eea_member from public.countries where code = 'NO'), 'Noruega es EEE pero no UE');
select ok((select active from public.contract_keys where code = '402'), 'clave 402 activa');
select ok((select not active from public.contract_keys where code = '401'), 'clave 401 (obra o servicio) inactiva');
select ok((select count(*) from public.municipalities) > 8000, 'municipios del INE cargados (db/seeds/ine-municipios.sql)');
select is((select name::text from public.municipalities where code = '28079'), 'Madrid', 'municipio 28079 = Madrid');

-- ---------------------------------------------------------------------------
-- Escritura: nadie desde la API
-- ---------------------------------------------------------------------------
reset role;
select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select throws_ok($$ insert into public.provinces (code, name, autonomous_community_code) values ('99', 'X', '01') $$,
  '42501', null, 'admin de ETT no inserta provincias');
select throws_ok($$ update public.contract_keys set name = 'x' where code = '402' $$,
  '42501', null, 'admin de ETT no edita claves de contrato');
select throws_ok($$ delete from public.municipalities where code = '28079' $$,
  '42501', null, 'admin de ETT no borra municipios');
select throws_ok($$ truncate public.countries $$, '42501', null, 'admin de ETT no vacía países');

reset role;
select pg_temp.login('d0000000-0000-0000-0000-000000000001');
select throws_ok($$ insert into public.countries (code, alpha3, numeric_code, name) values ('XX', 'XXX', '999', 'X') $$,
  '42501', null, 'el superadmin tampoco inserta países');
select throws_ok($$ update public.municipalities set name = 'x' where code = '28079' $$,
  '42501', null, 'el superadmin tampoco edita municipios');

-- ---------------------------------------------------------------------------
-- anon
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
set local role anon;
select throws_ok('select * from public.provinces', '42501', null, 'anon no lee provincias');
select throws_ok('select * from public.contract_keys', '42501', null, 'anon no lee claves de contrato');

-- ---------------------------------------------------------------------------
-- Coherencia de los códigos
-- ---------------------------------------------------------------------------
reset role;
select throws_ok($$ insert into public.municipalities (code, province_code, check_digit, name, ine_year) values ('28999', '08', '0', 'X', 2026) $$,
  '23514', null, 'el código de municipio empieza por el de su provincia');
select throws_ok($$ insert into public.contract_keys (code, name, duration, working_time) values ('199', 'X', 'temporary', 'full_time') $$,
  '23514', null, 'una clave 1xx no puede ser temporal');

select * from finish();
