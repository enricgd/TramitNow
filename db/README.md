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
| `catalog_items` | Catálogos simples por ETT (formas de pago, zonas, causas...). Los oficiales son globales: ver módulo 1 |
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

## Módulo 1: catálogos legales y de configuración

Migraciones `20261027000100_global_catalogs.sql`, `..._global_catalogs_data.sql` y `..._labor_catalogs.sql`,
y el seed `seeds/ine-municipios.sql`. Tests: `tests/07_catalogos_globales.sql` y `tests/08_catalogos_laborales.sql`.

### Catálogos globales y catálogos por ETT

Hay dos clases de catálogo y no se mezclan:

| | Globales | Por ETT |
|---|---|---|
| Qué | Lo que fija la Administración y es igual para todas: provincias, municipios, países, claves de contrato | Lo que cada ETT decide: convenios que aplica, categorías y puestos, tipos de contrato internos, conceptos |
| `tenant_id` | No | Sí, con las reglas de tablas nuevas |
| Clave | El código oficial (`'28'`, `'28079'`, `'ES'`, `'402'`) | `uuid` + `code` único por ETT |
| Quién escribe | Nadie desde la API, ni el superadmin: migraciones y seeds con la fuente citada | Usuarios de la ETT con `labor_catalogs.manage` (admin y laboral) |
| Quién lee | Cualquier usuario autenticado, tenga ETT o no | Miembros de la ETT activa (y el superadmin) |
| Bajas | `active = false` (el histórico las sigue referenciando) | `deleted_at` / `status` |

Por qué:

- **Copiar los oficiales en cada ETT** (como hacía `catalog_items` en el modelo heredado) multiplica 8.000
  municipios por ETT, deja que cada una los edite a su manera y obliga a actualizar N copias cuando el INE
  publica la relación anual. Lo que se comunica a SEPE, TGSS o AEAT tiene que ser el código oficial, no el
  que haya escrito una ETT.
- **Código oficial como clave primaria**: es estable, legible en la base de datos y en los ficheros que se
  intercambian (Contrat@, afiliación) y permite una FK simple desde las tablas por ETT
  (`province_code char(2) references provinces`). La FK compuesta con `tenant_id` no aplica: no hay ETT.
- **Solo lectura incluso para el superadmin**: un cambio en un catálogo oficial afecta a todas las ETT a la
  vez. Debe ir en una migración o seed revisado, con la fuente, no en una pantalla.
- **Lo configurable va por ETT y apunta al oficial**: un tipo de contrato de la ETT (`contract_types`, con su
  código y nombre internos, por ejemplo "403 Acumulación de tareas previsible") lleva la clave oficial
  (`contract_key_code = '402'`). Es lo que hacía el programa anterior con "Código" y "Cód. Oficial".
- `catalog_items` sigue para catálogos simples por ETT (formas de pago, zonas, causas...). `addresses` usa los
  globales: `municipality_code`, `province_code` y `country_code` (España por defecto; provincia y municipio
  solo en España, y el municipio de su provincia). Migración `20261028000100_addresses_global_catalogs.sql`.

### Tablas

Globales (sin `tenant_id`):

| Tabla | Clave | Datos | Fuente |
|---|---|---|---|
| `autonomous_communities` | CODAUTO (2) | 19 | INE, relación de comunidades y ciudades autónomas con sus códigos |
| `provinces` | CPRO (2) | 52 | INE, ídem y relación de municipios 2026 (nombres) |
| `municipalities` | CPRO+CMUN (5), con dígito de control | 8.132 | INE, relación de municipios a 1-1-2026 (`seeds/ine-municipios.sql`) |
| `countries` | ISO 3166-1 alfa-2, con alfa-3 y numérico | 249 | ISO 3166-1 (iso-codes de Debian), nombres en español; marca UE y EEE |
| `contract_keys` | clave TGSS-SEPE (3) | 48 (2 inactivas: 401/501) | INAEM, "Modalidades de contratación 2024" (codificación unificada TGSS-SEPE) |

