// Lógica de los presupuestos que comparten las rutas (routes/quotes.ts): recálculo con el módulo puro
// (calc/quote.ts), valores desde el convenio global, copia de versiones y lectura completa.

import {
  DEFAULT_SS_RATES,
  agreementDefaults,
  atEpForCnae,
  calculateQuote,
  type AgreementDefaults,
  type CostLine,
  type ExtraInput,
  type PositionInput,
  type QuoteResult,
  type SocialSecurityRates,
} from '../calc/quote.js';
import type { Tx } from './db.js';
import { ApiError, notFound } from './errors.js';

// ---------------------------------------------------------------------------
// Tipos guardados en jsonb (claves en camelCase)
// ---------------------------------------------------------------------------
export interface CostConcept {
  code: string;
  name: string;
  mode: 'percent' | 'per_hour';
  value: number;
  /** Siempre en cada presupuesto (no se quita del presupuesto; en un puesto sí se puede desmarcar). */
  required: boolean;
  description: string | null;
}

export interface PositionCost {
  code: string;
  applies: boolean;
  percent: number | null;
  perHour: number | null;
}

export interface Extra {
  code: string;
  name: string;
  salaryCoefficient: number | null;
  salaryPerHour: number | null;
  salarySupplementPerHour: number | null;
  rateSurchargePercent: number | null;
  ratePerHour: number | null;
  /** Sale en la propuesta. Todos quedan en la oferta para poder facturarlos. */
  print: boolean;
  /** Añadido a mano (p. ej. «Plus de peligrosidad»). */
  custom: boolean;
  /** Mínimo del convenio para el salario de este extra (lo pone la API). */
  agreementMinimumSalaryHour: number | null;
}

/** [por confirmar] Costes internos de siempre (design/cambios/2026-10-28-presupuestos-empresa-tarificacion.md). */
export const DEFAULT_COST_CONCEPTS: CostConcept[] = [
  { code: 'absenteeism', name: 'Provisión de absentismo y contingencias', mode: 'percent', value: 2.15, required: true,
    description: 'Cobertura estimada de bajas de corta duración y permisos retribuidos según convenio.' },
  { code: 'ppe', name: 'EPIs', mode: 'per_hour', value: 0.18, required: true,
    description: 'Equipos de protección individual que necesite el puesto.' },
  { code: 'medical', name: 'Revisión médica inicial y formación PRL', mode: 'per_hour', value: 0.22, required: true,
    description: 'Vigilancia de la salud y formación en prevención de riesgos laborales.' },
];

const extra = (code: string, name: string, salaryCoefficient: number): Extra => ({
  code, name, salaryCoefficient, salaryPerHour: null, salarySupplementPerHour: null, rateSurchargePercent: null,
  ratePerHour: null, print: true, custom: false, agreementMinimumSalaryHour: null,
});
/** [por confirmar] Conceptos extra por defecto; sus coeficientes dependen de cada convenio. */
export const DEFAULT_EXTRAS: Extra[] = [
  extra('overtime', 'Hora extra', 1.5),
  extra('night', 'Hora nocturna', 1.25),
  extra('weekend', 'Hora de fin de semana', 1.5),
  extra('holiday', 'Hora festiva', 1.75),
];

export function defaultSsRates(cnaeCode: string | null | undefined): SocialSecurityRates {
  return { ...DEFAULT_SS_RATES, atEp: atEpForCnae(cnaeCode) };
}

export const EDITABLE_STATUSES = ['draft', 'in_preparation'] as const;

/** Campos del puesto que se rellenan desde el convenio. */
export const AGREEMENT_FIELDS = [
  'annualBaseSalary',
  'monthlyBonus',
  'annualPayments',
  'annualHours',
  'vacationDays',
  'vacationDaysType',
] as const;
export type AgreementField = (typeof AGREEMENT_FIELDS)[number];
export type AgreementValues = Partial<Record<AgreementField, number | string | null>>;

// ---------------------------------------------------------------------------
// Convenio
// ---------------------------------------------------------------------------
export interface ResolvedAgreement {
  agreementVersionId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  defaults: AgreementDefaults;
}

