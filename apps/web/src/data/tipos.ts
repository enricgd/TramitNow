// Datos tal como los devuelve apps/api (ver su /openapi.json). Si cambia un esquema allí, cambia aquí.
import type { AgreementDefaults, Margin as QuoteMargin, PositionIssue, PositionResult, QuoteTotals, SocialSecurityRates } from './calculoPresupuestos';
export type { AgreementDefaults, QuoteMargin, PositionIssue, PositionResult, QuoteTotals, SocialSecurityRates };

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
  /** Del equipo de contenidos de TramitNOW (catálogo global de convenios). */
  isContentEditor: boolean;
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
  email: string | null;
  /** Último acceso; null si nunca ha entrado. */
  lastSignInAt: string | null;
  department: string | null;
  /** Invitado y aún sin aceptar (nunca ha entrado). */
  invitationPending: boolean;
  invitedAt: string | null;
  invitedBy: string | null;
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
  /** Convenio del catálogo global de TramitNOW (tablas salariales). */
  globalAgreementId?: string | null;
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

/**
 * Baja lógica recuperable: DELETE la marca, `?deleted=true` lista solo las eliminadas (con su fecha) y
 * POST /{id}/restore la recupera. Lo que ya se ha usado no se elimina (409 `en_uso`): se suspende o desactiva.
 */
type Deleted = { deletedAt?: string | null };
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
  /** Sector: división del catálogo común CNAE (GET /v1/cnae). */
  sectorCode: string | null;
  /** Convenio por defecto: lo heredan los centros sin convenio propio. */
  defaultAgreementId: string | null;
  /** Fase 7 (art. 8.d de la Ley 14/1994): la empresa es una ETT; no se le puede ceder personal. */
  isEtt?: boolean;
  /** Solo lectura, en las listas: centros y contactos activos y si tiene datos de facturación. */
  readiness?: ClientReadiness;
} & Deleted;
export type ClientReadiness = { centers: number; contacts: number; hasBilling: boolean };
export type ClientInput = Partial<Omit<Client, keyof Stamped | 'deletedAt' | 'readiness'>>;
export type ClientCreate = ClientInput & Pick<Client, 'companyId' | 'branchId' | 'code' | 'legalName'>;
/** `branchId`: una o varias sucursales separadas por comas. `deleted`: solo los eliminados. */
export type ClientQuery = PageQuery & { q?: string; status?: ClientStatus; companyId?: string; branchId?: string; blocked?: boolean; deleted?: boolean };

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
  /** Solo lectura: el convenio propio o, si no tiene, el de la empresa (defaultAgreementId). */
  effectiveClientAgreementId: string | null;
} & Deleted;
export type ClientCenterInput = Partial<Omit<ClientCenter, keyof Stamped | 'deletedAt' | 'effectiveClientAgreementId'>>;
export type ClientCenterCreate = ClientCenterInput & Pick<ClientCenter, 'clientId' | 'branchId' | 'code' | 'name'>;
export type ClientCenterQuery = PageQuery & { q?: string; clientId?: string; branchId?: string; deleted?: boolean };

/** other: «Otro», con su texto en otherRole (obligatorio con este rol; sin él, null). */
export type ContactRole = 'commercial' | 'requester' | 'operations' | 'billing' | 'hr' | 'prevention' | 'management' | 'other';
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
  /** Valida los partes de horas en el portal. */
  validatesHours: boolean;
  /** Rol «Otro», con el texto escrito. */
  otherRole: string | null;
  /** Suspendido: no recibe presupuestos ni avisos. Se reactiva. */
  suspended: boolean;
  /** Solo lectura: cuándo y quién lo suspendió. */
  suspendedAt?: string | null;
  suspendedBy?: string | null;
} & Deleted;
export type ClientContactInput = Partial<Omit<ClientContact, keyof Stamped | 'deletedAt' | 'suspendedAt' | 'suspendedBy'>>;
export type ClientContactCreate = ClientContactInput & Pick<ClientContact, 'clientId' | 'name'>;
export type ClientContactQuery = PageQuery & { q?: string; clientId?: string; centerId?: string; deleted?: boolean };

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
  /** Factura de horas: una línea por persona o por concepto (con anexo por persona). */
  invoiceLayout: InvoiceLayout;
};
export type InvoiceLayout = 'by_person' | 'by_concept';
export type ClientBillingInput = Partial<Omit<ClientBilling, keyof Stamped | 'clientId'>>;
/** `warnings`: avisos que no impiden guardar (p. ej. plazo de pago por encima del legal). */
export type ClientBillingResult = { billing: ClientBilling; warnings: string[] };

// ---------------------------------------------------------------------------
// Catálogo CNAE, tablas maestras, historial y documentos
// ---------------------------------------------------------------------------

/** CNAE-2009, común a todas las ETT (GET /v1/cnae). */
export type Cnae = { code: string; name: string; level: 'section' | 'division' | 'group' | 'class'; parentCode: string | null };
export type CnaeQuery = { q?: string; level?: 'section' | 'division' };

/** Tablas maestras simples de la ETT (catalog_items): sectores, formas de pago, tipos de documento... */
export type CatalogItemType = 'payment_method' | 'vat_special_cause' | 'document_type' | 'sector' | (string & {});
export type CatalogItem = Stamped & {
  type: CatalogItemType;
  code: string | null;
  name: string;
  parentId: string | null;
  metadata: Record<string, unknown> | null;
  status: Status;
  /** Solo tipos de documento: sus documentos no se pueden eliminar (conservación obligatoria). */
  retentionRequired: boolean;
};
export type CatalogItemQuery = PageQuery & { type: CatalogItemType; q?: string; status?: Status; parentId?: string };
export type CatalogItemCreate = { type: CatalogItemType; name: string; code?: string; parentId?: string; status?: Status };

/** Historial de cambios (GET /v1/activity), lo último primero. */
export type ActivityEntityType = 'client' | 'client_center' | 'client_contact' | 'client_billing' | 'document' | 'quote' | 'request' | 'candidate';
export type ActivityEntry = {
  id: string;
  entityType: ActivityEntityType;
  entityId: string;
  parentType: ActivityEntityType | null;
  parentId: string | null;
  action: 'create' | 'update' | 'delete' | 'restore';
  actorUserId: string | null;
  actorName: string | null;
  occurredAt: string;
  summary: string;
  changes: Record<string, { old: unknown; new: unknown } | { masked: true }> | null;
};
export type ActivityQuery = PageQuery & { entityType: ActivityEntityType; entityId: string; includeChildren?: boolean };

