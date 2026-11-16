// Documentos de cualquier ficha (db/README.md, "Documentos"). Los ficheros están en Supabase Storage (bucket
// privado `documents`); la API firma las URL y la web sube y descarga directamente contra Storage:
//
//   1. POST /v1/documents/uploads   → { storagePath, uploadUrl }   (comprueba permisos, tipo y tamaño)
//   2. PUT <uploadUrl> con el fichero (Content-Type del fichero)   (directo a Storage)
//   3. POST /v1/documents { storagePath, typeId, name, ... }      (comprueba que se ha subido y lo registra)
//
// Leer: quien ve la ficha. Escribir (subir, editar, validar, eliminar, restaurar): quien puede editar la ficha (para
// clientes y centros, clients.manage en su sucursal). Eliminar es una baja lógica recuperable (fase 2): el fichero se
// queda en Storage y el documento se ve con `?deleted=true` y se restaura; los tipos con conservación obligatoria no
// se eliminan (409 `conservacion_obligatoria`). Todo deja rastro en el historial.

import { randomUUID } from 'node:crypto';
import { createRoute, z } from '@hono/zod-openapi';
import type { Context } from 'hono';
import { type AppEnv, withTenant } from '../lib/context.js';
import { type Tx, likePattern, pickDefined } from '../lib/db.js';
import { ApiError, forbidden, notFound } from '../lib/errors.js';
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
import { DOWNLOAD_URL_TTL_SECONDS, UPLOAD_URL_TTL_SECONDS, requireStorage } from '../lib/storage.js';

/** Lo que admite el bucket (design/cambios/2026-10-28-empresas-eliminar-suspender-subir.md: PDF, JPG o PNG, 10 MB). */
export const ALLOWED_MIME_TYPES = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' } as const;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

const EntityType = z.enum(['client', 'client_center', 'quote']).openapi({ description: 'Ficha del documento' });
const DocumentStatus = z
  .enum(['pending', 'validated', 'draft'])
  .openapi({ description: 'pending: pendiente de validar (al subir); validated; draft: borrador' });
const MimeType = z.enum(Object.keys(ALLOWED_MIME_TYPES) as [keyof typeof ALLOWED_MIME_TYPES]);
const date = z.iso.date().nullable();

const DocumentSchema = z
  .object({
    id: z.guid(),
    entityType: EntityType,
    entityId: z.guid(),
    typeId: z.guid(),
    typeName: z.string(),
    retentionRequired: z.boolean().openapi({ description: 'Su tipo exige conservarlo: no se puede eliminar' }),
    name: z.string(),
    mimeType: z.string(),
    sizeBytes: z.number().int(),
    status: DocumentStatus,
    expiresOn: z.string().nullable().openapi({ format: 'date', description: 'Caducidad (para avisos)' }),
    visibleInPortal: z.boolean().openapi({ description: 'También lo ve el cliente en su portal' }),
    notes: z.string().nullable(),
    uploadedBy: z.guid().nullable(),
    uploadedByName: z.string().nullable(),
    uploadedAt: Timestamp,
    validatedBy: z.guid().nullable(),
    validatedByName: z.string().nullable(),
    validatedAt: Timestamp.nullable(),
    createdAt: Timestamp,
    updatedAt: Timestamp,
    deletedAt: Timestamp.nullable().openapi({ description: 'Cuándo se eliminó (null si está activo)' }),
  })
  .openapi('Document');
type DocumentRow = z.infer<typeof DocumentSchema>;

const UploadRequest = z
  .strictObject({
    entityType: EntityType,
    entityId: z.guid(),
    fileName: z.string().trim().min(1).max(250),
    mimeType: MimeType.openapi({ description: 'PDF, JPG o PNG' }),
    sizeBytes: z.number().int().min(1).max(MAX_FILE_BYTES).openapi({ description: 'Hasta 10 MB' }),
  })
  .openapi('DocumentUploadRequest');
const UploadResponse = z
  .object({
    storagePath: z.string().openapi({ description: 'Se envía después en POST /v1/documents' }),
    uploadUrl: z.url().openapi({ description: 'PUT con el fichero como cuerpo y su Content-Type' }),
    expiresIn: z.number().int().openapi({ description: 'Segundos de validez de uploadUrl' }),
  })
  .openapi('DocumentUpload');

