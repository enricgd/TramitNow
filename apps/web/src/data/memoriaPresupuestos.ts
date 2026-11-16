// Presupuestos de ejemplo y repositorio en memoria (modo demo). Son los del diseñador (PresupuestosView.jsx), en la
// forma de la API, y se comportan como ella: estados, versiones, obsoleto, aprobación del margen, revisión antes de
// enviar y bloqueo por debajo del convenio. Los costes, con el módulo de cálculo (calculoPresupuestos.ts).
// Todo es ficticio. Sin efectos al cargarse (ver vite.config.ts): los datos se crean la primera vez que se usan.
import { calcularPuesto, calcularTotales } from './calculoPresupuestos';
import { delay, id, newId, page } from './memoriaBase';
import { log } from './memoriaEmpresas';
import type { Repositories } from './repositorios';
import {
  ApiError,
  type AgreementSalary,
  type Quote,
  type QuoteCostConcept,
  type QuoteExtra,
  type QuoteInput,
  type QuotePosition,
  type QuoteReviewItem,
  type QuoteStatus,
  type QuoteSummary,
  type QuoteVersion,
  type TenantSettings,
} from './tipos';

const NORTE = id(20);
const BARCELONA = id(21);
const USUARIOS: Record<string, string> = { [id(250)]: 'Usuario Demo', [id(256)]: 'Elena Navarro', [id(257)]: 'Carlos Mendoza', [id(258)]: 'Laura Vidal' };
const ELENA = id(256);
const CARLOS = id(257);
const LAURA = id(258);
const YO = id(250);

// Convenios (memoria.ts): 60 hostelería, 62 logística de Bizkaia, 63 metal de Madrid. Categorías 600 a 607.
const LOG48 = id(62);
const HOST = id(60);
const METAL = id(63);

/** Tablas salariales de ejemplo (2026) por categoría. */
const TABLAS: Record<string, Omit<AgreementSalary, 'agreementId' | 'agreementVersionId'>> = {
  [id(600)]: { year: 2026, baseAnnualSalary: 17200, monthlyBonus: 120, annualPayments: 14, annualHours: 1784, dailyHours: 8 },
  [id(601)]: { year: 2026, baseAnnualSalary: 19450, monthlyBonus: 180, annualPayments: 14, annualHours: 1784, dailyHours: 8 },
  [id(603)]: { year: 2026, baseAnnualSalary: 17200, monthlyBonus: 120, annualPayments: 14, annualHours: 1784, dailyHours: 8 },
  [id(602)]: { year: 2026, baseAnnualSalary: 16700, monthlyBonus: 110, annualPayments: 14, annualHours: 1784, dailyHours: 8 },
  [id(604)]: { year: 2026, baseAnnualSalary: 16200, monthlyBonus: 90, annualPayments: 14, annualHours: 1792, dailyHours: 8 },
  [id(605)]: { year: 2026, baseAnnualSalary: 15400, monthlyBonus: 80, annualPayments: 14, annualHours: 1792, dailyHours: 8 },
  [id(606)]: { year: 2026, baseAnnualSalary: 18100, monthlyBonus: 110, annualPayments: 14, annualHours: 1792, dailyHours: 8 },
  [id(607)]: { year: 2026, baseAnnualSalary: 21500, monthlyBonus: 150, annualPayments: 14, annualHours: 1752, dailyHours: 8 },
};
const CONVENIO_DE: Record<string, string> = { [id(600)]: LOG48, [id(601)]: LOG48, [id(602)]: LOG48, [id(603)]: LOG48, [id(604)]: HOST, [id(605)]: HOST, [id(606)]: HOST, [id(607)]: METAL };