export type DocumentEntityType = 'client' | 'client_center' | 'quote' | 'request' | 'candidate' | 'hiring_file';
export type DocumentStatus = 'pending' | 'validated' | 'draft' | 'rejected';
export type StoredDocument = Stamped & {
  entityType: DocumentEntityType;
  entityId: string;
  typeId: string;
  typeName: string;
  /** Su tipo exige conservarlo: no se puede eliminar (409 conservacion_obligatoria). */
  retentionRequired: boolean;
  name: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  expiresOn: string | null;
  visibleInPortal: boolean;
  notes: string | null;
  uploadedBy: string | null;
  uploadedByName: string | null;
  uploadedAt: string;
  validatedBy: string | null;
  validatedByName: string | null;
  validatedAt: string | null;
  /** Fase 6: motivo del rechazo y último aviso de renovación (documentos de candidatos). */
  rejectionReason?: string | null;
  renewalNoticeSentAt?: string | null;
} & Deleted;
export type DocumentQuery = PageQuery & {
  entityType?: DocumentEntityType;
  entityId?: string;
  typeId?: string;
  status?: DocumentStatus;
  q?: string;
  deleted?: boolean;
};
/** Datos de un documento nuevo: el fichero lo sube el repositorio (URL firmada, PUT a Storage y registro). */
export type DocumentUpload = {
  entityType: DocumentEntityType;
  entityId: string;
  file: File;
  typeId: string;
  name: string;
  status?: 'pending' | 'draft';
  expiresOn?: string | null;
  visibleInPortal?: boolean;
  notes?: string | null;
  /** Fase 6: renovar; el anterior queda eliminado (baja recuperable). */
  replacesDocumentId?: string | null;
};
export type DocumentInput = Partial<Pick<StoredDocument, 'typeId' | 'name' | 'status' | 'expiresOn' | 'visibleInPortal' | 'notes'>>;

// ---------------------------------------------------------------------------
// Pendiente de API. Lo que las pantallas ya usan y apps/api aún no tiene: de momento solo hay datos de
// ejemplo (memoria.ts). La forma es provisional; cuando llegue la ruta, se ajusta aquí y en las dos
// implementaciones. Ver "Pendiente de API" en apps/README.md.
// ---------------------------------------------------------------------------

/** Buscador global de la cabecera (fase 12 del plan). */
export type SearchResultType = 'request' | 'candidate' | 'client' | 'quote';
export type SearchResult = {
  id: string;
  type: SearchResultType;
  title: string;
  detail: string;
  /** Estado tal como se muestra («En selección», «Aceptado»...). */
  status: string | null;
  /** Pantalla de la app (#/ruta) que lo abre; null si aún no hay. */
  route: string | null;
};

/** Avisos del usuario (campana de la cabecera). */
export type NotificationKind = 'urgent' | 'pending' | 'success' | 'info';
export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  text: string;
  createdAt: string;
  read: boolean;
  route: string | null;
};

// ---------------------------------------------------------------------------
// Mi ETT (apps/api/src/routes/mi-ett.ts): datos legales y facturación de cada sociedad, series, CCC, servicios
// que factura la ETT y ajustes de presupuestos.
// ---------------------------------------------------------------------------

export type GuaranteeType = 'bank_guarantee' | 'surety_insurance' | 'cash_deposit' | 'other';
export type IdDocumentType = 'dni' | 'nie' | 'passport';

/** Datos legales de una sociedad (Ley 14/1994). Del certificado digital, solo metadatos. Fechas 'AAAA-MM-DD'. */
export type CompanyLegal = {
  id: string | null;
  companyId: string;
  tradeName: string | null;
  legalForm: string | null;
  /** Clase CNAE de 4 cifras. */
  cnaeCode: string | null;
  /** Convenio del personal de estructura (/v1/collective-agreements). */
  staffAgreementId: string | null;
  ettAuthorizationNumber: string | null;
  ettAuthorizationDate: string | null;
  ettAuthorizationScope: 'state' | 'regional' | null;
  /** Obligatorio si la autorización es autonómica. */
  ettAuthorizationCommunityCode: string | null;
  commercialRegistry: string | null;
  registryVolume: string | null;
  registryFolio: string | null;
  registrySheet: string | null;
  registryEntry: string | null;
  legalRepName: string | null;
  legalRepIdType: IdDocumentType | null;
  legalRepIdNumber: string | null;
  legalRepPosition: string | null;
  mutualInsurer: string | null;
  preventionService: string | null;
  redAuthorization: string | null;
  guaranteeType: GuaranteeType | null;
  guaranteeEntity: string | null;
  guaranteeAmount: number | null;
  guaranteeExpiresOn: string | null;
  certificateHolder: string | null;
  certificateIssuer: string | null;
  certificateExpiresOn: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};
export type CompanyLegalInput = Partial<Omit<CompanyLegal, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>>;
/** `warnings`: garantía o certificado vencidos o a 60 días o menos. */
export type CompanyLegalResult = { legal: CompanyLegal; warnings: string[] };

/** Con qué factura una sociedad. Las series van aparte (NumberSeries). */
export type CompanyBillingSettings = {
  id: string | null;
  companyId: string;
  iban: string | null;
  swiftBic: string | null;
  /** Tabla maestra `payment_method`. */
  paymentMethodId: string | null;
  paymentTerms: string | null;
  vatRate: number;
  withholdingRate: number;
  currency: string;
  billingEmail: string | null;
  /** null: la dirección fiscal de la sociedad. */
  billingAddressId: string | null;
  branchMode: 'centralized' | 'per_branch';
  createdAt: string | null;
  updatedAt: string | null;
};
export type CompanyBillingSettingsInput = Partial<Omit<CompanyBillingSettings, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>>;

export type DocumentKind = 'quote' | 'request' | 'invoice' | 'credit_note';
export type NumberSeries = {
  id: string;
  documentKind: DocumentKind;
  companyId: string | null;
  branchId: string | null;
  year: number;
  prefix: string;
  padding: number;
  /** Último número usado (0: ninguno). */
  lastNumber: number;
  nextNumber: number;
  /** Por ejemplo, 'FAC2026-00108'. */
  nextFormatted: string;
  updatedAt: string;
};
export type NumberSeriesQuery = { documentKind?: DocumentKind; year?: number; companyId?: string };
/** `nextNumber` nunca hacia atrás (409). */
export type NumberSeriesInput = Partial<Pick<NumberSeries, 'prefix' | 'padding' | 'nextNumber'>>;
export type NumberSeriesCreate = NumberSeriesInput & Pick<NumberSeries, 'documentKind' | 'year'> & { companyId?: string | null; branchId?: string | null };

