// Expedientes de contratación de ejemplo (fase 7, Contratos y altas), como los devuelve la API (fase7-backend.md): las
// personas y estados del diseño (LaboralView.jsx) sobre las peticiones de ejemplo, con ejemplos de todos los estados.
// El estado de cada paso, «listo» y la próxima tarea los calcula el módulo de la API (calculoExpedientes.ts).
import type { Repositories } from './repositorios';
import {
  ApiError,
  type EmploymentContract,
  type EmploymentContractCreate,
  type HiringFile,
  type HiringFileFacets,
  type HiringFileSummary,
  type HiringFileUpdate,
  type ServiceRequest,
} from './tipos';
import { fileStatus } from './calculoExpedientes';
import { delay, newId, page } from './memoriaBase';
import { documentosDeEntidad } from './memoriaEmpresas';
import { legalDePeticion, memoryRequestRepositories } from './memoriaPeticiones';
import { enmascarar } from './candidatosValores';
import { contactoDemo } from '../views/personasDemo';

const YO = 'Usuario Demo';
/** Días de Mi ETT para Contrat@ y la copia básica (10 por defecto) [verificar]. */
const AJUSTES = { contractCommunicationDays: 10, basicCopyDays: 10 };
const CLAVES: Record<string, string> = {
  '402': 'Duración determinada, tiempo completo, circunstancias de la producción',
  '502': 'Duración determinada, tiempo parcial, circunstancias de la producción',
  '410': 'Duración determinada, tiempo completo, sustitución',
  '510': 'Duración determinada, tiempo parcial, sustitución',
};

type Documentacion = HiringFile['documentation'] & { idDocumentNumber: boolean; pendingValidation: number };
type Registro = {
  id: string;
  applicationId: string;
  candidateId: string;
  candidateCode: string;
  nombre: string;
  requestCode: string;
  slotNumber: number;
  startDate: string | null;
  notes: string | null;
  documentation: Documentacion;
  prl: HiringFile['prl'];
  ss: HiringFile['ssRegistration'];
  contracts: EmploymentContract[];
  createdAt: string;
  updatedAt: string;
};

const dia = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const hoy = () => new Date().toISOString().slice(0, 10);
const ahora = () => new Date().toISOString();
const demoDoc = (que: string) => `demo-${que}-${newId()}`;

function contrato(inicio: string, firmado: boolean, contrata: boolean): EmploymentContract {
  const signedAt = firmado ? dia(inicio, -3) : null;
  return {
    id: newId(), kind: 'production', contractKey: '402', contractKeyName: CLAVES['402'], startDate: inicio, endDate: dia(inicio, 85), substitutionReason: null,
    signedAt, documentId: firmado ? demoDoc('contrato') : null,
    contrataCommunicatedAt: contrata ? dia(inicio, 1) : null, contrataReference: null, contrataDocumentId: null, contrataDueDate: dia(inicio, AJUSTES.contractCommunicationDays),
    basicCopyDeliveredAt: contrata ? dia(inicio, 2) : null, basicCopyDocumentId: null, basicCopyDueDate: signedAt ? dia(signedAt, AJUSTES.basicCopyDays) : null,
    status: 'active', cancelReason: null, notes: null, createdByName: 'Ane Uriarte', createdAt: `${dia(inicio, -4)}T10:00:00.000Z`,
  };
}

