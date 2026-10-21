// GENERADO desde design/fichaett.html con scripts/import-design.py.
// Contenido del diseño tal cual; se irá sustituyendo por componentes reales.
import React, { useState, useEffect, useMemo } from 'react';
import {
    Building2, ShieldCheck, FileText, Users, MapPin, Receipt, History, AlertTriangle,
    CheckCircle2, Clock, Plus, Edit3, Trash2, ExternalLink, Download, Upload, Copy,
    Lock, Unlock, ChevronRight, Search, Filter, MoreVertical, X, Check, Info,
    CreditCard, Sparkles, Sliders, Globe, Mail, Phone, Briefcase, FileSpreadsheet,
    Key, Layers, ArrowRight, Save, RefreshCw, AlertCircle, Eye, UserPlus, EyeOff
} from 'lucide-react';

// Initial Mock Database for "Mi ETT"
const initialCompanyData = {
    legalName: "ETT Global Servicios Temporales, S.L.",
    tradeName: "ETT Global People",
    cif: "B-87654321",
    companyType: "Sociedad Limitada (S.L.)",
    country: "España",
    address: "Paseo de Gràcia 45, Planta 4ª",
    postalCode: "08007",
    city: "Barcelona",
    province: "Barcelona",
    phone: "+34 934 88 90 00",
    email: "central@ettglobal.es",
    adminEmail: "administracion@ettglobal.es",
    web: "https://www.ettglobalpeople.es",
    logoUrl: "https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=150&auto=format&fit=crop&q=80",
    completionRate: 82,
    lastUpdated: "Hoy a las 10:45 por Ana López (CEO)",
    // Facturación
    billingSeries: "ETT-2025-",
    invoicePrefix: "FAC25",
    vatRate: "21%",
    withholdingRate: "0%",
    iban: "", // purposefully empty for alert
    swiftBic: "BBVAESMMXXX",
    paymentMethod: "Transferencia bancaria",
    customPaymentMethod: "",
    paymentTerms: "30 días fecha factura",
    currency: "EUR (€)",
    billingAddressSameAsFiscal: true,
    billingBranchMode: "centralized", // centralized | per_branch
    // Stats
    fiscalComplete: true,
    billingComplete: false,
};

const initialBranches = [
    { id: 'bcn', code: 'SUC-01', name: 'Sucursal Barcelona (Central)', city: 'Barcelona', address: 'Paseo de Gràcia 45', phone: '+34 934 88 90 00', email: 'barcelona@ettglobal.es', manager: 'Laura García', activeUsers: 9, completion: 100, status: 'active', isHeadquarters: true },
    { id: 'gir', code: 'SUC-02', name: 'Sucursal Girona', city: 'Girona', address: 'Carrer Migdia 22, 1º B', phone: '+34 972 12 34 56', email: 'girona@ettglobal.es', manager: 'Marc Soler', activeUsers: 5, completion: 86, status: 'active', isHeadquarters: false },
    { id: 'lle', code: 'SUC-03', name: 'Sucursal Lleida', city: 'Lleida', address: 'Av. Prat de la Riba 14', phone: '+34 973 99 88 77', email: 'lleida@ettglobal.es', manager: null, activeUsers: 4, completion: 64, status: 'active', isHeadquarters: false }
];

const initialUsers = [
    { id: 1, name: 'Ana López', email: 'ana.lopez@ettglobal.es', role: 'Dirección / CEO', department: 'Dirección', branch: 'Todas', status: 'active', lastLogin: 'Hace 15 min' },
    { id: 2, name: 'Marta Sánchez', email: 'marta.sanchez@ettglobal.es', role: 'Comercial Senior', department: 'Comercial', branch: 'Barcelona (Central)', status: 'active', lastLogin: 'Hoy 09:30' },
    { id: 3, name: 'Laura García', email: 'laura.garcia@ettglobal.es', role: 'Responsable de Sucursal', department: 'Operaciones', branch: 'Barcelona (Central)', status: 'active', lastLogin: 'Ayer 18:20' },
    { id: 4, name: 'Marc Soler', email: 'marc.soler@ettglobal.es', role: 'Responsable de Sucursal', department: 'Operaciones', branch: 'Girona', status: 'active', lastLogin: 'Hoy 08:45' },
    { id: 5, name: 'Jordi Valls', email: 'jordi.valls@ettglobal.es', role: 'Administración & Facturación', department: 'Administración', branch: 'Barcelona (Central)', status: 'active', lastLogin: 'Hoy 10:12' },
    { id: 6, name: 'Carlos Benítez', email: 'carlos.benitez@ettglobal.es', role: 'Selección & Recruiting', department: 'Recursos Humanos', branch: 'Sin asignar', status: 'pending', lastLogin: 'Nunca' },
    { id: 7, name: 'Elena Ramos', email: 'elena.ramos@ettglobal.es', role: 'Gestor Laboral', department: 'Laboral', branch: 'Sin asignar', status: 'active', lastLogin: 'Hace 2 días' }
];

const initialTemplates = [
    { id: 'tpl-1', name: 'Presupuesto Comercial Estándar ETT v2025', category: 'Presupuestos', scope: 'Global (Todas)', status: 'active', format: 'PDF + Interactivo', updated: '12 Ene 2025' },
    { id: 'tpl-2', name: 'Factura Ordinaria ETT Conforme Veri*Factu', category: 'Facturación', scope: 'Global (Todas)', status: 'active', format: 'PDF / XML Facturae', updated: '02 Feb 2025' },
    { id: 'tpl-3', name: 'Presupuesto Sector Agro / Logística Girona', category: 'Presupuestos', scope: 'Sucursal Girona', status: 'incomplete', format: 'PDF', updated: '15 Ene 2025' },
    { id: 'tpl-4', name: 'Contrato Puesta a Disposición (CPD Modelo Oficial)', category: 'Laboral / Legal', scope: 'Global (Todas)', status: 'active', format: 'PDF Firmable', updated: '10 Feb 2025' }
];

const initialActivity = [
    { id: 'act-1', timestamp: 'Hoy, 10:45', user: 'Ana López', action: 'Actualizó datos de contacto y provincia fiscal', type: 'fiscal' },
    { id: 'act-2', timestamp: 'Ayer, 16:30', user: 'Jordi Valls', action: 'Activó serie de facturación anual ETT-2025-', type: 'billing' },
    { id: 'act-3', timestamp: '14 Feb, 11:20', user: 'Ana López', action: 'Invitó a Carlos Benítez (Selección)', type: 'users' },
    { id: 'act-4', timestamp: '10 Feb, 09:15', user: 'Laura García', action: 'Completó ficha de sucursal Barcelona al 100%', type: 'branch' },
    { id: 'act-5', timestamp: '01 Feb, 08:00', user: 'Sistema', action: 'Creación inicial de la entidad ETT Global Servicios Temporales, S.L.', type: 'system' }
];