/** Código de cuenta de cotización: 11 cifras (provincia, número y control). */
export type ContributionAccount = Stamped & {
  companyId: string;
  branchId: string | null;
  code: string;
  /** Las 2 primeras cifras del código (solo lectura). */
  provinceCode: string;
  staffType: 'mission' | 'structure';
  status: Status;
};
export type ContributionAccountInput = Partial<Pick<ContributionAccount, 'companyId' | 'branchId' | 'code' | 'staffType' | 'status'>>;
export type ContributionAccountCreate = ContributionAccountInput & Pick<ContributionAccount, 'companyId' | 'code' | 'staffType'>;
export type ContributionAccountQuery = PageQuery & { companyId?: string; branchId?: string; staffType?: ContributionAccount['staffType']; status?: Status };

/** Servicio que factura la ETT además de las horas (selección, formación PRL...). */
export type BillableService = Stamped & {
  code: string;
  name: string;
  chargeMode: 'percentage' | 'per_person' | 'per_unit' | 'fixed';
  /** Porcentaje o precio por defecto. */
  defaultValue: number;
  unit: string;
  status: Status;
};
export type BillableServiceInput = Partial<Omit<BillableService, 'id' | 'createdAt' | 'updatedAt'>>;
export type BillableServiceCreate = BillableServiceInput & Pick<BillableService, 'code' | 'name' | 'chargeMode' | 'unit'>;
export type BillableServiceQuery = PageQuery & { status?: Status; q?: string };

/** Ajustes de presupuestos de la ETT. */
export type TenantSettings = {
  /** Margen mínimo en %; null: sin mínimo. */
  quoteMinMarginPercent: number | null;
  /** Días sin respuesta para avisar (15 por defecto). */
  quoteNoResponseDays: number;
  /** Fase 6: meses de vigencia del consentimiento de bolsa y días de aviso antes de caducar un documento. */
  candidatePoolRetentionMonths?: number;
  candidateDocumentNoticeDays?: number;
  /** Meses que se conserva la auditoría de accesos. */
  accessLogRetentionMonths?: number;
};

/** Para dar de alta un usuario: el alcance es la lista de sociedades y sucursales (branchId null: toda la sociedad). */
export type MembershipContextInput = { companyId: string; branchId?: string | null; isDefault?: boolean };
export type MembershipCreate = { email: string; fullName: string; roleId: string; department?: string | null; contexts: MembershipContextInput[] };
/** `contexts` sustituye todo el alcance. */
export type MembershipUpdate = { roleId?: string; status?: UserStatus; department?: string | null; contexts?: MembershipContextInput[] };
/**
 * `inviteUrl`: el enlace para enviarlo a mano (aún no hay correo saliente); null si ya tenía cuenta.
 * `existingUser`: ya tenía cuenta en TramitNOW y entra con su contraseña de siempre.
 */
export type MembershipCreated = { membership: Membership; inviteUrl: string | null; existingUser: boolean };

// ---------------------------------------------------------------------------
// Mi ETT sin API todavía: plantillas, portales, historial y responsable de cada sucursal.
// ---------------------------------------------------------------------------

export type EttTemplate = { id: string; name: string; category: string; scope: string; status: 'active' | 'incomplete'; format: string; updated: string };
export type EttWelcomeEmail = { activo: boolean; asunto: string; texto: string };
export type EttPortals = { subdominio: string; bienvenida: { empresa: EttWelcomeEmail; candidato: EttWelcomeEmail } };
export type EttActivity = { id: string; timestamp: string; user: string; action: string; type: string };

/** Lo de Mi ETT que aún no tiene ruta en apps/api. Contra la API, `no_disponible`. */
export type EttSettings = {
  templates: EttTemplate[];
  portals: EttPortals;
  activity: EttActivity[];
  /** Responsable de cada sucursal, por id de sucursal. */
  branchManagers: Record<string, string>;
};

/**
 * Acceso de un contacto del cliente al Área de empresas (fase 11 del plan). Por id de contacto.
 * `invitedAt`: fecha de la invitación; `lastAccess`: texto del último acceso, null si aún no ha entrado.
 */
export type ContactPortalAccess = { active: boolean; since: string | null; invitedAt: string | null; lastAccess: string | null; permissions: string[] };

// ---------------------------------------------------------------------------
// Presupuestos (fase 4): contrato de fase4-backend.md (PROVISIONAL en el backend: puede cambiar).
// El cálculo es el módulo puro de la API (apps/api/src/calc/quote.ts), que la web importa tal cual.
// ---------------------------------------------------------------------------


export type QuoteStatus = 'draft' | 'in_preparation' | 'sent' | 'pending_signature' | 'accepted' | 'rejected' | 'superseded' | 'obsolete';
export type QuoteApprovalStatus = 'pending' | 'approved' | 'rejected';

/** Coste interno del presupuesto (absentismo, EPIs, revisión médica...): % sobre el salario por hora o €/h. */
export type QuoteCostConcept = { code: string; name: string; mode: 'percent' | 'per_hour'; value: number; required: boolean; description: string | null };
/** Coste interno aplicado a un puesto: vacíos = el valor del presupuesto. */
export type QuotePositionCost = { code: string; applies: boolean; percent: number | null; perHour: number | null };
/** Concepto extra (hora extra, nocturna...). Siempre queda en la oferta; `print` decide si sale en la propuesta. */
export type QuoteExtra = {
  code: string;
  name: string;
  salaryCoefficient: number | null;
  salaryPerHour: number | null;
  salarySupplementPerHour: number | null;
  /** Tarifa: solo uno de los dos; ninguno = el mismo factor tarifa/salario que la hora normal. */
  rateSurchargePercent: number | null;
  ratePerHour: number | null;
  print: boolean;
  custom: boolean;
  /** Mínimo del convenio para el salario de este extra (solo lectura). */
  agreementMinimumSalaryHour?: number | null;
};

