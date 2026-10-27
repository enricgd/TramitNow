// Utilidades de los tests: la app real conectada como tramitnow_api y tokens firmados con el secreto local.

import { SignJWT } from 'jose';
import postgres from 'postgres';
import { createApp } from '../src/app.js';
import { createSql } from '../src/lib/db.js';

// Identificadores de db/tests/_fixtures.sql
export const T = {
  A: '10000000-0000-0000-0000-00000000000a',
  B: '10000000-0000-0000-0000-00000000000b',
} as const;
export const COMPANY = {
  A1: '20000000-0000-0000-0000-0000000000a1',
  B1: '20000000-0000-0000-0000-0000000000b1',
} as const;
export const BRANCH = {
  A1: '30000000-0000-0000-0000-0000000000a1',
  A2: '30000000-0000-0000-0000-0000000000a2',
  B1: '30000000-0000-0000-0000-0000000000b1',
} as const;
export const USER = {
  adminA: 'a0000000-0000-0000-0000-000000000001',
  selA: 'a0000000-0000-0000-0000-000000000002',
  adminB: 'b0000000-0000-0000-0000-000000000001',
  multi: 'c0000000-0000-0000-0000-000000000001',
  super: 'd0000000-0000-0000-0000-000000000001',
  blocked: 'e0000000-0000-0000-0000-000000000001',
  nobody: 'f0000000-0000-0000-0000-000000000001',
} as const;

export const secret = process.env.SUPABASE_JWT_SECRET!;

/** Pool de la API (tramitnow_api), compartido por los tests de un fichero. */
export const apiSql = createSql(process.env.DATABASE_URL!, { max: 2 });

/** Conexión como postgres para preparar y comprobar datos sin RLS. */
export const adminSql = postgres(process.env.ADMIN_DATABASE_URL!, { max: 1, onnotice: () => {} });

export const app = createApp({
  sql: apiSql,
  config: { jwtSecret: secret, jwtAudience: 'authenticated', corsOrigins: ['http://localhost:5173'] },
  log: false,
});

/** Claims que pondría el hook de Supabase Auth a este usuario ahora mismo. */
export async function hookClaims(userId: string): Promise<Record<string, unknown>> {
  const [row] = await adminSql<{ claims: Record<string, unknown> }[]>`
    select private.custom_access_token_hook(jsonb_build_object(
      'user_id', ${userId}::uuid,
      'claims', jsonb_build_object('sub', ${userId}::uuid, 'role', 'authenticated', 'aud', 'authenticated')
    )) -> 'claims' as claims
  `;
  return row!.claims;
}

/** Token como el de Supabase Auth para este usuario, con los claims del hook y los cambios indicados. */
export async function tokenFor(
  userId: string,
  overrides: Record<string, unknown> = {},
  options: { secret?: string; expiresIn?: string | number } = {},
): Promise<string> {
  const claims = { ...(await hookClaims(userId)), email: `${userId}@example.test`, ...overrides };
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(options.expiresIn ?? '1h')
    .sign(new TextEncoder().encode(options.secret ?? secret));
}

export interface ApiResponse<T = any> {
  status: number;
  body: T;
}

/** Llama a la app en proceso (sin servidor HTTP). */
export async function call<T = any>(
  method: string,
  path: string,
  options: { token?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { ...options.headers };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await app.request(path, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

export async function closeAll() {
  await apiSql.end();
  await adminSql.end();
}
