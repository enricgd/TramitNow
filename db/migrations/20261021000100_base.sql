-- Base común: esquema privado para funciones internas y trigger de updated_at.
--
-- `private` no está en PGRST_DB_SCHEMAS (public, storage, graphql_public), así que nada de lo que
-- se cree aquí queda expuesto como RPC por la API REST de Supabase.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role, supabase_auth_admin;

-- Ninguna función de `private` es ejecutable por defecto: cada una concede EXECUTE explícitamente.
alter default privileges in schema private revoke execute on functions from public;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
