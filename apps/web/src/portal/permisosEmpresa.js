// Permisos de cada contacto del cliente en el Área de empresas.
// Los da la ETT desde el ERP (Empresas → Contactos); en el portal solo se ven, no se cambian.
export const PERMISOS_PORTAL = [
    { id: 'pedir', texto: 'Pedir personal', detalle: 'Crear peticiones y ver cómo se cubren las plazas' },
    { id: 'personal', texto: 'Personal en misión', detalle: 'Ver quién trabaja, pedir prórrogas y comunicar incidencias' },
    { id: 'horas', texto: 'Validar horas', detalle: 'Validar los partes semanales o poner reparos' },
    { id: 'facturas', texto: 'Presupuestos y facturas', detalle: 'Ver los presupuestos y descargar las facturas' },
    { id: 'documentos', texto: 'Firmar documentos', detalle: 'Firmar los CPD y enviar la evaluación de riesgos' },
];

// Permisos que se proponen al dar acceso, según los roles del contacto en la ficha de Empresas
export const permisosPorRoles = (roles = []) => {
    const tiene = (...r) => r.some(x => roles.includes(x));
    return PERMISOS_PORTAL.map(p => p.id).filter(id => (
        (id === 'pedir' && tiene('Solicitante', 'RR. HH.', 'Dirección'))
        || (id === 'personal' && tiene('Operativo', 'Solicitante', 'RR. HH.', 'Valida horas'))
        || (id === 'horas' && tiene('Valida horas'))
        || (id === 'facturas' && tiene('Facturación', 'Destinatario de Presupuestos', 'Dirección'))
        || (id === 'documentos' && tiene('RR. HH.', 'Dirección', 'Prevención / PRL'))
    ));
};
