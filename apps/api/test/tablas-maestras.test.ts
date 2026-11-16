// Tablas maestras (/v1/catalog-items?type=) y filtro por sucursal de las listas de crud.ts.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BRANCH, COMPANY, T, USER, adminSql, call, closeAll, tokenFor } from './helpers.js';

let admin: string;
let adminB: string;
let seleccion: string;

beforeAll(async () => {
  admin = await tokenFor(USER.adminA);
  adminB = await tokenFor(USER.adminB);
  seleccion = await tokenFor(USER.selA);
});
afterAll(async () => {
  await adminSql`delete from public.catalog_items where tenant_id in (${T.A}, ${T.B}) and catalog <> 'geo_zone'`;
  await adminSql`delete from public.clients where tenant_id = ${T.A} and code like 'TEST-SUC-%'`;
  await closeAll();
});

describe('tablas maestras', () => {
  it('lista los tipos', async () => {
    const res = await call('GET', '/v1/catalog-types', { token: seleccion });
    expect(res.status).toBe(200);
    expect(res.body.data.map((t: { code: string }) => t.code)).toEqual(
      expect.arrayContaining(['payment_method', 'vat_regime', 'quote_rejection_reason', 'vacancy_cancellation_reason',
        'assignment_end_reason', 'incident_type', 'document_type']),
    );
  });

  it('admin crea valores solo con nombre; el nombre es único por tipo sin distinguir mayúsculas', async () => {
    const created = await call('POST', '/v1/catalog-items', { token: admin, body: { type: 'incident_type', name: 'Logística' } });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ type: 'incident_type', name: 'Logística', code: null, status: 'active', retentionRequired: false, metadata: {} });

    const dup = await call('POST', '/v1/catalog-items', { token: admin, body: { type: 'incident_type', name: 'LOGÍSTICA' } });
    expect(dup.status).toBe(409);
    expect(dup.body.error.message).toBe('Ya existe un valor con ese nombre en esta tabla maestra');

    const otherTenant = await call('POST', '/v1/catalog-items', { token: adminB, body: { type: 'incident_type', name: 'Logística' } });
    expect(otherTenant.status).toBe(201);
  });

  it('tipo inexistente o conservación fuera de los tipos de documento: 422', async () => {
    const badType = await call('POST', '/v1/catalog-items', { token: admin, body: { type: 'inventado', name: 'X' } });
    expect(badType.status).toBe(422);
    const retention = await call('POST', '/v1/catalog-items', {
      token: admin,
      body: { type: 'incident_type', name: 'Con conservación', retentionRequired: true },
    });
    expect(retention.status).toBe(422);
    const docType = await call('POST', '/v1/catalog-items', {
      token: admin,
      body: { type: 'document_type', name: 'Contrato', code: 'CONTRATO', retentionRequired: true, metadata: { orden: 1 } },
    });
    expect(docType.status).toBe(201);
    expect(docType.body).toMatchObject({ retentionRequired: true, metadata: { orden: 1 } });
  });

  it('la lista exige el tipo y solo devuelve los de la ETT activa', async () => {
    expect((await call('GET', '/v1/catalog-items', { token: admin })).status).toBe(400);
    const list = await call('GET', '/v1/catalog-items?type=incident_type', { token: seleccion });
    expect(list.status).toBe(200);
    expect(list.body.data.map((i: { name: string }) => i.name)).toEqual(['Logística']);
    expect(list.body.pagination.total).toBe(1);
    const search = await call('GET', '/v1/catalog-items?type=document_type&q=contr', { token: admin });
    expect(search.body.data).toHaveLength(1);
  });

  it('editar: no cambia el tipo; sin catalogs.manage no escribe; otra ETT no lo ve', async () => {
    const list = await call('GET', '/v1/catalog-items?type=incident_type', { token: admin });
    const id = list.body.data[0].id;
    const typeChange = await call('PATCH', `/v1/catalog-items/${id}`, { token: admin, body: { type: 'incident_type' } });
    expect(typeChange.status).toBe(400);
    const renamed = await call('PATCH', `/v1/catalog-items/${id}`, { token: admin, body: { name: 'Logística y transporte' } });
    expect(renamed.status).toBe(200);
    expect(renamed.body.name).toBe('Logística y transporte');

    expect((await call('PATCH', `/v1/catalog-items/${id}`, { token: seleccion, body: { name: 'No' } })).status).toBe(403);
    expect((await call('POST', '/v1/catalog-items', { token: seleccion, body: { type: 'incident_type', name: 'No' } })).status).toBe(403);
    expect((await call('GET', `/v1/catalog-items/${id}`, { token: adminB })).status).toBe(404);
    expect((await call('DELETE', `/v1/catalog-items/${id}`, { token: adminB })).status).toBe(404);

    expect((await call('DELETE', `/v1/catalog-items/${id}`, { token: admin })).status).toBe(204);
    const again = await call('POST', '/v1/catalog-items', { token: admin, body: { type: 'incident_type', name: 'Logística y transporte' } });
    expect(again.status).toBe(201);
  });
});

describe('filtro por sucursal (?branchId=)', () => {
  beforeAll(async () => {
    for (const [code, branchId] of [['TEST-SUC-1', BRANCH.A1], ['TEST-SUC-2', BRANCH.A2]] as const) {
      const res = await call('POST', '/v1/clients', {
        token: admin,
        body: { companyId: COMPANY.A1, branchId, code, legalName: `Cliente Sucursal ${code}` },
      });
      expect(res.status).toBe(201);
    }
  });

  it('una o varias sucursales separadas por comas', async () => {
    const one = await call('GET', `/v1/clients?q=TEST-SUC&branchId=${BRANCH.A1}`, { token: admin });
    expect(one.body.data.map((c: { code: string }) => c.code)).toEqual(['TEST-SUC-1']);
    const both = await call('GET', `/v1/clients?q=TEST-SUC&branchId=${BRANCH.A1},${BRANCH.A2}`, { token: admin });
    expect(both.body.pagination.total).toBe(2);
    const otherTenant = await call('GET', `/v1/clients?q=TEST-SUC&branchId=${BRANCH.B1}`, { token: admin });
    expect(otherTenant.body.pagination.total).toBe(0);
  });

  it('valores no válidos: 400', async () => {
    expect((await call('GET', '/v1/clients?branchId=no-es-un-id', { token: admin })).status).toBe(400);
    expect((await call('GET', '/v1/clients?branchId=', { token: admin })).status).toBe(400);
  });

  it('/v1/me devuelve las sucursales visibles del usuario', async () => {
    const meAdmin = await call('GET', '/v1/me', { token: admin });
    expect(meAdmin.body.branches.map((b: { id: string }) => b.id).sort()).toEqual([BRANCH.A1, BRANCH.A2].sort());
    const meSel = await call('GET', '/v1/me', { token: seleccion });
    expect(meSel.body.branches.map((b: { id: string }) => b.id)).toEqual([BRANCH.A1]);
  });
});
