-- tramitNow canonical backend model.
-- Sources:
--   - Modelo_backend_tablas_ETT_TramitNOW.docx
--   - Inventario_pantallas_ETT_TramitNOW (1).docx
--   - tipos_de_usuarios.drawio (1).pdf
--
-- The backend document defines the core model. Fields only visible in the
-- screen inventory are included in the closest owning entity and marked below.
-- The PDF role and branch scopes use roles, user_roles and user_contexts.
-- Firebase SQL Connect deploys dataconnect/schema/schema.gql; this file is the
-- complete PostgreSQL reference for checks, triggers and tenant RLS.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION backend_tenant_visible(row_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(current_setting('app.rol', true), '') = 'superadmin'
      OR row_tenant_id::text = COALESCE(current_setting('app.tenant_id', true), '')
$$;

CREATE OR REPLACE FUNCTION set_backend_tenant_context(p_tenant_id UUID, p_role TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('app.tenant_id', COALESCE(p_tenant_id::text, ''), true);
  IF p_role IS NOT NULL THEN
    PERFORM set_config('app.rol', p_role, true);
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(30) NOT NULL,
  legal_name VARCHAR(200) NOT NULL,
  trade_name VARCHAR(200),
  tax_id VARCHAR(30),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  default_locale VARCHAR(10),
  timezone VARCHAR(80),
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS tenants_code_uniq ON tenants(code);
CREATE UNIQUE INDEX IF NOT EXISTS tenants_tax_id_uniq ON tenants(tax_id) WHERE tax_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog VARCHAR(80) NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(180) NOT NULL,
  parent_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS catalog_items_tenant_catalog_code_uniq ON catalog_items(tenant_id, catalog, code);
CREATE INDEX IF NOT EXISTS catalog_items_tenant_catalog_idx ON catalog_items(tenant_id, catalog);

CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  street_type VARCHAR(20),
  street VARCHAR(200),
  number VARCHAR(20),
  door VARCHAR(20),
  postal_code VARCHAR(20),
  city VARCHAR(120),
  municipality_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  province_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  country_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  geo_zone_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS addresses_tenant_location_idx ON addresses(tenant_id, country_id, province_id);

CREATE TABLE IF NOT EXISTS prevention_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assumed_by_owner BOOLEAN NOT NULL DEFAULT FALSE,
  designated_workers BOOLEAN NOT NULL DEFAULT FALSE,
  own_prevention_service BOOLEAN NOT NULL DEFAULT FALSE,
  joint_prevention_service BOOLEAN NOT NULL DEFAULT FALSE,
  external_prevention_service BOOLEAN NOT NULL DEFAULT FALSE,
  none_selected BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(30) NOT NULL,
  name VARCHAR(200) NOT NULL,
  tax_id_type_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  tax_id VARCHAR(30),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  company_type VARCHAR(30) NOT NULL DEFAULT 'ett' CHECK (company_type IN ('ett', 'services', 'merchandising', 'other')),
  phone VARCHAR(40),
  fax VARCHAR(40),
  email VARCHAR(200),
  website VARCHAR(250),
  sms_sender_name VARCHAR(120),
  worker_communications_cc_email VARCHAR(200),
  address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
  postal_address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
  prevention_config_id UUID REFERENCES prevention_configurations(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS companies_tenant_code_uniq ON companies(tenant_id, code);
CREATE INDEX IF NOT EXISTS companies_tenant_tax_id_idx ON companies(tenant_id, tax_id);

CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(160) NOT NULL,
  address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
  phone VARCHAR(40),
  email VARCHAR(200),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS branches_tenant_company_code_uniq ON branches(tenant_id, company_id, code);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid VARCHAR(128),
  email VARCHAR(200) NOT NULL,
  username VARCHAR(80),
  password_hash VARCHAR(255),
  full_name VARCHAR(160) NOT NULL,
  phone VARCHAR(40),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'inactive')),
  last_login_at TIMESTAMPTZ,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS users_tenant_email_uniq ON users(tenant_id, email);
CREATE UNIQUE INDEX IF NOT EXISTS users_firebase_uid_uniq ON users(firebase_uid) WHERE firebase_uid IS NOT NULL;

COMMENT ON COLUMN users.password_hash IS 'Nullable when the user authenticates only through Firebase Auth.';

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS roles_tenant_code_uniq ON roles(tenant_id, code);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS user_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  permissions_override JSONB DEFAULT '{}'::jsonb,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS user_contexts_user_company_branch_uniq
  ON user_contexts(user_id, company_id, branch_id)
  WHERE branch_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS user_contexts_user_company_no_branch_uniq
  ON user_contexts(user_id, company_id)
  WHERE branch_id IS NULL;

CREATE TABLE IF NOT EXISTS agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  agreement_type VARCHAR(30) CHECK (agreement_type IN ('client', 'payroll', 'general')),
  valid_from DATE,
  valid_to DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS agreements_tenant_code_uniq ON agreements(tenant_id, code);

CREATE TABLE IF NOT EXISTS contract_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(30) NOT NULL,
  official_code VARCHAR(30),
  description VARCHAR(250) NOT NULL,
  duration_type VARCHAR(30) CHECK (duration_type IN ('temporary', 'indefinite', 'other')),
  quotation_type VARCHAR(30) CHECK (quotation_type IN ('percentages', 'fixed_amount', 'other')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS contract_types_tenant_code_uniq ON contract_types(tenant_id, code);
CREATE INDEX IF NOT EXISTS contract_types_tenant_official_code_idx ON contract_types(tenant_id, official_code);

CREATE TABLE IF NOT EXISTS payroll_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL,
  description VARCHAR(200) NOT NULL,
  concept_type VARCHAR(30) NOT NULL CHECK (concept_type IN ('normal_hour', 'extra_hour', 'allowance', 'charge', 'discount', 'other')),
  default_print_offer BOOLEAN NOT NULL DEFAULT FALSE,
  default_print_invoice_cpd BOOLEAN NOT NULL DEFAULT FALSE,
  default_print_salary_cpd BOOLEAN NOT NULL DEFAULT FALSE,
  default_print_contract BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS payroll_concepts_tenant_code_uniq ON payroll_concepts(tenant_id, code);

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  code VARCHAR(30) NOT NULL,
  legal_name VARCHAR(220) NOT NULL,
  trade_name VARCHAR(220),
  tax_id_type_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  tax_id VARCHAR(30),
  client_type_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  business_group_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  activity VARCHAR(250),
  start_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'inactive')),
  blocked BOOLEAN NOT NULL DEFAULT FALSE,
  address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
  phone VARCHAR(40),
  fax VARCHAR(40),
  email VARCHAR(200),
  website VARCHAR(250),
  online_cpd_price_printing BOOLEAN NOT NULL DEFAULT FALSE,
  observations TEXT,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS clients_tenant_company_code_uniq ON clients(tenant_id, company_id, code);
