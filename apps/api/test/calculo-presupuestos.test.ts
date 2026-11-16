// Cálculo de presupuestos (src/calc/quote.ts): módulo puro, sin base de datos.

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SS_RATES,
  agreementDefaults,
  atEpForCnae,
  calculatePosition,
  calculateQuote,
  rateWithMargin,
  totalSsRate,
  type PositionInput,
} from '../src/calc/quote.js';

const base: PositionInput = {
  annualBaseSalary: 17200,
  monthlyBonus: 120,
  annualHours: 1784,
  hoursPerDay: 8,
  vacationDays: 30,
  vacationDaysType: 'naturales',
  people: 8,
  hoursPerPerson: 480,
  hourlyRate: 17.65,
  costs: [
    { code: 'absenteeism', name: 'Absentismo', mode: 'percent', value: 2.15 },
    { code: 'ppe', name: 'EPIs', mode: 'per_hour', value: 0.18 },
    { code: 'medical', name: 'Revisión médica y PRL', mode: 'per_hour', value: 0.22 },
  ],
};
const defaults = { margin: { mode: 'percent' as const, value: 18 }, ssRates: DEFAULT_SS_RATES };

describe('cálculo de un puesto', () => {
  const r = calculatePosition(base, defaults);
  const S = 17200 + 120 * 12;
  const gross = S / 1784;

  it('desglosa salario, vacaciones, SS, indemnización, costes internos y margen', () => {
    expect(r.grossSalaryHour).toBeCloseTo(gross, 4);
    expect(r.vacationHour).toBeCloseTo((gross * 30) / 365, 4);
    expect(r.salaryHour + r.vacationHour).toBeCloseTo(gross, 3);
    expect(r.ssRatePercent).toBeCloseTo(33.35, 4);
    expect(r.ssHour).toBeCloseTo((gross * 33.35) / 100, 4);
    expect(r.severanceHour).toBeCloseTo((S * 12) / 365 / 1784, 4);
    expect(r.internalCostsHour).toBeCloseTo((gross * 2.15) / 100 + 0.4, 4);
    const cost = gross * 1.3335 + (S * 12) / 365 / 1784 + (gross * 2.15) / 100 + 0.4;
    expect(r.costHour).toBeCloseTo(cost, 3);
    expect(r.marginHour).toBeCloseTo(17.65 - cost, 3);
    expect(r.marginPercent).toBeCloseTo(((17.65 - cost) / 17.65) * 100, 2);
    // Las líneas del desglose suman la tarifa.
    const sum = r.breakdown.reduce((acc, l) => acc + l.perHour, 0);
    expect(sum).toBeCloseTo(17.65, 3);
    expect(r.breakdown.map((l) => l.kind)).toEqual([
      'salary', 'vacation', 'social_security', 'severance', 'internal_cost', 'internal_cost', 'internal_cost', 'margin',
    ]);
  });

  it('importes del servicio: personas × horas', () => {
    expect(r.hours).toBe(3840);
    expect(r.revenue).toBeCloseTo(17.65 * 3840, 2);
    expect(r.marginTotal).toBeCloseTo(r.revenue - r.cost, 0);
    expect(r.issues).toEqual([]);
  });

  it('tarifa sugerida con margen en % o en €/h', () => {
    expect(r.suggestedRate).toBeCloseTo(r.costHour / 0.82, 3);
    expect(rateWithMargin(10, { mode: 'per_hour', value: 2.5 })).toBe(12.5);
    const sinTarifa = calculatePosition({ ...base, hourlyRate: null, margin: { mode: 'per_hour', value: 2 } }, defaults);
    expect(sinTarifa.rateIsSuggested).toBe(true);
    expect(sinTarifa.rateHour).toBeCloseTo(sinTarifa.costHour + 2, 3);
    expect(sinTarifa.issues).toContain('no_rate');
  });

  it('vacaciones en días laborables', () => {
    const lab = calculatePosition({ ...base, vacationDays: 22, vacationDaysType: 'laborables' }, defaults);
    expect(lab.vacationHour).toBeCloseTo((gross * 22) / (1784 / 8 + 22), 4);
  });

  it('avisa del salario por debajo del convenio, la tarifa bajo coste y el margen bajo el mínimo', () => {
    const bajo = calculatePosition(
      { ...base, hourlyRate: 14, agreementMinimumSalaryHour: gross + 0.5 },
      { ...defaults, minMarginPercent: 15 },
    );
    expect(bajo.issues).toEqual(['salary_below_agreement', 'rate_below_cost', 'margin_below_minimum']);
    // Igual al mínimo (con redondeo de céntimo) no es «por debajo».
    const igual = calculatePosition({ ...base, agreementMinimumSalaryHour: Number(gross.toFixed(2)) }, defaults);
    expect(igual.issues).not.toContain('salary_below_agreement');
  });

  it('conceptos extra: salario por coeficiente, fijo o complemento; tarifa por recargo, €/h o el factor normal', () => {
    const conExtras = calculatePosition(
      {
        ...base,
        extras: [
          { code: 'overtime', name: 'Hora extra', salaryCoefficient: 1.5 },
          { code: 'night', name: 'Nocturna', salarySupplementPerHour: 1.2, rateSurchargePercent: 25 },
          { code: 'holiday', name: 'Festiva', salaryPerHour: 20, ratePerHour: 30 },
          { code: 'low', name: 'Bajo convenio', salaryCoefficient: 1, agreementMinimumSalaryHour: 99 },
        ],
      },
      defaults,
    );
    const [overtime, night, holiday, low] = conExtras.extras;
    expect(overtime!.salaryHour).toBeCloseTo(gross * 1.5, 4);
    expect(overtime!.rateHour).toBeCloseTo(gross * 1.5 * (17.65 / gross), 3);
    expect(overtime!.surchargePercent).toBeCloseTo(50, 1);
    expect(night!.salaryHour).toBeCloseTo(gross + 1.2, 4);
    expect(night!.rateHour).toBeCloseTo(17.65 * 1.25, 4);
    expect(holiday!.rateHour).toBe(30);
    expect(low!.belowAgreement).toBe(true);
    expect(conExtras.issues).toContain('extra_below_agreement');
  });

  it('sin horas anuales no hay cálculo', () => {
    expect(() => calculatePosition({ ...base, annualHours: 0 }, defaults)).toThrow(RangeError);
  });
});

