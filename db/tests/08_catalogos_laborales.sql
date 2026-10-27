-- Catálogos laborales por ETT (convenios, categorías, tipos de contrato, conceptos): aislamiento entre ETT
-- y escritura solo con labor_catalogs.manage (admin y laboral).

select plan(33);

-- Datos de prueba propios, como postgres. Ficticios.
insert into public.collective_agreements (id, tenant_id, code, name, scope, province_code) values
  ('70000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', 'LOG28', 'Convenio ficticio de logística A', 'provincial', '28'),
  ('70000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', 'LOG48', 'Convenio ficticio de logística B', 'provincial', '48');

insert into public.professional_categories (id, tenant_id, code, name, agreement_id, cno_code) values
  ('71000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', 'MOZO', 'Mozo de almacén A', '70000000-0000-0000-0000-0000000000a1', '9811'),
  ('71000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', 'MOZO', 'Mozo de almacén B', '70000000-0000-0000-0000-0000000000b1', '9811');

insert into public.payroll_concepts (id, tenant_id, code, name, concept_type, calculation, default_value) values
  ('72000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', 'HN', 'Hora normal A', 'normal_hour', 'fixed_hour', 10),
  ('72000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', 'HN', 'Hora normal B', 'normal_hour', 'fixed_hour', 10);

-- ---------------------------------------------------------------------------
-- Datos de serie al crear la ETT
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int from public.contract_types where tenant_id = '10000000-0000-0000-0000-00000000000a'),
  (select count(*)::int from public.contract_keys where active),
  'la ETT nace con un tipo de contrato por clave oficial activa');
select ok(
  (select count(*) = 2 from public.role_permissions rp join public.roles r on r.tenant_id = rp.tenant_id and r.id = rp.role_id
   where rp.tenant_id = '10000000-0000-0000-0000-00000000000a' and rp.permission_code = 'labor_catalogs.manage'
     and r.code in ('admin', 'laboral')),
  'admin y laboral nacen con labor_catalogs.manage');
select is(
  (select count(*)::int from public.role_permissions rp join public.roles r on r.tenant_id = rp.tenant_id and r.id = rp.role_id
   where rp.tenant_id = '10000000-0000-0000-0000-00000000000a' and rp.permission_code = 'labor_catalogs.manage'
     and r.code not in ('admin', 'laboral')),
  0, 'los demás roles no tienen labor_catalogs.manage');

-- ---------------------------------------------------------------------------
-- Lectura y aislamiento (admin A)
-- ---------------------------------------------------------------------------
select pg_temp.login('a0000000-0000-0000-0000-000000000001');

select is((select count(*)::int from public.collective_agreements), 1, 'admin A ve solo su convenio');
select is((select count(*)::int from public.professional_categories where tenant_id <> '10000000-0000-0000-0000-00000000000a'), 0, 'admin A no ve categorías de B');
select is((select count(*)::int from public.payroll_concepts where id = '72000000-0000-0000-0000-0000000000b1'), 0, 'admin A no ve el concepto de B ni pidiéndolo por id');
select is((select count(*)::int from public.contract_types where tenant_id <> '10000000-0000-0000-0000-00000000000a'), 0, 'admin A no ve tipos de contrato de B');
select ok((select count(*) from public.contract_types) > 0, 'admin A ve sus tipos de contrato');

-- Escritura sobre B
select throws_ok(
  $$ insert into public.collective_agreements (tenant_id, code, name) values ('10000000-0000-0000-0000-00000000000b', 'X', 'Intruso') $$,
  '42501', null, 'admin A no crea convenios en B');
select results_eq(
  $$ with u as (update public.payroll_concepts set name = 'hackeado' where tenant_id = '10000000-0000-0000-0000-00000000000b' returning 1) select count(*)::int from u $$,
  array[0], 'admin A no edita conceptos de B');
select results_eq(
  $$ with d as (delete from public.contract_types where tenant_id = '10000000-0000-0000-0000-00000000000b' returning 1) select count(*)::int from d $$,
  array[0], 'admin A no borra tipos de contrato de B');
select throws_ok(
  $$ update public.collective_agreements set tenant_id = '10000000-0000-0000-0000-00000000000b' where id = '70000000-0000-0000-0000-0000000000a1' $$,
  '42501', null, 'admin A no mueve un convenio a B');

-- FK compuestas: una fila de A no apunta a filas de B
select throws_ok(
  $$ insert into public.professional_categories (tenant_id, code, name, agreement_id)
     values ('10000000-0000-0000-0000-00000000000a', 'X', 'Cruzada', '70000000-0000-0000-0000-0000000000b1') $$,
  '23503', null, 'categoría de A no puede usar un convenio de B');
select throws_ok(
  $$ insert into public.professional_categories (tenant_id, code, name, company_id, branch_id)
     values ('10000000-0000-0000-0000-00000000000a', 'X', 'Cruzada', '20000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000b1') $$,
  '23503', null, 'categoría de A no puede ser de una sucursal de B');

