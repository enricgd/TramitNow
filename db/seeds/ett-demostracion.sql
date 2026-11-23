-- ETT de demostración para enseñar el producto a posibles clientes: «Ejemplo Trabajo Temporal, S.L.» (código
-- DEMOSTRACION). Está aparte de la ETT DEMO para que las pruebas no se mezclen con la demo. Todo es ficticio: CIF,
-- CCC, representante y textos son de relleno.
--
-- Este seed crea la ETT, su sociedad, tres sucursales y Mi ETT (datos legales, CCC, series y el texto legal de la
-- bolsa), y hace administrador de ella a un usuario que ya existe, sin quitarle las ETT que ya tuviera. Los clientes,
-- presupuestos, peticiones y candidatos los crea después apps/api/scripts/sembrar-demostracion.ts por la API.
--
-- Uso, en el NAS (ver infra/nas/README.md, «ETT de demostración»):
--   sudo -n docker exec -i supabase-db psql -U postgres -d postgres -v email=tu@correo.com < db/seeds/ett-demostracion.sql
-- En local:
--   docker exec -i tramitnow-db-local psql -U postgres -d postgres -v email=demo@example.test < db/seeds/ett-demostracion.sql
--
-- Todo va en una transacción: si algo falla, no queda nada a medias. Si la ETT DEMOSTRACION ya existe, falla.

\set ON_ERROR_STOP on

\if :{?email}
\else
  \echo 'Falta el email del usuario: -v email=tu@correo.com'
  \quit
\endif

select count(*) = 1 as user_exists from auth.users where email = :'email' \gset
\if :user_exists
\else
  \echo 'No existe ningún usuario con ese email en Supabase Auth. Créalo antes en Studio (Authentication > Add user).'
  \quit
\endif

begin;

select id as user_id from auth.users where email = :'email' \gset

-- Falla (y deshace) si ya existe.
do $$
begin
  if exists (select 1 from public.tenants where code = 'DEMOSTRACION') then
    raise exception 'La ETT DEMOSTRACION ya existe: no se vuelve a crear';
  end if;
end $$;

-- Los roles de serie y las tablas maestras (presupuestos, peticiones y candidatos) los crean triggers al insertar la ETT.
insert into public.tenants (code, legal_name, trade_name, tax_id)
values ('DEMOSTRACION', 'Ejemplo Trabajo Temporal, S.L.', 'Ejemplo ETT', 'B99999999')
returning id as tenant_id \gset

-- Direcciones (municipios del INE).
insert into public.addresses (tenant_id, street_type, street, number, postal_code, city, municipality_code, province_code)
values (:'tenant_id', 'Calle', 'Gran Vía de Ejemplo', '10, 3.º', '48001', 'Bilbao', '48020', '48')
returning id as addr_bilbao \gset
insert into public.addresses (tenant_id, street_type, street, number, postal_code, city, municipality_code, province_code)
values (:'tenant_id', 'Calle', 'Alcalá de Muestra', '200', '28028', 'Madrid', '28079', '28')
returning id as addr_madrid \gset
insert into public.addresses (tenant_id, street_type, street, number, postal_code, city, municipality_code, province_code)
values (:'tenant_id', 'Carrer', 'Exemple', '45', '08015', 'Barcelona', '08019', '08')
returning id as addr_bcn \gset

insert into public.companies (tenant_id, code, name, company_type, tax_id, phone, email, website, address_id)
values (:'tenant_id', 'EJ', 'Ejemplo Trabajo Temporal, S.L.', 'ett', 'B99999999', '+34 944 000 000',
        'hola@ejemplo-ett.example', 'https://ejemplo-ett.example', :'addr_bilbao')
returning id as company_id \gset

insert into public.branches (tenant_id, company_id, code, name, is_default, address_id, phone, email) values
  (:'tenant_id', :'company_id', 'BIZKAIA', 'Delegación Bizkaia', true, :'addr_bilbao', '+34 944 000 001', 'bizkaia@ejemplo-ett.example'),
  (:'tenant_id', :'company_id', 'MADRID', 'Delegación Madrid', false, :'addr_madrid', '+34 910 000 002', 'madrid@ejemplo-ett.example'),
  (:'tenant_id', :'company_id', 'BARCELONA', 'Delegació Barcelona', false, :'addr_bcn', '+34 930 000 003', 'barcelona@ejemplo-ett.example');

