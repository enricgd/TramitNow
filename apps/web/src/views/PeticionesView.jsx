// Partió de design/peticiones.html (scripts/import-design.py). Ahora se edita aquí directamente: no regenerar.
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    Building2, FileText, Users, Clock, Globe2, Share2, ShieldCheck,
    ChevronRight, CheckCircle2, AlertCircle, ArrowLeft, Search, Filter,
    Plus, Copy, RefreshCw, Send, Eye, Edit3, Trash2, Check, X,
    Calendar, MapPin, Briefcase, ChevronDown, Sparkles, ExternalLink,
    Layers, Sliders, History, Info, ChevronUp, Bell, ArrowUpRight,
    CheckSquare, AlertTriangle, FileSpreadsheet, Lock, Radio,
    Home, UserCheck, UserPlus, DollarSign, BarChart3, Settings,
    Shield, Cpu, BookOpen, Layers2, FolderKanban, List, SquareKanban, GripVertical, Upload, Paperclip, FileSignature
} from 'lucide-react';
import { Page, PageHeader, Card, SectionTitle, KpiTile, EmptyState, Notice, Button, Badge, Avatar, SearchInput, Select, SelectConAlta, Field, TextInput, Interruptor, Tabs, Segmented, Modal, CargandoPagina, ErrorCarga, CAMPO } from '../ui';
import { DEMO } from '../modo';
import { usePeticiones, mensajeError } from './peticiones/usePeticiones';

// Datos: usePeticiones (peticiones/usePeticiones.ts), de la API o, en la demo, de memoriaPeticiones.ts. Plazas con
// personas, candidatos, CPD de cada persona y portales (fases 6 y 7) solo tienen datos de ejemplo en la demo.
// Una petición = un puesto. Las peticiones siempre salen de un presupuesto aceptado. Un mismo puesto del presupuesto
// se puede repartir en varias peticiones (por ejemplo, una por turno o por fechas); todas comparten sus condiciones.
const ESTADOS_PETICION = [
    { estado: 'Nueva', tono: 'neutral' },
    { estado: 'En difusión', tono: 'info' },
    { estado: 'En selección', tono: 'accent' },
    { estado: 'Cubierta', tono: 'success' },
    { estado: 'En curso', tono: 'success' },
    { estado: 'Cerrada', tono: 'neutral' },
    { estado: 'Cancelada', tono: 'danger' },
];
const tonoEstado = (estado) => ESTADOS_PETICION.find(e => e.estado === estado)?.tono || 'neutral';
const ESTADOS_ACTIVOS = ['Nueva', 'En difusión', 'En selección', 'Cubierta', 'En curso'];
const fechaCorta = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
const diasHasta = (iso) => Math.round((new Date(`${iso}T00:00:00`) - new Date(new Date().toDateString())) / 86400000);
// Peticiones del mismo puesto del mismo presupuesto (por ejemplo, otro turno), del reparto que da la API
const hermanasDe = (p, lista) => (p.reparto?.hermanas || []).filter(h => !h.esta).map(h => ({ ...h, ...(lista.find(x => x.id === h.id) || {}) }));
// Mientras carga la lista no hay petición abierta: valores vacíos para que la ficha no falle
const PETICION_VACIA = {
    id: '', _id: '', presupuesto: '', version: '', presupuestoOrigen: '', cliente: '', clienteNombre: '', tipo: '', perfil: '', puesto: '', personasPuesto: 0,
    plantilla: '', turnoNombre: '', solicitados: 0, cubiertas: 0, estado: 'Nueva', inicio: '', fin: '', creada: '', creadaPor: '', responsable: '',
    portalesActivos: 0, candidaturas: 0, centroTrabajo: '', ciudad: '', cif: '', sector: '', contactoCliente: '', emailContacto: '', telefonoContacto: '',
    categoria: '', cctConvenio: '', salarioBrutoConvenio: '', tarifaVentaHora: '', requiereEpi: '', carnetRequerido: '', descripcionCorta: '',
    riesgos: '', supuesto: '', justificacion: '', extrasPropuesta: [], salarioBajoConvenio: false, cpdPrevio: null, presupuestoFirmado: null, reparto: null, servicio: {},
};
// Plantillas horarias
const HORARIO_TEMPLATES = {
    manana: {
        nombre: 'Turno de mañana',
        dias: [
            { dia: 'Lunes', laborable: true, inicio: '06:00', fin: '14:00', descanso: 30, horas: 7.5 },
            { dia: 'Martes', laborable: true, inicio: '06:00', fin: '14:00', descanso: 30, horas: 7.5 },
            { dia: 'Miércoles', laborable: true, inicio: '06:00', fin: '14:00', descanso: 30, horas: 7.5 },
            { dia: 'Jueves', laborable: true, inicio: '06:00', fin: '14:00', descanso: 30, horas: 7.5 },
            { dia: 'Viernes', laborable: true, inicio: '06:00', fin: '14:00', descanso: 30, horas: 7.5 },
            { dia: 'Sábado', laborable: false, inicio: '00:00', fin: '00:00', descanso: 0, horas: 0 },
            { dia: 'Domingo', laborable: false, inicio: '00:00', fin: '00:00', descanso: 0, horas: 0 }
        ]
    },
    tarde: {
        nombre: 'Turno de tarde',
        dias: [
            { dia: 'Lunes', laborable: true, inicio: '14:00', fin: '22:00', descanso: 30, horas: 7.5 },
            { dia: 'Martes', laborable: true, inicio: '14:00', fin: '22:00', descanso: 30, horas: 7.5 },
            { dia: 'Miércoles', laborable: true, inicio: '14:00', fin: '22:00', descanso: 30, horas: 7.5 },
            { dia: 'Jueves', laborable: true, inicio: '14:00', fin: '22:00', descanso: 30, horas: 7.5 },
            { dia: 'Viernes', laborable: true, inicio: '14:00', fin: '22:00', descanso: 30, horas: 7.5 },
            { dia: 'Sábado', laborable: false, inicio: '00:00', fin: '00:00', descanso: 0, horas: 0 },
            { dia: 'Domingo', laborable: false, inicio: '00:00', fin: '00:00', descanso: 0, horas: 0 }
        ]
    },
    noche: {
        nombre: 'Turno de noche',
        dias: [
            { dia: 'Lunes', laborable: true, inicio: '22:00', fin: '06:00', descanso: 30, horas: 7.5 },
            { dia: 'Martes', laborable: true, inicio: '22:00', fin: '06:00', descanso: 30, horas: 7.5 },
            { dia: 'Miércoles', laborable: true, inicio: '22:00', fin: '06:00', descanso: 30, horas: 7.5 },
            { dia: 'Jueves', laborable: true, inicio: '22:00', fin: '06:00', descanso: 30, horas: 7.5 },
            { dia: 'Viernes', laborable: true, inicio: '22:00', fin: '06:00', descanso: 30, horas: 7.5 },
            { dia: 'Sábado', laborable: false, inicio: '00:00', fin: '00:00', descanso: 0, horas: 0 },
            { dia: 'Domingo', laborable: false, inicio: '00:00', fin: '00:00', descanso: 0, horas: 0 }
        ]
    },
    partida: {
        nombre: 'Jornada partida',
        dias: [
            { dia: 'Lunes', laborable: true, inicio: '08:30', fin: '17:30', descanso: 60, horas: 8.0 },
            { dia: 'Martes', laborable: true, inicio: '08:30', fin: '17:30', descanso: 60, horas: 8.0 },
            { dia: 'Miércoles', laborable: true, inicio: '08:30', fin: '17:30', descanso: 60, horas: 8.0 },
            { dia: 'Jueves', laborable: true, inicio: '08:30', fin: '17:30', descanso: 60, horas: 8.0 },
            { dia: 'Viernes', laborable: true, inicio: '08:30', fin: '14:30', descanso: 0, horas: 6.0 },
            { dia: 'Sábado', laborable: false, inicio: '00:00', fin: '00:00', descanso: 0, horas: 0 },
            { dia: 'Domingo', laborable: false, inicio: '00:00', fin: '00:00', descanso: 0, horas: 0 }
        ]
    }
};

// Un horario por petición. Otro turno del mismo puesto = otra petición.
const horarioDesdePlantilla = (plantilla, centro, nota) => ({
    turnoNombre: HORARIO_TEMPLATES[plantilla].nombre,
    tipoJornada: 'Completa (37,5 h/semana)',
    centro,
    dias: JSON.parse(JSON.stringify(HORARIO_TEMPLATES[plantilla].dias)),
    guardado: true,
    ultimaModif: nota
});

const INITIAL_CONTENIDO_COMUN = {
    titulo: 'Operarios/as de almacén y carretilleros/as - campaña logística 2026',
    descripcion: 'Importante empresa multinacional del sector transporte y logística ubicada en la ZAL del Puerto de Bilbao precisa incorporar operarios/as y carretilleros/as para refuerzo continuado.',
    funciones: '• Preparación de pedidos mediante terminal de radiofrecuencia (picking).\n• Clasificación, paletizado y filmado de mercancía.\n• Carga y descarga de camiones mediante carretilla frontal y retráctil (según puesto).\n• Verificación de albaranes y control básico de stock.',
    requisitos: '• Experiencia previa mínima de 1 año en plataformas logísticas.\n• Disponibilidad para turno fijo (mañana o tarde) de lunes a viernes.\n• Vehículo propio para acceder al centro de trabajo.\n• Para puesto de carretillero: Carnet de carretillas en vigor según norma UNE 58451.',
    categoria: 'Compras, logística y almacén — Mozo/a de almacén',
    ubicacion: 'Santurtzi / Zierbena (Bizkaia)',
    jornada: 'Jornada completa (37,5 horas semanales)',
    condiciones: 'Contrato laboral temporal por ETT con posibilidad real de estabilidad. Salario según convenio sectorial + plus de productividad.',
    cta: '¡Inscríbete ahora y nuestro equipo de selección contactará contigo en menos de 24 horas laborables!'
};

// Plazas de cada petición (fase 6): en la demo vienen de la selección de ejemplo; si no, todas por cubrir.
const renumerarPlazas = (lista, codigo) => lista.map((p, i) => ({ ...p, id: `PLZ-${codigo}-${String(i + 1).padStart(2, '0')}`, numero: i + 1 }));
const plazaVacante = { estado: 'vacante', candidatoId: null, nombre: null, dni: null, telefono: null, email: null, fechaIncorporacion: null, contratoTipo: null, scoring: null, foto: null };
const plazasVacantes = (p) => renumerarPlazas(Array.from({ length: p.solicitados }, () => ({ ...plazaVacante })), p.id.slice(-4));
const NOMBRE_CARNE = { carretilla: 'Carné de carretillero', manipulador: 'Manipulador/a de alimentos' };

// Requisitos de la petición que se comprueban al proponer a alguien
const REQUISITO_CARNE = { carretillero: 'carretilla', camarero: 'manipulador', camarero_barra: 'manipulador', ayudante_cocina: 'manipulador', cocinero: 'manipulador', envasado: 'manipulador' };
const comprobarRequisitos = (c, pet, plantilla) => {
    const carne = REQUISITO_CARNE[pet.perfil];
    // Contra la API la lista de la bolsa no trae carnés ni turnos: solo se comprueba la documentación (la API avisa al proponer)
    if (c.carnes === undefined) return [{ id: 'doc', texto: 'Documentación en vigor', ok: c.docOk !== false }];
    return [
        { id: 'carne', texto: carne ? NOMBRE_CARNE[carne] : 'Sin carné específico', ok: !carne || (c.carnes || []).includes(carne) },
        { id: 'turno', texto: HORARIO_TEMPLATES[plantilla]?.nombre || 'Turno', ok: (c.turnos || []).includes(plantilla) },
        { id: 'doc', texto: 'Documentación en vigor', ok: c.docOk !== false },
    ];
};

// Embudo de selección de cada petición
const ETAPAS = [
    { id: 'inscrito', texto: 'Inscritos', tono: 'neutral' },
    { id: 'preseleccionado', texto: 'Preseleccionados', tono: 'info' },
    { id: 'entrevista', texto: 'Entrevista', tono: 'accent' },
    { id: 'propuesto', texto: 'Propuestos al cliente', tono: 'warning' },
    { id: 'aceptado', texto: 'Aceptados', tono: 'success' },
    { id: 'descartado', texto: 'Descartados', tono: 'danger' },
];
const ETAPAS_EN_PROCESO = ['preseleccionado', 'entrevista', 'propuesto'];
const enProcesoDe = (lista) => (lista || []).filter(x => ETAPAS_EN_PROCESO.includes(x.etapa)).length;

// Estados de una plaza: por cubrir → pendiente del cliente → cubierta → incorporada; y baja si alguien se va
const ESTADOS_PLAZA = {
    vacante: { texto: 'Por cubrir', tono: 'warning' },
    reservada: { texto: 'Pendiente del cliente', tono: 'info' },
    cubierta: { texto: 'Cubierta', tono: 'success' },
    incorporada: { texto: 'Incorporada', tono: 'success' },
    baja: { texto: 'Baja', tono: 'danger' },
};
const PLAZA_OCUPADA = ['reservada', 'cubierta', 'incorporada'];
const MOTIVOS_BAJA = ['No se presentó', 'Renuncia', 'No supera el periodo de prueba', 'A petición del cliente', 'Fin de la necesidad'];

// CPD por persona (se genera al confirmar la plaza) y CPD previo por petición (condiciones, antes de tener personas)
const ESTADOS_CPD = {
    sin_generar: { texto: 'Se genera al confirmar', tono: 'neutral' },
    enviado: { texto: 'Pendiente de firma', tono: 'warning' },
    firmado: { texto: 'Firmado', tono: 'success' },
};
// Sin firma electrónica: el CPD previo se genera en el servidor, se envía a mano y se marca
const ESTADOS_CPD_PREVIO = {
    sin_generar: { texto: 'Sin generar', tono: 'neutral' },
    generado: { texto: 'Generado, sin enviar', tono: 'info' },
    enviado: { texto: 'Enviado, sin revisar', tono: 'warning' },
    revisado: { texto: 'Revisado por el cliente', tono: 'success' },
};

// Portales propios de la ETT (subdominio configurado en Mi ETT): uno para empresas y otro para candidatos
const SUBDOMINIO_ETT = 'ettglobal';
const urlPortal = (tipo, petId) => `https://${SUBDOMINIO_ETT}.tramitnow.com/${tipo === 'empresa' ? 'empresas' : `candidatos/ofertas/${petId}`}`;