/** Categoría de una versión publicada del convenio global enlazado al convenio de la ETT, con sus valores. */
export async function resolveAgreementCategory(
  tx: Tx,
  tenantId: string,
  collectiveAgreementId: string | null,
  categoryId: string,
  options: { allowWithdrawn?: boolean } = {},
): Promise<ResolvedAgreement> {
  const [row] = await tx<
    { versionId: string; status: string; agreementId: string; effectiveFrom: string; effectiveTo: string | null; globalAgreementId: string | null }[]
  >`
    select c.version_id, av.status, av.agreement_id, to_char(av.effective_from, 'YYYY-MM-DD') as effective_from,
           to_char(av.effective_to, 'YYYY-MM-DD') as effective_to,
           (select ca.global_agreement_id from public.collective_agreements ca
            where ca.tenant_id = ${tenantId} and ca.id = ${collectiveAgreementId} and ca.deleted_at is null) as global_agreement_id
    from public.agreement_categories c
    join public.agreement_versions av on av.id = c.version_id
    where c.id = ${categoryId}
  `;
  if (!row || !(row.status === 'publicada' || (options.allowWithdrawn && row.status === 'retirada'))) {
    throw new ApiError(422, 'referencia_invalida', 'La categoría no es de una versión publicada del convenio');
  }
  if (!collectiveAgreementId || row.globalAgreementId !== row.agreementId) {
    throw new ApiError(422, 'validacion', 'La categoría no es del convenio elegido');
  }
  return {
    agreementVersionId: row.versionId,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
    defaults: await loadAgreementDefaults(tx, row.versionId, categoryId),
  };
}

export async function loadAgreementDefaults(tx: Tx, versionId: string, categoryId: string): Promise<AgreementDefaults> {
  const items = await tx<{ categoryId: string | null; concept: string; amount: number; unit: 'hora' | 'dia' | 'mes' | 'anio' | 'porcentaje'; salarial: boolean }[]>`
    select category_id, concept, amount::float8 as amount, unit, salarial
    from public.agreement_salary_items where version_id = ${versionId}
  `;
  const [conditions] = await tx<
    { annualHours: number | null; vacationDays: number | null; vacationDaysType: 'naturales' | 'laborables' | null; extraPayments: number | null }[]
  >`
    select annual_hours::float8 as annual_hours, vacation_days, vacation_days_type, extra_payments
    from public.agreement_conditions where version_id = ${versionId}
  `;
  return agreementDefaults(items, conditions ?? null, categoryId);
}

/** Versión publicada vigente en una fecha del convenio global enlazado al convenio de la ETT, con sus categorías. */
export async function currentAgreementVersion(tx: Tx, tenantId: string, collectiveAgreementId: string, date: string) {
  const [ca] = await tx<{ globalAgreementId: string | null; name: string }[]>`
    select global_agreement_id, name from public.collective_agreements
    where tenant_id = ${tenantId} and id = ${collectiveAgreementId} and deleted_at is null
  `;
  if (!ca) throw notFound('El convenio no existe');
  if (!ca.globalAgreementId) return null;
  const [version] = await tx<{ id: string; effectiveFrom: string; effectiveTo: string | null; provisional: boolean }[]>`
    select id, to_char(effective_from, 'YYYY-MM-DD') as effective_from, to_char(effective_to, 'YYYY-MM-DD') as effective_to,
           provisional
    from public.agreement_versions
    where agreement_id = ${ca.globalAgreementId} and status = 'publicada' and effective_from <= ${date}
      and (effective_to is null or effective_to >= ${date})
    order by effective_from desc limit 1
  `;
  if (!version) return null;
  const categories = await tx<{ id: string; code: string; name: string; groupName: string | null; level: string | null }[]>`
    select id, code, name, group_name, level from public.agreement_categories
    where version_id = ${version.id} order by sort_order, code
  `;
  return { ...version, categories: [...categories] };
}

/** Extras de un puesto con los datos del convenio: el salario de los que el convenio define sale de ahí, con su mínimo. */
export function extrasWithAgreement(extras: readonly Extra[], defaults: AgreementDefaults | null): Extra[] {
  return extras.map((x) => {
    const fromAgreement = defaults?.extras.find((a) => a.code === x.code);
    if (!fromAgreement) return { ...x, agreementMinimumSalaryHour: null };
    return {
      ...x,
      salaryCoefficient: fromAgreement.salaryCoefficient ?? null,
      salaryPerHour: fromAgreement.salaryPerHour ?? null,
      salarySupplementPerHour: fromAgreement.salarySupplementPerHour ?? null,
      agreementMinimumSalaryHour: fromAgreement.agreementMinimumSalaryHour ?? null,
    };
  });
}

/** Campos que no coinciden con lo que dio el convenio. */
export function manualFields(values: AgreementValues, fromAgreement: AgreementValues | null): AgreementField[] {
  if (!fromAgreement) return [];
  return AGREEMENT_FIELDS.filter((f) => fromAgreement[f] !== null && fromAgreement[f] !== undefined && values[f] !== fromAgreement[f]);
}

