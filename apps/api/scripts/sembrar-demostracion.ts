// Rellena la ETT de demostración (código DEMOSTRACION, db/seeds/ett-demostracion.sql) a través de la API por HTTP,
// para que los cálculos, los snapshots, las series y el cifrado de datos personales sean los de verdad.
//
//   API_URL=https://api.<dominio> AUTH_URL=https://api.<dominio>/auth/v1 ANON_KEY=<anon> \
//     npx tsx scripts/sembrar-demostracion.ts tu@correo.com
//
// La contraseña se pide por el terminal (no se ve al escribirla). En local se puede pasar en DEMOSTRACION_PASSWORD.
// Entra con el usuario, cambia la ETT activa a DEMOSTRACION, lo crea todo y al acabar vuelve a dejar la ETT activa que
// tenía. Si la ETT ya tiene clientes, no hace nada. Todo es ficticio: nombres de la web de ejemplo, DNI 0000xxxx y NIE
// X00xxxxx con su letra, números de la Seguridad Social inventados con su control y dominios .example.
//
// Ver infra/nas/README.md, «ETT de demostración».

import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { validDni, validNie, validSsNumber } from '../src/lib/personal-data.js';

// ---------------------------------------------------------------------------
// Parámetros, login y llamadas
// ---------------------------------------------------------------------------
const API_URL = (process.env.API_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const AUTH_URL = (process.env.AUTH_URL ?? 'http://127.0.0.1:9999').replace(/\/$/, '');
const ANON_KEY = process.env.ANON_KEY ?? '';
const EMAIL = process.argv[2] ?? process.env.DEMOSTRACION_EMAIL ?? '';
const TENANT_CODE = 'DEMOSTRACION';

if (!EMAIL || !ANON_KEY) {
  console.error('Uso: API_URL=… AUTH_URL=… ANON_KEY=… npx tsx scripts/sembrar-demostracion.ts tu@correo.com');
  process.exit(1);
}

async function askPassword(): Promise<string> {
  if (process.env.DEMOSTRACION_PASSWORD) return process.env.DEMOSTRACION_PASSWORD;
  let muted = false;
  const out = new Writable({ write(chunk, _enc, cb) { if (!muted) process.stdout.write(chunk); cb(); } });
  const rl = createInterface({ input: process.stdin, output: out, terminal: true });
  const answer = await new Promise<string>((resolve) => {
    rl.question(`Contraseña de ${EMAIL}: `, (a) => resolve(a));
    muted = true;
  });
  rl.close();
  process.stdout.write('\n');
  return answer;
}

let session: { access_token: string; refresh_token: string };

async function auth(grant: 'password' | 'refresh_token', body: Record<string, string>) {
  const res = await fetch(`${AUTH_URL}/token?grant_type=${grant}`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase Auth respondió ${res.status}: ${await res.text()}`);
  session = (await res.json()) as typeof session;
}

class ApiFailure extends Error {
  constructor(public status: number, public body: unknown, where: string) {
    super(`${where} → ${status} ${JSON.stringify(body)}`);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
async function api(method: string, path: string, body?: unknown): Promise<Json> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${session.access_token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiFailure(res.status, json, `${method} ${path}`);
  return json;
}
const get = (path: string) => api('GET', path);
const post = (path: string, body?: unknown) => api('POST', path, body);
const patch = (path: string, body: unknown) => api('PATCH', path, body);
const put = (path: string, body: unknown) => api('PUT', path, body);

// ---------------------------------------------------------------------------
// Fechas relativas a hoy: la demo parece al día cuando se cargue
// ---------------------------------------------------------------------------
const TODAY = new Date();
const day = (offset: number) => {
  const d = new Date(Date.UTC(TODAY.getUTCFullYear(), TODAY.getUTCMonth(), TODAY.getUTCDate() + offset));
  return d.toISOString().slice(0, 10);
};
const monthsAgo = (n: number) => {
  const d = new Date(TODAY);
  d.setUTCMonth(d.getUTCMonth() - n);
  return d.toISOString();
};

// ---------------------------------------------------------------------------
// Identificadores ficticios con su control
// ---------------------------------------------------------------------------
const LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
const dni = (n: number) => `${String(n).padStart(8, '0')}${LETTERS[n % 23]}`;
const nie = (n: number) => `X${String(n).padStart(7, '0')}${LETTERS[n % 23]}`;
const nss = (province: string, n: number) => {
  const base = `${province}${String(n).padStart(8, '0')}`;
  return `${base}${String(Number(BigInt(base) % 97n)).padStart(2, '0')}`;
};

// ---------------------------------------------------------------------------
// Un PDF ficticio para todos los documentos
// ---------------------------------------------------------------------------
let pdfBytes: Uint8Array;
async function fakePdf() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText('Documento ficticio para la demostracion de TramitNOW.', { x: 50, y: 780, size: 14, font });
  page.drawText('No contiene datos personales reales.', { x: 50, y: 755, size: 11, font });
  pdfBytes = await doc.save();
}

async function uploadDocument(entityType: string, entityId: string, typeId: string, name: string,
  extra: { status?: 'pending' | 'draft'; expiresOn?: string | null; validate?: boolean; reject?: string; notes?: string } = {}) {
  const up = await post('/v1/documents/uploads', { entityType, entityId, fileName: name, mimeType: 'application/pdf', sizeBytes: pdfBytes.length });
  const res = await fetch(up.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: pdfBytes });
  if (!res.ok) throw new Error(`Subida a Storage (${up.uploadUrl.split('?')[0]}) → ${res.status}: ${await res.text()}`);
  const doc = await post('/v1/documents', {
    entityType, entityId, storagePath: up.storagePath, typeId, name, status: extra.status ?? 'pending',
    expiresOn: extra.expiresOn ?? null, notes: extra.notes ?? null,
  });
  if (extra.validate) await patch(`/v1/documents/${doc.id}`, { status: 'validated' });
  if (extra.reject) await post(`/v1/documents/${doc.id}/reject`, { reason: extra.reject });
  return doc;
}

// ---------------------------------------------------------------------------
// Datos
// ---------------------------------------------------------------------------
interface Ctx {
  companyId: string;
  branch: Record<'BIZKAIA' | 'MADRID' | 'BARCELONA', string>;
  userId: string;
  docType: Record<string, string>;
  agreement: Record<string, string>;
}

const SCHEDULE = (start: string, end: string, days = [1, 2, 3, 4, 5], breakMinutes = 30) =>
  [1, 2, 3, 4, 5, 6, 7].map((weekday) => (days.includes(weekday) ? { weekday, working: true, start, end, breakMinutes } : { weekday, working: false }));

async function catalogs(ctx: Ctx) {
  // Tipos de documento de clientes (la ETT los crea en Tablas maestras; los de presupuestos, peticiones y candidatos
  // ya vienen de serie).
  for (const name of ['CIF', 'Contrato marco', 'Certificado de la Seguridad Social', 'Mandato SEPA']) {
    await post('/v1/catalog-items', { type: 'document_type', name });
  }
  const types = await get('/v1/catalog-items?type=document_type&limit=200');
  for (const t of types.data) ctx.docType[t.code ?? t.name] = t.id;
  await patch('/v1/tenant-settings', { quoteMinMarginPercent: 12, quoteNoResponseDays: 7 });

  const agreements = [
    ['LOG-BI', 'Almacenes y logística de Bizkaia (ejemplo)', 'provincial', '48'],
    ['HOST-CAT', 'Hostelería de Cataluña (ejemplo)', 'regional', null],
    ['METAL-M', 'Industria del metal de Madrid (ejemplo)', 'provincial', '28'],
    ['AGRO-MU', 'Manipulado y envasado de frutas y hortalizas (ejemplo)', 'provincial', '30'],
    ['COM-BI', 'Comercio de alimentación de Bizkaia (ejemplo)', 'provincial', '48'],
    ['ETT-EST', 'Personal de estructura de empresas de trabajo temporal (ejemplo)', 'state', null],
  ] as const;
  for (const [code, name, scope, provinceCode] of agreements) {
    const a = await post('/v1/collective-agreements', {
      code, name, scope, provinceCode, autonomousCommunityCode: code === 'HOST-CAT' ? '09' : null, validFrom: `${TODAY.getUTCFullYear()}-01-01`,
      notes: 'Convenio de ejemplo de la ETT, sin enlazar al catálogo global: los salarios del presupuesto se escriben a mano.',
    });
    ctx.agreement[code] = a.id;
  }
  // Convenio del personal de estructura (Mi ETT → Datos legales): solo cambia lo que se envía.
  await put(`/v1/companies/${ctx.companyId}/legal`, { staffAgreementId: ctx.agreement['ETT-EST'] });
  const payment: Record<string, string> = {};
  for (const name of ['Transferencia a 30 días', 'Transferencia a 60 días', 'Recibo SEPA a 30 días', 'Confirming a 90 días']) {
    payment[name] = (await post('/v1/catalog-items', { type: 'payment_method', name })).id;
  }
  return payment;
}

interface ClientDef {
  code: string; legalName: string; tradeName: string; taxId: string; branch: keyof Ctx['branch']; sector: string; agreement: string | null;
  status?: 'prospect' | 'active'; email: string; phone: string; activity: string;
  address: { street: string; postalCode: string; city: string; municipalityCode: string | null; provinceCode: string };
  centers: { code: string; name: string; street: string; postalCode: string; city: string; municipalityCode: string | null; provinceCode: string; access?: string }[];
  contacts: { name: string; position: string; email: string; phone: string; roles: string[]; main?: boolean; quotes?: boolean; signs?: number; validatesHours?: boolean; notes?: string }[];
  billing?: { method: string; days: number; layout: 'by_person' | 'by_concept'; risk?: number };
  observations?: string;
}

const CLIENTS: ClientDef[] = [
  {
    code: 'CLI-001', legalName: 'Trans-Logística Ibérica Norte, S.L.', tradeName: 'TransLog Norte', taxId: 'B00000101', branch: 'BIZKAIA',
    sector: '52', agreement: 'LOG-BI', email: 'contacto@translog-norte.example', phone: '+34 944 000 101',
    activity: 'Operador logístico: almacenaje, preparación de pedidos y distribución regional',
    address: { street: 'Polígono Industrial Artunduaga, Pabellón 14', postalCode: '48970', city: 'Basauri', municipalityCode: '48015', provinceCode: '48' },
    centers: [
      { code: 'CT-01', name: 'HUB central Basauri - Nave 2', street: 'Polígono Industrial Artunduaga, Nave 2', postalCode: '48970', city: 'Basauri', municipalityCode: '48015', provinceCode: '48', access: 'Entrada por el muelle 4; presentarse en la garita con el DNI' },
      { code: 'CT-02', name: 'Plataforma Bilbao Zorrotzaurre', street: 'Muelle de Ejemplo 3', postalCode: '48014', city: 'Bilbao', municipalityCode: '48020', provinceCode: '48' },
    ],
    contacts: [
      { name: 'Marta Gómez Arana', position: 'Responsable de RR. HH. y Selección', email: 'marta.gomez@translog-norte.example', phone: '+34 600 000 120', roles: ['hr', 'requester'], main: true, quotes: true, signs: 120, notes: 'Firma presupuestos y CPD.' },
      { name: 'Javier Ugarte Elorza', position: 'Jefe de Planta / Operaciones', email: 'j.ugarte@translog-norte.example', phone: '+34 600 000 121', roles: ['operations', 'prevention'], validatesHours: true, notes: 'Entrega los EPI a los carretilleros.' },
    ],
    billing: { method: 'Transferencia a 60 días', days: 60, layout: 'by_concept', risk: 30000 },
  },
  {
    code: 'CLI-002', legalName: 'Manufacturas Metálicas del Henares, S.A.', tradeName: 'MetalHenares', taxId: 'A00000102', branch: 'MADRID',
    sector: '25', agreement: 'METAL-M', email: 'info@metalhenares.example', phone: '+34 918 000 102',
    activity: 'Calderería, soldadura y mecanizado de piezas metálicas',
    address: { street: 'C/ del Torno 8', postalCode: '28806', city: 'Alcalá de Henares', municipalityCode: '28005', provinceCode: '28' },
    centers: [
      { code: 'CT-01', name: 'Planta Principal Alcalá', street: 'C/ del Torno 8', postalCode: '28806', city: 'Alcalá de Henares', municipalityCode: '28005', provinceCode: '28' },
    ],
    contacts: [
      { name: 'Alfonso Serrano Gil', position: 'Director financiero', email: 'aserrano@metalhenares.example', phone: '+34 600 000 122', roles: ['billing', 'management'], main: true, quotes: true },
      { name: 'Rosa Llorente Vidal', position: 'Responsable de personas', email: 'rllorente@metalhenares.example', phone: '+34 600 000 125', roles: ['hr'], signs: 125 },
    ],
    billing: { method: 'Confirming a 90 días', days: 60, layout: 'by_concept', risk: 50000 },
  },
  {
    code: 'CLI-003', legalName: 'Mediterránea Agrícola y Envasado, S.L.', tradeName: 'AgroMediterráneo', taxId: 'B00000103', branch: 'BARCELONA',
    sector: '10', agreement: 'AGRO-MU', email: 'info@agromediterranea.example', phone: '+34 968 000 103',
    activity: 'Envasado y expedición de cítricos y hortalizas',
    address: { street: 'Carretera del Palmar km 3', postalCode: '30120', city: 'Murcia', municipalityCode: '30030', provinceCode: '30' },
    centers: [
      { code: 'CT-01', name: 'Almacén de envasado El Palmar', street: 'Carretera del Palmar km 3', postalCode: '30120', city: 'Murcia', municipalityCode: '30030', provinceCode: '30' },
    ],
    contacts: [
      { name: 'Pedro Martínez Lorca', position: 'Jefe de almacén', email: 'pmartinez@agromediterranea.example', phone: '+34 600 000 126', roles: ['operations', 'requester'], main: true, quotes: true, signs: 126 },
    ],
    billing: { method: 'Recibo SEPA a 30 días', days: 30, layout: 'by_person' },
  },
  {
    code: 'CLI-004', legalName: 'Hostelería & Eventos Premium BCN, S.L.', tradeName: 'Premium Events BCN', taxId: 'B00000104', branch: 'BARCELONA',
    sector: '56', agreement: 'HOST-CAT', email: 'rrhh@premiumeventsbcn.example', phone: '+34 932 000 104',
    activity: 'Catering y servicio de sala para congresos, hoteles y eventos',
    address: { street: 'Passeig de Gràcia 112, 4º', postalCode: '08008', city: 'Barcelona', municipalityCode: '08019', provinceCode: '08' },
    observations: 'Requieren camareros con idiomas y protocolo para hoteles de cinco estrellas.',
    centers: [
      { code: 'CT-01', name: 'Palau de Congressos BCN', street: 'Av. Diagonal 661', postalCode: '08028', city: 'Barcelona', municipalityCode: '08019', provinceCode: '08', access: 'Acceso por la puerta de proveedores' },
      { code: 'CT-02', name: 'Hotel Ejemplo Diagonal', street: 'Av. Diagonal 300', postalCode: '08013', city: 'Barcelona', municipalityCode: '08019', provinceCode: '08' },
    ],
    contacts: [
      { name: 'Sergi Pujol Roca', position: 'Coordinador de eventos', email: 'spujol@premiumeventsbcn.example', phone: '+34 600 000 123', roles: ['commercial', 'operations'], main: true, quotes: true, signs: 123 },
      { name: 'Montse Ferrer Puig', position: 'Jefa de sala', email: 'mferrer@premiumeventsbcn.example', phone: '+34 600 000 124', roles: ['operations'], validatesHours: true },
    ],
    billing: { method: 'Transferencia a 30 días', days: 30, layout: 'by_person' },
  },
  {
    code: 'CLI-005', legalName: 'Supermercados Ejemplo del Cantábrico, S.L.', tradeName: 'Super Ejemplo', taxId: 'B00000105', branch: 'BIZKAIA',
    sector: '47', agreement: 'COM-BI', email: 'personas@superejemplo.example', phone: '+34 944 000 105',
    activity: 'Cadena de supermercados de proximidad',
    address: { street: 'Alameda de Ejemplo 22', postalCode: '48011', city: 'Bilbao', municipalityCode: '48020', provinceCode: '48' },
    centers: [
      { code: 'CT-01', name: 'Tienda Indautxu', street: 'Alameda de Ejemplo 22', postalCode: '48011', city: 'Bilbao', municipalityCode: '48020', provinceCode: '48' },
      { code: 'CT-02', name: 'Tienda Basauri', street: 'Kale Nagusia de Ejemplo 5', postalCode: '48970', city: 'Basauri', municipalityCode: '48015', provinceCode: '48' },
    ],
    contacts: [
      { name: 'Itziar Etxeberria Lasa', position: 'Técnica de selección', email: 'itziar.etxeberria@superejemplo.example', phone: '+34 600 000 127', roles: ['hr', 'requester'], main: true, quotes: true, signs: 127 },
    ],
    billing: { method: 'Recibo SEPA a 30 días', days: 30, layout: 'by_person', risk: 20000 },
  },
  {
    code: 'CLI-006', legalName: 'Distribuciones Farmacéuticas Centro, S.A.', tradeName: 'DisFarma Centro', taxId: 'A00000106', branch: 'MADRID',
    sector: '46', agreement: null, email: 'operaciones@disfarma.example', phone: '+34 910 000 106',
    activity: 'Distribución mayorista de productos farmacéuticos',
    address: { street: 'Av. de la Industria de Ejemplo 40', postalCode: '28823', city: 'Coslada', municipalityCode: null, provinceCode: '28' },
    centers: [
      { code: 'CT-01', name: 'Almacén Coslada', street: 'Av. de la Industria de Ejemplo 40', postalCode: '28823', city: 'Coslada', municipalityCode: null, provinceCode: '28' },
    ],
    contacts: [
      { name: 'Lucía Romero Prieto', position: 'Directora de operaciones', email: 'lromero@disfarma.example', phone: '+34 600 000 128', roles: ['operations', 'management'], main: true, quotes: true },
    ],
  },
  {
    code: 'CLI-007', legalName: 'Limpiezas Integrales Muestra, S.L.', tradeName: 'Limpiezas Muestra', taxId: 'B00000107', branch: 'MADRID',
    sector: '81', agreement: null, status: 'prospect', email: 'info@limpiezasmuestra.example', phone: '+34 910 000 107',
    activity: 'Limpieza de oficinas y naves industriales',
    address: { street: 'C/ de Muestra 15', postalCode: '28045', city: 'Madrid', municipalityCode: '28079', provinceCode: '28' },
    observations: 'Cliente potencial: primera reunión hecha. Aún sin centros ni condiciones de facturación.',
    centers: [],
    contacts: [
      { name: 'Óscar Núñez Blanco', position: 'Gerente', email: 'onunez@limpiezasmuestra.example', phone: '+34 600 000 129', roles: ['management'], main: true, quotes: true },
    ],
  },
];

/** Clase CNAE-2009 (4 cifras) de los centros, por la división del sector del cliente. */
const CNAE_CLASS: Record<string, string> = { '52': '5210', '25': '2562', '10': '1039', '56': '5621', '47': '4711', '46': '4646', '81': '8121' };

interface ClientOut { id: string; branchId: string; centers: string[]; contacts: string[]; signer: string | null; recipient: string | null; agreement: string | null }

async function clients(ctx: Ctx, payment: Record<string, string>) {
  const out: Record<string, ClientOut> = {};
  for (const c of CLIENTS) {
    const addr = await post('/v1/addresses', { street: c.address.street, postalCode: c.address.postalCode, city: c.address.city, municipalityCode: c.address.municipalityCode, provinceCode: c.address.provinceCode, countryCode: 'ES' });
    const client = await post('/v1/clients', {
      companyId: ctx.companyId, branchId: ctx.branch[c.branch], code: c.code, legalName: c.legalName, tradeName: c.tradeName, taxIdType: 'nif',
      taxId: c.taxId, ownerUserId: ctx.userId, sectorCode: c.sector, activity: c.activity, defaultAgreementId: c.agreement ? ctx.agreement[c.agreement] : null,
      startDate: day(-300), status: c.status ?? 'active', addressId: addr.id, phone: c.phone, email: c.email, website: `https://${c.email.split('@')[1]}`,
      observations: c.observations ?? null,
    });
    const o: ClientOut = { id: client.id, branchId: ctx.branch[c.branch], centers: [], contacts: [], signer: null, recipient: null, agreement: c.agreement ? ctx.agreement[c.agreement] ?? null : null };
    for (const ct of c.centers) {
      const a = await post('/v1/addresses', { street: ct.street, postalCode: ct.postalCode, city: ct.city, municipalityCode: ct.municipalityCode, provinceCode: ct.provinceCode, countryCode: 'ES' });
      const center = await post('/v1/client-centers', {
        clientId: client.id, branchId: ctx.branch[c.branch], code: ct.code, name: ct.name, addressId: a.id, cnaeCode: CNAE_CLASS[c.sector] ?? null,
        accessInstructions: ct.access ?? null, clientAgreementId: o.agreement,
      });
      o.centers.push(center.id);
    }
    for (const p of c.contacts) {
      const contact = await post('/v1/client-contacts', {
        clientId: client.id, name: p.name, position: p.position, email: p.email, phone: p.phone, roles: p.roles, isMain: p.main ?? false,
        isQuoteRecipient: p.quotes ?? false, signsCpds: p.signs !== undefined, validatesHours: p.validatesHours ?? false,
        documentType: p.signs !== undefined ? 'nif' : null, documentNumber: p.signs !== undefined ? dni(p.signs) : null, notes: p.notes ?? null,
      });
      o.contacts.push(contact.id);
      if (p.quotes && !o.recipient) o.recipient = contact.id;
      if (p.signs !== undefined && !o.signer) o.signer = contact.id;
    }
    if (c.billing) {
      await put(`/v1/clients/${client.id}/billing`, {
        paymentMethodId: payment[c.billing.method], paymentTermDays: c.billing.days, invoiceLayout: c.billing.layout, riskLimit: c.billing.risk ?? null,
      });
    }
    out[c.code] = o;
  }
  // Documentos de clientes: CIF, contrato marco (uno en borrador), certificado de la Seguridad Social y mandato SEPA.
  for (const code of ['CLI-001', 'CLI-002', 'CLI-004', 'CLI-005']) {
    const c = CLIENTS.find((x) => x.code === code)!;
    await uploadDocument('client', out[code]!.id, ctx.docType['CIF']!, `Tarjeta CIF ${c.taxId}.pdf`, { validate: true });
    await uploadDocument('client', out[code]!.id, ctx.docType['Contrato marco']!, `Contrato marco ETT - ${c.tradeName}.pdf`,
      code === 'CLI-005' ? { status: 'draft' } : { validate: true });
  }
  await uploadDocument('client', out['CLI-001']!.id, ctx.docType['Certificado de la Seguridad Social']!, 'Certificado corriente de pago SS.pdf',
    { validate: true, expiresOn: day(150) });
  await uploadDocument('client', out['CLI-002']!.id, ctx.docType['Certificado de la Seguridad Social']!, 'Certificado corriente de pago SS.pdf',
    { validate: true, expiresOn: day(-8) });
  await uploadDocument('client', out['CLI-004']!.id, ctx.docType['Mandato SEPA']!, 'Mandato SEPA firmado.pdf');
  return out;
}

