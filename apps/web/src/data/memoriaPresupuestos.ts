// Presupuestos de ejemplo y repositorios en memoria (modo demo). Son los del diseñador (PresupuestosView.jsx), en la
// forma del contrato de la fase 4 (fase4-backend.md), y se comportan como la API: versiones, estados, obsoleto,
// aprobación del margen, revisión al enviar y bloqueo por debajo del convenio. El cálculo es el módulo puro de la API.
// Todo es ficticio. Sin efectos al cargarse (ver vite.config.ts): los datos se crean la primera vez que se usan.
import { DEFAULT_SS_RATES, atEpForCnae, calculateQuote } from './calculoPresupuestos';
import { delay, id, newId, page } from './memoriaBase';
import { log } from './memoriaEmpresas';
import type { Repositories } from './repositorios';
import {
  ApiError,
  type Quote,
  type QuoteCostConcept,
  type QuoteExtra,
  type QuotePosition,
  type QuotePositionInput,
  type QuoteReview,
  type QuoteStatus,
  type QuoteSummary,
  type QuoteVersion,
  type TenantSettings,
} from './tipos';

const NORTE = id(20);
const BARCELONA = id(21);
const EG = id(10);
const ELENA = id(256);
const CARLOS = id(257);
const LAURA = id(258);
const YO = { id: id(250), name: 'Usuario Demo' };
const NOMBRES: Record<string, string> = { [YO.id]: YO.name, [ELENA]: 'Elena Navarro', [CARLOS]: 'Carlos Mendoza', [LAURA]: 'Laura Vidal' };

// Convenios de la ETT (memoria.ts): 60 hostelería, 62 logística de Bizkaia, 63 metal de Madrid.
// Categorías de sus tablas (memoria.ts, 600 a 607) con su salario de 2026.
const LOG48 = id(62);
const HOST = id(60);
const METAL = id(63);
const CONVENIOS: Record<string, string> = {
  [LOG48]: 'Convenio de logística de Bizkaia (ejemplo)',
  [HOST]: 'Convenio de hostelería de Cataluña (ejemplo)',
  [METAL]: 'Convenio del metal de Madrid (ejemplo)',
};
type Tabla = { agreement: string; code: string; name: string; level: string; base: number; bonus: number; hours: number };
const TABLAS: Record<string, Tabla> = {
  [id(600)]: { agreement: LOG48, code: 'OPALM', name: 'Operario/a de almacén', level: 'IV', base: 17200, bonus: 120, hours: 1784 },
  [id(601)]: { agreement: LOG48, code: 'MOZESP', name: 'Mozo/a especialista - carretillero/a', level: 'III', base: 19450, bonus: 180, hours: 1784 },
  [id(602)]: { agreement: LOG48, code: 'MOZALM', name: 'Mozo/a de almacén', level: 'IV', base: 16700, bonus: 110, hours: 1784 },
  [id(603)]: { agreement: LOG48, code: 'PREPED', name: 'Preparador/a de pedidos (picking)', level: 'IV', base: 17200, bonus: 120, hours: 1784 },
  [id(604)]: { agreement: HOST, code: 'CAMSAL', name: 'Camarero/a de sala', level: 'II', base: 16200, bonus: 90, hours: 1792 },
  [id(605)]: { agreement: HOST, code: 'AYCOC', name: 'Ayudante de cocina', level: 'III', base: 15400, bonus: 80, hours: 1792 },
  [id(606)]: { agreement: HOST, code: 'COCPAR', name: 'Cocinero/a de partida', level: 'I', base: 18100, bonus: 110, hours: 1792 },
  [id(607)]: { agreement: METAL, code: 'SOLD', name: 'Soldador/a homologado TIG/MIG', level: 'Oficial 1ª', base: 21500, bonus: 150, hours: 1752 },
};
const minimoHora = (t: Tabla) => Math.round(((t.base + t.bonus * 12) / t.hours) * 10000) / 10000;

/** Datos de cada empresa de ejemplo (memoriaEmpresas.ts) que el presupuesto necesita. */
type Empresa = { name: string; taxId: string; branchId: string; cnae: string; agreement: string | null; contact: { id: string; name: string; email: string } | null };
const EMPRESAS: Record<string, Empresa> = {
  [id(100)]: { name: 'Trans-Logística Ibérica Norte, S.L.', taxId: 'B00000101', branchId: NORTE, cnae: '52', agreement: LOG48, contact: { id: id(120), name: 'Marta Gómez Arana', email: 'marta.gomez@translog-norte.example' } },
  [id(101)]: { name: 'Manufacturas Metálicas del Henares, S.A.', taxId: 'A00000102', branchId: NORTE, cnae: '25', agreement: METAL, contact: { id: id(122), name: 'Alfonso Serrano', email: 'aserrano@metalhenares.example' } },
  [id(102)]: { name: 'Mediterránea Agrícola y Envasado, S.L.', taxId: 'B00000103', branchId: BARCELONA, cnae: '10', agreement: null, contact: null },
  [id(103)]: { name: 'Hostelería & Eventos Premium BCN, S.L.', taxId: 'B00000104', branchId: BARCELONA, cnae: '56', agreement: HOST, contact: { id: id(123), name: 'Sergi Pujol', email: 'spujol@premiumeventsbcn.example' } },
};
/** Contactos de ejemplo (memoriaEmpresas.ts), para el destinatario de la versión. */
const CONTACTOS: Record<string, { name: string; email: string; position: string; phone: string }> = Object.fromEntries(
  [
    [id(120), 'Marta Gómez Arana', 'marta.gomez@translog-norte.example', 'Responsable de RRHH y Selección', '+34 600 000 120'],
    [id(121), 'Javier Ugarte Elorza', 'j.ugarte@translog-norte.example', 'Jefe de Planta / Operaciones', '+34 600 000 121'],
    [id(122), 'Alfonso Serrano', 'aserrano@metalhenares.example', 'Dir. Financiero', '+34 600 000 122'],
    [id(123), 'Sergi Pujol', 'spujol@premiumeventsbcn.example', 'Coordinador de Eventos', '+34 600 000 123'],
    [id(124), 'Montse Ferrer', 'mferrer@premiumeventsbcn.example', 'Jefa de sala', '+34 600 000 124'],
  ].map(([k, name, email, position, phone]) => [k, { name, email, position, phone }]),
);
const FORMAS_PAGO: Record<string, string> = Object.fromEntries(
  ['Transferencia a 30 días', 'Transferencia a 60 días', 'Recibo SEPA a 30 días', 'Recibo SEPA a 60 días', 'Confirming a 90 días', 'Al contado'].map((n, i) => [id(300 + i), n]),
);

