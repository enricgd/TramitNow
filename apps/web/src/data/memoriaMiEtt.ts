// Datos de ejemplo y repositorios en memoria de Mi ETT (modo demo): datos legales y facturación de cada sociedad,
// series, CCC, servicios que factura la ETT, ajustes de presupuestos y lo que aún no tiene API (plantillas,
// portales, historial y responsables de sucursal). Se comportan como apps/api/src/routes/mi-ett.ts.
// Todo es ficticio. Sin efectos al cargarse (ver vite.config.ts).
import { REPRESENTANTE_ETT, AUTORIZACION_ETT } from '../views/ettDemo';
import { NOW, delay, find, id, matches, newId, page, stamp, touch } from './memoriaBase';
import type { Repositories } from './repositorios';
import {
  ApiError,
  type BillableService,
  type CompanyBillingSettings,
  type CompanyLegal,
  type ContributionAccount,
  type EttSettings,
  type NumberSeries,
  type TenantSettings,
} from './tipos';

const EG = id(10);
const AVISO_DIAS = 60;

const legales: CompanyLegal[] = [
  {
    id: id(400),
    companyId: EG,
    tradeName: 'ETT Global People',
    legalForm: 'Sociedad Limitada (S.L.)',
    cnaeCode: '7820',
    staffAgreementId: id(64),
    ettAuthorizationNumber: AUTORIZACION_ETT,
    ettAuthorizationDate: '2019-03-12',
    ettAuthorizationScope: 'state',
    ettAuthorizationCommunityCode: null,
    commercialRegistry: 'Registro Mercantil de Bizkaia',
    registryVolume: '0000',
    registryFolio: '00',
    registrySheet: 'BI-00000',
    registryEntry: '1.ª',
    legalRepName: REPRESENTANTE_ETT.nombre,
    legalRepIdType: 'dni',
    legalRepIdNumber: REPRESENTANTE_ETT.dni,
    legalRepPosition: REPRESENTANTE_ETT.cargo,
    mutualInsurer: 'Mutua colaboradora con la Seguridad Social de ejemplo',
    preventionService: 'Servicio de prevención ajeno de ejemplo',
    redAuthorization: '00000',
    // Garantía financiera obligatoria de las ETT: se actualiza cada año.
    guaranteeType: 'bank_guarantee',
    guaranteeEntity: 'Entidad bancaria de ejemplo',
    guaranteeAmount: 185000,
    guaranteeExpiresOn: '2026-12-08',
    certificateHolder: 'ETT Global Servicios Temporales, S.L.',
    certificateIssuer: 'FNMT-RCM',
    certificateExpiresOn: '2026-12-20',
    ...stamp,
  },
];

const facturaciones: CompanyBillingSettings[] = [
  {
    id: id(410),
    companyId: EG,
    iban: 'ES0000000000000000000000',
    swiftBic: 'XXXXESXXXXX',
    // «Transferencia a 30 días» de la tabla maestra de formas de pago (memoriaEmpresas.ts).
    paymentMethodId: id(300),
    paymentTerms: '30 días fecha factura',
    vatRate: 21,
    withholdingRate: 0,
    currency: 'EUR',
    billingEmail: 'administracion@ettglobal.example',
    billingAddressId: null,
    branchMode: 'centralized',
    ...stamp,
  },
];

const serie = (n: number, documentKind: NumberSeries['documentKind'], prefix: string, padding: number, lastNumber: number, companyId: string | null = EG) => ({
  id: id(n), documentKind, companyId, branchId: null, year: 2026, prefix, padding, lastNumber, updatedAt: NOW,
});
// Las mismas series que en Facturación.
const series: Omit<NumberSeries, 'nextNumber' | 'nextFormatted'>[] = [
  serie(420, 'invoice', 'F2026-', 4, 107),
  serie(421, 'credit_note', 'R2026-', 4, 3),
  serie(422, 'quote', 'PRE2026-', 5, 41, null),
];
const conSiguiente = (s: (typeof series)[number]): NumberSeries => {
  const next = s.lastNumber + 1;
  return { ...s, nextNumber: next, nextFormatted: `${s.prefix}${String(next).padStart(s.padding, '0')}` };
};