// ---------------------------------------------------------------------------
// Presupuestos
// ---------------------------------------------------------------------------
interface PositionDef { name: string; description: string; agreement: string | null; category: string; level: string; base: number; bonus: number; hours: number; people: number; hoursPerPerson: number; rate: number }
interface QuoteDef {
  client: string; title: string; issued: number; validFor: number; start: number; months: number;
  positions: PositionDef[];
  flow: 'draft' | 'in_preparation' | 'approval_pending' | 'sent' | 'pending_signature' | 'accepted' | 'rejected' | 'new_version_accepted';
  conditions?: string;
}

const P = {
  operario: (rate: number, people: number): PositionDef => ({ name: 'Operario/a de almacén', description: 'Recepción, control de bultos, picking por radiofrecuencia, preparación de pedidos e inventario rotativo.', agreement: 'LOG-BI', category: 'Operario/a de almacén', level: 'IV', base: 17200, bonus: 120, hours: 1784, people, hoursPerPerson: 480, rate }),
  carretillero: (rate: number, people: number): PositionDef => ({ name: 'Mozo/a especialista - carretillero/a', description: 'Carga y descarga con carretilla frontal y retráctil; ubicación en altura.', agreement: 'LOG-BI', category: 'Mozo/a especialista - carretillero/a', level: 'III', base: 19450, bonus: 180, hours: 1784, people, hoursPerPerson: 480, rate }),
  mozo: (rate: number, people: number): PositionDef => ({ name: 'Mozo/a de almacén', description: 'Carga, descarga y reposición en la nave 2.', agreement: 'LOG-BI', category: 'Mozo/a de almacén', level: 'IV', base: 16700, bonus: 110, hours: 1784, people, hoursPerPerson: 520, rate }),
  camarero: (name: string, rate: number, people: number): PositionDef => ({ name, description: 'Servicio de sala, montaje de mesas y servicio de cócteles y banquetes.', agreement: 'HOST-CAT', category: 'Camarero/a', level: 'II', base: 16200, bonus: 90, hours: 1792, people, hoursPerPerson: 160, rate }),
  ayudanteCocina: (rate: number, people: number): PositionDef => ({ name: 'Ayudante de cocina', description: 'Preparación, emplatado y limpieza de cocina.', agreement: 'HOST-CAT', category: 'Ayudante de cocina', level: 'III', base: 15400, bonus: 80, hours: 1792, people, hoursPerPerson: 160, rate }),
  cocinero: (rate: number, people: number): PositionDef => ({ name: 'Cocinero/a de partida', description: 'Elaboración de la partida asignada en banquetes.', agreement: 'HOST-CAT', category: 'Cocinero/a', level: 'I', base: 18100, bonus: 110, hours: 1792, people, hoursPerPerson: 160, rate }),
  soldador: (rate: number, people: number): PositionDef => ({ name: 'Soldador/a TIG/MIG', description: 'Soldadura homologada en turnos rotativos 24/7.', agreement: 'METAL-M', category: 'Oficial de 1.ª soldador/a', level: 'Oficial 1.ª', base: 21500, bonus: 150, hours: 1752, people, hoursPerPerson: 900, rate }),
  envasado: (rate: number, people: number): PositionDef => ({ name: 'Operario/a de envasado', description: 'Selección, calibrado y envasado de cítricos en línea.', agreement: 'AGRO-MU', category: 'Peón de manipulado', level: 'Grupo 5', base: 16100, bonus: 60, hours: 1800, people, hoursPerPerson: 600, rate }),
  reponedor: (rate: number, people: number): PositionDef => ({ name: 'Reponedor/a', description: 'Reposición de lineales y control de caducidades.', agreement: 'COM-BI', category: 'Reponedor/a', level: 'Grupo IV', base: 16900, bonus: 70, hours: 1780, people, hoursPerPerson: 200, rate }),
  cajero: (rate: number, people: number): PositionDef => ({ name: 'Cajero/a', description: 'Cobro en caja y atención al cliente los fines de semana.', agreement: 'COM-BI', category: 'Cajero/a', level: 'Grupo IV', base: 16900, bonus: 70, hours: 1780, people, hoursPerPerson: 96, rate }),
  picker: (rate: number, people: number): PositionDef => ({ name: 'Preparador/a de pedidos', description: 'Preparación de pedidos de farmacia con radiofrecuencia y control de lotes.', agreement: null, category: 'Preparador/a de pedidos', level: 'Nivel 4', base: 17600, bonus: 0, hours: 1776, people, hoursPerPerson: 480, rate }),
};

