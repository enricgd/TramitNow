// Datos tal como los devuelve apps/api (ver su /openapi.json). Si cambia un esquema allí, cambia aquí.

export type Status = 'active' | 'inactive';
export type UserStatus = 'active' | 'blocked' | 'inactive';
export type RoleScope = 'tenant' | 'branches' | 'branch';
export type CompanyType = 'ett' | 'services' | 'merchandising' | 'other';

export type Page<T> = { data: T[]; pagination: { limit: number; offset: number; total: number } };
export type PageQuery = { limit?: number; offset?: number };

export type TenantSummary = { id: string; code: string; legalName: string; tradeName: string | null };

export type Me = {
  user: {
    id: string;
    email: string | null;
    fullName: string;
    phone: string | null;
    status: UserStatus;
    mustChangePassword: boolean;
  };
  isSuperadmin: boolean;
  activeTenant: TenantSummary | null;
  role: { id: string; code: string; name: string; scope: RoleScope } | null;
  permissions: string[];
  branches: { id: string; companyId: string; code: string; name: string }[];
  tenants: TenantSummary[];
};

export type Company = {
  id: string;
  code: string;
  name: string;
  companyType: CompanyType;
  status: Status;
  taxIdTypeId: string | null;
  taxId: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  website: string | null;
  smsSenderName: string | null;
  workerCommunicationsCcEmail: string | null;
  addressId: string | null;
  postalAddressId: string | null;
  createdAt: string;
  updatedAt: string;
};
export type CompanyInput = Partial<Omit<Company, 'id' | 'createdAt' | 'updatedAt'>>;
export type CompanyCreate = CompanyInput & Pick<Company, 'code' | 'name'>;
export type CompanyQuery = PageQuery & { status?: Status; q?: string };

export type Branch = {
  id: string;
  companyId: string;
  code: string;
  name: string;
  status: Status;
  isDefault: boolean;
  phone: string | null;
  email: string | null;
  addressId: string | null;
  createdAt: string;
  updatedAt: string;
};
export type BranchInput = Partial<Omit<Branch, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>>;
export type BranchCreate = BranchInput & Pick<Branch, 'companyId' | 'code' | 'name'>;
export type BranchQuery = PageQuery & { companyId?: string; status?: Status; q?: string };

export type Role = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  scope: RoleScope;
  isSystem: boolean;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
};

export type Permission = { code: string; module: string; description: string };

export type Membership = {
  id: string;
  userId: string;
  fullName: string;
  status: UserStatus;
  role: { id: string; code: string; name: string; scope: RoleScope };
  /** Alcance: sociedades y sucursales. branchId null es toda la sociedad. */
  contexts: { companyId: string; branchId: string | null; isDefault: boolean }[];
  createdAt: string;
  updatedAt: string;
};
export type MembershipQuery = PageQuery & { status?: UserStatus; roleId?: string };

/** Error de la API con su formato común: { error: { code, message, details } }. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Catálogos oficiales (globales, solo lectura) y direcciones
// ---------------------------------------------------------------------------
export type AutonomousCommunity = { code: string; name: string };
export type Province = { code: string; name: string; autonomousCommunityCode: string };
export type Municipality = { code: string; provinceCode: string; checkDigit: string; name: string; active: boolean };
export type MunicipalityQuery = { provinceCode?: string; q?: string; includeInactive?: boolean; limit?: number };
export type Country = { code: string; alpha3: string; numericCode: string; name: string; euMember: boolean; eeaMember: boolean };
export type ContractKey = {
  code: string;
  name: string;
  duration: 'indefinite' | 'temporary';
  workingTime: 'full_time' | 'part_time' | 'fixed_discontinuous';
  isConversion: boolean;
  active: boolean;
  notes: string | null;
};

export type Address = {
  id: string;
  streetType: string | null;
  street: string | null;
  number: string | null;
  door: string | null;
  postalCode: string | null;
  /** Texto libre: fuera de España, o núcleo que no es municipio. */
  city: string | null;
  municipalityCode: string | null;
  provinceCode: string | null;
  countryCode: string;
  geoZoneId: string | null;
  createdAt: string;
  updatedAt: string;
};
export type AddressInput = Partial<Omit<Address, 'id' | 'createdAt' | 'updatedAt'>>;