const costes = (): QuoteCostConcept[] => [
  { id: 'c-ss', name: 'Seguridad Social Patronal (Común + AT/EP 4.10% + Desempleo + FOGASA + FP)', kind: 'percentage', value: 32.85, base: 'total_salary_cost', legal: true, alwaysIncluded: false, description: 'Aportación legal obligatoria a la TGSS según tarifa CNAE Transporte y Almacenamiento.' },
  { id: 'c-indem', name: 'Indemnización Fin de Contrato Puesta a Disposición (12 días/año)', kind: 'percentage', value: 4.54, base: 'total_salary_cost', legal: true, alwaysIncluded: false, description: 'Prorrateo de indemnización legal obligatoria por cese de contrato de puesta a disposición.' },
  { id: 'c-abs', name: 'Provisión de absentismo y contingencias', kind: 'percentage', value: 2.15, base: 'gross_hourly_salary', legal: false, alwaysIncluded: true, description: 'Cobertura estimada de bajas de corta duración y permisos retribuidos según convenio.' },
  { id: 'c-epi', name: 'EPIs', kind: 'per_hour', value: 0.18, base: 'effective_hours', legal: false, alwaysIncluded: true, description: 'Equipos de protección individual que necesite el puesto.' },
  { id: 'c-prl', name: 'Revisión médica inicial y formación PRL', kind: 'per_hour', value: 0.22, base: 'effective_hours', legal: false, alwaysIncluded: true, description: 'Acreditación según Art. 19 LPRL y vigilancia médica para trabajo en altura y almacén.' },
];

const extra = (xid: string, name: string, salaryCoefficient: number, showInProposal = true): QuoteExtra => ({
  id: xid, name, salaryCoefficient, salaryOverride: null, rateCoefficient: null, rateSurchargePercent: null, rateOverride: null, showInProposal, custom: false,
});
const extras = (): QuoteExtra[] => [
  extra('extra', 'Hora extra', 1.5),
  extra('nocturna', 'Hora nocturna', 1.25),
  extra('finde', 'Hora de fin de semana', 1.5),
  extra('festiva', 'Hora festiva', 1.75),
];

type Puesto = Partial<QuotePosition> & Pick<QuotePosition, 'name' | 'baseAnnualSalary' | 'monthlyBonus' | 'rate' | 'people'>;
function puesto(n: number, categoria: string | null, datos: Puesto): QuotePosition {
  const tabla = categoria ? TABLAS[categoria] : undefined;
  return {
    id: `pos-${n}`, agreementId: categoria ? CONVENIO_DE[categoria] : null, agreementVersionId: null, customAgreement: null,
    categoryId: categoria, customCategory: null, level: null, customLevel: null, annualPayments: 14, annualHours: tabla?.annualHours ?? 1784,
    dailyHours: 8, partTimeFactor: 1, vacationDays: 30, manualFields: [],
    agreementMinimumAnnual: tabla ? tabla.baseAnnualSalary + tabla.monthlyBonus * 12 : null,
    hoursPerPerson: 480, marginMode: null, marginPercent: null, marginAmount: null, costs: [], extras: extras(), tasks: null, ...datos,
  };
}

type Semilla = Partial<Quote> & Pick<Quote, 'code' | 'title' | 'status' | 'clientId' | 'salesUserId' | 'validUntil' | 'positions'> & { enviadoHaceDias?: number };

const CLIENTES: Record<string, Pick<Quote, 'clientName' | 'clientTaxId' | 'clientSector' | 'clientCity' | 'clientAgreementId' | 'branchId' | 'contactId' | 'contactName' | 'contactEmail' | 'contactPhone'>> = {
  [id(100)]: { clientName: 'Trans-Logística Ibérica Norte, S.L.', clientTaxId: 'B00000101', clientSector: 'Logística y almacén', clientCity: 'Basauri (Bizkaia)', clientAgreementId: LOG48, branchId: NORTE, contactId: id(120), contactName: 'Marta Gómez Arana (Responsable de RRHH y Selección)', contactEmail: 'marta.gomez@translog-norte.example', contactPhone: '+34 600 000 120' },
  [id(101)]: { clientName: 'Manufacturas Metálicas del Henares, S.A.', clientTaxId: 'A00000102', clientSector: 'Industria metalúrgica', clientCity: 'Alcalá de Henares (Madrid)', clientAgreementId: METAL, branchId: NORTE, contactId: id(122), contactName: 'Alfonso Serrano (Dir. Financiero)', contactEmail: 'aserrano@metalhenares.example', contactPhone: '+34 600 000 122' },
  [id(102)]: { clientName: 'Mediterránea Agrícola y Envasado, S.L.', clientTaxId: 'B00000103', clientSector: 'Agroalimentario', clientCity: 'Valencia', clientAgreementId: null, branchId: BARCELONA, contactId: null, contactName: null, contactEmail: null, contactPhone: null },
  [id(103)]: { clientName: 'Hostelería & Eventos Premium BCN, S.L.', clientTaxId: 'B00000104', clientSector: 'Hostelería y eventos', clientCity: 'Barcelona', clientAgreementId: HOST, branchId: BARCELONA, contactId: id(123), contactName: 'Sergi Pujol (Coordinador de Eventos)', contactEmail: 'spujol@premiumeventsbcn.example', contactPhone: '+34 600 000 123' },
};

