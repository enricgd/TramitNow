-- Igual que volumes/db/roles.sql del Supabase oficial: contraseñas de los roles de servicio.
-- Solo local: todas valen "postgres".
\set pgpass `echo "$POSTGRES_PASSWORD"`

alter user authenticator with password :'pgpass';
alter user supabase_auth_admin with password :'pgpass';
alter user supabase_storage_admin with password :'pgpass';
