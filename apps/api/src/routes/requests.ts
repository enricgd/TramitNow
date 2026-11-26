// Peticiones (fase 5; db/migrations/20261117000300_requests.sql). Una petición es un puesto de una versión aceptada de
// un presupuesto: la base de datos copia del puesto las condiciones y el cálculo (no se recalcula), y aquí se añaden
// plazas, fechas, horario, centro, responsable, sucursal, supuesto de utilización y el CPD previo (PDF en el servidor;
// enviado y revisado se marcan a mano, sin firma electrónica).
//
// Permisos: leer, requests.manage o module.comercial / module.seleccion / module.laboral en la sucursal; escribir,
// requests.manage. El precio se ve siempre; los costes y el margen de la copia del cálculo, solo con quotes.view_costs.

import { createRoute, z } from '@hono/zod-openapi';
import type { Context } from 'hono';
import { randomUUID } from 'node:crypto';
import { type AppEnv, type TenantContext, withTenant } from '../lib/context.js';
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
  listOf,
  nullableText,
  paginated,
} from '../lib/openapi.js';
import { art8Issues } from '../lib/hiring.js';
import { Art8Schema, DeclarationChannel, DeclarationKind, loadArt8, loadRisksDocuments } from '../lib/hiring-data.js';
import { renderPreCpdPdf } from '../lib/request-pdf.js';
import {
  type PreCpdCheck,
  type ScheduleDay,
  type ScheduleDayWithHours,
  USE_CASES,
  USE_CASE_CODES,
  normalizeSchedule,
  preCpdChecks,
  scheduleIssues,
} from '../lib/requests.js';
import { requireStorage } from '../lib/storage.js';
import { type PositionCalc, PositionCalcSchema, hideCalculationCosts } from './quotes.js';

const MANAGE = 'requests.manage';
const CPD = 'hiring_files.cpd';
const VIEW_COSTS = 'quotes.view_costs';
const tags = ['Peticiones'];
const ACTIVE = ['new', 'publishing', 'selecting', 'covered', 'in_progress'] as const;

// ---------------------------------------------------------------------------
// Esquemas
// ---------------------------------------------------------------------------
const RequestStatus = z
  .enum(['new', 'publishing', 'selecting', 'covered', 'in_progress', 'closed', 'cancelled'])
  .openapi({ description: 'Nueva, En difusión, En selección, Cubierta, En curso, Cerrada, Cancelada' });
const PreCpdStatus = z.enum(['pending', 'generated', 'sent', 'reviewed'])
  .openapi({ description: 'Sin generar, generado, enviado (a mano) o revisado por el cliente' });
const UseCase = z.enum(USE_CASE_CODES).openapi({ description: 'Supuesto de utilización [verificar]: GET /v1/request-use-cases' });
const date = z.iso.date();
const hhmm = z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, 'Hora en formato HH:MM');

const ScheduleDaySchema = z
  .object({
    weekday: z.number().int().min(1).max(7).openapi({ description: '1 = lunes … 7 = domingo' }),
    working: z.boolean(),
    start: hhmm.nullable().default(null),
    end: hhmm.nullable().default(null).openapi({ description: 'Si es anterior a la entrada, el turno pasa la medianoche' }),
    breakMinutes: z.number().int().min(0).max(600).default(0),
  })
  .openapi('RequestScheduleDay');
const ScheduleDayOut = ScheduleDaySchema.extend({ hours: z.number() }).openapi('RequestScheduleDayHours');
const Schedule = z
  .array(ScheduleDaySchema)
  .max(7)
  .superRefine((days, ctx) => {
    for (const message of scheduleIssues(days as ScheduleDay[])) ctx.addIssue({ code: 'custom', message });
  });

const serviceFields = {
  positionsCount: z.number().int().min(1).max(1000).openapi({ description: 'Plazas' }),
  startDate: date.nullable(),
  endDate: date.nullable(),
  shiftName: nullableText(120).openapi({ description: '«Turno de mañana»…' }),
  workdayType: z.enum(['full', 'part']).openapi({ description: 'Jornada completa o parcial' }),
  schedule: Schedule,
  clientCenterId: z.guid().nullable(),
  clientSignerContactId: z.guid().nullable().openapi({ description: 'Contacto del cliente que firma los CPD' }),
  responsibleUserId: z.guid().nullable(),
  branchId: z.guid(),
  orderReference: nullableText(120),
  notes: nullableText(5000),
  tasks: nullableText(5000),
  qualification: nullableText(5000),
  risks: nullableText(5000).openapi({ description: 'Riesgos del puesto (RD 216/1999, art. 2)' }),
  ppe: nullableText(2000).openapi({ description: 'EPIs' }),
  hazardousWork: z.boolean().openapi({
    description: 'Trabajo especialmente peligroso (art. 8 Ley 14/1994, RD 216/1999). Solo se guarda: el control está pendiente de decidir',
  }),
  requiredLicenses: nullableText(2000),
  useCase: UseCase.nullable(),
  useCaseJustification: nullableText(5000),
};
type ServiceBody = Partial<{ [K in keyof typeof serviceFields]: z.infer<(typeof serviceFields)[K]> }>;

const datesOk = (b: { startDate?: string | null; endDate?: string | null }) =>
  !b.startDate || !b.endDate || b.endDate >= b.startDate;

const RequestCreateSchema = z
  .strictObject({ quotePositionId: z.guid(), ...serviceFields })
  .partial()
  .required({ quotePositionId: true, positionsCount: true })
  .refine(datesOk, { message: 'La fecha de fin no puede ser anterior a la de inicio', path: ['endDate'] })
  .openapi('RequestCreate');
const BulkCreateSchema = z
  .strictObject({ requests: z.array(RequestCreateSchema).min(1).max(50) })
  .openapi('RequestBulkCreate');
const RequestUpdateSchema = z
  .strictObject({
    ...serviceFields,
    status: RequestStatus,
    cancelReason: nullableText(250).openapi({ description: 'Obligatorio para cancelar' }),
  })
  .partial()
  .refine(datesOk, { message: 'La fecha de fin no puede ser anterior a la de inicio', path: ['endDate'] })
  .openapi('RequestUpdate');
const DuplicateSchema = z
  .strictObject({
    positionsCount: serviceFields.positionsCount,
    startDate: date.nullable().optional(),
    endDate: date.nullable().optional(),
    shiftName: serviceFields.shiftName.optional(),
    workdayType: serviceFields.workdayType.optional(),
    schedule: Schedule.optional(),
  })
  .refine(datesOk, { message: 'La fecha de fin no puede ser anterior a la de inicio', path: ['endDate'] })
  .openapi('RequestDuplicate');
const SentBody = z
  .strictObject({ sentTo: nullableText(250).optional(), notes: nullableText(2000).optional() })
  .openapi('RequestPreCpdSent');

const SlotsSchema = z
  .object({
    open: z.number().int(),
    reserved: z.number().int(),
    covered: z.number().int(),
    started: z.number().int(),
    left: z.number().int(),
    filled: z.number().int().openapi({ description: 'Cubiertas e incorporadas' }),
  })
  .openapi('RequestSlotCounts');

