// Documentos (/v1/documents) contra el Storage local de db/local: URL firmada de subida, subida directa a Storage,
// registro, lista, validación, descarga y borrado (fila y fichero), con permisos de la ficha y conservación.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BRANCH, COMPANY, T, USER, adminSql, call, closeAll, tokenFor } from './helpers.js';

const PDF = new TextEncoder().encode('%PDF-1.4\n% documento ficticio de prueba\n');

let admin: string;
let adminB: string;
let seleccion: string;
let clientId: string;
let otherBranchClientId: string;
let cifType: string;
let contractType: string;

const setRole = (code: string) => adminSql`
  update public.memberships set role_id = (select id from public.roles where tenant_id = ${T.A} and code = ${code})
  where tenant_id = ${T.A} and user_id = ${USER.selA}
`;

/** Los tres pasos: pedir URL, subir a Storage y registrar. */
async function upload(token: string, body: Record<string, unknown> = {}, entity = { entityType: 'client', entityId: clientId }) {
  const signed = await call('POST', '/v1/documents/uploads', {
    token,
    body: { ...entity, fileName: 'cif.pdf', mimeType: 'application/pdf', sizeBytes: PDF.length },
  });
  expect(signed.status).toBe(201);
  const put = await fetch(signed.body.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: PDF });
  expect(put.status).toBe(200);
  return call('POST', '/v1/documents', {
    token,
    body: { ...entity, storagePath: signed.body.storagePath, typeId: cifType, name: 'CIF', ...body },
  });
}

beforeAll(async () => {
  admin = await tokenFor(USER.adminA);
  adminB = await tokenFor(USER.adminB);
  seleccion = await tokenFor(USER.selA);
  const mk = async (code: string, branchId: string) =>
    (await call('POST', '/v1/clients', { token: admin, body: { companyId: COMPANY.A1, branchId, code, legalName: `Cliente ${code}` } })).body.id;
  clientId = await mk('TEST-DOC-1', BRANCH.A1);
  otherBranchClientId = await mk('TEST-DOC-2', BRANCH.A2);
  cifType = (await call('POST', '/v1/catalog-items', { token: admin, body: { type: 'document_type', name: 'CIF' } })).body.id;
  contractType = (
    await call('POST', '/v1/catalog-items', { token: admin, body: { type: 'document_type', name: 'Contrato', retentionRequired: true } })
  ).body.id;
});
afterAll(async () => {
  await setRole('seleccion');
  // Los de conservación obligatoria no se borran: primero se quita la marca al tipo (solo en esta limpieza).
  await adminSql`update public.catalog_items set retention_required = false where tenant_id = ${T.A} and catalog = 'document_type'`;
  const paths = await adminSql<{ path: string }[]>`delete from public.documents where tenant_id = ${T.A} returning storage_path as path`;
  await Promise.all(
    paths.map(({ path }) =>
      fetch(`${process.env.STORAGE_URL}/object/documents`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prefixes: [path] }),
      }),
    ),
  );
  await adminSql`delete from public.catalog_items where tenant_id = ${T.A} and catalog = 'document_type'`;
  await adminSql`delete from public.clients where tenant_id = ${T.A} and code like 'TEST-DOC-%'`;
  await closeAll();
});

