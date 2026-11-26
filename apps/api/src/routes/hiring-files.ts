// Expedientes de contratación (fase 7, parte 1; db/migrations/20261126000100_hiring_files.sql). Uno por persona y
// plaza: lo abre la base de datos al confirmar la candidatura. Pasos: documentación (avisa), CPD firmado por la empresa
// (de la petición) con el art. 8, contrato, PRL (formación y vigilancia de la salud; EPI avisa) y alta en la Seguridad
// Social. «Listo para empezar» se calcula aquí (lib/hiring.ts): bloquean solo los pasos legales.
//
// Permisos (pregunta 22): ver, hiring_files.view (o cualquier permiso de paso); cada paso, el suyo:
// documentation, cpd (rutas de la petición), contract, prl y ss. La base de datos lo vuelve a comprobar.

import { createRoute, z } from '@hono/zod-openapi';
import { type TenantContext, withTenant } from '../lib/context.js';
import { type Tx, likePattern } from '../lib/db.js';
import { ApiError, forbidden, notFound } from '../lib/errors.js';
import { type ContractInput, STEPS, type StepId, art8Issues, fileStatus } from '../lib/hiring.js';
import { Art8Schema, IssueSchema, loadArt8 } from '../lib/hiring-data.js';
import {
  IdParams,
  PaginationQuery,
  Timestamp,
  bearerSecurity,
  createRouter,
  errorResponses,
  jsonBody,
  jsonContent,
} from '../lib/openapi.js';
import { mask } from '../lib/personal-data.js';

const tags = ['Expedientes'];
const P = {
  view: 'hiring_files.view',
  documentation: 'hiring_files.documentation',
  cpd: 'hiring_files.cpd',
  contract: 'hiring_files.contract',
  prl: 'hiring_files.prl',
  ss: 'hiring_files.ss',
} as const;
const ANY = Object.values(P);

const date = z.iso.date();
const today = () => new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Esquemas
// ---------------------------------------------------------------------------
const StepIdSchema = z.enum(STEPS).openapi({
  description: 'documentation (Documentación, avisa), cpd (CPD firmado y art. 8), contract (Contrato), prl (PRL y EPI), ss_registration (Alta en la SS)',
});
const StepSchema = z
  .object({
    id: StepIdSchema,
    name: z.string(),
    state: z.enum(['done', 'in_progress', 'pending', 'blocked']),
    requiredForReady: z.boolean().openapi({ description: 'Paso legal: si no está hecho, el expediente no está listo' }),
    issues: z.array(IssueSchema),
  })
  .openapi('HiringStep');
const FileState = z.enum(['ready', 'pending', 'blocked', 'cancelled'])
  .openapi({ description: 'ready: listo para empezar; blocked: alguna prohibición o «no apto»; pending: faltan pasos legales' });

const summaryFields = {
  id: z.guid(),
  status: z.enum(['open', 'cancelled']),
  cancelReason: z.string().nullable(),
  state: FileState,
  ready: z.boolean(),
  complete: z.boolean().openapi({ description: 'Los cinco pasos hechos y sin avisos de documentación («Completo» del diseño)' }),
  completedSteps: z.number().int(),
  steps: z.array(StepSchema),
  issues: z.array(IssueSchema).openapi({ description: 'Del expediente, fuera de los pasos (p. ej. falta la fecha de inicio)' }),
  nextTask: z.object({ step: StepIdSchema.nullable(), code: z.string(), severity: z.enum(['blocked', 'required', 'warning']), message: z.string() })
    .nullable().openapi({ description: 'Lo primero que bloquea; si no, el primer paso legal pendiente; si no, el primer aviso' }),
  warnings: z.number().int(),
  startDate: z.string().nullable(),
  requestId: z.guid(),
  requestCode: z.string(),
  requestStatus: z.string(),
  positionName: z.string(),
  shiftName: z.string().nullable(),
  positionsCount: z.number().int(),
  slotNumber: z.number().int().nullable(),
  branchId: z.guid(),
  clientId: z.guid(),
  clientName: z.string(),
  clientCenterName: z.string().nullable(),
  candidateId: z.guid(),
  candidateCode: z.string(),
  candidateName: z.string(),
  candidatePhone: z.string().nullable(),
  candidateEmail: z.string().nullable(),
  idDocument: z.object({ type: z.string().nullable(), masked: z.string().nullable() }),
  applicationId: z.guid(),
  createdAt: Timestamp,
  updatedAt: Timestamp,
};
const HiringFileSummarySchema = z.object(summaryFields).openapi('HiringFileSummary');

