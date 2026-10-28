// Repositorios en memoria con datos de ejemplo, para el modo demo (`npm run dev`, ver src/modo.ts).
// Se comportan como la API (paginación, filtros, errores) para que las pantallas funcionen igual en los dos
// modos. Los cambios duran hasta recargar la página. Todo es ficticio: nunca datos reales.
import type { Repositories } from './repositorios';
import { ApiError, type Branch, type Company, type Membership, type Page, type PageQuery, type Role } from './tipos';

const NOW = '2026-10-27T10:00:00.000Z';
const stamp = { createdAt: NOW, updatedAt: NOW };
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const TENANT = { id: id(1), code: 'DEMO', legalName: 'ETT Global Servicios Temporales, S.L.', tradeName: 'ETT Global People' };

const companies: Company[] = [
  {
    id: id(10),
    code: 'EG',
    name: 'ETT Global Servicios Temporales, S.L.',
    companyType: 'ett',
    status: 'active',
    taxIdTypeId: null,
    taxId: 'B00000000',
    phone: '+34 900 000 000',
    fax: null,
    email: 'central@ettglobal.example',
    website: 'https://www.ettglobal.example',
    smsSenderName: 'ETT Global',
    workerCommunicationsCcEmail: null,
    addressId: null,
    postalAddressId: null,
    ...stamp,
  },
];

const branch = (n: number, code: string, name: string, phone: string, email: string, isDefault = false): Branch => ({
  id: id(n),
  companyId: id(10),
  code,
  name,
  status: 'active',
  isDefault,
  phone,
  email,
  addressId: null,
  ...stamp,
});

const branches: Branch[] = [
  branch(20, 'SUC-01', 'Sucursal Barcelona (Central)', '+34 900 000 001', 'barcelona@ettglobal.example', true),
  branch(21, 'SUC-02', 'Sucursal Girona', '+34 900 000 002', 'girona@ettglobal.example'),
  branch(22, 'SUC-03', 'Sucursal Lleida', '+34 900 000 003', 'lleida@ettglobal.example'),
];

const role = (n: number, code: string, name: string, scope: Role['scope'], permissions: string[]): Role => ({
  id: id(n),
  code,
  name,
  description: null,
  scope,
  isSystem: true,
  permissions,
  ...stamp,
});

// Los roles de serie de cada ETT nueva (db/migrations/*_identity.sql).
const roles: Role[] = [
  role(30, 'admin', 'Administrador', 'tenant', [
    'module.administracion', 'module.laboral', 'module.seleccion', 'module.comercial', 'tenant.manage',
    'companies.manage', 'branches.manage', 'catalogs.manage', 'users.manage', 'roles.manage', 'addresses.write',
    'labor_catalogs.manage',
  ]),
  role(31, 'laboral', 'Laboral', 'tenant', ['module.laboral', 'addresses.write', 'labor_catalogs.manage']),
  role(32, 'director_zona', 'Director de zona', 'branches', ['module.laboral', 'module.seleccion', 'module.comercial', 'addresses.write']),
  role(33, 'seleccion', 'Selección', 'branch', ['module.seleccion', 'addresses.write']),
  role(34, 'comercial', 'Comercial', 'branch', ['module.comercial', 'addresses.write']),
];

const member = (n: number, fullName: string, roleCode: string, branchIds: string[], status: Membership['status'] = 'active'): Membership => {
  const r = roles.find((x) => x.code === roleCode)!;
  return {
    id: id(n),
    userId: id(n + 100),
    fullName,
    status,
    role: { id: r.id, code: r.code, name: r.name, scope: r.scope },
    contexts: branchIds.length
      ? branchIds.map((b, i) => ({ companyId: id(10), branchId: b, isDefault: i === 0 }))
      : [{ companyId: id(10), branchId: null, isDefault: true }],
    ...stamp,
  };
};

const memberships: Membership[] = [
  member(40, 'Usuario Demo', 'admin', []),
  member(41, 'Ana López', 'admin', []),
  member(42, 'Marta Sánchez', 'comercial', [id(20)]),
  member(43, 'Laura García', 'director_zona', [id(20), id(21)]),
  member(44, 'Marc Soler', 'seleccion', [id(21)]),
  member(45, 'Elena Ramos', 'laboral', []),
  member(46, 'Carlos Benítez', 'seleccion', [id(22)], 'inactive'),
];

