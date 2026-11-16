// Administración de usuarios en Supabase Auth (GoTrue) con la service_role, para invitar usuarios desde Mi ETT.
// Como Storage, solo la API tiene la service_role; la web nunca.
//
// Aún no hay correo saliente: la invitación se crea con /admin/generate_link, que da de alta el usuario y devuelve el
// enlace sin enviar nada, y la API se lo devuelve al administrador para que lo envíe a mano. Con `sendsEmail` (cuando
// haya SMTP) se usa /invite, que lo envía Auth, y la API no devuelve enlace.

import { ApiError } from './errors.js';

export interface AuthAdminConfig {
  /** URL de GoTrue desde la API (en Docker, http://auth:9999; en local, http://127.0.0.1:9999). */
  url: string;
  /** service_role key del proyecto de Supabase. Secreto del servidor. */
  serviceKey: string;
  /** Página de la web a la que vuelve el enlace de invitación (donde el usuario pone su contraseña). */
  redirectUrl?: string;
  /** true cuando Auth tenga SMTP configurado: Auth envía el correo y la API no devuelve el enlace. */
  sendsEmail: boolean;
}

export interface Invitation {
  userId: string;
  /** null si el correo lo ha enviado Auth. */
  url: string | null;
}

const unavailable = () =>
  new ApiError(503, 'servicio_no_disponible', 'El servicio de usuarios no está disponible. Inténtalo más tarde.');

export class AuthAdmin {
  constructor(private readonly config: AuthAdminConfig) {}

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
      console.error('Auth no responde', err);
      throw unavailable();
    }
  }

  private async fail(res: Response, what: string): Promise<never> {
    const text = await res.text().catch(() => '');
    if (res.status === 422 && /email_exists|already been registered/i.test(text)) {
      throw new ApiError(409, 'conflicto', 'Ese email ya tiene una cuenta activa');
    }
    console.error(`Auth: ${what} → ${res.status} ${text}`);
    throw unavailable();
  }

  /** Crea (o vuelve a invitar) un usuario que aún no ha entrado nunca y devuelve el enlace de invitación. */
  async invite(email: string, fullName: string): Promise<Invitation> {
    const data = { full_name: fullName };
    const redirect = this.config.redirectUrl;
    if (this.config.sendsEmail) {
      const res = await this.request('POST', '/invite', { email, data, ...(redirect ? { redirect_to: redirect } : {}) });
      if (!res.ok) return this.fail(res, 'invitar');
      const user = (await res.json()) as { id: string };
      return { userId: user.id, url: null };
    }
    const res = await this.request('POST', '/admin/generate_link', {
      type: 'invite',
      email,
      data,
      ...(redirect ? { redirect_to: redirect } : {}),
    });
    if (!res.ok) return this.fail(res, 'generar invitación');
    const body = (await res.json()) as { id?: string; user?: { id: string }; action_link?: string; properties?: { action_link?: string } };
    const userId = body.id ?? body.user?.id;
    const url = body.action_link ?? body.properties?.action_link;
    if (!userId || !url) {
      console.error('Auth: respuesta de generate_link inesperada', Object.keys(body));
      throw unavailable();
    }
    return { userId, url };
  }

  /** Borra el usuario de Auth (su perfil y membresías caen en cascada). Si ya no existe, no hace nada. */
  async deleteUser(userId: string): Promise<void> {
    const res = await this.request('DELETE', `/admin/users/${encodeURIComponent(userId)}`);
    if (!res.ok && res.status !== 404) return this.fail(res, 'borrar usuario');
  }
}

/** Para las rutas: falla con 503 si la API no tiene Auth configurado. */
export function requireAuthAdmin(authAdmin: AuthAdmin | undefined): AuthAdmin {
  if (!authAdmin) throw unavailable();
  return authAdmin;
}
