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
los claims del hook (`tenant_id`, `app_role`, `branch_ids`). Con sesión, `src/sesion.tsx` (`SesionProvider`,
`useSesion()`) carga `/v1/me` una vez para toda la app: la cabecera muestra la ETT activa, el usuario, su rol
y, si ve varias sucursales, el selector de sucursal (se recuerda en el navegador; las listas aún no filtran por
ella). Con varias ETT, el nombre de la ETT es un selector que llama a `changeTenant` y recarga.

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
  Las pantallas grandes tienen su fichero (`memoriaEmpresas.ts`, `memoriaMiEtt.ts`) y las ayudas comunes están en `memoriaBase.ts`.
  **Nada en el nivel superior de estos ficheros puede tener efectos** (`push`, contadores, llamadas que cambien
  estado, `Date.now()`): `vite.config.ts` los marca sin efectos para que la compilación del NAS los descarte.
- `api.ts`: contra `apps/api` con el token de la sesión. Con `npm run dev:real`, Vite reenvía `/v1` a la API
  local (en otra terminal, `cd apps/api && npm run dev`; sus valores locales en `apps/api/.env.example`).
  En el NAS, `VITE_API_URL` en `.env.production.local`.
- Cuando la API gane una ruta, se añade al contrato y a las dos implementaciones.

Conectadas: la cabecera (`src/cabecera/useCabecera.ts`), Mi ETT (`src/views/mi-ett/useMiEtt.ts`) y Empresas
(`src/views/empresas/useEmpresas.ts`, la primera de punta a punta: **es la referencia para las siguientes**). El
resto de pantallas aún usan los datos de ejemplo que llevan dentro.

#### Conectar una pantalla

El diseñador sigue editando las vistas (`src/views/*View.jsx`, `Header.tsx`) en la rama `design`. Para que
sus cambios y los nuestros no choquen, **la vista solo pinta** y todo lo de datos va aparte:

1. **Un hook por pantalla** en su carpeta: `src/views/<pantalla>/use<Pantalla>.ts` (por ejemplo
   `src/views/mi-ett/useMiEtt.ts`). Carga con `useData` y guarda con `repos`; traduce de la forma de la API
   (`tipos.ts`, en inglés) a la que ya usa la vista (sus nombres de campo, sus textos) y al revés. La vista
   recibe datos y funciones (`guardarSucursal(id, valores)`, `desactivarSucursal(id)`...), nunca `repos`.
2. **En la vista, lo mínimo**: cambiar los `useState(INITIAL_...)` por el hook, los `setX(...)` de guardar
   por la función del hook y añadir los estados. No reescribir el JSX ni cambiar nombres de campo: si la
   vista usa `company.cif`, el hook da `cif`. Las funciones del hook lanzan `ApiError`; la vista lo muestra con
   `mensajeError(e)` (en Mi ETT, con su `guardar(accion, mensajeOk)`, que avisa y devuelve si ha ido bien).
3. **Los datos de ejemplo de la vista pasan a `memoria.ts`**, en los repositorios que ya existen (sociedades,
   sucursales, usuarios...) o, si la API aún no los tiene, en un repositorio «pendiente de API» (abajo).
4. **Estados**, con los componentes de `src/ui/Estados.tsx`: `CargandoPagina` la primera vez (al recargar
   tras guardar se siguen viendo los datos), `ErrorCarga` con «Reintentar», el vacío de la pantalla (por
   ejemplo, ETT sin sociedades) y `Proximamente` para lo que aún no tiene API.
5. **Probar en los dos modos**: `npm run dev` (en la pestaña de red del navegador no debe haber peticiones a
   `/v1` ni a `/auth`) y `npm run dev:real` con `apps/api` y la base local.

Lo que añadió Empresas, para copiarlo en las siguientes:

- **Lista grande**: búsqueda, sucursal de la cabecera (`useSesion().sucursal` → `?branchId=`) y página
  (`limit`, `offset`) van al servidor; la búsqueda espera a que se deje de escribir. Los filtros que la API aún
  no tiene se aplican a la página cargada y la vista lo dice («N de M en esta página»).
