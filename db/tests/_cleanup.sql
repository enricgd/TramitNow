-- Borra los datos de prueba que deja confirmados un test de conexión de la API (ver run.sh).
delete from public.tenants where code in ('ETT-A', 'ETT-B', 'ETT-C');
delete from auth.users where email like '%@example.test';
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'extensions') then
    revoke usage on schema extensions from tramitnow_api;
  end if;
end;
$$;
drop extension if exists pgtap;