const operario = (n = 1, rate = 17.65, people = 8) =>
  puesto(n, id(600), { name: 'Operario/a de Almacén', baseAnnualSalary: 17200, monthlyBonus: 120, rate, people, tasks: 'Recepción, control de bultos, picking por radiofrecuencia, preparación de pedidos e inventario rotativo.' });
const carretillero = (n = 2, rate = 19.8, people = 4) =>
  puesto(n, id(601), {
    name: 'Mozo/a Especialista — Carretillero/a Frontal/Retráctil', baseAnnualSalary: 19450, monthlyBonus: 180, rate, people,
    costs: [{ conceptId: 'c-abs', applies: true, percent: 3.2, amount: null }],
    extras: extras().map((x) => ({ ...x, showInProposal: x.id !== 'festiva' })),
    tasks: 'Ubicación en altura en estanterías dinámicas (hasta 9m), descarga de trailers y abastecimiento de líneas.',
  });
const envasado = (n: number, name: string, base: number, bonus: number, rate: number, people: number, tasks: string) =>
  puesto(n, null, { name, customAgreement: 'Convenio comercio y almacenistas alimentación', customCategory: name, baseAnnualSalary: base, monthlyBonus: bonus, rate, people, tasks });

function semillas(): Semilla[] {
  return [
    {
      code: 'PRE-2026-0048', versionNumber: 2, title: 'Servicio ETT campaña logística primavera y refuerzo HUB central', status: 'draft',
      clientId: id(100), salesUserId: ELENA, issueDate: '2026-10-27', validUntil: '2026-11-27', plannedStartDate: '2026-12-01', durationMonths: 3,
      modality: 'pico_produccion', paymentMethodId: id(301), replacementGuarantee: 'garantia_4h',
      commercialNotes: 'Se contempla cláusula de absorción por plantilla cliente sin coste de traspaso tras superar las 900 horas efectivas de CPD. La ETT asume la gestión documental completa en CAE y portal de PRL.',
      positions: [operario(), carretillero()],
    },
    {
      code: 'PRE-2026-0047', title: 'Refuerzo líneas de envasado y picking alimentario', status: 'in_preparation', clientId: id(102), salesUserId: CARLOS, validUntil: '2026-11-02',
      positions: [
        envasado(1, 'Operario/a de envasado', 16300, 60, 16.4, 6, 'Envasado y etiquetado en línea.'),
        envasado(2, 'Preparador/a de pedidos', 16500, 60, 16.9, 4, 'Picking de producto fresco.'),
        envasado(3, 'Carretillero/a', 18900, 90, 18.6, 2, 'Carga de camiones y ubicación en cámara.'),
      ],
    },
    {
      code: 'PRE-2026-0046', title: 'Camareros/as para temporada de congresos', status: 'pending_signature', enviadoHaceDias: 2, clientId: id(103), salesUserId: LAURA, validUntil: '2026-11-10',
      positions: [
        puesto(1, id(604), { name: 'Camarero/a de sala', baseAnnualSalary: 16200, monthlyBonus: 90, rate: 17.4, people: 8, tasks: 'Servicio de sala en congresos.' }),
        puesto(2, id(604), { name: 'Camarero/a de barra', baseAnnualSalary: 16200, monthlyBonus: 90, rate: 17.4, people: 4, tasks: 'Servicio de barra.' }),
      ],
    },
    {
      code: 'PRE-2026-0045', title: 'Operarios/as soldadura y mecanizado metal 24/7', status: 'sent', enviadoHaceDias: 6, clientId: id(101), salesUserId: ELENA, validUntil: '2026-11-15',
      positions: [puesto(1, id(607), { name: 'Soldador/a TIG/MIG', baseAnnualSalary: 21500, monthlyBonus: 150, rate: 22.4, people: 6, tasks: 'Soldadura homologada en turnos rotativos 24/7.' })],
    },
    {
      code: 'PRE-2026-0042', title: 'Campaña logística otoño HUB central', status: 'accepted', clientId: id(100), salesUserId: ELENA, issueDate: '2026-09-20', validUntil: '2026-10-20',
      plannedStartDate: '2026-11-03', durationMonths: 3, modality: 'pico_produccion', commercialNotes: 'Campaña de otoño. Turnos de mañana y tarde en el HUB central de Basauri.',
      positions: [operario(), carretillero()],
      requests: [
        { code: 'PET-2026-0048', positionId: 'pos-1', shift: 'Turno de mañana', places: 5 },
        { code: 'PET-2026-0049', positionId: 'pos-1', shift: 'Turno de tarde', places: 3 },
        { code: 'PET-2026-0050', positionId: 'pos-2', shift: 'Turno de tarde', places: 4 },
      ],
    },
    {
      code: 'PRE-2026-0041', title: 'Servicio ETT camareros/as y cocina fiestas locales', status: 'accepted', clientId: id(103), salesUserId: LAURA, issueDate: '2026-09-15', validUntil: '2026-10-15',
      plannedStartDate: '2026-10-10', durationMonths: 2, modality: 'pico_produccion', commercialNotes: 'Temporada de congresos y fiestas locales en el recinto de congresos de Barcelona.',
      positions: [
        puesto(1, id(604), { name: 'Camarero/a de sala', baseAnnualSalary: 16200, monthlyBonus: 90, rate: 18.4, people: 10, tasks: 'Servicio de sala, montaje de mesas y servicio de cócteles y banquetes.' }),
        puesto(2, id(605), { name: 'Ayudante de cocina', baseAnnualSalary: 15400, monthlyBonus: 80, rate: 17.2, people: 4, tasks: 'Preparación, emplatado y limpieza de cocina.' }),
        puesto(3, id(606), { name: 'Cocinero/a de partida', baseAnnualSalary: 18100, monthlyBonus: 110, rate: 19.6, people: 2, tasks: 'Elaboración de la partida asignada en banquetes.' }),
        puesto(4, id(604), { name: 'Camarero/a de barra', baseAnnualSalary: 16200, monthlyBonus: 90, rate: 18.4, people: 3, tasks: 'Servicio de barra en el turno de noche.' }),
      ],
      requests: [
        { code: 'PET-2026-0044', positionId: 'pos-1', shift: 'Jornada partida', places: 10 },
        { code: 'PET-2026-0045', positionId: 'pos-2', shift: 'Jornada partida', places: 4 },
        { code: 'PET-2026-0046', positionId: 'pos-3', shift: 'Jornada partida', places: 2 },
        { code: 'PET-2026-0047', positionId: 'pos-4', shift: 'Turno de noche', places: 3 },
      ],
    },
    {
      code: 'PRE-2026-0038', title: 'Mozos de carga para inventario anual', status: 'rejected', clientId: id(100), salesUserId: CARLOS, validUntil: '2026-10-01',
      rejection: { reasonId: null, reason: 'Precio', notes: 'Han elegido otra ETT con una tarifa más baja.', at: '2026-09-25T10:00:00.000Z' },
      positions: [puesto(1, id(600), { name: 'Mozo/a de carga', baseAnnualSalary: 17200, monthlyBonus: 120, rate: 16.2, people: 5, tasks: 'Recuento e inventario anual.' })],
    },
    {
      code: 'PRE-2026-0033', versionNumber: 2, title: 'Envasado nocturno campaña de cítricos', status: 'accepted', clientId: id(102), salesUserId: CARLOS, issueDate: '2026-08-20',
      validUntil: '2026-09-05', plannedStartDate: '2026-09-15', durationMonths: 3,
      commercialNotes: 'El cliente aplazó la campaña después de aceptar: la petición PET-2026-0036 está cancelada.',
      positions: [envasado(1, 'Operario/a de envasado', 16300, 60, 16.4, 5, 'Envasado y etiquetado en línea, turno de noche.')],
      requests: [{ code: 'PET-2026-0036', positionId: 'pos-1', shift: 'Turno de noche', places: 5 }],
    },
    {
      code: 'PRE-2026-0029', title: 'Campaña logística verano HUB central', status: 'accepted', clientId: id(100), salesUserId: ELENA, issueDate: '2026-06-01', validUntil: '2026-06-20',
      plannedStartDate: '2026-07-01', durationMonths: 3, commercialNotes: 'Campaña de verano, ya terminada.',
      positions: [puesto(1, id(602), { name: 'Mozo/a de almacén', baseAnnualSalary: 16700, monthlyBonus: 110, rate: 16.9, people: 6, tasks: 'Carga, descarga y reposición en la nave 2.' })],
      requests: [{ code: 'PET-2026-0031', positionId: 'pos-1', shift: 'Turno de mañana', places: 6 }],
    },
  ];
}

