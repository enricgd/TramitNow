// Empresas en el modo demo: clientes, centros, contactos, facturación, documentos, historial, tablas maestras y
// CNAE, con los datos de ejemplo que tenía EmpresasView.jsx (design/empresas.html). Se comportan como la API:
// baja lógica recuperable, 409 `en_uso` para lo ya usado, 409 `conservacion_obligatoria` para los documentos
// que hay que conservar, y cada cambio deja su rastro en el historial. Todo es ficticio.
//
// El nivel superior de este fichero no tiene efectos (nada de push, contadores ni llamadas que cambien
// estado): así la compilación del NAS, que no usa el modo demo, lo descarta entero.
import { checkUniqueCode, delay, find, id, matches, newId, page, stamp, touch } from './memoriaBase';
import type { Repositories } from './repositorios';
import {
  ApiError,
  type ActivityEntityType,
  type ActivityEntry,
  type Address,
  type CatalogItem,
  type CatalogItemType,
  type Client,
  type ClientBilling,
  type ClientCenter,
  type ClientContact,
  type Cnae,
  type ContactPortalAccess,
  type StoredDocument,
} from './tipos';

const DEMO_USER = { id: id(250), name: 'Usuario Demo' };

// ---------------------------------------------------------------------------
// Catálogos: CNAE (una muestra; el completo está en la base de datos) y tablas maestras de la ETT
// ---------------------------------------------------------------------------

const secciones: Cnae[] = [
  ['A', 'Agricultura, ganadería, silvicultura y pesca'],
  ['C', 'Industria manufacturera'],
  ['F', 'Construcción'],
  ['G', 'Comercio al por mayor y al por menor; reparación de vehículos de motor y motocicletas'],
  ['H', 'Transporte y almacenamiento'],
  ['I', 'Hostelería'],
  ['N', 'Actividades administrativas y servicios auxiliares'],
  ['Q', 'Actividades sanitarias y de servicios sociales'],
].map(([code, name]) => ({ code, name, level: 'section' as const, parentCode: null }));
const cnae: Cnae[] = secciones.concat(
  [
    ['01', 'A', 'Agricultura, ganadería, caza y servicios relacionados con las mismas'],
    ['10', 'C', 'Industria de la alimentación'],
    ['25', 'C', 'Fabricación de productos metálicos, excepto maquinaria y equipo'],
    ['41', 'F', 'Construcción de edificios'],
    ['46', 'G', 'Comercio al por mayor e intermediarios del comercio, excepto de vehículos de motor y motocicletas'],
    ['47', 'G', 'Comercio al por menor, excepto de vehículos de motor y motocicletas'],
    ['49', 'H', 'Transporte terrestre y por tubería'],
    ['52', 'H', 'Almacenamiento y actividades anexas al transporte'],
    ['55', 'I', 'Servicios de alojamiento'],
    ['56', 'I', 'Servicios de comidas y bebidas'],
    ['81', 'N', 'Servicios a edificios y actividades de jardinería'],
    ['82', 'N', 'Actividades administrativas de oficina y otras actividades auxiliares a las empresas'],
    ['86', 'Q', 'Actividades sanitarias'],
    ['88', 'Q', 'Actividades de servicios sociales sin alojamiento'],
  ].map(([code, parentCode, name]) => ({ code, name, level: 'division' as const, parentCode })),
);

const item = (n: number, type: CatalogItemType, name: string, retentionRequired = false): CatalogItem => ({
  id: id(n), type, code: null, name, parentId: null, metadata: null, status: 'active', retentionRequired, ...stamp,
});
// Los valores de ejemplo de las notas del diseño (formas de pago, IVA y tipos de documento, por confirmar).
// IVA: sin causa especial es el régimen general (21 %); el recargo de equivalencia es equivalenceSurcharge.
const catalogItems: CatalogItem[] = [
  ...['Transferencia a 30 días', 'Transferencia a 60 días', 'Recibo SEPA a 30 días', 'Recibo SEPA a 60 días', 'Confirming a 90 días', 'Al contado'].map(
    (n, i) => item(300 + i, 'payment_method', n),
  ),
  ...['Exento', 'Inversión del sujeto pasivo', 'IGIC (Canarias)', 'Operación intracomunitaria'].map((n, i) =>
    item(310 + i, 'vat_special_cause', n),
  ),
  ...['Acuerdo de confidencialidad', 'CIF', 'Certificado de Hacienda', 'Certificado de la Seguridad Social', 'Escrituras', 'Mandato SEPA', 'Póliza de seguro'].map(
    (n, i) => item(320 + i, 'document_type', n),
  ),
  // Los contratos se conservan: no se pueden eliminar.
  item(329, 'document_type', 'Contrato', true),
  // Presupuestos (los siembra la migración de la fase 4 en cada ETT). Los motivos, 700 en adelante (memoriaPresupuestos.ts).
  ...['Precio', 'Plazo de incorporación', 'Eligió a la competencia', 'Cancela el proyecto', 'Sin respuesta del cliente'].map((n, i) =>
    item(700 + i, 'quote_rejection_reason', n),
  ),
  ...['Propuesta de presupuesto', 'Presupuesto firmado por el cliente', 'Condiciones o pliego del cliente', 'Correo del cliente'].map((n, i) =>
    item(710 + i, 'document_type', n),
  ),
  // Peticiones (fase 5, los siembra su migración): documentos del servicio de una petición.
  ...['Pedido u orden de compra del cliente', 'Evaluación de riesgos del cliente', 'CPD previo (condiciones de la puesta a disposición)', 'Otro documento'].map((n, i) =>
    item(714 + i, 'document_type', n),
  ),
  // Candidatos (fase 6): documentos de la persona, con su código (los de la migración de la fase 6).
  ...([
    ['candidate_id_document', 'DNI o NIE'], ['candidate_work_permit', 'Permiso de trabajo y residencia'], ['candidate_ss', 'Seguridad Social'],
    ['candidate_privacy_consent', 'Consentimiento RGPD'], ['candidate_forklift', 'Carné de carretillero'], ['candidate_driving_license', 'Permiso de conducir'],
    ['candidate_prl', 'Formación PRL'], ['candidate_food_handler', 'Manipulador de alimentos'], ['candidate_medical', 'Reconocimiento médico'], ['candidate_cv', 'CV'],
  ] as const).map(([code, n], i) => ({ ...item(720 + i, 'document_type', n), code })),
];
const catalogId = (type: CatalogItemType, name: string) => catalogItems.find((i) => i.type === type && i.name === name)!.id;

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

