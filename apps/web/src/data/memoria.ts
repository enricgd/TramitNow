// Repositorios en memoria con datos de ejemplo, para el modo demo (`npm run dev`, ver src/modo.ts).
// Se comportan como la API (paginación, filtros, errores) para que las pantallas funcionen igual en los dos
// modos. Los cambios duran hasta recargar la página. Todo es ficticio: nunca datos reales.
import { REPRESENTANTE_ETT, AUTORIZACION_ETT } from '../views/ettDemo';
import { SERVICIOS_INICIALES } from '../views/serviciosDemo';
import { sampleNotifications, sampleSearch } from './ejemploCabecera';
import { NOW, checkUniqueCode, delay, find, id, matches, newId, page, stamp, touch } from './memoriaBase';
import { clientAddresses, memoryClientRepositories } from './memoriaEmpresas';
import type { CatalogRepository, Repositories } from './repositorios';
import {
  ApiError,
  type Address,
  type Branch,
  type CollectiveAgreement,
  type Company,
  type EttSettings,
  type ContractKey,
  type ContractType,
  type Membership,
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

// El equipo de Mi ETT: las mismas personas que firman, seleccionan y venden en el resto de pantallas.
const memberships: Membership[] = [
  member(150, 'Usuario Demo', 'admin', []),
  member(151, 'Begoña Arrieta Lasa', 'admin', []),
  member(152, 'Ane Uriarte', 'director_zona', [id(20)]),
  member(153, 'Nuria Castells', 'director_zona', [id(21)]),
  member(154, 'Jon Ibarra', 'seleccion', [id(20)]),
  member(155, 'Ana Gómez', 'seleccion', [id(20)]),
  member(156, 'Elena Navarro', 'comercial', [id(20)]),
  member(157, 'Carlos Mendoza', 'comercial', [id(20)]),
  member(158, 'Laura Vidal', 'comercial', [id(21)]),
  member(159, 'Lucía Santos', 'admin', []),
];
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
];
const categories: ProfessionalCategory[] = [
  ['MOZO', 'Mozo de almacén', id(61), '9811', 10],
  ['CARR', 'Carretillero', id(61), '8333', 9],
  ['CAMA', 'Camarero/a', id(60), '5120', 10],
  ['AYCO', 'Ayudante de cocina', id(60), '9310', 10],
].map(([code, name, agreementId, cnoCode, contributionGroup], i) => ({
  id: id(70 + i), code: code as string, name: name as string, kind: 'position', agreementId: agreementId as string,
  agreementLevel: null, cnoCode: cnoCode as string, contributionGroup: contributionGroup as number, statisticalCode: null,
  companyId: null, branchId: null, status: 'active' as Status, ...stamp,
}));
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