-- Mi ETT → Datos legales: lo que piden el CPD previo y los contratos. Autorización, registro, representante
-- (DNI inventado con su letra) y garantía, todo de relleno.
insert into public.company_legal_profiles (
  tenant_id, company_id, trade_name, legal_form, cnae_code, ett_authorization_number, ett_authorization_date,
  ett_authorization_scope, commercial_registry, registry_volume, registry_folio, registry_sheet, registry_entry,
  legal_rep_name, legal_rep_id_type, legal_rep_id_number, legal_rep_position, mutual_insurer, prevention_service,
  red_authorization, guarantee_type, guarantee_entity, guarantee_amount, guarantee_expires_on,
  certificate_holder, certificate_issuer, certificate_expires_on)
values (
  :'tenant_id', :'company_id', 'Ejemplo ETT', 'Sociedad limitada', '7820', 'EJ-0000/2020', '2020-03-02',
  'state', 'Registro Mercantil de Bizkaia (ficticio)', '0000', '1', 'BI-00000', '1',
  'Ane Ejemplo Muestra', 'dni', '00001234S', 'Administradora única', 'Mutua de ejemplo', 'Servicio de prevención ajeno de ejemplo',
  '0000000', 'bank_guarantee', 'Banco de Ejemplo', 150000, (date_trunc('year', current_date) + interval '2 years' - interval '1 day')::date,
  'Ejemplo Trabajo Temporal, S.L.', 'Autoridad de certificación de ejemplo', (current_date + interval '200 days')::date);

-- CCC de relleno (con su control): en cada sucursal, uno del personal en misión y otro del de estructura.
insert into public.contribution_accounts (tenant_id, company_id, branch_id, code, staff_type)
select :'tenant_id', :'company_id', b.id, x.code, x.staff_type
from (values ('BIZKAIA', '48001234585', 'mission'), ('MADRID', '28123456742', 'mission'), ('BARCELONA', '08123456774', 'mission'),
             ('BIZKAIA', '48005555533', 'structure'), ('MADRID', '28111111167', 'structure'),
             ('BARCELONA', '08222222275', 'structure')) as x (branch, code, staff_type)
left join public.branches b on b.tenant_id = :'tenant_id' and b.code = x.branch;

-- Facturación emisora: IBAN de relleno (con su control) y correo de facturación.
insert into public.company_billing_settings (tenant_id, company_id, iban, swift_bic, payment_terms, billing_email)
values (:'tenant_id', :'company_id', 'ES8200000000000000000000', 'EJEMESXXXXX', 'Transferencia a 30 días',
        'facturas@ejemplo-ett.example');

-- Series del año en curso, con números ya avanzados para que parezca una ETT en marcha.
insert into public.number_series (tenant_id, document_kind, company_id, year, prefix, padding, last_number) values
  (:'tenant_id', 'quote', :'company_id', extract(year from current_date)::int, 'PRE-' || extract(year from current_date)::int || '-', 4, 30),
  (:'tenant_id', 'request', :'company_id', extract(year from current_date)::int, 'PET-' || extract(year from current_date)::int || '-', 4, 40),
  (:'tenant_id', 'invoice', :'company_id', extract(year from current_date)::int, 'FAC-' || extract(year from current_date)::int || '-', 5, 0);
-- Los candidatos van sin sociedad (son de toda la ETT).
insert into public.number_series (tenant_id, document_kind, year, prefix, padding, last_number) values
  (:'tenant_id', 'candidate', extract(year from current_date)::int, 'CAN-' || extract(year from current_date)::int || '-', 4, 120);

-- Texto legal de la bolsa de candidatos (texto de ejemplo, no es un texto jurídico revisado).
insert into public.privacy_notices (tenant_id, purpose, version, text, created_by) values (
  :'tenant_id', 'talent_pool', 'EJEMPLO-2026-1',
  'TEXTO DE EJEMPLO PARA LA DEMOSTRACIÓN. Ejemplo Trabajo Temporal, S.L. tratará tus datos para incluirte en su bolsa '
  || 'de candidatos y ofrecerte puestos de trabajo adecuados a tu perfil durante 24 meses. Puedes retirar el '
  || 'consentimiento y ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad '
  || 'escribiendo a privacidad@ejemplo-ett.example.',
  :'user_id');

-- admin abarca toda la ETT: no necesita filas en user_contexts. No se toca la ETT activa ni las demás membresías.
insert into public.memberships (tenant_id, user_id, role_id)
select :'tenant_id', :'user_id', r.id
from public.roles r
where r.tenant_id = :'tenant_id' and r.code = 'admin';

commit;

\echo
\echo 'ETT DEMOSTRACION creada. Ahora, desde el Mac: apps/api/scripts/sembrar-demostracion.ts (ver infra/nas/README.md).'
select :'tenant_id' as tenant_id;
