// Personal en misión: personas que ya trabajan en el cliente. Sigue a Contratos y altas.
// No partió de ninguna maqueta de design/: se diseñó directamente con el sistema común.
import React, { useState, useMemo } from 'react';
import {
    Briefcase, Building2, MapPin, Calendar, CalendarPlus, CalendarX2, AlertTriangle, CheckCircle2,
    Clock3, HeartPulse, Plus, ArrowUpRight, Info, X, FileSignature, Users
} from 'lucide-react';
import {
    Page, PageHeader, Card, SectionTitle, KpiTile, EmptyState, Notice, Button, Badge, Avatar, SearchInput,
    Select, Field, TextInput, Modal, Drawer
} from '../ui';

// ==========================================
// DATOS DE EJEMPLO (las mismas peticiones y personas que en Peticiones y Contratos y altas)
// ==========================================
const PETICIONES = {
    'PET-2026-0044': {
        puesto: 'Camarero/a de sala', turno: 'Jornada partida', cliente: 'Hostelería & Eventos Premium BCN, S.L.',
        centro: 'Recinto de congresos - Barcelona', responsable: 'Nuria Castells',
    },
    'PET-2026-0031': {
        puesto: 'Mozo/a de almacén', turno: 'Turno de mañana', cliente: 'Trans-Logística Ibérica Norte, S.L.',
        centro: 'HUB central Basauri (Bizkaia) - Nave 2', responsable: 'Ane Uriarte',
    },
};
// Personas que se incorporan en los próximos días (siguen en Contratos y altas hasta su primer día)
const PROXIMAS = [
    { petId: 'PET-2026-0048', puesto: 'Operario/a de almacén', inicio: '2026-11-03', personas: 5 },
    { petId: 'PET-2026-0045', puesto: 'Ayudante de cocina', inicio: '2026-11-05', personas: 4 },
    { petId: 'PET-2026-0050', puesto: 'Carretillero/a', inicio: '2026-11-10', personas: 2 },
];
const MOTIVOS_FIN = ['Fin de la campaña o de la necesidad', 'A petición del cliente', 'Renuncia de la persona', 'No supera el periodo de prueba', 'Despido disciplinario', 'Otro'];
const TIPOS_INCIDENCIA = ['Baja médica (IT)', 'Accidente de trabajo', 'Ausencia', 'Retraso', 'Amonestación', 'Otro'];
// Contrato por circunstancias de la producción: hasta 6 meses (ampliable a 12 por convenio)
const MESES_MAXIMOS = 6;