- **Eliminar es una baja lógica**: la confirmación (`Confirmar` con `recuperable`) dice dónde se recupera; un
  filtro o botón «Eliminados» lista lo eliminado con «Recuperar» (`src/views/empresas/Eliminados.tsx`). Si ya
  se ha usado, la API responde 409 `en_uso`: la vista enseña el motivo y ofrece la alternativa (suspender,
  desactivar, dar de baja). Los documentos de conservación obligatoria no se ofrecen para eliminar.
- **Tablas maestras en los desplegables**: `SelectConAlta` con los nombres de `catalogItems`; «+ Añadir» crea
  la opción en la API (`catalogos.anadirOpcion`) y el hook traduce nombre ↔ id al guardar.
- **Campos nuevos antes que la API**: si la web va por delante de la API local, la API rechaza el cuerpo entero
  («Llaves desconocidas») y `mensajeError` lo muestra como «Disponible próximamente: la API aún no admite …».
  Para probar en `dev:real`, mejor fusionar en local la rama del backend que trae esos campos.
- **Resumen en la lista**: `GET /v1/clients` trae (o traerá) `readiness` por cliente; con él, la preparación no
  pide nada más por fila. Sin él (API antigua), el hook pide contactos, centros y facturación de cada fila.
- **Ayudas comunes** de los hooks (errores, fechas, direcciones de texto libre ↔ códigos oficiales) en
  `src/views/comun/datos.ts`.

#### Documentos en local

Para subir y ver documentos con `npm run dev:real`, el navegador tiene que llegar a Storage, que en local
(`127.0.0.1:54325`) no responde a CORS. Vite reenvía `/storage/v1` a Storage: pon en `apps/api/.env`
`STORAGE_PUBLIC_URL=http://localhost:5173/storage/v1` y la API firmará las URL por ahí. La subida la hace el
repositorio (`documents.upload`: URL firmada, `PUT` del fichero y registro), nunca la vista.

#### Pendiente de API

Lo que una pantalla ya enseña y `apps/api` aún no tiene se añade igualmente al contrato (`repositorios.ts`,
con sus tipos al final de `tipos.ts`, en una forma provisional), con su implementación en memoria. Contra la
API hay dos opciones, según lo que tenga sentido en real:

- **Mostrarlo como «Disponible próximamente»**: `api.ts` rechaza con `ApiError` `no_disponible` (501) y la
  pantalla pinta `Proximamente` en su lugar. Es lo que hace Mi ETT con `ettSettings` (plantillas, portales,
  historial de Mi ETT y responsable de cada sucursal). Es lo normal cuando son datos de la propia ETT: unos de ejemplo
  mezclados con los reales llevarían a error.
- **Seguir con los datos de ejemplo, avisando**: los datos de ejemplo van en un fichero aparte que importan
  las dos implementaciones (no en `memoria.ts`, que no entra en la compilación del NAS) y el repositorio
  lleva `sample: true` para que la pantalla avise. Es lo que hacen el buscador (`search`) y los avisos
  (`notifications`) de la cabecera, con `src/data/ejemploCabecera.ts`.

Cuando llega la ruta, se cambia la implementación de `api.ts` (y la forma en `tipos.ts`, si hace falta): la
pantalla no se toca.

Lo que en Empresas sigue sin API, de momento: el acceso de los contactos al Área de empresas (`portalAccess`,
«Disponible próximamente»). El régimen de IVA de la facturación es un solo desplegable: sin causa especial
(`vatSpecialCauseId` null) es «Régimen general (21 %)», las causas especiales salen de su tabla maestra y
«Recargo de equivalencia» es `equivalenceSurcharge`. La lista pide el contacto principal de cada fila (columna
«Contacto principal»).

