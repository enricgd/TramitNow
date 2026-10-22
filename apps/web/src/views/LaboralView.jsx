// Partió de design/laboral.html (scripts/import-design.py). Ahora se edita aquí directamente: no regenerar.
import React, { useState, useMemo, useEffect } from 'react';
import {
    LayoutDashboard,
    Inbox,
    Calculator,
    Building2,
    Users,
    UserCheck,
    UserPlus,
    Briefcase,
    Clock,
    Receipt,
    FileText,
    BarChart3,
    Settings,
    Building,
    ChevronRight,
    Search,
    Bell,
    Filter,
    Plus,
    CheckCircle2,
    AlertCircle,
    Clock3,
    Send,
    FileSignature,
    ShieldCheck,
    GraduationCap,
    AlertTriangle,
    ExternalLink,
    Download,
    Eye,
    RefreshCw,
    MoreVertical,
    X,
    ChevronDown,
    ArrowUpRight,
    Lock,
    Sparkles,
    Calendar,
    Check,
    Layers,
    Phone,
    Mail,
    FileSpreadsheet,
    Info,
    ArrowLeft,
    CheckCheck,
    HelpCircle,
    SlidersHorizontal
} from 'lucide-react';

// --- MOCK INITIAL DATA ---
const INITIAL_EXPEDIENTES = [
    {
        id: 'EXP-001',
        candidatoId: 'CAND-4891',
        nombre: 'Laura García Moreno',
        nif: '48.912.834-K',
        telefono: '+34 612 345 678',
        email: 'laura.garcia@email.com',
        foto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
        plazaNumero: 1,
        posicion: 'Operario/a de almacén',
        categoria: 'Grupo IV - Mozo especialista',
        fechaIncorporacion: '2026-03-02',
        fechaFinPrevista: '2026-06-30',
        estadoGlobal: 'Completado',
        progreso: 100,
        responsable: 'Elena Morán',
        pasos: {
            documentacion: { estado: 'Confirmado', fecha: '2026-02-23', detalle: 'DNI, NUSS y cuenta bancaria validados' },
            altaSS: { estado: 'Confirmado', fecha: '2026-02-24', detalle: 'Alta Sistema RED enviada (IDC generado: #89214)' },
            prl: { estado: 'Confirmado', fecha: '2026-02-24', detalle: 'Curso Básico Logística 20h y entrega EPIs firmada' },
            contrato: { estado: 'Firmado', fecha: '2026-02-25', detalle: 'Firma OTP verificada con certificado' },
            cpd: { estado: 'Confirmado', fecha: '2026-02-25', detalle: 'CPD firmado y notificado a la empresa usuaria' },
            incorporacion: { estado: 'Confirmado', fecha: '2026-03-02', detalle: 'Confirmada asistencia en primer turno' },
            finContrato: { estado: 'Pendiente', fecha: '2026-06-30', detalle: 'Planificado a 90 días' }
        },
        proximaTarea: 'Expediente cerrado y listo para inicio',
        bloqueante: false
    },
    {
        id: 'EXP-002',
        candidatoId: 'CAND-5102',
        nombre: 'Miguel Torres Navarro',
        nif: '51.029.418-L',
        telefono: '+34 689 123 456',
        email: 'miguel.torres@email.com',
        foto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
        plazaNumero: 2,
        posicion: 'Operario/a de almacén',
        categoria: 'Grupo IV - Mozo especialista',
        fechaIncorporacion: '2026-03-02',
        fechaFinPrevista: '2026-06-30',
        estadoGlobal: 'En preparación',
        progreso: 65,
        responsable: 'Elena Morán',
        pasos: {
            documentacion: { estado: 'Confirmado', fecha: '2026-02-24', detalle: 'Documentación completa en portal' },
            altaSS: { estado: 'Pendiente', fecha: '2026-02-27', detalle: 'Pendiente envío telemático a TGSS (Previo a inicio)' },
            prl: { estado: 'Confirmado', fecha: '2026-02-25', detalle: 'Certificado PRL vigente aportado' },
            contrato: { estado: 'Firmado', fecha: '2026-02-26', detalle: 'Firmado electrónicamente por candidato y ETT' },
            cpd: { estado: 'En preparación', fecha: '2026-02-27', detalle: 'Borrador generado con cliente' },
            incorporacion: { estado: 'Pendiente', fecha: '2026-03-02', detalle: 'Esperando alta SS' },
            finContrato: { estado: 'Pendiente', fecha: '2026-06-30', detalle: 'Planificado' }
        },
        proximaTarea: 'Tramitar Alta en Seguridad Social (TGSS)',
        bloqueante: false
    },
    {
        id: 'EXP-003',
        candidatoId: 'CAND-3392',
        nombre: 'Ana López Serrano',
        nif: '33.921.054-P',
        telefono: '+34 644 987 321',
        email: 'ana.lopez@email.com',
        foto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        plazaNumero: 3,
        posicion: 'Operario/a de almacén',
        categoria: 'Grupo IV - Mozo especialista',
        fechaIncorporacion: '2026-03-02',
        fechaFinPrevista: '2026-06-30',
        estadoGlobal: 'En preparación',
        progreso: 45,
        responsable: 'Elena Morán',
        pasos: {
            documentacion: { estado: 'Confirmado', fecha: '2026-02-24', detalle: 'Validado NIF y cuenta' },
            altaSS: { estado: 'En preparación', fecha: '2026-02-27', detalle: 'Ficha SS cumplimentada' },
            prl: { estado: 'Pendiente', fecha: '2026-02-27', detalle: 'Requiere Curso Específico Carretillas y Logística' },
            contrato: { estado: 'Enviado', fecha: '2026-02-26', detalle: 'Enviado SMS con enlace de firma (caduca en 24h)' },
            cpd: { estado: 'Pendiente', fecha: '2026-02-28', detalle: 'Pendiente de firma del contrato laboral' },
            incorporacion: { estado: 'Pendiente', fecha: '2026-03-02', detalle: 'Pendiente' },
            finContrato: { estado: 'Pendiente', fecha: '2026-06-30', detalle: 'Planificado' }
        },
        proximaTarea: 'Asignar curso formativo PRL y convocar',
        bloqueante: false
    },
    {
        id: 'EXP-004',
        candidatoId: 'CAND-6218',
        nombre: 'Pablo Ruiz Castaño',
        nif: '62.184.992-M',
        telefono: '+34 655 432 109',
        email: 'pablo.ruiz@email.com',
        foto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
        plazaNumero: 4,
        posicion: 'Operario/a de almacén',
        categoria: 'Grupo IV - Mozo especialista',
        fechaIncorporacion: '2026-03-02',
        fechaFinPrevista: '2026-06-30',
        estadoGlobal: 'En preparación',
        progreso: 80,
        responsable: 'Carlos Valdés',
        pasos: {
            documentacion: { estado: 'Confirmado', fecha: '2026-02-23', detalle: 'Validación documental OK' },
            altaSS: { estado: 'Confirmado', fecha: '2026-02-25', detalle: 'Alta previa TGSS tramitada con éxito' },
            prl: { estado: 'Confirmado', fecha: '2026-02-24', detalle: 'Formación PRL 20h convalidada' },
            contrato: { estado: 'Firmado', fecha: '2026-02-25', detalle: 'Firmado digitalmente' },
            cpd: { estado: 'Enviado', fecha: '2026-02-26', detalle: 'Enviado a Trans-Logística Ibérica (pendiente acuse)' },
            incorporacion: { estado: 'Pendiente', fecha: '2026-03-02', detalle: 'Confirmada para turno mañana' },
            finContrato: { estado: 'Pendiente', fecha: '2026-06-30', detalle: 'Planificado' }
        },
        proximaTarea: 'Esperando confirmación CPD por cliente usuaria',
        bloqueante: false
    },
    {
        id: 'EXP-005',
        candidatoId: 'CAND-7411',
        nombre: 'Carlos Mendoza Vidal',
        nif: '74.119.823-R',
        telefono: '+34 670 998 877',
        email: 'carlos.mendoza@email.com',
        foto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
        plazaNumero: 5,
        posicion: 'Operario/a de almacén',
        categoria: 'Grupo IV - Mozo especialista',
        fechaIncorporacion: '2026-03-02',
        fechaFinPrevista: '2026-06-30',
        estadoGlobal: 'Bloqueado',
        progreso: 20,
        responsable: 'Elena Morán',
        pasos: {
            documentacion: { estado: 'Error', fecha: '2026-02-26', detalle: 'DNI caducado y NUSS no coincide con datos TGSS' },
            altaSS: { estado: 'Bloqueado', fecha: '2026-02-26', detalle: 'Rechazo SILTRA: Faltan datos de filiación' },
            prl: { estado: 'Pendiente', fecha: '2026-02-27', detalle: 'Bloqueado hasta resolver documentación' },
            contrato: { estado: 'Bloqueado', fecha: '2026-02-26', detalle: 'Borrador congelado por incidencia' },
            cpd: { estado: 'Bloqueado', fecha: '2026-02-26', detalle: 'Bloqueado' },
            incorporacion: { estado: 'Bloqueado', fecha: '2026-03-02', detalle: 'Riesgo de retraso' },
            finContrato: { estado: 'Pendiente', fecha: '2026-06-30', detalle: 'Planificado' }
        },
        proximaTarea: 'Subsanar DNI/NUSS con el candidato (Urgente)',
        bloqueante: true
    }
];

