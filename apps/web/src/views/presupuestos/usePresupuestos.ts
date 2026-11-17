// Datos de Presupuestos (PresupuestosView.jsx): listado, ficha, guardado, cambios de estado, versiones, obsoleto,
// aprobación del margen, documentos y catálogos. La vista solo recibe datos en su forma (mapeo.ts) y funciones.
// Contrato: fase4-backend.md (rutas /v1/quotes, /v1/quote-versions y /v1/quote-positions).
//
// - Listado: el servidor filtra por la sucursal de la cabecera; la búsqueda y los filtros de la vista se aplican en
//   el navegador (la lista de presupuestos de una sucursal es corta).
// - Se edita la versión actual: al guardar se cambia su cabecera y se crean, cambian o quitan los puestos uno a uno.
// - Costes: los calcula el servidor (cada puesto trae `calculation`). Mientras se edita, la vista previa usa el mismo
//   módulo de cálculo de la API (mapeo.ts → economiaPuesto).
import { useCallback, useMemo, useState } from 'react';
import {
  ApiError,
  repos,
  useData,
  type AgreementCategory,
  type CatalogItem,
  type Client,
  type ClientContact,
  type CollectiveAgreement,
  type Membership,
  type Quote,
  type ServiceRequestSummary,
  type QuoteVersion,
  type Repositories,
  type TenantSettings,
} from '../../data';
import { useSesion } from '../../sesion';
import { esError, fechaHora, mensajeError, vacioANull } from '../comun/datos';
import { horarioDeTurno } from '../../data/turnos';
import { estadoApi, filaVista, peticionesDe, presupuestoVista, puestoApi, puestoCambiado, resumenPeticiones, versionApi, type PresupuestoVista, type Resolver } from './mapeo';

export { mensajeError };
export { economiaPuesto, conceptosNuevos } from './mapeo';

type Catalogos = {
  convenios: CollectiveAgreement[];
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
  const [convenios, formasPago, motivosRechazo, tiposDocumento, empresas, contactos, comerciales, ajustes] = await Promise.all([
    r.collectiveAgreements.list({ status: 'active', limit: 200 }).then((p) => p.data),
    tabla('payment_method'),
    tabla('quote_rejection_reason'),
    tabla('document_type'),
    r.clients.list({ branchId: sucursal ?? undefined, limit: 200 }).then((p) => p.data),
    r.clientContacts.list({ limit: 200 }).then((p) => p.data),
    // Ver los usuarios necesita users.manage: sin él, el comercial es quien está en la sesión.
    r.memberships.list({ status: 'active', limit: 200 }).then((p) => p.data, () => [] as Membership[]),
    r.tenantSettings.get(),
  ]);
  return { convenios, formasPago, motivosRechazo, tiposDocumento, empresas, contactos, comerciales, ajustes };
}

const OTRO = { id: 'otro', label: 'Otro / Personalizado...' };

