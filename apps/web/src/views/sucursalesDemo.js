// Sucursales de la ETT de ejemplo (las de Mi ETT) y qué sucursal lleva a cada cliente.
// En real, cada presupuesto y cada petición guardan su sucursal, y el usuario ve las de su alcance
// (rol y sucursales en el JWT: ver db/README.md).
export const SUCURSALES = [
    { id: 'norte', nombre: 'Delegación Norte (Bilbao)', corto: 'Norte' },
    { id: 'bcn', nombre: 'Sucursal Barcelona', corto: 'Barcelona' },
];

const POR_CLIENTE = {
    'Trans-Logística Ibérica Norte, S.L.': 'norte',
    'Manufacturas Metálicas del Henares, S.A.': 'norte',
    'Hostelería & Eventos Premium BCN, S.L.': 'bcn',
    'Mediterránea Agrícola y Envasado, S.L.': 'bcn',
};
export const sucursalDeCliente = (nombre) => POR_CLIENTE[nombre] || 'norte';
export const sucursal = (id) => SUCURSALES.find(s => s.id === id) || SUCURSALES[0];

// Sucursales que ve el usuario de la demo (Administrador: todas). El filtro por sucursal solo sale
// a quien ve más de una.
export const SUCURSALES_USUARIO = SUCURSALES.map(s => s.id);
export const veVariasSucursales = SUCURSALES_USUARIO.length > 1;
