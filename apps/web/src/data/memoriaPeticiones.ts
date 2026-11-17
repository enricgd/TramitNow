// Peticiones de ejemplo y repositorios en memoria (modo demo). Son las 9 del diseñador (PeticionesView.jsx), cada una
// de un puesto de los presupuestos aceptados de memoriaPresupuestos.ts, y se comportan como la API de la fase 5
// (fase5-backend.md): condiciones copiadas del presupuesto, reparto del puesto, crear desde la versión aceptada,
// duplicar, horario y CPD previo con sus comprobaciones.
// Todo es ficticio. Sin efectos al cargarse (ver vite.config.ts): los datos se crean la primera vez que se usan.
import { delay, id, newId, page } from './memoriaBase';
import { centroPorId, contactoPorId, log } from './memoriaEmpresas';
import { acceptedQuotes } from './memoriaPresupuestos';
import type { Repositories } from './repositorios';
import {
  ApiError,
  type PreCpd,
  type PreCpdCheck,
  type Quote,
  type QuotePosition,
  type RequestScheduleDay,
  type RequestUseCase,
  type ServiceRequest,
  type ServiceRequestCreate,
  type ServiceRequestStatus,
  type ServiceRequestSummary,
} from './tipos';
import { horarioDeTurno, horasDia } from './turnos';

const YO = { id: id(250), name: 'Usuario Demo' };
// Usuarios de memoria.ts (membresía n → usuario n + 100).
const RESPONSABLES: Record<string, string> = { [YO.id]: YO.name, [id(252)]: 'Ane Uriarte', [id(253)]: 'Nuria Castells', [id(254)]: 'Jon Ibarra' };
const ANE = id(252);
const NURIA = id(253);
const JON = id(254);

/** Supuestos de utilización (los de la API, fase5-backend.md). */
const SUPUESTOS: RequestUseCase[] = [
  { code: 'production_unforeseen', name: 'Circunstancias de la producción: aumento ocasional e imprevisible', legalReference: 'Art. 15.2 ET', maxMonths: 6, hint: 'Hasta 6 meses, ampliable a 12 por convenio sectorial' },
  { code: 'production_foreseeable', name: 'Circunstancias de la producción: situaciones ocasionales y previsibles', legalReference: 'Art. 15.2 ET', maxMonths: 3, hint: 'Hasta 90 días en el año natural' },
  { code: 'substitution_leave', name: 'Sustitución de una persona con reserva de puesto', legalReference: 'Art. 15.3 ET', maxMonths: null, hint: 'Indica a quién se sustituye y la causa' },
  { code: 'substitution_reduced_hours', name: 'Completar la jornada reducida de otra persona', legalReference: 'Art. 15.3 ET', maxMonths: null, hint: null },
  { code: 'substitution_recruitment', name: 'Cobertura temporal durante un proceso de selección o promoción', legalReference: 'Art. 15.3 ET', maxMonths: 3, hint: 'Hasta 3 meses' },
  { code: 'training', name: 'Contrato formativo', legalReference: 'Art. 6.2 de la Ley 14/1994 y art. 11 ET', maxMonths: null, hint: null },
];

// ---------------------------------------------------------------------------
// Lo que la petición añade al presupuesto: centro, firmante, EPIs, carnés y riesgos
// ---------------------------------------------------------------------------

/** Centro y firmante de ejemplo de cada cliente. Trans-Logística no tiene centros en Empresas: el suyo va como texto. */
const CENTROS: Record<string, { centerId: string | null; nombre: string; firmante: string | null }> = {
  [id(100)]: { centerId: null, nombre: 'HUB central Basauri (Bizkaia) - Nave 2', firmante: id(120) },
  [id(101)]: { centerId: id(110), nombre: 'Planta Principal Alcalá', firmante: id(122) },
  [id(102)]: { centerId: null, nombre: 'Planta de envasado - Lleida', firmante: null },
  [id(103)]: { centerId: id(111), nombre: 'Palau de Congressos BCN', firmante: id(123) },
};
/** EPIs, carnés y riesgos de ejemplo según el nombre del puesto. */
function requisitos(nombre: string) {
  const n = nombre.toLowerCase();
  if (n.includes('carretiller')) return { ppe: 'Calzado S3, chaleco, protectores auditivos', requiredLicenses: 'Carné de carretillero vigente (UNE 58451)', risks: 'Atropellos y golpes con vehículos, caída de objetos desde estanterías, ruido.' };
  if (n.includes('cocin')) return { ppe: 'Calzado antideslizante, uniforme de cocina', requiredLicenses: 'Manipulador/a de alimentos', risks: 'Cortes, quemaduras y resbalones.' };
  if (n.includes('camarer')) return { ppe: 'Calzado antideslizante', requiredLicenses: 'Manipulador/a de alimentos', risks: 'Resbalones, sobreesfuerzos y cortes.' };
  if (n.includes('envasado')) return { ppe: 'Calzado de seguridad, guantes, cofia', requiredLicenses: 'Manipulador/a de alimentos', risks: 'Atrapamientos en línea, cortes y movimientos repetitivos.' };
  return { ppe: 'Calzado S3, chaleco de alta visibilidad, guantes anticorte', requiredLicenses: null, risks: 'Sobreesfuerzos, golpes y atropellos en muelle.' };
}

