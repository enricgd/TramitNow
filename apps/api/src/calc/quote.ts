// Cálculo económico de los presupuestos (fase 4 de docs/plan-desarrollo.md). Módulo PURO: sin dependencias, sin
// I/O y sin fechas del sistema. Lo usa la API para guardar el cálculo de cada versión y lo puede importar la web tal
// cual para el modo demo (ver apps/README.md, "Cálculo de presupuestos").
//
// Todo va por HORA TRABAJADA. Con S = salario anual del puesto (base + plus de convenio × 12; las pagas extra van
// dentro del anual, como en las tablas de los convenios) y H = horas anuales de trabajo efectivo:
//
//   salario de convenio      S × (1 − fv) / H          fv = parte del año que son vacaciones
//   vacaciones               S × fv / H                (naturales: días / 365; laborables: días / (H / horas día + días))
//   Seguridad Social empresa (S / H) × tipos %         (contingencias comunes, desempleo, FOGASA, FP, MEI y AT/EP)
//   indemnización fin        S × 12 / 365 / H          (12 días de salario por año trabajado, art. 49.1.c ET)
//   costes internos          % sobre S / H, o €/h
//   ─────────────────────── coste
//   margen                   tarifa − coste
//   tarifa                   la ofertada; si no hay, la sugerida con el margen objetivo
//
// La indemnización no cotiza (art. 147.2.c LGSS), así que no entra en la base de la Seguridad Social.
// Los tipos por defecto son los que conocemos para 2026 y van marcados [verificar]: cada ETT los puede cambiar.

// ---------------------------------------------------------------------------
// Parámetros de la Seguridad Social
// ---------------------------------------------------------------------------

/** Tipos de cotización a cargo de la empresa, en %. */
export interface SocialSecurityRates {
  /** Contingencias comunes. */
  commonContingencies: number;
  /** Desempleo. Contrato temporal: 6,70 %. */
  unemployment: number;
  /** FOGASA. */
  fogasa: number;
  /** Formación profesional. */
  vocationalTraining: number;
  /** Mecanismo de equidad intergeneracional, parte de la empresa. */
  mei: number;
  /** Accidentes de trabajo y enfermedades profesionales (IT + IMS), según el CNAE. */
  atEp: number;
}

/** [verificar] Tipos de 2026 para un contrato temporal (Orden de cotización del año). */
export const DEFAULT_SS_RATES: Readonly<SocialSecurityRates> = Object.freeze({
  commonContingencies: 23.6,
  unemployment: 6.7,
  fogasa: 0.2,
  vocationalTraining: 0.6,
  mei: 0.75,
  atEp: 1.5,
});

/**
 * [verificar] AT/EP (IT + IMS, en %) de la tarifa de primas (DA 4.ª de la Ley 42/2006) para algunas actividades
 * habituales en la puesta a disposición. Clave: prefijo del CNAE-2009 (división, grupo o clase); gana el más largo.
 * Lo que no está aquí usa DEFAULT_SS_RATES.atEp. Es una ayuda para rellenar: el valor se guarda en el presupuesto y se
 * puede cambiar a mano.
 */
export const AT_EP_BY_CNAE: Readonly<Record<string, number>> = Object.freeze({
  '10': 3.7, // industria de la alimentación
  '101': 4.25, // procesado y conservación de carne
  '11': 3.7, // fabricación de bebidas
  '22': 3.0, // caucho y plásticos
  '25': 3.75, // productos metálicos
  '28': 3.0, // maquinaria y equipo
  '29': 2.75, // vehículos de motor
  '41': 6.7, // construcción de edificios
  '45': 2.45, // venta y reparación de vehículos
  '46': 2.3, // comercio al por mayor
  '47': 1.6, // comercio al por menor
  '49': 3.4, // transporte terrestre
  '52': 3.5, // almacenamiento y actividades anexas al transporte
  '53': 2.4, // actividades postales y de correos
  '55': 1.6, // servicios de alojamiento
  '56': 1.5, // servicios de comidas y bebidas
  '78': 1.5, // actividades relacionadas con el empleo
  '81': 3.5, // servicios a edificios y jardinería
  '82': 1.5, // actividades administrativas de oficina (contact center: 8220)
});

