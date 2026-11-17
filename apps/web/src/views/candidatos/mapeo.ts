// Traducción entre los candidatos de la API (fase 6, fase6-backend.md) y la forma que usa CandidatosView.jsx (la del
// diseñador). En la vista un candidato se identifica por su código (`id`: «CAN-0101»); el id de la API va en `_id`.
// Lo sensible (documento de identidad, NSS, IBAN) llega y se queda enmascarado: nunca se guarda el valor completo.
import { CANAL, ETAPA, ESTADO_CANDIDATO, INCORPORACION, NIVEL, ORIGEN, TIPO_DOCUMENTO, TURNO, clave } from '../../data/candidatosValores';
import type {
  Application,
  Candidate,
  CandidateCatalogItem,
  CandidateContact,
  CandidateInput,
  CandidateShift,
  CandidateSummary,
  LanguageLevel,
  StoredDocument,
} from '../../data';
import { PROVINCIAS_CP } from '../codigosPostales';

const TEXTO_TURNO: Record<string, string> = { manana: 'Mañana', tarde: 'Tarde', noche: 'Noche', partida: 'Jornada partida', finde: 'Fines de semana' };
const RGPD: Record<CandidateSummary['poolConsent']['state'], string> = { valid: 'Vigente', expiring: 'Próximo a caducar', expired: 'Caducado', none: 'Sin consentimiento' };
const enDias = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const fecha = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '');
/** «AAAA-MM-DD hh:mm» en la hora local (como el historial del diseño). */
const fechaHora = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** Documento de la API → el de la vista. */
export function documentoVista(d: StoredDocument, tipoPorTypeId: (typeId: string) => string) {
  return {
    id: d.id,
    name: d.name,
    type: tipoPorTypeId(d.typeId),
    status: d.status === 'pending' ? 'Pendiente de validar' : d.status === 'rejected' ? 'Rechazado' : 'Verificado',
    uploadDate: fecha(d.uploadedAt),
    expiry: d.expiresOn ?? null,
    validadoPor: d.status === 'pending' ? undefined : (d.validatedByName ?? undefined),
    validadoEl: d.validatedAt ? fecha(d.validatedAt) : undefined,
    motivoRechazo: d.rejectionReason ?? undefined,
    avisoEnviado: d.renewalNoticeSentAt ? fecha(d.renewalNoticeSentAt) : undefined,
  };
}
export type DocumentoVista = ReturnType<typeof documentoVista>;

/** Candidatura de la API → la de la vista (petición por su código). */
export function candidaturaVista(a: Application) {
  return { _id: a.id, _requestId: a.requestId, petId: a.requestCode, plaza: a.slotNumber, estado: ETAPA[a.stage], etapa: a.stage, fecha: fecha(a.stageChangedAt), nota: a.notes ?? a.discardReason ?? undefined, puesto: a.positionName, turno: a.shiftName, cliente: a.clientName };
}

export function contactoVista(c: CandidateContact) {
  return { date: fechaHora(c.contactedAt), user: c.createdByName ?? '—', channel: CANAL[c.channel] ?? 'Otro', result: c.result ?? '', note: c.note ?? '', nextAction: c.nextAction ?? undefined };
}

