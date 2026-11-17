// Historial de actividad de una ficha (db/README.md, "Historial de actividad"). Solo lectura: lo escriben triggers.
// Se ve con la visibilidad de la entidad (RLS): la facturación, solo con clients.billing.manage.

import { createRoute, z } from '@hono/zod-openapi';
import { withTenant } from '../lib/context.js';
import { PaginationQuery, Timestamp, bearerSecurity, createRouter, errorResponses, jsonContent, paginated } from '../lib/openapi.js';

export const ActivityEntityType = z
  .enum(['client', 'client_center', 'client_contact', 'client_billing', 'document', 'quote', 'quote_version', 'quote_position', 'request'])
  .openapi({ description: 'Tipo de entidad' });

const ActivitySchema = z
  .object({
    id: z.string().openapi({ description: 'Identificador (entero grande, como texto)', example: '1234' }),
    entityType: ActivityEntityType,
    entityId: z.guid(),
    parentType: ActivityEntityType.nullable().openapi({ description: 'Ficha a la que pertenece (el cliente de un centro)' }),
    parentId: z.guid().nullable(),
    action: z.enum(['create', 'update', 'delete', 'restore']).openapi({ description: 'delete: eliminación (lógica o definitiva)' }),
    actorUserId: z.guid().nullable(),
    actorName: z.string().nullable().openapi({ description: 'Nombre de quien lo hizo, si se puede ver' }),
    occurredAt: Timestamp,
    summary: z.string().openapi({ example: 'Alta de centro de trabajo «Almacén»' }),
    changes: z
      .record(z.string(), z.object({ old: z.unknown().optional(), new: z.unknown().optional(), masked: z.boolean().optional() }))
      .openapi({
        description:
          'Solo en `update`: campo (camelCase) → `{ old, new }`, o `{ masked: true }` para datos sensibles (IBAN, NIF...).',
        example: { tradeName: { old: null, new: 'Ficticio' }, iban: { masked: true } },
      }),
  })
  .openapi('Activity');

const ActivityQuery = PaginationQuery.extend({
  entityType: ActivityEntityType,
  entityId: z.guid(),
  includeChildren: z
    .stringbool()
    .default(true)
    .openapi({ description: 'Incluye lo que cuelga de la ficha (centros, contactos, documentos...). Por defecto, sí.' }),
});

const camel = (key: string) => key.replace(/_([a-z0-9])/g, (_, ch: string) => ch.toUpperCase());

export const activity = createRouter().openapi(
  createRoute({
    method: 'get',
    path: '/activity',
    tags: ['Historial'],
    summary: 'Historial de actividad de una ficha',
    description: 'Más reciente primero. Cualquier miembro que pueda ver la entidad.',
    security: bearerSecurity,
    request: { query: ActivityQuery },
    responses: { 200: jsonContent(paginated(ActivitySchema), 'Historial'), ...errorResponses(400, 401, 403) },
  }),
  async (c) => {
    const q = c.req.valid('query');
    const page = await withTenant(c, {}, async (tx, ctx) => {
      const match = q.includeChildren
        ? tx`((a.entity_type = ${q.entityType} and a.entity_id = ${q.entityId})
              or (a.parent_type = ${q.entityType} and a.parent_id = ${q.entityId}))`
        : tx`a.entity_type = ${q.entityType} and a.entity_id = ${q.entityId}`;
      const where = tx`a.tenant_id = ${ctx.tenantId} and ${match}`;
      const rows = await tx<(z.infer<typeof ActivitySchema> & { changes: Record<string, unknown> })[]>`
        select a.id::text as id, a.entity_type, a.entity_id, a.parent_type, a.parent_id, a.action, a.actor_user_id,
               p.full_name as actor_name, a.occurred_at, a.summary, a.changes
        from public.activity_log a
        left join public.profiles p on p.id = a.actor_user_id
        where ${where}
        order by a.occurred_at desc, a.id desc
        limit ${q.limit} offset ${q.offset}
      `;
      const [count] = await tx<{ total: number }[]>`select count(*)::int as total from public.activity_log a where ${where}`;
      const data = rows.map((row) => ({
        ...row,
        changes: Object.fromEntries(Object.entries(row.changes ?? {}).map(([key, value]) => [camel(key), value])),
      }));
      return { data, pagination: { limit: q.limit, offset: q.offset, total: count?.total ?? 0 } };
    });
    return c.json(page as never, 200);
  },
);