/** AT/EP de una actividad CNAE (código de 1 a 4 caracteres) o el de por defecto. */
export function atEpForCnae(cnaeCode: string | null | undefined, fallback = DEFAULT_SS_RATES.atEp): number {
  if (!cnaeCode) return fallback;
  for (let length = Math.min(cnaeCode.length, 4); length >= 2; length--) {
    const rate = AT_EP_BY_CNAE[cnaeCode.slice(0, length)];
    if (rate !== undefined) return rate;
  }
  return fallback;
}

export function totalSsRate(rates: SocialSecurityRates): number {
  return rates.commonContingencies + rates.unemployment + rates.fogasa + rates.vocationalTraining + rates.mei + rates.atEp;
}

/** Días de salario de indemnización por año trabajado al acabar el contrato temporal. */
export const SEVERANCE_DAYS_PER_YEAR = 12;

// ---------------------------------------------------------------------------
// Entrada
// ---------------------------------------------------------------------------

/** Margen en % sobre la tarifa o en €/h sobre el coste. */
export interface Margin {
  mode: 'percent' | 'per_hour';
  value: number;
}

/** Coste interno aplicado al puesto (absentismo, EPIs, revisión médica...). Ya resuelto: el del puesto o el de por defecto. */
export interface CostLine {
  code: string;
  name: string;
  /** percent: % sobre el salario por hora (S / H); per_hour: €/h. */
  mode: 'percent' | 'per_hour';
  value: number;
}

/** Concepto extra (hora extra, nocturna, festiva...). Para el salario cuenta uno de los tres; ninguno = coeficiente 1. */
export interface ExtraInput {
  code: string;
  name: string;
  /** Salario = salario por hora × coeficiente (p. ej. 1,25 la hora extra). */
  salaryCoefficient?: number | null;
  /** Salario por hora fijo (p. ej. la hora extra de las tablas del convenio). */
  salaryPerHour?: number | null;
  /** Complemento por hora sobre el salario normal (p. ej. la nocturnidad en €/h). */
  salarySupplementPerHour?: number | null;
  /** Tarifa: recargo % sobre la tarifa normal, o €/h. Solo uno; ninguno = mismo factor tarifa/salario que la hora normal. */
  rateSurchargePercent?: number | null;
  ratePerHour?: number | null;
  /** Mínimo de convenio para el salario de este extra, si lo hay. */
  agreementMinimumSalaryHour?: number | null;
}

export interface PositionInput {
  /** Salario base anual (con las pagas extra, como en las tablas del convenio). */
  annualBaseSalary: number;
  /** Plus de convenio u otros pluses fijos al mes (× 12). */
  monthlyBonus?: number | null;
  /** Horas anuales de trabajo efectivo. */
  annualHours: number;
  hoursPerDay?: number | null;
  vacationDays?: number | null;
  vacationDaysType?: 'naturales' | 'laborables' | null;
  people: number;
  hoursPerPerson: number;
  /** Tarifa ofertada al cliente (€/h). null: se usa la sugerida. */
  hourlyRate?: number | null;
  /** Margen objetivo del puesto; null: el del presupuesto. */
  margin?: Margin | null;
  costs?: readonly CostLine[];
  extras?: readonly ExtraInput[];
  /** Salario mínimo por hora del convenio de la empresa usuaria (S / H del convenio); null si no hay tabla. */
  agreementMinimumSalaryHour?: number | null;
  /** Tipos de la Seguridad Social; si no, los de la versión. */
  ssRates?: SocialSecurityRates | null;
}

export interface QuoteInput {
  /** Margen objetivo por defecto. */
  margin: Margin;
  ssRates: SocialSecurityRates;
  /** Margen mínimo de la ETT (%); null: sin mínimo. */
  minMarginPercent?: number | null;
  positions: readonly PositionInput[];
}

// ---------------------------------------------------------------------------
// Salida
// ---------------------------------------------------------------------------

export type BreakdownKind = 'salary' | 'vacation' | 'social_security' | 'severance' | 'internal_cost' | 'margin';

export interface BreakdownLine {
  kind: BreakdownKind;
  code: string;
  name: string;
  /** €/h */
  perHour: number;
  /** % de la tarifa */
  percentOfRate: number;
}

export interface ExtraResult {
  code: string;
  name: string;
  salaryHour: number;
  rateHour: number;
  /** Recargo equivalente sobre la tarifa normal (%). */
  surchargePercent: number;
  belowAgreement: boolean;
}

export type PositionIssue = 'salary_below_agreement' | 'extra_below_agreement' | 'rate_below_cost' | 'margin_below_minimum' | 'no_rate';