// Una letra por paso del diseño (doc, cpd, contrato, prl, alta): h hecho, e en curso, p pendiente, b bloqueado. El CPD
// firmado es de la petición (memoriaPeticiones.ts), así que su letra no cuenta aquí.
function semilla(requestCode: string, plaza: number, nombre: string, estados: string, inicio: string, opciones: { sinContrata?: boolean } = {}): Registro {
  const [d, , k, p, a] = estados.split('');
  const persona = contactoDemo(nombre) as { id?: string } | null;
  const documentation: Documentacion = {
    idDocumentNumber: true,
    idDocumentExpiresOn: d === 'b' ? dia(inicio, -20) : '2030-06-30',
    idScan: d === 'e' ? 'pending' : d === 'p' ? null : 'validated',
    ssNumber: d === 'p' ? null : { masked: '•••••0000' },
    iban: d === 'p' ? null : { masked: '•••••1234' },
    pendingValidation: d === 'e' ? 1 : 0,
    documents: [
      { id: newId(), typeCode: 'candidate_id_document', typeName: 'DNI o NIE', name: `DNI_${nombre.split(' ')[0]}.pdf`, status: d === 'e' ? 'pending' : 'validated', expiresOn: d === 'b' ? dia(inicio, -20) : '2030-06-30', expiredAtStart: d === 'b' },
      { id: newId(), typeCode: 'candidate_privacy_consent', typeName: 'Consentimiento RGPD', name: `RGPD_${nombre.split(' ')[0]}.pdf`, status: 'validated', expiresOn: null, expiredAtStart: false },
    ],
  };
  const prlHecho = p === 'h' || p === 'e' || p === 'b';
  return {
    id: newId(), applicationId: newId(), candidateId: newId(), candidateCode: persona?.id ?? 'CAN-0000', nombre, requestCode, slotNumber: plaza,
    startDate: inicio, notes: null, documentation,
    prl: {
      trainingDate: prlHecho ? dia(inicio, -4) : null, trainingHours: prlHecho ? 20 : null, trainingDocumentId: prlHecho ? demoDoc('prl') : null,
      healthSurveillanceResult: p === 'h' ? 'fit' : p === 'b' ? 'unfit' : null, healthSurveillanceDate: p === 'h' || p === 'b' ? dia(inicio, -5) : null, healthSurveillanceDocumentId: null,
      ppeDeliveredAt: p === 'h' ? dia(inicio, -1) : null, ppeNotes: null, ppeDocumentId: null,
    },
    ss: a === 'h' ? { date: dia(inicio, -1), documentId: demoDoc('alta'), recordedByName: 'Ane Uriarte', recordedAt: `${dia(inicio, -1)}T10:00:00.000Z` } : { date: null, documentId: null, recordedByName: null, recordedAt: null },
    contracts: k === 'h' || k === 'e' ? [contrato(inicio, k === 'h', k === 'h' && !opciones.sinContrata)] : [],
    createdAt: `${dia(inicio, -12)}T09:00:00.000Z`, updatedAt: `${dia(inicio, -1)}T09:00:00.000Z`,
  };
}

let estado: Promise<{ expedientes: Registro[]; peticiones: Map<string, ServiceRequest> }> | undefined;
const requests = () => memoryRequestRepositories().requests;
async function crearEstado() {
  const peticiones = new Map<string, ServiceRequest>();
  for (const code of ['PET-2026-0048', 'PET-2026-0050', 'PET-2026-0045', 'PET-2026-0044']) {
    const s = (await requests().list({ q: code, limit: 5 })).data.find((x) => x.code === code);
    if (s) peticiones.set(code, await requests().get(s.id));
  }
  const ini = (code: string) => peticiones.get(code)?.startDate ?? hoy();
  const e = (code: string, plaza: number, nombre: string, estados: string, opciones?: { sinContrata?: boolean }) => semilla(code, plaza, nombre, estados, ini(code), opciones);
  const expedientes = [
    e('PET-2026-0048', 1, 'Jon Ander Etxebarria Bilbao', 'hhhhh'),
    // Contrato firmado sin Contrat@ ni copia básica: avisa del plazo vencido, pero está listo
    e('PET-2026-0048', 2, 'Ainhoa Larrazabal Urkijo', 'hhhhh', { sinContrata: true }),
    // Documento de identidad caducado (avisa)
    e('PET-2026-0048', 3, 'Mamadou Diallo', 'bhppp'),
    e('PET-2026-0048', 4, 'Laura Morales San Sebastián', 'hepep'),
    e('PET-2026-0048', 5, 'Iker Agirrebeitia Mendia', 'hephp'),
    e('PET-2026-0050', 1, 'Unai García Zabaleta', 'hhepp'),
    // No apto en la vigilancia de la salud: bloquea
    e('PET-2026-0050', 2, 'Carlos Manuel Ortiz Reyes', 'hepbp'),
    e('PET-2026-0045', 1, 'Noa Serra Pons', 'hhhhp'),
    e('PET-2026-0045', 2, 'Hugo Martín Vera', 'hhhpp'),
    e('PET-2026-0045', 3, 'Ane Goikoetxea Ruiz', 'hhhhh'),
    e('PET-2026-0045', 4, 'Iván Molina Prat', 'ehhpp'),
    ...['Garazi Uribe Arana', 'Pablo Ruiz Cano', null, 'Youssef Amrani', 'Lucía Ferrer Sanz', 'Marc Puig Soler', 'Aitana Roca Vidal', 'Daniel Sousa Prieto', 'Irene Campos Gil', 'Óscar León Mena']
      .map((n, i) => n && e('PET-2026-0044', i + 1, n, 'hhhhh'))
      .filter((x): x is Registro => !!x),
  ];
  return { expedientes, peticiones };
}
const datos = () => (estado ??= crearEstado());

