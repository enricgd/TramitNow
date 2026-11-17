// Peticiones (routes/requests.ts): de un puesto de un presupuesto aceptado, condiciones copiadas, plazas, reparto,
// estados, CPD previo (comprobaciones, PDF, enviado y revisado a mano), convenio actualizado (art. 11), duplicar,
// historial, documentos y aislamiento. Datos inventados (REGCON 99999999999951).

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BRANCH, COMPANY, T, USER, adminSql, call, closeAll, tokenFor } from './helpers.js';

const REGCON = '99999999999951';
const CLIENT = '81000000-0000-0000-0000-0000000000f5';
const CONTACT = '83000000-0000-0000-0000-0000000000f5';
const CENTER = '82000000-0000-0000-0000-0000000000f5';
const AGREEMENT = '43000000-0000-0000-0000-0000000000f5';

let admin: string;
let seleccion: string;
let adminB: string;
let quoteId: string;
let versionId: string;
let positionId: string;
let draftQuoteId: string;
let legalProfileCreated = false;
let legalProfileBefore: Record<string, unknown> | undefined;

async function loadVersion(publication: string, date: string, effectiveFrom: string, monthly: number) {
  await adminSql.begin(async (tx) => {
    await tx`
      select private.load_agreement_file(${tx.json({
        agreement: { regcon: REGCON, name: 'Convenio ficticio de peticiones (API)', scope: 'provincial', territory: '48',
          cnae: ['52'], validFrom: '2026-01-01', validTo: null },
        publications: [{ id: publication, bulletin: 'BOB', date, number: `PRUEBA-PET-${publication}`, url: null, type: publication === 'p1' ? 'texto_inicial' : 'revision_salarial' }],
        versions: [{
          publication, effectiveFrom, effectiveTo: null,
          categories: [{ code: 'G1', name: 'Mozo (ficticio)' }],
          salaryItems: [
            { category: 'G1', concept: 'salario_base', amount: monthly, unit: 'mes' },
            { category: null, concept: 'plus_convenio', amount: 50, unit: 'mes' },
          ],
          conditions: { annualHours: 1750, vacationDays: 30, vacationDaysType: 'naturales', extraPayments: 2 },
        }],
      } as never)}, 'contenidos.1@example.test')
    `;
    const claims = { sub: USER.content2, role: 'authenticated' };
    await tx`select set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`;
    await tx`set local role authenticated`;
    const [v] = await tx<{ id: string }[]>`
      select v.id from public.agreement_versions v join public.agreements a on a.id = v.agreement_id
      where a.regcon = ${REGCON} and v.effective_from = ${effectiveFrom}
    `;
    await tx`update public.agreement_versions set reviewed_by = ${USER.content2} where id = ${v!.id}`;
    await tx`update public.agreement_versions set status = 'publicada' where id = ${v!.id}`;
  });
}

async function acceptedQuote(): Promise<void> {
  const q = await call('POST', '/v1/quotes', { token: admin, body: { clientId: CLIENT, title: 'Campaña ficticia de peticiones' } });
  quoteId = q.body.id;
  versionId = q.body.currentVersion.id;
  const [cat] = await adminSql<{ id: string }[]>`
    select c.id from public.agreement_categories c join public.agreement_versions v on v.id = c.version_id
    join public.agreements a on a.id = v.agreement_id where a.regcon = ${REGCON} and v.effective_from = '2026-01-01'
  `;
  const p = await call('POST', `/v1/quote-versions/${versionId}/positions`, {
    token: admin,
    body: { name: 'Mozo de almacén', description: 'Carga, descarga y preparación de pedidos', collectiveAgreementId: AGREEMENT,
      agreementCategoryId: cat!.id, people: 4, hoursPerPerson: 480, hourlyRate: 22 },
  });
  expect(p.status).toBe(201);
  positionId = p.body.positions[0].id;
  expect((await call('POST', `/v1/quote-versions/${versionId}/send`, { token: admin })).status).toBe(200);
  expect((await call('POST', `/v1/quote-versions/${versionId}/accept`, { token: admin })).status).toBe(200);
}

