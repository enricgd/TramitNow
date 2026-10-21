// GENERADO desde design/peticiones.html con scripts/import-design.py.
// Contenido del diseño tal cual; se irá sustituyendo por componentes reales.
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    Building2, FileText, Users, Clock, Globe2, Share2, ShieldCheck,
    ChevronRight, CheckCircle2, AlertCircle, ArrowLeft, Search, Filter,
    Plus, Copy, RefreshCw, Send, Eye, Edit3, Trash2, Check, X,
    Calendar, MapPin, Briefcase, ChevronDown, Sparkles, ExternalLink,
    Layers, Sliders, History, Info, ChevronUp, Bell, ArrowUpRight,
    CheckSquare, AlertTriangle, FileSpreadsheet, Lock, Radio,
    Home, UserCheck, UserPlus, DollarSign, BarChart3, Settings,
    Shield, Cpu, BookOpen, Layers2, FolderKanban
} from 'lucide-react';

// --- MOCK INITIAL DATA ---
const INITIAL_PETICION = {
    id: 'PET-2026-0048',
    titulo: 'Refuerzo Campaña Logística Primavera 2026',
    clienteId: 'CLI-8492',
    clienteNombre: 'Trans-Logística Ibérica Norte, S.L.',
    cif: 'B-84920194',
    sector: 'Transporte y Almacenamiento',
    presupuestoOrigen: 'PRE-2026-0048 v1',
    presupuestoFechaAprobacion: '12 Feb 2026',
    presupuestoImporteMax: '42.850,00 €',
    estado: 'En Selección', // Borrador, En Aprobación, Publicada / En Selección, En Cobertura, Cerrada
    fechaSolicitud: '14/02/2026',
    fechaInicioPrevista: '01/03/2026',
    fechaFinEstimada: '30/06/2026',
    responsableETT: 'Marta Gómez (Consultora Senior)',
    contactoCliente: 'Carlos Mendiluce (Dir. Operaciones)',
    telefonoContacto: '+34 944 821 033',
    emailContacto: 'c.mendiluce@translogistica.es',
    centroTrabajo: 'Hub Logístico ZAL Puerto Bilbao - Muelle 4B'
};

const INITIAL_POSICIONES = [
    {
        id: 'POS-001',
        puesto: 'Operario/a de almacén y preparación de pedidos',
        categoria: 'Especialistas / Logística (Grupo 4)',
        solicitados: 8,
        incorporados: 5,
        enProceso: 4,
        tarifaVentaHora: '19,45 €/h',
        salarioBrutoConvenio: '12,30 €/h',
        cctConvenio: 'Convenio Logística y Distribución Bizkaia',
        turnoDefecto: 'Turno Mañana (06:00 - 14:00)',
        requiereEpi: 'Calzado S3, Chaleco Alta Visibilidad, Guantes corte 3',
        carnetRequerido: 'Ninguno / Manipulador Alimentos opcional',
        descripcionCorta: 'Picking por radiofrecuencia, preparación de palets y control de albaranes de entrada.'
    },
    {
        id: 'POS-002',
        puesto: 'Carretillero/a frontal y retráctil',
        categoria: 'Oficiales de 2ª / Carretilleros (Grupo 3)',
        solicitados: 4,
        incorporados: 2,
        enProceso: 3,
        tarifaVentaHora: '22,80 €/h',
        salarioBrutoConvenio: '14,10 €/h',
        cctConvenio: 'Convenio Logística y Distribución Bizkaia',
        turnoDefecto: 'Turno Tarde (14:00 - 22:00)',
        requiereEpi: 'Calzado S3, Chaleco, Protectores auditivos ZAL',
        carnetRequerido: 'Carnet de Carretillero vigente UNE 58451 (5 tipos)',
        descripcionCorta: 'Ubicación en estanterías dinámicas 11m, carga/descarga de tráileres y uso de retráctil.'
    }
];

