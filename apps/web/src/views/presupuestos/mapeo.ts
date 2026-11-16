// Traducción entre la forma de la API (contrato de la fase 4, en inglés) y la de PresupuestosView.jsx (el
// «presupuesto» del diseñador, en español). La vista sigue trabajando con su forma; este fichero es el único que
// conoce las dos. El cálculo es el módulo puro de la API (data/calculoPresupuestos.ts).
import { DEFAULT_SS_RATES, SEVERANCE_DAYS_PER_YEAR, calculatePosition, totalSsRate } from '../../data/calculoPresupuestos';
import type {
  PositionResult,
  Quote,
  QuoteCostConcept,
  QuoteExtra,
  QuoteMargin,
  QuotePosition,
  QuotePositionInput,
  QuoteStatus,
  QuoteSummary,
  QuoteVersion,
  QuoteVersionInput,
  SocialSecurityRates,
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
  superseded: 'Sustituido',
  obsolete: 'Obsoleto',
};
export const estadoApi = (texto: string) => (Object.entries(ESTADOS).find(([, t]) => t === texto)?.[0] ?? 'draft') as QuoteStatus;
const editable = (s: QuoteStatus) => s === 'draft' || s === 'in_preparation';

type Vacio = number | string | null | undefined;
/** Códigos de la API: minúsculas, cifras y _ (los de la vista pueden llevar guiones, p. ej. `c-123`). */
export const codigo = (id: string) =>
  /^[a-z][a-z0-9_]{0,39}$/.test(id) ? id : `c_${id.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+/, '')}`.slice(0, 40);
const num = (v: Vacio): number | null => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));
const txt = (v: Vacio) => (v === null || v === undefined ? '' : v);

// Listas fijas de la vista (CATALOGOS de PresupuestosView.jsx): lo que no está en ellas se guarda como texto («Otro»).
const MODALIDADES = ['puesta_disposicion_estandar', 'pico_produccion', 'sustitucion_it', 'servicio_continuado', 'master_vendor'];
const GARANTIAS = ['garantia_4h', 'garantia_24h', 'garantia_48h', 'garantia_express_2h', 'sin_garantia'];
const GRUPOS = ['g1', 'g2', 'g3', 'g4', 'g5'];
const deLista = (valor: string | null, lista: string[]) => (!valor ? ['', ''] : lista.includes(valor) ? [valor, ''] : ['otro', valor]);
const aLista = (valor: string, otro: string) => (valor === 'otro' ? otro || null : valor || null);

// ---------------------------------------------------------------------------
// Costes internos: los legales (Seguridad Social e indemnización) salen de la ley y de los tipos de la versión;
// los demás son los costes internos del presupuesto.
// ---------------------------------------------------------------------------

type ConceptoVista = {
  id: string; nombre: string; tipo: string; tipoCustom: string; valor: number | string; baseCalculo: string; baseCalculoCustom: string;
  esObligatorioLegal: boolean; recomendado?: boolean; descripcion: string; tasas?: SocialSecurityRates;
};
const SS = 'seguridad_social';
const INDEMNIZACION = 'indemnizacion';
const redondear = (n: number) => Math.round(n * 100) / 100;

export function conceptosVista(v: Pick<QuoteVersion, 'ssRates' | 'costConcepts'>): ConceptoVista[] {
  const t = v.ssRates;
  return [
    {
      id: SS, nombre: 'Seguridad Social de la empresa', tipo: 'porcentaje', tipoCustom: '', valor: redondear(totalSsRate(t)), baseCalculo: 'salario_bruto_hora',
      baseCalculoCustom: '', esObligatorioLegal: true, tasas: t,
      descripcion: `Contingencias comunes ${t.commonContingencies} %, desempleo ${t.unemployment} %, FOGASA ${t.fogasa} %, FP ${t.vocationalTraining} %, MEI ${t.mei} % y AT/EP ${t.atEp} % (según el CNAE del cliente).`,
    },
    {
      id: INDEMNIZACION, nombre: `Indemnización fin de contrato (${SEVERANCE_DAYS_PER_YEAR} días por año)`, tipo: 'porcentaje', tipoCustom: '',
      valor: redondear((SEVERANCE_DAYS_PER_YEAR / 365) * 100), baseCalculo: 'salario_bruto_hora', baseCalculoCustom: '', esObligatorioLegal: true,
      descripcion: 'Doce días de salario por año trabajado al acabar el contrato de puesta a disposición (art. 49.1.c ET).',
    },
    ...v.costConcepts.map((c) => ({
      id: c.code, nombre: c.name, tipo: c.mode === 'percent' ? 'porcentaje' : 'fijo_hora', tipoCustom: '', valor: c.value, baseCalculo: 'salario_bruto_hora',
      baseCalculoCustom: '', esObligatorioLegal: false, recomendado: c.required, descripcion: c.description ?? '',
    })),
  ];
}
const tasasDe = (conceptos: ConceptoVista[]) => conceptos.find((c) => c.id === SS)?.tasas ?? DEFAULT_SS_RATES;
const costesApi = (conceptos: ConceptoVista[]): QuoteCostConcept[] =>
  conceptos
    .filter((c) => !c.esObligatorioLegal)
    .map((c) => ({ code: codigo(c.id), name: c.nombre, mode: c.tipo === 'porcentaje' ? 'percent' : 'per_hour', value: Number(c.valor) || 0, required: !!c.recomendado, description: c.descripcion || null }));

