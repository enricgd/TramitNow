// Traducción entre la forma de la API (Quote, en inglés) y la de PresupuestosView.jsx (el «presupuesto» del
// diseñador, en español). La vista sigue trabajando con su forma; este fichero es el único que conoce las dos.
import { calcularPuesto } from '../../data/calculoPresupuestos';
import type {
  Quote,
  QuoteCostBase,
  QuoteCostConcept,
  QuoteCostKind,
  QuoteExtra,
  QuoteInput,
  QuotePosition,
  QuotePositionBreakdown,
  QuoteStatus,
  QuoteSummary,
} from '../../data';

// ---------------------------------------------------------------------------
// Estados
// ---------------------------------------------------------------------------

export const ESTADOS: Record<QuoteStatus, string> = {
  draft: 'Borrador',
  in_preparation: 'En preparación',
  sent: 'Enviado a Cliente',
  pending_signature: 'Pendiente de Firma',
  accepted: 'Firmado / Aceptado',
  rejected: 'Rechazado',
  obsolete: 'Obsoleto',
};
export const estadoApi = (texto: string) => (Object.entries(ESTADOS).find(([, t]) => t === texto)?.[0] ?? 'draft') as QuoteStatus;
const editable = (s: QuoteStatus) => s === 'draft' || s === 'in_preparation';

// ---------------------------------------------------------------------------
// Costes internos y extras
// ---------------------------------------------------------------------------

const TIPOS: Record<QuoteCostKind, string> = { percentage: 'porcentaje', per_hour: 'fijo_hora', per_month: 'fijo_mes', per_day: 'fijo_jornada' };
const BASES: Record<QuoteCostBase, string> = {
  gross_hourly_salary: 'salario_bruto_hora',
  total_salary_cost: 'coste_salarial_total',
  contribution_base: 'base_ss_total',
  hourly_rate: 'tarifa_venta_hora',
  effective_hours: 'horas_reales_efectivas',
};
const inverso = <T extends string>(m: Record<T, string>, v: string, defecto: T) => (Object.entries(m).find(([, x]) => x === v)?.[0] ?? defecto) as T;

type Vacio = number | string | null | undefined;
const num = (v: Vacio): number | null => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));
const txt = (v: Vacio) => (v === null || v === undefined ? '' : v);

type ConceptoVista = {
  id: string; nombre: string; tipo: string; tipoCustom: string; valor: number | string; baseCalculo: string; baseCalculoCustom: string;
  esObligatorioLegal: boolean; recomendado?: boolean; descripcion: string;
};
export const conceptoVista = (c: QuoteCostConcept): ConceptoVista => ({
  id: c.id, nombre: c.name, tipo: TIPOS[c.kind], tipoCustom: '', valor: c.value, baseCalculo: BASES[c.base], baseCalculoCustom: '',
  esObligatorioLegal: c.legal, recomendado: c.alwaysIncluded, descripcion: c.description ?? '',
});
export const conceptoApi = (c: ConceptoVista): QuoteCostConcept => ({
  id: c.id, name: c.nombre, kind: inverso(TIPOS, c.tipo, 'percentage'), value: Number(c.valor) || 0, base: inverso(BASES, c.baseCalculo, 'gross_hourly_salary'),
  legal: !!c.esObligatorioLegal, alwaysIncluded: !!c.recomendado, description: c.descripcion || null,
});

type ExtraVista = {
  id: string; concepto: string; coefSalario: number | string; coefTarifa: number | string; recargoTarifa?: number | string; tarifaManual?: number | string;
  salarioManual?: number | string; mostrar: boolean; propio?: boolean;
};
export const extraVista = (x: QuoteExtra): ExtraVista => ({
  id: x.id, concepto: x.name, coefSalario: x.salaryCoefficient ?? '', coefTarifa: txt(x.rateCoefficient), recargoTarifa: txt(x.rateSurchargePercent),
  tarifaManual: txt(x.rateOverride), salarioManual: txt(x.salaryOverride), mostrar: x.showInProposal, propio: x.custom,
});
export const extraApi = (x: ExtraVista): QuoteExtra => ({
  id: x.id, name: x.concepto, salaryCoefficient: num(x.coefSalario), salaryOverride: num(x.salarioManual), rateCoefficient: num(x.coefTarifa),
  rateSurchargePercent: num(x.recargoTarifa), rateOverride: num(x.tarifaManual), showInProposal: !!x.mostrar, custom: !!x.propio,
});

// ---------------------------------------------------------------------------
// Puestos
// ---------------------------------------------------------------------------

