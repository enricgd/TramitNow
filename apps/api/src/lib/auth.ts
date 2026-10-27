// Verificación del JWT de Supabase Auth (HS256 con el JWT_SECRET del proyecto).
// Solo se aceptan tokens de usuario (`role: authenticated`), vigentes y con `sub`.
// Los claims verificados son lo único que la API pasa a Postgres (request.jwt.claims).

import type { MiddlewareHandler } from 'hono';
import { errors as joseErrors, jwtVerify } from 'jose';
import { unauthorized } from './errors.js';

/** Claims que emite Supabase Auth más los del hook (db/migrations/*_access_token_hook.sql). */
export interface Claims {
  sub: string;
  role: 'authenticated';
  aud: string | string[];
  exp: number;
  iat?: number;
  email?: string;
  /** ETT activa, o null si el usuario no tiene ninguna membresía activa. */
  tenant_id?: string | null;
  app_role?: string | null;
  branch_ids?: string[];
  [claim: string]: unknown;
}

export type AuthVariables = { claims: Claims };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireAuth(options: { secret: string; audience: string }): MiddlewareHandler<{ Variables: AuthVariables }> {
  const key = new TextEncoder().encode(options.secret);

  return async (c, next) => {
    const header = c.req.header('Authorization');
    const match = header?.match(/^Bearer\s+(\S+)$/i);
    if (!match?.[1]) throw unauthorized('Falta la cabecera Authorization: Bearer <token>');

    let payload;
    try {
      ({ payload } = await jwtVerify(match[1], key, {
        algorithms: ['HS256'],
        audience: options.audience,
        requiredClaims: ['sub', 'exp'],
        clockTolerance: 5,
      }));
    } catch (err) {
      if (err instanceof joseErrors.JWTExpired) throw unauthorized('La sesión ha caducado');
      throw unauthorized('Token no válido');
    }

    // Un token de anon o de service_role no es un usuario: no se acepta aquí.
    if (payload.role !== 'authenticated') throw unauthorized('El token no es de un usuario');
    if (typeof payload.sub !== 'string' || !UUID.test(payload.sub)) throw unauthorized('Token no válido');
    const tenantId = payload.tenant_id;
    if (tenantId != null && (typeof tenantId !== 'string' || !UUID.test(tenantId))) {
      throw unauthorized('Token no válido');
    }

    c.set('claims', payload as Claims);
    await next();
  };
}