const NORTE = id(20);
const BARCELONA = id(21);
// Usuarios de memoria.ts (membresía n → usuario n + 100).
const CARLOS = id(257);
const ELENA = id(256);
const LAURA = id(258);

const address = (n: number, street: string, postalCode: string, municipalityCode: string | null, provinceCode: string, city: string | null = null): Address => ({
  id: id(n), streetType: null, street, number: null, door: null, postalCode, city, municipalityCode, provinceCode, countryCode: 'ES', geoZoneId: null, ...stamp,
});
/** Direcciones de clientes y centros: memoria.ts las añade a las demás. */
export const clientAddresses: Address[] = [
  address(52, 'Polígono Industrial Artunduaga, Pabellón 14', '48970', '48015', '48'),
  address(53, 'C/ del Torno 8', '28806', '28005', '28'),
  address(54, 'Carretera del Palmar km 3', '30120', null, '30', 'Murcia'),
  address(55, 'Passeig de Gràcia 112, 4º', '08008', '08019', '08'),
  address(56, 'C/ del Torno 8', '28806', '28005', '28'),
  address(57, 'Av. Diagonal 661', '08028', '08019', '08'),
];

const client = (n: number, data: Partial<Client> & Pick<Client, 'code' | 'legalName' | 'taxId' | 'branchId'>): Client => ({
  id: id(n), companyId: id(10), tradeName: null, taxIdType: 'nif', ownerUserId: CARLOS, clientTypeId: null, businessGroupId: null,
  activity: null, startDate: null, status: 'active', blocked: false, blockedReason: null, addressId: null, phone: null, fax: null,
  email: null, website: null, onlineCpdPricePrinting: false, observations: null, sectorCode: null, defaultAgreementId: null,
  deletedAt: null, ...stamp, ...data,
});
const clients: Client[] = [
  client(100, {
    code: 'CLI-001', legalName: 'Trans-Logística Ibérica Norte, S.L.', tradeName: 'TransLog Norte', taxId: 'B00000101', branchId: NORTE,
    email: 'contacto@translog-norte.example', phone: '+34 944 000 101', addressId: id(52), sectorCode: '52', defaultAgreementId: id(62),
    startDate: '2026-03-15', createdAt: '2026-03-15T09:00:00.000Z', updatedAt: '2026-11-15T08:30:00.000Z',
    observations: 'Cliente con alta demanda en picos de campaña Black Friday y verano. Exige perfiles carretilleros con carnet vigente.',
  }),
  client(101, {
    code: 'CLI-002', legalName: 'Manufacturas Metálicas del Henares, S.A.', tradeName: 'MetalHenares', taxId: 'A00000102', taxIdType: 'nif',
    branchId: NORTE, ownerUserId: ELENA, email: 'info@metalhenares.example', phone: '+34 918 000 102', addressId: id(53), sectorCode: '25',
    defaultAgreementId: id(63), startDate: '2026-01-20', createdAt: '2026-01-20T09:00:00.000Z', updatedAt: '2026-11-14T10:00:00.000Z',
    observations: 'Cliente consolidado. 4 centros activos y facturación mensual agrupada.',
  }),
  client(102, {
    code: 'CLI-003', legalName: 'Mediterránea Agrícola y Envasado, S.L.', tradeName: 'AgroMediterráneo', taxId: 'B00000103', branchId: BARCELONA,
    status: 'prospect', email: 'info@agromediterranea.example', phone: '+34 968 000 103', addressId: id(54), sectorCode: '01',
    createdAt: '2026-04-05T09:00:00.000Z', updatedAt: '2026-11-12T10:00:00.000Z',
    observations: 'Lead entrante feria Fruit Attraction. Pendiente validar contacto de contratación.',
  }),
  client(103, {
    code: 'CLI-004', legalName: 'Hostelería & Eventos Premium BCN, S.L.', tradeName: 'Premium Events BCN', taxId: 'B00000104', branchId: BARCELONA,
    ownerUserId: LAURA, email: 'rrhh@premiumeventsbcn.example', phone: '+34 932 000 104', addressId: id(55), sectorCode: '56',
    defaultAgreementId: id(60), startDate: '2026-02-14', createdAt: '2026-02-14T09:00:00.000Z', updatedAt: '2026-11-10T10:00:00.000Z',
    observations: 'Requieren camareros con idiomas y protocolo para hoteles 5* GL.',
  }),
];