const QUOTES: (QuoteDef & { key: string })[] = [
  { key: 'verano', client: 'CLI-001', title: 'Campaña logística verano HUB central', issued: -190, validFor: 30, start: -160, months: 3, positions: [P.mozo(17.4, 6)], flow: 'accepted' },
  { key: 'otono', client: 'CLI-001', title: 'Campaña logística otoño-invierno HUB central', issued: -45, validFor: 30, start: -10, months: 4, positions: [P.operario(18.2, 4), P.carretillero(20.6, 2)], flow: 'accepted', conditions: 'Garantía de sustitución en 24 horas. Formación PRL específica a cargo de la ETT.' },
  { key: 'fiestas', client: 'CLI-004', title: 'Servicio ETT camareros/as y cocina fiestas de fin de año', issued: -30, validFor: 20, start: 12, months: 1, positions: [P.camarero('Camarero/a de sala', 18.9, 10), P.ayudanteCocina(17.6, 4), P.cocinero(20.4, 2)], flow: 'new_version_accepted' },
  { key: 'citricos', client: 'CLI-003', title: 'Envasado nocturno campaña de cítricos', issued: -60, validFor: 30, start: -21, months: 5, positions: [P.envasado(16.9, 8)], flow: 'accepted' },
  { key: 'cajas', client: 'CLI-005', title: 'Cajeros/as fines de semana de Navidad', issued: -14, validFor: 15, start: 19, months: 1, positions: [P.cajero(17.9, 3)], flow: 'accepted' },
  { key: 'metal', client: 'CLI-002', title: 'Operarios/as soldadura y mecanizado metal 24/7', issued: -6, validFor: 30, start: 30, months: 6, positions: [P.soldador(24.1, 6)], flow: 'sent' },
  { key: 'congresos', client: 'CLI-004', title: 'Camareros/as para temporada de congresos', issued: -9, validFor: 30, start: 60, months: 4, positions: [P.camarero('Camarero/a de sala', 18.4, 8), P.camarero('Camarero/a de barra', 18.4, 4)], flow: 'pending_signature' },
  { key: 'inventario', client: 'CLI-001', title: 'Mozos de carga para inventario anual', issued: -70, validFor: 20, start: -40, months: 1, positions: [P.mozo(16.4, 5)], flow: 'rejected' },
  { key: 'reposicion', client: 'CLI-005', title: 'Reponedores/as campaña de Navidad', issued: -2, validFor: 15, start: 14, months: 2, positions: [P.reponedor(15.4, 5)], flow: 'approval_pending' },
  { key: 'farma', client: 'CLI-006', title: 'Preparadores/as de pedidos turno de noche', issued: -1, validFor: 30, start: 40, months: 6, positions: [P.picker(19.8, 6)], flow: 'in_preparation' },
  { key: 'limpieza', client: 'CLI-007', title: 'Limpieza de naves (borrador)', issued: 0, validFor: 30, start: 45, months: 3, positions: [], flow: 'draft' },
];