/** Costes de un presupuesto nuevo (los de siempre de la API: Seguridad Social, indemnización y los 3 internos). */
export const conceptosNuevos = () =>
  conceptosVista({
    ssRates: { ...DEFAULT_SS_RATES },
    costConcepts: [
      { code: 'absenteeism', name: 'Provisión de absentismo y contingencias', mode: 'percent', value: 2.15, required: true, description: 'Cobertura estimada de bajas de corta duración y permisos retribuidos según convenio.' },
      { code: 'ppe', name: 'EPIs', mode: 'per_hour', value: 0.18, required: true, description: 'Equipos de protección individual que necesite el puesto.' },
      { code: 'medical', name: 'Revisión médica inicial y formación PRL', mode: 'per_hour', value: 0.22, required: true, description: 'Acreditación según Art. 19 LPRL y vigilancia médica.' },
    ],
  });

// ---------------------------------------------------------------------------
// Extras
// ---------------------------------------------------------------------------

type ExtraVista = {
  id: string; concepto: string; coefSalario: number | string; coefTarifa?: number | string; recargoTarifa?: number | string; tarifaManual?: number | string;
  salarioManual?: number | string; mostrar: boolean; propio?: boolean; suplemento?: number | null;
};
export const extraVista = (x: QuoteExtra): ExtraVista => ({
  id: x.code, concepto: x.name, coefSalario: x.salaryCoefficient ?? '', coefTarifa: '', recargoTarifa: txt(x.rateSurchargePercent), tarifaManual: txt(x.ratePerHour),
  salarioManual: txt(x.salaryPerHour), mostrar: x.print, propio: x.custom, suplemento: x.salarySupplementPerHour,
});
export const extraApi = (x: ExtraVista): QuoteExtra => ({
  // Para el salario cuenta uno: el €/h propio, el complemento o el coeficiente.
  code: codigo(x.id), name: x.concepto,
  salaryCoefficient: num(x.salarioManual) === null && x.suplemento == null ? num(x.coefSalario) : null,
  salaryPerHour: num(x.salarioManual), salarySupplementPerHour: num(x.salarioManual) === null ? (x.suplemento ?? null) : null,
  rateSurchargePercent: num(x.recargoTarifa), ratePerHour: num(x.recargoTarifa) === null ? num(x.tarifaManual) : null, print: !!x.mostrar, custom: !!x.propio,
});

// ---------------------------------------------------------------------------
// Puestos
// ---------------------------------------------------------------------------

/** Campos retributivos: nombre en la vista → en la API (para `manualFields`). */
export const CAMPOS_RETRIBUTIVOS: Record<string, keyof QuotePosition> = {
  salarioBaseAnual: 'annualBaseSalary',
  plusConvenioMes: 'monthlyBonus',
  pagasAnuales: 'annualPayments',
  horasAnuales: 'annualHours',
  horasDiaCalculo: 'hoursPerDay',
  vacacionesDiasAnio: 'vacationDays',
};
const aVista = (campos: string[]) => campos.map((c) => Object.entries(CAMPOS_RETRIBUTIVOS).find(([, a]) => a === c)?.[0] ?? c);

