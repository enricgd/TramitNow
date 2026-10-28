// Modo demo: `npm run dev` entra sin login y con datos de ejemplo en memoria (src/data/memoria.ts), para
// trabajar en las pantallas sin levantar Supabase ni la API. `npm run dev:real` usa el login y apps/api
// locales. La compilación para el NAS siempre usa el login y la API.
export const DEMO = import.meta.env.DEV && import.meta.env.MODE !== 'real';
