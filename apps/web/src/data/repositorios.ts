// Contrato de la capa de datos. Las pantallas solo conocen esto: no saben si los datos vienen de la API
// (api.ts) o son de ejemplo (memoria.ts). Cada operación corresponde a una ruta de apps/api.
import type {
  ActivityEntry,
  ActivityQuery,
  CatalogItem,
  CatalogItemCreate,
  CatalogItemQuery,
  Cnae,
  CnaeQuery,
  ContactPortalAccess,
  DocumentInput,
  DocumentQuery,
  DocumentUpload,
  StoredDocument,
  Address,
  AddressInput,
  AppNotification,
  AutonomousCommunity,
  Branch,
  BranchCreate,
  BranchInput,
  BranchQuery,
  Company,
  CompanyCreate,
  CompanyInput,
  CompanyQuery,
  CatalogCreate,
  Client,
  ClientBillingInput,
  ClientBillingResult,
  ClientCenter,
  ClientCenterCreate,
  ClientCenterInput,
  ClientCenterQuery,
  ClientContact,
  ClientContactCreate,
  ClientContactInput,
  ClientContactQuery,
  ClientCreate,
  ClientInput,
  ClientQuery,
  CatalogInput,
  CollectiveAgreement,
  CollectiveAgreementQuery,
  EttSettings,
  BillableService,
  BillableServiceCreate,
  BillableServiceInput,
  BillableServiceQuery,
  CompanyBillingSettings,
  CompanyBillingSettingsInput,
  CompanyLegalInput,
  CompanyLegalResult,
  ContributionAccount,
  ContributionAccountCreate,
  ContributionAccountInput,
  ContributionAccountQuery,
  MembershipCreate,
  MembershipCreated,
  MembershipUpdate,
  NumberSeries,
  NumberSeriesCreate,
  NumberSeriesInput,
  NumberSeriesQuery,
  TenantSettings,
  ContractKey,
  ContractType,
  ContractTypeQuery,
  Country,
  Me,
  Membership,
  MembershipQuery,
  Municipality,
  MunicipalityQuery,
  Page,
  PageQuery,
  PayrollConcept,
  PayrollConceptQuery,
  Permission,
  ProfessionalCategory,
  ProfessionalCategoryQuery,
  Province,
  Role,
  SearchResult,
} from './tipos';

/** Operaciones de un catálogo de la ETT (convenios, categorías...): listar, ver, crear, editar y baja lógica. */
export interface CatalogRepository<T extends { code: string; name: string }, Q extends PageQuery> {
  list(query?: Q): Promise<Page<T>>;
  get(id: string): Promise<T>;
  create(data: CatalogCreate<T>): Promise<T>;
  update(id: string, data: CatalogInput<T>): Promise<T>;
  remove(id: string): Promise<void>;
}

