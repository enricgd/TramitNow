// Datos de Peticiones (PeticionesView.jsx): listado, ficha, horario, estados, datos del servicio, crear desde un
// presupuesto aceptado, duplicar con otro horario, CPD previo, documentos del servicio y actividad. La vista recibe
// datos en su forma (mapeo.ts) y funciones. Contrato: fase5-backend.md (rutas /v1/requests...).
//
// - Listado: el servidor filtra por la sucursal de la cabecera; búsqueda y filtros de la vista, en el navegador.
// - Plazas con personas, candidatos, CPD de cada persona y portales son de las fases 6 y 7: en la demo vienen de
//   `requestSelection` (datos de ejemplo); contra la API no hay ruta y `seleccion` es null.
import { useCallback, useMemo, useState } from 'react';
import {
  ApiError,
  repos,
  useData,
  type Application,
  type ApplicationStage,
  type CandidateSummary,
  type CatalogItem,
  type ClientCenter,
  type ClientContact,
  type Membership,
  type Repositories,
  type RequestUseCase,
  type ServiceRequest,
  type ServiceRequestInput,
} from '../../data';
import { useSesion } from '../../sesion';
import { esError, fechaHora, mensajeError, vacioANull } from '../comun/datos';
import { documentoVista, estadoApi, horarioApi, horarioVista, perfilPuesto, peticionVista, presupuestoAceptadoVista, type PeticionVista } from './mapeo';

/** Plaza de la API → estado de la vista (ESTADOS_PLAZA). */
const PLAZA: Record<string, string> = { open: 'vacante', reserved: 'reservada', covered: 'cubierta', started: 'incorporada', left: 'baja' };
/** Etapa de la candidatura → etapa del embudo de la vista (ETAPAS). */
const ETAPA_EMBUDO: Partial<Record<ApplicationStage, string>> = {
  registered: 'inscrito', preselected: 'preseleccionado', interview: 'entrevista', proposed: 'propuesto', confirmed: 'aceptado', discarded: 'descartado', withdrawn: 'descartado',
};

export { mensajeError };

/** Tipos de documento que se suben a una petición (los de la tabla maestra con estos nombres). */
const TIPOS_DOC = ['Presupuesto firmado por el cliente', 'Pedido u orden de compra del cliente', 'Evaluación de riesgos del cliente', 'Correo del cliente', 'Otro documento'];

type Catalogos = { responsables: Membership[]; tiposDocumento: CatalogItem[]; supuestos: RequestUseCase[] };
async function cargarCatalogos(r: Repositories): Promise<Catalogos> {
  const [responsables, tiposDocumento, supuestos] = await Promise.all([
    // Ver los usuarios necesita users.manage: sin él, el responsable es quien está en la sesión.
    r.memberships.list({ status: 'active', limit: 200 }).then((p) => p.data, () => [] as Membership[]),
    r.catalogItems.list({ type: 'document_type', status: 'active', limit: 200 }).then((p) => p.data, () => [] as CatalogItem[]),
    r.requests.useCases().catch(() => [] as RequestUseCase[]),
  ]);
  return { responsables, tiposDocumento, supuestos };
}

/** Datos de la ETT que salen en el CPD previo (Mi ETT → datos legales de la sociedad). */
export type EttCpd = { nombre: string; autorizacion: string; representante: { nombre: string; cargo: string; dni: string } };
type Horario = Parameters<typeof horarioApi>[0];

