// Partió de design/laboral.html (scripts/import-design.py). Ahora se edita aquí directamente: no regenerar.
// Datos: useLaboral (laboral/useLaboral.ts), de la API (fase7-backend.md) o, en la demo, de memoriaExpedientes.ts.
// Fase 7 (parte 1): lo que se hace fuera (firma del CPD y del contrato, Contrat@, Sistema RED) se registra a mano con
// su fecha y su justificante. La API dice qué bloquea («listo para empezar») y qué solo avisa.
import React, { useState, useEffect } from 'react';
import {
    FileSignature, ShieldCheck, GraduationCap, FileText, AlertTriangle, CheckCircle2,
    Circle, Clock3, ArrowUpRight, Lock, Calendar, MapPin, Building2, Phone, Mail, Info, List,
    LayoutGrid, X, Paperclip, Bell, Plus
} from 'lucide-react';
import {
    Page, PageHeader, Card, SectionTitle, KpiTile, EmptyState, Notice, Button, Badge, Avatar, SearchInput,
    Select, Segmented, Field, TextInput, Modal, Drawer, CargandoPagina, ErrorCarga, fecha
} from '../ui';
import { useLaboral, mensajeError } from './laboral/useLaboral';

// Pasos del expediente, en el orden en que se hacen
const PASOS = [
    { id: 'doc', texto: 'Documentación', corto: 'Doc', icono: FileText, diasAntes: 3 },
    { id: 'cpd', texto: 'CPD firmado por la empresa', corto: 'CPD', icono: FileSignature, diasAntes: 2 },
    { id: 'contrato', texto: 'Contrato firmado', corto: 'Contrato', icono: FileSignature, diasAntes: 1 },
    { id: 'prl', texto: 'Formación PRL, salud y EPI', corto: 'PRL', icono: GraduationCap, diasAntes: 1 },
    { id: 'alta', texto: 'Alta en la Seguridad Social', corto: 'Alta SS', icono: ShieldCheck, diasAntes: 1 },
];
const ESTADO_PASO = {
    hecho: { texto: 'Hecho', tono: 'success', icono: CheckCircle2, clase: 'text-emerald-600' },
    en_curso: { texto: 'En curso', tono: 'info', icono: Clock3, clase: 'text-blue-600' },
    pendiente: { texto: 'Pendiente', tono: 'neutral', icono: Circle, clase: 'text-slate-300' },
    bloqueado: { texto: 'Bloqueado', tono: 'danger', icono: AlertTriangle, clase: 'text-rose-600' },
};
// Gravedad de cada aviso de la API: blocked (prohibición), required (paso legal pendiente), warning (solo avisa)
const GRAVEDAD = {
    blocked: { icono: X, clase: 'text-rose-600' },
    required: { icono: Lock, clase: 'text-rose-600' },
    warning: { icono: Bell, clase: 'text-amber-600' },
};
const MODALIDAD = { production: 'Circunstancias de la producción', substitution: 'Sustitución' };
const SALUD = { fit: 'Apto', unfit: 'No apto', waived: 'Renuncia' };

// ==========================================
// UTILIDADES
// ==========================================
// Formato único de fechas de la web (ui/formato.ts)
const fechaES = (iso) => fecha(iso);
const hoyIso = () => new Date().toISOString().slice(0, 10);
const diasHasta = (iso) => (iso ? Math.round((new Date(`${iso}T00:00:00`) - new Date(new Date().toDateString())) / 86400000) : 99);
const restarDias = (iso, n) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
const completo = (e) => e.completo;
const bloqueado = (e) => e.estadoGeneral === 'blocked';
const urgencia = (e) => {
    const d = diasHasta(e.inicio);
    if (!e.inicio) return { texto: 'Sin fecha de inicio', tono: 'warning' };
    if (e.listo) return d <= 0 ? { texto: 'Listo, ya ha empezado', tono: 'success' } : { texto: `Listo · empieza en ${d} ${d === 1 ? 'día' : 'días'}`, tono: 'success' };
    if (d < 0) return { texto: 'Ya ha empezado', tono: 'danger' };
    if (d <= 3) return { texto: `Empieza en ${d} ${d === 1 ? 'día' : 'días'}`, tono: 'danger' };
    if (d <= 7) return { texto: `Empieza en ${d} días`, tono: 'warning' };
    return { texto: `Empieza en ${d} días`, tono: 'neutral' };
};
const TONO_TEXTO = { danger: 'text-rose-600', warning: 'text-amber-700', success: 'text-emerald-700', neutral: 'text-slate-500' };

// Fila de pasos con su estado (los cinco del expediente)
function PasosExpediente({ e, envolver = false }) {
    return (
        <div className={`flex ${envolver ? 'flex-wrap' : 'flex-nowrap'} gap-1`}>
            {PASOS.map(p => {
                const st = e.pasos[p.id]?.estado || 'pendiente';
                const est = ESTADO_PASO[st];
                return (
                    <span key={p.id} title={`${p.texto}: ${est.texto.toLowerCase()}`} className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] whitespace-nowrap ${
                        { hecho: 'bg-emerald-50 text-emerald-700', en_curso: 'bg-blue-50 text-blue-700', pendiente: 'bg-slate-100 text-slate-500', bloqueado: 'bg-rose-50 text-rose-700' }[st]}`}>
                        <est.icono className="w-3 h-3" />{p.corto}
                    </span>
                );
            })}
        </div>
    );
}

// ¿Puede empezar? Lo legal bloquea (CPD, contrato, PRL y salud, alta); la documentación, el EPI, Contrat@ y la copia básica avisan
function ListoParaEmpezar({ e, compacto = false }) {
    if (e.listo) return <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700"><CheckCircle2 className="w-3 h-3" />Listo para empezar{!compacto && e.avisos.length > 0 ? ` · ${e.avisos.length} ${e.avisos.length === 1 ? 'aviso' : 'avisos'}` : ''}</span>;
    return <span className="inline-flex items-center gap-1 text-[11px] text-rose-700" title={e.bloqueos.map(b => b.texto).join('\n')}><Lock className="w-3 h-3" />No puede empezar{!compacto ? `: ${e.bloqueos.length} ${e.bloqueos.length === 1 ? 'pendiente' : 'pendientes'}` : ''}</span>;
}

// Lista de avisos de la API con su gravedad
function Avisos({ lista }) {
    if (!lista.length) return null;
    return (
        <ul className="space-y-1">
            {lista.map((a, i) => {
                const G = GRAVEDAD[a.gravedad] || GRAVEDAD.warning;
                return <li key={`${a.codigo}-${i}`} className="flex items-start gap-1.5"><G.icono className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${G.clase}`} /><span className={a.gravedad === 'warning' ? 'text-amber-800' : 'text-rose-700'}>{a.texto}</span></li>;
            })}
        </ul>
    );
}