// ---------------------------------------------------------------------------
// Estado en memoria (se crea al primer uso)
// ---------------------------------------------------------------------------

type Guardado = Omit<Quote, 'breakdowns' | 'totals' | 'daysWithoutResponse'>;
type Registro = { actual: Guardado; anteriores: (Guardado & { comment: string | null; createdBy: string | null })[] };
let estado: { registros: Registro[]; siguiente: number } | undefined;

const hoyISO = () => new Date().toISOString().slice(0, 10);
const haceDias = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const copia = <T>(x: T): T => structuredClone(x);

function base(s: Semilla): Guardado {
  const { enviadoHaceDias, ...q } = s;
  return {
    id: newId(), versionId: newId(), versionNumber: 1, branchId: null, contactId: null, contactName: null, contactEmail: null, contactPhone: null,
    clientName: null, clientTaxId: null, clientSector: null, clientCity: null, clientAgreementId: null,
    salesName: USUARIOS[q.salesUserId ?? ''] ?? null, issueDate: '2026-10-27', plannedStartDate: null, durationMonths: null, currency: 'EUR',
    modality: null, vatRate: '21', paymentMethodId: null, paymentMethodText: null, replacementGuarantee: null, commercialNotes: null,
    marginMode: 'percentage', marginPercent: 18, marginAmount: null, costConcepts: costes(), defaultExtras: extras(),
    approval: null, rejection: null, obsolete: null, createdFromId: null, createdFromCode: null,
    sentAt: enviadoHaceDias !== undefined ? haceDias(enviadoHaceDias) : ['accepted', 'rejected'].includes(q.status) ? '2026-09-01T10:00:00.000Z' : null,
    requests: [], createdAt: '2026-10-01T09:00:00.000Z', updatedAt: '2026-10-27T10:00:00.000Z',
    ...(q.clientId ? CLIENTES[q.clientId] : {}),
    ...q,
  };
}

