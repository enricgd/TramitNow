// Membresías (usuarios) de la ETT activa con su rol y su alcance, en solo lectura. Requiere users.manage.
// El alta e invitación de usuarios necesita la service_role de Supabase Auth y llegará más adelante.
// El email está en auth.users, que el rol de la API no lee: también llegará con esa fase.

import { createRoute, z } from '@hono/zod-openapi';
import { withTenant } from '../lib/context.js';
import type { Tx } from '../lib/db.js';
import { notFound } from '../lib/errors.js';
import {
  IdParams,
  PaginationQuery,
  Timestamp,
  bearerSecurity,
  createRouter,
  errorResponses,
  jsonContent,
  paginated,
} from '../lib/openapi.js';

const MembershipStatus = z.enum(['active', 'blocked', 'inactive']);

const UserContextSchema = z
  .object({
    companyId: z.uuid(),
    branchId: z.uuid().nullable().openapi({ description: 'null: toda la sociedad' }),
    isDefault: z.boolean(),
  })
  .openapi('UserContext');

export const MembershipSchema = z
  .object({
    id: z.uuid(),
    userId: z.uuid(),
    fullName: z.string(),
    status: MembershipStatus,
    role: z.object({ id: z.uuid(), code: z.string(), name: z.string(), scope: z.string() }),
    contexts: z.array(UserContextSchema),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .openapi('Membership');
type Membership = z.infer<typeof MembershipSchema>;

const ListQuery = PaginationQuery.extend({
  status: MembershipStatus.optional(),
  roleId: z.uuid().optional(),
});

const tags = ['Usuarios'];

function selectMemberships(tx: Tx, tenantId: string, filter: ReturnType<Tx>) {
  return tx<Membership[]>`
    select m.id, m.user_id, coalesce(p.full_name, '') as full_name, m.status, m.created_at, m.updated_at,
           json_build_object('id', r.id, 'code', r.code, 'name', r.name, 'scope', r.scope) as role,
           coalesce((
             select json_agg(json_build_object('companyId', uc.company_id, 'branchId', uc.branch_id, 'isDefault', uc.is_default)
                             order by uc.is_default desc, uc.created_at)
             from public.user_contexts uc
             where uc.tenant_id = m.tenant_id and uc.membership_id = m.id and uc.deleted_at is null
           ), '[]') as contexts
    from public.memberships m
    join public.roles r on r.tenant_id = m.tenant_id and r.id = m.role_id
    left join public.profiles p on p.id = m.user_id
    where m.tenant_id = ${tenantId} and m.deleted_at is null ${filter}
  `;
}

export const memberships = createRouter()
  .openapi(
    createRoute({
      method: 'get',
      path: '/memberships',
      tags,
      summary: 'Lista los usuarios de la ETT activa',
      description: 'Requiere `users.manage`.',
      security: bearerSecurity,
      request: { query: ListQuery },
      responses: { 200: jsonContent(paginated(MembershipSchema), 'Membresías'), ...errorResponses(400, 401, 403) },
    }),
    async (c) => {
      const { limit, offset, status, roleId } = c.req.valid('query');
      const page = await withTenant(c, { permission: 'users.manage' }, async (tx, ctx) => {
        const filter = tx`
          ${status ? tx`and m.status = ${status}` : tx``}
          ${roleId ? tx`and m.role_id = ${roleId}` : tx``}
        `;
        const data = await selectMemberships(
          tx,
          ctx.tenantId,
          tx`${filter} order by full_name, m.created_at limit ${limit} offset ${offset}`,
        );
        const [count] = await tx<{ total: number }[]>`
          select count(*)::int as total from public.memberships m
          where m.tenant_id = ${ctx.tenantId} and m.deleted_at is null ${filter}
        `;
        return { data: [...data], pagination: { limit, offset, total: count?.total ?? 0 } };
      });
      return c.json(page, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/memberships/{id}',
      tags,
      summary: 'Ver un usuario de la ETT activa',
      description: 'Requiere `users.manage`.',
      security: bearerSecurity,
      request: { params: IdParams },
      responses: { 200: jsonContent(MembershipSchema, 'Membresía'), ...errorResponses(400, 401, 403, 404) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const membership = await withTenant(c, { permission: 'users.manage' }, async (tx, ctx) => {
        const [row] = await selectMemberships(tx, ctx.tenantId, tx`and m.id = ${id}`);
        if (!row) throw notFound('El usuario no existe en esta ETT');
        return row;
      });
      return c.json(membership, 200);
    },
  );
