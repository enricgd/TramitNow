-- Catálogo global de convenios: carga idempotente, flujo borrador → en revisión → publicada → retirada, revisión a
-- cuatro ojos, inmutabilidad de lo publicado, lectura de las ETT y del equipo de contenidos, y enlace desde
-- collective_agreements. Datos inventados (REGCON 999999999999xx).
select plan(45);

create function pg_temp.fichero(p_amount numeric default 1500) returns jsonb language sql as $$
  select jsonb_build_object(
    'agreement', jsonb_build_object('regcon', '99999999999911', 'name', 'Convenio ficticio de pruebas',
      'scope', 'provincial', 'territory', '48', 'cnae', jsonb_build_array('52'), 'validFrom', '2025-01-01', 'validTo', null),
    'publications', jsonb_build_array(
      jsonb_build_object('id', 'p1', 'bulletin', 'BOB', 'date', '2025-03-10', 'number', 'PRUEBA-1',
        'url', 'https://example.test/1.pdf', 'type', 'texto_inicial'),
      jsonb_build_object('id', 'p2', 'bulletin', 'BOB', 'date', '2026-02-02', 'number', 'PRUEBA-2',
        'url', null, 'type', 'revision_salarial')),
    'versions', jsonb_build_array(
      jsonb_build_object('publication', 'p1', 'effectiveFrom', '2025-01-01', 'effectiveTo', '2025-12-31',
        'categories', jsonb_build_array(jsonb_build_object('code', 'G1', 'name', 'Mozo (ficticio)', 'group', 'Grupo 1', 'level', null)),
        'salaryItems', jsonb_build_array(
          jsonb_build_object('category', 'G1', 'concept', 'salario_base', 'label', 'Salario base', 'amount', p_amount,
            'unit', 'mes', 'salarial', true, 'source', 'Tabla I'),
          jsonb_build_object('category', null, 'concept', 'plus_transporte', 'amount', 3.5, 'unit', 'dia', 'salarial', false)),
        'conditions', jsonb_build_object('annualHours', 1752, 'vacationDays', 30, 'vacationDaysType', 'naturales',
          'extraPayments', 2, 'antiguedad', 'trienios')),
      jsonb_build_object('publication', 'p2', 'effectiveFrom', '2026-01-01', 'provisional', true,
        'categories', jsonb_build_array(jsonb_build_object('code', 'G1', 'name', 'Mozo (ficticio)')),
        'salaryItems', jsonb_build_array(jsonb_build_object('category', 'G1', 'concept', 'salario_base', 'amount', 1545, 'unit', 'mes')))),
    'pendingReview', jsonb_build_array('Duda ficticia'))
$$;

create function pg_temp.v(p_from date) returns uuid language sql as $$
  select v.id from public.agreement_versions v join public.agreements a on a.id = v.agreement_id
  where a.regcon = '99999999999911' and v.effective_from = p_from
$$;

-- ---------------------------------------------------------------------------
-- Carga (como postgres, la extracción es de cont1)
-- ---------------------------------------------------------------------------
select ok(
  (select count(*) from private.load_agreement_file(pg_temp.fichero(), 'contenidos.1@example.test')) > 0,
  'carga un fichero');
select is((select count(*)::int from public.agreement_versions v join public.agreements a on a.id = v.agreement_id
           where a.regcon = '99999999999911' and v.status = 'en_revision'), 2, 'sus dos versiones quedan en revisión');
select is((select province_code::text from public.agreements where regcon = '99999999999911'), '48',
          'territory de un provincial = provincia');
select is((select extra ->> 'antiguedad' from public.agreement_conditions where version_id = pg_temp.v('2025-01-01')),
          'trienios', 'lo que no tiene columna en conditions va a extra');
select is((select pending_review from public.agreement_versions where id = pg_temp.v('2025-01-01')), array['Duda ficticia'],
          'pendingReview llega a la versión');
select ok((select bool_and(r like '%sin cambios%' or r like '%datos generales%')
           from private.load_agreement_file(pg_temp.fichero(), 'contenidos.1@example.test') r),
          'cargarlo otra vez no cambia nada');
select is((select count(*)::int from public.agreement_salary_items where version_id = pg_temp.v('2025-01-01')), 2,
          'y no duplica importes');
