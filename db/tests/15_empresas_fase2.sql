-- Fase 2 (Empresas): CNAE como sector, convenio por defecto, contactos (valida horas, rol «Otro», suspensión),
-- forma de imprimir la factura y baja lógica recuperable (en uso, cascada, restaurar, historial).

select plan(33);

-- Datos de prueba propios, como postgres. Ficticios.
insert into public.collective_agreements (id, tenant_id, code, name) values
  ('42000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', 'CV1', 'Convenio ficticio de logística'),
  ('42000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', 'CV1', 'Convenio ficticio de B');
insert into public.clients (id, tenant_id, company_id, branch_id, code, legal_name, sector_code, default_agreement_id) values
  ('80000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1',
   '30000000-0000-0000-0000-0000000000a1', 'C1', 'Cliente Ficticio A1, S.L.', '52', '42000000-0000-0000-0000-0000000000a1'),
  ('80000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1',
   '30000000-0000-0000-0000-0000000000a1', 'C2', 'Cliente Ficticio A2, S.L.', 'H', null);
insert into public.client_centers (id, tenant_id, client_id, branch_id, code, name) values
  ('81000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000a1',
   '30000000-0000-0000-0000-0000000000a1', 'CT1', 'Almacén ficticio');
insert into public.client_contacts (id, tenant_id, client_id, name, is_main) values
  ('82000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000a1',
   'Contacto Ficticio', true);

-- ---------------------------------------------------------------------------
-- CNAE
-- ---------------------------------------------------------------------------
select is(
  (select count(*) filter (where level = 'section') || '/' || count(*) filter (where level = 'division') from public.cnae_activities),
  '21/88', 'CNAE-2009: 21 secciones y 88 divisiones');
select is((select parent_code from public.cnae_activities where code = '78'), 'N', 'la división 78 (empleo) es de la sección N');
select throws_ok(
  $$ update public.clients set sector_code = '00' where id = '80000000-0000-0000-0000-0000000000a1' $$,
  '23503', null, 'el sector tiene que ser un código CNAE');

-- ---------------------------------------------------------------------------
-- Convenio por defecto
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ update public.clients set default_agreement_id = '42000000-0000-0000-0000-0000000000b1' where id = '80000000-0000-0000-0000-0000000000a1' $$,
  '23503', null, 'el convenio por defecto es de la misma ETT');

-- ---------------------------------------------------------------------------
-- Contactos
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ update public.client_contacts set roles = '{other}' where id = '82000000-0000-0000-0000-0000000000a1' $$,
  '23514', null, 'con el rol «Otro» hay que decir cuál');
select lives_ok(
  $$ update public.client_contacts set roles = '{other,hr}', other_role = 'Jefe de turno', validates_hours = true
     where id = '82000000-0000-0000-0000-0000000000a1' $$,
  'rol «Otro» con su texto y valida horas');
select throws_ok(
  $$ update public.client_contacts set roles = '{hr}' where id = '82000000-0000-0000-0000-0000000000a1' $$,
  '23514', null, 'sin el rol «Otro» no hay texto');

select pg_temp.login('a0000000-0000-0000-0000-000000000001');
update public.client_contacts set suspended = true, suspended_at = '2000-01-01' where id = '82000000-0000-0000-0000-0000000000a1';
select ok(
  (select suspended_by = 'a0000000-0000-0000-0000-000000000001' and suspended_at > '2020-01-01'
   from public.client_contacts where id = '82000000-0000-0000-0000-0000000000a1'),
  'quién suspendió y cuándo lo pone la base de datos');
update public.client_contacts set suspended = false where id = '82000000-0000-0000-0000-0000000000a1';
select ok(
  (select suspended_at is null and suspended_by is null from public.client_contacts where id = '82000000-0000-0000-0000-0000000000a1'),
  'al reactivarlo se borra quién y cuándo');
select is(
  (select array_agg(summary order by id) from public.activity_log
   where entity_type = 'client_contact' and summary in ('Suspensión de contacto «Contacto Ficticio»', 'Reactivación de contacto «Contacto Ficticio»')),
  array['Suspensión de contacto «Contacto Ficticio»', 'Reactivación de contacto «Contacto Ficticio»'],
  'suspender y reactivar quedan en el historial');

