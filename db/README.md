# Base de datos

PostgreSQL 17 dentro de Supabase autoalojado (ver `infra/nas/`). El esquema se gestiona con migraciones
SQL versionadas en `migrations/`.

## Cómo se accede a los datos

**Solo a través de la API propia (`apps/api`, Node + Hono).** La web no lee ni escribe tablas vía PostgREST,
que no está expuesto a internet. Supabase Auth sigue emitiendo los JWT (con el hook de abajo) y Storage
sigue igual.

La API se conecta con el rol `tramitnow_api` y, en **cada transacción**, tras verificar el JWT:

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims', '<claims del JWT verificado, en JSON>', true);
-- consultas...
commit;
```

Es lo mismo que hace PostgREST, así que `auth.uid()` y `auth.jwt()` funcionan igual y las políticas RLS
son la red de seguridad aunque la API tenga un fallo. Con `set local` / `set_config(..., true)` todo se
deshace al acabar la transacción: nunca debe quedar un rol o unos claims pegados a una conexión del pool.

`tramitnow_api` (migración `20261021000600_api_role.sql`):

- No tiene ningún privilegio propio (NOINHERIT y sin grants): sin el `set role` no lee ni escribe nada.
- Solo puede pasar a `authenticated`; no a `postgres` ni a `service_role`. Sin SUPERUSER ni BYPASSRLS.
- Sin claims, `authenticated` no ve ninguna fila.
- Quien tenga su contraseña puede actuar como cualquier usuario fijando sus claims: es un secreto del
  servidor de la API, igual que la `service_role` key. La API solo debe fijar claims de un JWT verificado.
- Las operaciones de administración (crear usuarios, invitar) van por la API de administración de
  Supabase Auth con la `service_role` key, no con este rol.

```
db/
  migrations/   migraciones, en orden por nombre (AAAAMMDDhhmmss_nombre.sql)
  scripts/      migrate.sh: aplica las migraciones pendientes
  tests/        tests pgTAP de aislamiento entre ETT, RLS y hook de token
  local/        Postgres + Supabase Auth en Docker para probar en el Mac
  seeds/        datos de demostración (ficticios)
  reference/    modelo heredado del proyecto Firebase (solo consulta)