type AjusteVista = { aplica?: boolean; valor?: number | string; porcentaje?: number | string; importe?: number | string };
export type PuestoVista = {
  id: string; nombre: string; convenio: string; convenioCustom: string; categoria: string; categoriaCustom: string; grupoNivel: string; grupoNivelCustom: string;
  salarioBaseAnual: number; plusConvenioMes: number; pagasAnuales: number; horasAnuales: number; horasDiaCalculo: number; coeficienteParcialidad: number;
  tarifaHoraOfertada: number | string; personas: number | string; horasPersona: number | string; tarifaJornadaManual: null; vacacionesDiasAnio: number;
  tipoVacaciones?: 'naturales' | 'laborables';
  extras: ExtraVista[]; conceptos?: Record<string, AjusteVista>; descripcionTareas: string;
  margenTipo?: string; margenObjetivo?: number | string; margenImporte?: number | string;
  /** Campos retributivos cambiados a mano; versión del convenio usada y su vigencia; salario mínimo por hora de la tabla. */
  camposManuales?: string[]; versionConvenio?: string | null; periodoConvenio?: { from: string; to: string | null } | null; minimoConvenioHora?: number | null;
  /** Para saber qué ha cambiado al guardar. */
  _guardado?: string;
};

export function puestoVista(p: QuotePosition): PuestoVista {
  const [grupoNivel, grupoNivelCustom] = deLista(p.level, GRUPOS);
  const vista: PuestoVista = {
    id: p.id, nombre: p.name,
    convenio: p.collectiveAgreementId ?? 'otro', convenioCustom: '',
    categoria: p.agreementCategoryId ?? (p.customCategoryName ? 'otro' : ''), categoriaCustom: p.customCategoryName ?? '',
    grupoNivel, grupoNivelCustom,
    salarioBaseAnual: p.annualBaseSalary, plusConvenioMes: p.monthlyBonus, pagasAnuales: p.annualPayments ?? 14, horasAnuales: p.annualHours,
    horasDiaCalculo: p.hoursPerDay, coeficienteParcialidad: 1, tarifaHoraOfertada: p.hourlyRate ?? '', personas: p.people, horasPersona: p.hoursPerPerson,
    tarifaJornadaManual: null, vacacionesDiasAnio: p.vacationDays, tipoVacaciones: p.vacationDaysType, extras: p.extras.map(extraVista),
    conceptos: Object.fromEntries(p.costs.map((c) => [c.code, { aplica: c.applies, porcentaje: txt(c.percent), importe: txt(c.perHour) }])),
    descripcionTareas: p.description ?? '',
    margenTipo: p.margin?.mode === 'per_hour' ? 'importe' : 'porcentaje',
    margenObjetivo: p.margin?.mode === 'percent' ? p.margin.value : '', margenImporte: p.margin?.mode === 'per_hour' ? p.margin.value : '',
    camposManuales: aVista(p.manualFields), versionConvenio: p.agreementVersionId, periodoConvenio: p.agreementPeriod, minimoConvenioHora: p.agreementMinimumSalaryHour,
  };
  vista._guardado = JSON.stringify(puestoApi(vista, []));
  return vista;
}

const margenPuesto = (p: PuestoVista): QuoteMargin | null =>
  p.margenTipo === 'importe' && num(p.margenImporte) !== null
    ? { mode: 'per_hour', value: num(p.margenImporte)! }
    : num(p.margenObjetivo) !== null
      ? { mode: 'percent', value: num(p.margenObjetivo)! }
      : null;

/** Lo que se guarda de un puesto. `conceptos`: los del presupuesto, para los ajustes guardados con un solo valor. */
export function puestoApi(p: PuestoVista, conceptos: ConceptoVista[]): QuotePositionInput {
  const otro = (v: string) => !v || v === 'otro';
  return {
    name: p.nombre,
    description: p.descripcionTareas || null,
    collectiveAgreementId: otro(p.convenio) ? null : p.convenio,
    agreementCategoryId: otro(p.categoria) ? null : p.categoria,
    customCategoryName: p.categoria === 'otro' ? p.categoriaCustom || null : null,
    level: aLista(p.grupoNivel, p.grupoNivelCustom),
    annualBaseSalary: Number(p.salarioBaseAnual) || 0,
    monthlyBonus: Number(p.plusConvenioMes) || 0,
    annualPayments: Number(p.pagasAnuales) || null,
    annualHours: Number(p.horasAnuales) || 1784,
    hoursPerDay: Number(p.horasDiaCalculo) || 8,
    vacationDays: Number(p.vacacionesDiasAnio) || 0,
    vacationDaysType: p.tipoVacaciones ?? 'naturales',
    people: Number(p.personas) || 1,
    hoursPerPerson: Number(p.horasPersona) || 0,
    hourlyRate: num(p.tarifaHoraOfertada),
    margin: margenPuesto(p),
    costs: Object.entries(p.conceptos ?? {}).map(([code, a]) => {
      const c = conceptos.find((x) => x.id === code);
      // Ajustes guardados con un solo valor (en la unidad del concepto).
      const percent = num(a.porcentaje) ?? (c?.tipo === 'porcentaje' ? num(a.valor) : null);
      const perHour = percent === null ? (num(a.importe) ?? (c?.tipo === 'fijo_hora' ? num(a.valor) : null)) : null;
      return { code: codigo(code), applies: a.aplica !== false, percent, perHour };
    }),
    extras: (p.extras ?? []).map(extraApi),
  };
}

