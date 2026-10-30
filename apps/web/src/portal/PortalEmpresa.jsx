// Área de empresas: lo que ve el contacto de una empresa cliente. Se entra desde Acceso.jsx (empresas.jsx).
// Mismo aire que el portal del trabajador, pero pensada para el ordenador: menú horizontal arriba, tablas ligeras
// y el índigo de TramitNow. Cada usuario ve solo las secciones de sus permisos, que da la ETT
// desde el ERP (Empresas → Contactos). No hay «candidatos propuestos»: la selección la hace la ETT.
import React, { useState } from 'react';
import {
    Home, UserPlus, Users, Clock, Receipt, FileSignature, UserRound, LogOut, ArrowLeft, Building2, Phone, Mail, CheckCircle2,
    AlertTriangle, Info, Download, Send, X, ChevronDown, ShieldCheck, Upload, CalendarClock, MessageSquareWarning, Plus, Check, KeyRound,
} from 'lucide-react';
import { Button, Badge, Card, SectionTitle, Notice, Field, TextInput, Select, Modal, KpiTile, Interruptor } from '../ui';
import { PERMISOS_PORTAL } from './permisosEmpresa';

// ==========================================
// DATOS DE EJEMPLO (los mismos que en el ERP: Peticiones, Horas, Contratos y altas, Facturación)
// ==========================================
const ETT = { nombre: 'ETT Global People', siglas: 'EG', subdominio: 'ettglobal', autorizacion: '00/0000-ETT' };
const CLIENTES = {
    hosteleria: {
        nombre: 'Hostelería & Eventos Premium BCN, S.L.', corto: 'Premium Events BCN', cif: 'B-99887766',
        centros: ['Recinto de congresos - Barcelona'],
        puestos: ['Camarero/a de sala', 'Ayudante de cocina', 'Cocinero/a de partida', 'Camarero/a de barra'], presupuesto: 'PRE-2026-0041',
        contactoEtt: { nombre: 'Nuria Castells', iniciales: 'NC', cargo: 'Responsable de la Sucursal Barcelona', telefono: '+34 930 000 000', email: 'nuria.castells@ettglobal.example' },
    },
    translog: {
        nombre: 'Trans-Logística Ibérica Norte, S.L.', corto: 'Trans-Logística', cif: 'B-87654321',
        centros: ['HUB central Basauri (Bizkaia) - Nave 2'],
        puestos: ['Operario/a de almacén', 'Carretillero/a', 'Mozo/a de almacén'], presupuesto: 'PRE-2026-0042',
        contactoEtt: { nombre: 'Ane Uriarte', iniciales: 'AU', cargo: 'Responsable de la Delegación Norte', telefono: '+34 944 000 000', email: 'ane.uriarte@ettglobal.example' },
    },
};
// Los mismos accesos que en Empresas → Contactos
export const USUARIOS = [
    { email: 'marta.gomez@translog-norte.es', nombre: 'Marta', apellidos: 'Gómez Arana', cargo: 'Responsable de RRHH y Selección', telefono: '+34 654 987 321', cliente: 'translog', permisos: ['pedir', 'personal', 'facturas', 'documentos'] },
    { email: 'j.ugarte@translog-norte.es', nombre: 'Javier', apellidos: 'Ugarte Elorza', cargo: 'Jefe de Planta / Operaciones', telefono: '+34 611 223 344', cliente: 'translog', permisos: ['personal', 'horas', 'documentos'] },
    { email: 'spujol@premiumeventsbcn.cat', nombre: 'Sergi', apellidos: 'Pujol', cargo: 'Coordinador de Eventos', telefono: '+34 688 990 011', cliente: 'hosteleria', permisos: ['pedir', 'personal', 'facturas', 'documentos'] },
    { email: 'mferrer@premiumeventsbcn.cat', nombre: 'Montse', apellidos: 'Ferrer', cargo: 'Jefa de sala', telefono: '+34 688 990 022', cliente: 'hosteleria', permisos: ['personal', 'horas'] },
].map(u => ({ ...u, empresaCorta: CLIENTES[u.cliente].corto }));

// estado para la empresa: recibida, buscando, cubierta, en_curso, finalizada
const PETICIONES_INICIALES = [
    { id: 'PET-2026-0044', cliente: 'hosteleria', puesto: 'Camarero/a de sala', plazas: 10, cubiertas: 9, estado: 'en_curso', inicio: '2026-10-10', fin: '2026-11-30', turno: 'Jornada partida', nota: 'Buscamos sustituto para la plaza 3' },
    { id: 'PET-2026-0045', cliente: 'hosteleria', puesto: 'Ayudante de cocina', plazas: 4, cubiertas: 4, estado: 'cubierta', inicio: '2026-11-05', fin: '2026-11-30', turno: 'Jornada partida' },
    { id: 'PET-2026-0046', cliente: 'hosteleria', puesto: 'Cocinero/a de partida', plazas: 2, cubiertas: 0, estado: 'buscando', inicio: '2026-11-05', fin: '2026-11-30', turno: 'Jornada partida' },
    { id: 'PET-2026-0047', cliente: 'hosteleria', puesto: 'Camarero/a de barra', plazas: 3, cubiertas: 0, estado: 'recibida', inicio: '2026-11-12', fin: '2026-11-30', turno: 'Noche' },
    { id: 'PET-2026-0048', cliente: 'translog', puesto: 'Operario/a de almacén', plazas: 5, cubiertas: 5, estado: 'cubierta', inicio: '2026-11-03', fin: '2027-01-29', turno: 'Mañana' },
    { id: 'PET-2026-0049', cliente: 'translog', puesto: 'Operario/a de almacén', plazas: 3, cubiertas: 0, estado: 'buscando', inicio: '2026-11-03', fin: '2027-01-29', turno: 'Tarde' },
    { id: 'PET-2026-0050', cliente: 'translog', puesto: 'Carretillero/a', plazas: 4, cubiertas: 2, estado: 'buscando', inicio: '2026-11-10', fin: '2027-01-29', turno: 'Tarde' },
    { id: 'PET-2026-0031', cliente: 'translog', puesto: 'Mozo/a de almacén', plazas: 6, cubiertas: 6, estado: 'finalizada', inicio: '2026-07-01', fin: '2026-09-30', turno: 'Mañana' },
];
const ESTADO_PETICION = {
    recibida: ['Recibida', 'neutral', 'La ETT la está revisando'],
    buscando: ['Buscando personas', 'accent', 'La ETT está seleccionando'],
    cubierta: ['Cubierta', 'success', 'Todas las plazas tienen persona'],
    en_curso: ['En curso', 'success', 'Hay personas trabajando'],
    finalizada: ['Finalizada', 'neutral', ''],
};

const persona = (petId, plaza, nombre, inicio, fin) => ({ id: `${petId}-${plaza}`, petId, plaza, nombre, inicio, fin });
const PERSONAL = [
    ...['Garazi Uribe Arana', 'Pablo Ruiz Cano', null, 'Youssef Amrani', 'Lucía Ferrer Sanz', 'Marc Puig Soler', 'Aitana Roca Vidal', 'Daniel Sousa Prieto', 'Irene Campos Gil', 'Óscar León Mena']
        .map((n, i) => n && persona('PET-2026-0044', i + 1, n, '2026-10-10', [6, 7].includes(i + 1) ? '2026-11-10' : '2026-11-30')).filter(Boolean),
    ...['Noa Serra Pons', 'Hugo Martín Vera', 'Ane Goikoetxea Ruiz', 'Iván Molina Prat'].map((n, i) => persona('PET-2026-0045', i + 1, n, '2026-11-05', '2026-11-30')),
    ...['Jon Ander Etxebarria Bilbao', 'Ainhoa Larrazabal Urkijo', 'Mamadou Diallo', 'Laura Morales San Sebastián', 'Iker Agirrebeitia Mendia'].map((n, i) => persona('PET-2026-0048', i + 1, n, '2026-11-03', '2027-01-29')),
    ...['Unai García Zabaleta', 'Carlos Manuel Ortiz Reyes'].map((n, i) => persona('PET-2026-0050', i + 1, n, '2026-11-10', '2027-01-29')),
    ...['Clara Esteve Ros', 'Bruno Lage Costa', 'Nerea Olabarria Gil', 'Adrián Vela Soto', 'Paula Rius Ferrer', 'Sergio Navas Peña'].map((n, i) => persona('PET-2026-0031', i + 1, n, '2026-07-01', '2026-09-30')),
];
const BAJAS = { 'PET-2026-0044-4': '2026-10-24' };