// ---------------------------------------------------------------------------
// Peticiones del diseñador
// ---------------------------------------------------------------------------

type Turno = 'manana' | 'tarde' | 'noche' | 'partida';
const TURNO: Record<Turno, string> = { manana: 'Turno de mañana', tarde: 'Turno de tarde', noche: 'Turno de noche', partida: 'Jornada partida' };
type Semilla = {
  code: string; quote: string; puesto: number; horario: Turno; slots: number; covered: number; status: ServiceRequestStatus;
  start: string; end: string; created: string; responsible: string; cancellation?: string;
};
/** También las usa la selección de ejemplo (memoriaPeticionesSeleccion.js). */
export const SEMILLAS: Semilla[] = [
  { code: 'PET-2026-0048', quote: 'PRE-2026-0042', puesto: 0, horario: 'manana', slots: 5, covered: 5, status: 'covered', start: '2026-11-03', end: '2027-01-29', created: '2026-10-15', responsible: ANE },
  { code: 'PET-2026-0049', quote: 'PRE-2026-0042', puesto: 0, horario: 'tarde', slots: 3, covered: 0, status: 'selecting', start: '2026-11-03', end: '2027-01-29', created: '2026-10-15', responsible: ANE },
  { code: 'PET-2026-0050', quote: 'PRE-2026-0042', puesto: 1, horario: 'tarde', slots: 4, covered: 2, status: 'selecting', start: '2026-11-10', end: '2027-01-29', created: '2026-10-15', responsible: JON },
  { code: 'PET-2026-0044', quote: 'PRE-2026-0041', puesto: 0, horario: 'partida', slots: 10, covered: 10, status: 'in_progress', start: '2026-10-10', end: '2026-11-30', created: '2026-10-01', responsible: NURIA },
  { code: 'PET-2026-0045', quote: 'PRE-2026-0041', puesto: 1, horario: 'partida', slots: 4, covered: 4, status: 'covered', start: '2026-11-05', end: '2026-11-30', created: '2026-10-01', responsible: NURIA },
  { code: 'PET-2026-0046', quote: 'PRE-2026-0041', puesto: 2, horario: 'partida', slots: 2, covered: 0, status: 'publishing', start: '2026-11-05', end: '2026-11-30', created: '2026-10-01', responsible: NURIA },
  { code: 'PET-2026-0047', quote: 'PRE-2026-0041', puesto: 3, horario: 'noche', slots: 3, covered: 0, status: 'new', start: '2026-11-12', end: '2026-11-30', created: '2026-10-27', responsible: JON },
  { code: 'PET-2026-0031', quote: 'PRE-2026-0029', puesto: 0, horario: 'manana', slots: 6, covered: 6, status: 'closed', start: '2026-07-01', end: '2026-09-30', created: '2026-06-12', responsible: ANE },
  { code: 'PET-2026-0036', quote: 'PRE-2026-0033', puesto: 0, horario: 'noche', slots: 5, covered: 0, status: 'cancelled', start: '2026-09-15', end: '2026-12-15', created: '2026-08-28', responsible: JON, cancellation: 'El cliente aplaza la campaña' },
];

