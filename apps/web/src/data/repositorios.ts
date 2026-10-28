// Contrato de la capa de datos. Las pantallas solo conocen esto: no saben si los datos vienen de la API
// (api.ts) o son de ejemplo (memoria.ts). Cada operación corresponde a una ruta de apps/api.
import type {
  Address,
  AddressInput,
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
    remove(id: string): Promise<void>;
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
    remove(id: string): Promise<void>;
  };
  clientContacts: {
    list(query?: ClientContactQuery): Promise<Page<ClientContact>>;
    get(id: string): Promise<ClientContact>;
    create(data: ClientContactCreate): Promise<ClientContact>;
    update(id: string, data: ClientContactInput): Promise<ClientContact>;
    remove(id: string): Promise<void>;
  };
  /** Usuarios de la ETT (solo lectura: el alta e invitación llegarán a la API más adelante). */
  memberships: {
    list(query?: MembershipQuery): Promise<Page<Membership>>;
    get(id: string): Promise<Membership>;
  };
}
