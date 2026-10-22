-- Da de alta la ETT de demostración (datos ficticios, los mismos que se ven en los diseños)
-- y hace administrador de ella a un usuario que ya existe en Supabase Auth.
--
-- Antes: crear el usuario en Supabase Studio (Authentication > Add user > Create new user,
-- con "Auto Confirm User" marcado).
--
-- Uso, en el NAS desde /volume1/docker/tramitnow:
--   sudo docker exec -i supabase-db psql -U postgres -d postgres -v email=tu@correo.com < db/seeds/demo-tenant.sql
-- Añade -v superadmin=1 para hacerlo además superadmin de la plataforma (todas las ETT).
--
-- Todo va en una transacción: si algo falla, no queda nada a medias. Si la ETT DEMO ya existe, falla.

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

insert into public.tenants (code, legal_name, trade_name, tax_id)
values ('DEMO', 'ETT Global Servicios Temporales, S.L.', 'ETT Global', 'B00000000')
returning id as tenant_id \gset

-- Los roles de serie (admin, laboral, director_zona, seleccion, comercial) los crea un trigger al insertar la ETT.

insert into public.companies (tenant_id, code, name, company_type, tax_id)
values (:'tenant_id', 'EG', 'ETT Global Servicios Temporales, S.L.', 'ett', 'B00000000')
returning id as company_id \gset

insert into public.branches (tenant_id, company_id, code, name, is_default) values
  (:'tenant_id', :'company_id', 'NORTE', 'Delegación Norte', true),
  (:'tenant_id', :'company_id', 'SUR', 'Delegación Sur', false);

-- admin abarca toda la ETT: no necesita filas en user_contexts.
insert into public.memberships (tenant_id, user_id, role_id)
select :'tenant_id', :'user_id', r.id
from public.roles r
where r.tenant_id = :'tenant_id' and r.code = 'admin';

update public.profiles
set active_tenant_id = :'tenant_id',
    full_name = case when full_name = '' then :'email' else full_name end
where id = :'user_id';

\if :{?superadmin}
insert into public.platform_admins (user_id, note)
values (:'user_id', 'Alta inicial con db/seeds/demo-tenant.sql')
on conflict (user_id) do nothing;
\endif

commit;

\echo
\echo 'ETT DEMO creada. Datos que el hook pondrá en el token de este usuario:'
select jsonb_pretty((private.custom_access_token_hook(jsonb_build_object(
  'user_id', :'user_id',
  'claims', jsonb_build_object('sub', :'user_id', 'role', 'authenticated', 'aud', 'authenticated')
)) -> 'claims') - 'sub' - 'aud') as claims;