describe('cálculo del presupuesto', () => {
  it('suma los puestos y da la tarifa y el coste medios', () => {
    const q = calculateQuote({
      ...defaults,
      minMarginPercent: 30,
      positions: [base, { ...base, people: 4, hourlyRate: 19.8 }],
    });
    expect(q.totals.people).toBe(12);
    expect(q.totals.hours).toBe(5760);
    expect(q.totals.revenue).toBeCloseTo(17.65 * 3840 + 19.8 * 1920, 2);
    expect(q.totals.averageRate).toBeCloseTo(q.totals.revenue / 5760, 3);
    expect(q.totals.margin).toBeCloseTo(q.totals.revenue - q.totals.cost, 2);
    expect(q.issues).toEqual([
      { position: 0, issue: 'margin_below_minimum' },
      { position: 1, issue: 'margin_below_minimum' },
    ]);
  });
});

describe('parámetros de la Seguridad Social', () => {
  it('AT/EP por el prefijo más largo del CNAE', () => {
    expect(atEpForCnae('1011')).toBe(4.25);
    expect(atEpForCnae('1071')).toBe(3.7);
    expect(atEpForCnae('5210')).toBe(3.5);
    expect(atEpForCnae('9999')).toBe(DEFAULT_SS_RATES.atEp);
    expect(atEpForCnae(null)).toBe(DEFAULT_SS_RATES.atEp);
  });
  it('tipo total', () => {
    expect(totalSsRate(DEFAULT_SS_RATES)).toBeCloseTo(33.35, 6);
  });
});

describe('valores desde el convenio', () => {
  const conditions = { annualHours: 1764, vacationDays: 32, vacationDaysType: 'naturales' as const, extraPayments: 2 };

  it('base anual y plus de la categoría (lo propio manda sobre lo general)', () => {
    const d = agreementDefaults(
      [
        { categoryId: null, concept: 'salario_base', amount: 15000, unit: 'anio' },
        { categoryId: 'c1', concept: 'salario_base', amount: 16800, unit: 'anio' },
        { categoryId: null, concept: 'plus_convenio', amount: 50, unit: 'mes' },
        { categoryId: null, concept: 'plus_idioma', amount: 80, unit: 'mes' },
        { categoryId: null, concept: 'hora_extra', amount: 25, unit: 'porcentaje' },
        { categoryId: null, concept: 'nocturnidad', amount: 0.9, unit: 'hora' },
      ],
      conditions,
      'c1',
    );
    expect(d.annualBaseSalary).toBe(16800);
    expect(d.monthlyBonus).toBe(50);
    expect(d.annualPayments).toBe(14);
    expect(d.annualHours).toBe(1764);
    expect(d.minimumSalaryHour).toBeCloseTo((16800 + 600) / 1764, 4);
    expect(d.extras).toEqual([
      { code: 'overtime', name: 'Hora extra', salaryCoefficient: 1.25, agreementMinimumSalaryHour: expect.any(Number) },
      { code: 'night', name: 'Hora nocturna', salarySupplementPerHour: 0.9, agreementMinimumSalaryHour: expect.any(Number) },
    ]);
  });

  it('sin anual: mensual × (12 + pagas) o diario × 365; sin base ni horas no hay mínimo', () => {
    expect(agreementDefaults([{ categoryId: 'c', concept: 'salario_base_mensual', amount: 1200, unit: 'mes' }], conditions, 'c')
      .annualBaseSalary).toBe(16800);
    expect(agreementDefaults([{ categoryId: 'c', concept: 'salario_base_diario', amount: 40, unit: 'dia' }], conditions, 'c')
      .annualBaseSalary).toBe(14600);
    const vacio = agreementDefaults([], null, 'c');
    expect(vacio.annualBaseSalary).toBeNull();
    expect(vacio.minimumSalaryHour).toBeNull();
  });
});
