// Partió de design/laboral.html (scripts/import-design.py). Ahora se edita aquí directamente: no regenerar.
import React, { useState, useMemo } from 'react';
import {
    Search, Send, FileSignature, ShieldCheck, GraduationCap, FileText, AlertTriangle, CheckCircle2,
    Circle, Clock3, ArrowUpRight, Lock, Calendar, MapPin, Building2, Phone, Mail, Info, List,
    LayoutGrid, X, Check, UserPlus
} from 'lucide-react';
import {
    Page, PageHeader, Card, SectionTitle, KpiTile, EmptyState, Notice, Button, Badge, Avatar, SearchInput,
    Select, Segmented, Field, TextInput, Modal, Drawer
} from '../ui';

// ==========================================
// DATOS DE EJEMPLO (alineados con Peticiones)
// Un expediente por persona con plaza cubierta. Se abre cuando el cliente confirma a la persona.
// ==========================================
const PETICIONES = {
    'PET-2026-0048': {
        id: 'PET-2026-0048', puesto: 'Operario/a de almacén', turno: 'Turno de mañana', plazas: 5,
        cliente: 'Trans-Logística Ibérica Norte, S.L.', centro: 'HUB central Basauri (Bizkaia) - Nave 2', presupuesto: 'PRE-2026-0042 v1',
        inicio: '2026-11-03', fin: '2027-01-29', responsable: 'Ane Uriarte',
        categoria: 'Especialistas / Logística (Grupo 4)', convenio: 'Convenio Logística y Distribución Bizkaia', salario: '10,45 €/h',
        cpdPrevio: 'Revisado por el cliente el 15/10/2026',
    },
    'PET-2026-0050': {
        id: 'PET-2026-0050', puesto: 'Carretillero/a frontal y retráctil', turno: 'Turno de tarde', plazas: 4,
        cliente: 'Trans-Logística Ibérica Norte, S.L.', centro: 'HUB central Basauri (Bizkaia) - Nave 2', presupuesto: 'PRE-2026-0042 v1',
        inicio: '2026-11-10', fin: '2027-01-29', responsable: 'Jon Ibarra',
        categoria: 'Mozo/a especialista (Grupo 3)', convenio: 'Convenio Logística y Distribución Bizkaia', salario: '12,11 €/h',
        cpdPrevio: 'Revisado por el cliente el 15/10/2026',
        sinExpediente: [{ plaza: 3, texto: 'Pendiente del cliente: David Aranguren Sola' }, { plaza: 4, texto: 'Por cubrir' }],
    },
    'PET-2026-0045': {
        id: 'PET-2026-0045', puesto: 'Ayudante de cocina', turno: 'Jornada partida', plazas: 4,
        cliente: 'Hostelería & Eventos Premium BCN, S.L.', centro: 'Recinto de congresos - Barcelona', presupuesto: 'PRE-2026-0041 v1',
        inicio: '2026-11-05', fin: '2026-11-30', responsable: 'Nuria Castells',
        categoria: 'Ayudante (Nivel V)', convenio: 'Convenio de Hostelería de Cataluña', salario: '10,20 €/h',
        cpdPrevio: 'Revisado por el cliente el 01/10/2026',
    },
    'PET-2026-0044': {
        id: 'PET-2026-0044', puesto: 'Camarero/a de sala', turno: 'Jornada partida', plazas: 10,
        cliente: 'Hostelería & Eventos Premium BCN, S.L.', centro: 'Recinto de congresos - Barcelona', presupuesto: 'PRE-2026-0041 v1',
        inicio: '2026-10-10', fin: '2026-11-30', responsable: 'Nuria Castells',
        categoria: 'Camarero/a (Nivel IV)', convenio: 'Convenio de Hostelería de Cataluña', salario: '10,60 €/h',
        cpdPrevio: 'Revisado por el cliente el 01/10/2026',
        sinExpediente: [{ plaza: 3, texto: 'Baja de Sara Benítez Lago (no se presentó): buscando sustituto' }],
    },
};

