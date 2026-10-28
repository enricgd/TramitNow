// Rutas CRUD de una tabla por ETT, para los recursos que no tienen más reglas que las de la tabla
// (catálogos de la ETT, direcciones...). Listar con filtros y paginación, ver, crear, editar y baja lógica.
// Lo que tenga lógica propia (como la sucursal por defecto de branches.ts) se escribe aparte.
//
// Leer: cualquier miembro de la ETT activa. Escribir: `permission`. Las RLS lo vuelven a comprobar.

import { createRoute, z } from '@hono/zod-openapi';
import type { Context } from 'hono';
import type { PendingQuery, Row } from 'postgres';
import { withTenant, type AppEnv } from './context.js';
import { type Tx, likePattern, pickDefined } from './db.js';
import { ApiError, notFound } from './errors.js';
import {
  IdParams,
  PaginationQuery,
  bearerSecurity,
  createRouter,
  errorResponses,
  jsonBody,
  jsonContent,
  paginated,
} from './openapi.js';

type Fragment = PendingQuery<Row[]>;

export interface CrudOptions<Q extends z.ZodRawShape> {
  /** Ruta sin /v1, p. ej. '/collective-agreements'. */
  path: string;
  table: string;
  /** Nombre del esquema en OpenAPI; los de alta y edición son `<name>Create` y `<name>Update`. */
  name: string;
  tag: string;
  /** Para los textos de la documentación y los errores: { one: 'el convenio', many: 'los convenios' }. */
  names: { one: string; many: string };
  schema: z.ZodObject;
  /** Campos editables (sin valores por defecto: se aplican solo al crear con `createDefaults`). */
  fields: z.ZodRawShape;
  /** Campos obligatorios al crear. */
  required: readonly string[];
  createDefaults?: z.ZodRawShape;
  /** Columnas en snake_case, en el orden del esquema. */
  columns: string;
  permission: string;
  /** Columnas para `?q=` (búsqueda por texto). */
  search?: string[];
  /** Filtros propios de la lista y cómo se traducen a SQL. */
  filters?: Q;
  where?: (tx: Tx, query: z.infer<z.ZodObject<Q>>) => Fragment[];
  orderBy?: string;
  /** `false` para tablas sin `status` (no se ofrece `?status=`). */
  hasStatus?: boolean;
}

