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
    Shield, Cpu, BookOpen, Layers2, FolderKanban, List, SquareKanban, GripVertical
} from 'lucide-react';
import { Page, PageHeader, Card, SectionTitle, KpiTile, EmptyState, Notice, Button, Badge, Avatar, SearchInput, Select, Field, TextInput, Tabs, Segmented, Modal } from '../ui';

// --- DATOS DE EJEMPLO ---
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
const RESPONSABLES = ['Ane Uriarte', 'Jon Ibarra', 'Nuria Castells'];

const CLIENTES = {
    translog: {
        clienteNombre: 'Trans-Logística Ibérica Norte, S.L.',
        cif: 'B-87654321',
        sector: 'Logística y almacén',
        contactoCliente: 'Marta Gómez Arana (Responsable de RRHH y Selección)',
        emailContacto: 'marta.gomez@translog-norte.es',
        telefonoContacto: '+34 654 987 321',
        centroTrabajo: 'HUB central Basauri (Bizkaia) - Nave 2',
        ciudad: 'Basauri (Bizkaia)',
    },
    hosteleria: {
        clienteNombre: 'Hostelería & Eventos Premium BCN, S.L.',
        cif: 'B-00000041',
        sector: 'Hostelería y eventos',
        contactoCliente: 'Responsable de eventos',
        emailContacto: 'eventos@ejemplo-hosteleria.es',
        telefonoContacto: '+34 600 000 041',
        centroTrabajo: 'Recinto de congresos - Barcelona',
        ciudad: 'Barcelona',
    },
    mediterranea: {
        clienteNombre: 'Mediterránea Agrícola y Envasado, S.L.',
        cif: 'B-00000047',
        sector: 'Agroalimentario',
        contactoCliente: 'Jefe de planta',
        emailContacto: 'planta@ejemplo-mediterranea.es',
        telefonoContacto: '+34 600 000 047',
        centroTrabajo: 'Planta de envasado - Lleida',
        ciudad: 'Lleida',
    },
};

// Puestos tal como vienen del presupuesto: convenio, categoría, salario, tarifa y requisitos
const PUESTOS = {
    operario: {
        puesto: 'Operario/a de almacén',
        categoria: 'Especialistas / Logística (Grupo 4)',
        cctConvenio: 'Convenio Logística y Distribución Bizkaia',
        salarioBrutoConvenio: '10,45 €/h',
        tarifaVentaHora: '17,65 €/h',
        requiereEpi: 'Calzado S3, chaleco de alta visibilidad, guantes anticorte',
        carnetRequerido: 'Ninguno',
        descripcionCorta: 'Recepción, control de bultos, picking por radiofrecuencia, preparación de pedidos e inventario rotativo.',
    },
    carretillero: {
        puesto: 'Carretillero/a frontal y retráctil',
        categoria: 'Mozo/a especialista (Grupo 3)',
        cctConvenio: 'Convenio Logística y Distribución Bizkaia',
        salarioBrutoConvenio: '12,11 €/h',
        tarifaVentaHora: '19,80 €/h',
        requiereEpi: 'Calzado S3, chaleco, protectores auditivos',
        carnetRequerido: 'Carnet de carretillero vigente (UNE 58451)',
        descripcionCorta: 'Ubicación en altura en estanterías dinámicas (hasta 9 m), descarga de tráileres y abastecimiento de líneas.',
    },
    mozo: {
        puesto: 'Mozo/a de almacén',
        categoria: 'Mozo/a (Grupo 5)',
        cctConvenio: 'Convenio Logística y Distribución Bizkaia',
        salarioBrutoConvenio: '10,10 €/h',
        tarifaVentaHora: '16,20 €/h',
        requiereEpi: 'Calzado S3, chaleco de alta visibilidad',
        carnetRequerido: 'Ninguno',
        descripcionCorta: 'Carga y descarga manual, recuento de inventario y etiquetado.',
    },
    camarero: {
        puesto: 'Camarero/a de sala',
        categoria: 'Camarero/a (Nivel IV)',
        cctConvenio: 'Convenio de Hostelería de Cataluña',
        salarioBrutoConvenio: '10,60 €/h',
        tarifaVentaHora: '17,40 €/h',
        requiereEpi: 'Calzado antideslizante',
        carnetRequerido: 'Manipulador/a de alimentos',
        descripcionCorta: 'Servicio de sala y banquetes, montaje y desmontaje de mesas.',
    },
    camarero_barra: {
        puesto: 'Camarero/a de barra',
        categoria: 'Camarero/a (Nivel IV)',
        cctConvenio: 'Convenio de Hostelería de Cataluña',
        salarioBrutoConvenio: '10,60 €/h',
        tarifaVentaHora: '17,40 €/h',
        requiereEpi: 'Calzado antideslizante',
        carnetRequerido: 'Manipulador/a de alimentos',
        descripcionCorta: 'Servicio de barra y coctelería en eventos nocturnos.',
    },
    ayudante_cocina: {
        puesto: 'Ayudante de cocina',
        categoria: 'Ayudante (Nivel V)',
        cctConvenio: 'Convenio de Hostelería de Cataluña',
        salarioBrutoConvenio: '10,20 €/h',
        tarifaVentaHora: '16,90 €/h',
        requiereEpi: 'Calzado antideslizante, uniforme de cocina',
        carnetRequerido: 'Manipulador/a de alimentos',
        descripcionCorta: 'Preparación de elaboraciones frías y calientes, limpieza y orden de la cocina.',
    },
    cocinero: {
        puesto: 'Cocinero/a',
        categoria: 'Cocinero/a (Nivel III)',
        cctConvenio: 'Convenio de Hostelería de Cataluña',
        salarioBrutoConvenio: '11,90 €/h',
        tarifaVentaHora: '19,60 €/h',
        requiereEpi: 'Calzado antideslizante, uniforme de cocina',
        carnetRequerido: 'Manipulador/a de alimentos',
        descripcionCorta: 'Elaboración de menús de banquete y coordinación de la partida.',
    },
    envasado: {
        puesto: 'Operario/a de envasado',
        categoria: 'Peón especialista',
        cctConvenio: 'Convenio de la industria de conservas vegetales',
        salarioBrutoConvenio: '9,90 €/h',
        tarifaVentaHora: '16,90 €/h',
        requiereEpi: 'Calzado de seguridad, guantes, cofia',
        carnetRequerido: 'Manipulador/a de alimentos',
        descripcionCorta: 'Alimentación de línea, control de calidad visual y paletizado.',
    },
};

