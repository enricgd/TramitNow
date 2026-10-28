-- Clientes, centros, contactos y facturación: todos los miembros leen, se escribe con clients.manage en sus
-- sucursales, la facturación solo con clients.billing.manage, y las reglas de NIF, contactos y categorías.

select plan(26);

-- Datos de prueba propios, como postgres. Ficticios.
insert into public.clients (id, tenant_id, company_id, branch_id, code, legal_name, tax_id) values
  ('80000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1',
   '30000000-0000-0000-0000-0000000000a1', 'C1', 'Cliente Ficticio A1, S.L.', 'B00000001'),
  ('80000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1',
   '30000000-0000-0000-0000-0000000000a2', 'C2', 'Cliente Ficticio A2, S.L.', 'B00000002'),
  ('80000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-0000000000b1',
   '30000000-0000-0000-0000-0000000000b1', 'C1', 'Cliente Ficticio B, S.L.', 'B00000001');

insert into public.client_centers (id, tenant_id, client_id, branch_id, code, name, ccc) values
  ('81000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000a1',
   '30000000-0000-0000-0000-0000000000a1', 'CT1', 'Almacén ficticio', '08000000000'),
  ('81000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000a2',
   '30000000-0000-0000-0000-0000000000a2', 'CT1', 'Fábrica ficticia', null);

insert into public.client_contacts (tenant_id, client_id, center_id, name, email, is_main) values
  ('10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000a1', '81000000-0000-0000-0000-0000000000a1',
   'Contacto Ficticio', 'contacto@example.test', true);

insert into public.client_billing_profiles (tenant_id, client_id, iban, payment_term_days) values
  ('10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000a1', 'ES0000000000000000000000', 30);

-- ---------------------------------------------------------------------------
-- Permisos de serie
-- ---------------------------------------------------------------------------
select is(
  (select array_agg(r.code order by r.code) from public.role_permissions rp
   join public.roles r on r.tenant_id = rp.tenant_id and r.id = rp.role_id
   where rp.tenant_id = '10000000-0000-0000-0000-00000000000a' and rp.permission_code = 'clients.manage'),
  array['admin', 'comercial', 'director_zona', 'laboral']::varchar[], 'clients.manage: admin, comercial, director de zona y laboral');
select is(
  (select array_agg(r.code) from public.role_permissions rp
   join public.roles r on r.tenant_id = rp.tenant_id and r.id = rp.role_id
   where rp.tenant_id = '10000000-0000-0000-0000-00000000000a' and rp.permission_code = 'clients.billing.manage'),
  array['admin']::varchar[], 'clients.billing.manage: solo admin');

-- ---------------------------------------------------------------------------
-- Selección (sucursal A1, sin clients.manage): lee todos los clientes de A, no escribe
-- ---------------------------------------------------------------------------
select pg_temp.login('a0000000-0000-0000-0000-000000000002');
select is((select count(*)::int from public.clients), 2, 'selección ve todos los clientes de su ETT (también de otra sucursal)');
select is((select count(*)::int from public.client_centers), 2, 'selección ve todos los centros de su ETT');
select is((select count(*)::int from public.client_contacts), 1, 'selección ve los contactos');
select is((select count(*)::int from public.client_billing_profiles), 0, 'selección no ve la facturación');
select throws_ok(
  $$ insert into public.clients (tenant_id, company_id, branch_id, code, legal_name)
     values ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a1', 'X', 'No') $$,
  '42501', null, 'selección no crea clientes');

-- ---------------------------------------------------------------------------
-- Comercial (sucursal A1): escribe en los clientes y centros de su sucursal, no en los de otra
-- ---------------------------------------------------------------------------
reset role;
update public.memberships set role_id = (
  select id from public.roles where tenant_id = '10000000-0000-0000-0000-00000000000a' and code = 'comercial'
) where user_id = 'a0000000-0000-0000-0000-000000000002';
select pg_temp.login('a0000000-0000-0000-0000-000000000002');

select lives_ok(
  $$ insert into public.clients (tenant_id, company_id, branch_id, code, legal_name, status)
     values ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a1', 'C3', 'Prospecto Ficticio', 'prospect') $$,
  'comercial crea un cliente en su sucursal');
