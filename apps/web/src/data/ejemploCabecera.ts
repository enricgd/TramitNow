// Datos de ejemplo del buscador global y de los avisos de la cabecera (los que tenía Header.tsx).
// Los usan memoria.ts (modo demo) y, mientras apps/api no tenga estas rutas, también api.ts: por eso
// están aparte y no en memoria.ts, que no entra en la compilación para el NAS. Todo es ficticio.
import type { Repositories } from './repositorios';
import type { AppNotification, SearchResult } from './tipos';

const RESULTADOS: SearchResult[] = [
  { id: 'p1', type: 'request', title: 'PET-2026-0049 · Operario/a de almacén · turno de tarde', detail: 'Trans-Logística Ibérica Norte, S.L. · 0/3 cubiertas', status: 'En selección', route: 'peticiones' },
  { id: 'p2', type: 'request', title: 'PET-2026-0047 · Camarero/a de barra · turno de noche', detail: 'Hostelería & Eventos Premium BCN, S.L. · 0/3 cubiertas', status: 'Nueva', route: 'peticiones' },
  { id: 'p3', type: 'request', title: 'PET-2026-0048 · Operario/a de almacén · turno de mañana', detail: 'Trans-Logística Ibérica Norte, S.L. · 5/5 cubiertas', status: 'Cubierta', route: 'peticiones' },
  { id: 'c1', type: 'candidate', title: 'Mamadou Diallo', detail: 'NIE X0000000T · Operario/a de almacén · PET-2026-0048', status: 'Bloqueado', route: 'laboral' },
  { id: 'c2', type: 'candidate', title: 'Unai García Zabaleta', detail: 'DNI 00000131Q · Carretillero/a · PET-2026-0050', status: 'En incorporación', route: 'laboral' },
  { id: 'c3', type: 'candidate', title: 'Ainhoa Larrazabal Urkijo', detail: 'DNI 00000127N · Operario/a de almacén · PET-2026-0048', status: 'En incorporación', route: 'laboral' },
  { id: 'c4', type: 'candidate', title: 'Iker Agirrebeitia Mendia', detail: 'DNI 00000130S · Operario/a de almacén · PET-2026-0048', status: 'En incorporación', route: 'laboral' },
  { id: 'e1', type: 'client', title: 'Trans-Logística Ibérica Norte, S.L.', detail: 'CIF B00000101 · Basauri (Bizkaia) · 2 peticiones en selección', status: null, route: null },
  { id: 'e2', type: 'client', title: 'Hostelería & Eventos Premium BCN, S.L.', detail: 'CIF B00000104 · Barcelona · 1 petición en curso y 3 por empezar', status: null, route: null },
  { id: 'b1', type: 'quote', title: 'PRE-2026-0042 v1 · Campaña logística otoño HUB central', detail: 'Trans-Logística Ibérica Norte, S.L. · 105.792,00 €', status: 'Aceptado', route: null },
  { id: 'b2', type: 'quote', title: 'PRE-2026-0045 v1 · Operarios/as soldadura y mecanizado metal 24/7', detail: 'Manufacturas Metálicas del Henares, S.A. · 64.512,00 €', status: 'Enviado', route: null },
];

const RECIENTES = ['PET-2026-0048', 'Mendoza', 'Distribuciones Cantábrico'];

const MINUTO = 60_000;
const hace = (minutos: number) => new Date(Date.now() - minutos * MINUTO).toISOString();

const avisosIniciales = (): AppNotification[] => [
  { id: 'a1', kind: 'urgent', title: 'NIE caducado: Mamadou Diallo', text: 'Bloquea el contrato en PET-2026-0048. Pide el documento renovado.', createdAt: hace(10), read: false, route: 'laboral' },
  { id: 'a2', kind: 'pending', title: '3 CPD pendientes de firma de la empresa', text: 'PET-2026-0048 y PET-2026-0050', createdAt: hace(60), read: false, route: 'laboral' },
  { id: 'a3', kind: 'success', title: 'Presupuesto PRE-2026-0042 aceptado', text: 'Trans-Logística Ibérica Norte, S.L. Ya se han creado sus 3 peticiones.', createdAt: hace(180), read: false, route: 'peticiones' },
  { id: 'a4', kind: 'info', title: '12 candidaturas nuevas desde portales', text: 'PET-2026-0049 · Operario/a de almacén · turno de tarde', createdAt: hace(26 * 60), read: true, route: 'peticiones' },
  { id: 'a5', kind: 'info', title: 'Mantenimiento programado', text: 'Domingo de 02:00 a 04:00. La app no estará disponible.', createdAt: hace(2 * 24 * 60), read: true, route: null },
];

// Quita acentos y mayúsculas para comparar ("cantabrico" encuentra "Cantábrico").
const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Con una pequeña espera, como la API.
const espera = <T>(valor: T, ms = 350) => new Promise<T>((resolve) => setTimeout(() => resolve(structuredClone(valor)), ms));

/** `sample`: true cuando se usan en lugar de la API (para avisar en pantalla de que son de ejemplo). */
export function sampleSearch(sample: boolean): Repositories['search'] {
  return {
    sample,
    query(text) {
      const q = normalizar(text.trim());
      return espera(RESULTADOS.filter((r) => normalizar(`${r.title} ${r.detail}`).includes(q)), 150);
    },
    recent: () => espera(RECIENTES, 0),
  };
}

export function sampleNotifications(sample: boolean): Repositories['notifications'] {
  const avisos = avisosIniciales();
  return {
    sample,
    list: () => espera(avisos, 150),
    async markRead(id) {
      const aviso = avisos.find((a) => a.id === id);
      if (aviso) aviso.read = true;
    },
    async markAllRead() {
      avisos.forEach((a) => (a.read = true));
    },
  };
}