/** Motivos de rechazo de la tabla maestra (memoriaEmpresas.ts, ids 700 en adelante; los siembra la migración). */
export const MOTIVOS_RECHAZO = ['Precio', 'Plazo de incorporación', 'Eligió a la competencia', 'Cancela el proyecto', 'Sin respuesta del cliente'];

const costes = (): QuoteCostConcept[] => [
  { code: 'absenteeism', name: 'Provisión de absentismo y contingencias', mode: 'percent', value: 2.15, required: true, description: 'Cobertura estimada de bajas de corta duración y permisos retribuidos según convenio.' },
  { code: 'ppe', name: 'EPIs', mode: 'per_hour', value: 0.18, required: true, description: 'Equipos de protección individual que necesite el puesto.' },
  { code: 'medical', name: 'Revisión médica inicial y formación PRL', mode: 'per_hour', value: 0.22, required: true, description: 'Acreditación según Art. 19 LPRL y vigilancia médica.' },
];
const extra = (code: string, name: string, salaryCoefficient: number, print = true): QuoteExtra => ({
  code, name, salaryCoefficient, salaryPerHour: null, salarySupplementPerHour: null, rateSurchargePercent: null, ratePerHour: null, print, custom: false,
});
const extras = (): QuoteExtra[] => [extra('extra', 'Hora extra', 1.5), extra('nocturna', 'Hora nocturna', 1.25), extra('finde', 'Hora de fin de semana', 1.5), extra('festiva', 'Hora festiva', 1.75)];

type Puesto = Partial<QuotePosition> & Pick<QuotePosition, 'name' | 'hourlyRate' | 'people'>;
function puesto(n: number, categoria: string | null, datos: Puesto): QuotePosition {
  const t = categoria ? TABLAS[categoria] : undefined;
  return {
    id: `pos-${n}`, sortOrder: n, description: null, collectiveAgreementId: t?.agreement ?? null, collectiveAgreementName: t ? CONVENIOS[t.agreement] : null,
    agreementCategoryId: categoria, agreementCategoryName: t?.name ?? null, customCategoryName: null, level: t?.level ?? null, agreementVersionId: null, agreementPeriod: t ? { from: '2026-01-01', to: '2026-12-31' } : null,
    agreementMinimumSalaryHour: t ? minimoHora(t) : null, annualBaseSalary: t?.base ?? 0, monthlyBonus: t?.bonus ?? 0, annualPayments: 14,
    annualHours: t?.hours ?? 1784, hoursPerDay: 8, vacationDays: 30, vacationDaysType: 'naturales', manualFields: [], hoursPerPerson: 480,
    margin: null, costs: [], extras: extras(), calculation: null, ...datos,
  };
}

const operario = (n = 1, hourlyRate = 17.65, people = 8) =>
  puesto(n, id(600), { name: 'Operario/a de Almacén', hourlyRate, people, description: 'Recepción, control de bultos, picking por radiofrecuencia, preparación de pedidos e inventario rotativo.' });
const carretillero = (n = 2, hourlyRate = 19.8, people = 4) =>
  puesto(n, id(601), {
    name: 'Mozo/a Especialista — Carretillero/a Frontal/Retráctil', hourlyRate, people,
    costs: [{ code: 'absenteeism', applies: true, percent: 3.2, perHour: null }],
    extras: extras().map((x) => ({ ...x, print: x.code !== 'festiva' })),
    description: 'Ubicación en altura en estanterías dinámicas (hasta 9m), descarga de trailers y abastecimiento de líneas.',
  });
const envasado = (n: number, name: string, base: number, bonus: number, hourlyRate: number, people: number, description: string) =>
  puesto(n, null, { name, customCategoryName: name, annualBaseSalary: base, monthlyBonus: bonus, hourlyRate, people, description });

type Semilla = {
  code: string; clientId: string; status: QuoteStatus; title: string; salesRepId: string; validUntil: string; positions: QuotePosition[];
  version?: Partial<QuoteVersion>; enviadoHaceDias?: number; anterior?: { positions: QuotePosition[]; validUntil: string };
};

