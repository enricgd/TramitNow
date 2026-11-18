// Datos de Empresas (EmpresasView.jsx): lista, ficha, catálogos y acciones. Carga, guarda y traduce entre la
// forma de la API (clientes, centros, contactos, facturación, documentos, historial) y la de la pantalla, que
// es la que tenía el diseño. La vista solo recibe datos y funciones; no sabe si vienen de apps/api o de los
// datos de ejemplo del modo demo (src/data/memoriaEmpresas.ts).
//
// - Lista: búsqueda, sucursal de la cabecera y paginación en el servidor (?q, ?branchId, limit, offset). Los
//   filtros de preparación, sector y responsable se aplican sobre la página cargada.
// - Eliminar es una baja lógica: lo eliminado sale con el filtro «Eliminados» y se puede recuperar. Lo que
//   ya se ha usado no se elimina (409 en_uso): la pantalla ofrece suspender, desactivar o dar de baja.
// - El acceso al Área de empresas aún no está en la API: en modo real, `portalDisponible` es false.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { haceCuanto } from '../../cabecera/useCabecera';
import {
  ApiError,
  repos,
  useData,
  type Address,
  type CatalogItem,
  type CatalogItemType,
  type Client,
  type ClientBilling,
  type ClientCenter,
  type ClientContact,
  type ClientReadiness,
  type ContactPortalAccess,
  type ContactRole,
  type InvoiceLayout,
  type Province,
  type Repositories,
  type StoredDocument,
} from '../../data';
import { useSesion } from '../../sesion';
import { cantidad } from '../../ui/formato';
import {
  codigoPais,
  direccionVista,
  esError,
  fechaCorta,
  fechaHora,
  guardarDireccion,
  mensajeError,
  provincias,
  quitarDireccionNueva,
  vacioANull,
  type DireccionVista,
} from '../comun/datos';

export { mensajeError };

// ---------------------------------------------------------------------------
// Forma de la pantalla
// ---------------------------------------------------------------------------

export type Preparacion = { basic: boolean; quote: boolean; operations: boolean; billing: boolean };

export type ContactoVista = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  /** Etiquetas de rol tal como las enseña la pantalla («Comercial», «Valida horas», el texto de «Otro»...). */
  types: string[];
  isMain: boolean;
  isQuoteRecipient: boolean;
  notes: string;
  suspendido: boolean;
  portal?: { activo: boolean; desde: string | null; invitado: string | null; ultimoAcceso: string | null; permisos: string[] };
};

export type CentroVista = DireccionVista & {
  id: string;
  name: string;
  /** Instrucciones de acceso y PRL. */
  notes: string;
  /** Nombre del convenio que se aplica (el propio o el heredado de la empresa). */
  laborAgreement: string;
  /** Convenio propio ('' = hereda el de la empresa). */
  laborAgreementId: string;
  heredado: boolean;
  suspendido: boolean;
};

export type FacturacionVista = {
  paymentMethod: string;
  fixedPayDays: string;
  /** «Régimen general (21 %)», la causa especial de IVA o «Recargo de equivalencia». */
  vatRegime: string;
  facturaDetalle: 'concepto' | 'persona';
  tieneIban: boolean;
  riskLimit: string;
  isComplete: boolean;
};

export type ActividadVista = { id: string; date: string; user: string; action: string; type: string };

export type DocumentoVista = {
  id: string;
  nombre: string;
  tipo: string;
  subidoPor: string;
  fecha: string;
  tamano: string;
  estado: string;
  paginas: null;
  caduca: string;
  visibleCliente: boolean;
  notas: string;
  /** Su tipo exige conservarlo: no se puede eliminar. */
  conservar: boolean;
  esImagen: boolean;
  esPdf: boolean;
};

export type EmpresaVista = DireccionVista & {
  id: string;
  cif: string;
  name: string;
  tradeName: string;
  status: Client['status'];
  statusLabel: string;
  statusTone: 'success' | 'warning' | 'neutral';
  readiness: Preparacion;
  readinessLabel: string;
  owner: string;
  ownerUserId: string;
  email: string;
  phone: string;
  sector: string;
  sectorCode: string;
  notes: string;
  lastActivity: string;
  createdAt: string;
  branchId: string;
  defaultAgreementId: string;
  defaultAgreement: string;
  contacts: ContactoVista[];
  centers: CentroVista[];
  billing: FacturacionVista;
  activity: ActividadVista[];
  documentos: DocumentoVista[];
  /** Solo en la lista de eliminadas. */
  deletedAt?: string;
};

export type EliminadoVista = { id: string; nombre: string; detalle: string; fecha: string };
export type TipoElemento = 'empresa' | 'contacto' | 'centro' | 'documento';

