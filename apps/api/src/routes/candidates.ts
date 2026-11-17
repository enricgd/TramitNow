// Candidatos (fase 6; db/migrations/20261117000500_candidates.sql). Bolsa común de la ETT, con los datos sensibles
// cifrados por la API (lib/personal-data.ts): documento de identidad, Seguridad Social, IBAN y salud. Salen siempre
// enmascarados; completos solo por GET /candidates/{id}/sensitive (personal_data.view), que queda en la auditoría de
// accesos, igual que abrir la ficha, descargar un documento, exportar y anonimizar.
//
// RGPD: consentimiento de la bolsa con la versión del texto aceptado (privacy_notices), supresión = anonimizar
// (privacy.manage), exportación de todo lo de una persona (derecho de acceso) y candidatos con el plazo cumplido.

import { createRoute, z } from '@hono/zod-openapi';
import type { Context } from 'hono';
import { type AppEnv, type TenantContext, withTenant } from '../lib/context.js';
import { type Tx, likePattern } from '../lib/db.js';
import { ApiError, forbidden, notFound } from '../lib/errors.js';
import {
  IdParams,
  PaginationQuery,
  Timestamp,
  bearerSecurity,
  createRouter,
  errorResponses,
  jsonBody,
  jsonContent,
  listOf,
  nullableText,
  paginated,
} from '../lib/openapi.js';
import {
  type PersonalData,
  hintOf,
  mask,
  normalizeIban,
  normalizeIdNumber,
  normalizeSsNumber,
  requirePersonalData,
  validIdDocument,
  validSpanishIban,
  validSsNumber,
} from '../lib/personal-data.js';
import { ApplicationSchema, loadApplications } from './applications.js';

const MANAGE = 'candidates.manage';
const VIEW_SENSITIVE = 'personal_data.view';
const PRIVACY = 'privacy.manage';
const AUDIT = 'privacy.audit';
const tags = ['Candidatos'];

// ---------------------------------------------------------------------------
// Esquemas
// ---------------------------------------------------------------------------
const date = z.iso.date();
const CandidateStatus = z
  .enum(['new', 'to_contact', 'contacted', 'in_selection', 'available', 'unavailable', 'onboarding', 'in_mission', 'discarded'])
  .openapi({ description: 'Nuevo, Por contactar, Contactado, En selección, Disponible, No disponible, En incorporación, En misión, Descartado' });
const WritableStatus = z.enum(['new', 'to_contact', 'contacted', 'in_selection', 'available', 'unavailable', 'discarded'])
  .openapi({ description: '«En incorporación» y «En misión» los pone el sistema (fase 7)' });
export const Source = z.enum(['candidate_portal', 'infojobs', 'indeed', 'linkedin', 'database', 'referral', 'walk_in', 'other']);
const IdDocumentType = z.enum(['dni', 'nie', 'passport', 'other']);
const Shift = z.enum(['morning', 'afternoon', 'night', 'split', 'weekends']);
const Availability = z.enum(['immediate', 'one_week', 'two_weeks', 'from_date']);
const LanguageLevel = z.enum(['native', 'C2', 'C1', 'B2', 'B1', 'A2', 'A1']);
const HealthBasis = z.enum(['explicit_consent', 'labor_obligation'])
  .openapi({ description: 'Base legal de los datos de salud: consentimiento explícito (health_data) u obligación laboral' });
const CatalogKind = z.enum(['candidate_profile', 'license', 'skill', 'language']);

const HealthSchema = z
  .strictObject({
    disabilityPercent: z.number().int().min(0).max(100).nullable().default(null),
    adaptations: nullableText(2000).default(null),
    notes: nullableText(2000).default(null),
    legalBasis: HealthBasis,
  })
  .openapi('CandidateHealth');

const ExperienceSchema = z.strictObject({
  company: z.string().trim().min(1).max(200),
  position: nullableText(200).default(null),
  from: z.string().regex(/^\d{4}(-\d{2})?$/, 'AAAA o AAAA-MM').nullable().default(null),
  to: z.string().regex(/^\d{4}(-\d{2})?$/, 'AAAA o AAAA-MM').nullable().default(null),
  duties: nullableText(2000).default(null),
});
const EducationSchema = z.strictObject({
  title: z.string().trim().min(1).max(200),
  center: nullableText(200).default(null),
  year: z.number().int().min(1950).max(2100).nullable().default(null),
});

const writableFields = {
  firstName: z.string().trim().min(1).max(120),
  lastName: nullableText(180),
  idDocumentType: IdDocumentType.nullable(),
  idDocumentNumber: z.string().trim().min(3).max(20).nullable().openapi({ description: 'Se cifra. DNI y NIE con la letra validada' }),
  idDocumentExpiresOn: date.nullable(),
  ssNumber: z.string().trim().min(10).max(20).nullable().openapi({ description: 'Se cifra. 12 cifras con su control' }),
  iban: z.string().trim().min(10).max(40).nullable().openapi({ description: 'Se cifra. Español: ES y 22 cifras' }),
  health: HealthSchema.nullable().openapi({ description: 'Se cifra. Solo con base legal' }),
  birthDate: date.nullable(),
  nationality: nullableText(80),
  phone: nullableText(40),
  email: z.email().max(200).nullable(),
  address: nullableText(250),
  postalCode: z.string().regex(/^[0-9]{5}$/, 'Código postal de 5 cifras').nullable(),
  city: nullableText(120),
  provinceCode: z.string().regex(/^[0-9]{2}$/).nullable(),
  status: WritableStatus,
  source: Source,
  sourceRef: nullableText(120),
  branchId: z.guid().nullable(),
  mainProfileId: z.guid().nullable(),
  attributeIds: z.array(z.guid()).max(100).openapi({ description: 'Lista completa de otros perfiles, carnés y habilidades' }),
  languages: z.array(z.strictObject({ id: z.guid(), level: LanguageLevel.nullable().default(null) })).max(30),
  experienceYears: z.number().int().min(0).max(70).nullable(),
  hasCar: z.boolean().nullable(),
  otherLicensesText: nullableText(500).openapi({ description: '«Otros» carnés: ¿cuáles?' }),
  experiences: z.array(ExperienceSchema).max(50),
  education: z.array(EducationSchema).max(50),
  shifts: z.array(Shift).max(5),
  availability: Availability.nullable(),
  availableFrom: date.nullable(),
  maxDistanceKm: z.number().int().min(0).max(1000).nullable(),
  availabilityNotes: nullableText(2000),
  autoExpiryNotice: z.boolean(),
  lastContactAt: z.iso.datetime({ offset: true }).nullable(),
};
type WriteBody = Partial<{ [K in keyof typeof writableFields]: z.infer<(typeof writableFields)[K]> }>;

const CreateSchema = z.strictObject(writableFields).partial().required({ firstName: true }).openapi('CandidateCreate');
const UpdateSchema = z.strictObject(writableFields).partial().openapi('CandidateUpdate');

const ProfileRef = z.object({ id: z.guid(), name: z.string(), group: z.string().nullable() });
const listFields = {
  id: z.guid(),
  code: z.string(),
  firstName: z.string(),
  lastName: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  city: z.string().nullable(),
  provinceCode: z.string().nullable(),
  status: CandidateStatus,
  source: Source,
  mainProfile: ProfileRef.nullable(),
  otherProfileNames: z.array(z.string()),
  experienceYears: z.number().int().nullable(),
  idDocument: z.object({
    type: IdDocumentType.nullable(),
    masked: z.string().nullable().openapi({ example: '•••••123X' }),
    expiresOn: z.string().nullable(),
    state: z.enum(['ok', 'expired', 'missing']),
  }),
  ssNumber: z.object({ masked: z.string() }).nullable(),
  iban: z.object({ masked: z.string() }).nullable(),
  poolConsent: z.object({
    state: z.enum(['valid', 'expiring', 'expired', 'none']).openapi({ description: 'expiring: caduca en los días de aviso de la ETT' }),
    expiresAt: Timestamp.nullable(),
  }),
  documentAlerts: z.object({ expired: z.number().int(), expiring: z.number().int() }),
  activeApplications: z.number().int(),
  lastContactAt: Timestamp.nullable(),
  anonymized: z.boolean(),
  createdAt: Timestamp,
};
const CandidateSummarySchema = z.object(listFields).openapi('CandidateSummary');
type Summary = z.infer<typeof CandidateSummarySchema>;

const ConsentSchema = z
  .object({
    id: z.guid(),
    purpose: z.enum(['talent_pool', 'health_data']),
    noticeId: z.guid(),
    noticeVersion: z.string(),
    givenAt: Timestamp,
    channel: z.enum(['portal', 'paper', 'email', 'other']),
    documentId: z.guid().nullable(),
    expiresAt: Timestamp.nullable(),
    withdrawnAt: Timestamp.nullable(),
    createdByName: z.string().nullable(),
  })
  .openapi('CandidateConsent');

