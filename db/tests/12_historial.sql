-- Historial de actividad: los triggers de clientes, centros, contactos y facturación dejan rastro de quién, cuándo
-- y qué; nadie lo escribe a mano; se lee con la visibilidad de la entidad.

select plan(16);

-- Como admin de A, igual que haría la API.
select pg_temp.login('a0000000-0000-0000-0000-000000000001');

insert into public.clients (id, tenant_id, company_id, branch_id, code, legal_name, tax_id) values
  ('80000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1',
   '30000000-0000-0000-0000-0000000000a1', 'C1', 'Cliente Ficticio A1, S.L.', 'B00000001');
insert into public.client_centers (id, tenant_id, client_id, branch_id, code, name) values
  ('81000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000a1',
   '30000000-0000-0000-0000-0000000000a1', 'CT1', 'Almacén ficticio');
insert into public.client_contacts (id, tenant_id, client_id, name, email) values
  ('82000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000a1',
   'Contacto Ficticio', 'contacto@example.test');
insert into public.client_billing_profiles (tenant_id, client_id, iban, payment_term_days) values
  ('10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000a1', 'ES0000000000000000000000', 30);

update public.clients set trade_name = 'Ficticio', tax_id = 'B00000009' where id = '80000000-0000-0000-0000-0000000000a1';
update public.clients set updated_at = now() where id = '80000000-0000-0000-0000-0000000000a1';
update public.client_billing_profiles set iban = 'ES9900000000000000000000', payment_term_days = 45
  where client_id = '80000000-0000-0000-0000-0000000000a1';
update public.client_contacts set deleted_at = now() where id = '82000000-0000-0000-0000-0000000000a1';
delete from public.client_centers where id = '81000000-0000-0000-0000-0000000000a1';

select is(
  (select array_agg(action || ':' || entity_type order by id) from public.activity_log
   where tenant_id = '10000000-0000-0000-0000-00000000000a'),
  array['create:client', 'create:client_center', 'create:client_contact', 'create:client_billing',
        'update:client', 'update:client_billing', 'delete:client_contact', 'delete:client_center'],
  'cada cambio deja una entrada; tocar solo updated_at no cuenta');

select is(
  (select actor_user_id from public.activity_log where entity_type = 'client' and action = 'create'),
  'a0000000-0000-0000-0000-000000000001'::uuid, 'guarda quién lo hizo');
select is(
  (select summary from public.activity_log where entity_type = 'client_center' and action = 'create'),
  'Alta de centro de trabajo «Almacén ficticio»', 'resumen legible');
select is(
  (select summary from public.activity_log where entity_type = 'client_contact' and action = 'delete'),
  'Baja de contacto «Contacto Ficticio»', 'la baja lógica cuenta como baja');
select is(
  (select summary from public.activity_log where entity_type = 'client_center' and action = 'delete'),
  'Eliminación de centro de trabajo «Almacén ficticio»', 'el borrado definitivo deja rastro');
select is(
  (select parent_type || ':' || parent_id from public.activity_log where entity_type = 'client_center' and action = 'create'),
  'client:80000000-0000-0000-0000-0000000000a1', 'el centro cuelga de su cliente');
select is(
  (select changes from public.activity_log where entity_type = 'client' and action = 'update'),
  '{"trade_name": {"old": null, "new": "Ficticio"}, "tax_id": {"masked": true}}'::jsonb,
  'los cambios guardan antes y después, salvo los datos sensibles');
select is(
  (select changes from public.activity_log where entity_type = 'client_billing' and action = 'update'),
  '{"iban": {"masked": true}, "payment_term_days": {"old": 30, "new": 45}}'::jsonb,
  'el IBAN no se copia al historial');
select is(
  (select changes from public.activity_log where entity_type = 'client_contact' and action = 'create'),
  '{}'::jsonb, 'en el alta no se copia la fila');

-- Nadie lo escribe a mano.
select throws_ok(
  $$ insert into public.activity_log (tenant_id, entity_type, entity_id, action, summary)
     values ('10000000-0000-0000-0000-00000000000a', 'client', gen_random_uuid(), 'create', 'falso') $$,
  '42501', null, 'el historial no se escribe desde la API');
select throws_ok(
  $$ delete from public.activity_log $$, '42501', null, 'ni se borra');

-- Selección: ve el historial de los clientes (los ve todos), pero no el de facturación.
reset role;
select pg_temp.login('a0000000-0000-0000-0000-000000000002');
select is((select count(*)::int from public.activity_log), 6, 'selección ve el historial salvo la facturación');
select is((select count(*)::int from public.activity_log where entity_type = 'client_billing'), 0, 'sin clients.billing.manage no ve la facturación');
select is(
  (select count(*)::int from public.activity_log where entity_type = 'client_center'), 2,
  'el rastro de un centro borrado sigue visible en la ficha del cliente');

-- Otra ETT no ve nada.
reset role;
select pg_temp.login('b0000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.activity_log), 0, 'admin de B no ve el historial de A');

-- Borrar la ETT entera no falla por el historial.
reset role;
select lives_ok($$ delete from public.tenants where id = '10000000-0000-0000-0000-00000000000a' $$,
  'borrar una ETT no deja el historial apuntando a ella');

select * from finish();
