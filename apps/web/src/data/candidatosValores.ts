// Valores de Candidatos en la API (fase6-backend.md) y su texto en la pantalla del diseñador (CandidatosView.jsx).
// Los usan la traducción de la vista (views/candidatos/mapeo.ts) y la memoria de la demo (memoriaCandidatos.ts).
import type { ApplicationStage, CandidateAvailability, CandidateShift, CandidateStatus, LanguageLevel } from './tipos';

/** Estado del candidato ↔ texto de la vista (ESTADO_CANDIDATO). */
export const ESTADO_CANDIDATO: Record<CandidateStatus, string> = {
  new: 'Nuevo',
  to_contact: 'Pendiente de contactar',
  contacted: 'Contactado',
  selecting: 'En entrevista',
  available: 'Disponible',
  unavailable: 'No disponible',
  onboarding: 'En incorporación',
  in_mission: 'Asignado/En misión',
  discarded: 'Descartado',
};

/** Turnos ↔ ids de la vista (TURNOS). */
export const TURNO: Record<CandidateShift, string> = { morning: 'manana', afternoon: 'tarde', night: 'noche', split: 'partida', weekend: 'finde' };

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