export type QuotePosition = {
  id: string;
  sortOrder: number;
  name: string;
  description: string | null;
  collectiveAgreementId: string | null;
  collectiveAgreementName: string | null;
  /** Categoría de la tabla del convenio global (agreement_categories). */
  agreementCategoryId: string | null;
  agreementCategoryName: string | null;
  customCategoryName: string | null;
  level: string | null;
  agreementVersionId: string | null;
  agreementPeriod: { from: string; to: string | null } | null;
  /** Salario mínimo por hora del convenio de la empresa usuaria: por debajo, 422 `salario_bajo_convenio`. */
  agreementMinimumSalaryHour: number | null;
  annualBaseSalary: number;
  monthlyBonus: number;
  annualPayments: number | null;
  annualHours: number;
  hoursPerDay: number;
  vacationDays: number;
  vacationDaysType: 'naturales' | 'laborables';
  /** Campos cambiados a mano (los demás salen del convenio). */
  manualFields: string[];
  people: number;
  hoursPerPerson: number;
  hourlyRate: number | null;
  /** null: el margen del presupuesto. */
  margin: QuoteMargin | null;
  costs: QuotePositionCost[];
  extras: QuoteExtra[];
  /** Lo calcula el servidor al guardar. */
  calculation: PositionResult | null;
};
/** Lo que se envía de un puesto (la versión del convenio y los campos cambiados a mano los decide el servidor). */
export type QuotePositionInput = Partial<
  Omit<
    QuotePosition,
    'id' | 'calculation' | 'agreementPeriod' | 'agreementMinimumSalaryHour' | 'collectiveAgreementName' | 'agreementCategoryName' | 'agreementVersionId' | 'manualFields'
  >
>;

export type QuoteVersion = {
  id: string;
  quoteId: string;
  versionNumber: number;
  status: QuoteStatus;
  /** Solo la versión actual en borrador o en preparación. */
  editable: boolean;
  title: string | null;
  contactId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPosition: string | null;
  contactPhone: string | null;
  salesRepId: string | null;
  salesRepName: string | null;
  issueDate: string;
  validUntil: string | null;
  expectedStartDate: string | null;
  durationMonths: number | null;
  modality: string | null;
  paymentMethodId: string | null;
  paymentMethodName: string | null;
  vatRate: number;
  currency: string;
  replacementGuarantee: string | null;
  commercialNotes: string | null;
  conditions: string | null;
  margin: QuoteMargin;
  ssRates: SocialSecurityRates;
  costConcepts: QuoteCostConcept[];
  defaultExtras: QuoteExtra[];
  approvalStatus: QuoteApprovalStatus | null;
  approvalNotes: string | null;
  approvalRequestedAt: string | null;
  approvalDecidedAt: string | null;
  approvalRequestedByName: string | null;
  approvalDecidedByName: string | null;
  /** Margen mínimo de la ETT cuando se calculó (null: sin mínimo). */
  minMarginPercent: number | null;
  sentAt: string | null;
  sentByName: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  rejectionReasonId: string | null;
  rejectionReasonName: string | null;
  rejectionNotes: string | null;
  closedAt: string | null;
  positions: QuotePosition[];
  totals: Omit<QuoteTotals, 'averageCost'> | null;
  issues: { position: number; issue: PositionIssue }[];
  createdAt: string;
  createdByName: string | null;
  updatedAt: string;
};
/** Lo que se cambia de la cabecera de una versión (en borrador o en preparación). */
export type QuoteVersionInput = Partial<
  Pick<
    QuoteVersion,
    | 'title' | 'contactId' | 'salesRepId' | 'issueDate' | 'validUntil' | 'expectedStartDate' | 'durationMonths' | 'modality' | 'paymentMethodId'
    | 'vatRate' | 'currency' | 'replacementGuarantee' | 'commercialNotes' | 'conditions' | 'margin' | 'ssRates' | 'costConcepts' | 'defaultExtras'
  >
> & { status?: 'draft' | 'in_preparation' };

export type QuoteVersionSummary = {
  id: string; versionNumber: number; status: QuoteStatus; issueDate: string; validUntil: string | null; createdAt: string; createdByName: string | null;
  revenue: number; averageRate: number; marginPercent: number;
};

/** Cabecera del presupuesto (la de la fila del listado sin lo de la versión), con su versión actual y las anteriores. */
export type Quote = Pick<
  QuoteSummary,
  | 'id' | 'code' | 'companyId' | 'branchId' | 'clientId' | 'clientName' | 'clientAgreementId' | 'status' | 'versionNumber' | 'createdFromQuoteId'
  | 'createdFromCode' | 'replacedByQuoteId' | 'replacedByCode' | 'obsoleteAt' | 'obsoleteReason' | 'createdAt'
> & { clientTaxId: string | null; clientSectorCode: string | null; currentVersion: QuoteVersion; versions: QuoteVersionSummary[] };

/** Revisión antes de enviar (GET /v1/quote-versions/{id}/review). `path`: el campo para «Corregir». */
export type QuoteReview = {
  ready: boolean;
  needsApproval: boolean;
  approvalStatus: QuoteApprovalStatus | null;
  minMarginPercent: number | null;
  checks: { code: string; path: string; ok: boolean; kind: 'error' | 'approval'; message: string }[];
};
export type QuoteCreate = QuoteVersionInput & { clientId?: string | null; branchId?: string | null };

/** Fila del listado. */
export type QuoteSummary = {
  id: string;
  code: string;
  companyId: string;
  branchId: string;
  clientId: string | null;
  clientName: string | null;
  clientAgreementId: string | null;
  status: QuoteStatus;
  versionNumber: number;
  createdFromQuoteId: string | null;
  createdFromCode: string | null;
  replacedByQuoteId: string | null;
  replacedByCode: string | null;
  obsoleteAt: string | null;
  obsoleteReason: string | null;
  createdAt: string;
  title: string | null;
  salesRepId: string | null;
  salesRepName: string | null;
  issueDate: string;
  validUntil: string | null;
  positionsCount: number;
  people: number;
  hours: number;
  revenue: number;
  averageRate: number;
  marginPercent: number;
  approvalStatus: QuoteApprovalStatus | null;
  sentAt: string | null;
  daysWithoutResponse: number | null;
  noResponse: boolean;
  rejectionReasonName: string | null;
};
export type QuoteQuery = PageQuery & {
  q?: string;
  status?: QuoteStatus;
  salesRepId?: string;
  clientId?: string;
  branchId?: string;
  validity?: 'valid' | 'expiring' | 'expired';
  noResponse?: boolean;
};

