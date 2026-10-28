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
- `src/views/*.jsx`: pantallas. Nacieron copiando `design/` con `scripts/import-design.py`, pero ahora
  **se editan directamente** (el diseñador trabaja aquí, ver `design/AGENTE-DISENO.md`): no se regeneran.

Para añadir una pantalla nueva a partir de su maqueta (solo si la vista aún no existe):

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

- En local, `npm run dev` es el **modo demo**: entra sin login con un usuario ficticio y no necesita Supabase.
- Para probar el login en local: `sh db/local/reset.sh` levanta Postgres + Auth con un usuario demo (ver
  `db/README.md`) y `npm run dev:real` reenvía `/auth/v1` a ese Auth y `/v1` a la API local.
- En el NAS: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_API_URL` en `.env.production.local` (ver `.env.example`).
- "¿Has olvidado tu contraseña?" llama a Supabase Auth; para que llegue el correo hay que configurar
  SMTP en el `.env` del NAS. El enlace abre la pantalla "Nueva contraseña".

### Datos

Las pantallas leen y guardan a través de `src/data/` (repositorios), nunca con `fetch` ni con `supabase.from(...)`:

```tsx
import { repos, useData } from '../data';

const { data, loading, error, reload } = useData((r) => r.branches.list(), []);
await repos.branches.update(id, { phone });
reload();
```

- `repositorios.ts`: el contrato (una operación por ruta de `apps/api`). `tipos.ts`: los datos tal como los
  devuelve la API y `ApiError` (`code` estable, `message` en español para mostrar, `details` por campo).
- `memoria.ts`: datos de ejemplo en memoria para el **modo demo** (`npm run dev`, el del diseñador): sin login,
  sin API y sin base de datos. Se comporta como la API (filtros, paginación, errores) y no entra en la
  compilación para el NAS. Si una pantalla necesita datos de ejemplo nuevos, van aquí, no dentro de la vista.
- `api.ts`: contra `apps/api` con el token de la sesión. Con `npm run dev:real`, Vite reenvía `/v1` a la API
  local (en otra terminal, `cd apps/api && npm run dev`; sus valores locales en `apps/api/.env.example`).
  En el NAS, `VITE_API_URL` en `.env.production.local`.
- Cuando la API gane una ruta, se añade al contrato y a las dos implementaciones.

Pendiente: conectar la cabecera (ETT y sucursal de `/v1/me`) y "Mi ETT" (sociedad, sucursales, usuarios y roles)
a los repositorios; las pantallas aún usan los datos de ejemplo que llevan dentro.

## api

API propia, la **única puerta a los datos**: Node 22 + TypeScript + [Hono](https://hono.dev), rutas con
`@hono/zod-openapi` (validación con zod y especificación OpenAPI generada desde el código) y `postgres`
(postgres.js) sin ORM.

```bash
cd apps/api
cp .env.example .env
npm run dev
```

Escucha en http://localhost:3000 (la especificación, en http://localhost:3000/openapi.json). Necesita la base
local en marcha (`sh db/local/reset.sh`). Si `npm install` falla en el Mac con `Cannot read properties of null
(reading 'edgesOut')`, es un fallo del npm 10: usa `npx npm@11 install` (para `npm ci` vale cualquiera).

```
src/
  index.ts        arranque del servidor
  app.ts          middlewares comunes, autenticación en /v1 y /openapi.json
  config.ts       variables de entorno
  lib/auth.ts     verificación del JWT de Supabase Auth
  lib/db.ts       pool de Postgres y withClaims (transacción con rol y claims)
  lib/context.ts  withUser / withTenant: ETT activa, rol y permisos de la petición
  lib/errors.ts   formato de error
  lib/openapi.ts  piezas comunes de las rutas (errores, paginación, parámetros)
  routes/         una por recurso
