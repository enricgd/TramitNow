// Supabase Storage para los documentos (bucket privado `documents`, ver db/README.md). La API es la única que
// tiene la service_role: firma las URL de subida y de descarga, comprueba lo subido y borra ficheros. La web sube y
// descarga directamente contra Storage con esas URL firmadas y caducadas.

import { ApiError } from './errors.js';

export interface StorageConfig {
  /** URL de Storage desde la API (en Docker, http://storage:5000). */
  url: string;
  /** URL de Storage tal como la ve el navegador (en el NAS, https://api.<dominio>/storage/v1). */
  publicUrl: string;
  /** service_role key del proyecto de Supabase. Secreto del servidor. */
  serviceKey: string;
}

export const DOCUMENTS_BUCKET = 'documents';
/** Validez de las URL firmadas. */
/** La fija Storage (UPLOAD_SIGNED_URL_EXPIRATION_TIME, 60 s por defecto): se pide justo antes de cada subida. */
export const UPLOAD_URL_TTL_SECONDS = 60;
export const DOWNLOAD_URL_TTL_SECONDS = 5 * 60;

export interface ObjectInfo {
  size: number;
  mimeType: string;
}

const unavailable = () =>
  new ApiError(503, 'servicio_no_disponible', 'El almacén de documentos no está disponible. Inténtalo más tarde.');

export class Storage {
  constructor(private readonly config: StorageConfig) {}

  private async request(method: string, path: string, body?: unknown): Promise<Response> {
    try {
      return await fetch(`${this.config.url}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.config.serviceKey}`,
          apikey: this.config.serviceKey,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      console.error('Storage no responde', err);
      throw unavailable();
    }
  }

  private async fail(res: Response, what: string): Promise<never> {
    console.error(`Storage: ${what} → ${res.status} ${await res.text().catch(() => '')}`);
    throw unavailable();
  }

  private objectPath(path: string) {
    return `${DOCUMENTS_BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
  }

  /** URL firmada para subir un fichero nuevo (PUT con el fichero como cuerpo). No sobrescribe. */
  async signedUploadUrl(path: string): Promise<string> {
    const res = await this.request('POST', `/object/upload/sign/${this.objectPath(path)}`, {});
    if (!res.ok) return this.fail(res, 'firmar subida');
    const { url } = (await res.json()) as { url: string };
    return `${this.config.publicUrl}${url}`;
  }

  /** URL firmada para descargar; `downloadName` hace que el navegador lo descargue con ese nombre. */
  async signedDownloadUrl(path: string, downloadName?: string): Promise<string> {
    const res = await this.request('POST', `/object/sign/${this.objectPath(path)}`, { expiresIn: DOWNLOAD_URL_TTL_SECONDS });
    if (!res.ok) return this.fail(res, 'firmar descarga');
    const { signedURL } = (await res.json()) as { signedURL: string };
    const url = `${this.config.publicUrl}${signedURL}`;
    return downloadName ? `${url}&download=${encodeURIComponent(downloadName)}` : url;
  }

  /** Sube un fichero generado en el servidor (p. ej. el PDF de una propuesta). No sobrescribe. */
  async upload(path: string, body: Uint8Array, mimeType: string): Promise<void> {
    let res: Response;
    try {
      res = await fetch(`${this.config.url}/object/${this.objectPath(path)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.serviceKey}`,
          apikey: this.config.serviceKey,
          'Content-Type': mimeType,
        },
        body,
        signal: AbortSignal.timeout(20_000),
      });
    } catch (err) {
      console.error('Storage no responde', err);
      throw unavailable();
    }
    if (!res.ok) return this.fail(res, 'subir fichero');
  }

  /** Tamaño y tipo del fichero subido, o null si no existe. */
  async info(path: string): Promise<ObjectInfo | null> {
    const res = await this.request('GET', `/object/info/authenticated/${this.objectPath(path)}`);
    if (res.status === 404 || res.status === 400) return null;
    if (!res.ok) return this.fail(res, 'consultar fichero');
    const body = (await res.json()) as { size?: number; content_type?: string; metadata?: { size?: number; mimetype?: string } };
    const size = body.metadata?.size ?? body.size;
    const mimeType = body.metadata?.mimetype ?? body.content_type;
    if (typeof size !== 'number' || typeof mimeType !== 'string') return null;
    return { size, mimeType };
  }

  /** Borra el fichero (si no existe, no hace nada). */
  async remove(path: string): Promise<void> {
    const res = await this.request('DELETE', `/object/${DOCUMENTS_BUCKET}`, { prefixes: [path] });
    if (!res.ok) return this.fail(res, 'borrar fichero');
  }
}

/** Para las rutas: falla con 503 si la API no tiene Storage configurado. */
export function requireStorage(storage: Storage | undefined): Storage {
  if (!storage) throw unavailable();
  return storage;
}
