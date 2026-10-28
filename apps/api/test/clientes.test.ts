// Clientes, centros, contactos y facturación: lectura para todos los miembros, escritura por sucursal con
// clients.manage y facturación solo con clients.billing.manage.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BRANCH, COMPANY, T, USER, adminSql, call, closeAll, tokenFor } from './helpers.js';

let admin: string;
let adminB: string;
let comercial: string;
let seleccion: string;

const setRole = (code: string) => adminSql`
  update public.memberships set role_id = (select id from public.roles where tenant_id = ${T.A} and code = ${code})
  where tenant_id = ${T.A} and user_id = ${USER.selA}
`;

beforeAll(async () => {
  admin = await tokenFor(USER.adminA);
  adminB = await tokenFor(USER.adminB);
  seleccion = await tokenFor(USER.selA);
  // El usuario de selección (sucursal A1) pasa a comercial para estos tests; los permisos se leen en cada petición.
  comercial = seleccion;
});
afterAll(async () => {
  await setRole('seleccion');
  await adminSql`delete from public.clients where tenant_id in (${T.A}, ${T.B}) and code like 'TEST-%'`;
  await closeAll();
});

const newClient = (token: string, body: Record<string, unknown>) =>
  call('POST', '/v1/clients', { token, body: { companyId: COMPANY.A1, branchId: BRANCH.A1, ...body } });

describe('clientes', () => {
  it('admin crea un cliente, con el NIF normalizado y único por sociedad', async () => {
    const created = await newClient(admin, { code: 'TEST-1', legalName: 'Cliente Ficticio Uno, S.L.', taxId: 'b-0000 0011' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ taxId: 'B00000011', taxIdType: 'nif', status: 'active', blocked: false });

    const duplicate = await newClient(admin, { code: 'TEST-2', legalName: 'Otro', taxId: 'B00000011' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.message).toBe('Ya existe un cliente con ese NIF en la sociedad');
  });

  it('lista con búsqueda y filtros', async () => {
    await newClient(admin, { code: 'TEST-P', legalName: 'Prospecto Ficticio', status: 'prospect', branchId: BRANCH.A2 });
    const prospects = await call('GET', '/v1/clients?status=prospect&q=ficticio', { token: admin });
    expect(prospects.body.data.map((c: { code: string }) => c.code)).toEqual(['TEST-P']);
    const byTaxId = await call('GET', '/v1/clients?q=B00000011', { token: admin });
    expect(byTaxId.body.pagination.total).toBe(1);
  });

  it('selección ve todos los clientes de la ETT pero no los crea', async () => {
    const list = await call('GET', '/v1/clients?q=TEST-', { token: seleccion });
    expect(list.body.pagination.total).toBe(2);
    const res = await newClient(seleccion, { code: 'TEST-S', legalName: 'No' });
    expect(res.status).toBe(403);
  });

  it('comercial escribe en su sucursal y no en otra', async () => {
    await setRole('comercial');
    const mine = await newClient(comercial, { code: 'TEST-C', legalName: 'Cliente del comercial' });
    expect(mine.status).toBe(201);

    const other = await newClient(comercial, { code: 'TEST-X', legalName: 'No', branchId: BRANCH.A2 });
    expect(other.status).toBe(403);

    const [prospect] = await adminSql`select id from public.clients where tenant_id = ${T.A} and code = 'TEST-P'`;
    const edit = await call('PATCH', `/v1/clients/${prospect!.id}`, { token: comercial, body: { phone: '900000000' } });
    expect(edit.status).toBe(404);
  });

  it('otra ETT no lo ve', async () => {
    const [row] = await adminSql`select id from public.clients where tenant_id = ${T.A} and code = 'TEST-1'`;
    expect((await call('GET', `/v1/clients/${row!.id}`, { token: adminB })).status).toBe(404);
    expect((await call('GET', '/v1/clients?q=TEST-1', { token: adminB })).body.pagination.total).toBe(0);
  });
});

describe('centros y contactos', () => {
  it('centro con CCC normalizado y contactos con sus reglas', async () => {
    await setRole('comercial');
    const [client] = await adminSql`select id from public.clients where tenant_id = ${T.A} and code = 'TEST-C'`;
    const center = await call('POST', '/v1/client-centers', {
      token: comercial,
      body: { clientId: client!.id, branchId: BRANCH.A1, code: 'CT1', name: 'Almacén ficticio', ccc: '28 1234567 89' },
    });
    expect(center.status).toBe(201);
    expect(center.body.ccc).toBe('28123456789');

    const badCcc = await call('POST', '/v1/client-centers', {
      token: comercial,
      body: { clientId: client!.id, branchId: BRANCH.A1, code: 'CT2', name: 'X', ccc: '123' },
    });
    expect(badCcc.status).toBe(400);

    const main = await call('POST', '/v1/client-contacts', {
      token: comercial,
      body: { clientId: client!.id, centerId: center.body.id, name: 'Contacto Ficticio', roles: ['requester', 'operations'], isMain: true },
    });
    expect(main.status).toBe(201);
    expect(main.body.roles).toEqual(['requester', 'operations']);

    const secondMain = await call('POST', '/v1/client-contacts', {
      token: comercial,
      body: { clientId: client!.id, name: 'Otro', isMain: true },
    });
    expect(secondMain.status).toBe(409);
    expect(secondMain.body.error.message).toBe('El cliente ya tiene un contacto principal');

    const documentWithoutCpd = await call('POST', '/v1/client-contacts', {
      token: comercial,
      body: { clientId: client!.id, name: 'Sin firma', documentType: 'nif', documentNumber: '00000000T' },
    });
    expect(documentWithoutCpd.status).toBe(422);

    const contacts = await call('GET', `/v1/client-contacts?clientId=${client!.id}`, { token: seleccion });
    expect(contacts.body.data.map((c: { name: string }) => c.name)).toEqual(['Contacto Ficticio']);
  });
});

describe('facturación', () => {
  it('solo admin la lee y la guarda, con aviso si el plazo supera el legal', async () => {
    const [client] = await adminSql`select id from public.clients where tenant_id = ${T.A} and code = 'TEST-1'`;
    const path = `/v1/clients/${client!.id}/billing`;

    expect((await call('GET', path, { token: admin })).status).toBe(404);

    const saved = await call('PUT', path, {
      token: admin,
      body: { iban: 'es00 0000 0000 0000 0000 0000', paymentTermDays: 90, fixedPaymentDays: [10, 25], riskLimit: 15000 },
    });
    expect(saved.status).toBe(200);
    expect(saved.body.billing).toMatchObject({ iban: 'ES0000000000000000000000', fixedPaymentDays: [10, 25], riskLimit: 15000 });
    expect(saved.body.warnings).toHaveLength(1);

    const again = await call('PUT', path, { token: admin, body: { paymentTermDays: 30 } });
    expect(again.body.billing).toMatchObject({ paymentTermDays: 30, iban: 'ES0000000000000000000000' });
    expect(again.body.warnings).toEqual([]);

    await setRole('comercial');
    expect((await call('GET', path, { token: comercial })).status).toBe(403);
    expect((await call('PUT', path, { token: comercial, body: { riskLimit: 1 } })).status).toBe(403);
    expect((await call('GET', path, { token: adminB })).status).toBe(404);
  });
});
