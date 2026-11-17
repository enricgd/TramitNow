// PDF de la propuesta que recibe el cliente (design/cambios/2026-10-28-presupuestos-mejoras.md, «Vista previa de la
// propuesta»): ETT, número, fechas y destinatario; por puesto, personas, convenio, la hora ordinaria y los conceptos
// extra marcados para imprimir con salario y tarifa; condiciones y firmas. NADA interno: ni costes, ni margen, ni EPIs.
// Se genera con pdf-lib (JavaScript puro) y las fuentes estándar (WinAnsi: admite tildes, ñ y €).

import { PDFDocument, type PDFFont, type PDFPage, StandardFonts, rgb } from 'pdf-lib';

interface ProposalPosition {
  name: string;
  people: number;
  hoursPerPerson: number;
  collectiveAgreementName: string | null;
  agreementCategoryName: string | null;
  customCategoryName: string | null;
  level: string | null;
  description: string | null;
  extras: { code: string; name: string; print: boolean }[];
  calculation: {
    grossSalaryHour: number;
    rateHour: number;
    extras: { code: string; name: string; salaryHour: number; rateHour: number }[];
  } | null;
}

export interface ProposalData {
  code: string;
  companyName: string;
  companyTaxId: string | null;
  tradeName: string | null;
  authorization: string | null;
  clientName: string | null;
  clientTaxId: string | null;
  version: {
    versionNumber: number;
    title: string | null;
    issueDate: string;
    validUntil: string | null;
    expectedStartDate: string | null;
    durationMonths: number | null;
    contactName: string | null;
    salesRepName: string | null;
    modality: string | null;
    paymentMethodName: string | null;
    vatRate: number;
    replacementGuarantee: string | null;
    conditions: string | null;
    positions: ProposalPosition[];
  };
}

export const PAGE = { width: 595.28, height: 841.89, margin: 50 };
export const INK = rgb(0.1, 0.12, 0.16);
export const MUTED = rgb(0.4, 0.43, 0.48);
export const LINE = rgb(0.82, 0.84, 0.87);

/** Lo que no cabe en WinAnsi se cambia por «?» (las fuentes estándar del PDF no lo tienen). */
const WIN_ANSI_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');
export function pdfSafe(text: string): string {
  return [...text.replace(/\r/g, '')]
    .map((ch) => {
      const code = ch.codePointAt(0)!;
      if (ch === '\n' || ch === '\t') return ch === '\t' ? ' ' : ch;
      if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || WIN_ANSI_EXTRA.has(ch)) return ch;
      return '?';
    })
    .join('');
}

