// Facturación: de las horas cerradas en Horas e incidencias a la factura, el envío y el cobro.
// No partió de ninguna maqueta de design/: se diseñó directamente con el sistema común.
import React, { useState, useMemo, useEffect } from 'react';
import {
    Receipt, Building2, Send, CheckCircle2, AlertTriangle, Info, X, Plus, Trash2, Eye, FileCheck2, Wallet,
    ArrowUpRight, Clock, Undo2, BellRing, FileMinus2, CalendarDays, ChevronDown, Download, FileSpreadsheet, Printer, BriefcaseBusiness, FilePlus2
} from 'lucide-react';
import {
    Page, PageHeader, Card, SectionTitle, KpiTile, EmptyState, Notice, Button, IconButton, Badge, SearchInput,
    Select, Field, TextInput, Modal, Drawer, Confirmar
} from '../ui';
import { SUCURSALES, SUCURSALES_USUARIO, veVariasSucursales, sucursalDeCliente, sucursal } from './sucursalesDemo';
import { SERVICIOS_INICIALES, FORMAS_COBRO, CLAVE_SERVICIO_PENDIENTE } from './serviciosDemo';

// ==========================================
// DATOS DE EJEMPLO (los mismos clientes, peticiones y horas que en Peticiones y Horas e incidencias)
// ==========================================
const ETT = {
    nombre: 'ETT Global Servicios Temporales, S.L.', cif: 'B00000000', direccion: 'C/ Ejemplo 1, 48001 Bilbao (Bizkaia)',
    autorizacion: '00/0000-ETT', iban: 'ES00 0000 0000 0000 0000 0000',
};
// Datos de facturación de la ficha del cliente (Empresas)
const CLIENTES = {
    translog: {
        nombre: 'Trans-Logística Ibérica Norte, S.L.', cif: 'B-87654321',
        direccion: 'Polígono Industrial Artunduaga, Pabellón 14, 48970 Basauri (Bizkaia)',
        iva: 21, retencion: 0, pago: 'Transferencia a 60 días', diasPago: 60, diasFijos: [10, 25],
        email: 'facturacion@translog-norte.es', fichaIncompleta: 'Falta el IBAN y la evaluación de riesgo.',
        detalle: 'concepto', // cómo quiere las facturas de horas (ficha de Empresas → Facturación)
    },
    hosteleria: {
        nombre: 'Hostelería & Eventos Premium BCN, S.L.', cif: 'B-99887766', direccion: 'Passeig de Gràcia 112, 4º, 08008 Barcelona',
        iva: 21, retencion: 0, pago: 'Transferencia a 30 días', diasPago: 30, diasFijos: [],
        email: 'facturacion@premiumeventsbcn.cat',
        detalle: 'persona',
    },
    metal: {
        nombre: 'Manufacturas Metálicas del Henares, S.A.', cif: 'A-28193847', direccion: 'C/ del Torno 8, 28806 Alcalá de Henares (Madrid)',
        iva: 21, retencion: 0, pago: 'Confirming bancario a 60 días', diasPago: 60, diasFijos: [],
        email: 'aserrano@metalhenares.com', detalle: 'concepto',
    },
};
// Tarifa por hora del presupuesto aceptado; los recargos son los del presupuesto (EXTRAS_DEFECTO)
const PETICIONES = {
    'PET-2026-0031': { cliente: 'translog', puesto: 'Mozo/a de almacén', presupuesto: 'PRE-2026-0029', tarifa: 16.90 },
    'PET-2026-0044': { cliente: 'hosteleria', puesto: 'Camarero/a de sala', presupuesto: 'PRE-2026-0041', tarifa: 18.40 },
};
const CONCEPTOS = [
    { id: 'normales', texto: 'horas normales', recargo: 1 },
    { id: 'extra', texto: 'horas extra', recargo: 1.5 },
    { id: 'nocturnas', texto: 'horas nocturnas', recargo: 1.25 },
    { id: 'finde', texto: 'horas de fin de semana', recargo: 1.5 },
    { id: 'festivas', texto: 'horas festivas', recargo: 1.75 },
];
// Meses pasados a facturación desde Horas e incidencias. listo: todos los partes validados.
const HORAS_INICIALES = [
    { petId: 'PET-2026-0031', mes: '2026-07', horas: { normales: 1027.5 }, listo: true },
    // Agosto se facturó con 945 h; los partes validados suman 937,5 (Horas e incidencias avisa de la diferencia)
    { petId: 'PET-2026-0031', mes: '2026-08', horas: { normales: 945 }, listo: true },
    { petId: 'PET-2026-0031', mes: '2026-09', horas: { normales: 990, extra: 2 }, listo: true },
    { petId: 'PET-2026-0044', mes: '2026-10', horas: { normales: 667.33, extra: 4, finde: 144, festivas: 72 }, listo: false, partesPendientes: 2 },
];
// Horas de cada persona en cada mes facturado (las de sus partes en Horas e incidencias). Suman lo de HORAS_INICIALES.
const MOZOS_0031 = ['Clara Esteve Ros', 'Bruno Lage Costa', 'Nerea Olabarria Gil', 'Adrián Vela Soto', 'Paula Rius Ferrer', 'Sergio Navas Peña'];
const CAMAREROS_0044 = ['Garazi Uribe Arana', 'Pablo Ruiz Cano', 'Youssef Amrani', 'Lucía Ferrer Sanz', 'Marc Puig Soler', 'Aitana Roca Vidal', 'Daniel Sousa Prieto', 'Irene Campos Gil', 'Óscar León Mena'];
const HORAS_PERSONA = {
    // Julio: 23 días × 7,5 h; Clara tuvo una ausencia justificada el 16/07
    'PET-2026-0031|2026-07': MOZOS_0031.map((n, i) => [n, { normales: i === 0 ? 165 : 172.5 }]),
    // Agosto: 21 días × 7,5 h. Se facturó así, pero Adrián tuvo una ausencia sin justificar el 10/08 (validadas: 150 h)
    'PET-2026-0031|2026-08': MOZOS_0031.map(n => [n, { normales: 157.5 }]),
    // Septiembre: 22 días × 7,5 h; Bruno hizo 2 h extra el 28/09
    'PET-2026-0031|2026-09': MOZOS_0031.map((n, i) => [n, i === 1 ? { normales: 165, extra: 2 } : { normales: 165 }]),
    // Octubre (por facturar): fin de semana de apertura y festivo del 12/10; extra en la cena de clausura
    'PET-2026-0044|2026-10': CAMAREROS_0044.map((n, i) => [n, {
        normales: [75.11, 75.11, 75.11, 75.11, 75.11, 75.11, 74.44, 67.11, 75.12][i],
        ...([0, 3].includes(i) ? { extra: 2 } : {}),
        finde: 16, festivas: 8,
    }]),
};
// Horas validadas distintas de las facturadas, por persona
const VALIDADAS_PERSONA = { 'PET-2026-0031|2026-08': { 'Adrián Vela Soto': { normales: 150 } } };

// Servicios hechos que se facturan además de las horas (catálogo en Mi ETT → Facturación).
// Selección: importe = salario bruto anual × %. El resto: cantidad × precio.
const SERVICIOS_REGISTRADOS = [
    { id: 's1', cliente: 'hosteleria', servicio: 'reconocimiento', fecha: '2026-10-28', descripcion: 'Reconocimientos médicos de los ayudantes de cocina', referencia: 'PET-2026-0045', cantidad: 4, precio: 45 },
    { id: 's2', cliente: 'metal', servicio: 'seleccion', fecha: '2026-11-04', descripcion: 'Selección de un/a jefe/a de taller, contratado/a por el cliente', referencia: '', salario: 38000, porcentaje: 15 },
    { id: 's3', cliente: 'translog', servicio: 'formacion_prl', fecha: '2026-11-06', descripcion: 'Formación PRL de carretilleros', referencia: 'PET-2026-0050', cantidad: 2, precio: 85 },
];
const servicioDe = (id) => SERVICIOS_INICIALES.find(x => x.id === id) || { nombre: 'Servicio', cobro: 'fijo', unidad: 'servicio' };
const importeServicio = (x) => redondear(x.salario != null ? Number(x.salario) * Number(x.porcentaje) / 100 : Number(x.cantidad) * Number(x.precio));
const lineaDeServicio = (x) => {
    const sv = servicioDe(x.servicio);
    const pct = x.salario != null;
    return {
        id: `linea-${x.id}`, servicio: x.id,
        concepto: `${sv.nombre}: ${x.descripcion}${x.referencia ? ` (${x.referencia})` : ''}${pct ? ` · ${num(Number(x.porcentaje))} % de ${euros(Number(x.salario))} de salario bruto anual` : ''}`,
        cantidad: pct ? 1 : Number(x.cantidad), unidad: pct ? 'proceso' : sv.unidad, precio: pct ? importeServicio(x) : Number(x.precio),
    };
};

const MOTIVOS_RECTIFICACION = ['Error en las horas', 'Error en la tarifa', 'Error en los datos del cliente', 'Otro'];