const permissions = [
  ['module.administracion', 'administracion', 'Acceso al módulo de administración de la ETT'],
  ['module.laboral', 'laboral', 'Acceso al módulo laboral'],
  ['module.seleccion', 'seleccion', 'Acceso al módulo de selección'],
  ['module.comercial', 'comercial', 'Acceso al módulo comercial'],
  ['tenant.manage', 'administracion', 'Editar los datos de la ETT'],
  ['companies.manage', 'administracion', 'Crear, editar y borrar sociedades'],
  ['branches.manage', 'administracion', 'Crear, editar y borrar sucursales'],
  ['catalogs.manage', 'administracion', 'Editar los catálogos de la ETT'],
  ['users.manage', 'administracion', 'Gestionar usuarios de la ETT y su alcance por sucursal'],
  ['roles.manage', 'administracion', 'Editar roles y sus permisos'],
  ['addresses.write', 'general', 'Crear y editar direcciones'],
  ['labor_catalogs.manage', 'laboral', 'Editar convenios, categorías profesionales, tipos de contrato y conceptos de nómina'],
].map(([code, module, description]) => ({ code, module, description }));

// Un poco de espera, para que se vean los estados de carga como con la API.
const delay = <T>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(structuredClone(value)), 150));

function page<T>(items: T[], query: PageQuery = {}): Promise<Page<T>> {
  const { limit = 50, offset = 0 } = query;
  return delay({ data: items.slice(offset, offset + limit), pagination: { limit, offset, total: items.length } });
}

function find<T extends { id: string }>(items: T[], itemId: string): T {
  const item = items.find((x) => x.id === itemId);
  if (!item) throw new ApiError(404, 'no_encontrado', 'No existe o no tienes acceso');
  return item;
}

function matches(text: string | undefined, ...fields: (string | null)[]) {
  if (!text) return true;
  const needle = text.toLowerCase();
  return fields.some((f) => f?.toLowerCase().includes(needle));
}

function checkUniqueCode<T extends { id: string; code: string }>(items: T[], code: string, exceptId?: string) {
  if (items.some((x) => x.code === code && x.id !== exceptId)) {
    throw new ApiError(409, 'conflicto', `Ya existe otro con el código ${code}`);
  }
}

let nextId = 1000;

export function memoryRepositories(): Repositories {
  return {
    session: {
      me: () =>
        delay({
          user: { id: id(140), email: 'demo@example.com', fullName: 'Usuario Demo', phone: null, status: 'active', mustChangePassword: false },
          isSuperadmin: false,
          activeTenant: TENANT,
          role: { id: id(30), code: 'admin', name: 'Administrador', scope: 'tenant' },
          permissions: roles[0].permissions,
          branches: branches.filter((b) => b.status === 'active').map(({ id, companyId, code, name }) => ({ id, companyId, code, name })),
          tenants: [TENANT],
        }),
      changeTenant: async () => {},
    },
    companies: {
      list: (q = {}) =>
        page(companies.filter((c) => (!q.status || c.status === q.status) && matches(q.q, c.code, c.name, c.taxId)), q),
      get: async (companyId) => delay(find(companies, companyId)),
      async create(data) {
        checkUniqueCode(companies, data.code);
        const company: Company = {
          taxIdTypeId: null, taxId: null, phone: null, fax: null, email: null, website: null,
          smsSenderName: null, workerCommunicationsCcEmail: null, addressId: null, postalAddressId: null,
          companyType: 'ett', status: 'active', ...data, id: id(nextId++), ...stamp,
        };
        companies.push(company);
        return delay(company);
      },
      async update(companyId, data) {
        const company = find(companies, companyId);
        if (data.code) checkUniqueCode(companies, data.code, companyId);
        Object.assign(company, data, { updatedAt: new Date().toISOString() });
        return delay(company);
      },
    },
    branches: {
      list: (q = {}) =>
        page(
          branches.filter(
            (b) => (!q.companyId || b.companyId === q.companyId) && (!q.status || b.status === q.status) && matches(q.q, b.code, b.name),
          ),
          q,
        ),
      get: async (branchId) => delay(find(branches, branchId)),
      async create(data) {
        find(companies, data.companyId);
        checkUniqueCode(branches.filter((b) => b.companyId === data.companyId), data.code);
        const created: Branch = {
          status: 'active', isDefault: false, phone: null, email: null, addressId: null,
          ...data, id: id(nextId++), ...stamp,
        };
        if (created.isDefault) branches.forEach((b) => b.companyId === created.companyId && (b.isDefault = false));
        branches.push(created);
        return delay(created);
      },
      async update(branchId, data) {
        const current = find(branches, branchId);
        if (data.code) checkUniqueCode(branches.filter((b) => b.companyId === current.companyId), data.code, branchId);
        if (data.isDefault) branches.forEach((b) => b.companyId === current.companyId && (b.isDefault = false));
        Object.assign(current, data, { updatedAt: new Date().toISOString() });
        return delay(current);
      },
    },
    roles: {
      list: () => delay(roles),
      get: async (roleId) => delay(find(roles, roleId)),
      permissions: () => delay(permissions),
    },
    memberships: {
      list: (q = {}) =>
        page(memberships.filter((m) => (!q.status || m.status === q.status) && (!q.roleId || m.role.id === q.roleId)), q),
      get: async (membershipId) => delay(find(memberships, membershipId)),
    },
  };
}