const summaryFields = {
  id: z.guid(),
  code: z.string(),
  status: RequestStatus,
  positionName: z.string(),
  shiftName: z.string().nullable(),
  clientId: z.guid(),
  clientName: z.string(),
  clientCenterName: z.string().nullable().openapi({ description: 'Centro de trabajo del cliente; null si la petición no lo indica' }),
  quoteId: z.guid(),
  quoteCode: z.string(),
  quoteVersionNumber: z.number().int(),
  quotePositionId: z.guid(),
  branchId: z.guid(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  positionsCount: z.number().int(),
  slots: SlotsSchema,
  responsibleUserId: z.guid().nullable(),
  responsibleName: z.string().nullable(),
  daysToStart: z.number().int().nullable(),
  startsSoonUncovered: z.boolean().openapi({ description: 'Activa, empieza en 7 días o menos y le faltan plazas' }),
  cancelReason: z.string().nullable(),
  preCpdStatus: PreCpdStatus,
  createdAt: Timestamp,
};
const RequestSummarySchema = z.object(summaryFields).openapi('RequestSummary');
type RequestSummary = z.infer<typeof RequestSummarySchema>;

const ConditionsSchema = z
  .object({
    positionName: z.string(),
    description: z.string().nullable(),
    collectiveAgreementId: z.guid().nullable(),
    collectiveAgreementName: z.string().nullable(),
    agreementVersionId: z.guid().nullable(),
    agreementPeriod: z.object({ from: z.string(), to: z.string().nullable() }).nullable(),
    agreementCategoryId: z.guid().nullable(),
    agreementCategoryCode: z.string().nullable(),
    categoryName: z.string().nullable(),
    level: z.string().nullable(),
    agreementMinimumSalaryHour: z.number().nullable(),
    salaryHour: z.number().openapi({ description: '(Base + plus × 12) / horas anuales: el que se compara con el convenio' }),
    grossSalaryHour: z.number().nullable().openapi({ description: 'Con vacaciones: el de la propuesta' }),
    rateHour: z.number().nullable(),
    extras: z.array(z.object({
      code: z.string(), name: z.string(), salaryHour: z.number().nullable(), rateHour: z.number().nullable(), print: z.boolean(),
    })),
    calculation: PositionCalcSchema.nullable().openapi({ description: `Costes y margen a null sin \`${VIEW_COSTS}\`` }),
  })
  .openapi('RequestConditions', { description: 'Copia del puesto del presupuesto aceptado: no cambia' });

const CheckSchema = z
  .object({ code: z.string(), ok: z.boolean(), blocking: z.boolean(), message: z.string(), field: z.string() })
  .openapi('RequestPreCpdCheck');

const RequestSchema = z
  .object({
    ...summaryFields,
    companyId: z.guid(),
    clientTaxId: z.string().nullable(),
    clientCenterId: z.guid().nullable(),
    clientSignerContactId: z.guid().nullable(),
    clientSignerContactName: z.string().nullable(),
    clientSignerContactEmail: z.string().nullable(),
    clientSignerContactPhone: z.string().nullable(),
    quoteVersionId: z.guid(),
    quoteTitle: z.string().nullable(),
    quoteAcceptedAt: Timestamp.nullable(),
    hazardousWork: z.boolean(),
    orderReference: z.string().nullable(),
    notes: z.string().nullable(),
    tasks: z.string().nullable(),
    qualification: z.string().nullable(),
    risks: z.string().nullable(),
    ppe: z.string().nullable(),
    requiredLicenses: z.string().nullable(),
    useCase: UseCase.nullable(),
    useCaseJustification: z.string().nullable(),
    workdayType: z.enum(['full', 'part']),
    schedule: z.array(ScheduleDayOut),
    weeklyHours: z.number().nullable(),
    legalChecks: z.null().openapi({ description: 'Obsoleto: los controles del art. 8 están en `art8`' }),
    risksDocument: z.object({ documentId: z.guid(), name: z.string() }).nullable()
      .openapi({ description: 'Evaluación de riesgos del cliente adjunta (tipo request_risk_assessment): vale en lugar del texto y sale como anexo del CPD previo' }),
    art8: Art8Schema,
    cpdSigned: z.object({
      signedAt: z.string(), documentId: z.guid(), documentName: z.string().nullable(), recordedByName: z.string().nullable(), recordedAt: Timestamp,
    }).nullable().openapi({ description: 'CPD firmado por la empresa usuaria (registro a mano). Paso «CPD» de los expedientes' }),
    cancelledAt: Timestamp.nullable(),
    closedAt: Timestamp.nullable(),
    createdByName: z.string().nullable(),
    updatedAt: Timestamp,
    conditions: ConditionsSchema,
    agreementCheck: z
      .object({
        belowAgreement: z.boolean().openapi({ description: 'En algún tramo el convenio pide más que el salario copiado: bloquea el CPD' }),
        categoryUnmatched: z.boolean().openapi({ description: 'En algún tramo la categoría no está (por código): avisa, no bloquea' }),
        periods: z.array(z.object({
          versionId: z.guid(),
          from: z.string(),
          to: z.string().nullable(),
          categoryMatched: z.boolean(),
          minimumSalaryHour: z.number().nullable(),
          belowAgreement: z.boolean(),
        })),
      })
      .nullable()
      .openapi({
        description: 'El salario copiado frente a cada versión publicada del convenio vigente en las fechas de la petición ' +
          '(sin inicio, desde hoy; sin fin, sin límite). null si la petición no tiene convenio enlazado al catálogo global',
      }),
    distribution: z.object({
      quotePeople: z.number().int().nullable(),
      inRequests: z.number().int().openapi({ description: 'Plazas del puesto en peticiones no canceladas' }),
      missing: z.number().int().openapi({ description: 'Personas del presupuesto sin petición (negativo: sobran plazas)' }),
      siblings: z.array(z.object({
        id: z.guid(), code: z.string(), shiftName: z.string().nullable(), startDate: z.string().nullable(),
        endDate: z.string().nullable(), positionsCount: z.number().int(), filled: z.number().int(), status: RequestStatus,
        isThis: z.boolean(),
      })),
      otherPositions: z.array(z.object({
        quotePositionId: z.guid(), name: z.string(), requests: z.array(z.object({ id: z.guid(), code: z.string() })),
      })),
    }),
    slotList: z.array(z.object({
      id: z.guid(), number: z.number().int(), status: z.enum(['open', 'reserved', 'covered', 'started', 'left']),
      applicationId: z.guid().nullable().openapi({ description: 'Candidatura que la ocupa (propuesta o confirmada)' }),
      candidateId: z.guid().nullable(),
      candidateName: z.string().nullable(),
    })),
    preCpd: z.object({
      status: PreCpdStatus,
      outdated: z.boolean().openapi({ description: 'Algo del CPD cambió después de generarlo: hay que generarlo de nuevo' }),
      documentId: z.guid().nullable(),
      generatedAt: Timestamp.nullable(),
      generatedByName: z.string().nullable(),
      sentAt: Timestamp.nullable(),
      sentByName: z.string().nullable(),
      sentTo: z.string().nullable(),
      reviewedAt: Timestamp.nullable(),
      checks: z.array(CheckSchema),
    }),
    signedQuoteDocument: z
      .object({ documentId: z.guid(), name: z.string(), kind: z.enum(['signed', 'proposal']), date: Timestamp })
      .nullable()
      .openapi({ description: 'Presupuesto firmado por el cliente; si no se ha subido, la última propuesta generada' }),
  })
  .openapi('Request');
type RequestOut = z.infer<typeof RequestSchema>;

const ListQuery = PaginationQuery.extend({
  q: z.string().trim().min(1).max(100).optional(),
  status: z.enum([...RequestStatus.options, 'active']).optional(),
  clientId: z.guid().optional(),
  quoteId: z.guid().optional(),
  responsibleUserId: z.guid().optional(),
  branchId: z.guid().optional(),
  startingSoon: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
});
const SourcesQuery = PaginationQuery.extend({ q: z.string().trim().min(1).max(100).optional() });

const SourceSchema = z
  .object({
    quoteId: z.guid(),
    quoteCode: z.string(),
    versionId: z.guid(),
    versionNumber: z.number().int(),
    title: z.string().nullable(),
    clientId: z.guid(),
    clientName: z.string(),
    clientTaxId: z.string().nullable(),
    acceptedAt: Timestamp.nullable(),
    people: z.number().int(),
    peopleInRequests: z.number().int(),
    peopleWithoutRequest: z.number().int(),
    positions: z.array(z.object({
      quotePositionId: z.guid(),
      name: z.string(),
      categoryName: z.string().nullable(),
      people: z.number().int(),
      peopleInRequests: z.number().int(),
      peopleWithoutRequest: z.number().int(),
      rateHour: z.number().nullable(),
      requests: z.array(z.object({
        id: z.guid(), code: z.string(), shiftName: z.string().nullable(), positionsCount: z.number().int(), status: RequestStatus,
      })),
    })),
  })
  .openapi('RequestSource');

const UseCaseSchema = z
  .object({ code: UseCase, name: z.string(), legalReference: z.string(), maxMonths: z.number().nullable(), hint: z.string() })
  .openapi('RequestUseCase');

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------
const seesCosts = (ctx: TenantContext) => ctx.permissions.has(VIEW_COSTS);

const summarySelect = (tx: Tx, tenantId: string) => tx`
  select r.id, r.code, r.status, r.position_name, r.shift_name, r.client_id, c.legal_name as client_name,
         cc.name as client_center_name, r.quote_id,
         q.code as quote_code, v.version_number as quote_version_number, r.quote_position_id, r.branch_id,
         to_char(r.start_date, 'YYYY-MM-DD') as start_date, to_char(r.end_date, 'YYYY-MM-DD') as end_date,
         r.positions_count, s.slots, r.responsible_user_id, rp.full_name as responsible_name,
         (r.start_date - current_date) as days_to_start,
         coalesce(r.status in ('new', 'publishing', 'selecting', 'covered', 'in_progress')
                  and r.start_date - current_date between 0 and 7
                  and (s.slots ->> 'filled')::int < r.positions_count, false) as starts_soon_uncovered,
         r.cancel_reason, r.pre_cpd_status, r.created_at
  from public.requests r
  join public.clients c on c.tenant_id = r.tenant_id and c.id = r.client_id
  join public.quotes q on q.tenant_id = r.tenant_id and q.id = r.quote_id
  join public.quote_versions v on v.tenant_id = r.tenant_id and v.id = r.quote_version_id
  left join public.profiles rp on rp.id = r.responsible_user_id
  left join public.client_centers cc on cc.tenant_id = r.tenant_id and cc.id = r.client_center_id
  cross join lateral (
    select jsonb_build_object(
      'open', count(*) filter (where sl.status = 'open'),
      'reserved', count(*) filter (where sl.status = 'reserved'),
      'covered', count(*) filter (where sl.status = 'covered'),
      'started', count(*) filter (where sl.status = 'started'),
      'left', count(*) filter (where sl.status = 'left'),
      'filled', count(*) filter (where sl.status in ('covered', 'started'))) as slots
    from public.request_slots sl where sl.tenant_id = r.tenant_id and sl.request_id = r.id
  ) s
  where r.tenant_id = ${tenantId}
`;

interface DetailRow extends RequestSummary {
  companyId: string;
  cpdSignedAt: string | null;
  cpdSignedDocumentId: string | null;
  cpdSignedDocumentName: string | null;
  cpdSignedRecordedByName: string | null;
  cpdSignedRecordedAt: string | null;
  clientTaxId: string | null;
  clientCenterId: string | null;
  clientCenterAddress: string | null;
  clientSignerContactId: string | null;
  clientSignerContactName: string | null;
  clientSignerContactPosition: string | null;
  clientSignerContactEmail: string | null;
  clientSignerContactPhone: string | null;
  quoteVersionId: string;
  quoteTitle: string | null;
  quoteAcceptedAt: string | null;
  hazardousWork: boolean;
  orderReference: string | null;
  notes: string | null;
  tasks: string | null;
  qualification: string | null;
  risks: string | null;
  ppe: string | null;
  requiredLicenses: string | null;
  useCase: RequestOut['useCase'];
  useCaseJustification: string | null;
  workdayType: 'full' | 'part';
  schedule: ScheduleDayWithHours[];
  weeklyHours: number | null;
  cancelledAt: string | null;
  closedAt: string | null;
  createdByName: string | null;
  updatedAt: string;
  positionDescription: string | null;
  collectiveAgreementId: string | null;
  collectiveAgreementName: string | null;
  agreementVersionId: string | null;
  agreementCategoryId: string | null;
  agreementCategoryCode: string | null;
  categoryName: string | null;
  level: string | null;
  agreementPeriodFrom: string | null;
  agreementPeriodTo: string | null;
  agreementMinimumSalaryHour: number | null;
  salaryHour: number;
  grossSalaryHour: number | null;
  rateHour: number | null;
  quotePeople: number | null;
  extras: RequestOut['conditions']['extras'];
  calcResult: PositionCalc | null;
  preCpdOutdated: boolean;
  preCpdDocumentId: string | null;
  preCpdGeneratedAt: string | null;
  preCpdGeneratedByName: string | null;
  preCpdSentAt: string | null;
  preCpdSentByName: string | null;
  preCpdSentTo: string | null;
  preCpdReviewedAt: string | null;
  ettName: string;
  ettTaxId: string | null;
  ettTradeName: string | null;
  ettAuthorizationNumber: string | null;
  ettAuthorizationDate: string | null;
  ettAuthorizationScope: string | null;
  ettRepresentativeName: string | null;
  ettRepresentativePosition: string | null;
  ettRepresentativeIdType: string | null;
  ettRepresentativeIdNumber: string | null;
}

/** La petición con todo lo que necesita la ficha y el CPD (sin ocultar costes). */
async function loadDetail(tx: Tx, tenantId: string, id: string) {
  const [row] = await tx<DetailRow[]>`
    with base as (${summarySelect(tx, tenantId)} and r.id = ${id})
    select b.*, r.company_id, c.tax_id as client_tax_id, r.client_center_id,
           nullif(concat_ws(', ', nullif(concat_ws(' ', a.street_type, a.street, a.number, a.door), ''),
                            nullif(concat_ws(' ', a.postal_code, a.city), '')), '') as client_center_address,
           r.client_signer_contact_id, ct.name as client_signer_contact_name, ct.position as client_signer_contact_position,
           ct.email as client_signer_contact_email, coalesce(ct.phone, ct.mobile) as client_signer_contact_phone,
           r.quote_version_id, qv.title as quote_title, qv.accepted_at as quote_accepted_at, r.hazardous_work,
           to_char(r.cpd_signed_at, 'YYYY-MM-DD') as cpd_signed_at, r.cpd_signed_document_id,
           (select d.name from public.documents d where d.tenant_id = r.tenant_id and d.id = r.cpd_signed_document_id) as cpd_signed_document_name,
           (select p.full_name from public.profiles p where p.id = r.cpd_signed_recorded_by) as cpd_signed_recorded_by_name,
           r.cpd_signed_recorded_at,
           r.order_reference, r.notes, r.tasks, r.qualification, r.risks, r.ppe, r.required_licenses, r.use_case,
           r.use_case_justification, r.workday_type, r.schedule, r.weekly_hours::float8 as weekly_hours, r.cancelled_at,
           r.closed_at, cb.full_name as created_by_name, r.updated_at, r.position_description, r.collective_agreement_id,
           r.collective_agreement_name, r.agreement_version_id, r.agreement_category_id, r.agreement_category_code,
           r.category_name, r.level, to_char(r.agreement_period_from, 'YYYY-MM-DD') as agreement_period_from,
           to_char(r.agreement_period_to, 'YYYY-MM-DD') as agreement_period_to,
           r.agreement_minimum_salary_hour::float8 as agreement_minimum_salary_hour, r.salary_hour::float8 as salary_hour,
           r.gross_salary_hour::float8 as gross_salary_hour, r.rate_hour::float8 as rate_hour, r.quote_people, r.extras,
           r.calc_result, r.pre_cpd_outdated, r.pre_cpd_document_id, r.pre_cpd_generated_at,
           gb.full_name as pre_cpd_generated_by_name, r.pre_cpd_sent_at, sb.full_name as pre_cpd_sent_by_name,
           r.pre_cpd_sent_to, r.pre_cpd_reviewed_at,
           co.name as ett_name, co.tax_id as ett_tax_id, lp.trade_name as ett_trade_name,
           lp.ett_authorization_number, to_char(lp.ett_authorization_date, 'YYYY-MM-DD') as ett_authorization_date,
           lp.ett_authorization_scope, lp.legal_rep_name as ett_representative_name,
           lp.legal_rep_position as ett_representative_position, lp.legal_rep_id_type as ett_representative_id_type,
           lp.legal_rep_id_number as ett_representative_id_number
    from base b
    join public.requests r on r.tenant_id = ${tenantId} and r.id = b.id
    join public.clients c on c.tenant_id = r.tenant_id and c.id = r.client_id
    join public.companies co on co.tenant_id = r.tenant_id and co.id = r.company_id
    left join public.company_legal_profiles lp on lp.tenant_id = r.tenant_id and lp.company_id = r.company_id
    left join public.client_centers cc on cc.tenant_id = r.tenant_id and cc.id = r.client_center_id
    left join public.addresses a on a.tenant_id = cc.tenant_id and a.id = cc.address_id
    left join public.client_contacts ct on ct.tenant_id = r.tenant_id and ct.id = r.client_signer_contact_id
    join public.quote_versions qv on qv.tenant_id = r.tenant_id and qv.id = r.quote_version_id
    left join public.profiles cb on cb.id = r.created_by
    left join public.profiles gb on gb.id = r.pre_cpd_generated_by
    left join public.profiles sb on sb.id = r.pre_cpd_sent_by
  `;
  if (!row) throw notFound('La petición no existe');

  const periods = await tx<{ versionId: string; from: string; to: string | null; categoryMatched: boolean; minimumSalaryHour: number | null }[]>`
    select version_id, to_char(effective_from, 'YYYY-MM-DD') as from, to_char(effective_to, 'YYYY-MM-DD') as to,
           category_matched, minimum_salary_hour::float8 as minimum_salary_hour
    from private.request_agreement_periods(${tenantId}, ${id})
  `;
  const [linked] = await tx<{ linked: boolean }[]>`
    select ca.global_agreement_id is not null as linked from public.collective_agreements ca
    where ca.tenant_id = ${tenantId} and ca.id = ${row.collectiveAgreementId}
  `;
  const agreementCheck = linked?.linked
    ? (() => {
        const list = periods.map((p) => ({
          ...p,
          belowAgreement: p.minimumSalaryHour !== null && row.salaryHour < p.minimumSalaryHour - 0.005,
        }));
        return {
          belowAgreement: list.some((p) => p.belowAgreement),
          categoryUnmatched: row.agreementCategoryCode === null || list.some((p) => !p.categoryMatched),
          periods: list,
        };
      })()
    : null;

  // Reparto del puesto: peticiones del mismo puesto y de los otros puestos del presupuesto (no canceladas).
  const siblings = await tx<(RequestOut['distribution']['siblings'][number])[]>`
    select r.id, r.code, r.shift_name, to_char(r.start_date, 'YYYY-MM-DD') as start_date,
           to_char(r.end_date, 'YYYY-MM-DD') as end_date, r.positions_count, r.status, r.id = ${id} as is_this,
           (select count(*)::int from public.request_slots s
            where s.tenant_id = r.tenant_id and s.request_id = r.id and s.status in ('covered', 'started')) as filled
    from public.requests r
    where r.tenant_id = ${tenantId} and r.quote_position_id = ${row.quotePositionId} and r.status <> 'cancelled'
    order by r.start_date nulls last, r.code
  `;
  const otherPositions = await tx<RequestOut['distribution']['otherPositions']>`
    select p.id as quote_position_id, p.name,
           coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'code', r.code) order by r.code)
                     from public.requests r
                     where r.tenant_id = p.tenant_id and r.quote_position_id = p.id and r.status <> 'cancelled'), '[]'::jsonb) as requests
    from public.quote_positions p
    where p.tenant_id = ${tenantId} and p.version_id = (select quote_version_id from public.requests where tenant_id = ${tenantId} and id = ${id})
      and p.id <> ${row.quotePositionId}
    order by p.sort_order, p.created_at
  `;
  const inRequests = siblings.reduce((s, r) => s + r.positionsCount, 0);

  const slotList = await tx<RequestOut['slotList']>`
    select s.id, s.slot_number as number, s.status, s.application_id, a.candidate_id,
           trim(c.first_name || ' ' || coalesce(c.last_name, '')) as candidate_name
    from public.request_slots s
    left join public.applications a on a.tenant_id = s.tenant_id and a.id = s.application_id
    left join public.candidates c on c.tenant_id = a.tenant_id and c.id = a.candidate_id
    where s.tenant_id = ${tenantId} and s.request_id = ${id} order by s.slot_number
  `;

  const [signed] = await tx<{ documentId: string; name: string; kind: 'signed' | 'proposal'; date: string }[]>`
    select d.id as document_id, d.name, case t.code when 'quote_signed' then 'signed' else 'proposal' end as kind,
           d.uploaded_at as date
    from public.documents d join public.catalog_items t on t.tenant_id = d.tenant_id and t.id = d.type_id
    where d.tenant_id = ${tenantId} and d.entity_type = 'quote' and d.entity_id = ${row.quoteId}
      and t.code in ('quote_signed', 'quote_proposal')
    order by t.code = 'quote_signed' desc, d.uploaded_at desc limit 1
  `;

  const risksDocument = (await loadRisksDocuments(tx, tenantId, [id])).get(id) ?? null;
  const art8 = (await loadArt8(tx, tenantId, [id])).get(id)!;
  const checks = preCpdChecks({
    useCase: row.useCase,
    useCaseJustification: row.useCaseJustification,
    clientCenterId: row.clientCenterId,
    startDate: row.startDate,
    endDate: row.endDate,
    weeklyHours: row.weeklyHours,
    tasks: row.tasks,
    risks: row.risks,
    risksDocument: risksDocument !== null,
    ettAuthorizationNumber: row.ettAuthorizationNumber,
    ettRepresentativeName: row.ettRepresentativeName,
    ettRepresentativeIdNumber: row.ettRepresentativeIdNumber,
    belowAgreement: agreementCheck?.belowAgreement ?? false,
    agreementCategoryUnmatched: agreementCheck ? agreementCheck.categoryUnmatched : row.agreementCategoryCode === null,
    clientSignerContactId: row.clientSignerContactId,
    positionsCount: row.positionsCount,
    quotePeople: row.quotePeople,
    peopleInRequests: inRequests,
  });
  // Art. 8 en el CPD previo: las prohibiciones bloquean; que falte una declaración solo avisa (va en el CPD para firmarla).
  for (const i of art8Issues(art8.input, false)) {
    checks.push({ code: `art8_${i.code}`, ok: false, blocking: i.severity === 'blocked', message: i.message, field: 'art8' });
  }

  return { row, agreementCheck, siblings, otherPositions, inRequests, slotList, signed: signed ?? null, checks, risksDocument, art8 };
}
type Detail = Awaited<ReturnType<typeof loadDetail>>;

function present(d: Detail, ctx: TenantContext): RequestOut {
  const r = d.row;
  const summary = Object.fromEntries(Object.keys(summaryFields).map((k) => [k, r[k as keyof DetailRow]])) as RequestSummary;
  return {
    ...summary,
    companyId: r.companyId,
    clientTaxId: r.clientTaxId,
    clientCenterId: r.clientCenterId,
    clientSignerContactId: r.clientSignerContactId,
    clientSignerContactName: r.clientSignerContactName,
    clientSignerContactEmail: r.clientSignerContactEmail,
    clientSignerContactPhone: r.clientSignerContactPhone,
    quoteVersionId: r.quoteVersionId,
    quoteTitle: r.quoteTitle,
    quoteAcceptedAt: r.quoteAcceptedAt,
    hazardousWork: r.hazardousWork,
    orderReference: r.orderReference,
    notes: r.notes,
    tasks: r.tasks,
    qualification: r.qualification,
    risks: r.risks,
    ppe: r.ppe,
    requiredLicenses: r.requiredLicenses,
    useCase: r.useCase,
    useCaseJustification: r.useCaseJustification,
    workdayType: r.workdayType,
    schedule: r.schedule,
    weeklyHours: r.weeklyHours,
    legalChecks: null,
    risksDocument: d.risksDocument,
    art8: {
      clientIsEtt: d.art8.clientIsEtt,
      hazardousWork: d.art8.hazardousWork,
      hazardousException: d.art8.hazardousException,
      declarations: { strike: d.art8.strike, downsizedPositions: d.art8.downsizedPositions },
      history: d.art8.history,
      issues: art8Issues(d.art8.input, true),
    },
    cpdSigned: r.cpdSignedAt
      ? { signedAt: r.cpdSignedAt, documentId: r.cpdSignedDocumentId!, documentName: r.cpdSignedDocumentName,
          recordedByName: r.cpdSignedRecordedByName, recordedAt: r.cpdSignedRecordedAt! }
      : null,
    cancelledAt: r.cancelledAt,
    closedAt: r.closedAt,
    createdByName: r.createdByName,
    updatedAt: r.updatedAt,
    conditions: {
      positionName: r.positionName,
      description: r.positionDescription,
      collectiveAgreementId: r.collectiveAgreementId,
      collectiveAgreementName: r.collectiveAgreementName,
      agreementVersionId: r.agreementVersionId,
      agreementPeriod: r.agreementPeriodFrom ? { from: r.agreementPeriodFrom, to: r.agreementPeriodTo } : null,
      agreementCategoryId: r.agreementCategoryId,
      agreementCategoryCode: r.agreementCategoryCode,
      categoryName: r.categoryName,
      level: r.level,
      agreementMinimumSalaryHour: r.agreementMinimumSalaryHour,
      salaryHour: r.salaryHour,
      grossSalaryHour: r.grossSalaryHour,
      rateHour: r.rateHour,
      extras: r.extras,
      calculation: seesCosts(ctx) ? r.calcResult : hideCalculationCosts(r.calcResult),
    },
    agreementCheck: d.agreementCheck,
    distribution: {
      quotePeople: r.quotePeople,
      inRequests: d.inRequests,
      missing: (r.quotePeople ?? 0) - d.inRequests,
      siblings: d.siblings,
      otherPositions: d.otherPositions,
    },
    slotList: d.slotList,
    preCpd: {
      status: r.preCpdStatus,
      outdated: r.preCpdOutdated,
      documentId: r.preCpdDocumentId,
      generatedAt: r.preCpdGeneratedAt,
      generatedByName: r.preCpdGeneratedByName,
      sentAt: r.preCpdSentAt,
      sentByName: r.preCpdSentByName,
      sentTo: r.preCpdSentTo,
      reviewedAt: r.preCpdReviewedAt,
      checks: d.checks,
    },
    signedQuoteDocument: d.signed,
  };
}

const loadRequest = async (tx: Tx, ctx: TenantContext, id: string) => present(await loadDetail(tx, ctx.tenantId, id), ctx);

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------
/** Columnas de servicio desde el cuerpo (solo lo enviado). El horario se guarda con sus horas. */
function serviceColumns(tx: Tx, body: ServiceBody & { status?: string; cancelReason?: string | null }) {
  const out: Record<string, unknown> = {};
  const simple = ['positionsCount', 'startDate', 'endDate', 'shiftName', 'workdayType', 'clientCenterId', 'clientSignerContactId',
    'responsibleUserId', 'branchId', 'orderReference', 'notes', 'tasks', 'qualification', 'risks', 'ppe', 'requiredLicenses',
    'hazardousWork', 'useCase', 'useCaseJustification', 'status', 'cancelReason'] as const;
  for (const key of simple) if (body[key] !== undefined) out[key] = body[key];
  if (body.schedule !== undefined) {
    const { days, weeklyHours } = normalizeSchedule(body.schedule as ScheduleDay[]);
    out.schedule = tx.json((body.schedule.length ? days : []) as never);
    out.weeklyHours = body.schedule.length ? weeklyHours : null;
  }
  return out as Record<string, never>;
}

/** El centro y el contacto son del cliente, el responsable es de la ETT y la sucursal, de la sociedad. */
async function checkRefs(tx: Tx, tenantId: string, clientId: string, companyId: string, body: ServiceBody) {
  if (body.clientCenterId) {
    const [ok] = await tx`select 1 from public.client_centers where tenant_id = ${tenantId} and id = ${body.clientCenterId}
                          and client_id = ${clientId} and deleted_at is null`;
    if (!ok) throw new ApiError(422, 'referencia_invalida', 'El centro de trabajo tiene que ser del cliente de la petición');
  }
  if (body.clientSignerContactId) {
    const [ok] = await tx`select 1 from public.client_contacts where tenant_id = ${tenantId} and id = ${body.clientSignerContactId}
                          and client_id = ${clientId} and deleted_at is null`;
    if (!ok) throw new ApiError(422, 'referencia_invalida', 'El contacto que firma tiene que ser del cliente de la petición');
  }
  if (body.responsibleUserId) {
    const [ok] = await tx`select 1 from public.memberships where tenant_id = ${tenantId} and user_id = ${body.responsibleUserId}
                          and deleted_at is null`;
    if (!ok) throw new ApiError(422, 'referencia_invalida', 'El responsable tiene que ser un usuario de la ETT');
  }
  if (body.branchId) {
    const [ok] = await tx`select 1 from public.branches where tenant_id = ${tenantId} and id = ${body.branchId} and company_id = ${companyId}`;
    if (!ok) throw new ApiError(422, 'referencia_invalida', 'La sucursal tiene que ser de la sociedad del presupuesto');
  }
}

async function nextRequestCode(tx: Tx, tenantId: string, companyId: string): Promise<string> {
  const [row] = await tx<{ formatted: string }[]>`
    select formatted from private.next_number(${tenantId}, 'request', extract(year from current_date)::int, ${companyId})
  `;
  return row!.formatted;
}

type CreateBody = z.infer<typeof RequestCreateSchema>;

/** Crea una petición de un puesto de un presupuesto aceptado (la base de datos copia las condiciones). */
async function createRequest(tx: Tx, ctx: TenantContext, body: CreateBody, versionId?: string): Promise<string> {
  const [src] = await tx<{ companyId: string; branchId: string; clientId: string | null; versionId: string; description: string | null; signerId: string | null }[]>`
    select q.company_id, q.branch_id, q.client_id, p.version_id, p.description,
           (select cc.id from public.client_contacts cc
            where cc.tenant_id = q.tenant_id and cc.client_id = q.client_id and cc.signs_cpds and cc.deleted_at is null
            order by cc.is_main desc, cc.created_at limit 1) as signer_id
    from public.quote_positions p join public.quotes q on q.tenant_id = p.tenant_id and q.id = p.quote_id
    where p.tenant_id = ${ctx.tenantId} and p.id = ${body.quotePositionId}
  `;
  if (!src) throw new ApiError(422, 'referencia_invalida', 'El puesto del presupuesto no existe');
  if (versionId && src.versionId !== versionId) {
    throw new ApiError(422, 'referencia_invalida', 'El puesto no es de esta versión del presupuesto');
  }
  if (!src.clientId) throw new ApiError(422, 'validacion', 'El presupuesto no tiene cliente');
  await checkRefs(tx, ctx.tenantId, src.clientId, src.companyId, body);
  const values = {
    tenantId: ctx.tenantId,
    quotePositionId: body.quotePositionId,
    code: await nextRequestCode(tx, ctx.tenantId, src.companyId),
    branchId: src.branchId,
    responsibleUserId: ctx.userId,
    tasks: src.description,
    clientSignerContactId: src.signerId,
    ...serviceColumns(tx, body),
  };
  const [created] = await tx<{ id: string }[]>`insert into public.requests ${tx(values as never)} returning id`;
  return created!.id;
}

async function findRequest(tx: Tx, tenantId: string, id: string) {
  const [row] = await tx<{ id: string; clientId: string; companyId: string; status: string; preCpdStatus: string; preCpdOutdated: boolean; preCpdDocumentId: string | null }[]>`
    select id, client_id, company_id, status, pre_cpd_status, pre_cpd_outdated, pre_cpd_document_id
    from public.requests where tenant_id = ${tenantId} and id = ${id}
  `;
  if (!row) throw notFound('La petición no existe');
  return row;
}

function requireOpen(status: string) {
  if (status === 'closed' || status === 'cancelled') {
    throw new ApiError(409, 'conflicto', `La petición está ${status === 'closed' ? 'cerrada' : 'cancelada'}: para cambiarla, reábrela`);
  }
}

const storageOf = (c: Context<AppEnv>) => requireStorage(c.get('storage'));
const DeclarationBody = z
  .strictObject({
    kind: DeclarationKind,
    affirmative: z.boolean(),
    contactId: z.guid().nullable().optional().openapi({ description: 'Contacto del cliente que declara' }),
    channel: DeclarationChannel.openapi({ description: 'Cómo la hizo: correo, papel, teléfono, en persona, en la app u otro' }),
    declaredAt: date,
    documentId: z.guid().nullable().optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
  })
  .openapi('RequestDeclarationCreate');
const CpdSignedBody = z
  .union([
    z.strictObject({ documentId: z.guid(), signedAt: date }),
    z.strictObject({ documentId: z.null(), signedAt: z.null().optional() }),
  ])
  .openapi('RequestCpdSigned');
const HazardousExceptionBody = z
  .strictObject({ basis: z.string().trim().min(10).max(2000).nullable() })
  .openapi('RequestHazardousException');

const RequestOk = { 200: jsonContent(RequestSchema, 'Petición'), ...errorResponses(400, 401, 403, 404, 409, 422) };
const RequestCreated = { 201: jsonContent(RequestSchema, 'Petición creada'), ...errorResponses(400, 401, 403, 404, 409, 422) };

// ---------------------------------------------------------------------------
// Rutas
// ---------------------------------------------------------------------------
export const requests = createRouter()
  .openapi(
    createRoute({
      method: 'get',
      path: '/request-use-cases',
      tags,
      summary: 'Supuestos de utilización del CPD',
      description: 'Lista fija [verificar con quien lleve lo laboral]: art. 6.2 de la Ley 14/1994, art. 15 ET y contrato formativo. `maxMonths` es orientativo.',
      security: bearerSecurity,
      responses: { 200: jsonContent(listOf(UseCaseSchema), 'Supuestos'), ...errorResponses(401, 403) },
    }),
    async (c) => {
      await withTenant(c, {}, async () => null);
      return c.json({ data: USE_CASES.map((u) => ({ ...u })) }, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/request-sources',
      tags,
      summary: 'Presupuestos aceptados para crear peticiones',
      description:
        'Buscador de «Nueva petición»: presupuestos con la versión actual aceptada y no obsoletos, por código, cliente, NIF o ' +
        'título. Primero los que tienen personas sin petición; después, los aceptados más recientes. Con cada puesto, sus ' +
        'personas, las que ya están en peticiones (no canceladas) y esas peticiones.',
      security: bearerSecurity,
      request: { query: SourcesQuery },
      responses: { 200: jsonContent(paginated(SourceSchema), 'Presupuestos aceptados'), ...errorResponses(400, 401, 403) },
    }),
    async (c) => {
      const q = c.req.valid('query');
      const page = await withTenant(c, { permission: MANAGE }, async (tx, ctx) => {
        const search = q.q
          ? tx`and (q.code ilike ${likePattern(q.q)} or c.legal_name ilike ${likePattern(q.q)} or c.tax_id ilike ${likePattern(q.q.replace(/[\s-]/g, '').toUpperCase())}
                    or v.title ilike ${likePattern(q.q)})`
          : tx`and true`;
        const base = tx`
          select q.id as quote_id, q.code as quote_code, v.id as version_id, v.version_number, v.title, q.client_id,
                 c.legal_name as client_name, c.tax_id as client_tax_id, v.accepted_at, pos.positions,
                 coalesce((select sum((x ->> 'people')::int) from jsonb_array_elements(pos.positions) x), 0)::int as people,
                 coalesce((select sum((x ->> 'peopleInRequests')::int) from jsonb_array_elements(pos.positions) x), 0)::int as people_in_requests,
                 coalesce((select sum((x ->> 'peopleWithoutRequest')::int) from jsonb_array_elements(pos.positions) x), 0)::int as people_without_request
          from public.quotes q
          join lateral (
            select * from public.quote_versions lv where lv.tenant_id = q.tenant_id and lv.quote_id = q.id
            order by lv.version_number desc limit 1
          ) v on v.status = 'accepted'
          join public.clients c on c.tenant_id = q.tenant_id and c.id = q.client_id
          cross join lateral (
            select coalesce(jsonb_agg(jsonb_build_object(
                     'quotePositionId', p.id, 'name', p.name, 'categoryName', coalesce(ac.name, p.custom_category_name),
                     'people', p.people, 'peopleInRequests', rq.total,
                     'peopleWithoutRequest', greatest(p.people - rq.total, 0), 'rateHour', p.calc_rate_hour,
                     'requests', rq.list) order by p.sort_order, p.created_at), '[]'::jsonb) as positions
            from public.quote_positions p
            left join public.agreement_categories ac on ac.id = p.agreement_category_id
            cross join lateral (
              select coalesce(sum(r.positions_count), 0)::int as total,
                     coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'code', r.code, 'shiftName', r.shift_name,
                       'positionsCount', r.positions_count, 'status', r.status) order by r.code), '[]'::jsonb) as list
              from public.requests r
              where r.tenant_id = p.tenant_id and r.quote_position_id = p.id and r.status <> 'cancelled'
            ) rq
            where p.tenant_id = v.tenant_id and p.version_id = v.id
          ) pos
          where q.tenant_id = ${ctx.tenantId} and q.obsolete_at is null ${search}
        `;
        const data = await tx<z.infer<typeof SourceSchema>[]>`
          select * from (${base}) s order by (s.people_without_request > 0) desc, s.accepted_at desc nulls last, s.quote_code desc
          limit ${q.limit} offset ${q.offset}
        `;
        const [count] = await tx<{ total: number }[]>`select count(*)::int as total from (${base}) s`;
        return { data: [...data], pagination: { limit: q.limit, offset: q.offset, total: count?.total ?? 0 } };
      });
      return c.json(page, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/requests',
      tags,
      summary: 'Lista las peticiones',
      description: 'De las sucursales a las que tienes acceso, las más recientes primero. `status=active`: las cinco primeras.',
      security: bearerSecurity,
      request: { query: ListQuery },
      responses: { 200: jsonContent(paginated(RequestSummarySchema), 'Peticiones'), ...errorResponses(400, 401, 403) },
    }),
    async (c) => {
      const q = c.req.valid('query');
      const page = await withTenant(c, {}, async (tx, ctx) => {
        const conditions = [tx`true`];
        if (q.q) {
          const pattern = likePattern(q.q);
          conditions.push(tx`(r.code ilike ${pattern} or c.legal_name ilike ${pattern} or r.position_name ilike ${pattern}
                              or q.code ilike ${pattern} or r.shift_name ilike ${pattern})`);
        }
        if (q.status === 'active') conditions.push(tx`r.status in ${tx(ACTIVE)}`);
        else if (q.status) conditions.push(tx`r.status = ${q.status}`);
        if (q.clientId) conditions.push(tx`r.client_id = ${q.clientId}`);
        if (q.quoteId) conditions.push(tx`r.quote_id = ${q.quoteId}`);
        if (q.responsibleUserId) conditions.push(tx`r.responsible_user_id = ${q.responsibleUserId}`);
        if (q.branchId) conditions.push(tx`r.branch_id = ${q.branchId}`);
        const where = conditions.reduce((acc, cond) => tx`${acc} and ${cond}`);
        const base = tx`select * from (${summarySelect(tx, ctx.tenantId)} and ${where}) x
                        where ${q.startingSoon ? tx`x.starts_soon_uncovered` : tx`true`}`;
        const data = await tx<RequestSummary[]>`${base} order by x.created_at desc, x.code desc limit ${q.limit} offset ${q.offset}`;
        const [count] = await tx<{ total: number }[]>`select count(*)::int as total from (${base}) s`;
        return { data: [...data], pagination: { limit: q.limit, offset: q.offset, total: count?.total ?? 0 } };
      });
      return c.json(page, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/requests',
      tags,
      summary: 'Crear una petición',
      description:
        `Requiere \`${MANAGE}\`. De un puesto de un presupuesto aceptado (y no obsoleto): copia sus condiciones y su ` +
        'cálculo, toma el número de la serie `request` de la sociedad y crea las plazas. Por defecto: tú como responsable, ' +
        'la sucursal del presupuesto, las tareas desde la descripción del puesto y el contacto del cliente que firma los CPD. ' +
        'Si las plazas superan a las personas del presupuesto, solo se avisa (comprobación `people`).',
      security: bearerSecurity,
      request: { body: jsonBody(RequestCreateSchema) },
      responses: RequestCreated,
    }),
    async (c) => {
      const body = c.req.valid('json');
      const request = await withTenant(c, { permission: MANAGE }, async (tx, ctx) =>
        loadRequest(tx, ctx, await createRequest(tx, ctx, body)));
      return c.json(request, 201);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/quote-versions/{id}/requests',
      tags,
      summary: 'Crear las peticiones de un presupuesto aceptado',
      description: '«Crear peticiones» (con «Dividir»): varias peticiones de los puestos de esta versión, todas o ninguna.',
      security: bearerSecurity,
      request: { params: IdParams, body: jsonBody(BulkCreateSchema) },
      responses: {
        201: jsonContent(listOf(RequestSchema), 'Peticiones creadas'),
        ...errorResponses(400, 401, 403, 404, 409, 422),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      const result = await withTenant(c, { permission: MANAGE }, async (tx, ctx) => {
        const [v] = await tx`select 1 from public.quote_versions where tenant_id = ${ctx.tenantId} and id = ${id}`;
        if (!v) throw notFound('La versión no existe');
        const ids: string[] = [];
        for (const item of body.requests) ids.push(await createRequest(tx, ctx, item, id));
        const data: RequestOut[] = [];
        for (const rid of ids) data.push(await loadRequest(tx, ctx, rid));
        return { data };
      });
      return c.json(result, 201);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/requests/{id}',
      tags,
      summary: 'Ver una petición',
      description:
        'Con las condiciones copiadas del presupuesto, el reparto del puesto, las plazas, el CPD previo con sus comprobaciones ' +
        'y el presupuesto firmado.',
      security: bearerSecurity,
      request: { params: IdParams },
      responses: { 200: jsonContent(RequestSchema, 'Petición'), ...errorResponses(400, 401, 403, 404) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const request = await withTenant(c, {}, (tx, ctx) => loadRequest(tx, ctx, id));
      return c.json(request, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'patch',
      path: '/requests/{id}',
      tags,
      summary: 'Cambiar una petición',
      description:
        'Datos del servicio, plazas y estado. Los estados se cambian libremente (como en el pipeline); cancelar exige ' +
        '`cancelReason`. Cerrada o cancelada solo admite cambiar el estado (reabrir). Las condiciones del presupuesto no ' +
        'cambian. Bajar las plazas quita las últimas por cubrir. Si cambia algo de lo que sale en el CPD previo después ' +
        'de generarlo, queda desactualizado.',
      security: bearerSecurity,
      request: { params: IdParams, body: jsonBody(RequestUpdateSchema) },
      responses: RequestOk,
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      const request = await withTenant(c, { permission: MANAGE }, async (tx, ctx) => {
        const current = await findRequest(tx, ctx.tenantId, id);
        await checkRefs(tx, ctx.tenantId, current.clientId, current.companyId, body);
        const columns = serviceColumns(tx, body);
        if (Object.keys(columns).length > 0) {
          await tx`update public.requests set ${tx(columns)} where tenant_id = ${ctx.tenantId} and id = ${id}`;
        }
        return loadRequest(tx, ctx, id);
      });
      return c.json(request, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/requests/{id}/duplicate',
      tags,
      summary: 'Duplicar con otro horario',
      description:
        'Otra petición del mismo puesto del presupuesto, con sus plazas, fechas y horario. Copia centro, responsable, ' +
        'sucursal, tareas, riesgos, supuesto y demás datos del servicio; no el estado ni el CPD previo.',
      security: bearerSecurity,
      request: { params: IdParams, body: jsonBody(DuplicateSchema) },
      responses: RequestCreated,
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      const request = await withTenant(c, { permission: MANAGE }, async (tx, ctx) => {
        const [src] = await tx<(ServiceBody & { quotePositionId: string; schedule: ScheduleDay[] })[]>`
          select quote_position_id, branch_id, client_center_id, client_signer_contact_id, responsible_user_id,
                 order_reference, notes, tasks, qualification, risks, ppe, required_licenses, hazardous_work, use_case,
                 use_case_justification, workday_type, shift_name, schedule,
                 to_char(start_date, 'YYYY-MM-DD') as start_date, to_char(end_date, 'YYYY-MM-DD') as end_date
          from public.requests where tenant_id = ${ctx.tenantId} and id = ${id}
        `;
        if (!src) throw notFound('La petición no existe');
        const newId = await createRequest(tx, ctx, {
          ...src,
          schedule: src.schedule.map(({ weekday, working, start, end, breakMinutes }) => ({ weekday, working, start, end, breakMinutes })),
          ...Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)),
          quotePositionId: src.quotePositionId,
          positionsCount: body.positionsCount,
        } as CreateBody);
        return loadRequest(tx, ctx, newId);
      });
      return c.json(request, 201);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/requests/{id}/pre-cpd',
      tags,
      summary: 'Generar el CPD previo (PDF)',
      description:
        'Genera en el servidor las condiciones de la puesta a disposición (ETT y autorización, empresa usuaria, supuesto y ' +
        'justificación, puesto, tareas, riesgos y EPIs, centro, fechas, jornada y horario, retribución y precio, firmas) y ' +
        'las guarda como documento de la petición (tipo «CPD previo»). El estado pasa a generado. 409 `cpd_incompleto` si ' +
        'falta algo que bloquea (en `details`); 422 `salario_bajo_convenio` si el convenio vigente pide más; 422 ' +
        '`art8_bloqueado` si lo prohíbe el art. 8 de la Ley 14/1994 (cliente ETT, huelga declarada, puestos amortizados o ' +
        'trabajo especialmente peligroso sin excepción; códigos en `details[].path`). Los riesgos valen escritos o con la ' +
        'evaluación de riesgos del cliente adjunta (sale como anexo).',
      security: bearerSecurity,
      request: { params: IdParams },
      responses: {
        201: jsonContent(z.object({ documentId: z.guid(), name: z.string() }).openapi('RequestPreCpdPdf'), 'Documento generado'),
        ...errorResponses(400, 401, 403, 404, 409, 422, 503),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const storage = storageOf(c);
      const result = await withTenant(c, { permission: MANAGE }, async (tx, ctx) => {
        const d = await loadDetail(tx, ctx.tenantId, id);
        const r = d.row;
        requireOpen(r.status);
        const failed = d.checks.filter((x: PreCpdCheck) => x.blocking && !x.ok);
        const art8 = failed.filter((x) => x.field === 'art8');
        if (art8.length) {
          throw new ApiError(422, 'art8_bloqueado', `No se puede ceder personal en esta petición: ${art8.map((x) => x.message).join('; ')}`,
            art8.map((x) => ({ path: x.code, message: x.message })));
        }
        if (failed.some((x) => x.code === 'salary_agreement')) {
          const first = d.agreementCheck!.periods.find((p) => p.belowAgreement)!;
          throw new ApiError(422, 'salario_bajo_convenio',
            `El salario de la petición (${r.salaryHour.toFixed(2)} €/h) queda por debajo del convenio vigente desde el ` +
            `${first.from.split('-').reverse().join('/')} (${first.minimumSalaryHour!.toFixed(2)} €/h). La ley no lo permite ` +
            '(art. 11 de la Ley 14/1994): crea una versión nueva del presupuesto');
        }
        if (failed.length) {
          throw new ApiError(409, 'cpd_incompleto', 'Faltan datos para generar el CPD previo',
            failed.map((x) => ({ path: x.field, message: x.message })));
        }
        const useCase = USE_CASES.find((u) => u.code === r.useCase)!;
        const [type] = await tx<{ id: string }[]>`
          select id from public.catalog_items where tenant_id = ${ctx.tenantId} and catalog = 'document_type'
            and code = 'request_pre_cpd' and deleted_at is null limit 1
        `;
        if (!type) throw new ApiError(409, 'conflicto', 'Falta el tipo de documento «CPD previo» en las tablas maestras');
        const pdf = await renderPreCpdPdf({
          code: r.code,
          ett: {
            name: r.ettName, taxId: r.ettTaxId, tradeName: r.ettTradeName, authorizationNumber: r.ettAuthorizationNumber,
            authorizationDate: r.ettAuthorizationDate, authorizationScope: r.ettAuthorizationScope,
            representativeName: r.ettRepresentativeName, representativePosition: r.ettRepresentativePosition,
            representativeIdType: r.ettRepresentativeIdType, representativeIdNumber: r.ettRepresentativeIdNumber,
          },
          client: { name: r.clientName, taxId: r.clientTaxId },
          center: r.clientCenterName ? { name: r.clientCenterName, address: r.clientCenterAddress } : null,
          signer: r.clientSignerContactName ? { name: r.clientSignerContactName, position: r.clientSignerContactPosition } : null,
          quote: { code: r.quoteCode, versionNumber: r.quoteVersionNumber },
          useCase: { name: useCase.name, legalReference: useCase.legalReference, justification: r.useCaseJustification! },
          positionName: r.positionName,
          categoryName: r.categoryName,
          level: r.level,
          collectiveAgreementName: r.collectiveAgreementName,
          qualification: r.qualification,
          requiredLicenses: r.requiredLicenses,
          tasks: r.tasks!,
          risks: r.risks,
          risksAnnex: d.risksDocument?.name ?? null,
          art8: {
            strike: d.art8.strike ? { affirmative: d.art8.strike.affirmative, declaredAt: d.art8.strike.declaredAt, contactName: d.art8.strike.contactName } : null,
            downsizedPositions: d.art8.downsizedPositions
              ? { affirmative: d.art8.downsizedPositions.affirmative, declaredAt: d.art8.downsizedPositions.declaredAt, contactName: d.art8.downsizedPositions.contactName }
              : null,
            hazardousWork: d.art8.hazardousWork,
            hazardousExceptionBasis: d.art8.hazardousException?.basis ?? null,
          },
          ppe: r.ppe,
          startDate: r.startDate!,
          endDate: r.endDate,
          positionsCount: r.positionsCount,
          shiftName: r.shiftName,
          workdayType: r.workdayType,
          schedule: r.schedule,
          weeklyHours: r.weeklyHours ?? 0,
          grossSalaryHour: r.grossSalaryHour,
          rateHour: r.rateHour,
          extras: r.extras,
        });
        const name = `CPD previo ${r.code}.pdf`;
        const storagePath = `${ctx.tenantId}/request/${id}/${randomUUID()}.pdf`;
        await storage.upload(storagePath, pdf, 'application/pdf');
        const [doc] = await tx<{ id: string }[]>`
          insert into public.documents ${tx({
            tenantId: ctx.tenantId, entityType: 'request', entityId: id, typeId: type.id, name, storagePath,
            mimeType: 'application/pdf', sizeBytes: pdf.byteLength, status: 'draft',
            notes: 'Condiciones de la puesta a disposición generadas desde la petición',
          })} returning id
        `;
        await tx`
          update public.requests
             set pre_cpd_status = 'generated', pre_cpd_outdated = false, pre_cpd_document_id = ${doc!.id},
                 pre_cpd_generated_at = now(), pre_cpd_generated_by = ${ctx.userId}, pre_cpd_sent_at = null,
                 pre_cpd_sent_by = null, pre_cpd_sent_to = null, pre_cpd_sent_notes = null, pre_cpd_reviewed_at = null,
                 pre_cpd_reviewed_by = null
           where tenant_id = ${ctx.tenantId} and id = ${id}
        `;
        return { documentId: doc!.id, name };
      });
      return c.json(result, 201);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/requests/{id}/pre-cpd/sent',
      tags,
      summary: 'Marcar el CPD previo como enviado',
      description: 'A mano (sin firma electrónica de momento): a quién y notas. Hace falta haberlo generado y que esté al día.',
      security: bearerSecurity,
      request: { params: IdParams, body: jsonBody(SentBody) },
      responses: RequestOk,
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      const request = await withTenant(c, { permission: MANAGE }, async (tx, ctx) => {
        const r = await findRequest(tx, ctx.tenantId, id);
        requireOpen(r.status);
        if (r.preCpdStatus === 'pending' || !r.preCpdDocumentId) {
          throw new ApiError(409, 'conflicto', 'Primero hay que generar el CPD previo');
        }
        if (r.preCpdOutdated) throw new ApiError(409, 'conflicto', 'El CPD previo está desactualizado: genéralo de nuevo antes de enviarlo');
        await tx`
          update public.requests
             set pre_cpd_status = 'sent', pre_cpd_sent_at = now(), pre_cpd_sent_by = ${ctx.userId},
                 pre_cpd_sent_to = ${body.sentTo ?? null}, pre_cpd_sent_notes = ${body.notes ?? null},
                 pre_cpd_reviewed_at = null, pre_cpd_reviewed_by = null
           where tenant_id = ${ctx.tenantId} and id = ${id}
        `;
        return loadRequest(tx, ctx, id);
      });
      return c.json(request, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/requests/{id}/pre-cpd/reviewed',
      tags,
      summary: 'Marcar el CPD previo como revisado por el cliente',
      description: 'A mano. Hace falta que esté enviado y al día.',
      security: bearerSecurity,
      request: { params: IdParams },
      responses: RequestOk,
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const request = await withTenant(c, { permission: MANAGE }, async (tx, ctx) => {
        const r = await findRequest(tx, ctx.tenantId, id);
        requireOpen(r.status);
        if (r.preCpdStatus !== 'sent') throw new ApiError(409, 'conflicto', 'El CPD previo aún no se ha enviado al cliente');
        if (r.preCpdOutdated) throw new ApiError(409, 'conflicto', 'El CPD previo está desactualizado: genéralo y envíalo de nuevo');
        await tx`
          update public.requests set pre_cpd_status = 'reviewed', pre_cpd_reviewed_at = now(), pre_cpd_reviewed_by = ${ctx.userId}
           where tenant_id = ${ctx.tenantId} and id = ${id}
        `;
        return loadRequest(tx, ctx, id);
      });
      return c.json(request, 200);
    },
  )
  // -------------------------------------------------------------------------
  // Fase 7: art. 8 y CPD firmado (permiso hiring_files.cpd)
  // -------------------------------------------------------------------------
  .openapi(
    createRoute({
      method: 'post',
      path: '/requests/{id}/declarations',
      tags,
      summary: 'Registrar una declaración del art. 8 de la empresa usuaria',
      description:
        `Requiere \`${CPD}\`. Huelga en el centro (art. 8.a) o puestos amortizados en los 12 meses anteriores (art. 8.c). ` +
        'Solo se añaden: vale la última de cada tipo. Mientras el cliente no firme en la app, la registra la ETT en su nombre: ' +
        'qué contacto declara (del cliente de la petición), cómo y cuándo; quién la registra lo pone la API. `affirmative: true` ' +
        '(hay huelga / hubo amortización) bloquea el CPD previo y los expedientes. El justificante, si lo hay, es un documento ' +
        'de la petición (tipo «Declaración de la empresa usuaria (art. 8)»).',
      security: bearerSecurity,
      request: { params: IdParams, body: jsonBody(DeclarationBody) },
      responses: { 201: jsonContent(RequestSchema, 'Petición'), ...errorResponses(400, 401, 403, 404, 409, 422) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      const request = await withTenant(c, { permission: CPD }, async (tx, ctx) => {
        await findRequest(tx, ctx.tenantId, id);
        await tx`
          insert into public.request_declarations ${tx({
            tenantId: ctx.tenantId, requestId: id, kind: body.kind, affirmative: body.affirmative, contactId: body.contactId ?? null,
            channel: body.channel, declaredAt: body.declaredAt, documentId: body.documentId ?? null, notes: body.notes ?? null,
          })}
        `;
        return loadRequest(tx, ctx, id);
      });
      return c.json(request, 201);
    },
  )
  .openapi(
    createRoute({
      method: 'put',
      path: '/requests/{id}/cpd-signed',
      tags,
      summary: 'Registrar el CPD firmado por la empresa usuaria',
      description:
        `Requiere \`${CPD}\` (y \`${MANAGE}\`, que edita la petición). Registro a mano: el documento firmado, ya subido a la ` +
        'petición (tipo «CPD firmado por la empresa usuaria»), y la fecha de la firma. Es el paso «CPD» de todos los ' +
        'expedientes de la petición. 422 `art8_bloqueado` si el art. 8 lo prohíbe. `null` en el cuerpo lo deshace.',
      security: bearerSecurity,
      request: { params: IdParams, body: jsonBody(CpdSignedBody) },
      responses: RequestOk,
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      const request = await withTenant(c, { permission: CPD }, async (tx, ctx) => {
        await findRequest(tx, ctx.tenantId, id);
        if (body.documentId) {
          const blocked = art8Issues((await loadArt8(tx, ctx.tenantId, [id])).get(id)!.input, false).filter((i) => i.severity === 'blocked');
          if (blocked.length) {
            throw new ApiError(422, 'art8_bloqueado', `No se puede ceder personal en esta petición: ${blocked.map((i) => i.message).join('; ')}`,
              blocked.map((i) => ({ path: i.code, message: i.message })));
          }
          if (body.signedAt! > new Date().toISOString().slice(0, 10)) {
            throw new ApiError(422, 'validacion', 'La fecha de la firma no puede ser futura', [{ path: 'signedAt', message: 'Fecha futura' }]);
          }
        }
        const updated = await tx`
          update public.requests set cpd_signed_at = ${body.documentId ? body.signedAt! : null}, cpd_signed_document_id = ${body.documentId}
           where tenant_id = ${ctx.tenantId} and id = ${id} returning id
        `;
        if (!updated.length) throw new ApiError(403, 'sin_permiso', `Para registrar el CPD firmado hace falta también ${MANAGE} en la sucursal`);
        return loadRequest(tx, ctx, id);
      });
      return c.json(request, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'put',
      path: '/requests/{id}/hazardous-exception',
      tags,
      summary: 'Marcar o quitar la excepción de trabajos especialmente peligrosos',
      description:
        `Requiere \`${CPD}\` (y \`${MANAGE}\`). Art. 8.b de la Ley 14/1994: con \`hazardousWork\` la petición queda ` +
        'bloqueada salvo que la ETT marque la excepción con su base (texto de 10 a 2000 caracteres). Se guarda quién y cuándo. ' +
        '`basis: null` la quita. El CPD previo, si estaba generado, queda desactualizado.',
      security: bearerSecurity,
      request: { params: IdParams, body: jsonBody(HazardousExceptionBody) },
      responses: RequestOk,
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      const request = await withTenant(c, { permission: CPD }, async (tx, ctx) => {
        const r = await findRequest(tx, ctx.tenantId, id);
        requireOpen(r.status);
        const updated = await tx`
          update public.requests set hazardous_exception_basis = ${body.basis}
           where tenant_id = ${ctx.tenantId} and id = ${id} returning id
        `;
        if (!updated.length) throw new ApiError(403, 'sin_permiso', `Para la excepción hace falta también ${MANAGE} en la sucursal`);
        return loadRequest(tx, ctx, id);
      });
      return c.json(request, 200);
    },
  );
