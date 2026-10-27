// Autenticación: sin token o con token manipulado → 401; token válido sin ETT → 403.

import { SignJWT } from 'jose';
import { afterAll, describe, expect, it } from 'vitest';
import { T, USER, apiSql, call, closeAll, hookClaims, secret, tokenFor } from './helpers.js';

afterAll(closeAll);

describe('rutas públicas', () => {
  it('GET /health responde sin token', async () => {
    const res = await call('GET', '/health');
    expect(res).toEqual({ status: 200, body: { status: 'ok', database: 'ok' } });
  });

  it('GET /openapi.json describe las rutas de /v1', async () => {
    const res = await call('GET', '/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.1.0');
    expect(Object.keys(res.body.paths)).toEqual(
      expect.arrayContaining(['/v1/me', '/v1/me/active-tenant', '/v1/companies', '/v1/companies/{id}', '/v1/branches', '/v1/roles', '/v1/memberships']),
    );
    expect(res.body.components.securitySchemes.bearerAuth).toMatchObject({ type: 'http', scheme: 'bearer' });
  });

  it('una ruta inexistente da 404 con el formato de error', async () => {
    const res = await call('GET', '/no-existe');
    expect(res).toEqual({ status: 404, body: { error: { code: 'no_encontrado', message: 'Ruta no encontrada' } } });
  });
});

describe('401 sin token válido', () => {
  const expect401 = async (headers: Record<string, string>) => {
    const res = await call('GET', '/v1/me', { headers });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('no_autenticado');
    expect(typeof res.body.error.message).toBe('string');
    // Ni siquiera llega a /v1/companies.
    const res2 = await call('GET', '/v1/companies', { headers });
    expect(res2.status).toBe(401);
  };

  it('sin cabecera Authorization', () => expect401({}));
  it('cabecera mal formada', () => expect401({ Authorization: 'Token abc' }));
  it('token que no es un JWT', () => expect401({ Authorization: 'Bearer no-es-un-jwt' }));

  it('token firmado con otro secreto', async () => {
    const token = await tokenFor(USER.adminA, {}, { secret: 'otro-secreto-que-no-es-el-de-supabase-auth-local' });
    await expect401({ Authorization: `Bearer ${token}` });
  });

  it('token con el payload manipulado (firma original)', async () => {
    const token = await tokenFor(USER.adminA);
    const [header, payload, signature] = token.split('.');
    const claims = JSON.parse(Buffer.from(payload!, 'base64url').toString());
    claims.tenant_id = T.B;
    const forged = Buffer.from(JSON.stringify(claims)).toString('base64url');
    await expect401({ Authorization: `Bearer ${header}.${forged}.${signature}` });
  });

  it('token sin firma (alg none)', async () => {
    const claims = await hookClaims(USER.adminA);
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ ...claims, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
    await expect401({ Authorization: `Bearer ${header}.${payload}.` });
  });

  it('token caducado', async () => {
    const token = await tokenFor(USER.adminA, {}, { expiresIn: Math.floor(Date.now() / 1000) - 60 });
    const res = await call('GET', '/v1/me', { token });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/caducado/);
  });

  it('token sin caducidad', async () => {
    const token = await new SignJWT({ ...(await hookClaims(USER.adminA)) })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(new TextEncoder().encode(secret));
    await expect401({ Authorization: `Bearer ${token}` });
  });

  it('token de otra audiencia', async () => {
    await expect401({ Authorization: `Bearer ${await tokenFor(USER.adminA, { aud: 'otra' })}` });
  });

  it('token de anon o de service_role (no es un usuario)', async () => {
    await expect401({ Authorization: `Bearer ${await tokenFor(USER.adminA, { role: 'anon' })}` });
    await expect401({ Authorization: `Bearer ${await tokenFor(USER.adminA, { role: 'service_role' })}` });
  });

  it('tenant_id que no es un uuid', async () => {
    await expect401({ Authorization: `Bearer ${await tokenFor(USER.adminA, { tenant_id: "x' or 1=1" })}` });
  });
});

describe('403 con token válido pero sin acceso', () => {
  it('usuario sin ETT: /v1/me sin ETT activa y el resto 403 sin_ett_activa', async () => {
    const token = await tokenFor(USER.nobody);
    const me = await call('GET', '/v1/me', { token });
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ activeTenant: null, role: null, permissions: [], branches: [], tenants: [] });

    const res = await call('GET', '/v1/companies', { token });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('sin_ett_activa');
  });

  it('tenant_id de una ETT de la que no es miembro, aunque el token esté bien firmado', async () => {
    const token = await tokenFor(USER.adminA, { tenant_id: T.B });
    const res = await call('GET', '/v1/companies', { token });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('sin_ett_activa');
    expect((await call('GET', '/v1/me', { token })).body.activeTenant).toBeNull();
  });

  it('usuario con el perfil bloqueado', async () => {
    const token = await tokenFor(USER.blocked, { tenant_id: T.A });
    const res = await call('GET', '/v1/companies', { token });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('usuario_bloqueado');
  });
});

describe('conexiones del pool', () => {
  it('no se quedan con el rol ni los claims de la petición', async () => {
    const token = await tokenFor(USER.adminA);
    await Promise.all([call('GET', '/v1/companies', { token }), call('GET', '/v1/me', { token })]);
    // Un error a mitad de transacción también tiene que deshacerlo todo.
    await call('POST', '/v1/companies', { token, body: { code: 'A', name: 'Duplicada' } });
    for (let i = 0; i < 4; i++) {
      const [row] = await apiSql<{ currentUser: string; claims: string | null }[]>`
        select current_user, nullif(current_setting('request.jwt.claims', true), '') as claims
      `;
      expect(row).toEqual({ currentUser: 'tramitnow_api', claims: null });
    }
  });
});

describe('login real con Supabase Auth local', () => {
  it('el access_token de /token sirve para /v1/me', async () => {
    const res = await fetch(`${process.env.AUTH_URL}/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: process.env.DEMO_EMAIL, password: process.env.DEMO_PASSWORD }),
    });
    expect(res.status).toBe(200);
    const { access_token } = (await res.json()) as { access_token: string };

    const me = await call('GET', '/v1/me', { token: access_token });
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(process.env.DEMO_EMAIL);
    expect(me.body.activeTenant.code).toBe('DEMO');
    expect(me.body.role.code).toBe('admin');
    expect(me.body.permissions).toContain('companies.manage');
    expect(me.body.branches.map((b: { code: string }) => b.code).sort()).toEqual(['NORTE', 'SUR']);
  });
});