```

## Qué hay hoy (fase 1: núcleo)

| Tabla | Qué es |
|---|---|
| `tenants` | ETT clientes de la plataforma |
| `catalog_items` | Catálogos simples por ETT (provincias, tipos de documento, zonas...) |
| `addresses` | Direcciones reutilizables |
| `companies` | Sociedades de la ETT |
| `branches` | Sucursales de una sociedad |
| `profiles` | 1:1 con `auth.users`: nombre, teléfono, estado, ETT activa |
| `platform_admins` | Superadmins de la plataforma |
| `permissions` | Catálogo global de permisos finos (lo define el código) |
| `roles`, `role_permissions` | Roles por ETT, editables, y sus permisos |
| `memberships` | Usuario ↔ ETT, con un rol. Un usuario puede estar en varias ETT |
| `user_contexts` | Alcance de una membresía: sociedades y sucursales |

Las tablas de pantallas concretas (clientes, ofertas, peticiones, candidatos, documentos...) llegarán
cuando estén cerrados sus diseños.

### Identidad

La identidad, el email y la contraseña están en `auth.users` (Supabase Auth). Al crear un usuario,
un trigger crea su `profiles`. La tabla `users` del modelo heredado desaparece.

Para dar acceso a alguien a una ETT se crea una fila en `memberships` con su rol y, si su rol no
abarca toda la ETT, filas en `user_contexts` con sus sucursales (`branch_id` NULL = toda la sociedad).

### Roles

Cada ETT nace con estos roles (trigger al insertar en `tenants`). Se pueden renombrar y cambiar sus
permisos, y la ETT puede crear roles propios; los de serie no se borran.

| Rol | Permisos de serie | Alcance (`roles.scope`) |
|---|---|---|
| `admin` | Todos | `tenant`: toda la ETT |
| `laboral` | Laboral | `tenant` |
| `director_zona` | Laboral, Selección, Comercial | `branches`: sus sucursales |
| `seleccion` | Selección | `branch`: una sucursal activa |
| `comercial` | Comercial | `branch` |

`superadmin` no es un rol de ETT: es una fila en `platform_admins` (todas las ETT). Esa tabla solo se
escribe por SQL o con la `service_role`, nunca desde el cliente.

A esto se añadirán los usuarios del portal de cliente (`client_portal_users`) y, si se hace, del portal de trabajador.

### JWT: Custom Access Token Hook

`private.custom_access_token_hook` añade al JWT, cada vez que Supabase Auth lo emite (login y refresh):

```json
{ "tenant_id": "uuid de la ETT activa o null", "app_role": "admin", "branch_ids": ["uuid", "..."] }
```

- La ETT activa es `profiles.active_tenant_id` si el usuario tiene ahí una membresía activa; si no, su
  membresía activa más antigua. Para el superadmin vale cualquier ETT. `app_role` es `superadmin` para él.
- Cambiar de ETT: el usuario actualiza `profiles.active_tenant_id` (un trigger exige que sea miembro) y
  refresca la sesión (`supabase.auth.refreshSession()`).
- Los permisos finos **no** van en el JWT: se consultan en `role_permissions` en cada petición, así que
  quitar un permiso o bloquear una membresía surte efecto al momento, sin esperar a que caduque el token.

El hook está en el esquema `private` y no en `auth` porque ese esquema lo gestionan las migraciones
de Supabase Auth.

### RLS

- Todas las tablas tienen RLS. Las políticas solo leen `auth.uid()` / `auth.jwt()` (que la API fija a
  partir del JWT firmado y verificado) y tablas que el cliente no controla. Nada de `current_setting('app.*')`.
- `private.current_tenant_id()`: el `tenant_id` del JWT, solo si hay una membresía activa en esa ETT
  (y perfil y ETT activos). Si alguien manipulara el claim, no vería nada.
- `private.is_superadmin()`: mira `platform_admins`, no el claim `app_role`.
- `private.has_permission('companies.manage')`: permiso del rol en la ETT activa.
- `private.can_access_branch(branch_id)`: para las tablas por sucursal de las siguientes fases.
- Lectura: filas de la ETT activa. Escritura: además, el permiso de la tabla (`catalogs.manage`,
  `addresses.write`, `companies.manage`, `branches.manage`, `roles.manage`, `users.manage`, `tenant.manage`).
- El superadmin lee y escribe en todas las ETT a la vez: el cliente debe filtrar por `tenant_id`.
- `anon` no tiene privilegios sobre ninguna tabla del núcleo, y por defecto tampoco sobre las nuevas
  de `public` (hay que concederlos expresamente). Aunque PostgREST no esté expuesto, así sigue sin ver nada.
- El esquema `private` tampoco lo expondría PostgREST (`PGRST_DB_SCHEMAS` = public, storage, graphql_public):
  sus funciones no son RPC. No hay ninguna función de cambio de contexto.

### Reglas para tablas nuevas

1. `tenant_id uuid not null references public.tenants (id) on delete cascade` y `unique (tenant_id, id)`.
2. FK a otras tablas de negocio siempre compuestas: `foreign key (tenant_id, x_id) references x (tenant_id, id)`.
   Para "poner a NULL al borrar", `on delete set null (x_id)`: así no se toca `tenant_id`.
3. Índices y unicidades empiezan por `tenant_id`; las unicidades de negocio con `where deleted_at is null`.
4. `created_at`, `updated_at` (trigger `private.touch_updated_at()`), `deleted_at`.
5. RLS activado y políticas como las de `20261021000400_rls.sql` (lectura por ETT activa, escritura con permiso;
   por sucursal con `private.can_access_branch`). Revocar `anon` y `truncate`. `authenticated` (y por tanto
   la API) recibe los privilegios de tabla por los default privileges de Supabase; no concedas nada a `tramitnow_api`.
6. Si hace falta un permiso nuevo: insertarlo en `permissions` y asignarlo a los roles de serie de las ETT
   existentes y en `private.seed_tenant_roles()`.
7. Tests en `tests/` que prueben que otra ETT no lee ni escribe.

## Probar en local

Requisitos: Docker Desktop. No hace falta `psql` en el Mac.

```bash
sh db/local/reset.sh
```

```bash
sh db/tests/run.sh
```

`reset.sh` borra y levanta, con las mismas versiones que el NAS:

- `supabase/postgres:17.6.1.136` (contenedor `tramitnow-db-local`, puerto `127.0.0.1:54322`, usuario
  `postgres`, contraseña `postgres`).
- Supabase Auth `supabase/gotrue:v2.197.0` (contenedor `tramitnow-auth-local`, `127.0.0.1:9999`) con el hook
  de token activado. Al arrancar crea su esquema `auth` completo (con `auth.jwt()`).

Después aplica las migraciones, habilita el login de `tramitnow_api` y da de alta la ETT DEMO con
`seeds/demo-tenant.sql` y un usuario administrador creado por la API de administración de Auth.
Ese usuario y el secreto de los JWT locales están en `local/dev.env` (valores de desarrollo, no secretos).

Con eso, `cd apps/web && npm run dev:real` y se entra en http://localhost:5173 con ese usuario: Vite reenvía
`/auth/v1` al Auth local. (`npm run dev` a secas es el modo demo: entra sin login y no usa este Auth.)

Cada test corre en una transacción que se deshace, con los datos ficticios de `tests/_fixtures.sql`.
`06_api.sql` es distinto: se conecta de verdad como `tramitnow_api` y hace lo mismo que la API; como otra
conexión no ve datos sin confirmar, para él los datos ficticios se confirman y se borran al terminar
(`tests/_cleanup.sql`). Los tests no tocan la ETT DEMO.

Para conectarse con un cliente: `postgresql://postgres:postgres@localhost:54322/postgres`
(como la API, desde dentro del contenedor: `docker exec -it tramitnow-db-local psql -h 127.0.0.1 -U tramitnow_api -d postgres`).
Para pararlo: `docker compose -f db/local/docker-compose.yml --env-file db/local/dev.env down -v`.

