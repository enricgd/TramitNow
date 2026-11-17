// Candidaturas (fase 6): una persona en una petición, con etapas. Al proponerla al cliente reserva una plaza de la
// petición y al confirmarla la cubre (la plaza y la candidatura son el mismo dato: lo mantiene la base de datos). El
// CPD de la persona, el contrato y el alta son de la fase 7.
//
// Base legal: si se inscribió ella (origin applied), medidas precontractuales; si la ETT la saca de la bolsa
// (sourced), su consentimiento de la bolsa vigente (si no, 409).
//
// Escribir: candidates.manage o requests.manage en la sucursal de la petición.

import { createRoute, z } from '@hono/zod-openapi';
import { type TenantContext, withTenant } from '../lib/context.js';
import type { Tx } from '../lib/db.js';
import { ApiError, forbidden, notFound } from '../lib/errors.js';
import {
  IdParams,
  Timestamp,
  bearerSecurity,
  createRouter,
  errorResponses,
  jsonBody,
  jsonContent,
  listOf,
  nullableText,
} from '../lib/openapi.js';

const tags = ['Candidaturas'];

const Stage = z
  .enum(['registered', 'preselected', 'interview', 'proposed', 'confirmed', 'on_mission', 'finished', 'left', 'discarded', 'withdrawn'])
  .openapi({
    description: 'Inscrito, Preseleccionado, Entrevista, Propuesto al cliente (plaza reservada), Confirmado (plaza cubierta), ' +
      'En misión, Finalizada y Baja (fase 7), Descartado, Retirado',
  });
const SelectionStage = z.enum(['registered', 'preselected', 'interview', 'discarded', 'withdrawn']);
const Source = z.enum(['candidate_portal', 'infojobs', 'indeed', 'linkedin', 'database', 'referral', 'walk_in', 'other']);

export const ApplicationSchema = z
  .object({
    id: z.guid(),
    candidateId: z.guid(),
    candidateCode: z.string(),
    candidateName: z.string(),
    requestId: z.guid(),
    requestCode: z.string(),
    requestStatus: z.string(),
    positionName: z.string(),
    shiftName: z.string().nullable(),
    clientName: z.string(),
    clientCenterName: z.string().nullable(),
    startDate: z.string().nullable(),
    stage: Stage,
    active: z.boolean().openapi({ description: 'En selección, propuesta o confirmada' }),
    origin: z.enum(['applied', 'sourced']),
    legalBasis: z.enum(['precontractual', 'consent']),
    source: Source.nullable(),
    slotId: z.guid().nullable(),
    slotNumber: z.number().int().nullable(),
    notes: z.string().nullable(),
    discardReason: z.string().nullable(),
    stageChangedAt: Timestamp,
    stageChangedByName: z.string().nullable(),
    createdAt: Timestamp,
  })
  .openapi('Application');
type Application = z.infer<typeof ApplicationSchema>;

const RequirementSchema = z.object({ code: z.string(), ok: z.boolean(), message: z.string() }).openapi('ApplicationRequirement');
const ApplicationWithChecks = ApplicationSchema.extend({ requirements: z.array(RequirementSchema) }).openapi('ApplicationDetail');

