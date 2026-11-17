-- Candidatos: huella única por ETT, consentimientos que no cambian, salud solo con base legal, candidaturas y plazas,
-- anonimizar, auditoría de accesos que no se puede cambiar ni borrar, y RLS. Datos inventados (los «cifrados» son
-- textos de prueba con el formato de la API: aquí no hay claves).
select plan(34);

select ok(exists (select 1 from public.role_permissions rp join public.roles r on r.id = rp.role_id
                  where r.code = 'seleccion' and rp.permission_code = 'candidates.manage'
                    and r.tenant_id = '10000000-0000-0000-0000-00000000000a'),
          'Selección gestiona candidatos');
select ok(not exists (select 1 from public.role_permissions rp join public.roles r on r.id = rp.role_id
                      where r.code = 'seleccion' and rp.permission_code in ('personal_data.view', 'privacy.manage', 'privacy.audit')),
          'pero no ve los datos sensibles completos ni la auditoría');
select ok(exists (select 1 from public.catalog_items where tenant_id = '10000000-0000-0000-0000-00000000000a'
                  and catalog = 'candidate_profile' and 'toro' = any (synonyms)),
          'cada ETT tiene los perfiles de serie con sus sinónimos');
select is(private.search_norm('  Camarero  de BARRA Ñandú '), ' camarero de barra nandu ', 'la búsqueda no distingue acentos ni mayúsculas');

-- ---------------------------------------------------------------------------
-- Selección de A
-- ---------------------------------------------------------------------------
select pg_temp.login('a0000000-0000-0000-0000-000000000002');
select lives_ok(
  $$ insert into public.candidates (id, tenant_id, code, first_name, last_name, id_document_type, id_document_number_enc,
       id_document_fingerprint, id_document_hint, anonymized_at)
     values ('88000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', 'CAN-T1', 'Persona', 'Ficticia',
       'dni', 'v1:cifrado-de-prueba', repeat('a', 64), '678Z', now()) $$,
  'Selección da de alta un candidato');
select is((select anonymized_at from public.candidates where id = '88000000-0000-0000-0000-0000000000a1'), null,
          'no se puede dar de alta como anonimizado');
select throws_ok(
  $$ insert into public.candidates (tenant_id, code, first_name, id_document_type, id_document_number_enc, id_document_fingerprint)
     values ('10000000-0000-0000-0000-00000000000a', 'CAN-T2', 'Otra', 'dni', 'v1:otro', repeat('a', 64)) $$,
  '23505', null, 'la misma huella no se repite en la ETT');
select throws_ok(
  $$ insert into public.candidates (tenant_id, code, first_name, id_document_type, id_document_number_enc, id_document_fingerprint)
     values ('10000000-0000-0000-0000-00000000000a', 'CAN-T2', 'Otra', 'dni', '12345678Z', repeat('b', 64)) $$,
  '23514', null, 'el documento solo se guarda cifrado');
select throws_ok(
  $$ update public.candidates set health_enc = 'v1:salud', health_legal_basis = 'explicit_consent'
     where id = '88000000-0000-0000-0000-0000000000a1' $$,
  'TN422', null, 'salud con consentimiento: hace falta el consentimiento de salud vigente');
select throws_ok(
  $$ update public.candidates set health_enc = 'v1:salud' where id = '88000000-0000-0000-0000-0000000000a1' $$,
  '23514', null, 'salud sin base legal no entra');
reset role;

insert into public.privacy_notices (id, tenant_id, purpose, version, text) values
  ('89000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', 'talent_pool', 'T1', 'Texto ficticio de la bolsa');

select pg_temp.login('a0000000-0000-0000-0000-000000000002');
select throws_ok(
  $$ insert into public.privacy_notices (tenant_id, purpose, version, text)
     values ('10000000-0000-0000-0000-00000000000a', 'talent_pool', 'T2', 'x') $$,
  '42501', null, 'los textos legales los publica privacy.manage');
select throws_ok(
  $$ insert into public.applications (tenant_id, candidate_id, request_id, origin, legal_basis)
     select '10000000-0000-0000-0000-00000000000a', '88000000-0000-0000-0000-0000000000a1', gen_random_uuid(), 'sourced', 'consent' $$,
  'TN409', null, 'sin petición abierta no hay candidatura');
