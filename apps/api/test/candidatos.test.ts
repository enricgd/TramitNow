// Candidatos (routes/candidates.ts y applications.ts): datos sensibles cifrados y enmascarados, duplicados por la huella
// del documento, ver completo con permiso y auditado, sinónimos, consentimientos, salud con base legal, candidaturas
// que reservan y cubren plazas, anonimizar, exportar y aislamiento. Todos los números son inventados.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { BRANCH, COMPANY, T, USER, adminSql, apiSql, call, closeAll, hookClaims, secret, tokenFor } from './helpers.js';

const CLIENT = '81000000-0000-0000-0000-0000000000f6';
const QUOTE = '84000000-0000-0000-0000-0000000000f6';
const VERSION = '85000000-0000-0000-0000-0000000000f6';
const POSITION = '86000000-0000-0000-0000-0000000000f6';

let admin: string;
let seleccion: string;
let adminB: string;
let candidateId: string;
let otherId: string;
let requestId: string;

beforeAll(async () => {
  await adminSql`select private.seed_candidate_catalogs(${T.A})`;
  await adminSql`
    insert into public.clients (id, tenant_id, company_id, branch_id, code, legal_name)
    values (${CLIENT}, ${T.A}, ${COMPANY.A1}, ${BRANCH.A1}, 'TEST-CAN-1', 'Cliente Ficticio de Candidatos, S.L.')
  `;
  // Presupuesto aceptado con un puesto ya calculado (sin convenio enlazado), para tener una petición.
  await adminSql`
    insert into public.quotes (id, tenant_id, company_id, branch_id, client_id, code)
    values (${QUOTE}, ${T.A}, ${COMPANY.A1}, ${BRANCH.A1}, ${CLIENT}, 'PRE-CAN-1')
  `;
  await adminSql`insert into public.quote_versions (id, tenant_id, quote_id, version_number, ss_rates) values (${VERSION}, ${T.A}, ${QUOTE}, 1, '{}')`;
  await adminSql`
    insert into public.quote_positions (id, tenant_id, quote_id, version_id, name, custom_category_name, annual_base_salary,
      annual_hours, people, hours_per_person, hourly_rate, calc_gross_salary_hour, calc_rate_hour, calc_margin_percent)
    values (${POSITION}, ${T.A}, ${QUOTE}, ${VERSION}, 'Carretillero/a', 'Ficticia', 22000, 1750, 2, 480, 20, 13, 20, 25)
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
  const req = await call('POST', '/v1/requests', { token: admin, body: { quotePositionId: POSITION, positionsCount: 2 } });
  requestId = req.body.id;
});

afterAll(async () => {
  await adminSql`delete from public.documents where tenant_id = ${T.A} and entity_type = 'candidate'`;
  await adminSql`delete from public.candidates where tenant_id = ${T.A} and code like 'CAN%'`;
  await adminSql`delete from public.privacy_notices where tenant_id = ${T.A} and version like 'TEST-%'`;
  await adminSql`delete from public.requests where tenant_id = ${T.A} and client_id = ${CLIENT}`;
  await adminSql`delete from public.quotes where id = ${QUOTE}`;
  await adminSql`delete from public.clients where id = ${CLIENT}`;
  await adminSql`delete from public.catalog_items where tenant_id = ${T.A} and name = 'Operador/a de grúa ficticia'`;
  await closeAll();
});

describe('alta y datos sensibles', () => {
  it('Selección da de alta un candidato: documento, Seguridad Social e IBAN cifrados y enmascarados', async () => {
    const res = await call('POST', '/v1/candidates', {
      token: seleccion,
      body: {
        firstName: 'Persona', lastName: 'Ficticia Uno', idDocumentType: 'dni', idDocumentNumber: '12345678-z',
        idDocumentExpiresOn: '2030-01-01', ssNumber: '28/00000001/38', iban: 'ES82 0000 0000 0000 0000 0000',
        phone: '+34 600 000 001', email: 'persona.uno@example.test', city: 'Bilbao', source: 'infojobs',
      },
    });
    expect(res.status).toBe(201);
    candidateId = res.body.id;
    expect(res.body.code).toMatch(/^CAN\d{4}-\d{5}$/);
    expect(res.body.idDocument).toEqual({ type: 'dni', masked: '•••••678Z', expiresOn: '2030-01-01', state: 'ok' });
    expect(res.body.ssNumber).toEqual({ masked: '•••••0138' });
    expect(res.body.iban).toEqual({ masked: '•••••0000' });
    expect(JSON.stringify(res.body)).not.toContain('12345678');
  });

  it('en la base de datos no está el dato en claro', async () => {
    const [row] = await adminSql<{ idDocumentNumberEnc: string; ssNumberEnc: string; ibanEnc: string; idDocumentFingerprint: string }[]>`
      select id_document_number_enc as "idDocumentNumberEnc", ss_number_enc as "ssNumberEnc", iban_enc as "ibanEnc",
             id_document_fingerprint as "idDocumentFingerprint" from public.candidates where id = ${candidateId}
    `;
    expect(row!.idDocumentNumberEnc).toMatch(/^v1:/);
    expect(row!.idDocumentNumberEnc).not.toContain('12345678');
    expect(row!.ssNumberEnc).not.toContain('2800000001');
    expect(row!.ibanEnc).not.toContain('ES82');
    expect(row!.idDocumentFingerprint).toMatch(/^[0-9a-f]{64}$/);
    const [log] = await adminSql<{ changes: string }[]>`
      select changes::text from public.activity_log where entity_type = 'candidate' and entity_id = ${candidateId}
    `;
    expect(log?.changes ?? '').not.toContain('12345678');
  });

  it('el mismo documento no se repite (por la huella) y la letra se valida', async () => {
    const dup = await call('POST', '/v1/candidates', { token: seleccion, body: { firstName: 'Otra', idDocumentType: 'dni', idDocumentNumber: '12345678Z' } });
    expect(dup.status).toBe(409);
    expect(dup.body.error.details[0]).toMatchObject({ path: 'idDocumentNumber' });
    const check = await call('POST', '/v1/candidates/check-duplicate', { token: seleccion, body: { idDocumentType: 'dni', idDocumentNumber: '12345678z' } });
    expect(check.body).toMatchObject({ valid: true, duplicate: { id: candidateId } });
    const bad = await call('POST', '/v1/candidates', { token: seleccion, body: { firstName: 'Otra', idDocumentType: 'dni', idDocumentNumber: '12345678A' } });
    expect(bad.status).toBe(422);
    const nie = await call('POST', '/v1/candidates', { token: seleccion, body: { firstName: 'Persona', lastName: 'Ficticia Dos', idDocumentType: 'nie', idDocumentNumber: 'Y1234567X' } });
    expect(nie.status).toBe(201);
    otherId = nie.body.id;
  });

  it('verlos completos exige personal_data.view y queda en la auditoría; abrir la ficha también, el listado no', async () => {
    const before = await adminSql<{ n: number }[]>`select count(*)::int as n from public.access_log where candidate_id = ${candidateId}`;
    expect((await call('GET', '/v1/candidates?q=ficticia', { token: seleccion })).status).toBe(200);
    expect((await adminSql<{ n: number }[]>`select count(*)::int as n from public.access_log where candidate_id = ${candidateId}`)[0]!.n).toBe(before[0]!.n);
    const denied = await call('GET', `/v1/candidates/${candidateId}/sensitive?fields=iban`, { token: seleccion });
    expect(denied.status).toBe(403);
    const full = await call('GET', `/v1/candidates/${candidateId}/sensitive?fields=idDocument,ssNumber,iban`, { token: admin });
    expect(full.body).toEqual({ idDocument: { type: 'dni', number: '12345678Z' }, ssNumber: '280000000138', iban: 'ES8200000000000000000000' });
    await call('GET', `/v1/candidates/${candidateId}`, { token: seleccion });
    const log = await call('GET', `/v1/access-log?candidateId=${candidateId}`, { token: admin });
    expect(log.body.data.map((a: { action: string }) => a.action)).toEqual(['view_record', 'view_sensitive']);
    expect(log.body.data[1].details).toEqual({ fields: ['idDocument', 'ssNumber', 'iban'] });
    expect((await call('GET', '/v1/access-log', { token: seleccion })).status).toBe(403);
  });

  it('sin clave de cifrado: los datos sensibles dan 503 y lo demás funciona', async () => {
    const noKey = createApp({ sql: apiSql, config: { jwtSecret: secret, jwtAudience: 'authenticated', corsOrigins: [] }, log: false });
    const post = (body: unknown) => noKey.request('/v1/candidates', {
      method: 'POST', headers: { Authorization: `Bearer ${seleccion}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    expect((await post({ firstName: 'Sin', idDocumentType: 'dni', idDocumentNumber: '87654321X' })).status).toBe(503);
    const ok = await post({ firstName: 'Persona', lastName: 'Ficticia Tres' });
    expect(ok.status).toBe(201);
  });
});