// ---------------------------------------------------------------------------
// Catálogos laborales de la ETT
// ---------------------------------------------------------------------------
type Stamped = { id: string; createdAt: string; updatedAt: string };
/** Lo editable de un registro de catálogo: todo menos id y fechas. */
export type CatalogInput<T> = Partial<Omit<T, keyof Stamped>>;
export type CatalogCreate<T extends { code: string; name: string }> = CatalogInput<T> & Pick<T, 'code' | 'name'>;
type CatalogQuery = PageQuery & { status?: Status; q?: string };

export type CollectiveAgreement = Stamped & {
  code: string;
  name: string;
  /** Código REGCON (14 dígitos). */
  officialCode: string | null;
  scope: 'state' | 'regional' | 'provincial' | 'local' | 'company' | 'other';
  autonomousCommunityCode: string | null;
  provinceCode: string | null;
  validFrom: string | null;
  validTo: string | null;
  notes: string | null;
  status: Status;
};
export type CollectiveAgreementQuery = CatalogQuery & { provinceCode?: string; scope?: CollectiveAgreement['scope'] };

export type ProfessionalCategory = Stamped & {
  code: string;
  name: string;
  kind: 'position' | 'category';
  agreementId: string | null;
  agreementLevel: string | null;
  cnoCode: string | null;
  contributionGroup: number | null;
  statisticalCode: string | null;
  companyId: string | null;
  branchId: string | null;
  status: Status;
};
export type ProfessionalCategoryQuery = CatalogQuery & {
  agreementId?: string;
  companyId?: string;
  branchId?: string;
  cnoCode?: string;
  kind?: ProfessionalCategory['kind'];
};

export type ContractType = Stamped & {
  code: string;
  name: string;
  contractKeyCode: string;
  contributionMode: 'percentages' | 'fixed_amounts';
  status: Status;
};
export type ContractTypeQuery = CatalogQuery & { contractKeyCode?: string };

export type PayrollConcept = Stamped & {
  code: string;
  name: string;
  description: string | null;
  conceptType: 'normal_hour' | 'overtime' | 'salary_supplement' | 'allowance' | 'employer_cost' | 'discount' | 'other';
  calculation: 'percentage' | 'fixed_hour' | 'fixed_day' | 'fixed_month' | 'fixed';
  defaultValue: number | null;
  calculationBase: 'gross_hourly_salary' | 'total_salary_cost' | 'contribution_base' | 'hourly_rate' | 'effective_hours' | null;
  isSalary: boolean;
  isMandatory: boolean;
  printOnOffer: boolean;
  printOnInvoiceCpd: boolean;
  printOnSalaryCpd: boolean;
  printOnContract: boolean;
  status: Status;
};
export type PayrollConceptQuery = CatalogQuery & { conceptType?: PayrollConcept['conceptType'] };

// ---------------------------------------------------------------------------
// Clientes (empresas usuarias), centros de trabajo, contactos y facturación
// ---------------------------------------------------------------------------
export type ClientStatus = 'prospect' | 'active' | 'inactive';

export type Client = Stamped & {
  companyId: string;
  /** Sucursal propietaria: decide quién puede editarlo. */
  branchId: string;
  code: string;
  legalName: string;
  tradeName: string | null;
  taxIdType: 'nif' | 'nie' | 'vat_eu' | 'other';
  /** Único por sociedad; la API lo guarda sin espacios ni guiones. */
  taxId: string | null;
  ownerUserId: string | null;
  clientTypeId: string | null;
  businessGroupId: string | null;
  activity: string | null;
  startDate: string | null;
  status: ClientStatus;
  blocked: boolean;
  blockedReason: string | null;
  addressId: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  website: string | null;
  onlineCpdPricePrinting: boolean;
  observations: string | null;
};
export type ClientInput = Partial<Omit<Client, keyof Stamped>>;
export type ClientCreate = ClientInput & Pick<Client, 'companyId' | 'branchId' | 'code' | 'legalName'>;
export type ClientQuery = PageQuery & { q?: string; status?: ClientStatus; companyId?: string; branchId?: string; blocked?: boolean };