Por ETT:

| Tabla | Qué es | Notas |
|---|---|---|
| `collective_agreements` | Convenios que aplica la ETT | Código interno, código REGCON opcional, ámbito (estatal, autonómico, provincial...) con comunidad o provincia, vigencia. Sirve igual para "convenio cliente", "convenio nómina" o GRDA: quien lo usa decide el papel |
| `professional_categories` | Categorías y puestos ("Categorías TTI-SRV") | Convenio, nivel o grupo del convenio, CNO-11 (texto de 4 dígitos), grupo de cotización 1-11, código estadístico. Ámbito: ETT, sociedad o sucursal |
| `contract_types` | Tipos de contrato de la ETT | Clave oficial obligatoria; cotización por porcentajes o importes fijos. Al crear la ETT se crea uno por clave activa (trigger `private.seed_tenant_contract_types`) |
| `payroll_concepts` | Conceptos de nómina y de coste | Tipo, cálculo por defecto (%, €/h, €/día, €/mes), base del %, salarial o extrasalarial, obligatorio por ley y marcas de impresión (oferta, CPD factura, CPD salario, contrato) |

Permiso nuevo `labor_catalogs.manage` (módulo laboral): de serie en `admin` y `laboral`, añadido también a
las ETT que ya existían. Leer los catálogos no exige permiso: comercial y selección los necesitan.

Los presupuestos y peticiones que usen convenios o conceptos deben **copiar** importes y descripciones
(como dice "Histórico de precios" en `docs/modelo-backend.md`): editar el catálogo no cambia lo ya enviado.

### Actualizar los catálogos oficiales

- **Municipios**, cada año cuando el INE publique la relación a 1 de enero:

  ```bash
  curl -fsSLO https://www.ine.es/daco/daco42/codmun/27codmun.xlsx
  ```

  ```bash
  python3 -I db/scripts/ine-municipios.py 27codmun.xlsx 2027 > db/seeds/ine-municipios.sql
  ```

  El seed es idempotente: inserta o actualiza y marca como inactivos los que desaparecen. Se aplica en el
  NAS como en el paso 3 de "Aplicar en el NAS" y `reset.sh` lo carga en local.
- **Provincias, países y claves de contrato**: con una migración nueva que cite la fuente. Una clave de
  contrato que se suprima se marca `active = false`, no se borra.

### Rutas en la API

Ya están en `apps/api` (ver "Rutas" en `apps/README.md`): `/v1/catalogs/...` para los globales (cualquier usuario
con sesión) y `/v1/collective-agreements`, `/v1/professional-categories`, `/v1/contract-types` y
`/v1/payroll-concepts` para los de la ETT (leer: cualquier miembro; escribir: `labor_catalogs.manage`; `DELETE`
es baja lógica). Los municipios exigen provincia o texto: nunca se devuelve la lista entera. La búsqueda por
texto no ignora acentos ("Malaga" no encuentra "Málaga"); si hace falta, la extensión `unaccent`.

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

## Módulo 2: empresas cliente

Migración `20261028000200_clients.sql`. Tests: `tests/10_clientes.sql`. Fuentes: `docs/modelo-backend.md` (§03),
`docs/inventario-pantallas.md` (§2-7), `design/empresas.html` y el modelo heredado.

| Tabla | Qué es | Notas |
|---|---|---|
| `clients` | Empresa cliente (usuaria) | De una sociedad de la ETT, con sucursal propietaria. Estado `prospect`, `active` o `inactive`; bloqueo con motivo. **NIF único por sociedad** (sin espacios ni guiones, en mayúsculas). Responsable de la ETT (`owner_user_id`) |
| `client_centers` | Centros de trabajo | Sucursal gestora, CCC (11 dígitos), CNAE y régimen (texto hasta que haya catálogos), convenio del cliente, de nómina y GRDA, sociedad y sucursal para los TC, instrucciones de acceso y PRL |
| `client_contacts` | Contactos del cliente o de un centro (del mismo cliente) | **Datos personales.** Para qué se le contacta (`roles`), un contacto principal como mucho, destinatario de presupuestos, firmante de CPD. **DNI/NIE solo del firmante de los CPD**; sin fecha de nacimiento |
| `client_billing_profiles` | Facturación (1:1) | Forma y plazo de pago, días fijos (máx. 3), IBAN y BIC, cliente al que se factura, riesgo, cuenta contable, textos fijos... |

