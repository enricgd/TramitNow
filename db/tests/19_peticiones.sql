-- Peticiones: solo de presupuestos aceptados, condiciones copiadas e inmutables, plazas que siguen al número,
-- cancelación con motivo, cerrada o cancelada solo se reabre, CPD previo desactualizado al cambiar, convenio vigente
-- (art. 11), historial, documentos y RLS. Datos inventados (REGCON 99999999999961).
select plan(26);

-- ---------------------------------------------------------------------------
-- Preparación (como postgres): convenio publicado, cliente con centro y firmante, presupuesto aceptado.
-- ---------------------------------------------------------------------------
select count(*) from private.load_agreement_file(jsonb_build_object(
  'agreement', jsonb_build_object('regcon', '99999999999961', 'name', 'Convenio ficticio de peticiones',
    'scope', 'provincial', 'territory', '48', 'cnae', jsonb_build_array('52'), 'validFrom', '2026-01-01', 'validTo', null),
  'publications', jsonb_build_array(jsonb_build_object('id', 'p1', 'bulletin', 'BOB', 'date', '2026-02-01',
    'number', 'PRUEBA-PET-1', 'url', null, 'type', 'texto_inicial')),
  'versions', jsonb_build_array(jsonb_build_object('publication', 'p1', 'effectiveFrom', '2026-01-01', 'effectiveTo', null,
    'categories', jsonb_build_array(jsonb_build_object('code', 'G1', 'name', 'Mozo (ficticio)')),
    'salaryItems', jsonb_build_array(
      jsonb_build_object('category', 'G1', 'concept', 'salario_base', 'amount', 1500, 'unit', 'mes'),
      jsonb_build_object('category', null, 'concept', 'plus_convenio', 'amount', 50, 'unit', 'mes')),
    'conditions', jsonb_build_object('annualHours', 1750, 'vacationDays', 30, 'vacationDaysType', 'naturales',
      'extraPayments', 2)))), 'contenidos.1@example.test');

create function pg_temp.av() returns uuid language sql as $$
  select v.id from public.agreement_versions v join public.agreements a on a.id = v.agreement_id
  where a.regcon = '99999999999961'
$$;

select pg_temp.login('90000000-0000-0000-0000-000000000002');
update public.agreement_versions set reviewed_by = '90000000-0000-0000-0000-000000000002' where id = pg_temp.av();
update public.agreement_versions set status = 'publicada' where id = pg_temp.av();
reset role;

insert into public.collective_agreements (id, tenant_id, code, name, global_agreement_id) values
  ('43000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-00000000000a', 'PET', 'Convenio ficticio enlazado',
   (select id from public.agreements where regcon = '99999999999961'));
insert into public.clients (id, tenant_id, company_id, branch_id, code, legal_name) values
  ('81000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1',
   '30000000-0000-0000-0000-0000000000a1', 'PET1', 'Cliente Ficticio de Peticiones, S.L.'),
  ('81000000-0000-0000-0000-0000000000c2', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1',
   '30000000-0000-0000-0000-0000000000a1', 'PET2', 'Otro Cliente Ficticio, S.L.');
insert into public.client_contacts (id, tenant_id, client_id, name, signs_cpds) values
  ('83000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-00000000000a', '81000000-0000-0000-0000-0000000000c1', 'Firmante Ficticio', true),
  ('83000000-0000-0000-0000-0000000000c2', '10000000-0000-0000-0000-00000000000a', '81000000-0000-0000-0000-0000000000c2', 'De otro cliente', true);
insert into public.client_centers (id, tenant_id, client_id, branch_id, code, name) values
  ('82000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-00000000000a', '81000000-0000-0000-0000-0000000000c1',
   '30000000-0000-0000-0000-0000000000a1', 'C1', 'Nave ficticia');

select pg_temp.login('a0000000-0000-0000-0000-000000000001');
insert into public.quotes (id, tenant_id, company_id, branch_id, client_id, code) values
  ('84000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1',
   '30000000-0000-0000-0000-0000000000a1', '81000000-0000-0000-0000-0000000000c1', 'PRE-PET-1'),
  ('84000000-0000-0000-0000-0000000000c2', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1',
   '30000000-0000-0000-0000-0000000000a1', '81000000-0000-0000-0000-0000000000c1', 'PRE-PET-2');
insert into public.quote_versions (id, tenant_id, quote_id, version_number, ss_rates) values
  ('85000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-00000000000a', '84000000-0000-0000-0000-0000000000c1', 1, '{}'),
  ('85000000-0000-0000-0000-0000000000c2', '10000000-0000-0000-0000-00000000000a', '84000000-0000-0000-0000-0000000000c2', 1, '{}');
insert into public.quote_positions (id, tenant_id, quote_id, version_id, name, description, collective_agreement_id,
  agreement_version_id, agreement_category_id, annual_base_salary, monthly_bonus, annual_hours, people, hours_per_person,
  hourly_rate, extras, calc_gross_salary_hour, calc_rate_hour, calc_margin_percent, calc_result)