CREATE INDEX IF NOT EXISTS clients_tenant_tax_id_idx ON clients(tenant_id, tax_id);

CREATE TABLE IF NOT EXISTS client_billing_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  billing_subclient_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  ccc VARCHAR(40),
  iban VARCHAR(40),
  swift_bic VARCHAR(20),
  payment_method_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES users(id) ON DELETE SET NULL,
  statistical_sector_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  invoice_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  invoice_folder VARCHAR(500),
  retention_type_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  accepts_b2b_direct_debit BOOLEAN NOT NULL DEFAULT FALSE,
  send_invoices_by_postal_mail BOOLEAN NOT NULL DEFAULT FALSE,
  risk_limit NUMERIC(14,2),
  supplier_reference VARCHAR(80),
  early_payment_financial_percent NUMERIC(8,4),
  billing_key VARCHAR(80),
  accounting_account VARCHAR(50),
  copies_count INTEGER NOT NULL DEFAULT 1,
  retention_account VARCHAR(50),
  offer_margin_percent NUMERIC(8,4),
  offer_coefficient NUMERIC(10,4),
  fixed_payment_days INTEGER[],
  invoice_type_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  invoice_print_model_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  vat_special_cause_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  equivalence_surcharge BOOLEAN NOT NULL DEFAULT FALSE,
  risk_notes TEXT,
  fixed_invoice_text TEXT,
  fixed_invoice_text_position VARCHAR(20) CHECK (fixed_invoice_text_position IN ('before', 'after')),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS client_billing_profiles_client_uniq ON client_billing_profiles(client_id);