export const euro = (n: number) => `${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
export const fecha = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '—');

export class Writer {
  page!: PDFPage;
  y = 0;
  constructor(
    readonly doc: PDFDocument,
    readonly font: PDFFont,
    readonly bold: PDFFont,
  ) {
    this.newPage();
  }

  newPage() {
    this.page = this.doc.addPage([PAGE.width, PAGE.height]);
    this.y = PAGE.height - PAGE.margin;
  }

  ensure(height: number) {
    if (this.y - height < PAGE.margin) this.newPage();
  }

  /** Texto con saltos de línea automáticos. */
  text(value: string, options: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; x?: number; width?: number; gap?: number } = {}) {
    const size = options.size ?? 10;
    const font = options.bold ? this.bold : this.font;
    const x = options.x ?? PAGE.margin;
    const width = options.width ?? PAGE.width - PAGE.margin - x;
    for (const paragraph of pdfSafe(value).split('\n')) {
      let line = '';
      const lines: string[] = [];
      for (const word of paragraph.split(/\s+/)) {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) > width && line) {
          lines.push(line);
          line = word;
        } else {
          line = candidate;
        }
      }
      lines.push(line);
      for (const l of lines) {
        this.ensure(size + 4);
        this.y -= size + 3;
        this.page.drawText(l, { x, y: this.y, size, font, color: options.color ?? INK });
      }
    }
    this.y -= options.gap ?? 0;
  }

  /** Fila de tabla con columnas a la derecha (importes). */
  row(cells: string[], widths: number[], options: { bold?: boolean; size?: number } = {}) {
    const size = options.size ?? 9.5;
    const font = options.bold ? this.bold : this.font;
    this.ensure(size + 8);
    this.y -= size + 5;
    let x = PAGE.margin;
    cells.forEach((cell, i) => {
      const text = pdfSafe(cell);
      const w = widths[i]!;
      const tx = i === 0 ? x : x + w - font.widthOfTextAtSize(text, size);
      this.page.drawText(text, { x: tx, y: this.y, size, font, color: INK });
      x += w;
    });
    this.page.drawLine({
      start: { x: PAGE.margin, y: this.y - 3 },
      end: { x: PAGE.margin + widths.reduce((a, b) => a + b, 0), y: this.y - 3 },
      thickness: 0.5,
      color: LINE,
    });
  }
}

export async function renderProposalPdf(data: ProposalData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(pdfSafe(`Propuesta ${data.code}`));
  doc.setCreator('TramitNOW');
  doc.setProducer('TramitNOW');
  const w = new Writer(doc, await doc.embedFont(StandardFonts.Helvetica), await doc.embedFont(StandardFonts.HelveticaBold));
  const v = data.version;

  // Cabecera
  w.text(data.tradeName ?? data.companyName, { size: 15, bold: true });
  const ett = [data.tradeName ? data.companyName : null, data.companyTaxId ? `NIF ${data.companyTaxId}` : null,
    data.authorization ? `Autorización administrativa n.º ${data.authorization}` : null].filter(Boolean).join(' · ');
  if (ett) w.text(ett, { size: 9, color: MUTED });
  w.y -= 14;
  w.text('Propuesta de servicios de puesta a disposición', { size: 13, bold: true });
  w.text(`Presupuesto ${data.code} · versión ${v.versionNumber}`, { size: 10 });
  w.text(`Fecha: ${fecha(v.issueDate)} · Válido hasta: ${fecha(v.validUntil)}`, { size: 10, color: MUTED, gap: 10 });

  w.text('Para', { size: 9, bold: true, color: MUTED });
  w.text([data.clientName ?? '—', data.clientTaxId ? `NIF ${data.clientTaxId}` : null].filter(Boolean).join(' · '), { size: 10 });
  if (v.contactName) w.text(`A la atención de ${v.contactName}`, { size: 10 });
  if (v.title) w.text(`Servicio: ${v.title}`, { size: 10 });
  w.y -= 12;

  // Puestos
  const widths = [295, 100, 100];
  w.text('Puestos', { size: 12, bold: true, gap: 2 });
  for (const p of v.positions) {
    w.ensure(80);
    w.y -= 6;
    w.text(p.name, { size: 11, bold: true });
    const category = p.agreementCategoryName ?? p.customCategoryName;
    w.text(
      [`${p.people} ${p.people === 1 ? 'persona' : 'personas'}`, p.hoursPerPerson ? `${p.hoursPerPerson.toLocaleString('es-ES')} h por persona` : null,
        p.collectiveAgreementName ? `Convenio: ${p.collectiveAgreementName}` : null, category ? `Categoría: ${category}` : null,
        p.level ? `Nivel: ${p.level}` : null].filter(Boolean).join(' · '),
      { size: 9, color: MUTED },
    );
    if (p.description) w.text(p.description, { size: 9, color: MUTED });
    w.row(['Concepto', 'Salario bruto €/h', 'Tarifa €/h'], widths, { bold: true });
    if (p.calculation) {
      w.row(['Hora ordinaria', euro(p.calculation.grossSalaryHour), euro(p.calculation.rateHour)], widths);
      for (const x of p.extras.filter((e) => e.print)) {
        const calc = p.calculation.extras.find((e) => e.code === x.code);
        if (calc) w.row([x.name, euro(calc.salaryHour), euro(calc.rateHour)], widths);
      }
    }
    w.y -= 6;
  }

  // Condiciones
  w.y -= 8;
  w.text('Condiciones', { size: 12, bold: true, gap: 2 });
  const conditions = [
    v.modality ? `Modalidad: ${v.modality}` : null,
    v.expectedStartDate ? `Inicio previsto: ${fecha(v.expectedStartDate)}` : null,
    v.durationMonths ? `Duración prevista: ${v.durationMonths.toLocaleString('es-ES')} meses` : null,
    v.paymentMethodName ? `Forma de pago: ${v.paymentMethodName}` : null,
    `Las tarifas no incluyen el IVA (${v.vatRate.toLocaleString('es-ES')} %).`,
    v.replacementGuarantee ? `Garantía de sustitución: ${v.replacementGuarantee}` : null,
    'La retribución de las personas puestas a disposición es, como mínimo, la del convenio de la empresa usuaria (art. 11 de la Ley 14/1994).',
  ].filter((x): x is string => Boolean(x));
  for (const line of conditions) w.text(`• ${line}`, { size: 9.5 });
  if (v.conditions) {
    w.y -= 4;
    w.text(v.conditions, { size: 9.5 });
  }

  // Firmas
  w.ensure(110);
  w.y -= 30;
  const top = w.y;
  const boxWidth = (PAGE.width - 2 * PAGE.margin - 20) / 2;
  for (const [i, label] of ['Por la ETT', 'Por la empresa usuaria'].entries()) {
    const x = PAGE.margin + i * (boxWidth + 20);
    w.page.drawText(pdfSafe(label), { x, y: top - 12, size: 9.5, font: w.bold, color: INK });
    w.page.drawRectangle({ x, y: top - 90, width: boxWidth, height: 70, borderColor: LINE, borderWidth: 0.8 });
    w.page.drawText(pdfSafe('Firma, nombre y fecha'), { x: x + 6, y: top - 84, size: 8, font: w.font, color: MUTED });
  }
  w.y = top - 100;

  return doc.save();
}