// Presupuestos aceptados de los que se pueden crear peticiones (de cada puesto, las personas presupuestadas)
const PRESUPUESTOS_ACEPTADOS = [
    {
        id: 'PRE-2026-0042', version: 'v1', cliente: 'translog', aceptado: '2026-10-14',
        titulo: 'Campaña logística otoño HUB central',
        puestos: [{ tipo: 'operario', personas: 8 }, { tipo: 'carretillero', personas: 4 }],
    },
    {
        id: 'PRE-2026-0041', version: 'v1', cliente: 'hosteleria', aceptado: '2026-09-30',
        titulo: 'Servicio ETT camareros/as y cocina fiestas locales',
        puestos: [{ tipo: 'camarero', personas: 10 }, { tipo: 'camarero_barra', personas: 3 }, { tipo: 'ayudante_cocina', personas: 4 }, { tipo: 'cocinero', personas: 2 }],
    },
];

// plantilla: turno del horario (HORARIO_TEMPLATES). cubiertas: plazas ya cubiertas en la demo.
const PETICIONES_BASE = [
    { id: 'PET-2026-0048', presupuesto: 'PRE-2026-0042', version: 'v1', cliente: 'translog', tipo: 'operario', personasPuesto: 8, plantilla: 'manana', solicitados: 5, cubiertas: 5, enProceso: 0, estado: 'Cubierta', inicio: '2026-11-03', fin: '2027-01-29', creada: '2026-10-15', responsable: 'Ane Uriarte', portalesActivos: 3, candidaturas: 41 },
    { id: 'PET-2026-0049', presupuesto: 'PRE-2026-0042', version: 'v1', cliente: 'translog', tipo: 'operario', personasPuesto: 8, plantilla: 'tarde', solicitados: 3, cubiertas: 0, enProceso: 4, estado: 'En selección', inicio: '2026-11-03', fin: '2027-01-29', creada: '2026-10-15', responsable: 'Ane Uriarte', portalesActivos: 4, candidaturas: 22 },
    { id: 'PET-2026-0050', presupuesto: 'PRE-2026-0042', version: 'v1', cliente: 'translog', tipo: 'carretillero', personasPuesto: 4, plantilla: 'tarde', solicitados: 4, cubiertas: 2, enProceso: 3, estado: 'En selección', inicio: '2026-11-10', fin: '2027-01-29', creada: '2026-10-15', responsable: 'Jon Ibarra', portalesActivos: 4, candidaturas: 17 },
    { id: 'PET-2026-0044', presupuesto: 'PRE-2026-0041', version: 'v1', cliente: 'hosteleria', tipo: 'camarero', personasPuesto: 10, plantilla: 'partida', solicitados: 10, cubiertas: 10, enProceso: 0, estado: 'En curso', inicio: '2026-10-10', fin: '2026-11-30', creada: '2026-10-01', responsable: 'Nuria Castells', portalesActivos: 2, candidaturas: 58 },
    { id: 'PET-2026-0045', presupuesto: 'PRE-2026-0041', version: 'v1', cliente: 'hosteleria', tipo: 'ayudante_cocina', personasPuesto: 4, plantilla: 'partida', solicitados: 4, cubiertas: 4, enProceso: 0, estado: 'Cubierta', inicio: '2026-11-05', fin: '2026-11-30', creada: '2026-10-01', responsable: 'Nuria Castells', portalesActivos: 1, candidaturas: 19 },
    { id: 'PET-2026-0046', presupuesto: 'PRE-2026-0041', version: 'v1', cliente: 'hosteleria', tipo: 'cocinero', personasPuesto: 2, plantilla: 'partida', solicitados: 2, cubiertas: 0, enProceso: 1, estado: 'En difusión', inicio: '2026-11-05', fin: '2026-11-30', creada: '2026-10-01', responsable: 'Nuria Castells', portalesActivos: 3, candidaturas: 6 },
    { id: 'PET-2026-0047', presupuesto: 'PRE-2026-0041', version: 'v1', cliente: 'hosteleria', tipo: 'camarero_barra', personasPuesto: 3, plantilla: 'noche', solicitados: 3, cubiertas: 0, enProceso: 0, estado: 'Nueva', inicio: '2026-11-12', fin: '2026-11-30', creada: '2026-10-27', responsable: 'Jon Ibarra', portalesActivos: 0, candidaturas: 0 },
    { id: 'PET-2026-0031', presupuesto: 'PRE-2026-0029', version: 'v1', cliente: 'translog', tipo: 'mozo', personasPuesto: 6, plantilla: 'manana', solicitados: 6, cubiertas: 6, enProceso: 0, estado: 'Cerrada', inicio: '2026-07-01', fin: '2026-09-30', creada: '2026-06-12', responsable: 'Ane Uriarte', portalesActivos: 0, candidaturas: 47 },
    { id: 'PET-2026-0036', presupuesto: 'PRE-2026-0033', version: 'v2', cliente: 'mediterranea', tipo: 'envasado', personasPuesto: 5, plantilla: 'noche', solicitados: 5, cubiertas: 0, enProceso: 0, estado: 'Cancelada', inicio: '2026-09-15', fin: '2026-12-15', creada: '2026-08-28', responsable: 'Jon Ibarra', portalesActivos: 0, candidaturas: 9, motivoCancelacion: 'El cliente aplaza la campaña' },
];

const completarPeticion = (p) => ({ ...CLIENTES[p.cliente], ...PUESTOS[p.tipo], ...p, presupuestoOrigen: `${p.presupuesto} ${p.version}` });
const INITIAL_PETICIONES = PETICIONES_BASE.map(completarPeticion);

const fechaCorta = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
const diasHasta = (iso) => Math.round((new Date(`${iso}T00:00:00`) - new Date(new Date().toDateString())) / 86400000);
// Peticiones del mismo puesto del mismo presupuesto (por ejemplo, otro turno)
const hermanasDe = (p, lista) => lista.filter(x => x.id !== p.id && x.presupuesto === p.presupuesto && x.tipo === p.tipo);
const siguienteCodigo = (lista) => `PET-2026-${String(Math.max(...lista.map(p => Number(p.id.slice(-4)))) + 1).padStart(4, '0')}`;

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
const INITIAL_HORARIOS = Object.fromEntries(
    INITIAL_PETICIONES.map(p => [p.id, horarioDesdePlantilla(p.plantilla, p.centroTrabajo, `${fechaCorta(p.creada)} por ${p.responsable}`)])
);

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

