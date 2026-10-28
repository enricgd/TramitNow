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
