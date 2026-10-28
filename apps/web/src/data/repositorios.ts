// Contrato de la capa de datos. Las pantallas solo conocen esto: no saben si los datos vienen de la API
// (api.ts) o son de ejemplo (memoria.ts). Cada operación corresponde a una ruta de apps/api.
import type {
  Branch,
  BranchCreate,
  BranchInput,
  BranchQuery,
  Company,
  CompanyCreate,
  CompanyInput,
  CompanyQuery,
  Me,
  Membership,
  MembershipQuery,
  Page,
  Permission,
  Role,
} from './tipos';

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
  /** Usuarios de la ETT (solo lectura: el alta e invitación llegarán a la API más adelante). */
  memberships: {
    list(query?: MembershipQuery): Promise<Page<Membership>>;
    get(id: string): Promise<Membership>;
  };
}
