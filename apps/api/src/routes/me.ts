// El usuario de la sesión: perfil, ETT activa, rol, permisos y sucursales; y cambio de ETT activa.

import { createRoute, z } from '@hono/zod-openapi';
import { resolveTenant, withUser } from '../lib/context.js';
import { ApiError } from '../lib/errors.js';
import { bearerSecurity, createRouter, errorResponses, jsonBody, jsonContent } from '../lib/openapi.js';
import { RoleScope } from './roles.js';

const TenantSummarySchema = z
  .object({
    id: z.uuid(),
    code: z.string(),
    legalName: z.string(),
    tradeName: z.string().nullable(),
  })
  .openapi('TenantSummary');
type TenantSummary = z.infer<typeof TenantSummarySchema>;

const MeSchema = z
  .object({
    user: z.object({
      id: z.uuid(),
      email: z.string().nullable(),
      fullName: z.string(),
      phone: z.string().nullable(),
      status: z.enum(['active', 'blocked', 'inactive']),
      mustChangePassword: z.boolean(),
    }),
    isSuperadmin: z.boolean(),
    activeTenant: TenantSummarySchema.nullable().openapi({
      description: 'ETT de la sesión (la del token). null si no tiene ninguna o ya no tiene acceso a ella.',
    }),
    role: z
      .object({ id: z.uuid(), code: z.string(), name: z.string(), scope: RoleScope })
      .nullable()
      .openapi({ description: 'Rol en la ETT activa. null para el superadmin sin membresía en ella.' }),
    permissions: z.array(z.string()).openapi({ description: 'Permisos finos en la ETT activa' }),
    branches: z
      .array(z.object({ id: z.uuid(), companyId: z.uuid(), code: z.string(), name: z.string() }))
      .openapi({ description: 'Sucursales de la ETT activa con las que puede trabajar' }),
    tenants: z.array(TenantSummarySchema).openapi({ description: 'ETT a las que puede cambiar' }),
  })
  .openapi('Me');

const ActiveTenantBody = z.strictObject({ tenantId: z.uuid() }).openapi('ActiveTenantChange');
const ActiveTenantResponse = z
  .object({
    activeTenantId: z.uuid(),
    refreshRequired: z.literal(true).openapi({
      description: 'El token sigue con la ETT anterior hasta que el cliente refresque la sesión (supabase.auth.refreshSession()).',
    }),
  })
  .openapi('ActiveTenantChanged');

const tags = ['Sesión'];

export const me = createRouter()
  .openapi(
    createRoute({
      method: 'get',
      path: '/me',
      tags,
      summary: 'Usuario de la sesión, ETT activa, rol, permisos y sucursales',
      security: bearerSecurity,
      responses: { 200: jsonContent(MeSchema, 'Usuario de la sesión'), ...errorResponses(401) },
    }),
    async (c) => {
      const result = await withUser(c, async (tx, user) => {
        const [profile] = await tx<
          { fullName: string; phone: string | null; status: 'active' | 'blocked' | 'inactive'; mustChangePassword: boolean }[]
        >`
          select full_name, phone, status, must_change_password
          from public.profiles where id = auth.uid() and deleted_at is null
        `;
        // El token es válido pero el usuario ya no existe en la base de datos.
        if (!profile) throw new ApiError(401, 'no_autenticado', 'El usuario de la sesión ya no existe');

        const access = await resolveTenant(tx, user.claims);
        const tenantId = profile.status === 'active' ? access.tenantId : null;

        const tenants = await tx<TenantSummary[]>`
          select t.id, t.code, t.legal_name, t.trade_name
          from public.tenants t
          where t.status = 'active' and t.deleted_at is null
            and (${access.isSuperadmin} or exists (
              select 1 from public.memberships m
              where m.tenant_id = t.id and m.user_id = auth.uid() and m.status = 'active' and m.deleted_at is null
            ))
          order by t.legal_name
        `;

        let activeTenant: TenantSummary | null = null;
        let role: { id: string; code: string; name: string; scope: z.infer<typeof RoleScope> } | null = null;
        let permissions: string[] = [];
        let branches: { id: string; companyId: string; code: string; name: string }[] = [];

        if (tenantId) {
          [activeTenant = null] = await tx<TenantSummary[]>`
            select id, code, legal_name, trade_name from public.tenants where id = ${tenantId}
          `;
          const [membership] = await tx<{ id: string; code: string; name: string; scope: 'tenant' | 'branches' | 'branch'; permissions: string[] }[]>`
            select r.id, r.code, r.name, r.scope,
                   coalesce(array_agg(rp.permission_code order by rp.permission_code)
                            filter (where rp.permission_code is not null), '{}') as permissions
            from public.memberships m
            join public.roles r on r.tenant_id = m.tenant_id and r.id = m.role_id and r.deleted_at is null
            left join public.role_permissions rp on rp.tenant_id = m.tenant_id and rp.role_id = m.role_id
            where m.user_id = auth.uid() and m.tenant_id = ${tenantId} and m.status = 'active' and m.deleted_at is null
            group by r.id
          `;
          if (membership) {
            const { permissions: rolePermissions, ...roleData } = membership;
            role = roleData;
            permissions = rolePermissions;
          }
          if (access.isSuperadmin) {
            permissions = (await tx<{ code: string }[]>`select code from public.permissions order by code`).map((p) => p.code);
          }
          branches = [
            ...(await tx<{ id: string; companyId: string; code: string; name: string }[]>`
              select b.id, b.company_id, b.code, b.name
              from public.branches b
              where b.tenant_id = ${tenantId} and b.deleted_at is null and b.status = 'active'
                and private.can_access_branch(b.id)
              order by b.name
            `),
          ];
        }

        return {
          user: { id: user.userId, email: typeof user.claims.email === 'string' ? user.claims.email : null, ...profile },
          isSuperadmin: access.isSuperadmin,
          activeTenant,
          role,
          permissions,
          branches,
          tenants: [...tenants],
        };
      });
      return c.json(result, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/me/active-tenant',
      tags,
      summary: 'Cambiar de ETT activa',
      description:
        'Guarda la ETT en el perfil (`profiles.active_tenant_id`). El token no cambia: el cliente debe refrescar ' +
        'la sesión para que el nuevo token lleve la ETT, y hasta entonces la API sigue usando la anterior.',
      security: bearerSecurity,
      request: { body: jsonBody(ActiveTenantBody) },
      responses: { 200: jsonContent(ActiveTenantResponse, 'ETT activa cambiada'), ...errorResponses(400, 401, 403) },
    }),
    async (c) => {
      const { tenantId } = c.req.valid('json');
      await withUser(c, async (tx) => {
        const [allowed] = await tx<{ ok: boolean }[]>`
          select (private.is_superadmin() or exists (
                   select 1 from public.memberships m
                   where m.tenant_id = t.id and m.user_id = auth.uid() and m.status = 'active' and m.deleted_at is null
                 )) and (select p.status = 'active' from public.profiles p where p.id = auth.uid()) as ok
          from public.tenants t
          where t.id = ${tenantId} and t.status = 'active' and t.deleted_at is null
        `;
        // Misma respuesta si la ETT no existe o no es suya: no se revela qué ETT existen.
        if (!allowed?.ok) throw new ApiError(403, 'sin_permiso', 'No perteneces a esa ETT o no está activa');
        await tx`update public.profiles set active_tenant_id = ${tenantId} where id = auth.uid()`;
      });
      return c.json({ activeTenantId: tenantId, refreshRequired: true as const }, 200);
    },
  );