const ContractSchema = z
  .object({
    id: z.guid(),
    kind: z.enum(['production', 'substitution']),
    contractKey: z.string(),
    contractKeyName: z.string(),
    startDate: z.string(),
    endDate: z.string().nullable(),
    substitutionReason: z.string().nullable(),
    signedAt: z.string().nullable(),
    documentId: z.guid().nullable(),
    contrataCommunicatedAt: z.string().nullable(),
    contrataReference: z.string().nullable(),
    contrataDocumentId: z.guid().nullable(),
    contrataDueDate: z.string().openapi({ description: 'Inicio + días de la ETT (contractCommunicationDays)' }),
    basicCopyDeliveredAt: z.string().nullable(),
    basicCopyDocumentId: z.guid().nullable(),
    basicCopyDueDate: z.string().nullable().openapi({ description: 'Firma + días de la ETT (basicCopyDays); null sin firma' }),
    status: z.enum(['active', 'cancelled']),
    cancelReason: z.string().nullable(),
    notes: z.string().nullable(),
    createdByName: z.string().nullable(),
    createdAt: Timestamp,
  })
  .openapi('EmploymentContract');

const HiringFileSchema = z
  .object({
    ...summaryFields,
    notes: z.string().nullable(),
    prl: z.object({
      trainingDate: z.string().nullable(),
      trainingHours: z.number().nullable(),
      trainingDocumentId: z.guid().nullable(),
      healthSurveillanceResult: z.enum(['fit', 'unfit', 'waived']).nullable()
        .openapi({ description: 'Solo apto, no apto o renuncia: nunca el diagnóstico (RGPD)' }),
      healthSurveillanceDate: z.string().nullable(),
      healthSurveillanceDocumentId: z.guid().nullable(),
      ppeDeliveredAt: z.string().nullable(),
      ppeNotes: z.string().nullable(),
      ppeDocumentId: z.guid().nullable(),
    }),
    ssRegistration: z.object({
      date: z.string().nullable().openapi({ description: 'Fecha de efectos del alta' }),
      documentId: z.guid().nullable(),
      recordedByName: z.string().nullable(),
      recordedAt: Timestamp.nullable(),
    }),
    contracts: z.array(ContractSchema),
    cpd: z.object({
      preCpdStatus: z.string(),
      signedAt: z.string().nullable(),
      signedDocumentId: z.guid().nullable(),
      art8: Art8Schema,
    }).openapi({ description: 'De la petición: se registra con PUT /v1/requests/{id}/cpd-signed y /declarations' }),
    documentation: z.object({
      idDocumentExpiresOn: z.string().nullable(),
      idScan: z.enum(['validated', 'pending']).nullable(),
      ssNumber: z.object({ masked: z.string() }).nullable(),
      iban: z.object({ masked: z.string() }).nullable(),
      documents: z.array(z.object({
        id: z.guid(), typeCode: z.string().nullable(), typeName: z.string(), name: z.string(), status: z.string(),
        expiresOn: z.string().nullable(), expiredAtStart: z.boolean(),
      })).openapi({ description: 'Documentos del candidato (para validarlos: PATCH /v1/documents/{id})' }),
    }),
  })
  .openapi('HiringFile');
type HiringFileOut = z.infer<typeof HiringFileSchema>;
type Summary = z.infer<typeof HiringFileSummarySchema>;

const ListQuery = PaginationQuery.extend({
  q: z.string().trim().min(1).max(100).optional().openapi({ description: 'Persona, código de candidato, petición o cliente' }),
  requestId: z.guid().optional(),
  candidateId: z.guid().optional(),
  clientId: z.guid().optional(),
  branchId: z.guid().optional(),
  state: z.enum(['ready', 'pending', 'blocked', 'cancelled', 'complete', 'all']).optional()
    .openapi({ description: 'Por defecto, los abiertos (todos menos cancelados). complete: los cinco pasos hechos' }),
  missingStep: StepIdSchema.optional().openapi({ description: '«Falta: …»: el paso no está hecho' }),
  startFrom: date.optional(),
  startTo: date.optional(),
});

const FacetsSchema = z
  .object({
    total: z.number().int().openapi({ description: 'Abiertos con los filtros de petición, persona, cliente, sucursal, fechas y búsqueda' }),
    ready: z.number().int(),
    pending: z.number().int(),
    blocked: z.number().int(),
    complete: z.number().int(),
    cancelled: z.number().int(),
    missingByStep: z.record(StepIdSchema, z.number().int()).openapi({ description: 'Abiertos con el paso sin hacer' }),
    startingSoonNotReady: z.number().int().openapi({ description: 'Empiezan en 7 días o menos y no están listos' }),
  })
  .openapi('HiringFileFacets');

const UpdateBody = z
  .strictObject({
    startDate: date.nullable(),
    notes: z.string().trim().max(2000).nullable(),
    prlTrainingDate: date.nullable(),
    prlTrainingHours: z.number().positive().max(999).nullable(),
    prlTrainingDocumentId: z.guid().nullable(),
    healthSurveillanceResult: z.enum(['fit', 'unfit', 'waived']).nullable(),
    healthSurveillanceDate: date.nullable(),
    healthSurveillanceDocumentId: z.guid().nullable(),
    ppeDeliveredAt: date.nullable(),
    ppeNotes: z.string().trim().max(500).nullable(),
    ppeDocumentId: z.guid().nullable(),
    ssRegistrationDate: date.nullable(),
    ssRegistrationDocumentId: z.guid().nullable(),
  })
  .partial()
  .openapi('HiringFileUpdate');