// Pasos del expediente, en el orden en que se hacen
const PASOS = [
    { id: 'doc', texto: 'Documentación', corto: 'Doc', icono: FileText, diasAntes: 3 },
    { id: 'cpd', texto: 'CPD firmado por la empresa', corto: 'CPD', icono: FileSignature, diasAntes: 2 },
    { id: 'contrato', texto: 'Contrato firmado por la persona', corto: 'Contrato', icono: FileSignature, diasAntes: 1 },
    { id: 'prl', texto: 'Formación PRL y EPIs', corto: 'PRL', icono: GraduationCap, diasAntes: 1 },
    { id: 'alta', texto: 'Alta en la Seguridad Social', corto: 'Alta SS', icono: ShieldCheck, diasAntes: 1 },
];
const NOTAS = {
    doc: { hecho: 'DNI o NIE, NSS, cuenta bancaria y RGPD validados', en_curso: 'Pedido a la persona: pendiente de que lo suba a su portal', pendiente: 'Faltan documentos por aportar', bloqueado: 'NIE caducado: hay que renovarlo antes de contratar' },
    cpd: { hecho: 'Firmado por la empresa', en_curso: 'Enviado a la empresa: pendiente de firma', pendiente: 'Se genera cuando el cliente confirma a la persona' },
    contrato: { hecho: 'Firmado por la persona', en_curso: 'Enviado a firmar por SMS y email', pendiente: 'Listo para enviar a firmar' },
    prl: { hecho: 'Formación hecha y EPIs entregados', en_curso: 'Convocado a la formación', pendiente: 'Asignar formación y entregar EPIs' },
    alta: { hecho: 'Comunicada en el Sistema RED', en_curso: 'Enviada, pendiente de respuesta', pendiente: 'Comunicar antes del primer día' },
};
const ESTADO_PASO = {
    hecho: { texto: 'Hecho', tono: 'success', icono: CheckCircle2, clase: 'text-emerald-600' },
    en_curso: { texto: 'En curso', tono: 'info', icono: Clock3, clase: 'text-blue-600' },
    pendiente: { texto: 'Pendiente', tono: 'neutral', icono: Circle, clase: 'text-slate-300' },
    bloqueado: { texto: 'Bloqueado', tono: 'danger', icono: AlertTriangle, clase: 'text-rose-600' },
};
const LETRA = { h: 'hecho', e: 'en_curso', p: 'pendiente', b: 'bloqueado' };

// estados: una letra por paso (doc, cpd, contrato, prl, alta): h hecho, e en curso, p pendiente, b bloqueado
const exp = (petId, plaza, nombre, estados, dni = '00000000T') => ({
    id: `${petId}-${plaza}`, petId, plaza, nombre, dni,
    telefono: '+34 600 000 000', email: `${nombre.split(' ')[0].toLowerCase()}@ejemplo.es`,
    pasos: Object.fromEntries(PASOS.map((p, i) => [p.id, { estado: LETRA[estados[i]] }])),
});
const INITIAL_EXPEDIENTES = [
    exp('PET-2026-0048', 1, 'Jon Ander Etxebarria Bilbao', 'hhhhh'),
    exp('PET-2026-0048', 2, 'Ainhoa Larrazabal Urkijo', 'hhhhp'),
    exp('PET-2026-0048', 3, 'Mamadou Diallo', 'bhppp', 'X0000000T'),
    exp('PET-2026-0048', 4, 'Laura Morales San Sebastián', 'hepep'),
    exp('PET-2026-0048', 5, 'Iker Agirrebeitia Mendia', 'hephp'),
    exp('PET-2026-0050', 1, 'Unai García Zabaleta', 'hhepp'),
    exp('PET-2026-0050', 2, 'Carlos Manuel Ortiz Reyes', 'heppp'),
    exp('PET-2026-0045', 1, 'Noa Serra Pons', 'hhhhp'),
    exp('PET-2026-0045', 2, 'Hugo Martín Vera', 'hhhpp'),
    exp('PET-2026-0045', 3, 'Ane Goikoetxea Ruiz', 'hhhhh'),
    exp('PET-2026-0045', 4, 'Iván Molina Prat', 'ehhpp'),
    ...['Garazi Uribe Arana', 'Pablo Ruiz Cano', null, 'Youssef Amrani', 'Lucía Ferrer Sanz', 'Marc Puig Soler', 'Aitana Roca Vidal', 'Daniel Sousa Prieto', 'Irene Campos Gil', 'Óscar León Mena']
        .map((n, i) => n && exp('PET-2026-0044', i + 1, n, 'hhhhh')).filter(Boolean),
];
const RESPONSABLES = ['Ane Uriarte', 'Jon Ibarra', 'Nuria Castells'];
const INITIAL_ACTIVIDAD = [
    { petId: 'PET-2026-0048', texto: 'Contrato firmado por Iker Agirrebeitia Mendia', quien: 'Firma electrónica', cuando: 'Hoy 11:42' },
    { petId: 'PET-2026-0048', texto: 'CPD de Laura Morales San Sebastián enviado a la empresa', quien: 'Ane Uriarte', cuando: 'Hoy 09:30' },
    { petId: 'PET-2026-0048', texto: 'NIE caducado de Mamadou Diallo: bloquea el contrato', quien: 'Ane Uriarte', cuando: 'Ayer 18:20' },
    { petId: 'PET-2026-0050', texto: 'Contrato enviado a firmar a Unai García Zabaleta', quien: 'Jon Ibarra', cuando: 'Ayer 16:05' },
    { petId: 'PET-2026-0045', texto: 'Formación PRL de Noa Serra Pons completada', quien: 'Nuria Castells', cuando: '26/10/2026' },
    { petId: 'PET-2026-0044', texto: 'Baja de Sara Benítez Lago: no se presentó el primer día', quien: 'Nuria Castells', cuando: '10/10/2026' },
];