describe('perfil, sinónimos y consentimientos', () => {
  it('los listados se buscan por sinónimo y no se duplican', async () => {
    const search = await call('GET', '/v1/candidate-catalog?catalog=candidate_profile&q=toro', { token: seleccion });
    const forklift = search.body.data.find((i: { name: string }) => i.name === 'Carretillero/a');
    expect(forklift).toMatchObject({ matchedSynonym: 'toro', group: 'Logística' });
    const again = await call('POST', '/v1/candidate-catalog', { token: seleccion, body: { catalog: 'candidate_profile', name: 'Operador de carretilla' } });
    expect(again.status).toBe(200);
    expect(again.body.id).toBe(forklift.id);
    const added = await call('POST', '/v1/candidate-catalog', { token: seleccion, body: { catalog: 'candidate_profile', name: 'Operador/a de grúa ficticia', group: 'Logística' } });
    expect(added.status).toBe(201);
    const [en] = (await call('GET', '/v1/candidate-catalog?catalog=language&q=ingles', { token: seleccion })).body.data;
    const upd = await call('PATCH', `/v1/candidates/${candidateId}`, {
      token: seleccion, body: { mainProfileId: forklift.id, languages: [{ id: en.id, level: 'B1' }], shifts: ['morning', 'night'] },
    });
    expect(upd.status).toBe(200);
    expect(upd.body.attributes.languages).toEqual([expect.objectContaining({ name: 'Inglés', level: 'B1' })]);
    const list = await call('GET', '/v1/candidates?q=toro', { token: seleccion });
    expect(list.body.data.map((c: { id: string }) => c.id)).toContain(candidateId);
  });

  it('consentimiento de la bolsa con la versión del texto, y salud solo con base legal', async () => {
    const pool = await call('POST', '/v1/privacy-notices', { token: admin, body: { purpose: 'talent_pool', version: 'TEST-1', text: 'Texto ficticio de la bolsa' } });
    expect(pool.status).toBe(201);
    expect(pool.body.createdByName).toBeTruthy();
    expect((await call('POST', '/v1/privacy-notices', { token: seleccion, body: { purpose: 'talent_pool', version: 'TEST-2', text: 'x' } })).status).toBe(403);
    const consent = await call('POST', `/v1/candidates/${candidateId}/consents`, { token: seleccion, body: { purpose: 'talent_pool', noticeId: pool.body.id, channel: 'paper' } });
    expect(consent.status).toBe(201);
    expect(consent.body.poolConsent.state).toBe('valid');
    expect(consent.body.consents[0]).toMatchObject({ purpose: 'talent_pool', noticeVersion: 'TEST-1' });
    const noBasis = await call('PATCH', `/v1/candidates/${candidateId}`, {
      token: seleccion, body: { health: { disabilityPercent: 33, legalBasis: 'explicit_consent' } },
    });
    expect(noBasis.status).toBe(422);
    const hn = await call('POST', '/v1/privacy-notices', { token: admin, body: { purpose: 'health_data', version: 'TEST-1', text: 'Texto ficticio de salud' } });
    await call('POST', `/v1/candidates/${candidateId}/consents`, { token: seleccion, body: { purpose: 'health_data', noticeId: hn.body.id, channel: 'paper' } });
    const ok = await call('PATCH', `/v1/candidates/${candidateId}`, {
      token: seleccion, body: { health: { disabilityPercent: 33, adaptations: 'Ficticias', legalBasis: 'explicit_consent' } },
    });
    expect(ok.body.health).toEqual({ hasData: true, legalBasis: 'explicit_consent' });
    const [row] = await adminSql<{ healthEnc: string }[]>`select health_enc as "healthEnc" from public.candidates where id = ${candidateId}`;
    expect(row!.healthEnc).not.toContain('Ficticias');
  });
});