const POR_PAGINA = 20;
const eliminado = (x: { deletedAt?: string | null }) => !!x.deletedAt;

const ESTADOS: Record<Client['status'], [string, EmpresaVista['statusTone']]> = {
  prospect: ['Borrador · en captación', 'warning'],
  active: ['Cliente activo', 'success'],
  inactive: ['De baja', 'neutral'],
};

// Roles del contacto: etiqueta de la pantalla ↔ valor de la API.
const ROLES: [ContactRole, string][] = [
  ['commercial', 'Comercial'],
  ['requester', 'Solicitante'],
  ['operations', 'Operativo'],
  ['billing', 'Facturación'],
  ['hr', 'RR. HH.'],
  ['prevention', 'Prevención / PRL'],
  ['management', 'Dirección'],
];
const VALIDA_HORAS = 'Valida horas';
const DESTINATARIO = 'Destinatario de Presupuestos';

function etiquetasContacto(c: ClientContact): string[] {
  const roles = ROLES.filter(([r]) => c.roles.includes(r)).map(([, t]) => t);
  if (c.validatesHours) roles.push(VALIDA_HORAS);
  if (c.roles.includes('other') && c.otherRole) roles.push(c.otherRole);
  if (c.isQuoteRecipient) roles.push(DESTINATARIO);
  return roles;
}

function rolesDeEtiquetas(types: string[]) {
  const conocidas = new Map(ROLES.map(([r, t]) => [t, r]));
  const otros = types.filter((t) => !conocidas.has(t) && t !== VALIDA_HORAS && t !== DESTINATARIO);
  const roles = types.filter((t) => conocidas.has(t)).map((t) => conocidas.get(t)!);
  // «Otro»: el rol other con su texto (la API exige los dos juntos).
  if (otros.length) roles.push('other');
  return { roles, validatesHours: types.includes(VALIDA_HORAS), otherRole: otros.length ? otros.join(', ') : null };
}