select v.id_pos, '10000000-0000-0000-0000-00000000000a', v.quote_id, v.version_id, 'Mozo', 'Carga y descarga',
  '43000000-0000-0000-0000-0000000000c1', pg_temp.av(), (select id from public.agreement_categories where version_id = pg_temp.av()),
  21000, 50, 1750, 4, 480, 20, '[{"code": "night", "name": "Nocturnidad", "print": true}]', 13.4, 20, 25,
  '{"costHour": 15, "extras": [{"code": "night", "salaryHour": 16.75, "rateHour": 25}]}'
from (values ('86000000-0000-0000-0000-0000000000c1'::uuid, '84000000-0000-0000-0000-0000000000c1'::uuid, '85000000-0000-0000-0000-0000000000c1'::uuid),
             ('86000000-0000-0000-0000-0000000000c2'::uuid, '84000000-0000-0000-0000-0000000000c2'::uuid, '85000000-0000-0000-0000-0000000000c2'::uuid))
  as v (id_pos, quote_id, version_id);
update public.quote_versions set status = 'sent' where id = '85000000-0000-0000-0000-0000000000c1';
update public.quote_versions set status = 'accepted' where id = '85000000-0000-0000-0000-0000000000c1';
reset role;

select ok(exists (select 1 from public.role_permissions rp join public.roles r on r.id = rp.role_id
                  where r.code = 'seleccion' and rp.permission_code = 'requests.manage'
                    and r.tenant_id = '10000000-0000-0000-0000-00000000000a'),
          'Selección gestiona peticiones');
select ok(exists (select 1 from public.catalog_items where tenant_id = '10000000-0000-0000-0000-00000000000a'
                  and catalog = 'document_type' and code = 'request_pre_cpd'),
          'cada ETT tiene el tipo de documento del CPD previo');

-- ---------------------------------------------------------------------------
-- Selección de A: ve el presupuesto aceptado (no el otro) y crea peticiones
-- ---------------------------------------------------------------------------
select pg_temp.login('a0000000-0000-0000-0000-000000000002');
select results_eq(
  $$ select code::text from public.quotes where id in ('84000000-0000-0000-0000-0000000000c1', '84000000-0000-0000-0000-0000000000c2') $$,
  $$ values ('PRE-PET-1') $$,
  'Selección ve el presupuesto aceptado, no el borrador');
select throws_ok(
  $$ insert into public.requests (tenant_id, code, quote_position_id, positions_count, position_name, salary_hour, client_id,
       company_id, quote_id, quote_version_id)
     values ('10000000-0000-0000-0000-00000000000a', 'PET-X', '86000000-0000-0000-0000-0000000000c2', 1, 'x', 0,
       '81000000-0000-0000-0000-0000000000c1', '20000000-0000-0000-0000-0000000000a1', '84000000-0000-0000-0000-0000000000c2',
       '85000000-0000-0000-0000-0000000000c2') $$,
  'TN409', null, 'de un presupuesto sin aceptar no sale una petición');
select lives_ok(
  $$ insert into public.requests (id, tenant_id, code, quote_position_id, positions_count, client_center_id,
       position_name, salary_hour, rate_hour, status, legal_checks, pre_cpd_status)
     values ('87000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-00000000000a',
       (select formatted from private.next_number('10000000-0000-0000-0000-00000000000a', 'request', 2026, '20000000-0000-0000-0000-0000000000a1')),
       '86000000-0000-0000-0000-0000000000c1', 3, '82000000-0000-0000-0000-0000000000c1', 'Inventado', 1, 99, 'closed', '{}', 'reviewed') $$,
  'Selección crea una petición de un puesto aceptado');
select results_eq(
  $$ select position_name::text, salary_hour, rate_hour, status::text, legal_checks is null, pre_cpd_status::text,
            client_id, branch_id, created_by
     from public.requests where id = '87000000-0000-0000-0000-0000000000c1' $$,
  $$ values ('Mozo', 12.3429::numeric, 20::numeric, 'new', true, 'pending', '81000000-0000-0000-0000-0000000000c1'::uuid,
             '30000000-0000-0000-0000-0000000000a1'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid) $$,
  'la base de datos copia las condiciones del puesto y no hace caso a las que se mandan');
select is((select extras from public.requests where id = '87000000-0000-0000-0000-0000000000c1'),
          '[{"code": "night", "name": "Nocturnidad", "print": true, "rateHour": 25, "salaryHour": 16.75}]'::jsonb,
          'los conceptos extra se copian con su salario y su tarifa');
select is((select count(*)::int from public.request_slots where request_id = '87000000-0000-0000-0000-0000000000c1'), 3,
          'una plaza por cada una pedida');
select throws_ok(
  $$ update public.requests set rate_hour = 30 where id = '87000000-0000-0000-0000-0000000000c1' $$,
  'TN422', null, 'las condiciones del presupuesto no cambian en la petición');
select throws_ok(
  $$ update public.requests set client_signer_contact_id = '83000000-0000-0000-0000-0000000000c2' where id = '87000000-0000-0000-0000-0000000000c1' $$,
  'TN422', null, 'el firmante tiene que ser del cliente');

