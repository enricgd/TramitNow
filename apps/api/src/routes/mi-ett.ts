// Mi ETT (db/README.md, "Mi ETT"): datos legales y facturación de cada sociedad, series de numeración, códigos de
// cuenta de cotización, servicios que factura la ETT y ajustes de presupuestos.
// Leer: cualquier miembro de la ETT activa. Escribir: tenant.manage. Las RLS lo vuelven a comprobar.

import { createRoute, z } from '@hono/zod-openapi';
import { withTenant } from '../lib/context.js';
import { crudRoutes } from '../lib/crud.js';
import { type Tx, pickDefined } from '../lib/db.js';
import { ApiError, notFound } from '../lib/errors.js';
import {
  IdParams,
  Status,
  Timestamp,
  bearerSecurity,
  createRouter,
  errorResponses,
  jsonBody,
  jsonContent,
  listOf,
  nullableText,
} from '../lib/openapi.js';

const PERMISSION = 'tenant.manage';
const tags = ['Mi ETT'];
const date = z.iso.date().nullable();
const Day = z.string().openapi({ format: 'date', example: '2026-12-31' });
const base = { id: z.guid().nullable(), createdAt: Timestamp.nullable(), updatedAt: Timestamp.nullable() };
const normalized = (max: number, pattern: RegExp, message: string) =>
  z
    .string()
    .transform((v) => v.replace(/[\s.\-/]/g, '').toUpperCase())
    .pipe(z.string().min(1).max(max).regex(pattern, message))
    .nullable();

const WARNING_DAYS = 60;

function daysUntil(day: string | null): number | null {
  if (!day) return null;
  const today = new Date(new Date().toISOString().slice(0, 10));
  return Math.round((new Date(day).getTime() - today.getTime()) / 86_400_000);
}

async function requireCompany(tx: Tx, tenantId: string, companyId: string) {
  const [company] = await tx`
    select id from public.companies where tenant_id = ${tenantId} and id = ${companyId} and deleted_at is null
  `;
  if (!company) throw notFound('La sociedad no existe');
}

// ---------------------------------------------------------------------------
// Documento de identidad del representante
// ---------------------------------------------------------------------------
const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

export function validIdNumber(type: string, value: string): boolean {
  if (type === 'passport') return /^[A-Z0-9]{5,20}$/.test(value);
  const nie = type === 'nie' ? value.match(/^([XYZ])([0-9]{7})([A-Z])$/) : null;
  const dni = type === 'dni' ? value.match(/^([0-9]{8})([A-Z])$/) : null;
  const digits = nie ? `${'XYZ'.indexOf(nie[1]!)}${nie[2]}` : dni?.[1];
  const letter = nie ? nie[3] : dni?.[2];
  return digits !== undefined && letter === DNI_LETTERS[Number(digits) % 23];
}

// ---------------------------------------------------------------------------
// Datos legales de la sociedad
// ---------------------------------------------------------------------------
const GuaranteeType = z.enum(['bank_guarantee', 'surety_insurance', 'cash_deposit', 'other']);