-- ---------------------------------------------------------------------------
-- Facturación
-- ---------------------------------------------------------------------------
reset role;
insert into public.client_billing_profiles (tenant_id, client_id) values
  ('10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000a1');
select is(
  (select invoice_layout from public.client_billing_profiles where client_id = '80000000-0000-0000-0000-0000000000a1'),
  'by_person', 'la factura se imprime por persona por defecto');
select throws_ok(
  $$ update public.client_billing_profiles set invoice_layout = 'by_center' where client_id = '80000000-0000-0000-0000-0000000000a1' $$,
  '23514', null, 'por persona o por concepto');

-- ---------------------------------------------------------------------------
-- Baja lógica recuperable
-- ---------------------------------------------------------------------------
-- A2 factura sus servicios a A1: A1 está en uso.
insert into public.client_billing_profiles (tenant_id, client_id, invoice_client_id) values
  ('10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000a2', '80000000-0000-0000-0000-0000000000a1');

select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select throws_ok(
  $$ update public.clients set deleted_at = now() where id = '80000000-0000-0000-0000-0000000000a1' $$,
  'TNUSE', null, 'no se elimina un cliente en uso');
select lives_ok(
  $$ update public.clients set blocked = true where id = '80000000-0000-0000-0000-0000000000a1' $$,
  'pero sí se desactiva');

reset role;
update public.client_billing_profiles set invoice_client_id = null where client_id = '80000000-0000-0000-0000-0000000000a2';
select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select lives_ok(
  $$ update public.clients set deleted_at = now() where id = '80000000-0000-0000-0000-0000000000a1' $$,
  'sin uso, se elimina');
select ok(
  (select bool_and(deleted_at is not null) from (
     select deleted_at from public.client_centers where client_id = '80000000-0000-0000-0000-0000000000a1'
     union all select deleted_at from public.client_contacts where client_id = '80000000-0000-0000-0000-0000000000a1') x),
  'con el cliente se eliminan sus centros y contactos');
select is(
  (select count(*)::int from public.clients where deleted_at is null and id = '80000000-0000-0000-0000-0000000000a1'),
  0, 'deja de estar entre los activos');

-- Mientras está eliminado, otro cliente ocupa su código; restaurarlo choca.
insert into public.clients (id, tenant_id, company_id, branch_id, code, legal_name) values
  ('80000000-0000-0000-0000-0000000000a3', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1',
   '30000000-0000-0000-0000-0000000000a1', 'C1', 'Cliente Ficticio A3, S.L.');
select throws_ok(
  $$ update public.clients set deleted_at = null where id = '80000000-0000-0000-0000-0000000000a1' $$,
  '23505', null, 'no se restaura si choca con un activo (código repetido)');
update public.clients set code = 'C3' where id = '80000000-0000-0000-0000-0000000000a3';

select throws_ok(
  $$ update public.client_centers set deleted_at = null where id = '81000000-0000-0000-0000-0000000000a1' $$,
  'TN409', null, 'un centro no se restaura si su cliente está eliminado');
select lives_ok(
  $$ update public.clients set deleted_at = null where id = '80000000-0000-0000-0000-0000000000a1' $$,
  'se restaura el cliente');
select ok(
  (select bool_and(deleted_at is null) from (
     select deleted_at from public.client_centers where client_id = '80000000-0000-0000-0000-0000000000a1'
     union all select deleted_at from public.client_contacts where client_id = '80000000-0000-0000-0000-0000000000a1') x),
  'y con él sus centros y contactos');

-- Un contacto eliminado por separado no vuelve al restaurar el cliente después.
update public.client_contacts set deleted_at = now() - interval '1 hour' where id = '82000000-0000-0000-0000-0000000000a1';
update public.clients set deleted_at = now() where id = '80000000-0000-0000-0000-0000000000a1';
update public.clients set deleted_at = null where id = '80000000-0000-0000-0000-0000000000a1';
select ok(
  (select deleted_at is not null from public.client_contacts where id = '82000000-0000-0000-0000-0000000000a1'),
  'lo eliminado antes que el cliente sigue eliminado al restaurarlo');
select lives_ok(
  $$ update public.client_contacts set deleted_at = null where id = '82000000-0000-0000-0000-0000000000a1' $$,
  'y se restaura por separado');

