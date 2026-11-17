// Candidatos de ejemplo (modo demo): los del diseñador, que estaban en CandidatosView.jsx, en su forma original. La
// memoria (memoriaCandidatos.ts) los pasa a la forma de la API. Los DNI, NSS, teléfonos y emails son inventados (DNI
// 0000xxxx con su letra correcta, dominios example). Solo los usa la demo: la compilación del NAS no los lleva
// (ver vite.config.ts).
import { POBLACIONES_CP } from '../views/codigosPostales';

const LETRAS = 'TRWAGMYFPDXBNJZSQVHLCKE';
/** DNI inventado con la letra correcta. */
const dniEjemplo = (n) => `${String(n).padStart(8, '0')}${LETRAS[n % 23]}`;
/** NIE inventado (X = 0) con la letra correcta. */
const nieEjemplo = (n) => `X${String(n).padStart(7, '0')}${LETRAS[n % 23]}`;

const sumarAnios = (iso, n) => { const d = new Date(`${iso}T00:00:00`); d.setFullYear(d.getFullYear() + n); return d.toISOString().slice(0, 10); };
const TURNOS = [
    { id: 'manana', texto: 'Mañana' },
    { id: 'tarde', texto: 'Tarde' },
    { id: 'noche', texto: 'Noche' },
    { id: 'partida', texto: 'Jornada partida' },
    { id: 'finde', texto: 'Fines de semana' },
];
const turnosDesde = (texto = '') => {
    const t = texto.toLowerCase();
    if (t.includes('indiferente')) return ['manana', 'tarde', 'noche'];
    return TURNOS.filter(x => t.includes(x.texto.toLowerCase().slice(0, 4))).map(x => x.id);
};

// Peticiones con plazas por cubrir (las mismas que en Peticiones). Una petición = un puesto.
const INITIAL_PETITIONS = [
    {
        id: 'PET-2026-0049',
        client: 'Trans-Logística Ibérica Norte, S.L.',
        cif: 'B-87654321',
        workplace: 'HUB central Basauri (Bizkaia) - Nave 2',
        status: 'En selección',
        startDate: '2026-11-03',
        positions: [
            {
                id: 'POS-0049',
                title: 'Operario/a de almacén',
                category: 'Logística',
                turn: 'Turno de tarde (14:00 - 22:00)',
                rate: 'Convenio de almacenes y logística (Bizkaia)',
                requiredExperience: '6 meses en almacén o picking',
                mandatoryRequirements: ['DNI/NIE en vigor', 'Disponibilidad inmediata'],
                plazasTotal: 3,
                plazas: [
                    { plazaNum: 1, status: 'Vacante', candidateName: null, candidateId: null },
                    { plazaNum: 2, status: 'Vacante', candidateName: null, candidateId: null },
                    { plazaNum: 3, status: 'Vacante', candidateName: null, candidateId: null }
                ]
            }
        ]
    },
    {
        id: 'PET-2026-0050',
        client: 'Trans-Logística Ibérica Norte, S.L.',
        cif: 'B-87654321',
        workplace: 'HUB central Basauri (Bizkaia) - Nave 2',
        status: 'En selección',
        startDate: '2026-11-10',
        positions: [
            {
                id: 'POS-0050',
                title: 'Carretillero/a',
                category: 'Carretillero / Mozo especializado',
                turn: 'Turno de tarde (14:00 - 22:00)',
                rate: 'Convenio de almacenes y logística (Bizkaia)',
                requiredExperience: '1 año con carretilla frontal o retráctil',
                mandatoryRequirements: ['Carnet de carretillero en vigor (UNE 58451)', 'DNI/NIE en vigor'],
                plazasTotal: 4,
                plazas: [
                    { plazaNum: 1, status: 'Cubierta', candidateName: 'Unai García Zabaleta', candidateId: 'CAN-0131', assignedDate: '2026-10-20' },
                    { plazaNum: 2, status: 'Cubierta', candidateName: 'Carlos Manuel Ortiz Reyes', candidateId: 'CAN-0132', assignedDate: '2026-10-21' },
                    { plazaNum: 3, status: 'Pendiente del cliente', candidateName: 'David Aranguren Sola', candidateId: 'CAN-0202', assignedDate: '2026-10-20' },
                    { plazaNum: 4, status: 'Vacante', candidateName: null, candidateId: null }
                ]
            }
        ]
    },
    {
        id: 'PET-2026-0046',
        client: 'Hostelería & Eventos Premium BCN, S.L.',
        cif: 'B-99887766',
        workplace: 'Recinto de congresos - Barcelona',
        status: 'En difusión',
        startDate: '2026-11-05',
        positions: [
            {
                id: 'POS-0046',
                title: 'Cocinero/a de partida',
                category: 'Hostelería',
                turn: 'Jornada partida (08:30 - 17:30)',
                rate: 'ALEH - convenio estatal hostelería',
                requiredExperience: '2 años en cocina de banquetes',
                mandatoryRequirements: ['DNI/NIE en vigor', 'Carné de manipulador de alimentos'],
                plazasTotal: 2,
                plazas: [
                    { plazaNum: 1, status: 'Vacante', candidateName: null, candidateId: null },
                    { plazaNum: 2, status: 'Vacante', candidateName: null, candidateId: null }
                ]
            }
        ]
    },
    {
        id: 'PET-2026-0047',
        client: 'Hostelería & Eventos Premium BCN, S.L.',
        cif: 'B-99887766',
        workplace: 'Recinto de congresos - Barcelona',
        status: 'Nueva',
        startDate: '2026-11-12',
        positions: [
            {
                id: 'POS-0047',
                title: 'Camarero/a de barra',
                category: 'Hostelería',
                turn: 'Turno de noche (22:00 - 06:00)',
                rate: 'ALEH - convenio estatal hostelería',
                requiredExperience: '6 meses en barra',
                mandatoryRequirements: ['DNI/NIE en vigor', 'Carné de manipulador de alimentos'],
                plazasTotal: 3,
                plazas: [
                    { plazaNum: 1, status: 'Vacante', candidateName: null, candidateId: null },
                    { plazaNum: 2, status: 'Vacante', candidateName: null, candidateId: null },
                    { plazaNum: 3, status: 'Vacante', candidateName: null, candidateId: null }
                ]
            }
        ]
    }
];

