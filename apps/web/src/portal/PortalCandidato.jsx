// Portal de candidatos: lo que ve la persona desde el móvil o el ordenador.
// Parte del esquema del diseñador (Contratos activos y pasados, Nóminas, Ofertas y Perfil) y añade Inicio con lo pendiente.
// Look & feel de TramitNow, con más aire y tarjetas en vez de tablas. Logo y nombre de la ETT; «Funciona con TramitNow» al pie.
import React, { useState } from 'react';
import {
    Home, FileSignature, Wallet, Search, UserRound, CheckCircle2, AlertTriangle, Download, Calendar, MapPin, Clock,
    Building2, X, ShieldCheck, Upload, Info, ArrowRight, Briefcase, GraduationCap, CreditCard, Send, ChevronRight, ArrowLeft, Pencil
} from 'lucide-react';
import { Button, Badge, Card, SectionTitle, Notice, Field, TextInput, Select, Modal, SearchInput } from '../ui';
import { contactoDemo } from '../views/personasDemo';
import { datosDeCp } from '../views/codigosPostales';

// ==========================================
// DATOS DE EJEMPLO: Unai García Zabaleta (el mismo de Candidatos y Contratos y altas)
// ==========================================
const ETT = { nombre: 'ETT Global People', siglas: 'EG', subdominio: 'ettglobal' };
const YO = contactoDemo('Unai García Zabaleta');
const PERSONA_INICIAL = {
    nombre: 'Unai', apellidos: 'García Zabaleta', dni: YO.dni, telefono: YO.telefono, email: YO.email,
    direccion: '', codigoPostal: '48940', poblacion: 'Leioa', provincia: 'Bizkaia', nss: '48/00000131/00', iban: '',
    turnos: ['tarde', 'manana'],
};
const CONTRATOS_INICIALES = [
    {
        id: 'c-0050', empresa: 'Trans-Logística Ibérica Norte, S.L.', puesto: 'Carretillero/a', turno: 'Turno de tarde (14:00 a 22:00)',
        centro: 'HUB central Basauri (Bizkaia) - Nave 2', alta: '2026-11-10', finPrevista: '2027-01-29', fin: null,
        tipo: 'Circunstancias de la producción', estado: 'pendiente', peticion: 'PET-2026-0050',
    },
    {
        id: 'c-2025', empresa: 'Trans-Logística Ibérica Norte, S.L.', puesto: 'Mozo/a de almacén', turno: 'Turno de mañana (06:00 a 14:00)',
        centro: 'HUB central Basauri (Bizkaia) - Nave 2', alta: '2025-07-01', finPrevista: '2025-09-30', fin: '2025-09-30',
        tipo: 'Circunstancias de la producción', estado: 'finalizado', peticion: 'PET-2025-0087',
    },
];
const NOMINAS = [
    { id: 'n-2025-09', mes: '2025-09', contrato: 'c-2025', neto: 1262.45 },
    { id: 'n-2025-08', mes: '2025-08', contrato: 'c-2025', neto: 1251.10 },
    { id: 'n-2025-07', mes: '2025-07', contrato: 'c-2025', neto: 1248.30 },
];
const OTROS_DOCUMENTOS = [
    { id: 'd-fin', nombre: 'Finiquito', detalle: 'Mozo/a de almacén · 30/09/2025', importe: 642.80 },
    { id: 'd-cert', nombre: 'Certificado de empresa', detalle: 'Para el paro (SEPE) · 30/09/2025' },
    { id: 'd-ret', nombre: 'Certificado de retenciones 2025', detalle: 'Para la declaración de la renta' },
];
// Ofertas: las peticiones con plazas por cubrir. No se publica el nombre del cliente, solo el sector.
const OFERTAS = [
    { id: 'PET-2026-0050', puesto: 'Carretillero/a', sector: 'Logística', poblacion: 'Basauri', provincia: 'Bizkaia', inicio: '2026-11-10', fin: '2027-01-29', turno: 'Tarde', requisitos: ['Carné de carretillero', 'DNI o NIE en vigor'] },
    { id: 'PET-2026-0049', puesto: 'Operario/a de almacén', sector: 'Logística', poblacion: 'Basauri', provincia: 'Bizkaia', inicio: '2026-11-03', fin: '2027-01-29', turno: 'Tarde', requisitos: ['DNI o NIE en vigor', 'Incorporación inmediata'] },
    { id: 'PET-2026-0046', puesto: 'Cocinero/a de partida', sector: 'Hostelería y eventos', poblacion: 'Barcelona', provincia: 'Barcelona', inicio: '2026-11-05', fin: '2026-11-30', turno: 'Jornada partida', requisitos: ['Carné de manipulador de alimentos', '2 años en banquetes'] },
    { id: 'PET-2026-0047', puesto: 'Camarero/a de barra', sector: 'Hostelería y eventos', poblacion: 'Barcelona', provincia: 'Barcelona', inicio: '2026-11-12', fin: '2026-11-30', turno: 'Noche', requisitos: ['Carné de manipulador de alimentos'] },
];
const CANDIDATURAS_INICIALES = [{ oferta: 'PET-2026-0050', estado: 'Confirmada', fecha: '2026-10-20' }];
const DOCUMENTOS_INICIALES = [
    { id: 'doc-dni', tipo: 'DNI', caduca: '2030-06-30', estado: 'Validado' },
    { id: 'doc-rgpd', tipo: 'Consentimiento de protección de datos (RGPD)', caduca: '2029-06-15', estado: 'Validado' },
    { id: 'doc-carne', tipo: 'Carné de carretillero', caduca: '2026-11-20', estado: 'Validado' },
];
const ESTADO_CANDIDATURA = {
    'En selección': { tono: 'accent', texto: 'Estamos revisando tu candidatura.' },
    'Propuesta al cliente': { tono: 'warning', texto: 'Te hemos propuesto a la empresa. Te avisaremos cuando conteste.' },
    'Confirmada': { tono: 'success', texto: 'La empresa te ha confirmado. Revisa lo que tienes pendiente para empezar.' },
};
const TURNOS = [{ id: 'manana', texto: 'Mañana' }, { id: 'tarde', texto: 'Tarde' }, { id: 'noche', texto: 'Noche' }, { id: 'partida', texto: 'Jornada partida' }, { id: 'finde', texto: 'Fines de semana' }];

