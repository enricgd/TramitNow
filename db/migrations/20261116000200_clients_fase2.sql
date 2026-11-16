-- Fase 2 (Empresas): decisiones de Enric sobre el modelo de clientes (2026-11-16). Ver db/README.md, "Fase 2".
--
--   1. Contactos: «valida horas» y texto del rol «Otro» (los 7 roles siguen igual).
--   2. Contactos suspendibles (los centros ya tienen `blocked`, que en pantalla es «Inactivo»).
--   4. Sector del cliente: catálogo común CNAE (20261116000100_cnae.sql). Se retira la tabla maestra `sector`.
--   5. Convenio por defecto del cliente, que heredan los centros que no tienen convenio propio.
--   7. Facturación: cómo se imprime la factura (invoice_layout). Los días fijos de pago siguen como números.
-- La baja lógica recuperable (decisión 3) va en 20261116000300_soft_delete.sql.

-- ---------------------------------------------------------------------------
-- 4 y 5. Clientes: sector (CNAE) y convenio por defecto.
-- ---------------------------------------------------------------------------
alter table public.clients
  add column sector_code varchar(4) references public.cnae_activities (code),
  add column default_agreement_id uuid,
  add foreign key (tenant_id, default_agreement_id)
    references public.collective_agreements (tenant_id, id) on delete set null (default_agreement_id);

create index clients_tenant_sector_idx on public.clients (tenant_id, sector_code) where sector_code is not null;

comment on column public.clients.sector_code is 'Sector: sección (letra) o división (2 dígitos) de la CNAE-2009';
comment on column public.clients.default_agreement_id is
  'Convenio de la empresa usuaria por defecto: lo usan los centros con client_agreement_id NULL';
comment on column public.client_centers.client_agreement_id is
  'Convenio de la empresa usuaria en este centro; NULL: el del cliente (clients.default_agreement_id)';

-- La tabla maestra `sector` por ETT se retira: ninguna tabla la referenciaba (era para este campo, que ahora es
-- CNAE). Los valores que se hubieran creado se borran con el tipo.
delete from public.catalog_items where catalog = 'sector';
delete from public.catalog_types where code = 'sector';

-- ---------------------------------------------------------------------------
-- 1 y 2. Contactos: valida horas, rol «Otro» y suspensión.
-- ---------------------------------------------------------------------------
alter table public.client_contacts
  drop constraint client_contacts_roles_check,
  add constraint client_contacts_roles_check check (
    roles <@ array['commercial', 'requester', 'operations', 'billing', 'hr', 'prevention', 'management', 'other']),
  add column other_role varchar(120),
  -- Con el rol «Otro» hay que decir cuál; sin él, no hay texto.
  add constraint client_contacts_other_role_check check ((other_role is not null) = ('other' = any (roles))),
  add column validates_hours boolean not null default false,
  -- Suspendido: deja de usarse (no se le envía nada ni se le puede elegir), pero no se elimina. Lo usado no se
  -- elimina: se suspende.
  add column suspended boolean not null default false,
  add column suspended_at timestamptz,
  add column suspended_by uuid references public.profiles (id) on delete set null,
  add constraint client_contacts_suspended_check check (suspended or (suspended_at is null and suspended_by is null));

comment on column public.client_contacts.validates_hours is 'Valida las horas de los trabajadores en misión';
comment on column public.client_contacts.other_role is 'Texto del rol «Otro» (obligatorio si roles incluye other)';

-- Quién suspendió y cuándo: lo pone la base de datos.
create or replace function private.client_contacts_suspension()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.suspended and (tg_op = 'INSERT' or not old.suspended) then
    new.suspended_at := now();
    new.suspended_by := (select p.id from public.profiles p where p.id = auth.uid());
  elsif not new.suspended then
    new.suspended_at := null;
    new.suspended_by := null;
  else
    new.suspended_at := old.suspended_at;
    new.suspended_by := old.suspended_by;
  end if;
  return new;
end;
$$;

create trigger trg_client_contacts_suspension before insert or update on public.client_contacts
  for each row execute function private.client_contacts_suspension();

create index client_contacts_tenant_suspended_idx on public.client_contacts (tenant_id, client_id) where suspended;

-- ---------------------------------------------------------------------------
-- 7. Facturación: forma de imprimir la factura y significado del 31.
-- ---------------------------------------------------------------------------
alter table public.client_billing_profiles
  add column invoice_layout varchar(20) not null default 'by_person' check (invoice_layout in ('by_person', 'by_concept'));

comment on column public.client_billing_profiles.invoice_layout is
  'Cómo se imprime la factura: by_person (una línea por trabajador, por defecto) o by_concept (agrupada por concepto)';
comment on column public.client_billing_profiles.fixed_payment_days is
  'Días fijos de pago del mes (1-31, como mucho tres). 31 = último día del mes; si el mes no tiene ese día (p. ej. 30 en febrero), se toma su último día';
