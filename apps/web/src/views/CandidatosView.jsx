// Partió de design/candidatos.html (scripts/import-design.py). Ahora se edita aquí directamente: no regenerar.
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    Users, UserPlus, UserCheck, Briefcase, FileText, CheckCircle2, AlertTriangle, 
    XCircle, Search, Filter, Phone, Mail, MessageSquare, Send, Calendar, Clock, 
    MapPin, Shield, ShieldAlert, Award, FileUp, Download, Eye, Edit3, Trash2, 
    ChevronRight, ChevronDown, Check, X, ArrowRight, Layers, Sparkles, Building2, 
    Building, HelpCircle, AlertCircle, RefreshCw, MoreVertical, Plus, ExternalLink, 
    PhoneCall, Smartphone, CheckSquare, Square, CornerDownRight, FileBadge, Info,
    Copy, Star, Hash, FileCheck2, UserX, AlertOctagon, Share2, ArrowUpRight,
    Grid, List, SlidersHorizontal, ArrowLeft, BookmarkCheck, UploadCloud, ChevronLeft
} from 'lucide-react';
import { Page, PageHeader, Card, SectionTitle, KpiTile, EmptyState, Notice, Button, IconButton, Badge, Avatar, SearchInput, Select, Field, TextInput, Interruptor, Segmented, Tabs, Drawer, Modal, Confirmar } from '../ui';