const INITIAL_PORTALES = [
    {
        id: 'infojobs',
        nombre: 'InfoJobs',
        badgeColor: 'bg-blue-600',
        logoText: 'IJ',
        activo: true,
        estadoApi: 'Sincronizado',
        candidaturas: 18,
        ultSinc: '14/02/2026 12:40',
        personalizado: false,
        customContent: null
    },
    {
        id: 'linkedin',
        nombre: 'LinkedIn Talent Solutions',
        badgeColor: 'bg-blue-700',
        logoText: 'in',
        activo: true,
        estadoApi: 'Sincronizado',
        candidaturas: 12,
        ultSinc: '14/02/2026 12:40',
        personalizado: true,
        customContent: {
            titulo: 'Operario/a de almacén y carretillero/a — ZAL Bilbao',
            descripcion: 'Trans-Logística Ibérica Norte busca talento para su hub de Bilbao. Únete a un equipo dinámico con oportunidades de desarrollo profesional.',
            funciones: '• Gestión ágil de pedidos con RF y sistemas WMS.\n• Manejo de carretillas retráctiles y frontales.\n• Cumplimiento de estándares de seguridad y calidad en muelle.',
            requisitos: '• Experiencia sólida en logística moderna.\n• Carnet UNE 58451 carretillas.\n• Orientación a la seguridad y trabajo en equipo.',
            categoria: 'Supply Chain & Logistics',
            ubicacion: 'Bilbao y alrededores, España (Híbrido/Presencial)',
            jornada: 'Jornada completa',
            condiciones: 'Contratación ETT con alta tasa de conversión a plantilla directa.',
            cta: 'Envía tu candidatura simplificada con tu perfil de LinkedIn.'
        }
    },
    {
        id: 'indeed',
        nombre: 'Indeed y Glassdoor',
        badgeColor: 'bg-indigo-600',
        logoText: 'inD',
        activo: true,
        estadoApi: 'Sincronizado',
        candidaturas: 24,
        ultSinc: '14/02/2026 12:40',
        personalizado: false,
        customContent: null
    },
    {
        id: 'monster',
        nombre: 'Monster',
        badgeColor: 'bg-indigo-600',
        logoText: 'M',
        activo: false,
        estadoApi: 'Pausado',
        candidaturas: 0,
        ultSinc: '10/02/2026 09:15',
        personalizado: false,
        customContent: null
    },
    {
        id: 'portal_ett',
        nombre: 'Portal de Empleo Propio ETT',
        badgeColor: 'bg-emerald-600',
        logoText: 'ETT',
        activo: true,
        estadoApi: 'Publicado directo',
        candidaturas: 9,
        ultSinc: 'En tiempo real',
        personalizado: false,
        customContent: null
    }
];

// --- MOCK DATA: PLAZAS Y CANDIDATOS POR POSICIÓN ---
const PLAZAS_BASE = {
    'operario': [
        {
            id: 'PLZ-001-01',
            numero: 1,
            estado: 'cubierta', // 'cubierta' | 'vacante' | 'en_proceso'
            candidatoId: 'CND-1049',
            nombre: 'Jon Ander Etxebarria Bilbao',
            dni: '45892134K',
            telefono: '+34 654 112 890',
            email: 'jonander.etxebarria@email.com',
            fechaIncorporacion: '03/11/2026',
            contratoTipo: 'CPD Obra y Servicio (ETT)',
            scoring: 96,
            foto: null
        },
        {
            id: 'PLZ-001-02',
            numero: 2,
            estado: 'cubierta',
            candidatoId: 'CND-1082',
            nombre: 'Ainhoa Larrazabal Urkijo',
            dni: '78912340M',
            telefono: '+34 688 234 561',
            email: 'ainhoa.larrazabal@email.com',
            fechaIncorporacion: '03/11/2026',
            contratoTipo: 'CPD Obra y Servicio (ETT)',
            scoring: 92,
            foto: null
        },
        {
            id: 'PLZ-001-03',
            numero: 3,
            estado: 'cubierta',
            candidatoId: 'CND-1104',
            nombre: 'Mamadou Diallo',
            dni: 'X8923412P',
            telefono: '+34 611 902 443',
            email: 'mamadou.diallo@email.com',
            fechaIncorporacion: '03/11/2026',
            contratoTipo: 'CPD Obra y Servicio (ETT)',
            scoring: 88,
            foto: null
        },
        {
            id: 'PLZ-001-04',
            numero: 4,
            estado: 'cubierta',
            candidatoId: 'CND-1120',
            nombre: 'Laura Morales San Sebastián',
            dni: '16098234L',
            telefono: '+34 670 445 119',
            email: 'laura.morales@email.com',
            fechaIncorporacion: '03/11/2026',
            contratoTipo: 'CPD Obra y Servicio (ETT)',
            scoring: 94,
            foto: null
        },
        {
            id: 'PLZ-001-05',
            numero: 5,
            estado: 'cubierta',
            candidatoId: 'CND-1155',
            nombre: 'Iker Agirrebeitia Mendia',
            dni: '30691288B',
            telefono: '+34 699 871 203',
            email: 'iker.agirre@email.com',
            fechaIncorporacion: '03/11/2026',
            contratoTipo: 'CPD Obra y Servicio (ETT)',
            scoring: 90,
            foto: null
        },
        {
            id: 'PLZ-001-06',
            numero: 6,
            estado: 'vacante',
            candidatoId: null,
            nombre: null,
            dni: null,
            telefono: null,
            email: null,
            fechaIncorporacion: null,
            contratoTipo: null,
            scoring: null,
            foto: null
        },
        {
            id: 'PLZ-001-07',
            numero: 7,
            estado: 'vacante',
            candidatoId: null,
            nombre: null,
            dni: null,
            telefono: null,
            email: null,
            fechaIncorporacion: null,
            contratoTipo: null,
            scoring: null,
            foto: null
        },
        {
            id: 'PLZ-001-08',
            numero: 8,
            estado: 'vacante',
            candidatoId: null,
            nombre: null,
            dni: null,
            telefono: null,
            email: null,
            fechaIncorporacion: null,
            contratoTipo: null,
            scoring: null,
            foto: null
        }
    ],
    'carretillero': [
        {
            id: 'PLZ-002-01',
            numero: 1,
            estado: 'cubierta',
            candidatoId: 'CND-0988',
            nombre: 'Unai García Zabaleta',
            dni: '44901238R',
            telefono: '+34 633 901 223',
            email: 'unai.garcia@email.com',
            fechaIncorporacion: '03/11/2026',
            contratoTipo: 'CPD Obra y Servicio (ETT)',
            scoring: 98,
            foto: null
        },
        {
            id: 'PLZ-002-02',
            numero: 2,
            estado: 'cubierta',
            candidatoId: 'CND-1033',
            nombre: 'Carlos Manuel Ortiz Reyes',
            dni: 'Y1290384T',
            telefono: '+34 677 340 192',
            email: 'carlos.ortiz@email.com',
            fechaIncorporacion: '03/11/2026',
            contratoTipo: 'CPD Obra y Servicio (ETT)',
            scoring: 95,
            foto: null
        },
        {
            id: 'PLZ-002-03',
            numero: 3,
            estado: 'vacante',
            candidatoId: null,
            nombre: null,
            dni: null,
            telefono: null,
            email: null,
            fechaIncorporacion: null,
            contratoTipo: null,
            scoring: null,
            foto: null
        },
        {
            id: 'PLZ-002-04',
            numero: 4,
            estado: 'vacante',
            candidatoId: null,
            nombre: null,
            dni: null,
            telefono: null,
            email: null,
            fechaIncorporacion: null,
            contratoTipo: null,
            scoring: null,
            foto: null
        }
    ]
};