// Partes de horas: horario de la petición y excepciones (las mismas que en Horas e incidencias)
const HORARIO = { 'PET-2026-0044': [8, 8, 8, 8, 6, 0, 0], 'PET-2026-0031': [7.5, 7.5, 7.5, 7.5, 7.5, 0, 0] };
const DIAS_ESPECIALES = { 'PET-2026-0044': { '2026-10-10': 8, '2026-10-11': 8 } };
const FESTIVOS = { '2026-10-12': 'Fiesta Nacional' };
const INC = { retraso: 'Retraso', aus_just: 'Ausencia justificada', aus_injust: 'Ausencia injustificada', baja: 'Baja médica' };
const EXCEPCIONES = {
    'PET-2026-0044-2|2026-10-13': { h: 8, x: 1, nota: 'Se quedó a recoger la sala' },
    'PET-2026-0044-8|2026-10-21': { h: 7.33, x: 0, inc: 'retraso', nota: 'Llegó 40 minutos tarde. Avisó al encargado.' },
    'PET-2026-0044-9|2026-10-22': { h: 0, x: 0, inc: 'aus_just', nota: 'Cita médica con justificante' },
    'PET-2026-0044-1|2026-10-23': { h: 6, x: 2, nota: 'Cena de clausura del congreso' },
    'PET-2026-0044-5|2026-10-23': { h: 6, x: 2, nota: 'Cena de clausura del congreso' },
    'PET-2026-0031-2|2026-09-28': { h: 7.5, x: 2, nota: 'Descarga de un camión con retraso' },
    'PET-2026-0031-1|2026-07-16': { h: 0, x: 0, inc: 'aus_just', nota: 'Examen oficial' },
    'PET-2026-0031-4|2026-08-10': { h: 0, x: 0, inc: 'aus_injust', nota: 'No avisó' },
};
// Estado de cada parte (petición|lunes). Los que no salen aquí: 0031 validados por Javier Ugarte; 0044, pendientes.
const ESTADO_PARTES_INICIAL = {
    'PET-2026-0044|2026-10-05': { estado: 'validado', validacion: { quien: 'Montse Ferrer', fecha: '2026-10-13', hora: '09:12' } },
    'PET-2026-0044|2026-10-12': { estado: 'reparos', reparos: 'El martes 13 Pablo Ruiz salió a las 17:30: no hizo la hora extra. El resto, correcto.', reparosDe: 'Montse Ferrer' },
    'PET-2026-0044|2026-10-19': { estado: 'enviado', enviado: '2026-10-26' },
};
const ESTADO_PARTE = { enviado: ['Por validar', 'warning'], reparos: ['Con reparos', 'danger'], validado: ['Validado', 'success'] };

const PRESUPUESTOS = [
    { id: 'PRE-2026-0041', cliente: 'hosteleria', titulo: 'Servicio ETT camareros/as y cocina fiestas locales', importe: 166656, aceptado: '2026-09-30', puestos: 4 },
    { id: 'PRE-2026-0042', cliente: 'translog', titulo: 'Campaña logística otoño HUB central', importe: 105792, aceptado: '2026-10-14', puestos: 2 },
    { id: 'PRE-2026-0029', cliente: 'translog', titulo: 'Campaña logística verano HUB central', importe: 48672, aceptado: '2026-06-10', puestos: 1 },
];
const FACTURAS = [
    { numero: 'F2026-0101', cliente: 'translog', concepto: 'Septiembre de 2026 · PET-2026-0031', emision: '2026-10-02', vence: '2026-12-10', total: 20305.86, cobrada: false },
    { numero: 'F2026-0094', cliente: 'translog', concepto: 'Agosto de 2026 · PET-2026-0031', emision: '2026-09-02', vence: '2026-11-10', total: 19324.31, cobrada: false },
    { numero: 'F2026-0087', cliente: 'translog', concepto: 'Julio de 2026 · PET-2026-0031', emision: '2026-08-03', vence: '2026-10-10', total: 21011.35, cobrada: true },
    { numero: 'F2026-0079', cliente: 'translog', concepto: 'Formación PRL', emision: '2026-07-15', vence: '2026-09-25', total: 617.10, cobrada: false },
];
// CPD: contrato de puesta a disposición, uno por persona (Contratos y altas)
const CPD_INICIALES = [
    ...PERSONAL.filter(p => ['PET-2026-0044', 'PET-2026-0045', 'PET-2026-0031'].includes(p.petId)).map(p => ({ personaId: p.id, firmado: p.inicio < '2026-10-01' ? '2026-06-27' : '2026-10-08' })),
    ...['PET-2026-0048-1', 'PET-2026-0048-2', 'PET-2026-0048-3', 'PET-2026-0050-1'].map(id => ({ personaId: id, firmado: '2026-10-22' })),
    ...['PET-2026-0048-4', 'PET-2026-0048-5', 'PET-2026-0050-2'].map(id => ({ personaId: id, firmado: null, enviado: '2026-10-28' })),
];
// Evaluación de riesgos de cada puesto: la empresa usuaria se la tiene que dar a la ETT antes de que empiece la persona
const RIESGOS_INICIALES = [
    { cliente: 'hosteleria', puesto: 'Camarero/a de sala', recibida: '2026-09-30' },
    { cliente: 'hosteleria', puesto: 'Ayudante de cocina', recibida: '2026-09-30' },
    { cliente: 'hosteleria', puesto: 'Cocinero/a de partida', recibida: null },
    { cliente: 'hosteleria', puesto: 'Camarero/a de barra', recibida: null },
    { cliente: 'translog', puesto: 'Operario/a de almacén', recibida: '2026-10-15' },
    { cliente: 'translog', puesto: 'Carretillero/a', recibida: null },
    { cliente: 'translog', puesto: 'Mozo/a de almacén', recibida: '2026-06-20' },
];
const DOCUMENTOS_ETT = [
    { nombre: 'Autorización administrativa de ETT', detalle: `N.º ${ETT.autorizacion}` },
    { nombre: 'Certificado de estar al corriente con la Seguridad Social', detalle: 'Emitido el 01/10/2026 · válido 6 meses' },
    { nombre: 'Certificado de estar al corriente con Hacienda', detalle: 'Emitido el 01/10/2026 · válido 12 meses' },
    { nombre: 'Garantía financiera', detalle: 'Aval bancario en vigor' },
];