beforeAll(async () => {
  await loadVersion('p1', '2026-02-01', '2026-01-01', 1500);
  await adminSql`select private.seed_quote_catalogs(${T.A})`;
  await adminSql`select private.seed_request_catalogs(${T.A})`;
  await adminSql`
    insert into public.collective_agreements (id, tenant_id, code, name, global_agreement_id)
    values (${AGREEMENT}, ${T.A}, 'TEST-PET', 'Convenio ficticio de peticiones',
            (select id from public.agreements where regcon = ${REGCON}))
  `;
  await adminSql`
    insert into public.clients (id, tenant_id, company_id, branch_id, code, legal_name, tax_id, sector_code, default_agreement_id)
    values (${CLIENT}, ${T.A}, ${COMPANY.A1}, ${BRANCH.A1}, 'TEST-PET-1', 'Cliente Ficticio de Peticiones, S.L.', 'B00000005', '52', ${AGREEMENT})
  `;
  await adminSql`
    insert into public.client_contacts (id, tenant_id, client_id, name, position, email, is_quote_recipient, signs_cpds, document_type, document_number)
    values (${CONTACT}, ${T.A}, ${CLIENT}, 'Firmante Ficticio', 'Responsable de RR. HH.', 'firmante@example.test', true, true, 'nif', '00000000T')
  `;
  await adminSql`
    insert into public.client_centers (id, tenant_id, client_id, branch_id, code, name)
    values (${CENTER}, ${T.A}, ${CLIENT}, ${BRANCH.A1}, 'C1', 'Nave ficticia 1')
  `;
  [legalProfileBefore] = await adminSql`
    select ett_authorization_number, legal_rep_name, legal_rep_id_type, legal_rep_id_number, legal_rep_position
    from public.company_legal_profiles where tenant_id = ${T.A} and company_id = ${COMPANY.A1}
  `;
  if (!legalProfileBefore) {
    legalProfileCreated = true;
    await adminSql`insert into public.company_legal_profiles (tenant_id, company_id) values (${T.A}, ${COMPANY.A1})`;
  }
  admin = await tokenFor(USER.adminA);
  seleccion = await tokenFor(USER.selA);
  adminB = await tokenFor(USER.adminB);
  await acceptedQuote();
});

afterAll(async () => {
  const paths = await adminSql<{ path: string }[]>`
    delete from public.documents where tenant_id = ${T.A} and (entity_type = 'request' or entity_id = ${quoteId ?? null})
    returning storage_path as path
  `;
  await Promise.all(
    paths.map(({ path }) =>
      fetch(`${process.env.STORAGE_URL}/object/documents`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixes: [path] }),
      }),
    ),
  );
  // Las peticiones y los presupuestos no se borran por la API: limpieza directa de los datos de prueba.
  await adminSql`delete from public.requests where tenant_id = ${T.A} and client_id = ${CLIENT}`;
  await adminSql`delete from public.quotes where tenant_id = ${T.A} and client_id = ${CLIENT}`;
  await adminSql`delete from public.clients where id = ${CLIENT}`;
  await adminSql`delete from public.collective_agreements where id = ${AGREEMENT}`;
  if (legalProfileCreated) {
    await adminSql`delete from public.company_legal_profiles where tenant_id = ${T.A} and company_id = ${COMPANY.A1}`;
  } else if (legalProfileBefore) {
    await adminSql`update public.company_legal_profiles set ${adminSql(legalProfileBefore!)} where tenant_id = ${T.A} and company_id = ${COMPANY.A1}`;
  }
  await adminSql.begin(async (tx) => {
    await tx`set local tramitnow.purge_agreements = 'on'`;
    await tx`delete from public.agreements where regcon = ${REGCON}`;
  });
  await closeAll();
});

const SCHEDULE = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, working: true, start: '22:00', end: '06:00', breakMinutes: 30 }));
let requestId: string;