/** Valores de un puesto que salen de la tabla del convenio (GET /v1/quote-agreement-defaults). */
export type QuoteAgreementDefaults = {
  agreementVersionId: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  defaults: AgreementDefaults;
};
export type QuoteAgreementDefaultsQuery = { collectiveAgreementId: string; agreementCategoryId?: string | null; date?: string };
/** Categoría de la tabla de un convenio (la de su versión vigente). */
export type AgreementCategory = { id: string; code: string; name: string; group: string | null; level: string | null };

// ---------------------------------------------------------------------------
// Peticiones (fase 5): contrato de fase5-backend.md (rutas /v1/requests, /v1/request-sources...).
// Una petición = un puesto de una versión aceptada de un presupuesto; sus condiciones se copian al crearla.
// Plazas con personas, candidatos, CPD de cada persona y portales son de las fases 6 y 7.
// ---------------------------------------------------------------------------

export type ServiceRequestStatus = 'new' | 'publishing' | 'selecting' | 'covered' | 'in_progress' | 'closed' | 'cancelled';
export type PreCpdStatus = 'pending' | 'generated' | 'sent' | 'reviewed';

/** Un día del horario. `weekday`: 1 lunes … 7 domingo. Si `end` < `start`, pasa la medianoche. `hours` la calcula la API. */
export type RequestScheduleDay = { weekday: number; working: boolean; start: string | null; end: string | null; breakMinutes: number; hours?: number };
/** Plazas por estado. `filled`: cubiertas más incorporadas. */
export type RequestSlots = { open: number; reserved: number; covered: number; started: number; left: number; filled: number };

/** Fila del listado. */
export type ServiceRequestSummary = {
  id: string;
  code: string;
  status: ServiceRequestStatus;
  positionName: string;
  shiftName: string | null;
  clientId: string;
  clientName: string;
  quoteId: string;
  quoteCode: string;
  quoteVersionNumber: number;
  quotePositionId: string;
  branchId: string;
  startDate: string | null;
  endDate: string | null;
  positionsCount: number;
  slots: RequestSlots;
  responsibleUserId: string | null;
  responsibleName: string | null;
  daysToStart: number | null;
  startsSoonUncovered: boolean;
  cancelReason: string | null;
  preCpdStatus: PreCpdStatus;
  createdAt: string;
  /** Centro de trabajo de la ficha del cliente (null si la petición no tiene). */
  clientCenterName?: string | null;
};

/** Condiciones copiadas del puesto del presupuesto al crear la petición (no cambian después). */
export type RequestConditions = {
  positionName: string;
  description: string | null;
  collectiveAgreementId: string | null;
  collectiveAgreementName: string | null;
  agreementVersionId: string | null;
  agreementPeriod: { from: string; to: string | null } | null;
  agreementCategoryId: string | null;
  agreementCategoryCode: string | null;
  categoryName: string | null;
  level: string | null;
  agreementMinimumSalaryHour: number | null;
  salaryHour: number | null;
  grossSalaryHour: number | null;
  rateHour: number | null;
  extras: { code: string; name: string; salaryHour: number | null; rateHour: number | null; print: boolean }[];
  /** El cálculo del puesto tal como estaba; costes y margen a null sin quotes.view_costs. */
  calculation: PositionResult | null;
};

/** Reparto del puesto entre sus peticiones (sin las canceladas). */
export type RequestDistribution = {
  quotePeople: number;
  inRequests: number;
  missing: number;
  siblings: { id: string; code: string; shiftName: string | null; startDate: string | null; endDate: string | null; positionsCount: number; filled: number; status: ServiceRequestStatus; isThis: boolean }[];
  otherPositions: { quotePositionId: string; name: string; requests: { id: string; code: string }[] }[];
};

/** Comprobación para generar el CPD previo. `blocking`: impide generarlo. `field`: el campo que falta. */
export type PreCpdCheck = { code: string; ok: boolean; blocking: boolean; message: string; field: string | null };
export type PreCpd = {
  status: PreCpdStatus;
  /** Algo del CPD cambió después de generarlo: hay que volver a generarlo. */
  outdated: boolean;
  documentId: string | null;
  generatedAt: string | null;
  generatedByName: string | null;
  sentAt: string | null;
  sentByName: string | null;
  sentTo: string | null;
  reviewedAt: string | null;
  checks: PreCpdCheck[];
};

/** Datos del servicio que se completan en la petición (el CPD previo los necesita). */
export type RequestServiceData = {
  clientCenterId: string | null;
  clientSignerContactId: string | null;
  orderReference: string | null;
  notes: string | null;
  tasks: string | null;
  qualification: string | null;
  risks: string | null;
  ppe: string | null;
  requiredLicenses: string | null;
  useCase: string | null;
  useCaseJustification: string | null;
  workdayType: 'full' | 'part' | null;
  /** Trabajo especialmente peligroso (art. 8.b de la Ley 14/1994): bloquea el CPD salvo excepción con su base. */
  hazardousWork: boolean;
};


/** Ficha. */
export type ServiceRequest = ServiceRequestSummary &
  RequestServiceData & {
    clientTaxId: string | null;
    clientCenterName: string | null;
    clientSignerContactName: string | null;
    clientSignerContactEmail: string | null;
    clientSignerContactPhone: string | null;
    companyId: string;
    quoteVersionId: string;
    quoteTitle: string | null;
    quoteAcceptedAt: string | null;
    cancelledAt: string | null;
    closedAt: string | null;
    updatedAt: string;
    schedule: RequestScheduleDay[];
    weeklyHours: number;
    legalChecks: null;
    createdByName: string | null;
    conditions: RequestConditions;
    /**
     * Art. 11: el salario copiado frente a cada versión del convenio vigente en las fechas de la petición (por tramos).
     * null si el convenio no está enlazado al catálogo global.
     */
    agreementCheck: {
      belowAgreement: boolean;
      categoryUnmatched: boolean;
      periods: { versionId: string; from: string; to: string | null; categoryMatched: boolean; minimumSalaryHour: number | null; belowAgreement: boolean }[];
    } | null;
    distribution: RequestDistribution;
    /** Fase 6: la candidatura y la persona que ocupan cada plaza. */
    slotList: { id: string; number: number; status: string; applicationId?: string | null; candidateName?: string | null; candidateId?: string | null }[];
    preCpd: PreCpd;
    signedQuoteDocument: { documentId: string; name: string; kind: 'signed' | 'proposal'; date: string } | null;
    /** Fase 7: evaluación de riesgos del cliente adjunta (documento `request_risk_assessment`); vale en lugar del texto. */
    risksDocument?: { documentId: string; name: string } | null;
    /** Fase 7: art. 8 de la Ley 14/1994 (cliente ETT, peligroso, huelga, puestos amortizados). */
    art8?: RequestArt8;
    /** Fase 7: CPD firmado por la empresa usuaria (registro a mano). Paso «CPD» de los expedientes. */
    cpdSigned?: { signedAt: string; documentId: string; documentName: string | null; recordedByName: string | null; recordedAt: string } | null;
  };