// ==========================================
// UTILIDADES
// ==========================================
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const hoyIso = () => new Date().toISOString().slice(0, 10);
const fechaES = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');
const ddmm = (iso) => fechaES(iso).slice(0, 5);
const sumar = (iso, n) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const diaSemana = (iso) => (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7;
const lunesDe = (iso) => sumar(iso, -diaSemana(iso));
const diasHasta = (iso) => Math.round((new Date(`${iso}T00:00:00Z`) - new Date(`${hoyIso()}T00:00:00Z`)) / 86400000);
const nombreMes = (mes) => `${MESES[Number(mes.slice(5)) - 1]} de ${mes.slice(0, 4)}`;
const mayus = (t) => t.replace(/^./, s => s.toUpperCase());
const euros = (n) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', useGrouping: 'always' });
const num = (n) => (Math.round(n * 100) / 100).toLocaleString('es-ES', { maximumFractionDigits: 2 });
const horaAhora = () => new Date().toTimeString().slice(0, 5);

const estadoPersona = (p) => {
    const hoy = hoyIso();
    if (hoy < p.inicio) return 'empieza';
    if (hoy > p.fin) return 'terminada';
    if (BAJAS[p.id] && hoy >= BAJAS[p.id]) return 'baja';
    return 'trabajando';
};
const turnoDe = (t) => (t === 'Jornada partida' ? 'jornada partida' : `turno de ${t.toLowerCase()}`);
const ESTADO_PERSONA = { trabajando: ['Trabajando', 'success'], empieza: ['Empieza pronto', 'accent'], baja: ['De baja', 'warning'], terminada: ['Terminada', 'neutral'] };

const celda = (p, fecha) => {
    if (fecha < p.inicio || fecha > p.fin) return null;
    const e = EXCEPCIONES[`${p.id}|${fecha}`];
    if (e) return e;
    const h = DIAS_ESPECIALES[p.petId]?.[fecha] ?? HORARIO[p.petId][diaSemana(fecha)];
    if (!h) return null;
    return BAJAS[p.id] && fecha >= BAJAS[p.id] ? { h: 0, x: 0, inc: 'baja' } : { h, x: 0 };
};
// Semanas ya terminadas de cada petición con horas
const partesDe = (petId, estados) => {
    const pet = PETICIONES_INICIALES.find(x => x.id === petId);
    const personas = PERSONAL.filter(p => p.petId === petId);
    const semanas = [];
    for (let lunes = lunesDe(pet.inicio); lunes <= pet.fin && sumar(lunes, 6) < hoyIso(); lunes = sumar(lunes, 7)) {
        const dias = Array.from({ length: 7 }, (_, i) => sumar(lunes, i));
        const filas = personas.map(p => ({ persona: p, celdas: dias.map(f => celda(p, f)) })).filter(f => f.celdas.some(Boolean));
        const clave = `${petId}|${lunes}`;
        const estado = estados[clave] || (petId === 'PET-2026-0031'
            ? { estado: 'validado', validacion: { quien: 'Javier Ugarte Elorza', fecha: sumar(lunes, 8), hora: '08:40' } }
            : { estado: 'enviado', enviado: sumar(lunes, 7) });
        semanas.push({ clave, petId, pet, lunes, dias, filas, ...estado });
    }
    return semanas;
};
const totales = (filas) => filas.reduce((t, f) => {
    f.celdas.forEach(c => { if (c) { t.h += c.h; t.x += c.x; if (c.inc) t.inc += 1; } });
    return t;
}, { h: 0, x: 0, inc: 0 });

const MENU = [
    { id: 'inicio', texto: 'Inicio', icono: Home },
    { id: 'pedir', texto: 'Pedir personal', icono: UserPlus, permiso: 'pedir' },
    { id: 'personal', texto: 'Personal en misión', icono: Users, permiso: 'personal' },
    { id: 'horas', texto: 'Horas', icono: Clock, permiso: 'horas' },
    { id: 'facturas', texto: 'Presupuestos y facturas', icono: Receipt, permiso: 'facturas' },
    { id: 'documentos', texto: 'Documentos', icono: FileSignature, permiso: 'documentos' },
    { id: 'cuenta', texto: 'Mi cuenta', icono: UserRound },
];
const TURNOS = ['Mañana', 'Tarde', 'Noche', 'Jornada partida'];
const TIPOS_SOLICITUD = {
    prorroga: 'Prórroga',
    terminar: 'Terminar antes',
    incidencia: 'Incidencia',
};
const TIPOS_INCIDENCIA = ['No se ha presentado', 'Ha llegado tarde', 'Se ha ido antes', 'Accidente o lesión en el trabajo', 'Comportamiento o rendimiento', 'Otra'];

export default function PortalEmpresa({ usuario: usuarioInicial, onSalir, onCambiarUsuario }) {
    const usuario = usuarioInicial;
    const cliente = CLIENTES[usuario.cliente];
    const puede = (permiso) => !permiso || usuario.permisos.includes(permiso);
    const menu = MENU.filter(m => puede(m.permiso));

    const [seccion, setSeccion] = useState('inicio');
    const [peticiones, setPeticiones] = useState(PETICIONES_INICIALES);
    const [estadosPartes, setEstadosPartes] = useState(ESTADO_PARTES_INICIAL);
    const [cpds, setCpds] = useState(CPD_INICIALES);
    const [riesgos, setRiesgos] = useState(RIESGOS_INICIALES);
    const [solicitudes, setSolicitudes] = useState([]);
    const [pedido, setPedido] = useState(null); // formulario de «Pedir personal»
    const [accion, setAccion] = useState(null); // { tipo, persona, fecha, texto, motivo }
    const [parteAbierto, setParteAbierto] = useState(null); // clave del parte
    const [validar, setValidar] = useState(null); // { modo: 'validar' | 'reparos', ok, texto }
    const [firma, setFirma] = useState(null); // { cpds: [personaId], paso, ok, codigo }
    const [subir, setSubir] = useState(null); // evaluación de riesgos
    const [mesHoras, setMesHoras] = useState('');
    const [verTerminadas, setVerTerminadas] = useState(false);
    const [cuenta, setCuenta] = useState({ telefono: usuario.telefono, avisos: { horas: true, documentos: true, facturas: true, personal: true } });
    const [cambioClave, setCambioClave] = useState(null);
    const [toast, setToast] = useState(null);

    const aviso = (t) => { setToast(t); setTimeout(() => setToast(null), 3800); };
    const ir = (id) => { setSeccion(id); setParteAbierto(null); window.scrollTo(0, 0); };

    // Datos de esta empresa
    const misPeticiones = peticiones.filter(p => p.cliente === usuario.cliente);
    const idsMisPeticiones = misPeticiones.map(p => p.id);
    const miPersonal = PERSONAL.filter(p => idsMisPeticiones.includes(p.petId));
    const petDe = (petId) => peticiones.find(p => p.id === petId);
    const partes = Object.keys(HORARIO).filter(id => idsMisPeticiones.includes(id)).flatMap(id => partesDe(id, estadosPartes)).sort((a, b) => b.lunes.localeCompare(a.lunes));
    const partesPorValidar = partes.filter(p => p.estado === 'enviado');
    const misCpds = cpds.filter(c => miPersonal.some(p => p.id === c.personaId));
    const cpdsPendientes = misCpds.filter(c => !c.firmado);
    const misRiesgos = riesgos.filter(r => r.cliente === usuario.cliente);
    const riesgosPendientes = misRiesgos.filter(r => !r.recibida && misPeticiones.some(p => p.puesto === r.puesto && p.estado !== 'finalizada'));
    const misFacturas = FACTURAS.filter(f => f.cliente === usuario.cliente);
    const vencidas = misFacturas.filter(f => !f.cobrada && f.vence < hoyIso());
    const terminanPronto = miPersonal.filter(p => estadoPersona(p) === 'trabajando' && diasHasta(p.fin) <= 15 && !solicitudes.some(s => s.personaId === p.id));
    const personaDe = (id) => PERSONAL.find(p => p.id === id);

    // Lo pendiente, según los permisos del usuario
    const pendientes = [
        ...(puede('horas') ? partesPorValidar.map(p => ({ id: p.clave, icono: Clock, tono: 'warning', titulo: `Valida el parte de la semana del ${ddmm(p.lunes)} al ${ddmm(sumar(p.lunes, 6))}`, texto: `${p.pet.puesto} · ${p.filas.length} personas · ${num(totales(p.filas).h + totales(p.filas).x)} h`, accion: 'Revisar', onClick: () => { ir('horas'); setParteAbierto(p.clave); } })) : []),
        ...(puede('documentos') && cpdsPendientes.length ? [{ id: 'cpd', icono: FileSignature, tono: 'warning', titulo: `Firma ${cpdsPendientes.length} contrato${cpdsPendientes.length > 1 ? 's' : ''} de puesta a disposición (CPD)`, texto: 'Sin el CPD firmado, la persona no puede empezar.', accion: 'Firmar', onClick: () => ir('documentos') }] : []),
        ...(puede('documentos') ? riesgosPendientes.map(r => ({ id: `riesgo-${r.puesto}`, icono: ShieldCheck, tono: 'warning', titulo: `Envía la evaluación de riesgos del puesto de ${r.puesto.toLowerCase()}`, texto: 'La necesitamos para informar a la persona antes de que empiece.', accion: 'Enviar', onClick: () => setSubir(r) })) : []),
        ...(puede('facturas') ? vencidas.map(f => ({ id: f.numero, icono: Receipt, tono: 'danger', titulo: `Factura ${f.numero} vencida`, texto: `${euros(f.total)} · venció el ${fechaES(f.vence)}`, accion: 'Ver', onClick: () => ir('facturas') })) : []),
        ...(puede('personal') ? terminanPronto.map(p => ({ id: `fin-${p.id}`, icono: CalendarClock, tono: 'info', titulo: `${p.nombre} termina el ${fechaES(p.fin)}`, texto: `${petDe(p.petId).puesto} · ¿La necesitas más tiempo?`, accion: 'Pedir prórroga', onClick: () => setAccion({ tipo: 'prorroga', persona: p, fecha: sumar(p.fin, 30), texto: '' }) })) : []),
    ];

    // Acciones
    const enviarPedido = () => {
        const n = peticiones.filter(p => p.id.startsWith('SOL-')).length + 1;
        setPeticiones(prev => [{ id: `SOL-${String(n).padStart(3, '0')}`, cliente: usuario.cliente, puesto: pedido.puesto === 'otro' ? pedido.otroPuesto : pedido.puesto, plazas: Number(pedido.plazas), cubiertas: 0, estado: 'recibida', inicio: pedido.inicio, fin: pedido.fin, turno: pedido.turno, nota: pedido.comentario, nueva: true }, ...prev]);
        setPedido(null);
        aviso(`Petición enviada a ${cliente.contactoEtt.nombre}. Te confirmaremos en 24 horas.`);
    };
    const enviarAccion = () => {
        setSolicitudes(prev => [{ id: prev.length + 1, tipo: accion.tipo, personaId: accion.persona.id, fecha: accion.fecha, texto: accion.texto, motivo: accion.motivo, enviada: hoyIso() }, ...prev]);
        setAccion(null);
        aviso(`Enviado a ${cliente.contactoEtt.nombre}. Te responderemos lo antes posible.`);
    };
    const confirmarParte = () => {
        const p = partes.find(x => x.clave === parteAbierto);
        setEstadosPartes(prev => ({ ...prev, [p.clave]: validar.modo === 'validar'
            ? { estado: 'validado', validacion: { quien: `${usuario.nombre} ${usuario.apellidos}`, fecha: hoyIso(), hora: horaAhora() } }
            : { estado: 'reparos', reparos: validar.texto, reparosDe: `${usuario.nombre} ${usuario.apellidos}` } }));
        setValidar(null);
        aviso(validar.modo === 'validar' ? 'Parte validado. Gracias.' : `Reparos enviados a ${cliente.contactoEtt.nombre}: corregirá el parte y te lo volverá a enviar.`);
    };
    const confirmarFirma = () => {
        setCpds(prev => prev.map(c => (firma.cpds.includes(c.personaId) ? { ...c, firmado: hoyIso() } : c)));
        aviso(firma.cpds.length > 1 ? `${firma.cpds.length} CPD firmados` : 'CPD firmado');
        setFirma(null);
    };

    // ==========================================
    // PIEZAS COMUNES
    // ==========================================
    const tarjetaContacto = () => (
        <Card className="p-5">
            <SectionTitle>Tu contacto en {ETT.nombre}</SectionTitle>
            <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-medium shrink-0">{cliente.contactoEtt.iniciales}</span>
                <div className="text-sm min-w-0">
                    <div className="font-medium text-slate-900">{cliente.contactoEtt.nombre}</div>
                    <div className="text-slate-500">{cliente.contactoEtt.cargo}</div>
                </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
                <a href={`tel:${cliente.contactoEtt.telefono.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><Phone className="w-4 h-4" />{cliente.contactoEtt.telefono}</a>
                <a href={`mailto:${cliente.contactoEtt.email}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><Mail className="w-4 h-4" />Escribir</a>
            </div>
        </Card>
    );
    const progreso = (p) => (
        <div className="flex items-center gap-2 min-w-[120px]">
            <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full rounded-full ${p.cubiertas === p.plazas ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${(p.cubiertas / p.plazas) * 100}%` }} /></div>
            <span className="text-xs text-slate-600 whitespace-nowrap">{p.cubiertas} de {p.plazas}</span>
        </div>
    );

    // ==========================================
    // SECCIONES
    // ==========================================
    const Inicio = () => {
        const trabajando = miPersonal.filter(p => estadoPersona(p) === 'trabajando').length;
        const proximas = miPersonal.filter(p => estadoPersona(p) === 'empieza').sort((a, b) => a.inicio.localeCompare(b.inicio));
        const abiertas = misPeticiones.filter(p => ['recibida', 'buscando'].includes(p.estado));
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Hola, {usuario.nombre}</h1>
                    <p className="text-sm text-slate-500 mt-1">{cliente.nombre} · lo que tienes pendiente con {ETT.nombre}.</p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <KpiTile label="Trabajando hoy" tone="success" value={trabajando} hint="Personas en misión" onClick={puede('personal') ? () => ir('personal') : undefined} />
                    <KpiTile label="Empiezan pronto" tone="accent" value={proximas.length} hint={proximas[0] ? `La primera, el ${ddmm(proximas[0].inicio)}` : 'Nadie por ahora'} onClick={puede('personal') ? () => ir('personal') : undefined} />
                    <KpiTile label="Peticiones abiertas" value={abiertas.length} hint="Buscando personas" onClick={puede('pedir') ? () => ir('pedir') : undefined} />
                    <KpiTile label="Pendiente" tone={pendientes.length ? 'warning' : 'success'} value={pendientes.length} hint={pendientes.length ? 'Cosas por hacer' : 'Todo al día'} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-2">
                        <h2 className="text-base font-semibold text-slate-900">Pendiente</h2>
                        {pendientes.length === 0 && <Card className="p-5 text-sm text-slate-500 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-600" />No tienes nada pendiente.</Card>}
                        {pendientes.map(p => (
                            <Card key={p.id} className="p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <p.icono className={`w-5 h-5 mt-0.5 shrink-0 ${p.tono === 'danger' ? 'text-rose-600' : p.tono === 'warning' ? 'text-amber-600' : 'text-indigo-600'}`} />
                                        <div className="text-sm"><div className="font-medium text-slate-900">{p.titulo}</div><div className="text-slate-600">{p.texto}</div></div>
                                    </div>
                                    <Button variant="primary" size="sm" onClick={p.onClick}>{p.accion}</Button>
                                </div>
                            </Card>
                        ))}
                        {puede('personal') && proximas.length > 0 && (
                            <>
                                <h2 className="text-base font-semibold text-slate-900 pt-4">Próximas incorporaciones</h2>
                                <Card className="divide-y divide-slate-100">
                                    {proximas.slice(0, 6).map(p => (
                                        <div key={p.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                                            <div><div className="font-medium text-slate-900">{p.nombre}</div><div className="text-slate-500">{petDe(p.petId).puesto} · {turnoDe(petDe(p.petId).turno)}</div></div>
                                            <span className="text-slate-700">Empieza el {fechaES(p.inicio)}</span>
                                        </div>
                                    ))}
                                </Card>
                            </>
                        )}
                    </div>
                    <div className="space-y-4">
                        {tarjetaContacto()}
                        {usuario.permisos.length < PERMISOS_PORTAL.length && (
                            <p className="text-xs text-slate-500 px-1">Ves las secciones de tus permisos. Si necesitas otra, pídesela a {cliente.contactoEtt.nombre}.</p>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const Pedir = () => (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Pedir personal</h1>
                    <p className="text-sm text-slate-500 mt-1">Tus peticiones y cómo se van cubriendo las plazas.</p>
                </div>
                <Button variant="primary" icon={Plus} onClick={() => setPedido({ puesto: cliente.puestos[0], otroPuesto: '', plazas: 1, centro: cliente.centros[0], inicio: sumar(hoyIso(), 7), fin: sumar(hoyIso(), 37), turno: 'Mañana', comentario: '' })}>Pedir personal</Button>
            </div>
            <Card className="overflow-hidden">
                <div className="hidden md:grid grid-cols-[1.4fr_1fr_1fr_1fr_1.1fr] gap-4 px-5 py-2.5 bg-slate-50 text-xs font-medium text-slate-500 border-b border-slate-200">
                    <span>Puesto</span><span>Fechas</span><span>Turno</span><span>Plazas</span><span>Estado</span>
                </div>
                {misPeticiones.map(p => (
                    <div key={p.id} className={`grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_1fr_1.1fr] gap-x-4 gap-y-1.5 px-5 py-3.5 border-b border-slate-100 last:border-0 text-sm ${p.nueva ? 'bg-indigo-50/40' : ''}`}>
                        <div><div className="font-medium text-slate-900">{p.puesto}</div><div className="text-xs text-slate-500">{p.id.startsWith('SOL-') ? 'Pendiente de número' : p.id}</div></div>
                        <div className="text-slate-700">{ddmm(p.inicio)} – {fechaES(p.fin)}</div>
                        <div className="text-slate-700">{p.turno}</div>
                        <div>{progreso(p)}</div>
                        <div>
                            <Badge tone={ESTADO_PETICION[p.estado][1]} dot>{ESTADO_PETICION[p.estado][0]}</Badge>
                            {(p.nota || ESTADO_PETICION[p.estado][2]) && <div className="text-xs text-slate-500 mt-1">{p.nota || ESTADO_PETICION[p.estado][2]}</div>}
                        </div>
                    </div>
                ))}
            </Card>
            <p className="text-xs text-slate-500">La selección la hace {ETT.nombre}. Verás a las personas en «Personal en misión» cuando estén confirmadas.</p>
        </div>
    );

    const Personal = () => {
        const lista = miPersonal.filter(p => verTerminadas || estadoPersona(p) !== 'terminada');
        const porPeticion = misPeticiones.filter(pet => lista.some(p => p.petId === pet.id));
        const cuantos = (e) => miPersonal.filter(p => estadoPersona(p) === e).length;
        return (
            <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Personal en misión</h1>
                        <p className="text-sm text-slate-500 mt-1">Quién trabaja en {cliente.corto}, en qué turno y hasta cuándo.</p>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-600"><Interruptor checked={verTerminadas} onChange={setVerTerminadas} label="Ver también las misiones terminadas" />Ver también las terminadas</label>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <KpiTile label="Trabajando" tone="success" value={cuantos('trabajando')} />
                    <KpiTile label="Empiezan pronto" tone="accent" value={cuantos('empieza')} />
                    <KpiTile label="De baja" tone="warning" value={cuantos('baja')} />
                    <KpiTile label="Terminan en 15 días" tone="info" value={miPersonal.filter(p => estadoPersona(p) === 'trabajando' && diasHasta(p.fin) <= 15).length} />
                </div>
                {solicitudes.length > 0 && (
                    <Card className="p-4 space-y-2">
                        <SectionTitle>Lo que has pedido a la ETT</SectionTitle>
                        {solicitudes.map(s => (
                            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 text-sm border-b border-slate-100 last:border-0 pb-2 last:pb-0">
                                <span><span className="font-medium text-slate-900">{TIPOS_SOLICITUD[s.tipo]}</span> · {personaDe(s.personaId).nombre}{s.tipo === 'prorroga' ? ` hasta el ${fechaES(s.fecha)}` : s.tipo === 'terminar' ? ` el ${fechaES(s.fecha)}` : ` · ${s.motivo}`}</span>
                                <Badge tone="info" dot>Enviada el {fechaES(s.enviada)}</Badge>
                            </div>
                        ))}
                    </Card>
                )}
                {porPeticion.length === 0 && <Card className="p-6 text-sm text-slate-500 text-center">No hay nadie en misión ahora mismo.</Card>}
                {porPeticion.map(pet => (
                    <Card key={pet.id} className="overflow-hidden">
                        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-sm">
                            <span><span className="font-semibold text-slate-900">{pet.puesto}</span> <span className="text-slate-500">· {pet.id} · {turnoDe(pet.turno)} · {cliente.centros[0]}</span></span>
                            <span className="text-xs text-slate-500">{fechaES(pet.inicio)} – {fechaES(pet.fin)}</span>
                        </div>
                        {lista.filter(p => p.petId === pet.id).map(p => {
                            const e = estadoPersona(p);
                            return (
                                <div key={p.id} className="px-5 py-3 border-b border-slate-100 last:border-0 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                                    <div className="flex items-center gap-3 min-w-[220px] flex-1">
                                        <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-medium shrink-0">{p.nombre.split(' ').slice(0, 2).map(x => x[0]).join('')}</span>
                                        <span className="font-medium text-slate-900">{p.nombre}</span>
                                    </div>
                                    <span className="text-slate-600 w-44">{e === 'empieza' ? `Empieza el ${fechaES(p.inicio)}` : `Hasta el ${fechaES(p.fin)}`}{e === 'trabajando' && diasHasta(p.fin) <= 15 && <span className="text-amber-700"> · en {diasHasta(p.fin)} días</span>}</span>
                                    <span className="w-32"><Badge tone={ESTADO_PERSONA[e][1]} dot>{ESTADO_PERSONA[e][0]}</Badge>{e === 'baja' && <span className="block text-xs text-slate-500 mt-0.5">Desde el {ddmm(BAJAS[p.id])}</span>}</span>
                                    {e !== 'terminada' && (
                                        <span className="flex flex-wrap gap-1.5">
                                            <Button size="sm" onClick={() => setAccion({ tipo: 'prorroga', persona: p, fecha: sumar(p.fin, 30), texto: '' })}>Prórroga</Button>
                                            <Button size="sm" onClick={() => setAccion({ tipo: 'terminar', persona: p, fecha: sumar(hoyIso(), 7), texto: '' })}>Terminar antes</Button>
                                            {e !== 'empieza' && <Button size="sm" icon={MessageSquareWarning} onClick={() => setAccion({ tipo: 'incidencia', persona: p, fecha: hoyIso(), motivo: TIPOS_INCIDENCIA[0], texto: '' })}>Incidencia</Button>}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </Card>
                ))}
                <p className="text-xs text-slate-500">Por protección de datos, aquí solo salen el nombre y las fechas de cada persona. Para cualquier otra cosa, habla con {cliente.contactoEtt.nombre}.</p>
            </div>
        );
    };

    const Horas = () => {
        const meses = [...new Set(partes.map(p => p.lunes.slice(0, 7)))];
        const lista = partes.filter(p => !mesHoras || p.lunes.startsWith(mesHoras));
        const proximas = misPeticiones.filter(p => p.cubiertas > 0 && p.inicio > hoyIso());
        return (
            <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Horas</h1>
                        <p className="text-sm text-slate-500 mt-1">La ETT te envía el parte de cada semana. Revísalo y valídalo, o pon reparos si algo no cuadra.</p>
                    </div>
                    <Select value={mesHoras} onChange={(e) => { setMesHoras(e.target.value); setParteAbierto(null); }} aria-label="Mes">
                        <option value="">Todos los meses</option>
                        {meses.map(m => <option key={m} value={m}>{mayus(nombreMes(m))}</option>)}
                    </Select>
                </div>
                {partesPorValidar.length > 0 && <Notice tone="warning" icon={AlertTriangle}>Tienes {partesPorValidar.length} parte{partesPorValidar.length > 1 ? 's' : ''} por validar. Con las horas validadas se hacen las nóminas y la factura del mes.</Notice>}
                {proximas.map(p => <Notice key={p.id} tone="info" icon={Info}>El primer parte de {p.puesto.toLowerCase()} ({p.id}) será el de la semana del {fechaES(lunesDe(p.inicio))}.</Notice>)}
                {lista.length === 0 && <Card className="p-6 text-sm text-slate-500 text-center">Todavía no hay partes.</Card>}
                <div className="space-y-2">
                    {lista.map(p => {
                        const abierto = parteAbierto === p.clave;
                        const t = totales(p.filas);
                        return (
                            <Card key={p.clave} className="overflow-hidden">
                                <button type="button" onClick={() => setParteAbierto(abierto ? null : p.clave)} className="w-full px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-left text-sm hover:bg-slate-50">
                                    <div>
                                        <div className="font-medium text-slate-900">Semana del {ddmm(p.lunes)} al {fechaES(sumar(p.lunes, 6))}</div>
                                        <div className="text-slate-500">{p.pet.puesto} · {p.filas.length} personas · {num(t.h)} h{t.x ? ` + ${num(t.x)} h extra` : ''}{t.inc ? ` · ${t.inc} incidencia${t.inc > 1 ? 's' : ''}` : ''}</div>
                                    </div>
                                    <span className="flex items-center gap-2"><Badge tone={ESTADO_PARTE[p.estado][1]} dot>{ESTADO_PARTE[p.estado][0]}</Badge><ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`} /></span>
                                </button>
                                {abierto && (
                                    <div className="border-t border-slate-100 p-4 space-y-3">
                                        {p.estado === 'reparos' && <Notice tone="danger" icon={MessageSquareWarning}><strong>Reparos de {p.reparosDe}:</strong> {p.reparos} La ETT está corrigiendo el parte y te lo volverá a enviar.</Notice>}
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm min-w-[640px]">
                                                <thead>
                                                    <tr className="text-xs text-slate-500">
                                                        <th className="text-left font-medium py-1.5 pr-2">Persona</th>
                                                        {p.dias.map((d, i) => <th key={d} className={`font-medium py-1.5 px-1 text-center ${FESTIVOS[d] ? 'text-rose-600' : ''}`} title={FESTIVOS[d]}>{DIAS[i]} {d.slice(8)}</th>)}
                                                        <th className="font-medium py-1.5 pl-2 text-right">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {p.filas.map(f => {
                                                        const tf = totales([f]);
                                                        return (
                                                            <tr key={f.persona.id} className="border-t border-slate-100">
                                                                <td className="py-2 pr-2 text-slate-900 whitespace-nowrap">{f.persona.nombre}</td>
                                                                {f.celdas.map((c, i) => (
                                                                    <td key={i} className="py-2 px-1 text-center" title={c?.nota || (c?.inc ? INC[c.inc] : '')}>
                                                                        {!c ? <span className="text-slate-300">·</span> : c.inc ? <span className={`inline-block rounded px-1 text-[11px] ${c.inc === 'aus_injust' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{c.h ? num(c.h) : INC[c.inc].split(' ')[0]}</span> : <span className="text-slate-800">{num(c.h)}{c.x ? <span className="text-indigo-700">+{num(c.x)}</span> : ''}</span>}
                                                                    </td>
                                                                ))}
                                                                <td className="py-2 pl-2 text-right font-medium text-slate-900">{num(tf.h + tf.x)}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                        {p.filas.some(f => f.celdas.some(c => c?.nota || c?.inc)) && (
                                            <ul className="text-xs text-slate-600 space-y-0.5">
                                                {p.filas.flatMap(f => f.celdas.map((c, i) => (c?.nota || c?.inc) && <li key={`${f.persona.id}-${i}`}><span className="text-slate-900">{f.persona.nombre}, {DIAS[i]} {ddmm(p.dias[i])}:</span> {c.inc ? `${INC[c.inc]}. ` : ''}{c.nota || ''}{c.x ? ` (${num(c.x)} h extra)` : ''}</li>))}
                                            </ul>
                                        )}
                                        <div className="text-xs text-slate-500">Las horas extra salen en índigo. {p.dias.some(d => FESTIVOS[d]) && `El ${ddmm(p.dias.find(d => FESTIVOS[d]))} es festivo (${FESTIVOS[p.dias.find(d => FESTIVOS[d])]}): se factura como hora festiva.`}</div>
                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                                            {p.estado === 'validado'
                                                ? <span className="text-sm text-emerald-700 inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" />Validado por {p.validacion.quien} el {fechaES(p.validacion.fecha)} a las {p.validacion.hora}</span>
                                                : <span className="text-xs text-slate-500">{p.estado === 'enviado' ? `Enviado por la ETT el ${fechaES(p.enviado)}` : 'Esperando la corrección de la ETT'}</span>}
                                            <span className="flex flex-wrap gap-2">
                                                <Button size="sm" icon={Download} onClick={() => aviso('Parte descargado en PDF (demo)')}>Descargar</Button>
                                                {p.estado === 'enviado' && puede('horas') && <>
                                                    <Button size="sm" icon={MessageSquareWarning} onClick={() => setValidar({ modo: 'reparos', texto: '' })}>Poner reparos</Button>
                                                    <Button size="sm" variant="primary" icon={Check} onClick={() => setValidar({ modo: 'validar', ok: false })}>Validar</Button>
                                                </>}
                                            </span>
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

    const Facturas = () => {
        const pendiente = misFacturas.filter(f => !f.cobrada).reduce((t, f) => t + f.total, 0);
        return (
            <div className="space-y-5">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Presupuestos y facturas</h1>
                    <p className="text-sm text-slate-500 mt-1">{cliente.nombre} · CIF {cliente.cif}</p>
                </div>
                <div className="space-y-2">
                    <h2 className="text-base font-semibold text-slate-900">Presupuestos aceptados</h2>
                    {PRESUPUESTOS.filter(p => p.cliente === usuario.cliente).map(p => (
                        <Card key={p.id} className="p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                            <div><div className="font-medium text-slate-900">{p.titulo}</div><div className="text-slate-500">{p.id} · {p.puestos} puesto{p.puestos > 1 ? 's' : ''} · aceptado el {fechaES(p.aceptado)}</div></div>
                            <div className="flex items-center gap-3"><span className="text-slate-700">{euros(p.importe)}</span><Button size="sm" icon={Download} onClick={() => aviso(`${p.id} descargado (demo)`)}>Descargar</Button></div>
                        </Card>
                    ))}
                    <p className="text-xs text-slate-500">Las tarifas por hora de cada puesto son las de estos presupuestos. Si necesitas otro puesto, pídelo en «Pedir personal» y te enviaremos un presupuesto.</p>
                </div>
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-base font-semibold text-slate-900">Facturas</h2>
                        {pendiente > 0 && <span className="text-sm text-slate-600">Pendiente de pago: <strong className="text-slate-900">{euros(pendiente)}</strong></span>}
                    </div>
                    {vencidas.length > 0 && <Notice tone="danger" icon={AlertTriangle}>Tienes {vencidas.length} factura{vencidas.length > 1 ? 's' : ''} vencida{vencidas.length > 1 ? 's' : ''}. Si ya la has pagado, no hagas caso: puede tardar unos días en constar.</Notice>}
                    {misFacturas.length === 0 && (
                        <Card className="p-5 text-sm text-slate-600 flex items-start gap-2"><Info className="w-5 h-5 text-indigo-600 shrink-0" />Aún no tienes facturas. La de octubre se hará cuando estén validados todos los partes de horas del mes.</Card>
                    )}
                    {misFacturas.length > 0 && (
                        <Card className="overflow-hidden">
                            {misFacturas.map(f => {
                                const vencida = !f.cobrada && f.vence < hoyIso();
                                return (
                                    <div key={f.numero} className="px-5 py-3.5 border-b border-slate-100 last:border-0 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                                        <div className="flex-1 min-w-[200px]"><div className="font-medium text-slate-900">{f.numero}</div><div className="text-slate-500">{f.concepto}</div></div>
                                        <span className="text-slate-600 w-36">Emitida el {ddmm(f.emision)}<span className="block text-xs">{f.cobrada ? 'Pagada' : `Vence el ${fechaES(f.vence)}`}</span></span>
                                        <span className="w-28 text-right font-medium text-slate-900">{euros(f.total)}</span>
                                        <span className="w-24"><Badge tone={f.cobrada ? 'success' : vencida ? 'danger' : 'warning'} dot>{f.cobrada ? 'Pagada' : vencida ? 'Vencida' : 'Por pagar'}</Badge></span>
                                        <Button size="sm" icon={Download} onClick={() => aviso(`Factura ${f.numero} descargada (demo)`)}>PDF</Button>
                                    </div>
                                );
                            })}
                        </Card>
                    )}
                </div>
            </div>
        );
    };

    const Documentos = () => (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-slate-900">Documentos</h1>
                <p className="text-sm text-slate-500 mt-1">Lo que hay que firmar o enviar para cada misión, y los documentos de {ETT.nombre}.</p>
            </div>
            <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-base font-semibold text-slate-900">Contratos de puesta a disposición (CPD)</h2>
                    {cpdsPendientes.length > 1 && <Button variant="primary" size="sm" icon={FileSignature} onClick={() => setFirma({ cpds: cpdsPendientes.map(c => c.personaId), paso: 1, ok: false, codigo: '' })}>Firmar los {cpdsPendientes.length}</Button>}
                </div>
                <p className="text-xs text-slate-500">Es el contrato entre {cliente.corto} y la ETT para cada persona. Hay que firmarlo antes de que empiece.</p>
                <Card className="overflow-hidden">
                    {[...misCpds].sort((a, b) => (a.firmado ? 1 : 0) - (b.firmado ? 1 : 0)).filter(c => !c.firmado || estadoPersona(personaDe(c.personaId)) !== 'terminada').map(c => {
                        const p = personaDe(c.personaId);
                        return (
                            <div key={c.personaId} className="px-5 py-3 border-b border-slate-100 last:border-0 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                                <div className="flex-1 min-w-[200px]"><div className="font-medium text-slate-900">{p.nombre}</div><div className="text-slate-500">{petDe(p.petId).puesto} · {p.petId} · empieza el {ddmm(p.inicio)}</div></div>
                                {c.firmado
                                    ? <><Badge tone="success" dot>Firmado el {fechaES(c.firmado)}</Badge><Button size="sm" icon={Download} onClick={() => aviso('CPD descargado (demo)')}>PDF</Button></>
                                    : <><Badge tone="warning" dot>Por firmar</Badge><Button size="sm" variant="primary" icon={FileSignature} onClick={() => setFirma({ cpds: [c.personaId], paso: 1, ok: false, codigo: '' })}>Firmar</Button></>}
                            </div>
                        );
                    })}
                </Card>
            </div>
            <div className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900">Evaluación de riesgos de cada puesto</h2>
                <p className="text-xs text-slate-500">Como empresa usuaria, tienes que darnos los riesgos de cada puesto antes de que empiece la persona (RD 216/1999). Con ella informamos y formamos a cada trabajador.</p>
                <Card className="overflow-hidden">
                    {misRiesgos.map(r => (
                        <div key={r.puesto} className="px-5 py-3 border-b border-slate-100 last:border-0 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                            <div className="flex-1 min-w-[200px] font-medium text-slate-900">{r.puesto}</div>
                            {r.recibida
                                ? <><Badge tone="success" dot>{r.enviadaAhora ? 'Enviada' : 'Recibida'} el {fechaES(r.recibida)}</Badge><Button size="sm" icon={Upload} onClick={() => setSubir(r)}>Actualizar</Button></>
                                : <><Badge tone="warning" dot>Falta</Badge><Button size="sm" variant="primary" icon={Upload} onClick={() => setSubir(r)}>Enviar</Button></>}
                        </div>
                    ))}
                </Card>
            </div>
            <div className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900">Documentos de {ETT.nombre}</h2>
                <Card className="overflow-hidden">
                    {DOCUMENTOS_ETT.map(d => (
                        <div key={d.nombre} className="px-5 py-3 border-b border-slate-100 last:border-0 flex flex-wrap items-center justify-between gap-2 text-sm">
                            <div><div className="font-medium text-slate-900">{d.nombre}</div><div className="text-slate-500">{d.detalle}</div></div>
                            <Button size="sm" icon={Download} onClick={() => aviso(`${d.nombre} descargado (demo)`)}>Descargar</Button>
                        </div>
                    ))}
                </Card>
            </div>
        </div>
    );

    const Cuenta = () => (
        <div className="space-y-5 max-w-3xl">
            <h1 className="text-2xl font-semibold text-slate-900">Mi cuenta</h1>
            <Card className="p-5">
                <SectionTitle>Tus datos</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    {[['Nombre', `${usuario.nombre} ${usuario.apellidos}`], ['Cargo', usuario.cargo], ['Empresa', cliente.nombre], ['Correo', usuario.email]].map(([l, v]) => (
                        <div key={l} className="border-b border-slate-100 pb-2"><div className="text-xs text-slate-500">{l}</div><div className="text-slate-900 mt-0.5">{v}</div></div>
                    ))}
                    <Field label="Teléfono">
                        <TextInput value={cuenta.telefono} onChange={(e) => setCuenta(c => ({ ...c, telefono: e.target.value }))} />
                    </Field>
                </div>
                <p className="text-xs text-slate-500 mt-3">El nombre, el cargo y el correo los cambia {ETT.nombre}. Escribe a {cliente.contactoEtt.nombre} si no son correctos.</p>
            </Card>
            <Card className="p-5">
                <SectionTitle>Tus permisos</SectionTitle>
                <ul className="space-y-1.5 text-sm">
                    {PERMISOS_PORTAL.map(p => {
                        const si = usuario.permisos.includes(p.id);
                        return (
                            <li key={p.id} className="flex items-start gap-2">
                                {si ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> : <X className="w-4 h-4 text-slate-300 mt-0.5 shrink-0" />}
                                <span className={si ? 'text-slate-800' : 'text-slate-400'}>{p.texto}<span className="text-xs text-slate-500"> · {p.detalle.toLowerCase()}</span></span>
                            </li>
                        );
                    })}
                </ul>
                <p className="text-xs text-slate-500 mt-3">Los permisos los da {ETT.nombre}. Si necesitas otro, pídeselo a {cliente.contactoEtt.nombre}.</p>
            </Card>
            <Card className="p-5 space-y-3">
                <SectionTitle>Avisos por correo</SectionTitle>
                {[['horas', 'Partes de horas por validar'], ['documentos', 'Documentos por firmar'], ['facturas', 'Facturas nuevas y vencimientos'], ['personal', 'Incorporaciones y finales de misión']].filter(([id]) => puede(id)).map(([id, texto]) => (
                    <div key={id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-slate-800">{texto}</span>
                        <Interruptor label={texto} checked={cuenta.avisos[id]} onChange={(v) => setCuenta(c => ({ ...c, avisos: { ...c.avisos, [id]: v } }))} />
                    </div>
                ))}
            </Card>
            <Card className="p-5 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm"><div className="font-medium text-slate-900">Contraseña</div><div className="text-slate-500">Cámbiala si crees que alguien más la conoce.</div></div>
                <Button icon={KeyRound} onClick={() => setCambioClave({ actual: '', nueva: '', repetida: '' })}>Cambiar la contraseña</Button>
            </Card>
            <div className="flex justify-end"><Button variant="primary" icon={Check} onClick={() => aviso('Cambios guardados')}>Guardar</Button></div>
        </div>
    );

    // Se llaman como funciones (no como componentes) para no perder el foco de los campos al escribir
    const CONTENIDO = { inicio: Inicio, pedir: Pedir, personal: Personal, horas: Horas, facturas: Facturas, documentos: Documentos, cuenta: Cuenta };
    const contador = { horas: puede('horas') ? partesPorValidar.length : 0, documentos: cpdsPendientes.length + riesgosPendientes.length };
    const parte = partes.find(p => p.clave === parteAbierto);

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            {/* Barra de la demo (no sale en real) */}
            <div className="bg-slate-900 text-slate-200 text-xs">
                <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
                    <span>Demo · Área de empresas de {ETT.nombre} · en real: {ETT.subdominio}.tramitnow.com/empresas</span>
                    <span className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-1.5">Ver como
                            <select value={usuario.email} onChange={(e) => { onCambiarUsuario(USUARIOS.find(u => u.email === e.target.value)); setSeccion('inicio'); }} className="rounded bg-white/10 text-white px-1.5 py-0.5 border-0 text-xs">
                                {USUARIOS.map(u => <option key={u.email} value={u.email} className="text-slate-900">{u.nombre} {u.apellidos} · {u.empresaCorta}</option>)}
                            </select>
                        </label>
                        <a href="/trabajadores.html" className="text-slate-300 hover:text-white">Ver el portal del trabajador</a>
                        <a href="/" className="inline-flex items-center gap-1 text-indigo-300 hover:text-white"><ArrowLeft className="w-3.5 h-3.5" />Volver al ERP</a>
                    </span>
                </div>
            </div>

            {/* Cabecera: ETT y «Área de empresas» a la izquierda; la empresa y quién ha entrado a la derecha */}
            <header className="bg-white">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
                    <div className="flex items-center gap-3 mr-auto min-w-0">
                        <span className="w-10 h-10 rounded-lg bg-indigo-700 text-white flex items-center justify-center font-semibold shrink-0">{ETT.siglas}</span>
                        <span className="min-w-0">
                            <span className="block text-sm font-semibold text-slate-900 truncate">{ETT.nombre}</span>
                            <span className="inline-block text-[11px] font-semibold uppercase tracking-wide text-indigo-700 bg-indigo-50 rounded px-1.5">Área de empresas</span>
                        </span>
                    </div>
                    <button type="button" onClick={() => ir('cuenta')} className="flex items-center gap-3 text-right min-w-0">
                        <span className="hidden sm:block min-w-0">
                            <span className="block text-sm font-medium text-slate-900 truncate"><Building2 className="w-4 h-4 inline -mt-0.5 text-slate-400 mr-1" />{cliente.corto}</span>
                            <span className="block text-xs text-slate-500 truncate">{usuario.nombre} {usuario.apellidos} · {usuario.cargo}</span>
                        </span>
                        <span className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center text-sm font-medium shrink-0">{usuario.nombre[0]}{usuario.apellidos[0]}</span>
                    </button>
                    <button type="button" onClick={onSalir} title="Salir" aria-label="Salir" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"><LogOut className="w-5 h-5" /></button>
                </div>
                {/* Menú horizontal */}
                <nav className="border-t border-b border-slate-200 bg-white">
                    <div className="max-w-6xl mx-auto px-2 flex overflow-x-auto">
                        {menu.map(m => (
                            <button key={m.id} type="button" onClick={() => ir(m.id)} className={`flex items-center gap-2 px-3 py-3 text-sm whitespace-nowrap border-b-2 -mb-px ${seccion === m.id ? 'border-indigo-600 text-indigo-700 font-medium' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>
                                <m.icono className="w-4 h-4" />{m.texto}
                                {contador[m.id] > 0 && <span className="rounded-full bg-amber-500 text-white text-[10px] px-1.5">{contador[m.id]}</span>}
                            </button>
                        ))}
                    </div>
                </nav>
            </header>

            <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{CONTENIDO[seccion]()}</main>

            <footer className="border-t border-slate-200 bg-white">
                <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>© {ETT.nombre} · ETT autorizada n.º {ETT.autorizacion} · Aviso legal · Privacidad</span>
                    <span>Funciona con <span className="font-semibold text-slate-800">Tramit<span className="text-indigo-600">Now</span></span></span>
                </div>
            </footer>

            {/* PEDIR PERSONAL */}
            {pedido && (
                <Modal
                    title="Pedir personal"
                    subtitle={`Llega a ${cliente.contactoEtt.nombre}, que te confirmará en 24 horas`}
                    onClose={() => setPedido(null)}
                    size="max-w-lg"
                    footer={<>
                        <Button onClick={() => setPedido(null)}>Cancelar</Button>
                        <Button variant="primary" icon={Send} disabled={!pedido.plazas || !pedido.inicio || !pedido.fin || pedido.fin < pedido.inicio || (pedido.puesto === 'otro' && !pedido.otroPuesto.trim())} onClick={enviarPedido}>Enviar petición</Button>
                    </>}
                >
                    <div className="space-y-4 text-sm">
                        <Field label="Puesto">
                            <Select value={pedido.puesto} onChange={(e) => setPedido(x => ({ ...x, puesto: e.target.value }))} className="w-full">
                                {cliente.puestos.map(p => <option key={p} value={p}>{p}</option>)}
                                <option value="otro">Otro puesto…</option>
                            </Select>
                        </Field>
                        {pedido.puesto === 'otro' ? (
                            <>
                                <Field label="Qué puesto necesitas"><TextInput value={pedido.otroPuesto} onChange={(e) => setPedido(x => ({ ...x, otroPuesto: e.target.value }))} placeholder="Por ejemplo, recepcionista" /></Field>
                                <Notice tone="info" icon={Info}>No está en tu presupuesto: te enviaremos uno nuevo antes de empezar a buscar.</Notice>
                            </>
                        ) : <p className="text-xs text-slate-500 -mt-2">Con la tarifa de tu presupuesto {cliente.presupuesto}.</p>}
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Personas"><TextInput type="number" min="1" max="50" value={pedido.plazas} onChange={(e) => setPedido(x => ({ ...x, plazas: e.target.value }))} /></Field>
                            <Field label="Turno">
                                <Select value={pedido.turno} onChange={(e) => setPedido(x => ({ ...x, turno: e.target.value }))} className="w-full">{TURNOS.map(t => <option key={t}>{t}</option>)}</Select>
                            </Field>
                            <Field label="Desde"><TextInput type="date" value={pedido.inicio} min={hoyIso()} onChange={(e) => setPedido(x => ({ ...x, inicio: e.target.value }))} /></Field>
                            <Field label="Hasta"><TextInput type="date" value={pedido.fin} min={pedido.inicio} onChange={(e) => setPedido(x => ({ ...x, fin: e.target.value }))} /></Field>
                        </div>
                        <Field label="Centro de trabajo">
                            <Select value={pedido.centro} onChange={(e) => setPedido(x => ({ ...x, centro: e.target.value }))} className="w-full">{cliente.centros.map(c => <option key={c}>{c}</option>)}</Select>
                        </Field>
                        <Field label="Requisitos o comentarios (opcional)"><TextInput value={pedido.comentario} onChange={(e) => setPedido(x => ({ ...x, comentario: e.target.value }))} placeholder="Idiomas, carnés, experiencia…" /></Field>
                    </div>
                </Modal>
            )}

            {/* PRÓRROGA, TERMINAR ANTES O INCIDENCIA */}
            {accion && (
                <Modal
                    title={{ prorroga: 'Pedir una prórroga', terminar: 'Terminar la misión antes', incidencia: 'Comunicar una incidencia' }[accion.tipo]}
                    subtitle={`${accion.persona.nombre} · ${petDe(accion.persona.petId).puesto} · hasta el ${fechaES(accion.persona.fin)}`}
                    onClose={() => setAccion(null)}
                    size="max-w-md"
                    footer={<>
                        <Button onClick={() => setAccion(null)}>Cancelar</Button>
                        <Button variant="primary" icon={Send} disabled={!accion.fecha || (accion.tipo === 'prorroga' && accion.fecha <= accion.persona.fin) || (accion.tipo === 'terminar' && accion.fecha >= accion.persona.fin)} onClick={enviarAccion}>Enviar a la ETT</Button>
                    </>}
                >
                    <div className="space-y-4 text-sm">
                        {accion.tipo === 'incidencia' && (
                            <Field label="Qué ha pasado">
                                <Select value={accion.motivo} onChange={(e) => setAccion(a => ({ ...a, motivo: e.target.value }))} className="w-full">{TIPOS_INCIDENCIA.map(t => <option key={t}>{t}</option>)}</Select>
                            </Field>
                        )}
                        <Field label={{ prorroga: 'Nueva fecha de fin', terminar: 'Último día de trabajo', incidencia: 'Día' }[accion.tipo]}>
                            <TextInput type="date" value={accion.fecha} min={accion.tipo === 'prorroga' ? sumar(accion.persona.fin, 1) : undefined} onChange={(e) => setAccion(a => ({ ...a, fecha: e.target.value }))} />
                        </Field>
                        <Field label={accion.tipo === 'incidencia' ? 'Cuéntanos qué ha pasado' : 'Comentario (opcional)'}>
                            <TextInput value={accion.texto} onChange={(e) => setAccion(a => ({ ...a, texto: e.target.value }))} />
                        </Field>
                        {accion.tipo === 'prorroga' && <Notice tone="info" icon={Info}>La prórroga necesita un CPD nuevo y la conformidad de la persona. Te avisaremos cuando esté lista para firmar.</Notice>}
                        {accion.tipo === 'terminar' && <Notice tone="warning" icon={AlertTriangle}>Avísanos con tiempo: la ETT tiene que comunicar la baja y preavisar a la persona.</Notice>}
                        {accion.tipo === 'incidencia' && accion.motivo.startsWith('Accidente') && <Notice tone="danger" icon={AlertTriangle}>Si es grave, llama al 112. Después llama a {cliente.contactoEtt.nombre} ({cliente.contactoEtt.telefono}): la ETT tiene que comunicar el accidente.</Notice>}
                    </div>
                </Modal>
            )}

            {/* VALIDAR EL PARTE O PONER REPAROS */}
            {validar && parte && (
                <Modal
                    title={validar.modo === 'validar' ? 'Validar el parte' : 'Poner reparos al parte'}
                    subtitle={`${parte.pet.puesto} · semana del ${ddmm(parte.lunes)} al ${fechaES(sumar(parte.lunes, 6))}`}
                    onClose={() => setValidar(null)}
                    size="max-w-md"
                    footer={<>
                        <Button onClick={() => setValidar(null)}>Cancelar</Button>
                        <Button variant="primary" icon={validar.modo === 'validar' ? Check : Send} disabled={validar.modo === 'validar' ? !validar.ok : !validar.texto.trim()} onClick={confirmarParte}>{validar.modo === 'validar' ? 'Validar' : 'Enviar reparos'}</Button>
                    </>}
                >
                    {validar.modo === 'validar' ? (
                        <div className="space-y-3 text-sm">
                            <p className="text-slate-600">{parte.filas.length} personas · {num(totales(parte.filas).h)} h normales{totales(parte.filas).x ? ` y ${num(totales(parte.filas).x)} h extra` : ''}.</p>
                            <label className="flex items-start gap-2 text-slate-700">
                                <input type="checkbox" checked={validar.ok} onChange={(e) => setValidar(v => ({ ...v, ok: e.target.checked }))} className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                Confirmo que las horas e incidencias de esta semana son correctas
                            </label>
                            <p className="text-xs text-slate-500">Quedará registrado que lo has validado tú, con la fecha y la hora. Es la prueba de tu conformidad.</p>
                        </div>
                    ) : (
                        <div className="space-y-3 text-sm">
                            <Field label="Qué no es correcto">
                                <textarea rows={4} value={validar.texto} onChange={(e) => setValidar(v => ({ ...v, texto: e.target.value }))} placeholder="Por ejemplo: el jueves Irene salió a las 16:00." className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                            </Field>
                            <p className="text-xs text-slate-500">{cliente.contactoEtt.nombre} corregirá el parte y te lo volverá a enviar.</p>
                        </div>
                    )}
                </Modal>
            )}

            {/* FIRMAR CPD: revisar → código por correo → firmado */}
            {firma && (
                <Modal
                    title={firma.cpds.length > 1 ? `Firmar ${firma.cpds.length} CPD` : 'Firmar el CPD'}
                    subtitle="Contrato de puesta a disposición"
                    onClose={() => setFirma(null)}
                    size="max-w-lg"
                    footer={firma.paso === 1 ? <>
                        <Button onClick={() => setFirma(null)}>Ahora no</Button>
                        <Button variant="primary" icon={Send} disabled={!firma.ok} onClick={() => setFirma(f => ({ ...f, paso: 2 }))}>Enviarme el código</Button>
                    </> : <>
                        <Button onClick={() => setFirma(f => ({ ...f, paso: 1 }))}>Atrás</Button>
                        <Button variant="primary" icon={FileSignature} disabled={firma.codigo.length !== 6} onClick={confirmarFirma}>Firmar</Button>
                    </>}
                >
                    {firma.paso === 1 ? (
                        <div className="space-y-3 text-sm">
                            <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
                                {firma.cpds.map(id => {
                                    const p = personaDe(id);
                                    const pet = petDe(p.petId);
                                    return (
                                        <div key={id} className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                                            <div><div className="font-medium text-slate-900">{p.nombre}</div><div className="text-xs text-slate-500">{pet.puesto} · {fechaES(p.inicio)} – {fechaES(p.fin)} · {turnoDe(pet.turno)}</div></div>
                                            <button type="button" className="text-xs text-indigo-700 hover:underline" onClick={() => aviso('CPD abierto (demo)')}>Leer</button>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-slate-500">Recoge el puesto, la causa del contrato, las fechas, el centro y los riesgos del puesto, según el presupuesto {cliente.presupuesto} que aceptasteis.</p>
                            <label className="flex items-start gap-2 text-slate-700">
                                <input type="checkbox" checked={firma.ok} onChange={(e) => setFirma(f => ({ ...f, ok: e.target.checked }))} className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                He revisado {firma.cpds.length > 1 ? 'los contratos' : 'el contrato'} y estoy de acuerdo
                            </label>
                        </div>
                    ) : (
                        <div className="space-y-3 text-sm">
                            <p className="text-slate-600">Te hemos enviado un código de 6 cifras a {usuario.email}. Escríbelo para firmar.</p>
                            <TextInput inputMode="numeric" maxLength={6} value={firma.codigo} onChange={(e) => setFirma(f => ({ ...f, codigo: e.target.value.replace(/\D/g, '').slice(0, 6) }))} placeholder="000000" className="text-center text-lg tracking-[0.5em] font-mono" />
                            <p className="text-xs text-slate-500">En la demo vale cualquier código de 6 cifras.</p>
                        </div>
                    )}
                </Modal>
            )}

            {/* ENVIAR LA EVALUACIÓN DE RIESGOS */}
            {subir && (
                <Modal
                    title="Evaluación de riesgos del puesto"
                    subtitle={subir.puesto}
                    onClose={() => setSubir(null)}
                    size="max-w-md"
                    footer={<>
                        <Button onClick={() => setSubir(null)}>Cancelar</Button>
                        <Button variant="primary" icon={Upload} disabled={!subir.adjunto} onClick={() => {
                            setRiesgos(prev => prev.map(r => (r.cliente === subir.cliente && r.puesto === subir.puesto ? { ...r, recibida: hoyIso(), enviadaAhora: true } : r)));
                            setSubir(null);
                            aviso('Evaluación enviada. La ETT la revisará y la usará para informar a cada persona.');
                        }}>Enviar</Button>
                    </>}
                >
                    <div className="space-y-3 text-sm">
                        <button type="button" onClick={() => setSubir(s => ({ ...s, adjunto: !s.adjunto }))} className={`w-full rounded-xl border-2 border-dashed p-6 text-center ${subir.adjunto ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-700'}`}>
                            {subir.adjunto ? <><CheckCircle2 className="w-6 h-6 mx-auto mb-1" />Evaluacion_riesgos.pdf (pulsa para quitarlo)</> : <><Upload className="w-6 h-6 mx-auto mb-1" />Elegir el archivo (PDF)</>}
                        </button>
                        <p className="text-xs text-slate-500">Tiene que decir los riesgos del puesto, las medidas de prevención, los equipos de protección (EPI) y la formación necesaria. Suele hacerla vuestro servicio de prevención.</p>
                    </div>
                </Modal>
            )}

            {/* CAMBIAR LA CONTRASEÑA */}
            {cambioClave && (
                <Modal
                    title="Cambiar la contraseña"
                    onClose={() => setCambioClave(null)}
                    size="max-w-sm"
                    footer={<>
                        <Button onClick={() => setCambioClave(null)}>Cancelar</Button>
                        <Button variant="primary" disabled={!cambioClave.actual || cambioClave.nueva.length < 8 || cambioClave.nueva !== cambioClave.repetida} onClick={() => { setCambioClave(null); aviso('Contraseña cambiada'); }}>Cambiar</Button>
                    </>}
                >
                    <div className="space-y-3 text-sm">
                        <Field label="Contraseña actual"><TextInput type="password" value={cambioClave.actual} onChange={(e) => setCambioClave(c => ({ ...c, actual: e.target.value }))} /></Field>
                        <Field label="Contraseña nueva" hint="Mínimo 8 caracteres."><TextInput type="password" value={cambioClave.nueva} onChange={(e) => setCambioClave(c => ({ ...c, nueva: e.target.value }))} /></Field>
                        <Field label="Repite la contraseña nueva"><TextInput type="password" value={cambioClave.repetida} onChange={(e) => setCambioClave(c => ({ ...c, repetida: e.target.value }))} /></Field>
                    </div>
                </Modal>
            )}

            {toast && (
                <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-lg text-sm animate-fade-in md:max-w-md">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span className="flex-1">{toast}</span>
                    <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white" aria-label="Cerrar aviso"><X className="w-4 h-4" /></button>
                </div>
            )}
        </div>
    );
}
