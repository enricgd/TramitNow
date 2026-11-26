-- Expedientes (fase 7, parte 1): se abren al confirmar la candidatura, permisos por tipo de paso, vigilancia de la
-- salud sin diagnóstico, contratos, declaraciones del art. 8 que solo se añaden, CPD firmado, conservación al
-- anonimizar, historial y aislamiento entre ETT. Datos inventados.
select plan(29);

-- ---------------------------------------------------------------------------
-- Permisos de serie (pregunta 22)
-- ---------------------------------------------------------------------------
select results_eq(
  $$ select r.code::text, count(*)::int from public.role_permissions rp join public.roles r on r.id = rp.role_id
     where r.tenant_id = '10000000-0000-0000-0000-00000000000a' and rp.permission_code like 'hiring_files.%'
     group by r.code order by r.code $$,
  $$ values ('admin', 6), ('director_zona', 1), ('laboral', 6), ('seleccion', 2) $$,
  'laboral y admin, todos; selección, ver y documentación; director de zona, ver; comercial, ninguno');
select ok((select bool_and(retention_required) from public.catalog_items
           where tenant_id = '10000000-0000-0000-0000-00000000000a' and catalog = 'document_type'
             and code in ('hiring_contract', 'hiring_ss_registration', 'request_cpd_signed', 'hiring_health_fitness')),
          'contratos, altas, CPD firmados y aptitudes son de conservación obligatoria');

-- ---------------------------------------------------------------------------
-- Datos: petición de prueba (como postgres), candidato y candidatura
-- ---------------------------------------------------------------------------
alter table public.requests disable trigger trg_requests_before_write;
insert into public.clients (id, tenant_id, company_id, branch_id, code, legal_name) values
  ('81000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1',
   '30000000-0000-0000-0000-0000000000a1', 'EXPT', 'Cliente Ficticio de Expedientes, S.L.'),
  ('81000000-0000-0000-0000-0000000000e2', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1',
   '30000000-0000-0000-0000-0000000000a1', 'EXPT2', 'Otro Cliente Ficticio, S.L.');
insert into public.client_contacts (id, tenant_id, client_id, name) values
  ('83000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-00000000000a', '81000000-0000-0000-0000-0000000000e1', 'Contacto Ficticio'),
  ('83000000-0000-0000-0000-0000000000e2', '10000000-0000-0000-0000-00000000000a', '81000000-0000-0000-0000-0000000000e2', 'Contacto de Otro');
insert into public.quotes (id, tenant_id, company_id, branch_id, client_id, code) values
  ('84000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1',
   '30000000-0000-0000-0000-0000000000a1', '81000000-0000-0000-0000-0000000000e1', 'PRE-EXPT');
insert into public.quote_versions (id, tenant_id, quote_id, version_number, ss_rates) values
  ('85000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-00000000000a', '84000000-0000-0000-0000-0000000000e1', 1, '{}');
insert into public.quote_positions (id, tenant_id, quote_id, version_id, name, annual_base_salary, annual_hours) values
  ('86000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-00000000000a', '84000000-0000-0000-0000-0000000000e1',
   '85000000-0000-0000-0000-0000000000e1', 'Mozo', 22000, 1750);
insert into public.requests (id, tenant_id, company_id, branch_id, code, client_id, quote_id, quote_version_id, quote_position_id,
  positions_count, position_name, salary_hour, start_date) values
  ('87000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1',
   '30000000-0000-0000-0000-0000000000a1', 'PET-EXPT', '81000000-0000-0000-0000-0000000000e1', '84000000-0000-0000-0000-0000000000e1',
   '85000000-0000-0000-0000-0000000000e1', '86000000-0000-0000-0000-0000000000e1', 1, 'Mozo', 12.57, current_date + 10);
alter table public.requests enable trigger trg_requests_before_write;
insert into public.candidates (id, tenant_id, code, first_name) values
  ('88000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-00000000000a', 'CAN-EXPT', 'Persona Ficticia');
insert into public.documents (id, tenant_id, entity_type, entity_id, type_id, name, storage_path, mime_type, size_bytes) values
  ('8c000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-00000000000a', 'request', '87000000-0000-0000-0000-0000000000e1',
   (select id from public.catalog_items where tenant_id = '10000000-0000-0000-0000-00000000000a' and code = 'request_cpd_signed'),
   'CPD firmado.pdf', '10000000-0000-0000-0000-00000000000a/request/87000000-0000-0000-0000-0000000000e1/cpd.pdf', 'application/pdf', 100);

