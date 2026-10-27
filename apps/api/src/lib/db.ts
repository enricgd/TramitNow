// Acceso a Postgres. La API se conecta como tramitnow_api, que no tiene privilegios propios: todo pasa
// por withClaims(), que abre una transacción, cambia a `authenticated` y fija los claims del JWT
// verificado, igual que PostgREST (ver db/README.md). Así las políticas RLS con auth.uid() / auth.jwt()
// se aplican aunque la API tuviera un fallo.
//
// `set local` y set_config(..., true) se deshacen al acabar la transacción (commit o rollback): la
// conexión vuelve al pool como tramitnow_api y sin claims.

import postgres from 'postgres';
import type { Claims } from './auth.js';

export type Sql = postgres.Sql<Record<string, never>>;
export type Tx = postgres.TransactionSql<Record<string, never>>;

const TIMESTAMPTZ_OID = 1184;
const TIMESTAMP_OID = 1114;

export function createSql(databaseUrl: string, options: { max?: number } = {}): Sql {
  return postgres(databaseUrl, {
    max: options.max ?? 10,
    idle_timeout: 30,
    connect_timeout: 10,
    connection: { application_name: 'tramitnow-api' },
    // Columnas en snake_case en la base de datos y camelCase en la API.
    transform: postgres.camel,
    // Fechas como texto ISO 8601, que es lo que devuelve la API.
    types: {
      isoTimestamp: {
        to: TIMESTAMPTZ_OID,
        from: [TIMESTAMPTZ_OID, TIMESTAMP_OID],
        serialize: (value: string | Date) => (value instanceof Date ? value.toISOString() : value),
        parse: (value: string) => new Date(value).toISOString(),
      },
    },
    onnotice: () => {},
  }) as unknown as Sql;
}

/**
 * Ejecuta `fn` en una transacción como el usuario de los claims (ya verificados por requireAuth).
 * Si `fn` lanza un error, la transacción se deshace.
 */
export async function withClaims<T>(sql: Sql, claims: Claims, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const result = await sql.begin(async (tx) => {
    await tx`set local role authenticated`;
    await tx`select set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`;
    await tx`set local statement_timeout = '15s'`;
    return fn(tx);
  });
  return result as T;
}

/** Solo las columnas permitidas que vienen definidas (undefined = no se toca; null = se borra). */
export function pickDefined<K extends string>(
  body: Partial<Record<K, unknown>>,
  keys: readonly K[],
): Record<string, postgres.SerializableParameter> {
  return Object.fromEntries(
    keys.filter((key) => body[key] !== undefined).map((key) => [key, body[key] as postgres.SerializableParameter]),
  );
}

/** Patrón de ILIKE que busca `text` tal cual (escapa %, _ y \). */
export function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}