select throws_ok(
  $$ insert into public.clients (tenant_id, company_id, branch_id, code, legal_name)
     values ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a2', 'C4', 'No') $$,
  '42501', null, 'comercial no crea clientes en otra sucursal');
update public.clients set phone = '900000000' where id = '80000000-0000-0000-0000-0000000000a2';
update public.client_centers set phone = '900000000' where id = '81000000-0000-0000-0000-0000000000a2';
select lives_ok(
  $$ insert into public.client_contacts (tenant_id, client_id, name) values
     ('10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000a1', 'Otro Contacto') $$,
  'comercial añade contactos a un cliente de su sucursal');
select throws_ok(
  $$ insert into public.client_contacts (tenant_id, client_id, name) values
     ('10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000a2', 'No') $$,
  '42501', null, 'comercial no añade contactos a un cliente de otra sucursal');
select throws_ok(
  $$ insert into public.client_billing_profiles (tenant_id, client_id)
     values ('10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000a2') $$,
  '42501', null, 'comercial no escribe la facturación');
reset role;
select is((select phone::text from public.clients where id = '80000000-0000-0000-0000-0000000000a2'), null, 'comercial no edita un cliente de otra sucursal');
select is((select phone::text from public.client_centers where id = '81000000-0000-0000-0000-0000000000a2'), null, 'comercial no edita un centro de otra sucursal');

-- ---------------------------------------------------------------------------
-- Admin A: facturación; admin B: nada de A
-- ---------------------------------------------------------------------------
select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select is((select payment_term_days::int from public.client_billing_profiles), 30, 'admin ve la facturación');
reset role;
select pg_temp.login('b0000000-0000-0000-0000-000000000001');
select is((select array_agg(distinct tenant_id) from public.clients), array['10000000-0000-0000-0000-00000000000b'::uuid], 'admin B solo ve los clientes de B');
select is((select count(*)::int from public.client_contacts), 0, 'admin B no ve contactos de A');
select is((select count(*)::int from public.client_billing_profiles), 0, 'admin B no ve la facturación de A');
reset role;

-- ---------------------------------------------------------------------------
-- Reglas de la tabla (como postgres)
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ insert into public.clients (tenant_id, company_id, branch_id, code, legal_name, tax_id)
     values ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a1', 'C9', 'Duplicado', 'B00000001') $$,
  '23505', null, 'NIF único por sociedad');
select throws_ok(
  $$ insert into public.client_contacts (tenant_id, client_id, name, document_type, document_number)
     values ('10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000a1', 'Sin firma', 'nif', '00000000T') $$,
  '23514', null, 'el DNI solo se guarda de quien firma los CPD');
select lives_ok(
  $$ insert into public.client_contacts (tenant_id, client_id, name, signs_cpds, document_type, document_number)
     values ('10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000a1', 'Firmante', true, 'nif', '00000000T') $$,
  'el firmante de los CPD sí lleva documento');
select throws_ok(
  $$ insert into public.client_contacts (tenant_id, client_id, center_id, name)
     values ('10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000a1', '81000000-0000-0000-0000-0000000000a2', 'Cruzado') $$,
  '23503', null, 'el centro del contacto es del mismo cliente');
select throws_ok(
  $$ insert into public.client_contacts (tenant_id, client_id, name, is_main)
     values ('10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000a1', 'Otro principal', true) $$,
  '23505', null, 'un solo contacto principal por cliente');
select throws_ok(
  $$ insert into public.client_billing_profiles (tenant_id, client_id, fixed_payment_days)
     values ('10000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-0000000000a2', array[5, 15, 25, 30]::smallint[]) $$,
  '23514', null, 'como mucho tres días fijos de pago');
select throws_ok(
  $$ insert into public.professional_categories (tenant_id, code, name, client_id)
     values ('10000000-0000-0000-0000-00000000000a', 'CATC', 'Sin sociedad', '80000000-0000-0000-0000-0000000000a1') $$,
  '23514', null, 'la categoría de un cliente es de la sociedad del cliente');
select lives_ok(
  $$ insert into public.professional_categories (tenant_id, code, name, company_id, client_id)
     values ('10000000-0000-0000-0000-00000000000a', 'CATC', 'Categoría del cliente', '20000000-0000-0000-0000-0000000000a1', '80000000-0000-0000-0000-0000000000a1') $$,
  'categoría propia de un cliente');

select * from finish();
