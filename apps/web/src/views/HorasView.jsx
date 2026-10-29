// Horas e incidencias: parte semanal de horas de cada petición, validación del cliente y cierre del mes.
// Sigue a Personal en misión; lo cerrado pasa a facturación y a nómina.
// No partió de ninguna maqueta de design/: se diseñó directamente con el sistema común.
import React, { useState, useMemo } from 'react';
import {
    Clock, Building2, MapPin, CalendarDays, ChevronLeft, ChevronRight, Send, CheckCircle2, AlertTriangle,
    Wand2, Undo2, Info, X, ChevronDown, FileCheck2, Receipt, Wallet, Lock, ArrowUpRight, PencilLine, CalendarRange, Printer, MonitorCheck
} from 'lucide-react';
import {
    Page, PageHeader, Card, SectionTitle, KpiTile, EmptyState, Notice, Button, IconButton, Badge, Avatar,
    SearchInput, Select, Field, TextInput, Modal, Drawer, Tabs
} from '../ui';

// ==========================================
// DATOS DE EJEMPLO (las mismas peticiones y personas que en Personal en misión)
// ==========================================
// horario: horas previstas de lunes a domingo, del horario de la petición.
// diasEspeciales: días fuera del horario que se trabajaron (por ejemplo, la apertura del congreso).
// Contactos del cliente (ficha de Empresas). validaHoras: tiene marcado el rol «Valida horas».
const CONTACTOS = {
    hosteleria: [
        { nombre: 'Montse Ferrer', cargo: 'Jefa de sala', email: 'mferrer@premiumeventsbcn.cat', validaHoras: true },
        { nombre: 'Sergi Pujol', cargo: 'Coordinador de Eventos', email: 'spujol@premiumeventsbcn.cat', validaHoras: false },
    ],
    translog: [
        { nombre: 'Javier Ugarte Elorza', cargo: 'Jefe de Planta / Operaciones', email: 'j.ugarte@translog-norte.es', validaHoras: true },
        { nombre: 'Marta Gómez Arana', cargo: 'Responsable de RRHH y Selección', email: 'marta.gomez@translog-norte.es', validaHoras: false },
    ],
};
const HOSTELERIA = 'Hostelería & Eventos Premium BCN, S.L.';
const TRANSLOG = 'Trans-Logística Ibérica Norte, S.L.';
const PARTIDA = { horario: [8, 8, 8, 8, 6, 0, 0], tramos: ['08:30 a 17:30', '08:30 a 17:30', '08:30 a 17:30', '08:30 a 17:30', '08:30 a 14:30'] };
const PETICIONES = {
    'PET-2026-0044': {
        puesto: 'Camarero/a de sala', turno: 'Jornada partida', cliente: HOSTELERIA, clienteId: 'hosteleria',
        centro: 'Recinto de congresos - Barcelona', responsable: 'Nuria Castells',
        inicio: '2026-10-10', fin: '2026-11-30', horario: [8, 8, 8, 8, 6, 0, 0], tramos: ['08:30 a 17:30', '08:30 a 17:30', '08:30 a 17:30', '08:30 a 17:30', '08:30 a 14:30'],
        nocturno: false, diasEspeciales: { '2026-10-10': 8, '2026-10-11': 8 },
    },
    'PET-2026-0031': {
        puesto: 'Mozo/a de almacén', turno: 'Turno de mañana', cliente: TRANSLOG, clienteId: 'translog',
        centro: 'HUB central Basauri (Bizkaia) - Nave 2', responsable: 'Ane Uriarte',
        inicio: '2026-07-01', fin: '2026-09-30', horario: [7.5, 7.5, 7.5, 7.5, 7.5, 0, 0], tramos: Array(5).fill('06:00 a 14:00'),
        nocturno: false, diasEspeciales: {},
    },
    // Empiezan en noviembre (siguen en Contratos y altas hasta su primer día)
    'PET-2026-0048': {
        puesto: 'Operario/a de almacén', turno: 'Turno de mañana', cliente: TRANSLOG, clienteId: 'translog',
        centro: 'HUB central Basauri (Bizkaia) - Nave 2', responsable: 'Ane Uriarte',
        inicio: '2026-11-03', fin: '2027-01-29', horario: [7.5, 7.5, 7.5, 7.5, 7.5, 0, 0], tramos: Array(5).fill('06:00 a 14:00'),
        nocturno: false, diasEspeciales: {},
    },
    'PET-2026-0045': {
        puesto: 'Ayudante de cocina', turno: 'Jornada partida', cliente: HOSTELERIA, clienteId: 'hosteleria',
        centro: 'Recinto de congresos - Barcelona', responsable: 'Nuria Castells',
        inicio: '2026-11-05', fin: '2026-11-30', ...PARTIDA, nocturno: false, diasEspeciales: {},
    },
    'PET-2026-0050': {
        puesto: 'Carretillero/a', turno: 'Turno de tarde', cliente: TRANSLOG, clienteId: 'translog',
        centro: 'HUB central Basauri (Bizkaia) - Nave 2', responsable: 'Jon Ibarra',
        inicio: '2026-11-10', fin: '2027-01-29', horario: [7.5, 7.5, 7.5, 7.5, 7.5, 0, 0], tramos: Array(5).fill('14:00 a 22:00'),
        nocturno: false, diasEspeciales: {},
    },
};
const contactosDe = (pet) => CONTACTOS[pet.clienteId] || [];
const validadorDe = (pet) => contactosDe(pet).find(c => c.validaHoras) || contactosDe(pet)[0];
const CLIENTES = [...new Set(Object.values(PETICIONES).map(p => p.cliente))];
const persona = (petId, plaza, nombre, inicio, fin) => ({ id: `${petId}-${plaza}`, petId, plaza, nombre, inicio, fin });
const PERSONAS = [
    persona('PET-2026-0044', 1, 'Garazi Uribe Arana', '2026-10-10', '2026-11-30'),
    persona('PET-2026-0044', 2, 'Pablo Ruiz Cano', '2026-10-10', '2026-11-30'),
    persona('PET-2026-0044', 4, 'Youssef Amrani', '2026-10-10', '2026-11-30'),
    persona('PET-2026-0044', 5, 'Lucía Ferrer Sanz', '2026-10-10', '2026-11-30'),
    persona('PET-2026-0044', 6, 'Marc Puig Soler', '2026-10-10', '2026-11-10'),
    persona('PET-2026-0044', 7, 'Aitana Roca Vidal', '2026-10-10', '2026-11-10'),
    persona('PET-2026-0044', 8, 'Daniel Sousa Prieto', '2026-10-10', '2026-11-30'),
    persona('PET-2026-0044', 9, 'Irene Campos Gil', '2026-10-10', '2026-11-30'),
    persona('PET-2026-0044', 10, 'Óscar León Mena', '2026-10-10', '2026-11-30'),
    ...['Clara Esteve Ros', 'Bruno Lage Costa', 'Nerea Olabarria Gil', 'Adrián Vela Soto', 'Paula Rius Ferrer', 'Sergio Navas Peña']
        .map((n, i) => persona('PET-2026-0031', i + 1, n, '2026-07-01', '2026-09-30')),
    // Las mismas personas que en Contratos y altas
    ...['Jon Ander Etxebarria Bilbao', 'Ainhoa Larrazabal Urkijo', 'Mamadou Diallo', 'Laura Morales San Sebastián', 'Iker Agirrebeitia Mendia']
        .map((n, i) => persona('PET-2026-0048', i + 1, n, '2026-11-03', '2027-01-29')),
    ...['Noa Serra Pons', 'Hugo Martín Vera', 'Ane Goikoetxea Ruiz', 'Iván Molina Prat']
        .map((n, i) => persona('PET-2026-0045', i + 1, n, '2026-11-05', '2026-11-30')),
    ...['Unai García Zabaleta', 'Carlos Manuel Ortiz Reyes']
        .map((n, i) => persona('PET-2026-0050', i + 1, n, '2026-11-10', '2027-01-29')),
];
const FESTIVOS = { '2026-10-12': 'Fiesta Nacional de España', '2026-11-01': 'Todos los Santos', '2026-08-15': 'Asunción de la Virgen' };
// Incidencias que se apuntan en un día. sinHoras: ese día no se cobran ni se pagan horas trabajadas.
const INCIDENCIAS = [
    { id: 'baja', texto: 'Baja médica (IT)', corto: 'Baja', sinHoras: true, tono: 'text-amber-700 bg-amber-50' },
    { id: 'accidente', texto: 'Accidente de trabajo', corto: 'Accid.', sinHoras: true, tono: 'text-rose-700 bg-rose-50' },
    { id: 'aus_just', texto: 'Ausencia justificada', corto: 'Aus. J.', sinHoras: true, tono: 'text-blue-700 bg-blue-50' },
    { id: 'aus_injust', texto: 'Ausencia injustificada', corto: 'Ausencia', sinHoras: true, tono: 'text-rose-700 bg-rose-50' },
    { id: 'vacaciones', texto: 'Vacaciones', corto: 'Vac.', sinHoras: true, tono: 'text-blue-700 bg-blue-50' },
    { id: 'permiso', texto: 'Permiso retribuido', corto: 'Permiso', sinHoras: true, tono: 'text-blue-700 bg-blue-50' },
    { id: 'retraso', texto: 'Retraso', corto: 'Retraso', sinHoras: false, tono: 'text-amber-700 bg-amber-50' },
];
const incDe = (id) => INCIDENCIAS.find(i => i.id === id);
const ESTADOS_PARTE = {
    borrador: { texto: 'Borrador', tono: 'neutral' },
    enviado: { texto: 'Pendiente del cliente', tono: 'info' },
    reparos: { texto: 'Con reparos', tono: 'warning' },
    validado: { texto: 'Validado', tono: 'success' },
    cerrado: { texto: 'Cerrado', tono: 'neutral' },
    programado: { texto: 'Próxima semana', tono: 'neutral' },
};
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DIAS_LARGOS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const MAX_HORAS_DIA = 9;