// ==========================================
// UTILIDADES
// ==========================================
const fechaES = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');
const diasHasta = (iso) => Math.round((new Date(`${iso}T00:00:00`) - new Date(new Date().toDateString())) / 86400000);
const restarDias = (iso, n) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
const hechos = (e) => PASOS.filter(p => e.pasos[p.id].estado === 'hecho').length;
const completo = (e) => hechos(e) === PASOS.length;
const bloqueado = (e) => PASOS.some(p => e.pasos[p.id].estado === 'bloqueado');
// Qué hace falta antes de poder hacer un paso
const esperaA = (e, pasoId) => {
    if (pasoId === 'contrato' && e.pasos.cpd.estado !== 'hecho') return 'al CPD firmado';
    if (pasoId === 'contrato' && e.pasos.doc.estado === 'bloqueado') return 'a la documentación';
    if (pasoId === 'alta' && e.pasos.doc.estado !== 'hecho') return 'a la documentación';
    if (pasoId === 'alta' && e.pasos.contrato.estado !== 'hecho') return 'al contrato firmado';
    return null;
};
// Siguiente paso que se puede mover: el primero sin hacer que no esté esperando a otro
const proximaTarea = (e) => {
    if (completo(e)) return null;
    const bloq = PASOS.find(p => e.pasos[p.id].estado === 'bloqueado');
    if (bloq) return bloq;
    return PASOS.find(p => e.pasos[p.id].estado !== 'hecho' && !esperaA(e, p.id)) || PASOS.find(p => e.pasos[p.id].estado !== 'hecho');
};
// Acción principal de un paso según su estado
const accionDe = (e, paso) => {
    const est = e.pasos[paso.id].estado;
    if (est === 'hecho' || esperaA(e, paso.id)) return null;
    const A = {
        doc: { bloqueado: 'Pedir documento', pendiente: 'Pedir documento', en_curso: 'Validar documentos' },
        cpd: { en_curso: 'Recordar a la empresa', pendiente: 'Ir a la petición' },
        contrato: { pendiente: 'Enviar a firmar', en_curso: 'Recordar' },
        prl: { pendiente: 'Asignar formación', en_curso: 'Marcar hecha' },
        alta: { pendiente: 'Comunicar alta', en_curso: 'Marcar comunicada' },
    };
    return A[paso.id][est] || null;
};
const urgencia = (e) => {
    const d = diasHasta(PETICIONES[e.petId].inicio);
    if (completo(e)) return d <= 0 ? { texto: 'Incorporada', tono: 'success' } : { texto: `Empieza en ${d} ${d === 1 ? 'día' : 'días'}`, tono: 'neutral' };
    if (d < 0) return { texto: 'Ya ha empezado', tono: 'danger' };
    if (d <= 3) return { texto: `Empieza en ${d} ${d === 1 ? 'día' : 'días'}`, tono: 'danger' };
    if (d <= 7) return { texto: `Empieza en ${d} días`, tono: 'warning' };
    return { texto: `Empieza en ${d} días`, tono: 'neutral' };
};

