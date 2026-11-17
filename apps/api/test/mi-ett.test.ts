// Mi ETT: datos legales y facturación de cada sociedad, ajustes de presupuestos, series, CCC, servicios que factura y
// alta e invitación de usuarios (contra el Supabase Auth local). Datos ficticios.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BRANCH, COMPANY, T, USER, adminSql, call, closeAll, tokenFor } from './helpers.js';

let admin: string;
let seleccion: string;
let seleccionRole: string;
let laboralRole: string;
const invited = `invitado.${Date.now()}@example.test`;

beforeAll(async () => {
  admin = await tokenFor(USER.adminA);
  seleccion = await tokenFor(USER.selA);
  const roles = await adminSql<{ id: string; code: string }[]>`select id, code from public.roles where tenant_id = ${T.A}`;
  seleccionRole = roles.find((r) => r.code === 'seleccion')!.id;
  laboralRole = roles.find((r) => r.code === 'laboral')!.id;
});
afterAll(async () => {
  await adminSql`delete from public.number_series where tenant_id = ${T.A} and year = 2030`;
  await adminSql`delete from public.memberships where tenant_id = ${T.A} and user_id = ${USER.adminB}`;
  await adminSql`delete from auth.users where email like 'invitado.%@example.test'`;
  await closeAll();
});

describe('datos legales de la sociedad', () => {
  it('vacío al principio; se guarda por partes y avisa de lo que vence', async () => {
    const empty = await call('GET', `/v1/companies/${COMPANY.A1}/legal`, { token: seleccion });
    expect(empty.status).toBe(200);
    expect(empty.body.legal).toMatchObject({ id: null, companyId: COMPANY.A1, tradeName: null, guaranteeAmount: null });

    const soon = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    const saved = await call('PUT', `/v1/companies/${COMPANY.A1}/legal`, {
      token: admin,
      body: {
        tradeName: 'ETT Ficticia',
        ettAuthorizationNumber: '00/0000-ETT',
        ettAuthorizationDate: '2019-03-12',
        ettAuthorizationScope: 'regional',
        ettAuthorizationCommunityCode: '16',
        legalRepName: 'Representante Ficticio',
        legalRepIdType: 'dni',
        legalRepIdNumber: '00000000-t',
        guaranteeType: 'bank_guarantee',
        guaranteeAmount: 185000,
        guaranteeExpiresOn: soon,
        certificateHolder: 'ETT Ficticia A, S.L.',
        certificateExpiresOn: '2030-01-31',
      },
    });
    expect(saved.status).toBe(200);
    expect(saved.body.legal).toMatchObject({ legalRepIdNumber: '00000000T', guaranteeAmount: 185000, ettAuthorizationDate: '2019-03-12' });
    expect(saved.body.warnings).toEqual(['La garantía financiera vence en 30 días']);

    const partial = await call('PUT', `/v1/companies/${COMPANY.A1}/legal`, { token: admin, body: { mutualInsurer: 'Mutua ficticia' } });
    expect(partial.body.legal).toMatchObject({ mutualInsurer: 'Mutua ficticia', tradeName: 'ETT Ficticia' });
  });

  it('valida el documento del representante y el ámbito; solo tenant.manage escribe', async () => {
    const badLetter = await call('PUT', `/v1/companies/${COMPANY.A1}/legal`, { token: admin, body: { legalRepIdNumber: '00000000A' } });
    expect(badLetter.status).toBe(422);
    const noCommunity = await call('PUT', `/v1/companies/${COMPANY.A1}/legal`, { token: admin, body: { ettAuthorizationCommunityCode: null } });
    expect(noCommunity.status).toBe(422);
    expect(noCommunity.body.error.message).toContain('comunidad');
    expect((await call('PUT', `/v1/companies/${COMPANY.A1}/legal`, { token: seleccion, body: { tradeName: 'X' } })).status).toBe(403);
    expect((await call('GET', `/v1/companies/${COMPANY.B1}/legal`, { token: admin })).status).toBe(404);
  });
});

