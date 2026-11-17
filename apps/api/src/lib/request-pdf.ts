// PDF del CPD previo de una petición (design/cambios/2026-10-28-peticiones-plazas-cpd-portales.md, «CPD previo», y
// 2026-11-09-reunion-cpd-presupuestos.md, «quién lo firma»): las condiciones de la puesta a disposición que recibe la
// empresa usuaria antes de que haya personas. Contenido del CPD según el art. 6 de la Ley 14/1994 y el RD 216/1999:
// ETT y autorización, empresa usuaria, supuesto y justificación, puesto, tareas y cualificación, riesgos y EPIs,
// centro, duración, jornada y horario, retribución de convenio y precio. NADA interno: ni costes ni margen.

import { PDFDocument, StandardFonts } from 'pdf-lib';
import { LINE, MUTED, PAGE, Writer, euro, fecha, pdfSafe } from './quote-pdf.js';
import type { ScheduleDayWithHours } from './requests.js';

export interface PreCpdData {
  code: string;
  ett: {
    name: string;
    taxId: string | null;
    tradeName: string | null;
    authorizationNumber: string | null;
    authorizationDate: string | null;
    authorizationScope: string | null;
    representativeName: string | null;
    representativePosition: string | null;
    representativeIdType: string | null;
    representativeIdNumber: string | null;
  };
  client: { name: string; taxId: string | null };
  center: { name: string; address: string | null } | null;
  signer: { name: string; position: string | null } | null;
  quote: { code: string; versionNumber: number };
  useCase: { name: string; legalReference: string; justification: string };
  positionName: string;
  categoryName: string | null;
  level: string | null;
  collectiveAgreementName: string | null;
  qualification: string | null;
  requiredLicenses: string | null;
  tasks: string;
  risks: string;
  ppe: string | null;
  startDate: string;
  endDate: string | null;
  positionsCount: number;
  shiftName: string | null;
  workdayType: 'full' | 'part';
  schedule: ScheduleDayWithHours[];
  weeklyHours: number;
  grossSalaryHour: number | null;
  rateHour: number | null;
  extras: { name: string; salaryHour: number | null; rateHour: number | null; print: boolean }[];
}

const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const ID_TYPES: Record<string, string> = { dni: 'DNI', nie: 'NIE', passport: 'Pasaporte' };
const horas = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 2 });