const STEP_FIELDS = {
  prl: ['prlTrainingDate', 'prlTrainingHours', 'prlTrainingDocumentId', 'healthSurveillanceResult', 'healthSurveillanceDate',
    'healthSurveillanceDocumentId', 'ppeDeliveredAt', 'ppeNotes', 'ppeDocumentId'],
  ss: ['ssRegistrationDate', 'ssRegistrationDocumentId'],
} as const;

const contractFields = {
  contractKey: z.string().regex(/^[0-9]{3}$/).openapi({ description: 'Clave oficial: 402/502 producción, 410/510 sustitución [verificar]' }),
  startDate: date,
  endDate: date.nullable(),
  substitutionReason: z.string().trim().min(3).max(500).nullable(),
  signedAt: date.nullable(),
  documentId: z.guid().nullable().openapi({ description: 'Contrato firmado: documento del expediente (tipo «Contrato de trabajo firmado»)' }),
  contrataCommunicatedAt: date.nullable(),
  contrataReference: z.string().trim().max(40).nullable(),
  contrataDocumentId: z.guid().nullable(),
  basicCopyDeliveredAt: date.nullable(),
  basicCopyDocumentId: z.guid().nullable(),
  notes: z.string().trim().max(1000).nullable(),
};
const ContractCreate = z
  .strictObject({ kind: z.enum(['production', 'substitution']), ...contractFields })
  .partial({ endDate: true, substitutionReason: true, signedAt: true, documentId: true, contrataCommunicatedAt: true,
    contrataReference: true, contrataDocumentId: true, basicCopyDeliveredAt: true, basicCopyDocumentId: true, notes: true })
  .openapi('EmploymentContractCreate');
const ContractUpdate = z.strictObject(contractFields).partial().openapi('EmploymentContractUpdate');

// ---------------------------------------------------------------------------
// Lectura y cálculo
// ---------------------------------------------------------------------------
interface FileRow {
  id: string; status: 'open' | 'cancelled'; cancelReason: string | null; startDate: string | null; requestId: string;
  requestCode: string; requestStatus: string; positionName: string; shiftName: string | null; positionsCount: number;
  slotNumber: number | null; branchId: string; clientId: string; clientName: string; clientCenterName: string | null;
  candidateId: string; candidateCode: string; candidateName: string; candidatePhone: string | null; candidateEmail: string | null;
  idDocumentType: string | null; idDocumentHint: string | null; hasIdDocument: boolean; idDocumentExpiresOn: string | null;
  ssNumberHint: string | null; ibanHint: string | null; applicationId: string; createdAt: string; updatedAt: string;
  preCpdStatus: string; cpdSignedAt: string | null; cpdSignedDocumentId: string | null; notes: string | null;
  prlTrainingDate: string | null; prlTrainingHours: number | null; prlTrainingDocumentId: string | null;
  healthSurveillanceResult: 'fit' | 'unfit' | 'waived' | null; healthSurveillanceDate: string | null;
  healthSurveillanceDocumentId: string | null; ppeDeliveredAt: string | null; ppeNotes: string | null; ppeDocumentId: string | null;
  ssRegistrationDate: string | null; ssRegistrationDocumentId: string | null; ssRegistrationRecordedByName: string | null;
  ssRegistrationRecordedAt: string | null;
}
interface ContractRow extends ContractInput {
  hiringFileId: string; contractKey: string; contractKeyName: string; substitutionReason: string | null;
  contrataReference: string | null; contrataDocumentId: string | null; basicCopyDocumentId: string | null; cancelReason: string | null;
  notes: string | null; createdByName: string | null; createdAt: string;
}
interface DocRow {
  id: string; candidateId: string; typeCode: string | null; typeName: string; name: string; status: string; expiresOn: string | null;
}