// Códigos de cuenta de cotización (CCC): uno por provincia y por tipo de personal. Cifras de control correctas.
const ccc = (n: number, code: string, branchId: string, staffType: ContributionAccount['staffType']): ContributionAccount => ({
  id: id(n), companyId: EG, branchId, code, provinceCode: code.slice(0, 2), staffType, status: 'active', ...stamp,
});
const cuentas: ContributionAccount[] = [
  ccc(430, '48000000160', id(20), 'mission'),
  ccc(431, '48000000261', id(20), 'structure'),
  ccc(432, '08000000329', id(21), 'mission'),
];

const servicio = (n: number, code: string, name: string, chargeMode: BillableService['chargeMode'], defaultValue: number, unit: string): BillableService => ({
  id: id(n), code, name, chargeMode, defaultValue, unit, status: 'active', ...stamp,
});
const servicios: BillableService[] = [
  servicio(440, 'SELECCION', 'Selección de personal', 'percentage', 15, 'proceso'),
  servicio(441, 'FORMACION_PRL', 'Formación PRL', 'per_person', 85, 'persona'),
  servicio(442, 'RECONOCIMIENTO', 'Reconocimiento médico', 'per_person', 45, 'persona'),
  servicio(443, 'NOMINAS', 'Gestión de nóminas', 'per_unit', 12, 'nómina'),
  servicio(444, 'DESPLAZAMIENTOS', 'Desplazamientos', 'per_unit', 0.26, 'km'),
];

// Los del diseño de Presupuestos (por defecto, en una ETT nueva: sin mínimo y 15 días).
const ajustes: TenantSettings = { quoteMinMarginPercent: 15, quoteNoResponseDays: 5, candidatePoolRetentionMonths: 24, candidateDocumentNoticeDays: 30, accessLogRetentionMonths: 24 };

// Lo que aún no tiene API (los datos de ejemplo que tenía FichaEttView.jsx, con la misma forma).
const ettSettings: EttSettings = {
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
};

// ---------------------------------------------------------------------------
// Reglas de la API
// ---------------------------------------------------------------------------

const vacio = (companyId: string): CompanyLegal => ({
  id: null, companyId, tradeName: null, legalForm: null, cnaeCode: null, staffAgreementId: null, ettAuthorizationNumber: null,
  ettAuthorizationDate: null, ettAuthorizationScope: null, ettAuthorizationCommunityCode: null, commercialRegistry: null,
  registryVolume: null, registryFolio: null, registrySheet: null, registryEntry: null, legalRepName: null, legalRepIdType: null,
  legalRepIdNumber: null, legalRepPosition: null, mutualInsurer: null, preventionService: null, redAuthorization: null,
  guaranteeType: null, guaranteeEntity: null, guaranteeAmount: null, guaranteeExpiresOn: null, certificateHolder: null,
  certificateIssuer: null, certificateExpiresOn: null, createdAt: null, updatedAt: null,
});

const facturacionVacia = (companyId: string): CompanyBillingSettings => ({
  id: null, companyId, iban: null, swiftBic: null, paymentMethodId: null, paymentTerms: null, vatRate: 21, withholdingRate: 0,
  currency: 'EUR', billingEmail: null, billingAddressId: null, branchMode: 'centralized', createdAt: null, updatedAt: null,
});

const diasHasta = (dia: string | null) =>
  dia ? Math.round((new Date(dia).getTime() - new Date(new Date().toISOString().slice(0, 10)).getTime()) / 86_400_000) : null;

