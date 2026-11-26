// Expediente de contratación (fase 7, parte 1): art. 8 de la Ley 14/1994 y estado de cada paso. Funciones puras: la
// ruta carga los datos y aquí se decide qué falta, qué bloquea y cuál es la próxima tarea.
//
// Gravedad de cada aviso:
//   blocked   prohibición o resultado que impide empezar aunque se hagan los pasos (art. 8, «no apto»).
//   required  paso legal sin hacer: impide «listo para empezar».
//   warning   avisa, no impide (documentación, EPI, Contrat@, copia básica; pregunta 21 aplazada).

export type Severity = 'blocked' | 'required' | 'warning';
export interface Issue {
  code: string;
  severity: Severity;
  message: string;
  /** Fecha límite (Contrat@, copia básica). */
  dueDate?: string;
}

// ---------------------------------------------------------------------------
// Art. 8 de la Ley 14/1994
// ---------------------------------------------------------------------------
export interface Art8Input {
  clientIsEtt: boolean;
  hazardousWork: boolean;
  hazardousException: boolean;
  /** Última declaración de cada tipo: null si no hay. affirmative = hay huelga / hubo amortización. */
  strike: { affirmative: boolean } | null;
  downsizedPositions: { affirmative: boolean } | null;
}

/**
 * Prohibiciones del art. 8. Con `strict` (expediente), que falte una declaración impide «listo»; sin él (CPD previo),
 * solo avisa: el CPD previo recoge la declaración para que el cliente la firme.
 */