export type ServiceRequestQuery = PageQuery & {
  q?: string;
  /** Un estado o `active` (de new a in_progress). */
  status?: ServiceRequestStatus | 'active';
  clientId?: string;
  quoteId?: string;
  responsibleUserId?: string;
  branchId?: string;
  startingSoon?: boolean;
};

export type ServiceRequestInput = Partial<
  RequestServiceData & {
    status: ServiceRequestStatus;
    cancelReason: string | null;
    positionsCount: number;
    startDate: string | null;
    endDate: string | null;
    shiftName: string | null;
    schedule: RequestScheduleDay[];
    responsibleUserId: string | null;
    branchId: string;
  }
>;
export type ServiceRequestCreate = { quotePositionId: string; positionsCount: number } & Omit<ServiceRequestInput, 'status' | 'cancelReason' | 'positionsCount'>;
export type ServiceRequestDuplicate = { positionsCount: number } & Pick<ServiceRequestInput, 'startDate' | 'endDate' | 'shiftName' | 'workdayType' | 'schedule'>;

/** Presupuesto aceptado en el buscador de «Nueva petición» (GET /v1/request-sources). */
export type RequestSource = {
  quoteId: string;
  quoteCode: string;
  versionId: string;
  versionNumber: number;
  title: string | null;
  clientId: string;
  clientName: string;
  clientTaxId: string | null;
  acceptedAt: string | null;
  people: number;
  peopleInRequests: number;
  peopleWithoutRequest: number;
  positions: {
    quotePositionId: string;
    name: string;
    categoryName: string | null;
    people: number;
    peopleInRequests: number;
    peopleWithoutRequest: number;
    rateHour: number | null;
    requests: { id: string; code: string; shiftName: string | null; positionsCount: number; status: ServiceRequestStatus }[];
  }[];
};
export type RequestSourceQuery = PageQuery & { q?: string };

/** Supuesto de utilización de la ETT (GET /v1/request-use-cases). */
export type RequestUseCase = { code: string; name: string; legalReference: string | null; maxMonths: number | null; hint: string | null };

/**
 * Selección de las peticiones (fases 6 y 7), solo en la demo: plazas, embudo, candidatos, CPD por persona y portales,
 * por código de petición y en la forma de PeticionesView.jsx. Sin ruta en apps/api.
 */
export type RequestSelection = {
  plazas: Record<string, Record<string, unknown>[]>;
  embudo: Record<string, { id: string; etapa: string; fecha: string }[]>;
  candidatos: Record<string, unknown>[];
  portalesPropios: Record<string, Record<string, unknown>>;
  portales: Record<string, unknown>[];
  /** Portales de empleo activos y candidaturas de cada petición. */
  difusion: Record<string, { portalesActivos: number; candidaturas: number }>;
};

// ---------------------------------------------------------------------------
// Candidatos (fase 6): contrato de fase6-backend.md (BORRADOR). Bolsa común a toda la ETT.
// Los datos sensibles (documento de identidad, NSS, IBAN, salud) llegan enmascarados; completos solo con
// GET /candidates/{id}/sensitive (personal_data.view, auditado).
// ---------------------------------------------------------------------------

export type CandidateStatus = 'new' | 'to_contact' | 'contacted' | 'in_selection' | 'available' | 'unavailable' | 'onboarding' | 'in_mission' | 'discarded';
export type CandidateSource = 'candidate_portal' | 'infojobs' | 'indeed' | 'linkedin' | 'database' | 'referral' | 'walk_in' | 'other';
export type CandidateShift = 'morning' | 'afternoon' | 'night' | 'split' | 'weekends';
export type CandidateAvailability = 'immediate' | 'one_week' | 'two_weeks' | 'from_date';
export type IdDocumentKind = 'dni' | 'nie' | 'passport' | 'other';
export type CandidateCatalog = 'candidate_profile' | 'license' | 'skill' | 'language';
export type LanguageLevel = 'native' | 'C2' | 'C1' | 'B2' | 'B1' | 'A2' | 'A1';

export type CandidateCatalogItem = { id: string; name: string; group: string | null; synonyms: string[]; matchedSynonym?: string | null };

export type CandidateSummary = {
  id: string;
  code: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  provinceCode: string | null;
  status: CandidateStatus;
  source: CandidateSource;
  mainProfile: { id: string; name: string; group: string | null } | null;
  otherProfileNames: string[];
  idDocument: { type: IdDocumentKind | null; masked: string | null; expiresOn: string | null; state: 'ok' | 'expired' | 'missing' };
  ssNumber: { masked: string } | null;
  iban: { masked: string } | null;
  poolConsent: { state: 'valid' | 'expiring' | 'expired' | 'none'; expiresAt: string | null };
  documentAlerts: { expired: number; expiring: number };
  activeApplications: number;
  /**
   * Candidatura que se enseña en la lista («Petición o misión»): la confirmada o en misión y, si no hay, la activa más
   * reciente (sin plaza hasta que se propone). null si no hay o si quien mira no ve la petición.
   */
  currentApplication?: { applicationId: string; requestId: string; requestCode: string; slotNumber: number | null; positionName: string; clientName: string; stage: ApplicationStage; stageChangedAt: string } | null;
  experienceYears: number | null;
  lastContactAt: string | null;
  anonymized?: boolean;
  createdAt: string;
};