export function agreementValuesOf(defaults: AgreementDefaults): AgreementValues {
  return {
    annualBaseSalary: defaults.annualBaseSalary,
    monthlyBonus: defaults.monthlyBonus,
    annualPayments: defaults.annualPayments,
    annualHours: defaults.annualHours,
    vacationDays: defaults.vacationDays,
    vacationDaysType: defaults.vacationDaysType,
  };
}

// ---------------------------------------------------------------------------
// Recálculo
// ---------------------------------------------------------------------------
interface CalcVersionRow {
  status: string;
  marginMode: 'percent' | 'per_hour';
  marginValue: number;
  ssRates: Partial<SocialSecurityRates>;
  costConcepts: CostConcept[];
  minMargin: number | null;
}
interface CalcPositionRow {
  id: string;
  annualBaseSalary: number;
  monthlyBonus: number;
  annualHours: number;
  hoursPerDay: number;
  vacationDays: number;
  vacationDaysType: 'naturales' | 'laborables';
  people: number;
  hoursPerPerson: number;
  hourlyRate: number | null;
  marginMode: 'percent' | 'per_hour' | null;
  marginValue: number | null;
  costs: PositionCost[];
  extras: Extra[];
  agreementMinimumSalaryHour: number | null;
}

export function resolveCosts(concepts: readonly CostConcept[], adjustments: readonly PositionCost[]): CostLine[] {
  return concepts.flatMap((c): CostLine[] => {
    const a = adjustments.find((x) => x.code === c.code);
    if (a && !a.applies) return [];
    if (a?.percent !== null && a?.percent !== undefined) return [{ code: c.code, name: c.name, mode: 'percent', value: a.percent }];
    if (a?.perHour !== null && a?.perHour !== undefined) return [{ code: c.code, name: c.name, mode: 'per_hour', value: a.perHour }];
    return [{ code: c.code, name: c.name, mode: c.mode, value: c.value }];
  });
}

const toExtraInput = (x: Extra): ExtraInput => ({ ...x });

/**
 * Recalcula la versión y guarda el resultado (columnas calc_*). Solo en borrador o en preparación: lo enviado se
 * queda con el cálculo con el que se envió. Con un extra por debajo del convenio, 422 `salario_bajo_convenio`
 * (el salario de la hora normal ya lo bloquea la base de datos).
 */
export async function recalculate(tx: Tx, tenantId: string, versionId: string): Promise<QuoteResult | null> {
  const [v] = await tx<CalcVersionRow[]>`
    select v.status, v.margin_mode, v.margin_value::float8 as margin_value, v.ss_rates, v.cost_concepts,
           t.quote_min_margin_percent::float8 as min_margin
    from public.quote_versions v join public.tenants t on t.id = v.tenant_id
    where v.tenant_id = ${tenantId} and v.id = ${versionId}
  `;
  if (!v) throw notFound('La versión no existe');
  if (!(EDITABLE_STATUSES as readonly string[]).includes(v.status)) return null;

  const positions = await tx<CalcPositionRow[]>`
    select id, annual_base_salary::float8 as annual_base_salary, monthly_bonus::float8 as monthly_bonus,
           annual_hours::float8 as annual_hours, hours_per_day::float8 as hours_per_day, vacation_days, vacation_days_type,
           people, hours_per_person::float8 as hours_per_person, hourly_rate::float8 as hourly_rate, margin_mode,
           margin_value::float8 as margin_value, costs, extras,
           agreement_minimum_salary_hour::float8 as agreement_minimum_salary_hour
    from public.quote_positions where tenant_id = ${tenantId} and version_id = ${versionId}
    order by sort_order, created_at, id
  `;
  const inputs: PositionInput[] = positions.map((p) => ({
    annualBaseSalary: p.annualBaseSalary,
    monthlyBonus: p.monthlyBonus,
    annualHours: p.annualHours,
    hoursPerDay: p.hoursPerDay,
    vacationDays: p.vacationDays,
    vacationDaysType: p.vacationDaysType,
    people: p.people,
    hoursPerPerson: p.hoursPerPerson,
    hourlyRate: p.hourlyRate,
    margin: p.marginMode && p.marginValue !== null ? { mode: p.marginMode, value: p.marginValue } : null,
    costs: resolveCosts(v.costConcepts, p.costs),
    extras: p.extras.map(toExtraInput),
    agreementMinimumSalaryHour: p.agreementMinimumSalaryHour,
  }));
  const result = calculateQuote({
    margin: { mode: v.marginMode, value: v.marginValue },
    ssRates: { ...DEFAULT_SS_RATES, ...v.ssRates },
    minMarginPercent: v.minMargin,
    positions: inputs,
  });

  const lowExtra = result.positions.findIndex((p) => p.issues.includes('extra_below_agreement'));
  if (lowExtra >= 0) {
    const name = result.positions[lowExtra]!.extras.find((x) => x.belowAgreement)?.name ?? 'un concepto extra';
    throw new ApiError(
      422,
      'salario_bajo_convenio',
      `El salario de «${name}» queda por debajo del convenio de la empresa usuaria. La ley no lo permite (art. 11 de la Ley 14/1994)`,
    );
  }

  for (const [i, p] of positions.entries()) {
    const r = result.positions[i]!;
    await tx`
      update public.quote_positions
      set calc_gross_salary_hour = ${r.grossSalaryHour}, calc_cost_hour = ${r.costHour}, calc_rate_hour = ${r.rateHour},
          calc_margin_percent = ${r.marginPercent}, calc_result = ${tx.json(r as never)}
      where tenant_id = ${tenantId} and id = ${p.id}
    `;
  }
  const t = result.totals;
  await tx`
    update public.quote_versions
    set calc_people = ${t.people}, calc_hours = ${t.hours}, calc_revenue = ${t.revenue}, calc_cost = ${t.cost},
        calc_margin = ${t.margin}, calc_margin_percent = ${t.marginPercent}, calc_average_rate = ${t.averageRate},
        calc_result = ${tx.json({ totals: t, issues: result.issues } as never)}
    where tenant_id = ${tenantId} and id = ${versionId}
  `;
  return result;
}