select pg_temp.login('a0000000-0000-0000-0000-000000000002');
insert into public.applications (id, tenant_id, candidate_id, request_id, origin, legal_basis) values
  ('8b000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-00000000000a', '88000000-0000-0000-0000-0000000000e1',
   '87000000-0000-0000-0000-0000000000e1', 'applied', 'precontractual');
update public.applications set stage = 'proposed',
  slot_id = (select id from public.request_slots where request_id = '87000000-0000-0000-0000-0000000000e1' and slot_number = 1)
where id = '8b000000-0000-0000-0000-0000000000e1';
select is((select count(*)::int from public.hiring_files where application_id = '8b000000-0000-0000-0000-0000000000e1'), 0,
          'propuesta, aún sin expediente');
update public.applications set stage = 'confirmed' where id = '8b000000-0000-0000-0000-0000000000e1';
select results_eq(
  $$ select status::text, start_date, slot_id is not null from public.hiring_files where application_id = '8b000000-0000-0000-0000-0000000000e1' $$,
  $$ values ('open', current_date + 10, true) $$,
  'al confirmarla se abre el expediente de la persona y la plaza, con la fecha de inicio de la petición');
select throws_ok(
  $$ insert into public.hiring_files (tenant_id, application_id, candidate_id, request_id)
     values ('10000000-0000-0000-0000-00000000000a', '8b000000-0000-0000-0000-0000000000e1', '88000000-0000-0000-0000-0000000000e1',
             '87000000-0000-0000-0000-0000000000e1') $$,
  '42501', null, 'a mano no se abren expedientes');
select throws_ok(
  $$ update public.hiring_files set prl_training_date = current_date where application_id = '8b000000-0000-0000-0000-0000000000e1' $$,
  '42501', null, 'Selección no registra la PRL (hiring_files.prl)');
select throws_ok(
  $$ update public.hiring_files set ss_registration_date = current_date where application_id = '8b000000-0000-0000-0000-0000000000e1' $$,
  '42501', null, 'ni el alta (hiring_files.ss)');
select lives_ok(
  $$ update public.hiring_files set notes = 'Pidió el DNI renovado' where application_id = '8b000000-0000-0000-0000-0000000000e1' $$,
  'pero sí las notas (tiene documentación)');
select throws_ok(
  $$ insert into public.request_declarations (tenant_id, request_id, kind, affirmative, channel, declared_at)
     values ('10000000-0000-0000-0000-00000000000a', '87000000-0000-0000-0000-0000000000e1', 'strike', false, 'email', current_date) $$,
  '42501', null, 'las declaraciones del art. 8 las registra hiring_files.cpd');
select throws_ok(
  $$ update public.requests set hazardous_exception_basis = 'Base ficticia de la excepción' where id = '87000000-0000-0000-0000-0000000000e1' $$,
  '42501', null, 'y la excepción de trabajos peligrosos, también');
select ok((select count(*) = 1 from public.hiring_files where application_id = '8b000000-0000-0000-0000-0000000000e1'),
          'Selección ve el expediente de su sucursal');
reset role;

-- ---------------------------------------------------------------------------
-- Administrador de A: pasos
-- ---------------------------------------------------------------------------
select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select throws_ok(
  $$ update public.hiring_files set health_surveillance_result = 'apto', health_surveillance_date = current_date
     where application_id = '8b000000-0000-0000-0000-0000000000e1' $$,
  '23514', null, 'de la vigilancia de la salud solo apto, no apto o renuncia (nunca el diagnóstico)');
select throws_ok(
  $$ update public.hiring_files set health_surveillance_result = 'fit' where application_id = '8b000000-0000-0000-0000-0000000000e1' $$,
  '23514', null, 'con su fecha');
select throws_ok(
  $$ update public.hiring_files set prl_training_date = current_date, prl_training_document_id = '8c000000-0000-0000-0000-0000000000e1'
     where application_id = '8b000000-0000-0000-0000-0000000000e1' $$,
  'TN422', null, 'el certificado tiene que ser un documento del expediente');
select throws_ok(
  $$ update public.hiring_files set candidate_id = gen_random_uuid() where application_id = '8b000000-0000-0000-0000-0000000000e1' $$,
  'TN422', null, 'la persona, la petición y la plaza no se cambian a mano');
update public.hiring_files set ss_registration_date = current_date + 9 where application_id = '8b000000-0000-0000-0000-0000000000e1';
select is((select ss_registration_recorded_by from public.hiring_files where application_id = '8b000000-0000-0000-0000-0000000000e1'),
          'a0000000-0000-0000-0000-000000000001'::uuid, 'el alta guarda quién la registró');