export function usePresupuestos() {
  const { me, sucursal } = useSesion();
  const cat = useData((r) => cargarCatalogos(r, sucursal), [sucursal]);
  const lista = useData((r) => r.quotes.list({ branchId: sucursal ?? undefined, limit: 200 }).then((p) => p.data), [sucursal]);
  // Peticiones de la sucursal (fase 5): las de cada presupuesto aceptado. Sin permiso para verlas, ninguna.
  const peticiones = useData((r) => r.requests.list({ branchId: sucursal ?? undefined, limit: 200 }).then((p) => p.data, () => [] as ServiceRequestSummary[]), [sucursal]);
  // Categorías de la tabla de cada convenio (se piden al elegir el convenio en un puesto).
  const [categorias, setCategorias] = useState<Record<string, AgreementCategory[]>>({});

  const c = cat.data;
  const recargarLista = lista.reload;
  const permisos = me?.permissions ?? [];

  // ---- Nombres e ids -------------------------------------------------------

  const comerciales = useMemo(() => {
    const desdeUsuarios = (c?.comerciales ?? []).map((m) => ({ id: m.userId, nombre: m.fullName }));
    const yo = me ? [{ id: me.user.id, nombre: me.user.fullName }] : [];
    return [...new Map([...desdeUsuarios, ...yo].map((x) => [x.id, x])).values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [c, me]);

  const resolver: Resolver = useMemo(
    () => ({
      empresa: (clientId) => {
        const e = c?.empresas.find((x) => x.id === clientId);
        return e && { cif: e.taxId ?? '', sector: e.activity ?? '', ciudad: '', convenio: e.defaultAgreementId ?? '' };
      },
      contacto: (contactId) => {
        const x = c?.contactos.find((y) => y.id === contactId);
        return x && { nombre: x.name, cargo: x.position ?? '', email: x.email ?? '', telefono: x.phone ?? x.mobile ?? '' };
      },
      comercial: (userId) => comerciales.find((x) => x.id === userId)?.nombre ?? '',
    }),
    [c, comerciales],
  );
  const vista = useCallback((q: Quote, v: QuoteVersion = q.currentVersion) => presupuestoVista(q, v, resolver), [resolver]);

  // ---- Catálogos en la forma de la vista ------------------------------------

  const catalogos = useMemo(() => {
    if (!c) return undefined;
    const etiqueta = (x: AgreementCategory) => (x.level ? `${x.name} (nivel ${x.level})` : x.name);
    return {
      convenios: [...c.convenios.map((a) => ({ id: a.id, label: a.name })), OTRO],
      categorias: Object.fromEntries(Object.entries(categorias).map(([k, l]) => [k, [...l.map((x) => ({ id: x.id, label: etiqueta(x) })), OTRO]])),
      formasPago: [...c.formasPago.map((f) => ({ id: f.id, label: f.name })), OTRO],
      comerciales: comerciales.map((x) => x.nombre),
      motivosRechazo: c.motivosRechazo.map((m) => m.name),
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
      /** Permisos: crear, editar y enviar; aprobar el margen; ver costes y margen. */
      puedeEditar: permisos.includes('quotes.manage'),
      puedeAprobar: permisos.includes('quotes.approve_margin'),
      puedeVerCostes: permisos.includes('quotes.view_costs'),
    };
  }, [c, comerciales, categorias, permisos]);

  const listado = useMemo(
    () => (lista.data ?? []).map((q) => ({ ...filaVista(q), peticionCreada: resumenPeticiones(peticionesDe(q.id, peticiones.data ?? [])) })),
    [lista.data, peticiones.data],
  );
  /** Añade a la vista las peticiones creadas desde el presupuesto. */
  const conPeticiones = useCallback(
    async (v: PresupuestoVista, desdeServidor = false) => {
      const l = desdeServidor
        ? await repos.requests.list({ quoteId: v._id, limit: 200 }).then((p) => p.data, () => [] as ServiceRequestSummary[])
        : (peticiones.data ?? []);
      const creadas = peticionesDe(v._id, l, v.posiciones);
      return Object.assign(v, { peticionesCreadas: creadas, peticionCreada: resumenPeticiones(creadas) });
    },
    [peticiones.data],
  );

  /** Pide las categorías de un convenio (una vez). */
  const cargarCategorias = useCallback(
    async (collectiveAgreementId: string) => {
      if (!collectiveAgreementId || collectiveAgreementId === 'otro' || categorias[collectiveAgreementId]) return;
      const l = await repos.quotes.agreementCategories(collectiveAgreementId).catch(() => [] as AgreementCategory[]);
      setCategorias((x) => ({ ...x, [collectiveAgreementId]: l }));
    },
    [categorias],
  );

  // ---- Ficha ---------------------------------------------------------------

  /** La ficha completa de un presupuesto: datos, historial, documentos añadidos y versiones anteriores. */
  const abrir = useCallback(
    async (quoteId: string) => {
      const [q, actividad, documentos] = await Promise.all([
        repos.quotes.get(quoteId),
        repos.activity.list({ entityType: 'quote', entityId: quoteId, limit: 100 }).then((p) => p.data, () => []),
        repos.documents.list({ entityType: 'quote', entityId: quoteId, limit: 100 }).then((p) => p.data, () => []),
      ]);
      const v = vista(q);
      v.auditoria = actividad.map((a) => ({ id: a.id, fecha: fechaHora(a.occurredAt), usuario: a.actorName ?? '—', accion: a.summary, detalle: '' }));
      v.documentosAnadidos = documentos.map((d) => ({
        id: d.id, tipo: d.typeName, nombre: d.name, archivo: d.name, interno: !d.visibleInPortal, fecha: d.uploadedAt.slice(0, 10), autor: d.uploadedByName ?? '—',
      }));
      // Las categorías de los convenios de sus puestos, para el panel del puesto.
      new Set(q.currentVersion.positions.map((p) => p.collectiveAgreementId).filter((x): x is string => !!x)).forEach((x) => void cargarCategorias(x));
      const anteriores = await Promise.all(
        q.versions
          .filter((x) => x.id !== q.currentVersion.id)
          .map(async (x) => ({
            codigo: `${q.code}-v${x.versionNumber}`,
            fecha: x.createdAt.slice(0, 10),
            autor: x.createdByName ?? '—',
            estado: 'Sustituido',
            comentario: '',
            datos: vista(q, await repos.quoteVersions.get(x.id)),
          })),
      );
      if (v.estado === 'Firmado / Aceptado') await conPeticiones(v, true);
      return { presupuesto: v, versiones: anteriores };
    },
    [vista, cargarCategorias, conPeticiones],
  );

  // ---- Guardar ---------------------------------------------------------------

  /** Forma de pago «Otro»: se añade a la tabla maestra. */
  const formaPagoId = useCallback(
    async (v: PresupuestoVista) => {
      if (v.formaPago !== 'otro') return v.formaPago || null;
      const nombre = v.formaPagoCustom.trim();
      if (!nombre) return null;
      const existente = c?.formasPago.find((f) => f.name.toLowerCase() === nombre.toLowerCase());
      if (existente) return existente.id;
      const creada = await repos.catalogItems.create({ type: 'payment_method', name: nombre });
      cat.reload();
      return creada.id;
    },
    [c, cat],
  );

  /**
   * Guarda el formulario: crea el presupuesto si es nuevo; si no, la empresa (si ha cambiado), la cabecera de la versión y
   * sus puestos (los nuevos, los cambiados y los quitados respecto a `original`). `estado`: Borrador o En preparación.
   * Devuelve el id del presupuesto.
   */
  const guardar = useCallback(
    async (v: PresupuestoVista, estado: string, original?: PresupuestoVista) => {
      const completa = versionApi(v, { comercial: (n) => comerciales.find((x) => x.nombre === n)?.id ?? null, formaPago: await formaPagoId(v) });
      // Sin quotes.view_costs la API no deja cambiar margen, tipos ni costes internos (403): no se envían.
      const veCostes = permisos.includes('quotes.view_costs');
      const { margin: _m, ssRates: _s, costConcepts: _c, ...sinCostes } = completa;
      const cabecera = veCostes ? completa : sinCostes;
      const puesto = (p: (typeof v.posiciones)[number]) => {
        const datos = puestoApi(p, v.conceptosEscandallo);
        if (veCostes) return datos;
        const { costs: _costs, margin: _margin, ...resto } = datos;
        return resto;
      };
      const status = estadoApi(estado) === 'in_preparation' ? 'in_preparation' : 'draft';
      let quoteId = v._id;
      let versionId = v._versionId;
      if (!quoteId) {
        const q = await repos.quotes.create({ ...cabecera, clientId: v.empresaId || null, branchId: sucursal ?? undefined });
        quoteId = q.id;
        versionId = q.currentVersion.id;
      } else if ((v.empresaId || null) !== (v._clientIdGuardado ?? null)) {
        await repos.quotes.update(quoteId, { clientId: v.empresaId || null });
      }
      const antes = new Set((original?._id === v._id ? original.posiciones : []).map((p) => p.id));
      const ahora = new Set(v.posiciones.map((p) => p.id));
      // Primero la cabecera (con los costes internos); después los puestos que se quitan, se cambian y se añaden.
      await repos.quoteVersions.update(versionId, cabecera);
      for (const id of antes) if (!ahora.has(id)) await repos.quoteVersions.removePosition(id);
      for (const p of v.posiciones) {
        if (!antes.has(p.id)) await repos.quoteVersions.addPosition(versionId, puesto(p));
        else if (puestoCambiado(p)) await repos.quoteVersions.updatePosition(p.id, puesto(p));
      }
      await repos.quoteVersions.update(versionId, { status });
      recargarLista();
      return quoteId;
    },
    [comerciales, formaPagoId, sucursal, recargarLista, permisos],
  );

  // ---- Estados ---------------------------------------------------------------

  const tras = useCallback(
    async <T,>(promesa: Promise<T>) => {
      const r = await promesa;
      recargarLista();
      return r;
    },
    [recargarLista],
  );

  /** Cambio de estado desde el pipeline o la cabecera (aceptar, pendiente de firma, borrador, en preparación). */
  const cambiarEstado = useCallback(
    async (quoteId: string, estado: string) => {
      const v = (await repos.quotes.get(quoteId)).currentVersion;
      const s = estadoApi(estado);
      if (s === 'accepted') await tras(repos.quoteVersions.accept(v.id));
      else if (s === 'pending_signature') await tras(repos.quoteVersions.pendingSignature(v.id));
      else if (s === 'draft' || s === 'in_preparation') await tras(repos.quoteVersions.update(v.id, { status: s }));
      else if (s === 'sent') throw new ApiError(409, 'conflicto', 'Para enviarlo, ábrelo y usa «Enviar al cliente»: antes se revisa');
      else throw new ApiError(409, 'conflicto', 'Ese cambio de estado no se puede hacer desde aquí');
      return (await abrir(quoteId)).presupuesto;
    },
    [tras, abrir],
  );

  const rechazar = useCallback(
    async (quoteId: string, motivo: string, notas: string) => {
      const v = (await repos.quotes.get(quoteId)).currentVersion;
      const reasonId = c?.motivosRechazo.find((m) => m.name === motivo)?.id;
      if (!reasonId) throw new ApiError(422, 'validacion', 'Elige un motivo de la lista');
      await tras(repos.quoteVersions.reject(v.id, { reasonId, notes: vacioANull(notas) }));
      return (await abrir(quoteId)).presupuesto;
    },
    [c, tras, abrir],
  );

  /** Motivo de rechazo nuevo: a la tabla maestra (hace falta catalogs.manage). */
  const anadirMotivoRechazo = useCallback(
    async (nombre: string) => {
      await repos.catalogItems.create({ type: 'quote_rejection_reason', name: nombre });
      cat.reload();
    },
    [cat],
  );

  /** Acción sobre la versión actual del presupuesto abierto; devuelve la ficha actualizada. */
  const accion = useCallback(
    async (v: PresupuestoVista, f: (versionId: string) => Promise<unknown>) => {
      await tras(f(v._versionId));
      return (await abrir(v._id)).presupuesto;
    },
    [tras, abrir],
  );
  /** Revisión del servidor antes de enviar, en la forma de la lista de comprobación de la vista. */
  const revisar = useCallback(async (v: PresupuestoVista) => {
    const r = await repos.quoteVersions.review(v._versionId);
    return r.checks.map((c) => ({
      ok: c.ok,
      tipo: c.kind === 'error' ? 'error' : 'aprobacion',
      texto: c.message,
      pestana: c.path.startsWith('positions') ? 'posiciones' : 'empresa',
    }));
  }, []);

  const enviar = useCallback((v: PresupuestoVista) => accion(v, (id) => repos.quoteVersions.send(id)), [accion]);
  const pedirAprobacion = useCallback((v: PresupuestoVista, motivo: string) => accion(v, (id) => repos.quoteVersions.requestApproval(id, motivo || null)), [accion]);
  const resolverAprobacion = useCallback(
    (v: PresupuestoVista, aprobada: boolean, notas = '') =>
      accion(v, (id) => (aprobada ? repos.quoteVersions.approve(id, notas || null) : repos.quoteVersions.rejectApproval(id, notas || 'Revisa el margen de los puestos'))),
    [accion],
  );

  const nuevaVersion = useCallback(
    async (v: PresupuestoVista) => {
      await tras(repos.quoteVersions.newVersion(v._versionId));
      return abrir(v._id);
    },
    [tras, abrir],
  );

  const pasarAObsoleto = useCallback(
    async (quoteId: string, motivo: string) => {
      const { created } = await tras(repos.quotes.makeObsolete(quoteId, motivo));
      return (await abrir(created.id)).presupuesto;
    },
    [tras, abrir],
  );

  const duplicar = useCallback(
    async (quoteId: string) => {
      const q = await tras(repos.quotes.duplicate(quoteId));
      return (await abrir(q.id)).presupuesto;
    },
    [tras, abrir],
  );

  // ---- Documentos ----------------------------------------------------------

  /** Genera en el servidor el PDF de la propuesta y lo abre. false si no se puede (demo). */
  const abrirPropuestaPdf = useCallback(async (v: PresupuestoVista) => {
    try {
      const { documentId } = await repos.quoteVersions.proposalPdf(v._versionId);
      const url = await repos.documents.downloadUrl(documentId);
      if (url) window.open(url, '_blank', 'noopener');
      return !!url;
    } catch (e) {
      if (esError(e, 'no_disponible')) return false;
      throw e;
    }
  }, []);

  /** Sube un documento añadido a mano. El tipo se busca (o se crea) en la tabla maestra de tipos de documento. */
  const anadirDocumento = useCallback(
    async (quoteId: string, d: { tipo: string; nombre: string; archivo: File; interno: boolean }) => {
      let tipo = c?.tiposDocumento.find((t) => t.name === d.tipo);
      if (!tipo) {
        tipo = await repos.catalogItems.create({ type: 'document_type', name: d.tipo });
        cat.reload();
      }
      await repos.documents.upload({ entityType: 'quote', entityId: quoteId, typeId: tipo.id, name: d.nombre.trim() || d.archivo.name, file: d.archivo, visibleInPortal: !d.interno });
    },
    [c, cat],
  );
  // ---- Peticiones (fase 5) -------------------------------------------------------

  /**
   * «Crear peticiones» del presupuesto aceptado: una por fila del reparto (puesto, turno y plazas), todas con el mismo
   * inicio y, si el presupuesto tiene duración, el fin que sale de ella. Devuelve la vista con las peticiones creadas.
   */
  const crearPeticiones = useCallback(
    async (v: PresupuestoVista, reparto: { posId: string; turno: string; plazas: number }[], inicio: string) => {
      const meses = Number(v.duracionMeses) || 0;
      let fin: string | null = null;
      if (meses > 0) {
        const f = new Date(`${inicio}T00:00:00`);
        f.setMonth(f.getMonth() + meses);
        f.setDate(f.getDate() - 1);
        fin = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
      }
      const creadas = await repos.requests.createFromQuoteVersion(
        v._versionId,
        reparto.map((r) => {
          const t = horarioDeTurno(r.turno);
          return { quotePositionId: r.posId, positionsCount: Number(r.plazas), startDate: inicio || null, endDate: fin, shiftName: t.name, workdayType: t.workdayType, schedule: t.days };
        }),
      );
      peticiones.reload();
      return { creadas: creadas.map((x) => x.code), presupuesto: await conPeticiones({ ...v }, true) };
    },
    [conPeticiones, peticiones],
  );

  const quitarDocumento = useCallback(async (documentId: string) => repos.documents.remove(documentId), []);
  const descargarDocumento = useCallback(async (documentId: string) => {
    const url = await repos.documents.downloadUrl(documentId);
    if (url) window.open(url, '_blank', 'noopener');
    return !!url;
  }, []);

  // ---- Convenio y empresa nueva ----------------------------------------------

  /**
   * Valores del convenio para la categoría de un puesto, en la forma de la vista (null si no hay tabla): salario,
   * plus, pagas, horas, vacaciones, el mínimo por hora y la vigencia («Tablas 2026»).
   */
  const salarioConvenio = useCallback(async (collectiveAgreementId: string, categoryId: string) => {
    if (!collectiveAgreementId || collectiveAgreementId === 'otro' || !categoryId || categoryId === 'otro') return null;
    const r = await repos.quotes.agreementDefaults({ collectiveAgreementId, agreementCategoryId: categoryId });
    const d = r.defaults;
    if (d.annualBaseSalary == null) return null;
    const valores: Record<string, number> = { salarioBaseAnual: d.annualBaseSalary, plusConvenioMes: d.monthlyBonus };
    if (d.annualPayments != null) valores.pagasAnuales = d.annualPayments;
    if (d.annualHours != null) valores.horasAnuales = d.annualHours;
    if (d.vacationDays != null) valores.vacacionesDiasAnio = d.vacationDays;
    return {
      valores,
      minimoHora: d.minimumSalaryHour,
      versionConvenio: r.agreementVersionId,
      year: (r.effectiveFrom ?? '').slice(0, 4),
      periodo: r.effectiveFrom ? { from: r.effectiveFrom, to: r.effectiveTo } : null,
    };
  }, []);

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
        comercial: me?.user.fullName ?? '', nueva: true,
        contactos: [{ id: contacto.id, nombre: contacto.name, cargo: contacto.position ?? '', email: contacto.email ?? '', telefono: contacto.phone ?? '' }],
      };
    },
    [me, sucursal, cat],
  );

  const error = cat.error ?? lista.error;
  return {
    crearPeticiones,
    estado: c && lista.data ? ('listo' as const) : error ? ('error' as const) : ('cargando' as const),
    error: error ? mensajeError(error) : undefined,
    reintentar: () => {
      cat.reload();
      lista.reload();
    },
    listado,
    catalogos,
    cargarCategorias,
    abrir,
    guardar,
    cambiarEstado,
    rechazar,
    anadirMotivoRechazo,
    revisar,
    enviar,
    pedirAprobacion,
    resolverAprobacion,
    nuevaVersion,
    pasarAObsoleto,
    duplicar,
    abrirPropuestaPdf,
    anadirDocumento,
    quitarDocumento,
    descargarDocumento,
    salarioConvenio,
    altaRapidaEmpresa,
  };
}