function datos() {
  if (!estado) {
    const registros = semillas().map((s) => ({ actual: base(s), anteriores: [] as Registro['anteriores'] }));
    // PRE-2026-0048 v1: otras tarifas y un carretillero menos.
    const r48 = registros[0];
    r48.anteriores.push({
      ...copia(r48.actual), versionId: newId(), versionNumber: 1, status: 'sent', validUntil: '2026-11-10', positions: [operario(1, 17.2), carretillero(2, 20.4, 3)],
      comment: 'Primera propuesta enviada; el cliente pidió ajustar la tarifa del carretillero.', createdBy: 'Elena Navarro', createdAt: '2026-03-10T10:00:00.000Z',
    });
    estado = { registros, siguiente: 49 };
  }
  return estado;
}

function registro(quoteId: string): Registro {
  const r = datos().registros.find((x) => x.actual.id === quoteId);
  if (!r) throw new ApiError(404, 'no_encontrado', 'El presupuesto no existe o no tienes acceso');
  return r;
}

let ajustesDe: () => Promise<TenantSettings> = async () => ({ quoteMinMarginPercent: null, quoteNoResponseDays: 15 });

const margenDe = (q: Pick<Quote, 'marginMode' | 'marginPercent' | 'marginAmount'>) =>
  q.marginMode === 'amount' ? { mode: 'amount' as const, value: q.marginAmount ?? 0 } : { mode: 'percentage' as const, value: q.marginPercent };

/** Lo que devuelve la API: con el desglose de cada puesto, los totales y los días sin respuesta. */
function completo(q: Guardado): Quote {
  const breakdowns = Object.fromEntries(q.positions.map((p) => [p.id, calcularPuesto(p, q.costConcepts, margenDe(q))]));
  const esperando = q.sentAt && (q.status === 'sent' || q.status === 'pending_signature');
  return {
    ...copia(q),
    breakdowns,
    totals: calcularTotales(Object.values(breakdowns)),
    daysWithoutResponse: esperando ? Math.floor((Date.now() - new Date(q.sentAt!).getTime()) / 86_400_000) : null,
  };
}

function resumen(q: Quote): QuoteSummary {
  return {
    id: q.id, code: q.code, versionNumber: q.versionNumber, status: q.status, title: q.title, clientId: q.clientId, clientName: q.clientName,
    salesUserId: q.salesUserId, salesName: q.salesName, branchId: q.branchId, validUntil: q.validUntil, daysWithoutResponse: q.daysWithoutResponse,
    rejection: q.rejection, updatedAt: q.updatedAt, positions: q.positions.length, billing: q.totals.billing, averageRate: q.totals.averageRate,
    marginPercent: q.totals.averageMarginPercent, requests: q.requests.length,
  };
}

