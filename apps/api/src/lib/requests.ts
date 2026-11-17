// Peticiones (fase 5): lo que no depende de la base de datos. Horario y horas por semana, supuestos de utilización del
// CPD y la lista de comprobaciones del CPD previo. Sin imports: la web lo puede importar como calc/quote.ts.

// ---------------------------------------------------------------------------
// Supuestos de utilización [verificar con quien lleve lo laboral en la ETT]
// Art. 6.2 de la Ley 14/1994: el CPD se celebra en los mismos supuestos en que la empresa usuaria podría celebrar un
// contrato de duración determinada (art. 15 ET, tras el RDL 32/2021) o un contrato formativo (art. 11 ET).
// maxMonths es orientativo (avisa, no bloquea): el convenio sectorial puede ampliarlo.
// ---------------------------------------------------------------------------
export const USE_CASES = [
  {
    code: 'production_unforeseen',
    name: 'Circunstancias de la producción: aumento ocasional e imprevisible u oscilaciones de la actividad',
    legalReference: 'Art. 6.2 Ley 14/1994 y art. 15.2 ET',
    maxMonths: 6,
    hint: 'Hasta 6 meses, ampliable a 12 por convenio sectorial. Explica la causa concreta y su relación con la duración.',
  },
  {
    code: 'production_foreseeable',
    name: 'Circunstancias de la producción: situaciones ocasionales y previsibles de duración reducida',
    legalReference: 'Art. 6.2 Ley 14/1994 y art. 15.2 ET',
    maxMonths: 3,
    hint: 'Como mucho 90 días en el año natural, no seguidos. Indica las fechas o la campaña.',
  },
  {
    code: 'substitution_leave',
    name: 'Sustitución de una persona trabajadora con derecho a reserva del puesto',
    legalReference: 'Art. 6.2 Ley 14/1994 y art. 15.3 ET',
    maxMonths: null,
    hint: 'Indica a quién se sustituye y la causa de la reserva del puesto.',
  },
  {
    code: 'substitution_reduced_hours',
    name: 'Completar la jornada reducida de otra persona trabajadora',
    legalReference: 'Art. 6.2 Ley 14/1994 y art. 15.3 ET',
    maxMonths: null,
    hint: 'Indica a quién se completa la jornada y la causa legal o convencional de la reducción.',
  },
  {
    code: 'substitution_recruitment',
    name: 'Cobertura temporal del puesto durante un proceso de selección o promoción',
    legalReference: 'Art. 6.2 Ley 14/1994 y art. 15.3 ET',
    maxMonths: 3,
    hint: 'Hasta 3 meses. Indica el proceso de selección o promoción.',
  },
  {
    code: 'training',
    name: 'Contrato formativo',
    legalReference: 'Art. 6.2 Ley 14/1994 y art. 11 ET',
    maxMonths: null,
    hint: 'Formación en alternancia u obtención de la práctica profesional, con sus requisitos.',
  },
] as const;
export type UseCaseCode = (typeof USE_CASES)[number]['code'];
export const USE_CASE_CODES = USE_CASES.map((u) => u.code) as [UseCaseCode, ...UseCaseCode[]];

// ---------------------------------------------------------------------------
// Horario
// ---------------------------------------------------------------------------
export interface ScheduleDay {
  weekday: number;
  working: boolean;
  start: string | null;
  end: string | null;
  breakMinutes: number;
}
export interface ScheduleDayWithHours extends ScheduleDay {
  hours: number;
}

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h! * 60 + m!;
};
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Horas de un día: de start a end (si end es anterior, pasa la medianoche) menos el descanso. */
export function dayHours(day: ScheduleDay): number {
  if (!day.working || !day.start || !day.end) return 0;
  let span = minutes(day.end) - minutes(day.start);
  if (span <= 0) span += 24 * 60;
  return round2(Math.max(0, span - day.breakMinutes) / 60);
}

/** Siete días ordenados (los que faltan, no laborables) con sus horas, y el total semanal. */
export function normalizeSchedule(days: ScheduleDay[]): { days: ScheduleDayWithHours[]; weeklyHours: number } {
  const out: ScheduleDayWithHours[] = [];
  for (let weekday = 1; weekday <= 7; weekday++) {
    const d = days.find((x) => x.weekday === weekday);
    const day: ScheduleDay = d && d.working
      ? { weekday, working: true, start: d.start, end: d.end, breakMinutes: d.breakMinutes }
      : { weekday, working: false, start: null, end: null, breakMinutes: 0 };
    out.push({ ...day, hours: dayHours(day) });
  }
  return { days: out, weeklyHours: round2(out.reduce((s, d) => s + d.hours, 0)) };
}