// Requisitos de un candidato frente a la petición: carné, turno y documentación
function Requisitos({ lista, compacto = false }) {
    const corto = { carne: 'Carné', turno: 'Turno', doc: 'Documentos' };
    return (
        <span className="flex flex-wrap gap-1">
            {lista.map(r => (
                <span key={r.id} title={`${r.texto}: ${r.ok ? 'cumple' : 'no cumple'}`} className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] ${r.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {r.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    {compacto ? corto[r.id] : r.texto}
                </span>
            ))}
        </span>
    );
}

const cubiertasDe = (lista) => (lista || []).filter(p => ['cubierta', 'incorporada'].includes(p.estado)).length;

// Contenido común de la publicación en portales, a partir del puesto y el turno de la petición
const contenidoDe = (p, horario) => {
    const turno = (horario?.turnoNombre || 'el turno indicado').toLowerCase();
    return {
        ...INITIAL_CONTENIDO_COMUN,
        titulo: `${p.puesto} - ${turno} - ${p.ciudad}`,
        descripcion: `Empresa del sector ${p.sector.toLowerCase()} en ${p.ciudad} busca ${p.solicitados} ${p.solicitados === 1 ? 'persona' : 'personas'} para el puesto de ${p.puesto.toLowerCase()}, del ${fechaCorta(p.inicio)} al ${fechaCorta(p.fin)}.`,
        funciones: `• ${p.descripcionCorta}`,
        requisitos: `• Disponibilidad para ${turno}.\n• ${p.carnetRequerido === 'Ninguno' ? 'No se necesita carné específico.' : `${p.carnetRequerido}.`}\n• EPIs que facilita la empresa: ${p.requiereEpi.toLowerCase()}.`,
        categoria: `${p.sector} — ${p.puesto}`,
        ubicacion: p.ciudad,
        jornada: horario?.tipoJornada || INITIAL_CONTENIDO_COMUN.jornada,
    };
};

// Pipeline de peticiones: una columna por estado; las tarjetas se arrastran para cambiar de estado
function PipelinePeticiones({ lista, plazas, horarios, onAbrir, onMover }) {
    const [sobre, setSobre] = useState(null);
    return (
        <div className="flex gap-3 overflow-x-auto pb-2">
            {ESTADOS_PETICION.map(col => {
                const items = lista.filter(p => p.estado === col.estado);
                return (
                    <div
                        key={col.estado}
                        onDragOver={(e) => { e.preventDefault(); setSobre(col.estado); }}
                        onDragLeave={() => setSobre(null)}
                        onDrop={(e) => { e.preventDefault(); setSobre(null); onMover(e.dataTransfer.getData('text/plain'), col.estado); }}
                        className={`w-64 shrink-0 rounded-xl border p-2 space-y-2 transition-colors ${sobre === col.estado ? 'border-indigo-400 bg-indigo-50/60' : 'border-slate-200 bg-slate-50'}`}
                    >
                        <div className="flex items-center justify-between px-1 pt-1">
                            <Badge tone={col.tono} dot>{col.estado}</Badge>
                            <span className="text-[11px] text-slate-500">{items.length} · {items.reduce((s, p) => s + p.solicitados, 0)} plazas</span>
                        </div>
                        {items.length === 0 && <div className="px-2 py-6 text-center text-[11px] text-slate-400">Arrastra aquí</div>}
                        {items.map(p => {
                            const cubiertas = cubiertasDe(plazas[p.id]);
                            const pct = Math.round((cubiertas / p.solicitados) * 100);
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    draggable
                                    onDragStart={(e) => e.dataTransfer.setData('text/plain', p.id)}
                                    onClick={() => onAbrir(p)}
                                    className="w-full text-left rounded-lg border border-slate-200 bg-white p-3 shadow-xs hover:border-indigo-300 cursor-grab active:cursor-grabbing"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-mono text-[11px] text-slate-500">{p.id}</span>
                                        <GripVertical className="w-3.5 h-3.5 text-slate-300" />
                                    </div>
                                    <div className="mt-1 text-xs font-medium text-slate-900 line-clamp-2">{p.puesto} · {(horarios[p.id]?.turnoNombre || '').toLowerCase()}</div>
                                    <div className="text-[11px] text-slate-500 line-clamp-1">{p.clienteNombre}</div>
                                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                                        <span>{cubiertas} de {p.solicitados} plazas</span>
                                        <span>Inicio {fechaCorta(p.inicio)}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
                                        <div className={`${pct === 100 ? 'bg-emerald-500' : 'bg-indigo-600'} h-1 rounded-full`} style={{ width: `${pct}%` }}></div>
                                    </div>
                                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                                        <span>{p.presupuestoOrigen}</span>
                                        <span>{p.responsable}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
}

export default function PeticionesView() {
    // Navigation
    const [currentView, setCurrentView] = useState('bandeja'); // 'bandeja' | 'detalle'
    const [busquedaPeticiones, setBusquedaPeticiones] = useState('');
    const [activeTab, setActiveTab] = useState('resumen'); // 'resumen', 'horarios', 'plazas', 'portales', 'documentos', 'auditoria'

    // Notifications / Toast
    const [toast, setToast] = useState(null);
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3800);
    };

    // Datos (usePeticiones). En la vista, cada petición se identifica por su código (id) y lleva el de la API en _id.
    const pet = usePeticiones();
    const seleccion = pet.seleccion; // plazas con personas, candidatos y portales: solo en la demo (fases 6 y 7)
    const soloDemo = (mensajeDemo, que, tipo = 'success') => showToast(DEMO ? mensajeDemo : `Disponible próximamente: ${que}.`, DEMO ? tipo : 'info');
    // Llama a la API (con usePeticiones) y avisa si falla. Devuelve lo que devuelve la acción, o undefined.
    const ejecutar = async (accion, mensajeOk) => {
        try {
            const r = await accion();
            if (mensajeOk) showToast(typeof mensajeOk === 'function' ? mensajeOk(r) : mensajeOk);
            return r;
        } catch (e) {
            showToast(mensajeError(e), 'error');
            return undefined;
        }
    };

    // Main States
    const [peticiones, setPeticiones] = useState([]);
    const [peticionId, setPeticionId] = useState('');
    // Ficha abierta: la petición completa, sus documentos, su actividad y los datos de la ETT para el CPD
    const [ficha, setFicha] = useState(null);
    const fila = peticiones.find(p => p.id === peticionId);
    const peticion = ficha?.peticion.id === peticionId
        ? { ...ficha.peticion, portalesActivos: fila?.portalesActivos ?? 0, candidaturas: fila?.candidaturas ?? 0 }
        : fila || PETICION_VACIA;
    const [horarios, setHorarios] = useState({});
    // Cada petición tiene un solo puesto: la "posición seleccionada" es siempre la propia petición
    const selectedPosId = peticion.id;
    const [savingHorario, setSavingHorario] = useState(false);
    const [horarioChangesUnsaved, setHorarioChangesUnsaved] = useState(false);

    // Listado: filtros, vista y agrupación
    const [filtroEstado, setFiltroEstado] = useState('activas');
    const [filtroCliente, setFiltroCliente] = useState('');
    const [filtroPresupuesto, setFiltroPresupuesto] = useState('');
    const [filtroResponsable, setFiltroResponsable] = useState('');
    const [vistaListado, setVistaListado] = useState('tabla'); // 'tabla' | 'pipeline'
    const [agruparPorPresupuesto, setAgruparPorPresupuesto] = useState(false);

    // Ventanas: duplicar con otro horario, nueva petición, cancelar y copiar difusión
    const [duplicar, setDuplicar] = useState(null);
    const [nuevaPeticion, setNuevaPeticion] = useState(null);
    const [cancelar, setCancelar] = useState(null); // { id, motivo }
    const [copiarDifusion, setCopiarDifusion] = useState(false);

    // Plazas y candidatos: embudo, bajas, CPD previo y portales propios de cada petición
    const [embudo, setEmbudo] = useState({});
    const [filtroEtapa, setFiltroEtapa] = useState('');
    const [verTodosCandidatos, setVerTodosCandidatos] = useState(false);
    const [bajaPlaza, setBajaPlaza] = useState(null);
    const [motivosBaja, setMotivosBaja] = useState(MOTIVOS_BAJA);
    const [verCpdPrevio, setVerCpdPrevio] = useState(false);
    // Documentos del servicio que se suben a la petición abierta (además del presupuesto firmado, que sale solo)
    const docsServicio = { [peticion.id]: ficha?.peticion.id === peticion.id ? ficha.documentos : [] };
    const [subirDoc, setSubirDoc] = useState(null); // { tipo, nombre, archivo }
    const [buscarPresu, setBuscarPresu] = useState('');
    // Presupuestos aceptados del buscador de «Nueva petición» (los busca el servidor)
    const [presupuestosAceptados, setPresupuestosAceptados] = useState({ lista: [], total: 0, cargando: false });
    const [portalesPropios, setPortalesPropios] = useState({});
    const cpdPrevio = { [peticion.id]: peticion.cpdPrevio || { estado: 'sin_generar', comprobaciones: [] } };
    // La ficha abierta cambia por lo que devuelve la API (una petición suelta o la ficha entera)
    const ponerFicha = (p) => {
        if (!p) return;
        setFicha(f => (f && f.peticion.id === p.id ? { ...f, peticion: p } : f));
    };
    const ponerFichaEntera = (f) => {
        if (!f) return;
        setFicha(f);
        setHorarios(prev => ({ ...prev, [f.peticion.id]: f.horario }));
        setPeticiones(prev => prev.map(p => (p.id === f.peticion.id ? { ...p, turnoNombre: f.peticion.turnoNombre, plantilla: f.peticion.plantilla, solicitados: f.peticion.solicitados, inicio: f.peticion.inicio, fin: f.peticion.fin, responsable: f.peticion.responsable } : p)));
    };
    // CPD previo, sin firma electrónica: se genera en el servidor, se envía a mano y se marca como enviado y revisado
    const [datosServicio, setDatosServicio] = useState(null);
    const generarCpdPrevio = async () => {
        const r = await ejecutar(() => pet.generarCpdPrevio(ficha));
        if (!r) return;
        ponerFichaEntera(r.ficha);
        showToast(r.hay ? 'CPD previo generado. Envíalo al cliente y márcalo como enviado.' : 'CPD previo generado. En la demo no hay PDF: mira las condiciones en «Ver condiciones».', r.hay ? 'success' : 'info');
    };
    const enviarCpdPrevio = async () => {
        ponerFichaEntera(await ejecutar(() => pet.marcarCpdPrevio(ficha, 'enviado'), `CPD previo marcado como enviado${peticion.emailContacto ? ` a ${peticion.emailContacto}` : ''}.`));
    };
    const marcarCpdRevisado = async () => {
        ponerFichaEntera(await ejecutar(() => pet.marcarCpdPrevio(ficha, 'revisado'), 'CPD previo marcado como revisado por el cliente.'));
    };
    const descargarCpdPrevio = async () => {
        if (peticion.cpdPrevio?.estado === 'sin_generar' || peticion.cpdPrevio?.desactualizado) return generarCpdPrevio();
        const doc = (ficha?.documentos || []).find(d => d.tipo.startsWith('CPD previo'));
        const hay = doc ? await ejecutar(() => pet.descargarDocumento(doc.id)) : false;
        if (hay === false) showToast(DEMO ? 'En la demo no hay PDF: mira las condiciones en «Ver condiciones».' : 'No se encuentra el PDF: vuelve a generarlo.', 'info');
    };
    const guardarDatosServicio = async () => {
        const r = await ejecutar(() => pet.guardarServicio(ficha, datosServicio), 'Datos del servicio guardados.');
        if (!r) return;
        ponerFichaEntera(r);
        setDatosServicio(null);
    };
    const cambiarPortalPropio = (tipo, activo) => {
        const pp = portalesPropios[peticion.id] || {};
        const bienvenida = activo && tipo === 'empresa' && pp.bienvenidaEmpresa && !pp.bienvenidaEmpresaEnviada;
        setPortalesPropios(prev => ({
            ...prev,
            [peticion.id]: { ...pp, [tipo]: activo, ...(bienvenida ? { bienvenidaEmpresaEnviada: new Date().toISOString().slice(0, 10) } : {}) },
        }));
        const nombre = tipo === 'empresa' ? 'Portal de empresas' : 'Portal de candidatos';
        showToast(activo
            ? `${nombre} activado para ${peticion.id}.${bienvenida ? ` Bienvenida enviada a ${peticion.emailContacto}.` : ''}`
            : `${nombre} desactivado para ${peticion.id}.`);
    };

    // Portales & Content
    const [contenidoComun, setContenidoComun] = useState(INITIAL_CONTENIDO_COMUN);
    const [comunSavedStatus, setComunSavedStatus] = useState('Guardado'); // 'Guardado', 'Modificado', 'Guardando...'
    const [portales, setPortales] = useState([]);

    // Plazas y Candidatos Management State
    const [plazas, setPlazas] = useState({});
    const [candidatosPool, setCandidatosPool] = useState([]);
    const [candidatoFichaModal, setCandidatoFichaModal] = useState(null); // Candidate object or null to display profile
    const [assignCandidateModal, setAssignCandidateModal] = useState(null); // { posId, plaza } or null
    const [candidateSearchFilter, setCandidateSearchFilter] = useState('');

    // La selección de ejemplo (solo demo) se carga una vez
    const [seleccionCargada, setSeleccionCargada] = useState(false);
    useEffect(() => {
        if (!seleccion || seleccionCargada) return;
        setEmbudo(seleccion.embudo);
        setCandidatosPool(seleccion.candidatos);
        setPortalesPropios(seleccion.portalesPropios);
        setPortales(seleccion.portales);
        setPlazas(prev => ({ ...prev, ...seleccion.plazas }));
        setSeleccionCargada(true);
    }, [seleccion]);
    // Lista de la API: portales y candidaturas de la demo encima; plazas por cubrir para las que no tienen
    useEffect(() => {
        if (!pet.listado || pet.seleccionCargando) return;
        setPeticiones(pet.listado.map(p => ({ ...p, ...(seleccion?.difusion[p.id] || {}) })));
        setHorarios(prev => ({ ...Object.fromEntries(pet.listado.map(p => [p.id, prev[p.id]?.dias ? prev[p.id] : { turnoNombre: p.turnoNombre }])) }));
        setPlazas(prev => {
            const n = { ...prev };
            pet.listado.forEach(p => { if (!n[p.id] || (!seleccion?.plazas[p.id] && n[p.id].length !== p.solicitados)) n[p.id] = seleccion?.plazas[p.id] || plazasVacantes(p); });
            return n;
        });
    }, [pet.listado, pet.seleccionCargando]);

    // Modals for Portals
    const [editPortalModal, setEditPortalModal] = useState(null); // portal object or null
    const [previewPortalModal, setPreviewPortalModal] = useState(null); // { portal, content, isCommon }
    const [commonPreviewOpen, setCommonPreviewOpen] = useState(false);
    const [restoreConfirmModal, setRestoreConfirmModal] = useState(null); // portal object

    // Sync Multi-Portal Process Modal
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [syncStep, setSyncStep] = useState(0); // 0: review, 1: validando, 2: adaptando, 3: enviando, 4: exito

    // Helper calculation
    const currentSchedule = useMemo(() => horarios[selectedPosId], [horarios, selectedPosId]);
    const selectedPositionObj = peticion;

    const totalHorasSemana = useMemo(() => {
        if (!currentSchedule || !currentSchedule.dias) return 0;
        return currentSchedule.dias.reduce((acc, d) => acc + (d.laborable ? Number(d.horas || 0) : 0), 0);
    }, [currentSchedule]);

    // La petición como "posición" única, para las partes que trabajan con plazas y horario
    const posActual = useMemo(() => ({ ...peticion, incorporados: cubiertasDe(plazas[peticion.id]) }), [peticion, plazas]);
    const posiciones = [posActual];

    // Listado (la sucursal la elige la cabecera: el servidor filtra la lista por ella)
    const clientesListado = useMemo(() => [...new Map(peticiones.map(p => [p.cliente, p.clienteNombre])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [peticiones]);
    const responsablesListado = useMemo(() => [...new Set(peticiones.map(p => p.responsable))].sort(), [peticiones]);
    const hayFiltros = filtroEstado !== 'activas' || filtroCliente || filtroPresupuesto || filtroResponsable || busquedaPeticiones;
    const limpiarFiltros = () => {
        setFiltroEstado('activas'); setFiltroCliente(''); setFiltroPresupuesto(''); setFiltroResponsable(''); setBusquedaPeticiones('');
    };
    const peticionesFiltradas = useMemo(() => {
        const q = busquedaPeticiones.trim().toLowerCase();
        return peticiones.filter(p =>
            (filtroEstado === 'todas' || (filtroEstado === 'activas' ? ESTADOS_ACTIVOS.includes(p.estado) : p.estado === filtroEstado)) &&
            (!filtroCliente || p.cliente === filtroCliente) &&
            (!filtroPresupuesto || p.presupuesto === filtroPresupuesto) &&
            (!filtroResponsable || p.responsable === filtroResponsable) &&
            (!q || [p.id, p.clienteNombre, p.puesto, p.presupuesto].some(t => t.toLowerCase().includes(q)))
        );
    }, [peticiones, filtroEstado, filtroCliente, filtroPresupuesto, filtroResponsable, busquedaPeticiones]);
    const gruposListado = useMemo(() => {
        if (!agruparPorPresupuesto) return [{ id: 'todas', items: peticionesFiltradas }];
        const grupos = [];
        peticionesFiltradas.forEach(p => {
            let g = grupos.find(x => x.id === p.presupuestoOrigen);
            if (!g) { g = { id: p.presupuestoOrigen, cliente: p.clienteNombre, items: [] }; grupos.push(g); }
            g.items.push(p);
        });
        return grupos;
    }, [peticionesFiltradas, agruparPorPresupuesto]);
    const resumenListado = useMemo(() => {
        const activas = peticiones.filter(p => ESTADOS_ACTIVOS.includes(p.estado));
        const plazasTot = activas.reduce((s, p) => s + p.solicitados, 0);
        const cubiertas = activas.reduce((s, p) => s + cubiertasDe(plazas[p.id]), 0);
        return {
            activas: activas.length,
            enSeleccion: activas.filter(p => ['En difusión', 'En selección'].includes(p.estado)).length,
            plazas: plazasTot,
            cubiertas,
            porCubrir: plazasTot - cubiertas,
            empiezanPronto: activas.filter(p => { const d = diasHasta(p.inicio); return d >= 0 && d <= 7 && cubiertasDe(plazas[p.id]) < p.solicitados; }).length,
            candidaturas: activas.reduce((s, p) => s + p.candidaturas, 0),
        };
    }, [peticiones, plazas]);

    // Abre la ficha: la pide entera (horario, documentos, actividad) y la enseña
    const abrirPeticion = async (id) => {
        const p = peticiones.find(x => x.id === id);
        if (!p) return;
        const d = await ejecutar(() => pet.abrir(p._id));
        if (!d) return;
        setFicha(d);
        setHorarios(prev => ({ ...prev, [id]: d.horario }));
        setPeticionId(id);
        cargarSeleccion(d.peticion);
        setActiveTab('resumen');
        setHorarioChangesUnsaved(false);
        setContenidoComun(contenidoDe(d.peticion, d.horario));
        setComunSavedStatus('Guardado');
        setPortales(prev => prev.map((x, i) => ({ ...x, activo: i < p.portalesActivos })));
        setCurrentView('detalle');
        if (window.location.hash !== `#/peticiones/${id}`) window.history.replaceState(null, '', `#/peticiones/${id}`);
    };
    const volverAlListado = () => {
        setCurrentView('bandeja');
        window.history.replaceState(null, '', '#/peticiones');
    };
    // Enlace directo a una petición (#/peticiones/PET-…), por ejemplo desde Presupuestos
    const enlaceDe = () => (window.location.hash.startsWith('#/peticiones/') ? window.location.hash.split('/')[2] || '' : '');
    const [enlace, setEnlace] = useState(enlaceDe);
    useEffect(() => {
        const alCambiar = () => {
            if (!window.location.hash.startsWith('#/peticiones')) return;
            const id = enlaceDe();
            if (id) setEnlace(id); else setCurrentView('bandeja');
        };
        window.addEventListener('hashchange', alCambiar);
        return () => window.removeEventListener('hashchange', alCambiar);
    }, []);
    useEffect(() => {
        if (!enlace || !peticiones.length) return;
        setEnlace('');
        if (enlace !== peticionId || currentView !== 'detalle') abrirPeticion(decodeURIComponent(enlace));
    }, [enlace, peticiones]);
    useEffect(() => {
        if (!DEMO || !peticionId) return;
        const activos = portales.filter(x => x.activo).length;
        setPeticiones(prev => prev.map(p => (p.id === peticionId && p.portalesActivos !== activos ? { ...p, portalesActivos: activos } : p)));
    }, [portales]);

    const moverPeticion = async (id, estado, motivo) => {
        if (!ESTADOS_PETICION.some(e => e.estado === estado)) return;
        const p = peticiones.find(x => x.id === id);
        if (!p || p.estado === estado) return;
        // Cancelar pide el motivo
        if (estado === 'Cancelada' && !motivo) { setCancelar({ id, motivo: '' }); return; }
        const r = await ejecutar(() => pet.cambiarEstado(p, estado, motivo), `${id} pasa a ${estado}.`);
        if (r && ficha?.peticion.id === id) ponerFicha({ ...r, emailContacto: r.emailContacto || ficha.peticion.emailContacto, telefonoContacto: r.telefonoContacto || ficha.peticion.telefonoContacto });
        if (r) setCancelar(null);
    };

    // Crear peticiones: siempre de un puesto de un presupuesto aceptado
    const abrirCreada = async (nueva, mensaje) => {
        if (!nueva) return;
        setPlazas(prev => ({ ...prev, [nueva.id]: plazasVacantes(nueva) }));
        setPeticiones(prev => [nueva, ...prev.filter(p => p.id !== nueva.id)]);
        showToast(mensaje);
        const d = await ejecutar(() => pet.abrir(nueva._id));
        if (!d) return;
        setFicha(d);
        setHorarios(prev => ({ ...prev, [nueva.id]: d.horario }));
        setPeticionId(nueva.id);
        cargarSeleccion(d.peticion);
        setContenidoComun(contenidoDe(d.peticion, d.horario));
        setPortales(prev => prev.map(x => ({ ...x, activo: false })));
        setActiveTab('resumen');
        setCurrentView('detalle');
        window.history.replaceState(null, '', `#/peticiones/${nueva.id}`);
    };
    const abrirDuplicar = () => {
        const otra = Object.keys(HORARIO_TEMPLATES).find(k => HORARIO_TEMPLATES[k].nombre !== currentSchedule.turnoNombre) || 'manana';
        setDuplicar({ plantilla: otra, solicitados: 1, inicio: peticion.inicio, fin: peticion.fin });
    };
    const confirmarDuplicar = async () => {
        const datos = { ...duplicar };
        const nueva = await ejecutar(() => pet.duplicar(peticion, {
            plazas: Number(datos.solicitados), inicio: datos.inicio, fin: datos.fin, horario: horarioDesdePlantilla(datos.plantilla, peticion.centroTrabajo, ''),
        }));
        if (!nueva) return;
        setDuplicar(null);
        await abrirCreada(nueva, `Petición ${nueva.id} creada: ${peticion.puesto.toLowerCase()}, ${HORARIO_TEMPLATES[datos.plantilla].nombre.toLowerCase()}.`);
    };
    const confirmarNuevaPeticion = async () => {
        const presu = nuevaPeticion.presu;
        const fin = new Date(`${nuevaPeticion.inicio}T00:00:00`); fin.setMonth(fin.getMonth() + 3);
        const nueva = await ejecutar(() => pet.crear({
            quotePositionId: nuevaPeticion.tipo, plazas: Number(nuevaPeticion.solicitados), inicio: nuevaPeticion.inicio, fin: `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, '0')}-${String(fin.getDate()).padStart(2, '0')}`,
            horario: horarioDesdePlantilla(nuevaPeticion.plantilla, '', ''),
        }));
        if (!nueva) return;
        setNuevaPeticion(null);
        await abrirCreada(nueva, `Petición ${nueva.id} creada desde ${presu.id}.`);
    };
    // Buscador de presupuestos aceptados: busca en el servidor al escribir
    useEffect(() => {
        if (!nuevaPeticion || nuevaPeticion.presu) return;
        let vigente = true;
        setPresupuestosAceptados(x => ({ ...x, cargando: true }));
        const t = setTimeout(() => {
            pet.buscarPresupuestos(buscarPresu).then(
                r => vigente && setPresupuestosAceptados({ ...r, cargando: false }),
                e => { if (vigente) { setPresupuestosAceptados({ lista: [], total: 0, cargando: false }); showToast(mensajeError(e), 'error'); } },
            );
        }, 250);
        return () => { vigente = false; clearTimeout(t); };
    }, [buscarPresu, !!nuevaPeticion, nuevaPeticion?.presu]);

    // Documentos del servicio
    const recargarDocumentos = async () => {
        const d = await ejecutar(() => pet.abrir(peticion._id));
        if (d) setFicha(d);
    };
    const descargarDocServicio = async (doc) => {
        if (doc.cpd) return descargarCpdPrevio();
        if (!doc.id) return showToast(`Descarga simulada: ${doc.nombre}`);
        const hay = await ejecutar(() => pet.descargarDocumento(doc.id));
        if (hay === false) showToast(`En la demo no hay fichero: ${doc.nombre}`, 'info');
    };
    const quitarDocServicio = async (doc) => {
        if (await ejecutar(() => pet.quitarDocumento(doc.id).then(() => true), "Documento quitado")) recargarDocumentos();
    };
    const subirDocServicio = async () => {
        const d = { ...subirDoc };
        const r = await ejecutar(() => pet.subirDocumento(peticion, d), (x) => `Documento «${x.nombre}» subido a ${peticion.id}`);
        if (!r) return;
        setSubirDoc(null);
        recargarDocumentos();
    };

    // Handlers: Plazas & Candidatos
    const handleOpenCandidatoFichaById = (candidatoId) => {
        // Search in assigned candidates or candidates pool
        let found = candidatosPool.find(c => c.id === candidatoId);
        if (!found) {
            // Search in plazas
            for (const posId in plazas) {
                const pl = plazas[posId].find(p => p.candidatoId === candidatoId);
                if (pl) {
                    found = {
                        id: pl.candidatoId,
                        nombre: pl.nombre,
                        dni: pl.dni,
                        telefono: pl.telefono,
                        email: pl.email,
                        puestoPrincipal: selectedPositionObj.puesto,
                        experiencia: 'Personal en misión activa ETT (Asignado a ' + posId + ')',
                        disponibilidad: 'En asignación activa',
                        carnets: selectedPositionObj.carnetRequerido,
                        scoring: pl.scoring || 95,
                        ubicacion: 'Bizkaia',
                        valoracionETT: 'Trabajador incorporado en regla con contrato CPD emitido.',
                        estadoSeleccion: 'Incorporado / En Misión',
                        foto: pl.foto
                    };
                    break;
                }
            }
        }
        if (found) {
            setCandidatoFichaModal(found);
        } else {
            showToast('Ficha de candidato no encontrada', 'error');
        }
    };

    // Plazas: proponer → el cliente confirma (en su portal) → cubierta con CPD enviado a firma → incorporada
    const cambiarPlaza = (petId, plazaId, cambios) => {
        setPlazas(prev => ({ ...prev, [petId]: (prev[petId] || []).map(p => (p.id === plazaId ? { ...p, ...cambios } : p)) }));
    };
    // Al proponer a alguien contra la API: la bolsa de candidatos (sin abrir fichas)
    useEffect(() => {
        if (seleccion || !assignCandidateModal) return;
        pet.bolsa(peticion.perfil).then(l => setCandidatosPool(prev => [...prev, ...l.filter(c => !prev.some(x => x.id === c.id))]), () => {});
    }, [assignCandidateModal]);
    // Selección contra la API (fase 6): plazas, embudo y candidatos de la petición abierta, desde sus candidaturas
    const cargarSeleccion = async (p = peticion) => {
        if (seleccion || !p?._id) return;
        const r = await ejecutar(() => pet.seleccionDe(p));
        if (!r) return;
        setPlazas(prev => ({ ...prev, [p.id]: r.plazas }));
        setEmbudo(prev => ({ ...prev, [p.id]: r.embudo }));
        setCandidatosPool(prev => [...r.candidatos.filter(c => !prev.some(x => x.id === c.id)), ...prev.map(x => r.candidatos.find(c => c.id === x.id) ? { ...x, ...r.candidatos.find(c => c.id === x.id), matchPosicion: [...new Set([...(x.matchPosicion || []), p.perfil])] } : x)]);
    };
    const cambiarEtapa = (petId, candidatoId, etapa) => {
        if (!seleccion) {
            const app = (embudo[petId] || []).find(x => x.id === candidatoId)?._applicationId;
            if (app) ejecutar(() => pet.cambiarEtapa(app, etapa).then(() => true)).then(ok => ok && cargarSeleccion());
            return;
        }
        setEmbudo(prev => {
            const lista = prev[petId] || [];
            const existe = lista.some(x => x.id === candidatoId);
            return { ...prev, [petId]: existe ? lista.map(x => (x.id === candidatoId ? { ...x, etapa } : x)) : [...lista, { id: candidatoId, etapa, fecha: new Date().toISOString().slice(0, 10) }] };
        });
    };
    // Dónde está ya ocupada una persona (en cualquier petición)
    const plazaDe = (candidatoId) => {
        for (const petId in plazas) {
            const pl = plazas[petId].find(p => p.candidatoId === candidatoId && PLAZA_OCUPADA.includes(p.estado));
            if (pl) return { petId, plaza: pl };
        }
        return null;
    };

    const handleAssignCandidateToPlaza = async (petId, plazaId, candidato) => {
        const plaza = (plazas[petId] || []).find(p => p.id === plazaId);
        if (!seleccion) {
            const avisos = await ejecutar(() => pet.proponer(peticion, candidato.id, plazaId));
            if (avisos === undefined) return;
            setAssignCandidateModal(null);
            showToast(`${candidato.nombre} propuesto/a para la plaza ${plaza?.numero}. Confírmalo cuando responda el cliente.${avisos.length ? ` Aviso: ${avisos.join(', ').toLowerCase()}.` : ''}`, avisos.length ? 'error' : 'success');
            cargarSeleccion();
            return;
        }
        cambiarPlaza(petId, plazaId, {
            estado: 'reservada', candidatoId: candidato.id, nombre: candidato.nombre, dni: candidato.dni, telefono: candidato.telefono,
            email: candidato.email, scoring: candidato.scoring, foto: candidato.foto, fechaIncorporacion: fechaCorta(peticion.inicio),
            contratoTipo: 'Circunstancias de la producción', cpd: 'sin_generar',
        });
        cambiarEtapa(petId, candidato.id, 'propuesto');
        setAssignCandidateModal(null);
        showToast(portalesPropios[petId]?.empresa
            ? `${candidato.nombre} propuesto/a para la plaza ${plaza?.numero}. El cliente lo confirmará en su portal.`
            : `${candidato.nombre} propuesto/a para la plaza ${plaza?.numero}. Confírmalo cuando responda el cliente.`);
    };
    const confirmarPlaza = async (petId, plaza) => {
        if (!seleccion) {
            if ((await ejecutar(() => pet.confirmar(plaza._applicationId).then(() => true), `Plaza ${plaza.numero} cubierta: ${plaza.nombre} confirmado/a por el cliente. Su CPD, contrato y alta llegan con Contratos y altas (fase 7).`))) cargarSeleccion();
            return;
        }
        cambiarPlaza(petId, plaza.id, { estado: 'cubierta', cpd: 'enviado' });
        cambiarEtapa(petId, plaza.candidatoId, 'aceptado');
        showToast(`Plaza ${plaza.numero} cubierta. CPD de ${plaza.nombre} generado y enviado a firma a ${peticion.emailContacto}.`);
    };
    const retirarPropuesta = async (petId, plaza) => {
        if (!seleccion) {
            if ((await ejecutar(() => pet.retirar(plaza._applicationId).then(() => true), `Propuesta de ${plaza.nombre} retirada. Vuelve a entrevista.`))) cargarSeleccion();
            return;
        }
        cambiarPlaza(petId, plaza.id, { ...plazaVacante, cpd: null });
        cambiarEtapa(petId, plaza.candidatoId, 'entrevista');
        showToast(`Propuesta de ${plaza.nombre} retirada. Vuelve a entrevista.`);
    };
    const recordarCpd = (plaza) => soloDemo(`Recordatorio de firma del CPD de ${plaza.nombre} enviado a ${peticion.emailContacto}.`, 'el CPD de cada persona y su firma (fase 7 del plan)');
    const confirmarBaja = () => {
        if (!seleccion) { setBajaPlaza(null); soloDemo('', 'las bajas de una plaza, con Contratos y altas (fase 7 del plan)'); return; }
        const { plaza, motivo, notas } = bajaPlaza;
        cambiarPlaza(peticion.id, plaza.id, { ...plazaVacante, estado: 'baja', motivoBaja: notas ? `${motivo}: ${notas}` : motivo, bajaDe: plaza.nombre, cpd: null });
        if (plaza.candidatoId) cambiarEtapa(peticion.id, plaza.candidatoId, 'descartado');
        setBajaPlaza(null);
        showToast(`Baja de ${plaza.nombre} registrada (${motivo}). La plaza ${plaza.numero} queda para buscar sustituto.`);
    };

    // Handlers: Horarios
    const handleApplyTemplate = (templateKey) => {
        const template = HORARIO_TEMPLATES[templateKey];
        if (!template) return;
        setHorarios(prev => ({
            ...prev,
            [selectedPosId]: {
                ...prev[selectedPosId],
                turnoNombre: template.nombre,
                dias: JSON.parse(JSON.stringify(template.dias)),
                guardado: false
            }
        }));
        setHorarioChangesUnsaved(true);
        showToast(`Plantilla "${template.nombre}" aplicada a ${selectedPosId}. Recuerda guardar.`);
    };

    const handleDayFieldChange = (dayIndex, field, value) => {
        setHorarios(prev => {
            const currentDays = [...prev[selectedPosId].dias];
            const targetDay = { ...currentDays[dayIndex] };

            if (field === 'laborable') {
                targetDay.laborable = value;
                if (!value) {
                    targetDay.horas = 0;
                } else {
                    // calculate standard
                    targetDay.horas = 7.5;
                }
            } else if (field === 'descanso') {
                targetDay.descanso = Number(value) || 0;
            } else if (field === 'inicio') {
                targetDay.inicio = value;
            } else if (field === 'fin') {
                targetDay.fin = value;
            }

            // Re-calculate daily effective hours
            if (targetDay.laborable && targetDay.inicio && targetDay.fin) {
                try {
                    const [hI, mI] = targetDay.inicio.split(':').map(Number);
                    const [hF, mF] = targetDay.fin.split(':').map(Number);
                    let minI = hI * 60 + mI;
                    let minF = hF * 60 + mF;
                    if (minF < minI) minF += 24 * 60; // overnight
                    const diffMin = Math.max(0, (minF - minI) - targetDay.descanso);
                    targetDay.horas = Math.round((diffMin / 60) * 10) / 10;
                } catch (e) {
                    targetDay.horas = 7.5;
                }
            }

            currentDays[dayIndex] = targetDay;
            return {
                ...prev,
                [selectedPosId]: {
                    ...prev[selectedPosId],
                    dias: currentDays,
                    guardado: false
                }
            };
        });
        setHorarioChangesUnsaved(true);
    };

    const handleSaveSchedule = async () => {
        setSavingHorario(true);
        const r = await ejecutar(() => pet.guardarHorario(ficha, currentSchedule), `Horario y turno guardados correctamente de ${selectedPosId}.`);
        setSavingHorario(false);
        if (!r) return;
        ponerFichaEntera(r);
        setHorarioChangesUnsaved(false);
    };


    // Handlers: Portales & Contenido
    const handleSaveContenidoComun = (e) => {
        e?.preventDefault();
        if (!contenidoComun.titulo.trim() || !contenidoComun.descripcion.trim() || !contenidoComun.requisitos.trim()) {
            showToast('Título, descripción y requisitos son obligatorios en el contenido común.', 'error');
            return;
        }
        setComunSavedStatus('Guardando...');
        setTimeout(() => {
            setComunSavedStatus('Guardado');
            showToast('Contenido común guardado correctamente.');
        }, 600);
    };

    const handleTogglePortal = (portalId) => {
        setPortales(prev => prev.map(p => {
            if (p.id === portalId) {
                const newActivo = !p.activo;
                return {
                    ...p,
                    activo: newActivo,
                    estadoApi: newActivo ? 'Pendiente de sincronizar' : 'Pausado'
                };
            }
            return p;
        }));
        showToast(`Estado de publicación actualizado.`);
    };

    const handleSaveCustomPortal = (updatedCustomContent) => {
        if (!editPortalModal) return;
        setPortales(prev => prev.map(p => {
            if (p.id === editPortalModal.id) {
                return {
                    ...p,
                    personalizado: true,
                    customContent: { ...updatedCustomContent },
                    estadoApi: 'Pendiente de sincronizar'
                };
            }
            return p;
        }));
        setEditPortalModal(null);
        showToast(`Personalización para ${editPortalModal.nombre} guardada.`);
    };

    const handleRestoreCommon = (portal) => {
        setPortales(prev => prev.map(p => {
            if (p.id === portal.id) {
                return {
                    ...p,
                    personalizado: false,
                    customContent: null,
                    estadoApi: 'Pendiente de sincronizar'
                };
            }
            return p;
        }));
        setRestoreConfirmModal(null);
        showToast(`Se ha restaurado el contenido común para ${portal.nombre}.`);
    };

    // Execution of Sync flow
    const startSyncProcess = () => {
        setIsSyncModalOpen(true);
        setSyncStep(1); // validando

        setTimeout(() => {
            setSyncStep(2); // adaptando campos
            setTimeout(() => {
                setSyncStep(3); // enviando apis
                setTimeout(() => {
                    setSyncStep(4); // exito
                    const nowStr = new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
                    setPortales(prev => prev.map(p => ({
                        ...p,
                        estadoApi: p.activo ? 'Sincronizado' : 'Pausado',
                        ultSinc: nowStr
                    })));
                }, 900);
            }, 800);
        }, 800);
    };

    if (!pet.listado && pet.cargando) return <CargandoPagina texto="Cargando peticiones" />;
    if (pet.error) {
        return (
            <Page>
                <ErrorCarga titulo="No se han podido cargar las peticiones" mensaje={pet.error} onReintentar={pet.recargar} />
            </Page>
        );
    }

    return (
        <div className="flex min-h-full">
            {/* TOAST ALERT */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-lg border border-slate-700 animate-fade-in text-sm font-medium">
                    {toast.type === 'error' ? (
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                    ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    )}
                    <span>{toast.message}</span>
                    <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* MAIN SIDEBAR UNIFIED */}

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* VIEW 1: LISTADO DE PETICIONES (una fila por petición; cada petición es un puesto) */}
                {currentView === 'bandeja' && (
                    <Page>
                        <PageHeader
                            title="Peticiones"
                            count={peticiones.length}
                            subtitle="Cada petición es un puesto de un presupuesto aceptado, con su horario, sus plazas y su difusión en portales."
                            actions={<Button variant="primary" icon={Plus} disabled={!pet.puedeEditar} onClick={() => { setBuscarPresu(''); setNuevaPeticion({ presu: null, tipo: '', plantilla: 'manana', solicitados: 1, inicio: '' }); }}>Nueva petición</Button>}
                        />

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <KpiTile label="Activas" tone="accent" value={resumenListado.activas} hint={`${resumenListado.enSeleccion} en selección o difusión`} active={filtroEstado === 'activas'} onClick={() => setFiltroEstado('activas')} />
                            <KpiTile label="Plazas por cubrir" tone="warning" value={resumenListado.porCubrir} hint={`${resumenListado.cubiertas} de ${resumenListado.plazas} cubiertas en las activas`} />
                            <KpiTile label="Empiezan en 7 días" value={resumenListado.empiezanPronto} hint="Con plazas aún sin cubrir" />
                            <KpiTile label="Candidaturas de portales" value={resumenListado.candidaturas} hint="En las peticiones activas" />
                        </div>

                        <Card className="overflow-hidden">
                            <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-200">
                                <SearchInput
                                    className="flex-1 min-w-[220px] max-w-sm"
                                    value={busquedaPeticiones}
                                    onChange={setBusquedaPeticiones}
                                    placeholder="Buscar por código, cliente, puesto o presupuesto..."
                                />
                                <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} aria-label="Estado">
                                    <option value="activas">Activas</option>
                                    <option value="todas">Todos los estados</option>
                                    {ESTADOS_PETICION.map(e => <option key={e.estado} value={e.estado}>{e.estado}</option>)}
                                </Select>
                                <Select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} aria-label="Cliente">
                                    <option value="">Todos los clientes</option>
                                    {clientesListado.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
                                </Select>
                                <Select value={filtroPresupuesto} onChange={(e) => setFiltroPresupuesto(e.target.value)} aria-label="Presupuesto">
                                    <option value="">Todos los presupuestos</option>
                                    {[...new Set(peticiones.map(p => p.presupuesto))].map(id => <option key={id} value={id}>{id}</option>)}
                                </Select>
                                <Select value={filtroResponsable} onChange={(e) => setFiltroResponsable(e.target.value)} aria-label="Responsable">
                                    <option value="">Todos los responsables</option>
                                    {responsablesListado.map(r => <option key={r} value={r}>{r}</option>)}
                                </Select>
                                {hayFiltros && <Button size="sm" variant="ghost" onClick={limpiarFiltros}>Limpiar</Button>}
                                <div className="ml-auto flex items-center gap-2">
                                    {vistaListado === 'tabla' && (
                                        <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                                            <input type="checkbox" checked={agruparPorPresupuesto} onChange={(e) => setAgruparPorPresupuesto(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                            Agrupar por presupuesto
                                        </label>
                                    )}
                                    <Segmented
                                        value={vistaListado}
                                        onChange={setVistaListado}
                                        options={[{ id: 'tabla', title: 'Tabla', icon: List }, { id: 'pipeline', title: 'Pipeline', icon: SquareKanban }]}
                                    />
                                </div>
                            </div>

                            {peticiones.length === 0 ? (
                                <EmptyState icon={FileText} title="Aún no hay peticiones" text="Se crean desde un presupuesto aceptado: con «Nueva petición» o con «Crear peticiones» en el presupuesto." />
                            ) : peticionesFiltradas.length === 0 ? (
                                <EmptyState icon={Search} title="No hay peticiones con estos filtros" action={<Button onClick={limpiarFiltros}>Limpiar filtros</Button>} />
                            ) : vistaListado === 'pipeline' ? (
                                <div className="p-3">
                                    <PipelinePeticiones lista={peticionesFiltradas} plazas={plazas} horarios={horarios} onAbrir={(p) => abrirPeticion(p.id)} onMover={moverPeticion} />
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-500">
                                                <th className="py-2 px-3 font-medium">Petición</th>
                                                <th className="py-2 px-3 font-medium">Cliente y presupuesto</th>
                                                <th className="py-2 px-3 font-medium">Fechas</th>
                                                <th className="py-2 px-3 font-medium">Cobertura</th>
                                                <th className="py-2 px-3 font-medium">Portales</th>
                                                <th className="py-2 px-3 font-medium">Responsable</th>
                                                <th className="py-2 px-3 font-medium">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {gruposListado.map(grupo => (
                                                <React.Fragment key={grupo.id}>
                                                    {agruparPorPresupuesto && (
                                                        <tr className="bg-slate-50/70 border-b border-slate-200">
                                                            <td colSpan={7} className="py-2 px-3">
                                                                <span className="font-medium text-slate-800">{grupo.id}</span>
                                                                <span className="text-slate-500"> · {grupo.cliente} · {grupo.items.length} {grupo.items.length === 1 ? 'petición' : 'peticiones'} · {grupo.items.reduce((s, p) => s + p.solicitados, 0)} plazas</span>
                                                            </td>
                                                        </tr>
                                                    )}
                                                    {grupo.items.map(p => {
                                                        const cubiertas = cubiertasDe(plazas[p.id]);
                                                        const pct = Math.round((cubiertas / p.solicitados) * 100);
                                                        const dias = diasHasta(p.inicio);
                                                        return (
                                                            <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer" onClick={() => abrirPeticion(p.id)}>
                                                                <td className="py-2.5 px-3">
                                                                    <div className="font-medium text-slate-900">{p.puesto} · {(horarios[p.id]?.turnoNombre || '').toLowerCase()}</div>
                                                                    <div className="text-[11px] text-slate-500">{p.id} · {p.centroTrabajo}</div>
                                                                </td>
                                                                <td className="py-2.5 px-3">
                                                                    <div className="text-slate-700">{p.clienteNombre}</div>
                                                                    <div className="text-[11px] text-slate-500">{p.presupuestoOrigen}</div>
                                                                </td>
                                                                <td className="py-2.5 px-3 whitespace-nowrap">
                                                                    <div className="text-slate-700">{fechaCorta(p.inicio) || "sin inicio"} a {fechaCorta(p.fin) || "sin fin"}</div>
                                                                    {ESTADOS_ACTIVOS.includes(p.estado) && dias >= 0 && dias <= 7 && cubiertas < p.solicitados && (
                                                                        <div className="text-[11px] text-amber-700">Empieza en {dias} {dias === 1 ? 'día' : 'días'}</div>
                                                                    )}
                                                                </td>
                                                                <td className="py-2.5 px-3">
                                                                    <div className="text-slate-700">{cubiertas} de {p.solicitados} plazas</div>
                                                                    <div className="w-28 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                                                                        <div className={`${pct === 100 ? 'bg-emerald-500' : 'bg-indigo-600'} h-1.5 rounded-full`} style={{ width: `${pct}%` }}></div>
                                                                    </div>
                                                                </td>
                                                                <td className="py-2.5 px-3">
                                                                    {p.portalesActivos > 0 ? <Badge tone="success">{p.portalesActivos} {p.portalesActivos === 1 ? 'activo' : 'activos'}</Badge> : <span className="text-slate-400">Sin publicar</span>}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{p.responsable}</td>
                                                                <td className="py-2.5 px-3">
                                                                    <Badge tone={tonoEstado(p.estado)} dot>{p.estado}</Badge>
                                                                    {p.motivoCancelacion && <div className="text-[11px] text-slate-500 mt-0.5">{p.motivoCancelacion}</div>}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Card>
                    </Page>
                )}

                {/* VIEW 2: FICHA DE UNA PETICIÓN (un solo puesto) */}
                {currentView === 'detalle' && (
                    <div className="w-full px-4 sm:px-6 py-5 space-y-4">
                        <PageHeader
                            breadcrumbs={[{ label: 'Peticiones', onClick: volverAlListado }, { label: peticion.id }]}
                            title={`${peticion.puesto} · ${currentSchedule.turnoNombre.toLowerCase()}`}
                            status={<Badge tone={tonoEstado(peticion.estado)} dot>{peticion.estado}</Badge>}
                            subtitle={
                                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <span className="inline-flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-slate-400" />{peticion.clienteNombre}</span>
                                    <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" />{peticion.centroTrabajo}</span>
                                    <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" />{fechaCorta(peticion.inicio) || "sin inicio"} a {fechaCorta(peticion.fin) || "sin fin"}</span>
                                    <button type="button" onClick={() => { window.location.hash = `#/presupuestos/${peticion.presupuesto}`; }} className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 hover:underline">
                                        <FileText className="w-3.5 h-3.5" />Presupuesto {peticion.presupuestoOrigen}
                                    </button>
                                </span>
                            }
                            actions={
                                <>
                                    <Select value={peticion.estado} onChange={(e) => moverPeticion(peticion.id, e.target.value)} aria-label="Cambiar estado">
                                        {ESTADOS_PETICION.map(e => <option key={e.estado} value={e.estado}>{e.estado}</option>)}
                                    </Select>
                                    <Button icon={Copy} onClick={abrirDuplicar}>Duplicar con otro horario</Button>
                                    <Button variant="primary" icon={Share2} onClick={() => (DEMO ? startSyncProcess() : soloDemo('', 'la publicación en portales de empleo (fase 7 del plan)'))}>Publicar cambios</Button>
                                </>
                            }
                        />

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <KpiTile label="Plazas cubiertas" value={`${posActual.incorporados} de ${posActual.solicitados}`} onClick={() => setActiveTab('plazas')}>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                                    <div className={`${posActual.incorporados === posActual.solicitados ? 'bg-emerald-500' : 'bg-indigo-600'} h-1.5 rounded-full`} style={{ width: `${Math.round((posActual.incorporados / posActual.solicitados) * 100)}%` }}></div>
                                </div>
                            </KpiTile>
                            <KpiTile label="Candidatos en proceso" value={enProcesoDe(embudo[peticion.id])} hint={enProcesoDe(embudo[peticion.id]) ? 'En entrevista o pendientes de respuesta' : 'Ninguno ahora mismo'} onClick={() => setActiveTab('plazas')} />
                            <KpiTile label="Portales activos" tone={portales.filter(p => p.activo).length ? 'success' : 'neutral'} value={portales.filter(p => p.activo).length} hint={`${peticion.candidaturas} candidaturas recibidas`} onClick={() => setActiveTab('portales')} />
                            {(() => {
                                const dias = diasHasta(peticion.inicio);
                                const terminada = ['Cerrada', 'Cancelada'].includes(peticion.estado);
                                return (
                                    <KpiTile
                                        label={dias >= 0 ? 'Días hasta el inicio' : 'Servicio'}
                                        tone={!terminada && dias >= 0 && dias <= 7 && posActual.incorporados < posActual.solicitados ? 'warning' : 'neutral'}
                                        value={terminada ? peticion.estado : dias >= 0 ? dias : 'Empezado'}
                                        hint={dias >= 0 ? `Empieza el ${fechaCorta(peticion.inicio)}` : `Desde el ${fechaCorta(peticion.inicio)} hasta el ${fechaCorta(peticion.fin)}`}
                                    />
                                );
                            })()}
                        </div>

                        <Tabs
                            active={activeTab}
                            onChange={setActiveTab}
                            tabs={[
                                { id: 'resumen', label: 'Resumen' },
                                { id: 'horarios', label: 'Horario', alert: horarioChangesUnsaved },
                                { id: 'plazas', label: 'Plazas y candidatos', count: posActual.solicitados },
                                { id: 'portales', label: 'Difusión en portales' },
                                { id: 'documentos', label: 'Contratos y altas' },
                                { id: 'auditoria', label: 'Actividad' },
                            ]}
                        />

                        {/* TAB: RESUMEN (datos heredados del presupuesto y peticiones del mismo presupuesto) */}
                        {activeTab === 'resumen' && (
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                                <Card className="p-5 space-y-4 xl:col-span-2">
                                    <SectionTitle actions={<Badge tone="neutral"><Lock className="w-3 h-3 mr-1 inline" />Del presupuesto</Badge>}>Puesto</SectionTitle>
                                    <div>
                                        <div className="text-base font-medium text-slate-900">{peticion.puesto}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">{peticion.categoria} · {peticion.cctConvenio}</div>
                                        <p className="text-xs text-slate-600 mt-2">{peticion.descripcionCorta}</p>
                                    </div>
                                    <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                        <div><dt className="text-[11px] text-slate-500">Salario</dt><dd className="font-medium text-slate-900">{peticion.salarioBrutoConvenio}</dd></div>
                                        <div><dt className="text-[11px] text-slate-500">Tarifa al cliente</dt><dd className="font-medium text-slate-900">{peticion.tarifaVentaHora}</dd></div>
                                        <div><dt className="text-[11px] text-slate-500">Plazas de esta petición</dt><dd className="font-medium text-slate-900">{peticion.solicitados}</dd></div>
                                        <div><dt className="text-[11px] text-slate-500">Turno</dt><dd className="font-medium text-slate-900">{currentSchedule.turnoNombre} · {totalHorasSemana.toLocaleString('es-ES')} h/semana</dd></div>
                                    </dl>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600">
                                        <div className="flex items-start gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" /><span><span className="text-slate-500">EPIs:</span> {peticion.requiereEpi}</span></div>
                                        <div className="flex items-start gap-1.5"><CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" /><span><span className="text-slate-500">Carnés y acreditaciones:</span> {peticion.carnetRequerido}</span></div>
                                    </div>
                                    <Notice tone="info" icon={Info}>
                                        Salario, tarifa y conceptos extra facturables (horas extra, nocturnidad, fin de semana y festivos) vienen del presupuesto y no se cambian aquí. Para cambiarlos, haz una nueva versión del presupuesto.
                                    </Notice>
                                </Card>

                                <Card className="p-5 space-y-3">
                                    <SectionTitle actions={pet.puedeEditar && !['Cerrada', 'Cancelada'].includes(peticion.estado) && <Button size="sm" variant="ghost" icon={Edit3} onClick={() => setDatosServicio({ ...peticion.servicio, positionsCount: peticion.solicitados })}>Editar</Button>}>Cliente y servicio</SectionTitle>
                                    <dl className="space-y-2.5 text-xs">
                                        <div><dt className="text-[11px] text-slate-500">Empresa</dt><dd className="text-slate-900">{peticion.clienteNombre} · {peticion.cif}</dd></div>
                                        <div><dt className="text-[11px] text-slate-500">Contacto que firma los CPD</dt><dd className="text-slate-900">{peticion.contactoCliente}</dd>{(peticion.emailContacto || peticion.telefonoContacto) && <dd className="text-slate-500">{[peticion.emailContacto, peticion.telefonoContacto].filter(Boolean).join(' · ')}</dd>}</div>
                                        <div><dt className="text-[11px] text-slate-500">Centro de trabajo</dt><dd className="text-slate-900">{peticion.centroTrabajo}</dd></div>
                                        <div><dt className="text-[11px] text-slate-500">Fechas</dt><dd className="text-slate-900">{fechaCorta(peticion.inicio) || 'Sin fecha de inicio'} a {fechaCorta(peticion.fin) || 'sin fecha de fin'}</dd></div>
                                        <div><dt className="text-[11px] text-slate-500">Supuesto de utilización</dt><dd className="text-slate-900">{pet.supuestos.find(x => x.id === peticion.supuesto)?.nombre || 'Sin indicar'}</dd>{peticion.justificacion && <dd className="text-slate-500">{peticion.justificacion}</dd>}</div>
                                        <div><dt className="text-[11px] text-slate-500">Responsable de la ETT</dt><dd className="text-slate-900">{peticion.responsable}</dd></div>
                                    </dl>
                                </Card>

                                {/* REPARTO DEL PUESTO: cuántas personas del presupuesto cubre cada petición de este puesto */}
                                {(() => {
                                    // El reparto lo calcula el servidor (sin las canceladas)
                                    if (!peticion.reparto) return null;
                                    const delPuesto = peticion.reparto.hermanas;
                                    const repartidas = peticion.reparto.repartidas;
                                    const faltan = peticion.personasPuesto - repartidas;
                                    const escala = Math.max(peticion.personasPuesto, repartidas);
                                    const otrosPuestos = peticion.reparto.otrosPuestos;
                                    return (
                                        <Card className="overflow-hidden xl:col-span-3">
                                            <div className="p-4 space-y-3">
                                                <SectionTitle actions={<Button size="sm" icon={Copy} onClick={abrirDuplicar}>Duplicar con otro horario</Button>}>
                                                    Reparto del puesto
                                                </SectionTitle>
                                                <p className="text-xs text-slate-600 -mt-1">
                                                    El presupuesto {peticion.presupuestoOrigen} pide <strong className="font-medium text-slate-900">{peticion.personasPuesto} {peticion.puesto.toLowerCase()}</strong>.
                                                    {delPuesto.length > 1
                                                        ? ` Están repartidos en ${delPuesto.length} peticiones, una por horario o fechas.`
                                                        : ' Están todos en esta petición. Si hace falta otro horario o fechas, crea otra con «Duplicar con otro horario».'}
                                                </p>
                                                {/* Barra: cada tramo es una petición; la actual en color fuerte */}
                                                <div className="flex h-7 w-full overflow-hidden rounded-lg bg-slate-100 text-[11px] font-medium">
                                                    {delPuesto.map(p => (
                                                        <div
                                                            key={p.id}
                                                            title={`${p.id}: ${p.solicitados} plazas`}
                                                            style={{ width: `${(p.solicitados / escala) * 100}%` }}
                                                            className={`flex items-center justify-center border-r border-white/70 last:border-0 truncate px-1 ${p.id === peticion.id ? 'bg-indigo-600 text-white' : 'bg-indigo-200 text-indigo-900'}`}
                                                        >
                                                            {p.solicitados} · {p.turnoNombre.toLowerCase()}
                                                        </div>
                                                    ))}
                                                    {faltan > 0 && (
                                                        <div style={{ width: `${(faltan / escala) * 100}%` }} className="flex items-center justify-center text-slate-500 truncate px-1">
                                                            {faltan} sin petición
                                                        </div>
                                                    )}
                                                </div>
                                                <p className={`text-xs ${faltan === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                                                    {faltan === 0 && `Repartidas las ${peticion.personasPuesto} personas del presupuesto.`}
                                                    {faltan > 0 && `Faltan ${faltan} ${faltan === 1 ? 'persona' : 'personas'} por poner en alguna petición.`}
                                                    {faltan < 0 && `Hay ${-faltan} ${faltan === -1 ? 'plaza' : 'plazas'} más que personas en el presupuesto: revísalo con el cliente.`}
                                                </p>
                                            </div>
                                            <table className="w-full text-left text-xs border-t border-slate-200">
                                                <tbody>
                                                    {delPuesto.map(p => {
                                                        const actual = p.id === peticion.id;
                                                        return (
                                                            <tr key={p.id} className={`border-b border-slate-100 last:border-0 ${actual ? 'bg-indigo-50/50' : 'hover:bg-slate-50 cursor-pointer'}`} onClick={() => !actual && abrirPeticion(p.id)}>
                                                                <td className="py-2.5 px-4">
                                                                    <div className="font-medium text-slate-900">{p.turnoNombre}{actual && <span className="ml-2 text-[11px] font-normal text-indigo-700">esta petición</span>}</div>
                                                                    <div className="text-[11px] text-slate-500">{p.id}</div>
                                                                </td>
                                                                <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">{fechaCorta(p.inicio) || "sin inicio"} a {fechaCorta(p.fin) || "sin fin"}</td>
                                                                <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap">{p.solicitados} plazas · {plazas[p.id] ? cubiertasDe(plazas[p.id]) : p.cubiertas} cubiertas</td>
                                                                <td className="py-2.5 px-4 text-right"><Badge tone={tonoEstado(p.estado)} dot>{p.estado}</Badge></td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                            {otrosPuestos.length > 0 && (
                                                <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
                                                    <span>Otros puestos del mismo presupuesto:</span>
                                                    {otrosPuestos.map(p => (
                                                        <button key={p.id} type="button" onClick={() => abrirPeticion(p.id)} className="text-indigo-600 hover:text-indigo-800 hover:underline">
                                                            {p.puesto} ({p.id})
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </Card>
                                    );
                                })()}
                            </div>
                        )}

                        {/* TAB: PLAZAS Y CANDIDATOS */}
                        {activeTab === 'plazas' && (() => {
                            const lista = plazas[peticion.id] || [];
                            const cuenta = (estados) => lista.filter(p => estados.includes(p.estado)).length;
                            const libre = lista.find(p => ['vacante', 'baja'].includes(p.estado));
                            const embudoPet = (embudo[peticion.id] || []).map(e => ({ ...e, c: candidatosPool.find(c => c.id === e.id) })).filter(e => e.c);
                            const visibles = filtroEtapa ? embudoPet.filter(e => e.etapa === filtroEtapa) : embudoPet.filter(e => e.etapa !== 'descartado');
                            const urgenteCpd = diasHasta(peticion.inicio) <= 2;
                            return (
                                <div className="space-y-4">
                                    <Card className="overflow-hidden">
                                        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <SectionTitle>Plazas</SectionTitle>
                                                <p className="text-xs text-slate-500 -mt-1">
                                                    {cuenta(['cubierta', 'incorporada'])} cubiertas · {cuenta(['reservada'])} {cuenta(['reservada']) === 1 ? 'pendiente' : 'pendientes'} del cliente · {cuenta(['vacante', 'baja'])} por cubrir
                                                </p>
                                            </div>
                                            <Button variant="primary" icon={UserPlus} disabled={!libre || !pet.puedeEditar} onClick={() => libre && setAssignCandidateModal({ posId: peticion.id, plaza: libre })}>
                                                Proponer candidato
                                            </Button>
                                        </div>
                                        <div className="px-4 pt-3">
                                            {!seleccion ? (
                                            <Notice tone="info" icon={Info}>
                                                Propón personas para cada plaza y pulsa «Confirmar» cuando el cliente responda (aún no hay portal de empresas). El CPD de cada persona, el contrato y el alta llegan con Contratos y altas (fase 7).
                                            </Notice>
                                            ) : (
                                            <Notice tone={portalesPropios[peticion.id]?.empresa ? 'info' : 'warning'} icon={Info}>
                                                {portalesPropios[peticion.id]?.empresa
                                                    ? <>El cliente confirma las personas propuestas en su portal. Al confirmar, se genera el CPD de cada persona y se le envía a firmar.</>
                                                    : <>El portal de empresas está desactivado en esta petición: pulsa «Confirmar» cuando el cliente responda. Se puede activar en Difusión en portales.</>}
                                            </Notice>
                                            )}
                                        </div>
                                        <div className="overflow-x-auto mt-3">
                                            <table className="w-full text-left text-xs">
                                                <thead>
                                                    <tr className="border-y border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                                                        <th className="py-2 px-4 font-medium">Plaza</th>
                                                        <th className="py-2 px-4 font-medium">Persona</th>
                                                        <th className="py-2 px-4 font-medium">Estado</th>
                                                        <th className="py-2 px-4 font-medium">Incorporación</th>
                                                        <th className="py-2 px-4 font-medium">CPD</th>
                                                        <th className="py-2 px-4" aria-label="Acciones"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {lista.map(plaza => {
                                                        const est = ESTADOS_PLAZA[plaza.estado] || ESTADOS_PLAZA.vacante;
                                                        const cpd = plaza.cpd && ESTADOS_CPD[plaza.cpd];
                                                        return (
                                                            <tr key={plaza.id} className="border-b border-slate-100 last:border-0">
                                                                <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">Plaza {plaza.numero}</td>
                                                                <td className="py-2.5 px-4">
                                                                    {plaza.nombre ? (
                                                                        <button type="button" onClick={() => handleOpenCandidatoFichaById(plaza.candidatoId)} className="inline-flex items-center gap-2 text-left hover:text-indigo-700">
                                                                            <Avatar name={plaza.nombre} size="sm" />
                                                                            <span className="font-medium text-slate-900">{plaza.nombre}</span>
                                                                        </button>
                                                                    ) : plaza.estado === 'baja' ? (
                                                                        <span className="text-slate-500">Baja de {plaza.bajaDe}<span className="block text-[11px]">{plaza.motivoBaja}</span></span>
                                                                    ) : (
                                                                        <span className="text-slate-400">Sin asignar</span>
                                                                    )}
                                                                </td>
                                                                <td className="py-2.5 px-4"><Badge tone={est.tono} dot>{est.texto}</Badge></td>
                                                                <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">{plaza.nombre ? plaza.fechaIncorporacion : '—'}</td>
                                                                <td className="py-2.5 px-4">
                                                                    {cpd ? (
                                                                        <>
                                                                            <Badge tone={cpd.tono}>{cpd.texto}</Badge>
                                                                            {plaza.cpd === 'enviado' && urgenteCpd && <div className="text-[11px] text-rose-600 mt-0.5">Bloquea la incorporación</div>}
                                                                        </>
                                                                    ) : <span className="text-slate-400">—</span>}
                                                                </td>
                                                                <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                                                    {plaza.estado === 'vacante' && <Button size="sm" onClick={() => setAssignCandidateModal({ posId: peticion.id, plaza })}>Proponer</Button>}
                                                                    {plaza.estado === 'baja' && <Button size="sm" variant="primary" onClick={() => setAssignCandidateModal({ posId: peticion.id, plaza })}>Buscar sustituto</Button>}
                                                                    {plaza.estado === 'reservada' && (
                                                                        <span className="inline-flex gap-1">
                                                                            <Button size="sm" variant="ghost" onClick={() => retirarPropuesta(peticion.id, plaza)}>Retirar</Button>
                                                                            <Button size="sm" variant="primary" title="En la demo simula que el cliente confirma en su portal" onClick={() => confirmarPlaza(peticion.id, plaza)}>Confirmar</Button>
                                                                        </span>
                                                                    )}
                                                                    {['cubierta', 'incorporada'].includes(plaza.estado) && (
                                                                        <span className="inline-flex gap-1">
                                                                            {plaza.cpd === 'enviado' && <Button size="sm" variant="ghost" icon={Send} onClick={() => recordarCpd(plaza)}>Recordar CPD</Button>}
                                                                            <Button size="sm" variant="ghost" onClick={() => setBajaPlaza({ plaza, motivo: MOTIVOS_BAJA[0], notas: '' })}>Dar de baja</Button>
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Card>

                                    <Card className="overflow-hidden">
                                        <div className="p-4 border-b border-slate-200 space-y-3">
                                            <div>
                                                <SectionTitle>Candidatos de esta petición</SectionTitle>
                                                <p className="text-xs text-slate-500 -mt-1">Llegan de los portales de empleo, del portal de candidatos de la ETT o de la base de datos. Pulsa una etapa para filtrar.</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {ETAPAS.map(et => {
                                                    const n = embudoPet.filter(e => e.etapa === et.id).length;
                                                    const activo = filtroEtapa === et.id;
                                                    return (
                                                        <button
                                                            key={et.id}
                                                            type="button"
                                                            onClick={() => setFiltroEtapa(activo ? '' : et.id)}
                                                            className={`rounded-lg border px-3 py-1.5 text-left transition-colors ${activo ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                                                        >
                                                            <div className="text-[11px] text-slate-500">{et.texto}</div>
                                                            <div className="text-sm font-semibold text-slate-900">{n}</div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        {visibles.length === 0 ? (
                                            <EmptyState
                                                icon={Users}
                                                title={filtroEtapa ? 'Nadie en esta etapa' : 'Aún no hay candidatos'}
                                                text={filtroEtapa ? undefined : 'Activa el portal de candidatos o publica la oferta en portales de empleo para recibir inscripciones.'}
                                                action={!filtroEtapa && <Button onClick={() => setActiveTab('portales')}>Ir a Difusión en portales</Button>}
                                            />
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-xs">
                                                    <thead>
                                                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                                                            <th className="py-2 px-4 font-medium">Persona</th>
                                                            <th className="py-2 px-4 font-medium">Origen</th>
                                                            <th className="py-2 px-4 font-medium">Afinidad</th>
                                                            <th className="py-2 px-4 font-medium">Requisitos</th>
                                                            <th className="py-2 px-4 font-medium">Etapa</th>
                                                            <th className="py-2 px-4" aria-label="Acciones"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {visibles.map(({ c, etapa }) => {
                                                            const otra = plazaDe(c.id);
                                                            return (
                                                                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                                                                    <td className="py-2.5 px-4">
                                                                        <button type="button" onClick={() => setCandidatoFichaModal(c)} className="inline-flex items-center gap-2 text-left hover:text-indigo-700">
                                                                            <Avatar name={c.nombre} size="sm" />
                                                                            <span>
                                                                                <span className="font-medium text-slate-900 block">{c.nombre}</span>
                                                                                <span className="text-[11px] text-slate-500">{c.puestoPrincipal} · {c.ubicacion}</span>
                                                                            </span>
                                                                        </button>
                                                                    </td>
                                                                    <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">{c.origen}</td>
                                                                    <td className="py-2.5 px-4 text-slate-700">{c.scoring} %</td>
                                                                    <td className="py-2.5 px-4"><Requisitos lista={comprobarRequisitos(c, peticion, peticion.plantilla)} compacto /></td>
                                                                    <td className="py-2.5 px-4">
                                                                        <Select value={etapa} onChange={(e) => cambiarEtapa(peticion.id, c.id, e.target.value)} aria-label={`Etapa de ${c.nombre}`}>
                                                                            {ETAPAS.map(et => <option key={et.id} value={et.id}>{et.texto}</option>)}
                                                                        </Select>
                                                                    </td>
                                                                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                                                        {otra ? (
                                                                            <span className="text-[11px] text-slate-500">En plaza {otra.plaza.numero}{otra.petId !== peticion.id ? ` de ${otra.petId}` : ''}</span>
                                                                        ) : etapa !== 'descartado' && libre ? (
                                                                            <Button size="sm" onClick={() => handleAssignCandidateToPlaza(peticion.id, libre.id, c)}>Proponer</Button>
                                                                        ) : null}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </Card>
                                </div>
                            );
                        })()}

                        {/* TAB 2: HORARIOS & TURNOS POR POSICIÓN (REQUISITO PRINCIPAL 1) */}
                        {activeTab === 'horarios' && (
                            <div className="space-y-6 animate-fade-in">
                                {/* UN HORARIO POR PETICIÓN */}
                                <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-900">Horario de esta petición</h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Una petición tiene un solo horario. Si el mismo puesto necesita otro turno u otras fechas, crea otra petición con «Duplicar con otro horario».
                                            </p>
                                        </div>
                                        <Button icon={Copy} onClick={abrirDuplicar} className="shrink-0">Duplicar con otro horario</Button>
                                    </div>

                                    {/* RESUMEN DE LA POSICIÓN SELECCIONADA */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
                                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                                            <div className="text-[10px] font-semibold text-slate-400">Puesto y plazas</div>
                                            <div className="font-semibold text-slate-900 text-sm mt-0.5 truncate">{selectedPositionObj.puesto}</div>
                                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">{selectedPositionObj.solicitados} {selectedPositionObj.solicitados === 1 ? 'plaza' : 'plazas'}</div>
                                        </div>
                                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                                            <div className="text-[10px] font-semibold text-slate-400">Turno y jornada</div>
                                            <div className="font-semibold text-slate-900 text-sm mt-0.5">{currentSchedule.turnoNombre}</div>
                                            <div className="text-[11px] text-slate-500 mt-0.5">{currentSchedule.tipoJornada}</div>
                                        </div>
                                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                                            <div className="text-[10px] font-semibold text-slate-400">Horas por semana</div>
                                            <div className="font-semibold text-indigo-600 text-base mt-0.5">{totalHorasSemana.toLocaleString('es-ES')} h por semana</div>
                                            <div className="text-[11px] text-emerald-600 font-medium">Cumple convenio laboral</div>
                                        </div>
                                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                                            <div className="text-[10px] font-semibold text-slate-400">Estado</div>
                                            <div className="flex items-center gap-1.5 font-semibold text-sm mt-0.5">
                                                {currentSchedule.guardado ? (
                                                    <span className="text-emerald-700 flex items-center gap-1">
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Horario guardado
                                                    </span>
                                                ) : (
                                                    <span className="text-amber-700 flex items-center gap-1">
                                                        <AlertCircle className="w-4 h-4 text-amber-500" /> Cambios sin guardar
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-slate-400 truncate mt-0.5">{currentSchedule.ultimaModif}</div>
                                        </div>
                                    </div>

                                    {/* PLANTILLAS RÁPIDAS */}
                                    <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                        <div>
                                            <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                                                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                                Aplicar plantilla rápida de turno:
                                            </span>
                                            <span className="text-[11px] text-slate-500 ml-1">
                                                (Solo cambia el horario de esta petición)
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                onClick={() => handleApplyTemplate('manana')}
                                                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition"
                                            >
                                                Turno de mañana (06:00-14:00)
                                            </button>
                                            <button
                                                onClick={() => handleApplyTemplate('tarde')}
                                                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition"
                                            >
                                                Turno de tarde (14:00-22:00)
                                            </button>
                                            <button
                                                onClick={() => handleApplyTemplate('noche')}
                                                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition"
                                            >
                                                Turno de noche (22:00-06:00)
                                            </button>
                                            <button
                                                onClick={() => handleApplyTemplate('partida')}
                                                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition"
                                            >
                                                Jornada partida
                                            </button>
                                        </div>
                                    </div>

                                    {/* TABLA SEMANAL EDITABLE */}
                                    <div className="mt-5 border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                                        <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                                            <span className="text-xs font-semibold text-slate-700">
                                                Cuadrante semanal
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                Edita los campos directamente para personalizar días laborables o descansos
                                            </span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs text-slate-700">
                                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[10px]">
                                                    <tr>
                                                        <th className="py-3 px-4">Día de la semana</th>
                                                        <th className="py-3 px-4">Laborable</th>
                                                        <th className="py-3 px-4">Hora de inicio</th>
                                                        <th className="py-3 px-4">Hora de fin</th>
                                                        <th className="py-3 px-4">Descanso (minutos)</th>
                                                        <th className="py-3 px-4">Horas efectivas</th>
                                                        <th className="py-3 px-4 text-right">Estado</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 bg-white">
                                                    {currentSchedule.dias.map((d, idx) => (
                                                        <tr key={d.dia} className={d.laborable ? 'hover:bg-slate-50' : 'bg-slate-50/60 text-slate-400'}>
                                                            <td className="py-3 px-4 font-semibold text-slate-900">
                                                                {d.dia}
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <label className="inline-flex items-center cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={d.laborable}
                                                                        onChange={(e) => handleDayFieldChange(idx, 'laborable', e.target.checked)}
                                                                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                                                    />
                                                                    <span className="ml-2 text-xs font-medium">
                                                                        {d.laborable ? 'Sí' : 'No (descanso)'}
                                                                    </span>
                                                                </label>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <input
                                                                    type="time"
                                                                    disabled={!d.laborable}
                                                                    value={d.inicio}
                                                                    onChange={(e) => handleDayFieldChange(idx, 'inicio', e.target.value)}
                                                                    className={`px-2.5 py-1.5 border rounded-lg text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                                                        d.laborable ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                                                    }`}
                                                                />
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <input
                                                                    type="time"
                                                                    disabled={!d.laborable}
                                                                    value={d.fin}
                                                                    onChange={(e) => handleDayFieldChange(idx, 'fin', e.target.value)}
                                                                    className={`px-2.5 py-1.5 border rounded-lg text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                                                        d.laborable ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                                                    }`}
                                                                />
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <div className="flex items-center gap-1.5">
                                                                    <input
                                                                        type="number"
                                                                        step="5"
                                                                        min="0"
                                                                        max="120"
                                                                        disabled={!d.laborable}
                                                                        value={d.descanso}
                                                                        onChange={(e) => handleDayFieldChange(idx, 'descanso', e.target.value)}
                                                                        className={`w-16 px-2 py-1.5 border rounded-lg text-xs text-center font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                                                            d.laborable ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                                                        }`}
                                                                    />
                                                                    <span className="text-slate-400 text-xs">min</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <span className={`font-mono font-semibold ${d.laborable ? 'text-indigo-600' : 'text-slate-400'}`}>
                                                                    {d.laborable ? `${d.horas} h` : '—'}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4 text-right">
                                                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                                                                    d.laborable ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                                                }`}>
                                                                    {d.laborable ? 'Laborable' : 'No computa'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* BOTÓN GUARDAR HORARIO DE ESTA POSICIÓN */}
                                    <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                                        <div className="text-xs text-slate-500 flex items-center gap-2">
                                            <Info className="w-4 h-4 text-indigo-500" />
                                            <span>Los cambios solo afectan a esta petición (<strong>{selectedPosId}</strong>).</span>
                                        </div>

                                        <button
                                            onClick={handleSaveSchedule}
                                            disabled={savingHorario || !pet.puedeEditar}
                                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                                        >
                                            {savingHorario ? (
                                                <>
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                    <span>Guardando horario...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="w-4 h-4" />
                                                    <span>Guardar horario</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: DIFUSIÓN EN PORTALES & PERSONALIZACIÓN (REQUISITO PRINCIPAL 2) */}
                        {activeTab === 'portales' && !seleccion && (
                            <Card>
                                <EmptyState icon={Globe2} title="Difusión en portales: disponible próximamente" text="Los portales de la ETT (empresas y candidatos) y la publicación en portales de empleo llegan en la fase 7 del plan." />
                            </Card>
                        )}
                        {activeTab === 'portales' && seleccion && (
                            <div className="space-y-6 animate-fade-in">
                                {/* PORTALES PROPIOS DE LA ETT: se activan en cada petición */}
                                {(() => {
                                    const pp = portalesPropios[peticion.id] || {};
                                    const filas = [
                                        {
                                            id: 'empresa', icono: Building2, titulo: 'Portal de empresas', url: urlPortal('empresa', peticion.id),
                                            texto: 'La empresa ve esta petición, confirma a las personas propuestas, firma los CPD y valida las presencias.',
                                            bienvenida: 'bienvenidaEmpresa',
                                            textoBienvenida: `Enviar bienvenida con el acceso a los contactos de la empresa (${peticion.emailContacto})`,
                                            enviada: pp.bienvenidaEmpresaEnviada,
                                        },
                                        {
                                            id: 'candidatos', icono: Users, titulo: 'Portal de candidatos', url: urlPortal('candidatos', peticion.id),
                                            texto: 'Oferta pública de esta petición. Quien se inscribe entra como «Inscrito» en Plazas y candidatos.',
                                            bienvenida: 'bienvenidaCandidatos',
                                            textoBienvenida: 'Enviar bienvenida a cada persona que se inscriba o se proponga para una plaza, con acceso para subir documentos y firmar su contrato',
                                        },
                                    ];
                                    return (
                                        <Card className="p-4 space-y-3">
                                            <SectionTitle actions={<span className="text-[11px] text-slate-500">{SUBDOMINIO_ETT}.tramitnow.com · se configura en Mi ETT</span>}>
                                                Portales de la ETT
                                            </SectionTitle>
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                {filas.map(f => (
                                                    <div key={f.id} className={`rounded-lg border p-3 space-y-2 ${pp[f.id] ? 'border-indigo-200 bg-indigo-50/40' : 'border-slate-200'}`}>
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex items-start gap-2 min-w-0">
                                                                <f.icono className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                                                                <div className="min-w-0">
                                                                    <div className="text-xs font-medium text-slate-900">{f.titulo}</div>
                                                                    <div className="text-[11px] text-slate-500 truncate">{f.url}</div>
                                                                </div>
                                                            </div>
                                                            <Interruptor checked={!!pp[f.id]} onChange={(v) => cambiarPortalPropio(f.id, v)} label={`Activar ${f.titulo.toLowerCase()}`} />
                                                        </div>
                                                        <p className="text-xs text-slate-600">{f.texto}</p>
                                                        <label className="flex items-start gap-2 text-xs text-slate-700">
                                                            <input type="checkbox" checked={!!pp[f.bienvenida]} onChange={(e) => setPortalesPropios(prev => ({ ...prev, [peticion.id]: { ...prev[peticion.id], [f.bienvenida]: e.target.checked } }))} className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                                            <span>{f.textoBienvenida}{f.enviada ? <span className="text-slate-500"> · enviada el {fechaCorta(f.enviada)}</span> : ''}</span>
                                                        </label>
                                                        <div className="text-[11px] text-slate-400">Más opciones del portal: pendientes de definir.</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </Card>
                                    );
                                })()}

                                {/* BANNER DIFUSIÓN */}
                                <div className="bg-white text-slate-900 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs border border-slate-200">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 bg-indigo-500 text-slate-900 text-[10px] font-semibold rounded">
                                                API multidifusión ETT
                                            </span>
                                            <span className="text-xs text-slate-500">Conectores REST v2.4</span>
                                        </div>
                                        <h3 className="text-base font-semibold text-slate-900">
                                            Contenido de publicación y personalización por canal
                                        </h3>
                                        <p className="text-xs text-slate-500 max-w-2xl">
                                            Define un contenido maestro común o añade adaptaciones específicas para cada portal (título más corto para LinkedIn, requisitos detallados para InfoJobs, etc.).
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2.5 shrink-0">
                                        {hermanasDe(peticion, peticiones).length > 0 && <Button icon={Copy} onClick={() => setCopiarDifusion(true)}>Copiar de una petición hermana</Button>}
                                        <button
                                            onClick={() => setCommonPreviewOpen(true)}
                                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-2"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            <span>Vista previa maestra</span>
                                        </button>
                                        <button
                                            onClick={() => startSyncProcess()}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-sm"
                                        >
                                            <Share2 className="w-3.5 h-3.5" />
                                            <span>Sincronizar con portales</span>
                                        </button>
                                    </div>
                                </div>

                                {/* BLOQUE A: CONTENIDO COMÚN PARA TODOS LOS PORTALES */}
                                <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-5">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                                    <Layers className="w-4 h-4 text-indigo-600" />
                                                    Contenido común para todos los portales (plantilla base)
                                                </h3>
                                                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                                                    comunSavedStatus === 'Guardado' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                }`}>
                                                    {comunSavedStatus}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Los portales que no tengan personalización propia heredarán íntegramente estos campos.
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setCommonPreviewOpen(true)}
                                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                                            >
                                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                                <span>Vista previa común</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSaveContenidoComun}
                                                disabled={comunSavedStatus === 'Guardando...'}
                                                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
                                            >
                                                {comunSavedStatus === 'Guardando...' ? (
                                                    <>
                                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                        <span>Guardando...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Check className="w-3.5 h-3.5" />
                                                        <span>Guardar contenido común</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <form onSubmit={handleSaveContenidoComun} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                        <div className="md:col-span-2">
                                            <label className="font-semibold text-slate-700 block mb-1">
                                                Título principal de la publicación <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={contenidoComun.titulo}
                                                onChange={(e) => {
                                                    setContenidoComun({ ...contenidoComun, titulo: e.target.value });
                                                    setComunSavedStatus('Cambios sin guardar');
                                                }}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-900"
                                                placeholder="Ej: Operarios/as de Almacén..."
                                            />
                                        </div>

                                        <div>
                                            <label className="font-semibold text-slate-700 block mb-1">
                                                Categoría profesional
                                            </label>
                                            <input
                                                type="text"
                                                value={contenidoComun.categoria}
                                                onChange={(e) => {
                                                    setContenidoComun({ ...contenidoComun, categoria: e.target.value });
                                                    setComunSavedStatus('Cambios sin guardar');
                                                }}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="font-semibold text-slate-700 block mb-1">
                                                Ubicación visible
                                            </label>
                                            <input
                                                type="text"
                                                value={contenidoComun.ubicacion}
                                                onChange={(e) => {
                                                    setContenidoComun({ ...contenidoComun, ubicacion: e.target.value });
                                                    setComunSavedStatus('Cambios sin guardar');
                                                }}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="font-semibold text-slate-700 block mb-1">
                                                Descripción general de la oferta <span className="text-rose-500">*</span>
                                            </label>
                                            <textarea
                                                rows={2}
                                                value={contenidoComun.descripcion}
                                                onChange={(e) => {
                                                    setContenidoComun({ ...contenidoComun, descripcion: e.target.value });
                                                    setComunSavedStatus('Cambios sin guardar');
                                                }}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="font-semibold text-slate-700 block mb-1">
                                                Funciones del puesto
                                            </label>
                                            <textarea
                                                rows={4}
                                                value={contenidoComun.funciones}
                                                onChange={(e) => {
                                                    setContenidoComun({ ...contenidoComun, funciones: e.target.value });
                                                    setComunSavedStatus('Cambios sin guardar');
                                                }}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                                            />
                                        </div>

                                        <div>
                                            <label className="font-semibold text-slate-700 block mb-1">
                                                Requisitos obligatorios <span className="text-rose-500">*</span>
                                            </label>
                                            <textarea
                                                rows={4}
                                                value={contenidoComun.requisitos}
                                                onChange={(e) => {
                                                    setContenidoComun({ ...contenidoComun, requisitos: e.target.value });
                                                    setComunSavedStatus('Cambios sin guardar');
                                                }}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                                            />
                                        </div>

                                        <div>
                                            <label className="font-semibold text-slate-700 block mb-1">
                                                Condiciones y salario ofrecido
                                            </label>
                                            <input
                                                type="text"
                                                value={contenidoComun.condiciones}
                                                onChange={(e) => {
                                                    setContenidoComun({ ...contenidoComun, condiciones: e.target.value });
                                                    setComunSavedStatus('Cambios sin guardar');
                                                }}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="font-semibold text-slate-700 block mb-1">
                                                Llamada a la acción (CTA)
                                            </label>
                                            <input
                                                type="text"
                                                value={contenidoComun.cta}
                                                onChange={(e) => {
                                                    setContenidoComun({ ...contenidoComun, cta: e.target.value });
                                                    setComunSavedStatus('Cambios sin guardar');
                                                }}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                    </form>
                                </div>

                                {/* BLOQUE B: PERSONALIZACIÓN POR PORTAL */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                                <Globe2 className="w-4 h-4 text-indigo-600" />
                                                Canales de difusión y personalizaciones específicas
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Activa o desactiva la publicación por API y personaliza el copy para cada portal si lo requiere.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {portales.map(portal => {
                                            const isCustom = portal.personalizado && portal.customContent;
                                            const displayContent = isCustom ? portal.customContent : contenidoComun;

                                            return (
                                                <div
                                                    key={portal.id}
                                                    className={`bg-white rounded-xl border p-5 flex flex-col justify-between shadow-xs transition ${
                                                        portal.activo ? 'border-slate-200' : 'border-slate-200 bg-slate-50/70 opacity-80'
                                                    }`}
                                                >
                                                    <div>
                                                        {/* Header card */}
                                                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className={`w-8 h-8 rounded-lg ${portal.badgeColor} text-white font-semibold flex items-center justify-center text-xs shadow-xs`}>
                                                                    {portal.logoText}
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-semibold text-slate-900 text-xs">
                                                                        {portal.nombre}
                                                                    </h4>
                                                                    <div className="text-[10px] text-slate-400">
                                                                        Sinc: {portal.ultSinc}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Toggle button */}
                                                            <label className="relative inline-flex items-center cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={portal.activo}
                                                                    onChange={() => handleTogglePortal(portal.id)}
                                                                    className="sr-only peer"
                                                                />
                                                                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-200 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                                            </label>
                                                        </div>

                                                        {/* Badges & Status */}
                                                        <div className="mt-3 flex items-center justify-between">
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                                                                isCustom
                                                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                                            }`}>
                                                                {isCustom ? '✦ Personalización Propia' : '↳ Usa Contenido Común'}
                                                            </span>

                                                            <span className={`text-[10px] font-medium ${portal.activo ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                                {portal.estadoApi}
                                                            </span>
                                                        </div>

                                                        {/* Snippet Preview */}
                                                        <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                                                            <div className="font-semibold text-slate-800 line-clamp-1">
                                                                {displayContent.titulo}
                                                            </div>
                                                            <div className="text-slate-500 text-[11px] line-clamp-2">
                                                                {displayContent.descripcion}
                                                            </div>
                                                        </div>

                                                        <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between">
                                                            <span>Candidaturas recibidas:</span>
                                                            <span className="font-semibold text-slate-800">{portal.candidaturas} CVs</span>
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                onClick={() => setPreviewPortalModal({
                                                                    portal,
                                                                    content: displayContent,
                                                                    isCustom
                                                                })}
                                                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition"
                                                                title="Vista previa de este portal"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </button>

                                                            {isCustom && (
                                                                <button
                                                                    onClick={() => setRestoreConfirmModal(portal)}
                                                                    className="text-[11px] text-rose-600 hover:text-rose-700 hover:underline font-medium"
                                                                >
                                                                    Restaurar común
                                                                </button>
                                                            )}
                                                        </div>

                                                        <button
                                                            onClick={() => setEditPortalModal(portal)}
                                                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                                                        >
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                            <span>{isCustom ? 'Editar texto' : 'Personalizar'}</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 4: DOCUMENTOS Y CONTRATOS */}
                        {activeTab === 'documentos' && (() => {
                            const previo = cpdPrevio[peticion.id] || { estado: 'sin_generar', comprobaciones: [] };
                            const faltan = (previo.comprobaciones || []).filter(c => !c.ok);
                            const bloquean = faltan.filter(c => c.blocking);
                            const ocupadas = (plazas[peticion.id] || []).filter(p => ['cubierta', 'incorporada'].includes(p.estado));
                            const empezado = diasHasta(peticion.inicio) <= 0;
                            const cerrada = ['Cerrada', 'Cancelada'].includes(peticion.estado);
                            return (
                            <div className="space-y-4">
                                <Card className="p-4 space-y-3">
                                    <SectionTitle actions={<span className="inline-flex gap-1.5">{previo.desactualizado && <Badge tone="warning">Desactualizado</Badge>}<Badge tone={ESTADOS_CPD_PREVIO[previo.estado].tono} dot>{ESTADOS_CPD_PREVIO[previo.estado].texto}</Badge></span>}>
                                        CPD previo: condiciones para la empresa
                                    </SectionTitle>
                                    <p className="text-xs text-slate-600">
                                        Antes de tener personas, la empresa recibe las condiciones de la puesta a disposición (causa, puesto, riesgos, horario, duración y precio) para revisarlas con tiempo.
                                        {' '}Se genera aquí, se envía a mano{peticion.emailContacto ? ` a ${peticion.emailContacto}` : ''} y se marca como enviado (aún no hay firma electrónica).
                                        {previo.generado && ` Generado el ${fechaCorta(previo.generado)}.`}
                                        {previo.fecha && ` Enviado el ${fechaCorta(previo.fecha)}.`}
                                    </p>
                                    {previo.desactualizado && <Notice tone="warning" icon={AlertTriangle}>Algo de la petición ha cambiado después de generarlo: vuelve a generarlo antes de enviarlo.</Notice>}
                                    {peticion.salarioBajoConvenio && <Notice tone="danger" icon={AlertTriangle}>El convenio vigente{peticion.tramoBajoConvenio ? ` desde el ${fechaCorta(peticion.tramoBajoConvenio.from)}` : ''} pide para esta categoría {peticion.tramoBajoConvenio?.minimumSalaryHour != null ? `${peticion.tramoBajoConvenio.minimumSalaryHour.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €/h, ` : ''}más que el salario de la petición. No se puede generar el CPD: haz una versión nueva del presupuesto y una petición nueva.</Notice>}
                                    {faltan.length > 0 && (
                                        <div className="rounded-lg border border-slate-200 p-3 space-y-1.5 text-xs">
                                            <div className="font-medium text-slate-800">{bloquean.length ? (bloquean.length === 1 ? 'Falta 1 dato para generarlo' : `Faltan ${bloquean.length} datos para generarlo`) : 'Se puede generar, pero conviene revisar'}</div>
                                            <ul className="space-y-1">
                                                {faltan.map(c => (
                                                    <li key={c.code} className={`flex items-start gap-1.5 ${c.blocking ? 'text-rose-700' : 'text-amber-700'}`}>
                                                        {c.blocking ? <X className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}{c.message}
                                                    </li>
                                                ))}
                                            </ul>
                                            {pet.puedeEditar && !cerrada && <Button size="sm" icon={Edit3} onClick={() => setDatosServicio({ ...peticion.servicio, positionsCount: peticion.solicitados })}>Completar datos del servicio</Button>}
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                        <Button icon={Eye} onClick={() => setVerCpdPrevio(true)}>Ver condiciones</Button>
                                        {(previo.estado === 'sin_generar' || previo.desactualizado)
                                            ? <Button variant="primary" icon={FileText} disabled={!pet.puedeEditar || bloquean.length > 0 || peticion.salarioBajoConvenio} onClick={generarCpdPrevio}>{previo.desactualizado ? 'Volver a generar' : 'Generar PDF'}</Button>
                                            : <Button icon={FileText} onClick={descargarCpdPrevio}>Descargar PDF</Button>}
                                        {previo.estado === 'generado' && !previo.desactualizado && <Button variant="primary" icon={Send} disabled={!pet.puedeEditar} onClick={enviarCpdPrevio}>Marcar como enviado</Button>}
                                        {previo.estado === 'enviado' && <Button variant="ghost" icon={Check} disabled={!pet.puedeEditar} onClick={marcarCpdRevisado}>Revisado por el cliente</Button>}
                                    </div>
                                </Card>

                                <Card className="overflow-hidden">
                                    <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <SectionTitle>CPD, contrato y alta de cada persona</SectionTitle>
                                            <p className="text-xs text-slate-500 -mt-1">Cada persona necesita su CPD firmado por la empresa antes de empezar. Si a 2 días del inicio no está firmado, se bloquea la incorporación.</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {peticion.estado === 'En curso' && <Button icon={ArrowUpRight} onClick={() => { window.location.hash = '#/mision'; }}>Personal en misión</Button>}
                                            <Button icon={ArrowUpRight} onClick={() => { window.location.hash = '#/laboral'; }}>Ir a Contratos y altas</Button>
                                        </div>
                                    </div>
                                    {ocupadas.length === 0 ? (
                                        <EmptyState icon={Users} title="Todavía no hay plazas cubiertas" text="Cuando el cliente confirme a alguien, aquí verás su CPD, su contrato y su alta." />
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead>
                                                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                                                        <th className="py-2 px-4 font-medium">Persona</th>
                                                        <th className="py-2 px-4 font-medium">Incorporación</th>
                                                        <th className="py-2 px-4 font-medium">CPD con la empresa</th>
                                                        <th className="py-2 px-4 font-medium">Contrato con la persona</th>
                                                        <th className="py-2 px-4 font-medium">Alta en la Seguridad Social</th>
                                                        <th className="py-2 px-4" aria-label="Acciones"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {ocupadas.map(plaza => {
                                                        const firmado = plaza.cpd === 'firmado';
                                                        return (
                                                            <tr key={plaza.id} className="border-b border-slate-100 last:border-0">
                                                                <td className="py-2.5 px-4"><span className="inline-flex items-center gap-2"><Avatar name={plaza.nombre} size="sm" /><span className="font-medium text-slate-900">{plaza.nombre}</span></span></td>
                                                                <td className="py-2.5 px-4 text-slate-600">{plaza.fechaIncorporacion}</td>
                                                                <td className="py-2.5 px-4">
                                                                    <Badge tone={ESTADOS_CPD[plaza.cpd]?.tono || 'neutral'}>{ESTADOS_CPD[plaza.cpd]?.texto || '—'}</Badge>
                                                                    {!firmado && diasHasta(peticion.inicio) <= 2 && <div className="text-[11px] text-rose-600 mt-0.5">Bloquea la incorporación</div>}
                                                                </td>
                                                                <td className="py-2.5 px-4">{firmado ? <Badge tone="success">Firmado</Badge> : <Badge tone="neutral">Espera al CPD</Badge>}</td>
                                                                <td className="py-2.5 px-4">{plaza.estado === 'incorporada' || empezado ? <Badge tone="success">Comunicada</Badge> : firmado ? <Badge tone="info">Programada</Badge> : <Badge tone="neutral">Espera al CPD</Badge>}</td>
                                                                <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                                                    {plaza.cpd === 'enviado' && <Button size="sm" variant="ghost" icon={Send} onClick={() => recordarCpd(plaza)}>Recordar</Button>}
                                                                    {firmado && <Button size="sm" variant="ghost" onClick={() => showToast(`Descarga simulada: CPD_${peticion.id}_${plaza.numero}.pdf`)}>Descargar CPD</Button>}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </Card>

                                <Card className="p-4 space-y-2 text-xs">
                                    <SectionTitle actions={<Button size="sm" variant="primary" icon={Upload} disabled={!pet.puedeEditar} onClick={() => setSubirDoc({ tipo: pet.tiposDocumento[1] || pet.tiposDocumento[0] || '', nombre: '', archivo: null })}>Subir documento</Button>}>Documentos del servicio</SectionTitle>
                                    {[
                                        peticion.presupuestoFirmado
                                            ? { id: peticion.presupuestoFirmado.documentId, nombre: peticion.presupuestoFirmado.nombre, texto: `Presupuesto firmado por el cliente el ${fechaCorta(peticion.presupuestoFirmado.fecha)} · sale solo del presupuesto aceptado`, icono: FileSignature, presupuesto: true }
                                            : { nombre: `Presupuesto ${peticion.presupuestoOrigen}`, texto: 'Aún no hay presupuesto firmado ni propuesta en PDF: súbelo en Presupuestos → Documentos', icono: FileSignature, sinArchivo: true },
                                        ...(docsServicio[peticion.id] || []).map(d => ({ id: d.id, nombre: d.nombre, texto: `${d.tipo} · subido el ${fechaCorta(d.fecha)} por ${d.autor}`, icono: Paperclip, subido: true })),
                                        // El CPD previo generado ya está entre los documentos; si aún no hay, se genera desde aquí
                                        !(docsServicio[peticion.id] || []).some(d => d.tipo.startsWith('CPD previo')) && { nombre: `CPD_previo_${peticion.id}.pdf`, texto: 'Condiciones de la puesta a disposición para la empresa · se genera al descargarlo', icono: FileText, cpd: true },
                                        DEMO && { nombre: `Riesgos_PRL_${peticion.perfil}.pdf`, texto: `Información de riesgos del puesto: ${peticion.puesto.toLowerCase()}`, icono: ShieldCheck },
                                    ].filter(Boolean).map(doc => (
                                        <div key={doc.nombre} className="p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-3 hover:bg-slate-50">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <doc.icono className="w-4 h-4 text-indigo-600 shrink-0" />
                                                <div className="min-w-0">
                                                    <div className="font-medium text-slate-900 truncate">{doc.nombre}</div>
                                                    <div className="text-slate-500 text-[11px]">{doc.texto}</div>
                                                </div>
                                            </div>
                                            <span className="flex items-center gap-1 shrink-0">
                                                {!doc.sinArchivo && <Button size="sm" variant="ghost" onClick={() => descargarDocServicio(doc)}>Descargar</Button>}
                                                {doc.subido && <Button size="sm" variant="ghost" icon={Trash2} disabled={!pet.puedeEditar} onClick={() => quitarDocServicio(doc)} aria-label={`Quitar ${doc.nombre}`} />}
                                            </span>
                                        </div>
                                    ))}
                                </Card>
                            </div>
                            );
                        })()}


                        {/* TAB: ACTIVIDAD */}
                        {activeTab === 'auditoria' && (
                            <Card className="p-5">
                                <SectionTitle>Actividad de la petición</SectionTitle>
                                <ol className="mt-2 space-y-3 text-xs">
                                    {[
                                        ...(ficha?.peticion.id === peticion.id ? ficha.actividad : []).map(a => ({ color: 'bg-indigo-400', titulo: a.texto, texto: `${a.fecha} por ${a.usuario}` })),
                                        posActual.incorporados > 0 && { color: 'bg-emerald-500', titulo: `${posActual.incorporados} ${posActual.incorporados === 1 ? 'plaza cubierta' : 'plazas cubiertas'}`, texto: `Última incorporación prevista el ${fechaCorta(peticion.inicio)}` },
                                        peticion.portalesActivos > 0 && { color: 'bg-blue-500', titulo: `Publicada en ${peticion.portalesActivos} portales`, texto: `${peticion.candidaturas} candidaturas recibidas` },
                                        { color: 'bg-indigo-500', titulo: `Horario guardado: ${currentSchedule.turnoNombre.toLowerCase()}`, texto: currentSchedule.ultimaModif },
                                        { color: 'bg-slate-400', titulo: `Petición creada desde el presupuesto ${peticion.presupuestoOrigen}`, texto: `${fechaCorta(peticion.creada)} por ${peticion.creadaPor} · ${peticion.solicitados} de ${peticion.personasPuesto} personas del puesto` },
                                    ].filter(Boolean).map((a, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className={`w-2 h-2 rounded-full ${a.color} mt-1.5 shrink-0`}></span>
                                            <div>
                                                <div className="font-medium text-slate-800">{a.titulo}</div>
                                                <div className="text-slate-500 text-[11px]">{a.texto}</div>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </Card>
                        )}
                    </div>
                )}
            </div>

            {/* --- MODAL ASIGNAR CANDIDATO A PLAZA VACANTE --- */}
            {/* PROPONER CANDIDATO PARA UNA PLAZA: comprueba requisitos y si ya está en otra plaza */}
            {assignCandidateModal && (() => {
                const plaza = assignCandidateModal.plaza;
                const q = candidateSearchFilter.trim().toLowerCase();
                const etapaDe = (id) => (embudo[peticion.id] || []).find(e => e.id === id)?.etapa;
                const lista = candidatosPool
                    .filter(c => verTodosCandidatos || c.matchPosicion.includes(peticion.perfil))
                    .filter(c => !q || [c.nombre, c.puestoPrincipal, c.carnets, c.ubicacion].some(t => t.toLowerCase().includes(q)))
                    .map(c => ({ c, req: comprobarRequisitos(c, peticion, peticion.plantilla), otra: plazaDe(c.id), etapa: etapaDe(c.id) }))
                    .sort((a, b) => (a.otra ? 1 : 0) - (b.otra ? 1 : 0) || b.req.filter(r => r.ok).length - a.req.filter(r => r.ok).length || b.c.scoring - a.c.scoring);
                return (
                    <Modal
                        title={plaza.estado === 'baja' ? `Buscar sustituto para la plaza ${plaza.numero}` : `Proponer candidato para la plaza ${plaza.numero}`}
                        subtitle={`${peticion.puesto} · ${currentSchedule.turnoNombre.toLowerCase()} · ${peticion.clienteNombre}`}
                        onClose={() => setAssignCandidateModal(null)}
                        size="max-w-2xl"
                        toolbar={
                            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center gap-3">
                                <SearchInput className="flex-1 min-w-[200px]" value={candidateSearchFilter} onChange={setCandidateSearchFilter} placeholder="Buscar por nombre, carné o localidad..." />
                                <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                                    <input type="checkbox" checked={verTodosCandidatos} onChange={(e) => setVerTodosCandidatos(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                    Ver también los de otros puestos
                                </label>
                            </div>
                        }
                        footer={<Button onClick={() => setAssignCandidateModal(null)}>Cancelar</Button>}
                    >
                        <div className="space-y-2 text-xs">
                            {plaza.estado === 'baja' && <Notice tone="warning" icon={AlertTriangle}>Baja de {plaza.bajaDe}: {plaza.motivoBaja}. El sustituto mantiene las mismas condiciones del CPD.</Notice>}
                            {lista.length === 0 && <EmptyState icon={Search} title="No hay candidatos con este filtro" />}
                            {lista.map(({ c, req, otra, etapa }) => {
                                const fallan = req.filter(r => !r.ok);
                                return (
                                    <div key={c.id} className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${otra ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-white hover:border-indigo-300'}`}>
                                        <div className="flex items-start gap-3 min-w-0">
                                            <Avatar name={c.nombre} />
                                            <div className="min-w-0 space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-medium text-slate-900 text-sm">{c.nombre}</span>
                                                    {etapa && <Badge tone={ETAPAS.find(e => e.id === etapa)?.tono}>{ETAPAS.find(e => e.id === etapa)?.texto}</Badge>}
                                                </div>
                                                <div className="text-slate-500 flex flex-wrap items-center gap-x-3">
                                                    <span>{c.puestoPrincipal}</span>
                                                    <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{c.ubicacion}</span>
                                                    <span>Afinidad {c.scoring} %</span>
                                                    <span>{c.origen}</span>
                                                </div>
                                                <Requisitos lista={req} />
                                                {otra && <div className="text-[11px] text-amber-700">Ya está en la plaza {otra.plaza.numero} de {otra.petId}.</div>}
                                                {!otra && fallan.length > 0 && <div className="text-[11px] text-rose-600">Se puede proponer, pero bloquea el contrato hasta resolver: {fallan.map(r => r.texto.toLowerCase()).join(', ')}.</div>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                            <Button size="sm" variant="ghost" onClick={() => setCandidatoFichaModal(c)}>Ver ficha</Button>
                                            <Button size="sm" variant="primary" disabled={!!otra} onClick={() => handleAssignCandidateToPlaza(peticion.id, plaza.id, c)}>Proponer</Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Modal>
                );
            })()}

            {/* DAR DE BAJA A UNA PERSONA DE UNA PLAZA: queda el motivo y la plaza pasa a buscar sustituto */}
            {bajaPlaza && (
                <Modal
                    title={`¿Dar de baja a ${bajaPlaza.plaza.nombre}?`}
                    subtitle={`Plaza ${bajaPlaza.plaza.numero} · ${peticion.id}`}
                    onClose={() => setBajaPlaza(null)}
                    size="max-w-md"
                    footer={<>
                        <Button onClick={() => setBajaPlaza(null)}>Cancelar</Button>
                        <Button variant="danger" disabled={!bajaPlaza.motivo} onClick={confirmarBaja}>Dar de baja</Button>
                    </>}
                >
                    <div className="space-y-4 text-xs">
                        <p className="text-slate-600">La plaza queda como «Baja» con el motivo, para buscar un sustituto. La persona y el motivo quedan en el historial de la petición.</p>
                        <div className="space-y-1">
                            <span className="block text-[11px] font-medium text-slate-600">Motivo</span>
                            <SelectConAlta
                                value={bajaPlaza.motivo}
                                onChange={(v) => setBajaPlaza(b => ({ ...b, motivo: v }))}
                                options={motivosBaja}
                                onAdd={(v) => { setMotivosBaja(m => [...m, v]); setBajaPlaza(b => ({ ...b, motivo: v })); }}
                                nuevoPlaceholder="Nuevo motivo"
                            />
                        </div>
                        <Field label="Notas (opcional)">
                            <TextInput value={bajaPlaza.notas} onChange={(e) => setBajaPlaza(b => ({ ...b, notas: e.target.value }))} placeholder="Por ejemplo: avisó el mismo día" />
                        </Field>
                        {bajaPlaza.plaza.estado === 'incorporada' && (
                            <Notice tone="warning" icon={AlertTriangle}>Ya ha empezado: habrá que tramitar la baja en la Seguridad Social desde Contratos y altas.</Notice>
                        )}
                    </div>
                </Modal>
            )}

            {/* CPD PREVIO: condiciones de la puesta a disposición que recibe la empresa antes de tener personas */}
            {verCpdPrevio && (
                <Modal
                    title="CPD previo: condiciones de la puesta a disposición"
                    subtitle={`${peticion.id} · para ${peticion.clienteNombre}`}
                    onClose={() => setVerCpdPrevio(false)}
                    size="max-w-2xl"
                    footer={<>
                        <Button onClick={() => setVerCpdPrevio(false)}>Cerrar</Button>
                        {cpdPrevio[peticion.id]?.estado !== 'sin_generar' && !cpdPrevio[peticion.id]?.desactualizado && <Button variant="primary" icon={FileText} onClick={descargarCpdPrevio}>Descargar PDF</Button>}
                    </>}
                >
                    <div className="space-y-4">
                    <dl className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-x-4 gap-y-2.5 text-xs">
                        <dt className="text-slate-500">Empresa de trabajo temporal</dt><dd className="text-slate-900">{ficha?.ett.nombre} · autorización n.º {ficha?.ett.autorizacion}</dd>
                        <dt className="text-slate-500">Empresa usuaria</dt><dd className="text-slate-900">{peticion.clienteNombre} · {peticion.cif}</dd>
                        <dt className="text-slate-500">Causa de la contratación</dt><dd className="text-slate-900">{pet.supuestos.find(x => x.id === peticion.supuesto)?.nombre || 'Sin indicar'}{peticion.justificacion ? `: ${peticion.justificacion}` : ''}. Presupuesto {peticion.presupuestoOrigen}.</dd>
                        <dt className="text-slate-500">Puesto y cualificación</dt><dd className="text-slate-900">{peticion.puesto} · {peticion.categoria}. {peticion.carnetRequerido === 'Ninguno' ? 'Sin carné específico.' : `${peticion.carnetRequerido}.`}</dd>
                        <dt className="text-slate-500">Riesgos del puesto</dt><dd className="text-slate-900">{peticion.riesgos || 'Según la evaluación de riesgos del cliente para este puesto.'} EPIs: {peticion.requiereEpi.toLowerCase()}.</dd>
                        <dt className="text-slate-500">Centro de trabajo</dt><dd className="text-slate-900">{peticion.centroTrabajo}</dd>
                        <dt className="text-slate-500">Horario</dt><dd className="text-slate-900">{currentSchedule.turnoNombre} · {totalHorasSemana.toLocaleString('es-ES')} h por semana</dd>
                        <dt className="text-slate-500">Duración estimada</dt><dd className="text-slate-900">Del {fechaCorta(peticion.inicio) || 'sin fecha'} al {fechaCorta(peticion.fin) || 'sin fecha'} · {peticion.solicitados} {peticion.solicitados === 1 ? 'persona' : 'personas'}</dd>
                        <dt className="text-slate-500">Precio</dt><dd className="text-slate-900">{peticion.tarifaVentaHora} la hora ordinaria{peticion.extrasPropuesta.length ? `, más los conceptos extra del presupuesto (${peticion.extrasPropuesta.join(', ')})` : ''}.</dd>
                    </dl>
                    {/* Quién firma el CPD por cada parte */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="rounded-lg border border-slate-200 p-3">
                            <div className="text-[11px] text-slate-500">Firma por la ETT</div>
                            <div className="font-medium text-slate-900 mt-0.5">{ficha?.ett.representante.nombre}</div>
                            <div className="text-slate-600">{ficha?.ett.representante.cargo} · DNI {ficha?.ett.representante.dni}</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 p-3">
                            <div className="text-[11px] text-slate-500">Firma por la empresa usuaria</div>
                            <div className="font-medium text-slate-900 mt-0.5">{(peticion.contactoCliente || '').split(' (')[0] || 'Su representante'}</div>
                            <div className="text-slate-600">{peticion.clienteNombre}</div>
                        </div>
                    </div>
                    <Notice tone="info" icon={Info}>
                        Al confirmar a cada persona se genera su CPD con estas condiciones y sus datos, y se envía a firmar.
                    </Notice>
                    </div>
                </Modal>
            )}

            {/* --- MODAL FICHA CANDIDATO / PERSONA ASIGNADA --- */}
            {candidatoFichaModal && (
                <Modal
                  title={candidatoFichaModal.nombre}
                  subtitle={<>{candidatoFichaModal.id} · Ficha personal</>}
                  onClose={() => setCandidatoFichaModal(null)}
                  footer={<>
                  <div className="flex flex-1 items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[11px] font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                {candidatoFichaModal.estadoSeleccion}
                            </span>
                            <button
                                onClick={() => setCandidatoFichaModal(null)}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold"
                            >
                                Cerrar Ficha
                            </button>
                  </div>
                  </>}
                >
                        <div className="space-y-4 text-xs text-slate-700">
                            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                <div>
                                    <span className="text-[10px] font-semibold text-slate-400">DNI / NIE</span>
                                    <div className="font-mono font-semibold text-slate-900">{candidatoFichaModal.dni}</div>
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold text-slate-400">Teléfono</span>
                                    <div className="font-semibold text-slate-900">{candidatoFichaModal.telefono}</div>
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold text-slate-400">Email</span>
                                    <div className="font-semibold text-slate-900 truncate">{candidatoFichaModal.email}</div>
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold text-slate-400">Puntaje Matching</span>
                                    <div className="font-semibold text-emerald-600">{candidatoFichaModal.scoring}% afinidad</div>
                                </div>
                            </div>
                            <div>
                                <span className="text-[10px] font-semibold text-slate-400">Puesto y Experiencia</span>
                                <p className="mt-0.5 text-slate-800 font-medium">{candidatoFichaModal.experiencia}</p>
                            </div>
                            <div>
                                <span className="text-[10px] font-semibold text-slate-400">Acreditaciones y Carnets</span>
                                <p className="mt-0.5 text-slate-800 font-medium">{candidatoFichaModal.carnets}</p>
                            </div>
                            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-900">
                                <span className="text-[10px] font-semibold text-indigo-700">Valoración Consultoría ETT</span>
                                <p className="mt-0.5 text-xs">{candidatoFichaModal.valoracionETT}</p>
                            </div>
                        </div>
                </Modal>
            )}

            {/* --- MODAL 1: COPIAR HORARIO A OTRA POSICIÓN --- */}
            {/* DUPLICAR CON OTRO HORARIO: crea una petición hermana del mismo puesto */}
            {duplicar && (() => {
                const repartidas = (peticion.reparto?.repartidas ?? 0) + (Number(duplicar.solicitados) || 0);
                return (
                    <Modal
                        title="Duplicar con otro horario"
                        subtitle={`Nueva petición de ${peticion.puesto.toLowerCase()} · ${peticion.presupuestoOrigen}`}
                        onClose={() => setDuplicar(null)}
                        size="max-w-lg"
                        footer={<>
                            <Button onClick={() => setDuplicar(null)}>Cancelar</Button>
                            <Button variant="primary" icon={Copy} disabled={!duplicar.inicio || !(Number(duplicar.solicitados) > 0)} onClick={confirmarDuplicar}>Crear petición</Button>
                        </>}
                    >
                        <div className="space-y-4 text-xs">
                            <p className="text-slate-600">Se crea otra petición del mismo puesto con las condiciones del presupuesto (salario, tarifa y conceptos extra). Tendrá su propio horario, sus plazas y su difusión.</p>
                            <Field label="Turno">
                                <Select value={duplicar.plantilla} onChange={(e) => setDuplicar(d => ({ ...d, plantilla: e.target.value }))} className="w-full">
                                    {Object.entries(HORARIO_TEMPLATES).map(([id, t]) => <option key={id} value={id}>{t.nombre}{t.nombre === currentSchedule.turnoNombre ? ' (el de esta petición)' : ''}</option>)}
                                </Select>
                            </Field>
                            <div className="grid grid-cols-3 gap-3">
                                <Field label="Plazas"><TextInput type="number" min="1" value={duplicar.solicitados} onChange={(e) => setDuplicar(d => ({ ...d, solicitados: e.target.value }))} /></Field>
                                <Field label="Inicio"><TextInput type="date" value={duplicar.inicio} onChange={(e) => setDuplicar(d => ({ ...d, inicio: e.target.value }))} /></Field>
                                <Field label="Fin"><TextInput type="date" value={duplicar.fin} onChange={(e) => setDuplicar(d => ({ ...d, fin: e.target.value }))} /></Field>
                            </div>
                            {repartidas !== peticion.personasPuesto ? (
                                <Notice tone="warning" icon={AlertTriangle}>
                                    El presupuesto tiene {peticion.personasPuesto} personas para este puesto y con esta petición habría {repartidas}. Se puede crear igualmente, pero conviene confirmarlo con el cliente.
                                </Notice>
                            ) : (
                                <Notice tone="success" icon={CheckCircle2}>Con esta petición quedan repartidas las {peticion.personasPuesto} personas del puesto.</Notice>
                            )}
                        </div>
                    </Modal>
                );
            })()}

            {/* SUBIR UN DOCUMENTO DEL SERVICIO */}
            {subirDoc && peticion && (
                <Modal
                    title="Subir documento del servicio"
                    subtitle={`${peticion.id} · ${peticion.clienteNombre}`}
                    onClose={() => setSubirDoc(null)}
                    size="max-w-md"
                    footer={<>
                        <Button onClick={() => setSubirDoc(null)}>Cancelar</Button>
                        <Button variant="primary" icon={Upload} disabled={!subirDoc.archivo || !subirDoc.tipo} onClick={subirDocServicio}>Subir</Button>
                    </>}
                >
                    <div className="space-y-3 text-xs">
                        <Field label="Tipo de documento">
                            <Select value={subirDoc.tipo} onChange={(e) => setSubirDoc(d => ({ ...d, tipo: e.target.value }))} className="w-full">
                                {pet.tiposDocumento.map(t => <option key={t}>{t}</option>)}
                            </Select>
                        </Field>
                        <Field label="Nombre (opcional)">
                            <TextInput value={subirDoc.nombre} onChange={(e) => setSubirDoc(d => ({ ...d, nombre: e.target.value }))} placeholder="Si lo dejas vacío, el del archivo" />
                        </Field>
                        <label
                            className={`block w-full cursor-pointer rounded-xl border-2 border-dashed p-5 text-center ${subirDoc.archivo ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-700'}`}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) setSubirDoc(d => ({ ...d, archivo: f })); }}
                        >
                            <input type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) setSubirDoc(d => ({ ...d, archivo: f })); e.target.value = ''; }} />
                            {subirDoc.archivo
                                ? <><CheckCircle2 className="w-5 h-5 mx-auto mb-1" />{subirDoc.archivo.name} (pulsa para cambiarlo)</>
                                : <><Upload className="w-5 h-5 mx-auto mb-1" />Arrastra el archivo aquí o pulsa para elegirlo (PDF, JPG o PNG)</>}
                        </label>
                        <p className="text-[11px] text-slate-500">El presupuesto firmado ya sale solo, desde el presupuesto aceptado. Sube aquí el resto: el pedido del cliente, su evaluación de riesgos, correos...</p>
                    </div>
                </Modal>
            )}

            {/* NUEVA PETICIÓN: siempre desde un puesto de un presupuesto aceptado */}
            {nuevaPeticion && (() => {
                const presu = nuevaPeticion.presu;
                const puestoPresu = presu?.puestos.find(x => x.tipo === nuevaPeticion.tipo);
                const yaRepartidas = puestoPresu ? puestoPresu.enPeticiones : 0;
                const total = yaRepartidas + (Number(nuevaPeticion.solicitados) || 0);
                return (
                    <Modal
                        title="Nueva petición"
                        subtitle="Las peticiones salen de un puesto de un presupuesto aceptado"
                        onClose={() => setNuevaPeticion(null)}
                        size="max-w-lg"
                        footer={<>
                            <Button onClick={() => setNuevaPeticion(null)}>Cancelar</Button>
                            <Button variant="primary" icon={Plus} disabled={!puestoPresu || !nuevaPeticion.inicio || !(Number(nuevaPeticion.solicitados) > 0)} onClick={confirmarNuevaPeticion}>Crear petición</Button>
                        </>}
                    >
                        <div className="space-y-4 text-xs">
                            <Field label="Presupuesto aceptado">
                                {presu ? (
                                    <div className="rounded-lg border border-indigo-300 bg-indigo-50/50 px-3 py-2 flex items-center justify-between gap-2">
                                        <span className="min-w-0">
                                            <span className="block font-medium text-slate-900">{presu.id} {presu.version} · {presu.clienteNombre}</span>
                                            <span className="block text-[11px] text-slate-500 truncate">{presu.titulo} · aceptado el {fechaCorta(presu.aceptado)}</span>
                                        </span>
                                        <Button size="sm" variant="ghost" onClick={() => { setNuevaPeticion(n => ({ ...n, presu: null, tipo: '' })); setBuscarPresu(''); }}>Cambiar</Button>
                                    </div>
                                ) : (() => {
                                    // Buscador: con cientos de presupuestos, un desplegable no sirve. Busca el servidor (los 8 primeros).
                                    const q = buscarPresu.trim().toLowerCase();
                                    const { lista, total, cargando } = presupuestosAceptados;
                                    return (
                                        <div className="space-y-1.5">
                                            <SearchInput value={buscarPresu} onChange={setBuscarPresu} placeholder="Busca por cliente, CIF, código o título..." className="w-full" />
                                            <div className="text-[11px] text-slate-500">{cargando ? 'Buscando...' : q ? `${total} encontrados` : 'Primero, los que tienen personas sin petición; después, los más recientes.'}</div>
                                            <div className="max-h-56 overflow-y-auto space-y-1.5">
                                                {lista.slice(0, 8).map(p => {
                                                    const sin = p.pendientes;
                                                    return (
                                                        <button key={p.id} type="button" onClick={() => setNuevaPeticion(n => ({ ...n, presu: p, tipo: '' }))} className="w-full text-left rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-slate-50 px-3 py-2 flex items-center justify-between gap-2">
                                                            <span className="min-w-0">
                                                                <span className="block font-medium text-slate-900">{p.id} {p.version} · {p.clienteNombre}</span>
                                                                <span className="block text-[11px] text-slate-500 truncate">{p.titulo} · aceptado el {fechaCorta(p.aceptado)}</span>
                                                            </span>
                                                            {sin > 0 ? <Badge tone="accent">{sin} sin petición</Badge> : <Badge tone="neutral">Todo en peticiones</Badge>}
                                                        </button>
                                                    );
                                                })}
                                                {!cargando && lista.length === 0 && <div className="text-slate-500 py-2">{q ? `No hay presupuestos aceptados con «${buscarPresu}».` : 'No hay presupuestos aceptados en esta sucursal.'}</div>}
                                                {total > 8 && <div className="text-[11px] text-slate-500">Y {total - 8} más: afina la búsqueda.</div>}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </Field>
                            {presu && (
                                <Field label="Puesto">
                                    <div className="space-y-1.5">
                                        {presu.puestos.map(x => {
                                            const repartidas = x.enPeticiones;
                                            const elegido = nuevaPeticion.tipo === x.tipo;
                                            return (
                                                <button
                                                    key={x.tipo}
                                                    type="button"
                                                    onClick={() => setNuevaPeticion(n => ({ ...n, tipo: x.tipo, solicitados: Math.max(1, x.personas - repartidas) }))}
                                                    className={`w-full text-left rounded-lg border px-3 py-2 flex items-center justify-between gap-2 ${elegido ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}
                                                >
                                                    <span className="font-medium text-slate-900">{x.nombre}</span>
                                                    <span className="text-slate-500">{x.personas} personas · {repartidas} ya en peticiones</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </Field>
                            )}
                            {puestoPresu && (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-[1.6fr_1fr_1.4fr] gap-3">
                                        <Field label="Turno">
                                            <Select value={nuevaPeticion.plantilla} onChange={(e) => setNuevaPeticion(n => ({ ...n, plantilla: e.target.value }))} className="w-full">
                                                {Object.entries(HORARIO_TEMPLATES).map(([id, t]) => <option key={id} value={id}>{t.nombre}</option>)}
                                            </Select>
                                        </Field>
                                        <Field label="Plazas"><TextInput type="number" min="1" value={nuevaPeticion.solicitados} onChange={(e) => setNuevaPeticion(n => ({ ...n, solicitados: e.target.value }))} /></Field>
                                        <Field label="Inicio"><TextInput type="date" value={nuevaPeticion.inicio} onChange={(e) => setNuevaPeticion(n => ({ ...n, inicio: e.target.value }))} /></Field>
                                    </div>
                                    {total > puestoPresu.personas && (
                                        <Notice tone="warning" icon={AlertTriangle}>
                                            El presupuesto tiene {puestoPresu.personas} personas para este puesto y con esta petición habría {total}. Se puede crear igualmente.
                                        </Notice>
                                    )}
                                </>
                            )}
                        </div>
                    </Modal>
                );
            })()}

            {/* DATOS DEL SERVICIO: lo que la petición añade al presupuesto y el CPD previo necesita */}
            {datosServicio && ficha && (() => {
                const d = datosServicio;
                const poner = (k) => (e) => setDatosServicio(x => ({ ...x, [k]: e.target.value }));
                const supuesto = pet.supuestos.find(x => x.id === d.useCase);
                const texto = (k, etiqueta, placeholder, filas = 2) => (
                    <Field label={etiqueta}>
                        <textarea rows={filas} value={d[k] || ''} onChange={poner(k)} placeholder={placeholder} className={`${CAMPO} w-full`} />
                    </Field>
                );
                return (
                    <Modal
                        title="Datos del servicio"
                        subtitle={`${peticion.id} · ${peticion.clienteNombre}`}
                        onClose={() => setDatosServicio(null)}
                        size="max-w-2xl"
                        footer={<>
                            <Button onClick={() => setDatosServicio(null)}>Cancelar</Button>
                            <Button variant="primary" icon={Check} disabled={!(Number(d.positionsCount) > 0)} onClick={guardarDatosServicio}>Guardar</Button>
                        </>}
                    >
                        <div className="space-y-4 text-xs">
                            <p className="text-slate-600">Salario, tarifa y conceptos extra vienen del presupuesto y no se cambian aquí. Lo de abajo es de esta petición y sale en el CPD previo.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Field label="Centro de trabajo">
                                    <Select value={d.clientCenterId || ''} onChange={poner('clientCenterId')} className="w-full">
                                        <option value="">{ficha.centros.length ? 'Elige un centro' : (peticion.centroTrabajo !== 'Centro sin indicar' ? peticion.centroTrabajo : 'Sin centros en la ficha del cliente')}</option>
                                        {ficha.centros.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                    </Select>
                                </Field>
                                <Field label="Contacto que firma los CPD">
                                    <Select value={d.clientSignerContactId || ''} onChange={poner('clientSignerContactId')} className="w-full">
                                        <option value="">Sin contacto</option>
                                        {ficha.contactos.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.cargo ? ` (${c.cargo})` : ''}{c.firma ? ' · firma CPD' : ''}</option>)}
                                    </Select>
                                </Field>
                            </div>
                            {!ficha.centros.length && <Notice tone="warning" icon={AlertTriangle}>Este cliente no tiene centros de trabajo. Añádelos en Empresas para poder elegirlo aquí.</Notice>}
                            <Field label="Supuesto de utilización">
                                <Select value={d.useCase || ''} onChange={poner('useCase')} className="w-full">
                                    <option value="">Elige el supuesto</option>
                                    {pet.supuestos.map(x => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                                </Select>
                                {supuesto && <span className="block mt-1 text-[11px] text-slate-500">{[supuesto.referencia, supuesto.ayuda].filter(Boolean).join(' · ')}</span>}
                            </Field>
                            {texto('useCaseJustification', 'Justificación del supuesto', 'Por ejemplo: campaña de otoño con más pedidos de lo habitual')}
                            {texto('tasks', 'Tareas del puesto', 'Lo que hará la persona')}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Field label="Cualificación"><TextInput value={d.qualification || ''} onChange={poner('qualification')} /></Field>
                                <Field label="Carnés y acreditaciones"><TextInput value={d.requiredLicenses || ''} onChange={poner('requiredLicenses')} placeholder="Vacío: ninguno" /></Field>
                            </div>
                            {texto('risks', 'Riesgos del puesto', 'Vale «Sin riesgos específicos según la evaluación del cliente»')}
                            <Field label="EPIs"><TextInput value={d.ppe || ''} onChange={poner('ppe')} placeholder="Equipos de protección que necesita el puesto" /></Field>
                            <label className="flex items-center gap-2 text-slate-700">
                                <input type="checkbox" checked={!!d.hazardousWork} onChange={(e) => setDatosServicio(x => ({ ...x, hazardousWork: e.target.checked }))} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                Trabajo especialmente peligroso
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <Field label="Plazas"><TextInput type="number" min="1" value={d.positionsCount} onChange={poner('positionsCount')} /></Field>
                                <Field label="Inicio"><TextInput type="date" value={d.startDate || ''} onChange={poner('startDate')} /></Field>
                                <Field label="Fin previsto"><TextInput type="date" value={d.endDate || ''} onChange={poner('endDate')} /></Field>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Field label="Responsable de la ETT">
                                    <Select value={d.responsibleUserId || ''} onChange={poner('responsibleUserId')} className="w-full">
                                        <option value="">Sin responsable</option>
                                        {pet.responsables.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                    </Select>
                                </Field>
                                <Field label="Referencia del pedido del cliente"><TextInput value={d.orderReference || ''} onChange={poner('orderReference')} /></Field>
                            </div>
                            {texto('notes', 'Notas', '')}
                        </div>
                    </Modal>
                );
            })()}

            {/* CANCELAR UNA PETICIÓN: pide el motivo */}
            {cancelar && (
                <Modal
                    title={`¿Cancelar ${cancelar.id}?`}
                    subtitle="El motivo queda en la petición y en su historial"
                    onClose={() => setCancelar(null)}
                    size="max-w-md"
                    footer={<>
                        <Button onClick={() => setCancelar(null)}>Volver</Button>
                        <Button variant="danger" disabled={!cancelar.motivo.trim()} onClick={() => moverPeticion(cancelar.id, 'Cancelada', cancelar.motivo.trim())}>Cancelar petición</Button>
                    </>}
                >
                    <Field label="Motivo">
                        <TextInput value={cancelar.motivo} onChange={(e) => setCancelar(c => ({ ...c, motivo: e.target.value }))} placeholder="Por ejemplo: el cliente aplaza la campaña" autoFocus />
                    </Field>
                </Modal>
            )}

            {/* COPIAR LA DIFUSIÓN DE UNA PETICIÓN HERMANA */}
            {copiarDifusion && (
                <Modal
                    title="Copiar la difusión de otra petición"
                    subtitle="Se copia el contenido común de la publicación; después puedes ajustarlo"
                    onClose={() => setCopiarDifusion(false)}
                    size="max-w-md"
                    footer={<Button onClick={() => setCopiarDifusion(false)}>Cancelar</Button>}
                >
                    <div className="space-y-1.5 text-xs">
                        {hermanasDe(peticion, peticiones).map(h => (
                            <button
                                key={h.id}
                                type="button"
                                onClick={() => {
                                    setContenidoComun({ ...contenidoDe(h, horarios[h.id]), titulo: contenidoDe(peticion, currentSchedule).titulo });
                                    setComunSavedStatus('Modificado');
                                    setCopiarDifusion(false);
                                    showToast(`Difusión copiada de ${h.id}. Revisa el turno y guarda.`);
                                }}
                                className="w-full text-left rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
                            >
                                <div className="font-medium text-slate-900">{h.puesto} · {(horarios[h.id]?.turnoNombre || '').toLowerCase()}</div>
                                <div className="text-[11px] text-slate-500">{h.id} · {h.portalesActivos} portales activos</div>
                            </button>
                        ))}
                    </div>
                </Modal>
            )}

            {/* --- MODAL 2: EDITAR PERSONALIZACIÓN DE UN PORTAL (SIDE OVER / MODAL GRANDE) --- */}
            {editPortalModal && (
                <Modal
                  title={`Personalización para ${editPortalModal.nombre}`}
                  subtitle={'Contenido exclusivo que se enviará a este portal.'}
                  onClose={() => setEditPortalModal(null)}
                  size="max-w-2xl"
                >

                        <EditPortalForm
                            portal={editPortalModal}
                            commonContent={contenidoComun}
                            onSave={handleSaveCustomPortal}
                            onCancel={() => setEditPortalModal(null)}
                        />
                </Modal>
            )}

            {/* --- MODAL 3: VISTA PREVIA PORTAL / VISTA PREVIA COMÚN --- */}
            {(previewPortalModal || commonPreviewOpen) && (
                <Modal
                  title={previewPortalModal ? (previewPortalModal.isCustom ? 'Personalización específica' : 'Heredado del contenido común') : 'Plantilla común'}
                  subtitle={previewPortalModal ? `Vista previa en ${previewPortalModal.portal.nombre}` : 'Vista previa del contenido común'}
                  onClose={() => { setPreviewPortalModal(null); setCommonPreviewOpen(false); }}
                  size="max-w-2xl"
                  footer={<>
                            <button
                                onClick={() => { setPreviewPortalModal(null); setCommonPreviewOpen(false); }}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold"
                            >
                                Cerrar Vista Previa
                            </button>
                  </>}
                >

                        <div className="space-y-4 text-xs text-slate-700">
                            {(() => {
                                const c = previewPortalModal ? previewPortalModal.content : contenidoComun;
                                return (
                                    <div className="space-y-4">
                                        <div className="border-b border-slate-100 pb-3">
                                            <h2 className="text-lg font-semibold text-slate-900">{c.titulo}</h2>
                                            <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 mt-1">
                                                <span className="font-medium bg-slate-100 px-2 py-0.5 rounded">{c.categoria}</span>
                                                <span className="font-medium bg-slate-100 px-2 py-0.5 rounded">{c.ubicacion}</span>
                                                <span className="font-medium bg-slate-100 px-2 py-0.5 rounded">{c.jornada}</span>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-semibold text-slate-900 text-[10px] text-slate-400">Descripción</h4>
                                            <p className="mt-1 leading-relaxed text-slate-700">{c.descripcion}</p>
                                        </div>

                                        <div>
                                            <h4 className="font-semibold text-slate-900 text-[10px] text-slate-400">Funciones Principales</h4>
                                            <pre className="mt-1 font-sans whitespace-pre-wrap leading-relaxed text-slate-700">{c.funciones}</pre>
                                        </div>

                                        <div>
                                            <h4 className="font-semibold text-slate-900 text-[10px] text-slate-400">Requisitos</h4>
                                            <pre className="mt-1 font-sans whitespace-pre-wrap leading-relaxed text-slate-700">{c.requisitos}</pre>
                                        </div>

                                        <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-100">
                                            <div className="font-semibold text-indigo-950">Condiciones y Salario</div>
                                            <p className="text-indigo-800 text-[11px] mt-0.5">{c.condiciones}</p>
                                        </div>

                                        <div className="text-center pt-2">
                                            <div className="inline-block px-5 py-2 bg-indigo-600 text-white font-semibold rounded-xl text-xs shadow-xs">
                                                {c.cta || 'Inscribirme en esta Oferta'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                </Modal>
            )}

            {/* --- MODAL 4: RESTAURAR CONTENIDO COMÚN CONFIRMATION --- */}
            {restoreConfirmModal && (
                <Modal
                  title={'¿Restaurar el contenido común?'}
                  onClose={() => setRestoreConfirmModal(null)}
                  size="max-w-sm"
                  footer={<>
                            <button
                                onClick={() => setRestoreConfirmModal(null)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleRestoreCommon(restoreConfirmModal)}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold"
                            >
                                Sí, Restaurar
                            </button>
                  </>}
                >
                  <p className="text-xs text-slate-600">Se eliminarán las adaptaciones de <strong>{restoreConfirmModal.nombre}</strong> y volverá a usar el contenido común.</p>
                </Modal>
            )}

            {/* --- MODAL 5: MULTI-PORTAL SYNC PROCESS ANIMATED MODAL --- */}
            {isSyncModalOpen && (
                <Modal
                  title={'Sincronización con portales'}
                  onClose={() => syncStep === 4 && setIsSyncModalOpen(false)}
                  footer={<>
                            <button
                                disabled={syncStep < 4}
                                onClick={() => {
                                    setIsSyncModalOpen(false);
                                    showToast('Sincronización de difusión completada.');
                                }}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold transition"
                            >
                                {syncStep < 4 ? 'Procesando Envíos...' : 'Aceptar y Finalizar'}
                            </button>
                  </>}
                >

                        <div className="space-y-5 text-xs">
                            <div className="space-y-3">
                                {/* Step 1 */}
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                                        syncStep > 1 ? 'bg-emerald-500 text-white' : (syncStep === 1 ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-200 text-slate-600')
                                    }`}>
                                        {syncStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
                                    </div>
                                    <span className={`font-semibold ${syncStep >= 1 ? 'text-slate-900' : 'text-slate-400'}`}>
                                        Validando campos obligatorios y convenios laborales
                                    </span>
                                </div>

                                {/* Step 2 */}
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                                        syncStep > 2 ? 'bg-emerald-500 text-white' : (syncStep === 2 ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-200 text-slate-600')
                                    }`}>
                                        {syncStep > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
                                    </div>
                                    <span className={`font-semibold ${syncStep >= 2 ? 'text-slate-900' : 'text-slate-400'}`}>
                                        Adaptando copys específicos (LinkedIn customizado, InfoJobs e Indeed maestros)
                                    </span>
                                </div>

                                {/* Step 3 */}
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                                        syncStep > 3 ? 'bg-emerald-500 text-white' : (syncStep === 3 ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-200 text-slate-600')
                                    }`}>
                                        {syncStep > 3 ? <Check className="w-3.5 h-3.5" /> : '3'}
                                    </div>
                                    <span className={`font-semibold ${syncStep >= 3 ? 'text-slate-900' : 'text-slate-400'}`}>
                                        Enviando payloads JSON vía REST a los 4 canales activos
                                    </span>
                                </div>

                                {/* Step 4 */}
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                                        syncStep === 4 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                                    }`}>
                                        {syncStep === 4 ? <Check className="w-3.5 h-3.5" /> : '4'}
                                    </div>
                                    <span className={`font-semibold ${syncStep === 4 ? 'text-emerald-700' : 'text-slate-400'}`}>
                                        Confirmación de webhooks y publicación en tiempo real
                                    </span>
                                </div>
                            </div>

                            {syncStep === 4 && (
                                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 space-y-1 animate-fade-in">
                                    <div className="font-semibold flex items-center gap-1.5">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        ¡Difusión sincronizada con éxito!
                                    </div>
                                    <p className="text-[11px] text-emerald-700">
                                        Las ofertas están activas y recibiendo candidaturas en InfoJobs, LinkedIn, Indeed y el Portal de Empleo ETT.
                                    </p>
                                </div>
                            )}
                        </div>

                </Modal>
            )}
        </div>
    );
}

// --- SUB-COMPONENT: EDIT PORTAL COPY FORM ---
function EditPortalForm({ portal, commonContent, onSave, onCancel }) {
    const initialForm = useMemo(() => {
        if (portal.personalizado && portal.customContent) {
            return { ...portal.customContent };
        }
        return { ...commonContent };
    }, [portal, commonContent]);

    const [formData, setFormData] = useState(initialForm);
    const [saving, setSaving] = useState(false);

    const isFieldCustom = (fieldName) => {
        return formData[fieldName] !== commonContent[fieldName];
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.titulo.trim() || !formData.descripcion.trim()) {
            alert('El título y la descripción no pueden estar vacíos.');
            return;
        }
        setSaving(true);
        setTimeout(() => {
            setSaving(false);
            onSave(formData);
        }, 500);
    };

    return (
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-700">Título de Publicación</label>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            isFieldCustom('titulo') ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                            {isFieldCustom('titulo') ? 'Personalizado para este portal' : 'Heredado del contenido común'}
                        </span>
                    </div>
                    <input
                        type="text"
                        value={formData.titulo}
                        onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-700">Descripción Específica</label>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            isFieldCustom('descripcion') ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                            {isFieldCustom('descripcion') ? 'Personalizado' : 'Heredado'}
                        </span>
                    </div>
                    <textarea
                        rows={2}
                        value={formData.descripcion}
                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="font-semibold text-slate-700">Funciones</label>
                            <span className="text-[10px] text-slate-400">{isFieldCustom('funciones') ? 'Personalizado' : 'Heredado'}</span>
                        </div>
                        <textarea
                            rows={4}
                            value={formData.funciones}
                            onChange={(e) => setFormData({ ...formData, funciones: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                        />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="font-semibold text-slate-700">Requisitos</label>
                            <span className="text-[10px] text-slate-400">{isFieldCustom('requisitos') ? 'Personalizado' : 'Heredado'}</span>
                        </div>
                        <textarea
                            rows={4}
                            value={formData.requisitos}
                            onChange={(e) => setFormData({ ...formData, requisitos: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="font-semibold text-slate-700 block mb-1">Ubicación visible</label>
                        <input
                            type="text"
                            value={formData.ubicacion}
                            onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="font-semibold text-slate-700 block mb-1">Llamada a la acción (CTA)</label>
                        <input
                            type="text"
                            value={formData.cta}
                            onChange={(e) => setFormData({ ...formData, cta: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                    </div>
                </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                    type="button"
                    onClick={() => setFormData({ ...commonContent })}
                    className="text-xs text-indigo-600 hover:underline font-semibold"
                >
                    Cargar Valores del Contenido Común
                </button>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5"
                    >
                        {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>Guardar Personalización del Portal</span>
                    </button>
                </div>
            </div>
        </form>
    );
}

// Mount React App
