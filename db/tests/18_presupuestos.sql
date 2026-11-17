-- Presupuestos: salario nunca por debajo del convenio de la empresa usuaria (art. 11 Ley 14/1994), aprobación del
-- margen por debajo del mínimo, versiones cerradas al enviar, transiciones de estado, obsoleto, historial, documentos
-- y RLS. Datos inventados (REGCON 999999999999xx).
select plan(41);

-- ---------------------------------------------------------------------------
-- Preparación (como postgres): convenio global publicado, convenios de las ETT, clientes y un comercial de A.
-- ---------------------------------------------------------------------------
select count(*) from private.load_agreement_file(jsonb_build_object(
  'agreement', jsonb_build_object('regcon', '99999999999931', 'name', 'Convenio ficticio de presupuestos',
    'scope', 'provincial', 'territory', '48', 'cnae', jsonb_build_array('52'), 'validFrom', '2026-01-01', 'validTo', null),
  'publications', jsonb_build_array(jsonb_build_object('id', 'p1', 'bulletin', 'BOB', 'date', '2026-02-01',
    'number', 'PRUEBA-P1', 'url', null, 'type', 'texto_inicial')),
  'versions', jsonb_build_array(jsonb_build_object('publication', 'p1', 'effectiveFrom', '2026-01-01', 'effectiveTo', null,
    'categories', jsonb_build_array(jsonb_build_object('code', 'G1', 'name', 'Mozo (ficticio)')),
    'salaryItems', jsonb_build_array(
      jsonb_build_object('category', 'G1', 'concept', 'salario_base', 'amount', 1500, 'unit', 'mes'),
      jsonb_build_object('category', null, 'concept', 'plus_convenio', 'amount', 50, 'unit', 'mes')),
    'conditions', jsonb_build_object('annualHours', 1750, 'vacationDays', 30, 'vacationDaysType', 'naturales',
      'extraPayments', 2)))), 'contenidos.1@example.test');

create function pg_temp.av() returns uuid language sql as $$
  select v.id from public.agreement_versions v join public.agreements a on a.id = v.agreement_id
  where a.regcon = '99999999999931'
$$;
create function pg_temp.cat() returns uuid language sql as $$
  select c.id from public.agreement_categories c where c.version_id = pg_temp.av()
$$;

select pg_temp.login('90000000-0000-0000-0000-000000000002');
update public.agreement_versions set reviewed_by = '90000000-0000-0000-0000-000000000002' where id = pg_temp.av();
update public.agreement_versions set status = 'publicada' where id = pg_temp.av();
reset role;

insert into public.collective_agreements (id, tenant_id, code, name, global_agreement_id) values
  ('43000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', 'PRE', 'Convenio ficticio enlazado',
   (select id from public.agreements where regcon = '99999999999931')),
  ('43000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', 'OTRO', 'Convenio ficticio sin tabla', null);
insert into public.clients (id, tenant_id, company_id, branch_id, code, legal_name, sector_code, default_agreement_id) values
  ('81000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1',
   '30000000-0000-0000-0000-0000000000a1', 'P1', 'Cliente Ficticio de Presupuestos, S.L.', '52', '43000000-0000-0000-0000-0000000000a1');
insert into public.client_contacts (id, tenant_id, client_id, name, email, is_quote_recipient) values
  ('83000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '81000000-0000-0000-0000-0000000000a1',
   'Contacto Ficticio', 'contacto@example.test', true);
update public.tenants set quote_min_margin_percent = 15 where id = '10000000-0000-0000-0000-00000000000a';

insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000003', 'comercial.a@example.test', '{"full_name": "Comercial A"}');
insert into public.memberships (tenant_id, user_id, role_id)
select '10000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000003', r.id
from public.roles r where r.tenant_id = '10000000-0000-0000-0000-00000000000a' and r.code = 'comercial';
insert into public.user_contexts (tenant_id, membership_id, company_id, branch_id, is_default)
select m.tenant_id, m.id, '20000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a1', true
from public.memberships m where m.user_id = 'a0000000-0000-0000-0000-000000000003';

select ok(exists (select 1 from public.role_permissions rp join public.roles r on r.id = rp.role_id
                  where r.code = 'comercial' and rp.permission_code = 'quotes.manage'
                    and r.tenant_id = '10000000-0000-0000-0000-00000000000a'),
          'el rol comercial puede gestionar presupuestos');
