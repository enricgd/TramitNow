// Piezas comunes para definir rutas: router con el formato de error de validación, respuestas de error,
// paginación y parámetros.

import { OpenAPIHono, z } from '@hono/zod-openapi';
import type { AppEnv } from './context.js';
import { ErrorSchema, errorBody, zodIssues } from './errors.js';

export function createRouter() {
  return new OpenAPIHono<AppEnv>({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(errorBody('validacion', 'Los datos enviados no son válidos', zodIssues(result.error)), 400);
      }
    },
  });
}

export const bearerSecurity = [{ bearerAuth: [] }];

const errorDescriptions = {
  400: 'Datos no válidos (`validacion`)',
  401: 'Sin token o token no válido o caducado (`no_autenticado`)',
  403: 'Sin permiso, sin ETT activa o usuario bloqueado (`sin_permiso`, `sin_ett_activa`, `usuario_bloqueado`)',
  404: 'No existe o es de otra ETT (`no_encontrado`)',
  409: 'Duplicado (`conflicto`)',
  422: 'Referencia a un registro que no existe en la ETT (`referencia_invalida`)',
} as const;

/** Respuestas de error documentadas para una ruta. */
export function errorResponses(...statuses: (keyof typeof errorDescriptions)[]) {
  return Object.fromEntries(
    statuses.map((status) => [
      status,
      { description: errorDescriptions[status], content: { 'application/json': { schema: ErrorSchema } } },
    ]),
  );
}

export function jsonContent<T extends z.ZodType>(schema: T, description: string) {
  return { description, content: { 'application/json': { schema } } };
}

export function jsonBody<T extends z.ZodType>(schema: T) {
  return { required: true, content: { 'application/json': { schema } } };
}

export const IdParams = z.object({
  id: z.uuid().openapi({ param: { name: 'id', in: 'path' }, example: '20000000-0000-0000-0000-0000000000a1' }),
});

// ---------------------------------------------------------------------------
// Paginación: ?limit=&offset= → { data: [...], pagination: { limit, offset, total } }
// ---------------------------------------------------------------------------
export const PAGE_MAX = 200;

export const PaginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(PAGE_MAX).default(50).openapi({ example: 50 }),
  offset: z.coerce.number().int().min(0).default(0).openapi({ example: 0 }),
});

export const PaginationSchema = z
  .object({
    limit: z.number().int(),
    offset: z.number().int(),
    total: z.number().int().openapi({ description: 'Total de elementos con los filtros aplicados' }),
  })
  .openapi('Pagination');

export function paginated<T extends z.ZodType>(item: T) {
  return z.object({ data: z.array(item), pagination: PaginationSchema });
}

/** Para listas cortas sin paginar (roles, permisos). */
export function listOf<T extends z.ZodType>(item: T) {
  return z.object({ data: z.array(item) });
}

// Tipos comunes
export const Timestamp = z.string().openapi({ format: 'date-time', example: '2026-10-27T10:00:00.000Z' });
export const Status = z.enum(['active', 'inactive']);
export const nullableText = (max: number) => z.string().trim().max(max).nullable();