const editableFields = {
  typeId: z.guid().openapi({ description: 'Tipo de documento (GET /v1/catalog-items?type=document_type)' }),
  name: z.string().trim().min(1).max(250),
  status: DocumentStatus,
  expiresOn: date,
  visibleInPortal: z.boolean(),
  notes: z.string().max(4000).nullable(),
};
const CreateSchema = z
  .strictObject({
    entityType: EntityType,
    entityId: z.guid(),
    storagePath: z.string().min(1).max(500),
    ...editableFields,
    status: z.enum(['pending', 'draft']).default('pending').openapi({ description: 'Al subir: pendiente de validar o borrador' }),
    visibleInPortal: z.boolean().default(false),
  })
  .partial({ expiresOn: true, notes: true })
  .openapi('DocumentCreate');
const UpdateSchema = z.strictObject(editableFields).partial().openapi('DocumentUpdate');

const ListQuery = PaginationQuery.extend({
  entityType: EntityType.optional(),
  entityId: z.guid().optional(),
  typeId: z.guid().optional(),
  status: DocumentStatus.optional(),
  visibleInPortal: z.stringbool().optional(),
  expiresBefore: z.iso.date().optional().openapi({ description: 'Caducan antes de esta fecha (incluida)' }),
  q: z.string().trim().min(1).max(100).optional().openapi({ description: 'Busca en el nombre' }),
  deleted: z
    .stringbool()
    .optional()
    .openapi({ description: 'true: solo los eliminados (con deletedAt), para restaurarlos. Por defecto, los activos' }),
});

const DownloadResponse = z
  .object({
    url: z.url().openapi({ description: 'URL firmada de Storage; descarga el fichero con su nombre' }),
    expiresIn: z.number().int(),
  })
  .openapi('DocumentDownload');

const tags = ['Documentos'];

const select = (tx: Tx) => tx`
  select d.id, d.entity_type, d.entity_id, d.type_id, t.name as type_name, t.retention_required, d.name, d.mime_type,
         d.size_bytes::int as size_bytes, d.status, to_char(d.expires_on, 'YYYY-MM-DD') as expires_on,
         d.visible_in_portal, d.notes, d.uploaded_by, up.full_name as uploaded_by_name, d.uploaded_at,
         d.validated_by, vp.full_name as validated_by_name, d.validated_at, d.created_at, d.updated_at, d.deleted_at
  from public.documents d
  join public.catalog_items t on t.tenant_id = d.tenant_id and t.id = d.type_id
  left join public.profiles up on up.id = d.uploaded_by
  left join public.profiles vp on vp.id = d.validated_by
`;

async function findDocument(tx: Tx, tenantId: string, id: string): Promise<DocumentRow> {
  const [row] = await tx<DocumentRow[]>`
    ${select(tx)} where d.tenant_id = ${tenantId} and d.id = ${id} and d.deleted_at is null
  `;
  if (!row) throw notFound('El documento no existe');
  return row;
}

/** La ficha existe (si no, 404) y el usuario puede escribir en ella (si no, 403). */
async function requireWritableEntity(tx: Tx, tenantId: string, entityType: string, entityId: string) {
  const [check] = await tx<{ exists: boolean; writable: boolean }[]>`
    select private.document_entity_exists(${tenantId}, ${entityType}, ${entityId}) as exists,
           private.document_entity_writable(${tenantId}, ${entityType}, ${entityId}) as writable
  `;
  if (!check?.exists) throw notFound('La ficha del documento no existe');
  if (!check.writable) throw forbidden('No puedes modificar los documentos de esta ficha');
}

/** El documento (activo o, con `deleted`, eliminado), si el usuario puede escribir en su ficha. */
async function findWritable(tx: Tx, tenantId: string, id: string, deleted = false) {
  const [row] = await tx<{ entityType: string; entityId: string }[]>`
    select d.entity_type, d.entity_id from public.documents d
    where d.tenant_id = ${tenantId} and d.id = ${id}
      and ${deleted ? tx`d.deleted_at is not null` : tx`d.deleted_at is null`}
  `;
  if (!row) throw notFound(deleted ? 'El documento no existe o no está eliminado' : 'El documento no existe');
  const [check] = await tx<{ writable: boolean }[]>`
    select private.document_entity_writable(${tenantId}, ${row.entityType}, ${row.entityId}) as writable
  `;
  if (!check?.writable) throw forbidden('No puedes modificar los documentos de esta ficha');
  return row;
}

const storageOf = (c: Context<AppEnv>) => requireStorage(c.get('storage'));