select throws_ok(
  $$ select private.load_agreement_file(jsonb_set(pg_temp.fichero(), '{versions,0,salaryItems,0,unit}', '"semana"')) $$,
  '22023', null, 'una unidad no válida aborta la carga del fichero');
select throws_ok(
  $$ select private.load_agreement_file(jsonb_set(pg_temp.fichero(), '{agreement,territory}', '"99"')) $$,
  '22023', null, 'un territorio que no es provincia del INE aborta la carga');
select throws_ok(
  $$ select private.load_agreement_file(pg_temp.fichero(), 'admin.a@example.test') $$,
  '22023', null, 'EXTRAIDO_POR tiene que ser del equipo de contenidos');

-- ---------------------------------------------------------------------------
-- Nada publicado: las ETT no ven nada; el equipo de contenidos, todo
-- ---------------------------------------------------------------------------
select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.agreements where regcon = '99999999999911'), 0, 'ETT: no ve un convenio sin nada publicado');
select is((select count(*)::int from public.agreement_versions where id = pg_temp.v('2025-01-01')), 0, 'ETT: no ve versiones en revisión');
select throws_ok(
  $$ insert into public.agreements (regcon, name, scope) values ('99999999999912', 'X', 'estatal') $$,
  '42501', null, 'ETT: no escribe en el catálogo');
reset role;

select pg_temp.login('d0000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.agreement_versions where id = pg_temp.v('2025-01-01')), 0,
          'superadmin: tampoco ve lo que está en revisión (no es del equipo de contenidos)');
select throws_ok(
  $$ insert into public.agreements (regcon, name, scope) values ('99999999999912', 'X', 'estatal') $$,
  '42501', null, 'superadmin: no escribe en el catálogo');
reset role;

select pg_temp.login('90000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.agreement_versions v join public.agreements a on a.id = v.agreement_id
           where a.regcon = '99999999999911'), 2, 'contenidos: ve las versiones en revisión');
select is((select count(*)::int from public.companies), 0, 'contenidos: no ve datos de ninguna ETT');
select is((select count(*)::int from public.clients), 0, 'contenidos: no ve clientes');

-- ---------------------------------------------------------------------------
-- Revisión a cuatro ojos
-- ---------------------------------------------------------------------------
select throws_ok(
  format($$ update public.agreement_versions set reviewed_by = '90000000-0000-0000-0000-000000000001' where id = %L $$, pg_temp.v('2025-01-01')),
  'TN409', null, 'quien la extrajo no la revisa');
select throws_ok(
  format($$ update public.agreement_versions set status = 'publicada' where id = %L $$, pg_temp.v('2025-01-01')),
  'TN409', null, 'sin revisión no se publica');
reset role;

select pg_temp.login('90000000-0000-0000-0000-000000000002');
select throws_ok(
  format($$ update public.agreement_versions set reviewed_by = '90000000-0000-0000-0000-000000000001' where id = %L $$, pg_temp.v('2025-01-01')),
  'TN409', null, 'nadie marca la revisión en nombre de otro');
select lives_ok(
  format($$ update public.agreement_versions set reviewed_by = '90000000-0000-0000-0000-000000000002' where id = %L $$, pg_temp.v('2025-01-01')),
  'otra persona del equipo la revisa');
select ok((select reviewed_at is not null from public.agreement_versions where id = pg_temp.v('2025-01-01')), 'queda la fecha de revisión');
select lives_ok(
  format($$ update public.agreement_categories set name = 'Mozo de almacén (ficticio)' where version_id = %L $$, pg_temp.v('2025-01-01')),
  'cambiar el contenido en revisión se puede...');
select is((select reviewed_by from public.agreement_versions where id = pg_temp.v('2025-01-01')), null,
          '...pero quita la revisión hecha');
select lives_ok(
  format($$ update public.agreement_versions set reviewed_by = '90000000-0000-0000-0000-000000000002' where id = %L $$, pg_temp.v('2025-01-01')),
  'se vuelve a revisar');
select lives_ok(
  format($$ update public.agreement_versions set status = 'publicada' where id = %L $$, pg_temp.v('2025-01-01')),
  'y se publica');
select is((select published_by from public.agreement_versions where id = pg_temp.v('2025-01-01')),
          '90000000-0000-0000-0000-000000000002'::uuid, 'queda quién la publicó');