function semillas(): Semilla[] {
  return [
    {
      code: 'PRE-2026-0048', clientId: id(100), status: 'draft', title: 'Servicio ETT campaña logística primavera y refuerzo HUB central', salesRepId: ELENA,
      validUntil: '2026-11-27', positions: [operario(), carretillero()],
      version: {
        issueDate: '2026-10-27', expectedStartDate: '2026-12-01', durationMonths: 3, modality: 'pico_produccion', paymentMethodId: id(301), replacementGuarantee: 'garantia_4h',
        commercialNotes: 'Se contempla cláusula de absorción por plantilla cliente sin coste de traspaso tras superar las 900 horas efectivas de CPD. La ETT asume la gestión documental completa en CAE y portal de PRL.',
      },
      anterior: { positions: [operario(1, 17.2), carretillero(2, 20.4, 3)], validUntil: '2026-11-10' },
    },
    {
      code: 'PRE-2026-0047', clientId: id(102), status: 'in_preparation', title: 'Refuerzo líneas de envasado y picking alimentario', salesRepId: CARLOS, validUntil: '2026-11-02',
      positions: [
        envasado(1, 'Operario/a de envasado', 16300, 60, 16.4, 6, 'Envasado y etiquetado en línea.'),
        envasado(2, 'Preparador/a de pedidos', 16500, 60, 16.9, 4, 'Picking de producto fresco.'),
        envasado(3, 'Carretillero/a', 18900, 90, 18.6, 2, 'Carga de camiones y ubicación en cámara.'),
      ],
    },
    {
      code: 'PRE-2026-0046', clientId: id(103), status: 'pending_signature', enviadoHaceDias: 2, title: 'Camareros/as para temporada de congresos', salesRepId: LAURA, validUntil: '2026-11-10',
      positions: [
        puesto(1, id(604), { name: 'Camarero/a de sala', hourlyRate: 17.4, people: 8, description: 'Servicio de sala en congresos.' }),
        puesto(2, id(604), { name: 'Camarero/a de barra', hourlyRate: 17.4, people: 4, description: 'Servicio de barra.' }),
      ],
    },
    {
      code: 'PRE-2026-0045', clientId: id(101), status: 'sent', enviadoHaceDias: 6, title: 'Operarios/as soldadura y mecanizado metal 24/7', salesRepId: ELENA, validUntil: '2026-11-15',
      positions: [puesto(1, id(607), { name: 'Soldador/a TIG/MIG', hourlyRate: 22.4, people: 6, description: 'Soldadura homologada en turnos rotativos 24/7.' })],
    },
    {
      code: 'PRE-2026-0042', clientId: id(100), status: 'accepted', title: 'Campaña logística otoño HUB central', salesRepId: ELENA, validUntil: '2026-10-20', positions: [operario(), carretillero()],
      version: { issueDate: '2026-09-20', expectedStartDate: '2026-11-03', durationMonths: 3, modality: 'pico_produccion', commercialNotes: 'Campaña de otoño. Turnos de mañana y tarde en el HUB central de Basauri.' },
    },
    {
      code: 'PRE-2026-0041', clientId: id(103), status: 'accepted', title: 'Servicio ETT camareros/as y cocina fiestas locales', salesRepId: LAURA, validUntil: '2026-10-15',
      positions: [
        puesto(1, id(604), { name: 'Camarero/a de sala', hourlyRate: 18.4, people: 10, description: 'Servicio de sala, montaje de mesas y servicio de cócteles y banquetes.' }),
        puesto(2, id(605), { name: 'Ayudante de cocina', hourlyRate: 17.2, people: 4, description: 'Preparación, emplatado y limpieza de cocina.' }),
        puesto(3, id(606), { name: 'Cocinero/a de partida', hourlyRate: 19.6, people: 2, description: 'Elaboración de la partida asignada en banquetes.' }),
        puesto(4, id(604), { name: 'Camarero/a de barra', hourlyRate: 18.4, people: 3, description: 'Servicio de barra en el turno de noche.' }),
      ],
      version: { issueDate: '2026-09-15', expectedStartDate: '2026-10-10', durationMonths: 2, modality: 'pico_produccion', commercialNotes: 'Temporada de congresos y fiestas locales en el recinto de congresos de Barcelona.' },
    },
    {
      code: 'PRE-2026-0038', clientId: id(100), status: 'rejected', title: 'Mozos de carga para inventario anual', salesRepId: CARLOS, validUntil: '2026-10-01',
      positions: [puesto(1, id(600), { name: 'Mozo/a de carga', hourlyRate: 16.2, people: 5, description: 'Recuento e inventario anual.' })],
      version: { rejectionReasonId: id(700), rejectionReasonName: 'Precio', rejectionNotes: 'Han elegido otra ETT con una tarifa más baja.', rejectedAt: '2026-09-25T10:00:00.000Z' },
    },
    {
      code: 'PRE-2026-0033', clientId: id(102), status: 'accepted', title: 'Envasado nocturno campaña de cítricos', salesRepId: CARLOS, validUntil: '2026-09-05',
      positions: [envasado(1, 'Operario/a de envasado', 16300, 60, 16.4, 5, 'Envasado y etiquetado en línea, turno de noche.')],
      version: { issueDate: '2026-08-20', expectedStartDate: '2026-09-15', durationMonths: 3, commercialNotes: 'El cliente aplazó la campaña después de aceptar: la petición PET-2026-0036 está cancelada.' },
    },
    {
      code: 'PRE-2026-0029', clientId: id(100), status: 'accepted', title: 'Campaña logística verano HUB central', salesRepId: ELENA, validUntil: '2026-06-20',
      positions: [puesto(1, id(602), { name: 'Mozo/a de almacén', hourlyRate: 16.9, people: 6, description: 'Carga, descarga y reposición en la nave 2.' })],
      version: { issueDate: '2026-06-01', expectedStartDate: '2026-07-01', durationMonths: 3, commercialNotes: 'Campaña de verano, ya terminada.' },
    },
  ];
}

// ---------------------------------------------------------------------------
// Estado en memoria (se crea al primer uso)
// ---------------------------------------------------------------------------

type Cabecera = Omit<
  Quote,
  'currentVersion' | 'versions' | 'status' | 'versionNumber' | 'createdFromCode' | 'replacedByCode' | 'clientAgreementId' | 'clientTaxId' | 'clientSectorCode'
> & { updatedAt: string };
let estado: { cabeceras: Cabecera[]; versiones: QuoteVersion[]; siguiente: number } | undefined;
let ajustesDe: () => Promise<TenantSettings> = async () => ({ quoteMinMarginPercent: null, quoteNoResponseDays: 15 });

const ahora = () => new Date().toISOString();
const hoyISO = () => ahora().slice(0, 10);
const enDias = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const copia = <T>(x: T): T => structuredClone(x);

