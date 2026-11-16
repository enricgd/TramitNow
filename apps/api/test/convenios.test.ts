// Catálogo global de convenios: cargador (db/scripts/cargar-convenios.sh con db/tests/convenios/ejemplo.json),
// lectura de las ETT (solo lo publicado) y flujo del equipo de contenidos (revisar a cuatro ojos, publicar, retirar).

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { T, USER, adminSql, call, closeAll, tokenFor } from './helpers.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const REGCON = '99999999999901';

function load(): string {
  return execFileSync('sh', ['db/scripts/cargar-convenios.sh', 'db/tests/convenios/ejemplo.json'], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      PSQL: 'docker exec -i tramitnow-db-local psql -U postgres -d postgres',
      EXTRAIDO_POR: 'contenidos.1@example.test',
    },
  });
}

async function purge() {
  await adminSql.begin(async (tx) => {
    await tx`set local tramitnow.purge_agreements = 'on'`;
    await tx`delete from public.agreements where regcon = ${REGCON}`;
  });
}

let admin: string;
let content1: string;
let content2: string;
let agreementId: string;
let version2025: string;
let version2026: string;

beforeAll(async () => {
  await purge();
  admin = await tokenFor(USER.adminA);
  content1 = await tokenFor(USER.content1);
  content2 = await tokenFor(USER.content2);
});
afterAll(async () => {
  await adminSql`delete from public.collective_agreements where tenant_id = ${T.A} and code = 'TEST-GLOB'`;
  await purge();
  await closeAll();
});

describe('cargador', () => {
  it('carga el fichero de ejemplo en revisión y volver a cargarlo no cambia nada', () => {
    const first = load();
    expect(first).toContain('versión desde 2025-01-01 nueva, en revisión');
    expect(first).toContain('versión desde 2026-01-01 nueva, en revisión');
    const second = load();
    expect(second).toContain('sin cambios (en_revision)');
    expect(second).not.toContain('nueva');
  });
});

describe('equipo de contenidos', () => {
  it('ve lo que está en revisión y /me lo identifica, sin ETT', async () => {
    const me = await call('GET', '/v1/me', { token: content1 });
    expect(me.body.isContentEditor).toBe(true);
    expect(me.body.activeTenant).toBeNull();
    expect((await call('GET', '/v1/me', { token: admin })).body.isContentEditor).toBe(false);
    expect((await call('GET', '/v1/companies', { token: content1 })).status).toBe(403);

    const list = await call('GET', `/v1/agreements?q=${REGCON}`, { token: content1 });
    expect(list.body.pagination.total).toBe(1);
    agreementId = list.body.data[0].id;
    expect(list.body.data[0]).toMatchObject({ scope: 'provincial', provinceCode: '48', cnaeCodes: ['52', '4941'], pendingVersions: 2, currentVersion: null });

    const queue = await call('GET', `/v1/agreement-versions?status=en_revision&agreementId=${agreementId}`, { token: content1 });
    expect(queue.body.pagination.total).toBe(2);
    expect(queue.body.data[0].extractedBy).toBe(USER.content1);
    expect(queue.body.data[0].pendingReview).toHaveLength(1);
    version2026 = queue.body.data.find((v: any) => v.effectiveFrom === '2026-01-01').id;
    version2025 = queue.body.data.find((v: any) => v.effectiveFrom === '2025-01-01').id;
  });

  it('las ETT no ven nada hasta que se publica', async () => {
    expect((await call('GET', `/v1/agreements?q=${REGCON}`, { token: admin })).body.pagination.total).toBe(0);
    expect((await call('GET', `/v1/agreement-versions/${version2025}`, { token: admin })).status).toBe(404);
  });

  it('revisión a cuatro ojos y publicación', async () => {
    expect((await call('POST', `/v1/agreement-versions/${version2025}/review`, { token: admin, body: {} })).status).toBe(403);
    const own = await call('POST', `/v1/agreement-versions/${version2025}/review`, { token: content1, body: {} });
    expect(own.status).toBe(409);
    expect(own.body.error.code).toBe('conflicto');
    expect((await call('POST', `/v1/agreement-versions/${version2025}/publish`, { token: content2 })).status).toBe(409);

    const reviewed = await call('POST', `/v1/agreement-versions/${version2025}/review`, { token: content2, body: { notes: 'Cuadra con el boletín' } });
    expect(reviewed.status).toBe(200);
    expect(reviewed.body).toMatchObject({ reviewedBy: USER.content2, reviewNotes: 'Cuadra con el boletín', status: 'en_revision' });

    const published = await call('POST', `/v1/agreement-versions/${version2025}/publish`, { token: content1 });
    expect(published.status).toBe(200);
    expect(published.body.status).toBe('publicada');
    expect(published.body.publishedBy).toBe(USER.content1);
    expect(published.body.publishedAt).toBeTruthy();

    const rejected = await call('POST', `/v1/agreement-versions/${version2026}/reject`, { token: content2, body: { notes: 'Falta la tabla II' } });
    expect(rejected.body).toMatchObject({ status: 'borrador', reviewNotes: 'Falta la tabla II' });
    expect((await call('POST', `/v1/agreement-versions/${version2026}/submit`, { token: content2 })).body.status).toBe('en_revision');
  });

  it('lo publicado no cambia al volver a cargar', () => {
    expect(load()).toContain('sin cambios (publicada)');
  });
});