async function addPositions(ctx: Ctx, versionId: string, positions: PositionDef[]) {
  let v: Json;
  for (const p of positions) {
    v = await post(`/v1/quote-versions/${versionId}/positions`, {
      name: p.name, description: p.description, collectiveAgreementId: p.agreement ? ctx.agreement[p.agreement] : null, customCategoryName: p.category,
      level: p.level, annualBaseSalary: p.base, monthlyBonus: p.bonus, annualHours: p.hours, people: p.people, hoursPerPerson: p.hoursPerPerson, hourlyRate: p.rate,
    });
  }
  return v;
}

async function quotes(ctx: Ctx, cl: Record<string, ClientOut>, rejectReason: string) {
  const out: Record<string, { quoteId: string; versionId: string; positions: string[] }> = {};
  for (const q of QUOTES) {
    const c = cl[q.client]!;
    const quote = await post('/v1/quotes', {
      clientId: c.id, branchId: c.branchId, title: q.title, contactId: c.recipient, salesRepId: ctx.userId, issueDate: day(q.issued),
      // Para enviar, la API exige una validez futura: los antiguos quedan con validez de una semana más.
      validUntil: day(Math.max(q.issued + q.validFor, 7)), expectedStartDate: day(q.start), durationMonths: q.months, conditions: q.conditions ?? null,
      commercialNotes: 'Datos de ejemplo para la demostración.',
    });
    let versionId: string = quote.currentVersion.id;
    let version = q.positions.length ? await addPositions(ctx, versionId, q.positions) : quote.currentVersion;
    if (q.flow === 'in_preparation') await patch(`/v1/quote-versions/${versionId}`, { status: 'in_preparation' });
    if (q.flow === 'approval_pending') await post(`/v1/quote-versions/${versionId}/request-approval`, { notes: 'Margen ajustado para entrar en la cadena; el cliente puede traer más volumen en primavera.' });
    if (['sent', 'pending_signature', 'accepted', 'rejected', 'new_version_accepted'].includes(q.flow)) {
      await sendWithApproval(versionId);
    }
    if (q.flow === 'new_version_accepted') {
      // El cliente pidió más camareros: versión 2 con una persona más en sala y la tarifa revisada.
      const v2 = await post(`/v1/quote-versions/${versionId}/new-version`);
      versionId = v2.id;
      version = v2;
      const sala = v2.positions.find((p: Json) => p.name === 'Camarero/a de sala');
      if (sala) version = await patch(`/v1/quote-positions/${sala.id}`, { people: 12, hourlyRate: 19.2 });
      await sendWithApproval(versionId);
    }
    if (q.flow === 'pending_signature') await post(`/v1/quote-versions/${versionId}/pending-signature`);
    if (q.flow === 'accepted' || q.flow === 'new_version_accepted') await post(`/v1/quote-versions/${versionId}/accept`);
    if (q.flow === 'rejected') await post(`/v1/quote-versions/${versionId}/reject`, { reasonId: rejectReason, notes: 'El cliente ha encontrado una tarifa más baja.' });
    const fresh = await get(`/v1/quote-versions/${versionId}`);
    out[q.key] = { quoteId: quote.id, versionId, positions: (fresh.positions ?? version?.positions ?? []).map((p: Json) => p.id) };
    console.log(`  ${quote.code} ${q.title} (${q.flow})`);
  }
  return out;
}

async function sendWithApproval(versionId: string) {
  try {
    await post(`/v1/quote-versions/${versionId}/send`);
  } catch (e) {
    const review = await get(`/v1/quote-versions/${versionId}/review`);
    if (!review.needsApproval) throw e;
    await post(`/v1/quote-versions/${versionId}/request-approval`, { notes: 'Margen por debajo del mínimo por volumen.' });
    await post(`/v1/quote-versions/${versionId}/approve`, { notes: 'Aprobado: cliente estratégico.' });
    await post(`/v1/quote-versions/${versionId}/send`);
  }
}

// ---------------------------------------------------------------------------
// Peticiones
// ---------------------------------------------------------------------------
interface RequestDef {
  key: string; quote: string; position: number; client: string; center: number; slots: number; start: number; end: number | null;
  shift: string; schedule: ReturnType<typeof SCHEDULE>; useCase: string | null; justification: string | null; tasks: string | null; risks: string | null;
  ppe?: string; hazardous?: boolean; licenses?: string; qualification?: string; orderRef?: string;
  preCpd: 'pending' | 'generated' | 'sent' | 'reviewed'; status: 'new' | 'publishing' | 'selecting' | 'covered' | 'in_progress' | 'closed' | 'cancelled'; cancel?: string;
}