const center = (n: number, clientId: string, branchId: string, code: string, name: string, data: Partial<ClientCenter> = {}): ClientCenter => ({
  id: id(n), clientId, branchId, code, name, taxId: null, ccc: null, isSelfEmployedCcc: false, cnaeCode: null, ssRegimeCode: null,
  blocked: false, addressId: null, phone: null, email: null, clientAgreementId: null, payrollAgreementId: null, grdaAgreementId: null,
  projectCode: null, tcCompanyId: null, tcBranchId: null, accessInstructions: null, notes: null, effectiveClientAgreementId: null,
  deletedAt: null, ...stamp, ...data,
});
// Trans-Logística no tiene centros a propósito: la ficha enseña qué falta para operar.
const centers: ClientCenter[] = [
  center(110, id(101), NORTE, 'CT-01', 'Planta Principal Alcalá', { addressId: id(56), notes: 'Sede central', ccc: '28000000001' }),
  center(111, id(103), BARCELONA, 'CT-01', 'Palau de Congressos BCN', {
    addressId: id(57), accessInstructions: 'Acceso puerta de proveedores c/ Martí i Franquès',
  }),
];

const contact = (n: number, clientId: string, name: string, position: string, data: Partial<ClientContact> = {}): ClientContact => ({
  id: id(n), clientId, centerId: null, name, position, department: null, phone: null, mobile: null, email: null, roles: [],
  isMain: false, isQuoteRecipient: false, signsCpds: false, documentType: null, documentNumber: null, receivesDigitalSignature: false,
  sendCollectionClaims: false, invoiceSendType: null, sortOrder: null, notes: null, validatesHours: false, otherRole: null,
  suspendedAt: null, suspendedBy: null,
  suspended: false, deletedAt: null, ...stamp, ...data,
});
const contacts: ClientContact[] = [
  contact(120, id(100), 'Marta Gómez Arana', 'Responsable de RRHH y Selección', {
    email: 'marta.gomez@translog-norte.example', phone: '+34 600 000 120', roles: ['hr', 'requester'], isMain: true, isQuoteRecipient: true,
    notes: 'Contacto principal para firma de presupuestos y gestión de altas de personal.',
  }),
  contact(121, id(100), 'Javier Ugarte Elorza', 'Jefe de Planta / Operaciones', {
    email: 'j.ugarte@translog-norte.example', phone: '+34 600 000 121', roles: ['operations', 'prevention'], validatesHours: true,
    notes: 'Gestiona la entrada a muelle y la entrega de EPIs a carretilleros.',
  }),
  contact(122, id(101), 'Alfonso Serrano', 'Dir. Financiero', {
    email: 'aserrano@metalhenares.example', phone: '+34 600 000 122', roles: ['billing', 'management'], isMain: true, isQuoteRecipient: true,
  }),
  contact(123, id(103), 'Sergi Pujol', 'Coordinador de Eventos', {
    email: 'spujol@premiumeventsbcn.example', phone: '+34 600 000 123', roles: ['commercial', 'operations'], isMain: true, isQuoteRecipient: true,
  }),
  contact(124, id(103), 'Montse Ferrer', 'Jefa de sala', {
    email: 'mferrer@premiumeventsbcn.example', phone: '+34 600 000 124', roles: ['operations'], validatesHours: true,
  }),
];