type AjusteVista = { aplica?: boolean; valor?: number | string; porcentaje?: number | string; importe?: number | string };
export type PuestoVista = {
  id: string; nombre: string; convenio: string; convenioCustom: string; categoria: string; categoriaCustom: string; grupoNivel: string; grupoNivelCustom: string;
  salarioBaseAnual: number; plusConvenioMes: number; pagasAnuales: number; horasAnuales: number; horasDiaCalculo: number; coeficienteParcialidad: number;
  tarifaHoraOfertada: number | string; personas: number | string; horasPersona: number | string; tarifaJornadaManual: null; vacacionesDiasAnio: number;
  extras: ExtraVista[]; conceptos?: Record<string, AjusteVista>; descripcionTareas: string;
  margenTipo?: string; margenObjetivo?: number | string; margenImporte?: number | string;
  /** Campos retributivos cambiados a mano; versión del convenio usada; salario mínimo de la tabla. */
  camposManuales?: string[]; versionConvenio?: string | null; minimoConvenio?: number | null;
};

export const puestoVista = (p: QuotePosition): PuestoVista => ({
  id: p.id, nombre: p.name,
  convenio: p.agreementId ?? (p.customAgreement ? 'otro' : ''), convenioCustom: p.customAgreement ?? '',
  categoria: p.categoryId ?? (p.customCategory ? 'otro' : ''), categoriaCustom: p.customCategory ?? '',
  grupoNivel: p.level ?? (p.customLevel ? 'otro' : ''), grupoNivelCustom: p.customLevel ?? '',
  salarioBaseAnual: p.baseAnnualSalary, plusConvenioMes: p.monthlyBonus, pagasAnuales: p.annualPayments, horasAnuales: p.annualHours,
  horasDiaCalculo: p.dailyHours, coeficienteParcialidad: p.partTimeFactor, tarifaHoraOfertada: p.rate ?? '', personas: p.people,
  horasPersona: p.hoursPerPerson, tarifaJornadaManual: null, vacacionesDiasAnio: p.vacationDays, extras: p.extras.map(extraVista),
  conceptos: Object.fromEntries(p.costs.map((c) => [c.conceptId, { aplica: c.applies, porcentaje: txt(c.percent), importe: txt(c.amount) }])),
  descripcionTareas: p.tasks ?? '',
  margenTipo: p.marginMode === 'amount' ? 'importe' : 'porcentaje', margenObjetivo: txt(p.marginPercent), margenImporte: txt(p.marginAmount),
  camposManuales: p.manualFields, versionConvenio: p.agreementVersionId, minimoConvenio: p.agreementMinimumAnnual,
});

export function puestoApi(p: PuestoVista, conceptos: ConceptoVista[]): QuotePosition {
  const otro = (v: string) => !v || v === 'otro';
  return {
    id: p.id, name: p.nombre,
    agreementId: otro(p.convenio) ? null : p.convenio, agreementVersionId: p.versionConvenio ?? null, customAgreement: p.convenio === 'otro' ? p.convenioCustom || null : null,
    categoryId: otro(p.categoria) ? null : p.categoria, customCategory: p.categoria === 'otro' ? p.categoriaCustom || null : null,
    level: otro(p.grupoNivel) ? null : p.grupoNivel, customLevel: p.grupoNivel === 'otro' ? p.grupoNivelCustom || null : null,
    baseAnnualSalary: Number(p.salarioBaseAnual) || 0, monthlyBonus: Number(p.plusConvenioMes) || 0, annualPayments: Number(p.pagasAnuales) || 12,
    annualHours: Number(p.horasAnuales) || 1784, dailyHours: Number(p.horasDiaCalculo) || 8, partTimeFactor: Number(p.coeficienteParcialidad) || 1,
    vacationDays: Number(p.vacacionesDiasAnio) || 30, manualFields: p.camposManuales ?? [], agreementMinimumAnnual: p.minimoConvenio ?? null,
    rate: num(p.tarifaHoraOfertada), people: Number(p.personas) || 1, hoursPerPerson: Number(p.horasPersona) || 0,
    marginMode: p.margenTipo === 'importe' && num(p.margenImporte) !== null ? 'amount' : num(p.margenObjetivo) !== null ? 'percentage' : null,
    marginPercent: num(p.margenObjetivo), marginAmount: num(p.margenImporte),
    costs: conceptos
      .filter((c) => !c.esObligatorioLegal && p.conceptos?.[c.id])
      .map((c) => {
        const a = p.conceptos![c.id];
        // Ajustes guardados con un solo valor (en la unidad del concepto).
        const porcentaje = num(a.porcentaje) ?? (c.tipo === 'porcentaje' ? num(a.valor) : null);
        const importe = porcentaje === null ? (num(a.importe) ?? (c.tipo === 'fijo_hora' ? num(a.valor) : null)) : null;
        return { conceptId: c.id, applies: a.aplica !== false, percent: porcentaje, amount: importe };
      }),
    extras: (p.extras ?? []).map(extraApi),
    tasks: p.descripcionTareas || null,
  };
}

