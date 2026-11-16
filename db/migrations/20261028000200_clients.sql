-- Módulo 2: empresas cliente (empresas usuarias de la ETT), sus centros de trabajo, contactos y datos de
-- facturación. Fuentes: docs/modelo-backend.md (§03), docs/inventario-pantallas.md (§2-7), design/empresas.html
-- y el modelo heredado (db/reference/backend_model_ett_tramitnow.sql).
--
-- Decisiones (Enric, 2026-10-28):
--   - Todos los miembros de la ETT ven todos sus clientes. Crear y editar exige clients.manage y acceso a la
--     sucursal del cliente (o del centro).
--   - El NIF/CIF es único por sociedad: un cliente por NIF. Las distintas ubicaciones son centros de trabajo.
--   - Facturación (IBAN, forma de pago, riesgo) en una tabla aparte con su permiso, clients.billing.manage,
--     de serie solo en admin. Sin ese permiso ni se lee.
--   - Contactos: DNI/NIE solo del que firma los CPD; sin fecha de nacimiento (minimización, RGPD).
--
-- Fuera de este módulo: firma digital (client_digital_signature_settings), riesgos del puesto (PRL), portal
-- de cliente, documentos e historial. Ver db/README.md, "Módulo 2".

-- ---------------------------------------------------------------------------
-- Permisos nuevos
-- ---------------------------------------------------------------------------
insert into public.permissions (code, module, description) values
  ('clients.manage', 'comercial', 'Crear y editar clientes, centros de trabajo y contactos de sus sucursales'),
  ('clients.billing.manage', 'administracion', 'Ver y editar los datos de facturación de los clientes (IBAN, forma de pago, riesgo)');

insert into public.role_permissions (tenant_id, role_id, permission_code)
select r.tenant_id, r.id, p.permission_code
from public.roles r
join (values
  ('admin', 'clients.manage'), ('admin', 'clients.billing.manage'),
  ('laboral', 'clients.manage'), ('director_zona', 'clients.manage'), ('comercial', 'clients.manage')
) as p (role_code, permission_code) on p.role_code = r.code
where r.is_system and r.deleted_at is null
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
    ('laboral', 'module.laboral'), ('laboral', 'addresses.write'), ('laboral', 'labor_catalogs.manage'),
    ('laboral', 'clients.manage'),
    ('director_zona', 'module.laboral'), ('director_zona', 'module.seleccion'),
    ('director_zona', 'module.comercial'), ('director_zona', 'addresses.write'), ('director_zona', 'clients.manage'),
    ('seleccion', 'module.seleccion'), ('seleccion', 'addresses.write'),
    ('comercial', 'module.comercial'), ('comercial', 'addresses.write'), ('comercial', 'clients.manage')
  ) as p (role_code, permission_code) on p.role_code = r.code
  where r.tenant_id = new.id;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- clients: la empresa usuaria. De una sociedad de la ETT y con una sucursal propietaria.
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  company_id uuid not null,
  branch_id uuid not null,
  code varchar(30) not null,
  legal_name varchar(220) not null,
  trade_name varchar(220),
  -- NIF (incluye los antiguos CIF), NIE, NIF-IVA de otro país de la UE u otro documento extranjero.
  tax_id_type varchar(10) not null default 'nif' check (tax_id_type in ('nif', 'nie', 'vat_eu', 'other')),
  -- Sin espacios ni guiones y en mayúsculas (la API lo normaliza). Puede faltar en un prospecto.
  tax_id varchar(30) check (tax_id ~ '^[A-Z0-9]+$'),
  -- "Responsable ETT asignado" (design/empresas.html).
  owner_user_id uuid references public.profiles (id) on delete set null,
  client_type_id uuid,
  business_group_id uuid,
  activity varchar(250),
  start_date date,
  status varchar(20) not null default 'active' check (status in ('prospect', 'active', 'inactive')),
  blocked boolean not null default false,
  blocked_reason text,
  address_id uuid,
  phone varchar(40),
  fax varchar(40),
  email varchar(200),
  website varchar(250),
  -- Imprimir precios en el CPD online.
  online_cpd_price_printing boolean not null default false,
  observations text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, id),
  foreign key (tenant_id, company_id) references public.companies (tenant_id, id) on delete cascade,
  foreign key (tenant_id, company_id, branch_id) references public.branches (tenant_id, company_id, id),
  foreign key (tenant_id, client_type_id) references public.catalog_items (tenant_id, id) on delete set null (client_type_id),
  foreign key (tenant_id, business_group_id) references public.catalog_items (tenant_id, id) on delete set null (business_group_id),
  foreign key (tenant_id, address_id) references public.addresses (tenant_id, id) on delete set null (address_id),
  check (blocked or blocked_reason is null)
);