// Plazas de cada petición. Las de logística salen de los ejemplos de arriba; el resto se generan.
const NOMBRES_DEMO = ['Garazi Uribe Arana', 'Pablo Ruiz Cano', 'Sara Benítez Lago', 'Youssef Amrani', 'Lucía Ferrer Sanz', 'Marc Puig Soler', 'Aitana Roca Vidal', 'Daniel Sousa Prieto', 'Irene Campos Gil', 'Óscar León Mena', 'Noa Serra Pons', 'Hugo Martín Vera'];
const renumerarPlazas = (lista, codigo) => lista.map((p, i) => ({ ...p, id: `PLZ-${codigo}-${String(i + 1).padStart(2, '0')}`, numero: i + 1 }));
const plazaVacante = { estado: 'vacante', candidatoId: null, nombre: null, dni: null, telefono: null, email: null, fechaIncorporacion: null, contratoTipo: null, scoring: null, foto: null };
const generarPlazas = (p) => Array.from({ length: p.solicitados }, (_, i) => {
    if (i >= p.cubiertas) return { ...plazaVacante };
    const nombre = NOMBRES_DEMO[(i + Number(p.id.slice(-2))) % NOMBRES_DEMO.length];
    return {
        estado: 'cubierta',
        candidatoId: `CND-${p.id.slice(-4)}${i}`,
        nombre,
        dni: '00000000T',
        telefono: '+34 600 000 000',
        email: `${nombre.split(' ')[0].toLowerCase()}@ejemplo.es`,
        fechaIncorporacion: fechaCorta(p.inicio),
        contratoTipo: 'CPD circunstancias de la producción (ETT)',
        scoring: 85 + (i % 10),
        foto: null
    };
});
const INITIAL_PLAZAS = Object.fromEntries(INITIAL_PETICIONES.map(p => {
    const codigo = p.id.slice(-4);
    if (p.id === 'PET-2026-0048') return [p.id, renumerarPlazas(PLAZAS_BASE['operario'].slice(0, 5), codigo)];
    if (p.id === 'PET-2026-0049') return [p.id, renumerarPlazas(PLAZAS_BASE['operario'].slice(5), codigo)];
    if (p.id === 'PET-2026-0050') return [p.id, renumerarPlazas(PLAZAS_BASE['carretillero'], codigo)];
    return [p.id, renumerarPlazas(generarPlazas(p), codigo)];
}));

const INITIAL_CANDIDATOS_POOL = [
    {
        id: 'CND-1201',
        nombre: 'Nerea Barandiarán Goikoetxea',
        dni: '45903218V',
        telefono: '+34 644 192 830',
        email: 'nerea.barandiaran@email.com',
        puestoPrincipal: 'Operaria de almacén / Moza de almacén',
        experiencia: '3 años en logística de frío y picking con radiofrecuencia',
        disponibilidad: 'Inmediata (Turnos Mañana / Tarde)',
        carnets: 'Carnet B + Manipuladora de alimentos',
        scoring: 95,
        matchPosicion: ['operario'],
        ubicacion: 'Barakaldo (Bizkaia)',
        valoracionETT: 'Candidata muy formal, experiencia comprobada en Grupo Eroski logística.',
        estadoSeleccion: 'Disponible para asignación',
        foto: null
    },
    {
        id: 'CND-1202',
        nombre: 'David Aranguren Sola',
        dni: '72890123C',
        telefono: '+34 605 882 104',
        email: 'david.aranguren@email.com',
        puestoPrincipal: 'Carretillero frontal y retráctil UNE 58451',
        experiencia: '5 años en estanterías dinámicas 12m y carga de tráileres',
        disponibilidad: 'Inmediata',
        carnets: 'Carnet Carretillas UNE 58451 (5 tipos) + C1',
        scoring: 98,
        matchPosicion: ['carretillero'],
        ubicacion: 'Santurtzi (Bizkaia)',
        valoracionETT: 'Alta destreza en retráctil, referencias positivas en DHL Bilbao.',
        estadoSeleccion: 'Disponible para asignación',
        foto: null
    },
    {
        id: 'CND-1203',
        nombre: 'Yeray Fernández Ramos',
        dni: '16102934D',
        telefono: '+34 682 301 928',
        email: 'yeray.fernandez@email.com',
        puestoPrincipal: 'Operario de almacén y expediciones',
        experiencia: '2 años en empaquetado, albaranes y preparación con terminal Zebra',
        disponibilidad: 'Inmediata (Mañanas)',
        carnets: 'Carnet B + PRL básico 60h',
        scoring: 89,
        matchPosicion: ['operario'],
        ubicacion: 'Bilbao (Bizkaia)',
        valoracionETT: 'Muy motivado, disponibilidad para horas extra si procede.',
        estadoSeleccion: 'Disponible para asignación',
        foto: null
    },
    {
        id: 'CND-1204',
        nombre: 'Kepa Iturriaga Elorrieta',
        dni: '30654891Q',
        telefono: '+34 618 450 912',
        email: 'kepa.iturriaga@email.com',
        puestoPrincipal: 'Conductor / Carretillero homologado',
        experiencia: '4 años en almacén logístico portuario ZAL',
        disponibilidad: 'A partir del 25/02/2026',
        carnets: 'Carnet Carretillero UNE 58451 + C+E',
        scoring: 91,
        matchPosicion: ['carretillero'],
        ubicacion: 'Portugalete (Bizkaia)',
        valoracionETT: 'Conoce los muelles de la ZAL de Santurtzi a la perfección.',
        estadoSeleccion: 'Disponible para asignación',
        foto: null
    },
    {
        id: 'CND-1205',
        nombre: 'Sofía Valderrama Galdós',
        dni: '79012384H',
        telefono: '+34 690 128 347',
        email: 'sofia.valderrama@email.com',
        puestoPrincipal: 'Preparadora de pedidos / Picking',
        experiencia: '1.5 años en sector textil y paquetería express',
        disponibilidad: 'Inmediata',
        carnets: 'Carnet B',
        scoring: 87,
        matchPosicion: ['operario'],
        ubicacion: 'Galdakao (Bizkaia)',
        valoracionETT: 'Rapidez en picking y manejo ágil de lector de código de barras.',
        estadoSeleccion: 'Disponible para asignación',
        foto: null
    }
];