-- ---------------------------------------------------------------------------
-- Lo publicado no cambia
-- ---------------------------------------------------------------------------
select throws_ok(
  format($$ update public.agreement_versions set effective_to = '2025-11-30' where id = %L $$, pg_temp.v('2025-01-01')),
  'TN409', null, 'una versión publicada no se edita');
select throws_ok(
  format($$ update public.agreement_salary_items set amount = 1 where version_id = %L $$, pg_temp.v('2025-01-01')),
  'TN409', null, 'ni sus importes');
select throws_ok(
  format($$ insert into public.agreement_categories (version_id, code, name) values (%L, 'G9', 'Nueva') $$, pg_temp.v('2025-01-01')),
  'TN409', null, 'ni se le añaden categorías');
select throws_ok(
  format($$ delete from public.agreement_versions where id = %L $$, pg_temp.v('2025-01-01')),
  'TN409', null, 'ni se borra');
select throws_ok(
  $$ update public.agreement_publications set url = 'https://example.test/otra.pdf' where number = 'PRUEBA-1' $$,
  'TN409', null, 'ni cambia la publicación de la que sale');
reset role;

select ok((select bool_or(r like '%AVISO%') from private.load_agreement_file(pg_temp.fichero(1600)) r),
          'el cargador avisa y no toca una versión publicada que ha cambiado en el fichero');
select is((select amount from public.agreement_salary_items where version_id = pg_temp.v('2025-01-01') and concept = 'salario_base'),
          1500.0000::numeric, 'el importe publicado sigue igual');

-- ---------------------------------------------------------------------------
-- Lectura de las ETT y enlace desde sus convenios
-- ---------------------------------------------------------------------------
select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.agreement_versions v join public.agreements a on a.id = v.agreement_id
           where a.regcon = '99999999999911'), 1, 'ETT: ve solo la versión publicada');
select is((select count(*)::int from public.agreement_salary_items where version_id = pg_temp.v('2025-01-01')), 2,
          'ETT: ve sus importes');
select is((select count(*)::int from public.agreement_publications p join public.agreements a on a.id = p.agreement_id
           where a.regcon = '99999999999911'), 1, 'ETT: ve solo la publicación de lo publicado');
select lives_ok(
  $$ insert into public.collective_agreements (tenant_id, code, name, global_agreement_id)
     select '10000000-0000-0000-0000-00000000000a', 'GLOB', 'Del catálogo', id from public.agreements where regcon = '99999999999911' $$,
  'ETT: enlaza un convenio suyo con el del catálogo');
reset role;
insert into public.agreements (regcon, name, scope) values ('99999999999913', 'Sin publicar (ficticio)', 'estatal');
select set_config('test.unpublished', (select id::text from public.agreements where regcon = '99999999999913'), true);
select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select throws_ok(
  format($$ insert into public.collective_agreements (tenant_id, code, name, global_agreement_id)
     values ('10000000-0000-0000-0000-00000000000a', 'GLOB2', 'X', %L) $$, current_setting('test.unpublished')),
  'TN422', null, 'ETT: no enlaza un convenio del catálogo sin publicar');
reset role;

-- ---------------------------------------------------------------------------
-- Retirar
-- ---------------------------------------------------------------------------
select pg_temp.login('90000000-0000-0000-0000-000000000001');
select throws_ok(
  format($$ update public.agreement_versions set status = 'retirada' where id = %L $$, pg_temp.v('2025-01-01')),
  'TN422', null, 'retirar exige el motivo');
select lives_ok(
  format($$ update public.agreement_versions set status = 'retirada', withdrawal_reason = 'Error en la tabla (ficticio)' where id = %L $$,
         pg_temp.v('2025-01-01')),
  'se retira con motivo');
select throws_ok(
  format($$ update public.agreement_versions set status = 'publicada' where id = %L $$, pg_temp.v('2025-01-01')),
  'TN409', null, 'lo retirado no vuelve');
reset role;

select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select is((select status::text from public.agreement_versions where id = pg_temp.v('2025-01-01')), 'retirada',
          'ETT: sigue viendo la versión retirada (sus documentos pueden haberla usado)');
reset role;

set local role anon;
select throws_ok($$ select count(*) from public.agreements $$, '42501', null, 'anon no lee el catálogo');
reset role;

select * from finish();