export async function loadApplications(
  tx: Tx, tenantId: string, filter: { candidateId?: string; requestId?: string; id?: string; stage?: string },
): Promise<Application[]> {
  const conds = [tx`a.tenant_id = ${tenantId}`];
  if (filter.candidateId) conds.push(tx`a.candidate_id = ${filter.candidateId}`);
  if (filter.requestId) conds.push(tx`a.request_id = ${filter.requestId}`);
  if (filter.id) conds.push(tx`a.id = ${filter.id}`);
  if (filter.stage) conds.push(tx`a.stage = ${filter.stage}`);
  const where = conds.reduce((acc, cond) => tx`${acc} and ${cond}`);
  const rows = await tx<Application[]>`
    select a.id, a.candidate_id, c.code as candidate_code, trim(c.first_name || ' ' || coalesce(c.last_name, '')) as candidate_name,
           a.request_id, r.code as request_code, r.status as request_status, r.position_name, r.shift_name,
           cl.legal_name as client_name, cc.name as client_center_name, to_char(r.start_date, 'YYYY-MM-DD') as start_date,
           a.stage, a.stage in ('registered', 'preselected', 'interview', 'proposed', 'confirmed') as active, a.origin,
           a.legal_basis, a.source, a.slot_id, s.slot_number, a.notes, a.discard_reason, a.stage_changed_at,
           p.full_name as stage_changed_by_name, a.created_at
    from public.applications a
    join public.candidates c on c.tenant_id = a.tenant_id and c.id = a.candidate_id
    join public.requests r on r.tenant_id = a.tenant_id and r.id = a.request_id
    join public.clients cl on cl.tenant_id = r.tenant_id and cl.id = r.client_id
    left join public.client_centers cc on cc.tenant_id = r.tenant_id and cc.id = r.client_center_id
    left join public.request_slots s on s.tenant_id = a.tenant_id and s.id = a.slot_id
    left join public.profiles p on p.id = a.stage_changed_by
    where ${where}
    order by a.created_at desc, a.id
  `;
  return [...rows];
}

/** Lo que conviene comprobar antes de proponer (avisa, no bloquea: el contrato lo exigirá en la fase 7). */
async function requirements(tx: Tx, tenantId: string, applicationId: string) {
  const [r] = await tx<{ hasId: boolean; idExpired: boolean; origin: string; poolConsent: boolean; licensesText: string | null }[]>`
    select c.id_document_number_enc is not null as has_id,
           coalesce(c.id_document_expires_on < coalesce(rq.start_date, current_date), false) as id_expired,
           a.origin, private.candidate_has_consent(a.tenant_id, a.candidate_id, 'talent_pool') as pool_consent,
           rq.required_licenses as licenses_text
    from public.applications a
    join public.candidates c on c.tenant_id = a.tenant_id and c.id = a.candidate_id
    join public.requests rq on rq.tenant_id = a.tenant_id and rq.id = a.request_id
    where a.tenant_id = ${tenantId} and a.id = ${applicationId}
  `;
  return [
    { code: 'id_document', ok: r!.hasId && !r!.idExpired, message: r!.hasId ? (r!.idExpired ? 'El documento de identidad caduca antes del inicio' : 'Documento de identidad vigente') : 'Falta el documento de identidad' },
    { code: 'legal_basis', ok: r!.origin === 'applied' || r!.poolConsent, message: r!.origin === 'applied' ? 'Se inscribió en la oferta (medidas precontractuales)' : 'Consentimiento de la bolsa vigente' },
    { code: 'client_data_transfer', ok: true, message: 'Comunicar sus datos a la empresa usuaria al proponerla [verificar con la asesoría]' },
    { code: 'licenses', ok: !r!.licensesText, message: r!.licensesText ? `Comprueba los carnés que pide la petición: ${r!.licensesText}` : 'La petición no pide carnés' },
  ];
}

async function canWrite(tx: Tx, ctx: TenantContext, requestId: string) {
  if (ctx.permissions.has('candidates.manage') || ctx.isSuperadmin) return;
  const [ok] = await tx<{ ok: boolean }[]>`select private.request_writable(${ctx.tenantId}, ${requestId}) as ok`;
  if (!ok?.ok) throw forbidden('No puedes cambiar candidaturas (candidates.manage o requests.manage)');
}

async function findApplication(tx: Tx, ctx: TenantContext, id: string) {
  const [row] = await tx<{ requestId: string; stage: string; slotId: string | null }[]>`
    select request_id, stage, slot_id from public.applications where tenant_id = ${ctx.tenantId} and id = ${id}
  `;
  if (!row) throw notFound('La candidatura no existe');
  await canWrite(tx, ctx, row.requestId);
  return row;
}

const one = async (tx: Tx, tenantId: string, id: string, withChecks = false) => {
  const [app] = await loadApplications(tx, tenantId, { id });
  return withChecks ? { ...app!, requirements: await requirements(tx, tenantId, id) } : { ...app!, requirements: [] };
};

