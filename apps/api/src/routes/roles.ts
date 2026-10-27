// Roles de la ETT activa y catálogo de permisos, en solo lectura (cualquier miembro).
// La edición de roles (roles.manage) llegará con la pantalla de administración.

import { createRoute, z } from '@hono/zod-openapi';
import { withTenant } from '../lib/context.js';
import { notFound } from '../lib/errors.js';
import { IdParams, Timestamp, bearerSecurity, createRouter, errorResponses, jsonContent, listOf } from '../lib/openapi.js';

export const RoleScope = z.enum(['tenant', 'branches', 'branch']).openapi({
  description: '`tenant`: toda la ETT. `branches`: sus sucursales. `branch`: una sucursal activa.',
});

export const RoleSchema = z
  .object({
    id: z.uuid(),
    code: z.string().openapi({ example: 'admin' }),
    name: z.string().openapi({ example: 'Administrador' }),
    description: z.string().nullable(),
    scope: RoleScope,
    isSystem: z.boolean().openapi({ description: 'Rol de serie: se puede editar, no borrar' }),
    permissions: z.array(z.string()).openapi({ example: ['companies.manage', 'module.laboral'] }),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .openapi('Role');
type Role = z.infer<typeof RoleSchema>;

export const PermissionSchema = z
  .object({
    code: z.string().openapi({ example: 'companies.manage' }),
    module: z.string().openapi({ example: 'administracion' }),
    description: z.string(),
  })
  .openapi('Permission');
type Permission = z.infer<typeof PermissionSchema>;

const tags = ['Roles y permisos'];

export const roles = createRouter()
  .openapi(
    createRoute({
      method: 'get',
      path: '/roles',
      tags,
      summary: 'Lista los roles de la ETT activa con sus permisos',
      security: bearerSecurity,
      responses: { 200: jsonContent(listOf(RoleSchema), 'Roles'), ...errorResponses(401, 403) },
    }),
    async (c) => {
      const data = await withTenant(c, {}, (tx, ctx) => tx<Role[]>`
        select r.id, r.code, r.name, r.description, r.scope, r.is_system, r.created_at, r.updated_at,
               coalesce(array_agg(rp.permission_code order by rp.permission_code)
                        filter (where rp.permission_code is not null), '{}') as permissions
        from public.roles r
        left join public.role_permissions rp on rp.tenant_id = r.tenant_id and rp.role_id = r.id
        where r.tenant_id = ${ctx.tenantId} and r.deleted_at is null
        group by r.id
        order by r.is_system desc, r.name
      `);
      return c.json({ data: [...data] }, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/roles/{id}',
      tags,
      summary: 'Ver un rol',
      security: bearerSecurity,
      request: { params: IdParams },
      responses: { 200: jsonContent(RoleSchema, 'Rol'), ...errorResponses(400, 401, 403, 404) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const role = await withTenant(c, {}, async (tx, ctx) => {
        const [row] = await tx<Role[]>`
          select r.id, r.code, r.name, r.description, r.scope, r.is_system, r.created_at, r.updated_at,
                 coalesce(array_agg(rp.permission_code order by rp.permission_code)
                          filter (where rp.permission_code is not null), '{}') as permissions
          from public.roles r
          left join public.role_permissions rp on rp.tenant_id = r.tenant_id and rp.role_id = r.id
          where r.tenant_id = ${ctx.tenantId} and r.id = ${id} and r.deleted_at is null
          group by r.id
        `;
        if (!row) throw notFound('El rol no existe');
        return row;
      });
      return c.json(role, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/permissions',
      tags,
      summary: 'Catálogo de permisos finos',
      description: 'Global (lo define el código). Sirve para mostrar y editar los permisos de los roles.',
      security: bearerSecurity,
      responses: { 200: jsonContent(listOf(PermissionSchema), 'Permisos'), ...errorResponses(401, 403) },
    }),
    async (c) => {
      const data = await withTenant(c, {}, (tx) => tx<Permission[]>`
        select code, module, description from public.permissions order by module, code
      `);
      return c.json({ data: [...data] }, 200);
    },
  );