// Plantillas horarias
const HORARIO_TEMPLATES = {
    manana: {
        nombre: 'Turno Mañana',
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
        nombre: 'Turno Tarde',
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
        nombre: 'Turno Noche',
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
        nombre: 'Jornada Partida',
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

const INITIAL_HORARIOS = {
    'POS-001': {
        turnoNombre: 'Turno Mañana',
        tipoJornada: 'Completa (37,5 h/semana)',
        centro: 'Hub Logístico ZAL Puerto Bilbao - Nave 2',
        dias: JSON.parse(JSON.stringify(HORARIO_TEMPLATES.manana.dias)),
        guardado: true,
        ultimaModif: '14/02/2026 11:30 por Marta Gómez'
    },
    'POS-002': {
        turnoNombre: 'Turno Tarde',
        tipoJornada: 'Completa (37,5 h/semana)',
        centro: 'Hub Logístico ZAL Puerto Bilbao - Muelle 4B',
        dias: JSON.parse(JSON.stringify(HORARIO_TEMPLATES.tarde.dias)),
        guardado: true,
        ultimaModif: '14/02/2026 11:32 por Marta Gómez'
    }
};

const INITIAL_CONTENIDO_COMUN = {
    titulo: 'Operarios/as de Almacén y Carretilleros/as - Campaña Logística 2026',
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
        badgeColor: 'bg-sky-700',
        logoText: 'in',
        activo: true,
        estadoApi: 'Sincronizado',
        candidaturas: 12,
        ultSinc: '14/02/2026 12:40',
        personalizado: true,
        customContent: {
            titulo: 'Operario/a de almacén & Carretillero/a — ZAL Bilbao',
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
        nombre: 'Indeed & Glassdoor',
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
        badgeColor: 'bg-purple-600',
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
const INITIAL_PLAZAS = {
    'POS-001': [
        {
            id: 'PLZ-001-01',
            numero: 1,
            estado: 'cubierta', // 'cubierta' | 'vacante' | 'en_proceso'
            candidatoId: 'CND-1049',
            nombre: 'Jon Ander Etxebarria Bilbao',
            dni: '45892134K',
            telefono: '+34 654 112 890',
            email: 'jonander.etxebarria@email.com',
            fechaIncorporacion: '01/03/2026',
            contratoTipo: 'CPD Obra y Servicio (ETT)',
            scoring: 96,
            foto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
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
            fechaIncorporacion: '01/03/2026',
            contratoTipo: 'CPD Obra y Servicio (ETT)',
            scoring: 92,
            foto: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80'
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
            fechaIncorporacion: '01/03/2026',
            contratoTipo: 'CPD Obra y Servicio (ETT)',
            scoring: 88,
            foto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'
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
            fechaIncorporacion: '01/03/2026',
            contratoTipo: 'CPD Obra y Servicio (ETT)',
            scoring: 94,
            foto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80'
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
            fechaIncorporacion: '01/03/2026',
            contratoTipo: 'CPD Obra y Servicio (ETT)',
            scoring: 90,
            foto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80'
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
    'POS-002': [
        {
            id: 'PLZ-002-01',
            numero: 1,
            estado: 'cubierta',
            candidatoId: 'CND-0988',
            nombre: 'Unai García Zabaleta',
            dni: '44901238R',
            telefono: '+34 633 901 223',
            email: 'unai.garcia@email.com',
            fechaIncorporacion: '01/03/2026',
            contratoTipo: 'CPD Obra y Servicio (ETT)',
            scoring: 98,
            foto: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop&q=80'
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
            fechaIncorporacion: '01/03/2026',
            contratoTipo: 'CPD Obra y Servicio (ETT)',
            scoring: 95,
            foto: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&auto=format&fit=crop&q=80'
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
        matchPosicion: ['POS-001'],
        ubicacion: 'Barakaldo (Bizkaia)',
        valoracionETT: 'Candidata muy formal, experiencia comprobada en Grupo Eroski logística.',
        estadoSeleccion: 'Disponible para asignación',
        foto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80'
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
        matchPosicion: ['POS-002'],
        ubicacion: 'Santurtzi (Bizkaia)',
        valoracionETT: 'Alta destreza en retráctil, referencias positivas en DHL Bilbao.',
        estadoSeleccion: 'Disponible para asignación',
        foto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80'
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
        matchPosicion: ['POS-001'],
        ubicacion: 'Bilbao (Bizkaia)',
        valoracionETT: 'Muy motivado, disponibilidad para horas extra si procede.',
        estadoSeleccion: 'Disponible para asignación',
        foto: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120&auto=format&fit=crop&q=80'
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
        matchPosicion: ['POS-002'],
        ubicacion: 'Portugalete (Bizkaia)',
        valoracionETT: 'Conoce los muelles de la ZAL de Santurtzi a la perfección.',
        estadoSeleccion: 'Disponible para asignación',
        foto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80'
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
        matchPosicion: ['POS-001'],
        ubicacion: 'Galdakao (Bizkaia)',
        valoracionETT: 'Rapidez en picking y manejo ágil de lector de código de barras.',
        estadoSeleccion: 'Disponible para asignación',
        foto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
    }
];

// --- ROOT COMPONENT ---
export default function PeticionesView() {
    // Navigation
    const [currentView, setCurrentView] = useState('detalle'); // 'bandeja' | 'detalle'
    const [activeTab, setActiveTab] = useState('horarios'); // 'resumen', 'posiciones', 'horarios', 'portales', 'documentos', 'auditoria'

    // Notifications / Toast
    const [toast, setToast] = useState(null);
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3800);
    };

    // Main States
    const [peticion, setPeticion] = useState(INITIAL_PETICION);
    const [posiciones, setPosiciones] = useState(INITIAL_POSICIONES);
    const [horarios, setHorarios] = useState(INITIAL_HORARIOS);
    const [selectedPosId, setSelectedPosId] = useState('POS-001');
    const [savingHorario, setSavingHorario] = useState(false);
    const [horarioChangesUnsaved, setHorarioChangesUnsaved] = useState(false);

    // Copy Schedule Modal
    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
    const [copyTargetPosId, setCopyTargetPosId] = useState('POS-002');

    // Portales & Content
    const [contenidoComun, setContenidoComun] = useState(INITIAL_CONTENIDO_COMUN);
    const [comunSavedStatus, setComunSavedStatus] = useState('Guardado'); // 'Guardado', 'Modificado', 'Guardando...'
    const [portales, setPortales] = useState(INITIAL_PORTALES);

    // Plazas y Candidatos Management State
    const [plazas, setPlazas] = useState(INITIAL_PLAZAS);
    const [candidatosPool, setCandidatosPool] = useState(INITIAL_CANDIDATOS_POOL);
    const [candidatoFichaModal, setCandidatoFichaModal] = useState(null); // Candidate object or null to display profile
    const [assignCandidateModal, setAssignCandidateModal] = useState(null); // { posId, plaza } or null
    const [candidateSearchFilter, setCandidateSearchFilter] = useState('');
    const [activePlazaPosView, setActivePlazaPosView] = useState('POS-001');

    // Modals for Portals
    const [editPortalModal, setEditPortalModal] = useState(null); // portal object or null
    const [previewPortalModal, setPreviewPortalModal] = useState(null); // { portal, content, isCommon }
    const [commonPreviewOpen, setCommonPreviewOpen] = useState(false);
    const [restoreConfirmModal, setRestoreConfirmModal] = useState(null); // portal object

    // Sync Multi-Portal Process Modal
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [syncStep, setSyncStep] = useState(0); // 0: review, 1: validando, 2: adaptando, 3: enviando, 4: exito

    // Helper calculation
    const currentSchedule = useMemo(() => horarios[selectedPosId] || horarios['POS-001'], [horarios, selectedPosId]);
    const selectedPositionObj = useMemo(() => posiciones.find(p => p.id === selectedPosId) || posiciones[0], [posiciones, selectedPosId]);

    const totalHorasSemana = useMemo(() => {
        if (!currentSchedule || !currentSchedule.dias) return 0;
        return currentSchedule.dias.reduce((acc, d) => acc + (d.laborable ? Number(d.horas || 0) : 0), 0);
    }, [currentSchedule]);

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
                    fechaIncorporacion: '01/03/2026',
                    contratoTipo: 'CPD Obra y Servicio (ETT)',
                    scoring: candidato.scoring,
                    foto: candidato.foto
                };
            }
            return { ...prev, [posId]: posPlazas };
        });

        // Update position count in state
        setPosiciones(prev => prev.map(p => {
            if (p.id === posId) {
                return { ...p, incorporados: Math.min(p.solicitados, p.incorporados + 1) };
            }
            return p;
        }));

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

        setPosiciones(prev => prev.map(p => {
            if (p.id === posId) {
                return { ...p, incorporados: Math.max(0, p.incorporados - 1) };
            }
            return p;
        }));

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
                    ultimaModif: `${nowStr} por Marta Gómez`
                }
            }));
            setSavingHorario(false);
            setHorarioChangesUnsaved(false);
            showToast(`Horario y turno guardados correctamente para la posición ${selectedPosId}.`);
        }, 700);
    };

    const handleConfirmCopySchedule = () => {
        if (copyTargetPosId === selectedPosId) {
            showToast('Selecciona una posición de destino diferente', 'error');
            return;
        }
        const sourceData = horarios[selectedPosId];
        setHorarios(prev => ({
            ...prev,
            [copyTargetPosId]: {
                ...prev[copyTargetPosId],
                turnoNombre: sourceData.turnoNombre,
                dias: JSON.parse(JSON.stringify(sourceData.dias)),
                guardado: true,
                ultimaModif: `Copiado de ${selectedPosId} el ${new Date().toLocaleDateString('es-ES')}`
            }
        }));
        setIsCopyModalOpen(false);
        showToast(`Horario de ${selectedPosId} copiado exitosamente a ${copyTargetPosId}.`);
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
        <div className="flex min-h-full bg-slate-100/80">
            {/* TOAST ALERT */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 animate-fade-in text-sm font-medium">
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
            <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                {/* Topbar */}
                <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-3 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-3">
                        {currentView === 'detalle' && (
                            <button
                                onClick={() => setCurrentView('bandeja')}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                <span>Volver a Peticiones</span>
                            </button>
                        )}
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>ERP ETT</span>
                            <ChevronRight className="w-3 h-3 text-slate-400" />
                            <span className="font-medium text-slate-700">Peticiones Operativas</span>
                            {currentView === 'detalle' && (
                                <>
                                    <ChevronRight className="w-3 h-3 text-slate-400" />
                                    <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                        PET-2026-0048
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-md">
                            <Lock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Presupuesto Origen Bloqueado (<strong>PRE-2026-0048</strong>)</span>
                        </div>
                        <button
                            onClick={() => startSyncProcess()}
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition shadow-indigo-600/20"
                        >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Revisar y Enviar a Portales</span>
                        </button>
                    </div>
                </header>

                {/* VIEW 1: BANDEJA DE PETICIONES */}
                {currentView === 'bandeja' && (
                    <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Peticiones Operativas de Personal</h1>
                                <p className="text-sm text-slate-500 mt-0.5">
                                    Gestión de pedidos de trabajadores derivados de presupuestos aprobados, asignación de turnos y multidifusión API.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-medium shadow-xs">
                                    <Filter className="w-3.5 h-3.5 text-slate-500" />
                                    Filtro: Activas
                                </span>
                            </div>
                        </div>

                        {/* Metric cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                                <div className="text-xs font-medium text-slate-500">Peticiones en Selección</div>
                                <div className="text-2xl font-bold text-indigo-600 mt-1">8</div>
                                <div className="text-[11px] text-emerald-600 mt-1 font-medium">3 con difusión API activa</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                                <div className="text-xs font-medium text-slate-500">Posiciones Solicitadas</div>
                                <div className="text-2xl font-bold text-slate-900 mt-1">26</div>
                                <div className="text-[11px] text-slate-500 mt-1">16 cubiertas / 10 pendientes</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                                <div className="text-xs font-medium text-slate-500">Candidaturas Recibidas (Portales)</div>
                                <div className="text-2xl font-bold text-slate-900 mt-1">63</div>
                                <div className="text-[11px] text-indigo-600 mt-1 font-medium">+15 en últimas 24h</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                                <div className="text-xs font-medium text-slate-500">Tiempo Medio Cobertura</div>
                                <div className="text-2xl font-bold text-slate-900 mt-1">4.2 días</div>
                                <div className="text-[11px] text-emerald-600 mt-1">Objetivo SLA cumplido (&lt; 5d)</div>
                            </div>
                        </div>

                        {/* Table list */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                            <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4">
                                <div className="relative flex-1 max-w-sm">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por código, cliente o puesto..."
                                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                                        defaultValue="PET-2026-0048"
                                    />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-slate-600">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                                        <tr>
                                            <th className="py-3 px-4">Código & Petición</th>
                                            <th className="py-3 px-4">Cliente & Presupuesto</th>
                                            <th className="py-3 px-4">Posiciones & Cobertura</th>
                                            <th className="py-3 px-4">Turnos Asignados</th>
                                            <th className="py-3 px-4">Estado API</th>
                                            <th className="py-3 px-4">Estado</th>
                                            <th className="py-3 px-4 text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        <tr className="hover:bg-indigo-50/40 transition cursor-pointer" onClick={() => setCurrentView('detalle')}>
                                            <td className="py-3.5 px-4">
                                                <div className="font-bold text-indigo-600">{peticion.id}</div>
                                                <div className="text-slate-900 font-medium">{peticion.titulo}</div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="font-medium text-slate-900">{peticion.clienteNombre}</div>
                                                <div className="text-[11px] text-slate-500 font-mono">Presup: {peticion.presupuestoOrigen}</div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="font-medium text-slate-900">7 / 12 incorporados</div>
                                                <div className="w-32 bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                                                    <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: '58%' }}></div>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-1">
                                                    <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-medium">Mañana (POS-1)</span>
                                                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-medium">Tarde (POS-2)</span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-medium">
                                                    <Globe2 className="w-3 h-3" /> 4 Portales Activos
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-semibold">
                                                    {peticion.estado}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setCurrentView('detalle'); }}
                                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition"
                                                >
                                                    Abrir Ficha 360º
                                                </button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* VIEW 2: DETALLE 360º DE PET-2026-0048 */}
                {currentView === 'detalle' && (
                    <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
                        {/* FICHA CABECERA PETICIÓN */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2.5">
                                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-bold rounded-md text-xs">
                                            {peticion.id}
                                        </span>
                                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium rounded-md text-xs flex items-center gap-1.5">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                            {peticion.estado}
                                        </span>
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-xs font-medium">
                                            <FileText className="w-3.5 h-3.5 text-amber-600" />
                                            <span>Derivado de Presupuesto Aceptado: <strong>{peticion.presupuestoOrigen}</strong> ({peticion.presupuestoImporteMax})</span>
                                        </div>
                                    </div>
                                    <h1 className="text-xl font-bold text-slate-900 mt-2 tracking-tight">
                                        {peticion.titulo}
                                    </h1>
                                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 mt-1">
                                        <span className="flex items-center gap-1 text-slate-700 font-semibold">
                                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                            {peticion.clienteNombre} (CIF: {peticion.cif})
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                            {peticion.centroTrabajo}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                            Periodo: {peticion.fechaInicioPrevista} al {peticion.fechaFinEstimada}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    <button
                                        onClick={() => {
                                            setActiveTab('portales');
                                            showToast('Navegando a configuración de difusión en portales.');
                                        }}
                                        className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition"
                                    >
                                        <Globe2 className="w-4 h-4 text-indigo-600" />
                                        <span>Portales de Empleo (5)</span>
                                    </button>
                                    <button
                                        onClick={() => startSyncProcess()}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition shadow-indigo-600/20"
                                    >
                                        <Share2 className="w-4 h-4" />
                                        <span>Publicar / Sincronizar Cambios</span>
                                    </button>
                                </div>
                            </div>

                            {/* Progress Banner */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
                                <div>
                                    <div className="text-[11px] font-medium text-slate-500">Cobertura Total Posiciones</div>
                                    <div className="text-lg font-bold text-slate-900 mt-0.5">7 / 12 Trabajadores</div>
                                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1.5 overflow-hidden">
                                        <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: '58.3%' }}></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[11px] font-medium text-slate-500">POS-001 (Operarios)</div>
                                    <div className="text-sm font-semibold text-slate-800 mt-0.5">5 de 8 incorporados (62%)</div>
                                    <div className="text-[11px] text-amber-700 font-medium">Turno: Mañana (06:00-14:00)</div>
                                </div>
                                <div>
                                    <div className="text-[11px] font-medium text-slate-500">POS-002 (Carretilleros)</div>
                                    <div className="text-sm font-semibold text-slate-800 mt-0.5">2 de 4 incorporados (50%)</div>
                                    <div className="text-[11px] text-blue-700 font-medium">Turno: Tarde (14:00-22:00)</div>
                                </div>
                                <div>
                                    <div className="text-[11px] font-medium text-slate-500">Multidifusión API</div>
                                    <div className="text-sm font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> 4 Activos / 1 Pausado
                                    </div>
                                    <div className="text-[11px] text-slate-500">63 candidaturas recibidas</div>
                                </div>
                            </div>

                            {/* TABS HEADER */}
                            <div className="flex border-b border-slate-200 gap-1 overflow-x-auto text-xs font-semibold pt-2">
                                <button
                                    onClick={() => setActiveTab('resumen')}
                                    className={`pb-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
                                        activeTab === 'resumen'
                                            ? 'border-indigo-600 text-indigo-600'
                                            : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                                    }`}
                                >
                                    <Layers className="w-4 h-4" />
                                    <span>Resumen General</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('presupuesto')}
                                    className={`pb-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
                                        activeTab === 'presupuesto'
                                            ? 'border-indigo-600 text-indigo-600'
                                            : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                                    }`}
                                >
                                    <FileSpreadsheet className="w-4 h-4" />
                                    <span>Presupuesto Heredado</span>
                                    <span className="px-1.5 py-0.2 bg-amber-50 text-amber-700 rounded text-[10px] border border-amber-200 font-mono">
                                        PRE-2026
                                    </span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('posiciones')}
                                    className={`pb-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
                                        activeTab === 'posiciones'
                                            ? 'border-indigo-600 text-indigo-600'
                                            : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                                    }`}
                                >
                                    <Users className="w-4 h-4" />
                                    <span>Posiciones ({posiciones.length})</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('horarios')}
                                    className={`pb-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
                                        activeTab === 'horarios'
                                            ? 'border-indigo-600 text-indigo-600'
                                            : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                                    }`}
                                >
                                    <Clock className="w-4 h-4" />
                                    <span>Horarios & Turnos por Posición</span>
                                    {horarioChangesUnsaved && (
                                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveTab('portales')}
                                    className={`pb-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
                                        activeTab === 'portales'
                                            ? 'border-indigo-600 text-indigo-600'
                                            : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                                    }`}
                                >
                                    <Globe2 className="w-4 h-4" />
                                    <span>Difusión en Portales & Contenido</span>
                                    <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 rounded-full text-[10px] border border-indigo-100">
                                        API
                                    </span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('documentos')}
                                    className={`pb-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
                                        activeTab === 'documentos'
                                            ? 'border-indigo-600 text-indigo-600'
                                            : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                                    }`}
                                >
                                    <FileText className="w-4 h-4" />
                                    <span>Contratos CPD & Anexos</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('auditoria')}
                                    className={`pb-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
                                        activeTab === 'auditoria'
                                            ? 'border-indigo-600 text-indigo-600'
                                            : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                                    }`}
                                >
                                    <History className="w-4 h-4" />
                                    <span>Trazabilidad & Webhooks</span>
                                </button>
                            </div>
                        </div>

                        {/* TAB: PRESUPUESTO HEREDADO (HERENCIA COMERCIAL Y TARIFAS) */}
                        {activeTab === 'presupuesto' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-start gap-3.5">
                                        <div className="p-2.5 bg-amber-600 text-white rounded-xl shrink-0 mt-0.5 shadow-xs">
                                            <Lock className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold text-xs bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded">
                                                    {peticion.presupuestoOrigen}
                                                </span>
                                                <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Aprobado & Firmado
                                                </span>
                                            </div>
                                            <h3 className="text-sm font-bold text-amber-950 mt-1">
                                                Condiciones Económicas Heredadas y Blindadas
                                            </h3>
                                            <p className="text-xs text-amber-800 mt-0.5 max-w-2xl">
                                                Las tarifas hora, coeficientes de recargo ETT, salarios de convenio y partidas de coste provienen del presupuesto comercial aceptado el <strong>{peticion.presupuestoFechaAprobacion}</strong>. No pueden modificarse desde la gestión operativa.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 bg-white/80 p-3.5 rounded-xl border border-amber-200">
                                        <div className="text-[10px] uppercase font-bold text-slate-500">Importe Máximo Autorizado</div>
                                        <div className="text-xl font-bold text-slate-900 mt-0.5">{peticion.presupuestoImporteMax}</div>
                                        <div className="text-[11px] text-slate-500">Consumo actual estimado: 17.820,00 € (41%)</div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                                            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Líneas Económicas Validadas en Presupuesto</h4>
                                        </div>
                                        <span className="text-xs text-slate-500 font-mono">Convenio: Bizkaia Logística 2026</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs text-slate-700">
                                            <thead className="bg-slate-50/60 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                                                <tr>
                                                    <th className="py-3 px-4">Ref. Posición</th>
                                                    <th className="py-3 px-4">Puesto / Categoría</th>
                                                    <th className="py-3 px-4">Cant. Aprobada</th>
                                                    <th className="py-3 px-4">Salario Bruto (Conv.)</th>
                                                    <th className="py-3 px-4">Seguridad Social + PRL</th>
                                                    <th className="py-3 px-4">Tarifa Facturación ETT</th>
                                                    <th className="py-3 px-4 text-right">Margen Bruto</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                <tr>
                                                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">POS-001</td>
                                                    <td className="py-3 px-4">
                                                        <div className="font-semibold text-slate-900">Operario/a de almacén y preparación</div>
                                                        <div className="text-[11px] text-slate-400">Grupo 4 — Especialistas</div>
                                                    </td>
                                                    <td className="py-3 px-4 font-semibold text-slate-900">8 pax</td>
                                                    <td className="py-3 px-4 font-mono">12,30 €/h</td>
                                                    <td className="py-3 px-4 font-mono text-slate-500">3,94 €/h (32%)</td>
                                                    <td className="py-3 px-4 font-mono font-bold text-emerald-700">19,45 €/h</td>
                                                    <td className="py-3 px-4 text-right font-mono font-semibold text-indigo-600">+16,5% (3,21 €/h)</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">POS-002</td>
                                                    <td className="py-3 px-4">
                                                        <div className="font-semibold text-slate-900">Carretillero/a frontal y retráctil</div>
                                                        <div className="text-[11px] text-slate-400">Grupo 3 — Oficiales de 2ª</div>
                                                    </td>
                                                    <td className="py-3 px-4 font-semibold text-slate-900">4 pax</td>
                                                    <td className="py-3 px-4 font-mono">14,10 €/h</td>
                                                    <td className="py-3 px-4 font-mono text-slate-500">4,51 €/h (32%)</td>
                                                    <td className="py-3 px-4 font-mono font-bold text-emerald-700">22,80 €/h</td>
                                                    <td className="py-3 px-4 text-right font-mono font-semibold text-indigo-600">+18,4% (4,19 €/h)</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: POSICIONES SOLICITADAS (DETALLE Y ESTADOS DE COBERTURA) */}
                        {activeTab === 'posiciones' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900">Posiciones de la Petición ({posiciones.length})</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">Estado de cobertura, requisitos técnicos, EPIs y acceso rápido a cuadrantes específicos.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => { setActiveTab('horarios'); }}
                                            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                                        >
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>Ir a Horarios por Posición</span>
                                        </button>
                                    </div>
                                </div>

                                {/* LEYENDA CONCEPTUAL */}
                                <div className="bg-slate-100/90 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 flex items-center gap-2.5 shadow-2xs">
                                    <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                                    <span>
                                        <strong className="text-slate-900 font-semibold">Leyenda:</strong> Posición = tipo de puesto · Plaza = necesidad individual · Candidato = persona · Asignación = persona vinculada a una plaza
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {posiciones.map(pos => {
                                        const posHorario = horarios[pos.id];
                                        const percent = Math.round((pos.incorporados / pos.solicitados) * 100);
                                        return (
                                            <div key={pos.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between space-y-4">
                                                <div>
                                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                                        <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-mono font-bold rounded text-xs border border-indigo-100">
                                                            {pos.id}
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">
                                                            Venta: {pos.tarifaVentaHora}
                                                        </span>
                                                    </div>

                                                    <h4 className="font-bold text-slate-900 text-base mt-3">{pos.puesto}</h4>
                                                    <div className="text-xs text-slate-500 mt-0.5">{pos.categoria} • {pos.cctConvenio}</div>

                                                    <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                        <div className="flex items-center justify-between text-xs mb-1.5">
                                                            <span className="font-bold text-slate-700">Progreso de Cobertura</span>
                                                            <span className="font-mono font-bold text-indigo-600">{pos.incorporados} de {pos.solicitados} ({percent}%)</span>
                                                        </div>
                                                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                                            <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${percent}%` }}></div>
                                                        </div>
                                                        <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
                                                            <span>En proceso de selección: <strong>{pos.enProceso} candidatos</strong></span>
                                                            <span className="text-amber-700 font-medium">Faltan: {pos.solicitados - pos.incorporados}</span>
                                                        </div>
                                                    </div>

                                                    {/* BLOQUE COMPACTO: PLAZAS Y PERSONAS */}
                                                    {(() => {
                                                        const posPlazas = plazas[pos.id] || [];
                                                        const cubiertas = posPlazas.filter(p => p.estado === 'cubierta').length;
                                                        const vacantes = posPlazas.filter(p => p.estado !== 'cubierta').length;
                                                        const previewPlazas = posPlazas.slice(0, 3);

                                                        return (
                                                            <div className="mt-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200">
                                                                <div className="flex items-center justify-between text-xs mb-2">
                                                                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                                                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                                                                        Plazas y personas
                                                                    </span>
                                                                    <span className="text-[11px] text-slate-500 font-medium">
                                                                        <strong className="text-emerald-700">{cubiertas} cubiertas</strong> · <strong className="text-amber-700">{vacantes} vacantes</strong>
                                                                    </span>
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    {previewPlazas.map((plaza) => (
                                                                        <div key={plaza.id} className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-slate-200 text-xs">
                                                                            <span className="font-mono text-[11px] text-slate-500 font-semibold px-1.5 py-0.5 bg-slate-100 rounded">
                                                                                Plaza #{plaza.numero}
                                                                            </span>
                                                                            {plaza.estado === 'cubierta' && plaza.nombre ? (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleOpenCandidatoFichaById(plaza.candidatoId)}
                                                                                    className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline truncate max-w-[180px] sm:max-w-[220px] text-left text-xs flex items-center gap-1"
                                                                                    title="Ver ficha personal"
                                                                                >
                                                                                    <span className="truncate">{plaza.nombre}</span>
                                                                                    <ExternalLink className="w-3 h-3 shrink-0 text-indigo-500" />
                                                                                </button>
                                                                            ) : (
                                                                                <span className="text-amber-600 font-medium text-xs flex items-center gap-1">
                                                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                                                                    Vacante
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                    {posPlazas.length > 3 && (
                                                                        <div className="text-[10px] text-slate-400 text-right pt-0.5 font-medium">
                                                                            + {posPlazas.length - 3} plazas adicionales
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}

                                                    <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                                                        <div className="flex items-start gap-1.5">
                                                            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                                            <span><strong>EPIs Obligatorios:</strong> {pos.requiereEpi}</span>
                                                        </div>
                                                        <div className="flex items-start gap-1.5">
                                                            <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                                                            <span><strong>Acreditaciones / Carnet:</strong> {pos.carnetRequerido}</span>
                                                        </div>
                                                        <div className="flex items-start gap-1.5">
                                                            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                                            <span><strong>Turno asignado:</strong> {posHorario?.turnoNombre || 'Pendiente'} ({posHorario?.tipoJornada || '37,5 h'})</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setActivePlazaPosView(pos.id);
                                                                showToast(`Detalle de plazas y personas seleccionado para ${pos.id}`);
                                                            }}
                                                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
                                                        >
                                                            <Users className="w-3.5 h-3.5" />
                                                            <span>Ver plazas y personas</span>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setActivePlazaPosView(pos.id);
                                                                const posPlazas = plazas[pos.id] || [];
                                                                const vacante = posPlazas.find(p => p.estado !== 'cubierta');
                                                                if (vacante) {
                                                                    setAssignCandidateModal({ posId: pos.id, plaza: vacante });
                                                                } else {
                                                                    showToast(`Todas las plazas de ${pos.id} ya están cubiertas.`, 'error');
                                                                }
                                                            }}
                                                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                                                        >
                                                            <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                                                            <span>Buscar candidatos</span>
                                                        </button>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedPosId(pos.id);
                                                                setActiveTab('horarios');
                                                            }}
                                                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                                                        >
                                                            <Clock className="w-3.5 h-3.5" />
                                                            <span>Configurar Horario {pos.id}</span>
                                                        </button>
                                                        <button
                                                            onClick={() => setActiveTab('portales')}
                                                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                                                        >
                                                            <Globe2 className="w-3.5 h-3.5 text-slate-500" />
                                                            <span>Ver en Portales</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* TAB 1: RESUMEN GENERAL */}
                        {activeTab === 'resumen' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {posiciones.map(pos => {
                                        const posHorario = horarios[pos.id];
                                        return (
                                            <div key={pos.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 font-mono font-bold rounded text-xs">
                                                            {pos.id}
                                                        </span>
                                                        <span className="text-xs font-semibold text-slate-900 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                                                            Tarifa: {pos.tarifaVentaHora}
                                                        </span>
                                                    </div>
                                                    <h3 className="font-bold text-slate-900 text-base mt-3">
                                                        {pos.puesto}
                                                    </h3>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        {pos.categoria}
                                                    </p>
                                                    <p className="text-xs text-slate-600 mt-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                                        {pos.descripcionCorta}
                                                    </p>

                                                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                                                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                                                            <div className="text-slate-400 text-[10px] uppercase font-semibold">Incorporación</div>
                                                            <div className="font-bold text-slate-900 mt-0.5">{pos.incorporados} de {pos.solicitados} cubiertos</div>
                                                            <div className="text-[10px] text-indigo-600">{pos.enProceso} en entrevista</div>
                                                        </div>
                                                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                                                            <div className="text-slate-400 text-[10px] uppercase font-semibold">Turno Configurado</div>
                                                            <div className="font-bold text-slate-900 mt-0.5">{posHorario ? posHorario.turnoNombre : 'Sin configurar'}</div>
                                                            <div className="text-[10px] text-slate-500">Lunes a Viernes</div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 text-xs text-slate-500 space-y-1">
                                                        <div><strong>EPIs Obligatorios:</strong> {pos.requiereEpi}</div>
                                                        <div><strong>Requisitos / Carnet:</strong> {pos.carnetRequerido}</div>
                                                    </div>
                                                </div>

                                                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedPosId(pos.id);
                                                            setActiveTab('horarios');
                                                        }}
                                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition"
                                                    >
                                                        <Clock className="w-3.5 h-3.5" />
                                                        <span>Ver / Editar Turno Semanal</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setActiveTab('portales');
                                                        }}
                                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
                                                    >
                                                        <Globe2 className="w-3.5 h-3.5 text-slate-500" />
                                                        <span>Difusión API</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* TAB 2: HORARIOS & TURNOS POR POSICIÓN (REQUISITO PRINCIPAL 1) */}
                        {activeTab === 'horarios' && (
                            <div className="space-y-6 animate-fade-in">
                                {/* BANNER AVISO */}
                                <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3.5">
                                    <div className="p-2 bg-indigo-600 text-white rounded-xl shrink-0 mt-0.5 shadow-xs">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 text-xs">
                                        <h4 className="font-bold text-indigo-950 text-sm">
                                            Configuración Independiente de Horario por Posición
                                        </h4>
                                        <p className="text-indigo-800 mt-0.5">
                                            Cada posición solicitada tiene su propio cuadrante horario, turno y centro de trabajo asociado. Cambiar o guardar el horario de una posición <strong>no afecta</strong> a las demás posiciones de esta petición.
                                        </p>
                                    </div>
                                </div>

                                {/* SELECTOR DE POSICIÓN PRINCIPAL */}
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                                                Posición a Configurar en este Momento:
                                            </label>
                                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                                {posiciones.map(pos => {
                                                    const isSelected = pos.id === selectedPosId;
                                                    const posH = horarios[pos.id];
                                                    return (
                                                        <button
                                                            key={pos.id}
                                                            onClick={() => {
                                                                setSelectedPosId(pos.id);
                                                                setHorarioChangesUnsaved(false);
                                                            }}
                                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition ${
                                                                isSelected
                                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/30'
                                                                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                                                            }`}
                                                        >
                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                                                                isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'
                                                            }`}>
                                                                {pos.id}
                                                            </span>
                                                            <span>{pos.puesto}</span>
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                                                isSelected ? 'bg-indigo-500 text-indigo-100' : 'bg-slate-100 text-slate-500'
                                                            }`}>
                                                                {posH?.turnoNombre || 'Sin turno'}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={() => {
                                                    setCopyTargetPosId(selectedPosId === 'POS-001' ? 'POS-002' : 'POS-001');
                                                    setIsCopyModalOpen(true);
                                                }}
                                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition border border-slate-200"
                                            >
                                                <Copy className="w-3.5 h-3.5 text-slate-600" />
                                                <span>Copiar Horario a otra Posición</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* RESUMEN DE LA POSICIÓN SELECCIONADA */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
                                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                                            <div className="text-[10px] uppercase font-bold text-slate-400">Puesto & Vacantes</div>
                                            <div className="font-bold text-slate-900 text-sm mt-0.5 truncate">{selectedPositionObj.puesto}</div>
                                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">{selectedPosId} — {selectedPositionObj.solicitados} vacantes</div>
                                        </div>
                                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                                            <div className="text-[10px] uppercase font-bold text-slate-400">Turno & Jornada</div>
                                            <div className="font-bold text-slate-900 text-sm mt-0.5">{currentSchedule.turnoNombre}</div>
                                            <div className="text-[11px] text-slate-500 mt-0.5">{currentSchedule.tipoJornada}</div>
                                        </div>
                                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                                            <div className="text-[10px] uppercase font-bold text-slate-400">Total Horas Semanales</div>
                                            <div className="font-bold text-indigo-600 text-base mt-0.5">{totalHorasSemana} h / semana</div>
                                            <div className="text-[11px] text-emerald-600 font-medium">Cumple convenio laboral</div>
                                        </div>
                                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                                            <div className="text-[10px] uppercase font-bold text-slate-400">Estado de Guardado</div>
                                            <div className="flex items-center gap-1.5 font-bold text-sm mt-0.5">
                                                {currentSchedule.guardado ? (
                                                    <span className="text-emerald-700 flex items-center gap-1">
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Horario Guardado
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
                                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                                Aplicar Plantilla Rápida de Turno:
                                            </span>
                                            <span className="text-[11px] text-slate-500 ml-1">
                                                (Se aplica <strong>solo</strong> a la posición {selectedPosId}: {selectedPositionObj.puesto})
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                onClick={() => handleApplyTemplate('manana')}
                                                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition"
                                            >
                                                Turno Mañana (06:00 - 14:00)
                                            </button>
                                            <button
                                                onClick={() => handleApplyTemplate('tarde')}
                                                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition"
                                            >
                                                Turno Tarde (14:00 - 22:00)
                                            </button>
                                            <button
                                                onClick={() => handleApplyTemplate('noche')}
                                                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition"
                                            >
                                                Turno Noche (22:00 - 06:00)
                                            </button>
                                            <button
                                                onClick={() => handleApplyTemplate('partida')}
                                                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition"
                                            >
                                                Jornada Partida
                                            </button>
                                        </div>
                                    </div>

                                    {/* TABLA SEMANAL EDITABLE */}
                                    <div className="mt-5 border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                                        <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                                Cuadrante Semanal — Posición {selectedPosId}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                Edita los campos directamente para personalizar días laborables o descansos
                                            </span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs text-slate-700">
                                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                                                    <tr>
                                                        <th className="py-3 px-4">Día de la Semana</th>
                                                        <th className="py-3 px-4">Laborable</th>
                                                        <th className="py-3 px-4">Hora Inicio</th>
                                                        <th className="py-3 px-4">Hora Fin</th>
                                                        <th className="py-3 px-4">Descanso (Minutos)</th>
                                                        <th className="py-3 px-4">Horas Efectivas</th>
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
                                                                        {d.laborable ? 'Sí' : 'No (Descanso)'}
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
                                                                        d.laborable ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
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
                                                                        d.laborable ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
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
                                                                            d.laborable ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                                                        }`}
                                                                    />
                                                                    <span className="text-slate-400 text-xs">min</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <span className={`font-mono font-bold ${d.laborable ? 'text-indigo-600' : 'text-slate-400'}`}>
                                                                    {d.laborable ? `${d.horas} h` : '—'}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4 text-right">
                                                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                                                                    d.laborable ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                                                }`}>
                                                                    {d.laborable ? 'Turno Activo' : 'No Computa'}
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
                                            <span>Los cambios se guardan exclusivamente en el perfil de la posición <strong>{selectedPosId}</strong>.</span>
                                        </div>

                                        <button
                                            onClick={handleSaveSchedule}
                                            disabled={savingHorario}
                                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-semibold shadow-sm shadow-indigo-600/30 transition"
                                        >
                                            {savingHorario ? (
                                                <>
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                    <span>Guardando Horario {selectedPosId}...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="w-4 h-4" />
                                                    <span>Guardar Horario de esta Posición ({selectedPosId})</span>
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
                                <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 bg-indigo-500 text-white text-[10px] font-bold rounded uppercase tracking-wider">
                                                API Multidifusión ETT
                                            </span>
                                            <span className="text-xs text-slate-300">Conectores REST v2.4</span>
                                        </div>
                                        <h3 className="text-base font-bold text-white">
                                            Contenido de Publicación & Personalización por Canal
                                        </h3>
                                        <p className="text-xs text-slate-300 max-w-2xl">
                                            Define un contenido maestro común o añade adaptaciones específicas para cada portal (título más corto para LinkedIn, requisitos detallados para InfoJobs, etc.).
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2.5 shrink-0">
                                        <button
                                            onClick={() => setCommonPreviewOpen(true)}
                                            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-2"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            <span>Vista Previa Maestra</span>
                                        </button>
                                        <button
                                            onClick={() => startSyncProcess()}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-sm shadow-indigo-600/30"
                                        >
                                            <Share2 className="w-3.5 h-3.5" />
                                            <span>Sincronizar a Portales</span>
                                        </button>
                                    </div>
                                </div>

                                {/* BLOQUE A: CONTENIDO COMÚN PARA TODOS LOS PORTALES */}
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                                    <Layers className="w-4 h-4 text-indigo-600" />
                                                    Contenido Común para Todos los Portales (Plantilla Base)
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
                                                <span>Vista Previa Común</span>
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
                                                        <span>Guardar Contenido Común</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <form onSubmit={handleSaveContenidoComun} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                        <div className="md:col-span-2">
                                            <label className="font-bold text-slate-700 block mb-1">
                                                Título Principal de la Publicación <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={contenidoComun.titulo}
                                                onChange={(e) => {
                                                    setContenidoComun({ ...contenidoComun, titulo: e.target.value });
                                                    setComunSavedStatus('Cambios sin guardar');
                                                }}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-900"
                                                placeholder="Ej: Operarios/as de Almacén..."
                                            />
                                        </div>

                                        <div>
                                            <label className="font-bold text-slate-700 block mb-1">
                                                Categoría Profesional
                                            </label>
                                            <input
                                                type="text"
                                                value={contenidoComun.categoria}
                                                onChange={(e) => {
                                                    setContenidoComun({ ...contenidoComun, categoria: e.target.value });
                                                    setComunSavedStatus('Cambios sin guardar');
                                                }}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="font-bold text-slate-700 block mb-1">
                                                Ubicación Visible
                                            </label>
                                            <input
                                                type="text"
                                                value={contenidoComun.ubicacion}
                                                onChange={(e) => {
                                                    setContenidoComun({ ...contenidoComun, ubicacion: e.target.value });
                                                    setComunSavedStatus('Cambios sin guardar');
                                                }}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="font-bold text-slate-700 block mb-1">
                                                Descripción General de la Oferta <span className="text-red-500">*</span>
                                            </label>
                                            <textarea
                                                rows={2}
                                                value={contenidoComun.descripcion}
                                                onChange={(e) => {
                                                    setContenidoComun({ ...contenidoComun, descripcion: e.target.value });
                                                    setComunSavedStatus('Cambios sin guardar');
                                                }}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="font-bold text-slate-700 block mb-1">
                                                Funciones del Puesto
                                            </label>
                                            <textarea
                                                rows={4}
                                                value={contenidoComun.funciones}
                                                onChange={(e) => {
                                                    setContenidoComun({ ...contenidoComun, funciones: e.target.value });
                                                    setComunSavedStatus('Cambios sin guardar');
                                                }}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                                            />
                                        </div>

                                        <div>
                                            <label className="font-bold text-slate-700 block mb-1">
                                                Requisitos Obligatorios <span className="text-red-500">*</span>
                                            </label>
                                            <textarea
                                                rows={4}
                                                value={contenidoComun.requisitos}
                                                onChange={(e) => {
                                                    setContenidoComun({ ...contenidoComun, requisitos: e.target.value });
                                                    setComunSavedStatus('Cambios sin guardar');
                                                }}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                                            />
                                        </div>

                                        <div>
                                            <label className="font-bold text-slate-700 block mb-1">
                                                Condiciones & Salario Ofrecido
                                            </label>
                                            <input
                                                type="text"
                                                value={contenidoComun.condiciones}
                                                onChange={(e) => {
                                                    setContenidoComun({ ...contenidoComun, condiciones: e.target.value });
                                                    setComunSavedStatus('Cambios sin guardar');
                                                }}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="font-bold text-slate-700 block mb-1">
                                                Llamada a la Acción (CTA)
                                            </label>
                                            <input
                                                type="text"
                                                value={contenidoComun.cta}
                                                onChange={(e) => {
                                                    setContenidoComun({ ...contenidoComun, cta: e.target.value });
                                                    setComunSavedStatus('Cambios sin guardar');
                                                }}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                    </form>
                                </div>

                                {/* BLOQUE B: PERSONALIZACIÓN POR PORTAL */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                                <Globe2 className="w-4 h-4 text-indigo-600" />
                                                Canales de Difusión & Personalizaciones Específicas
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
                                                    className={`bg-white rounded-2xl border p-5 flex flex-col justify-between shadow-xs transition ${
                                                        portal.activo ? 'border-slate-200' : 'border-slate-200 bg-slate-50/70 opacity-80'
                                                    }`}
                                                >
                                                    <div>
                                                        {/* Header card */}
                                                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className={`w-8 h-8 rounded-lg ${portal.badgeColor} text-white font-bold flex items-center justify-center text-xs shadow-xs`}>
                                                                    {portal.logoText}
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-bold text-slate-900 text-xs">
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
                                                                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                                            </label>
                                                        </div>

                                                        {/* Badges & Status */}
                                                        <div className="mt-3 flex items-center justify-between">
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                                                                isCustom
                                                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
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
                                                            <div className="font-bold text-slate-800 line-clamp-1">
                                                                {displayContent.titulo}
                                                            </div>
                                                            <div className="text-slate-500 text-[11px] line-clamp-2">
                                                                {displayContent.descripcion}
                                                            </div>
                                                        </div>

                                                        <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between">
                                                            <span>Candidaturas recibidas:</span>
                                                            <span className="font-bold text-slate-800">{portal.candidaturas} CVs</span>
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
                                                                title="Vista Previa de este Portal"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </button>

                                                            {isCustom && (
                                                                <button
                                                                    onClick={() => setRestoreConfirmModal(portal)}
                                                                    className="text-[11px] text-red-600 hover:text-red-700 hover:underline font-medium"
                                                                >
                                                                    Restaurar Común
                                                                </button>
                                                            )}
                                                        </div>

                                                        <button
                                                            onClick={() => setEditPortalModal(portal)}
                                                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                                                        >
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                            <span>{isCustom ? 'Editar Copy' : 'Personalizar'}</span>
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
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-sm">Contratos de Puesta a Disposición (CPD) & Protocolos PRL</h3>
                                        <p className="text-xs text-slate-500">Documentación vinculante generada con arreglo a la normativa laboral ETT.</p>
                                    </div>
                                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-xs font-medium">
                                        Firma Digital Válida
                                    </span>
                                </div>

                                <div className="space-y-2 text-xs">
                                    <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-50 transition">
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-5 h-5 text-indigo-600" />
                                            <div>
                                                <div className="font-semibold text-slate-900">CPD_Marco_TransLogistica_2026.pdf</div>
                                                <div className="text-slate-400 text-[11px]">Firmado electrónicamente por Carlos Mendiluce (Cliente) y Marta Gómez (ETT)</div>
                                            </div>
                                        </div>
                                        <button className="text-indigo-600 font-semibold hover:underline">Descargar</button>
                                    </div>

                                    <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-50 transition">
                                        <div className="flex items-center gap-3">
                                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                                            <div>
                                                <div className="font-semibold text-slate-900">Ficha_Informacion_Riesgos_PRL_ZAL_Bilbao.pdf</div>
                                                <div className="text-slate-400 text-[11px]">Evaluación de riesgos puesto carretillero y mozo de almacén</div>
                                            </div>
                                        </div>
                                        <button className="text-indigo-600 font-semibold hover:underline">Descargar</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 5: AUDITORÍA Y TRAZABILIDAD */}
                        {activeTab === 'auditoria' && (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
                                <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">Registro de Actividad y Webhooks de Portales</h3>
                                <div className="space-y-3 text-xs">
                                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-slate-800">Sincronización API InfoJobs completada</div>
                                            <div className="text-slate-500 text-[11px]">Oferta ID IJ-893012 publicada con 8 vacantes. 14/02/2026 12:40:15</div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0"></div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-slate-800">Actualización de horario guardada para POS-001</div>
                                            <div className="text-slate-500 text-[11px]">Turno Mañana (06:00 - 14:00, 37.5 h/sem) por Marta Gómez. 14/02/2026 11:30:00</div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-slate-800">Presupuesto PRE-2026-0048 aceptado y convertido en petición</div>
                                            <div className="text-slate-500 text-[11px]">Aceptación confirmada por cliente. Importe 42.850,00 €. 12/02/2026 18:20:00</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* --- MODAL ASIGNAR CANDIDATO A PLAZA VACANTE --- */}
            {assignCandidateModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                                    <UserPlus className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-mono text-emerald-300 font-bold uppercase">
                                        {assignCandidateModal.posId} · Asignar a Plaza #{assignCandidateModal.plaza.numero}
                                    </div>
                                    <h3 className="font-bold text-sm text-white">Búsqueda y Asignación de Candidatos Disponibles</h3>
                                </div>
                            </div>
                            <button onClick={() => setAssignCandidateModal(null)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 border-b border-slate-200 bg-slate-50">
                            <div className="relative">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Buscar candidato por nombre, carnet, experiencia..."
                                    value={candidateSearchFilter}
                                    onChange={(e) => setCandidateSearchFilter(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="p-5 overflow-y-auto space-y-3 flex-1 text-xs">
                            {candidatosPool
                                .filter(c => {
                                    const matchesSearch = !candidateSearchFilter ||
                                        c.nombre.toLowerCase().includes(candidateSearchFilter.toLowerCase()) ||
                                        c.puestoPrincipal.toLowerCase().includes(candidateSearchFilter.toLowerCase()) ||
                                        c.carnets.toLowerCase().includes(candidateSearchFilter.toLowerCase());
                                    return matchesSearch;
                                })
                                .map(candidato => {
                                    const isRecommended = candidato.matchPosicion.includes(assignCandidateModal.posId);
                                    return (
                                        <div key={candidato.id} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                                            <div className="flex items-start gap-3">
                                                <img src={candidato.foto} alt="" className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200 mt-0.5" />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-900 text-sm">{candidato.nombre}</span>
                                                        <span className="font-mono text-[10px] text-slate-400 font-semibold">{candidato.id}</span>
                                                        {isRecommended && (
                                                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px] font-bold">
                                                                Match Recomendado
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-slate-600 text-xs mt-0.5 font-medium">{candidato.puestoPrincipal}</div>
                                                    <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                                                        <span>📍 {candidato.ubicacion}</span>
                                                        <span>🪪 {candidato.carnets}</span>
                                                        <span className="text-emerald-700 font-bold">Afinidad: {candidato.scoring}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                                <button
                                                    onClick={() => setCandidatoFichaModal(candidato)}
                                                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                                                >
                                                    Ver Ficha
                                                </button>
                                                <button
                                                    onClick={() => handleAssignCandidateToPlaza(assignCandidateModal.posId, assignCandidateModal.plaza.id, candidato)}
                                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                    <span>Asignar Plaza</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setAssignCandidateModal(null)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL FICHA CANDIDATO / PERSONA ASIGNADA --- */}
            {candidatoFichaModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
                        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <img src={candidatoFichaModal.foto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-indigo-400" />
                                <div>
                                    <div className="text-[10px] font-mono text-indigo-300 font-bold uppercase">{candidatoFichaModal.id} · Ficha Personal</div>
                                    <h3 className="font-bold text-sm text-white">{candidatoFichaModal.nombre}</h3>
                                </div>
                            </div>
                            <button onClick={() => setCandidatoFichaModal(null)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 text-xs text-slate-700">
                            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-slate-400">DNI / NIE</span>
                                    <div className="font-mono font-semibold text-slate-900">{candidatoFichaModal.dni}</div>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Teléfono</span>
                                    <div className="font-semibold text-slate-900">{candidatoFichaModal.telefono}</div>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Email</span>
                                    <div className="font-semibold text-slate-900 truncate">{candidatoFichaModal.email}</div>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Puntaje Matching</span>
                                    <div className="font-bold text-emerald-600">{candidatoFichaModal.scoring}% afinidad</div>
                                </div>
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400">Puesto & Experiencia</span>
                                <p className="mt-0.5 text-slate-800 font-medium">{candidatoFichaModal.experiencia}</p>
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400">Acreditaciones & Carnets</span>
                                <p className="mt-0.5 text-slate-800 font-medium">{candidatoFichaModal.carnets}</p>
                            </div>
                            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-900">
                                <span className="text-[10px] uppercase font-bold text-indigo-700">Valoración Consultoría ETT</span>
                                <p className="mt-0.5 text-xs">{candidatoFichaModal.valoracionETT}</p>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[11px] font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                {candidatoFichaModal.estadoSeleccion}
                            </span>
                            <button
                                onClick={() => setCandidatoFichaModal(null)}
                                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
                            >
                                Cerrar Ficha
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL 1: COPIAR HORARIO A OTRA POSICIÓN --- */}
            {isCopyModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-2">
                                <Copy className="w-4 h-4 text-indigo-600" />
                                <h3 className="font-bold text-slate-900 text-sm">Copiar Horario a otra Posición</h3>
                            </div>
                            <button onClick={() => setIsCopyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4 text-xs">
                            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                                <div className="text-[10px] uppercase font-bold text-indigo-800">Posición Origen (Copia desde):</div>
                                <div className="font-bold text-slate-900 mt-0.5">{selectedPosId} — {selectedPositionObj.puesto}</div>
                                <div className="text-[11px] text-indigo-600 mt-0.5">Turno: {currentSchedule.turnoNombre} ({totalHorasSemana} h/semana)</div>
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1">
                                    Seleccionar Posición de Destino:
                                </label>
                                <select
                                    value={copyTargetPosId}
                                    onChange={(e) => setCopyTargetPosId(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                >
                                    {posiciones.map(p => (
                                        <option key={p.id} value={p.id} disabled={p.id === selectedPosId}>
                                            {p.id} — {p.puesto} {p.id === selectedPosId ? '(Origen actual)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="text-slate-500 text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-200">
                                <p>
                                    Al confirmar, el cuadrante de <strong>{selectedPosId}</strong> reemplazará por completo el horario de <strong>{copyTargetPosId}</strong>. Esta acción se puede revertir o reconfigurar en cualquier momento.
                                </p>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button
                                onClick={() => setIsCopyModalOpen(false)}
                                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmCopySchedule}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5"
                            >
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copiar Horario</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL 2: EDITAR PERSONALIZACIÓN DE UN PORTAL (SIDE OVER / MODAL GRANDE) --- */}
            {editPortalModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg ${editPortalModal.badgeColor} flex items-center justify-center font-bold text-xs`}>
                                    {editPortalModal.logoText}
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Personalización para {editPortalModal.nombre}</h3>
                                    <p className="text-[11px] text-slate-300">Ajusta el contenido exclusivo que se transmitirá a través de la API</p>
                                </div>
                            </div>
                            <button onClick={() => setEditPortalModal(null)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <EditPortalForm
                            portal={editPortalModal}
                            commonContent={contenidoComun}
                            onSave={handleSaveCustomPortal}
                            onCancel={() => setEditPortalModal(null)}
                        />
                    </div>
                </div>
            )}

            {/* --- MODAL 3: VISTA PREVIA PORTAL / VISTA PREVIA COMÚN --- */}
            {(previewPortalModal || commonPreviewOpen) && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                                    {previewPortalModal ? `Simulación de Oferta: ${previewPortalModal.portal.nombre}` : 'Vista Previa: Contenido Maestro Común'}
                                </span>
                                <h3 className="font-bold text-slate-900 text-base">
                                    {previewPortalModal ? (previewPortalModal.isCustom ? 'Personalización Específica Aplicada' : 'Heredado del Contenido Común') : 'Plantilla Global ETT'}
                                </h3>
                            </div>
                            <button onClick={() => { setPreviewPortalModal(null); setCommonPreviewOpen(false); }} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
                            {(() => {
                                const c = previewPortalModal ? previewPortalModal.content : contenidoComun;
                                return (
                                    <div className="space-y-4">
                                        <div className="border-b border-slate-100 pb-3">
                                            <h2 className="text-lg font-bold text-slate-900">{c.titulo}</h2>
                                            <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 mt-1">
                                                <span className="font-medium bg-slate-100 px-2 py-0.5 rounded">{c.categoria}</span>
                                                <span className="font-medium bg-slate-100 px-2 py-0.5 rounded">{c.ubicacion}</span>
                                                <span className="font-medium bg-slate-100 px-2 py-0.5 rounded">{c.jornada}</span>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider text-slate-400">Descripción</h4>
                                            <p className="mt-1 leading-relaxed text-slate-700">{c.descripcion}</p>
                                        </div>

                                        <div>
                                            <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider text-slate-400">Funciones Principales</h4>
                                            <pre className="mt-1 font-sans whitespace-pre-wrap leading-relaxed text-slate-700">{c.funciones}</pre>
                                        </div>

                                        <div>
                                            <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider text-slate-400">Requisitos</h4>
                                            <pre className="mt-1 font-sans whitespace-pre-wrap leading-relaxed text-slate-700">{c.requisitos}</pre>
                                        </div>

                                        <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-100">
                                            <div className="font-bold text-indigo-950">Condiciones & Salario</div>
                                            <p className="text-indigo-800 text-[11px] mt-0.5">{c.condiciones}</p>
                                        </div>

                                        <div className="text-center pt-2">
                                            <div className="inline-block px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs shadow-xs">
                                                {c.cta || 'Inscribirme en esta Oferta'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => { setPreviewPortalModal(null); setCommonPreviewOpen(false); }}
                                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
                            >
                                Cerrar Vista Previa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL 4: RESTAURAR CONTENIDO COMÚN CONFIRMATION --- */}
            {restoreConfirmModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-xs space-y-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm">¿Restaurar Contenido Común?</h3>
                        <p className="text-slate-500">
                            Se eliminarán las adaptaciones personalizadas de <strong>{restoreConfirmModal.nombre}</strong> y volverá a sincronizarse con el contenido común maestro.
                        </p>
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                onClick={() => setRestoreConfirmModal(null)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleRestoreCommon(restoreConfirmModal)}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
                            >
                                Sí, Restaurar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL 5: MULTI-PORTAL SYNC PROCESS ANIMATED MODAL --- */}
            {isSyncModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
                        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Share2 className="w-4 h-4 text-indigo-400" />
                                <h3 className="font-bold text-sm">Sincronización Multidifusión API</h3>
                            </div>
                            {syncStep === 4 && (
                                <button onClick={() => setIsSyncModalOpen(false)} className="text-slate-400 hover:text-white">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <div className="p-6 space-y-5 text-xs">
                            <div className="space-y-3">
                                {/* Step 1 */}
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
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
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
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
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
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
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
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
                                    <div className="font-bold flex items-center gap-1.5">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        ¡Difusión Sincronizada con Éxito!
                                    </div>
                                    <p className="text-[11px] text-emerald-700">
                                        Las ofertas están activas y recibiendo candidaturas en InfoJobs, LinkedIn, Indeed y el Portal de Empleo ETT.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
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
                        </div>
                    </div>
                </div>
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
                        <label className="font-bold text-slate-700">Título de Publicación</label>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            isFieldCustom('titulo') ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                            {isFieldCustom('titulo') ? 'Personalizado para este portal' : 'Heredado del contenido común'}
                        </span>
                    </div>
                    <input
                        type="text"
                        value={formData.titulo}
                        onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700">Descripción Específica</label>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            isFieldCustom('descripcion') ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                            {isFieldCustom('descripcion') ? 'Personalizado' : 'Heredado'}
                        </span>
                    </div>
                    <textarea
                        rows={2}
                        value={formData.descripcion}
                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="font-bold text-slate-700">Funciones</label>
                            <span className="text-[10px] text-slate-400">{isFieldCustom('funciones') ? 'Personalizado' : 'Heredado'}</span>
                        </div>
                        <textarea
                            rows={4}
                            value={formData.funciones}
                            onChange={(e) => setFormData({ ...formData, funciones: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                        />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="font-bold text-slate-700">Requisitos</label>
                            <span className="text-[10px] text-slate-400">{isFieldCustom('requisitos') ? 'Personalizado' : 'Heredado'}</span>
                        </div>
                        <textarea
                            rows={4}
                            value={formData.requisitos}
                            onChange={(e) => setFormData({ ...formData, requisitos: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="font-bold text-slate-700 block mb-1">Ubicación Visible</label>
                        <input
                            type="text"
                            value={formData.ubicacion}
                            onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="font-bold text-slate-700 block mb-1">Llamada a la Acción (CTA)</label>
                        <input
                            type="text"
                            value={formData.cta}
                            onChange={(e) => setFormData({ ...formData, cta: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                        className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold"
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