select ok(not exists (select 1 from public.role_permissions rp join public.roles r on r.id = rp.role_id
                      where r.code = 'comercial' and rp.permission_code = 'quotes.view_costs')
          and exists (select 1 from public.role_permissions rp join public.roles r on r.id = rp.role_id
                      where r.code = 'director_zona' and rp.permission_code = 'quotes.view_costs'
                        and r.tenant_id = '10000000-0000-0000-0000-00000000000a'),
          'costes y margen: dirección sí, comercial no');
select ok(exists (select 1 from public.catalog_items where tenant_id = '10000000-0000-0000-0000-00000000000a'
                  and catalog = 'quote_rejection_reason' and code = 'price'),
          'cada ETT tiene los motivos de rechazo de serie');

-- ---------------------------------------------------------------------------
-- Alta y salario de convenio (admin de A)
-- ---------------------------------------------------------------------------
select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select lives_ok(
  $$ insert into public.quotes (id, tenant_id, company_id, branch_id, client_id, code)
     values ('84000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1',
       '30000000-0000-0000-0000-0000000000a1', '81000000-0000-0000-0000-0000000000a1',
       (select formatted from private.next_number('10000000-0000-0000-0000-00000000000a', 'quote', 2026, '20000000-0000-0000-0000-0000000000a1'))) $$,
  'admin A crea un presupuesto con el número de la serie');
select is((select created_by from public.quotes where id = '84000000-0000-0000-0000-0000000000a1'),
          'a0000000-0000-0000-0000-000000000001'::uuid, 'queda quién lo creó');
select lives_ok(
  $$ insert into public.quote_versions (id, tenant_id, quote_id, version_number, title, contact_id, ss_rates)
     values ('85000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '84000000-0000-0000-0000-0000000000a1',
       1, 'Campaña ficticia', '83000000-0000-0000-0000-0000000000a1', '{"atEp": 3.5}') $$,
  'y su versión 1');

-- Mínimo: (1500 × 14 + 50 × 12) / 1750 = 12,3429 €/h
select throws_ok(
  format($$ insert into public.quote_positions (tenant_id, quote_id, version_id, name, collective_agreement_id,
       agreement_version_id, agreement_category_id, annual_base_salary, monthly_bonus, annual_hours)
     values ('10000000-0000-0000-0000-00000000000a', '84000000-0000-0000-0000-0000000000a1', '85000000-0000-0000-0000-0000000000a1',
       'Mozo', '43000000-0000-0000-0000-0000000000a1', %L, %L, 20000, 50, 1750) $$, pg_temp.av(), pg_temp.cat()),
  'TNSAL', null, 'un salario por debajo del convenio de la empresa usuaria no entra');
select lives_ok(
  format($$ insert into public.quote_positions (id, tenant_id, quote_id, version_id, name, collective_agreement_id,
       agreement_version_id, agreement_category_id, annual_base_salary, monthly_bonus, annual_hours, people, hours_per_person, hourly_rate)
     values ('86000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '84000000-0000-0000-0000-0000000000a1',
       '85000000-0000-0000-0000-0000000000a1', 'Mozo', '43000000-0000-0000-0000-0000000000a1', %L, %L, 21000, 50, 1750, 4, 480, 17) $$,
    pg_temp.av(), pg_temp.cat()),
  'igual al convenio, sí');
select is((select agreement_minimum_salary_hour from public.quote_positions where id = '86000000-0000-0000-0000-0000000000a1'),
          12.3429::numeric, 'la base de datos calcula el mínimo del convenio');
select is((select agreement_period_from from public.quote_positions where id = '86000000-0000-0000-0000-0000000000a1'),
          '2026-01-01'::date, 'y guarda el periodo de la versión usada');
select throws_ok(
  $$ update public.quote_positions set annual_hours = 1800 where id = '86000000-0000-0000-0000-0000000000a1' $$,
  'TNSAL', null, 'más horas por el mismo salario también baja del convenio');
select throws_ok(
  $$ update public.quote_positions set agreement_minimum_salary_hour = 1, annual_base_salary = 15000
     where id = '86000000-0000-0000-0000-0000000000a1' $$,
  'TNSAL', null, 'el mínimo no se puede falsear desde fuera');