CREATE TABLE IF NOT EXISTS client_digital_signature_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invoice_signature_authorized BOOLEAN NOT NULL DEFAULT FALSE,
  invoice_contact_name VARCHAR(160),
  invoice_email VARCHAR(200),
  send_single_email_all_contacts BOOLEAN NOT NULL DEFAULT FALSE,
  cpd_signature_authorized BOOLEAN NOT NULL DEFAULT FALSE,
  cpd_contact_name VARCHAR(160),
  cpd_email VARCHAR(200),
  web_account_responsible_email VARCHAR(200),
  web_cpd_signature_authorization_status VARCHAR(80),
  generate_e_invoice BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS client_digital_signature_settings_client_uniq ON client_digital_signature_settings(client_id);

CREATE TABLE IF NOT EXISTS client_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(200) NOT NULL,
  tax_id_type_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  tax_id VARCHAR(30),
  social_security_number VARCHAR(50),
  is_autonomous_contribution_account BOOLEAN NOT NULL DEFAULT FALSE,
  blocked BOOLEAN NOT NULL DEFAULT FALSE,
  address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
  phone VARCHAR(40),
  fax VARCHAR(40),
  email VARCHAR(200),
  ss_regime_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  cnae_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  client_agreement_id UUID REFERENCES agreements(id) ON DELETE SET NULL,
  payroll_agreement_id UUID REFERENCES agreements(id) ON DELETE SET NULL,
  project_code VARCHAR(50),
  grda_agreement_id UUID REFERENCES agreements(id) ON DELETE SET NULL,
  tc_company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  tc_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  managing_entity_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  pension_plan_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  compensation_type_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS client_centers_tenant_client_code_uniq ON client_centers(tenant_id, client_id, code);

CREATE TABLE IF NOT EXISTS client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  center_id UUID REFERENCES client_centers(id) ON DELETE SET NULL,
  sort_order INTEGER,
  name VARCHAR(160) NOT NULL,
  position VARCHAR(120),
  department VARCHAR(120),
  tax_id_type_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  document_number VARCHAR(40),
  phone VARCHAR(40),
  mobile VARCHAR(40),
  email VARCHAR(200),
  birth_date DATE,
  signs_cpds BOOLEAN NOT NULL DEFAULT FALSE,
  receives_digital_signature BOOLEAN NOT NULL DEFAULT FALSE,
  invoice_send_type VARCHAR(50),
  send_collection_claims BOOLEAN NOT NULL DEFAULT FALSE,
  observations TEXT,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS client_contacts_client_center_idx ON client_contacts(client_id, center_id);

CREATE TABLE IF NOT EXISTS client_portal_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES client_contacts(id) ON DELETE SET NULL,
  username VARCHAR(80) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(160),
  document_number VARCHAR(40),
  position VARCHAR(120),
  phone VARCHAR(40),
  email VARCHAR(200),
  user_type VARCHAR(60) NOT NULL,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  blocked BOOLEAN NOT NULL DEFAULT FALSE,
  blocked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  blocked_at TIMESTAMPTZ,
  last_password_change_at TIMESTAMPTZ,
  last_access_at TIMESTAMPTZ,
  web_history_months INTEGER,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS client_portal_users_tenant_client_username_uniq
  ON client_portal_users(tenant_id, client_id, username);

CREATE TABLE IF NOT EXISTS client_portal_user_centers (
  portal_user_id UUID NOT NULL REFERENCES client_portal_users(id) ON DELETE CASCADE,
  center_id UUID NOT NULL REFERENCES client_centers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  PRIMARY KEY (portal_user_id, center_id)
);