update public.requests set positions_count = 5 where id = '87000000-0000-0000-0000-0000000000c1';
select results_eq(
  $$ select array_agg(slot_number order by slot_number) from public.request_slots where request_id = '87000000-0000-0000-0000-0000000000c1' $$,
  $$ values (array[1, 2, 3, 4, 5]) $$, 'subir las plazas añade las que faltan');
update public.requests set positions_count = 2 where id = '87000000-0000-0000-0000-0000000000c1';
select results_eq(
  $$ select array_agg(slot_number order by slot_number) from public.request_slots where request_id = '87000000-0000-0000-0000-0000000000c1' $$,
  $$ values (array[1, 2]) $$, 'bajarlas quita las últimas por cubrir');
select throws_ok(
  $$ insert into public.request_slots (tenant_id, request_id, slot_number)
     values ('10000000-0000-0000-0000-00000000000a', '87000000-0000-0000-0000-0000000000c1', 9) $$,
  '42501', null, 'las plazas no se tocan a mano');

-- Estados
select throws_ok(
  $$ update public.requests set status = 'cancelled' where id = '87000000-0000-0000-0000-0000000000c1' $$,
  'TN422', null, 'cancelar pide el motivo');
update public.requests set status = 'cancelled', cancel_reason = 'El cliente aplaza la campaña' where id = '87000000-0000-0000-0000-0000000000c1';
select ok((select cancelled_at is not null and cancelled_by = 'a0000000-0000-0000-0000-000000000002'
           from public.requests where id = '87000000-0000-0000-0000-0000000000c1'), 'queda quién y cuándo la canceló');
select throws_ok(
  $$ update public.requests set notes = 'Algo' where id = '87000000-0000-0000-0000-0000000000c1' $$,
  'TN409', null, 'cancelada no se cambia');
update public.requests set status = 'selecting' where id = '87000000-0000-0000-0000-0000000000c1';
select is((select cancel_reason from public.requests where id = '87000000-0000-0000-0000-0000000000c1'), null,
          'al reabrirla se quita el motivo');

-- CPD previo: generado y después cambia algo de lo que sale en él
update public.requests set pre_cpd_status = 'generated', pre_cpd_generated_at = now() where id = '87000000-0000-0000-0000-0000000000c1';
update public.requests set risks = 'Riesgos ficticios' where id = '87000000-0000-0000-0000-0000000000c1';
select ok((select pre_cpd_outdated from public.requests where id = '87000000-0000-0000-0000-0000000000c1'),
          'el CPD previo queda desactualizado');

select set_eq(
  $$ select summary from public.activity_log where entity_type = 'request' and entity_id = '87000000-0000-0000-0000-0000000000c1'
       and summary in ('Cancelada: El cliente aplaza la campaña', 'Pasa a en selección', 'CPD previo generado') $$,
  $$ values ('CPD previo generado'), ('Cancelada: El cliente aplaza la campaña'), ('Pasa a en selección') $$,
  'el historial cuenta los cambios de estado y del CPD');
select results_eq(
  $$ select effective_from, effective_to, category_matched, minimum_salary_hour
     from private.request_agreement_periods('10000000-0000-0000-0000-00000000000a', '87000000-0000-0000-0000-0000000000c1') $$,
  $$ values ('2026-01-01'::date, null::date, true, 12.3429::numeric) $$,
  'el convenio vigente en las fechas de la petición, con el mínimo de la misma categoría');
update public.requests set hazardous_work = true where id = '87000000-0000-0000-0000-0000000000c1';
select ok((select hazardous_work from public.requests where id = '87000000-0000-0000-0000-0000000000c1'),
          'se guarda si es un trabajo especialmente peligroso');
select lives_ok(
  $$ insert into public.documents (tenant_id, entity_type, entity_id, type_id, name, storage_path, mime_type, size_bytes)
     values ('10000000-0000-0000-0000-00000000000a', 'request', '87000000-0000-0000-0000-0000000000c1',
       (select id from public.catalog_items where tenant_id = '10000000-0000-0000-0000-00000000000a' and code = 'request_client_order'),
       'Pedido ficticio.pdf', '10000000-0000-0000-0000-00000000000a/request/87000000-0000-0000-0000-0000000000c1/x.pdf',
       'application/pdf', 100) $$,
  'se suben documentos del servicio a la petición');
select throws_ok(
  $$ delete from public.requests where id = '87000000-0000-0000-0000-0000000000c1' $$,
  '42501', null, 'las peticiones no se borran');
reset role;

-- ---------------------------------------------------------------------------
-- Aislamiento
-- ---------------------------------------------------------------------------
select pg_temp.login('b0000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.requests where id = '87000000-0000-0000-0000-0000000000c1'), 0,
          'otra ETT no ve la petición');
select is((select count(*)::int from public.request_slots where request_id = '87000000-0000-0000-0000-0000000000c1'), 0,
          'ni sus plazas');
select is((select count(*)::int from public.activity_log where entity_id = '87000000-0000-0000-0000-0000000000c1'), 0,
          'ni su historial');
reset role;

select * from finish();
