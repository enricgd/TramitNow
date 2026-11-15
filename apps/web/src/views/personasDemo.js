// Personas de ejemplo que salen en varias pantallas (Candidatos, Peticiones, Contratos y altas, Personal en misión).
// Así cada persona tiene el mismo código, DNI, teléfono y email en todas. En real vendrán de apps/api.
const LETRAS_DNI = 'TRWAGMYFPDXBNJZSQVHLCKE';

// Número de candidato (CAN-0xxx) de cada persona
export const NUMERO_PERSONA = {
    // PET-2026-0044: camareros/as en misión (y la baja de la plaza 3)
    'Garazi Uribe Arana': 110, 'Pablo Ruiz Cano': 111, 'Youssef Amrani': 112, 'Lucía Ferrer Sanz': 113, 'Marc Puig Soler': 114,
    'Aitana Roca Vidal': 115, 'Daniel Sousa Prieto': 116, 'Irene Campos Gil': 117, 'Óscar León Mena': 118, 'Sara Benítez Lago': 119,
    // PET-2026-0031: terminaron el 30/09
    'Clara Esteve Ros': 120, 'Bruno Lage Costa': 121, 'Nerea Olabarria Gil': 122, 'Adrián Vela Soto': 123, 'Paula Rius Ferrer': 124, 'Sergio Navas Peña': 125,
    // Se incorporan (Contratos y altas)
    'Jon Ander Etxebarria Bilbao': 126, 'Ainhoa Larrazabal Urkijo': 127, 'Mamadou Diallo': 128, 'Laura Morales San Sebastián': 129,
    'Iker Agirrebeitia Mendia': 130, 'Unai García Zabaleta': 131, 'Carlos Manuel Ortiz Reyes': 132,
    'Noa Serra Pons': 133, 'Hugo Martín Vera': 134, 'Ane Goikoetxea Ruiz': 135, 'Iván Molina Prat': 136,
    // En selección en Peticiones
    'Nerea Barandiarán Goikoetxea': 201, 'David Aranguren Sola': 202, 'Yeray Fernández Ramos': 203, 'Kepa Iturriaga Elorrieta': 204,
    'Sofía Valderrama Galdós': 205, 'Ibai Zubizarreta Lasa': 206, 'Leire Ortuzar Bengoa': 207, 'Gorka Bilbao Arrieta': 208,
    'Marina Soler Bosch': 301, 'Jordi Vila Mas': 302, 'Fatima Zahra El Idrissi': 303, 'Álex Romero Gil': 304,
};
// Quien tiene NIE en vez de DNI
export const NIE_PERSONA = { 'Mamadou Diallo': 'X0000000T' };

// Código, DNI, teléfono y email de ejemplo de una persona (null si no está en la lista)
export const contactoDemo = (nombre) => {
    const n = NUMERO_PERSONA[nombre];
    if (!n) return null;
    const [nombrePila, apellido = ''] = nombre.split(' ');
    const usuario = `${nombrePila}.${apellido}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return {
        id: `CAN-0${n}`,
        dni: NIE_PERSONA[nombre] || `0000${String(n).padStart(4, '0')}${LETRAS_DNI[n % 23]}`,
        telefono: `+34 600 000 ${String(n).padStart(3, '0')}`,
        email: `${usuario}@email.example`,
    };
};