export const documents = createRouter()
  .openapi(
    createRoute({
      method: 'post',
      path: '/documents/uploads',
      tags,
      summary: 'Pedir una URL para subir un fichero',
      description:
        'Paso 1 de 3. Comprueba que puedes modificar la ficha y que el fichero es PDF, JPG o PNG de hasta 10 MB, y ' +
        'devuelve una URL firmada de Storage, válida 60 segundos: pídela justo antes de subir cada fichero. ' +
        'Paso 2: `PUT uploadUrl` con el fichero. Paso 3: `POST /v1/documents`.',
      security: bearerSecurity,
      request: { body: jsonBody(UploadRequest) },
      responses: { 201: jsonContent(UploadResponse, 'URL de subida'), ...errorResponses(400, 401, 403, 404, 503) },
    }),
    async (c) => {
      const body = c.req.valid('json');
      const storage = storageOf(c);
      const storagePath = await withTenant(c, {}, async (tx, ctx) => {
        await requireWritableEntity(tx, ctx.tenantId, body.entityType, body.entityId);
        return `${ctx.tenantId}/${body.entityType}/${body.entityId}/${randomUUID()}.${ALLOWED_MIME_TYPES[body.mimeType]}`;
      });
      const uploadUrl = await storage.signedUploadUrl(storagePath);
      return c.json({ storagePath, uploadUrl, expiresIn: UPLOAD_URL_TTL_SECONDS }, 201);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/documents',
      tags,
      summary: 'Registrar un documento subido',
      description:
        'Paso 3 de 3. Comprueba que el fichero está en Storage (el tamaño y el tipo se toman de ahí) y lo registra; ' +
        'entra como pendiente de validar o como borrador.',
      security: bearerSecurity,
      request: { body: jsonBody(CreateSchema) },
      responses: { 201: jsonContent(DocumentSchema, 'Documento registrado'), ...errorResponses(400, 401, 403, 404, 409, 422, 503) },
    }),
    async (c) => {
      const body = c.req.valid('json');
      const storage = storageOf(c);
      const row = await withTenant(c, {}, async (tx, ctx) => {
        await requireWritableEntity(tx, ctx.tenantId, body.entityType, body.entityId);
        const prefix = `${ctx.tenantId}/${body.entityType}/${body.entityId}/`;
        if (!body.storagePath.startsWith(prefix) || body.storagePath.slice(prefix.length).includes('/')) {
          throw new ApiError(400, 'validacion', 'La ruta del fichero no corresponde a esta ficha');
        }
        const info = await storage.info(body.storagePath);
        if (!info) throw new ApiError(422, 'validacion', 'El fichero no se ha subido o ya no existe');
        if (!(info.mimeType in ALLOWED_MIME_TYPES) || info.size > MAX_FILE_BYTES) {
          throw new ApiError(422, 'validacion', 'El fichero tiene que ser PDF, JPG o PNG de hasta 10 MB');
        }
        const values = {
          ...pickDefined(body, ['entityType', 'entityId', 'storagePath', 'typeId', 'name', 'status', 'expiresOn', 'visibleInPortal', 'notes']),
          tenantId: ctx.tenantId,
          mimeType: info.mimeType,
          sizeBytes: info.size,
        };
        const [created] = await tx<{ id: string }[]>`insert into public.documents ${tx(values)} returning id`;
        return findDocument(tx, ctx.tenantId, created!.id);
      });
      return c.json(row, 201);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/documents',
      tags,
      summary: 'Lista los documentos',
      description: 'De una ficha (`entityType` + `entityId`) o de toda la ETT; solo los de fichas que puedes ver.',
      security: bearerSecurity,
      request: { query: ListQuery },
      responses: { 200: jsonContent(paginated(DocumentSchema), 'Documentos'), ...errorResponses(400, 401, 403) },
    }),
    async (c) => {
      const q = c.req.valid('query');
      const page = await withTenant(c, {}, async (tx, ctx) => {
        const conditions = [
          tx`d.tenant_id = ${ctx.tenantId}`,
          q.deleted ? tx`d.deleted_at is not null` : tx`d.deleted_at is null`,
        ];
        if (q.entityType) conditions.push(tx`d.entity_type = ${q.entityType}`);
        if (q.entityId) conditions.push(tx`d.entity_id = ${q.entityId}`);
        if (q.typeId) conditions.push(tx`d.type_id = ${q.typeId}`);
        if (q.status) conditions.push(tx`d.status = ${q.status}`);
        if (q.visibleInPortal !== undefined) conditions.push(tx`d.visible_in_portal = ${q.visibleInPortal}`);
        if (q.expiresBefore) conditions.push(tx`d.expires_on <= ${q.expiresBefore}`);
        if (q.q) conditions.push(tx`d.name ilike ${likePattern(q.q)}`);
        const where = conditions.reduce((acc, cond) => tx`${acc} and ${cond}`);
        const data = await tx<DocumentRow[]>`
          ${select(tx)} where ${where}
          order by ${q.deleted ? tx`d.deleted_at desc,` : tx``} d.uploaded_at desc, d.id limit ${q.limit} offset ${q.offset}
        `;
        const [count] = await tx<{ total: number }[]>`select count(*)::int as total from public.documents d where ${where}`;
        return { data: [...data], pagination: { limit: q.limit, offset: q.offset, total: count?.total ?? 0 } };
      });
      return c.json(page, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/documents/{id}',
      tags,
      summary: 'Ver un documento',
      security: bearerSecurity,
      request: { params: IdParams },
      responses: { 200: jsonContent(DocumentSchema, 'Documento'), ...errorResponses(400, 401, 403, 404) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const row = await withTenant(c, {}, (tx, ctx) => findDocument(tx, ctx.tenantId, id));
      return c.json(row, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'patch',
      path: '/documents/{id}',
      tags,
      summary: 'Editar o validar un documento',
      description:
        'Solo cambia los campos enviados. `status: "validated"` lo valida (quién y cuándo los pone la base de datos). ' +
        'El fichero y la ficha no cambian: para otro fichero, otro documento.',
      security: bearerSecurity,
      request: { params: IdParams, body: jsonBody(UpdateSchema) },
      responses: { 200: jsonContent(DocumentSchema, 'Documento actualizado'), ...errorResponses(400, 401, 403, 404, 409, 422) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const patch = pickDefined(c.req.valid('json'), Object.keys(editableFields) as (keyof typeof editableFields)[]);
      if (Object.keys(patch).length === 0) throw new ApiError(400, 'validacion', 'No hay ningún campo que cambiar');
      const row = await withTenant(c, {}, async (tx, ctx) => {
        await findWritable(tx, ctx.tenantId, id);
        await tx`update public.documents set ${tx(patch)} where tenant_id = ${ctx.tenantId} and id = ${id}`;
        return findDocument(tx, ctx.tenantId, id);
      });
      return c.json(row, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/documents/{id}/download',
      tags,
      summary: 'URL para descargar un documento',
      description: `URL firmada de Storage, válida ${DOWNLOAD_URL_TTL_SECONDS / 60} minutos. Quien puede ver la ficha.`,
      security: bearerSecurity,
      request: { params: IdParams },
      responses: { 200: jsonContent(DownloadResponse, 'URL de descarga'), ...errorResponses(400, 401, 403, 404, 503) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const storage = storageOf(c);
      const doc = await withTenant(c, {}, async (tx, ctx) => {
        const [row] = await tx<{ storagePath: string; name: string; mimeType: string }[]>`
          select storage_path, name, mime_type from public.documents
          where tenant_id = ${ctx.tenantId} and id = ${id} and deleted_at is null
        `;
        if (!row) throw notFound('El documento no existe');
        return row;
      });
      const extension = ALLOWED_MIME_TYPES[doc.mimeType as keyof typeof ALLOWED_MIME_TYPES];
      const fileName = extension && !doc.name.toLowerCase().endsWith(`.${extension}`) ? `${doc.name}.${extension}` : doc.name;
      const url = await storage.signedDownloadUrl(doc.storagePath, fileName);
      return c.json({ url, expiresIn: DOWNLOAD_URL_TTL_SECONDS }, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'delete',
      path: '/documents/{id}',
      tags,
      summary: 'Eliminar un documento',
      description:
        'Baja lógica recuperable: deja de salir en las listas (salvo con `?deleted=true`), el fichero se conserva y se ' +
        'puede restaurar. Queda en el historial. 409 `conservacion_obligatoria` si su tipo exige conservarlo ' +
        '(contratos, CPD, nóminas...).',
      security: bearerSecurity,
      request: { params: IdParams },
      responses: { 204: { description: 'Eliminado' }, ...errorResponses(400, 401, 403, 404, 409) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      await withTenant(c, {}, async (tx, ctx) => {
        await findWritable(tx, ctx.tenantId, id);
        await tx`update public.documents set deleted_at = now() where tenant_id = ${ctx.tenantId} and id = ${id}`;
      });
      return c.body(null, 204);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/documents/{id}/restore',
      tags,
      summary: 'Restaurar un documento eliminado',
      description: 'Solo para lo eliminado (`?deleted=true`). 409 `conflicto` si su ficha está eliminada.',
      security: bearerSecurity,
      request: { params: IdParams },
      responses: { 200: jsonContent(DocumentSchema, 'Documento restaurado'), ...errorResponses(400, 401, 403, 404, 409) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const row = await withTenant(c, {}, async (tx, ctx) => {
        await findWritable(tx, ctx.tenantId, id, true);
        await tx`update public.documents set deleted_at = null where tenant_id = ${ctx.tenantId} and id = ${id}`;
        return findDocument(tx, ctx.tenantId, id);
      });
      return c.json(row, 200);
    },
  );