const CandidateSchema = z
  .object({
    ...listFields,
    branchId: z.guid().nullable(),
    sourceRef: z.string().nullable(),
    birthDate: z.string().nullable(),
    nationality: z.string().nullable(),
    address: z.string().nullable(),
    postalCode: z.string().nullable(),
    experienceYears: z.number().int().nullable(),
    hasCar: z.boolean().nullable(),
    otherLicensesText: z.string().nullable(),
    attributes: z.object({
      licenses: z.array(ProfileRef),
      skills: z.array(ProfileRef),
      languages: z.array(ProfileRef.extend({ level: LanguageLevel.nullable() })),
      otherProfiles: z.array(ProfileRef),
    }),
    experiences: z.array(ExperienceSchema),
    education: z.array(EducationSchema),
    shifts: z.array(Shift),
    availability: Availability.nullable(),
    availableFrom: z.string().nullable(),
    maxDistanceKm: z.number().int().nullable(),
    availabilityNotes: z.string().nullable(),
    autoExpiryNotice: z.boolean(),
    health: z.object({ hasData: z.boolean(), legalBasis: HealthBasis.nullable() }),
    consents: z.array(ConsentSchema),
    applications: z.array(ApplicationSchema),
    missing: z.array(z.object({ code: z.string(), message: z.string(), tab: z.enum(['personal', 'profile', 'documents']) })),
    anonymizedAt: Timestamp.nullable(),
    createdByName: z.string().nullable(),
    updatedAt: Timestamp,
  })
  .openapi('Candidate');
type CandidateOut = z.infer<typeof CandidateSchema>;

const ListQuery = PaginationQuery.extend({
  q: z.string().trim().min(1).max(100).optional(),
  status: CandidateStatus.optional(),
  source: Source.optional(),
  profileId: z.guid().optional(),
  attributeId: z.string().regex(/^[0-9a-f-]{36}(,[0-9a-f-]{36})*$/i, 'Uno o varios id separados por comas').optional(),
  documents: z.enum(['alerts', 'missing', 'ok', 'pending', 'id_or_ss_pending', 'privacy_pending']).optional()
    .openapi({
      description: 'alerts: documentos caducados o por caducar; missing: sin documento de identidad o sin consentimiento de bolsa; ' +
        'ok: documentación y RGPD correctos; pending: documentación o RGPD pendiente; id_or_ss_pending: DNI o NSS pendiente ' +
        '(sin número, sin el documento escaneado o caducado); privacy_pending: sin consentimiento de bolsa vigente. Sin descifrar nada',
    }),
  poolConsent: z.enum(['valid', 'expiring', 'expired', 'none']).optional()
    .openapi({ description: 'Consentimiento de la bolsa: expired (caducado o retirado) para revisarlos y anonimizarlos' }),
  idDocumentNumber: z.string().trim().min(3).max(20).optional()
    .openapi({ description: 'Búsqueda exacta por DNI, NIE o pasaporte (por la huella; sin clave de cifrado, 503)' }),
  anonymized: z.enum(['true', 'false']).transform((v) => v === 'true').optional()
    .openapi({ description: 'true: solo los anonimizados. Por defecto, los demás' }),
});

const SensitiveField = z.enum(['idDocument', 'ssNumber', 'iban', 'health']);
const SensitiveQuery = z.object({
  fields: z.string().regex(/^(idDocument|ssNumber|iban|health)(,(idDocument|ssNumber|iban|health))*$/)
    .openapi({ description: 'Separados por comas: idDocument, ssNumber, iban, health', example: 'idDocument,iban' }),
});
const SensitiveSchema = z
  .object({
    idDocument: z.object({ type: IdDocumentType, number: z.string() }).nullable().optional(),
    ssNumber: z.string().nullable().optional(),
    iban: z.string().nullable().optional(),
    health: HealthSchema.nullable().optional(),
  })
  .openapi('CandidateSensitive');

const DuplicateBody = z.strictObject({ idDocumentType: IdDocumentType, idDocumentNumber: z.string().trim().min(3).max(20) })
  .openapi('CandidateDuplicateCheck');
const DuplicateSchema = z
  .object({
    valid: z.boolean().openapi({ description: 'Formato y letra de control' }),
    duplicate: z.object({ id: z.guid(), code: z.string(), name: z.string() }).nullable(),
  })
  .openapi('CandidateDuplicate');

const CatalogItemSchema = z
  .object({
    id: z.guid(), catalog: CatalogKind, name: z.string(), group: z.string().nullable(), synonyms: z.array(z.string()),
    matchedSynonym: z.string().nullable().openapi({ description: 'El sinónimo que coincide con la búsqueda («también «toro»»)' }),
  })
  .openapi('CandidateCatalogItem');

const NoticeSchema = z
  .object({
    id: z.guid(), purpose: z.enum(['talent_pool', 'health_data']), version: z.string(), text: z.string(),
    createdByName: z.string().nullable().openapi({ description: 'Quién publicó la versión' }), createdAt: Timestamp,
  })
  .openapi('PrivacyNotice');

const AccessLogSchema = z
  .object({
    id: z.number().int(), occurredAt: Timestamp, actorUserId: z.guid().nullable(), actorName: z.string().nullable(),
    action: z.enum(['view_record', 'view_sensitive', 'download_document', 'export', 'anonymize']),
    candidateId: z.guid().nullable(), candidateCode: z.string().nullable(), details: z.record(z.string(), z.unknown()),
  })
  .openapi('AccessLogEntry');

const DocumentAlertSchema = z
  .object({
    documentId: z.guid(), candidateId: z.guid(), candidateCode: z.string(), candidateName: z.string(), typeName: z.string(),
    name: z.string(), expiresOn: z.string(), daysLeft: z.number().int(), renewalNoticeSentAt: Timestamp.nullable(),
  })
  .openapi('CandidateDocumentAlert');


const ContactChannel = z.enum(['phone', 'email', 'whatsapp', 'sms', 'in_person', 'other']);
const ContactSchema = z
  .object({
    id: z.guid(), contactedAt: Timestamp, channel: ContactChannel, result: z.string().nullable(), note: z.string().nullable(),
    nextAction: z.string().nullable(), requestId: z.guid().nullable(), requestCode: z.string().nullable(),
    createdByName: z.string().nullable(),
  })
  .openapi('CandidateContact');
const loadContacts = (tx: Tx, tenantId: string, candidateId: string) => tx<z.infer<typeof ContactSchema>[]>`
  select k.id, k.contacted_at, k.channel, k.result, k.note, k.next_action, k.request_id, r.code as request_code,
         p.full_name as created_by_name
  from public.candidate_contacts k
  left join public.requests r on r.tenant_id = k.tenant_id and r.id = k.request_id
  left join public.profiles p on p.id = k.created_by
  where k.tenant_id = ${tenantId} and k.candidate_id = ${candidateId}
  order by k.contacted_at desc
`;

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------
interface SummaryRow {
  id: string; code: string; firstName: string; lastName: string | null; phone: string | null; email: string | null;
  city: string | null; provinceCode: string | null; status: Summary['status']; source: Summary['source'];
  mainProfile: Summary['mainProfile']; otherProfileNames: string[] | null; experienceYears: number | null; idDocumentType: Summary['idDocument']['type'];
  idDocumentHint: string | null; hasIdDocument: boolean; hasIdScan: boolean; idDocumentExpiresOn: string | null; ssNumberHint: string | null;
  ibanHint: string | null; poolExpiresAt: string | null; poolState: Summary['poolConsent']['state'];
  docsExpired: number; docsExpiring: number; activeApplications: number; lastContactAt: string | null;
  anonymized: boolean; createdAt: string;
}

const summarySelect = (tx: Tx, tenantId: string) => tx`
  select c.id, c.code, c.first_name, c.last_name, c.phone, c.email, c.city, c.province_code, c.status, c.source,
         case when mp.id is not null then jsonb_build_object('id', mp.id, 'name', mp.name, 'group', mp.group_name) end as main_profile,
         (select array_agg(i.name order by i.name) from public.candidate_attributes a
          join public.catalog_items i on i.tenant_id = a.tenant_id and i.id = a.item_id
          where a.tenant_id = c.tenant_id and a.candidate_id = c.id and a.catalog = 'candidate_profile') as other_profile_names,
         c.experience_years, c.id_document_type, c.id_document_hint, c.id_document_number_enc is not null as has_id_document,
         exists (select 1 from public.documents d join public.catalog_items dt on dt.tenant_id = d.tenant_id and dt.id = d.type_id
                 where d.tenant_id = c.tenant_id and d.entity_type = 'candidate' and d.entity_id = c.id and d.deleted_at is null
                   and d.status <> 'rejected' and dt.code = 'candidate_id_document') as has_id_scan,
         to_char(c.id_document_expires_on, 'YYYY-MM-DD') as id_document_expires_on, c.ss_number_hint, c.iban_hint,
         pc.expires_at as pool_expires_at,
         case when pc.id is null then 'none'
              when pc.withdrawn_at is not null or pc.expires_at <= now() then 'expired'
              when pc.expires_at <= now() + make_interval(days => t.candidate_document_notice_days) then 'expiring'
              else 'valid' end as pool_state,
         (select count(*)::int from public.documents d where d.tenant_id = c.tenant_id and d.entity_type = 'candidate'
            and d.entity_id = c.id and d.deleted_at is null and d.expires_on < current_date) as docs_expired,
         (select count(*)::int from public.documents d where d.tenant_id = c.tenant_id and d.entity_type = 'candidate'
            and d.entity_id = c.id and d.deleted_at is null
            and d.expires_on between current_date and current_date + t.candidate_document_notice_days) as docs_expiring,
         (select count(*)::int from public.applications ap where ap.tenant_id = c.tenant_id and ap.candidate_id = c.id
            and ap.stage in ('registered', 'preselected', 'interview', 'proposed', 'confirmed')) as active_applications,
         c.last_contact_at, c.anonymized_at is not null as anonymized, c.created_at
  from public.candidates c
  join public.tenants t on t.id = c.tenant_id
  left join public.catalog_items mp on mp.tenant_id = c.tenant_id and mp.id = c.main_profile_id
  left join lateral (
    select cc.id, cc.expires_at, cc.withdrawn_at from public.candidate_consents cc
    where cc.tenant_id = c.tenant_id and cc.candidate_id = c.id and cc.purpose = 'talent_pool'
    order by cc.withdrawn_at is null desc, cc.expires_at desc nulls last limit 1
  ) pc on true
  where c.tenant_id = ${tenantId}
`;