/** Problemas del horario (para la validación de la API). */
export function scheduleIssues(days: ScheduleDay[]): string[] {
  const issues: string[] = [];
  const seen = new Set<number>();
  for (const d of days) {
    if (seen.has(d.weekday)) issues.push(`El día ${d.weekday} está repetido`);
    seen.add(d.weekday);
    if (d.working) {
      if (!d.start || !d.end) issues.push(`El día ${d.weekday} es laborable y le falta la hora de entrada o de salida`);
      else if (dayHours(d) <= 0) issues.push(`El día ${d.weekday} no tiene horas de trabajo (el descanso es mayor que la jornada)`);
    }
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Comprobaciones del CPD previo
// ---------------------------------------------------------------------------
export interface PreCpdInput {
  useCase: string | null;
  useCaseJustification: string | null;
  clientCenterId: string | null;
  startDate: string | null;
  endDate: string | null;
  weeklyHours: number | null;
  tasks: string | null;
  risks: string | null;
  ettAuthorizationNumber: string | null;
  ettRepresentativeName: string | null;
  ettRepresentativeIdNumber: string | null;
  belowAgreement: boolean;
  /** Alguna versión del convenio en las fechas de la petición no tiene la categoría (o el puesto no tiene categoría). */
  agreementCategoryUnmatched: boolean;
  clientSignerContactId: string | null;
  positionsCount: number;
  quotePeople: number | null;
  peopleInRequests: number;
}
export interface PreCpdCheck {
  code: string;
  ok: boolean;
  blocking: boolean;
  message: string;
  field: string;
}

const filled = (s: string | null) => s !== null && s.trim().length > 0;

/** Meses (aproximados, por días) entre dos fechas ISO. */
export function monthsBetween(from: string, to: string): number {
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 + 1;
  return days / (365 / 12);
}

export function preCpdChecks(r: PreCpdInput): PreCpdCheck[] {
  const useCase = USE_CASES.find((u) => u.code === r.useCase);
  const durationOk = !useCase?.maxMonths || !r.startDate || !r.endDate || monthsBetween(r.startDate, r.endDate) <= useCase.maxMonths + 0.01;
  const check = (code: string, ok: boolean, blocking: boolean, message: string, field: string): PreCpdCheck =>
    ({ code, ok, blocking, message, field });
  return [
    check('use_case', Boolean(useCase) && filled(r.useCaseJustification), true,
      'Supuesto de utilización y su justificación (art. 6 de la Ley 14/1994)', 'useCase'),
    check('client_center', r.clientCenterId !== null, true, 'Centro de trabajo del cliente', 'clientCenterId'),
    check('start_date', r.startDate !== null, true, 'Fecha de inicio', 'startDate'),
    check('schedule', (r.weeklyHours ?? 0) > 0, true, 'Horario con al menos un día laborable', 'schedule'),
    check('tasks', filled(r.tasks), true, 'Tareas del puesto', 'tasks'),
    check('risks', filled(r.risks), true,
      'Riesgos del puesto según la evaluación del cliente (RD 216/1999, art. 2). Si no hay, indícalo', 'risks'),
    check('ett_authorization', filled(r.ettAuthorizationNumber), true,
      'N.º de autorización administrativa de la ETT (Mi ETT → Datos legales)', 'ettAuthorization'),
    check('ett_representative', filled(r.ettRepresentativeName) && filled(r.ettRepresentativeIdNumber), true,
      'Representante legal de la ETT con su documento (Mi ETT → Datos legales)', 'ettRepresentative'),
    check('salary_agreement', !r.belowAgreement, true,
      'Salario no inferior al convenio vigente en las fechas de la petición (art. 11 de la Ley 14/1994)', 'salaryHour'),
    check('agreement_category', !r.agreementCategoryUnmatched, false,
      'Categoría del convenio comprobable en todas las tablas vigentes en las fechas de la petición', 'salaryHour'),
    check('end_date', r.endDate !== null, false, 'Fecha de fin prevista', 'endDate'),
    check('duration', durationOk, false,
      useCase?.maxMonths ? `Duración dentro de lo habitual del supuesto (${useCase.maxMonths} meses)` : 'Duración dentro de lo habitual del supuesto',
      'endDate'),
    check('client_signer', r.clientSignerContactId !== null, false, 'Contacto del cliente que firma los CPD', 'clientSignerContactId'),
    check('people', r.quotePeople === null || r.peopleInRequests <= r.quotePeople, false,
      'Las plazas del puesto no superan a las personas del presupuesto', 'positionsCount'),
  ];
}
