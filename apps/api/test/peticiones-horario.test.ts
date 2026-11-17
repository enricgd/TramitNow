// lib/requests.ts: horas del horario (incluido el turno que pasa la medianoche) y comprobaciones del CPD previo.

import { describe, expect, it } from 'vitest';
import { USE_CASES, dayHours, monthsBetween, normalizeSchedule, preCpdChecks, scheduleIssues } from '../src/lib/requests.js';

describe('horario', () => {
  it('cuenta las horas de cada día menos el descanso', () => {
    expect(dayHours({ weekday: 1, working: true, start: '06:00', end: '14:00', breakMinutes: 30 })).toBe(7.5);
    expect(dayHours({ weekday: 1, working: false, start: '06:00', end: '14:00', breakMinutes: 0 })).toBe(0);
  });

  it('el turno de noche pasa la medianoche', () => {
    expect(dayHours({ weekday: 1, working: true, start: '22:00', end: '06:00', breakMinutes: 30 })).toBe(7.5);
  });

  it('completa los siete días y suma la semana', () => {
    const { days, weeklyHours } = normalizeSchedule([
      { weekday: 5, working: true, start: '08:30', end: '14:30', breakMinutes: 0 },
      { weekday: 1, working: true, start: '08:30', end: '17:30', breakMinutes: 60 },
    ]);
    expect(days.map((d) => d.weekday)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(days[1]).toMatchObject({ working: false, start: null, hours: 0 });
    expect(weeklyHours).toBe(14);
  });

  it('avisa de días repetidos, horas que faltan y descansos imposibles', () => {
    expect(scheduleIssues([
      { weekday: 1, working: true, start: '08:00', end: null, breakMinutes: 0 },
      { weekday: 1, working: false, start: null, end: null, breakMinutes: 0 },
      { weekday: 2, working: true, start: '08:00', end: '09:00', breakMinutes: 90 },
    ])).toHaveLength(3);
  });
});

describe('comprobaciones del CPD previo', () => {
  const base = {
    useCase: 'production_unforeseen', useCaseJustification: 'Campaña', clientCenterId: 'c', startDate: '2026-12-01',
    endDate: '2027-02-28', weeklyHours: 37.5, tasks: 'Tareas', risks: 'Riesgos', ettAuthorizationNumber: '1',
    ettRepresentativeName: 'Rep', ettRepresentativeIdNumber: '00000000T', belowAgreement: false, agreementCategoryUnmatched: false, clientSignerContactId: 's',
    positionsCount: 2, quotePeople: 4, peopleInRequests: 4,
  };

  it('completa, todo en verde', () => {
    expect(preCpdChecks(base).every((c) => c.ok)).toBe(true);
  });

  it('lo obligatorio bloquea y lo demás avisa', () => {
    const checks = preCpdChecks({ ...base, risks: '  ', useCaseJustification: null, endDate: null, peopleInRequests: 5 });
    const failed = checks.filter((c) => !c.ok);
    expect(failed.map((c) => [c.code, c.blocking])).toEqual([['use_case', true], ['risks', true], ['end_date', false], ['people', false]]);
  });

  it('la duración por encima de lo habitual del supuesto solo avisa', () => {
    const checks = preCpdChecks({ ...base, useCase: 'substitution_recruitment', endDate: '2027-06-30' });
    expect(checks.find((c) => c.code === 'duration')).toMatchObject({ ok: false, blocking: false });
    expect(monthsBetween('2026-12-01', '2027-02-28')).toBeCloseTo(2.96, 1);
  });

  it('cada supuesto tiene su referencia legal', () => {
    expect(USE_CASES.every((u) => u.legalReference.includes('Ley 14/1994'))).toBe(true);
  });
});