const fileSelect = (tx: Tx, tenantId: string) => tx`
  select f.id, f.status, f.cancel_reason, to_char(f.start_date, 'YYYY-MM-DD') as start_date, f.request_id, r.code as request_code,
         r.status as request_status, r.position_name, r.shift_name, r.positions_count, s.slot_number, r.branch_id, r.client_id,
         cl.legal_name as client_name, cc.name as client_center_name, f.candidate_id, c.code as candidate_code,
         trim(c.first_name || ' ' || coalesce(c.last_name, '')) as candidate_name, c.phone as candidate_phone,
         c.email as candidate_email, c.id_document_type, c.id_document_hint, c.id_document_number_enc is not null as has_id_document,
         to_char(c.id_document_expires_on, 'YYYY-MM-DD') as id_document_expires_on, c.ss_number_hint, c.iban_hint,
         f.application_id, f.created_at, f.updated_at, r.pre_cpd_status, to_char(r.cpd_signed_at, 'YYYY-MM-DD') as cpd_signed_at,
         r.cpd_signed_document_id, f.notes, to_char(f.prl_training_date, 'YYYY-MM-DD') as prl_training_date,
         f.prl_training_hours::float8 as prl_training_hours, f.prl_training_document_id, f.health_surveillance_result,
         to_char(f.health_surveillance_date, 'YYYY-MM-DD') as health_surveillance_date, f.health_surveillance_document_id,
         to_char(f.ppe_delivered_at, 'YYYY-MM-DD') as ppe_delivered_at, f.ppe_notes, f.ppe_document_id,
         to_char(f.ss_registration_date, 'YYYY-MM-DD') as ss_registration_date, f.ss_registration_document_id,
         sp.full_name as ss_registration_recorded_by_name, f.ss_registration_recorded_at
  from public.hiring_files f
  join public.requests r on r.tenant_id = f.tenant_id and r.id = f.request_id
  join public.clients cl on cl.tenant_id = r.tenant_id and cl.id = r.client_id
  left join public.client_centers cc on cc.tenant_id = r.tenant_id and cc.id = r.client_center_id
  join public.candidates c on c.tenant_id = f.tenant_id and c.id = f.candidate_id
  left join public.request_slots s on s.tenant_id = f.tenant_id and s.id = f.slot_id
  left join public.profiles sp on sp.id = f.ss_registration_recorded_by
  where f.tenant_id = ${tenantId}
`;

async function loadContracts(tx: Tx, tenantId: string, fileIds: string[]) {
  if (!fileIds.length) return [];
  return tx<ContractRow[]>`
    select k.id, k.hiring_file_id, k.kind, k.contract_key, ck.name as contract_key_name, to_char(k.start_date, 'YYYY-MM-DD') as start_date,
           to_char(k.end_date, 'YYYY-MM-DD') as end_date, k.substitution_reason, to_char(k.signed_at, 'YYYY-MM-DD') as signed_at,
           k.document_id, to_char(k.contrata_communicated_at, 'YYYY-MM-DD') as contrata_communicated_at, k.contrata_reference,
           k.contrata_document_id, to_char(k.basic_copy_delivered_at, 'YYYY-MM-DD') as basic_copy_delivered_at,
           k.basic_copy_document_id, k.status, k.cancel_reason, k.notes, p.full_name as created_by_name, k.created_at
    from public.employment_contracts k
    join public.contract_keys ck on ck.code = k.contract_key
    left join public.profiles p on p.id = k.created_by
    where k.tenant_id = ${tenantId} and k.hiring_file_id in ${tx(fileIds)}
    order by k.start_date, k.created_at
  `;
}

async function loadCandidateDocs(tx: Tx, tenantId: string, candidateIds: string[]) {
  if (!candidateIds.length) return [];
  return tx<DocRow[]>`
    select d.id, d.entity_id as candidate_id, t.code as type_code, t.name as type_name, d.name, d.status,
           to_char(d.expires_on, 'YYYY-MM-DD') as expires_on
    from public.documents d join public.catalog_items t on t.tenant_id = d.tenant_id and t.id = d.type_id
    where d.tenant_id = ${tenantId} and d.entity_type = 'candidate' and d.entity_id in ${tx(candidateIds)}
      and d.deleted_at is null and d.status <> 'rejected'
    order by d.uploaded_at desc
  `;
}

async function compute(tx: Tx, tenantId: string, rows: FileRow[]) {
  const [settings] = await tx<{ contractCommunicationDays: number; basicCopyDays: number }[]>`
    select contract_communication_days, basic_copy_days from public.tenants where id = ${tenantId}
  `;
  const art8 = await loadArt8(tx, tenantId, [...new Set(rows.map((r) => r.requestId))]);
  const contracts = await loadContracts(tx, tenantId, rows.map((r) => r.id));
  const docs = await loadCandidateDocs(tx, tenantId, [...new Set(rows.map((r) => r.candidateId))]);
  const now = today();
  return rows.map((r) => {
    const own = docs.filter((d) => d.candidateId === r.candidateId);
    const scans = own.filter((d) => d.typeCode === 'candidate_id_document');
    const status = fileStatus({
      today: now,
      status: r.status,
      startDate: r.startDate,
      documentation: {
        idDocumentNumber: r.hasIdDocument,
        idDocumentExpiresOn: r.idDocumentExpiresOn,
        idScan: scans.some((d) => d.status === 'validated') ? 'validated' : scans.length ? 'pending' : null,
        ssNumber: r.ssNumberHint !== null,
        iban: r.ibanHint !== null,
        expiring: own.filter((d) => d.expiresOn && d.typeCode !== 'candidate_id_document').map((d) => ({ name: d.typeName, expiresOn: d.expiresOn! })),
        pendingValidation: own.filter((d) => d.status === 'pending').length,
      },
      cpd: { preCpdStatus: r.preCpdStatus, signedAt: r.cpdSignedAt, art8: art8.get(r.requestId)!.input },
      contracts: contracts.filter((k) => k.hiringFileId === r.id),
      prl: {
        trainingDate: r.prlTrainingDate,
        trainingDocument: r.prlTrainingDocumentId !== null,
        healthResult: r.healthSurveillanceResult,
        ppeDeliveredAt: r.ppeDeliveredAt,
      },
      ss: { date: r.ssRegistrationDate, document: r.ssRegistrationDocumentId !== null },
      settings: settings!,
    });
    return { row: r, status, art8: art8.get(r.requestId)!, contracts: contracts.filter((k) => k.hiringFileId === r.id), docs: own, settings: settings! };
  });
}
type Computed = Awaited<ReturnType<typeof compute>>[number];