function presentSummary(r: SummaryRow): Summary {
  const expired = r.idDocumentExpiresOn !== null && r.idDocumentExpiresOn < new Date().toISOString().slice(0, 10);
  return {
    id: r.id, code: r.code, firstName: r.firstName, lastName: r.lastName, phone: r.phone, email: r.email, city: r.city,
    provinceCode: r.provinceCode, status: r.status, source: r.source, mainProfile: r.mainProfile,
    otherProfileNames: r.otherProfileNames ?? [],
    experienceYears: r.experienceYears,
    idDocument: {
      type: r.idDocumentType,
      masked: mask(r.idDocumentHint),
      expiresOn: r.idDocumentExpiresOn,
      state: !r.hasIdDocument ? 'missing' : expired ? 'expired' : 'ok',
    },
    ssNumber: r.ssNumberHint ? { masked: mask(r.ssNumberHint)! } : null,
    iban: r.ibanHint ? { masked: mask(r.ibanHint)! } : null,
    poolConsent: { state: r.poolState, expiresAt: r.poolExpiresAt },
    documentAlerts: { expired: r.docsExpired, expiring: r.docsExpiring },
    activeApplications: r.activeApplications,
    lastContactAt: r.lastContactAt,
    anonymized: r.anonymized,
    createdAt: r.createdAt,
  };
}

interface DetailRow {
  branchId: string | null; sourceRef: string | null; birthDate: string | null; nationality: string | null;
  address: string | null; postalCode: string | null; experienceYears: number | null; hasCar: boolean | null;
  otherLicensesText: string | null; experiences: CandidateOut['experiences']; education: CandidateOut['education'];
  shifts: CandidateOut['shifts']; availability: CandidateOut['availability']; availableFrom: string | null;
  maxDistanceKm: number | null; availabilityNotes: string | null; autoExpiryNotice: boolean; hasHealth: boolean;
  healthLegalBasis: CandidateOut['health']['legalBasis']; anonymizedAt: string | null; createdByName: string | null;
  updatedAt: string; hasSsNumber: boolean; hasIban: boolean; docsPending: { name: string; status: string }[];
  hasIdScan: boolean;
}

async function loadCandidate(tx: Tx, tenantId: string, id: string): Promise<CandidateOut> {
  const [row] = await tx<SummaryRow[]>`${summarySelect(tx, tenantId)} and c.id = ${id}`;
  if (!row) throw notFound('El candidato no existe');
  const [d] = await tx<DetailRow[]>`
    select c.branch_id, c.source_ref, to_char(c.birth_date, 'YYYY-MM-DD') as birth_date, c.nationality, c.address,
           c.postal_code, c.experience_years, c.has_car, c.other_licenses_text, c.experiences, c.education, c.shifts,
           c.availability, to_char(c.available_from, 'YYYY-MM-DD') as available_from, c.max_distance_km,
           c.availability_notes, c.auto_expiry_notice, c.health_enc is not null as has_health, c.health_legal_basis,
           c.anonymized_at, p.full_name as created_by_name, c.updated_at, c.ss_number_enc is not null as has_ss_number,
           c.iban_enc is not null as has_iban,
           coalesce((select jsonb_agg(jsonb_build_object('name', t.name, 'status', dd.status))
                     from public.documents dd join public.catalog_items t on t.tenant_id = dd.tenant_id and t.id = dd.type_id
                     where dd.tenant_id = c.tenant_id and dd.entity_type = 'candidate' and dd.entity_id = c.id
                       and dd.deleted_at is null and dd.status in ('pending', 'rejected')), '[]'::jsonb) as docs_pending,
           exists (select 1 from public.documents dd join public.catalog_items t on t.tenant_id = dd.tenant_id and t.id = dd.type_id
                   where dd.tenant_id = c.tenant_id and dd.entity_type = 'candidate' and dd.entity_id = c.id
                     and dd.deleted_at is null and t.code = 'candidate_id_document') as has_id_scan
    from public.candidates c left join public.profiles p on p.id = c.created_by
    where c.tenant_id = ${tenantId} and c.id = ${id}
  `;
  const attrs = await tx<{ catalog: string; id: string; name: string; group: string | null; level: string | null }[]>`
    select a.catalog, i.id, i.name, i.group_name as group, a.level
    from public.candidate_attributes a join public.catalog_items i on i.tenant_id = a.tenant_id and i.id = a.item_id
    where a.tenant_id = ${tenantId} and a.candidate_id = ${id}
    order by i.name
  `;
  const consents = await tx<z.infer<typeof ConsentSchema>[]>`
    select cc.id, cc.purpose, cc.notice_id, n.version as notice_version, cc.given_at, cc.channel, cc.document_id,
           cc.expires_at, cc.withdrawn_at, p.full_name as created_by_name
    from public.candidate_consents cc
    join public.privacy_notices n on n.tenant_id = cc.tenant_id and n.id = cc.notice_id
    left join public.profiles p on p.id = cc.created_by
    where cc.tenant_id = ${tenantId} and cc.candidate_id = ${id}
    order by cc.given_at desc
  `;
  const summary = presentSummary(row);
  const ref = (x: (typeof attrs)[number]) => ({ id: x.id, name: x.name, group: x.group });
  const languages = attrs.filter((a) => a.catalog === 'language');
  const missing: CandidateOut['missing'] = [];
  if (summary.idDocument.state === 'missing' || !d!.hasIdScan) {
    missing.push({ code: 'id_document', message: 'Falta el documento de identidad (número y documento escaneado)', tab: 'documents' });
  } else if (summary.idDocument.state === 'expired') {
    missing.push({ code: 'id_document_expired', message: 'El documento de identidad está caducado: pide el renovado', tab: 'documents' });
  }
  if (summary.poolConsent.state === 'none' || summary.poolConsent.state === 'expired') {
    missing.push({ code: 'pool_consent', message: 'Sin consentimiento de la bolsa vigente: solo puede entrar en peticiones a las que se inscriba', tab: 'documents' });
  }
  for (const doc of d!.docsPending) {
    missing.push({ code: 'document_review', message: `${doc.name}: ${doc.status === 'rejected' ? 'rechazado, hay que pedirlo de nuevo' : 'sin comprobar'}`, tab: 'documents' });
  }
  if (!d!.hasSsNumber) missing.push({ code: 'ss_number', message: 'Número de la Seguridad Social (necesario para el alta)', tab: 'personal' });
  if (!d!.hasIban) missing.push({ code: 'iban', message: 'Cuenta bancaria (necesaria para la nómina)', tab: 'personal' });
  const personal = [['birthDate', 'fecha de nacimiento'], ['nationality', 'nacionalidad'], ['address', 'dirección'], ['postalCode', 'código postal']]
    .filter(([k]) => !d![k as keyof DetailRow]).map(([, n]) => n);
  if (personal.length) missing.push({ code: 'personal', message: `Falta: ${personal.join(', ')}`, tab: 'personal' });
  if (!languages.length) missing.push({ code: 'languages', message: 'Sin idiomas indicados', tab: 'profile' });
  if (!d!.experiences.length) missing.push({ code: 'experience', message: 'Experiencia laboral sin detallar', tab: 'profile' });

  const { docsPending: _dp, hasIdScan: _his, hasSsNumber: _hs, hasIban: _hi, hasHealth, healthLegalBasis, ...detail } = d!;
  return {
    ...summary,
    ...detail,
    attributes: {
      licenses: attrs.filter((a) => a.catalog === 'license').map(ref),
      skills: attrs.filter((a) => a.catalog === 'skill').map(ref),
      languages: languages.map((x) => ({ ...ref(x), level: x.level as CandidateOut['attributes']['languages'][number]['level'] })),
      otherProfiles: attrs.filter((a) => a.catalog === 'candidate_profile').map(ref),
    },
    health: { hasData: hasHealth, legalBasis: healthLegalBasis },
    consents: [...consents],
    applications: await loadApplications(tx, tenantId, { candidateId: id }),
    missing,
  };
}