const mision = (petId, n, nombre, inicio, fin, extra = {}) => ({
    id: `${petId}-${n}`, petId, plaza: n, nombre, dni: '00000000T', telefono: '+34 600 000 000',
    inicio, fin, estado: 'mision', cpdFirmado: inicio, contrato: 'Circunstancias de la producción',
    prorrogas: [], incidencias: [], cierre: null,
    historial: [{ fecha: inicio, texto: 'Inicio de la misión' }],
    ...extra,
});
const INITIAL_MISIONES = [
    mision('PET-2026-0044', 1, 'Garazi Uribe Arana', '2026-10-10', '2026-11-30'),
    mision('PET-2026-0044', 2, 'Pablo Ruiz Cano', '2026-10-10', '2026-11-30'),
    mision('PET-2026-0044', 4, 'Youssef Amrani', '2026-10-10', '2026-11-30', {
        estado: 'it',
        incidencias: [{ tipo: 'Baja médica (IT)', desde: '2026-10-24', hasta: '', nota: 'Parte de baja recibido. Esguince de tobillo fuera del trabajo.' }],
        historial: [{ fecha: '2026-10-10', texto: 'Inicio de la misión' }, { fecha: '2026-10-24', texto: 'Baja médica (IT)' }],
    }),
    mision('PET-2026-0044', 5, 'Lucía Ferrer Sanz', '2026-10-10', '2026-11-30'),
    mision('PET-2026-0044', 6, 'Marc Puig Soler', '2026-10-10', '2026-11-10'),
    mision('PET-2026-0044', 7, 'Aitana Roca Vidal', '2026-10-10', '2026-11-10'),
    mision('PET-2026-0044', 8, 'Daniel Sousa Prieto', '2026-10-10', '2026-11-30', {
        incidencias: [{ tipo: 'Retraso', desde: '2026-10-21', hasta: '2026-10-21', nota: 'Llegó 40 minutos tarde. Avisó al encargado.' }],
    }),
    mision('PET-2026-0044', 9, 'Irene Campos Gil', '2026-10-10', '2026-11-30'),
    mision('PET-2026-0044', 10, 'Óscar León Mena', '2026-10-10', '2026-11-30'),
    ...['Clara Esteve Ros', 'Bruno Lage Costa', 'Nerea Olabarria Gil', 'Adrián Vela Soto', 'Paula Rius Ferrer', 'Sergio Navas Peña'].map((n, i) =>
        mision('PET-2026-0031', i + 1, n, '2026-07-01', '2026-09-30', {
            estado: 'finalizada',
            cierre: { fecha: '2026-09-30', motivo: 'Fin de la campaña o de la necesidad', bajaSS: true, finiquito: true },
            historial: [{ fecha: '2026-07-01', texto: 'Inicio de la misión' }, { fecha: '2026-09-30', texto: 'Fin de la misión: fin de la campaña' }],
        })),
];

// ==========================================
// UTILIDADES
// ==========================================
const hoyIso = () => new Date().toISOString().slice(0, 10);
const fechaES = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');
const diasEntre = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);
const diasHasta = (iso) => diasEntre(hoyIso(), iso);
const mesesEntre = (a, b) => diasEntre(a, b) / 30.44;
const DIAS_AVISO_FIN = 15;
const estadoDe = (m) => {
    // Fin decidido con fecha futura: sigue trabajando hasta ese día
    if (m.estado === 'finalizada' && m.cierre?.fecha > hoyIso()) return { id: 'fin_decidido', texto: `Termina el ${fechaES(m.cierre.fecha)}`, tono: 'neutral' };
    if (m.estado === 'finalizada') return { id: 'finalizada', texto: 'Finalizada', tono: 'neutral' };
    if (m.estado === 'it') return { id: 'it', texto: 'De baja médica', tono: 'warning' };
    if (diasHasta(m.fin) <= DIAS_AVISO_FIN) return { id: 'pronto', texto: 'Termina pronto', tono: 'warning' };
    return { id: 'mision', texto: 'En misión', tono: 'success' };
};
const diasTrabajados = (m) => Math.max(0, diasEntre(m.inicio, m.cierre?.fecha && m.cierre.fecha < hoyIso() ? m.cierre.fecha : hoyIso()) + 1);