export function usePeticiones() {
  const { me, sucursal } = useSesion();
  const cat = useData(cargarCatalogos, []);
  const lista = useData((r) => r.requests.list({ branchId: sucursal ?? undefined, limit: 200 }).then((p) => p.data.map((x) => peticionVista(x))), [sucursal]);
  const sel = useData((r) => r.requestSelection.get().catch((e: unknown) => (esError(e, 'no_disponible') ? null : Promise.reject(e))), []);
  const permisos = me?.permissions ?? [];
  const [ett, setEtt] = useState<Record<string, EttCpd>>({});

  const responsables = useMemo(() => {
    const desdeUsuarios = (cat.data?.responsables ?? []).map((m) => ({ id: m.userId, nombre: m.fullName }));
    const yo = me ? [{ id: me.user.id, nombre: me.user.fullName }] : [];
    return [...new Map([...desdeUsuarios, ...yo].map((x) => [x.id, x])).values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [cat.data, me]);
  const tiposDocumento = useMemo(() => TIPOS_DOC.filter((n) => cat.data?.tiposDocumento.some((t) => t.name === n)), [cat.data]);
  const supuestos = useMemo(() => (cat.data?.supuestos ?? []).map((s) => ({ id: s.code, nombre: s.name, referencia: s.legalReference ?? '', ayuda: s.hint ?? '', meses: s.maxMonths })), [cat.data]);

  const recargar = lista.reload;

  // ---- Ficha -------------------------------------------------------------------

  /** Datos de la ETT para el CPD previo (una vez por sociedad). */
  const datosEtt = useCallback(
    async (companyId: string): Promise<EttCpd> => {
      if (ett[companyId]) return ett[companyId];
      const [empresa, legal] = await Promise.all([repos.companies.get(companyId).catch(() => null), repos.companyLegal.get(companyId).then((x) => x.legal, () => null)]);
      const d: EttCpd = {
        nombre: empresa?.name ?? 'La ETT',
        autorizacion: legal?.ettAuthorizationNumber ?? 'sin indicar en Mi ETT',
        representante: {
          nombre: legal?.legalRepName ?? 'Sin representante legal en Mi ETT',
          cargo: legal?.legalRepPosition ?? 'Representante legal',
          dni: legal?.legalRepIdNumber ?? 'sin indicar',
        },
      };
      setEtt((x) => ({ ...x, [companyId]: d }));
      return d;
    },
    [ett],
  );

  /** El historial de la petición, lo último primero. */
  const actividadDe = (requestId: string) =>
    repos.activity.list({ entityType: 'request', entityId: requestId, limit: 100 }).then(
      (p) => p.data.map((a) => ({ id: a.id, fecha: fechaHora(a.occurredAt), usuario: a.actorName ?? '—', texto: a.summary })),
      () => [],
    );

  /** La petición en la forma de la vista, con el email y el teléfono del firmante sacados de sus contactos si hace falta. */
  const vistaFicha = (r: ServiceRequest, contactos: ClientContact[]): PeticionVista => {
    const firmante = contactos.find((c) => c.id === r.clientSignerContactId);
    return peticionVista({
      ...r,
      clientSignerContactEmail: r.clientSignerContactEmail ?? firmante?.email ?? null,
      clientSignerContactPhone: r.clientSignerContactPhone ?? firmante?.phone ?? firmante?.mobile ?? null,
    });
  };

  /** La ficha completa: horario, documentos, actividad, datos de la ETT y los centros y contactos del cliente. */
  const abrir = useCallback(
    async (requestId: string) => {
      const r = await repos.requests.get(requestId);
      const [documentos, actividad, datos, centros, contactos] = await Promise.all([
        repos.documents.list({ entityType: 'request', entityId: r.id, limit: 100 }).then((p) => p.data.map(documentoVista), () => []),
        actividadDe(r.id),
        datosEtt(r.companyId),
        repos.clientCenters.list({ clientId: r.clientId, limit: 200 }).then((p) => p.data, () => [] as ClientCenter[]),
        repos.clientContacts.list({ clientId: r.clientId, limit: 200 }).then((p) => p.data, () => [] as ClientContact[]),
      ]);
      return {
        peticion: vistaFicha(r, contactos),
        horario: horarioVista(r),
        documentos,
        actividad,
        ett: datos,
        centros: centros.filter((c) => !c.deletedAt).map((c) => ({ id: c.id, nombre: c.name })),
        contactos: contactos.filter((c) => !c.suspended && !c.deletedAt).map((c) => ({ id: c.id, nombre: c.name, cargo: c.position ?? '', firma: c.signsCpds })),
        _contactos: contactos,
      };
    },
    [datosEtt],
  );
  type Ficha = Awaited<ReturnType<typeof abrir>>;

  // ---- Selección (fase 6): plazas, embudo y candidatos de la petición, desde las candidaturas -----------------------

  /** Plazas (con quién las ocupa), embudo y candidatos de una petición, en la forma de la vista. Solo contra la API. */
  const seleccionDe = useCallback(async (p: PeticionVista) => {
    const [r, apps] = await Promise.all([repos.requests.get(p._id), repos.applications.list({ requestId: p._id }).catch(() => [] as Application[])]);
    const plazas = r.slotList.map((s) => ({
      id: s.id, numero: s.number, estado: PLAZA[s.status] ?? 'vacante', candidatoId: s.candidateId ?? apps.find((a) => a.id === s.applicationId)?.candidateId ?? null,
      nombre: s.candidateName ?? null, _applicationId: s.applicationId ?? null, fechaIncorporacion: p.inicio ? p.inicio.split('-').reverse().join('/') : null,
      cpd: s.status === 'covered' ? 'sin_generar' : null, motivoBaja: null, bajaDe: null,
    }));
    const embudo = apps.map((a) => ({ id: a.candidateId, etapa: ETAPA_EMBUDO[a.stage] ?? 'inscrito', fecha: a.stageChangedAt.slice(0, 10), _applicationId: a.id }));
    const candidatos = apps.map((a) => ({
      id: a.candidateId, nombre: a.candidateName, puestoPrincipal: '', ubicacion: '', scoring: '—', origen: a.source ?? (a.origin === 'applied' ? 'Inscrito' : 'Bolsa'),
      matchPosicion: [p.perfil], dni: '', telefono: '', email: '', experiencia: '', carnets: '', valoracionETT: '', estadoSeleccion: '',
    }));
    return { plazas, embudo, candidatos };
  }, []);
  /** La bolsa de candidatos para «Proponer candidato» (sin abrir fichas: no queda en la auditoría). */
  const bolsa = useCallback(async (perfil: string) => {
    const l = await repos.candidates.list({ limit: 300 }).then((x) => x.data, () => [] as CandidateSummary[]);
    return l.map((c) => ({
      id: c.id, nombre: `${c.firstName} ${c.lastName}`, puestoPrincipal: c.mainProfile?.name ?? '', ubicacion: c.city ?? '', scoring: '—', origen: c.source ?? 'Bolsa',
      matchPosicion: [c.mainProfile ? perfilPuesto(c.mainProfile.name) : '', ...c.otherProfileNames.map(perfilPuesto)].filter((x) => x === perfil || x),
      docOk: c.idDocument.state === 'ok', dni: c.idDocument.masked ?? '', telefono: c.phone ?? '', email: c.email ?? '', experiencia: '', carnets: '',
      valoracionETT: '', estadoSeleccion: '',
    }));
  }, []);
  /** Proponer a alguien para una plaza: crea la candidatura si no la tiene (desde la bolsa) y reserva la plaza. */
  const proponer = useCallback(async (p: PeticionVista, candidateId: string, slotId: string | null) => {
    const ya = (await repos.applications.list({ requestId: p._id, candidateId }))[0];
    const app = ya ?? (await repos.applications.create({ candidateId, requestId: p._id, origin: 'sourced' }));
    const r = await repos.applications.propose(app.id, slotId);
    recargar();
    return (r.requirements ?? []).filter((x) => !x.ok).map((x) => x.message);
  }, [recargar]);
  const confirmar = useCallback(async (applicationId: string) => { await repos.applications.confirm(applicationId); recargar(); }, [recargar]);
  const retirar = useCallback(async (applicationId: string) => { await repos.applications.release(applicationId); recargar(); }, [recargar]);
  /** Cambiar de etapa en el embudo (las propuestas y confirmaciones van por las plazas). */
  const cambiarEtapa = useCallback(async (applicationId: string, etapa: string) => {
    const stage = (Object.keys(ETAPA_EMBUDO) as ApplicationStage[]).find((k) => ETAPA_EMBUDO[k] === etapa);
    if (!stage || ['proposed', 'confirmed'].includes(stage)) throw new ApiError(422, 'validacion', 'Para proponer o confirmar, usa las plazas');
    await repos.applications.update(applicationId, { stage });
  }, []);

  const conRecarga = useCallback(<T,>(p: Promise<T>) => p.then((x) => (recargar(), x)), [recargar]);
  /** Cambia la petición y devuelve la ficha nueva (con los contactos que ya tenía). */
  const cambiar = useCallback(
    (f: Ficha, data: ServiceRequestInput) =>
      conRecarga(
        repos.requests.update(f.peticion._id, data).then(async (r) => ({ ...f, peticion: vistaFicha(r, f._contactos), horario: horarioVista(r), actividad: await actividadDe(r.id) })),
      ),
    [conRecarga],
  );

  const cambiarEstado = useCallback(
    (p: PeticionVista, estado: string, motivoCancelacion?: string) => {
      const status = estadoApi(estado);
      if (!status) return Promise.reject(new ApiError(422, 'validacion', `Estado desconocido: ${estado}`));
      return conRecarga(repos.requests.update(p._id, { status, ...(status === 'cancelled' ? { cancelReason: vacioANull(motivoCancelacion) } : {}) }).then((r) => peticionVista(r)));
    },
    [conRecarga],
  );
  const guardarHorario = useCallback((f: Ficha, h: Horario) => cambiar(f, horarioApi(h)), [cambiar]);
  /** «Datos del servicio»: centro, firmante, supuesto, tareas, riesgos, EPIs, carnés, fechas, plazas y responsable. */
  const guardarServicio = useCallback(
    (f: Ficha, d: Record<string, string | number | boolean | null>) => {
      const texto = (k: string) => vacioANull(d[k] == null ? '' : String(d[k]));
      return cambiar(f, {
        hazardousWork: !!d.hazardousWork,
        clientCenterId: texto('clientCenterId'),
        clientSignerContactId: texto('clientSignerContactId'),
        useCase: texto('useCase'),
        useCaseJustification: texto('useCaseJustification'),
        tasks: texto('tasks'),
        qualification: texto('qualification'),
        risks: texto('risks'),
        ppe: texto('ppe'),
        requiredLicenses: texto('requiredLicenses'),
        orderReference: texto('orderReference'),
        notes: texto('notes'),
        startDate: texto('startDate'),
        endDate: texto('endDate'),
        responsibleUserId: texto('responsibleUserId'),
        positionsCount: Number(d.positionsCount) || 1,
      });
    },
    [cambiar],
  );

  type Nueva = { quotePositionId: string; plazas: number; inicio: string; fin?: string; horario: Horario };
  const crear = useCallback(
    (n: Nueva) =>
      conRecarga(
        repos.requests
          .create({ quotePositionId: n.quotePositionId, positionsCount: Number(n.plazas), startDate: n.inicio || null, endDate: n.fin || null, workdayType: 'full', ...horarioApi(n.horario) })
          .then((r) => peticionVista(r)),
      ),
    [conRecarga],
  );
  const duplicar = useCallback(
    (p: PeticionVista, n: Omit<Nueva, 'quotePositionId'>) =>
      conRecarga(
        repos.requests
          .duplicate(p._id, { positionsCount: Number(n.plazas), startDate: n.inicio || null, endDate: n.fin || null, workdayType: 'full', ...horarioApi(n.horario) })
          .then((r) => peticionVista(r)),
      ),
    [conRecarga],
  );

  /** Buscador de presupuestos aceptados (en el servidor): los 8 primeros y cuántos hay. */
  const buscarPresupuestos = useCallback(
    (q: string) => repos.requests.sources({ q: q.trim() || undefined, limit: 8 }).then((p) => ({ lista: p.data.map(presupuestoAceptadoVista), total: p.pagination.total })),
    [],
  );

  // ---- CPD previo y documentos -----------------------------------------------------

  /** Abre un documento. false si no hay fichero (en la demo). */
  const descargarDocumento = useCallback(async (documentId: string) => {
    try {
      const url = await repos.documents.downloadUrl(documentId);
      if (url) window.open(url, '_blank', 'noopener');
      return !!url;
    } catch (e) {
      if (esError(e, 'no_encontrado')) return false;
      throw e;
    }
  }, []);
  /** Genera el CPD previo en el servidor, lo abre y devuelve la ficha al día. */
  const generarCpdPrevio = useCallback(
    async (f: Ficha) => {
      const { documentId } = await repos.requests.generatePreCpd(f.peticion._id);
      const hay = await descargarDocumento(documentId);
      return { hay, ficha: await abrir(f.peticion._id) };
    },
    [abrir, descargarDocumento],
  );
  const marcarCpdPrevio = useCallback(
    (f: Ficha, estado: 'enviado' | 'revisado') =>
      conRecarga(
        (estado === 'enviado'
          ? repos.requests.markPreCpdSent(f.peticion._id, { sentTo: f.peticion.emailContacto || null })
          : repos.requests.markPreCpdReviewed(f.peticion._id)
        ).then(async (r) => ({ ...f, peticion: vistaFicha(r, f._contactos), actividad: await actividadDe(r.id) })),
      ),
    [conRecarga],
  );

  const subirDocumento = useCallback(
    async (p: PeticionVista, d: { tipo: string; nombre: string; archivo: File }) => {
      const tipo = cat.data?.tiposDocumento.find((t) => t.name === d.tipo);
      if (!tipo) throw new ApiError(422, 'validacion', `No existe el tipo de documento «${d.tipo}» en la tabla maestra`);
      return documentoVista(await repos.documents.upload({ entityType: 'request', entityId: p._id, typeId: tipo.id, name: d.nombre.trim() || d.archivo.name, file: d.archivo }));
    },
    [cat.data],
  );
  const quitarDocumento = useCallback((documentId: string) => repos.documents.remove(documentId), []);

  return {
    seleccionDe,
    bolsa,
    proponer,
    confirmar,
    retirar,
    cambiarEtapa,
    listado: lista.data,
    cargando: lista.loading,
    error: lista.error ? mensajeError(lista.error) : null,
    recargar,
    /** Fases 6 y 7 (solo demo): null contra la API. */
    seleccion: sel.data ?? null,
    seleccionCargando: sel.loading,
    responsables,
    tiposDocumento,
    supuestos,
    puedeEditar: permisos.includes('requests.manage'),
    abrir,
    cambiarEstado,
    guardarHorario,
    guardarServicio,
    crear,
    duplicar,
    buscarPresupuestos,
    generarCpdPrevio,
    marcarCpdPrevio,
    subirDocumento,
    quitarDocumento,
    descargarDocumento,
  };
}