export interface Repositories {
  session: {
    /** GET /v1/me */
    me(): Promise<Me>;
    /** POST /v1/me/active-tenant y refresco de la sesión para que el token lleve la ETT nueva. */
    changeTenant(tenantId: string): Promise<void>;
  };
  companies: {
    list(query?: CompanyQuery): Promise<Page<Company>>;
    get(id: string): Promise<Company>;
    create(data: CompanyCreate): Promise<Company>;
    update(id: string, data: CompanyInput): Promise<Company>;
  };
  branches: {
    list(query?: BranchQuery): Promise<Page<Branch>>;
    get(id: string): Promise<Branch>;
    create(data: BranchCreate): Promise<Branch>;
    update(id: string, data: BranchInput): Promise<Branch>;
  };
  roles: {
    list(): Promise<Role[]>;
    get(id: string): Promise<Role>;
    permissions(): Promise<Permission[]>;
  };
  /** Catálogos oficiales, comunes a todas las ETT y de solo lectura. */
  catalogs: {
    autonomousCommunities(): Promise<AutonomousCommunity[]>;
    provinces(query?: { autonomousCommunityCode?: string }): Promise<Province[]>;
    /** Exige provincia o texto (q, mínimo 2 letras). */
    municipalities(query: MunicipalityQuery): Promise<Municipality[]>;
    municipality(code: string): Promise<Municipality>;
    countries(query?: { q?: string }): Promise<Country[]>;
    contractKeys(query?: { includeInactive?: boolean }): Promise<ContractKey[]>;
  };
  addresses: {
    get(id: string): Promise<Address>;
    create(data: AddressInput): Promise<Address>;
    update(id: string, data: AddressInput): Promise<Address>;
    remove(id: string): Promise<void>;
  };
  collectiveAgreements: CatalogRepository<CollectiveAgreement, CollectiveAgreementQuery>;
  professionalCategories: CatalogRepository<ProfessionalCategory, ProfessionalCategoryQuery>;
  contractTypes: CatalogRepository<ContractType, ContractTypeQuery>;
  payrollConcepts: CatalogRepository<PayrollConcept, PayrollConceptQuery>;
  /** Clientes: los lee cualquier miembro; escribir exige clients.manage en la sucursal del cliente. */
  clients: {
    list(query?: ClientQuery): Promise<Page<Client>>;
    get(id: string): Promise<Client>;
    create(data: ClientCreate): Promise<Client>;
    update(id: string, data: ClientInput): Promise<Client>;
    /** Baja lógica (204). 409 `en_uso` si ya se ha usado: entonces solo se da de baja (status inactive). */
    remove(id: string): Promise<void>;
    /** Recupera uno eliminado (409 `conflicto` si choca con otro activo). */
    restore(id: string): Promise<Client>;
    /** Solo con clients.billing.manage. 404 (ApiError no_encontrado) si aún no tiene. */
    billing(id: string): Promise<ClientBillingResult>;
    /** Crea o actualiza: solo cambia los campos enviados. */
    saveBilling(id: string, data: ClientBillingInput): Promise<ClientBillingResult>;
  };
  clientCenters: {
    list(query?: ClientCenterQuery): Promise<Page<ClientCenter>>;
    get(id: string): Promise<ClientCenter>;
    create(data: ClientCenterCreate): Promise<ClientCenter>;
    update(id: string, data: ClientCenterInput): Promise<ClientCenter>;
    /** Baja lógica. 409 `en_uso`: solo se desactiva (blocked). */
    remove(id: string): Promise<void>;
    restore(id: string): Promise<ClientCenter>;
  };
  clientContacts: {
    list(query?: ClientContactQuery): Promise<Page<ClientContact>>;
    get(id: string): Promise<ClientContact>;
    create(data: ClientContactCreate): Promise<ClientContact>;
    update(id: string, data: ClientContactInput): Promise<ClientContact>;
    /** Baja lógica. 409 `en_uso`: solo se suspende (suspended). */
    remove(id: string): Promise<void>;
    restore(id: string): Promise<ClientContact>;
  };
  /** Catálogo CNAE-2009, común y de solo lectura. */
  cnae: {
    list(query?: CnaeQuery): Promise<Cnae[]>;
  };
  /** Tablas maestras simples de la ETT. Crear exige catalogs.manage (409 si el nombre ya existe). */
  catalogItems: {
    list(query: CatalogItemQuery): Promise<Page<CatalogItem>>;
    create(data: CatalogItemCreate): Promise<CatalogItem>;
  };
  /** Historial de cambios de una ficha (y de sus hijos con includeChildren). */
  activity: {
    list(query: ActivityQuery): Promise<Page<ActivityEntry>>;
  };
  /** Documentos de clientes y centros, con el fichero en Storage. */
  documents: {
    list(query?: DocumentQuery): Promise<Page<StoredDocument>>;
    /** Pide la URL firmada, sube el fichero directamente a Storage y lo registra. */
    upload(data: DocumentUpload): Promise<StoredDocument>;
    update(id: string, data: DocumentInput): Promise<StoredDocument>;
    /** Baja lógica. 409 `conservacion_obligatoria` si su tipo exige conservarlo. */
    remove(id: string): Promise<void>;
    restore(id: string): Promise<StoredDocument>;
    /** URL temporal para ver o descargar el fichero (null si en la demo no hay fichero). */
    downloadUrl(id: string): Promise<string | null>;
  };
  /** Usuarios de la ETT: alta con invitación, rol, estado y alcance. Requiere `users.manage`. */
  memberships: {
    list(query?: MembershipQuery): Promise<Page<Membership>>;
    get(id: string): Promise<Membership>;
    /** Da de alta e invita. 409 si ya es de esta ETT; 503 si la API no tiene Auth configurado. */
    create(data: MembershipCreate): Promise<MembershipCreated>;
    /** 409 si alguien intenta cambiar su propio rol o bloquearse. */
    update(id: string, data: MembershipUpdate): Promise<Membership>;
    /** Enlace nuevo para quien aún no la ha aceptado (409 si ya entró). */
    resendInvitation(id: string): Promise<{ inviteUrl: string | null }>;
    /** Quita a quien no ha aceptado la invitación (409 si ya entró: entonces se bloquea). */
    revokeInvitation(id: string): Promise<void>;
  };