export async function renderPreCpdPdf(d: PreCpdData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(pdfSafe(`CPD previo ${d.code}`));
  doc.setCreator('TramitNOW');
  doc.setProducer('TramitNOW');
  const w = new Writer(doc, await doc.embedFont(StandardFonts.Helvetica), await doc.embedFont(StandardFonts.HelveticaBold));

  const section = (title: string) => {
    w.ensure(40);
    w.y -= 8;
    w.text(title, { size: 11, bold: true, gap: 1 });
  };
  const field = (label: string, value: string | null | undefined) => {
    if (!value) return;
    w.text(label, { size: 8.5, color: MUTED });
    w.text(value, { size: 10, gap: 3 });
  };

  w.text('Condiciones de la puesta a disposición', { size: 15, bold: true });
  w.text(`CPD previo · petición ${d.code} · presupuesto ${d.quote.code} v${d.quote.versionNumber}`, { size: 9.5, color: MUTED });
  w.text('Documento informativo previo al contrato de puesta a disposición de cada persona.', { size: 9, color: MUTED, gap: 6 });

  section('Empresa de trabajo temporal');
  const auth = d.ett.authorizationNumber
    ? `Autorización administrativa n.º ${d.ett.authorizationNumber}${d.ett.authorizationDate ? ` de ${fecha(d.ett.authorizationDate)}` : ''}` +
      (d.ett.authorizationScope === 'state' ? ' (ámbito estatal)' : d.ett.authorizationScope === 'regional' ? ' (ámbito autonómico)' : '')
    : null;
  field('Razón social', [d.ett.name, d.ett.taxId ? `NIF ${d.ett.taxId}` : null].filter(Boolean).join(' · '));
  field('Autorización', auth);

  section('Empresa usuaria');
  field('Razón social', [d.client.name, d.client.taxId ? `NIF ${d.client.taxId}` : null].filter(Boolean).join(' · '));
  field('Centro de trabajo', d.center ? [d.center.name, d.center.address].filter(Boolean).join(' · ') : null);

  section('Supuesto de utilización');
  field(d.useCase.legalReference, d.useCase.name);
  field('Justificación', d.useCase.justification);

  section('Puesto de trabajo');
  field('Puesto', d.positionName);
  field('Categoría y nivel', [d.categoryName, d.level ? `nivel ${d.level}` : null].filter(Boolean).join(' · ') || null);
  field('Convenio de la empresa usuaria', d.collectiveAgreementName);
  field('Tareas', d.tasks);
  field('Cualificación requerida', d.qualification);
  field('Carnés o acreditaciones', d.requiredLicenses);
  field('Riesgos profesionales del puesto', d.risks);
  field('Equipos de protección individual', d.ppe);

  section('Duración, jornada y horario');
  field('Duración estimada', `Del ${fecha(d.startDate)}${d.endDate ? ` al ${fecha(d.endDate)}` : ' (fin por determinar)'} · ` +
    `${d.positionsCount} ${d.positionsCount === 1 ? 'persona' : 'personas'}`);
  field('Jornada', `${d.workdayType === 'full' ? 'Completa' : 'Parcial'} · ${horas(d.weeklyHours)} h por semana${d.shiftName ? ` · ${d.shiftName}` : ''}`);
  const widths = [150, 110, 110, 125];
  w.row(['Día', 'Entrada', 'Salida', 'Horas'], widths, { bold: true });
  for (const day of d.schedule) {
    w.row([
      WEEKDAYS[day.weekday - 1]!,
      day.working ? day.start ?? '' : 'Libre',
      day.working ? day.end ?? '' : '',
      day.working ? `${horas(day.hours)} h${day.breakMinutes ? ` (descanso ${day.breakMinutes} min)` : ''}` : '',
    ], widths);
  }

  section('Retribución y precio');
  const pw = [255, 120, 120];
  w.row(['Concepto', 'Salario bruto €/h', 'Precio €/h'], pw, { bold: true });
  w.row(['Hora ordinaria', d.grossSalaryHour !== null ? euro(d.grossSalaryHour) : '—', d.rateHour !== null ? euro(d.rateHour) : '—'], pw);
  for (const x of d.extras.filter((e) => e.print)) {
    w.row([x.name, x.salaryHour !== null ? euro(x.salaryHour) : '—', x.rateHour !== null ? euro(x.rateHour) : '—'], pw);
  }
  w.y -= 4;
  w.text('La retribución de las personas puestas a disposición es, como mínimo, la del convenio de la empresa usuaria ' +
    '(art. 11 de la Ley 14/1994). Los precios no incluyen el IVA.', { size: 8.5, color: MUTED });

  // Firmas
  w.ensure(130);
  w.y -= 26;
  const top = w.y;
  const boxWidth = (PAGE.width - 2 * PAGE.margin - 20) / 2;
  const rep = d.ett.representativeName
    ? [d.ett.representativeName, [d.ett.representativePosition,
        d.ett.representativeIdNumber ? `${ID_TYPES[d.ett.representativeIdType ?? ''] ?? 'Documento'} ${d.ett.representativeIdNumber}` : null]
        .filter(Boolean).join(' · ')]
    : ['', ''];
  const signer = d.signer ? [d.signer.name, d.signer.position ?? d.client.name] : ['', d.client.name];
  for (const [i, [label, lines]] of ([['Por la ETT', rep], ['Por la empresa usuaria', signer]] as const).entries()) {
    const x = PAGE.margin + i * (boxWidth + 20);
    w.page.drawText(pdfSafe(label), { x, y: top - 12, size: 9.5, font: w.bold });
    lines.forEach((line, j) => {
      if (line) w.page.drawText(pdfSafe(line), { x, y: top - 26 - j * 11, size: 8.5, font: w.font, color: MUTED });
    });
    w.page.drawRectangle({ x, y: top - 110, width: boxWidth, height: 60, borderColor: LINE, borderWidth: 0.8 });
    w.page.drawText(pdfSafe('Firma y fecha'), { x: x + 6, y: top - 104, size: 8, font: w.font, color: MUTED });
  }
  w.y = top - 120;

  return doc.save();
}
