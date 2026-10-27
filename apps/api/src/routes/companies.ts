// Sociedades de la ETT activa. Leer: cualquier miembro. Crear y editar: companies.manage.

import { createRoute, z } from '@hono/zod-openapi';
import { withTenant } from '../lib/context.js';
import { likePattern, pickDefined } from '../lib/db.js';
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

const CompanyType = z.enum(['ett', 'services', 'merchandising', 'other']);

export const CompanySchema = z
  .object({
    id: z.uuid(),
    code: z.string(),
    name: z.string(),
    companyType: CompanyType,
    status: Status,
    taxIdTypeId: z.uuid().nullable(),
    taxId: z.string().nullable(),
    phone: z.string().nullable(),
    fax: z.string().nullable(),
    email: z.string().nullable(),
    website: z.string().nullable(),
    smsSenderName: z.string().nullable(),
    workerCommunicationsCcEmail: z.string().nullable(),
    addressId: z.uuid().nullable(),
    postalAddressId: z.uuid().nullable(),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .openapi('Company');
type Company = z.infer<typeof CompanySchema>;

// Sin valores por defecto: en zod 4 un .default() dentro de .partial() se aplicaría también al editar.
const companyFields = {
  code: z.string().trim().min(1).max(30),
  name: z.string().trim().min(1).max(200),
  companyType: CompanyType,
  status: Status,
  taxIdTypeId: z.uuid().nullable().optional(),
  taxId: nullableText(30).optional(),
  phone: nullableText(40).optional(),
  fax: nullableText(40).optional(),
  email: z.email().max(200).nullable().optional(),
  website: nullableText(250).optional(),
  smsSenderName: nullableText(120).optional(),
  workerCommunicationsCcEmail: z.email().max(200).nullable().optional(),
  addressId: z.uuid().nullable().optional(),
  postalAddressId: z.uuid().nullable().optional(),
};

const CompanyCreateSchema = z
  .strictObject({ ...companyFields, companyType: CompanyType.default('ett'), status: Status.default('active') })
  .openapi('CompanyCreate');

const CompanyUpdateSchema = z.strictObject(companyFields).partial().openapi('CompanyUpdate');

const ListQuery = PaginationQuery.extend({
  status: Status.optional(),
  q: z.string().trim().min(1).max(100).optional().openapi({ description: 'Busca en código, nombre y CIF' }),
});

const columns = `
  id, code, name, company_type, status, tax_id_type_id, tax_id, phone, fax, email, website,
  sms_sender_name, worker_communications_cc_email, address_id, postal_address_id, created_at, updated_at
`;

const writableColumns = [
  'code', 'name', 'companyType', 'status', 'taxIdTypeId', 'taxId', 'phone', 'fax', 'email', 'website',
  'smsSenderName', 'workerCommunicationsCcEmail', 'addressId', 'postalAddressId',
] as const;

const tags = ['Sociedades'];

export const companies = createRouter()
  .openapi(
    createRoute({
      method: 'get',
      path: '/companies',
      tags,
      summary: 'Lista las sociedades de la ETT activa',
      security: bearerSecurity,
      request: { query: ListQuery },
      responses: { 200: jsonContent(paginated(CompanySchema), 'Sociedades'), ...errorResponses(400, 401, 403) },
    }),
    async (c) => {
      const { limit, offset, status, q } = c.req.valid('query');
      const page = await withTenant(c, {}, async (tx, ctx) => {
        const where = tx`
          tenant_id = ${ctx.tenantId} and deleted_at is null
          ${status ? tx`and status = ${status}` : tx``}
          ${q ? tx`and (code ilike ${likePattern(q)} or name ilike ${likePattern(q)} or tax_id ilike ${likePattern(q)})` : tx``}
        `;
        const data = await tx<Company[]>`
          select ${tx.unsafe(columns)} from public.companies where ${where}
          order by name, code limit ${limit} offset ${offset}
        `;
        const [count] = await tx<{ total: number }[]>`select count(*)::int as total from public.companies where ${where}`;
        return { data: [...data], pagination: { limit, offset, total: count?.total ?? 0 } };
      });
      return c.json(page, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/companies/{id}',
      tags,
      summary: 'Ver una sociedad',
      security: bearerSecurity,
      request: { params: IdParams },
      responses: { 200: jsonContent(CompanySchema, 'Sociedad'), ...errorResponses(400, 401, 403, 404) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const company = await withTenant(c, {}, async (tx, ctx) => {
        const [row] = await tx<Company[]>`
          select ${tx.unsafe(columns)} from public.companies
          where tenant_id = ${ctx.tenantId} and id = ${id} and deleted_at is null
        `;
        if (!row) throw notFound('La sociedad no existe');
        return row;
      });
      return c.json(company, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/companies',
      tags,
      summary: 'Crear una sociedad',
      description: 'Requiere `companies.manage`.',
      security: bearerSecurity,
      request: { body: jsonBody(CompanyCreateSchema) },
      responses: { 201: jsonContent(CompanySchema, 'Sociedad creada'), ...errorResponses(400, 401, 403, 409, 422) },
    }),
    async (c) => {
      const body = c.req.valid('json');
      const company = await withTenant(c, { permission: 'companies.manage' }, async (tx, ctx) => {
        const values = { ...pickDefined(body, writableColumns), tenantId: ctx.tenantId };
        const [row] = await tx<Company[]>`
          insert into public.companies ${tx(values)} returning ${tx.unsafe(columns)}
        `;
        return row!;
      });
      return c.json(company, 201);
    },
  )
  .openapi(
    createRoute({
      method: 'patch',
      path: '/companies/{id}',
      tags,
      summary: 'Editar una sociedad',
      description: 'Solo cambia los campos enviados. Requiere `companies.manage`.',
      security: bearerSecurity,
      request: { params: IdParams, body: jsonBody(CompanyUpdateSchema) },
      responses: { 200: jsonContent(CompanySchema, 'Sociedad actualizada'), ...errorResponses(400, 401, 403, 404, 409, 422) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const patch = pickDefined(c.req.valid('json'), writableColumns);
      if (Object.keys(patch).length === 0) throw new ApiError(400, 'validacion', 'No hay ningún campo que cambiar');
      const company = await withTenant(c, { permission: 'companies.manage' }, async (tx, ctx) => {
        const [row] = await tx<Company[]>`
          update public.companies set ${tx(patch)}
          where tenant_id = ${ctx.tenantId} and id = ${id} and deleted_at is null
          returning ${tx.unsafe(columns)}
        `;
        if (!row) throw notFound('La sociedad no existe');
        return row;
      });
      return c.json(company, 200);
    },
  );