CREATE TABLE IF NOT EXISTS professional_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  occupation_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  agreement_id UUID REFERENCES agreements(id) ON DELETE SET NULL,
  cno_code VARCHAR(30),
  statistical_code VARCHAR(50),
  affiliation_category VARCHAR(120),
  type VARCHAR(30) CHECK (type IN ('position', 'category', 'other')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS professional_categories_scope_code_uniq
  ON professional_categories(
    tenant_id,
    code,
    COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  offer_number VARCHAR(40),
  offer_date DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'sent', 'accepted', 'rejected', 'cancelled')),
  type VARCHAR(30) CHECK (type IN ('client', 'internal', 'other')),
  crm_offer_ref VARCHAR(80),
  is_agrarian BOOLEAN NOT NULL DEFAULT FALSE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  center_id UUID REFERENCES client_centers(id) ON DELETE SET NULL,
  order_reference VARCHAR(120),
  valid_until DATE,
  accepted_rejected_at DATE,
  ss_regime_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  agreement_id UUID REFERENCES agreements(id) ON DELETE SET NULL,
  contract_type_id UUID REFERENCES contract_types(id) ON DELETE SET NULL,
  agreement_price_year INTEGER,
  category_id UUID REFERENCES professional_categories(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES users(id) ON DELETE SET NULL,
  estimated_hours NUMERIC(10,2),
  rejection_cause_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  enjoys_vacation BOOLEAN NOT NULL DEFAULT FALSE,
  annual_payments INTEGER,
  hours_per_day NUMERIC(8,2),
  hours_per_year NUMERIC(10,2),
  part_time_coefficient NUMERIC(10,4),
  employer_ss_cost_percent NUMERIC(7,4),
  payment_method_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  observations TEXT,
  printed BOOLEAN NOT NULL DEFAULT FALSE,
  printed_at DATE,
  sent BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at DATE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS offers_tenant_company_branch_number_uniq
  ON offers(tenant_id, company_id, branch_id, offer_number)
  WHERE offer_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS offers_client_center_status_idx ON offers(client_id, center_id, status);

CREATE TABLE IF NOT EXISTS offer_calculation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  calculate_coefficients BOOLEAN NOT NULL DEFAULT TRUE,
  margin_percent NUMERIC(8,4),
  indemnity_percent NUMERIC(8,4),
  absenteeism_percent NUMERIC(8,4),
  training_percent NUMERIC(8,4),
  medical_check_percent NUMERIC(8,4),
  medical_check_amount NUMERIC(12,2),
  normal_hour_concept_id UUID REFERENCES payroll_concepts(id) ON DELETE SET NULL,
  monthly_rate_concept_id UUID REFERENCES payroll_concepts(id) ON DELETE SET NULL,
  short_contract_rate_concept_id UUID REFERENCES payroll_concepts(id) ON DELETE SET NULL,
  short_contract_surcharge_concept_id UUID REFERENCES payroll_concepts(id) ON DELETE SET NULL,
  short_contract_amount NUMERIC(12,2),
  short_contract_margin NUMERIC(8,4),
  short_contract_sale_rate NUMERIC(12,2),
  short_contract_coefficient NUMERIC(10,4),
  additional_coefficients JSONB NOT NULL DEFAULT '{}'::jsonb,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS offer_calculation_settings_offer_uniq ON offer_calculation_settings(offer_id);

CREATE TABLE IF NOT EXISTS offer_price_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  position_code VARCHAR(50),
  occupation_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  salary_level_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  concept_id UUID NOT NULL REFERENCES payroll_concepts(id) ON DELETE RESTRICT,
  description VARCHAR(250),
  annual_gross NUMERIC(12,2),
  monthly_gross NUMERIC(12,2),
  hour_salary NUMERIC(12,4),
  monthly_salary NUMERIC(12,2),
  margin_percent NUMERIC(8,4),
  it_ims_percent NUMERIC(8,4),
  hourly_rate NUMERIC(12,4),
  monthly_rate NUMERIC(12,2),
  normal_hours_coefficient NUMERIC(10,4),
  monthly_coefficient NUMERIC(10,4),
  applies_maternity_bonus BOOLEAN NOT NULL DEFAULT FALSE,
  payroll_price NUMERIC(12,4),
  cost_price NUMERIC(12,4),
  sale_price NUMERIC(12,4),
  other_amount NUMERIC(12,4),
  print_offer BOOLEAN NOT NULL DEFAULT FALSE,
  print_invoice_cpd BOOLEAN NOT NULL DEFAULT FALSE,
  print_salary_cpd BOOLEAN NOT NULL DEFAULT FALSE,
  print_contract BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS offer_price_lines_offer_concept_idx ON offer_price_lines(offer_id, concept_id);

CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_code VARCHAR(40) NOT NULL,
  worker_code VARCHAR(40),
  first_name VARCHAR(100),
  last_name VARCHAR(160),
  full_name VARCHAR(260) NOT NULL,
  tax_id VARCHAR(40),
  social_security_number VARCHAR(60),
  phone VARCHAR(40),
  mobile VARCHAR(40),
  email VARCHAR(200),
  address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
  city VARCHAR(120),
  province_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  disability BOOLEAN NOT NULL DEFAULT FALSE,
  expected_end_date DATE,
  block_status_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  cv_web BOOLEAN NOT NULL DEFAULT FALSE,
  cv_attached BOOLEAN NOT NULL DEFAULT FALSE,
  cv_date DATE,
  data_entry_source VARCHAR(80),
  initial_origin VARCHAR(80),
  attention_mark BOOLEAN NOT NULL DEFAULT FALSE,
  discontinuous_fixed BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS candidates_tenant_code_uniq ON candidates(tenant_id, candidate_code);
CREATE INDEX IF NOT EXISTS candidates_tax_id_idx ON candidates(tax_id);
CREATE INDEX IF NOT EXISTS candidates_email_idx ON candidates(email);
CREATE INDEX IF NOT EXISTS candidates_available_active_idx ON candidates(available, active);

COMMENT ON COLUMN candidates.tax_id IS 'Sensitive personal data. Protect access and exports for GDPR.';
COMMENT ON COLUMN candidates.social_security_number IS 'Sensitive personal data. Protect access and exports for GDPR.';

CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE RESTRICT,
  worker_code VARCHAR(40) NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  hire_date DATE,
  termination_date DATE,
  payroll_profile JSONB DEFAULT '{}'::jsonb,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS workers_tenant_company_code_uniq ON workers(tenant_id, company_id, worker_code);

CREATE TABLE IF NOT EXISTS candidate_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  document_type_id UUID NOT NULL REFERENCES catalog_items(id) ON DELETE RESTRICT,
  file_name VARCHAR(250) NOT NULL,
  storage_key VARCHAR(500) NOT NULL,
  mime_type VARCHAR(120),
  file_size BIGINT,
  signed BOOLEAN NOT NULL DEFAULT FALSE,
  signed_at TIMESTAMPTZ,
  expires_at DATE,
  visibility VARCHAR(30) NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal', 'client_portal', 'candidate_portal')),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CHECK (candidate_id IS NOT NULL OR worker_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS candidate_documents_candidate_type_idx ON candidate_documents(candidate_id, document_type_id);

CREATE TABLE IF NOT EXISTS candidate_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  followup_type VARCHAR(80) NOT NULL,
  status VARCHAR(80),
  score NUMERIC(5,2),
  comments TEXT,
  followup_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS candidate_followups_candidate_at_idx ON candidate_followups(candidate_id, followup_at);

CREATE TABLE IF NOT EXISTS ett_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  request_number VARCHAR(40) NOT NULL,
  offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  center_id UUID REFERENCES client_centers(id) ON DELETE SET NULL,
  responsible_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  request_date DATE NOT NULL,
  start_date DATE,
  end_date DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'partial', 'completed', 'cancelled', 'rejected')),
  position_id UUID REFERENCES professional_categories(id) ON DELETE SET NULL,
  order_reference VARCHAR(120),
  workers_requested INTEGER NOT NULL DEFAULT 1,
  workers_assigned INTEGER NOT NULL DEFAULT 0,
  workers_accepted INTEGER NOT NULL DEFAULT 0,
  workers_rejected INTEGER NOT NULL DEFAULT 0,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS ett_requests_tenant_company_branch_number_uniq
  ON ett_requests(tenant_id, company_id, branch_id, request_number);