create unique index clients_tenant_company_code_uniq on public.clients (tenant_id, company_id, code) where deleted_at is null;
create unique index clients_tenant_company_tax_id_uniq on public.clients (tenant_id, company_id, tax_id)
  where deleted_at is null and tax_id is not null;
create index clients_tenant_branch_idx on public.clients (tenant_id, branch_id);
create index clients_tenant_name_idx on public.clients (tenant_id, legal_name);

comment on table public.clients is 'Empresas cliente (usuarias) de la ETT. NIF único por sociedad.';
comment on column public.clients.status is 'prospect: en captación, sin operativa; active; inactive (baja comercial)';

-- ---------------------------------------------------------------------------
-- client_centers: centros de trabajo del cliente. Cada uno lo gestiona una sucursal de la ETT.
-- ---------------------------------------------------------------------------
create table public.client_centers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  client_id uuid not null,
  branch_id uuid not null,
  code varchar(30) not null,
  name varchar(200) not null,
  -- Si el centro tiene NIF propio (si no, el del cliente).
  tax_id varchar(30) check (tax_id ~ '^[A-Z0-9]+$'),
  -- Código de cuenta de cotización de la Seguridad Social: provincia (2), número (7) y control (2).
  ccc char(11) check (ccc ~ '^[0-9]{11}$'),
  is_self_employed_ccc boolean not null default false,
  -- CNAE-2009 (4 dígitos) y régimen de la Seguridad Social: texto hasta que existan sus catálogos globales.
  cnae_code char(4) check (cnae_code ~ '^[0-9]{4}$'),
  ss_regime_code varchar(4) check (ss_regime_code ~ '^[0-9]{4}$'),
  blocked boolean not null default false,
  address_id uuid,
  phone varchar(40),
  email varchar(200),
  -- Convenio del cliente (el que aplica en la empresa usuaria), de nómina y GRDA.
  client_agreement_id uuid,
  payroll_agreement_id uuid,
  grda_agreement_id uuid,
  project_code varchar(50),
  -- Sociedad y sucursal de la ETT para los TC (si no son las del cliente).
  tc_company_id uuid,
  tc_branch_id uuid,
  -- "Instrucciones de acceso / PRL" (design/empresas.html).
  access_instructions text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, id),
  unique (tenant_id, client_id, id),
  foreign key (tenant_id, client_id) references public.clients (tenant_id, id) on delete cascade,
  foreign key (tenant_id, branch_id) references public.branches (tenant_id, id),
  foreign key (tenant_id, address_id) references public.addresses (tenant_id, id) on delete set null (address_id),
  foreign key (tenant_id, client_agreement_id) references public.collective_agreements (tenant_id, id) on delete set null (client_agreement_id),
  foreign key (tenant_id, payroll_agreement_id) references public.collective_agreements (tenant_id, id) on delete set null (payroll_agreement_id),
  foreign key (tenant_id, grda_agreement_id) references public.collective_agreements (tenant_id, id) on delete set null (grda_agreement_id),
  foreign key (tenant_id, tc_company_id) references public.companies (tenant_id, id) on delete set null (tc_company_id),
  foreign key (tenant_id, tc_company_id, tc_branch_id) references public.branches (tenant_id, company_id, id) on delete set null (tc_branch_id),
  check (tc_branch_id is null or tc_company_id is not null)
);

create unique index client_centers_tenant_client_code_uniq on public.client_centers (tenant_id, client_id, code) where deleted_at is null;
create index client_centers_tenant_branch_idx on public.client_centers (tenant_id, branch_id);
create index client_centers_tenant_ccc_idx on public.client_centers (tenant_id, ccc);

comment on table public.client_centers is 'Centros de trabajo de los clientes; los gestiona una sucursal de la ETT';