select throws_ok(
  format($$ insert into public.quote_positions (tenant_id, quote_id, version_id, name, collective_agreement_id,
       agreement_version_id, agreement_category_id, annual_base_salary, annual_hours)
     values ('10000000-0000-0000-0000-00000000000a', '84000000-0000-0000-0000-0000000000a1', '85000000-0000-0000-0000-0000000000a1',
       'Mozo', '43000000-0000-0000-0000-0000000000a2', %L, %L, 30000, 1750) $$, pg_temp.av(), pg_temp.cat()),
  'TN422', null, 'la versión del convenio tiene que ser del convenio elegido');
select lives_ok(
  $$ insert into public.quote_positions (id, tenant_id, quote_id, version_id, name, collective_agreement_id, custom_category_name,
       annual_base_salary, annual_hours, people, hours_per_person, hourly_rate)
     values ('86000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', '84000000-0000-0000-0000-0000000000a1',
       '85000000-0000-0000-0000-0000000000a1', 'Carretillero', '43000000-0000-0000-0000-0000000000a2', 'Otro (ficticio)',
       18000, 1750, 2, 480, 18) $$,
  'sin tabla de convenio (personalizado) se rellena a mano');

-- ---------------------------------------------------------------------------
-- Envío y margen mínimo (15 %)
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ update public.quote_versions set status = 'sent' where id = '85000000-0000-0000-0000-0000000000a1' $$,
  'TN422', 'Falta calcular algún puesto', 'sin el cálculo de la API no se envía');
update public.quote_positions set calc_margin_percent = 10 where version_id = '85000000-0000-0000-0000-0000000000a1';
select throws_ok(
  $$ update public.quote_versions set status = 'sent' where id = '85000000-0000-0000-0000-0000000000a1' $$,
  'TNAPR', null, 'con el margen por debajo del mínimo hace falta aprobación');
reset role;

select pg_temp.login('a0000000-0000-0000-0000-000000000003');
select lives_ok(
  $$ update public.quote_versions set approval_status = 'pending', approval_notes = 'Cliente estratégico'
     where id = '85000000-0000-0000-0000-0000000000a1' $$,
  'el comercial pide la aprobación');
select is((select approval_requested_by from public.quote_versions where id = '85000000-0000-0000-0000-0000000000a1'),
          'a0000000-0000-0000-0000-000000000003'::uuid, 'queda quién la pidió');
select throws_ok(
  $$ update public.quote_versions set approval_status = 'approved' where id = '85000000-0000-0000-0000-0000000000a1' $$,
  '42501', null, 'el comercial no se la aprueba');
reset role;

select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select lives_ok(
  $$ update public.quote_versions set approval_status = 'approved' where id = '85000000-0000-0000-0000-0000000000a1' $$,
  'un responsable la aprueba');
select ok((select approval_decided_by = 'a0000000-0000-0000-0000-000000000001' and approval_decided_at is not null
           from public.quote_versions where id = '85000000-0000-0000-0000-0000000000a1'), 'queda quién y cuándo');
reset role;

select pg_temp.login('a0000000-0000-0000-0000-000000000003');
update public.quote_positions set hourly_rate = 16.5 where id = '86000000-0000-0000-0000-0000000000a1';
select is((select approval_status from public.quote_versions where id = '85000000-0000-0000-0000-0000000000a1'), null,
          'cambiar un puesto anula la aprobación');
update public.quote_positions set calc_margin_percent = 9 where id = '86000000-0000-0000-0000-0000000000a1';
reset role;

select pg_temp.login('a0000000-0000-0000-0000-000000000001');
update public.quote_versions set approval_status = 'approved' where id = '85000000-0000-0000-0000-0000000000a1';
select is((select approval_status from public.quote_versions where id = '85000000-0000-0000-0000-0000000000a1'), 'approved',
          'el cálculo guardado no anula la aprobación');
reset role;

select pg_temp.login('a0000000-0000-0000-0000-000000000003');
select lives_ok(
  $$ update public.quote_versions set status = 'sent' where id = '85000000-0000-0000-0000-0000000000a1' $$,
  'aprobado, el comercial lo envía');
