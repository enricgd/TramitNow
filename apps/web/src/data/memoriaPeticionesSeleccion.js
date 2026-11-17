// Selección de las peticiones de ejemplo (fases 6 y 7): plazas con personas, candidatos y su embudo, CPD de cada
// persona y portales. Son los datos del diseñador que estaban en PeticionesView.jsx, movidos aquí para que la
// compilación del NAS no los lleve (ver vite.config.ts). Solo los usa la demo (memoria.ts → jobRequestSelection);
// contra la API no hay ruta todavía. Todo es ficticio. Sin efectos al cargarse: se crea en `seleccionDemo()`.
import { contactoDemo } from '../views/personasDemo';
import { SEMILLAS } from './memoriaPeticiones';

const ESTADO = { new: 'Nueva', publishing: 'En difusión', selecting: 'En selección', covered: 'Cubierta', in_progress: 'En curso', closed: 'Cerrada', cancelled: 'Cancelada' };
const ESTADOS_ACTIVOS = ['Nueva', 'En difusión', 'En selección', 'Cubierta', 'En curso'];
const fechaCorta = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
const diasHasta = (iso) => Math.round((new Date(`${iso}T00:00:00`) - new Date(new Date().toDateString())) / 86400000);
// Portales de empleo activos y candidaturas de cada petición (los del diseñador)
const DIFUSION = {
    'PET-2026-0048': [3, 41], 'PET-2026-0049': [4, 22], 'PET-2026-0050': [4, 17], 'PET-2026-0044': [2, 58], 'PET-2026-0045': [1, 19],
    'PET-2026-0046': [3, 6], 'PET-2026-0047': [0, 0], 'PET-2026-0031': [0, 47], 'PET-2026-0036': [0, 9],
};

