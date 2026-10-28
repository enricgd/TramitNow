-- Direcciones con los catálogos oficiales globales (municipio, provincia y país) y sus reglas.

select plan(7);

select is(
  (select municipality_code::text || '/' || province_code::text || '/' || country_code::text
   from public.addresses where id = '50000000-0000-0000-0000-0000000000a1'),
  '08019/08/ES', 'la dirección guarda los códigos oficiales; país España por defecto');

select throws_ok(
  $$ insert into public.addresses (tenant_id, street, province_code, municipality_code)
     values ('10000000-0000-0000-0000-00000000000a', 'Calle', '28', '08019') $$,
  '23514', null, 'el municipio tiene que ser de la provincia');
select throws_ok(
  $$ insert into public.addresses (tenant_id, street, municipality_code)
     values ('10000000-0000-0000-0000-00000000000a', 'Calle', '08019') $$,
  '23514', null, 'con municipio hace falta la provincia');
select throws_ok(
  $$ insert into public.addresses (tenant_id, street, country_code, province_code)
     values ('10000000-0000-0000-0000-00000000000a', 'Rue', 'FR', '08') $$,
  '23514', null, 'fuera de España no hay provincia');
select throws_ok(
  $$ insert into public.addresses (tenant_id, street, province_code, municipality_code)
     values ('10000000-0000-0000-0000-00000000000a', 'Calle', '08', '08999') $$,
  '23503', null, 'el municipio tiene que existir en el INE');
select throws_ok(
  $$ insert into public.addresses (tenant_id, street, country_code)
     values ('10000000-0000-0000-0000-00000000000a', 'Calle', 'XX') $$,
  '23503', null, 'el país tiene que existir en ISO 3166');
select lives_ok(
  $$ insert into public.addresses (tenant_id, street, city, country_code)
     values ('10000000-0000-0000-0000-00000000000a', 'Rue Exemple 1', 'Perpignan', 'FR') $$,
  'dirección extranjera con población en texto libre');

select * from finish();