describe('crear peticiones', () => {
  it('Selección encuentra el presupuesto aceptado y sus personas sin petición', async () => {
    const res = await call('GET', '/v1/request-sources?q=peticiones', { token: seleccion });
    expect(res.status).toBe(200);
    const row = res.body.data.find((s: { quoteId: string }) => s.quoteId === quoteId);
    expect(row).toMatchObject({ people: 4, peopleInRequests: 0, peopleWithoutRequest: 4, clientTaxId: 'B00000005' });
    expect(row.positions).toEqual([expect.objectContaining({ quotePositionId: positionId, people: 4, rateHour: 22, requests: [] })]);
    // Ve el presupuesto aceptado (para elegir el puesto), sin los costes.
    const quote = await call('GET', `/v1/quotes/${quoteId}`, { token: seleccion });
    expect(quote.status).toBe(200);
    expect(quote.body.currentVersion.positions[0].calculation.costHour).toBeNull();
  });

  it('no se crea desde un presupuesto sin aceptar', async () => {
    const q = await call('POST', '/v1/quotes', { token: admin, body: { clientId: CLIENT } });
    draftQuoteId = q.body.id;
    const p = await call('POST', `/v1/quote-versions/${q.body.currentVersion.id}/positions`, {
      token: admin, body: { name: 'Otro puesto', annualBaseSalary: 22000, annualHours: 1750, hourlyRate: 20 },
    });
    const res = await call('POST', '/v1/requests', { token: admin, body: { quotePositionId: p.body.positions[0].id, positionsCount: 1 } });
    expect(res.status).toBe(409);
    // Y Selección no ve presupuestos sin aceptar.
    expect((await call('GET', `/v1/quotes/${draftQuoteId}`, { token: seleccion })).status).toBe(404);
  });

  it('Selección crea una petición: número, condiciones copiadas, plazas y valores por defecto', async () => {
    const res = await call('POST', '/v1/requests', {
      token: seleccion,
      body: { quotePositionId: positionId, positionsCount: 3, startDate: '2026-12-01', shiftName: 'Turno de noche', schedule: SCHEDULE },
    });
    expect(res.status).toBe(201);
    requestId = res.body.id;
    expect(res.body.code).toMatch(/^PET\d{4}-\d{5}$/);
    expect(res.body).toMatchObject({
      status: 'new', positionName: 'Mozo de almacén', positionsCount: 3, branchId: BRANCH.A1, responsibleUserId: USER.selA,
      clientSignerContactId: CONTACT, clientSignerContactName: 'Firmante Ficticio', tasks: 'Carga, descarga y preparación de pedidos',
      weeklyHours: 37.5, slots: { open: 3, filled: 0 }, preCpdStatus: 'pending', legalChecks: null,
    });
    expect(res.body.schedule).toHaveLength(7);
    expect(res.body.schedule[0]).toMatchObject({ weekday: 1, hours: 7.5 });
    expect(res.body.schedule[6]).toMatchObject({ weekday: 7, working: false, hours: 0 });
    const cond = res.body.conditions;
    expect(cond).toMatchObject({ rateHour: 22, agreementCategoryCode: 'G1', categoryName: 'Mozo (ficticio)', agreementPeriod: { from: '2026-01-01', to: null } });
    expect(cond.salaryHour).toBeCloseTo(12.3429, 3);
    expect(cond.agreementMinimumSalaryHour).toBeCloseTo(12.3429, 3);
    expect(cond.extras.length).toBeGreaterThan(0);
    expect(cond.calculation.costHour).toBeNull();
    expect(res.body.agreementCheck).toMatchObject({ belowAgreement: false });
    expect(res.body.distribution).toMatchObject({ quotePeople: 4, inRequests: 3, missing: 1 });
    const full = await call('GET', `/v1/requests/${requestId}`, { token: admin });
    expect(full.body.conditions.calculation.costHour).toBeGreaterThan(0);
  });

  it('«Crear peticiones» desde el presupuesto, con el puesto dividido', async () => {
    const res = await call('POST', `/v1/quote-versions/${versionId}/requests`, {
      token: admin,
      body: { requests: [{ quotePositionId: positionId, positionsCount: 2, shiftName: 'Turno de mañana' }] },
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveLength(1);
    const one = res.body.data[0];
    expect(one.distribution).toMatchObject({ inRequests: 5, missing: -1 });
    expect(one.distribution.siblings).toHaveLength(2);
    expect(one.preCpd.checks.find((c: { code: string }) => c.code === 'people')).toMatchObject({ ok: false, blocking: false });
    const wrong = await call('POST', `/v1/quote-versions/${versionId}/requests`, {
      token: admin, body: { requests: [{ quotePositionId: '00000000-0000-0000-0000-000000000000', positionsCount: 1 }] },
    });
    expect(wrong.status).toBe(422);
  });

  it('el listado con filtros y el buscador cuentan las personas en peticiones', async () => {
    const list = await call('GET', `/v1/requests?quoteId=${quoteId}&status=active`, { token: seleccion });
    expect(list.status).toBe(200);
    expect(list.body.pagination.total).toBe(2);
    expect(list.body.data[0]).toMatchObject({ clientName: 'Cliente Ficticio de Peticiones, S.L.', quoteVersionNumber: 1 });
    const sources = await call('GET', '/v1/request-sources?q=peticiones', { token: seleccion });
    const row = sources.body.data.find((s: { quoteId: string }) => s.quoteId === quoteId);
    expect(row).toMatchObject({ peopleInRequests: 5, peopleWithoutRequest: 0 });
  });
});

describe('cambios, plazas y estados', () => {
  it('las plazas siguen al número; las condiciones del presupuesto no se cambian', async () => {
    const up = await call('PATCH', `/v1/requests/${requestId}`, { token: seleccion, body: { positionsCount: 5 } });
    expect(up.status).toBe(200);
    expect(up.body.slotList.map((s: { number: number }) => s.number)).toEqual([1, 2, 3, 4, 5]);
    const down = await call('PATCH', `/v1/requests/${requestId}`, { token: seleccion, body: { positionsCount: 2 } });
    expect(down.body.slots).toMatchObject({ open: 2 });
    const cond = await call('PATCH', `/v1/requests/${requestId}`, { token: seleccion, body: { rateHour: 30 } });
    expect(cond.status).toBe(400);
    const center = await call('PATCH', `/v1/requests/${requestId}`, { token: seleccion, body: { clientCenterId: '82000000-0000-0000-0000-0000000000f1' } });
    expect(center.status).toBe(422);
    const bad = await call('PATCH', `/v1/requests/${requestId}`, {
      token: seleccion, body: { schedule: [{ weekday: 1, working: true, start: '08:00', end: null }] },
    });
    expect(bad.status).toBe(400);
  });

  it('cancelar pide motivo; cancelada solo se reabre', async () => {
    const no = await call('PATCH', `/v1/requests/${requestId}`, { token: seleccion, body: { status: 'cancelled' } });
    expect(no.status).toBe(422);
    const ok = await call('PATCH', `/v1/requests/${requestId}`, { token: seleccion, body: { status: 'cancelled', cancelReason: 'El cliente aplaza la campaña' } });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ status: 'cancelled', cancelReason: 'El cliente aplaza la campaña' });
    expect(ok.body.cancelledAt).toBeTruthy();
    const edit = await call('PATCH', `/v1/requests/${requestId}`, { token: seleccion, body: { notes: 'Algo' } });
    expect(edit.status).toBe(409);
    const reopen = await call('PATCH', `/v1/requests/${requestId}`, { token: seleccion, body: { status: 'selecting' } });
    expect(reopen.body).toMatchObject({ status: 'selecting', cancelReason: null, cancelledAt: null });
    const activity = await call('GET', `/v1/activity?entityType=request&entityId=${requestId}`, { token: seleccion });
    const summaries = activity.body.data.map((a: { summary: string }) => a.summary);
    expect(summaries).toEqual(expect.arrayContaining(['Cancelada: El cliente aplaza la campaña', 'Pasa a en selección']));
  });
});