// Fila de pasos con su estado (los cinco del expediente)
function PasosExpediente({ e }) {
    return (
        <div className="flex flex-nowrap gap-1">
            {PASOS.map(p => {
                const est = ESTADO_PASO[e.pasos[p.id].estado];
                return (
                    <span key={p.id} title={`${p.texto}: ${est.texto.toLowerCase()}`} className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] whitespace-nowrap ${
                        { hecho: 'bg-emerald-50 text-emerald-700', en_curso: 'bg-blue-50 text-blue-700', pendiente: 'bg-slate-100 text-slate-500', bloqueado: 'bg-rose-50 text-rose-700' }[e.pasos[p.id].estado]}`}>
                        <est.icono className="w-3 h-3" />{p.corto}
                    </span>
                );
            })}
        </div>
    );
}

export default function LaboralView() {
    const [expedientes, setExpedientes] = useState(INITIAL_EXPEDIENTES);
    const [actividad, setActividad] = useState(INITIAL_ACTIVIDAD);
    const [vista, setVista] = useState('bandeja'); // 'bandeja' | 'peticion'
    const [petId, setPetId] = useState(null);
    const [agrupar, setAgrupar] = useState('persona'); // 'persona' | 'peticion'
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('pendientes');
    const [filtroPaso, setFiltroPaso] = useState('');
    const [filtroPeticion, setFiltroPeticion] = useState('');
    const [filtroResponsable, setFiltroResponsable] = useState('');
    const [abierto, setAbierto] = useState(null); // id del expediente en el panel
    const [accion, setAccion] = useState(null); // { expId, pasoId, datos }
    const [toast, setToast] = useState(null);

    const showToast = (texto) => { setToast(texto); setTimeout(() => setToast(null), 3800); };
    const registrar = (pId, texto) => setActividad(prev => [{ petId: pId, texto, quien: 'Usuario Demo', cuando: 'Ahora' }, ...prev]);
    const cambiarPaso = (expId, pasoId, estado, texto) => {
        setExpedientes(prev => prev.map(e => (e.id === expId ? { ...e, pasos: { ...e.pasos, [pasoId]: { estado } } } : e)));
        const e = expedientes.find(x => x.id === expId);
        if (texto) { registrar(e.petId, texto); showToast(texto); }
    };

    // Ejecuta la acción de un paso. Las que piden datos (alta, formación) abren una ventana.
    const ejecutar = (e, paso) => {
        const est = e.pasos[paso.id].estado;
        const n = e.nombre;
        if (paso.id === 'doc' && est !== 'en_curso') return cambiarPaso(e.id, 'doc', 'en_curso', `Documento pedido a ${n}: se le avisa por email con el enlace a su portal`);
        if (paso.id === 'doc') return cambiarPaso(e.id, 'doc', 'hecho', `Documentación de ${n} validada`);
        if (paso.id === 'cpd' && est === 'en_curso') return showToast(`Recordatorio de firma del CPD de ${n} enviado a ${PETICIONES[e.petId].cliente}`);
        if (paso.id === 'cpd') { window.location.hash = '#/peticiones'; return null; }
        if (paso.id === 'contrato' && est === 'pendiente') return cambiarPaso(e.id, 'contrato', 'en_curso', `Contrato enviado a firmar a ${n} por SMS y email`);
        if (paso.id === 'contrato') return showToast(`Recordatorio de firma enviado a ${n}`);
        if (paso.id === 'prl' && est === 'en_curso') return cambiarPaso(e.id, 'prl', 'hecho', `Formación PRL de ${n} completada`);
        if (paso.id === 'prl') return setAccion({ expId: e.id, pasoId: 'prl', datos: { curso: 'Formación PRL del puesto (20 h)', fecha: restarDias(PETICIONES[e.petId].inicio, 2), epis: true } });
        if (paso.id === 'alta' && est === 'en_curso') return cambiarPaso(e.id, 'alta', 'hecho', `Alta de ${n} comunicada`);
        return setAccion({ expId: e.id, pasoId: 'alta', datos: { fecha: PETICIONES[e.petId].inicio, contrato: '502 · Eventual por circunstancias de la producción', grupo: '06 · Peones' } });
    };
    // Simula que el otro lado responde (la empresa firma el CPD, la persona firma el contrato)
    const simular = (e, paso) => {
        if (paso.id === 'cpd') cambiarPaso(e.id, 'cpd', 'hecho', `${PETICIONES[e.petId].cliente} ha firmado el CPD de ${e.nombre}`);
        if (paso.id === 'contrato') cambiarPaso(e.id, 'contrato', 'hecho', `${e.nombre} ha firmado su contrato`);
    };
    const confirmarAccion = () => {
        const e = expedientes.find(x => x.id === accion.expId);
        if (accion.pasoId === 'alta') cambiarPaso(e.id, 'alta', 'hecho', `Alta de ${e.nombre} comunicada en el Sistema RED con fecha ${fechaES(accion.datos.fecha)}`);
        if (accion.pasoId === 'prl') cambiarPaso(e.id, 'prl', 'en_curso', `${e.nombre} convocado/a a ${accion.datos.curso.toLowerCase()} el ${fechaES(accion.datos.fecha)}`);
        setAccion(null);
    };
    // Acciones de grupo en una petición
    const enLote = (pasoId) => {
        const lista = expedientes.filter(e => e.petId === petId && e.pasos[pasoId].estado === 'pendiente' && !esperaA(e, pasoId));
        if (!lista.length) return;
        const nuevo = pasoId === 'contrato' ? 'en_curso' : 'hecho';
        setExpedientes(prev => prev.map(e => (lista.some(x => x.id === e.id) ? { ...e, pasos: { ...e.pasos, [pasoId]: { estado: nuevo } } } : e)));
        const texto = pasoId === 'contrato' ? `${lista.length} ${lista.length === 1 ? 'contrato enviado' : 'contratos enviados'} a firmar` : `${lista.length} ${lista.length === 1 ? 'alta comunicada' : 'altas comunicadas'} en el Sistema RED`;
        registrar(petId, texto);
        showToast(texto);
    };

    // Bandeja: filtros
    const filtrados = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        return expedientes
            .filter(e => (filtroEstado === 'todos' || (filtroEstado === 'pendientes' && !completo(e)) || (filtroEstado === 'bloqueados' && bloqueado(e)) || (filtroEstado === 'completos' && completo(e))))
            .filter(e => !filtroPaso || e.pasos[filtroPaso].estado !== 'hecho')
            .filter(e => !filtroPeticion || e.petId === filtroPeticion)
            .filter(e => !filtroResponsable || PETICIONES[e.petId].responsable === filtroResponsable)
            .filter(e => !q || [e.nombre, e.dni, e.petId, PETICIONES[e.petId].cliente, PETICIONES[e.petId].puesto].some(t => t.toLowerCase().includes(q)))
            .sort((a, b) => PETICIONES[a.petId].inicio.localeCompare(PETICIONES[b.petId].inicio) || a.petId.localeCompare(b.petId) || a.plaza - b.plaza);
    }, [expedientes, busqueda, filtroEstado, filtroPaso, filtroPeticion, filtroResponsable]);
    const hayFiltros = busqueda || filtroEstado !== 'pendientes' || filtroPaso || filtroPeticion || filtroResponsable;
    const limpiar = () => { setBusqueda(''); setFiltroEstado('pendientes'); setFiltroPaso(''); setFiltroPeticion(''); setFiltroResponsable(''); };
    const pendientes = expedientes.filter(e => !completo(e));
    const abrirPeticion = (id) => { setPetId(id); setVista('peticion'); };
    const expAbierto = expedientes.find(e => e.id === abierto);

    // Tabla de expedientes (la usan la bandeja y el detalle de la petición)
    const TablaExpedientes = ({ lista, conPeticion, sinExpediente = [] }) => (
        <div className="overflow-x-auto">
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
                        const pet = PETICIONES[e.petId];
                        const sig = proximaTarea(e);
                        const accionSig = sig && accionDe(e, sig);
                        const urg = urgencia(e);
                        return (
                            <tr key={e.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                <td className="py-2.5 px-3">
                                    <button type="button" onClick={() => setAbierto(e.id)} className="inline-flex items-center gap-2 text-left hover:text-indigo-700">
                                        <Avatar name={e.nombre} size="sm" />
                                        <span>
                                            <span className="block font-medium text-slate-900 whitespace-nowrap">{e.nombre}</span>
                                            <span className="text-[11px] text-slate-500">Plaza {e.plaza} · {e.dni}</span>
                                        </span>
                                    </button>
                                </td>
                                {conPeticion && (
                                    <td className="py-2.5 px-3">
                                        <button type="button" onClick={() => abrirPeticion(e.petId)} className="text-left hover:text-indigo-700">
                                            <span className="block text-slate-800 whitespace-nowrap">{pet.puesto} · {pet.turno.toLowerCase()}</span>
                                            <span className="text-[11px] text-slate-500">{e.petId} · {pet.cliente}</span>
                                        </button>
                                    </td>
                                )}
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                    <div className="text-slate-700">{fechaES(pet.inicio)}</div>
                                    <div className={`text-[11px] ${{ danger: 'text-rose-600', warning: 'text-amber-700', success: 'text-emerald-700', neutral: 'text-slate-500' }[urg.tono]}`}>{urg.texto}</div>
                                </td>
                                <td className="py-2.5 px-3"><PasosExpediente e={e} /></td>
                                <td className="py-2.5 px-3 min-w-[200px]">
                                    {sig ? (
                                        <>
                                            <div className={e.pasos[sig.id].estado === 'bloqueado' ? 'text-rose-700' : 'text-slate-800'}>{sig.texto}</div>
                                            <div className="text-[11px] text-slate-500">{esperaA(e, sig.id) ? `Espera ${esperaA(e, sig.id)}` : NOTAS[sig.id][e.pasos[sig.id].estado]}</div>
                                        </>
                                    ) : <span className="text-emerald-700">Todo listo</span>}
                                </td>
                                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                    {accionSig ? <Button size="sm" variant={e.pasos[sig.id].estado === 'bloqueado' ? 'primary' : 'secondary'} onClick={() => ejecutar(e, sig)}>{accionSig}</Button>
                                        : <Button size="sm" variant="ghost" onClick={() => setAbierto(e.id)}>Ver</Button>}
                                </td>
                            </tr>
                        );
                    })}
                    {sinExpediente.map(s => (
                        <tr key={`sin-${s.plaza}`} className="border-b border-slate-100 last:border-0 bg-slate-50/50">
                            <td className="py-2.5 px-3 text-slate-500" colSpan={conPeticion ? 4 : 3}>Plaza {s.plaza} · {s.texto}</td>
                            <td className="py-2.5 px-3 text-[11px] text-slate-500">El expediente se abre cuando el cliente confirma a la persona</td>
                            <td className="py-2.5 px-3 text-right"><Button size="sm" variant="ghost" icon={ArrowUpRight} onClick={() => { window.location.hash = '#/peticiones'; }}>Ir a Peticiones</Button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <>
            {/* BANDEJA: expedientes de todas las peticiones */}
            {vista === 'bandeja' && (
                <Page>
                    <PageHeader
                        title="Contratos y altas"
                        count={pendientes.length}
                        subtitle="Lo que falta para que cada persona pueda empezar: documentación, CPD, contrato, formación PRL y alta en la Seguridad Social."
                    />
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <KpiTile label="Expedientes pendientes" tone="accent" value={pendientes.length} hint={`${expedientes.length - pendientes.length} completos`} active={filtroEstado === 'pendientes' && !filtroPaso} onClick={() => { limpiar(); }} />
                        <KpiTile label="Empiezan en 3 días o menos" tone="danger" value={pendientes.filter(e => diasHasta(PETICIONES[e.petId].inicio) <= 3).length} hint="Con pasos sin hacer" />
                        <KpiTile label="Bloqueados" tone="danger" value={expedientes.filter(bloqueado).length} hint="Documentación caducada o que falta" active={filtroEstado === 'bloqueados'} onClick={() => { limpiar(); setFiltroEstado('bloqueados'); }} />
                        <KpiTile label="CPD sin firmar" tone="warning" value={expedientes.filter(e => e.pasos.cpd.estado === 'en_curso').length} hint="Esperando a la empresa" active={filtroPaso === 'cpd'} onClick={() => { limpiar(); setFiltroPaso('cpd'); }} />
                    </div>

                    <Card className="overflow-hidden">
                        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-200">
                            <SearchInput className="flex-1 min-w-[200px] max-w-xs" value={busqueda} onChange={setBusqueda} placeholder="Buscar persona, DNI, petición o cliente..." />
                            <Select value={filtroEstado} onChange={(ev) => setFiltroEstado(ev.target.value)} aria-label="Estado">
                                <option value="pendientes">Pendientes</option>
                                <option value="bloqueados">Bloqueados</option>
                                <option value="completos">Completos</option>
                                <option value="todos">Todos</option>
                            </Select>
                            <Select value={filtroPaso} onChange={(ev) => setFiltroPaso(ev.target.value)} aria-label="Paso pendiente">
                                <option value="">Cualquier paso</option>
                                {PASOS.map(p => <option key={p.id} value={p.id}>Falta: {p.texto.toLowerCase()}</option>)}
                            </Select>
                            <Select value={filtroPeticion} onChange={(ev) => setFiltroPeticion(ev.target.value)} aria-label="Petición">
                                <option value="">Todas las peticiones</option>
                                {Object.values(PETICIONES).map(p => <option key={p.id} value={p.id}>{p.id} · {p.puesto}</option>)}
                            </Select>
                            <Select value={filtroResponsable} onChange={(ev) => setFiltroResponsable(ev.target.value)} aria-label="Responsable">
                                <option value="">Todos los responsables</option>
                                {RESPONSABLES.map(r => <option key={r} value={r}>{r}</option>)}
                            </Select>
                            {hayFiltros && <Button size="sm" variant="ghost" icon={X} onClick={limpiar}>Limpiar</Button>}
                            <div className="ml-auto">
                                <Segmented value={agrupar} onChange={setAgrupar} options={[{ id: 'persona', title: 'Por persona', icon: List }, { id: 'peticion', title: 'Por petición', icon: LayoutGrid }]} />
                            </div>
                        </div>

                        {filtrados.length === 0 ? (
                            <EmptyState icon={CheckCircle2} title="No hay expedientes con estos filtros" action={hayFiltros && <Button onClick={limpiar}>Limpiar filtros</Button>} />
                        ) : agrupar === 'persona' ? (
                            <TablaExpedientes lista={filtrados} conPeticion />
                        ) : (
                            <div className="p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                {[...new Set(filtrados.map(e => e.petId))].map(id => {
                                    const pet = PETICIONES[id];
                                    const todos = expedientes.filter(e => e.petId === id);
                                    const listos = todos.filter(completo).length;
                                    const d = diasHasta(pet.inicio);
                                    return (
                                        <button key={id} type="button" onClick={() => abrirPeticion(id)} className="text-left rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300 space-y-3">
                                            <div>
                                                <div className="text-sm font-medium text-slate-900">{pet.puesto} · {pet.turno.toLowerCase()}</div>
                                                <div className="text-[11px] text-slate-500">{id} · {pet.cliente}</div>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-slate-600">Inicio {fechaES(pet.inicio)}</span>
                                                <span className={d < 0 ? 'text-slate-500' : d <= 3 ? 'text-rose-600' : d <= 7 ? 'text-amber-700' : 'text-slate-500'}>{d < 0 ? 'En curso' : `en ${d} ${d === 1 ? 'día' : 'días'}`}</span>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-[11px] text-slate-500 mb-1"><span>{listos} de {todos.length} expedientes completos</span><span>{pet.plazas} plazas</span></div>
                                                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className={`h-1.5 rounded-full ${listos === todos.length ? 'bg-emerald-500' : 'bg-indigo-600'}`} style={{ width: `${(listos / Math.max(1, todos.length)) * 100}%` }} /></div>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {PASOS.map(p => {
                                                    const faltan = todos.filter(e => e.pasos[p.id].estado !== 'hecho').length;
                                                    return faltan > 0 && <Badge key={p.id} tone={todos.some(e => e.pasos[p.id].estado === 'bloqueado') ? 'danger' : 'warning'}>{p.corto}: faltan {faltan}</Badge>;
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
                const pet = PETICIONES[petId];
                const lista = expedientes.filter(e => e.petId === petId).sort((a, b) => a.plaza - b.plaza);
                const listos = lista.filter(completo).length;
                const contratosListos = lista.filter(e => e.pasos.contrato.estado === 'pendiente' && !esperaA(e, 'contrato')).length;
                const altasListas = lista.filter(e => e.pasos.alta.estado === 'pendiente' && !esperaA(e, 'alta')).length;
                const d = diasHasta(pet.inicio);
                return (
                    <Page>
                        <PageHeader
                            breadcrumbs={[{ label: 'Contratos y altas', onClick: () => setVista('bandeja') }, { label: petId }]}
                            title={`${pet.puesto} · ${pet.turno.toLowerCase()}`}
                            status={<Badge tone={listos === lista.length ? 'success' : d <= 3 ? 'danger' : 'accent'} dot>{listos === lista.length ? 'Todo listo' : d < 0 ? 'En curso con pendientes' : 'En incorporación'}</Badge>}
                            subtitle={
                                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <span className="inline-flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-slate-400" />{pet.cliente}</span>
                                    <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" />{pet.centro}</span>
                                    <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" />{fechaES(pet.inicio)} a {fechaES(pet.fin)}</span>
                                    <span>Responsable: {pet.responsable}</span>
                                    <button type="button" onClick={() => { window.location.hash = '#/peticiones'; }} className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 hover:underline">
                                        <ArrowUpRight className="w-3.5 h-3.5" />Ver {petId} en Peticiones
                                    </button>
                                </span>
                            }
                            actions={<>
                                <Button icon={Send} disabled={!contratosListos} onClick={() => enLote('contrato')}>Enviar contratos a firmar{contratosListos ? ` (${contratosListos})` : ''}</Button>
                                <Button variant="primary" icon={ShieldCheck} disabled={!altasListas} onClick={() => enLote('alta')}>Comunicar altas{altasListas ? ` (${altasListas})` : ''}</Button>
                            </>}
                        />

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <KpiTile label="Personas" value={`${lista.length} de ${pet.plazas}`} hint={pet.sinExpediente ? `${pet.sinExpediente.length} ${pet.sinExpediente.length === 1 ? 'plaza' : 'plazas'} sin persona confirmada` : 'Todas las plazas con persona'} />
                            <KpiTile label="Expedientes completos" tone="success" value={listos} hint="Listos para empezar" />
                            <KpiTile label="Pendientes" tone="warning" value={lista.length - listos} hint={PASOS.map(p => ({ p, n: lista.filter(e => e.pasos[p.id].estado !== 'hecho').length })).filter(x => x.n).map(x => `${x.n} ${x.p.corto}`).join(' · ') || 'Ninguno'} />
                            <KpiTile label="Bloqueos" tone="danger" value={lista.filter(bloqueado).length} hint={lista.filter(bloqueado).map(e => e.nombre).join(', ') || 'Ninguno'} />
                        </div>

                        <Card className="p-4">
                            <div className="flex flex-wrap items-start gap-x-6 gap-y-2 text-xs">
                                <div className="flex items-center gap-1.5 text-slate-500"><Lock className="w-3.5 h-3.5" />Del presupuesto {pet.presupuesto}</div>
                                <div><span className="text-slate-500">Categoría:</span> <span className="text-slate-900">{pet.categoria}</span></div>
                                <div><span className="text-slate-500">Convenio:</span> <span className="text-slate-900">{pet.convenio}</span></div>
                                <div><span className="text-slate-500">Salario:</span> <span className="text-slate-900">{pet.salario}</span></div>
                                <div><span className="text-slate-500">CPD previo:</span> <span className="text-slate-900">{pet.cpdPrevio}</span></div>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-2">La tarifa al cliente y el margen no se ven aquí: solo en Presupuestos, para dirección.</p>
                        </Card>

                        <Card className="overflow-hidden">
                            <div className="p-4 border-b border-slate-200"><SectionTitle>Expedientes</SectionTitle></div>
                            <TablaExpedientes lista={lista} sinExpediente={pet.sinExpediente} />
                        </Card>

                        <Card className="p-4">
                            <SectionTitle>Actividad</SectionTitle>
                            <ol className="space-y-2.5 text-xs">
                                {actividad.filter(a => a.petId === petId).map((a, i) => (
                                    <li key={i} className="flex items-start gap-2.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                        <div><div className="text-slate-800">{a.texto}</div><div className="text-[11px] text-slate-500">{a.quien} · {a.cuando}</div></div>
                                    </li>
                                ))}
                            </ol>
                        </Card>
                    </Page>
                );
            })()}

            {/* EXPEDIENTE DE UNA PERSONA */}
            {expAbierto && (() => {
                const e = expAbierto;
                const pet = PETICIONES[e.petId];
                const urg = urgencia(e);
                return (
                    <Drawer
                        onClose={() => setAbierto(null)}
                        width="max-w-xl"
                        leading={<Avatar name={e.nombre} size="lg" />}
                        title={e.nombre}
                        status={<Badge tone={completo(e) ? 'success' : bloqueado(e) ? 'danger' : 'accent'} dot>{completo(e) ? 'Completo' : bloqueado(e) ? 'Bloqueado' : 'En preparación'}</Badge>}
                        subtitle={
                            <div className="space-y-1">
                                <div>{pet.puesto} · {pet.turno.toLowerCase()} · {e.petId} · Plaza {e.plaza}</div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600">
                                    <span>{e.dni}</span>
                                    <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" />{e.telefono}</span>
                                    <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" />{e.email}</span>
                                </div>
                            </div>
                        }
                        footer={<>
                            <Button variant="ghost" icon={ArrowUpRight} className="mr-auto" onClick={() => { window.location.hash = '#/candidatos'; }}>Ficha del candidato</Button>
                            <Button onClick={() => setAbierto(null)}>Cerrar</Button>
                        </>}
                    >
                        <div className="space-y-4 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-600">Empieza el {fechaES(pet.inicio)} · <span className={{ danger: 'text-rose-600', warning: 'text-amber-700', success: 'text-emerald-700', neutral: 'text-slate-500' }[urg.tono]}>{urg.texto.toLowerCase()}</span></span>
                                <span className="text-slate-500">{hechos(e)} de {PASOS.length} pasos</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className={`h-1.5 rounded-full ${completo(e) ? 'bg-emerald-500' : 'bg-indigo-600'}`} style={{ width: `${(hechos(e) / PASOS.length) * 100}%` }} /></div>
                            <ol className="space-y-2">
                                {PASOS.map((p, i) => {
                                    const st = e.pasos[p.id].estado;
                                    const est = ESTADO_PASO[st];
                                    const espera = esperaA(e, p.id);
                                    const acc = accionDe(e, p);
                                    return (
                                        <li key={p.id} className={`rounded-lg border p-3 flex items-start gap-3 ${st === 'bloqueado' ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200'}`}>
                                            <est.icono className={`w-4 h-4 mt-0.5 shrink-0 ${est.clase}`} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-medium text-slate-900">{i + 1}. {p.texto}</span>
                                                    <Badge tone={est.tono}>{est.texto}</Badge>
                                                </div>
                                                <div className="text-slate-600 mt-0.5">{espera && st !== 'hecho' ? `Espera ${espera}.` : NOTAS[p.id][st]}</div>
                                                {st !== 'hecho' && <div className="text-[11px] text-slate-400 mt-0.5">Antes del {fechaES(restarDias(pet.inicio, p.diasAntes))}</div>}
                                            </div>
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                {acc && <Button size="sm" variant={st === 'bloqueado' ? 'primary' : 'secondary'} onClick={() => ejecutar(e, p)}>{acc}</Button>}
                                                {st === 'en_curso' && ['cpd', 'contrato'].includes(p.id) && (
                                                    <Button size="sm" variant="ghost" title="En la demo simula la firma" onClick={() => simular(e, p)}>Marcar firmado</Button>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>
                            <Notice tone="info" icon={Info}>
                                El CPD lo firma la empresa desde su portal y el contrato lo firma la persona desde el suyo. El alta se comunica cuando hay contrato firmado y documentación en regla.
                            </Notice>
                        </div>
                    </Drawer>
                );
            })()}

            {/* VENTANA DE ACCIÓN: comunicar alta o asignar formación PRL */}
            {accion && (() => {
                const e = expedientes.find(x => x.id === accion.expId);
                const set = (k, v) => setAccion(a => ({ ...a, datos: { ...a.datos, [k]: v } }));
                const alta = accion.pasoId === 'alta';
                return (
                    <Modal
                        title={alta ? 'Comunicar alta en la Seguridad Social' : 'Asignar formación PRL'}
                        subtitle={`${e.nombre} · ${e.petId} · Plaza ${e.plaza}`}
                        onClose={() => setAccion(null)}
                        size="max-w-md"
                        footer={<>
                            <Button onClick={() => setAccion(null)}>Cancelar</Button>
                            <Button variant="primary" icon={alta ? ShieldCheck : GraduationCap} onClick={confirmarAccion}>{alta ? 'Comunicar alta' : 'Convocar'}</Button>
                        </>}
                    >
                        <div className="space-y-4 text-xs">
                            {alta ? (
                                <>
                                    <Field label="Fecha de alta" hint="Normalmente, el primer día de trabajo."><TextInput type="date" value={accion.datos.fecha} onChange={(ev) => set('fecha', ev.target.value)} /></Field>
                                    <Field label="Tipo de contrato"><TextInput value={accion.datos.contrato} onChange={(ev) => set('contrato', ev.target.value)} /></Field>
                                    <Field label="Grupo de cotización"><TextInput value={accion.datos.grupo} onChange={(ev) => set('grupo', ev.target.value)} /></Field>
                                    <p className="text-[11px] text-slate-500">Se envía al Sistema RED. En la demo, la respuesta llega al momento.</p>
                                </>
                            ) : (
                                <>
                                    <Field label="Formación"><TextInput value={accion.datos.curso} onChange={(ev) => set('curso', ev.target.value)} /></Field>
                                    <Field label="Fecha"><TextInput type="date" value={accion.datos.fecha} onChange={(ev) => set('fecha', ev.target.value)} /></Field>
                                    <label className="flex items-center gap-2 text-slate-700">
                                        <input type="checkbox" checked={accion.datos.epis} onChange={(ev) => set('epis', ev.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                        Entregar los EPIs del puesto ese día
                                    </label>
                                </>
                            )}
                        </div>
                    </Modal>
                );
            })()}

            {toast && (
                <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-lg text-sm animate-fade-in max-w-md">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>{toast}</span>
                    <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white" aria-label="Cerrar aviso"><X className="w-4 h-4" /></button>
                </div>
            )}
        </>
    );
}
