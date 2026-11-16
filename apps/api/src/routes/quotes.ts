// Presupuestos (fase 4; db/migrations/20261117000100_quotes.sql). Un presupuesto tiene versiones (copia completa) y
// cada versión, puestos. Solo se edita la versión actual en borrador o en preparación; al enviarla queda cerrada y
// para cambiarla se crea una versión nueva. Cada escritura recalcula la versión con calc/quote.ts y guarda el
// resultado.
//
// Permisos: leer, module.comercial o quotes.manage en la sucursal del presupuesto; escribir, quotes.manage; aprobar
// el margen por debajo del mínimo, quotes.approve_margin.
// Errores propios: 422 `salario_bajo_convenio` (siempre bloquea, art. 11 Ley 14/1994) y 409 `requiere_aprobacion`.

import { createRoute, z } from '@hono/zod-openapi';
import type { Context } from 'hono';
import { type AppEnv, withTenant } from '../lib/context.js';
import { type Tx, likePattern } from '../lib/db.js';
import { ApiError, notFound } from '../lib/errors.js';
import {
  IdParams,
  PaginationQuery,
  Timestamp,
  bearerSecurity,
  createRouter,
  errorResponses,
  jsonBody,
  jsonContent,
  paginated,
} from '../lib/openapi.js';
import {
  AGREEMENT_FIELDS,
  DEFAULT_COST_CONCEPTS,
  DEFAULT_EXTRAS,
  DEFAULT_VALIDITY_DAYS,
  EDITABLE_STATUSES,
  type AgreementValues,
  type CostConcept,
  type Extra,
  agreementValuesOf,
  copyVersion,
  currentAgreementVersion,
  defaultSsRates,
  extrasWithAgreement,
  loadAgreementDefaults,
  manualFields,
  nextQuoteCode,
  recalculate,
  resolveAgreementCategory,
} from '../lib/quotes.js';
import { requireStorage } from '../lib/storage.js';
import { renderProposalPdf } from '../lib/quote-pdf.js';
import { randomUUID } from 'node:crypto';

const MANAGE = 'quotes.manage';
const APPROVE = 'quotes.approve_margin';
const tags = ['Presupuestos'];

// ---------------------------------------------------------------------------
// Esquemas
// ---------------------------------------------------------------------------
const VersionStatus = z
  .enum(['draft', 'in_preparation', 'sent', 'pending_signature', 'accepted', 'rejected', 'superseded', 'obsolete'])
  .openapi({ description: 'Borrador, En preparación, Enviado, Pendiente de firma, Aceptado, Rechazado, Sustituido, Obsoleto' });
const ApprovalStatus = z.enum(['pending', 'approved', 'rejected']).nullable()
  .openapi({ description: 'Aprobación del margen: pendiente, aprobado o «pedir cambios»' });
const date = z.iso.date();
const money = z.number().min(0).max(1e9);

const MarginSchema = z
  .object({
    mode: z.enum(['percent', 'per_hour']).openapi({ description: 'percent: % sobre la tarifa; per_hour: €/h sobre el coste' }),
    value: z.number().min(0).max(1000),
  })
  .refine((m) => m.mode !== 'percent' || m.value < 100, { message: 'El margen en % tiene que ser menor que 100' })
  .openapi('QuoteMargin');

const SsRatesSchema = z
  .object({
    commonContingencies: z.number().min(0).max(100),
    unemployment: z.number().min(0).max(100),
    fogasa: z.number().min(0).max(100),
    vocationalTraining: z.number().min(0).max(100),
    mei: z.number().min(0).max(100),
    atEp: z.number().min(0).max(100),
  })
  .openapi('QuoteSsRates', { description: 'Tipos de cotización a cargo de la empresa (%). Por defecto los de 2026 [verificar]' });

const code = z.string().trim().regex(/^[a-z][a-z0-9_]{0,39}$/, 'Código en minúsculas, cifras y _');

const CostConceptSchema = z
  .object({
    code,
    name: z.string().trim().min(1).max(200),
    mode: z.enum(['percent', 'per_hour']).openapi({ description: 'percent: % sobre el salario por hora; per_hour: €/h' }),
    value: z.number().min(0).max(10000),
    required: z.boolean().default(false).openapi({ description: 'Siempre en cada presupuesto («Siempre incluido · se ajusta por puesto»)' }),
    description: z.string().trim().max(1000).nullable().default(null),
  })
  .openapi('QuoteCostConcept');

const PositionCostSchema = z
  .object({
    code,
    applies: z.boolean().default(true),
    percent: z.number().min(0).max(10000).nullable().default(null),
    perHour: z.number().min(0).max(10000).nullable().default(null),
  })
  .refine((c) => c.percent === null || c.perHour === null, { message: 'Solo cuenta uno: % o €/h' })
  .openapi('QuotePositionCost', { description: 'Ajuste de un coste interno en el puesto. Sin valores: el del presupuesto' });

const ExtraSchema = z
  .object({
    code,
    name: z.string().trim().min(1).max(200),
    salaryCoefficient: z.number().min(0).max(10).nullable().default(null),
    salaryPerHour: z.number().min(0).max(10000).nullable().default(null),
    salarySupplementPerHour: z.number().min(0).max(10000).nullable().default(null),
    rateSurchargePercent: z.number().min(-100).max(1000).nullable().default(null)
      .openapi({ description: 'Recargo % sobre la tarifa normal' }),
    ratePerHour: z.number().min(0).max(10000).nullable().default(null).openapi({ description: 'Tarifa en €/h' }),
    print: z.boolean().default(true).openapi({ description: 'Sale en la propuesta (todos quedan en la oferta para facturarlos)' }),
    custom: z.boolean().default(false).openapi({ description: 'Añadido a mano' }),
    agreementMinimumSalaryHour: z.number().nullable().default(null).openapi({ description: 'Solo lectura: mínimo del convenio' }),
  })
  .refine((x) => [x.salaryCoefficient, x.salaryPerHour, x.salarySupplementPerHour].filter((v) => v !== null).length <= 1, {
    message: 'Para el salario, solo uno: coeficiente, €/h o complemento €/h',
  })
  .refine((x) => x.rateSurchargePercent === null || x.ratePerHour === null, { message: 'Para la tarifa, solo uno: % o €/h' })
  .openapi('QuoteExtra');

const uniqueCodes = <T extends { code: string }>(list: T[]) => new Set(list.map((x) => x.code)).size === list.length;

const BreakdownLineSchema = z.object({
  kind: z.enum(['salary', 'vacation', 'social_security', 'severance', 'internal_cost', 'margin']),
  code: z.string(),
  name: z.string(),
  perHour: z.number(),
  percentOfRate: z.number(),
});
const PositionIssue = z.enum(['salary_below_agreement', 'extra_below_agreement', 'rate_below_cost', 'margin_below_minimum', 'no_rate']);
const PositionCalcSchema = z
  .object({
    grossSalaryHour: z.number().openapi({ description: 'Salario por hora con vacaciones: el de la propuesta' }),
    salaryHour: z.number(),
    vacationHour: z.number(),
    ssHour: z.number(),
    ssRatePercent: z.number(),
    severanceHour: z.number(),
    internalCostsHour: z.number(),
    costHour: z.number(),
    suggestedRate: z.number(),
    rateHour: z.number(),
    rateIsSuggested: z.boolean(),
    marginHour: z.number(),
    marginPercent: z.number(),
    targetMargin: MarginSchema,
    hours: z.number(),
    revenue: z.number(),
    cost: z.number(),
    marginTotal: z.number(),
    breakdown: z.array(BreakdownLineSchema),
    extras: z.array(z.object({ code: z.string(), name: z.string(), salaryHour: z.number(), rateHour: z.number(), surchargePercent: z.number(), belowAgreement: z.boolean() })),
    issues: z.array(PositionIssue),
  })
  .openapi('QuotePositionCalculation');

const PositionSchema = z
  .object({
    id: z.guid(),
    sortOrder: z.number().int(),
    name: z.string(),
    description: z.string().nullable(),
    collectiveAgreementId: z.guid().nullable(),
    collectiveAgreementName: z.string().nullable(),
    agreementVersionId: z.guid().nullable(),
    agreementCategoryId: z.guid().nullable(),
    agreementCategoryName: z.string().nullable(),
    agreementPeriod: z.object({ from: z.string(), to: z.string().nullable() }).nullable()
      .openapi({ description: 'Vigencia de la versión del convenio usada (p. ej. «Tablas 2026»)' }),
    agreementMinimumSalaryHour: z.number().nullable().openapi({ description: 'Mínimo por hora del convenio de la empresa usuaria' }),
    agreementValues: z.record(z.string(), z.unknown()).nullable().openapi({ description: 'Valores que dio el convenio' }),
    manualFields: z.array(z.string()).openapi({ description: 'Campos cambiados a mano (sin la etiqueta «Del convenio»)' }),
    customCategoryName: z.string().nullable(),
    level: z.string().nullable(),
    annualBaseSalary: z.number(),
    monthlyBonus: z.number(),
    annualPayments: z.number().int().nullable(),
    annualHours: z.number(),
    hoursPerDay: z.number(),
    vacationDays: z.number().int(),
    vacationDaysType: z.enum(['naturales', 'laborables']),
    people: z.number().int(),
    hoursPerPerson: z.number(),
    hourlyRate: z.number().nullable(),
    margin: MarginSchema.nullable().openapi({ description: 'null: el del presupuesto' }),
    costs: z.array(PositionCostSchema),
    extras: z.array(ExtraSchema),
    calculation: PositionCalcSchema.nullable(),
  })
  .openapi('QuotePosition');
