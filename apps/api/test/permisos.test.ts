// Permisos finos por rol (role_permissions), comprobados por la API además de las RLS.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BRANCH, COMPANY, T, USER, adminSql, call, closeAll, tokenFor } from './helpers.js';

let admin: string;
let seleccion: string;

beforeAll(async () => {
  admin = await tokenFor(USER.adminA);
  seleccion = await tokenFor(USER.selA);
});
afterAll(async () => {
  await adminSql`delete from public.companies where tenant_id = ${T.A} and code like 'TEST-%'`;
  await adminSql`update public.profiles set active_tenant_id = ${T.B} where id = ${USER.multi}`;
  await closeAll();
});

describe('rol seleccion (sucursal A1)', () => {
  it('/v1/me: sus permisos y solo su sucursal', async () => {
    const res = await call('GET', '/v1/me', { token: seleccion });
    expect(res.status).toBe(200);
    expect(res.body.role).toMatchObject({ code: 'seleccion', scope: 'branch' });
    expect(res.body.permissions).toEqual(['addresses.write', 'module.seleccion']);
    expect(res.body.branches.map((b: { id: string }) => b.id)).toEqual([BRANCH.A1]);
  });

  it('lee sociedades, sucursales y roles', async () => {
    for (const path of ['/v1/companies', `/v1/companies/${COMPANY.A1}`, '/v1/branches', '/v1/roles', '/v1/permissions']) {
      expect((await call('GET', path, { token: seleccion })).status, path).toBe(200);
    }
  });

  it('no crea ni edita sociedades ni sucursales', async () => {
    const attempts = [
      ['POST', '/v1/companies', { code: 'TEST-S', name: 'No' }],
      ['PATCH', `/v1/companies/${COMPANY.A1}`, { name: 'No' }],
      ['POST', '/v1/branches', { companyId: COMPANY.A1, code: 'TEST-S', name: 'No' }],
      ['PATCH', `/v1/branches/${BRANCH.A1}`, { name: 'No' }],
    ] as const;
    for (const [method, path, body] of attempts) {
      const res = await call(method, path, { token: seleccion, body });
      expect(res.status, `${method} ${path}`).toBe(403);
      expect(res.body.error.code).toBe('sin_permiso');
    }
    const [company] = await adminSql`select name from public.companies where id = ${COMPANY.A1}`;
    expect(company!.name).toBe('Sociedad A');
  });

  it('no ve las membresías de la ETT (users.manage)', async () => {
    expect((await call('GET', '/v1/memberships', { token: seleccion })).status).toBe(403);
  });
});

