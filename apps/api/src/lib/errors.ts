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
  'en_uso',
  'conservacion_obligatoria',
  'referencia_invalida',
  'error_interno',
  'servicio_no_disponible',
  'salario_bajo_convenio',
  'requiere_aprobacion',
  'cpd_incompleto',
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

/** Mensajes propios de algunas unicidades; el resto de duplicados dicen "código duplicado". */
const uniqueMessages: Record<string, string> = {
  clients_tenant_company_tax_id_uniq: 'Ya existe un cliente con ese NIF en la sociedad',
  client_contacts_main_uniq: 'El cliente ya tiene un contacto principal',
  contribution_accounts_tenant_code_uniq: 'Ese CCC ya está dado de alta',
  number_series_key_uniq: 'Ya existe esa serie (misma clase, ámbito y año)',
  memberships_tenant_id_user_id_key: 'Ese usuario ya está en esta ETT',
  catalog_items_tenant_catalog_name_uniq: 'Ya existe un valor con ese nombre en esta tabla maestra',
};

/** Mensajes propios de algunas comprobaciones (CHECK); el resto dicen "no cumplen las reglas". */
const checkMessages: Record<string, string> = {
  client_contacts_other_role_check: 'Con el rol «Otro» hay que indicar cuál (otherRole); sin ese rol, otherRole va vacío',
  client_contacts_roles_check: 'Rol de contacto no válido',
  contribution_accounts_code_check: 'El CCC no es válido: 11 cifras y las 2 de control tienen que cuadrar',
  company_legal_profiles_check: 'Si la autorización es autonómica hay que indicar la comunidad (y si es estatal, ninguna)',
  company_legal_profiles_check1: 'Para el documento del representante hay que indicar su tipo (DNI, NIE o pasaporte)',
};

/**
 * Errores de reglas de negocio lanzados por nuestros triggers con un SQLSTATE propio: el mensaje está escrito en
 * español para el usuario y se devuelve tal cual, con ese estado HTTP y código.
 *   TN409 conflicto · TN422 validación · TNUSE en uso (no se puede eliminar) · TNRET conservación obligatoria
 *   TNSAL salario por debajo del convenio (presupuestos) · TNAPR margen bajo el mínimo sin aprobar (presupuestos)
 */
const businessRuleStatus = {
  TN409: [409, 'conflicto'],
  TN422: [422, 'validacion'],
  TNUSE: [409, 'en_uso'],
  TNRET: [409, 'conservacion_obligatoria'],
  TNSAL: [422, 'salario_bajo_convenio'],
  TNAPR: [409, 'requiere_aprobacion'],
} as const;

/** Traduce los errores de Postgres que puede provocar el cliente; el resto son errores internos. */
function fromPostgres(err: { code: string; constraint_name?: string; message?: string }): ApiError | undefined {
  if (err.code in businessRuleStatus) {
    const [status, code] = businessRuleStatus[err.code as keyof typeof businessRuleStatus];
    return new ApiError(status, code, err.message ?? 'No se puede hacer');
  }
  switch (err.code) {
    case '23505':
      return new ApiError(
        409,
        'conflicto',
        uniqueMessages[err.constraint_name ?? ''] ?? 'Ya existe un registro con esos datos (código duplicado)',
      );
    case '23503':
      return new ApiError(422, 'referencia_invalida', 'Hace referencia a un registro que no existe o no es de esta ETT');
    case '23514':
      return new ApiError(
        422,
        'validacion',
        checkMessages[err.constraint_name ?? ''] ?? 'Los datos no cumplen las reglas de la base de datos',
      );
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

function isPostgresError(err: unknown): err is { code: string; constraint_name?: string; message?: string } {
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