describe('lectura de las ETT', () => {
  it('lista y filtra por sector CNAE', async () => {
    const list = await call('GET', `/v1/agreements?q=${REGCON}`, { token: admin });
    expect(list.body.pagination.total).toBe(1);
    expect(list.body.data[0].currentVersion).toMatchObject({ id: version2025, status: 'publicada', effectiveFrom: '2025-01-01' });
    expect(list.body.data[0].pendingVersions).toBe(0);
    for (const cnae of ['H', '52', '5221', '4941', '49']) {
      const found = await call('GET', `/v1/agreements?q=${REGCON}&cnae=${cnae}`, { token: admin });
      expect(found.body.pagination.total, `cnae=${cnae}`).toBe(1);
    }
    expect((await call('GET', `/v1/agreements?q=${REGCON}&cnae=10`, { token: admin })).body.pagination.total).toBe(0);
    expect((await call('GET', `/v1/agreements?q=${REGCON}&provinceCode=28`, { token: admin })).body.pagination.total).toBe(0);
  });

  it('detalle con publicaciones y versiones publicadas', async () => {
    const detail = await call('GET', `/v1/agreements/${agreementId}`, { token: admin });
    expect(detail.status).toBe(200);
    expect(detail.body.versions).toHaveLength(1);
    expect(detail.body.publications).toHaveLength(1);
    expect(detail.body.publications[0]).toMatchObject({ bulletin: 'BOB', date: '2025-03-10', type: 'texto_inicial' });
  });

  it('versión con categorías, importes y condiciones', async () => {
    const version = await call('GET', `/v1/agreement-versions/${version2025}`, { token: admin });
    expect(version.status).toBe(200);
    expect(version.body.categories.map((c: any) => c.code)).toEqual(['G1-N1', 'G2-N1']);
    expect(version.body.salaryItems).toHaveLength(4);
    expect(version.body.salaryItems[0]).toMatchObject({ categoryCode: 'G1-N1', concept: 'salario_base', amount: 1500, unit: 'mes', salarial: true });
    expect(version.body.salaryItems[2]).toMatchObject({ categoryId: null, concept: 'plus_transporte', amount: 3.25, salarial: false });
    expect(version.body.conditions).toMatchObject({ annualHours: 1752, vacationDays: 30, vacationDaysType: 'naturales', extraPayments: 2, extra: { seniority: 'trienios del 3 %' } });
    expect(version.body.publication.number).toBe('BOB-PRUEBA-2025-0001');
    expect((await call('GET', `/v1/agreement-versions/${version2026}`, { token: admin })).status).toBe(404);
  });

  it('el convenio de la ETT se enlaza con el del catálogo', async () => {
    const created = await call('POST', '/v1/collective-agreements', {
      token: admin,
      body: { code: 'TEST-GLOB', name: 'Logística de Bizkaia (catálogo)', globalAgreementId: agreementId },
    });
    expect(created.status).toBe(201);
    expect(created.body.globalAgreementId).toBe(agreementId);
    const filtered = await call('GET', `/v1/collective-agreements?globalAgreementId=${agreementId}`, { token: admin });
    expect(filtered.body.pagination.total).toBe(1);
  });
});

describe('retirar', () => {
  it('exige el motivo y las ETT la siguen viendo como retirada', async () => {
    expect((await call('POST', `/v1/agreement-versions/${version2025}/withdraw`, { token: content2, body: {} })).status).toBe(400);
    const withdrawn = await call('POST', `/v1/agreement-versions/${version2025}/withdraw`, {
      token: content2,
      body: { reason: 'Error en la tabla (ficticio)' },
    });
    expect(withdrawn.status).toBe(200);
    expect(withdrawn.body).toMatchObject({ status: 'retirada', withdrawalReason: 'Error en la tabla (ficticio)' });
    expect((await call('GET', `/v1/agreement-versions/${version2025}`, { token: admin })).body.status).toBe('retirada');
    expect((await call('POST', `/v1/agreement-versions/${version2025}/publish`, { token: content2 })).status).toBe(409);
  });
});