/** Lo que se guarda de cada petición: lo demás (contadores, reparto, comprobaciones) se calcula al leer. */
type Registro = Omit<
  ServiceRequest,
  | 'slots' | 'responsibleName' | 'daysToStart' | 'startsSoonUncovered' | 'preCpdStatus' | 'weeklyHours' | 'distribution' | 'slotList' | 'preCpd'
  | 'clientCenterName' | 'clientSignerContactName' | 'clientSignerContactEmail' | 'clientSignerContactPhone' | 'signedQuoteDocument' | 'agreementCheck'
> & {
  quotePositionId: string;
  quotePeople: number;
  /** Centro sin ficha en Empresas (texto). */
  workplaceText: string | null;
  filled: number;
  preCpd: Omit<PreCpd, 'checks'>;
};
let estado: { peticiones: Registro[]; siguiente: number } | undefined;
const ahora = () => new Date().toISOString();
const copia = <T>(x: T): T => structuredClone(x);
const conHoras = (dias: RequestScheduleDay[]) => dias.map((d) => ({ ...d, hours: d.working ? horasDia(d.start, d.end, d.breakMinutes) : 0 }));
const preCpdVacio = (): Omit<PreCpd, 'checks'> => ({
  status: 'pending', outdated: false, documentId: null, generatedAt: null, generatedByName: null, sentAt: null, sentByName: null, sentTo: null, reviewedAt: null,
});

/** Lo que se copia del presupuesto aceptado y del puesto al crear la petición. */
function deQuote(q: Quote, p: QuotePosition) {
  const v = q.currentVersion;
  const c = CENTROS[q.clientId ?? ''];
  return {
    companyId: q.companyId, quoteId: q.id, quoteCode: q.code, quoteVersionId: v.id, quoteVersionNumber: v.versionNumber, quoteTitle: v.title,
    quotePositionId: p.id, quotePeople: p.people, quoteAcceptedAt: v.acceptedAt, branchId: q.branchId, hazardousWork: false, clientId: q.clientId ?? '', clientName: q.clientName ?? '', clientTaxId: q.clientTaxId,
    positionName: p.name, clientCenterId: c?.centerId ?? null, workplaceText: c?.centerId ? null : (c?.nombre ?? null), clientSignerContactId: c?.firmante ?? null,
    tasks: p.description, qualification: p.agreementCategoryName ?? p.customCategoryName, ...requisitos(p.name),
    conditions: {
      positionName: p.name, description: p.description, collectiveAgreementId: p.collectiveAgreementId, collectiveAgreementName: p.collectiveAgreementName,
      agreementVersionId: p.agreementVersionId, agreementPeriod: p.agreementPeriod, agreementCategoryId: p.agreementCategoryId, agreementCategoryCode: null,
      categoryName: p.agreementCategoryName ?? p.customCategoryName, level: p.level, agreementMinimumSalaryHour: p.agreementMinimumSalaryHour,
      salaryHour: p.calculation?.salaryHour ?? null, grossSalaryHour: p.calculation?.grossSalaryHour ?? null, rateHour: p.calculation?.rateHour ?? p.hourlyRate,
      extras: p.extras.map((x, i) => ({ code: x.code, name: x.name, salaryHour: p.calculation?.extras[i]?.salaryHour ?? null, rateHour: p.calculation?.extras[i]?.rateHour ?? null, print: x.print })),
      calculation: p.calculation,
    },
  };
}

// Una sola vez aunque la pidan a la vez varias pantallas (si no, cada llamada crearía sus propios ids)
let creando: Promise<{ peticiones: Registro[]; siguiente: number }> | undefined;
function datos() {
  return (creando ??= crearDatos());
}
async function crearDatos() {
  if (!estado) {
    const quotes = await acceptedQuotes();
    const peticiones = SEMILLAS.map((s): Registro => {
      const q = quotes.find((x) => x.code === s.quote)!;
      const p = q.currentVersion.positions[s.puesto];
      const enviado = ['PET-2026-0049', 'PET-2026-0046'].includes(s.code);
      const quien = RESPONSABLES[s.responsible];
      return {
        id: newId(), code: s.code, status: s.status, cancelReason: s.cancellation ?? null, ...deQuote(q, p), shiftName: TURNO[s.horario],
        startDate: s.start, endDate: s.end, positionsCount: s.slots, filled: s.covered, responsibleUserId: s.responsible, orderReference: null, notes: null,
        useCase: 'production_unforeseen', useCaseJustification: 'Campaña con más actividad de la habitual.', workdayType: 'full',
        schedule: conHoras(horarioDeTurno(TURNO[s.horario]).days), legalChecks: null,
        preCpd: s.status === 'new'
          ? preCpdVacio()
          : {
              ...preCpdVacio(), status: enviado ? 'sent' : 'reviewed', generatedAt: `${s.created}T11:00:00.000Z`, generatedByName: quien,
              sentAt: `${s.created}T12:00:00.000Z`, sentByName: quien, reviewedAt: enviado ? null : `${s.created}T16:00:00.000Z`,
            },
        createdAt: `${s.created}T09:00:00.000Z`, createdByName: quien, updatedAt: `${s.created}T09:00:00.000Z`,
        cancelledAt: s.status === 'cancelled' ? '2026-09-01T09:00:00.000Z' : null, closedAt: s.status === 'closed' ? '2026-10-01T09:00:00.000Z' : null,
      };
    });
    estado = { peticiones, siguiente: 53 };
  }
  return estado;
}