/** Los datos de selección de las peticiones de ejemplo, por código de petición. */
export function seleccionDemo() {
const INITIAL_PETICIONES = SEMILLAS.map(s => ({ id: s.code, solicitados: s.slots, cubiertas: s.covered, inicio: s.start, estado: ESTADO[s.status], creada: s.created }));
const INITIAL_PORTALES = [
    {
        id: 'infojobs',
        nombre: 'InfoJobs',
        badgeColor: 'bg-blue-600',
        logoText: 'IJ',
        activo: true,
        estadoApi: 'Sincronizado',
        candidaturas: 18,
        ultSinc: '14/02/2026 12:40',
        personalizado: false,
        customContent: null
    },
    {
        id: 'linkedin',
        nombre: 'LinkedIn Talent Solutions',
        badgeColor: 'bg-blue-700',
        logoText: 'in',
        activo: true,
        estadoApi: 'Sincronizado',
        candidaturas: 12,
        ultSinc: '14/02/2026 12:40',
        personalizado: true,
        customContent: {
            titulo: 'Operario/a de almacén y carretillero/a — ZAL Bilbao',
            descripcion: 'Trans-Logística Ibérica Norte busca talento para su hub de Bilbao. Únete a un equipo dinámico con oportunidades de desarrollo profesional.',
            funciones: '• Gestión ágil de pedidos con RF y sistemas WMS.\n• Manejo de carretillas retráctiles y frontales.\n• Cumplimiento de estándares de seguridad y calidad en muelle.',
            requisitos: '• Experiencia sólida en logística moderna.\n• Carnet UNE 58451 carretillas.\n• Orientación a la seguridad y trabajo en equipo.',
            categoria: 'Supply Chain & Logistics',
            ubicacion: 'Bilbao y alrededores, España (Híbrido/Presencial)',
            jornada: 'Jornada completa',
            condiciones: 'Contratación ETT con alta tasa de conversión a plantilla directa.',
            cta: 'Envía tu candidatura simplificada con tu perfil de LinkedIn.'
        }
    },
    {
        id: 'indeed',
        nombre: 'Indeed y Glassdoor',
        badgeColor: 'bg-indigo-600',
        logoText: 'inD',
        activo: true,
        estadoApi: 'Sincronizado',
        candidaturas: 24,
        ultSinc: '14/02/2026 12:40',
        personalizado: false,
        customContent: null
    },
    {
        id: 'monster',
        nombre: 'Monster',
        badgeColor: 'bg-indigo-600',
        logoText: 'M',
        activo: false,
        estadoApi: 'Pausado',
        candidaturas: 0,
        ultSinc: '10/02/2026 09:15',
        personalizado: false,
        customContent: null
    },
    {
        id: 'portal_ett',
        nombre: 'Portal de Empleo Propio ETT',
        badgeColor: 'bg-emerald-600',
        logoText: 'ETT',
        activo: true,
        estadoApi: 'Publicado directo',
        candidaturas: 9,
        ultSinc: 'En tiempo real',
        personalizado: false,
        customContent: null
    }
];

// --- MOCK DATA: PLAZAS Y CANDIDATOS POR POSICIÓN ---
const PLAZAS_BASE = {
    'operario': [
        {
            id: 'PLZ-001-01',
            numero: 1,
            estado: 'cubierta', // 'cubierta' | 'vacante' | 'en_proceso'
            candidatoId: 'CAN-0126',
            nombre: 'Jon Ander Etxebarria Bilbao',
            dni: '45892134K',
            telefono: '+34 654 112 890',
            email: 'jonander.etxebarria@email.com',
            fechaIncorporacion: '03/11/2026',
            contratoTipo: 'CPD Obra y Servicio (ETT)',
            scoring: 96,
            foto: null
        },
        {
            id: 'PLZ-001-02',
            numero: 2,
            estado: 'cubierta',
            candidatoId: 'CAN-0127',
            nombre: 'Ainhoa Larrazabal Urkijo',
            dni: '78912340M',
            telefono: '+34 688 234 561',
            email: 'ainhoa.larrazabal@email.com',
            fechaIncorporacion: '03/11/2026',
            contratoTipo: 'CPD Obra y Servicio (ETT)',
            scoring: 92,
            foto: null
        },
        {
            id: 'PLZ-001-03',
            numero: 3,
            estado: 'cubierta',
            candidatoId: 'CAN-0128',
            nombre: 'Mamadou Diallo',
            dni: 'X8923412P',
            telefono: '+34 611 902 443',
            email: 'mamadou.diallo@email.com',
            fechaIncorporacion: '03/11/2026',
            contratoTipo: 'CPD Obra y Servicio (ETT)',
            scoring: 88,
            foto: null
        },
        {
            id: 'PLZ-001-04',
            numero: 4,
            estado: 'cubierta',
            candidatoId: 'CAN-0129',
            nombre: 'Laura Morales San Sebastián',
            dni: '16098234L',
            telefono: '+34 670 445 119',
            email: 'laura.morales@email.com',
            fechaIncorporacion: '03/11/2026',
            contratoTipo: 'CPD Obra y Servicio (ETT)',
            scoring: 94,
            foto: null
        },
        {
            id: 'PLZ-001-05',
            numero: 5,
            estado: 'cubierta',
            candidatoId: 'CAN-0130',
            nombre: 'Iker Agirrebeitia Mendia',
            dni: '30691288B',
            telefono: '+34 699 871 203',
            email: 'iker.agirre@email.com',
            fechaIncorporacion: '03/11/2026',
            contratoTipo: 'CPD Obra y Servicio (ETT)',
            scoring: 90,
            foto: null
        },
        {
            id: 'PLZ-001-06',
            numero: 6,
            estado: 'vacante',
            candidatoId: null,
            nombre: null,
            dni: null,
            telefono: null,
            email: null,
            fechaIncorporacion: null,
            contratoTipo: null,
            scoring: null,
            foto: null
        },
        {
            id: 'PLZ-001-07',
            numero: 7,
            estado: 'vacante',
            candidatoId: null,
            nombre: null,
            dni: null,
            telefono: null,
            email: null,
            fechaIncorporacion: null,
            contratoTipo: null,
            scoring: null,
            foto: null
        },
        {
            id: 'PLZ-001-08',
            numero: 8,
            estado: 'vacante',
            candidatoId: null,
            nombre: null,
            dni: null,
            telefono: null,
            email: null,
            fechaIncorporacion: null,
            contratoTipo: null,
            scoring: null,
            foto: null
        }
    ],
    'carretillero': [
        {
            id: 'PLZ-002-01',
            numero: 1,
            estado: 'cubierta',
            candidatoId: 'CAN-0131',
            nombre: 'Unai García Zabaleta',
            dni: '44901238R',
            telefono: '+34 633 901 223',
            email: 'unai.garcia@email.com',
            fechaIncorporacion: '03/11/2026',
            contratoTipo: 'CPD Obra y Servicio (ETT)',
            scoring: 98,
            foto: null
        },
        {
            id: 'PLZ-002-02',
            numero: 2,
            estado: 'cubierta',
            candidatoId: 'CAN-0132',
            nombre: 'Carlos Manuel Ortiz Reyes',
            dni: 'Y1290384T',
            telefono: '+34 677 340 192',
            email: 'carlos.ortiz@email.com',
            fechaIncorporacion: '03/11/2026',
            contratoTipo: 'CPD Obra y Servicio (ETT)',
            scoring: 95,
            foto: null
        },
        {
            id: 'PLZ-002-03',
            numero: 3,
            estado: 'vacante',
            candidatoId: null,
            nombre: null,
            dni: null,
            telefono: null,
            email: null,
            fechaIncorporacion: null,
            contratoTipo: null,
            scoring: null,
            foto: null
        },
        {
            id: 'PLZ-002-04',
            numero: 4,
            estado: 'vacante',
            candidatoId: null,
            nombre: null,
            dni: null,
            telefono: null,
            email: null,
            fechaIncorporacion: null,
            contratoTipo: null,
            scoring: null,
            foto: null
        }
    ]
};

// Plazas de cada petición. Las de logística salen de los ejemplos de arriba; el resto se generan.
const NOMBRES_DEMO = ['Garazi Uribe Arana', 'Pablo Ruiz Cano', 'Sara Benítez Lago', 'Youssef Amrani', 'Lucía Ferrer Sanz', 'Marc Puig Soler', 'Aitana Roca Vidal', 'Daniel Sousa Prieto', 'Irene Campos Gil', 'Óscar León Mena', 'Noa Serra Pons', 'Hugo Martín Vera', 'Ane Goikoetxea Ruiz', 'Iván Molina Prat', 'Clara Esteve Ros', 'Bruno Lage Costa', 'Nerea Olabarria Gil', 'Adrián Vela Soto', 'Paula Rius Ferrer', 'Sergio Navas Peña'];
// Primer nombre de cada petición generada, para que nadie esté en dos peticiones (las mismas personas que en Contratos y altas)
const PRIMER_NOMBRE = { 'PET-2026-0044': 0, 'PET-2026-0045': 10, 'PET-2026-0031': 14 };
const renumerarPlazas = (lista, codigo) => lista.map((p, i) => ({ ...p, id: `PLZ-${codigo}-${String(i + 1).padStart(2, '0')}`, numero: i + 1 }));
const plazaVacante = { estado: 'vacante', candidatoId: null, nombre: null, dni: null, telefono: null, email: null, fechaIncorporacion: null, contratoTipo: null, scoring: null, foto: null };
const generarPlazas = (p) => Array.from({ length: p.solicitados }, (_, i) => {
    if (i >= p.cubiertas) return { ...plazaVacante };
    const nombre = NOMBRES_DEMO[((PRIMER_NOMBRE[p.id] ?? 0) + i) % NOMBRES_DEMO.length];
    return {
        estado: 'cubierta',
        candidatoId: null, // se rellena con el código de Candidatos (conContacto)
        nombre,
        dni: '00000000T',
        telefono: '+34 600 000 000',
        email: `${nombre.split(' ')[0].toLowerCase()}@ejemplo.es`,
        fechaIncorporacion: fechaCorta(p.inicio),
        contratoTipo: 'CPD circunstancias de la producción (ETT)',
        scoring: 85 + (i % 10),
        foto: null
    };
});
// Las personas de las plazas son las de Candidatos: mismo código, DNI, teléfono y email (personasDemo.js)
const conContacto = (plz) => {
    const c = plz.nombre && contactoDemo(plz.nombre);
    return c ? { ...plz, candidatoId: c.id, dni: c.dni, telefono: c.telefono, email: c.email } : plz;
};
const PLAZAS_INICIO = Object.fromEntries(INITIAL_PETICIONES.map(p => {
    const codigo = p.id.slice(-4);
    const lista = p.id === 'PET-2026-0048' ? PLAZAS_BASE['operario'].slice(0, 5)
        : p.id === 'PET-2026-0049' ? PLAZAS_BASE['operario'].slice(5)
            : p.id === 'PET-2026-0050' ? PLAZAS_BASE['carretillero']
                : generarPlazas(p);
    return [p.id, renumerarPlazas(lista.map(conContacto), codigo)];
}));

const CANDIDATOS_BASE = [
    {
        id: 'CAN-0201',
        nombre: 'Nerea Barandiarán Goikoetxea',
        dni: '45903218V',
        telefono: '+34 644 192 830',
        email: 'nerea.barandiaran@email.com',
        puestoPrincipal: 'Operaria de almacén / Moza de almacén',
        experiencia: '3 años en logística de frío y picking con radiofrecuencia',
        disponibilidad: 'Inmediata (Turnos Mañana / Tarde)',
        carnets: 'Carnet B + Manipuladora de alimentos',
        scoring: 95,
        matchPosicion: ['operario'],
        ubicacion: 'Barakaldo (Bizkaia)',
        valoracionETT: 'Candidata muy formal, experiencia comprobada en un operador logístico de alimentación.',
        estadoSeleccion: 'Disponible para asignación',
        foto: null
    },
    {
        id: 'CAN-0202',
        nombre: 'David Aranguren Sola',
        dni: '72890123C',
        telefono: '+34 605 882 104',
        email: 'david.aranguren@email.com',
        puestoPrincipal: 'Carretillero frontal y retráctil UNE 58451',
        experiencia: '5 años en estanterías dinámicas 12m y carga de tráileres',
        disponibilidad: 'Inmediata',
        carnets: 'Carnet Carretillas UNE 58451 (5 tipos) + C1',
        scoring: 98,
        matchPosicion: ['carretillero'],
        ubicacion: 'Santurtzi (Bizkaia)',
        valoracionETT: 'Alta destreza en retráctil, buenas referencias de un operador logístico de Bilbao.',
        estadoSeleccion: 'Disponible para asignación',
        foto: null
    },
    {
        id: 'CAN-0203',
        nombre: 'Yeray Fernández Ramos',
        dni: '16102934D',
        telefono: '+34 682 301 928',
        email: 'yeray.fernandez@email.com',
        puestoPrincipal: 'Operario de almacén y expediciones',
        experiencia: '2 años en empaquetado, albaranes y preparación con terminal Zebra',
        disponibilidad: 'Inmediata (Mañanas)',
        carnets: 'Carnet B + PRL básico 60h',
        scoring: 89,
        matchPosicion: ['operario'],
        ubicacion: 'Bilbao (Bizkaia)',
        valoracionETT: 'Muy motivado, disponibilidad para horas extra si procede.',
        estadoSeleccion: 'Disponible para asignación',
        foto: null
    },
    {
        id: 'CAN-0204',
        nombre: 'Kepa Iturriaga Elorrieta',
        dni: '30654891Q',
        telefono: '+34 618 450 912',
        email: 'kepa.iturriaga@email.com',
        puestoPrincipal: 'Conductor / Carretillero homologado',
        experiencia: '4 años en almacén logístico portuario ZAL',
        disponibilidad: 'A partir del 02/11/2026',
        carnets: 'Carnet Carretillero UNE 58451 + C+E',
        scoring: 91,
        matchPosicion: ['carretillero'],
        ubicacion: 'Portugalete (Bizkaia)',
        valoracionETT: 'Conoce los muelles de la ZAL de Santurtzi a la perfección.',
        estadoSeleccion: 'Disponible para asignación',
        foto: null
    },
    {
        id: 'CAN-0205',
        nombre: 'Sofía Valderrama Galdós',
        dni: '79012384H',
        telefono: '+34 690 128 347',
        email: 'sofia.valderrama@email.com',
        puestoPrincipal: 'Preparadora de pedidos / Picking',
        experiencia: '1.5 años en sector textil y paquetería express',
        disponibilidad: 'Inmediata',
        carnets: 'Carnet B',
        scoring: 87,
        matchPosicion: ['operario'],
        ubicacion: 'Galdakao (Bizkaia)',
        valoracionETT: 'Rapidez en picking y manejo ágil de lector de código de barras.',
        estadoSeleccion: 'Disponible para asignación',
        foto: null
    }
];

// --- ROOT COMPONENT ---
// Perfil de cada candidato para comprobarlo contra la petición: turnos en los que puede trabajar, carnés,
// si su documentación está en vigor y de dónde vino.
const PERFIL_CANDIDATOS = {
    'CAN-0201': { turnos: ['manana', 'tarde'], carnes: ['manipulador'], docOk: true, origen: 'Portal de candidatos' },
    'CAN-0202': { turnos: ['manana', 'tarde', 'noche'], carnes: ['carretilla'], docOk: true, origen: 'InfoJobs' },
    'CAN-0203': { turnos: ['manana'], carnes: [], docOk: true, origen: 'Portal de candidatos' },
    'CAN-0204': { turnos: ['tarde', 'noche'], carnes: ['carretilla'], docOk: false, origen: 'Indeed' },
    'CAN-0205': { turnos: ['manana', 'tarde'], carnes: [], docOk: true, origen: 'Base de datos' },
};
const persona = (id, nombre, puestoPrincipal, ubicacion, scoring, matchPosicion, perfil, experiencia) => ({
    id, nombre, dni: '00000000T', telefono: '+34 600 000 000', email: `${nombre.split(' ')[0].toLowerCase()}@ejemplo.es`,
    puestoPrincipal, experiencia, disponibilidad: 'Inmediata', carnets: perfil.carnes.map(c => NOMBRE_CARNE[c]).join(', ') || 'Ninguno',
    scoring, matchPosicion, ubicacion, valoracionETT: 'Pendiente de entrevista.', estadoSeleccion: 'En proceso', foto: null, ...perfil
});
const NOMBRE_CARNE = { carretilla: 'Carné de carretillero', manipulador: 'Manipulador/a de alimentos' };
const INITIAL_CANDIDATOS_POOL = [
    ...CANDIDATOS_BASE.map(c => ({ ...c, ...PERFIL_CANDIDATOS[c.id] })),
    // En selección también en Candidatos (con sus datos de allí)
    { ...persona('CAN-0104', 'Elena Sánchez Pascual', 'Reponedora / Moza de almacén', 'Galdakao (Bizkaia)', 90, ['operario'], { turnos: ['manana', 'tarde'], carnes: [], docOk: true, origen: 'Monster' }, '2 años en reposición y almacén'), dni: '02891277W', telefono: '+34 689 112 233', email: 'elena.sanchez.p@fastmail.com' },
    { ...persona('CAN-0105', 'David Castillo Ruiz', 'Operario de almacén', 'Bilbao (Bizkaia)', 89, ['operario', 'carretillero'], { turnos: ['manana', 'tarde'], carnes: ['carretilla'], docOk: true, origen: 'Portal de candidatos' }, '3 años en almacén y carretilla frontal'), dni: '50449912K', telefono: '+34 654 321 987', email: 'david.castillo@example.com' },
    persona('CAN-0206', 'Ibai Zubizarreta Lasa', 'Operario de almacén', 'Basauri (Bizkaia)', 88, ['operario'], { turnos: ['tarde'], carnes: [], docOk: true, origen: 'Portal de candidatos' }, '2 años en almacén de recambios'),
    persona('CAN-0207', 'Leire Ortuzar Bengoa', 'Operaria de almacén', 'Etxebarri (Bizkaia)', 80, ['operario'], { turnos: ['manana'], carnes: [], docOk: true, origen: 'Portal de candidatos' }, 'Sin experiencia en logística; viene de comercio'),
    persona('CAN-0208', 'Gorka Bilbao Arrieta', 'Carretillero', 'Arrigorriaga (Bizkaia)', 86, ['carretillero'], { turnos: ['tarde'], carnes: ['carretilla'], docOk: true, origen: 'InfoJobs' }, '4 años con carretilla retráctil'),
    persona('CAN-0301', 'Marina Soler Bosch', 'Camarera de sala y barra', 'Barcelona', 92, ['camarero', 'camarero_barra'], { turnos: ['partida', 'noche'], carnes: ['manipulador'], docOk: true, origen: 'Portal de candidatos' }, '5 temporadas en banquetes y eventos'),
    persona('CAN-0302', 'Jordi Vila Mas', 'Cocinero', 'L\'Hospitalet de Llobregat', 90, ['cocinero', 'ayudante_cocina'], { turnos: ['partida'], carnes: ['manipulador'], docOk: true, origen: 'InfoJobs' }, 'Jefe de partida en restaurante de 120 cubiertos'),
    persona('CAN-0303', 'Fatima Zahra El Idrissi', 'Ayudante de cocina', 'Badalona', 84, ['ayudante_cocina'], { turnos: ['partida', 'manana'], carnes: ['manipulador'], docOk: false, origen: 'Portal de candidatos' }, '1 año en cocina de colectividades'),
    persona('CAN-0304', 'Álex Romero Gil', 'Camarero de barra', 'Barcelona', 81, ['camarero_barra'], { turnos: ['noche'], carnes: [], docOk: true, origen: 'Indeed' }, 'Coctelería en locales de ocio nocturno'),
].map(c => ({ ...c, ...(contactoDemo(c.nombre) ? (({ dni, telefono, email }) => ({ dni, telefono, email }))(contactoDemo(c.nombre)) : {}) }));

const INITIAL_EMBUDO = {
    'PET-2026-0049': [
        { id: 'CAN-0201', etapa: 'entrevista', fecha: '2026-10-24' },
        { id: 'CAN-0205', etapa: 'entrevista', fecha: '2026-10-22' },
        { id: 'CAN-0203', etapa: 'preseleccionado', fecha: '2026-10-25' },
        { id: 'CAN-0206', etapa: 'preseleccionado', fecha: '2026-10-26' },
        { id: 'CAN-0207', etapa: 'inscrito', fecha: '2026-10-27' },
        { id: 'CAN-0104', etapa: 'entrevista', fecha: '2026-10-23' },
    ],
    'PET-2026-0050': [
        { id: 'CAN-0202', etapa: 'propuesto', fecha: '2026-10-20' },
        { id: 'CAN-0204', etapa: 'entrevista', fecha: '2026-10-23' },
        { id: 'CAN-0208', etapa: 'preseleccionado', fecha: '2026-10-26' },
        { id: 'CAN-0105', etapa: 'entrevista', fecha: '2026-10-20' },
    ],
    'PET-2026-0046': [
        { id: 'CAN-0302', etapa: 'entrevista', fecha: '2026-10-21' },
        { id: 'CAN-0303', etapa: 'inscrito', fecha: '2026-10-27' },
    ],
    'PET-2026-0047': [
        { id: 'CAN-0301', etapa: 'inscrito', fecha: '2026-10-27' },
        { id: 'CAN-0304', etapa: 'inscrito', fecha: '2026-10-28' },
    ],
};

const INITIAL_PORTALES_PROPIOS = Object.fromEntries(INITIAL_PETICIONES.map(p => [p.id, {
    empresa: ESTADOS_ACTIVOS.includes(p.estado) && p.estado !== 'Nueva',
    candidatos: ['En difusión', 'En selección'].includes(p.estado),
    bienvenidaEmpresa: true,
    bienvenidaCandidatos: true,
    bienvenidaEmpresaEnviada: p.estado !== 'Nueva' ? p.creada : null,
}]));

// Plazas con su estado y su CPD. Las cubiertas de peticiones ya empezadas pasan a incorporadas.
const INITIAL_PLAZAS = Object.fromEntries(Object.entries(PLAZAS_INICIO).map(([petId, lista]) => {
    const pet = INITIAL_PETICIONES.find(p => p.id === petId);
    const empezada = diasHasta(pet.inicio) <= 0;
    return [petId, lista.map(pl => {
        const p = { ...pl, motivoBaja: null, bajaDe: null, cpd: null };
        if (p.estado !== 'cubierta') return { ...p, estado: 'vacante' };
        return { ...p, estado: empezada ? 'incorporada' : 'cubierta', cpd: 'firmado', fechaIncorporacion: fechaCorta(pet.inicio), contratoTipo: 'Circunstancias de la producción' };
    })];
}));
// Casos de la demo: CPD aún sin firmar, una persona propuesta al cliente y una baja
INITIAL_PLAZAS['PET-2026-0048'][3].cpd = 'enviado';
INITIAL_PLAZAS['PET-2026-0048'][4].cpd = 'enviado';
INITIAL_PLAZAS['PET-2026-0050'][1].cpd = 'enviado';
(() => {
    const c = INITIAL_CANDIDATOS_POOL.find(x => x.id === 'CAN-0202');
    Object.assign(INITIAL_PLAZAS['PET-2026-0050'][2], { estado: 'reservada', candidatoId: c.id, nombre: c.nombre, dni: c.dni, telefono: c.telefono, email: c.email, scoring: c.scoring, fechaIncorporacion: '10/11/2026', contratoTipo: 'Circunstancias de la producción', cpd: 'sin_generar' });
    const baja = INITIAL_PLAZAS['PET-2026-0044'][2];
    Object.assign(baja, { estado: 'baja', motivoBaja: 'No se presentó', bajaDe: baja.nombre, candidatoId: null, nombre: null, cpd: null });
})();
const difusion = Object.fromEntries(Object.entries(DIFUSION).map(([k, [portalesActivos, candidaturas]]) => [k, { portalesActivos, candidaturas }]));
return { plazas: INITIAL_PLAZAS, embudo: INITIAL_EMBUDO, candidatos: INITIAL_CANDIDATOS_POOL, portalesPropios: INITIAL_PORTALES_PROPIOS, portales: INITIAL_PORTALES, difusion };
}