function versionNueva(quoteId: string, n: number, datosVersion: Partial<QuoteVersion>, clientId: string | null): QuoteVersion {
  return {
    id: newId(), quoteId, versionNumber: n, status: 'draft', editable: true, title: null, contactId: clientId ? (EMPRESAS[clientId]?.contact?.id ?? null) : null,
    contactName: null, contactEmail: null, contactPosition: null, contactPhone: null, salesRepId: null, salesRepName: null, issueDate: hoyISO(), validUntil: enDias(30), expectedStartDate: null, durationMonths: null, modality: null, paymentMethodId: null, paymentMethodName: null,
    vatRate: 21, currency: 'EUR', replacementGuarantee: null, commercialNotes: null, conditions: null, margin: { mode: 'percent', value: 18 },
    ssRates: { ...DEFAULT_SS_RATES, atEp: atEpForCnae(clientId ? EMPRESAS[clientId]?.cnae : null) }, costConcepts: costes(), defaultExtras: extras(),
    approvalStatus: null, approvalNotes: null, approvalRequestedAt: null, approvalDecidedAt: null, approvalRequestedByName: null, approvalDecidedByName: null,
    minMarginPercent: null, sentAt: null, sentByName: null, acceptedAt: null, rejectedAt: null, rejectionReasonId: null, rejectionReasonName: null,
    rejectionNotes: null, closedAt: null, positions: [], totals: null, issues: [], createdAt: ahora(),
    createdByName: YO.name, updatedAt: ahora(), ...datosVersion,
  };
}

function datos() {
  if (!estado) {
    const cabeceras: Cabecera[] = [];
    const versiones: QuoteVersion[] = [];
    for (const s of semillas()) {
      const quoteId = newId();
      const e = EMPRESAS[s.clientId];
      cabeceras.push({
        id: quoteId, code: s.code, companyId: EG, branchId: e.branchId, clientId: s.clientId, clientName: e.name, createdFromQuoteId: null,
        replacedByQuoteId: null, obsoleteAt: null, obsoleteReason: null, createdAt: '2026-10-01T09:00:00.000Z', updatedAt: '2026-10-27T10:00:00.000Z',
      });
      const comunes = { title: s.title, salesRepId: s.salesRepId, salesRepName: NOMBRES[s.salesRepId], createdByName: NOMBRES[s.salesRepId], createdAt: '2026-10-01T09:00:00.000Z' };
      let n = 1;
      if (s.anterior) {
        versiones.push(versionNueva(quoteId, n++, { ...comunes, ...s.version, status: 'superseded', positions: s.anterior.positions, validUntil: s.anterior.validUntil, sentAt: '2026-03-10T10:00:00.000Z' }, s.clientId));
      }
      const enviado = s.enviadoHaceDias !== undefined ? new Date(Date.now() - s.enviadoHaceDias * 86_400_000).toISOString() : ['accepted', 'rejected'].includes(s.status) ? '2026-09-01T10:00:00.000Z' : null;
      versiones.push(versionNueva(quoteId, n, { ...comunes, ...s.version, status: s.status, positions: s.positions, validUntil: s.validUntil, sentAt: enviado }, s.clientId));
    }
    // Cada puesto con su id (como en la base de datos), también entre versiones.
    for (const v of versiones) v.positions = v.positions.map((p) => ({ ...p, id: newId() }));
    estado = { cabeceras, versiones, siguiente: 49 };
  }
  return estado;
}

const cabecera = (quoteId: string) => {
  const c = datos().cabeceras.find((x) => x.id === quoteId);
  if (!c) throw new ApiError(404, 'no_encontrado', 'El presupuesto no existe o no tienes acceso');
  return c;
};
const versionesDe = (quoteId: string) => datos().versiones.filter((v) => v.quoteId === quoteId).sort((a, b) => b.versionNumber - a.versionNumber);
const actual = (quoteId: string) => versionesDe(quoteId)[0];
function version(versionId: string) {
  const v = datos().versiones.find((x) => x.id === versionId);
  if (!v) throw new ApiError(404, 'no_encontrado', 'Esa versión no existe');
  return v;
}
function puestoDe(positionId: string) {
  for (const v of datos().versiones) {
    const p = v.positions.find((x) => x.id === positionId);
    if (p) return { v, p };
  }
  throw new ApiError(404, 'no_encontrado', 'El puesto no existe');
}

/** Los costes internos de cada puesto, ya resueltos (el valor del puesto o el del presupuesto). */
function costesDe(v: QuoteVersion, p: QuotePosition) {
  return v.costConcepts.flatMap((c) => {
    const a = p.costs.find((x) => x.code === c.code);
    if (a && !a.applies) return [];
    if (a?.percent != null) return [{ code: c.code, name: c.name, mode: 'percent' as const, value: a.percent }];
    if (a?.perHour != null) return [{ code: c.code, name: c.name, mode: 'per_hour' as const, value: a.perHour }];
    return [{ code: c.code, name: c.name, mode: c.mode, value: c.value }];
  });
}

/** La versión como la devuelve la API: con el cálculo de cada puesto y los totales. */
function calculada(v: QuoteVersion, minimo: number | null): QuoteVersion {
  const r = calculateQuote({ margin: v.margin, ssRates: v.ssRates, minMarginPercent: minimo, positions: v.positions.map((p) => ({ ...p, costs: costesDe(v, p) })) });
  const contacto = v.contactId ? CONTACTOS[v.contactId] : undefined;
  const { averageCost: _coste, ...totals } = r.totals;
  return {
    ...copia(v),
    editable: EDITABLES.includes(v.status),
    contactName: contacto?.name ?? null,
    contactEmail: contacto?.email ?? null,
    contactPosition: contacto?.position ?? null,
    contactPhone: contacto?.phone ?? null,
    paymentMethodName: v.paymentMethodId ? (FORMAS_PAGO[v.paymentMethodId] ?? null) : null,
    minMarginPercent: minimo,
    positions: v.positions.map((p, i) => ({ ...copia(p), calculation: r.positions[i] })),
    totals,
    issues: r.issues,
  };
}
const minimo = async () => (await ajustesDe()).quoteMinMarginPercent;

