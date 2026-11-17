// Datos de Candidatos (CandidatosView.jsx): listado, ficha, edición, documentos con caducidad, contactos, candidaturas
// por petición, consentimiento, supresión y exportación RGPD y auditoría de accesos. La vista recibe los candidatos en
// su forma (mapeo.ts) y funciones. Contrato: fase6-backend.md.
//
// - La bolsa es común a toda la ETT; las peticiones del asistente, las de la sucursal de la cabecera.
// - Lo sensible llega enmascarado. `revelar` pide el valor a la API (queda auditado) y lo devuelve: no se guarda en
//   ningún estado de aquí, ni en caché ni en localStorage.
import { useCallback, useMemo } from 'react';
import {
  ApiError,
  repos,
  useData,
  type CandidateCatalog,
  type CandidateCatalogItem,
  type CatalogItem,
  type Repositories,
  type ServiceRequestSummary,
} from '../../data';
import { canalApi, codigoDeTipo, origenApi } from '../../data/candidatosValores';
import { useSesion } from '../../sesion';
import { esError, fechaHora, mensajeError } from '../comun/datos';
import { ESTADOS as ESTADOS_PETICION } from '../peticiones/mapeo';
import { candidatoApi, candidatoVista, catalogosVista, documentoVista, tipoDocumentoVista, type CandidatoVista } from './mapeo';

export { mensajeError };

type Catalogos = { perfiles: CandidateCatalogItem[]; carnes: CandidateCatalogItem[]; habilidades: CandidateCatalogItem[]; idiomas: CandidateCatalogItem[]; tiposDocumento: CatalogItem[] };
async function cargarCatalogos(r: Repositories): Promise<Catalogos> {
  const lista = (c: CandidateCatalog) => r.candidateCatalog.list(c).catch(() => [] as CandidateCatalogItem[]);
  const [perfiles, carnes, habilidades, idiomas, tiposDocumento] = await Promise.all([
    lista('candidate_profile'),
    lista('license'),
    lista('skill'),
    lista('language'),
    r.catalogItems.list({ type: 'document_type', status: 'active', limit: 200 }).then((p) => p.data, () => [] as CatalogItem[]),
  ]);
  return { perfiles, carnes, habilidades, idiomas, tiposDocumento };
}

const PLAZA: Record<string, string> = { open: 'Vacante', reserved: 'Pendiente del cliente', covered: 'Cubierta', started: 'Cubierta', left: 'Vacante' };

/** Petición de la API → la del asistente «Asignar a petición» (una petición = un puesto). */
function peticionVista(r: ServiceRequestSummary, detalle?: Awaited<ReturnType<Repositories['requests']['get']>>) {
  const plazas = detalle
    ? detalle.slotList.map((s) => ({ plazaNum: s.number, status: PLAZA[s.status] ?? 'Vacante', candidateName: s.candidateName ?? null, candidateId: s.candidateId ?? null, _slotId: s.id, _applicationId: s.applicationId ?? null }))
    : Array.from({ length: r.positionsCount }, (_, i) => ({
        plazaNum: i + 1,
        status: i < r.slots.filled ? 'Cubierta' : i < r.slots.filled + r.slots.reserved ? 'Pendiente del cliente' : 'Vacante',
        candidateName: null, candidateId: null, _slotId: null, _applicationId: null,
      }));
  return {
    id: r.code,
    _id: r.id,
    client: r.clientName,
    cif: detalle?.clientTaxId ?? '',
    workplace: detalle?.clientCenterName ?? '',
    status: ESTADOS_PETICION[r.status],
    startDate: r.startDate ?? '',
    positions: [{
      id: `POS-${r.code}`,
      title: r.positionName,
      category: r.positionName,
      turn: r.shiftName ?? 'Sin turno',
      rate: detalle?.conditions.collectiveAgreementName ?? '',
      requiredExperience: '',
      mandatoryRequirements: ['DNI/NIE en vigor', ...(detalle?.requiredLicenses ? [detalle.requiredLicenses] : [])],
      plazasTotal: r.positionsCount,
      plazas,
    }],
  };
}

