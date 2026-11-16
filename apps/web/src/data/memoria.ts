// Repositorios en memoria con datos de ejemplo, para el modo demo (`npm run dev`, ver src/modo.ts).
// Se comportan como la API (paginación, filtros, errores) para que las pantallas funcionen igual en los dos
// modos. Los cambios duran hasta recargar la página. Todo es ficticio: nunca datos reales.
import { sampleNotifications, sampleSearch } from './ejemploCabecera';
import { NOW, checkUniqueCode, delay, find, id, matches, newId, page, stamp, touch } from './memoriaBase';
import { clientAddresses, memoryClientRepositories } from './memoriaEmpresas';
import { memoryMiEttRepositories } from './memoriaMiEtt';
import { memoryQuoteRepositories } from './memoriaPresupuestos';
import type { CatalogRepository, Repositories } from './repositorios';
import {
  ApiError,
  type Address,
  type Branch,
  type CollectiveAgreement,
  type Company,
  type ContractKey,
  type ContractType,
  type Membership,
  type MembershipContextInput,
  type PageQuery,
  type PayrollConcept,
  type ProfessionalCategory,
  type Role,
  type Status,
} from './tipos';


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
    phone: '+34 944 000 000',
    fax: null,
    email: 'central@ettglobal.example',
    website: 'https://www.ettglobal.example',
    smsSenderName: 'ETT Global',
    workerCommunicationsCcEmail: null,
    addressId: null,
    postalAddressId: null,
    ...stamp,
  },
  {
    id: id(11),
    code: 'EGA',
    name: 'ETT Global Servicios Auxiliares, S.L.',
    companyType: 'services',
    status: 'active',
    taxIdTypeId: null,
    taxId: 'B00000001',
    phone: '+34 944 000 010',
    fax: null,
    email: 'auxiliares@ettglobal.example',
    website: null,
    smsSenderName: null,
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

// Las de Mi ETT y del resto de pantallas (src/views/sucursalesDemo.js).
const branches: Branch[] = [
  branch(20, 'DEL-NORTE', 'Delegación Norte (Bilbao)', '+34 944 000 000', 'norte@ettglobal.example', true),
  branch(21, 'SUC-BCN', 'Sucursal Barcelona', '+34 930 000 000', 'barcelona@ettglobal.example'),
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

// El usuario de la membresía n es id(n + 100).
const member = (
  n: number,
  fullName: string,
  roleCode: string,
  branchIds: string[],
  email: string,
  department: string,
  lastSignInAt: string | null,
  status: Membership['status'] = 'active',
): Membership => {
  const r = roles.find((x) => x.code === roleCode)!;
  return {
    id: id(n),
    userId: id(n + 100),
    fullName,
    email,
    lastSignInAt,
    department,
    invitationPending: lastSignInAt === null,
    invitedAt: lastSignInAt === null ? '2026-10-20T09:00:00.000Z' : null,
    invitedBy: lastSignInAt === null ? id(251) : null,
    status,
    role: { id: r.id, code: r.code, name: r.name, scope: r.scope },
    contexts: branchIds.length
      ? branchIds.map((b, i) => ({ companyId: id(10), branchId: b, isDefault: i === 0 }))
      : [{ companyId: id(10), branchId: null, isDefault: true }],
    ...stamp,
  };
};

// El equipo de Mi ETT: las mismas personas que firman, seleccionan y venden en el resto de pantallas.
const memberships: Membership[] = [
  member(150, 'Usuario Demo', 'admin', [], 'demo@example.com', 'Dirección', '2026-10-27T09:55:00.000Z'),
  member(151, 'Begoña Arrieta Lasa', 'admin', [], 'begona.arrieta@ettglobal.example', 'Dirección', '2026-10-27T09:40:00.000Z'),
  member(152, 'Ane Uriarte', 'director_zona', [id(20)], 'ane.uriarte@ettglobal.example', 'Operaciones', '2026-10-27T08:45:00.000Z'),
  member(153, 'Nuria Castells', 'director_zona', [id(21)], 'nuria.castells@ettglobal.example', 'Operaciones', '2026-10-27T09:10:00.000Z'),
  member(154, 'Jon Ibarra', 'seleccion', [id(20)], 'jon.ibarra@ettglobal.example', 'Selección', '2026-10-27T10:02:00.000Z'),
  member(155, 'Ana Gómez', 'seleccion', [id(20)], 'ana.gomez@ettglobal.example', 'Selección', '2026-10-26T18:20:00.000Z'),
  member(156, 'Elena Navarro', 'comercial', [id(20)], 'elena.navarro@ettglobal.example', 'Comercial', '2026-10-27T09:30:00.000Z'),
  member(157, 'Carlos Mendoza', 'comercial', [id(20)], 'carlos.mendoza@ettglobal.example', 'Comercial', '2026-10-25T12:00:00.000Z'),
  member(158, 'Laura Vidal', 'comercial', [id(21)], 'laura.vidal@ettglobal.example', 'Comercial', '2026-10-27T11:05:00.000Z'),
  member(159, 'Lucía Santos', 'admin', [], 'lucia.santos@ettglobal.example', 'Administración', '2026-10-27T10:12:00.000Z'),
  member(160, 'Marcos Rubio', 'laboral', [], 'marcos.rubio@ettglobal.example', 'Laboral', null),
];

/** Enlace de invitación de la demo: abre la página de invitación sin llegar a ningún servidor. */
const enlaceDemo = (n: string) => `${typeof window === 'undefined' ? '' : window.location.origin}/verify?token=demo-${n}&type=invite`;

function contextos(lista: MembershipContextInput[]): Membership['contexts'] {
  const hayDefecto = lista.some((c) => c.isDefault);
  return lista.map((c, i) => ({ companyId: c.companyId, branchId: c.branchId ?? null, isDefault: hayDefecto ? !!c.isDefault : i === 0 }));
}

const DEMO_USER_ID = id(250);

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

// Catálogos oficiales: solo una muestra (Cataluña y Madrid). Los de verdad, en la base de datos.
const communities = [
  { code: '09', name: 'Cataluña' },
  { code: '13', name: 'Comunidad de Madrid' },
  { code: '14', name: 'Región de Murcia' },
  { code: '16', name: 'País Vasco' },
];
const provinces = [
  { code: '08', name: 'Barcelona', autonomousCommunityCode: '09' },
  { code: '17', name: 'Girona', autonomousCommunityCode: '09' },
  { code: '25', name: 'Lleida', autonomousCommunityCode: '09' },
  { code: '28', name: 'Madrid', autonomousCommunityCode: '13' },
  { code: '30', name: 'Murcia', autonomousCommunityCode: '14' },
  { code: '43', name: 'Tarragona', autonomousCommunityCode: '09' },
  { code: '48', name: 'Bizkaia', autonomousCommunityCode: '16' },
];
const municipalities = [
  ['08019', '3', 'Barcelona'], ['08101', '7', "Hospitalet de Llobregat, L'"], ['08279', '8', 'Terrassa'],
  ['17079', '2', 'Girona'], ['25120', '7', 'Lleida'], ['28005', '3', 'Alcalá de Henares'], ['28079', '6', 'Madrid'],
  ['43148', '2', 'Tarragona'], ['48015', '7', 'Basauri'], ['48020', '9', 'Bilbao'],
].map(([code, checkDigit, name]) => ({ code, provinceCode: code.slice(0, 2), checkDigit, name, active: true }));
const countries = [
  ['AD', 'AND', '020', 'Andorra', false, false], ['ES', 'ESP', '724', 'España', true, true],
  ['FR', 'FRA', '250', 'Francia', true, true], ['MA', 'MAR', '504', 'Marruecos', false, false],
  ['PT', 'PRT', '620', 'Portugal', true, true], ['RO', 'ROU', '642', 'Rumanía', true, true],
].map(([code, alpha3, numericCode, name, euMember, eeaMember]) => ({ code, alpha3, numericCode, name, euMember, eeaMember }) as {
  code: string; alpha3: string; numericCode: string; name: string; euMember: boolean; eeaMember: boolean;
});
const key = (code: string, name: string, duration: ContractKey['duration'], workingTime: ContractKey['workingTime'], active = true): ContractKey =>
  ({ code, name, duration, workingTime, isConversion: false, active, notes: null });
const contractKeys: ContractKey[] = [
  key('100', 'Indefinido a tiempo completo ordinario', 'indefinite', 'full_time'),
  key('200', 'Indefinido a tiempo parcial ordinario', 'indefinite', 'part_time'),
  key('300', 'Fijo discontinuo ordinario', 'indefinite', 'fixed_discontinuous'),
  key('401', 'Obra o servicio determinado, a tiempo completo', 'temporary', 'full_time', false),
  key('402', 'Temporal por circunstancias de la producción, a tiempo completo', 'temporary', 'full_time'),
  key('410', 'Temporal de sustitución, a tiempo completo', 'temporary', 'full_time'),
  key('502', 'Temporal por circunstancias de la producción, a tiempo parcial', 'temporary', 'part_time'),
];

const addresses: Address[] = [
  {
    id: id(50), streetType: 'C/', street: 'Ejemplo', number: '1', door: '3ª planta', postalCode: '48001',
    city: null, municipalityCode: '48020', provinceCode: '48', countryCode: 'ES', geoZoneId: null, ...stamp,
  },
  {
    id: id(51), streetType: 'C/', street: 'Ejemplo', number: '20', door: 'local 2', postalCode: '08001',
    city: null, municipalityCode: '08019', provinceCode: '08', countryCode: 'ES', geoZoneId: null, ...stamp,
  },
  ...clientAddresses,
];
companies[0].addressId = id(50);
branches[0].addressId = id(50);
branches[1].addressId = id(51);

// Catálogos laborales de la ETT
const agreements: CollectiveAgreement[] = [
  {
    id: id(60), code: 'HOST08', name: 'Convenio de hostelería de Cataluña (ejemplo)', officialCode: null, scope: 'regional',
    autonomousCommunityCode: '09', provinceCode: null, validFrom: '2026-01-01', validTo: '2026-12-31', notes: null, status: 'active', ...stamp,
  },
  {
    id: id(61), code: 'LOG08', name: 'Convenio de logística de Barcelona (ejemplo)', officialCode: null, scope: 'provincial',
    autonomousCommunityCode: null, provinceCode: '08', validFrom: '2025-01-01', validTo: null, notes: null, status: 'active', ...stamp,
  },
  {
    id: id(62), code: 'LOG48', name: 'Convenio de logística de Bizkaia (ejemplo)', officialCode: null, scope: 'provincial',
    autonomousCommunityCode: null, provinceCode: '48', validFrom: '2025-01-01', validTo: null, notes: null, status: 'active', ...stamp,
  },
  {
    id: id(63), code: 'MET28', name: 'Convenio del metal de Madrid (ejemplo)', officialCode: null, scope: 'provincial',
    autonomousCommunityCode: null, provinceCode: '28', validFrom: '2025-01-01', validTo: null, notes: null, status: 'active', ...stamp,
  },
  // El del personal de estructura de la ETT (Mi ETT).
  {
    id: id(64), code: 'ETT', name: 'Convenio estatal de empresas de trabajo temporal (ejemplo)', officialCode: null, scope: 'state',
    autonomousCommunityCode: null, provinceCode: null, validFrom: '2025-01-01', validTo: null, notes: null, status: 'active', ...stamp,
  },
];
// 70-73: las de siempre; 600-607: las de los presupuestos de ejemplo (memoriaPresupuestos.ts), con su nivel.
const categoriasBase: ProfessionalCategory[] = [
  ['MOZO', 'Mozo de almacén', id(61), '9811', 10],
  ['CARR', 'Carretillero', id(61), '8333', 9],
  ['CAMA', 'Camarero/a', id(60), '5120', 10],
  ['AYCO', 'Ayudante de cocina', id(60), '9310', 10],
].map(([code, name, agreementId, cnoCode, contributionGroup], i) => ({
  id: id(70 + i), code: code as string, name: name as string, kind: 'position', agreementId: agreementId as string,
  agreementLevel: null, cnoCode: cnoCode as string, contributionGroup: contributionGroup as number, statisticalCode: null,
  companyId: null, branchId: null, status: 'active' as Status, ...stamp,
}));
const categories: ProfessionalCategory[] = [
  ...categoriasBase,
  ...(
    [
      ['OPALM', 'Operario/a de almacén', id(62), 'IV', '9811'],
      ['MOZESP', 'Mozo/a especialista - carretillero/a', id(62), 'III', '8333'],
      ['MOZALM', 'Mozo/a de almacén', id(62), 'IV', '9811'],
      ['PREPED', 'Preparador/a de pedidos (picking)', id(62), 'IV', '9811'],
      ['CAMSAL', 'Camarero/a de sala', id(60), 'II', '5120'],
      ['AYCOC', 'Ayudante de cocina', id(60), 'III', '9310'],
      ['COCPAR', 'Cocinero/a de partida', id(60), 'I', '5110'],
      ['SOLD', 'Soldador/a homologado TIG/MIG', id(63), 'Oficial 1ª', '7312'],
    ] as const
  ).map(([code, name, agreementId, agreementLevel, cnoCode], i): ProfessionalCategory => ({
    id: id(600 + i), code, name, kind: 'category', agreementId, agreementLevel, cnoCode, contributionGroup: null, statisticalCode: null,
    companyId: null, branchId: null, status: 'active', ...stamp,
  })),
];
// Como al crear una ETT: un tipo por clave oficial activa.
const contractTypes: ContractType[] = contractKeys
  .filter((k) => k.active)
  .map((k, i) => ({ id: id(80 + i), code: k.code, name: k.name, contractKeyCode: k.code, contributionMode: 'percentages', status: 'active', ...stamp }));
const concept = (n: number, code: string, name: string, conceptType: PayrollConcept['conceptType'], calculation: PayrollConcept['calculation'], defaultValue: number | null, isSalary = true): PayrollConcept => ({
  id: id(n), code, name, description: null, conceptType, calculation, defaultValue,
  calculationBase: calculation === 'percentage' ? 'gross_hourly_salary' : null, isSalary, isMandatory: false,
  printOnOffer: true, printOnInvoiceCpd: true, printOnSalaryCpd: false, printOnContract: false, status: 'active', ...stamp,
});
const concepts: PayrollConcept[] = [
  concept(90, 'HN', 'Hora normal', 'normal_hour', 'fixed_hour', null),
  concept(91, 'HE', 'Hora extra', 'overtime', 'fixed_hour', null),
  concept(92, 'NOCT', 'Plus nocturnidad', 'salary_supplement', 'percentage', 25),
  concept(93, 'TRANS', 'Plus transporte', 'allowance', 'fixed_day', 3.5, false),
];

function memoryCatalog<T extends { id: string; code: string; name: string; status: Status; createdAt: string; updatedAt: string }, Q extends PageQuery & { status?: Status; q?: string }>(
  items: T[],
  defaults: Omit<T, 'id' | 'code' | 'name' | 'createdAt' | 'updatedAt'>,
  filter: (item: T, query: Q) => boolean = () => true,
): CatalogRepository<T, Q> {
  return {
    list: (q = {} as Q) => page(items.filter((x) => (!q.status || x.status === q.status) && matches(q.q, x.code, x.name) && filter(x, q)), q),
    get: async (itemId) => delay(find(items, itemId)),
    async create(data) {
      checkUniqueCode(items, data.code);
      const item = { ...defaults, ...data, id: newId(), ...stamp } as T;
      items.push(item);
      return delay(item);
    },
    async update(itemId, data) {
      const item = find(items, itemId);
      if (data.code) checkUniqueCode(items, data.code, itemId);
      return delay(touch(item, data));
    },
    async remove(itemId) {
      items.splice(items.indexOf(find(items, itemId)), 1);
      await delay(null);
    },
  };
}

export function memoryRepositories(): Repositories {
  const miEtt = memoryMiEttRepositories();
  return {
    session: {
      me: () =>
        delay({
          user: { id: DEMO_USER_ID, email: 'demo@example.com', fullName: 'Usuario Demo', phone: null, status: 'active', mustChangePassword: false },
          isSuperadmin: false,
          isContentEditor: false,
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
          companyType: 'ett', status: 'active', ...data, id: newId(), ...stamp,
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
          ...data, id: newId(), ...stamp,
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
    catalogs: {
      autonomousCommunities: () => delay(communities),
      provinces: (q = {}) => delay(provinces.filter((p) => !q.autonomousCommunityCode || p.autonomousCommunityCode === q.autonomousCommunityCode)),
      async municipalities(q) {
        if (!q.provinceCode && !(q.q && q.q.length >= 2)) {
          throw new ApiError(400, 'validacion', 'Indica provinceCode o q: la lista entera tiene más de 8.000 municipios');
        }
        const found = municipalities.filter((m) => (!q.provinceCode || m.provinceCode === q.provinceCode) && matches(q.q, m.name));
        return delay(found.slice(0, q.limit ?? 50));
      },
      municipality: async (code) => {
        const m = municipalities.find((x) => x.code === code);
        if (!m) throw new ApiError(404, 'no_encontrado', 'El municipio no existe');
        return delay(m);
      },
      countries: (q = {}) => delay(countries.filter((c) => matches(q.q, c.name) || c.code === q.q?.toUpperCase())),
      contractKeys: (q = {}) => delay(contractKeys.filter((k) => q.includeInactive || k.active)),
    },
    addresses: {
      get: async (addressId) => delay(find(addresses, addressId)),
      async create(data) {
        const address: Address = {
          streetType: null, street: null, number: null, door: null, postalCode: null, city: null,
          municipalityCode: null, provinceCode: null, countryCode: 'ES', geoZoneId: null,
          ...data, id: newId(), ...stamp,
        };
        addresses.push(address);
        return delay(address);
      },
      update: async (addressId, data) => delay(touch(find(addresses, addressId), data)),
      async remove(addressId) {
        addresses.splice(addresses.indexOf(find(addresses, addressId)), 1);
        await delay(null);
      },
    },
    collectiveAgreements: memoryCatalog(
      agreements,
      { officialCode: null, scope: 'provincial', autonomousCommunityCode: null, provinceCode: null, validFrom: null, validTo: null, notes: null, status: 'active' },
      (a, q) => (!q.provinceCode || a.provinceCode === q.provinceCode) && (!q.scope || a.scope === q.scope),
    ),
    professionalCategories: memoryCatalog(
      categories,
      { kind: 'position', agreementId: null, agreementLevel: null, cnoCode: null, contributionGroup: null, statisticalCode: null, companyId: null, branchId: null, status: 'active' },
      (c, q) =>
        (!q.agreementId || c.agreementId === q.agreementId) && (!q.companyId || c.companyId === q.companyId) &&
        (!q.branchId || c.branchId === q.branchId) && (!q.cnoCode || c.cnoCode === q.cnoCode) && (!q.kind || c.kind === q.kind),
    ),
    contractTypes: memoryCatalog(
      contractTypes,
      { contractKeyCode: '402', contributionMode: 'percentages', status: 'active' },
      (t, q) => !q.contractKeyCode || t.contractKeyCode === q.contractKeyCode,
    ),
    payrollConcepts: memoryCatalog(
      concepts,
      {
        description: null, conceptType: 'other', calculation: 'fixed_hour', defaultValue: null, calculationBase: null, isSalary: true,
        isMandatory: false, printOnOffer: false, printOnInvoiceCpd: false, printOnSalaryCpd: false, printOnContract: false, status: 'active',
      },
      (c, q) => !q.conceptType || c.conceptType === q.conceptType,
    ),
    ...memoryClientRepositories(),
    memberships: {
      list: (q = {}) =>
        page(memberships.filter((m) => (!q.status || m.status === q.status) && (!q.roleId || m.role.id === q.roleId)), q),
      get: async (membershipId) => delay(find(memberships, membershipId)),
      async create(data) {
        const email = data.email.trim().toLowerCase();
        if (memberships.some((m) => m.email === email)) throw new ApiError(409, 'conflicto', 'Ese usuario ya está en esta ETT');
        const r = roles.find((x) => x.id === data.roleId);
        if (!r) throw new ApiError(422, 'referencia_invalida', 'El rol no existe en esta ETT');
        const nuevo: Membership = {
          id: newId(), userId: newId(), fullName: data.fullName.trim(), email, lastSignInAt: null, department: data.department ?? null,
          invitationPending: true, invitedAt: new Date().toISOString(), invitedBy: DEMO_USER_ID, status: 'active',
          role: { id: r.id, code: r.code, name: r.name, scope: r.scope }, contexts: contextos(data.contexts), ...stamp,
        };
        memberships.push(nuevo);
        return delay({ membership: nuevo, inviteUrl: enlaceDemo(nuevo.id), existingUser: false });
      },
      async update(membershipId, { contexts, roleId, ...data }) {
        const m = find(memberships, membershipId);
        if (m.userId === DEMO_USER_ID && ((roleId && roleId !== m.role.id) || (data.status && data.status !== 'active'))) {
          throw new ApiError(409, 'conflicto', 'No puedes cambiar tu propio rol ni bloquearte: pídeselo a otro administrador');
        }
        const r = roleId ? roles.find((x) => x.id === roleId) : undefined;
        if (roleId && !r) throw new ApiError(422, 'referencia_invalida', 'El rol no existe en esta ETT');
        touch(m, {
          ...data,
          ...(r ? { role: { id: r.id, code: r.code, name: r.name, scope: r.scope } } : {}),
          ...(contexts ? { contexts: contextos(contexts) } : {}),
        });
        return delay(m);
      },
      async resendInvitation(membershipId) {
        const m = find(memberships, membershipId);
        if (!m.invitationPending) throw new ApiError(409, 'conflicto', 'Este usuario ya aceptó la invitación');
        touch(m, { invitedAt: new Date().toISOString(), invitedBy: DEMO_USER_ID });
        return delay({ inviteUrl: enlaceDemo(m.id) });
      },
      async revokeInvitation(membershipId) {
        const m = find(memberships, membershipId);
        if (!m.invitationPending) throw new ApiError(409, 'conflicto', 'Este usuario ya aceptó la invitación: para quitarle el acceso, bloquéalo');
        memberships.splice(memberships.indexOf(m), 1);
        await delay(null);
      },
    },
    ...miEtt,
    ...memoryQuoteRepositories(miEtt.tenantSettings.get),
    search: sampleSearch(false),
    notifications: sampleNotifications(false),
  };
}