export interface PositionResult {
  /** S / H: lo que cobra la persona por hora trabajada, vacaciones incluidas. Es el salario de la propuesta. */
  grossSalaryHour: number;
  salaryHour: number;
  vacationHour: number;
  ssHour: number;
  ssRatePercent: number;
  severanceHour: number;
  internalCostsHour: number;
  costHour: number;
  suggestedRate: number;
  /** Tarifa usada: la ofertada o, si no hay, la sugerida. */
  rateHour: number;
  rateIsSuggested: boolean;
  marginHour: number;
  marginPercent: number;
  targetMargin: Margin;
  hours: number;
  revenue: number;
  cost: number;
  marginTotal: number;
  breakdown: BreakdownLine[];
  extras: ExtraResult[];
  issues: PositionIssue[];
}

export interface QuoteTotals {
  people: number;
  hours: number;
  revenue: number;
  cost: number;
  margin: number;
  marginPercent: number;
  /** Facturación / horas. */
  averageRate: number;
  averageCost: number;
}

export interface QuoteResult {
  positions: PositionResult[];
  totals: QuoteTotals;
  issues: { position: number; issue: PositionIssue }[];
}

// ---------------------------------------------------------------------------
// Cálculo
// ---------------------------------------------------------------------------

/** Tolerancia de céntimo en las comparaciones (redondeos de la web y de la base de datos). */
const EPSILON = 0.005;

const round = (value: number, decimals: number) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};
const r4 = (value: number) => round(value, 4);
const r2 = (value: number) => round(value, 2);
const filled = (value: number | null | undefined): value is number => value !== null && value !== undefined && Number.isFinite(value);

/** Salario anual del puesto: base + plus mensual × 12. */
export function annualSalary(input: Pick<PositionInput, 'annualBaseSalary' | 'monthlyBonus'>): number {
  return input.annualBaseSalary + (input.monthlyBonus ?? 0) * 12;
}

/** Parte del salario anual que corresponde a las vacaciones. */
export function vacationFraction(input: Pick<PositionInput, 'annualHours' | 'hoursPerDay' | 'vacationDays' | 'vacationDaysType'>): number {
  const days = input.vacationDays ?? 0;
  if (days <= 0) return 0;
  if (input.vacationDaysType === 'laborables') {
    const workedDays = input.annualHours / (input.hoursPerDay && input.hoursPerDay > 0 ? input.hoursPerDay : 8);
    return days / (workedDays + days);
  }
  return days / 365;
}

/** Tarifa con un margen: en %, coste / (1 − margen); en €/h, coste + margen. */
export function rateWithMargin(costHour: number, margin: Margin): number {
  if (margin.mode === 'per_hour') return costHour + margin.value;
  return margin.value < 100 ? costHour / (1 - margin.value / 100) : 0;
}

