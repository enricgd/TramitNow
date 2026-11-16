// Datos de Presupuestos (PresupuestosView.jsx): listado, ficha, guardado, cambios de estado, versiones, obsoleto,
// aprobación del margen, documentos y catálogos. La vista solo recibe datos en su forma (mapeo.ts) y funciones.
//
// - Listado: el servidor filtra por la sucursal de la cabecera; la búsqueda y los filtros de la vista se aplican en
//   el navegador (la lista de presupuestos de una sucursal es corta).
// - Costes: los calcula el servidor (cada presupuesto trae su desglose). Mientras se edita, la vista previa usa el
//   módulo de cálculo (mapeo.ts → economiaPuesto).
// - PROVISIONAL: la forma de la API sale de la propuesta de la web hasta que llegue el contrato de la fase 4.
import { useCallback, useMemo, useState } from 'react';
import {
  ApiError,
  repos,
  useData,
  type CatalogItem,
  type Client,
  type ClientContact,
  type CollectiveAgreement,
  type Membership,
  type ProfessionalCategory,
  type QuoteStatus,
  type Repositories,
  type TenantSettings,
} from '../../data';
import { useSesion } from '../../sesion';
import { esError, fechaHora, mensajeError, vacioANull } from '../comun/datos';
import { estadoApi, filaVista, presupuestoApi, presupuestoVista, type PresupuestoVista } from './mapeo';

export { mensajeError };
export { economiaPuesto } from './mapeo';

type Catalogos = {
  convenios: CollectiveAgreement[];
  categorias: ProfessionalCategory[];
  formasPago: CatalogItem[];
  motivosRechazo: CatalogItem[];
  tiposDocumento: CatalogItem[];
  empresas: Client[];
  contactos: ClientContact[];
  comerciales: Membership[];
  ajustes: TenantSettings;
};

async function cargarCatalogos(r: Repositories, sucursal: string | null): Promise<Catalogos> {
  const tabla = (type: string) => r.catalogItems.list({ type, status: 'active', limit: 200 }).then((p) => p.data);
  const [convenios, categorias, formasPago, motivosRechazo, tiposDocumento, empresas, contactos, comerciales, ajustes] = await Promise.all([
    r.collectiveAgreements.list({ status: 'active', limit: 200 }).then((p) => p.data),
    r.professionalCategories.list({ status: 'active', limit: 200 }).then((p) => p.data),
    tabla('payment_method'),
    tabla('quote_rejection_reason'),
    tabla('document_type'),
    r.clients.list({ branchId: sucursal ?? undefined, limit: 200 }).then((p) => p.data),
    r.clientContacts.list({ limit: 200 }).then((p) => p.data),
    // Ver los usuarios necesita users.manage: sin él, el comercial es quien está en la sesión.
    r.memberships.list({ status: 'active', limit: 200 }).then((p) => p.data, () => [] as Membership[]),
    r.tenantSettings.get(),
  ]);
  return { convenios, categorias, formasPago, motivosRechazo, tiposDocumento, empresas, contactos, comerciales, ajustes };
}

const MOTIVOS_RECHAZO = ['Precio', 'Plazo de incorporación', 'Eligió a la competencia', 'Cancela el proyecto', 'Sin respuesta del cliente'];