/** Documentos de ejemplo de los candidatos (memoriaCandidatos.ts): se añaden al primer uso. */
export function sembrarDocumentos(lista: Omit<StoredDocument, 'typeId' | 'typeName' | 'retentionRequired'>[], tipoPorCodigo: (code: string) => string) {
  for (const d of lista) {
    const t = catalogItems.find((x) => x.code === tipoPorCodigo(d.notes ?? '')) ?? catalogItems.find((x) => x.name === 'Otro documento')!;
    documents.push({ ...d, notes: null, typeId: t.id, typeName: t.name, retentionRequired: t.retentionRequired });
  }
}
/** Documentos vivos de una entidad (los de un candidato, para sus avisos y su supresión). */
export const documentosDeEntidad = (entityType: StoredDocument['entityType'], entityId: string) => documents.filter((d) => d.entityType === entityType && d.entityId === entityId && !d.deletedAt);
/** Supresión RGPD en la demo: el documento desaparece. */
export const quitarDocumentoDemo = (documentId: string) => {
  const i = documents.findIndex((d) => d.id === documentId);
  if (i >= 0) documents.splice(i, 1);
};
/** Código del tipo de documento por id (para los documentos de candidatos). */
export const codigoTipoDocumento = (typeId: string) => catalogItems.find((x) => x.id === typeId)?.code ?? null;
/** Lo avisa la memoria de candidatos para la auditoría (descargar un documento de un candidato). */
let alAbrirDocumentoDeCandidato: (d: StoredDocument) => void = () => {};
export const alDescargarDocumentoDeCandidato = (f: (d: StoredDocument) => void) => { alAbrirDocumentoDeCandidato = f; };

/** Centro y contacto de ejemplo por id (los usan las peticiones de ejemplo, memoriaPeticiones.ts). */
export const centroPorId = (centerId: string | null) => (centerId ? centers.find((c) => c.id === centerId) : undefined);
export const contactoPorId = (contactId: string | null) => (contactId ? contacts.find((c) => c.id === contactId) : undefined);

const emptyBilling = (clientId: string, n?: number): ClientBilling => ({
  id: n ? id(n) : newId(), clientId, paymentMethodId: null, paymentTermDays: null, fixedPaymentDays: null, iban: null, swiftBic: null,
  b2bDirectDebit: false, invoiceClientId: null, invoiceTypeId: null, invoicePrintModelId: null, copiesCount: 1,
  sendInvoicesByPostalMail: false, generateEInvoice: false, fixedInvoiceText: null, fixedInvoiceTextPosition: null,
  vatSpecialCauseId: null, equivalenceSurcharge: false, retentionTypeId: null, riskLimit: null, riskNotes: null,
  accountingAccount: null, supplierReference: null, sellerUserId: null, statisticalSectorId: null,
  offerMarginPercent: null, offerCoefficient: null, invoiceLayout: 'by_person', ...stamp,
});
const billings: ClientBilling[] = [
  {
    ...emptyBilling(id(100), 130), paymentMethodId: catalogId('payment_method', 'Transferencia a 60 días'), paymentTermDays: 60,
    fixedPaymentDays: [10, 25], invoiceLayout: 'by_concept', riskLimit: 30000,
    riskNotes: 'Pendiente scoring de riesgo',
  },
  {
    ...emptyBilling(id(101), 131), paymentMethodId: catalogId('payment_method', 'Confirming a 90 días'), paymentTermDays: 60,
    invoiceLayout: 'by_concept', iban: 'ES0000000000000000000000', riskLimit: 50000,
  },
  // Por persona (el valor por defecto) y con recargo de equivalencia, para ver las dos opciones.
  { ...emptyBilling(id(103), 132), equivalenceSurcharge: true },
];
const LEGAL_MAX_PAYMENT_DAYS = 60;
const billingResult = (billing: ClientBilling) =>
  delay({
    billing,
    warnings:
      billing.paymentTermDays !== null && billing.paymentTermDays > LEGAL_MAX_PAYMENT_DAYS
        ? [`El plazo de pago supera los ${LEGAL_MAX_PAYMENT_DAYS} días que permite la Ley 3/2004 entre empresas`]
        : [],
  });

// Lo que ya se ha usado en presupuestos o peticiones de las otras pantallas de la demo: no se puede eliminar.
const EN_USO: Record<string, string> = {
  [id(100)]: 'Tiene presupuestos y peticiones. Solo se puede dar de baja.',
  [id(120)]: 'Es la destinataria del presupuesto PRE-2026-0048. Solo se puede suspender.',
  [id(111)]: 'Tiene peticiones. Solo se puede desactivar.',
};

// ---------------------------------------------------------------------------
// Documentos (los ficheros subidos en la demo se quedan en el navegador) y acceso al Área de empresas
// ---------------------------------------------------------------------------

const documentType = (name: string) => catalogItems.find((i) => i.type === 'document_type' && i.name === name)!;
const document = (n: number, clientId: string, typeName: string, name: string, data: Partial<StoredDocument>): StoredDocument => {
  const type = documentType(typeName);
  return {
    id: id(n), entityType: 'client', entityId: clientId, typeId: type.id, typeName: type.name, retentionRequired: type.retentionRequired,
    name, mimeType: 'application/pdf', sizeBytes: 400_000, status: 'pending', expiresOn: null, visibleInPortal: false, notes: null,
    uploadedBy: CARLOS, uploadedByName: 'Carlos Mendoza', uploadedAt: NOW_DOC, validatedBy: null, validatedByName: null,
    validatedAt: null, deletedAt: null, ...stamp, ...data,
  };
};
const NOW_DOC = '2026-02-12T10:00:00.000Z';
const documents: StoredDocument[] = [
  document(140, id(100), 'Contrato', 'Contrato marco ETT - TransLogística 2026.pdf', { status: 'draft', sizeBytes: 1_450_000 }),
  document(141, id(100), 'CIF', 'Tarjeta CIF B00000101.pdf', {
    status: 'validated', sizeBytes: 420_000, uploadedBy: null, uploadedByName: 'Sistema', uploadedAt: '2026-02-03T10:00:00.000Z',
    validatedByName: 'Lucía Santos', validatedAt: '2026-02-04T10:00:00.000Z',
  }),
];
/** Ficheros subidos en esta sesión de la demo: URL local del navegador por id de documento. */
const ficheros = new Map<string, string>();