function presentSummary({ row: r, status: s }: Computed): Summary {
  return {
    id: r.id, status: r.status, cancelReason: r.cancelReason, state: s.state, ready: s.ready, complete: s.complete,
    completedSteps: s.completedSteps, steps: s.steps, issues: s.issues, nextTask: s.nextTask, warnings: s.warnings,
    startDate: r.startDate, requestId: r.requestId, requestCode: r.requestCode, requestStatus: r.requestStatus,
    positionName: r.positionName, shiftName: r.shiftName, positionsCount: r.positionsCount, slotNumber: r.slotNumber,
    branchId: r.branchId, clientId: r.clientId, clientName: r.clientName, clientCenterName: r.clientCenterName,
    candidateId: r.candidateId, candidateCode: r.candidateCode, candidateName: r.candidateName, candidatePhone: r.candidatePhone,
    candidateEmail: r.candidateEmail, idDocument: { type: r.idDocumentType, masked: mask(r.idDocumentHint) },
    applicationId: r.applicationId, createdAt: r.createdAt, updatedAt: r.updatedAt,
  };
}

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

function presentFile(x: Computed): HiringFileOut {
  const r = x.row;
  const at = r.startDate ?? today();
  return {
    ...presentSummary(x),
    notes: r.notes,
    prl: {
      trainingDate: r.prlTrainingDate, trainingHours: r.prlTrainingHours, trainingDocumentId: r.prlTrainingDocumentId,
      healthSurveillanceResult: r.healthSurveillanceResult, healthSurveillanceDate: r.healthSurveillanceDate,
      healthSurveillanceDocumentId: r.healthSurveillanceDocumentId, ppeDeliveredAt: r.ppeDeliveredAt, ppeNotes: r.ppeNotes,
      ppeDocumentId: r.ppeDocumentId,
    },
    ssRegistration: {
      date: r.ssRegistrationDate, documentId: r.ssRegistrationDocumentId, recordedByName: r.ssRegistrationRecordedByName,
      recordedAt: r.ssRegistrationRecordedAt,
    },
    contracts: x.contracts.map((k) => ({
      id: k.id, kind: k.kind as 'production' | 'substitution', contractKey: k.contractKey, contractKeyName: k.contractKeyName,
      startDate: k.startDate, endDate: k.endDate, substitutionReason: k.substitutionReason, signedAt: k.signedAt, documentId: k.documentId,
      contrataCommunicatedAt: k.contrataCommunicatedAt, contrataReference: k.contrataReference, contrataDocumentId: k.contrataDocumentId,
      contrataDueDate: addDays(k.startDate, x.settings.contractCommunicationDays), basicCopyDeliveredAt: k.basicCopyDeliveredAt,
      basicCopyDocumentId: k.basicCopyDocumentId, basicCopyDueDate: k.signedAt ? addDays(k.signedAt, x.settings.basicCopyDays) : null,
      status: k.status, cancelReason: k.cancelReason, notes: k.notes, createdByName: k.createdByName, createdAt: k.createdAt,
    })),
    cpd: {
      preCpdStatus: r.preCpdStatus,
      signedAt: r.cpdSignedAt,
      signedDocumentId: r.cpdSignedDocumentId,
      art8: {
        clientIsEtt: x.art8.clientIsEtt, hazardousWork: x.art8.hazardousWork, hazardousException: x.art8.hazardousException,
        declarations: { strike: x.art8.strike, downsizedPositions: x.art8.downsizedPositions }, history: x.art8.history,
        issues: art8Issues(x.art8.input, true),
      },
    },
    documentation: {
      idDocumentExpiresOn: r.idDocumentExpiresOn,
      idScan: x.docs.some((d) => d.typeCode === 'candidate_id_document' && d.status === 'validated') ? 'validated'
        : x.docs.some((d) => d.typeCode === 'candidate_id_document') ? 'pending' : null,
      ssNumber: r.ssNumberHint ? { masked: mask(r.ssNumberHint)! } : null,
      iban: r.ibanHint ? { masked: mask(r.ibanHint)! } : null,
      documents: x.docs.map((d) => ({
        id: d.id, typeCode: d.typeCode, typeName: d.typeName, name: d.name, status: d.status, expiresOn: d.expiresOn,
        expiredAtStart: d.expiresOn !== null && d.expiresOn < at,
      })),
    },
  };
}

