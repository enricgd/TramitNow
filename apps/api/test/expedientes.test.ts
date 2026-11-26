// Expedientes (routes/hiring-files.ts y las rutas del art. 8 de requests.ts): se abren al confirmar, pasos con su
// estado, próxima tarea y KPI, art. 8 (declaraciones, cliente ETT), CPD firmado, contrato, PRL sin diagnóstico, alta
// anterior al inicio, permisos por paso, cancelación al liberar la plaza, historial y aislamiento. Datos inventados.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BRANCH, COMPANY, T, USER, adminSql, call, closeAll, hookClaims, tokenFor } from './helpers.js';

const CLIENT = '81000000-0000-0000-0000-0000000000f7';
const CONTACT = '83000000-0000-0000-0000-0000000000f7';
const QUOTE = '84000000-0000-0000-0000-0000000000f7';
const VERSION = '85000000-0000-0000-0000-0000000000f7';
const POSITION = '86000000-0000-0000-0000-0000000000f7';

const day = (offset: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};
const START = day(14);

let admin: string;
let seleccion: string;
let adminB: string;
let requestId: string;
let candidateId: string;
let applicationId: string;
let fileId: string;

/** Documento de prueba (sin fichero en Storage: estas rutas no lo leen). */
async function doc(entityType: string, entityId: string, code: string, name: string) {
  const [d] = await adminSql<{ id: string }[]>`
    insert into public.documents (tenant_id, entity_type, entity_id, type_id, name, storage_path, mime_type, size_bytes, status)
    select ${T.A}, ${entityType}, ${entityId}, id, ${name}, ${`${T.A}/${entityType}/${entityId}/${crypto.randomUUID()}.pdf`},
           'application/pdf', 100, 'validated'
    from public.catalog_items where tenant_id = ${T.A} and catalog = 'document_type' and code = ${code}
    returning id
  `;
  return d!.id;
}