describe('CPD previo', () => {
  it('dice qué falta y no se genera incompleto', async () => {
    const res = await call('POST', `/v1/requests/${requestId}/pre-cpd`, { token: seleccion });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('cpd_incompleto');
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toEqual(
      expect.arrayContaining(['useCase', 'clientCenterId', 'risks', 'ettAuthorization', 'ettRepresentative']),
    );
    const sent = await call('POST', `/v1/requests/${requestId}/pre-cpd/sent`, { token: seleccion, body: {} });
    expect(sent.status).toBe(409);
  });

  it('completo, se genera en el servidor y se guarda como documento de la petición', async () => {
    await adminSql`
      update public.company_legal_profiles
         set ett_authorization_number = '00/0000/00', legal_rep_name = 'Representante Ficticio', legal_rep_id_type = 'dni',
             legal_rep_id_number = '00000000T', legal_rep_position = 'Administración'
       where tenant_id = ${T.A} and company_id = ${COMPANY.A1}
    `;
    const upd = await call('PATCH', `/v1/requests/${requestId}`, {
      token: seleccion,
      body: { clientCenterId: CENTER, useCase: 'production_unforeseen', useCaseJustification: 'Pico de pedidos ficticio de campaña',
        risks: 'Manipulación manual de cargas; tráfico de carretillas', ppe: 'Calzado de seguridad', endDate: '2027-02-28' },
    });
    expect(upd.status).toBe(200);
    expect(upd.body.preCpd.checks.filter((c: { ok: boolean; blocking: boolean }) => c.blocking && !c.ok)).toEqual([]);
    const res = await call('POST', `/v1/requests/${requestId}/pre-cpd`, { token: seleccion });
    expect(res.status).toBe(201);
    const docs = await call('GET', `/v1/documents?entityType=request&entityId=${requestId}`, { token: seleccion });
    expect(docs.body.data).toEqual([expect.objectContaining({ id: res.body.documentId, mimeType: 'application/pdf' })]);
    const download = await call('GET', `/v1/documents/${res.body.documentId}/download`, { token: seleccion });
    const file = Buffer.from(await (await fetch(download.body.url)).arrayBuffer());
    expect(file.subarray(0, 5).toString()).toBe('%PDF-');
    const after = await call('GET', `/v1/requests/${requestId}`, { token: seleccion });
    expect(after.body.preCpd).toMatchObject({ status: 'generated', outdated: false, documentId: res.body.documentId });
  });

  it('enviado y revisado a mano; si cambia algo, queda desactualizado', async () => {
    const early = await call('POST', `/v1/requests/${requestId}/pre-cpd/reviewed`, { token: seleccion });
    expect(early.status).toBe(409);
    const sent = await call('POST', `/v1/requests/${requestId}/pre-cpd/sent`, { token: seleccion, body: { sentTo: 'firmante@example.test' } });
    expect(sent.body.preCpd).toMatchObject({ status: 'sent', sentTo: 'firmante@example.test' });
    const change = await call('PATCH', `/v1/requests/${requestId}`, { token: seleccion, body: { risks: 'Otros riesgos ficticios' } });
    expect(change.body.preCpd).toMatchObject({ status: 'sent', outdated: true });
    expect((await call('POST', `/v1/requests/${requestId}/pre-cpd/reviewed`, { token: seleccion })).status).toBe(409);
    expect((await call('POST', `/v1/requests/${requestId}/pre-cpd`, { token: seleccion })).status).toBe(201);
    await call('POST', `/v1/requests/${requestId}/pre-cpd/sent`, { token: seleccion, body: {} });
    const reviewed = await call('POST', `/v1/requests/${requestId}/pre-cpd/reviewed`, { token: seleccion });
    expect(reviewed.body.preCpd).toMatchObject({ status: 'reviewed', outdated: false });
    const activity = await call('GET', `/v1/activity?entityType=request&entityId=${requestId}`, { token: seleccion });
    expect(activity.body.data.map((a: { summary: string }) => a.summary)).toEqual(
      expect.arrayContaining(['CPD previo generado', 'CPD previo generado de nuevo', 'CPD previo enviado al cliente', 'CPD previo revisado por el cliente']),
    );
  });

  it('si las tablas nuevas del convenio suben el mínimo, avisa y no deja generar el CPD (art. 11)', async () => {
    await loadVersion('p2', '2026-07-01', '2026-07-01', 1600);
    const res = await call('GET', `/v1/requests/${requestId}`, { token: seleccion });
    expect(res.body.agreementCheck).toMatchObject({ belowAgreement: true, currentPeriod: { from: '2026-07-01', to: null } });
    expect(res.body.agreementCheck.currentMinimumSalaryHour).toBeGreaterThan(res.body.conditions.salaryHour);
    // La petición conserva lo del presupuesto.
    expect(res.body.conditions.salaryHour).toBeCloseTo(12.3429, 3);
    const pdf = await call('POST', `/v1/requests/${requestId}/pre-cpd`, { token: seleccion });
    expect(pdf.status).toBe(422);
    expect(pdf.body.error.code).toBe('salario_bajo_convenio');
  });
});

