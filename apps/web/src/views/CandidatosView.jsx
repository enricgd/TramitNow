// Partió de design/candidatos.html (scripts/import-design.py). Ahora se edita aquí directamente: no regenerar.
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    Users, UserPlus, UserCheck, Briefcase, FileText, CheckCircle2, AlertTriangle, 
    XCircle, Search, Filter, Phone, Mail, MessageSquare, Send, Calendar, Clock, 
    MapPin, Shield, ShieldAlert, Award, FileUp, Download, Eye, Edit3, Trash2, 
    ChevronRight, ChevronDown, Check, X, ArrowRight, Layers, Sparkles, Building2, 
    Building, HelpCircle, AlertCircle, RefreshCw, MoreVertical, Plus, ExternalLink, 
    PhoneCall, Smartphone, CheckSquare, Square, CornerDownRight, FileBadge, Info,
    Copy, Star, Hash, FileCheck2, UserX, AlertOctagon, Share2, ArrowUpRight,
    Grid, List, SlidersHorizontal, ArrowLeft, BookmarkCheck, UploadCloud, ChevronLeft
} from 'lucide-react';
import { Page, PageHeader, Card, KpiTile, EmptyState, Button, IconButton, Badge, Avatar, SearchInput, Select, Segmented, Tabs, Drawer, Modal } from '../ui';

// ==========================================
// DEMO INITIAL DATA & CONFIGURATION
// ==========================================
const INITIAL_PETITIONS = [
    {
        id: 'PET-2026-0048',
        client: 'Trans-Logística Ibérica Norte S.L.',
        cif: 'B-98441209',
        workplace: 'Centro Logístico Coslada - Nave 4 (Madrid)',
        status: 'Abierta / En asignación',
        startDate: '2026-03-01',
        positions: [
            {
                id: 'POS-01',
                title: 'Operario/a de almacén y preparación pedidos',
                category: 'Logística',
                turn: 'Turno Mañana (06:00 - 14:00)',
                rate: '14,80 €/h',
                requiredExperience: '6 meses en picking con radiofrecuencia',
                mandatoryRequirements: ['Carnet de carretillero en vigor (UNE 58451)', 'DNI/NIE en vigor', 'Disponibilidad inmediata'],
                plazasTotal: 4,
                plazas: [
                    { plazaNum: 1, status: 'Cubierta', candidateName: 'Marta Rivas Valero', candidateId: 'CAN-0102', assignedDate: '2026-02-18' },
                    { plazaNum: 2, status: 'Vacante', candidateName: null, candidateId: null },
                    { plazaNum: 3, status: 'Vacante', candidateName: null, candidateId: null },
                    { plazaNum: 4, status: 'En selección', candidateName: 'David Castillo Ruiz', candidateId: 'CAN-0105', assignedDate: null }
                ]
            },
            {
                id: 'POS-02',
                title: 'Reponedor/a nocturno / Carga y descarga',
                category: 'Logística y Distribución',
                turn: 'Turno Noche (22:00 - 06:00)',
                rate: '16,40 €/h',
                requiredExperience: 'Valorable experiencia en cámaras de frío',
                mandatoryRequirements: ['DNI/NIE en vigor', 'Carnet de conducir B', 'Vehículo propio'],
                plazasTotal: 3,
                plazas: [
                    { plazaNum: 1, status: 'Cubierta', candidateName: 'Javier Navarro Gil', candidateId: 'CAN-0108', assignedDate: '2026-02-15' },
                    { plazaNum: 2, status: 'Vacante', candidateName: null, candidateId: null },
                    { plazaNum: 3, status: 'Vacante', candidateName: null, candidateId: null }
                ]
            }
        ]
    },
    {
        id: 'PET-2026-0051',
        client: 'FrigoDistribución Alimentaria S.A.',
        cif: 'A-28994312',
        workplace: 'Plataforma Frío Mercamadrid (Madrid)',
        status: 'Abierta',
        startDate: '2026-03-10',
        positions: [
            {
                id: 'POS-03',
                title: 'Carretillero/a retráctil frigorífico (-20ºC)',
                category: 'Carretillero / Mozo especializado',
                turn: 'Turno Rotativo M/T/N',
                rate: '17,20 €/h',
                requiredExperience: '2 años con retráctil en altura >10m',
                mandatoryRequirements: ['Carnet de carretillero en vigor (UNE 58451)', 'Apto médico trabajos en frío'],
                plazasTotal: 2,
                plazas: [
                    { plazaNum: 1, status: 'Vacante', candidateName: null, candidateId: null },
                    { plazaNum: 2, status: 'Vacante', candidateName: null, candidateId: null }
                ]
            }
        ]
    }
];