export type CandidateExperience = { company: string; position: string; from: string | null; to: string | null; duties: string | null };
export type CandidateEducation = { title: string; center: string | null; year: number | null };
export type CandidateConsent = {
  id: string;
  purpose: 'talent_pool' | 'health_data';
  noticeId?: string;
  noticeVersion: string | null;
  givenAt: string;
  channel: 'portal' | 'paper' | 'email' | 'other';
  expiresAt: string | null;
  withdrawnAt: string | null;
};
export type ApplicationStage = 'registered' | 'preselected' | 'interview' | 'proposed' | 'confirmed' | 'discarded' | 'withdrawn' | 'on_mission' | 'finished' | 'left';
export type Application = {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateCode: string;
  requestId: string;
  requestCode: string;
  positionName: string;
  shiftName: string | null;
  clientName: string;
  stage: ApplicationStage;
  origin: 'applied' | 'sourced';
  source: string | null;
  slotId: string | null;
  slotNumber: number | null;
  legalBasis: string | null;
  stageChangedAt: string;
  notes: string | null;
  discardReason: string | null;
  createdAt: string;
};

export type Candidate = CandidateSummary & {
  birthDate: string | null;
  nationality: string | null;
  address: string | null;
  postalCode: string | null;
  experienceYears: number | null;
  hasCar: boolean;
  otherLicensesText: string | null;
  attributes: {
    licenses: { id: string; name: string }[];
    skills: { id: string; name: string }[];
    languages: { id: string; name: string; level: LanguageLevel }[];
    otherProfiles: { id: string; name: string }[];
  };
  experiences: CandidateExperience[];
  education: CandidateEducation[];
  shifts: CandidateShift[];
  availability: CandidateAvailability | null;
  availableFrom: string | null;
  maxDistanceKm: number | null;
  availabilityNotes: string | null;
  autoExpiryNotice: boolean;
  health: { hasData: boolean; legalBasis: string | null };
  consents: CandidateConsent[];
  applications: Application[];
  missing: { code: string; message: string; tab: string }[];
  sourceRef: string | null;
  createdByName: string | null;
  updatedAt: string;
};

export type CandidateInput = Partial<{
  firstName: string;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  provinceCode: string | null;
  postalCode: string | null;
  address: string | null;
  birthDate: string | null;
  nationality: string | null;
  status: CandidateStatus;
  source: CandidateSource;
  sourceRef: string | null;
  lastContactAt: string | null;
  idDocumentType: IdDocumentKind | null;
  idDocumentNumber: string | null;
  idDocumentExpiresOn: string | null;
  ssNumber: string | null;
  iban: string | null;
  mainProfileId: string | null;
  attributeIds: string[];
  languages: { id: string; level: LanguageLevel }[];
  otherLicensesText: string | null;
  experienceYears: number | null;
  hasCar: boolean;
  experiences: CandidateExperience[];
  education: CandidateEducation[];
  shifts: CandidateShift[];
  availability: CandidateAvailability | null;
  availableFrom: string | null;
  maxDistanceKm: number | null;
  availabilityNotes: string | null;
  autoExpiryNotice: boolean;
  health: { disabilityPercent: number | null; adaptations: string | null; notes: string | null; legalBasis: string } | null;
}>;
export type CandidateCreate = CandidateInput & { firstName: string; lastName: string };

export type CandidateQuery = PageQuery & {
  q?: string;
  status?: CandidateStatus;
  profileId?: string;
  /** Uno o varios (carné, habilidad o idioma) separados por comas: deben cumplirse todos. */
  attributeId?: string;
  source?: string;
  /** ok, pending, id_or_ss_pending y privacy_pending: los filtros de documentación de la lista (sin descifrar). */
  documents?: 'alerts' | 'missing' | 'ok' | 'pending' | 'id_or_ss_pending' | 'privacy_pending';
  poolConsent?: 'valid' | 'expiring' | 'expired' | 'none';
  /** Búsqueda exacta por la huella del documento. */
  idDocumentNumber?: string;
};

/** Valores completos de los datos sensibles (GET /candidates/{id}/sensitive). */
export type CandidateSensitive = {
  idDocument?: { type: IdDocumentKind | null; number: string | null } | null;
  ssNumber?: string | null;
  iban?: string | null;
  health?: { disabilityPercent: number | null; adaptations: string | null; notes: string | null; legalBasis: string | null } | null;
};
export type SensitiveField = 'idDocument' | 'ssNumber' | 'iban' | 'health';
/** Recuentos de la bolsa para los indicadores y los filtros (GET /v1/candidate-facets). */
export type CandidateFacets = {
  total: number;
  byStatus: Record<string, number>;
  documentAlerts: number;
  poolConsentExpired: number;
  /** Los mismos totales que el listado con documents=ok|pending|id_or_ss_pending|privacy_pending. */
  documentation?: { ok: number; pending: number; idOrSsPending: number; privacyPending: number };
  profiles: { id: string; name: string; group: string | null; count: number }[];
  attributes: { id: string; catalog: CandidateCatalog; name: string; group: string | null; count: number }[];
};
export type PrivacyNotice = { id: string; purpose: 'talent_pool' | 'health_data'; version: string; text: string; createdAt: string; createdByName?: string | null };

export type ContactChannel = 'phone' | 'email' | 'whatsapp' | 'sms' | 'in_person' | 'other';
/** Contacto registrado con la persona (GET/POST /candidates/{id}/contacts). */
export type CandidateContact = { id: string; contactedAt: string; channel: ContactChannel; result: string | null; note: string | null; nextAction: string | null; requestId: string | null; requestCode: string | null; createdByName: string | null };

export type AccessLogEntry = { id: string; occurredAt: string; actorUserId: string | null; actorName: string | null; action: string; candidateId: string | null; candidateCode: string | null; details: Record<string, unknown> | null };
export type AccessLogQuery = PageQuery & { candidateId?: string; actorUserId?: string; action?: string; from?: string; to?: string };


// ---------------------------------------------------------------------------
// Fase 7 (parte 1): expediente de contratación (fase7-backend.md). Uno por persona y plaza; lo abre la base de datos
// al confirmar la candidatura. La API calcula el estado de cada paso, los avisos, «listo» y la próxima tarea.
// ---------------------------------------------------------------------------

export type HiringStepId = 'documentation' | 'cpd' | 'contract' | 'prl' | 'ss_registration';
/** blocked: prohibición (no se puede empezar); required: paso legal pendiente; warning: solo avisa. */
export type HiringSeverity = 'blocked' | 'required' | 'warning';
export type HiringIssue = { code: string; severity: HiringSeverity; message: string; dueDate?: string };
export type HiringStep = { id: HiringStepId; name: string; state: 'done' | 'in_progress' | 'pending' | 'blocked'; requiredForReady: boolean; issues: HiringIssue[] };