/** ¿Ha cambiado el puesto desde que se cargó? */
export const puestoCambiado = (p: PuestoVista) => p._guardado !== JSON.stringify(puestoApi(p, []));

// ---------------------------------------------------------------------------
// Cálculo: el del servidor si el puesto no ha cambiado; si no, la vista previa con el módulo de cálculo.
// ---------------------------------------------------------------------------

type Margen = { tipo: string; valor: number } | number | undefined;
const margenApi = (m: Margen): QuoteMargin =>
  typeof m === 'object' && m ? { mode: m.tipo === 'importe' ? 'per_hour' : 'percent', value: Number(m.valor) || 0 } : { mode: 'percent', value: Number(m ?? 18) };

// Cálculo que ha dado el servidor para un puesto, válido mientras el puesto y los costes sean los mismos objetos.
const delServidor = new WeakMap<object, { conceptos: object; calculo: PositionResult }>();

function calcularLocal(pos: PuestoVista, conceptos: ConceptoVista[], margen: Margen): PositionResult {
  const p = puestoApi(pos, conceptos);
  const costs = costesApi(conceptos).flatMap((c) => {
    const a = p.costs?.find((x) => x.code === c.code);
    if (a && !a.applies) return [];
    if (a?.percent != null) return [{ code: c.code, name: c.name, mode: 'percent' as const, value: a.percent }];
    if (a?.perHour != null) return [{ code: c.code, name: c.name, mode: 'per_hour' as const, value: a.perHour }];
    return [{ code: c.code, name: c.name, mode: c.mode, value: c.value }];
  });
  return calculatePosition(
    {
      annualBaseSalary: p.annualBaseSalary ?? 0, monthlyBonus: p.monthlyBonus, annualHours: p.annualHours || 1784, hoursPerDay: p.hoursPerDay,
      vacationDays: p.vacationDays, vacationDaysType: p.vacationDaysType, people: p.people ?? 1, hoursPerPerson: p.hoursPerPerson ?? 0,
      hourlyRate: p.hourlyRate, margin: p.margin, costs, extras: (p.extras ?? []).map((x) => ({ ...x })), agreementMinimumSalaryHour: pos.minimoConvenioHora ?? null,
    },
    { margin: margenApi(margen), ssRates: tasasDe(conceptos) },
  );
}

