-- Presupuestos: quién ve los costes internos y el margen (design/cambios/2026-10-28-presupuestos-mejoras.md: «Margen
-- total en € y en %; solo lo ve dirección»; «Ver como comercial» oculta costes internos y margen).
--
-- Sin quotes.view_costs, la API no devuelve el coste, la Seguridad Social, la indemnización, los costes internos ni el
-- margen (sí el salario, la tarifa, la tarifa sugerida y los avisos), y no deja cambiar costes internos ni tipos de la
-- Seguridad Social. Los datos están en las mismas filas: es una regla de la API, como el resto de la presentación.

insert into public.permissions (code, module, description) values
  ('quotes.view_costs', 'comercial', 'Ver y cambiar los costes internos y el margen de los presupuestos');

insert into public.role_permissions (tenant_id, role_id, permission_code)
select r.tenant_id, r.id, 'quotes.view_costs'
from public.roles r
where r.is_system and r.deleted_at is null and r.code in ('admin', 'director_zona')
on conflict do nothing;

create or replace function private.seed_tenant_roles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.roles (tenant_id, code, name, scope, is_system) values
    (new.id, 'admin', 'Administrador', 'tenant', true),
    (new.id, 'laboral', 'Laboral', 'tenant', true),
    (new.id, 'director_zona', 'Director de zona', 'branches', true),
    (new.id, 'seleccion', 'Selección', 'branch', true),
    (new.id, 'comercial', 'Comercial', 'branch', true);

  insert into public.role_permissions (tenant_id, role_id, permission_code)
  select new.id, r.id, p.permission_code
  from public.roles r
  join (values
    ('admin', 'module.administracion'), ('admin', 'module.laboral'),
    ('admin', 'module.seleccion'), ('admin', 'module.comercial'),
    ('admin', 'tenant.manage'), ('admin', 'companies.manage'), ('admin', 'branches.manage'),
    ('admin', 'catalogs.manage'), ('admin', 'users.manage'), ('admin', 'roles.manage'),
    ('admin', 'addresses.write'), ('admin', 'labor_catalogs.manage'),
    ('admin', 'clients.manage'), ('admin', 'clients.billing.manage'),
    ('admin', 'quotes.manage'), ('admin', 'quotes.approve_margin'), ('admin', 'quotes.view_costs'),
    ('laboral', 'module.laboral'), ('laboral', 'addresses.write'), ('laboral', 'labor_catalogs.manage'),
    ('laboral', 'clients.manage'),
    ('director_zona', 'module.laboral'), ('director_zona', 'module.seleccion'),
    ('director_zona', 'module.comercial'), ('director_zona', 'addresses.write'), ('director_zona', 'clients.manage'),
    ('director_zona', 'quotes.manage'), ('director_zona', 'quotes.approve_margin'),
    ('director_zona', 'quotes.view_costs'),
    ('seleccion', 'module.seleccion'), ('seleccion', 'addresses.write'),
    ('comercial', 'module.comercial'), ('comercial', 'addresses.write'), ('comercial', 'clients.manage'),
    ('comercial', 'quotes.manage')
  ) as p (role_code, permission_code) on p.role_code = r.code
  where r.tenant_id = new.id;

  return new;
end;
$$;