  // Mi ETT: datos de cada sociedad y de la ETT. Leer, cualquier miembro; escribir, `tenant.manage`.
  /** Datos legales de una sociedad. `save` crea o actualiza solo los campos enviados. */
  companyLegal: {
    get(companyId: string): Promise<CompanyLegalResult>;
    save(companyId: string, data: CompanyLegalInput): Promise<CompanyLegalResult>;
  };
  /** Facturación de una sociedad (IBAN, forma de pago, IVA...). */
  companyBilling: {
    get(companyId: string): Promise<CompanyBillingSettings>;
    save(companyId: string, data: CompanyBillingSettingsInput): Promise<CompanyBillingSettings>;
  };
  /** Series de numeración (presupuestos, peticiones, facturas y rectificativas). */
  numberSeries: {
    list(query?: NumberSeriesQuery): Promise<NumberSeries[]>;
    create(data: NumberSeriesCreate): Promise<NumberSeries>;
    update(id: string, data: NumberSeriesInput): Promise<NumberSeries>;
  };
  /** Códigos de cuenta de cotización. 422 si las cifras de control no cuadran. */
  contributionAccounts: {
    list(query?: ContributionAccountQuery): Promise<Page<ContributionAccount>>;
    create(data: ContributionAccountCreate): Promise<ContributionAccount>;
    update(id: string, data: ContributionAccountInput): Promise<ContributionAccount>;
    remove(id: string): Promise<void>;
  };
  /** Servicios que factura la ETT además de las horas. */
  billableServices: {
    list(query?: BillableServiceQuery): Promise<Page<BillableService>>;
    create(data: BillableServiceCreate): Promise<BillableService>;
    update(id: string, data: BillableServiceInput): Promise<BillableService>;
  };
  /** Ajustes de presupuestos de la ETT. */
  tenantSettings: {
    get(): Promise<TenantSettings>;
    update(data: Partial<TenantSettings>): Promise<TenantSettings>;
  };

  // -------------------------------------------------------------------------
  // Pendiente de API: de momento solo datos de ejemplo (ver tipos.ts).
  // -------------------------------------------------------------------------

  /** Buscador global de la cabecera. `sample`: los resultados son de ejemplo (no hay ruta todavía). */
  search: {
    readonly sample?: boolean;
    query(text: string): Promise<SearchResult[]>;
    recent(): Promise<string[]>;
  };
  /** Avisos del usuario de la sesión. */
  notifications: {
    readonly sample?: boolean;
    list(): Promise<AppNotification[]>;
    markRead(id: string): Promise<void>;
    markAllRead(): Promise<void>;
  };
  /**
   * Lo que Mi ETT necesita y apps/api aún no tiene (plantillas, portales, historial y responsable de cada
   * sucursal). Contra la API lanza ApiError `no_disponible` (501): la pantalla lo muestra como «Disponible
   * próximamente».
   */
  ettSettings: {
    get(): Promise<EttSettings>;
    /** Cambia solo las partes enviadas. */
    update(data: Partial<EttSettings>): Promise<EttSettings>;
  };
  /**
   * Acceso de los contactos del cliente al Área de empresas (fase 11). Contra la API lanza `no_disponible`.
   */
  portalAccess: {
    list(clientId: string): Promise<Record<string, ContactPortalAccess>>;
    save(contactId: string, permissions: string[]): Promise<ContactPortalAccess>;
    revoke(contactId: string): Promise<void>;
  };
}