select lives_ok(
  $$ insert into public.candidate_consents (id, tenant_id, candidate_id, purpose, notice_id, channel, expires_at)
     values ('8a000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '88000000-0000-0000-0000-0000000000a1',
       'talent_pool', '89000000-0000-0000-0000-0000000000a1', 'paper', now() + interval '50 years') $$,
  'se registra el consentimiento de la bolsa');
select ok((select expires_at between now() + interval '23 months' and now() + interval '25 months'
           from public.candidate_consents where id = '8a000000-0000-0000-0000-0000000000a1'),
          'caduca a los meses de la ETT (24), lo pone la base de datos');
select throws_ok(
  $$ update public.candidate_consents set given_at = now() - interval '1 day' where id = '8a000000-0000-0000-0000-0000000000a1' $$,
  'TN409', null, 'un consentimiento no cambia');
update public.candidate_consents set withdrawn_at = now() where id = '8a000000-0000-0000-0000-0000000000a1';
select ok(not private.candidate_has_consent('10000000-0000-0000-0000-00000000000a', '88000000-0000-0000-0000-0000000000a1', 'talent_pool'),
          'retirado, deja de valer');
select throws_ok(
  $$ delete from public.candidates where id = '88000000-0000-0000-0000-0000000000a1' $$,
  '42501', null, 'un candidato no se borra: se anonimiza');
reset role;

-- ---------------------------------------------------------------------------
-- Candidaturas y plazas (petición de prueba insertada como postgres, sin pasar por las reglas de presupuestos)
-- ---------------------------------------------------------------------------
alter table public.requests disable trigger trg_requests_before_write;
insert into public.clients (id, tenant_id, company_id, branch_id, code, legal_name) values
  ('81000000-0000-0000-0000-0000000000d1', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1',
   '30000000-0000-0000-0000-0000000000a1', 'CANT', 'Cliente Ficticio, S.L.');
insert into public.quotes (id, tenant_id, company_id, branch_id, client_id, code) values
  ('84000000-0000-0000-0000-0000000000d1', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1',
   '30000000-0000-0000-0000-0000000000a1', '81000000-0000-0000-0000-0000000000d1', 'PRE-CANT');
insert into public.quote_versions (id, tenant_id, quote_id, version_number, ss_rates) values
  ('85000000-0000-0000-0000-0000000000d1', '10000000-0000-0000-0000-00000000000a', '84000000-0000-0000-0000-0000000000d1', 1, '{}');
insert into public.quote_positions (id, tenant_id, quote_id, version_id, name, annual_base_salary, annual_hours) values
  ('86000000-0000-0000-0000-0000000000d1', '10000000-0000-0000-0000-00000000000a', '84000000-0000-0000-0000-0000000000d1',
   '85000000-0000-0000-0000-0000000000d1', 'Mozo', 22000, 1750);
insert into public.requests (id, tenant_id, company_id, branch_id, code, client_id, quote_id, quote_version_id, quote_position_id,
  positions_count, position_name, salary_hour) values
  ('87000000-0000-0000-0000-0000000000d1', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1',
   '30000000-0000-0000-0000-0000000000a1', 'PET-CANT', '81000000-0000-0000-0000-0000000000d1', '84000000-0000-0000-0000-0000000000d1',
   '85000000-0000-0000-0000-0000000000d1', '86000000-0000-0000-0000-0000000000d1', 2, 'Mozo', 12.57);
alter table public.requests enable trigger trg_requests_before_write;

select pg_temp.login('a0000000-0000-0000-0000-000000000002');
select throws_ok(
  $$ insert into public.applications (tenant_id, candidate_id, request_id, origin, legal_basis)
     values ('10000000-0000-0000-0000-00000000000a', '88000000-0000-0000-0000-0000000000a1', '87000000-0000-0000-0000-0000000000d1', 'sourced', 'consent') $$,
  'TN409', null, 'sacarla de la bolsa sin consentimiento vigente, no');
