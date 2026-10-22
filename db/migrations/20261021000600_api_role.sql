-- Rol de conexión de la API propia (apps/api, Node + Hono).
--
-- La web no accede a los datos por PostgREST: todo pasa por la API. La API se conecta como
-- tramitnow_api y, en cada transacción, tras verificar el JWT de Supabase Auth:
--   set local role authenticated;
--   select set_config('request.jwt.claims', '<claims del JWT verificado>', true);
-- Igual que PostgREST: auth.uid() / auth.jwt() funcionan igual y RLS sigue siendo la red de seguridad.
--
-- tramitnow_api por sí mismo no tiene ningún privilegio (NOINHERIT y sin grants): sin el SET ROLE no
-- lee ni escribe nada. Solo puede pasar a `authenticated`; nunca a postgres ni a service_role.
-- Sin BYPASSRLS. La contraseña y LOGIN se configuran fuera del repo (ver db/README.md).

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'tramitnow_api') then
    create role tramitnow_api nologin noinherit;
  elsif exists (
    select 1 from pg_roles
    where rolname = 'tramitnow_api'
      and (rolsuper or rolbypassrls or rolcreaterole or rolcreatedb or rolreplication or rolinherit)
  ) then
    raise exception 'El rol tramitnow_api ya existe con atributos de más (superuser, bypassrls, inherit...)';
  end if;
end;
$$;

grant authenticated to tramitnow_api with inherit false, set true;

comment on role tramitnow_api is
  'Conexión de apps/api. Sin privilegios propios: cada transacción hace SET LOCAL ROLE authenticated y fija request.jwt.claims.';