describe('documentos', () => {
  let docId: string;

  it('sube un documento en tres pasos; tamaño y tipo salen de Storage', async () => {
    const res = await upload(admin, { expiresOn: '2027-01-31', visibleInPortal: true, notes: 'Nota' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      entityType: 'client', entityId: clientId, typeId: cifType, typeName: 'CIF', retentionRequired: false, name: 'CIF',
      mimeType: 'application/pdf', sizeBytes: PDF.length, status: 'pending', expiresOn: '2027-01-31', visibleInPortal: true,
      uploadedBy: USER.adminA, uploadedByName: 'Admin A', validatedBy: null,
    });
    docId = res.body.id;
  });

  it('rechaza ficheros no admitidos, rutas de otra ficha y ficheros que no se han subido', async () => {
    const big = await call('POST', '/v1/documents/uploads', {
      token: admin,
      body: { entityType: 'client', entityId: clientId, fileName: 'x.pdf', mimeType: 'application/pdf', sizeBytes: 11 * 1024 * 1024 },
    });
    expect(big.status).toBe(400);
    const exe = await call('POST', '/v1/documents/uploads', {
      token: admin,
      body: { entityType: 'client', entityId: clientId, fileName: 'x.exe', mimeType: 'application/x-msdownload', sizeBytes: 10 },
    });
    expect(exe.status).toBe(400);

    const signed = await call('POST', '/v1/documents/uploads', {
      token: admin,
      body: { entityType: 'client', entityId: clientId, fileName: 'x.pdf', mimeType: 'application/pdf', sizeBytes: 10 },
    });
    const notUploaded = await call('POST', '/v1/documents', {
      token: admin,
      body: { entityType: 'client', entityId: clientId, storagePath: signed.body.storagePath, typeId: cifType, name: 'X' },
    });
    expect(notUploaded.status).toBe(422);
    const wrongEntity = await call('POST', '/v1/documents', {
      token: admin,
      body: { entityType: 'client', entityId: otherBranchClientId, storagePath: signed.body.storagePath, typeId: cifType, name: 'X' },
    });
    expect(wrongEntity.status).toBe(400);
    const missingEntity = await call('POST', '/v1/documents/uploads', {
      token: admin,
      body: { entityType: 'client', entityId: COMPANY.A1, fileName: 'x.pdf', mimeType: 'application/pdf', sizeBytes: 10 },
    });
    expect(missingEntity.status).toBe(404);
  });

  it('lista por ficha y con filtros; otra ETT no lo ve', async () => {
    const list = await call('GET', `/v1/documents?entityType=client&entityId=${clientId}`, { token: seleccion });
    expect(list.status).toBe(200);
    expect(list.body.pagination.total).toBe(1);
    const expiring = await call('GET', '/v1/documents?expiresBefore=2027-02-01&visibleInPortal=true', { token: admin });
    expect(expiring.body.data.map((d: { id: string }) => d.id)).toEqual([docId]);
    expect((await call('GET', '/v1/documents?expiresBefore=2026-12-31', { token: admin })).body.pagination.total).toBe(0);
    expect((await call('GET', `/v1/documents/${docId}`, { token: adminB })).status).toBe(404);
    expect((await call('GET', '/v1/documents', { token: adminB })).body.pagination.total).toBe(0);
    expect((await call('GET', `/v1/documents/${docId}/download`, { token: adminB })).status).toBe(404);
  });

  it('valida: quién y cuándo lo pone la base de datos', async () => {
    const res = await call('PATCH', `/v1/documents/${docId}`, { token: admin, body: { status: 'validated', name: 'CIF de la empresa' } });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'validated', validatedBy: USER.adminA, validatedByName: 'Admin A', name: 'CIF de la empresa' });
    expect(res.body.validatedAt).toBeTruthy();
    const noFields = await call('PATCH', `/v1/documents/${docId}`, { token: admin, body: {} });
    expect(noFields.status).toBe(400);
    const fileChange = await call('PATCH', `/v1/documents/${docId}`, { token: admin, body: { storagePath: 'otro' } });
    expect(fileChange.status).toBe(400);
  });

  it('descarga con una URL firmada que sirve el fichero con su nombre', async () => {
    const res = await call('GET', `/v1/documents/${docId}/download`, { token: seleccion });
    expect(res.status).toBe(200);
    const file = await fetch(res.body.url);
    expect(file.status).toBe(200);
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(PDF);
    expect(file.headers.get('content-disposition')).toContain('CIF%20de%20la%20empresa.pdf');
  });

  it('permisos de la ficha: selección no sube; comercial sube en su sucursal y no en otra', async () => {
    const sel = await call('POST', '/v1/documents/uploads', {
      token: seleccion,
      body: { entityType: 'client', entityId: clientId, fileName: 'x.pdf', mimeType: 'application/pdf', sizeBytes: 10 },
    });
    expect(sel.status).toBe(403);
    expect((await call('PATCH', `/v1/documents/${docId}`, { token: seleccion, body: { name: 'No' } })).status).toBe(403);
    expect((await call('DELETE', `/v1/documents/${docId}`, { token: seleccion })).status).toBe(403);

    await setRole('comercial');
    const own = await upload(seleccion, { name: 'Del comercial' });
    expect(own.status).toBe(201);
    const other = await call('POST', '/v1/documents/uploads', {
      token: seleccion,
      body: { entityType: 'client', entityId: otherBranchClientId, fileName: 'x.pdf', mimeType: 'application/pdf', sizeBytes: 10 },
    });
    expect(other.status).toBe(403);
    await setRole('seleccion');
  });

  it('borrar elimina la fila y el fichero, y deja rastro en el historial', async () => {
    const [{ path }] = await adminSql<{ path: string }[]>`select storage_path as path from public.documents where id = ${docId}`;
    const res = await call('DELETE', `/v1/documents/${docId}`, { token: admin });
    expect(res.status).toBe(204);
    expect((await call('GET', `/v1/documents/${docId}`, { token: admin })).status).toBe(404);
    const objects = await adminSql`select 1 from storage.objects where bucket_id = 'documents' and name = ${path}`;
    expect(objects).toHaveLength(0);

    const history = await call('GET', `/v1/activity?entityType=client&entityId=${clientId}`, { token: admin });
    const summaries = history.body.data.map((a: { summary: string }) => a.summary);
    expect(summaries).toEqual(
      expect.arrayContaining(['Eliminación de documento «CIF de la empresa»', 'Validación de documento «CIF de la empresa»']),
    );
  });

  it('un documento de conservación obligatoria no se borra', async () => {
    const contract = await upload(admin, { typeId: contractType, name: 'Contrato' });
    expect(contract.body.retentionRequired).toBe(true);
    const res = await call('DELETE', `/v1/documents/${contract.body.id}`, { token: admin });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain('conservación obligatoria');
    const toDeletable = await call('PATCH', `/v1/documents/${contract.body.id}`, { token: admin, body: { typeId: cifType } });
    expect(toDeletable.status).toBe(409);
    expect((await call('GET', `/v1/documents/${contract.body.id}`, { token: admin })).status).toBe(200);
  });
});