select throws_ok(
  $$ insert into public.employment_contracts (tenant_id, hiring_file_id, kind, contract_key, start_date, end_date)
     select tenant_id, id, 'production', '410', current_date + 10, current_date + 100 from public.hiring_files
     where application_id = '8b000000-0000-0000-0000-0000000000e1' $$,
  'TN422', null, 'la clave tiene que ser del tipo de contrato (402/502 producción)');
select throws_ok(
  $$ insert into public.employment_contracts (tenant_id, hiring_file_id, kind, contract_key, start_date)
     select tenant_id, id, 'production', '402', current_date + 10 from public.hiring_files
     where application_id = '8b000000-0000-0000-0000-0000000000e1' $$,
  '23514', null, 'el de circunstancias de la producción lleva fecha de fin');
select lives_ok(
  $$ insert into public.employment_contracts (id, tenant_id, hiring_file_id, kind, contract_key, start_date, end_date)
     select '8d000000-0000-0000-0000-0000000000e1', tenant_id, id, 'production', '402', current_date + 10, current_date + 100
     from public.hiring_files where application_id = '8b000000-0000-0000-0000-0000000000e1' $$,
  'se registra el contrato');
select ok(cardinality(private.candidate_legal_retention('10000000-0000-0000-0000-00000000000a', '88000000-0000-0000-0000-0000000000e1')) = 2,
          'con contrato y alta, al anonimizar hay que conservarlos');

select throws_ok(
  $$ insert into public.request_declarations (tenant_id, request_id, kind, affirmative, contact_id, channel, declared_at)
     values ('10000000-0000-0000-0000-00000000000a', '87000000-0000-0000-0000-0000000000e1', 'strike', false,
             '83000000-0000-0000-0000-0000000000e2', 'email', current_date) $$,
  'TN422', null, 'quien declara es un contacto del cliente de la petición');
select lives_ok(
  $$ insert into public.request_declarations (id, tenant_id, request_id, kind, affirmative, contact_id, channel, declared_at)
     values ('8e000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-00000000000a', '87000000-0000-0000-0000-0000000000e1',
             'strike', false, '83000000-0000-0000-0000-0000000000e1', 'email', current_date) $$,
  'el cliente declara que no hay huelga (registrado por la ETT)');
select is((select recorded_by from public.request_declarations where id = '8e000000-0000-0000-0000-0000000000e1'),
          'a0000000-0000-0000-0000-000000000001'::uuid, 'con quién lo registró');
select throws_ok(
  $$ update public.request_declarations set affirmative = true where id = '8e000000-0000-0000-0000-0000000000e1' $$,
  '42501', null, 'una declaración no se cambia: se registra otra');
update public.requests set cpd_signed_at = current_date, cpd_signed_document_id = '8c000000-0000-0000-0000-0000000000e1'
where id = '87000000-0000-0000-0000-0000000000e1';
select is((select cpd_signed_recorded_by from public.requests where id = '87000000-0000-0000-0000-0000000000e1'),
          'a0000000-0000-0000-0000-000000000001'::uuid, 'el CPD firmado guarda quién lo registró');
select ok(exists (select 1 from public.activity_log where entity_type = 'hiring_file' and parent_id = '87000000-0000-0000-0000-0000000000e1'
                  and action = 'create'),
          'el expediente queda en el historial de la petición');
reset role;

-- ---------------------------------------------------------------------------
-- Liberar la plaza cancela el expediente; otra ETT no lo ve
-- ---------------------------------------------------------------------------
select pg_temp.login('a0000000-0000-0000-0000-000000000002');
update public.applications set stage = 'interview', slot_id = null where id = '8b000000-0000-0000-0000-0000000000e1';
select results_eq(
  $$ select status::text, cancel_reason::text from public.hiring_files where application_id = '8b000000-0000-0000-0000-0000000000e1' $$,
  $$ values ('cancelled', 'Se libera la plaza') $$,
  'si la candidatura deja de estar confirmada, el expediente se cancela');
reset role;

select pg_temp.login('b0000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.hiring_files where application_id = '8b000000-0000-0000-0000-0000000000e1'), 0,
          'otra ETT no ve el expediente');
select is((select count(*)::int from public.request_declarations where request_id = '87000000-0000-0000-0000-0000000000e1'), 0,
          'ni las declaraciones');
reset role;

select * from finish();