-- Escritura legítima en A y reglas de los datos
select lives_ok(
  $$ insert into public.collective_agreements (tenant_id, code, name, scope, autonomous_community_code)
     values ('10000000-0000-0000-0000-00000000000a', 'HOST13', 'Convenio ficticio de hostelería', 'regional', '13') $$,
  'admin A crea un convenio');
select lives_ok(
  $$ insert into public.contract_types (tenant_id, code, name, contract_key_code)
     values ('10000000-0000-0000-0000-00000000000a', '403', 'Circunstancias de la producción previsibles', '402') $$,
  'admin A crea un tipo de contrato propio ligado a la clave 402');
select throws_ok(
  $$ insert into public.contract_types (tenant_id, code, name, contract_key_code)
     values ('10000000-0000-0000-0000-00000000000a', 'X', 'Clave inventada', '999') $$,
  '23503', null, 'un tipo de contrato exige una clave oficial existente');
select throws_ok(
  $$ insert into public.payroll_concepts (tenant_id, code, name, calculation, default_value)
     values ('10000000-0000-0000-0000-00000000000a', 'SS', 'SS empresa', 'percentage', 32.5) $$,
  '23514', null, 'un concepto en porcentaje exige la base de cálculo');
select lives_ok(
  $$ insert into public.payroll_concepts (tenant_id, code, name, concept_type, calculation, default_value, calculation_base, is_mandatory)
     values ('10000000-0000-0000-0000-00000000000a', 'SS', 'SS empresa', 'employer_cost', 'percentage', 32.5, 'total_salary_cost', true) $$,
  'admin A crea un concepto en porcentaje con su base');
select throws_ok(
  $$ insert into public.professional_categories (tenant_id, code, name) values ('10000000-0000-0000-0000-00000000000a', 'MOZO', 'Repetida') $$,
  '23505', null, 'no se repite el código de categoría en el mismo ámbito');
select lives_ok(
  $$ insert into public.professional_categories (tenant_id, code, name, company_id, branch_id)
     values ('10000000-0000-0000-0000-00000000000a', 'MOZO', 'Mozo de la sucursal A1', '20000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a1') $$,
  'el mismo código sí vale en otro ámbito (sucursal A1)');
select lives_ok(
  $$ update public.collective_agreements set deleted_at = now() where id = '70000000-0000-0000-0000-0000000000a1' $$,
  'admin A da de baja un convenio');
select lives_ok(
  $$ insert into public.collective_agreements (tenant_id, code, name) values ('10000000-0000-0000-0000-00000000000a', 'LOG28', 'Convenio ficticio de logística A (nuevo)') $$,
  'tras la baja, el código se puede reutilizar');

-- ---------------------------------------------------------------------------
-- Laboral de A: también gestiona los catálogos
-- ---------------------------------------------------------------------------
reset role;
update public.profiles set active_tenant_id = '10000000-0000-0000-0000-00000000000a' where id = 'c0000000-0000-0000-0000-000000000001';
select pg_temp.login('c0000000-0000-0000-0000-000000000001');
select ok((select private.has_permission('labor_catalogs.manage')), 'laboral A tiene labor_catalogs.manage');
select lives_ok(
  $$ insert into public.payroll_concepts (tenant_id, code, name, concept_type, calculation, default_value, is_salary)
     values ('10000000-0000-0000-0000-00000000000a', 'PTRANS', 'Plus transporte', 'allowance', 'fixed_day', 3.5, false) $$,
  'laboral A crea un concepto');
select results_eq(
  $$ with u as (update public.contract_types set status = 'inactive' where code = '541' returning 1) select count(*)::int from u $$,
  array[1], 'laboral A desactiva un tipo de contrato');

-- ---------------------------------------------------------------------------
-- Selección de A: lee, no escribe
-- ---------------------------------------------------------------------------
reset role;
select pg_temp.login('a0000000-0000-0000-0000-000000000002');
select ok((select count(*) from public.professional_categories) > 0, 'selección A lee categorías');
select ok((select count(*) from public.payroll_concepts) > 0, 'selección A lee conceptos');
select throws_ok(
  $$ insert into public.collective_agreements (tenant_id, code, name) values ('10000000-0000-0000-0000-00000000000a', 'S', 'Sin permiso') $$,
  '42501', null, 'selección A no crea convenios');
select results_eq(
  $$ with u as (update public.professional_categories set name = 'x' returning 1) select count(*)::int from u $$,
  array[0], 'selección A no edita categorías');
select results_eq(
  $$ with d as (delete from public.payroll_concepts returning 1) select count(*)::int from d $$,
  array[0], 'selección A no borra conceptos');

-- ---------------------------------------------------------------------------
-- Superadmin y admin de B
-- ---------------------------------------------------------------------------
reset role;
select pg_temp.login('d0000000-0000-0000-0000-000000000001');
select is((select count(distinct tenant_id)::int from public.collective_agreements), 2, 'el superadmin ve los convenios de todas las ETT');

reset role;
select pg_temp.login('b0000000-0000-0000-0000-000000000001');
select is((select array_agg(distinct tenant_id) from public.payroll_concepts), array['10000000-0000-0000-0000-00000000000b'::uuid], 'admin B solo ve los conceptos de B');

select * from finish();
