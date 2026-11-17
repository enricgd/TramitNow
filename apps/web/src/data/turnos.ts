// Turnos de serie de una petición (los de las plantillas de PeticionesView.jsx) en la forma de la API: lunes a
// viernes, con su descanso. Sin las horas de cada día: las calcula la API (y horasDia, en la demo).
// Los usan «Crear peticiones» de Presupuestos y la demo (memoriaPeticiones.ts).
import type { RequestScheduleDay } from './tipos';

/** Un turno: su nombre, el tipo de jornada y los siete días. */
export type Turno = { name: string; workdayType: 'full' | 'part'; days: RequestScheduleDay[] };

export const TURNOS = ['Turno de mañana', 'Turno de tarde', 'Turno de noche', 'Jornada partida'] as const;

const minutos = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
/** Horas efectivas de un día: el turno de noche cruza la medianoche. */
export function horasDia(start: string | null, end: string | null, breakMinutes: number) {
  if (!start || !end) return 0;
  let d = minutos(end) - minutos(start);
  if (d <= 0) d += 24 * 60;
  return Math.round((Math.max(0, d - breakMinutes) / 60) * 100) / 100;
}

function semana(name: string, start: string, end: string, breakMinutes: number, viernes?: { end: string; breakMinutes: number }): Turno {
  return {
    name,
    workdayType: 'full',
    days: Array.from({ length: 7 }, (_, i) => {
      const v = i === 4 && viernes ? viernes : { end, breakMinutes };
      return i < 5
        ? { weekday: i + 1, working: true, start, end: v.end, breakMinutes: v.breakMinutes }
        : { weekday: i + 1, working: false, start: null, end: null, breakMinutes: 0 };
    }),
  };
}

/** El horario de uno de los turnos de serie (por su nombre). */
export function horarioDeTurno(nombre: string): Turno {
  switch (nombre) {
    case 'Turno de tarde':
      return semana(nombre, '14:00', '22:00', 30);
    case 'Turno de noche':
      return semana(nombre, '22:00', '06:00', 30);
    case 'Jornada partida':
      return semana(nombre, '08:30', '17:30', 60, { end: '14:30', breakMinutes: 0 });
    default:
      return semana('Turno de mañana', '06:00', '14:00', 30);
  }
}