export default function MisionView() {
    const [misiones, setMisiones] = useState(INITIAL_MISIONES);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('activas');
    const [filtroPeticion, setFiltroPeticion] = useState('');
    const [abierta, setAbierta] = useState(null);
    const [prorroga, setProrroga] = useState(null); // { fin, nota, enviar }
    const [finalizar, setFinalizar] = useState(null); // { fecha, motivo, nota, sustituto }
    const [incidencia, setIncidencia] = useState(null); // { tipo, desde, hasta, nota }
    const [toast, setToast] = useState(null);

    const showToast = (t) => { setToast(t); setTimeout(() => setToast(null), 3800); };
    const actualizar = (id, cambios, texto) => {
        setMisiones(prev => prev.map(m => {
            if (m.id !== id) return m;
            const n = { ...m, ...(typeof cambios === 'function' ? cambios(m) : cambios) };
            if (texto) n.historial = [...n.historial, { fecha: hoyIso(), texto }];
            return n;
        }));
        if (texto) showToast(texto);
    };

    const filtradas = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        return misiones
            .filter(m => {
                const e = estadoDe(m).id;
                if (filtroEstado === 'activas') return e !== 'finalizada';
                if (filtroEstado === 'todas') return true;
                return e === filtroEstado;
            })
            .filter(m => !filtroPeticion || m.petId === filtroPeticion)
            .filter(m => !q || [m.nombre, m.dni, m.petId, PETICIONES[m.petId].cliente, PETICIONES[m.petId].puesto].some(t => t.toLowerCase().includes(q)))
            .sort((a, b) => a.fin.localeCompare(b.fin) || a.nombre.localeCompare(b.nombre));
    }, [misiones, busqueda, filtroEstado, filtroPeticion]);
    const activas = misiones.filter(m => estadoDe(m).id !== 'finalizada');
    const hayFiltros = busqueda || filtroEstado !== 'activas' || filtroPeticion;
    const limpiar = () => { setBusqueda(''); setFiltroEstado('activas'); setFiltroPeticion(''); };
    const m = misiones.find(x => x.id === abierta);

    const confirmarProrroga = () => {
        const anterior = m.fin;
        actualizar(m.id, (x) => ({
            fin: prorroga.fin,
            prorrogas: [...x.prorrogas, { desde: anterior, hasta: prorroga.fin, adendaCpd: prorroga.enviar ? 'enviada' : 'pendiente', contrato: prorroga.enviar ? 'enviada' : 'pendiente', nota: prorroga.nota }],
        }), `Prórroga de ${m.nombre} hasta el ${fechaES(prorroga.fin)}${prorroga.enviar ? ': adenda del CPD y prórroga del contrato enviadas a firmar' : ''}`);
        setProrroga(null);
    };
    const confirmarFin = () => {
        actualizar(m.id, { estado: 'finalizada', fin: finalizar.fecha, cierre: { fecha: finalizar.fecha, motivo: finalizar.motivo, nota: finalizar.nota, bajaSS: false, finiquito: false } },
            `Fin de la misión de ${m.nombre} el ${fechaES(finalizar.fecha)}: ${finalizar.motivo.toLowerCase()}`);
        if (finalizar.sustituto) showToast(`La plaza ${m.plaza} de ${m.petId} queda como «Baja» en Peticiones para buscar sustituto`);
        setFinalizar(null);
    };
    const confirmarIncidencia = () => {
        const it = incidencia.tipo === 'Baja médica (IT)' && !incidencia.hasta;
        actualizar(m.id, (x) => ({ incidencias: [...x.incidencias, { ...incidencia }], ...(it ? { estado: 'it' } : {}) }),
            `${incidencia.tipo} de ${m.nombre} registrada`);
        setIncidencia(null);
    };
    const altaMedica = () => {
        actualizar(m.id, (x) => ({ estado: 'mision', incidencias: x.incidencias.map(i => (i.tipo === 'Baja médica (IT)' && !i.hasta ? { ...i, hasta: hoyIso() } : i)) }), `Alta médica de ${m.nombre}: vuelve a la misión`);
    };

    return (
        <>
            <Page>
                <PageHeader
                    title="Personal en misión"
                    count={activas.length}
                    subtitle="Personas que ya trabajan en el cliente: hasta cuándo, incidencias, prórrogas y fin de contrato."
                />

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <KpiTile label="En misión" tone="accent" value={activas.length} hint={(() => { const n = new Set(activas.map(x => x.petId)).size; return `En ${n} ${n === 1 ? 'petición' : 'peticiones'}`; })()} active={filtroEstado === 'activas'} onClick={limpiar} />
                    <KpiTile label={`Terminan en ${DIAS_AVISO_FIN} días`} tone="warning" value={misiones.filter(x => estadoDe(x).id === 'pronto').length} hint="Decidir si se prorrogan" active={filtroEstado === 'pronto'} onClick={() => setFiltroEstado('pronto')} />
                    <KpiTile label="De baja médica" tone="warning" value={misiones.filter(x => x.estado === 'it').length} hint="Incapacidad temporal en curso" active={filtroEstado === 'it'} onClick={() => setFiltroEstado('it')} />
                    <KpiTile label="Finalizadas (30 días)" value={misiones.filter(x => estadoDe(x).id === 'finalizada' && diasHasta(x.cierre?.fecha || x.fin) >= -30).length} hint="Con sus tareas de cierre" active={filtroEstado === 'finalizada'} onClick={() => setFiltroEstado('finalizada')} />
                </div>

                <Notice tone="info" icon={Users}>
                    <span className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                            Se incorporan pronto {PROXIMAS.reduce((s, p) => s + p.personas, 0)} personas: {PROXIMAS.map(p => `${p.personas} en ${p.petId} (${p.puesto.toLowerCase()}, el ${fechaES(p.inicio).slice(0, 5)})`).join(', ')}.
                            Siguen en Contratos y altas hasta su primer día.
                        </span>
                        <Button size="sm" icon={ArrowUpRight} onClick={() => { window.location.hash = '#/laboral'; }}>Contratos y altas</Button>
                    </span>
                </Notice>

                <Card className="overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-200">
                        <SearchInput className="flex-1 min-w-[200px] max-w-xs" value={busqueda} onChange={setBusqueda} placeholder="Buscar persona, DNI, petición o cliente..." />
                        <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} aria-label="Estado">
                            <option value="activas">En misión (todas)</option>
                            <option value="pronto">Terminan pronto</option>
                            <option value="it">De baja médica</option>
                            <option value="finalizada">Finalizadas</option>
                            <option value="todas">Todas</option>
                        </Select>
                        <Select value={filtroPeticion} onChange={(e) => setFiltroPeticion(e.target.value)} aria-label="Petición">
                            <option value="">Todas las peticiones</option>
                            {Object.entries(PETICIONES).map(([id, p]) => <option key={id} value={id}>{id} · {p.puesto} · {p.cliente}</option>)}
                        </Select>
                        {hayFiltros && <Button size="sm" variant="ghost" icon={X} onClick={limpiar}>Limpiar</Button>}
                    </div>

                    {filtradas.length === 0 ? (
                        <EmptyState icon={Briefcase} title="No hay nadie con estos filtros" action={hayFiltros && <Button onClick={limpiar}>Limpiar filtros</Button>} />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                                        <th className="py-2 px-3 font-medium">Persona</th>
                                        <th className="py-2 px-3 font-medium">Petición</th>
                                        <th className="py-2 px-3 font-medium">Inicio</th>
                                        <th className="py-2 px-3 font-medium">Fin previsto</th>
                                        <th className="py-2 px-3 font-medium">Días trabajados</th>
                                        <th className="py-2 px-3 font-medium">Estado</th>
                                        <th className="py-2 px-3" aria-label="Acciones"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtradas.map(x => {
                                        const pet = PETICIONES[x.petId];
                                        const est = estadoDe(x);
                                        const d = diasHasta(x.fin);
                                        return (
                                            <tr key={x.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                                <td className="py-2.5 px-3">
                                                    <button type="button" onClick={() => setAbierta(x.id)} className="inline-flex items-center gap-2 text-left hover:text-indigo-700">
                                                        <Avatar name={x.nombre} size="sm" />
                                                        <span>
                                                            <span className="block font-medium text-slate-900 whitespace-nowrap">{x.nombre}</span>
                                                            <span className="text-[11px] text-slate-500">Plaza {x.plaza} · {x.dni}</span>
                                                        </span>
                                                    </button>
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <span className="block text-slate-800 whitespace-nowrap">{pet.puesto} · {pet.turno.toLowerCase()}</span>
                                                    <span className="text-[11px] text-slate-500">{x.petId} · {pet.cliente}</span>
                                                </td>
                                                <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">{fechaES(x.inicio)}</td>
                                                <td className="py-2.5 px-3 whitespace-nowrap">
                                                    <div className="text-slate-700">{fechaES(x.fin)}</div>
                                                    {est.id !== 'finalizada' && <div className={`text-[11px] ${d <= DIAS_AVISO_FIN && est.id !== 'fin_decidido' ? 'text-amber-700' : 'text-slate-500'}`}>en {d} {d === 1 ? 'día' : 'días'}</div>}
                                                    {x.prorrogas.length > 0 && <div className="text-[11px] text-indigo-700">Prorrogada</div>}
                                                </td>
                                                <td className="py-2.5 px-3 text-slate-700">{diasTrabajados(x)}</td>
                                                <td className="py-2.5 px-3">
                                                    <Badge tone={est.tono} dot>{est.texto}</Badge>
                                                    {x.estado === 'finalizada' && x.cierre && (!x.cierre.bajaSS || !x.cierre.finiquito) && <div className="text-[11px] text-amber-700 mt-0.5">Cierre pendiente</div>}
                                                </td>
                                                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                                    <Button size="sm" variant={est.id === 'pronto' ? 'primary' : 'ghost'} onClick={() => setAbierta(x.id)}>
                                                        {est.id === 'pronto' ? 'Decidir el fin' : 'Ver'}
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </Page>

            {/* FICHA DE LA MISIÓN */}
            {m && (() => {
                const pet = PETICIONES[m.petId];
                const est = estadoDe(m);
                const d = diasHasta(m.fin);
                const itAbierta = m.incidencias.some(i => i.tipo === 'Baja médica (IT)' && !i.hasta);
                return (
                    <Drawer
                        onClose={() => setAbierta(null)}
                        width="max-w-xl"
                        leading={<Avatar name={m.nombre} size="lg" />}
                        title={m.nombre}
                        status={<Badge tone={est.tono} dot>{est.texto}</Badge>}
                        subtitle={`${pet.puesto} · ${pet.turno.toLowerCase()} · ${m.petId} · Plaza ${m.plaza}`}
                        footer={<>
                            <Button variant="ghost" icon={ArrowUpRight} className="mr-auto" onClick={() => { window.location.hash = '#/candidatos'; }}>Ficha del candidato</Button>
                            <Button icon={Clock3} onClick={() => { window.location.hash = '#/horas'; }}>Horas e incidencias</Button>
                            <Button onClick={() => setAbierta(null)}>Cerrar</Button>
                        </>}
                    >
                        <div className="space-y-5 text-xs">
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div><dt className="text-[11px] text-slate-500">Cliente y centro</dt><dd className="text-slate-900">{pet.cliente}<span className="block text-slate-500">{pet.centro}</span></dd></div>
                                <div><dt className="text-[11px] text-slate-500">Responsable de la ETT</dt><dd className="text-slate-900">{pet.responsable}</dd></div>
                                <div><dt className="text-[11px] text-slate-500">Inicio</dt><dd className="text-slate-900">{fechaES(m.inicio)} · {diasTrabajados(m)} días trabajados</dd></div>
                                <div><dt className="text-[11px] text-slate-500">{m.estado === 'finalizada' ? 'Fin' : 'Fin previsto'}</dt><dd className="text-slate-900">{fechaES(m.fin)}{m.estado !== 'finalizada' && ` · en ${d} ${d === 1 ? 'día' : 'días'}`}</dd></div>
                                <div><dt className="text-[11px] text-slate-500">Contrato</dt><dd className="text-slate-900">{m.contrato}</dd></div>
                                <div><dt className="text-[11px] text-slate-500">CPD</dt><dd className="text-slate-900">Firmado por la empresa el {fechaES(m.cpdFirmado)}</dd></div>
                            </dl>

                            {/* FIN DE CONTRATO */}
                            {m.estado !== 'finalizada' ? (
                                <div className="space-y-2">
                                    <SectionTitle>Fin de contrato</SectionTitle>
                                    {est.id === 'pronto' && (
                                        <Notice tone="warning" icon={AlertTriangle}>Termina en {d} {d === 1 ? 'día' : 'días'}. Decide con el cliente si se prorroga o se finaliza, para tener las firmas a tiempo.</Notice>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                        <Button icon={CalendarPlus} onClick={() => setProrroga({ fin: '', nota: '', enviar: true })}>Prorrogar</Button>
                                        <Button icon={CalendarX2} onClick={() => setFinalizar({ fecha: m.fin, motivo: MOTIVOS_FIN[0], nota: '', sustituto: false })}>Finalizar</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <SectionTitle>Fin de la misión</SectionTitle>
                                    <p className="text-slate-700">{fechaES(m.cierre.fecha)} · {m.cierre.motivo}{m.cierre.nota ? `. ${m.cierre.nota}` : ''}</p>
                                    <ul className="space-y-1.5">
                                        {[{ k: 'bajaSS', t: 'Baja en la Seguridad Social', p: 'Comunicar en los 3 días hábiles siguientes' }, { k: 'finiquito', t: 'Finiquito y certificado de empresa', p: 'Preparar con la última nómina' }].map(t => (
                                            <li key={t.k} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                                                <span className="flex items-center gap-2">
                                                    {m.cierre[t.k] ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Clock3 className="w-4 h-4 text-amber-600" />}
                                                    <span><span className="text-slate-900">{t.t}</span><span className="block text-[11px] text-slate-500">{m.cierre[t.k] ? 'Hecho' : t.p}</span></span>
                                                </span>
                                                {!m.cierre[t.k] && <Button size="sm" onClick={() => actualizar(m.id, (x) => ({ cierre: { ...x.cierre, [t.k]: true } }), `${t.t} de ${m.nombre}: hecho`)}>Marcar hecho</Button>}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* PRÓRROGAS */}
                            {m.prorrogas.length > 0 && (
                                <div className="space-y-2">
                                    <SectionTitle>Prórrogas</SectionTitle>
                                    {m.prorrogas.map((p, i) => {
                                        const firmada = p.adendaCpd === 'firmada' && p.contrato === 'firmada';
                                        return (
                                            <div key={i} className="rounded-lg border border-slate-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <div className="text-slate-900">Del {fechaES(p.desde)} al {fechaES(p.hasta)}</div>
                                                    <div className="text-[11px] text-slate-500">
                                                        Adenda del CPD: {p.adendaCpd === 'firmada' ? 'firmada por la empresa' : p.adendaCpd === 'enviada' ? 'enviada a la empresa' : 'sin enviar'} ·
                                                        Prórroga del contrato: {p.contrato === 'firmada' ? 'firmada por la persona' : p.contrato === 'enviada' ? 'enviada a la persona' : 'sin enviar'}
                                                    </div>
                                                </div>
                                                {!firmada && (
                                                    <Button size="sm" variant="ghost" icon={FileSignature} title="En la demo simula las dos firmas" onClick={() => actualizar(m.id, (x) => ({ prorrogas: x.prorrogas.map((q, j) => (j === i ? { ...q, adendaCpd: 'firmada', contrato: 'firmada' } : q)) }), `Prórroga de ${m.nombre} firmada por la empresa y por la persona`)}>
                                                        Marcar firmadas
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* INCIDENCIAS */}
                            <div className="space-y-2">
                                <SectionTitle actions={m.estado !== 'finalizada' && <Button size="sm" icon={Plus} onClick={() => setIncidencia({ tipo: TIPOS_INCIDENCIA[0], desde: hoyIso(), hasta: '', nota: '' })}>Añadir incidencia</Button>}>
                                    Incidencias
                                </SectionTitle>
                                {itAbierta && (
                                    <Notice tone="warning" icon={HeartPulse}>
                                        <span className="flex flex-wrap items-center justify-between gap-2">
                                            <span>De baja médica desde el {fechaES(m.incidencias.find(i => i.tipo === 'Baja médica (IT)' && !i.hasta).desde)}. Los partes de confirmación llegan por el Sistema RED.</span>
                                            <Button size="sm" onClick={altaMedica}>Registrar alta médica</Button>
                                        </span>
                                    </Notice>
                                )}
                                {m.incidencias.length === 0 ? (
                                    <p className="text-slate-500">Sin incidencias.</p>
                                ) : (
                                    <ul className="space-y-1.5">
                                        {m.incidencias.map((i, k) => (
                                            <li key={k} className="rounded-lg border border-slate-200 px-3 py-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-medium text-slate-900">{i.tipo}</span>
                                                    <span className="text-slate-500">{fechaES(i.desde)}{i.hasta && i.hasta !== i.desde ? ` a ${fechaES(i.hasta)}` : ''}{!i.hasta && ' · en curso'}</span>
                                                </div>
                                                {i.nota && <div className="text-slate-600 mt-0.5">{i.nota}</div>}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/* HISTORIAL */}
                            <div className="space-y-2">
                                <SectionTitle>Historial</SectionTitle>
                                <ol className="space-y-2">
                                    {[...m.historial].reverse().map((h, k) => (
                                        <li key={k} className="flex items-start gap-2.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                            <span><span className="text-slate-800">{h.texto}</span><span className="block text-[11px] text-slate-500">{fechaES(h.fecha)}</span></span>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        </div>
                    </Drawer>
                );
            })()}

            {/* PRORROGAR */}
            {prorroga && m && (() => {
                const total = prorroga.fin ? mesesEntre(m.inicio, prorroga.fin) : 0;
                const valida = prorroga.fin && prorroga.fin > m.fin;
                return (
                    <Modal
                        title={`Prorrogar a ${m.nombre}`}
                        subtitle={`Ahora termina el ${fechaES(m.fin)}`}
                        onClose={() => setProrroga(null)}
                        size="max-w-md"
                        footer={<>
                            <Button onClick={() => setProrroga(null)}>Cancelar</Button>
                            <Button variant="primary" icon={CalendarPlus} disabled={!valida} onClick={confirmarProrroga}>Prorrogar</Button>
                        </>}
                    >
                        <div className="space-y-4 text-xs">
                            <Field label="Nuevo fin" hint={prorroga.fin && !valida ? 'Tiene que ser posterior al fin actual.' : undefined}>
                                <TextInput type="date" min={m.fin} value={prorroga.fin} onChange={(e) => setProrroga(p => ({ ...p, fin: e.target.value }))} />
                            </Field>
                            <Field label="Nota (opcional)"><TextInput value={prorroga.nota} onChange={(e) => setProrroga(p => ({ ...p, nota: e.target.value }))} placeholder="Por ejemplo: el cliente amplía la campaña" /></Field>
                            <div className="rounded-lg border border-slate-200 p-3 space-y-1.5">
                                <div className="font-medium text-slate-900">Hace falta firmar</div>
                                <div className="text-slate-600">· Adenda al CPD: la firma la empresa.</div>
                                <div className="text-slate-600">· Prórroga del contrato: la firma la persona.</div>
                                <label className="flex items-center gap-2 pt-1 text-slate-700">
                                    <input type="checkbox" checked={prorroga.enviar} onChange={(e) => setProrroga(p => ({ ...p, enviar: e.target.checked }))} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                    Enviar las dos a firmar ahora
                                </label>
                            </div>
                            {total > MESES_MAXIMOS && (
                                <Notice tone="warning" icon={AlertTriangle}>
                                    Con esta prórroga el contrato dura {total.toFixed(1).replace('.', ',')} meses. Por circunstancias de la producción el máximo es {MESES_MAXIMOS} meses (12 si lo amplía el convenio).
                                </Notice>
                            )}
                        </div>
                    </Modal>
                );
            })()}

            {/* FINALIZAR */}
            {finalizar && m && (
                <Modal
                    title={`Finalizar la misión de ${m.nombre}`}
                    subtitle={`${m.petId} · Plaza ${m.plaza}`}
                    onClose={() => setFinalizar(null)}
                    size="max-w-md"
                    footer={<>
                        <Button onClick={() => setFinalizar(null)}>Cancelar</Button>
                        <Button variant="primary" icon={CalendarX2} disabled={!finalizar.fecha} onClick={confirmarFin}>Finalizar</Button>
                    </>}
                >
                    <div className="space-y-4 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Field label="Último día"><TextInput type="date" value={finalizar.fecha} onChange={(e) => setFinalizar(f => ({ ...f, fecha: e.target.value }))} /></Field>
                            <Field label="Motivo">
                                <Select value={finalizar.motivo} onChange={(e) => setFinalizar(f => ({ ...f, motivo: e.target.value, sustituto: e.target.value !== MOTIVOS_FIN[0] }))} className="w-full">
                                    {MOTIVOS_FIN.map(x => <option key={x} value={x}>{x}</option>)}
                                </Select>
                            </Field>
                        </div>
                        <Field label="Nota (opcional)"><TextInput value={finalizar.nota} onChange={(e) => setFinalizar(f => ({ ...f, nota: e.target.value }))} /></Field>
                        <label className="flex items-start gap-2 text-slate-700">
                            <input type="checkbox" checked={finalizar.sustituto} onChange={(e) => setFinalizar(f => ({ ...f, sustituto: e.target.checked }))} className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                            Buscar sustituto: la plaza {m.plaza} de {m.petId} queda como «Baja» en Peticiones
                        </label>
                        <Notice tone="info" icon={Info}>
                            Al finalizar se crean las tareas de cierre: baja en la Seguridad Social (en los 3 días hábiles siguientes) y finiquito con certificado de empresa.
                        </Notice>
                    </div>
                </Modal>
            )}

            {/* AÑADIR INCIDENCIA */}
            {incidencia && m && (
                <Modal
                    title="Añadir incidencia"
                    subtitle={`${m.nombre} · ${m.petId}`}
                    onClose={() => setIncidencia(null)}
                    size="max-w-md"
                    footer={<>
                        <Button onClick={() => setIncidencia(null)}>Cancelar</Button>
                        <Button variant="primary" icon={Plus} disabled={!incidencia.desde} onClick={confirmarIncidencia}>Añadir</Button>
                    </>}
                >
                    <div className="space-y-4 text-xs">
                        <Field label="Tipo">
                            <Select value={incidencia.tipo} onChange={(e) => setIncidencia(i => ({ ...i, tipo: e.target.value }))} className="w-full">
                                {TIPOS_INCIDENCIA.map(x => <option key={x} value={x}>{x}</option>)}
                            </Select>
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Desde"><TextInput type="date" value={incidencia.desde} onChange={(e) => setIncidencia(i => ({ ...i, desde: e.target.value }))} /></Field>
                            <Field label="Hasta" hint="Vacío si sigue abierta"><TextInput type="date" value={incidencia.hasta} onChange={(e) => setIncidencia(i => ({ ...i, hasta: e.target.value }))} /></Field>
                        </div>
                        <Field label="Nota"><TextInput value={incidencia.nota} onChange={(e) => setIncidencia(i => ({ ...i, nota: e.target.value }))} /></Field>
                        {incidencia.tipo === 'Baja médica (IT)' && !incidencia.hasta && <Notice tone="info" icon={HeartPulse}>La persona pasa a «De baja médica» hasta que registres el alta.</Notice>}
                        {incidencia.tipo === 'Accidente de trabajo' && <Notice tone="warning" icon={AlertTriangle}>Hay que comunicarlo en el sistema Delt@ en un plazo de 5 días hábiles y avisar al cliente.</Notice>}
                    </div>
                </Modal>
            )}

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
