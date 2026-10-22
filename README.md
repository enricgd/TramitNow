# TramitNOW

ERP 100% web para Empresas de Trabajo Temporal (ETT). Sustituye al software de escritorio
actual (servidor Windows + cliente remoto) por una aplicación online multi-ETT.

## Estructura

```
design/        Entregas de diseño (HTML autocontenidos). Fuente visual, no se edita desde desarrollo.
docs/          Especificación funcional: inventario de pantallas, modelo de datos, flujo.
  originales/  .docx originales (la versión canónica es el .md equivalente).
  legacy-fotos/  Fotos del software antiguo (ignorado en git: puede contener datos personales).
db/            Esquema PostgreSQL. Ver db/README.md.
  migrations/  Migraciones versionadas (núcleo multi-ETT, identidad, RLS, hook de JWT).
  tests/       Tests pgTAP de aislamiento entre ETT.
  reference/   Modelo SQL heredado del proyecto Firebase; punto de partida para las migraciones.
apps/          Código de la aplicación (web Vite + API). Ver apps/README.md.
infra/nas/     Stack Docker de demo en el NAS (Supabase + Caddy + backups). Ver su README.
archive/       Proyectos anteriores, solo como referencia.
```

## Flujo de trabajo

1. **Diseño** añade o actualiza pantallas en `design/`.
2. **Demo**: se traduce el diseño a `apps/web`, con componentes compartidos y una capa de datos
   intercambiable (datos de ejemplo en memoria, activables con un interruptor).
3. **Validación** del flujo con la demo.
4. **Producto**: se conecta la misma app a la API y a la base de datos reales. No se reescribe.

## Stack previsto

- Web: Vite + React + TypeScript + Tailwind (SPA).
- Backend: API propia en `apps/api` (Node + Hono) como única puerta a los datos, sobre Supabase
  (Postgres, Auth para login y tokens, Storage para documentos).
- Multi-ETT: `tenant_id` en todas las tablas + Row Level Security como red de seguridad.

### Acceso a datos

```
Web ──login──▶ Supabase Auth (JWT con ETT, rol y sucursales)
Web ──JWT────▶ apps/api ──▶ Postgres (RLS)
Web ─────────▶ Supabase Storage (subidas/descargas con URLs firmadas por la API)
```

- La web **no** lee ni escribe tablas directamente: PostgREST no se expone a internet.
  El contrato entre web y backend son las rutas y tipos de la API, no el esquema de la base de datos.
- La API verifica el JWT, aplica las reglas de negocio y en cada transacción pasa los claims a Postgres
  (`set_config('request.jwt.claims', …)`), así que las políticas RLS con `auth.jwt()` siguen protegiendo
  aunque la API tuviera un fallo.
- Las integraciones (Contrat@, SILTRA, Sistema RED), documentos y procesos programados viven en la API.
- Despliegue: contenedores Docker (desarrollo/demo en NAS; producción en proveedor gestionado en la UE).

## Ramas

- `main`: estable.
- `development`: integración. Un PR por pantalla o flujo.
