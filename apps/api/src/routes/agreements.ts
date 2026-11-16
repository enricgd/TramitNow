// Catálogo global de convenios (db/README.md, "Convenios globales"; docs/convenios-globales.md).
//
// Leer: cualquier usuario con sesión, tenga ETT o no. Las ETT ven solo lo publicado (y lo retirado); el equipo de
// contenidos lo ve todo (las RLS deciden). Revisar, devolver, publicar y retirar: solo el equipo de contenidos.
// Los datos los carga db/scripts/cargar-convenios.sh; la API no los edita.

import { createRoute, z } from '@hono/zod-openapi';
import type { Context } from 'hono';
import { type AppEnv, withUser } from '../lib/context.js';
import { type Tx, likePattern } from '../lib/db.js';
import { forbidden, notFound } from '../lib/errors.js';
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

const tags = ['Convenios del catálogo'];
const Day = z.string().openapi({ format: 'date', example: '2026-01-01' });

const AgreementScope = z.enum(['estatal', 'autonomico', 'provincial', 'empresa']);
const VersionStatus = z.enum(['borrador', 'en_revision', 'publicada', 'retirada']);

const VersionSummarySchema = z
  .object({
    id: z.guid(),
    agreementId: z.guid(),
    publicationId: z.guid(),
    effectiveFrom: Day,
    effectiveTo: Day.nullable(),
    provisional: z.boolean(),
    status: VersionStatus,
    publishedAt: Timestamp.nullable(),
  })
  .openapi('AgreementVersionSummary');

const AgreementSchema = z
  .object({
    id: z.guid(),
    regcon: z.string().openapi({ description: 'Código REGCON (14 dígitos)', example: '99999999999901' }),
    name: z.string(),
    scope: AgreementScope,
    autonomousCommunityCode: z.string().nullable(),
    provinceCode: z.string().nullable(),
    cnaeCodes: z.array(z.string()).openapi({ description: 'CNAE-2009: sección, división, grupo o clase' }),
    validFrom: Day.nullable(),
    validTo: Day.nullable(),
    replacesAgreementId: z.guid().nullable(),
    currentVersion: VersionSummarySchema.nullable().openapi({
      description: 'Versión publicada vigente hoy (o, si no hay, la última publicada). null si no hay nada publicado',
    }),
    pendingVersions: z.number().int().openapi({
      description: 'Versiones en borrador o en revisión (siempre 0 para quien no es del equipo de contenidos)',
    }),
    updatedAt: Timestamp,
  })
  .openapi('Agreement');

const PublicationSchema = z
  .object({
    id: z.guid(),
    bulletin: z.string(),
    date: Day,
    number: z.string(),
    url: z.string().nullable(),
    type: z.enum(['texto_inicial', 'revision_salarial', 'tablas_provisionales', 'correccion_errores', 'sentencia', 'anulacion']),
  })
  .openapi('AgreementPublication');

const AgreementDetailSchema = AgreementSchema.extend({
  publications: z.array(PublicationSchema),
  versions: z.array(VersionSummarySchema).openapi({ description: 'De la más reciente a la más antigua' }),
}).openapi('AgreementDetail');

const CategorySchema = z
  .object({ id: z.guid(), code: z.string(), name: z.string(), group: z.string().nullable(), level: z.string().nullable() })
  .openapi('AgreementCategory');

const SalaryItemSchema = z
  .object({
    id: z.guid(),
    categoryId: z.guid().nullable().openapi({ description: 'null: vale para todas las categorías' }),
    categoryCode: z.string().nullable(),
    concept: z.string().openapi({ example: 'salario_base' }),
    label: z.string().nullable(),
    amount: z.number(),
    unit: z.enum(['hora', 'dia', 'mes', 'anio', 'porcentaje']),
    salarial: z.boolean(),
    source: z.string().nullable().openapi({ description: 'Tabla y página del boletín' }),
  })
  .openapi('AgreementSalaryItem');