function requireAny(ctx: TenantContext) {
  if (!ctx.isSuperadmin && !ANY.some((p) => ctx.permissions.has(p))) {
    throw forbidden('No tienes permiso para ver los expedientes (hiring_files.view)');
  }
}
function requirePermission(ctx: TenantContext, permission: string, what: string) {
  if (!ctx.isSuperadmin && !ctx.permissions.has(permission)) throw forbidden(`No tienes permiso para ${what} (${permission})`);
}

async function loadOne(tx: Tx, tenantId: string, id: string) {
  const rows = await tx<FileRow[]>`${fileSelect(tx, tenantId)} and f.id = ${id}`;
  if (!rows.length) throw notFound('El expediente no existe o no tienes acceso');
  return (await compute(tx, tenantId, rows))[0]!;
}

async function fileOfContract(tx: Tx, tenantId: string, contractId: string) {
  const [k] = await tx<{ hiringFileId: string }[]>`
    select hiring_file_id from public.employment_contracts where tenant_id = ${tenantId} and id = ${contractId}
  `;
  if (!k) throw notFound('El contrato no existe o no tienes acceso');
  return k.hiringFileId;
}

function checkContract(body: { kind?: string; contractKey?: string; startDate?: string; endDate?: string | null; substitutionReason?: string | null;
  signedAt?: string | null; documentId?: string | null }, kind: string) {
  const issues: { path: string; message: string }[] = [];
  if (body.contractKey !== undefined) {
    const ok = kind === 'production' ? ['402', '502'] : ['410', '510'];
    if (!ok.includes(body.contractKey)) issues.push({ path: 'contractKey', message: `Para este tipo de contrato, la clave es ${ok.join(' o ')}` });
  }
  if (kind === 'production' && body.endDate === null) issues.push({ path: 'endDate', message: 'El contrato de circunstancias de la producción lleva fecha de fin' });
  if (body.startDate && body.endDate && body.endDate < body.startDate) issues.push({ path: 'endDate', message: 'El fin no puede ser anterior al inicio' });
  if ((body.signedAt === undefined) !== (body.documentId === undefined) || (body.signedAt === null) !== (body.documentId === null)) {
    issues.push({ path: 'documentId', message: 'El contrato firmado va con su fecha de firma y el documento' });
  }
  if (body.signedAt && body.signedAt > today()) issues.push({ path: 'signedAt', message: 'La fecha de la firma no puede ser futura' });
  if (issues.length) throw new ApiError(422, 'validacion', 'Revisa los datos del contrato', issues);
}

// ---------------------------------------------------------------------------
// Rutas
// ---------------------------------------------------------------------------
const FileOk = { 200: jsonContent(HiringFileSchema, 'Expediente'), ...errorResponses(400, 401, 403, 404, 409, 422) };

