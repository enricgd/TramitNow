-- Tablas maestras (catalog_items por tipo): tipos cerrados, nombre único por tipo sin distinguir mayúsculas,
-- código opcional, conservación solo en tipos de documento, y escritura con catalogs.manage en su ETT.

select plan(14);

select ok(
  (select count(*) = 7 from public.catalog_types where code in (
    'payment_method', 'vat_regime', 'quote_rejection_reason', 'vacancy_cancellation_reason',
    'assignment_end_reason', 'incident_type', 'document_type')),
  'existen los tipos que piden las notas del diseño');
select is((select count(*)::int from public.catalog_types where code = 'sector'), 0, 'el sector ya no es tabla maestra (es CNAE)');

select throws_ok(
  $$ insert into public.catalog_items (tenant_id, catalog, name) values ('10000000-0000-0000-0000-00000000000a', 'inventado', 'X') $$,
  '23503', null, 'el tipo tiene que existir en catalog_types');

select lives_ok(
  $$ insert into public.catalog_items (tenant_id, catalog, name) values ('10000000-0000-0000-0000-00000000000a', 'incident_type', 'Logística') $$,
  'sin código: basta el nombre');
select throws_ok(
  $$ insert into public.catalog_items (tenant_id, catalog, name) values ('10000000-0000-0000-0000-00000000000a', 'incident_type', 'LOGÍSTICA') $$,
  '23505', null, 'el nombre es único por tipo sin distinguir mayúsculas');
select lives_ok(
  $$ insert into public.catalog_items (tenant_id, catalog, name) values ('10000000-0000-0000-0000-00000000000a', 'client_type', 'Logística') $$,
  'el mismo nombre en otro tipo sí');
select lives_ok(
  $$ insert into public.catalog_items (tenant_id, catalog, name) values ('10000000-0000-0000-0000-00000000000b', 'incident_type', 'logística') $$,
  'el mismo nombre en otra ETT sí');
select lives_ok(
  $$ update public.catalog_items set deleted_at = now() where tenant_id = '10000000-0000-0000-0000-00000000000a' and catalog = 'incident_type';
     insert into public.catalog_items (tenant_id, catalog, name) values ('10000000-0000-0000-0000-00000000000a', 'incident_type', 'Logística') $$,
  'dado de baja, el nombre se puede volver a usar');

select throws_ok(
  $$ insert into public.catalog_items (tenant_id, catalog, name, retention_required) values ('10000000-0000-0000-0000-00000000000a', 'incident_type', 'Otro', true) $$,
  '23514', null, 'conservación obligatoria solo en tipos de documento');
select lives_ok(
  $$ insert into public.catalog_items (tenant_id, catalog, name, retention_required) values ('10000000-0000-0000-0000-00000000000a', 'document_type', 'Contrato', true) $$,
  'un tipo de documento puede exigir conservación');

-- Permisos: leer cualquier miembro; escribir catalogs.manage (admin) y solo en su ETT.
select pg_temp.login('a0000000-0000-0000-0000-000000000002');
select is((select count(*)::int from public.catalog_items where catalog = 'incident_type' and deleted_at is null), 1, 'selección lee las tablas maestras de su ETT');
select throws_ok(
  $$ insert into public.catalog_items (tenant_id, catalog, name) values ('10000000-0000-0000-0000-00000000000a', 'incident_type', 'Hostelería') $$,
  '42501', null, 'sin catalogs.manage no escribe');

reset role;
select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select throws_ok(
  $$ insert into public.catalog_items (tenant_id, catalog, name) values ('10000000-0000-0000-0000-00000000000b', 'incident_type', 'Hostelería') $$,
  '42501', null, 'admin de A no escribe en B');
select throws_ok(
  $$ insert into public.catalog_types (code, name, module) values ('otro', 'Otro', 'general') $$,
  '42501', null, 'los tipos no se crean desde la API, ni siendo admin');

reset role;
select * from finish();
