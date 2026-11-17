// Candidatos de ejemplo y repositorios en memoria (modo demo), como la API de la fase 6 (fase6-backend.md): datos
// sensibles enmascarados y «ver» auditado, tablas maestras con sinónimos, consentimientos, candidaturas que reservan y
// cubren plazas de las peticiones de ejemplo (memoriaPeticiones.ts), supresión, exportación y auditoría de accesos.
// Los datos salen de memoriaCandidatosEjemplo.js (los del diseñador). Todo es ficticio. Sin efectos al cargarse (ver
// vite.config.ts): se crean la primera vez que se usan.
import { ETAPA, ESTADO_CANDIDATO, INCORPORACION, NIVEL, TURNO, clave, codigoDeTipo, enmascarar, origenApi } from './candidatosValores';
import { delay, id, newId, page } from './memoriaBase';
import { alDescargarDocumentoDeCandidato, documentosDeEntidad, log, quitarDocumentoDemo, sembrarDocumentos } from './memoriaEmpresas';
import { ejemploCandidatos } from './memoriaCandidatosEjemplo';
import { liberarPlaza, ocuparPlaza, peticionDemo } from './memoriaPeticiones';
import type { Repositories } from './repositorios';
import {
  ApiError,
  type AccessLogEntry,
  type Application,
  type ApplicationStage,
  type Candidate,
  type CandidateCatalog,
  type CandidateCatalogItem,
  type CandidateConsent,
  type CandidateContact,
  type CandidateInput,
  type CandidateShift,
  type CandidateStatus,
  type CandidateSummary,
  type IdDocumentKind,
  type LanguageLevel,
} from './tipos';

const YO = { id: id(250), name: 'Usuario Demo' };
const ahora = () => new Date().toISOString();
const copia = <T>(x: T): T => structuredClone(x);
const normal = (t = '') => t.toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const LETRAS = 'TRWAGMYFPDXBNJZSQVHLCKE';
function letraValida(tipo: IdDocumentKind | null, n: string) {
  const v = n.toUpperCase().replace(/[\s-]/g, '');
  if (tipo === 'dni') return /^\d{8}[A-Z]$/.test(v) && LETRAS[Number(v.slice(0, 8)) % 23] === v[8];
  if (tipo === 'nie') return /^[XYZ]\d{7}[A-Z]$/.test(v) && LETRAS[Number('XYZ'.indexOf(v[0]) + v.slice(1, 8)) % 23] === v[8];
  return true;
}

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------

const CATALOGO: Record<string, CandidateCatalog> = { perfiles: 'candidate_profile', carnes: 'license', habilidades: 'skill', idiomas: 'language' };
type Item = CandidateCatalogItem & { catalog: CandidateCatalog };
/** La ficha en memoria: los sensibles en claro (la API los guarda cifrados). */
type Registro = Omit<Candidate, 'idDocument' | 'ssNumber' | 'iban' | 'poolConsent' | 'documentAlerts' | 'activeApplications' | 'applications' | 'missing' | 'mainProfile' | 'otherProfileNames' | 'attributes' | 'health'> & {
  idType: IdDocumentKind | null;
  idNumber: string | null;
  idExpiresOn: string | null;
  ss: string | null;
  ibanValue: string | null;
  health: { disabilityPercent: number | null; adaptations: string | null; notes: string | null; legalBasis: string | null } | null;
  mainProfileId: string | null;
  otherProfileIds: string[];
  licenseIds: string[];
  skillIds: string[];
  languages: { id: string; level: LanguageLevel }[];
  anonymizedAt: string | null;
};
type Estado = {
  items: Item[];
  candidatos: Registro[];
  candidaturas: Application[];
  contactos: Map<string, CandidateContact[]>;
  accesos: AccessLogEntry[];
  siguiente: number;
};
let ajustesDe: () => Promise<{ candidatePoolRetentionMonths?: number; candidateDocumentNoticeDays?: number }> = async () => ({});