export function useCandidatos() {
  const { me, sucursal } = useSesion();
  const permisos = me?.permissions ?? [];
  const cat = useData(cargarCatalogos, []);
  const lista = useData((r) => r.candidates.list({ limit: 200 }).then((p) => p.data.map((x) => candidatoVista(x))), []);
  const pets = useData(
    (r) => r.requests.list({ branchId: sucursal ?? undefined, status: 'active', limit: 200 }).then((p) => p.data, () => [] as ServiceRequestSummary[]),
    [sucursal],
  );

  const c = cat.data;
  const catalogos = useMemo(() => (c ? catalogosVista(c) : undefined), [c]);
  const peticiones = useMemo(() => (pets.data ?? []).map((x) => peticionVista(x)), [pets.data]);
  const peticionesInfo = useMemo(
    () => Object.fromEntries((pets.data ?? []).map((x) => [x.code, { puesto: x.positionName, turno: x.shiftName ?? '', cliente: x.clientName, centro: '', inicio: x.startDate ?? '', fin: x.endDate ?? '' }])),
    [pets.data],
  );

  // ---- Nombres ↔ ids de los listados ------------------------------------------------

  const ids = useMemo(() => {
    const por = (l: CandidateCatalogItem[] | undefined, n: string) => l?.find((x) => x.name === n)?.id ?? null;
    return {
      perfil: (n: string) => por(c?.perfiles, n),
      atributo: (catalog: 'license' | 'skill', n: string) => por(catalog === 'license' ? c?.carnes : c?.habilidades, n),
      idioma: (n: string) => por(c?.idiomas, n),
    };
  }, [c]);
  const tipoPorTypeId = useCallback((typeId: string) => tipoDocumentoVista(c?.tiposDocumento.find((t) => t.id === typeId)?.code), [c]);
  const typeIdDe = (tipo: string) => {
    const code = codigoDeTipo(tipo);
    return c?.tiposDocumento.find((t) => t.code === code)?.id ?? c?.tiposDocumento.find((t) => t.name === 'Otro documento')?.id ?? null;
  };

  /** Añade un valor a un listado (si ya existe por nombre o sinónimo, devuelve el que había). */
  const anadirACatalogo = useCallback(
    async (tipo: 'perfiles' | 'carnes' | 'habilidades' | 'idiomas', nombre: string, grupo?: string) => {
      const catalog: CandidateCatalog = { perfiles: 'candidate_profile', carnes: 'license', habilidades: 'skill', idiomas: 'language' }[tipo] as CandidateCatalog;
      const x = await repos.candidateCatalog.create({ catalog, name: nombre, group: grupo ?? null });
      cat.reload();
      return x.name;
    },
    [cat],
  );

  // ---- Ficha ------------------------------------------------------------------------

  /** Consentimiento de bolsa con el texto de privacidad vigente (la API lo exige). */
  const textoVigente = async () => {
    const textos = await repos.candidates.privacyNotices('talent_pool');
    const vigente = [...textos].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!vigente) throw new ApiError(409, 'conflicto', 'Falta publicar el texto de privacidad de la bolsa (lo publica quien tiene privacy.manage): sin él no se puede registrar el consentimiento');
    return vigente;
  };
  const consentir = async (candidateId: string, documentId?: string | null, noticeId?: string) =>
    repos.candidates.addConsent(candidateId, { purpose: 'talent_pool', noticeId: noticeId ?? (await textoVigente()).id, channel: 'paper', documentId: documentId ?? null });

  /** La ficha completa (queda en la auditoría de accesos), con sus documentos y contactos. */
  const abrir = useCallback(
    async (v: CandidatoVista) => {
      const [r, docs, contactos] = await Promise.all([
        repos.candidates.get(v._id),
        repos.documents.list({ entityType: 'candidate', entityId: v._id, limit: 200 }).then((p) => p.data, () => []),
        repos.candidates.contacts(v._id).catch(() => []),
      ]);
      return candidatoVista(r, { documentos: docs.map((d) => documentoVista(d, tipoPorTypeId)), contactos });
    },
    [tipoPorTypeId],
  );
  const recargarFicha = (v: CandidatoVista) => abrir(v).then((x) => (lista.reload(), x));

  const guardar = useCallback(
    async (seccion: 'personal' | 'profesional' | 'disponibilidad', d: CandidatoVista, original: CandidatoVista) => {
      await repos.candidates.update(d._id, candidatoApi(seccion, d, original, ids));
      return recargarFicha(d);
    },
    [ids, abrir],
  );

  /** Alta rápida (y la importación de la demo). */
  const crear = useCallback(
    async (f: { name: string; lastName: string; dni?: string; dniExpiry?: string; phone?: string; email?: string; city?: string; nss?: string; category?: string; experience?: number; carretillero?: boolean; rgpd?: boolean; source?: string }) => {
      const carnes = [ids.atributo('license', 'Permiso B'), f.carretillero ? ids.atributo('license', 'Carné de carretillero') : null].filter((x): x is string => !!x);
      const r = await repos.candidates.create({
        firstName: f.name.trim(), lastName: f.lastName.trim(), phone: f.phone || null, email: f.email || null, city: f.city || null,
        source: origenApi(f.source), mainProfileId: f.category ? ids.perfil(f.category) : null, attributeIds: carnes,
        experienceYears: Number(f.experience) || null, status: 'available',
        ...(f.dni ? { idDocumentType: /^[XYZ]/i.test(f.dni) ? 'nie' : 'dni', idDocumentNumber: f.dni.toUpperCase(), idDocumentExpiresOn: f.dniExpiry || null } : {}),
        ...(f.nss ? { ssNumber: f.nss } : {}),
      } as Parameters<Repositories['candidates']['create']>[0]);
      if (f.rgpd) await consentir(r.id).catch(() => null);
      lista.reload();
      return candidatoVista(await repos.candidates.get(r.id));
    },
    [ids, lista],
  );

  /** Supresión RGPD: la API anonimiza (no se puede deshacer). */
  const suprimir = useCallback(async (v: CandidatoVista, motivo: string) => {
    await repos.candidates.anonymize(v._id, motivo);
    lista.reload();
  }, [lista]);
  /** Derecho de acceso: descarga un JSON con todo lo de la persona (queda en la auditoría). */
  const exportar = useCallback(async (v: CandidatoVista) => {
    const datos = await repos.candidates.exportData(v._id);
    const url = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${v.id}_datos_personales.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  /** Valor completo de un dato sensible (queda en la auditoría). No se guarda: quien lo pida lo enseña y lo olvida. */
  const revelar = useCallback(async (v: CandidatoVista, campo: 'dni' | 'nss' | 'iban'): Promise<string> => {
    const field = campo === 'dni' ? 'idDocument' : campo === 'nss' ? 'ssNumber' : 'iban';
    const r = await repos.candidates.sensitive(v._id, [field]).catch((e) => {
      // Sin clave de cifrado configurada en la API, lo sensible no se puede leer (el resto funciona)
      if (esError(e, 'servicio_no_disponible')) throw new ApiError(503, 'servicio_no_disponible', 'Los datos sensibles no están disponibles ahora: falta configurar el cifrado en el servidor.');
      throw e;
    });
    return (campo === 'dni' ? r.idDocument?.number : campo === 'nss' ? r.ssNumber : r.iban) ?? '';
  }, []);

  const contactar = useCallback(
    async (v: CandidatoVista, d: { channel: string; result: string; note?: string | null; nextAction?: string | null }) => {
      await repos.candidates.addContact(v._id, { ...d, channel: canalApi(d.channel) });
      return recargarFicha(v);
    },
    [abrir],
  );

  // ---- Documentos ---------------------------------------------------------------

  const subirDocumento = useCallback(
    async (v: CandidatoVista, d: { tipo: string; archivo: File; caducidad?: string | null; sustituye?: string | null }) => {
      const typeId = typeIdDe(d.tipo);
      if (!typeId) throw new ApiError(422, 'validacion', `No existe el tipo de documento «${d.tipo}» en la tabla maestra`);
      // El consentimiento firmado se registra con el texto de privacidad vigente: se comprueba antes de subir nada
      const texto = d.tipo === 'RGPD' ? await textoVigente() : null;
      // Renovar: el nuevo sustituye al anterior (que queda eliminado)
      const doc = await repos.documents.upload({ entityType: 'candidate', entityId: v._id, typeId, name: d.archivo.name, file: d.archivo, expiresOn: d.caducidad || null, replacesDocumentId: d.sustituye || null });
      // El documento de identidad lleva su caducidad a la ficha; el consentimiento firmado, a los consentimientos
      if (d.tipo === 'DNI/NIE' && d.caducidad) await repos.candidates.update(v._id, { idDocumentExpiresOn: d.caducidad });
      if (texto) await consentir(v._id, doc.id, texto.id);
      return recargarFicha(v);
    },
    [abrir, c],
  );
  const validarDocumento = useCallback(async (v: CandidatoVista, docId: string) => {
    await repos.documents.update(docId, { status: 'validated' });
    return recargarFicha(v);
  }, [abrir]);
  const rechazarDocumento = useCallback(async (v: CandidatoVista, docId: string, motivo: string) => {
    await repos.documents.reject(docId, motivo);
    return recargarFicha(v);
  }, [abrir]);
  const quitarDocumento = useCallback(async (v: CandidatoVista, docId: string) => {
    await repos.documents.remove(docId);
    return recargarFicha(v);
  }, [abrir]);
  /** Abre el documento (la descarga queda en la auditoría). false si no hay fichero (en la demo). */
  const descargarDocumento = useCallback(async (docId: string) => {
    try {
      const url = await repos.documents.downloadUrl(docId);
      if (url) window.open(url, '_blank', 'noopener');
      return !!url;
    } catch (e) {
      if (esError(e, 'no_encontrado')) return false;
      throw e;
    }
  }, []);
  /** Marca el aviso de renovación (el correo real llega más adelante). */
  const avisarRenovacion = useCallback(async (v: CandidatoVista, docIds: string[], nota: string) => {
    await Promise.all(docIds.map((x) => repos.documents.renewalNotice(x)));
    await repos.candidates.addContact(v._id, { channel: 'email', result: 'Aviso de renovación', note: nota }).catch(() => null);
    return recargarFicha(v);
  }, [abrir]);

  // ---- Candidaturas ---------------------------------------------------------------

  /** Detalle de una petición con quién ocupa cada plaza (para el paso «Plaza» del asistente). */
  const cargarPeticion = useCallback(async (codigo: string) => {
    const s = pets.data?.find((x) => x.code === codigo);
    if (!s) return null;
    return peticionVista(s, await repos.requests.get(s.id));
  }, [pets.data]);

  /** «Añadir a la selección» o «Proponer al cliente» (reserva la plaza elegida). */
  const asignar = useCallback(
    async (v: CandidatoVista, codigo: string, modo: 'seleccion' | 'propuesta', slotId: string | null, nota?: string, aceptacion?: boolean) => {
      const p = pets.data?.find((x) => x.code === codigo);
      if (!p) throw new ApiError(404, 'no_encontrado', `No encuentro la petición ${codigo}`);
      const existente = (await repos.applications.list({ candidateId: v._id, requestId: p.id }))[0];
      // Sin consentimiento de bolsa vigente, hace falta anotar que la persona aceptó presentarse a esta petición
      const app = existente ?? (await repos.applications.create({
        candidateId: v._id, requestId: p.id, origin: 'sourced', notes: nota || null, ...(aceptacion ? { candidateAcceptance: { channel: 'phone' as const } } : {}),
      }));
      let avisos: { ok: boolean; message: string }[] = [];
      if (modo === 'propuesta') avisos = (await repos.applications.propose(app.id, slotId)).requirements ?? [];
      pets.reload();
      return { ficha: await recargarFicha(v), avisos: avisos.filter((x) => !x.ok).map((x) => x.message) };
    },
    [pets, abrir],
  );
  /** Cambia una candidatura desde la ficha: descartar, retirar la propuesta o confirmar. */
  const cambiarCandidatura = useCallback(
    async (v: CandidatoVista, appId: string, estado: string) => {
      if (estado === 'Descartada') await repos.applications.update(appId, { stage: 'discarded' });
      else if (estado === 'Confirmada') await repos.applications.confirm(appId);
      else if (estado === 'En selección') await repos.applications.release(appId);
      else throw new ApiError(422, 'validacion', `«${estado}» llega con Contratos y altas (fase 7)`);
      pets.reload();
      return recargarFicha(v);
    },
    [pets, abrir],
  );

  /** Búsqueda exacta por DNI/NIE (la API busca por la huella, sin descifrar). */
  const buscarPorDocumento = useCallback(
    (texto: string) => repos.candidates.list({ idDocumentNumber: texto.trim().toUpperCase(), limit: 20 }).then((p) => p.data.map((x) => candidatoVista(x)), () => [] as CandidatoVista[]),
    [],
  );

  // ---- Auditoría ---------------------------------------------------------------------

  const ACCIONES: Record<string, string> = {
    view_record: 'Abrió la ficha', view_sensitive: 'Vio datos sensibles', download_document: 'Descargó un documento', export: 'Exportó sus datos', anonymize: 'Anonimizó la ficha',
  };
  const auditoria = useCallback(async (v: CandidatoVista) => {
    const p = await repos.accessLog.list({ candidateId: v._id, limit: 100 });
    return p.data.map((x) => ({ id: x.id, fecha: fechaHora(x.occurredAt), usuario: x.actorName ?? '—', accion: ACCIONES[x.action] ?? x.action, detalle: x.details ? Object.values(x.details).flat().join(', ') : '' }));
  }, []);

  return {
    listado: lista.data,
    cargando: lista.loading || cat.loading,
    error: lista.error ? mensajeError(lista.error) : cat.error ? mensajeError(cat.error) : null,
    recargar: lista.reload,
    catalogos,
    peticiones,
    peticionesInfo,
    puedeEditar: permisos.includes('candidates.manage'),
    puedeVerSensibles: permisos.includes('personal_data.view'),
    puedePrivacidad: permisos.includes('privacy.manage'),
    puedeAuditar: permisos.includes('privacy.audit'),
    anadirACatalogo,
    abrir,
    guardar,
    crear,
    suprimir,
    exportar,
    revelar,
    contactar,
    subirDocumento,
    validarDocumento,
    rechazarDocumento,
    quitarDocumento,
    descargarDocumento,
    avisarRenovacion,
    cargarPeticion,
    buscarPorDocumento,
    asignar,
    cambiarCandidatura,
    auditoria,
  };
}