Mi ETT, con API: datos legales (`companyLegal`) y facturación (`companyBilling`) de cada sociedad, series de
facturas y rectificativas del año (`numberSeries`; si no existen, se crean al guardar), CCC
(`contributionAccounts`), servicios que factura la ETT (`billableServices`; el código se genera del nombre),
ajustes de presupuestos (`tenantSettings`, en la pestaña Facturación) y usuarios con alta, invitación, nuevo
enlace, revocación, rol, departamento, estado y sucursal (`memberships`). La forma de pago «Otra…» se añade a la
tabla maestra `payment_method`. Lo que sigue sin API: plantillas, portales, historial de Mi ETT, responsable de
cada sucursal, logotipo, matriz de permisos (fija en la vista) y exportación a PDF. Las sucursales dadas de baja
no se ven (la lista solo muestra las activas).

#### Invitación de usuarios

Aún no hay correo saliente: al dar de alta un usuario, la API devuelve `inviteUrl` y Mi ETT lo enseña con un
mensaje listo para copiar y enviarlo a mano. El enlace lleva a `/verify?token=...&type=invite` de la web, que
abre la página de bienvenida (`Login` en modo `invite`, desde `Root.tsx`): la persona elige su contraseña, la
web comprueba el enlace con Supabase Auth (`verifyOtp` con el `token_hash`), guarda la contraseña
(`updateUser`) y entra. El enlace vale una vez. En local, la API necesita `AUTH_URL`, `INVITE_REDIRECT_URL` y
`AUTH_SENDS_INVITES=false` en `apps/api/.env` (ver `.env.example`). En el modo demo el enlace abre la misma
página y entra sin red.

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
  lib/storage.ts  Supabase Storage (documentos) con la service_role
  lib/auth-admin.ts  Supabase Auth con la service_role (invitar usuarios)
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
| 409 | `conflicto` | Duplicado (p. ej. código de sociedad repetido; al restaurar, choca con algo activo) |
| 409 | `en_uso` | No se puede eliminar porque ya se usa: desactivarlo o suspenderlo |
| 409 | `conservacion_obligatoria` | Documento de un tipo que exige conservarlo: no se elimina |
| 422 | `referencia_invalida` | Apunta a un registro que no existe en la ETT activa |
| 500 | `error_interno` | Cualquier otra cosa (el detalle va solo al log) |
| 503 | `servicio_no_disponible` | Supabase Storage no responde o la API no lo tiene configurado (documentos) |

