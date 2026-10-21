# TramitNOW

ERP 100% web para Empresas de Trabajo Temporal (ETT). Sustituye al software de escritorio
actual (servidor Windows + cliente remoto) por una aplicación online multi-ETT.

## Estructura

```
design/        Entregas de diseño (HTML autocontenidos). Fuente visual, no se edita desde desarrollo.
docs/          Especificación funcional: inventario de pantallas, modelo de datos, flujo.
  originales/  .docx originales (la versión canónica es el .md equivalente).
  legacy-fotos/  Fotos del software antiguo (ignorado en git: puede contener datos personales).
db/            Esquema PostgreSQL.
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
- Backend: Supabase (Postgres + Auth + Storage) y una API Node para la lógica de negocio.
- Multi-ETT: `tenant_id` en todas las tablas + Row Level Security.
- Despliegue: contenedores Docker (desarrollo/demo en NAS; producción en proveedor gestionado en la UE).

## Ramas

- `main`: estable.
- `development`: integración. Un PR por pantalla o flujo.
