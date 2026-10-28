// Repositorios contra apps/api. Cada petición lleva el token de la sesión de Supabase Auth.
// En desarrollo (`npm run dev:real`) Vite reenvía /v1 a la API local; en el NAS, VITE_API_URL.
import { supabase } from '../auth/session';
import type { Repositories } from './repositorios';
import { ApiError } from './tipos';

const BASE = import.meta.env.VITE_API_URL ?? '';

type Query = Record<string, string | number | undefined>;

async function request<T>(method: string, path: string, options: { query?: Query; body?: unknown } = {}): Promise<T> {
  const url = new URL(BASE + '/v1' + path, window.location.origin);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const { data } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(url, { method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
  } catch {
    throw new ApiError(0, 'sin_conexion', 'No se puede conectar con el servidor');
  }

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const error = json?.error;
    throw new ApiError(res.status, error?.code ?? 'error_interno', error?.message ?? `Error ${res.status}`, error?.details);
  }
  return json as T;
}

const get = <T>(path: string, query?: Query) => request<T>('GET', path, { query });
const unwrap = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data);

export function apiRepositories(): Repositories {
  return {
    session: {
      me: () => get('/me'),
      async changeTenant(tenantId) {
        await request('POST', '/me/active-tenant', { body: { tenantId } });
        await supabase.auth.refreshSession();
      },
    },
    companies: {
      list: (query) => get('/companies', query),
      get: (id) => get(`/companies/${id}`),
      create: (body) => request('POST', '/companies', { body }),
      update: (id, body) => request('PATCH', `/companies/${id}`, { body }),
    },
    branches: {
      list: (query) => get('/branches', query),
      get: (id) => get(`/branches/${id}`),
      create: (body) => request('POST', '/branches', { body }),
      update: (id, body) => request('PATCH', `/branches/${id}`, { body }),
    },
    roles: {
      list: () => unwrap(get('/roles')),
      get: (id) => get(`/roles/${id}`),
      permissions: () => unwrap(get('/permissions')),
    },
    memberships: {
      list: (query) => get('/memberships', query),
      get: (id) => get(`/memberships/${id}`),
    },
  };
}