// ---------------------------------------------------------------------------
// Cálculo: lo del servidor si el puesto no ha cambiado; si no, la vista previa con el módulo de cálculo.
// ---------------------------------------------------------------------------

type Margen = { tipo: string; valor: number } | number | undefined;
const margenApi = (m: Margen) =>
  typeof m === 'object' && m ? { mode: m.tipo === 'importe' ? ('amount' as const) : ('percentage' as const), value: Number(m.valor) || 0 } : { mode: 'percentage' as const, value: Number(m ?? 18) };

// Desglose que ha dado el servidor para un puesto, válido mientras el puesto y los costes sean los mismos objetos.
const delServidor = new WeakMap<object, { conceptos: object; desglose: QuotePositionBreakdown }>();

/** La «economía» de un puesto en la forma que pinta la vista (la de su antigua función de cálculo). */
export function economiaPuesto(pos: PuestoVista, conceptos: ConceptoVista[], margen: Margen) {
  const guardado = delServidor.get(pos);
  const d = guardado && guardado.conceptos === conceptos ? guardado.desglose : calcularPuesto(puestoApi(pos, conceptos), conceptos.map(conceptoApi), margenApi(margen));
  return {
    salarioBrutoHora: d.salaryHour,
    salarioBrutoAnual: d.annualGrossSalary,
    costeTotalEmpresaHora: d.costHour,
    totalCosteSocialHora: d.socialCostHour,
    margenEuroHora: d.marginHour,
    margenPorcentaje: d.marginPercent,
    tarifaJornadaCalculada: d.dailyRate,
    costeJornada: d.dailyCost,
    desgloseConceptos: d.lines.map((l) => ({ id: l.conceptId, nombre: l.name, importeHora: l.amountHour, esLegal: l.legal, propio: l.custom })),
    tarifaPVP: d.rate,
    horasDia: d.dailyHours,
    margenObjetivo: d.targetMarginPercent,
    margenObjetivoImporte: d.targetMarginAmount,
    margenObjetivoTipo: d.targetMarginMode === 'amount' ? 'importe' : 'porcentaje',
    tarifaSugerida: d.suggestedRate,
    extras: d.extras.map((x) => ({ ...extraVista(x), salarioHora: x.salaryHour, tarifaHora: x.rateHour, recargoEquivalente: x.surchargePercent })),
    personas: d.people,
    horasPersona: d.hoursPerPerson,
    horasTotales: d.totalHours,
    facturacionTotal: d.billing,
    costeServicio: d.serviceCost,
    margenServicio: d.serviceMargin,
    bajoConvenio: d.belowAgreement,
  };
}

// ---------------------------------------------------------------------------
// Presupuesto
// ---------------------------------------------------------------------------

export type Nombres = {
  /** Nombre de cada comercial por id de usuario, y al revés. */
  comercial: (userId: string | null) => string;
  formaPago: (id: string | null) => string;
};