select is(
  (select array_agg(summary order by id) from public.activity_log
   where entity_type = 'client' and entity_id = '80000000-0000-0000-0000-0000000000a1' and action in ('delete', 'restore')),
  array['Eliminación de cliente «Cliente Ficticio A1, S.L.»', 'Restauración de cliente «Cliente Ficticio A1, S.L.»',
        'Eliminación de cliente «Cliente Ficticio A1, S.L.»', 'Restauración de cliente «Cliente Ficticio A1, S.L.»'],
  'eliminar y restaurar quedan en el historial');
select is(
  (select actor_user_id from public.activity_log where entity_type = 'client_center' and action = 'restore' limit 1),
  'a0000000-0000-0000-0000-000000000001'::uuid, 'la restauración en cascada lleva quién la hizo');

-- Selección (sin clients.manage) no elimina ni restaura.
reset role;
select pg_temp.login('a0000000-0000-0000-0000-000000000002');
select is_empty(
  $$ update public.clients set deleted_at = now() where id = '80000000-0000-0000-0000-0000000000a2' returning id $$,
  'selección no elimina clientes');

-- ---------------------------------------------------------------------------
-- Documentos: baja lógica, conservación y restaurar
-- ---------------------------------------------------------------------------
reset role;
insert into public.catalog_items (id, tenant_id, catalog, name, retention_required) values
  ('41000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', 'document_type', 'CIF', false),
  ('41000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', 'document_type', 'Contrato', true);
insert into public.documents (id, tenant_id, entity_type, entity_id, type_id, name, storage_path, mime_type, size_bytes) values
  ('90000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', 'client', '80000000-0000-0000-0000-0000000000a2',
   '41000000-0000-0000-0000-0000000000a1', 'CIF', '10000000-0000-0000-0000-00000000000a/client/80000000-0000-0000-0000-0000000000a2/a.pdf',
   'application/pdf', 10),
  ('90000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', 'client', '80000000-0000-0000-0000-0000000000a2',
   '41000000-0000-0000-0000-0000000000a2', 'Contrato', '10000000-0000-0000-0000-00000000000a/client/80000000-0000-0000-0000-0000000000a2/b.pdf',
   'application/pdf', 10);
select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select throws_ok(
  $$ update public.documents set deleted_at = now() where id = '90000000-0000-0000-0000-0000000000a2' $$,
  'TNRET', null, 'un documento de conservación obligatoria no se elimina');
select lives_ok(
  $$ update public.documents set deleted_at = now() where id = '90000000-0000-0000-0000-0000000000a1' $$,
  'el resto sí (baja lógica)');
update public.clients set deleted_at = now() where id = '80000000-0000-0000-0000-0000000000a2';
select throws_ok(
  $$ update public.documents set deleted_at = null where id = '90000000-0000-0000-0000-0000000000a1' $$,
  'TN409', null, 'no se restaura si su ficha está eliminada');
update public.clients set deleted_at = null where id = '80000000-0000-0000-0000-0000000000a2';
update public.documents set deleted_at = null where id = '90000000-0000-0000-0000-0000000000a1';
select is(
  (select array_agg(summary order by id) from public.activity_log where entity_type = 'document' and action in ('delete', 'restore')),
  array['Eliminación de documento «CIF»', 'Restauración de documento «CIF»'], 'en el historial');

-- ---------------------------------------------------------------------------
-- Preparación y causas especiales de IVA
-- ---------------------------------------------------------------------------
reset role;
select pg_temp.login('a0000000-0000-0000-0000-000000000002');
select is(
  private.client_readiness('10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000a1'),
  '{"centers": 1, "contacts": 1, "hasBilling": true}'::jsonb,
  'preparación: lo activo, y la facturación también para quien no la puede leer');
select is(
  private.client_readiness('10000000-0000-0000-0000-00000000000b', '80000000-0000-0000-0000-0000000000a1'),
  null, 'no responde para otra ETT');
reset role;
select is(
  (select array_agg(code order by code) from public.catalog_items
   where tenant_id = '10000000-0000-0000-0000-00000000000a' and catalog = 'vat_special_cause'),
  array['EXENTA', 'IGIC', 'IPSI', 'ISP']::varchar[], 'cada ETT nueva trae las causas especiales de IVA de serie');

select * from finish();
