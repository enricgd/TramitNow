-- Numeración por series: consecutiva por ETT, clase, ámbito y año; sin huecos si la transacción se deshace; solo
-- en la ETT activa. La concurrencia (bloqueo de fila) se prueba en apps/api/test/series.test.ts, con dos conexiones.

select plan(12);

select pg_temp.login('a0000000-0000-0000-0000-000000000001');

select is((select formatted from private.next_number('10000000-0000-0000-0000-00000000000a', 'quote', 2026)),
  'PRE2026-00001', 'la primera vez crea la serie y da el 1');
select is((select number from private.next_number('10000000-0000-0000-0000-00000000000a', 'quote', 2026)),
  2, 'después, el siguiente');
select is((select formatted from private.next_number('10000000-0000-0000-0000-00000000000a', 'quote', 2027)),
  'PRE2027-00001', 'cada año empieza en 1');
select is((select formatted from private.next_number('10000000-0000-0000-0000-00000000000a', 'invoice', 2026)),
  'FAC2026-00001', 'cada clase de documento tiene su serie');
select is((select number from private.next_number('10000000-0000-0000-0000-00000000000a', 'invoice', 2026,
  '20000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a2')),
  1, 'serie propia por sociedad y sucursal');
select is((select number from private.next_number('10000000-0000-0000-0000-00000000000a', 'invoice', 2026)),
  2, 'la serie de toda la ETT sigue aparte');

-- Si la transacción se deshace, el número también: no quedan huecos.
savepoint antes;
select private.next_number('10000000-0000-0000-0000-00000000000a', 'request', 2026);
select private.next_number('10000000-0000-0000-0000-00000000000a', 'request', 2026);
rollback to savepoint antes;
select is((select number from private.next_number('10000000-0000-0000-0000-00000000000a', 'request', 2026)),
  1, 'lo deshecho no deja huecos');

select throws_ok(
  $$ select private.next_number('10000000-0000-0000-0000-00000000000b', 'quote', 2026) $$,
  '42501', null, 'no se numera en otra ETT');
select throws_ok(
  $$ select private.next_number('10000000-0000-0000-0000-00000000000a', 'invoice', 2026, '20000000-0000-0000-0000-0000000000a1',
       '30000000-0000-0000-0000-0000000000b1') $$,
  '23514', null, 'la sucursal tiene que ser de la sociedad (y de la ETT)');
select throws_ok(
  $$ update public.number_series set last_number = 0 $$, 'TN409', null, 'el contador no va nunca hacia atrás');
select is((select count(*)::int from public.number_series), 5, 'los miembros ven las series de su ETT');

reset role;
select pg_temp.login('b0000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.number_series), 0, 'otra ETT no las ve');

reset role;
select * from finish();
