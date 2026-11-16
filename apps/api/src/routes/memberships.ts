// Usuarios de la ETT activa: membresías con su rol y su alcance (sociedades y sucursales). Requiere users.manage.
//
// Alta e invitación: la API crea el usuario en Supabase Auth con la service_role (lib/auth-admin.ts) y su membresía.
// Aún no hay correo saliente: la respuesta trae el enlace de invitación para que el administrador lo envíe a mano.
// El email, el último acceso y si la invitación está pendiente salen de auth.users con private.membership_auth_info().

import { createRoute, z } from '@hono/zod-openapi';
import { requireAuthAdmin } from '../lib/auth-admin.js';
import { withTenant } from '../lib/context.js';
import type { Tx } from '../lib/db.js';
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

const PERMISSION = 'users.manage';

const MembershipStatus = z.enum(['active', 'blocked', 'inactive']);

const UserContextSchema = z
  .object({
    companyId: z.guid(),
    branchId: z.guid().nullable().openapi({ description: 'null: toda la sociedad' }),
    isDefault: z.boolean(),
  })
  .openapi('UserContext');

export const MembershipSchema = z
  .object({
    id: z.guid(),
    userId: z.guid(),
    fullName: z.string(),
    email: z.string().nullable(),
    lastSignInAt: Timestamp.nullable().openapi({ description: 'Último acceso; null si nunca ha entrado' }),
    department: z.string().nullable(),
    invitationPending: z.boolean().openapi({ description: 'Invitado y aún sin aceptar (nunca ha entrado)' }),
    invitedAt: Timestamp.nullable(),
    invitedBy: z.guid().nullable(),
    status: MembershipStatus,
    role: z.object({ id: z.guid(), code: z.string(), name: z.string(), scope: z.string() }),
    contexts: z.array(UserContextSchema),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .openapi('Membership');
type Membership = z.infer<typeof MembershipSchema>;

const ListQuery = PaginationQuery.extend({
  status: MembershipStatus.optional(),
  roleId: z.guid().optional(),
});

const tags = ['Usuarios'];

function selectMemberships(tx: Tx, tenantId: string, filter: ReturnType<Tx>) {
  return tx<Membership[]>`
    select m.id, m.user_id, coalesce(p.full_name, '') as full_name, ai.email, ai.last_sign_in_at, m.department,
           coalesce(ai.invitation_pending, false) as invitation_pending, m.invited_at, m.invited_by,
           m.status, m.created_at, m.updated_at,
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
    left join private.membership_auth_info(${tenantId}) ai on ai.membership_id = m.id
    where m.tenant_id = ${tenantId} and m.deleted_at is null ${filter}
  `;
}

const ContextInput = z.strictObject({
  companyId: z.guid(),
  branchId: z.guid().nullable().optional().openapi({ description: 'null u omitido: toda la sociedad' }),
  isDefault: z.boolean().optional(),
});
const contextsField = z
  .array(ContextInput)
  .max(50)
  .openapi({ description: 'Alcance: sociedades y sucursales. Sustituye el que hubiera. El primero es el de por defecto si ninguno lo indica' });

const MembershipCreate = z
  .strictObject({
    email: z.email().max(200).transform((v) => v.trim().toLowerCase()),
    fullName: z.string().trim().min(1).max(160),
    roleId: z.guid(),
    department: z.string().trim().max(80).nullable().optional(),
    contexts: contextsField.default([]),
  })
  .openapi('MembershipCreate');
const MembershipUpdate = z
  .strictObject({
    roleId: z.guid(),
    status: MembershipStatus,
    department: z.string().trim().max(80).nullable(),
    contexts: contextsField,
  })
  .partial()
  .openapi('MembershipUpdate');
const MembershipCreated = z
  .object({
    membership: MembershipSchema,
    inviteUrl: z.string().nullable().openapi({
      description: 'Enlace de invitación para enviarlo a mano. null si ya tenía cuenta (p. ej. en otra ETT) o si lo ha enviado Auth',
    }),
    existingUser: z.boolean().openapi({ description: 'Ya tenía cuenta en TramitNOW: entra con su contraseña de siempre' }),
  })
  .openapi('MembershipCreated');
const InvitationLink = z.object({ inviteUrl: z.string().nullable() }).openapi('InvitationLink');

async function findMembership(tx: Tx, tenantId: string, id: string): Promise<Membership> {
  const [row] = await selectMemberships(tx, tenantId, tx`and m.id = ${id}`);
  if (!row) throw notFound('El usuario no existe en esta ETT');
  return row;
}

async function requireRole(tx: Tx, tenantId: string, roleId: string) {
  const [role] = await tx`select id from public.roles where tenant_id = ${tenantId} and id = ${roleId} and deleted_at is null`;
  if (!role) throw new ApiError(422, 'referencia_invalida', 'El rol no existe en esta ETT');
}

async function replaceContexts(tx: Tx, tenantId: string, membershipId: string, contexts: z.infer<typeof ContextInput>[]) {
  await tx`delete from public.user_contexts where tenant_id = ${tenantId} and membership_id = ${membershipId}`;
  if (!contexts.length) return;
  const anyDefault = contexts.some((ctx) => ctx.isDefault);
  const rows = contexts.map((ctx, i) => ({
    tenantId,
    membershipId,
    companyId: ctx.companyId,
    branchId: ctx.branchId ?? null,
    isDefault: anyDefault ? Boolean(ctx.isDefault) : i === 0,
  }));
  if (rows.filter((r) => r.isDefault).length > 1) {
    throw new ApiError(400, 'validacion', 'Solo un alcance puede ser el de por defecto');
  }
  await tx`insert into public.user_contexts ${tx(rows)}`;
}

export const memberships = createRouter()
  .openapi(
    createRoute({
      method: 'get',
      path: '/memberships',
      tags,
      summary: 'Lista los usuarios de la ETT activa',
      description: `Requiere \`${PERMISSION}\`.`,
      security: bearerSecurity,
      request: { query: ListQuery },
      responses: { 200: jsonContent(paginated(MembershipSchema), 'Membresías'), ...errorResponses(400, 401, 403) },
    }),
    async (c) => {
      const { limit, offset, status, roleId } = c.req.valid('query');
      const page = await withTenant(c, { permission: PERMISSION }, async (tx, ctx) => {
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
      description: `Requiere \`${PERMISSION}\`.`,
      security: bearerSecurity,
      request: { params: IdParams },
      responses: { 200: jsonContent(MembershipSchema, 'Membresía'), ...errorResponses(400, 401, 403, 404) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const membership = await withTenant(c, { permission: PERMISSION }, async (tx, ctx) => {
        const [row] = await selectMemberships(tx, ctx.tenantId, tx`and m.id = ${id}`);
        if (!row) throw notFound('El usuario no existe en esta ETT');
        return row;
      });
      return c.json(membership, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/memberships',
      tags,
      summary: 'Dar de alta e invitar a un usuario',
      description:
        `Crea la cuenta en Supabase Auth (si no la tenía) y su pertenencia a la ETT activa con rol y alcance. Devuelve el enlace de invitación para enviarlo a mano mientras no haya correo saliente. Requiere \`${PERMISSION}\`. 409 si ya es de esta ETT; 503 si Auth no está configurado.`,
      security: bearerSecurity,
      request: { body: jsonBody(MembershipCreate) },
      responses: { 201: jsonContent(MembershipCreated, 'Usuario invitado'), ...errorResponses(400, 401, 403, 409, 422, 503) },
    }),
    async (c) => {
      const body = c.req.valid('json');
      const authAdmin = requireAuthAdmin(c.get('authAdmin'));

      const existing = await withTenant(c, { permission: PERMISSION }, async (tx, ctx) => {
        await requireRole(tx, ctx.tenantId, body.roleId);
        const [user] = await tx<{ userId: string; confirmed: boolean }[]>`
          select user_id, confirmed from private.find_auth_user(${ctx.tenantId}, ${body.email})
        `;
        if (user) {
          const [member] = await tx`select id from public.memberships where tenant_id = ${ctx.tenantId} and user_id = ${user.userId}`;
          if (member) throw new ApiError(409, 'conflicto', 'Ese usuario ya está en esta ETT');
        }
        return user ?? null;
      });

      // Quien ya tiene cuenta activa entra con su contraseña; si nunca entró, se le vuelve a invitar.
      let userId: string;
      let inviteUrl: string | null = null;
      if (existing?.confirmed) {
        userId = existing.userId;
      } else {
        ({ userId, url: inviteUrl } = await authAdmin.invite(body.email, body.fullName));
      }

      try {
        const membership = await withTenant(c, { permission: PERMISSION }, async (tx, ctx) => {
          const [created] = await tx<{ id: string }[]>`
            insert into public.memberships ${tx({
              tenantId: ctx.tenantId,
              userId,
              roleId: body.roleId,
              department: body.department ?? null,
              invitedAt: new Date().toISOString(),
              invitedBy: ctx.userId,
            })}
            returning id
          `;
          await replaceContexts(tx, ctx.tenantId, created!.id, body.contexts);
          return findMembership(tx, ctx.tenantId, created!.id);
        });
        return c.json({ membership, inviteUrl, existingUser: Boolean(existing?.confirmed) }, 201);
      } catch (err) {
        // La cuenta recién creada no se queda huérfana.
        if (!existing) await authAdmin.deleteUser(userId).catch((e) => console.error('No se pudo deshacer el alta en Auth', e));
        throw err;
      }
    },
  )
  .openapi(
    createRoute({
      method: 'patch',
      path: '/memberships/{id}',
      tags,
      summary: 'Cambiar rol, estado, departamento o alcance de un usuario',
      description: `\`contexts\` sustituye todo el alcance. Nadie cambia su propio rol ni se bloquea a sí mismo (409). Requiere \`${PERMISSION}\`.`,
      security: bearerSecurity,
      request: { params: IdParams, body: jsonBody(MembershipUpdate) },
      responses: { 200: jsonContent(MembershipSchema, 'Usuario'), ...errorResponses(400, 401, 403, 404, 409, 422) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const { contexts, ...patch } = c.req.valid('json');
      const membership = await withTenant(c, { permission: PERMISSION }, async (tx, ctx) => {
        const current = await findMembership(tx, ctx.tenantId, id);
        if (current.userId === ctx.userId &&
            ((patch.roleId && patch.roleId !== current.role.id) || (patch.status && patch.status !== 'active'))) {
          throw new ApiError(409, 'conflicto', 'No puedes cambiar tu propio rol ni bloquearte: pídeselo a otro administrador');
        }
        if (patch.roleId) await requireRole(tx, ctx.tenantId, patch.roleId);
        if (Object.keys(patch).length) {
          await tx`update public.memberships set ${tx(patch)} where tenant_id = ${ctx.tenantId} and id = ${id}`;
        }
        if (contexts) await replaceContexts(tx, ctx.tenantId, id, contexts);
        return findMembership(tx, ctx.tenantId, id);
      });
      return c.json(membership, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/memberships/{id}/resend-invitation',
      tags,
      summary: 'Volver a generar la invitación',
      description: `Nuevo enlace para quien aún no la ha aceptado (409 si ya entró). Requiere \`${PERMISSION}\`.`,
      security: bearerSecurity,
      request: { params: IdParams },
      responses: { 200: jsonContent(InvitationLink, 'Invitación'), ...errorResponses(400, 401, 403, 404, 409, 503) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const authAdmin = requireAuthAdmin(c.get('authAdmin'));
      const membership = await withTenant(c, { permission: PERMISSION }, async (tx, ctx) => {
        const row = await findMembership(tx, ctx.tenantId, id);
        if (!row.invitationPending || !row.email) throw new ApiError(409, 'conflicto', 'Este usuario ya aceptó la invitación');
        return row;
      });
      const { url } = await authAdmin.invite(membership.email!, membership.fullName);
      await withTenant(c, { permission: PERMISSION }, (tx, ctx) =>
        tx`update public.memberships set invited_at = now(), invited_by = ${ctx.userId} where tenant_id = ${ctx.tenantId} and id = ${id}`,
      );
      return c.json({ inviteUrl: url }, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'delete',
      path: '/memberships/{id}/invitation',
      tags,
      summary: 'Revocar una invitación',
      description: `Quita al usuario de la ETT y, si nunca entró y no está en otra ETT, borra también su cuenta. 409 si ya la aceptó (entonces se bloquea con PATCH). Requiere \`${PERMISSION}\`.`,
      security: bearerSecurity,
      request: { params: IdParams },
      responses: { 204: { description: 'Invitación revocada' }, ...errorResponses(400, 401, 403, 404, 409, 503) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const authAdmin = requireAuthAdmin(c.get('authAdmin'));
      const { userId, removable } = await withTenant(c, { permission: PERMISSION }, async (tx, ctx) => {
        const row = await findMembership(tx, ctx.tenantId, id);
        if (!row.invitationPending) throw new ApiError(409, 'conflicto', 'Este usuario ya aceptó la invitación: para quitarle el acceso, bloquéalo');
        const [check] = await tx<{ removable: boolean }[]>`
          select private.invited_user_removable(${ctx.tenantId}, ${row.userId}) as removable
        `;
        await tx`delete from public.memberships where tenant_id = ${ctx.tenantId} and id = ${id}`;
        return { userId: row.userId, removable: Boolean(check?.removable) };
      });
      if (removable) await authAdmin.deleteUser(userId);
      return c.body(null, 204);
    },
  );