// ==========================================
// UTILIDADES
// ==========================================
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const hoyIso = () => new Date().toISOString().slice(0, 10);
const fechaES = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');
const sumar = (iso, n) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const diasEntre = (a, b) => Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000);
const nombreMes = (mes) => `${MESES[Number(mes.slice(5)) - 1]} de ${mes.slice(0, 4)}`;
const mayus = (t) => t.replace(/^./, s => s.toUpperCase());
const redondear = (n) => Math.round(n * 100) / 100;
const euros = (n) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', useGrouping: 'always' });
const num = (n) => n.toLocaleString('es-ES', { maximumFractionDigits: 2, useGrouping: 'always' });
// Vencimiento: días de la forma de pago y, si el cliente tiene días fijos de pago, el siguiente de ellos
const vencimientoDe = (cliente, emision) => {
    let d = sumar(emision, cliente.diasPago);
    if (!cliente.diasFijos.length) return d;
    for (let i = 0; i < 32 && !cliente.diasFijos.includes(Number(d.slice(8))); i++) d = sumar(d, 1);
    return d;
};
const lineasDesdeHoras = (h) => {
    const pet = PETICIONES[h.petId];
    return CONCEPTOS.filter(c => h.horas[c.id]).map(c => ({
        id: `${h.petId}-${h.mes}-${c.id}`, petId: h.petId, mes: h.mes,
        concepto: `${pet.puesto} · ${c.texto} · ${nombreMes(h.mes)} (${h.petId})`,
        cantidad: h.horas[c.id], unidad: 'h', precio: redondear(pet.tarifa * c.recargo),
    }));
};
// Personas de las líneas de horas de una factura: una fila por persona y petición, con sus horas por concepto
const personasDe = (f) => {
    const grupos = [...new Set(f.lineas.filter(l => l.petId && l.mes).map(l => `${l.petId}|${l.mes}`))];
    return grupos.flatMap(g => {
        const [petId, mes] = g.split('|');
        // Rectificativas: las líneas van en negativo
        const signo = f.lineas.some(l => l.petId === petId && l.mes === mes && l.cantidad < 0) ? -1 : 1;
        return (HORAS_PERSONA[g] || []).map(([nombre, h]) => ({
            nombre, petId, mes,
            horas: Object.fromEntries(Object.entries(h).map(([k, v]) => [k, v * signo])),
            validadas: VALIDADAS_PERSONA[g]?.[nombre],
        }));
    });
};
// Líneas como salen en la factura: por concepto (resumen) o por persona (desglosadas)
const lineasDe = (f) => {
    if (f.detalle !== 'persona') return f.lineas;
    const conPersonas = new Set(personasDe(f).map(p => `${p.petId}|${p.mes}`));
    return f.lineas.flatMap(l => {
        if (!l.petId || !conPersonas.has(`${l.petId}|${l.mes}`)) return [l];
        const c = CONCEPTOS.find(x => l.id.endsWith(`-${x.id}`));
        return personasDe(f).filter(p => p.petId === l.petId && p.mes === l.mes && p.horas[c.id]).map(p => ({
            id: `${l.id}-${p.nombre}`, petId: l.petId, mes: l.mes, persona: p.nombre,
            concepto: `${p.nombre} · ${c.texto} · ${nombreMes(l.mes)} (${l.petId})`,
            cantidad: p.horas[c.id], unidad: 'h', precio: l.precio,
        }));
    });
};
const totalesDe = (f) => {
    const cliente = CLIENTES[f.cliente];
    const base = redondear(lineasDe(f).reduce((s, l) => s + redondear(l.cantidad * l.precio), 0));
    const iva = redondear(base * cliente.iva / 100);
    const retencion = redondear(base * cliente.retencion / 100);
    const total = redondear(base + iva - retencion);
    const cobrado = redondear(f.cobros.reduce((s, c) => s + c.importe, 0));
    return { base, iva, retencion, total, cobrado, pendiente: redondear(total - cobrado) };
};
const estadoDe = (f) => {
    if (f.estado === 'borrador') return { id: 'borrador', texto: 'Borrador', tono: 'neutral' };
    if (f.rectifica) return { id: 'rectificativa', texto: 'Rectificativa', tono: 'neutral' };
    if (f.anulada) return { id: 'anulada', texto: 'Anulada', tono: 'neutral' };
    const t = totalesDe(f);
    if (t.pendiente <= 0) return { id: 'cobrada', texto: 'Cobrada', tono: 'success' };
    if (f.vencimiento < hoyIso()) return { id: 'vencida', texto: t.cobrado ? 'Vencida · cobro parcial' : 'Vencida', tono: 'danger' };
    if (t.cobrado) return { id: 'parcial', texto: 'Cobro parcial', tono: 'warning' };
    if (f.estado === 'emitida') return { id: 'emitida', texto: 'Emitida, sin enviar', tono: 'info' };
    return { id: 'enviada', texto: 'Pendiente de cobro', tono: 'accent' };
};
const PENDIENTES_COBRO = ['emitida', 'enviada', 'parcial', 'vencida'];
const PERIODOS = [
    { id: 'anio', texto: 'Este año' },
    { id: 'este_mes', texto: 'Este mes' },
    { id: 'mes_pasado', texto: 'Mes pasado' },
    { id: 'tres_meses', texto: 'Últimos 3 meses' },
    { id: 'todo', texto: 'Todo' },
    { id: 'fechas', texto: 'Entre dos fechas…' },
];
const finDeMes = (mes) => sumar(`${sumar(`${mes}-28`, 4).slice(0, 7)}-01`, -1);
const rangoDe = (periodo, desde, hasta) => {
    const hoy = hoyIso();
    const mes = hoy.slice(0, 7);
    const mesPasado = sumar(`${mes}-01`, -1).slice(0, 7);
    switch (periodo) {
        case 'este_mes': return [`${mes}-01`, finDeMes(mes)];
        case 'mes_pasado': return [`${mesPasado}-01`, finDeMes(mesPasado)];
        case 'tres_meses': return [sumar(hoy, -91), hoy];
        case 'todo': return ['0000-01-01', '9999-12-31'];
        case 'fechas': return [desde || '0000-01-01', hasta || '9999-12-31'];
        default: return [`${hoy.slice(0, 4)}-01-01`, `${hoy.slice(0, 4)}-12-31`];
    }
};
const normalizar = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const peticionesDe = (f) => [...new Set(f.lineas.filter(l => l.petId).map(l => l.petId))];
// Fecha con la que se filtra: la de emisión, o el mes del borrador
const fechaFiltro = (f) => f.emision || (/^\d{4}-\d{2}$/.test(f.periodo) ? `${f.periodo}-01` : hoyIso());

const factura = (numero, cliente, periodo, emision, lineas, extra = {}) => ({
    id: numero, numero, cliente, periodo, emision, vencimiento: vencimientoDe(CLIENTES[cliente], emision),
    estado: 'enviada', lineas, cobros: [], historial: [{ fecha: emision, texto: `Factura ${numero} emitida y enviada a ${CLIENTES[cliente].email}` }],
    ...extra,
});
const INITIAL_FACTURAS = [
    factura('F2026-0079', 'translog', 'Formación PRL', '2026-07-15', [
        { id: 'prl', concepto: 'Curso PRL de carretilla elevadora (6 personas)', cantidad: 6, unidad: 'ud.', precio: 85, manual: true },
    ], { historial: [{ fecha: '2026-07-15', texto: 'Factura F2026-0079 emitida y enviada a facturacion@translog-norte.es' }, { fecha: '2026-10-01', texto: 'Recordatorio de pago enviado' }] }),
    factura('F2026-0087', 'translog', '2026-07', '2026-08-03', lineasDesdeHoras(HORAS_INICIALES[0])),
    factura('F2026-0094', 'translog', '2026-08', '2026-09-02', lineasDesdeHoras(HORAS_INICIALES[1])),
    factura('F2026-0101', 'translog', '2026-09', '2026-10-02', lineasDesdeHoras(HORAS_INICIALES[2])),
];
// Julio, cobrada en el día fijo de pago
INITIAL_FACTURAS[1].cobros = [{ fecha: '2026-10-10', importe: totalesDe(INITIAL_FACTURAS[1]).total, nota: 'Transferencia' }];
INITIAL_FACTURAS[1].historial.push({ fecha: '2026-10-10', texto: 'Cobrada' });
const PRIMER_NUMERO = 108;

