// Contratos y altas: expediente de la API (HiringFile, fase7-backend.md) ↔ el de la pantalla del diseñador
// (LaboralView.jsx). La API calcula estados, avisos, «listo» y la próxima tarea: aquí solo se traducen.
import type { HiringFile, HiringFileSummary, HiringIssue, HiringStepId, ServiceRequest } from '../../data';
import { eurosHora, fecha } from '../../ui/formato';

/** Paso de la API ↔ id del paso en la vista (PASOS). */
export const PASO: Record<HiringStepId, string> = { documentation: 'doc', cpd: 'cpd', contract: 'contrato', prl: 'prl', ss_registration: 'alta' };
export const PASO_API = Object.fromEntries(Object.entries(PASO).map(([k, v]) => [v, k])) as Record<string, HiringStepId>;
const ESTADO = { done: 'hecho', in_progress: 'en_curso', pending: 'pendiente', blocked: 'bloqueado' } as const;

const aviso = (i: HiringIssue) => ({ codigo: i.code, gravedad: i.severity, texto: i.message, plazo: i.dueDate ?? null });

/** Expediente de la API (fila o ficha) → el de la vista. `id` es el del expediente; `petId`, el código de la petición. */
export function expedienteVista(f: HiringFileSummary | HiringFile) {
  const todos = [...f.issues, ...f.steps.flatMap((s) => s.issues)];
  const detalle = 'prl' in f ? f : null;
  return {
    id: f.id,
    petId: f.requestCode,
    _requestId: f.requestId,
    _candidateId: f.candidateId,
    candidato: f.candidateCode,
    plaza: f.slotNumber ?? 0,
    nombre: f.candidateName,
    dni: f.idDocument.masked ?? '',
    telefono: f.candidatePhone ?? '',
    email: f.candidateEmail ?? '',
    inicio: f.startDate ?? '',
    puesto: f.positionName,
    turno: f.shiftName ?? 'Sin turno',
    cliente: f.clientName,
    centro: f.clientCenterName ?? 'Centro sin indicar',
    plazas: f.positionsCount,
    pasos: Object.fromEntries(f.steps.map((s) => [PASO[s.id], { estado: ESTADO[s.state], nombre: s.name, bloquea: s.requiredForReady, avisos: s.issues.map(aviso) }])) as Record<string, { estado: string; nombre: string; bloquea: boolean; avisos: ReturnType<typeof aviso>[] }>,
    /** ready | pending | blocked | cancelled */
    estadoGeneral: f.state,
    completo: f.complete,
    listo: f.ready,
    hechos: f.completedSteps,
    /** Lo que impide empezar: prohibiciones («blocked») y pasos legales pendientes («required»). */
    bloqueos: todos.filter((i) => i.severity !== 'warning').map(aviso),
    avisos: todos.filter((i) => i.severity === 'warning').map(aviso),
    siguiente: f.nextTask ? { pasoId: f.nextTask.step ? PASO[f.nextTask.step] : null, codigo: f.nextTask.code, gravedad: f.nextTask.severity, texto: f.nextTask.message } : null,
    detalle,
  };
}
export type ExpedienteVista = ReturnType<typeof expedienteVista>;

/** Datos de la petición que enseña la cabecera del detalle (PETICIONES del diseño). */
export function peticionLaboralVista(code: string, lista: ExpedienteVista[], r?: ServiceRequest | null) {
  const e = lista[0];
  const conExpediente = new Set(lista.map((x) => x.plaza));
  const PLAZA: Record<string, string> = { open: 'Por cubrir', reserved: 'Pendiente del cliente' };
  return {
    id: code,
    _id: r?.id ?? e?._requestId ?? '',
    puesto: r?.positionName ?? e?.puesto ?? '',
    turno: r?.shiftName ?? e?.turno ?? 'Sin turno',
    plazas: r?.positionsCount ?? e?.plazas ?? lista.length,
    cliente: r?.clientName ?? e?.cliente ?? '',
    centro: r?.clientCenterName ?? e?.centro ?? 'Centro sin indicar',
    presupuesto: r ? `${r.quoteCode} v${r.quoteVersionNumber}` : '',
    inicio: r?.startDate ?? e?.inicio ?? '',
    fin: r?.endDate ?? '',
    responsable: r?.responsibleName ?? '—',
    categoria: r?.conditions.categoryName ?? '',
    convenio: r?.conditions.collectiveAgreementName ?? '',
    salario: r?.conditions.grossSalaryHour != null ? eurosHora(r.conditions.grossSalaryHour) : '',
    cpdPrevio: !r ? '' : r.preCpd.reviewedAt ? `Revisado por el cliente el ${fecha(r.preCpd.reviewedAt)}` : r.preCpd.sentAt ? `Enviado el ${fecha(r.preCpd.sentAt)}` : 'Sin enviar',
    cpdFirmado: r?.cpdSigned ? `Firmado el ${fecha(r.cpdSigned.signedAt)}` : r ? 'Sin registrar' : '',
    sinExpediente: (r?.slotList ?? [])
      .filter((s) => !conExpediente.has(s.number) && s.status !== 'covered' && s.status !== 'started')
      .map((s) => ({ plaza: s.number, texto: s.candidateName ? `${PLAZA[s.status] ?? 'Pendiente'}: ${s.candidateName}` : PLAZA[s.status] ?? 'Por cubrir' })),
  };
}