Desde el código: `throw new ApiError(status, code, mensaje)`, `notFound()`, `forbidden()`. Los errores de
Postgres se traducen solos (`23505` → 409, `23503` → 422, `42501` → 403...). Las reglas de negocio de los triggers
con `errcode` `TN409`, `TN422`, `TNUSE` (`en_uso`) o `TNRET` (`conservacion_obligatoria`) llegan con su mensaje (en
español) y ese estado.

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
| `GET /v1/memberships`, `GET /v1/memberships/{id}` (con `email`, `lastSignInAt`, `department`, `invitationPending`) | `users.manage` |
| `POST /v1/memberships` `{ email, fullName, roleId, department?, contexts }`: da de alta e invita (crea la cuenta en Auth si no la tenía; devuelve `inviteUrl` para enviarlo a mano mientras no haya SMTP); `PATCH /v1/memberships/{id}` (rol, estado, departamento, alcance; nadie cambia su propio rol ni se bloquea); `POST /v1/memberships/{id}/resend-invitation`; `DELETE /v1/memberships/{id}/invitation` (revoca; 409 si ya entró) | `users.manage` (503 sin `AUTH_URL`) |
| `GET`, `PUT /v1/companies/{id}/legal`: datos legales de la sociedad (autorización de ETT, registro, representante, garantía, metadatos del certificado; `warnings` si vencen); `GET`, `PUT /v1/companies/{id}/billing-settings`: facturación emisora | miembro; escribir, `tenant.manage` |
| `GET`, `PATCH /v1/tenant-settings`: margen mínimo de presupuesto y días sin respuesta | miembro; escribir, `tenant.manage` |
| `GET /v1/number-series?documentKind=&year=&companyId=`, `POST /v1/number-series`, `PATCH /v1/number-series/{id}`: series (prefijo, cifras y `nextNumber`, nunca hacia atrás) | miembro; escribir, `tenant.manage` |
| `/v1/contribution-accounts` (`?companyId=&branchId=&staffType=`), `/v1/billable-services`: CCC y servicios que factura la ETT (CRUD con baja lógica) | miembro; escribir, `tenant.manage` |
| `GET /v1/agreements?q=&scope=&provinceCode=&autonomousCommunityCode=&cnae=`, `GET /v1/agreements/{id}`, `GET /v1/agreement-versions?status=&agreementId=`, `GET /v1/agreement-versions/{id}`: catálogo global de convenios (las ETT ven lo publicado; el equipo de contenidos, todo) | token (aunque no tenga ETT) |
| `POST /v1/agreement-versions/{id}/review` · `/reject` · `/submit` · `/publish` · `/withdraw`: flujo de revisión a cuatro ojos | equipo de contenidos |
| `GET /v1/catalogs/autonomous-communities`, `/provinces?autonomousCommunityCode=`, `/municipalities?provinceCode=&q=` (exige uno de los dos), `/municipalities/{code}`, `/countries?q=`, `/contract-keys?includeInactive=`: catálogos oficiales, de solo lectura | token (aunque no tenga ETT) |
| `GET`, `POST /v1/addresses`; `GET`, `PATCH`, `DELETE /v1/addresses/{id}`: con los códigos oficiales de municipio, provincia y país | miembro; escribir, `addresses.write` |
| `/v1/collective-agreements` (con `globalAgreementId`, el convenio del catálogo), `/v1/professional-categories`, `/v1/contract-types`, `/v1/payroll-concepts`: listar (filtros, `?q=`, `?status=`), ver, crear, editar y dar de baja (`DELETE`, baja lógica) | miembro; escribir, `labor_catalogs.manage` |
| `/v1/clients` (`?q=` busca en código, razón social, nombre comercial y NIF; `?status=`, `?companyId=`, `?branchId=`, `?blocked=`, `?sectorCode=`), `/v1/client-centers?clientId=&branchId=`, `/v1/client-contacts?clientId=&centerId=&suspended=`: listar, ver (cada cliente trae `readiness: { centers, contacts, hasBilling }`, de solo lectura), crear, editar y eliminar (baja lógica recuperable: `?deleted=true` lista solo lo eliminado y `POST /{id}/restore` lo restaura; 409 `en_uso` si ya se ha usado) | miembro; escribir, `clients.manage` en la sucursal del cliente o del centro |
| `GET`, `PUT /v1/clients/{id}/billing`: facturación del cliente (`PUT` crea o actualiza; devuelve `warnings` si el plazo de pago supera el legal) | `clients.billing.manage` |
| `GET /v1/cnae?q=&level=section\|division&parentCode=`: actividades CNAE-2009 (sector de los clientes), catálogo oficial | token |
| `GET /v1/catalog-types`: tipos de tabla maestra (lista cerrada) | token |
| `/v1/catalog-items?type=` (obligatorio; `?q=`, `?status=`, `?parentId=`): tablas maestras de la ETT. Listar, ver, crear (`type` y `name`; `code` opcional), editar (el tipo no cambia) y dar de baja. Nombre único por tipo sin distinguir mayúsculas (409) | miembro; escribir, `catalogs.manage` |
| `GET /v1/activity?entityType=&entityId=&includeChildren=`: historial de una ficha, lo último primero, paginado | quien ve la ficha (la facturación, con `clients.billing.manage`) |
| `POST /v1/documents/uploads`, `POST /v1/documents`, `GET /v1/documents` (`?entityType=&entityId=&typeId=&status=&visibleInPortal=&expiresBefore=&q=&deleted=`), `GET`, `PATCH`, `DELETE /v1/documents/{id}`, `POST /v1/documents/{id}/restore`, `GET /v1/documents/{id}/download`: documentos de clientes y centros (ver "Documentos") | leer, quien ve la ficha; escribir, quien puede editarla (`clients.manage` en su sucursal) |