export type RequestDeclaration = {
  id: string;
  kind: 'strike' | 'downsized_positions';
  /** true: lo hay (hay huelga / hubo amortización) y bloquea; false: el cliente declara que no. */
  affirmative: boolean;
  contactId: string | null;
  contactName: string | null;
  channel: 'email' | 'paper' | 'phone' | 'in_person' | 'app' | 'other';
  declaredAt: string;
  documentId: string | null;
  notes: string | null;
  recordedByName: string | null;
  recordedAt: string;
};
export type RequestDeclarationInput = Pick<RequestDeclaration, 'kind' | 'affirmative' | 'channel' | 'declaredAt'> & { contactId?: string | null; documentId?: string | null; notes?: string | null };
export type RequestArt8 = {
  clientIsEtt: boolean;
  hazardousWork: boolean;
  hazardousException: { basis: string; byName: string | null; at: string } | null;
  declarations: { strike: RequestDeclaration | null; downsizedPositions: RequestDeclaration | null };
  history: RequestDeclaration[];
  issues: HiringIssue[];
};

export type HiringFileSummary = {
  id: string;
  status: 'open' | 'cancelled';
  cancelReason: string | null;
  state: 'ready' | 'pending' | 'blocked' | 'cancelled';
  ready: boolean;
  /** Los cinco pasos hechos y sin avisos de documentación. */
  complete: boolean;
  completedSteps: number;
  steps: HiringStep[];
  /** Del expediente, fuera de los pasos (p. ej. falta la fecha de inicio). */
  issues: HiringIssue[];
  nextTask: { step: HiringStepId | null; code: string; severity: HiringSeverity; message: string } | null;
  warnings: number;
  startDate: string | null;
  /** Fin previsto: el de la petición. */
  endDate: string | null;
  /** Responsable de la petición. */
  responsibleName: string | null;
  requestId: string;
  requestCode: string;
  requestStatus: string;
  positionName: string;
  shiftName: string | null;
  positionsCount: number;
  slotNumber: number | null;
  branchId: string;
  clientId: string;
  clientName: string;
  clientCenterName: string | null;
  candidateId: string;
  candidateCode: string;
  candidateName: string;
  candidatePhone: string | null;
  candidateEmail: string | null;
  idDocument: { type: string | null; masked: string | null };
  applicationId: string;
  createdAt: string;
  updatedAt: string;
};

export type EmploymentContract = {
  id: string;
  kind: 'production' | 'substitution';
  contractKey: string;
  contractKeyName: string;
  startDate: string;
  endDate: string | null;
  substitutionReason: string | null;
  signedAt: string | null;
  documentId: string | null;
  contrataCommunicatedAt: string | null;
  contrataReference: string | null;
  contrataDocumentId: string | null;
  contrataDueDate: string;
  basicCopyDeliveredAt: string | null;
  basicCopyDocumentId: string | null;
  basicCopyDueDate: string | null;
  status: 'active' | 'cancelled';
  cancelReason: string | null;
  notes: string | null;
  createdByName: string | null;
  createdAt: string;
};
type ContractFields = Omit<EmploymentContract, 'id' | 'kind' | 'contractKeyName' | 'contrataDueDate' | 'basicCopyDueDate' | 'status' | 'cancelReason' | 'createdByName' | 'createdAt'>;
export type EmploymentContractCreate = { kind: EmploymentContract['kind']; contractKey: string; startDate: string } & Partial<ContractFields>;
export type EmploymentContractUpdate = Partial<ContractFields>;

export type HiringFile = HiringFileSummary & {
  notes: string | null;
  prl: {
    trainingDate: string | null;
    trainingHours: number | null;
    trainingDocumentId: string | null;
    /** Solo apto, no apto o renuncia: nunca el diagnóstico. */
    healthSurveillanceResult: 'fit' | 'unfit' | 'waived' | null;
    healthSurveillanceDate: string | null;
    healthSurveillanceDocumentId: string | null;
    ppeDeliveredAt: string | null;
    ppeNotes: string | null;
    ppeDocumentId: string | null;
  };
  ssRegistration: { date: string | null; documentId: string | null; recordedByName: string | null; recordedAt: string | null };
  contracts: EmploymentContract[];
  /** De la petición: se registra en la petición (cpd-signed, declarations). */
  cpd: { preCpdStatus: string; signedAt: string | null; signedDocumentId: string | null; art8: RequestArt8 };
  documentation: {
    idDocumentExpiresOn: string | null;
    idScan: 'validated' | 'pending' | null;
    ssNumber: { masked: string } | null;
    iban: { masked: string } | null;
    documents: { id: string; typeCode: string | null; typeName: string; name: string; status: string; expiresOn: string | null; expiredAtStart: boolean }[];
  };
};

export type HiringFileUpdate = Partial<{
  startDate: string | null;
  notes: string | null;
  prlTrainingDate: string | null;
  prlTrainingHours: number | null;
  prlTrainingDocumentId: string | null;
  healthSurveillanceResult: 'fit' | 'unfit' | 'waived' | null;
  healthSurveillanceDate: string | null;
  healthSurveillanceDocumentId: string | null;
  ppeDeliveredAt: string | null;
  ppeNotes: string | null;
  ppeDocumentId: string | null;
  ssRegistrationDate: string | null;
  ssRegistrationDocumentId: string | null;
}>;

export type HiringFileQuery = PageQuery & {
  q?: string;
  requestId?: string;
  candidateId?: string;
  clientId?: string;
  branchId?: string;
  /** Por defecto, los abiertos. complete: los cinco pasos hechos. */
  state?: 'ready' | 'pending' | 'blocked' | 'cancelled' | 'complete' | 'all';
  /** «Falta: …»: el paso no está hecho. */
  missingStep?: HiringStepId;
  startFrom?: string;
  startTo?: string;
};
export type HiringFileFacets = {
  total: number;
  ready: number;
  pending: number;
  blocked: number;
  complete: number;
  cancelled: number;
  missingByStep: Record<HiringStepId, number>;
  /** Empiezan en 7 días o menos y no están listos. */
  startingSoonNotReady: number;
};