// --- ROOT COMPONENT ---
const cubiertasDe = (lista) => (lista || []).filter(p => p.estado === 'cubierta').length;

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

    // Main States
    const [peticiones, setPeticiones] = useState(INITIAL_PETICIONES);
    const [peticionId, setPeticionId] = useState(INITIAL_PETICIONES[0].id);
    const peticion = peticiones.find(p => p.id === peticionId) || peticiones[0];
    const [horarios, setHorarios] = useState(INITIAL_HORARIOS);
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

    // Ventanas: duplicar con otro horario, nueva petición y copiar difusión
    const [duplicar, setDuplicar] = useState(null);
    const [nuevaPeticion, setNuevaPeticion] = useState(null);
    const [copiarDifusion, setCopiarDifusion] = useState(false);

    // Portales & Content
    const [contenidoComun, setContenidoComun] = useState(() => contenidoDe(INITIAL_PETICIONES[0], INITIAL_HORARIOS[INITIAL_PETICIONES[0].id]));
    const [comunSavedStatus, setComunSavedStatus] = useState('Guardado'); // 'Guardado', 'Modificado', 'Guardando...'
    const [portales, setPortales] = useState(() => INITIAL_PORTALES.map((x, i) => ({ ...x, activo: i < INITIAL_PETICIONES[0].portalesActivos })));

    // Plazas y Candidatos Management State
    const [plazas, setPlazas] = useState(INITIAL_PLAZAS);
    const [candidatosPool, setCandidatosPool] = useState(INITIAL_CANDIDATOS_POOL);
    const [candidatoFichaModal, setCandidatoFichaModal] = useState(null); // Candidate object or null to display profile
    const [assignCandidateModal, setAssignCandidateModal] = useState(null); // { posId, plaza } or null
    const [candidateSearchFilter, setCandidateSearchFilter] = useState('');

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

    // Listado
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

    const abrirPeticion = (id) => {
        const p = peticiones.find(x => x.id === id);
        setPeticionId(id);
        setActiveTab('resumen');
        setHorarioChangesUnsaved(false);
        if (p) {
            setContenidoComun(contenidoDe(p, horarios[id]));
            setComunSavedStatus('Guardado');
            setPortales(prev => prev.map((x, i) => ({ ...x, activo: i < p.portalesActivos })));
        }
        setCurrentView('detalle');
    };
    useEffect(() => {
        const activos = portales.filter(x => x.activo).length;
        setPeticiones(prev => prev.map(p => (p.id === peticionId && p.portalesActivos !== activos ? { ...p, portalesActivos: activos } : p)));
    }, [portales]);

    const moverPeticion = (id, estado) => {
        if (!ESTADOS_PETICION.some(e => e.estado === estado)) return;
        setPeticiones(prev => prev.map(p => (p.id === id ? { ...p, estado } : p)));
        showToast(`${id} pasa a ${estado}.`);
    };

    // Crear peticiones: siempre de un puesto de un presupuesto aceptado
    const crearPeticionNueva = (base, plantilla) => {
        const id = siguienteCodigo(peticiones);
        const nueva = completarPeticion({ ...base, id, plantilla, cubiertas: 0, enProceso: 0, estado: 'Nueva', creada: new Date().toISOString().slice(0, 10), portalesActivos: 0, candidaturas: 0 });
        setPeticiones(prev => [nueva, ...prev]);
        setHorarios(prev => ({ ...prev, [id]: horarioDesdePlantilla(plantilla, nueva.centroTrabajo, `${fechaCorta(nueva.creada)} por ${nueva.responsable}`) }));
        setPlazas(prev => ({ ...prev, [id]: renumerarPlazas(Array.from({ length: nueva.solicitados }, () => ({ ...plazaVacante })), id.slice(-4)) }));
        setPeticionId(id);
        setContenidoComun(contenidoDe(nueva, { turnoNombre: HORARIO_TEMPLATES[plantilla].nombre }));
        setPortales(prev => prev.map(x => ({ ...x, activo: false })));
        setActiveTab('resumen');
        setCurrentView('detalle');
        return id;
    };
    const abrirDuplicar = () => {
        const otra = Object.keys(HORARIO_TEMPLATES).find(k => HORARIO_TEMPLATES[k].nombre !== currentSchedule.turnoNombre) || 'manana';
        setDuplicar({ plantilla: otra, solicitados: 1, inicio: peticion.inicio, fin: peticion.fin });
    };
    const confirmarDuplicar = () => {
        const { id, cubiertas, enProceso, estado, creada, portalesActivos, candidaturas, motivoCancelacion, ...base } = PETICIONES_BASE.find(b => b.id === peticion.id) || peticion;
        const nuevoId = crearPeticionNueva({ ...base, solicitados: Number(duplicar.solicitados), inicio: duplicar.inicio, fin: duplicar.fin }, duplicar.plantilla);
        setDuplicar(null);
        showToast(`Petición ${nuevoId} creada: ${peticion.puesto.toLowerCase()}, ${HORARIO_TEMPLATES[duplicar.plantilla].nombre.toLowerCase()}.`);
    };
    const confirmarNuevaPeticion = () => {
        const presu = PRESUPUESTOS_ACEPTADOS.find(p => p.id === nuevaPeticion.presupuesto);
        const puesto = presu.puestos.find(x => x.tipo === nuevaPeticion.tipo);
        const fin = new Date(`${nuevaPeticion.inicio}T00:00:00`); fin.setMonth(fin.getMonth() + 3);
        const nuevoId = crearPeticionNueva({
            presupuesto: presu.id, version: presu.version, cliente: presu.cliente, tipo: puesto.tipo, personasPuesto: puesto.personas,
            solicitados: Number(nuevaPeticion.solicitados), inicio: nuevaPeticion.inicio, fin: fin.toISOString().slice(0, 10), responsable: RESPONSABLES[0],
        }, nuevaPeticion.plantilla);
        setNuevaPeticion(null);
        showToast(`Petición ${nuevoId} creada desde ${presu.id}.`);
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

    const handleAssignCandidateToPlaza = (posId, plazaId, candidato) => {
        setPlazas(prev => {
            const posPlazas = [...(prev[posId] || [])];
            const idx = posPlazas.findIndex(p => p.id === plazaId);
            if (idx !== -1) {
                posPlazas[idx] = {
                    ...posPlazas[idx],
                    estado: 'cubierta',
                    candidatoId: candidato.id,
                    nombre: candidato.nombre,
                    dni: candidato.dni,
                    telefono: candidato.telefono,
                    email: candidato.email,
                    fechaIncorporacion: '03/11/2026',
                    contratoTipo: 'CPD Obra y Servicio (ETT)',
                    scoring: candidato.scoring,
                    foto: candidato.foto
                };
            }
            return { ...prev, [posId]: posPlazas };
        });

        setAssignCandidateModal(null);
        showToast(`Candidato ${candidato.nombre} asignado con éxito a la plaza ${plazaId}.`);
    };

    const handleUnassignPlaza = (posId, plazaId) => {
        setPlazas(prev => {
            const posPlazas = [...(prev[posId] || [])];
            const idx = posPlazas.findIndex(p => p.id === plazaId);
            if (idx !== -1) {
                posPlazas[idx] = {
                    ...posPlazas[idx],
                    estado: 'vacante',
                    candidatoId: null,
                    nombre: null,
                    dni: null,
                    telefono: null,
                    email: null,
                    fechaIncorporacion: null,
                    contratoTipo: null,
                    scoring: null,
                    foto: null
                };
            }
            return { ...prev, [posId]: posPlazas };
        });

        showToast(`Plaza ${plazaId} liberada y puesta nuevamente en estado Vacante.`);
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

    const handleSaveSchedule = () => {
        setSavingHorario(true);
        setTimeout(() => {
            const nowStr = new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
            setHorarios(prev => ({
                ...prev,
                [selectedPosId]: {
                    ...prev[selectedPosId],
                    guardado: true,
                    ultimaModif: `${nowStr} por Ane Uriarte`
                }
            }));
            setSavingHorario(false);
            setHorarioChangesUnsaved(false);
            showToast(`Horario y turno guardados correctamente de ${selectedPosId}.`);
        }, 700);
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
                            actions={<Button variant="primary" icon={Plus} onClick={() => setNuevaPeticion({ presupuesto: '', tipo: '', plantilla: 'manana', solicitados: 1, inicio: '' })}>Nueva petición</Button>}
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
                                    {Object.entries(CLIENTES).map(([id, c]) => <option key={id} value={id}>{c.clienteNombre}</option>)}
                                </Select>
                                <Select value={filtroPresupuesto} onChange={(e) => setFiltroPresupuesto(e.target.value)} aria-label="Presupuesto">
                                    <option value="">Todos los presupuestos</option>
                                    {[...new Set(peticiones.map(p => p.presupuesto))].map(id => <option key={id} value={id}>{id}</option>)}
                                </Select>
                                <Select value={filtroResponsable} onChange={(e) => setFiltroResponsable(e.target.value)} aria-label="Responsable">
                                    <option value="">Todos los responsables</option>
                                    {RESPONSABLES.map(r => <option key={r} value={r}>{r}</option>)}
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

                            {peticionesFiltradas.length === 0 ? (
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
                                                                    <div className="text-slate-700">{fechaCorta(p.inicio)} a {fechaCorta(p.fin)}</div>
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
                            breadcrumbs={[{ label: 'Peticiones', onClick: () => setCurrentView('bandeja') }, { label: peticion.id }]}
                            title={`${peticion.puesto} · ${currentSchedule.turnoNombre.toLowerCase()}`}
                            status={<Badge tone={tonoEstado(peticion.estado)} dot>{peticion.estado}</Badge>}
                            subtitle={
                                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <span className="inline-flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-slate-400" />{peticion.clienteNombre}</span>
                                    <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" />{peticion.centroTrabajo}</span>
                                    <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" />{fechaCorta(peticion.inicio)} a {fechaCorta(peticion.fin)}</span>
                                    <button type="button" onClick={() => { window.location.hash = '#/presupuestos'; }} className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 hover:underline">
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
                                    <Button variant="primary" icon={Share2} onClick={() => startSyncProcess()}>Publicar cambios</Button>
                                </>
                            }
                        />

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <KpiTile label="Plazas cubiertas" value={`${posActual.incorporados} de ${posActual.solicitados}`} onClick={() => setActiveTab('plazas')}>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                                    <div className={`${posActual.incorporados === posActual.solicitados ? 'bg-emerald-500' : 'bg-indigo-600'} h-1.5 rounded-full`} style={{ width: `${Math.round((posActual.incorporados / posActual.solicitados) * 100)}%` }}></div>
                                </div>
                            </KpiTile>
                            <KpiTile label="Candidatos en proceso" value={peticion.enProceso} hint={peticion.enProceso ? 'En entrevista o pendientes de respuesta' : 'Ninguno ahora mismo'} onClick={() => setActiveTab('plazas')} />
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
                                    <SectionTitle>Cliente y servicio</SectionTitle>
                                    <dl className="space-y-2.5 text-xs">
                                        <div><dt className="text-[11px] text-slate-500">Empresa</dt><dd className="text-slate-900">{peticion.clienteNombre} · {peticion.cif}</dd></div>
                                        <div><dt className="text-[11px] text-slate-500">Contacto</dt><dd className="text-slate-900">{peticion.contactoCliente}</dd><dd className="text-slate-500">{peticion.emailContacto} · {peticion.telefonoContacto}</dd></div>
                                        <div><dt className="text-[11px] text-slate-500">Centro de trabajo</dt><dd className="text-slate-900">{peticion.centroTrabajo}</dd></div>
                                        <div><dt className="text-[11px] text-slate-500">Fechas</dt><dd className="text-slate-900">{fechaCorta(peticion.inicio)} a {fechaCorta(peticion.fin)}</dd></div>
                                        <div><dt className="text-[11px] text-slate-500">Responsable de la ETT</dt><dd className="text-slate-900">{peticion.responsable}</dd></div>
                                    </dl>
                                </Card>

                                <Card className="overflow-hidden xl:col-span-3">
                                    <div className="p-4 border-b border-slate-200">
                                        <SectionTitle actions={<Button size="sm" icon={Copy} onClick={abrirDuplicar}>Duplicar con otro horario</Button>}>
                                            Peticiones del presupuesto {peticion.presupuestoOrigen}
                                        </SectionTitle>
                                        {(() => {
                                            const delPuesto = [peticion, ...hermanasDe(peticion, peticiones)].filter(p => p.estado !== 'Cancelada');
                                            const repartidas = delPuesto.reduce((s, p) => s + p.solicitados, 0);
                                            return (
                                                <p className={`text-xs mt-1 ${repartidas === peticion.personasPuesto ? 'text-slate-500' : 'text-amber-700'}`}>
                                                    {peticion.puesto}: {peticion.personasPuesto} personas en el presupuesto, {repartidas} repartidas en {delPuesto.length} {delPuesto.length === 1 ? 'petición' : 'peticiones'}
                                                    {repartidas !== peticion.personasPuesto && ' (no coinciden; revísalo con el cliente)'}.
                                                </p>
                                            );
                                        })()}
                                    </div>
                                    <table className="w-full text-left text-xs">
                                        <tbody>
                                            {peticiones.filter(p => p.presupuesto === peticion.presupuesto).map(p => {
                                                const actual = p.id === peticion.id;
                                                return (
                                                    <tr key={p.id} className={`border-b border-slate-100 last:border-0 ${actual ? 'bg-indigo-50/50' : 'hover:bg-slate-50 cursor-pointer'}`} onClick={() => !actual && abrirPeticion(p.id)}>
                                                        <td className="py-2.5 px-4">
                                                            <div className="font-medium text-slate-900">{p.puesto} · {(horarios[p.id]?.turnoNombre || '').toLowerCase()}</div>
                                                            <div className="text-[11px] text-slate-500">{p.id}{actual ? ' · esta petición' : p.tipo === peticion.tipo ? ' · mismo puesto' : ''}</div>
                                                        </td>
                                                        <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">{fechaCorta(p.inicio)} a {fechaCorta(p.fin)}</td>
                                                        <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap">{cubiertasDe(plazas[p.id])} de {p.solicitados} plazas</td>
                                                        <td className="py-2.5 px-4 text-right"><Badge tone={tonoEstado(p.estado)} dot>{p.estado}</Badge></td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </Card>
                            </div>
                        )}

                        {/* TAB: PLAZAS Y CANDIDATOS */}
                        {activeTab === 'plazas' && (
                            <Card className="overflow-hidden">
                                <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <SectionTitle>Plazas de esta petición</SectionTitle>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {posActual.incorporados} cubiertas · {posActual.solicitados - posActual.incorporados} por cubrir · {peticion.enProceso} candidatos en proceso
                                        </p>
                                    </div>
                                    <Button
                                        variant="primary"
                                        icon={UserPlus}
                                        disabled={posActual.incorporados === posActual.solicitados}
                                        onClick={() => {
                                            const vacante = (plazas[peticion.id] || []).find(p => p.estado !== 'cubierta');
                                            if (vacante) setAssignCandidateModal({ posId: peticion.id, plaza: vacante });
                                        }}
                                    >
                                        Asignar candidato
                                    </Button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                                                <th className="py-2 px-4 font-medium">Plaza</th>
                                                <th className="py-2 px-4 font-medium">Persona</th>
                                                <th className="py-2 px-4 font-medium">Incorporación</th>
                                                <th className="py-2 px-4 font-medium">Contrato</th>
                                                <th className="py-2 px-4" aria-label="Acciones"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(plazas[peticion.id] || []).map(plaza => (
                                                <tr key={plaza.id} className="border-b border-slate-100 last:border-0">
                                                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">Plaza {plaza.numero}</td>
                                                    <td className="py-2.5 px-4">
                                                        {plaza.estado === 'cubierta' && plaza.nombre ? (
                                                            <button type="button" onClick={() => handleOpenCandidatoFichaById(plaza.candidatoId)} className="inline-flex items-center gap-2 text-left hover:text-indigo-700">
                                                                <Avatar name={plaza.nombre} size="sm" />
                                                                <span className="font-medium text-slate-900">{plaza.nombre}</span>
                                                            </button>
                                                        ) : (
                                                            <Badge tone="warning" dot>Por cubrir</Badge>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">{plaza.fechaIncorporacion || '—'}</td>
                                                    <td className="py-2.5 px-4 text-slate-600">{plaza.contratoTipo || '—'}</td>
                                                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                                        {plaza.estado === 'cubierta' ? (
                                                            <Button size="sm" variant="ghost" onClick={() => handleUnassignPlaza(peticion.id, plaza.id)}>Liberar plaza</Button>
                                                        ) : (
                                                            <Button size="sm" onClick={() => setAssignCandidateModal({ posId: peticion.id, plaza })}>Asignar</Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        )}

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
                                            disabled={savingHorario}
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
                        {activeTab === 'portales' && (
                            <div className="space-y-6 animate-fade-in">
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
                        {activeTab === 'documentos' && (
                            <div className="space-y-4">
                                <Card className="overflow-hidden">
                                    <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <SectionTitle>Contratos y altas de las personas de esta petición</SectionTitle>
                                            <p className="text-xs text-slate-500 mt-0.5">Cada plaza cubierta necesita su contrato de puesta a disposición firmado y el alta en la Seguridad Social antes de empezar.</p>
                                        </div>
                                        <Button icon={ArrowUpRight} onClick={() => { window.location.hash = '#/laboral'; }}>Ir a Contratos y altas</Button>
                                    </div>
                                    {posActual.incorporados === 0 ? (
                                        <EmptyState icon={Users} title="Todavía no hay plazas cubiertas" text="Cuando asignes personas a las plazas, aquí verás su contrato y su alta." />
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead>
                                                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                                                        <th className="py-2 px-4 font-medium">Persona</th>
                                                        <th className="py-2 px-4 font-medium">Incorporación</th>
                                                        <th className="py-2 px-4 font-medium">Contrato</th>
                                                        <th className="py-2 px-4 font-medium">Alta en la Seguridad Social</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(plazas[peticion.id] || []).filter(p => p.estado === 'cubierta').map((plaza, i) => {
                                                        const empezado = diasHasta(peticion.inicio) <= 0;
                                                        const firmado = empezado || i % 3 !== 2;
                                                        return (
                                                            <tr key={plaza.id} className="border-b border-slate-100 last:border-0">
                                                                <td className="py-2.5 px-4"><span className="inline-flex items-center gap-2"><Avatar name={plaza.nombre} size="sm" /><span className="font-medium text-slate-900">{plaza.nombre}</span></span></td>
                                                                <td className="py-2.5 px-4 text-slate-600">{plaza.fechaIncorporacion}</td>
                                                                <td className="py-2.5 px-4">{firmado ? <Badge tone="success">Firmado</Badge> : <Badge tone="warning">Pendiente de firma</Badge>}</td>
                                                                <td className="py-2.5 px-4">{empezado ? <Badge tone="success">Comunicada</Badge> : firmado ? <Badge tone="info">Programada</Badge> : <Badge tone="neutral">Falta el contrato</Badge>}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </Card>

                                <Card className="p-4 space-y-2 text-xs">
                                    <SectionTitle>Documentos del servicio</SectionTitle>
                                    {[
                                        { nombre: `CPD_${peticion.id}.pdf`, texto: `Contrato de puesta a disposición con ${peticion.clienteNombre}`, icono: FileText },
                                        { nombre: `Riesgos_PRL_${peticion.tipo}.pdf`, texto: `Información de riesgos del puesto: ${peticion.puesto.toLowerCase()}`, icono: ShieldCheck },
                                    ].map(doc => (
                                        <div key={doc.nombre} className="p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-3 hover:bg-slate-50">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <doc.icono className="w-4 h-4 text-indigo-600 shrink-0" />
                                                <div className="min-w-0">
                                                    <div className="font-medium text-slate-900 truncate">{doc.nombre}</div>
                                                    <div className="text-slate-500 text-[11px]">{doc.texto}</div>
                                                </div>
                                            </div>
                                            <Button size="sm" variant="ghost" onClick={() => showToast(`Descarga simulada: ${doc.nombre}`)}>Descargar</Button>
                                        </div>
                                    ))}
                                </Card>
                            </div>
                        )}

                        {/* TAB: ACTIVIDAD */}
                        {activeTab === 'auditoria' && (
                            <Card className="p-5">
                                <SectionTitle>Actividad de la petición</SectionTitle>
                                <ol className="mt-2 space-y-3 text-xs">
                                    {[
                                        posActual.incorporados > 0 && { color: 'bg-emerald-500', titulo: `${posActual.incorporados} ${posActual.incorporados === 1 ? 'plaza cubierta' : 'plazas cubiertas'}`, texto: `Última incorporación prevista el ${fechaCorta(peticion.inicio)}` },
                                        peticion.portalesActivos > 0 && { color: 'bg-blue-500', titulo: `Publicada en ${peticion.portalesActivos} portales`, texto: `${peticion.candidaturas} candidaturas recibidas` },
                                        { color: 'bg-indigo-500', titulo: `Horario guardado: ${currentSchedule.turnoNombre.toLowerCase()}`, texto: currentSchedule.ultimaModif },
                                        { color: 'bg-slate-400', titulo: `Petición creada desde el presupuesto ${peticion.presupuestoOrigen}`, texto: `${fechaCorta(peticion.creada)} por ${peticion.responsable} · ${peticion.solicitados} de ${peticion.personasPuesto} personas del puesto` },
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
            {assignCandidateModal && (
                <Modal
                  title={'Asignar candidato a la plaza'}
                  subtitle={<>{peticion.puesto} · Plaza {assignCandidateModal.plaza.numero}</>}
                  onClose={() => setAssignCandidateModal(null)}
                  size="max-w-2xl"
                  toolbar={<>
                        <div className="p-5 border-b border-slate-200 bg-slate-50">
                            <div className="relative">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Buscar candidato por nombre, carnet, experiencia..."
                                    value={candidateSearchFilter}
                                    onChange={(e) => setCandidateSearchFilter(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                  </>}
                  footer={<>
                            <button
                                onClick={() => setAssignCandidateModal(null)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold"
                            >
                                Cancelar
                            </button>
                  </>}
                >

                        <div className="space-y-3 text-xs">
                            {candidatosPool
                                .filter(c => {
                                    const matchesSearch = !candidateSearchFilter ||
                                        c.nombre.toLowerCase().includes(candidateSearchFilter.toLowerCase()) ||
                                        c.puestoPrincipal.toLowerCase().includes(candidateSearchFilter.toLowerCase()) ||
                                        c.carnets.toLowerCase().includes(candidateSearchFilter.toLowerCase());
                                    return matchesSearch;
                                })
                                .map(candidato => {
                                    const isRecommended = candidato.matchPosicion.includes(peticion.tipo);
                                    return (
                                        <div key={candidato.id} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                                            <div className="flex items-start gap-3">
                                                <Avatar name={candidato.nombre} />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-slate-900 text-sm">{candidato.nombre}</span>
                                                        <span className="font-mono text-[10px] text-slate-400 font-semibold">{candidato.id}</span>
                                                        {isRecommended && (
                                                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px] font-semibold">
                                                                Recomendado
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-slate-600 text-xs mt-0.5 font-medium">{candidato.puestoPrincipal}</div>
                                                    <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                                                        <span>📍 {candidato.ubicacion}</span>
                                                        <span>🪪 {candidato.carnets}</span>
                                                        <span className="text-emerald-700 font-semibold">Afinidad: {candidato.scoring}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                                <button
                                                    onClick={() => setCandidatoFichaModal(candidato)}
                                                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                                                >
                                                    Ver ficha
                                                </button>
                                                <button
                                                    onClick={() => handleAssignCandidateToPlaza(assignCandidateModal.posId, assignCandidateModal.plaza.id, candidato)}
                                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                    <span>Asignar plaza</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
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
                const delPuesto = [peticion, ...hermanasDe(peticion, peticiones)].filter(p => p.estado !== 'Cancelada');
                const repartidas = delPuesto.reduce((s, p) => s + p.solicitados, 0) + (Number(duplicar.solicitados) || 0);
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

            {/* NUEVA PETICIÓN: siempre desde un puesto de un presupuesto aceptado */}
            {nuevaPeticion && (() => {
                const presu = PRESUPUESTOS_ACEPTADOS.find(p => p.id === nuevaPeticion.presupuesto);
                const puestoPresu = presu?.puestos.find(x => x.tipo === nuevaPeticion.tipo);
                const yaRepartidas = puestoPresu ? peticiones.filter(p => p.presupuesto === presu.id && p.tipo === puestoPresu.tipo && p.estado !== 'Cancelada').reduce((s, p) => s + p.solicitados, 0) : 0;
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
                                <Select value={nuevaPeticion.presupuesto} onChange={(e) => setNuevaPeticion(n => ({ ...n, presupuesto: e.target.value, tipo: '' }))} className="w-full">
                                    <option value="">Elige un presupuesto...</option>
                                    {PRESUPUESTOS_ACEPTADOS.map(p => <option key={p.id} value={p.id}>{p.id} {p.version} · {CLIENTES[p.cliente].clienteNombre}</option>)}
                                </Select>
                            </Field>
                            {presu && (
                                <Field label="Puesto">
                                    <div className="space-y-1.5">
                                        {presu.puestos.map(x => {
                                            const repartidas = peticiones.filter(p => p.presupuesto === presu.id && p.tipo === x.tipo && p.estado !== 'Cancelada').reduce((s, p) => s + p.solicitados, 0);
                                            const elegido = nuevaPeticion.tipo === x.tipo;
                                            return (
                                                <button
                                                    key={x.tipo}
                                                    type="button"
                                                    onClick={() => setNuevaPeticion(n => ({ ...n, tipo: x.tipo, solicitados: Math.max(1, x.personas - repartidas) }))}
                                                    className={`w-full text-left rounded-lg border px-3 py-2 flex items-center justify-between gap-2 ${elegido ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}
                                                >
                                                    <span className="font-medium text-slate-900">{PUESTOS[x.tipo].puesto}</span>
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