-- ---------------------------------------------------------------------------
-- client_contacts: personas de contacto del cliente o de un centro. Datos personales.
-- ---------------------------------------------------------------------------
create table public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  client_id uuid not null,
  center_id uuid,
  name varchar(160) not null,
  position varchar(120),
  department varchar(120),
  phone varchar(40),
  mobile varchar(40),
  email varchar(200),
  -- Para qué se le contacta (design/empresas.html).
  roles text[] not null default '{}'
    check (roles <@ array['commercial', 'requester', 'operations', 'billing', 'hr', 'prevention', 'management']),
  -- Contacto principal del cliente (como mucho uno) y destinatario de los presupuestos.
  is_main boolean not null default false,
  is_quote_recipient boolean not null default false,
  signs_cpds boolean not null default false,
  -- Documento de identidad: solo del que firma los CPD.
  document_type varchar(10) check (document_type in ('nif', 'nie', 'passport', 'other')),
  document_number varchar(30) check (document_number ~ '^[A-Z0-9]+$'),
  receives_digital_signature boolean not null default false,
  send_collection_claims boolean not null default false,
  invoice_send_type varchar(20) check (invoice_send_type in ('email', 'postal', 'portal')),
  sort_order integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, id),
  foreign key (tenant_id, client_id) references public.clients (tenant_id, id) on delete cascade,
  -- El centro tiene que ser del mismo cliente.
  foreign key (tenant_id, client_id, center_id) references public.client_centers (tenant_id, client_id, id) on delete set null (center_id),
  check (signs_cpds or (document_type is null and document_number is null)),
  check ((document_type is null) = (document_number is null))
);

create unique index client_contacts_main_uniq on public.client_contacts (tenant_id, client_id) where is_main and deleted_at is null;
create index client_contacts_tenant_client_idx on public.client_contacts (tenant_id, client_id, center_id);

comment on table public.client_contacts is 'Contactos de clientes (datos personales). DNI/NIE solo de quien firma los CPD.';

-- ---------------------------------------------------------------------------
-- client_billing_profiles: datos de facturación (1:1 con el cliente). Solo con clients.billing.manage.
-- ---------------------------------------------------------------------------
create table public.client_billing_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  client_id uuid not null,
  payment_method_id uuid,
  -- Plazo de pago en días desde la factura (la Ley 3/2004 limita a 60 entre empresas: la API avisa).
  payment_term_days smallint check (payment_term_days between 0 and 365),
  -- Días fijos de pago del mes (como mucho tres).
  fixed_payment_days smallint[] check (
    fixed_payment_days is null
    or (cardinality(fixed_payment_days) between 1 and 3 and 1 <= all (fixed_payment_days) and 31 >= all (fixed_payment_days))
  ),
  iban varchar(34) check (iban ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$'),
  swift_bic varchar(11) check (swift_bic ~ '^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$'),
  b2b_direct_debit boolean not null default false,
  -- Cliente al que se emiten las facturas, si es otro.
  invoice_client_id uuid,
  invoice_type_id uuid,
  invoice_print_model_id uuid,
  copies_count smallint not null default 1 check (copies_count between 1 and 10),
  send_invoices_by_postal_mail boolean not null default false,
  generate_e_invoice boolean not null default false,
  fixed_invoice_text text,
  fixed_invoice_text_position varchar(10) check (fixed_invoice_text_position in ('before', 'after')),
  vat_special_cause_id uuid,
  equivalence_surcharge boolean not null default false,
  retention_type_id uuid,
  risk_limit numeric(14, 2) check (risk_limit >= 0),
  risk_notes text,
  accounting_account varchar(50),
  supplier_reference varchar(80),
  seller_user_id uuid references public.profiles (id) on delete set null,
  statistical_sector_id uuid,
  offer_margin_percent numeric(8, 4),
  offer_coefficient numeric(10, 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, id),
  unique (tenant_id, client_id),
  foreign key (tenant_id, client_id) references public.clients (tenant_id, id) on delete cascade,
  foreign key (tenant_id, invoice_client_id) references public.clients (tenant_id, id) on delete set null (invoice_client_id),
  foreign key (tenant_id, payment_method_id) references public.catalog_items (tenant_id, id) on delete set null (payment_method_id),
  foreign key (tenant_id, invoice_type_id) references public.catalog_items (tenant_id, id) on delete set null (invoice_type_id),
  foreign key (tenant_id, invoice_print_model_id) references public.catalog_items (tenant_id, id) on delete set null (invoice_print_model_id),
  foreign key (tenant_id, vat_special_cause_id) references public.catalog_items (tenant_id, id) on delete set null (vat_special_cause_id),
  foreign key (tenant_id, retention_type_id) references public.catalog_items (tenant_id, id) on delete set null (retention_type_id),
  foreign key (tenant_id, statistical_sector_id) references public.catalog_items (tenant_id, id) on delete set null (statistical_sector_id),
  check ((fixed_invoice_text is null) = (fixed_invoice_text_position is null)),
  check (invoice_client_id is distinct from client_id)
);

comment on table public.client_billing_profiles is 'Facturación de cada cliente (IBAN, pago, riesgo). Solo con clients.billing.manage.';

-- ---------------------------------------------------------------------------
-- Categorías profesionales propias de un cliente (pendiente del módulo 1).
-- ---------------------------------------------------------------------------
alter table public.professional_categories
  add column client_id uuid,
  add foreign key (tenant_id, client_id) references public.clients (tenant_id, id) on delete cascade;

