// Catálogos oficiales (lectura para todos), catálogos laborales de la ETT y direcciones.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { T, USER, adminSql, call, closeAll, tokenFor } from './helpers.js';

let adminA: string;
let adminB: string;
let seleccion: string;
let nobody: string;

beforeAll(async () => {
  adminA = await tokenFor(USER.adminA);
  adminB = await tokenFor(USER.adminB);
  seleccion = await tokenFor(USER.selA);
  nobody = await tokenFor(USER.nobody);
});
afterAll(async () => {
  for (const table of ['collective_agreements', 'professional_categories', 'contract_types', 'payroll_concepts']) {
    await adminSql`delete from ${adminSql(`public.${table}`)} where tenant_id in (${T.A}, ${T.B}) and code like 'TEST-%'`;
  }
  await adminSql`delete from public.addresses where tenant_id = ${T.A} and street like 'TEST %'`;
  await closeAll();
});

describe('catálogos oficiales', () => {
  it('los lee cualquier usuario con sesión, aunque no tenga ETT', async () => {
    const communities = await call('GET', '/v1/catalogs/autonomous-communities', { token: nobody });
    expect(communities.status).toBe(200);
    expect(communities.body.data).toHaveLength(19);

    const provinces = await call('GET', '/v1/catalogs/provinces?autonomousCommunityCode=09', { token: nobody });
    expect(provinces.body.data.map((p: { code: string }) => p.code).sort()).toEqual(['08', '17', '25', '43']);
  });

  it('sin token, no', async () => {
    expect((await call('GET', '/v1/catalogs/countries')).status).toBe(401);
  });

  it('municipios: exige provincia o texto, y busca por nombre', async () => {
    const all = await call('GET', '/v1/catalogs/municipalities', { token: seleccion });
    expect(all.status).toBe(400);
    expect(all.body.error.code).toBe('validacion');

    const found = await call('GET', '/v1/catalogs/municipalities?provinceCode=28&q=madrid', { token: seleccion });
    expect(found.status).toBe(200);
    expect(found.body.data.map((m: { code: string }) => m.code)).toContain('28079');

    const one = await call('GET', '/v1/catalogs/municipalities/28079', { token: seleccion });
    expect(one.body).toMatchObject({ code: '28079', provinceCode: '28', name: 'Madrid', active: true });
    expect((await call('GET', '/v1/catalogs/municipalities/99999', { token: seleccion })).status).toBe(404);
  });

  it('países y claves de contrato', async () => {
    const countries = await call('GET', '/v1/catalogs/countries?q=es', { token: seleccion });
    expect(countries.body.data.find((c: { code: string }) => c.code === 'ES')).toMatchObject({ euMember: true });

    const keys = await call('GET', '/v1/catalogs/contract-keys', { token: seleccion });
    expect(keys.body.data.every((k: { active: boolean }) => k.active)).toBe(true);
    expect(keys.body.data.find((k: { code: string }) => k.code === '402')).toMatchObject({ duration: 'temporary' });
    const withInactive = await call('GET', '/v1/catalogs/contract-keys?includeInactive=true', { token: seleccion });
    expect(withInactive.body.data.length).toBeGreaterThan(keys.body.data.length);
  });
});