/** La «economía» de un puesto en la forma que pinta la vista (la de su antigua función de cálculo). */
export function economiaPuesto(pos: PuestoVista, conceptos: ConceptoVista[], margen: Margen) {
  const guardado = delServidor.get(pos);
  const r = guardado && guardado.conceptos === conceptos ? guardado.calculo : calcularLocal(pos, conceptos, margen);
  const propios = new Set(Object.entries(pos.conceptos ?? {}).filter(([, a]) => num(a.porcentaje) !== null || num(a.importe) !== null || num(a.valor) !== null).map(([k]) => k));
  const objetivoPct = r.targetMargin.mode === 'percent' ? r.targetMargin.value : r.suggestedRate > 0 ? (r.targetMargin.value / r.suggestedRate) * 100 : 0;
  const extras = (pos.extras ?? []).map((x, i) => ({ ...x, salarioHora: r.extras[i]?.salaryHour ?? 0, tarifaHora: r.extras[i]?.rateHour ?? 0, recargoEquivalente: r.extras[i]?.surchargePercent ?? 0 }));
  const horasDia = Number(pos.horasDiaCalculo) || 8;
  return {
    /** S/H: el salario por hora de la propuesta (con las vacaciones). */
    salarioBrutoHora: r.grossSalaryHour,
    /** Sin la parte de vacaciones (primera línea del desglose). */
    salarioConvenioHora: r.salaryHour,
    salarioBrutoAnual: (Number(pos.salarioBaseAnual) || 0) + (Number(pos.plusConvenioMes) || 0) * 12,
    costeTotalEmpresaHora: r.costHour,
    totalCosteSocialHora: r.costHour - r.grossSalaryHour,
    margenEuroHora: r.marginHour,
    margenPorcentaje: r.marginPercent,
    tarifaJornadaCalculada: r.rateHour * horasDia,
    costeJornada: r.costHour * horasDia,
    desgloseConceptos: r.breakdown
      .filter((l) => l.kind !== 'salary' && l.kind !== 'margin')
      .map((l) => ({ id: l.code, nombre: l.name, importeHora: l.perHour, esLegal: l.kind !== 'internal_cost', propio: l.kind === 'internal_cost' && propios.has(l.code) })),
    tarifaPVP: r.rateHour,
    tarifaEsSugerida: r.rateIsSuggested,
    horasDia,
    margenObjetivo: objetivoPct,
    margenObjetivoImporte: r.suggestedRate - r.costHour,
    margenObjetivoTipo: r.targetMargin.mode === 'per_hour' ? 'importe' : 'porcentaje',
    tarifaSugerida: r.suggestedRate,
    extras,
    personas: Number(pos.personas) || 1,
    horasPersona: Number(pos.horasPersona) || 0,
    horasTotales: r.hours,
    facturacionTotal: r.revenue,
    costeServicio: r.cost,
    margenServicio: r.marginTotal,
    /** Salario por debajo del convenio de la empresa usuaria (se bloquea siempre). */
    bajoConvenio: r.issues.includes('salary_below_agreement') ? { minimoHora: pos.minimoConvenioHora ?? 0, salarioHora: r.grossSalaryHour } : null,
  };
}

// ---------------------------------------------------------------------------
// Presupuesto
// ---------------------------------------------------------------------------

/** Lo que la vista enseña de la empresa y del contacto (de los catálogos de la pantalla). */
export type Resolver = {
  empresa: (clientId: string | null) => { cif: string; sector: string; ciudad: string; convenio: string } | undefined;
  contacto: (contactId: string | null) => { nombre: string; cargo: string; email: string; telefono: string } | undefined;
  comercial: (userId: string | null) => string;
};

const IVAS: Record<string, number> = { '21': 21, '10': 10, '7': 7, '0_exento': 0 };

