-- Borra los datos de prueba que deja confirmados un test de conexión de la API (ver run.sh).
delete from public.tenants where code in ('ETT-A', 'ETT-B', 'ETT-C');
delete from auth.users where email in (
  'admin.a@example.test', 'seleccion.a@example.test', 'admin.b@example.test', 'multi@example.test',
  'super@example.test', 'bloqueado@example.test', 'nadie@example.test',
  'contenidos.1@example.test', 'contenidos.2@example.test', 'comercial.a@example.test'
);
-- Convenios globales de prueba (REGCON 999999999999xx): lo publicado solo se borra así. Después de las ETT, porque
-- los puestos de sus presupuestos no dejan borrar una versión de convenio en uso.
begin;
set local tramitnow.purge_agreements = 'on';
delete from public.agreements where regcon like '999999999999%';
commit;
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'extensions') then
    revoke usage on schema extensions from tramitnow_api;
  end if;
end;
$$;
drop extension if exists pgtap;