export const hiringFiles = createRouter()
  .openapi(
    createRoute({
      method: 'get',
      path: '/hiring-files',
      tags,
      summary: 'Listar expedientes',
      description:
        'Por persona (una fila por expediente) y, agrupando por `requestId`, por petición. Cada fila trae el estado de los cinco ' +
        'pasos, sus avisos y la próxima tarea. `facets` da los KPI (listos, pendientes, bloqueados, completos, «Falta: …») con ' +
        'los mismos filtros salvo `state` y `missingStep`. Orden: fecha de inicio y petición. Requiere un permiso de expedientes.',
      security: bearerSecurity,
      request: { query: ListQuery },
      responses: {
        200: jsonContent(z.object({
          data: z.array(HiringFileSummarySchema),
          pagination: z.object({ limit: z.number().int(), offset: z.number().int(), total: z.number().int() }),
          facets: FacetsSchema,
        }).openapi('HiringFilePage'), 'Expedientes'),
        ...errorResponses(400, 401, 403),
      },
    }),
    async (c) => {
      const q = c.req.valid('query');
      const page = await withTenant(c, {}, async (tx, ctx) => {
        requireAny(ctx);
        const conds = [tx`true`];
        if (q.requestId) conds.push(tx`f.request_id = ${q.requestId}`);
        if (q.candidateId) conds.push(tx`f.candidate_id = ${q.candidateId}`);
        if (q.clientId) conds.push(tx`r.client_id = ${q.clientId}`);
        if (q.branchId) conds.push(tx`r.branch_id = ${q.branchId}`);
        if (q.startFrom) conds.push(tx`f.start_date >= ${q.startFrom}`);
        if (q.startTo) conds.push(tx`f.start_date <= ${q.startTo}`);
        if (q.q) {
          const like = likePattern(q.q);
          conds.push(tx`(c.first_name || ' ' || coalesce(c.last_name, '') ilike ${like} or c.code ilike ${like}
                         or r.code ilike ${like} or cl.legal_name ilike ${like} or r.position_name ilike ${like})`);
        }
        const where = conds.reduce((acc, cond) => tx`${acc} and ${cond}`);
        const rows = await tx<FileRow[]>`
          ${fileSelect(tx, ctx.tenantId)} and ${where}
          order by f.start_date nulls last, r.code, s.slot_number nulls last, f.created_at
        `;
        const all = await compute(tx, ctx.tenantId, rows);
        const open = all.filter((x) => x.row.status === 'open');
        const soon = (x: Computed) => x.row.startDate !== null && x.row.startDate <= addDays(today(), 7);
        const facets = {
          total: open.length,
          ready: open.filter((x) => x.status.ready).length,
          pending: open.filter((x) => x.status.state === 'pending').length,
          blocked: open.filter((x) => x.status.state === 'blocked').length,
          complete: open.filter((x) => x.status.complete).length,
          cancelled: all.length - open.length,
          missingByStep: Object.fromEntries(STEPS.map((id) => [id, open.filter((x) => x.status.steps.find((st) => st.id === id)!.state !== 'done').length])) as Record<StepId, number>,
          startingSoonNotReady: open.filter((x) => soon(x) && !x.status.ready).length,
        };
        let list = q.state === 'all' ? all : q.state === 'cancelled' ? all.filter((x) => x.row.status === 'cancelled') : open;
        if (q.state === 'ready') list = list.filter((x) => x.status.ready);
        if (q.state === 'pending') list = list.filter((x) => x.status.state === 'pending');
        if (q.state === 'blocked') list = list.filter((x) => x.status.state === 'blocked');
        if (q.state === 'complete') list = list.filter((x) => x.status.complete);
        if (q.missingStep) list = list.filter((x) => x.status.steps.find((st) => st.id === q.missingStep)!.state !== 'done');
        return {
          data: list.slice(q.offset, q.offset + q.limit).map(presentSummary),
          pagination: { limit: q.limit, offset: q.offset, total: list.length },
          facets,
        };
      });
      return c.json(page, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/hiring-files/{id}',
      tags,
      summary: 'Ver un expediente',
      description: 'Con los datos de cada paso, los contratos, el CPD y el art. 8 de la petición y la documentación de la persona.',
      security: bearerSecurity,
      request: { params: IdParams },
      responses: { 200: jsonContent(HiringFileSchema, 'Expediente'), ...errorResponses(400, 401, 403, 404) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const file = await withTenant(c, {}, async (tx, ctx) => {
        requireAny(ctx);
        return presentFile(await loadOne(tx, ctx.tenantId, id));
      });
      return c.json(file, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'patch',
      path: '/hiring-files/{id}',
      tags,
      summary: 'Registrar pasos del expediente',
      description:
        'Fecha de inicio y notas (cualquier permiso de paso); formación PRL, vigilancia de la salud y EPI (`hiring_files.prl`); ' +
        'alta en la Seguridad Social (`hiring_files.ss`). Los justificantes son documentos del expediente (`entityType: ' +
        'hiring_file`). La vigilancia de la salud guarda solo apto, no apto o renuncia y la fecha: nunca el diagnóstico. Las ' +
        'fechas de formación, vigilancia y EPI no pueden ser futuras. 409 si el expediente está cancelado.',
      security: bearerSecurity,
      request: { params: IdParams, body: jsonBody(UpdateBody) },
      responses: FileOk,
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      const file = await withTenant(c, {}, async (tx, ctx) => {
        requireAny(ctx);
        const keys = Object.keys(body) as (keyof typeof body)[];
        if (keys.some((k) => (STEP_FIELDS.prl as readonly string[]).includes(k))) {
          requirePermission(ctx, P.prl, 'registrar la PRL y la vigilancia de la salud');
        }
        if (keys.some((k) => (STEP_FIELDS.ss as readonly string[]).includes(k))) {
          requirePermission(ctx, P.ss, 'registrar el alta en la Seguridad Social');
        }
        if (keys.some((k) => k === 'startDate' || k === 'notes') && !ctx.isSuperadmin
            && !ANY.some((p) => p !== P.view && ctx.permissions.has(p))) {
          throw forbidden('No tienes permiso para cambiar el expediente');
        }
        const now = today();
        const future = (['prlTrainingDate', 'healthSurveillanceDate', 'ppeDeliveredAt'] as const).filter((k) => body[k] && body[k]! > now);
        if (future.length) {
          throw new ApiError(422, 'validacion', 'Solo se registra lo que ya se ha hecho', future.map((k) => ({ path: k, message: 'Fecha futura' })));
        }
        const current = await loadOne(tx, ctx.tenantId, id);
        if (current.row.status === 'cancelled') throw new ApiError(409, 'conflicto', 'El expediente está cancelado (la candidatura ya no está confirmada)');
        const merged = { ...current.row, ...body };
        if ((merged.healthSurveillanceResult === null) !== (merged.healthSurveillanceDate === null)) {
          throw new ApiError(422, 'validacion', 'La vigilancia de la salud va con su resultado y su fecha',
            [{ path: 'healthSurveillanceDate', message: 'Resultado y fecha, juntos' }]);
        }
        if (merged.prlTrainingDocumentId && !merged.prlTrainingDate) {
          throw new ApiError(422, 'validacion', 'El certificado de PRL va con la fecha de la formación', [{ path: 'prlTrainingDate', message: 'Falta la fecha' }]);
        }
        if (merged.ssRegistrationDocumentId && !merged.ssRegistrationDate) {
          throw new ApiError(422, 'validacion', 'El justificante va con la fecha del alta', [{ path: 'ssRegistrationDate', message: 'Falta la fecha' }]);
        }
        if (keys.length) {
          await tx`update public.hiring_files set ${tx(body as never, ...(keys as never[]))} where tenant_id = ${ctx.tenantId} and id = ${id}`;
        }
        return presentFile(await loadOne(tx, ctx.tenantId, id));
      });
      return c.json(file, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/hiring-files/{id}/contracts',
      tags,
      summary: 'Registrar un contrato',
      description:
        'Requiere `hiring_files.contract`. Registro a mano de un contrato de circunstancias de la producción (claves 402/502, con ' +
        'fecha de fin) o de sustitución (410/510, con la causa) [verificar]. Para que cuente, firmado: `signedAt` y el ' +
        'documento del expediente. Contrat@ y copia básica se pueden registrar después (avisan con su plazo). Puede haber ' +
        'varios contratos por expediente.',
      security: bearerSecurity,
      request: { params: IdParams, body: jsonBody(ContractCreate) },
      responses: { 201: jsonContent(HiringFileSchema, 'Expediente'), ...errorResponses(400, 401, 403, 404, 409, 422) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      const file = await withTenant(c, { permission: P.contract }, async (tx, ctx) => {
        const current = await loadOne(tx, ctx.tenantId, id);
        if (current.row.status === 'cancelled') throw new ApiError(409, 'conflicto', 'El expediente está cancelado');
        checkContract({ ...body, endDate: body.endDate ?? null, signedAt: body.signedAt ?? null, documentId: body.documentId ?? null }, body.kind);
        if (body.kind === 'substitution' && !body.substitutionReason) {
          throw new ApiError(422, 'validacion', 'El contrato de sustitución lleva la causa', [{ path: 'substitutionReason', message: 'Obligatorio' }]);
        }
        await tx`insert into public.employment_contracts ${tx({ tenantId: ctx.tenantId, hiringFileId: id, ...body } as never)}`;
        return presentFile(await loadOne(tx, ctx.tenantId, id));
      });
      return c.json(file, 201);
    },
  )
  .openapi(
    createRoute({
      method: 'patch',
      path: '/employment-contracts/{id}',
      tags,
      summary: 'Cambiar un contrato',
      description: 'Requiere `hiring_files.contract`. Firma, Contrat@, copia básica, fechas y notas. El tipo no cambia (cancélalo y registra otro).',
      security: bearerSecurity,
      request: { params: IdParams, body: jsonBody(ContractUpdate) },
      responses: FileOk,
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      const file = await withTenant(c, { permission: P.contract }, async (tx, ctx) => {
        const fileId = await fileOfContract(tx, ctx.tenantId, id);
        const current = await loadOne(tx, ctx.tenantId, fileId);
        const k = current.contracts.find((x) => x.id === id)!;
        if (k.status === 'cancelled') throw new ApiError(409, 'conflicto', 'El contrato está cancelado');
        const merged = { ...k, ...body };
        checkContract({ ...body, startDate: merged.startDate, endDate: merged.endDate,
          ...(body.signedAt !== undefined || body.documentId !== undefined ? { signedAt: merged.signedAt, documentId: merged.documentId } : {}) }, k.kind);
        const keys = Object.keys(body);
        if (keys.length) {
          await tx`update public.employment_contracts set ${tx(body as never, ...(keys as never[]))} where tenant_id = ${ctx.tenantId} and id = ${id}`;
        }
        return presentFile(await loadOne(tx, ctx.tenantId, fileId));
      });
      return c.json(file, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/employment-contracts/{id}/cancel',
      tags,
      summary: 'Cancelar un contrato',
      description: 'Requiere `hiring_files.contract`. Con el motivo (p. ej. registrado por error). Se conserva en el historial.',
      security: bearerSecurity,
      request: { params: IdParams, body: jsonBody(z.strictObject({ reason: z.string().trim().min(3).max(250) })) },
      responses: FileOk,
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const { reason } = c.req.valid('json');
      const file = await withTenant(c, { permission: P.contract }, async (tx, ctx) => {
        const fileId = await fileOfContract(tx, ctx.tenantId, id);
        await tx`
          update public.employment_contracts set status = 'cancelled', cancelled_at = now(), cancel_reason = ${reason}
           where tenant_id = ${ctx.tenantId} and id = ${id} and status = 'active'
        `;
        return presentFile(await loadOne(tx, ctx.tenantId, fileId));
      });
      return c.json(file, 200);
    },
  );