const legalFields = {
  tradeName: nullableText(200),
  legalForm: nullableText(80).openapi({ example: 'Sociedad Limitada (S.L.)' }),
  cnaeCode: z.string().regex(/^[0-9]{4}$/, 'Clase CNAE de 4 cifras').nullable().openapi({ example: '7820' }),
  staffAgreementId: z.guid().nullable().openapi({ description: 'Convenio del personal de estructura (/v1/collective-agreements)' }),
  ettAuthorizationNumber: nullableText(40),
  ettAuthorizationDate: date,
  ettAuthorizationScope: z.enum(['state', 'regional']).nullable().openapi({ description: 'Estatal o de una comunidad autónoma' }),
  ettAuthorizationCommunityCode: z.string().regex(/^[0-9]{2}$/).nullable().openapi({ description: 'Obligatorio si es regional' }),
  commercialRegistry: nullableText(120),
  registryVolume: nullableText(20).openapi({ description: 'Tomo' }),
  registryFolio: nullableText(20),
  registrySheet: nullableText(40).openapi({ description: 'Hoja' }),
  registryEntry: nullableText(20).openapi({ description: 'Inscripción' }),
  legalRepName: nullableText(160),
  legalRepIdType: z.enum(['dni', 'nie', 'passport']).nullable(),
  legalRepIdNumber: normalized(20, /^[A-Z0-9]+$/, 'Solo letras y números'),
  legalRepPosition: nullableText(120),
  mutualInsurer: nullableText(160),
  preventionService: nullableText(200),
  redAuthorization: nullableText(20),
  guaranteeType: GuaranteeType.nullable(),
  guaranteeEntity: nullableText(160),
  guaranteeAmount: z.number().min(0).max(1e12).nullable(),
  guaranteeExpiresOn: date,
  certificateHolder: nullableText(200),
  certificateIssuer: nullableText(120),
  certificateExpiresOn: date,
};

const CompanyLegalSchema = z
  .object({
    ...base,
    companyId: z.guid(),
    ...legalFields,
    ettAuthorizationDate: Day.nullable(),
    guaranteeExpiresOn: Day.nullable(),
    certificateExpiresOn: Day.nullable(),
    legalRepIdNumber: z.string().nullable(),
  })
  .openapi('CompanyLegal', {
    description: 'Datos legales de una sociedad. Del certificado digital solo metadatos: nunca el fichero ni su contraseña.',
  });
type CompanyLegal = z.infer<typeof CompanyLegalSchema>;
const CompanyLegalUpdate = z.strictObject(legalFields).partial().openapi('CompanyLegalUpdate');
const CompanyLegalResponse = z
  .object({ legal: CompanyLegalSchema, warnings: z.array(z.string()).openapi({ description: 'Garantía o certificado vencidos o a punto de vencer' }) })
  .openapi('CompanyLegalResponse');

const legalColumns = `id, company_id, trade_name, legal_form, cnae_code, staff_agreement_id, ett_authorization_number,
  to_char(ett_authorization_date, 'YYYY-MM-DD') as ett_authorization_date, ett_authorization_scope,
  ett_authorization_community_code, commercial_registry, registry_volume, registry_folio, registry_sheet, registry_entry,
  legal_rep_name, legal_rep_id_type, legal_rep_id_number, legal_rep_position, mutual_insurer, prevention_service,
  red_authorization, guarantee_type, guarantee_entity, guarantee_amount::float8 as guarantee_amount,
  to_char(guarantee_expires_on, 'YYYY-MM-DD') as guarantee_expires_on, certificate_holder, certificate_issuer,
  to_char(certificate_expires_on, 'YYYY-MM-DD') as certificate_expires_on, created_at, updated_at`;

const emptyLegal = (companyId: string): CompanyLegal => ({
  id: null,
  companyId,
  ...(Object.fromEntries(Object.keys(legalFields).map((k) => [k, null])) as Omit<CompanyLegal, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>),
  createdAt: null,
  updatedAt: null,
});

function legalWarnings(legal: CompanyLegal): string[] {
  const warnings: string[] = [];
  const guarantee = daysUntil(legal.guaranteeExpiresOn);
  if (guarantee !== null && guarantee < 0) warnings.push('La garantía financiera está vencida: es obligatoria para operar como ETT');
  else if (guarantee !== null && guarantee <= WARNING_DAYS) warnings.push(`La garantía financiera vence en ${guarantee} días`);
  const certificate = daysUntil(legal.certificateExpiresOn);
  if (certificate !== null && certificate < 0) warnings.push('El certificado digital está caducado');
  else if (certificate !== null && certificate <= WARNING_DAYS) warnings.push(`El certificado digital caduca en ${certificate} días`);
  return warnings;
}