export function art8Issues(a: Art8Input, strict: boolean): Issue[] {
  const out: Issue[] = [];
  if (a.clientIsEtt) {
    out.push({ code: 'client_is_ett', severity: 'blocked', message: 'La empresa usuaria es una ETT: no se le puede ceder personal (art. 8.d)' });
  }
  if (a.strike?.affirmative) {
    out.push({ code: 'strike', severity: 'blocked', message: 'Hay huelga en el centro: no se puede sustituir a quien la hace (art. 8.a)' });
  } else if (!a.strike) {
    out.push({ code: 'strike_undeclared', severity: strict ? 'required' : 'warning', message: 'Falta la declaración del cliente de que no hay huelga en el centro (art. 8.a)' });
  }
  if (a.downsizedPositions?.affirmative) {
    out.push({
      code: 'downsized_positions', severity: 'blocked',
      message: 'El cliente amortizó estos puestos en los 12 meses anteriores (art. 8.c): no se pueden cubrir con una ETT',
    });
  } else if (!a.downsizedPositions) {
    out.push({
      code: 'downsized_positions_undeclared', severity: strict ? 'required' : 'warning',
      message: 'Falta la declaración del cliente sobre puestos amortizados en los 12 meses anteriores (art. 8.c)',
    });
  }
  if (a.hazardousWork && !a.hazardousException) {
    out.push({
      code: 'hazardous_work', severity: 'blocked',
      message: 'Trabajo especialmente peligroso (art. 8.b): solo con la excepción marcada por la ETT y su base',
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Pasos del expediente
// ---------------------------------------------------------------------------
export const STEPS = ['documentation', 'cpd', 'contract', 'prl', 'ss_registration'] as const;
export type StepId = (typeof STEPS)[number];
export type StepState = 'done' | 'in_progress' | 'pending' | 'blocked';

export const STEP_NAMES: Record<StepId, string> = {
  documentation: 'Documentación',
  cpd: 'CPD firmado por la empresa',
  contract: 'Contrato firmado',
  prl: 'PRL y EPI',
  ss_registration: 'Alta en la Seguridad Social',
};

export interface ContractInput {
  id: string;
  kind: string;
  startDate: string;
  endDate: string | null;
  signedAt: string | null;
  documentId: string | null;
  contrataCommunicatedAt: string | null;
  basicCopyDeliveredAt: string | null;
  status: 'active' | 'cancelled';
}

export interface FileInput {
  today: string;
  status: 'open' | 'cancelled';
  startDate: string | null;
  documentation: {
    idDocumentNumber: boolean;
    idDocumentExpiresOn: string | null;
    /** Escaneo del DNI/NIE: validated, pending o null si no hay (los rechazados no cuentan). */
    idScan: 'validated' | 'pending' | null;
    ssNumber: boolean;
    iban: boolean;
    /** Otros documentos de la persona con caducidad (PRL, carnés...). */
    expiring: { name: string; expiresOn: string }[];
    pendingValidation: number;
  };
  cpd: { preCpdStatus: string; signedAt: string | null; art8: Art8Input };
  contracts: ContractInput[];
  prl: {
    trainingDate: string | null;
    trainingDocument: boolean;
    healthResult: 'fit' | 'unfit' | 'waived' | null;
    ppeDeliveredAt: string | null;
  };
  ss: { date: string | null; document: boolean };
  settings: { contractCommunicationDays: number; basicCopyDays: number };
}

export interface Step {
  id: StepId;
  name: string;
  state: StepState;
  /** Paso legal: si no está hecho, el expediente no está listo (todos menos la documentación). */
  requiredForReady: boolean;
  issues: Issue[];
}

export interface FileStatus {
  state: 'ready' | 'pending' | 'blocked' | 'cancelled';
  ready: boolean;
  /** Los cinco pasos hechos, sin avisos en la documentación («Completo» del diseño). */
  complete: boolean;
  completedSteps: number;
  steps: Step[];
  /** Fecha de inicio y otros avisos del expediente que no son de un paso. */
  issues: Issue[];
  nextTask: { step: StepId | null; code: string; severity: Severity; message: string } | null;
  warnings: number;
}

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const fmt = (iso: string) => iso.split('-').reverse().join('/');

function stateOf(issues: Issue[], progress: boolean, warningsArePending: boolean): StepState {
  if (issues.some((i) => i.severity === 'blocked')) return 'blocked';
  const open = issues.some((i) => i.severity === 'required' || (warningsArePending && i.severity === 'warning'));
  if (!open) return 'done';
  return progress ? 'in_progress' : 'pending';
}

export function fileStatus(f: FileInput): FileStatus {
  const at = f.startDate ?? f.today;
  const general: Issue[] = [];
  if (!f.startDate) general.push({ code: 'start_date_missing', severity: 'required', message: 'Falta la fecha de inicio' });

  // Documentación (avisa)
  const d = f.documentation;
  const doc: Issue[] = [];
  if (!d.idDocumentNumber) doc.push({ code: 'id_document_missing', severity: 'warning', message: 'Falta el DNI o NIE' });
  else if (d.idDocumentExpiresOn && d.idDocumentExpiresOn < at) {
    doc.push({ code: 'id_document_expired', severity: 'warning', message: `El documento de identidad caduca el ${fmt(d.idDocumentExpiresOn)}, antes del inicio` });
  }
  if (d.idScan === null) doc.push({ code: 'id_scan_missing', severity: 'warning', message: 'Falta la copia escaneada del DNI o NIE' });
  if (!d.ssNumber) doc.push({ code: 'ss_number_missing', severity: 'warning', message: 'Falta el número de la Seguridad Social' });
  if (!d.iban) doc.push({ code: 'iban_missing', severity: 'warning', message: 'Falta la cuenta bancaria para la nómina' });
  for (const x of d.expiring.filter((e) => e.expiresOn < at)) {
    doc.push({ code: 'document_expired', severity: 'warning', message: `${x.name}: caduca el ${fmt(x.expiresOn)}, antes del inicio` });
  }
  if (d.pendingValidation > 0 || d.idScan === 'pending') {
    const n = Math.max(d.pendingValidation, 1);
    doc.push({ code: 'documents_pending_validation', severity: 'warning', message: `${n} ${n === 1 ? 'documento' : 'documentos'} por validar` });
  }

  // CPD firmado y art. 8
  const cpd: Issue[] = art8Issues(f.cpd.art8, true);
  if (!f.cpd.signedAt) {
    cpd.push({ code: 'cpd_not_signed', severity: 'required', message: f.cpd.preCpdStatus === 'pending'
      ? 'Falta generar y enviar el CPD previo a la empresa usuaria' : 'Falta el CPD firmado por la empresa usuaria' });
  }

  // Contrato
  const contract: Issue[] = [];
  const active = f.contracts.filter((c) => c.status === 'active');
  const signed = active.filter((c) => c.signedAt && c.documentId);
  const covering = signed.find((c) => c.startDate <= at && (!c.endDate || c.endDate >= at));
  if (!active.length) contract.push({ code: 'contract_missing', severity: 'required', message: 'Falta registrar el contrato' });
  else if (!signed.length) contract.push({ code: 'contract_unsigned', severity: 'required', message: 'Falta el contrato firmado' });
  else if (!covering && f.startDate) {
    contract.push({ code: 'contract_dates', severity: 'required', message: `Ningún contrato firmado cubre el ${fmt(at)}` });
  }
  for (const c of active) {
    if (!c.contrataCommunicatedAt) {
      const due = addDays(c.startDate, f.settings.contractCommunicationDays);
      contract.push({ code: due < f.today ? 'contrata_overdue' : 'contrata_pending', severity: 'warning', dueDate: due,
        message: due < f.today ? `Comunicación a Contrat@ vencida el ${fmt(due)}` : `Comunicar a Contrat@ antes del ${fmt(due)}` });
    }
    if (c.signedAt && !c.basicCopyDeliveredAt) {
      const due = addDays(c.signedAt, f.settings.basicCopyDays);
      contract.push({ code: due < f.today ? 'basic_copy_overdue' : 'basic_copy_pending', severity: 'warning', dueDate: due,
        message: due < f.today ? `Entrega de la copia básica vencida el ${fmt(due)}` : `Entregar la copia básica antes del ${fmt(due)}` });
    }
  }

  // PRL
  const p = f.prl;
  const prl: Issue[] = [];
  if (!p.trainingDate) prl.push({ code: 'prl_training_missing', severity: 'required', message: 'Falta la formación PRL' });
  else {
    if (!p.trainingDocument) prl.push({ code: 'prl_certificate_missing', severity: 'required', message: 'Falta el certificado de la formación PRL' });
    if (f.startDate && p.trainingDate > f.startDate) {
      prl.push({ code: 'prl_training_after_start', severity: 'required', message: 'La formación PRL tiene que ser antes del inicio' });
    }
  }
  if (p.healthResult === 'unfit') {
    prl.push({ code: 'health_unfit', severity: 'blocked', message: 'Vigilancia de la salud: no apto para el puesto' });
  } else if (!p.healthResult) {
    prl.push({ code: 'health_missing', severity: 'required', message: 'Falta la vigilancia de la salud (apto o renuncia)' });
  }
  if (!p.ppeDeliveredAt) prl.push({ code: 'ppe_pending', severity: 'warning', message: 'Falta registrar la entrega de EPI' });

  // Alta en la Seguridad Social
  const ss: Issue[] = [];
  if (!f.ss.date) ss.push({ code: 'ss_registration_missing', severity: 'required', message: 'Falta el alta en la Seguridad Social' });
  else {
    if (!f.ss.document) ss.push({ code: 'ss_registration_document_missing', severity: 'required', message: 'Falta el justificante del alta' });
    if (f.startDate && f.ss.date > f.startDate) {
      ss.push({ code: 'ss_registration_after_start', severity: 'required', message: 'El alta tiene que ser anterior al inicio' });
    }
  }

  const steps: Step[] = [
    { id: 'documentation', name: STEP_NAMES.documentation, requiredForReady: false, issues: doc,
      state: stateOf(doc, d.idDocumentNumber || d.ssNumber, true) },
    { id: 'cpd', name: STEP_NAMES.cpd, requiredForReady: true, issues: cpd,
      state: stateOf(cpd, ['sent', 'reviewed'].includes(f.cpd.preCpdStatus), false) },
    { id: 'contract', name: STEP_NAMES.contract, requiredForReady: true, issues: contract, state: stateOf(contract, active.length > 0, false) },
    { id: 'prl', name: STEP_NAMES.prl, requiredForReady: true, issues: prl, state: stateOf(prl, Boolean(p.trainingDate || p.healthResult), false) },
    { id: 'ss_registration', name: STEP_NAMES.ss_registration, requiredForReady: true, issues: ss, state: stateOf(ss, Boolean(f.ss.date), false) },
  ];

  const all = [...general, ...steps.flatMap((s) => s.issues)];
  const blocked = all.some((i) => i.severity === 'blocked');
  const ready = f.status === 'open' && !all.some((i) => i.severity !== 'warning');
  const completedSteps = steps.filter((s) => s.state === 'done').length;

  let nextTask: FileStatus['nextTask'] = null;
  if (f.status === 'open') {
    const pick = (sev: Severity) => {
      const g = general.find((i) => i.severity === sev);
      if (g) return { step: null, code: g.code, severity: sev, message: g.message };
      for (const s of steps) {
        const i = s.issues.find((x) => x.severity === sev);
        if (i) return { step: s.id, code: i.code, severity: sev, message: i.message };
      }
      return null;
    };
    nextTask = pick('blocked') ?? pick('required') ?? pick('warning');
  }

  return {
    state: f.status === 'cancelled' ? 'cancelled' : blocked ? 'blocked' : ready ? 'ready' : 'pending',
    ready,
    complete: f.status === 'open' && completedSteps === steps.length,
    completedSteps,
    steps,
    issues: general,
    nextTask,
    warnings: all.filter((i) => i.severity === 'warning').length,
  };
}