const PLAZAS_VACANTES = [
    { plazaNumero: 6, posicion: 'Operario/a de almacén', estado: 'En selección', candidatoAsignado: null },
    { plazaNumero: 7, posicion: 'Operario/a de almacén', estado: 'En selección', candidatoAsignado: null },
    { plazaNumero: 8, posicion: 'Operario/a de almacén', estado: 'Pendiente de búsqueda', candidatoAsignado: null }
];

const ACTIVIDAD_PETICION = [
    { id: 1, hora: 'Hoy 11:42', autor: 'Elena Morán', accion: 'Contrato firmado digitalmente', candidato: 'Laura García Moreno', tipo: 'success' },
    { id: 2, hora: 'Hoy 10:15', autor: 'Sistema TGSS', accion: 'Alta Seguridad Social confirmada (IDC #89214)', candidato: 'Pablo Ruiz Castaño', tipo: 'info' },
    { id: 3, hora: 'Hoy 09:30', autor: 'Carlos Valdés', accion: 'CPD remitido a empresa usuaria para firma', candidato: 'Pablo Ruiz Castaño', tipo: 'info' },
    { id: 4, hora: 'Ayer 18:20', autor: 'Elena Morán', accion: 'Incidencia documental registrada (DNI caducado)', candidato: 'Carlos Mendoza Vidal', tipo: 'warning' },
    { id: 5, hora: 'Ayer 16:05', autor: 'Sistema E-Firma', accion: 'Enviado SMS de firma de contrato laboral', candidato: 'Ana López Serrano', tipo: 'neutral' },
    { id: 6, hora: '24 Feb 14:00', autor: 'Lucía Santos', accion: 'Candidato asignado a la Plaza #2 de la petición', candidato: 'Miguel Torres Navarro', tipo: 'neutral' }
];