const portalAccess: Record<string, ContactPortalAccess> = {
  [id(120)]: { active: true, since: '2026-03-20', invitedAt: '2026-03-20', lastAccess: 'Ayer 17:40', permissions: ['pedir', 'personal', 'facturas', 'documentos'] },
  [id(121)]: { active: true, since: '2026-06-25', invitedAt: '2026-06-25', lastAccess: 'Hoy 08:15', permissions: ['personal', 'horas', 'documentos'] },
  [id(123)]: { active: true, since: '2026-09-28', invitedAt: '2026-09-28', lastAccess: 'Hace 3 días', permissions: ['pedir', 'personal', 'facturas', 'documentos'] },
  [id(124)]: { active: true, since: '2026-10-08', invitedAt: '2026-10-08', lastAccess: 'Hoy 09:02', permissions: ['personal', 'horas'] },
};

// ---------------------------------------------------------------------------
// Historial: como en la API, cada cambio deja una entrada con quién, cuándo y qué.
// ---------------------------------------------------------------------------

const entrada = (
  n: number, entityType: ActivityEntityType, entityId: string, parent: string | null, action: ActivityEntry['action'], summary: string,
  occurredAt: string, actorName: string,
): ActivityEntry => ({
  id: String(n), entityType, entityId, parentType: parent ? 'client' : null, parentId: parent, action,
  actorUserId: actorName === DEMO_USER.name ? DEMO_USER.id : null, actorName, occurredAt, summary, changes: null,
});
// Lo último, primero (como la API).
const activity: ActivityEntry[] = [
  entrada(3, 'client', id(100), null, 'update', 'Presupuesto PRE-2026-0048 generado en borrador', '2026-04-12T11:30:00.000Z', 'Carlos Mendoza'),
  entrada(2, 'client_contact', id(120), id(100), 'update', 'Contacto añadido y validado como destinatario de presupuestos', '2026-04-10T16:45:00.000Z', 'Carlos Mendoza'),
  entrada(1, 'client', id(100), null, 'create', 'Alta rápida completada desde llamada comercial inicial', '2026-04-09T10:15:00.000Z', 'Carlos Mendoza'),
];
let activityN = 100;
export function log(entityType: ActivityEntityType, entityId: string, parent: string | null, action: ActivityEntry['action'], summary: string) {
  activity.unshift(entrada(activityN++, entityType, entityId, parent, action, summary, new Date().toISOString(), DEMO_USER.name));
}

// ---------------------------------------------------------------------------
// Repositorios
// ---------------------------------------------------------------------------

const vivos = <T extends { deletedAt?: string | null }>(items: T[], deleted?: boolean) => items.filter((x) => (deleted ? !!x.deletedAt : !x.deletedAt));
const findVivo = <T extends { id: string; deletedAt?: string | null }>(items: T[], itemId: string) => {
  const x = find(items, itemId);
  if (x.deletedAt) throw new ApiError(404, 'no_encontrado', 'No existe o no tienes acceso');
  return x;
};
const ordenar = <T>(items: T[], ...claves: ((x: T) => string | number)[]) =>
  [...items].sort((a, b) => {
    for (const k of claves) {
      const [x, y] = [k(a), k(b)];
      if (x !== y) return typeof x === 'number' ? (x as number) - (y as number) : String(x).localeCompare(String(y), 'es');
    }
    return 0;
  });

function eliminar<T extends { id: string; deletedAt?: string | null }>(items: T[], itemId: string) {
  const x = findVivo(items, itemId);
  if (EN_USO[itemId]) throw new ApiError(409, 'en_uso', EN_USO[itemId]);
  x.deletedAt = new Date().toISOString();
  return x;
}
function restaurar<T extends { id: string; deletedAt?: string | null; updatedAt: string }>(items: T[], itemId: string) {
  const x = find(items, itemId);
  if (!x.deletedAt) throw new ApiError(404, 'no_encontrado', 'No está entre los eliminados');
  return touch(x, { deletedAt: null });
}
const parentOf = (clientId: string) => clientId;

/** Resumen de la lista de clientes (como GET /v1/clients): centros y contactos activos y si tiene facturación. */
const conResumen = (c: Client): Client => ({
  ...c,
  readiness: {
    centers: vivos(centers).filter((x) => x.clientId === c.id).length,
    contacts: vivos(contacts).filter((x) => x.clientId === c.id).length,
    hasBilling: billings.some((b) => b.clientId === c.id),
  },
});

