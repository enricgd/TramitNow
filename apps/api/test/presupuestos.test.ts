// Presupuestos (routes/quotes.ts): alta con número de serie, puestos rellenos desde el convenio global, salario
// nunca por debajo del convenio, aprobación del margen, envío, rechazo, versiones, obsoleto, duplicar, PDF de la
// propuesta, historial y aislamiento. Datos inventados (REGCON 99999999999941).

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BRANCH, COMPANY, T, USER, adminSql, call, closeAll, tokenFor } from './helpers.js';

const REGCON = '99999999999941';
const COMMERCIAL = 'a0000000-0000-0000-0000-000000000003';
const CLIENT = '81000000-0000-0000-0000-0000000000f1';
const CONTACT = '83000000-0000-0000-0000-0000000000f1';
const AGREEMENT = '43000000-0000-0000-0000-0000000000f1';

let admin: string;
let commercial: string;
let seleccion: string;
let adminB: string;
let categoryId: string;

async function publishAgreement() {
  await adminSql.begin(async (tx) => {
    await tx`
      select private.load_agreement_file(${tx.json({
        agreement: { regcon: REGCON, name: 'Convenio ficticio de presupuestos (API)', scope: 'provincial', territory: '48',
          cnae: ['52'], validFrom: '2026-01-01', validTo: null },
        publications: [{ id: 'p1', bulletin: 'BOB', date: '2026-02-01', number: 'PRUEBA-API-1', url: null, type: 'texto_inicial' }],
        versions: [{
          publication: 'p1', effectiveFrom: '2026-01-01', effectiveTo: null,
          categories: [{ code: 'G1', name: 'Mozo (ficticio)' }],
          salaryItems: [
            { category: 'G1', concept: 'salario_base', amount: 1500, unit: 'mes' },
            { category: null, concept: 'plus_convenio', amount: 50, unit: 'mes' },
            { category: null, concept: 'hora_extra', amount: 25, unit: 'porcentaje' },
          ],
          conditions: { annualHours: 1750, vacationDays: 30, vacationDaysType: 'naturales', extraPayments: 2 },
        }],
      } as never)}, 'contenidos.1@example.test')
    `;
    const claims = { sub: USER.content2, role: 'authenticated' };
    await tx`select set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`;
    await tx`set local role authenticated`;
    const [v] = await tx<{ id: string }[]>`
      select v.id from public.agreement_versions v join public.agreements a on a.id = v.agreement_id where a.regcon = ${REGCON}
    `;
    await tx`update public.agreement_versions set reviewed_by = ${USER.content2} where id = ${v!.id}`;
    await tx`update public.agreement_versions set status = 'publicada' where id = ${v!.id}`;
  });
  const [cat] = await adminSql<{ id: string }[]>`
    select c.id from public.agreement_categories c join public.agreement_versions v on v.id = c.version_id
    join public.agreements a on a.id = v.agreement_id where a.regcon = ${REGCON}
  `;
  categoryId = cat!.id;
}

beforeAll(async () => {
  await publishAgreement();
  await adminSql`select private.seed_quote_catalogs(${T.A})`;
  await adminSql`
    insert into public.collective_agreements (id, tenant_id, code, name, global_agreement_id)
    values (${AGREEMENT}, ${T.A}, 'TEST-PRE', 'Convenio ficticio enlazado',
            (select id from public.agreements where regcon = ${REGCON}))
  `;
  await adminSql`
    insert into public.clients (id, tenant_id, company_id, branch_id, code, legal_name, tax_id, sector_code, default_agreement_id)
    values (${CLIENT}, ${T.A}, ${COMPANY.A1}, ${BRANCH.A1}, 'TEST-PRE-1', 'Cliente Ficticio de Presupuestos, S.L.', 'B00000000', '52', ${AGREEMENT})
  `;
  await adminSql`
    insert into public.client_contacts (id, tenant_id, client_id, name, email, is_quote_recipient)
    values (${CONTACT}, ${T.A}, ${CLIENT}, 'Contacto Ficticio', 'contacto@example.test', true)
  `;
  await adminSql`update public.tenants set quote_min_margin_percent = 15 where id = ${T.A}`;
  await adminSql`
    insert into auth.users (id, email, raw_user_meta_data)
    values (${COMMERCIAL}, 'comercial.a@example.test', '{"full_name": "Comercial Ficticio"}')
  `;
  await adminSql`
    insert into public.memberships (tenant_id, user_id, role_id)
    select ${T.A}, ${COMMERCIAL}, id from public.roles where tenant_id = ${T.A} and code = 'comercial'
  `;
  await adminSql`
    insert into public.user_contexts (tenant_id, membership_id, company_id, branch_id, is_default)
    select tenant_id, id, ${COMPANY.A1}, ${BRANCH.A1}, true from public.memberships where user_id = ${COMMERCIAL}
  `;
  admin = await tokenFor(USER.adminA);
  commercial = await tokenFor(COMMERCIAL);
  seleccion = await tokenFor(USER.selA);
  adminB = await tokenFor(USER.adminB);
});