// ==========================================
// UTILIDADES
// ==========================================
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const hoyIso = () => new Date().toISOString().slice(0, 10);
const fechaES = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');
const diasHasta = (iso) => Math.round((new Date(`${iso}T00:00:00`) - new Date(`${hoyIso()}T00:00:00`)) / 86400000);
const nombreMes = (mes) => `${MESES[Number(mes.slice(5)) - 1]} de ${mes.slice(0, 4)}`;
const mayus = (t) => t.replace(/^./, s => s.toUpperCase());
const euros = (n) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', useGrouping: 'always' });

const MENU = [
    { id: 'inicio', texto: 'Inicio', icono: Home },
    { id: 'contratos', texto: 'Contratos', icono: FileSignature, hijos: [{ id: 'activos', texto: 'Activos' }, { id: 'pasados', texto: 'Pasados' }] },
    { id: 'nominas', texto: 'Nóminas', icono: Wallet },
    { id: 'ofertas', texto: 'Ofertas', icono: Search },
    { id: 'perfil', texto: 'Perfil', icono: UserRound },
];

export default function PortalCandidato() {
    const [seccion, setSeccion] = useState('inicio');
    const [verContratos, setVerContratos] = useState('activos');
    const [persona, setPersona] = useState(PERSONA_INICIAL);
    const [contratos, setContratos] = useState(CONTRATOS_INICIALES);
    const [candidaturas, setCandidaturas] = useState(CANDIDATURAS_INICIALES);
    const [documentos, setDocumentos] = useState(DOCUMENTOS_INICIALES);
    const [pendientesValidar, setPendientesValidar] = useState([]); // datos cambiados que revisa la ETT
    const [firma, setFirma] = useState(null); // { contrato, paso, leido, codigo }
    const [edicion, setEdicion] = useState(null); // copia de persona mientras se edita
    const [renovar, setRenovar] = useState(null); // documento
    const [busqueda, setBusqueda] = useState('');
    const [anio, setAnio] = useState('');
    const [provincia, setProvincia] = useState('Bizkaia');
    const [toast, setToast] = useState(null);

    const aviso = (t) => { setToast(t); setTimeout(() => setToast(null), 3800); };
    const ir = (id, sub) => { setSeccion(id); if (sub) setVerContratos(sub); window.scrollTo(0, 0); };

    const porFirmar = contratos.filter(c => c.estado === 'pendiente');
    const docsCaducan = documentos.filter(d => diasHasta(d.caduca) <= 30);
    const proxima = contratos.find(c => c.alta > hoyIso() && c.estado !== 'finalizado');

    // Lo pendiente: lo que la persona tiene que hacer ahora
    const pendientes = [
        ...porFirmar.map(c => ({ id: `firma-${c.id}`, icono: FileSignature, tono: 'warning', titulo: 'Firma tu contrato', texto: `${c.puesto} · empieza el ${fechaES(c.alta)}. Sin la firma no podemos darte de alta.`, accion: 'Firmar', onClick: () => setFirma({ contrato: c, paso: 1, leido: false, codigo: '' }) })),
        ...(!persona.iban ? [{ id: 'iban', icono: CreditCard, tono: 'warning', titulo: 'Añade tu cuenta bancaria', texto: 'La necesitamos para pagarte la nómina.', accion: 'Añadir', onClick: () => { ir('perfil'); setEdicion({ ...persona }); } }] : []),
        ...docsCaducan.map(d => ({ id: `doc-${d.id}`, icono: AlertTriangle, tono: diasHasta(d.caduca) < 0 ? 'danger' : 'warning', titulo: `${d.tipo}: ${diasHasta(d.caduca) < 0 ? 'caducado' : `caduca en ${diasHasta(d.caduca)} días`}`, texto: 'Sube el nuevo para poder seguir trabajando.', accion: 'Renovar', onClick: () => setRenovar(d) })),
        { id: 'prl', icono: GraduationCap, tono: 'info', titulo: 'Formación de prevención (PRL)', texto: 'Te esperamos el 06/11 a las 09:00 en la Delegación Norte (C/ Ejemplo 1, Bilbao). Dura 2 horas; recoge allí tus EPI.', accion: null },
    ];

    const confirmarFirma = () => {
        setContratos(prev => prev.map(c => (c.id === firma.contrato.id ? { ...c, estado: 'firmado', firmado: hoyIso() } : c)));
        setFirma(null);
        aviso('Contrato firmado. Te hemos enviado una copia por email.');
    };
    const guardarPerfil = () => {
        const cambiosSensibles = [];
        if (edicion.iban !== persona.iban) cambiosSensibles.push('Cuenta bancaria');
        if (edicion.nss !== persona.nss) cambiosSensibles.push('Número de la Seguridad Social');
        setPersona(edicion);
        if (cambiosSensibles.length) setPendientesValidar(prev => [...new Set([...prev, ...cambiosSensibles])]);
        setEdicion(null);
        aviso(cambiosSensibles.length ? 'Datos guardados. La ETT revisará la cuenta bancaria antes de usarla.' : 'Datos guardados');
    };
    const meInteresa = (o) => {
        setCandidaturas(prev => [{ oferta: o.id, estado: 'En selección', fecha: hoyIso() }, ...prev]);
        aviso(`Te has inscrito en ${o.puesto}. Te llamaremos si encajas.`);
    };

    // ==========================================
    // SECCIONES
    // ==========================================
    const Inicio = () => (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-semibold text-slate-900">Hola, {persona.nombre}</h1>
                <p className="text-sm text-slate-500 mt-1">Esto es lo que tienes pendiente con {ETT.nombre}.</p>
            </div>
            {proxima && (
                <Card className="p-5 bg-indigo-50/60 border-indigo-200">
                    <div className="flex items-start gap-3">
                        <Calendar className="w-6 h-6 text-indigo-600 shrink-0" />
                        <div className="text-sm">
                            <div className="text-slate-500">Tu próxima incorporación</div>
                            <div className="text-lg font-semibold text-slate-900 mt-0.5">Empiezas el {fechaES(proxima.alta)} · en {diasHasta(proxima.alta)} días</div>
                            <div className="text-slate-700 mt-1">{proxima.puesto} · {proxima.turno}</div>
                            <div className="text-slate-500 flex items-center gap-1 mt-0.5"><MapPin className="w-4 h-4" />{proxima.centro}</div>
                        </div>
                    </div>
                </Card>
            )}
            <div className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900">Pendiente</h2>
                {pendientes.map(p => (
                    <Card key={p.id} className="p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                                <p.icono className={`w-5 h-5 mt-0.5 shrink-0 ${p.tono === 'danger' ? 'text-rose-600' : p.tono === 'warning' ? 'text-amber-600' : 'text-indigo-600'}`} />
                                <div className="text-sm"><div className="font-medium text-slate-900">{p.titulo}</div><div className="text-slate-600">{p.texto}</div></div>
                            </div>
                            {p.accion && <Button variant="primary" onClick={p.onClick}>{p.accion}</Button>}
                        </div>
                    </Card>
                ))}
            </div>
            <div className="space-y-2">
                <div className="flex items-center justify-between"><h2 className="text-base font-semibold text-slate-900">Mis candidaturas</h2><button type="button" onClick={() => ir('ofertas')} className="text-sm text-indigo-700 hover:underline">Ver ofertas</button></div>
                {candidaturas.map(c => {
                    const o = OFERTAS.find(x => x.id === c.oferta);
                    return (
                        <Card key={c.oferta} className="p-4 text-sm flex flex-wrap items-center justify-between gap-2">
                            <div><div className="font-medium text-slate-900">{o.puesto}</div><div className="text-slate-500">{o.sector} · {o.poblacion}</div></div>
                            <Badge tone={ESTADO_CANDIDATURA[c.estado].tono} dot>{c.estado}</Badge>
                        </Card>
                    );
                })}
            </div>
        </div>
    );

    const Contratos = () => {
        const lista = contratos.filter(c => (verContratos === 'activos' ? c.estado !== 'finalizado' : c.estado === 'finalizado'));
        const ESTADO = { pendiente: ['Pendiente de firmar', 'warning'], firmado: ['Firmado', 'success'], finalizado: ['Finalizado', 'neutral'] };
        return (
            <div className="space-y-5">
                <h1 className="text-2xl font-semibold text-slate-900">Contratos</h1>
                <div className="inline-flex rounded-lg bg-slate-100 p-1 text-sm">
                    {['activos', 'pasados'].map(v => (
                        <button key={v} type="button" onClick={() => setVerContratos(v)} className={`px-4 py-1.5 rounded-md ${verContratos === v ? 'bg-white shadow-xs text-slate-900 font-medium' : 'text-slate-600'}`}>{mayus(v)}</button>
                    ))}
                </div>
                {lista.length === 0 && <Card className="p-6 text-sm text-slate-500 text-center">No tienes contratos {verContratos}.</Card>}
                {lista.map(c => (
                    <Card key={c.id} className="p-5 space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                                <div className="text-lg font-semibold text-slate-900">{c.puesto}</div>
                                <div className="text-sm text-slate-600 flex items-center gap-1"><Building2 className="w-4 h-4 text-slate-400" />{c.empresa}</div>
                            </div>
                            <Badge tone={ESTADO[c.estado][1]} dot>{ESTADO[c.estado][0]}</Badge>
                        </div>
                        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                            <div><dt className="text-xs text-slate-500">Fecha de alta</dt><dd className="text-slate-900">{fechaES(c.alta)}</dd></div>
                            <div><dt className="text-xs text-slate-500">Fin previsto</dt><dd className="text-slate-900">{fechaES(c.finPrevista)}</dd></div>
                            <div><dt className="text-xs text-slate-500">Fecha de fin</dt><dd className="text-slate-900">{fechaES(c.fin)}</dd></div>
                            <div><dt className="text-xs text-slate-500">Turno</dt><dd className="text-slate-900">{c.turno.split(' (')[0]}</dd></div>
                        </dl>
                        <div className="text-xs text-slate-500">{c.tipo} · {c.centro}</div>
                        <div className="flex flex-wrap gap-2">
                            {c.estado === 'pendiente' && <Button variant="primary" icon={FileSignature} onClick={() => setFirma({ contrato: c, paso: 1, leido: false, codigo: '' })}>Firmar contrato</Button>}
                            <Button icon={Download} onClick={() => aviso('Contrato descargado (en la demo no se genera el fichero)')}>Descargar contrato</Button>
                            {c.firmado && <span className="text-sm text-emerald-700 inline-flex items-center gap-1"><CheckCircle2 className="w-4 h-4" />Firmado el {fechaES(c.firmado)}</span>}
                        </div>
                    </Card>
                ))}
            </div>
        );
    };

    const Nominas = () => {
        const lista = NOMINAS.filter(n => !anio || n.mes.startsWith(anio));
        const anios = [...new Set(NOMINAS.map(n => n.mes.slice(0, 4)))];
        return (
            <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-2xl font-semibold text-slate-900">Nóminas</h1>
                    <Select value={anio} onChange={(e) => setAnio(e.target.value)} aria-label="Año">
                        <option value="">Todos los años</option>
                        {anios.map(a => <option key={a} value={a}>{a}</option>)}
                    </Select>
                </div>
                <Notice tone="info" icon={Info}>La nómina de cada mes aparece aquí el último día del mes. Ahora mismo no tienes ningún contrato en curso.</Notice>
                <div className="space-y-2">
                    {lista.map(n => {
                        const c = contratos.find(x => x.id === n.contrato);
                        return (
                            <Card key={n.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                                <div className="text-sm">
                                    <div className="font-medium text-slate-900">{mayus(nombreMes(n.mes))}</div>
                                    <div className="text-slate-500">{c.puesto} · {c.empresa}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-slate-700">Neto {euros(n.neto)}</span>
                                    <Button size="sm" icon={Download} onClick={() => aviso(`Nómina de ${nombreMes(n.mes)} descargada (demo)`)}>Descargar</Button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
                <div className="space-y-2">
                    <h2 className="text-base font-semibold text-slate-900">Otros documentos</h2>
                    {OTROS_DOCUMENTOS.map(d => (
                        <Card key={d.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="text-sm"><div className="font-medium text-slate-900">{d.nombre}</div><div className="text-slate-500">{d.detalle}{d.importe ? ` · ${euros(d.importe)}` : ''}</div></div>
                            <Button size="sm" icon={Download} onClick={() => aviso(`${d.nombre} descargado (demo)`)}>Descargar</Button>
                        </Card>
                    ))}
                </div>
            </div>
        );
    };

    const Ofertas = () => {
        const q = busqueda.trim().toLowerCase();
        const lista = OFERTAS.filter(o => (!provincia || o.provincia === provincia) && (!q || `${o.puesto} ${o.sector} ${o.poblacion}`.toLowerCase().includes(q)));
        return (
            <div className="space-y-5">
                <h1 className="text-2xl font-semibold text-slate-900">Ofertas</h1>
                <div className="flex flex-wrap gap-2">
                    <SearchInput className="flex-1 min-w-[200px]" value={busqueda} onChange={setBusqueda} placeholder="Puesto, sector o población..." />
                    <Select value={provincia} onChange={(e) => setProvincia(e.target.value)} aria-label="Provincia">
                        <option value="">Todas las provincias</option>
                        {[...new Set(OFERTAS.map(o => o.provincia))].map(p => <option key={p} value={p}>{p}{p === persona.provincia ? ' (cerca de ti)' : ''}</option>)}
                    </Select>
                </div>
                {lista.length === 0 && <Card className="p-6 text-sm text-slate-500 text-center">No hay ofertas con estos filtros.</Card>}
                {lista.map(o => {
                    const mia = candidaturas.find(c => c.oferta === o.id);
                    return (
                        <Card key={o.id} className="p-5 space-y-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                    <div className="text-lg font-semibold text-slate-900">{o.puesto}</div>
                                    <div className="text-sm text-slate-600">{o.sector} · <MapPin className="w-4 h-4 inline -mt-0.5 text-slate-400" /> {o.poblacion} ({o.provincia})</div>
                                </div>
                                {mia && <Badge tone={ESTADO_CANDIDATURA[mia.estado].tono} dot>{mia.estado}</Badge>}
                            </div>
                            <dl className="grid grid-cols-3 gap-3 text-sm">
                                <div><dt className="text-xs text-slate-500">Empieza</dt><dd className="text-slate-900">{fechaES(o.inicio)}</dd></div>
                                <div><dt className="text-xs text-slate-500">Fin previsto</dt><dd className="text-slate-900">{fechaES(o.fin)}</dd></div>
                                <div><dt className="text-xs text-slate-500">Turno</dt><dd className="text-slate-900">{o.turno}</dd></div>
                            </dl>
                            <div className="flex flex-wrap gap-1.5">{o.requisitos.map(r => <span key={r} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{r}</span>)}</div>
                            {mia ? <p className="text-sm text-slate-600">{ESTADO_CANDIDATURA[mia.estado].texto}</p> : <Button variant="primary" onClick={() => meInteresa(o)}>Me interesa</Button>}
                        </Card>
                    );
                })}
                <p className="text-xs text-slate-500">Por confidencialidad, no mostramos el nombre de la empresa hasta que te confirmemos.</p>
            </div>
        );
    };

    const Perfil = () => {
        const d = edicion || persona;
        const campo = (k, v) => setEdicion(e => ({ ...e, [k]: v }));
        const filas = [
            ['Nombre', 'nombre'], ['Apellidos', 'apellidos'], ['NIF', 'dni', true], ['Teléfono', 'telefono'], ['Email', 'email'],
            ['Dirección', 'direccion'], ['Código postal', 'codigoPostal'], ['Población', 'poblacion'], ['Provincia', 'provincia'],
            ['Número de la Seguridad Social', 'nss'], ['Cuenta bancaria (IBAN)', 'iban'],
        ];
        return (
            <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h1 className="text-2xl font-semibold text-slate-900">Perfil</h1>
                    {!edicion && <Button icon={Pencil} onClick={() => setEdicion({ ...persona })}>Editar</Button>}
                </div>
                {pendientesValidar.length > 0 && <Notice tone="info" icon={ShieldCheck}>Pendiente de que la ETT lo revise: {pendientesValidar.join(', ').toLowerCase()}.</Notice>}
                <Card className="p-5">
                    <SectionTitle>Datos personales</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                        {filas.map(([label, k, soloLectura]) => (
                            edicion && !soloLectura ? (
                                <Field key={k} label={label} hint={k === 'codigoPostal' ? 'Rellena la provincia y la población.' : k === 'iban' ? 'La revisa la ETT antes de usarla.' : undefined}>
                                    <TextInput value={d[k] || ''} onChange={(e) => {
                                        const v = e.target.value;
                                        if (k === 'codigoPostal') { const cp = v.replace(/\D/g, '').slice(0, 5); const x = datosDeCp(cp); setEdicion(s => ({ ...s, codigoPostal: cp, ...(x.provincia ? { provincia: x.provincia } : {}), ...(x.poblacion ? { poblacion: x.poblacion } : {}) })); } else campo(k, k === 'iban' ? v.toUpperCase() : v);
                                    }} />
                                </Field>
                            ) : (
                                <div key={k} className="border-b border-slate-100 pb-2">
                                    <div className="text-xs text-slate-500">{label}</div>
                                    <div className="text-slate-900 mt-0.5">{d[k] || <span className="text-amber-700">Falta</span>}{soloLectura && edicion && <span className="text-xs text-slate-500"> · se cambia renovando el documento</span>}</div>
                                </div>
                            )
                        ))}
                    </div>
                    {edicion && (
                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
                            <Button onClick={() => setEdicion(null)}>Cancelar</Button>
                            <Button variant="primary" icon={CheckCircle2} onClick={guardarPerfil}>Guardar</Button>
                        </div>
                    )}
                </Card>
                <Card className="p-5 space-y-3">
                    <SectionTitle>Mis documentos</SectionTitle>
                    {documentos.map(doc => {
                        const dias = diasHasta(doc.caduca);
                        return (
                            <div key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm">
                                <div>
                                    <div className="font-medium text-slate-900">{doc.tipo}</div>
                                    <div className={dias <= 30 ? 'text-amber-700' : 'text-slate-500'}>Caduca el {fechaES(doc.caduca)}{dias <= 30 ? ` · en ${dias} días` : ''}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge tone={doc.estado === 'Validado' ? 'success' : 'info'} dot>{doc.estado}</Badge>
                                    <Button size="sm" icon={Upload} onClick={() => setRenovar(doc)}>Subir nuevo</Button>
                                </div>
                            </div>
                        );
                    })}
                </Card>
                <Card className="p-5 space-y-3">
                    <SectionTitle>Disponibilidad</SectionTitle>
                    <div className="flex flex-wrap gap-2">
                        {TURNOS.map(t => {
                            const activo = persona.turnos.includes(t.id);
                            return (
                                <button key={t.id} type="button" onClick={() => setPersona(p => ({ ...p, turnos: activo ? p.turnos.filter(x => x !== t.id) : [...p.turnos, t.id] }))}
                                    className={`rounded-lg border px-3 py-2 text-sm ${activo ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                    {activo && <CheckCircle2 className="w-4 h-4 inline mr-1 -mt-0.5" />}{t.texto}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-xs text-slate-500">Te ofreceremos trabajos en estos turnos.</p>
                </Card>
            </div>
        );
    };

    // Se llaman como funciones (no como componentes) para no perder el foco de los campos al escribir
    const CONTENIDO = { inicio: Inicio, contratos: Contratos, nominas: Nominas, ofertas: Ofertas, perfil: Perfil };

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            {/* Barra de la demo (no sale en real) */}
            <div className="bg-slate-900 text-slate-200 text-xs">
                <div className="max-w-5xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
                    <span>Demo · Portal de candidatos de {ETT.nombre} · en real: {ETT.subdominio}.tramitnow…</span>
                    <span className="flex items-center gap-3">
                        <span className="rounded-md bg-white/10 px-2 py-0.5">Viendo como candidato</span>
                        <span className="text-slate-400" title="Cuando estén las opciones">Empresa: próximamente</span>
                        <a href="/" className="inline-flex items-center gap-1 text-indigo-300 hover:text-white"><ArrowLeft className="w-3.5 h-3.5" />Volver al ERP</a>
                    </span>
                </div>
            </div>

            {/* Cabecera: logo de la ETT y la persona */}
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="w-11 h-11 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold">{ETT.siglas}</span>
                        <span className="text-base font-semibold text-slate-900">{ETT.nombre}</span>
                    </div>
                    <button type="button" onClick={() => ir('perfil')} className="flex items-center gap-3 text-right">
                        <span className="hidden sm:block">
                            <span className="block text-sm font-medium text-slate-900">{persona.nombre} {persona.apellidos}</span>
                            <span className="block text-xs text-slate-500">{persona.dni} · <span className="text-indigo-700">Editar perfil</span></span>
                        </span>
                        <span className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-medium">{persona.nombre[0]}{persona.apellidos[0]}</span>
                    </button>
                </div>
            </header>

            <div className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 flex gap-6 pb-24 md:pb-6">
                {/* Menú lateral (ordenador) */}
                <nav className="hidden md:block w-48 shrink-0">
                    <div className="sticky top-6 rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                        {MENU.map(m => (
                            <div key={m.id} className="border-b border-slate-100 last:border-0">
                                <button type="button" onClick={() => ir(m.id, m.hijos ? 'activos' : undefined)} className={`w-full flex items-center gap-2 px-4 py-3 text-sm ${seccion === m.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}>
                                    <m.icono className="w-4 h-4" />{m.texto}
                                    {m.id === 'inicio' && pendientes.filter(p => p.accion).length > 0 && <span className="ml-auto rounded-full bg-amber-500 text-white text-[10px] px-1.5">{pendientes.filter(p => p.accion).length}</span>}
                                </button>
                                {m.hijos && seccion === m.id && m.hijos.map(h => (
                                    <button key={h.id} type="button" onClick={() => setVerContratos(h.id)} className={`w-full text-left pl-10 pr-4 py-2 text-sm ${verContratos === h.id ? 'text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>{h.texto}</button>
                                ))}
                            </div>
                        ))}
                    </div>
                </nav>

                <main className="flex-1 min-w-0">{CONTENIDO[seccion]()}</main>
            </div>

            {/* Menú inferior (móvil) */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 grid grid-cols-5 z-40">
                {MENU.map(m => (
                    <button key={m.id} type="button" onClick={() => ir(m.id, m.hijos ? 'activos' : undefined)} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${seccion === m.id ? 'text-indigo-700' : 'text-slate-500'}`}>
                        <m.icono className="w-5 h-5" />{m.texto}
                    </button>
                ))}
            </nav>

            {/* Pie: funciona con TramitNow */}
            <footer className="hidden md:block border-t border-slate-200 bg-white">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between text-xs text-slate-500">
                    <span>© {ETT.nombre} · Aviso legal · Privacidad</span>
                    <span>Funciona con <span className="font-semibold text-slate-800">Tramit<span className="text-indigo-600">Now</span></span></span>
                </div>
            </footer>

            {/* FIRMAR CONTRATO: resumen → código por SMS → firmado */}
            {firma && (
                <Modal
                    title="Firmar contrato"
                    subtitle={`${firma.contrato.puesto} · ${firma.contrato.empresa}`}
                    onClose={() => setFirma(null)}
                    size="max-w-lg"
                    footer={firma.paso === 1 ? <>
                        <Button onClick={() => setFirma(null)}>Ahora no</Button>
                        <Button variant="primary" icon={Send} disabled={!firma.leido} onClick={() => setFirma(f => ({ ...f, paso: 2 }))}>Enviarme el código</Button>
                    </> : <>
                        <Button onClick={() => setFirma(f => ({ ...f, paso: 1 }))}>Atrás</Button>
                        <Button variant="primary" icon={FileSignature} disabled={firma.codigo.length !== 6} onClick={confirmarFirma}>Firmar</Button>
                    </>}
                >
                    {firma.paso === 1 ? (
                        <div className="space-y-4 text-sm">
                            <dl className="grid grid-cols-2 gap-3">
                                <div><dt className="text-xs text-slate-500">Empieza</dt><dd className="text-slate-900">{fechaES(firma.contrato.alta)}</dd></div>
                                <div><dt className="text-xs text-slate-500">Fin previsto</dt><dd className="text-slate-900">{fechaES(firma.contrato.finPrevista)}</dd></div>
                                <div><dt className="text-xs text-slate-500">Turno</dt><dd className="text-slate-900">{firma.contrato.turno}</dd></div>
                                <div><dt className="text-xs text-slate-500">Tipo</dt><dd className="text-slate-900">{firma.contrato.tipo}</dd></div>
                            </dl>
                            <Button icon={Download} onClick={() => aviso('Contrato abierto (demo)')}>Leer el contrato completo</Button>
                            <label className="flex items-start gap-2 text-slate-700">
                                <input type="checkbox" checked={firma.leido} onChange={(e) => setFirma(f => ({ ...f, leido: e.target.checked }))} className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                He leído el contrato y estoy de acuerdo
                            </label>
                        </div>
                    ) : (
                        <div className="space-y-3 text-sm">
                            <p className="text-slate-600">Te hemos enviado un código de 6 cifras al {persona.telefono}. Escríbelo para firmar.</p>
                            <TextInput inputMode="numeric" maxLength={6} value={firma.codigo} onChange={(e) => setFirma(f => ({ ...f, codigo: e.target.value.replace(/\D/g, '').slice(0, 6) }))} placeholder="000000" className="text-center text-lg tracking-[0.5em] font-mono" />
                            <p className="text-xs text-slate-500">En la demo vale cualquier código de 6 cifras.</p>
                        </div>
                    )}
                </Modal>
            )}

            {/* SUBIR DOCUMENTO NUEVO */}
            {renovar && (
                <Modal
                    title={`Subir ${renovar.tipo.toLowerCase().startsWith('dni') ? 'tu DNI' : renovar.tipo.toLowerCase()}`}
                    subtitle="Foto o PDF, que se lea bien"
                    onClose={() => setRenovar(null)}
                    size="max-w-md"
                    footer={<>
                        <Button onClick={() => setRenovar(null)}>Cancelar</Button>
                        <Button variant="primary" icon={Upload} onClick={() => {
                            setDocumentos(prev => prev.map(x => (x.id === renovar.id ? { ...x, estado: 'Pendiente de validar', caduca: x.id === 'doc-carne' ? '2031-11-20' : x.caduca } : x)));
                            setRenovar(null);
                            aviso('Documento enviado. La ETT lo revisará en 24 horas.');
                        }}>Enviar</Button>
                    </>}
                >
                    <div className="space-y-3 text-sm">
                        <button type="button" className="w-full rounded-xl border-2 border-dashed border-slate-300 p-6 text-center text-slate-500 hover:border-indigo-400 hover:text-indigo-700">
                            <Upload className="w-6 h-6 mx-auto mb-1" />Hacer una foto o elegir un archivo
                        </button>
                        <p className="text-xs text-slate-500">Si es el DNI, sube las dos caras. La ETT comprueba que se lee bien y que los datos coinciden.</p>
                    </div>
                </Modal>
            )}

            {toast && (
                <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-lg text-sm animate-fade-in md:max-w-md">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span className="flex-1">{toast}</span>
                    <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white" aria-label="Cerrar aviso"><X className="w-4 h-4" /></button>
                </div>
            )}
        </div>
    );
}