export function calculatePosition(
  input: PositionInput,
  defaults: { margin: Margin; ssRates: SocialSecurityRates; minMarginPercent?: number | null },
): PositionResult {
  if (!(input.annualHours > 0)) throw new RangeError('Las horas anuales tienen que ser mayores que 0');
  const S = annualSalary(input);
  const H = input.annualHours;
  const gross = S / H;
  const fv = vacationFraction(input);
  const vacation = gross * fv;
  const salary = gross - vacation;

  const rates = input.ssRates ?? defaults.ssRates;
  const ssRate = totalSsRate(rates);
  const ss = (gross * ssRate) / 100;
  const severance = (S * SEVERANCE_DAYS_PER_YEAR) / 365 / H;

  const internal = (input.costs ?? []).map((c) => ({
    ...c,
    perHour: c.mode === 'percent' ? (gross * c.value) / 100 : c.value,
  }));
  const internalTotal = internal.reduce((sum, c) => sum + c.perHour, 0);

  const cost = gross + ss + severance + internalTotal;
  const targetMargin = input.margin ?? defaults.margin;
  const suggested = rateWithMargin(cost, targetMargin);
  const rateIsSuggested = !filled(input.hourlyRate);
  const rate = rateIsSuggested ? suggested : (input.hourlyRate as number);
  const marginHour = rate - cost;
  const marginPercent = rate > 0 ? (marginHour / rate) * 100 : 0;

  const pct = (perHour: number) => (rate > 0 ? r2((perHour / rate) * 100) : 0);
  const line = (kind: BreakdownKind, code: string, name: string, perHour: number): BreakdownLine => ({
    kind,
    code,
    name,
    perHour: r4(perHour),
    percentOfRate: pct(perHour),
  });
  const breakdown: BreakdownLine[] = [
    line('salary', 'salary', 'Salario de convenio', salary),
    line('vacation', 'vacation', 'Vacaciones (parte proporcional)', vacation),
    line('social_security', 'social_security', 'Seguridad Social de la empresa', ss),
    line('severance', 'severance', `Indemnización fin de contrato (${SEVERANCE_DAYS_PER_YEAR} días por año)`, severance),
    ...internal.map((c) => line('internal_cost', c.code, c.name, c.perHour)),
    line('margin', 'margin', 'Margen', marginHour),
  ];

  const factor = gross > 0 ? rate / gross : 0;
  const extras = (input.extras ?? []).map((x): ExtraResult => {
    const salaryHour = filled(x.salaryPerHour)
      ? x.salaryPerHour
      : filled(x.salarySupplementPerHour)
        ? gross + x.salarySupplementPerHour
        : gross * (filled(x.salaryCoefficient) ? x.salaryCoefficient : 1);
    const rateHour = filled(x.rateSurchargePercent)
      ? rate * (1 + x.rateSurchargePercent / 100)
      : filled(x.ratePerHour)
        ? x.ratePerHour
        : salaryHour * factor;
    return {
      code: x.code,
      name: x.name,
      salaryHour: r4(salaryHour),
      rateHour: r4(rateHour),
      surchargePercent: rate > 0 ? r2((rateHour / rate - 1) * 100) : 0,
      belowAgreement: filled(x.agreementMinimumSalaryHour) && salaryHour < x.agreementMinimumSalaryHour - EPSILON,
    };
  });

  const hours = input.people * input.hoursPerPerson;
  const issues: PositionIssue[] = [];
  if (filled(input.agreementMinimumSalaryHour) && gross < input.agreementMinimumSalaryHour - EPSILON) {
    issues.push('salary_below_agreement');
  }
  if (extras.some((x) => x.belowAgreement)) issues.push('extra_below_agreement');
  if (rateIsSuggested) issues.push('no_rate');
  if (rate < cost - EPSILON) issues.push('rate_below_cost');
  if (filled(defaults.minMarginPercent) && marginPercent < defaults.minMarginPercent - EPSILON / 10) {
    issues.push('margin_below_minimum');
  }

  return {
    grossSalaryHour: r4(gross),
    salaryHour: r4(salary),
    vacationHour: r4(vacation),
    ssHour: r4(ss),
    ssRatePercent: r4(ssRate),
    severanceHour: r4(severance),
    internalCostsHour: r4(internalTotal),
    costHour: r4(cost),
    suggestedRate: r4(suggested),
    rateHour: r4(rate),
    rateIsSuggested,
    marginHour: r4(marginHour),
    marginPercent: r4(marginPercent),
    targetMargin,
    hours: r2(hours),
    revenue: r2(rate * hours),
    cost: r2(cost * hours),
    marginTotal: r2(marginHour * hours),
    breakdown,
    extras,
    issues,
  };
}

export function calculateQuote(input: QuoteInput): QuoteResult {
  const positions = input.positions.map((p) => calculatePosition(p, input));
  const sum = (pick: (p: PositionResult) => number) => positions.reduce((acc, p) => acc + pick(p), 0);
  const hours = sum((p) => p.hours);
  const revenue = sum((p) => p.revenue);
  const cost = sum((p) => p.cost);
  const margin = revenue - cost;
  return {
    positions,
    totals: {
      people: input.positions.reduce((acc, p) => acc + p.people, 0),
      hours: r2(hours),
      revenue: r2(revenue),
      cost: r2(cost),
      margin: r2(margin),
      marginPercent: revenue > 0 ? r2((margin / revenue) * 100) : 0,
      averageRate: hours > 0 ? r4(revenue / hours) : 0,
      averageCost: hours > 0 ? r4(cost / hours) : 0,
    },
    issues: positions.flatMap((p, position) => p.issues.map((issue) => ({ position, issue }))),
  };
}

// ---------------------------------------------------------------------------
// Parámetros desde el convenio
// ---------------------------------------------------------------------------

/** Importe de la tabla salarial de un convenio global (agreement_salary_items). */
export interface AgreementSalaryItem {
  /** null: vale para todas las categorías. */
  categoryId: string | null;
  concept: string;
  amount: number;
  unit: 'hora' | 'dia' | 'mes' | 'anio' | 'porcentaje';
  salarial?: boolean;
}