## Aplicar en el NAS

El Postgres del NAS está dentro de Docker (contenedor `supabase-db`) y solo se llega por SSH.
`migrate.sh` aplica solo las migraciones pendientes, cada una en su transacción, y las anota en
`supabase_migrations.schema_migrations`. Nunca ejecutes los tests contra el NAS.

1. Copia de seguridad antes de migrar (además del backup diario), en el NAS:

   ```bash
   ssh Enric@192.168.2.8
   cd /volume1/docker/tramitnow
   sudo sh -c 'docker exec supabase-db pg_dump -U postgres -Fc postgres > backups/antes-de-migrar.dump'
   ```

2. Copia `db/` al NAS (desde el Mac):

   ```bash
   COPYFILE_DISABLE=1 tar --no-mac-metadata --no-xattrs -C db -czf - migrations scripts seeds | ssh Enric@192.168.2.8 'mkdir -p /volume1/docker/tramitnow/db && tar -xzf - -C /volume1/docker/tramitnow/db'
   ```

3. En el NAS, aplica las migraciones:

   ```bash
   ssh Enric@192.168.2.8
   cd /volume1/docker/tramitnow
   sudo env PSQL="docker exec -i supabase-db psql -U postgres -d postgres" sh db/scripts/migrate.sh
   ```