async function completo(quoteId: string): Promise<Quote> {
  const c = cabecera(quoteId);
  const m = await minimo();
  const vs = versionesDe(quoteId).map((v) => calculada(v, m));
  const codigo = (qid: string | null) => (qid ? (datos().cabeceras.find((x) => x.id === qid)?.code ?? null) : null);
  const { updatedAt: _u, ...cab } = copia(c);
  return {
    ...cab,
    clientAgreementId: c.clientId ? (EMPRESAS[c.clientId]?.agreement ?? null) : null,
    clientTaxId: c.clientId ? (EMPRESAS[c.clientId]?.taxId ?? null) : null,
    clientSectorCode: c.clientId ? (EMPRESAS[c.clientId]?.cnae ?? null) : null,
    status: vs[0].status,
    versionNumber: vs[0].versionNumber,
    createdFromCode: codigo(c.createdFromQuoteId),
    replacedByCode: codigo(c.replacedByQuoteId),
    currentVersion: vs[0],
    versions: vs.map((v) => ({
      id: v.id, versionNumber: v.versionNumber, status: v.status, issueDate: v.issueDate, validUntil: v.validUntil, createdAt: v.createdAt,
      createdByName: v.createdByName, revenue: v.totals!.revenue, averageRate: v.totals!.averageRate, marginPercent: v.totals!.marginPercent,
    })),
  };
}

async function resumen(q: Quote): Promise<QuoteSummary> {
  const { quoteNoResponseDays } = await ajustesDe();
  const v = q.currentVersion;
  const t = v.totals!;
  const esperando = v.sentAt && (v.status === 'sent' || v.status === 'pending_signature');
  const dias = esperando ? Math.floor((Date.now() - new Date(v.sentAt!).getTime()) / 86_400_000) : null;
  const { currentVersion: _v, versions: _vs, clientTaxId: _t, clientSectorCode: _s, ...cab } = q;
  return {
    ...cab, title: v.title, salesRepId: v.salesRepId, salesRepName: v.salesRepName, issueDate: v.issueDate, validUntil: v.validUntil,
    positionsCount: v.positions.length, people: t.people, hours: t.hours, revenue: t.revenue, averageRate: t.averageRate, marginPercent: t.marginPercent,
    sentAt: v.sentAt, daysWithoutResponse: dias, noResponse: dias !== null && dias >= quoteNoResponseDays, approvalStatus: v.approvalStatus,
    rejectionReasonName: v.rejectionReasonName,
  };
}

const EDITABLES: QuoteStatus[] = ['draft', 'in_preparation'];
function editable(v: QuoteVersion) {
  if (!EDITABLES.includes(v.status)) throw new ApiError(409, 'conflicto', 'Esta versión ya está cerrada: crea una versión nueva para cambiarla');
}
function tocar(v: QuoteVersion, cambios: Partial<QuoteVersion>, texto: string) {
  Object.assign(v, cambios, { updatedAt: ahora() });
  cabecera(v.quoteId).updatedAt = v.updatedAt;
  log('quote', v.quoteId, null, 'update', texto);
}
const conCalculo = async (v: QuoteVersion) => delay(calculada(v, await minimo()));

/** Las comprobaciones antes de enviar, como GET /v1/quote-versions/{id}/review. */
async function revision(v: QuoteVersion): Promise<QuoteReview> {
  const c = cabecera(v.quoteId);
  const m = await minimo();
  const r = calculada(v, m);
  const con = (issue: string) => r.positions.map((p, i) => [p, i] as const).filter(([p]) => p.calculation!.issues.includes(issue as never));
  const bajoConvenio = con('salary_below_agreement');
  const bajoCoste = con('rate_below_cost');
  const bajoMinimo = con('margin_below_minimum');
  const sinTarifa = r.positions.map((p, i) => [p, i] as const).filter(([p]) => p.hourlyRate == null);
  const nombres = (l: (readonly [QuotePosition, number])[]) => l.map(([p]) => p.name).join(', ');
  const checks: QuoteReview['checks'] = [
    { code: 'client', path: 'clientId', ok: !!c.clientId, kind: 'error', message: 'Empresa elegida' },
    { code: 'contact', path: 'contactId', ok: !!v.contactId, kind: 'error', message: 'Contacto que recibe la propuesta' },
    { code: 'contact_email', path: 'contactId', ok: !!r.contactEmail, kind: 'error', message: 'El contacto tiene email' },
    { code: 'sales_rep', path: 'salesRepId', ok: !!v.salesRepId, kind: 'error', message: 'Comercial responsable' },
    { code: 'valid_until', path: 'validUntil', ok: !!v.validUntil && v.validUntil >= hoyISO(), kind: 'error', message: 'Fecha de validez futura' },
    { code: 'positions', path: 'positions', ok: v.positions.length > 0, kind: 'error', message: 'Al menos un puesto' },
    { code: 'rate', path: sinTarifa.length ? `positions.${sinTarifa[0][1]}.hourlyRate` : 'positions', ok: !sinTarifa.length, kind: 'error', message: sinTarifa.length ? `Sin tarifa: ${nombres(sinTarifa)}` : 'Todos los puestos tienen tarifa' },
    { code: 'rate_below_cost', path: bajoCoste.length ? `positions.${bajoCoste[0][1]}.hourlyRate` : 'positions', ok: !bajoCoste.length, kind: 'error', message: bajoCoste.length ? `Tarifa por debajo del coste: ${nombres(bajoCoste)}` : 'Ninguna tarifa por debajo del coste' },
    {
      code: 'below_agreement', path: bajoConvenio.length ? `positions.${bajoConvenio[0][1]}.annualBaseSalary` : 'positions', ok: !bajoConvenio.length, kind: 'error',
      message: bajoConvenio.length ? `Salario por debajo del convenio de la empresa usuaria: ${nombres(bajoConvenio)}. No se puede pagar menos (art. 11 de la Ley 14/1994).` : 'Ningún salario por debajo del convenio',
    },
    {
      code: 'margin', path: 'positions', ok: !bajoMinimo.length || v.approvalStatus === 'approved', kind: 'approval',
      message: m === null ? 'Sin margen mínimo en esta ETT' : bajoMinimo.length ? `Margen por debajo del ${m} %: ${nombres(bajoMinimo)}${v.approvalStatus === 'approved' ? ' (aprobado)' : ''}` : `Margen de todos los puestos ≥ ${m} %`,
    },
  ];
  return { ready: checks.every((x) => x.ok), needsApproval: bajoMinimo.length > 0, approvalStatus: v.approvalStatus, minMarginPercent: m, checks };
}

