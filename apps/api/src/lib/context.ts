// Contexto de cada petición: una transacción con los claims del usuario y, para las rutas de la ETT,
// la ETT activa, el rol y los permisos finos leídos de role_permissions en esa misma transacción.
// Los permisos no van en el JWT: quitar un permiso o bloquear una membresía surte efecto al momento.

import type { Context } from 'hono';
import type { AuthVariables, Claims } from './auth.js';
import { type Tx, type Sql, withClaims } from './db.js';
import { ApiError, forbidden } from './errors.js';

export type AppEnv = { Variables: AuthVariables & { sql: Sql } };

export interface UserContext {
  userId: string;
  claims: Claims;
}

export interface TenantContext extends UserContext {
  /** ETT activa (la del token), ya comprobada contra memberships. Filtra SIEMPRE por ella. */
  tenantId: string;
  isSuperadmin: boolean;
  role: { id: string; code: string; name: string; scope: string } | null;
  permissions: ReadonlySet<string>;
}

/** Transacción como el usuario del token, sin exigir ETT activa (p. ej. /v1/me). */
export function withUser<T>(c: Context<AppEnv>, fn: (tx: Tx, ctx: UserContext) => Promise<T>): Promise<T> {
  const claims = c.get('claims');
  return withClaims(c.get('sql'), claims, (tx) => fn(tx, { userId: claims.sub, claims }));
}

/**
 * Transacción como el usuario del token en su ETT activa. Si se indica `permission`, exige ese permiso
 * fino (además de las RLS, que lo vuelven a comprobar al escribir).
 */
export function withTenant<T>(
  c: Context<AppEnv>,
  options: { permission?: string },
  fn: (tx: Tx, ctx: TenantContext) => Promise<T>,
): Promise<T> {
  return withUser(c, async (tx, user) => {
    const ctx = await loadTenantContext(tx, user);
    if (options.permission) requirePermission(ctx, options.permission);
    return fn(tx, ctx);
  });
}

export function requirePermission(ctx: TenantContext, permission: string): void {
  if (!ctx.permissions.has(permission)) {
    throw forbidden(`No tienes permiso para esta acción (${permission})`);
  }
}

interface AccessRow {
  memberTenantId: string | null;
  isSuperadmin: boolean;
  profileStatus: string | null;
}

/** ETT activa del token, validada; null si el token no trae ETT o el usuario ya no tiene acceso. */
export async function resolveTenant(tx: Tx, claims: Claims): Promise<{ tenantId: string | null } & AccessRow> {
  const [access] = await tx<AccessRow[]>`
    select private.current_tenant_id() as member_tenant_id,
           private.is_superadmin() as is_superadmin,
           (select p.status from public.profiles p where p.id = auth.uid() and p.deleted_at is null) as profile_status
  `;
  if (!access) throw new Error('Sin resultado al resolver la ETT activa');
  const claimTenant = claims.tenant_id ?? null;

  let tenantId = access.memberTenantId;
  if (!tenantId && access.isSuperadmin && claimTenant) {
    // El superadmin puede trabajar en cualquier ETT existente, sea o no miembro.
    const [tenant] = await tx<{ id: string }[]>`
      select id from public.tenants where id = ${claimTenant} and deleted_at is null
    `;
    tenantId = tenant?.id ?? null;
  }
  return { ...access, tenantId };
}

async function loadTenantContext(tx: Tx, user: UserContext): Promise<TenantContext> {
  const access = await resolveTenant(tx, user.claims);
  if (access.profileStatus !== 'active') {
    throw new ApiError(403, 'usuario_bloqueado', 'Tu usuario está bloqueado o inactivo');
  }
  if (!user.claims.tenant_id) {
    throw new ApiError(403, 'sin_ett_activa', 'Tu usuario no tiene ninguna ETT activa');
  }
  if (!access.tenantId) {
    throw new ApiError(
      403,
      'sin_ett_activa',
      'Ya no tienes acceso a la ETT de tu sesión. Vuelve a iniciar sesión o cambia de ETT.',
    );
  }

  const [membership] = await tx<{ id: string; code: string; name: string; scope: string; permissions: string[] }[]>`
    select r.id, r.code, r.name, r.scope,
           coalesce(array_agg(rp.permission_code order by rp.permission_code)
                    filter (where rp.permission_code is not null), '{}') as permissions
    from public.memberships m
    join public.roles r on r.tenant_id = m.tenant_id and r.id = m.role_id and r.deleted_at is null
    left join public.role_permissions rp on rp.tenant_id = m.tenant_id and rp.role_id = m.role_id
    where m.user_id = auth.uid() and m.tenant_id = ${access.tenantId}
      and m.status = 'active' and m.deleted_at is null
    group by r.id
  `;

  let permissions = membership?.permissions ?? [];
  if (access.isSuperadmin) {
    const all = await tx<{ code: string }[]>`select code from public.permissions order by code`;
    permissions = all.map((p) => p.code);
  }

  return {
    ...user,
    tenantId: access.tenantId,
    isSuperadmin: access.isSuperadmin,
    role: membership ? { id: membership.id, code: membership.code, name: membership.name, scope: membership.scope } : null,
    permissions: new Set(permissions),
  };
}