export default function LaboralView() {
    // Navigation & Views
    const [activeRequestTab, setActiveRequestTab] = useState('laboral');
    const [selectedExpediente, setSelectedExpediente] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [drawerInternalTab, setDrawerInternalTab] = useState('checklist');
    const [viewMode, setViewMode] = useState('tabla'); // 'tabla' | 'tarjetas'
    const [viewGlobalLaboral, setViewGlobalLaboral] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterEstado, setFilterEstado] = useState('todos');
    const [filterTarea, setFilterTarea] = useState('todas');
    const [filterResponsable, setFilterResponsable] = useState('todos');

    // Data State
    const [expedientes, setExpedientes] = useState(INITIAL_EXPEDIENTES);
    const [actividadList, setActividadList] = useState(ACTIVIDAD_PETICION);

    // Modal Action State
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        tipo: null, // 'altaSS' | 'prl' | 'contrato' | 'cpd' | 'subsanar'
        expediente: null,
        step: 'form', // 'form' | 'loading' | 'success' | 'error'
        titulo: '',
        mensaje: ''
    });

    // Notification / Toast
    const [toast, setToast] = useState(null);

    const showToast = (title, message, type = 'success') => {
        setToast({ title, message, type });
        setTimeout(() => setToast(null), 4500);
    };

    // Metrics calculation
    const metrics = useMemo(() => {
        const totalPlazas = 8;
        const asignadas = expedientes.length;
        const completos = expedientes.filter(e => e.estadoGlobal === 'Completado').length;
        const pendientes = expedientes.filter(e => e.estadoGlobal === 'En preparación').length;
        const bloqueados = expedientes.filter(e => e.estadoGlobal === 'Bloqueado').length;
        const vacantes = totalPlazas - asignadas;
        const porcentaje = Math.round((completos / totalPlazas) * 100);

        return { totalPlazas, asignadas, completos, pendientes, bloqueados, vacantes, porcentaje };
    }, [expedientes]);

    // Filtered list
    const expedientesFiltrados = useMemo(() => {
        return expedientes.filter(exp => {
            const matchSearch = exp.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                exp.nif.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                exp.id.toLowerCase().includes(searchTerm.toLowerCase());
            const matchEstado = filterEstado === 'todos' || exp.estadoGlobal.toLowerCase() === filterEstado.toLowerCase();
            const matchResponsable = filterResponsable === 'todos' || exp.responsable === filterResponsable;

            let matchTarea = true;
            if (filterTarea === 'altaSS') matchTarea = exp.pasos.altaSS.estado !== 'Confirmado';
            if (filterTarea === 'prl') matchTarea = exp.pasos.prl.estado !== 'Confirmado';
            if (filterTarea === 'contrato') matchTarea = exp.pasos.contrato.estado !== 'Firmado';
            if (filterTarea === 'cpd') matchTarea = exp.pasos.cpd.estado !== 'Confirmado';

            return matchSearch && matchEstado && matchResponsable && matchTarea;
        });
    }, [expedientes, searchTerm, filterEstado, filterResponsable, filterTarea]);

    // Open Drawer for specific person
    const handleOpenExpediente = (exp) => {
        setSelectedExpediente(exp);
        setIsDrawerOpen(true);
    };

    // Trigger Modal Actions
    const handleTriggerAction = (tipo, exp) => {
        let titulo = '';
        if (tipo === 'altaSS') titulo = `Tramitar Alta en Seguridad Social (TGSS) — ${exp.nombre}`;
        if (tipo === 'prl') titulo = `Asignar y Validar Formación PRL — ${exp.nombre}`;
        if (tipo === 'contrato') titulo = `Preparar y Enviar Contrato Laboral a Firma — ${exp.nombre}`;
        if (tipo === 'cpd') titulo = `Generar y Enviar Contrato de Puesta a Disposición (CPD) — ${exp.nombre}`;
        if (tipo === 'subsanar') titulo = `Subsanar Incidencia Documental — ${exp.nombre}`;

        setModalConfig({
            isOpen: true,
            tipo,
            expediente: exp,
            step: 'form',
            titulo,
            mensaje: ''
        });
    };

    // Execute Modal Action Simulation
    const handleExecuteAction = () => {
        setModalConfig(prev => ({ ...prev, step: 'loading' }));

        setTimeout(() => {
            const { tipo, expediente } = modalConfig;
            if (!expediente) return;

            // Update local state copy
            setExpedientes(prev => prev.map(item => {
                if (item.id === expediente.id) {
                    const updated = JSON.parse(JSON.stringify(item));
                    const todayStr = '2026-02-27';

                    if (tipo === 'altaSS') {
                        updated.pasos.altaSS = { estado: 'Confirmado', fecha: todayStr, detalle: 'Alta TGSS Sistema RED transmitida OK (IDC #91032)' };
                        updated.proximaTarea = 'Completar envío de CPD al cliente';
                    } else if (tipo === 'prl') {
                        updated.pasos.prl = { estado: 'Confirmado', fecha: todayStr, detalle: 'Curso PRL 20h asignado y certificado acreditado' };
                        updated.proximaTarea = 'Tramitar Alta en Seguridad Social (TGSS)';
                    } else if (tipo === 'contrato') {
                        updated.pasos.contrato = { estado: 'Firmado', fecha: todayStr, detalle: 'Firmado digitalmente vía OTP móvil' };
                        updated.proximaTarea = 'Generar y enviar CPD a empresa usuaria';
                    } else if (tipo === 'cpd') {
                        updated.pasos.cpd = { estado: 'Confirmado', fecha: todayStr, detalle: 'CPD firmado por empresa usuaria' };
                        updated.proximaTarea = 'Expediente completo para incorporación';
                    } else if (tipo === 'subsanar') {
                        updated.bloqueante = false;
                        updated.estadoGlobal = 'En preparación';
                        updated.pasos.documentacion = { estado: 'Confirmado', fecha: todayStr, detalle: 'DNI renovado y NUSS subsanado' };
                        updated.pasos.altaSS = { estado: 'Pendiente', fecha: todayStr, detalle: 'Listo para preparar alta TGSS' };
                        updated.proximaTarea = 'Tramitar Alta en Seguridad Social (TGSS)';
                    }

                    // Recompute progress
                    const totalSteps = 5; // doc, alta, prl, contrato, cpd
                    let completedCount = 0;
                    if (updated.pasos.documentacion.estado === 'Confirmado') completedCount++;
                    if (updated.pasos.altaSS.estado === 'Confirmado') completedCount++;
                    if (updated.pasos.prl.estado === 'Confirmado') completedCount++;
                    if (updated.pasos.contrato.estado === 'Firmado') completedCount++;
                    if (updated.pasos.cpd.estado === 'Confirmado') completedCount++;

                    updated.progreso = Math.round((completedCount / totalSteps) * 100);
                    if (updated.progreso === 100) {
                        updated.estadoGlobal = 'Completado';
                        updated.proximaTarea = 'Listo para inicio de turno el 02/03/2026';
                    }

                    return updated;
                }
                return item;
            }));

            // Add to activity log
            const accionText = tipo === 'altaSS' ? 'Alta en TGSS confirmada telemáticamente' :
                               tipo === 'prl' ? 'Curso PRL asignado y validado' :
                               tipo === 'contrato' ? 'Contrato laboral firmado digitalmente' :
                               tipo === 'cpd' ? 'CPD validado por empresa usuaria' : 'Incidencia subsanada';

            setActividadList(prev => [
                {
                    id: Date.now(),
                    hora: 'Justo ahora',
                    autor: 'Elena Morán (Tú)',
                    accion: accionText,
                    candidato: expediente.nombre,
                    tipo: 'success'
                },
                ...prev
            ]);

            setModalConfig(prev => ({
                ...prev,
                step: 'success',
                mensaje: `Operación completada con éxito. Se ha actualizado el expediente laboral de ${expediente.nombre}.`
            }));

            showToast('Acción completada', `El proceso de "${tituloCorto(tipo)}" ha finalizado correctamente.`);
        }, 1200);
    };

    const tituloCorto = (tipo) => {
        if (tipo === 'altaSS') return 'Alta Seguridad Social';
        if (tipo === 'prl') return 'Formación PRL';
        if (tipo === 'contrato') return 'Firma de Contrato';
        if (tipo === 'cpd') return 'Envío de CPD';
        if (tipo === 'subsanar') return 'Subsanación Documental';
        return 'Tarea Laboral';
    };

    // Badge helper
    const getStatusBadge = (estado) => {
        switch (estado) {
            case 'Confirmado':
            case 'Firmado':
            case 'Completado':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3 h-3 text-emerald-600" />{estado}</span>;
            case 'Enviado':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"><Send className="w-3 h-3 text-blue-600" />Enviado</span>;
            case 'En preparación':
            case 'En proceso':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"><Clock3 className="w-3 h-3 text-amber-600" />En preparación</span>;
            case 'Bloqueado':
            case 'Error':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200"><AlertTriangle className="w-3 h-3 text-rose-600" />Bloqueado</span>;
            case 'Pendiente':
            default:
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"><Clock className="w-3 h-3 text-slate-400" />Pendiente</span>;
        }
    };

    // Step status circle for checklist
    const renderStepPill = (pasoKey, pasoObj, label, onClickAction) => {
        let bg = 'bg-slate-100 text-slate-500 border-slate-200';
        let icon = <Clock className="w-3 h-3" />;

        if (pasoObj.estado === 'Confirmado' || pasoObj.estado === 'Firmado') {
            bg = 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
            icon = <Check className="w-3 h-3 text-emerald-600" />;
        } else if (pasoObj.estado === 'Enviado') {
            bg = 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
            icon = <Send className="w-3 h-3 text-blue-600" />;
        } else if (pasoObj.estado === 'En preparación' || pasoObj.estado === 'Pendiente') {
            bg = 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 font-semibold cursor-pointer';
            icon = <Clock3 className="w-3 h-3 text-amber-600" />;
        } else if (pasoObj.estado === 'Bloqueado' || pasoObj.estado === 'Error') {
            bg = 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 font-semibold cursor-pointer';
            icon = <AlertCircle className="w-3 h-3 text-rose-600" />;
        }

        return (
            <button
                onClick={onClickAction}
                title={`${label}: ${pasoObj.estado} (${pasoObj.detalle})`}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors ${bg}`}
            >
                {icon}
                <span>{label}</span>
            </button>
        );
    };

    return (
        <div className="min-h-full flex flex-col bg-slate-100/70 text-slate-800">
            {/* TOAST NOTIFICATION */}
            {toast && (
                <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
                    <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
                        <CheckCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-100">{toast.title}</p>
                        <p className="text-xs text-slate-300">{toast.message}</p>
                    </div>
                    <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* TOP GLOBAL BAR */}

            {/* MAIN APP WRAPPER: SIDEBAR + CONTENT */}
            <div className="flex flex-1 overflow-hidden">
                {/* GLOBAL SIDEBAR */}

                {/* MAIN CONTENT AREA */}
                <main className="flex-1 flex flex-col overflow-y-auto bg-slate-50">
                    {/* BREADCRUMB + GLOBAL PETITION SWITCH BANNER */}
                    {viewGlobalLaboral && (
                        <div className="bg-emerald-900 text-emerald-100 px-6 py-2.5 flex items-center justify-between text-xs border-b border-emerald-800">
                            <div className="flex items-center gap-2">
                                <Info className="w-4 h-4 text-emerald-300" />
                                <span>Estás previsualizando la <strong>Bandeja Laboral Global</strong> (todas las peticiones). Puedes volver al contexto individual en cualquier momento:</span>
                            </div>
                            <button
                                onClick={() => setViewGlobalLaboral(false)}
                                className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1 rounded font-medium transition-colors"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" /> Volver a Petición PET-2026-0048
                            </button>
                        </div>
                    )}

                    {/* BREADCRUMB */}
                    <div className="px-6 pt-4 pb-2 flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="hover:text-slate-700 cursor-pointer">Peticiones Operativas</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-semibold text-slate-800">PET-2026-0048</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-medium border border-indigo-100">
                                Pestaña Laboral (Altas, Cursos, Contratos y CPD)
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => showToast('Sincronizado', 'Conectado con TGSS Sistema RED y pasarela OTP de firma.')}
                                className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-2xs hover:bg-slate-50 transition-colors"
                            >
                                <RefreshCw className="w-3.5 h-3.5 text-slate-500" /> Sincronizar Pasarelas
                            </button>
                        </div>
                    </div>

                    {/* CONTEXTUAL PETITION HEADER */}
                    <div className="px-6 py-4 bg-white border-b border-slate-200">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            {/* Left info */}
                            <div className="space-y-1">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                        PET-2026-0048
                                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                            En proceso laboral / Incorporación
                                        </span>
                                    </h1>
                                    <span className="text-xs text-slate-400">|</span>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="font-semibold text-slate-700">Trans-Logística Ibérica Norte, S.A.</span>
                                        <span className="text-[11px] text-slate-400">(Centro Logístico Vitoria-Gasteiz)</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap pt-0.5">
                                    <div className="flex items-center gap-1">
                                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Presupuesto origen:</span>
                                        <span className="font-mono font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                            PRE-2026-0048 v1 (Firmado)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Posición:</span>
                                        <strong className="text-slate-700">Operario/a de almacén</strong>
                                        <span className="text-slate-400">({metrics.asignadas} de {metrics.totalPlazas} plazas cubiertas)</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Inicio pactado:</span>
                                        <strong className="text-slate-700">02 Mar 2026</strong>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span>Responsable:</span>
                                        <span className="font-medium text-slate-700">Elena Morán</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right actions */}
                            <div className="flex items-center gap-2.5 self-start lg:self-center">
                                <button
                                    onClick={() => {
                                        const target = expedientes.find(e => e.pasos.altaSS.estado === 'Pendiente') || expedientes[1];
                                        handleTriggerAction('altaSS', target);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                                >
                                    <ShieldCheck className="w-4 h-4" /> Tramitar Altas TGSS pendientes
                                </button>
                                <button
                                    onClick={() => showToast('Bandeja de envíos', 'Preparando lote de 3 contratos para envío masivo con firma OTP.')}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
                                >
                                    <FileSignature className="w-4 h-4" /> Enviar contratos a firma
                                </button>
                            </div>
                        </div>

                        {/* PETITION TABS NAVIGATION */}
                        <div className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 mt-4 pt-2 -mb-4">
                            {[
                                { id: 'resumen', label: 'Resumen' },
                                { id: 'presupuesto', label: 'Presupuesto heredado', icon: Lock },
                                { id: 'posiciones', label: 'Posiciones y turnos' },
                                { id: 'horarios', label: 'Horarios' },
                                { id: 'portales', label: 'Portales de empleo' },
                                { id: 'seleccion', label: 'Selección y candidatos', badge: '5/8' },
                                { id: 'laboral', label: 'Laboral (Altas / Contratos)', activeHighlight: true, badge: '5 asignados' },
                                { id: 'documentos', label: 'Documentos' },
                                { id: 'actividad', label: 'Actividad e histórico' }
                            ].map(tab => {
                                const isActive = activeRequestTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveRequestTab(tab.id)}
                                        className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-all ${
                                            isActive
                                                ? 'border-indigo-600 text-indigo-600 font-semibold bg-indigo-50/50'
                                                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                                        }`}
                                    >
                                        {tab.icon && <tab.icon className="w-3.5 h-3.5 text-slate-400" />}
                                        <span>{tab.label}</span>
                                        {tab.badge && (
                                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                                isActive ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                                            }`}>
                                                {tab.badge}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* WORKSPACE AREA */}
                    <div className="p-6 space-y-6">
                        {activeRequestTab !== 'laboral' ? (
                            /* FALLBACK / NOTICE FOR OTHER TABS IN DEMO */
                            <div className="bg-white rounded-xl p-8 border border-slate-200 text-center space-y-3 shadow-2xs">
                                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                                    <Layers className="w-6 h-6" />
                                </div>
                                <h3 className="text-base font-bold text-slate-800">
                                    Vista de la pestaña "{activeRequestTab.toUpperCase()}"
                                </h3>
                                <p className="text-xs text-slate-500 max-w-md mx-auto">
                                    Para este prototipo de validación nos estamos centrando en el flujo y la operativa de la pestaña <strong>Laboral</strong>.
                                </p>
                                <button
                                    onClick={() => setActiveRequestTab('laboral')}
                                    className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-xs"
                                >
                                    Volver a Pestaña Laboral
                                </button>
                            </div>
                        ) : (
                            /* PESTAÑA LABORAL CONTENT */
                            <>
                                {/* SUMMARY METRICS CARDS */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                                        <div className="flex items-center justify-between text-slate-500 text-xs">
                                            <span>Personas asignadas</span>
                                            <Users className="w-4 h-4 text-indigo-600" />
                                        </div>
                                        <div className="mt-2 flex items-baseline gap-2">
                                            <span className="text-2xl font-bold text-slate-900">{metrics.asignadas}</span>
                                            <span className="text-xs text-slate-400 font-medium">de {metrics.totalPlazas} plazas</span>
                                        </div>
                                        <div className="mt-2 text-[11px] text-slate-500">
                                            {metrics.vacantes} plazas pendientes en Selección
                                        </div>
                                    </div>

                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                                        <div className="flex items-center justify-between text-slate-500 text-xs">
                                            <span>Expedientes completos</span>
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <div className="mt-2 flex items-baseline gap-2">
                                            <span className="text-2xl font-bold text-emerald-600">{metrics.completos}</span>
                                            <span className="text-xs text-emerald-700 font-medium">listos para iniciar</span>
                                        </div>
                                        <div className="mt-2 text-[11px] text-slate-500">
                                            Contrato + SS + PRL + CPD OK
                                        </div>
                                    </div>

                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                                        <div className="flex items-center justify-between text-slate-500 text-xs">
                                            <span>Pendientes de acción</span>
                                            <Clock3 className="w-4 h-4 text-amber-500" />
                                        </div>
                                        <div className="mt-2 flex items-baseline gap-2">
                                            <span className="text-2xl font-bold text-amber-600">{metrics.pendientes}</span>
                                            <span className="text-xs text-slate-400 font-medium">en preparación</span>
                                        </div>
                                        <div className="mt-2 text-[11px] text-amber-600 font-medium">
                                            1 Alta SS + 1 Curso PRL + 1 CPD
                                        </div>
                                    </div>

                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                                        <div className="flex items-center justify-between text-slate-500 text-xs">
                                            <span>Bloqueos / Incidencias</span>
                                            <AlertTriangle className="w-4 h-4 text-rose-500" />
                                        </div>
                                        <div className="mt-2 flex items-baseline gap-2">
                                            <span className="text-2xl font-bold text-rose-600">{metrics.bloqueados}</span>
                                            <span className="text-xs text-rose-500 font-medium">requiere subsanar</span>
                                        </div>
                                        <div className="mt-2 text-[11px] text-slate-500">
                                            DNI caducado (Carlos Mendoza)
                                        </div>
                                    </div>

                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                                        <div className="flex items-center justify-between text-slate-500 text-xs">
                                            <span>Progreso Laboral Global</span>
                                            <span className="font-semibold text-slate-700">{metrics.porcentaje}%</span>
                                        </div>
                                        <div className="mt-2">
                                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                                                <div
                                                    className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                                                    style={{ width: `${Math.max(metrics.porcentaje, 15)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
                                            <span>Fecha inicio objetivo:</span>
                                            <strong className="text-slate-700">02/03/2026</strong>
                                        </div>
                                    </div>
                                </div>

                                {/* INFORMATIVE BANNER: READ-ONLY ECONOMIC DATA FROM BUDGET */}
                                <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-1.5 rounded-lg bg-slate-200 text-slate-700">
                                            <Lock className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <span className="font-semibold text-slate-800">Condiciones económicas heredadas del presupuesto: </span>
                                            <span className="text-slate-600">Salario base 1.540,00 €/mes | Precio hora facturación 17,45 €/h | Convenio Logística Provincial | Coeficiente 1,48.</span>
                                        </div>
                                    </div>
                                    <span className="text-[11px] text-slate-400 whitespace-nowrap bg-white px-2 py-1 rounded border border-slate-200">
                                        Solo lectura (Gestionado en Presupuestos)
                                    </span>
                                </div>

                                {/* TOOLBAR & FILTERS */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        {/* Left Filters */}
                                        <div className="flex items-center gap-2 flex-wrap flex-1">
                                            <div className="relative min-w-[200px]">
                                                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                                                <input
                                                    type="text"
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    placeholder="Buscar por nombre, DNI o NIF..."
                                                    className="w-full bg-slate-50 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                />
                                            </div>

                                            <select
                                                value={filterEstado}
                                                onChange={(e) => setFilterEstado(e.target.value)}
                                                className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                            >
                                                <option value="todos">Todos los estados</option>
                                                <option value="Completado">Completados</option>
                                                <option value="En preparación">En preparación</option>
                                                <option value="Bloqueado">Bloqueados</option>
                                            </select>

                                            <select
                                                value={filterTarea}
                                                onChange={(e) => setFilterTarea(e.target.value)}
                                                className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                            >
                                                <option value="todas">Cualquier tarea pendiente</option>
                                                <option value="altaSS">Pendientes de Alta TGSS</option>
                                                <option value="prl">Pendientes de Curso PRL</option>
                                                <option value="contrato">Pendientes de Firma Contrato</option>
                                                <option value="cpd">Pendientes de CPD</option>
                                            </select>

                                            <select
                                                value={filterResponsable}
                                                onChange={(e) => setFilterResponsable(e.target.value)}
                                                className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 hidden md:block"
                                            >
                                                <option value="todos">Todos los responsables</option>
                                                <option value="Elena Morán">Elena Morán</option>
                                                <option value="Carlos Valdés">Carlos Valdés</option>
                                            </select>

                                            {(searchTerm || filterEstado !== 'todos' || filterTarea !== 'todas' || filterResponsable !== 'todos') && (
                                                <button
                                                    onClick={() => {
                                                        setSearchTerm('');
                                                        setFilterEstado('todos');
                                                        setFilterTarea('todas');
                                                        setFilterResponsable('todos');
                                                    }}
                                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1"
                                                >
                                                    Limpiar filtros
                                                </button>
                                            )}
                                        </div>

                                        {/* Right layout toggles & global jump */}
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                                                <button
                                                    onClick={() => setViewMode('tabla')}
                                                    className={`px-2.5 py-1 rounded-md transition-colors ${viewMode === 'tabla' ? 'bg-white shadow-2xs font-semibold text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
                                                >
                                                    Tabla de Expedientes
                                                </button>
                                                <button
                                                    onClick={() => setViewMode('tarjetas')}
                                                    className={`px-2.5 py-1 rounded-md transition-colors ${viewMode === 'tarjetas' ? 'bg-white shadow-2xs font-semibold text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
                                                >
                                                    Tarjetas Visuales
                                                </button>
                                            </div>

                                            <button
                                                onClick={() => setViewGlobalLaboral(true)}
                                                className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
                                                title="Ver la bandeja agregada con todas las peticiones de la empresa"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5 text-slate-500" /> Ver Bandeja Laboral
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* EXPEDIENTES WORKSPACE (TABLE OR CARDS) */}
                                {viewMode === 'tabla' ? (
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                                                        <th className="py-3 px-4">Plaza / Candidato</th>
                                                        <th className="py-3 px-3">Estado General</th>
                                                        <th className="py-3 px-3">Checklist Laboral (Procesos)</th>
                                                        <th className="py-3 px-3">Próxima Tarea / Límite</th>
                                                        <th className="py-3 px-3">Progreso</th>
                                                        <th className="py-3 px-4 text-right">Acciones Rápidas</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {expedientesFiltrados.map((exp) => (
                                                        <tr
                                                            key={exp.id}
                                                            className={`hover:bg-slate-50/80 transition-colors ${
                                                                exp.bloqueante ? 'bg-rose-50/30' : ''
                                                            }`}
                                                        >
                                                            {/* Candidate Name & Link to Ficha */}
                                                            <td className="py-3.5 px-4">
                                                                <div className="flex items-center gap-3">
                                                                    <img
                                                                        src={exp.foto}
                                                                        alt={exp.nombre}
                                                                        className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                                                                    />
                                                                    <div>
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                                                                                Plaza #{exp.plazaNumero}
                                                                            </span>
                                                                            <button
                                                                                onClick={() => handleOpenExpediente(exp)}
                                                                                className="font-semibold text-slate-900 hover:text-indigo-600 hover:underline text-left"
                                                                            >
                                                                                {exp.nombre}
                                                                            </button>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                                                            <span className="font-mono">{exp.nif}</span>
                                                                            <span>•</span>
                                                                            <button
                                                                                onClick={() => showToast('Ficha de Candidato', `Abriendo ficha global de ${exp.nombre} (${exp.candidatoId}) en módulo Candidatos.`)}
                                                                                className="text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-0.5"
                                                                                title="Ver ficha maestra del candidato"
                                                                            >
                                                                                Ficha personal <ArrowUpRight className="w-2.5 h-2.5" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            {/* Global Status */}
                                                            <td className="py-3.5 px-3 whitespace-nowrap">
                                                                {getStatusBadge(exp.estadoGlobal)}
                                                                <div className="text-[10px] text-slate-400 mt-1">
                                                                    Resp: {exp.responsable}
                                                                </div>
                                                            </td>

                                                            {/* Checklist / Pipeline Stages */}
                                                            <td className="py-3.5 px-3">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    {renderStepPill('doc', exp.pasos.documentacion, 'Doc', () => handleOpenExpediente(exp))}
                                                                    {renderStepPill('alta', exp.pasos.altaSS, 'Alta SS', () => {
                                                                        if (exp.pasos.altaSS.estado !== 'Confirmado' && !exp.bloqueante) handleTriggerAction('altaSS', exp);
                                                                        else handleOpenExpediente(exp);
                                                                    })}
                                                                    {renderStepPill('prl', exp.pasos.prl, 'PRL', () => {
                                                                        if (exp.pasos.prl.estado !== 'Confirmado') handleTriggerAction('prl', exp);
                                                                        else handleOpenExpediente(exp);
                                                                    })}
                                                                    {renderStepPill('contrato', exp.pasos.contrato, 'Contrato', () => {
                                                                        if (exp.pasos.contrato.estado !== 'Firmado') handleTriggerAction('contrato', exp);
                                                                        else handleOpenExpediente(exp);
                                                                    })}
                                                                    {renderStepPill('cpd', exp.pasos.cpd, 'CPD', () => {
                                                                        if (exp.pasos.cpd.estado !== 'Confirmado') handleTriggerAction('cpd', exp);
                                                                        else handleOpenExpediente(exp);
                                                                    })}
                                                                </div>
                                                            </td>

                                                            {/* Next Task */}
                                                            <td className="py-3.5 px-3">
                                                                <div className="max-w-[200px]">
                                                                    <p className={`font-medium leading-tight ${exp.bloqueante ? 'text-rose-700 font-semibold' : 'text-slate-800'}`}>
                                                                        {exp.proximaTarea}
                                                                    </p>
                                                                    <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                                        <Calendar className="w-3 h-3 text-slate-400" /> Inicio: {exp.fechaIncorporacion}
                                                                    </span>
                                                                </div>
                                                            </td>

                                                            {/* Progress */}
                                                            <td className="py-3.5 px-3">
                                                                <div className="w-24">
                                                                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1">
                                                                        <span>{exp.progreso}%</span>
                                                                    </div>
                                                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                                        <div
                                                                            className={`h-1.5 rounded-full ${
                                                                                exp.progreso === 100 ? 'bg-emerald-500' :
                                                                                exp.bloqueante ? 'bg-rose-500' : 'bg-indigo-600'
                                                                            }`}
                                                                            style={{ width: `${exp.progreso}%` }}
                                                                        ></div>
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            {/* Actions */}
                                                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    {exp.bloqueante ? (
                                                                        <button
                                                                            onClick={() => handleTriggerAction('subsanar', exp)}
                                                                            className="inline-flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                                                                        >
                                                                            <AlertCircle className="w-3.5 h-3.5" /> Subsanar
                                                                        </button>
                                                                    ) : exp.pasos.altaSS.estado === 'Pendiente' ? (
                                                                        <button
                                                                            onClick={() => handleTriggerAction('altaSS', exp)}
                                                                            className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                                                                        >
                                                                            <ShieldCheck className="w-3.5 h-3.5" /> Preparar Alta SS
                                                                        </button>
                                                                    ) : exp.pasos.prl.estado === 'Pendiente' ? (
                                                                        <button
                                                                            onClick={() => handleTriggerAction('prl', exp)}
                                                                            className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                                                                        >
                                                                            <GraduationCap className="w-3.5 h-3.5" /> Asignar Curso
                                                                        </button>
                                                                    ) : exp.pasos.contrato.estado !== 'Firmado' ? (
                                                                        <button
                                                                            onClick={() => handleTriggerAction('contrato', exp)}
                                                                            className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                                                                        >
                                                                            <FileSignature className="w-3.5 h-3.5" /> Enviar Firma
                                                                        </button>
                                                                    ) : exp.pasos.cpd.estado !== 'Confirmado' ? (
                                                                        <button
                                                                            onClick={() => handleTriggerAction('cpd', exp)}
                                                                            className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-900 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                                                                        >
                                                                            <Send className="w-3.5 h-3.5" /> Enviar CPD
                                                                        </button>
                                                                    ) : (
                                                                        <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                                                                            <CheckCircle2 className="w-3.5 h-3.5" /> Todo listo
                                                                        </span>
                                                                    )}

                                                                    <button
                                                                        onClick={() => handleOpenExpediente(exp)}
                                                                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                                        title="Abrir expediente laboral completo"
                                                                    >
                                                                        <Eye className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}

                                                    {/* VACANT SLOTS ROWS */}
                                                    {PLAZAS_VACANTES.map(v => (
                                                        <tr key={v.plazaNumero} className="bg-slate-50/50 text-slate-400">
                                                            <td className="py-3 px-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-9 h-9 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 bg-white">
                                                                        <UserPlus className="w-4 h-4" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="text-[10px] font-mono bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded">
                                                                                Plaza #{v.plazaNumero}
                                                                            </span>
                                                                            <span className="font-medium text-slate-500 italic">Plaza Vacante</span>
                                                                        </div>
                                                                        <div className="text-[11px] text-slate-400">Sin candidato asignado</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-3">
                                                                <span className="text-xs text-slate-400 italic">Esperando selección</span>
                                                            </td>
                                                            <td className="py-3 px-3" colSpan="2">
                                                                <span className="text-xs text-slate-400">
                                                                    La operativa laboral se activará automáticamente al asignar candidato en la pestaña de Selección.
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-3">
                                                                <span className="text-xs text-slate-400">0%</span>
                                                            </td>
                                                            <td className="py-3 px-4 text-right">
                                                                <button
                                                                    onClick={() => {
                                                                        setActiveRequestTab('seleccion');
                                                                        showToast('Navegando', `Redirigiendo a Selección para buscar y asignar candidato a Plaza #${v.plazaNumero}.`);
                                                                    }}
                                                                    className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1.5 rounded-lg transition-colors"
                                                                >
                                                                    <UserCheck className="w-3.5 h-3.5" /> Asignar Candidato
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    /* CARDS VIEW */
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {expedientesFiltrados.map((exp) => (
                                            <div
                                                key={exp.id}
                                                className={`bg-white rounded-xl border p-4 shadow-2xs flex flex-col justify-between transition-all hover:shadow-md ${
                                                    exp.bloqueante ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'
                                                }`}
                                            >
                                                <div>
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex items-center gap-3">
                                                            <img src={exp.foto} alt={exp.nombre} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                                                            <div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1 rounded">
                                                                        Plaza #{exp.plazaNumero}
                                                                    </span>
                                                                    <h4 className="font-bold text-slate-900 text-sm hover:text-indigo-600 cursor-pointer" onClick={() => handleOpenExpediente(exp)}>
                                                                        {exp.nombre}
                                                                    </h4>
                                                                </div>
                                                                <p className="text-xs text-slate-500 font-mono">{exp.nif}</p>
                                                            </div>
                                                        </div>
                                                        {getStatusBadge(exp.estadoGlobal)}
                                                    </div>

                                                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="text-slate-500">Progreso checklist:</span>
                                                            <span className="font-semibold text-slate-700">{exp.progreso}%</span>
                                                        </div>
                                                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                            <div
                                                                className={`h-1.5 rounded-full ${exp.progreso === 100 ? 'bg-emerald-500' : exp.bloqueante ? 'bg-rose-500' : 'bg-indigo-600'}`}
                                                                style={{ width: `${exp.progreso}%` }}
                                                            ></div>
                                                        </div>

                                                        {/* Mini Pipeline */}
                                                        <div className="flex items-center justify-between pt-2 text-[10px] text-slate-500">
                                                            <div className={`p-1 rounded ${exp.pasos.altaSS.estado === 'Confirmado' ? 'text-emerald-700 bg-emerald-50' : 'text-slate-400 bg-slate-100'}`}>
                                                                Alta SS
                                                            </div>
                                                            <div className={`p-1 rounded ${exp.pasos.prl.estado === 'Confirmado' ? 'text-emerald-700 bg-emerald-50' : 'text-slate-400 bg-slate-100'}`}>
                                                                PRL
                                                            </div>
                                                            <div className={`p-1 rounded ${exp.pasos.contrato.estado === 'Firmado' ? 'text-emerald-700 bg-emerald-50' : 'text-slate-400 bg-slate-100'}`}>
                                                                Contrato
                                                            </div>
                                                            <div className={`p-1 rounded ${exp.pasos.cpd.estado === 'Confirmado' ? 'text-emerald-700 bg-emerald-50' : 'text-slate-400 bg-slate-100'}`}>
                                                                CPD
                                                            </div>
                                                        </div>

                                                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 text-xs mt-2">
                                                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-0.5">Próxima acción:</span>
                                                            <p className={`font-semibold ${exp.bloqueante ? 'text-rose-700' : 'text-slate-800'}`}>
                                                                {exp.proximaTarea}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                                    <button
                                                        onClick={() => handleOpenExpediente(exp)}
                                                        className="text-xs text-slate-600 hover:text-slate-900 font-medium py-1.5 px-2 rounded-lg hover:bg-slate-100"
                                                    >
                                                        Ver detalles
                                                    </button>

                                                    {exp.bloqueante ? (
                                                        <button
                                                            onClick={() => handleTriggerAction('subsanar', exp)}
                                                            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                                                        >
                                                            Subsanar bloqueo
                                                        </button>
                                                    ) : exp.pasos.altaSS.estado === 'Pendiente' ? (
                                                        <button
                                                            onClick={() => handleTriggerAction('altaSS', exp)}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                                                        >
                                                            Preparar Alta
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleOpenExpediente(exp)}
                                                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                                                        >
                                                            Abrir expediente
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* ACTIVITY & AUDIT TIMELINE AT BOTTOM */}
                                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Clock3 className="w-4 h-4 text-indigo-600" />
                                            <h3 className="text-sm font-bold text-slate-800">
                                                Línea de Actividad Laboral y Sucesos de la Petición
                                            </h3>
                                        </div>
                                        <span className="text-xs text-slate-400">Actualizado en tiempo real</span>
                                    </div>

                                    <div className="space-y-3">
                                        {actividadList.map((item) => (
                                            <div key={item.id} className="flex items-start gap-3 text-xs pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                                                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                                    item.tipo === 'success' ? 'bg-emerald-500 ring-4 ring-emerald-50' :
                                                    item.tipo === 'warning' ? 'bg-rose-500 ring-4 ring-rose-50' :
                                                    item.tipo === 'info' ? 'bg-blue-500 ring-4 ring-blue-50' : 'bg-slate-400 ring-4 ring-slate-100'
                                                }`}></div>
                                                <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                                    <div>
                                                        <span className="font-semibold text-slate-800">{item.accion}</span>
                                                        {item.candidato && (
                                                            <span className="text-slate-600"> — Candidato/a: <strong>{item.candidato}</strong></span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                                                        <span>{item.autor}</span>
                                                        <span>•</span>
                                                        <span>{item.hora}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </main>
            </div>

            {/* INTERACTIVE EXPEDIENTE SIDEBAR DRAWER */}
            {isDrawerOpen && selectedExpediente && (
                <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
                    {/* Backdrop */}
                    <div
                        onClick={() => setIsDrawerOpen(false)}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
                    ></div>

                    {/* Drawer Content */}
                    <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-200 animate-in slide-in-from-right duration-300">
                        {/* Drawer Header */}
                        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <img
                                    src={selectedExpediente.foto}
                                    alt={selectedExpediente.nombre}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-indigo-400"
                                />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded border border-indigo-400/40">
                                            Plaza #{selectedExpediente.plazaNumero} • {selectedExpediente.id}
                                        </span>
                                        {selectedExpediente.bloqueante && (
                                            <span className="text-xs bg-rose-500 text-white font-semibold px-2 py-0.5 rounded">
                                                Bloqueado
                                            </span>
                                        )}
                                    </div>
                                    <h2 className="text-lg font-bold text-white mt-0.5">{selectedExpediente.nombre}</h2>
                                    <p className="text-xs text-slate-300 font-mono">{selectedExpediente.nif} • {selectedExpediente.categoria}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsDrawerOpen(false)}
                                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Context Bar */}
                        <div className="bg-slate-100 px-5 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
                            <div className="flex items-center gap-2">
                                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                                <span>Petición: <strong>PET-2026-0048</strong> (Trans-Logística Ibérica Norte)</span>
                            </div>
                            <button
                                onClick={() => showToast('Módulo Candidatos', `Abriendo ficha maestra de ${selectedExpediente.nombre}`)}
                                className="text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1"
                            >
                                Ficha Candidato <ExternalLink className="w-3 h-3" />
                            </button>
                        </div>

                        {/* Internal Tabs */}
                        <div className="flex border-b border-slate-200 px-5 text-xs font-medium">
                            <button
                                onClick={() => setDrawerInternalTab('checklist')}
                                className={`py-3 px-3 border-b-2 transition-colors ${drawerInternalTab === 'checklist' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                Checklist y Procesos
                            </button>
                            <button
                                onClick={() => setDrawerInternalTab('afiliacion')}
                                className={`py-3 px-3 border-b-2 transition-colors ${drawerInternalTab === 'afiliacion' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                Datos de Afiliación / SS
                            </button>
                            <button
                                onClick={() => setDrawerInternalTab('documentos')}
                                className={`py-3 px-3 border-b-2 transition-colors ${drawerInternalTab === 'documentos' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                Documentos y Contratos
                            </button>
                        </div>

                        {/* Drawer Body */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
                            {drawerInternalTab === 'checklist' && (
                                <div className="space-y-4">
                                    {/* Progress overview */}
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-semibold text-slate-700">Estado global del expediente:</span>
                                            <span className="font-bold text-sm text-indigo-600">{selectedExpediente.progreso}% completado</span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-3">
                                            <div
                                                className={`h-2 rounded-full ${selectedExpediente.progreso === 100 ? 'bg-emerald-500' : selectedExpediente.bloqueante ? 'bg-rose-500' : 'bg-indigo-600'}`}
                                                style={{ width: `${selectedExpediente.progreso}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-slate-600">
                                            Próxima tarea clave: <strong>{selectedExpediente.proximaTarea}</strong>
                                        </p>
                                    </div>

                                    {/* Stage 1: Documentación */}
                                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3 shadow-2xs">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="w-5 h-5 rounded-full bg-slate-100 font-bold flex items-center justify-center text-slate-600 text-[10px]">1</span>
                                                <h4 className="font-bold text-slate-800">Documentación de Filiación</h4>
                                                {getStatusBadge(selectedExpediente.pasos.documentacion.estado)}
                                            </div>
                                            <p className="text-slate-500 pl-7">{selectedExpediente.pasos.documentacion.detalle}</p>
                                            <span className="text-[10px] text-slate-400 pl-7 block">Fecha: {selectedExpediente.pasos.documentacion.fecha}</span>
                                        </div>

                                        {selectedExpediente.pasos.documentacion.estado === 'Error' ? (
                                            <button
                                                onClick={() => handleTriggerAction('subsanar', selectedExpediente)}
                                                className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg font-semibold"
                                            >
                                                Subsanar DNI
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => showToast('Documentación', 'Expediente documental validado correctamente.')}
                                                className="text-slate-600 hover:text-slate-900 border border-slate-200 px-2.5 py-1 rounded hover:bg-slate-50"
                                            >
                                                Ver archivos
                                            </button>
                                        )}
                                    </div>

                                    {/* Stage 2: Alta Seguridad Social */}
                                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3 shadow-2xs">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="w-5 h-5 rounded-full bg-slate-100 font-bold flex items-center justify-center text-slate-600 text-[10px]">2</span>
                                                <h4 className="font-bold text-slate-800">Alta en Seguridad Social (TGSS)</h4>
                                                {getStatusBadge(selectedExpediente.pasos.altaSS.estado)}
                                            </div>
                                            <p className="text-slate-500 pl-7">{selectedExpediente.pasos.altaSS.detalle}</p>
                                            <span className="text-[10px] text-slate-400 pl-7 block">Tipo afiliación: Cuenta cotización Régimen General 0111</span>
                                        </div>

                                        {selectedExpediente.pasos.altaSS.estado !== 'Confirmado' && !selectedExpediente.bloqueante && (
                                            <button
                                                onClick={() => handleTriggerAction('altaSS', selectedExpediente)}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-semibold shadow-xs"
                                            >
                                                Preparar Alta
                                            </button>
                                        )}
                                    </div>

                                    {/* Stage 3: Cursos / Formación PRL */}
                                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3 shadow-2xs">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="w-5 h-5 rounded-full bg-slate-100 font-bold flex items-center justify-center text-slate-600 text-[10px]">3</span>
                                                <h4 className="font-bold text-slate-800">Formación y Prevención (PRL)</h4>
                                                {getStatusBadge(selectedExpediente.pasos.prl.estado)}
                                            </div>
                                            <p className="text-slate-500 pl-7">{selectedExpediente.pasos.prl.detalle}</p>
                                            <span className="text-[10px] text-slate-400 pl-7 block">Requisito puesto: Básico Logística + Manejo Transpaletas</span>
                                        </div>

                                        {selectedExpediente.pasos.prl.estado !== 'Confirmado' && (
                                            <button
                                                onClick={() => handleTriggerAction('prl', selectedExpediente)}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-semibold shadow-xs"
                                            >
                                                Asignar Curso
                                            </button>
                                        )}
                                    </div>

                                    {/* Stage 4: Firma Contrato Laboral */}
                                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3 shadow-2xs">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="w-5 h-5 rounded-full bg-slate-100 font-bold flex items-center justify-center text-slate-600 text-[10px]">4</span>
                                                <h4 className="font-bold text-slate-800">Contrato Laboral ETT</h4>
                                                {getStatusBadge(selectedExpediente.pasos.contrato.estado)}
                                            </div>
                                            <p className="text-slate-500 pl-7">{selectedExpediente.pasos.contrato.detalle}</p>
                                            <span className="text-[10px] text-slate-400 pl-7 block">Modalidad: Contrato por circunstancias de la producción</span>
                                        </div>

                                        {selectedExpediente.pasos.contrato.estado !== 'Firmado' && (
                                            <button
                                                onClick={() => handleTriggerAction('contrato', selectedExpediente)}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-semibold shadow-xs"
                                            >
                                                Enviar a Firma
                                            </button>
                                        )}
                                    </div>

                                    {/* Stage 5: CPD (Contrato Puesta a Disposición) */}
                                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3 shadow-2xs">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="w-5 h-5 rounded-full bg-slate-100 font-bold flex items-center justify-center text-slate-600 text-[10px]">5</span>
                                                <h4 className="font-bold text-slate-800">Contrato Puesta Disposición (CPD)</h4>
                                                {getStatusBadge(selectedExpediente.pasos.cpd.estado)}
                                            </div>
                                            <p className="text-slate-500 pl-7">{selectedExpediente.pasos.cpd.detalle}</p>
                                            <span className="text-[10px] text-slate-400 pl-7 block">Vínculo con cliente: Trans-Logística Ibérica Norte</span>
                                        </div>

                                        {selectedExpediente.pasos.cpd.estado !== 'Confirmado' && (
                                            <button
                                                onClick={() => handleTriggerAction('cpd', selectedExpediente)}
                                                className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg font-semibold"
                                            >
                                                Tramitar CPD
                                            </button>
                                        )}
                                    </div>

                                    {/* Stage 6: Fin de Contrato Planificado */}
                                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="w-5 h-5 rounded-full bg-slate-200 font-bold flex items-center justify-center text-slate-600 text-[10px]">6</span>
                                                <h4 className="font-bold text-slate-700">Cierre / Fin de Contrato Previsto</h4>
                                                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono">30/06/2026</span>
                                            </div>
                                            <p className="text-slate-500 pl-7">Recordatorio automático de preaviso y finiquito 15 días antes del vencimiento.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {drawerInternalTab === 'afiliacion' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <div>
                                            <span className="text-slate-400 block text-[10px] uppercase">NIF / NIE</span>
                                            <span className="font-bold text-slate-800 font-mono">{selectedExpediente.nif}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[10px] uppercase">NUSS (Seg. Social)</span>
                                            <span className="font-bold text-slate-800 font-mono">28 10928374 91</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[10px] uppercase">Código Cuenta Cotización</span>
                                            <span className="font-bold text-slate-800 font-mono">0111-28-99382104</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[10px] uppercase">Grupo Cotización</span>
                                            <span className="font-bold text-slate-800">Grupo 8 - Oficiales primera y segunda</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[10px] uppercase">CNAE Petición</span>
                                            <span className="font-bold text-slate-800">5210 - Depósito y almacenamiento</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[10px] uppercase">Coeficiente Jornada</span>
                                            <span className="font-bold text-slate-800">1,00 (100% - 40h/sem)</span>
                                        </div>
                                    </div>

                                    <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                                        <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                                            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Registro Telemático SILTRA / RED
                                        </h4>
                                        <p className="text-slate-600">
                                            Las transacciones con la Tesorería General de la Seguridad Social se procesan mediante la pasarela directa con certificado electrónico corporativo de <strong>ETT Global Servicios Temporales, S.L.</strong>
                                        </p>
                                        <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-lg border border-emerald-200 font-mono text-[11px]">
                                            IDC Generado: #TGSS-RED-2026-0048-0{selectedExpediente.plazaNumero}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {drawerInternalTab === 'documentos' && (
                                <div className="space-y-3">
                                    {[
                                        { nombre: `Contrato_Laboral_${selectedExpediente.nombre.replace(/\s+/g, '_')}.pdf`, tipo: 'Contrato firmado OTP', fecha: '25 Feb 2026', size: '245 KB' },
                                        { nombre: `CPD_Puesta_Disposicion_TransLogistica.pdf`, tipo: 'CPD ETT-Usuaria', fecha: '26 Feb 2026', size: '180 KB' },
                                        { nombre: `Certificado_PRL_Logistica_20h.pdf`, tipo: 'Prevención Riesgos', fecha: '24 Feb 2026', size: '512 KB' },
                                        { nombre: `IDC_Alta_Seguridad_Social.pdf`, tipo: 'Informe TGSS', fecha: '24 Feb 2026', size: '94 KB' }
                                    ].map((doc, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <FileText className="w-5 h-5 text-indigo-600" />
                                                <div>
                                                    <div className="font-semibold text-slate-800">{doc.nombre}</div>
                                                    <div className="text-[10px] text-slate-400">{doc.tipo} • {doc.fecha} • {doc.size}</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => showToast('Descarga iniciada', `Descargando ${doc.nombre}`)}
                                                className="p-1.5 text-slate-500 hover:text-indigo-600 rounded hover:bg-white border border-slate-200"
                                                title="Descargar documento"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Drawer Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                            <button
                                onClick={() => setIsDrawerOpen(false)}
                                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                            >
                                Cerrar panel
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setIsDrawerOpen(false);
                                        handleTriggerAction('altaSS', selectedExpediente);
                                    }}
                                    className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                                >
                                    Ejecutar Próxima Acción
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ACTION EXECUTION (ALTA SS / CURSO PRL / FIRMA / CPD / SUBSANAR) */}
            {modalConfig.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                                    {modalConfig.tipo === 'altaSS' && <ShieldCheck className="w-5 h-5 text-emerald-600" />}
                                    {modalConfig.tipo === 'prl' && <GraduationCap className="w-5 h-5 text-indigo-600" />}
                                    {modalConfig.tipo === 'contrato' && <FileSignature className="w-5 h-5 text-blue-600" />}
                                    {modalConfig.tipo === 'cpd' && <Send className="w-5 h-5 text-slate-800" />}
                                    {modalConfig.tipo === 'subsanar' && <AlertCircle className="w-5 h-5 text-rose-600" />}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">{modalConfig.titulo}</h3>
                                    <p className="text-[11px] text-slate-500">Petición PET-2026-0048 • Plaza #{modalConfig.expediente?.plazaNumero}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}
                                className="text-slate-400 hover:text-slate-600 p-1"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Body with Multi-State */}
                        <div className="p-6 text-xs">
                            {modalConfig.step === 'form' && (
                                <div className="space-y-4">
                                    {modalConfig.tipo === 'altaSS' && (
                                        <div className="space-y-3">
                                            <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-200">
                                                <p className="font-semibold">Conexión con TGSS Sistema RED lista</p>
                                                <p className="text-[11px] mt-0.5">Se enviará el fichero AFI de Alta Previa con fecha de efecto <strong>02/03/2026</strong>.</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-slate-500 font-semibold block mb-1">C.C.C. Empresa</label>
                                                    <input type="text" readOnly value="0111-28-99382104 (Principal ETT)" className="w-full bg-slate-100 p-2 rounded border border-slate-200 text-slate-700" />
                                                </div>
                                                <div>
                                                    <label className="text-slate-500 font-semibold block mb-1">Tipo de Contrato</label>
                                                    <input type="text" readOnly value="401 - Circunstancias producción" className="w-full bg-slate-100 p-2 rounded border border-slate-200 text-slate-700" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-slate-500 font-semibold block mb-1">Observaciones para el fichero AFI</label>
                                                <textarea defaultValue="Alta ordinaria petición PET-2026-0048 almacén." rows="2" className="w-full bg-white p-2 rounded border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"></textarea>
                                            </div>
                                        </div>
                                    )}

                                    {modalConfig.tipo === 'prl' && (
                                        <div className="space-y-3">
                                            <p className="text-slate-600">Selecciona el módulo formativo requerido por el puesto de trabajo en la empresa usuaria:</p>
                                            <div className="space-y-2">
                                                <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-indigo-200 bg-indigo-50/50 cursor-pointer">
                                                    <input type="radio" defaultChecked name="curso" className="mt-0.5 text-indigo-600" />
                                                    <div>
                                                        <strong className="text-slate-800 block">Curso Básico de Seguridad en Logística y Almacén (20h)</strong>
                                                        <span className="text-slate-500 text-[11px]">Plataforma e-learning propia + test de evaluación obligatorio</span>
                                                    </div>
                                                </label>
                                                <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                                    <input type="radio" name="curso" className="mt-0.5 text-indigo-600" />
                                                    <div>
                                                        <strong className="text-slate-800 block">Convalidar por certificado previo aportado (&lt; 1 año)</strong>
                                                        <span className="text-slate-500 text-[11px]">Requiere adjuntar justificante oficial</span>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {modalConfig.tipo === 'contrato' && (
                                        <div className="space-y-3">
                                            <p className="text-slate-600">Se generará el contrato laboral digital con las condiciones económicas del presupuesto <strong>PRE-2026-0048</strong> y se remitirá por SMS/Email:</p>
                                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 text-[11px]">
                                                <div>Destinatario: <strong>{modalConfig.expediente?.nombre}</strong> ({modalConfig.expediente?.telefono})</div>
                                                <div>Método de firma: <strong>Código OTP SMS certificado</strong></div>
                                                <div>Plazo máximo de firma: <strong>24 horas antes de inicio</strong></div>
                                            </div>
                                        </div>
                                    )}

                                    {modalConfig.tipo === 'cpd' && (
                                        <div className="space-y-3">
                                            <p className="text-slate-600">Envío del Contrato de Puesta a Disposición (CPD) a la empresa usuaria <strong>Trans-Logística Ibérica Norte, S.A.</strong>:</p>
                                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                                                <div>Firmante empresa: <strong>Roberto Méndez (Dir. RRHH)</strong></div>
                                                <div>Canal de envío: <strong>Portal Cliente B2B TramitNow + Email</strong></div>
                                            </div>
                                        </div>
                                    )}

                                    {modalConfig.tipo === 'subsanar' && (
                                        <div className="space-y-3">
                                            <div className="bg-rose-50 text-rose-800 p-3 rounded-lg border border-rose-200">
                                                <strong className="block">Incidencia registrada:</strong>
                                                <span>DNI caducado en registro inicial. El candidato ha aportado resguardo de renovación.</span>
                                            </div>
                                            <div>
                                                <label className="text-slate-500 font-semibold block mb-1">Nueva fecha de validez DNI</label>
                                                <input type="date" defaultValue="2031-02-20" className="w-full bg-white p-2 rounded border border-slate-200" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {modalConfig.step === 'loading' && (
                                <div className="py-8 text-center space-y-4">
                                    <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">Procesando operación con los servicios externos...</p>
                                        <p className="text-slate-500 text-xs mt-1">Conectando con pasarelas, validando datos y actualizando expediente.</p>
                                    </div>
                                </div>
                            )}

                            {modalConfig.step === 'success' && (
                                <div className="py-6 text-center space-y-3">
                                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                                        <CheckCircle2 className="w-7 h-7" />
                                    </div>
                                    <h4 className="text-base font-bold text-slate-900">¡Operación Realizada con Éxito!</h4>
                                    <p className="text-slate-600 max-w-sm mx-auto">{modalConfig.mensaje}</p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                            {modalConfig.step === 'form' && (
                                <>
                                    <button
                                        onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}
                                        className="px-3.5 py-2 rounded-lg text-slate-600 hover:bg-slate-200 font-medium"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleExecuteAction}
                                        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
                                    >
                                        Confirmar y Ejecutar
                                    </button>
                                </>
                            )}

                            {modalConfig.step === 'success' && (
                                <button
                                    onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}
                                    className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                                >
                                    Aceptar y Continuar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