function avisos(l: CompanyLegal): string[] {
  const out: string[] = [];
  const g = diasHasta(l.guaranteeExpiresOn);
  if (g !== null && g < 0) out.push('La garantía financiera está vencida: es obligatoria para operar como ETT');
  else if (g !== null && g <= AVISO_DIAS) out.push(`La garantía financiera vence en ${g} días`);
  const c = diasHasta(l.certificateExpiresOn);
  if (c !== null && c < 0) out.push('El certificado digital está caducado');
  else if (c !== null && c <= AVISO_DIAS) out.push(`El certificado digital caduca en ${c} días`);
  return out;
}

const DNI_LETRAS = 'TRWAGMYFPDXBNJZSQVHLCKE';
function documentoValido(tipo: string, valor: string) {
  if (tipo === 'passport') return /^[A-Z0-9]{5,20}$/.test(valor);
  const nie = tipo === 'nie' ? valor.match(/^([XYZ])([0-9]{7})([A-Z])$/) : null;
  const dni = tipo === 'dni' ? valor.match(/^([0-9]{8})([A-Z])$/) : null;
  const cifras = nie ? `${'XYZ'.indexOf(nie[1])}${nie[2]}` : dni?.[1];
  const letra = nie ? nie[3] : dni?.[2];
  return cifras !== undefined && letra === DNI_LETRAS[Number(cifras) % 23];
}

const limpiar = (v: string | null | undefined) => (v == null ? v : v.replace(/[\s.\-/]/g, '').toUpperCase() || null);
const validacion = (path: string, message: string) => new ApiError(400, 'validacion', 'Datos no válidos', [{ path, message }]);

function comprobarCcc(code: string) {
  const c = code.replace(/[\s/-]/g, '');
  if (!/^[0-9]{11}$/.test(c)) throw validacion('code', 'El CCC tiene 11 cifras: 2 de provincia, 7 de número y 2 de control');
  if (Number(c.slice(0, 9)) % 97 !== Number(c.slice(9))) throw validacion('code', 'Las cifras de control del CCC no cuadran');
  return c;
}

const PREFIJOS = { quote: 'PRE', request: 'PET', invoice: 'FAC', credit_note: 'REC' };

export function memoryMiEttRepositories(): Pick<
  Repositories,
  'companyLegal' | 'companyBilling' | 'numberSeries' | 'contributionAccounts' | 'billableServices' | 'tenantSettings' | 'ettSettings'