const DIAS_AVISO = 30;
const diasPara = (iso: string | null) => (iso ? Math.round((new Date(`${iso}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000) : null);
const sumarMeses = (iso: string, n: number) => { const d = new Date(iso); d.setMonth(d.getMonth() + n); return d.toISOString(); };

/** Ids de la tabla maestra por nombre (o sinónimo); si no existe, se añade (como «Añadir al listado»). */
function itemPorNombre(e: Estado, catalog: CandidateCatalog, nombre: string): Item {
  const n = normal(nombre);
  let x = e.items.find((i) => i.catalog === catalog && (normal(i.name) === n || i.synonyms.some((s) => normal(s) === n)));
  if (!x) {
    x = { id: newId(), catalog, name: nombre, group: 'Añadidos', synonyms: [] };
    e.items.push(x);
  }
  return x;
}

// ---- Los datos del diseñador, a la forma de la API ----------------------------------

type Ejemplo = ReturnType<typeof ejemploCandidatos>;
type CandidatoEjemplo = Ejemplo['candidatos'][number];

async function crearEstado(): Promise<Estado> {
  const ej = ejemploCandidatos();
  const e: Estado = { items: [], candidatos: [], candidaturas: [], contactos: new Map(), accesos: [], siguiente: 400 };
  for (const [k, catalog] of Object.entries(CATALOGO)) {
    const lista = (ej.catalogos as Record<string, unknown[]>)[k];
    for (const x of lista) {
      const it = typeof x === 'string' ? { nombre: x, grupo: 'Idiomas', sinonimos: [] as string[] } : (x as { nombre: string; grupo: string; sinonimos: string[] });
      e.items.push({ id: newId(), catalog, name: it.nombre, group: it.grupo, synonyms: it.sinonimos });
    }
  }
  const docs: Parameters<typeof sembrarDocumentos>[0] = [];
  for (const c of ej.candidatos as CandidatoEjemplo[]) {
    const r = await deEjemplo(e, c, ej.peticionesInfo as Record<string, { puesto: string; turno: string; cliente: string }>);
    e.candidatos.push(r);
    for (const d of c.documents ?? []) {
      docs.push({
        id: newId(), entityType: 'candidate', entityId: r.id, name: d.name, mimeType: 'application/pdf', sizeBytes: 300_000,
        status: d.status === 'Pendiente de validar' ? 'pending' : d.status === 'Rechazado' ? 'rejected' : 'validated',
        expiresOn: d.expiry ?? null, visibleInPortal: false, notes: codigoDeTipo(d.type), uploadedBy: null, uploadedByName: 'Usuario Demo',
        uploadedAt: `${d.uploadDate}T10:00:00.000Z`, validatedBy: null, validatedByName: d.validadoPor ?? (d.status === 'Pendiente de validar' ? null : 'Ane Uriarte'),
        validatedAt: d.validadoEl ? `${d.validadoEl}T10:00:00.000Z` : null, rejectionReason: d.motivoRechazo ?? null,
        renewalNoticeSentAt: d.avisoEnviado ? `${d.avisoEnviado}T10:00:00.000Z` : null, deletedAt: null,
        createdAt: `${d.uploadDate}T10:00:00.000Z`, updatedAt: `${d.uploadDate}T10:00:00.000Z`,
      } as Parameters<typeof sembrarDocumentos>[0][number]);
    }
    e.contactos.set(r.id, (c.communications ?? []).map((m: { date: string; user: string; channel: string; result: string; note?: string; nextAction?: string }) => ({
      id: newId(), occurredAt: new Date(m.date.replace(' ', 'T')).toISOString(), userName: m.user, channel: m.channel, result: m.result, note: m.note ?? null, nextAction: m.nextAction ?? null,
    })));
  }
  sembrarDocumentos(docs, (code) => code);
  alDescargarDocumentoDeCandidato((d) => {
    const c = e.candidatos.find((x) => x.id === d.entityId);
    if (c) registrar(e, 'download_document', c, { document: d.name });
  });
  return e;
}

async function deEjemplo(e: Estado, c: CandidatoEjemplo, info: Record<string, { puesto: string; turno: string; cliente: string }>): Promise<Registro> {
  const rid = newId();
  const nie = /^[XYZ]/.test(c.dni ?? '');
  const prov = { Bizkaia: '48', Barcelona: '08', Madrid: '28', Gipuzkoa: '20', 'Araba/Álava': '01', Lleida: '25' } as Record<string, string>;
  const idiomas = (c.languages ?? []).map((l: string) => {
    const m = l.match(/^(.+?)\s*\((.+)\)$/);
    return { id: itemPorNombre(e, 'language', m ? m[1] : l).id, level: (clave(NIVEL, m ? m[2] : 'B1') ?? 'B1') as LanguageLevel };
  });
  // Candidaturas: enlazadas a las peticiones de ejemplo por su código
  for (const x of (c.candidaturas ?? []) as { petId: string; plaza: number | null; estado: string; fecha: string; nota?: string }[]) {
    const p = await peticionDemo(x.petId);
    const i = info[x.petId];
    const stage = (clave(ETAPA, x.estado) ?? 'interview') as ApplicationStage;
    const a: Application = {
      id: newId(), candidateId: rid, candidateName: `${c.name} ${c.lastName}`, candidateCode: c.id, requestId: p?.id ?? `sin-${x.petId}`, requestCode: x.petId,
      positionName: p?.positionName ?? i?.puesto ?? '', shiftName: p?.shiftName ?? i?.turno ?? null, clientName: p?.clientName ?? i?.cliente ?? '',
      stage: stage === 'registered' ? 'interview' : stage, origin: 'applied', source: c.source ?? null, slotId: null, slotNumber: x.plaza ?? null, legalBasis: 'precontractual',
      stageChangedAt: `${x.fecha}T10:00:00.000Z`, notes: x.nota ?? null, discardReason: null, createdAt: `${x.fecha}T10:00:00.000Z`,
    };
    // Las propuestas al cliente reservan su plaza en la petición
    if (p && a.stage === 'proposed') {
      a.slotNumber = await ocuparPlaza(p.id, `${p.id}-${x.plaza}`, { applicationId: a.id, candidateId: rid, candidateName: a.candidateName, status: 'reserved' }).catch(() => x.plaza);
      a.slotId = a.slotNumber ? `${p.id}-${a.slotNumber}` : null;
    }
    e.candidaturas.push(a);
  }
  const rgpd = (c.documents ?? []).find((d: { type: string }) => d.type === 'RGPD');
  const consents: CandidateConsent[] = rgpd && c.rgpdStatus !== 'Sin consentimiento'
    ? [{ id: newId(), purpose: 'talent_pool', noticeVersion: '1', givenAt: `${c.rgpdSignedDate ?? rgpd.uploadDate}T10:00:00.000Z`, channel: 'paper', expiresAt: rgpd.expiry ? `${rgpd.expiry}T10:00:00.000Z` : null, withdrawnAt: null }]
    : [];
  return {
    id: rid, code: c.id, firstName: c.name, lastName: c.lastName, phone: c.phone ?? null, email: c.email ?? null, city: c.city ?? null,
    provinceCode: prov[c.province] ?? null, postalCode: c.codigoPostal || null, address: c.direccion || null, birthDate: c.fechaNacimiento || null,
    nationality: c.nacionalidad || null, status: (clave(ESTADO_CANDIDATO, c.status) ?? 'available') as CandidateStatus, source: origenApi(c.source), sourceRef: c.sourceId ?? null,
    idType: c.dni ? (nie ? 'nie' : 'dni') : null, idNumber: c.dni || null, idExpiresOn: c.dniExpiry || null,
    ss: c.nss && c.nss !== 'FALTA' ? c.nss : null, ibanValue: c.iban ? c.iban.replace(/\s/g, '') : null, health: null,
    mainProfileId: c.category ? itemPorNombre(e, 'candidate_profile', c.category).id : null,
    otherProfileIds: (c.otherProfiles ?? []).map((n: string) => itemPorNombre(e, 'candidate_profile', n).id),
    licenseIds: (c.drivingLicenses ?? []).map((n: string) => itemPorNombre(e, 'license', n).id),
    skillIds: (c.skills ?? []).map((n: string) => itemPorNombre(e, 'skill', n).id),
    languages: idiomas, otherLicensesText: c.otrosCarnes ?? null, experienceYears: c.experienceYears ?? null, hasCar: !!c.hasCar,
    experiences: (c.experiencias ?? []).map((x: { empresa: string; puesto: string; desde: string; hasta: string; funciones: string }) => ({ company: x.empresa, position: x.puesto, from: x.desde || null, to: x.hasta || null, duties: x.funciones || null })),
    education: (c.formacion ?? []).map((x: { titulo: string; centro: string; anio: string }) => ({ title: x.titulo, center: x.centro || null, year: x.anio ? Number(x.anio) : null })),
    shifts: (c.turnos ?? []).map((t: string) => clave(TURNO, t)).filter(Boolean) as CandidateShift[],
    availability: clave(INCORPORACION, c.incorporacion) ?? 'immediate', availableFrom: c.incorporacionFecha || null, maxDistanceKm: c.radioKm ?? null,
    availabilityNotes: c.notasDisponibilidad || null, autoExpiryNotice: c.avisoAutomatico !== false, consents,
    lastContactAt: c.lastContactDate ? `${c.lastContactDate}T10:00:00.000Z` : null, createdAt: '2026-01-15T10:00:00.000Z', createdByName: 'Ane Uriarte',
    updatedAt: '2026-10-27T10:00:00.000Z', anonymizedAt: null,
  };
}

// Una sola vez aunque la pidan a la vez (si no, cada llamada crearía sus propios ids)
let creando: Promise<Estado> | undefined;
function datos() {
  return (creando ??= crearEstado());
}
function buscar(e: Estado, candidateId: string) {
  const r = e.candidatos.find((x) => x.id === candidateId);
  if (!r) throw new ApiError(404, 'no_encontrado', 'El candidato no existe o no tienes acceso');
  return r;
}
function registrar(e: Estado, action: string, r: Registro, details: Record<string, unknown> | null = null) {
  e.accesos.unshift({ id: newId(), occurredAt: ahora(), actorUserId: YO.id, actorName: YO.name, action, candidateId: r.id, candidateCode: r.code, details });
}

// ---------------------------------------------------------------------------
// Lectura: la fila y la ficha, como las da la API (con lo sensible enmascarado)
// ---------------------------------------------------------------------------

const deItem = (e: Estado, itemId: string) => e.items.find((x) => x.id === itemId);
const documentosDe = async (candidateId: string) => documentosDeEntidad('candidate', candidateId);

async function resumen(e: Estado, r: Registro): Promise<CandidateSummary> {
  const docs = await documentosDe(r.id);
  const pool = r.consents.filter((c) => c.purpose === 'talent_pool' && !c.withdrawnAt).sort((a, b) => b.givenAt.localeCompare(a.givenAt))[0];
  const dPool = pool?.expiresAt ? diasPara(pool.expiresAt.slice(0, 10)) : null;
  const dId = diasPara(r.idExpiresOn);
  const main = r.mainProfileId ? deItem(e, r.mainProfileId) : undefined;
  return {
    id: r.id, code: r.code, firstName: r.firstName, lastName: r.lastName, phone: r.phone, email: r.email, city: r.city, provinceCode: r.provinceCode,
    status: r.status, source: r.source, mainProfile: main ? { id: main.id, name: main.name, group: main.group } : null,
    otherProfileNames: r.otherProfileIds.map((x) => deItem(e, x)?.name ?? '').filter(Boolean),
    idDocument: { type: r.idType, masked: enmascarar(r.idNumber), expiresOn: r.idExpiresOn, state: !r.idNumber ? 'missing' : dId !== null && dId < 0 ? 'expired' : 'ok' },
    ssNumber: r.ss ? { masked: enmascarar(r.ss)! } : null,
    iban: r.ibanValue ? { masked: enmascarar(r.ibanValue)! } : null,
    poolConsent: { state: !pool ? 'none' : dPool !== null && dPool < 0 ? 'expired' : dPool !== null && dPool <= DIAS_AVISO ? 'expiring' : 'valid', expiresAt: pool?.expiresAt ?? null },
    documentAlerts: {
      expired: docs.filter((d) => d.expiresOn && (diasPara(d.expiresOn) ?? 0) < 0).length,
      expiring: docs.filter((d) => { const x = diasPara(d.expiresOn); return x !== null && x >= 0 && x <= DIAS_AVISO; }).length,
    },
    activeApplications: e.candidaturas.filter((a) => a.candidateId === r.id && !['discarded', 'withdrawn', 'finished', 'left'].includes(a.stage)).length,
    lastContactAt: r.lastContactAt, createdAt: r.createdAt,
  };
}

async function ficha(e: Estado, r: Registro): Promise<Candidate> {
  const fila = await resumen(e, r);
  const nombres = (ids: string[]) => ids.map((x) => deItem(e, x)).filter((x): x is Item => !!x).map((x) => ({ id: x.id, name: x.name }));
  const {
    idType: _a, idNumber: _b, idExpiresOn: _c, ss: _d, ibanValue: _e, health, mainProfileId: _f, otherProfileIds, licenseIds, skillIds, languages, anonymizedAt: _g, ...resto
  } = copia(r);
  return delay({
    ...resto,
    ...fila,
    attributes: {
      licenses: nombres(licenseIds), skills: nombres(skillIds), otherProfiles: nombres(otherProfileIds),
      languages: languages.map((l) => ({ id: l.id, name: deItem(e, l.id)?.name ?? '', level: l.level })),
    },
    health: { hasData: !!health, legalBasis: health?.legalBasis ?? null },
    applications: copia(e.candidaturas.filter((a) => a.candidateId === r.id)),
    missing: [],
  });
}

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------

function aplicar(e: Estado, r: Registro, d: CandidateInput) {
  if (d.firstName !== undefined && !d.firstName.trim()) throw new ApiError(422, 'validacion', 'El nombre es obligatorio', [{ path: 'firstName', message: 'Obligatorio' }]);
  if (d.iban && !/^ES\d{22}$/.test(d.iban.replace(/\s/g, '').toUpperCase())) throw new ApiError(422, 'validacion', 'IBAN español: ES y 22 cifras', [{ path: 'iban', message: 'IBAN español: ES y 22 cifras' }]);
  if (d.status === 'in_mission' || d.status === 'onboarding') throw new ApiError(422, 'validacion', 'Ese estado lo pone el sistema', [{ path: 'status', message: 'No se puede elegir' }]);
  if (d.idDocumentNumber) {
    const tipo = d.idDocumentType ?? r.idType;
    if (!letraValida(tipo, d.idDocumentNumber)) throw new ApiError(422, 'validacion', 'La letra del documento no es correcta', [{ path: 'idDocumentNumber', message: 'Letra no válida' }]);
    const v = d.idDocumentNumber.toUpperCase().replace(/[\s-]/g, '');
    const otro = e.candidatos.find((x) => x.id !== r.id && x.idNumber === v);
    if (otro) throw new ApiError(409, 'conflicto', 'Ya hay un candidato con ese documento', [{ path: 'idDocumentNumber', message: `Ya existe: ${otro.code} (id ${otro.id})` }]);
    r.idNumber = v;
  }
  if (d.idDocumentType !== undefined) r.idType = d.idDocumentType;
  if (d.idDocumentExpiresOn !== undefined) r.idExpiresOn = d.idDocumentExpiresOn;
  if (d.ssNumber !== undefined) r.ss = d.ssNumber;
  if (d.iban !== undefined) r.ibanValue = d.iban ? d.iban.replace(/\s/g, '').toUpperCase() : null;
  if (d.mainProfileId !== undefined) r.mainProfileId = d.mainProfileId;
  if (d.attributeIds !== undefined) {
    const de = (cat: CandidateCatalog) => d.attributeIds!.filter((x) => deItem(e, x)?.catalog === cat);
    r.licenseIds = de('license');
    r.skillIds = de('skill');
    r.otherProfileIds = de('candidate_profile');
  }
  if (d.languages !== undefined) r.languages = d.languages;
  if (d.health !== undefined) {
    if (d.health && !['explicit_consent', 'labor_obligation'].includes(d.health.legalBasis)) throw new ApiError(422, 'validacion', 'Los datos de salud necesitan una base legal');
    r.health = d.health;
  }
  const simples = ['firstName', 'lastName', 'sourceRef', 'lastContactAt', 'phone', 'email', 'city', 'provinceCode', 'postalCode', 'address', 'birthDate', 'nationality', 'status', 'source', 'otherLicensesText', 'experienceYears', 'hasCar', 'experiences', 'education', 'shifts', 'availability', 'availableFrom', 'maxDistanceKm', 'availabilityNotes', 'autoExpiryNotice'] as const;
  for (const k of simples) if (d[k] !== undefined) Object.assign(r, { [k]: copia(d[k]) });
  r.updatedAt = ahora();
}

async function candidatura(e: Estado, appId: string) {
  const a = e.candidaturas.find((x) => x.id === appId);
  if (!a) throw new ApiError(404, 'no_encontrado', 'La candidatura no existe');
  return a;
}
function moverEtapa(a: Application, stage: ApplicationStage, texto: string) {
  Object.assign(a, { stage, stageChangedAt: ahora() });
  log('candidate', a.candidateId, null, 'update', `${a.requestCode}: ${texto}`);
}

export function memoryCandidateRepositories(
  ajustes: () => Promise<{ candidatePoolRetentionMonths?: number; candidateDocumentNoticeDays?: number }>,
): Pick<Repositories, 'candidates' | 'candidateCatalog' | 'applications' | 'accessLog'> {
  ajustesDe = ajustes;
  return {
    candidates: {
      async list(q = {}) {
        const e = await datos();
        const texto = normal(q.q);
        const sinonimos = (r: Registro) => [r.mainProfileId, ...r.otherProfileIds, ...r.licenseIds, ...r.skillIds]
          .map((x) => (x ? deItem(e, x) : undefined)).filter(Boolean).flatMap((x) => [x!.name, ...x!.synonyms]).join(' | ');
        const atributos = q.attributeId?.split(',').filter(Boolean) ?? [];
        const filas = await Promise.all(
          e.candidatos
            .filter((r) => !r.anonymizedAt || !texto)
            .filter((r) =>
              (!texto || normal(`${r.firstName} ${r.lastName} ${r.phone ?? ''} ${r.email ?? ''} ${r.city ?? ''} ${r.code} ${sinonimos(r)}`).includes(texto)) &&
              (!q.status || r.status === q.status) && (!q.source || r.source === q.source) &&
              (!q.profileId || r.mainProfileId === q.profileId || r.otherProfileIds.includes(q.profileId)) &&
              atributos.every((x) => r.licenseIds.includes(x) || r.skillIds.includes(x) || r.languages.some((l) => l.id === x)))
            .map((r) => resumen(e, r)),
        );
        const lista = filas.filter((f) =>
          !q.documents || (q.documents === 'alerts' ? f.documentAlerts.expired + f.documentAlerts.expiring > 0 : f.idDocument.state === 'missing' || f.poolConsent.state === 'none'));
        return page(lista, q);
      },
      async get(candidateId) {
        const e = await datos();
        const r = buscar(e, candidateId);
        registrar(e, 'view_record', r);
        return ficha(e, r);
      },
      async create(d) {
        const e = await datos();
        const r: Registro = {
          id: newId(), code: `CAN-0${e.siguiente++}`, firstName: '', lastName: '', phone: null, email: null, city: null, provinceCode: null, postalCode: null,
          address: null, birthDate: null, nationality: null, status: 'new', source: 'other', sourceRef: null, idType: null, idNumber: null, idExpiresOn: null, ss: null,
          ibanValue: null, health: null, mainProfileId: null, otherProfileIds: [], licenseIds: [], skillIds: [], languages: [], otherLicensesText: null,
          experienceYears: null, hasCar: false, experiences: [], education: [], shifts: [], availability: 'immediate', availableFrom: null, maxDistanceKm: null,
          availabilityNotes: null, autoExpiryNotice: true, consents: [], lastContactAt: null, createdAt: ahora(), createdByName: YO.name, updatedAt: ahora(),
          anonymizedAt: null,
        };
        aplicar(e, r, d);
        e.candidatos.unshift(r);
        e.contactos.set(r.id, []);
        log('candidate', r.id, null, 'create', `Candidato ${r.code} dado de alta`);
        return ficha(e, r);
      },
      async update(candidateId, d) {
        const e = await datos();
        const r = buscar(e, candidateId);
        if (r.anonymizedAt) throw new ApiError(409, 'conflicto', 'Este candidato está anonimizado');
        aplicar(e, r, d);
        log('candidate', r.id, null, 'update', 'Datos actualizados');
        return ficha(e, r);
      },
      async checkDuplicate({ idDocumentType, idDocumentNumber }) {
        const e = await datos();
        const v = idDocumentNumber.toUpperCase().replace(/[\s-]/g, '');
        const otro = e.candidatos.find((x) => x.idNumber === v);
        return delay({ valid: letraValida(idDocumentType as IdDocumentKind, v), duplicate: otro ? { id: otro.id, code: otro.code, name: `${otro.firstName} ${otro.lastName}` } : null });
      },
      async sensitive(candidateId, fields) {
        const e = await datos();
        const r = buscar(e, candidateId);
        registrar(e, 'view_sensitive', r, { fields });
        return delay({
          ...(fields.includes('idDocument') ? { idDocument: { type: r.idType, number: r.idNumber } } : {}),
          ...(fields.includes('ssNumber') ? { ssNumber: r.ss } : {}),
          ...(fields.includes('iban') ? { iban: r.ibanValue } : {}),
          ...(fields.includes('health') ? { health: r.health } : {}),
        }, 80);
      },
      async anonymize(candidateId, reason) {
        const e = await datos();
        const r = buscar(e, candidateId);
        if (e.candidaturas.some((a) => a.candidateId === r.id && ['confirmed', 'on_mission'].includes(a.stage))) {
          throw new ApiError(409, 'conflicto', 'Tiene una candidatura confirmada: no se puede anonimizar hasta que termine');
        }
        for (const d of documentosDeEntidad('candidate', r.id)) quitarDocumentoDemo(d.id);
        Object.assign(r, {
          firstName: 'Anonimizado', lastName: r.code, phone: null, email: null, address: null, postalCode: null, birthDate: null, nationality: null,
          idNumber: null, idType: null, idExpiresOn: null, ss: null, ibanValue: null, health: null, experiences: [], education: [], availabilityNotes: null,
          status: 'discarded', anonymizedAt: ahora(), updatedAt: ahora(),
        });
        e.contactos.set(r.id, []);
        for (const a of e.candidaturas) if (a.candidateId === r.id) a.candidateName = `Anonimizado ${r.code}`;
        registrar(e, 'anonymize', r, { reason });
        return ficha(e, r);
      },
      async exportData(candidateId) {
        const e = await datos();
        const r = buscar(e, candidateId);
        registrar(e, 'export', r);
        return delay({
          exportedAt: ahora(), candidate: { ...(await ficha(e, r)), idDocumentNumber: r.idNumber, ssNumber: r.ss, iban: r.ibanValue, health: r.health },
          contacts: e.contactos.get(r.id) ?? [], documents: documentosDeEntidad('candidate', r.id).map((d) => ({ name: d.name, type: d.typeName, uploadedAt: d.uploadedAt, expiresOn: d.expiresOn })),
        });
      },
      async addConsent(candidateId, d) {
        const e = await datos();
        const r = buscar(e, candidateId);
        const meses = (await ajustesDe()).candidatePoolRetentionMonths ?? 24;
        const givenAt = d.givenAt ? new Date(d.givenAt).toISOString() : ahora();
        const c: CandidateConsent = { id: newId(), purpose: d.purpose, noticeVersion: '1', givenAt, channel: d.channel, expiresAt: d.purpose === 'talent_pool' ? sumarMeses(givenAt, meses) : null, withdrawnAt: null };
        r.consents.push(c);
        log('candidate', r.id, null, 'update', `Consentimiento ${d.purpose === 'talent_pool' ? 'de bolsa' : 'de salud'} registrado`);
        return ficha(e, r);
      },
      privacyNotices: async (purpose) => delay([{ id: id(780 + (purpose === 'talent_pool' ? 0 : 1)), purpose, version: '1', text: 'Texto de privacidad de ejemplo.', createdAt: '2026-01-01T10:00:00.000Z' }]),
      async withdrawConsent(consentId) {
        const e = await datos();
        const r = e.candidatos.find((x) => x.consents.some((c) => c.id === consentId));
        const c = r?.consents.find((x) => x.id === consentId);
        if (!r || !c) throw new ApiError(404, 'no_encontrado', 'El consentimiento no existe');
        c.withdrawnAt = ahora();
        log('candidate', r.id, null, 'update', 'Consentimiento retirado');
        return delay(c);
      },
      async contacts(candidateId) {
        const e = await datos();
        buscar(e, candidateId);
        return delay(e.contactos.get(candidateId) ?? []);
      },
      async addContact(candidateId, d) {
        const e = await datos();
        const r = buscar(e, candidateId);
        const c: CandidateContact = { id: newId(), occurredAt: ahora(), userName: YO.name, channel: d.channel, result: d.result, note: d.note ?? null, nextAction: d.nextAction ?? null };
        e.contactos.set(r.id, [c, ...(e.contactos.get(r.id) ?? [])]);
        r.lastContactAt = c.occurredAt;
        if (['new', 'to_contact'].includes(r.status)) r.status = 'contacted';
        return delay(c);
      },
    },
    candidateCatalog: {
      async list(catalog, q) {
        const e = await datos();
        const n = normal(q);
        return delay(
          e.items
            .filter((x) => x.catalog === catalog)
            .map((x) => ({ x, por: n && !normal(x.name).includes(n) ? x.synonyms.find((s) => normal(s).includes(n)) ?? null : null }))
            .filter(({ x, por }) => !n || normal(x.name).includes(n) || por)
            .map(({ x, por }) => ({ id: x.id, name: x.name, group: x.group, synonyms: x.synonyms, matchedSynonym: por })),
        );
      },
      async create({ catalog, name, group, synonyms }) {
        const e = await datos();
        const n = normal(name);
        const ya = e.items.find((x) => x.catalog === catalog && (normal(x.name) === n || x.synonyms.some((s) => normal(s) === n)));
        if (ya) return delay(ya);
        const x: Item = { id: newId(), catalog, name: name.trim(), group: group ?? 'Añadidos', synonyms: synonyms ?? [] };
        e.items.push(x);
        return delay(x);
      },
    },
    applications: {
      async list(q) {
        const e = await datos();
        return delay(e.candidaturas.filter((a) => (!q.requestId || a.requestId === q.requestId) && (!q.candidateId || a.candidateId === q.candidateId) && (!q.stage || a.stage === q.stage)));
      },
      async create(d) {
        const e = await datos();
        const r = buscar(e, d.candidateId);
        const p = await peticionDemo(d.requestId);
        if (!p) throw new ApiError(422, 'referencia_invalida', 'La petición no existe');
        if (e.candidaturas.some((a) => a.candidateId === r.id && a.requestId === p.id)) throw new ApiError(409, 'conflicto', 'Ya tiene una candidatura en esta petición');
        if (d.origin === 'sourced') {
          const pool = r.consents.find((c) => c.purpose === 'talent_pool' && !c.withdrawnAt && (!c.expiresAt || c.expiresAt > ahora()));
          if (!pool) throw new ApiError(409, 'conflicto', 'Sin consentimiento de bolsa vigente: no se le puede proponer para una petición a la que no se ha inscrito');
        }
        const a: Application = {
          id: newId(), candidateId: r.id, candidateName: `${r.firstName} ${r.lastName}`, candidateCode: r.code, requestId: p.id, requestCode: p.code,
          positionName: p.positionName, shiftName: p.shiftName, clientName: p.clientName, stage: 'registered', origin: d.origin, source: d.source ?? null,
          slotId: null, slotNumber: null, legalBasis: d.origin === 'applied' ? 'precontractual' : 'consent', stageChangedAt: ahora(), notes: d.notes ?? null,
          discardReason: null, createdAt: ahora(),
        };
        e.candidaturas.unshift(a);
        if (['new', 'to_contact', 'contacted', 'available'].includes(r.status)) r.status = 'in_selection';
        log('candidate', r.id, null, 'update', `Candidatura en ${p.code}`);
        return delay(a);
      },
      async update(appId, d) {
        const e = await datos();
        const a = await candidatura(e, appId);
        if (d.stage && ['proposed', 'confirmed', 'on_mission', 'finished', 'left'].includes(d.stage)) throw new ApiError(422, 'validacion', 'Esa etapa va por su propia ruta');
        if (d.stage && ['discarded', 'withdrawn'].includes(d.stage)) liberarPlaza(a.requestId, a.id);
        if (d.stage) moverEtapa(a, d.stage, `pasa a ${d.stage}`);
        if (d.notes !== undefined) a.notes = d.notes;
        if (d.discardReason !== undefined) a.discardReason = d.discardReason;
        if (d.stage && ['discarded', 'withdrawn'].includes(d.stage)) Object.assign(a, { slotId: null, slotNumber: null });
        return delay(a);
      },
      async propose(appId, slotId) {
        const e = await datos();
        const a = await candidatura(e, appId);
        const r = buscar(e, a.candidateId);
        if (e.candidaturas.some((x) => x.id !== a.id && x.candidateId === a.candidateId && ['proposed', 'confirmed'].includes(x.stage))) {
          throw new ApiError(409, 'conflicto', 'Ya está propuesta o confirmada en otra plaza');
        }
        const n = await ocuparPlaza(a.requestId, slotId ?? null, { applicationId: a.id, candidateId: a.candidateId, candidateName: a.candidateName, status: 'reserved' });
        Object.assign(a, { slotNumber: n, slotId: `${a.requestId}-${n}` });
        moverEtapa(a, 'proposed', `propuesta al cliente (plaza ${n})`);
        const f = await resumen(e, r);
        return delay({
          ...a,
          requirements: [
            { code: 'id_document', ok: f.idDocument.state === 'ok', message: 'Documento de identidad vigente' },
            { code: 'consent', ok: f.poolConsent.state === 'valid' || f.poolConsent.state === 'expiring' || a.origin === 'applied', message: 'Consentimiento' },
          ],
        });
      },
      async confirm(appId) {
        const e = await datos();
        const a = await candidatura(e, appId);
        if (a.stage !== 'proposed') throw new ApiError(409, 'conflicto', 'Solo se confirma una candidatura propuesta al cliente');
        await ocuparPlaza(a.requestId, a.slotId, { applicationId: a.id, candidateId: a.candidateId, candidateName: a.candidateName, status: 'covered' });
        moverEtapa(a, 'confirmed', `confirmada por el cliente (plaza ${a.slotNumber})`);
        const r = buscar(e, a.candidateId);
        r.status = 'onboarding';
        return delay(a);
      },
      async release(appId) {
        const e = await datos();
        const a = await candidatura(e, appId);
        liberarPlaza(a.requestId, a.id);
        Object.assign(a, { slotId: null, slotNumber: null });
        moverEtapa(a, 'interview', 'propuesta retirada');
        const r = buscar(e, a.candidateId);
        if (r.status === 'onboarding') r.status = 'in_selection';
        return delay(a);
      },
    },
    accessLog: {
      async list(q = {}) {
        const e = await datos();
        return page(e.accesos.filter((x) => (!q.candidateId || x.candidateId === q.candidateId) && (!q.action || x.action === q.action) && (!q.actorUserId || x.actorUserId === q.actorUserId)), q);
      },
    },
  };
}