const RISKS_WAREHOUSE = 'Caída de objetos en manipulación, sobreesfuerzos, atropellos por carretillas. Evaluación del cliente de marzo (ficticia).';
const REQUESTS: RequestDef[] = [
  { key: 'verano', quote: 'verano', position: 0, client: 'CLI-001', center: 0, slots: 6, start: -160, end: -70, shift: 'Turno de mañana', schedule: SCHEDULE('06:00', '14:00'), useCase: 'production_foreseeable', justification: 'Campaña de verano con incremento de pedidos previsto.', tasks: 'Carga, descarga y reposición en la nave 2.', risks: RISKS_WAREHOUSE, ppe: 'Calzado de seguridad, chaleco reflectante y guantes', preCpd: 'reviewed', status: 'closed' },
  { key: 'manana', quote: 'otono', position: 0, client: 'CLI-001', center: 0, slots: 2, start: -10, end: 110, shift: 'Turno de mañana', schedule: SCHEDULE('06:00', '14:00'), useCase: 'production_unforeseen', justification: 'Pico de pedidos por la apertura de dos clientes nuevos de comercio electrónico.', tasks: 'Recepción, picking por radiofrecuencia y preparación de pedidos.', risks: RISKS_WAREHOUSE, ppe: 'Calzado de seguridad y chaleco reflectante', orderRef: 'OC-2026-118', preCpd: 'sent', status: 'covered' },
  { key: 'tarde', quote: 'otono', position: 0, client: 'CLI-001', center: 0, slots: 2, start: 7, end: 120, shift: 'Turno de tarde', schedule: SCHEDULE('14:00', '22:00'), useCase: 'production_unforeseen', justification: 'Pico de pedidos por la apertura de dos clientes nuevos de comercio electrónico.', tasks: 'Recepción, picking por radiofrecuencia y preparación de pedidos.', risks: RISKS_WAREHOUSE, ppe: 'Calzado de seguridad y chaleco reflectante', preCpd: 'generated', status: 'selecting' },
  { key: 'carretillas', quote: 'otono', position: 1, client: 'CLI-001', center: 1, slots: 2, start: 3, end: 120, shift: 'Turno de noche', schedule: SCHEDULE('22:00', '06:00'), useCase: 'production_unforeseen', justification: 'Refuerzo nocturno de la plataforma de Zorrotzaurre.', tasks: 'Carga y descarga con carretilla frontal y retráctil.', risks: null, hazardous: false, licenses: 'Carné de carretillero', preCpd: 'pending', status: 'selecting' },
  { key: 'sala', quote: 'fiestas', position: 0, client: 'CLI-004', center: 0, slots: 8, start: 12, end: 40, shift: 'Banquetes de tarde y noche', schedule: SCHEDULE('17:00', '01:00', [4, 5, 6, 7], 20), useCase: 'production_foreseeable', justification: 'Temporada de cenas de empresa y fin de año.', tasks: 'Montaje de sala, servicio de banquetes y cócteles.', risks: 'Cortes, quemaduras, caídas al mismo nivel y sobreesfuerzos (evaluación del cliente, ficticia).', ppe: 'Calzado antideslizante', qualification: 'Inglés básico; experiencia en banquetes', preCpd: 'generated', status: 'publishing' },
  { key: 'cocina', quote: 'fiestas', position: 1, client: 'CLI-004', center: 1, slots: 4, start: 12, end: 40, shift: 'Cocina de banquetes', schedule: SCHEDULE('15:00', '23:00', [4, 5, 6, 7], 20), useCase: null, justification: null, tasks: 'Preparación, emplatado y limpieza de cocina.', risks: null, preCpd: 'pending', status: 'new' },
  { key: 'cocinero', quote: 'fiestas', position: 2, client: 'CLI-004', center: 1, slots: 2, start: 12, end: 40, shift: 'Cocina de banquetes', schedule: SCHEDULE('15:00', '23:00', [5, 6], 20), useCase: 'production_foreseeable', justification: 'Temporada de banquetes.', tasks: 'Elaboración de la partida asignada.', risks: 'Cortes y quemaduras.', preCpd: 'pending', status: 'cancelled', cancel: 'El hotel cubre la cocina con su plantilla.' },
  { key: 'citricos', quote: 'citricos', position: 0, client: 'CLI-003', center: 0, slots: 8, start: -21, end: 130, shift: 'Turno de noche', schedule: SCHEDULE('22:00', '06:00'), useCase: 'production_foreseeable', justification: 'Campaña anual de cítricos.', tasks: 'Selección, calibrado y envasado en línea.', risks: 'Movimientos repetitivos, cortes y trabajo nocturno (evaluación del cliente, ficticia).', ppe: 'Guantes, cofia y calzado de seguridad', licenses: 'Manipulador de alimentos', preCpd: 'reviewed', status: 'in_progress' },
  { key: 'cajas', quote: 'cajas', position: 0, client: 'CLI-005', center: 0, slots: 3, start: 19, end: 45, shift: 'Fines de semana', schedule: SCHEDULE('09:00', '21:00', [6, 7], 60), useCase: 'production_foreseeable', justification: 'Fines de semana de Navidad.', tasks: 'Cobro en caja y atención al cliente.', risks: 'Posturas mantenidas y atracos (evaluación del cliente, ficticia).', preCpd: 'pending', status: 'new' },
];

async function requests(ctx: Ctx, cl: Record<string, ClientOut>, qs: Record<string, { versionId: string; positions: string[] }>) {
  const out: Record<string, { id: string; code: string; slots: Json[] }> = {};
  for (const r of REQUESTS) {
    const c = cl[r.client]!;
    const q = qs[r.quote]!;
    const res = await post(`/v1/quote-versions/${q.versionId}/requests`, {
      requests: [{
        quotePositionId: q.positions[r.position], positionsCount: r.slots, startDate: day(r.start), endDate: r.end === null ? null : day(r.end),
        shiftName: r.shift, schedule: r.schedule, clientCenterId: c.centers[r.center] ?? null, clientSignerContactId: c.signer, responsibleUserId: ctx.userId,
        orderReference: r.orderRef ?? null, tasks: r.tasks, qualification: r.qualification ?? null, risks: r.risks, ppe: r.ppe ?? null,
        hazardousWork: r.hazardous ?? false, requiredLicenses: r.licenses ?? null, useCase: r.useCase, useCaseJustification: r.justification,
      }],
    });
    const created = res.data?.[0] ?? res.requests?.[0] ?? res[0] ?? res;
    const id: string = created.id;
    if (r.preCpd !== 'pending') {
      await post(`/v1/requests/${id}/pre-cpd`);
      if (r.preCpd === 'sent' || r.preCpd === 'reviewed') await post(`/v1/requests/${id}/pre-cpd/sent`, { sentTo: CLIENTS.find((x) => x.code === r.client)!.contacts[0]!.email });
      if (r.preCpd === 'reviewed') await post(`/v1/requests/${id}/pre-cpd/reviewed`);
    }
    const detail = await get(`/v1/requests/${id}`);
    out[r.key] = { id, code: detail.code, slots: detail.slotList };
    console.log(`  ${detail.code} ${detail.positionName} (${r.slots} plazas)`);
  }
  return out;
}

async function finishRequests(reqs: Record<string, { id: string }>) {
  for (const r of REQUESTS) {
    if (r.status === 'new') continue;
    await patch(`/v1/requests/${reqs[r.key]!.id}`, { status: r.status, ...(r.cancel ? { cancelReason: r.cancel } : {}) });
  }
}

// ---------------------------------------------------------------------------
// Candidatos
// ---------------------------------------------------------------------------
type Stage = 'registered' | 'preselected' | 'interview' | 'proposed' | 'confirmed' | 'discarded' | 'withdrawn';
interface CandidateDef {
  first: string; last: string; city: string; province: string; postal: string; profile: string; others?: string[];
  attrs?: string[]; langs?: [string, string | null][]; years: number; shifts: string[]; status: string; source: string;
  id: 'dni' | 'nie' | 'none'; ss: boolean; idExpired?: boolean; consent: 'valid' | 'expired' | 'withdrawn' | 'none'; car?: boolean;
  docs: ('scan' | 'scan_pending' | 'scan_rejected' | 'prl' | 'prl_expired' | 'prl_expiring' | 'forklift' | 'food' | 'food_expired' | 'cv' | 'driving')[];
  apps?: { req: string; stage: Stage; origin: 'applied' | 'sourced'; accept?: boolean; reason?: string }[];
  contact?: { channel: string; result: string; next?: string; req?: string; daysAgo: number };
  availability?: string; nationality?: string;
}

const BI = { city: 'Bilbao', province: '48', postal: '48003' };
const BA = { city: 'Basauri', province: '48', postal: '48970' };
const BC = { city: 'Barcelona', province: '08', postal: '08014' };
const HO = { city: "L'Hospitalet de Llobregat", province: '08', postal: '08901' };
const MU = { city: 'Murcia', province: '30', postal: '30120' };
const MA = { city: 'Madrid', province: '28', postal: '28041' };
const AL = { city: 'Alcalá de Henares', province: '28', postal: '28806' };