> {
  return {
    companyLegal: {
      get: async (companyId) => {
        const l = legales.find((x) => x.companyId === companyId) ?? vacio(companyId);
        return delay({ legal: l, warnings: avisos(l) });
      },
      async save(companyId, data) {
        const datos = { ...data, ...('legalRepIdNumber' in data ? { legalRepIdNumber: limpiar(data.legalRepIdNumber) } : {}) };
        let l = legales.find((x) => x.companyId === companyId);
        const nuevo = { ...(l ?? vacio(companyId)), ...datos };
        if (nuevo.legalRepIdNumber && nuevo.legalRepIdType && !documentoValido(nuevo.legalRepIdType, nuevo.legalRepIdNumber)) {
          throw new ApiError(422, 'validacion', 'El documento del representante no es válido (revisa la letra)');
        }
        if (l) touch(l, datos);
        else legales.push((l = { ...nuevo, id: newId(), ...stamp }));
        return delay({ legal: l, warnings: avisos(l) });
      },
    },
    companyBilling: {
      get: async (companyId) => delay(facturaciones.find((x) => x.companyId === companyId) ?? facturacionVacia(companyId)),
      async save(companyId, data) {
        const datos = { ...data };
        if ('iban' in datos) {
          datos.iban = limpiar(datos.iban);
          if (datos.iban && !/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(datos.iban)) throw validacion('iban', 'IBAN no válido');
        }
        if ('swiftBic' in datos) {
          datos.swiftBic = limpiar(datos.swiftBic);
          if (datos.swiftBic && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(datos.swiftBic)) throw validacion('swiftBic', 'BIC no válido');
        }
        let f = facturaciones.find((x) => x.companyId === companyId);
        if (f) touch(f, datos);
        else facturaciones.push((f = { ...facturacionVacia(companyId), ...datos, id: newId(), ...stamp }));
        return delay(f);
      },
    },
    numberSeries: {
      list: async (q = {}) =>
        delay(
          series
            .filter((s) => (!q.documentKind || s.documentKind === q.documentKind) && (!q.year || s.year === q.year) && (!q.companyId || s.companyId === q.companyId))
            .map(conSiguiente),
        ),
      async create(data) {
        const companyId = data.companyId ?? null;
        const branchId = data.branchId ?? null;
        if (series.some((s) => s.documentKind === data.documentKind && s.year === data.year && s.companyId === companyId && s.branchId === branchId)) {
          throw new ApiError(409, 'conflicto', 'Ya existe esa serie');
        }
        const s = {
          id: newId(), documentKind: data.documentKind, companyId, branchId, year: data.year,
          prefix: data.prefix ?? `${PREFIJOS[data.documentKind]}${data.year}-`, padding: data.padding ?? 5,
          lastNumber: (data.nextNumber ?? 1) - 1, updatedAt: new Date().toISOString(),
        };
        series.push(s);
        return delay(conSiguiente(s));
      },
      async update(serieId, { nextNumber, ...resto }) {
        const s = find(series, serieId);
        if (nextNumber !== undefined && nextNumber - 1 < s.lastNumber) {
          throw new ApiError(409, 'conflicto', `La numeración no puede ir hacia atrás: el siguiente es el ${s.lastNumber + 1}`);
        }
        touch(s, { ...resto, ...(nextNumber !== undefined ? { lastNumber: nextNumber - 1 } : {}) });
        return delay(conSiguiente(s));
      },
    },
    contributionAccounts: {
      list: (q = {}) =>
        page(
          cuentas.filter(
            (c) =>
              (!q.companyId || c.companyId === q.companyId) &&
              (!q.branchId || c.branchId === q.branchId) &&
              (!q.staffType || c.staffType === q.staffType) &&
              (q.status ? c.status === q.status : true),
          ),
          q,
        ),
      async create(data) {
        const code = comprobarCcc(data.code);
        if (cuentas.some((c) => c.code === code)) throw new ApiError(409, 'conflicto', `Ya existe el CCC ${code}`);
        const c: ContributionAccount = { branchId: null, status: 'active', ...data, code, provinceCode: code.slice(0, 2), id: newId(), ...stamp };
        cuentas.push(c);
        return delay(c);
      },
      async update(cuentaId, data) {
        const c = find(cuentas, cuentaId);
        const code = data.code ? comprobarCcc(data.code) : c.code;
        touch(c, { ...data, code, provinceCode: code.slice(0, 2) });
        return delay(c);
      },
      async remove(cuentaId) {
        cuentas.splice(cuentas.indexOf(find(cuentas, cuentaId)), 1);
        await delay(null);
      },
    },
    billableServices: {
      list: (q = {}) => page(servicios.filter((s) => (!q.status || s.status === q.status) && matches(q.q, s.code, s.name)), q),
      async create(data) {
        if (servicios.some((s) => s.code === data.code)) throw new ApiError(409, 'conflicto', `Ya existe otro con el código ${data.code}`);
        const s: BillableService = { defaultValue: 0, status: 'active', ...data, id: newId(), ...stamp };
        servicios.push(s);
        return delay(s);
      },
      update: async (servicioId, data) => delay(touch(find(servicios, servicioId), data)),
    },
    tenantSettings: {
      get: () => delay(ajustes),
      async update(data) {
        if (data.quoteNoResponseDays !== undefined && !(Number.isInteger(data.quoteNoResponseDays) && data.quoteNoResponseDays >= 1 && data.quoteNoResponseDays <= 365)) {
          throw validacion('quoteNoResponseDays', 'Entre 1 y 365 días');
        }
        return delay(Object.assign(ajustes, data));
      },
    },
    ettSettings: {
      get: () => delay(ettSettings),
      update: async (data) => delay(Object.assign(ettSettings, structuredClone(data))),
    },
  };
}