describe('candidaturas y plazas', () => {
  let appId: string;
  it('de la bolsa sin consentimiento no entra; si se inscribe, sí', async () => {
    const sourced = await call('POST', '/v1/applications', { token: seleccion, body: { candidateId: otherId, requestId, origin: 'sourced' } });
    expect(sourced.status).toBe(409);
    const applied = await call('POST', '/v1/applications', { token: seleccion, body: { candidateId: otherId, requestId, origin: 'applied', source: 'candidate_portal' } });
    expect(applied.status).toBe(201);
    expect(applied.body).toMatchObject({ stage: 'registered', legalBasis: 'precontractual' });
    const withConsent = await call('POST', '/v1/applications', { token: seleccion, body: { candidateId, requestId, origin: 'sourced' } });
    expect(withConsent.body).toMatchObject({ legalBasis: 'consent' });
    appId = withConsent.body.id;
    expect((await call('POST', '/v1/applications', { token: seleccion, body: { candidateId, requestId, origin: 'applied' } })).status).toBe(409);
  });

  it('proponer reserva una plaza, confirmar la cubre y liberar la deja por cubrir', async () => {
    const prop = await call('POST', `/v1/applications/${appId}/propose`, { token: seleccion, body: {} });
    expect(prop.status).toBe(200);
    expect(prop.body).toMatchObject({ stage: 'proposed', slotNumber: 1 });
    expect(prop.body.requirements.map((r: { code: string }) => r.code)).toContain('id_document');
    let req = await call('GET', `/v1/requests/${requestId}`, { token: seleccion });
    expect(req.body.slotList[0]).toMatchObject({ status: 'reserved', applicationId: appId, candidateName: 'Persona Ficticia Uno' });
    const conf = await call('POST', `/v1/applications/${appId}/confirm`, { token: seleccion });
    expect(conf.body.stage).toBe('confirmed');
    req = await call('GET', `/v1/requests/${requestId}`, { token: seleccion });
    expect(req.body.slots).toMatchObject({ covered: 1, filled: 1 });
    const fewer = await call('PATCH', `/v1/requests/${requestId}`, { token: admin, body: { positionsCount: 0 } });
    expect(fewer.status).toBe(400);
    const rel = await call('POST', `/v1/applications/${appId}/release`, { token: seleccion });
    expect(rel.body).toMatchObject({ stage: 'interview', slotId: null });
    req = await call('GET', `/v1/requests/${requestId}`, { token: seleccion });
    expect(req.body.slots).toMatchObject({ open: 2, filled: 0 });
    const list = await call('GET', `/v1/applications?requestId=${requestId}`, { token: seleccion });
    expect(list.body.data).toHaveLength(2);
  });
});