select ok((select sent_by = 'a0000000-0000-0000-0000-000000000003' and min_margin_percent = 15
           from public.quote_versions where id = '85000000-0000-0000-0000-0000000000a1'),
          'queda quién lo envió y con qué mínimo');
select throws_ok(
  $$ update public.quote_versions set title = 'Otro' where id = '85000000-0000-0000-0000-0000000000a1' $$,
  'TN409', null, 'lo enviado no cambia');
select throws_ok(
  $$ update public.quote_positions set people = 9 where id = '86000000-0000-0000-0000-0000000000a1' $$,
  'TN409', null, 'ni sus puestos');
select throws_ok(
  $$ update public.quote_versions set status = 'draft' where id = '85000000-0000-0000-0000-0000000000a1' $$,
  'TN409', null, 'de enviado no se vuelve a borrador');
select throws_ok(
  $$ update public.quote_versions set status = 'rejected' where id = '85000000-0000-0000-0000-0000000000a1' $$,
  '23514', null, 'rechazar exige el motivo');
select lives_ok(
  $$ update public.quote_versions set status = 'rejected', rejection_notes = 'Precio alto (ficticio)',
       rejection_reason_id = (select id from public.catalog_items where tenant_id = '10000000-0000-0000-0000-00000000000a'
                              and catalog = 'quote_rejection_reason' and code = 'price')
     where id = '85000000-0000-0000-0000-0000000000a1' $$,
  'rechazado con motivo');

-- Nueva versión: la anterior queda sustituida.
select throws_ok(
  $$ update public.quote_versions set status = 'superseded' where id = '85000000-0000-0000-0000-0000000000a1' $$,
  'TN409', null, 'sin versión nueva no se sustituye');
insert into public.quote_versions (id, tenant_id, quote_id, version_number, title, ss_rates)
values ('85000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', '84000000-0000-0000-0000-0000000000a1',
        2, 'Campaña ficticia v2', '{}');
select lives_ok(
  $$ update public.quote_versions set status = 'superseded' where id = '85000000-0000-0000-0000-0000000000a1' $$,
  'con la v2, la v1 queda sustituida');
select ok(exists (select 1 from public.activity_log where entity_type = 'quote_version'
                  and entity_id = '85000000-0000-0000-0000-0000000000a1' and summary = 'Envío al cliente (v1)'),
          'el historial registra el envío');
select throws_ok(
  $$ delete from public.quotes where id = '84000000-0000-0000-0000-0000000000a1' $$,
  '42501', null, 'un presupuesto no se borra');
select ok(private.document_entity_writable('10000000-0000-0000-0000-00000000000a', 'quote', '84000000-0000-0000-0000-0000000000a1'),
          'el comercial puede añadir documentos al presupuesto');
reset role;

-- ---------------------------------------------------------------------------
-- Obsoleto y visibilidad
-- ---------------------------------------------------------------------------
select pg_temp.login('a0000000-0000-0000-0000-000000000001');
insert into public.quotes (id, tenant_id, company_id, branch_id, code)
values ('84000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1',
        '30000000-0000-0000-0000-0000000000a2', 'PRUEBA-A2');
select lives_ok(
  $$ update public.quotes set obsolete_reason = 'Cambian las tablas del convenio' where id = '84000000-0000-0000-0000-0000000000a1' $$,
  'pasa a obsoleto con motivo');
select lives_ok(
  $$ update public.quote_versions set status = 'obsolete' where id = '85000000-0000-0000-0000-0000000000a2' $$,
  'y su versión actual también');
select throws_ok(
  $$ update public.quotes set branch_id = '30000000-0000-0000-0000-0000000000a2' where id = '84000000-0000-0000-0000-0000000000a1' $$,
  'TN409', null, 'lo obsoleto ya no cambia');
reset role;

select pg_temp.login('a0000000-0000-0000-0000-000000000003');
select is((select count(*)::int from public.quotes where tenant_id = '10000000-0000-0000-0000-00000000000a'), 1,
          'el comercial solo ve los de su sucursal');
reset role;
select pg_temp.login('a0000000-0000-0000-0000-000000000002');
select is((select count(*)::int from public.quotes), 0, 'selección no ve presupuestos');
reset role;
select pg_temp.login('b0000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.quote_positions), 0, 'admin B no ve nada de A');
reset role;

select * from finish();