4. Solo la primera vez, activa el hook en Supabase Auth. Ya está en `infra/nas/docker-compose.override.yml`
   (servicio `auth`); hay que llevarlo al NAS y regenerar el proyecto como explica "Actualizar" en
   `infra/nas/README.md`, y volver a desplegar el Proyecto en UGOS.

   Hazlo **después** del paso 3: si el hook está activado y la función no existe, nadie puede iniciar sesión.

5. Cuando exista `apps/api` (no antes), habilita el login de `tramitnow_api` con una contraseña larga
   (no la escribas en la línea de comandos ni en el repo; va al `.env` de la API):

   ```bash
   sudo docker exec -it supabase-db psql -U postgres -d postgres -c 'alter role tramitnow_api login'
   ```

   ```bash
   sudo docker exec -it supabase-db psql -U postgres -d postgres -c '\password tramitnow_api'
   ```

   La API se conecta por la red de Docker del proyecto: `postgresql://tramitnow_api:<contraseña>@db:5432/postgres`.

6. Comprueba que el hook funciona: inicia sesión y decodifica el `access_token` (debe traer `tenant_id`,
   `app_role` y `branch_ids`).

### ETT de demostración y primer usuario

1. En Supabase Studio (`http://192.168.2.8:8000`): Authentication > Add user > Create new user, con
   "Auto Confirm User" marcado. Es el usuario con el que entrarás en la demo.
2. En el NAS (con `seeds/` ya copiado en el paso 2):

   ```bash
   cd /volume1/docker/tramitnow
   sudo sh -c 'docker exec -i supabase-db psql -U postgres -d postgres -v email=TU_CORREO < db/seeds/demo-tenant.sql'
   ```

   Crea la ETT DEMO (ETT Global Servicios Temporales, sociedad y dos sucursales, todo ficticio) y hace
   administrador al usuario. Al terminar muestra los claims que llevará su token. `-v superadmin=1` lo
   hace además superadmin. Si la ETT DEMO ya existe, falla sin cambiar nada.
3. Despliega la web (`infra/nas/README.md`, "Desplegar la web") y entra en `https://demo.henrik11.duckdns.org`
   con ese usuario.

## Cambios respecto al modelo heredado (`reference/`)

- `users` (con `firebase_uid`, `password_hash` y email único por ETT) → `auth.users` + `profiles` +
  `memberships`. `user_roles` desaparece: el rol va en la membresía.
- `user_contexts` cuelga de `memberships` y exige que la sucursal sea de la sociedad indicada.
  Se quita `permissions_override`: los permisos están en `role_permissions`.
- `roles` gana `scope` e `is_system`; permisos normalizados en `permissions` / `role_permissions`.
- RLS con `auth.jwt()` + memberships en vez de `current_setting('app.tenant_id')` / `app.rol`.
  `set_backend_tenant_context` y `backend_tenant_visible` desaparecen.
- FK compuestas `(tenant_id, id)` en todo el núcleo.
- `companies.prevention_config_id` y `prevention_configurations` quedan para cuando se rediseñe esa pantalla.

## Pendiente

- Resto de tablas del modelo (convenios, tipos de contrato, clientes, ofertas, peticiones, candidatos,
  trabajadores, documentos, comunicaciones, auditoría, importaciones), siguiendo las reglas de arriba.
- Datos personales (NIF, Nº SS, IBAN, documentos): cifrado a nivel de columna y auditoría de accesos.
- Catálogos globales (provincias, municipios y países del INE) compartidos por todas las ETT, en vez de copiarlos por ETT.
- Comprobar que `addresses.province_id` y similares apuntan al catálogo correcto (hoy solo se exige que sea de la misma ETT).
- Sucursal activa para los roles `branch` (`seleccion`, `comercial`): hoy el JWT lleva todas sus sucursales.
- `apps/api`: conexión como `tramitnow_api`, verificación del JWT y el `set local role` + `set_config` por transacción.
- Alta de usuarios e invitaciones desde la API (service_role), y portal de cliente.
