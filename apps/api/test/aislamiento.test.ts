// Con un token de la ETT A, la API nunca devuelve ni modifica nada de la ETT B.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BRANCH, COMPANY, T, USER, adminSql, call, closeAll, tokenFor } from './helpers.js';

let tokenA: string;

beforeAll(async () => {
  tokenA = await tokenFor(USER.adminA);
});
afterAll(async () => {
  await adminSql`delete from public.companies where tenant_id = ${T.A} and code like 'TEST-%'`;
  await closeAll();
});

const companyB = async () => (await adminSql`select name, phone from public.companies where id = ${COMPANY.B1}`)[0];
const branchB = async () => (await adminSql`select name, is_default from public.branches where id = ${BRANCH.B1}`)[0];

describe('lectura', () => {
  it('lista solo sociedades de A', async () => {
    const res = await call('GET', '/v1/companies?limit=200', { token: tokenA });
    expect(res.status).toBe(200);
    const ids = res.body.data.map((c: { id: string }) => c.id);
    expect(ids).toContain(COMPANY.A1);
    expect(ids).not.toContain(COMPANY.B1);
    const [count] = await adminSql<{ n: number }[]>`
      select count(*)::int as n from public.companies where tenant_id = ${T.A} and deleted_at is null`;
    expect(res.body.pagination).toEqual({ limit: 200, offset: 0, total: count!.n });
  });

  it('lista solo sucursales de A, también filtrando por una sociedad de B', async () => {
    const res = await call('GET', '/v1/branches', { token: tokenA });
    expect(res.body.data.map((b: { id: string }) => b.id).sort()).toEqual([BRANCH.A1, BRANCH.A2].sort());
    const filtered = await call('GET', `/v1/branches?companyId=${COMPANY.B1}`, { token: tokenA });
    expect(filtered.status).toBe(200);
    expect(filtered.body.data).toEqual([]);
    expect(filtered.body.pagination.total).toBe(0);
  });

  it('una sociedad, sucursal, rol o membresía de B da 404', async () => {
    const [roleB] = await adminSql`select id from public.roles where tenant_id = ${T.B} and code = 'admin'`;
    const [membershipB] = await adminSql`select id from public.memberships where tenant_id = ${T.B} limit 1`;
    for (const path of [
      `/v1/companies/${COMPANY.B1}`,
      `/v1/branches/${BRANCH.B1}`,
      `/v1/roles/${roleB!.id}`,
      `/v1/memberships/${membershipB!.id}`,
    ]) {
      const res = await call('GET', path, { token: tokenA });
      expect(res.status, path).toBe(404);
      expect(res.body.error.code).toBe('no_encontrado');
    }
  });

  it('roles y membresías: solo los de A', async () => {
    const roles = await call('GET', '/v1/roles', { token: tokenA });
    const [roleIdsA] = await adminSql<{ ids: string[] }[]>`
      select array_agg(id::text order by id) as ids from public.roles where tenant_id = ${T.A}`;
    expect(roles.body.data.map((r: { id: string }) => r.id).sort()).toEqual(roleIdsA!.ids.sort());

    const members = await call('GET', '/v1/memberships', { token: tokenA });
    expect(members.status).toBe(200);
    const userIds = members.body.data.map((m: { userId: string }) => m.userId);
    expect(userIds).toContain(USER.adminA);
    expect(userIds).not.toContain(USER.adminB);
    // multi es miembro de A (laboral) y de B (admin): solo aparece su membresía de A.
    const multi = members.body.data.filter((m: { userId: string }) => m.userId === USER.multi);
    expect(multi).toHaveLength(1);
    expect(multi[0].role.code).toBe('laboral');
  });

  it('/v1/me: ETT activa A y solo ETT de las que es miembro', async () => {
    const res = await call('GET', '/v1/me', { token: tokenA });
    expect(res.body.activeTenant.id).toBe(T.A);
    expect(res.body.tenants.map((t: { id: string }) => t.id)).toEqual([T.A]);
    expect(res.body.branches.map((b: { id: string }) => b.id).sort()).toEqual([BRANCH.A1, BRANCH.A2].sort());
  });
});

describe('escritura', () => {
  it('no edita una sociedad de B', async () => {
    const before = await companyB();
    const res = await call('PATCH', `/v1/companies/${COMPANY.B1}`, { token: tokenA, body: { name: 'Hackeada', phone: '000' } });
    expect(res.status).toBe(404);
    expect(await companyB()).toEqual(before);
  });

  it('no edita una sucursal de B', async () => {
    const before = await branchB();
    const res = await call('PATCH', `/v1/branches/${BRANCH.B1}`, { token: tokenA, body: { name: 'Hackeada', isDefault: false } });
    expect(res.status).toBe(404);
    expect(await branchB()).toEqual(before);
  });

  it('no crea una sucursal en una sociedad de B', async () => {
    const res = await call('POST', '/v1/branches', {
      token: tokenA,
      body: { companyId: COMPANY.B1, code: 'TEST-X', name: 'Intrusa', isDefault: true },
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('referencia_invalida');
    const rows = await adminSql`select 1 from public.branches where code = 'TEST-X'`;
    expect(rows).toHaveLength(0);
    // Y la de B sigue siendo la sucursal por defecto.
    expect((await branchB())!.is_default).toBe(true);
  });

  it('no acepta tenant_id en el cuerpo: la ETT sale siempre del token', async () => {
    const res = await call('POST', '/v1/companies', {
      token: tokenA,
      body: { code: 'TEST-T', name: 'Con tenant', tenantId: T.B },
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validacion');

    const ok = await call('POST', '/v1/companies', { token: tokenA, body: { code: 'TEST-T', name: 'Sin tenant' } });
    expect(ok.status).toBe(201);
    const [row] = await adminSql`select tenant_id from public.companies where id = ${ok.body.id}`;
    expect(row!.tenant_id).toBe(T.A);
  });

  it('no puede referenciar una dirección de B', async () => {
    const res = await call('POST', '/v1/companies', {
      token: tokenA,
      body: { code: 'TEST-D', name: 'Dirección ajena', addressId: '50000000-0000-0000-0000-0000000000b1' },
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('referencia_invalida');
  });
});

describe('superadmin', () => {
  it('con la ETT B activa solo ve B, aunque las RLS le dejen ver todas', async () => {
    const token = await tokenFor(USER.super);
    const res = await call('GET', '/v1/companies?limit=200', { token });
    expect(res.status).toBe(200);
    const ids = res.body.data.map((c: { id: string }) => c.id);
    expect(ids).toContain(COMPANY.B1);
    expect(ids).not.toContain(COMPANY.A1);
    const me = await call('GET', '/v1/me', { token });
    expect(me.body).toMatchObject({ isSuperadmin: true, activeTenant: { id: T.B }, role: null });
    expect(me.body.permissions).toContain('companies.manage');
  });
});