describe('facturación de la sociedad y ajustes', () => {
  it('valores por defecto y guardado', async () => {
    const empty = await call('GET', `/v1/companies/${COMPANY.A1}/billing-settings`, { token: admin });
    expect(empty.body).toMatchObject({ id: null, vatRate: 21, withholdingRate: 0, currency: 'EUR', branchMode: 'centralized' });
    const saved = await call('PUT', `/v1/companies/${COMPANY.A1}/billing-settings`, {
      token: admin,
      body: { iban: 'es00 0000 0000 0000 0000 0000', paymentTerms: '30 días fecha factura', withholdingRate: 0, billingEmail: 'facturas@example.test' },
    });
    expect(saved.status).toBe(200);
    expect(saved.body).toMatchObject({ iban: 'ES0000000000000000000000', vatRate: 21, billingEmail: 'facturas@example.test' });
  });

  it('margen mínimo y días sin respuesta', async () => {
    expect((await call('GET', '/v1/tenant-settings', { token: seleccion })).body).toEqual({ quoteMinMarginPercent: null, quoteNoResponseDays: 15, candidatePoolRetentionMonths: 24, candidateDocumentNoticeDays: 30, accessLogRetentionMonths: 24 });
    const saved = await call('PATCH', '/v1/tenant-settings', { token: admin, body: { quoteMinMarginPercent: 12.5 } });
    expect(saved.body).toMatchObject({ quoteMinMarginPercent: 12.5, quoteNoResponseDays: 15, candidatePoolRetentionMonths: 24 });
    expect((await call('PATCH', '/v1/tenant-settings', { token: seleccion, body: { quoteNoResponseDays: 5 } })).status).toBe(403);
    await call('PATCH', '/v1/tenant-settings', { token: admin, body: { quoteMinMarginPercent: null } });
  });
});

describe('series', () => {
  it('se crean siguiendo la numeración anterior y nunca van hacia atrás', async () => {
    const created = await call('POST', '/v1/number-series', {
      token: admin,
      body: { documentKind: 'invoice', companyId: COMPANY.A1, year: 2030, prefix: 'F2030-', nextNumber: 108 },
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ lastNumber: 107, nextNumber: 108, nextFormatted: 'F2030-00108' });
    const credit = await call('POST', '/v1/number-series', { token: admin, body: { documentKind: 'credit_note', companyId: COMPANY.A1, year: 2030 } });
    expect(credit.body.nextFormatted).toBe('REC2030-00001');
    expect((await call('POST', '/v1/number-series', { token: admin, body: { documentKind: 'invoice', companyId: COMPANY.A1, year: 2030 } })).status).toBe(409);

    expect((await call('PATCH', `/v1/number-series/${created.body.id}`, { token: admin, body: { nextNumber: 50 } })).status).toBe(409);
    const moved = await call('PATCH', `/v1/number-series/${created.body.id}`, { token: admin, body: { nextNumber: 200, padding: 4 } });
    expect(moved.body.nextFormatted).toBe('F2030-0200');
    expect((await call('PATCH', `/v1/number-series/${created.body.id}`, { token: seleccion, body: { prefix: 'X' } })).status).toBe(403);

    const list = await call('GET', '/v1/number-series?year=2030', { token: seleccion });
    expect(list.body.data.map((s: any) => s.documentKind)).toEqual(['credit_note', 'invoice']);
  });
});

describe('CCC y servicios', () => {
  it('CCC con control y provincia', async () => {
    const created = await call('POST', '/v1/contribution-accounts', {
      token: admin,
      body: { companyId: COMPANY.A1, branchId: BRANCH.A1, code: '48 0000001 60', staffType: 'mission' },
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ code: '48000000160', provinceCode: '48', staffType: 'mission' });
    const bad = await call('POST', '/v1/contribution-accounts', { token: admin, body: { companyId: COMPANY.A1, code: '48000000161', staffType: 'mission' } });
    expect(bad.status).toBe(400);
    expect((await call('GET', `/v1/contribution-accounts?branchId=${BRANCH.A1}&staffType=mission`, { token: seleccion })).body.pagination.total).toBe(1);
    expect((await call('DELETE', `/v1/contribution-accounts/${created.body.id}`, { token: admin })).status).toBe(204);
  });

  it('servicios de serie y propios', async () => {
    const list = await call('GET', '/v1/billable-services', { token: seleccion });
    expect(list.body.pagination.total).toBe(5);
    expect(list.body.data.map((s: any) => s.code)).toContain('formacion_prl');
    const created = await call('POST', '/v1/billable-services', {
      token: admin,
      body: { code: 'TEST-EPI', name: 'Equipos de protección', chargeMode: 'per_person', defaultValue: 12.5, unit: 'persona' },
    });
    expect(created.status).toBe(201);
    expect(created.body.defaultValue).toBe(12.5);
    expect((await call('POST', '/v1/billable-services', { token: seleccion, body: { code: 'X', name: 'X', chargeMode: 'fixed', unit: 'ud.' } })).status).toBe(403);
    expect((await call('POST', '/v1/billable-services', { token: admin, body: { code: 'TEST-P', name: 'X', chargeMode: 'percentage', defaultValue: 150, unit: 'proceso' } })).status).toBe(422);
  });
});

