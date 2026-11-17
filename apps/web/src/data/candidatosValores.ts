// Valores de Candidatos en la API (fase6-backend.md) y su texto en la pantalla del diseñador (CandidatosView.jsx).
// Los usan la traducción de la vista (views/candidatos/mapeo.ts) y la memoria de la demo (memoriaCandidatos.ts).
import type { ApplicationStage, CandidateAvailability, CandidateShift, CandidateSource, CandidateStatus, ContactChannel, LanguageLevel } from './tipos';

/** Estado del candidato ↔ texto de la vista (ESTADO_CANDIDATO). */
export const ESTADO_CANDIDATO: Record<CandidateStatus, string> = {
  new: 'Nuevo',
  to_contact: 'Pendiente de contactar',
  contacted: 'Contactado',
  in_selection: 'En entrevista',
  available: 'Disponible',
  unavailable: 'No disponible',
  onboarding: 'En incorporación',
  in_mission: 'Asignado/En misión',
  discarded: 'Descartado',
};

/** Origen del candidato ↔ texto de la vista (filtro «Todos los orígenes»). */
export const ORIGEN: Record<CandidateSource, string> = {
  candidate_portal: 'Portal Web ETT',
  infojobs: 'InfoJobs',
  indeed: 'Indeed',
  linkedin: 'LinkedIn',
  database: 'Base de datos',
  referral: 'Recomendación',
  walk_in: 'Presencial',
  other: 'Otro',
};
/** Origen de la vista → el de la API (lo que no está en la lista, «other»). */
export const origenApi = (texto: string | null | undefined): CandidateSource => (Object.keys(ORIGEN) as CandidateSource[]).find((k) => ORIGEN[k] === texto) ?? 'other';

/** Canal de contacto ↔ texto de la vista (ventana «Contactar»). */
export const CANAL: Record<ContactChannel, string> = { phone: 'Llamada', email: 'Email', whatsapp: 'WhatsApp', sms: 'SMS', in_person: 'Presencial', other: 'Otro' };
export const canalApi = (texto: string): ContactChannel => (Object.keys(CANAL) as ContactChannel[]).find((k) => CANAL[k] === texto) ?? 'other';

/** Turnos ↔ ids de la vista (TURNOS). */
export const TURNO: Record<CandidateShift, string> = { morning: 'manana', afternoon: 'tarde', night: 'noche', split: 'partida', weekends: 'finde' };

/** Incorporación ↔ texto de la vista (INCORPORACION). */
export const INCORPORACION: Record<CandidateAvailability, string> = {
  immediate: 'Inmediata',
  one_week: 'En una semana',
  two_weeks: 'En dos semanas',
  from_date: 'A partir de una fecha',
};

/** Nivel de idioma ↔ texto de la vista. */
export const NIVEL: Record<LanguageLevel, string> = { native: 'Nativo', C2: 'C2', C1: 'C1', B2: 'B2', B1: 'B1', A2: 'A2', A1: 'A1' };

/** Etapa de la candidatura ↔ estado de la vista (ESTADOS_CANDIDATURA). Inscrito, preseleccionado y entrevista son «En selección». */
export const ETAPA: Record<ApplicationStage, string> = {
  registered: 'En selección',
  preselected: 'En selección',
  interview: 'En selección',
  proposed: 'Propuesta al cliente',
  confirmed: 'Confirmada',
  on_mission: 'En misión',
  finished: 'Finalizada',
  left: 'Baja',
  discarded: 'Descartada',
  withdrawn: 'Descartada',
};

/** Tipo de documento (código de la tabla maestra) ↔ tipo de la vista (TIPOS_DOCUMENTO_CANDIDATO). */
export const TIPO_DOCUMENTO: Record<string, string> = {
  candidate_id_document: 'DNI/NIE',
  candidate_ss: 'Seguridad Social',
  candidate_privacy_consent: 'RGPD',
  candidate_forklift: 'Carné de carretillero',
  candidate_prl: 'Formación PRL',
  candidate_food_handler: 'Manipulador de alimentos',
  candidate_driving_license: 'Permiso de conducir',
  candidate_cv: 'CV',
  candidate_work_permit: 'Permiso de trabajo',
  candidate_medical: 'Reconocimiento médico',
  other: 'Otro',
};
export const codigoDeTipo = (tipo: string) => Object.keys(TIPO_DOCUMENTO).find((k) => TIPO_DOCUMENTO[k] === tipo) ?? 'other';

export const clave = <T extends string>(dic: Record<T, string>, texto: string | undefined | null) => (Object.keys(dic) as T[]).find((k) => dic[k] === texto);

/** Documento enmascarado como la API: los cuatro últimos. */
export const enmascarar = (v: string | null | undefined) => (v ? `•••••${v.replace(/\s/g, '').slice(-4)}` : null);