afterAll(async () => {
  const paths = await adminSql<{ path: string }[]>`
    delete from public.documents where tenant_id = ${T.A} and entity_type = 'quote' returning storage_path as path
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
  // Los presupuestos no se borran por la API: limpieza directa de los datos de prueba.
  await adminSql`delete from public.quotes where tenant_id = ${T.A}`;
  await adminSql`delete from public.clients where id = ${CLIENT}`;
  await adminSql`delete from public.collective_agreements where id = ${AGREEMENT}`;
  await adminSql`update public.tenants set quote_min_margin_percent = null where id = ${T.A}`;
  await adminSql`delete from auth.users where id = ${COMMERCIAL}`;
  await adminSql.begin(async (tx) => {
    await tx`set local tramitnow.purge_agreements = 'on'`;
    await tx`delete from public.agreements where regcon = ${REGCON}`;
  });
  await closeAll();
});

let quoteId: string;
let versionId: string;
let positionId: string;

describe('alta y puestos', () => {
  it('el comercial crea un presupuesto con número, comercial, contacto y valores por defecto', async () => {
    const res = await call('POST', '/v1/quotes', { token: commercial, body: { clientId: CLIENT, title: 'Campaña ficticia' } });
    expect(res.status).toBe(201);
    quoteId = res.body.id;
    versionId = res.body.currentVersion.id;
    expect(res.body.code).toMatch(/^PRE\d{4}-\d{5}$/);
    expect(res.body.status).toBe('draft');
    expect(res.body.clientAgreementId).toBe(AGREEMENT);
    const v = res.body.currentVersion;
    expect(v.salesRepId).toBe(COMMERCIAL);
    expect(v.contactId).toBe(CONTACT);
    expect(v.costConcepts.map((c: { code: string }) => c.code)).toEqual(['absenteeism', 'ppe', 'medical']);
    expect(v.defaultExtras).toHaveLength(4);
    expect(v.ssRates.atEp).toBe(3.5);
    expect(v.margin).toEqual({ mode: 'percent', value: 18 });
    expect(v.editable).toBe(true);
  });

  it('las tablas del convenio vigente para el panel del puesto', async () => {
    const list = await call('GET', `/v1/quote-agreement-defaults?collectiveAgreementId=${AGREEMENT}&date=2026-11-16`, { token: commercial });
    expect(list.status).toBe(200);
    expect(list.body.effectiveFrom).toBe('2026-01-01');
    expect(list.body.categories).toEqual([expect.objectContaining({ id: categoryId, code: 'G1' })]);
    const one = await call('GET', `/v1/quote-agreement-defaults?collectiveAgreementId=${AGREEMENT}&agreementCategoryId=${categoryId}`, {
      token: commercial,
    });
    expect(one.body.defaults).toMatchObject({ annualBaseSalary: 21000, monthlyBonus: 50, annualPayments: 14, annualHours: 1750, minimumSalaryHour: 12.3429 });
  });

  it('un puesto con categoría se rellena desde el convenio y se calcula', async () => {
    const res = await call('POST', `/v1/quote-versions/${versionId}/positions`, {
      token: commercial,
      body: { name: 'Mozo de almacén', collectiveAgreementId: AGREEMENT, agreementCategoryId: categoryId, people: 4, hoursPerPerson: 480 },
    });
    expect(res.status).toBe(201);
    const p = res.body.positions[0];
    positionId = p.id;
    expect(p).toMatchObject({
      annualBaseSalary: 21000, monthlyBonus: 50, annualHours: 1750, vacationDays: 30, manualFields: [],
      agreementMinimumSalaryHour: 12.3429, agreementPeriod: { from: '2026-01-01', to: null },
    });
    expect(p.extras.find((x: { code: string }) => x.code === 'overtime')).toMatchObject({ salaryCoefficient: 1.25 });
    expect(p.calculation.grossSalaryHour).toBeCloseTo(12.3429, 3);
    expect(p.calculation.issues).toContain('no_rate');
    expect(res.body.totals.hours).toBe(1920);
  });

  it('un salario por debajo del convenio se bloquea siempre', async () => {
    const res = await call('POST', `/v1/quote-versions/${versionId}/positions`, {
      token: commercial,
      body: { name: 'Mozo barato', collectiveAgreementId: AGREEMENT, agreementCategoryId: categoryId, annualBaseSalary: 20000 },
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('salario_bajo_convenio');
    const extra = await call('PATCH', `/v1/quote-positions/${positionId}`, {
      token: commercial,
      body: { extras: [{ code: 'overtime', name: 'Hora extra', salaryCoefficient: 1.1 }] },
    });
    expect(extra.status).toBe(200);
    // El salario de los extras que define el convenio sale del convenio: el coeficiente enviado no cuenta.
    expect(extra.body.positions[0].extras[0].salaryCoefficient).toBe(1.25);
    const manual = await call('PATCH', `/v1/quote-positions/${positionId}`, {
      token: commercial,
      body: { extras: [{ code: 'custom_low', name: 'Plus ficticio', salaryPerHour: 5, custom: true }] },
    });
    expect(manual.status).toBe(200);
  });

  it('lo cambiado a mano se marca y se puede volver al convenio', async () => {
    const res = await call('PATCH', `/v1/quote-positions/${positionId}`, { token: commercial, body: { annualBaseSalary: 22000 } });
    expect(res.status).toBe(200);
    expect(res.body.positions[0].manualFields).toEqual(['annualBaseSalary']);
    const back = await call('POST', `/v1/quote-positions/${positionId}/reset-from-agreement`, { token: commercial, body: {} });
    expect(back.body.positions[0].annualBaseSalary).toBe(21000);
    expect(back.body.positions[0].manualFields).toEqual([]);
  });

  it('los costes internos de siempre no se quitan del presupuesto', async () => {
    const res = await call('PATCH', `/v1/quote-versions/${versionId}`, { token: commercial, body: { costConcepts: [] } });
    expect(res.status).toBe(422);
  });
});

describe('envío y margen mínimo', () => {
  it('la revisión antes de enviar dice qué falta', async () => {
    const res = await call('POST', `/v1/quote-versions/${versionId}/send`, { token: commercial });
    expect(res.status).toBe(422);
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toEqual(['positions.0.hourlyRate']);
  });

  it('con el margen por debajo del mínimo hace falta aprobación', async () => {
    const before = await call('GET', `/v1/quote-versions/${versionId}`, { token: commercial });
    const cost = before.body.positions[0].calculation.costHour as number;
    const rate = Math.round((cost / 0.9) * 100) / 100;
    const upd = await call('PATCH', `/v1/quote-positions/${positionId}`, { token: commercial, body: { hourlyRate: rate } });
    expect(upd.body.positions[0].calculation.issues).toContain('margin_below_minimum');
    const send = await call('POST', `/v1/quote-versions/${versionId}/send`, { token: commercial });
    expect(send.status).toBe(409);
    expect(send.body.error.code).toBe('requiere_aprobacion');
  });

  it('el comercial la pide, no se la aprueba él y la aprueba un responsable', async () => {
    const req = await call('POST', `/v1/quote-versions/${versionId}/request-approval`, { token: commercial, body: { notes: 'Cliente estratégico' } });
    expect(req.status).toBe(200);
    expect(req.body.approvalStatus).toBe('pending');
    const self = await call('POST', `/v1/quote-versions/${versionId}/approve`, { token: commercial, body: {} });
    expect(self.status).toBe(403);
    const ok = await call('POST', `/v1/quote-versions/${versionId}/approve`, { token: admin, body: {} });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ approvalStatus: 'approved', approvalRequestedByName: 'Comercial Ficticio' });
    expect(ok.body.approvalDecidedAt).toBeTruthy();
  });

  it('aprobado, se envía y queda cerrado', async () => {
    const res = await call('POST', `/v1/quote-versions/${versionId}/send`, { token: commercial });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'sent', editable: false, minMarginPercent: 15 });
    const edit = await call('PATCH', `/v1/quote-versions/${versionId}`, { token: commercial, body: { title: 'Otro' } });
    expect(edit.status).toBe(409);
    const pos = await call('PATCH', `/v1/quote-positions/${positionId}`, { token: commercial, body: { people: 9 } });
    expect(pos.status).toBe(409);
  });

  it('el listado lo muestra enviado, con sus importes', async () => {
    const res = await call('GET', '/v1/quotes?status=sent', { token: commercial });
    expect(res.status).toBe(200);
    const row = res.body.data.find((q: { id: string }) => q.id === quoteId);
    expect(row).toMatchObject({ status: 'sent', positionsCount: 1, daysWithoutResponse: 0, noResponse: false, people: 4, hours: 1920 });
    expect(row.revenue).toBeGreaterThan(0);
  });
});

describe('PDF de la propuesta', () => {
  it('se genera en el servidor y se guarda como documento del presupuesto, sin nada interno', async () => {
    const res = await call('POST', `/v1/quote-versions/${versionId}/proposal-pdf`, { token: commercial });
    expect(res.status).toBe(201);
    const docs = await call('GET', `/v1/documents?entityType=quote&entityId=${quoteId}`, { token: commercial });
    expect(docs.body.data).toEqual([expect.objectContaining({ id: res.body.documentId, typeName: 'Propuesta de presupuesto', mimeType: 'application/pdf' })]);
    const download = await call('GET', `/v1/documents/${res.body.documentId}/download`, { token: commercial });
    const file = Buffer.from(await (await fetch(download.body.url)).arrayBuffer());
    expect(file.subarray(0, 5).toString()).toBe('%PDF-');
    expect(file.length).toBeGreaterThan(1000);
  });
});

describe('rechazo, versiones, obsoleto y duplicar', () => {
  it('rechazado con motivo y versión nueva para negociar', async () => {
    const [reason] = await adminSql<{ id: string }[]>`
      select id from public.catalog_items where tenant_id = ${T.A} and catalog = 'quote_rejection_reason' and code = 'price'
    `;
    const rej = await call('POST', `/v1/quote-versions/${versionId}/reject`, { token: commercial, body: { reasonId: reason!.id, notes: 'Precio alto' } });
    expect(rej.status).toBe(200);
    expect(rej.body).toMatchObject({ status: 'rejected', rejectionReasonName: 'Precio' });

    const v2 = await call('POST', `/v1/quote-versions/${versionId}/new-version`, { token: commercial });
    expect(v2.status).toBe(201);
    expect(v2.body).toMatchObject({ versionNumber: 2, status: 'draft', approvalStatus: null });
    expect(v2.body.positions).toHaveLength(1);
    const quote = await call('GET', `/v1/quotes/${quoteId}`, { token: commercial });
    expect(quote.body.versions.map((v: { versionNumber: number; status: string }) => [v.versionNumber, v.status])).toEqual([
      [2, 'draft'],
      [1, 'superseded'],
    ]);
  });

  it('obsoleto y uno nuevo a partir de él', async () => {
    const res = await call('POST', `/v1/quotes/${quoteId}/obsolete`, { token: commercial, body: { reason: 'Cambian las tablas del convenio' } });
    expect(res.status).toBe(201);
    expect(res.body.obsolete).toMatchObject({ status: 'obsolete', obsoleteReason: 'Cambian las tablas del convenio', replacedByQuoteId: res.body.created.id });
    expect(res.body.created).toMatchObject({ status: 'draft', createdFromQuoteId: quoteId, clientId: CLIENT });
    expect(res.body.created.code).not.toBe(res.body.obsolete.code);
    const again = await call('POST', `/v1/quotes/${quoteId}/obsolete`, { token: commercial, body: { reason: 'Otra vez' } });
    expect(again.status).toBe(409);
  });

  it('duplicar para otro cliente: sin cliente no se envía', async () => {
    const dup = await call('POST', `/v1/quotes/${quoteId}/duplicate`, { token: commercial });
    expect(dup.status).toBe(201);
    expect(dup.body).toMatchObject({ clientId: null, versionNumber: 1 });
    expect(dup.body.currentVersion.contactId).toBeNull();
    const send = await call('POST', `/v1/quote-versions/${dup.body.currentVersion.id}/send`, { token: commercial });
    expect(send.status).toBe(422);
    expect(send.body.error.details.map((d: { path: string }) => d.path)).toContain('clientId');
    const pick = await call('PATCH', `/v1/quotes/${dup.body.id}`, { token: commercial, body: { clientId: CLIENT } });
    expect(pick.status).toBe(200);
    expect(pick.body.currentVersion.contactId).toBe(CONTACT);
  });

  it('el historial recoge el envío, el rechazo y el obsoleto', async () => {
    const res = await call('GET', `/v1/activity?entityType=quote&entityId=${quoteId}&limit=100`, { token: commercial });
    const summaries = res.body.data.map((a: { summary: string }) => a.summary);
    expect(summaries).toEqual(expect.arrayContaining([
      'Envío al cliente (v1)', 'Aprobación del margen (v1)', 'Rechazado por el cliente (v1)',
      'Pasa a obsoleto: Cambian las tablas del convenio',
    ]));
  });
});

describe('aislamiento', () => {
  it('selección no ve presupuestos y otra ETT tampoco', async () => {
    const sel = await call('GET', '/v1/quotes', { token: seleccion });
    expect(sel.body.pagination.total).toBe(0);
    const b = await call('GET', `/v1/quotes/${quoteId}`, { token: adminB });
    expect(b.status).toBe(404);
    const write = await call('POST', '/v1/quotes', { token: seleccion, body: { branchId: BRANCH.A1 } });
    expect(write.status).toBe(403);
  });
});
