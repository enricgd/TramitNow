// Partió de design/fichaett.html (scripts/import-design.py). Ahora se edita aquí directamente: no regenerar.
import React, { useState, useEffect, useMemo } from 'react';
import {
    Building2, ShieldCheck, FileText, Users, MapPin, Receipt, History, AlertTriangle,
    CheckCircle2, Clock, Plus, Edit3, Trash2, ExternalLink, Download, Upload, Copy,
    Lock, Unlock, ChevronRight, Search, Filter, MoreVertical, X, Check, Info,
    CreditCard, Sparkles, Sliders, Globe, Mail, Phone, Briefcase, FileSpreadsheet,
    Key, Layers, ArrowRight, Save, RefreshCw, AlertCircle, Eye, UserPlus, EyeOff
} from 'lucide-react';
import { PageHeader, Button, Badge, Tabs, Modal, Drawer, Card, SectionTitle, Field, TextInput, Interruptor, Notice, Select, IconButton, Confirmar, CargandoPagina, ErrorCarga, Proximamente } from '../ui';
import { datosDeCp } from './codigosPostales';
import { FORMAS_COBRO } from './serviciosDemo';
import { useMiEtt, mensajeError } from './mi-ett/useMiEtt';
import { leerCampos } from './mi-ett/formulario';

// Los datos (ETT, sociedades, sucursales, usuarios...) llegan de mi-ett/useMiEtt.ts, en modo demo y en real.
// Los de ejemplo están en src/data/memoria.ts. Lo que aún no tiene API sale como «Disponible próximamente».

// Códigos de cuenta de cotización (CCC): uno por provincia y por tipo de personal
const TIPOS_CCC = ['Personas en misión', 'Personal de estructura'];