/** Como el servidor: los campos que no coinciden con la tabla del convenio son los cambiados a mano. */
function marcarManuales(p: QuotePosition) {
  const t = p.agreementCategoryId ? TABLAS[p.agreementCategoryId] : undefined;
  const tabla: Partial<QuotePosition> = t ? { annualBaseSalary: t.base, monthlyBonus: t.bonus, annualHours: t.hours } : {};
  p.manualFields = (Object.keys(tabla) as (keyof QuotePosition)[]).filter((k) => p[k] !== tabla[k]);
}

/** El salario por hora no puede quedar por debajo del convenio (art. 11 de la Ley 14/1994): siempre 422. */
function comprobarConvenio(p: QuotePosition) {
  const s = (p.annualBaseSalary + (p.monthlyBonus ?? 0) * 12) / p.annualHours;
  if (p.agreementMinimumSalaryHour != null && s < p.agreementMinimumSalaryHour - 0.005) {
    throw new ApiError(
      422,
      'salario_bajo_convenio',
      `${p.name}: el salario (${s.toFixed(2)} €/h) queda por debajo del convenio de la empresa usuaria (${p.agreementMinimumSalaryHour.toFixed(2)} €/h). No se puede pagar menos.`,
    );
  }
}

function crear(clientId: string | null, branchId: string | null, datosVersion: Partial<QuoteVersion>, createdFrom: string | null = null): string {
  const quoteId = newId();
  const e = clientId ? EMPRESAS[clientId] : undefined;
  const code = `PRE-${new Date().getFullYear()}-${String(datos().siguiente++).padStart(4, '0')}`;
  datos().cabeceras.unshift({
    id: quoteId, code, companyId: EG, branchId: branchId ?? e?.branchId ?? NORTE, clientId, clientName: e?.name ?? null,
    createdFromQuoteId: createdFrom, replacedByQuoteId: null, obsoleteAt: null, obsoleteReason: null, createdAt: ahora(), updatedAt: ahora(),
  });
  const v = versionNueva(quoteId, 1, datosVersion, clientId);
  v.positions = v.positions.map((p, i) => ({ ...copia(p), id: newId(), sortOrder: i + 1 }));
  datos().versiones.push(v);
  log('quote', quoteId, null, 'create', `Presupuesto ${code} creado`);
  return quoteId;
}

/** Lo que se copia al duplicar, al crear uno nuevo desde un obsoleto y en una versión nueva. */
function copiable(v: QuoteVersion): Partial<QuoteVersion> {
  const c = copia(v);
  return {
    title: c.title, expectedStartDate: c.expectedStartDate, durationMonths: c.durationMonths, modality: c.modality, paymentMethodId: c.paymentMethodId,
    vatRate: c.vatRate, currency: c.currency, replacementGuarantee: c.replacementGuarantee, commercialNotes: c.commercialNotes, conditions: c.conditions,
    margin: c.margin, ssRates: c.ssRates, costConcepts: c.costConcepts, defaultExtras: c.defaultExtras, positions: c.positions.map((p) => ({ ...p, calculation: null })),
  };
}

/** Puesto nuevo: lo que no se envía de salario, horas y vacaciones sale del convenio; los extras, de la versión. */
function posicion(datosPuesto: QuotePositionInput, n: number, v: QuoteVersion): QuotePosition {
  const categoria = datosPuesto.agreementCategoryId ?? null;
  if (!categoria && (datosPuesto.annualBaseSalary == null || !datosPuesto.annualHours)) {
    throw new ApiError(422, 'validacion', 'Sin tabla de convenio, el salario base anual y las horas anuales son obligatorios');
  }
  return {
    ...puesto(n, categoria && TABLAS[categoria] ? categoria : null, { name: '', hourlyRate: null, people: 1, extras: copia(v.defaultExtras) }),
    ...copia(datosPuesto),
    id: newId(),
    calculation: null,
  };
}

