// Sucursales de la ETT activa. Leer: cualquier miembro. Crear y editar: branches.manage.
// Cada sociedad tiene como mucho una sucursal por defecto: al marcar otra, la anterior deja de serlo.

import { createRoute, z } from '@hono/zod-openapi';
import { withTenant } from '../lib/context.js';
import { type Tx, likePattern, pickDefined } from '../lib/db.js';
import { ApiError, notFound } from '../lib/errors.js';
import {
  IdParams,
  PaginationQuery,
  Status,
  Timestamp,
  bearerSecurity,
  createRouter,
  errorResponses,
  jsonBody,
  jsonContent,
  nullableText,
  paginated,
} from '../lib/openapi.js';

export const BranchSchema = z
  .object({
    id: z.uuid(),
    companyId: z.uuid(),
    code: z.string(),
    name: z.string(),
    status: Status,
    isDefault: z.boolean(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    addressId: z.uuid().nullable(),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .openapi('Branch');
type Branch = z.infer<typeof BranchSchema>;

// Sin valores por defecto aquí (ver companies.ts): se añaden solo al crear.
const branchFields = {
  code: z.string().trim().min(1).max(30),
  name: z.string().trim().min(1).max(160),
  status: Status,
  isDefault: z.boolean(),
  phone: nullableText(40).optional(),
  email: z.email().max(200).nullable().optional(),
  addressId: z.uuid().nullable().optional(),
};

const BranchCreateSchema = z
  .strictObject({
    companyId: z.uuid(),
    ...branchFields,
    status: Status.default('active'),
    isDefault: z.boolean().default(false),
  })
  .openapi('BranchCreate');

// La sociedad de una sucursal no se cambia.
const BranchUpdateSchema = z.strictObject(branchFields).partial().openapi('BranchUpdate');

const ListQuery = PaginationQuery.extend({
  companyId: z.uuid().optional(),
  status: Status.optional(),
  q: z.string().trim().min(1).max(100).optional().openapi({ description: 'Busca en código y nombre' }),
});

const columns = 'id, company_id, code, name, status, is_default, phone, email, address_id, created_at, updated_at';
const writableColumns = ['code', 'name', 'status', 'isDefault', 'phone', 'email', 'addressId'] as const;

const tags = ['Sucursales'];

/** Quita la marca de "por defecto" al resto de sucursales de la sociedad. */
async function clearDefault(tx: Tx, tenantId: string, companyId: string, exceptId?: string) {
  await tx`
    update public.branches set is_default = false
    where tenant_id = ${tenantId} and company_id = ${companyId} and is_default and deleted_at is null
      ${exceptId ? tx`and id <> ${exceptId}` : tx``}
  `;
}

export const branches = createRouter()
  .openapi(
    createRoute({
      method: 'get',
      path: '/branches',
      tags,
      summary: 'Lista las sucursales de la ETT activa',
      security: bearerSecurity,
      request: { query: ListQuery },
      responses: { 200: jsonContent(paginated(BranchSchema), 'Sucursales'), ...errorResponses(400, 401, 403) },
    }),
    async (c) => {
      const { limit, offset, companyId, status, q } = c.req.valid('query');
      const page = await withTenant(c, {}, async (tx, ctx) => {
        const where = tx`
          tenant_id = ${ctx.tenantId} and deleted_at is null
          ${companyId ? tx`and company_id = ${companyId}` : tx``}
          ${status ? tx`and status = ${status}` : tx``}
          ${q ? tx`and (code ilike ${likePattern(q)} or name ilike ${likePattern(q)})` : tx``}
        `;
        const data = await tx<Branch[]>`
          select ${tx.unsafe(columns)} from public.branches where ${where}
          order by name, code limit ${limit} offset ${offset}
        `;
        const [count] = await tx<{ total: number }[]>`select count(*)::int as total from public.branches where ${where}`;
        return { data: [...data], pagination: { limit, offset, total: count?.total ?? 0 } };
      });
      return c.json(page, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/branches/{id}',
      tags,
      summary: 'Ver una sucursal',
      security: bearerSecurity,
      request: { params: IdParams },
      responses: { 200: jsonContent(BranchSchema, 'Sucursal'), ...errorResponses(400, 401, 403, 404) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const branch = await withTenant(c, {}, async (tx, ctx) => {
        const [row] = await tx<Branch[]>`
          select ${tx.unsafe(columns)} from public.branches
          where tenant_id = ${ctx.tenantId} and id = ${id} and deleted_at is null
        `;
        if (!row) throw notFound('La sucursal no existe');
        return row;
      });
      return c.json(branch, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/branches',
      tags,
      summary: 'Crear una sucursal',
      description: 'Requiere `branches.manage`. La sociedad tiene que ser de la ETT activa.',
      security: bearerSecurity,
      request: { body: jsonBody(BranchCreateSchema) },
      responses: { 201: jsonContent(BranchSchema, 'Sucursal creada'), ...errorResponses(400, 401, 403, 409, 422) },
    }),
    async (c) => {
      const body = c.req.valid('json');
      const branch = await withTenant(c, { permission: 'branches.manage' }, async (tx, ctx) => {
        const [company] = await tx`
          select 1 from public.companies where tenant_id = ${ctx.tenantId} and id = ${body.companyId} and deleted_at is null
        `;
        if (!company) throw new ApiError(422, 'referencia_invalida', 'La sociedad no existe');
        if (body.isDefault) await clearDefault(tx, ctx.tenantId, body.companyId);

        const values = { ...pickDefined(body, writableColumns), tenantId: ctx.tenantId, companyId: body.companyId };
        const [row] = await tx<Branch[]>`insert into public.branches ${tx(values)} returning ${tx.unsafe(columns)}`;
        return row!;
      });
      return c.json(branch, 201);
    },
  )
  .openapi(
    createRoute({
      method: 'patch',
      path: '/branches/{id}',
      tags,
      summary: 'Editar una sucursal',
      description: 'Solo cambia los campos enviados. Requiere `branches.manage`.',
      security: bearerSecurity,
      request: { params: IdParams, body: jsonBody(BranchUpdateSchema) },
      responses: { 200: jsonContent(BranchSchema, 'Sucursal actualizada'), ...errorResponses(400, 401, 403, 404, 409, 422) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const patch = pickDefined(c.req.valid('json'), writableColumns);
      if (Object.keys(patch).length === 0) throw new ApiError(400, 'validacion', 'No hay ningún campo que cambiar');
      const branch = await withTenant(c, { permission: 'branches.manage' }, async (tx, ctx) => {
        const [current] = await tx<{ companyId: string }[]>`
          select company_id from public.branches
          where tenant_id = ${ctx.tenantId} and id = ${id} and deleted_at is null
          for update
        `;
        if (!current) throw notFound('La sucursal no existe');
        if (patch.isDefault === true) await clearDefault(tx, ctx.tenantId, current.companyId, id);

        const [row] = await tx<Branch[]>`
          update public.branches set ${tx(patch)}
          where tenant_id = ${ctx.tenantId} and id = ${id} and deleted_at is null
          returning ${tx.unsafe(columns)}
        `;
        if (!row) throw notFound('La sucursal no existe');
        return row;
      });
      return c.json(branch, 200);
    },
  );