/** El expediente como lo devuelve la API (ficha completa; el resumen es lo mismo sin el detalle). */
async function vista(r: Registro, peticiones: Map<string, ServiceRequest>): Promise<HiringFile> {
  const p = peticiones.get(r.requestCode);
  const legal = p ? await legalDePeticion(p.id) : null;
  const persona = contactoDemo(r.nombre) as { dni?: string; telefono?: string; email?: string } | null;
  const { idDocumentNumber, pendingValidation, ...documentation } = r.documentation;
  const sinArt8 = { clientIsEtt: false, hazardousWork: false, hazardousException: null, declarations: { strike: null, downsizedPositions: null }, history: [], issues: [] };
  const st = fileStatus({
    today: hoy(), status: 'open', startDate: r.startDate,
    documentation: {
      idDocumentNumber, idDocumentExpiresOn: documentation.idDocumentExpiresOn, idScan: documentation.idScan, ssNumber: !!documentation.ssNumber, iban: !!documentation.iban,
      expiring: documentation.documents.filter((d) => d.expiresOn && d.typeCode !== 'candidate_id_document').map((d) => ({ name: d.typeName, expiresOn: d.expiresOn! })),
      pendingValidation,
    },
    cpd: { preCpdStatus: legal?.preCpdStatus ?? 'pending', signedAt: legal?.signedAt ?? null, art8: legal?.entrada ?? { clientIsEtt: false, hazardousWork: false, hazardousException: false, strike: null, downsizedPositions: null } },
    contracts: r.contracts,
    prl: { trainingDate: r.prl.trainingDate, trainingDocument: !!r.prl.trainingDocumentId, healthResult: r.prl.healthSurveillanceResult, ppeDeliveredAt: r.prl.ppeDeliveredAt },
    ss: { date: r.ss.date, document: !!r.ss.documentId },
    settings: AJUSTES,
  });
  return {
    id: r.id, status: 'open', cancelReason: null, ...st,
    startDate: r.startDate, endDate: p?.endDate ?? null, responsibleName: p?.responsibleName ?? null, requestId: p?.id ?? '', requestCode: r.requestCode, requestStatus: p?.status ?? 'covered', positionName: p?.positionName ?? '', shiftName: p?.shiftName ?? null,
    positionsCount: p?.positionsCount ?? 0, slotNumber: r.slotNumber, branchId: p?.branchId ?? '', clientId: p?.clientId ?? '', clientName: p?.clientName ?? '', clientCenterName: p?.clientCenterName ?? null,
    candidateId: r.candidateId, candidateCode: r.candidateCode, candidateName: r.nombre, candidatePhone: persona?.telefono ?? null, candidateEmail: persona?.email ?? null,
    idDocument: { type: persona?.dni?.startsWith('X') ? 'nie' : 'dni', masked: enmascarar(persona?.dni ?? null) },
    applicationId: r.applicationId, createdAt: r.createdAt, updatedAt: r.updatedAt,
    notes: r.notes, prl: r.prl, ssRegistration: r.ss, contracts: r.contracts,
    cpd: { preCpdStatus: legal?.preCpdStatus ?? 'pending', signedAt: legal?.signedAt ?? null, signedDocumentId: legal?.signedDocumentId ?? null, art8: legal?.art8 ?? sinArt8 },
    documentation,
  };
}
const resumen = (f: HiringFile): HiringFileSummary => {
  const { notes: _n, prl: _p, ssRegistration: _s, contracts: _c, cpd: _d, documentation: _o, ...x } = f;
  return x;
};

/** Un justificante tiene que ser del propio expediente (los de ejemplo, «demo-…», valen). */
const delExpediente = (r: Registro, documentId: string | null | undefined) =>
  !documentId || documentId.startsWith('demo-') || documentosDeEntidad('hiring_file', r.id).some((d) => d.id === documentId);