describe('usuarios', () => {
  it('invita a alguien nuevo: crea su cuenta y devuelve el enlace', async () => {
    expect((await call('POST', '/v1/memberships', { token: seleccion, body: { email: invited, fullName: 'X', roleId: seleccionRole } })).status).toBe(403);

    const res = await call('POST', '/v1/memberships', {
      token: admin,
      body: {
        email: invited.toUpperCase(),
        fullName: 'Persona Invitada',
        roleId: seleccionRole,
        department: 'Selección',
        contexts: [{ companyId: COMPANY.A1, branchId: BRANCH.A1 }],
      },
    });
    expect(res.status).toBe(201);
    expect(res.body.existingUser).toBe(false);
    expect(res.body.inviteUrl).toMatch(/^http:\/\/localhost:5173\/verify\?token=[0-9a-f]+&type=invite$/);
    expect(res.body.membership).toMatchObject({
      email: invited,
      fullName: 'Persona Invitada',
      department: 'Selección',
      invitationPending: true,
      invitedBy: USER.adminA,
      role: { code: 'seleccion' },
      contexts: [{ companyId: COMPANY.A1, branchId: BRANCH.A1, isDefault: true }],
    });
    const id = res.body.membership.id;

    const again = await call('POST', '/v1/memberships', { token: admin, body: { email: invited, fullName: 'Otra vez', roleId: seleccionRole } });
    expect(again.status).toBe(409);

    const resent = await call('POST', `/v1/memberships/${id}/resend-invitation`, { token: admin });
    expect(resent.status).toBe(200);
    expect(resent.body.inviteUrl).toMatch(/^http:\/\/localhost:5173\/verify\?token=[0-9a-f]+&type=invite$/);

    const edited = await call('PATCH', `/v1/memberships/${id}`, {
      token: admin,
      body: { roleId: laboralRole, contexts: [{ companyId: COMPANY.A1, branchId: BRANCH.A2 }, { companyId: COMPANY.A1, branchId: BRANCH.A1, isDefault: true }] },
    });
    expect(edited.status).toBe(200);
    expect(edited.body.role.code).toBe('laboral');
    expect(edited.body.contexts[0]).toMatchObject({ branchId: BRANCH.A1, isDefault: true });

    expect((await call('DELETE', `/v1/memberships/${id}/invitation`, { token: admin })).status).toBe(204);
    const [gone] = await adminSql<{ n: number }[]>`select count(*)::int as n from auth.users where email = ${invited}`;
    expect(gone!.n).toBe(0);
  });

  it('quien ya tiene cuenta (en otra ETT) entra sin enlace y no se le puede revocar la invitación', async () => {
    await adminSql`update auth.users set email_confirmed_at = now() where id = ${USER.adminB}`;
    const res = await call('POST', '/v1/memberships', { token: admin, body: { email: 'admin.b@example.test', fullName: 'Admin B', roleId: seleccionRole } });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ existingUser: true, inviteUrl: null });
    expect(res.body.membership).toMatchObject({ userId: USER.adminB, invitationPending: false, contexts: [] });
    expect((await call('DELETE', `/v1/memberships/${res.body.membership.id}/invitation`, { token: admin })).status).toBe(409);
    expect((await call('POST', `/v1/memberships/${res.body.membership.id}/resend-invitation`, { token: admin })).status).toBe(409);
  });

  it('nadie se quita su propio rol ni se bloquea', async () => {
    const list = await call('GET', '/v1/memberships', { token: admin });
    const own = list.body.data.find((m: any) => m.userId === USER.adminA);
    expect(own.email).toBe('admin.a@example.test');
    expect((await call('PATCH', `/v1/memberships/${own.id}`, { token: admin, body: { status: 'blocked' } })).status).toBe(409);
    expect((await call('PATCH', `/v1/memberships/${own.id}`, { token: admin, body: { roleId: seleccionRole } })).status).toBe(409);
    expect((await call('PATCH', `/v1/memberships/${own.id}`, { token: admin, body: { department: 'Dirección' } })).body.department).toBe('Dirección');
  });
});