/** Un centro o contacto no se restaura con su cliente eliminado (409, como la API). */
const clienteVivo = (clientId: string) => {
  if (clients.find((c) => c.id === clientId)?.deletedAt) {
    throw new ApiError(409, 'conflicto', 'Su empresa está eliminada: recupera antes la empresa');
  }
};
/** otherRole: obligatorio con el rol other y vacío sin él (422, como la API). */
const comprobarOtro = ({ roles, otherRole }: Pick<Partial<ClientContact>, 'roles' | 'otherRole'>) => {
  if (!!roles?.includes('other') !== !!otherRole?.trim()) {
    throw new ApiError(422, 'validacion', 'Con el rol «Otro» hay que escribir qué función tiene (y sin él, nada)');
  }
};
const sello = (data: Partial<ClientContact>) =>
  data.suspended ? { suspendedAt: new Date().toISOString(), suspendedBy: DEMO_USER.id } : { suspendedAt: null, suspendedBy: null };

/** Convenio efectivo del centro: el propio o el de la empresa. */
const conConvenio = (c: ClientCenter): ClientCenter => ({
  ...c,
  effectiveClientAgreementId: c.clientAgreementId ?? clients.find((x) => x.id === c.clientId)?.defaultAgreementId ?? null,
});

export function memoryClientRepositories(): Pick<
  Repositories,
  'clients' | 'clientCenters' | 'clientContacts' | 'cnae' | 'catalogItems' | 'activity' | 'documents' | 'portalAccess'
