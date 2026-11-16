// Repositorios contra apps/api. Cada petición lleva el token de la sesión de Supabase Auth.
// En desarrollo (`npm run dev:real`) Vite reenvía /v1 a la API local; en el NAS, VITE_API_URL.
import { supabase } from '../auth/session';
import { sampleNotifications, sampleSearch } from './ejemploCabecera';
import type { CatalogRepository, Repositories } from './repositorios';
import { ApiError, type DocumentUpload, type StoredDocument } from './tipos';

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

/** Para lo que aún no tiene ruta en apps/api: la pantalla lo muestra como «Disponible próximamente». */
const notAvailable = (): Promise<never> =>
  Promise.reject(new ApiError(501, 'no_disponible', 'Disponible próximamente: aún no está en la API'));

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
    restore: (id: string) => request<never>('POST', `${path}/${id}/restore`),
  };
}

/** Subida de un documento en tres pasos: URL firmada, PUT directo a Storage (sin token) y registro. */
async function uploadDocument({ file, ...data }: DocumentUpload): Promise<StoredDocument> {
  const { uploadUrl, storagePath } = await request<{ uploadUrl: string; storagePath: string }>('POST', '/documents/uploads', {
    body: { entityType: data.entityType, entityId: data.entityId, fileName: file.name, mimeType: file.type, sizeBytes: file.size },
  });
  let res: Response;
  try {
    res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  } catch {
    throw new ApiError(0, 'sin_conexion', `No se ha podido subir ${file.name}: no se llega al almacén de ficheros`);
  }
  if (!res.ok) throw new ApiError(res.status, 'subida_fallida', `No se ha podido subir ${file.name} (error ${res.status} del almacén)`);
  return request('POST', '/documents', { body: { ...data, storagePath } });
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
    // La API puede devolver la lista tal cual o en { data }.
    cnae: { list: (query) => get<{ data: never[] } | never[]>('/cnae', query).then((r) => (Array.isArray(r) ? r : r.data)) },
    catalogItems: {
      list: (query) => get('/catalog-items', query),
      create: (body) => request('POST', '/catalog-items', { body }),
    },
    activity: { list: (query) => get('/activity', query) },
    documents: {
      ...crud('/documents'),
      upload: uploadDocument,
      downloadUrl: (id) => get<{ url: string }>(`/documents/${id}/download`).then((r) => r.url),
    },
    memberships: {
      list: (query) => get('/memberships', query),
      get: (id) => get(`/memberships/${id}`),
      create: (body) => request('POST', '/memberships', { body }),
      update: (id, body) => request('PATCH', `/memberships/${id}`, { body }),
      resendInvitation: (id) => request('POST', `/memberships/${id}/resend-invitation`),
      revokeInvitation: (id) => request('DELETE', `/memberships/${id}/invitation`),
    },
    companyLegal: {
      get: (id) => get(`/companies/${id}/legal`),
      save: (id, body) => request('PUT', `/companies/${id}/legal`, { body }),
    },
    companyBilling: {
      get: (id) => get(`/companies/${id}/billing-settings`),
      save: (id, body) => request('PUT', `/companies/${id}/billing-settings`, { body }),
    },
    numberSeries: {
      list: (query) => unwrap(get('/number-series', query)),
      create: (body) => request('POST', '/number-series', { body }),
      update: (id, body) => request('PATCH', `/number-series/${id}`, { body }),
    },
    contributionAccounts: crud('/contribution-accounts'),
    billableServices: crud('/billable-services'),
    tenantSettings: {
      get: () => get('/tenant-settings'),
      update: (body) => request('PATCH', '/tenant-settings', { body }),
    },

    // Pendiente de API. El buscador y los avisos siguen con los datos de ejemplo (sample: la cabecera lo
    // indica); cuando existan /v1/search y /v1/notifications, se cambian por las peticiones.
    search: sampleSearch(true),
    notifications: sampleNotifications(true),
    ettSettings: { get: notAvailable, update: notAvailable },
    portalAccess: { list: notAvailable, save: notAvailable, revoke: notAvailable },
  };
}