/** Fila del listado (y base de la ficha). En la fila no vienen los documentos: solo cuántos hay por renovar. */
export function candidatoVista(r: CandidateSummary & Partial<Candidate>, extra: { documentos?: DocumentoVista[]; contactos?: CandidateContact[] } = {}) {
  const idiomas = (r.attributes?.languages ?? []).map((l) => `${l.name} (${NIVEL[l.level]})`);
  const turnos = (r.shifts ?? []).map((s) => TURNO[s]);
  const candidaturas = (r.applications ?? []).map(candidaturaVista);
  const activa = candidaturas.find((x) => ['Confirmada', 'En misión'].includes(x.estado));
  // Sin la ficha, los documentos por renovar se representan con su número (la columna «N por renovar» de la lista)
  const docs = extra.documentos ?? [
    ...Array.from({ length: r.documentAlerts.expired }, (_, i) => ({ id: `alerta-${r.id}-c${i}`, name: '', type: 'Documento', status: 'Verificado', uploadDate: '', expiry: enDias(-1) })),
    ...Array.from({ length: r.documentAlerts.expiring }, (_, i) => ({ id: `alerta-${r.id}-p${i}`, name: '', type: 'Documento', status: 'Verificado', uploadDate: '', expiry: enDias(15) })),
  ];
  const consentimiento = (r.consents ?? []).filter((c) => c.purpose === 'talent_pool' && !c.withdrawnAt).sort((a, b) => b.givenAt.localeCompare(a.givenAt))[0];
  const ultimo = extra.contactos?.[0];
  return {
    id: r.code,
    _id: r.id,
    _ficha: !!r.attributes,
    name: r.firstName,
    lastName: r.lastName ?? '',
    dni: r.idDocument.masked ?? '',
    _tipoDocumento: r.idDocument.type,
    dniExpiry: r.idDocument.expiresOn ?? '',
    dniStatus: r.idDocument.state === 'ok' ? 'OK' : r.idDocument.state === 'expired' ? 'Caducado' : 'Falta',
    phone: r.phone ?? '',
    email: r.email ?? '',
    city: r.city ?? '',
    province: r.provinceCode ? (PROVINCIAS_CP as Record<string, string>)[r.provinceCode] ?? '' : '',
    distance: '',
    nss: r.ssNumber?.masked ?? '',
    nssStatus: r.ssNumber ? 'OK' : 'Falta',
    iban: r.iban?.masked ?? '',
    rgpdStatus: RGPD[r.poolConsent.state],
    rgpdSignedDate: consentimiento ? fecha(consentimiento.givenAt) : null,
    _consentimiento: consentimiento ?? null,
    source: ORIGEN[r.source] ?? 'Otro',
    sourceId: r.sourceRef ?? '',
    lastContactDate: fecha(r.lastContactAt),
    lastContactBy: ultimo?.createdByName ?? '',
    lastContactType: ultimo ? (CANAL[ultimo.channel] ?? '') : '',
    status: ESTADO_CANDIDATO[r.status],
    category: r.mainProfile?.name ?? '',
    otherProfiles: r.otherProfileNames,
    experienceYears: r.experienceYears ?? 0,
    drivingLicenses: (r.attributes?.licenses ?? []).map((x) => x.name),
    otrosCarnes: r.otherLicensesText ?? '',
    hasCar: !!r.hasCar,
    preferredShift: turnos.length ? turnos.map((t) => TEXTO_TURNO[t]).join(' / ') : 'Sin indicar',
    skills: (r.attributes?.skills ?? []).map((x) => x.name),
    languages: idiomas,
    turnos,
    incorporacion: r.availability ? INCORPORACION[r.availability] : 'Inmediata',
    incorporacionFecha: r.availableFrom ?? '',
    radioKm: r.maxDistanceKm ?? 25,
    notasDisponibilidad: r.availabilityNotes ?? '',
    avisoAutomatico: r.autoExpiryNotice ?? true,
    fechaNacimiento: r.birthDate ?? '',
    nacionalidad: r.nationality ?? '',
    direccion: r.address ?? '',
    codigoPostal: r.postalCode ?? '',
    experiencias: (r.experiences ?? []).map((x) => ({ empresa: x.company, puesto: x.position, desde: x.from ?? '', hasta: x.to ?? '', funciones: x.duties ?? '' })),
    formacion: (r.education ?? []).map((x) => ({ titulo: x.title, centro: x.center ?? '', anio: x.year ? String(x.year) : '' })),
    documents: docs,
    communications: (extra.contactos ?? []).map(contactoVista),
    candidaturas,
    activeCandidatures: candidaturas.filter((x) => !['Finalizada', 'Baja', 'Descartada'].includes(x.estado)).map((x) => `${x.petId} (${x.estado}${x.plaza ? `, plaza ${x.plaza}` : ''})`),
    _candidaturasActivas: r.activeApplications,
    assignedMission: activa ? { petitionId: activa.petId, client: activa.cliente, positionTitle: activa.puesto, plazaNum: activa.plaza, startDate: activa.fecha } : null,
    _saludConDatos: !!r.health?.hasData,
  };
}
export type CandidatoVista = ReturnType<typeof candidatoVista>;

type Catalogos = { perfiles: CandidateCatalogItem[]; carnes: CandidateCatalogItem[]; habilidades: CandidateCatalogItem[]; idiomas: CandidateCatalogItem[] };
/** Listados de la API → los de la vista ({ nombre, grupo, sinonimos }; los idiomas, solo el nombre). */
export function catalogosVista(c: Catalogos) {
  const it = (x: CandidateCatalogItem) => ({ nombre: x.name, grupo: x.group ?? '', sinonimos: x.synonyms });
  return { perfiles: c.perfiles.map(it), carnes: c.carnes.map(it), habilidades: c.habilidades.map(it), idiomas: c.idiomas.map((x) => x.name) };
}

