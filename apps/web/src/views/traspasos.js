// Paso de datos entre pantallas en la demo (cada pantalla tiene sus propios datos de ejemplo).
// En real no hace falta: la pantalla de destino leerá de la API lo que necesite a partir del id.
// «Crear presupuesto» en la ficha de una empresa abre Presupuestos con esa empresa ya puesta.
export const CLAVE_PRESUPUESTO_EMPRESA = 'tramitnow-presupuesto-para-empresa';

export const dejarTraspaso = (clave, datos) => {
    try { sessionStorage.setItem(clave, JSON.stringify(datos)); } catch { /* sin almacenamiento */ }
};
export const recogerTraspaso = (clave) => {
    try {
        const t = sessionStorage.getItem(clave);
        sessionStorage.removeItem(clave);
        return t ? JSON.parse(t) : null;
    } catch { return null; }
};