describe('catálogos laborales de la ETT', () => {
  it('admin crea, edita, lista y da de baja un convenio', async () => {
    const created = await call('POST', '/v1/collective-agreements', {
      token: adminA,
      body: { code: 'TEST-CONV', name: 'Convenio ficticio de prueba', scope: 'provincial', provinceCode: '08', validFrom: '2026-01-01' },
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ code: 'TEST-CONV', status: 'active', validFrom: '2026-01-01', validTo: null });
    const id = created.body.id;

    const updated = await call('PATCH', `/v1/collective-agreements/${id}`, { token: adminA, body: { validTo: '2026-12-31' } });
    expect(updated.body.validTo).toBe('2026-12-31');

    const list = await call('GET', '/v1/collective-agreements?q=test-conv&provinceCode=08', { token: adminA });
    expect(list.body.pagination.total).toBe(1);

    const duplicate = await call('POST', '/v1/collective-agreements', { token: adminA, body: { code: 'TEST-CONV', name: 'Otro' } });
    expect(duplicate.status).toBe(409);

    expect((await call('DELETE', `/v1/collective-agreements/${id}`, { token: adminA })).status).toBe(204);
    expect((await call('GET', `/v1/collective-agreements/${id}`, { token: adminA })).status).toBe(404);
    expect((await call('DELETE', `/v1/collective-agreements/${id}`, { token: adminA })).status).toBe(404);
  });

  it('selección los lee pero no los escribe (labor_catalogs.manage)', async () => {
    const list = await call('GET', '/v1/contract-types?contractKeyCode=402', { token: seleccion });
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);

    const res = await call('POST', '/v1/payroll-concepts', { token: seleccion, body: { code: 'TEST-HN', name: 'No' } });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('sin_permiso');
  });

  it('cada ETT ve solo lo suyo y no puede referenciar lo de otra', async () => {
    const created = await call('POST', '/v1/collective-agreements', { token: adminB, body: { code: 'TEST-B', name: 'Convenio B' } });
    expect(created.status).toBe(201);

    expect((await call('GET', `/v1/collective-agreements/${created.body.id}`, { token: adminA })).status).toBe(404);
    expect((await call('PATCH', `/v1/collective-agreements/${created.body.id}`, { token: adminA, body: { name: 'X' } })).status).toBe(404);

    const cross = await call('POST', '/v1/professional-categories', {
      token: adminA,
      body: { code: 'TEST-CAT', name: 'Categoría', agreementId: created.body.id },
    });
    expect(cross.status).toBe(422);
    expect(cross.body.error.code).toBe('referencia_invalida');
  });

  it('valida con las reglas de la tabla', async () => {
    const res = await call('POST', '/v1/payroll-concepts', {
      token: adminA,
      body: { code: 'TEST-PCT', name: 'Porcentaje sin base', calculation: 'percentage', defaultValue: 4.5 },
    });
    expect(res.status).toBe(422);

    const ok = await call('POST', '/v1/payroll-concepts', {
      token: adminA,
      body: { code: 'TEST-PCT', name: 'Plus', calculation: 'percentage', calculationBase: 'gross_hourly_salary', defaultValue: 4.5 },
    });
    expect(ok.status).toBe(201);
    expect(ok.body.defaultValue).toBe(4.5);

    const badKey = await call('POST', '/v1/contract-types', { token: adminA, body: { code: 'TEST-K', name: 'X', contractKeyCode: '599' } });
    expect(badKey.status).toBe(422);
  });
});

describe('direcciones', () => {
  it('se crean con los códigos oficiales y España por defecto', async () => {
    const created = await call('POST', '/v1/addresses', {
      token: seleccion,
      body: { street: 'TEST Calle Mayor', number: '1', postalCode: '28013', provinceCode: '28', municipalityCode: '28079' },
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ countryCode: 'ES', municipalityCode: '28079' });

    const moved = await call('PATCH', `/v1/addresses/${created.body.id}`, { token: seleccion, body: { municipalityCode: '08019' } });
    expect(moved.status).toBe(422);
  });

  it('fuera de España, sin provincia y con población en texto', async () => {
    const res = await call('POST', '/v1/addresses', {
      token: adminA,
      body: { street: 'TEST Rue Exemple', city: 'Perpignan', countryCode: 'FR' },
    });
    expect(res.status).toBe(201);
    const bad = await call('POST', '/v1/addresses', { token: adminA, body: { street: 'TEST Rue', countryCode: 'FR', provinceCode: '08' } });
    expect(bad.status).toBe(422);
  });

  it('otra ETT no la ve', async () => {
    const [row] = await adminSql`select id from public.addresses where tenant_id = ${T.A} limit 1`;
    expect((await call('GET', `/v1/addresses/${row!.id}`, { token: adminB })).status).toBe(404);
  });
});