// ---------------------------------------------------------------------------
// Facturación de la sociedad
// ---------------------------------------------------------------------------
const billingFields = {
  iban: normalized(34, /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/, 'IBAN no válido'),
  swiftBic: normalized(11, /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, 'BIC no válido'),
  paymentMethodId: z.guid().nullable().openapi({ description: 'Tabla maestra payment_method' }),
  paymentTerms: nullableText(200).openapi({ example: '30 días fecha factura' }),
  vatRate: z.number().min(0).max(100),
  withholdingRate: z.number().min(0).max(100),
  currency: z.string().regex(/^[A-Z]{3}$/),
  billingEmail: z.email().max(200).nullable(),
  billingAddressId: z.guid().nullable().openapi({ description: 'null: la dirección fiscal de la sociedad' }),
  branchMode: z.enum(['centralized', 'per_branch']),
};

const CompanyBillingSchema = z
  .object({ ...base, companyId: z.guid(), ...billingFields, iban: z.string().nullable(), swiftBic: z.string().nullable() })
  .openapi('CompanyBillingSettings');
type CompanyBilling = z.infer<typeof CompanyBillingSchema>;
const CompanyBillingUpdate = z.strictObject(billingFields).partial().openapi('CompanyBillingSettingsUpdate');

const billingColumns = `id, company_id, iban, swift_bic, payment_method_id, payment_terms, vat_rate::float8 as vat_rate,
  withholding_rate::float8 as withholding_rate, currency, billing_email, billing_address_id, branch_mode, created_at, updated_at`;

const emptyBilling = (companyId: string): CompanyBilling => ({
  id: null,
  companyId,
  iban: null,
  swiftBic: null,
  paymentMethodId: null,
  paymentTerms: null,
  vatRate: 21,
  withholdingRate: 0,
  currency: 'EUR',
  billingEmail: null,
  billingAddressId: null,
  branchMode: 'centralized',
  createdAt: null,
  updatedAt: null,
});

// ---------------------------------------------------------------------------
// Ajustes de presupuestos
// ---------------------------------------------------------------------------
const settingsFields = {
  quoteMinMarginPercent: z.number().min(-100).max(1000).nullable().openapi({ description: 'Margen mínimo en %. null: sin mínimo' }),
  quoteNoResponseDays: z.number().int().min(1).max(365).openapi({ description: 'Días sin respuesta para avisar (15 por defecto)' }),
  candidatePoolRetentionMonths: z.number().int().min(1).max(120)
    .openapi({ description: 'Meses que dura el consentimiento de la bolsa de candidatos (24 por defecto) [verificar]' }),
  candidateDocumentNoticeDays: z.number().int().min(1).max(365)
    .openapi({ description: 'Días antes de caducar un documento del candidato para avisar (30 por defecto)' }),
  accessLogRetentionMonths: z.number().int().min(12).max(120)
    .openapi({ description: 'Meses que se conserva la auditoría de accesos (24 por defecto) [verificar]' }),
  contractCommunicationDays: z.number().int().min(1).max(60)
    .openapi({ description: 'Días desde el inicio del contrato para comunicarlo a Contrat@ (10 por defecto) [verificar]' }),
  basicCopyDays: z.number().int().min(1).max(60)
    .openapi({ description: 'Días desde la firma para entregar la copia básica (10 por defecto) [verificar]' }),
};
const TenantSettingsSchema = z.object(settingsFields).openapi('TenantSettings');
const settingsColumns = (tx: Tx) => tx`
  quote_min_margin_percent::float8 as quote_min_margin_percent, quote_no_response_days, candidate_pool_retention_months,
  candidate_document_notice_days, access_log_retention_months, contract_communication_days, basic_copy_days
`;
const TenantSettingsUpdate = z.strictObject(settingsFields).partial().openapi('TenantSettingsUpdate');