const ConditionsSchema = z
  .object({
    annualHours: z.number().nullable(),
    vacationDays: z.number().int().nullable(),
    vacationDaysType: z.enum(['naturales', 'laborables']).nullable(),
    extraPayments: z.number().int().nullable(),
    notes: z.string().nullable(),
    extra: z.record(z.string(), z.unknown()).openapi({ description: 'Otras condiciones del fichero que aún no tienen campo propio' }),
  })
  .openapi('AgreementConditions');

const VersionSchema = VersionSummarySchema.extend({
  agreement: z.object({ id: z.guid(), regcon: z.string(), name: z.string() }),
  publication: PublicationSchema,
  replacesVersionId: z.guid().nullable(),
  pendingReview: z.array(z.string()).openapi({ description: 'Dudas del extractor que hay que mirar al revisar' }),
  reviewNotes: z.string().nullable(),
  extractedBy: z.guid().nullable().openapi({ description: 'null: carga automática sin persona indicada' }),
  extractedAt: Timestamp,
  reviewedBy: z.guid().nullable(),
  reviewedAt: Timestamp.nullable(),
  publishedBy: z.guid().nullable(),
  withdrawnAt: Timestamp.nullable(),
  withdrawalReason: z.string().nullable(),
  categories: z.array(CategorySchema),
  salaryItems: z.array(SalaryItemSchema),
  conditions: ConditionsSchema.nullable(),
}).openapi('AgreementVersion');
type Version = z.infer<typeof VersionSchema>;

const VersionListItemSchema = VersionSummarySchema.extend({
  agreement: z.object({ id: z.guid(), regcon: z.string(), name: z.string() }),
  reviewedBy: z.guid().nullable(),
  extractedBy: z.guid().nullable(),
  pendingReview: z.array(z.string()),
}).openapi('AgreementVersionListItem');

const ListQuery = PaginationQuery.extend({
  q: z.string().trim().min(1).max(100).optional().openapi({ description: 'Busca en el nombre y el REGCON' }),
  scope: AgreementScope.optional(),
  provinceCode: z.string().regex(/^[0-9]{2}$/).optional(),
  autonomousCommunityCode: z.string().regex(/^[0-9]{2}$/).optional(),
  cnae: z
    .string()
    .regex(/^([A-U]|[0-9]{2,4})$/)
    .optional()
    .openapi({ description: 'Sector del cliente (CNAE-2009): convenios de esa sección, división, grupo o clase', example: '52' }),
});

const VersionListQuery = PaginationQuery.extend({
  status: VersionStatus.optional().openapi({ description: 'Por ejemplo, en_revision: la cola de revisión' }),
  agreementId: z.guid().optional(),
});

const ReviewBody = z.strictObject({ notes: z.string().trim().max(4000).nullable().optional() }).openapi('AgreementReview');
const RejectBody = z.strictObject({ notes: z.string().trim().min(1).max(4000) }).openapi('AgreementReject');
const WithdrawBody = z.strictObject({ reason: z.string().trim().min(1).max(4000) }).openapi('AgreementWithdraw');

// ---------------------------------------------------------------------------
// SQL
// ---------------------------------------------------------------------------
const versionSummary = (alias: string) => `
  json_build_object('id', ${alias}.id, 'agreementId', ${alias}.agreement_id, 'publicationId', ${alias}.publication_id,
    'effectiveFrom', to_char(${alias}.effective_from, 'YYYY-MM-DD'), 'effectiveTo', to_char(${alias}.effective_to, 'YYYY-MM-DD'),
    'provisional', ${alias}.provisional, 'status', ${alias}.status,
    'publishedAt', to_char(${alias}.published_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))`;