export function crudRoutes<Q extends z.ZodRawShape>(o: CrudOptions<Q>) {
  const label = o.names.one.replace(/^(el|la) /, '');
  const Schema = o.schema;
  const CreateSchema = z
    .strictObject(o.fields)
    .partial()
    .required(Object.fromEntries(o.required.map((k) => [k, true])) as never)
    .extend(o.createDefaults ?? {})
    .openapi(`${o.name}Create`);
  const UpdateSchema = z.strictObject(o.fields).partial().openapi(`${o.name}Update`);
  const writable = Object.keys(o.fields);

  const ListQuery = PaginationQuery.extend({
    ...(o.hasStatus === false ? {} : { status: z.enum(['active', 'inactive']).optional() }),
    ...(o.search ? { q: z.string().trim().min(1).max(100).optional().openapi({ description: `Busca en ${o.search.join(', ')}` }) } : {}),
    ...(o.filters ?? {}),
  });

  const columns = o.columns;
  const table = (tx: Tx) => tx(`public.${o.table}`);
  const tags = [o.tag];

  // c.req.valid() pierde los tipos con esquemas genéricos: se leen como registros.
  const valid = (c: Context<AppEnv>, target: 'query' | 'param' | 'json') =>
    (c.req.valid as (t: string) => Record<string, unknown>)(target);

  const findOne = async (tx: Tx, tenantId: string, id: string) => {
    const [row] = await tx`
      select ${tx.unsafe(columns)} from ${table(tx)}
      where tenant_id = ${tenantId} and id = ${id} and deleted_at is null
    `;
    if (!row) throw notFound(`${capitalize(o.names.one)} no existe`);
    return row;
  };

  return createRouter()
    .openapi(
      createRoute({
        method: 'get',
        path: o.path,
        tags,
        summary: `Lista ${o.names.many} de la ETT activa`,
        security: bearerSecurity,
        request: { query: ListQuery },
        responses: { 200: jsonContent(paginated(Schema), capitalize(o.names.many)), ...errorResponses(400, 401, 403) },
      }),
      async (c) => {
        const query = valid(c, 'query') as { limit: number; offset: number; status?: string; q?: string };
        const page = await withTenant(c, {}, async (tx, ctx) => {
          const conditions: Fragment[] = [tx`tenant_id = ${ctx.tenantId} and deleted_at is null`];
          if (query.status) conditions.push(tx`status = ${query.status}`);
          if (query.q && o.search) {
            const pattern = likePattern(query.q);
            const any = o.search.map((col) => tx`${tx(col)} ilike ${pattern}`).reduce((a, b) => tx`${a} or ${b}`);
            conditions.push(tx`(${any})`);
          }
          conditions.push(...(o.where?.(tx, query as never) ?? []));
          const where = conditions.reduce((acc, cond) => tx`${acc} and ${cond}`);
          const data = await tx`
            select ${tx.unsafe(columns)} from ${table(tx)} where ${where}
            order by ${tx.unsafe(o.orderBy ?? 'name, code')} limit ${query.limit} offset ${query.offset}
          `;
          const [count] = await tx<{ total: number }[]>`select count(*)::int as total from ${table(tx)} where ${where}`;
          return { data: [...data], pagination: { limit: query.limit, offset: query.offset, total: count?.total ?? 0 } };
        });
        return c.json(page as never, 200);
      },
    )
    .openapi(
      createRoute({
        method: 'get',
        path: `${o.path}/{id}`,
        tags,
        summary: `Ver ${o.names.one}`,
        security: bearerSecurity,
        request: { params: IdParams },
        responses: { 200: jsonContent(Schema, capitalize(label)), ...errorResponses(400, 401, 403, 404) },
      }),
      async (c) => {
        const { id } = valid(c, 'param') as { id: string };
        const row = await withTenant(c, {}, (tx, ctx) => findOne(tx, ctx.tenantId, id));
        return c.json(row as never, 200);
      },
    )
    .openapi(
      createRoute({
        method: 'post',
        path: o.path,
        tags,
        summary: `Crear ${o.names.one}`,
        description: `Requiere \`${o.permission}\`.`,
        security: bearerSecurity,
        request: { body: jsonBody(CreateSchema) },
        responses: { 201: jsonContent(Schema, `${capitalize(label)} creado`), ...errorResponses(400, 401, 403, 409, 422) },
      }),
      async (c) => {
        const body = valid(c, 'json');
        const row = await withTenant(c, { permission: o.permission }, async (tx, ctx) => {
          const values = { ...pickDefined(body, writable), tenantId: ctx.tenantId };
          const [created] = await tx`insert into ${table(tx)} ${tx(values)} returning ${tx.unsafe(columns)}`;
          return created!;
        });
        return c.json(row as never, 201);
      },
    )
    .openapi(
      createRoute({
        method: 'patch',
        path: `${o.path}/{id}`,
        tags,
        summary: `Editar ${o.names.one}`,
        description: `Solo cambia los campos enviados. Requiere \`${o.permission}\`.`,
        security: bearerSecurity,
        request: { params: IdParams, body: jsonBody(UpdateSchema) },
        responses: { 200: jsonContent(Schema, `${capitalize(label)} actualizado`), ...errorResponses(400, 401, 403, 404, 409, 422) },
      }),
      async (c) => {
        const { id } = valid(c, 'param') as { id: string };
        const patch = pickDefined(valid(c, 'json'), writable);
        if (Object.keys(patch).length === 0) throw new ApiError(400, 'validacion', 'No hay ningún campo que cambiar');
        const row = await withTenant(c, { permission: o.permission }, async (tx, ctx) => {
          const [updated] = await tx`
            update ${table(tx)} set ${tx(patch)}
            where tenant_id = ${ctx.tenantId} and id = ${id} and deleted_at is null
            returning ${tx.unsafe(columns)}
          `;
          if (!updated) throw notFound(`${capitalize(o.names.one)} no existe`);
          return updated;
        });
        return c.json(row as never, 200);
      },
    )
    .openapi(
      createRoute({
        method: 'delete',
        path: `${o.path}/{id}`,
        tags,
        summary: `Dar de baja ${o.names.one}`,
        description: `Baja lógica: deja de aparecer, pero lo que ya lo usa lo sigue referenciando. Requiere \`${o.permission}\`.`,
        security: bearerSecurity,
        request: { params: IdParams },
        responses: { 204: { description: 'Dado de baja' }, ...errorResponses(400, 401, 403, 404) },
      }),
      async (c) => {
        const { id } = valid(c, 'param') as { id: string };
        await withTenant(c, { permission: o.permission }, async (tx, ctx) => {
          const rows = await tx`
            update ${table(tx)} set deleted_at = now()
            where tenant_id = ${ctx.tenantId} and id = ${id} and deleted_at is null
            returning id
          `;
          if (rows.length === 0) throw notFound(`${capitalize(o.names.one)} no existe`);
        });
        return c.body(null, 204);
      },
    );
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