// ---------------------------------------------------------------------------
// Series de numeración
// ---------------------------------------------------------------------------
const DocumentKind = z.enum(['quote', 'request', 'invoice', 'credit_note']);
const seriesEditable = {
  prefix: z.string().max(20).regex(/^[^\s]*$/, 'Sin espacios').openapi({ example: 'F2026-' }),
  padding: z.number().int().min(1).max(10),
  nextNumber: z.number().int().min(1).max(2_000_000_000).openapi({
    description: 'Número con el que sigue (p. ej. al venir de otro programa). Nunca menor que el siguiente actual',
  }),
};
const NumberSeriesSchema = z
  .object({
    id: z.guid(),
    documentKind: DocumentKind,
    companyId: z.guid().nullable(),
    branchId: z.guid().nullable(),
    year: z.number().int(),
    prefix: z.string(),
    padding: z.number().int(),
    lastNumber: z.number().int().openapi({ description: 'Último número usado (0: ninguno)' }),
    nextNumber: z.number().int(),
    nextFormatted: z.string().openapi({ example: 'F2026-00108' }),
    updatedAt: Timestamp,
  })
  .openapi('NumberSeries');
type NumberSeries = z.infer<typeof NumberSeriesSchema>;
const NumberSeriesCreate = z
  .strictObject({
    documentKind: DocumentKind,
    companyId: z.guid().nullable().optional(),
    branchId: z.guid().nullable().optional(),
    year: z.number().int().min(2000).max(2100),
    ...seriesEditable,
  })
  .partial({ prefix: true, padding: true, nextNumber: true })
  .openapi('NumberSeriesCreate');
const NumberSeriesUpdate = z.strictObject(seriesEditable).partial().openapi('NumberSeriesUpdate');
const NumberSeriesQuery = z.object({
  documentKind: DocumentKind.optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  companyId: z.guid().optional(),
});

const seriesColumns = `id, document_kind, company_id, branch_id, year, prefix, padding, last_number,
  last_number + 1 as next_number,
  prefix || lpad((last_number + 1)::text, greatest(padding, length((last_number + 1)::text)), '0') as next_formatted, updated_at`;

const defaultPrefix = (kind: z.infer<typeof DocumentKind>, year: number) =>
  `${{ quote: 'PRE', request: 'PET', invoice: 'FAC', credit_note: 'REC' }[kind]}${year}-`;