describe('aceptación de la candidatura, contactos y filtros', () => {
  it('sin consentimiento de la bolsa, la ETT anota que la persona acepta presentarse', async () => {
    const third = await call('POST', '/v1/candidates', { token: seleccion, body: { firstName: 'Persona', lastName: 'Ficticia Cuatro', experienceYears: 3 } });
    const no = await call('POST', '/v1/applications', { token: seleccion, body: { candidateId: third.body.id, requestId, origin: 'sourced' } });
    expect(no.status).toBe(409);
    const yes = await call('POST', '/v1/applications', {
      token: seleccion, body: { candidateId: third.body.id, requestId, origin: 'sourced', candidateAcceptance: { channel: 'phone' } },
    });
    expect(yes.status).toBe(201);
    expect(yes.body).toMatchObject({ legalBasis: 'precontractual', candidateAcceptedChannel: 'phone' });
    expect(yes.body.candidateAcceptedAt).toBeTruthy();
  });

  it('si retira el consentimiento, no se propone hasta anotar que acepta', async () => {
    const cand = await call('GET', `/v1/candidates/${candidateId}`, { token: seleccion });
    const pool = cand.body.consents.find((x: { purpose: string }) => x.purpose === 'talent_pool');
    await call('POST', `/v1/candidate-consents/${pool.id}/withdraw`, { token: seleccion });
    const [app] = cand.body.applications;
    expect(app.legalBasis).toBe('consent');
    const no = await call('POST', `/v1/applications/${app.id}/propose`, { token: seleccion, body: {} });
    expect(no.status).toBe(409);
    const acc = await call('POST', `/v1/applications/${app.id}/candidate-acceptance`, { token: seleccion, body: { channel: 'email' } });
    expect(acc.body.legalBasis).toBe('precontractual');
    expect((await call('POST', `/v1/applications/${app.id}/candidate-acceptance`, { token: seleccion, body: { channel: 'email' } })).status).toBe(409);
    expect((await call('POST', `/v1/applications/${app.id}/propose`, { token: seleccion, body: {} })).status).toBe(200);
    await call('POST', `/v1/applications/${app.id}/release`, { token: seleccion });
  });

  it('contactos, último contacto y filtros por consentimiento y por documento exacto', async () => {
    const res = await call('POST', `/v1/candidates/${otherId}/contacts`, {
      token: seleccion, body: { channel: 'phone', result: 'Interesada', nextAction: 'Entrevista', requestId },
    });
    expect(res.status).toBe(201);
    expect(res.body.data[0]).toMatchObject({ channel: 'phone', result: 'Interesada', requestId });
    const list = await call('GET', '/v1/candidates?idDocumentNumber=y1234567x', { token: seleccion });
    expect(list.body.data.map((c: { id: string }) => c.id)).toEqual([otherId]);
    expect(list.body.data[0].lastContactAt).toBeTruthy();
    expect(list.body.data[0]).toHaveProperty('experienceYears');
    const expired = await call('GET', '/v1/candidates?poolConsent=expired', { token: seleccion });
    expect(expired.body.data.map((c: { id: string }) => c.id)).toContain(candidateId);
    const facets = await call('GET', '/v1/candidate-facets', { token: seleccion });
    expect(facets.status).toBe(200);
    expect(facets.body.profiles.find((p: { name: string }) => p.name === 'Carretillero/a')?.count).toBeGreaterThanOrEqual(1);
    expect(facets.body.poolConsentExpired).toBeGreaterThanOrEqual(1);
  });
  it('filtros de documentación y RGPD sin descifrar, con los mismos recuentos que el listado', async () => {
    const full = await call('POST', '/v1/candidates', {
      token: seleccion,
      body: { firstName: 'Persona', lastName: 'Ficticia Completa', idDocumentType: 'dni', idDocumentNumber: '87654321X',
        idDocumentExpiresOn: '2031-01-01', ssNumber: '280000000138' },
    });
    const notices = await call('GET', '/v1/privacy-notices?purpose=talent_pool', { token: seleccion });
    const notice = notices.body.data.find((n: { version: string }) => n.version === 'TEST-1');
    await call('POST', `/v1/candidates/${full.body.id}/consents`, { token: seleccion, body: { purpose: 'talent_pool', noticeId: notice.id, channel: 'paper' } });
    const ids = (r: { body: { data: { id: string }[] } }) => r.body.data.map((c) => c.id);
    // Sin el documento escaneado, el DNI sigue pendiente.
    expect(ids(await call('GET', '/v1/candidates?documents=id_or_ss_pending&limit=200', { token: seleccion }))).toContain(full.body.id);
    await adminSql`
      insert into public.documents (tenant_id, entity_type, entity_id, type_id, name, storage_path, mime_type, size_bytes, status)
      select ${T.A}, 'candidate', ${full.body.id}, id, 'DNI ficticio.pdf', ${`${T.A}/candidate/${full.body.id}/dni.pdf`}, 'application/pdf', 100, 'validated'
      from public.catalog_items where tenant_id = ${T.A} and catalog = 'document_type' and code = 'candidate_id_document'
    `;
    const ok = ids(await call('GET', '/v1/candidates?documents=ok&limit=200', { token: seleccion }));
    expect(ok).toContain(full.body.id);
    expect(ok).not.toContain(candidateId);
    const pending = ids(await call('GET', '/v1/candidates?documents=pending&limit=200', { token: seleccion }));
    expect(pending).toEqual(expect.arrayContaining([candidateId, otherId]));
    expect(pending).not.toContain(full.body.id);
    expect(ids(await call('GET', '/v1/candidates?documents=id_or_ss_pending&limit=200', { token: seleccion }))).toContain(otherId);
    const privacy = ids(await call('GET', '/v1/candidates?documents=privacy_pending&limit=200', { token: seleccion }));
    expect(privacy).toContain(candidateId);
    expect(privacy).not.toContain(full.body.id);
    const facets = (await call('GET', '/v1/candidate-facets', { token: seleccion })).body;
    for (const [key, filter] of [['ok', 'ok'], ['pending', 'pending'], ['idOrSsPending', 'id_or_ss_pending'], ['privacyPending', 'privacy_pending']]) {
      const total = (await call('GET', `/v1/candidates?documents=${filter}&limit=1`, { token: seleccion })).body.pagination.total;
      expect(facets.documentation[key!]).toBe(total);
    }
  });
});

