// Horas e incidencias: parte semanal de horas de cada petición, validación del cliente y cierre del mes.
// Sigue a Personal en misión; lo cerrado pasa a facturación y a nómina.
// No partió de ninguna maqueta de design/: se diseñó directamente con el sistema común.
import React, { useState, useMemo } from 'react';
import {
    Clock, Building2, MapPin, CalendarDays, ChevronLeft, ChevronRight, Send, CheckCircle2, AlertTriangle,
    Wand2, Undo2, Info, X, FileCheck2, Receipt, Wallet, Lock, ArrowUpRight, PencilLine, CalendarRange
} from 'lucide-react';
import {
    Page, PageHeader, Card, SectionTitle, KpiTile, EmptyState, Notice, Button, IconButton, Badge, Avatar,
    Select, Field, TextInput, Modal, Drawer, Tabs
} from '../ui';

// ==========================================
// DATOS DE EJEMPLO (las mismas peticiones y personas que en Personal en misión)
// ==========================================
// horario: horas previstas de lunes a domingo, del horario de la petición.
// diasEspeciales: días fuera del horario que se trabajaron (por ejemplo, la apertura del congreso).
const PETICIONES = {
    'PET-2026-0044': {
        puesto: 'Camarero/a de sala', turno: 'Jornada partida', cliente: 'Hostelería & Eventos Premium BCN, S.L.',
        centro: 'Recinto de congresos - Barcelona', responsable: 'Nuria Castells', contactoCliente: 'Montse Ferrer',
        inicio: '2026-10-10', fin: '2026-11-30', horario: [8, 8, 8, 8, 6, 0, 0], tramos: ['08:30 a 17:30', '08:30 a 17:30', '08:30 a 17:30', '08:30 a 17:30', '08:30 a 14:30'],
        nocturno: false, diasEspeciales: { '2026-10-10': 8, '2026-10-11': 8 },
    },
    'PET-2026-0031': {
        puesto: 'Mozo/a de almacén', turno: 'Turno de mañana', cliente: 'Trans-Logística Ibérica Norte, S.L.',
        centro: 'HUB central Basauri (Bizkaia) - Nave 2', responsable: 'Ane Uriarte', contactoCliente: 'Iñaki Garmendia',
        inicio: '2026-07-01', fin: '2026-09-30', horario: [7.5, 7.5, 7.5, 7.5, 7.5, 0, 0], tramos: Array(5).fill('06:00 a 14:00'),
        nocturno: false, diasEspeciales: {},
    },
};
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
    'PET-2026-0044|2026-10-05': { estado: 'validado', validacion: { quien: 'Montse Ferrer', como: 'Portal de empresas', fecha: '2026-10-13' } },
    'PET-2026-0044|2026-10-12': { estado: 'reparos', reparos: 'El martes 13 Pablo Ruiz salió a las 17:30: no hizo la hora extra. El resto, correcto.', enviado: '2026-10-19' },
    'PET-2026-0044|2026-10-19': { estado: 'enviado', enviado: '2026-10-26' },
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
        for (let lunes = lunesDe(pet.inicio); lunes <= lunesDe(pet.fin) && lunes <= lunesDe(hoy); lunes = sumar(lunes, 7)) {
            const k = clave(petId, lunes);
            const base = ESTADO_INICIAL[k] || (petId === 'PET-2026-0031' ? { estado: 'cerrado', validacion: { quien: pet.contactoCliente, como: 'Email', fecha: sumar(lunes, 8) } } : { estado: 'borrador' });
            const celdas = {};
            PERSONAS.filter(p => p.petId === petId).forEach(p => {
                const fila = {};
                diasDe(lunes).forEach(f => { const c = celdaInicial(pet, p, f, base.estado === 'borrador' ? hoy : '9999-12-31'); if (c) fila[f] = c; });
                if (Object.keys(fila).length) celdas[p.id] = fila;
            });
            partes[k] = { petId, lunes, celdas, historial: [], ...base };
        }
    });
    return partes;
};
const CIERRES_INICIALES = Object.fromEntries(['2026-07', '2026-08', '2026-09'].map(m => [`PET-2026-0031|${m}`, { facturacion: '2026-10-02', nomina: '2026-10-01' }]));

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
    const [filtroEstado, setFiltroEstado] = useState('pendientes');
    const [filtroPeticion, setFiltroPeticion] = useState('');
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

    const lista = useMemo(() => Object.entries(partes)
        .map(([k, p]) => ({ k, ...p }))
        .filter(p => {
            if (filtroEstado === 'pendientes') return ['borrador', 'enviado', 'reparos'].includes(p.estado);
            if (filtroEstado === 'todos') return true;
            return p.estado === filtroEstado;
        })
        .filter(p => !filtroPeticion || p.petId === filtroPeticion)
        .sort((a, b) => b.lunes.localeCompare(a.lunes) || a.petId.localeCompare(b.petId)), [partes, filtroEstado, filtroPeticion]);
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
        const enviar = () => actualizarParte(abierto, (p) => ({ estado: 'enviado', enviado: hoyIso(), reparos: null, reparosAnteriores: p.reparos || p.reparosAnteriores }),
            `Parte enviado a ${pet.contactoCliente} para validarlo en el portal de empresas`);
        const confirmarValidacion = () => {
            actualizarParte(abierto, { estado: 'validado', validacion: { quien: validar.quien, como: validar.como, fecha: hoyIso(), justificante: validar.justificante, enNombre: true } },
                `Parte validado en nombre del cliente (${validar.quien}, ${validar.como.toLowerCase()})`);
            setValidar(null);
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
                            {editable && <Button variant="primary" icon={Send} onClick={enviar}>{parte.reparos ? 'Reenviar al cliente' : 'Enviar al cliente'}</Button>}
                            {parte.estado === 'enviado' && <Button icon={Undo2} onClick={() => actualizarParte(abierto, { estado: 'borrador' }, 'Parte devuelto a borrador para corregirlo')}>Volver a borrador</Button>}
                            {parte.estado === 'enviado' && <Button variant="primary" icon={FileCheck2} onClick={() => setValidar({ quien: pet.contactoCliente, como: 'Email', justificante: '' })}>Validar en nombre del cliente</Button>}
                            {parte.estado === 'reparos' && <Button variant="primary" icon={PencilLine} onClick={() => actualizarParte(abierto, { estado: 'borrador' }, 'Parte abierto para corregir los reparos del cliente')}>Corregir</Button>}
                        </>}
                    />

                    {parte.reparos && (
                        <Notice tone="warning" icon={AlertTriangle}>
                            <span className="block font-medium">Reparos de {pet.contactoCliente} (cliente)</span>
                            {parte.reparos}
                            {parte.estado === 'reparos' && <span className="block mt-1">Pulsa «Corregir», cambia los días que indica y vuelve a enviarlo.</span>}
                        </Notice>
                    )}
                    {parte.estado === 'enviado' && (
                        <Notice tone="info" icon={Send}>
                            Enviado el {fechaES(parte.enviado)} a {pet.contactoCliente}, que lo valida en el portal de empresas. Si lo valida por email o en papel, usa «Validar en nombre del cliente» y adjunta el justificante.
                        </Notice>
                    )}
                    {parte.estado === 'validado' && parte.validacion && (
                        <Notice tone="success" icon={CheckCircle2}>
                            Validado por {parte.validacion.quien} el {fechaES(parte.validacion.fecha)} · {parte.validacion.como}{parte.validacion.enNombre ? ' (registrado por la ETT)' : ''}{parte.validacion.justificante ? ` · Justificante: ${parte.validacion.justificante}` : ''}.
                            Entra en el cierre de {[...new Set(dias.filter(f => f >= pet.inicio && f <= pet.fin).map(mesDe))].map(nombreMes).join(' y ')}.
                        </Notice>
                    )}
                    {parte.estado === 'cerrado' && (
                        <Notice tone="neutral" icon={Lock}>
                            Cerrado: las horas ya se pasaron a facturación y a nómina{mesesCerrados.length ? ` con ${mesesCerrados.map(nombreMes).join(' y ')}` : ''}. No se puede cambiar.
                        </Notice>
                    )}
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
                            <p className="text-slate-600">Úsalo cuando el cliente da el visto bueno fuera del portal. Queda registrado quién lo validó y cómo.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Field label="Quién lo valida"><TextInput value={validar.quien} onChange={(e) => setValidar(v => ({ ...v, quien: e.target.value }))} /></Field>
                                <Field label="Cómo">
                                    <Select value={validar.como} onChange={(e) => setValidar(v => ({ ...v, como: e.target.value }))} className="w-full">
                                        {['Email', 'Parte firmado en papel', 'Teléfono'].map(x => <option key={x} value={x}>{x}</option>)}
                                    </Select>
                                </Field>
                            </div>
                            {validar.como !== 'Teléfono' ? (
                                <Field label="Justificante" hint="El email o el parte firmado, en PDF o imagen">
                                    <input type="file" accept=".pdf,.png,.jpg,.jpeg,.eml,.msg" onChange={(e) => setValidar(v => ({ ...v, justificante: e.target.files?.[0]?.name || '' }))} className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200" />
                                </Field>
                            ) : (
                                <Notice tone="warning" icon={AlertTriangle}>Por teléfono no queda justificante. Pide que lo confirme por email o en el portal.</Notice>
                            )}
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
    const hayFiltros = filtroEstado !== 'pendientes' || filtroPeticion;
    const limpiar = () => { setFiltroEstado('pendientes'); setFiltroPeticion(''); };
    const lunesHoy = lunesDe(hoyIso());
    const filasMes = Object.keys(PETICIONES).map(petId => ({ petId, r: resumenMes(petId, mes) })).filter(x => x.r);
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
                    <KpiTile label="Partes en borrador" tone="accent" value={cuenta('borrador')} hint="Por completar y enviar" active={pestana === 'partes' && filtroEstado === 'borrador'} onClick={() => { setPestana('partes'); setFiltroEstado('borrador'); }} />
                    <KpiTile label="Pendientes del cliente" tone="info" value={cuenta('enviado')} hint="Enviados para validar" active={pestana === 'partes' && filtroEstado === 'enviado'} onClick={() => { setPestana('partes'); setFiltroEstado('enviado'); }} />
                    <KpiTile label="Con reparos" tone="warning" value={cuenta('reparos')} hint="El cliente pide cambios" active={pestana === 'partes' && filtroEstado === 'reparos'} onClick={() => { setPestana('partes'); setFiltroEstado('reparos'); }} />
                    <KpiTile label="Meses por cerrar" value={mesesPorCerrar} hint="Sin pasar a facturación y nómina" active={pestana === 'mes'} onClick={() => setPestana('mes')} />
                </div>

                <Tabs
                    tabs={[{ id: 'partes', label: 'Partes semanales', icon: CalendarDays }, { id: 'mes', label: 'Cierre del mes', icon: CalendarRange }]}
                    active={pestana}
                    onChange={setPestana}
                />

                {pestana === 'partes' ? (
                    <Card className="overflow-hidden">
                        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-200">
                            <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} aria-label="Estado">
                                <option value="pendientes">Por hacer (borrador, pendientes y con reparos)</option>
                                {Object.entries(ESTADOS_PARTE).map(([id, e]) => <option key={id} value={id}>{e.texto}</option>)}
                                <option value="todos">Todos</option>
                            </Select>
                            <Select value={filtroPeticion} onChange={(e) => setFiltroPeticion(e.target.value)} aria-label="Petición">
                                <option value="">Todas las peticiones</option>
                                {Object.entries(PETICIONES).map(([id, p]) => <option key={id} value={id}>{id} · {p.puesto} · {p.cliente}</option>)}
                            </Select>
                            {hayFiltros && <Button size="sm" variant="ghost" icon={X} onClick={limpiar}>Limpiar</Button>}
                        </div>
                        {lista.length === 0 ? (
                            <EmptyState icon={Clock} title="No hay partes con estos filtros" action={hayFiltros && <Button onClick={limpiar}>Limpiar filtros</Button>} />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                                            <th className="py-2 px-3 font-medium">Semana</th>
                                            <th className="py-2 px-3 font-medium">Petición</th>
                                            <th className="py-2 px-3 font-medium text-right">Personas</th>
                                            <th className="py-2 px-3 font-medium text-right">Horas</th>
                                            <th className="py-2 px-3 font-medium text-right">Extra</th>
                                            <th className="py-2 px-3 font-medium text-right">Incidencias</th>
                                            <th className="py-2 px-3 font-medium">Estado</th>
                                            <th className="py-2 px-3" aria-label="Acciones"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lista.map(p => {
                                            const pet = PETICIONES[p.petId];
                                            const e = ESTADOS_PARTE[p.estado];
                                            const kp = conceptosParte(p);
                                            const faltan = diasSinHoras(p);
                                            const accion = { borrador: 'Completar', reparos: 'Corregir', enviado: 'Ver' }[p.estado] || 'Ver';
                                            return (
                                                <tr key={p.k} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                                    <td className="py-2.5 px-3 whitespace-nowrap">
                                                        <button type="button" onClick={() => setAbierto(p.k)} className="text-left hover:text-indigo-700">
                                                            <span className="block font-medium text-slate-900">Del {ddmm(p.lunes)} al {ddmm(sumar(p.lunes, 6))}</span>
                                                            <span className="text-[11px] text-slate-500">{p.lunes === lunesHoy ? 'Esta semana' : p.lunes === sumar(lunesHoy, -7) ? 'Semana pasada' : nombreMes(mesDe(p.lunes)).replace(/^./, s => s.toUpperCase())}</span>
                                                        </button>
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                        <span className="block text-slate-800 whitespace-nowrap">{pet.puesto} · {pet.turno.toLowerCase()}</span>
                                                        <span className="text-[11px] text-slate-500">{p.petId} · {pet.cliente}</span>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right text-slate-700">{Object.keys(p.celdas).length}</td>
                                                    <td className="py-2.5 px-3 text-right text-slate-900">{fmtTotal(totalDe(kp))}</td>
                                                    <td className="py-2.5 px-3 text-right text-slate-700">{kp.extra ? fmtTotal(kp.extra) : <span className="text-slate-300">0</span>}</td>
                                                    <td className="py-2.5 px-3 text-right text-slate-700">{incidenciasParte(p) || <span className="text-slate-300">0</span>}</td>
                                                    <td className="py-2.5 px-3">
                                                        <Badge tone={e.tono} dot>{e.texto}</Badge>
                                                        {p.estado === 'borrador' && faltan > 0 && <div className="text-[11px] text-amber-700 mt-0.5">{faltan} {faltan === 1 ? 'día' : 'días'} sin horas</div>}
                                                        {p.estado === 'enviado' && <div className="text-[11px] text-slate-500 mt-0.5">Enviado el {ddmm(p.enviado)}</div>}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                                        <Button size="sm" variant={['borrador', 'reparos'].includes(p.estado) ? 'primary' : 'ghost'} onClick={() => setAbierto(p.k)}>{accion}</Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                ) : (
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <Select value={mes} onChange={(e) => setMes(e.target.value)} aria-label="Mes">
                                {mesesConHoras.map(m => <option key={m} value={m}>{nombreMes(m).replace(/^./, s => s.toUpperCase())}</option>)}
                            </Select>
                            <span className="text-xs text-slate-500">Mes natural. Se puede cerrar cuando el cliente ha validado todos los partes que tienen días de ese mes.</span>
                        </div>
                        {filasMes.length === 0 ? (
                            <Card><EmptyState icon={CalendarRange} title={`No hay horas en ${nombreMes(mes)}`} /></Card>
                        ) : filasMes.map(({ petId, r }) => {
                            const pet = PETICIONES[petId];
                            const enCurso = mes >= mesDe(hoyIso());
                            return (
                                <Card key={petId} className="p-4 space-y-3">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <div className="text-sm font-medium text-slate-900">{pet.puesto} · {pet.turno.toLowerCase()}</div>
                                            <div className="text-[11px] text-slate-500">{petId} · {pet.cliente}</div>
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
                                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                                        <Button size="sm" variant="ghost" onClick={() => setDetalleMes(petId)}>Ver por persona</Button>
                                        <span className="flex-1" />
                                        {r.cierre.facturacion
                                            ? <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" />En facturación desde el {fechaES(r.cierre.facturacion)}</span>
                                            : <Button size="sm" icon={Receipt} disabled={!r.listo} title={r.listo ? undefined : 'Antes, el cliente tiene que validar todos los partes'} onClick={() => pasarMes(petId, mes, 'facturacion')}>Pasar a facturación</Button>}
                                        {r.cierre.nomina
                                            ? <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" />En nómina desde el {fechaES(r.cierre.nomina)}</span>
                                            : <Button size="sm" icon={Wallet} disabled={!r.listo} title={r.listo ? undefined : 'Antes, el cliente tiene que validar todos los partes'} onClick={() => pasarMes(petId, mes, 'nomina')}>Pasar a nómina</Button>}
                                    </div>
                                </Card>
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