export default function FichaEttView() {
    const [activeTab, setActiveTab] = useState('resumen');
    const [company, setCompany] = useState(initialCompanyData);
    const [branches, setBranches] = useState(initialBranches);
    const [users, setUsers] = useState(initialUsers);
    const [templates, setTemplates] = useState(initialTemplates);
    const [activity, setActivity] = useState(initialActivity);

    // UI State
    const [density, setDensity] = useState('comfortable'); // comfortable | compact
    const [toast, setToast] = useState(null);
    const [isEditingFiscal, setIsEditingFiscal] = useState(false);
    const [isEditingBilling, setIsEditingBilling] = useState(false);
    const [branchDrawer, setBranchDrawer] = useState({ open: false, mode: 'create', data: null });
    const [userDrawer, setUserDrawer] = useState({ open: false, mode: 'invite', data: null });
    const [sensitiveModal, setSensitiveModal] = useState({ open: false, field: '', pendingValue: '', reason: '' });
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Toast helper
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3800);
    };

    // Log activity helper
    const logAction = (actionText, type = 'system') => {
        const newAct = {
            id: 'act-' + Date.now(),
            timestamp: 'Ahora mismo',
            user: 'Ana López (Tú)',
            action: actionText,
            type: type
        };
        setActivity(prev => [newAct, ...prev]);
    };

    return (
        <div className="flex h-full w-full overflow-hidden bg-slate-100 font-sans">
            {/* TOAST NOTIFICATION */}
            {toast && (
                <div className="fixed top-5 right-6 z-50 flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 fade-in">
                    {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                    {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
                    {toast.type === 'info' && <Info className="w-5 h-5 text-indigo-400 shrink-0" />}
                    <span className="text-sm font-medium">{toast.message}</span>
                    <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* GLOBAL ERP SIDEBAR */}

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
                
                {/* TOP BREADCRUMB & CONTEXT HEADER */}
                <header className="bg-white border-b border-slate-200 px-6 py-3.5 shrink-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        {/* Breadcrumb & Identification */}
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>Configuración</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-semibold text-slate-800">Mi ETT</span>
                            <span className="mx-1.5 text-slate-300">|</span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                                <Building2 className="w-3 h-3 text-indigo-600" />
                                ORGANIZACIÓN PROPIA
                            </span>
                            <span className="hidden md:inline-flex text-[11px] text-slate-400 italic">
                                (Ficha emisora de facturas, contratos y gestión de sucursales)
                            </span>
                        </div>

                        {/* Controls: Density + Quick help */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                                <button 
                                    onClick={() => setDensity('comfortable')}
                                    className={`px-2.5 py-1 rounded-md transition text-xs font-medium ${density === 'comfortable' ? 'bg-white shadow-xs text-slate-800 font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
                                    title="Vista holgada"
                                >
                                    Cómodo
                                </button>
                                <button 
                                    onClick={() => setDensity('compact')}
                                    className={`px-2.5 py-1 rounded-md transition text-xs font-medium ${density === 'compact' ? 'bg-white shadow-xs text-slate-800 font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
                                    title="Mayor densidad de datos"
                                >
                                    Compacto
                                </button>
                            </div>

                            <button 
                                onClick={() => showToast("Modo solo demostración UX. Los cambios se mantienen en memoria durante la sesión.", "info")}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                                title="Información del prototipo"
                            >
                                <Info className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* MAIN IDENTITY CARD */}
                    <div className="mt-3 flex flex-col md:flex-row md:items-center justify-between gap-4 pt-3 border-t border-slate-100">
                        <div className="flex items-start gap-4">
                            {/* Company Avatar / Logo */}
                            <div className="relative group">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-600 to-slate-800 text-white flex items-center justify-center font-bold text-xl shadow-md border-2 border-white ring-1 ring-slate-200 overflow-hidden">
                                    {company.logoUrl ? (
                                        <img src={company.logoUrl} alt="Logo ETT" className="w-full h-full object-cover" />
                                    ) : (
                                        <span>ETT</span>
                                    )}
                                </div>
                                <button 
                                    onClick={() => {
                                        showToast("Selector de imagen simulado: logotipo actualizado");
                                        setCompany(prev => ({ ...prev, logoUrl: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=150&auto=format&fit=crop&q=80" }));
                                        logAction("Actualizó el logotipo corporativo de la ETT", "fiscal");
                                    }}
                                    className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow border border-slate-200 text-slate-600 hover:text-indigo-600 transition"
                                    title="Cambiar logotipo"
                                >
                                    <Upload className="w-3 h-3" />
                                </button>
                            </div>

                            {/* Titles and identifiers */}
                            <div>
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Mi ETT</h1>
                                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-semibold border border-slate-200">
                                        CIF: {company.cif}
                                    </span>
                                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium border border-emerald-200 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        Entidad ETT Acreditada
                                    </span>
                                </div>
                                <div className="text-sm font-medium text-slate-600 flex items-center gap-2 mt-0.5">
                                    <span>{company.legalName}</span>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-slate-500 text-xs">Comercial: {company.tradeName}</span>
                                </div>
                                <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-slate-400" />
                                        {company.lastUpdated}
                                    </span>
                                    <span>•</span>
                                    <span className="text-indigo-600 font-medium">Sede Central: {company.city}</span>
                                </div>
                            </div>
                        </div>

                        {/* Right Side Actions & Completion Rate */}
                        <div className="flex items-center gap-3 self-end md:self-center">
                            <div className="text-right hidden sm:block">
                                <div className="flex items-center justify-end gap-1.5 text-xs font-semibold text-slate-700">
                                    <span>Configuración completa</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${company.completionRate >= 80 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                                        {company.completionRate}%
                                    </span>
                                </div>
                                <div className="w-36 h-2 bg-slate-200 rounded-full mt-1 overflow-hidden">
                                    <div 
                                        className="h-full bg-indigo-600 rounded-full transition-all duration-500" 
                                        style={{ width: `${company.completionRate}%` }}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsEditingFiscal(true)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition"
                                >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    Editar datos fiscales
                                </button>
                                <button 
                                    onClick={() => showToast("Exportando ficha completa en formato PDF oficial...", "info")}
                                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition" 
                                    title="Exportar resumen en PDF"
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* INTERNAL TABS NAVIGATION */}
                    <div className="flex items-center gap-1 mt-4 overflow-x-auto border-t border-slate-100 pt-1 -mb-1">
                        <TabButton id="resumen" label="Resumen" icon={Sparkles} activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton id="fiscal" label="Datos fiscales" icon={Building2} activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton 
                            id="facturacion" 
                            label="Facturación" 
                            icon={Receipt} 
                            activeTab={activeTab} 
                            setActiveTab={setActiveTab} 
                            badge={!company.iban ? "Pendiente" : null}
                        />
                        <TabButton id="sucursales" label="Sucursales" icon={MapPin} count={branches.length} activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton id="usuarios" label="Usuarios y roles" icon={Users} count={users.length} activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton id="plantillas" label="Plantillas" icon={FileText} count={templates.length} activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton id="actividad" label="Actividad" icon={History} activeTab={activeTab} setActiveTab={setActiveTab} />
                    </div>
                </header>

                {/* TAB CONTENT AREA */}
                <main className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* 1. RESUMEN TAB */}
                    {activeTab === 'resumen' && (
                        <div className="space-y-6 fade-in max-w-7xl mx-auto">
                            {/* Actionable Alerts Banner */}
                            {(!company.iban || users.some(u => u.branch === 'Sin asignar') || templates.some(t => t.status === 'incomplete')) && (
                                <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-4 shadow-xs">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-amber-100 rounded-lg text-amber-800 shrink-0">
                                            <AlertTriangle className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-bold text-amber-900">Atención requerida para completar la configuración de tu ETT</h3>
                                            <p className="text-xs text-amber-800/90 mt-0.5">
                                                Hay datos indispensables pendientes para emitir facturación y asegurar la asignación territorial de operaciones.
                                            </p>
                                            
                                            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                                {!company.iban && (
                                                    <div className="flex items-center justify-between bg-white/90 p-2.5 rounded-lg border border-amber-200 text-xs">
                                                        <span className="font-medium text-slate-800 flex items-center gap-1.5">
                                                            <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                                                            Falta IBAN bancario de la ETT
                                                        </span>
                                                        <button 
                                                            onClick={() => { setActiveTab('facturacion'); setIsEditingBilling(true); }}
                                                            className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                                                        >
                                                            Completar
                                                        </button>
                                                    </div>
                                                )}

                                                {users.some(u => u.branch === 'Sin asignar') && (
                                                    <div className="flex items-center justify-between bg-white/90 p-2.5 rounded-lg border border-amber-200 text-xs">
                                                        <span className="font-medium text-slate-800 flex items-center gap-1.5">
                                                            <Users className="w-3.5 h-3.5 text-amber-600" />
                                                            2 usuarios sin sucursal asignada
                                                        </span>
                                                        <button 
                                                            onClick={() => setActiveTab('usuarios')}
                                                            className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                                                        >
                                                            Asignar
                                                        </button>
                                                    </div>
                                                )}

                                                {templates.some(t => t.status === 'incomplete') && (
                                                    <div className="flex items-center justify-between bg-white/90 p-2.5 rounded-lg border border-amber-200 text-xs">
                                                        <span className="font-medium text-slate-800 flex items-center gap-1.5">
                                                            <FileText className="w-3.5 h-3.5 text-amber-600" />
                                                            Plantilla Girona incompleta
                                                        </span>
                                                        <button 
                                                            onClick={() => setActiveTab('plantillas')}
                                                            className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                                                        >
                                                            Revisar
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* OVERVIEW STATUS CARDS */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                <StatusCard 
                                    title="Datos Fiscales"
                                    status="Completos"
                                    statusColor="emerald"
                                    subtitle="CIF, Razón Social y Domicilio"
                                    icon={Building2}
                                    onClick={() => setActiveTab('fiscal')}
                                />
                                <StatusCard 
                                    title="Facturación"
                                    status={company.iban ? "Configurado" : "Falta cuenta bancaria"}
                                    statusColor={company.iban ? "emerald" : "amber"}
                                    subtitle={`Serie: ${company.billingSeries} • IVA 21%`}
                                    icon={Receipt}
                                    onClick={() => setActiveTab('facturacion')}
                                />
                                <StatusCard 
                                    title="Sucursales"
                                    status={`${branches.length} activas`}
                                    statusColor="indigo"
                                    subtitle="Barcelona, Girona, Lleida"
                                    icon={MapPin}
                                    onClick={() => setActiveTab('sucursales')}
                                />
                                <StatusCard 
                                    title="Usuarios y Roles"
                                    status={`${users.length} miembros`}
                                    statusColor="indigo"
                                    subtitle="6 roles activos en backoffice"
                                    icon={Users}
                                    onClick={() => setActiveTab('usuarios')}
                                />
                                <StatusCard 
                                    title="Plantillas Doc."
                                    status={`${templates.length} registradas`}
                                    statusColor="indigo"
                                    subtitle="Presupuestos y Facturas"
                                    icon={FileText}
                                    onClick={() => setActiveTab('plantillas')}
                                />
                            </div>

                            {/* QUICK ACTIONS & SUMMARY GRIDS */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                
                                {/* Main Summary Panel */}
                                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                                        <div>
                                            <h2 className="text-base font-bold text-slate-800">Ficha Operativa de la Organización</h2>
                                            <p className="text-xs text-slate-500">Datos corporativos consolidados utilizados en todos los módulos</p>
                                        </div>
                                        <button 
                                            onClick={() => setIsEditingFiscal(true)}
                                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                            Editar ficha
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-xs">
                                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                                            <span className="text-slate-400 font-medium block">Razón Social Oficial</span>
                                            <span className="text-slate-800 font-bold text-sm mt-0.5 block">{company.legalName}</span>
                                            <span className="text-slate-500 mt-1 block">CIF: <strong className="text-slate-700">{company.cif}</strong></span>
                                        </div>
                                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                                            <span className="text-slate-400 font-medium block">Sede Central y Domicilio Fiscal</span>
                                            <span className="text-slate-800 font-semibold block mt-0.5">{company.address}</span>
                                            <span className="text-slate-500 block">{company.postalCode} - {company.city} ({company.province})</span>
                                        </div>
                                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                                            <span className="text-slate-400 font-medium block">Contacto General de la ETT</span>
                                            <span className="text-slate-800 font-medium block mt-0.5">{company.phone}</span>
                                            <span className="text-indigo-600 font-medium block">{company.email}</span>
                                        </div>
                                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                                            <span className="text-slate-400 font-medium block">Parámetros de Facturación</span>
                                            <span className="text-slate-800 font-medium block mt-0.5">Serie: {company.billingSeries} (IVA {company.vatRate})</span>
                                            <span className="text-slate-500 block">Forma: {company.paymentMethod}</span>
                                        </div>
                                    </div>

                                    {/* Contextual relationship note */}
                                    <div className="mt-5 p-3 rounded-lg bg-indigo-50/70 border border-indigo-100 flex items-start gap-3">
                                        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                                        <div className="text-xs text-indigo-900 leading-relaxed">
                                            <strong>¿Dónde se usan estos datos?</strong> Los datos fiscales y el logotipo configurados aquí se inyectan automáticamente en la cabecera de las <strong>Facturas emitidas</strong>, los <strong>Presupuestos comerciales</strong> y los <strong>Contratos de Puesta a Disposición (CPD)</strong> generados por cualquier sucursal.
                                        </div>
                                    </div>
                                </div>

                                {/* Right Sidebar: Quick Actions & Branch Status */}
                                <div className="space-y-6">
                                    {/* Quick Actions Card */}
                                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                                        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-indigo-600" />
                                            Acciones Rápidas
                                        </h3>
                                        <div className="space-y-2">
                                            <QuickActionButton 
                                                icon={Edit3} 
                                                label="Editar datos fiscales" 
                                                onClick={() => setIsEditingFiscal(true)} 
                                            />
                                            <QuickActionButton 
                                                icon={MapPin} 
                                                label="Añadir nueva sucursal" 
                                                onClick={() => setBranchDrawer({ open: true, mode: 'create', data: null })} 
                                            />
                                            <QuickActionButton 
                                                icon={UserPlus} 
                                                label="Invitar usuario / comercial" 
                                                onClick={() => setUserDrawer({ open: true, mode: 'invite', data: null })} 
                                            />
                                            <QuickActionButton 
                                                icon={CreditCard} 
                                                label="Configurar IBAN y pagos" 
                                                onClick={() => { setActiveTab('facturacion'); setIsEditingBilling(true); }} 
                                            />
                                            <QuickActionButton 
                                                icon={Upload} 
                                                label="Cambiar logotipo oficial" 
                                                onClick={() => {
                                                    setCompany(prev => ({ ...prev, logoUrl: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=150&auto=format&fit=crop&q=80" }));
                                                    showToast("Logotipo corporativo actualizado");
                                                }} 
                                            />
                                        </div>
                                    </div>

                                    {/* Branches Mini Status */}
                                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-sm font-bold text-slate-800">Sucursales ({branches.length})</h3>
                                            <button 
                                                onClick={() => setActiveTab('sucursales')}
                                                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                                            >
                                                Ver todas
                                            </button>
                                        </div>
                                        <div className="space-y-2.5">
                                            {branches.map(b => (
                                                <div key={b.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                                                    <div>
                                                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                                            {b.name}
                                                            {b.isHeadquarters && <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1 rounded">SEDE</span>}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500">Resp: {b.manager || <span className="text-amber-600 italic">Sin asignar</span>}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-mono font-bold text-slate-700">{b.completion}%</span>
                                                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mt-1">
                                                            <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${b.completion}%` }}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    )}

                    {/* 2. DATOS FISCALES TAB */}
                    {activeTab === 'fiscal' && (
                        <div className="space-y-6 fade-in max-w-6xl mx-auto">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                                <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-lg font-bold text-slate-900">Datos Fiscales e Identificación Oficial</h2>
                                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                Verificado AEAT
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Información fiscal vinculante de la sociedad mercantil titular de la licencia de ETT.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setIsEditingFiscal(true)}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                            Editar Datos Fiscales
                                        </button>
                                    </div>
                                </div>

                                {/* Fiscal fields display */}
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <InfoField label="Razón Social" value={company.legalName} isSensitive />
                                    <InfoField label="Nombre Comercial / Marca" value={company.tradeName} />
                                    <InfoField label="CIF / NIF Oficial" value={company.cif} isSensitive code />
                                    <InfoField label="Tipo de Sociedad" value={company.companyType} />
                                    <InfoField label="País Fiscal" value={company.country} />
                                    <InfoField label="Dirección Fiscal Completa" value={company.address} />
                                    <InfoField label="Código Postal" value={company.postalCode} />
                                    <InfoField label="Localidad / Municipio" value={company.city} />
                                    <InfoField label="Provincia" value={company.province} />
                                    <InfoField label="Teléfono General" value={company.phone} />
                                    <InfoField label="Email General Notificaciones" value={company.email} />
                                    <InfoField label="Sitio Web Corporativo" value={company.web} isLink />
                                </div>

                                {/* Sensitive Data Notice */}
                                <div className="p-4 mx-6 mb-6 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
                                    <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                                    <div className="text-xs text-amber-900 leading-relaxed">
                                        <strong>Seguridad y trazabilidad fiscal:</strong> La modificación del <strong>CIF/NIF</strong> o de la <strong>Razón Social</strong> requiere confirmación de seguridad con registro de auditoría, ya que afecta a los certificados digitales y a las series de facturas ya emitidas a clientes.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3. FACTURACIÓN TAB */}
                    {activeTab === 'facturacion' && (
                        <div className="space-y-6 fade-in max-w-6xl mx-auto">
                            
                            {/* Warning banner if bank account is missing */}
                            {!company.iban && (
                                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                                        <div>
                                            <h3 className="text-sm font-bold text-rose-900">Datos de facturación incompletos</h3>
                                            <p className="text-xs text-rose-700 mt-0.5">
                                                No podrás emitir facturas legales ni generar remesas SEPA hasta completar: <strong>IBAN bancario</strong> y verificar la serie de facturación predeterminada.
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setIsEditingBilling(true)}
                                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shrink-0 shadow-xs"
                                    >
                                        Completar ahora
                                    </button>
                                </div>
                            )}

                            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                                <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900">Parámetros Financieros y Facturación Emisora</h2>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Configura los valores por defecto que se aplicarán al facturar servicios de trabajo temporal a clientes.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setIsEditingBilling(true)}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        Editar Parámetros de Facturación
                                    </button>
                                </div>

                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <InfoField label="Serie de Facturación Anual" value={company.billingSeries} code />
                                    <InfoField label="Prefijo Número Factura" value={company.invoicePrefix} code />
                                    <InfoField label="IVA General Aplicable" value={company.vatRate} />
                                    <InfoField label="Retenciones IRPF por Defecto" value={company.withholdingRate} />
                                    
                                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                                        <span className="text-slate-400 font-medium text-xs block">Cuenta Bancaria Principal (IBAN)</span>
                                        {company.iban ? (
                                            <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">{company.iban}</span>
                                        ) : (
                                            <span className="text-rose-600 font-semibold text-xs mt-1 inline-flex items-center gap-1">
                                                <AlertCircle className="w-3.5 h-3.5" />
                                                Sin configurar (Requerido)
                                            </span>
                                        )}
                                    </div>

                                    <InfoField label="Código SWIFT / BIC" value={company.swiftBic} code />
                                    
                                    {/* Forma de pago selector estructurado display */}
                                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                                        <span className="text-slate-400 font-medium text-xs block">Forma de Pago Predeterminada</span>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="font-bold text-slate-800 text-xs">
                                                {company.paymentMethod === 'Otro' ? `Personalizado: ${company.customPaymentMethod || 'Sin especificar'}` : company.paymentMethod}
                                            </span>
                                            <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 text-[10px] font-semibold">Base</span>
                                        </div>
                                    </div>

                                    <InfoField label="Condiciones de Vencimiento" value={company.paymentTerms} />
                                    <InfoField label="Moneda de Emisión" value={company.currency} />
                                    <InfoField label="Email Contacto Administración" value={company.adminEmail} />
                                    
                                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                                        <span className="text-slate-400 font-medium text-xs block">Esquema de Series por Sucursal</span>
                                        <span className="font-semibold text-slate-800 text-xs mt-0.5 block">
                                            {company.billingBranchMode === 'centralized' ? 'Centralizada (Serie única ETT)' : 'Multiserie (Serie por cada Sucursal)'}
                                        </span>
                                    </div>
                                </div>

                                {/* Security Permissions Notice for Finance */}
                                <div className="p-4 mx-6 mb-6 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <Lock className="w-4 h-4 text-slate-500" />
                                        <span>Los campos financieros y bancarios solo pueden ser editados por usuarios con rol <strong>Dirección / CEO</strong> o <strong>Administración</strong>.</span>
                                    </div>
                                    <span className="font-mono text-[11px] text-slate-400">Veri*Factu Compliant 2025</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 4. SUCURSALES TAB */}
                    {activeTab === 'sucursales' && (
                        <div className="space-y-6 fade-in max-w-6xl mx-auto">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Sucursales y Delegaciones Territoriales</h2>
                                    <p className="text-xs text-slate-500">Gestión de centros de trabajo, responsables de oficina y asignación operativa.</p>
                                </div>
                                <button
                                    onClick={() => setBranchDrawer({ open: true, mode: 'create', data: null })}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition"
                                >
                                    <Plus className="w-4 h-4" />
                                    Añadir Sucursal
                                </button>
                            </div>

                            {/* Sucursales Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {branches.map(b => (
                                    <div key={b.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition group">
                                        <div>
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                                            {b.code}
                                                        </span>
                                                        {b.isHeadquarters && (
                                                            <span className="text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded-full">
                                                                SEDE CENTRAL
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h3 className="text-base font-bold text-slate-900 mt-1.5">{b.name}</h3>
                                                </div>
                                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Activa"></span>
                                            </div>

                                            <div className="mt-4 space-y-2 text-xs text-slate-600">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <span className="truncate">{b.address}, {b.city}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <span>{b.phone}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <span>{b.activeUsers} usuarios asignados</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <span>
                                                        Responsable: {b.manager ? (
                                                            <strong className="text-slate-800">{b.manager}</strong>
                                                        ) : (
                                                            <span className="text-amber-600 font-semibold italic">Sin responsable asignado</span>
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                                            <div>
                                                <div className="text-[10px] text-slate-400 uppercase font-semibold">Completitud</div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-slate-800">{b.completion}%</span>
                                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${b.completion}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => setBranchDrawer({ open: true, mode: 'edit', data: b })}
                                                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition"
                                                    title="Editar sucursal"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                </button>
                                                {!b.isHeadquarters && (
                                                    <button
                                                        onClick={() => {
                                                            if (confirm(`¿Desactivar la sucursal ${b.name}? Los comerciales pasarán a la sede central.`)) {
                                                                setBranches(branches.filter(item => item.id !== b.id));
                                                                logAction(`Desactivó la sucursal ${b.name}`, 'branch');
                                                                showToast(`Sucursal ${b.name} desactivada.`);
                                                            }
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                                                        title="Desactivar sucursal"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 5. USUARIOS Y ROLES TAB */}
                    {activeTab === 'usuarios' && (
                        <div className="space-y-6 fade-in max-w-6xl mx-auto">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Usuarios, Comerciales y Matriz de Roles</h2>
                                    <p className="text-xs text-slate-500">Gestión de accesos, permisos por módulo ETT y delegación de sucursales.</p>
                                </div>
                                <button
                                    onClick={() => setUserDrawer({ open: true, mode: 'invite', data: null })}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Invitar Usuario
                                </button>
                            </div>

                            {/* Users List Table */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                                <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                        <span>Equipo de la ETT ({users.length} miembros activos)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                                            <input 
                                                type="text" 
                                                placeholder="Buscar por nombre, rol o email..." 
                                                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-indigo-500 w-60"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                                        <tr>
                                            <th className="py-3 px-4">Usuario</th>
                                            <th className="py-3 px-4">Rol en ERP</th>
                                            <th className="py-3 px-4">Departamento</th>
                                            <th className="py-3 px-4">Sucursal Asignada</th>
                                            <th className="py-3 px-4">Estado</th>
                                            <th className="py-3 px-4 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {users.map(u => (
                                            <tr key={u.id} className="hover:bg-slate-50/80 transition">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                                                            {u.name.split(' ').map(n=>n[0]).join('')}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-800">{u.name}</div>
                                                            <div className="text-[11px] text-slate-400">{u.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 font-semibold text-slate-700">
                                                    <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-slate-600">{u.department}</td>
                                                <td className="py-3 px-4">
                                                    {u.branch === 'Sin asignar' ? (
                                                        <span className="text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                                                            Sin asignar
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-700">{u.branch}</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4">
                                                    {u.status === 'active' ? (
                                                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-semibold">
                                                            <Check className="w-3 h-3" /> Activo
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-semibold">
                                                            <Clock className="w-3 h-3" /> Invitación pendiente
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <button 
                                                        onClick={() => {
                                                            showToast(`Editando permisos y sucursal de ${u.name}`);
                                                            setUserDrawer({ open: true, mode: 'edit', data: u });
                                                        }}
                                                        className="text-slate-400 hover:text-indigo-600 p-1"
                                                        title="Editar usuario"
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Interactive Roles & Permissions Matrix */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                                <div className="mb-4">
                                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <Key className="w-4 h-4 text-indigo-600" />
                                        Matriz de Permisos por Módulo ETT
                                    </h3>
                                    <p className="text-xs text-slate-500">Configuración granular de capacidades por rol del backoffice.</p>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-50 text-[11px] text-slate-600 font-bold border-b border-slate-200">
                                            <tr>
                                                <th className="p-2.5">Módulo ETT</th>
                                                <th className="p-2.5 text-center">Ver</th>
                                                <th className="p-2.5 text-center">Crear</th>
                                                <th className="p-2.5 text-center">Editar</th>
                                                <th className="p-2.5 text-center">Aprobar</th>
                                                <th className="p-2.5 text-center">Administrar</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-slate-700">
                                            <PermissionRow module="Presupuestos y Cotización" v c e a ad />
                                            <PermissionRow module="Facturación y Remesas" v c e a={false} ad={false} />
                                            <PermissionRow module="Usuarios y Roles" v c={false} e={false} a={false} ad={false} />
                                            <PermissionRow module="Ficha Mi ETT (Datos Propios)" v c={false} e={false} a={false} ad={false} />
                                            <PermissionRow module="Sucursales y Delegaciones" v c e a ad={false} />
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 6. PLANTILLAS TAB */}
                    {activeTab === 'plantillas' && (
                        <div className="space-y-6 fade-in max-w-6xl mx-auto">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Plantillas Documentales Oficiales</h2>
                                    <p className="text-xs text-slate-500">Formatos oficiales de presupuestos, facturas y contratos con membrete de la ETT.</p>
                                </div>
                                <button
                                    onClick={() => showToast("Subida de nueva plantilla PDF/DOCX simulada")}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition"
                                >
                                    <Upload className="w-4 h-4" />
                                    Subir Plantilla
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {templates.map(tpl => (
                                    <div key={tpl.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                                    {tpl.category}
                                                </span>
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${tpl.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                                    {tpl.status === 'active' ? 'Activa' : 'Incompleta'}
                                                </span>
                                            </div>
                                            <h3 className="text-sm font-bold text-slate-900 mt-2">{tpl.name}</h3>
                                            <div className="text-xs text-slate-500 mt-2 space-y-1">
                                                <div>Ámbito: <strong>{tpl.scope}</strong></div>
                                                <div>Formato: {tpl.format}</div>
                                                <div>Última versión: {tpl.updated}</div>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                            <span className="text-slate-400">ID: {tpl.id}</span>
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => showToast(`Previsualizando plantilla: ${tpl.name}`, 'info')}
                                                    className="text-indigo-600 hover:text-indigo-800 font-semibold"
                                                >
                                                    Previsualizar
                                                </button>
                                                <span className="text-slate-300">•</span>
                                                <button 
                                                    onClick={() => showToast(`Plantilla duplicada para personalización`)}
                                                    className="text-slate-600 hover:text-slate-900"
                                                >
                                                    Duplicar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 7. ACTIVIDAD TAB */}
                    {activeTab === 'actividad' && (
                        <div className="space-y-6 fade-in max-w-4xl mx-auto">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
                                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900">Registro de Auditoría de la ETT</h2>
                                        <p className="text-xs text-slate-500">Historial inmutable de cambios fiscales, bancarios y de estructura.</p>
                                    </div>
                                    <button 
                                        onClick={() => showToast("Historial exportado en CSV")}
                                        className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 border border-slate-200 px-3 py-1.5 rounded-lg"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        Descargar log
                                    </button>
                                </div>

                                <div className="mt-6 relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                                    {activity.map(item => (
                                        <div key={item.id} className="relative group">
                                            <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white bg-indigo-600 ring-2 ring-indigo-100"></div>
                                            <div className="text-xs">
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <span className="font-semibold text-slate-700">{item.user}</span>
                                                    <span>•</span>
                                                    <span>{item.timestamp}</span>
                                                </div>
                                                <div className="text-slate-800 font-medium mt-1">
                                                    {item.action}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                </main>
            </div>

            {/* ========================================================= */}
            {/* DRAWER: EDITAR DATOS FISCALES */}
            {/* ========================================================= */}
            {isEditingFiscal && (
                <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs fade-in">
                    <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden">
                        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">Editar Datos Fiscales de la ETT</h3>
                                    <span className="text-[11px] text-slate-500">Configuración de entidad jurídica propia</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsEditingFiscal(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-900">
                                <strong>Nota de seguridad:</strong> Si modificas el CIF o la Razón Social se solicitará confirmación expresa antes de guardar.
                            </div>

                            <DrawerInput 
                                label="Razón Social Oficial" 
                                defaultValue={company.legalName}
                                id="edit-legalName"
                            />
                            <DrawerInput 
                                label="Nombre Comercial" 
                                defaultValue={company.tradeName}
                                id="edit-tradeName"
                            />
                            <DrawerInput 
                                label="CIF / NIF" 
                                defaultValue={company.cif}
                                id="edit-cif"
                            />
                            <DrawerInput 
                                label="Tipo de Sociedad" 
                                defaultValue={company.companyType}
                                id="edit-companyType"
                            />
                            <DrawerInput 
                                label="Dirección Fiscal" 
                                defaultValue={company.address}
                                id="edit-address"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <DrawerInput 
                                    label="Código Postal" 
                                    defaultValue={company.postalCode}
                                    id="edit-postalCode"
                                />
                                <DrawerInput 
                                    label="Localidad" 
                                    defaultValue={company.city}
                                    id="edit-city"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <DrawerInput 
                                    label="Provincia" 
                                    defaultValue={company.province}
                                    id="edit-province"
                                />
                                <DrawerInput 
                                    label="Teléfono Central" 
                                    defaultValue={company.phone}
                                    id="edit-phone"
                                />
                            </div>
                            <DrawerInput 
                                label="Email General de Notificaciones" 
                                defaultValue={company.email}
                                id="edit-email"
                            />
                            <DrawerInput 
                                label="Web Corporativa" 
                                defaultValue={company.web}
                                id="edit-web"
                            />
                        </div>

                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setIsEditingFiscal(false)}
                                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    const newLegal = document.getElementById('edit-legalName')?.value || company.legalName;
                                    const newCif = document.getElementById('edit-cif')?.value || company.cif;
                                    
                                    // Check if sensitive field changed
                                    if (newCif !== company.cif || newLegal !== company.legalName) {
                                        setSensitiveModal({
                                            open: true,
                                            field: newCif !== company.cif ? 'CIF/NIF' : 'Razón Social',
                                            pendingValue: newCif !== company.cif ? newCif : newLegal,
                                            reason: ''
                                        });
                                        return;
                                    }

                                    // Direct update for non-sensitive
                                    setCompany(prev => ({
                                        ...prev,
                                        tradeName: document.getElementById('edit-tradeName')?.value || prev.tradeName,
                                        address: document.getElementById('edit-address')?.value || prev.address,
                                        postalCode: document.getElementById('edit-postalCode')?.value || prev.postalCode,
                                        city: document.getElementById('edit-city')?.value || prev.city,
                                        province: document.getElementById('edit-province')?.value || prev.province,
                                        phone: document.getElementById('edit-phone')?.value || prev.phone,
                                        email: document.getElementById('edit-email')?.value || prev.email,
                                        web: document.getElementById('edit-web')?.value || prev.web,
                                        lastUpdated: "Hoy (recién editado)"
                                    }));
                                    setIsEditingFiscal(false);
                                    logAction("Actualizó los datos de contacto y domicilio de la ETT", "fiscal");
                                    showToast("Datos fiscales actualizados con éxito");
                                }}
                                className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition flex items-center gap-1.5"
                            >
                                <Save className="w-3.5 h-3.5" />
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* DRAWER: EDITAR FACTURACIÓN & FORMA DE PAGO */}
            {/* ========================================================= */}
            {isEditingBilling && (
                <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs fade-in">
                    <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden">
                        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700">
                                    <Receipt className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">Configuración de Facturación y Cobros</h3>
                                    <span className="text-[11px] text-slate-500">Parámetros emisores oficiales</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsEditingBilling(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <DrawerInput 
                                    label="Serie de Facturación" 
                                    defaultValue={company.billingSeries}
                                    id="edit-billingSeries"
                                />
                                <DrawerInput 
                                    label="Prefijo Facturas" 
                                    defaultValue={company.invoicePrefix}
                                    id="edit-invoicePrefix"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">IVA General Aplicable</label>
                                    <select 
                                        id="edit-vatRate" 
                                        defaultValue={company.vatRate}
                                        className="w-full p-2 rounded-lg border border-slate-300 bg-white focus:outline-indigo-500"
                                    >
                                        <option value="21%">21% (General ETT)</option>
                                        <option value="10%">10% (Reducido)</option>
                                        <option value="0%">0% (Exento / Canarias IGIC)</option>
                                    </select>
                                </div>
                                <DrawerInput 
                                    label="Retenciones IRPF" 
                                    defaultValue={company.withholdingRate}
                                    id="edit-withholdingRate"
                                />
                            </div>

                            {/* Bank account */}
                            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg space-y-3">
                                <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                                    <CreditCard className="w-4 h-4 text-indigo-700" />
                                    Cuenta Bancaria para Cobro de Facturas
                                </div>
                                <DrawerInput 
                                    label="IBAN Oficial de la ETT (Obligatorio)" 
                                    placeholder="ES91 2100 0418 4502 0005 1332"
                                    defaultValue={company.iban || "ES91 2100 0418 4502 0005 1332"}
                                    id="edit-iban"
                                />
                                <DrawerInput 
                                    label="Código BIC / SWIFT" 
                                    defaultValue={company.swiftBic}
                                    id="edit-swiftBic"
                                />
                            </div>

                            {/* FORMA DE PAGO SELECTOR + OTRO/LITERAL PATTERN */}
                            <PaymentMethodEditor 
                                initialMethod={company.paymentMethod}
                                initialCustom={company.customPaymentMethod}
                            />

                            <DrawerInput 
                                label="Condiciones de Vencimiento Estándar" 
                                defaultValue={company.paymentTerms}
                                id="edit-paymentTerms"
                            />
                            <DrawerInput 
                                label="Email de Contacto de Administración" 
                                defaultValue={company.adminEmail}
                                id="edit-adminEmail"
                            />
                        </div>

                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setIsEditingBilling(false)}
                                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    const newIban = document.getElementById('edit-iban')?.value || '';
                                    const selMethod = document.getElementById('edit-paymentMethodSelect')?.value || company.paymentMethod;
                                    const customVal = document.getElementById('edit-customPaymentInput')?.value || '';

                                    setCompany(prev => ({
                                        ...prev,
                                        billingSeries: document.getElementById('edit-billingSeries')?.value || prev.billingSeries,
                                        invoicePrefix: document.getElementById('edit-invoicePrefix')?.value || prev.invoicePrefix,
                                        vatRate: document.getElementById('edit-vatRate')?.value || prev.vatRate,
                                        withholdingRate: document.getElementById('edit-withholdingRate')?.value || prev.withholdingRate,
                                        iban: newIban,
                                        swiftBic: document.getElementById('edit-swiftBic')?.value || prev.swiftBic,
                                        paymentMethod: selMethod,
                                        customPaymentMethod: customVal,
                                        paymentTerms: document.getElementById('edit-paymentTerms')?.value || prev.paymentTerms,
                                        adminEmail: document.getElementById('edit-adminEmail')?.value || prev.adminEmail,
                                        completionRate: newIban ? 95 : 82
                                    }));

                                    setIsEditingBilling(false);
                                    logAction("Actualizó cuenta bancaria IBAN y condiciones de facturación", "billing");
                                    showToast("Parámetros de facturación guardados correctamente");
                                }}
                                className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition flex items-center gap-1.5"
                            >
                                <Save className="w-3.5 h-3.5" />
                                Guardar Parámetros
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* DRAWER: AÑADIR / EDITAR SUCURSAL */}
            {/* ========================================================= */}
            {branchDrawer.open && (
                <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs fade-in">
                    <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden">
                        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700">
                                    <MapPin className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">
                                        {branchDrawer.mode === 'create' ? 'Nueva Sucursal / Delegación' : `Editar ${branchDrawer.data?.name}`}
                                    </h3>
                                    <span className="text-[11px] text-slate-500">Centros de atención y comerciales territoriales</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => setBranchDrawer({ open: false, mode: 'create', data: null })}
                                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                            <DrawerInput 
                                label="Nombre de la Sucursal" 
                                placeholder="Ej: Sucursal Tarragona" 
                                defaultValue={branchDrawer.data?.name || ''}
                                id="branch-name"
                            />
                            <DrawerInput 
                                label="Código Interno" 
                                placeholder="Ej: SUC-04" 
                                defaultValue={branchDrawer.data?.code || `SUC-0${branches.length + 1}`}
                                id="branch-code"
                            />
                            <DrawerInput 
                                label="Ciudad / Población" 
                                placeholder="Ej: Tarragona" 
                                defaultValue={branchDrawer.data?.city || ''}
                                id="branch-city"
                            />
                            <DrawerInput 
                                label="Dirección Física de la Oficina" 
                                placeholder="Ej: Rambla Nova 12, Principal" 
                                defaultValue={branchDrawer.data?.address || ''}
                                id="branch-address"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <DrawerInput 
                                    label="Teléfono Directo" 
                                    placeholder="+34 977 00 00 00" 
                                    defaultValue={branchDrawer.data?.phone || ''}
                                    id="branch-phone"
                                />
                                <DrawerInput 
                                    label="Email Oficina" 
                                    placeholder="tarragona@ettglobal.es" 
                                    defaultValue={branchDrawer.data?.email || ''}
                                    id="branch-email"
                                />
                            </div>
                            <DrawerInput 
                                label="Responsable de Sucursal" 
                                placeholder="Nombre del director de delegación" 
                                defaultValue={branchDrawer.data?.manager || ''}
                                id="branch-manager"
                            />

                            <div className="pt-2">
                                <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                                    <input 
                                        type="checkbox" 
                                        className="rounded text-indigo-600 focus:ring-indigo-500" 
                                        defaultChecked={branchDrawer.data?.isHeadquarters || false}
                                        disabled={branchDrawer.data?.isHeadquarters}
                                    />
                                    <span>Sede Central Principal de la ETT</span>
                                </label>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setBranchDrawer({ open: false, mode: 'create', data: null })}
                                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    const nameVal = document.getElementById('branch-name')?.value;
                                    if (!nameVal) {
                                        showToast("Introduce el nombre de la sucursal", "error");
                                        return;
                                    }

                                    if (branchDrawer.mode === 'create') {
                                        const newBr = {
                                            id: 'suc-' + Date.now(),
                                            code: document.getElementById('branch-code')?.value || 'SUC-NEW',
                                            name: nameVal,
                                            city: document.getElementById('branch-city')?.value || 'Ciudad',
                                            address: document.getElementById('branch-address')?.value || 'Dirección',
                                            phone: document.getElementById('branch-phone')?.value || '+34 900 00 00 00',
                                            email: document.getElementById('branch-email')?.value || 'sucursal@ettglobal.es',
                                            manager: document.getElementById('branch-manager')?.value || null,
                                            activeUsers: 1,
                                            completion: 80,
                                            status: 'active',
                                            isHeadquarters: false
                                        };
                                        setBranches([...branches, newBr]);
                                        logAction(`Añadió nueva sucursal: ${nameVal}`, 'branch');
                                        showToast(`Sucursal ${nameVal} creada con éxito`);
                                    } else {
                                        setBranches(branches.map(b => b.id === branchDrawer.data.id ? {
                                            ...b,
                                            name: nameVal,
                                            code: document.getElementById('branch-code')?.value || b.code,
                                            city: document.getElementById('branch-city')?.value || b.city,
                                            address: document.getElementById('branch-address')?.value || b.address,
                                            phone: document.getElementById('branch-phone')?.value || b.phone,
                                            email: document.getElementById('branch-email')?.value || b.email,
                                            manager: document.getElementById('branch-manager')?.value || null,
                                        } : b));
                                        logAction(`Modificó la sucursal: ${nameVal}`, 'branch');
                                        showToast(`Sucursal ${nameVal} actualizada`);
                                    }

                                    setBranchDrawer({ open: false, mode: 'create', data: null });
                                }}
                                className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition"
                            >
                                {branchDrawer.mode === 'create' ? 'Crear Sucursal' : 'Guardar Sucursal'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* DRAWER: INVITAR / EDITAR USUARIO */}
            {/* ========================================================= */}
            {userDrawer.open && (
                <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs fade-in">
                    <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden">
                        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700">
                                    <UserPlus className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">
                                        {userDrawer.mode === 'invite' ? 'Invitar Usuario a la ETT' : `Editar permisos de ${userDrawer.data?.name}`}
                                    </h3>
                                    <span className="text-[11px] text-slate-500">Asignación de rol y ámbito territorial</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => setUserDrawer({ open: false, mode: 'invite', data: null })}
                                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                            <DrawerInput 
                                label="Nombre y Apellidos" 
                                placeholder="Ej: Laura Vidal" 
                                defaultValue={userDrawer.data?.name || ''}
                                id="user-name"
                            />
                            <DrawerInput 
                                label="Email Corporativo" 
                                placeholder="laura.vidal@ettglobal.es" 
                                defaultValue={userDrawer.data?.email || ''}
                                id="user-email"
                            />

                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Rol en el ERP de la ETT</label>
                                <select 
                                    id="user-role" 
                                    defaultValue={userDrawer.data?.role || 'Comercial Senior'}
                                    className="w-full p-2 rounded-lg border border-slate-300 bg-white focus:outline-indigo-500"
                                >
                                    <option value="Dirección / CEO">Dirección / CEO (Acceso total)</option>
                                    <option value="Administración & Facturación">Administración & Facturación</option>
                                    <option value="Responsable de Sucursal">Responsable de Sucursal</option>
                                    <option value="Comercial Senior">Comercial Senior (Presupuestos)</option>
                                    <option value="Selección & Recruiting">Selección & Talent Pool</option>
                                    <option value="Gestor Laboral">Gestor Laboral (Contratos CPD)</option>
                                    <option value="Consulta / Auditoría">Consulta / Solo Lectura</option>
                                </select>
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Sucursal Asignada</label>
                                <select 
                                    id="user-branch" 
                                    defaultValue={userDrawer.data?.branch || 'Barcelona (Central)'}
                                    className="w-full p-2 rounded-lg border border-slate-300 bg-white focus:outline-indigo-500"
                                >
                                    <option value="Todas">Todas las sucursales (Ámbito Global)</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.name}>{b.name}</option>
                                    ))}
                                    <option value="Sin asignar">Sin asignar (Pendiente)</option>
                                </select>
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Mensaje de bienvenida (Opcional)</label>
                                <textarea 
                                    rows="2" 
                                    placeholder="Te damos la bienvenida al backoffice de ETT Global..." 
                                    className="w-full p-2 rounded-lg border border-slate-300 bg-white focus:outline-indigo-500 text-xs"
                                ></textarea>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setUserDrawer({ open: false, mode: 'invite', data: null })}
                                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    const name = document.getElementById('user-name')?.value;
                                    const email = document.getElementById('user-email')?.value;
                                    if (!name || !email) {
                                        showToast("Nombre y email son requeridos", "error");
                                        return;
                                    }

                                    const role = document.getElementById('user-role')?.value || 'Comercial';
                                    const branch = document.getElementById('user-branch')?.value || 'Barcelona (Central)';

                                    if (userDrawer.mode === 'invite') {
                                        const newUser = {
                                            id: Date.now(),
                                            name,
                                            email,
                                            role,
                                            department: role.includes('Comercial') ? 'Comercial' : 'Operaciones',
                                            branch,
                                            status: 'pending',
                                            lastLogin: 'Invitación enviada'
                                        };
                                        setUsers([...users, newUser]);
                                        logAction(`Invitó al usuario ${name} con rol ${role}`, 'users');
                                        showToast(`Invitación enviada a ${email}`);
                                    } else {
                                        setUsers(users.map(u => u.id === userDrawer.data.id ? {
                                            ...u,
                                            name,
                                            email,
                                            role,
                                            branch
                                        } : u));
                                        logAction(`Actualizó rol y permisos de ${name}`, 'users');
                                        showToast(`Usuario ${name} actualizado`);
                                    }

                                    setUserDrawer({ open: false, mode: 'invite', data: null });
                                }}
                                className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition"
                            >
                                {userDrawer.mode === 'invite' ? 'Enviar Invitación' : 'Guardar Usuario'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL: CONFIRMACIÓN DE CAMBIO SENSIBLE (CIF/RAZÓN SOCIAL) */}
            {/* ========================================================= */}
            {sensitiveModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 fade-in">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
                        <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900">¿Confirmar cambio sensible de {sensitiveModal.field}?</h3>
                        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                            Vas a modificar un dato fiscal de primer orden ({sensitiveModal.field} cambiará a <strong>{sensitiveModal.pendingValue}</strong>). Este cambio quedará firmado y registrado en la auditoría del sistema.
                        </p>
                        <div className="mt-4">
                            <label className="text-[11px] font-semibold text-slate-700 block mb-1">Motivo del cambio (Obligatorio para auditoría)</label>
                            <input 
                                type="text" 
                                id="sensitive-reason"
                                placeholder="Ej: Actualización escrituras notariales" 
                                className="w-full p-2 text-xs rounded-lg border border-slate-300 focus:outline-indigo-500"
                            />
                        </div>
                        <div className="mt-6 flex items-center justify-end gap-3">
                            <button 
                                onClick={() => setSensitiveModal({ open: false, field: '', pendingValue: '', reason: '' })}
                                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={() => {
                                    const reason = document.getElementById('sensitive-reason')?.value || 'Actualización autorizada';
                                    if (sensitiveModal.field === 'CIF/NIF') {
                                        setCompany(prev => ({ ...prev, cif: sensitiveModal.pendingValue }));
                                    } else {
                                        setCompany(prev => ({ ...prev, legalName: sensitiveModal.pendingValue }));
                                    }
                                    logAction(`Cambio sensible de ${sensitiveModal.field} a '${sensitiveModal.pendingValue}'. Motivo: ${reason}`, 'fiscal');
                                    setSensitiveModal({ open: false, field: '', pendingValue: '', reason: '' });
                                    setIsEditingFiscal(false);
                                    showToast(`Dato sensible ${sensitiveModal.field} modificado con registro en auditoría`);
                                }}
                                className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                            >
                                Confirmar y Registrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

// =========================================================================
// SUBCOMPONENTS
// =========================================================================

function TabButton({ id, label, icon: Icon, count, badge, activeTab, setActiveTab }) {
    const isActive = activeTab === id;
    return (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition shrink-0 ${
                isActive
                    ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
        >
            <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span>{label}</span>
            {count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isActive ? 'bg-indigo-200/80 text-indigo-900' : 'bg-slate-200 text-slate-600'}`}>
                    {count}
                </span>
            )}
            {badge && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    {badge}
                </span>
            )}
        </button>
    );
}

function StatusCard({ title, status, statusColor, subtitle, icon: Icon, onClick }) {
    const colorClasses = {
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        amber: 'bg-amber-50 text-amber-700 border-amber-200',
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    };

    return (
        <div 
            onClick={onClick}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-indigo-300 hover:shadow-sm transition cursor-pointer flex flex-col justify-between"
        >
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{title}</span>
                <div className="p-1.5 rounded-lg bg-slate-50 text-slate-600">
                    <Icon className="w-4 h-4" />
                </div>
            </div>
            <div className="mt-3">
                <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded border ${colorClasses[statusColor]}`}>
                    {status}
                </span>
                <p className="text-[11px] text-slate-400 mt-1 truncate">{subtitle}</p>
            </div>
        </div>
    );
}

function QuickActionButton({ icon: Icon, label, onClick }) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition text-xs font-medium text-slate-700 text-left group"
        >
            <span className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                {label}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500" />
        </button>
    );
}

function InfoField({ label, value, isSensitive, isLink, code }) {
    return (
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium text-xs block">{label}</span>
                {isSensitive && (
                    <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                        Sensible
                    </span>
                )}
            </div>
            {isLink ? (
                <a href={value} target="_blank" rel="noreferrer" className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1 mt-0.5">
                    {value} <ExternalLink className="w-3 h-3" />
                </a>
            ) : (
                <span className={`text-xs font-semibold text-slate-800 block mt-0.5 ${code ? 'font-mono text-slate-900' : ''}`}>
                    {value || <span className="text-slate-400 italic">No especificado</span>}
                </span>
            )}
        </div>
    );
}

function DrawerInput({ label, defaultValue, id, placeholder, type = 'text' }) {
    return (
        <div>
            <label className="font-semibold text-slate-700 block mb-1">{label}</label>
            <input 
                type={type} 
                id={id} 
                defaultValue={defaultValue} 
                placeholder={placeholder}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white focus:outline-indigo-500 text-xs text-slate-800"
            />
        </div>
    );
}

function PaymentMethodEditor({ initialMethod, initialCustom }) {
    const [selectedMethod, setSelectedMethod] = useState(initialMethod || 'Transferencia bancaria');
    const [customLiteral, setCustomLiteral] = useState(initialCustom || '');

    const options = [
        'Transferencia bancaria',
        'Domiciliación bancaria (SEPA B2B / CORE)',
        'Confirming de cliente',
        'Pago a 30 días fecha factura',
        'Pago a 60 días fecha factura',
        'Pago a 90 días fecha factura',
        'Otro'
    ];

    return (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <label className="font-semibold text-slate-700 block">Forma de Pago Predeterminada</label>
            <select
                id="edit-paymentMethodSelect"
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white focus:outline-indigo-500 text-xs text-slate-800"
            >
                {options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>

            {selectedMethod === 'Otro' && (
                <div className="mt-2 pt-2 border-t border-slate-200 fade-in">
                    <label className="text-[11px] font-semibold text-indigo-900 block mb-1">
                        Especificar literal personalizado necesario:
                    </label>
                    <input
                        type="text"
                        id="edit-customPaymentInput"
                        value={customLiteral}
                        onChange={(e) => setCustomLiteral(e.target.value)}
                        placeholder="Ej: Pagaré bancario a 45 días sin recurso"
                        className="w-full p-2 rounded-lg border border-indigo-300 bg-white focus:outline-indigo-500 text-xs text-slate-800"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Este texto figurará textualmente en los presupuestos y facturas emitidas.</p>
                </div>
            )}
        </div>
    );
}

function PermissionRow({ module, v, c, e, a, ad }) {
    return (
        <tr className="hover:bg-slate-50">
            <td className="p-2.5 font-medium">{module}</td>
            <td className="p-2.5 text-center">{v ? <Check className="w-3.5 h-3.5 text-emerald-600 mx-auto" /> : <X className="w-3.5 h-3.5 text-slate-300 mx-auto" />}</td>
            <td className="p-2.5 text-center">{c ? <Check className="w-3.5 h-3.5 text-emerald-600 mx-auto" /> : <X className="w-3.5 h-3.5 text-slate-300 mx-auto" />}</td>
            <td className="p-2.5 text-center">{e ? <Check className="w-3.5 h-3.5 text-emerald-600 mx-auto" /> : <X className="w-3.5 h-3.5 text-slate-300 mx-auto" />}</td>
            <td className="p-2.5 text-center">{a ? <Check className="w-3.5 h-3.5 text-emerald-600 mx-auto" /> : <X className="w-3.5 h-3.5 text-slate-300 mx-auto" />}</td>
            <td className="p-2.5 text-center">{ad ? <Check className="w-3.5 h-3.5 text-emerald-600 mx-auto" /> : <X className="w-3.5 h-3.5 text-slate-300 mx-auto" />}</td>
        </tr>
    );
}

function SidebarItem({ icon: Icon, label, badge, disabled }) {
    return (
        <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-slate-400 text-xs font-medium cursor-not-allowed opacity-60 hover:bg-slate-800/20`}>
            <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 text-slate-500" />
                <span>{label}</span>
            </div>
            {badge && (
                <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded text-slate-400">{badge}</span>
            )}
        </div>
    );
}