const CANDIDATES: CandidateDef[] = [
  // Logística (Bizkaia)
  { first: 'Carlos', last: 'Gómez Ibarra', ...BI, profile: 'Carretillero/a', others: ['Operario/a de almacén'], attrs: ['Carné de carretillero', 'Carretilla frontal', 'Carretilla retráctil', 'PRL 20 h'], langs: [['Español', 'native'], ['Euskera', 'B1']], years: 8, shifts: ['morning', 'night'], status: 'in_selection', source: 'infojobs', id: 'dni', ss: true, consent: 'valid', car: true, docs: ['scan', 'forklift', 'prl', 'cv'], apps: [{ req: 'carretillas', stage: 'proposed', origin: 'applied' }], contact: { channel: 'phone', result: 'Interesado; disponible para noche', next: 'Presentar al cliente', req: 'carretillas', daysAgo: 2 } },
  { first: 'Marta', last: 'Rivas Echevarría', ...BA, profile: 'Operario/a de almacén', others: ['Preparador/a de pedidos'], attrs: ['Picking con radiofrecuencia', 'SGA / SAP', 'PRL 20 h'], langs: [['Español', 'native'], ['Inglés', 'B2']], years: 5, shifts: ['morning', 'afternoon'], status: 'unavailable', source: 'database', id: 'dni', ss: true, consent: 'valid', docs: ['scan', 'prl', 'cv'], apps: [{ req: 'manana', stage: 'confirmed', origin: 'sourced' }] },
  { first: 'Mohamed', last: 'Amrani El Idrissi', ...BI, profile: 'Carretillero/a', attrs: ['Carné de carretillero', 'Carretilla retráctil'], langs: [['Árabe', 'native'], ['Español', 'C1'], ['Francés', 'B2']], years: 6, shifts: ['night', 'weekends'], status: 'available', source: 'walk_in', id: 'nie', idExpired: true, ss: true, consent: 'valid', docs: ['scan', 'forklift', 'prl_expired'], apps: [{ req: 'carretillas', stage: 'interview', origin: 'applied' }], contact: { channel: 'whatsapp', result: 'Pendiente de renovar el NIE', next: 'Traer el NIE renovado', daysAgo: 4 }, nationality: 'MA' },
  { first: 'Elena', last: 'Sánchez Aguirre', ...BI, profile: 'Preparador/a de pedidos', others: ['Operario/a de almacén'], attrs: ['Picking por voz', 'Picking con radiofrecuencia'], langs: [['Español', 'native']], years: 3, shifts: ['afternoon'], status: 'in_selection', source: 'candidate_portal', id: 'dni', ss: true, consent: 'valid', docs: ['scan', 'cv'], apps: [{ req: 'tarde', stage: 'preselected', origin: 'applied' }] },
  { first: 'David', last: 'Castillo Urrutia', ...BA, profile: 'Carretillero/a', attrs: ['Carné de carretillero', 'Carretilla frontal', 'Transpaleta eléctrica', 'Permiso B'], langs: [['Español', 'native']], years: 10, shifts: ['morning', 'afternoon', 'night'], status: 'unavailable', source: 'referral', id: 'dni', ss: true, consent: 'valid', car: true, docs: ['scan', 'forklift', 'prl'], apps: [{ req: 'manana', stage: 'confirmed', origin: 'sourced' }] },
  { first: 'Laura', last: 'Méndez Olabarria', ...BI, profile: 'Operario/a de almacén', attrs: ['Control de stock'], langs: [['Español', 'native']], years: 2, shifts: ['morning'], status: 'to_contact', source: 'database', id: 'dni', ss: true, consent: 'expired', docs: ['scan'], contact: { channel: 'phone', result: 'No contesta', next: 'Volver a llamar y renovar el consentimiento', daysAgo: 12 } },
  { first: 'Andrés', last: 'Vidal Garai', ...BA, profile: 'Operario/a de almacén', others: ['Carretillero/a'], attrs: ['Carga y descarga', 'Paletizado'], langs: [['Español', 'native']], years: 1, shifts: ['afternoon', 'night'], status: 'in_selection', source: 'indeed', id: 'dni', ss: false, consent: 'none', docs: ['scan_pending'], apps: [{ req: 'tarde', stage: 'registered', origin: 'applied' }] },
  { first: 'Javier', last: 'Navarro Zubiri', ...BI, profile: 'Operario/a de almacén', attrs: ['Picking con radiofrecuencia', 'Carga y descarga'], langs: [['Español', 'native'], ['Euskera', 'C1']], years: 4, shifts: ['afternoon'], status: 'in_selection', source: 'database', id: 'dni', ss: true, consent: 'valid', docs: ['scan', 'prl_expiring', 'cv'], apps: [{ req: 'tarde', stage: 'interview', origin: 'sourced' }], contact: { channel: 'phone', result: 'Entrevista el jueves a las 10:00', req: 'tarde', daysAgo: 1 } },
  { first: 'Iker', last: 'Larrañaga Goñi', ...BA, profile: 'Operario/a de almacén', attrs: ['Paletizado'], langs: [['Español', 'native'], ['Euskera', 'native']], years: 2, shifts: ['morning', 'afternoon'], status: 'contacted', source: 'linkedin', id: 'dni', ss: true, consent: 'valid', docs: ['scan'], apps: [{ req: 'tarde', stage: 'discarded', origin: 'sourced', reason: 'No tiene disponibilidad de tarde hasta enero' }] },
  { first: 'Nerea', last: 'Uribe Salazar', ...BI, profile: 'Preparador/a de pedidos', attrs: ['Picking con radiofrecuencia'], langs: [['Español', 'native'], ['Inglés', 'B1']], years: 3, shifts: ['afternoon'], status: 'in_selection', source: 'candidate_portal', id: 'dni', ss: true, consent: 'none', docs: ['scan', 'cv'], apps: [{ req: 'tarde', stage: 'withdrawn', origin: 'applied' }] },
  { first: 'Bogdan', last: 'Popescu', ...BA, profile: 'Carretillero/a', attrs: ['Carné de carretillero', 'Carretilla retráctil', 'Permiso C'], langs: [['Rumano', 'native'], ['Español', 'B2']], years: 7, shifts: ['night'], status: 'in_selection', source: 'database', id: 'nie', ss: true, consent: 'valid', docs: ['scan', 'forklift', 'prl'], apps: [{ req: 'carretillas', stage: 'preselected', origin: 'sourced' }], nationality: 'RO' },
  { first: 'Ainhoa', last: 'Bilbao Etxebarria', ...BI, profile: 'Operario/a de almacén', attrs: ['Control de stock', 'SGA / SAP'], langs: [['Español', 'native'], ['Euskera', 'native'], ['Inglés', 'C1']], years: 6, shifts: ['morning'], status: 'available', source: 'referral', id: 'dni', ss: true, consent: 'valid', docs: ['scan', 'prl', 'cv'], apps: [{ req: 'verano', stage: 'confirmed', origin: 'sourced' }] },
  { first: 'Rubén', last: 'Ortega Landa', ...BA, profile: 'Operario/a de almacén', attrs: ['Carga y descarga'], langs: [['Español', 'native']], years: 1, shifts: ['morning', 'afternoon', 'night'], status: 'new', source: 'infojobs', id: 'none', ss: false, consent: 'none', docs: [], apps: [{ req: 'tarde', stage: 'registered', origin: 'applied' }] },
  { first: 'Sara', last: 'Mendieta Ruiz', ...BI, profile: 'Reponedor/a', others: ['Cajero/a'], attrs: ['Atención al cliente', 'Control de stock'], langs: [['Español', 'native']], years: 2, shifts: ['weekends', 'afternoon'], status: 'in_selection', source: 'candidate_portal', id: 'dni', ss: true, consent: 'valid', docs: ['scan', 'food'], apps: [{ req: 'cajas', stage: 'preselected', origin: 'applied' }] },
  { first: 'Leire', last: 'Arana Ugalde', ...BA, profile: 'Cajero/a', attrs: ['Atención al cliente'], langs: [['Español', 'native'], ['Euskera', 'B2']], years: 4, shifts: ['weekends'], status: 'in_selection', source: 'database', id: 'dni', ss: true, consent: 'none', docs: ['scan', 'cv'], apps: [{ req: 'cajas', stage: 'interview', origin: 'sourced', accept: true }], contact: { channel: 'email', result: 'Acepta que la presentemos para las cajas de Navidad', req: 'cajas', daysAgo: 3 } },
  { first: 'Unai', last: 'Zabala Ibáñez', ...BI, profile: 'Cajero/a', attrs: ['Atención al cliente'], langs: [['Español', 'native']], years: 1, shifts: ['weekends'], status: 'to_contact', source: 'indeed', id: 'dni', ss: false, consent: 'withdrawn', docs: ['scan'] },
  { first: 'Josu', last: 'Etxeberria Alonso', ...BA, profile: 'Operario/a de almacén', attrs: ['Paletizado', 'Transpaleta eléctrica'], langs: [['Español', 'native']], years: 9, shifts: ['morning'], status: 'available', source: 'database', id: 'dni', ss: true, consent: 'valid', docs: ['scan', 'prl'], apps: [{ req: 'verano', stage: 'confirmed', origin: 'sourced' }] },
  // Hostelería (Barcelona)
  { first: 'Jordi', last: 'Puig Ferrer', ...BC, profile: 'Camarero/a', attrs: ['Atención al cliente', 'Manipulador de alimentos'], langs: [['Catalán', 'native'], ['Español', 'native'], ['Inglés', 'C1']], years: 7, shifts: ['afternoon', 'night', 'weekends'], status: 'in_selection', source: 'linkedin', id: 'dni', ss: true, consent: 'valid', docs: ['scan', 'food', 'cv'], apps: [{ req: 'sala', stage: 'proposed', origin: 'sourced' }] },
  { first: 'Núria', last: 'Soler Vila', ...HO, profile: 'Camarero/a', attrs: ['Manipulador de alimentos'], langs: [['Catalán', 'native'], ['Español', 'native'], ['Francés', 'B2']], years: 4, shifts: ['night', 'weekends'], status: 'in_selection', source: 'candidate_portal', id: 'dni', ss: true, consent: 'valid', docs: ['scan', 'food'], apps: [{ req: 'sala', stage: 'proposed', origin: 'applied' }] },
  { first: 'Lucía', last: 'Fernández Roig', ...BC, profile: 'Camarero/a', attrs: ['Atención al cliente'], langs: [['Español', 'native'], ['Inglés', 'B2'], ['Italiano', 'B1']], years: 3, shifts: ['night', 'weekends'], status: 'in_selection', source: 'infojobs', id: 'dni', ss: true, consent: 'none', docs: ['scan', 'food_expired'], apps: [{ req: 'sala', stage: 'interview', origin: 'applied' }], contact: { channel: 'phone', result: 'Renovar el carné de manipulador antes de empezar', daysAgo: 5 } },
  { first: 'Pau', last: 'Martí Casals', ...HO, profile: 'Camarero/a', langs: [['Catalán', 'native'], ['Español', 'native']], years: 2, shifts: ['weekends'], status: 'in_selection', source: 'candidate_portal', id: 'dni', ss: true, consent: 'none', docs: ['scan'], apps: [{ req: 'sala', stage: 'preselected', origin: 'applied' }] },
  { first: 'Valentina', last: 'Rossi', ...BC, profile: 'Camarero/a', attrs: ['Manipulador de alimentos'], langs: [['Italiano', 'native'], ['Español', 'C1'], ['Inglés', 'C1']], years: 6, shifts: ['afternoon', 'night'], status: 'in_selection', source: 'linkedin', id: 'nie', ss: true, consent: 'valid', docs: ['scan', 'food', 'cv'], apps: [{ req: 'sala', stage: 'registered', origin: 'sourced' }], nationality: 'IT' },
  { first: 'Marc', last: 'Serra Bosch', ...BC, profile: 'Ayudante de cocina', others: ['Cocinero/a'], attrs: ['Manipulador de alimentos'], langs: [['Catalán', 'native'], ['Español', 'native']], years: 3, shifts: ['afternoon', 'split'], status: 'in_selection', source: 'database', id: 'dni', ss: true, consent: 'valid', docs: ['scan', 'food'], apps: [{ req: 'cocina', stage: 'preselected', origin: 'sourced' }] },
  { first: 'Fatima', last: 'Benali Ouahbi', ...HO, profile: 'Ayudante de cocina', attrs: ['Manipulador de alimentos'], langs: [['Árabe', 'native'], ['Español', 'B2'], ['Catalán', 'A2']], years: 2, shifts: ['morning', 'split'], status: 'new', source: 'walk_in', id: 'nie', ss: false, consent: 'none', docs: ['scan_rejected', 'food'], apps: [{ req: 'cocina', stage: 'registered', origin: 'applied' }], nationality: 'MA' },
  { first: 'Albert', last: 'Font Pons', ...BC, profile: 'Cocinero/a', attrs: ['Manipulador de alimentos'], langs: [['Catalán', 'native'], ['Español', 'native']], years: 12, shifts: ['split'], status: 'available', source: 'referral', id: 'dni', ss: true, consent: 'valid', docs: ['scan', 'food', 'cv'] },
  { first: 'Carla', last: 'Ribas Mas', ...HO, profile: 'Camarero/a', langs: [['Catalán', 'native'], ['Español', 'native'], ['Inglés', 'B1']], years: 1, shifts: ['weekends'], status: 'discarded', source: 'indeed', id: 'dni', ss: true, consent: 'expired', docs: ['scan'] },
  { first: 'Sergio', last: 'Molina Vives', ...BC, profile: 'Camarero/a', attrs: ['Atención al cliente'], langs: [['Español', 'native'], ['Inglés', 'C1']], years: 5, shifts: ['night'], status: 'in_selection', source: 'database', id: 'dni', ss: true, consent: 'valid', docs: ['scan', 'food'], apps: [{ req: 'sala', stage: 'discarded', origin: 'sourced', reason: 'Pide una tarifa superior a la del servicio' }] },
  // Envasado (Murcia)
  { first: 'Antonio', last: 'García Navarro', ...MU, profile: 'Operario/a de envasado', attrs: ['Manipulador de alimentos'], langs: [['Español', 'native']], years: 11, shifts: ['night'], status: 'unavailable', source: 'database', id: 'dni', ss: true, consent: 'valid', docs: ['scan', 'food', 'prl'], apps: [{ req: 'citricos', stage: 'confirmed', origin: 'sourced' }] },
  { first: 'Rosa', last: 'Martínez Hernández', ...MU, profile: 'Operario/a de envasado', attrs: ['Manipulador de alimentos'], langs: [['Español', 'native']], years: 6, shifts: ['night', 'morning'], status: 'unavailable', source: 'walk_in', id: 'dni', ss: true, consent: 'none', docs: ['scan', 'food'], apps: [{ req: 'citricos', stage: 'confirmed', origin: 'applied' }] },
  { first: 'Abdelkader', last: 'Mansouri', ...MU, profile: 'Operario/a de envasado', others: ['Peón agrícola'], attrs: ['Manipulador de alimentos', 'Permiso B'], langs: [['Árabe', 'native'], ['Español', 'B2']], years: 4, shifts: ['night'], status: 'unavailable', source: 'walk_in', id: 'nie', ss: true, consent: 'none', docs: ['scan', 'food'], apps: [{ req: 'citricos', stage: 'confirmed', origin: 'applied' }], nationality: 'DZ' },
  { first: 'Ana', last: 'López Sánchez', ...MU, profile: 'Operario/a de envasado', attrs: ['Manipulador de alimentos'], langs: [['Español', 'native']], years: 2, shifts: ['night'], status: 'in_selection', source: 'candidate_portal', id: 'dni', ss: true, consent: 'none', docs: ['scan', 'food'], apps: [{ req: 'citricos', stage: 'proposed', origin: 'applied' }] },
  { first: 'Ion', last: 'Munteanu', ...MU, profile: 'Operario/a de envasado', attrs: ['Manipulador de alimentos'], langs: [['Rumano', 'native'], ['Español', 'B1']], years: 3, shifts: ['night'], status: 'in_selection', source: 'referral', id: 'nie', ss: false, consent: 'valid', docs: ['scan', 'food_expired'], apps: [{ req: 'citricos', stage: 'interview', origin: 'sourced' }], nationality: 'RO' },
  { first: 'Francisco', last: 'Pérez Moreno', ...MU, profile: 'Peón agrícola', others: ['Operario/a de envasado'], attrs: ['Permiso B'], langs: [['Español', 'native']], years: 15, shifts: ['morning'], status: 'available', source: 'database', id: 'dni', ss: true, consent: 'expired', car: true, docs: ['scan'] },
  // Madrid: metal y farma
  { first: 'Raúl', last: 'Jiménez Torres', ...AL, profile: 'Técnico/a de mantenimiento', langs: [['Español', 'native']], years: 9, shifts: ['morning', 'afternoon', 'night'], status: 'to_contact', source: 'linkedin', id: 'dni', ss: true, consent: 'valid', docs: ['scan', 'prl', 'cv'], contact: { channel: 'email', result: 'Enviada la oferta de soldadura', next: 'Llamar cuando firme el cliente', daysAgo: 6 } },
  { first: 'Miguel', last: 'Ruiz Delgado', ...AL, profile: 'Operario/a de producción', langs: [['Español', 'native']], years: 5, shifts: ['morning', 'afternoon', 'night'], status: 'available', source: 'infojobs', id: 'dni', ss: true, consent: 'valid', docs: ['scan', 'prl_expired'] },
  { first: 'Cristina', last: 'Herrera Gil', ...MA, profile: 'Preparador/a de pedidos', attrs: ['Picking con radiofrecuencia', 'SGA / SAP'], langs: [['Español', 'native'], ['Inglés', 'B2']], years: 4, shifts: ['night'], status: 'available', source: 'database', id: 'dni', ss: true, consent: 'valid', docs: ['scan', 'cv'] },
  { first: 'Daniel', last: 'Moreno Castro', ...MA, profile: 'Preparador/a de pedidos', attrs: ['Picking por voz'], langs: [['Español', 'native']], years: 2, shifts: ['night', 'weekends'], status: 'new', source: 'candidate_portal', id: 'dni', ss: false, consent: 'none', docs: ['scan_pending'] },
  { first: 'Patricia', last: 'Vega Ramos', ...MA, profile: 'Administrativo/a', langs: [['Español', 'native'], ['Inglés', 'C1']], years: 6, shifts: ['morning'], status: 'available', source: 'linkedin', id: 'dni', ss: true, consent: 'valid', docs: ['scan', 'cv'] },
  { first: 'Wei', last: 'Zhang', ...MA, profile: 'Operario/a de almacén', attrs: ['Control de stock'], langs: [['Chino', 'native'], ['Español', 'B2'], ['Inglés', 'B2']], years: 3, shifts: ['afternoon'], status: 'contacted', source: 'walk_in', id: 'nie', ss: true, consent: 'valid', docs: ['scan'], nationality: 'CN' },
  { first: 'Paula', last: 'Santos Iglesias', ...MA, profile: 'Limpiador/a', langs: [['Español', 'native'], ['Portugués', 'B1']], years: 8, shifts: ['morning', 'split'], status: 'available', source: 'referral', id: 'dni', ss: true, consent: 'valid', docs: ['scan', 'prl'] },
];