beforeAll(async () => {
  await adminSql`select private.seed_hiring_catalogs(${T.A})`;
  await adminSql`
    insert into public.clients (id, tenant_id, company_id, branch_id, code, legal_name)
    values (${CLIENT}, ${T.A}, ${COMPANY.A1}, ${BRANCH.A1}, 'TEST-EXP-1', 'Cliente Ficticio de Expedientes, S.L.')
  `;
  await adminSql`
    insert into public.client_contacts (id, tenant_id, client_id, name, position, signs_cpds)
    values (${CONTACT}, ${T.A}, ${CLIENT}, 'Responsable Ficticia', 'RR. HH.', true)
  `;
  await adminSql`insert into public.quotes (id, tenant_id, company_id, branch_id, client_id, code) values (${QUOTE}, ${T.A}, ${COMPANY.A1}, ${BRANCH.A1}, ${CLIENT}, 'PRE-EXP-1')`;
  await adminSql`insert into public.quote_versions (id, tenant_id, quote_id, version_number, ss_rates) values (${VERSION}, ${T.A}, ${QUOTE}, 1, '{}')`;
  await adminSql`
    insert into public.quote_positions (id, tenant_id, quote_id, version_id, name, custom_category_name, annual_base_salary,
      annual_hours, people, hours_per_person, hourly_rate, calc_gross_salary_hour, calc_rate_hour, calc_margin_percent)
    values (${POSITION}, ${T.A}, ${QUOTE}, ${VERSION}, 'Mozo/a de almacén', 'Ficticia', 22000, 1750, 2, 480, 20, 13, 20, 25)
  `;
  const claims = JSON.stringify(await hookClaims(USER.adminA));
  await adminSql.begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${claims}, true)`;
    await tx`set local role authenticated`;
    await tx`update public.quote_versions set status = 'sent' where id = ${VERSION}`;
    await tx`update public.quote_versions set status = 'accepted' where id = ${VERSION}`;
  });
  admin = await tokenFor(USER.adminA);
  seleccion = await tokenFor(USER.selA);
  adminB = await tokenFor(USER.adminB);
  const req = await call('POST', '/v1/requests', {
    token: admin, body: { quotePositionId: POSITION, positionsCount: 2, startDate: START, endDate: day(120), clientSignerContactId: CONTACT },
  });
  requestId = req.body.id;
  const cand = await call('POST', '/v1/candidates', {
    token: seleccion,
    // DNI 0000xxxx y NSS inventados, con su letra y su control.
    body: { firstName: 'Persona', lastName: 'Ficticia Expediente', idDocumentType: 'dni', idDocumentNumber: `00007777${'TRWAGMYFPDXBNJZSQVHLCKE'[7777 % 23]}`,
      idDocumentExpiresOn: day(5), ssNumber: `2800007777${String(Number(2800007777n % 97n)).padStart(2, '0')}` },
  });
  expect(cand.status).toBe(201);
  candidateId = cand.body.id;
  const app = await call('POST', '/v1/applications', { token: seleccion, body: { candidateId, requestId, origin: 'applied' } });
  applicationId = app.body.id;
});

afterAll(async () => {
  await adminSql`delete from public.requests where tenant_id = ${T.A} and client_id = ${CLIENT}`;
  // Los justificantes son de conservación obligatoria: en la limpieza de los datos de prueba se salta el trigger.
  await adminSql.begin(async (tx) => {
    await tx`set local session_replication_role = replica`;
    await tx`delete from public.documents where tenant_id = ${T.A} and entity_type in ('candidate', 'hiring_file', 'request')
             and (entity_id = ${candidateId ?? null} or entity_id = ${requestId ?? null} or entity_id = ${fileId ?? null})`;
  });
  await adminSql`delete from public.candidates where id = ${candidateId ?? null}`;
  await adminSql`delete from public.quotes where id = ${QUOTE}`;
  await adminSql`delete from public.clients where id = ${CLIENT}`;
  await closeAll();
});

type Step = { id: string; state: string; issues: { code: string; severity: string; dueDate?: string }[] };
const step = (file: { steps: Step[] }, id: string) => file.steps.find((s) => s.id === id)!;
const codes = (file: { steps: Step[] }, id: string) => step(file, id).issues.map((i) => i.code);

describe('apertura y estado', () => {
  it('al confirmar la candidatura se abre el expediente, con los pasos y la próxima tarea', async () => {
    expect((await call('GET', `/v1/hiring-files?requestId=${requestId}`, { token: admin })).body.data).toEqual([]);
    await call('POST', `/v1/applications/${applicationId}/propose`, { token: seleccion, body: {} });
    await call('POST', `/v1/applications/${applicationId}/confirm`, { token: seleccion });
    const list = await call('GET', `/v1/hiring-files?requestId=${requestId}`, { token: seleccion });
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    const row = list.body.data[0];
    fileId = row.id;
    expect(row).toMatchObject({
      status: 'open', state: 'pending', ready: false, complete: false, startDate: START, endDate: day(120), slotNumber: 1, requestCode: expect.stringMatching(/^PET/),
      candidateName: 'Persona Ficticia Expediente', clientName: 'Cliente Ficticio de Expedientes, S.L.', idDocument: { type: 'dni' },
    });
    expect(row.steps.map((s: Step) => s.id)).toEqual(['documentation', 'cpd', 'contract', 'prl', 'ss_registration']);
    // Documentación: DNI que caduca antes del inicio, sin escaneo ni IBAN. Solo avisa.
    expect(codes(row, 'documentation')).toEqual(expect.arrayContaining(['id_document_expired', 'id_scan_missing', 'iban_missing']));
    expect(step(row, 'documentation').issues.every((i) => i.severity === 'warning')).toBe(true);
    expect(codes(row, 'cpd')).toEqual(['strike_undeclared', 'downsized_positions_undeclared', 'cpd_not_signed']);
    expect(row.nextTask).toMatchObject({ step: 'cpd', code: 'strike_undeclared', severity: 'required' });
    expect(list.body.facets).toMatchObject({ total: 1, ready: 0, pending: 1, blocked: 0, complete: 0, cancelled: 0,
      missingByStep: { documentation: 1, cpd: 1, contract: 1, prl: 1, ss_registration: 1 } });
  });

  it('Selección ve y lleva la documentación, pero no registra la PRL ni el alta', async () => {
    const prl = await call('PATCH', `/v1/hiring-files/${fileId}`, { token: seleccion, body: { prlTrainingDate: day(0) } });
    expect(prl.status).toBe(403);
    expect(prl.body.error.message).toContain('hiring_files.prl');
    expect((await call('PATCH', `/v1/hiring-files/${fileId}`, { token: seleccion, body: { ssRegistrationDate: day(13) } })).status).toBe(403);
    expect((await call('PATCH', `/v1/hiring-files/${fileId}`, { token: seleccion, body: { notes: 'Pedido el DNI renovado' } })).status).toBe(200);
    expect((await call('POST', `/v1/requests/${requestId}/declarations`, {
      token: seleccion, body: { kind: 'strike', affirmative: false, channel: 'email', declaredAt: day(0) } })).status).toBe(403);
  });
});

describe('art. 8 y CPD firmado', () => {
  it('declaración de huelga: bloquea el expediente y el CPD firmado', async () => {
    const res = await call('POST', `/v1/requests/${requestId}/declarations`, {
      token: admin, body: { kind: 'strike', affirmative: true, contactId: CONTACT, channel: 'phone', declaredAt: day(0), notes: 'Huelga ficticia' },
    });
    expect(res.status).toBe(201);
    expect(res.body.art8.declarations.strike).toMatchObject({ affirmative: true, contactName: 'Responsable Ficticia', recordedByName: expect.any(String) });
    const file = (await call('GET', `/v1/hiring-files/${fileId}`, { token: admin })).body;
    expect(file).toMatchObject({ state: 'blocked', nextTask: { code: 'strike', severity: 'blocked' } });
    const cpdDoc = await doc('request', requestId, 'request_cpd_signed', 'CPD firmado ficticio.pdf');
    const signed = await call('PUT', `/v1/requests/${requestId}/cpd-signed`, { token: admin, body: { documentId: cpdDoc, signedAt: day(0) } });
    expect(signed.status).toBe(422);
    expect(signed.body.error).toMatchObject({ code: 'art8_bloqueado', details: [{ path: 'strike' }] });
  });

  it('el cliente marcado como ETT también bloquea', async () => {
    const upd = await call('PATCH', `/v1/clients/${CLIENT}`, { token: admin, body: { isEtt: true } });
    expect(upd.body.isEtt).toBe(true);
    const req = await call('GET', `/v1/requests/${requestId}`, { token: admin });
    expect(req.body.art8.issues.map((i: { code: string }) => i.code)).toEqual(expect.arrayContaining(['client_is_ett', 'strike']));
    expect(req.body.preCpd.checks.find((c: { code: string }) => c.code === 'art8_client_is_ett')).toMatchObject({ blocking: true, ok: false });
    await call('PATCH', `/v1/clients/${CLIENT}`, { token: admin, body: { isEtt: false } });
  });

  it('con las dos declaraciones en negativo, se registra el CPD firmado', async () => {
    await call('POST', `/v1/requests/${requestId}/declarations`, {
      token: admin, body: { kind: 'strike', affirmative: false, contactId: CONTACT, channel: 'email', declaredAt: day(0) } });
    const decl = await call('POST', `/v1/requests/${requestId}/declarations`, {
      token: admin, body: { kind: 'downsized_positions', affirmative: false, contactId: CONTACT, channel: 'paper', declaredAt: day(0) } });
    expect(decl.body.art8.issues).toEqual([]);
    expect(decl.body.art8.history).toHaveLength(3);
    const cpdDoc = await doc('request', requestId, 'request_cpd_signed', 'CPD firmado ficticio 2.pdf');
    const signed = await call('PUT', `/v1/requests/${requestId}/cpd-signed`, { token: admin, body: { documentId: cpdDoc, signedAt: day(0) } });
    expect(signed.status).toBe(200);
    expect(signed.body.cpdSigned).toMatchObject({ signedAt: day(0), documentId: cpdDoc, recordedByName: expect.any(String) });
    const file = (await call('GET', `/v1/hiring-files/${fileId}`, { token: admin })).body;
    expect(step(file, 'cpd').state).toBe('done');
  });
});

describe('contrato, PRL y alta', () => {
  it('el contrato cuenta firmado; Contrat@ y copia básica avisan con su plazo', async () => {
    const bad = await call('POST', `/v1/hiring-files/${fileId}/contracts`, {
      token: admin, body: { kind: 'production', contractKey: '410', startDate: START, endDate: day(120) } });
    expect(bad.status).toBe(422);
    const unsigned = await call('POST', `/v1/hiring-files/${fileId}/contracts`, {
      token: admin, body: { kind: 'production', contractKey: '402', startDate: START, endDate: day(120) } });
    expect(unsigned.status).toBe(201);
    expect(codes(unsigned.body, 'contract')).toEqual(expect.arrayContaining(['contract_unsigned', 'contrata_pending']));
    expect(step(unsigned.body, 'contract').state).toBe('in_progress');
    const contractDoc = await doc('hiring_file', fileId, 'hiring_contract', 'Contrato firmado ficticio.pdf');
    const signed = await call('PATCH', `/v1/employment-contracts/${unsigned.body.contracts[0].id}`, {
      token: admin, body: { signedAt: day(0), documentId: contractDoc } });
    expect(signed.status).toBe(200);
    expect(step(signed.body, 'contract').state).toBe('done');
    expect(step(signed.body, 'contract').issues.find((i) => i.code === 'basic_copy_pending')?.dueDate).toBe(day(10));
    expect(signed.body.contracts[0]).toMatchObject({ contractKeyName: expect.stringContaining('producción'), contrataDueDate: day(24) });
  });

  it('PRL: solo apto, no apto o renuncia; «no apto» bloquea', async () => {
    const cert = await doc('hiring_file', fileId, 'hiring_prl_training', 'Certificado PRL ficticio.pdf');
    const future = await call('PATCH', `/v1/hiring-files/${fileId}`, { token: admin, body: { prlTrainingDate: day(3) } });
    expect(future.status).toBe(422);
    const unfit = await call('PATCH', `/v1/hiring-files/${fileId}`, {
      token: admin, body: { prlTrainingDate: day(0), prlTrainingHours: 20, prlTrainingDocumentId: cert, healthSurveillanceResult: 'unfit', healthSurveillanceDate: day(0) } });
    expect(unfit.status).toBe(200);
    expect(unfit.body).toMatchObject({ state: 'blocked', nextTask: { code: 'health_unfit' } });
    const fit = await call('PATCH', `/v1/hiring-files/${fileId}`, { token: admin, body: { healthSurveillanceResult: 'fit' } });
    expect(step(fit.body, 'prl')).toMatchObject({ state: 'done' });
    expect(codes(fit.body, 'prl')).toEqual(['ppe_pending']);
  });

  it('el alta tiene que ser anterior al inicio; con todo, listo para empezar', async () => {
    const proof = await doc('hiring_file', fileId, 'hiring_ss_registration', 'Justificante alta ficticio.pdf');
    const late = await call('PATCH', `/v1/hiring-files/${fileId}`, { token: admin, body: { ssRegistrationDate: day(20), ssRegistrationDocumentId: proof } });
    expect(codes(late.body, 'ss_registration')).toEqual(['ss_registration_after_start']);
    expect(late.body.ready).toBe(false);
    const ok = await call('PATCH', `/v1/hiring-files/${fileId}`, { token: admin, body: { ssRegistrationDate: day(13) } });
    expect(ok.body).toMatchObject({ ready: true, state: 'ready', complete: false, completedSteps: 4 });
    expect(ok.body.ssRegistration.recordedByName).toBeTruthy();
    // Lo que queda solo avisa: documentación, EPI y Contrat@.
    expect(ok.body.nextTask).toMatchObject({ step: 'documentation', severity: 'warning' });
    const list = await call('GET', `/v1/hiring-files?requestId=${requestId}&state=ready`, { token: admin });
    expect(list.body.data.map((r: { id: string }) => r.id)).toEqual([fileId]);
    expect(list.body.facets).toMatchObject({ ready: 1, pending: 0, missingByStep: { documentation: 1, cpd: 0, contract: 0, prl: 0, ss_registration: 0 } });
    const missing = await call('GET', `/v1/hiring-files?requestId=${requestId}&missingStep=contract`, { token: admin });
    expect(missing.body.data).toEqual([]);
  });

  it('el historial del expediente recoge los pasos', async () => {
    const act = await call('GET', `/v1/activity?entityType=hiring_file&entityId=${fileId}&includeChildren=true`, { token: admin });
    expect(act.status).toBe(200);
    expect(act.body.data.map((a: { entityType: string }) => a.entityType)).toEqual(expect.arrayContaining(['hiring_file', 'employment_contract']));
  });
});

describe('cancelación y aislamiento', () => {
  it('otra ETT no lo ve', async () => {
    expect((await call('GET', `/v1/hiring-files/${fileId}`, { token: adminB })).status).toBe(404);
    expect((await call('GET', '/v1/hiring-files', { token: adminB })).body.data.find((r: { id: string }) => r.id === fileId)).toBeUndefined();
  });

  it('liberar la plaza cancela el expediente: no se puede cambiar y sale aparte en el listado', async () => {
    await call('POST', `/v1/applications/${applicationId}/release`, { token: seleccion });
    const file = (await call('GET', `/v1/hiring-files/${fileId}`, { token: admin })).body;
    expect(file).toMatchObject({ status: 'cancelled', state: 'cancelled', ready: false, nextTask: null });
    expect((await call('PATCH', `/v1/hiring-files/${fileId}`, { token: admin, body: { notes: 'x' } })).status).toBe(409);
    const list = await call('GET', `/v1/hiring-files?requestId=${requestId}`, { token: admin });
    expect(list.body.data).toEqual([]);
    expect(list.body.facets.cancelled).toBe(1);
    expect((await call('GET', `/v1/hiring-files?requestId=${requestId}&state=cancelled`, { token: admin })).body.data).toHaveLength(1);
  });
});
