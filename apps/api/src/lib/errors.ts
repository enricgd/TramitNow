// Formato único de error de la API (ver apps/README.md, "Convenciones de la API"):
//
//   { "error": { "code": "sin_permiso", "message": "No tienes permiso...", "details": [...] } }
//
// `code` es estable y lo usa la web para decidir qué hacer; `message` está en español y se puede
// mostrar tal cual; `details` solo aparece en errores de validación (un elemento por campo).

import { z } from '@hono/zod-openapi';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export const errorCodes = [
  'no_autenticado',
  'sin_permiso',
  'sin_ett_activa',
  'usuario_bloqueado',
  'no_encontrado',
  'validacion',
  'conflicto',
  'referencia_invalida',
  'error_interno',
] as const;
export type ErrorCode = (typeof errorCodes)[number];

export const ValidationIssueSchema = z
  .object({
    path: z.string().openapi({ example: 'name' }),
    message: z.string().openapi({ example: 'Obligatorio' }),
  })
  .openapi('ValidationIssue');

export const ErrorSchema = z
  .object({
    error: z.object({
      code: z.enum(errorCodes).openapi({ example: 'sin_permiso' }),
      message: z.string().openapi({ example: 'No tienes permiso para esta acción' }),
      details: z.array(ValidationIssueSchema).optional(),
    }),
  })
  .openapi('Error');
export type ErrorBody = z.infer<typeof ErrorSchema>;

export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;

export class ApiError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: ErrorCode,
    message: string,
    readonly details?: ValidationIssue[],
  ) {
    super(message);
  }
}

export const unauthorized = (message = 'Falta el token de sesión o no es válido') =>
  new ApiError(401, 'no_autenticado', message);
export const forbidden = (message = 'No tienes permiso para esta acción') => new ApiError(403, 'sin_permiso', message);
export const notFound = (message = 'No existe o no tienes acceso') => new ApiError(404, 'no_encontrado', message);

export function zodIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
}

export function errorBody(code: ErrorCode, message: string, details?: ValidationIssue[]): ErrorBody {
  return { error: details ? { code, message, details } : { code, message } };
}

/** Traduce los errores de Postgres que puede provocar el cliente; el resto son errores internos. */
function fromPostgres(err: { code: string; constraint_name?: string }): ApiError | undefined {
  switch (err.code) {
    case '23505':
      return new ApiError(409, 'conflicto', 'Ya existe un registro con esos datos (código duplicado)');
    case '23503':
      return new ApiError(422, 'referencia_invalida', 'Hace referencia a un registro que no existe o no es de esta ETT');
    case '23514':
    case '23502':
    case '22001':
      return new ApiError(422, 'validacion', 'Los datos no cumplen las reglas de la base de datos');
    case '22P02':
      return new ApiError(400, 'validacion', 'Formato de dato no válido');
    case '42501':
      // RLS o un trigger que exige permisos: la API debería haberlo cortado antes.
      return forbidden();
    default:
      return undefined;
  }
}

function isPostgresError(err: unknown): err is { code: string; constraint_name?: string } {
  return typeof err === 'object' && err !== null && (err as { name?: string }).name === 'PostgresError';
}

export function handleError(err: unknown, c: Context): Response {
  let apiError: ApiError | undefined;
  if (err instanceof ApiError) apiError = err;
  else if (isPostgresError(err)) apiError = fromPostgres(err);
  else if (err instanceof HTTPException && err.status < 500) {
    apiError = new ApiError(err.status, err.status === 401 ? 'no_autenticado' : 'validacion', err.message || 'Petición no válida');
  }

  if (!apiError) {
    console.error(err);
    apiError = new ApiError(500, 'error_interno', 'Error interno del servidor');
  }
  return c.json(errorBody(apiError.code, apiError.message, apiError.details), apiError.status);
}