async function candidates(ctx: Ctx, reqs: Record<string, { id: string; slots: Json[] }>) {
  const catalog: Json[] = [];
  for (const kind of ['candidate_profile', 'license', 'skill', 'language']) catalog.push(...(await get(`/v1/candidate-catalog?catalog=${kind}`)).data);
  const byName = (name: string) => {
    const item = catalog.find((i) => i.name === name);
    if (!item) throw new Error(`No está en las tablas maestras de candidatos: ${name}`);
    return item.id as string;
  };
  const notice = (await get('/v1/privacy-notices?purpose=talent_pool')).data[0];
  if (!notice) throw new Error('Falta el texto legal de la bolsa: aplica antes db/seeds/ett-demostracion.sql');
  let n = 0;
  let contacts = 0;
  const proposedOrder: { appId: string; stage: Stage }[] = [];
  for (const c of CANDIDATES) {
    n++;
    const idNumber = c.id === 'dni' ? dni(7000 + n) : c.id === 'nie' ? nie(70000 + n) : null;
    if (idNumber && !(c.id === 'dni' ? validDni(idNumber) : validNie(idNumber))) throw new Error(`Documento inventado sin letra válida: ${idNumber}`);
    const ss = c.ss ? nss(c.province, 1_000_000 + n) : null;
    if (ss && !validSsNumber(ss)) throw new Error(`NSS inventado sin control válido: ${ss}`);
    const slug = `${c.first}.${c.last.split(' ')[0]}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const cand = await post('/v1/candidates', {
      firstName: c.first, lastName: c.last, idDocumentType: c.id === 'none' ? null : c.id, idDocumentNumber: idNumber,
      idDocumentExpiresOn: idNumber ? (c.idExpired ? day(-35) : day(400 + n * 20)) : null, ssNumber: ss,
      birthDate: `${1970 + (n * 7) % 33}-${String((n % 12) + 1).padStart(2, '0')}-${String((n % 27) + 1).padStart(2, '0')}`,
      nationality: c.nationality ?? 'ES', phone: `+34 600 1${String(n).padStart(2, '0')} ${String(100 + n * 7).slice(-3)}`, email: `${slug}@correo.example`,
      city: c.city, provinceCode: c.province, postalCode: c.postal, address: `Calle de Ejemplo ${n}, ${1 + (n % 5)}.º`,
      // IBAN de relleno (con su control) para quien ya tiene plaza: lo pide la nómina.
      iban: c.apps?.some((a) => a.stage === 'confirmed') ? 'ES82 0000 0000 0000 0000 0000' : null, status: c.status, source: c.source,
      branchId: c.province === '48' ? ctx.branch.BIZKAIA : c.province === '28' ? ctx.branch.MADRID : ctx.branch.BARCELONA,
      mainProfileId: byName(c.profile), attributeIds: [...(c.others ?? []), ...(c.attrs ?? [])].map(byName),
      languages: (c.langs ?? []).map(([name, level]) => ({ id: byName(name), level })), experienceYears: c.years, hasCar: c.car ?? null,
      shifts: c.shifts, availability: c.status === 'unavailable' ? 'from_date' : 'immediate', availableFrom: c.status === 'unavailable' ? day(120) : null,
      maxDistanceKm: 25, experiences: c.years > 0 ? [{ company: 'Empresa de ejemplo', position: c.profile, from: `${2026 - c.years}-01`, to: null, duties: null }] : [],
    });
    // Consentimiento de la bolsa: vigente, caducado (dado hace 26 meses) o retirado.
    if (c.consent !== 'none') {
      const given = c.consent === 'expired' ? monthsAgo(26) : monthsAgo(1 + (n % 10));
      // En papel, con el documento firmado (ficticio).
      const paper = n % 2 === 0;
      const signed = paper
        ? await uploadDocument('candidate', cand.id, ctx.docType.candidate_privacy_consent!, `Consentimiento_RGPD_${c.first}_${c.last.split(' ')[0]}.pdf`.normalize('NFD').replace(/[\u0300-\u036f]/g, ''), { validate: true })
        : null;
      const res = await post(`/v1/candidates/${cand.id}/consents`, {
        purpose: 'talent_pool', noticeId: notice.id, givenAt: given, channel: paper ? 'paper' : 'portal', documentId: signed?.id ?? null,
      });
      if (c.consent === 'withdrawn') {
        const consentId = (res.consents ?? res.data ?? [res]).find((x: Json) => x.purpose === 'talent_pool')?.id ?? res.id;
        await post(`/v1/candidate-consents/${consentId}/withdraw`);
      }
    }
    for (const d of c.docs) {
      const name = `${c.first}_${c.last.split(' ')[0]}`.normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (d === 'scan') await uploadDocument('candidate', cand.id, ctx.docType.candidate_id_document!, `${c.id === 'nie' ? 'NIE' : 'DNI'}_${name}.pdf`, { validate: true, expiresOn: c.idExpired ? day(-35) : null });
      if (d === 'scan_pending') await uploadDocument('candidate', cand.id, ctx.docType.candidate_id_document!, `DNI_${name}.pdf`);
      if (d === 'scan_rejected') await uploadDocument('candidate', cand.id, ctx.docType.candidate_id_document!, `NIE_${name}_foto.pdf`, { reject: 'La foto no se lee: pedir una copia nítida por las dos caras' });
      if (d === 'prl') await uploadDocument('candidate', cand.id, ctx.docType.candidate_prl!, `PRL_20h_${name}.pdf`, { validate: true, expiresOn: day(300 + n * 5) });
      if (d === 'prl_expired') await uploadDocument('candidate', cand.id, ctx.docType.candidate_prl!, `PRL_20h_${name}.pdf`, { validate: true, expiresOn: day(-20 - n) });
      if (d === 'prl_expiring') await uploadDocument('candidate', cand.id, ctx.docType.candidate_prl!, `PRL_20h_${name}.pdf`, { validate: true, expiresOn: day(12) });
      if (d === 'forklift') await uploadDocument('candidate', cand.id, ctx.docType.candidate_forklift!, `Carne_carretillero_${name}.pdf`, { validate: true, expiresOn: day(500 + n * 9) });
      if (d === 'food') await uploadDocument('candidate', cand.id, ctx.docType.candidate_food_handler!, `Manipulador_${name}.pdf`, { validate: true, expiresOn: day(200 + n * 11) });
      if (d === 'food_expired') await uploadDocument('candidate', cand.id, ctx.docType.candidate_food_handler!, `Manipulador_${name}.pdf`, { validate: true, expiresOn: day(-60) });
      if (d === 'cv') await uploadDocument('candidate', cand.id, ctx.docType.candidate_cv!, `CV_${name}.pdf`, { validate: true });
    }
    for (const a of c.apps ?? []) {
      const app = await post('/v1/applications', {
        candidateId: cand.id, requestId: reqs[a.req]!.id, origin: a.origin, source: a.origin === 'applied' ? c.source : 'database',
        stage: ['preselected', 'interview'].includes(a.stage) ? a.stage : 'registered',
        ...(a.accept ? { candidateAcceptance: { channel: 'email' } } : {}),
      });
      if (a.stage === 'discarded') await patch(`/v1/applications/${app.id}`, { stage: 'discarded', discardReason: a.reason ?? null });
      if (a.stage === 'withdrawn') await patch(`/v1/applications/${app.id}`, { stage: 'withdrawn', notes: 'Ha encontrado otro trabajo.' });
      if (a.stage === 'proposed' || a.stage === 'confirmed') proposedOrder.push({ appId: app.id, stage: a.stage });
    }
    if (c.contact) {
      await post(`/v1/candidates/${cand.id}/contacts`, {
        contactedAt: new Date(Date.now() - c.contact.daysAgo * 86_400_000).toISOString(),
        channel: c.contact.channel, result: c.contact.result, nextAction: c.contact.next ?? null, requestId: c.contact.req ? reqs[c.contact.req]!.id : null,
      });
      contacts++;
    }
  }
  // Proponer y confirmar al final (ocupan plaza): primero las confirmadas, después las propuestas.
  for (const a of proposedOrder.filter((x) => x.stage === 'confirmed')) {
    await post(`/v1/applications/${a.appId}/propose`, {});
    await post(`/v1/applications/${a.appId}/confirm`);
  }
  for (const a of proposedOrder.filter((x) => x.stage === 'proposed')) await post(`/v1/applications/${a.appId}/propose`, {});
  console.log(`  ${CANDIDATES.length} candidatos, ${proposedOrder.length} propuestos o confirmados, ${contacts} contactos`);
}

// ---------------------------------------------------------------------------
// Principal
// ---------------------------------------------------------------------------
async function main() {
  await auth('password', { email: EMAIL, password: await askPassword() });
  const me = await get('/v1/me');
  const previous: string | null = me.activeTenant?.id ?? null;
  const target = (me.tenants as Json[]).find((t) => t.code === TENANT_CODE);
  if (!target) throw new Error(`${EMAIL} no es miembro de la ETT ${TENANT_CODE}: aplica antes db/seeds/ett-demostracion.sql con -v email=${EMAIL}`);
  await post('/v1/me/active-tenant', { tenantId: target.id });
  await auth('refresh_token', { refresh_token: session.refresh_token });
  try {
    const now = await get('/v1/me');
    if (now.activeTenant?.code !== TENANT_CODE) throw new Error('No se ha podido cambiar a la ETT de demostración');
    const existing = await get('/v1/clients?limit=1');
    if (existing.pagination.total > 0) {
      console.log(`La ETT ${TENANT_CODE} ya tiene clientes: no se hace nada.`);
      return;
    }
    await fakePdf();
    const company = (await get('/v1/companies')).data[0];
    const branches = (await get('/v1/branches')).data as Json[];
    const branch = Object.fromEntries(branches.map((b) => [b.code, b.id])) as Ctx['branch'];
    const ctx: Ctx = { companyId: company.id, branch, userId: me.user.id, docType: {}, agreement: {} };

    console.log('Tablas maestras, convenios propios y ajustes…');
    const payment = await catalogs(ctx);
    console.log('Clientes, centros y contactos…');
    const cl = await clients(ctx, payment);
    const reasons = (await get('/v1/catalog-items?type=quote_rejection_reason')).data as Json[];
    console.log('Presupuestos…');
    const qs = await quotes(ctx, cl, (reasons.find((r) => r.code === 'price') ?? reasons[0]).id);
    console.log('Peticiones…');
    const reqs = await requests(ctx, cl, qs);
    console.log('Candidatos, documentos y candidaturas…');
    await candidates(ctx, reqs);
    await finishRequests(reqs);
    console.log(`Listo: ETT ${TENANT_CODE} rellenada.`);
  } finally {
    if (previous && previous !== target.id) {
      await post('/v1/me/active-tenant', { tenantId: previous });
      console.log('ETT activa devuelta a la que tenías.');
    }
  }
}

main().catch((e) => {
  console.error(e instanceof ApiFailure ? e.message : e);
  process.exit(1);
});