// ---------------------------------------------------------------------------
// Copia de versiones
// ---------------------------------------------------------------------------
const VERSION_COPY_COLUMNS = `title, contact_id, sales_rep_id, expected_start_date, duration_months, modality,
  payment_method_id, vat_rate, currency, replacement_guarantee, commercial_notes, conditions, margin_mode, margin_value,
  ss_rates, cost_concepts, default_extras`;
const POSITION_COPY_COLUMNS = `sort_order, name, description, collective_agreement_id, agreement_version_id,
  agreement_category_id, agreement_values, manual_fields, custom_category_name, level, annual_base_salary, monthly_bonus,
  annual_payments, annual_hours, hours_per_day, vacation_days, vacation_days_type, people, hours_per_person, hourly_rate,
  margin_mode, margin_value, costs, extras`;

/** Días de validez de un presupuesto nuevo o de una versión nueva (design/cambios: 30 días). */
export const DEFAULT_VALIDITY_DAYS = 30;

/**
 * Copia una versión (cabecera y puestos) como versión `versionNumber` de `toQuoteId`, en borrador, con fecha de hoy
 * y validez de 30 días. `withoutClientData` quita el contacto (duplicar para otro cliente).
 */
export async function copyVersion(
  tx: Tx,
  tenantId: string,
  fromVersionId: string,
  toQuoteId: string,
  versionNumber: number,
  options: { withoutClientData?: boolean } = {},
): Promise<string> {
  const [created] = await tx<{ id: string }[]>`
    insert into public.quote_versions (tenant_id, quote_id, version_number, issue_date, valid_until, ${tx.unsafe(VERSION_COPY_COLUMNS)})
    select tenant_id, ${toQuoteId}, ${versionNumber}, current_date, current_date + ${DEFAULT_VALIDITY_DAYS}::int,
           ${tx.unsafe(VERSION_COPY_COLUMNS.replace('contact_id', options.withoutClientData ? 'null' : 'contact_id'))}
    from public.quote_versions where tenant_id = ${tenantId} and id = ${fromVersionId}
    returning id
  `;
  if (!created) throw notFound('La versión no existe');
  await tx`
    insert into public.quote_positions (tenant_id, quote_id, version_id, ${tx.unsafe(POSITION_COPY_COLUMNS)})
    select tenant_id, ${toQuoteId}, ${created.id}, ${tx.unsafe(POSITION_COPY_COLUMNS)}
    from public.quote_positions where tenant_id = ${tenantId} and version_id = ${fromVersionId}
    order by sort_order, created_at, id
  `;
  await recalculate(tx, tenantId, created.id);
  return created.id;
}

/** Número del presupuesto con la serie `quote` de su sociedad y año (sin huecos: en la misma transacción). */
export async function nextQuoteCode(tx: Tx, tenantId: string, companyId: string): Promise<string> {
  const [row] = await tx<{ formatted: string }[]>`
    select formatted from private.next_number(${tenantId}, 'quote', extract(year from current_date)::int, ${companyId})
  `;
  return row!.formatted;
}