const agreementColumns = `
  a.id, a.regcon, a.name, a.scope, a.autonomous_community_code, a.province_code, a.cnae_codes,
  to_char(a.valid_from, 'YYYY-MM-DD') as valid_from, to_char(a.valid_to, 'YYYY-MM-DD') as valid_to,
  a.replaces_agreement_id, a.updated_at,
  (select ${versionSummary('cv')} from public.agreement_versions cv
   where cv.agreement_id = a.id and cv.status = 'publicada'
   order by (cv.effective_from <= current_date and (cv.effective_to is null or cv.effective_to >= current_date)) desc,
            cv.effective_from desc, cv.published_at desc
   limit 1) as current_version,
  (select count(*)::int from public.agreement_versions pv
   where pv.agreement_id = a.id and pv.status in ('borrador', 'en_revision')) as pending_versions`;

const publicationColumns = `p.id, p.bulletin, to_char(p.published_on, 'YYYY-MM-DD') as date, p.number, p.url, p.type`;

const versionListColumns = `
  v.id, v.agreement_id, v.publication_id, to_char(v.effective_from, 'YYYY-MM-DD') as effective_from,
  to_char(v.effective_to, 'YYYY-MM-DD') as effective_to, v.provisional, v.status, v.published_at,
  json_build_object('id', a.id, 'regcon', a.regcon, 'name', a.name) as agreement,
  v.reviewed_by, v.extracted_by, v.pending_review`;

async function findVersion(tx: Tx, id: string): Promise<Version> {
  const [row] = await tx<Version[]>`
    select ${tx.unsafe(versionListColumns)}, v.replaces_version_id, v.review_notes, v.extracted_at, v.reviewed_at,
           v.published_by, v.withdrawn_at, v.withdrawal_reason,
           (select row_to_json(x) from (select ${tx.unsafe(publicationColumns)} from public.agreement_publications p
                                         where p.id = v.publication_id) x) as publication,
           coalesce((select json_agg(json_build_object('id', c.id, 'code', c.code, 'name', c.name, 'group', c.group_name,
                                                       'level', c.level) order by c.sort_order, c.code)
                     from public.agreement_categories c where c.version_id = v.id), '[]') as categories,
           coalesce((select json_agg(json_build_object('id', i.id, 'categoryId', i.category_id, 'categoryCode', c.code,
                                                       'concept', i.concept, 'label', i.label, 'amount', i.amount::float8,
                                                       'unit', i.unit, 'salarial', i.salarial, 'source', i.source)
                                     order by i.sort_order)
                     from public.agreement_salary_items i
                     left join public.agreement_categories c on c.id = i.category_id
                     where i.version_id = v.id), '[]') as salary_items,
           (select json_build_object('annualHours', k.annual_hours::float8, 'vacationDays', k.vacation_days,
                                     'vacationDaysType', k.vacation_days_type, 'extraPayments', k.extra_payments,
                                     'notes', k.notes, 'extra', k.extra)
            from public.agreement_conditions k where k.version_id = v.id) as conditions
    from public.agreement_versions v
    join public.agreements a on a.id = v.agreement_id
    where v.id = ${id}
  `;
  if (!row) throw notFound('La versión no existe o no está publicada');
  return row;
}

async function requireContentEditor(tx: Tx): Promise<void> {
  const [row] = await tx<{ ok: boolean }[]>`select private.is_content_editor() as ok`;
  if (!row?.ok) throw forbidden('Solo el equipo de contenidos de TramitNOW revisa y publica convenios');
}

/** Cambio de estado de una versión por el equipo de contenidos: las reglas están en la base de datos. */
function transition(
  c: Context<AppEnv>,
  id: string,
  change: (tx: Tx) => ReturnType<Tx>,
): Promise<Version> {
  return withUser(c, async (tx) => {
    await requireContentEditor(tx);
    const rows = await change(tx);
    if (!rows.length) throw notFound('La versión no existe');
    return findVersion(tx, id);
  });
}

const actionRoute = (path: string, summary: string, description: string) => ({
  method: 'post' as const,
  path: `/agreement-versions/{id}/${path}`,
  tags,
  summary,
  description: `${description} Solo el equipo de contenidos (403 si no).`,
  security: bearerSecurity,
  responses: {
    200: jsonContent(VersionSchema, 'Versión'),
    ...errorResponses(400, 401, 403, 404, 409, 422),
  },
});