// Campo de archivo para un justificante
function CampoArchivo({ label, hint, onChange }) {
    return (
        <Field label={label} hint={hint}>
            <input type="file" accept=".pdf,image/*" onChange={(ev) => onChange(ev.target.files?.[0] || null)} className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200" />
        </Field>
    );
}

export default function LaboralView() {
    const lab = useLaboral();
    const expedientes = lab.expedientes;
    const PETICIONES = lab.peticiones;
    const [vista, setVista] = useState('bandeja'); // 'bandeja' | 'peticion'
    const [petId, setPetId] = useState(null);
    const [agrupar, setAgrupar] = useState('persona'); // 'persona' | 'peticion'
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('abiertos');
    const [filtroPaso, setFiltroPaso] = useState('');
    const [filtroPeticion, setFiltroPeticion] = useState('');
    const [abierto, setAbierto] = useState(null); // expediente en el panel (con su ficha completa)
    const [accion, setAccion] = useState(null); // { tipo, e, contrato?, datos, archivos }
    const [guardando, setGuardando] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (texto, tipo = 'ok') => { setToast({ texto, tipo }); setTimeout(() => setToast(null), 4500); };

    // Los filtros van al servidor; la búsqueda, un momento después de dejar de escribir
    useEffect(() => {
        const t = setTimeout(() => lab.filtrar({ q: busqueda, estado: filtroEstado, paso: filtroPaso, peticion: filtroPeticion }), 300);
        return () => clearTimeout(t);
    }, [busqueda, filtroEstado, filtroPaso, filtroPeticion, lab.filtrar]);

    const abrirExpediente = async (e) => {
        setAbierto(e);
        try { setAbierto(await lab.abrir(e.id)); } catch (err) { showToast(mensajeError(err), 'error'); }
    };
    const verDocumento = (id) => lab.verDocumento(id).catch(err => showToast(mensajeError(err), 'error'));

    // Ventanas de registro
    const abrirAccion = (tipo, e, contrato = null) => {
        const d = e.detalle;
        const hoy = hoyIso();
        const datos = {
            cpd: { fecha: hoy },
            contrato: contrato
                ? { kind: contrato.kind, contractKey: contrato.contractKey, startDate: contrato.startDate, endDate: contrato.endDate || '', substitutionReason: contrato.substitutionReason || '', signedAt: contrato.signedAt || '', contrataCommunicatedAt: contrato.contrataCommunicatedAt || '', contrataReference: contrato.contrataReference || '', basicCopyDeliveredAt: contrato.basicCopyDeliveredAt || '', notes: contrato.notes || '' }
                : { kind: 'production', contractKey: '402', startDate: e.inicio || hoy, endDate: '', substitutionReason: '', signedAt: '', contrataCommunicatedAt: '', contrataReference: '', basicCopyDeliveredAt: '', notes: '' },
            formacion: { prlTrainingDate: d?.prl.trainingDate || hoy, prlTrainingHours: d?.prl.trainingHours ?? '' },
            salud: { healthSurveillanceResult: d?.prl.healthSurveillanceResult || 'fit', healthSurveillanceDate: d?.prl.healthSurveillanceDate || hoy },
            epi: { ppeDeliveredAt: d?.prl.ppeDeliveredAt || hoy, ppeNotes: d?.prl.ppeNotes || '' },
            alta: { ssRegistrationDate: d?.ssRegistration.date || e.inicio || hoy },
            anular: { motivo: '' },
        }[tipo];
        setAccion({ tipo, e, contrato, datos, archivos: {} });
    };
    const registrar = async () => {
        const { tipo, e, contrato, datos, archivos } = accion;
        const d = e.detalle;
        const nulo = (v) => (v === '' || v == null ? null : v);
        setGuardando(true);
        try {
            let nuevo;
            if (tipo === 'cpd') nuevo = await lab.registrarCpdFirmado(e, datos.fecha, archivos.cpd);
            if (tipo === 'contrato') {
                const cuerpo = { ...(contrato ? {} : { kind: datos.kind }), contractKey: datos.contractKey, startDate: datos.startDate, endDate: nulo(datos.endDate), substitutionReason: datos.kind === 'substitution' ? nulo(datos.substitutionReason) : null, signedAt: nulo(datos.signedAt), contrataCommunicatedAt: nulo(datos.contrataCommunicatedAt), contrataReference: nulo(datos.contrataReference), basicCopyDeliveredAt: nulo(datos.basicCopyDeliveredAt), notes: nulo(datos.notes) };
                // Firmado = fecha de firma y documento juntos: si ya había documento, se conserva
                if (cuerpo.signedAt && !archivos.documentId && !contrato?.documentId) throw new Error('Adjunta el contrato firmado (la fecha de firma va con el documento)');
                nuevo = await lab.guardarContrato(e, contrato?.id ?? null, cuerpo, archivos);
            }
            if (tipo === 'formacion') {
                if (!archivos.prlTrainingDocumentId && !d?.prl.trainingDocumentId) throw new Error('Adjunta el certificado de la formación PRL');
                nuevo = await lab.guardar(e, { prlTrainingDate: datos.prlTrainingDate, prlTrainingHours: datos.prlTrainingHours === '' ? null : Number(datos.prlTrainingHours) }, archivos.prlTrainingDocumentId ? { prlTrainingDocumentId: { tipo: 'prl', archivo: archivos.prlTrainingDocumentId } } : {});
            }
            if (tipo === 'salud') nuevo = await lab.guardar(e, datos, archivos.healthSurveillanceDocumentId ? { healthSurveillanceDocumentId: { tipo: 'salud', archivo: archivos.healthSurveillanceDocumentId } } : {});
            if (tipo === 'epi') nuevo = await lab.guardar(e, { ppeDeliveredAt: datos.ppeDeliveredAt, ppeNotes: nulo(datos.ppeNotes) }, archivos.ppeDocumentId ? { ppeDocumentId: { tipo: 'epi', archivo: archivos.ppeDocumentId } } : {});
            if (tipo === 'alta') {
                if (!archivos.ssRegistrationDocumentId && !d?.ssRegistration.documentId) throw new Error('Adjunta el justificante del alta');
                nuevo = await lab.guardar(e, { ssRegistrationDate: datos.ssRegistrationDate }, archivos.ssRegistrationDocumentId ? { ssRegistrationDocumentId: { tipo: 'alta', archivo: archivos.ssRegistrationDocumentId } } : {});
            }
            if (tipo === 'anular') nuevo = await lab.anularContrato(contrato.id, datos.motivo);
            setAccion(null);
            setAbierto(nuevo);
            showToast(nuevo.listo && !e.listo ? `${e.nombre} ya está lista para empezar` : 'Registrado');
        } catch (err) {
            showToast(mensajeError(err), 'error');
        } finally {
            setGuardando(false);
        }
    };

    if (lab.estado === 'cargando') return <CargandoPagina texto="Cargando expedientes" />;
    if (lab.estado === 'error') return <Page><ErrorCarga titulo="No se han podido cargar los expedientes" mensaje={lab.error} onReintentar={lab.reintentar} /></Page>;

    const filtrados = expedientes;
    const hayFiltros = busqueda || filtroEstado !== 'abiertos' || filtroPaso || filtroPeticion;
    const limpiar = () => { setBusqueda(''); setFiltroEstado('abiertos'); setFiltroPaso(''); setFiltroPeticion(''); };
    const fc = lab.facetas;
    const abrirPeticion = (id) => { setPetId(id); setVista('peticion'); lab.abrirPeticion(id); };

    // Tabla de expedientes (la usan la bandeja y el detalle de la petición). En móvil, tarjetas.
    const TablaExpedientes = ({ lista, conPeticion, sinExpediente = [] }) => (
        <>
            <ul className="md:hidden divide-y divide-slate-100">
                {lista.map(e => {
                    const urg = urgencia(e);
                    return (
                        <li key={e.id}>
                            <button type="button" onClick={() => abrirExpediente(e)} className="w-full text-left px-4 py-3 hover:bg-slate-50 space-y-1.5">
                                <div className="flex items-start justify-between gap-2">
                                    <span className="text-sm font-medium text-slate-900">{e.nombre}</span>
                                    <span className={`text-[11px] whitespace-nowrap ${TONO_TEXTO[urg.tono]}`}>{urg.texto}</span>
                                </div>
                                <div className="text-[11px] text-slate-500">{conPeticion ? `${e.petId} · ${e.puesto} · ` : ''}Plaza {e.plaza} · inicio {fechaES(e.inicio)}</div>
                                <PasosExpediente e={e} envolver />
                                <div className="flex items-center justify-between gap-2">
                                    <ListoParaEmpezar e={e} compacto />
                                    {e.siguiente && <span className="text-[11px] text-slate-600 truncate">{e.siguiente.texto}</span>}
                                </div>
                            </button>
                        </li>
                    );
                })}
                {sinExpediente.map(s => (
                    <li key={`sin-${s.plaza}`} className="px-4 py-3 text-xs text-slate-500 bg-slate-50/50">Plaza {s.plaza} · {s.texto}</li>
                ))}
            </ul>
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                            <th className="py-2 px-3 font-medium">Persona</th>
                            {conPeticion && <th className="py-2 px-3 font-medium">Petición</th>}
                            <th className="py-2 px-3 font-medium">Inicio</th>
                            <th className="py-2 px-3 font-medium">Pasos</th>
                            <th className="py-2 px-3 font-medium">Próxima tarea</th>
                            <th className="py-2 px-3" aria-label="Acciones"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {lista.map(e => {
                            const sig = e.siguiente;
                            const urg = urgencia(e);
                            return (
                                <tr key={e.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                    <td className="py-2.5 px-3">
                                        <button type="button" onClick={() => abrirExpediente(e)} className="inline-flex items-center gap-2 text-left hover:text-indigo-700">
                                            <Avatar name={e.nombre} size="sm" />
                                            <span>
                                                <span className="block font-medium text-slate-900 whitespace-nowrap">{e.nombre}</span>
                                                <span className="text-[11px] text-slate-500">Plaza {e.plaza}{e.dni ? ` · ${e.dni}` : ''}</span>
                                            </span>
                                        </button>
                                    </td>
                                    {conPeticion && (
                                        <td className="py-2.5 px-3">
                                            <button type="button" onClick={() => abrirPeticion(e.petId)} className="text-left hover:text-indigo-700">
                                                <span className="block text-slate-800 whitespace-nowrap">{e.puesto} · {e.turno.toLowerCase()}</span>
                                                <span className="text-[11px] text-slate-500">{e.petId} · {e.cliente}</span>
                                            </button>
                                        </td>
                                    )}
                                    <td className="py-2.5 px-3 whitespace-nowrap">
                                        <div className="text-slate-700">{fechaES(e.inicio)}</div>
                                        <div className={`text-[11px] ${TONO_TEXTO[urg.tono]}`}>{urg.texto}</div>
                                    </td>
                                    <td className="py-2.5 px-3 whitespace-nowrap">
                                        <PasosExpediente e={e} />
                                        <div className="mt-1"><ListoParaEmpezar e={e} /></div>
                                    </td>
                                    <td className="py-2.5 px-3 min-w-[200px]">
                                        {sig ? (
                                            <>
                                                <div className={sig.gravedad === 'warning' ? 'text-slate-800' : 'text-rose-700'}>{sig.pasoId ? PASOS.find(p => p.id === sig.pasoId)?.texto : 'Expediente'}</div>
                                                <div className="text-[11px] text-slate-500">{sig.texto}</div>
                                            </>
                                        ) : <span className="text-emerald-700">Todo listo</span>}
                                    </td>
                                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                        <Button size="sm" variant={sig && sig.gravedad !== 'warning' ? 'secondary' : 'ghost'} onClick={() => abrirExpediente(e)}>{sig ? 'Abrir' : 'Ver'}</Button>
                                    </td>
                                </tr>
                            );
                        })}
                        {sinExpediente.map(s => (
                            <tr key={`sin-${s.plaza}`} className="border-b border-slate-100 last:border-0 bg-slate-50/50">
                                <td className="py-2.5 px-3 text-slate-500" colSpan={conPeticion ? 4 : 3}>Plaza {s.plaza} · {s.texto}</td>
                                <td className="py-2.5 px-3 text-[11px] text-slate-500">El expediente se abre cuando el cliente confirma a la persona</td>
                                <td className="py-2.5 px-3 text-right"><Button size="sm" variant="ghost" icon={ArrowUpRight} onClick={() => { window.location.hash = `#/peticiones/${petId}`; }}>Ir a Peticiones</Button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );

    return (
        <>
            {/* BANDEJA: expedientes de todas las peticiones */}
            {vista === 'bandeja' && (
                <Page>
                    <PageHeader
                        title="Contratos y altas"
                        count={fc ? fc.total - fc.listos : expedientes.length}
                        subtitle="Lo que falta para que cada persona pueda empezar: CPD firmado, contrato, formación PRL y vigilancia de la salud, y alta en la Seguridad Social. La documentación, el EPI, Contrat@ y la copia básica avisan."
                    />
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <KpiTile label="Falta algo legal" tone="accent" value={fc?.pendientes ?? '—'} hint={`${fc?.listos ?? 0} listos para empezar · ${fc?.completos ?? 0} completos`} active={filtroEstado === 'pendientes'} onClick={() => { limpiar(); setFiltroEstado('pendientes'); }} />
                        <KpiTile label="Empiezan en 7 días sin estar listos" tone="danger" value={fc?.empiezanPronto ?? '—'} hint="Con pasos legales sin hacer" />
                        <KpiTile label="Bloqueados" tone="danger" value={fc?.bloqueados ?? '—'} hint="Art. 8 o «no apto»: no pueden empezar" active={filtroEstado === 'bloqueados'} onClick={() => { limpiar(); setFiltroEstado('bloqueados'); }} />
                        <KpiTile label="CPD sin firmar" tone="warning" value={fc?.sinCpd ?? '—'} hint="Esperando a la empresa" active={filtroPaso === 'cpd'} onClick={() => { limpiar(); setFiltroPaso('cpd'); }} />
                    </div>

                    <Card className="overflow-hidden">
                        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-200">
                            <SearchInput className="flex-1 min-w-[200px] max-w-xs" value={busqueda} onChange={setBusqueda} placeholder="Buscar persona, petición o cliente..." />
                            <Select value={filtroEstado} onChange={(ev) => setFiltroEstado(ev.target.value)} aria-label="Estado">
                                <option value="abiertos">Todos los abiertos</option>
                                <option value="pendientes">Falta algo legal</option>
                                <option value="listos">Listos para empezar</option>
                                <option value="bloqueados">Bloqueados</option>
                                <option value="completos">Completos</option>
                            </Select>
                            <Select value={filtroPaso} onChange={(ev) => setFiltroPaso(ev.target.value)} aria-label="Paso pendiente">
                                <option value="">Cualquier paso</option>
                                {PASOS.map(p => <option key={p.id} value={p.id}>Falta: {p.texto.toLowerCase()}</option>)}
                            </Select>
                            <Select value={filtroPeticion} onChange={(ev) => setFiltroPeticion(ev.target.value)} aria-label="Petición">
                                <option value="">Todas las peticiones</option>
                                {Object.values(PETICIONES).map(p => <option key={p.id} value={p.id}>{p.id} · {p.puesto}</option>)}
                            </Select>
                            {hayFiltros && <Button size="sm" variant="ghost" icon={X} onClick={limpiar}>Limpiar</Button>}
                            <div className="ml-auto">
                                <Segmented value={agrupar} onChange={setAgrupar} options={[{ id: 'persona', title: 'Por persona', icon: List }, { id: 'peticion', title: 'Por petición', icon: LayoutGrid }]} />
                            </div>
                        </div>

                        {filtrados.length === 0 ? (
                            <EmptyState icon={CheckCircle2} title={!hayFiltros ? 'No hay expedientes abiertos' : 'No hay expedientes con estos filtros'} text="El expediente de cada persona se abre cuando el cliente la confirma en una petición." action={hayFiltros && <Button onClick={limpiar}>Limpiar filtros</Button>} />
                        ) : agrupar === 'persona' ? (
                            <TablaExpedientes lista={filtrados} conPeticion />
                        ) : (
                            <div className="p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                {[...new Set(filtrados.map(e => e.petId))].map(id => {
                                    const pet = PETICIONES[id] || {};
                                    const todos = lab.todos.filter(e => e.petId === id);
                                    const listos = todos.filter(e => e.listo).length;
                                    const d = diasHasta(pet.inicio);
                                    return (
                                        <button key={id} type="button" onClick={() => abrirPeticion(id)} className="text-left rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300 space-y-3">
                                            <div>
                                                <div className="text-sm font-medium text-slate-900">{pet.puesto} · {(pet.turno || '').toLowerCase()}</div>
                                                <div className="text-[11px] text-slate-500">{id} · {pet.cliente}</div>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-slate-600">Inicio {fechaES(pet.inicio)}</span>
                                                <span className={d < 0 ? 'text-slate-500' : d <= 3 ? 'text-rose-600' : d <= 7 ? 'text-amber-700' : 'text-slate-500'}>{d < 0 ? 'En curso' : `en ${d} ${d === 1 ? 'día' : 'días'}`}</span>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-[11px] text-slate-500 mb-1"><span>{listos} de {todos.length} listos para empezar</span><span>{pet.plazas} plazas</span></div>
                                                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className={`h-1.5 rounded-full ${listos === todos.length ? 'bg-emerald-500' : 'bg-indigo-600'}`} style={{ width: `${(listos / Math.max(1, todos.length)) * 100}%` }} /></div>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {PASOS.map(p => {
                                                    const faltan = todos.filter(e => e.pasos[p.id]?.estado !== 'hecho').length;
                                                    return faltan > 0 && <Badge key={p.id} tone={todos.some(e => e.pasos[p.id]?.estado === 'bloqueado') ? 'danger' : 'warning'}>{p.corto}: faltan {faltan}</Badge>;
                                                })}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                </Page>
            )}

            {/* DETALLE DE UNA PETICIÓN */}
            {vista === 'peticion' && petId && (() => {
                const pet = lab.peticionDetalle || PETICIONES[petId] || {};
                const lista = lab.todos.filter(e => e.petId === petId).sort((a, b) => a.plaza - b.plaza);
                const listos = lista.filter(e => e.listo).length;
                const d = diasHasta(pet.inicio);
                return (
                    <Page>
                        <PageHeader
                            breadcrumbs={[{ label: 'Contratos y altas', onClick: () => setVista('bandeja') }, { label: petId }]}
                            title={`${pet.puesto} · ${(pet.turno || '').toLowerCase()}`}
                            status={<Badge tone={listos === lista.length ? 'success' : d <= 3 ? 'danger' : 'accent'} dot>{listos === lista.length ? 'Todos listos' : d < 0 ? 'En curso con pendientes' : 'En incorporación'}</Badge>}
                            subtitle={
                                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <span className="inline-flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-slate-400" />{pet.cliente}</span>
                                    <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" />{pet.centro}</span>
                                    <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" />{fechaES(pet.inicio)}{pet.fin ? ` a ${fechaES(pet.fin)}` : ''}</span>
                                    {pet.responsable && <span>Responsable: {pet.responsable}</span>}
                                    <button type="button" onClick={() => { window.location.hash = `#/peticiones/${petId}`; }} className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 hover:underline">
                                        <ArrowUpRight className="w-3.5 h-3.5" />Ver {petId} en Peticiones
                                    </button>
                                    {d < 0 && <button type="button" onClick={() => { window.location.hash = '#/mision'; }} className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 hover:underline">
                                        <ArrowUpRight className="w-3.5 h-3.5" />Personal en misión
                                    </button>}
                                </span>
                            }
                        />

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <KpiTile label="Personas" value={`${lista.length} de ${pet.plazas}`} hint={pet.sinExpediente?.length ? `${pet.sinExpediente.length} ${pet.sinExpediente.length === 1 ? 'plaza' : 'plazas'} sin persona confirmada` : 'Todas las plazas con persona'} />
                            <KpiTile label="Listos para empezar" tone="success" value={listos} hint={`${lista.filter(completo).length} con el expediente completo`} />
                            <KpiTile label="Falta algo legal" tone="warning" value={lista.filter(e => !e.listo && !bloqueado(e)).length} hint={PASOS.map(p => ({ p, n: lista.filter(e => e.pasos[p.id]?.estado !== 'hecho').length })).filter(x => x.n).map(x => `${x.n} ${x.p.corto}`).join(' · ') || 'Ninguno'} />
                            <KpiTile label="Bloqueos" tone="danger" value={lista.filter(bloqueado).length} hint={lista.filter(bloqueado).map(e => e.nombre).join(', ') || 'Ninguno'} />
                        </div>

                        <Card className="p-4">
                            <div className="flex flex-wrap items-start gap-x-6 gap-y-2 text-xs">
                                {pet.presupuesto && <div className="flex items-center gap-1.5 text-slate-500"><Lock className="w-3.5 h-3.5" />Del presupuesto {pet.presupuesto}</div>}
                                <div><span className="text-slate-500">Categoría:</span> <span className="text-slate-900">{pet.categoria || '—'}</span></div>
                                <div><span className="text-slate-500">Convenio:</span> <span className="text-slate-900">{pet.convenio || '—'}</span></div>
                                <div><span className="text-slate-500">Salario:</span> <span className="text-slate-900">{pet.salario || '—'}</span></div>
                                <div><span className="text-slate-500">CPD previo:</span> <span className="text-slate-900">{pet.cpdPrevio || '—'}</span></div>
                                <div><span className="text-slate-500">CPD firmado:</span> <span className="text-slate-900">{pet.cpdFirmado || '—'}</span></div>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-2">La tarifa al cliente y el margen no se ven aquí: solo en Presupuestos, para dirección.</p>
                        </Card>

                        <Card className="overflow-hidden">
                            <div className="p-4 border-b border-slate-200"><SectionTitle>Expedientes</SectionTitle></div>
                            <TablaExpedientes lista={lista} sinExpediente={pet.sinExpediente || []} />
                        </Card>
                    </Page>
                );
            })()}

            {/* EXPEDIENTE DE UNA PERSONA */}
            {abierto && (() => {
                const e = abierto;
                const d = e.detalle;
                const urg = urgencia(e);
                const pasoAvisos = (id) => e.pasos[id]?.avisos || [];
                const Dato = ({ label, children }) => <div className="flex flex-wrap gap-x-1"><span className="text-slate-500">{label}:</span><span className="text-slate-800">{children}</span></div>;
                const Adjunto = ({ id, nombre = 'Ver justificante' }) => id ? <button type="button" onClick={() => verDocumento(id)} className="inline-flex items-center gap-0.5 text-indigo-600 hover:underline"><Paperclip className="w-3 h-3" />{nombre}</button> : null;
                const cuerpo = {
                    doc: d && (
                        <div className="space-y-1">
                            <Dato label="Documento de identidad">{d.documentation.idDocumentExpiresOn ? `caduca el ${fechaES(d.documentation.idDocumentExpiresOn)}` : 'sin fecha de caducidad'}{d.documentation.idScan === 'pending' ? ' · copia por validar' : d.documentation.idScan === null ? ' · sin copia escaneada' : ''}</Dato>
                            <Dato label="NSS">{d.documentation.ssNumber?.masked || 'falta'}</Dato>
                            <Dato label="Cuenta bancaria">{d.documentation.iban?.masked || 'falta'}</Dato>
                            {d.documentation.documents.length > 0 && <ul className="text-[11px] text-slate-500 space-y-0.5">{d.documentation.documents.map(x => <li key={x.id}>{x.typeName}: {x.name}{x.status === 'pending' ? ' · por validar' : ''}{x.expiresOn ? ` · caduca el ${fechaES(x.expiresOn)}` : ''}{x.expiredAtStart ? ' (antes del inicio)' : ''}</li>)}</ul>}
                            <Button size="sm" variant="ghost" icon={ArrowUpRight} onClick={() => { window.location.hash = '#/candidatos'; }}>Validar en la ficha del candidato</Button>
                        </div>
                    ),
                    cpd: d && (
                        <div className="space-y-1.5">
                            <Dato label="CPD firmado">{d.cpd.signedAt ? `el ${fechaES(d.cpd.signedAt)}` : 'sin registrar'} {d.cpd.signedDocumentId && <Adjunto id={d.cpd.signedDocumentId} />}</Dato>
                            <Dato label="Huelga en el centro">{d.cpd.art8.declarations.strike ? (d.cpd.art8.declarations.strike.affirmative ? 'el cliente declara que la hay' : `no (lo declara ${d.cpd.art8.declarations.strike.contactName || 'el cliente'})`) : 'sin declarar'}</Dato>
                            <Dato label="Puestos amortizados">{d.cpd.art8.declarations.downsizedPositions ? (d.cpd.art8.declarations.downsizedPositions.affirmative ? 'el cliente declara que sí' : `no (lo declara ${d.cpd.art8.declarations.downsizedPositions.contactName || 'el cliente'})`) : 'sin declarar'}</Dato>
                            {d.cpd.art8.hazardousWork && <Dato label="Trabajo peligroso">{d.cpd.art8.hazardousException ? `con excepción: ${d.cpd.art8.hazardousException.basis}` : 'sin excepción'}</Dato>}
                            <div className="flex flex-wrap gap-1.5">
                                {lab.puede.cpd && <Button size="sm" variant={d.cpd.signedAt ? 'ghost' : 'secondary'} onClick={() => abrirAccion('cpd', e)}>{d.cpd.signedAt ? 'Cambiar CPD firmado' : 'Registrar CPD firmado'}</Button>}
                                <Button size="sm" variant="ghost" icon={ArrowUpRight} onClick={() => { window.location.hash = `#/peticiones/${e.petId}`; }}>Declaraciones del art. 8 en la petición</Button>
                            </div>
                            <p className="text-[11px] text-slate-400">El CPD firmado y las declaraciones son de la petición: valen para todas sus personas.</p>
                        </div>
                    ),
                    contrato: d && (
                        <div className="space-y-2">
                            {d.contracts.filter(c => c.status === 'active').map(c => (
                                <div key={c.id} className="rounded-md border border-slate-200 p-2 space-y-0.5">
                                    <div className="flex flex-wrap items-center justify-between gap-1">
                                        <span className="font-medium text-slate-800">{c.contractKey} · {MODALIDAD[c.kind]}</span>
                                        {lab.puede.contrato && <span className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => abrirAccion('contrato', e, c)}>Editar</Button><Button size="sm" variant="ghost" className="text-rose-600!" onClick={() => abrirAccion('anular', e, c)}>Anular</Button></span>}
                                    </div>
                                    <div className="text-slate-600">{fechaES(c.startDate)} a {c.endDate ? fechaES(c.endDate) : 'sin fecha de fin'}{c.substitutionReason ? ` · sustituye: ${c.substitutionReason}` : ''}</div>
                                    <Dato label="Firmado">{c.signedAt ? `el ${fechaES(c.signedAt)}` : 'no'} {c.documentId && <Adjunto id={c.documentId} nombre="contrato" />}</Dato>
                                    <Dato label="Contrat@">{c.contrataCommunicatedAt ? `el ${fechaES(c.contrataCommunicatedAt)}${c.contrataReference ? ` (${c.contrataReference})` : ''}` : `antes del ${fechaES(c.contrataDueDate)}`}</Dato>
                                    <Dato label="Copia básica">{c.basicCopyDeliveredAt ? `entregada el ${fechaES(c.basicCopyDeliveredAt)}` : c.basicCopyDueDate ? `antes del ${fechaES(c.basicCopyDueDate)}` : 'cuando esté firmado'}</Dato>
                                </div>
                            ))}
                            {lab.puede.contrato && <Button size="sm" variant={d.contracts.some(c => c.status === 'active') ? 'ghost' : 'secondary'} icon={Plus} onClick={() => abrirAccion('contrato', e)}>Registrar contrato</Button>}
                        </div>
                    ),
                    prl: d && (
                        <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center justify-between gap-1">
                                <Dato label="Formación PRL">{d.prl.trainingDate ? `el ${fechaES(d.prl.trainingDate)}${d.prl.trainingHours ? ` · ${d.prl.trainingHours} h` : ''}` : 'sin registrar'} {d.prl.trainingDocumentId && <Adjunto id={d.prl.trainingDocumentId} nombre="certificado" />}</Dato>
                                {lab.puede.prl && <Button size="sm" variant="ghost" onClick={() => abrirAccion('formacion', e)}>{d.prl.trainingDate ? 'Cambiar' : 'Registrar'}</Button>}
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-1">
                                <Dato label="Vigilancia de la salud">{d.prl.healthSurveillanceResult ? `${SALUD[d.prl.healthSurveillanceResult]} el ${fechaES(d.prl.healthSurveillanceDate)}` : 'sin registrar'}</Dato>
                                {lab.puede.prl && <Button size="sm" variant="ghost" onClick={() => abrirAccion('salud', e)}>{d.prl.healthSurveillanceResult ? 'Cambiar' : 'Registrar'}</Button>}
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-1">
                                <Dato label="Entrega de EPI (avisa)">{d.prl.ppeDeliveredAt ? `el ${fechaES(d.prl.ppeDeliveredAt)}${d.prl.ppeNotes ? ` · ${d.prl.ppeNotes}` : ''}` : 'sin registrar'}</Dato>
                                {lab.puede.prl && <Button size="sm" variant="ghost" onClick={() => abrirAccion('epi', e)}>{d.prl.ppeDeliveredAt ? 'Cambiar' : 'Registrar'}</Button>}
                            </div>
                        </div>
                    ),
                    alta: d && (
                        <div className="flex flex-wrap items-center justify-between gap-1">
                            <Dato label="Alta">{d.ssRegistration.date ? `con efectos del ${fechaES(d.ssRegistration.date)}` : 'sin registrar'} {d.ssRegistration.documentId && <Adjunto id={d.ssRegistration.documentId} nombre="justificante" />}</Dato>
                            {lab.puede.alta && <Button size="sm" variant={d.ssRegistration.date ? 'ghost' : 'secondary'} onClick={() => abrirAccion('alta', e)}>{d.ssRegistration.date ? 'Cambiar' : 'Registrar alta'}</Button>}
                        </div>
                    ),
                };
                return (
                    <Drawer
                        onClose={() => setAbierto(null)}
                        width="max-w-xl"
                        leading={<Avatar name={e.nombre} size="lg" />}
                        title={e.nombre}
                        status={<Badge tone={completo(e) ? 'success' : bloqueado(e) ? 'danger' : e.listo ? 'success' : 'accent'} dot>{completo(e) ? 'Completo' : bloqueado(e) ? 'Bloqueado' : e.listo ? 'Listo para empezar' : 'En preparación'}</Badge>}
                        subtitle={
                            <div className="space-y-1">
                                <div>{e.puesto} · {e.turno.toLowerCase()} · {e.petId} · Plaza {e.plaza}</div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600">
                                    {e.dni && <span>{e.dni}</span>}
                                    {e.telefono && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" />{e.telefono}</span>}
                                    {e.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" />{e.email}</span>}
                                </div>
                            </div>
                        }
                        footer={<>
                            <Button variant="ghost" icon={ArrowUpRight} className="mr-auto" onClick={() => { window.location.hash = '#/candidatos'; }}>Ficha del candidato</Button>
                            {e.listo && <Button icon={ArrowUpRight} title="Listo: el primer día pasa a Personal en misión" onClick={() => { window.location.hash = '#/mision'; }}>Personal en misión</Button>}
                            <Button onClick={() => setAbierto(null)}>Cerrar</Button>
                        </>}
                    >
                        <div className="space-y-4 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-600">Empieza el {fechaES(e.inicio)} · <span className={TONO_TEXTO[urg.tono]}>{urg.texto.toLowerCase()}</span></span>
                                <span className="text-slate-500">{e.hechos} de {PASOS.length} pasos</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className={`h-1.5 rounded-full ${completo(e) ? 'bg-emerald-500' : 'bg-indigo-600'}`} style={{ width: `${(e.hechos / PASOS.length) * 100}%` }} /></div>

                            {/* Qué impide empezar y qué solo avisa */}
                            {e.listo ? (
                                <Notice tone="success" icon={CheckCircle2}><strong>Listo para empezar.</strong> CPD firmado, contrato, formación PRL, vigilancia de la salud y alta registrados.</Notice>
                            ) : (
                                <Notice tone="danger" icon={Lock}>
                                    <strong>No puede empezar hasta que se resuelva:</strong>
                                    <ul className="list-disc pl-4 mt-1 space-y-0.5">{e.bloqueos.map((b, i) => <li key={i}>{b.texto}</li>)}</ul>
                                </Notice>
                            )}
                            {e.avisos.length > 0 && (
                                <Notice tone="warning" icon={Bell}>
                                    <strong>Avisos (no impiden empezar):</strong>
                                    <ul className="list-disc pl-4 mt-1 space-y-0.5">{e.avisos.map((a, i) => <li key={i}>{a.texto}</li>)}</ul>
                                </Notice>
                            )}

                            {!d ? <p className="text-slate-500">Cargando el expediente…</p> : (
                                <ol className="space-y-2">
                                    {PASOS.map((p, i) => {
                                        const paso = e.pasos[p.id] || { estado: 'pendiente', bloquea: false };
                                        const st = paso.estado;
                                        const est = ESTADO_PASO[st];
                                        return (
                                            <li key={p.id} className={`rounded-lg border p-3 space-y-2 ${st === 'bloqueado' ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200'}`}>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <est.icono className={`w-4 h-4 shrink-0 ${est.clase}`} />
                                                    <span className="font-medium text-slate-900">{i + 1}. {p.texto}</span>
                                                    <Badge tone={est.tono}>{est.texto}</Badge>
                                                    {paso.bloquea
                                                        ? <span className="inline-flex items-center gap-0.5 text-[10px] text-rose-700" title="Sin este paso la persona no puede empezar"><Lock className="w-2.5 h-2.5" />Bloquea el inicio</span>
                                                        : <span className="text-[10px] text-slate-400">Solo avisa</span>}
                                                    {st !== 'hecho' && e.inicio && <span className="ml-auto text-[11px] text-slate-400">Antes del {fechaES(restarDias(e.inicio, p.diasAntes))}</span>}
                                                </div>
                                                <Avisos lista={pasoAvisos(p.id)} />
                                                {cuerpo[p.id]}
                                            </li>
                                        );
                                    })}
                                </ol>
                            )}
                            <Notice tone="info" icon={Info}>
                                Lo que se hace fuera (firma del CPD y del contrato, Contrat@, Sistema RED) se registra aquí a mano con su fecha y su justificante. De la vigilancia de la salud solo se guarda el resultado, nunca el diagnóstico.
                            </Notice>
                        </div>
                    </Drawer>
                );
            })()}

            {/* VENTANA: registrar un paso */}
            {accion && (() => {
                const { tipo, e, contrato, datos } = accion;
                const set = (k, v) => setAccion(a => ({ ...a, datos: { ...a.datos, [k]: v } }));
                const archivo = (k) => (f) => setAccion(a => ({ ...a, archivos: { ...a.archivos, [k]: f } }));
                const fechaCampo = (k, label, hint) => <Field label={label} hint={hint}><TextInput type="date" value={datos[k] || ''} onChange={(ev) => set(k, ev.target.value)} /></Field>;
                const titulos = { cpd: 'CPD firmado por la empresa', contrato: contrato ? `Contrato ${contrato.contractKey}` : 'Registrar contrato', formacion: 'Formación PRL', salud: 'Vigilancia de la salud', epi: 'Entrega de EPI', alta: 'Alta en la Seguridad Social', anular: `Anular el contrato ${contrato?.contractKey}` };
                const bloquea = ['cpd', 'contrato', 'formacion', 'salud', 'alta'].includes(tipo);
                const claves = lab.claves.filter(k => k.duration === 'temporary' && k.active && (datos.kind === 'substitution' ? /sustituci/i.test(k.name) : /producci/i.test(k.name)));
                return (
                    <Modal
                        title={titulos[tipo]}
                        subtitle={`${e.nombre} · ${e.petId} · Plaza ${e.plaza}`}
                        onClose={() => setAccion(null)}
                        size="max-w-md"
                        footer={<>
                            <Button onClick={() => setAccion(null)}>Cancelar</Button>
                            <Button variant={tipo === 'anular' ? 'danger' : 'primary'} icon={tipo === 'anular' ? X : CheckCircle2} disabled={guardando || (tipo === 'anular' && !datos.motivo.trim())} onClick={registrar}>{guardando ? 'Guardando…' : tipo === 'anular' ? 'Anular' : 'Registrar'}</Button>
                        </>}
                    >
                        <div className="space-y-4 text-xs">
                            {tipo !== 'anular' && (bloquea
                                ? <Notice tone="warning" icon={Lock}>Sin esto, {e.nombre.split(' ')[0]} no puede empezar.</Notice>
                                : <p className="text-[11px] text-slate-500">Si falta, solo avisa: no impide empezar.</p>)}
                            {tipo === 'cpd' && <>
                                <p className="text-slate-600">Es de la petición {e.petId}: vale para todas sus personas.</p>
                                {fechaCampo('fecha', 'Fecha de firma de la empresa')}
                                <CampoArchivo label="CPD firmado (obligatorio)" hint="PDF o imagen. Se guarda en los documentos de la petición." onChange={archivo('cpd')} />
                            </>}
                            {tipo === 'contrato' && <>
                                {!contrato && (
                                    <Field label="Modalidad">
                                        <Select value={datos.kind} onChange={(ev) => setAccion(a => ({ ...a, datos: { ...a.datos, kind: ev.target.value, contractKey: ev.target.value === 'substitution' ? '410' : '402' } }))}>
                                            {Object.entries(MODALIDAD).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
                                        </Select>
                                    </Field>
                                )}
                                <Field label="Clave del contrato">
                                    <Select value={datos.contractKey} onChange={(ev) => set('contractKey', ev.target.value)}>
                                        {(claves.length ? claves : [{ code: datos.contractKey, name: '' }]).map(k => <option key={k.code} value={k.code}>{k.code}{k.name ? ` · ${k.name}` : ''}</option>)}
                                    </Select>
                                </Field>
                                {datos.kind === 'substitution' && <Field label="A quién sustituye y por qué (obligatorio)" hint="Por ejemplo: Nombre Apellido, incapacidad temporal."><TextInput value={datos.substitutionReason} onChange={(ev) => set('substitutionReason', ev.target.value)} /></Field>}
                                <div className="grid grid-cols-2 gap-3">
                                    {fechaCampo('startDate', 'Inicio')}
                                    {fechaCampo('endDate', datos.kind === 'production' ? 'Fin (obligatorio)' : 'Fin', datos.kind === 'substitution' ? 'Vacío si no se sabe' : undefined)}
                                </div>
                                {fechaCampo('signedAt', 'Fecha de firma de la persona', 'Con el documento firmado: así cuenta como firmado.')}
                                <CampoArchivo label={`Contrato firmado${contrato?.documentId ? ' (ya adjunto: elige otro para sustituirlo)' : ''}`} onChange={archivo('documentId')} />
                                <div className="grid grid-cols-2 gap-3">
                                    {fechaCampo('contrataCommunicatedAt', 'Comunicado en Contrat@', contrato ? `Plazo: ${fechaES(contrato.contrataDueDate)}` : 'Plazo: días de Mi ETT desde el inicio')}
                                    <Field label="Referencia de Contrat@"><TextInput value={datos.contrataReference} onChange={(ev) => set('contrataReference', ev.target.value)} /></Field>
                                </div>
                                {fechaCampo('basicCopyDeliveredAt', 'Copia básica entregada', contrato?.basicCopyDueDate ? `Plazo: ${fechaES(contrato.basicCopyDueDate)}` : 'A la representación legal, desde la firma')}
                                <p className="text-[11px] text-slate-500">Contrat@ y la copia básica solo avisan, con su plazo.</p>
                            </>}
                            {tipo === 'formacion' && <>
                                {fechaCampo('prlTrainingDate', 'Fecha de la formación', 'No puede ser futura ni posterior al inicio.')}
                                <Field label="Horas (opcional)"><TextInput type="number" min="0" step="0.5" value={datos.prlTrainingHours} onChange={(ev) => set('prlTrainingHours', ev.target.value)} className="w-28!" /></Field>
                                <CampoArchivo label={`Certificado de la formación${e.detalle?.prl.trainingDocumentId ? ' (ya adjunto: elige otro para sustituirlo)' : ' (obligatorio)'}`} onChange={archivo('prlTrainingDocumentId')} />
                            </>}
                            {tipo === 'salud' && <>
                                <Field label="Resultado">
                                    <div className="flex gap-2">
                                        {Object.entries(SALUD).map(([k, t]) => (
                                            <label key={k} className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center ${datos.healthSurveillanceResult === k ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium' : 'border-slate-200 text-slate-700'}`}>
                                                <input type="radio" name="resultado-salud" className="sr-only" checked={datos.healthSurveillanceResult === k} onChange={() => set('healthSurveillanceResult', k)} />{t}
                                            </label>
                                        ))}
                                    </div>
                                </Field>
                                {fechaCampo('healthSurveillanceDate', 'Fecha')}
                                <CampoArchivo label="Certificado de aptitud (opcional)" onChange={archivo('healthSurveillanceDocumentId')} />
                                <Notice tone="info" icon={Info}>Solo el resultado (apto, no apto o renuncia) y la fecha. El diagnóstico no se guarda nunca. «No apto» impide ocupar el puesto.</Notice>
                            </>}
                            {tipo === 'epi' && <>
                                {fechaCampo('ppeDeliveredAt', 'Fecha de entrega')}
                                <Field label="Qué se entregó (opcional)" hint="Calzado, guantes, chaleco..."><TextInput value={datos.ppeNotes} onChange={(ev) => set('ppeNotes', ev.target.value)} /></Field>
                                <CampoArchivo label="Entrega firmada (opcional)" onChange={archivo('ppeDocumentId')} />
                            </>}
                            {tipo === 'alta' && <>
                                {fechaCampo('ssRegistrationDate', 'Fecha de efectos del alta', 'Tiene que ser anterior al inicio (o el mismo día).')}
                                <CampoArchivo label={`Justificante del alta${e.detalle?.ssRegistration.documentId ? ' (ya adjunto: elige otro para sustituirlo)' : ' (obligatorio)'}`} hint="El de Sistema RED, en PDF." onChange={archivo('ssRegistrationDocumentId')} />
                            </>}
                            {tipo === 'anular' && <Field label="Motivo de la anulación"><TextInput value={datos.motivo} onChange={(ev) => set('motivo', ev.target.value)} placeholder="Por ejemplo: registrado por error" autoFocus /></Field>}
                        </div>
                    </Modal>
                );
            })()}

            {toast && (
                <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-lg text-sm animate-fade-in max-w-md">
                    {toast.tipo === 'error' ? <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                    <span>{toast.texto}</span>
                    <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white" aria-label="Cerrar aviso"><X className="w-4 h-4" /></button>
                </div>
            )}
        </>
    );
}
