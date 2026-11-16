// Fase 2 (Empresas): sector CNAE, convenio por defecto heredado por los centros, contactos (valida horas, rol «Otro»,
// suspensión), forma de imprimir la factura y eliminar recuperable (?deleted=true, restaurar, en uso, conflictos).

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BRANCH, COMPANY, T, USER, adminSql, call, closeAll, tokenFor } from './helpers.js';

let admin: string;
let seleccion: string;
let agreementId: string;

const newClient = (body: Record<string, unknown>) =>
  call('POST', '/v1/clients', { token: admin, body: { companyId: COMPANY.A1, branchId: BRANCH.A1, ...body } });

beforeAll(async () => {
  admin = await tokenFor(USER.adminA);
  seleccion = await tokenFor(USER.selA);
  agreementId = (
    await call('POST', '/v1/collective-agreements', { token: admin, body: { code: 'TEST-F2', name: 'Convenio ficticio' } })
  ).body.id;
});
afterAll(async () => {
  await adminSql`delete from public.clients where tenant_id = ${T.A} and code like 'TEST-F2-%'`;
  await adminSql`delete from public.collective_agreements where tenant_id = ${T.A} and code = 'TEST-F2'`;
  await closeAll();
});

describe('CNAE', () => {
  it('lista secciones y divisiones, con filtros', async () => {
    const all = await call('GET', '/v1/cnae', { token: seleccion });
    expect(all.status).toBe(200);
    expect(all.body.data).toHaveLength(109);
    expect(all.body.data.slice(0, 2)).toEqual([
      { code: 'A', name: 'Agricultura, ganadería, silvicultura y pesca', level: 'section', parentCode: null },
      expect.objectContaining({ code: '01', level: 'division', parentCode: 'A' }),
    ]);
    const sections = await call('GET', '/v1/cnae?level=section', { token: seleccion });
    expect(sections.body.data).toHaveLength(21);
    const employment = await call('GET', '/v1/cnae?q=empleo', { token: seleccion });
    expect(employment.body.data.map((a: { code: string }) => a.code)).toEqual(['78']);
    const ofH = await call('GET', '/v1/cnae?parentCode=H', { token: seleccion });
    expect(ofH.body.data.map((a: { code: string }) => a.code)).toEqual(['49', '50', '51', '52', '53']);
  });
});