drop index public.professional_categories_scope_code_uniq;
create unique index professional_categories_scope_code_uniq
  on public.professional_categories (tenant_id, company_id, branch_id, client_id, code) nulls not distinct
  where deleted_at is null;
create index professional_categories_tenant_client_idx on public.professional_categories (tenant_id, client_id);

-- La categoría de un cliente es de la sociedad del cliente.
create or replace function private.check_category_client_company()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.client_id is not null and not exists (
    select 1 from public.clients c
    where c.tenant_id = new.tenant_id and c.id = new.client_id and c.company_id = new.company_id
  ) then
    raise exception 'La categoría de un cliente tiene que ser de la sociedad del cliente'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger trg_professional_categories_client_company
  before insert or update of client_id, company_id on public.professional_categories
  for each row execute function private.check_category_client_company();

-- ---------------------------------------------------------------------------
-- updated_at, privilegios y RLS
-- ---------------------------------------------------------------------------
create trigger trg_clients_updated_at before update on public.clients
  for each row execute function private.touch_updated_at();
create trigger trg_client_centers_updated_at before update on public.client_centers
  for each row execute function private.touch_updated_at();
create trigger trg_client_contacts_updated_at before update on public.client_contacts
  for each row execute function private.touch_updated_at();
create trigger trg_client_billing_profiles_updated_at before update on public.client_billing_profiles
  for each row execute function private.touch_updated_at();

revoke all on table
  public.clients, public.client_centers, public.client_contacts, public.client_billing_profiles
from anon;

revoke truncate, references, trigger on table
  public.clients, public.client_centers, public.client_contacts, public.client_billing_profiles
from authenticated;

alter table public.clients enable row level security;
alter table public.client_centers enable row level security;
alter table public.client_contacts enable row level security;
alter table public.client_billing_profiles enable row level security;

-- Leer clientes, centros y contactos: cualquier miembro de la ETT activa.
create policy clients_select on public.clients for select to authenticated
  using ((select private.is_superadmin()) or tenant_id = (select private.current_tenant_id()));
create policy client_centers_select on public.client_centers for select to authenticated
  using ((select private.is_superadmin()) or tenant_id = (select private.current_tenant_id()));
create policy client_contacts_select on public.client_contacts for select to authenticated
  using ((select private.is_superadmin()) or tenant_id = (select private.current_tenant_id()));

-- Escribir: clients.manage y acceso a la sucursal del cliente (clientes y contactos) o del centro.
do $$
declare
  tbl text;
  branch_check text;
begin
  foreach tbl in array array['clients', 'client_centers', 'client_contacts'] loop
    branch_check := case tbl
      when 'client_contacts' then
        'exists (select 1 from public.clients c where c.tenant_id = client_contacts.tenant_id and c.id = client_contacts.client_id and private.can_access_branch(c.branch_id))'
      else 'private.can_access_branch(branch_id)'
    end;

    execute format($p$
      create policy %1$I on public.%2$I for insert to authenticated
      with check (
        (select private.is_superadmin())
        or (tenant_id = (select private.current_tenant_id()) and (select private.has_permission('clients.manage')) and %3$s)
      )
    $p$, tbl || '_insert', tbl, branch_check);

    execute format($p$
      create policy %1$I on public.%2$I for update to authenticated
      using (
        (select private.is_superadmin())
        or (tenant_id = (select private.current_tenant_id()) and (select private.has_permission('clients.manage')) and %3$s)
      )
      with check (
        (select private.is_superadmin())
        or (tenant_id = (select private.current_tenant_id()) and (select private.has_permission('clients.manage')) and %3$s)
      )
    $p$, tbl || '_update', tbl, branch_check);

    execute format($p$
      create policy %1$I on public.%2$I for delete to authenticated
      using (
        (select private.is_superadmin())
        or (tenant_id = (select private.current_tenant_id()) and (select private.has_permission('clients.manage')) and %3$s)
      )
    $p$, tbl || '_delete', tbl, branch_check);
  end loop;
end;
$$;

-- Facturación: leer y escribir solo con clients.billing.manage.
create policy client_billing_profiles_all on public.client_billing_profiles for all to authenticated
  using (
    (select private.is_superadmin())
    or (tenant_id = (select private.current_tenant_id()) and (select private.has_permission('clients.billing.manage')))
  )
  with check (
    (select private.is_superadmin())
    or (tenant_id = (select private.current_tenant_id()) and (select private.has_permission('clients.billing.manage')))
  );