type Position = z.infer<typeof PositionSchema>;

const TotalsSchema = z
  .object({
    people: z.number(),
    hours: z.number(),
    revenue: z.number().openapi({ description: 'Facturación estimada (sin conceptos extra)' }),
    cost: z.number(),
    margin: z.number(),
    marginPercent: z.number(),
    averageRate: z.number(),
  })
  .openapi('QuoteTotals');

const VersionSchema = z
  .object({
    id: z.guid(),
    quoteId: z.guid(),
    versionNumber: z.number().int(),
    status: VersionStatus,
    editable: z.boolean(),
    title: z.string().nullable(),
    contactId: z.guid().nullable(),
    contactName: z.string().nullable(),
    contactEmail: z.string().nullable(),
    salesRepId: z.guid().nullable(),
    salesRepName: z.string().nullable(),
    issueDate: z.string(),
    validUntil: z.string().nullable(),
    expectedStartDate: z.string().nullable(),
    durationMonths: z.number().nullable(),
    modality: z.string().nullable(),
    paymentMethodId: z.guid().nullable(),
    paymentMethodName: z.string().nullable(),
    vatRate: z.number(),
    currency: z.string(),
    replacementGuarantee: z.string().nullable(),
    commercialNotes: z.string().nullable(),
    conditions: z.string().nullable(),
    margin: MarginSchema,
    ssRates: SsRatesSchema,
    costConcepts: z.array(CostConceptSchema),
    defaultExtras: z.array(ExtraSchema),
    approvalStatus: ApprovalStatus,
    approvalRequestedByName: z.string().nullable(),
    approvalRequestedAt: Timestamp.nullable(),
    approvalDecidedByName: z.string().nullable(),
    approvalDecidedAt: Timestamp.nullable(),
    approvalNotes: z.string().nullable(),
    minMarginPercent: z.number().nullable().openapi({ description: 'Margen mínimo con el que se comprobó al enviar' }),
    sentAt: Timestamp.nullable(),
    sentByName: z.string().nullable(),
    acceptedAt: Timestamp.nullable(),
    rejectedAt: Timestamp.nullable(),
    rejectionReasonId: z.guid().nullable(),
    rejectionReasonName: z.string().nullable(),
    rejectionNotes: z.string().nullable(),
    closedAt: Timestamp.nullable(),
    totals: TotalsSchema.nullable(),
    issues: z.array(z.object({ position: z.number().int(), issue: PositionIssue })),
    positions: z.array(PositionSchema),
    createdByName: z.string().nullable(),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .openapi('QuoteVersion');
type Version = z.infer<typeof VersionSchema>;

const VersionSummarySchema = z
  .object({
    id: z.guid(),
    versionNumber: z.number().int(),
    status: VersionStatus,
    issueDate: z.string(),
    validUntil: z.string().nullable(),
    revenue: z.number().nullable(),
    averageRate: z.number().nullable(),
    marginPercent: z.number().nullable(),
    createdByName: z.string().nullable(),
    createdAt: Timestamp,
  })
  .openapi('QuoteVersionSummary');

const quoteHeader = {
  id: z.guid(),
  code: z.string(),
  companyId: z.guid(),
  branchId: z.guid(),
  clientId: z.guid().nullable(),
  clientName: z.string().nullable(),
  clientAgreementId: z.guid().nullable().openapi({ description: 'Convenio por defecto del cliente (los puestos parten de él)' }),
  status: VersionStatus,
  versionNumber: z.number().int(),
  createdFromQuoteId: z.guid().nullable(),
  createdFromCode: z.string().nullable(),
  replacedByQuoteId: z.guid().nullable(),
  replacedByCode: z.string().nullable(),
  obsoleteAt: Timestamp.nullable(),
  obsoleteReason: z.string().nullable(),
  createdAt: Timestamp,
};

const QuoteSummarySchema = z
  .object({
    ...quoteHeader,
    title: z.string().nullable(),
    salesRepId: z.guid().nullable(),
    salesRepName: z.string().nullable(),
    issueDate: z.string(),
    validUntil: z.string().nullable(),
    positionsCount: z.number().int(),
    people: z.number().nullable(),
    hours: z.number().nullable(),
    revenue: z.number().nullable(),
    averageRate: z.number().nullable(),
    marginPercent: z.number().nullable(),
    approvalStatus: ApprovalStatus,
    sentAt: Timestamp.nullable(),
    daysWithoutResponse: z.number().int().nullable().openapi({ description: 'Enviado o pendiente de firma: días desde el envío' }),
    noResponse: z.boolean().openapi({ description: 'Lleva los días sin respuesta de la ETT (quoteNoResponseDays) o más' }),
    rejectionReasonName: z.string().nullable(),
  })
  .openapi('QuoteSummary');
type QuoteSummary = z.infer<typeof QuoteSummarySchema>;

const QuoteSchema = z
  .object({ ...quoteHeader, currentVersion: VersionSchema, versions: z.array(VersionSummarySchema) })
  .openapi('Quote');

const versionFields = {
  title: z.string().trim().max(250).nullable(),
  contactId: z.guid().nullable().openapi({ description: 'Contacto del cliente que recibe el presupuesto' }),
  salesRepId: z.guid().nullable().openapi({ description: 'Comercial (usuario de la ETT)' }),
  issueDate: date,
  validUntil: date.nullable(),
  expectedStartDate: date.nullable(),
  durationMonths: z.number().positive().max(999).nullable(),
  modality: z.string().trim().max(250).nullable(),
  paymentMethodId: z.guid().nullable(),
  vatRate: z.number().min(0).max(100),
  currency: z.string().regex(/^[A-Z]{3}$/),
  replacementGuarantee: z.string().trim().max(250).nullable(),
  commercialNotes: z.string().max(10000).nullable(),
  conditions: z.string().max(20000).nullable().openapi({ description: 'Condiciones que se imprimen en la propuesta' }),
  margin: MarginSchema.openapi({ description: 'Margen objetivo por defecto' }),
  ssRates: SsRatesSchema,
  costConcepts: z.array(CostConceptSchema).max(30).refine(uniqueCodes, { message: 'Códigos repetidos' }),
  defaultExtras: z.array(ExtraSchema).max(30).refine(uniqueCodes, { message: 'Códigos repetidos' }),
};
const VersionUpdateSchema = z
  .strictObject({ ...versionFields, status: z.enum(['draft', 'in_preparation']) })
  .partial()
  .openapi('QuoteVersionUpdate');

const QuoteCreateSchema = z
  .strictObject({
    clientId: z.guid().nullable().optional(),
    branchId: z.guid().optional().openapi({ description: 'Sucursal propietaria. Por defecto, la del cliente' }),
    ...versionFields,
  })
  .partial()
  .openapi('QuoteCreate');

const QuoteUpdateSchema = z
  .strictObject({ clientId: z.guid().nullable(), branchId: z.guid() })
  .partial()
  .openapi('QuoteUpdate');

const positionFields = {
  sortOrder: z.number().int().min(0).max(10000),
  name: z.string().trim().min(1).max(200),
  description: z.string().max(4000).nullable(),
  collectiveAgreementId: z.guid().nullable().openapi({ description: 'Convenio (tabla maestra de la ETT)' }),
  agreementCategoryId: z.guid().nullable()
    .openapi({ description: 'Categoría de la versión publicada del convenio global (GET /v1/quote-agreement-defaults)' }),
  customCategoryName: z.string().trim().max(200).nullable().openapi({ description: '«Otro / personalizado»' }),
  level: z.string().trim().max(120).nullable(),
  annualBaseSalary: money,
  monthlyBonus: money,
  annualPayments: z.number().int().min(1).max(24).nullable(),
  annualHours: z.number().positive().max(4000),
  hoursPerDay: z.number().positive().max(24),
  vacationDays: z.number().int().min(0).max(366),
  vacationDaysType: z.enum(['naturales', 'laborables']),
  people: z.number().int().min(1).max(100000),
  hoursPerPerson: z.number().min(0).max(100000),
  hourlyRate: z.number().min(0).max(10000).nullable().openapi({ description: 'Tarifa ofertada (€/h). null: la sugerida' }),
  margin: MarginSchema.nullable().openapi({ description: 'null: el del presupuesto' }),
  costs: z.array(PositionCostSchema).max(30).refine(uniqueCodes, { message: 'Códigos repetidos' }),
  extras: z.array(ExtraSchema).max(30).refine(uniqueCodes, { message: 'Códigos repetidos' }),
};
const PositionCreateSchema = z
  .strictObject(positionFields)
  .partial()
  .required({ name: true })
  .openapi('QuotePositionCreate', {
    description:
      'Con `agreementCategoryId`, lo que no se envíe de salario, pluses, pagas, horas y vacaciones sale del convenio. ' +
      'Sin convenio con tabla, `annualBaseSalary` y `annualHours` son obligatorios.',
  });
const PositionUpdateSchema = z.strictObject(positionFields).partial().openapi('QuotePositionUpdate');

const ListQuery = PaginationQuery.extend({
  q: z.string().trim().min(1).max(100).optional().openapi({ description: 'Busca en el número, el título y el cliente' }),
  status: VersionStatus.optional(),
  salesRepId: z.guid().optional(),
  clientId: z.guid().optional(),
  branchId: z.guid().optional(),
  validity: z.enum(['valid', 'expiring', 'expired']).optional()
    .openapi({ description: 'valid: vigentes; expiring: caducan en 7 días; expired: caducados' }),
  noResponse: z.stringbool().optional().openapi({ description: 'Solo los que llevan los días sin respuesta de la ETT' }),
});

const AgreementDefaultsQuery = z.object({
  collectiveAgreementId: z.guid(),
  agreementCategoryId: z.guid().optional(),
  date: z.iso.date().optional().openapi({ description: 'Fecha de referencia (inicio previsto). Por defecto, hoy' }),
});
const AgreementDefaultsSchema = z
  .object({
    agreementVersionId: z.guid().nullable().openapi({ description: 'null: el convenio no está enlazado o no hay tablas publicadas' }),
    effectiveFrom: z.string().nullable(),
    effectiveTo: z.string().nullable(),
    provisional: z.boolean().nullable(),
    categories: z.array(z.object({ id: z.guid(), code: z.string(), name: z.string(), groupName: z.string().nullable(), level: z.string().nullable() })),
    defaults: z
      .object({
        annualBaseSalary: z.number().nullable(),
        monthlyBonus: z.number(),
        annualPayments: z.number().nullable(),
        annualHours: z.number().nullable(),
        vacationDays: z.number().nullable(),
        vacationDaysType: z.enum(['naturales', 'laborables']).nullable(),
        minimumSalaryHour: z.number().nullable(),
        extras: z.array(z.record(z.string(), z.unknown())),
      })
      .nullable()
      .openapi({ description: 'Con agreementCategoryId' }),
  })
  .openapi('QuoteAgreementDefaults');

const NotesBody = z.strictObject({ notes: z.string().trim().max(2000).nullable().optional() }).openapi('QuoteNotes');
const RejectBody = z
  .strictObject({ reasonId: z.guid().openapi({ description: 'Motivo (tabla maestra quote_rejection_reason)' }), notes: z.string().trim().max(2000).nullable().optional() })
  .openapi('QuoteReject');
const ObsoleteBody = z.strictObject({ reason: z.string().trim().min(1).max(250) }).openapi('QuoteObsolete');
const ResetBody = z
  .strictObject({ fields: z.array(z.enum(AGREEMENT_FIELDS)).min(1).optional().openapi({ description: 'Por defecto, todos' }) })
  .openapi('QuotePositionReset');

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------
const VersionIdParams = IdParams;

interface PositionRow extends Omit<Position, 'margin' | 'agreementPeriod' | 'calculation'> {
  marginMode: 'percent' | 'per_hour' | null;
  marginValue: number | null;
  agreementPeriodFrom: string | null;
  agreementPeriodTo: string | null;
  calcResult: Position['calculation'];
}

async function loadPositions(tx: Tx, tenantId: string, versionId: string): Promise<Position[]> {
  const rows = await tx<PositionRow[]>`
    select p.id, p.sort_order, p.name, p.description, p.collective_agreement_id, ca.name as collective_agreement_name,
           p.agreement_version_id, p.agreement_category_id, ac.name as agreement_category_name,
           to_char(p.agreement_period_from, 'YYYY-MM-DD') as agreement_period_from,
           to_char(p.agreement_period_to, 'YYYY-MM-DD') as agreement_period_to,
           p.agreement_minimum_salary_hour::float8 as agreement_minimum_salary_hour, p.agreement_values, p.manual_fields,
           p.custom_category_name, p.level, p.annual_base_salary::float8 as annual_base_salary,
           p.monthly_bonus::float8 as monthly_bonus, p.annual_payments, p.annual_hours::float8 as annual_hours,
           p.hours_per_day::float8 as hours_per_day, p.vacation_days, p.vacation_days_type, p.people,
           p.hours_per_person::float8 as hours_per_person, p.hourly_rate::float8 as hourly_rate, p.margin_mode,
           p.margin_value::float8 as margin_value, p.costs, p.extras, p.calc_result
    from public.quote_positions p
    left join public.collective_agreements ca on ca.tenant_id = p.tenant_id and ca.id = p.collective_agreement_id
    left join public.agreement_categories ac on ac.id = p.agreement_category_id
    where p.tenant_id = ${tenantId} and p.version_id = ${versionId}
    order by p.sort_order, p.created_at, p.id
  `;
  return rows.map(({ marginMode, marginValue, agreementPeriodFrom, agreementPeriodTo, calcResult, ...p }) => ({
    ...p,
    margin: marginMode && marginValue !== null ? { mode: marginMode, value: marginValue } : null,
    agreementPeriod: agreementPeriodFrom ? { from: agreementPeriodFrom, to: agreementPeriodTo } : null,
    calculation: calcResult,
  }));
}

interface VersionRow extends Omit<Version, 'margin' | 'totals' | 'issues' | 'positions' | 'editable' | 'ssRates'> {
  marginMode: 'percent' | 'per_hour';
  marginValue: number;
  ssRates: Version['ssRates'];
  calcResult: { totals: Version['totals']; issues: Version['issues'] } | null;
}

async function loadVersion(tx: Tx, tenantId: string, versionId: string): Promise<Version> {
  const [row] = await tx<VersionRow[]>`
    select v.id, v.quote_id, v.version_number, v.status, v.title, v.contact_id, cc.name as contact_name,
           cc.email as contact_email, v.sales_rep_id, sr.full_name as sales_rep_name,
           to_char(v.issue_date, 'YYYY-MM-DD') as issue_date, to_char(v.valid_until, 'YYYY-MM-DD') as valid_until,
           to_char(v.expected_start_date, 'YYYY-MM-DD') as expected_start_date, v.duration_months::float8 as duration_months,
           v.modality, v.payment_method_id, pm.name as payment_method_name, v.vat_rate::float8 as vat_rate, v.currency,
           v.replacement_guarantee, v.commercial_notes, v.conditions, v.margin_mode, v.margin_value::float8 as margin_value,
           v.ss_rates, v.cost_concepts, v.default_extras, v.approval_status, ar.full_name as approval_requested_by_name,
           v.approval_requested_at, ad.full_name as approval_decided_by_name, v.approval_decided_at, v.approval_notes,
           v.min_margin_percent::float8 as min_margin_percent, v.sent_at, sb.full_name as sent_by_name, v.accepted_at,
           v.rejected_at, v.rejection_reason_id, rr.name as rejection_reason_name, v.rejection_notes, v.closed_at,
           v.calc_result, cb.full_name as created_by_name, v.created_at, v.updated_at
    from public.quote_versions v
    left join public.client_contacts cc on cc.tenant_id = v.tenant_id and cc.id = v.contact_id
    left join public.profiles sr on sr.id = v.sales_rep_id
    left join public.profiles ar on ar.id = v.approval_requested_by
    left join public.profiles ad on ad.id = v.approval_decided_by
    left join public.profiles sb on sb.id = v.sent_by
    left join public.profiles cb on cb.id = v.created_by
    left join public.catalog_items pm on pm.tenant_id = v.tenant_id and pm.id = v.payment_method_id
    left join public.catalog_items rr on rr.tenant_id = v.tenant_id and rr.id = v.rejection_reason_id
    where v.tenant_id = ${tenantId} and v.id = ${versionId}
  `;
  if (!row) throw notFound('La versión no existe');
  const { marginMode, marginValue, calcResult, ...rest } = row;
  return {
    ...rest,
    editable: (EDITABLE_STATUSES as readonly string[]).includes(row.status),
    margin: { mode: marginMode, value: marginValue },
    totals: calcResult?.totals ?? null,
    issues: calcResult?.issues ?? [],
    positions: await loadPositions(tx, tenantId, versionId),
  };
}

const summarySelect = (tx: Tx, tenantId: string) => tx`
  select q.id, q.code, q.company_id, q.branch_id, q.client_id, c.legal_name as client_name,
         c.default_agreement_id as client_agreement_id, v.status, v.version_number, q.created_from_quote_id,
         cf.code as created_from_code, rb.id as replaced_by_quote_id, rb.code as replaced_by_code, q.obsolete_at,
         q.obsolete_reason, q.created_at, v.title, v.sales_rep_id, sr.full_name as sales_rep_name,
         to_char(v.issue_date, 'YYYY-MM-DD') as issue_date, to_char(v.valid_until, 'YYYY-MM-DD') as valid_until,
         (select count(*)::int from public.quote_positions p where p.tenant_id = v.tenant_id and p.version_id = v.id) as positions_count,
         v.calc_people as people, v.calc_hours::float8 as hours, v.calc_revenue::float8 as revenue,
         v.calc_average_rate::float8 as average_rate, v.calc_margin_percent::float8 as margin_percent, v.approval_status,
         v.sent_at,
         case when v.status in ('sent', 'pending_signature') then (current_date - v.sent_at::date) end as days_without_response,
         coalesce(v.status in ('sent', 'pending_signature') and current_date - v.sent_at::date >= t.quote_no_response_days, false) as no_response,
         rr.name as rejection_reason_name
  from public.quotes q
  join public.tenants t on t.id = q.tenant_id
  join lateral (
    select * from public.quote_versions lv where lv.tenant_id = q.tenant_id and lv.quote_id = q.id
    order by lv.version_number desc limit 1
  ) v on true
  left join public.clients c on c.tenant_id = q.tenant_id and c.id = q.client_id
  left join public.quotes cf on cf.tenant_id = q.tenant_id and cf.id = q.created_from_quote_id
  left join lateral (
    select n.id, n.code from public.quotes n where n.tenant_id = q.tenant_id and n.created_from_quote_id = q.id
    order by n.created_at limit 1
  ) rb on q.obsolete_at is not null
  left join public.profiles sr on sr.id = v.sales_rep_id
  left join public.catalog_items rr on rr.tenant_id = v.tenant_id and rr.id = v.rejection_reason_id
  where q.tenant_id = ${tenantId}
`;

async function loadQuote(tx: Tx, tenantId: string, quoteId: string) {
  const [summary] = await tx<QuoteSummary[]>`${summarySelect(tx, tenantId)} and q.id = ${quoteId}`;
  if (!summary) throw notFound('El presupuesto no existe');
  const versions = await tx<z.infer<typeof VersionSummarySchema>[]>`
    select v.id, v.version_number, v.status, to_char(v.issue_date, 'YYYY-MM-DD') as issue_date,
           to_char(v.valid_until, 'YYYY-MM-DD') as valid_until, v.calc_revenue::float8 as revenue,
           v.calc_average_rate::float8 as average_rate, v.calc_margin_percent::float8 as margin_percent,
           p.full_name as created_by_name, v.created_at
    from public.quote_versions v left join public.profiles p on p.id = v.created_by
    where v.tenant_id = ${tenantId} and v.quote_id = ${quoteId}
    order by v.version_number desc
  `;
  const current = versions[0]!;
  const {
    title: _t, salesRepId: _s, salesRepName: _sn, issueDate: _i, validUntil: _v, positionsCount: _pc, people: _p,
    hours: _h, revenue: _r, averageRate: _a, marginPercent: _m, approvalStatus: _ap, sentAt: _sa,
    daysWithoutResponse: _d, noResponse: _n, rejectionReasonName: _rr, ...header
  } = summary;
  return { ...header, currentVersion: await loadVersion(tx, tenantId, current.id), versions: [...versions] };
}

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------
interface VersionCtx {
  id: string;
  quoteId: string;
  versionNumber: number;
  status: string;
  latest: number;
  defaultExtras: Extra[];
  obsolete: boolean;
}

/** La versión (si se ve; si no, 404) con lo necesario para decidir. */
async function findVersion(tx: Tx, tenantId: string, versionId: string): Promise<VersionCtx> {
  const [row] = await tx<VersionCtx[]>`
    select v.id, v.quote_id, v.version_number, v.status, v.default_extras, q.obsolete_at is not null as obsolete,
           (select max(o.version_number) from public.quote_versions o where o.tenant_id = v.tenant_id and o.quote_id = v.quote_id) as latest
    from public.quote_versions v join public.quotes q on q.tenant_id = v.tenant_id and q.id = v.quote_id
    where v.tenant_id = ${tenantId} and v.id = ${versionId}
  `;
  if (!row) throw notFound('La versión no existe');
  return row;
}

function requireEditable(v: VersionCtx) {
  if (v.versionNumber !== v.latest || !(EDITABLE_STATUSES as readonly string[]).includes(v.status)) {
    throw new ApiError(409, 'conflicto', 'La versión está cerrada (ya se envió o no es la actual): para cambiarla, crea una versión nueva');
  }
}

/** Columnas de la versión desde el cuerpo (solo lo enviado). */
function versionColumns(tx: Tx, body: Partial<Record<keyof typeof versionFields | 'status', unknown>>) {
  const out: Record<string, unknown> = {};
  const simple = ['title', 'contactId', 'salesRepId', 'issueDate', 'validUntil', 'expectedStartDate', 'durationMonths', 'modality',
    'paymentMethodId', 'vatRate', 'currency', 'replacementGuarantee', 'commercialNotes', 'conditions', 'status'] as const;
  for (const key of simple) if (body[key] !== undefined) out[key] = body[key];
  if (body.margin !== undefined) {
    const m = body.margin as { mode: string; value: number };
    out.marginMode = m.mode;
    out.marginValue = m.value;
  }
  for (const key of ['ssRates', 'costConcepts', 'defaultExtras'] as const) {
    if (body[key] !== undefined) out[key] = tx.json(body[key] as never);
  }
  return out as Record<string, never>;
}

/** El contacto es del cliente del presupuesto y el comercial, de la ETT. */
async function checkVersionRefs(tx: Tx, tenantId: string, quoteId: string, contactId: unknown, salesRepId: unknown) {
  if (typeof contactId === 'string') {
    const [ok] = await tx`
      select 1 from public.client_contacts cc join public.quotes q on q.tenant_id = cc.tenant_id and q.client_id = cc.client_id
      where cc.tenant_id = ${tenantId} and cc.id = ${contactId} and q.id = ${quoteId}
    `;
    if (!ok) throw new ApiError(422, 'referencia_invalida', 'El contacto tiene que ser del cliente del presupuesto');
  }
  if (typeof salesRepId === 'string') {
    const [ok] = await tx`
      select 1 from public.memberships where tenant_id = ${tenantId} and user_id = ${salesRepId} and deleted_at is null
    `;
    if (!ok) throw new ApiError(422, 'referencia_invalida', 'El comercial tiene que ser un usuario de la ETT');
  }
}

/** Costes internos: los de siempre no se quitan del presupuesto. */
function checkRequiredConcepts(concepts: CostConcept[] | undefined) {
  if (!concepts) return;
  const missing = DEFAULT_COST_CONCEPTS.filter((d) => !concepts.some((c) => c.code === d.code));
  if (missing.length) {
    throw new ApiError(422, 'validacion', `Los costes internos de siempre no se quitan del presupuesto: ${missing.map((m) => m.name).join(', ')}`);
  }
}

type PositionBody = Partial<z.infer<typeof PositionUpdateSchema>>;

/**
 * Columnas del puesto. Con categoría de convenio nueva, lo que no venga en el cuerpo se rellena del convenio; si no,
 * se mantiene lo guardado. Calcula qué campos se han cambiado a mano.
 */
async function positionColumns(
  tx: Tx,
  tenantId: string,
  version: VersionCtx,
  body: PositionBody,
  current: (PositionBody & { agreementValues: AgreementValues | null; extras: Extra[] }) | null,
) {
  const merged = { ...(current ?? {}), ...body } as PositionBody & { agreementValues?: AgreementValues | null };
  const agreementChanged =
    !current ||
    (body.agreementCategoryId !== undefined && body.agreementCategoryId !== current.agreementCategoryId) ||
    (body.collectiveAgreementId !== undefined && body.collectiveAgreementId !== current.collectiveAgreementId);

  let agreementVersionId: string | null | undefined;
  let agreementValues: AgreementValues | null = current?.agreementValues ?? null;
  let defaults = null;
  if (merged.agreementCategoryId) {
    // Un convenio ya usado que después se retiró se mantiene (copia de versiones); para elegirlo, tiene que estar publicado.
    const resolved = await resolveAgreementCategory(tx, tenantId, merged.collectiveAgreementId ?? null, merged.agreementCategoryId, {
      allowWithdrawn: !agreementChanged,
    });
    agreementVersionId = resolved.agreementVersionId;
    defaults = resolved.defaults;
    if (agreementChanged) {
      agreementValues = agreementValuesOf(defaults);
      // Al cambiar de convenio o categoría los valores se vuelven a cargar (salvo lo que venga en el cuerpo).
      for (const f of AGREEMENT_FIELDS) {
        if (body[f] === undefined && agreementValues[f] !== null && agreementValues[f] !== undefined) {
          (merged as Record<string, unknown>)[f] = agreementValues[f];
        }
      }
    }
  } else {
    agreementVersionId = null;
    agreementValues = null;
  }

  if (merged.annualBaseSalary === undefined || merged.annualBaseSalary === null) {
    throw new ApiError(422, 'validacion', 'Falta el salario base anual (sin tabla de convenio hay que escribirlo)');
  }
  if (merged.annualHours === undefined || merged.annualHours === null) {
    throw new ApiError(422, 'validacion', 'Faltan las horas anuales (sin tabla de convenio hay que escribirlas)');
  }

  // El salario de los extras que define el convenio sale de ahí, con su mínimo.
  const extras = extrasWithAgreement((body.extras ?? current?.extras ?? version.defaultExtras) as Extra[], defaults);

  const cols: Record<string, unknown> = {};
  const simple = ['sortOrder', 'name', 'description', 'collectiveAgreementId', 'agreementCategoryId', 'customCategoryName', 'level',
    'annualBaseSalary', 'monthlyBonus', 'annualPayments', 'annualHours', 'hoursPerDay', 'vacationDays', 'vacationDaysType', 'people',
    'hoursPerPerson', 'hourlyRate'] as const;
  for (const key of simple) if (merged[key] !== undefined) cols[key] = merged[key];
  if (merged.margin !== undefined) {
    cols.marginMode = merged.margin?.mode ?? null;
    cols.marginValue = merged.margin?.value ?? null;
  }
  if (body.costs !== undefined) cols.costs = tx.json(body.costs as never);
  cols.extras = tx.json(extras as never);
  cols.agreementVersionId = agreementVersionId;
  cols.agreementValues = agreementValues ? tx.json(agreementValues as never) : null;
  cols.manualFields = manualFields(merged as AgreementValues, agreementValues);
  return cols as Record<string, never>;
}

async function currentPosition(tx: Tx, tenantId: string, positionId: string) {
  const [row] = await tx<{ versionId: string }[]>`
    select version_id from public.quote_positions where tenant_id = ${tenantId} and id = ${positionId}
  `;
  if (!row) throw notFound('El puesto no existe');
  const position = (await loadPositions(tx, tenantId, row.versionId)).find((p) => p.id === positionId)!;
  return { versionId: row.versionId, position };
}

/** Comprobaciones antes de enviar («revisión antes de enviar»): un detalle por cada punto que falla. */
async function sendChecklist(tx: Tx, tenantId: string, versionId: string) {
  const v = await loadVersion(tx, tenantId, versionId);
  const [q] = await tx<{ clientId: string | null }[]>`select client_id from public.quotes where tenant_id = ${tenantId} and id = ${v.quoteId}`;
  const issues: { path: string; message: string }[] = [];
  if (!q?.clientId) issues.push({ path: 'clientId', message: 'Falta el cliente' });
  if (!v.contactId) issues.push({ path: 'contactId', message: 'Falta el contacto que recibe el presupuesto' });
  else if (!v.contactEmail) issues.push({ path: 'contactId', message: 'El contacto no tiene email' });
  if (!v.salesRepId) issues.push({ path: 'salesRepId', message: 'Falta el comercial' });
  const [today] = await tx<{ d: string }[]>`select to_char(current_date, 'YYYY-MM-DD') as d`;
  if (!v.validUntil || v.validUntil < today!.d) issues.push({ path: 'validUntil', message: 'La validez tiene que ser una fecha futura' });
  if (v.positions.length === 0) issues.push({ path: 'positions', message: 'Hace falta al menos un puesto' });
  v.positions.forEach((p, i) => {
    if (p.hourlyRate === null) issues.push({ path: `positions.${i}.hourlyRate`, message: `«${p.name}»: falta la tarifa` });
    else if (p.calculation?.issues.includes('rate_below_cost')) {
      issues.push({ path: `positions.${i}.hourlyRate`, message: `«${p.name}»: la tarifa no cubre el coste` });
    }
  });
  return issues;
}

// ---------------------------------------------------------------------------
// Rutas
// ---------------------------------------------------------------------------
const versionAction = (path: string, summary: string, description: string) =>
  createRoute({
    method: 'post',
    path: `/quote-versions/{id}/${path}`,
    tags,
    summary,
    description,
    security: bearerSecurity,
    request: { params: VersionIdParams },
    responses: { 200: jsonContent(VersionSchema, 'Versión'), ...errorResponses(400, 401, 403, 404, 409, 422) },
  });
const versionActionWithBody = <T extends z.ZodType>(path: string, summary: string, description: string, body: T) =>
  createRoute({
    method: 'post',
    path: `/quote-versions/{id}/${path}`,
    tags,
    summary,
    description,
    security: bearerSecurity,
    request: { params: VersionIdParams, body: jsonBody(body) },
    responses: { 200: jsonContent(VersionSchema, 'Versión'), ...errorResponses(400, 401, 403, 404, 409, 422) },
  });

const storageOf = (c: Context<AppEnv>) => requireStorage(c.get('storage'));

export const quotes = createRouter()
  .openapi(
    createRoute({
      method: 'get',
      path: '/quotes',
      tags,
      summary: 'Lista los presupuestos',
      description: 'De las sucursales a las que tienes acceso. Cada fila lleva los datos de su versión actual.',
      security: bearerSecurity,
      request: { query: ListQuery },
      responses: { 200: jsonContent(paginated(QuoteSummarySchema), 'Presupuestos'), ...errorResponses(400, 401, 403) },
    }),
    async (c) => {
      const q = c.req.valid('query');
      const page = await withTenant(c, {}, async (tx, ctx) => {
        const conditions = [tx`true`];
        if (q.q) {
          const pattern = likePattern(q.q);
          conditions.push(tx`(q.code ilike ${pattern} or v.title ilike ${pattern} or c.legal_name ilike ${pattern})`);
        }
        if (q.status) conditions.push(tx`v.status = ${q.status}`);
        if (q.salesRepId) conditions.push(tx`v.sales_rep_id = ${q.salesRepId}`);
        if (q.clientId) conditions.push(tx`q.client_id = ${q.clientId}`);
        if (q.branchId) conditions.push(tx`q.branch_id = ${q.branchId}`);
        if (q.validity === 'valid') conditions.push(tx`(v.valid_until is null or v.valid_until >= current_date)`);
        if (q.validity === 'expiring') conditions.push(tx`v.valid_until between current_date and current_date + 7`);
        if (q.validity === 'expired') conditions.push(tx`v.valid_until < current_date`);
        if (q.noResponse) {
          conditions.push(tx`v.status in ('sent', 'pending_signature') and current_date - v.sent_at::date >= t.quote_no_response_days`);
        }
        const where = conditions.reduce((acc, cond) => tx`${acc} and ${cond}`);
        const base = summarySelect(tx, ctx.tenantId);
        const data = await tx<QuoteSummary[]>`${base} and ${where} order by q.created_at desc, q.id limit ${q.limit} offset ${q.offset}`;
        const [count] = await tx<{ total: number }[]>`select count(*)::int as total from (${base} and ${where}) s`;
        return { data: [...data], pagination: { limit: q.limit, offset: q.offset, total: count?.total ?? 0 } };
      });
      return c.json(page, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/quotes',
      tags,
      summary: 'Crear un presupuesto',
      description:
        `Requiere \`${MANAGE}\`. Toma el número de la serie \`quote\` de la sociedad y crea la versión 1 en borrador, con ` +
        `${DEFAULT_VALIDITY_DAYS} días de validez, los costes internos de siempre, los conceptos extra por defecto, los ` +
        'tipos de la Seguridad Social por defecto (AT/EP según el CNAE del cliente), tú como comercial y el contacto ' +
        'destinatario de presupuestos del cliente. Sin cliente hace falta `branchId`.',
      security: bearerSecurity,
      request: { body: jsonBody(QuoteCreateSchema) },
      responses: { 201: jsonContent(QuoteSchema, 'Presupuesto creado'), ...errorResponses(400, 401, 403, 404, 409, 422) },
    }),
    async (c) => {
      const body = c.req.valid('json');
      const quote = await withTenant(c, { permission: MANAGE }, async (tx, ctx) => {
        const scope = await quoteScope(tx, ctx.tenantId, body.clientId ?? null, body.branchId);
        checkRequiredConcepts(body.costConcepts);
        const [created] = await tx<{ id: string }[]>`
          insert into public.quotes ${tx({
            tenantId: ctx.tenantId,
            companyId: scope.companyId,
            branchId: scope.branchId,
            clientId: body.clientId ?? null,
            code: await nextQuoteCode(tx, ctx.tenantId, scope.companyId),
          })} returning id
        `;
        await checkVersionRefs(tx, ctx.tenantId, created!.id, body.contactId, body.salesRepId);
        const values = {
          tenantId: ctx.tenantId,
          quoteId: created!.id,
          versionNumber: 1,
          validUntil: tx`current_date + ${DEFAULT_VALIDITY_DAYS}::int`,
          salesRepId: ctx.userId,
          contactId: scope.contactId,
          ssRates: tx.json(defaultSsRates(scope.sectorCode) as never),
          costConcepts: tx.json(DEFAULT_COST_CONCEPTS as never),
          defaultExtras: tx.json(DEFAULT_EXTRAS as never),
          ...versionColumns(tx, body),
        };
        const [version] = await tx<{ id: string }[]>`
          insert into public.quote_versions ${tx(values as never)} returning id
        `;
        await recalculate(tx, ctx.tenantId, version!.id);
        return loadQuote(tx, ctx.tenantId, created!.id);
      });
      return c.json(quote, 201);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/quotes/{id}',
      tags,
      summary: 'Ver un presupuesto',
      description: 'Con su versión actual completa (puestos y cálculo) y la lista de versiones.',
      security: bearerSecurity,
      request: { params: IdParams },
      responses: { 200: jsonContent(QuoteSchema, 'Presupuesto'), ...errorResponses(400, 401, 403, 404) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const quote = await withTenant(c, {}, (tx, ctx) => loadQuote(tx, ctx.tenantId, id));
      return c.json(quote, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'patch',
      path: '/quotes/{id}',
      tags,
      summary: 'Cambiar el cliente o la sucursal',
      description: 'Solo mientras el presupuesto tiene una única versión sin enviar. Al cambiar de cliente se quita el contacto.',
      security: bearerSecurity,
      request: { params: IdParams, body: jsonBody(QuoteUpdateSchema) },
      responses: { 200: jsonContent(QuoteSchema, 'Presupuesto'), ...errorResponses(400, 401, 403, 404, 409, 422) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      const quote = await withTenant(c, { permission: MANAGE }, async (tx, ctx) => {
        const [current] = await tx<{ clientId: string | null; branchId: string }[]>`
          select client_id, branch_id from public.quotes where tenant_id = ${ctx.tenantId} and id = ${id}
        `;
        if (!current) throw notFound('El presupuesto no existe');
        const clientId = body.clientId === undefined ? current.clientId : body.clientId;
        const scope = await quoteScope(tx, ctx.tenantId, clientId, body.branchId ?? (body.clientId !== undefined ? undefined : current.branchId));
        await tx`
          update public.quotes set ${tx({ clientId, companyId: scope.companyId, branchId: scope.branchId })}
          where tenant_id = ${ctx.tenantId} and id = ${id}
        `;
        if (clientId !== current.clientId) {
          await tx`
            update public.quote_versions set contact_id = ${scope.contactId}
            where tenant_id = ${ctx.tenantId} and quote_id = ${id}
          `;
        }
        return loadQuote(tx, ctx.tenantId, id);
      });
      return c.json(quote, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/quotes/{id}/duplicate',
      tags,
      summary: 'Duplicar para otro cliente',
      description:
        'Presupuesto nuevo (número nuevo) con los mismos puestos, costes internos, extras y condiciones de la versión ' +
        'actual, sin cliente ni contacto: se elige después con PATCH /v1/quotes/{id}.',
      security: bearerSecurity,
      request: { params: IdParams },
      responses: { 201: jsonContent(QuoteSchema, 'Presupuesto nuevo'), ...errorResponses(400, 401, 403, 404, 422) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const quote = await withTenant(c, { permission: MANAGE }, async (tx, ctx) => {
        const source = await sourceQuote(tx, ctx.tenantId, id);
        const [created] = await tx<{ id: string }[]>`
          insert into public.quotes ${tx({
            tenantId: ctx.tenantId, companyId: source.companyId, branchId: source.branchId, clientId: null,
            code: await nextQuoteCode(tx, ctx.tenantId, source.companyId),
          })} returning id
        `;
        await copyVersion(tx, ctx.tenantId, source.versionId, created!.id, 1, { withoutClientData: true });
        return loadQuote(tx, ctx.tenantId, created!.id);
      });
      return c.json(quote, 201);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/quotes/{id}/obsolete',
      tags,
      summary: 'Pasar a obsoleto y crear uno nuevo',
      description:
        'El presupuesto deja de valer (queda cerrado, solo para consultar, con el motivo) y se crea otro con número ' +
        'nuevo a partir de su versión actual, en borrador. Si estaba aceptado, sus peticiones siguen con sus tarifas ' +
        'hasta que se acepte el nuevo.',
      security: bearerSecurity,
      request: { params: IdParams, body: jsonBody(ObsoleteBody) },
      responses: {
        201: jsonContent(z.object({ obsolete: QuoteSchema, created: QuoteSchema }).openapi('QuoteObsoleteResult'), 'Obsoleto y nuevo'),
        ...errorResponses(400, 401, 403, 404, 409),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const { reason } = c.req.valid('json');
      const result = await withTenant(c, { permission: MANAGE }, async (tx, ctx) => {
        const source = await sourceQuote(tx, ctx.tenantId, id);
        if (source.obsolete) throw new ApiError(409, 'conflicto', 'El presupuesto ya está obsoleto');
        await tx`update public.quotes set obsolete_reason = ${reason} where tenant_id = ${ctx.tenantId} and id = ${id}`;
        await tx`update public.quote_versions set status = 'obsolete' where tenant_id = ${ctx.tenantId} and id = ${source.versionId}`;
        const [created] = await tx<{ id: string }[]>`
          insert into public.quotes ${tx({
            tenantId: ctx.tenantId, companyId: source.companyId, branchId: source.branchId, clientId: source.clientId,
            createdFromQuoteId: id, code: await nextQuoteCode(tx, ctx.tenantId, source.companyId),
          })} returning id
        `;
        await copyVersion(tx, ctx.tenantId, source.versionId, created!.id, 1);
        return { obsolete: await loadQuote(tx, ctx.tenantId, id), created: await loadQuote(tx, ctx.tenantId, created!.id) };
      });
      return c.json(result, 201);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/quote-versions/{id}',
      tags,
      summary: 'Ver una versión',
      description: 'También las anteriores (sustituidas), para comparar con la actual.',
      security: bearerSecurity,
      request: { params: VersionIdParams },
      responses: { 200: jsonContent(VersionSchema, 'Versión'), ...errorResponses(400, 401, 403, 404) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const version = await withTenant(c, {}, (tx, ctx) => loadVersion(tx, ctx.tenantId, id));
      return c.json(version, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'patch',
      path: '/quote-versions/{id}',
      tags,
      summary: 'Editar la cabecera, el margen, los costes internos y los extras por defecto',
      description:
        'Solo la versión actual en borrador o en preparación (409 si no). Solo cambia lo enviado; las listas ' +
        '(`costConcepts`, `defaultExtras`) se sustituyen enteras. Los costes internos de siempre no se quitan. ' +
        'Cambiar algo anula la aprobación del margen pedida o dada.',
      security: bearerSecurity,
      request: { params: VersionIdParams, body: jsonBody(VersionUpdateSchema) },
      responses: { 200: jsonContent(VersionSchema, 'Versión'), ...errorResponses(400, 401, 403, 404, 409, 422) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      if (Object.keys(body).length === 0) throw new ApiError(400, 'validacion', 'No hay ningún campo que cambiar');
      const version = await withTenant(c, { permission: MANAGE }, async (tx, ctx) => {
        const v = await findVersion(tx, ctx.tenantId, id);
        requireEditable(v);
        checkRequiredConcepts(body.costConcepts);
        await checkVersionRefs(tx, ctx.tenantId, v.quoteId, body.contactId, body.salesRepId);
        await tx`update public.quote_versions set ${tx(versionColumns(tx, body))} where tenant_id = ${ctx.tenantId} and id = ${id}`;
        await recalculate(tx, ctx.tenantId, id);
        return loadVersion(tx, ctx.tenantId, id);
      });
      return c.json(version, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/quote-versions/{id}/positions',
      tags,
      summary: 'Añadir un puesto',
      description:
        'Con `agreementCategoryId`, los parámetros retributivos que no se envíen salen de esa versión publicada del ' +
        'convenio (y se guarda qué se cambia a mano). Los conceptos extra, si no se envían, son los de por defecto del ' +
        'presupuesto. 422 `salario_bajo_convenio` si el salario queda por debajo del convenio.',
      security: bearerSecurity,
      request: { params: VersionIdParams, body: jsonBody(PositionCreateSchema) },
      responses: { 201: jsonContent(VersionSchema, 'Versión con el puesto'), ...errorResponses(400, 401, 403, 404, 409, 422) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      const version = await withTenant(c, { permission: MANAGE }, async (tx, ctx) => {
        const v = await findVersion(tx, ctx.tenantId, id);
        requireEditable(v);
        const cols = await positionColumns(tx, ctx.tenantId, v, body, null);
        const [order] = await tx<{ next: number }[]>`
          select coalesce(max(sort_order) + 1, 0)::int as next from public.quote_positions
          where tenant_id = ${ctx.tenantId} and version_id = ${id}
        `;
        await tx`
          insert into public.quote_positions ${tx({ sortOrder: order!.next, ...cols, tenantId: ctx.tenantId, quoteId: v.quoteId, versionId: id } as never)}
        `;
        await recalculate(tx, ctx.tenantId, id);
        return loadVersion(tx, ctx.tenantId, id);
      });
      return c.json(version, 201);
    },
  )
  .openapi(
    createRoute({
      method: 'patch',
      path: '/quote-positions/{id}',
      tags,
      summary: 'Editar un puesto',
      description:
        'Solo cambia lo enviado; `costs` y `extras` se sustituyen enteros. Al cambiar de convenio o de categoría, los ' +
        'parámetros retributivos que no se envíen se vuelven a cargar del convenio.',
      security: bearerSecurity,
      request: { params: IdParams, body: jsonBody(PositionUpdateSchema) },
      responses: { 200: jsonContent(VersionSchema, 'Versión'), ...errorResponses(400, 401, 403, 404, 409, 422) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      if (Object.keys(body).length === 0) throw new ApiError(400, 'validacion', 'No hay ningún campo que cambiar');
      const version = await withTenant(c, { permission: MANAGE }, async (tx, ctx) => {
        const { versionId, position } = await currentPosition(tx, ctx.tenantId, id);
        const v = await findVersion(tx, ctx.tenantId, versionId);
        requireEditable(v);
        const cols = await positionColumns(tx, ctx.tenantId, v, body, position as never);
        await tx`update public.quote_positions set ${tx(cols)} where tenant_id = ${ctx.tenantId} and id = ${id}`;
        await recalculate(tx, ctx.tenantId, versionId);
        return loadVersion(tx, ctx.tenantId, versionId);
      });
      return c.json(version, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/quote-positions/{id}/reset-from-agreement',
      tags,
      summary: 'Volver a los valores del convenio',
      description: 'Los campos indicados (por defecto, todos) vuelven a lo que dio el convenio al rellenar el puesto.',
      security: bearerSecurity,
      request: { params: IdParams, body: jsonBody(ResetBody) },
      responses: { 200: jsonContent(VersionSchema, 'Versión'), ...errorResponses(400, 401, 403, 404, 409, 422) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const { fields } = c.req.valid('json');
      const version = await withTenant(c, { permission: MANAGE }, async (tx, ctx) => {
        const { versionId, position } = await currentPosition(tx, ctx.tenantId, id);
        const v = await findVersion(tx, ctx.tenantId, versionId);
        requireEditable(v);
        if (!position.agreementVersionId || !position.agreementCategoryId) {
          throw new ApiError(409, 'conflicto', 'El puesto no tiene tabla de convenio');
        }
        const fresh = agreementValuesOf(await loadAgreementDefaults(tx, position.agreementVersionId, position.agreementCategoryId));
        const patch: PositionBody = {};
        for (const f of fields ?? AGREEMENT_FIELDS) {
          if (fresh[f] !== null && fresh[f] !== undefined) (patch as Record<string, unknown>)[f] = fresh[f];
        }
        const cols = await positionColumns(tx, ctx.tenantId, v, patch, position as never);
        await tx`update public.quote_positions set ${tx(cols)} where tenant_id = ${ctx.tenantId} and id = ${id}`;
        await recalculate(tx, ctx.tenantId, versionId);
        return loadVersion(tx, ctx.tenantId, versionId);
      });
      return c.json(version, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'delete',
      path: '/quote-positions/{id}',
      tags,
      summary: 'Quitar un puesto',
      description: 'Solo en una versión editable.',
      security: bearerSecurity,
      request: { params: IdParams },
      responses: { 200: jsonContent(VersionSchema, 'Versión'), ...errorResponses(400, 401, 403, 404, 409) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const version = await withTenant(c, { permission: MANAGE }, async (tx, ctx) => {
        const { versionId } = await currentPosition(tx, ctx.tenantId, id);
        requireEditable(await findVersion(tx, ctx.tenantId, versionId));
        await tx`delete from public.quote_positions where tenant_id = ${ctx.tenantId} and id = ${id}`;
        await recalculate(tx, ctx.tenantId, versionId);
        return loadVersion(tx, ctx.tenantId, versionId);
      });
      return c.json(version, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/quote-agreement-defaults',
      tags,
      summary: 'Tablas del convenio para un puesto',
      description:
        'Versión publicada vigente en `date` del convenio global enlazado al convenio de la ETT, con sus categorías; ' +
        'con `agreementCategoryId`, los valores del puesto (salario, plus, pagas, horas, vacaciones, mínimo por hora y ' +
        'extras). Sin convenio enlazado o sin tablas, todo a null: se rellena a mano.',
      security: bearerSecurity,
      request: { query: AgreementDefaultsQuery },
      responses: { 200: jsonContent(AgreementDefaultsSchema, 'Tablas'), ...errorResponses(400, 401, 403, 404, 422) },
    }),
    async (c) => {
      const q = c.req.valid('query');
      const result = await withTenant(c, {}, async (tx, ctx) => {
        const [today] = await tx<{ d: string }[]>`select to_char(current_date, 'YYYY-MM-DD') as d`;
        const version = await currentAgreementVersion(tx, ctx.tenantId, q.collectiveAgreementId, q.date ?? today!.d);
        if (!version) {
          return { agreementVersionId: null, effectiveFrom: null, effectiveTo: null, provisional: null, categories: [], defaults: null } as z.infer<typeof AgreementDefaultsSchema>;
        }
        let defaults = null;
        if (q.agreementCategoryId) {
          const resolved = await resolveAgreementCategory(tx, ctx.tenantId, q.collectiveAgreementId, q.agreementCategoryId);
          defaults = resolved.defaults;
        }
        return {
          agreementVersionId: version.id,
          effectiveFrom: version.effectiveFrom,
          effectiveTo: version.effectiveTo,
          provisional: version.provisional,
          categories: version.categories,
          defaults,
        } as z.infer<typeof AgreementDefaultsSchema>;
      });
      return c.json(result, 200);
    },
  )
  .openapi(
    versionActionWithBody('request-approval', 'Pedir la aprobación del margen',
      `Cuando algún puesto queda por debajo del margen mínimo de la ETT (409 si no hace falta). Lo ve quien tiene \`${APPROVE}\`.`,
      NotesBody),
    async (c) => {
      const { id } = c.req.valid('param');
      const { notes } = c.req.valid('json');
      const version = await withTenant(c, { permission: MANAGE }, async (tx, ctx) => {
        const v = await findVersion(tx, ctx.tenantId, id);
        requireEditable(v);
        const result = await recalculate(tx, ctx.tenantId, id);
        if (!result?.issues.some((i) => i.issue === 'margin_below_minimum')) {
          throw new ApiError(409, 'conflicto', 'Ningún puesto está por debajo del margen mínimo: no hace falta aprobación');
        }
        await tx`
          update public.quote_versions set approval_status = 'pending', approval_notes = ${notes ?? null}
          where tenant_id = ${ctx.tenantId} and id = ${id}
        `;
        return loadVersion(tx, ctx.tenantId, id);
      });
      return c.json(version, 200);
    },
  )
  .openapi(
    versionActionWithBody('approve', 'Aprobar el margen', `Requiere \`${APPROVE}\`. Queda quién y cuándo.`, NotesBody),
    async (c) => {
      const { id } = c.req.valid('param');
      const { notes } = c.req.valid('json');
      const version = await withTenant(c, { permission: APPROVE }, async (tx, ctx) => {
        requireEditable(await findVersion(tx, ctx.tenantId, id));
        await tx`
          update public.quote_versions
          set approval_status = 'approved', approval_notes = coalesce(${notes ?? null}, approval_notes)
          where tenant_id = ${ctx.tenantId} and id = ${id}
        `;
        return loadVersion(tx, ctx.tenantId, id);
      });
      return c.json(version, 200);
    },
  )
  .openapi(
    versionActionWithBody('reject-approval', 'Pedir cambios (no aprobar el margen)', `Requiere \`${APPROVE}\`.`,
      z.strictObject({ notes: z.string().trim().min(1).max(2000) }).openapi('QuoteApprovalReject')),
    async (c) => {
      const { id } = c.req.valid('param');
      const { notes } = c.req.valid('json');
      const version = await withTenant(c, { permission: APPROVE }, async (tx, ctx) => {
        requireEditable(await findVersion(tx, ctx.tenantId, id));
        await tx`
          update public.quote_versions set approval_status = 'rejected', approval_notes = ${notes}
          where tenant_id = ${ctx.tenantId} and id = ${id}
        `;
        return loadVersion(tx, ctx.tenantId, id);
      });
      return c.json(version, 200);
    },
  )
  .openapi(
    versionAction('send', 'Enviar al cliente',
      'Revisa el presupuesto (422 `validacion` con un detalle por cada punto que falla: cliente, contacto con email, ' +
      'comercial, validez futura, al menos un puesto, todos con tarifa y ninguna por debajo del coste). Con algún ' +
      'margen por debajo del mínimo sin aprobar, 409 `requiere_aprobacion`. Enviada, la versión queda cerrada.'),
    async (c) => {
      const { id } = c.req.valid('param');
      const version = await withTenant(c, { permission: MANAGE }, async (tx, ctx) => {
        const v = await findVersion(tx, ctx.tenantId, id);
        requireEditable(v);
        await recalculate(tx, ctx.tenantId, id);
        const issues = await sendChecklist(tx, ctx.tenantId, id);
        if (issues.length) throw new ApiError(422, 'validacion', 'El presupuesto no está listo para enviar', issues);
        await tx`update public.quote_versions set status = 'sent' where tenant_id = ${ctx.tenantId} and id = ${id}`;
        return loadVersion(tx, ctx.tenantId, id);
      });
      return c.json(version, 200);
    },
  )
  .openapi(
    versionAction('pending-signature', 'Pendiente de firma', 'De enviado a pendiente de firma.'),
    async (c) => {
      const { id } = c.req.valid('param');
      const version = await withTenant(c, { permission: MANAGE }, async (tx, ctx) => {
        await findVersion(tx, ctx.tenantId, id);
        await tx`update public.quote_versions set status = 'pending_signature' where tenant_id = ${ctx.tenantId} and id = ${id}`;
        return loadVersion(tx, ctx.tenantId, id);
      });
      return c.json(version, 200);
    },
  )
  .openapi(
    versionAction('accept', 'Aceptado por el cliente', 'De enviado o pendiente de firma a aceptado.'),
    async (c) => {
      const { id } = c.req.valid('param');
      const version = await withTenant(c, { permission: MANAGE }, async (tx, ctx) => {
        await findVersion(tx, ctx.tenantId, id);
        await tx`update public.quote_versions set status = 'accepted' where tenant_id = ${ctx.tenantId} and id = ${id}`;
        return loadVersion(tx, ctx.tenantId, id);
      });
      return c.json(version, 200);
    },
  )
  .openapi(
    versionActionWithBody('reject', 'Rechazado por el cliente', 'De enviado o pendiente de firma a rechazado, con motivo y notas.', RejectBody),
    async (c) => {
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      const version = await withTenant(c, { permission: MANAGE }, async (tx, ctx) => {
        await findVersion(tx, ctx.tenantId, id);
        await tx`
          update public.quote_versions
          set status = 'rejected', rejection_reason_id = ${body.reasonId}, rejection_notes = ${body.notes ?? null}
          where tenant_id = ${ctx.tenantId} and id = ${id}
        `;
        return loadVersion(tx, ctx.tenantId, id);
      });
      return c.json(version, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/quote-versions/{id}/new-version',
      tags,
      summary: 'Crear una versión nueva',
      description:
        'Copia completa de la versión actual como versión siguiente, en borrador; la anterior queda sustituida. Sirve ' +
        'tanto después de enviar (para negociar) como antes («nueva versión manual», p. ej. una alternativa). No desde ' +
        'un presupuesto aceptado u obsoleto (para eso, pasar a obsoleto y crear otro).',
      security: bearerSecurity,
      request: { params: VersionIdParams },
      responses: { 201: jsonContent(VersionSchema, 'Versión nueva'), ...errorResponses(400, 401, 403, 404, 409) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const version = await withTenant(c, { permission: MANAGE }, async (tx, ctx) => {
        const v = await findVersion(tx, ctx.tenantId, id);
        if (v.versionNumber !== v.latest) throw new ApiError(409, 'conflicto', 'Solo se copia la versión actual');
        if (v.obsolete || ['accepted', 'obsolete', 'superseded'].includes(v.status)) {
          throw new ApiError(409, 'conflicto', 'De un presupuesto aceptado u obsoleto no se crean versiones: pásalo a obsoleto y crea otro');
        }
        const newId = await copyVersion(tx, ctx.tenantId, id, v.quoteId, v.versionNumber + 1);
        await tx`update public.quote_versions set status = 'superseded' where tenant_id = ${ctx.tenantId} and id = ${id}`;
        return loadVersion(tx, ctx.tenantId, newId);
      });
      return c.json(version, 201);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/quote-versions/{id}/proposal-pdf',
      tags,
      summary: 'Generar el PDF de la propuesta',
      description:
        'Genera en el servidor la propuesta que recibe el cliente (puestos con salario y tarifa, conceptos extra marcados ' +
        'para imprimir, condiciones y firmas; nada interno: ni costes ni margen) y la guarda como documento del ' +
        'presupuesto (tipo «Propuesta de presupuesto»). Se descarga con GET /v1/documents/{id}/download.',
      security: bearerSecurity,
      request: { params: VersionIdParams },
      responses: {
        201: jsonContent(z.object({ documentId: z.guid(), name: z.string() }).openapi('QuoteProposalPdf'), 'Documento generado'),
        ...errorResponses(400, 401, 403, 404, 409, 503),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const storage = storageOf(c);
      const result = await withTenant(c, { permission: MANAGE }, async (tx, ctx) => {
        const version = await loadVersion(tx, ctx.tenantId, id);
        if (version.positions.length === 0) throw new ApiError(409, 'conflicto', 'El presupuesto aún no tiene puestos');
        const [info] = await tx<{
          code: string; companyName: string; companyTaxId: string | null; tradeName: string | null; authorization: string | null;
          clientName: string | null; clientTaxId: string | null; typeId: string | null;
        }[]>`
          select q.code, co.name as company_name, co.tax_id as company_tax_id, lp.trade_name,
                 lp.ett_authorization_number as authorization, cl.legal_name as client_name, cl.tax_id as client_tax_id,
                 (select ci.id from public.catalog_items ci where ci.tenant_id = q.tenant_id and ci.catalog = 'document_type'
                    and ci.code = 'quote_proposal' and ci.deleted_at is null limit 1) as type_id
          from public.quotes q
          join public.companies co on co.tenant_id = q.tenant_id and co.id = q.company_id
          left join public.company_legal_profiles lp on lp.tenant_id = q.tenant_id and lp.company_id = q.company_id
          left join public.clients cl on cl.tenant_id = q.tenant_id and cl.id = q.client_id
          where q.tenant_id = ${ctx.tenantId} and q.id = ${version.quoteId}
        `;
        if (!info?.typeId) throw new ApiError(409, 'conflicto', 'Falta el tipo de documento «Propuesta de presupuesto» en las tablas maestras');
        const pdf = await renderProposalPdf({ ...info, version });
        const name = `Propuesta ${info.code} v${version.versionNumber}.pdf`;
        const storagePath = `${ctx.tenantId}/quote/${version.quoteId}/${randomUUID()}.pdf`;
        await storage.upload(storagePath, pdf, 'application/pdf');
        const [doc] = await tx<{ id: string }[]>`
          insert into public.documents ${tx({
            tenantId: ctx.tenantId, entityType: 'quote', entityId: version.quoteId, typeId: info.typeId, name, storagePath,
            mimeType: 'application/pdf', sizeBytes: pdf.byteLength, status: 'draft',
            notes: `Generado desde la versión ${version.versionNumber}`,
          })} returning id
        `;
        return { documentId: doc!.id, name };
      });
      return c.json(result, 201);
    },
  );

// ---------------------------------------------------------------------------
// Auxiliares de alta
// ---------------------------------------------------------------------------
async function quoteScope(tx: Tx, tenantId: string, clientId: string | null, branchId: string | undefined) {
  if (clientId) {
    const [client] = await tx<{ companyId: string; branchId: string; sectorCode: string | null; contactId: string | null }[]>`
      select c.company_id, c.branch_id, c.sector_code,
             (select cc.id from public.client_contacts cc
              where cc.tenant_id = c.tenant_id and cc.client_id = c.id and cc.deleted_at is null
              order by cc.is_quote_recipient desc, cc.is_main desc, cc.created_at limit 1) as contact_id
      from public.clients c where c.tenant_id = ${tenantId} and c.id = ${clientId} and c.deleted_at is null
    `;
    if (!client) throw new ApiError(422, 'referencia_invalida', 'El cliente no existe');
    let branch = client.branchId;
    if (branchId && branchId !== client.branchId) {
      const [b] = await tx`select 1 from public.branches where tenant_id = ${tenantId} and id = ${branchId} and company_id = ${client.companyId}`;
      if (!b) throw new ApiError(422, 'referencia_invalida', 'La sucursal tiene que ser de la sociedad del cliente');
      branch = branchId;
    }
    return { companyId: client.companyId, branchId: branch, sectorCode: client.sectorCode, contactId: client.contactId };
  }
  if (!branchId) throw new ApiError(422, 'validacion', 'Sin cliente hay que indicar la sucursal (branchId)');
  const [b] = await tx<{ companyId: string }[]>`
    select company_id from public.branches where tenant_id = ${tenantId} and id = ${branchId}
  `;
  if (!b) throw new ApiError(422, 'referencia_invalida', 'La sucursal no existe');
  return { companyId: b.companyId, branchId, sectorCode: null, contactId: null };
}

async function sourceQuote(tx: Tx, tenantId: string, quoteId: string) {
  const [row] = await tx<{ companyId: string; branchId: string; clientId: string | null; obsolete: boolean; versionId: string }[]>`
    select q.company_id, q.branch_id, q.client_id, q.obsolete_at is not null as obsolete,
           (select v.id from public.quote_versions v where v.tenant_id = q.tenant_id and v.quote_id = q.id
            order by v.version_number desc limit 1) as version_id
    from public.quotes q where q.tenant_id = ${tenantId} and q.id = ${quoteId}
  `;
  if (!row) throw notFound('El presupuesto no existe');
  return row;
}

