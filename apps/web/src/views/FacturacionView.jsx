// Facturación: de las horas cerradas en Horas e incidencias a la factura, el envío y el cobro.
// No partió de ninguna maqueta de design/: se diseñó directamente con el sistema común.
import React, { useState, useMemo, useEffect } from 'react';
import {
    Receipt, Building2, Send, CheckCircle2, AlertTriangle, Info, X, Plus, Trash2, Eye, FileCheck2, Wallet,
    ArrowUpRight, Clock, Undo2, BellRing, FileMinus2, CalendarDays, ChevronDown, Download, FileSpreadsheet, Printer, BriefcaseBusiness, FilePlus2,
    MoreHorizontal, ArrowUpDown, ChevronLeft, ChevronRight, Search, Check
} from 'lucide-react';
import {
    Page, PageHeader, Card, SectionTitle, KpiTile, EmptyState, Notice, Button, IconButton, Badge, SearchInput,
    Select, Field, TextInput, Modal, Drawer, Confirmar, Tabs
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

// Más clientes de ejemplo, para ver cómo funciona con muchos (una ETT grande puede tener cientos).
// Nombres inventados. Cada uno con una petición y sus horas de octubre; algunos, también con un servicio.
const NOMBRES_DEMO = ['Ane', 'Jon', 'Laia', 'Iker', 'Marta', 'Unai', 'Núria', 'Hugo', 'Leire', 'Pau', 'Elena', 'Mikel', 'Carla', 'Asier', 'Júlia', 'Diego', 'Maite', 'Arnau', 'Sara', 'Ibai', 'Noa', 'Àlex', 'Irati', 'Raúl'];
const APELLIDOS_DEMO = ['Etxeberria', 'Puig', 'Lasa', 'Serra', 'Goikoetxea', 'Vidal', 'Zubiri', 'Font', 'Arrieta', 'Casas', 'Mendizabal', 'Roig', 'Ugarte', 'Pons', 'Otxoa', 'Martí', 'Elorza', 'Bosch', 'Iturbe', 'Soler'];
const SECTORES_DEMO = [['Almacenes', 'Mozo/a de almacén'], ['Logística', 'Operario/a de almacén'], ['Conservas', 'Operario/a de producción'], ['Hoteles', 'Camarero/a de pisos'], ['Industrias', 'Operario/a de línea'], ['Transportes', 'Carretillero/a']];
const LUGARES_DEMO = [['Arratia', 'norte'], ['Nervión', 'norte'], ['Llobregat', 'bcn'], ['Txingudi', 'norte'], ['Montseny', 'bcn'], ['Urola', 'norte'], ['Penedès', 'bcn'], ['Bidasoa', 'norte'], ['Maresme', 'bcn'], ['Gorbea', 'norte'], ['Cadí', 'bcn'], ['Zadorra', 'norte']];
for (let i = 0; i < 36; i++) {
    const [sector, puesto] = SECTORES_DEMO[i % SECTORES_DEMO.length];
    const [lugar, suc] = LUGARES_DEMO[(i * 5) % LUGARES_DEMO.length];
    const id = `g${i}`;
    const petId = `PET-2026-${String(200 + i).padStart(4, '0')}`;
    CLIENTES[id] = {
        nombre: `${sector} ${lugar}${i >= 12 ? ` ${['Norte', 'Sur', 'Centro'][Math.floor(i / 12) - 1]}` : ''}, S.L.`, cif: `B-9${String(1000000 + i * 7919).slice(-7)}`,
        direccion: `Polígono Ejemplo ${i + 1}, ${suc === 'bcn' ? '08000 Barcelona' : '48000 Bilbao'}`, sucursal: suc,
        iva: 21, retencion: 0, pago: 'Transferencia a 30 días', diasPago: 30, diasFijos: [], email: `facturacion@cliente${i + 1}.example`, detalle: i % 7 === 0 ? 'persona' : 'concepto',
    };
    PETICIONES[petId] = { cliente: id, puesto, presupuesto: `PRE-2026-${String(100 + i).padStart(4, '0')}`, tarifa: Math.round((15.9 + (i % 7) * 0.6) * 100) / 100 };
    const personas = 2 + (i % 9);
    const listo = i % 4 !== 1;
    HORAS_INICIALES.push({ petId, mes: '2026-10', horas: { normales: personas * 150 - (i % 4) * 7.5, ...(i % 6 === 0 ? { extra: personas * 2 } : {}) }, listo, ...(listo ? {} : { partesPendientes: 1 + (i % 3) }) });
    const total = HORAS_INICIALES[HORAS_INICIALES.length - 1].horas;
    const cada = Math.floor((total.normales / personas) * 4) / 4; // en cuartos de hora
    HORAS_PERSONA[`${petId}|2026-10`] = Array.from({ length: personas }, (_, k) => [
        `${NOMBRES_DEMO[(i * 3 + k) % NOMBRES_DEMO.length]} ${APELLIDOS_DEMO[(i + k * 5) % APELLIDOS_DEMO.length]} ${APELLIDOS_DEMO[(i * 7 + k * 3 + 4) % APELLIDOS_DEMO.length]}`,
        { normales: k === personas - 1 ? Math.round((total.normales - cada * (personas - 1)) * 100) / 100 : cada, ...(total.extra ? { extra: 2 } : {}) },
    ]);
    if (i % 5 === 0) SERVICIOS_REGISTRADOS.push({ id: `sg${i}`, cliente: id, servicio: 'formacion_prl', fecha: '2026-10-20', descripcion: 'Formación PRL de incorporación', referencia: petId, cantidad: 2 + (i % 3), precio: 85 });
}

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
            concepto: `${p.nombre} · ${PETICIONES[l.petId].puesto} · ${c.texto} · ${nombreMes(l.mes)} (${l.petId})`,
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
        <table><thead><tr><th>Persona</th><th>Puesto y petición</th>${usados.map(c => `<th class="n">${esc(mayus(c.texto.replace('horas ', '')))}</th>`).join('')}<th class="n">Total h</th><th class="n">Importe</th></tr></thead><tbody>
        ${filas.map(p => `<tr><td>${esc(p.nombre)}</td><td>${esc(PETICIONES[p.petId].puesto)} · ${esc(p.petId)}</td>${usados.map(c => `<td class="n">${p.horas[c.id] ? num(p.horas[c.id]) : '—'}</td>`).join('')}<td class="n">${num(usados.reduce((s, c) => s + (p.horas[c.id] || 0), 0))}</td><td class="n">${euros(importe(p))}</td></tr>`).join('')}
        <tr class="tot"><td>${filas.length} personas</td><td></td>${usados.map(c => `<td class="n">${num(redondear(filas.reduce((s, p) => s + (p.horas[c.id] || 0), 0)))}</td>`).join('')}<td class="n">${num(redondear(filas.reduce((s, p) => s + usados.reduce((x, c) => x + (p.horas[c.id] || 0), 0), 0)))}</td><td class="n">${euros(redondear(filas.reduce((s, p) => s + importe(p), 0)))}</td></tr>
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

// Buscador de clientes: con cientos de clientes, un desplegable no sirve. Se escribe el nombre o el CIF;
// sin escribir, salen primero los que tienen algo por facturar.
function BuscadorCliente({ valor, onChange, ids, destacados = [], sucursalDe, vacio = '' }) {
    const [q, setQ] = useState('');
    const [abierto, setAbierto] = useState(false);
    if (valor) {
        return (
            <div className="flex items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs">
                <span className="min-w-0">
                    <span className="block truncate text-slate-900">{CLIENTES[valor].nombre}</span>
                    <span className="text-[11px] text-slate-500">{CLIENTES[valor].cif} · {sucursal(sucursalDe(valor)).corto}</span>
                </span>
                <button type="button" onClick={() => { onChange(''); setQ(''); setAbierto(true); }} className="shrink-0 text-indigo-700 hover:underline">{vacio ? 'Quitar' : 'Cambiar'}</button>
            </div>
        );
    }
    const texto = normalizar(q.trim());
    const encontrados = texto
        ? ids.filter(id => normalizar(`${CLIENTES[id].nombre} ${CLIENTES[id].cif}`).includes(texto))
        : [...new Set([...destacados.filter(id => ids.includes(id)), ...ids])];
    const MAX = 8;
    return (
        <div className="relative">
            <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                    type="text" value={q} autoComplete="off" role="combobox" aria-expanded={abierto} aria-label="Buscar cliente"
                    placeholder={vacio ? `${vacio} · escribe nombre o CIF` : 'Escribe el nombre o el CIF del cliente...'}
                    onChange={(e) => { setQ(e.target.value); setAbierto(true); }}
                    onFocus={() => setAbierto(true)}
                    onBlur={() => setTimeout(() => setAbierto(false), 150)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && encontrados.length) { e.preventDefault(); onChange(encontrados[0]); setAbierto(false); } }}
                    className="w-full rounded-md border border-slate-300 bg-white pl-8 pr-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
            </div>
            {abierto && (
                <ul role="listbox" className="absolute z-40 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg py-1 text-xs">
                    {!texto && destacados.some(id => ids.includes(id)) && <li className="px-3 pt-1 pb-0.5 text-[10px] uppercase tracking-wide text-slate-400">Con algo por facturar primero</li>}
                    {encontrados.slice(0, MAX).map(id => (
                        <li key={id}>
                            <button type="button" role="option" aria-selected="false" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(id); setAbierto(false); setQ(''); }} className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-slate-50">
                                <span className="min-w-0"><span className="block truncate text-slate-900">{CLIENTES[id].nombre}</span><span className="text-[11px] text-slate-500">{CLIENTES[id].cif} · {sucursal(sucursalDe(id)).corto}</span></span>
                                {destacados.includes(id) && <Badge tone="warning">Por facturar</Badge>}
                            </button>
                        </li>
                    ))}
                    {encontrados.length === 0 && <li className="px-3 py-2 text-slate-500">Ningún cliente con «{q}»</li>}
                    {encontrados.length > MAX && <li className="px-3 py-1.5 text-[11px] text-slate-400 border-t border-slate-100">y {encontrados.length - MAX} más: sigue escribiendo para afinar</li>}
                </ul>
            )}
        </div>
    );
}

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
        if (id) { setClienteAbierto(id); abrirServicio(id); } else showToast(`${nombre} todavía no tiene datos de facturación: complétalos en su ficha`);
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
    const sucursalDe = (clienteId) => CLIENTES[clienteId].sucursal || sucursalDeCliente(CLIENTES[clienteId].nombre);
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
            const otras = x.lineas.filter(l => !l.petId || !personas.some(p => p.petId === l.petId && p.mes === l.mes)).map(l => [x.numero, fechaES(x.emision), c.nombre, sucursal(sucursalDe(x.cliente)).nombre, l.petId || '', l.petId ? PETICIONES[l.petId].puesto : '', '', l.mes ? nombreMes(l.mes) : '', l.concepto, numExcel(l.cantidad), l.unidad, numExcel(l.precio), numExcel(l.cantidad * l.precio)]);
            return [...personas.flatMap(p => CONCEPTOS.filter(k => p.horas[k.id]).map(k => {
                const precio = redondear(PETICIONES[p.petId].tarifa * k.recargo);
                return [x.numero, fechaES(x.emision), c.nombre, sucursal(sucursalDe(x.cliente)).nombre, p.petId, PETICIONES[p.petId].puesto, p.nombre, nombreMes(p.mes), mayus(k.texto), numExcel(p.horas[k.id]), 'h', numExcel(precio), numExcel(p.horas[k.id] * precio)];
            })), ...otras];
        });
        descargarCsv(`facturas_horas_por_persona_${hoyIso()}.csv`, ['Número', 'Fecha de emisión', 'Cliente', 'Sucursal', 'Petición', 'Puesto', 'Persona', 'Mes', 'Concepto', 'Cantidad', 'Unidad', 'Precio', 'Importe'], filas);
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

    const borradorDe = (g, sufijo = '') => ({
        id: `borrador-${Date.now()}${sufijo}`, numero: null, cliente: g.cliente, periodo: g.mes, emision: null, vencimiento: null, estado: 'borrador', detalle: CLIENTES[g.cliente].detalle,
        lineas: [...g.horas.flatMap(lineasDesdeHoras), ...g.servicios.map(lineaDeServicio)], cobros: [],
        historial: [{ fecha: hoyIso(), texto: `Borrador preparado con ${g.horas.length ? 'las horas de Horas e incidencias' : 'los servicios del mes'}, ${CLIENTES[g.cliente].detalle === 'persona' ? 'por persona' : 'por concepto'} como quiere el cliente` }],
    });
    const prepararFactura = (g) => {
        if (g.borrador) {
            // Servicios registrados después de preparar el borrador: se añaden a él
            const fb = facturas.find(x => x.id === g.borrador);
            const faltanServicios = g.servicios.filter(x => !fb.lineas.some(l => l.servicio === x.id));
            if (faltanServicios.length) actualizar(fb.id, (x) => ({ lineas: [...x.lineas, ...faltanServicios.map(lineaDeServicio)] }), `${faltanServicios.length} ${faltanServicios.length === 1 ? 'servicio añadido' : 'servicios añadidos'} al borrador`);
            setAbierta(g.borrador);
            return;
        }
        const nuevo = borradorDe(g);
        setFacturas(prev => [...prev, nuevo]);
        setAbierta(nuevo.id);
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
        else showToast(`Servicio registrado: entra en la factura de ${nombreMes(n.fecha.slice(0, 7))} de ${CLIENTES[n.cliente].nombre}`);
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

    // ==========================================
    // FACTURAR EL MES: una fila por cliente con actividad en el mes elegido
    // ==========================================
    const [pestana, setPestana] = useState('mes');
    const mesesConDatos = useMemo(() => [...new Set([...horas.map(h => h.mes), ...servicios.map(x => x.fecha.slice(0, 7)), ...facturas.filter(x => /^\d{4}-\d{2}$/.test(x.periodo)).map(x => x.periodo)])].sort().reverse(), [horas, servicios, facturas]);
    const [mesSel, setMesSel] = useState(() => {
        const cuenta = {};
        porFacturar.forEach(g => { cuenta[g.mes] = (cuenta[g.mes] || 0) + 1; });
        return Object.entries(cuenta).sort((a, b) => b[1] - a[1])[0]?.[0] || hoyIso().slice(0, 7);
    });
    const [buscarMes, setBuscarMes] = useState('');
    const [estadoMes, setEstadoMes] = useState('pendientes');
    const [orden, setOrden] = useState({ campo: 'estado', asc: true });
    const [pagina, setPagina] = useState(0);
    const [paginaFact, setPaginaFact] = useState(0);
    const [seleccion, setSeleccion] = useState([]);
    const [menuFila, setMenuFila] = useState(null); // cliente con el menú ⋯ abierto
    const [clienteAbierto, setClienteAbierto] = useState(null);
    const [pestanaCliente, setPestanaCliente] = useState('mes');
    const POR_PAGINA = 25;
    const ORDEN_ESTADO = { esperando: 0, lista: 1, borrador: 2, facturada: 3 };

    const filaDe = (cliente, mes) => {
        const g = porFacturar.find(x => x.cliente === cliente && x.mes === mes);
        const fMes = facturas.find(x => x.cliente === cliente && x.periodo === mes && x.estado !== 'borrador' && !x.rectifica && !x.anulada);
        const hs = horas.filter(h => PETICIONES[h.petId].cliente === cliente && h.mes === mes);
        const svs = servicios.filter(x => x.cliente === cliente && x.fecha.slice(0, 7) === mes);
        if (!g && !fMes && !hs.length && !svs.length) return null;
        const faltan = g ? g.horas.reduce((t, h) => t + (h.partesPendientes || 0), 0) : 0;
        const estado = g
            ? (g.borrador ? { id: 'borrador', texto: 'En borrador', tono: 'neutral' } : faltan ? { id: 'esperando', texto: `Esperando horas · faltan ${faltan} ${faltan === 1 ? 'parte' : 'partes'}`, tono: 'warning' } : { id: 'lista', texto: 'Lista para facturar', tono: 'success' })
            : fMes ? { id: 'facturada', texto: `${fMes.numero} · ${estadoDe(fMes).texto.toLowerCase()}`, tono: estadoDe(fMes).tono } : { id: 'facturada', texto: 'Facturada', tono: 'neutral' };
        return {
            cliente, mes, g, factura: fMes, estado,
            horas: hs.reduce((t, h) => t + Object.values(h.horas).reduce((a, b) => a + b, 0), 0), peticiones: [...new Set(hs.map(h => h.petId))].length,
            nServicios: svs.length, importeServicios: svs.reduce((t, x) => t + importeServicio(x), 0),
            base: g ? baseGrupo(g) : fMes ? totalesDe(fMes).base : 0,
        };
    };
    const filasMesTodas = useMemo(() => Object.keys(CLIENTES).map(c => filaDe(c, mesSel)).filter(Boolean), [mesSel, porFacturar, facturas, horas, servicios]);
    const filasMes = useMemo(() => {
        const q = normalizar(buscarMes.trim());
        const lista = filasMesTodas
            .filter(x => enSucursal(x.cliente))
            .filter(x => !q || normalizar(`${CLIENTES[x.cliente].nombre} ${CLIENTES[x.cliente].cif}`).includes(q))
            .filter(x => estadoMes === 'todos' || (estadoMes === 'pendientes' ? x.estado.id !== 'facturada' : x.estado.id === estadoMes));
        const val = (x) => (orden.campo === 'cliente' ? CLIENTES[x.cliente].nombre : orden.campo === 'base' ? x.base : orden.campo === 'horas' ? x.horas : ORDEN_ESTADO[x.estado.id]);
        return lista.sort((a, b) => { const va = val(a), vb = val(b); const c = typeof va === 'string' ? va.localeCompare(vb) : va - vb; return orden.asc ? c : -c; });
    }, [filasMesTodas, buscarMes, estadoMes, orden, filtroSucursal]);
    const paginas = Math.max(1, Math.ceil(filasMes.length / POR_PAGINA));
    const paginaActual = Math.min(pagina, paginas - 1);
    const filasPagina = filasMes.slice(paginaActual * POR_PAGINA, (paginaActual + 1) * POR_PAGINA);
    const delMes = filasMesTodas.filter(x => enSucursal(x.cliente));
    const cuentaMes = (id) => delMes.filter(x => x.estado.id === id).length;
    const ordenarPor = (campo) => setOrden(o => ({ campo, asc: o.campo === campo ? !o.asc : true }));
    const marcar = (c) => setSeleccion(sel => (sel.includes(c) ? sel.filter(x => x !== c) : [...sel, c]));
    const filasSeleccionadas = filasMes.filter(x => seleccion.includes(x.cliente));
    const cambiarMes = (m) => { setMesSel(m); setSeleccion([]); setPagina(0); };

    // Acciones en bloque
    const prepararVarios = () => {
        const nuevos = filasSeleccionadas.filter(x => x.g && !x.g.borrador).map((x, i) => borradorDe(x.g, `-${i}`));
        setFacturas(prev => [...prev, ...nuevos]);
        setSeleccion([]);
        showToast(`${nuevos.length} ${nuevos.length === 1 ? 'borrador preparado' : 'borradores preparados'}${nuevos.some(n => horasDe(n).some(h => !h.listo)) ? '. Los que esperan horas no se podrán emitir hasta que se validen.' : ''}`);
    };
    const emitirVarios = () => {
        // Prepara el borrador si hace falta y emite las que tienen las horas validadas
        const listas = filasSeleccionadas.filter(x => x.g && x.g.horas.every(h => h.listo));
        let numero = siguiente.F;
        const emitidas = listas.map((x, i) => {
            const base = x.g.borrador ? facturas.find(fx => fx.id === x.g.borrador) : borradorDe(x.g, `-e${i}`);
            const n = `F2026-${String(numero++).padStart(4, '0')}`;
            return { ...base, numero: n, estado: 'emitida', emision: hoyIso(), vencimiento: vencimientoDe(CLIENTES[x.cliente], hoyIso()), historial: [...base.historial, { fecha: hoyIso(), texto: `Factura ${n} emitida. Ya no se puede cambiar.` }] };
        });
        setFacturas(prev => [...prev.filter(fx => !emitidas.some(e => e.id === fx.id)), ...emitidas]);
        setSiguiente(sx => ({ ...sx, F: numero }));
        setSeleccion([]);
        const sinHoras = filasSeleccionadas.length - listas.length;
        showToast(`${emitidas.length} ${emitidas.length === 1 ? 'factura emitida' : 'facturas emitidas'}${emitidas.length ? ` (${emitidas[0].numero}${emitidas.length > 1 ? ` a ${emitidas[emitidas.length - 1].numero}` : ''})` : ''}${sinHoras ? `. ${sinHoras} sin emitir: esperan horas o ya estaban facturadas.` : ''}`);
    };
    const enviarVarios = () => {
        const ids = filasSeleccionadas.filter(x => x.factura && x.factura.estado === 'emitida').map(x => x.factura.id);
        setFacturas(prev => prev.map(fx => (ids.includes(fx.id) ? { ...fx, estado: 'enviada', historial: [...fx.historial, { fecha: hoyIso(), texto: `Factura ${fx.numero} enviada a ${CLIENTES[fx.cliente].email}` }] } : fx)));
        setSeleccion([]);
        showToast(ids.length ? `${ids.length} ${ids.length === 1 ? 'factura enviada' : 'facturas enviadas'} por correo a cada cliente` : 'Ninguna de las seleccionadas está emitida y sin enviar');
    };
    const pdfVarios = () => {
        const fs = filasSeleccionadas.map(x => x.factura).filter(Boolean);
        if (!fs.length) return showToast('Ninguna de las seleccionadas tiene factura emitida');
        if (!descargarPdf(fs, `Facturas ${nombreMes(mesSel)}`)) showToast('El navegador ha bloqueado la ventana: permite las ventanas emergentes para descargar el PDF');
        return null;
    };
    const abrirFacturaDe = (x) => { setClienteAbierto(null); if (x.g) prepararFactura(x.g); else if (x.factura) setAbierta(x.factura.id); };

    return (
        <>
            <Page>
                <PageHeader
                    title="Facturación"
                    count={pendientes.length}
                    subtitle="Cada mes, una factura por cliente con sus horas validadas y los servicios hechos (selección, formación...). Aquí se prepara, se emite, se envía y se sigue el cobro."
                    actions={<Button variant="primary" icon={FilePlus2} onClick={() => setNuevaFactura({ cliente: '' })}>Nueva factura</Button>}
                />

                <Tabs
                    tabs={[
                        { id: 'mes', label: 'Facturar el mes', icon: CalendarDays, count: delMes.filter(x => x.estado.id !== 'facturada').length },
                        { id: 'facturas', label: 'Facturas', icon: Receipt, count: lista.length },
                    ]}
                    active={pestana}
                    onChange={(id) => { setPestana(id); setSeleccion([]); }}
                />

                {pestana === 'mes' && <>
                    {/* FILTROS DEL MES */}
                    <Card className="p-3">
                        <div className="flex flex-wrap items-end gap-3">
                            <label className="flex flex-col gap-1">
                                {etiqueta('Mes', <CalendarDays className="w-3.5 h-3.5 text-slate-400" />)}
                                <Select value={mesSel} onChange={(e) => cambiarMes(e.target.value)} aria-label="Mes">
                                    {mesesConDatos.map(m => <option key={m} value={m}>{mayus(nombreMes(m))}</option>)}
                                </Select>
                            </label>
                            <label className="flex flex-col gap-1 min-w-[200px] flex-1 sm:flex-none sm:w-72">
                                {etiqueta('Buscar cliente')}
                                <SearchInput value={buscarMes} onChange={(v) => { setBuscarMes(v); setPagina(0); }} placeholder="Nombre o CIF..." />
                            </label>
                            {veVariasSucursales && (
                                <label className="flex flex-col gap-1">
                                    {etiqueta('Sucursal')}
                                    <Select value={filtroSucursal} onChange={(e) => { setFiltroSucursal(e.target.value); setPagina(0); setSeleccion([]); }} aria-label="Sucursal">
                                        <option value="">Todas las sucursales</option>
                                        {SUCURSALES.filter(x => SUCURSALES_USUARIO.includes(x.id)).map(x => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                                    </Select>
                                </label>
                            )}
                            <label className="flex flex-col gap-1">
                                {etiqueta('Estado')}
                                <Select value={estadoMes} onChange={(e) => { setEstadoMes(e.target.value); setPagina(0); }} aria-label="Estado del mes">
                                    <option value="pendientes">Pendientes de facturar</option>
                                    <option value="lista">Listas para facturar</option>
                                    <option value="esperando">Esperando horas</option>
                                    <option value="borrador">En borrador</option>
                                    <option value="facturada">Ya facturadas</option>
                                    <option value="todos">Todos los clientes del mes</option>
                                </Select>
                            </label>
                        </div>
                    </Card>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <KpiTile label="Listas para facturar" tone="success" value={cuentaMes('lista')} hint="Horas validadas, sin factura" active={estadoMes === 'lista'} onClick={() => { setEstadoMes('lista'); setPagina(0); }} />
                        <KpiTile label="Esperando horas" tone="warning" value={cuentaMes('esperando')} hint="Faltan partes por validar" active={estadoMes === 'esperando'} onClick={() => { setEstadoMes('esperando'); setPagina(0); }} />
                        <KpiTile label="En borrador" value={cuentaMes('borrador')} hint="Por revisar y emitir" active={estadoMes === 'borrador'} onClick={() => { setEstadoMes('borrador'); setPagina(0); }} />
                        <KpiTile label="Ya facturadas" tone="info" value={cuentaMes('facturada')} hint={`De ${delMes.length} clientes con actividad`} active={estadoMes === 'facturada'} onClick={() => { setEstadoMes('facturada'); setPagina(0); }} />
                    </div>

                    {/* ACCIONES EN BLOQUE */}
                    {seleccion.length > 0 ? (
                        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs">
                            <span className="font-medium text-indigo-900 mr-1">{filasSeleccionadas.length} {filasSeleccionadas.length === 1 ? 'cliente seleccionado' : 'clientes seleccionados'}</span>
                            <Button size="sm" icon={Receipt} onClick={prepararVarios}>Preparar borradores</Button>
                            <Button size="sm" variant="primary" icon={FileCheck2} onClick={emitirVarios}>Emitir facturas</Button>
                            <Button size="sm" icon={Send} onClick={enviarVarios}>Enviar por correo</Button>
                            <Button size="sm" icon={Printer} onClick={pdfVarios}>PDF</Button>
                            <Button size="sm" icon={FileSpreadsheet} onClick={() => {
                                descargarCsv(`facturar_${mesSel}.csv`, ['Cliente', 'CIF', 'Sucursal', 'Mes', 'Peticiones', 'Horas', 'Servicios', 'Importe servicios', 'Base imponible', 'Estado'],
                                    filasSeleccionadas.map(x => [CLIENTES[x.cliente].nombre, CLIENTES[x.cliente].cif, sucursal(sucursalDe(x.cliente)).nombre, nombreMes(mesSel), x.peticiones, numExcel(x.horas), x.nServicios, numExcel(x.importeServicios), numExcel(x.base), x.estado.texto]));
                                showToast(`Excel con ${filasSeleccionadas.length} clientes descargado`);
                            }}>Excel</Button>
                            <Button size="sm" icon={FileSpreadsheet} onClick={() => {
                                const filas = filasSeleccionadas.flatMap(x => horas.filter(h => PETICIONES[h.petId].cliente === x.cliente && h.mes === mesSel).flatMap(h => (HORAS_PERSONA[`${h.petId}|${h.mes}`] || []).flatMap(([nombre, hp]) => CONCEPTOS.filter(k => hp[k.id]).map(k => {
                                    const precio = redondear(PETICIONES[h.petId].tarifa * k.recargo);
                                    return [CLIENTES[x.cliente].nombre, CLIENTES[x.cliente].cif, sucursal(sucursalDe(x.cliente)).nombre, h.petId, PETICIONES[h.petId].puesto, nombre, nombreMes(h.mes), mayus(k.texto), numExcel(hp[k.id]), numExcel(precio), numExcel(hp[k.id] * precio), x.factura ? x.factura.numero : x.estado.texto];
                                }))));
                                descargarCsv(`horas_por_persona_${mesSel}.csv`, ['Cliente', 'CIF', 'Sucursal', 'Petición', 'Puesto', 'Persona', 'Mes', 'Concepto', 'Horas', 'Precio', 'Importe', 'Factura'], filas);
                                showToast(`Excel con ${filas.length} filas por persona y puesto descargado`);
                            }}>Excel por persona</Button>
                            <Button size="sm" variant="ghost" icon={X} onClick={() => setSeleccion([])}>Quitar selección</Button>
                        </div>
                    ) : cuentaMes('lista') > 0 && (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                            <span>Marca los clientes para preparar, emitir o enviar sus facturas de una vez.</span>
                            <button type="button" className="font-medium text-indigo-700 hover:underline" onClick={() => setSeleccion(filasMes.filter(x => x.estado.id === 'lista').map(x => x.cliente))}>
                                Seleccionar las {filasMes.filter(x => x.estado.id === 'lista').length} listas para facturar
                            </button>
                        </div>
                    )}

                    {/* UNA FILA POR CLIENTE */}
                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                                        <th className="py-2 pl-3 pr-1 w-8">
                                            <input type="checkbox" aria-label="Seleccionar los de esta página" className="accent-indigo-600"
                                                checked={filasPagina.length > 0 && filasPagina.every(x => seleccion.includes(x.cliente))}
                                                onChange={(e) => setSeleccion(sel => (e.target.checked ? [...new Set([...sel, ...filasPagina.map(x => x.cliente)])] : sel.filter(c => !filasPagina.some(x => x.cliente === c))))} />
                                        </th>
                                        {[['cliente', 'Cliente', ''], ['horas', 'Horas', 'text-right'], ['servicios', 'Servicios', 'text-right'], ['base', 'Base', 'text-right'], ['estado', 'Estado', '']].map(([campo, texto, al]) => (
                                            <th key={campo} className={`py-2 px-3 font-medium ${al}`}>
                                                {campo === 'servicios' ? texto : (
                                                    <button type="button" onClick={() => ordenarPor(campo)} className={`inline-flex items-center gap-1 hover:text-slate-800 ${orden.campo === campo ? 'text-slate-800' : ''}`}>
                                                        {texto}<ArrowUpDown className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </th>
                                        ))}
                                        <th className="py-2 px-3" aria-label="Acciones"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filasPagina.length === 0 && (
                                        <tr><td colSpan={7} className="py-8 text-center text-slate-500">{delMes.length ? 'Ningún cliente con estos filtros.' : `No hay horas ni servicios en ${nombreMes(mesSel)}.`}</td></tr>
                                    )}
                                    {filasPagina.map(x => {
                                        const c = CLIENTES[x.cliente];
                                        const marcada = seleccion.includes(x.cliente);
                                        return (
                                            <tr key={x.cliente} onClick={() => { setClienteAbierto(x.cliente); setPestanaCliente('mes'); }} className={`border-b border-slate-100 last:border-0 cursor-pointer ${marcada ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}`}>
                                                <td className="py-2.5 pl-3 pr-1" onClick={(ev) => ev.stopPropagation()}>
                                                    <input type="checkbox" aria-label={`Seleccionar ${c.nombre}`} className="accent-indigo-600" checked={marcada} onChange={() => marcar(x.cliente)} />
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <span className="block font-medium text-slate-900">{c.nombre}</span>
                                                    <span className="text-[11px] text-slate-500">{c.cif}{veVariasSucursales ? ` · ${sucursal(sucursalDe(x.cliente)).corto}` : ''}{x.peticiones ? ` · ${x.peticiones} ${x.peticiones === 1 ? 'petición' : 'peticiones'}` : ''}</span>
                                                </td>
                                                <td className="py-2.5 px-3 text-right whitespace-nowrap text-slate-700">{x.horas ? `${num(x.horas)} h` : <span className="text-slate-300">—</span>}</td>
                                                <td className="py-2.5 px-3 text-right whitespace-nowrap text-slate-700">{x.nServicios ? <>{x.nServicios} · {euros(x.importeServicios)}</> : <span className="text-slate-300">—</span>}</td>
                                                <td className="py-2.5 px-3 text-right whitespace-nowrap font-medium text-slate-900">{euros(x.base)}</td>
                                                <td className="py-2.5 px-3"><Badge tone={x.estado.tono} dot>{x.estado.texto}</Badge></td>
                                                <td className="py-1.5 px-3 text-right whitespace-nowrap" onClick={(ev) => ev.stopPropagation()}>
                                                    <span className="relative inline-flex items-center gap-1">
                                                        {x.estado.id === 'lista' && <Button size="sm" variant="primary" onClick={() => prepararFactura(x.g)}>Preparar factura</Button>}
                                                        {x.estado.id === 'borrador' && <Button size="sm" onClick={() => prepararFactura(x.g)}>Ver borrador</Button>}
                                                        {x.estado.id === 'facturada' && x.factura && <Button size="sm" variant="ghost" onClick={() => setAbierta(x.factura.id)}>Ver factura</Button>}
                                                        <IconButton icon={MoreHorizontal} title="Más acciones" onClick={() => setMenuFila(menuFila === x.cliente ? null : x.cliente)} />
                                                        {menuFila === x.cliente && <>
                                                            <span className="fixed inset-0 z-20" onClick={() => setMenuFila(null)} />
                                                            <span className="absolute right-0 top-full z-30 mt-1 w-56 rounded-lg border border-slate-200 bg-white shadow-lg py-1 text-left block">
                                                                {[
                                                                    [Building2, 'Abrir el cliente', () => { setClienteAbierto(x.cliente); setPestanaCliente('mes'); }],
                                                                    [BriefcaseBusiness, 'Añadir servicio a facturar', () => { setClienteAbierto(x.cliente); setPestanaCliente('mes'); abrirServicio(x.cliente); }],
                                                                    ...(x.g ? [[Receipt, x.g.borrador ? 'Ver borrador' : 'Preparar factura', () => prepararFactura(x.g)]] : []),
                                                                    ...(x.estado.id === 'esperando' ? [[ArrowUpRight, 'Ir a Horas e incidencias', () => { window.location.hash = '#/horas'; }]] : []),
                                                                    [Receipt, 'Ver sus facturas', () => { setClienteAbierto(x.cliente); setPestanaCliente('facturas'); }],
                                                                    [FilePlus2, 'Nueva factura a mano', () => setNuevaFactura({ cliente: x.cliente })],
                                                                ].map(([Icono, texto, accion]) => (
                                                                    <button key={texto} type="button" onClick={() => { setMenuFila(null); accion(); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-slate-800">
                                                                        <Icono className="w-3.5 h-3.5 text-slate-400" />{texto}
                                                                    </button>
                                                                ))}
                                                            </span>
                                                        </>}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-t border-slate-100 text-[11px] text-slate-500">
                            <span>
                                {filasMes.length ? `${paginaActual * POR_PAGINA + 1}–${Math.min(filasMes.length, (paginaActual + 1) * POR_PAGINA)} de ${filasMes.length} clientes` : '0 clientes'}
                                {' · '}Base de los filtrados: <b className="text-slate-700">{euros(filasMes.reduce((t, x) => t + x.base, 0))}</b>
                            </span>
                            {paginas > 1 && (
                                <span className="flex items-center gap-1">
                                    <IconButton icon={ChevronLeft} title="Página anterior" onClick={() => setPagina(Math.max(0, paginaActual - 1))} disabled={paginaActual === 0} />
                                    <span>Página {paginaActual + 1} de {paginas}</span>
                                    <IconButton icon={ChevronRight} title="Página siguiente" onClick={() => setPagina(Math.min(paginas - 1, paginaActual + 1))} disabled={paginaActual >= paginas - 1} />
                                </span>
                            )}
                        </div>
                    </Card>
                    <Notice tone="neutral" icon={Info}>Pulsa un cliente para ver sus horas y servicios del mes, añadir un servicio a su factura o ver sus facturas. Las tarifas son las del presupuesto aceptado de cada petición.</Notice>
                </>}

                {pestana === 'facturas' && <>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        <KpiTile label="En borrador" value={deSucursal.filter(x => x.estado === 'borrador').length} hint="Por revisar y emitir" active={filtroEstado === 'borrador'} onClick={() => setFiltroEstado('borrador')} />
                        <KpiTile label="Pendiente de cobro" tone="info" value={euros(suma(pendientes))} hint={`${pendientes.length} ${pendientes.length === 1 ? 'factura' : 'facturas'}`} active={filtroEstado === 'pendientes'} onClick={() => setFiltroEstado('pendientes')} />
                        <KpiTile label="Vencidas" tone="danger" value={euros(suma(vencidas))} hint={`${vencidas.length} ${vencidas.length === 1 ? 'factura' : 'facturas'}`} active={filtroEstado === 'vencida'} onClick={() => setFiltroEstado('vencida')} />
                    </div>

                    {/* FILTROS DE LAS FACTURAS */}
                    <Card className="p-3">
                        <div className="flex flex-wrap items-end gap-3">
                            <label className="flex flex-col gap-1 min-w-[200px] flex-1 sm:flex-none sm:w-64">
                                {etiqueta('Buscar')}
                                <SearchInput value={busqueda} onChange={(v) => { setBusqueda(v); setPaginaFact(0); }} placeholder="Número, cliente, petición o puesto..." />
                            </label>
                            {veVariasSucursales && (
                                <label className="flex flex-col gap-1">
                                    {etiqueta('Sucursal')}
                                    <Select value={filtroSucursal} onChange={(e) => { const v = e.target.value; setFiltroSucursal(v); setPaginaFact(0); if (filtroCliente && v && sucursalDe(filtroCliente) !== v) { setFiltroCliente(''); setFiltroPeticion(''); } }} aria-label="Sucursal">
                                        <option value="">Todas las sucursales</option>
                                        {SUCURSALES.filter(x => SUCURSALES_USUARIO.includes(x.id)).map(x => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                                    </Select>
                                </label>
                            )}
                            <div className="flex flex-col gap-1 min-w-[240px] flex-1 sm:flex-none sm:w-72">
                                {etiqueta('Cliente', <Building2 className="w-3.5 h-3.5 text-slate-400" />)}
                                <BuscadorCliente valor={filtroCliente} onChange={(v) => { setFiltroCliente(v); setFiltroPeticion(''); setPaginaFact(0); }} ids={Object.keys(CLIENTES).filter(id => enSucursal(id))} sucursalDe={sucursalDe} vacio="Todos los clientes" />
                            </div>
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
                                <Select value={periodo} onChange={(e) => { setPeriodo(e.target.value); setPaginaFact(0); }} aria-label="Periodo">
                                    {PERIODOS.map(p => <option key={p.id} value={p.id}>{p.texto}</option>)}
                                </Select>
                            </label>
                            {periodo === 'fechas' && <>
                                <label className="flex flex-col gap-1">{etiqueta('Desde')}<TextInput type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-auto!" /></label>
                                <label className="flex flex-col gap-1">{etiqueta('Hasta')}<TextInput type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-auto!" /></label>
                            </>}
                            <label className="flex flex-col gap-1">
                                {etiqueta('Estado')}
                                <Select value={filtroEstado} onChange={(e) => { setFiltroEstado(e.target.value); setPaginaFact(0); }} aria-label="Estado">
                                    <option value="">Todos los estados</option>
                                    <option value="borrador">Borrador</option>
                                    <option value="pendientes">Pendientes de cobro (todas)</option>
                                    <option value="vencida">Vencidas</option>
                                    <option value="cobrada">Cobradas</option>
                                    <option value="anulada">Anuladas</option>
                                    <option value="rectificativa">Rectificativas</option>
                                </Select>
                            </label>
                            {hayFiltros && <Button size="sm" variant="ghost" icon={X} onClick={() => { limpiar(); setPaginaFact(0); }}>Limpiar</Button>}
                        </div>
                        <p className="mt-2 text-[11px] text-slate-500">{rangoDesde > '0000-01-01' ? `Del ${fechaES(rangoDesde)}` : 'Desde el principio'}{rangoHasta < '9999-12-31' ? ` al ${fechaES(rangoHasta)}` : ''}. Los borradores cuentan por el mes que facturan.</p>
                    </Card>

                    {/* POR SUCURSAL */}
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
                                            const pendiente = fs.filter(x => PENDIENTES_COBRO.includes(estadoDe(x).id)).reduce((t, x) => t + totalesDe(x).pendiente, 0);
                                            const vencido = fs.filter(x => estadoDe(x).id === 'vencida').reduce((t, x) => t + totalesDe(x).pendiente, 0);
                                            return (
                                                <tr key={su.id} onClick={() => setFiltroSucursal(su.id)} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer" title={`Ver solo ${su.nombre}`}>
                                                    <td className="py-2.5 px-3 font-medium text-slate-900">{su.nombre}</td>
                                                    <td className="py-2.5 px-3 text-right text-slate-700">{fs.length}</td>
                                                    <td className="py-2.5 px-3 text-right text-slate-900 whitespace-nowrap">{euros(fs.reduce((t, x) => t + totalesDe(x).total, 0))}</td>
                                                    <td className="py-2.5 px-3 text-right text-slate-700 whitespace-nowrap">{euros(pendiente)}</td>
                                                    <td className={`py-2.5 px-3 text-right whitespace-nowrap ${vencido ? 'text-rose-700' : 'text-slate-400'}`}>{euros(vencido)}</td>
                                                    <td className="py-2.5 px-3 text-right text-slate-700 whitespace-nowrap">{euros(pf.reduce((t, g) => t + baseGrupo(g), 0))}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <p className="px-4 py-2 text-[11px] text-slate-500 border-t border-slate-100">Con las fechas y el cliente elegidos. Pulsa una sucursal para ver solo sus facturas.</p>
                        </Card>
                    )}

                    {/* LISTA DE FACTURAS */}
                    <SectionTitle actions={
                        <span className="relative">
                            <Button size="sm" icon={Download} disabled={!emitidasLista.length} onClick={() => setMenuExportar(m => !m)}>Descargar ({emitidasLista.length})</Button>
                            {menuExportar && (
                                <span className="absolute right-0 z-20 mt-1 w-72 rounded-lg border border-slate-200 bg-white shadow-lg py-1 text-xs block">
                                    <button type="button" onClick={exportarFacturas} className="w-full text-left px-3 py-2 hover:bg-slate-50 flex gap-2"><FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" /><span><span className="block font-medium text-slate-900">Excel: una fila por factura</span><span className="text-slate-500">Número, fechas, cliente, sucursal, base, IVA, total y cobro</span></span></button>
                                    <button type="button" onClick={exportarPersonas} className="w-full text-left px-3 py-2 hover:bg-slate-50 flex gap-2"><FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" /><span><span className="block font-medium text-slate-900">Excel: horas por persona y puesto</span><span className="text-slate-500">Una fila por persona, puesto y concepto, con su importe. Para estadísticas.</span></span></button>
                                    <button type="button" onClick={pdfFiltradas} className="w-full text-left px-3 py-2 hover:bg-slate-50 flex gap-2 border-t border-slate-100"><Printer className="w-4 h-4 text-indigo-600 shrink-0" /><span><span className="block font-medium text-slate-900">PDF de todas</span><span className="text-slate-500">Las facturas emitidas de la lista, una por página</span></span></button>
                                </span>
                            )}
                        </span>
                    }>Facturas</SectionTitle>
                    <p className="-mt-2 text-[11px] text-slate-500">Se descargan las facturas emitidas que se ven con los filtros de arriba, por ejemplo las de un mes para la gestoría o la contabilidad.</p>
                    {lista.length === 0 ? (
                        <Card><EmptyState icon={Receipt} title="No hay facturas con estos filtros" action={hayFiltros && <Button onClick={limpiar}>Limpiar filtros</Button>} /></Card>
                    ) : (() => {
                        const paginasF = Math.ceil(lista.length / POR_PAGINA);
                        const pf = Math.min(paginaFact, paginasF - 1);
                        return (
                            <Card className="overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                                                <th className="py-2 px-3 font-medium">Número</th>
                                                <th className="py-2 px-3 font-medium">Cliente</th>
                                                <th className="py-2 px-3 font-medium">Periodo</th>
                                                <th className="py-2 px-3 font-medium">Emisión</th>
                                                <th className="py-2 px-3 font-medium">Vencimiento</th>
                                                <th className="py-2 px-3 font-medium text-right">Total</th>
                                                <th className="py-2 px-3 font-medium text-right">Pendiente</th>
                                                <th className="py-2 px-3 font-medium">Estado</th>
                                                <th className="py-2 px-2" aria-label="Descargar"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lista.slice(pf * POR_PAGINA, (pf + 1) * POR_PAGINA).map(x => {
                                                const tt = totalesDe(x);
                                                const e = estadoDe(x);
                                                const d = x.vencimiento ? diasEntre(hoyIso(), x.vencimiento) : null;
                                                return (
                                                    <tr key={x.id} onClick={() => setAbierta(x.id)} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer">
                                                        <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-900">{x.numero || <span className="text-slate-500">Borrador</span>}</td>
                                                        <td className="py-2.5 px-3">
                                                            <button type="button" onClick={(ev) => { ev.stopPropagation(); setClienteAbierto(x.cliente); setPestanaCliente('facturas'); }} className="text-left text-slate-800 hover:text-indigo-700 hover:underline">{CLIENTES[x.cliente].nombre}</button>
                                                            {veVariasSucursales && <span className="block text-[11px] text-slate-500">{sucursal(sucursalDe(x.cliente)).corto}</span>}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-slate-700">{/^\d{4}-\d{2}$/.test(x.periodo) ? mayus(nombreMes(x.periodo)) : x.periodo}{x.rectifica ? <span className="block text-[11px] text-slate-500">rectifica {x.rectifica}</span> : ''}</td>
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
                                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-t border-slate-100 text-[11px] text-slate-500">
                                    <span>{pf * POR_PAGINA + 1}–{Math.min(lista.length, (pf + 1) * POR_PAGINA)} de {lista.length} facturas</span>
                                    {paginasF > 1 && (
                                        <span className="flex items-center gap-1">
                                            <IconButton icon={ChevronLeft} title="Página anterior" onClick={() => setPaginaFact(Math.max(0, pf - 1))} disabled={pf === 0} />
                                            <span>Página {pf + 1} de {paginasF}</span>
                                            <IconButton icon={ChevronRight} title="Página siguiente" onClick={() => setPaginaFact(Math.min(paginasF - 1, pf + 1))} disabled={pf >= paginasF - 1} />
                                        </span>
                                    )}
                                </div>
                            </Card>
                        );
                    })()}
                </>}
            </Page>

            {/* FICHA DE FACTURACIÓN DEL CLIENTE: su mes, sus facturas y sus datos */}
            {clienteAbierto && !f && (() => {
                const c = CLIENTES[clienteAbierto];
                const x = filaDe(clienteAbierto, mesSel);
                const hs = horas.filter(h => PETICIONES[h.petId].cliente === clienteAbierto && h.mes === mesSel);
                const svs = servicios.filter(s => s.cliente === clienteAbierto && s.fecha.slice(0, 7) === mesSel);
                const otrosMeses = porFacturar.filter(g => g.cliente === clienteAbierto && g.mes !== mesSel);
                const susFacturas = facturas.filter(fx => fx.cliente === clienteAbierto).sort((a, b) => (b.emision || '9999').localeCompare(a.emision || '9999'));
                const pendienteCobro = susFacturas.filter(fx => PENDIENTES_COBRO.includes(estadoDe(fx).id)).reduce((t, fx) => t + totalesDe(fx).pendiente, 0);
                return (
                    <Drawer
                        title={c.nombre}
                        subtitle={`${c.cif}${veVariasSucursales ? ` · ${sucursal(sucursalDe(clienteAbierto)).nombre}` : ''} · ${c.email}`}
                        leading={<Building2 className="w-5 h-5 text-slate-400" />}
                        status={x && <Badge tone={x.estado.tono} dot>{mayus(nombreMes(mesSel))}: {x.estado.texto.toLowerCase()}</Badge>}
                        onClose={() => setClienteAbierto(null)}
                        width="max-w-2xl"
                        toolbar={<Tabs className="px-5" active={pestanaCliente} onChange={setPestanaCliente} tabs={[
                            { id: 'mes', label: mayus(nombreMes(mesSel)), icon: CalendarDays },
                            { id: 'facturas', label: 'Facturas', icon: Receipt, count: susFacturas.length },
                            { id: 'datos', label: 'Datos de facturación', icon: Building2 },
                        ]} />}
                    >
                        <div className="p-5 space-y-4 text-xs">
                            {pestanaCliente === 'mes' && <>
                                {otrosMeses.length > 0 && (
                                    <Notice tone="warning" icon={AlertTriangle}>
                                        También tiene por facturar: {otrosMeses.map((g, i) => <React.Fragment key={g.mes}>{i > 0 && ', '}<button type="button" className="font-medium underline" onClick={() => cambiarMes(g.mes)}>{nombreMes(g.mes)}</button></React.Fragment>)}.
                                    </Notice>
                                )}
                                <div>
                                    <SectionTitle>Horas del mes</SectionTitle>
                                    {hs.length === 0 ? <p className="text-slate-500">Sin horas en {nombreMes(mesSel)}.</p> : (
                                        <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
                                            {hs.map(h => {
                                                const total = Object.values(h.horas).reduce((a, b) => a + b, 0);
                                                const base = lineasDesdeHoras(h).reduce((t, l) => t + redondear(l.cantidad * l.precio), 0);
                                                const personas = HORAS_PERSONA[`${h.petId}|${h.mes}`] || [];
                                                return (
                                                    <li key={h.petId} className="px-3 py-2.5">
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <span>
                                                                <span className="block text-slate-900">{PETICIONES[h.petId].puesto} · {h.petId}</span>
                                                                <span className="text-[11px] text-slate-500">{personas.length} {personas.length === 1 ? 'persona' : 'personas'} · {num(total)} h a {euros(PETICIONES[h.petId].tarifa)}/h (presupuesto {PETICIONES[h.petId].presupuesto})</span>
                                                            </span>
                                                            <span className="text-right">
                                                                <span className="block text-slate-900">{euros(base)}</span>
                                                                {h.listo ? <Badge tone="success" dot>Validadas</Badge> : <Badge tone="warning" dot>Faltan {h.partesPendientes} partes</Badge>}
                                                            </span>
                                                        </div>
                                                        {personas.length > 0 && (
                                                            <details className="mt-1.5">
                                                                <summary className="cursor-pointer text-[11px] font-medium text-indigo-700 select-none">Horas por persona</summary>
                                                                <table className="mt-1.5 w-full text-[11px]">
                                                                    <tbody>
                                                                        {personas.map(([nombre, hp]) => {
                                                                            const th = CONCEPTOS.reduce((t, k) => t + (hp[k.id] || 0), 0);
                                                                            const imp = CONCEPTOS.reduce((t, k) => t + redondear((hp[k.id] || 0) * redondear(PETICIONES[h.petId].tarifa * k.recargo)), 0);
                                                                            return (
                                                                                <tr key={nombre} className="border-t border-slate-100">
                                                                                    <td className="py-1 pr-2 text-slate-800">{nombre}</td>
                                                                                    <td className="py-1 px-2 text-slate-500">{CONCEPTOS.filter(k => hp[k.id]).map(k => `${num(hp[k.id])} ${k.texto.replace('horas ', '')}`).join(' · ')}</td>
                                                                                    <td className="py-1 px-2 text-right whitespace-nowrap">{num(th)} h</td>
                                                                                    <td className="py-1 pl-2 text-right whitespace-nowrap text-slate-900">{euros(redondear(imp))}</td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </details>
                                                        )}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                                <div>
                                    <SectionTitle actions={<Button size="sm" icon={Plus} onClick={() => abrirServicio(clienteAbierto)}>Añadir servicio</Button>}>Servicios del mes</SectionTitle>
                                    {svs.length === 0 ? <p className="text-slate-500">Ninguno. Selección, formación, reconocimientos... se añaden aquí y entran en la factura del mes.</p> : (
                                        <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
                                            {svs.map(s => {
                                                const fx = facturaDeServicio(s);
                                                return (
                                                    <li key={s.id} className="flex items-start justify-between gap-2 px-3 py-2.5">
                                                        <span className="flex items-start gap-1.5 min-w-0"><BriefcaseBusiness className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                                                            <span className="min-w-0"><span className="block text-slate-900">{servicioDe(s.servicio).nombre}</span><span className="text-[11px] text-slate-500">{s.descripcion} · {fechaES(s.fecha)}{s.salario != null ? ` · ${num(s.porcentaje)} % de ${euros(s.salario)}` : ` · ${num(s.cantidad)} × ${euros(s.precio)}`}</span></span>
                                                        </span>
                                                        <span className="text-right whitespace-nowrap">
                                                            <span className="block text-slate-900">{euros(importeServicio(s))}</span>
                                                            <span className="text-[11px] text-slate-500">{!fx ? 'Por facturar' : fx.numero ? `En ${fx.numero}` : 'En el borrador'}</span>
                                                        </span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                                <div className="rounded-lg bg-slate-50 px-3 py-3 flex flex-wrap items-center justify-between gap-2">
                                    <span>
                                        <span className="block text-[11px] text-slate-500">Base de la factura de {nombreMes(mesSel)}</span>
                                        <span className="text-sm font-semibold text-slate-900">{euros(x ? x.base : 0)}</span>
                                    </span>
                                    <span className="flex flex-wrap gap-2">
                                        {x?.g && <Button size="sm" variant={x.estado.id === 'esperando' ? 'secondary' : 'primary'} icon={Receipt} onClick={() => abrirFacturaDe(x)}>{x.g.borrador ? 'Ver borrador' : x.estado.id === 'esperando' ? 'Preparar borrador' : 'Preparar factura'}</Button>}
                                        {!x?.g && x?.factura && <Button size="sm" icon={Eye} onClick={() => abrirFacturaDe(x)}>Ver {x.factura.numero}</Button>}
                                        <Button size="sm" variant="ghost" icon={FilePlus2} onClick={() => setNuevaFactura({ cliente: clienteAbierto })}>Nueva factura</Button>
                                    </span>
                                </div>
                                {x?.estado.id === 'esperando' && <p className="text-amber-700">Faltan partes por validar en Horas e incidencias. Puedes preparar el borrador, pero no emitirlo.</p>}
                            </>}

                            {pestanaCliente === 'facturas' && (
                                susFacturas.length === 0 ? <p className="text-slate-500">Todavía no tiene facturas.</p> : <>
                                    <p className="text-slate-600">{susFacturas.length} {susFacturas.length === 1 ? 'factura' : 'facturas'} · {euros(pendienteCobro)} pendiente de cobro</p>
                                    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                                        {susFacturas.map(fx => {
                                            const e = estadoDe(fx);
                                            return (
                                                <li key={fx.id}>
                                                    <button type="button" onClick={() => { setClienteAbierto(null); setAbierta(fx.id); }} className="w-full flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-50">
                                                        <span>
                                                            <span className="block font-medium text-slate-900">{fx.numero || 'Borrador'}</span>
                                                            <span className="text-[11px] text-slate-500">{/^\d{4}-\d{2}$/.test(fx.periodo) ? mayus(nombreMes(fx.periodo)) : fx.periodo}{fx.emision ? ` · emitida el ${fechaES(fx.emision)}` : ''}</span>
                                                        </span>
                                                        <span className="flex items-center gap-2">
                                                            <span className="text-slate-900">{euros(totalesDe(fx).total)}</span>
                                                            <Badge tone={e.tono} dot>{e.texto}</Badge>
                                                        </span>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </>
                            )}

                            {pestanaCliente === 'datos' && <>
                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                                    {[['Razón social', c.nombre], ['CIF', c.cif], ['Dirección', c.direccion], ['Correo de facturación', c.email], ['Forma de pago', c.pago], ['Días fijos de pago', c.diasFijos.length ? c.diasFijos.join(' y ') : 'No'], ['IVA', `${c.iva} %`], ['Detalle de las facturas de horas', c.detalle === 'persona' ? 'Por persona' : 'Por concepto']].map(([k, v]) => (
                                        <div key={k}><dt className="text-[11px] text-slate-500">{k}</dt><dd className="text-slate-900">{v}</dd></div>
                                    ))}
                                </dl>
                                {c.fichaIncompleta && <Notice tone="warning" icon={AlertTriangle}>{c.fichaIncompleta}</Notice>}
                                <Button size="sm" icon={ArrowUpRight} onClick={() => { window.location.hash = '#/empresas'; }}>Cambiarlos en la ficha de Empresas</Button>
                            </>}
                        </div>
                    </Drawer>
                );
            })()}

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
                                                    {borrador && <td className="py-1 px-2 text-right">{(l.manual || l.servicio) && <IconButton icon={Trash2} title={l.servicio ? 'Quitar de esta factura (el servicio vuelve a quedar pendiente de facturar)' : 'Quitar línea'} onClick={() => setLineaAEliminar(l)} />}</td>}
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
                                                        <th className="py-2 px-3 font-medium">Puesto</th>
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
                                                                {p.validadas && <span className="block text-[11px] text-amber-700">Validadas en sus partes: {num(p.validadas.normales)} h normales</span>}
                                                            </td>
                                                            <td className="py-2 px-3 text-slate-700"><span className="whitespace-nowrap">{PETICIONES[p.petId].puesto}</span><span className="block text-[11px] text-slate-500">{p.petId}{new Set(filas.map(x => x.mes)).size > 1 ? ` · ${nombreMes(p.mes)}` : ''}</span></td>
                                                            {usados.map(c => <td key={c.id} className={`py-2 px-3 text-right whitespace-nowrap ${p.validadas && c.id === 'normales' ? 'text-amber-700 font-medium' : ''}`}>{p.horas[c.id] ? num(p.horas[c.id]) : '—'}</td>)}
                                                            <td className="py-2 px-3 text-right whitespace-nowrap text-slate-900">{num(usados.reduce((s, c) => s + (p.horas[c.id] || 0), 0))}</td>
                                                            <td className="py-2 px-3 text-right whitespace-nowrap text-slate-900">{euros(importe(p))}</td>
                                                        </tr>
                                                    ))}
                                                    <tr className="bg-slate-50 font-medium text-slate-900">
                                                        <td className="py-2 px-3">{filas.length} personas</td>
                                                        <td className="py-2 px-3 font-normal text-slate-500">{new Set(filas.map(x => PETICIONES[x.petId].puesto)).size} {new Set(filas.map(x => PETICIONES[x.petId].puesto)).size === 1 ? 'puesto' : 'puestos'}</td>
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
                                                <thead><tr className="border-b border-slate-300 text-[11px] text-slate-500"><th className="py-1.5 font-medium">Persona</th><th className="py-1.5 pl-3 font-medium">Puesto y petición</th>{usados.map(c => <th key={c.id} className="py-1.5 pl-3 font-medium text-right">{mayus(c.texto.replace('horas ', ''))}</th>)}<th className="py-1.5 pl-3 font-medium text-right">Total h</th><th className="py-1.5 pl-3 font-medium text-right">Importe</th></tr></thead>
                                                <tbody>
                                                    {filas.map(p => <tr key={`${p.petId}-${p.mes}-${p.nombre}`} className="border-b border-slate-100"><td className="py-1 pr-2">{p.nombre}</td><td className="py-1 pl-3">{PETICIONES[p.petId].puesto} · {p.petId}</td>{usados.map(c => <td key={c.id} className="py-1 pl-3 text-right">{p.horas[c.id] ? num(p.horas[c.id]) : '—'}</td>)}<td className="py-1 pl-3 text-right">{num(totalH(p))}</td><td className="py-1 pl-3 text-right whitespace-nowrap">{euros(importe(p))}</td></tr>)}
                                                    <tr className="text-slate-900"><td className="py-1.5 pr-2">{filas.length} personas</td><td></td>{usados.map(c => <td key={c.id} className="py-1.5 pl-3 text-right">{num(redondear(filas.reduce((s, p) => s + (p.horas[c.id] || 0), 0)))}</td>)}<td className="py-1.5 pl-3 text-right">{num(redondear(filas.reduce((s, p) => s + totalH(p), 0)))}</td><td className="py-1.5 pl-3 text-right whitespace-nowrap">{euros(redondear(filas.reduce((s, p) => s + importe(p), 0)))}</td></tr>
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
                    <Modal title={n.enFactura ? 'Añadir servicio a esta factura' : 'Añadir servicio a facturar'} subtitle="Selección, formación, reconocimientos... Entra en la factura del cliente de ese mes, con sus horas" onClose={() => setNuevoServicio(null)} size="max-w-lg"
                        footer={<>
                            <Button onClick={() => setNuevoServicio(null)}>Cancelar</Button>
                            <Button variant="primary" icon={CheckCircle2} disabled={!valido} onClick={guardarServicio}>{n.enFactura ? 'Añadir a la factura' : 'Registrar servicio'}</Button>
                        </>}>
                        <div className="space-y-3 text-xs">
                            <Field label="Cliente">
                                {n.enFactura ? <div className="text-slate-900">{CLIENTES[n.cliente].nombre}</div> : (
                                    <BuscadorCliente valor={n.cliente} onChange={(v) => cambiar('cliente', v)} ids={Object.keys(CLIENTES).filter(id => SUCURSALES_USUARIO.includes(sucursalDe(id)))} destacados={porFacturar.map(g => g.cliente)} sucursalDe={sucursalDe} />
                                )}
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
                            {!n.enFactura && n.cliente && <p className="text-[11px] text-slate-500">Entra en la factura de {nombreMes(n.fecha.slice(0, 7))} de {CLIENTES[n.cliente].nombre}, junto a sus horas si las hay.</p>}
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
                            <BuscadorCliente valor={nuevaFactura.cliente} onChange={(v) => setNuevaFactura({ cliente: v })} ids={Object.keys(CLIENTES).filter(id => SUCURSALES_USUARIO.includes(sucursalDe(id)))} destacados={porFacturar.map(g => g.cliente)} sucursalDe={sucursalDe} />
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
                    showToast('Borrador descartado. Las horas y los servicios vuelven a quedar pendientes de facturar.');
                }}>
                    Las horas y los servicios vuelven a quedar pendientes de facturar. No se ha emitido ninguna factura, así que no hace falta rectificativa.
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