// Personas que ya trabajan, se incorporan o terminaron una misión (las mismas que en Contratos y altas,
// Personal en misión y Horas e incidencias). Ficha resumida: el resto de datos se completa como en cualquier candidato.
const LETRAS_DNI = 'TRWAGMYFPDXBNJZSQVHLCKE';
const candidatoRecorrido = (n, nombreCompleto, { ciudad, provincia, km, centro, categoria, estado, mision, ultima, carnes = ['B'], turno, nie, dniCaducado, candidaturas }) => {
    const [name, ...resto] = nombreCompleto.split(' ');
    const lastName = resto.join(' ');
    const dni = nie || `0000${String(n).padStart(4, '0')}${LETRAS_DNI[n % 23]}`;
    const usuario = `${name}.${resto[0] || ''}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return {
        id: `CAN-0${n}`, name, lastName, dni, dniExpiry: nie || dniCaducado ? '2026-09-30' : '2030-06-30', dniStatus: 'OK',
        phone: `+34 600 000 ${String(n).padStart(3, '0')}`, email: `${usuario}@email.example`,
        city: ciudad, province: provincia, distance: `${km} km de ${centro}`,
        nss: `${provincia === 'Barcelona' ? '08' : '48'}/0000${String(n).padStart(4, '0')}/00`, nssStatus: 'OK',
        rgpdStatus: 'Vigente', rgpdSignedDate: '2026-06-15', source: 'Portal Web ETT', sourceId: `WEB-${n}`,
        lastContactDate: '2026-10-20', lastContactBy: 'Ane Uriarte', lastContactType: 'Llamada',
        status: estado, category: categoria, experienceYears: 2, drivingLicenses: carnes, hasCar: false,
        preferredShift: turno, skills: [], languages: ['Español (Nativo)'],
        activeCandidatures: mision ? [`${mision.petitionId} (Plaza ${mision.plazaNum})`] : [],
        assignedMission: mision || null,
        documents: [
            { name: `DNI_${name}.pdf`, type: 'DNI', status: nie || dniCaducado ? 'Caducado' : 'Verificado', uploadDate: '2026-06-15' },
            { name: `RGPD_${name}.pdf`, type: 'RGPD', status: 'Vigente', uploadDate: '2026-06-15' },
            ...(carnes.some(x => /carretill/i.test(x)) ? [{ name: `Carne_carretillero_${name}.pdf`, type: 'Certificado', status: 'Verificado', uploadDate: '2026-06-15', expiry: n === 131 ? '2026-11-20' : '2028-05-31' }] : [])
        ],
        communications: ultima ? [{ date: `${ultima.fecha} 10:00`, user: 'Ane Uriarte', channel: 'Llamada', result: ultima.resultado, note: ultima.nota }] : [],
        ...(candidaturas ? { candidaturas, activeCandidatures: candidaturas.map(x => `${x.petId} (${x.estado}${x.plaza ? `, plaza ${x.plaza}` : ''})`) } : {}),
    };
};
const misionDe = (petitionId, client, positionTitle, plazaNum, startDate) => ({ petitionId, client, positionId: `POS-${petitionId.slice(-4)}`, positionTitle, plazaNum, startDate });
const TRANSLOG = 'Trans-Logística Ibérica Norte, S.L.';
const HOSTELERIA = 'Hostelería & Eventos Premium BCN, S.L.';
const BIZKAIA = (ciudad, km) => ({ ciudad, provincia: 'Bizkaia', km, centro: 'Basauri' });
const BCN = (ciudad, km) => ({ ciudad, provincia: 'Barcelona', km, centro: 'Barcelona' });
// Personas en selección en Peticiones (las mismas, con la misma etapa: inscrito = Nuevo; el resto, En selección)
const enSeleccion = (n, nombre, lugar, categoria, petId, etapa, fecha, opciones = {}) => candidatoRecorrido(n, nombre, {
    ...lugar, categoria, turno: opciones.turno || 'Mañana / Tarde', carnes: opciones.carnes, dniCaducado: opciones.dniCaducado,
    estado: etapa === 'inscrito' ? 'Nuevo' : 'En entrevista',
    candidaturas: [{ petId, plaza: opciones.plaza || null, estado: etapa === 'propuesto' ? 'Propuesta al cliente' : 'En selección', fecha }],
});
const CARRETILLA = ['B', 'Carnet Carretillero UNE 58451'];
const MANIPULADOR = ['Manipulador de alimentos'];
const CANDIDATOS_SELECCION = [
    enSeleccion(201, 'Nerea Barandiarán Goikoetxea', BIZKAIA('Barakaldo', 14), 'Operario/a de almacén', 'PET-2026-0049', 'entrevista', '2026-10-24', { carnes: ['B', ...MANIPULADOR] }),
    enSeleccion(202, 'David Aranguren Sola', BIZKAIA('Santurtzi', 20), 'Carretillero/a', 'PET-2026-0050', 'propuesto', '2026-10-20', { carnes: CARRETILLA, turno: 'Mañana / Tarde / Noche', plaza: 3 }),
    enSeleccion(203, 'Yeray Fernández Ramos', BIZKAIA('Bilbao', 8), 'Operario/a de almacén', 'PET-2026-0049', 'preseleccionado', '2026-10-25', { turno: 'Mañana' }),
    enSeleccion(204, 'Kepa Iturriaga Elorrieta', BIZKAIA('Portugalete', 18), 'Carretillero/a', 'PET-2026-0050', 'entrevista', '2026-10-23', { carnes: CARRETILLA, turno: 'Tarde / Noche', dniCaducado: true }),
    enSeleccion(205, 'Sofía Valderrama Galdós', BIZKAIA('Galdakao', 4), 'Preparador/a de pedidos', 'PET-2026-0049', 'entrevista', '2026-10-22'),
    enSeleccion(206, 'Ibai Zubizarreta Lasa', BIZKAIA('Basauri', 1), 'Operario/a de almacén', 'PET-2026-0049', 'preseleccionado', '2026-10-26', { turno: 'Tarde' }),
    enSeleccion(207, 'Leire Ortuzar Bengoa', BIZKAIA('Etxebarri', 3), 'Operario/a de almacén', 'PET-2026-0049', 'inscrito', '2026-10-27', { turno: 'Mañana' }),
    enSeleccion(208, 'Gorka Bilbao Arrieta', BIZKAIA('Arrigorriaga', 5), 'Carretillero/a', 'PET-2026-0050', 'preseleccionado', '2026-10-26', { carnes: CARRETILLA, turno: 'Tarde' }),
    enSeleccion(301, 'Marina Soler Bosch', BCN('Barcelona', 3), 'Camarero/a', 'PET-2026-0047', 'inscrito', '2026-10-27', { carnes: MANIPULADOR, turno: 'Jornada partida / Noche' }),
    enSeleccion(302, 'Jordi Vila Mas', BCN("L'Hospitalet de Llobregat", 6), 'Cocinero/a', 'PET-2026-0046', 'entrevista', '2026-10-21', { carnes: MANIPULADOR, turno: 'Jornada partida' }),
    enSeleccion(303, 'Fatima Zahra El Idrissi', BCN('Badalona', 9), 'Ayudante de cocina', 'PET-2026-0046', 'inscrito', '2026-10-27', { carnes: MANIPULADOR, turno: 'Jornada partida / Mañana', dniCaducado: true }),
    enSeleccion(304, 'Álex Romero Gil', BCN('Barcelona', 4), 'Camarero/a de barra', 'PET-2026-0047', 'inscrito', '2026-10-28', { turno: 'Noche' }),
];
const CANDIDATOS_RECORRIDO = [
    // PET-2026-0044: en misión desde el 10/10 (Personal en misión)
    ...[['Garazi Uribe Arana', 1, 'Barcelona', 3], ['Pablo Ruiz Cano', 2, "L'Hospitalet de Llobregat", 6], ['Youssef Amrani', 4, 'Badalona', 9],
        ['Lucía Ferrer Sanz', 5, 'Barcelona', 4], ['Marc Puig Soler', 6, 'Cornellà de Llobregat', 10], ['Aitana Roca Vidal', 7, 'Sant Adrià de Besòs', 8],
        ['Daniel Sousa Prieto', 8, 'Barcelona', 2], ['Irene Campos Gil', 9, 'Esplugues de Llobregat', 7], ['Óscar León Mena', 10, 'Barcelona', 5]]
        .map(([nombre, plaza, ciudad, km], i) => candidatoRecorrido(110 + i, nombre, {
            ...BCN(ciudad, km), categoria: 'Camarero/a de sala', estado: 'Asignado/En misión', turno: 'Jornada partida',
            mision: misionDe('PET-2026-0044', HOSTELERIA, 'Camarero/a de sala', plaza, '2026-10-10'),
        })),
    candidatoRecorrido(119, 'Sara Benítez Lago', {
        ...BCN('Barcelona', 4), categoria: 'Camarero/a de sala', estado: 'No disponible', turno: 'Jornada partida',
        ultima: { fecha: '2026-10-16', resultado: 'Baja voluntaria', nota: 'Deja la plaza 3 de PET-2026-0044 por motivos personales.' },
    }),
    // PET-2026-0031: terminaron el 30/09
    ...['Clara Esteve Ros', 'Bruno Lage Costa', 'Nerea Olabarria Gil', 'Adrián Vela Soto', 'Paula Rius Ferrer', 'Sergio Navas Peña']
        .map((nombre, i) => candidatoRecorrido(120 + i, nombre, {
            ...BIZKAIA(['Basauri', 'Bilbao', 'Galdakao', 'Barakaldo', 'Etxebarri', 'Bilbao'][i], [1, 8, 4, 14, 3, 9][i]),
            categoria: 'Operario/a de almacén', estado: 'Disponible', turno: 'Turno de mañana',
            ultima: { fecha: '2026-09-30', resultado: 'Fin de misión', nota: 'Termina la campaña de verano en PET-2026-0031. Quiere repetir.' },
        })),
    // Se incorporan: siguen en Contratos y altas hasta su primer día
    ...[['Jon Ander Etxebarria Bilbao', 1, 'Bilbao', 9], ['Ainhoa Larrazabal Urkijo', 2, 'Galdakao', 4], ['Mamadou Diallo', 3, 'Basauri', 1, 'X0000000T'],
        ['Laura Morales San Sebastián', 4, 'Barakaldo', 14], ['Iker Agirrebeitia Mendia', 5, 'Etxebarri', 3]]
        .map(([nombre, plaza, ciudad, km, nie], i) => candidatoRecorrido(126 + i, nombre, {
            ...BIZKAIA(ciudad, km), categoria: 'Operario/a de almacén', estado: 'En incorporación', turno: 'Turno de mañana', nie,
            mision: misionDe('PET-2026-0048', TRANSLOG, 'Operario/a de almacén', plaza, '2026-11-03'),
        })),
    ...[['Unai García Zabaleta', 1, 'Leioa', 16], ['Carlos Manuel Ortiz Reyes', 2, 'Bilbao', 8]]
        .map(([nombre, plaza, ciudad, km], i) => candidatoRecorrido(131 + i, nombre, {
            ...BIZKAIA(ciudad, km), categoria: 'Carretillero/a', estado: 'En incorporación', turno: 'Turno de tarde', carnes: ['B', 'Carnet Carretillero UNE 58451'],
            mision: misionDe('PET-2026-0050', TRANSLOG, 'Carretillero/a', plaza, '2026-11-10'),
            // Unai ya trabajó con la ETT el verano de 2025 (se ve en su portal: contrato pasado y nóminas)
            candidaturas: i === 0 ? [
                { petId: 'PET-2026-0050', plaza, estado: 'Confirmada', fecha: '2026-11-10' },
                { petId: 'PET-2025-0087', plaza: null, estado: 'Finalizada', fecha: '2025-09-30', nota: 'Campaña de verano de 2025.' },
            ] : undefined,
        })),
    ...[['Noa Serra Pons', 1, 'Barcelona', 3], ['Hugo Martín Vera', 2, 'Badalona', 9], ['Ane Goikoetxea Ruiz', 3, 'Barcelona', 5], ['Iván Molina Prat', 4, "L'Hospitalet de Llobregat", 6]]
        .map(([nombre, plaza, ciudad, km], i) => candidatoRecorrido(133 + i, nombre, {
            ...BCN(ciudad, km), categoria: 'Ayudante de cocina', estado: 'En incorporación', turno: 'Jornada partida',
            mision: misionDe('PET-2026-0045', HOSTELERIA, 'Ayudante de cocina', plaza, '2026-11-05'),
        })),
    ...CANDIDATOS_SELECCION,
];

const CANDIDATOS_BASE = [
    {
        id: 'CAN-0101',
        name: 'Carlos',
        lastName: 'Gómez Moreno',
        dni: dniEjemplo(101),
        dniExpiry: '2028-11-14',
        dniStatus: 'OK', // OK, Caducado, Falta
        phone: '+34 600 000 101',
        email: 'carlos.gomez@example.com',
        city: 'Bilbao',
        province: 'Bizkaia',
        distance: '9 km de Basauri',
        nss: '48/00000101/00',
        nssStatus: 'OK',
        rgpdStatus: 'Vigente', // Vigente, Proximo, Caducado, Sin consentimiento
        rgpdSignedDate: '2025-09-12',
        source: 'InfoJobs',
        sourceId: 'INF-99824',
        lastContactDate: '2026-10-22',
        lastContactBy: 'Ana Gómez',
        lastContactType: 'Llamada telefónica',
        status: 'Disponible', // Nuevo, Pendiente de contactar, Contactado, En entrevista, Disponible, No disponible, Asignado/En misión, Descartado
        category: 'Operario de almacén / Mozo',
        experienceYears: 4,
        drivingLicenses: ['B', 'Carnet Carretillero UNE 58451'],
        hasCar: true,
        preferredShift: 'Indiferente (Mañana/Tarde/Noche)',
        skills: ['Picking con PDA', 'Radiofrecuencia', 'Carretilla frontal', 'Transpaleta eléctrica'],
        languages: ['Español (Nativo)'],
        activeCandidatures: [],
        assignedMission: null,
        documents: [
            { name: 'DNI_Anverso_Reverso.pdf', type: 'DNI', status: 'Verificado', uploadDate: '2025-09-12' },
            { name: 'Certificado_Carretillero_UNE.pdf', type: 'Certificado', status: 'Verificado', uploadDate: '2025-10-04' },
            { name: 'Consentimiento_RGPD_Firmado.pdf', type: 'RGPD', status: 'Vigente', uploadDate: '2025-09-12' },
            { name: 'CV_Carlos_Gomez_2026.pdf', type: 'CV', status: 'Actualizado', uploadDate: '2026-09-15' }
        ],
        communications: [
            { date: '2026-10-22 11:30', user: 'Ana Gómez', channel: 'Llamada', result: 'Interesado y disponible', note: 'Disponible para incorporación inmediata en turno de mañana o noche.', nextAction: 'Presentar a PET-2026-0049' },
            { date: '2026-09-15 09:40', user: 'Carlos M. (ETT)', channel: 'WhatsApp', result: 'Actualización CV', note: 'Envía carnet renovado de carretillero.' }
        ]
    },
    {
        id: 'CAN-0102',
        name: 'Marta',
        lastName: 'Rivas Valero',
        dni: dniEjemplo(102),
        dniExpiry: '2027-04-19',
        dniStatus: 'OK',
        phone: '+34 600 000 102',
        email: 'marta.rivas@example.com',
        city: 'Basauri',
        province: 'Bizkaia',
        distance: '1 km de Basauri',
        nss: '48/00000102/00',
        nssStatus: 'OK',
        rgpdStatus: 'Vigente',
        rgpdSignedDate: '2025-06-20',
        source: 'LinkedIn',
        sourceId: 'IN-448190',
        lastContactDate: '2026-10-18',
        lastContactBy: 'Ana Gómez',
        lastContactType: 'Email asignación',
        status: 'Disponible',
        category: 'Operario/a de almacén',
        experienceYears: 3,
        drivingLicenses: ['B', 'Carnet Carretillero UNE 58451'],
        hasCar: true,
        preferredShift: 'Turno Mañana',
        skills: ['Picking voz', 'Control de stock', 'Ubicaciones altas'],
        languages: ['Español (Nativo)', 'Inglés (B1)'],
        activeCandidatures: [],
        assignedMission: null,
        documents: [
            { name: 'DNI_Marta_Rivas.pdf', type: 'DNI', status: 'Verificado', uploadDate: '2025-06-20' },
            { name: 'Afiliacion_SS_Marta.pdf', type: 'NSS', status: 'Verificado', uploadDate: '2025-06-20' },
            { name: 'RGPD_Firmado_Digital.pdf', type: 'RGPD', status: 'Vigente', uploadDate: '2025-06-20' }
        ],
        communications: [
            { date: '2026-10-18 16:15', user: 'Ana Gómez', channel: 'Email', result: 'Disponible', note: 'Termina su última misión. Prefiere turno de mañana.' }
        ]
    },
    {
        id: 'CAN-0103',
        name: 'Mohamed',
        lastName: 'El Amrani',
        dni: nieEjemplo(103),
        dniExpiry: '2026-09-10', // Caducado Demo
        dniStatus: 'Caducado',
        phone: '+34 600 000 103',
        email: 'mohamed.elamrani@example.com',
        city: 'Barakaldo',
        province: 'Bizkaia',
        distance: '14 km de Basauri',
        nss: '48/00000103/00',
        nssStatus: 'OK',
        rgpdStatus: 'Próximo a caducar',
        rgpdSignedDate: '2024-03-15',
        source: 'Portal Web ETT',
        sourceId: 'WEB-1082',
        lastContactDate: '2026-10-26',
        lastContactBy: 'Lucía Santos',
        lastContactType: 'SMS Recordatorio',
        status: 'Pendiente de contactar',
        category: 'Carretillero retráctil / Mozo',
        experienceYears: 5,
        drivingLicenses: ['B', 'Carnet Carretillero UNE 58451'],
        hasCar: true,
        preferredShift: 'Turno Tarde / Noche',
        skills: ['Carretilla retráctil 12m', 'Carga contenedores', 'SGA SAP'],
        languages: ['Español (Fluido)', 'Árabe (Nativo)', 'Francés (Medio)'],
        activeCandidatures: [],
        assignedMission: null,
        documents: [
            { name: 'NIE_Amrani_Caducado.pdf', type: 'DNI/NIE', status: 'Caducado', uploadDate: '2024-03-15' },
            { name: 'Carnet_Retractil_UNE.pdf', type: 'Certificado', status: 'Verificado', uploadDate: '2025-02-10' }
        ],
        communications: [
            { date: '2026-10-10 10:15', user: 'Lucía Santos', channel: 'SMS', result: 'Solicitud renovación NIE', note: 'Enviado SMS automático para aportar resguardo renovación de tarjeta.' }
        ]
    },
    {
        id: 'CAN-0104',
        name: 'Elena',
        lastName: 'Sánchez Pascual',
        dni: dniEjemplo(104),
        dniExpiry: '2029-08-30',
        dniStatus: 'OK',
        phone: '+34 600 000 104',
        email: 'elena.sanchez.p@example.com',
        city: 'Galdakao',
        province: 'Bizkaia',
        distance: '4 km de Basauri',
        nss: 'FALTA',
        nssStatus: 'Falta',
        rgpdStatus: 'Vigente',
        rgpdSignedDate: '2026-09-10',
        source: 'Monster',
        sourceId: 'MON-33419',
        lastContactDate: '2026-10-23',
        lastContactBy: 'Ana Gómez',
        lastContactType: 'WhatsApp',
        status: 'En entrevista',
        category: 'Reponedora / Moza de almacén',
        experienceYears: 2,
        drivingLicenses: ['B'],
        hasCar: false,
        preferredShift: 'Turno Mañana o Tarde',
        skills: ['Reposición lineal', 'Inventarios', 'Etiquetado', 'Trato al cliente'],
        languages: ['Español (Nativo)'],
        activeCandidatures: ['PET-2026-0049 (En selección)'],
        assignedMission: null,
        documents: [
            { name: 'DNI_Elena_Sanchez.pdf', type: 'DNI', status: 'Verificado', uploadDate: '2026-09-10' },
            { name: 'RGPD_Firmado.pdf', type: 'RGPD', status: 'Vigente', uploadDate: '2026-09-10' }
        ],
        communications: [
            { date: '2026-10-23 12:00', user: 'Ana Gómez', channel: 'WhatsApp', result: 'Citada para entrevista', note: 'Entrevista telefónica técnica completada favorablemente. Pendiente aportar NSS.' }
        ]
    },
    {
        id: 'CAN-0105',
        name: 'David',
        lastName: 'Castillo Ruiz',
        dni: dniEjemplo(105),
        dniExpiry: '2030-01-14',
        dniStatus: 'OK',
        phone: '+34 600 000 105',
        email: 'david.castillo@example.com',
        city: 'Bilbao (Santutxu)',
        province: 'Bizkaia',
        distance: '6 km de Basauri',
        nss: '48/00000105/00',
        nssStatus: 'OK',
        rgpdStatus: 'Vigente',
        rgpdSignedDate: '2025-11-20',
        source: 'InfoJobs',
        sourceId: 'INF-88123',
        lastContactDate: '2026-10-20',
        lastContactBy: 'Ana Gómez',
        lastContactType: 'Llamada',
        status: 'En entrevista',
        category: 'Operario de almacén y logística',
        experienceYears: 3,
        drivingLicenses: ['B', 'Carnet Carretillero UNE 58451'],
        hasCar: true,
        preferredShift: 'Turno Mañana',
        skills: ['Picking radiofrecuencia', 'Preparación pedidos', 'Paletizado'],
        languages: ['Español (Nativo)'],
        activeCandidatures: ['PET-2026-0050 (En selección)'],
        assignedMission: null,
        documents: [
            { name: 'DNI_David_Castillo.pdf', type: 'DNI', status: 'Verificado', uploadDate: '2025-11-20' },
            { name: 'Certificado_Carretillas.pdf', type: 'Certificado', status: 'Verificado', uploadDate: '2025-11-20' },
            { name: 'RGPD_ETT_Global.pdf', type: 'RGPD', status: 'Vigente', uploadDate: '2025-11-20' }
        ],
        communications: [
            { date: '2026-10-20 15:40', user: 'Ana Gómez', channel: 'Llamada', result: 'Validada disponibilidad', note: 'Disponible para el turno de tarde de PET-2026-0050. Pendiente de entrevista.' }
        ]
    },
    {
        id: 'CAN-0106',
        name: 'Laura',
        lastName: 'Méndez Herrero',
        dni: dniEjemplo(106),
        dniExpiry: '2028-05-11',
        dniStatus: 'OK',
        phone: '+34 600 000 106',
        email: 'laura.mendez@example.com',
        city: 'Getxo',
        province: 'Bizkaia',
        distance: '20 km de Basauri',
        nss: '19/00000106/00',
        nssStatus: 'OK',
        rgpdStatus: 'Caducado', // Demo RGPD Caducado
        rgpdSignedDate: '2023-11-01',
        source: 'Alta Manual',
        sourceId: 'MAN-901',
        lastContactDate: '2026-09-08',
        lastContactBy: 'Javier Pons',
        lastContactType: 'Email',
        status: 'Disponible',
        category: 'Carretillera retráctil y frontal',
        experienceYears: 6,
        drivingLicenses: ['B', 'Carnet Carretillero UNE 58451'],
        hasCar: true,
        preferredShift: 'Turno Mañana o Tarde',
        skills: ['Trilateral', 'Retráctil 14m', 'Gestión de stocks', 'PRL Nivel Básico'],
        languages: ['Español (Nativo)'],
        activeCandidatures: [],
        assignedMission: null,
        documents: [
            { name: 'DNI_Laura_Mendez.pdf', type: 'DNI', status: 'Verificado', uploadDate: '2023-11-01' },
            { name: 'RGPD_Caducado.pdf', type: 'RGPD', status: 'Caducado', uploadDate: '2023-11-01' }
        ],
        communications: [
            { date: '2026-09-08 17:00', user: 'Javier Pons', channel: 'Email', result: 'Sondeo de interés', note: 'Indica que busca turnos fijos.' }
        ]
    },
    {
        id: 'CAN-0107',
        name: 'Andrés',
        lastName: 'Vidal Colomer',
        dni: dniEjemplo(107),
        dniExpiry: '2027-10-22',
        dniStatus: 'OK',
        phone: '+34 600 000 107',
        email: 'andres.vidal@example.com',
        city: 'Durango',
        province: 'Bizkaia',
        distance: '22 km de Basauri',
        nss: '48/00000107/00',
        nssStatus: 'OK',
        rgpdStatus: 'Vigente',
        rgpdSignedDate: '2026-10-01',
        source: 'LinkedIn',
        sourceId: 'IN-778219',
        lastContactDate: '2026-10-24',
        lastContactBy: 'Ana Gómez',
        lastContactType: 'Email',
        status: 'Nuevo',
        category: 'Reponedor / Mozo de carga y descarga',
        experienceYears: 1,
        drivingLicenses: ['B'],
        hasCar: true,
        preferredShift: 'Turno Noche',
        skills: ['Carga nocturna', 'Uso transpaleta manual', 'Clasificación paquetería'],
        languages: ['Español (Nativo)'],
        activeCandidatures: [],
        assignedMission: null,
        documents: [
            { name: 'DNI_Andres_Vidal.pdf', type: 'DNI', status: 'Verificado', uploadDate: '2026-10-01' },
            { name: 'RGPD_Andres.pdf', type: 'RGPD', status: 'Vigente', uploadDate: '2026-10-01' }
        ],
        communications: [
            { date: '2026-10-24 09:15', user: 'Ana Gómez', channel: 'Email', result: 'Envío cuestionario', note: 'Perfil recibido hoy desde LinkedIn. Buen encaje para turno nocturno.' }
        ]
    },
    {
        id: 'CAN-0108',
        name: 'Javier',
        lastName: 'Navarro Gil',
        dni: dniEjemplo(108),
        dniExpiry: '2028-09-09',
        dniStatus: 'OK',
        phone: '+34 600 000 108',
        email: 'javier.navarro@example.com',
        city: 'Etxebarri',
        province: 'Bizkaia',
        distance: '3 km de Basauri',
        nss: '48/00000108/00',
        nssStatus: 'OK',
        rgpdStatus: 'Vigente',
        rgpdSignedDate: '2025-08-14',
        source: 'Portal Web ETT',
        sourceId: 'WEB-9921',
        lastContactDate: '2026-10-15',
        lastContactBy: 'Ana Gómez',
        lastContactType: 'Llamada asignación',
        status: 'Disponible',
        category: 'Reponedor nocturno / Carretillero',
        experienceYears: 4,
        drivingLicenses: ['B', 'Carnet Carretillero UNE 58451'],
        hasCar: true,
        preferredShift: 'Turno Noche',
        skills: ['Carga/descarga', 'Manejo apiladores', 'Trabajo en equipo'],
        languages: ['Español (Nativo)'],
        activeCandidatures: [],
        assignedMission: null,
        documents: [
            { name: 'DNI_Javier_Navarro.pdf', type: 'DNI', status: 'Verificado', uploadDate: '2025-08-14' },
            { name: 'SS_Javier.pdf', type: 'NSS', status: 'Verificado', uploadDate: '2025-08-14' }
        ],
        communications: [
            { date: '2026-10-15 11:20', user: 'Ana Gómez', channel: 'Llamada', result: 'Disponible', note: 'Disponible para turno de noche en Basauri.' }
        ]
    },
    ...CANDIDATOS_RECORRIDO,
];

// Estado del candidato -> texto y color. Mismos colores que el resto de la app (ver src/ui/Badge.tsx).

const item = (nombre, grupo, ...sinonimos) => ({ nombre, grupo, sinonimos });
const CATALOGOS_INICIALES = {
    perfiles: [
        item('Operario/a de almacén', 'Logística', 'mozo de almacén', 'mozo', 'moza de almacén', 'operario de almacén / mozo', 'operario de almacén y logística', 'mozo de almacén y picking', 'operario logístico'),
        item('Preparador/a de pedidos', 'Logística', 'picking', 'preparadora de pedidos', 'pickeador'),
        item('Carretillero/a', 'Logística', 'carretillero', 'carretillera', 'conductor de carretilla', 'toro', 'carretillero retráctil', 'carretillero frontal', 'mozo especializado', 'carretillero / mozo especializado', 'carretillero retráctil / mozo', 'carretillera retráctil y frontal', 'carretillero / mozo frontal'),
        item('Reponedor/a', 'Logística', 'reponedor', 'reponedor nocturno', 'reponedora', 'repositor', 'reponedora / moza de almacén', 'reponedor / carga y descarga', 'reponedora / inventarista'),
        item('Mozo/a de carga y descarga', 'Logística', 'carga y descarga', 'descargador'),
        item('Inventarista', 'Logística', 'auxiliar de inventario'),
        item('Conductor/a repartidor/a', 'Transporte', 'repartidor', 'repartidora', 'driver', 'conductor / repartidor', 'chófer de reparto'),
        item('Conductor/a de camión', 'Transporte', 'camionero', 'camionera', 'conductor C+E', 'trailero'),
        item('Operario/a de producción', 'Industria', 'peón', 'peón de fábrica', 'operario de fábrica', 'operaria de producción'),
        item('Operario/a de envasado', 'Industria', 'envasador', 'envasadora', 'operario de línea'),
        item('Soldador/a', 'Industria', 'soldadora', 'soldador TIG', 'soldador MIG'),
        item('Mecánico/a de mantenimiento', 'Industria', 'técnico de mantenimiento', 'mantenimiento industrial'),
        item('Electricista', 'Industria', 'oficial electricista'),
        item('Camarero/a', 'Hostelería', 'camarera', 'camarero de sala', 'camarero/a de sala', 'camarera de sala', 'mesero'),
        item('Camarero/a de barra', 'Hostelería', 'barman', 'bartender', 'coctelero'),
        item('Cocinero/a', 'Hostelería', 'cocinera', 'jefe de partida', 'chef'),
        item('Ayudante de cocina', 'Hostelería', 'pinche', 'auxiliar de cocina'),
        item('Friegaplatos', 'Hostelería', 'office', 'lavaplatos'),
        item('Camarero/a de pisos', 'Hostelería', 'camarera de pisos', 'gobernanta', 'limpieza de habitaciones'),
        item('Dependiente/a', 'Comercio', 'dependienta', 'vendedor', 'vendedora', 'dependiente de tienda'),
        item('Cajero/a', 'Comercio', 'cajera'),
        item('Promotor/a', 'Comercio', 'promotora', 'azafato de promoción'),
        item('Azafato/a de eventos', 'Comercio', 'azafata', 'azafata de eventos', 'azafato'),
        item('Limpiador/a', 'Limpieza', 'limpiadora', 'personal de limpieza', 'limpieza'),
        item('Administrativo/a', 'Oficina', 'administrativa', 'auxiliar administrativo', 'auxiliar administrativa'),
        item('Recepcionista', 'Oficina', 'recepción'),
        item('Teleoperador/a', 'Oficina', 'teleoperadora', 'agente de call center', 'call center'),
        item('Peón agrícola', 'Agricultura', 'jornalero', 'jornalera', 'recolector', 'temporero'),
        item('Peón de construcción', 'Construcción', 'peón de obra', 'peón albañil'),
        item('Albañil', 'Construcción', 'oficial de albañilería'),
        item('Auxiliar de geriatría', 'Cuidados', 'gerocultor', 'gerocultora', 'auxiliar de residencia'),
        item('Celador/a', 'Cuidados', 'celadora'),
    ],
    carnes: [
        item('Permiso B', 'Permiso de conducir', 'carnet B', 'carné B', 'B', 'carnet de coche'),
        item('Permiso C1', 'Permiso de conducir', 'C1'),
        item('Permiso C', 'Permiso de conducir', 'C', 'carnet de camión'),
        item('Permiso C+E', 'Permiso de conducir', 'C+E', 'CE', 'carnet de tráiler'),
        item('Permiso D', 'Permiso de conducir', 'D', 'carnet de autobús'),
        item('CAP', 'Permiso de conducir', 'certificado de aptitud profesional'),
        item('ADR (mercancías peligrosas)', 'Permiso de conducir', 'ADR', 'mercancías peligrosas'),
        item('Carné de carretillero', 'Carné profesional', 'carnet carretillero', 'carnet carretillero UNE 58451', 'carnet de carretillas', 'UNE 58451', 'carné de carretillas', 'carnet toro'),
        item('Plataforma elevadora (PEMP)', 'Carné profesional', 'PEMP', 'plataforma elevadora', 'carnet de plataforma'),
        item('Puente grúa', 'Carné profesional', 'carnet puente grúa'),
        item('Manipulador/a de alimentos', 'Carné profesional', 'manipuladora de alimentos', 'carnet de manipulador', 'manipulador'),
        item('Formación PRL 20 h', 'Prevención', 'PRL 20h', 'PRL básico 20 h'),
        item('Formación PRL 60 h', 'Prevención', 'PRL 60h', 'PRL básico 60h', 'PRL nivel básico'),
        item('Otros', 'Otros', 'otro', 'otros carnés', 'otros permisos'),
    ],
    habilidades: [
        item('Picking con radiofrecuencia', 'Almacén', 'picking RF', 'picking radiofrecuencia', 'picking con PDA', 'radiofrecuencia', 'PDA', 'picking por radiofrecuencia'),
        item('Picking por voz', 'Almacén', 'picking voz', 'voice picking'),
        item('Preparación de pedidos', 'Almacén', 'preparación pedidos'),
        item('Carretilla frontal', 'Almacén', 'frontal'),
        item('Carretilla retráctil', 'Almacén', 'retráctil', 'carretilla retráctil 12m', 'retráctil 14m'),
        item('Carretilla trilateral', 'Almacén', 'trilateral'),
        item('Transpaleta eléctrica', 'Almacén', 'apilador', 'manejo apiladores', 'apilador eléctrico'),
        item('Transpaleta manual', 'Almacén', 'uso transpaleta manual', 'transpaleta'),
        item('Paletizado', 'Almacén', 'paletizar', 'filmado'),
        item('Carga y descarga', 'Almacén', 'carga/descarga', 'carga nocturna', 'carga contenedores', 'descarga de camiones'),
        item('Ubicación en altura', 'Almacén', 'ubicaciones altas'),
        item('Control de stock', 'Almacén', 'gestión de stocks', 'stock'),
        item('Inventario', 'Almacén', 'inventarios', 'recuento'),
        item('Reposición', 'Almacén', 'reposición lineal', 'reponer'),
        item('Etiquetado', 'Almacén', 'etiquetar'),
        item('Clasificación de paquetería', 'Almacén', 'clasificación paquetería', 'sorter'),
        item('SGA / SAP', 'Herramientas', 'SGA SAP', 'SAP', 'SGA', 'sistema de gestión de almacén'),
        item('Ofimática', 'Herramientas', 'office', 'excel', 'word'),
        item('Atención al cliente', 'Personales', 'trato al cliente', 'servicio al cliente'),
        item('Trabajo en equipo', 'Personales', 'equipo'),
        item('Disponibilidad horaria', 'Personales', 'disponibilidad', 'disponibilidad inmediata', 'incorporación rápida'),
    ],
    idiomas: ['Español', 'Inglés', 'Francés', 'Alemán', 'Italiano', 'Portugués', 'Catalán', 'Euskera', 'Gallego', 'Árabe', 'Rumano', 'Chino'],
};
const NIVELES_IDIOMA = ['Nativo', 'C2', 'C1', 'B2', 'B1', 'A2', 'A1'];
// Niveles escritos a mano en datos antiguos
const NIVEL_EQUIVALENTE = { fluido: 'C1', alto: 'C1', medio: 'B1', intermedio: 'B1', basico: 'A2', 'básico': 'A2', nativa: 'Nativo', nativo: 'Nativo' };

const normalizarTexto = (t = '') => t.toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const buscarExacto = (lista, texto) => {
    const n = normalizarTexto(texto);
    return lista.find(x => normalizarTexto(x.nombre) === n || x.sinonimos.some(s => normalizarTexto(s) === n));
};
const canonico = (lista, texto) => buscarExacto(lista, texto)?.nombre || texto;
const canonicos = (lista, valores = []) => [...new Set(valores.map(v => canonico(lista, v)))];
const normalizarIdioma = (texto) => {
    const m = texto.match(/^\s*([^(]+?)\s*(?:\((.+)\))?\s*$/);
    if (!m) return texto;
    const idioma = CATALOGOS_INICIALES.idiomas.find(i => normalizarTexto(i) === normalizarTexto(m[1])) || m[1];
    const nivel = m[2] ? (NIVEL_EQUIVALENTE[normalizarTexto(m[2])] || m[2]) : 'B1';
    return `${idioma} (${nivel})`;
};
// Pasa los valores escritos a mano al nombre del listado. Si el texto antiguo traía varios perfiles
// ("Reponedor nocturno / Carretillero"), el primero es el principal y los demás pasan a otros perfiles.
const perfilesDeTexto = (texto = '') => {
    const entero = buscarExacto(CATALOGOS_INICIALES.perfiles, texto);
    if (entero) return [entero.nombre];
    return [...new Set(texto.split('/').map(p => canonico(CATALOGOS_INICIALES.perfiles, p.trim())).filter(Boolean))];
};
const homogeneizar = (c) => {
    const [principal, ...resto] = perfilesDeTexto(c.category);
    return {
    ...c,
    category: principal || c.category,
    otherProfiles: [...new Set([...resto, ...canonicos(CATALOGOS_INICIALES.perfiles, c.otherProfiles)])].filter(p => p !== principal),
    drivingLicenses: canonicos(CATALOGOS_INICIALES.carnes, c.drivingLicenses),
    skills: canonicos(CATALOGOS_INICIALES.habilidades, c.skills),
    languages: [...new Set((c.languages || []).map(normalizarIdioma))],
    };
};

// Caducidades de ejemplo de documentos que no son el DNI ni el RGPD
const CADUCIDADES_DEMO = {
    'Certificado_Carretillero_UNE.pdf': '2026-11-15',
    'Carnet_Retractil_UNE.pdf': '2026-09-30',
    'Certificado_Carretillas.pdf': '2029-11-20',
};
const TIPO_NORMALIZADO = { DNI: 'DNI/NIE', NSS: 'Seguridad Social' };

const cpDePoblacion = (ciudad = '') => Object.entries(POBLACIONES_CP).find(([, p]) => ciudad.startsWith(p))?.[0] || '';
// Datos personales y experiencia de ejemplo de los candidatos de la base (el resto los tiene sin rellenar)
const DATOS_EXTRA = {
    'CAN-0101': { fechaNacimiento: '1992-04-18', nacionalidad: 'Española', direccion: 'C/ Ejemplo 3, 2º B', iban: 'ES00 0000 0000 0000 0000 0101',
        experiencias: [{ empresa: 'Distribuciones Ejemplo, S.L.', puesto: 'Operario/a de almacén', desde: '2021-03', hasta: '2025-12', funciones: 'Picking con PDA y carga de camiones.' }],
        formacion: [{ titulo: 'Curso de carretillas elevadoras (UNE 58451)', centro: 'Centro de formación de ejemplo', anio: '2022' }] },
    'CAN-0102': { fechaNacimiento: '1995-09-02', nacionalidad: 'Española', direccion: 'Av. Ejemplo 14, 1º A', iban: 'ES00 0000 0000 0000 0000 0102',
        experiencias: [{ empresa: 'Logística Ejemplo, S.A.', puesto: 'Preparador/a de pedidos', desde: '2023-01', hasta: '2026-06', funciones: 'Preparación de pedidos y control de stock.' }] },
    'CAN-0103': { fechaNacimiento: '1988-12-11', nacionalidad: 'Marroquí', direccion: 'C/ Ejemplo 22, bajo' },
    'CAN-0104': { fechaNacimiento: '1999-06-25', nacionalidad: 'Española' },
    'CAN-0105': { fechaNacimiento: '1993-02-14', nacionalidad: 'Española', direccion: 'C/ Ejemplo 7, 3º D', iban: 'ES00 0000 0000 0000 0000 0105' },
};
const completarCandidato = (c) => ({
    ...c,
    fechaNacimiento: '', nacionalidad: '', direccion: '', iban: '', experiencias: [], formacion: [],
    codigoPostal: cpDePoblacion(c.city),
    ...DATOS_EXTRA[c.id],
    otherProfiles: c.otherProfiles || [],
    turnos: c.turnos || turnosDesde(c.preferredShift),
    incorporacion: c.incorporacion || 'Inmediata',
    incorporacionFecha: c.incorporacionFecha || '',
    radioKm: c.radioKm ?? 25,
    notasDisponibilidad: c.notasDisponibilidad || '',
    avisoAutomatico: c.avisoAutomatico ?? true,
    documents: (c.documents || []).map((d, i) => {
        const type = d.type === 'Certificado' ? (/carretill|retractil/i.test(d.name) ? 'Carné de carretillero' : 'Otro') : (TIPO_NORMALIZADO[d.type] || d.type);
        let expiry = d.expiry ?? CADUCIDADES_DEMO[d.name] ?? null;
        if (type === 'DNI/NIE') expiry = c.dniExpiry;
        if (type === 'RGPD' && d.expiry === undefined) {
            expiry = c.rgpdStatus === 'Caducado' ? '2025-11-01' : c.rgpdStatus === 'Próximo a caducar' ? '2026-11-20' : sumarAnios(c.rgpdSignedDate || d.uploadDate, 3);
        }
        return { ...d, id: d.id || `${c.id}-doc-${i}`, type, expiry };
    }),
});

// Puesto, turno, cliente y centro de cada petición (las mismas que en Peticiones). Una petición = un puesto.
const PETICIONES_INFO = {
    'PET-2026-0031': { puesto: 'Mozo/a de almacén', turno: 'Turno de mañana', cliente: TRANSLOG, centro: 'HUB central Basauri (Bizkaia) - Nave 2', inicio: '2026-07-01', fin: '2026-09-30' },
    'PET-2026-0044': { puesto: 'Camarero/a de sala', turno: 'Jornada partida', cliente: HOSTELERIA, centro: 'Recinto de congresos - Barcelona', inicio: '2026-10-10', fin: '2026-11-30' },
    'PET-2026-0045': { puesto: 'Ayudante de cocina', turno: 'Jornada partida', cliente: HOSTELERIA, centro: 'Recinto de congresos - Barcelona', inicio: '2026-11-05', fin: '2026-11-30' },
    'PET-2026-0046': { puesto: 'Cocinero/a de partida', turno: 'Jornada partida', cliente: HOSTELERIA, centro: 'Recinto de congresos - Barcelona', inicio: '2026-11-05', fin: '2026-11-30' },
    'PET-2026-0047': { puesto: 'Camarero/a de barra', turno: 'Turno de noche', cliente: HOSTELERIA, centro: 'Recinto de congresos - Barcelona', inicio: '2026-11-12', fin: '2026-11-30' },
    'PET-2026-0048': { puesto: 'Operario/a de almacén', turno: 'Turno de mañana', cliente: TRANSLOG, centro: 'HUB central Basauri (Bizkaia) - Nave 2', inicio: '2026-11-03', fin: '2027-01-29' },
    'PET-2026-0049': { puesto: 'Operario/a de almacén', turno: 'Turno de tarde', cliente: TRANSLOG, centro: 'HUB central Basauri (Bizkaia) - Nave 2', inicio: '2026-11-03', fin: '2027-01-29' },
    'PET-2025-0087': { puesto: 'Mozo/a de almacén', turno: 'Turno de mañana', cliente: TRANSLOG, centro: 'HUB central Basauri (Bizkaia) - Nave 2', inicio: '2025-07-01', fin: '2025-09-30' },
    'PET-2026-0050': { puesto: 'Carretillero/a', turno: 'Turno de tarde', cliente: TRANSLOG, centro: 'HUB central Basauri (Bizkaia) - Nave 2', inicio: '2026-11-10', fin: '2027-01-29' },
};
// Candidaturas de ejemplo a partir de los datos de cada persona
const candidaturasIniciales = (c) => {
    const lista = [];
    if (c.assignedMission) {
        lista.push({ petId: c.assignedMission.petitionId, plaza: c.assignedMission.plazaNum, estado: c.status === 'En incorporación' ? 'Confirmada' : 'En misión', fecha: c.assignedMission.startDate });
    }
    (c.activeCandidatures || []).forEach(s => {
        const petId = s.slice(0, 13);
        if (!lista.some(x => x.petId === petId) && PETICIONES_INFO[petId]) lista.push({ petId, plaza: null, estado: 'En selección', fecha: c.lastContactDate });
    });
    (c.communications || []).forEach(m => {
        const petId = (m.note.match(/PET-\d{4}-\d{4}/) || [])[0];
        if (!petId || lista.some(x => x.petId === petId)) return;
        if (m.result === 'Fin de misión') lista.push({ petId, plaza: null, estado: 'Finalizada', fecha: m.date.slice(0, 10), nota: m.note });
        if (m.result === 'Baja voluntaria') lista.push({ petId, plaza: Number((m.note.match(/plaza (\d+)/) || [])[1]) || null, estado: 'Baja', fecha: m.date.slice(0, 10), nota: m.note });
    });
    return lista;
};

const INITIAL_CANDIDATES = CANDIDATOS_BASE.map(c => homogeneizar(completarCandidato(c))).map(c => ({ ...c, candidaturas: c.candidaturas || candidaturasIniciales(c) }));

/** Los datos de ejemplo de Candidatos: personas (ya completas y con los nombres de los listados), peticiones con sus
 * plazas, listados con sinónimos y datos de cada petición. Copias nuevas en cada llamada. */
export function ejemploCandidatos() {
    return structuredClone({ candidatos: INITIAL_CANDIDATES, peticiones: INITIAL_PETITIONS, catalogos: CATALOGOS_INICIALES, peticionesInfo: PETICIONES_INFO });
}
