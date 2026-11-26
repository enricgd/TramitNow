// Datos de Contratos y altas (LaboralView.jsx): expedientes de contratación (fase7-backend.md), uno por persona y plaza,
// con sus cinco pasos. Lo que se hace fuera (firma del CPD y del contrato, Contrat@, Sistema RED) se registra a mano con
// su fecha y su justificante. Qué bloquea y qué avisa lo calcula la API (en la demo, el mismo módulo).
import { useCallback, useMemo, useState } from 'react';
import {
  ApiError,
  repos,
  useData,
  type CatalogItem,
  type ContractKey,
  type DocumentEntityType,
  type EmploymentContractCreate,
  type EmploymentContractUpdate,
  type HiringFile,
  type HiringFileQuery,
  type HiringFileUpdate,
  type ServiceRequest,
} from '../../data';
import { useSesion } from '../../sesion';
import { mensajeError as mensajeErrorComun } from '../comun/datos';
import { EXPLICACION_BLOQUEO } from '../peticiones/mapeo';
import { PASO_API, expedienteVista, peticionLaboralVista, type ExpedienteVista } from './mapeo';

export type { ExpedienteVista };

/** Como mensajeError, con los bloqueos del art. 8 explicados en lenguaje claro. */
export function mensajeError(e: unknown) {
  if (e instanceof ApiError) {
    const explicadas = [e.code, ...(e.details?.map((d) => d.path) ?? [])].map((c) => EXPLICACION_BLOQUEO[c]).filter(Boolean);
    if (explicadas.length) return [...new Set(explicadas)].join(' ');
  }
  return mensajeErrorComun(e);
}

const ESTADO: Record<string, HiringFileQuery['state']> = { pendientes: 'pending', listos: 'ready', bloqueados: 'blocked', completos: 'complete', todos: 'all' };
/** Tipo de documento (código de la tabla maestra) de cada justificante. */
export const TIPO_JUSTIFICANTE = {
  contrato: 'hiring_contract',
  contrata: 'hiring_contrata',
  copiaBasica: 'hiring_basic_copy',
  prl: 'hiring_prl_training',
  salud: 'hiring_health_fitness',
  epi: 'hiring_ppe_delivery',
  alta: 'hiring_ss_registration',
  cpd: 'request_cpd_signed',
} as const;
type Justificante = keyof typeof TIPO_JUSTIFICANTE;

