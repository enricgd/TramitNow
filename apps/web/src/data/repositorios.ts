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
  AgreementCategory,
  Quote,
  QuoteAgreementDefaults,
  QuoteAgreementDefaultsQuery,
  QuoteCreate,
  QuotePositionInput,
  QuoteQuery,
  QuoteReview,
  QuoteSummary,
  QuoteVersion,
  QuoteVersionInput,
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
  RequestSelection,
  AccessLogEntry,
  AccessLogQuery,
  Application,
  ApplicationStage,
  Candidate,
  CandidateCatalog,
  CandidateCatalogItem,
  CandidateConsent,
  CandidateContact,
  CandidateCreate,
  CandidateInput,
  CandidateQuery,
  CandidateSensitive,
  CandidateSummary,
  SensitiveField,
  RequestSource,
  RequestSourceQuery,
  RequestUseCase,
  ServiceRequest,
  ServiceRequestCreate,
  ServiceRequestDuplicate,
  ServiceRequestInput,
  ServiceRequestQuery,
  ServiceRequestSummary,
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
    /** Fase 6: rechaza un documento (de candidato) con su motivo. */
    reject(id: string, reason: string): Promise<StoredDocument>;
    /** Fase 6: marca que se ha avisado de la renovación (el correo real, más adelante). */
    renewalNotice(id: string): Promise<StoredDocument>;
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

  /**
   * Presupuestos (fase 4, contrato de fase4-backend.md). El presupuesto tiene versiones; lo que se edita es la versión
   * actual (solo en borrador o en preparación; si no, 409). Los costes los calcula el servidor (`calculation`).
   * Leer: `module.comercial` o `quotes.manage`; escribir: `quotes.manage`; aprobar el margen: `quotes.approve_margin`.
   */
  quotes: {
    list(query?: QuoteQuery): Promise<Page<QuoteSummary>>;
    get(id: string): Promise<Quote>;
    /** v1 en borrador con número de la serie de presupuestos, los costes internos y extras de siempre. */
    create(data: QuoteCreate): Promise<Quote>;
    /** Empresa y sucursal (solo con una única versión en borrador). */
    update(id: string, data: { clientId?: string | null; branchId?: string }): Promise<Quote>;
    /** Copia sin empresa (número nuevo). */
    duplicate(id: string): Promise<Quote>;
    /** Pasa a obsoleto con motivo y crea uno nuevo copiado (número nuevo). */
    makeObsolete(id: string, reason: string): Promise<{ obsolete: Quote; created: Quote }>;
    /** Valores del convenio para un puesto (tabla salarial vigente de la categoría). */
    agreementDefaults(query: QuoteAgreementDefaultsQuery): Promise<QuoteAgreementDefaults>;
    /** Categorías de la tabla vigente de un convenio de la ETT (las de su convenio del catálogo global). */
    agreementCategories(collectiveAgreementId: string): Promise<AgreementCategory[]>;
  };
  quoteVersions: {
    /** También las anteriores (para comparar). */
    get(id: string): Promise<QuoteVersion>;
    update(id: string, data: QuoteVersionInput): Promise<QuoteVersion>;
    /** Los puestos se guardan uno a uno; cada operación devuelve la versión entera, recalculada. */
    addPosition(versionId: string, data: QuotePositionInput): Promise<QuoteVersion>;
    updatePosition(positionId: string, data: QuotePositionInput): Promise<QuoteVersion>;
    removePosition(positionId: string): Promise<QuoteVersion>;
    /** Vuelve a poner los valores del convenio en los campos indicados (todos si no se indica). */
    resetPositionFromAgreement(positionId: string, fields?: string[]): Promise<QuoteVersion>;
    requestApproval(id: string, notes?: string | null): Promise<QuoteVersion>;
    approve(id: string, notes?: string | null): Promise<QuoteVersion>;
    /** «Pedir cambios». */
    rejectApproval(id: string, notes: string): Promise<QuoteVersion>;
    /** Comprobaciones antes de enviar (las mismas que hace `send`). */
    review(id: string): Promise<QuoteReview>;
    /** 422 `validacion` (con lo que falta en `details`), 409 `requiere_aprobacion` o 422 `salario_bajo_convenio`. */
    send(id: string): Promise<QuoteVersion>;
    pendingSignature(id: string): Promise<QuoteVersion>;
    accept(id: string): Promise<QuoteVersion>;
    reject(id: string, data: { reasonId: string; notes?: string | null }): Promise<QuoteVersion>;
    /** Copia completa editable (v + 1); la anterior queda sustituida. Devuelve la nueva. */
    newVersion(id: string): Promise<QuoteVersion>;
    /** Genera el PDF de la propuesta en el servidor y lo guarda como documento del presupuesto (se descarga con documents). */
    proposalPdf(id: string): Promise<{ documentId: string; name: string }>;
  };
  /** Candidatos (fase 6, fase6-backend.md): bolsa común a toda la ETT. Escribir exige candidates.manage. */
  candidates: {
    list(query?: CandidateQuery): Promise<Page<CandidateSummary>>;
    /** Auditado (view_record). */
    get(id: string): Promise<Candidate>;
    create(data: CandidateCreate): Promise<Candidate>;
    update(id: string, data: CandidateInput): Promise<Candidate>;
    checkDuplicate(data: { idDocumentType: string; idDocumentNumber: string }): Promise<{ valid: boolean; duplicate: { id: string; code: string; name: string } | null }>;
    /** Valores completos (personal_data.view, auditado). No guardarlos. */
    sensitive(id: string, fields: SensitiveField[]): Promise<CandidateSensitive>;
    /** Supresión RGPD (privacy.manage, auditado). 409 si tiene una candidatura confirmada. */
    anonymize(id: string, reason: string): Promise<Candidate>;
    /** Derecho de acceso (privacy.manage, auditado): todo lo de la persona, en JSON. */
    exportData(id: string): Promise<unknown>;
    addConsent(id: string, data: { purpose: 'talent_pool' | 'health_data'; noticeId?: string | null; givenAt?: string; channel: CandidateConsent['channel']; documentId?: string | null }): Promise<CandidateConsent>;
    withdrawConsent(consentId: string): Promise<CandidateConsent>;
    /** [Pedido al backend.] Historial de contactos. */
    contacts(id: string): Promise<CandidateContact[]>;
    addContact(id: string, data: { channel: string; result: string; note?: string | null; nextAction?: string | null }): Promise<CandidateContact>;
  };
  /** Tablas maestras de candidatos con sinónimos. */
  candidateCatalog: {
    list(catalog: CandidateCatalog, q?: string): Promise<CandidateCatalogItem[]>;
    /** Si ya existe (por nombre o sinónimo), devuelve el existente. */
    create(data: { catalog: CandidateCatalog; name: string; group?: string | null; synonyms?: string[] }): Promise<CandidateCatalogItem>;
  };
  /** Candidaturas (persona × petición). */
  applications: {
    list(query: { requestId?: string; candidateId?: string; stage?: ApplicationStage }): Promise<Application[]>;
    create(data: { candidateId: string; requestId: string; origin: 'applied' | 'sourced'; source?: string | null; notes?: string | null }): Promise<Application>;
    update(id: string, data: { stage?: ApplicationStage; notes?: string | null; discardReason?: string | null }): Promise<Application>;
    /** Reserva una plaza por cubrir (la indicada o la primera). */
    propose(id: string, slotId?: string | null): Promise<Application & { requirements?: { code: string; ok: boolean; message: string }[] }>;
    confirm(id: string): Promise<Application>;
    release(id: string): Promise<Application>;
  };
  /** Auditoría de accesos a datos personales (privacy.audit). */
  accessLog: {
    list(query?: AccessLogQuery): Promise<Page<AccessLogEntry>>;
  };
  /** Peticiones (fase 5, fase5-backend.md). Escribir y el CPD previo exigen requests.manage. */
  requests: {
    list(query?: ServiceRequestQuery): Promise<Page<ServiceRequestSummary>>;
    get(id: string): Promise<ServiceRequest>;
    /** De un puesto de un presupuesto aceptado. */
    create(data: ServiceRequestCreate): Promise<ServiceRequest>;
    /** «Crear peticiones» desde la versión aceptada: una o varias por puesto, en una transacción. */
    createFromQuoteVersion(versionId: string, requests: ServiceRequestCreate[]): Promise<ServiceRequest[]>;
    update(id: string, data: ServiceRequestInput): Promise<ServiceRequest>;
    /** «Duplicar con otro horario»: otra petición del mismo puesto. */
    duplicate(id: string, data: ServiceRequestDuplicate): Promise<ServiceRequest>;
    /** Buscador de presupuestos aceptados para «Nueva petición». */
    sources(query?: RequestSourceQuery): Promise<Page<RequestSource>>;
    useCases(): Promise<RequestUseCase[]>;
    /** Genera el PDF del CPD previo y lo guarda como documento (409 `cpd_incompleto`, 422 `salario_bajo_convenio`). */
    generatePreCpd(id: string): Promise<{ documentId: string; name: string }>;
    /** Sin firma electrónica: el CPD previo se envía a mano y aquí se marca. */
    markPreCpdSent(id: string, data?: { sentTo?: string | null; notes?: string | null }): Promise<ServiceRequest>;
    markPreCpdReviewed(id: string): Promise<ServiceRequest>;
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
  /**
   * Plazas con personas, candidatos, CPD de cada persona y portales de una petición (fases 6 y 7). Solo hay datos de
   * ejemplo: contra la API lanza `no_disponible` y la pantalla deja esas partes vacías.
   */
  requestSelection: {
    get(): Promise<RequestSelection>;
  };
  portalAccess: {
    list(clientId: string): Promise<Record<string, ContactPortalAccess>>;
    save(contactId: string, permissions: string[]): Promise<ContactPortalAccess>;
    revoke(contactId: string): Promise<void>;
  };
}