const fechaES = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');
const diasHasta = (iso) => (iso ? Math.round((new Date(`${iso}T00:00:00`) - new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00')) / 86400000) : null);
const DIAS_AVISO = 60;

export default function FichaEttView() {
    const [activeTab, setActiveTab] = useState('resumen');
    const miEtt = useMiEtt();
    const { company, branches, ccc, users, templates, activity, portales, setPortales, servicios, setServicios, hayAjustes } = miEtt;
    const [cccEdicion, setCccEdicion] = useState(null); // { id?, numero, provincia, tipo, sucursal }
    const [cccAEliminar, setCccAEliminar] = useState(null);

    // UI State
    const [density, setDensity] = useState('comfortable'); // comfortable | compact
    const [toast, setToast] = useState(null);
    // Servicios que factura la ETT además de las horas
    const cambiarServicio = (id, campo, valor) => setServicios(prev => prev.map(x => (x.id === id ? { ...x, [campo]: valor } : x)));
    const [isEditingFiscal, setIsEditingFiscal] = useState(false);
    const [isEditingBilling, setIsEditingBilling] = useState(false);
    const [branchDrawer, setBranchDrawer] = useState({ open: false, mode: 'create', data: null });
    const [userDrawer, setUserDrawer] = useState({ open: false, mode: 'invite', data: null });
    const [sensitiveModal, setSensitiveModal] = useState({ open: false, field: '', pendingValue: '', reason: '', valores: null });
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Toast helper
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3800);
    };

    // Log activity helper
    const logAction = (actionText, type = 'system') => miEtt.registrar(actionText, type);

    // Guarda con el hook: avisa del resultado y devuelve si ha ido bien.
    const guardar = async (accion, mensajeOk) => {
        setIsSaving(true);
        try {
            await accion();
            if (mensajeOk) showToast(mensajeOk);
            return true;
        } catch (e) {
            showToast(mensajeError(e), 'error');
            return false;
        } finally {
            setIsSaving(false);
        }
    };
    const abrirInvitacion = () => (hayAjustes ? setUserDrawer({ open: true, mode: 'invite', data: null }) : showToast('Disponible próximamente: el alta de usuarios aún no está en la API', 'info'));

    if (miEtt.estado === 'cargando') return <CargandoPagina texto="Cargando Mi ETT" />;
    if (miEtt.estado === 'error' || !company) {
        return (
            <div className="w-full px-4 sm:px-6 py-5">
                <ErrorCarga
                    titulo={miEtt.estado === 'error' ? 'No se ha podido cargar Mi ETT' : 'Esta ETT aún no tiene ninguna sociedad'}
                    mensaje={miEtt.estado === 'error' ? miEtt.error : 'Las sociedades las da de alta el equipo de TramitNOW al crear la ETT.'}
                    onReintentar={miEtt.reintentar}
                />
            </div>
        );
    }

    // Lo que falta o caduca pronto, para el Resumen
    const avisos = [];
    const dG = diasHasta(company.garantiaVence);
    if (dG !== null && dG <= DIAS_AVISO) avisos.push({ texto: dG < 0 ? 'Garantía financiera vencida' : `La garantía financiera vence en ${dG} días`, detalle: `${company.garantiaTipo} · ${fechaES(company.garantiaVence)}. Es obligatoria para operar como ETT.`, tab: 'fiscal', tono: dG < 0 ? 'danger' : 'warning' });
    const dC = diasHasta(company.certificadoCaduca);
    if (dC !== null && dC <= DIAS_AVISO) avisos.push({ texto: dC < 0 ? 'Certificado digital caducado' : `El certificado digital caduca en ${dC} días`, detalle: `Sin él no se pueden comunicar altas en el Sistema RED ni contratos en Contrat@.`, tab: 'fiscal', tono: dC < 0 ? 'danger' : 'warning' });
    if (hayAjustes) branches.forEach(b => TIPOS_CCC.forEach(tipo => {
        if (!ccc.some(c => c.sucursal === b.name && c.tipo === tipo)) avisos.push({ texto: `${b.name}: sin CCC de ${tipo.toLowerCase()}`, detalle: 'Añádelo en Datos fiscales → Seguridad Social.', tab: 'fiscal', tono: 'warning' });
    }));
    if (hayAjustes && !company.iban) avisos.push({ texto: 'Falta el IBAN de la ETT', detalle: 'Se imprime en las facturas.', tab: 'facturacion', tono: 'danger' });
    users.filter(u => u.branch === 'Sin asignar').forEach(u => avisos.push({ texto: `${u.name}: sin sucursal asignada`, detalle: u.role, tab: 'usuarios', tono: 'warning' }));
    templates.filter(t => t.status === 'incomplete').forEach(tp => avisos.push({ texto: `Plantilla incompleta: ${tp.name}`, detalle: tp.scope, tab: 'plantillas', tono: 'warning' }));
    const completitud = Math.max(0, 100 - avisos.length * 4);

    const guardarCcc = () => {
        const d = cccEdicion;
        if (!/^\d{2} ?\d{7} ?\d{2}$/.test(d.numero.trim())) { showToast('El CCC tiene 11 cifras: 2 de provincia, 7 de número y 2 de control', 'error'); return; }
        const n = d.numero.replace(/\s/g, '');
        const fila = { ...d, numero: `${n.slice(0, 2)} ${n.slice(2, 9)} ${n.slice(9)}` };
        guardar(() => miEtt.guardarCcc(fila), `CCC ${fila.numero} guardado`).then(ok => {
            if (!ok) return;
            logAction(`${d.id ? 'Modificó' : 'Añadió'} el CCC ${fila.numero} (${fila.provincia}, ${fila.tipo.toLowerCase()})`, 'fiscal');
            setCccEdicion(null);
        });
    };

    return (
        <div className="flex min-h-full w-full font-sans">
            {/* TOAST NOTIFICATION */}
            {toast && (
                <div className="fixed top-5 right-6 z-50 flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-700 fade-in">
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
            <div className="flex-1 flex flex-col min-w-0">
                <div className="w-full px-4 sm:px-6 py-5 space-y-4">
                    <PageHeader
                        title="Mi ETT"
                        status={
                            <>
                                {company.autorizacion && <Badge tone="success" icon={CheckCircle2}>ETT autorizada n.º {company.autorizacion}</Badge>}
                                <Badge tone={avisos.length ? 'warning' : 'success'}>{avisos.length ? `${avisos.length} ${avisos.length === 1 ? 'aviso' : 'avisos'}` : 'Todo en regla'}</Badge>
                            </>
                        }
                        subtitle={
                            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span>{company.legalName}</span>
                                <span className="font-mono">CIF {company.cif}</span>
                                {company.city && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" />Sede central: {company.city}</span>}
                                <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" />{company.lastUpdated}</span>
                            </span>
                        }
                        actions={
                            <>
                                {miEtt.sociedades.length > 1 && (
                                    <Select value={miEtt.sociedadId} onChange={(e) => miEtt.elegirSociedad(e.target.value)} aria-label="Sociedad">
                                        {miEtt.sociedades.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </Select>
                                )}
                                <Button icon={Download} onClick={() => showToast("Exportando ficha completa en formato PDF oficial...", "info")}>Exportar PDF</Button>
                                <Button variant="primary" icon={Edit3} onClick={() => setIsEditingFiscal(true)}>Editar datos fiscales</Button>
                            </>
                        }
                    />

                    <Tabs
                        active={activeTab}
                        onChange={setActiveTab}
                        tabs={[
                            { id: 'resumen', label: 'Resumen' },
                            { id: 'fiscal', label: 'Datos fiscales' },
                            { id: 'facturacion', label: 'Facturación', alert: !company.iban },
                            { id: 'sucursales', label: 'Sucursales', count: branches.length },
                            { id: 'usuarios', label: 'Usuarios y roles', count: users.length },
                            { id: 'plantillas', label: 'Plantillas', count: templates.length },
                            { id: 'portales', label: 'Portales' },
                            { id: 'actividad', label: 'Actividad' },
                        ]}
                    />

                {/* TAB CONTENT AREA */}
                <div className="space-y-6">

                    {/* 1. RESUMEN TAB */}
                    {activeTab === 'resumen' && (
                        <div className="space-y-6 fade-in">
                            {/* Lo que falta o caduca pronto */}
                            {avisos.length > 0 ? (
                                <Card className="p-4 space-y-2">
                                    <SectionTitle>Lo que falta o caduca pronto ({avisos.length})</SectionTitle>
                                    <ul className="space-y-1.5 text-xs">
                                        {avisos.map((a, k) => (
                                            <li key={k} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                                                <span className="flex items-start gap-2">
                                                    <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${a.tono === 'danger' ? 'text-rose-600' : 'text-amber-600'}`} />
                                                    <span><span className="text-slate-900">{a.texto}</span><span className="block text-[11px] text-slate-500">{a.detalle}</span></span>
                                                </span>
                                                <Button size="sm" variant="ghost" onClick={() => setActiveTab(a.tab)}>Revisar</Button>
                                            </li>
                                        ))}
                                    </ul>
                                </Card>
                            ) : <Notice tone="success" icon={CheckCircle2}>Todo en regla: datos fiscales, CCC, garantía, certificado, facturación y usuarios.</Notice>}

                            {/* OVERVIEW STATUS CARDS */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                <StatusCard
                                    title="Datos Fiscales"
                                    status={avisos.some(a => a.tab === 'fiscal') ? 'Revisar' : 'Completos'}
                                    statusColor={avisos.some(a => a.tab === 'fiscal') ? 'amber' : 'emerald'}
                                    subtitle={`CIF, autorización, ${ccc.length} CCC, garantía`}
                                    icon={Building2}
                                    onClick={() => setActiveTab('fiscal')}
                                />
                                <StatusCard
                                    title="Facturación"
                                    status={!hayAjustes ? 'Próximamente' : company.iban ? "Configurado" : "Falta cuenta bancaria"}
                                    statusColor={!hayAjustes ? 'slate' : company.iban ? "emerald" : "amber"}
                                    subtitle={hayAjustes ? `Serie: ${company.billingSeries} • IVA 21%` : 'Series, IVA e IBAN'}
                                    icon={Receipt}
                                    onClick={() => setActiveTab('facturacion')}
                                />
                                <StatusCard
                                    title="Sucursales"
                                    status={`${branches.length} activas`}
                                    statusColor="indigo"
                                    subtitle={branches.map(b => b.city || b.name).join(', ')}
                                    icon={MapPin}
                                    onClick={() => setActiveTab('sucursales')}
                                />
                                <StatusCard
                                    title="Usuarios y Roles"
                                    status={`${users.length} miembros`}
                                    statusColor="indigo"
                                    subtitle={`${new Set(users.map(u => u.role)).size} roles distintos`}
                                    icon={Users}
                                    onClick={() => setActiveTab('usuarios')}
                                />
                                <StatusCard
                                    title="Plantillas Doc."
                                    status={hayAjustes ? `${templates.length} registradas` : 'Próximamente'}
                                    statusColor={hayAjustes ? 'indigo' : 'slate'}
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
                                            <h2 className="text-base font-semibold text-slate-800">Ficha operativa de la organización</h2>
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
                                            <span className="text-slate-400 font-medium block">Razón social oficial</span>
                                            <span className="text-slate-800 font-semibold text-sm mt-0.5 block">{company.legalName}</span>
                                            <span className="text-slate-500 mt-1 block">CIF: <strong className="text-slate-700">{company.cif}</strong></span>
                                        </div>
                                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                                            <span className="text-slate-400 font-medium block">Sede Central y Domicilio Fiscal</span>
                                            <span className="text-slate-800 font-semibold block mt-0.5">{company.address}</span>
                                            <span className="text-slate-500 block">{[company.postalCode, company.city].filter(Boolean).join(' - ')}{company.province && ` (${company.province})`}</span>
                                        </div>
                                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                                            <span className="text-slate-400 font-medium block">Contacto General de la ETT</span>
                                            <span className="text-slate-800 font-medium block mt-0.5">{company.phone}</span>
                                            <span className="text-indigo-600 font-medium block">{company.email}</span>
                                        </div>
                                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                                            <span className="text-slate-400 font-medium block">Parámetros de Facturación</span>
                                            {hayAjustes ? <>
                                            <span className="text-slate-800 font-medium block mt-0.5">Series: {company.billingSeries} y {company.invoicePrefix} (IVA {company.vatRate})</span>
                                            <span className="text-slate-500 block">Forma: {company.paymentMethod}</span>
                                            </> : <span className="text-slate-500 block mt-0.5">Disponible próximamente</span>}
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
                                        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-indigo-600" />
                                            Acciones rápidas
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
                                                onClick={abrirInvitacion}
                                            />
                                            <QuickActionButton
                                                icon={CreditCard}
                                                label="Configurar IBAN y pagos"
                                                onClick={() => { setActiveTab('facturacion'); if (hayAjustes) setIsEditingBilling(true); }}
                                            />
                                            <QuickActionButton
                                                icon={Upload}
                                                label="Cambiar logotipo oficial"
                                                onClick={() => showToast('Disponible próximamente: la subida del logotipo aún no está en la API', 'info')}
                                            />
                                        </div>
                                    </div>

                                    {/* Branches Mini Status */}
                                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-sm font-semibold text-slate-800">Sucursales ({branches.length})</h3>
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
                                                            {b.isHeadquarters && <span className="text-[10px] bg-indigo-100 text-indigo-700 font-semibold px-1 rounded">SEDE</span>}
                                                        </div>
                                                        {b.manager !== undefined && <div className="text-[11px] text-slate-500">Resp: {b.manager || <span className="text-amber-600 italic">Sin asignar</span>}</div>}
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-mono font-semibold text-slate-700">{b.completion}%</span>
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
                        <div className="space-y-6 fade-in">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                                <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-lg font-semibold text-slate-900">Datos fiscales e identificación oficial</h2>
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
                                            Editar datos fiscales
                                        </button>
                                    </div>
                                </div>

                                {/* Fiscal fields display */}
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <InfoField label="Razón Social" value={company.legalName} isSensitive />
                                    <InfoField label="Nombre comercial / marca" value={company.tradeName} />
                                    <InfoField label="CIF / NIF oficial" value={company.cif} isSensitive code />
                                    <InfoField label="Tipo de Sociedad" value={company.companyType} />
                                    <InfoField label="País Fiscal" value={company.country} />
                                    <InfoField label="Dirección fiscal completa" value={company.address} />
                                    <InfoField label="Código postal" value={company.postalCode} />
                                    <InfoField label="Localidad / Municipio" value={company.city} />
                                    <InfoField label="Provincia" value={company.province} />
                                    <InfoField label="Teléfono General" value={company.phone} />
                                    <InfoField label="Email general notificaciones" value={company.email} />
                                    <InfoField label="Sitio web corporativo" value={company.web} isLink />
                                </div>

                                {/* Sensitive Data Notice */}
                                <div className="p-4 mx-6 mb-6 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
                                    <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                                    <div className="text-xs text-amber-900 leading-relaxed">
                                        <strong>Seguridad y trazabilidad fiscal:</strong> La modificación del <strong>CIF/NIF</strong> o de la <strong>Razón Social</strong> requiere confirmación de seguridad con registro de auditoría, ya que afecta a los certificados digitales y a las series de facturas ya emitidas a clientes.
                                    </div>
                                </div>
                            </div>

                            {!hayAjustes ? (
                                <Proximamente titulo="Datos de ETT, Seguridad Social y garantía">
                                    Autorización de ETT, registro mercantil, representante legal, CCC, mutua, garantía financiera y certificado digital. Aún no se guardan: llegarán con su ruta en la API.
                                </Proximamente>
                            ) : <>
                            {/* DATOS DE ETT Y REGISTRO */}
                            <Card className="p-5 space-y-3">
                                <SectionTitle actions={<Button size="sm" icon={Edit3} onClick={() => setIsEditingFiscal(true)}>Editar</Button>}>Empresa de trabajo temporal y registro</SectionTitle>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    <InfoField label="N.º de autorización administrativa de ETT" value={company.autorizacion} code isSensitive />
                                    <InfoField label="Fecha de la autorización" value={fechaES(company.fechaAutorizacion)} />
                                    <InfoField label="CNAE" value={company.cnae} />
                                    <InfoField label="Convenio del personal de estructura" value={company.convenio} />
                                    <InfoField label="Registro mercantil" value={`${company.registroMercantil} · tomo ${company.tomo}, folio ${company.folio}, hoja ${company.hoja}`} />
                                    <InfoField label="Representante legal (firma contratos y CPD)" value={`${company.representante} · ${company.representanteCargo} · DNI ${company.representanteDni}`} />
                                </div>
                                <p className="text-[11px] text-slate-500">La autorización y el registro mercantil se imprimen en contratos, CPD y facturas.</p>
                            </Card>

                            {/* SEGURIDAD SOCIAL: CCC, MUTUA Y PREVENCIÓN */}
                            <Card className="p-5 space-y-3">
                                <SectionTitle actions={<Button size="sm" icon={Plus} onClick={() => setCccEdicion({ numero: '', provincia: company.province, tipo: TIPOS_CCC[0], sucursal: branches[0]?.name || '' })}>Añadir CCC</Button>}>Seguridad Social: códigos de cuenta de cotización (CCC)</SectionTitle>
                                <div className="overflow-x-auto rounded-lg border border-slate-200">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                                                <th className="py-2 px-3 font-medium">CCC</th>
                                                <th className="py-2 px-3 font-medium">Provincia</th>
                                                <th className="py-2 px-3 font-medium">Para</th>
                                                <th className="py-2 px-3 font-medium">Sucursal</th>
                                                <th className="py-2 px-3" aria-label="Acciones"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {ccc.map(c => (
                                                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                                                    <td className="py-2 px-3 font-mono text-slate-900 whitespace-nowrap">{c.numero}</td>
                                                    <td className="py-2 px-3 text-slate-700">{c.provincia}</td>
                                                    <td className="py-2 px-3"><Badge tone={c.tipo === 'Personas en misión' ? 'accent' : 'neutral'}>{c.tipo}</Badge></td>
                                                    <td className="py-2 px-3 text-slate-700">{c.sucursal}</td>
                                                    <td className="py-1 px-2 text-right whitespace-nowrap">
                                                        <IconButton icon={Edit3} title="Editar CCC" onClick={() => setCccEdicion({ ...c })} />
                                                        <IconButton icon={Trash2} title="Eliminar CCC" onClick={() => setCccAEliminar(c)} />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-[11px] text-slate-500">Al comunicar un alta en Contratos y altas se usa el CCC de personas en misión de la provincia del centro de trabajo. El personal de estructura cotiza por el CCC de su sucursal.</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <InfoField label="Mutua colaboradora (accidentes de trabajo)" value={company.mutua} />
                                    <InfoField label="Servicio de prevención" value={company.servicioPrevencion} />
                                </div>
                            </Card>

                            {/* GARANTÍA FINANCIERA Y CERTIFICADO DIGITAL */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {[
                                    { titulo: 'Garantía financiera', vence: company.garantiaVence, texto: 'Obligatoria para las ETT. Se actualiza cada año según la masa salarial.', datos: [['Tipo', company.garantiaTipo], ['Entidad', company.garantiaEntidad], ['Importe', company.garantiaImporte], ['Vence', fechaES(company.garantiaVence)]] },
                                    { titulo: 'Certificado digital y Sistema RED', vence: company.certificadoCaduca, texto: 'Lo usan el Sistema RED (altas y bajas), Contrat@, Delt@ y la factura electrónica.', datos: [['Autorización del Sistema RED', company.redAutorizacion], ['Certificado de empresa caduca', fechaES(company.certificadoCaduca)]] },
                                ].map(b => {
                                    const d = diasHasta(b.vence);
                                    return (
                                        <Card key={b.titulo} className="p-5 space-y-3">
                                            <SectionTitle actions={<Badge tone={d < 0 ? 'danger' : d <= DIAS_AVISO ? 'warning' : 'success'} dot>{d < 0 ? 'Vencido' : d <= DIAS_AVISO ? `Vence en ${d} días` : 'En vigor'}</Badge>}>{b.titulo}</SectionTitle>
                                            <dl className="grid grid-cols-2 gap-2 text-xs">
                                                {b.datos.map(([k, v]) => <div key={k}><dt className="text-[11px] text-slate-500">{k}</dt><dd className="text-slate-900">{v}</dd></div>)}
                                            </dl>
                                            <p className="text-[11px] text-slate-500">{b.texto} Avisamos {DIAS_AVISO} días antes de que venza.</p>
                                            <Button size="sm" icon={Edit3} onClick={() => setIsEditingFiscal(true)}>Actualizar</Button>
                                        </Card>
                                    );
                                })}
                            </div>
                            </>}
                        </div>
                    )}

                    {/* 3. FACTURACIÓN TAB */}
                    {activeTab === 'facturacion' && !hayAjustes && (
                        <div className="fade-in">
                            <Proximamente titulo="Facturación de la ETT">Series de facturas, IVA, IBAN, forma de pago y servicios que factura la ETT. Aún no se guardan: llegarán con su ruta en la API.</Proximamente>
                        </div>
                    )}
                    {activeTab === 'facturacion' && hayAjustes && (
                        <div className="space-y-6 fade-in">

                            {/* Warning banner if bank account is missing */}
                            {!company.iban && (
                                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                                        <div>
                                            <h3 className="text-sm font-semibold text-rose-900">Datos de facturación incompletos</h3>
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
                                        <h2 className="text-lg font-semibold text-slate-900">Parámetros financieros y facturación emisora</h2>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Configura los valores por defecto que se aplicarán al facturar servicios de trabajo temporal a clientes.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setIsEditingBilling(true)}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        Editar parámetros de facturación
                                    </button>
                                </div>

                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <InfoField label="Serie de facturas" value={`${company.billingSeries} · próxima ${company.billingSeries}${String(company.proximaFactura).padStart(4, '0')}`} code />
                                    <InfoField label="Serie de rectificativas" value={`${company.invoicePrefix} · próxima ${company.invoicePrefix}${String(company.proximaRectificativa).padStart(4, '0')}`} code />
                                    <InfoField label="IVA general aplicable" value={company.vatRate} />
                                    <InfoField label="Retenciones IRPF por defecto" value={company.withholdingRate} />

                                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                                        <span className="text-slate-400 font-medium text-xs block">Cuenta Bancaria Principal (IBAN)</span>
                                        {company.iban ? (
                                            <span className="font-mono font-semibold text-slate-800 text-sm mt-0.5 block">{company.iban}</span>
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
                                        <span className="text-slate-400 font-medium text-xs block">Forma de pago predeterminada</span>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="font-semibold text-slate-800 text-xs">
                                                {company.paymentMethod === 'Otro' ? `Personalizado: ${company.customPaymentMethod || 'Sin especificar'}` : company.paymentMethod}
                                            </span>
                                            <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 text-[10px] font-semibold">Base</span>
                                        </div>
                                    </div>

                                    <InfoField label="Condiciones de Vencimiento" value={company.paymentTerms} />
                                    <InfoField label="Moneda de Emisión" value={company.currency} />
                                    <InfoField label="Email contacto administración" value={company.adminEmail} />

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
                                    <span className="text-[11px] text-slate-400">Numeración sin huecos por serie</span>
                                </div>
                            </div>

                            {/* SERVICIOS QUE SE FACTURAN ADEMÁS DE LAS HORAS */}
                            <Card className="overflow-hidden">
                                <div className="p-4 border-b border-slate-100 flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-900">Servicios que factura la ETT</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">Además de las horas: selección de personal, formación, reconocimientos... Se registran en Facturación («Añadir servicio a facturar») con este precio por defecto, que se puede cambiar en cada caso.</p>
                                    </div>
                                    <Button size="sm" icon={Plus} onClick={() => setServicios(prev => [...prev, { id: `srv-${Date.now()}`, nombre: '', cobro: 'fijo', valor: 0, unidad: 'servicio', activo: true, nuevo: true }])}>Añadir servicio</Button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                                                <th className="py-2 px-4 font-medium">Servicio</th>
                                                <th className="py-2 px-4 font-medium">Cómo se cobra</th>
                                                <th className="py-2 px-4 font-medium text-right">Precio o %</th>
                                                <th className="py-2 px-4 font-medium">Se cuenta por</th>
                                                <th className="py-2 px-4 font-medium">Activo</th>
                                                <th className="py-2 px-2" aria-label="Acciones"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {servicios.map(x => (
                                                <tr key={x.id} className="border-b border-slate-100 last:border-0">
                                                    <td className="py-2 px-4"><TextInput value={x.nombre} autoFocus={x.nuevo} placeholder="Nombre del servicio" onChange={(e) => cambiarServicio(x.id, 'nombre', e.target.value)} aria-label="Nombre del servicio" /></td>
                                                    <td className="py-2 px-4">
                                                        <Select value={x.cobro} onChange={(e) => { const v = e.target.value; cambiarServicio(x.id, 'cobro', v); cambiarServicio(x.id, 'unidad', FORMAS_COBRO[v].unidad); }} aria-label={`Cómo se cobra ${x.nombre}`}>
                                                            {Object.entries(FORMAS_COBRO).map(([id, f]) => <option key={id} value={id}>{f.texto}</option>)}
                                                        </Select>
                                                    </td>
                                                    <td className="py-2 px-4">
                                                        <span className="flex items-center justify-end gap-1.5">
                                                            <TextInput type="number" step="0.01" min="0" value={x.valor} onChange={(e) => cambiarServicio(x.id, 'valor', parseFloat(e.target.value) || 0)} className="w-24! text-right" aria-label={`Precio de ${x.nombre}`} />
                                                            <span className="text-slate-500 w-4">{x.cobro === 'porcentaje' ? '%' : '€'}</span>
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-4">{x.cobro === 'porcentaje' || x.cobro === 'fijo' ? <span className="text-slate-500">{x.cobro === 'porcentaje' ? 'Salario anual de la persona contratada' : 'Cada servicio'}</span> : <TextInput value={x.unidad} onChange={(e) => cambiarServicio(x.id, 'unidad', e.target.value)} className="w-28!" aria-label={`Unidad de ${x.nombre}`} />}</td>
                                                    <td className="py-2 px-4"><Interruptor checked={x.activo} onChange={(v) => cambiarServicio(x.id, 'activo', v)} label={`${x.nombre} activo`} /></td>
                                                    <td className="py-2 px-2 text-right">{x.nuevo && <IconButton icon={Trash2} title="Quitar" onClick={() => setServicios(prev => prev.filter(y => y.id !== x.id))} />}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between gap-3">
                                    <span className="text-[11px] text-slate-500">Los servicios desactivados ya no salen al registrar uno nuevo; los ya facturados no cambian.</span>
                                    <Button size="sm" variant="primary" icon={Save} disabled={isSaving} onClick={() => guardar(miEtt.guardarServicios, 'Servicios guardados')}>Guardar</Button>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* 4. SUCURSALES TAB */}
                    {activeTab === 'sucursales' && (
                        <div className="space-y-6 fade-in">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">Sucursales y delegaciones territoriales</h2>
                                    <p className="text-xs text-slate-500">Gestión de centros de trabajo, responsables de oficina y asignación operativa.</p>
                                </div>
                                <button
                                    onClick={() => setBranchDrawer({ open: true, mode: 'create', data: null })}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition"
                                >
                                    <Plus className="w-4 h-4" />
                                    Añadir sucursal
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
                                                        <span className="font-mono text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                                            {b.code}
                                                        </span>
                                                        {b.isHeadquarters && (
                                                            <span className="text-[10px] font-semibold bg-slate-900 text-white px-2 py-0.5 rounded-full">
                                                                SEDE CENTRAL
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h3 className="text-base font-semibold text-slate-900 mt-1.5">{b.name}</h3>
                                                    {miEtt.sociedades.length > 1 && <div className="text-[11px] text-slate-500">{b.sociedad}</div>}
                                                </div>
                                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Activa"></span>
                                            </div>

                                            <div className="mt-4 space-y-2 text-xs text-slate-600">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <span className="truncate">{[b.address, b.city].filter(Boolean).join(', ') || <span className="text-slate-400 italic">Sin dirección</span>}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <span>{b.phone || <span className="text-slate-400 italic">Sin teléfono</span>}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <span>{b.activeUsers} usuarios asignados</span>
                                                </div>
                                                {b.manager !== undefined && <div className="flex items-center gap-2">
                                                    <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <span>
                                                        Responsable: {b.manager ? (
                                                            <strong className="text-slate-800">{b.manager}</strong>
                                                        ) : (
                                                            <span className="text-amber-600 font-semibold italic">Sin responsable asignado</span>
                                                        )}
                                                    </span>
                                                </div>}
                                            </div>
                                        </div>

                                        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                                            <div>
                                                <div className="text-[10px] text-slate-400 font-semibold">Completitud</div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold text-slate-800">{b.completion}%</span>
                                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${b.completion}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => setBranchDrawer({ open: true, mode: 'edit', data: b })}
                                                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                                                    title="Editar sucursal"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                </button>
                                                {!b.isHeadquarters && (
                                                    <button
                                                        onClick={() => {
                                                            if (confirm(`¿Desactivar la sucursal ${b.name}? Los comerciales pasarán a la sede central.`)) {
                                                                guardar(() => miEtt.desactivarSucursal(b.id), `Sucursal ${b.name} desactivada.`).then(ok => ok && logAction(`Desactivó la sucursal ${b.name}`, 'branch'));
                                                            }
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
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
                        <div className="space-y-6 fade-in">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">Usuarios, comerciales y matriz de roles</h2>
                                    <p className="text-xs text-slate-500">Gestión de accesos, permisos por módulo ETT y delegación de sucursales.</p>
                                </div>
                                <button
                                    onClick={abrirInvitacion}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Invitar usuario
                                </button>
                            </div>

                            {miEtt.errorUsuarios && <Notice tone="warning" icon={AlertTriangle}>No se pueden ver los usuarios: {miEtt.errorUsuarios}</Notice>}

                            {/* Users List Table */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                                <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                        <span>Equipo de la ETT ({users.filter(u => u.status === 'active').length} miembros activos)</span>
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
                                    <thead className="bg-slate-50 text-slate-500 font-semibold text-[10px] border-b border-slate-100">
                                        <tr>
                                            <th className="py-3 px-4">Usuario</th>
                                            <th className="py-3 px-4">Rol en ERP</th>
                                            <th className="py-3 px-4">Departamento</th>
                                            <th className="py-3 px-4">Sucursal asignada</th>
                                            <th className="py-3 px-4">Estado</th>
                                            <th className="py-3 px-4 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {users.map(u => (
                                            <tr key={u.id} className="hover:bg-slate-50/80 transition">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-semibold flex items-center justify-center text-xs">
                                                            {u.name.split(' ').slice(0, 2).map(n=>n[0]).join('')}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-slate-800">{u.name}</div>
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
                                                            <Clock className="w-3 h-3" /> {u.statusLabel}
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
                                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                        <Key className="w-4 h-4 text-indigo-600" />
                                        Matriz de permisos por módulo ETT
                                    </h3>
                                    <p className="text-xs text-slate-500">Configuración granular de capacidades por rol del backoffice.</p>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-50 text-[11px] text-slate-600 font-semibold border-b border-slate-200">
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
                    {activeTab === 'plantillas' && !hayAjustes && (
                        <div className="fade-in"><Proximamente titulo="Plantillas documentales">Presupuestos, facturas y contratos con el membrete de la ETT. Llegarán con los documentos (fase 1 del plan).</Proximamente></div>
                    )}
                    {activeTab === 'plantillas' && hayAjustes && (
                        <div className="space-y-6 fade-in">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">Plantillas documentales oficiales</h2>
                                    <p className="text-xs text-slate-500">Formatos oficiales de presupuestos, facturas y contratos con membrete de la ETT.</p>
                                </div>
                                <button
                                    onClick={() => showToast("Subida de nueva plantilla PDF/DOCX simulada")}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition"
                                >
                                    <Upload className="w-4 h-4" />
                                    Subir plantilla
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {templates.map(tpl => (
                                    <div key={tpl.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                                    {tpl.category}
                                                </span>
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${tpl.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                                    {tpl.status === 'active' ? 'Activa' : 'Incompleta'}
                                                </span>
                                            </div>
                                            <h3 className="text-sm font-semibold text-slate-900 mt-2">{tpl.name}</h3>
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

                    {/* PORTALES: subdominio de la ETT y correos de bienvenida */}
                    {activeTab === 'portales' && !hayAjustes && (
                        <div className="fade-in"><Proximamente titulo="Portales">Subdominio de la ETT y correos de bienvenida del Área de empresas y del portal del trabajador. Llegarán con los portales (fase 11 del plan).</Proximamente></div>
                    )}
                    {activeTab === 'portales' && hayAjustes && (
                        <div className="space-y-4 fade-in">
                            <Card className="p-5 space-y-4">
                                <SectionTitle actions={<Badge tone="success" dot>Activos</Badge>}>Dirección de los portales</SectionTitle>
                                <p className="text-xs text-slate-600 -mt-1">
                                    La ETT tiene su propio subdominio de TramitNOW con dos portales, cada uno con su dirección y su acceso: uno para las
                                    empresas cliente y otro para las personas que trabajan o han trabajado con la ETT.
                                </p>
                                <div className="max-w-md">
                                    <Field label="Subdominio" hint="Solo minúsculas, números y guiones.">
                                        <div className="flex items-center gap-2">
                                            <TextInput value={portales.subdominio} onChange={(e) => setPortales(p => ({ ...p, subdominio: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} />
                                            <span className="text-xs text-slate-500 whitespace-nowrap">.tramitnow.com</span>
                                        </div>
                                    </Field>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                    {[
                                        { titulo: 'Área de empresas', boton: 'Ver el Área de empresas', ruta: 'empresas', demo: '/empresas.html', icono: Building2, acceso: 'Correo y contraseña. El acceso y los permisos de cada contacto se dan en Empresas → Contactos.', texto: 'Ver al personal en misión, validar las horas, firmar los CPD y descargar presupuestos y facturas.' },
                                        { titulo: 'Portal del trabajador', boton: 'Ver el portal del trabajador', ruta: 'trabajadores', demo: '/trabajadores.html', icono: Users, acceso: 'DNI o NIE y código por SMS, sin contraseña.', texto: 'Para quien trabaja o ha trabajado con la ETT: contratos, nóminas, horas, avisos de ausencia, prevención y sus datos y documentos.' },
                                    ].map(p => (
                                        <div key={p.ruta} className="rounded-lg border border-slate-200 p-3 space-y-1">
                                            <div className="flex items-center gap-2 font-medium text-slate-900"><p.icono className="w-4 h-4 text-indigo-600" />{p.titulo}</div>
                                            <div className="text-indigo-600">https://{portales.subdominio || 'tu-ett'}.tramitnow.com/{p.ruta}</div>
                                            <p className="text-slate-500">{p.texto}</p>
                                            <p className="text-slate-500"><span className="font-medium text-slate-700">Acceso:</span> {p.acceso}</p>
                                            <Button size="sm" icon={ExternalLink} onClick={() => window.open(p.demo, '_blank')}>{p.boton}</Button>
                                        </div>
                                    ))}
                                </div>
                                {portales.subdominio !== miEtt.portalesGuardados?.subdominio && (
                                    <Notice tone="warning" icon={AlertTriangle}>
                                        Si cambias el subdominio, los enlaces que ya tienen las empresas y los candidatos dejarán de funcionar.
                                    </Notice>
                                )}
                                <p className="text-[11px] text-slate-500">Los portales usan el logo y el nombre de la ETT, con los colores de TramitNow.</p>
                            </Card>

                            <Card className="p-5 space-y-4">
                                <SectionTitle>Correos de bienvenida</SectionTitle>
                                <p className="text-xs text-slate-600 -mt-1">
                                    Se envían con el acceso al portal. En cada petición se pueden activar o no; aquí se decide el valor por defecto y el texto.
                                    Puedes usar {'{empresa}'}, {'{nombre}'}, {'{ett}'} y {'{enlace}'}.
                                </p>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {[
                                        { id: 'empresa', titulo: 'Para empresas', cuando: 'Cuando se da acceso a un contacto del cliente (Empresas → Contactos).' },
                                        { id: 'candidato', titulo: 'Para candidatos', cuando: 'Cuando alguien se inscribe en una oferta o se le propone para una plaza.' },
                                    ].map(b => {
                                        const datos = portales.bienvenida[b.id];
                                        const cambiar = (campo, valor) => setPortales(p => ({ ...p, bienvenida: { ...p.bienvenida, [b.id]: { ...p.bienvenida[b.id], [campo]: valor } } }));
                                        return (
                                            <div key={b.id} className="rounded-lg border border-slate-200 p-4 space-y-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="text-xs font-medium text-slate-900">{b.titulo}</div>
                                                        <div className="text-[11px] text-slate-500">{b.cuando}</div>
                                                    </div>
                                                    <Interruptor checked={datos.activo} onChange={(v) => cambiar('activo', v)} label={`Activar por defecto la bienvenida ${b.titulo.toLowerCase()}`} />
                                                </div>
                                                <Field label="Asunto"><TextInput value={datos.asunto} onChange={(e) => cambiar('asunto', e.target.value)} /></Field>
                                                <Field label="Texto">
                                                    <textarea rows={5} value={datos.texto} onChange={(e) => cambiar('texto', e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                                </Field>
                                                <Button size="sm" icon={Eye} onClick={() => showToast(`Correo de prueba «${datos.asunto}» enviado a tu email`, 'info')}>Enviarme una prueba</Button>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-end">
                                    <Button variant="primary" icon={Save} disabled={isSaving} onClick={() => guardar(miEtt.guardarPortales, 'Configuración de los portales guardada')}>Guardar</Button>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* 7. ACTIVIDAD TAB */}
                    {activeTab === 'actividad' && !hayAjustes && (
                        <div className="fade-in"><Proximamente titulo="Registro de actividad">El historial de cambios de la ETT llegará con el historial de actividad común a todas las fichas (fase 1 del plan).</Proximamente></div>
                    )}
                    {activeTab === 'actividad' && hayAjustes && (
                        <div className="space-y-6 fade-in">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
                                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                                    <div>
                                        <h2 className="text-base font-semibold text-slate-900">Registro de auditoría de la ETT</h2>
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

                </div>
                </div>
            </div>

            {/* ========================================================= */}
            {/* DRAWER: EDITAR DATOS FISCALES */}
            {/* ========================================================= */}
            {isEditingFiscal && (
                <Drawer
                  title={'Editar datos fiscales'}
                  subtitle={'Datos de la propia ETT'}
                  onClose={() => setIsEditingFiscal(false)}
                  width="max-w-xl"
                  footer={<>
                            <button
                                onClick={() => setIsEditingFiscal(false)}
                                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                disabled={isSaving}
                                onClick={() => {
                                    const valores = leerCampos('edit-', ['legalName', 'tradeName', 'cif', 'companyType', 'address', 'postalCode', 'city', 'province', 'phone', 'email', 'web', 'autorizacion', 'fechaAutorizacion', 'convenio', 'registroMercantil', 'tomo', 'folio', 'hoja', 'representante', 'representanteDni', 'representanteCargo', 'mutua', 'servicioPrevencion', 'garantiaTipo', 'garantiaEntidad', 'garantiaImporte', 'garantiaVence', 'redAutorizacion', 'certificadoCaduca']);

                                    // Check if sensitive field changed
                                    if (valores.cif !== company.cif || valores.legalName !== company.legalName) {
                                        setSensitiveModal({
                                            open: true,
                                            field: valores.cif !== company.cif ? 'CIF/NIF' : 'Razón Social',
                                            pendingValue: valores.cif !== company.cif ? valores.cif : valores.legalName,
                                            reason: '',
                                            valores,
                                        });
                                        return;
                                    }

                                    guardar(() => miEtt.guardarFiscal(valores), "Datos fiscales actualizados con éxito").then(ok => {
                                        if (!ok) return;
                                        setIsEditingFiscal(false);
                                        logAction("Actualizó los datos de contacto y domicilio de la ETT", "fiscal");
                                    });
                                }}
                                className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition flex items-center gap-1.5"
                            >
                                <Save className="w-3.5 h-3.5" />
                                Guardar Cambios
                            </button>
                  </>}
                >

                        <div className="space-y-4 text-xs">
                            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-900">
                                <strong>Nota de seguridad:</strong> Si modificas el CIF o la Razón Social se solicitará confirmación expresa antes de guardar.
                            </div>
                            {miEtt.sociedades.length > 1 && <p className="text-slate-500">Sociedad: <strong className="text-slate-700">{company.legalName}</strong>. Para editar otra, elígela arriba, junto al título.</p>}

                            <DrawerInput
                                label="Razón social oficial"
                                defaultValue={company.legalName}
                                id="edit-legalName"
                            />
                            {hayAjustes && <DrawerInput
                                label="Nombre Comercial"
                                defaultValue={company.tradeName}
                                id="edit-tradeName"
                            />}
                            <DrawerInput
                                label="CIF / NIF"
                                defaultValue={company.cif}
                                id="edit-cif"
                            />
                            {hayAjustes && <DrawerInput
                                label="Tipo de Sociedad"
                                defaultValue={company.companyType}
                                id="edit-companyType"
                            />}
                            <DrawerInput
                                label="Dirección Fiscal"
                                defaultValue={company.address}
                                id="edit-address"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <DrawerInput
                                    label="Código postal (rellena la provincia)"
                                    defaultValue={company.postalCode}
                                    id="edit-postalCode"
                                    onChange={(e) => {
                                        const { provincia, poblacion } = datosDeCp(e.target.value.trim());
                                        if (provincia) document.getElementById('edit-province').value = provincia;
                                        if (poblacion) document.getElementById('edit-city').value = poblacion;
                                    }}
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
                                label="Email general de notificaciones"
                                defaultValue={company.email}
                                id="edit-email"
                            />
                            <DrawerInput
                                label="Web Corporativa"
                                defaultValue={company.web}
                                id="edit-web"
                            />

                            {!hayAjustes ? (
                                <Notice icon={Clock}>Nombre comercial, forma jurídica, datos de ETT, registro mercantil, representante, Seguridad Social, garantía y certificado: disponible próximamente.</Notice>
                            ) : <>
                            <SectionTitle>Empresa de trabajo temporal y registro</SectionTitle>
                            <div className="grid grid-cols-2 gap-3">
                                <DrawerInput label="N.º de autorización de ETT" defaultValue={company.autorizacion} id="edit-autorizacion" />
                                <DrawerInput label="Fecha de la autorización" type="date" defaultValue={company.fechaAutorizacion} id="edit-fechaAutorizacion" />
                            </div>
                            <DrawerInput label="Convenio del personal de estructura" defaultValue={company.convenio} id="edit-convenio" />
                            <DrawerInput label="Registro mercantil" defaultValue={company.registroMercantil} id="edit-registroMercantil" />
                            <div className="grid grid-cols-3 gap-3">
                                <DrawerInput label="Tomo" defaultValue={company.tomo} id="edit-tomo" />
                                <DrawerInput label="Folio" defaultValue={company.folio} id="edit-folio" />
                                <DrawerInput label="Hoja" defaultValue={company.hoja} id="edit-hoja" />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <DrawerInput label="Representante legal" defaultValue={company.representante} id="edit-representante" />
                                <DrawerInput label="DNI" defaultValue={company.representanteDni} id="edit-representanteDni" />
                                <DrawerInput label="Cargo" defaultValue={company.representanteCargo} id="edit-representanteCargo" />
                            </div>

                            <SectionTitle>Seguridad Social y prevención</SectionTitle>
                            <DrawerInput label="Mutua colaboradora" defaultValue={company.mutua} id="edit-mutua" />
                            <DrawerInput label="Servicio de prevención" defaultValue={company.servicioPrevencion} id="edit-servicioPrevencion" />
                            <p className="text-[11px] text-slate-500">Los CCC se añaden y se editan en la tabla de Datos fiscales.</p>

                            <SectionTitle>Garantía financiera</SectionTitle>
                            <div className="grid grid-cols-2 gap-3">
                                <DrawerInput label="Tipo (aval, seguro de caución o depósito)" defaultValue={company.garantiaTipo} id="edit-garantiaTipo" />
                                <DrawerInput label="Entidad" defaultValue={company.garantiaEntidad} id="edit-garantiaEntidad" />
                                <DrawerInput label="Importe" defaultValue={company.garantiaImporte} id="edit-garantiaImporte" />
                                <DrawerInput label="Vence" type="date" defaultValue={company.garantiaVence} id="edit-garantiaVence" />
                            </div>

                            <SectionTitle>Certificado digital y Sistema RED</SectionTitle>
                            <div className="grid grid-cols-2 gap-3">
                                <DrawerInput label="Autorización del Sistema RED" defaultValue={company.redAutorizacion} id="edit-redAutorizacion" />
                                <DrawerInput label="El certificado caduca" type="date" defaultValue={company.certificadoCaduca} id="edit-certificadoCaduca" />
                            </div>
                            </>}
                        </div>

                </Drawer>
            )}

            {/* CCC: añadir o editar */}
            {cccEdicion && (
                <Modal
                    title={cccEdicion.id ? `Editar CCC ${cccEdicion.numero}` : 'Añadir CCC'}
                    subtitle="Código de cuenta de cotización de la Seguridad Social"
                    onClose={() => setCccEdicion(null)}
                    size="max-w-md"
                    footer={<>
                        <Button onClick={() => setCccEdicion(null)}>Cancelar</Button>
                        <Button variant="primary" icon={Save} disabled={isSaving} onClick={guardarCcc}>Guardar</Button>
                    </>}
                >
                    <div className="space-y-3 text-xs">
                        <Field label="Número" hint="11 cifras: provincia (2), número (7) y control (2). Por ejemplo: 48 0000001 01">
                            <TextInput value={cccEdicion.numero} onChange={(e) => { const v = e.target.value; setCccEdicion(c => ({ ...c, numero: v, provincia: datosDeCp(v.replace(/\D/g, '').slice(0, 2) + '000').provincia || c.provincia })); }} className="font-mono" />
                        </Field>
                        <Field label="Provincia" hint="Sale de las dos primeras cifras."><TextInput value={cccEdicion.provincia} onChange={(e) => setCccEdicion(c => ({ ...c, provincia: e.target.value }))} /></Field>
                        <Field label="Para">
                            <Select value={cccEdicion.tipo} onChange={(e) => setCccEdicion(c => ({ ...c, tipo: e.target.value }))} className="w-full">
                                {TIPOS_CCC.map(x => <option key={x} value={x}>{x}</option>)}
                            </Select>
                        </Field>
                        <Field label="Sucursal">
                            <Select value={cccEdicion.sucursal} onChange={(e) => setCccEdicion(c => ({ ...c, sucursal: e.target.value }))} className="w-full">
                                {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                            </Select>
                        </Field>
                    </div>
                </Modal>
            )}
            {cccAEliminar && (
                <Confirmar title={`Eliminar el CCC ${cccAEliminar.numero}`} onClose={() => setCccAEliminar(null)} onConfirm={() => {
                    const fila = cccAEliminar;
                    setCccAEliminar(null);
                    guardar(() => miEtt.eliminarCcc(fila.id), `CCC ${fila.numero} eliminado`).then(ok => ok && logAction(`Eliminó el CCC ${fila.numero}`, 'fiscal'));
                }}>
                    {cccAEliminar.provincia} · {cccAEliminar.tipo.toLowerCase()} · {cccAEliminar.sucursal}. Si hay personas dadas de alta con este CCC, hay que pasarlas a otro antes.
                </Confirmar>
            )}

            {/* ========================================================= */}
            {/* DRAWER: EDITAR FACTURACIÓN & FORMA DE PAGO */}
            {/* ========================================================= */}
            {isEditingBilling && (
                <Drawer
                  title={'Facturación y cobros'}
                  subtitle={'Datos con los que se emiten las facturas'}
                  onClose={() => setIsEditingBilling(false)}
                  width="max-w-xl"
                  footer={<>
                            <button
                                onClick={() => setIsEditingBilling(false)}
                                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                disabled={isSaving}
                                onClick={() => {
                                    const v = leerCampos('edit-', ['billingSeries', 'invoicePrefix', 'vatRate', 'withholdingRate', 'iban', 'swiftBic', 'paymentMethodSelect', 'customPaymentInput', 'paymentTerms', 'adminEmail']);
                                    const { paymentMethodSelect, customPaymentInput = '', ...valores } = v;
                                    guardar(() => miEtt.guardarFacturacion({ ...valores, paymentMethod: paymentMethodSelect, customPaymentMethod: customPaymentInput }), "Parámetros de facturación guardados correctamente").then(ok => {
                                        if (!ok) return;
                                        setIsEditingBilling(false);
                                        logAction("Actualizó cuenta bancaria IBAN y condiciones de facturación", "billing");
                                    });
                                }}
                                className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition flex items-center gap-1.5"
                            >
                                <Save className="w-3.5 h-3.5" />
                                Guardar Parámetros
                            </button>
                  </>}
                >

                        <div className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <DrawerInput
                                    label="Serie de facturas"
                                    defaultValue={company.billingSeries}
                                    id="edit-billingSeries"
                                />
                                <DrawerInput
                                    label="Serie de rectificativas"
                                    defaultValue={company.invoicePrefix}
                                    id="edit-invoicePrefix"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">IVA general aplicable</label>
                                    <select
                                        id="edit-vatRate"
                                        defaultValue={company.vatRate}
                                        className="w-full p-2 rounded-lg border border-slate-200 bg-white focus:outline-indigo-500"
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
                                <div className="font-semibold text-indigo-950 flex items-center gap-1.5">
                                    <CreditCard className="w-4 h-4 text-indigo-700" />
                                    Cuenta bancaria para cobro de facturas
                                </div>
                                <DrawerInput
                                    label="IBAN oficial de la ETT (obligatorio)"
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
                                label="Condiciones de vencimiento estándar"
                                defaultValue={company.paymentTerms}
                                id="edit-paymentTerms"
                            />
                            <DrawerInput
                                label="Email de contacto de administración"
                                defaultValue={company.adminEmail}
                                id="edit-adminEmail"
                            />
                        </div>

                </Drawer>
            )}

            {/* ========================================================= */}
            {/* DRAWER: AÑADIR / EDITAR SUCURSAL */}
            {/* ========================================================= */}
            {branchDrawer.open && (
                <Drawer
                  title={branchDrawer.mode === 'create' ? 'Nueva sucursal' : `Editar ${branchDrawer.data?.name}`}
                  subtitle={'Delegaciones comerciales y de atención'}
                  onClose={() => setBranchDrawer({ open: false, mode: 'create', data: null })}
                  width="max-w-md"
                  footer={<>
                            <button
                                onClick={() => setBranchDrawer({ open: false, mode: 'create', data: null })}
                                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                disabled={isSaving}
                                onClick={() => {
                                    const valores = leerCampos('branch-', ['name', 'code', 'city', 'address', 'phone', 'email', 'manager', 'companyId']);
                                    valores.isHeadquarters = document.getElementById('branch-isHeadquarters')?.checked ?? false;
                                    const nameVal = valores.name;
                                    const crear = branchDrawer.mode === 'create';
                                    guardar(() => miEtt.guardarSucursal(crear ? null : branchDrawer.data.id, valores), crear ? `Sucursal ${nameVal} creada con éxito` : `Sucursal ${nameVal} actualizada`).then(ok => {
                                        if (!ok) return;
                                        logAction(crear ? `Añadió nueva sucursal: ${nameVal}` : `Modificó la sucursal: ${nameVal}`, 'branch');
                                        setBranchDrawer({ open: false, mode: 'create', data: null });
                                    });
                                }}
                                className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition"
                            >
                                {branchDrawer.mode === 'create' ? 'Crear Sucursal' : 'Guardar Sucursal'}
                            </button>
                  </>}
                >

                        <div className="space-y-4 text-xs">
                            {branchDrawer.mode === 'create' && miEtt.sociedades.length > 1 && (
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Sociedad</label>
                                    <select id="branch-companyId" defaultValue={miEtt.sociedadId} className="w-full p-2 rounded-lg border border-slate-200 bg-white focus:outline-indigo-500">
                                        {miEtt.sociedades.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            )}
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
                                label="Dirección física de la oficina"
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
                            {hayAjustes && <DrawerInput
                                label="Responsable de Sucursal"
                                placeholder="Nombre del director de delegación"
                                defaultValue={branchDrawer.data?.manager || ''}
                                id="branch-manager"
                            />}

                            <div className="pt-2">
                                <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                                    <input
                                        type="checkbox"
                                        id="branch-isHeadquarters"
                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                        defaultChecked={branchDrawer.data?.isHeadquarters || false}
                                        disabled={branchDrawer.data?.isHeadquarters}
                                    />
                                    <span>Sede Central Principal de la ETT</span>
                                </label>
                            </div>
                        </div>

                </Drawer>
            )}

            {/* ========================================================= */}
            {/* DRAWER: INVITAR / EDITAR USUARIO */}
            {/* ========================================================= */}
            {userDrawer.open && (
                <Drawer
                  title={userDrawer.mode === 'invite' ? 'Invitar usuario' : `Permisos de ${userDrawer.data?.name}`}
                  subtitle={'Rol y ámbito territorial'}
                  onClose={() => setUserDrawer({ open: false, mode: 'invite', data: null })}
                  width="max-w-md"
                  footer={<>
                            <button
                                onClick={() => setUserDrawer({ open: false, mode: 'invite', data: null })}
                                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                disabled={isSaving}
                                onClick={() => {
                                    const { name, email, role: roleId, branch: branchValue } = leerCampos('user-', ['name', 'email', 'role', 'branch']);
                                    if (!name || !email) {
                                        showToast("Nombre y email son requeridos", "error");
                                        return;
                                    }
                                    const role = miEtt.roles.find(r => r.id === roleId)?.name ?? '';
                                    const invitar = userDrawer.mode === 'invite';
                                    guardar(() => (invitar ? miEtt.invitarUsuario({ name, email, roleId, branchValue }) : miEtt.guardarUsuario(userDrawer.data.id, { name, email, roleId, branchValue })), invitar ? `Invitación enviada a ${email}` : `Usuario ${name} actualizado`).then(ok => {
                                        if (!ok) return;
                                        logAction(invitar ? `Invitó al usuario ${name} con rol ${role}` : `Actualizó rol y permisos de ${name}`, 'users');
                                        setUserDrawer({ open: false, mode: 'invite', data: null });
                                    });
                                }}
                                className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition"
                            >
                                {userDrawer.mode === 'invite' ? 'Enviar Invitación' : 'Guardar Usuario'}
                            </button>
                  </>}
                >

                        <div className="space-y-4 text-xs">
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
                                    defaultValue={userDrawer.data?.roleId || miEtt.roles.find(r => r.code === 'comercial')?.id}
                                    className="w-full p-2 rounded-lg border border-slate-200 bg-white focus:outline-indigo-500"
                                >
                                    {miEtt.roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Sucursal asignada</label>
                                <select
                                    id="user-branch"
                                    defaultValue={userDrawer.data ? userDrawer.data.branchValue : branches[0]?.id}
                                    className="w-full p-2 rounded-lg border border-slate-200 bg-white focus:outline-indigo-500"
                                >
                                    <option value="*">Todas las sucursales (Ámbito Global)</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                    <option value="">Sin asignar (Pendiente)</option>
                                </select>
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Mensaje de bienvenida (Opcional)</label>
                                <textarea
                                    rows="2"
                                    placeholder="Te damos la bienvenida al backoffice de ETT Global..."
                                    className="w-full p-2 rounded-lg border border-slate-200 bg-white focus:outline-indigo-500 text-xs"
                                ></textarea>
                            </div>
                        </div>

                </Drawer>
            )}

            {/* ========================================================= */}
            {/* MODAL: CONFIRMACIÓN DE CAMBIO SENSIBLE (CIF/RAZÓN SOCIAL) */}
            {/* ========================================================= */}
            {sensitiveModal.open && (
                <Modal
                  title={`¿Confirmar el cambio de ${sensitiveModal.field}?`}
                  onClose={() => setSensitiveModal({ open: false, field: '', pendingValue: '', reason: '', valores: null })}
                  size="max-w-md"
                  footer={<>
                            <button
                                onClick={() => setSensitiveModal({ open: false, field: '', pendingValue: '', reason: '', valores: null })}
                                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                            >
                                Cancelar
                            </button>
                            <button
                                disabled={isSaving}
                                onClick={() => {
                                    const reason = document.getElementById('sensitive-reason')?.value || 'Actualización autorizada';
                                    const { field, pendingValue, valores } = sensitiveModal;
                                    guardar(() => miEtt.guardarFiscal(valores), `Dato sensible ${field} modificado con registro en auditoría`).then(ok => {
                                        if (!ok) return;
                                        logAction(`Cambio sensible de ${field} a '${pendingValue}'. Motivo: ${reason}`, 'fiscal');
                                        setSensitiveModal({ open: false, field: '', pendingValue: '', reason: '', valores: null });
                                        setIsEditingFiscal(false);
                                    });
                                }}
                                className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                            >
                                Confirmar y Registrar
                            </button>
                  </>}
                >
                  <p className="text-xs text-slate-600 mb-3">Es un dato fiscal principal: pasará a <strong>{sensitiveModal.pendingValue}</strong> y el cambio quedará registrado en la auditoría.</p>
                        <div className="mt-4">
                            <label className="text-[11px] font-semibold text-slate-700 block mb-1">Motivo del cambio (Obligatorio para auditoría)</label>
                            <input
                                type="text"
                                id="sensitive-reason"
                                placeholder="Ej: Actualización escrituras notariales"
                                className="w-full p-2 text-xs rounded-lg border border-slate-200 focus:outline-indigo-500"
                            />
                        </div>
                </Modal>
            )}

        </div>
    );
}

// =========================================================================
// SUBCOMPONENTS
// =========================================================================

function StatusCard({ title, status, statusColor, subtitle, icon: Icon, onClick }) {
    const colorClasses = {
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        amber: 'bg-amber-50 text-amber-700 border-amber-200',
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        slate: 'bg-slate-50 text-slate-600 border-slate-200'
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
                <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border ${colorClasses[statusColor]}`}>
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
                    <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
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

function DrawerInput({ label, defaultValue, id, placeholder, type = 'text', onChange }) {
    return (
        <div>
            <label className="font-semibold text-slate-700 block mb-1">{label}</label>
            <input
                type={type}
                id={id}
                defaultValue={defaultValue}
                placeholder={placeholder}
                onChange={onChange}
                className="w-full p-2 rounded-lg border border-slate-200 bg-white focus:outline-indigo-500 text-xs text-slate-800"
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
            <label className="font-semibold text-slate-700 block">Forma de pago predeterminada</label>
            <select
                id="edit-paymentMethodSelect"
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 bg-white focus:outline-indigo-500 text-xs text-slate-800"
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
