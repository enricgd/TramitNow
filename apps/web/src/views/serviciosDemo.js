// Servicios que factura la ETT además de las horas (Mi ETT → Facturación). Cada servicio que se hace se registra
// en Facturación («Añadir servicio a facturar») y aparece en «Por facturar» con las horas de ese cliente y mes.
export const FORMAS_COBRO = {
    porcentaje: { texto: '% del salario bruto anual', unidad: 'proceso' },
    persona: { texto: 'Por persona', unidad: 'persona' },
    unidad: { texto: 'Por unidad', unidad: 'ud.' },
    fijo: { texto: 'Importe fijo', unidad: 'servicio' },
};
// valor: % (si se cobra en porcentaje) o precio por defecto. unidad: cómo se cuenta (por ejemplo, km o nómina).
export const SERVICIOS_INICIALES = [
    { id: 'seleccion', nombre: 'Selección de personal', cobro: 'porcentaje', valor: 15, unidad: 'proceso', activo: true },
    { id: 'formacion_prl', nombre: 'Formación PRL', cobro: 'persona', valor: 85, unidad: 'persona', activo: true },
    { id: 'reconocimiento', nombre: 'Reconocimiento médico', cobro: 'persona', valor: 45, unidad: 'persona', activo: true },
    { id: 'nominas', nombre: 'Gestión de nóminas', cobro: 'unidad', valor: 12, unidad: 'nómina', activo: true },
    { id: 'desplazamiento', nombre: 'Desplazamientos', cobro: 'unidad', valor: 0.26, unidad: 'km', activo: true },
    { id: 'otro', nombre: 'Otro servicio', cobro: 'fijo', valor: 0, unidad: 'servicio', activo: true },
];
// La ficha de un cliente (Empresas) puede abrir Facturación con el formulario de servicio ya preparado
export const CLAVE_SERVICIO_PENDIENTE = 'tramitnow-servicio-para-cliente';
