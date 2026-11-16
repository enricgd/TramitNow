// Configuración desde variables de entorno. Falla al arrancar si falta algo obligatorio.

import type { AuthAdminConfig } from './lib/auth-admin.js';
import type { StorageConfig } from './lib/storage.js';

export interface Config {
  /** Conexión como tramitnow_api (nunca postgres ni service_role). */
  databaseUrl: string;
  /** Secreto HS256 con el que Supabase Auth firma los JWT (JWT_SECRET del .env de Supabase). */
  jwtSecret: string;
  /** Audiencia esperada en los JWT de Supabase Auth. */
  jwtAudience: string;
  /** Orígenes permitidos por CORS (la web). */
  corsOrigins: string[];
  port: number;
  /** Máximo de conexiones del pool de Postgres. */
  dbPoolMax: number;
  /** Supabase Storage (documentos). Sin él, las rutas de ficheros responden 503. */
  storage?: StorageConfig;
  /** Supabase Auth con la service_role (alta e invitación de usuarios). Sin él, esas rutas responden 503. */
  authAdmin?: AuthAdminConfig;
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const databaseUrl = required(env, 'DATABASE_URL');
  const user = decodeURIComponent(new URL(databaseUrl).username);
  if (user !== 'tramitnow_api') {
    throw new Error(`DATABASE_URL debe conectar como tramitnow_api (ahora: ${user || 'sin usuario'})`);
  }
  const jwtSecret = required(env, 'SUPABASE_JWT_SECRET');
  if (jwtSecret.length < 32) throw new Error('SUPABASE_JWT_SECRET es demasiado corto (mínimo 32 caracteres)');

  return {
    databaseUrl,
    jwtSecret,
    jwtAudience: env.SUPABASE_JWT_AUDIENCE || 'authenticated',
    corsOrigins: (env.CORS_ORIGINS || 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    port: Number(env.PORT || 3000),
    dbPoolMax: Number(env.DB_POOL_MAX || 10),
    storage: loadStorageConfig(env),
    authAdmin: loadAuthAdminConfig(env),
  };
}

function loadAuthAdminConfig(env: NodeJS.ProcessEnv): AuthAdminConfig | undefined {
  const url = env.AUTH_URL;
  if (!url) return undefined;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('Para invitar usuarios (AUTH_URL) hace falta SUPABASE_SERVICE_ROLE_KEY');
  return {
    url: url.replace(/\/+$/, ''),
    serviceKey,
    redirectUrl: env.INVITE_REDIRECT_URL || undefined,
    sendsEmail: env.AUTH_SENDS_INVITES === 'true',
  };
}

function loadStorageConfig(env: NodeJS.ProcessEnv): StorageConfig | undefined {
  const url = env.STORAGE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url && !serviceKey) return undefined;
  if (!url || !serviceKey) throw new Error('Para los documentos hacen falta STORAGE_URL y SUPABASE_SERVICE_ROLE_KEY');
  const trim = (value: string) => value.replace(/\/+$/, '');
  return { url: trim(url), publicUrl: trim(env.STORAGE_PUBLIC_URL || url), serviceKey };
}
