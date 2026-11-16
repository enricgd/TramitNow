-- Documentos: ficha existente, tipo de documento, ruta del fichero en la carpeta de su ETT y ficha, validación con
-- quién y cuándo, conservación obligatoria, permisos de la ficha, historial y bucket privado.

select plan(20);

-- Datos de prueba propios, como postgres. Ficticios.
insert into public.clients (id, tenant_id, company_id, branch_id, code, legal_name) values
  ('80000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1',
   '30000000-0000-0000-0000-0000000000a1', 'C1', 'Cliente Ficticio A1, S.L.'),
  ('80000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1',
   '30000000-0000-0000-0000-0000000000a2', 'C2', 'Cliente Ficticio A2, S.L.');
insert into public.client_centers (id, tenant_id, client_id, branch_id, code, name) values
  ('81000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000a1',
   '30000000-0000-0000-0000-0000000000a1', 'CT1', 'Almacén ficticio');
insert into public.catalog_items (id, tenant_id, catalog, name, retention_required) values
  ('41000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', 'document_type', 'CIF', false),
  ('41000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', 'document_type', 'Contrato', true),
  ('41000000-0000-0000-0000-0000000000a3', '10000000-0000-0000-0000-00000000000a', 'client_type', 'Logística', false),
  ('41000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', 'document_type', 'CIF', false);

select is(
  (select public::text || '/' || file_size_limit || '/' || array_to_string(allowed_mime_types, ',') from storage.buckets where id = 'documents'),
  'false/10485760/application/pdf,image/jpeg,image/png', 'bucket privado, 10 MB, PDF, JPG o PNG');

-- Comercial de la sucursal A1 (selección pasa a comercial para este test).
update public.memberships set role_id = (
  select id from public.roles where tenant_id = '10000000-0000-0000-0000-00000000000a' and code = 'comercial'
) where user_id = 'a0000000-0000-0000-0000-000000000002';
select pg_temp.login('a0000000-0000-0000-0000-000000000002');

select lives_ok(
  $$ insert into public.documents (id, tenant_id, entity_type, entity_id, type_id, name, storage_path, mime_type, size_bytes, uploaded_by)
     values ('90000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', 'client', '80000000-0000-0000-0000-0000000000a1',
             '41000000-0000-0000-0000-0000000000a1', 'CIF', '10000000-0000-0000-0000-00000000000a/client/80000000-0000-0000-0000-0000000000a1/x.pdf',
             'application/pdf', 1000, 'a0000000-0000-0000-0000-000000000001') $$,
  'sube un documento a un cliente de su sucursal');
select is(
  (select status || '/' || uploaded_by from public.documents where id = '90000000-0000-0000-0000-0000000000a1'),
  'pending/a0000000-0000-0000-0000-000000000002', 'entra pendiente de validar y quién lo subió lo pone la base de datos');
select lives_ok(
  $$ insert into public.documents (id, tenant_id, entity_type, entity_id, type_id, name, storage_path, mime_type, size_bytes)
     values ('90000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', 'client_center', '81000000-0000-0000-0000-0000000000a1',
             '41000000-0000-0000-0000-0000000000a2', 'Contrato', '10000000-0000-0000-0000-00000000000a/client_center/81000000-0000-0000-0000-0000000000a1/y.pdf',
             'application/pdf', 2000) $$,
  'y a un centro');
select throws_ok(
  $$ insert into public.documents (tenant_id, entity_type, entity_id, type_id, name, storage_path, mime_type, size_bytes)
     values ('10000000-0000-0000-0000-00000000000a', 'client', '80000000-0000-0000-0000-0000000000a2', '41000000-0000-0000-0000-0000000000a1',
             'CIF', '10000000-0000-0000-0000-00000000000a/client/80000000-0000-0000-0000-0000000000a2/z.pdf', 'application/pdf', 1) $$,
  '42501', null, 'no en un cliente de otra sucursal');
select throws_ok(
  $$ insert into public.documents (tenant_id, entity_type, entity_id, type_id, name, storage_path, mime_type, size_bytes)
     values ('10000000-0000-0000-0000-00000000000a', 'client', '80000000-0000-0000-0000-0000000000a1', '41000000-0000-0000-0000-0000000000a1',
             'CIF', '10000000-0000-0000-0000-00000000000b/client/80000000-0000-0000-0000-0000000000a1/z.pdf', 'application/pdf', 1) $$,
  '23514', null, 'el fichero tiene que estar en la carpeta de su ETT y su ficha');