// ---------------------------------------------------------------------------
// Estado de la documentación (sin descifrar: campos vacíos, documentos que faltan, caducidades y consentimiento)
// ---------------------------------------------------------------------------
type DocsFilter = 'alerts' | 'missing' | 'ok' | 'pending' | 'id_or_ss_pending' | 'privacy_pending';
const SQL_ID_OR_SS_PENDING = (tx: Tx) =>
  tx`(not x.has_id_document or not x.has_id_scan or x.id_document_expires_on < to_char(current_date, 'YYYY-MM-DD') or x.ss_number_hint is null)`;
const SQL_PRIVACY_PENDING = (tx: Tx) => tx`(x.pool_state in ('none', 'expired'))`;
function documentsCondition(tx: Tx, filter: DocsFilter) {
  switch (filter) {
    case 'alerts':
      return tx`(x.docs_expired > 0 or x.docs_expiring > 0 or x.id_document_expires_on < to_char(current_date, 'YYYY-MM-DD'))`;
    case 'missing':
      return tx`(not x.has_id_document or x.pool_state in ('none', 'expired'))`;
    case 'id_or_ss_pending':
      return SQL_ID_OR_SS_PENDING(tx);
    case 'privacy_pending':
      return SQL_PRIVACY_PENDING(tx);
    case 'pending':
      return tx`(${SQL_ID_OR_SS_PENDING(tx)} or ${SQL_PRIVACY_PENDING(tx)})`;
    case 'ok':
      return tx`(not ${SQL_ID_OR_SS_PENDING(tx)} and not ${SQL_PRIVACY_PENDING(tx)} and x.docs_expired = 0)`;
  }
}
/** Lo mismo en la API, para los recuentos. */
function documentsState(r: SummaryRow) {
  const today = new Date().toISOString().slice(0, 10);
  const idOrSsPending = !r.hasIdDocument || !r.hasIdScan || (r.idDocumentExpiresOn !== null && r.idDocumentExpiresOn < today) || r.ssNumberHint === null;
  const privacyPending = r.poolState === 'none' || r.poolState === 'expired';
  return { idOrSsPending, privacyPending, pending: idOrSsPending || privacyPending, ok: !idOrSsPending && !privacyPending && r.docsExpired === 0 };
}

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------
const pdOf = (c: Context<AppEnv>) => c.get('personalData');

/** Columnas desde el cuerpo: lo sensible se cifra (y el documento lleva su huella y busca duplicados). */
async function candidateColumns(
  tx: Tx, ctx: TenantContext, pd: PersonalData | undefined, body: WriteBody,
  current: { id: string | null; idDocumentType: string | null },
) {
  const out: Record<string, unknown> = {};
  const simple = ['firstName', 'lastName', 'idDocumentType', 'idDocumentExpiresOn', 'birthDate', 'nationality', 'phone', 'email',
    'address', 'postalCode', 'city', 'provinceCode', 'status', 'source', 'sourceRef', 'branchId', 'mainProfileId',
    'experienceYears', 'hasCar', 'otherLicensesText', 'shifts', 'availability', 'availableFrom', 'maxDistanceKm',
    'availabilityNotes', 'autoExpiryNotice', 'lastContactAt'] as const;
  for (const key of simple) if (body[key] !== undefined) out[key] = body[key];
  if (body.experiences !== undefined) out.experiences = tx.json(body.experiences as never);
  if (body.education !== undefined) out.education = tx.json(body.education as never);

  if (body.idDocumentNumber !== undefined) {
    if (body.idDocumentNumber === null) {
      Object.assign(out, { idDocumentNumberEnc: null, idDocumentFingerprint: null, idDocumentHint: null });
    } else {
      const type = body.idDocumentType ?? current.idDocumentType;
      if (!type) throw new ApiError(422, 'validacion', 'Indica el tipo de documento', [{ path: 'idDocumentType', message: 'Obligatorio con el número' }]);
      const number = normalizeIdNumber(body.idDocumentNumber);
      if (!validIdDocument(type, number)) {
        throw new ApiError(422, 'validacion', 'El documento no es válido', [{ path: 'idDocumentNumber', message: type === 'dni' || type === 'nie' ? 'La letra no corresponde' : 'Formato no válido' }]);
      }
      const p = requirePersonalData(pd);
      const fingerprint = p.fingerprint(ctx.tenantId, number);
      const [dup] = await tx<{ id: string; code: string }[]>`
        select id, code from public.candidates
        where tenant_id = ${ctx.tenantId} and id_document_fingerprint = ${fingerprint}
          and ${current.id ? tx`id <> ${current.id}` : tx`true`}
      `;
      if (dup) {
        throw new ApiError(409, 'conflicto', `Ya hay un candidato con ese documento: ${dup.code}`,
          [{ path: 'idDocumentNumber', message: `Ya existe: ${dup.code} (id ${dup.id})` }]);
      }
      Object.assign(out, { idDocumentNumberEnc: p.encrypt(number), idDocumentFingerprint: fingerprint, idDocumentHint: hintOf(number) });
    }
  }
  if (body.ssNumber !== undefined) {
    if (body.ssNumber === null) Object.assign(out, { ssNumberEnc: null, ssNumberHint: null });
    else {
      const v = normalizeSsNumber(body.ssNumber);
      if (!validSsNumber(v)) throw new ApiError(422, 'validacion', 'El número de la Seguridad Social no es válido', [{ path: 'ssNumber', message: '12 cifras con su control' }]);
      Object.assign(out, { ssNumberEnc: requirePersonalData(pd).encrypt(v), ssNumberHint: hintOf(v) });
    }
  }
  if (body.iban !== undefined) {
    if (body.iban === null) Object.assign(out, { ibanEnc: null, ibanHint: null });
    else {
      const v = normalizeIban(body.iban);
      if (!validSpanishIban(v)) throw new ApiError(422, 'validacion', 'El IBAN no es válido', [{ path: 'iban', message: 'IBAN español: ES y 22 cifras, con su control' }]);
      Object.assign(out, { ibanEnc: requirePersonalData(pd).encrypt(v), ibanHint: hintOf(v) });
    }
  }
  if (body.health !== undefined) {
    if (body.health === null) Object.assign(out, { healthEnc: null, healthLegalBasis: null });
    else {
      const { legalBasis, ...data } = body.health;
      Object.assign(out, { healthEnc: requirePersonalData(pd).encrypt(JSON.stringify(data)), healthLegalBasis: legalBasis });
    }
  }
  return out as Record<string, never>;
}

/** Sustituye otros perfiles, carnés y habilidades (attributeIds) o idiomas (languages). */
async function replaceAttributes(tx: Tx, tenantId: string, candidateId: string, body: WriteBody) {
  if (body.attributeIds !== undefined) {
    const ids = [...new Set(body.attributeIds)];
    const items = ids.length
      ? await tx<{ id: string; catalog: string }[]>`
          select id, catalog from public.catalog_items
          where tenant_id = ${tenantId} and id in ${tx(ids)} and deleted_at is null
            and catalog in ('candidate_profile', 'license', 'skill')`
      : [];
    if (items.length !== ids.length) {
      throw new ApiError(422, 'referencia_invalida', 'Algún valor no es un perfil, carné o habilidad de la ETT');
    }
    await tx`delete from public.candidate_attributes where tenant_id = ${tenantId} and candidate_id = ${candidateId} and catalog <> 'language'`;
    if (items.length) {
      await tx`insert into public.candidate_attributes ${tx(items.map((i) => ({ tenantId, candidateId, itemId: i.id, catalog: i.catalog })))}`;
    }
  }
  if (body.languages !== undefined) {
    const list = [...new Map(body.languages.map((l) => [l.id, l])).values()];
    const items = list.length
      ? await tx<{ id: string }[]>`
          select id from public.catalog_items where tenant_id = ${tenantId} and catalog = 'language' and deleted_at is null
            and id in ${tx(list.map((l) => l.id))}`
      : [];
    if (items.length !== list.length) throw new ApiError(422, 'referencia_invalida', 'Algún idioma no está en la tabla maestra');
    await tx`delete from public.candidate_attributes where tenant_id = ${tenantId} and candidate_id = ${candidateId} and catalog = 'language'`;
    if (list.length) {
      await tx`insert into public.candidate_attributes ${tx(list.map((l) => ({ tenantId, candidateId, itemId: l.id, catalog: 'language', level: l.level })))}`;
    }
  }
}

async function checkMainProfile(tx: Tx, tenantId: string, id: string | null | undefined) {
  if (!id) return;
  const [ok] = await tx`select 1 from public.catalog_items where tenant_id = ${tenantId} and id = ${id} and catalog = 'candidate_profile' and deleted_at is null`;
  if (!ok) throw new ApiError(422, 'referencia_invalida', 'El perfil principal tiene que ser de la tabla maestra de perfiles');
}