export type ClientCenter = Stamped & {
  clientId: string;
  /** Sucursal de la ETT que gestiona el centro. */
  branchId: string;
  code: string;
  name: string;
  taxId: string | null;
  /** Código de cuenta de cotización (11 dígitos). */
  ccc: string | null;
  isSelfEmployedCcc: boolean;
  cnaeCode: string | null;
  ssRegimeCode: string | null;
  blocked: boolean;
  addressId: string | null;
  phone: string | null;
  email: string | null;
  clientAgreementId: string | null;
  payrollAgreementId: string | null;
  grdaAgreementId: string | null;
  projectCode: string | null;
  tcCompanyId: string | null;
  tcBranchId: string | null;
  accessInstructions: string | null;
  notes: string | null;
};
export type ClientCenterInput = Partial<Omit<ClientCenter, keyof Stamped>>;
export type ClientCenterCreate = ClientCenterInput & Pick<ClientCenter, 'clientId' | 'branchId' | 'code' | 'name'>;
export type ClientCenterQuery = PageQuery & { q?: string; clientId?: string; branchId?: string };

export type ContactRole = 'commercial' | 'requester' | 'operations' | 'billing' | 'hr' | 'prevention' | 'management';
export type ClientContact = Stamped & {
  clientId: string;
  centerId: string | null;
  name: string;
  position: string | null;
  department: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  roles: ContactRole[];
  isMain: boolean;
  isQuoteRecipient: boolean;
  signsCpds: boolean;
  /** Solo de quien firma los CPD. */
  documentType: 'nif' | 'nie' | 'passport' | 'other' | null;
  documentNumber: string | null;
  receivesDigitalSignature: boolean;
  sendCollectionClaims: boolean;
  invoiceSendType: 'email' | 'postal' | 'portal' | null;
  sortOrder: number | null;
  notes: string | null;
};
export type ClientContactInput = Partial<Omit<ClientContact, keyof Stamped>>;
export type ClientContactCreate = ClientContactInput & Pick<ClientContact, 'clientId' | 'name'>;
export type ClientContactQuery = PageQuery & { q?: string; clientId?: string; centerId?: string };

export type ClientBilling = Stamped & {
  clientId: string;
  paymentMethodId: string | null;
  paymentTermDays: number | null;
  fixedPaymentDays: number[] | null;
  iban: string | null;
  swiftBic: string | null;
  b2bDirectDebit: boolean;
  invoiceClientId: string | null;
  invoiceTypeId: string | null;
  invoicePrintModelId: string | null;
  copiesCount: number;
  sendInvoicesByPostalMail: boolean;
  generateEInvoice: boolean;
  fixedInvoiceText: string | null;
  fixedInvoiceTextPosition: 'before' | 'after' | null;
  vatSpecialCauseId: string | null;
  equivalenceSurcharge: boolean;
  retentionTypeId: string | null;
  riskLimit: number | null;
  riskNotes: string | null;
  accountingAccount: string | null;
  supplierReference: string | null;
  sellerUserId: string | null;
  statisticalSectorId: string | null;
  offerMarginPercent: number | null;
  offerCoefficient: number | null;
};
export type ClientBillingInput = Partial<Omit<ClientBilling, keyof Stamped | 'clientId'>>;
/** `warnings`: avisos que no impiden guardar (p. ej. plazo de pago por encima del legal). */
export type ClientBillingResult = { billing: ClientBilling; warnings: string[] };
