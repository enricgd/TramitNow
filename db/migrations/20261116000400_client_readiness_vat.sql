-- Ajustes de integración de la fase 2 (Empresas):
--
--   1. Resumen de preparación de un cliente (centros y contactos activos, si tiene facturación) para la lista de
--      empresas, que antes hacía tres peticiones por cliente.
--   2. IVA del cliente (decisión de Enric): no hay campo de régimen. La web usa client_billing_profiles
--      .vat_special_cause_id (NULL = régimen general) y equivalence_surcharge. La tabla maestra vat_special_cause se
--      siembra con valores iniciales en cada ETT (las existentes y las nuevas); la ETT los puede renombrar o dar de baja.

-- ---------------------------------------------------------------------------
-- 1. Preparación. SECURITY DEFINER para que «tiene facturación» lo vea también quien no tiene
--    clients.billing.manage (solo el sí/no, nunca los datos). Solo responde para la ETT activa (o el superadmin).
-- ---------------------------------------------------------------------------
create or replace function private.client_readiness(p_tenant_id uuid, p_client_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when private.is_superadmin() or p_tenant_id = private.current_tenant_id() then
    jsonb_build_object(
      'centers', (select count(*) from public.client_centers
                  where tenant_id = p_tenant_id and client_id = p_client_id and deleted_at is null),
      'contacts', (select count(*) from public.client_contacts
                   where tenant_id = p_tenant_id and client_id = p_client_id and deleted_at is null),
      'hasBilling', exists (select 1 from public.client_billing_profiles
                            where tenant_id = p_tenant_id and client_id = p_client_id and deleted_at is null))
  end
$$;

grant execute on function private.client_readiness(uuid, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Causas especiales de IVA de serie.
-- ---------------------------------------------------------------------------
create or replace function private.vat_special_cause_defaults()
returns table (code varchar, name varchar)
language sql
immutable
set search_path = ''
as $$
  values
    ('EXENTA'::varchar, 'Exenta de IVA'::varchar),
    ('ISP', 'Inversión del sujeto pasivo'),
    ('IGIC', 'Canarias: IGIC (no sujeta a IVA)'),
    ('IPSI', 'Ceuta y Melilla: IPSI (no sujeta a IVA)')
$$;

create or replace function private.seed_tenant_vat_special_causes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.catalog_items (tenant_id, catalog, code, name)
  select new.id, 'vat_special_cause', d.code, d.name from private.vat_special_cause_defaults() d;
  return new;
end;
$$;

create trigger trg_tenants_seed_vat_special_causes after insert on public.tenants
  for each row execute function private.seed_tenant_vat_special_causes();

-- ETT existentes: sin pisar lo que ya tuvieran con ese código o ese nombre.
insert into public.catalog_items (tenant_id, catalog, code, name)
select t.id, 'vat_special_cause', d.code, d.name
from public.tenants t
cross join private.vat_special_cause_defaults() d
where not exists (
  select 1 from public.catalog_items ci
  where ci.tenant_id = t.id and ci.catalog = 'vat_special_cause' and ci.deleted_at is null
    and (ci.code = d.code or lower(ci.name) = lower(d.name))
);