Además, `professional_categories.client_id`: categorías propias de un cliente (de la sociedad del cliente).

Acceso (decidido por Enric el 2026-10-28):

- **Leer clientes, centros y contactos: cualquier miembro de la ETT**, sea cual sea su sucursal.
- **Escribir: `clients.manage`** (de serie en `admin`, `laboral`, `director_zona` y `comercial`; no en `seleccion`)
  y acceso a la sucursal del cliente (clientes y contactos) o del centro (`private.can_access_branch`).
- **Facturación: `clients.billing.manage`** (de serie solo en `admin`), también para leerla.

La API avisa (sin impedirlo) si el plazo de pago supera los 60 días de la Ley 3/2004. La "preparación" que muestra
la maqueta (lista para presupuestar, para operar o para facturar) se calcula; no se guarda.

Fuera de este módulo: firma digital de facturas y CPD (`client_digital_signature_settings`), riesgos del puesto
(PRL: decidir si van aquí o con peticiones y CPD), portal de cliente, documentos (Storage) e historial (auditoría).

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

Después aplica las migraciones, carga los municipios del INE (`seeds/ine-municipios.sql`), habilita el login de `tramitnow_api` (con la contraseña local `API_DB_PASSWORD`
de `local/dev.env`, para `apps/api`) y da de alta la ETT DEMO con
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

   Si la migración trae catálogos globales o el INE ha publicado una relación nueva, carga también los
   municipios (es idempotente; la primera vez, después de `20261027000100_global_catalogs.sql`):

   ```bash
   sudo sh -c 'docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < db/seeds/ine-municipios.sql'
   ```

4. Solo la primera vez, activa el hook en Supabase Auth. Ya está en `infra/nas/docker-compose.override.yml`
   (servicio `auth`); hay que llevarlo al NAS y regenerar el proyecto como explica "Actualizar" en
   `infra/nas/README.md`, y volver a desplegar el Proyecto en UGOS.

   Hazlo **después** del paso 3: si el hook está activado y la función no existe, nadie puede iniciar sesión.

5. Para `apps/api`, habilita el login de `tramitnow_api` con una contraseña larga (no la escribas en la
   línea de comandos ni en el repo; va al `.env` del NAS, ver "API" en `infra/nas/README.md`):

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

- Resto de tablas del modelo (ofertas, peticiones, candidatos, trabajadores, documentos, comunicaciones,
  auditoría, importaciones), siguiendo las reglas de arriba.
- Datos personales (NIF, Nº SS, IBAN, documentos): cifrado a nivel de columna y auditoría de accesos.
- Más catálogos oficiales globales: ocupaciones CNO-11 (y el código de 8 dígitos del SEPE para Contrat@),
  CNAE, regímenes de la Seguridad Social, tipos de documento de identidad (`client_centers.cnae_code` y
  `ss_regime_code` pasarán a FK). `professional_categories.cno_code`
  pasará a FK cuando exista el de ocupaciones.
- Catálogo global de convenios, con tablas salariales por versión y cambios retroactivos: propuesta en
  `docs/convenios-globales.md`. Cambia `collective_agreements` (nuevo `global_agreement_id`), así que
  conviene decidirlo antes de cargar datos reales.
- Sucursal activa para los roles `branch` (`seleccion`, `comercial`): hoy el JWT lleva todas sus sucursales.
- Alta de usuarios e invitaciones desde la API (service_role), y portal de cliente.