// ---------------------------------------------------------------------------
// Rutas de sociedad, ajustes y series
// ---------------------------------------------------------------------------
export const miEtt = createRouter()
  .openapi(
    createRoute({
      method: 'get',
      path: '/companies/{id}/legal',
      tags,
      summary: 'Ver los datos legales de una sociedad',
      description: 'Autorización de ETT, registro mercantil, representante, garantía y certificado. Todo a null si aún no hay datos.',
      security: bearerSecurity,
      request: { params: IdParams },
      responses: { 200: jsonContent(CompanyLegalResponse, 'Datos legales'), ...errorResponses(400, 401, 403, 404) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const legal = await withTenant(c, {}, async (tx, ctx) => {
        await requireCompany(tx, ctx.tenantId, id);
        const [row] = await tx<CompanyLegal[]>`
          select ${tx.unsafe(legalColumns)} from public.company_legal_profiles where tenant_id = ${ctx.tenantId} and company_id = ${id}
        `;
        return row ?? emptyLegal(id);
      });
      return c.json({ legal, warnings: legalWarnings(legal) }, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'put',
      path: '/companies/{id}/legal',
      tags,
      summary: 'Guardar los datos legales de una sociedad',
      description: `Crea o actualiza; solo cambia los campos enviados. Requiere \`${PERMISSION}\`. 422 si el documento del representante no es válido.`,
      security: bearerSecurity,
      request: { params: IdParams, body: jsonBody(CompanyLegalUpdate) },
      responses: { 200: jsonContent(CompanyLegalResponse, 'Datos legales guardados'), ...errorResponses(400, 401, 403, 404, 422) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const patch = pickDefined(c.req.valid('json'), Object.keys(legalFields) as (keyof typeof legalFields)[]);
      const legal = await withTenant(c, { permission: PERMISSION }, async (tx, ctx) => {
        await requireCompany(tx, ctx.tenantId, id);
        const [row] = await tx<CompanyLegal[]>`
          insert into public.company_legal_profiles ${tx({ ...patch, tenantId: ctx.tenantId, companyId: id })}
          on conflict (tenant_id, company_id) do update set ${Object.keys(patch).length ? tx(patch) : tx`updated_at = now()`}
          returning ${tx.unsafe(legalColumns)}
        `;
        if (row!.legalRepIdNumber && row!.legalRepIdType && !validIdNumber(row!.legalRepIdType, row!.legalRepIdNumber)) {
          throw new ApiError(422, 'validacion', 'El documento del representante no es válido (revisa la letra)');
        }
        return row!;
      });
      return c.json({ legal, warnings: legalWarnings(legal) }, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/companies/{id}/billing-settings',
      tags,
      summary: 'Ver la facturación de una sociedad',
      description: 'IBAN, forma de pago, IVA y retención con los que factura. Valores por defecto si aún no hay datos. Las series, en /v1/number-series.',
      security: bearerSecurity,
      request: { params: IdParams },
      responses: { 200: jsonContent(CompanyBillingSchema, 'Facturación'), ...errorResponses(400, 401, 403, 404) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const billing = await withTenant(c, {}, async (tx, ctx) => {
        await requireCompany(tx, ctx.tenantId, id);
        const [row] = await tx<CompanyBilling[]>`
          select ${tx.unsafe(billingColumns)} from public.company_billing_settings where tenant_id = ${ctx.tenantId} and company_id = ${id}
        `;
        return row ?? emptyBilling(id);
      });
      return c.json(billing, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'put',
      path: '/companies/{id}/billing-settings',
      tags,
      summary: 'Guardar la facturación de una sociedad',
      description: `Crea o actualiza; solo cambia los campos enviados. Requiere \`${PERMISSION}\`.`,
      security: bearerSecurity,
      request: { params: IdParams, body: jsonBody(CompanyBillingUpdate) },
      responses: { 200: jsonContent(CompanyBillingSchema, 'Facturación guardada'), ...errorResponses(400, 401, 403, 404, 422) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const patch = pickDefined(c.req.valid('json'), Object.keys(billingFields) as (keyof typeof billingFields)[]);
      const billing = await withTenant(c, { permission: PERMISSION }, async (tx, ctx) => {
        await requireCompany(tx, ctx.tenantId, id);
        const [row] = await tx<CompanyBilling[]>`
          insert into public.company_billing_settings ${tx({ ...patch, tenantId: ctx.tenantId, companyId: id })}
          on conflict (tenant_id, company_id) do update set ${Object.keys(patch).length ? tx(patch) : tx`updated_at = now()`}
          returning ${tx.unsafe(billingColumns)}
        `;
        return row!;
      });
      return c.json(billing, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/tenant-settings',
      tags,
      summary: 'Ver los ajustes de presupuestos de la ETT',
      security: bearerSecurity,
      responses: { 200: jsonContent(TenantSettingsSchema, 'Ajustes'), ...errorResponses(401, 403) },
    }),
    async (c) => {
      const settings = await withTenant(c, {}, async (tx, ctx) => {
        const [row] = await tx<z.infer<typeof TenantSettingsSchema>[]>`
          select ${settingsColumns(tx)} from public.tenants where id = ${ctx.tenantId}
        `;
        if (!row) throw notFound();
        return row;
      });
      return c.json(settings, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'patch',
      path: '/tenant-settings',
      tags,
      summary: 'Cambiar los ajustes de presupuestos de la ETT',
      description: `Requiere \`${PERMISSION}\`.`,
      security: bearerSecurity,
      request: { body: jsonBody(TenantSettingsUpdate) },
      responses: { 200: jsonContent(TenantSettingsSchema, 'Ajustes'), ...errorResponses(400, 401, 403) },
    }),
    async (c) => {
      const patch = pickDefined(c.req.valid('json'), Object.keys(settingsFields) as (keyof typeof settingsFields)[]);
      const settings = await withTenant(c, { permission: PERMISSION }, async (tx, ctx) => {
        const [row] = await tx<z.infer<typeof TenantSettingsSchema>[]>`
          update public.tenants set ${Object.keys(patch).length ? tx(patch) : tx`updated_at = now()`}
          where id = ${ctx.tenantId}
          returning ${settingsColumns(tx)}
        `;
        if (!row) throw notFound();
        return row;
      });
      return c.json(settings, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/number-series',
      tags,
      summary: 'Lista las series de numeración de la ETT',
      description: 'Presupuestos, peticiones, facturas y rectificativas, por sociedad, sucursal y año.',
      security: bearerSecurity,
      request: { query: NumberSeriesQuery },
      responses: { 200: jsonContent(listOf(NumberSeriesSchema), 'Series'), ...errorResponses(400, 401, 403) },
    }),
    async (c) => {
      const { documentKind, year, companyId } = c.req.valid('query');
      const data = await withTenant(c, {}, async (tx, ctx) => [
        ...(await tx<NumberSeries[]>`
          select ${tx.unsafe(seriesColumns)} from public.number_series
          where tenant_id = ${ctx.tenantId}
            ${documentKind ? tx`and document_kind = ${documentKind}` : tx``}
            ${year ? tx`and year = ${year}` : tx``}
            ${companyId ? tx`and company_id = ${companyId}` : tx``}
          order by year desc, document_kind, company_id nulls first, branch_id nulls first
        `),
      ]);
      return c.json({ data }, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/number-series',
      tags,
      summary: 'Crear una serie de numeración',
      description: `Prefijo por defecto: PRE/PET/FAC/REC + año + «-». Requiere \`${PERMISSION}\`. 409 si ya existe esa serie.`,
      security: bearerSecurity,
      request: { body: jsonBody(NumberSeriesCreate) },
      responses: { 201: jsonContent(NumberSeriesSchema, 'Serie creada'), ...errorResponses(400, 401, 403, 409, 422) },
    }),
    async (c) => {
      const body = c.req.valid('json');
      const series = await withTenant(c, { permission: PERMISSION }, async (tx, ctx) => {
        const [row] = await tx<NumberSeries[]>`
          insert into public.number_series ${tx({
            tenantId: ctx.tenantId,
            documentKind: body.documentKind,
            companyId: body.companyId ?? null,
            branchId: body.branchId ?? null,
            year: body.year,
            prefix: body.prefix ?? defaultPrefix(body.documentKind, body.year),
            padding: body.padding ?? 5,
            lastNumber: (body.nextNumber ?? 1) - 1,
          })}
          returning ${tx.unsafe(seriesColumns)}
        `;
        return row!;
      });
      return c.json(series, 201);
    },
  )
  .openapi(
    createRoute({
      method: 'patch',
      path: '/number-series/{id}',
      tags,
      summary: 'Cambiar prefijo, cifras o por dónde sigue una serie',
      description: `Requiere \`${PERMISSION}\`. La numeración nunca va hacia atrás (409).`,
      security: bearerSecurity,
      request: { params: IdParams, body: jsonBody(NumberSeriesUpdate) },
      responses: { 200: jsonContent(NumberSeriesSchema, 'Serie'), ...errorResponses(400, 401, 403, 404, 409) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const { nextNumber, ...rest } = c.req.valid('json');
      const values = { ...rest, ...(nextNumber !== undefined ? { lastNumber: nextNumber - 1 } : {}) };
      const series = await withTenant(c, { permission: PERMISSION }, async (tx, ctx) => {
        const [row] = await tx<NumberSeries[]>`
          update public.number_series set ${Object.keys(values).length ? tx(values) : tx`updated_at = now()`}
          where tenant_id = ${ctx.tenantId} and id = ${id}
          returning ${tx.unsafe(seriesColumns)}
        `;
        if (!row) throw notFound('La serie no existe');
        return row;
      });
      return c.json(series, 200);
    },
  );

// ---------------------------------------------------------------------------
// CCC
// ---------------------------------------------------------------------------
export function validCcc(code: string): boolean {
  return /^[0-9]{11}$/.test(code) && Number(code.slice(0, 9)) % 97 === Number(code.slice(9));
}

const StaffType = z.enum(['mission', 'structure']);
const contributionFields = {
  companyId: z.guid(),
  branchId: z.guid().nullable(),
  code: z
    .string()
    .transform((v) => v.replace(/[\s/-]/g, ''))
    .pipe(
      z
        .string()
        .regex(/^[0-9]{11}$/, 'El CCC tiene 11 cifras: 2 de provincia, 7 de número y 2 de control')
        .refine(validCcc, 'Las cifras de control del CCC no cuadran'),
    )
    .openapi({ example: '48000000101' }),
  staffType: StaffType.openapi({ description: 'mission: personas en misión; structure: personal de estructura' }),
  status: Status,
};

export const contributionAccounts = crudRoutes({
  path: '/contribution-accounts',
  table: 'contribution_accounts',
  name: 'ContributionAccount',
  tag: 'Mi ETT',
  names: { one: 'el CCC', many: 'los CCC' },
  schema: z
    .object({
      id: z.guid(),
      ...contributionFields,
      code: z.string(),
      provinceCode: z.string().openapi({ description: 'Las 2 primeras cifras del CCC' }),
      createdAt: Timestamp,
      updatedAt: Timestamp,
    })
    .openapi('ContributionAccount'),
  fields: contributionFields,
  required: ['companyId', 'code', 'staffType'],
  columns: 'id, company_id, branch_id, code, province_code, staff_type, status, created_at, updated_at',
  permission: PERMISSION,
  search: ['code'],
  branchColumn: 'branch_id',
  filters: { companyId: z.guid().optional(), staffType: StaffType.optional() },
  where: (tx, q) => [
    ...(q.companyId ? [tx`company_id = ${q.companyId}`] : []),
    ...(q.staffType ? [tx`staff_type = ${q.staffType}`] : []),
  ],
  orderBy: 'code',
});

// ---------------------------------------------------------------------------
// Servicios que factura la ETT
// ---------------------------------------------------------------------------
const ChargeMode = z.enum(['percentage', 'per_person', 'per_unit', 'fixed']);
const serviceFields = {
  code: z.string().trim().min(1).max(30),
  name: z.string().trim().min(1).max(160),
  chargeMode: ChargeMode.openapi({ description: '% del salario bruto anual, por persona, por unidad o importe fijo' }),
  defaultValue: z.number().min(0).max(1e9).openapi({ description: 'Porcentaje o precio por defecto' }),
  unit: z.string().trim().min(1).max(30).openapi({ example: 'persona' }),
  status: Status,
};

export const billableServices = crudRoutes({
  path: '/billable-services',
  table: 'billable_services',
  name: 'BillableService',
  tag: 'Mi ETT',
  names: { one: 'el servicio', many: 'los servicios' },
  schema: z
    .object({ id: z.guid(), ...serviceFields, createdAt: Timestamp, updatedAt: Timestamp })
    .openapi('BillableService'),
  fields: serviceFields,
  required: ['code', 'name', 'chargeMode', 'unit'],
  columns: 'id, code, name, charge_mode, default_value::float8 as default_value, unit, status, created_at, updated_at',
  permission: PERMISSION,
  search: ['code', 'name'],
  orderBy: 'name',
});