CREATE INDEX IF NOT EXISTS ett_requests_client_center_status_idx ON ett_requests(client_id, center_id, status);

CREATE TABLE IF NOT EXISTS ett_request_contract_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES ett_requests(id) ON DELETE CASCADE,
  category_id UUID REFERENCES professional_categories(id) ON DELETE SET NULL,
  salary_level_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  page_code VARCHAR(50),
  contract_type_id UUID REFERENCES contract_types(id) ON DELETE SET NULL,
  occupation_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  rate_group_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  quotation_type VARCHAR(80),
  salary_type VARCHAR(30) CHECK (salary_type IN ('hourly', 'monthly', 'annual', 'other')),
  contract_authorization VARCHAR(250),
  weekly_schedule JSONB,
  schedule_from TIME,
  schedule_to TIME,
  internal_observations TEXT,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS ett_request_contract_data_request_uniq ON ett_request_contract_data(request_id);

CREATE TABLE IF NOT EXISTS ett_request_characteristics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES ett_requests(id) ON DELETE CASCADE,
  characteristic_id UUID NOT NULL REFERENCES catalog_items(id) ON DELETE RESTRICT,
  value VARCHAR(250),
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ett_request_characteristics_request_characteristic_idx
  ON ett_request_characteristics(request_id, characteristic_id);

