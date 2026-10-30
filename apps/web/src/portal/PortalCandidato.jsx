// Portal del trabajador: lo que ve la persona desde el móvil o el ordenador. Se entra desde Acceso.jsx (trabajadores.jsx).
// Parte del esquema del diseñador (Contratos activos y pasados, Nóminas, Ofertas y Perfil) y añade Inicio con lo pendiente.
// Look & feel de TramitNow, con más aire y tarjetas en vez de tablas. Logo y nombre de la ETT; «Funciona con TramitNow» al pie.
import React, { useState } from 'react';
import {
    Home, FileSignature, Wallet, Search, UserRound, CheckCircle2, AlertTriangle, Download, Calendar, MapPin, Clock,
    Building2, X, ShieldCheck, Upload, Info, ArrowRight, Briefcase, GraduationCap, CreditCard, Send, ChevronRight, ArrowLeft, Pencil, LogOut,
    Phone, Mail, HardHat, CalendarX, ChevronDown, Receipt, Navigation
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
    { id: 'd-prl', nombre: 'Certificado de formación PRL', detalle: 'Mozo/a de almacén · 27/06/2025' },
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

// Su contacto en la ETT (la responsable de PET-2026-0050) y el primer día (el encargado es el contacto del cliente)
const CONTACTO_ETT = { nombre: 'Ane Uriarte', cargo: 'Responsable de la Delegación Norte', telefono: '+34 944 000 000', email: 'ane.uriarte@ettglobal.example', horario: 'De lunes a viernes, de 08:00 a 18:00' };
const PRIMER_DIA = {
    contrato: 'c-0050', hora: '13:45', direccion: 'C/ Ejemplo 50, Polígono industrial, 48970 Basauri (Bizkaia)',
    comoLlegar: 'Metro: parada Basauri y 10 minutos andando. Hay aparcamiento para trabajadores junto a la Nave 2.',
    preguntaPor: 'Javier Ugarte Elorza, jefe de planta',
    llevar: ['DNI', 'Carné de carretillero', 'Los EPI que te demos en la formación PRL', 'Ropa cómoda para el turno de tarde'],
};

// Prevención de riesgos del puesto: información (obligatoria), formación y recibí de los EPI
const PRL_PUESTO = {
    contrato: 'c-0050',
    formacion: { fecha: '2026-11-06', hora: '09:00', lugar: 'Delegación Norte (C/ Ejemplo 1, Bilbao)', duracion: '2 horas' },
    riesgos: [
        { riesgo: 'Atropellos y choques', medida: 'Circula por las vías marcadas, a 10 km/h como máximo dentro de la nave, y usa la bocina en los cruces.' },
        { riesgo: 'Vuelco de la carretilla', medida: 'Lleva siempre el cinturón puesto y no gires con la carga elevada.' },
        { riesgo: 'Caída de la carga', medida: 'No superes la carga máxima de la placa y lleva la carga baja al circular.' },
        { riesgo: 'Golpes y atrapamientos', medida: 'No te pongas nunca debajo de la carga y no eleves a personas con la carretilla.' },
        { riesgo: 'Ruido y sobreesfuerzos', medida: 'Usa los tapones en la zona de muelles y pide ayuda para mover a mano más de 25 kg.' },
    ],
    epi: ['Calzado de seguridad S3', 'Chaleco de alta visibilidad', 'Guantes de protección mecánica', 'Tapones auditivos'],
};

// Avisos de ausencia: llegan como incidencia a Personal en misión y a Horas e incidencias
const TIPOS_AUSENCIA = [
    { id: 'falta', texto: 'No puedo ir a trabajar' },
    { id: 'retraso', texto: 'Llegaré tarde' },
    { id: 'medico', texto: 'Cita médica' },
    { id: 'baja', texto: 'Baja médica' },
    { id: 'accidente', texto: 'Accidente de trabajo' },
];

// Datos para la retención del IRPF (modelo 145)
const SITUACIONES_145 = [
    { id: '1', texto: 'Soltero/a, viudo/a, divorciado/a o separado/a, con hijos a tu cargo en exclusiva' },
    { id: '2', texto: 'Casado/a, y tu cónyuge no tiene rentas de más de 1.500 € al año' },
    { id: '3', texto: 'Otras situaciones (la más habitual)' },
];
const IRPF_VACIO = { situacion: '3', nifConyuge: '', hijos: 0, hijosMenores3: 0, ascendientes: 0, discapacidad: 'no', vivienda: false, pensionConyuge: '' };

// Partes de horas del contrato de 2025, tal como los validó la empresa en Horas e incidencias
const INCIDENCIAS_2025 = {
    '2025-07-25': { normales: 0, incidencia: 'Festivo (Santiago Apóstol)' },
    '2025-08-15': { normales: 0, incidencia: 'Festivo (Asunción)' },
    '2025-08-21': { normales: 6, incidencia: 'Cita médica justificada (2 h)' },
    '2025-09-08': { normales: 0, incidencia: 'Ausencia justificada (asunto familiar)' },
};
const EXTRAS_2025 = { '2025-07-30': 2, '2025-07-31': 2, '2025-09-12': 1.5, '2025-09-26': 1 };
const isoMas = (iso, dias) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + dias); return d.toISOString().slice(0, 10); };
const partesDe = (inicio, fin) => {
    const semanas = [];
    const dia = new Date(`${inicio}T00:00:00Z`).getUTCDay();
    let lunes = isoMas(inicio, -((dia + 6) % 7));
    while (lunes <= fin) {
        const dias = [0, 1, 2, 3, 4].map(n => isoMas(lunes, n)).filter(f => f >= inicio && f <= fin).map(fecha => {
            const inc = INCIDENCIAS_2025[fecha];
            const extra = EXTRAS_2025[fecha] || 0;
            const normales = inc ? inc.normales : 8;
            const entrada = 6 + (8 - normales);
            const salida = entrada + normales + extra;
            const hora = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${h % 1 ? '30' : '00'}`;
            return { fecha, normales, extra, incidencia: inc?.incidencia || '', entrada: normales ? hora(entrada) : '', salida: normales ? hora(salida) : '' };
        });
        semanas.push({ lunes, dias, validadoPor: 'Javier Ugarte Elorza', validadoEl: isoMas(lunes, 7) });
        lunes = isoMas(lunes, 7);
    }
    return semanas;
};
const PARTES = partesDe('2025-07-01', '2025-09-30').map(s => ({ ...s, contrato: 'c-2025' }));

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
    { id: 'horas', texto: 'Horas', icono: Clock },
    { id: 'nominas', texto: 'Nóminas', icono: Wallet },
    { id: 'ofertas', texto: 'Ofertas', icono: Search },
    { id: 'perfil', texto: 'Perfil', icono: UserRound },
];

export default function PortalCandidato({ onSalir }) {
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
    const [mesHoras, setMesHoras] = useState('2025-09');
    const [semanaAbierta, setSemanaAbierta] = useState(null);
    const [avisos, setAvisos] = useState([]); // ausencias comunicadas desde el portal
    const [ausencia, setAusencia] = useState(null); // formulario del aviso
    const [prl, setPrl] = useState({ riesgosLeidos: null, epiFirmado: null });
    const [verPrl, setVerPrl] = useState(null); // { tipo: 'riesgos' | 'epi', ok }
    const [irpf, setIrpf] = useState(null); // datos del modelo 145 ya comunicados
    const [edicion145, setEdicion145] = useState(null);

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
        ...(!irpf ? [{ id: 'irpf', icono: Receipt, tono: 'warning', titulo: 'Rellena tus datos para la retención del IRPF', texto: 'Con tu situación familiar calculamos lo que se retiene en la nómina. Si no los rellenas, se aplica la retención general.', accion: 'Rellenar', onClick: () => { ir('perfil'); setEdicion145({ ...IRPF_VACIO }); } }] : []),
        ...(!prl.riesgosLeidos ? [{ id: 'riesgos', icono: HardHat, tono: 'warning', titulo: 'Lee los riesgos de tu puesto', texto: 'Es obligatorio antes de empezar: qué riesgos tiene el puesto de carretillero/a y cómo evitarlos.', accion: 'Leer', onClick: () => setVerPrl({ tipo: 'riesgos', ok: false }) }] : []),
        { id: 'prl', icono: GraduationCap, tono: 'info', titulo: 'Formación de prevención (PRL)', texto: `Te esperamos el ${fechaES(PRL_PUESTO.formacion.fecha)} a las ${PRL_PUESTO.formacion.hora} en la ${PRL_PUESTO.formacion.lugar}. Dura ${PRL_PUESTO.formacion.duracion}; allí te damos los EPI.`, accion: null },
        ...(!prl.epiFirmado ? [{ id: 'epi', icono: ShieldCheck, tono: 'info', titulo: 'Firma el recibí de tus EPI', texto: `Cuando te los entreguen en la formación del ${fechaES(PRL_PUESTO.formacion.fecha)}.`, accion: 'Firmar', onClick: () => setVerPrl({ tipo: 'epi', ok: false }) }] : []),
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
    const abrirAusencia = () => setAusencia({ tipo: 'falta', desde: proxima?.alta && proxima.alta > hoyIso() ? proxima.alta : hoyIso(), hasta: '', hora: '', motivo: '', adjunto: false });
    const enviarAusencia = () => {
        setAvisos(prev => [{ ...ausencia, id: `av-${prev.length + 1}`, enviado: hoyIso(), estado: 'Recibido por la ETT' }, ...prev]);
        setAusencia(null);
        aviso(`Aviso enviado a ${CONTACTO_ETT.nombre}. Si hace falta, te llamará.`);
    };
    const firmarPrl = () => {
        setPrl(p => ({ ...p, [verPrl.tipo === 'riesgos' ? 'riesgosLeidos' : 'epiFirmado']: hoyIso() }));
        aviso(verPrl.tipo === 'riesgos' ? 'Hemos registrado que has leído los riesgos del puesto.' : 'Recibí de los EPI firmado.');
        setVerPrl(null);
    };
    const guardar145 = () => {
        setIrpf({ ...edicion145, comunicado: hoyIso() });
        setEdicion145(null);
        aviso('Datos comunicados. Los aplicaremos en tu próxima nómina.');
    };

    // ==========================================
    // SECCIONES
    // ==========================================
    const tarjetaContacto = () => (
        <Card className="p-5">
            <SectionTitle>Tu contacto en {ETT.nombre}</SectionTitle>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="w-11 h-11 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-medium">AU</span>
                    <div className="text-sm">
                        <div className="font-medium text-slate-900">{CONTACTO_ETT.nombre}</div>
                        <div className="text-slate-500">{CONTACTO_ETT.cargo}</div>
                        <div className="text-xs text-slate-500">{CONTACTO_ETT.horario}</div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <a href={`tel:${CONTACTO_ETT.telefono.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><Phone className="w-4 h-4" />{CONTACTO_ETT.telefono}</a>
                    <a href={`mailto:${CONTACTO_ETT.email}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><Mail className="w-4 h-4" />Escribir</a>
                </div>
            </div>
        </Card>
    );

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
            {proxima && proxima.id === PRIMER_DIA.contrato && (
                <Card className="p-5 space-y-3">
                    <SectionTitle>Tu primer día</SectionTitle>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div><dt className="text-xs text-slate-500">Cuándo</dt><dd className="text-slate-900">{fechaES(proxima.alta)} a las {PRIMER_DIA.hora} (15 minutos antes del turno)</dd></div>
                        <div><dt className="text-xs text-slate-500">Pregunta por</dt><dd className="text-slate-900">{PRIMER_DIA.preguntaPor}</dd></div>
                        <div><dt className="text-xs text-slate-500">Dónde</dt><dd className="text-slate-900">{proxima.centro}<br /><span className="text-slate-600">{PRIMER_DIA.direccion}</span></dd></div>
                        <div><dt className="text-xs text-slate-500">Cómo llegar</dt><dd className="text-slate-900">{PRIMER_DIA.comoLlegar}</dd></div>
                    </dl>
                    <div className="text-sm">
                        <div className="text-xs text-slate-500 mb-1">Qué llevar</div>
                        <ul className="space-y-1">{PRIMER_DIA.llevar.map(l => <li key={l} className="flex items-start gap-2 text-slate-800"><CheckCircle2 className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />{l}</li>)}</ul>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button icon={Navigation} onClick={() => aviso('Se abriría el mapa con la dirección (demo)')}>Cómo llegar</Button>
                        <Button icon={CalendarX} onClick={abrirAusencia}>Avisar de una ausencia</Button>
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
            {tarjetaContacto()}
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
                        {c.id === PRL_PUESTO.contrato && (
                            <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 text-sm">
                                <div className="px-4 py-2 text-xs font-medium text-slate-500 flex items-center gap-1.5"><HardHat className="w-4 h-4" />Prevención de riesgos</div>
                                {[
                                    { texto: 'Información de los riesgos del puesto', hecho: prl.riesgosLeidos && `Leída el ${fechaES(prl.riesgosLeidos)}`, boton: prl.riesgosLeidos ? 'Ver' : 'Leer', onClick: () => setVerPrl({ tipo: 'riesgos', ok: !!prl.riesgosLeidos }) },
                                    { texto: `Formación PRL · ${fechaES(PRL_PUESTO.formacion.fecha)} a las ${PRL_PUESTO.formacion.hora}`, hecho: null, pendiente: `${PRL_PUESTO.formacion.lugar}. El certificado aparecerá aquí al terminarla.` },
                                    { texto: 'Recibí de los EPI', hecho: prl.epiFirmado && `Firmado el ${fechaES(prl.epiFirmado)}`, boton: prl.epiFirmado ? 'Ver' : 'Firmar', onClick: () => setVerPrl({ tipo: 'epi', ok: !!prl.epiFirmado }) },
                                ].map(f => (
                                    <div key={f.texto} className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <div className="text-slate-900">{f.texto}</div>
                                            <div className={`text-xs ${f.hecho ? 'text-emerald-700' : 'text-slate-500'}`}>{f.hecho || f.pendiente || 'Pendiente'}</div>
                                        </div>
                                        {f.boton && <Button size="sm" variant={f.hecho ? undefined : 'primary'} onClick={f.onClick}>{f.boton}</Button>}
                                    </div>
                                ))}
                            </div>
                        )}
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

    const Horas = () => {
        const meses = [...new Set(PARTES.flatMap(s => s.dias.map(d => d.fecha.slice(0, 7))))].reverse();
        const semanas = PARTES.filter(s => s.dias.some(d => d.fecha.startsWith(mesHoras)));
        const diasMes = semanas.flatMap(s => s.dias).filter(d => d.fecha.startsWith(mesHoras));
        const suma = (lista, k) => lista.reduce((t, d) => t + d[k], 0);
        const num = (n) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 });
        const DIAS = ['lun', 'mar', 'mié', 'jue', 'vie'];
        return (
            <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-2xl font-semibold text-slate-900">Mis horas</h1>
                    <Button variant="primary" icon={CalendarX} onClick={abrirAusencia}>Avisar de una ausencia</Button>
                </div>
                {proxima && <Notice tone="info" icon={Info}>Tu primer parte en {proxima.puesto.toLowerCase()} será el de la semana del {fechaES(proxima.alta)}. Lo verás aquí cuando la empresa lo valide.</Notice>}
                {avisos.length > 0 && (
                    <div className="space-y-2">
                        <h2 className="text-base font-semibold text-slate-900">Mis avisos</h2>
                        {avisos.map(a => (
                            <Card key={a.id} className="p-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                                <div>
                                    <div className="font-medium text-slate-900">{TIPOS_AUSENCIA.find(t => t.id === a.tipo).texto}</div>
                                    <div className="text-slate-500">{fechaES(a.desde)}{a.hasta ? ` al ${fechaES(a.hasta)}` : ''}{a.hora ? ` · llegada a las ${a.hora}` : ''}{a.adjunto ? ' · con justificante' : ''}</div>
                                </div>
                                <Badge tone="info" dot>{a.estado}</Badge>
                            </Card>
                        ))}
                    </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-base font-semibold text-slate-900">Partes validados</h2>
                    <Select value={mesHoras} onChange={(e) => { setMesHoras(e.target.value); setSemanaAbierta(null); }} aria-label="Mes">
                        {meses.map(m => <option key={m} value={m}>{mayus(nombreMes(m))}</option>)}
                    </Select>
                </div>
                <Card className="p-5">
                    <div className="text-sm text-slate-500">{mayus(nombreMes(mesHoras))} · Mozo/a de almacén</div>
                    <div className="grid grid-cols-3 gap-3 mt-2">
                        <div><div className="text-2xl font-semibold text-slate-900">{num(suma(diasMes, 'normales'))} h</div><div className="text-xs text-slate-500">Normales</div></div>
                        <div><div className="text-2xl font-semibold text-slate-900">{num(suma(diasMes, 'extra'))} h</div><div className="text-xs text-slate-500">Extra</div></div>
                        <div><div className="text-2xl font-semibold text-slate-900">{diasMes.filter(d => d.incidencia).length}</div><div className="text-xs text-slate-500">Incidencias</div></div>
                    </div>
                    <p className="text-xs text-slate-500 mt-3">Son las horas que validó la empresa y las que se pagan en la nómina de {nombreMes(mesHoras)}.</p>
                </Card>
                <div className="space-y-2">
                    {semanas.map(s => {
                        const abierta = semanaAbierta === s.lunes;
                        return (
                            <Card key={s.lunes} className="overflow-hidden">
                                <button type="button" onClick={() => setSemanaAbierta(abierta ? null : s.lunes)} className="w-full p-4 flex flex-wrap items-center justify-between gap-2 text-left text-sm hover:bg-slate-50">
                                    <div>
                                        <div className="font-medium text-slate-900">Semana del {fechaES(s.dias[0].fecha).slice(0, 5)} al {fechaES(s.dias[s.dias.length - 1].fecha).slice(0, 5)}</div>
                                        <div className="text-slate-500">{num(suma(s.dias, 'normales'))} h normales{suma(s.dias, 'extra') ? ` · ${num(suma(s.dias, 'extra'))} h extra` : ''}{s.dias.some(d => d.incidencia) ? ` · ${s.dias.filter(d => d.incidencia).length} incidencia${s.dias.filter(d => d.incidencia).length > 1 ? 's' : ''}` : ''}</div>
                                    </div>
                                    <span className="flex items-center gap-2"><Badge tone="success" dot>Validado</Badge><ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${abierta ? 'rotate-180' : ''}`} /></span>
                                </button>
                                {abierta && (
                                    <div className="border-t border-slate-100 px-4 py-3 text-sm space-y-2">
                                        {s.dias.map(d => (
                                            <div key={d.fecha} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-slate-50 pb-2 last:border-0">
                                                <span className="w-24 text-slate-700">{DIAS[(new Date(`${d.fecha}T00:00:00Z`).getUTCDay() + 6) % 7]} {fechaES(d.fecha).slice(0, 5)}</span>
                                                <span className="flex-1 text-slate-500">{d.normales ? `${d.entrada} a ${d.salida}` : '—'}{d.incidencia && <span className="block text-amber-700">{d.incidencia}</span>}</span>
                                                <span className="text-slate-900">{num(d.normales)} h{d.extra ? <span className="text-indigo-700"> + {num(d.extra)} extra</span> : ''}</span>
                                            </div>
                                        ))}
                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-500">
                                            <span className="inline-flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-emerald-600" />Validado por {s.validadoPor} el {fechaES(s.validadoEl)}</span>
                                            <button type="button" onClick={() => aviso(`Hemos avisado a ${CONTACTO_ETT.nombre}: revisará la semana del ${fechaES(s.dias[0].fecha)} y te llamará.`)} className="text-indigo-700 hover:underline">¿Algo no cuadra?</button>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
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
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                            <SectionTitle>Datos para la retención del IRPF</SectionTitle>
                            <p className="text-xs text-slate-500 -mt-2">Modelo 145. Con ellos calculamos cuánto se retiene de tu nómina.</p>
                        </div>
                        {irpf ? <Badge tone="success" dot>Comunicado el {fechaES(irpf.comunicado)}</Badge> : <Badge tone="warning" dot>Sin rellenar</Badge>}
                    </div>
                    {irpf ? (
                        <>
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div><dt className="text-xs text-slate-500">Situación familiar</dt><dd className="text-slate-900">{SITUACIONES_145.find(s => s.id === irpf.situacion).texto}</dd></div>
                                <div><dt className="text-xs text-slate-500">Hijos a tu cargo</dt><dd className="text-slate-900">{irpf.hijos ? `${irpf.hijos}${irpf.hijosMenores3 ? ` (${irpf.hijosMenores3} menor${irpf.hijosMenores3 > 1 ? 'es' : ''} de 3 años)` : ''}` : 'Ninguno'}</dd></div>
                                <div><dt className="text-xs text-slate-500">Ascendientes a tu cargo</dt><dd className="text-slate-900">{irpf.ascendientes || 'Ninguno'}</dd></div>
                                <div><dt className="text-xs text-slate-500">Discapacidad</dt><dd className="text-slate-900">{irpf.discapacidad === 'no' ? 'No' : `${irpf.discapacidad === '33' ? 'Del 33 % al 64 %' : 'Del 65 % o más'}`}</dd></div>
                            </dl>
                            <div className="flex flex-wrap gap-2">
                                <Button size="sm" icon={Pencil} onClick={() => setEdicion145({ ...irpf, declaro: false })}>Actualizar</Button>
                                <Button size="sm" icon={Download} onClick={() => aviso('Modelo 145 firmado descargado (demo)')}>Descargar el modelo firmado</Button>
                            </div>
                            <p className="text-xs text-slate-500">Si cambia tu situación (boda, un hijo, una discapacidad…), actualízalo para que la retención sea la correcta.</p>
                        </>
                    ) : (
                        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                            <p className="text-slate-600">Si no los rellenas, se aplica la retención general, que suele ser más alta.</p>
                            <Button variant="primary" onClick={() => setEdicion145({ ...IRPF_VACIO })}>Rellenar</Button>
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
    const CONTENIDO = { inicio: Inicio, contratos: Contratos, horas: Horas, nominas: Nominas, ofertas: Ofertas, perfil: Perfil };

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            {/* Barra de la demo (no sale en real) */}
            <div className="bg-slate-900 text-slate-200 text-xs">
                <div className="max-w-5xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
                    <span>Demo · Portal del trabajador de {ETT.nombre} · en real: {ETT.subdominio}.tramitnow.com/trabajadores</span>
                    <span className="flex items-center gap-3">
                        <a href="/empresas.html" className="text-slate-300 hover:text-white">Ver el Área de empresas</a>
                        <a href="/" className="inline-flex items-center gap-1 text-indigo-300 hover:text-white"><ArrowLeft className="w-3.5 h-3.5" />Volver al ERP</a>
                    </span>
                </div>
            </div>

            {/* Cabecera: logo de la ETT y la persona */}
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
                    <div className="flex items-center gap-3 mr-auto">
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
                    {onSalir && <button type="button" onClick={onSalir} title="Salir" aria-label="Salir" className="ml-1 p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"><LogOut className="w-5 h-5" /></button>}
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
            <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 grid grid-cols-6 z-40">
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

            {/* AVISAR DE UNA AUSENCIA: llega a Personal en misión y a Horas e incidencias */}
            {ausencia && (
                <Modal
                    title="Avisar de una ausencia"
                    subtitle={`Le llega a ${CONTACTO_ETT.nombre} y queda anotado en tu parte de horas`}
                    onClose={() => setAusencia(null)}
                    size="max-w-lg"
                    footer={<>
                        <Button onClick={() => setAusencia(null)}>Cancelar</Button>
                        <Button variant="primary" icon={Send} disabled={!ausencia.desde || (ausencia.tipo === 'retraso' && !ausencia.hora)} onClick={enviarAusencia}>Enviar aviso</Button>
                    </>}
                >
                    <div className="space-y-4 text-sm">
                        <Field label="Qué pasa">
                            <Select value={ausencia.tipo} onChange={(e) => setAusencia(a => ({ ...a, tipo: e.target.value }))} className="w-full">
                                {TIPOS_AUSENCIA.map(t => <option key={t.id} value={t.id}>{t.texto}</option>)}
                            </Select>
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label={['retraso', 'medico'].includes(ausencia.tipo) ? 'Día' : 'Desde'}>
                                <TextInput type="date" value={ausencia.desde} onChange={(e) => setAusencia(a => ({ ...a, desde: e.target.value }))} />
                            </Field>
                            {['retraso', 'medico'].includes(ausencia.tipo) ? (
                                <Field label={ausencia.tipo === 'retraso' ? 'Hora a la que llegarás' : 'Hora de la cita'}>
                                    <TextInput type="time" value={ausencia.hora} onChange={(e) => setAusencia(a => ({ ...a, hora: e.target.value }))} />
                                </Field>
                            ) : (
                                <Field label="Hasta" hint="Si no lo sabes, déjalo vacío.">
                                    <TextInput type="date" value={ausencia.hasta} min={ausencia.desde} onChange={(e) => setAusencia(a => ({ ...a, hasta: e.target.value }))} />
                                </Field>
                            )}
                        </div>
                        <Field label="Comentario (opcional)">
                            <TextInput value={ausencia.motivo} onChange={(e) => setAusencia(a => ({ ...a, motivo: e.target.value }))} placeholder="Cuéntanos lo que necesitemos saber" />
                        </Field>
                        {ausencia.tipo !== 'retraso' && (
                            <button type="button" onClick={() => setAusencia(a => ({ ...a, adjunto: !a.adjunto }))} className={`w-full rounded-xl border-2 border-dashed p-4 text-center ${ausencia.adjunto ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-700'}`}>
                                {ausencia.adjunto ? <><CheckCircle2 className="w-5 h-5 mx-auto mb-1" />Justificante adjuntado (pulsa para quitarlo)</> : <><Upload className="w-5 h-5 mx-auto mb-1" />Adjuntar justificante (foto o PDF)</>}
                            </button>
                        )}
                        {ausencia.tipo === 'baja' && <Notice tone="info" icon={Info}>No hace falta que nos traigas el parte de baja en papel: nos llega directamente de la Seguridad Social. Avísanos igualmente para organizar el turno.</Notice>}
                        {ausencia.tipo === 'accidente' && <Notice tone="warning" icon={AlertTriangle}>Avisa enseguida al encargado del centro y ve a la mutua de la ETT, no a tu centro de salud. Si es grave, llama al 112.</Notice>}
                        <p className="text-xs text-slate-500">Si es urgente o es para hoy, llama también a {CONTACTO_ETT.nombre}: <a href={`tel:${CONTACTO_ETT.telefono.replace(/\s/g, '')}`} className="text-indigo-700 hover:underline">{CONTACTO_ETT.telefono}</a>.</p>
                    </div>
                </Modal>
            )}

            {/* PREVENCIÓN: información de riesgos del puesto y recibí de los EPI */}
            {verPrl && (
                <Modal
                    title={verPrl.tipo === 'riesgos' ? 'Riesgos de tu puesto' : 'Recibí de los equipos de protección (EPI)'}
                    subtitle="Carretillero/a · HUB central Basauri - Nave 2"
                    onClose={() => setVerPrl(null)}
                    size="max-w-lg"
                    footer={(verPrl.tipo === 'riesgos' ? prl.riesgosLeidos : prl.epiFirmado) ? <Button onClick={() => setVerPrl(null)}>Cerrar</Button> : <>
                        <Button onClick={() => setVerPrl(null)}>Ahora no</Button>
                        <Button variant="primary" icon={CheckCircle2} disabled={!verPrl.ok} onClick={firmarPrl}>{verPrl.tipo === 'riesgos' ? 'Confirmar' : 'Firmar el recibí'}</Button>
                    </>}
                >
                    {verPrl.tipo === 'riesgos' ? (
                        <div className="space-y-3 text-sm">
                            {PRL_PUESTO.riesgos.map(r => (
                                <div key={r.riesgo} className="rounded-lg border border-slate-200 px-4 py-3">
                                    <div className="font-medium text-slate-900 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-600" />{r.riesgo}</div>
                                    <div className="text-slate-600 mt-0.5">{r.medida}</div>
                                </div>
                            ))}
                            <Button size="sm" icon={Download} onClick={() => aviso('Ficha de riesgos descargada (demo)')}>Descargar la ficha completa</Button>
                            {!prl.riesgosLeidos && (
                                <label className="flex items-start gap-2 text-slate-700">
                                    <input type="checkbox" checked={verPrl.ok} onChange={(e) => setVerPrl(v => ({ ...v, ok: e.target.checked }))} className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                    He leído y entiendo los riesgos de mi puesto y cómo evitarlos
                                </label>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3 text-sm">
                            <p className="text-slate-600">Te los entregan en la formación PRL del {fechaES(PRL_PUESTO.formacion.fecha)}. Úsalos siempre en el puesto y pide uno nuevo si se estropea.</p>
                            <ul className="space-y-1.5">{PRL_PUESTO.epi.map(e => <li key={e} className="flex items-center gap-2 text-slate-800"><ShieldCheck className="w-4 h-4 text-indigo-500" />{e}</li>)}</ul>
                            {!prl.epiFirmado && (
                                <label className="flex items-start gap-2 text-slate-700">
                                    <input type="checkbox" checked={verPrl.ok} onChange={(e) => setVerPrl(v => ({ ...v, ok: e.target.checked }))} className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                    He recibido estos equipos y sé cómo usarlos
                                </label>
                            )}
                        </div>
                    )}
                </Modal>
            )}

            {/* MODELO 145: datos para la retención del IRPF */}
            {edicion145 && (
                <Modal
                    title="Datos para la retención del IRPF"
                    subtitle="Modelo 145 · comunicación de datos al pagador"
                    onClose={() => setEdicion145(null)}
                    size="max-w-lg"
                    footer={<>
                        <Button onClick={() => setEdicion145(null)}>Cancelar</Button>
                        <Button variant="primary" icon={FileSignature} disabled={!edicion145.declaro || (edicion145.situacion === '2' && !edicion145.nifConyuge)} onClick={guardar145}>Firmar y enviar</Button>
                    </>}
                >
                    <div className="space-y-4 text-sm">
                        <div>
                            <div className="text-xs font-medium text-slate-700 mb-1.5">Situación familiar</div>
                            <div className="space-y-1.5">
                                {SITUACIONES_145.map(s => (
                                    <label key={s.id} className={`flex items-start gap-2 rounded-lg border px-3 py-2 cursor-pointer ${edicion145.situacion === s.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}>
                                        <input type="radio" name="situacion145" checked={edicion145.situacion === s.id} onChange={() => setEdicion145(x => ({ ...x, situacion: s.id }))} className="mt-0.5 text-indigo-600 focus:ring-indigo-500" />
                                        <span className="text-slate-800">{s.texto}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        {edicion145.situacion === '2' && (
                            <Field label="NIF de tu cónyuge">
                                <TextInput value={edicion145.nifConyuge} onChange={(e) => setEdicion145(x => ({ ...x, nifConyuge: e.target.value.toUpperCase() }))} />
                            </Field>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {[['hijos', 'Hijos menores de 25 a tu cargo'], ['hijosMenores3', 'De ellos, menores de 3 años'], ['ascendientes', 'Mayores de 65 a tu cargo']].map(([k, label]) => (
                                <Field key={k} label={label}>
                                    <TextInput type="number" min="0" max="10" value={edicion145[k]} onChange={(e) => setEdicion145(x => ({ ...x, [k]: Math.max(0, Number(e.target.value) || 0) }))} />
                                </Field>
                            ))}
                        </div>
                        <Field label="¿Tienes reconocida una discapacidad?">
                            <Select value={edicion145.discapacidad} onChange={(e) => setEdicion145(x => ({ ...x, discapacidad: e.target.value }))} className="w-full">
                                <option value="no">No</option>
                                <option value="33">Sí, del 33 % al 64 %</option>
                                <option value="65">Sí, del 65 % o más</option>
                            </Select>
                        </Field>
                        <label className="flex items-start gap-2 text-slate-700">
                            <input type="checkbox" checked={edicion145.vivienda} onChange={(e) => setEdicion145(x => ({ ...x, vivienda: e.target.checked }))} className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                            Pago una hipoteca de mi vivienda habitual firmada antes de 2013
                        </label>
                        <Field label="Pensión compensatoria a tu excónyuge (€ al año, opcional)">
                            <TextInput inputMode="decimal" value={edicion145.pensionConyuge} onChange={(e) => setEdicion145(x => ({ ...x, pensionConyuge: e.target.value.replace(/[^\d,]/g, '') }))} />
                        </Field>
                        <Notice tone="info" icon={Info}>En Bizkaia, Gipuzkoa, Álava y Navarra la retención sigue las normas forales: el formulario cambia un poco, pero te pedimos los mismos datos.</Notice>
                        <label className="flex items-start gap-2 text-slate-700">
                            <input type="checkbox" checked={!!edicion145.declaro} onChange={(e) => setEdicion145(x => ({ ...x, declaro: e.target.checked }))} className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                            Declaro que estos datos son ciertos
                        </label>
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