describe('empresas, fase 2', () => {
  let clientId: string;
  let centerId: string;
  let contactId: string;

  it('cliente con sector y convenio por defecto; filtro por sector (la sección incluye sus divisiones)', async () => {
    const created = await newClient({ code: 'TEST-F2-1', legalName: 'Logística Ficticia, S.L.', sectorCode: '52', defaultAgreementId: agreementId });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ sectorCode: '52', defaultAgreementId: agreementId, deletedAt: null });
    clientId = created.body.id;
    await newClient({ code: 'TEST-F2-2', legalName: 'Hotel Ficticio, S.L.', sectorCode: 'I' });

    expect((await newClient({ code: 'TEST-F2-X', legalName: 'X', sectorCode: '00' })).status).toBe(422);
    const bySection = await call('GET', '/v1/clients?q=TEST-F2&sectorCode=H', { token: admin });
    expect(bySection.body.data.map((c: { code: string }) => c.code)).toEqual(['TEST-F2-1']);
    const byDivision = await call('GET', '/v1/clients?q=TEST-F2&sectorCode=52', { token: admin });
    expect(byDivision.body.pagination.total).toBe(1);
    const byBranch = await call('GET', `/v1/clients?q=TEST-F2&branchId=${BRANCH.A2}`, { token: admin });
    expect(byBranch.body.pagination.total).toBe(0);
  });

  it('el centro hereda el convenio del cliente si no tiene uno propio', async () => {
    const center = await call('POST', '/v1/client-centers', {
      token: admin,
      body: { clientId, branchId: BRANCH.A1, code: 'CT1', name: 'Almacén ficticio' },
    });
    expect(center.status).toBe(201);
    expect(center.body).toMatchObject({ clientAgreementId: null, effectiveClientAgreementId: agreementId });
    centerId = center.body.id;

    await call('PATCH', `/v1/clients/${clientId}`, { token: admin, body: { defaultAgreementId: null } });
    const after = await call('GET', `/v1/client-centers/${centerId}`, { token: admin });
    expect(after.body.effectiveClientAgreementId).toBeNull();
    const own = await call('PATCH', `/v1/client-centers/${centerId}`, { token: admin, body: { clientAgreementId: agreementId } });
    expect(own.body.effectiveClientAgreementId).toBe(agreementId);
  });

  it('contacto: valida horas, rol «Otro» con su texto y suspensión', async () => {
    const noText = await call('POST', '/v1/client-contacts', {
      token: admin,
      body: { clientId, name: 'Contacto Ficticio', roles: ['other'] },
    });
    expect(noText.status).toBe(422);
    expect(noText.body.error.message).toContain('Otro');

    const created = await call('POST', '/v1/client-contacts', {
      token: admin,
      body: { clientId, name: 'Contacto Ficticio', roles: ['other', 'hr'], otherRole: 'Jefe de turno', validatesHours: true, isMain: true },
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ otherRole: 'Jefe de turno', validatesHours: true, suspended: false, suspendedAt: null });
    contactId = created.body.id;

    const suspended = await call('PATCH', `/v1/client-contacts/${contactId}`, { token: admin, body: { suspended: true } });
    expect(suspended.body).toMatchObject({ suspended: true, suspendedBy: USER.adminA });
    expect(suspended.body.suspendedAt).toBeTruthy();
    const list = await call('GET', `/v1/client-contacts?clientId=${clientId}&suspended=true`, { token: admin });
    expect(list.body.data.map((c: { id: string }) => c.id)).toEqual([contactId]);
    expect((await call('GET', `/v1/client-contacts?clientId=${clientId}&suspended=false`, { token: admin })).body.pagination.total).toBe(0);
  });

  it('facturación: por persona por defecto, o por concepto', async () => {
    const saved = await call('PUT', `/v1/clients/${clientId}/billing`, { token: admin, body: { fixedPaymentDays: [15, 31] } });
    expect(saved.status).toBe(200);
    expect(saved.body.billing).toMatchObject({ invoiceLayout: 'by_person', fixedPaymentDays: [15, 31] });
    const byConcept = await call('PUT', `/v1/clients/${clientId}/billing`, { token: admin, body: { invoiceLayout: 'by_concept' } });
    expect(byConcept.body.billing.invoiceLayout).toBe('by_concept');
    expect((await call('PUT', `/v1/clients/${clientId}/billing`, { token: admin, body: { invoiceLayout: 'x' } })).status).toBe(400);
  });

  it('eliminar un contacto: sale de la lista, se ve con ?deleted=true y se restaura', async () => {
    expect((await call('DELETE', `/v1/client-contacts/${contactId}`, { token: seleccion })).status).toBe(403);
    expect((await call('DELETE', `/v1/client-contacts/${contactId}`, { token: admin })).status).toBe(204);
    expect((await call('GET', `/v1/client-contacts/${contactId}`, { token: admin })).status).toBe(404);
    const deleted = await call('GET', `/v1/client-contacts?clientId=${clientId}&deleted=true`, { token: admin });
    expect(deleted.body.data.map((c: { id: string }) => c.id)).toEqual([contactId]);
    expect(deleted.body.data[0].deletedAt).toBeTruthy();

    // Mientras, otro contacto pasa a ser el principal: restaurar el primero choca.
    const other = await call('POST', '/v1/client-contacts', { token: admin, body: { clientId, name: 'Otro Ficticio', isMain: true } });
    const conflict = await call('POST', `/v1/client-contacts/${contactId}/restore`, { token: admin });
    expect(conflict.status).toBe(409);
    expect(conflict.body.error).toMatchObject({ code: 'conflicto', message: 'El cliente ya tiene un contacto principal' });

    await call('PATCH', `/v1/client-contacts/${other.body.id}`, { token: admin, body: { isMain: false } });
    const restored = await call('POST', `/v1/client-contacts/${contactId}/restore`, { token: admin });
    expect(restored.status).toBe(200);
    expect(restored.body).toMatchObject({ id: contactId, deletedAt: null, isMain: true });
    expect((await call('POST', `/v1/client-contacts/${contactId}/restore`, { token: admin })).status).toBe(404);
  });

  it('un cliente en uso no se elimina (409 en_uso); si no, se elimina con sus centros y contactos y se restaura', async () => {
    const payer = await newClient({ code: 'TEST-F2-3', legalName: 'Pagador Ficticio, S.L.' });
    await call('PUT', `/v1/clients/${payer.body.id}/billing`, { token: admin, body: { invoiceClientId: clientId } });
    const inUse = await call('DELETE', `/v1/clients/${clientId}`, { token: admin });
    expect(inUse.status).toBe(409);
    expect(inUse.body.error.code).toBe('en_uso');
    expect(inUse.body.error.message).toContain('se le facturan');
    await call('PUT', `/v1/clients/${payer.body.id}/billing`, { token: admin, body: { invoiceClientId: null } });

    expect((await call('DELETE', `/v1/clients/${clientId}`, { token: admin })).status).toBe(204);
    expect((await call('GET', `/v1/clients?q=TEST-F2-1`, { token: admin })).body.pagination.total).toBe(0);
    const deleted = await call('GET', '/v1/clients?q=TEST-F2&deleted=true', { token: admin });
    expect(deleted.body.data.map((c: { code: string }) => c.code)).toEqual(['TEST-F2-1']);
    expect((await call('GET', `/v1/client-centers?clientId=${clientId}`, { token: admin })).body.pagination.total).toBe(0);
    expect((await call('GET', `/v1/client-centers?clientId=${clientId}&deleted=true`, { token: admin })).body.pagination.total).toBe(1);

    const centerFirst = await call('POST', `/v1/client-centers/${centerId}/restore`, { token: admin });
    expect(centerFirst.status).toBe(409);
    expect(centerFirst.body.error.message).toContain('restaura primero el cliente');

    const restored = await call('POST', `/v1/clients/${clientId}/restore`, { token: admin });
    expect(restored.status).toBe(200);
    expect(restored.body).toMatchObject({ code: 'TEST-F2-1', deletedAt: null });
    expect((await call('GET', `/v1/client-centers/${centerId}`, { token: admin })).status).toBe(200);
    expect((await call('GET', `/v1/client-contacts?clientId=${clientId}`, { token: admin })).body.pagination.total).toBe(2);

    const history = await call('GET', `/v1/activity?entityType=client&entityId=${clientId}`, { token: admin });
    const actions = history.body.data.map((a: { entityType: string; action: string }) => `${a.entityType}:${a.action}`);
    expect(actions).toEqual(expect.arrayContaining(['client:delete', 'client:restore', 'client_center:restore', 'client_contact:restore']));
  });

  it('readiness: centros y contactos activos y si tiene facturación, también para quien no ve la facturación', async () => {
    const own = await call('GET', `/v1/clients/${clientId}`, { token: seleccion });
    expect(own.body.readiness).toEqual({ centers: 1, contacts: 2, hasBilling: true });
    await call('DELETE', `/v1/client-contacts/${contactId}`, { token: admin });
    const list = await call('GET', '/v1/clients?q=TEST-F2', { token: seleccion });
    const byCode = Object.fromEntries(list.body.data.map((c: { code: string; readiness: unknown }) => [c.code, c.readiness]));
    expect(byCode['TEST-F2-1']).toEqual({ centers: 1, contacts: 1, hasBilling: true });
    expect(byCode['TEST-F2-2']).toEqual({ centers: 0, contacts: 0, hasBilling: false });
    // Recién creado, también lo trae.
    const created = await newClient({ code: 'TEST-F2-5', legalName: 'Nuevo Ficticio Cinco, S.L.' });
    expect(created.body.readiness).toEqual({ centers: 0, contacts: 0, hasBilling: false });
  });

  it('causas especiales de IVA de serie (null = régimen general)', async () => {
    const res = await call('GET', '/v1/catalog-items?type=vat_special_cause', { token: seleccion });
    expect(res.body.data.map((i: { code: string }) => i.code).sort()).toEqual(['EXENTA', 'IGIC', 'IPSI', 'ISP']);
  });

  it('restaurar un cliente choca si otro activo tiene su código', async () => {
    const temp = await newClient({ code: 'TEST-F2-4', legalName: 'Temporal Ficticio, S.L.' });
    await call('DELETE', `/v1/clients/${temp.body.id}`, { token: admin });
    await newClient({ code: 'TEST-F2-4', legalName: 'Nuevo Ficticio, S.L.' });
    const res = await call('POST', `/v1/clients/${temp.body.id}/restore`, { token: admin });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('conflicto');
  });
});