// ==========================================
// UTILIDADES
// ==========================================
const hoyIso = () => new Date().toISOString().slice(0, 10);
const fechaES = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');
const ddmm = (iso) => fechaES(iso).slice(0, 5);
const sumar = (iso, n) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const diaSemana = (iso) => (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7;
const lunesDe = (iso) => sumar(iso, -diaSemana(iso));
const diasDe = (lunes) => Array.from({ length: 7 }, (_, i) => sumar(lunes, i));
const mesDe = (iso) => iso.slice(0, 7);
const nombreMes = (mes) => `${MESES[Number(mes.slice(5)) - 1]} de ${mes.slice(0, 4)}`;
const fmtH = (n) => {
    if (n == null) return '';
    const r = Math.round(n * 100) / 100;
    return String(r).replace('.', ',');
};
const fmtTotal = (n) => (Math.round(n * 100) / 100).toLocaleString('es-ES', { maximumFractionDigits: 2 });
const clave = (petId, lunes) => `${petId}|${lunes}`;
const enMision = (p, fecha) => fecha >= p.inicio && fecha <= p.fin;
const previsto = (pet, fecha) => pet.diasEspeciales[fecha] ?? pet.horario[diaSemana(fecha)];

// Horas de un día repartidas por concepto (los del presupuesto: normal, extra, nocturna, fin de semana, festiva)
const conceptosDe = (pet, fecha, c) => {
    const r = { normales: 0, extra: 0, nocturnas: 0, finde: 0, festivas: 0 };
    if (!c || c.h == null) return r;
    if (FESTIVOS[fecha]) r.festivas = c.h;
    else if (diaSemana(fecha) >= 5) r.finde = c.h;
    else if (pet.nocturno) r.nocturnas = c.h;
    else r.normales = c.h;
    r.extra = c.x || 0;
    return r;
};
const sumarConceptos = (a, b) => ({ normales: a.normales + b.normales, extra: a.extra + b.extra, nocturnas: a.nocturnas + b.nocturnas, finde: a.finde + b.finde, festivas: a.festivas + b.festivas });
const CERO = { normales: 0, extra: 0, nocturnas: 0, finde: 0, festivas: 0 };
const totalDe = (k) => k.normales + k.extra + k.nocturnas + k.finde + k.festivas;

// ==========================================
// PARTES DE EJEMPLO
// ==========================================
// Excepciones al horario: persona|fecha → { h, x, inc, nota }
const EXCEPCIONES = {
    'PET-2026-0044-2|2026-10-13': { h: 8, x: 1, nota: 'Se quedó a recoger la sala' },
    'PET-2026-0044-8|2026-10-21': { h: 7.33, x: 0, inc: 'retraso', nota: 'Llegó 40 minutos tarde. Avisó al encargado.' },
    'PET-2026-0044-9|2026-10-22': { h: 0, x: 0, inc: 'aus_just', nota: 'Cita médica con justificante' },
    'PET-2026-0044-1|2026-10-23': { h: 6, x: 2, nota: 'Cena de clausura del congreso' },
    'PET-2026-0044-5|2026-10-23': { h: 6, x: 2, nota: 'Cena de clausura del congreso' },
    'PET-2026-0031-2|2026-09-28': { h: 7.5, x: 2, nota: 'Descarga de un camión con retraso' },
    'PET-2026-0031-1|2026-07-16': { h: 0, x: 0, inc: 'aus_just', nota: 'Examen oficial' },
    'PET-2026-0031-4|2026-08-10': { h: 0, x: 0, inc: 'aus_injust', nota: 'No avisó' },
};
// Bajas médicas registradas en Personal en misión: entran solas en el parte
const BAJAS = [{ personaId: 'PET-2026-0044-4', desde: '2026-10-24', hasta: null, nota: 'Parte de baja recibido (desde Personal en misión)' }];
const ESTADO_INICIAL = {
    'PET-2026-0044|2026-10-05': { estado: 'validado', enviado: '2026-10-12', enviadoA: ['Montse Ferrer'], validacion: { quien: 'Montse Ferrer', como: 'Portal de empresas', fecha: '2026-10-13', hora: '09:12' } },
    'PET-2026-0044|2026-10-12': { estado: 'reparos', reparos: 'El martes 13 Pablo Ruiz salió a las 17:30: no hizo la hora extra. El resto, correcto.', reparosDe: 'Montse Ferrer', enviado: '2026-10-19', enviadoA: ['Montse Ferrer'] },
    'PET-2026-0044|2026-10-19': { estado: 'enviado', enviado: '2026-10-26', enviadoA: ['Montse Ferrer'] },
};

const celdaInicial = (pet, p, fecha, rellenarHasta) => {
    if (!enMision(p, fecha) || fecha > pet.fin) return null;
    const baja = BAJAS.find(b => b.personaId === p.id && fecha >= b.desde && (!b.hasta || fecha <= b.hasta));
    if (baja && fecha <= hoyIso()) return { h: 0, x: 0, inc: 'baja', nota: baja.nota };
    if (EXCEPCIONES[`${p.id}|${fecha}`]) return { ...EXCEPCIONES[`${p.id}|${fecha}`] };
    if (fecha >= rellenarHasta) return { h: null, x: 0 };
    return { h: previsto(pet, fecha), x: 0 };
};
const generarPartes = () => {
    const hoy = hoyIso();
    const partes = {};
    Object.entries(PETICIONES).forEach(([petId, pet]) => {
        // Hasta la semana que viene: así se ve qué peticiones tendrán parte (estado «Próxima semana»)
        for (let lunes = lunesDe(pet.inicio); lunes <= lunesDe(pet.fin) && lunes <= sumar(lunesDe(hoy), 7); lunes = sumar(lunes, 7)) {
            const k = clave(petId, lunes);
            const base = ESTADO_INICIAL[k]
                || (lunes > lunesDe(hoy) ? { estado: 'programado' }
                    : petId === 'PET-2026-0031' ? { estado: 'cerrado', enviado: sumar(lunes, 7), enviadoA: [validadorDe(pet).nombre], validacion: { quien: validadorDe(pet).nombre, como: 'Portal de empresas', fecha: sumar(lunes, 8), hora: '10:05' } }
                        : { estado: 'borrador' });
            const rellenarHasta = base.estado === 'borrador' ? hoy : base.estado === 'programado' ? lunes : '9999-12-31';
            const celdas = {};
            PERSONAS.filter(p => p.petId === petId).forEach(p => {
                const fila = {};
                diasDe(lunes).forEach(f => { const c = celdaInicial(pet, p, f, rellenarHasta); if (c) fila[f] = c; });
                if (Object.keys(fila).length) celdas[p.id] = fila;
            });
            partes[k] = { petId, lunes, celdas, historial: [], ...base };
        }
    });
    return partes;
};
// Fechas alineadas con las facturas de Facturación (F2026-0087, 0094 y 0101)
const CIERRES_INICIALES = {
    'PET-2026-0031|2026-07': { facturacion: '2026-08-03', nomina: '2026-08-01' },
    'PET-2026-0031|2026-08': { facturacion: '2026-09-02', nomina: '2026-09-01' },
    'PET-2026-0031|2026-09': { facturacion: '2026-10-02', nomina: '2026-10-01' },
};

// Facturas emitidas con las horas de cada mes (las mismas que en Facturación). horas: las que se facturaron.
// Agosto se facturó con 945 h, pero el parte validado tiene 937,5 (la ausencia del 10/08): sale como diferencia.
const FACTURADO = {
    'PET-2026-0031|2026-07': { numero: 'F2026-0087', horas: 1027.5 },
    'PET-2026-0031|2026-08': { numero: 'F2026-0094', horas: 945 },
    'PET-2026-0031|2026-09': { numero: 'F2026-0101', horas: 992 },
};
// Periodos del filtro: semanas cuyo lunes a domingo se cruza con [desde, hasta]
const PERIODOS = [
    { id: 'reciente', texto: 'Últimas 4 semanas y la próxima' },
    { id: 'esta', texto: 'Esta semana' },
    { id: 'pasada', texto: 'Semana pasada' },
    { id: 'proxima', texto: 'Semana que viene' },
    { id: 'este_mes', texto: 'Este mes' },
    { id: 'mes_pasado', texto: 'Mes pasado' },
    { id: 'tres_meses', texto: 'Últimos 3 meses' },
    { id: 'todo', texto: 'Todo' },
    { id: 'fechas', texto: 'Entre dos fechas…' },
];
const finDeMes = (mes) => sumar(`${sumar(`${mes}-28`, 4).slice(0, 7)}-01`, -1);
const rangoDe = (periodo, desde, hasta) => {
    const hoy = hoyIso();
    const lunes = lunesDe(hoy);
    const mes = mesDe(hoy);
    const mesPasado = mesDe(sumar(`${mes}-01`, -1));
    switch (periodo) {
        case 'esta': return [lunes, sumar(lunes, 6)];
        case 'pasada': return [sumar(lunes, -7), sumar(lunes, -1)];
        case 'proxima': return [sumar(lunes, 7), sumar(lunes, 13)];
        case 'este_mes': return [`${mes}-01`, finDeMes(mes)];
        case 'mes_pasado': return [`${mesPasado}-01`, finDeMes(mesPasado)];
        case 'tres_meses': return [sumar(hoy, -91), sumar(lunes, 13)];
        case 'todo': return ['0000-01-01', '9999-12-31'];
        case 'fechas': return [desde || '0000-01-01', hasta || '9999-12-31'];
        default: return [sumar(lunes, -28), sumar(lunes, 13)];
    }
};

const conceptosParte = (parte, filtroMes) => {
    const pet = PETICIONES[parte.petId];
    let k = { ...CERO };
    Object.values(parte.celdas).forEach(fila => Object.entries(fila).forEach(([f, c]) => {
        if (!filtroMes || mesDe(f) === filtroMes) k = sumarConceptos(k, conceptosDe(pet, f, c));
    }));
    return k;
};
const incidenciasParte = (parte) => Object.values(parte.celdas).reduce((n, fila) => n + Object.values(fila).filter(c => c.inc).length, 0);
const diasSinHoras = (parte) => {
    const hoy = hoyIso();
    return Object.values(parte.celdas).reduce((n, fila) => n + Object.entries(fila).filter(([f, c]) => c.h == null && f <= hoy).length, 0);
};
// Avisos de una celda: más horas de las normales o distinto del horario sin incidencia
const avisoCelda = (pet, fecha, c) => {
    if (!c || c.h == null || c.inc) return null;
    const total = c.h + (c.x || 0);
    if (total > MAX_HORAS_DIA) return `Más de ${MAX_HORAS_DIA} horas en un día`;
    if (c.h !== previsto(pet, fecha)) return `Distinto del horario (${fmtH(previsto(pet, fecha))} h)`;
    return null;
};

export default function HorasView() {
    const [partes, setPartes] = useState(generarPartes);
    const [cierres, setCierres] = useState(CIERRES_INICIALES);
    const [pestana, setPestana] = useState('partes');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [filtroPeticion, setFiltroPeticion] = useState('');
    const [filtroCliente, setFiltroCliente] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [filtroCierre, setFiltroCierre] = useState('todos');
    const [periodo, setPeriodo] = useState('reciente');
    const [desde, setDesde] = useState('');
    const [hasta, setHasta] = useState('');
    const [envio, setEnvio] = useState(null); // { a: [nombres] }
    const [plegados, setPlegados] = useState([]); // clientes con el bloque plegado
    const [abierto, setAbierto] = useState(null); // clave del parte
    const [celda, setCelda] = useState(null); // { personaId, fecha, h, x, inc, nota }
    const [validar, setValidar] = useState(null); // { quien, como, justificante }
    const [mes, setMes] = useState(mesDe(hoyIso()));
    const [detalleMes, setDetalleMes] = useState(null); // petId
    const [toast, setToast] = useState(null);

    const showToast = (t) => { setToast(t); setTimeout(() => setToast(null), 3800); };
    const actualizarParte = (k, cambios, texto) => {
        setPartes(prev => {
            const p = prev[k];
            const n = { ...p, ...(typeof cambios === 'function' ? cambios(p) : cambios) };
            if (texto) n.historial = [...p.historial, { fecha: hoyIso(), texto }];
            return { ...prev, [k]: n };
        });
        if (texto) showToast(texto);
    };

    const [rangoDesde, rangoHasta] = rangoDe(periodo, desde, hasta);
    const normalizar = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const coincide = (petId) => {
        const q = normalizar(busqueda.trim());
        if (!q) return true;
        const p = PETICIONES[petId];
        return [petId, p.puesto, p.turno, p.cliente, p.centro].some(x => normalizar(x).includes(q));
    };
    const lista = useMemo(() => Object.entries(partes)
        .map(([k, p]) => ({ k, ...p }))
        .filter(p => p.lunes <= rangoHasta && sumar(p.lunes, 6) >= rangoDesde)
        .filter(p => {
            if (filtroEstado === 'pendientes') return ['borrador', 'enviado', 'reparos'].includes(p.estado);
            if (filtroEstado === 'todos') return true;
            return p.estado === filtroEstado;
        })
        .filter(p => !filtroCliente || PETICIONES[p.petId].cliente === filtroCliente)
        .filter(p => !filtroPeticion || p.petId === filtroPeticion)
        .filter(p => coincide(p.petId))
        .sort((a, b) => b.lunes.localeCompare(a.lunes) || a.petId.localeCompare(b.petId)), [partes, filtroEstado, filtroPeticion, filtroCliente, rangoDesde, rangoHasta, busqueda]);
    const cuenta = (e) => Object.values(partes).filter(p => p.estado === e).length;

    // Meses con horas por petición, para el cierre
    const mesesConHoras = useMemo(() => {
        const s = new Set();
        Object.values(partes).forEach(p => diasDe(p.lunes).forEach(f => { if (f >= PETICIONES[p.petId].inicio && f <= PETICIONES[p.petId].fin && f <= hoyIso()) s.add(mesDe(f)); }));
        return [...s].sort().reverse();
    }, [partes]);
    const resumenMes = (petId, m) => {
        const del = Object.entries(partes).filter(([, p]) => p.petId === petId && diasDe(p.lunes).some(f => mesDe(f) === m && f >= PETICIONES[petId].inicio && f <= PETICIONES[petId].fin));
        if (!del.length) return null;
        const k = del.reduce((acc, [, p]) => sumarConceptos(acc, conceptosParte(p, m)), { ...CERO });
        const validados = del.filter(([, p]) => ['validado', 'cerrado'].includes(p.estado)).length;
        const personas = new Set(del.flatMap(([, p]) => Object.entries(p.celdas).filter(([, fila]) => Object.keys(fila).some(f => mesDe(f) === m)).map(([id]) => id))).size;
        const cierre = cierres[`${petId}|${m}`] || {};
        return { partes: del, k, validados, personas, cierre, completo: !!(cierre.facturacion && cierre.nomina), listo: validados === del.length };
    };
    // Facturas en las que entraron las horas de un mes, y la diferencia con lo validado
    const facturaDeMes = (petId, m) => {
        const f = FACTURADO[`${petId}|${m}`];
        if (!f) return null;
        const validadas = Math.round(totalDe(resumenMes(petId, m).k) * 100) / 100;
        return { ...f, mes: m, validadas, diferencia: Math.round((f.horas - validadas) * 100) / 100 };
    };
    const facturasDeParte = (p) => {
        const pet = PETICIONES[p.petId];
        return [...new Set(diasDe(p.lunes).filter(f => f >= pet.inicio && f <= pet.fin).map(mesDe))].map(m => facturaDeMes(p.petId, m)).filter(Boolean);
    };

    // Meses ya terminados que aún no se han pasado a facturación y a nómina
    const mesesPorCerrar = Object.keys(PETICIONES).reduce((n, petId) => n + mesesConHoras.filter(m => { const r = resumenMes(petId, m); return r && !r.completo && m < mesDe(hoyIso()); }).length, 0);

    const pasarMes = (petId, m, tipo) => {
        const r = resumenMes(petId, m);
        const c = { ...(cierres[`${petId}|${m}`] || {}), [tipo]: hoyIso() };
        const n = { ...cierres, [`${petId}|${m}`]: c };
        setCierres(n);
        // Un parte queda cerrado cuando todos sus meses están pasados a facturación y a nómina
        if (c.facturacion && c.nomina) {
            const pet = PETICIONES[petId];
            const q = { ...partes };
            r.partes.forEach(([k, p]) => {
                const meses = [...new Set(diasDe(p.lunes).filter(f => f >= pet.inicio && f <= pet.fin).map(mesDe))];
                if (meses.every(mm => n[`${petId}|${mm}`]?.facturacion && n[`${petId}|${mm}`]?.nomina)) {
                    q[k] = { ...p, estado: 'cerrado', historial: [...p.historial, { fecha: hoyIso(), texto: `Cerrado con ${nombreMes(m)}` }] };
                }
            });
            setPartes(q);
        }
        showToast(`${fmtTotal(totalDe(r.k))} h de ${nombreMes(m)} de ${petId} pasadas a ${tipo === 'facturacion' ? 'facturación' : 'nómina'}`);
    };

    const parte = abierto && partes[abierto];

    // ==========================================
    // PARTE SEMANAL
    // ==========================================
    if (parte) {
        const pet = PETICIONES[parte.petId];
        const dias = diasDe(parte.lunes);
        const est = ESTADOS_PARTE[parte.estado];
        const editable = parte.estado === 'borrador';
        const personas = PERSONAS.filter(p => parte.celdas[p.id]);
        const k = conceptosParte(parte);
        const pendientesDias = diasSinHoras(parte);
        const anterior = partes[clave(parte.petId, sumar(parte.lunes, -7))] ? clave(parte.petId, sumar(parte.lunes, -7)) : null;
        const siguiente = partes[clave(parte.petId, sumar(parte.lunes, 7))] ? clave(parte.petId, sumar(parte.lunes, 7)) : null;
        const columnas = [
            { id: 'normales', t: 'Normales' }, { id: 'extra', t: 'Extra' },
            ...(pet.nocturno ? [{ id: 'nocturnas', t: 'Nocturnas' }] : []),
            { id: 'finde', t: 'Fin de semana' }, { id: 'festivas', t: 'Festivas' },
        ];
        const rellenar = () => actualizarParte(abierto, (p) => {
            const hoy = hoyIso();
            const celdas = Object.fromEntries(Object.entries(p.celdas).map(([id, fila]) => [id, Object.fromEntries(Object.entries(fila).map(([f, c]) => [f, c.h == null && f <= hoy ? { ...c, h: previsto(pet, f) } : c]))]));
            return { celdas };
        }, 'Días sin horas rellenados con el horario de la petición');
        const validador = validadorDe(pet);
        const abrirEnvio = () => setEnvio({ a: contactosDe(pet).filter(c => c.validaHoras).map(c => c.nombre) });
        const confirmarEnvio = () => {
            actualizarParte(abierto, (p) => ({ estado: 'enviado', enviado: hoyIso(), enviadoA: envio.a, reparos: null, reparosAnteriores: p.reparos || p.reparosAnteriores }),
                `Parte enviado a ${envio.a.join(' y ')} para validarlo en el portal de empresas`);
            setEnvio(null);
        };
        const confirmarValidacion = () => {
            actualizarParte(abierto, { estado: 'validado', validacion: { quien: validar.quien, como: validar.como, fecha: hoyIso(), justificante: validar.justificante, enNombre: true } },
                `Validación de ${validar.quien} registrada por la ETT (${validar.como.toLowerCase()})`);
            setValidar(null);
        };
        const ahora = () => new Date().toTimeString().slice(0, 5);
        // En la demo, lo que haría el contacto del cliente en el portal de empresas
        const simularPortal = (conReparos) => {
            const quien = parte.enviadoA?.[0] || validador.nombre;
            if (conReparos) {
                actualizarParte(abierto, { estado: 'reparos', reparos: 'Revisad el viernes: hubo personas que salieron antes de las 14:30.', reparosDe: quien }, `${quien} ha puesto reparos en el portal de empresas`);
            } else {
                actualizarParte(abierto, { estado: 'validado', validacion: { quien, como: 'Portal de empresas', fecha: hoyIso(), hora: ahora() } }, `${quien} ha validado el parte en el portal de empresas`);
            }
        };
        const facturas = facturasDeParte(parte);
        // Parte en PDF para que el cliente lo firme en papel
        const imprimirParte = () => {
            const filas = personas.map(p => {
                const fila = parte.celdas[p.id];
                const kp = Object.entries(fila).reduce((acc, [f, c]) => sumarConceptos(acc, conceptosDe(pet, f, c)), { ...CERO });
                const celdasHtml = dias.map(f => { const c = fila[f]; return `<td>${!c ? '—' : c.inc && incDe(c.inc).sinHoras ? incDe(c.inc).corto : c.h == null ? '' : fmtH(c.h + (c.x || 0))}</td>`; }).join('');
                return `<tr><td style="text-align:left">${p.nombre}</td>${celdasHtml}<td><b>${fmtTotal(totalDe(kp))}</b></td></tr>`;
            }).join('');
            const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Parte de horas ${parte.petId} semana del ${ddmm(dias[0])}</title>
<style>body{font-family:system-ui,sans-serif;font-size:12px;color:#0f172a;margin:32px}h1{font-size:16px;margin:0 0 4px}table{border-collapse:collapse;width:100%;margin:16px 0}td,th{border:1px solid #cbd5e1;padding:6px;text-align:center}th{background:#f1f5f9}.firma{display:flex;gap:24px;margin-top:32px}.firma div{flex:1;border:1px solid #cbd5e1;height:90px;padding:8px}</style></head><body>
<h1>Parte de horas · ${pet.puesto} · semana del ${fechaES(dias[0])} al ${fechaES(dias[6])}</h1>
<div>${pet.cliente} · ${pet.centro} · ${parte.petId}</div>
<table><thead><tr><th style="text-align:left">Persona</th>${dias.map((f, i) => `<th>${DIAS_CORTOS[i]} ${ddmm(f).slice(0, 2)}</th>`).join('')}<th>Total</th></tr></thead><tbody>${filas}</tbody></table>
<div>Total de la semana: <b>${fmtTotal(totalDe(k))} h</b> (normales ${fmtTotal(k.normales + k.nocturnas)}, extra ${fmtTotal(k.extra)}, fin de semana ${fmtTotal(k.finde)}, festivas ${fmtTotal(k.festivas)}).</div>
<div class="firma"><div>Conforme, por el cliente:<br>Nombre: ${validador?.nombre || ''}<br><br>Firma y fecha:</div><div>Por la ETT:<br>${pet.responsable}</div></div>
<script>window.onload=()=>window.print()</script></body></html>`;
            const w = window.open('', '_blank');
            if (!w) { showToast('El navegador ha bloqueado la ventana del PDF'); return; }
            w.document.write(html);
            w.document.close();
        };
        const guardarCelda = () => {
            const { personaId, fecha, ...c } = celda;
            const datos = { h: c.h === '' || c.h == null ? null : Number(c.h), x: Number(c.x) || 0, inc: c.inc || undefined, nota: c.nota };
            if (datos.inc && incDe(datos.inc).sinHoras) { datos.h = 0; datos.x = 0; }
            const nombre = PERSONAS.find(p => p.id === personaId).nombre;
            actualizarParte(abierto, (p) => ({ celdas: { ...p.celdas, [personaId]: { ...p.celdas[personaId], [fecha]: datos } } }), `${nombre}, ${DIAS_LARGOS[diaSemana(fecha)]} ${ddmm(fecha)}: ${datos.inc ? incDe(datos.inc).texto.toLowerCase() : `${fmtH(datos.h ?? 0)} h${datos.x ? ` + ${fmtH(datos.x)} extra` : ''}`}`);
            setCelda(null);
        };
        const mesesCerrados = [...new Set(dias.map(mesDe))].filter(m => cierres[`${parte.petId}|${m}`]?.nomina && cierres[`${parte.petId}|${m}`]?.facturacion);

        return (
            <>
                <Page>
                    <PageHeader
                        breadcrumbs={[{ label: 'Horas e incidencias', onClick: () => setAbierto(null) }, { label: `${parte.petId} · semana del ${ddmm(parte.lunes)}` }]}
                        title={`${pet.puesto} · semana del ${ddmm(dias[0])} al ${fechaES(dias[6])}`}
                        status={<Badge tone={est.tono} dot>{est.texto}</Badge>}
                        subtitle={
                            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="inline-flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-slate-400" />{pet.cliente}</span>
                                <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" />{pet.centro}</span>
                                <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" />{pet.turno} · {fmtH(pet.horario.reduce((s, h) => s + h, 0))} h/semana</span>
                            </span>
                        }
                        actions={<>
                            <IconButton icon={ChevronLeft} title="Semana anterior" disabled={!anterior} onClick={() => setAbierto(anterior)} />
                            <IconButton icon={ChevronRight} title="Semana siguiente" disabled={!siguiente} onClick={() => setAbierto(siguiente)} />
                            {editable && <Button icon={Wand2} onClick={rellenar} disabled={!pendientesDias}>Rellenar con el horario</Button>}
                            {parte.estado !== 'programado' && <Button icon={Printer} onClick={imprimirParte} title="Para que el cliente lo firme en papel">Parte en PDF</Button>}
                            {editable && <Button variant="primary" icon={Send} onClick={abrirEnvio}>{parte.reparos ? 'Reenviar al cliente' : 'Enviar al cliente'}</Button>}
                            {parte.estado === 'enviado' && <Button icon={Undo2} onClick={() => actualizarParte(abierto, { estado: 'borrador' }, 'Parte devuelto a borrador para corregirlo')}>Volver a borrador</Button>}
                            {parte.estado === 'enviado' && <Button variant="primary" icon={FileCheck2} onClick={() => setValidar({ quien: validador.nombre, como: 'Email', justificante: '' })}>Validar en nombre del cliente</Button>}
                            {parte.estado === 'reparos' && <Button variant="primary" icon={PencilLine} onClick={() => actualizarParte(abierto, { estado: 'borrador' }, 'Parte abierto para corregir los reparos del cliente')}>Corregir</Button>}
                        </>}
                    />

                    {parte.reparos && (
                        <Notice tone="warning" icon={AlertTriangle}>
                            <span className="block font-medium">Reparos de {parte.reparosDe || validador.nombre} (cliente)</span>
                            {parte.reparos}
                            {parte.estado === 'reparos' && <span className="block mt-1">Pulsa «Corregir», cambia los días que indica y vuelve a enviarlo.</span>}
                        </Notice>
                    )}
                    {parte.estado === 'programado' && (
                        <Notice tone="neutral" icon={CalendarDays}>
                            Es la semana que viene. El parte se rellena a partir del lunes {ddmm(dias[0])}{pet.inicio > dias[0] ? `; la petición empieza el ${fechaES(pet.inicio)}` : ''}. Lo validará {validador.nombre} ({validador.cargo}).
                        </Notice>
                    )}
                    {parte.estado === 'enviado' && (
                        <Notice tone="info" icon={Send}>
                            <span className="block">
                                Enviado el {fechaES(parte.enviado)} a {(parte.enviadoA || [validador.nombre]).join(' y ')} ({pet.cliente}). Le llega un email con el enlace al parte en el <b>portal de empresas</b>, donde lo valida o pone reparos.
                            </span>
                            <span className="block mt-1">Si contesta por email o firma el parte en papel, usa «Validar en nombre del cliente» y sube esa prueba.</span>
                            <span className="flex flex-wrap gap-2 mt-2">
                                <Button size="sm" icon={MonitorCheck} title="En la demo hace lo que haría el cliente en el portal" onClick={() => simularPortal(false)}>Simular validación en el portal</Button>
                                <Button size="sm" variant="ghost" title="En la demo hace lo que haría el cliente en el portal" onClick={() => simularPortal(true)}>Simular reparos</Button>
                            </span>
                        </Notice>
                    )}
                    {['validado', 'cerrado'].includes(parte.estado) && parte.validacion && (
                        <Notice tone="success" icon={CheckCircle2}>
                            {parte.validacion.enNombre
                                ? <>Validado por {parte.validacion.quien} (cliente) el {fechaES(parte.validacion.fecha)}, por {parte.validacion.como.toLowerCase()}. Lo registró la ETT{parte.validacion.justificante ? <> con la prueba «{parte.validacion.justificante}»</> : ' sin prueba (por teléfono)'}.</>
                                : <>Validado por {parte.validacion.quien} (cliente) en el portal de empresas el {fechaES(parte.validacion.fecha)}{parte.validacion.hora ? ` a las ${parte.validacion.hora}` : ''}.</>}
                            {parte.estado === 'validado' && <> Entra en el cierre de {[...new Set(dias.filter(f => f >= pet.inicio && f <= pet.fin).map(mesDe))].map(nombreMes).join(' y ')}.</>}
                        </Notice>
                    )}
                    {parte.estado === 'cerrado' && (
                        <Notice tone="neutral" icon={Lock}>
                            Cerrado: las horas ya se pasaron a facturación y a nómina{mesesCerrados.length ? ` con ${mesesCerrados.map(nombreMes).join(' y ')}` : ''}. No se puede cambiar.
                            {facturas.length > 0 && <> Facturado en {facturas.map(f => `${f.numero} (${MESES[Number(f.mes.slice(5)) - 1]})`).join(' y ')}.</>}
                        </Notice>
                    )}
                    {facturas.filter(f => f.diferencia).map(f => (
                        <Notice key={f.numero} tone="warning" icon={AlertTriangle}>
                            <span className="flex flex-wrap items-center justify-between gap-2">
                                <span>La factura {f.numero} de {nombreMes(f.mes)} lleva {fmtTotal(f.horas)} h, pero los partes validados de ese mes suman {fmtTotal(f.validadas)} h: {f.diferencia > 0 ? 'se facturaron' : 'faltan por facturar'} {fmtTotal(Math.abs(f.diferencia))} h.</span>
                                <Button size="sm" icon={ArrowUpRight} onClick={() => { window.location.hash = '#/facturacion'; }}>Facturación</Button>
                            </span>
                        </Notice>
                    ))}
                    {editable && pendientesDias > 0 && (
                        <Notice tone="info" icon={Info}>
                            Hay {pendientesDias} {pendientesDias === 1 ? 'día' : 'días'} sin horas hasta hoy. «Rellenar con el horario» pone las horas previstas y luego solo corriges las excepciones.
                        </Notice>
                    )}

                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                        <KpiTile label="Horas de la semana" tone="accent" value={fmtTotal(totalDe(k))} hint={`${personas.length} personas`} />
                        <KpiTile label="Normales" value={fmtTotal(k.normales + k.nocturnas)} hint={pet.nocturno ? 'Nocturnas' : 'Según el horario'} />
                        <KpiTile label="Extra" tone={k.extra ? 'warning' : 'neutral'} value={fmtTotal(k.extra)} hint="Con el recargo del presupuesto" />
                        <KpiTile label="Fin de semana y festivas" value={fmtTotal(k.finde + k.festivas)} hint={dias.filter(f => FESTIVOS[f]).map(f => `${ddmm(f)} festivo`).join(', ') || 'Sin festivos'} />
                        <KpiTile label="Incidencias" tone={incidenciasParte(parte) ? 'warning' : 'neutral'} value={incidenciasParte(parte)} hint="Bajas, ausencias, retrasos…" />
                    </div>

                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                                        <th className="py-2 px-3 font-medium min-w-[180px]">Persona</th>
                                        {dias.map((f, i) => (
                                            <th key={f} className={`py-2 px-1 font-medium text-center min-w-[56px] ${FESTIVOS[f] ? 'text-indigo-700' : ''}`} title={FESTIVOS[f] || undefined}>
                                                <span className="block">{DIAS_CORTOS[i]} {ddmm(f).slice(0, 2)}</span>
                                                <span className="block font-normal">{FESTIVOS[f] ? 'Festivo' : pet.horario[i] ? `${fmtH(pet.horario[i])} h` : 'Libre'}</span>
                                            </th>
                                        ))}
                                        {columnas.map(c => <th key={c.id} className="py-2 px-2 font-medium text-right whitespace-nowrap">{c.t}</th>)}
                                        <th className="py-2 px-3 font-medium text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {personas.map(p => {
                                        const fila = parte.celdas[p.id];
                                        const kp = Object.entries(fila).reduce((acc, [f, c]) => sumarConceptos(acc, conceptosDe(pet, f, c)), { ...CERO });
                                        return (
                                            <tr key={p.id} className="border-b border-slate-100 last:border-0">
                                                <td className="py-2 px-3">
                                                    <span className="inline-flex items-center gap-2">
                                                        <Avatar name={p.nombre} size="sm" />
                                                        <span>
                                                            <span className="block font-medium text-slate-900 whitespace-nowrap">{p.nombre}</span>
                                                            <span className="text-[11px] text-slate-500">Plaza {p.plaza}{p.fin < sumar(parte.lunes, 6) && p.fin >= parte.lunes ? ` · termina el ${ddmm(p.fin)}` : ''}</span>
                                                        </span>
                                                    </span>
                                                </td>
                                                {dias.map(f => {
                                                    const c = fila[f];
                                                    if (!c) return <td key={f} className="py-2 px-1 text-center text-slate-300">—</td>;
                                                    const futuro = f > hoyIso();
                                                    const aviso = avisoCelda(pet, f, c);
                                                    const inc = c.inc && incDe(c.inc);
                                                    const contenido = inc && inc.sinHoras
                                                        ? <span className={`inline-block rounded px-1 py-0.5 text-[10px] font-medium ${inc.tono}`}>{inc.corto}</span>
                                                        : c.h == null
                                                            ? <span className="text-slate-300">{futuro ? '·' : '?'}</span>
                                                            : <span>
                                                                <span className={c.h || c.x ? 'text-slate-900' : 'text-slate-300'}>{fmtH(c.h)}</span>
                                                                {c.x > 0 && <span className="block text-[10px] text-indigo-700">+{fmtH(c.x)} ext.</span>}
                                                                {inc && <span className={`block text-[10px] ${inc.tono.split(' ')[0]}`}>{inc.corto}</span>}
                                                            </span>;
                                                    const titulo = [inc?.texto, c.nota, aviso].filter(Boolean).join(' · ') || undefined;
                                                    return (
                                                        <td key={f} className="py-1 px-1 text-center">
                                                            <button
                                                                type="button"
                                                                disabled={!editable || futuro}
                                                                title={titulo}
                                                                onClick={() => setCelda({ personaId: p.id, fecha: f, h: c.h ?? previsto(pet, f), x: c.x || 0, inc: c.inc || '', nota: c.nota || '' })}
                                                                className={`w-full min-h-[36px] rounded-md border px-1 py-1 leading-tight ${aviso ? 'border-amber-300 bg-amber-50' : c.h == null && !futuro ? 'border-dashed border-slate-300' : 'border-transparent'} ${editable && !futuro ? 'hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer' : 'cursor-default'}`}
                                                            >
                                                                {contenido}
                                                            </button>
                                                        </td>
                                                    );
                                                })}
                                                {columnas.map(col => <td key={col.id} className="py-2 px-2 text-right text-slate-700 whitespace-nowrap">{kp[col.id] ? fmtTotal(kp[col.id]) : <span className="text-slate-300">0</span>}</td>)}
                                                <td className="py-2 px-3 text-right font-medium text-slate-900">{fmtTotal(totalDe(kp))}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t border-slate-200 bg-slate-50 text-slate-700">
                                        <td className="py-2 px-3 font-medium">Total</td>
                                        {dias.map(f => {
                                            const t = personas.reduce((s, p) => { const c = parte.celdas[p.id][f]; return s + (c && c.h != null ? c.h + (c.x || 0) : 0); }, 0);
                                            return <td key={f} className="py-2 px-1 text-center">{t ? fmtTotal(t) : <span className="text-slate-300">0</span>}</td>;
                                        })}
                                        {columnas.map(col => <td key={col.id} className="py-2 px-2 text-right">{fmtTotal(k[col.id])}</td>)}
                                        <td className="py-2 px-3 text-right font-medium text-slate-900">{fmtTotal(totalDe(k))}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 border-t border-slate-200 text-[11px] text-slate-500">
                            <span>{editable ? 'Pulsa un día para cambiar las horas o añadir una incidencia.' : 'Solo se puede cambiar en borrador.'}</span>
                            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded border border-amber-300 bg-amber-50" />No cuadra con el horario</span>
                            <span>— fuera de la misión · ? sin horas · días festivos en indigo</span>
                        </div>
                    </Card>

                    <Notice tone="info" icon={Info}>
                        <span className="flex flex-wrap items-center justify-between gap-2">
                            <span>Las bajas médicas e incidencias que se registran en Personal en misión entran solas en el parte.</span>
                            <Button size="sm" icon={ArrowUpRight} onClick={() => { window.location.hash = '#/mision'; }}>Personal en misión</Button>
                        </span>
                    </Notice>

                    {parte.historial.length > 0 && (
                        <Card className="p-4 space-y-2">
                            <SectionTitle>Actividad del parte</SectionTitle>
                            <ol className="space-y-2 text-xs">
                                {[...parte.historial].reverse().map((h, i) => (
                                    <li key={i} className="flex items-start gap-2.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                        <span><span className="text-slate-800">{h.texto}</span><span className="block text-[11px] text-slate-500">{fechaES(h.fecha)}</span></span>
                                    </li>
                                ))}
                            </ol>
                        </Card>
                    )}
                </Page>

                {/* EDITAR UN DÍA */}
                {celda && (() => {
                    const p = PERSONAS.find(x => x.id === celda.personaId);
                    const d = diaSemana(celda.fecha);
                    const inc = celda.inc && incDe(celda.inc);
                    return (
                        <Modal
                            title={`${p.nombre} · ${DIAS_LARGOS[d]} ${fechaES(celda.fecha)}`}
                            subtitle={FESTIVOS[celda.fecha] ? `Festivo: ${FESTIVOS[celda.fecha]}` : pet.horario[d] ? `Horario: ${fmtH(pet.horario[d])} h (${pet.tramos[d]})` : 'Día libre según el horario'}
                            onClose={() => setCelda(null)}
                            size="max-w-md"
                            footer={<>
                                <Button onClick={() => setCelda(null)}>Cancelar</Button>
                                <Button variant="primary" icon={CheckCircle2} onClick={guardarCelda}>Guardar</Button>
                            </>}
                        >
                            <div className="space-y-4 text-xs">
                                <Field label="Incidencia">
                                    <Select value={celda.inc} onChange={(e) => setCelda(c => ({ ...c, inc: e.target.value }))} className="w-full">
                                        <option value="">Ninguna</option>
                                        {INCIDENCIAS.map(i => <option key={i.id} value={i.id}>{i.texto}</option>)}
                                    </Select>
                                </Field>
                                {inc?.sinHoras ? (
                                    <Notice tone="info" icon={Info}>Con «{inc.texto.toLowerCase()}» el día queda sin horas trabajadas.{inc.id === 'baja' || inc.id === 'accidente' ? ' Regístrala también en Personal en misión para el parte a la Seguridad Social.' : ''}</Notice>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        <Field label="Horas trabajadas"><TextInput type="number" min="0" max="24" step="0.25" value={celda.h ?? ''} onChange={(e) => setCelda(c => ({ ...c, h: e.target.value }))} /></Field>
                                        <Field label="Horas extra"><TextInput type="number" min="0" max="12" step="0.25" value={celda.x} onChange={(e) => setCelda(c => ({ ...c, x: e.target.value }))} /></Field>
                                    </div>
                                )}
                                {!inc?.sinHoras && Number(celda.h || 0) + Number(celda.x || 0) > MAX_HORAS_DIA && (
                                    <Notice tone="warning" icon={AlertTriangle}>Más de {MAX_HORAS_DIA} horas de trabajo efectivo en un día: revisa que lo permita el convenio.</Notice>
                                )}
                                <Field label="Nota (opcional)"><TextInput value={celda.nota} onChange={(e) => setCelda(c => ({ ...c, nota: e.target.value }))} placeholder="Por ejemplo: se quedó a recoger la sala" /></Field>
                            </div>
                        </Modal>
                    );
                })()}

                {/* VALIDAR EN NOMBRE DEL CLIENTE */}
                {validar && (
                    <Modal
                        title="Validar en nombre del cliente"
                        subtitle={`${parte.petId} · semana del ${ddmm(dias[0])} al ${fechaES(dias[6])}`}
                        onClose={() => setValidar(null)}
                        size="max-w-md"
                        footer={<>
                            <Button onClick={() => setValidar(null)}>Cancelar</Button>
                            <Button variant="primary" icon={FileCheck2} disabled={!validar.quien || (validar.como !== 'Teléfono' && !validar.justificante)} onClick={confirmarValidacion}>Validar</Button>
                        </>}
                    >
                        <div className="space-y-4 text-xs">
                            <p className="text-slate-600">Las horas las valida siempre el cliente. Úsalo cuando da su conformidad fuera del portal (por email o firmando el parte en papel): la ETT lo registra en su nombre.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Field label="Contacto del cliente que lo valida">
                                    <Select value={validar.quien} onChange={(e) => setValidar(v => ({ ...v, quien: e.target.value }))} className="w-full">
                                        {contactosDe(pet).map(c => <option key={c.nombre} value={c.nombre}>{c.nombre} · {c.cargo}{c.validaHoras ? ' (valida horas)' : ''}</option>)}
                                    </Select>
                                </Field>
                                <Field label="Cómo">
                                    <Select value={validar.como} onChange={(e) => setValidar(v => ({ ...v, como: e.target.value }))} className="w-full">
                                        {['Email', 'Parte firmado en papel', 'Teléfono'].map(x => <option key={x} value={x}>{x}</option>)}
                                    </Select>
                                </Field>
                            </div>
                            {validar.como !== 'Teléfono' ? (
                                <Field label="Prueba de la conformidad" hint={validar.como === 'Email' ? 'El email en el que el cliente dice que las horas son correctas, guardado como PDF o .eml.' : 'El parte firmado por el cliente, escaneado o en foto. Puedes imprimirlo con «Parte en PDF».'}>
                                    <input type="file" accept=".pdf,.png,.jpg,.jpeg,.eml,.msg" onChange={(e) => setValidar(v => ({ ...v, justificante: e.target.files?.[0]?.name || '' }))} className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200" />
                                </Field>
                            ) : (
                                <Notice tone="warning" icon={AlertTriangle}>Por teléfono no queda prueba. Pide que lo confirme por email o en el portal.</Notice>
                            )}
                            <p className="text-[11px] text-slate-500">La prueba no es un documento para firmar: sirve para demostrar que el cliente aprobó estas horas si luego discute la factura.</p>
                        </div>
                    </Modal>
                )}

                {/* ENVIAR AL CLIENTE */}
                {envio && (
                    <Modal
                        title="Enviar el parte al cliente"
                        subtitle={`${parte.petId} · semana del ${ddmm(dias[0])} al ${fechaES(dias[6])}`}
                        onClose={() => setEnvio(null)}
                        size="max-w-md"
                        footer={<>
                            <Button onClick={() => setEnvio(null)}>Cancelar</Button>
                            <Button variant="primary" icon={Send} disabled={!envio.a.length} onClick={confirmarEnvio}>Enviar</Button>
                        </>}
                    >
                        <div className="space-y-3 text-xs">
                            <p className="text-slate-600">Le llega un email con el enlace al parte en el portal de empresas ({pet.cliente}). Desde ahí lo valida o pone reparos, y queda registrado quién y cuándo.</p>
                            <div className="space-y-1.5">
                                <span className="block text-[11px] font-medium text-slate-600">A quién se envía</span>
                                {contactosDe(pet).map(c => (
                                    <label key={c.nombre} className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2">
                                        <input type="checkbox" checked={envio.a.includes(c.nombre)} onChange={(e) => setEnvio(v => ({ a: e.target.checked ? [...v.a, c.nombre] : v.a.filter(n => n !== c.nombre) }))} className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                        <span>
                                            <span className="block text-slate-900">{c.nombre} · {c.cargo}{c.validaHoras && <span className="ml-1.5 inline-block align-middle"><Badge tone="accent">Valida horas</Badge></span>}</span>
                                            <span className="text-slate-500">{c.email}</span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                            <p className="text-[11px] text-slate-500">Quién valida las horas se marca en la ficha del cliente (Empresas → Contactos → rol «Valida horas»).</p>
                        </div>
                    </Modal>
                )}

                {toast && <Aviso texto={toast} onClose={() => setToast(null)} />}
            </>
        );
    }

    // ==========================================
    // ENTRADA: PARTES Y CIERRE DEL MES
    // ==========================================
    const hayFiltros = filtroEstado !== 'todos' || filtroPeticion || filtroCliente || periodo !== 'reciente' || busqueda;
    const limpiar = () => { setFiltroEstado('todos'); setFiltroPeticion(''); setFiltroCliente(''); setPeriodo('reciente'); setDesde(''); setHasta(''); setBusqueda(''); };
    const totalLista = lista.reduce((acc, p) => sumarConceptos(acc, conceptosParte(p)), { ...CERO });
    // Fecha → cliente → petición: partes del periodo sin filtrar por cliente, para los botones de cliente
    const delPeriodo = Object.entries(partes)
        .map(([k, p]) => ({ k, ...p }))
        .filter(p => p.lunes <= rangoHasta && sumar(p.lunes, 6) >= rangoDesde)
        .filter(p => filtroEstado === 'todos' || (filtroEstado === 'pendientes' ? ['borrador', 'enviado', 'reparos'].includes(p.estado) : p.estado === filtroEstado));
    const resumenCliente = (cliente) => {
        const ps = delPeriodo.filter(p => PETICIONES[p.petId].cliente === cliente);
        return {
            partes: ps,
            peticiones: [...new Set(ps.map(p => p.petId))],
            horas: ps.reduce((s, p) => s + totalDe(conceptosParte(p)), 0),
            porHacer: ps.filter(p => ['borrador', 'enviado', 'reparos'].includes(p.estado)).length,
        };
    };
    const clientesPeriodo = CLIENTES.map(c => ({ cliente: c, ...resumenCliente(c) })).filter(c => c.partes.length);
    const semanasLista = [...new Set(lista.map(p => p.lunes))].sort();
    const ESTADO_CORTO = { borrador: 'Borrador', enviado: 'Pendiente', reparos: 'Reparos', validado: 'Validado', cerrado: 'Cerrado', programado: 'Próxima' };
    const etiquetaSemana = (lunes) => (lunes === lunesHoy ? 'Esta semana' : lunes === sumar(lunesHoy, -7) ? 'Semana pasada' : lunes === sumar(lunesHoy, 7) ? 'Semana que viene' : nombreMes(mesDe(lunes)).replace(/^./, s => s.toUpperCase()));
    const lunesHoy = lunesDe(hoyIso());
    const filasMesTodas = Object.keys(PETICIONES).map(petId => ({ petId, r: resumenMes(petId, mes) })).filter(x => x.r);
    const estadoCierre = (r) => (r.completo ? 'cerrado' : !r.listo ? 'faltan' : mes < mesDe(hoyIso()) ? 'listo' : 'abierto');
    const filasMes = filasMesTodas
        .filter(x => !filtroCliente || PETICIONES[x.petId].cliente === filtroCliente)
        .filter(x => !filtroPeticion || x.petId === filtroPeticion)
        .filter(x => coincide(x.petId))
        .filter(x => filtroCierre === 'todos' || estadoCierre(x.r) === filtroCierre);
    const hayFiltrosCierre = filtroCliente || filtroPeticion || busqueda || filtroCierre !== 'todos';
    const limpiarCierre = () => { setFiltroCliente(''); setFiltroPeticion(''); setBusqueda(''); setFiltroCierre('todos'); };

    // Campos de filtro comunes a las dos pestañas: buscador, cliente y petición (la petición, cuando hay cliente)
    const etiqueta = (texto, icono) => <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600">{icono}{texto}</span>;
    const campoBuscar = (
        <label className="flex flex-col gap-1 min-w-[200px] flex-1 sm:flex-none sm:w-64">
            {etiqueta('Buscar')}
            <SearchInput value={busqueda} onChange={(v) => { setBusqueda(v); setFiltroPeticion(''); }} placeholder="Petición, puesto, cliente o centro..." />
        </label>
    );
    const campoCliente = (contar) => (
        <label className="flex flex-col gap-1 min-w-[220px] flex-1 sm:flex-none">
            {etiqueta('Cliente', <Building2 className="w-3.5 h-3.5 text-slate-400" />)}
            <Select value={filtroCliente} onChange={(e) => { setFiltroCliente(e.target.value); setFiltroPeticion(''); }} aria-label="Cliente">
                <option value="">Todos los clientes</option>
                {CLIENTES.slice().sort((a, b) => a.localeCompare(b)).map(c => <option key={c} value={c}>{c}{contar(c)}</option>)}
            </Select>
        </label>
    );
    const campoPeticion = (disponibles) => filtroCliente && (
        <label className="flex flex-col gap-1 min-w-[220px] flex-1 sm:flex-none">
            {etiqueta('Petición')}
            <Select value={filtroPeticion} onChange={(e) => setFiltroPeticion(e.target.value)} aria-label="Petición">
                <option value="">Todas las peticiones del cliente</option>
                {Object.entries(PETICIONES).filter(([, p]) => p.cliente === filtroCliente).map(([id, p]) => (
                    <option key={id} value={id}>{id} · {p.puesto} · {p.turno.toLowerCase()}{disponibles.includes(id) ? '' : ' · sin datos en estas fechas'}</option>
                ))}
            </Select>
        </label>
    );
    const det = detalleMes && resumenMes(detalleMes, mes);

    return (
        <>
            <Page>
                <PageHeader
                    title="Horas e incidencias"
                    count={cuenta('borrador') + cuenta('enviado') + cuenta('reparos')}
                    subtitle="Las horas que trabaja cada persona en misión: el parte de cada semana, la validación del cliente y el cierre del mes para facturar y pagar la nómina."
                />

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <KpiTile label="Partes en borrador" tone="accent" value={cuenta('borrador')} hint="Por completar y enviar" active={pestana === 'partes' && filtroEstado === 'borrador'} onClick={() => { setPestana('partes'); setFiltroEstado('borrador'); setPeriodo('todo'); }} />
                    <KpiTile label="Pendientes del cliente" tone="info" value={cuenta('enviado')} hint="Enviados para validar" active={pestana === 'partes' && filtroEstado === 'enviado'} onClick={() => { setPestana('partes'); setFiltroEstado('enviado'); setPeriodo('todo'); }} />
                    <KpiTile label="Con reparos" tone="warning" value={cuenta('reparos')} hint="El cliente pide cambios" active={pestana === 'partes' && filtroEstado === 'reparos'} onClick={() => { setPestana('partes'); setFiltroEstado('reparos'); setPeriodo('todo'); }} />
                    <KpiTile label="Meses por cerrar" value={mesesPorCerrar} hint="Sin pasar a facturación y nómina" active={pestana === 'mes'} onClick={() => setPestana('mes')} />
                </div>

                <Tabs
                    tabs={[{ id: 'partes', label: 'Partes semanales', icon: CalendarDays }, { id: 'mes', label: 'Cierre del mes', icon: CalendarRange }]}
                    active={pestana}
                    onChange={setPestana}
                />

                {pestana === 'partes' ? (
                    <div className="space-y-3">
                        {/* FILTROS: cliente, fechas y estado, combinables */}
                        <Card className="p-3">
                            <div className="flex flex-wrap items-end gap-3">
                                {campoBuscar}
                                {campoCliente((c) => { const r = clientesPeriodo.find(x => x.cliente === c); return r ? ` · ${r.peticiones.length} ${r.peticiones.length === 1 ? 'petición' : 'peticiones'}` : ' · sin partes en estas fechas'; })}
                                {campoPeticion([...new Set(delPeriodo.map(p => p.petId))])}
                                <label className="flex flex-col gap-1">
                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600"><CalendarDays className="w-3.5 h-3.5 text-slate-400" />Fechas</span>
                                    <Select value={periodo} onChange={(e) => setPeriodo(e.target.value)} aria-label="Periodo">
                                        {PERIODOS.map(p => <option key={p.id} value={p.id}>{p.texto}</option>)}
                                    </Select>
                                </label>
                                {periodo === 'fechas' && <>
                                    <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-slate-600">Desde</span><TextInput type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-auto!" /></label>
                                    <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-slate-600">Hasta</span><TextInput type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-auto!" /></label>
                                </>}
                                <label className="flex flex-col gap-1">
                                    <span className="text-[11px] font-medium text-slate-600">Estado</span>
                                    <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} aria-label="Estado">
                                        <option value="todos">Todos los estados</option>
                                        <option value="pendientes">Por hacer (borrador, pendientes y con reparos)</option>
                                        {Object.entries(ESTADOS_PARTE).map(([id, e]) => <option key={id} value={id}>{e.texto}</option>)}
                                    </Select>
                                </label>
                                {hayFiltros && <Button size="sm" variant="ghost" icon={X} onClick={limpiar}>Limpiar</Button>}
                            </div>
                            <p className="mt-2 text-[11px] text-slate-500">
                                {rangoDesde > '0000-01-01' ? `Del ${fechaES(rangoDesde)}` : 'Desde el principio'}{rangoHasta < '9999-12-31' ? ` al ${fechaES(rangoHasta)}` : ''}
                                {filtroPeticion && <> · Solo {filtroPeticion} <button type="button" onClick={() => setFiltroPeticion('')} className="text-indigo-700 hover:underline">ver todas las peticiones</button></>}
                            </p>
                        </Card>

                        {lista.length === 0 && (
                            <Card><EmptyState icon={Clock} title="No hay partes con estos filtros" action={hayFiltros && <Button onClick={limpiar}>Limpiar filtros</Button>} /></Card>
                        )}

                        {/* Totales de lo que se ve */}
                        {lista.length > 0 && (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-slate-600">
                                <span className="text-slate-900">{filtroPeticion || filtroCliente || 'Todos los clientes'}</span>
                                <span>Normales {fmtTotal(totalLista.normales + totalLista.nocturnas)} h</span>
                                <span>Extra {fmtTotal(totalLista.extra)} h</span>
                                <span>Fin de semana {fmtTotal(totalLista.finde)} h</span>
                                <span>Festivas {fmtTotal(totalLista.festivas)} h</span>
                                <span className="font-medium text-slate-900">Total {fmtTotal(totalDe(totalLista))} h</span>
                            </div>
                        )}

                        {/* 3. PETICIÓN Y PUESTO: una tarjeta por cliente, una fila por petición y una columna por semana */}
                        {CLIENTES.filter(c => lista.some(p => PETICIONES[p.petId].cliente === c)).map(cliente => {
                            const delCliente = lista.filter(p => PETICIONES[p.petId].cliente === cliente);
                            const peticiones = [...new Set(delCliente.map(p => p.petId))].sort();
                            const horasCliente = delCliente.reduce((s, p) => s + totalDe(conceptosParte(p)), 0);
                            return (
                                <Card key={cliente} className="overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => setPlegados(prev => (prev.includes(cliente) ? prev.filter(c => c !== cliente) : [...prev, cliente]))}
                                        aria-expanded={!plegados.includes(cliente)}
                                        className={`w-full flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50 ${plegados.includes(cliente) ? '' : 'border-b border-slate-200'}`}
                                    >
                                        <span className="flex items-center gap-2 min-w-0">
                                            <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${plegados.includes(cliente) ? '-rotate-90' : ''}`} />
                                            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                                            <span className="text-sm font-semibold text-slate-900">{cliente}</span>
                                        </span>
                                        <span className="text-xs text-slate-500">
                                            {peticiones.length} {peticiones.length === 1 ? 'petición' : 'peticiones'} · {fmtTotal(horasCliente)} h en estas fechas
                                            {(() => { const n = delCliente.filter(p => ['borrador', 'enviado', 'reparos'].includes(p.estado)).length; return n ? <span className="text-amber-700"> · {n} por hacer</span> : null; })()}
                                        </span>
                                    </button>
                                    {!plegados.includes(cliente) && <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                                                    <th className="py-2 px-3 font-medium min-w-[220px]">Petición y puesto</th>
                                                    {semanasLista.map(l => (
                                                        <th key={l} className={`py-2 px-2 font-medium text-center min-w-[92px] ${l === lunesHoy ? 'text-indigo-700' : ''}`}>
                                                            <span className="block">{ddmm(l)} - {ddmm(sumar(l, 6))}</span>
                                                            <span className="block font-normal">{l === lunesHoy ? 'Esta semana' : l === sumar(lunesHoy, -7) ? 'Pasada' : l === sumar(lunesHoy, 7) ? 'Próxima' : MESES[Number(l.slice(5, 7)) - 1]}</span>
                                                        </th>
                                                    ))}
                                                    <th className="py-2 px-3 font-medium text-right">Total</th>
                                                    <th className="py-2 px-3 font-medium">Factura</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {peticiones.map(petId => {
                                                    const pet = PETICIONES[petId];
                                                    const suyos = delCliente.filter(p => p.petId === petId);
                                                    const facturas = [...new Map(suyos.flatMap(facturasDeParte).map(f => [f.numero, f])).values()];
                                                    return (
                                                        <tr key={petId} className="border-b border-slate-100 last:border-0">
                                                            <td className="py-2.5 px-3">
                                                                <button type="button" onClick={() => { setFiltroCliente(cliente); setFiltroPeticion(filtroPeticion === petId ? '' : petId); }} className="text-left group" title={filtroPeticion === petId ? 'Ver todas las peticiones del cliente' : 'Ver solo esta petición'}>
                                                                    <span className="block text-slate-500 text-[11px] group-hover:text-indigo-700">{petId}{filtroPeticion === petId && ' · ver todas'}</span>
                                                                    <span className="block font-medium text-slate-900 whitespace-nowrap">{pet.puesto}</span>
                                                                    <span className="text-[11px] text-slate-500">{pet.turno} · {pet.centro}</span>
                                                                </button>
                                                            </td>
                                                            {semanasLista.map(l => {
                                                                const p = suyos.find(x => x.lunes === l);
                                                                if (!p) return <td key={l} className="py-2 px-2 text-center text-slate-300">—</td>;
                                                                const e = ESTADOS_PARTE[p.estado];
                                                                const h = totalDe(conceptosParte(p));
                                                                const faltan = diasSinHoras(p);
                                                                return (
                                                                    <td key={l} className="py-1.5 px-1.5 text-center">
                                                                        <button type="button" onClick={() => setAbierto(p.k)} title={`${e.texto} · ${Object.keys(p.celdas).length} personas${faltan ? ` · ${faltan} días sin horas` : ''}`} className="w-full rounded-lg border border-slate-200 px-1.5 py-1.5 hover:border-indigo-300 hover:bg-indigo-50">
                                                                            <Badge tone={e.tono} dot>{ESTADO_CORTO[p.estado]}</Badge>
                                                                            <span className="block mt-1 text-slate-900">{p.estado === 'programado' ? (pet.inicio > l ? `Desde ${ddmm(pet.inicio)}` : '—') : `${fmtTotal(h)} h`}</span>
                                                                            {faltan > 0 && p.estado === 'borrador' && <span className="block text-[10px] text-amber-700">{faltan} sin horas</span>}
                                                                        </button>
                                                                    </td>
                                                                );
                                                            })}
                                                            <td className="py-2.5 px-3 text-right font-medium text-slate-900 whitespace-nowrap">{fmtTotal(suyos.reduce((s, p) => s + totalDe(conceptosParte(p)), 0))} h</td>
                                                            <td className="py-2.5 px-3 whitespace-nowrap">
                                                                {facturas.length === 0 ? <span className="text-slate-400">Sin facturar</span> : facturas.map(f => (
                                                                    <span key={f.numero} className="block" title={f.diferencia ? `Facturadas ${fmtTotal(f.horas)} h; validadas ${fmtTotal(f.validadas)} h en ${nombreMes(f.mes)}` : undefined}>
                                                                        <span className="text-slate-800">{f.numero}</span> <span className="text-slate-500">({MESES[Number(f.mes.slice(5)) - 1]})</span>
                                                                        {f.diferencia !== 0 && <span className="block text-[11px] text-amber-700">Diferencia: {fmtTotal(Math.abs(f.diferencia))} h</span>}
                                                                    </span>
                                                                ))}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>}
                                </Card>
                            );
                        })}
                        {lista.length > 0 && <p className="text-[11px] text-slate-500 px-1">Pulsa una semana para abrir su parte. Pulsa la petición para ver solo esa.</p>}
                    </div>
                ) : (
                    <div className="space-y-3">
                        <Card className="p-3">
                            <div className="flex flex-wrap items-end gap-3">
                                {campoBuscar}
                                {campoCliente((c) => { const n = filasMesTodas.filter(x => PETICIONES[x.petId].cliente === c).length; return n ? ` · ${n} ${n === 1 ? 'petición' : 'peticiones'}` : ' · sin horas este mes'; })}
                                {campoPeticion(filasMesTodas.map(x => x.petId))}
                                <label className="flex flex-col gap-1">
                                    {etiqueta('Mes', <CalendarRange className="w-3.5 h-3.5 text-slate-400" />)}
                                    <Select value={mes} onChange={(e) => setMes(e.target.value)} aria-label="Mes">
                                        {mesesConHoras.map(m => <option key={m} value={m}>{nombreMes(m).replace(/^./, s => s.toUpperCase())}</option>)}
                                    </Select>
                                </label>
                                <label className="flex flex-col gap-1">
                                    {etiqueta('Estado del cierre')}
                                    <Select value={filtroCierre} onChange={(e) => setFiltroCierre(e.target.value)} aria-label="Estado del cierre">
                                        <option value="todos">Todos</option>
                                        <option value="faltan">Faltan partes por validar</option>
                                        <option value="listo">Listos para cerrar</option>
                                        <option value="abierto">Al día, mes en curso</option>
                                        <option value="cerrado">Cerrados</option>
                                    </Select>
                                </label>
                                {hayFiltrosCierre && <Button size="sm" variant="ghost" icon={X} onClick={limpiarCierre}>Limpiar</Button>}
                            </div>
                            <p className="mt-2 text-[11px] text-slate-500">Mes natural. Se puede cerrar cuando el cliente ha validado todos los partes que tienen días de ese mes.</p>
                        </Card>
                        {filasMes.length === 0 ? (
                            <Card><EmptyState icon={CalendarRange} title={filasMesTodas.length ? 'No hay peticiones con estos filtros' : `No hay horas en ${nombreMes(mes)}`} action={hayFiltrosCierre && <Button onClick={limpiarCierre}>Limpiar filtros</Button>} /></Card>
                        ) : CLIENTES.filter(c => filasMes.some(x => PETICIONES[x.petId].cliente === c)).map(cliente => {
                            const delCliente = filasMes.filter(x => PETICIONES[x.petId].cliente === cliente);
                            return (
                            <div key={cliente} className="space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-1">
                                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Building2 className="w-4 h-4 text-slate-400" />{cliente}</span>
                                    <span className="text-xs text-slate-500">{delCliente.length} {delCliente.length === 1 ? 'petición' : 'peticiones'} · {fmtTotal(delCliente.reduce((s, x) => s + totalDe(x.r.k), 0))} h en {nombreMes(mes)}</span>
                                </div>
                                {delCliente.map(({ petId, r }) => {
                            const pet = PETICIONES[petId];
                            const enCurso = mes >= mesDe(hoyIso());
                            return (
                                <Card key={petId} className="p-4 space-y-3">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <div className="text-sm font-medium text-slate-900">{pet.puesto} · {pet.turno.toLowerCase()}</div>
                                            <div className="text-[11px] text-slate-500">{petId} · {pet.centro}</div>
                                        </div>
                                        <Badge tone={r.completo ? 'neutral' : r.listo && !enCurso ? 'success' : 'warning'} dot>
                                            {r.completo ? 'Cerrado' : r.listo ? (enCurso ? 'Al día, el mes sigue abierto' : 'Listo para cerrar') : `Faltan ${r.partes.length - r.validados} partes por validar`}
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                                        {[['Personas', r.personas], ['Normales', fmtTotal(r.k.normales + r.k.nocturnas)], ['Extra', fmtTotal(r.k.extra)], ['Fin de semana', fmtTotal(r.k.finde)], ['Festivas', fmtTotal(r.k.festivas)], ['Total de horas', fmtTotal(totalDe(r.k))]].map(([t, v]) => (
                                            <div key={t}><div className="text-[11px] text-slate-500">{t}</div><div className="text-base text-slate-900">{v}</div></div>
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                        Partes: {r.validados} de {r.partes.length} validados
                                        {r.partes.filter(([, p]) => !['validado', 'cerrado'].includes(p.estado)).map(([k, p]) => (
                                            <button key={k} type="button" onClick={() => setAbierto(k)} className="text-indigo-700 hover:underline">semana del {ddmm(p.lunes)} ({ESTADOS_PARTE[p.estado].texto.toLowerCase()})</button>
                                        ))}
                                    </div>
                                    {(() => {
                                        const f = facturaDeMes(petId, mes);
                                        if (!f) return null;
                                        return f.diferencia ? (
                                            <Notice tone="warning" icon={AlertTriangle}>
                                                <span className="flex flex-wrap items-center justify-between gap-2">
                                                    <span>Facturado en {f.numero} con {fmtTotal(f.horas)} h, pero los partes validados suman {fmtTotal(f.validadas)} h: {f.diferencia > 0 ? 'se facturaron' : 'faltan por facturar'} {fmtTotal(Math.abs(f.diferencia))} h. Revisa la factura (rectificativa) o los partes.</span>
                                                    <Button size="sm" icon={ArrowUpRight} onClick={() => { window.location.hash = '#/facturacion'; }}>Facturación</Button>
                                                </span>
                                            </Notice>
                                        ) : <p className="text-xs text-emerald-700">Facturado en {f.numero}: {fmtTotal(f.horas)} h, igual que los partes validados.</p>;
                                    })()}
                                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                                        <Button size="sm" variant="ghost" onClick={() => setDetalleMes(petId)}>Ver por persona</Button>
                                        <span className="flex-1" />
                                        {r.cierre.facturacion
                                            ? <button type="button" onClick={() => { window.location.hash = '#/facturacion'; }} className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline" title="Ver en Facturación"><CheckCircle2 className="w-3.5 h-3.5" />En facturación desde el {fechaES(r.cierre.facturacion)}<ArrowUpRight className="w-3.5 h-3.5" /></button>
                                            : <Button size="sm" icon={Receipt} disabled={!r.listo} title={r.listo ? undefined : 'Antes, el cliente tiene que validar todos los partes'} onClick={() => pasarMes(petId, mes, 'facturacion')}>Pasar a facturación</Button>}
                                        {r.cierre.nomina
                                            ? <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" />En nómina desde el {fechaES(r.cierre.nomina)}</span>
                                            : <Button size="sm" icon={Wallet} disabled={!r.listo} title={r.listo ? undefined : 'Antes, el cliente tiene que validar todos los partes'} onClick={() => pasarMes(petId, mes, 'nomina')}>Pasar a nómina</Button>}
                                    </div>
                                </Card>
                            );
                        })}
                            </div>
                            );
                        })}
                        <Notice tone="neutral" icon={Info}>Aquí solo hay horas. Las tarifas al cliente y el margen están en Presupuestos; los importes se calculan en facturación y en nómina.</Notice>
                    </div>
                )}
            </Page>

            {/* DETALLE DEL MES POR PERSONA */}
            {det && (() => {
                const pet = PETICIONES[detalleMes];
                const porPersona = PERSONAS.filter(p => p.petId === detalleMes).map(p => {
                    let k = { ...CERO }; let dias = 0; const inc = {};
                    det.partes.forEach(([, parte]) => Object.entries(parte.celdas[p.id] || {}).forEach(([f, c]) => {
                        if (mesDe(f) !== mes) return;
                        k = sumarConceptos(k, conceptosDe(pet, f, c));
                        if (c.h) dias += 1;
                        if (c.inc) inc[c.inc] = (inc[c.inc] || 0) + 1;
                    }));
                    return { p, k, dias, inc };
                }).filter(x => x.dias || Object.keys(x.inc).length);
                return (
                    <Drawer
                        onClose={() => setDetalleMes(null)}
                        width="max-w-2xl"
                        title={`${nombreMes(mes).replace(/^./, s => s.toUpperCase())} por persona`}
                        subtitle={`${pet.puesto} · ${detalleMes} · ${pet.cliente}`}
                        footer={<Button onClick={() => setDetalleMes(null)}>Cerrar</Button>}
                    >
                        <div className="space-y-3 text-xs">
                            <p className="text-slate-600">Lo que se pasa a nómina de cada persona. Las incidencias que no tienen horas (bajas, ausencias, vacaciones) también van a nómina.</p>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-200 text-[11px] text-slate-500">
                                            <th className="py-2 pr-3 font-medium">Persona</th>
                                            <th className="py-2 px-2 font-medium text-right">Días</th>
                                            <th className="py-2 px-2 font-medium text-right">Normales</th>
                                            <th className="py-2 px-2 font-medium text-right">Extra</th>
                                            <th className="py-2 px-2 font-medium text-right">Fin de sem.</th>
                                            <th className="py-2 px-2 font-medium text-right">Festivas</th>
                                            <th className="py-2 px-2 font-medium text-right">Total</th>
                                            <th className="py-2 pl-3 font-medium">Incidencias</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {porPersona.map(({ p, k, dias, inc }) => (
                                            <tr key={p.id} className="border-b border-slate-100 last:border-0">
                                                <td className="py-2 pr-3 whitespace-nowrap text-slate-900">{p.nombre}</td>
                                                <td className="py-2 px-2 text-right">{dias}</td>
                                                <td className="py-2 px-2 text-right">{fmtTotal(k.normales + k.nocturnas)}</td>
                                                <td className="py-2 px-2 text-right">{fmtTotal(k.extra)}</td>
                                                <td className="py-2 px-2 text-right">{fmtTotal(k.finde)}</td>
                                                <td className="py-2 px-2 text-right">{fmtTotal(k.festivas)}</td>
                                                <td className="py-2 px-2 text-right font-medium text-slate-900">{fmtTotal(totalDe(k))}</td>
                                                <td className="py-2 pl-3 text-slate-600">{Object.entries(inc).map(([id, n]) => `${n} ${incDe(id).texto.toLowerCase()}`).join(', ') || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </Drawer>
                );
            })()}

            {toast && <Aviso texto={toast} onClose={() => setToast(null)} />}
        </>
    );
}

function Aviso({ texto, onClose }) {
    return (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-lg text-sm animate-fade-in max-w-md">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{texto}</span>
            <button onClick={onClose} className="ml-2 text-slate-400 hover:text-white" aria-label="Cerrar aviso"><X className="w-4 h-4" /></button>
        </div>
    );
}