describe('rol admin', () => {
  it('crea y edita una sociedad', async () => {
    const created = await call('POST', '/v1/companies', {
      token: admin,
      body: { code: 'TEST-1', name: 'Sociedad de prueba', email: 'contacto@example.test' },
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ code: 'TEST-1', companyType: 'ett', status: 'active', phone: null });
    expect(created.body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const updated = await call('PATCH', `/v1/companies/${created.body.id}`, { token: admin, body: { phone: '900000000' } });
    expect(updated.status).toBe(200);
    // Solo cambia lo enviado: el tipo y el estado siguen igual.
    expect(updated.body).toMatchObject({ phone: '900000000', companyType: 'ett', status: 'active', name: 'Sociedad de prueba' });

    const dup = await call('POST', '/v1/companies', { token: admin, body: { code: 'TEST-1', name: 'Repetida' } });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('conflicto');
  });

  it('al marcar una sucursal por defecto, la anterior deja de serlo', async () => {
    const company = await call('POST', '/v1/companies', { token: admin, body: { code: 'TEST-2', name: 'Con sucursales' } });
    const first = await call('POST', '/v1/branches', {
      token: admin,
      body: { companyId: company.body.id, code: 'S1', name: 'Primera', isDefault: true },
    });
    const second = await call('POST', '/v1/branches', {
      token: admin,
      body: { companyId: company.body.id, code: 'S2', name: 'Segunda', isDefault: true },
    });
    expect(second.status).toBe(201);
    expect((await call('GET', `/v1/branches/${first.body.id}`, { token: admin })).body.isDefault).toBe(false);

    const back = await call('PATCH', `/v1/branches/${first.body.id}`, { token: admin, body: { isDefault: true } });
    expect(back.body.isDefault).toBe(true);
    expect((await call('GET', `/v1/branches/${second.body.id}`, { token: admin })).body.isDefault).toBe(false);
  });

  it('ve las membresías con su rol y alcance', async () => {
    const res = await call('GET', '/v1/memberships?limit=2', { token: admin });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(4);
    const all = await call('GET', '/v1/memberships', { token: admin });
    const sel = all.body.data.find((m: { userId: string }) => m.userId === USER.selA);
    expect(sel).toMatchObject({
      fullName: 'Selección A',
      role: { code: 'seleccion' },
      contexts: [{ companyId: COMPANY.A1, branchId: BRANCH.A1, isDefault: true }],
    });
  });

  it('quitar un permiso al rol surte efecto al momento, con el mismo token', async () => {
    await adminSql`
      delete from public.role_permissions rp using public.roles r
      where r.id = rp.role_id and r.tenant_id = ${T.A} and r.code = 'admin' and rp.permission_code = 'companies.manage'`;
    try {
      const res = await call('PATCH', `/v1/companies/${COMPANY.A1}`, { token: admin, body: { phone: '1' } });
      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('companies.manage');
    } finally {
      await adminSql`
        insert into public.role_permissions (tenant_id, role_id, permission_code)
        select tenant_id, id, 'companies.manage' from public.roles where tenant_id = ${T.A} and code = 'admin'`;
    }
  });
});

describe('validación', () => {
  it('errores de validación con detalles por campo y mensajes en español', async () => {
    const res = await call('POST', '/v1/companies', { token: admin, body: { email: 'no-es-un-email' } });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validacion');
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['code', 'name', 'email']));
    expect(res.body.error.details[0].message).not.toMatch(/expected|invalid input/i);
  });

  it('PATCH vacío y paginación fuera de rango', async () => {
    expect((await call('PATCH', `/v1/companies/${COMPANY.A1}`, { token: admin, body: {} })).status).toBe(400);
    expect((await call('GET', '/v1/companies?limit=1000', { token: admin })).status).toBe(400);
    expect((await call('GET', '/v1/companies/no-es-uuid', { token: admin })).status).toBe(400);
  });
});

describe('cambio de ETT activa', () => {
  it('multi (activa B, admin) pasa a A (laboral): guarda el perfil y el token nuevo trae A', async () => {
    const tokenB = await tokenFor(USER.multi);
    expect((await call('GET', '/v1/me', { token: tokenB })).body.role.code).toBe('admin');

    const res = await call('POST', '/v1/me/active-tenant', { token: tokenB, body: { tenantId: T.A } });
    expect(res).toEqual({ status: 200, body: { activeTenantId: T.A, refreshRequired: true } });

    // Lo que haría refreshSession(): el hook emite el token con la ETT nueva.
    const tokenA = await tokenFor(USER.multi);
    const me = await call('GET', '/v1/me', { token: tokenA });
    expect(me.body.activeTenant.id).toBe(T.A);
    expect(me.body.role.code).toBe('laboral');
    expect(me.body.tenants.map((t: { id: string }) => t.id).sort()).toEqual([T.A, T.B].sort());
    expect((await call('POST', '/v1/companies', { token: tokenA, body: { code: 'TEST-M', name: 'No' } })).status).toBe(403);
  });

  it('no puede elegir una ETT de la que no es miembro', async () => {
    const token = await tokenFor(USER.selA);
    const res = await call('POST', '/v1/me/active-tenant', { token, body: { tenantId: T.B } });
    expect(res.status).toBe(403);
    const [profile] = await adminSql`select active_tenant_id from public.profiles where id = ${USER.selA}`;
    expect(profile!.active_tenant_id).not.toBe(T.B);
    // Ni una que no existe (misma respuesta).
    const missing = await call('POST', '/v1/me/active-tenant', {
      token,
      body: { tenantId: '99999999-9999-9999-9999-999999999999' },
    });
    expect(missing.status).toBe(403);
  });
});