export function usePresupuestos() {
  const { me, sucursal } = useSesion();
  const cat = useData((r) => cargarCatalogos(r, sucursal), [sucursal]);
  const lista = useData((r) => r.quotes.list({ branchId: sucursal ?? undefined, limit: 200 }).then((p) => p.data), [sucursal]);
  const [motivosNuevos, setMotivosNuevos] = useState<string[]>([]);

  const c = cat.data;
  const recargarLista = lista.reload;

  // ---- Nombres e ids -------------------------------------------------------

  const comerciales = useMemo(() => {
    const desdeUsuarios = (c?.comerciales ?? []).map((m) => ({ id: m.userId, nombre: m.fullName }));
    const yo = me ? [{ id: me.user.id, nombre: me.user.fullName }] : [];
    return [...new Map([...desdeUsuarios, ...yo].map((x) => [x.id, x])).values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [c, me]);
  const nombres = useMemo(
    () => ({
      comercial: (userId: string | null) => comerciales.find((x) => x.id === userId)?.nombre ?? '',
      formaPago: (id: string | null) => c?.formasPago.find((x) => x.id === id)?.name ?? '',
    }),
    [comerciales, c],
  );
  const ids = useMemo(() => ({ comercial: (nombre: string) => comerciales.find((x) => x.nombre === nombre)?.id ?? null }), [comerciales]);

  const vista = useCallback((q: Parameters<typeof presupuestoVista>[0]) => presupuestoVista(q, nombres), [nombres]);

  // ---- Catálogos en la forma de la vista ------------------------------------

  const catalogos = useMemo(() => {
    if (!c) return undefined;
    const etiquetaCategoria = (x: ProfessionalCategory) => (x.agreementLevel ? `${x.name} (nivel ${x.agreementLevel})` : x.name);
    const categorias: Record<string, { id: string; label: string }[]> = {};
    for (const x of c.categorias) if (x.agreementId) (categorias[x.agreementId] ??= []).push({ id: x.id, label: etiquetaCategoria(x) });
    for (const k of Object.keys(categorias)) categorias[k].push({ id: 'otro', label: 'Otro / Personalizado...' });
    return {
      convenios: [...c.convenios.map((a) => ({ id: a.id, label: a.name })), { id: 'otro', label: 'Otro / Personalizado...' }],
      categorias,
      formasPago: [...c.formasPago.map((f) => ({ id: f.id, label: f.name })), { id: 'otro', label: 'Otro / Personalizado...' }],
      comerciales: comerciales.map((x) => x.nombre),
      motivosRechazo: [...new Set([...(c.motivosRechazo.length ? c.motivosRechazo.map((m) => m.name) : MOTIVOS_RECHAZO), ...motivosNuevos])],
      empresas: c.empresas.map((e) => ({
        id: e.id,
        nombre: e.legalName,
        cif: e.taxId ?? '',
        sector: e.activity ?? '',
        ciudad: '',
        convenio: e.defaultAgreementId ?? '',
        comercial: comerciales.find((x) => x.id === e.ownerUserId)?.nombre ?? '',
        // Empresa en borrador (alta rápida): hay que completar su ficha antes de las peticiones.
        nueva: e.status === 'prospect',
        contactos: c.contactos
          .filter((x) => x.clientId === e.id && !x.suspended)
          .sort((a, b) => Number(b.isQuoteRecipient) - Number(a.isQuoteRecipient) || Number(b.isMain) - Number(a.isMain))
          .map((x) => ({ id: x.id, nombre: x.name, cargo: x.position ?? '', email: x.email ?? '', telefono: x.phone ?? x.mobile ?? '' })),
      })),
      /** Margen mínimo que pide aprobación (null: sin mínimo) y días sin respuesta para avisar. */
      margenMinimo: c.ajustes.quoteMinMarginPercent,
      diasRecordatorio: c.ajustes.quoteNoResponseDays,
    };
  }, [c, comerciales, motivosNuevos]);

  const listado = useMemo(() => (lista.data ?? []).map(filaVista), [lista.data]);

  // ---- Ficha ---------------------------------------------------------------

  /** La ficha completa de un presupuesto: datos, historial, documentos añadidos y versiones anteriores. */
  const abrir = useCallback(
    async (quoteId: string) => {
      const [q, actividad, documentos, versiones] = await Promise.all([
        repos.quotes.get(quoteId),
        repos.activity.list({ entityType: 'quote', entityId: quoteId, limit: 100 }).then((p) => p.data, () => []),
        repos.documents.list({ entityType: 'quote', entityId: quoteId, limit: 100 }).then((p) => p.data, () => []),
        repos.quotes.versions(quoteId),
      ]);
      const v = vista(q);
      v.auditoria = actividad.map((a) => ({ id: a.id, fecha: fechaHora(a.occurredAt), usuario: a.actorName ?? '—', accion: a.summary, detalle: '' }));
      v.documentosAnadidos = documentos.map((d) => ({
        id: d.id, tipo: d.typeName, nombre: d.name, archivo: d.name, interno: !d.visibleInPortal, fecha: d.uploadedAt.slice(0, 10), autor: d.uploadedByName ?? '—',
      }));
      const anteriores = await Promise.all(
        versiones
          .filter((x) => x.status === 'superseded')
          .map(async (x) => ({
            codigo: `${q.code}-v${x.number}`,
            fecha: x.createdAt.slice(0, 10),
            autor: x.createdBy ?? '—',
            estado: 'Sustituido',
            comentario: x.comment ?? '',
            datos: { ...vista(await repos.quotes.version(quoteId, x.id)), estado: 'Sustituido' },
          })),
      );
      return { presupuesto: v, versiones: anteriores };
    },
    [vista],
  );

  // ---- Guardar y estados ---------------------------------------------------

  const guardar = useCallback(
    async (v: PresupuestoVista, estado: string) => {
      const datos = presupuestoApi(v, ids);
      let q = v._id ? await repos.quotes.update(v._id, datos) : await repos.quotes.create(datos);
      const destino = estadoApi(estado);
      if (destino !== q.status && (destino === 'draft' || destino === 'in_preparation')) q = await repos.quotes.setStatus(q.id, destino);
      recargarLista();
      return vista(q);
    },
    [ids, vista, recargarLista],
  );

  /** Cambia el estado desde el pipeline o la cabecera. Aceptar y rechazar tienen su función. */
  const cambiarEstado = useCallback(
    async (quoteId: string, estado: string) => {
      const s = estadoApi(estado);
      const q =
        s === 'accepted'
          ? await repos.quotes.accept(quoteId)
          : await repos.quotes.setStatus(quoteId, s as 'draft' | 'in_preparation' | 'sent' | 'pending_signature');
      recargarLista();
      return vista(q);
    },
    [vista, recargarLista],
  );

  const rechazar = useCallback(
    async (quoteId: string, motivo: string, notas: string) => {
      const reasonId = c?.motivosRechazo.find((m) => m.name === motivo)?.id ?? null;
      const q = await repos.quotes.reject(quoteId, { reasonId, reason: motivo, notes: vacioANull(notas) });
      recargarLista();
      return vista(q);
    },
    [c, vista, recargarLista],
  );

  /** Motivo de rechazo nuevo: a la tabla maestra (en real) y a la lista de la pantalla. */
  const anadirMotivoRechazo = useCallback(async (nombre: string) => {
    setMotivosNuevos((m) => [...m, nombre]);
    await repos.catalogItems.create({ type: 'quote_rejection_reason', name: nombre }).catch(() => {});
  }, []);

  const enviar = useCallback(
    async (quoteId: string) => {
      const q = await repos.quotes.send(quoteId);
      recargarLista();
      return vista(q);
    },
    [vista, recargarLista],
  );

  const pedirAprobacion = useCallback(async (quoteId: string, motivo: string) => vista(await repos.quotes.requestApproval(quoteId, motivo || null)), [vista]);
  const resolverAprobacion = useCallback(async (quoteId: string, aprobada: boolean) => vista(await repos.quotes.resolveApproval(quoteId, aprobada)), [vista]);

  const nuevaVersion = useCallback(
    async (quoteId: string) => {
      await repos.quotes.newVersion(quoteId);
      recargarLista();
      return abrir(quoteId);
    },
    [abrir, recargarLista],
  );

  const pasarAObsoleto = useCallback(
    async (quoteId: string, motivo: string) => {
      const { created } = await repos.quotes.makeObsolete(quoteId, motivo);
      recargarLista();
      return vista(created);
    },
    [vista, recargarLista],
  );

  const duplicar = useCallback(
    async (quoteId: string) => {
      const q = await repos.quotes.duplicate(quoteId);
      recargarLista();
      return vista(q);
    },
    [vista, recargarLista],
  );

  // ---- Documentos ----------------------------------------------------------

  /** Abre el PDF de la propuesta o el escandallo interno generados en el servidor. false si no hay (demo). */
  const abrirDocumento = useCallback(async (quoteId: string, tipo: 'propuesta' | 'escandallo') => {
    const url = await repos.quotes.documentUrl(quoteId, tipo === 'propuesta' ? 'proposal' : 'cost_sheet');
    if (url) window.open(url, '_blank', 'noopener');
    return !!url;
  }, []);

  /** Sube un documento añadido a mano. El tipo se busca (o se crea) en la tabla maestra de tipos de documento. */
  const anadirDocumento = useCallback(
    async (quoteId: string, d: { tipo: string; nombre: string; archivo: File; interno: boolean }) => {
      let tipo = c?.tiposDocumento.find((t) => t.name === d.tipo);
      if (!tipo) {
        tipo = await repos.catalogItems.create({ type: 'document_type', name: d.tipo });
        cat.reload();
      }
      await repos.documents.upload({
        entityType: 'quote', entityId: quoteId, typeId: tipo.id, name: d.nombre.trim() || d.archivo.name, file: d.archivo,
        visibleInPortal: !d.interno,
      });
    },
    [c, cat],
  );
  const quitarDocumento = useCallback(async (documentId: string) => repos.documents.remove(documentId), []);
  const descargarDocumento = useCallback(async (documentId: string) => {
    const url = await repos.documents.downloadUrl(documentId);
    if (url) window.open(url, '_blank', 'noopener');
    return !!url;
  }, []);

  // ---- Convenio y empresa nueva ----------------------------------------------

  /** Tabla salarial del convenio para la categoría y el nivel del puesto (null si no hay). */
  const salarioConvenio = useCallback(
    (agreementId: string, categoryId: string, level: string) =>
      agreementId && agreementId !== 'otro'
        ? repos.quotes.agreementSalary({ agreementId, categoryId: categoryId && categoryId !== 'otro' ? categoryId : null, level: level && level !== 'otro' ? level : null })
        : Promise.resolve(null),
    [],
  );

  /**
   * Alta rápida desde el presupuesto: la empresa en borrador (prospect) con lo mínimo y su contacto como destinatario
   * de presupuestos. Devuelve la empresa en la forma de la pestaña Empresa.
   */
  const altaRapidaEmpresa = useCallback(
    async (d: { nombre: string; cif: string; sector: string; ciudad: string; convenio: string; contacto: { nombre: string; cargo: string; email: string; telefono: string } }) => {
      const b = me?.branches.find((x) => x.id === sucursal) ?? me?.branches[0];
      if (!b) throw new ApiError(403, 'sin_sucursal', 'No tienes ninguna sucursal asignada: no puedes dar de alta empresas');
      let empresa: Client | undefined;
      for (let intento = 0; !empresa; intento++) {
        const { pagination } = await repos.clients.list({ limit: 1 });
        try {
          empresa = await repos.clients.create({
            legalName: d.nombre.trim(), taxId: vacioANull(d.cif), taxIdType: 'nif', companyId: b.companyId, branchId: b.id,
            code: `CLI-${String(pagination.total + 1 + intento).padStart(3, '0')}`, status: 'prospect', activity: vacioANull(d.sector),
            defaultAgreementId: d.convenio && d.convenio !== 'otro' ? d.convenio : null, ownerUserId: me?.user.id ?? null,
            observations: vacioANull(d.ciudad ? `Población: ${d.ciudad}. Alta rápida desde Presupuestos.` : 'Alta rápida desde Presupuestos.'),
          });
        } catch (e) {
          if (!(esError(e, 'conflicto') && /código/i.test((e as ApiError).message)) || intento >= 4) throw e;
        }
      }
      const contacto = await repos.clientContacts.create({
        clientId: empresa.id, name: d.contacto.nombre.trim(), position: vacioANull(d.contacto.cargo), email: vacioANull(d.contacto.email),
        phone: vacioANull(d.contacto.telefono), isMain: true, isQuoteRecipient: true,
      });
      cat.reload();
      return {
        id: empresa.id, nombre: empresa.legalName, cif: empresa.taxId ?? '', sector: d.sector, ciudad: d.ciudad, convenio: empresa.defaultAgreementId ?? '',
        comercial: me?.user.fullName ?? '',
        contactos: [{ id: contacto.id, nombre: contacto.name, cargo: contacto.position ?? '', email: contacto.email ?? '', telefono: contacto.phone ?? '' }],
      };
    },
    [me, sucursal, cat],
  );

  const error = cat.error ?? lista.error;
  return {
    estado: c && lista.data ? ('listo' as const) : error ? ('error' as const) : ('cargando' as const),
    error: error ? mensajeError(error) : undefined,
    reintentar: () => {
      cat.reload();
      lista.reload();
    },
    listado,
    catalogos,
    abrir,
    guardar,
    cambiarEstado,
    rechazar,
    anadirMotivoRechazo,
    enviar,
    pedirAprobacion,
    resolverAprobacion,
    nuevaVersion,
    pasarAObsoleto,
    duplicar,
    abrirDocumento,
    anadirDocumento,
    quitarDocumento,
    descargarDocumento,
    salarioConvenio,
    altaRapidaEmpresa,
  };
}
