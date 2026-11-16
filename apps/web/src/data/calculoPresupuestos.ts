// Cálculo de un puesto de presupuesto: salario, costes internos, margen, tarifa sugerida, extras e importes.
// PROVISIONAL: es la fórmula que tenía PresupuestosView.jsx, pasada a la forma de la API. El cálculo de verdad lo
// hace el servidor; cuando el backend publique su módulo de cálculo puro (fase 4), este fichero lo reexporta o lo
// adapta, y nada más cambia. Lo usan el modo demo (memoriaPresupuestos.ts) y la vista previa mientras se edita.
// Sin dependencias ni efectos (ver vite.config.ts).
import type { MarginMode, QuoteCostConcept, QuotePosition, QuotePositionBreakdown, QuoteTotals } from './tipos';

export type MargenObjetivo = { mode: MarginMode; value: number };

const lleno = (v: number | null | undefined): v is number => v !== null && v !== undefined && !Number.isNaN(v);

export function calcularPuesto(pos: QuotePosition, conceptos: QuoteCostConcept[], margen: MargenObjetivo): QuotePositionBreakdown {
  const horasAnuales = pos.annualHours > 0 ? pos.annualHours : 1784;
  const horasDia = pos.dailyHours || 8;
  const parcialidad = pos.partTimeFactor || 1;
  const tarifa = pos.rate ?? 0;

  const salarioAnual = (pos.baseAnnualSalary || 0) + (pos.monthlyBonus || 0) * 12;
  const salarioHora = (salarioAnual / horasAnuales) * parcialidad;

  const lines: QuotePositionBreakdown['lines'] = [];
  let costeSocial = 0;
  for (const c of conceptos) {
    const ajuste = c.legal ? undefined : pos.costs.find((x) => x.conceptId === c.id);
    if (ajuste && !ajuste.applies) continue;
    let kind = c.kind;
    let base = c.base;
    let valor = c.value;
    if (lleno(ajuste?.percent)) {
      kind = 'percentage';
      valor = ajuste.percent;
      if (c.kind !== 'percentage') base = 'gross_hourly_salary'; // un coste fijo pasado a %: sobre el salario
    } else if (lleno(ajuste?.amount)) {
      kind = 'per_hour';
      valor = ajuste.amount;
    }
    const sobre = base === 'hourly_rate' ? tarifa : base === 'effective_hours' ? 1 : salarioHora;
    const importe =
      kind === 'percentage' ? (sobre * valor) / 100 : kind === 'per_hour' ? valor : kind === 'per_day' ? valor / horasDia : valor / (horasAnuales / 12);
    costeSocial += importe;
    lines.push({ conceptId: c.id, name: c.name, amountHour: importe, legal: c.legal, custom: kind !== c.kind || valor !== c.value });
  }

  const coste = salarioHora + costeSocial;
  const margenHora = tarifa - coste;
  const margenPct = tarifa > 0 ? (margenHora / tarifa) * 100 : 0;

  // Margen objetivo: el del puesto manda; si no tiene, el del presupuesto.
  const propio: MargenObjetivo | null =
    pos.marginMode === 'amount' && lleno(pos.marginAmount)
      ? { mode: 'amount', value: pos.marginAmount }
      : lleno(pos.marginPercent)
        ? { mode: 'percentage', value: pos.marginPercent }
        : null;
  const objetivo = propio ?? margen;
  const sugerida = objetivo.mode === 'amount' ? coste + objetivo.value : objetivo.value < 100 ? coste / (1 - objetivo.value / 100) : 0;

  // Extras: salario = hora normal × coeficiente (o el suyo); tarifa = +% sobre la normal, €/h o el mismo factor.
  const factor = salarioHora > 0 ? tarifa / salarioHora : 0;
  const extras = pos.extras.map((x) => {
    const salaryHour = lleno(x.salaryOverride) ? x.salaryOverride : salarioHora * (x.salaryCoefficient || 1);
    const rateHour = lleno(x.rateSurchargePercent)
      ? tarifa * (1 + x.rateSurchargePercent / 100)
      : lleno(x.rateOverride)
        ? x.rateOverride
        : salaryHour * (lleno(x.rateCoefficient) ? x.rateCoefficient : factor);
    const surchargePercent = tarifa > 0 ? (rateHour / tarifa - 1) * 100 : ((x.salaryCoefficient || 1) - 1) * 100;
    return { ...x, salaryHour, rateHour, surchargePercent };
  });

  const people = pos.people || 1;
  const totalHours = people * (pos.hoursPerPerson || 0);
  const minimo = pos.agreementMinimumAnnual;

  return {
    salaryHour: salarioHora,
    annualGrossSalary: salarioAnual,
    lines,
    socialCostHour: costeSocial,
    costHour: coste,
    rate: tarifa,
    marginHour: margenHora,
    marginPercent: margenPct,
    dailyHours: horasDia,
    dailyRate: tarifa * horasDia,
    dailyCost: coste * horasDia,
    targetMarginMode: objetivo.mode,
    targetMarginPercent: objetivo.mode === 'amount' ? (sugerida > 0 ? (objetivo.value / sugerida) * 100 : 0) : objetivo.value,
    targetMarginAmount: sugerida - coste,
    suggestedRate: sugerida,
    extras,
    people,
    hoursPerPerson: pos.hoursPerPerson || 0,
    totalHours,
    billing: tarifa * totalHours,
    serviceCost: coste * totalHours,
    serviceMargin: (tarifa - coste) * totalHours,
    belowAgreement: lleno(minimo) && salarioAnual + 0.005 < minimo ? { minimumAnnual: minimo, annual: salarioAnual } : null,
  };
}

export function calcularTotales(desgloses: QuotePositionBreakdown[]): QuoteTotals {
  const suma = (f: (d: QuotePositionBreakdown) => number) => desgloses.reduce((s, d) => s + f(d), 0);
  const billing = suma((d) => d.billing);
  const margin = suma((d) => d.serviceMargin);
  const n = desgloses.length;
  return {
    positions: n,
    people: suma((d) => d.people),
    hours: suma((d) => d.totalHours),
    billing,
    cost: suma((d) => d.serviceCost),
    margin,
    marginPercent: billing > 0 ? (margin / billing) * 100 : 0,
    averageRate: n ? suma((d) => d.rate) / n : 0,
    averageMarginPercent: n ? suma((d) => d.marginPercent) / n : 0,
  };
}