Los catálogos de la ETT y las direcciones usan la plantilla `src/lib/crud.ts` (rutas CRUD de una tabla por ETT
sin más reglas que las suyas); lo que tenga lógica propia, como la sucursal por defecto, se escribe aparte.
Opciones de `crud.ts` además de las básicas: `branchColumn` (la lista acepta `?branchId=` con una o varias sucursales
separadas por comas; hoy en clientes y centros), `createOnly` (campos que no se editan), `columnAliases` (campo de la
API con otro nombre de columna) y `restorable` (eliminar recuperable: `?deleted=true`, `POST /{id}/restore` y 409
`en_uso`; el esquema y las columnas tienen que incluir `deletedAt`; hoy en clientes, centros y contactos).

**Filtro por sucursal.** `GET /v1/me` → `branches` son las sucursales con las que puede trabajar el usuario (todas si su
rol abarca la ETT). La web enseña el filtro «Todas las sucursales» si hay más de una y lo pasa como
`?branchId=id1,id2`. Ver otras sucursales no está prohibido en todas las listas (los clientes los ven todos): el
filtro es para trabajar, las RLS siguen mandando.

### Documentos

Los ficheros están en Supabase Storage (bucket privado `documents`, ver `db/README.md`). La API firma las URL con la
`service_role` y la web sube y descarga directamente contra Storage:

1. `POST /v1/documents/uploads` `{ entityType, entityId, fileName, mimeType, sizeBytes }` → `201 { storagePath,
   uploadUrl, expiresIn }`. Comprueba que puede editar la ficha (403/404) y que es PDF, JPG o PNG de hasta 10 MB (400).
   `uploadUrl` caduca a los **60 segundos** (lo fija Storage): pedirla justo antes de subir cada fichero.
2. `PUT uploadUrl` con el fichero como cuerpo y `Content-Type: <mimeType>` (sin token: la URL ya va firmada).
3. `POST /v1/documents` `{ entityType, entityId, storagePath, typeId, name, status?, expiresOn?, visibleInPortal?,
   notes? }` → `201 Document`. Comprueba que el fichero está en Storage (si no, 422) y toma de ahí el tamaño y el tipo.
   `status` solo `pending` (por defecto) o `draft`.

Después: `PATCH /v1/documents/{id}` cambia tipo, nombre, estado (`"validated"` valida y pone quién y cuándo),
caducidad, visibilidad y notas; `GET /v1/documents/{id}/download` → `{ url, expiresIn }` (5 minutos; descarga con el
nombre del documento); `DELETE` lo elimina (baja lógica: el fichero se conserva, sale con `?deleted=true` y se restaura
con `POST /v1/documents/{id}/restore`) y deja rastro en el historial, salvo que su tipo sea de conservación obligatoria
(`retentionRequired`: 409 `conservacion_obligatoria`).

Variables: `STORAGE_URL` (desde la API), `STORAGE_PUBLIC_URL` (como lo ve el navegador; por defecto `STORAGE_URL`) y
`SUPABASE_SERVICE_ROLE_KEY`. Sin ellas la API arranca, pero las rutas de ficheros responden 503. En local, en
`.env.example` (Storage en `127.0.0.1:54325`); en el NAS, en `infra/nas/docker-compose.override.yml`.

**Usuarios.** El alta e invitación usan Supabase Auth con la misma `service_role` (`src/lib/auth-admin.ts`):
`AUTH_URL` (GoTrue desde la API: `http://127.0.0.1:9999` en local, `http://auth:9999` en el NAS),
`INVITE_REDIRECT_URL` (la web, acabada en `/`: el enlace es `<INVITE_REDIRECT_URL>verify?token=<hashed_token>&type=invite`,
que canjea la página `/verify` de la web) y `AUTH_SENDS_INVITES` (`true` cuando Auth tenga
SMTP: lo envía Auth y la API devuelve `inviteUrl: null`). Sin `AUTH_URL`, esas rutas responden 503.

Pendiente: edición de roles y borrado de sociedades y sucursales.

### Tests

```bash
sh db/local/reset.sh
```

```bash
cd apps/api && npm test
```

Van contra la base local (Postgres + Auth + Storage de `db/local/`, nunca el NAS) con los datos ficticios de
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