CREATE TABLE IF NOT EXISTS ett_request_web_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES ett_requests(id) ON DELETE CASCADE,
  publish_web BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
  contact_name VARCHAR(160),
  contact_email VARCHAR(200),
  web_position_title VARCHAR(200),
  web_category_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  functions_description TEXT,
  requirements TEXT,
  schedule_description TEXT,
  city_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  published_at DATE,
  publication_ends_at DATE,
  salary_public_text VARCHAR(250),
  external_slug VARCHAR(200),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS ett_request_web_publications_tenant_slug_uniq
  ON ett_request_web_publications(tenant_id, external_slug)
  WHERE external_slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ett_request_web_publications_request_uniq
  ON ett_request_web_publications(request_id);
CREATE INDEX IF NOT EXISTS ett_request_web_publications_request_status_idx
  ON ett_request_web_publications(request_id, status);

CREATE TABLE IF NOT EXISTS ett_request_price_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES ett_requests(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES payroll_concepts(id) ON DELETE RESTRICT,
  description VARCHAR(250),
  valid_from DATE,
  valid_to DATE,
  price NUMERIC(12,4),
  payments INTEGER,
  print_flags JSONB DEFAULT '{}'::jsonb,
  reference VARCHAR(120),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ett_request_price_lines_request_concept_idx
  ON ett_request_price_lines(request_id, concept_id);

CREATE TABLE IF NOT EXISTS ett_request_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES ett_requests(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE RESTRICT,
  worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  origin VARCHAR(30) NOT NULL DEFAULT 'manual' CHECK (origin IN ('manual', 'web', 'import', 'other')),
  status VARCHAR(30) NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'rejected', 'cancelled', 'hired')),
  status_date DATE,
  rejection_cause_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  notes TEXT,
  phone_snapshot VARCHAR(40),
  notified_at TIMESTAMPTZ,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS ett_request_assignments_request_candidate_uniq
  ON ett_request_assignments(request_id, candidate_id);
CREATE INDEX IF NOT EXISTS ett_request_assignments_candidate_status_idx
  ON ett_request_assignments(candidate_id, status);

CREATE TABLE IF NOT EXISTS document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(80) NOT NULL,
  name VARCHAR(160) NOT NULL,
  template_type VARCHAR(80) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  storage_key VARCHAR(500) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS document_templates_tenant_code_version_uniq
  ON document_templates(tenant_id, code, version);

CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'portal')),
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  related_entity_type VARCHAR(80) NOT NULL,
  related_entity_id UUID NOT NULL,
  recipient_name VARCHAR(160),
  recipient_address VARCHAR(250),
  subject VARCHAR(250),
  body TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'delivered', 'read')),
  sent_at TIMESTAMPTZ,
  provider_message_id VARCHAR(160),
  metadata JSONB DEFAULT '{}'::jsonb,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS communications_related_entity_idx
  ON communications(tenant_id, related_entity_type, related_entity_id);