const EDITABLES: QuoteStatus[] = ['draft', 'in_preparation'];
const ESTADO_TEXTO: Record<QuoteStatus, string> = {
  draft: 'Borrador', in_preparation: 'En preparación', sent: 'Enviado', pending_signature: 'Pendiente de firma', accepted: 'Aceptado', rejected: 'Rechazado', obsolete: 'Obsoleto',
};
function cambiar(r: Registro, cambios: Partial<Guardado>, resumenActividad: string) {
  Object.assign(r.actual, cambios, { updatedAt: new Date().toISOString() });
  log('quote', r.actual.id, null, 'update', resumenActividad);
  return delay(completo(r.actual));
}

async function revisar(q: Quote): Promise<QuoteReviewItem[]> {
  const { quoteMinMarginPercent: minimo } = await ajustesDe();
  const b = q.positions.map((p) => q.breakdowns[p.id]);
  const nombres = (f: (i: number) => boolean) => q.positions.filter((_, i) => f(i)).map((p) => p.name);
  const bajoConvenio = nombres((i) => !!b[i].belowAgreement);
  const bajoCoste = nombres((i) => b[i].rate > 0 && b[i].marginHour < 0);
  const bajoMinimo = minimo === null ? [] : nombres((i) => b[i].marginHour >= 0 && b[i].marginPercent < minimo);
  const aprobado = q.approval?.status === 'approved';
  return [
    { ok: !!q.clientId, kind: 'error', text: 'Empresa elegida', section: 'client' },
    { ok: !!q.contactName && !!q.contactEmail, kind: 'error', text: 'Contacto con email para enviar la propuesta', section: 'client' },
    { ok: !!q.salesUserId, kind: 'error', text: 'Comercial responsable', section: 'client' },
    { ok: !!q.validUntil && q.validUntil >= hoyISO(), kind: 'error', text: 'Fecha de validez futura', section: 'client' },
    { ok: q.positions.length > 0, kind: 'error', text: 'Al menos un puesto', section: 'positions' },
    { ok: q.positions.every((p) => (p.rate ?? 0) > 0), kind: 'error', text: 'Todos los puestos tienen tarifa', section: 'positions' },
    {
      ok: bajoConvenio.length === 0, kind: 'error', section: 'positions', positions: bajoConvenio,
      text: bajoConvenio.length ? `Salario por debajo del convenio: ${bajoConvenio.join(', ')}. No se puede pagar menos que el convenio de la empresa usuaria (art. 11 de la Ley 14/1994).` : 'Ningún salario por debajo del convenio',
    },
    { ok: bajoCoste.length === 0, kind: 'error', section: 'positions', positions: bajoCoste, text: bajoCoste.length ? `Tarifa por debajo del coste: ${bajoCoste.join(', ')}` : 'Ninguna tarifa por debajo del coste' },
    {
      ok: bajoMinimo.length === 0 || aprobado, kind: 'approval', section: 'positions', positions: bajoMinimo,
      text: minimo === null
        ? 'Sin margen mínimo en esta ETT'
        : bajoMinimo.length
          ? `Margen por debajo del ${minimo} %: ${bajoMinimo.join(', ')}${aprobado ? ' (aprobado por un responsable)' : ''}`
          : `Margen de todos los puestos ≥ ${minimo} %`,
    },
  ];
}

function nuevoCodigo() {
  const e = datos();
  return `PRE-${new Date().getFullYear()}-${String(e.siguiente++).padStart(4, '0')}`;
}

function crearDesde(datosNuevos: Partial<Guardado>): Guardado {
  const ahora = new Date().toISOString();
  const q: Guardado = {
    // Validez por defecto: 30 días.
    ...base({ code: nuevoCodigo(), title: '', status: 'draft', clientId: null, salesUserId: null, validUntil: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10), positions: [] }),
    issueDate: hoyISO(), createdAt: ahora, updatedAt: ahora, ...datosNuevos,
  };
  if (q.clientId && CLIENTES[q.clientId]) Object.assign(q, { ...CLIENTES[q.clientId], ...pick(datosNuevos, ['contactId', 'contactName', 'contactEmail', 'contactPhone']) });
  q.salesName = q.salesUserId ? (USUARIOS[q.salesUserId] ?? null) : null;
  datos().registros.unshift({ actual: q, anteriores: [] });
  log('quote', q.id, null, 'create', `Presupuesto ${q.code} creado`);
  return q;
}
const pick = <T extends object>(o: T, keys: (keyof T)[]) => Object.fromEntries(keys.filter((k) => k in o).map((k) => [k, o[k]])) as Partial<T>;

