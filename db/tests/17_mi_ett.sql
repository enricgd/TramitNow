-- Mi ETT: datos legales y facturación de cada sociedad, CCC, servicios que factura, ajustes de presupuestos, series
-- configurables por la ETT y funciones de usuarios (email e invitación desde auth.users). Datos ficticios.
select plan(32);

-- Siembra de serie en las ETT nuevas
select is((select count(*)::int from public.billable_services where tenant_id = '10000000-0000-0000-0000-00000000000a'), 5,
          'cada ETT nueva empieza con 5 servicios que factura');
select is((select quote_no_response_days::int from public.tenants where id = '10000000-0000-0000-0000-00000000000a'), 15,
          'días sin respuesta: 15 por defecto');
select is((select quote_min_margin_percent from public.tenants where id = '10000000-0000-0000-0000-00000000000a'), null,
          'margen mínimo: sin mínimo por defecto');
select ok(private.valid_ccc('48000000160'), 'CCC con control correcto');
select ok(not private.valid_ccc('48000000161'), 'CCC con control incorrecto');

-- ---------------------------------------------------------------------------
-- Admin de A (tenant.manage)
-- ---------------------------------------------------------------------------
select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select lives_ok(
  $$ insert into public.company_legal_profiles (tenant_id, company_id, trade_name, ett_authorization_number,
       ett_authorization_scope, legal_rep_name, legal_rep_id_type, legal_rep_id_number, guarantee_type, guarantee_amount,
       guarantee_expires_on, certificate_holder, certificate_expires_on)
     values ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1', 'ETT Ficticia', '00/0000-ETT',
       'state', 'Representante Ficticio', 'dni', '00000000T', 'bank_guarantee', 100000, '2027-01-31',
       'ETT Ficticia A, S.L.', '2027-06-30') $$,
  'admin A guarda los datos legales de su sociedad');
select throws_ok(
  $$ update public.company_legal_profiles set ett_authorization_scope = 'regional' where company_id = '20000000-0000-0000-0000-0000000000a1' $$,
  '23514', null, 'una autorización autonómica exige la comunidad');
select lives_ok(
  $$ update public.company_legal_profiles set ett_authorization_scope = 'regional', ett_authorization_community_code = '16'
     where company_id = '20000000-0000-0000-0000-0000000000a1' $$,
  'autonómica con su comunidad');
select throws_ok(
  $$ update public.company_legal_profiles set legal_rep_id_type = null where company_id = '20000000-0000-0000-0000-0000000000a1' $$,
  '23514', null, 'el documento del representante va con su tipo');
select throws_ok(
  $$ insert into public.company_legal_profiles (tenant_id, company_id) values ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000b1') $$,
  '23503', null, 'no se apunta a una sociedad de otra ETT');
select lives_ok(
  $$ insert into public.company_billing_settings (tenant_id, company_id, iban, vat_rate)
     values ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1', 'ES0000000000000000000000', 21) $$,
  'admin A guarda la facturación de su sociedad');
select is((select currency::text from public.company_billing_settings where company_id = '20000000-0000-0000-0000-0000000000a1'), 'EUR',
          'moneda EUR por defecto');

select throws_ok(
  $$ insert into public.contribution_accounts (tenant_id, company_id, code, staff_type)
     values ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1', '48000000161', 'mission') $$,
  '23514', null, 'un CCC con el control mal no entra');
select lives_ok(
  $$ insert into public.contribution_accounts (tenant_id, company_id, branch_id, code, staff_type)
     values ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a1', '48000000160', 'mission') $$,
  'admin A da de alta un CCC de su sucursal');
select is((select province_code::text from public.contribution_accounts where code = '48000000160'), '48',
          'la provincia sale de las 2 primeras cifras');
select throws_ok(
  $$ insert into public.contribution_accounts (tenant_id, company_id, code, staff_type)
     values ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1', '48000000160', 'structure') $$,
  '23505', null, 'el mismo CCC no se repite');
select throws_ok(
  $$ insert into public.contribution_accounts (tenant_id, company_id, branch_id, code, staff_type)
     values ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000b1', '48000000261', 'mission') $$,
  '23503', null, 'la sucursal del CCC es de su sociedad');

select lives_ok(
  $$ insert into public.number_series (tenant_id, document_kind, company_id, year, prefix, last_number)
     values ('10000000-0000-0000-0000-00000000000a', 'credit_note', '20000000-0000-0000-0000-0000000000a1', 2026, 'R2026-', 3) $$,
  'admin A crea la serie de rectificativas siguiendo la numeración anterior');
select is((select formatted from private.next_number('10000000-0000-0000-0000-00000000000a', 'credit_note', 2026, '20000000-0000-0000-0000-0000000000a1')),
          'R2026-00004', 'y sigue por el 4');
select lives_ok(
  $$ update public.number_series set last_number = 107, prefix = 'F2026-' where document_kind = 'credit_note' $$,
  'adelantar la numeración se puede');
select throws_ok(
  $$ update public.number_series set last_number = 10 where document_kind = 'credit_note' $$,
  'TN409', null, 'atrasarla, no');
select throws_ok(
  $$ update public.number_series set year = 2027 where document_kind = 'credit_note' $$,
  'TN409', null, 'ni cambiar el año de una serie');
select lives_ok(
  $$ update public.tenants set quote_min_margin_percent = 12.5, quote_no_response_days = 20 where id = '10000000-0000-0000-0000-00000000000a' $$,
  'admin A fija el margen mínimo y los días sin respuesta');

select is((select count(*)::int from private.membership_auth_info('10000000-0000-0000-0000-00000000000a') where email like '%@example.test'), 4,
          'admin A ve el email de los usuarios de A');
select is((select invitation_pending from private.membership_auth_info('10000000-0000-0000-0000-00000000000a')
           join public.memberships m on m.id = membership_id where m.user_id = 'a0000000-0000-0000-0000-000000000002'), true,
          'quien nunca ha entrado figura con la invitación pendiente');
select is((select count(*)::int from private.find_auth_user('10000000-0000-0000-0000-00000000000a', 'ADMIN.B@example.test')), 1,
          'admin A encuentra una cuenta existente por email (sin distinguir mayúsculas)');
select ok(private.invited_user_removable('10000000-0000-0000-0000-00000000000a', 'f0000000-0000-0000-0000-000000000001'),
          'una cuenta sin ETT que nunca entró se puede borrar al revocar');
select ok(not private.invited_user_removable('10000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-000000000001'),
          'una cuenta que está en otra ETT, no');
reset role;

-- ---------------------------------------------------------------------------
-- Selección de A (sin tenant.manage ni users.manage) y admin de B
-- ---------------------------------------------------------------------------
select pg_temp.login('a0000000-0000-0000-0000-000000000002');
select is((select count(*)::int from public.company_legal_profiles), 1, 'selección A lee los datos legales (CPD, contratos)');
select results_eq(
  $$ with u as (update public.company_billing_settings set vat_rate = 0 returning 1) select count(*)::int from u $$,
  array[0], 'selección A no cambia la facturación');
select is((select count(*)::int from private.membership_auth_info('10000000-0000-0000-0000-00000000000a')), 0,
          'sin users.manage no se ven los emails');
reset role;

select pg_temp.login('b0000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.contribution_accounts), 0, 'admin B no ve los CCC de A');
reset role;

select * from finish();