select lives_ok(
  $$ insert into public.applications (id, tenant_id, candidate_id, request_id, origin, legal_basis)
     values ('8b000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '88000000-0000-0000-0000-0000000000a1',
       '87000000-0000-0000-0000-0000000000d1', 'applied', 'consent') $$,
  'si se inscribe ella, sí');
select is((select legal_basis::text from public.applications where id = '8b000000-0000-0000-0000-0000000000a1'), 'precontractual',
          'la base legal la decide la base de datos por el origen');
update public.applications set candidate_accepted_at = now(), candidate_accepted_channel = 'phone'
where id = '8b000000-0000-0000-0000-0000000000a1';
select is((select candidate_accepted_by from public.applications where id = '8b000000-0000-0000-0000-0000000000a1'),
          'a0000000-0000-0000-0000-000000000002'::uuid, 'la aceptación de la candidatura guarda quién la anotó');
select throws_ok(
  $$ update public.applications set candidate_accepted_channel = 'email' where id = '8b000000-0000-0000-0000-0000000000a1' $$,
  'TN409', null, 'y no se cambia');
update public.applications set stage = 'proposed',
  slot_id = (select id from public.request_slots where request_id = '87000000-0000-0000-0000-0000000000d1' and slot_number = 1)
where id = '8b000000-0000-0000-0000-0000000000a1';
select results_eq(
  $$ select status::text, application_id from public.request_slots where request_id = '87000000-0000-0000-0000-0000000000d1' order by slot_number $$,
  $$ values ('reserved', '8b000000-0000-0000-0000-0000000000a1'::uuid), ('open', null::uuid) $$,
  'proponerla reserva la plaza');
update public.applications set stage = 'confirmed' where id = '8b000000-0000-0000-0000-0000000000a1';
select is((select status::text from public.request_slots where request_id = '87000000-0000-0000-0000-0000000000d1' and slot_number = 1),
          'covered', 'confirmarla la cubre');
select throws_ok(
  $$ update public.applications set stage = 'on_mission' where id = '8b000000-0000-0000-0000-0000000000a1' $$,
  'TN422', null, 'la misión es de la fase 7');
select throws_ok(
  $$ select private.anonymize_candidate('10000000-0000-0000-0000-00000000000a', '88000000-0000-0000-0000-0000000000a1', 'x') $$,
  '42501', null, 'anonimizar exige privacy.manage');
reset role;

select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select throws_ok(
  $$ select private.anonymize_candidate('10000000-0000-0000-0000-00000000000a', '88000000-0000-0000-0000-0000000000a1', 'x') $$,
  'TN409', null, 'con una plaza confirmada no se anonimiza');
update public.applications set stage = 'discarded' where id = '8b000000-0000-0000-0000-0000000000a1';
select is((select status::text from public.request_slots where request_id = '87000000-0000-0000-0000-0000000000d1' and slot_number = 1),
          'open', 'descartarla deja la plaza por cubrir');
select lives_ok(
  $$ select private.anonymize_candidate('10000000-0000-0000-0000-00000000000a', '88000000-0000-0000-0000-0000000000a1', 'Supresión') $$,
  'el administrador anonimiza');
select results_eq(
  $$ select first_name::text, last_name, id_document_number_enc, id_document_fingerprint::text from public.candidates
     where id = '88000000-0000-0000-0000-0000000000a1' $$,
  $$ values ('Persona anonimizada', null::varchar, null::text, null::text) $$,
  'sin datos personales ni huella');

-- Auditoría: ni la API ni nadie la cambia; solo se lee con privacy.audit.
select throws_ok(
  $$ update public.access_log set details = '{}' $$, '42501', null, 'la auditoría no se cambia');
select throws_ok(
  $$ delete from public.access_log $$, '42501', null, 'ni se borra');
reset role;
select throws_ok(
  $$ delete from public.access_log where candidate_id = '88000000-0000-0000-0000-0000000000a1' $$,
  '42501', null, 'tampoco como postgres antes de su plazo de conservación');

select pg_temp.login('b0000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.candidates where id = '88000000-0000-0000-0000-0000000000a1'), 0,
          'otra ETT no ve al candidato');
reset role;

select * from finish();