export function memoryHiringFileRepositories(): Pick<Repositories, 'hiringFiles'> {
  const todos = async () => {
    const e = await datos();
    return Promise.all(e.expedientes.map((r) => vista(r, e.peticiones)));
  };
  const buscar = async (id: string) => {
    const e = await datos();
    const r = e.expedientes.find((x) => x.id === id);
    if (!r) throw new ApiError(404, 'no_encontrado', 'El expediente no existe o no tienes acceso');
    return { r, e };
  };
  const buscarContrato = async (contractId: string) => {
    const e = await datos();
    const r = e.expedientes.find((x) => x.contracts.some((c) => c.id === contractId));
    if (!r) throw new ApiError(404, 'no_encontrado', 'El contrato no existe');
    return { r, e, c: r.contracts.find((c) => c.id === contractId)! };
  };
  const validarContrato = (r: Registro, c: Partial<EmploymentContract>) => {
    if (!c.startDate) throw new ApiError(400, 'validacion', 'Falta la fecha de inicio del contrato', [{ path: 'startDate', message: 'Obligatorio' }]);
    if (c.kind === 'production' && !c.endDate) throw new ApiError(400, 'validacion', 'Un contrato por circunstancias de la producción lleva fecha de fin', [{ path: 'endDate', message: 'Obligatorio' }]);
    if (c.kind === 'substitution' && !c.substitutionReason?.trim()) throw new ApiError(400, 'validacion', 'Un contrato de sustitución lleva el motivo (a quién sustituye y por qué)', [{ path: 'substitutionReason', message: 'Obligatorio' }]);
    if (!!c.signedAt !== !!c.documentId) throw new ApiError(400, 'validacion', 'El contrato firmado va con su fecha de firma y el documento', [{ path: 'documentId', message: 'Fecha de firma y documento juntos' }]);
    for (const k of ['documentId', 'contrataDocumentId', 'basicCopyDocumentId'] as const) {
      if (!delExpediente(r, c[k])) throw new ApiError(422, 'validacion', 'El documento tiene que ser de este expediente');
    }
  };
  const completar = (c: EmploymentContract): EmploymentContract => ({
    ...c, contractKeyName: CLAVES[c.contractKey] ?? c.contractKey, contrataDueDate: dia(c.startDate, AJUSTES.contractCommunicationDays),
    basicCopyDueDate: c.signedAt ? dia(c.signedAt, AJUSTES.basicCopyDays) : null,
  });
  return {
    hiringFiles: {
      async list(q = {}) {
        const texto = q.q?.trim().toLowerCase();
        const base = (await todos()).filter((f) =>
          (!q.requestId || f.requestId === q.requestId) && (!q.branchId || f.branchId === q.branchId) && (!q.clientId || f.clientId === q.clientId) &&
          (!q.candidateId || f.candidateId === q.candidateId) && (!q.startFrom || (f.startDate ?? '') >= q.startFrom) && (!q.startTo || (f.startDate ?? '') <= q.startTo) &&
          (!texto || [f.candidateName, f.candidateCode, f.requestCode, f.clientName, f.positionName].some((t) => t.toLowerCase().includes(texto))));
        const dias = (iso: string | null) => (iso ? Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${hoy()}T00:00:00Z`)) / 86_400_000) : 99);
        const facets: HiringFileFacets = {
          total: base.length,
          ready: base.filter((f) => f.state === 'ready').length,
          pending: base.filter((f) => f.state === 'pending').length,
          blocked: base.filter((f) => f.state === 'blocked').length,
          complete: base.filter((f) => f.complete).length,
          cancelled: 0,
          missingByStep: Object.fromEntries(['documentation', 'cpd', 'contract', 'prl', 'ss_registration'].map((s) => [s, base.filter((f) => f.steps.find((x) => x.id === s)?.state !== 'done').length])) as HiringFileFacets['missingByStep'],
          startingSoonNotReady: base.filter((f) => !f.ready && dias(f.startDate) <= 7).length,
        };
        const lista = base
          .filter((f) => (!q.state || q.state === 'all' ? true : q.state === 'complete' ? f.complete : f.state === q.state))
          .filter((f) => !q.missingStep || f.steps.find((s) => s.id === q.missingStep)?.state !== 'done')
          .sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? '') || a.requestCode.localeCompare(b.requestCode) || (a.slotNumber ?? 0) - (b.slotNumber ?? 0))
          .map(resumen);
        return { ...(await page(lista, q)), facets };
      },
      async get(id) {
        const { r, e } = await buscar(id);
        return delay(await vista(r, e.peticiones));
      },
      async update(id, d: HiringFileUpdate) {
        const { r, e } = await buscar(id);
        for (const k of ['prlTrainingDate', 'healthSurveillanceDate', 'ppeDeliveredAt'] as const) {
          if (d[k] && d[k]! > hoy()) throw new ApiError(400, 'validacion', 'La formación, la vigilancia de la salud y el EPI no pueden tener fecha futura', [{ path: k, message: 'Fecha futura' }]);
        }
        if ((d.healthSurveillanceResult !== undefined || d.healthSurveillanceDate !== undefined) && !!d.healthSurveillanceResult !== !!d.healthSurveillanceDate) {
          throw new ApiError(400, 'validacion', 'La vigilancia de la salud va con el resultado y la fecha juntos');
        }
        for (const k of ['prlTrainingDocumentId', 'healthSurveillanceDocumentId', 'ppeDocumentId', 'ssRegistrationDocumentId'] as const) {
          if (!delExpediente(r, d[k])) throw new ApiError(422, 'validacion', 'El justificante tiene que ser de este expediente');
        }
        const pon = <T extends object, K extends keyof T>(o: T, k: K, v: T[K] | undefined) => { if (v !== undefined) o[k] = v; };
        pon(r, 'startDate', d.startDate);
        pon(r, 'notes', d.notes);
        pon(r.prl, 'trainingDate', d.prlTrainingDate);
        pon(r.prl, 'trainingHours', d.prlTrainingHours);
        pon(r.prl, 'trainingDocumentId', d.prlTrainingDocumentId);
        pon(r.prl, 'healthSurveillanceResult', d.healthSurveillanceResult);
        pon(r.prl, 'healthSurveillanceDate', d.healthSurveillanceDate);
        pon(r.prl, 'healthSurveillanceDocumentId', d.healthSurveillanceDocumentId);
        pon(r.prl, 'ppeDeliveredAt', d.ppeDeliveredAt);
        pon(r.prl, 'ppeNotes', d.ppeNotes);
        pon(r.prl, 'ppeDocumentId', d.ppeDocumentId);
        if (d.ssRegistrationDate !== undefined || d.ssRegistrationDocumentId !== undefined) {
          pon(r.ss, 'date', d.ssRegistrationDate);
          pon(r.ss, 'documentId', d.ssRegistrationDocumentId);
          Object.assign(r.ss, { recordedByName: YO, recordedAt: ahora() });
        }
        r.updatedAt = ahora();
        return delay(await vista(r, e.peticiones));
      },
      async addContract(id, d: EmploymentContractCreate) {
        const { r, e } = await buscar(id);
        const c = completar({
          id: newId(), kind: d.kind, contractKey: d.contractKey, contractKeyName: '', startDate: d.startDate, endDate: d.endDate ?? null, substitutionReason: d.substitutionReason ?? null,
          signedAt: d.signedAt ?? null, documentId: d.documentId ?? null, contrataCommunicatedAt: d.contrataCommunicatedAt ?? null, contrataReference: d.contrataReference ?? null,
          contrataDocumentId: d.contrataDocumentId ?? null, contrataDueDate: '', basicCopyDeliveredAt: d.basicCopyDeliveredAt ?? null, basicCopyDocumentId: d.basicCopyDocumentId ?? null,
          basicCopyDueDate: null, status: 'active', cancelReason: null, notes: d.notes ?? null, createdByName: YO, createdAt: ahora(),
        });
        validarContrato(r, c);
        r.contracts.push(c);
        r.updatedAt = ahora();
        return delay(await vista(r, e.peticiones));
      },
      async updateContract(contractId, d) {
        const { r, e, c } = await buscarContrato(contractId);
        const nuevo = completar({ ...c, ...Object.fromEntries(Object.entries(d).filter(([, v]) => v !== undefined)) } as EmploymentContract);
        validarContrato(r, nuevo);
        Object.assign(c, nuevo);
        r.updatedAt = ahora();
        return delay(await vista(r, e.peticiones));
      },
      async cancelContract(contractId, reason) {
        const { r, e, c } = await buscarContrato(contractId);
        if (!reason?.trim()) throw new ApiError(400, 'validacion', 'Indica el motivo de la anulación');
        Object.assign(c, { status: 'cancelled', cancelReason: reason.trim() });
        r.updatedAt = ahora();
        return delay(await vista(r, e.peticiones));
      },
    },
  };
}
