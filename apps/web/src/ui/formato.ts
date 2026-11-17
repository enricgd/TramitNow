// Formato de fechas, importes y porcentajes de toda la web (español): dd/mm/aaaa, 1.234,56 €, 13,3 %.
// Las pantallas no usan toFixed ni toLocaleString para pintar: usan estas funciones.

type Valor = number | string | null | undefined;
const VACIO = '—';

const aNumero = (v: Valor) => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Número con los decimales justos, separador de miles siempre (1.234,5). */
export function numero(v: Valor, decimales = 2, { fijos = true } = {}): string {
  const n = aNumero(v);
  if (n === null) return VACIO;
  return n.toLocaleString('es-ES', {
    minimumFractionDigits: fijos ? decimales : 0,
    maximumFractionDigits: decimales,
    useGrouping: 'always',
  } as unknown as Intl.NumberFormatOptions);
}

/** Importe en euros: 1.234,56 € (con `decimales: 0`, 1.235 €). */
export const euros = (v: Valor, decimales = 2) => (aNumero(v) === null ? VACIO : `${numero(v, decimales)} €`);
/** Euros por hora: 17,65 €/h. */
export const eurosHora = (v: Valor) => (aNumero(v) === null ? VACIO : `${numero(v, 2)} €/h`);
/** Porcentaje: 13,3 %. */
export const porcentaje = (v: Valor, decimales = 1) => (aNumero(v) === null ? VACIO : `${numero(v, decimales)} %`);
/** Horas u otras cantidades sin decimales de relleno: 5.760 o 37,5. */
export const cantidad = (v: Valor, decimales = 2) => numero(v, decimales, { fijos: false });

const SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const FECHA_HORA_LOCAL = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/;

/** Fecha dd/mm/aaaa. Admite «2026-11-17» (sin pasar por la zona horaria), fechas con hora y Date. */
export function fecha(v: string | Date | null | undefined): string {
  if (!v) return VACIO;
  if (typeof v === 'string') {
    const m = v.match(SOLO_FECHA) ?? v.match(FECHA_HORA_LOCAL);
    if (m && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(v)) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Fecha y hora dd/mm/aaaa, hh:mm (en la hora local). «2026-10-22 11:30» se toma tal cual. */
export function fechaHora(v: string | Date | null | undefined): string {
  if (!v) return VACIO;
  if (typeof v === 'string') {
    const local = v.match(FECHA_HORA_LOCAL);
    if (local && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(v)) return `${local[3]}/${local[2]}/${local[1]}, ${local[4]}:${local[5]}`;
    if (SOLO_FECHA.test(v)) return fecha(v);
  }
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