// ==========================================
// DESCARGAS: PDF de la factura (ventana imprimible: «Guardar como PDF») y Excel (CSV con ; que abre Excel)
// ==========================================
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const htmlFactura = (f) => {
    const cliente = CLIENTES[f.cliente];
    const t = totalesDe(f);
    const filas = personasDe(f);
    const usados = CONCEPTOS.filter(c => filas.some(p => p.horas[c.id]));
    const importe = (p) => redondear(usados.reduce((s, c) => s + redondear((p.horas[c.id] || 0) * redondear(PETICIONES[p.petId].tarifa * c.recargo)), 0));
    const anexo = filas.length ? `
        <h3>${f.detalle === 'persona' ? 'Resumen por persona' : 'Anexo: horas e importe por persona'}</h3>
        <table><thead><tr><th>Persona</th>${usados.map(c => `<th class="n">${esc(mayus(c.texto.replace('horas ', '')))}</th>`).join('')}<th class="n">Total h</th><th class="n">Importe</th></tr></thead><tbody>
        ${filas.map(p => `<tr><td>${esc(p.nombre)}</td>${usados.map(c => `<td class="n">${p.horas[c.id] ? num(p.horas[c.id]) : '—'}</td>`).join('')}<td class="n">${num(usados.reduce((s, c) => s + (p.horas[c.id] || 0), 0))}</td><td class="n">${euros(importe(p))}</td></tr>`).join('')}
        <tr class="tot"><td>${filas.length} personas</td>${usados.map(c => `<td class="n">${num(redondear(filas.reduce((s, p) => s + (p.horas[c.id] || 0), 0)))}</td>`).join('')}<td class="n">${num(redondear(filas.reduce((s, p) => s + usados.reduce((x, c) => x + (p.horas[c.id] || 0), 0), 0)))}</td><td class="n">${euros(redondear(filas.reduce((s, p) => s + importe(p), 0)))}</td></tr>
        </tbody></table><p class="nota">Importes sin IVA, a la tarifa por hora de cada concepto.</p>` : '';
    return `<section class="factura">
        <div class="cab"><div><b>${esc(ETT.nombre)}</b><br>CIF ${esc(ETT.cif)} · ${esc(ETT.direccion)}<br>Empresa de trabajo temporal autorizada n.º ${esc(ETT.autorizacion)}</div>
        <div class="d"><span class="num">${f.rectifica ? 'Factura rectificativa' : 'Factura'} ${esc(f.numero || '(borrador)')}</span><br>Fecha: ${fechaES(f.emision || hoyIso())}${f.rectifica ? `<br>Rectifica: ${esc(f.rectifica)}` : ''}</div></div>
        <div class="cli"><small>Cliente</small><br><b>${esc(cliente.nombre)}</b> · CIF ${esc(cliente.cif)}<br>${esc(cliente.direccion)}</div>
        <table><thead><tr><th>Concepto</th><th class="n">Cantidad</th><th class="n">Precio</th><th class="n">Importe</th></tr></thead><tbody>
        ${lineasDe(f).map(l => `<tr><td>${esc(l.concepto)}</td><td class="n">${num(l.cantidad)} ${esc(l.unidad)}</td><td class="n">${euros(l.precio)}</td><td class="n">${euros(redondear(l.cantidad * l.precio))}</td></tr>`).join('')}
        </tbody></table>
        <table class="totales"><tr><td>Base imponible</td><td class="n">${euros(t.base)}</td></tr><tr><td>IVA ${cliente.iva} %</td><td class="n">${euros(t.iva)}</td></tr>${cliente.retencion ? `<tr><td>Retención ${cliente.retencion} %</td><td class="n">−${euros(t.retencion)}</td></tr>` : ''}<tr class="tot"><td>Total</td><td class="n">${euros(t.total)}</td></tr></table>
        ${f.rectifica ? '' : `<p>Forma de pago: ${esc(cliente.pago.toLowerCase())} a ${esc(ETT.iban)}. Vencimiento: ${fechaES(f.vencimiento || vencimientoDe(cliente, hoyIso()))}.</p>`}
        ${anexo}
    </section>`;
};
// Abre las facturas en una ventana para guardarlas como PDF (una por página)
const descargarPdf = (lista, titulo) => {
    const w = window.open('', '_blank');
    if (!w) return false;
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>
        body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:12px;color:#1e293b;margin:24px}
        .factura{page-break-after:always;max-width:800px;margin:0 auto 40px}.factura:last-child{page-break-after:auto}
        .cab{display:flex;justify-content:space-between;gap:24px;margin-bottom:16px}.d{text-align:right}.num{font-size:16px}
        .cli{background:#f1f5f9;padding:10px;border-radius:6px;margin-bottom:16px}small,.nota{color:#64748b}
        table{width:100%;border-collapse:collapse;margin:8px 0}th{text-align:left;font-weight:500;color:#64748b;border-bottom:1px solid #94a3b8;padding:4px}
        td{border-bottom:1px solid #e2e8f0;padding:4px}.n{text-align:right;white-space:nowrap}.tot td{font-weight:600;border-bottom:0}
        .totales{width:260px;margin-left:auto}h3{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:12px}
        @media print{body{margin:0}}</style></head><body>${lista.map(htmlFactura).join('')}<script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
    return true;
};
// Excel: CSV con punto y coma, coma decimal y BOM para que Excel lo abra bien en español
const numExcel = (n) => String(redondear(n)).replace('.', ',');
const descargarCsv = (nombre, cabecera, filas) => {
    const celda = (v) => { const t = String(v ?? ''); return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
    const texto = [cabecera, ...filas].map(fila => fila.map(celda).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + texto], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default function FacturacionView() {
    const [facturas, setFacturas] = useState(INITIAL_FACTURAS);
    const [horas, setHoras] = useState(HORAS_INICIALES);
    const [siguiente, setSiguiente] = useState({ F: PRIMER_NUMERO, R: 4 });
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');
    const [filtroCliente, setFiltroCliente] = useState('');
    const [filtroPeticion, setFiltroPeticion] = useState('');
    const [filtroSucursal, setFiltroSucursal] = useState(''); // solo para quien ve más de una sucursal
    const [menuExportar, setMenuExportar] = useState(false);
    const [periodo, setPeriodo] = useState('anio');
    const [desde, setDesde] = useState('');
    const [hasta, setHasta] = useState('');
    const [plegados, setPlegados] = useState([]);
    const [abierta, setAbierta] = useState(null);
    const [previa, setPrevia] = useState(false);
    const [linea, setLinea] = useState(null); // { concepto, cantidad, precio }
    const [lineaAEliminar, setLineaAEliminar] = useState(null);
    const [descartar, setDescartar] = useState(false);
    const [cobro, setCobro] = useState(null); // { fecha, importe, nota }
    const [rectificar, setRectificar] = useState(null); // { motivo, nota, nueva }
    const [toast, setToast] = useState(null);
    const [servicios, setServicios] = useState(SERVICIOS_REGISTRADOS);
    const [nuevoServicio, setNuevoServicio] = useState(null); // formulario «Añadir servicio a facturar»
    const [nuevaFactura, setNuevaFactura] = useState(null); // { cliente }
    // Desde la ficha de un cliente (Empresas) se llega aquí con el formulario de servicio abierto
    useEffect(() => {
        let nombre = null;
        try { nombre = sessionStorage.getItem(CLAVE_SERVICIO_PENDIENTE); sessionStorage.removeItem(CLAVE_SERVICIO_PENDIENTE); } catch { /* sin almacenamiento */ }
        if (!nombre) return;
        const id = Object.keys(CLIENTES).find(k => CLIENTES[k].nombre === nombre);
        if (id) abrirServicio(id); else showToast(`${nombre} todavía no tiene datos de facturación: complétalos en su ficha`);
    }, []);

    const showToast = (t) => { setToast(t); setTimeout(() => setToast(null), 3800); };
    const actualizar = (id, cambios, texto) => {
        setFacturas(prev => prev.map(f => {
            if (f.id !== id) return f;
            const n = { ...f, ...(typeof cambios === 'function' ? cambios(f) : cambios) };
            if (texto) n.historial = [...n.historial, { fecha: hoyIso(), texto }];
            return n;
        }));
        if (texto) showToast(texto);
    };

    // Meses con horas que aún no tienen factura (o solo un borrador), agrupados por cliente y mes
    const facturado = (h) => facturas.find(f => !f.anulada && !f.rectifica && f.lineas.some(l => l.petId === h.petId && l.mes === h.mes));
    const facturaDeServicio = (x) => facturas.find(f => !f.anulada && !f.rectifica && f.lineas.some(l => l.servicio === x.id));
    const porFacturar = useMemo(() => {
        const grupos = {};
        const grupo = (cliente, mes) => (grupos[`${cliente}|${mes}`] = grupos[`${cliente}|${mes}`] || { cliente, mes, horas: [], servicios: [], borrador: null });
        horas.forEach(h => {
            const f = facturado(h);
            if (f && f.estado !== 'borrador') return;
            const g = grupo(PETICIONES[h.petId].cliente, h.mes);
            g.horas.push(h);
            if (f) g.borrador = f.id;
        });
        // Servicios aún sin factura emitida: con las horas del mismo cliente y mes, o solos
        servicios.forEach(x => {
            const f = facturaDeServicio(x);
            if (f && f.estado !== 'borrador') return;
            const g = grupo(x.cliente, x.fecha.slice(0, 7));
            g.servicios.push(x);
            if (f) g.borrador = f.id;
        });
        return Object.values(grupos).sort((a, b) => b.mes.localeCompare(a.mes));
    }, [horas, facturas, servicios]);
    const baseGrupo = (g) => g.horas.flatMap(lineasDesdeHoras).reduce((s, l) => s + redondear(l.cantidad * l.precio), 0) + g.servicios.reduce((s, x) => s + importeServicio(x), 0);
    const [rangoDesde, rangoHasta] = rangoDe(periodo, desde, hasta);
    // Sucursal: la del cliente (en real, la de la petición o la factura). Solo las que ve el usuario.
    const sucursalDe = (clienteId) => sucursalDeCliente(CLIENTES[clienteId].nombre);
    const enSucursal = (clienteId) => SUCURSALES_USUARIO.includes(sucursalDe(clienteId)) && (!filtroSucursal || sucursalDe(clienteId) === filtroSucursal);
    const textoPeticion = (petId) => `${petId} ${PETICIONES[petId].puesto}`;
    const porFacturarFiltrado = porFacturar
        .filter(g => enSucursal(g.cliente))
        .filter(g => !filtroCliente || g.cliente === filtroCliente)
        .filter(g => !filtroPeticion || g.horas.some(h => h.petId === filtroPeticion) || g.servicios.some(x => x.referencia === filtroPeticion))
        .filter(g => `${g.mes}-01` <= rangoHasta && finDeMes(g.mes) >= rangoDesde)
        .filter(g => { const q = normalizar(busqueda.trim()); return !q || normalizar([CLIENTES[g.cliente].nombre, nombreMes(g.mes), ...g.horas.map(h => textoPeticion(h.petId)), ...g.servicios.map(x => `${servicioDe(x.servicio).nombre} ${x.descripcion}`)].join(' ')).includes(q); });

    const lista = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        return facturas
            .filter(f => {
                const e = estadoDe(f).id;
                if (!filtroEstado) return true;
                if (filtroEstado === 'pendientes') return PENDIENTES_COBRO.includes(e);
                return e === filtroEstado;
            })
            .filter(f => enSucursal(f.cliente))
            .filter(f => !filtroCliente || f.cliente === filtroCliente)
            .filter(f => !filtroPeticion || peticionesDe(f).includes(filtroPeticion))
            .filter(f => fechaFiltro(f) >= rangoDesde && fechaFiltro(f) <= rangoHasta)
            .filter(f => !q || normalizar([f.numero || 'borrador', CLIENTES[f.cliente].nombre, f.periodo, /^\d{4}-\d{2}$/.test(f.periodo) ? nombreMes(f.periodo) : '', ...peticionesDe(f).map(textoPeticion), ...f.lineas.map(l => l.concepto)].join(' ')).includes(normalizar(q)))
            .sort((a, b) => (a.estado === 'borrador' ? -1 : b.estado === 'borrador' ? 1 : b.emision.localeCompare(a.emision)));
    }, [facturas, busqueda, filtroEstado, filtroCliente, filtroPeticion, filtroSucursal, rangoDesde, rangoHasta]);
    const deSucursal = facturas.filter(f => enSucursal(f.cliente));
    const pendientes = deSucursal.filter(f => PENDIENTES_COBRO.includes(estadoDe(f).id));
    const vencidas = deSucursal.filter(f => estadoDe(f).id === 'vencida');
    const suma = (l) => l.reduce((s, f) => s + totalesDe(f).pendiente, 0);
    const hayFiltros = busqueda || filtroEstado || filtroCliente || filtroPeticion || filtroSucursal || periodo !== 'anio';
    const limpiar = () => { setBusqueda(''); setFiltroEstado(''); setFiltroCliente(''); setFiltroPeticion(''); setFiltroSucursal(''); setPeriodo('anio'); setDesde(''); setHasta(''); };
    const etiqueta = (texto, icono) => <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600">{icono}{texto}</span>;
    const f = facturas.find(x => x.id === abierta);
    const emitidasLista = lista.filter(x => x.estado !== 'borrador');
    const exportarFacturas = () => {
        descargarCsv(`facturas_${hoyIso()}.csv`,
            ['Número', 'Tipo', 'Rectifica', 'Fecha de emisión', 'Vencimiento', 'Cliente', 'CIF', 'Sucursal', 'Periodo', 'Peticiones', 'Base imponible', 'IVA %', 'IVA', 'Retención', 'Total', 'Cobrado', 'Pendiente', 'Estado', 'Líneas'],
            emitidasLista.map(x => { const t = totalesDe(x); const c = CLIENTES[x.cliente]; return [x.numero, x.rectifica ? 'Rectificativa' : 'Factura', x.rectifica || '', fechaES(x.emision), x.rectifica ? '' : fechaES(x.vencimiento), c.nombre, c.cif, sucursal(sucursalDe(x.cliente)).nombre, /^\d{4}-\d{2}$/.test(x.periodo) ? nombreMes(x.periodo) : x.periodo, peticionesDe(x).join(', '), numExcel(t.base), c.iva, numExcel(t.iva), numExcel(t.retencion), numExcel(t.total), numExcel(t.cobrado), numExcel(t.pendiente), estadoDe(x).texto, x.detalle === 'persona' ? 'Por persona' : 'Por concepto']; }));
        setMenuExportar(false);
        showToast(`Excel con ${emitidasLista.length} facturas descargado`);
    };
    const exportarPersonas = () => {
        const filas = emitidasLista.flatMap(x => {
            const c = CLIENTES[x.cliente];
            const personas = personasDe(x);
            const otras = x.lineas.filter(l => !l.petId || !personas.some(p => p.petId === l.petId && p.mes === l.mes)).map(l => [x.numero, fechaES(x.emision), c.nombre, sucursal(sucursalDe(x.cliente)).nombre, l.petId || '', '', l.concepto, numExcel(l.cantidad), l.unidad, numExcel(l.precio), numExcel(l.cantidad * l.precio)]);
            return [...personas.flatMap(p => CONCEPTOS.filter(k => p.horas[k.id]).map(k => {
                const precio = redondear(PETICIONES[p.petId].tarifa * k.recargo);
                return [x.numero, fechaES(x.emision), c.nombre, sucursal(sucursalDe(x.cliente)).nombre, p.petId, p.nombre, `${mayus(k.texto)} · ${nombreMes(p.mes)}`, numExcel(p.horas[k.id]), 'h', numExcel(precio), numExcel(p.horas[k.id] * precio)];
            })), ...otras];
        });
        descargarCsv(`facturas_horas_por_persona_${hoyIso()}.csv`, ['Número', 'Fecha de emisión', 'Cliente', 'Sucursal', 'Petición', 'Persona', 'Concepto', 'Cantidad', 'Unidad', 'Precio', 'Importe'], filas);
        setMenuExportar(false);
        showToast(`Excel con ${filas.length} líneas descargado`);
    };
    const pdfFiltradas = () => {
        setMenuExportar(false);
        if (!descargarPdf(emitidasLista, `Facturas ${hoyIso()}`)) showToast('El navegador ha bloqueado la ventana: permite las ventanas emergentes para descargar el PDF');
    };
    const pdfFactura = (x) => {
        if (!descargarPdf([x], x.numero || 'Borrador')) showToast('El navegador ha bloqueado la ventana: permite las ventanas emergentes para descargar el PDF');
    };

    const prepararFactura = (g) => {
        if (g.borrador) {
            // Servicios registrados después de preparar el borrador: se añaden a él
            const fb = facturas.find(x => x.id === g.borrador);
            const faltanServicios = g.servicios.filter(x => !fb.lineas.some(l => l.servicio === x.id));
            if (faltanServicios.length) actualizar(fb.id, (x) => ({ lineas: [...x.lineas, ...faltanServicios.map(lineaDeServicio)] }), `${faltanServicios.length} ${faltanServicios.length === 1 ? 'servicio añadido' : 'servicios añadidos'} al borrador`);
            setAbierta(g.borrador);
            return;
        }
        const id = `borrador-${Date.now()}`;
        setFacturas(prev => [...prev, {
            id, numero: null, cliente: g.cliente, periodo: g.mes, emision: null, vencimiento: null, estado: 'borrador', detalle: CLIENTES[g.cliente].detalle,
            lineas: [...g.horas.flatMap(lineasDesdeHoras), ...g.servicios.map(lineaDeServicio)], cobros: [], historial: [{ fecha: hoyIso(), texto: `Borrador preparado con las horas de Horas e incidencias, ${CLIENTES[g.cliente].detalle === 'persona' ? 'por persona' : 'por concepto'} como quiere el cliente` }],
        }]);
        setAbierta(id);
    };
    const abrirServicio = (cliente = '', enFactura = null) => {
        const sv = SERVICIOS_INICIALES.find(x => x.activo);
        setNuevoServicio({ cliente, enFactura, servicio: sv.id, fecha: hoyIso(), descripcion: '', referencia: '', cantidad: 1, precio: sv.valor, salario: '', porcentaje: sv.valor });
    };
    const guardarServicio = () => {
        const n = nuevoServicio;
        const sv = servicioDe(n.servicio);
        const x = { id: `s-${Date.now()}`, cliente: n.cliente, servicio: n.servicio, fecha: n.fecha, descripcion: n.descripcion.trim() || sv.nombre, referencia: n.referencia.trim(),
            ...(sv.cobro === 'porcentaje' ? { salario: Number(n.salario), porcentaje: Number(n.porcentaje) } : { cantidad: Number(n.cantidad), precio: Number(n.precio) }) };
        setServicios(prev => [...prev, x]);
        if (n.enFactura) actualizar(n.enFactura, (fx) => ({ lineas: [...fx.lineas, lineaDeServicio(x)] }), `Servicio añadido: ${sv.nombre}`);
        else showToast(`Servicio registrado: saldrá en «Por facturar» de ${nombreMes(n.fecha.slice(0, 7))}`);
        setNuevoServicio(null);
    };
    const crearFacturaManual = () => {
        const id = `borrador-${Date.now()}`;
        setFacturas(prev => [...prev, {
            id, numero: null, cliente: nuevaFactura.cliente, periodo: hoyIso().slice(0, 7), emision: null, vencimiento: null, estado: 'borrador', detalle: 'concepto',
            lineas: [], cobros: [], historial: [{ fecha: hoyIso(), texto: 'Factura nueva, sin horas: líneas y servicios añadidos a mano' }],
        }]);
        setNuevaFactura(null);
        setAbierta(id);
    };
    const horasDe = (fac) => horas.filter(h => fac.lineas.some(l => l.petId === h.petId && l.mes === h.mes));
    const simularHorasValidadas = (fac) => {
        setHoras(prev => prev.map(h => (fac.lineas.some(l => l.petId === h.petId && l.mes === h.mes) ? { ...h, listo: true, partesPendientes: 0 } : h)));
        actualizar(fac.id, {}, 'El cliente ha validado todas las horas del mes: ya se puede emitir');
    };
    const emitir = () => {
        const numero = `F2026-${String(siguiente.F).padStart(4, '0')}`;
        setSiguiente(s => ({ ...s, F: s.F + 1 }));
        actualizar(f.id, { numero, estado: 'emitida', emision: hoyIso(), vencimiento: vencimientoDe(CLIENTES[f.cliente], hoyIso()) }, `Factura ${numero} emitida. Ya no se puede cambiar.`);
    };
    const confirmarCobro = () => {
        actualizar(f.id, (x) => ({ cobros: [...x.cobros, { fecha: cobro.fecha, importe: redondear(Number(cobro.importe)), nota: cobro.nota }] }),
            `Cobro de ${euros(Number(cobro.importe))} registrado en ${f.numero}`);
        setCobro(null);
    };
    const confirmarRectificacion = () => {
        const numero = `R2026-${String(siguiente.R).padStart(4, '0')}`;
        setSiguiente(s => ({ ...s, R: s.R + 1 }));
        const nuevas = [{
            id: numero, numero, cliente: f.cliente, periodo: f.periodo, emision: hoyIso(), vencimiento: hoyIso(), estado: 'emitida', rectifica: f.numero,
            motivo: rectificar.motivo, detalle: f.detalle, lineas: f.lineas.map(l => ({ ...l, cantidad: -l.cantidad })), cobros: [],
            historial: [{ fecha: hoyIso(), texto: `Rectificativa de ${f.numero}: ${rectificar.motivo.toLowerCase()}${rectificar.nota ? `. ${rectificar.nota}` : ''}` }],
        }];
        if (rectificar.nueva) {
            nuevas.push({
                id: `borrador-${Date.now()}`, numero: null, cliente: f.cliente, periodo: f.periodo, emision: null, vencimiento: null, estado: 'borrador', detalle: f.detalle,
                lineas: f.lineas.map(l => ({ ...l })), cobros: [], historial: [{ fecha: hoyIso(), texto: `Borrador para sustituir a ${f.numero}` }],
            });
        }
        setFacturas(prev => [...prev.map(x => (x.id === f.id ? { ...x, anulada: numero, historial: [...x.historial, { fecha: hoyIso(), texto: `Anulada por la rectificativa ${numero}` }] } : x)), ...nuevas]);
        showToast(`Rectificativa ${numero} emitida${rectificar.nueva ? ' y borrador nuevo preparado' : ''}`);
        setRectificar(null);
        setAbierta(rectificar.nueva ? nuevas[1].id : numero);
    };

    return (
        <>
            <Page>
                <PageHeader
                    title="Facturación"
                    count={pendientes.length}
                    subtitle="Las horas validadas de cada mes y los servicios hechos (selección, formación...) se convierten en la factura al cliente. Aquí se emite, se envía y se sigue el cobro."
                    actions={<>
                        <Button icon={BriefcaseBusiness} onClick={() => abrirServicio(filtroCliente)}>Añadir servicio a facturar</Button>
                        <Button variant="primary" icon={FilePlus2} onClick={() => setNuevaFactura({ cliente: filtroCliente || '' })}>Nueva factura</Button>
                    </>}
                />

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <KpiTile label="Por facturar" tone="accent" value={porFacturar.filter(g => !g.borrador).length} hint="Meses con horas o servicios sin factura" onClick={() => document.getElementById('por-facturar')?.scrollIntoView({ behavior: 'smooth' })} />
                    <KpiTile label="En borrador" value={facturas.filter(x => x.estado === 'borrador').length} hint="Por revisar y emitir" active={filtroEstado === 'borrador'} onClick={() => setFiltroEstado('borrador')} />
                    <KpiTile label="Pendiente de cobro" tone="info" value={euros(suma(pendientes))} hint={`${pendientes.length} ${pendientes.length === 1 ? 'factura' : 'facturas'}`} active={filtroEstado === 'pendientes'} onClick={() => setFiltroEstado('pendientes')} />
                    <KpiTile label="Vencidas" tone="danger" value={euros(suma(vencidas))} hint={`${vencidas.length} ${vencidas.length === 1 ? 'factura' : 'facturas'}`} active={filtroEstado === 'vencida'} onClick={() => setFiltroEstado('vencida')} />
                </div>

                {/* FILTROS: los mismos que en Horas e incidencias, para «Por facturar» y para las facturas */}
                <Card className="p-3">
                    <div className="flex flex-wrap items-end gap-3">
                        <label className="flex flex-col gap-1 min-w-[200px] flex-1 sm:flex-none sm:w-64">
                            {etiqueta('Buscar')}
                            <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Número, cliente, petición o puesto..." />
                        </label>
                        {veVariasSucursales && (
                            <label className="flex flex-col gap-1 min-w-[200px] flex-1 sm:flex-none">
                                {etiqueta('Sucursal')}
                                <Select value={filtroSucursal} onChange={(e) => { const v = e.target.value; setFiltroSucursal(v); if (filtroCliente && v && sucursalDe(filtroCliente) !== v) { setFiltroCliente(''); setFiltroPeticion(''); } }} aria-label="Sucursal">
                                    <option value="">Todas las sucursales</option>
                                    {SUCURSALES.filter(x => SUCURSALES_USUARIO.includes(x.id)).map(x => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                                </Select>
                            </label>
                        )}
                        <label className="flex flex-col gap-1 min-w-[220px] flex-1 sm:flex-none">
                            {etiqueta('Cliente', <Building2 className="w-3.5 h-3.5 text-slate-400" />)}
                            <Select value={filtroCliente} onChange={(e) => { setFiltroCliente(e.target.value); setFiltroPeticion(''); }} aria-label="Cliente">
                                <option value="">Todos los clientes</option>
                                {Object.entries(CLIENTES).filter(([id]) => enSucursal(id)).map(([id, c]) => { const n = facturas.filter(x => x.cliente === id).length; return <option key={id} value={id}>{c.nombre} · {n} {n === 1 ? 'factura' : 'facturas'}</option>; })}
                            </Select>
                        </label>
                        {filtroCliente && (
                            <label className="flex flex-col gap-1 min-w-[220px] flex-1 sm:flex-none">
                                {etiqueta('Petición')}
                                <Select value={filtroPeticion} onChange={(e) => setFiltroPeticion(e.target.value)} aria-label="Petición">
                                    <option value="">Todas las peticiones del cliente</option>
                                    {Object.entries(PETICIONES).filter(([, p]) => p.cliente === filtroCliente).map(([id, p]) => <option key={id} value={id}>{id} · {p.puesto}</option>)}
                                </Select>
                            </label>
                        )}
                        <label className="flex flex-col gap-1">
                            {etiqueta('Fecha de emisión', <CalendarDays className="w-3.5 h-3.5 text-slate-400" />)}
                            <Select value={periodo} onChange={(e) => setPeriodo(e.target.value)} aria-label="Periodo">
                                {PERIODOS.map(p => <option key={p.id} value={p.id}>{p.texto}</option>)}
                            </Select>
                        </label>
                        {periodo === 'fechas' && <>
                            <label className="flex flex-col gap-1">{etiqueta('Desde')}<TextInput type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-auto!" /></label>
                            <label className="flex flex-col gap-1">{etiqueta('Hasta')}<TextInput type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-auto!" /></label>
                        </>}
                        <label className="flex flex-col gap-1">
                            {etiqueta('Estado')}
                            <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} aria-label="Estado">
                                <option value="">Todos los estados</option>
                                <option value="borrador">Borrador</option>
                                <option value="pendientes">Pendientes de cobro (todas)</option>
                                <option value="vencida">Vencidas</option>
                                <option value="cobrada">Cobradas</option>
                                <option value="anulada">Anuladas</option>
                                <option value="rectificativa">Rectificativas</option>
                            </Select>
                        </label>
                        {hayFiltros && <Button size="sm" variant="ghost" icon={X} onClick={limpiar}>Limpiar</Button>}
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">{rangoDesde > '0000-01-01' ? `Del ${fechaES(rangoDesde)}` : 'Desde el principio'}{rangoHasta < '9999-12-31' ? ` al ${fechaES(rangoHasta)}` : ''}. Los borradores cuentan por el mes que facturan.</p>
                </Card>

                {/* POR SUCURSAL: facturado, pendiente y por facturar de cada una (con los filtros de fechas y cliente) */}
                {veVariasSucursales && !filtroSucursal && (
                    <Card className="overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-slate-200 text-xs font-semibold text-slate-900">Facturación por sucursal</div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                                        <th className="py-2 px-3 font-medium">Sucursal</th>
                                        <th className="py-2 px-3 font-medium text-right">Facturas</th>
                                        <th className="py-2 px-3 font-medium text-right">Facturado</th>
                                        <th className="py-2 px-3 font-medium text-right">Pendiente de cobro</th>
                                        <th className="py-2 px-3 font-medium text-right">Vencido</th>
                                        <th className="py-2 px-3 font-medium text-right">Por facturar (base)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {SUCURSALES.filter(x => SUCURSALES_USUARIO.includes(x.id)).map(su => {
                                        const fs = lista.filter(x => sucursalDe(x.cliente) === su.id && x.estado !== 'borrador' && !x.anulada);
                                        const pf = porFacturarFiltrado.filter(g => sucursalDe(g.cliente) === su.id);
                                        const pendiente = fs.filter(x => PENDIENTES_COBRO.includes(estadoDe(x).id)).reduce((s, x) => s + totalesDe(x).pendiente, 0);
                                        const vencido = fs.filter(x => estadoDe(x).id === 'vencida').reduce((s, x) => s + totalesDe(x).pendiente, 0);
                                        const porFacturarBase = pf.reduce((s, g) => s + baseGrupo(g), 0);
                                        return (
                                            <tr key={su.id} onClick={() => setFiltroSucursal(su.id)} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer" title={`Ver solo ${su.nombre}`}>
                                                <td className="py-2.5 px-3 font-medium text-slate-900">{su.nombre}</td>
                                                <td className="py-2.5 px-3 text-right text-slate-700">{fs.length}</td>
                                                <td className="py-2.5 px-3 text-right text-slate-900 whitespace-nowrap">{euros(fs.reduce((s, x) => s + totalesDe(x).total, 0))}</td>
                                                <td className="py-2.5 px-3 text-right text-slate-700 whitespace-nowrap">{euros(pendiente)}</td>
                                                <td className={`py-2.5 px-3 text-right whitespace-nowrap ${vencido ? 'text-rose-700' : 'text-slate-400'}`}>{euros(vencido)}</td>
                                                <td className="py-2.5 px-3 text-right text-slate-700 whitespace-nowrap">{euros(porFacturarBase)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <p className="px-4 py-2 text-[11px] text-slate-500 border-t border-slate-100">Con las fechas y el cliente elegidos. Pulsa una sucursal para ver solo sus facturas.</p>
                    </Card>
                )}

                {/* POR FACTURAR */}
                <div id="por-facturar" className="space-y-2">
                    <SectionTitle>Por facturar</SectionTitle>
                    {porFacturarFiltrado.length === 0 ? (
                        <Card className="p-4 text-xs text-slate-500">{porFacturar.length ? 'No hay horas por facturar con estos filtros.' : 'No hay horas pendientes de facturar.'}</Card>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {porFacturarFiltrado.map(g => {
                                const cliente = CLIENTES[g.cliente];
                                const listo = g.horas.every(h => h.listo);
                                const faltan = g.horas.reduce((s, h) => s + (h.partesPendientes || 0), 0);
                                const total = g.horas.reduce((s, h) => s + Object.values(h.horas).reduce((a, b) => a + b, 0), 0);
                                const soloServicios = g.horas.length === 0;
                                return (
                                    <Card key={`${g.cliente}|${g.mes}`} className="p-4 space-y-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <div className="text-sm font-medium text-slate-900">{cliente.nombre}</div>
                                                <div className="text-[11px] text-slate-500">{mayus(nombreMes(g.mes))}{g.horas.length > 0 && ` · ${g.horas.map(h => `${h.petId} (${PETICIONES[h.petId].puesto.toLowerCase()})`).join(', ')}`}</div>
                                            </div>
                                            <Badge tone={g.borrador ? 'neutral' : listo ? 'success' : 'warning'} dot>{g.borrador ? 'En borrador' : soloServicios ? 'Servicios' : listo ? 'Horas validadas' : 'Esperando horas'}</Badge>
                                        </div>
                                        {g.servicios.length > 0 && (
                                            <ul className="space-y-1 text-xs">
                                                {g.servicios.map(x => (
                                                    <li key={x.id} className="flex items-start justify-between gap-2 rounded-md bg-slate-50 px-2.5 py-1.5">
                                                        <span className="flex items-start gap-1.5 min-w-0"><BriefcaseBusiness className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" /><span className="min-w-0"><span className="text-slate-800">{servicioDe(x.servicio).nombre}</span><span className="block text-[11px] text-slate-500 truncate">{x.descripcion} · {fechaES(x.fecha)}</span></span></span>
                                                        <span className="text-slate-900 whitespace-nowrap">{euros(importeServicio(x))}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        <div className="text-xs text-slate-700">
                                            {g.horas.length > 0 && <>{num(total)} h{g.servicios.length > 0 && ` + ${g.servicios.length} ${g.servicios.length === 1 ? 'servicio' : 'servicios'}`} · </>}{euros(baseGrupo(g))} de base{g.horas.length > 0 ? ' con las tarifas del presupuesto' : ''}
                                            {!listo && <span className="block text-amber-700 mt-0.5">Faltan {faltan} partes por validar en Horas e incidencias. Puedes preparar el borrador, pero no emitirlo.</span>}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Button size="sm" variant={listo || g.borrador ? 'primary' : 'secondary'} icon={Receipt} onClick={() => prepararFactura(g)}>
                                                {g.borrador ? 'Ver borrador' : listo ? 'Preparar factura' : 'Preparar borrador'}
                                            </Button>
                                            {!listo && <Button size="sm" variant="ghost" icon={ArrowUpRight} onClick={() => { window.location.hash = '#/horas'; }}>Horas e incidencias</Button>}
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* SERVICIOS REGISTRADOS: los hechos, con en qué factura están */}
                {(() => {
                    const lista = servicios.filter(x => enSucursal(x.cliente) && (!filtroCliente || x.cliente === filtroCliente)).sort((a, b) => b.fecha.localeCompare(a.fecha));
                    return (
                        <div className="space-y-2">
                            <SectionTitle actions={<Button size="sm" icon={Plus} onClick={() => abrirServicio(filtroCliente)}>Añadir servicio a facturar</Button>}>Servicios (además de las horas)</SectionTitle>
                            {lista.length === 0 ? <Card className="p-4 text-xs text-slate-500">No hay servicios registrados con estos filtros.</Card> : (
                                <Card className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                                                <th className="py-2 px-3 font-medium">Fecha</th>
                                                <th className="py-2 px-3 font-medium">Cliente</th>
                                                <th className="py-2 px-3 font-medium">Servicio</th>
                                                <th className="py-2 px-3 font-medium text-right">Importe</th>
                                                <th className="py-2 px-3 font-medium">Factura</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lista.map(x => {
                                                const fx = facturaDeServicio(x);
                                                return (
                                                    <tr key={x.id} className="border-b border-slate-100 last:border-0">
                                                        <td className="py-2 px-3 whitespace-nowrap text-slate-700">{fechaES(x.fecha)}</td>
                                                        <td className="py-2 px-3 text-slate-800">{CLIENTES[x.cliente].nombre}</td>
                                                        <td className="py-2 px-3"><span className="text-slate-900">{servicioDe(x.servicio).nombre}</span><span className="block text-[11px] text-slate-500">{x.descripcion}{x.referencia ? ` · ${x.referencia}` : ''}{x.salario != null ? ` · ${num(x.porcentaje)} % de ${euros(x.salario)}` : ` · ${num(x.cantidad)} × ${euros(x.precio)}`}</span></td>
                                                        <td className="py-2 px-3 text-right whitespace-nowrap text-slate-900">{euros(importeServicio(x))}</td>
                                                        <td className="py-2 px-3 whitespace-nowrap">
                                                            {!fx ? <Badge tone="warning" dot>Por facturar</Badge>
                                                                : fx.estado === 'borrador' ? <button type="button" onClick={() => setAbierta(fx.id)}><Badge tone="neutral" dot>En borrador</Badge></button>
                                                                    : <button type="button" onClick={() => setAbierta(fx.id)} className="text-indigo-700 hover:underline">Facturado en {fx.numero}</button>}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </Card>
                            )}
                        </div>
                    );
                })()}

                {/* FACTURAS, agrupadas por cliente */}
                <SectionTitle actions={
                    <span className="relative">
                        <Button size="sm" icon={Download} disabled={!emitidasLista.length} onClick={() => setMenuExportar(m => !m)}>Descargar ({emitidasLista.length})</Button>
                        {menuExportar && (
                            <span className="absolute right-0 z-20 mt-1 w-72 rounded-lg border border-slate-200 bg-white shadow-lg py-1 text-xs block">
                                <button type="button" onClick={exportarFacturas} className="w-full text-left px-3 py-2 hover:bg-slate-50 flex gap-2"><FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" /><span><span className="block font-medium text-slate-900">Excel: una fila por factura</span><span className="text-slate-500">Número, fechas, cliente, sucursal, base, IVA, total y cobro</span></span></button>
                                <button type="button" onClick={exportarPersonas} className="w-full text-left px-3 py-2 hover:bg-slate-50 flex gap-2"><FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" /><span><span className="block font-medium text-slate-900">Excel: líneas y horas por persona</span><span className="text-slate-500">Una fila por persona y concepto, con su importe</span></span></button>
                                <button type="button" onClick={pdfFiltradas} className="w-full text-left px-3 py-2 hover:bg-slate-50 flex gap-2 border-t border-slate-100"><Printer className="w-4 h-4 text-indigo-600 shrink-0" /><span><span className="block font-medium text-slate-900">PDF de todas</span><span className="text-slate-500">Las facturas emitidas de la lista, una por página</span></span></button>
                            </span>
                        )}
                    </span>
                }>Facturas</SectionTitle>
                <p className="-mt-2 text-[11px] text-slate-500">Se descargan las facturas emitidas que se ven con los filtros de arriba, por ejemplo las de un mes para la gestoría o la contabilidad.</p>
                {lista.length === 0 ? (
                    <Card><EmptyState icon={Receipt} title="No hay facturas con estos filtros" action={hayFiltros && <Button onClick={limpiar}>Limpiar filtros</Button>} /></Card>
                ) : Object.keys(CLIENTES).filter(c => lista.some(x => x.cliente === c)).map(c => {
                    const delCliente = lista.filter(x => x.cliente === c);
                    const plegado = plegados.includes(c);
                    const totalCliente = delCliente.filter(x => x.estado !== 'borrador' && !x.anulada).reduce((s, x) => s + totalesDe(x).total, 0);
                    const pendienteCliente = delCliente.filter(x => PENDIENTES_COBRO.includes(estadoDe(x).id)).reduce((s, x) => s + totalesDe(x).pendiente, 0);
                    const vencidasCliente = delCliente.filter(x => estadoDe(x).id === 'vencida').length;
                    return (
                        <Card key={c} className="overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setPlegados(prev => (prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]))}
                                aria-expanded={!plegado}
                                className={`w-full flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50 ${plegado ? '' : 'border-b border-slate-200'}`}
                            >
                                <span className="flex items-center gap-2 min-w-0">
                                    <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${plegado ? '-rotate-90' : ''}`} />
                                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                                    <span className="text-sm font-semibold text-slate-900">{CLIENTES[c].nombre}</span>
                                    {veVariasSucursales && <Badge tone="neutral">{sucursal(sucursalDe(c)).corto}</Badge>}
                                </span>
                                <span className="text-xs text-slate-500">
                                    {delCliente.length} {delCliente.length === 1 ? 'factura' : 'facturas'} · {euros(totalCliente)} facturado · {euros(pendienteCliente)} pendiente
                                    {vencidasCliente > 0 && <span className="text-rose-700"> · {vencidasCliente} {vencidasCliente === 1 ? 'vencida' : 'vencidas'}</span>}
                                </span>
                            </button>
                            {!plegado && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                                                <th className="py-2 px-3 font-medium">Número</th>
                                                <th className="py-2 px-3 font-medium">Periodo y peticiones</th>
                                                <th className="py-2 px-3 font-medium">Emisión</th>
                                                <th className="py-2 px-3 font-medium">Vencimiento</th>
                                                <th className="py-2 px-3 font-medium text-right">Total</th>
                                                <th className="py-2 px-3 font-medium text-right">Pendiente</th>
                                                <th className="py-2 px-3 font-medium">Estado</th>
                                                <th className="py-2 px-2" aria-label="Descargar"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {delCliente.map(x => {
                                                const tt = totalesDe(x);
                                                const e = estadoDe(x);
                                                const d = x.vencimiento ? diasEntre(hoyIso(), x.vencimiento) : null;
                                                const pets = peticionesDe(x);
                                                return (
                                                    <tr key={x.id} onClick={() => setAbierta(x.id)} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer">
                                                        <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-900">{x.numero || <span className="text-slate-500">Borrador</span>}</td>
                                                        <td className="py-2.5 px-3">
                                                            <span className="block text-slate-800">{/^\d{4}-\d{2}$/.test(x.periodo) ? mayus(nombreMes(x.periodo)) : x.periodo}{x.rectifica ? ` · rectifica ${x.rectifica}` : ''}</span>
                                                            <span className="text-[11px] text-slate-500">{pets.length ? pets.map(p => `${p} · ${PETICIONES[p].puesto}`).join(', ') : 'Sin petición (líneas manuales)'}</span>
                                                        </td>
                                                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">{fechaES(x.emision)}</td>
                                                        <td className="py-2.5 px-3 whitespace-nowrap">
                                                            <div className="text-slate-700">{x.rectifica ? '—' : fechaES(x.vencimiento)}</div>
                                                            {PENDIENTES_COBRO.includes(e.id) && d != null && <div className={`text-[11px] ${d < 0 ? 'text-rose-700' : 'text-slate-500'}`}>{d < 0 ? `hace ${-d} días` : d === 0 ? 'hoy' : `en ${d} días`}</div>}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right whitespace-nowrap text-slate-900">{euros(tt.total)}</td>
                                                        <td className="py-2.5 px-3 text-right whitespace-nowrap text-slate-700">{PENDIENTES_COBRO.includes(e.id) ? euros(tt.pendiente) : <span className="text-slate-300">—</span>}</td>
                                                        <td className="py-2.5 px-3"><Badge tone={e.tono} dot>{e.texto}</Badge></td>
                                                        <td className="py-1 px-2 text-right" onClick={(ev) => ev.stopPropagation()}>{x.estado !== 'borrador' && <IconButton icon={Download} title={`Descargar ${x.numero} en PDF`} onClick={() => pdfFactura(x)} />}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Card>
                    );
                })}
                <Notice tone="neutral" icon={Info}>Las tarifas son las del presupuesto aceptado de cada petición. El coste y el margen solo se ven en Presupuestos.</Notice>
            </Page>

            {/* FICHA DE LA FACTURA */}
            {f && (() => {
                const cliente = CLIENTES[f.cliente];
                const t = totalesDe(f);
                const e = estadoDe(f);
                const borrador = f.estado === 'borrador';
                const hs = horasDe(f);
                const horasListas = hs.every(h => h.listo);
                const faltan = hs.reduce((s, h) => s + (h.partesPendientes || 0), 0);
                const vencimientoPrevisto = f.vencimiento || vencimientoDe(cliente, hoyIso());
                const diasVencida = f.vencimiento ? diasEntre(f.vencimiento, hoyIso()) : 0;
                const cobrable = PENDIENTES_COBRO.includes(e.id);
                return (
                    <Drawer
                        onClose={() => setAbierta(null)}
                        width="max-w-3xl"
                        title={f.numero ? `Factura ${f.numero}` : 'Borrador de factura'}
                        status={<Badge tone={e.tono} dot>{e.texto}</Badge>}
                        subtitle={`${cliente.nombre} · ${/^\d{4}-\d{2}$/.test(f.periodo) ? mayus(nombreMes(f.periodo)) : f.periodo}`}
                        footer={<>
                            {borrador && <Button variant="ghost" icon={Trash2} className="mr-auto text-rose-600!" onClick={() => setDescartar(true)}>Descartar borrador</Button>}
                            {!borrador && !f.rectifica && !f.anulada && <Button variant="ghost" icon={FileMinus2} className="mr-auto" onClick={() => setRectificar({ motivo: MOTIVOS_RECTIFICACION[0], nota: '', nueva: true })}>Rectificar</Button>}
                            <Button icon={Eye} onClick={() => setPrevia(true)}>Vista previa</Button>
                            {!borrador && <Button icon={Download} onClick={() => pdfFactura(f)}>Descargar PDF</Button>}
                            {borrador && <Button variant="primary" icon={FileCheck2} disabled={!horasListas || !f.lineas.length} title={horasListas ? undefined : 'Faltan horas por validar'} onClick={emitir}>Emitir factura</Button>}
                            {f.estado === 'emitida' && !f.rectifica && <Button variant="primary" icon={Send} onClick={() => actualizar(f.id, { estado: 'enviada' }, `Factura ${f.numero} enviada a ${cliente.email}`)}>Enviar al cliente</Button>}
                            {f.rectifica && f.estado === 'emitida' && <Button variant="primary" icon={Send} onClick={() => actualizar(f.id, { estado: 'enviada' }, `Rectificativa ${f.numero} enviada a ${cliente.email}`)}>Enviar al cliente</Button>}
                            {cobrable && f.estado !== 'emitida' && <Button variant="primary" icon={Wallet} onClick={() => setCobro({ fecha: hoyIso(), importe: t.pendiente, nota: '' })}>Registrar cobro</Button>}
                        </>}
                    >
                        <div className="space-y-5 text-xs">
                            {borrador && !horasListas && (
                                <Notice tone="warning" icon={Clock}>
                                    <span className="flex flex-wrap items-center justify-between gap-2">
                                        <span>Faltan {faltan} partes por validar en Horas e incidencias. Las horas pueden cambiar y la factura no se puede emitir todavía.</span>
                                        <Button size="sm" title="En la demo simula que el cliente valida los partes" onClick={() => simularHorasValidadas(f)}>Simular horas validadas</Button>
                                    </span>
                                </Notice>
                            )}
                            {borrador && horasListas && <Notice tone="info" icon={Info}>Revisa las líneas y emite la factura. Al emitirla se le da número y ya no se puede cambiar; para corregirla habría que hacer una rectificativa.</Notice>}
                            {e.id === 'vencida' && (
                                <Notice tone="danger" icon={AlertTriangle}>
                                    <span className="flex flex-wrap items-center justify-between gap-2">
                                        <span>Vencida hace {diasVencida} días. Quedan {euros(t.pendiente)} por cobrar.</span>
                                        <Button size="sm" icon={BellRing} onClick={() => actualizar(f.id, {}, `Recordatorio de pago de ${f.numero} enviado a ${cliente.email}`)}>Recordar al cliente</Button>
                                    </span>
                                </Notice>
                            )}
                            {f.anulada && <Notice tone="neutral" icon={Undo2}>Anulada por la rectificativa {f.anulada}.</Notice>}
                            {f.rectifica && <Notice tone="neutral" icon={FileMinus2}>Rectifica la factura {f.rectifica}: {f.motivo.toLowerCase()}. Si ya estaba cobrada, el importe se devuelve o se compensa en la siguiente.</Notice>}

                            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2"><dt className="text-[11px] text-slate-500">Cliente</dt><dd className="text-slate-900">{cliente.nombre} · CIF {cliente.cif}<span className="block text-slate-500">{cliente.direccion}</span></dd></div>
                                <div><dt className="text-[11px] text-slate-500">Se envía a</dt><dd className="text-slate-900 break-all">{cliente.email}</dd></div>
                                <div><dt className="text-[11px] text-slate-500">Emisión</dt><dd className="text-slate-900">{f.emision ? fechaES(f.emision) : 'Al emitirla'}</dd></div>
                                <div><dt className="text-[11px] text-slate-500">Forma de pago</dt><dd className="text-slate-900">{cliente.pago}{cliente.diasFijos.length ? ` · días ${cliente.diasFijos.join(' y ')}` : ''}</dd></div>
                                <div><dt className="text-[11px] text-slate-500">Vencimiento</dt><dd className="text-slate-900">{f.rectifica ? '—' : `${fechaES(vencimientoPrevisto)}${f.vencimiento ? '' : ' (si se emite hoy)'}`}</dd></div>
                            </dl>
                            {cliente.fichaIncompleta && (
                                <Notice tone="warning" icon={Building2}>
                                    <span className="flex flex-wrap items-center justify-between gap-2">
                                        <span>La ficha del cliente tiene datos de facturación sin completar. {cliente.fichaIncompleta} No impide facturar por transferencia.</span>
                                        <Button size="sm" icon={ArrowUpRight} onClick={() => { window.location.hash = '#/empresas'; }}>Ficha del cliente</Button>
                                    </span>
                                </Notice>
                            )}

                            {/* LÍNEAS */}
                            <div className="space-y-2">
                                <SectionTitle actions={<span className="flex flex-wrap items-center gap-2">
                                    {personasDe(f).length > 0 && (borrador
                                        ? <span className="inline-flex rounded-lg bg-slate-100 p-0.5 text-[11px]" role="group" aria-label="Cómo salen las líneas">
                                            {[['concepto', 'Por concepto'], ['persona', 'Por persona']].map(([id, texto]) => {
                                                const activo = (f.detalle === 'persona' ? 'persona' : 'concepto') === id;
                                                return <button key={id} type="button" aria-pressed={activo} onClick={() => !activo && actualizar(f.id, { detalle: id }, id === 'persona' ? 'Las líneas salen por persona' : 'Las líneas salen por concepto')} className={`px-2.5 py-1 rounded-md ${activo ? 'bg-white shadow-xs text-slate-900 font-medium' : 'text-slate-600 hover:text-slate-900'}`}>{texto}</button>;
                                            })}
                                        </span>
                                        : <Badge tone="neutral">{f.detalle === 'persona' ? 'Líneas por persona' : 'Líneas por concepto'}</Badge>)}
                                    {borrador && personasDe(f).length > 0 && (f.detalle === 'persona' ? 'persona' : 'concepto') !== (cliente.detalle || 'concepto') && <span className="text-[11px] text-amber-700">El cliente las quiere {cliente.detalle === 'persona' ? 'por persona' : 'por concepto'}</span>}
                                    {borrador && <Button size="sm" icon={BriefcaseBusiness} onClick={() => abrirServicio(f.cliente, f.id)}>Añadir servicio</Button>}
                                    {borrador && <Button size="sm" icon={Plus} onClick={() => setLinea({ concepto: '', cantidad: 1, precio: '' })}>Añadir línea</Button>}
                                </span>}>Líneas</SectionTitle>
                                <div className="overflow-x-auto rounded-lg border border-slate-200">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                                                <th className="py-2 px-3 font-medium">Concepto</th>
                                                <th className="py-2 px-3 font-medium text-right">Cantidad</th>
                                                <th className="py-2 px-3 font-medium text-right">Precio</th>
                                                <th className="py-2 px-3 font-medium text-right">Importe</th>
                                                {borrador && <th className="py-2 px-2" aria-label="Acciones"></th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lineasDe(f).map(l => (
                                                <tr key={l.id} className="border-b border-slate-100 last:border-0">
                                                    <td className="py-2 px-3 text-slate-800">{l.concepto}{l.manual && <span className="block text-[11px] text-slate-500">Línea manual</span>}{l.servicio && <span className="block text-[11px] text-indigo-600">Servicio</span>}</td>
                                                    <td className="py-2 px-3 text-right whitespace-nowrap">{num(l.cantidad)} {l.unidad}</td>
                                                    <td className="py-2 px-3 text-right whitespace-nowrap">{euros(l.precio)}</td>
                                                    <td className="py-2 px-3 text-right whitespace-nowrap text-slate-900">{euros(redondear(l.cantidad * l.precio))}</td>
                                                    {borrador && <td className="py-1 px-2 text-right">{(l.manual || l.servicio) && <IconButton icon={Trash2} title={l.servicio ? 'Quitar de esta factura (el servicio vuelve a «Por facturar»)' : 'Quitar línea'} onClick={() => setLineaAEliminar(l)} />}</td>}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {f.lineas.some(l => l.petId) && <p className="text-[11px] text-slate-500">Horas de Horas e incidencias por la tarifa del presupuesto ({[...new Set(f.lineas.filter(l => l.petId).map(l => `${PETICIONES[l.petId].presupuesto}: ${euros(PETICIONES[l.petId].tarifa)}/h`))].join(', ')}). Recargos: extra y fin de semana × 1,5; nocturna × 1,25; festiva × 1,75.</p>}
                                <dl className="ml-auto w-full sm:w-72 space-y-1">
                                    <div className="flex justify-between"><dt className="text-slate-500">Base imponible</dt><dd>{euros(t.base)}</dd></div>
                                    <div className="flex justify-between"><dt className="text-slate-500">IVA ({cliente.iva} %)</dt><dd>{euros(t.iva)}</dd></div>
                                    {cliente.retencion > 0 && <div className="flex justify-between"><dt className="text-slate-500">Retención ({cliente.retencion} %)</dt><dd>−{euros(t.retencion)}</dd></div>}
                                    <div className="flex justify-between border-t border-slate-200 pt-1 text-sm"><dt className="font-medium text-slate-900">Total</dt><dd className="font-medium text-slate-900">{euros(t.total)}</dd></div>
                                    {t.cobrado !== 0 && <div className="flex justify-between text-emerald-700"><dt>Cobrado</dt><dd>{euros(t.cobrado)}</dd></div>}
                                    {cobrable && <div className="flex justify-between"><dt className="text-slate-500">Pendiente</dt><dd className="text-slate-900">{euros(t.pendiente)}</dd></div>}
                                </dl>
                            </div>

                            {/* DESGLOSE POR PERSONA: las horas de cada candidato que suman las líneas */}
                            {personasDe(f).length > 0 && (() => {
                                const filas = personasDe(f);
                                const usados = CONCEPTOS.filter(c => filas.some(p => p.horas[c.id]));
                                const importe = (p) => redondear(usados.reduce((s, c) => s + redondear((p.horas[c.id] || 0) * redondear(PETICIONES[p.petId].tarifa * c.recargo)), 0));
                                const conDiferencia = filas.filter(p => p.validadas);
                                return (
                                    <div className="space-y-2">
                                        <SectionTitle>Desglose por persona</SectionTitle>
                                        <p className="text-[11px] text-slate-500 -mt-1">Las horas de cada persona en sus partes de Horas e incidencias, por la tarifa del presupuesto.{f.detalle !== 'persona' && ' Si el cliente lo quiere en la factura, elige «Por persona» en las líneas (o sale como anexo en la vista previa).'}</p>
                                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                                                        <th className="py-2 px-3 font-medium">Persona</th>
                                                        {usados.map(c => <th key={c.id} className="py-2 px-3 font-medium text-right whitespace-nowrap">{mayus(c.texto.replace('horas ', ''))}</th>)}
                                                        <th className="py-2 px-3 font-medium text-right">Total h</th>
                                                        <th className="py-2 px-3 font-medium text-right">Importe</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filas.map(p => (
                                                        <tr key={`${p.petId}-${p.mes}-${p.nombre}`} className="border-b border-slate-100 last:border-0">
                                                            <td className="py-2 px-3 text-slate-800">
                                                                {p.nombre}
                                                                {peticionesDe(f).length > 1 && <span className="block text-[11px] text-slate-500">{p.petId} · {nombreMes(p.mes)}</span>}
                                                                {p.validadas && <span className="block text-[11px] text-amber-700">Validadas en sus partes: {num(p.validadas.normales)} h normales</span>}
                                                            </td>
                                                            {usados.map(c => <td key={c.id} className={`py-2 px-3 text-right whitespace-nowrap ${p.validadas && c.id === 'normales' ? 'text-amber-700 font-medium' : ''}`}>{p.horas[c.id] ? num(p.horas[c.id]) : '—'}</td>)}
                                                            <td className="py-2 px-3 text-right whitespace-nowrap text-slate-900">{num(usados.reduce((s, c) => s + (p.horas[c.id] || 0), 0))}</td>
                                                            <td className="py-2 px-3 text-right whitespace-nowrap text-slate-900">{euros(importe(p))}</td>
                                                        </tr>
                                                    ))}
                                                    <tr className="bg-slate-50 font-medium text-slate-900">
                                                        <td className="py-2 px-3">{filas.length} personas</td>
                                                        {usados.map(c => <td key={c.id} className="py-2 px-3 text-right whitespace-nowrap">{num(redondear(filas.reduce((s, p) => s + (p.horas[c.id] || 0), 0)))}</td>)}
                                                        <td className="py-2 px-3 text-right whitespace-nowrap">{num(redondear(filas.reduce((s, p) => s + usados.reduce((t, c) => t + (p.horas[c.id] || 0), 0), 0)))}</td>
                                                        <td className="py-2 px-3 text-right whitespace-nowrap">{euros(redondear(filas.reduce((s, p) => s + importe(p), 0)))}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                        {conDiferencia.length > 0 && (
                                            <Notice tone="warning" icon={AlertTriangle}>
                                                {conDiferencia.map(p => `${p.nombre}: facturadas ${num(p.horas.normales)} h y validadas ${num(p.validadas.normales)} h`).join('. ')}. Es la diferencia que avisa Horas e incidencias; se corrige con una rectificativa.
                                            </Notice>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* COBROS */}
                            {!borrador && !f.rectifica && (
                                <div className="space-y-2">
                                    <SectionTitle>Cobros</SectionTitle>
                                    {f.cobros.length === 0 ? <p className="text-slate-500">Sin cobros registrados.</p> : (
                                        <ul className="space-y-1.5">
                                            {f.cobros.map((c, i) => (
                                                <li key={i} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                                                    <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" />{fechaES(c.fecha)}{c.nota ? ` · ${c.nota}` : ''}</span>
                                                    <span className="text-slate-900">{euros(c.importe)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}

                            {/* HISTORIAL */}
                            <div className="space-y-2">
                                <SectionTitle>Historial</SectionTitle>
                                <ol className="space-y-2">
                                    {[...f.historial].reverse().map((h, k) => (
                                        <li key={k} className="flex items-start gap-2.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                            <span><span className="text-slate-800">{h.texto}</span><span className="block text-[11px] text-slate-500">{fechaES(h.fecha)}</span></span>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        </div>
                    </Drawer>
                );
            })()}

            {/* VISTA PREVIA */}
            {previa && f && (() => {
                const cliente = CLIENTES[f.cliente];
                const t = totalesDe(f);
                return (
                    <Modal title="Vista previa" subtitle="Así la recibe el cliente" onClose={() => setPrevia(false)} size="max-w-3xl" footer={<>{f.estado !== 'borrador' && <Button icon={Download} onClick={() => pdfFactura(f)}>Descargar PDF</Button>}<Button onClick={() => setPrevia(false)}>Cerrar</Button></>}>
                        <div className="rounded-lg border border-slate-200 p-4 sm:p-6 space-y-5 text-xs text-slate-800 bg-white">
                            <div className="flex flex-wrap justify-between gap-4">
                                <div>
                                    <div className="text-sm font-medium text-slate-900">{ETT.nombre}</div>
                                    <div className="text-slate-500">CIF {ETT.cif} · {ETT.direccion}</div>
                                    <div className="text-slate-500">Empresa de trabajo temporal autorizada n.º {ETT.autorizacion}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-base text-slate-900">{f.rectifica ? 'Factura rectificativa' : 'Factura'} {f.numero || '(borrador)'}</div>
                                    <div className="text-slate-500">Fecha: {fechaES(f.emision || hoyIso())}</div>
                                    {f.rectifica && <div className="text-slate-500">Rectifica: {f.rectifica}</div>}
                                </div>
                            </div>
                            <div className="rounded-md bg-slate-50 p-3">
                                <div className="text-[11px] text-slate-500">Cliente</div>
                                <div className="text-slate-900">{cliente.nombre} · CIF {cliente.cif}</div>
                                <div className="text-slate-600">{cliente.direccion}</div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[480px] text-left">
                                    <thead><tr className="border-b border-slate-300 text-[11px] text-slate-500"><th className="py-1.5 font-medium">Concepto</th><th className="py-1.5 pl-3 font-medium text-right">Cantidad</th><th className="py-1.5 pl-3 font-medium text-right">Precio</th><th className="py-1.5 pl-3 font-medium text-right">Importe</th></tr></thead>
                                    <tbody>{lineasDe(f).map(l => <tr key={l.id} className="border-b border-slate-100"><td className="py-1.5 pr-2">{l.concepto}</td><td className="py-1.5 pl-3 text-right whitespace-nowrap">{num(l.cantidad)} {l.unidad}</td><td className="py-1.5 pl-3 text-right whitespace-nowrap">{euros(l.precio)}</td><td className="py-1.5 pl-3 text-right whitespace-nowrap">{euros(redondear(l.cantidad * l.precio))}</td></tr>)}</tbody>
                                </table>
                            </div>
                            <dl className="ml-auto w-full sm:w-64 space-y-1">
                                <div className="flex justify-between"><dt>Base imponible</dt><dd>{euros(t.base)}</dd></div>
                                <div className="flex justify-between"><dt>IVA {cliente.iva} %</dt><dd>{euros(t.iva)}</dd></div>
                                <div className="flex justify-between border-t border-slate-300 pt-1 text-sm text-slate-900"><dt>Total</dt><dd>{euros(t.total)}</dd></div>
                            </dl>
                            {!f.rectifica && <div className="text-slate-600">Forma de pago: {cliente.pago.toLowerCase()} a {ETT.iban}. Vencimiento: {fechaES(f.vencimiento || vencimientoDe(cliente, hoyIso()))}.</div>}
                            {/* Importe de cada persona: en el PDF, como anexo (por concepto) o como resumen (por persona) */}
                            {personasDe(f).length > 0 && (() => {
                                const filas = personasDe(f);
                                const usados = CONCEPTOS.filter(c => filas.some(p => p.horas[c.id]));
                                const importe = (p) => redondear(usados.reduce((s, c) => s + redondear((p.horas[c.id] || 0) * redondear(PETICIONES[p.petId].tarifa * c.recargo)), 0));
                                const totalH = (p) => usados.reduce((s, c) => s + (p.horas[c.id] || 0), 0);
                                return (
                                    <div className="border-t border-slate-200 pt-4 space-y-2">
                                        <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{f.detalle === 'persona' ? 'Resumen por persona' : 'Anexo: horas e importe por persona'}</div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-[520px] text-left">
                                                <thead><tr className="border-b border-slate-300 text-[11px] text-slate-500"><th className="py-1.5 font-medium">Persona</th>{usados.map(c => <th key={c.id} className="py-1.5 pl-3 font-medium text-right">{mayus(c.texto.replace('horas ', ''))}</th>)}<th className="py-1.5 pl-3 font-medium text-right">Total h</th><th className="py-1.5 pl-3 font-medium text-right">Importe</th></tr></thead>
                                                <tbody>
                                                    {filas.map(p => <tr key={`${p.petId}-${p.mes}-${p.nombre}`} className="border-b border-slate-100"><td className="py-1 pr-2">{p.nombre}</td>{usados.map(c => <td key={c.id} className="py-1 pl-3 text-right">{p.horas[c.id] ? num(p.horas[c.id]) : '—'}</td>)}<td className="py-1 pl-3 text-right">{num(totalH(p))}</td><td className="py-1 pl-3 text-right whitespace-nowrap">{euros(importe(p))}</td></tr>)}
                                                    <tr className="text-slate-900"><td className="py-1.5 pr-2">{filas.length} personas</td>{usados.map(c => <td key={c.id} className="py-1.5 pl-3 text-right">{num(redondear(filas.reduce((s, p) => s + (p.horas[c.id] || 0), 0)))}</td>)}<td className="py-1.5 pl-3 text-right">{num(redondear(filas.reduce((s, p) => s + totalH(p), 0)))}</td><td className="py-1.5 pl-3 text-right whitespace-nowrap">{euros(redondear(filas.reduce((s, p) => s + importe(p), 0)))}</td></tr>
                                                </tbody>
                                            </table>
                                        </div>
                                        <p className="text-[11px] text-slate-500">Importes sin IVA, a la tarifa por hora de cada concepto.</p>
                                    </div>
                                );
                            })()}
                        </div>
                    </Modal>
                );
            })()}

            {/* AÑADIR SERVICIO A FACTURAR */}
            {nuevoServicio && (() => {
                const n = nuevoServicio;
                const sv = servicioDe(n.servicio);
                const pct = sv.cobro === 'porcentaje';
                const importe = pct ? redondear((Number(n.salario) || 0) * (Number(n.porcentaje) || 0) / 100) : redondear((Number(n.cantidad) || 0) * (Number(n.precio) || 0));
                const cambiar = (k, v) => setNuevoServicio(x => ({ ...x, [k]: v }));
                const valido = n.cliente && n.fecha && importe > 0;
                return (
                    <Modal title={n.enFactura ? 'Añadir servicio a esta factura' : 'Añadir servicio a facturar'} subtitle="Selección, formación, reconocimientos... Sale en «Por facturar» con las horas del cliente de ese mes" onClose={() => setNuevoServicio(null)} size="max-w-lg"
                        footer={<>
                            <Button onClick={() => setNuevoServicio(null)}>Cancelar</Button>
                            <Button variant="primary" icon={CheckCircle2} disabled={!valido} onClick={guardarServicio}>{n.enFactura ? 'Añadir a la factura' : 'Registrar servicio'}</Button>
                        </>}>
                        <div className="space-y-3 text-xs">
                            <Field label="Cliente">
                                <Select value={n.cliente} disabled={!!n.enFactura} onChange={(e) => cambiar('cliente', e.target.value)} className="w-full">
                                    <option value="">Elige el cliente…</option>
                                    {Object.entries(CLIENTES).filter(([id]) => SUCURSALES_USUARIO.includes(sucursalDe(id))).map(([id, c]) => <option key={id} value={id}>{c.nombre}</option>)}
                                </Select>
                            </Field>
                            <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr] gap-3">
                                <Field label="Servicio">
                                    <Select value={n.servicio} onChange={(e) => { const nv = servicioDe(e.target.value); setNuevoServicio(x => ({ ...x, servicio: e.target.value, precio: nv.cobro === 'porcentaje' ? x.precio : nv.valor, porcentaje: nv.cobro === 'porcentaje' ? nv.valor : x.porcentaje })); }} className="w-full">
                                        {SERVICIOS_INICIALES.filter(x => x.activo).map(x => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                                    </Select>
                                </Field>
                                <Field label="Fecha"><TextInput type="date" value={n.fecha} onChange={(e) => cambiar('fecha', e.target.value)} /></Field>
                            </div>
                            <Field label="Descripción"><TextInput value={n.descripcion} onChange={(e) => cambiar('descripcion', e.target.value)} placeholder={pct ? 'Por ejemplo: selección de un/a jefe/a de taller' : 'Por ejemplo: formación PRL de 4 carretilleros'} /></Field>
                            <Field label="Petición o proceso (opcional)"><TextInput value={n.referencia} onChange={(e) => cambiar('referencia', e.target.value)} placeholder="PET-2026-0050" /></Field>
                            {pct ? (
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Salario bruto anual de la persona contratada (€)"><TextInput type="number" min="0" step="100" value={n.salario} onChange={(e) => cambiar('salario', e.target.value)} /></Field>
                                    <Field label="Porcentaje (%)"><TextInput type="number" min="0" step="0.5" value={n.porcentaje} onChange={(e) => cambiar('porcentaje', e.target.value)} /></Field>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label={`Cantidad (${sv.unidad})`}><TextInput type="number" min="0" step="1" value={n.cantidad} onChange={(e) => cambiar('cantidad', e.target.value)} /></Field>
                                    <Field label={`Precio por ${sv.unidad} (€)`}><TextInput type="number" min="0" step="0.01" value={n.precio} onChange={(e) => cambiar('precio', e.target.value)} /></Field>
                                </div>
                            )}
                            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                                <span className="text-slate-600">{FORMAS_COBRO[sv.cobro]?.texto}{pct && n.salario ? ` · ${num(Number(n.porcentaje) || 0)} % de ${euros(Number(n.salario) || 0)}` : ''}</span>
                                <span className="text-sm font-medium text-slate-900">{euros(importe)} <span className="text-[11px] font-normal text-slate-500">sin IVA</span></span>
                            </div>
                            {!n.enFactura && n.cliente && <p className="text-[11px] text-slate-500">Saldrá en «Por facturar» de {CLIENTES[n.cliente].nombre}, {nombreMes(n.fecha.slice(0, 7))}, junto a sus horas si las hay.</p>}
                        </div>
                    </Modal>
                );
            })()}

            {/* NUEVA FACTURA (sin horas) */}
            {nuevaFactura && (
                <Modal title="Nueva factura" subtitle="Para lo que no sale de las horas ni de un servicio registrado. Se crea en borrador." onClose={() => setNuevaFactura(null)} size="max-w-md"
                    footer={<>
                        <Button onClick={() => setNuevaFactura(null)}>Cancelar</Button>
                        <Button variant="primary" icon={FilePlus2} disabled={!nuevaFactura.cliente} onClick={crearFacturaManual}>Crear borrador</Button>
                    </>}>
                    <div className="space-y-3 text-xs">
                        <Field label="Cliente">
                            <Select value={nuevaFactura.cliente} onChange={(e) => setNuevaFactura({ cliente: e.target.value })} className="w-full">
                                <option value="">Elige el cliente…</option>
                                {Object.entries(CLIENTES).filter(([id]) => SUCURSALES_USUARIO.includes(sucursalDe(id))).map(([id, c]) => <option key={id} value={id}>{c.nombre}</option>)}
                            </Select>
                        </Field>
                        <p className="text-slate-500">Después añade servicios del catálogo o líneas libres, y emítela como las demás.</p>
                    </div>
                </Modal>
            )}

            {/* AÑADIR LÍNEA */}
            {linea && f && (
                <Modal title="Añadir línea" subtitle="Por ejemplo, un desplazamiento o un ajuste pactado con el cliente" onClose={() => setLinea(null)} size="max-w-md"
                    footer={<>
                        <Button onClick={() => setLinea(null)}>Cancelar</Button>
                        <Button variant="primary" icon={Plus} disabled={!linea.concepto || !Number(linea.cantidad) || linea.precio === ''} onClick={() => {
                            actualizar(f.id, (x) => ({ lineas: [...x.lineas, { id: `m-${Date.now()}`, concepto: linea.concepto, cantidad: Number(linea.cantidad), unidad: 'ud.', precio: Number(linea.precio), manual: true }] }), `Línea añadida: ${linea.concepto}`);
                            setLinea(null);
                        }}>Añadir</Button>
                    </>}
                >
                    <div className="space-y-4 text-xs">
                        <Field label="Concepto"><TextInput value={linea.concepto} onChange={(e) => setLinea(l => ({ ...l, concepto: e.target.value }))} /></Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Cantidad"><TextInput type="number" step="0.01" value={linea.cantidad} onChange={(e) => setLinea(l => ({ ...l, cantidad: e.target.value }))} /></Field>
                            <Field label="Precio (€)" hint="En negativo para un descuento"><TextInput type="number" step="0.01" value={linea.precio} onChange={(e) => setLinea(l => ({ ...l, precio: e.target.value }))} /></Field>
                        </div>
                    </div>
                </Modal>
            )}
            {lineaAEliminar && f && (
                <Confirmar title="Quitar la línea" confirmLabel="Quitar" onClose={() => setLineaAEliminar(null)} onConfirm={() => {
                    actualizar(f.id, (x) => ({ lineas: x.lineas.filter(l => l.id !== lineaAEliminar.id) }), `Línea quitada: ${lineaAEliminar.concepto}`);
                    setLineaAEliminar(null);
                }}>
                    Se quita «{lineaAEliminar.concepto}» del borrador.
                </Confirmar>
            )}
            {descartar && f && (
                <Confirmar title="Descartar el borrador" confirmLabel="Descartar" onClose={() => setDescartar(false)} onConfirm={() => {
                    setFacturas(prev => prev.filter(x => x.id !== f.id));
                    setDescartar(false); setAbierta(null);
                    showToast('Borrador descartado. Las horas vuelven a «Por facturar».');
                }}>
                    Las horas vuelven a «Por facturar». No se ha emitido ninguna factura, así que no hace falta rectificativa.
                </Confirmar>
            )}

            {/* REGISTRAR COBRO */}
            {cobro && f && (
                <Modal title="Registrar cobro" subtitle={`${f.numero} · pendiente ${euros(totalesDe(f).pendiente)}`} onClose={() => setCobro(null)} size="max-w-md"
                    footer={<>
                        <Button onClick={() => setCobro(null)}>Cancelar</Button>
                        <Button variant="primary" icon={Wallet} disabled={!cobro.fecha || !(Number(cobro.importe) > 0)} onClick={confirmarCobro}>Registrar</Button>
                    </>}
                >
                    <div className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Fecha"><TextInput type="date" value={cobro.fecha} onChange={(e) => setCobro(c => ({ ...c, fecha: e.target.value }))} /></Field>
                            <Field label="Importe (€)"><TextInput type="number" step="0.01" value={cobro.importe} onChange={(e) => setCobro(c => ({ ...c, importe: e.target.value }))} /></Field>
                        </div>
                        <Field label="Nota (opcional)"><TextInput value={cobro.nota} onChange={(e) => setCobro(c => ({ ...c, nota: e.target.value }))} placeholder="Por ejemplo: transferencia" /></Field>
                        {Number(cobro.importe) > 0 && Number(cobro.importe) < totalesDe(f).pendiente && <Notice tone="info" icon={Info}>Cobro parcial: quedarán {euros(redondear(totalesDe(f).pendiente - Number(cobro.importe)))} pendientes.</Notice>}
                    </div>
                </Modal>
            )}

            {/* RECTIFICAR */}
            {rectificar && f && (
                <Modal title={`Rectificar ${f.numero}`} subtitle="Una factura emitida no se borra: se anula con una rectificativa" onClose={() => setRectificar(null)} size="max-w-md"
                    footer={<>
                        <Button onClick={() => setRectificar(null)}>Cancelar</Button>
                        <Button variant="primary" icon={FileMinus2} onClick={confirmarRectificacion}>Emitir rectificativa</Button>
                    </>}
                >
                    <div className="space-y-4 text-xs">
                        <Field label="Motivo">
                            <Select value={rectificar.motivo} onChange={(e) => setRectificar(r => ({ ...r, motivo: e.target.value }))} className="w-full">
                                {MOTIVOS_RECTIFICACION.map(m => <option key={m} value={m}>{m}</option>)}
                            </Select>
                        </Field>
                        <Field label="Nota (opcional)"><TextInput value={rectificar.nota} onChange={(e) => setRectificar(r => ({ ...r, nota: e.target.value }))} /></Field>
                        <label className="flex items-start gap-2 text-slate-700">
                            <input type="checkbox" checked={rectificar.nueva} onChange={(e) => setRectificar(r => ({ ...r, nueva: e.target.checked }))} className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                            Preparar un borrador nuevo con las mismas líneas para corregirlo y emitirlo
                        </label>
                        <Notice tone="info" icon={Info}>Se emite la rectificativa con las mismas líneas en negativo ({euros(-totalesDe(f).total)}) y la factura queda anulada.</Notice>
                    </div>
                </Modal>
            )}

            {toast && (
                <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-lg text-sm animate-fade-in max-w-md">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>{toast}</span>
                    <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white" aria-label="Cerrar aviso"><X className="w-4 h-4" /></button>
                </div>
            )}
        </>
    );
}
