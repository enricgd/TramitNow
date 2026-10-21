# Apps

## web

SPA con Vite + React + TypeScript + Tailwind 4.

```bash
cd apps/web
npm install
npm run dev
```

Se abre en http://localhost:5173. Para publicarla en el NAS, ver `infra/nas/README.md` ("Desplegar la web").

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

Pendiente: capa de datos (repositorios con implementación en memoria y Supabase), login.

## api

Pendiente. Node (Hono) para la lógica de negocio: documentos, integraciones (Contrat@, SILTRA,
Sistema RED), procesos programados.
