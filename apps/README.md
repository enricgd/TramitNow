# Apps

## web

SPA con Vite + React + TypeScript + Tailwind 4.

```bash
cd apps/web
npm run dev
```

Se abre en http://localhost:5173. `npm run dev` instala antes las dependencias si faltan o si `package-lock.json`
ha cambiado (`scripts/ensure-deps.mjs`), así que funciona igual en un clon recién hecho o tras cambiar de rama. Para publicarla en el NAS, ver `infra/nas/README.md` ("Desplegar la web").

- `src/App.tsx`: estructura común (cabecera y barra lateral sacadas de `design/laboral.html`) y navegación por `#/ruta`.
- `src/Inicio.tsx`: portada de la demo.
- `src/views/*.jsx`: pantallas de `design/` **tal cual**, generadas con `scripts/import-design.py`.
  No se editan a mano: si el diseño cambia, se regeneran. Se irán sustituyendo por componentes reales.

Para añadir otra pantalla de diseño:

```bash
python3 scripts/import-design.py candidatos CandidatosView
```

Después se añade la entrada `view: CandidatosView` en `NAV` (`src/App.tsx`).
`--strip-header` quita también la cabecera del diseño cuando duplica la común.

Pendiente: capa de datos (repositorios con implementación en memoria y contra `apps/api`), login con Supabase Auth.

## api

Pendiente. Node (Hono) con validación de tipos y documentación OpenAPI. Es la única puerta a los datos:

- Verifica el JWT de Supabase Auth y aplica permisos y reglas de negocio.
- Accede a Postgres con un rol de mínimos privilegios; en cada transacción fija `request.jwt.claims`
  y `role authenticated` para que las políticas RLS se apliquen igual que con PostgREST.
- Documentos (URLs firmadas de Storage), integraciones (Contrat@, SILTRA, Sistema RED) y procesos programados.