// Lo de Mi ETT que aún no tiene API (los datos de ejemplo que tenía FichaEttView.jsx, con la misma forma).
const ettSettings: EttSettings = {
  legal: {
    nombreComercial: TENANT.tradeName,
    formaJuridica: 'Sociedad Limitada (S.L.)',
    autorizacion: AUTORIZACION_ETT,
    fechaAutorizacion: '2019-03-12',
    cnae: '7820 · Actividades de las empresas de trabajo temporal',
    convenio: 'Convenio colectivo estatal de empresas de trabajo temporal',
    registroMercantil: 'Registro Mercantil de Bizkaia',
    tomo: '0000',
    folio: '00',
    hoja: 'BI-00000',
    representante: REPRESENTANTE_ETT.nombre,
    representanteDni: REPRESENTANTE_ETT.dni,
    representanteCargo: REPRESENTANTE_ETT.cargo,
    mutua: 'Mutua colaboradora con la Seguridad Social de ejemplo',
    servicioPrevencion: 'Servicio de prevención ajeno de ejemplo',
    // Garantía financiera obligatoria de las ETT: se actualiza cada año
    garantiaTipo: 'Aval bancario',
    garantiaEntidad: 'Entidad bancaria de ejemplo',
    garantiaImporte: '185.000 €',
    garantiaVence: '2026-12-08',
    // Certificado digital de empresa y Sistema RED
    redAutorizacion: '00000',
    certificadoCaduca: '2026-12-20',
  },
  // Las mismas series que en Facturación
  billing: {
    billingSeries: 'F2026-',
    invoicePrefix: 'R2026-',
    proximaFactura: 108,
    proximaRectificativa: 4,
    vatRate: '21%',
    withholdingRate: '0%',
    iban: 'ES00 0000 0000 0000 0000 0000',
    swiftBic: 'XXXXESXXXXX',
    paymentMethod: 'Transferencia bancaria',
    customPaymentMethod: '',
    paymentTerms: '30 días fecha factura',
    currency: 'EUR (€)',
    adminEmail: 'administracion@ettglobal.example',
    billingAddressSameAsFiscal: true,
    billingBranchMode: 'centralized',
  },
  // Códigos de cuenta de cotización (CCC): uno por provincia y por tipo de personal
  contributionAccounts: [
    { id: 'ccc-1', numero: '48 0000001 01', provincia: 'Bizkaia', tipo: 'Personas en misión', sucursal: 'Delegación Norte (Bilbao)' },
    { id: 'ccc-2', numero: '48 0000002 02', provincia: 'Bizkaia', tipo: 'Personal de estructura', sucursal: 'Delegación Norte (Bilbao)' },
    { id: 'ccc-3', numero: '08 0000003 03', provincia: 'Barcelona', tipo: 'Personas en misión', sucursal: 'Sucursal Barcelona' },
  ],
  services: structuredClone(SERVICIOS_INICIALES),
  templates: [
    { id: 'tpl-1', name: 'Presupuesto comercial estándar 2026', category: 'Presupuestos', scope: 'Global (Todas)', status: 'active', format: 'PDF + Interactivo', updated: '12 Ene 2026' },
    { id: 'tpl-2', name: 'Factura ordinaria (series F y R)', category: 'Facturación', scope: 'Global (Todas)', status: 'active', format: 'PDF / XML Facturae', updated: '02 Feb 2026' },
    { id: 'tpl-3', name: 'Presupuesto de hostelería y eventos', category: 'Presupuestos', scope: 'Sucursal Barcelona', status: 'incomplete', format: 'PDF', updated: '15 Sep 2026' },
    { id: 'tpl-4', name: 'Contrato de puesta a disposición (CPD)', category: 'Laboral / Legal', scope: 'Global (Todas)', status: 'active', format: 'PDF firmable', updated: '10 Feb 2026' },
  ],
  // Portales propios de la ETT: subdominio y correos de bienvenida
  portals: {
    subdominio: 'ettglobal',
    bienvenida: {
      empresa: { activo: true, asunto: 'Tu acceso al Área de empresas de {ett}', texto: 'Hola, {nombre}:\n\nTe hemos dado acceso al Área de empresas de {ett} para {empresa}. Desde allí puedes ver a tu personal en misión, validar los partes de horas, firmar los CPD y descargar las facturas, según tus permisos.\n\nElige tu contraseña aquí: {enlace}' },
      candidato: { activo: true, asunto: 'Bienvenida a {ett}', texto: 'Hola, {nombre}:\n\nGracias por inscribirte. Desde tu área personal puedes subir tus documentos, seguir tus candidaturas y firmar tu contrato.\n\nEntra aquí: {enlace}' },
    },
  },
  activity: [
    { id: 'act-1', timestamp: 'Hoy, 10:45', user: 'Begoña Arrieta Lasa', action: 'Añadió el CCC de personas en misión de Barcelona', type: 'fiscal' },
    { id: 'act-2', timestamp: '02 Oct, 16:30', user: 'Lucía Santos', action: 'Emitió la factura F2026-0101 (septiembre, Trans-Logística)', type: 'billing' },
    { id: 'act-3', timestamp: '15 Sep, 11:20', user: 'Begoña Arrieta Lasa', action: 'Abrió la Sucursal Barcelona (responsable: Nuria Castells)', type: 'branch' },
    { id: 'act-4', timestamp: '08 Ene, 09:15', user: 'Begoña Arrieta Lasa', action: 'Renovó la garantía financiera hasta el 08/12/2026', type: 'fiscal' },
    { id: 'act-5', timestamp: '02 Ene, 08:00', user: 'Lucía Santos', action: 'Activó las series de 2026: F2026- y R2026-', type: 'billing' },
  ],
  branchManagers: { [id(20)]: 'Ane Uriarte', [id(21)]: 'Nuria Castells' },
  users: Object.fromEntries(
    (
      [
        [150, 'demo@example.com', 'Dirección', 'Ahora'],
        [151, 'begona.arrieta@ettglobal.example', 'Dirección', 'Hace 15 min'],
        [152, 'ane.uriarte@ettglobal.example', 'Operaciones', 'Hoy 08:45'],
        [153, 'nuria.castells@ettglobal.example', 'Operaciones', 'Hoy 09:10'],
        [154, 'jon.ibarra@ettglobal.example', 'Selección', 'Hoy 10:02'],
        [155, 'ana.gomez@ettglobal.example', 'Selección', 'Ayer 18:20'],
        [156, 'elena.navarro@ettglobal.example', 'Comercial', 'Hoy 09:30'],
        [157, 'carlos.mendoza@ettglobal.example', 'Comercial', 'Hace 2 días'],
        [158, 'laura.vidal@ettglobal.example', 'Comercial', 'Hoy 11:05'],
        [159, 'lucia.santos@ettglobal.example', 'Administración', 'Hoy 10:12'],
      ] as const
    ).map(([n, email, departamento, ultimoAcceso]) => [id(n), { email, departamento, ultimoAcceso }]),
  ),
  invitations: [
    { id: 'inv-1', name: 'Marcos Rubio', email: 'marcos.rubio@ettglobal.example', roleId: id(31), branchId: null, createdAt: NOW },
  ],
};

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
  return {
    session: {
      me: () =>
        delay({
          user: { id: DEMO_USER_ID, email: 'demo@example.com', fullName: 'Usuario Demo', phone: null, status: 'active', mustChangePassword: false },
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
    },
    search: sampleSearch(false),
    notifications: sampleNotifications(false),
    ettSettings: {
      get: () => delay(ettSettings),
      update: async (data) => delay(Object.assign(ettSettings, structuredClone(data))),
    },
  };
}