/** Lo que se copia al duplicar o al crear uno nuevo desde un obsoleto. */
const COPIABLES: (keyof QuoteInput)[] = [
  'title', 'plannedStartDate', 'durationMonths', 'currency', 'modality', 'vatRate', 'paymentMethodId', 'paymentMethodText', 'replacementGuarantee',
  'commercialNotes', 'marginMode', 'marginPercent', 'marginAmount', 'costConcepts', 'defaultExtras', 'positions',
];

export function memoryQuoteRepositories(ajustes: () => Promise<TenantSettings>): Pick<Repositories, 'quotes'> {
  ajustesDe = ajustes;
  return {
    quotes: {
      async list(q = {}) {
        const hoy = hoyISO();
        const pronto = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
        const texto = q.q?.toLowerCase().trim();
        const lista = datos()
          .registros.map((r) => completo(r.actual))
          .filter(
            (x) =>
              (!texto || `${x.code} ${x.clientName ?? ''} ${x.title}`.toLowerCase().includes(texto)) &&
              (!q.status || x.status === q.status) &&
              (!q.salesUserId || x.salesUserId === q.salesUserId) &&
              (!q.branchId || x.branchId === q.branchId) &&
              (!q.validity ||
                (q.validity === 'expired' ? x.validUntil < hoy : q.validity === 'soon' ? x.validUntil >= hoy && x.validUntil <= pronto : x.validUntil >= hoy)),
          )
          .map(resumen);
        return page(lista, q);
      },
      get: async (quoteId) => delay(completo(registro(quoteId).actual)),
      async create(data) {
        return delay(completo(crearDesde(copia(data))), 300);
      },
      async update(quoteId, data) {
        const r = registro(quoteId);
        if (!EDITABLES.includes(r.actual.status)) throw new ApiError(409, 'conflicto', 'Este presupuesto ya se ha enviado: crea una versión nueva para cambiarlo');
        const cambios: Partial<Guardado> = copia(data);
        if (data.clientId && data.clientId !== r.actual.clientId && CLIENTES[data.clientId]) Object.assign(cambios, { ...CLIENTES[data.clientId], ...pick(data, ['contactId', 'contactName', 'contactEmail', 'contactPhone']) });
        if (data.salesUserId !== undefined) cambios.salesName = data.salesUserId ? (USUARIOS[data.salesUserId] ?? null) : null;
        // Un cambio en lo económico anula la aprobación del margen.
        if (data.positions || data.costConcepts || data.marginPercent !== undefined || data.marginAmount !== undefined) cambios.approval = null;
        return cambiar(r, cambios, 'Presupuesto modificado');
      },
      async setStatus(quoteId, status) {
        const r = registro(quoteId);
        const desde = r.actual.status;
        const permitido = (EDITABLES.includes(desde) && EDITABLES.includes(status)) || (['sent', 'pending_signature'].includes(desde) && ['sent', 'pending_signature'].includes(status));
        if (!permitido) throw new ApiError(409, 'conflicto', status === 'sent' ? 'Para enviarlo, usa «Enviar al cliente»: antes se revisa' : 'Ese cambio de estado no se puede hacer');
        return cambiar(r, { status }, `Pasa a «${ESTADO_TEXTO[status]}»`);
      },
      review: async (quoteId) => delay(await revisar(completo(registro(quoteId).actual))),
      async send(quoteId) {
        const r = registro(quoteId);
        if (!EDITABLES.includes(r.actual.status)) throw new ApiError(409, 'conflicto', 'Solo se envía un presupuesto en borrador o en preparación');
        const fallos = (await revisar(completo(r.actual))).filter((i) => !i.ok);
        if (fallos.length) throw new ApiError(422, 'revision_pendiente', 'El presupuesto no se puede enviar todavía', fallos.map((i) => ({ path: i.section, message: i.text })));
        return cambiar(r, { status: 'sent', sentAt: new Date().toISOString() }, `Enviado a ${r.actual.contactEmail}`);
      },
      async requestApproval(quoteId, reason) {
        const r = registro(quoteId);
        return cambiar(r, { approval: { status: 'pending', reason, requestedBy: USUARIOS[YO], requestedAt: new Date().toISOString(), resolvedBy: null, resolvedAt: null } }, 'Aprobación del margen pedida');
      },
      async resolveApproval(quoteId, approved) {
        const r = registro(quoteId);
        if (r.actual.approval?.status !== 'pending') throw new ApiError(409, 'conflicto', 'No hay ninguna aprobación pendiente');
        return cambiar(
          r,
          { approval: { ...r.actual.approval, status: approved ? 'approved' : 'changes_requested', resolvedBy: USUARIOS[YO], resolvedAt: new Date().toISOString() } },
          approved ? 'Margen aprobado' : 'Se piden cambios en el margen',
        );
      },
      async accept(quoteId) {
        const r = registro(quoteId);
        if (!['sent', 'pending_signature'].includes(r.actual.status)) throw new ApiError(409, 'conflicto', 'Solo se acepta un presupuesto enviado');
        return cambiar(r, { status: 'accepted' }, 'Aceptado por el cliente');
      },
      async reject(quoteId, data) {
        const r = registro(quoteId);
        if (!['sent', 'pending_signature'].includes(r.actual.status)) throw new ApiError(409, 'conflicto', 'Solo se rechaza un presupuesto enviado');
        return cambiar(r, { status: 'rejected', rejection: { ...data, at: new Date().toISOString() } }, `Rechazado: ${data.reason}`);
      },
      async newVersion(quoteId) {
        const r = registro(quoteId);
        if (r.actual.status === 'obsolete') throw new ApiError(409, 'conflicto', 'Un presupuesto obsoleto ya no cambia');
        r.anteriores.unshift({ ...copia(r.actual), comment: 'Sustituida por una versión nueva.', createdBy: USUARIOS[YO] });
        return cambiar(
          r,
          { versionId: newId(), versionNumber: r.actual.versionNumber + 1, status: 'draft', approval: null, rejection: null, sentAt: null, requests: [] },
          `Versión ${r.actual.versionNumber + 1} creada`,
        );
      },
      async versions(quoteId) {
        const r = registro(quoteId);
        const v = (q: Guardado, status: QuoteVersion['status'], comment: string | null, createdBy: string | null): QuoteVersion => ({
          id: q.versionId, number: q.versionNumber, status, createdAt: q.createdAt, createdBy, comment, totals: completo(q).totals,
        });
        return delay([v(r.actual, 'current', null, r.actual.salesName), ...r.anteriores.map((a) => v(a, 'superseded', a.comment, a.createdBy))]);
      },
      async version(quoteId, versionId) {
        const r = registro(quoteId);
        const q = r.actual.versionId === versionId ? r.actual : r.anteriores.find((a) => a.versionId === versionId);
        if (!q) throw new ApiError(404, 'no_encontrado', 'Esa versión no existe');
        return delay(completo(q));
      },
      async makeObsolete(quoteId, reason) {
        const r = registro(quoteId);
        if (r.actual.status === 'obsolete') throw new ApiError(409, 'conflicto', 'Ya está obsoleto');
        const nuevo = crearDesde({
          ...copia(pick(r.actual, [...COPIABLES, 'clientId', 'contactId', 'contactName', 'contactEmail', 'contactPhone', 'salesUserId'])),
          createdFromId: r.actual.id, createdFromCode: r.actual.code,
        });
        const obsoleto = await cambiar(r, { status: 'obsolete', obsolete: { reason, at: new Date().toISOString(), replacedById: nuevo.id, replacedByCode: nuevo.code } }, `Pasa a obsoleto: ${reason}`);
        return { obsolete: obsoleto, created: completo(nuevo) };
      },
      async duplicate(quoteId) {
        const r = registro(quoteId);
        return delay(completo(crearDesde({ ...copia(pick(r.actual, COPIABLES)), title: `${r.actual.title} (copia)` })));
      },
      documentUrl: async () => delay(null),
      async agreementSalary(q) {
        const t = q.categoryId ? TABLAS[q.categoryId] : undefined;
        return delay(t && CONVENIO_DE[q.categoryId!] === q.agreementId ? { ...t, agreementId: q.agreementId, agreementVersionId: null } : null);
      },
    },
  };
}