export function useLaboral() {
  const { sucursal, me } = useSesion();
  const permisos = me?.permissions ?? [];
  const branchId = sucursal ?? undefined;
  const [consulta, setConsulta] = useState<HiringFileQuery>({});
  const lista = useData((r) => r.hiringFiles.list({ ...consulta, branchId, limit: 200 }), [JSON.stringify(consulta), branchId]);
  // Todos los abiertos de la sucursal: desplegable de peticiones y vista por petición
  const todos = useData((r) => r.hiringFiles.list({ branchId, limit: 200 }), [branchId]);
  const tipos = useData((r) => r.catalogItems.list({ type: 'document_type', status: 'active', limit: 200 }).then((p) => p.data, () => [] as CatalogItem[]), []);
  const claves = useData((r) => r.catalogs.contractKeys().catch(() => [] as ContractKey[]), []);

  const expedientes = useMemo(() => (lista.data?.data ?? []).map(expedienteVista), [lista.data]);
  const todosVista = useMemo(() => (todos.data?.data ?? []).map(expedienteVista), [todos.data]);

  /** Filtros de la vista → consulta al servidor. */
  const filtrar = useCallback((f: { q: string; estado: string; paso: string; peticion: string }) => {
    const peticion = todosVista.find((x) => x.petId === f.peticion);
    const siguiente: HiringFileQuery = {
      ...(f.q.trim() ? { q: f.q.trim() } : {}),
      ...(ESTADO[f.estado] ? { state: ESTADO[f.estado] } : {}),
      ...(PASO_API[f.paso] ? { missingStep: PASO_API[f.paso] } : {}),
      ...(peticion ? { requestId: peticion._requestId } : {}),
    };
    setConsulta((prev) => (JSON.stringify(prev) === JSON.stringify(siguiente) ? prev : siguiente));
  }, [todosVista]);

  const peticiones = useMemo(() => {
    const porCodigo = new Map<string, ExpedienteVista[]>();
    for (const e of todosVista) porCodigo.set(e.petId, [...(porCodigo.get(e.petId) ?? []), e]);
    return Object.fromEntries([...porCodigo].map(([code, l]) => [code, peticionLaboralVista(code, l)]));
  }, [todosVista]);

  // Detalle de una petición: sus datos (categoría, convenio, salario, CPD) y las plazas sin expediente
  const [detalle, setDetalle] = useState<{ code: string; peticion: ServiceRequest | null } | null>(null);
  const abrirPeticion = useCallback(async (code: string) => {
    const e = todosVista.find((x) => x.petId === code);
    setDetalle({ code, peticion: null });
    if (!e) return;
    const r = await repos.requests.get(e._requestId).catch(() => null);
    setDetalle((d) => (d?.code === code ? { code, peticion: r } : d));
  }, [todosVista]);
  const peticionDetalle = useMemo(
    () => (detalle ? peticionLaboralVista(detalle.code, todosVista.filter((e) => e.petId === detalle.code), detalle.peticion) : null),
    [detalle, todosVista],
  );

  const recargar = useCallback(() => { lista.reload(); todos.reload(); }, [lista, todos]);
  /** Ficha completa del expediente (contratos, PRL, alta, CPD y documentación). */
  const abrir = useCallback(async (id: string) => expedienteVista(await repos.hiringFiles.get(id)), []);
  const tras = useCallback(async (p: Promise<HiringFile>) => {
    const f = await p;
    recargar();
    return expedienteVista(f);
  }, [recargar]);

  /** Sube un justificante (al expediente o, el CPD firmado, a la petición) y devuelve su id. */
  const subir = useCallback(async (tipo: Justificante, entityType: DocumentEntityType, entityId: string, archivo: File) => {
    const codigo = TIPO_JUSTIFICANTE[tipo];
    const typeId = tipos.data?.find((t) => t.code === codigo)?.id;
    if (!typeId) throw new ApiError(422, 'validacion', 'Falta el tipo de documento en la tabla maestra');
    const doc = await repos.documents.upload({ entityType, entityId, typeId, name: archivo.name, file: archivo });
    return doc.id;
  }, [tipos.data]);

  /**
   * PRL (formación, vigilancia de la salud, EPI) o alta. `archivos`: justificantes nuevos por campo de documento
   * (p. ej. `{ prlTrainingDocumentId: File }`): se suben y se manda su id.
   */
  const guardar = useCallback(async (e: ExpedienteVista, datos: HiringFileUpdate, archivos: Partial<Record<keyof HiringFileUpdate, { tipo: Justificante; archivo: File }>> = {}) => {
    const body = { ...datos } as Record<string, unknown>;
    for (const [campo, a] of Object.entries(archivos)) if (a) body[campo] = await subir(a.tipo, 'hiring_file', e.id, a.archivo);
    return tras(repos.hiringFiles.update(e.id, body as HiringFileUpdate));
  }, [subir, tras]);

  /** Contrato nuevo (contractId null) o cambios en uno. Archivos: contrato firmado, Contrat@ y copia básica. */
  const guardarContrato = useCallback(async (
    e: ExpedienteVista,
    contractId: string | null,
    datos: EmploymentContractCreate | EmploymentContractUpdate,
    archivos: Partial<Record<'documentId' | 'contrataDocumentId' | 'basicCopyDocumentId', File | null>> = {},
  ) => {
    const tipo = { documentId: 'contrato', contrataDocumentId: 'contrata', basicCopyDocumentId: 'copiaBasica' } as const;
    const body = { ...datos } as Record<string, unknown>;
    for (const [campo, archivo] of Object.entries(archivos)) if (archivo) body[campo] = await subir(tipo[campo as keyof typeof tipo], 'hiring_file', e.id, archivo);
    return tras(contractId ? repos.hiringFiles.updateContract(contractId, body) : repos.hiringFiles.addContract(e.id, body as EmploymentContractCreate));
  }, [subir, tras]);
  const anularContrato = useCallback((contractId: string, motivo: string) => tras(repos.hiringFiles.cancelContract(contractId, motivo)), [tras]);

  /** CPD firmado por la empresa usuaria: es de la petición (vale para todos sus expedientes). */
  const registrarCpdFirmado = useCallback(async (e: ExpedienteVista, fechaFirma: string, archivo: File | null) => {
    if (!archivo) throw new ApiError(400, 'validacion', 'Adjunta el CPD firmado');
    if (!fechaFirma) throw new ApiError(400, 'validacion', 'Pon la fecha de firma');
    const documentId = await subir('cpd', 'request', e._requestId, archivo);
    await repos.requests.setCpdSigned(e._requestId, { documentId, signedAt: fechaFirma });
    recargar();
    return abrir(e.id);
  }, [subir, recargar, abrir]);

  const verDocumento = useCallback(async (documentId: string) => {
    if (documentId.startsWith('demo-')) throw new ApiError(404, 'no_encontrado', 'En la demo, los justificantes de ejemplo no tienen archivo');
    const url = await repos.documents.downloadUrl(documentId);
    if (url) window.open(url, '_blank', 'noopener');
  }, []);

  const f = lista.data?.facets;
  return {
    estado: lista.error && !lista.data ? 'error' : !lista.data || !todos.data ? 'cargando' : 'listo',
    error: lista.error ? mensajeError(lista.error) : null,
    reintentar: recargar,
    expedientes,
    todos: todosVista,
    peticiones,
    filtrar,
    facetas: f ? { total: f.total, listos: f.ready, pendientes: f.pending, bloqueados: f.blocked, completos: f.complete, empiezanPronto: f.startingSoonNotReady, sinCpd: f.missingByStep.cpd } : null,
    claves: claves.data ?? [],
    abrirPeticion,
    peticionDetalle,
    abrir,
    guardar,
    guardarContrato,
    anularContrato,
    registrarCpdFirmado,
    verDocumento,
    // Un permiso por tipo de paso (decisión 22). El CPD firmado también pide requests.manage.
    puede: {
      documentacion: permisos.includes('hiring_files.documentation'),
      cpd: permisos.includes('hiring_files.cpd') && permisos.includes('requests.manage'),
      contrato: permisos.includes('hiring_files.contract'),
      prl: permisos.includes('hiring_files.prl'),
      alta: permisos.includes('hiring_files.ss'),
    },
  };
}
