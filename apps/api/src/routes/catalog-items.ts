// Tablas maestras de la ETT activa (catalog_items): sectores, formas de pago, motivos, tipos de incidencia y de
// documento... Los tipos son una lista cerrada (catalog_types, GET /v1/catalog-types). El nombre es único por tipo
// sin distinguir mayúsculas y el código es opcional (lo que se da de alta desde un desplegable solo tiene nombre).
// Leer: cualquier miembro. Escribir: catalogs.manage. Ver db/README.md, "Tablas maestras".

import { createRoute, z } from '@hono/zod-openapi';
import { withUser } from '../lib/context.js';
import { crudRoutes } from '../lib/crud.js';
import { Status, Timestamp, bearerSecurity, createRouter, errorResponses, jsonContent, listOf } from '../lib/openapi.js';

const CatalogTypeCode = z
  .string()
  .regex(/^[a-z][a-z0-9_]*$/)
  .max(80)
  .openapi({ description: 'Código del tipo (GET /v1/catalog-types)', example: 'document_type' });

const CatalogTypeSchema = z
  .object({
    code: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    module: z.enum(['general', 'comercial', 'administracion', 'laboral', 'seleccion']),
  })
  .openapi('CatalogType');

export const catalogTypes = createRouter().openapi(
  createRoute({
    method: 'get',
    path: '/catalog-types',
    tags: ['Tablas maestras'],
    summary: 'Tipos de tabla maestra',
    description: 'Lista cerrada y global; la amplía una migración.',
    security: bearerSecurity,
    responses: { 200: jsonContent(listOf(CatalogTypeSchema), 'Tipos'), ...errorResponses(401) },
  }),
  async (c) => {
    const data = await withUser(c, (tx) => tx<z.infer<typeof CatalogTypeSchema>[]>`
      select code, name, description, module from public.catalog_types order by module, name
    `);
    return c.json({ data: [...data] }, 200);
  },
);

const fields = {
  type: CatalogTypeCode,
  code: z.string().trim().min(1).max(50).nullable().openapi({ description: 'Opcional; único por tipo' }),
  name: z.string().trim().min(1).max(180).openapi({ description: 'Único por tipo sin distinguir mayúsculas' }),
  parentId: z.guid().nullable().openapi({ description: 'Valor padre (agrupación), de la misma ETT' }),
  metadata: z.record(z.string(), z.unknown()),
  status: Status,
  retentionRequired: z.boolean().openapi({
    description: 'Solo tipos de documento: sus documentos no se pueden borrar (obligación legal de conservación)',
  }),
  groupName: z.string().trim().min(1).max(80).nullable().openapi({ description: 'Grupo o sector (perfiles, carnés, habilidades)' }),
  synonyms: z.array(z.string().trim().min(1).max(120)).max(50)
    .openapi({ description: 'Otros nombres con los que se busca (perfiles, carnés, habilidades, idiomas)' }),
};

export const catalogItems = crudRoutes({
  path: '/catalog-items',
  table: 'catalog_items',
  name: 'CatalogItem',
  tag: 'Tablas maestras',
  names: { one: 'el valor', many: 'los valores de una tabla maestra' },
  schema: z
    .object({ id: z.guid(), ...fields, code: z.string().nullable(), createdAt: Timestamp, updatedAt: Timestamp })
    .openapi('CatalogItem'),
  fields,
  required: ['type', 'name'],
  createDefaults: { status: Status.default('active'), retentionRequired: z.boolean().default(false), synonyms: z.array(z.string()).default([]) },
  createOnly: ['type'],
  columnAliases: { type: 'catalog' },
  columns: 'id, catalog as type, code, name, parent_id, metadata, status, retention_required, group_name, synonyms, created_at, updated_at',
  permission: 'catalogs.manage',
  search: ['name', 'code'],
  filters: {
    type: CatalogTypeCode,
    parentId: z.guid().optional(),
  },
  where: (tx, q) => [tx`catalog = ${q.type}`, ...(q.parentId ? [tx`parent_id = ${q.parentId}`] : [])],
  orderBy: 'name',
});