export function presupuestoVista(q: Quote, n: Nombres) {
  const conceptos = q.costConcepts.map(conceptoVista);
  const posiciones = q.positions.map(puestoVista);
  posiciones.forEach((p) => q.breakdowns[p.id] && delServidor.set(p, { conceptos, desglose: q.breakdowns[p.id] }));
  const pet = q.requests;
  return {
    _id: q.id,
    _versionId: q.versionId,
    id: q.code,
    codigoVersion: `${q.code}-v${q.versionNumber}`,
    versionNumero: q.versionNumber,
    titulo: q.title,
    empresaId: q.clientId ?? '',
    cliente: q.clientName ?? '',
    cif: q.clientTaxId ?? '',
    sector: q.clientSector ?? '',
    ciudad: q.clientCity ?? '',
    convenioEmpresa: q.clientAgreementId ?? '',
    contactoId: q.contactId ?? '',
    contacto: q.contactName ?? '',
    emailContacto: q.contactEmail ?? '',
    telefonoContacto: q.contactPhone ?? '',
    comercial: q.salesName ?? n.comercial(q.salesUserId),
    estado: ESTADOS[q.status],
    esEditableDirecto: editable(q.status),
    fechaEmision: q.issueDate,
    fechaValidez: q.validUntil,
    fechaInicioPrevista: q.plannedStartDate ?? '',
    duracionMeses: q.durationMonths ?? '',
    moneda: q.currency,
    modalidad: q.modality ?? '',
    modalidadCustom: '',
    iva: q.vatRate ?? '21',
    ivaCustom: '',
    formaPago: q.paymentMethodId ?? (q.paymentMethodText ? 'otro' : ''),
    formaPagoCustom: q.paymentMethodText ?? '',
    garantiaSustitucion: q.replacementGuarantee ?? '',
    garantiaSustitucionCustom: '',
    observacionesComerciales: q.commercialNotes ?? '',
    margenObjetivo: q.marginPercent,
    margenTipo: q.marginMode === 'amount' ? 'importe' : 'porcentaje',
    margenImporte: q.marginAmount ?? '',
    extrasDefecto: q.defaultExtras.map(extraVista),
    conceptosEscandallo: conceptos,
    posiciones,
    auditoria: [] as { id: string; fecha: string; usuario: string; accion: string; detalle: string }[],
    aprobacion: q.approval
      ? { estado: { pending: 'pendiente', approved: 'aprobada', changes_requested: 'rechazada' }[q.approval.status], motivo: q.approval.reason ?? '' }
      : undefined,
    motivoRechazo: q.rejection?.reason,
    notasRechazo: q.rejection?.notes ?? '',
    obsoleto: q.obsolete ? { motivo: q.obsolete.reason, fecha: q.obsolete.at.slice(0, 10), sustituidoPor: q.obsolete.replacedByCode ?? '' } : undefined,
    creadoDesde: q.createdFromCode ?? undefined,
    peticionCreada: pet.length ? (pet.length === 1 ? pet[0].code : `${pet[0].code} a ${pet[pet.length - 1].code.slice(-4)}`) : undefined,
    peticionesCreadas: pet.map((r) => ({ codigo: r.code, posId: r.positionId, turno: r.shift, plazas: r.places })),
    diasSinRespuesta: q.daysWithoutResponse ?? undefined,
    documentosAnadidos: [] as { id: string; tipo: string; nombre: string; archivo: string; interno: boolean; fecha: string; autor: string }[],
  };
}
export type PresupuestoVista = ReturnType<typeof presupuestoVista>;

/** Lo que se guarda del formulario de la vista. `ids`: comercial y forma de pago por nombre o id. */
export function presupuestoApi(v: PresupuestoVista, ids: { comercial: (nombre: string) => string | null }): QuoteInput {
  const conceptos = v.conceptosEscandallo;
  return {
    title: v.titulo,
    clientId: v.empresaId || null,
    contactId: v.contactoId || null,
    contactName: v.contacto || null,
    contactEmail: v.emailContacto || null,
    contactPhone: v.telefonoContacto || null,
    salesUserId: ids.comercial(v.comercial),
    issueDate: v.fechaEmision,
    validUntil: v.fechaValidez,
    plannedStartDate: v.fechaInicioPrevista || null,
    durationMonths: num(v.duracionMeses),
    currency: v.moneda || 'EUR',
    modality: v.modalidad === 'otro' ? v.modalidadCustom || null : v.modalidad || null,
    vatRate: v.iva === 'otro' ? v.ivaCustom || null : v.iva || null,
    paymentMethodId: v.formaPago && v.formaPago !== 'otro' ? v.formaPago : null,
    paymentMethodText: v.formaPago === 'otro' ? v.formaPagoCustom || null : null,
    replacementGuarantee: v.garantiaSustitucion === 'otro' ? v.garantiaSustitucionCustom || null : v.garantiaSustitucion || null,
    commercialNotes: v.observacionesComerciales || null,
    marginMode: v.margenTipo === 'importe' ? 'amount' : 'percentage',
    marginPercent: Number(v.margenObjetivo) || 0,
    marginAmount: num(v.margenImporte),
    costConcepts: conceptos.map(conceptoApi),
    defaultExtras: (v.extrasDefecto ?? []).map(extraApi),
    positions: v.posiciones.map((p) => puestoApi(p, conceptos)),
  };
}

/** Fila del listado de la vista. */
export const filaVista = (q: QuoteSummary) => ({
  _id: q.id,
  id: q.code,
  importe: q.billing,
  titulo: q.title,
  cliente: q.clientName ?? 'Sin empresa',
  empresaId: q.clientId ?? '',
  comercial: q.salesName ?? '—',
  sucursalId: q.branchId ?? '',
  estado: ESTADOS[q.status],
  puestosCount: q.positions,
  tarifaMedia: q.averageRate,
  margenPct: q.marginPercent,
  fechaValidez: q.validUntil,
  esEditableDirecto: editable(q.status),
  diasSinRespuesta: q.daysWithoutResponse ?? undefined,
  motivoRechazo: q.rejection?.reason,
  peticionCreada: q.requests > 0 ? `${q.requests} ${q.requests === 1 ? 'petición' : 'peticiones'}` : undefined,
});