async function registro(requestId: string) {
  const r = (await datos()).peticiones.find((x) => x.id === requestId);
  if (!r) throw new ApiError(404, 'no_encontrado', 'La petición no existe o no tienes acceso');
  return r;
}

const ACTIVAS: ServiceRequestStatus[] = ['new', 'publishing', 'selecting', 'covered', 'in_progress'];
const diasHasta = (iso: string | null) => (iso ? Math.round((new Date(`${iso}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000) : null);

/** Las comprobaciones del CPD previo, como la API. */
function comprobaciones(r: Registro): PreCpdCheck[] {
  const supuesto = SUPUESTOS.find((x) => x.code === r.useCase);
  const meses = r.startDate && r.endDate ? (new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) / (30.4 * 86_400_000) : null;
  const c = (code: string, ok: boolean, blocking: boolean, message: string, field: string | null): PreCpdCheck => ({ code, ok, blocking, message, field });
  return [
    c('use_case', !!r.useCase && !!r.useCaseJustification?.trim(), true, 'Supuesto de utilización y su justificación', 'useCase'),
    c('client_center', !!r.clientCenterId || !!r.workplaceText, true, 'Centro de trabajo', 'clientCenterId'),
    c('start_date', !!r.startDate, true, 'Fecha de inicio', 'startDate'),
    c('schedule', r.schedule.some((d) => d.working), true, 'Al menos un día laborable en el horario', 'schedule'),
    c('tasks', !!r.tasks?.trim(), true, 'Tareas del puesto', 'tasks'),
    c('risks', !!r.risks?.trim(), true, 'Riesgos del puesto (vale «Sin riesgos específicos según la evaluación del cliente»)', 'risks'),
    c('ett_authorization', true, true, 'N.º de autorización de la ETT (Mi ETT → Datos legales)', null),
    c('ett_representative', true, true, 'Representante legal de la ETT, con su documento', null),
    c('salary_agreement', true, true, 'Salario no inferior al convenio publicado actual', null),
    c('end_date', !!r.endDate, false, 'Fecha de fin prevista', 'endDate'),
    c('duration', !supuesto?.maxMonths || meses === null || meses <= supuesto.maxMonths + 0.1, false, `Duración dentro del máximo orientativo del supuesto${supuesto?.maxMonths ? ` (${supuesto.maxMonths} meses)` : ''}`, 'endDate'),
    c('client_signer', !!r.clientSignerContactId, false, 'Contacto del cliente que firma los CPD', 'clientSignerContactId'),
    c('people', r.positionsCount <= r.quotePeople, false, 'Plazas del puesto, sin superar las personas del presupuesto', 'positionsCount'),
  ];
}

function cuentaPlazas(r: Registro) {
  const p = plazasDe(r);
  const n = (st: string) => p.filter((x) => x.status === st).length;
  return { open: n('open'), reserved: n('reserved'), covered: n('covered'), started: 0, left: 0, filled: n('covered') };
}

function resumen(r: Registro): ServiceRequestSummary {
  const dias = diasHasta(r.startDate);
  return {
    id: r.id, code: r.code, status: r.status, positionName: r.positionName, shiftName: r.shiftName, clientId: r.clientId, clientName: r.clientName,
    quoteId: r.quoteId, quoteCode: r.quoteCode, quoteVersionNumber: r.quoteVersionNumber, quotePositionId: r.quotePositionId, branchId: r.branchId,
    startDate: r.startDate, endDate: r.endDate, positionsCount: r.positionsCount,
    slots: cuentaPlazas(r),
    responsibleUserId: r.responsibleUserId, responsibleName: r.responsibleUserId ? (RESPONSABLES[r.responsibleUserId] ?? null) : null, daysToStart: dias,
    startsSoonUncovered: ACTIVAS.includes(r.status) && dias !== null && dias >= 0 && dias <= 7 && cuentaPlazas(r).filled < r.positionsCount,
    cancelReason: r.cancelReason, preCpdStatus: r.preCpd.status, createdAt: r.createdAt,
  };
}

async function ficha(r: Registro): Promise<ServiceRequest> {
  const vivas = (await datos()).peticiones.filter((x) => x.status !== 'cancelled');
  const delPuesto = vivas.filter((x) => x.quotePositionId === r.quotePositionId);
  const enPeticiones = delPuesto.reduce((t, x) => t + x.positionsCount, 0);
  const quote = (await acceptedQuotes()).find((q) => q.id === r.quoteId);
  const centro = centroPorId(r.clientCenterId);
  const firmante = contactoPorId(r.clientSignerContactId);
  const { quotePeople: _q, workplaceText, filled: _f, preCpd, ...base } = copia(r);
  const schedule = conHoras(r.schedule);
  return delay({
    ...base,
    ...resumen(r),
    schedule,
    weeklyHours: Math.round(schedule.reduce((t, d) => t + (d.hours ?? 0), 0) * 100) / 100,
    clientCenterName: centro?.name ?? workplaceText,
    clientSignerContactName: firmante?.name ?? null,
    clientSignerContactEmail: firmante?.email ?? null,
    clientSignerContactPhone: firmante?.phone ?? null,
    agreementCheck: r.conditions.agreementCategoryId && r.conditions.agreementPeriod
      ? {
          belowAgreement: false, categoryUnmatched: false,
          periods: [{ versionId: 'demo', from: r.conditions.agreementPeriod.from, to: r.conditions.agreementPeriod.to, categoryMatched: true, minimumSalaryHour: r.conditions.agreementMinimumSalaryHour, belowAgreement: false }],
        }
      : null,
    distribution: {
      quotePeople: r.quotePeople,
      inRequests: enPeticiones,
      missing: Math.max(0, r.quotePeople - enPeticiones),
      siblings: (r.status === 'cancelled' ? [...delPuesto, r] : delPuesto)
        .sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? '') || a.code.localeCompare(b.code))
        .map((x) => ({ id: x.id, code: x.code, shiftName: x.shiftName, startDate: x.startDate, endDate: x.endDate, positionsCount: x.positionsCount, filled: cuentaPlazas(x).filled, status: x.status, isThis: x.id === r.id })),
      otherPositions: (quote?.currentVersion.positions ?? [])
        .filter((p) => p.id !== r.quotePositionId)
        .map((p) => ({ quotePositionId: p.id, name: p.name, requests: vivas.filter((x) => x.quotePositionId === p.id).map((x) => ({ id: x.id, code: x.code })) }))
        .filter((p) => p.requests.length),
    },
    slotList: plazasDe(r),
    preCpd: { ...preCpd, checks: comprobaciones(r) },
    signedQuoteDocument: { documentId: `demo-presupuesto-${r.quoteId}`, name: `Presupuesto_${r.quoteCode}_v${r.quoteVersionNumber}_firmado.pdf`, kind: 'signed', date: (r.quoteAcceptedAt ?? r.createdAt).slice(0, 10) },
  });
}

function validar(d: { positionsCount?: number; startDate?: string | null; endDate?: string | null; status?: ServiceRequestStatus; cancelReason?: string | null }) {
  const errores: { path: string; message: string }[] = [];
  if (d.positionsCount !== undefined && !(Number.isInteger(d.positionsCount) && d.positionsCount >= 1)) errores.push({ path: 'positionsCount', message: 'Al menos una plaza' });
  if (d.endDate && d.startDate && d.endDate < d.startDate) errores.push({ path: 'endDate', message: 'El fin no puede ser antes del inicio' });
  if (d.status === 'cancelled' && !d.cancelReason?.trim()) errores.push({ path: 'cancelReason', message: 'Indica el motivo de la cancelación' });
  if (errores.length) throw new ApiError(422, 'validacion', errores[0].message, errores);
}

/** Si alguno de estos campos cambia después de generar el CPD previo, queda desactualizado. */
const CAMPOS_CPD = ['hazardousWork', 'clientCenterId', 'clientSignerContactId', 'tasks', 'qualification', 'risks', 'ppe', 'requiredLicenses', 'useCase', 'useCaseJustification', 'startDate', 'endDate', 'positionsCount', 'schedule', 'workdayType', 'shiftName'];

async function crear(d: ServiceRequestCreate, texto?: (code: string) => string): Promise<Registro> {
  validar(d);
  const q = (await acceptedQuotes()).find((x) => x.currentVersion.positions.some((p) => p.id === d.quotePositionId));
  if (!q) throw new ApiError(422, 'referencia_invalida', 'Las peticiones salen de un puesto de un presupuesto aceptado');
  const p = q.currentVersion.positions.find((x) => x.id === d.quotePositionId)!;
  const e = await datos();
  const { quotePositionId: _q, schedule, ...resto } = copia(d);
  const r: Registro = {
    id: newId(), code: `PET-${new Date().getFullYear()}-${String(e.siguiente++).padStart(4, '0')}`, status: 'new', cancelReason: null, ...deQuote(q, p),
    shiftName: null, startDate: null, endDate: null, filled: 0, responsibleUserId: YO.id, orderReference: null, notes: null,
    useCase: null, useCaseJustification: null, workdayType: 'full', schedule: conHoras(schedule ?? horarioDeTurno('Turno de mañana').days), legalChecks: null,
    preCpd: preCpdVacio(), createdAt: ahora(), createdByName: YO.name, updatedAt: ahora(), cancelledAt: null, closedAt: null,
    ...resto,
  };
  e.peticiones.unshift(r);
  log('request', r.id, null, 'create', texto ? texto(r.code) : `Petición ${r.code} creada desde el presupuesto ${q.code} v${q.currentVersion.versionNumber}`);
  return r;
}

const ESTADOS: Record<ServiceRequestStatus, string> = {
  new: 'Nueva', publishing: 'En difusión', selecting: 'En selección', covered: 'Cubierta', in_progress: 'En curso', closed: 'Cerrada', cancelled: 'Cancelada',
};

// ---------------------------------------------------------------------------
// Plazas ocupadas por candidaturas (fase 6, memoriaCandidatos.ts)
// ---------------------------------------------------------------------------

type Ocupante = { applicationId: string; candidateId: string; candidateName: string; status: 'reserved' | 'covered' };
/** Plazas ocupadas por una candidatura, por petición y número de plaza. Las `filled` de ejemplo van sin nombre. */
const ocupacion = new Map<string, Map<number, Ocupante>>();
function plazasDe(r: Registro) {
  const o = ocupacion.get(r.id) ?? new Map<number, Ocupante>();
  return Array.from({ length: r.positionsCount }, (_, i) => {
    const n = i + 1;
    const x = o.get(n);
    if (x) return { id: `${r.id}-${n}`, number: n, status: x.status, applicationId: x.applicationId, candidateName: x.candidateName, candidateId: x.candidateId };
    return { id: `${r.id}-${n}`, number: n, status: i < r.filled ? 'covered' : 'open', applicationId: null, candidateName: null, candidateId: null };
  });
}
/** Petición de ejemplo por código o id (para las candidaturas de memoriaCandidatos.ts). */
export async function peticionDemo(codeOrId: string) {
  return (await datos()).peticiones.find((x) => x.code === codeOrId || x.id === codeOrId) ?? null;
}
/** Reserva o cubre una plaza (la indicada o la primera libre) para una candidatura. Devuelve su número. */
export async function ocuparPlaza(requestId: string, slotId: string | null, ocupante: Ocupante): Promise<number> {
  const r = await registro(requestId);
  const o = ocupacion.get(r.id) ?? new Map<number, Ocupante>();
  ocupacion.set(r.id, o);
  const libres = plazasDe(r).filter((p) => p.status === 'open' || p.applicationId === ocupante.applicationId);
  const p = slotId ? libres.find((x) => x.id === slotId) : libres[0];
  if (!p) throw new ApiError(409, 'conflicto', slotId ? 'Esa plaza no está libre' : 'No quedan plazas por cubrir en esta petición');
  for (const [n, x] of o) if (x.applicationId === ocupante.applicationId) o.delete(n);
  o.set(p.number, ocupante);
  return p.number;
}
/** Libera la plaza de una candidatura. */
export function liberarPlaza(requestId: string, applicationId: string) {
  const o = ocupacion.get(requestId);
  if (o) for (const [n, x] of o) if (x.applicationId === applicationId) o.delete(n);
}

export function memoryRequestRepositories(): Pick<Repositories, 'requests'> {
  return {
    requests: {
      async list(q = {}) {
        const texto = q.q?.toLowerCase().trim();
        const lista = (await datos()).peticiones.filter(
          (r) =>
            (!texto || `${r.code} ${r.clientName} ${r.positionName} ${r.quoteCode}`.toLowerCase().includes(texto)) &&
            (!q.status || (q.status === 'active' ? ACTIVAS.includes(r.status) : r.status === q.status)) &&
            (!q.clientId || r.clientId === q.clientId) &&
            (!q.quoteId || r.quoteId === q.quoteId) &&
            (!q.responsibleUserId || r.responsibleUserId === q.responsibleUserId) &&
            (!q.branchId || r.branchId === q.branchId),
        );
        return page(lista.map(resumen).filter((x) => !q.startingSoon || x.startsSoonUncovered), q);
      },
      get: async (requestId) => ficha(await registro(requestId)),
      create: async (d) => ficha(await crear(d)),
      async createFromQuoteVersion(versionId, requests) {
        const q = (await acceptedQuotes()).find((x) => x.currentVersion.id === versionId);
        if (!q) throw new ApiError(409, 'conflicto', 'Solo se crean peticiones de una versión aceptada');
        if (!requests.length) throw new ApiError(422, 'validacion', 'Al menos una petición');
        if (requests.some((d) => !q.currentVersion.positions.some((p) => p.id === d.quotePositionId))) throw new ApiError(422, 'referencia_invalida', 'Ese puesto no es de esta versión');
        requests.forEach(validar);
        const creadas: Registro[] = [];
        for (const d of requests) creadas.push(await crear(d));
        return Promise.all(creadas.map(ficha));
      },
      async update(requestId, d) {
        const r = await registro(requestId);
        if (['closed', 'cancelled'].includes(r.status) && Object.keys(d).some((k) => !['status', 'cancelReason'].includes(k))) {
          throw new ApiError(409, 'conflicto', 'En una petición cerrada o cancelada solo se cambia el estado');
        }
        const status = d.status ?? r.status;
        validar({ ...r, ...d, status, cancelReason: d.cancelReason !== undefined ? d.cancelReason : r.cancelReason });
        const textos: string[] = [];
        const cambiaEstado = !!d.status && d.status !== r.status;
        if (cambiaEstado && d.status) textos.push(`Pasa a «${ESTADOS[d.status]}»${d.status === 'cancelled' ? `: ${d.cancelReason}` : ''}`);
        const cambios = copia(d);
        if (status !== 'cancelled') cambios.cancelReason = null;
        if (d.schedule) {
          cambios.schedule = conHoras(d.schedule);
          textos.push(`Horario guardado: ${(d.shiftName ?? r.shiftName ?? 'sin nombre').toLowerCase()}`);
        }
        const tocaCpd = Object.keys(d).some((k) => CAMPOS_CPD.includes(k));
        Object.assign(r, cambios, { updatedAt: ahora() });
        if (cambiaEstado) Object.assign(r, { cancelledAt: status === 'cancelled' ? ahora() : null, closedAt: status === 'closed' ? ahora() : null });
        if (d.clientCenterId !== undefined) r.workplaceText = null;
        if (tocaCpd && r.preCpd.status !== 'pending') r.preCpd.outdated = true;
        if (!textos.length) textos.push('Datos de la petición modificados');
        log('request', r.id, null, 'update', textos.join('. '));
        return ficha(r);
      },
      async duplicate(requestId, d) {
        const r = await registro(requestId);
        const nueva = await crear(
          {
            quotePositionId: r.quotePositionId, ...d, responsibleUserId: r.responsibleUserId, clientCenterId: r.clientCenterId, clientSignerContactId: r.clientSignerContactId,
            tasks: r.tasks, qualification: r.qualification, risks: r.risks, ppe: r.ppe, requiredLicenses: r.requiredLicenses, useCase: r.useCase,
            useCaseJustification: r.useCaseJustification, orderReference: r.orderReference, hazardousWork: r.hazardousWork,
          },
          (code) => `Petición ${code} creada duplicando ${r.code} con otro horario`,
        );
        nueva.workplaceText = r.workplaceText;
        return ficha(nueva);
      },
      async sources(q = {}) {
        const texto = q.q?.toLowerCase().trim();
        const vivas = (await datos()).peticiones.filter((r) => r.status !== 'cancelled');
        const lista = (await acceptedQuotes())
          .filter((x) => !texto || `${x.code} ${x.clientName ?? ''} ${x.clientTaxId ?? ''} ${x.currentVersion.title ?? ''}`.toLowerCase().includes(texto))
          .map((x) => {
            const positions = x.currentVersion.positions.map((p) => {
              const deEste = vivas.filter((r) => r.quotePositionId === p.id);
              const enPeticiones = deEste.reduce((t, r) => t + r.positionsCount, 0);
              return {
                quotePositionId: p.id, name: p.name, categoryName: p.agreementCategoryName ?? p.customCategoryName, people: p.people, peopleInRequests: enPeticiones,
                peopleWithoutRequest: Math.max(0, p.people - enPeticiones), rateHour: p.calculation?.rateHour ?? p.hourlyRate,
                requests: deEste.map((r) => ({ id: r.id, code: r.code, shiftName: r.shiftName, positionsCount: r.positionsCount, status: r.status })),
              };
            });
            return {
              quoteId: x.id, quoteCode: x.code, versionId: x.currentVersion.id, versionNumber: x.currentVersion.versionNumber, title: x.currentVersion.title,
              clientId: x.clientId ?? '', clientName: x.clientName ?? '', clientTaxId: x.clientTaxId, acceptedAt: x.currentVersion.acceptedAt,
              people: positions.reduce((t, p) => t + p.people, 0), peopleInRequests: positions.reduce((t, p) => t + p.peopleInRequests, 0),
              peopleWithoutRequest: positions.reduce((t, p) => t + p.peopleWithoutRequest, 0), positions,
            };
          })
          .sort((a, b) => Number(b.peopleWithoutRequest > 0) - Number(a.peopleWithoutRequest > 0) || (b.acceptedAt ?? '').localeCompare(a.acceptedAt ?? ''));
        return page(lista, q);
      },
      useCases: async () => delay(SUPUESTOS),
      async generatePreCpd(requestId) {
        const r = await registro(requestId);
        const fallan = comprobaciones(r).filter((c) => c.blocking && !c.ok);
        if (fallan.length) throw new ApiError(409, 'cpd_incompleto', 'Faltan datos para el CPD previo', fallan.map((c) => ({ path: c.field ?? c.code, message: c.message })));
        Object.assign(r.preCpd, { status: 'generated', outdated: false, generatedAt: ahora(), generatedByName: YO.name, sentAt: null, sentTo: null, reviewedAt: null });
        log('request', r.id, null, 'update', 'CPD previo generado');
        // En la demo no hay PDF: este documento no existe y la pantalla lo dice al descargarlo.
        return delay({ documentId: `demo-cpd-${r.id}`, name: `CPD_previo_${r.code}.pdf` });
      },
      async markPreCpdSent(requestId, d = {}) {
        const r = await registro(requestId);
        if (r.preCpd.status === 'pending' || r.preCpd.outdated) throw new ApiError(409, 'conflicto', 'Genera el CPD previo (o vuelve a generarlo) antes de marcarlo como enviado');
        Object.assign(r.preCpd, { status: 'sent', sentAt: ahora(), sentByName: YO.name, sentTo: d.sentTo ?? null, reviewedAt: null });
        log('request', r.id, null, 'update', `CPD previo enviado${d.sentTo ? ` a ${d.sentTo}` : ''}`);
        return ficha(r);
      },
      async markPreCpdReviewed(requestId) {
        const r = await registro(requestId);
        if (r.preCpd.status !== 'sent') throw new ApiError(409, 'conflicto', 'Solo se marca como revisado un CPD previo enviado');
        Object.assign(r.preCpd, { status: 'reviewed', reviewedAt: ahora() });
        log('request', r.id, null, 'update', 'CPD previo revisado por el cliente');
        return ficha(r);
      },
    },
  };
}
