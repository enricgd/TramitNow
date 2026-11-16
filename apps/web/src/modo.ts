// Modo demo: entra sin login y con datos de ejemplo en memoria (src/data/memoria.ts), sin Supabase ni la API.
// - `npm run dev`: modo demo, para trabajar en las pantallas.
// - `npm run dev:real`: login y apps/api locales.
// - `npm run build`: la compilación para el NAS, siempre con login y API.
// - `npm run build:ejemplo`: compilación en modo demo para ejemplo.<dominio> (ver infra/nas/deploy-web-ejemplo.sh).
export const DEMO = import.meta.env.DEV ? import.meta.env.MODE !== 'real' : import.meta.env.MODE === 'ejemplo';