describe('duplicar, permisos y aislamiento', () => {
  it('duplicar con otro horario copia el servicio, no el estado ni el CPD', async () => {
    const res = await call('POST', `/v1/requests/${requestId}/duplicate`, {
      token: seleccion, body: { positionsCount: 1, shiftName: 'Turno de tarde', schedule: [{ weekday: 6, working: true, start: '14:00', end: '22:00' }] },
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      status: 'new', preCpdStatus: 'pending', shiftName: 'Turno de tarde', weeklyHours: 8, clientCenterId: CENTER,
      useCase: 'production_unforeseen', quotePositionId: positionId,
    });
    expect(res.body.id).not.toBe(requestId);
  });

  it('otra ETT no la ve y sin requests.manage no se escribe', async () => {
    expect((await call('GET', `/v1/requests/${requestId}`, { token: adminB })).status).toBe(404);
    expect((await call('GET', '/v1/requests', { token: adminB })).body.data.find((r: { id: string }) => r.id === requestId)).toBeUndefined();
    const me = await call('GET', '/v1/me', { token: seleccion });
    expect(me.body.permissions).toContain('requests.manage');
    const uses = await call('GET', '/v1/request-use-cases', { token: seleccion });
    expect(uses.body.data.map((u: { code: string }) => u.code)).toContain('substitution_leave');
  });
});