const vacio = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

/**
 * Lo que se guarda de una sección de la ficha. Lo sensible solo se envía si se ha escrito un valor nuevo (lo que
 * llega enmascarado no se vuelve a mandar). `ids` traduce nombres de los listados a sus ids.
 */
export function candidatoApi(
  seccion: 'personal' | 'profesional' | 'disponibilidad',
  d: CandidatoVista,
  original: CandidatoVista,
  ids: { perfil: (n: string) => string | null; atributo: (catalog: 'license' | 'skill', n: string) => string | null; idioma: (n: string) => string | null },
): CandidateInput {
  if (seccion === 'personal') {
    const cambiado = (k: 'dni' | 'nss' | 'iban') => d[k] !== original[k] && !(d[k] ?? '').includes('•');
    const provincia = Object.entries(PROVINCIAS_CP as Record<string, string>).find(([, n]) => n === d.province)?.[0] ?? null;
    return {
      firstName: d.name.trim(),
      lastName: d.lastName.trim() || null,
      phone: vacio(d.phone),
      email: vacio(d.email),
      city: vacio(d.city),
      provinceCode: provincia,
      postalCode: vacio(d.codigoPostal),
      address: vacio(d.direccion),
      birthDate: vacio(d.fechaNacimiento),
      nationality: vacio(d.nacionalidad),
      idDocumentExpiresOn: vacio(d.dniExpiry),
      ...(cambiado('dni') ? { idDocumentType: /^[XYZ]/i.test(d.dni.trim()) ? 'nie' : 'dni', idDocumentNumber: vacio(d.dni.toUpperCase()) } : {}),
      ...(cambiado('nss') ? { ssNumber: vacio(d.nss) } : {}),
      ...(cambiado('iban') ? { iban: vacio(d.iban.replace(/\s/g, '').toUpperCase()) } : {}),
    };
  }
  if (seccion === 'profesional') {
    const atributos = [
      ...d.drivingLicenses.map((n) => ids.atributo('license', n)),
      ...d.skills.map((n) => ids.atributo('skill', n)),
      ...(d.otherProfiles ?? []).map((n) => ids.perfil(n)),
    ].filter((x): x is string => !!x);
    const niveles = Object.entries(NIVEL);
    return {
      mainProfileId: d.category ? ids.perfil(d.category) : null,
      attributeIds: atributos,
      languages: d.languages
        .map((l) => {
          const m = l.match(/^(.+?)\s*\((.+)\)$/);
          const idioma = ids.idioma(m ? m[1] : l);
          const nivel = (niveles.find(([, t]) => t === (m ? m[2] : 'B1'))?.[0] ?? 'B1') as LanguageLevel;
          return idioma ? { id: idioma, level: nivel } : null;
        })
        .filter((x): x is { id: string; level: LanguageLevel } => !!x),
      otherLicensesText: d.drivingLicenses.includes('Otros') ? vacio(d.otrosCarnes) : null,
      experienceYears: Number(d.experienceYears) || 0,
      hasCar: !!d.hasCar,
      experiences: d.experiencias.filter((x) => x.empresa || x.puesto).map((x) => ({ company: x.empresa, position: x.puesto, from: vacio(x.desde), to: vacio(x.hasta), duties: vacio(x.funciones) })),
      education: d.formacion.filter((x) => x.titulo).map((x) => ({ title: x.titulo, center: vacio(x.centro), year: Number(x.anio) || null })),
    };
  }
  return {
    status: clave(ESTADO_CANDIDATO, d.status),
    shifts: d.turnos.map((t) => clave(TURNO, t)).filter((x): x is CandidateShift => !!x),
    availability: clave(INCORPORACION, d.incorporacion) ?? 'immediate',
    availableFrom: d.incorporacion === 'A partir de una fecha' ? vacio(d.incorporacionFecha) : null,
    maxDistanceKm: Number(d.radioKm) || null,
    availabilityNotes: vacio(d.notasDisponibilidad),
    autoExpiryNotice: !!d.avisoAutomatico,
  };
}

/** Tipo de documento de la vista por el código de la tabla maestra. */
export const tipoDocumentoVista = (code: string | null | undefined) => TIPO_DOCUMENTO[code ?? 'other'] ?? 'Otro';