> {
  return {
    clients: {
      list: (q = {}) => {
        const sucursales = q.branchId?.split(',');
        return page(
          ordenar(
            vivos(clients, q.deleted).filter(
              (c) =>
                (!q.status || c.status === q.status) && (!q.companyId || c.companyId === q.companyId) &&
                (!sucursales || sucursales.includes(c.branchId)) && (q.blocked === undefined || c.blocked === q.blocked) &&
                matches(q.q, c.code, c.legalName, c.tradeName, c.taxId),
            ),
            (c) => c.legalName,
          ).map(conResumen),
          q,
        );
      },
      get: async (clientId) => delay(findVivo(clients, clientId)),
      async create(data) {
        const taxId = data.taxId?.replace(/[\s.\-/]/g, '').toUpperCase() ?? null;
        const mismos = vivos(clients).filter((c) => c.companyId === data.companyId);
        checkUniqueCode(mismos, data.code);
        if (taxId && mismos.some((c) => c.taxId === taxId)) {
          throw new ApiError(409, 'conflicto', 'Ya existe un cliente con ese NIF en la sociedad');
        }
        const created = client(0, { ...data, taxId, ownerUserId: data.ownerUserId ?? null, id: newId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        clients.push(created);
        log('client', created.id, null, 'create', created.status === 'prospect' ? 'Alta rápida en borrador' : 'Alta de la empresa');
        return delay(created);
      },
      async update(clientId, data) {
        const c = touch(findVivo(clients, clientId), data);
        log('client', clientId, null, 'update', 'Datos de la empresa actualizados');
        return delay(c);
      },
      // Como la API: sus centros y contactos se eliminan con él y vuelven al restaurarlo.
      async remove(clientId) {
        const c = eliminar(clients, clientId);
        for (const x of [...vivos(centers), ...vivos(contacts)]) if (x.clientId === clientId) x.deletedAt = c.deletedAt;
        log('client', clientId, null, 'delete', `Empresa eliminada: ${c.legalName}`);
        await delay(null);
      },
      async restore(clientId) {
        const c = find(clients, clientId);
        if (c.taxId && vivos(clients).some((x) => x.companyId === c.companyId && x.taxId === c.taxId)) {
          throw new ApiError(409, 'conflicto', 'Ya hay otra empresa activa con ese NIF');
        }
        for (const x of [...centers, ...contacts]) if (x.clientId === clientId && x.deletedAt === c.deletedAt) x.deletedAt = null;
        restaurar(clients, clientId);
        log('client', clientId, null, 'restore', `Empresa recuperada: ${c.legalName}`);
        return delay(c);
      },
      async billing(clientId) {
        findVivo(clients, clientId);
        const billing = billings.find((b) => b.clientId === clientId);
        if (!billing) throw new ApiError(404, 'no_encontrado', 'El cliente no tiene datos de facturación');
        return billingResult(billing);
      },
      async saveBilling(clientId, data) {
        findVivo(clients, clientId);
        let billing = billings.find((b) => b.clientId === clientId);
        if (!billing) billings.push((billing = emptyBilling(clientId)));
        log('client_billing', billing.id, parentOf(clientId), 'update', 'Datos de facturación actualizados');
        return billingResult(touch(billing, data));
      },
    },
    clientCenters: {
      list: (q = {}) => {
        const sucursales = q.branchId?.split(',');
        return page(
          ordenar(
            vivos(centers, q.deleted).filter(
              (c) => (!q.clientId || c.clientId === q.clientId) && (!sucursales || sucursales.includes(c.branchId)) && matches(q.q, c.code, c.name, c.ccc),
            ),
            (c) => c.name,
          ).map(conConvenio),
          q,
        );
      },
      get: async (centerId) => delay(conConvenio(findVivo(centers, centerId))),
      async create(data) {
        findVivo(clients, data.clientId);
        checkUniqueCode(vivos(centers).filter((c) => c.clientId === data.clientId), data.code);
        const created = center(0, data.clientId, data.branchId, data.code, data.name, { ...data, id: newId() });
        centers.push(created);
        log('client_center', created.id, data.clientId, 'create', `Nuevo centro de trabajo: ${created.name}`);
        return delay(conConvenio(created));
      },
      async update(centerId, data) {
        const c = touch(findVivo(centers, centerId), data);
        const que = data.blocked === undefined || Object.keys(data).length > 1 ? 'modificado' : data.blocked ? 'desactivado' : 'reactivado';
        log('client_center', centerId, c.clientId, 'update', `Centro ${que}: ${c.name}`);
        return delay(conConvenio(c));
      },
      async remove(centerId) {
        const c = eliminar(centers, centerId);
        log('client_center', centerId, c.clientId, 'delete', `Centro eliminado: ${c.name}`);
        await delay(null);
      },
      async restore(centerId) {
        const c = find(centers, centerId);
        clienteVivo(c.clientId);
        if (vivos(centers).some((x) => x.clientId === c.clientId && x.code === c.code)) {
          throw new ApiError(409, 'conflicto', `Ya hay otro centro activo con el código ${c.code}`);
        }
        restaurar(centers, centerId);
        log('client_center', centerId, c.clientId, 'restore', `Centro recuperado: ${c.name}`);
        return delay(conConvenio(c));
      },
    },
    clientContacts: {
      list: (q = {}) =>
        page(
          ordenar(
            vivos(contacts, q.deleted).filter(
              (c) => (!q.clientId || c.clientId === q.clientId) && (!q.centerId || c.centerId === q.centerId) && matches(q.q, c.name, c.email, c.position),
            ),
            (c) => (c.isMain ? 0 : 1),
            (c) => c.name,
          ),
          q,
        ),
      get: async (contactId) => delay(findVivo(contacts, contactId)),
      async create(data) {
        findVivo(clients, data.clientId);
        if (data.isMain && vivos(contacts).some((c) => c.clientId === data.clientId && c.isMain)) {
          throw new ApiError(409, 'conflicto', 'El cliente ya tiene un contacto principal');
        }
        if (!data.signsCpds && (data.documentType || data.documentNumber)) {
          throw new ApiError(422, 'validacion', 'Los datos no cumplen las reglas de la base de datos');
        }
        comprobarOtro(data);
        const created = contact(0, data.clientId, data.name, data.position ?? '', { ...data, id: newId(), ...sello(data) });
        contacts.push(created);
        log('client_contact', created.id, data.clientId, 'create', `Nuevo contacto: ${created.name}`);
        return delay(created);
      },
      async update(contactId, data) {
        const actual = findVivo(contacts, contactId);
        if (data.isMain && vivos(contacts).some((c) => c.clientId === actual.clientId && c.isMain && c.id !== contactId)) {
          throw new ApiError(409, 'conflicto', 'El cliente ya tiene un contacto principal');
        }
        comprobarOtro({ roles: data.roles ?? actual.roles, otherRole: data.otherRole === undefined ? actual.otherRole : data.otherRole });
        const c = touch(actual, { ...data, ...(data.suspended !== undefined && data.suspended !== actual.suspended ? sello(data) : {}) });
        const que = data.suspended === undefined || Object.keys(data).length > 1 ? 'modificado' : data.suspended ? 'suspendido' : 'reactivado';
        log('client_contact', contactId, c.clientId, 'update', `Contacto ${que}: ${c.name}`);
        return delay(c);
      },
      async remove(contactId) {
        const c = eliminar(contacts, contactId);
        log('client_contact', contactId, c.clientId, 'delete', `Contacto eliminado: ${c.name}`);
        await delay(null);
      },
      async restore(contactId) {
        const c = find(contacts, contactId);
        clienteVivo(c.clientId);
        if (c.isMain && vivos(contacts).some((x) => x.clientId === c.clientId && x.isMain)) {
          throw new ApiError(409, 'conflicto', 'Ya hay otro contacto principal: quita esa marca antes de recuperarlo');
        }
        restaurar(contacts, contactId);
        log('client_contact', contactId, c.clientId, 'restore', `Contacto recuperado: ${c.name}`);
        return delay(c);
      },
    },
    cnae: {
      list: (q = {}) => delay(cnae.filter((c) => (!q.level || c.level === q.level) && matches(q.q, c.code, c.name))),
    },
    catalogItems: {
      list: (q) => page(catalogItems.filter((i) => i.type === q.type && (!q.status || i.status === q.status) && matches(q.q, i.name, i.code)), q),
      async create(data) {
        const name = data.name.trim();
        if (catalogItems.some((i) => i.type === data.type && i.name.toLowerCase() === name.toLowerCase())) {
          throw new ApiError(409, 'conflicto', `Ya existe «${name}»`);
        }
        const created: CatalogItem = { ...item(0, data.type, name), id: newId(), code: data.code ?? null };
        catalogItems.push(created);
        return delay(created);
      },
    },
    activity: {
      list: (q) =>
        page(
          activity.filter(
            (a) => (a.entityType === q.entityType && a.entityId === q.entityId) || (q.includeChildren && a.parentId === q.entityId),
          ),
          q,
        ),
    },
    documents: {
      list: (q = {}) =>
        page(
          vivos(documents, q.deleted).filter(
            (d) =>
              (!q.entityType || d.entityType === q.entityType) && (!q.entityId || d.entityId === q.entityId) &&
              (!q.typeId || d.typeId === q.typeId) && (!q.status || d.status === q.status) && matches(q.q, d.name),
          ),
          q,
        ),
      async upload({ file, ...data }) {
        const type = find(catalogItems, data.typeId);
        const created: StoredDocument = {
          ...document(0, data.entityId, type.name, data.name, {}),
          id: newId(), entityType: data.entityType, status: data.status ?? 'pending', expiresOn: data.expiresOn ?? null,
          visibleInPortal: data.visibleInPortal ?? false, notes: data.notes ?? null, mimeType: file.type, sizeBytes: file.size,
          uploadedBy: DEMO_USER.id, uploadedByName: DEMO_USER.name, uploadedAt: new Date().toISOString(),
        };
        // Un fichero de verdad (elegido por el usuario) se puede ver en esta sesión; los de ejemplo, no.
        if (file instanceof Blob && file.size > 0 && typeof URL.createObjectURL === 'function') ficheros.set(created.id, URL.createObjectURL(file));
        documents.unshift(created);
        log('document', created.id, data.entityId, 'create', `Documento subido: ${created.name}`);
        return delay(created, 400);
      },
      async update(documentId, data) {
        const d = findVivo(documents, documentId);
        if (data.typeId) {
          const type = find(catalogItems, data.typeId);
          Object.assign(d, { typeName: type.name, retentionRequired: type.retentionRequired });
        }
        if (data.status === 'validated' && d.status !== 'validated') {
          Object.assign(d, { validatedBy: DEMO_USER.id, validatedByName: DEMO_USER.name, validatedAt: new Date().toISOString() });
        }
        touch(d, data);
        log('document', documentId, d.entityId, 'update', `Documento modificado: ${d.name}`);
        return delay(d);
      },
      async remove(documentId) {
        const d = findVivo(documents, documentId);
        if (d.retentionRequired) {
          throw new ApiError(409, 'conservacion_obligatoria', `Los documentos de tipo «${d.typeName}» hay que conservarlos: no se pueden eliminar`);
        }
        d.deletedAt = new Date().toISOString();
        log('document', documentId, d.entityId, 'delete', `Documento eliminado: ${d.name}`);
        await delay(null);
      },
      async restore(documentId) {
        const d = restaurar(documents, documentId);
        log('document', documentId, d.entityId, 'restore', `Documento recuperado: ${d.name}`);
        return delay(d);
      },
      downloadUrl: async (documentId) => {
        const d = findVivo(documents, documentId);
        if (d.entityType === 'candidate') alAbrirDocumentoDeCandidato(d);
        return delay(ficheros.get(documentId) ?? null);
      },
      async reject(documentId, reason) {
        const d = findVivo(documents, documentId);
        Object.assign(d, { status: 'rejected', rejectionReason: reason, validatedBy: DEMO_USER.id, validatedByName: DEMO_USER.name, validatedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        log('document', documentId, d.entityId, 'update', `Documento rechazado: ${d.name} (${reason})`);
        return delay(d);
      },
      async renewalNotice(documentId) {
        const d = findVivo(documents, documentId);
        d.renewalNoticeSentAt = new Date().toISOString();
        return delay(d);
      },
    },
    portalAccess: {
      list: async (clientId) =>
        delay(Object.fromEntries(contacts.filter((c) => c.clientId === clientId && portalAccess[c.id]).map((c) => [c.id, portalAccess[c.id]]))),
      async save(contactId, permissions) {
        findVivo(contacts, contactId);
        const hoy = new Date().toISOString().slice(0, 10);
        const actual = portalAccess[contactId];
        portalAccess[contactId] = actual?.active
          ? { ...actual, permissions }
          : { active: true, since: hoy, invitedAt: hoy, lastAccess: null, permissions };
        return delay(portalAccess[contactId]);
      },
      async revoke(contactId) {
        if (portalAccess[contactId]) portalAccess[contactId] = { ...portalAccess[contactId], active: false };
        await delay(null);
      },
    },
  };
}