const audit = (tx: Tx, action: string, candidateId: string | null, details: Record<string, unknown> = {}) =>
  tx`select private.log_access(${action}, ${candidateId}, ${tx.json(details as never)})`;

const requirePerm = (ctx: TenantContext, perm: string) => {
  if (!ctx.permissions.has(perm) && !ctx.isSuperadmin) throw forbidden(`No tienes permiso para esta acción (${perm})`);
};

// ---------------------------------------------------------------------------
// Rutas
// ---------------------------------------------------------------------------
export const candidates = createRouter()
  .openapi(
    createRoute({
      method: 'get',
      path: '/candidates',
      tags,
      summary: 'Lista los candidatos',
      description:
        'Bolsa común de la ETT. `q` busca en nombre, teléfono, email y localidad, y en perfiles, carnés y habilidades por ' +
        'nombre o sinónimo («toro» encuentra a los carretilleros). Los datos sensibles van enmascarados. No se audita.',
      security: bearerSecurity,
      request: { query: ListQuery },
      responses: { 200: jsonContent(paginated(CandidateSummarySchema), 'Candidatos'), ...errorResponses(400, 401, 403) },
    }),
    async (c) => {
      const q = c.req.valid('query');
      const page = await withTenant(c, {}, async (tx, ctx) => {
        const conds = [q.anonymized ? tx`c.anonymized_at is not null` : tx`c.anonymized_at is null`];
        if (q.q) {
          const norm = likePattern(q.q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' '));
          const raw = likePattern(q.q);
          conds.push(tx`(
            private.search_norm(c.first_name || ' ' || coalesce(c.last_name, '')) like ${norm} or c.phone like ${raw}
            or lower(c.email) like ${raw.toLowerCase()} or private.search_norm(c.city) like ${norm} or c.code ilike ${raw}
            or exists (
              select 1 from public.catalog_items i
              where i.tenant_id = c.tenant_id
                and (i.id = c.main_profile_id or i.id in (select a.item_id from public.candidate_attributes a
                                                          where a.tenant_id = c.tenant_id and a.candidate_id = c.id))
                and (private.search_norm(i.name) like ${norm}
                     or exists (select 1 from unnest(i.synonyms) s where private.search_norm(s) like ${norm}))))`);
        }
        if (q.status) conds.push(tx`c.status = ${q.status}`);
        if (q.source) conds.push(tx`c.source = ${q.source}`);
        if (q.profileId) {
          conds.push(tx`(c.main_profile_id = ${q.profileId} or exists (select 1 from public.candidate_attributes a
            where a.tenant_id = c.tenant_id and a.candidate_id = c.id and a.item_id = ${q.profileId}))`);
        }
        for (const id of q.attributeId?.split(',') ?? []) {
          conds.push(tx`exists (select 1 from public.candidate_attributes a where a.tenant_id = c.tenant_id and a.candidate_id = c.id and a.item_id = ${id})`);
        }
        if (q.idDocumentNumber) {
          const fp = requirePersonalData(c.get('personalData')).fingerprint(ctx.tenantId, normalizeIdNumber(q.idDocumentNumber));
          conds.push(tx`c.id_document_fingerprint = ${fp}`);
        }
        const where = conds.reduce((acc, cond) => tx`${acc} and ${cond}`);
        const pool = q.poolConsent ? tx`x.pool_state = ${q.poolConsent}` : tx`true`;
        const docs = q.documents ? documentsCondition(tx, q.documents) : tx`true`;
        const base = tx`select * from (${summarySelect(tx, ctx.tenantId)} and ${where}) x where ${docs} and ${pool}`;
        const rows = await tx<SummaryRow[]>`${base} order by x.created_at desc, x.code desc limit ${q.limit} offset ${q.offset}`;
        const [count] = await tx<{ total: number }[]>`select count(*)::int as total from (${base}) s`;
        return { data: rows.map(presentSummary), pagination: { limit: q.limit, offset: q.offset, total: count?.total ?? 0 } };
      });
      return c.json(page, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/candidates',
      tags,
      summary: 'Dar de alta un candidato',
      description:
        `Requiere \`${MANAGE}\`. Número de la serie \`candidate\` (CAN2026-00001). El documento de identidad se valida (letra del ` +
        'DNI y del NIE), se cifra y se comprueba que no exista ya (409 con el candidato que lo tiene). Con datos sensibles y sin ' +
        'clave de cifrado configurada, 503.',
      security: bearerSecurity,
      request: { body: jsonBody(CreateSchema) },
      responses: { 201: jsonContent(CandidateSchema, 'Candidato'), ...errorResponses(400, 401, 403, 409, 422, 503) },
    }),
    async (c) => {
      const body = c.req.valid('json');
      const pd = pdOf(c);
      const candidate = await withTenant(c, { permission: MANAGE }, async (tx, ctx) => {
        await checkMainProfile(tx, ctx.tenantId, body.mainProfileId);
        const columns = await candidateColumns(tx, ctx, pd, body, { id: null, idDocumentType: null });
        const [code] = await tx<{ formatted: string }[]>`
          select formatted from private.next_number(${ctx.tenantId}, 'candidate', extract(year from current_date)::int)
        `;
        const [row] = await tx<{ id: string }[]>`
          insert into public.candidates ${tx({ tenantId: ctx.tenantId, code: code!.formatted, ...columns } as never)} returning id
        `;
        await replaceAttributes(tx, ctx.tenantId, row!.id, body);
        return loadCandidate(tx, ctx.tenantId, row!.id);
      });
      return c.json(candidate, 201);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/candidates/check-duplicate',
      tags,
      summary: 'Comprobar un documento de identidad',
      description: 'Valida el formato y la letra, y busca por la huella si ya hay un candidato con ese documento en la ETT.',
      security: bearerSecurity,
      request: { body: jsonBody(DuplicateBody) },
      responses: { 200: jsonContent(DuplicateSchema, 'Resultado'), ...errorResponses(400, 401, 403, 503) },
    }),
    async (c) => {
      const body = c.req.valid('json');
      const pd = pdOf(c);
      const result = await withTenant(c, { permission: MANAGE }, async (tx, ctx) => {
        const number = normalizeIdNumber(body.idDocumentNumber);
        const valid = validIdDocument(body.idDocumentType, number);
        if (!valid) return { valid, duplicate: null };
        const [dup] = await tx<{ id: string; code: string; name: string }[]>`
          select id, code, trim(first_name || ' ' || coalesce(last_name, '')) as name from public.candidates
          where tenant_id = ${ctx.tenantId} and id_document_fingerprint = ${requirePersonalData(pd).fingerprint(ctx.tenantId, number)}
        `;
        return { valid, duplicate: dup ?? null };
      });
      return c.json(result, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/candidates/{id}',
      tags,
      summary: 'Ver un candidato',
      description: 'La ficha completa, con los datos sensibles enmascarados. Queda en la auditoría de accesos (`view_record`).',
      security: bearerSecurity,
      request: { params: IdParams },
      responses: { 200: jsonContent(CandidateSchema, 'Candidato'), ...errorResponses(400, 401, 403, 404) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const candidate = await withTenant(c, {}, async (tx, ctx) => {
        const out = await loadCandidate(tx, ctx.tenantId, id);
        await audit(tx, 'view_record', id);
        return out;
      });
      return c.json(candidate, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'patch',
      path: '/candidates/{id}',
      tags,
      summary: 'Cambiar un candidato',
      description:
        'Solo lo enviado. `attributeIds` y `languages` sustituyen la lista entera. Una persona anonimizada no cambia (409). ' +
        'Los datos de salud con `explicit_consent` necesitan un consentimiento `health_data` vigente (422).',
      security: bearerSecurity,
      request: { params: IdParams, body: jsonBody(UpdateSchema) },
      responses: { 200: jsonContent(CandidateSchema, 'Candidato'), ...errorResponses(400, 401, 403, 404, 409, 422, 503) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      const pd = pdOf(c);
      const candidate = await withTenant(c, { permission: MANAGE }, async (tx, ctx) => {
        const [current] = await tx<{ idDocumentType: string | null; anonymized: boolean; status: string }[]>`
          select id_document_type, anonymized_at is not null as anonymized, status from public.candidates
          where tenant_id = ${ctx.tenantId} and id = ${id}
        `;
        if (!current) throw notFound('El candidato no existe');
        if (current.anonymized) throw new ApiError(409, 'conflicto', 'La persona está anonimizada: no se puede cambiar');
        if (body.status && ['in_mission', 'onboarding'].includes(current.status)) {
          throw new ApiError(409, 'conflicto', 'Está en misión o incorporándose: su estado lo lleva Contratos y altas');
        }
        await checkMainProfile(tx, ctx.tenantId, body.mainProfileId);
        const columns = await candidateColumns(tx, ctx, pd, body, { id, idDocumentType: current.idDocumentType });
        if (Object.keys(columns).length) {
          await tx`update public.candidates set ${tx(columns)} where tenant_id = ${ctx.tenantId} and id = ${id}`;
        }
        await replaceAttributes(tx, ctx.tenantId, id, body);
        return loadCandidate(tx, ctx.tenantId, id);
      });
      return c.json(candidate, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/candidates/{id}/sensitive',
      tags,
      summary: 'Ver los datos sensibles completos',
      description: `Requiere \`${VIEW_SENSITIVE}\`. Descifra los campos pedidos y lo deja en la auditoría (\`view_sensitive\`, con qué campos).`,
      security: bearerSecurity,
      request: { params: IdParams, query: SensitiveQuery },
      responses: { 200: jsonContent(SensitiveSchema, 'Datos'), ...errorResponses(400, 401, 403, 404, 503) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const fields = [...new Set(c.req.valid('query').fields.split(','))] as z.infer<typeof SensitiveField>[];
      const pd = requirePersonalData(pdOf(c));
      const data = await withTenant(c, { permission: VIEW_SENSITIVE }, async (tx, ctx) => {
        const [row] = await tx<{ idDocumentType: 'dni' | 'nie' | 'passport' | 'other' | null; idDocumentNumberEnc: string | null; ssNumberEnc: string | null; ibanEnc: string | null; healthEnc: string | null; healthLegalBasis: z.infer<typeof HealthBasis> | null }[]>`
          select id_document_type, id_document_number_enc, ss_number_enc, iban_enc, health_enc, health_legal_basis
          from public.candidates where tenant_id = ${ctx.tenantId} and id = ${id}
        `;
        if (!row) throw notFound('El candidato no existe');
        const out: z.infer<typeof SensitiveSchema> = {};
        if (fields.includes('idDocument')) {
          out.idDocument = row.idDocumentNumberEnc ? { type: row.idDocumentType!, number: pd.decrypt(row.idDocumentNumberEnc) } : null;
        }
        if (fields.includes('ssNumber')) out.ssNumber = row.ssNumberEnc ? pd.decrypt(row.ssNumberEnc) : null;
        if (fields.includes('iban')) out.iban = row.ibanEnc ? pd.decrypt(row.ibanEnc) : null;
        if (fields.includes('health')) {
          out.health = row.healthEnc ? { ...JSON.parse(pd.decrypt(row.healthEnc)), legalBasis: row.healthLegalBasis } : null;
        }
        await audit(tx, 'view_sensitive', id, { fields });
        return out;
      });
      return c.json(data, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/candidates/{id}/export',
      tags: ['Protección de datos'],
      summary: 'Exportar los datos de una persona (derecho de acceso)',
      description: `Requiere \`${PRIVACY}\`. Todo lo de la persona, descifrado: ficha, consentimientos con su texto, candidaturas y documentos. Queda en la auditoría (\`export\`).`,
      security: bearerSecurity,
      request: { params: IdParams },
      responses: { 200: jsonContent(z.record(z.string(), z.unknown()).openapi('CandidateExport'), 'Datos de la persona'), ...errorResponses(400, 401, 403, 404, 503) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const pd = requirePersonalData(pdOf(c));
      const data = await withTenant(c, { permission: PRIVACY }, async (tx, ctx) => {
        const candidate = await loadCandidate(tx, ctx.tenantId, id);
        const [enc] = await tx<{ idDocumentNumberEnc: string | null; ssNumberEnc: string | null; ibanEnc: string | null; healthEnc: string | null }[]>`
          select id_document_number_enc, ss_number_enc, iban_enc, health_enc from public.candidates where tenant_id = ${ctx.tenantId} and id = ${id}
        `;
        const consents = await tx`
          select cc.purpose, n.version, n.text, cc.given_at, cc.channel, cc.expires_at, cc.withdrawn_at
          from public.candidate_consents cc join public.privacy_notices n on n.tenant_id = cc.tenant_id and n.id = cc.notice_id
          where cc.tenant_id = ${ctx.tenantId} and cc.candidate_id = ${id} order by cc.given_at
        `;
        const docs = await tx`
          select d.name, t.name as type, d.status, d.expires_on, d.uploaded_at from public.documents d
          join public.catalog_items t on t.tenant_id = d.tenant_id and t.id = d.type_id
          where d.tenant_id = ${ctx.tenantId} and d.entity_type = 'candidate' and d.entity_id = ${id} order by d.uploaded_at
        `;
        await audit(tx, 'export', id);
        const { consents: _c, missing: _m, ...rest } = candidate;
        return {
          exportedAt: new Date().toISOString(),
          candidate: {
            ...rest,
            idDocument: { ...rest.idDocument, number: enc!.idDocumentNumberEnc ? pd.decrypt(enc!.idDocumentNumberEnc) : null },
            ssNumber: enc!.ssNumberEnc ? pd.decrypt(enc!.ssNumberEnc) : null,
            iban: enc!.ibanEnc ? pd.decrypt(enc!.ibanEnc) : null,
            health: enc!.healthEnc ? JSON.parse(pd.decrypt(enc!.healthEnc)) : null,
          },
          consents: [...consents],
          documents: [...docs],
        };
      });
      return c.json(data, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/candidates/{id}/anonymize',
      tags: ['Protección de datos'],
      summary: 'Anonimizar (derecho de supresión)',
      description:
        `Requiere \`${PRIVACY}\`. Borra o sustituye los datos personales, borra sus documentos (salvo los de conservación ` +
        'obligatoria) y los valores de su historial, y saca a la persona de los procesos abiertos. Se conservan la auditoría, ' +
        'los consentimientos (prueba de la base legal) y lo que obliga la ley. 409 si tiene una plaza confirmada.',
      security: bearerSecurity,
      request: { params: IdParams, body: jsonBody(z.strictObject({ reason: z.string().trim().min(1).max(250) }).openapi('CandidateAnonymize')) },
      responses: { 200: jsonContent(CandidateSchema, 'Candidato anonimizado'), ...errorResponses(400, 401, 403, 404, 409) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const { reason } = c.req.valid('json');
      const { candidate, paths } = await withTenant(c, { permission: PRIVACY }, async (tx, ctx) => {
        const [exists] = await tx`select 1 from public.candidates where tenant_id = ${ctx.tenantId} and id = ${id}`;
        if (!exists) throw notFound('El candidato no existe');
        const removed = await tx<{ storagePath: string }[]>`select storage_path from private.anonymize_candidate(${ctx.tenantId}, ${id}, ${reason})`;
        return { candidate: await loadCandidate(tx, ctx.tenantId, id), paths: removed.map((r) => r.storagePath) };
      });
      // Los ficheros, después de confirmar la transacción (si falla, quedan huérfanos pero sin ficha).
      const storage = c.get('storage');
      if (storage && paths.length) await Promise.allSettled(paths.map((p) => storage.remove(p)));
      return c.json(candidate, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/candidates/{id}/consents',
      tags: ['Protección de datos'],
      summary: 'Registrar un consentimiento',
      description: 'Bolsa (`talent_pool`, caduca a los meses de la ETT) o datos de salud (`health_data`), con la versión del texto aceptado.',
      security: bearerSecurity,
      request: {
        params: IdParams,
        body: jsonBody(z.strictObject({
          purpose: z.enum(['talent_pool', 'health_data']),
          noticeId: z.guid(),
          givenAt: z.iso.datetime({ offset: true }).optional(),
          channel: z.enum(['portal', 'paper', 'email', 'other']),
          documentId: z.guid().nullable().optional(),
        }).openapi('CandidateConsentCreate')),
      },
      responses: { 201: jsonContent(CandidateSchema, 'Candidato'), ...errorResponses(400, 401, 403, 404, 409, 422) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      const candidate = await withTenant(c, { permission: MANAGE }, async (tx, ctx) => {
        const [exists] = await tx`select 1 from public.candidates where tenant_id = ${ctx.tenantId} and id = ${id}`;
        if (!exists) throw notFound('El candidato no existe');
        await tx`insert into public.candidate_consents ${tx({
          tenantId: ctx.tenantId, candidateId: id, purpose: body.purpose, noticeId: body.noticeId, channel: body.channel,
          documentId: body.documentId ?? null, ...(body.givenAt ? { givenAt: body.givenAt } : {}),
        } as never)}`;
        return loadCandidate(tx, ctx.tenantId, id);
      });
      return c.json(candidate, 201);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/candidate-consents/{id}/withdraw',
      tags: ['Protección de datos'],
      summary: 'Retirar un consentimiento',
      security: bearerSecurity,
      request: { params: IdParams },
      responses: { 200: jsonContent(CandidateSchema, 'Candidato'), ...errorResponses(400, 401, 403, 404, 409) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const candidate = await withTenant(c, { permission: MANAGE }, async (tx, ctx) => {
        const [row] = await tx<{ candidateId: string }[]>`
          update public.candidate_consents set withdrawn_at = now() where tenant_id = ${ctx.tenantId} and id = ${id}
          returning candidate_id
        `;
        if (!row) throw notFound('El consentimiento no existe');
        return loadCandidate(tx, ctx.tenantId, row.candidateId);
      });
      return c.json(candidate, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/privacy-notices',
      tags: ['Protección de datos'],
      summary: 'Textos legales de la ETT',
      security: bearerSecurity,
      request: { query: z.object({ purpose: z.enum(['talent_pool', 'health_data']).optional() }) },
      responses: { 200: jsonContent(listOf(NoticeSchema), 'Textos'), ...errorResponses(401, 403) },
    }),
    async (c) => {
      const { purpose } = c.req.valid('query');
      const data = await withTenant(c, {}, (tx, ctx) => tx<z.infer<typeof NoticeSchema>[]>`
        select n.id, n.purpose, n.version, n.text, p.full_name as created_by_name, n.created_at
        from public.privacy_notices n left join public.profiles p on p.id = n.created_by
        where n.tenant_id = ${ctx.tenantId} and ${purpose ? tx`n.purpose = ${purpose}` : tx`true`}
        order by n.purpose, n.created_at desc
      `);
      return c.json({ data: [...data] }, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/privacy-notices',
      tags: ['Protección de datos'],
      summary: 'Publicar una versión de un texto legal',
      description: `Requiere \`${PRIVACY}\`. Una versión no cambia: para cambiar el texto, otra versión.`,
      security: bearerSecurity,
      request: {
        body: jsonBody(z.strictObject({
          purpose: z.enum(['talent_pool', 'health_data']),
          version: z.string().trim().min(1).max(30),
          text: z.string().trim().min(1).max(20000),
        }).openapi('PrivacyNoticeCreate')),
      },
      responses: { 201: jsonContent(NoticeSchema, 'Texto'), ...errorResponses(400, 401, 403, 409) },
    }),
    async (c) => {
      const body = c.req.valid('json');
      const notice = await withTenant(c, { permission: PRIVACY }, async (tx, ctx) => {
        const [row] = await tx<z.infer<typeof NoticeSchema>[]>`
          insert into public.privacy_notices ${tx({ tenantId: ctx.tenantId, createdBy: ctx.userId, ...body })}
          returning id, purpose, version, text, (select full_name from public.profiles where id = ${ctx.userId}) as created_by_name, created_at
        `;
        return row!;
      });
      return c.json(notice, 201);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/privacy/retention',
      tags: ['Protección de datos'],
      summary: 'Candidatos con el plazo de conservación cumplido',
      description:
        `Requiere \`${PRIVACY}\`. Sin consentimiento de la bolsa vigente (nunca lo tuvieron, caducó o lo retiraron), sin ` +
        'candidaturas activas y dados de alta hace más del plazo de la ETT. Se anonimizan uno a uno; la tarea automática llegará más adelante.',
      security: bearerSecurity,
      request: { query: PaginationQuery },
      responses: { 200: jsonContent(paginated(CandidateSummarySchema), 'Candidatos'), ...errorResponses(401, 403) },
    }),
    async (c) => {
      const q = c.req.valid('query');
      const page = await withTenant(c, { permission: PRIVACY }, async (tx, ctx) => {
        const base = tx`
          select * from (${summarySelect(tx, ctx.tenantId)} and c.anonymized_at is null
                          and c.created_at < now() - make_interval(months => t.candidate_pool_retention_months)) x
          where x.pool_state in ('none', 'expired') and x.active_applications = 0
        `;
        const rows = await tx<SummaryRow[]>`${base} order by x.created_at limit ${q.limit} offset ${q.offset}`;
        const [count] = await tx<{ total: number }[]>`select count(*)::int as total from (${base}) s`;
        return { data: rows.map(presentSummary), pagination: { limit: q.limit, offset: q.offset, total: count?.total ?? 0 } };
      });
      return c.json(page, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/access-log',
      tags: ['Protección de datos'],
      summary: 'Auditoría de accesos a datos personales',
      description: `Requiere \`${AUDIT}\`. Solo se añade: nadie la puede cambiar ni borrar.`,
      security: bearerSecurity,
      request: {
        query: PaginationQuery.extend({
          candidateId: z.guid().optional(),
          actorUserId: z.guid().optional(),
          action: AccessLogSchema.shape.action.optional(),
          from: z.iso.date().optional(),
          to: z.iso.date().optional(),
        }),
      },
      responses: { 200: jsonContent(paginated(AccessLogSchema), 'Accesos'), ...errorResponses(400, 401, 403) },
    }),
    async (c) => {
      const q = c.req.valid('query');
      const page = await withTenant(c, {}, async (tx, ctx) => {
        requirePerm(ctx, AUDIT);
        const conds = [tx`a.tenant_id = ${ctx.tenantId}`];
        if (q.candidateId) conds.push(tx`a.candidate_id = ${q.candidateId}`);
        if (q.actorUserId) conds.push(tx`a.actor_user_id = ${q.actorUserId}`);
        if (q.action) conds.push(tx`a.action = ${q.action}`);
        if (q.from) conds.push(tx`a.occurred_at >= ${q.from}::date`);
        if (q.to) conds.push(tx`a.occurred_at < ${q.to}::date + 1`);
        const where = conds.reduce((acc, cond) => tx`${acc} and ${cond}`);
        const data = await tx<z.infer<typeof AccessLogSchema>[]>`
          select a.id::int as id, a.occurred_at, a.actor_user_id, p.full_name as actor_name, a.action, a.candidate_id,
                 c.code as candidate_code, a.details
          from public.access_log a
          left join public.profiles p on p.id = a.actor_user_id
          left join public.candidates c on c.tenant_id = a.tenant_id and c.id = a.candidate_id
          where ${where} order by a.occurred_at desc, a.id desc limit ${q.limit} offset ${q.offset}
        `;
        const [count] = await tx<{ total: number }[]>`select count(*)::int as total from public.access_log a where ${where}`;
        return { data: [...data], pagination: { limit: q.limit, offset: q.offset, total: count?.total ?? 0 } };
      });
      return c.json(page, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/candidate-document-alerts',
      tags,
      summary: 'Documentos de candidatos caducados o por caducar',
      description: 'Caducados y los que caducan en `days` días (por defecto, el aviso de la ETT). De personas no anonimizadas.',
      security: bearerSecurity,
      request: { query: PaginationQuery.extend({ days: z.coerce.number().int().min(0).max(365).optional() }) },
      responses: { 200: jsonContent(paginated(DocumentAlertSchema), 'Documentos'), ...errorResponses(400, 401, 403) },
    }),
    async (c) => {
      const q = c.req.valid('query');
      const page = await withTenant(c, {}, async (tx, ctx) => {
        const base = tx`
          select d.id as document_id, c.id as candidate_id, c.code as candidate_code,
                 trim(c.first_name || ' ' || coalesce(c.last_name, '')) as candidate_name, t.name as type_name, d.name,
                 to_char(d.expires_on, 'YYYY-MM-DD') as expires_on, (d.expires_on - current_date) as days_left,
                 d.renewal_notice_sent_at
          from public.documents d
          join public.candidates c on c.tenant_id = d.tenant_id and c.id = d.entity_id and c.anonymized_at is null
          join public.catalog_items t on t.tenant_id = d.tenant_id and t.id = d.type_id
          join public.tenants tn on tn.id = d.tenant_id
          where d.tenant_id = ${ctx.tenantId} and d.entity_type = 'candidate' and d.deleted_at is null
            and d.expires_on <= current_date + coalesce(${q.days ?? null}::int, tn.candidate_document_notice_days)
        `;
        const data = await tx<z.infer<typeof DocumentAlertSchema>[]>`${base} order by days_left, candidate_code limit ${q.limit} offset ${q.offset}`;
        const [count] = await tx<{ total: number }[]>`select count(*)::int as total from (${base}) s`;
        return { data: [...data], pagination: { limit: q.limit, offset: q.offset, total: count?.total ?? 0 } };
      });
      return c.json(page, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/candidate-catalog',
      tags,
      summary: 'Buscar en perfiles, carnés, habilidades o idiomas',
      description: 'Por nombre o sinónimo, sin acentos ni mayúsculas. Sin `q`, todos, agrupados por grupo.',
      security: bearerSecurity,
      request: { query: z.object({ catalog: CatalogKind, q: z.string().trim().min(1).max(100).optional() }) },
      responses: { 200: jsonContent(listOf(CatalogItemSchema), 'Valores'), ...errorResponses(400, 401, 403) },
    }),
    async (c) => {
      const { catalog, q } = c.req.valid('query');
      const data = await withTenant(c, {}, (tx, ctx) => {
        const norm = q ? likePattern(q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ')) : null;
        return tx<z.infer<typeof CatalogItemSchema>[]>`
          select i.id, i.catalog, i.name, i.group_name as group, i.synonyms,
                 ${norm ? tx`case when private.search_norm(i.name) like ${norm} then null
                              else (select s from unnest(i.synonyms) s where private.search_norm(s) like ${norm} limit 1) end`
                        : tx`null::text`} as matched_synonym
          from public.catalog_items i
          where i.tenant_id = ${ctx.tenantId} and i.catalog = ${catalog} and i.deleted_at is null and i.status = 'active'
            and ${norm ? tx`(private.search_norm(i.name) like ${norm}
                             or exists (select 1 from unnest(i.synonyms) s where private.search_norm(s) like ${norm}))` : tx`true`}
          order by i.group_name nulls last, i.name
        `;
      });
      return c.json({ data: [...data] }, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/candidate-catalog',
      tags,
      summary: 'Añadir un valor a perfiles, carnés, habilidades o idiomas',
      description:
        `Requiere \`${MANAGE}\`. Si ya existe con ese nombre o como sinónimo (sin acentos ni mayúsculas), devuelve el ` +
        'existente con 200 para no duplicar; si es nuevo, 201.',
      security: bearerSecurity,
      request: {
        body: jsonBody(z.strictObject({
          catalog: CatalogKind,
          name: z.string().trim().min(1).max(180),
          group: z.string().trim().min(1).max(80).nullable().optional(),
          synonyms: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
        }).openapi('CandidateCatalogCreate')),
      },
      responses: {
        200: jsonContent(CatalogItemSchema, 'Ya existía'),
        201: jsonContent(CatalogItemSchema, 'Añadido'),
        ...errorResponses(400, 401, 403),
      },
    }),
    async (c) => {
      const body = c.req.valid('json');
      const result = await withTenant(c, { permission: MANAGE }, async (tx, ctx) => {
        const [existing] = await tx<z.infer<typeof CatalogItemSchema>[]>`
          select i.id, i.catalog, i.name, i.group_name as group, i.synonyms,
                 case when private.search_norm(i.name) = private.search_norm(${body.name}) then null else ${body.name} end as matched_synonym
          from public.catalog_items i
          where i.tenant_id = ${ctx.tenantId} and i.catalog = ${body.catalog} and i.deleted_at is null
            and (private.search_norm(i.name) = private.search_norm(${body.name})
                 or exists (select 1 from unnest(i.synonyms) s where private.search_norm(s) = private.search_norm(${body.name})))
          limit 1
        `;
        if (existing) return { status: 200 as const, item: existing };
        const [created] = await tx<{ id: string }[]>`
          select private.add_candidate_catalog_item(${body.catalog}, ${body.name}, ${body.group ?? null}, ${body.synonyms ?? []}::text[]) as id
        `;
        const [item] = await tx<z.infer<typeof CatalogItemSchema>[]>`
          select id, catalog, name, group_name as group, synonyms, null::text as matched_synonym
          from public.catalog_items where tenant_id = ${ctx.tenantId} and id = ${created!.id}
        `;
        return { status: 201 as const, item: item! };
      });
      return result.status === 201 ? c.json(result.item, 201) : c.json(result.item, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/candidates/{id}/contacts',
      tags,
      summary: 'Historial de contactos',
      security: bearerSecurity,
      request: { params: IdParams },
      responses: { 200: jsonContent(listOf(ContactSchema), 'Contactos'), ...errorResponses(400, 401, 403, 404) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const data = await withTenant(c, {}, async (tx, ctx) => {
        const [exists] = await tx`select 1 from public.candidates where tenant_id = ${ctx.tenantId} and id = ${id}`;
        if (!exists) throw notFound('El candidato no existe');
        return [...(await loadContacts(tx, ctx.tenantId, id))];
      });
      return c.json({ data }, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/candidates/{id}/contacts',
      tags,
      summary: 'Registrar un contacto',
      description: `Requiere \`${MANAGE}\`. Canal, resultado, nota, próxima acción y, si es por una petición, cuál. Actualiza el último contacto. No se cambian ni se borran.`,
      security: bearerSecurity,
      request: {
        params: IdParams,
        body: jsonBody(z.strictObject({
          contactedAt: z.iso.datetime({ offset: true }).optional(),
          channel: ContactChannel,
          result: nullableText(120).optional(),
          note: nullableText(4000).optional(),
          nextAction: nullableText(250).optional(),
          requestId: z.guid().nullable().optional(),
        }).openapi('CandidateContactCreate')),
      },
      responses: { 201: jsonContent(listOf(ContactSchema), 'Contactos'), ...errorResponses(400, 401, 403, 404, 409) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      const data = await withTenant(c, { permission: MANAGE }, async (tx, ctx) => {
        const [exists] = await tx`select 1 from public.candidates where tenant_id = ${ctx.tenantId} and id = ${id}`;
        if (!exists) throw notFound('El candidato no existe');
        await tx`insert into public.candidate_contacts ${tx({
          tenantId: ctx.tenantId, candidateId: id, channel: body.channel, result: body.result ?? null, note: body.note ?? null,
          nextAction: body.nextAction ?? null, requestId: body.requestId ?? null,
          ...(body.contactedAt ? { contactedAt: body.contactedAt } : {}),
        } as never)}`;
        return [...(await loadContacts(tx, ctx.tenantId, id))];
      });
      return c.json({ data }, 201);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/candidate-facets',
      tags,
      summary: 'Recuentos para los filtros del listado',
      description:
        'Cuántos candidatos (no anonimizados) hay por estado, por perfil (principal u otro) y por carné, habilidad o idioma, ' +
        'y los indicadores de la cabecera. Solo salen los valores que tiene alguien. Para buscar en el servidor sin traer toda la bolsa.',
      security: bearerSecurity,
      responses: {
        200: jsonContent(z.object({
          total: z.number().int(),
          byStatus: z.record(z.string(), z.number().int()),
          documentAlerts: z.number().int().openapi({ description: 'Con documentos caducados o por caducar' }),
          poolConsentExpired: z.number().int(),
          documentation: z.object({
            ok: z.number().int().openapi({ description: 'Documentación y RGPD correctos (documents=ok)' }),
            pending: z.number().int().openapi({ description: 'Documentación o RGPD pendiente (documents=pending)' }),
            idOrSsPending: z.number().int().openapi({ description: 'DNI o NSS pendiente (documents=id_or_ss_pending)' }),
            privacyPending: z.number().int().openapi({ description: 'RGPD pendiente (documents=privacy_pending)' }),
          }),
          profiles: z.array(z.object({ id: z.guid(), name: z.string(), group: z.string().nullable(), count: z.number().int() })),
          attributes: z.array(z.object({ id: z.guid(), catalog: CatalogKind, name: z.string(), group: z.string().nullable(), count: z.number().int() })),
        }).openapi('CandidateFacets'), 'Recuentos'),
        ...errorResponses(401, 403),
      },
    }),
    async (c) => {
      const out = await withTenant(c, {}, async (tx, ctx) => {
        const rows = await tx<SummaryRow[]>`${summarySelect(tx, ctx.tenantId)} and c.anonymized_at is null`;
        const byStatus: Record<string, number> = {};
        for (const r of rows) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
        const profiles = await tx<{ id: string; name: string; group: string | null; count: number }[]>`
          select i.id, i.name, i.group_name as group, count(distinct c.id)::int as count
          from public.candidates c
          join public.catalog_items i on i.tenant_id = c.tenant_id and i.catalog = 'candidate_profile'
            and (i.id = c.main_profile_id or exists (select 1 from public.candidate_attributes a
                 where a.tenant_id = c.tenant_id and a.candidate_id = c.id and a.item_id = i.id))
          where c.tenant_id = ${ctx.tenantId} and c.anonymized_at is null
          group by i.id, i.name, i.group_name order by i.group_name nulls last, i.name
        `;
        const attributes = await tx<{ id: string; catalog: 'license' | 'skill' | 'language'; name: string; group: string | null; count: number }[]>`
          select i.id, i.catalog, i.name, i.group_name as group, count(distinct a.candidate_id)::int as count
          from public.candidate_attributes a
          join public.candidates c on c.tenant_id = a.tenant_id and c.id = a.candidate_id and c.anonymized_at is null
          join public.catalog_items i on i.tenant_id = a.tenant_id and i.id = a.item_id
          where a.tenant_id = ${ctx.tenantId} and a.catalog <> 'candidate_profile'
          group by i.id, i.catalog, i.name, i.group_name order by i.catalog, i.name
        `;
        const today = new Date().toISOString().slice(0, 10);
        return {
          total: rows.length,
          byStatus,
          documentAlerts: rows.filter((r) => r.docsExpired > 0 || r.docsExpiring > 0 || (r.idDocumentExpiresOn !== null && r.idDocumentExpiresOn < today)).length,
          poolConsentExpired: rows.filter((r) => r.poolState === 'expired').length,
          documentation: (() => {
            const states = rows.map(documentsState);
            return {
              ok: states.filter((x) => x.ok).length,
              pending: states.filter((x) => x.pending).length,
              idOrSsPending: states.filter((x) => x.idOrSsPending).length,
              privacyPending: states.filter((x) => x.privacyPending).length,
            };
          })(),
          profiles: [...profiles],
          attributes: [...attributes],
        };
      });
      return c.json(out, 200);
    },
  );