test/             vitest contra db/local
```

### Cómo accede a los datos

Ver también `db/README.md` ("Cómo se accede a los datos").

1. `requireAuth` verifica el `Authorization: Bearer` con `jose`: HS256 con el `JWT_SECRET` de Supabase
   (`SUPABASE_JWT_SECRET`), audiencia `authenticated`, `exp` y `sub` obligatorios, `role` = `authenticated`
   (no acepta tokens de `anon` ni de `service_role`). Cualquier fallo → 401.
2. Cada petición abre **una transacción** (`withClaims`) como `tramitnow_api` y hace
   `set local role authenticated` y `set_config('request.jwt.claims', <claims verificados>, true)`.
   Todo se deshace al acabar (commit o rollback): ninguna conexión vuelve al pool con rol o claims
   (hay un test que lo comprueba). Si el handler lanza un error, la transacción se deshace entera.
3. `withTenant` resuelve en esa misma transacción la ETT activa (la del token, comprobada contra
   `memberships` con `private.current_tenant_id()`), el rol y los permisos de `role_permissions`.
4. Las consultas filtran **siempre** por `tenant_id = ctx.tenantId` (el superadmin ve todas las ETT por RLS:
   el filtro es lo que le limita a la activa) y las RLS vuelven a comprobarlo todo.

`DATABASE_URL` tiene que conectar como `tramitnow_api`: la API no arranca con otro usuario.

### Convenciones de la API

Todos los módulos siguen estas reglas.

**Rutas**

- Prefijo `/v1`; fuera de él solo `/health` y `/openapi.json`. Todo `/v1` exige token.
- Recursos en inglés, en plural y kebab-case, igual que las tablas: `/v1/companies`, `/v1/branches/{id}`,
  `/v1/me/active-tenant`. Filtros como query (`/v1/branches?companyId=...`) mejor que rutas anidadas.
- `GET /recurso` lista, `GET /recurso/{id}` ve, `POST /recurso` crea (201), `PATCH /recurso/{id}` cambia solo
  los campos enviados (`null` borra un valor). Borrar será `DELETE` con borrado lógico (`deleted_at`).
- JSON en camelCase (`companyId`, `createdAt`); fechas en ISO 8601 UTC. La base de datos sigue en snake_case:
  postgres.js convierte los nombres de columna.
- Identificadores con `z.guid()`, no `z.uuid()`: el de zod 4 exige versión RFC y rechaza uuid válidos para Postgres.
- `tenant_id` nunca viaja en el cuerpo ni en la URL: sale siempre del token. Los cuerpos son estrictos
  (un campo desconocido es un 400).
- Cada ruta se define con `createRoute` (tags, resumen, esquemas de entrada y salida, errores posibles y
  `security: bearerSecurity`), así la especificación OpenAPI queda completa sin escribirla aparte.

**Errores**: siempre el mismo formato, con el mensaje en español (se puede mostrar al usuario) y un código estable:

```json
{ "error": { "code": "validacion", "message": "Los datos enviados no son válidos",
             "details": [{ "path": "name", "message": "Obligatorio" }] } }
