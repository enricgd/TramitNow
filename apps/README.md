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

### Login

`src/Login.tsx` (de `design/login.html`) inicia sesión con Supabase Auth (`@supabase/supabase-js`, solo
para Auth). `src/Root.tsx` muestra el login sin sesión y la app con ella; si el token no trae `tenant_id`
(el usuario no pertenece a ninguna ETT activa) cierra la sesión y lo avisa. `src/auth/session.ts` lee
los claims del hook (`tenant_id`, `app_role`, `branch_ids`). La cabecera muestra el usuario y su rol;
la ETT, la sucursal y las pantallas siguen con datos de ejemplo.

- En local: `sh db/local/reset.sh` levanta Postgres + Auth con un usuario demo (ver `db/README.md`) y
  `npm run dev` reenvía `/auth/v1` a ese Auth.
- En el NAS: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `.env.production.local` (ver `.env.example`).
- "¿Has olvidado tu contraseña?" llama a Supabase Auth; para que llegue el correo hay que configurar
  SMTP en el `.env` del NAS. El enlace abre la pantalla "Nueva contraseña".

Pendiente: capa de datos (repositorios con implementación en memoria y contra `apps/api`), y que la cabecera
muestre la ETT y sucursal reales cuando exista la API.

## api

Pendiente. Node (Hono) con validación de tipos y documentación OpenAPI. Es la única puerta a los datos:

- Verifica el JWT de Supabase Auth y aplica permisos y reglas de negocio.
- Accede a Postgres con un rol de mínimos privilegios; en cada transacción fija `request.jwt.claims`
  y `role authenticated` para que las políticas RLS se apliquen igual que con PostgREST.
- Documentos (URLs firmadas de Storage), integraciones (Contrat@, SILTRA, Sistema RED) y procesos programados.