const INITIAL_CANDIDATES = [
    {
        id: 'CAN-0101',
        name: 'Carlos',
        lastName: 'Gómez Moreno',
        dni: '53982145X',
        dniExpiry: '2028-11-14',
        dniStatus: 'OK', // OK, Caducado, Falta
        phone: '+34 611 234 567',
        email: 'carlos.gomez@email.es',
        city: 'Alcalá de Henares',
        province: 'Madrid',
        distance: '14 km de Coslada',
        nss: '28/12345678/90',
        nssStatus: 'OK',
        rgpdStatus: 'Vigente', // Vigente, Proximo, Caducado, Sin consentimiento
        rgpdSignedDate: '2025-09-12',
        source: 'InfoJobs',
        sourceId: 'INF-99824',
        lastContactDate: '2026-02-22',
        lastContactBy: 'Ana Gómez',
        lastContactType: 'Llamada telefónica',
        status: 'Disponible', // Nuevo, Pendiente de contactar, Contactado, En entrevista, Disponible, No disponible, Asignado/En misión, Descartado
        category: 'Operario de almacén / Mozo',
        experienceYears: 4,
        drivingLicenses: ['B', 'Carnet Carretillero UNE 58451'],
        hasCar: true,
        preferredShift: 'Indiferente (Mañana/Tarde/Noche)',
        skills: ['Picking con PDA', 'Radiofrecuencia', 'Carretilla frontal', 'Transpaleta eléctrica'],
        languages: ['Español (Nativo)'],
        activeCandidatures: [],
        assignedMission: null,
        documents: [
            { name: 'DNI_Anverso_Reverso.pdf', type: 'DNI', status: 'Verificado', uploadDate: '2025-09-12' },
            { name: 'Certificado_Carretillero_UNE.pdf', type: 'Certificado', status: 'Verificado', uploadDate: '2025-10-04' },
            { name: 'Consentimiento_RGPD_Firmado.pdf', type: 'RGPD', status: 'Vigente', uploadDate: '2025-09-12' },
            { name: 'CV_Carlos_Gomez_2026.pdf', type: 'CV', status: 'Actualizado', uploadDate: '2026-01-15' }
        ],
        communications: [
            { date: '2026-02-22 11:30', user: 'Ana Gómez', channel: 'Llamada', result: 'Interesado y disponible', note: 'Disponible para incorporación inmediata en turno de mañana o noche.', nextAction: 'Presentar a PET-2026-0048' },
            { date: '2026-01-15 09:40', user: 'Carlos M. (ETT)', channel: 'WhatsApp', result: 'Actualización CV', note: 'Envía carnet renovado de carretillero.' }
        ]
    },
    {
        id: 'CAN-0102',
        name: 'Marta',
        lastName: 'Rivas Valero',
        dni: '48201934P',
        dniExpiry: '2027-04-19',
        dniStatus: 'OK',
        phone: '+34 670 981 234',
        email: 'marta.rivas@talent.org',
        city: 'Coslada',
        province: 'Madrid',
        distance: '2 km de Coslada',
        nss: '28/99887766/12',
        nssStatus: 'OK',
        rgpdStatus: 'Vigente',
        rgpdSignedDate: '2025-06-20',
        source: 'LinkedIn',
        sourceId: 'IN-448190',
        lastContactDate: '2026-02-18',
        lastContactBy: 'Ana Gómez',
        lastContactType: 'Email asignación',
        status: 'Asignado/En misión',
        category: 'Operario/a de almacén',
        experienceYears: 3,
        drivingLicenses: ['B', 'Carnet Carretillero UNE 58451'],
        hasCar: true,
        preferredShift: 'Turno Mañana',
        skills: ['Picking voz', 'Control de stock', 'Ubicaciones altas'],
        languages: ['Español (Nativo)', 'Inglés (B1)'],
        activeCandidatures: ['PET-2026-0048 (Asignada Plaza 1)'],
        assignedMission: {
            petitionId: 'PET-2026-0048',
            client: 'Trans-Logística Ibérica Norte S.L.',
            positionId: 'POS-01',
            positionTitle: 'Operario/a de almacén',
            plazaNum: 1,
            startDate: '2026-03-01'
        },
        documents: [
            { name: 'DNI_Marta_Rivas.pdf', type: 'DNI', status: 'Verificado', uploadDate: '2025-06-20' },
            { name: 'Afiliacion_SS_Marta.pdf', type: 'NSS', status: 'Verificado', uploadDate: '2025-06-20' },
            { name: 'RGPD_Firmado_Digital.pdf', type: 'RGPD', status: 'Vigente', uploadDate: '2025-06-20' }
        ],
        communications: [
            { date: '2026-02-18 16:15', user: 'Ana Gómez', channel: 'Email', result: 'Asignación confirmada', note: 'Enviada documentación de bienvenida y EPIs para inicio 01/03.' }
        ]
    },
    {
        id: 'CAN-0103',
        name: 'Mohamed',
        lastName: 'El Amrani',
        dni: 'X8923412K',
        dniExpiry: '2026-01-10', // Caducado Demo
        dniStatus: 'Caducado',
        phone: '+34 633 445 566',
        email: 'mohamed.elamrani@mail.com',
        city: 'Torrejón de Ardoz',
        province: 'Madrid',
        distance: '9 km de Coslada',
        nss: '28/44332211/09',
        nssStatus: 'OK',
        rgpdStatus: 'Próximo a caducar',
        rgpdSignedDate: '2024-03-15',
        source: 'Portal Web ETT',
        sourceId: 'WEB-1082',
        lastContactDate: '2026-02-10',
        lastContactBy: 'Lucía Santos',
        lastContactType: 'SMS Recordatorio',
        status: 'Pendiente de contactar',
        category: 'Carretillero retráctil / Mozo',
        experienceYears: 5,
        drivingLicenses: ['B', 'Carnet Carretillero UNE 58451'],
        hasCar: true,
        preferredShift: 'Turno Tarde / Noche',
        skills: ['Carretilla retráctil 12m', 'Carga contenedores', 'SGA SAP'],
        languages: ['Español (Fluido)', 'Árabe (Nativo)', 'Francés (Medio)'],
        activeCandidatures: [],
        assignedMission: null,
        documents: [
            { name: 'NIE_Amrani_Caducado.pdf', type: 'DNI/NIE', status: 'Caducado', uploadDate: '2024-03-15' },
            { name: 'Carnet_Retractil_UNE.pdf', type: 'Certificado', status: 'Verificado', uploadDate: '2025-02-10' }
        ],
        communications: [
            { date: '2026-02-10 10:15', user: 'Lucía Santos', channel: 'SMS', result: 'Solicitud renovación NIE', note: 'Enviado SMS automático para aportar resguardo renovación de tarjeta.' }
        ]
    },
    {
        id: 'CAN-0104',
        name: 'Elena',
        lastName: 'Sánchez Pascual',
        dni: '02891277W',
        dniExpiry: '2029-08-30',
        dniStatus: 'OK',
        phone: '+34 689 112 233',
        email: 'elena.sanchez.p@fastmail.com',
        city: 'San Fernando de Henares',
        province: 'Madrid',
        distance: '4 km de Coslada',
        nss: 'FALTA',
        nssStatus: 'Falta',
        rgpdStatus: 'Vigente',
        rgpdSignedDate: '2026-01-10',
        source: 'Monster',
        sourceId: 'MON-33419',
        lastContactDate: '2026-02-23',
        lastContactBy: 'Ana Gómez',
        lastContactType: 'WhatsApp',
        status: 'En entrevista',
        category: 'Reponedora / Moza de almacén',
        experienceYears: 2,
        drivingLicenses: ['B'],
        hasCar: false,
        preferredShift: 'Turno Mañana o Tarde',
        skills: ['Reposición lineal', 'Inventarios', 'Etiquetado', 'Trato al cliente'],
        languages: ['Español (Nativo)'],
        activeCandidatures: ['PET-2026-0048 (Entrevista POS-02)'],
        assignedMission: null,
        documents: [
            { name: 'DNI_Elena_Sanchez.pdf', type: 'DNI', status: 'Verificado', uploadDate: '2026-01-10' },
            { name: 'RGPD_Firmado.pdf', type: 'RGPD', status: 'Vigente', uploadDate: '2026-01-10' }
        ],
        communications: [
            { date: '2026-02-23 12:00', user: 'Ana Gómez', channel: 'WhatsApp', result: 'Citada para entrevista', note: 'Entrevista telefónica técnica completada favorablemente. Pendiente aportar NSS.' }
        ]
    },
    {
        id: 'CAN-0105',
        name: 'David',
        lastName: 'Castillo Ruiz',
        dni: '50449912K',
        dniExpiry: '2030-01-14',
        dniStatus: 'OK',
        phone: '+34 654 321 987',
        email: 'david.castillo.log@outlook.com',
        city: 'Madrid (Vicálvaro)',
        province: 'Madrid',
        distance: '8 km de Coslada',
        nss: '28/77665544/88',
        nssStatus: 'OK',
        rgpdStatus: 'Vigente',
        rgpdSignedDate: '2025-11-20',
        source: 'InfoJobs',
        sourceId: 'INF-88123',
        lastContactDate: '2026-02-20',
        lastContactBy: 'Ana Gómez',
        lastContactType: 'Llamada',
        status: 'En entrevista',
        category: 'Operario de almacén y logística',
        experienceYears: 3,
        drivingLicenses: ['B', 'Carnet Carretillero UNE 58451'],
        hasCar: true,
        preferredShift: 'Turno Mañana',
        skills: ['Picking radiofrecuencia', 'Preparación pedidos', 'Paletizado'],
        languages: ['Español (Nativo)'],
        activeCandidatures: ['PET-2026-0048 (Preseleccionado Plaza 4)'],
        assignedMission: null,
        documents: [
            { name: 'DNI_David_Castillo.pdf', type: 'DNI', status: 'Verificado', uploadDate: '2025-11-20' },
            { name: 'Certificado_Carretillas.pdf', type: 'Certificado', status: 'Verificado', uploadDate: '2025-11-20' },
            { name: 'RGPD_ETT_Global.pdf', type: 'RGPD', status: 'Vigente', uploadDate: '2025-11-20' }
        ],
        communications: [
            { date: '2026-02-20 15:40', user: 'Ana Gómez', channel: 'Llamada', result: 'Validada disponibilidad', note: 'Disponible para plaza 4 de PET-2026-0048.' }
        ]
    },
    {
        id: 'CAN-0106',
        name: 'Laura',
        lastName: 'Méndez Herrero',
        dni: '09128374L',
        dniExpiry: '2028-05-11',
        dniStatus: 'OK',
        phone: '+34 612 889 900',
        email: 'laura.mendez.h@gmail.com',
        city: 'Guadalajara',
        province: 'Guadalajara',
        distance: '38 km de Coslada',
        nss: '19/11223344/55',
        nssStatus: 'OK',
        rgpdStatus: 'Caducado', // Demo RGPD Caducado
        rgpdSignedDate: '2023-11-01',
        source: 'Alta Manual',
        sourceId: 'MAN-901',
        lastContactDate: '2026-01-08',
        lastContactBy: 'Javier Pons',
        lastContactType: 'Email',
        status: 'Disponible',
        category: 'Carretillera retráctil y frontal',
        experienceYears: 6,
        drivingLicenses: ['B', 'Carnet Carretillero UNE 58451'],
        hasCar: true,
        preferredShift: 'Turno Mañana o Tarde',
        skills: ['Trilateral', 'Retráctil 14m', 'Gestión de stocks', 'PRL Nivel Básico'],
        languages: ['Español (Nativo)'],
        activeCandidatures: [],
        assignedMission: null,
        documents: [
            { name: 'DNI_Laura_Mendez.pdf', type: 'DNI', status: 'Verificado', uploadDate: '2023-11-01' },
            { name: 'RGPD_Caducado.pdf', type: 'RGPD', status: 'Caducado', uploadDate: '2023-11-01' }
        ],
        communications: [
            { date: '2026-01-08 17:00', user: 'Javier Pons', channel: 'Email', result: 'Sondeo de interés', note: 'Indica que busca turnos fijos.' }
        ]
    },
    {
        id: 'CAN-0107',
        name: 'Andrés',
        lastName: 'Vidal Colomer',
        dni: '47182930Q',
        dniExpiry: '2027-10-22',
        dniStatus: 'OK',
        phone: '+34 644 123 789',
        email: 'andres.vidal@empresa.com',
        city: 'Alcalá de Henares',
        province: 'Madrid',
        distance: '16 km de Coslada',
        nss: '28/65432109/88',
        nssStatus: 'OK',
        rgpdStatus: 'Vigente',
        rgpdSignedDate: '2026-02-01',
        source: 'LinkedIn',
        sourceId: 'IN-778219',
        lastContactDate: '2026-02-24',
        lastContactBy: 'Ana Gómez',
        lastContactType: 'Email',
        status: 'Nuevo',
        category: 'Reponedor / Mozo de carga y descarga',
        experienceYears: 1,
        drivingLicenses: ['B'],
        hasCar: true,
        preferredShift: 'Turno Noche',
        skills: ['Carga nocturna', 'Uso transpaleta manual', 'Clasificación paquetería'],
        languages: ['Español (Nativo)'],
        activeCandidatures: [],
        assignedMission: null,
        documents: [
            { name: 'DNI_Andres_Vidal.pdf', type: 'DNI', status: 'Verificado', uploadDate: '2026-02-01' },
            { name: 'RGPD_Andres.pdf', type: 'RGPD', status: 'Vigente', uploadDate: '2026-02-01' }
        ],
        communications: [
            { date: '2026-02-24 09:15', user: 'Ana Gómez', channel: 'Email', result: 'Envío cuestionario', note: 'Perfil recibido hoy desde LinkedIn. Buen encaje para turno nocturno.' }
        ]
    },
    {
        id: 'CAN-0108',
        name: 'Javier',
        lastName: 'Navarro Gil',
        dni: '51928374M',
        dniExpiry: '2028-09-09',
        dniStatus: 'OK',
        phone: '+34 622 901 823',
        email: 'javier.navarro@live.com',
        city: 'Madrid (Barajas)',
        province: 'Madrid',
        distance: '6 km de Coslada',
        nss: '28/90123456/77',
        nssStatus: 'OK',
        rgpdStatus: 'Vigente',
        rgpdSignedDate: '2025-08-14',
        source: 'Portal Web ETT',
        sourceId: 'WEB-9921',
        lastContactDate: '2026-02-15',
        lastContactBy: 'Ana Gómez',
        lastContactType: 'Llamada asignación',
        status: 'Asignado/En misión',
        category: 'Reponedor nocturno / Carretillero',
        experienceYears: 4,
        drivingLicenses: ['B', 'Carnet Carretillero UNE 58451'],
        hasCar: true,
        preferredShift: 'Turno Noche',
        skills: ['Carga/descarga', 'Manejo apiladores', 'Trabajo en equipo'],
        languages: ['Español (Nativo)'],
        activeCandidatures: ['PET-2026-0048 (Asignado POS-02 Plaza 1)'],
        assignedMission: {
            petitionId: 'PET-2026-0048',
            client: 'Trans-Logística Ibérica Norte S.L.',
            positionId: 'POS-02',
            positionTitle: 'Reponedor/a nocturno',
            plazaNum: 1,
            startDate: '2026-03-01'
        },
        documents: [
            { name: 'DNI_Javier_Navarro.pdf', type: 'DNI', status: 'Verificado', uploadDate: '2025-08-14' },
            { name: 'SS_Javier.pdf', type: 'NSS', status: 'Verificado', uploadDate: '2025-08-14' }
        ],
        communications: [
            { date: '2026-02-15 11:20', user: 'Ana Gómez', channel: 'Llamada', result: 'Asignado a misión', note: 'Acepta horario nocturno en Coslada.' }
        ]
    }
];

// Estado del candidato -> texto y color. Mismos colores que el resto de la app (ver src/ui/Badge.tsx).
const ESTADO_CANDIDATO = {
    'Disponible': { tone: 'success', label: 'Disponible' },
    'Asignado/En misión': { tone: 'info', label: 'En misión' },
    'En entrevista': { tone: 'accent', label: 'En selección' },
    'Nuevo': { tone: 'neutral', label: 'Nuevo' },
    'Pendiente de contactar': { tone: 'warning', label: 'Por contactar' },
    'Contactado': { tone: 'neutral', label: 'Contactado' },
    'No disponible': { tone: 'neutral', label: 'No disponible' },
    'Descartado': { tone: 'danger', label: 'Descartado' },
};

const RGPD = {
    'Vigente': { tone: 'success', label: 'Vigente', icon: Shield },
    'Próximo a caducar': { tone: 'warning', label: 'Caduca pronto', icon: Clock },
    'Caducado': { tone: 'danger', label: 'Caducado', icon: ShieldAlert },
    'Sin consentimiento': { tone: 'warning', label: 'Sin firma', icon: AlertCircle },
};

