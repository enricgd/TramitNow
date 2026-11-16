-- Tablas maestras (fase 1 de docs/plan-desarrollo.md): los tipos de catalog_items pasan a ser una lista cerrada
-- (catalog_types, global) y se añaden los que piden las notas del diseño (design/cambios/): sectores, regímenes de
-- IVA, motivos de rechazo de presupuesto, de baja de plaza y de fin de misión, tipos de incidencia y de documento.
--
-- Además:
--   - El nombre es único por tipo sin distinguir mayúsculas (las notas lo piden para valores que se dan de alta
--     desde un formulario, "+ Añadir").
--   - El código pasa a ser opcional: lo que se añade desde un desplegable solo tiene nombre.
--   - Los tipos de documento pueden exigir conservación (retention_required): sus documentos no se borran
--     (contratos, CPD, nóminas). Ver 20261115000200_documents.sql.

-- ---------------------------------------------------------------------------
-- catalog_types: qué tablas maestras hay. Global, de solo lectura (la amplía una migración, como los permisos).
-- ---------------------------------------------------------------------------
create table public.catalog_types (
  code varchar(80) primary key check (code ~ '^[a-z][a-z0-9_]*$'),
  name varchar(120) not null,
  description text,
  -- Módulo de la pantalla de tablas maestras en el que se agrupa.
  module varchar(30) not null check (module in ('general', 'comercial', 'administracion', 'laboral', 'seleccion')),
  created_at timestamptz not null default now()
);

comment on table public.catalog_types is 'Tipos de tabla maestra simple (catalog_items.catalog). Global; se amplía por migración.';

insert into public.catalog_types (code, name, module, description) values
  -- Ya referenciados desde tablas existentes.
  ('geo_zone', 'Zonas geográficas', 'general', 'addresses.geo_zone_id'),
  ('tax_id_type', 'Tipos de identificador fiscal', 'administracion', 'companies.tax_id_type_id'),
  ('client_type', 'Tipos de cliente', 'comercial', 'clients.client_type_id'),
  ('business_group', 'Grupos empresariales', 'comercial', 'clients.business_group_id'),
  ('payment_method', 'Formas de pago', 'administracion', 'client_billing_profiles.payment_method_id'),
  ('invoice_type', 'Tipos de factura', 'administracion', 'client_billing_profiles.invoice_type_id'),
  ('invoice_print_model', 'Modelos de impresión de factura', 'administracion', 'client_billing_profiles.invoice_print_model_id'),
  ('vat_special_cause', 'Causas especiales de IVA', 'administracion', 'client_billing_profiles.vat_special_cause_id'),
  ('retention_type', 'Tipos de retención', 'administracion', 'client_billing_profiles.retention_type_id'),
  ('statistical_sector', 'Sectores estadísticos', 'administracion', 'client_billing_profiles.statistical_sector_id'),
  -- Nuevos (notas del diseño).
  ('sector', 'Sectores de actividad', 'comercial', 'Sector del cliente (design/cambios/2026-10-28-empresas-categorias-documentos.md)'),
  ('vat_regime', 'Regímenes de IVA', 'administracion', 'Facturación del cliente (design/cambios/2026-10-28-empresas-eliminar-suspender-subir.md)'),
  ('quote_rejection_reason', 'Motivos de rechazo de presupuesto', 'comercial', 'design/cambios/2026-10-28-presupuestos-mejoras.md'),
  ('vacancy_cancellation_reason', 'Motivos de baja de plaza', 'comercial', 'design/cambios/2026-10-28-peticiones-plazas-cpd-portales.md'),
  ('assignment_end_reason', 'Motivos de fin de misión', 'laboral', 'design/cambios/2026-10-28-personal-en-mision.md'),
  ('incident_type', 'Tipos de incidencia', 'laboral', 'Incidencias de horas y de misión (design/cambios/2026-10-28-horas-incidencias.md)'),
  ('document_type', 'Tipos de documento', 'general', 'documents.type_id; pueden exigir conservación (retention_required)');

alter table public.catalog_types enable row level security;
revoke all on table public.catalog_types from anon;
revoke insert, update, delete, truncate, references, trigger on table public.catalog_types from authenticated;
create policy catalog_types_select on public.catalog_types for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- catalog_items: tipo de la lista cerrada, código opcional, nombre único por tipo y conservación obligatoria.
-- ---------------------------------------------------------------------------
alter table public.catalog_items
  add constraint catalog_items_catalog_fkey foreign key (catalog) references public.catalog_types (code),
  alter column code drop not null,
  add column retention_required boolean not null default false,
  add constraint catalog_items_retention_check check (not retention_required or catalog = 'document_type');

comment on column public.catalog_items.retention_required is
  'Solo tipos de documento: sus documentos no se pueden borrar (obligación legal de conservación)';

create unique index catalog_items_tenant_catalog_name_uniq
  on public.catalog_items (tenant_id, catalog, lower(name)) where deleted_at is null;