const action = (path: string, summary: string, description: string, body?: z.ZodType) =>
  createRoute({
    method: 'post',
    path: `/applications/{id}/${path}`,
    tags,
    summary,
    description,
    security: bearerSecurity,
    request: body ? { params: IdParams, body: jsonBody(body) } : { params: IdParams },
    responses: { 200: jsonContent(ApplicationWithChecks, 'Candidatura'), ...errorResponses(400, 401, 403, 404, 409) },
  });

export const applications = createRouter()
  .openapi(
    createRoute({
      method: 'get',
      path: '/applications',
      tags,
      summary: 'Lista las candidaturas',
      description: 'De una persona (`candidateId`) o de una petición (`requestId`, el embudo).',
      security: bearerSecurity,
      request: { query: z.object({ candidateId: z.guid().optional(), requestId: z.guid().optional(), stage: Stage.optional() }) },
      responses: { 200: jsonContent(listOf(ApplicationSchema), 'Candidaturas'), ...errorResponses(400, 401, 403) },
    }),
    async (c) => {
      const q = c.req.valid('query');
      if (!q.candidateId && !q.requestId) throw new ApiError(400, 'validacion', 'Indica candidateId o requestId');
      const data = await withTenant(c, {}, (tx, ctx) => loadApplications(tx, ctx.tenantId, q));
      return c.json({ data }, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/applications',
      tags,
      summary: 'Añadir una persona a una petición',
      description:
        'Empieza en `registered` (o la etapa de selección indicada). `origin: applied` si se inscribió ella (medidas ' +
        'precontractuales); `sourced` si la ETT la saca de la bolsa: exige su consentimiento de la bolsa vigente (409). ' +
        '409 también si ya está en esa petición o la petición está cerrada o cancelada.',
      security: bearerSecurity,
      request: {
        body: jsonBody(z.strictObject({
          candidateId: z.guid(),
          requestId: z.guid(),
          origin: z.enum(['applied', 'sourced']),
          stage: z.enum(['registered', 'preselected', 'interview']).optional(),
          source: Source.nullable().optional(),
          notes: nullableText(2000).optional(),
        }).openapi('ApplicationCreate')),
      },
      responses: { 201: jsonContent(ApplicationWithChecks, 'Candidatura'), ...errorResponses(400, 401, 403, 404, 409, 422) },
    }),
    async (c) => {
      const body = c.req.valid('json');
      const app = await withTenant(c, {}, async (tx, ctx) => {
        const [req] = await tx`select 1 from public.requests where tenant_id = ${ctx.tenantId} and id = ${body.requestId}`;
        if (!req) throw notFound('La petición no existe');
        const [cand] = await tx`select 1 from public.candidates where tenant_id = ${ctx.tenantId} and id = ${body.candidateId}`;
        if (!cand) throw notFound('El candidato no existe');
        await canWrite(tx, ctx, body.requestId);
        const [dup] = await tx`select 1 from public.applications where request_id = ${body.requestId} and candidate_id = ${body.candidateId}`;
        if (dup) throw new ApiError(409, 'conflicto', 'La persona ya tiene una candidatura en esta petición');
        const [row] = await tx<{ id: string }[]>`
          insert into public.applications ${tx({
            tenantId: ctx.tenantId, candidateId: body.candidateId, requestId: body.requestId, origin: body.origin,
            legalBasis: body.origin === 'applied' ? 'precontractual' : 'consent', stage: body.stage ?? 'registered',
            source: body.source ?? null, notes: body.notes ?? null,
          })} returning id
        `;
        return one(tx, ctx.tenantId, row!.id, true);
      });
      return c.json(app, 201);
    },
  )
  .openapi(
    createRoute({
      method: 'patch',
      path: '/applications/{id}',
      tags,
      summary: 'Cambiar una candidatura',
      description:
        'Etapas de selección (registered, preselected, interview) libremente, o sacarla del proceso (discarded con ' +
        '`discardReason`, o withdrawn). Si tenía plaza, la plaza queda por cubrir. Proponer y confirmar van por sus rutas.',
      security: bearerSecurity,
      request: {
        params: IdParams,
        body: jsonBody(z.strictObject({
          stage: SelectionStage.optional(),
          notes: nullableText(2000).optional(),
          discardReason: nullableText(250).optional(),
        }).openapi('ApplicationUpdate')),
      },
      responses: { 200: jsonContent(ApplicationWithChecks, 'Candidatura'), ...errorResponses(400, 401, 403, 404, 409, 422) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      const app = await withTenant(c, {}, async (tx, ctx) => {
        await findApplication(tx, ctx, id);
        const patch: Record<string, unknown> = {};
        if (body.stage !== undefined) patch.stage = body.stage;
        if (body.notes !== undefined) patch.notes = body.notes;
        if (body.discardReason !== undefined) patch.discardReason = body.discardReason;
        if (Object.keys(patch).length) {
          await tx`update public.applications set ${tx(patch as Record<string, never>)} where tenant_id = ${ctx.tenantId} and id = ${id}`;
        }
        return one(tx, ctx.tenantId, id);
      });
      return c.json(app, 200);
    },
  )
  .openapi(
    action('propose', 'Proponer al cliente',
      'Reserva una plaza por cubrir de la petición (`slotId` o la primera libre): queda «pendiente del cliente». 409 si no ' +
      'quedan plazas o la persona ya está propuesta o confirmada en otra. `requirements` avisa de lo que falta (no bloquea).',
      z.strictObject({ slotId: z.guid().optional() }).openapi('ApplicationPropose')),
    async (c) => {
      const { id } = c.req.valid('param');
      const body = (c.req.valid('json' as never) ?? {}) as { slotId?: string };
      const app = await withTenant(c, {}, async (tx, ctx) => {
        const current = await findApplication(tx, ctx, id);
        const [busy] = await tx<{ code: string }[]>`
          select r.code from public.applications a2 join public.requests r on r.tenant_id = a2.tenant_id and r.id = a2.request_id
          where a2.tenant_id = ${ctx.tenantId} and a2.id <> ${id} and a2.stage in ('proposed', 'confirmed', 'on_mission')
            and a2.candidate_id = (select candidate_id from public.applications where tenant_id = ${ctx.tenantId} and id = ${id})
        `;
        if (busy) throw new ApiError(409, 'conflicto', `La persona ya ocupa una plaza en ${busy.code}`);
        let slotId = body.slotId;
        if (!slotId) {
          const [free] = await tx<{ id: string }[]>`
            select id from public.request_slots where tenant_id = ${ctx.tenantId} and request_id = ${current.requestId} and status = 'open'
            order by slot_number limit 1
          `;
          if (!free) throw new ApiError(409, 'conflicto', 'La petición no tiene plazas por cubrir');
          slotId = free.id;
        }
        await tx`update public.applications set stage = 'proposed', slot_id = ${slotId} where tenant_id = ${ctx.tenantId} and id = ${id}`;
        return one(tx, ctx.tenantId, id, true);
      });
      return c.json(app, 200);
    },
  )
  .openapi(
    action('confirm', 'Confirmar (el cliente la acepta)',
      'De propuesta a confirmada: la plaza queda cubierta. A mano hasta que el cliente confirme en su portal. Lo siguiente ' +
      '(CPD de la persona, contrato y alta) es de Contratos y altas (fase 7).'),
    async (c) => {
      const { id } = c.req.valid('param');
      const app = await withTenant(c, {}, async (tx, ctx) => {
        await findApplication(tx, ctx, id);
        await tx`update public.applications set stage = 'confirmed' where tenant_id = ${ctx.tenantId} and id = ${id}`;
        return one(tx, ctx.tenantId, id, true);
      });
      return c.json(app, 200);
    },
  )
  .openapi(
    action('release', 'Liberar la plaza', 'Vuelve a entrevista y la plaza queda por cubrir (el cliente no la quiere o se retira la propuesta).'),
    async (c) => {
      const { id } = c.req.valid('param');
      const app = await withTenant(c, {}, async (tx, ctx) => {
        const current = await findApplication(tx, ctx, id);
        if (!['proposed', 'confirmed'].includes(current.stage)) throw new ApiError(409, 'conflicto', 'La candidatura no tiene plaza');
        await tx`update public.applications set stage = 'interview' where tenant_id = ${ctx.tenantId} and id = ${id}`;
        return one(tx, ctx.tenantId, id);
      });
      return c.json(app, 200);
    },
  );