// ==========================================
// MAIN APPLICATION COMPONENT
// ==========================================
export default function CandidatosView() {
    // State
    const [candidates, setCandidates] = useState(INITIAL_CANDIDATES);
    const [petitions, setPetitions] = useState(INITIAL_PETITIONS);
    
    // View mode
    const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
    
    // Selection & Search
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [sourceFilter, setSourceFilter] = useState('ALL');
    const [docFilter, setDocFilter] = useState('ALL'); // 'ALL' | 'DOC_OK' | 'DOC_ALERT' | 'RGPD_ALERT'
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [savedPreset, setSavedPreset] = useState('ALL'); // 'ALL', 'AVAILABLE_NOW', 'DOC_PENDING', 'ASSIGNED'

    // Modals & Drawers
    const [selectedCandidateForDetail, setSelectedCandidateForDetail] = useState(null);
    const [detailTab, setDetailTab] = useState('resumen'); // 'resumen', 'personal', 'profesional', 'disponibilidad', 'documentos', 'candidaturas', 'historial'
    
    // Contact Modal
    const [contactModalCandidate, setContactModalCandidate] = useState(null);
    const [contactChannel, setContactChannel] = useState('Llamada');
    const [contactTemplate, setContactTemplate] = useState('libre');
    const [contactMessage, setContactMessage] = useState('');
    const [contactResult, setContactResult] = useState('Contactado con éxito');
    const [contactNote, setContactNote] = useState('');

    // Wizard: Assign Candidate to Petition
    const [wizardState, setWizardState] = useState({
        isOpen: false,
        candidate: null,
        candidatesBatch: [], // For bulk assignment
        step: 1, // 1: Select Petition, 2: Select Position, 3: Select Plaza, 4: Validate & Compatibility, 5: Confirmation
        selectedPetitionId: 'PET-2026-0048',
        selectedPositionId: 'POS-01',
        selectedPlazaNum: 2,
        assignmentMode: 'plaza', // 'plaza' (direct assignment) | 'candidature' (iniciar candidatura/terna)
        blockersFound: [],
        warningsFound: [],
        overrideReason: ''
    });

    // Quick Create & Full Create Modals
    const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
    const [isImportPortalOpen, setIsImportPortalOpen] = useState(false);
    const [isBulkActionModalOpen, setIsBulkActionModalOpen] = useState(false);
    const [bulkActionType, setBulkActionType] = useState('assign'); // 'assign' | 'contact' | 'status' | 'docRequest'

    // Toasts & feedback
    const [toast, setToast] = useState(null);

    // Esc cierra cualquier ventana abierta, como en el resto de la app.
    useEffect(() => {
        const onKey = (e) => {
            if (e.key !== 'Escape') return;
            setContactModalCandidate(null);
            setIsQuickCreateOpen(false);
            setIsImportPortalOpen(false);
            setIsBulkActionModalOpen(false);
            setWizardState(prev => ({ ...prev, isOpen: false }));
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, []);

    const showToast = (title, message, type = 'success') => {
        setToast({ title, message, type });
        setTimeout(() => setToast(null), 4500);
    };

    // Calculate filtered candidates
    const filteredCandidates = useMemo(() => {
        return candidates.filter(can => {
            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = `${can.name} ${can.lastName}`.toLowerCase().includes(q);
                const matchDni = can.dni.toLowerCase().includes(q);
                const matchPhone = can.phone.toLowerCase().includes(q);
                const matchEmail = can.email.toLowerCase().includes(q);
                const matchCity = can.city.toLowerCase().includes(q);
                const matchCategory = can.category.toLowerCase().includes(q);
                const matchSkills = can.skills.some(s => s.toLowerCase().includes(q));
                if (!matchName && !matchDni && !matchPhone && !matchEmail && !matchCity && !matchCategory && !matchSkills) {
                    return false;
                }
            }

            // Preset filters
            if (savedPreset === 'AVAILABLE_NOW' && can.status !== 'Disponible') return false;
            if (savedPreset === 'DOC_PENDING' && (can.dniStatus === 'OK' && can.rgpdStatus === 'Vigente' && can.nssStatus === 'OK')) return false;
            if (savedPreset === 'ASSIGNED' && can.status !== 'Asignado/En misión') return false;

            // Status
            if (statusFilter !== 'ALL' && can.status !== statusFilter) return false;
            
            // Source
            if (sourceFilter !== 'ALL' && can.source !== sourceFilter) return false;

            // Doc Filter
            if (docFilter === 'DOC_OK' && (can.dniStatus !== 'OK' || can.rgpdStatus !== 'Vigente' || can.nssStatus !== 'OK')) return false;
            if (docFilter === 'DOC_ALERT' && (can.dniStatus === 'OK' && can.nssStatus === 'OK')) return false;
            if (docFilter === 'RGPD_ALERT' && (can.rgpdStatus === 'Vigente')) return false;

            // Category
            if (categoryFilter !== 'ALL' && !can.category.toLowerCase().includes(categoryFilter.toLowerCase())) return false;

            return true;
        });
    }, [candidates, searchQuery, statusFilter, sourceFilter, docFilter, categoryFilter, savedPreset]);

    // Handlers
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(filteredCandidates.map(c => c.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleToggleSelect = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // Start Assign Wizard for a single candidate
    const startAssignWizard = (candidate) => {
        // Pre-check blockers for default position (POS-01 on PET-2026-0048)
        const pet = petitions.find(p => p.id === 'PET-2026-0048');
        const pos = pet?.positions[0];
        
        const blockers = [];
        const warnings = [];

        if (candidate.dniStatus === 'Caducado') {
            blockers.push(`Documento de identidad CADUCADO (${candidate.dni}). Requiere renovación para tramitar alta en SS.`);
        }
        if (candidate.rgpdStatus === 'Caducado' || candidate.rgpdStatus === 'Sin consentimiento') {
            blockers.push(`Consentimiento RGPD no vigente (${candidate.rgpdStatus}). Se requiere firma previa a la cesión a cliente.`);
        }
        if (candidate.status === 'Asignado/En misión') {
            warnings.push(`El candidato ya tiene una misión activa asignada (${candidate.assignedMission?.petitionId || 'PET'}).`);
        }
        if (pos?.mandatoryRequirements?.includes('Carnet de carretillero en vigor (UNE 58451)') && !candidate.drivingLicenses.some(l => l.includes('Carretillero'))) {
            blockers.push('No dispone de Carnet de Carretillero UNE 58451 requerido por esta posición.');
        }

        setWizardState({
            isOpen: true,
            candidate: candidate,
            candidatesBatch: [candidate],
            step: 1,
            selectedPetitionId: 'PET-2026-0048',
            selectedPositionId: 'POS-01',
            selectedPlazaNum: 2, // Default to first vacant
            assignmentMode: 'plaza',
            blockersFound: blockers,
            warningsFound: warnings,
            overrideReason: ''
        });
    };

    // Recalculate wizard compatibility whenever step or position changes
    const runWizardCompatibilityCheck = (petId, posId, candidate) => {
        if (!candidate) return { blockers: [], warnings: [] };
        const pet = petitions.find(p => p.id === petId);
        const pos = pet?.positions.find(p => p.id === posId);
        const blockers = [];
        const warnings = [];

        if (candidate.dniStatus === 'Caducado') {
            blockers.push(`Documento de identidad CADUCADO (${candidate.dni}). Impide tramitar alta en Seguridad Social.`);
        }
        if (candidate.dniStatus === 'Falta') {
            blockers.push('Falta aportar documento de identidad oficial.');
        }
        if (candidate.rgpdStatus === 'Caducado' || candidate.rgpdStatus === 'Sin consentimiento') {
            blockers.push(`Consentimiento RGPD ${candidate.rgpdStatus.toUpperCase()}. Requiere firma antes de presentar al cliente.`);
        }
        if (candidate.rgpdStatus === 'Próximo a caducar') {
            warnings.push('El consentimiento RGPD caduca en los próximos 30 días. Se recomienda solicitar refirma.');
        }
        if (candidate.nssStatus === 'Falta') {
            warnings.push('Número de la Seguridad Social no registrado aún. Deberá aportarse antes del inicio de contrato.');
        }
        if (candidate.status === 'Asignado/En misión') {
            warnings.push(`Candidato con misión activa (${candidate.assignedMission?.petitionId || 'Actual'}). Verificar compatibilidad de fechas.`);
        }
        
        // Specific position requirements check
        if (pos) {
            if (pos.mandatoryRequirements?.some(r => r.includes('Carretillero')) && !candidate.drivingLicenses.some(l => l.toLowerCase().includes('carretillero'))) {
                blockers.push('Requisito excluyente no cumplido: Requiere Carnet de Carretillero UNE 58451.');
            }
            if (pos.mandatoryRequirements?.some(r => r.includes('conducir B')) && !candidate.drivingLicenses.includes('B')) {
                blockers.push('Requisito excluyente no cumplido: Requiere Carnet de conducir B.');
            }
            if (pos.turn?.toLowerCase().includes('noche') && candidate.preferredShift?.toLowerCase().includes('mañana') && !candidate.preferredShift.toLowerCase().includes('indiferente')) {
                warnings.push(`Preferencia horaria: El candidato indicó preferencia por "${candidate.preferredShift}", y la vacante es "${pos.turn}".`);
            }
        }

        return { blockers, warnings };
    };

    // Apply assignment in Wizard
    const confirmAssignmentWizard = () => {
        const { candidate, selectedPetitionId, selectedPositionId, selectedPlazaNum, assignmentMode } = wizardState;
        if (!candidate) return;

        const pet = petitions.find(p => p.id === selectedPetitionId);
        const pos = pet?.positions.find(p => p.id === selectedPositionId);

        // Update petition plaza
        const updatedPetitions = petitions.map(p => {
            if (p.id !== selectedPetitionId) return p;
            return {
                ...p,
                positions: p.positions.map(position => {
                    if (position.id !== selectedPositionId) return position;
                    return {
                        ...position,
                        plazas: position.plazas.map(plz => {
                            if (plz.plazaNum === Number(selectedPlazaNum)) {
                                return {
                                    ...plz,
                                    status: assignmentMode === 'plaza' ? 'Cubierta' : 'En selección',
                                    candidateName: `${candidate.name} ${candidate.lastName}`,
                                    candidateId: candidate.id,
                                    assignedDate: new Date().toISOString().split('T')[0]
                                };
                            }
                            return plz;
                        })
                    };
                })
            };
        });
        setPetitions(updatedPetitions);

        // Update Candidate
        const updatedCandidates = candidates.map(c => {
            if (c.id !== candidate.id) return c;
            
            const newStatus = assignmentMode === 'plaza' ? 'Asignado/En misión' : 'En entrevista';
            const newCandidatureStr = `${selectedPetitionId} (${pos?.title || 'Posición'} · Plaza ${selectedPlazaNum})`;
            
            const newLog = {
                date: new Date().toISOString().replace('T', ' ').substring(0, 16),
                user: 'Ana Gómez',
                channel: 'ERP Sistema',
                result: assignmentMode === 'plaza' ? 'Asignado a Plaza' : 'Candidatura iniciada',
                note: `Asignado a ${selectedPetitionId} (${pet?.client}) · ${pos?.title} · Plaza ${selectedPlazaNum}. ${wizardState.overrideReason ? 'Observaciones: ' + wizardState.overrideReason : ''}`
            };

            return {
                ...c,
                status: newStatus,
                activeCandidatures: [...(c.activeCandidatures.filter(x => !x.includes(selectedPetitionId))), newCandidatureStr],
                assignedMission: assignmentMode === 'plaza' ? {
                    petitionId: selectedPetitionId,
                    client: pet?.client || 'Cliente',
                    positionId: selectedPositionId,
                    positionTitle: pos?.title || 'Posición',
                    plazaNum: Number(selectedPlazaNum),
                    startDate: pet?.startDate || '2026-03-01'
                } : c.assignedMission,
                communications: [newLog, ...c.communications]
            };
        });

        setCandidates(updatedCandidates);
        setWizardState(prev => ({ ...prev, isOpen: false }));
        
        showToast(
            'Asignación completada con éxito',
            `Candidato ${candidate.name} ${candidate.lastName} asignado a ${selectedPetitionId} · ${pos?.title} (Plaza ${selectedPlazaNum}).`,
            'success'
        );
    };

    // Contact Handler
    const openContactModal = (candidate) => {
        setContactModalCandidate(candidate);
        setContactChannel('Llamada');
        setContactTemplate('libre');
        setContactMessage(`Hola ${candidate.name}, te contactamos desde ETT Global en relación a nuevas vacantes en el sector logístico...`);
        setContactResult('Interesado y disponible');
        setContactNote('');
    };

    const submitContactAction = () => {
        if (!contactModalCandidate) return;

        const newLog = {
            date: new Date().toISOString().replace('T', ' ').substring(0, 16),
            user: 'Ana Gómez (Consultora)',
            channel: contactChannel,
            result: contactResult,
            note: `${contactNote ? contactNote + ' — ' : ''}${contactMessage.substring(0, 100)}...`
        };

        const updatedCandidates = candidates.map(c => {
            if (c.id !== contactModalCandidate.id) return c;
            return {
                ...c,
                lastContactDate: new Date().toISOString().split('T')[0],
                lastContactBy: 'Ana Gómez',
                lastContactType: contactChannel,
                status: c.status === 'Nuevo' || c.status === 'Pendiente de contactar' ? 'Contactado' : c.status,
                communications: [newLog, ...c.communications]
            };
        });

        setCandidates(updatedCandidates);
        showToast('Contacto registrado', `Actividad de ${contactChannel} guardada en el historial de ${contactModalCandidate.name}.`, 'info');
        setContactModalCandidate(null);
    };

    // Quick Create submit
    const handleQuickCreateSubmit = (e) => {
        e.preventDefault();
        const form = e.target;
        const newCan = {
            id: `CAN-0${candidates.length + 101}`,
            name: form.name.value,
            lastName: form.lastName.value,
            dni: form.dni.value,
            dniExpiry: form.dniExpiry.value || '2028-12-31',
            dniStatus: form.dni.value ? 'OK' : 'Falta',
            phone: form.phone.value,
            email: form.email.value,
            city: form.city.value || 'Madrid',
            province: form.province.value || 'Madrid',
            distance: 'A calcular',
            nss: form.nss.value || 'FALTA',
            nssStatus: form.nss.value ? 'OK' : 'Falta',
            rgpdStatus: form.rgpdAccept.checked ? 'Vigente' : 'Sin consentimiento',
            rgpdSignedDate: form.rgpdAccept.checked ? new Date().toISOString().split('T')[0] : null,
            source: 'Alta Rápida',
            sourceId: `RAP-${Math.floor(1000 + Math.random() * 9000)}`,
            lastContactDate: new Date().toISOString().split('T')[0],
            lastContactBy: 'Ana Gómez',
            lastContactType: 'Alta manual',
            status: 'Disponible',
            category: form.category.value || 'Operario de almacén',
            experienceYears: Number(form.experience.value) || 1,
            drivingLicenses: form.hasForklift.checked ? ['B', 'Carnet Carretillero UNE 58451'] : ['B'],
            hasCar: true,
            preferredShift: 'Indiferente',
            skills: ['Disponibilidad horaria', 'Incorporación rápida'],
            languages: ['Español (Nativo)'],
            activeCandidatures: [],
            assignedMission: null,
            documents: [
                { name: 'Ficha_Alta_Rapida.pdf', type: 'Ficha', status: 'Verificado', uploadDate: new Date().toISOString().split('T')[0] }
            ],
            communications: [
                { date: new Date().toISOString().replace('T', ' ').substring(0, 16), user: 'Ana Gómez', channel: 'ERP', result: 'Alta Rápida registrada', note: 'Candidato dado de alta mediante formulario rápido.' }
            ]
        };

        setCandidates([newCan, ...candidates]);
        setIsQuickCreateOpen(false);
        showToast('Candidato creado', `Alta rápida de ${newCan.name} ${newCan.lastName} completada con éxito.`, 'success');
    };

    // Portal Import Simulator
    const handleImportFromPortal = (portalName) => {
        const importedNames = [
            { name: 'Raúl', lastName: 'Jiménez Ortega', dni: '03918234D', cat: 'Carretillero / Mozo frontal', exp: 3 },
            { name: 'Beatriz', lastName: 'Navas Serrano', dni: '52819203K', cat: 'Reponedora / Inventarista', exp: 2 },
            { name: 'Kevin', lastName: 'García Dos Santos', dni: 'Y1829384Z', cat: 'Mozo de almacén y picking', exp: 4 }
        ];
        const rand = importedNames[Math.floor(Math.random() * importedNames.length)];
        
        const newCan = {
            id: `CAN-0${candidates.length + 101}`,
            name: rand.name,
            lastName: rand.lastName,
            dni: rand.dni,
            dniExpiry: '2028-06-15',
            dniStatus: 'OK',
            phone: `+34 6${Math.floor(10000000 + Math.random() * 90000000)}`,
            email: `${rand.name.toLowerCase()}.${rand.lastName.split(' ')[0].toLowerCase()}@candidato.es`,
            city: 'Coslada',
            province: 'Madrid',
            distance: '3 km de Coslada',
            nss: '28/99112233/44',
            nssStatus: 'OK',
            rgpdStatus: 'Vigente',
            rgpdSignedDate: new Date().toISOString().split('T')[0],
            source: portalName,
            sourceId: `${portalName.substring(0, 3).toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`,
            lastContactDate: new Date().toISOString().split('T')[0],
            lastContactBy: 'Sincronizador API',
            lastContactType: 'Importación portal',
            status: 'Nuevo',
            category: rand.cat,
            experienceYears: rand.exp,
            drivingLicenses: ['B', 'Carnet Carretillero UNE 58451'],
            hasCar: true,
            preferredShift: 'Turno Mañana o Tarde',
            skills: ['Picking radiofrecuencia', 'Disponibilidad inmediata', 'Importado API'],
            languages: ['Español (Nativo)'],
            activeCandidatures: [],
            assignedMission: null,
            documents: [
                { name: `CV_Sincronizado_${portalName}.pdf`, type: 'CV', status: 'Verificado', uploadDate: new Date().toISOString().split('T')[0] }
            ],
            communications: [
                { date: new Date().toISOString().replace('T', ' ').substring(0, 16), user: 'API Conector', channel: portalName, result: 'Candidatura importada', note: `Perfil sincronizado automáticamente desde ${portalName}.` }
            ]
        };

        setCandidates([newCan, ...candidates]);
        setIsImportPortalOpen(false);
        showToast('Importación completada', `1 nuevo candidato importado desde ${portalName}: ${newCan.name} ${newCan.lastName}.`, 'success');
    };

    const renderStatusBadge = (status) => {
        const e = ESTADO_CANDIDATO[status] ?? { tone: 'neutral', label: status };
        return <Badge tone={e.tone} dot>{e.label}</Badge>;
    };

    // Documento de identidad: si está bien, solo el número; si no, el aviso.
    const renderDniBadge = (status, expiry, dni) => {
        if (status === 'OK') {
            return (
                <span className="inline-flex items-center gap-1 text-xs text-slate-700" title={`DNI verificado. Caduca el ${expiry}`}>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    {dni}
                </span>
            );
        }
        if (status === 'Caducado') return <Badge tone="danger" icon={XCircle} title={`Caducó el ${expiry}`}>Caducado</Badge>;
        return <Badge tone="warning" icon={AlertTriangle}>Falta</Badge>;
    };

    const renderRgpdBadge = (status) => {
        const e = RGPD[status] ?? RGPD['Sin consentimiento'];
        return <Badge tone={e.tone} icon={e.icon}>{e.label}</Badge>;
    };

    const renderNssBadge = (status, nss) => {
        if (status === 'OK') return <span className="text-xs font-mono text-slate-700">{nss}</span>;
        return <Badge tone="warning">Falta NSS</Badge>;
    };

    // En la tabla, la documentación va resumida en tres etiquetas; el detalle sale al pasar el ratón.
    const renderDocumentacion = (c) => {
        const dni = c.dniStatus === 'OK' ? 'success' : c.dniStatus === 'Caducado' ? 'danger' : 'warning';
        const nss = c.nssStatus === 'OK' ? 'success' : 'warning';
        const rgpd = (RGPD[c.rgpdStatus] ?? RGPD['Sin consentimiento']).tone;
        return (
            <div className="flex items-center gap-1">
                <Badge tone={dni} title={c.dniStatus === 'OK' ? `DNI ${c.dni}, caduca el ${c.dniExpiry}` : `DNI: ${c.dniStatus}`}>DNI</Badge>
                <Badge tone={nss} title={c.nssStatus === 'OK' ? `NSS ${c.nss}` : 'Falta el número de la Seguridad Social'}>NSS</Badge>
                <Badge tone={rgpd} title={`RGPD: ${c.rgpdStatus}`}>RGPD</Badge>
            </div>
        );
    };

    const conDocPendiente = (c) => c.dniStatus !== 'OK' || c.nssStatus !== 'OK' || c.rgpdStatus !== 'Vigente';
    const hayFiltros = searchQuery || statusFilter !== 'ALL' || docFilter !== 'ALL' || sourceFilter !== 'ALL' || savedPreset !== 'ALL';
    const limpiarFiltros = () => {
        setSearchQuery('');
        setStatusFilter('ALL');
        setDocFilter('ALL');
        setSourceFilter('ALL');
        setSavedPreset('ALL');
    };
    const aplicarVista = (preset) => {
        setSavedPreset(preset);
        setStatusFilter('ALL');
        setDocFilter('ALL');
    };

    return (
        <>
            <Page>
                <PageHeader
                    title="Candidatos"
                    count={candidates.length}
                    subtitle="Personas disponibles, en selección o en misión, con su documentación y RGPD."
                    actions={
                        <>
                            <Button icon={UploadCloud} onClick={() => setIsImportPortalOpen(true)}>Importar de portales</Button>
                            <Button variant="primary" icon={Plus} onClick={() => setIsQuickCreateOpen(true)}>Nuevo candidato</Button>
                        </>
                    }
                />

                {/* Indicadores: también son los filtros rápidos */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <KpiTile label="Todos" value={candidates.length} active={savedPreset === 'ALL'} onClick={() => aplicarVista('ALL')} />
                    <KpiTile
                        label="Disponibles ya"
                        tone="success"
                        value={candidates.filter(c => c.status === 'Disponible').length}
                        active={savedPreset === 'AVAILABLE_NOW'}
                        onClick={() => aplicarVista('AVAILABLE_NOW')}
                    />
                    <KpiTile
                        label="En misión"
                        tone="info"
                        value={candidates.filter(c => c.status === 'Asignado/En misión').length}
                        active={savedPreset === 'ASSIGNED'}
                        onClick={() => aplicarVista('ASSIGNED')}
                    />
                    <KpiTile
                        label="Documentación o RGPD pendiente"
                        tone="warning"
                        value={candidates.filter(conDocPendiente).length}
                        active={savedPreset === 'DOC_PENDING'}
                        onClick={() => aplicarVista('DOC_PENDING')}
                    />
                </div>

                <Card className="overflow-hidden">
                    {/* Filtros */}
                    <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-200">
                        <SearchInput
                            className="flex-1 min-w-[220px]"
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Buscar por nombre, DNI, teléfono, email, población o categoría..."
                        />
                        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="ALL">Todos los estados</option>
                            <option value="Disponible">Disponible</option>
                            <option value="Asignado/En misión">En misión</option>
                            <option value="En entrevista">En selección</option>
                            <option value="Nuevo">Nuevo</option>
                            <option value="Pendiente de contactar">Por contactar</option>
                            <option value="Contactado">Contactado</option>
                            <option value="No disponible">No disponible</option>
                        </Select>
                        <Select value={docFilter} onChange={(e) => setDocFilter(e.target.value)}>
                            <option value="ALL">Toda la documentación</option>
                            <option value="DOC_OK">Documentación y RGPD correctos</option>
                            <option value="DOC_ALERT">DNI o NSS pendiente o caducado</option>
                            <option value="RGPD_ALERT">RGPD pendiente o caducado</option>
                        </Select>
                        <Select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
                            <option value="ALL">Todos los orígenes</option>
                            <option value="InfoJobs">InfoJobs</option>
                            <option value="LinkedIn">LinkedIn</option>
                            <option value="Monster">Monster</option>
                            <option value="Portal Web ETT">Portal Web ETT</option>
                            <option value="Alta Manual">Alta manual</option>
                        </Select>
                        {hayFiltros && (
                            <Button variant="ghost" size="sm" icon={X} onClick={limpiarFiltros}>Limpiar</Button>
                        )}
                        <div className="ml-auto">
                            <Segmented
                                value={viewMode}
                                onChange={setViewMode}
                                options={[
                                    { id: 'table', title: 'Ver como tabla', icon: List },
                                    { id: 'cards', title: 'Ver como tarjetas', icon: Grid },
                                ]}
                            />
                        </div>
                    </div>

                    {/* Acciones sobre los seleccionados */}
                    {selectedIds.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-indigo-50 border-b border-indigo-100 text-xs">
                            <span className="font-medium text-indigo-700">
                                {selectedIds.length} {selectedIds.length === 1 ? 'seleccionado' : 'seleccionados'}
                            </span>
                            <div className="flex flex-wrap items-center gap-2 ml-auto">
                                <Button
                                    size="sm"
                                    variant="primary"
                                    icon={Briefcase}
                                    onClick={() => startAssignWizard(candidates.find(c => c.id === selectedIds[0]))}
                                >
                                    Asignar a petición
                                </Button>
                                <Button size="sm" icon={MessageSquare} onClick={() => { setBulkActionType('contact'); setIsBulkActionModalOpen(true); }}>
                                    Contactar
                                </Button>
                                <Button size="sm" icon={FileText} onClick={() => { setBulkActionType('docRequest'); setIsBulkActionModalOpen(true); }}>
                                    Pedir documentación
                                </Button>
                                <IconButton icon={X} title="Quitar la selección" onClick={() => setSelectedIds([])} />
                            </div>
                        </div>
                    )}

                    {filteredCandidates.length === 0 ? (
                        <EmptyState
                            icon={Users}
                            title="No hay candidatos con estos filtros"
                            text="Prueba con otra búsqueda o limpia los filtros."
                            action={<Button onClick={limpiarFiltros}>Limpiar filtros</Button>}
                        />
                    ) : viewMode === 'table' ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-500">
                                        <th className="py-2 pl-3 pr-1 w-8">
                                            <input
                                                type="checkbox"
                                                aria-label="Seleccionar todos"
                                                checked={selectedIds.length === filteredCandidates.length && filteredCandidates.length > 0}
                                                onChange={handleSelectAll}
                                                className="rounded border-slate-200 accent-indigo-600"
                                            />
                                        </th>
                                        <th className="py-2 px-3 font-medium">Candidato</th>
                                        <th className="py-2 px-3 font-medium">Contacto</th>
                                        <th className="py-2 px-3 font-medium">Ubicación</th>
                                        <th className="py-2 px-3 font-medium">Documentación</th>
                                        <th className="py-2 px-3 font-medium">Origen</th>
                                        <th className="py-2 px-3 font-medium">Estado</th>
                                        <th className="py-2 px-3 font-medium">Petición o misión</th>
                                        <th className="py-2 px-3" aria-label="Acciones"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCandidates.map((c) => {
                                        const isSelected = selectedIds.includes(c.id);
                                        return (
                                            <tr key={c.id} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 ${isSelected ? 'bg-indigo-50/50' : ''}`}>
                                                <td className="py-2.5 pl-3 pr-1">
                                                    <input
                                                        type="checkbox"
                                                        aria-label={`Seleccionar a ${c.name} ${c.lastName}`}
                                                        checked={isSelected}
                                                        onChange={() => handleToggleSelect(c.id)}
                                                        className="rounded border-slate-200 accent-indigo-600"
                                                    />
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <Avatar name={`${c.name} ${c.lastName}`} />
                                                        <div className="min-w-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedCandidateForDetail(c)}
                                                                className="font-medium text-slate-900 hover:text-indigo-700 text-left whitespace-nowrap"
                                                            >
                                                                {c.name} {c.lastName}
                                                            </button>
                                                            <div className="text-[11px] text-slate-500 truncate max-w-[220px]" title={c.category}>
                                                                {c.category} · {c.experienceYears} años
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <div className="text-slate-700 whitespace-nowrap">{c.phone}</div>
                                                    <div className="text-[11px] text-slate-500 truncate max-w-[170px]" title={c.email}>{c.email}</div>
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <div className="text-slate-700 whitespace-nowrap">{c.city}</div>
                                                    <div className="text-[11px] text-slate-500 whitespace-nowrap">{c.distance}</div>
                                                </td>
                                                <td className="py-2.5 px-3">{renderDocumentacion(c)}</td>
                                                <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{c.source}</td>
                                                <td className="py-2.5 px-3">{renderStatusBadge(c.status)}</td>
                                                <td className="py-2.5 px-3">
                                                    {c.assignedMission ? (
                                                        <div className="max-w-[180px]">
                                                            <div className="text-slate-700">{c.assignedMission.petitionId}</div>
                                                            <div className="text-[11px] text-slate-500 truncate">
                                                                Plaza {c.assignedMission.plazaNum} · {c.assignedMission.positionTitle}
                                                            </div>
                                                        </div>
                                                    ) : c.activeCandidatures.length > 0 ? (
                                                        <span className="text-slate-700">{c.activeCandidatures[0]}</span>
                                                    ) : (
                                                        <span className="text-slate-400">—</span>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button size="sm" icon={Briefcase} onClick={() => startAssignWizard(c)}>Asignar</Button>
                                                        <IconButton icon={PhoneCall} title="Contactar" onClick={() => openContactModal(c)} />
                                                        <IconButton icon={Eye} title="Ver ficha" onClick={() => setSelectedCandidateForDetail(c)} />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-3">
                            {filteredCandidates.map((c) => (
                                <div key={c.id} className="rounded-xl border border-slate-200 p-4 hover:border-slate-200 transition-colors flex flex-col gap-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <Avatar name={`${c.name} ${c.lastName}`} />
                                            <div className="min-w-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedCandidateForDetail(c)}
                                                    className="font-medium text-sm text-slate-900 hover:text-indigo-700 text-left"
                                                >
                                                    {c.name} {c.lastName}
                                                </button>
                                                <div className="text-[11px] text-slate-500 truncate">{c.category}</div>
                                            </div>
                                        </div>
                                        {renderStatusBadge(c.status)}
                                    </div>

                                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
                                        <dt className="text-slate-500">Teléfono</dt>
                                        <dd className="text-slate-700 text-right">{c.phone}</dd>
                                        <dt className="text-slate-500">Ubicación</dt>
                                        <dd className="text-slate-700 text-right">{c.city}</dd>
                                        <dt className="text-slate-500">Documentación</dt>
                                        <dd className="flex justify-end">{renderDocumentacion(c)}</dd>
                                        <dt className="text-slate-500">Misión</dt>
                                        <dd className="text-slate-700 text-right truncate">
                                            {c.assignedMission ? `${c.assignedMission.petitionId} · Plaza ${c.assignedMission.plazaNum}` : '—'}
                                        </dd>
                                    </dl>

                                    <div className="flex items-center gap-2 pt-3 mt-auto border-t border-slate-100">
                                        <Button className="flex-1" icon={PhoneCall} onClick={() => openContactModal(c)}>Contactar</Button>
                                        <Button className="flex-1" icon={Briefcase} onClick={() => startAssignWizard(c)}>Asignar</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </Page>

            {/* ==================================================== */}
            {/* 4. MODAL / DRAWER: FICHA COMPLETA DEL CANDIDATO      */}
            {/* ==================================================== */}
            {selectedCandidateForDetail && (
                <Drawer
                    onClose={() => setSelectedCandidateForDetail(null)}
                    leading={<Avatar name={`${selectedCandidateForDetail.name} ${selectedCandidateForDetail.lastName}`} size="lg" />}
                    title={`${selectedCandidateForDetail.name} ${selectedCandidateForDetail.lastName}`}
                    status={renderStatusBadge(selectedCandidateForDetail.status)}
                    subtitle={
                        <div className="space-y-1">
                            <div>{selectedCandidateForDetail.category} · {selectedCandidateForDetail.id} · Origen: {selectedCandidateForDetail.source}</div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600">
                                <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" />{selectedCandidateForDetail.phone}</span>
                                <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" />{selectedCandidateForDetail.email}</span>
                            </div>
                        </div>
                    }
                    toolbar={
                        <Tabs className="px-5"
                            active={detailTab}
                            onChange={setDetailTab}
                            tabs={[
                                { id: 'resumen', label: 'Resumen' },
                                { id: 'personal', label: 'Datos personales' },
                                { id: 'profesional', label: 'Perfil y carnets' },
                                { id: 'disponibilidad', label: 'Disponibilidad' },
                                { id: 'documentos', label: 'Documentos y RGPD' },
                                { id: 'candidaturas', label: 'Candidaturas' },
                                { id: 'historial', label: 'Historial' },
                            ]}
                        />
                    }
                    footer={
                        <>
                            <Button icon={PhoneCall} onClick={() => openContactModal(selectedCandidateForDetail)}>Contactar</Button>
                            <Button
                                variant="primary"
                                icon={Briefcase}
                                onClick={() => {
                                    const can = selectedCandidateForDetail;
                                    setSelectedCandidateForDetail(null);
                                    startAssignWizard(can);
                                }}
                            >
                                Asignar a petición
                            </Button>
                        </>
                    }
                >
                        <div className="space-y-6">
                            {detailTab === 'resumen' && (
                                <div className="space-y-4">
                                    {/* Document Status Alert Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className={`p-3.5 rounded-xl border ${selectedCandidateForDetail.dniStatus === 'OK' ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50 border-rose-300'}`}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-semibold text-slate-700">Documento Identidad</span>
                                                {selectedCandidateForDetail.dniStatus === 'OK' ? (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                ) : (
                                                    <AlertOctagon className="w-4 h-4 text-rose-600" />
                                                )}
                                            </div>
                                            <p className="text-sm font-mono font-semibold text-slate-900">{selectedCandidateForDetail.dni}</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                {selectedCandidateForDetail.dniStatus === 'OK' ? `Válido hasta ${selectedCandidateForDetail.dniExpiry}` : `CADUCADO el ${selectedCandidateForDetail.dniExpiry}`}
                                            </p>
                                        </div>

                                        <div className={`p-3.5 rounded-xl border ${selectedCandidateForDetail.rgpdStatus === 'Vigente' ? 'bg-emerald-50/60 border-emerald-200' : 'bg-amber-50 border-amber-300'}`}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-semibold text-slate-700">Consentimiento RGPD</span>
                                                <Shield className={`w-4 h-4 ${selectedCandidateForDetail.rgpdStatus === 'Vigente' ? 'text-emerald-600' : 'text-amber-600'}`} />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-900">{selectedCandidateForDetail.rgpdStatus}</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                Firmado el {selectedCandidateForDetail.rgpdSignedDate || 'No firmado'}
                                            </p>
                                        </div>

                                        <div className={`p-3.5 rounded-xl border ${selectedCandidateForDetail.nssStatus === 'OK' ? 'bg-emerald-50/60 border-emerald-200' : 'bg-amber-50 border-amber-300'}`}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-semibold text-slate-700">Seguridad Social (NSS)</span>
                                                <Check className={`w-4 h-4 ${selectedCandidateForDetail.nssStatus === 'OK' ? 'text-emerald-600' : 'text-amber-600'}`} />
                                            </div>
                                            <p className="text-sm font-mono font-semibold text-slate-900">{selectedCandidateForDetail.nss}</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                {selectedCandidateForDetail.nssStatus === 'OK' ? 'Listo para trámites de afiliación' : 'Pendiente de aportar resguardo'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Mission Banner if Assigned */}
                                    {selectedCandidateForDetail.assignedMission && (
                                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Briefcase className="w-5 h-5 text-indigo-600" />
                                                    <h4 className="font-semibold text-indigo-950 text-sm">Misión activa asignada</h4>
                                                </div>
                                                <span className="bg-indigo-600 text-white text-xs font-semibold px-2 py-0.5 rounded">En curso</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                                                <div>
                                                    <span className="text-slate-500">Petición / Cliente:</span>
                                                    <p className="font-semibold text-slate-900">{selectedCandidateForDetail.assignedMission.petitionId} · {selectedCandidateForDetail.assignedMission.client}</p>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500">Posición y Plaza:</span>
                                                    <p className="font-semibold text-slate-900">{selectedCandidateForDetail.assignedMission.positionTitle} (Plaza {selectedCandidateForDetail.assignedMission.plazaNum})</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Key Skills & Competencies */}
                                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                                        <h4 className="font-semibold text-slate-900 text-sm mb-2">Competencias y Certificados</h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedCandidateForDetail.drivingLicenses.map((lic, i) => (
                                                <span key={i} className="bg-amber-100 text-amber-900 font-semibold text-xs px-2.5 py-1 rounded-lg border border-amber-300 flex items-center gap-1">
                                                    <Award className="w-3 h-3 text-amber-700" /> {lic}
                                                </span>
                                            ))}
                                            {selectedCandidateForDetail.skills.map((sk, i) => (
                                                <span key={i} className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-lg">
                                                    {sk}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Latest Communications Log Preview */}
                                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-semibold text-slate-900 text-sm">Último contacto registrado</h4>
                                            <button onClick={() => setDetailTab('historial')} className="text-indigo-600 text-xs hover:underline font-semibold">Ver todo el historial</button>
                                        </div>
                                        {selectedCandidateForDetail.communications.length > 0 ? (
                                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-semibold text-slate-900">{selectedCandidateForDetail.communications[0].channel} · {selectedCandidateForDetail.communications[0].result}</span>
                                                    <span className="text-[11px] text-slate-400">{selectedCandidateForDetail.communications[0].date}</span>
                                                </div>
                                                <p className="text-slate-600">{selectedCandidateForDetail.communications[0].note}</p>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-400 italic">No hay registros de contacto previos.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {detailTab === 'personal' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div>
                                            <label className="text-slate-500 font-medium">Nombre</label>
                                            <input type="text" readOnly value={selectedCandidateForDetail.name} className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800" />
                                        </div>
                                        <div>
                                            <label className="text-slate-500 font-medium">Apellidos</label>
                                            <input type="text" readOnly value={selectedCandidateForDetail.lastName} className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800" />
                                        </div>
                                        <div>
                                            <label className="text-slate-500 font-medium">Documento de identidad (DNI/NIE)</label>
                                            <input type="text" readOnly value={selectedCandidateForDetail.dni} className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-semibold text-slate-800" />
                                        </div>
                                        <div>
                                            <label className="text-slate-500 font-medium">Caducidad Documento</label>
                                            <input type="text" readOnly value={selectedCandidateForDetail.dniExpiry} className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800" />
                                        </div>
                                        <div>
                                            <label className="text-slate-500 font-medium">Teléfono móvil</label>
                                            <input type="text" readOnly value={selectedCandidateForDetail.phone} className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800" />
                                        </div>
                                        <div>
                                            <label className="text-slate-500 font-medium">Correo Electrónico</label>
                                            <input type="text" readOnly value={selectedCandidateForDetail.email} className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800" />
                                        </div>
                                        <div>
                                            <label className="text-slate-500 font-medium">Población / Municipio</label>
                                            <input type="text" readOnly value={selectedCandidateForDetail.city} className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800" />
                                        </div>
                                        <div>
                                            <label className="text-slate-500 font-medium">Provincia</label>
                                            <input type="text" readOnly value={selectedCandidateForDetail.province} className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {detailTab === 'profesional' && (
                                <div className="space-y-4 text-xs">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <h4 className="font-semibold text-slate-900 mb-2">Categoría y experiencia laboral</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <span className="text-slate-500">Categoría Principal:</span>
                                                <p className="font-semibold text-slate-800">{selectedCandidateForDetail.category}</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">Años de experiencia demostrable:</span>
                                                <p className="font-semibold text-slate-800">{selectedCandidateForDetail.experienceYears} años</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <h4 className="font-semibold text-slate-900 mb-2">Permisos de conducir y maquinaria</h4>
                                        <div className="space-y-2">
                                            {selectedCandidateForDetail.drivingLicenses.map((lic, i) => (
                                                <div key={i} className="flex items-center gap-2 text-slate-800 font-medium">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                    <span>{lic}</span>
                                                </div>
                                            ))}
                                            <div className="flex items-center gap-2 text-slate-700 font-medium pt-1">
                                                <span className="text-slate-500">Vehículo propio para desplazamientos:</span>
                                                <span className="font-semibold text-slate-900">{selectedCandidateForDetail.hasCar ? 'Sí (Disponible)' : 'No'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {detailTab === 'disponibilidad' && (
                                <div className="space-y-4 text-xs">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <h4 className="font-semibold text-slate-900 mb-2">Preferencias horarias y turnos</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <span className="text-slate-500">Preferencia declarada:</span>
                                                <p className="font-semibold text-indigo-900">{selectedCandidateForDetail.preferredShift}</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">Incorporación:</span>
                                                <p className="font-semibold text-emerald-800">Inmediata (menos de 24h)</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {detailTab === 'documentos' && (
                                <div className="space-y-4 text-xs">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold text-slate-900">Documentos custodiados en TramitNow</h4>
                                        <button 
                                            onClick={() => showToast('Subir documento', 'Simulador de carga de archivo PDF/imagen activado.', 'info')}
                                            className="bg-indigo-600 text-white font-semibold px-3 py-1 rounded-lg hover:bg-indigo-700 transition flex items-center gap-1"
                                        >
                                            <FileUp className="w-3.5 h-3.5" /> + Subir documento
                                        </button>
                                    </div>

                                    <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                                        {selectedCandidateForDetail.documents.map((doc, idx) => (
                                            <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-semibold">
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-800">{doc.name}</p>
                                                        <p className="text-[11px] text-slate-400">Tipo: {doc.type} · Subido el {doc.uploadDate}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${doc.status === 'Verificado' || doc.status === 'Vigente' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                                        {doc.status}
                                                    </span>
                                                    <button className="text-slate-400 hover:text-slate-700 p-1" title="Descargar">
                                                        <Download className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {detailTab === 'candidaturas' && (
                                <div className="space-y-4 text-xs">
                                    <h4 className="font-semibold text-slate-900">Histórico de peticiones y plazas asignadas</h4>
                                    {selectedCandidateForDetail.assignedMission ? (
                                        <div className="bg-white border border-indigo-200 rounded-xl p-4 shadow-xs">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-semibold text-indigo-900 text-sm">{selectedCandidateForDetail.assignedMission.petitionId}</span>
                                                <span className="bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded text-[10px]">Misión Activa</span>
                                            </div>
                                            <p className="text-slate-700 font-semibold">{selectedCandidateForDetail.assignedMission.client}</p>
                                            <p className="text-slate-500 mt-1">Posición: {selectedCandidateForDetail.assignedMission.positionTitle} · Plaza {selectedCandidateForDetail.assignedMission.plazaNum}</p>
                                            <p className="text-slate-400 text-[11px] mt-1">Inicio previsto: {selectedCandidateForDetail.assignedMission.startDate}</p>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-slate-400">
                                            No hay candidaturas activas ni contratos en curso en este momento.
                                        </div>
                                    )}
                                </div>
                            )}

                            {detailTab === 'historial' && (
                                <div className="space-y-4 text-xs">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold text-slate-900">Historial de comunicaciones y actividad</h4>
                                        <button 
                                            onClick={() => openContactModal(selectedCandidateForDetail)}
                                            className="bg-indigo-600 text-white font-semibold px-3 py-1 rounded-lg hover:bg-indigo-600 transition flex items-center gap-1"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> + Registrar contacto
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {selectedCandidateForDetail.communications.map((comm, idx) => (
                                            <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-slate-900">{comm.channel}</span>
                                                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.2 rounded font-medium text-[10px]">{comm.result}</span>
                                                    </div>
                                                    <span className="text-[11px] text-slate-400">{comm.date} · {comm.user}</span>
                                                </div>
                                                <p className="text-slate-700 text-xs">{comm.note}</p>
                                                {comm.nextAction && (
                                                    <div className="mt-2 text-[11px] text-indigo-600 font-semibold flex items-center gap-1">
                                                        <ArrowRight className="w-3 h-3" /> Próximo paso: {comm.nextAction}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                </Drawer>
            )}

            {/* ==================================================== */}
            {/* 5. GUIDED WIZARD: ASIGNACIÓN A PETICIÓN / PLAZA      */}
            {/* ==================================================== */}
            {wizardState.isOpen && (
                <Modal
                  title={'Asignar a petición'}
                  subtitle={<>Paso {wizardState.step} de 4 · {wizardState.candidate?.name} {wizardState.candidate?.lastName} ({wizardState.candidate?.id})</>}
                  onClose={() => setWizardState(prev => ({ ...prev, isOpen: false }))}
                  size="max-w-3xl"
                  toolbar={<>
                        <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-semibold flex-shrink-0">
                            <div className={`flex items-center gap-1.5 ${wizardState.step >= 1 ? 'text-indigo-600 font-semibold' : 'text-slate-400'}`}>
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${wizardState.step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-slate-700'}`}>1</span>
                                <span>Petición ETT</span>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            <div className={`flex items-center gap-1.5 ${wizardState.step >= 2 ? 'text-indigo-600 font-semibold' : 'text-slate-400'}`}>
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${wizardState.step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-slate-700'}`}>2</span>
                                <span>Posición y Turno</span>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            <div className={`flex items-center gap-1.5 ${wizardState.step >= 3 ? 'text-indigo-600 font-semibold' : 'text-slate-400'}`}>
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${wizardState.step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-slate-700'}`}>3</span>
                                <span>Selección Plaza</span>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            <div className={`flex items-center gap-1.5 ${wizardState.step >= 4 ? 'text-indigo-600 font-semibold' : 'text-slate-400'}`}>
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${wizardState.step >= 4 ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-slate-700'}`}>4</span>
                                <span>Validación y Confirmar</span>
                            </div>
                        </div>
                  </>}
                  footer={<>
                  <div className="flex flex-1 items-center justify-between gap-2">
                            {wizardState.step > 1 ? (
                                <button 
                                    onClick={() => setWizardState(prev => ({ ...prev, step: prev.step - 1 }))}
                                    className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium shadow-xs"
                                >
                                    <ChevronLeft className="w-4 h-4" /> Anterior
                                </button>
                            ) : (
                                <button 
                                    onClick={() => setWizardState(prev => ({ ...prev, isOpen: false }))}
                                    className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium shadow-xs"
                                >
                                    Cancelar
                                </button>
                            )}

                            {wizardState.step < 4 ? (
                                <button 
                                    onClick={() => setWizardState(prev => ({ ...prev, step: prev.step + 1 }))}
                                    className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs"
                                >
                                    Siguiente <ChevronRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button 
                                    onClick={confirmAssignmentWizard}
                                    className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs"
                                >
                                    <Check className="w-4 h-4" /> Confirmar Asignación
                                </button>
                            )}
                  </div>
                  </>}
                >

                        {/* Step Content Area */}
                        <div className="p-6 flex-1 overflow-y-auto">
                            {/* PASO 1: SELECCIONAR PETICIÓN */}
                            {wizardState.step === 1 && (
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-900">Selecciona la petición de cliente de destino</h4>
                                        <p className="text-xs text-slate-500">Muestra las peticiones abiertas en ETT Global con plazas pendientes de cubrir.</p>
                                    </div>

                                    <div className="space-y-3">
                                        {petitions.map(pet => (
                                            <div 
                                                key={pet.id}
                                                onClick={() => setWizardState(prev => ({ 
                                                    ...prev, 
                                                    selectedPetitionId: pet.id,
                                                    selectedPositionId: pet.positions[0]?.id || ''
                                                }))}
                                                className={`p-4 rounded-xl border cursor-pointer transition ${wizardState.selectedPetitionId === pet.id ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-slate-200 bg-white'}`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono font-semibold text-indigo-900 text-sm">{pet.id}</span>
                                                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded">{pet.status}</span>
                                                        </div>
                                                        <h5 className="font-semibold text-slate-900 text-sm mt-1">{pet.client}</h5>
                                                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                            <MapPin className="w-3 h-3 text-slate-400" /> {pet.workplace}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-xs text-slate-500">Inicio:</span>
                                                        <p className="font-semibold text-slate-800 text-xs">{pet.startDate}</p>
                                                        <span className="text-[11px] text-indigo-600 font-semibold">{pet.positions.length} posiciones</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* PASO 2: SELECCIONAR POSICIÓN */}
                            {wizardState.step === 2 && (
                                <div className="space-y-4">
                                    {(() => {
                                        const currentPet = petitions.find(p => p.id === wizardState.selectedPetitionId);
                                        return (
                                            <>
                                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                                                    <div>
                                                        <span className="text-slate-400">Petición seleccionada:</span>
                                                        <p className="font-semibold text-slate-900">{currentPet?.id} · {currentPet?.client}</p>
                                                    </div>
                                                    <button 
                                                        onClick={() => setWizardState(prev => ({ ...prev, step: 1 }))}
                                                        className="text-indigo-600 font-semibold hover:underline"
                                                    >
                                                        Cambiar
                                                    </button>
                                                </div>

                                                <div>
                                                    <h4 className="text-sm font-semibold text-slate-900">Selecciona la posición de trabajo</h4>
                                                    <p className="text-xs text-slate-500">Cada posición define requisitos obligatorios, salario/hora y turno.</p>
                                                </div>

                                                <div className="space-y-3">
                                                    {currentPet?.positions.map(pos => {
                                                        const vacantCount = pos.plazas.filter(p => p.status === 'Vacante').length;
                                                        const isSelected = wizardState.selectedPositionId === pos.id;
                                                        return (
                                                            <div 
                                                                key={pos.id}
                                                                onClick={() => setWizardState(prev => ({ ...prev, selectedPositionId: pos.id }))}
                                                                className={`p-4 rounded-xl border cursor-pointer transition ${isSelected ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-slate-200 bg-white'}`}
                                                            >
                                                                <div className="flex items-start justify-between">
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-mono text-xs font-semibold text-indigo-700">{pos.id}</span>
                                                                            <span className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded">{pos.category}</span>
                                                                        </div>
                                                                        <h5 className="font-semibold text-slate-900 text-sm mt-1">{pos.title}</h5>
                                                                        <p className="text-xs text-slate-600 mt-1 flex items-center gap-1 font-medium">
                                                                            <Clock className="w-3.5 h-3.5 text-indigo-500" /> {pos.turn} · <strong className="text-emerald-700">{pos.rate}</strong>
                                                                        </p>
                                                                        
                                                                        {/* Mandatory requirements chips */}
                                                                        <div className="mt-2 flex flex-wrap gap-1">
                                                                            {pos.mandatoryRequirements.map((req, idx) => (
                                                                                <span key={idx} className="bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-medium px-2 py-0.5 rounded">
                                                                                    * {req}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>

                                                                    <div className="text-right">
                                                                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${vacantCount > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                                                            {vacantCount} de {pos.plazasTotal} plazas libres
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* PASO 3: SELECCIONAR PLAZA CONCRETA */}
                            {wizardState.step === 3 && (
                                <div className="space-y-4">
                                    {(() => {
                                        const currentPet = petitions.find(p => p.id === wizardState.selectedPetitionId);
                                        const currentPos = currentPet?.positions.find(p => p.id === wizardState.selectedPositionId);
                                        
                                        return (
                                            <>
                                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                                                    <div>
                                                        <span className="text-slate-400">Petición y Posición:</span>
                                                        <p className="font-semibold text-slate-900">{currentPet?.id} · {currentPos?.title}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-slate-400">Turno:</span>
                                                        <p className="font-semibold text-slate-800">{currentPos?.turn}</p>
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4 className="text-sm font-semibold text-slate-900">Selecciona la plaza concreta</h4>
                                                    <p className="text-xs text-slate-500">Puedes asignar directamente a una plaza vacante o iniciar candidatura en terna.</p>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {currentPos?.plazas.map(plz => {
                                                        const isVacant = plz.status === 'Vacante';
                                                        const isSelected = Number(wizardState.selectedPlazaNum) === plz.plazaNum;
                                                        return (
                                                            <div 
                                                                key={plz.plazaNum}
                                                                onClick={() => isVacant && setWizardState(prev => ({ ...prev, selectedPlazaNum: plz.plazaNum }))}
                                                                className={`p-3.5 rounded-xl border transition ${!isVacant ? 'bg-slate-100 border-slate-200 opacity-80 cursor-not-allowed' : isSelected ? 'bg-indigo-50/70 border-indigo-600 ring-2 ring-indigo-500/20 cursor-pointer' : 'bg-white border-slate-200 hover:border-slate-200 cursor-pointer'}`}
                                                            >
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="font-semibold text-slate-900 text-xs">
                                                                        Plaza Nº {plz.plazaNum} de {currentPos.plazasTotal}
                                                                    </span>
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${plz.status === 'Vacante' ? 'bg-emerald-100 text-emerald-800' : plz.status === 'Cubierta' ? 'bg-indigo-100 text-indigo-800' : 'bg-indigo-100 text-indigo-800'}`}>
                                                                        {plz.status}
                                                                    </span>
                                                                </div>

                                                                {plz.status === 'Cubierta' ? (
                                                                    <p className="text-xs text-slate-600">
                                                                        Ocupada por: <strong className="text-slate-900">{plz.candidateName}</strong>
                                                                    </p>
                                                                ) : plz.status === 'En selección' ? (
                                                                    <p className="text-xs text-indigo-800 font-medium">
                                                                        Preseleccionado: {plz.candidateName}
                                                                    </p>
                                                                ) : (
                                                                    <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                                                                        <Check className="w-3.5 h-3.5" /> Disponible para asignación inmediata
                                                                    </p>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Assignment Mode choice */}
                                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4 space-y-2">
                                                    <h5 className="font-semibold text-slate-900 text-xs">Modalidad de Asignación:</h5>
                                                    <div className="flex items-center gap-4 text-xs">
                                                        <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                                                            <input 
                                                                type="radio" 
                                                                name="assignMode" 
                                                                value="plaza"
                                                                checked={wizardState.assignmentMode === 'plaza'}
                                                                onChange={() => setWizardState(prev => ({ ...prev, assignmentMode: 'plaza' }))}
                                                                className="text-indigo-600 focus:ring-indigo-500"
                                                            />
                                                            <span>Asignar plaza directamente (Cubrir vacante)</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                                                            <input 
                                                                type="radio" 
                                                                name="assignMode" 
                                                                value="candidature"
                                                                checked={wizardState.assignmentMode === 'candidature'}
                                                                onChange={() => setWizardState(prev => ({ ...prev, assignmentMode: 'candidature' }))}
                                                                className="text-indigo-600 focus:ring-indigo-500"
                                                            />
                                                            <span>Iniciar candidatura (En terna / entrevista previa)</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* PASO 4: VALIDACIÓN, ALERTAS Y CONFIRMACIÓN */}
                            {wizardState.step === 4 && (
                                <div className="space-y-4">
                                    {(() => {
                                        const currentPet = petitions.find(p => p.id === wizardState.selectedPetitionId);
                                        const currentPos = currentPet?.positions.find(p => p.id === wizardState.selectedPositionId);
                                        const { blockers, warnings } = runWizardCompatibilityCheck(wizardState.selectedPetitionId, wizardState.selectedPositionId, wizardState.candidate);

                                        return (
                                            <>
                                                {/* Summary card */}
                                                <div className="bg-white text-slate-900 p-4 rounded-xl flex items-start justify-between text-xs border border-slate-200">
                                                    <div>
                                                        <p className="text-indigo-600 font-semibold text-[10px]">Resumen de Asignación</p>
                                                        <h4 className="text-base font-semibold text-slate-900 mt-0.5">
                                                            {wizardState.candidate?.name} {wizardState.candidate?.lastName}
                                                        </h4>
                                                        <p className="text-slate-500 mt-1">
                                                            Destino: <strong>{currentPet?.id} · {currentPet?.client}</strong>
                                                        </p>
                                                        <p className="text-slate-500">
                                                            Posición: <strong>{currentPos?.title}</strong> · Plaza <strong>{wizardState.selectedPlazaNum}</strong>
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="bg-indigo-600 text-white font-semibold px-2 py-0.5 rounded text-[10px]">
                                                            {wizardState.assignmentMode === 'plaza' ? 'Asignación Directa' : 'Candidatura'}
                                                        </span>
                                                        <p className="text-slate-500 text-[11px] mt-2">Inicio: {currentPet?.startDate}</p>
                                                    </div>
                                                </div>

                                                {/* BLOCKERS (if any) */}
                                                {blockers.length > 0 && (
                                                    <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 text-xs">
                                                        <div className="flex items-center gap-2 text-rose-900 font-semibold mb-2">
                                                            <AlertOctagon className="w-4 h-4 text-rose-600" />
                                                            <span>Incompatibilidades Críticas / Bloqueos Detectados ({blockers.length})</span>
                                                        </div>
                                                        <ul className="space-y-1.5 text-rose-800 list-disc list-inside">
                                                            {blockers.map((b, idx) => (
                                                                <li key={idx} className="font-medium">{b}</li>
                                                            ))}
                                                        </ul>
                                                        <p className="text-[11px] text-rose-600 mt-2 font-semibold">
                                                            * No se recomienda completar la asignación sin solventar estos requisitos previos (ej. renovar DNI o consentimientos).
                                                        </p>
                                                    </div>
                                                )}

                                                {/* WARNINGS (if any) */}
                                                {warnings.length > 0 && (
                                                    <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs">
                                                        <div className="flex items-center gap-2 text-amber-900 font-semibold mb-2">
                                                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                                                            <span>Advertencias y Verificaciones ({warnings.length})</span>
                                                        </div>
                                                        <ul className="space-y-1 text-amber-800 list-disc list-inside">
                                                            {warnings.map((w, idx) => (
                                                                <li key={idx}>{w}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* ALL OK Banner */}
                                                {blockers.length === 0 && warnings.length === 0 && (
                                                    <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-xs flex items-center gap-3">
                                                        <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                                                        <div>
                                                            <h5 className="font-semibold text-emerald-950">Validación de compatibilidad 100% OK</h5>
                                                            <p className="text-emerald-800">
                                                                El candidato cumple todos los requisitos formativos, documentación de identidad, RGPD y disponibilidad horaria para la plaza seleccionada.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Optional Notes for Activity Log */}
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-700">Notas de asignación / justificación (opcional):</label>
                                                    <textarea 
                                                        value={wizardState.overrideReason}
                                                        onChange={(e) => setWizardState(prev => ({ ...prev, overrideReason: e.target.value }))}
                                                        placeholder="Añade cualquier observación sobre la incorporación o acuerdos con el cliente..."
                                                        className="w-full mt-1 p-2.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                                        rows={2}
                                                    />
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>

                        {/* Wizard Footer Navigation */}
                </Modal>
            )}

            {/* ==================================================== */}
            {/* 6. MODAL: CONTACTAR CANDIDATO (PHONE, SMS, WHATSAPP) */}
            {/* ==================================================== */}
            {contactModalCandidate && (
                <Modal
                  title={'Contactar'}
                  subtitle={<>{contactModalCandidate.name} {contactModalCandidate.lastName} · {contactModalCandidate.phone}</>}
                  onClose={() => setContactModalCandidate(null)}
                  footer={<>
                  <div className="flex flex-1 items-center justify-between gap-2">
                            <button 
                                onClick={() => setContactModalCandidate(null)}
                                className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium shadow-xs"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={submitContactAction}
                                className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs"
                            >
                                <Send className="w-3.5 h-3.5" /> Guardar Actividad
                            </button>
                  </div>
                  </>}
                >

                        <div className="space-y-4 text-xs">
                            {/* Channel Selector */}
                            <div>
                                <label className="font-semibold text-slate-700 block mb-1.5">Canal de Comunicación:</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { id: 'Llamada', label: 'Llamada', icon: Phone },
                                        { id: 'WhatsApp', label: 'WhatsApp', icon: MessageSquare },
                                        { id: 'Email', label: 'Email', icon: Mail },
                                        { id: 'SMS', label: 'SMS', icon: Smartphone }
                                    ].map(ch => {
                                        const Icon = ch.icon;
                                        const isSel = contactChannel === ch.id;
                                        return (
                                            <button 
                                                key={ch.id}
                                                type="button"
                                                onClick={() => setContactChannel(ch.id)}
                                                className={`p-2.5 rounded-lg border text-center font-semibold flex flex-col items-center gap-1 transition ${isSel ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                <Icon className="w-4 h-4" />
                                                <span>{ch.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Template Selector */}
                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Plantilla rápida:</label>
                                <select 
                                    value={contactTemplate}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setContactTemplate(val);
                                        if (val === 'entrevista') {
                                            setContactMessage(`Hola ${contactModalCandidate.name}, te contactamos de ETT Global para convocarte a una entrevista para vacante de logística en Coslada.`);
                                        } else if (val === 'renovacionDoc') {
                                            setContactMessage(`Estimado/a ${contactModalCandidate.name}, te recordamos la necesidad de aportar documento de identidad renovado para mantener activas tus candidaturas en TramitNow ETT.`);
                                        } else if (val === 'ofertaUrgente') {
                                            setContactMessage(`¡Oferta urgente de turno en Coslada! Buscamos operario para incorporación el próximo lunes. Confírmanos tu disponibilidad.`);
                                        }
                                    }}
                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                                >
                                    <option value="libre">Mensaje libre / Personalizado</option>
                                    <option value="entrevista">Convocatoria a Entrevista Técnica</option>
                                    <option value="renovacionDoc">Solicitud Renovación Documental / DNI</option>
                                    <option value="ofertaUrgente">Oferta Urgente Incorporación Inmediata</option>
                                </select>
                            </div>

                            {/* Message Body */}
                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Mensaje / Guión de conversación:</label>
                                <textarea 
                                    value={contactMessage}
                                    onChange={(e) => setContactMessage(e.target.value)}
                                    rows={3}
                                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            {/* Result Selector */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Resultado de la acción:</label>
                                    <select 
                                        value={contactResult}
                                        onChange={(e) => setContactResult(e.target.value)}
                                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                                    >
                                        <option value="Interesado y disponible">Interesado y disponible</option>
                                        <option value="Citado para entrevista">Citado para entrevista</option>
                                        <option value="No contesta / Buzón">No contesta / Buzón</option>
                                        <option value="No disponible temporalmente">No disponible temporalmente</option>
                                        <option value="Rechaza oferta">Rechaza oferta / Desinteresado</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Nota interna para la ficha:</label>
                                    <input 
                                        type="text"
                                        value={contactNote}
                                        onChange={(e) => setContactNote(e.target.value)}
                                        placeholder="Ej. Prefiere turno de mañana..."
                                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>

                </Modal>
            )}

            {/* ==================================================== */}
            {/* 7. MODAL: ALTA RÁPIDA DE CANDIDATO                   */}
            {/* ==================================================== */}
            {isQuickCreateOpen && (
                <Modal
                  title={'Alta rápida de candidato'}
                  subtitle={'Crea la ficha básica y completa el perfil profesional después.'}
                  onClose={() => setIsQuickCreateOpen(false)}
                  footer={<>
                  <div className="flex flex-1 items-center justify-between gap-2">
                                <button 
                                    type="button"
                                    onClick={() => setIsQuickCreateOpen(false)}
                                    className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium shadow-xs"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" form="form-alta-candidato"
                                    className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs"
                                >
                                    <Check className="w-4 h-4" /> Crear Candidato
                                </button>
                  </div>
                  </>}
                >
                  <form id="form-alta-candidato" onSubmit={handleQuickCreateSubmit}>

                            <div className="space-y-3.5 text-xs">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Nombre *</label>
                                        <input required name="name" type="text" placeholder="Ej. Sergio" className="w-full p-2 border border-slate-200 rounded-lg text-xs" />
                                    </div>
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Apellidos *</label>
                                        <input required name="lastName" type="text" placeholder="Ej. Marín López" className="w-full p-2 border border-slate-200 rounded-lg text-xs" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Documento identidad (DNI/NIE) *</label>
                                        <input required name="dni" type="text" placeholder="12345678Z" className="w-full p-2 border border-slate-200 rounded-lg font-mono text-xs" />
                                    </div>
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Caducidad DNI</label>
                                        <input name="dniExpiry" type="date" defaultValue="2028-12-31" className="w-full p-2 border border-slate-200 rounded-lg text-xs" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Teléfono Móvil *</label>
                                        <input required name="phone" type="tel" placeholder="+34 600 000 000" className="w-full p-2 border border-slate-200 rounded-lg text-xs" />
                                    </div>
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Correo Electrónico *</label>
                                        <input required name="email" type="email" placeholder="candidato@email.com" className="w-full p-2 border border-slate-200 rounded-lg text-xs" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Población</label>
                                        <input name="city" type="text" defaultValue="Coslada" className="w-full p-2 border border-slate-200 rounded-lg text-xs" />
                                    </div>
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Provincia</label>
                                        <input name="province" type="text" defaultValue="Madrid" className="w-full p-2 border border-slate-200 rounded-lg text-xs" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Categoría Principal</label>
                                        <select name="category" className="w-full p-2 border border-slate-200 rounded-lg text-xs">
                                            <option value="Operario de almacén / Mozo">Operario de almacén / Mozo</option>
                                            <option value="Carretillero / Mozo especializado">Carretillero / Mozo especializado</option>
                                            <option value="Reponedor / Carga y descarga">Reponedor / Carga y descarga</option>
                                            <option value="Conductor / Repartidor">Conductor / Repartidor</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Años Experiencia</label>
                                        <input name="experience" type="number" defaultValue="2" min="0" max="40" className="w-full p-2 border border-slate-200 rounded-lg text-xs" />
                                    </div>
                                </div>

                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Nº Seguridad Social (NSS)</label>
                                    <input name="nss" type="text" placeholder="28/12345678/90 (Opcional en alta rápida)" className="w-full p-2 border border-slate-200 rounded-lg font-mono text-xs" />
                                </div>

                                <div className="pt-2 border-t border-slate-100 space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                                        <input name="hasForklift" type="checkbox" defaultChecked className="rounded text-indigo-600 focus:ring-indigo-500" />
                                        <span>Dispone de Carnet de Carretillero UNE 58451</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-emerald-800">
                                        <input name="rgpdAccept" type="checkbox" defaultChecked className="rounded text-emerald-600 focus:ring-indigo-500" />
                                        <span>Acepta cláusula de tratamiento y cesión de datos RGPD ETT Global</span>
                                    </label>
                                </div>
                            </div>

                  </form>
                </Modal>
            )}

            {/* ==================================================== */}
            {/* 8. MODAL: IMPORTAR DESDE PORTALES DE EMPLEO          */}
            {/* ==================================================== */}
            {isImportPortalOpen && (
                <Modal
                  title={'Importar de portales'}
                  subtitle={'Conexiones activas con los portales de empleo.'}
                  onClose={() => setIsImportPortalOpen(false)}
                  footer={<>
                            <button 
                                onClick={() => setIsImportPortalOpen(false)}
                                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 text-xs font-semibold"
                            >
                                Cerrar
                            </button>
                  </>}
                >

                        <div className="space-y-3.5 text-xs">
                            <p className="text-slate-600">
                                Selecciona el conector del portal para sincronizar las últimas candidaturas recibidas e incorporarlas al ERP:
                            </p>

                            <div className="space-y-2.5">
                                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 font-semibold text-sm flex items-center justify-center shadow-xs">
                                            IJ
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-900 text-xs">InfoJobs e-Recruitment API</h4>
                                            <p className="text-[11px] text-slate-500">Conexión en tiempo real · 3 inscripciones pendientes</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleImportFromPortal('InfoJobs')}
                                        className="bg-indigo-600 hover:bg-indigo-600 text-white font-semibold px-3 py-1.5 rounded-lg text-xs shadow-2xs transition"
                                    >
                                        Importar
                                    </button>
                                </div>

                                <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/40 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 font-semibold text-sm flex items-center justify-center shadow-xs">
                                            in
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-900 text-xs">LinkedIn Recruiter ATS</h4>
                                            <p className="text-[11px] text-slate-500">Sincronización de perfiles guardados</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleImportFromPortal('LinkedIn')}
                                        className="bg-indigo-700 hover:bg-indigo-800 text-white font-semibold px-3 py-1.5 rounded-lg text-xs shadow-2xs transition"
                                    >
                                        Importar
                                    </button>
                                </div>

                                <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/40 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 font-semibold text-sm flex items-center justify-center shadow-xs">
                                            M
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-900 text-xs">Monster / Indeed XML feed</h4>
                                            <p className="text-[11px] text-slate-500">Importación por lote de CVs recibidos</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleImportFromPortal('Monster')}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs shadow-2xs transition"
                                    >
                                        Importar
                                    </button>
                                </div>
                            </div>
                        </div>

                </Modal>
            )}

            {/* ==================================================== */}
            {/* 9. MODAL: ACCIONES MASIVAS                           */}
            {/* ==================================================== */}
            {isBulkActionModalOpen && (
                <Modal
                  title={`Acción masiva: ${selectedIds.length} candidatos`}
                  subtitle={'Se aplicará a todos los seleccionados.'}
                  onClose={() => setIsBulkActionModalOpen(false)}
                  size="max-w-md"
                  footer={<>
                  <div className="flex flex-1 items-center justify-between gap-2">
                            <button 
                                onClick={() => setIsBulkActionModalOpen(false)}
                                className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium shadow-xs"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={() => {
                                    setIsBulkActionModalOpen(false);
                                    showToast('Acción masiva completada', `Operación procesada con éxito para ${selectedIds.length} candidatos.`, 'success');
                                    setSelectedIds([]);
                                }}
                                className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs"
                            >
                                Confirmar y Enviar
                            </button>
                  </div>
                  </>}
                >

                        <div className="space-y-4 text-xs">
                            {bulkActionType === 'contact' && (
                                <>
                                    <p className="text-slate-700">Se enviará una comunicación por SMS/Email a los {selectedIds.length} candidatos seleccionados:</p>
                                    <textarea 
                                        defaultValue="Hola, desde ETT Global te informamos de nuevas oportunidades de empleo en el sector logístico de Madrid. Responde a este mensaje para confirmar disponibilidad."
                                        rows={3}
                                        className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
                                    />
                                </>
                            )}

                            {bulkActionType === 'docRequest' && (
                                <>
                                    <p className="text-slate-700">Se generará una solicitud formal con enlace seguro para que los candidatos aporten o renueven su documento de identidad y RGPD.</p>
                                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-800">
                                        Enlace auto-firmable con validez de 7 días.
                                    </div>
                                </>
                            )}
                        </div>

                </Modal>
            )}

            {/* ==================================================== */}
            {/* 10. FLOATING TOAST FEEDBACK NOTIFICATION            */}
            {/* ==================================================== */}
            {toast && (
                <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-slate-900 text-white p-4 rounded-xl shadow-lg border border-slate-800 flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-300">
                    {toast.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    ) : toast.type === 'error' ? (
                        <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                    ) : (
                        <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                        <h4 className="font-semibold text-xs text-white">{toast.title}</h4>
                        <p className="text-[11px] text-slate-300 mt-0.5">{toast.message}</p>
                    </div>
                    <button onClick={() => setToast(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </>
    );
}