select throws_ok(
  $$ insert into public.documents (tenant_id, entity_type, entity_id, type_id, name, storage_path, mime_type, size_bytes)
     values ('10000000-0000-0000-0000-00000000000a', 'client', '80000000-0000-0000-0000-0000000000a1', '41000000-0000-0000-0000-0000000000a3',
             'X', '10000000-0000-0000-0000-00000000000a/client/80000000-0000-0000-0000-0000000000a1/z.pdf', 'application/pdf', 1) $$,
  '23503', null, 'el tipo tiene que ser un tipo de documento');
select throws_ok(
  $$ insert into public.documents (tenant_id, entity_type, entity_id, type_id, name, storage_path, mime_type, size_bytes)
     values ('10000000-0000-0000-0000-00000000000a', 'client', '80000000-0000-0000-0000-0000000000a1', '41000000-0000-0000-0000-0000000000b1',
             'X', '10000000-0000-0000-0000-00000000000a/client/80000000-0000-0000-0000-0000000000a1/z.pdf', 'application/pdf', 1) $$,
  '23503', null, 'ni de otra ETT');

-- Validar: quién y cuándo los pone la base de datos.
update public.documents set status = 'validated', validated_by = 'a0000000-0000-0000-0000-000000000001'
where id = '90000000-0000-0000-0000-0000000000a1';
select is(
  (select validated_by from public.documents where id = '90000000-0000-0000-0000-0000000000a1'),
  'a0000000-0000-0000-0000-000000000002'::uuid, 'al validar, quién valida es el usuario de la sesión');
update public.documents set status = 'pending' where id = '90000000-0000-0000-0000-0000000000a1';
select ok(
  (select validated_by is null and validated_at is null from public.documents where id = '90000000-0000-0000-0000-0000000000a1'),
  'al dejar de estar validado se borra quién y cuándo');
select throws_ok(
  $$ update public.documents set storage_path = '10000000-0000-0000-0000-00000000000a/client/80000000-0000-0000-0000-0000000000a1/otro.pdf'
     where id = '90000000-0000-0000-0000-0000000000a1' $$,
  'TN422', null, 'el fichero no se cambia');

-- Conservación obligatoria.
select throws_ok(
  $$ delete from public.documents where id = '90000000-0000-0000-0000-0000000000a2' $$,
  'TNRET', null, 'un contrato no se puede borrar');
select throws_ok(
  $$ update public.documents set type_id = '41000000-0000-0000-0000-0000000000a1' where id = '90000000-0000-0000-0000-0000000000a2' $$,
  'TNRET', null, 'ni pasarlo a un tipo borrable');
select lives_ok(
  $$ delete from public.documents where id = '90000000-0000-0000-0000-0000000000a1' $$, 'el resto se borra de verdad');
select is((select count(*)::int from public.documents where id = '90000000-0000-0000-0000-0000000000a1'), 0, 'ya no está');

select is(
  (select array_agg(summary order by id) from public.activity_log where entity_type = 'document'),
  array['Alta de documento «CIF»', 'Alta de documento «Contrato»', 'Validación de documento «CIF»',
        'Cambios en documento «CIF»', 'Eliminación definitiva de documento «CIF»'],
  'todo deja rastro en el historial');
select is(
  (select parent_type || ':' || parent_id from public.activity_log where entity_type = 'document' and summary like '%Contrato%'),
  'client:80000000-0000-0000-0000-0000000000a1', 'el documento de un centro sale en la ficha del cliente');

-- Selección (sin clients.manage) lee los documentos de los clientes pero no los cambia.
reset role;
update public.memberships set role_id = (
  select id from public.roles where tenant_id = '10000000-0000-0000-0000-00000000000a' and code = 'seleccion'
) where user_id = 'a0000000-0000-0000-0000-000000000002';
select pg_temp.login('a0000000-0000-0000-0000-000000000002');
select is((select count(*)::int from public.documents), 1, 'selección ve los documentos');
select is_empty(
  $$ update public.documents set name = 'No' returning id $$, 'selección no los cambia');

-- Otra ETT no ve nada.
reset role;
select pg_temp.login('b0000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.documents), 0, 'admin de B no ve los documentos de A');

reset role;
select * from finish();