// ==========================================
// DEMO INITIAL DATA & CONFIGURATION
// ==========================================
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
                    { plazaNum: 3, status: 'Pendiente del cliente', candidateName: 'David Aranguren Sola', candidateId: null, assignedDate: '2026-10-24' },
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
const candidatoRecorrido = (n, nombreCompleto, { ciudad, provincia, km, centro, categoria, estado, mision, ultima, carnes = ['B'], turno, nie }) => {
    const [name, ...resto] = nombreCompleto.split(' ');
    const lastName = resto.join(' ');
    const dni = nie || `0000${String(n).padStart(4, '0')}${LETRAS_DNI[n % 23]}`;
    const usuario = `${name}.${resto[0] || ''}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return {
        id: `CAN-0${n}`, name, lastName, dni, dniExpiry: nie ? '2026-09-30' : '2030-06-30', dniStatus: 'OK',
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
            { name: `DNI_${name}.pdf`, type: 'DNI', status: nie ? 'Caducado' : 'Verificado', uploadDate: '2026-06-15' },
            { name: `RGPD_${name}.pdf`, type: 'RGPD', status: 'Vigente', uploadDate: '2026-06-15' }
        ],
        communications: ultima ? [{ date: `${ultima.fecha} 10:00`, user: 'Ane Uriarte', channel: 'Llamada', result: ultima.resultado, note: ultima.nota }] : [],
    };
};
const misionDe = (petitionId, client, positionTitle, plazaNum, startDate) => ({ petitionId, client, positionId: `POS-${petitionId.slice(-4)}`, positionTitle, plazaNum, startDate });
const TRANSLOG = 'Trans-Logística Ibérica Norte, S.L.';
const HOSTELERIA = 'Hostelería & Eventos Premium BCN, S.L.';
const BIZKAIA = (ciudad, km) => ({ ciudad, provincia: 'Bizkaia', km, centro: 'Basauri' });
const BCN = (ciudad, km) => ({ ciudad, provincia: 'Barcelona', km, centro: 'Barcelona' });
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
        })),
    ...[['Noa Serra Pons', 1, 'Barcelona', 3], ['Hugo Martín Vera', 2, 'Badalona', 9], ['Ane Goikoetxea Ruiz', 3, 'Barcelona', 5], ['Iván Molina Prat', 4, "L'Hospitalet de Llobregat", 6]]
        .map(([nombre, plaza, ciudad, km], i) => candidatoRecorrido(133 + i, nombre, {
            ...BCN(ciudad, km), categoria: 'Ayudante de cocina', estado: 'En incorporación', turno: 'Jornada partida',
            mision: misionDe('PET-2026-0045', HOSTELERIA, 'Ayudante de cocina', plaza, '2026-11-05'),
        })),
];

const CANDIDATOS_BASE = [
    {
        id: 'CAN-0101',
        name: 'Carlos',
        lastName: 'Gómez Moreno',
        dni: '53982145X',
        dniExpiry: '2028-11-14',
        dniStatus: 'OK', // OK, Caducado, Falta
        phone: '+34 611 234 567',
        email: 'carlos.gomez@email.es',
        city: 'Bilbao',
        province: 'Bizkaia',
        distance: '9 km de Basauri',
        nss: '48/12345678/90',
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
        dni: '48201934P',
        dniExpiry: '2027-04-19',
        dniStatus: 'OK',
        phone: '+34 670 981 234',
        email: 'marta.rivas@talent.org',
        city: 'Basauri',
        province: 'Bizkaia',
        distance: '1 km de Basauri',
        nss: '48/99887766/12',
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
        dni: 'X8923412K',
        dniExpiry: '2026-09-10', // Caducado Demo
        dniStatus: 'Caducado',
        phone: '+34 633 445 566',
        email: 'mohamed.elamrani@mail.com',
        city: 'Barakaldo',
        province: 'Bizkaia',
        distance: '14 km de Basauri',
        nss: '48/44332211/09',
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
        dni: '02891277W',
        dniExpiry: '2029-08-30',
        dniStatus: 'OK',
        phone: '+34 689 112 233',
        email: 'elena.sanchez.p@fastmail.com',
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
        dni: '50449912K',
        dniExpiry: '2030-01-14',
        dniStatus: 'OK',
        phone: '+34 654 321 987',
        email: 'david.castillo.log@outlook.com',
        city: 'Bilbao (Santutxu)',
        province: 'Bizkaia',
        distance: '6 km de Basauri',
        nss: '48/77665544/88',
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
        dni: '09128374L',
        dniExpiry: '2028-05-11',
        dniStatus: 'OK',
        phone: '+34 612 889 900',
        email: 'laura.mendez.h@gmail.com',
        city: 'Getxo',
        province: 'Bizkaia',
        distance: '20 km de Basauri',
        nss: '19/11223344/55',
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
        dni: '47182930Q',
        dniExpiry: '2027-10-22',
        dniStatus: 'OK',
        phone: '+34 644 123 789',
        email: 'andres.vidal@empresa.com',
        city: 'Durango',
        province: 'Bizkaia',
        distance: '22 km de Basauri',
        nss: '48/65432109/88',
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
        dni: '51928374M',
        dniExpiry: '2028-09-09',
        dniStatus: 'OK',
        phone: '+34 622 901 823',
        email: 'javier.navarro@live.com',
        city: 'Etxebarri',
        province: 'Bizkaia',
        distance: '3 km de Basauri',
        nss: '48/90123456/77',
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
// ==========================================
// LISTADOS HOMOGÉNEOS (perfiles, carnés, habilidades e idiomas)
// Cada valor tiene un nombre único y sus sinónimos: se busca por cualquiera de ellos y se guarda siempre el nombre.
// En real serán tablas maestras ampliables desde la ficha.
// ==========================================
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
// Texto con nombres y sinónimos de perfiles, carnés y habilidades, para que la búsqueda encuentre por cualquiera
const textoBuscable = (c, catalogos) => {
    const con = (lista, valores) => valores.flatMap(v => { const x = buscarExacto(lista, v); return x ? [x.nombre, ...x.sinonimos] : [v]; });
    return normalizarTexto([
        ...con(catalogos.perfiles, [c.category, ...(c.otherProfiles || [])]),
        ...con(catalogos.carnes, c.drivingLicenses || []),
        ...con(catalogos.habilidades, c.skills || []),
        ...(c.languages || []),
    ].join(' | '));
};

// Selector con búsqueda sobre un listado: sugiere por nombre o sinónimo y permite añadir un valor nuevo al listado
function SelectorCatalogo({ lista, valores, onChange, onAnadir, placeholder, unico = false }) {
    const [texto, setTexto] = useState('');
    const [abierto, setAbierto] = useState(false);
    const n = normalizarTexto(texto);
    const exacto = n ? buscarExacto(lista, texto) : null;
    const sugerencias = (n
        ? lista.filter(x => normalizarTexto(x.nombre).includes(n) || x.sinonimos.some(s => normalizarTexto(s).includes(n)))
        : lista
    ).filter(x => !valores.includes(x.nombre)).slice(0, 8);
    const elegir = (nombre) => {
        onChange(unico ? [nombre] : [...valores, nombre]);
        setTexto('');
        setAbierto(false);
    };
    const anadirNuevo = () => {
        const nombre = texto.trim().replace(/^./, (l) => l.toUpperCase());
        onAnadir(nombre);
        elegir(nombre);
    };
    return (
        <div className="space-y-2">
            {!unico && (
                <div className="flex flex-wrap gap-1.5">
                    {valores.length === 0 && <span className="text-xs text-slate-400">Ninguno</span>}
                    {valores.map(v => (
                        <span key={v} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
                            {v}
                            <button type="button" onClick={() => onChange(valores.filter(x => x !== v))} aria-label={`Quitar ${v}`} className="text-slate-400 hover:text-rose-600">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <TextInput
                    className="pl-8!"
                    value={texto}
                    placeholder={unico && valores[0] ? `${valores[0]} · escribe para cambiarlo` : placeholder}
                    onChange={(e) => { setTexto(e.target.value); setAbierto(true); }}
                    onFocus={() => setAbierto(true)}
                    onBlur={() => setTimeout(() => setAbierto(false), 150)}
                    onKeyDown={(e) => {
                        if (e.key !== 'Enter') return;
                        e.preventDefault();
                        if (exacto && !valores.includes(exacto.nombre)) elegir(exacto.nombre);
                        else if (!exacto && texto.trim()) anadirNuevo();
                    }}
                />
                {abierto && (sugerencias.length > 0 || (n && !exacto)) && (
                    <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg py-1 text-xs">
                        {sugerencias.map(x => {
                            const porSinonimo = n && !normalizarTexto(x.nombre).includes(n) ? x.sinonimos.find(s => normalizarTexto(s).includes(n)) : null;
                            return (
                                <button key={x.nombre} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => elegir(x.nombre)} className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 flex items-center justify-between gap-2">
                                    <span className="text-slate-800">{x.nombre}{porSinonimo && <span className="text-slate-400"> · también «{porSinonimo}»</span>}</span>
                                    <span className="text-[11px] text-slate-400 shrink-0">{x.grupo}</span>
                                </button>
                            );
                        })}
                        {n && !exacto && (
                            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={anadirNuevo} className="w-full text-left px-3 py-1.5 text-indigo-700 hover:bg-indigo-50 border-t border-slate-100 flex items-center gap-1.5">
                                <Plus className="w-3.5 h-3.5" /> Añadir «{texto.trim()}» al listado
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// Idiomas: idioma del listado + nivel, siempre con el mismo formato "Inglés (B1)"
function SelectorIdiomas({ valores, onChange, idiomas, onAnadirIdioma }) {
    const [idioma, setIdioma] = useState('');
    const [nivel, setNivel] = useState('B1');
    const anadir = () => {
        if (!idioma) return;
        const resto = valores.filter(v => !v.startsWith(`${idioma} (`));
        onChange([...resto, `${idioma} (${nivel})`]);
        setIdioma('');
    };
    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
                {valores.length === 0 && <span className="text-xs text-slate-400">Ninguno</span>}
                {valores.map(v => (
                    <span key={v} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {v}
                        <button type="button" onClick={() => onChange(valores.filter(x => x !== v))} aria-label={`Quitar ${v}`} className="text-slate-400 hover:text-rose-600">
                            <X className="w-3 h-3" />
                        </button>
                    </span>
                ))}
            </div>
            <div className="grid grid-cols-[1fr_110px_auto] gap-2 items-start">
                <SelectorCatalogo unico lista={idiomas.map(i => item(i, 'Idioma'))} valores={idioma ? [idioma] : []} onChange={(v) => setIdioma(v[0])} onAnadir={onAnadirIdioma} placeholder="Busca un idioma" />
                <Select value={nivel} onChange={(e) => setNivel(e.target.value)} aria-label="Nivel" className="w-full">
                    {NIVELES_IDIOMA.map(x => <option key={x} value={x}>{x}</option>)}
                </Select>
                <Button size="sm" icon={Plus} onClick={anadir} disabled={!idioma} className="h-8">Añadir</Button>
            </div>
        </div>
    );
}

// ==========================================
// DOCUMENTOS: CADUCIDAD Y AVISOS
// ==========================================
// Días antes de caducar en los que un documento se marca "caduca pronto" y se avisa al candidato (por confirmar)
const DIAS_AVISO_CADUCIDAD = 30;
const TIPOS_DOCUMENTO_CANDIDATO = ['DNI/NIE', 'Seguridad Social', 'RGPD', 'Carné de carretillero', 'Formación PRL', 'Manipulador de alimentos', 'Permiso de conducir', 'CV', 'Otro'];
const URL_PORTAL_CANDIDATOS = 'https://ettglobal.tramitnow.com/candidatos';
const hoyIso = () => new Date().toISOString().slice(0, 10);
const fechaES = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');
const diasPara = (iso) => (iso ? Math.round((new Date(`${iso}T00:00:00`) - new Date(new Date().toDateString())) / 86400000) : null);
const sumarAnios = (iso, n) => { const d = new Date(`${iso}T00:00:00`); d.setFullYear(d.getFullYear() + n); return d.toISOString().slice(0, 10); };
const estadoDocumento = (doc) => {
    if (doc.status === 'Pendiente de validar') return { id: 'pendiente', texto: 'Pendiente de validar', tono: 'info' };
    const d = diasPara(doc.expiry);
    if (d === null) return { id: 'sin', texto: 'Sin caducidad', tono: 'neutral' };
    if (d < 0) return { id: 'caducado', texto: 'Caducado', tono: 'danger' };
    if (d <= DIAS_AVISO_CADUCIDAD) return { id: 'pronto', texto: `Caduca en ${d} ${d === 1 ? 'día' : 'días'}`, tono: 'warning' };
    return { id: 'vigente', texto: 'Vigente', tono: 'success' };
};
const docsPorRenovar = (c) => (c.documents || []).filter(d => ['caducado', 'pronto'].includes(estadoDocumento(d).id));

// Disponibilidad: turnos en los que puede trabajar
const TURNOS = [
    { id: 'manana', texto: 'Mañana' },
    { id: 'tarde', texto: 'Tarde' },
    { id: 'noche', texto: 'Noche' },
    { id: 'partida', texto: 'Jornada partida' },
    { id: 'finde', texto: 'Fines de semana' },
];
const INCORPORACION = ['Inmediata', 'En una semana', 'En dos semanas', 'A partir de una fecha'];
const turnosDesde = (texto = '') => {
    const t = texto.toLowerCase();
    if (t.includes('indiferente')) return ['manana', 'tarde', 'noche'];
    return TURNOS.filter(x => t.includes(x.texto.toLowerCase().slice(0, 4))).map(x => x.id);
};

// Caducidades de ejemplo de documentos que no son el DNI ni el RGPD
const CADUCIDADES_DEMO = {
    'Certificado_Carretillero_UNE.pdf': '2026-11-15',
    'Carnet_Retractil_UNE.pdf': '2026-09-30',
    'Certificado_Carretillas.pdf': '2029-11-20',
};
const TIPO_NORMALIZADO = { DNI: 'DNI/NIE', NSS: 'Seguridad Social' };
const completarCandidato = (c) => ({
    ...c,
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
// Los estados de DNI, NSS y RGPD de la lista salen de los datos y de los documentos
const sincronizarEstados = (c) => {
    const dDni = diasPara(c.dniExpiry);
    const rgpdDoc = c.documents.find(d => d.type === 'RGPD');
    const eRgpd = rgpdDoc ? estadoDocumento(rgpdDoc).id : null;
    return {
        ...c,
        dniStatus: !c.dni ? 'Falta' : dDni !== null && dDni < 0 ? 'Caducado' : 'OK',
        nssStatus: c.nss ? 'OK' : 'Falta',
        rgpdStatus: !rgpdDoc ? c.rgpdStatus : eRgpd === 'caducado' ? 'Caducado' : eRgpd === 'pronto' ? 'Próximo a caducar' : 'Vigente',
    };
};

// Puesto, turno, cliente y centro de cada petición (las mismas que en Peticiones). Una petición = un puesto.
const PETICIONES_INFO = {
    'PET-2026-0031': { puesto: 'Mozo/a de almacén', turno: 'Turno de mañana', cliente: TRANSLOG, centro: 'HUB central Basauri (Bizkaia) - Nave 2' },
    'PET-2026-0044': { puesto: 'Camarero/a de sala', turno: 'Jornada partida', cliente: HOSTELERIA, centro: 'Recinto de congresos - Barcelona' },
    'PET-2026-0045': { puesto: 'Ayudante de cocina', turno: 'Jornada partida', cliente: HOSTELERIA, centro: 'Recinto de congresos - Barcelona' },
    'PET-2026-0046': { puesto: 'Cocinero/a de partida', turno: 'Jornada partida', cliente: HOSTELERIA, centro: 'Recinto de congresos - Barcelona' },
    'PET-2026-0047': { puesto: 'Camarero/a de barra', turno: 'Turno de noche', cliente: HOSTELERIA, centro: 'Recinto de congresos - Barcelona' },
    'PET-2026-0048': { puesto: 'Operario/a de almacén', turno: 'Turno de mañana', cliente: TRANSLOG, centro: 'HUB central Basauri (Bizkaia) - Nave 2' },
    'PET-2026-0049': { puesto: 'Operario/a de almacén', turno: 'Turno de tarde', cliente: TRANSLOG, centro: 'HUB central Basauri (Bizkaia) - Nave 2' },
    'PET-2026-0050': { puesto: 'Carretillero/a', turno: 'Turno de tarde', cliente: TRANSLOG, centro: 'HUB central Basauri (Bizkaia) - Nave 2' },
};
// Estados de una candidatura, en el orden del recorrido (los mismos pasos que la plaza en Peticiones)
const ESTADOS_CANDIDATURA = {
    'En selección': { tono: 'accent', texto: 'Pendiente de entrevista o de proponerla al cliente.', activa: true },
    'Propuesta al cliente': { tono: 'warning', texto: 'Plaza reservada: el cliente tiene que confirmarla en Peticiones.', activa: true },
    'Confirmada': { tono: 'info', texto: 'El cliente la ha confirmado. Expediente en Contratos y altas hasta el primer día.', activa: true },
    'En misión': { tono: 'success', texto: 'Trabajando en el cliente.', activa: true },
    'Finalizada': { tono: 'neutral', texto: 'Misión terminada.', activa: false },
    'Baja': { tono: 'neutral', texto: 'Dejó la plaza antes de terminar.', activa: false },
    'Descartada': { tono: 'danger', texto: 'No sigue en el proceso de selección.', activa: false },
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

const ESTADO_CANDIDATO = {
    'Disponible': { tone: 'success', label: 'Disponible' },
    'Asignado/En misión': { tone: 'info', label: 'En misión' },
    'En incorporación': { tone: 'accent', label: 'En incorporación' },
    'En entrevista': { tone: 'accent', label: 'En selección' },
    'Nuevo': { tone: 'neutral', label: 'Nuevo' },
    'Pendiente de contactar': { tone: 'warning', label: 'Por contactar' },
    'Contactado': { tone: 'neutral', label: 'Contactado' },
    'No disponible': { tone: 'neutral', label: 'No disponible' },
    'Descartado': { tone: 'danger', label: 'Descartado' },
};

const RGPD = {
    'Vigente': { tone: 'success', label: 'Vigente', icon: Shield },
    'Próximo a caducar': { tone: 'warning', label: 'Caduca pronto', icon: Clock },
    'Caducado': { tone: 'danger', label: 'Caducado', icon: ShieldAlert },
    'Sin consentimiento': { tone: 'warning', label: 'Sin firma', icon: AlertCircle },
};

// ==========================================
// MAIN APPLICATION COMPONENT
// ==========================================
export default function CandidatosView() {
    // State
    const [candidates, setCandidates] = useState(INITIAL_CANDIDATES);
    const [petitions, setPetitions] = useState(INITIAL_PETITIONS);
    
    // View mode
    const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
    
    // Selection & Search
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [sourceFilter, setSourceFilter] = useState('ALL');
    const [docFilter, setDocFilter] = useState('ALL'); // 'ALL' | 'DOC_OK' | 'DOC_ALERT' | 'RGPD_ALERT'
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [skillFilter, setSkillFilter] = useState('ALL'); // 'carne:…' | 'habilidad:…' | 'idioma:…'
    // Listados homogéneos; se amplían al añadir un valor nuevo desde la ficha
    const [catalogos, setCatalogos] = useState(CATALOGOS_INICIALES);
    const anadirACatalogo = (tipo, nombre, grupo = 'Añadidos') => {
        setCatalogos(prev => ({
            ...prev,
            [tipo]: tipo === 'idiomas' ? [...prev.idiomas, nombre] : [...prev[tipo], item(nombre, grupo)],
        }));
        showToast('Añadido al listado', `«${nombre}» ya se puede elegir en todos los candidatos.`, 'info');
    };
    const [savedPreset, setSavedPreset] = useState('ALL'); // 'ALL', 'AVAILABLE_NOW', 'DOC_PENDING', 'ASSIGNED'

    // Modals & Drawers
    const [selectedCandidateForDetail, setSelectedCandidateForDetail] = useState(null);
    const [detailTab, setDetailTab] = useState('resumen'); // 'resumen', 'personal', 'profesional', 'disponibilidad', 'documentos', 'candidaturas', 'historial'
    
    // Contact Modal
    const [contactModalCandidate, setContactModalCandidate] = useState(null);
    const [contactChannel, setContactChannel] = useState('Llamada');
    const [contactTemplate, setContactTemplate] = useState('libre');
    const [contactMessage, setContactMessage] = useState('');
    const [contactResult, setContactResult] = useState('Contactado con éxito');
    const [contactNote, setContactNote] = useState('');

    // Wizard: Assign Candidate to Petition
    const [wizardState, setWizardState] = useState({
        isOpen: false,
        candidate: null,
        candidatesBatch: [], // For bulk assignment
        step: 1, // 1: petición, 2: plaza y modalidad, 3: comprobaciones y confirmar
        selectedPetitionId: 'PET-2026-0049',
        selectedPositionId: 'POS-0049',
        selectedPlazaNum: 1,
        assignmentMode: 'seleccion', // 'seleccion' (entrevista antes de proponer) | 'propuesta' (proponer al cliente para una plaza)
        busquedaPeticion: '',
        blockersFound: [],
        warningsFound: [],
        overrideReason: ''
    });

    // Quick Create & Full Create Modals
    const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
    const [isImportPortalOpen, setIsImportPortalOpen] = useState(false);
    const [isBulkActionModalOpen, setIsBulkActionModalOpen] = useState(false);
    const [bulkActionType, setBulkActionType] = useState('assign'); // 'assign' | 'contact' | 'status' | 'docRequest'

    // Toasts & feedback
    const [toast, setToast] = useState(null);

    // Esc cierra cualquier ventana abierta, como en el resto de la app.
    useEffect(() => {
        const onKey = (e) => {
            if (e.key !== 'Escape') return;
            setContactModalCandidate(null);
            setIsQuickCreateOpen(false);
            setIsImportPortalOpen(false);
            setIsBulkActionModalOpen(false);
            setWizardState(prev => ({ ...prev, isOpen: false }));
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, []);

    const showToast = (title, message, type = 'success') => {
        setToast({ title, message, type });
        setTimeout(() => setToast(null), 4500);
    };

    // Edición de la ficha, eliminar candidato y documentos
    const [edicion, setEdicion] = useState(null); // { seccion, datos, errores }
    const [candidatoAEliminar, setCandidatoAEliminar] = useState(null);
    const [docModal, setDocModal] = useState(null); // { doc?, tipo, archivo, expiry }
    const [docAEliminar, setDocAEliminar] = useState(null);
    const [avisoDocs, setAvisoDocs] = useState(null); // { asunto, mensaje, recordar, docIds }

    // Cambia un candidato en la lista y en la ficha abierta; opcionalmente deja una línea en su historial
    const actualizarCandidato = (id, cambios, registro) => {
        const aplicar = (c) => {
            if (c.id !== id) return c;
            const n = { ...c, ...(typeof cambios === 'function' ? cambios(c) : cambios) };
            if (registro) {
                n.communications = [{ date: new Date().toISOString().slice(0, 16).replace('T', ' '), user: 'Usuario Demo', channel: registro.channel || 'Ficha', result: registro.result, note: registro.note }, ...(n.communications || [])];
            }
            return sincronizarEstados(n);
        };
        setCandidates(prev => prev.map(aplicar));
        setSelectedCandidateForDetail(prev => (prev && prev.id === id ? aplicar(prev) : prev));
    };

    const SECCIONES_EDICION = { personal: 'Datos personales', profesional: 'Perfil y carnés', disponibilidad: 'Disponibilidad' };
    const empezarEdicion = (seccion) => setEdicion({ seccion, datos: JSON.parse(JSON.stringify(selectedCandidateForDetail)), errores: {} });
    const campo = (k, v) => setEdicion(e => ({ ...e, datos: { ...e.datos, [k]: v } }));
    const guardarEdicion = () => {
        const d = edicion.datos;
        const errores = {};
        if (edicion.seccion === 'personal') {
            if (!d.name.trim()) errores.name = 'Obligatorio';
            if (!d.lastName.trim()) errores.lastName = 'Obligatorio';
            if (!/^[XYZ]?\d{7,8}[A-Z]$/i.test(d.dni.trim())) errores.dni = 'Formato de DNI o NIE no válido';
            if (!d.phone.trim()) errores.phone = 'Obligatorio';
            if (d.email && !/^\S+@\S+\.\S+$/.test(d.email)) errores.email = 'Email no válido';
        }
        if (edicion.seccion === 'disponibilidad' && d.incorporacion === 'A partir de una fecha' && !d.incorporacionFecha) errores.incorporacionFecha = 'Indica la fecha';
        if (Object.keys(errores).length) { setEdicion(e => ({ ...e, errores })); return; }
        const seccion = SECCIONES_EDICION[edicion.seccion];
        actualizarCandidato(d.id, (c) => ({
            ...d,
            communications: c.communications,
            documents: edicion.seccion === 'personal' ? c.documents.map(doc => (doc.type === 'DNI/NIE' ? { ...doc, expiry: d.dniExpiry } : doc)) : c.documents,
            preferredShift: d.turnos?.length ? TURNOS.filter(t => d.turnos.includes(t.id)).map(t => t.texto).join(' / ') : 'Sin indicar',
        }), { result: 'Datos actualizados', note: `${seccion} modificados.` });
        setEdicion(null);
        showToast('Cambios guardados', `${seccion} de ${d.name} ${d.lastName} actualizados.`);
    };
    const cambiarPestanaFicha = (id) => { setEdicion(null); setDetailTab(id); };

    const eliminarCandidato = () => {
        const c = candidatoAEliminar;
        setCandidates(prev => prev.filter(x => x.id !== c.id));
        setSelectedIds(prev => prev.filter(x => x !== c.id));
        setCandidatoAEliminar(null);
        setSelectedCandidateForDetail(null);
        showToast('Candidato eliminado', `Se han borrado los datos y documentos de ${c.name} ${c.lastName}.`);
    };

    // Documentos: subir, renovar, validar y eliminar
    const guardarDocumento = () => {
        const c = selectedCandidateForDetail;
        const { doc, tipo, archivo, expiry } = docModal;
        const nuevo = { id: `${c.id}-doc-${Date.now()}`, name: archivo, type: tipo, status: 'Pendiente de validar', uploadDate: hoyIso(), expiry: expiry || null };
        actualizarCandidato(c.id, (x) => ({
            documents: doc ? x.documents.map(dd => (dd.id === doc.id ? nuevo : dd)) : [...x.documents, nuevo],
            ...(tipo === 'DNI/NIE' && expiry ? { dniExpiry: expiry } : {}),
            ...(tipo === 'RGPD' ? { rgpdSignedDate: hoyIso() } : {}),
        }), { result: doc ? 'Documento renovado' : 'Documento subido', note: doc ? `${doc.name} sustituido por ${archivo}.` : `${archivo} (${tipo}).` });
        setDocModal(null);
        showToast(doc ? 'Documento renovado' : 'Documento subido', `${archivo} queda pendiente de validar.`);
    };
    const validarDocumento = (doc) => {
        actualizarCandidato(selectedCandidateForDetail.id, (x) => ({ documents: x.documents.map(d => (d.id === doc.id ? { ...d, status: 'Verificado' } : d)) }), { result: 'Documento validado', note: doc.name });
        showToast('Documento validado', doc.name);
    };
    const eliminarDocumento = () => {
        const doc = docAEliminar;
        actualizarCandidato(selectedCandidateForDetail.id, (x) => ({ documents: x.documents.filter(d => d.id !== doc.id) }), { result: 'Documento eliminado', note: doc.name });
        setDocAEliminar(null);
        showToast('Documento eliminado', doc.name);
    };
    const abrirAvisoDocs = (c, docs) => {
        const lineas = docs.map(d => {
            const e = estadoDocumento(d);
            return `- ${d.type}: ${e.id === 'caducado' ? `caducó el ${fechaES(d.expiry)}` : `caduca el ${fechaES(d.expiry)}`}`;
        }).join('\n');
        setAvisoDocs({
            docIds: docs.map(d => d.id),
            asunto: docs.length === 1 ? `Tienes que renovar tu ${docs[0].type}` : 'Tienes documentos por renovar',
            mensaje: `Hola, ${c.name}:\n\nPara poder seguir contando contigo necesitamos que renueves:\n${lineas}\n\nPuedes subirlos desde tu área de candidato: ${URL_PORTAL_CANDIDATOS}\n\nGracias,\nETT Global`,
            recordar: true,
        });
    };
    const enviarAvisoDocs = () => {
        const c = selectedCandidateForDetail;
        actualizarCandidato(c.id, (x) => ({ documents: x.documents.map(d => (avisoDocs.docIds.includes(d.id) ? { ...d, avisoEnviado: hoyIso() } : d)) }), {
            channel: 'Email', result: 'Aviso de renovación', note: `${avisoDocs.asunto}${avisoDocs.recordar ? '. Se le recordará cada 7 días hasta que lo renueve.' : '.'}`,
        });
        setAvisoDocs(null);
        showToast('Aviso enviado', `Email enviado a ${c.email}.`);
    };

    // Calculate filtered candidates
    const filteredCandidates = useMemo(() => {
        return candidates.filter(can => {
            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = `${can.name} ${can.lastName}`.toLowerCase().includes(q);
                const matchDni = can.dni.toLowerCase().includes(q);
                const matchPhone = can.phone.toLowerCase().includes(q);
                const matchEmail = can.email.toLowerCase().includes(q);
                const matchCity = can.city.toLowerCase().includes(q);
                const matchCategory = can.category.toLowerCase().includes(q);
                const matchSkills = can.skills.some(s => s.toLowerCase().includes(q));
                const matchSinonimos = textoBuscable(can, catalogos).includes(normalizarTexto(q));
                if (!matchName && !matchDni && !matchPhone && !matchEmail && !matchCity && !matchCategory && !matchSkills && !matchSinonimos) {
                    return false;
                }
            }

            // Preset filters
            if (savedPreset === 'AVAILABLE_NOW' && can.status !== 'Disponible') return false;
            if (savedPreset === 'DOC_PENDING' && (can.dniStatus === 'OK' && can.rgpdStatus === 'Vigente' && can.nssStatus === 'OK')) return false;
            if (savedPreset === 'ASSIGNED' && can.status !== 'Asignado/En misión') return false;

            // Status
            if (statusFilter !== 'ALL' && can.status !== statusFilter) return false;
            
            // Source
            if (sourceFilter !== 'ALL' && can.source !== sourceFilter) return false;

            // Doc Filter
            if (docFilter === 'DOC_OK' && (can.dniStatus !== 'OK' || can.rgpdStatus !== 'Vigente' || can.nssStatus !== 'OK')) return false;
            if (docFilter === 'DOC_ALERT' && (can.dniStatus === 'OK' && can.nssStatus === 'OK' && docsPorRenovar(can).length === 0)) return false;
            if (docFilter === 'RGPD_ALERT' && (can.rgpdStatus === 'Vigente')) return false;

            // Category
            if (categoryFilter !== 'ALL' && can.category !== categoryFilter && !(can.otherProfiles || []).includes(categoryFilter)) return false;

            // Carné, habilidad o idioma
            if (skillFilter !== 'ALL') {
                const [tipo, valor] = skillFilter.split(':');
                if (tipo === 'carne' && !(can.drivingLicenses || []).includes(valor)) return false;
                if (tipo === 'habilidad' && !(can.skills || []).includes(valor)) return false;
                if (tipo === 'idioma' && !(can.languages || []).some(l => l.startsWith(`${valor} (`))) return false;
            }

            return true;
        });
    }, [candidates, searchQuery, statusFilter, sourceFilter, docFilter, categoryFilter, skillFilter, savedPreset, catalogos]);

    // Handlers
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(filteredCandidates.map(c => c.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleToggleSelect = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // Start Assign Wizard for a single candidate
    const startAssignWizard = (candidate, petId = 'PET-2026-0049', step = 1) => {
        // Una petición = un puesto: el puesto es el único de la petición
        const pet = petitions.find(p => p.id === petId) || petitions[0];
        const pos = pet?.positions[0];
        
        const blockers = [];
        const warnings = [];

        if (candidate.dniStatus === 'Caducado') {
            blockers.push(`Documento de identidad CADUCADO (${candidate.dni}). Requiere renovación para tramitar alta en SS.`);
        }
        if (candidate.rgpdStatus === 'Caducado' || candidate.rgpdStatus === 'Sin consentimiento') {
            blockers.push(`Consentimiento RGPD no vigente (${candidate.rgpdStatus}). Se requiere firma previa a la cesión a cliente.`);
        }
        if (candidate.status === 'Asignado/En misión') {
            warnings.push(`El candidato ya tiene una misión activa asignada (${candidate.assignedMission?.petitionId || 'PET'}).`);
        }
        if (pos?.mandatoryRequirements?.includes('Carnet de carretillero en vigor (UNE 58451)') && !candidate.drivingLicenses.some(l => l.includes('Carretillero'))) {
            blockers.push('No dispone de Carnet de Carretillero UNE 58451 requerido por esta posición.');
        }

        setWizardState({
            isOpen: true,
            candidate: candidate,
            candidatesBatch: [candidate],
            step,
            selectedPetitionId: pet.id,
            selectedPositionId: pos?.id || '',
            selectedPlazaNum: pos?.plazas.find(p => p.status === 'Vacante')?.plazaNum || null,
            assignmentMode: step === 2 ? 'propuesta' : 'seleccion',
            busquedaPeticion: '',
            blockersFound: blockers,
            warningsFound: warnings,
            overrideReason: ''
        });
    };

    // Recalculate wizard compatibility whenever step or position changes
    const runWizardCompatibilityCheck = (petId, posId, candidate) => {
        if (!candidate) return { blockers: [], warnings: [] };
        const pet = petitions.find(p => p.id === petId);
        const pos = pet?.positions.find(p => p.id === posId);
        const blockers = [];
        const warnings = [];

        if (candidate.dniStatus === 'Caducado') {
            blockers.push(`Documento de identidad CADUCADO (${candidate.dni}). Impide tramitar alta en Seguridad Social.`);
        }
        if (candidate.dniStatus === 'Falta') {
            blockers.push('Falta aportar documento de identidad oficial.');
        }
        if (candidate.rgpdStatus === 'Caducado' || candidate.rgpdStatus === 'Sin consentimiento') {
            blockers.push(`Consentimiento RGPD ${candidate.rgpdStatus.toUpperCase()}. Requiere firma antes de presentar al cliente.`);
        }
        if (candidate.rgpdStatus === 'Próximo a caducar') {
            warnings.push('El consentimiento RGPD caduca en los próximos 30 días. Se recomienda solicitar refirma.');
        }
        if (candidate.nssStatus === 'Falta') {
            warnings.push('Número de la Seguridad Social no registrado aún. Deberá aportarse antes del inicio de contrato.');
        }
        if (candidate.status === 'Asignado/En misión') {
            warnings.push(`Candidato con misión activa (${candidate.assignedMission?.petitionId || 'Actual'}). Verificar compatibilidad de fechas.`);
        }
        
        // Specific position requirements check
        if (pos) {
            if (pos.mandatoryRequirements?.some(r => r.includes('Carretillero')) && !candidate.drivingLicenses.some(l => l.toLowerCase().includes('carretillero'))) {
                blockers.push('Requisito excluyente no cumplido: Requiere Carnet de Carretillero UNE 58451.');
            }
            if (pos.mandatoryRequirements?.some(r => r.includes('conducir B')) && !candidate.drivingLicenses.includes('B')) {
                blockers.push('Requisito excluyente no cumplido: Requiere Carnet de conducir B.');
            }
            if (pos.turn?.toLowerCase().includes('noche') && candidate.preferredShift?.toLowerCase().includes('mañana') && !candidate.preferredShift.toLowerCase().includes('indiferente')) {
                warnings.push(`Preferencia horaria: El candidato indicó preferencia por "${candidate.preferredShift}", y la vacante es "${pos.turn}".`);
            }
        }

        return { blockers, warnings };
    };

    // Confirmar el asistente: candidatura en selección o propuesta al cliente (la plaza queda pendiente del cliente)
    const confirmAssignmentWizard = () => {
        const { candidate, selectedPetitionId, selectedPlazaNum, assignmentMode } = wizardState;
        if (!candidate) return;
        const pet = petitions.find(p => p.id === selectedPetitionId);
        const pos = pet?.positions[0];
        const propuesta = assignmentMode === 'propuesta';
        const nombre = `${candidate.name} ${candidate.lastName}`;
        const hoy = hoyIso();

        if (propuesta) {
            setPetitions(prev => prev.map(p => (p.id !== selectedPetitionId ? p : {
                ...p,
                positions: p.positions.map(position => ({
                    ...position,
                    plazas: position.plazas.map(plz => (plz.plazaNum === Number(selectedPlazaNum)
                        ? { ...plz, status: 'Pendiente del cliente', candidateName: nombre, candidateId: candidate.id, assignedDate: hoy }
                        : plz)),
                })),
            })));
        }

        const estado = propuesta ? 'Propuesta al cliente' : 'En selección';
        const aplicar = (c) => {
            if (c.id !== candidate.id) return c;
            const otras = (c.candidaturas || []).filter(x => x.petId !== selectedPetitionId);
            const log = {
                date: new Date().toISOString().replace('T', ' ').substring(0, 16),
                user: 'Ana Gómez',
                channel: 'ERP Sistema',
                result: propuesta ? 'Propuesta al cliente' : 'Candidatura iniciada',
                note: `${selectedPetitionId} · ${pos?.title} · ${pet?.client}${propuesta ? ` · plaza ${selectedPlazaNum}` : ''}.${wizardState.overrideReason ? ` ${wizardState.overrideReason}` : ''}`,
            };
            return {
                ...c,
                status: ['Asignado/En misión', 'En incorporación'].includes(c.status) ? c.status : 'En entrevista',
                candidaturas: [{ petId: selectedPetitionId, plaza: propuesta ? Number(selectedPlazaNum) : null, estado, fecha: hoy, nota: wizardState.overrideReason }, ...otras],
                activeCandidatures: [`${selectedPetitionId} (${estado}${propuesta ? `, plaza ${selectedPlazaNum}` : ''})`, ...(c.activeCandidatures || []).filter(x => !x.includes(selectedPetitionId))],
                communications: [log, ...c.communications],
            };
        };
        setCandidates(prev => prev.map(aplicar));
        setSelectedCandidateForDetail(prev => (prev ? aplicar(prev) : prev));
        setWizardState(prev => ({ ...prev, isOpen: false }));
        showToast(
            propuesta ? 'Propuesta enviada al cliente' : 'Candidatura iniciada',
            propuesta
                ? `${nombre} propuesto/a para la plaza ${selectedPlazaNum} de ${selectedPetitionId}. El cliente la confirma en Peticiones.`
                : `${nombre} en selección para ${selectedPetitionId} · ${pos?.title}.`,
            'success'
        );
    };
    // Cambia el estado de una candidatura desde la ficha (por ejemplo, descartarla)
    const cambiarCandidatura = (candidatoId, petId, estado) => {
        const aplicar = (c) => (c.id !== candidatoId ? c : {
            ...c,
            candidaturas: c.candidaturas.map(x => (x.petId === petId ? { ...x, estado, fecha: hoyIso() } : x)),
            activeCandidatures: (c.activeCandidatures || []).filter(x => !x.includes(petId)),
        });
        setCandidates(prev => prev.map(aplicar));
        setSelectedCandidateForDetail(prev => (prev ? aplicar(prev) : prev));
        showToast('Candidatura actualizada', `${petId}: ${estado.toLowerCase()}.`, 'success');
    };

    // Contact Handler
    const openContactModal = (candidate) => {
        setContactModalCandidate(candidate);
        setContactChannel('Llamada');
        setContactTemplate('libre');
        setContactMessage(`Hola ${candidate.name}, te contactamos desde ETT Global en relación a nuevas vacantes en el sector logístico...`);
        setContactResult('Interesado y disponible');
        setContactNote('');
    };

    const submitContactAction = () => {
        if (!contactModalCandidate) return;

        const newLog = {
            date: new Date().toISOString().replace('T', ' ').substring(0, 16),
            user: 'Ana Gómez (Consultora)',
            channel: contactChannel,
            result: contactResult,
            note: `${contactNote ? contactNote + ' — ' : ''}${contactMessage.substring(0, 100)}...`
        };

        const updatedCandidates = candidates.map(c => {
            if (c.id !== contactModalCandidate.id) return c;
            return {
                ...c,
                lastContactDate: new Date().toISOString().split('T')[0],
                lastContactBy: 'Ana Gómez',
                lastContactType: contactChannel,
                status: c.status === 'Nuevo' || c.status === 'Pendiente de contactar' ? 'Contactado' : c.status,
                communications: [newLog, ...c.communications]
            };
        });

        setCandidates(updatedCandidates);
        showToast('Contacto registrado', `Actividad de ${contactChannel} guardada en el historial de ${contactModalCandidate.name}.`, 'info');
        setContactModalCandidate(null);
    };

    // Quick Create submit
    const handleQuickCreateSubmit = (e) => {
        e.preventDefault();
        const form = e.target;
        const newCan = {
            id: `CAN-0${candidates.length + 101}`,
            name: form.name.value,
            lastName: form.lastName.value,
            dni: form.dni.value,
            dniExpiry: form.dniExpiry.value || '2028-12-31',
            dniStatus: form.dni.value ? 'OK' : 'Falta',
            phone: form.phone.value,
            email: form.email.value,
            city: form.city.value || 'Basauri',
            province: form.province.value || 'Bizkaia',
            distance: 'A calcular',
            nss: form.nss.value || 'FALTA',
            nssStatus: form.nss.value ? 'OK' : 'Falta',
            rgpdStatus: form.rgpdAccept.checked ? 'Vigente' : 'Sin consentimiento',
            rgpdSignedDate: form.rgpdAccept.checked ? new Date().toISOString().split('T')[0] : null,
            source: 'Alta Rápida',
            sourceId: `RAP-${Math.floor(1000 + Math.random() * 9000)}`,
            lastContactDate: new Date().toISOString().split('T')[0],
            lastContactBy: 'Ana Gómez',
            lastContactType: 'Alta manual',
            status: 'Disponible',
            category: form.category.value || 'Operario de almacén',
            experienceYears: Number(form.experience.value) || 1,
            drivingLicenses: form.hasForklift.checked ? ['B', 'Carnet Carretillero UNE 58451'] : ['B'],
            hasCar: true,
            preferredShift: 'Indiferente',
            skills: ['Disponibilidad horaria', 'Incorporación rápida'],
            languages: ['Español (Nativo)'],
            activeCandidatures: [],
            assignedMission: null,
            documents: [
                { name: 'Ficha_Alta_Rapida.pdf', type: 'Ficha', status: 'Verificado', uploadDate: new Date().toISOString().split('T')[0] }
            ],
            communications: [
                { date: new Date().toISOString().replace('T', ' ').substring(0, 16), user: 'Ana Gómez', channel: 'ERP', result: 'Alta Rápida registrada', note: 'Candidato dado de alta mediante formulario rápido.' }
            ]
        };

        setCandidates([homogeneizar(completarCandidato(newCan)), ...candidates]);
        setIsQuickCreateOpen(false);
        showToast('Candidato creado', `Alta rápida de ${newCan.name} ${newCan.lastName} completada con éxito.`, 'success');
    };

    // Portal Import Simulator
    const handleImportFromPortal = (portalName) => {
        const importedNames = [
            { name: 'Raúl', lastName: 'Jiménez Ortega', dni: '03918234D', cat: 'Carretillero / Mozo frontal', exp: 3 },
            { name: 'Beatriz', lastName: 'Navas Serrano', dni: '52819203K', cat: 'Reponedora / Inventarista', exp: 2 },
            { name: 'Kevin', lastName: 'García Dos Santos', dni: 'Y1829384Z', cat: 'Mozo de almacén y picking', exp: 4 }
        ];
        const rand = importedNames[Math.floor(Math.random() * importedNames.length)];
        
        const newCan = {
            id: `CAN-0${candidates.length + 101}`,
            name: rand.name,
            lastName: rand.lastName,
            dni: rand.dni,
            dniExpiry: '2028-06-15',
            dniStatus: 'OK',
            phone: `+34 6${Math.floor(10000000 + Math.random() * 90000000)}`,
            email: `${rand.name.toLowerCase()}.${rand.lastName.split(' ')[0].toLowerCase()}@candidato.es`,
            city: 'Basauri',
            province: 'Bizkaia',
            distance: '3 km de Basauri',
            nss: '48/99112233/44',
            nssStatus: 'OK',
            rgpdStatus: 'Vigente',
            rgpdSignedDate: new Date().toISOString().split('T')[0],
            source: portalName,
            sourceId: `${portalName.substring(0, 3).toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`,
            lastContactDate: new Date().toISOString().split('T')[0],
            lastContactBy: 'Sincronizador API',
            lastContactType: 'Importación portal',
            status: 'Nuevo',
            category: rand.cat,
            experienceYears: rand.exp,
            drivingLicenses: ['B', 'Carnet Carretillero UNE 58451'],
            hasCar: true,
            preferredShift: 'Turno Mañana o Tarde',
            skills: ['Picking radiofrecuencia', 'Disponibilidad inmediata', 'Importado API'],
            languages: ['Español (Nativo)'],
            activeCandidatures: [],
            assignedMission: null,
            documents: [
                { name: `CV_Sincronizado_${portalName}.pdf`, type: 'CV', status: 'Verificado', uploadDate: new Date().toISOString().split('T')[0] }
            ],
            communications: [
                { date: new Date().toISOString().replace('T', ' ').substring(0, 16), user: 'API Conector', channel: portalName, result: 'Candidatura importada', note: `Perfil sincronizado automáticamente desde ${portalName}.` }
            ]
        };

        setCandidates([homogeneizar(completarCandidato(newCan)), ...candidates]);
        setIsImportPortalOpen(false);
        showToast('Importación completada', `1 nuevo candidato importado desde ${portalName}: ${newCan.name} ${newCan.lastName}.`, 'success');
    };

    const renderStatusBadge = (status) => {
        const e = ESTADO_CANDIDATO[status] ?? { tone: 'neutral', label: status };
        return <Badge tone={e.tone} dot>{e.label}</Badge>;
    };

    // Documento de identidad: si está bien, solo el número; si no, el aviso.
    const renderDniBadge = (status, expiry, dni) => {
        if (status === 'OK') {
            return (
                <span className="inline-flex items-center gap-1 text-xs text-slate-700" title={`DNI verificado. Caduca el ${expiry}`}>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    {dni}
                </span>
            );
        }
        if (status === 'Caducado') return <Badge tone="danger" icon={XCircle} title={`Caducó el ${expiry}`}>Caducado</Badge>;
        return <Badge tone="warning" icon={AlertTriangle}>Falta</Badge>;
    };

    const renderRgpdBadge = (status) => {
        const e = RGPD[status] ?? RGPD['Sin consentimiento'];
        return <Badge tone={e.tone} icon={e.icon}>{e.label}</Badge>;
    };

    const renderNssBadge = (status, nss) => {
        if (status === 'OK') return <span className="text-xs font-mono text-slate-700">{nss}</span>;
        return <Badge tone="warning">Falta NSS</Badge>;
    };

    // En la tabla, la documentación va resumida en tres etiquetas; el detalle sale al pasar el ratón.
    const renderDocumentacion = (c) => {
        const dni = c.dniStatus === 'OK' ? 'success' : c.dniStatus === 'Caducado' ? 'danger' : 'warning';
        const nss = c.nssStatus === 'OK' ? 'success' : 'warning';
        const rgpd = (RGPD[c.rgpdStatus] ?? RGPD['Sin consentimiento']).tone;
        return (
            <div className="flex items-center gap-1">
                <Badge tone={dni} title={c.dniStatus === 'OK' ? `DNI ${c.dni}, caduca el ${c.dniExpiry}` : `DNI: ${c.dniStatus}`}>DNI</Badge>
                <Badge tone={nss} title={c.nssStatus === 'OK' ? `NSS ${c.nss}` : 'Falta el número de la Seguridad Social'}>NSS</Badge>
                <Badge tone={rgpd} title={`RGPD: ${c.rgpdStatus}`}>RGPD</Badge>
                {docsPorRenovar(c).length > 0 && (
                    <Badge tone={docsPorRenovar(c).some(d => estadoDocumento(d).id === 'caducado') ? 'danger' : 'warning'} title={`Documentos por renovar: ${docsPorRenovar(c).map(d => d.type).join(', ')}`}>
                        {docsPorRenovar(c).length} por renovar
                    </Badge>
                )}
            </div>
        );
    };

    const conDocPendiente = (c) => c.dniStatus !== 'OK' || c.nssStatus !== 'OK' || c.rgpdStatus !== 'Vigente';
    const hayFiltros = searchQuery || statusFilter !== 'ALL' || docFilter !== 'ALL' || sourceFilter !== 'ALL' || categoryFilter !== 'ALL' || skillFilter !== 'ALL' || savedPreset !== 'ALL';
    const limpiarFiltros = () => {
        setSearchQuery('');
        setStatusFilter('ALL');
        setDocFilter('ALL');
        setSourceFilter('ALL');
        setCategoryFilter('ALL');
        setSkillFilter('ALL');
        setSavedPreset('ALL');
    };
    const aplicarVista = (preset) => {
        setSavedPreset(preset);
        setStatusFilter('ALL');
        setDocFilter('ALL');
    };

    return (
        <>
            <Page>
                <PageHeader
                    title="Candidatos"
                    count={candidates.length}
                    subtitle="Personas disponibles, en selección o en misión, con su documentación y RGPD."
                    actions={
                        <>
                            <Button icon={UploadCloud} onClick={() => setIsImportPortalOpen(true)}>Importar de portales</Button>
                            <Button variant="primary" icon={Plus} onClick={() => setIsQuickCreateOpen(true)}>Nuevo candidato</Button>
                        </>
                    }
                />

                {/* Indicadores: también son los filtros rápidos */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <KpiTile label="Todos" value={candidates.length} active={savedPreset === 'ALL'} onClick={() => aplicarVista('ALL')} />
                    <KpiTile
                        label="Disponibles ya"
                        tone="success"
                        value={candidates.filter(c => c.status === 'Disponible').length}
                        active={savedPreset === 'AVAILABLE_NOW'}
                        onClick={() => aplicarVista('AVAILABLE_NOW')}
                    />
                    <KpiTile
                        label="En misión"
                        tone="info"
                        value={candidates.filter(c => c.status === 'Asignado/En misión').length}
                        active={savedPreset === 'ASSIGNED'}
                        onClick={() => aplicarVista('ASSIGNED')}
                    />
                    <KpiTile
                        label="Documentación o RGPD pendiente"
                        tone="warning"
                        value={candidates.filter(conDocPendiente).length}
                        active={savedPreset === 'DOC_PENDING'}
                        onClick={() => aplicarVista('DOC_PENDING')}
                    />
                </div>

                <Card className="overflow-hidden">
                    {/* Filtros */}
                    <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-200">
                        <SearchInput
                            className="flex-1 min-w-[220px]"
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Buscar por nombre, DNI, teléfono, perfil, carné o habilidad..."
                        />
                        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Perfil">
                            <option value="ALL">Todos los perfiles</option>
                            {[...new Set(catalogos.perfiles.map(p => p.grupo))].map(g => {
                                const delGrupo = catalogos.perfiles.filter(p => p.grupo === g)
                                    .map(p => ({ p, n: candidates.filter(c => c.category === p.nombre || (c.otherProfiles || []).includes(p.nombre)).length }))
                                    .filter(x => x.n > 0);
                                return delGrupo.length > 0 && (
                                    <optgroup key={g} label={g}>
                                        {delGrupo.map(({ p, n }) => <option key={p.nombre} value={p.nombre}>{p.nombre} ({n})</option>)}
                                    </optgroup>
                                );
                            })}
                        </Select>
                        <Select value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} aria-label="Carnés, habilidades e idiomas">
                            <option value="ALL">Carnés, habilidades e idiomas</option>
                            <optgroup label="Permisos y carnés">
                                {catalogos.carnes.filter(x => candidates.some(c => (c.drivingLicenses || []).includes(x.nombre))).map(x => <option key={x.nombre} value={`carne:${x.nombre}`}>{x.nombre}</option>)}
                            </optgroup>
                            <optgroup label="Habilidades">
                                {catalogos.habilidades.filter(x => candidates.some(c => (c.skills || []).includes(x.nombre))).map(x => <option key={x.nombre} value={`habilidad:${x.nombre}`}>{x.nombre}</option>)}
                            </optgroup>
                            <optgroup label="Idiomas">
                                {catalogos.idiomas.filter(i => candidates.some(c => (c.languages || []).some(l => l.startsWith(`${i} (`)))).map(i => <option key={i} value={`idioma:${i}`}>{i}</option>)}
                            </optgroup>
                        </Select>
                        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="ALL">Todos los estados</option>
                            <option value="Disponible">Disponible</option>
                            <option value="Asignado/En misión">En misión</option>
                            <option value="En incorporación">En incorporación</option>
                            <option value="En entrevista">En selección</option>
                            <option value="Nuevo">Nuevo</option>
                            <option value="Pendiente de contactar">Por contactar</option>
                            <option value="Contactado">Contactado</option>
                            <option value="No disponible">No disponible</option>
                        </Select>
                        <Select value={docFilter} onChange={(e) => setDocFilter(e.target.value)}>
                            <option value="ALL">Toda la documentación</option>
                            <option value="DOC_OK">Documentación y RGPD correctos</option>
                            <option value="DOC_ALERT">DNI o NSS pendiente o caducado</option>
                            <option value="RGPD_ALERT">RGPD pendiente o caducado</option>
                        </Select>
                        <Select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
                            <option value="ALL">Todos los orígenes</option>
                            <option value="InfoJobs">InfoJobs</option>
                            <option value="LinkedIn">LinkedIn</option>
                            <option value="Monster">Monster</option>
                            <option value="Portal Web ETT">Portal Web ETT</option>
                            <option value="Alta Manual">Alta manual</option>
                        </Select>
                        {hayFiltros && (
                            <Button variant="ghost" size="sm" icon={X} onClick={limpiarFiltros}>Limpiar</Button>
                        )}
                        <div className="ml-auto">
                            <Segmented
                                value={viewMode}
                                onChange={setViewMode}
                                options={[
                                    { id: 'table', title: 'Ver como tabla', icon: List },
                                    { id: 'cards', title: 'Ver como tarjetas', icon: Grid },
                                ]}
                            />
                        </div>
                    </div>

                    {/* Acciones sobre los seleccionados */}
                    {selectedIds.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-indigo-50 border-b border-indigo-100 text-xs">
                            <span className="font-medium text-indigo-700">
                                {selectedIds.length} {selectedIds.length === 1 ? 'seleccionado' : 'seleccionados'}
                            </span>
                            <div className="flex flex-wrap items-center gap-2 ml-auto">
                                <Button
                                    size="sm"
                                    variant="primary"
                                    icon={Briefcase}
                                    onClick={() => startAssignWizard(candidates.find(c => c.id === selectedIds[0]))}
                                >
                                    Asignar a petición
                                </Button>
                                <Button size="sm" icon={MessageSquare} onClick={() => { setBulkActionType('contact'); setIsBulkActionModalOpen(true); }}>
                                    Contactar
                                </Button>
                                <Button size="sm" icon={FileText} onClick={() => { setBulkActionType('docRequest'); setIsBulkActionModalOpen(true); }}>
                                    Pedir documentación
                                </Button>
                                <IconButton icon={X} title="Quitar la selección" onClick={() => setSelectedIds([])} />
                            </div>
                        </div>
                    )}

                    {filteredCandidates.length === 0 ? (
                        <EmptyState
                            icon={Users}
                            title="No hay candidatos con estos filtros"
                            text="Prueba con otra búsqueda o limpia los filtros."
                            action={<Button onClick={limpiarFiltros}>Limpiar filtros</Button>}
                        />
                    ) : viewMode === 'table' ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-500">
                                        <th className="py-2 pl-3 pr-1 w-8">
                                            <input
                                                type="checkbox"
                                                aria-label="Seleccionar todos"
                                                checked={selectedIds.length === filteredCandidates.length && filteredCandidates.length > 0}
                                                onChange={handleSelectAll}
                                                className="rounded border-slate-200 accent-indigo-600"
                                            />
                                        </th>
                                        <th className="py-2 px-3 font-medium">Candidato</th>
                                        <th className="py-2 px-3 font-medium">Perfil principal</th>
                                        <th className="py-2 px-3 font-medium">Contacto</th>
                                        <th className="py-2 px-3 font-medium">Ubicación</th>
                                        <th className="py-2 px-3 font-medium">Documentación</th>
                                        <th className="py-2 px-3 font-medium">Origen</th>
                                        <th className="py-2 px-3 font-medium">Estado</th>
                                        <th className="py-2 px-3 font-medium">Petición o misión</th>
                                        <th className="py-2 px-3" aria-label="Acciones"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCandidates.map((c) => {
                                        const isSelected = selectedIds.includes(c.id);
                                        return (
                                            <tr key={c.id} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 ${isSelected ? 'bg-indigo-50/50' : ''}`}>
                                                <td className="py-2.5 pl-3 pr-1">
                                                    <input
                                                        type="checkbox"
                                                        aria-label={`Seleccionar a ${c.name} ${c.lastName}`}
                                                        checked={isSelected}
                                                        onChange={() => handleToggleSelect(c.id)}
                                                        className="rounded border-slate-200 accent-indigo-600"
                                                    />
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <Avatar name={`${c.name} ${c.lastName}`} />
                                                        <div className="min-w-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedCandidateForDetail(c)}
                                                                className="font-medium text-slate-900 hover:text-indigo-700 text-left whitespace-nowrap"
                                                            >
                                                                {c.name} {c.lastName}
                                                            </button>
                                                            <div className="text-[11px] text-slate-500 whitespace-nowrap">
                                                                {c.experienceYears} {c.experienceYears === 1 ? 'año' : 'años'} de experiencia
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <button type="button" onClick={() => setCategoryFilter(c.category)} title="Filtrar por este perfil" className="text-left text-slate-700 hover:text-indigo-700 whitespace-nowrap">
                                                        {c.category}
                                                    </button>
                                                    {(c.otherProfiles || []).length > 0 && (
                                                        <div className="text-[11px] text-slate-500 truncate max-w-[180px]" title={c.otherProfiles.join(', ')}>
                                                            También: {c.otherProfiles.join(', ')}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <div className="text-slate-700 whitespace-nowrap">{c.phone}</div>
                                                    <div className="text-[11px] text-slate-500 truncate max-w-[170px]" title={c.email}>{c.email}</div>
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <div className="text-slate-700 whitespace-nowrap">{c.city}</div>
                                                    <div className="text-[11px] text-slate-500 whitespace-nowrap">{c.distance}</div>
                                                </td>
                                                <td className="py-2.5 px-3">{renderDocumentacion(c)}</td>
                                                <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{c.source}</td>
                                                <td className="py-2.5 px-3">{renderStatusBadge(c.status)}</td>
                                                <td className="py-2.5 px-3">
                                                    {c.assignedMission ? (
                                                        <div className="max-w-[180px]">
                                                            <div className="text-slate-700">{c.assignedMission.petitionId}</div>
                                                            <div className="text-[11px] text-slate-500 truncate">
                                                                Plaza {c.assignedMission.plazaNum} · {c.assignedMission.positionTitle}
                                                            </div>
                                                        </div>
                                                    ) : c.activeCandidatures.length > 0 ? (
                                                        <span className="text-slate-700">{c.activeCandidatures[0]}</span>
                                                    ) : (
                                                        <span className="text-slate-400">—</span>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button size="sm" icon={Briefcase} onClick={() => startAssignWizard(c)}>Asignar</Button>
                                                        <IconButton icon={PhoneCall} title="Contactar" onClick={() => openContactModal(c)} />
                                                        <IconButton icon={Eye} title="Ver ficha" onClick={() => setSelectedCandidateForDetail(c)} />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-3">
                            {filteredCandidates.map((c) => (
                                <div key={c.id} className="rounded-xl border border-slate-200 p-4 hover:border-slate-200 transition-colors flex flex-col gap-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <Avatar name={`${c.name} ${c.lastName}`} />
                                            <div className="min-w-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedCandidateForDetail(c)}
                                                    className="font-medium text-sm text-slate-900 hover:text-indigo-700 text-left"
                                                >
                                                    {c.name} {c.lastName}
                                                </button>
                                                <div className="text-[11px] text-slate-500 truncate">{c.category}</div>
                                            </div>
                                        </div>
                                        {renderStatusBadge(c.status)}
                                    </div>

                                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
                                        <dt className="text-slate-500">Teléfono</dt>
                                        <dd className="text-slate-700 text-right">{c.phone}</dd>
                                        <dt className="text-slate-500">Ubicación</dt>
                                        <dd className="text-slate-700 text-right">{c.city}</dd>
                                        <dt className="text-slate-500">Documentación</dt>
                                        <dd className="flex justify-end">{renderDocumentacion(c)}</dd>
                                        <dt className="text-slate-500">Misión</dt>
                                        <dd className="text-slate-700 text-right truncate">
                                            {c.assignedMission ? `${c.assignedMission.petitionId} · Plaza ${c.assignedMission.plazaNum}` : '—'}
                                        </dd>
                                    </dl>

                                    <div className="flex items-center gap-2 pt-3 mt-auto border-t border-slate-100">
                                        <Button className="flex-1" icon={PhoneCall} onClick={() => openContactModal(c)}>Contactar</Button>
                                        <Button className="flex-1" icon={Briefcase} onClick={() => startAssignWizard(c)}>Asignar</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </Page>

            {/* ==================================================== */}
            {/* 4. MODAL / DRAWER: FICHA COMPLETA DEL CANDIDATO      */}
            {/* ==================================================== */}
            {selectedCandidateForDetail && (
                <Drawer
                    onClose={() => { setSelectedCandidateForDetail(null); setEdicion(null); }}
                    leading={<Avatar name={`${selectedCandidateForDetail.name} ${selectedCandidateForDetail.lastName}`} size="lg" />}
                    title={`${selectedCandidateForDetail.name} ${selectedCandidateForDetail.lastName}`}
                    status={renderStatusBadge(selectedCandidateForDetail.status)}
                    subtitle={
                        <div className="space-y-1">
                            <div>{selectedCandidateForDetail.category} · {selectedCandidateForDetail.id} · Origen: {selectedCandidateForDetail.source}</div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600">
                                <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" />{selectedCandidateForDetail.phone}</span>
                                <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" />{selectedCandidateForDetail.email}</span>
                            </div>
                        </div>
                    }
                    toolbar={
                        <Tabs className="px-5"
                            active={detailTab}
                            onChange={cambiarPestanaFicha}
                            tabs={[
                                { id: 'resumen', label: 'Resumen' },
                                { id: 'personal', label: 'Datos personales' },
                                { id: 'profesional', label: 'Perfil y carnés' },
                                { id: 'disponibilidad', label: 'Disponibilidad' },
                                { id: 'documentos', label: 'Documentos y RGPD', alert: docsPorRenovar(selectedCandidateForDetail).length > 0 },
                                { id: 'candidaturas', label: 'Candidaturas' },
                                { id: 'historial', label: 'Historial' },
                            ]}
                        />
                    }
                    footer={
                        <>
                            <Button variant="ghost" icon={Trash2} className="mr-auto text-rose-600! hover:bg-rose-50!" onClick={() => setCandidatoAEliminar(selectedCandidateForDetail)}>Eliminar</Button>
                            <Button icon={PhoneCall} onClick={() => openContactModal(selectedCandidateForDetail)}>Contactar</Button>
                            <Button
                                variant="primary"
                                icon={Briefcase}
                                onClick={() => {
                                    const can = selectedCandidateForDetail;
                                    setSelectedCandidateForDetail(null);
                                    startAssignWizard(can);
                                }}
                            >
                                Asignar a petición
                            </Button>
                        </>
                    }
                >
                        <div className="space-y-6">
                            {detailTab === 'resumen' && (
                                <div className="space-y-4">
                                    {docsPorRenovar(selectedCandidateForDetail).length > 0 && (
                                        <Notice tone="warning" icon={AlertTriangle}>
                                            <span className="flex flex-wrap items-center justify-between gap-2">
                                                <span>Tiene {docsPorRenovar(selectedCandidateForDetail).length} {docsPorRenovar(selectedCandidateForDetail).length === 1 ? 'documento caducado o a punto de caducar' : 'documentos caducados o a punto de caducar'}.</span>
                                                <Button size="sm" onClick={() => cambiarPestanaFicha('documentos')}>Ver documentos</Button>
                                            </span>
                                        </Notice>
                                    )}
                                    {/* Document Status Alert Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className={`p-3.5 rounded-xl border ${selectedCandidateForDetail.dniStatus === 'OK' ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50 border-rose-300'}`}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-semibold text-slate-700">Documento Identidad</span>
                                                {selectedCandidateForDetail.dniStatus === 'OK' ? (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                ) : (
                                                    <AlertOctagon className="w-4 h-4 text-rose-600" />
                                                )}
                                            </div>
                                            <p className="text-sm font-mono font-semibold text-slate-900">{selectedCandidateForDetail.dni}</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                {selectedCandidateForDetail.dniStatus === 'OK' ? `Válido hasta el ${fechaES(selectedCandidateForDetail.dniExpiry)}` : `Caducado el ${fechaES(selectedCandidateForDetail.dniExpiry)}`}
                                            </p>
                                        </div>

                                        <div className={`p-3.5 rounded-xl border ${selectedCandidateForDetail.rgpdStatus === 'Vigente' ? 'bg-emerald-50/60 border-emerald-200' : 'bg-amber-50 border-amber-300'}`}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-semibold text-slate-700">Consentimiento RGPD</span>
                                                <Shield className={`w-4 h-4 ${selectedCandidateForDetail.rgpdStatus === 'Vigente' ? 'text-emerald-600' : 'text-amber-600'}`} />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-900">{selectedCandidateForDetail.rgpdStatus}</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                {selectedCandidateForDetail.rgpdSignedDate ? `Firmado el ${fechaES(selectedCandidateForDetail.rgpdSignedDate)}` : 'No firmado'}
                                            </p>
                                        </div>

                                        <div className={`p-3.5 rounded-xl border ${selectedCandidateForDetail.nssStatus === 'OK' ? 'bg-emerald-50/60 border-emerald-200' : 'bg-amber-50 border-amber-300'}`}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-semibold text-slate-700">Seguridad Social (NSS)</span>
                                                <Check className={`w-4 h-4 ${selectedCandidateForDetail.nssStatus === 'OK' ? 'text-emerald-600' : 'text-amber-600'}`} />
                                            </div>
                                            <p className="text-sm font-mono font-semibold text-slate-900">{selectedCandidateForDetail.nss}</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                {selectedCandidateForDetail.nssStatus === 'OK' ? 'Listo para trámites de afiliación' : 'Pendiente de aportar resguardo'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Mission Banner if Assigned */}
                                    {selectedCandidateForDetail.assignedMission && (
                                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Briefcase className="w-5 h-5 text-indigo-600" />
                                                    <h4 className="font-semibold text-indigo-950 text-sm">Misión activa asignada</h4>
                                                </div>
                                                <span className="bg-indigo-600 text-white text-xs font-semibold px-2 py-0.5 rounded">En curso</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                                                <div>
                                                    <span className="text-slate-500">Petición / Cliente:</span>
                                                    <p className="font-semibold text-slate-900">{selectedCandidateForDetail.assignedMission.petitionId} · {selectedCandidateForDetail.assignedMission.client}</p>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500">Posición y Plaza:</span>
                                                    <p className="font-semibold text-slate-900">{selectedCandidateForDetail.assignedMission.positionTitle} (Plaza {selectedCandidateForDetail.assignedMission.plazaNum})</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Key Skills & Competencies */}
                                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                                        <h4 className="font-semibold text-slate-900 text-sm mb-2">Competencias y Certificados</h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedCandidateForDetail.drivingLicenses.map((lic, i) => (
                                                <span key={i} className="bg-amber-100 text-amber-900 font-semibold text-xs px-2.5 py-1 rounded-lg border border-amber-300 flex items-center gap-1">
                                                    <Award className="w-3 h-3 text-amber-700" /> {lic}
                                                </span>
                                            ))}
                                            {selectedCandidateForDetail.skills.map((sk, i) => (
                                                <span key={i} className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-lg">
                                                    {sk}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Latest Communications Log Preview */}
                                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-semibold text-slate-900 text-sm">Último contacto registrado</h4>
                                            <button onClick={() => setDetailTab('historial')} className="text-indigo-600 text-xs hover:underline font-semibold">Ver todo el historial</button>
                                        </div>
                                        {selectedCandidateForDetail.communications.length > 0 ? (
                                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-semibold text-slate-900">{selectedCandidateForDetail.communications[0].channel} · {selectedCandidateForDetail.communications[0].result}</span>
                                                    <span className="text-[11px] text-slate-400">{selectedCandidateForDetail.communications[0].date}</span>
                                                </div>
                                                <p className="text-slate-600">{selectedCandidateForDetail.communications[0].note}</p>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-400 italic">No hay registros de contacto previos.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* DATOS PERSONALES, PERFIL Y DISPONIBILIDAD: se ven y, con "Editar", se modifican */}
                            {['personal', 'profesional', 'disponibilidad'].includes(detailTab) && (() => {
                                const c = selectedCandidateForDetail;
                                const editando = edicion?.seccion === detailTab;
                                const d = editando ? edicion.datos : c;
                                const err = editando ? edicion.errores : {};
                                const Fallo = ({ k }) => (err[k] ? <span className="block text-[11px] text-rose-600">{err[k]}</span> : null);
                                const Dato = ({ label, children }) => (
                                    <div>
                                        <dt className="text-[11px] text-slate-500">{label}</dt>
                                        <dd className="text-slate-900 mt-0.5">{children || '—'}</dd>
                                    </div>
                                );
                                return (
                                    <div className="space-y-4 text-xs">
                                        <SectionTitle actions={!editando && <Button size="sm" icon={Edit3} onClick={() => empezarEdicion(detailTab)}>Editar</Button>}>
                                            {SECCIONES_EDICION[detailTab]}
                                        </SectionTitle>

                                        {detailTab === 'personal' && (editando ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <Field label="Nombre"><TextInput value={d.name} onChange={(e) => campo('name', e.target.value)} /><Fallo k="name" /></Field>
                                                <Field label="Apellidos"><TextInput value={d.lastName} onChange={(e) => campo('lastName', e.target.value)} /><Fallo k="lastName" /></Field>
                                                <Field label="DNI o NIE"><TextInput value={d.dni} onChange={(e) => campo('dni', e.target.value.toUpperCase())} /><Fallo k="dni" /></Field>
                                                <Field label="Caducidad del documento"><TextInput type="date" value={d.dniExpiry || ''} onChange={(e) => campo('dniExpiry', e.target.value)} /></Field>
                                                <Field label="Teléfono móvil"><TextInput value={d.phone} onChange={(e) => campo('phone', e.target.value)} /><Fallo k="phone" /></Field>
                                                <Field label="Email"><TextInput type="email" value={d.email} onChange={(e) => campo('email', e.target.value)} /><Fallo k="email" /></Field>
                                                <Field label="Población"><TextInput value={d.city} onChange={(e) => campo('city', e.target.value)} /></Field>
                                                <Field label="Provincia"><TextInput value={d.province} onChange={(e) => campo('province', e.target.value)} /></Field>
                                                <Field label="Número de la Seguridad Social" hint="Si falta, no se puede tramitar el alta."><TextInput value={d.nss || ''} onChange={(e) => campo('nss', e.target.value)} /></Field>
                                            </div>
                                        ) : (
                                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <Dato label="Nombre y apellidos">{c.name} {c.lastName}</Dato>
                                                <Dato label="DNI o NIE">
                                                    <span className="font-mono">{c.dni}</span>
                                                    {c.dniStatus === 'Caducado' && <span className="ml-2"><Badge tone="danger">Caducado</Badge></span>}
                                                </Dato>
                                                <Dato label="Caducidad del documento">{fechaES(c.dniExpiry)}</Dato>
                                                <Dato label="Teléfono móvil">{c.phone}</Dato>
                                                <Dato label="Email">{c.email}</Dato>
                                                <Dato label="Población y provincia">{c.city}{c.province ? `, ${c.province}` : ''}</Dato>
                                                <Dato label="Número de la Seguridad Social">{c.nss ? <span className="font-mono">{c.nss}</span> : <span className="text-amber-700">Falta: no se puede tramitar el alta</span>}</Dato>
                                            </dl>
                                        ))}

                                        {detailTab === 'profesional' && (editando ? (
                                            <div className="space-y-4">
                                                <Notice tone="info" icon={Info}>Elige de los listados para que todos los candidatos usen los mismos nombres. Puedes buscar por sinónimos (por ejemplo, «toro» encuentra «Carretillero/a»). Si no está, añádelo al listado.</Notice>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <span className="block text-[11px] font-medium text-slate-600">Perfil principal: <span className="text-slate-900">{d.category}</span></span>
                                                        <SelectorCatalogo unico lista={catalogos.perfiles} valores={[d.category]} onChange={(v) => campo('category', v[0])} onAnadir={(n) => anadirACatalogo('perfiles', n)} placeholder="Busca un perfil" />
                                                    </div>
                                                    <Field label="Años de experiencia"><TextInput type="number" min="0" max="50" value={d.experienceYears} onChange={(e) => campo('experienceYears', parseInt(e.target.value) || 0)} /></Field>
                                                </div>
                                                <div className="space-y-1"><span className="block text-[11px] font-medium text-slate-600">Otros perfiles que puede cubrir</span><SelectorCatalogo lista={catalogos.perfiles.filter(p => p.nombre !== d.category)} valores={d.otherProfiles} onChange={(v) => campo('otherProfiles', v)} onAnadir={(n) => anadirACatalogo('perfiles', n)} placeholder="Busca un perfil, por ejemplo: reponedor" /></div>
                                                <div className="space-y-1"><span className="block text-[11px] font-medium text-slate-600">Permisos de conducir y carnés</span><SelectorCatalogo lista={catalogos.carnes} valores={d.drivingLicenses} onChange={(v) => campo('drivingLicenses', v)} onAnadir={(n) => anadirACatalogo('carnes', n)} placeholder="Busca un permiso o carné, por ejemplo: C1 o carretillero" /></div>
                                                <div className="space-y-1"><span className="block text-[11px] font-medium text-slate-600">Habilidades</span><SelectorCatalogo lista={catalogos.habilidades} valores={d.skills} onChange={(v) => campo('skills', v)} onAnadir={(n) => anadirACatalogo('habilidades', n)} placeholder="Busca una habilidad, por ejemplo: picking" /></div>
                                                <div className="space-y-1"><span className="block text-[11px] font-medium text-slate-600">Idiomas</span><SelectorIdiomas valores={d.languages} onChange={(v) => campo('languages', v)} idiomas={catalogos.idiomas} onAnadirIdioma={(n) => anadirACatalogo('idiomas', n)} /></div>
                                                <label className="inline-flex items-center gap-2 text-slate-700">
                                                    <input type="checkbox" checked={!!d.hasCar} onChange={(e) => campo('hasCar', e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                                    Tiene vehículo propio
                                                </label>
                                            </div>
                                        ) : (
                                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <Dato label="Perfil principal">{c.category}</Dato>
                                                <Dato label="Años de experiencia">{c.experienceYears} años</Dato>
                                                <Dato label="Otros perfiles">{c.otherProfiles?.join(', ')}</Dato>
                                                <Dato label="Permisos de conducir y carnés">{c.drivingLicenses?.join(', ')}</Dato>
                                                <Dato label="Habilidades">{c.skills?.join(', ')}</Dato>
                                                <Dato label="Idiomas">{c.languages?.join(', ')}</Dato>
                                                <Dato label="Vehículo propio">{c.hasCar ? 'Sí' : 'No'}</Dato>
                                            </dl>
                                        ))}

                                        {detailTab === 'disponibilidad' && (editando ? (
                                            <div className="space-y-4">
                                                <Field label="Estado">
                                                    <Select value={d.status} onChange={(e) => campo('status', e.target.value)} disabled={!!c.assignedMission} className="w-full">
                                                        {Object.keys(ESTADO_CANDIDATO).map(s => <option key={s} value={s}>{ESTADO_CANDIDATO[s].label}</option>)}
                                                    </Select>
                                                </Field>
                                                {c.assignedMission && <Notice tone="info" icon={Info}>{c.status === 'En incorporación' ? `Se incorpora a ${c.assignedMission.petitionId}: el estado cambia el primer día.` : `Está en misión en ${c.assignedMission.petitionId}: el estado cambia al terminar la misión.`}</Notice>}
                                                <div className="space-y-1">
                                                    <span className="block text-[11px] font-medium text-slate-600">Turnos en los que puede trabajar</span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {TURNOS.map(t => {
                                                            const activo = (d.turnos || []).includes(t.id);
                                                            return (
                                                                <button key={t.id} type="button" onClick={() => campo('turnos', activo ? d.turnos.filter(x => x !== t.id) : [...(d.turnos || []), t.id])}
                                                                    className={`rounded-lg border px-3 py-1.5 ${activo ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                                                    {activo && <Check className="w-3 h-3 inline mr-1" />}{t.texto}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                    <Field label="Incorporación">
                                                        <Select value={d.incorporacion} onChange={(e) => campo('incorporacion', e.target.value)} className="w-full">
                                                            {INCORPORACION.map(x => <option key={x} value={x}>{x}</option>)}
                                                        </Select>
                                                    </Field>
                                                    {d.incorporacion === 'A partir de una fecha' && (
                                                        <Field label="Desde el"><TextInput type="date" value={d.incorporacionFecha} onChange={(e) => campo('incorporacionFecha', e.target.value)} /><Fallo k="incorporacionFecha" /></Field>
                                                    )}
                                                    <Field label="Distancia máxima (km)"><TextInput type="number" min="0" value={d.radioKm} onChange={(e) => campo('radioKm', parseInt(e.target.value) || 0)} /></Field>
                                                </div>
                                                <Field label="Notas">
                                                    <textarea rows={3} value={d.notasDisponibilidad} onChange={(e) => campo('notasDisponibilidad', e.target.value)} placeholder="Por ejemplo: no puede los martes por la tarde" className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                                </Field>
                                            </div>
                                        ) : (
                                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <Dato label="Estado">{renderStatusBadge(c.status)}</Dato>
                                                <Dato label="Turnos">{TURNOS.filter(t => (c.turnos || []).includes(t.id)).map(t => t.texto).join(', ')}</Dato>
                                                <Dato label="Incorporación">{c.incorporacion === 'A partir de una fecha' ? `A partir del ${fechaES(c.incorporacionFecha)}` : c.incorporacion}</Dato>
                                                <Dato label="Distancia máxima">{c.radioKm} km desde {c.city}</Dato>
                                                <Dato label="Notas">{c.notasDisponibilidad}</Dato>
                                            </dl>
                                        ))}

                                        {editando && (
                                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                                <Button onClick={() => setEdicion(null)}>Cancelar</Button>
                                                <Button variant="primary" icon={Check} onClick={guardarEdicion}>Guardar cambios</Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* DOCUMENTOS: caducidad, renovar, eliminar y avisar al candidato */}
                            {detailTab === 'documentos' && (() => {
                                const c = selectedCandidateForDetail;
                                const docs = c.documents.map(d => ({ ...d, est: estadoDocumento(d) }));
                                const caducados = docs.filter(d => d.est.id === 'caducado');
                                const pronto = docs.filter(d => d.est.id === 'pronto');
                                const porRenovar = [...caducados, ...pronto];
                                return (
                                    <div className="space-y-4 text-xs">
                                        {porRenovar.length > 0 && (
                                            <Notice tone={caducados.length ? 'danger' : 'warning'} icon={AlertTriangle}>
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <span>
                                                        {caducados.length > 0 && `${caducados.length} ${caducados.length === 1 ? 'documento caducado' : 'documentos caducados'}`}
                                                        {caducados.length > 0 && pronto.length > 0 && ' y '}
                                                        {pronto.length > 0 && `${pronto.length} ${pronto.length === 1 ? 'caduca' : 'caducan'} en menos de ${DIAS_AVISO_CADUCIDAD} días`}.
                                                        {caducados.some(d => ['DNI/NIE', 'RGPD'].includes(d.type)) && ' Bloquea nuevas asignaciones.'}
                                                    </span>
                                                    <Button size="sm" icon={Send} onClick={() => abrirAvisoDocs(c, porRenovar)}>Avisar por email</Button>
                                                </div>
                                            </Notice>
                                        )}

                                        <SectionTitle actions={<Button size="sm" variant="primary" icon={FileUp} onClick={() => setDocModal({ tipo: TIPOS_DOCUMENTO_CANDIDATO[0], archivo: '', expiry: '' })}>Subir documento</Button>}>
                                            Documentos
                                        </SectionTitle>

                                        {docs.length === 0 ? (
                                            <EmptyState icon={FileText} title="Sin documentos" text="Sube el DNI o NIE, el consentimiento RGPD y los carnés que necesite." />
                                        ) : (
                                            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                                                {docs.map(doc => (
                                                    <div key={doc.id} className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${doc.est.id === 'caducado' ? 'bg-rose-50/40' : ''}`}>
                                                        <div className="flex items-start gap-3 min-w-0">
                                                            <FileText className={`w-4 h-4 mt-0.5 shrink-0 ${doc.est.id === 'caducado' ? 'text-rose-600' : 'text-indigo-600'}`} />
                                                            <div className="min-w-0">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <span className="font-medium text-slate-900 truncate">{doc.type}</span>
                                                                    <Badge tone={doc.est.tono}>{doc.est.texto}</Badge>
                                                                </div>
                                                                <div className="text-[11px] text-slate-500 truncate">
                                                                    {doc.name} · subido el {fechaES(doc.uploadDate)}{doc.expiry ? ` · caduca el ${fechaES(doc.expiry)}` : ''}
                                                                </div>
                                                                {doc.avisoEnviado && <div className="text-[11px] text-slate-500">Aviso de renovación enviado el {fechaES(doc.avisoEnviado)}</div>}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                                                            {doc.est.id === 'pendiente' && <Button size="sm" variant="ghost" icon={Check} onClick={() => validarDocumento(doc)}>Validar</Button>}
                                                            {['caducado', 'pronto'].includes(doc.est.id) && <Button size="sm" icon={RefreshCw} onClick={() => setDocModal({ doc, tipo: doc.type, archivo: '', expiry: '' })}>Renovar</Button>}
                                                            <IconButton icon={Eye} title="Ver" onClick={() => showToast('Vista previa', `${doc.name} (simulado).`, 'info')} />
                                                            <IconButton icon={Download} title="Descargar" onClick={() => showToast('Descarga', `${doc.name} (simulado).`, 'info')} />
                                                            <IconButton icon={Trash2} title="Eliminar" className="hover:text-rose-600 hover:bg-rose-50" onClick={() => setDocAEliminar(doc)} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="rounded-xl border border-slate-200 p-3 flex items-start justify-between gap-3">
                                            <div>
                                                <div className="font-medium text-slate-900">Avisar automáticamente</div>
                                                <p className="text-slate-500 mt-0.5">
                                                    Envía un email al candidato {DIAS_AVISO_CADUCIDAD} días antes de que caduque un documento y otro el día que caduca.
                                                    El candidato podrá renovarlo desde su portal.
                                                </p>
                                            </div>
                                            <Interruptor
                                                checked={c.avisoAutomatico}
                                                onChange={(v) => { actualizarCandidato(c.id, { avisoAutomatico: v }); showToast(v ? 'Aviso automático activado' : 'Aviso automático desactivado', `${c.name} ${c.lastName}`); }}
                                                label="Avisar automáticamente de documentos que caducan"
                                            />
                                        </div>
                                    </div>
                                );
                            })()}

                            {detailTab === 'candidaturas' && (() => {
                                const cand = selectedCandidateForDetail.candidaturas || [];
                                const activas = cand.filter(x => ESTADOS_CANDIDATURA[x.estado]?.activa);
                                const anteriores = cand.filter(x => !ESTADOS_CANDIDATURA[x.estado]?.activa);
                                const tarjeta = (x) => {
                                    const info = PETICIONES_INFO[x.petId] || { puesto: '—', turno: '', cliente: '', centro: '' };
                                    const e = ESTADOS_CANDIDATURA[x.estado] || { tono: 'neutral', texto: '' };
                                    const destino = x.estado === 'En misión' ? ['#/mision', 'Personal en misión'] : x.estado === 'Confirmada' ? ['#/laboral', 'Contratos y altas'] : ['#/peticiones', 'Ver en Peticiones'];
                                    return (
                                        <div key={x.petId} className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <div className="text-[11px] text-slate-500">{x.petId}{x.plaza ? ` · Plaza ${x.plaza}` : ''}</div>
                                                    <div className="text-sm font-medium text-slate-900">{info.puesto} · {info.turno.toLowerCase()}</div>
                                                    <div className="text-slate-600">{info.cliente}</div>
                                                    <div className="text-[11px] text-slate-500">{info.centro}</div>
                                                </div>
                                                <div className="text-right">
                                                    <Badge tone={e.tono} dot>{x.estado}</Badge>
                                                    <div className="text-[11px] text-slate-500 mt-1">{x.estado === 'Confirmada' ? 'Empieza el ' : x.estado === 'En misión' ? 'Desde el ' : ''}{fechaES(x.fecha)}</div>
                                                </div>
                                            </div>
                                            <p className="text-slate-600">{e.texto}{x.nota ? ` ${x.nota}` : ''}</p>
                                            <div className="flex flex-wrap gap-2">
                                                <Button size="sm" variant="ghost" icon={ArrowUpRight} onClick={() => { window.location.hash = destino[0]; }}>{destino[1]}</Button>
                                                {x.estado === 'En selección' && petitions.some(p => p.id === x.petId) && (
                                                    <Button size="sm" icon={Send} onClick={() => startAssignWizard(selectedCandidateForDetail, x.petId, 2)}>Proponer al cliente</Button>
                                                )}
                                                {x.estado === 'En selección' && (
                                                    <Button size="sm" variant="ghost" icon={X} onClick={() => cambiarCandidatura(selectedCandidateForDetail.id, x.petId, 'Descartada')}>Descartar</Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                };
                                return (
                                    <div className="space-y-4 text-xs">
                                        <SectionTitle actions={<Button size="sm" icon={Briefcase} onClick={() => startAssignWizard(selectedCandidateForDetail)}>Asignar a una petición</Button>}>Candidaturas activas</SectionTitle>
                                        {activas.length ? <div className="space-y-2">{activas.map(tarjeta)}</div> : (
                                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center text-slate-500">No está en ninguna petición ahora mismo.</div>
                                        )}
                                        {anteriores.length > 0 && <>
                                            <SectionTitle>Anteriores</SectionTitle>
                                            <div className="space-y-2">{anteriores.map(tarjeta)}</div>
                                        </>}
                                        <p className="text-[11px] text-slate-500">El orden es el de Peticiones: en selección → propuesta al cliente → confirmada (CPD y expediente) → en misión → finalizada.</p>
                                    </div>
                                );
                            })()}

                            {detailTab === 'historial' && (
                                <div className="space-y-4 text-xs">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold text-slate-900">Historial de comunicaciones y actividad</h4>
                                        <button 
                                            onClick={() => openContactModal(selectedCandidateForDetail)}
                                            className="bg-indigo-600 text-white font-semibold px-3 py-1 rounded-lg hover:bg-indigo-600 transition flex items-center gap-1"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> + Registrar contacto
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {selectedCandidateForDetail.communications.map((comm, idx) => (
                                            <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-slate-900">{comm.channel}</span>
                                                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.2 rounded font-medium text-[10px]">{comm.result}</span>
                                                    </div>
                                                    <span className="text-[11px] text-slate-400">{comm.date} · {comm.user}</span>
                                                </div>
                                                <p className="text-slate-700 text-xs">{comm.note}</p>
                                                {comm.nextAction && (
                                                    <div className="mt-2 text-[11px] text-indigo-600 font-semibold flex items-center gap-1">
                                                        <ArrowRight className="w-3 h-3" /> Próximo paso: {comm.nextAction}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                </Drawer>
            )}

            {/* ==================================================== */}
            {/* 5. GUIDED WIZARD: ASIGNACIÓN A PETICIÓN / PLAZA      */}
            {/* ==================================================== */}
            {wizardState.isOpen && (
                <Modal
                  title={'Asignar a petición'}
                  subtitle={<>Paso {wizardState.step} de 3 · {wizardState.candidate?.name} {wizardState.candidate?.lastName} ({wizardState.candidate?.id})</>}
                  onClose={() => setWizardState(prev => ({ ...prev, isOpen: false }))}
                  size="max-w-3xl"
                  toolbar={<>
                        <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-semibold flex-shrink-0">
                            {['Petición', 'Plaza y modalidad', 'Comprobar y confirmar'].map((paso, n) => (
                                <React.Fragment key={paso}>
                                    {n > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                                    <div className={`flex items-center gap-1.5 ${wizardState.step >= n + 1 ? 'text-indigo-600' : 'text-slate-400'}`}>
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${wizardState.step >= n + 1 ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-slate-700'}`}>{n + 1}</span>
                                        <span>{paso}</span>
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>
                  </>}
                  footer={<>
                  <div className="flex flex-1 items-center justify-between gap-2">
                            {wizardState.step > 1 ? (
                                <button 
                                    onClick={() => setWizardState(prev => ({ ...prev, step: prev.step - 1 }))}
                                    className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium shadow-xs"
                                >
                                    <ChevronLeft className="w-4 h-4" /> Anterior
                                </button>
                            ) : (
                                <button 
                                    onClick={() => setWizardState(prev => ({ ...prev, isOpen: false }))}
                                    className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium shadow-xs"
                                >
                                    Cancelar
                                </button>
                            )}

                            {wizardState.step < 3 ? (
                                <button 
                                    disabled={wizardState.step === 2 && wizardState.assignmentMode === 'propuesta' && !wizardState.selectedPlazaNum}
                                    onClick={() => setWizardState(prev => ({ ...prev, step: prev.step + 1 }))}
                                    className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs"
                                >
                                    Siguiente <ChevronRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button 
                                    onClick={confirmAssignmentWizard}
                                    className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs"
                                >
                                    <Check className="w-4 h-4" /> {wizardState.assignmentMode === 'propuesta' ? 'Proponer al cliente' : 'Añadir a la selección'}
                                </button>
                            )}
                  </div>
                  </>}
                >

                        {/* Step Content Area */}
                        <div className="p-6 flex-1 overflow-y-auto">
                            {/* PASO 1: PETICIÓN (una petición = un puesto) */}
                            {wizardState.step === 1 && (
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-900">Elige la petición</h4>
                                        <p className="text-xs text-slate-500">Peticiones con plazas por cubrir. Cada petición es un puesto con su turno.</p>
                                    </div>
                                    <SearchInput value={wizardState.busquedaPeticion} onChange={(v) => setWizardState(prev => ({ ...prev, busquedaPeticion: v }))} placeholder="Buscar petición, puesto, cliente o centro..." />
                                    <div className="space-y-2">
                                        {petitions.filter(pet => {
                                            const q = normalizarTexto(wizardState.busquedaPeticion || '');
                                            const pos = pet.positions[0];
                                            return !q || normalizarTexto(`${pet.id} ${pos.title} ${pos.turn} ${pet.client} ${pet.workplace}`).includes(q);
                                        }).map(pet => {
                                            const pos = pet.positions[0];
                                            const libres = pos.plazas.filter(p => p.status === 'Vacante').length;
                                            const elegida = wizardState.selectedPetitionId === pet.id;
                                            const ya = (wizardState.candidate?.candidaturas || []).find(x => x.petId === pet.id);
                                            return (
                                                <button
                                                    key={pet.id}
                                                    type="button"
                                                    onClick={() => setWizardState(prev => ({ ...prev, selectedPetitionId: pet.id, selectedPositionId: pos.id, selectedPlazaNum: pos.plazas.find(p => p.status === 'Vacante')?.plazaNum || null }))}
                                                    className={`w-full text-left p-3.5 rounded-xl border transition ${elegida ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                                                >
                                                    <span className="flex flex-wrap items-start justify-between gap-2">
                                                        <span>
                                                            <span className="block text-[11px] text-slate-500">{pet.id} · {pet.status}</span>
                                                            <span className="block text-sm font-medium text-slate-900">{pos.title} · {pos.turn.split(' (')[0].toLowerCase()}</span>
                                                            <span className="block text-xs text-slate-600">{pet.client}</span>
                                                            <span className="flex items-center gap-1 text-[11px] text-slate-500"><MapPin className="w-3 h-3 text-slate-400" />{pet.workplace} · empieza el {fechaES(pet.startDate)}</span>
                                                        </span>
                                                        <span className="text-right">
                                                            <Badge tone={libres ? 'success' : 'neutral'}>{libres} de {pos.plazasTotal} plazas libres</Badge>
                                                            {ya && <span className="block mt-1 text-[11px] text-amber-700">Ya tiene una candidatura: {ya.estado.toLowerCase()}</span>}
                                                        </span>
                                                    </span>
                                                    {pos.mandatoryRequirements?.length > 0 && (
                                                        <span className="mt-2 flex flex-wrap gap-1">
                                                            {pos.mandatoryRequirements.map(req => <span key={req} className="bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-medium px-2 py-0.5 rounded">{req}</span>)}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* PASO 2: PLAZA Y MODALIDAD */}
                            {wizardState.step === 2 && (() => {
                                const currentPet = petitions.find(p => p.id === wizardState.selectedPetitionId);
                                const currentPos = currentPet?.positions[0];
                                const propuesta = wizardState.assignmentMode === 'propuesta';
                                return (
                                    <div className="space-y-4">
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                                            <div>
                                                <span className="text-slate-500">{currentPet?.id} · {currentPet?.client}</span>
                                                <p className="font-semibold text-slate-900">{currentPos?.title} · {currentPos?.turn}</p>
                                            </div>
                                            <button onClick={() => setWizardState(prev => ({ ...prev, step: 1 }))} className="text-indigo-600 font-semibold hover:underline">Cambiar</button>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                            {[
                                                { id: 'seleccion', titulo: 'Añadir a la selección', texto: 'Queda en selección para esta petición (entrevista, pruebas) sin ocupar plaza. Se propone al cliente más adelante.' },
                                                { id: 'propuesta', titulo: 'Proponer al cliente', texto: 'Se reserva una plaza vacante y el cliente la confirma en Peticiones. Al confirmarla se genera el CPD y se abre el expediente en Contratos y altas.' },
                                            ].map(m => (
                                                <label key={m.id} className={`flex items-start gap-2 rounded-xl border p-3 cursor-pointer ${wizardState.assignmentMode === m.id ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20' : 'border-slate-200 bg-white'}`}>
                                                    <input type="radio" name="modalidad" checked={wizardState.assignmentMode === m.id} onChange={() => setWizardState(prev => ({ ...prev, assignmentMode: m.id }))} className="mt-0.5 text-indigo-600 focus:ring-indigo-500" />
                                                    <span><span className="block font-semibold text-slate-900">{m.titulo}</span><span className="text-slate-600">{m.texto}</span></span>
                                                </label>
                                            ))}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-900">Plazas de la petición</h4>
                                            <p className="text-xs text-slate-500">{propuesta ? 'Elige la plaza vacante que se reserva para esta persona.' : 'Para añadir a la selección no hace falta elegir plaza.'}</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {currentPos?.plazas.map(plz => {
                                                const libre = plz.status === 'Vacante';
                                                const elegida = propuesta && Number(wizardState.selectedPlazaNum) === plz.plazaNum;
                                                return (
                                                    <button
                                                        key={plz.plazaNum}
                                                        type="button"
                                                        disabled={!libre || !propuesta}
                                                        onClick={() => setWizardState(prev => ({ ...prev, selectedPlazaNum: plz.plazaNum }))}
                                                        className={`text-left p-3 rounded-xl border text-xs transition ${!libre ? 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed' : elegida ? 'bg-indigo-50/70 border-indigo-600 ring-2 ring-indigo-500/20' : propuesta ? 'bg-white border-slate-200 hover:border-slate-300' : 'bg-white border-slate-200 cursor-default'}`}
                                                    >
                                                        <span className="flex items-center justify-between mb-1">
                                                            <span className="font-semibold text-slate-900">Plaza {plz.plazaNum} de {currentPos.plazasTotal}</span>
                                                            <Badge tone={libre ? 'success' : plz.status === 'Cubierta' ? 'info' : 'warning'}>{plz.status}</Badge>
                                                        </span>
                                                        <span className="block text-slate-600">{libre ? 'Libre' : `${plz.candidateName}${plz.status === 'Pendiente del cliente' ? ' · pendiente de que el cliente confirme' : ''}`}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* PASO 4: VALIDACIÓN, ALERTAS Y CONFIRMACIÓN */}
                            {wizardState.step === 3 && (
                                <div className="space-y-4">
                                    {(() => {
                                        const currentPet = petitions.find(p => p.id === wizardState.selectedPetitionId);
                                        const currentPos = currentPet?.positions.find(p => p.id === wizardState.selectedPositionId);
                                        const { blockers, warnings } = runWizardCompatibilityCheck(wizardState.selectedPetitionId, wizardState.selectedPositionId, wizardState.candidate);

                                        return (
                                            <>
                                                {/* Summary card */}
                                                <div className="bg-white text-slate-900 p-4 rounded-xl flex items-start justify-between text-xs border border-slate-200">
                                                    <div>
                                                        <p className="text-indigo-600 font-semibold text-[10px]">Resumen de Asignación</p>
                                                        <h4 className="text-base font-semibold text-slate-900 mt-0.5">
                                                            {wizardState.candidate?.name} {wizardState.candidate?.lastName}
                                                        </h4>
                                                        <p className="text-slate-500 mt-1">
                                                            Destino: <strong>{currentPet?.id} · {currentPet?.client}</strong>
                                                        </p>
                                                        <p className="text-slate-500">
                                                            Puesto: <strong>{currentPos?.title}</strong> · {currentPos?.turn}{wizardState.assignmentMode === 'propuesta' && <> · Plaza <strong>{wizardState.selectedPlazaNum}</strong></>}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="bg-indigo-600 text-white font-semibold px-2 py-0.5 rounded text-[10px]">
                                                            {wizardState.assignmentMode === 'propuesta' ? 'Propuesta al cliente' : 'En selección'}
                                                        </span>
                                                        <p className="text-slate-500 text-[11px] mt-2">Empieza el {fechaES(currentPet?.startDate)}</p>
                                                    </div>
                                                </div>

                                                {/* BLOCKERS (if any) */}
                                                {blockers.length > 0 && (
                                                    <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 text-xs">
                                                        <div className="flex items-center gap-2 text-rose-900 font-semibold mb-2">
                                                            <AlertOctagon className="w-4 h-4 text-rose-600" />
                                                            <span>Incompatibilidades Críticas / Bloqueos Detectados ({blockers.length})</span>
                                                        </div>
                                                        <ul className="space-y-1.5 text-rose-800 list-disc list-inside">
                                                            {blockers.map((b, idx) => (
                                                                <li key={idx} className="font-medium">{b}</li>
                                                            ))}
                                                        </ul>
                                                        <p className="text-[11px] text-rose-600 mt-2 font-semibold">
                                                            * No se recomienda completar la asignación sin solventar estos requisitos previos (ej. renovar DNI o consentimientos).
                                                        </p>
                                                    </div>
                                                )}

                                                {/* WARNINGS (if any) */}
                                                {warnings.length > 0 && (
                                                    <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs">
                                                        <div className="flex items-center gap-2 text-amber-900 font-semibold mb-2">
                                                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                                                            <span>Advertencias y Verificaciones ({warnings.length})</span>
                                                        </div>
                                                        <ul className="space-y-1 text-amber-800 list-disc list-inside">
                                                            {warnings.map((w, idx) => (
                                                                <li key={idx}>{w}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* ALL OK Banner */}
                                                {blockers.length === 0 && warnings.length === 0 && (
                                                    <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-xs flex items-center gap-3">
                                                        <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                                                        <div>
                                                            <h5 className="font-semibold text-emerald-950">Validación de compatibilidad 100% OK</h5>
                                                            <p className="text-emerald-800">
                                                                El candidato cumple todos los requisitos formativos, documentación de identidad, RGPD y disponibilidad horaria para la plaza seleccionada.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Optional Notes for Activity Log */}
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-700">Notas de asignación / justificación (opcional):</label>
                                                    <textarea 
                                                        value={wizardState.overrideReason}
                                                        onChange={(e) => setWizardState(prev => ({ ...prev, overrideReason: e.target.value }))}
                                                        placeholder="Añade cualquier observación sobre la incorporación o acuerdos con el cliente..."
                                                        className="w-full mt-1 p-2.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                                        rows={2}
                                                    />
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>

                        {/* Wizard Footer Navigation */}
                </Modal>
            )}

            {/* ==================================================== */}
            {/* 6. MODAL: CONTACTAR CANDIDATO (PHONE, SMS, WHATSAPP) */}
            {/* ==================================================== */}
            {contactModalCandidate && (
                <Modal
                  title={'Contactar'}
                  subtitle={<>{contactModalCandidate.name} {contactModalCandidate.lastName} · {contactModalCandidate.phone}</>}
                  onClose={() => setContactModalCandidate(null)}
                  footer={<>
                  <div className="flex flex-1 items-center justify-between gap-2">
                            <button 
                                onClick={() => setContactModalCandidate(null)}
                                className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium shadow-xs"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={submitContactAction}
                                className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs"
                            >
                                <Send className="w-3.5 h-3.5" /> Guardar Actividad
                            </button>
                  </div>
                  </>}
                >

                        <div className="space-y-4 text-xs">
                            {/* Channel Selector */}
                            <div>
                                <label className="font-semibold text-slate-700 block mb-1.5">Canal de Comunicación:</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { id: 'Llamada', label: 'Llamada', icon: Phone },
                                        { id: 'WhatsApp', label: 'WhatsApp', icon: MessageSquare },
                                        { id: 'Email', label: 'Email', icon: Mail },
                                        { id: 'SMS', label: 'SMS', icon: Smartphone }
                                    ].map(ch => {
                                        const Icon = ch.icon;
                                        const isSel = contactChannel === ch.id;
                                        return (
                                            <button 
                                                key={ch.id}
                                                type="button"
                                                onClick={() => setContactChannel(ch.id)}
                                                className={`p-2.5 rounded-lg border text-center font-semibold flex flex-col items-center gap-1 transition ${isSel ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                <Icon className="w-4 h-4" />
                                                <span>{ch.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Template Selector */}
                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Plantilla rápida:</label>
                                <select 
                                    value={contactTemplate}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setContactTemplate(val);
                                        if (val === 'entrevista') {
                                            setContactMessage(`Hola ${contactModalCandidate.name}, te contactamos de ETT Global para convocarte a una entrevista para vacante de logística en Basauri.`);
                                        } else if (val === 'renovacionDoc') {
                                            setContactMessage(`Estimado/a ${contactModalCandidate.name}, te recordamos la necesidad de aportar documento de identidad renovado para mantener activas tus candidaturas en TramitNow ETT.`);
                                        } else if (val === 'ofertaUrgente') {
                                            setContactMessage(`¡Oferta urgente de turno en Basauri! Buscamos operario para incorporación el próximo lunes. Confírmanos tu disponibilidad.`);
                                        }
                                    }}
                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                                >
                                    <option value="libre">Mensaje libre / Personalizado</option>
                                    <option value="entrevista">Convocatoria a Entrevista Técnica</option>
                                    <option value="renovacionDoc">Solicitud Renovación Documental / DNI</option>
                                    <option value="ofertaUrgente">Oferta Urgente Incorporación Inmediata</option>
                                </select>
                            </div>

                            {/* Message Body */}
                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Mensaje / Guión de conversación:</label>
                                <textarea 
                                    value={contactMessage}
                                    onChange={(e) => setContactMessage(e.target.value)}
                                    rows={3}
                                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            {/* Result Selector */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Resultado de la acción:</label>
                                    <select 
                                        value={contactResult}
                                        onChange={(e) => setContactResult(e.target.value)}
                                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                                    >
                                        <option value="Interesado y disponible">Interesado y disponible</option>
                                        <option value="Citado para entrevista">Citado para entrevista</option>
                                        <option value="No contesta / Buzón">No contesta / Buzón</option>
                                        <option value="No disponible temporalmente">No disponible temporalmente</option>
                                        <option value="Rechaza oferta">Rechaza oferta / Desinteresado</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Nota interna para la ficha:</label>
                                    <input 
                                        type="text"
                                        value={contactNote}
                                        onChange={(e) => setContactNote(e.target.value)}
                                        placeholder="Ej. Prefiere turno de mañana..."
                                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>

                </Modal>
            )}

            {/* ==================================================== */}
            {/* 7. MODAL: ALTA RÁPIDA DE CANDIDATO                   */}
            {/* ==================================================== */}
            {isQuickCreateOpen && (
                <Modal
                  title={'Alta rápida de candidato'}
                  subtitle={'Crea la ficha básica y completa el perfil profesional después.'}
                  onClose={() => setIsQuickCreateOpen(false)}
                  footer={<>
                  <div className="flex flex-1 items-center justify-between gap-2">
                                <button 
                                    type="button"
                                    onClick={() => setIsQuickCreateOpen(false)}
                                    className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium shadow-xs"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" form="form-alta-candidato"
                                    className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs"
                                >
                                    <Check className="w-4 h-4" /> Crear Candidato
                                </button>
                  </div>
                  </>}
                >
                  <form id="form-alta-candidato" onSubmit={handleQuickCreateSubmit}>

                            <div className="space-y-3.5 text-xs">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Nombre *</label>
                                        <input required name="name" type="text" placeholder="Ej. Sergio" className="w-full p-2 border border-slate-200 rounded-lg text-xs" />
                                    </div>
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Apellidos *</label>
                                        <input required name="lastName" type="text" placeholder="Ej. Marín López" className="w-full p-2 border border-slate-200 rounded-lg text-xs" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Documento identidad (DNI/NIE) *</label>
                                        <input required name="dni" type="text" placeholder="12345678Z" className="w-full p-2 border border-slate-200 rounded-lg font-mono text-xs" />
                                    </div>
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Caducidad DNI</label>
                                        <input name="dniExpiry" type="date" defaultValue="2028-12-31" className="w-full p-2 border border-slate-200 rounded-lg text-xs" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Teléfono Móvil *</label>
                                        <input required name="phone" type="tel" placeholder="+34 600 000 000" className="w-full p-2 border border-slate-200 rounded-lg text-xs" />
                                    </div>
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Correo Electrónico *</label>
                                        <input required name="email" type="email" placeholder="candidato@email.com" className="w-full p-2 border border-slate-200 rounded-lg text-xs" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Población</label>
                                        <input name="city" type="text" defaultValue="Basauri" className="w-full p-2 border border-slate-200 rounded-lg text-xs" />
                                    </div>
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Provincia</label>
                                        <input name="province" type="text" defaultValue="Bizkaia" className="w-full p-2 border border-slate-200 rounded-lg text-xs" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Categoría Principal</label>
                                        <select name="category" className="w-full p-2 border border-slate-200 rounded-lg text-xs">
                                            {[...new Set(catalogos.perfiles.map(p => p.grupo))].map(g => (
                                                <optgroup key={g} label={g}>
                                                    {catalogos.perfiles.filter(p => p.grupo === g).map(p => <option key={p.nombre} value={p.nombre}>{p.nombre}</option>)}
                                                </optgroup>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Años Experiencia</label>
                                        <input name="experience" type="number" defaultValue="2" min="0" max="40" className="w-full p-2 border border-slate-200 rounded-lg text-xs" />
                                    </div>
                                </div>

                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Nº Seguridad Social (NSS)</label>
                                    <input name="nss" type="text" placeholder="28/12345678/90 (Opcional en alta rápida)" className="w-full p-2 border border-slate-200 rounded-lg font-mono text-xs" />
                                </div>

                                <div className="pt-2 border-t border-slate-100 space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                                        <input name="hasForklift" type="checkbox" defaultChecked className="rounded text-indigo-600 focus:ring-indigo-500" />
                                        <span>Dispone de Carnet de Carretillero UNE 58451</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-emerald-800">
                                        <input name="rgpdAccept" type="checkbox" defaultChecked className="rounded text-emerald-600 focus:ring-indigo-500" />
                                        <span>Acepta cláusula de tratamiento y cesión de datos RGPD ETT Global</span>
                                    </label>
                                </div>
                            </div>

                  </form>
                </Modal>
            )}

            {/* ==================================================== */}
            {/* 8. MODAL: IMPORTAR DESDE PORTALES DE EMPLEO          */}
            {/* ==================================================== */}
            {isImportPortalOpen && (
                <Modal
                  title={'Importar de portales'}
                  subtitle={'Conexiones activas con los portales de empleo.'}
                  onClose={() => setIsImportPortalOpen(false)}
                  footer={<>
                            <button 
                                onClick={() => setIsImportPortalOpen(false)}
                                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 text-xs font-semibold"
                            >
                                Cerrar
                            </button>
                  </>}
                >

                        <div className="space-y-3.5 text-xs">
                            <p className="text-slate-600">
                                Selecciona el conector del portal para sincronizar las últimas candidaturas recibidas e incorporarlas al ERP:
                            </p>

                            <div className="space-y-2.5">
                                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 font-semibold text-sm flex items-center justify-center shadow-xs">
                                            IJ
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-900 text-xs">InfoJobs e-Recruitment API</h4>
                                            <p className="text-[11px] text-slate-500">Conexión en tiempo real · 3 inscripciones pendientes</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleImportFromPortal('InfoJobs')}
                                        className="bg-indigo-600 hover:bg-indigo-600 text-white font-semibold px-3 py-1.5 rounded-lg text-xs shadow-2xs transition"
                                    >
                                        Importar
                                    </button>
                                </div>

                                <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/40 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 font-semibold text-sm flex items-center justify-center shadow-xs">
                                            in
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-900 text-xs">LinkedIn Recruiter ATS</h4>
                                            <p className="text-[11px] text-slate-500">Sincronización de perfiles guardados</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleImportFromPortal('LinkedIn')}
                                        className="bg-indigo-700 hover:bg-indigo-800 text-white font-semibold px-3 py-1.5 rounded-lg text-xs shadow-2xs transition"
                                    >
                                        Importar
                                    </button>
                                </div>

                                <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/40 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 font-semibold text-sm flex items-center justify-center shadow-xs">
                                            M
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-900 text-xs">Monster / Indeed XML feed</h4>
                                            <p className="text-[11px] text-slate-500">Importación por lote de CVs recibidos</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleImportFromPortal('Monster')}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs shadow-2xs transition"
                                    >
                                        Importar
                                    </button>
                                </div>
                            </div>
                        </div>

                </Modal>
            )}

            {/* ==================================================== */}
            {/* 9. MODAL: ACCIONES MASIVAS                           */}
            {/* ==================================================== */}
            {isBulkActionModalOpen && (
                <Modal
                  title={`Acción masiva: ${selectedIds.length} candidatos`}
                  subtitle={'Se aplicará a todos los seleccionados.'}
                  onClose={() => setIsBulkActionModalOpen(false)}
                  size="max-w-md"
                  footer={<>
                  <div className="flex flex-1 items-center justify-between gap-2">
                            <button 
                                onClick={() => setIsBulkActionModalOpen(false)}
                                className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium shadow-xs"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={() => {
                                    setIsBulkActionModalOpen(false);
                                    showToast('Acción masiva completada', `Operación procesada con éxito para ${selectedIds.length} candidatos.`, 'success');
                                    setSelectedIds([]);
                                }}
                                className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs"
                            >
                                Confirmar y Enviar
                            </button>
                  </div>
                  </>}
                >

                        <div className="space-y-4 text-xs">
                            {bulkActionType === 'contact' && (
                                <>
                                    <p className="text-slate-700">Se enviará una comunicación por SMS/Email a los {selectedIds.length} candidatos seleccionados:</p>
                                    <textarea 
                                        defaultValue="Hola, desde ETT Global te informamos de nuevas oportunidades de empleo en el sector logístico de Bizkaia. Responde a este mensaje para confirmar disponibilidad."
                                        rows={3}
                                        className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
                                    />
                                </>
                            )}

                            {bulkActionType === 'docRequest' && (
                                <>
                                    <p className="text-slate-700">Se generará una solicitud formal con enlace seguro para que los candidatos aporten o renueven su documento de identidad y RGPD.</p>
                                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-800">
                                        Enlace auto-firmable con validez de 7 días.
                                    </div>
                                </>
                            )}
                        </div>

                </Modal>
            )}

            {/* SUBIR O RENOVAR UN DOCUMENTO DEL CANDIDATO */}
            {docModal && selectedCandidateForDetail && (
                <Modal
                    title={docModal.doc ? `Renovar ${docModal.doc.type}` : 'Subir documento'}
                    subtitle={`${selectedCandidateForDetail.name} ${selectedCandidateForDetail.lastName}`}
                    onClose={() => setDocModal(null)}
                    size="max-w-md"
                    footer={<>
                        <Button onClick={() => setDocModal(null)}>Cancelar</Button>
                        <Button variant="primary" icon={FileUp} disabled={!docModal.archivo || (docModal.tipo === 'DNI/NIE' && !docModal.expiry)} onClick={guardarDocumento}>
                            {docModal.doc ? 'Renovar' : 'Subir'}
                        </Button>
                    </>}
                >
                    <div className="space-y-4 text-xs">
                        {docModal.doc && (
                            <Notice tone="info" icon={Info}>
                                Sustituye a {docModal.doc.name}{docModal.doc.expiry ? `, que caduca o caducó el ${fechaES(docModal.doc.expiry)}` : ''}. El cambio queda en el historial.
                            </Notice>
                        )}
                        {!docModal.doc && (
                            <Field label="Tipo de documento">
                                <Select value={docModal.tipo} onChange={(e) => setDocModal(m => ({ ...m, tipo: e.target.value }))} className="w-full">
                                    {TIPOS_DOCUMENTO_CANDIDATO.map(t => <option key={t} value={t}>{t}</option>)}
                                </Select>
                            </Field>
                        )}
                        <div className="rounded-xl border-2 border-dashed border-slate-200 p-5 text-center space-y-2">
                            <UploadCloud className="w-6 h-6 text-slate-400 mx-auto" />
                            {docModal.archivo ? (
                                <div className="font-medium text-slate-900">{docModal.archivo}</div>
                            ) : (
                                <div className="text-slate-500">PDF, JPG o PNG · hasta 10 MB</div>
                            )}
                            <Button
                                size="sm"
                                onClick={() => setDocModal(m => ({ ...m, archivo: `${m.tipo.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ]+/g, '_')}_${selectedCandidateForDetail.lastName.replace(/\s+/g, '_')}_${new Date().getFullYear()}.pdf` }))}
                            >
                                {docModal.archivo ? 'Cambiar archivo' : 'Elegir archivo (simulado)'}
                            </Button>
                        </div>
                        <Field label={docModal.tipo === 'DNI/NIE' ? 'Caduca el (obligatorio)' : 'Caduca el (si caduca)'} hint={`Avisaremos al candidato ${DIAS_AVISO_CADUCIDAD} días antes.`}>
                            <TextInput type="date" value={docModal.expiry} onChange={(e) => setDocModal(m => ({ ...m, expiry: e.target.value }))} />
                        </Field>
                        <p className="text-[11px] text-slate-500">Queda como «Pendiente de validar» hasta que alguien de la ETT lo revise.</p>
                    </div>
                </Modal>
            )}

            {/* ELIMINAR UN DOCUMENTO */}
            {docAEliminar && (
                <Confirmar
                    title={`¿Eliminar ${docAEliminar.type}?`}
                    onClose={() => setDocAEliminar(null)}
                    onConfirm={eliminarDocumento}
                    alternativa={['caducado', 'pronto'].includes(estadoDocumento(docAEliminar).id) ? {
                        label: 'Renovarlo en su lugar',
                        icon: RefreshCw,
                        onClick: () => { const doc = docAEliminar; setDocAEliminar(null); setDocModal({ doc, tipo: doc.type, archivo: '', expiry: '' }); },
                    } : undefined}
                >
                    Se borra el archivo {docAEliminar.name}.
                    {['DNI/NIE', 'RGPD', 'Seguridad Social'].includes(docAEliminar.type) && ' Es obligatorio para contratar: habrá que pedirlo de nuevo.'}
                </Confirmar>
            )}

            {/* AVISO POR EMAIL DE DOCUMENTOS POR RENOVAR */}
            {avisoDocs && selectedCandidateForDetail && (
                <Modal
                    title="Avisar para renovar documentos"
                    subtitle={`Para ${selectedCandidateForDetail.name} ${selectedCandidateForDetail.lastName} · ${selectedCandidateForDetail.email}`}
                    onClose={() => setAvisoDocs(null)}
                    size="max-w-lg"
                    footer={<>
                        <Button onClick={() => setAvisoDocs(null)}>Cancelar</Button>
                        <Button variant="primary" icon={Send} disabled={!selectedCandidateForDetail.email} onClick={enviarAvisoDocs}>Enviar email</Button>
                    </>}
                >
                    <div className="space-y-4 text-xs">
                        <Field label="Asunto"><TextInput value={avisoDocs.asunto} onChange={(e) => setAvisoDocs(a => ({ ...a, asunto: e.target.value }))} /></Field>
                        <Field label="Mensaje">
                            <textarea rows={10} value={avisoDocs.mensaje} onChange={(e) => setAvisoDocs(a => ({ ...a, mensaje: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                        </Field>
                        <label className="flex items-start gap-2 text-slate-700">
                            <input type="checkbox" checked={avisoDocs.recordar} onChange={(e) => setAvisoDocs(a => ({ ...a, recordar: e.target.checked }))} className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                            Recordárselo cada 7 días hasta que los renueve
                        </label>
                        {!selectedCandidateForDetail.email && <Notice tone="warning" icon={AlertTriangle}>El candidato no tiene email. Añádelo en Datos personales.</Notice>}
                    </div>
                </Modal>
            )}

            {/* ELIMINAR CANDIDATO */}
            {candidatoAEliminar && (candidatoAEliminar.assignedMission ? (
                <Modal
                    title={`No se puede eliminar a ${candidatoAEliminar.name} ${candidatoAEliminar.lastName}`}
                    onClose={() => setCandidatoAEliminar(null)}
                    size="max-w-md"
                    footer={<Button variant="primary" onClick={() => setCandidatoAEliminar(null)}>Entendido</Button>}
                >
                    <p className="text-xs text-slate-600">
                        Está en misión en {candidatoAEliminar.assignedMission.petitionId} ({candidatoAEliminar.assignedMission.client}). Hay que terminar la misión y la relación laboral antes de borrar sus datos.
                    </p>
                </Modal>
            ) : (
                <Confirmar
                    title={`¿Eliminar a ${candidatoAEliminar.name} ${candidatoAEliminar.lastName}?`}
                    onClose={() => setCandidatoAEliminar(null)}
                    onConfirm={eliminarCandidato}
                    alternativa={candidatoAEliminar.status !== 'Descartado' ? {
                        label: 'Marcar como descartado',
                        icon: UserX,
                        onClick: () => {
                            const c = candidatoAEliminar;
                            actualizarCandidato(c.id, { status: 'Descartado' }, { result: 'Descartado', note: 'Marcado como descartado en lugar de eliminarlo.' });
                            setCandidatoAEliminar(null);
                            showToast('Candidato descartado', `${c.name} ${c.lastName} se mantiene en la base de datos como descartado.`);
                        },
                    } : undefined}
                >
                    Se borran sus datos personales, sus documentos y su historial (por ejemplo, si ejerce su derecho de supresión del RGPD).
                </Confirmar>
            ))}

            {/* ==================================================== */}
            {/* 10. FLOATING TOAST FEEDBACK NOTIFICATION            */}
            {/* ==================================================== */}
            {toast && (
                <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-slate-900 text-white p-4 rounded-xl shadow-lg border border-slate-800 flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-300">
                    {toast.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    ) : toast.type === 'error' ? (
                        <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                    ) : (
                        <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                        <h4 className="font-semibold text-xs text-white">{toast.title}</h4>
                        <p className="text-[11px] text-slate-300 mt-0.5">{toast.message}</p>
                    </div>
                    <button onClick={() => setToast(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </>
    );
}
