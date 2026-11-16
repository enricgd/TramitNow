// Historial de actividad (/v1/activity): lo que hace la API deja rastro de quién y cuándo, se lee por ficha con
// paginación y respeta la visibilidad de la entidad.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BRANCH, COMPANY, T, USER, adminSql, call, closeAll, tokenFor } from './helpers.js';

let admin: string;
let adminB: string;
let seleccion: string;
let clientId: string;

beforeAll(async () => {
  admin = await tokenFor(USER.adminA);
  adminB = await tokenFor(USER.adminB);
  seleccion = await tokenFor(USER.selA);

  const client = await call('POST', '/v1/clients', {
    token: admin,
    body: { companyId: COMPANY.A1, branchId: BRANCH.A1, code: 'TEST-HIST', legalName: 'Cliente Historial, S.L.' },
  });
  clientId = client.body.id;
  await call('PATCH', `/v1/clients/${clientId}`, { token: admin, body: { tradeName: 'Historial' } });
  const center = await call('POST', '/v1/client-centers', {
    token: admin,
    body: { clientId, branchId: BRANCH.A1, code: 'CT1', name: 'Centro Historial' },
  });
  await call('PATCH', `/v1/client-centers/${center.body.id}`, { token: admin, body: { name: 'Centro Historial 2' } });
  await call('PUT', `/v1/clients/${clientId}/billing`, { token: admin, body: { paymentTermDays: 30, iban: 'ES0000000000000000000000' } });
  await call('PUT', `/v1/clients/${clientId}/billing`, { token: admin, body: { iban: 'ES9900000000000000000000' } });
});
afterAll(async () => {
  await adminSql`delete from public.clients where tenant_id = ${T.A} and code = 'TEST-HIST'`;
  await closeAll();
});

describe('historial', () => {
  it('la ficha del cliente lleva su historial y el de lo que cuelga de ella, lo último primero', async () => {
    const res = await call('GET', `/v1/activity?entityType=client&entityId=${clientId}`, { token: admin });
    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBe(6);
    expect(res.body.data.map((a: { summary: string }) => a.summary)).toEqual([
      'Cambios en facturación',
      'Alta de facturación',
      'Cambios en centro de trabajo «Centro Historial 2»',
      'Alta de centro de trabajo «Centro Historial»',
      'Cambios en cliente «Cliente Historial, S.L.»',
      'Alta de cliente «Cliente Historial, S.L.»',
    ]);
    const [last] = res.body.data;
    expect(last).toMatchObject({ action: 'update', actorUserId: USER.adminA, actorName: 'Admin A', changes: { iban: { masked: true } } });
    const centerUpdate = res.body.data[2];
    expect(centerUpdate.changes).toEqual({ name: { old: 'Centro Historial', new: 'Centro Historial 2' } });
    expect(centerUpdate.parentType).toBe('client');
  });

  it('solo la entidad y paginado', async () => {
    const own = await call('GET', `/v1/activity?entityType=client&entityId=${clientId}&includeChildren=false`, { token: admin });
    expect(own.body.pagination.total).toBe(2);
    const page = await call('GET', `/v1/activity?entityType=client&entityId=${clientId}&limit=2&offset=2`, { token: admin });
    expect(page.body.data).toHaveLength(2);
    expect(page.body.pagination).toEqual({ limit: 2, offset: 2, total: 6 });
  });

  it('sin clients.billing.manage no se ve la facturación; otra ETT no ve nada', async () => {
    const sel = await call('GET', `/v1/activity?entityType=client&entityId=${clientId}`, { token: seleccion });
    expect(sel.body.pagination.total).toBe(4);
    expect(sel.body.data.some((a: { entityType: string }) => a.entityType === 'client_billing')).toBe(false);
    const other = await call('GET', `/v1/activity?entityType=client&entityId=${clientId}`, { token: adminB });
    expect(other.status).toBe(200);
    expect(other.body.pagination.total).toBe(0);
  });

  it('valida los parámetros y no se puede escribir', async () => {
    expect((await call('GET', '/v1/activity?entityType=client', { token: admin })).status).toBe(400);
    expect((await call('GET', `/v1/activity?entityType=otra&entityId=${clientId}`, { token: admin })).status).toBe(400);
    expect((await call('POST', '/v1/activity', { token: admin, body: {} })).status).toBe(404);
  });
});
