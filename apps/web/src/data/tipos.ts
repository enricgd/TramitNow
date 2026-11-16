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
} & Deleted;
export type ClientInput = Partial<Omit<Client, keyof Stamped | 'deletedAt'>>;
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
  /** Valida los partes de horas en el portal. */
  validatesHours: boolean;
  /** Rol «Otro», con el texto escrito. */
  otherRole: string | null;
  /** Suspendido: no recibe presupuestos ni avisos. Se reactiva. */
  suspended: boolean;
} & Deleted;
export type ClientContactInput = Partial<Omit<ClientContact, keyof Stamped | 'deletedAt'>>;
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
  /**
   * Régimen de IVA (tabla maestra vat_regime). No está en el contrato de la fase 2: si la API no lo devuelve,
   * la pantalla lo muestra como «Disponible próximamente».
   */
  vatRegimeId?: string | null;
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
export type CatalogItemType = 'payment_method' | 'vat_regime' | 'document_type' | 'sector' | (string & {});
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
export type ActivityEntityType = 'client' | 'client_center' | 'client_contact' | 'client_billing' | 'document';
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

export type DocumentEntityType = 'client' | 'client_center';
export type DocumentStatus = 'pending' | 'validated' | 'draft';
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

/** Datos legales de la ETT (Ley 14/1994) que no están en la sociedad. Forma de Mi ETT. */
export type EttLegalData = {
  nombreComercial: string;
  formaJuridica: string;
  autorizacion: string;
  fechaAutorizacion: string;
  cnae: string;
  convenio: string;
  registroMercantil: string;
  tomo: string;
  folio: string;
  hoja: string;
  /** Representante legal: firma contratos y CPD. */
  representante: string;
  representanteDni: string;
  representanteCargo: string;
  mutua: string;
  servicioPrevencion: string;
  garantiaTipo: string;
  garantiaEntidad: string;
  garantiaImporte: string;
  garantiaVence: string;
  redAutorizacion: string;
  certificadoCaduca: string;
};

/** Facturación emisora de la ETT (series, IVA, IBAN...). Forma de Mi ETT. */
export type EttBillingSettings = {
  billingSeries: string;
  invoicePrefix: string;
  proximaFactura: number;
  proximaRectificativa: number;
  vatRate: string;
  withholdingRate: string;
  iban: string;
  swiftBic: string;
  paymentMethod: string;
  customPaymentMethod: string;
  paymentTerms: string;
  currency: string;
  adminEmail: string;
  billingAddressSameAsFiscal: boolean;
  billingBranchMode: 'centralized' | 'per_branch';
};

/** Código de cuenta de cotización. `sucursal` es el nombre de la sucursal. */
export type EttContributionAccount = { id: string; numero: string; provincia: string; tipo: string; sucursal: string };
export type EttService = { id: string; nombre: string; cobro: string; valor: number; unidad: string; activo: boolean };
export type EttTemplate = { id: string; name: string; category: string; scope: string; status: 'active' | 'incomplete'; format: string; updated: string };
export type EttWelcomeEmail = { activo: boolean; asunto: string; texto: string };
export type EttPortals = { subdominio: string; bienvenida: { empresa: EttWelcomeEmail; candidato: EttWelcomeEmail } };
export type EttActivity = { id: string; timestamp: string; user: string; action: string; type: string };
/** Datos del usuario que la API aún no devuelve (el email está en auth.users). */
export type EttUserExtra = { email: string; departamento: string; ultimoAcceso: string };
export type EttInvitation = { id: string; name: string; email: string; roleId: string; branchId: string | null; createdAt: string };

/** Todo lo de Mi ETT que aún no tiene ruta en apps/api. */
export type EttSettings = {
  legal: EttLegalData;
  billing: EttBillingSettings;
  contributionAccounts: EttContributionAccount[];
  services: EttService[];
  templates: EttTemplate[];
  portals: EttPortals;
  activity: EttActivity[];
  /** Responsable de cada sucursal, por id de sucursal. */
  branchManagers: Record<string, string>;
  /** Por id de membresía. */
  users: Record<string, EttUserExtra>;
  invitations: EttInvitation[];
};

/**
 * Acceso de un contacto del cliente al Área de empresas (fase 11 del plan). Por id de contacto.
 * `invitedAt`: fecha de la invitación; `lastAccess`: texto del último acceso, null si aún no ha entrado.
 */
export type ContactPortalAccess = { active: boolean; since: string | null; invitedAt: string | null; lastAccess: string | null; permissions: string[] };