export function memoryQuoteRepositories(ajustes: () => Promise<TenantSettings>): Pick<Repositories, 'quotes' | 'quoteVersions'> {
  ajustesDe = ajustes;
  return {
    quotes: {
      async list(q = {}) {
        const hoy = hoyISO();
        const pronto = enDias(7);
        const texto = q.q?.toLowerCase().trim();
        const todos = await Promise.all(datos().cabeceras.map(async (c) => resumen(await completo(c.id))));
        const lista = todos.filter(
          (x) =>
            (!texto || `${x.code} ${x.clientName ?? ''} ${x.title ?? ''}`.toLowerCase().includes(texto)) &&
            (!q.status || x.status === q.status) &&
            (!q.salesRepId || x.salesRepId === q.salesRepId) &&
            (!q.clientId || x.clientId === q.clientId) &&
            (!q.branchId || x.branchId === q.branchId) &&
            (!q.noResponse || x.noResponse) &&
            (!q.validity ||
              (q.validity === 'expired'
                ? (x.validUntil ?? '') < hoy
                : q.validity === 'expiring'
                  ? !!x.validUntil && x.validUntil >= hoy && x.validUntil <= pronto
                  : (x.validUntil ?? '') >= hoy)),
        );
        return page(lista, q);
      },
      get: async (quoteId) => delay(await completo(quoteId)),
      async create({ clientId = null, branchId = null, status: _status, ...datosVersion }) {
        return delay(await completo(crear(clientId, branchId, datosVersion as Partial<QuoteVersion>)), 300);
      },
      async update(quoteId, data) {
        const c = cabecera(quoteId);
        const vs = versionesDe(quoteId);
        if (vs.length > 1 || vs[0].status !== 'draft') throw new ApiError(409, 'conflicto', 'La empresa solo se cambia en un presupuesto con una única versión en borrador');
        if (data.clientId !== undefined) {
          const e = data.clientId ? EMPRESAS[data.clientId] : undefined;
          Object.assign(c, { clientId: data.clientId, clientName: e?.name ?? null });
          // El contacto pasa al destinatario de presupuestos del cliente nuevo.
          vs[0].contactId = e?.contact?.id ?? null;
          if (e) vs[0].ssRates = { ...vs[0].ssRates, atEp: atEpForCnae(e.cnae) };
        }
        if (data.branchId) c.branchId = data.branchId;
        c.updatedAt = ahora();
        return delay(await completo(quoteId));
      },
      async duplicate(quoteId) {
        const v = actual(quoteId);
        return delay(await completo(crear(null, cabecera(quoteId).branchId, { ...copiable(v), title: `${v.title ?? ''} (copia)` })));
      },
      async makeObsolete(quoteId, reason) {
        const c = cabecera(quoteId);
        const v = actual(quoteId);
        if (v.status === 'obsolete') throw new ApiError(409, 'conflicto', 'Ya está obsoleto');
        const nuevo = crear(c.clientId, c.branchId, { ...copiable(v), contactId: v.contactId, salesRepId: v.salesRepId, salesRepName: v.salesRepName }, quoteId);
        Object.assign(c, { obsoleteAt: ahora(), obsoleteReason: reason, replacedByQuoteId: nuevo });
        tocar(v, { status: 'obsolete' }, `Pasa a obsoleto: ${reason}`);
        return { obsolete: await completo(quoteId), created: await completo(nuevo) };
      },
      async agreementCategories(collectiveAgreementId) {
        return delay(
          Object.entries(TABLAS)
            .filter(([, t]) => t.agreement === collectiveAgreementId)
            .map(([k, t]) => ({ id: k, code: t.code, name: t.name, group: null, level: t.level })),
        );
      },
      async agreementDefaults(q) {
        const t = q.agreementCategoryId ? TABLAS[q.agreementCategoryId] : undefined;
        const ok = !!t && t.agreement === q.collectiveAgreementId;
        return delay({
          agreementVersionId: null,
          effectiveFrom: ok ? '2026-01-01' : null,
          effectiveTo: ok ? '2026-12-31' : null,
          defaults: {
            annualBaseSalary: ok ? t.base : null, monthlyBonus: ok ? t.bonus : 0, annualPayments: ok ? 14 : null, annualHours: ok ? t.hours : null,
            vacationDays: ok ? 30 : null, vacationDaysType: ok ? 'naturales' : null, minimumSalaryHour: ok ? minimoHora(t) : null, extras: [],
          },
        });
      },
    },
    quoteVersions: {
      get: async (versionId) => conCalculo(version(versionId)),
      async update(versionId, { status, ...data }) {
        const v = version(versionId);
        editable(v);
        const cambios: Partial<QuoteVersion> = copia(data);
        if (data.salesRepId !== undefined) cambios.salesRepName = data.salesRepId ? (NOMBRES[data.salesRepId] ?? null) : null;
        // Un cambio en lo económico anula la aprobación del margen.
        if (data.costConcepts && v.costConcepts.some((c) => c.required && !data.costConcepts!.some((x) => x.code === c.code))) {
          throw new ApiError(422, 'validacion', 'Absentismo, EPIs y revisión médica van siempre en el presupuesto: si un puesto no los necesita, desmárcalos en ese puesto');
        }
        if (data.margin || data.costConcepts || data.ssRates) Object.assign(cambios, { approvalStatus: null, approvalNotes: null });
        if (status) cambios.status = status;
        tocar(v, cambios, status && status !== v.status ? `Pasa a «${status === 'draft' ? 'Borrador' : 'En preparación'}»` : 'Presupuesto modificado');
        return conCalculo(v);
      },
      async addPosition(versionId, data) {
        const v = version(versionId);
        editable(v);
        if (!data.name?.trim()) throw new ApiError(422, 'validacion', 'El puesto necesita un nombre');
        const p = posicion(data, v.positions.length + 1, v);
        comprobarConvenio(p);
        marcarManuales(p);
        v.positions.push(p);
        tocar(v, { approvalStatus: null }, `Puesto añadido: ${p.name}`);
        return conCalculo(v);
      },
      async updatePosition(positionId, data) {
        const { v, p } = puestoDe(positionId);
        editable(v);
        const nuevo: QuotePosition = { ...p, ...copia(data) };
        if (data.agreementCategoryId !== undefined) {
          const t = data.agreementCategoryId ? TABLAS[data.agreementCategoryId] : undefined;
          Object.assign(nuevo, {
            agreementMinimumSalaryHour: t ? minimoHora(t) : null, agreementPeriod: t ? { from: '2026-01-01', to: '2026-12-31' } : null,
            agreementCategoryName: t?.name ?? null, collectiveAgreementName: t ? CONVENIOS[t.agreement] : null,
          });
        }
        comprobarConvenio(nuevo);
        marcarManuales(nuevo);
        Object.assign(p, nuevo);
        tocar(v, { approvalStatus: null }, `Puesto modificado: ${p.name}`);
        return conCalculo(v);
      },
      async removePosition(positionId) {
        const { v, p } = puestoDe(positionId);
        editable(v);
        v.positions = v.positions.filter((x) => x.id !== positionId);
        tocar(v, {}, `Puesto quitado: ${p.name}`);
        return conCalculo(v);
      },
      async resetPositionFromAgreement(positionId, fields) {
        const { v, p } = puestoDe(positionId);
        editable(v);
        const t = p.agreementCategoryId ? TABLAS[p.agreementCategoryId] : undefined;
        if (!t) throw new ApiError(409, 'conflicto', 'Este puesto no tiene tabla de convenio');
        const valores: Partial<QuotePosition> = { annualBaseSalary: t.base, monthlyBonus: t.bonus, annualHours: t.hours, annualPayments: 14 };
        const campos = fields ?? Object.keys(valores);
        for (const k of campos) if (k in valores) Object.assign(p, { [k]: valores[k as keyof typeof valores] });
        p.manualFields = p.manualFields.filter((f) => !campos.includes(f));
        tocar(v, {}, `Puesto ${p.name}: valores del convenio`);
        return conCalculo(v);
      },
      async requestApproval(versionId, notes) {
        const v = version(versionId);
        editable(v);
        tocar(v, { approvalStatus: 'pending', approvalNotes: notes ?? null, approvalRequestedAt: ahora() }, 'Aprobación del margen pedida');
        return conCalculo(v);
      },
      async approve(versionId, notes) {
        const v = version(versionId);
        if (v.approvalStatus !== 'pending') throw new ApiError(409, 'conflicto', 'No hay ninguna aprobación pendiente');
        tocar(v, { approvalStatus: 'approved', approvalNotes: notes ?? v.approvalNotes, approvalDecidedAt: ahora() }, 'Margen aprobado');
        return conCalculo(v);
      },
      async rejectApproval(versionId, notes) {
        const v = version(versionId);
        if (v.approvalStatus !== 'pending') throw new ApiError(409, 'conflicto', 'No hay ninguna aprobación pendiente');
        tocar(v, { approvalStatus: 'rejected', approvalNotes: notes, approvalDecidedAt: ahora() }, 'Se piden cambios en el margen');
        return conCalculo(v);
      },
      review: async (versionId) => delay(await revision(version(versionId))),
      async send(versionId) {
        const v = version(versionId);
        editable(v);
        const r = await revision(v);
        const errores = r.checks.filter((c) => !c.ok && c.kind === 'error');
        if (errores.some((c) => c.code === 'below_agreement')) throw new ApiError(422, 'salario_bajo_convenio', errores.find((c) => c.code === 'below_agreement')!.message);
        if (errores.length) throw new ApiError(422, 'validacion', 'El presupuesto no se puede enviar todavía', errores.map((c) => ({ path: c.path, message: c.message })));
        if (r.needsApproval && v.approvalStatus !== 'approved') {
          throw new ApiError(409, 'requiere_aprobacion', 'Hay puestos con el margen por debajo del mínimo de la ETT: hace falta la aprobación de un responsable');
        }
        tocar(v, { status: 'sent', sentAt: ahora() }, 'Enviado al cliente');
        return conCalculo(v);
      },
      async pendingSignature(versionId) {
        const v = version(versionId);
        if (v.status !== 'sent') throw new ApiError(409, 'conflicto', 'Solo pasa a pendiente de firma un presupuesto enviado');
        tocar(v, { status: 'pending_signature' }, 'Pendiente de firma');
        return conCalculo(v);
      },
      async accept(versionId) {
        const v = version(versionId);
        if (!['sent', 'pending_signature'].includes(v.status)) throw new ApiError(409, 'conflicto', 'Solo se acepta un presupuesto enviado');
        tocar(v, { status: 'accepted', acceptedAt: ahora() }, 'Aceptado por el cliente');
        return conCalculo(v);
      },
      async reject(versionId, { reasonId, notes }) {
        const v = version(versionId);
        if (!['sent', 'pending_signature'].includes(v.status)) throw new ApiError(409, 'conflicto', 'Solo se rechaza un presupuesto enviado');
        const i = MOTIVOS_RECHAZO.findIndex((_, k) => id(700 + k) === reasonId);
        const nombre = i >= 0 ? MOTIVOS_RECHAZO[i] : 'Otro motivo';
        tocar(v, { status: 'rejected', rejectedAt: ahora(), rejectionReasonId: reasonId, rejectionReasonName: nombre, rejectionNotes: notes ?? null }, `Rechazado: ${nombre}`);
        return conCalculo(v);
      },
      async newVersion(versionId) {
        const v = version(versionId);
        if (['obsolete', 'superseded', 'accepted'].includes(v.status)) throw new ApiError(409, 'conflicto', 'No se crea una versión nueva de un presupuesto aceptado, obsoleto o sustituido');
        const nueva = versionNueva(v.quoteId, v.versionNumber + 1, { ...copiable(v), contactId: v.contactId, salesRepId: v.salesRepId, salesRepName: v.salesRepName, validUntil: v.validUntil }, null);
        nueva.positions = nueva.positions.map((p) => ({ ...p, id: newId() }));
        tocar(v, { status: 'superseded' }, `Versión ${nueva.versionNumber} creada`);
        datos().versiones.push(nueva);
        return conCalculo(nueva);
      },
      async proposalPdf() {
        throw new ApiError(501, 'no_disponible', 'En la demo no se genera el PDF: mira la vista previa.');
      },
    },
  };
}