```

| HTTP | `code` | Cuándo |
|---|---|---|
| 400 | `validacion` | Cuerpo, parámetros o query no válidos (`details` por campo) |
| 401 | `no_autenticado` | Sin token, token manipulado, caducado o que no es de un usuario |
| 403 | `sin_permiso` | Falta el permiso fino (el mensaje lo nombra) |
| 403 | `sin_ett_activa` | El token no trae ETT o el usuario ya no tiene acceso a ella |
| 403 | `usuario_bloqueado` | Perfil bloqueado o inactivo |
| 404 | `no_encontrado` | No existe **o es de otra ETT** (nunca se distingue) |
| 409 | `conflicto` | Duplicado (p. ej. código de sociedad repetido) |
| 422 | `referencia_invalida` | Apunta a un registro que no existe en la ETT activa |
| 500 | `error_interno` | Cualquier otra cosa (el detalle va solo al log) |

Desde el código: `throw new ApiError(status, code, mensaje)`, `notFound()`, `forbidden()`. Los errores de
Postgres se traducen solos (`23505` → 409, `23503` → 422, `42501` → 403...).

**Paginación**: las listas que pueden crecer aceptan `?limit=` (1–200, por defecto 50) y `?offset=` y devuelven

```json
{ "data": [ ... ], "pagination": { "limit": 50, "offset": 0, "total": 123 } }
```

Las listas cortas y cerradas (roles, permisos) devuelven solo `{ "data": [...] }`.

**Permisos**: la API comprueba el permiso fino antes de actuar, leyendo `role_permissions` en cada petición
(no van en el JWT: quitar un permiso surte efecto al momento). Las RLS lo vuelven a comprobar al escribir.

```ts
const data = await withTenant(c, { permission: 'companies.manage' }, async (tx, ctx) => {
  // ctx.tenantId, ctx.role, ctx.permissions; tx es la transacción con RLS
});
```

- Leer los datos de la ETT: cualquier miembro (igual que las RLS), salvo que la ruta diga otra cosa.
- Escribir: el permiso de la tabla (`companies.manage`, `branches.manage`...; ver la tabla en `db/README.md`).
- Usuarios y membresías: `users.manage` también para leer.
- El superadmin (tabla `platform_admins`) tiene todos los permisos en la ETT activa.
- Un permiso nuevo se añade en una migración (ver "Reglas para tablas nuevas" en `db/README.md`).

### Rutas

| Ruta | Permiso |
|---|---|
| `GET /health` | público |
| `GET /openapi.json` | público |
| `GET /v1/me`: perfil, ETT activa, rol, permisos, sucursales y ETT a las que puede cambiar | token |
| `POST /v1/me/active-tenant` `{ tenantId }`: guarda la ETT en el perfil; después el cliente llama a `supabase.auth.refreshSession()` | token, ser miembro |
| `GET /v1/companies`, `GET /v1/companies/{id}` | miembro |
| `POST /v1/companies`, `PATCH /v1/companies/{id}` | `companies.manage` |
| `GET /v1/branches`, `GET /v1/branches/{id}` | miembro |
| `POST /v1/branches`, `PATCH /v1/branches/{id}` (al marcar una por defecto, la anterior deja de serlo) | `branches.manage` |
| `GET /v1/roles`, `GET /v1/roles/{id}`, `GET /v1/permissions` | miembro |
| `GET /v1/memberships`, `GET /v1/memberships/{id}` | `users.manage` |
| `GET /v1/catalogs/autonomous-communities`, `/provinces?autonomousCommunityCode=`, `/municipalities?provinceCode=&q=` (exige uno de los dos), `/municipalities/{code}`, `/countries?q=`, `/contract-keys?includeInactive=`: catálogos oficiales, de solo lectura | token (aunque no tenga ETT) |
| `GET`, `POST /v1/addresses`; `GET`, `PATCH`, `DELETE /v1/addresses/{id}`: con los códigos oficiales de municipio, provincia y país | miembro; escribir, `addresses.write` |
| `/v1/collective-agreements`, `/v1/professional-categories`, `/v1/contract-types`, `/v1/payroll-concepts`: listar (filtros, `?q=`, `?status=`), ver, crear, editar y dar de baja (`DELETE`, baja lógica) | miembro; escribir, `labor_catalogs.manage` |
| `/v1/clients` (`?q=` busca en código, razón social, nombre comercial y NIF; `?status=`, `?companyId=`, `?branchId=`, `?blocked=`), `/v1/client-centers?clientId=`, `/v1/client-contacts?clientId=`: listar, ver, crear, editar y dar de baja | miembro; escribir, `clients.manage` en la sucursal del cliente o del centro |
| `GET`, `PUT /v1/clients/{id}/billing`: facturación del cliente (`PUT` crea o actualiza; devuelve `warnings` si el plazo de pago supera el legal) | `clients.billing.manage` |

Los catálogos de la ETT y las direcciones usan la plantilla `src/lib/crud.ts` (rutas CRUD de una tabla por ETT
sin más reglas que las suyas); lo que tenga lógica propia, como la sucursal por defecto, se escribe aparte.

Pendiente: alta e invitación de usuarios (necesita la `service_role`), edición de roles y membresías, y borrado
de sociedades y sucursales.

### Tests

```bash
sh db/local/reset.sh
```

```bash
cd apps/api && npm test
```

Van contra la base local (Postgres + Auth de `db/local/`, nunca el NAS) con los datos ficticios de
`db/tests/_fixtures.sql` (ETT A y B), que se confirman al empezar y se borran al terminar; la ETT DEMO no se toca.
Los tokens se firman con el `JWT_SECRET` local y los claims que daría el hook. Comprueban que con un token
de la ETT A la API nunca devuelve ni modifica nada de la B, que sin token o con un token manipulado responde 401,
que los permisos por rol se respetan, que ninguna conexión del pool se queda con rol o claims y que un
`access_token` real del Auth local funciona.

### Probar con Apidog

1. **Importar la API**: Apidog → Importar → OpenAPI/Swagger → desde URL: `http://localhost:3000/openapi.json`
   (o `https://api.henrik11.duckdns.org/openapi.json`). Se puede programar la importación para que se actualice
   al cambiar las rutas. Sin servidor en marcha: `npm run openapi` escribe `apps/api/openapi.json`.
2. **Entorno**: crea uno ("Local" o "NAS") con las variables `baseUrl` (`http://localhost:3000` o
   `https://api.henrik11.duckdns.org`), `authUrl` (`http://localhost:9999` en local, que es Auth sin el prefijo
   `/auth/v1`; `https://api.henrik11.duckdns.org/auth/v1` en el NAS), `anonKey` (en el NAS, la `ANON_KEY` del
   `.env`; en local no hace falta), `email`, `password` y `accessToken` (vacía).
3. **Obtener el token**: una petición `POST {{authUrl}}/token?grant_type=password` con cabeceras
   `apikey: {{anonKey}}` y `Content-Type: application/json`, y cuerpo:

   ```json
   { "email": "{{email}}", "password": "{{password}}" }
   ```

   En "Post Processors" → "Extract Variable": nombre `accessToken`, ámbito entorno, JSONPath `$.access_token`.
   En local sirve el usuario de `db/local/dev.env`.
4. **Usarlo**: en el proyecto (o en la carpeta importada), Auth → Bearer Token → `{{accessToken}}`. El token
   caduca en una hora: vuelve a lanzar la petición del paso 3. Para cambiar de ETT: `POST /v1/me/active-tenant`
   y otra vez el paso 3 (equivale al `refreshSession()` de la web).
