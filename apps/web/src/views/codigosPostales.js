// Código postal → provincia (las dos primeras cifras) y población (listado corto de ejemplo).
// Lo usan Candidatos y Mi ETT. En real: el listado completo de códigos postales y el callejero (ver la nota para Enric).
export const PROVINCIAS_CP = {
    '01': 'Araba/Álava', '02': 'Albacete', '03': 'Alicante', '04': 'Almería', '05': 'Ávila', '06': 'Badajoz', '07': 'Illes Balears',
    '08': 'Barcelona', '09': 'Burgos', '10': 'Cáceres', '11': 'Cádiz', '12': 'Castellón', '13': 'Ciudad Real', '14': 'Córdoba',
    '15': 'A Coruña', '16': 'Cuenca', '17': 'Girona', '18': 'Granada', '19': 'Guadalajara', '20': 'Gipuzkoa', '21': 'Huelva',
    '22': 'Huesca', '23': 'Jaén', '24': 'León', '25': 'Lleida', '26': 'La Rioja', '27': 'Lugo', '28': 'Madrid', '29': 'Málaga',
    '30': 'Murcia', '31': 'Navarra', '32': 'Ourense', '33': 'Asturias', '34': 'Palencia', '35': 'Las Palmas', '36': 'Pontevedra',
    '37': 'Salamanca', '38': 'Santa Cruz de Tenerife', '39': 'Cantabria', '40': 'Segovia', '41': 'Sevilla', '42': 'Soria',
    '43': 'Tarragona', '44': 'Teruel', '45': 'Toledo', '46': 'Valencia', '47': 'Valladolid', '48': 'Bizkaia', '49': 'Zamora',
    '50': 'Zaragoza', '51': 'Ceuta', '52': 'Melilla',
};
export const POBLACIONES_CP = {
    '48001': 'Bilbao', '48002': 'Bilbao', '48004': 'Bilbao', '48970': 'Basauri', '48901': 'Barakaldo', '48960': 'Galdakao',
    '48450': 'Etxebarri', '48940': 'Leioa', '48990': 'Getxo', '48200': 'Durango', '08001': 'Barcelona', '08004': 'Barcelona',
    '08008': 'Barcelona', '08901': "L'Hospitalet de Llobregat", '08911': 'Badalona', '08940': 'Cornellà de Llobregat',
    '08930': 'Sant Adrià de Besòs', '08950': 'Esplugues de Llobregat',
};
// Provincia y población que corresponden a un código postal (lo que se sepa)
export const datosDeCp = (cp = '') => ({
    provincia: cp.length >= 2 ? PROVINCIAS_CP[cp.slice(0, 2)] || '' : '',
    poblacion: POBLACIONES_CP[cp] || '',
});