export interface AgreementConditions {
  annualHours: number | null;
  vacationDays: number | null;
  vacationDaysType: 'naturales' | 'laborables' | null;
  extraPayments: number | null;
}

/** Valores de un puesto que salen del convenio. null: el convenio no lo dice y se rellena a mano. */
export interface AgreementDefaults {
  annualBaseSalary: number | null;
  monthlyBonus: number;
  annualPayments: number | null;
  annualHours: number | null;
  vacationDays: number | null;
  vacationDaysType: 'naturales' | 'laborables' | null;
  /** Salario mínimo por hora: (base + plus × 12) / horas anuales. null si falta la base o las horas. */
  minimumSalaryHour: number | null;
  /** Extras que el convenio define (hora extra y nocturnidad), para los conceptos extra del puesto. */
  extras: ExtraInput[];
}

/** Conceptos de la tabla que se toman como plus fijo mensual del puesto (los demás pluses dependen de condiciones). */
export const FIXED_MONTHLY_BONUS_CONCEPTS: readonly string[] = ['plus_convenio'];

/**
 * Rellena los parámetros retributivos de una categoría con la tabla de una versión publicada del convenio.
 * La base es `salario_base` anual; si no está, la mensual × (12 + pagas extra) o la diaria × 365.
 */
export function agreementDefaults(
  items: readonly AgreementSalaryItem[],
  conditions: AgreementConditions | null,
  categoryId: string,
): AgreementDefaults {
  // Lo propio de la categoría manda sobre lo que vale para todas.
  const find = (concept: string, unit: AgreementSalaryItem['unit']) =>
    items.find((i) => i.concept === concept && i.unit === unit && i.categoryId === categoryId) ??
    items.find((i) => i.concept === concept && i.unit === unit && i.categoryId === null);

  const extraPayments = conditions?.extraPayments ?? null;
  const annual = find('salario_base', 'anio')?.amount;
  const monthly = find('salario_base_mensual', 'mes')?.amount ?? find('salario_base', 'mes')?.amount;
  const daily = find('salario_base_diario', 'dia')?.amount ?? find('salario_base', 'dia')?.amount;
  const base =
    annual ?? (monthly !== undefined ? monthly * (12 + (extraPayments ?? 2)) : daily !== undefined ? daily * 365 : null);

  let bonus = 0;
  for (const concept of FIXED_MONTHLY_BONUS_CONCEPTS) {
    const m = find(concept, 'mes');
    const a = find(concept, 'anio');
    if (m) bonus += m.amount;
    else if (a) bonus += a.amount / 12;
  }

  const hours = conditions?.annualHours ?? null;
  const minimum = base !== null && hours ? r4((base + bonus * 12) / hours) : null;

  const extras: ExtraInput[] = [];
  const overtimePct = find('hora_extra', 'porcentaje');
  const overtimeHour = find('hora_extra', 'hora');
  if (overtimeHour) {
    extras.push({ code: 'overtime', name: 'Hora extra', salaryPerHour: overtimeHour.amount, agreementMinimumSalaryHour: overtimeHour.amount });
  } else if (overtimePct) {
    const coefficient = 1 + overtimePct.amount / 100;
    extras.push({
      code: 'overtime',
      name: 'Hora extra',
      salaryCoefficient: coefficient,
      agreementMinimumSalaryHour: minimum !== null ? r4(minimum * coefficient) : null,
    });
  }
  const nightPct = find('nocturnidad', 'porcentaje');
  const nightHour = find('nocturnidad', 'hora');
  if (nightHour) {
    extras.push({
      code: 'night',
      name: 'Hora nocturna',
      salarySupplementPerHour: nightHour.amount,
      agreementMinimumSalaryHour: minimum !== null ? r4(minimum + nightHour.amount) : null,
    });
  } else if (nightPct) {
    const coefficient = 1 + nightPct.amount / 100;
    extras.push({
      code: 'night',
      name: 'Hora nocturna',
      salaryCoefficient: coefficient,
      agreementMinimumSalaryHour: minimum !== null ? r4(minimum * coefficient) : null,
    });
  }

  return {
    annualBaseSalary: base !== null ? r2(base) : null,
    monthlyBonus: r2(bonus),
    annualPayments: extraPayments !== null ? 12 + extraPayments : null,
    annualHours: hours,
    vacationDays: conditions?.vacationDays ?? null,
    vacationDaysType: conditions?.vacationDaysType ?? null,
    minimumSalaryHour: minimum,
    extras,
  };
}
