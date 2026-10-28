// Repositorios contra apps/api. Cada petición lleva el token de la sesión de Supabase Auth.
// En desarrollo (`npm run dev:real`) Vite reenvía /v1 a la API local; en el NAS, VITE_API_URL.
import { supabase } from '../auth/session';
import type { CatalogRepository, Repositories } from './repositorios';
import { ApiError } from './tipos';

const BASE = import.meta.env.VITE_API_URL ?? '';

type Query = Record<string, string | number | boolean | undefined>;

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

  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const error = json?.error;
    throw new ApiError(res.status, error?.code ?? 'error_interno', error?.message ?? `Error ${res.status}`, error?.details);
  }
  return json as T;
}

const get = <T>(path: string, query?: Query) => request<T>('GET', path, { query });
const unwrap = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data);

/** Listar, ver, crear, editar y dar de baja: el patrón de las rutas de apps/api/src/lib/crud.ts. */
function crud(path: string) {
  return {
    list: (query?: object) => get<never>(path, query as Query),
    get: (id: string) => get<never>(`${path}/${id}`),
    create: (body: unknown) => request<never>('POST', path, { body }),
    update: (id: string, body: unknown) => request<never>('PATCH', `${path}/${id}`, { body }),
    remove: (id: string) => request<void>('DELETE', `${path}/${id}`),
  };
}

function catalog<T extends { code: string; name: string }, Q extends Query>(path: string): CatalogRepository<T, Q> {
  return {
    list: (query) => get(path, query),
    get: (id) => get(`${path}/${id}`),
    create: (body) => request('POST', path, { body }),
    update: (id, body) => request('PATCH', `${path}/${id}`, { body }),
    remove: (id) => request('DELETE', `${path}/${id}`),
  };
}

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
    catalogs: {
      autonomousCommunities: () => unwrap(get('/catalogs/autonomous-communities')),
      provinces: (query) => unwrap(get('/catalogs/provinces', query)),
      municipalities: (query) => unwrap(get('/catalogs/municipalities', query)),
      municipality: (code) => get(`/catalogs/municipalities/${code}`),
      countries: (query) => unwrap(get('/catalogs/countries', query)),
      contractKeys: (query) => unwrap(get('/catalogs/contract-keys', query)),
    },
    addresses: {
      get: (id) => get(`/addresses/${id}`),
      create: (body) => request('POST', '/addresses', { body }),
      update: (id, body) => request('PATCH', `/addresses/${id}`, { body }),
      remove: (id) => request('DELETE', `/addresses/${id}`),
    },
    collectiveAgreements: catalog('/collective-agreements'),
    professionalCategories: catalog('/professional-categories'),
    contractTypes: catalog('/contract-types'),
    payrollConcepts: catalog('/payroll-concepts'),
    clients: {
      ...crud('/clients'),
      billing: (id) => get(`/clients/${id}/billing`),
      saveBilling: (id, body) => request('PUT', `/clients/${id}/billing`, { body }),
    },
    clientCenters: crud('/client-centers'),
    clientContacts: crud('/client-contacts'),
    memberships: {
      list: (query) => get('/memberships', query),
      get: (id) => get(`/memberships/${id}`),
    },
  };
}