describe('derechos RGPD y aislamiento', () => {
  it('exportar trae todo descifrado y queda auditado', async () => {
    expect((await call('GET', `/v1/candidates/${candidateId}/export`, { token: seleccion })).status).toBe(403);
    const exp = await call('GET', `/v1/candidates/${candidateId}/export`, { token: admin });
    expect(exp.status).toBe(200);
    expect(exp.body.candidate).toMatchObject({ iban: 'ES8200000000000000000000', health: { disabilityPercent: 33 } });
    expect(exp.body.candidate.idDocument.number).toBe('12345678Z');
    expect(exp.body.consents[0].text).toBe('Texto ficticio de la bolsa');
  });

  it('anonimizar borra los datos personales y el historial de valores; el documento queda libre', async () => {
    expect((await call('POST', `/v1/candidates/${candidateId}/anonymize`, { token: seleccion, body: { reason: 'Derecho de supresión' } })).status).toBe(403);
    const res = await call('POST', `/v1/candidates/${candidateId}/anonymize`, { token: admin, body: { reason: 'Derecho de supresión' } });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ firstName: 'Persona anonimizada', lastName: null, phone: null, email: null, anonymized: true });
    expect(res.body.idDocument.state).toBe('missing');
    expect(res.body.applications[0].stage).toBe('withdrawn');
    const [row] = await adminSql<{ enc: string | null; iban: string | null; health: string | null }[]>`
      select id_document_number_enc as enc, iban_enc as iban, health_enc as health from public.candidates where id = ${candidateId}
    `;
    expect(row).toEqual({ enc: null, iban: null, health: null });
    const logs = await adminSql<{ changes: unknown }[]>`
      select changes from public.activity_log where entity_type = 'candidate' and entity_id = ${candidateId} and action = 'update'
    `;
    expect(logs.every((l) => JSON.stringify(l.changes) === '{}')).toBe(true);
    expect((await call('PATCH', `/v1/candidates/${candidateId}`, { token: seleccion, body: { phone: '600' } })).status).toBe(409);
    const again = await call('POST', '/v1/candidates', { token: seleccion, body: { firstName: 'Vuelve', idDocumentType: 'dni', idDocumentNumber: '12345678Z' } });
    expect(again.status).toBe(201);
    const audit = await call('GET', `/v1/access-log?candidateId=${candidateId}&action=anonymize`, { token: admin });
    expect(audit.body.data[0].details).toEqual({ reason: 'Derecho de supresión' });
  });

  it('otra ETT no ve a nadie y los permisos salen en /me', async () => {
    expect((await call('GET', `/v1/candidates/${otherId}`, { token: adminB })).status).toBe(404);
    const me = await call('GET', '/v1/me', { token: admin });
    expect(me.body.permissions).toEqual(expect.arrayContaining(['candidates.manage', 'personal_data.view', 'privacy.manage', 'privacy.audit']));
  });
});