// Días fijos de pago: números (31 = último día del mes) ↔ texto de la pantalla.
const DIAS_PAGO: (number[] | null)[] = [null, [5], [10], [10, 25], [15], [31]];
export function textoDiasPago(dias: number[] | null | undefined): string {
  if (!dias?.length) return 'Sin día fijo';
  if (dias.length === 1 && dias[0] === 31) return 'Último día del mes';
  const nombres = dias.map((d) => (d === 31 ? 'último' : String(d)));
  const lista = nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`;
  return `${dias.length === 1 ? 'Día' : 'Días'} ${lista} de cada mes`;
}
function diasDeTexto(texto: string): number[] | null {
  if (/sin d[ií]a/i.test(texto)) return null;
  const dias = [...texto.matchAll(/\d+/g)].map((m) => Number(m[0]));
  if (/[uú]ltimo/i.test(texto)) dias.push(31);
  const unicos = [...new Set(dias)].sort((a, b) => a - b);
  if (!unicos.length || unicos.some((d) => d < 1 || d > 31)) throw new ApiError(400, 'validacion', 'Escribe los días del mes (del 1 al 31), por ejemplo «Día 20» o «Días 5 y 20»');
  if (unicos.length > 3) throw new ApiError(400, 'validacion', 'Como mucho, tres días fijos de pago');
  return unicos;
}

// Régimen de IVA en un solo desplegable: sin causa especial es el general; el recargo es equivalenceSurcharge.
const IVA_GENERAL = 'Régimen general (21 %)';
const IVA_RECARGO = 'Recargo de equivalencia';

const DISENO_FACTURA: Record<InvoiceLayout, FacturacionVista['facturaDetalle']> = { by_concept: 'concepto', by_person: 'persona' };
const ESTADOS_DOC: Record<StoredDocument['status'], string> = { validated: 'Validado', pending: 'Pendiente de validar', draft: 'Borrador', rejected: 'Rechazado' };

const tamanoLegible = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
const euros = (n: number) => `${cantidad(n)} €`;

function preparacion(contactos: ClientContact[] | null, centros: ClientCenter[] | null, facturacion: ClientBilling | null) {
  const readiness: Preparacion = {
    basic: true,
    quote: !!contactos?.some((c) => !c.suspended && (c.isQuoteRecipient || c.isMain)),
    operations: !!centros?.some((c) => !c.blocked),
    billing: !!facturacion?.paymentMethodId && !!facturacion.iban,
  };
  const readinessLabel = !readiness.quote
    ? 'Alta básica (Falta contacto)'
    : !readiness.operations
      ? 'Lista para presupuestar'
      : readiness.billing
        ? 'Facturación y Operativa listas'
        : 'Petición operativa lista';
  return { readiness, readinessLabel };
}

/** Preparación con el resumen de GET /v1/clients: contactos y centros activos y si tiene datos de facturación. */
function preparacionResumen(r: ClientReadiness) {
  const readiness: Preparacion = { basic: true, quote: r.contacts > 0, operations: r.centers > 0, billing: r.hasBilling };
  const readinessLabel = !readiness.quote
    ? 'Alta básica (Falta contacto)'
    : !readiness.operations
      ? 'Lista para presupuestar'
      : readiness.billing
        ? 'Facturación y Operativa listas'
        : 'Petición operativa lista';
  return { readiness, readinessLabel };
}

// ---------------------------------------------------------------------------
// Catálogos de la pantalla: responsables, sectores (CNAE), convenios y tablas maestras
// ---------------------------------------------------------------------------

type Catalogos = {
  responsables: { id: string; nombre: string }[];
  sectores: { code: string; name: string }[];
  convenios: { id: string; nombre: string }[];
  items: Record<'payment_method' | 'vat_special_cause' | 'document_type', CatalogItem[]>;
};

const lista = <T>(p: Promise<{ data: T[] }>) => p.then((r) => r.data, () => [] as T[]);

async function cargarCatalogos(r: Repositories): Promise<Catalogos> {
  const [miembros, sectores, convenios, pago, iva, docs] = await Promise.all([
    lista(r.memberships.list({ status: 'active', limit: 200 })),
    r.cnae.list({ level: 'division' }).catch(() => []),
    lista(r.collectiveAgreements.list({ status: 'active', limit: 200 })),
    lista(r.catalogItems.list({ type: 'payment_method', status: 'active', limit: 200 })),
    lista(r.catalogItems.list({ type: 'vat_special_cause', status: 'active', limit: 200 })),
    lista(r.catalogItems.list({ type: 'document_type', status: 'active', limit: 200 })),
  ]);
  return {
    responsables: miembros.map((m) => ({ id: m.userId, nombre: m.fullName })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    sectores: sectores.map((s) => ({ code: s.code, name: s.name })),
    convenios: convenios.map((c) => ({ id: c.id, nombre: c.name })),
    items: { payment_method: pago, vat_special_cause: iva, document_type: docs },
  };
}

const VACIO: Catalogos = { responsables: [], sectores: [], convenios: [], items: { payment_method: [], vat_special_cause: [], document_type: [] } };

// ---------------------------------------------------------------------------
// Carga de la lista y de la ficha
// ---------------------------------------------------------------------------

type Contexto = { cat: Catalogos; provincias: Province[] };

const nombreDe = (lista: { id: string; nombre: string }[], id: string | null | undefined) => lista.find((x) => x.id === id)?.nombre ?? '';
const sectorDe = (cat: Catalogos, code: string | null | undefined) => (code ? cat.sectores.find((s) => s.code === code)?.name ?? `CNAE ${code}` : '');

async function direccion(r: Repositories, id: string | null, todas: Province[]) {
  const a = id ? await r.addresses.get(id).catch(() => undefined) : undefined;
  return { address: a, vista: await direccionVista(r, a, todas) };
}

function empresaBase(c: Client, dir: DireccionVista, ctx: Contexto) {
  const [statusLabel, statusTone] = ESTADOS[c.status];
  return {
    ...dir,
    country: c.addressId ? dir.country : c.taxIdType === 'nif' || c.taxIdType === 'nie' ? 'España' : 'Otro',
    id: c.id,
    cif: c.taxId ?? '',
    name: c.legalName,
    tradeName: c.tradeName ?? '',
    status: c.status,
    statusLabel,
    statusTone,
    owner: nombreDe(ctx.cat.responsables, c.ownerUserId) || 'Sin responsable',
    ownerUserId: c.ownerUserId ?? '',
    email: c.email ?? '',
    phone: c.phone ?? '',
    sector: sectorDe(ctx.cat, c.sectorCode),
    sectorCode: c.sectorCode ?? '',
    notes: c.observations ?? '',
    lastActivity: `Actualizada: ${haceCuanto(c.updatedAt).toLowerCase()}`,
    createdAt: c.createdAt.slice(0, 10),
    branchId: c.branchId,
    defaultAgreementId: c.defaultAgreementId ?? '',
    defaultAgreement: nombreDe(ctx.cat.convenios, c.defaultAgreementId),
    deletedAt: c.deletedAt ? fechaCorta(c.deletedAt) : undefined,
  };
}

function contactoVista(c: ClientContact, portal: Record<string, ContactPortalAccess> | null): ContactoVista {
  const p = portal?.[c.id];
  return {
    id: c.id,
    name: c.name,
    email: c.email ?? '',
    phone: c.phone ?? c.mobile ?? '',
    role: c.position ?? '',
    types: etiquetasContacto(c),
    isMain: c.isMain,
    isQuoteRecipient: c.isQuoteRecipient,
    notes: c.notes ?? '',
    suspendido: !!c.suspended,
    portal: p ? { activo: p.active, desde: p.since, invitado: p.invitedAt, ultimoAcceso: p.lastAccess, permisos: p.permissions } : undefined,
  };
}

function facturacionVista(b: ClientBilling | null, cat: Catalogos): FacturacionVista {
  const nombre = (tipo: 'payment_method' | 'vat_special_cause', id: string | null | undefined) => cat.items[tipo].find((i) => i.id === id)?.name ?? '';
  return {
    paymentMethod: nombre('payment_method', b?.paymentMethodId),
    fixedPayDays: b ? textoDiasPago(b.fixedPaymentDays) : '',
    vatRegime: !b ? '' : b.equivalenceSurcharge ? IVA_RECARGO : nombre('vat_special_cause', b.vatSpecialCauseId) || IVA_GENERAL,
    facturaDetalle: DISENO_FACTURA[b?.invoiceLayout ?? 'by_person'] ?? 'persona',
    tieneIban: !!b?.iban,
    riskLimit: b?.riskLimit ? euros(b.riskLimit) : '',
    isComplete: !!b?.paymentMethodId && !!b.iban,
  };
}

function documentoVista(d: StoredDocument): DocumentoVista {
  return {
    id: d.id,
    nombre: d.name,
    tipo: d.typeName,
    subidoPor: d.uploadedByName ?? '',
    fecha: fechaCorta(d.uploadedAt),
    tamano: tamanoLegible(d.sizeBytes),
    estado: ESTADOS_DOC[d.status],
    paginas: null,
    caduca: d.expiresOn ? fechaCorta(d.expiresOn) : '',
    visibleCliente: d.visibleInPortal,
    notas: d.notes ?? '',
    conservar: d.retentionRequired,
    esImagen: d.mimeType.startsWith('image/'),
    esPdf: d.mimeType === 'application/pdf',
  };
}

type Ficha = {
  empresa: EmpresaVista;
  client: Client;
  address: Address | undefined;
  contactos: ClientContact[];
  centros: { centro: ClientCenter; address: Address | undefined }[];
  billing: ClientBilling | null;
  portalDisponible: boolean;
};

async function cargarFicha(r: Repositories, id: string, ctx: Contexto): Promise<Ficha> {
  const [client, contactos, centros, billing, actividad, documentos, portal] = await Promise.all([
    r.clients.get(id),
    r.clientContacts.list({ clientId: id, limit: 200 }).then((p) => p.data),
    r.clientCenters.list({ clientId: id, limit: 200 }).then((p) => p.data),
    // Sin datos de facturación (404) o sin permiso para verlos: la pestaña sale vacía.
    r.clients.billing(id).then((b) => b.billing, () => null),
    r.activity.list({ entityType: 'client', entityId: id, includeChildren: true, limit: 50 }).then((p) => p.data, () => []),
    r.documents.list({ entityType: 'client', entityId: id, limit: 200 }).then((p) => p.data, () => []),
    r.portalAccess.list(id).catch(() => null),
  ]);
  const [dir, ...dirCentros] = await Promise.all([
    direccion(r, client.addressId, ctx.provincias),
    ...centros.map((c) => direccion(r, c.addressId, ctx.provincias)),
  ]);
  const vistaCentros: CentroVista[] = centros.map((c, i) => {
    const efectivo = c.effectiveClientAgreementId ?? c.clientAgreementId ?? client.defaultAgreementId;
    return {
      ...dirCentros[i].vista,
      id: c.id,
      name: c.name,
      notes: c.accessInstructions ?? c.notes ?? '',
      laborAgreement: nombreDe(ctx.cat.convenios, efectivo),
      laborAgreementId: c.clientAgreementId ?? '',
      heredado: !c.clientAgreementId && !!efectivo,
      suspendido: c.blocked,
    };
  });
  const empresa: EmpresaVista = {
    ...empresaBase(client, dir.vista, ctx),
    ...preparacion(contactos, centros, billing),
    contacts: contactos.map((c) => contactoVista(c, portal)),
    centers: vistaCentros,
    billing: facturacionVista(billing, ctx.cat),
    activity: actividad.map((a) => ({
      id: a.id,
      date: fechaHora(a.occurredAt),
      user: a.actorName ?? 'Sistema',
      action: a.summary,
      type: a.entityType,
    })),
    documentos: documentos.map(documentoVista),
  };
  return {
    empresa,
    client,
    address: dir.address,
    contactos,
    centros: centros.map((centro, i) => ({ centro, address: dirCentros[i].address })),
    billing,
    portalDisponible: portal !== null,
  };
}

/** Fila de la lista: el cliente y, para la preparación y el contacto principal, sus contactos, centros y facturación. */
async function cargarFila(r: Repositories, c: Client, ctx: Contexto): Promise<EmpresaVista> {
  const vacia = { address: '', postalCode: '', city: '', province: '', country: 'España' };
  if (c.deletedAt) {
    return { ...empresaBase(c, vacia, ctx), ...preparacion(null, null, null), contacts: [], centers: [], billing: facturacionVista(null, ctx.cat), activity: [], documentos: [] };
  }
  // Con el resumen de la lista (readiness) basta el contacto principal (el primero); con una API sin
  // resumen, la preparación sale de los contactos, centros y facturación de la fila.
  const resumen = c.readiness;
  const [contactos, centros, billing, dir] = await Promise.all([
    r.clientContacts.list({ clientId: c.id, limit: resumen ? 1 : 50 }).then((p) => p.data, () => []),
    resumen ? null : r.clientCenters.list({ clientId: c.id, limit: 50 }).then((p) => p.data, () => []),
    resumen ? null : r.clients.billing(c.id).then((b) => b.billing, () => null),
    direccion(r, c.addressId, ctx.provincias),
  ]);
  return {
    ...empresaBase(c, dir.vista, ctx),
    ...(resumen ? preparacionResumen(resumen) : preparacion(contactos, centros ?? [], billing)),
    contacts: contactos.slice(0, 1).map((x) => contactoVista(x, null)),
    centers: [],
    billing: facturacionVista(billing, ctx.cat),
    activity: [],
    documentos: [],
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------


type Filtros = {
  busqueda: string;
  eliminadas: boolean;
  pagina: number;
  /** Empresa abierta en la ficha (null: ninguna). */
  seleccionada: string | null;
};

export type DatosEmpresa = {
  name: string;
  cif: string;
  country: string;
  email: string;
  phone: string;
  owner: string;
  tradeName: string;
  address: string;
  postalCode: string;
  city: string;
  province: string;
  sector: string;
  defaultAgreementId: string;
  notes: string;
  borrador?: boolean;
};
export type DatosContacto = {
  id?: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isMain: boolean;
  isQuoteRecipient: boolean;
  types: string[];
  notes: string;
};
export type DatosCentro = {
  id?: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  laborAgreementId: string;
  notes: string;
};
export type ArchivoSubida = {
  id: string;
  archivo: File;
  nombre: string;
  tipo: string;
  caduca: string;
  visible: 'interno' | 'cliente';
  notas: string;
};

/** El valor, cuando lleva `ms` sin cambiar (para no buscar en el servidor a cada letra). */
function useSinPrisa<T>(valor: T, ms = 250) {
  const [actual, setActual] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setActual(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return actual;
}

export function useEmpresas({ busqueda: escrita, eliminadas, pagina, seleccionada }: Filtros) {
  const { me, sucursal } = useSesion();
  const busqueda = useSinPrisa(escrita.trim());

  const catalogos = useData(cargarCatalogos, []);
  const provs = useData(() => provincias().catch(() => [] as Province[]), []);
  const listo = !!catalogos.data && !!provs.data;
  const ctx = useMemo<Contexto>(() => ({ cat: catalogos.data ?? VACIO, provincias: provs.data ?? [] }), [catalogos.data, provs.data]);

  // Lista: búsqueda, sucursal y página en el servidor.
  const listaData = useData(
    async (r) => {
      if (!listo) return null;
      const p = await r.clients.list({
        q: busqueda || undefined,
        branchId: sucursal ?? undefined,
        deleted: eliminadas || undefined,
        limit: POR_PAGINA,
        offset: pagina * POR_PAGINA,
      });
      const filas = eliminadas ? p.data.filter(eliminado) : p.data;
      return { total: eliminadas ? filas.length + p.pagination.offset : p.pagination.total, empresas: await Promise.all(filas.map((c) => cargarFila(r, c, ctx))) };
    },
    [listo, busqueda, sucursal, eliminadas, pagina, ctx],
  );

  const fichaData = useData((r) => (listo && seleccionada ? cargarFicha(r, seleccionada, ctx) : Promise.resolve(null)), [listo, seleccionada, ctx]);
  const ficha = fichaData.data ?? null;

  const recargar = useCallback(() => {
    listaData.reload();
    fichaData.reload();
  }, [listaData.reload, fichaData.reload]);

  // Opciones de las tablas maestras dadas de alta desde un desplegable («+ Añadir»): el desplegable elige la
  // opción nueva antes de que la API la devuelva, así que se guarda la promesa por nombre.
  const pendientes = useRef(new Map<string, Promise<CatalogItem>>());
  const anadirOpcion = useCallback(
    (tipo: 'payment_method' | 'vat_special_cause' | 'document_type', nombre: string) => {
      const clave = `${tipo}:${nombre.toLowerCase()}`;
      const p = repos.catalogItems.create({ type: tipo, name: nombre }).finally(() => catalogos.reload());
      pendientes.current.set(clave, p);
      return p;
    },
    [catalogos.reload],
  );
  const idOpcion = useCallback(
    async (tipo: CatalogItemType & ('payment_method' | 'vat_special_cause' | 'document_type'), nombre: string) => {
      if (!nombre) return null;
      const existente = ctx.cat.items[tipo].find((i) => i.name.toLowerCase() === nombre.toLowerCase());
      if (existente) return existente.id;
      const pendiente = pendientes.current.get(`${tipo}:${nombre.toLowerCase()}`);
      if (pendiente) return (await pendiente).id;
      throw new ApiError(400, 'validacion', `«${nombre}» no está en la lista`);
    },
    [ctx],
  );

  // --- Empresa --------------------------------------------------------------

  /** Sucursal y sociedad de una empresa nueva: la elegida en la cabecera o la primera que ve el usuario. */
  const sucursalNueva = () => {
    const b = me?.branches.find((x) => x.id === sucursal) ?? me?.branches[0];
    if (!b) throw new ApiError(403, 'sin_sucursal', 'No tienes ninguna sucursal asignada: no puedes dar de alta empresas');
    return b;
  };

  async function siguienteCodigo(intento: number) {
    const { pagination } = await repos.clients.list({ limit: 1 });
    return `CLI-${String(pagination.total + 1 + intento).padStart(3, '0')}`;
  }

  /** Crea o actualiza la empresa. Devuelve su id. */
  const guardarEmpresa = async (d: DatosEmpresa, esEdicion: boolean): Promise<string> => {
    const pais = codigoPais(d.country);
    const datos = {
      legalName: d.name.trim(),
      tradeName: d.tradeName.trim() && d.tradeName.trim() !== d.name.trim() ? d.tradeName.trim() : null,
      taxId: vacioANull(d.cif),
      taxIdType: (pais === 'ES' ? 'nif' : d.country === 'Otro' ? 'other' : 'vat_eu') as Client['taxIdType'],
      email: vacioANull(d.email),
      phone: vacioANull(d.phone),
      ownerUserId: d.owner || null,
      sectorCode: d.sector || null,
      defaultAgreementId: d.defaultAgreementId || null,
      observations: vacioANull(d.notes),
    };
    const dir = { address: d.address, postalCode: d.postalCode, city: d.city, province: d.province, country: d.country };

    if (esEdicion && ficha) {
      const addressId = await guardarDireccion(ficha.address, dir);
      try {
        await repos.clients.update(ficha.client.id, { ...datos, addressId });
      } catch (e) {
        await quitarDireccionNueva(addressId, ficha.client.addressId);
        throw e;
      }
      recargar();
      return ficha.client.id;
    }

    const b = sucursalNueva();
    const addressId = await guardarDireccion(undefined, dir);
    try {
      for (let intento = 0; ; intento++) {
        try {
          const creada = await repos.clients.create({
            ...datos,
            companyId: b.companyId,
            branchId: b.id,
            code: await siguienteCodigo(intento),
            addressId,
            status: d.borrador ? 'prospect' : 'active',
          });
          recargar();
          return creada.id;
        } catch (e) {
          // Si otro ha cogido el mismo código, se prueba con el siguiente.
          if (!(esError(e, 'conflicto') && /código/i.test((e as ApiError).message)) || intento >= 4) throw e;
        }
      }
    } catch (e) {
      await quitarDireccionNueva(addressId, null);
      throw e;
    }
  };

  /** Busca otra empresa con el mismo CIF (aviso de duplicado en el alta). */
  const comprobarCif = async (cif: string): Promise<string | null> => {
    const limpio = cif.replace(/[\s.\-/]/g, '').toUpperCase();
    if (limpio.length < 8) return null;
    const { data } = await repos.clients.list({ q: limpio, limit: 5 }).catch(() => ({ data: [] as Client[] }));
    const otra = data.find((c) => c.taxId === limpio && c.id !== seleccionada);
    return otra ? otra.legalName : null;
  };

  // --- Contactos ------------------------------------------------------------

  const guardarContacto = async (d: DatosContacto) => {
    if (!ficha) return;
    const datos = {
      name: d.name.trim(),
      email: vacioANull(d.email),
      phone: vacioANull(d.phone),
      position: vacioANull(d.role),
      isMain: d.isMain,
      isQuoteRecipient: d.isQuoteRecipient,
      notes: vacioANull(d.notes),
      ...rolesDeEtiquetas(d.types),
    };
    // Solo hay un contacto principal: si se marca otro, el anterior deja de serlo.
    const anterior = d.isMain ? ficha.contactos.find((c) => c.isMain && c.id !== d.id) : undefined;
    if (anterior) await repos.clientContacts.update(anterior.id, { isMain: false });
    try {
      if (d.id) await repos.clientContacts.update(d.id, datos);
      else await repos.clientContacts.create({ ...datos, clientId: ficha.client.id });
    } catch (e) {
      if (anterior) await repos.clientContacts.update(anterior.id, { isMain: true }).catch(() => {});
      throw e;
    } finally {
      recargar();
    }
  };

  // --- Centros --------------------------------------------------------------

  const guardarCentro = async (d: DatosCentro) => {
    if (!ficha) return;
    const actual = d.id ? ficha.centros.find((c) => c.centro.id === d.id) : undefined;
    const addressId = await guardarDireccion(actual?.address, { address: d.address, postalCode: d.postalCode, city: d.city, province: '', country: d.country });
    const datos = { name: d.name.trim(), addressId, clientAgreementId: d.laborAgreementId || null, accessInstructions: vacioANull(d.notes) };
    try {
      if (actual) {
        await repos.clientCenters.update(actual.centro.id, datos);
      } else {
        const codigos = ficha.centros.map((c) => Number(c.centro.code.replace(/\D/g, '')) || 0);
        const code = `CT-${String(Math.max(0, ...codigos) + 1).padStart(2, '0')}`;
        await repos.clientCenters.create({ ...datos, clientId: ficha.client.id, branchId: ficha.client.branchId, code });
      }
    } catch (e) {
      await quitarDireccionNueva(addressId, actual?.centro.addressId);
      throw e;
    } finally {
      recargar();
    }
  };

  // --- Suspender, eliminar y recuperar ------------------------------------------

  /** Suspende o reactiva un contacto, desactiva o reactiva un centro. Devuelve el estado nuevo. */
  const alternarSuspension = async (tipo: 'contacto' | 'centro', item: { id: string; suspendido: boolean }) => {
    const suspendido = !item.suspendido;
    if (tipo === 'contacto') await repos.clientContacts.update(item.id, { suspended: suspendido });
    else await repos.clientCenters.update(item.id, { blocked: suspendido });
    recargar();
    return suspendido;
  };

  const darDeBaja = async (id: string) => {
    await repos.clients.update(id, { status: 'inactive' });
    recargar();
  };

  const repo = (tipo: TipoElemento) =>
    ({ empresa: repos.clients, contacto: repos.clientContacts, centro: repos.clientCenters, documento: repos.documents })[tipo];

  /** Baja lógica. Si ya se ha usado, lanza ApiError `en_uso` (o `conservacion_obligatoria`) con el motivo. */
  const eliminar = async (tipo: TipoElemento, id: string) => {
    await repo(tipo).remove(id);
    recargar();
  };

  const restaurar = async (tipo: TipoElemento, id: string) => {
    await repo(tipo).restore(id);
    recargar();
  };

  /**
   * Lo eliminado de la empresa abierta (contactos, centros o documentos). Solo lo que trae deletedAt: una API
   * sin bajas recuperables ignora ?deleted=true y devolvería los activos.
   */
  const eliminados = async (tipo: 'contacto' | 'centro' | 'documento'): Promise<EliminadoVista[]> => {
    if (!ficha) return [];
    const id = ficha.client.id;
    const fecha = (x: { deletedAt?: string | null }) => (x.deletedAt ? `Eliminado el ${fechaCorta(x.deletedAt)}` : '');
    if (tipo === 'contacto') {
      const { data } = await repos.clientContacts.list({ clientId: id, deleted: true, limit: 200 });
      return data.filter(eliminado).map((c) => ({ id: c.id, nombre: c.name, detalle: c.position ?? c.email ?? '', fecha: fecha(c) }));
    }
    if (tipo === 'centro') {
      const { data } = await repos.clientCenters.list({ clientId: id, deleted: true, limit: 200 });
      return data.filter(eliminado).map((c) => ({ id: c.id, nombre: c.name, detalle: c.code, fecha: fecha(c) }));
    }
    const { data } = await repos.documents.list({ entityType: 'client', entityId: id, deleted: true, limit: 200 });
    return data.filter(eliminado).map((d) => ({ id: d.id, nombre: d.name, detalle: d.typeName, fecha: fecha(d) }));
  };

  // --- Facturación ------------------------------------------------------------

  const actualizarFacturacion = async (campo: 'paymentMethod' | 'fixedPayDays' | 'vatRegime' | 'facturaDetalle', valor: string) => {
    if (!ficha) return;
    const datos =
      campo === 'paymentMethod'
        ? { paymentMethodId: await idOpcion('payment_method', valor) }
        : campo === 'vatRegime'
          ? valor === IVA_GENERAL || valor === IVA_RECARGO
            ? { vatSpecialCauseId: null, equivalenceSurcharge: valor === IVA_RECARGO }
            : { vatSpecialCauseId: await idOpcion('vat_special_cause', valor), equivalenceSurcharge: false }
          : campo === 'fixedPayDays'
            ? { fixedPaymentDays: diasDeTexto(valor) }
            : { invoiceLayout: (valor === 'persona' ? 'by_person' : 'by_concept') as InvoiceLayout };
    try {
      const { warnings } = await repos.clients.saveBilling(ficha.client.id, datos);
      return warnings;
    } finally {
      recargar();
    }
  };

  // --- Documentos -------------------------------------------------------------

  /** Sube los archivos uno a uno. Devuelve los que han fallado, con el motivo. */
  const subirDocumentos = async (archivos: ArchivoSubida[], alAvanzar: (porcentaje: number) => void) => {
    if (!ficha) return [];
    const fallos: { id: string; error: string }[] = [];
    for (const [i, a] of archivos.entries()) {
      try {
        const typeId = await idOpcion('document_type', a.tipo);
        await repos.documents.upload({
          entityType: 'client',
          entityId: ficha.client.id,
          file: a.archivo,
          typeId: typeId!,
          name: a.nombre,
          expiresOn: a.caduca || null,
          visibleInPortal: a.visible === 'cliente',
          notes: vacioANull(a.notas),
        });
      } catch (e) {
        fallos.push({ id: a.id, error: mensajeError(e) });
      }
      alAvanzar(Math.round(((i + 1) / archivos.length) * 100));
    }
    recargar();
    return fallos;
  };

  /** URL temporal del fichero (null en la demo para los documentos de ejemplo). */
  const urlDocumento = (id: string) => repos.documents.downloadUrl(id);

  // --- Área de empresas (pendiente de API) -------------------------------------

  const guardarAccesoPortal = async (contactId: string, permisos: string[]) => {
    await repos.portalAccess.save(contactId, permisos);
    recargar();
  };
  const quitarAccesoPortal = async (contactId: string) => {
    await repos.portalAccess.revoke(contactId);
    recargar();
  };

  // --- Resultado ----------------------------------------------------------------

  const cat = ctx.cat;
  const nombres = (tipo: 'payment_method' | 'vat_special_cause' | 'document_type') => cat.items[tipo].map((i) => i.name);
  const errorLista = catalogos.error ?? listaData.error;
  const total = listaData.data?.total ?? 0;

  return {
    lista: {
      estado: errorLista ? 'error' : !listaData.data ? 'cargando' : 'listo',
      error: errorLista ? mensajeError(errorLista) : undefined,
      cargando: listaData.loading,
      reintentar: () => (catalogos.error ? catalogos.reload() : listaData.reload()),
      empresas: listaData.data?.empresas ?? [],
      total,
      desde: total ? pagina * POR_PAGINA + 1 : 0,
      hasta: Math.min(total, (pagina + 1) * POR_PAGINA),
      paginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
    },
    ficha: {
      estado: fichaData.error ? 'error' : !ficha || ficha.empresa.id !== seleccionada ? 'cargando' : 'listo',
      error: fichaData.error ? mensajeError(fichaData.error) : undefined,
      reintentar: fichaData.reload,
      empresa: ficha?.empresa ?? null,
      portalDisponible: ficha?.portalDisponible ?? false,
    },
    catalogos: {
      responsables: cat.responsables,
      sectores: cat.sectores,
      convenios: cat.convenios,
      formasPago: nombres('payment_method'),
      diasPago: DIAS_PAGO.map(textoDiasPago),
      regimenesIva: [IVA_GENERAL, ...nombres('vat_special_cause'), IVA_RECARGO],
      tiposDocumento: nombres('document_type'),
      anadirOpcion,
      /** Usuario de la sesión: responsable por defecto de las empresas nuevas. */
      yo: me?.user.id ?? '',
    },
    guardarEmpresa,
    comprobarCif,
    guardarContacto,
    guardarCentro,
    alternarSuspension,
    darDeBaja,
    eliminar,
    restaurar,
    eliminados,
    actualizarFacturacion,
    subirDocumentos,
    urlDocumento,
    guardarAccesoPortal,
    quitarAccesoPortal,
  };
}