CREATE TABLE IF NOT EXISTS generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_kind VARCHAR(80) NOT NULL,
  related_entity_type VARCHAR(80) NOT NULL,
  related_entity_id UUID NOT NULL,
  template_id UUID REFERENCES document_templates(id) ON DELETE SET NULL,
  file_name VARCHAR(250) NOT NULL,
  storage_key VARCHAR(500) NOT NULL,
  format VARCHAR(20) NOT NULL CHECK (format IN ('pdf', 'docx', 'html')),
  generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signature_status VARCHAR(30) NOT NULL DEFAULT 'not_required' CHECK (signature_status IN ('not_required', 'pending', 'signed', 'rejected')),
  signature_provider_id VARCHAR(160),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS generated_documents_related_entity_idx
  ON generated_documents(related_entity_type, related_entity_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  session_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id UUID,
  before_data JSONB,
  after_data JSONB,
  ip_address INET,
  user_agent TEXT,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON audit_log(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_log_user_created_idx ON audit_log(user_id, created_at);

CREATE TABLE IF NOT EXISTS import_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_type VARCHAR(20) NOT NULL CHECK (process_type IN ('import', 'export')),
  entity_type VARCHAR(80) NOT NULL,
  file_name VARCHAR(250),
  storage_key VARCHAR(500),
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_by UUID REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  rows_total INTEGER,
  rows_ok INTEGER,
  rows_error INTEGER,
  error_report JSONB,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS import_exports_entity_status_idx ON import_exports(tenant_id, entity_type, status);

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'tenants',
    'catalog_items',
    'addresses',
    'prevention_configurations',
    'companies',
    'branches',
    'users',
    'roles',
    'user_roles',
    'user_contexts',
    'agreements',
    'contract_types',
    'payroll_concepts',
    'clients',
    'client_billing_profiles',
    'client_digital_signature_settings',
    'client_centers',
    'client_contacts',
    'client_portal_users',
    'client_portal_user_centers',
    'professional_categories',
    'offers',
    'offer_calculation_settings',
    'offer_price_lines',
    'candidates',
    'workers',
    'candidate_documents',
    'candidate_followups',
    'ett_requests',
    'ett_request_contract_data',
    'ett_request_characteristics',
    'ett_request_web_publications',
    'ett_request_price_lines',
    'ett_request_assignments',
    'document_templates',
    'communications',
    'generated_documents',
    'audit_log',
    'import_exports'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', 'trg_' || tbl || '_updated_at', tbl);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_updated_at()',
      'trg_' || tbl || '_updated_at',
      tbl
    );
  END LOOP;
END;
$$;

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenants_scope ON tenants;
CREATE POLICY tenants_scope ON tenants
  USING (
    COALESCE(current_setting('app.rol', true), '') = 'superadmin'
    OR id::text = COALESCE(current_setting('app.tenant_id', true), '')
  )
  WITH CHECK (
    COALESCE(current_setting('app.rol', true), '') = 'superadmin'
    OR id::text = COALESCE(current_setting('app.tenant_id', true), '')
  );

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'catalog_items',
    'addresses',
    'prevention_configurations',
    'companies',
    'branches',
    'users',
    'roles',
    'user_roles',
    'user_contexts',
    'agreements',
    'contract_types',
    'payroll_concepts',
    'clients',
    'client_billing_profiles',
    'client_digital_signature_settings',
    'client_centers',
    'client_contacts',
    'client_portal_users',
    'client_portal_user_centers',
    'professional_categories',
    'offers',
    'offer_calculation_settings',
    'offer_price_lines',
    'candidates',
    'workers',
    'candidate_documents',
    'candidate_followups',
    'ett_requests',
    'ett_request_contract_data',
    'ett_request_characteristics',
    'ett_request_web_publications',
    'ett_request_price_lines',
    'ett_request_assignments',
    'document_templates',
    'communications',
    'generated_documents',
    'audit_log',
    'import_exports'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'tenant_scope_' || tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (backend_tenant_visible(tenant_id)) WITH CHECK (backend_tenant_visible(tenant_id))',
      'tenant_scope_' || tbl,
      tbl
    );
  END LOOP;
END;
$$;