const versionAction = (path: string, summary: string, description: string) =>
  createRoute({ ...actionRoute(path, summary, description), request: { params: IdParams } });

const versionActionWithBody = <B extends z.ZodType>(path: string, summary: string, description: string, body: B) =>
  createRoute({ ...actionRoute(path, summary, description), request: { params: IdParams, body: jsonBody(body) } });

// ---------------------------------------------------------------------------
// Rutas
// ---------------------------------------------------------------------------
export const agreements = createRouter()
  .openapi(
    createRoute({
      method: 'get',
      path: '/agreements',
      tags,
      summary: 'Lista los convenios del catálogo',
      description:
        'Las ETT ven los que tienen algo publicado; el equipo de contenidos, todos. `?cnae=` busca por el sector del cliente.',
      security: bearerSecurity,
      request: { query: ListQuery },
      responses: { 200: jsonContent(paginated(AgreementSchema), 'Convenios'), ...errorResponses(400, 401) },
    }),
    async (c) => {
      const { limit, offset, q, scope, provinceCode, autonomousCommunityCode, cnae } = c.req.valid('query');
      const page = await withUser(c, async (tx) => {
        const filter = tx`
          ${q ? tx`and (a.name ilike ${likePattern(q)} or a.regcon like ${likePattern(q)})` : tx``}
          ${scope ? tx`and a.scope = ${scope}` : tx``}
          ${provinceCode ? tx`and a.province_code = ${provinceCode}` : tx``}
          ${autonomousCommunityCode ? tx`and a.autonomous_community_code = ${autonomousCommunityCode}` : tx``}
          ${
            cnae
              ? tx`and exists (
                  select 1 from unnest(a.cnae_codes) code
                  where code like ${cnae} || '%' or ${cnae} like code || '%'
                     or exists (select 1 from public.cnae_activities d where d.parent_code = ${cnae} and code like d.code || '%')
                     or exists (select 1 from public.cnae_activities d where d.code = left(${cnae}, 2) and d.parent_code = code))`
              : tx``
          }
        `;
        const data = await tx`
          select ${tx.unsafe(agreementColumns)} from public.agreements a
          where true ${filter} order by a.name, a.regcon limit ${limit} offset ${offset}
        `;
        const [count] = await tx<{ total: number }[]>`select count(*)::int as total from public.agreements a where true ${filter}`;
        return { data: [...data] as z.infer<typeof AgreementSchema>[], pagination: { limit, offset, total: count?.total ?? 0 } };
      });
      return c.json(page, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/agreements/{id}',
      tags,
      summary: 'Ver un convenio del catálogo con sus publicaciones y versiones',
      security: bearerSecurity,
      request: { params: IdParams },
      responses: { 200: jsonContent(AgreementDetailSchema, 'Convenio'), ...errorResponses(400, 401, 404) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const detail = await withUser(c, async (tx) => {
        const [agreement] = await tx`select ${tx.unsafe(agreementColumns)} from public.agreements a where a.id = ${id}`;
        if (!agreement) throw notFound('El convenio no existe o aún no tiene nada publicado');
        const publications = await tx`
          select ${tx.unsafe(publicationColumns)} from public.agreement_publications p
          where p.agreement_id = ${id} order by p.published_on desc, p.number
        `;
        const versions = await tx`
          select ${tx.unsafe(versionSummary('v'))} as version from public.agreement_versions v
          where v.agreement_id = ${id} order by v.effective_from desc, v.created_at desc
        `;
        return {
          ...(agreement as z.infer<typeof AgreementSchema>),
          publications: [...publications] as z.infer<typeof PublicationSchema>[],
          versions: versions.map((v) => v.version as z.infer<typeof VersionSummarySchema>),
        };
      });
      return c.json(detail, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/agreement-versions',
      tags,
      summary: 'Lista versiones de convenio',
      description: 'Para el equipo de contenidos, `?status=en_revision` es la cola de revisión. Las ETT ven solo las publicadas.',
      security: bearerSecurity,
      request: { query: VersionListQuery },
      responses: { 200: jsonContent(paginated(VersionListItemSchema), 'Versiones'), ...errorResponses(400, 401) },
    }),
    async (c) => {
      const { limit, offset, status, agreementId } = c.req.valid('query');
      const page = await withUser(c, async (tx) => {
        const filter = tx`
          ${status ? tx`and v.status = ${status}` : tx``}
          ${agreementId ? tx`and v.agreement_id = ${agreementId}` : tx``}
        `;
        const data = await tx`
          select ${tx.unsafe(versionListColumns)} from public.agreement_versions v
          join public.agreements a on a.id = v.agreement_id
          where true ${filter} order by a.name, v.effective_from desc limit ${limit} offset ${offset}
        `;
        const [count] = await tx<{ total: number }[]>`
          select count(*)::int as total from public.agreement_versions v where true ${filter}
        `;
        return {
          data: [...data] as z.infer<typeof VersionListItemSchema>[],
          pagination: { limit, offset, total: count?.total ?? 0 },
        };
      });
      return c.json(page, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/agreement-versions/{id}',
      tags,
      summary: 'Ver una versión con sus categorías, importes y condiciones',
      security: bearerSecurity,
      request: { params: IdParams },
      responses: { 200: jsonContent(VersionSchema, 'Versión'), ...errorResponses(400, 401, 404) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      return c.json(await withUser(c, (tx) => findVersion(tx, id)), 200);
    },
  )
  .openapi(
    versionActionWithBody(
      'review',
      'Marcar una versión como revisada',
      'La revisa quien llama, que no puede ser quien la extrajo (409). Solo en revisión. Cambiar después su contenido quita la revisión.',
      ReviewBody,
    ),
    async (c) => {
      const { id } = c.req.valid('param');
      const { notes } = c.req.valid('json');
      const version = await transition(c, id, (tx) => tx`
        update public.agreement_versions
        set reviewed_by = auth.uid(), review_notes = coalesce(${notes ?? null}, review_notes)
        where id = ${id} returning id
      `);
      return c.json(version, 200);
    },
  )
  .openapi(
    versionActionWithBody('reject', 'Devolver una versión a borrador', 'Con el motivo en `notes`. Solo en revisión.', RejectBody),
    async (c) => {
      const { id } = c.req.valid('param');
      const { notes } = c.req.valid('json');
      const version = await transition(c, id, (tx) => tx`
        update public.agreement_versions set status = 'borrador', review_notes = ${notes}
        where id = ${id} returning id
      `);
      return c.json(version, 200);
    },
  )
  .openapi(
    versionAction('submit', 'Enviar una versión a revisión', 'De borrador a en revisión (también lo hace el cargador al volver a cargarla).'),
    async (c) => {
      const { id } = c.req.valid('param');
      const version = await transition(c, id, (tx) => tx`
        update public.agreement_versions set status = 'en_revision' where id = ${id} returning id
      `);
      return c.json(version, 200);
    },
  )
  .openapi(
    versionAction(
      'publish',
      'Publicar una versión',
      'Exige que esté en revisión y revisada por alguien distinto de quien la extrajo (409). Desde ese momento la ven todas las ETT y ya no cambia.',
    ),
    async (c) => {
      const { id } = c.req.valid('param');
      const version = await transition(c, id, (tx) => tx`
        update public.agreement_versions set status = 'publicada' where id = ${id} returning id
      `);
      return c.json(version, 200);
    },
  )
  .openapi(
    versionActionWithBody('withdraw', 'Retirar una versión publicada', 'Con el motivo. Las ETT la siguen viendo como retirada.', WithdrawBody),
    async (c) => {
      const { id } = c.req.valid('param');
      const { reason } = c.req.valid('json');
      const version = await transition(c, id, (tx) => tx`
        update public.agreement_versions set status = 'retirada', withdrawal_reason = ${reason} where id = ${id} returning id
      `);
      return c.json(version, 200);
    },
  );