export function presupuestoVista(q: Quote, v: QuoteVersion, r: Resolver) {
  const conceptos = conceptosVista(v);
  const posiciones = v.positions.map(puestoVista);
  posiciones.forEach((p, i) => v.positions[i].calculation && delServidor.set(p, { conceptos, calculo: v.positions[i].calculation! }));
  const e = r.empresa(q.clientId);
  const c = r.contacto(v.contactId);
  const [modalidad, modalidadCustom] = deLista(v.modality, MODALIDADES);
  const [garantiaSustitucion, garantiaSustitucionCustom] = deLista(v.replacementGuarantee, GARANTIAS);
  const iva = Object.entries(IVAS).find(([, n]) => n === Number(v.vatRate))?.[0];
  return {
    _id: q.id,
    _versionId: v.id,
    _clientIdGuardado: q.clientId,
    _editable: v.editable,
    id: q.code,
    codigoVersion: `${q.code}-v${v.versionNumber}`,
    versionNumero: v.versionNumber,
    titulo: v.title ?? '',
    empresaId: q.clientId ?? '',
    cliente: q.clientName ?? '',
    cif: e?.cif ?? '',
    sector: e?.sector ?? '',
    ciudad: e?.ciudad ?? '',
    convenioEmpresa: e?.convenio ?? '',
    contactoId: v.contactId ?? '',
    contacto: c ? `${c.nombre}${c.cargo ? ` (${c.cargo})` : ''}` : (v.contactName ?? ''),
    emailContacto: v.contactEmail ?? c?.email ?? '',
    telefonoContacto: c?.telefono ?? '',
    comercial: v.salesRepName ?? r.comercial(v.salesRepId),
    estado: ESTADOS[v.status],
    esEditableDirecto: v.editable,
    fechaEmision: v.issueDate,
    fechaValidez: v.validUntil ?? '',
    fechaInicioPrevista: v.expectedStartDate ?? '',
    duracionMeses: v.durationMonths ?? '',
    moneda: v.currency,
    modalidad,
    modalidadCustom,
    iva: iva ?? 'otro',
    ivaCustom: iva ? '' : String(v.vatRate),
    formaPago: v.paymentMethodId ?? '',
    formaPagoCustom: '',
    garantiaSustitucion,
    garantiaSustitucionCustom,
    observacionesComerciales: v.commercialNotes ?? '',
    condiciones: v.conditions ?? '',
    margenObjetivo: v.margin.mode === 'percent' ? v.margin.value : 18,
    margenTipo: v.margin.mode === 'per_hour' ? 'importe' : 'porcentaje',
    margenImporte: v.margin.mode === 'per_hour' ? v.margin.value : '',
    extrasDefecto: v.defaultExtras.map(extraVista),
    conceptosEscandallo: conceptos,
    posiciones,
    auditoria: [] as { id: string; fecha: string; usuario: string; accion: string; detalle: string }[],
    aprobacion: v.approvalStatus
      ? {
          estado: { pending: 'pendiente', approved: 'aprobada', rejected: 'rechazada' }[v.approvalStatus],
          motivo: v.approvalNotes ?? '',
          pedidaPor: v.approvalRequestedByName ?? '',
          resueltaPor: v.approvalDecidedByName ?? '',
        }
      : undefined,
    motivoRechazo: v.rejectionReasonName ?? undefined,
    notasRechazo: v.rejectionNotes ?? '',
    obsoleto: q.obsoleteAt ? { motivo: q.obsoleteReason ?? '', fecha: q.obsoleteAt.slice(0, 10), sustituidoPor: q.replacedByCode ?? '' } : undefined,
    creadoDesde: q.createdFromCode ?? undefined,
    // Las peticiones llegan en la fase 5.
    peticionCreada: undefined as string | undefined,
    peticionesCreadas: [] as { codigo: string; posId: string; turno: string; plazas: number }[],
    documentosAnadidos: [] as { id: string; tipo: string; nombre: string; archivo: string; interno: boolean; fecha: string; autor: string }[],
  };
}
export type PresupuestoVista = ReturnType<typeof presupuestoVista>;

/** La cabecera de la versión que se guarda (sin los puestos, que van por sus rutas). */
export function versionApi(v: PresupuestoVista, ids: { comercial: (nombre: string) => string | null; formaPago: string | null }): QuoteVersionInput {
  return {
    title: v.titulo || null,
    contactId: v.contactoId || null,
    salesRepId: ids.comercial(v.comercial),
    issueDate: v.fechaEmision,
    validUntil: v.fechaValidez || null,
    expectedStartDate: v.fechaInicioPrevista || null,
    durationMonths: num(v.duracionMeses),
    modality: aLista(v.modalidad, v.modalidadCustom),
    paymentMethodId: ids.formaPago,
    vatRate: v.iva === 'otro' ? (num(v.ivaCustom) ?? 21) : (IVAS[v.iva] ?? 21),
    currency: v.moneda || 'EUR',
    replacementGuarantee: aLista(v.garantiaSustitucion, v.garantiaSustitucionCustom),
    commercialNotes: v.observacionesComerciales || null,
    conditions: v.condiciones || null,
    margin: v.margenTipo === 'importe' ? { mode: 'per_hour', value: Number(v.margenImporte) || 0 } : { mode: 'percent', value: Number(v.margenObjetivo) || 0 },
    ssRates: tasasDe(v.conceptosEscandallo),
    costConcepts: costesApi(v.conceptosEscandallo),
    defaultExtras: (v.extrasDefecto ?? []).map(extraApi),
  };
}

/** Fila del listado de la vista. */
export const filaVista = (q: QuoteSummary) => ({
  _id: q.id,
  id: q.code,
  importe: q.revenue,
  titulo: q.title ?? 'Sin título',
  cliente: q.clientName ?? 'Sin empresa',
  empresaId: q.clientId ?? '',
  comercial: q.salesRepName ?? '—',
  sucursalId: q.branchId,
  estado: ESTADOS[q.status],
  puestosCount: q.positionsCount,
  tarifaMedia: q.averageRate,
  margenPct: q.marginPercent,
  fechaValidez: q.validUntil ?? '',
  esEditableDirecto: editable(q.status),
  diasSinRespuesta: q.daysWithoutResponse ?? undefined,
  motivoRechazo: q.rejectionReasonName ?? undefined,
  peticionCreada: undefined as string | undefined,
});
