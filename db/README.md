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
| `catalog_items` | Tablas maestras simples por ETT (formas de pago, sectores, motivos...), de los tipos de `catalog_types`. Los oficiales son globales: ver módulo 1 |
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
8. Si es una ficha o cuelga de una: trigger de historial (`private.log_activity`, ver "Historial de actividad") y, si
   lleva documentos, su tipo en `documents.entity_type`. Si tiene sucursal, `branch_id` (la API filtra con `?branchId=`).
9. Reglas de negocio en triggers que el usuario deba leer: `raise exception '<mensaje en español>' using errcode =
   'TN409'` (o `'TN422'`); la API devuelve ese mensaje con 409 (o 422). Para «no se puede eliminar porque se usa»,
   `'TNUSE'` (409 `en_uso`); para conservación obligatoria, `'TNRET'` (409 `conservacion_obligatoria`).
10. Si se puede eliminar desde la pantalla: baja lógica recuperable (ver "Fase 2: empresas"), con su comprobación de
   uso en `private.entity_in_use`. Y si la tabla nueva usa clientes, centros o contactos, añadir esa consulta allí.

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
(PRL: decidir si van aquí o con peticiones y CPD) y portal de cliente. Los documentos y el historial son comunes a
todas las fichas: ver "Fase 1: cimientos comunes".

## Fase 1: cimientos comunes

Lo que usan casi todas las pantallas (`docs/plan-desarrollo.md`, fase 1). Migraciones `20261115000100_catalog_types.sql`
a `..._000400_number_series.sql`; tests `tests/11_tablas_maestras.sql` a `tests/14_series.sql` y, en `apps/api`,
`test/tablas-maestras`, `historial`, `documentos` y `series` (este último prueba la concurrencia con dos conexiones).

### Tablas maestras

`catalog_items` (por ETT) con el tipo en `catalog`, que ahora es una FK a **`catalog_types`**: lista cerrada y global,
que se amplía con una migración (como `permissions`). Tipos:

| Ya usados por tablas | Nuevos (notas del diseño) |
|---|---|
| `geo_zone`, `tax_id_type`, `client_type`, `business_group`, `payment_method`, `invoice_type`, `invoice_print_model`, `vat_special_cause`, `retention_type`, `statistical_sector` | `vat_regime`, `quote_rejection_reason`, `vacancy_cancellation_reason` (baja de plaza), `assignment_end_reason` (fin de misión), `incident_type`, `document_type` |

- **Nombre único por tipo sin distinguir mayúsculas** (`lower(name)`, entre los no dados de baja). El **código pasa a
  ser opcional**: lo que se da de alta desde un desplegable ("+ Añadir") solo tiene nombre.
- `retention_required` (solo en `document_type`): sus documentos no se pueden borrar. Ver "Documentos".
- Leer: cualquier miembro. Escribir: `catalogs.manage` (de serie solo `admin`). Baja lógica (`deleted_at`).
- No se cargan valores por defecto, salvo las causas especiales de IVA (fase 2): los de las notas son de ejemplo y
  están por confirmar con administración.
- El tipo `sector` se retiró en la fase 2: el sector del cliente es el catálogo común CNAE (ver "Fase 2: empresas").

### Historial de actividad

`activity_log`: quién (`actor_user_id`), cuándo, qué entidad, acción (`create`, `update`, `delete`, `restore`), un resumen en
español ("Alta de centro de trabajo «Almacén»", "Validación de documento «CIF»") y, en los cambios, `changes` con el
antes y el después de cada columna cambiada.

- Lo escriben **solo triggers** (`private.log_activity`, SECURITY DEFINER); `authenticated` no puede insertar, cambiar
  ni borrar. Hoy, en `clients`, `client_centers`, `client_contacts`, `client_billing_profiles` y `documents`. Para otra
  tabla: `create trigger ... after insert or update or delete ... execute function private.log_activity('tipo',
  'columna_nombre', 'tipo_padre', 'columna_padre')` y añadir el tipo a `private.activity_label` y
  `private.activity_visible`.
- `parent_type` / `parent_id`: la ficha a la que pertenece (el cliente de un centro, de un contacto, de su
  facturación o de un documento suyo o de sus centros). Así la ficha del cliente enseña todo lo suyo.
- La baja lógica (`deleted_at`) cuenta como `delete` ("Eliminación de ..."); quitarla, como `restore`
  ("Restauración de ..."); el borrado de la fila, "Eliminación definitiva de ...". Suspender y reactivar un contacto
  tienen su resumen ("Suspensión de contacto ..."). Tocar solo `updated_at` no deja rastro. Borrar una ETT entera no deja rastro (no hay a qué apuntar).
- **Datos sensibles**: de `iban`, `swift_bic`, `document_number` y `tax_id` solo se guarda que han cambiado
  (`{"masked": true}`). En el alta y la baja no se copia la fila, solo el resumen (que lleva el nombre).
- **Visibilidad** (`private.activity_visible`, SECURITY INVOKER: usa las RLS de quien lee): la de la entidad. Los
  hijos se ven si se ve su ficha, así que el rastro de algo eliminado de verdad sigue visible; la facturación, solo
  con `clients.billing.manage`.

### Documentos

`documents`: una tabla para cualquier ficha (`entity_type` + `entity_id`), con tipo (`document_type`), nombre,
ruta en Storage, tipo MIME, tamaño, estado (`pending` al subir, `validated`, `draft`), caducidad opcional, visible en el
portal, notas, quién lo subió y cuándo, y quién lo validó y cuándo (los pone un trigger, no el cliente).

- Entidades hoy: `client` y `client_center`. Las siguientes (`offer`, `request`, `candidate`, `file`...) se añaden con
  su tabla ampliando el check de `entity_type` y `private.document_entity_exists / _writable / _visible`.
  `entity_id` no puede tener FK: un trigger comprueba que la ficha existe en la ETT.
- **Ficheros**: bucket privado `documents` de Supabase Storage (lo crea la migración; 10 MB, PDF, JPG o PNG, como la
  ventana de subida del diseño), con la ruta `{tenant_id}/{entity_type}/{entity_id}/{uuid}.{ext}` (un check lo
  exige). El bucket no tiene políticas para `anon` ni `authenticated`: solo se entra con URL firmadas por la API, que
  es la única que tiene la `service_role`. El fichero, la ficha y quién lo subió no se cambian después.
- **Permisos**: leer, quien ve la ficha (hoy, cualquier miembro: los clientes los ven todos). Subir, editar, validar,
  eliminar y restaurar, quien puede editar la ficha (`clients.manage` en la sucursal del cliente o del centro).
- **Eliminar es una baja lógica recuperable** desde la fase 2 (en la fase 1 era definitivo): `deleted_at`, el fichero se
  queda en Storage y el documento se puede restaurar (si su ficha no está eliminada). Queda en el historial.
  **Conservación obligatoria**: si el tipo tiene `retention_required`, no se puede eliminar el documento (ni de forma
  lógica ni definitiva) ni pasarlo a un tipo que no la tenga (error `TNRET` → 409 `conservacion_obligatoria`).

### Numeración por series

`number_series`: una fila por ETT, clase de documento (`quote`, `request`, `invoice`), sociedad y sucursal (opcionales)
y año, con prefijo, ceros (`padding`) y el último número. `private.next_number(tenant, clase, año, sociedad, sucursal)`
devuelve `(series_id, number, formatted)`, p. ej. `PRE2026-00001`.

- **Sin huecos**: el número sale de un `UPDATE` de la fila de la serie; el bloqueo de fila hace esperar a la siguiente
  transacción y, si la que lo pidió se deshace, el número vuelve. Hay que pedirlo **en la misma transacción que crea
  el documento**, nunca antes.
- Si la serie no existe, se crea con el primer número y el prefijo por defecto (`PRE`, `PET`, `FAC` + año + `-`).
- Los miembros leen las series de su ETT; solo `next_number()` las cambia. Aún no hay rutas en la API: las usarán
  presupuestos, peticiones y facturas al crear.

### Decisiones pendientes (no se han tomado aquí)

- **Tablas maestras**: ¿quién amplía las listas desde los formularios? Hoy, solo `catalogs.manage` (admin); el diseño
  deja que cualquiera añada valores (y sugiere que queden "pendientes de revisar"). Valores iniciales de forma de pago,
  IVA, motivos y tipos de documento. (Sectores y días de pago: decididos en la fase 2.)
- **Documentos**: ¿quién valida? (hoy, quien puede editar la ficha). ¿Pueden leer todos los miembros los documentos de
  un cliente, como la ficha? ¿Qué tipos son de conservación obligatoria y durante cuánto tiempo (contratos, CPD,
  nóminas)? Y qué pasa al cumplirse el plazo: hoy no se borran nunca. Eliminar un documento que se ha enseñado en el
  portal del cliente. Se mantienen los criterios actuales hasta que se decida (fase 2, decisión 6).
- **Historial**: cuánto tiempo se guarda y si los nombres de contactos borrados deben quedar en los resúmenes (RGPD).
- **Series**: si las facturas van por sociedad o por sucursal y el formato del número. (Desde la fase 3 la ETT las da de
  alta y las ajusta con `tenant.manage`.)
- Ficheros subidos pero nunca registrados (paso 3 sin hacer): habrá que limpiarlos con un proceso programado.

## Fase 2: empresas

Decisiones de Enric sobre el modelo de clientes (2026-11-16; resumen en `docs/modelo-backend.md`, §03). Migraciones
`20261116000100_cnae.sql`, `..._000200_clients_fase2.sql` y `..._000300_soft_delete.sql`; tests
`tests/15_empresas_fase2.sql` y, en `apps/api`, `test/empresas-fase2` (y `documentos`).

| Qué | Cómo |
|---|---|
| Sector del cliente | `clients.sector_code` → **`cnae_activities`**, catálogo global (como municipios): secciones (letra) y divisiones (2 dígitos) de la **CNAE-2009**. Se retira la tabla maestra `sector` (no la usaba ninguna tabla; sus valores se borran) |
| Convenio por defecto | `clients.default_agreement_id` → `collective_agreements` de la ETT. Los centros con `client_agreement_id` NULL lo heredan; la API da `effectiveClientAgreementId` (no se guarda) |
| Contactos | Rol `other` («Otro») con su texto en `other_role` (obligatorio con ese rol y solo con él), `validates_hours`, `suspended` con `suspended_at` / `suspended_by` (los pone un trigger) |
| Centros | Sin cambios: `blocked` es el «Inactivo» de la pantalla; no hay otro estado |
| Facturación | `invoice_layout`: `by_person` (por defecto) o `by_concept`. `fixed_payment_days` sigue como números: **31 = último día del mes**, y un día que el mes no tiene (30 en febrero) es su último día. Forma de pago e IVA, tablas maestras |
| IVA del cliente | **Sin campo de régimen**: `vat_special_cause_id` NULL = régimen general, y `equivalence_surcharge`. La tabla maestra `vat_special_cause` se siembra en cada ETT (existentes y nuevas, trigger en `tenants`) con `EXENTA` (exenta de IVA), `ISP` (inversión del sujeto pasivo), `IGIC` (Canarias) e `IPSI` (Ceuta y Melilla); la ETT los renombra o da de baja. Lista en `private.vat_special_cause_defaults()` |
| Preparación del cliente | `private.client_readiness(tenant, cliente)` → `{ centers, contacts, hasBilling }` contando solo lo no eliminado (los contactos suspendidos cuentan). SECURITY DEFINER para que el sí/no de facturación lo vea cualquier miembro, sin los datos; solo responde para la ETT activa. La API lo devuelve en cada cliente (`readiness`) |

**CNAE: por qué la 2009.** `client_centers.cnae_code` ya guarda la clase CNAE-2009 (4 dígitos), que es la que usan la
cotización por accidentes de trabajo (tarifa de primas) y Contrat@. La CNAE-2025 (Real Decreto 10/2025) está en vigor
desde 2025 con otra estructura de secciones y divisiones; pasar a ella es una decisión pendiente (la columna `version`
permite tener las dos). Los códigos son los oficiales; los literales están transcritos **[verificar]** con la
publicación del INE.

### Eliminar y restaurar (baja lógica recuperable)

En clientes, centros, contactos y documentos, «eliminar» pone `deleted_at`:

- Lo eliminado no sale en las listas; con `?deleted=true` salen **solo** los eliminados (con `deletedAt`). Se restaura
  con `POST /v1/<recurso>/{id}/restore`. Mismos permisos que editar.
- **Solo se elimina lo que no se ha usado**: `private.entity_in_use(tipo, tenant, id)` devuelve el motivo y un trigger
  lanza `TNUSE` (409 `en_uso`). Hoy, un cliente está en uso si otro cliente activo le factura (`invoice_client_id`);
  centros y contactos aún no los usa nada, pero la función es el punto donde se añadirán presupuestos, peticiones,
  misiones y CPD. Lo usado se desactiva (`clients.status`/`blocked`, `client_centers.blocked`) o se suspende
  (contactos).
- **Eliminar un cliente elimina sus centros y contactos** con la misma marca de tiempo; restaurarlo restaura solo esos
  (no lo que se eliminó antes por separado). Un centro o un contacto no se restaura si su cliente está eliminado
  (`TN409`), ni un documento si su ficha lo está. Los documentos del cliente no se eliminan con él.
- Restaurar puede chocar con los únicos de lo activo (código, NIF, contacto principal): 409 `conflicto`.
- Documentos de conservación obligatoria: no se eliminan (`TNRET`, 409 `conservacion_obligatoria`).
- Todo queda en el historial (`delete` / `restore`).

Pendiente de decidir: cuánto tiempo se guarda lo eliminado y cuándo se purga de verdad (filas y ficheros de Storage),
y quién puede purgar. Hoy no se purga nada.

## Fase 3: convenios globales y Mi ETT

Migraciones `20261116000500_global_agreements.sql` y `..._000600_mi_ett.sql`; tests `tests/16_convenios_globales.sql`
y `tests/17_mi_ett.sql` y, en `apps/api`, `test/convenios` y `test/mi-ett`. Propuesta de los convenios:
`docs/convenios-globales.md` (fases 0 y 1).

### Convenios globales

Los carga TramitNOW (con IA o a mano) y los revisa el **equipo de contenidos**, un rol de plataforma nuevo:
`platform_content_editors` (como `platform_admins`, se escribe por SQL). No es una membresía: no ve datos de ninguna ETT,
y el superadmin no es del equipo por serlo (ni ve borradores ni escribe en el catálogo). `/v1/me` → `isContentEditor`.

| Tabla (global, sin `tenant_id`) | Qué |
|---|---|
| `agreements` | REGCON (único), nombre, ámbito (`estatal`, `autonomico`, `provincial`, `empresa`), comunidad o provincia, `cnae_codes` (sección, división, grupo o clase CNAE-2009), vigencia, convenio al que sustituye |
| `agreement_publications` | Boletín, fecha, número (único por convenio), enlace y tipo (`texto_inicial`, `revision_salarial`, `tablas_provisionales`, `correccion_errores`, `sentencia`, `anulacion`) |
| `agreement_versions` | Efectos desde/hasta, provisional, publicación de origen, estado, `pending_review`, quién extrajo, revisó, publicó y retiró, y cuándo |
| `agreement_categories` / `agreement_salary_items` / `agreement_conditions` | Contenido de cada versión: categorías (código, nombre, grupo, nivel); importes por categoría (o para todas) y concepto, con unidad (`hora`, `dia`, `mes`, `anio`, `porcentaje`), salarial o no y fuente; jornada anual, vacaciones, pagas y `extra` (jsonb) para lo demás |

Los valores de ámbito, tipo, unidad, concepto y estado van en español porque son el formato de carga.

**Estados**: `borrador` → `en_revision` → `publicada` → `retirada` (y `en_revision` → `borrador` para devolverla). Lo
garantiza un trigger (`TN409`/`TN422`):

- **Revisión a cuatro ojos**: no se publica sin `reviewed_by`, ni lo revisa quien la extrajo (`extracted_by`); la
  revisión y la publicación son dos pasos, y nadie marca la revisión en nombre de otro.
- **Lo publicado no cambia**: una versión publicada solo pasa a retirada (con motivo); sus categorías, importes y
  condiciones y la publicación de la que sale quedan fijos, y no se borra. Para corregirla se carga otra versión.
- Cambiar el contenido de una versión en revisión quita la revisión hecha.
- Borrar lo publicado solo es posible como `postgres` con `set local tramitnow.purge_agreements = 'on'`
  (mantenimiento y tests), nunca desde la API.

**Lectura**: cualquier autenticado ve las versiones publicadas y retiradas (sus documentos pueden haberlas usado), su
contenido, su publicación y el convenio. Escritura: solo el equipo de contenidos (RLS).

**Convenio de la ETT**: `collective_agreements.global_agreement_id` → `agreements` (uno por ETT). Solo se enlaza un
convenio con algo publicado (`TN422`). Si está vacío, el convenio es propio de la ETT (p. ej. de empresa). Las tablas
de seguimiento por ETT de la propuesta (`tenant_agreement_settings`, `tenant_agreement_versions`,
`tenant_salary_overrides`) y `professional_categories.agreement_category_id` llegarán con los presupuestos (fase 4),
que es lo primero que las usa.

#### Cargar convenios

```bash
PSQL="docker exec -i tramitnow-db-local psql -U postgres -d postgres" sh db/scripts/cargar-convenios.sh
```

Carga `db/data/convenios/*.json` (o los ficheros que se le pasen) con `private.load_agreement_file()`, cada fichero en
su transacción: si tiene un error, no se carga nada de él (mensaje con el REGCON y el dato) y se sigue con el resto.
**Idempotente**: el convenio se busca por REGCON, cada publicación por su número y cada versión por (publicación,
efectos desde); lo que no ha cambiado no se toca; una versión en borrador o revisión que ha cambiado se rehace y vuelve a
`en_revision` sin revisión; lo publicado nunca se modifica (sale un `AVISO`: hay que cargarlo como versión nueva). Cada
versión cargada queda **en revisión**. `EXTRAIDO_POR=email` (opcional) indica quién del equipo preparó los ficheros:
esa persona no podrá revisarlos. Sin él, la extracción queda como automática y la revisa cualquiera del equipo.

En el NAS, igual que `migrate.sh` (con `db/data/convenios/` copiado):
`sudo env PSQL="docker exec -i supabase-db psql -U postgres -d postgres" sh db/scripts/cargar-convenios.sh`.

Formato de `db/data/convenios/<regcon>.json` (fichero de ejemplo inventado: `tests/convenios/ejemplo.json`):

```json
{
  "agreement": { "regcon": "14 dígitos", "name": "...", "scope": "estatal|autonomico|provincial|empresa",
                 "territory": null, "cnae": ["78"], "validFrom": "AAAA-MM-DD", "validTo": null },
  "publications": [ { "id": "p1", "bulletin": "BOE", "date": "AAAA-MM-DD", "number": "BOE-A-AAAA-NNNNN",
                      "url": "https://www.boe.es/...", "type": "texto_inicial" } ],
  "versions": [ {
    "publication": "p1", "effectiveFrom": "AAAA-MM-DD", "effectiveTo": null, "provisional": false,
    "categories": [ { "code": "G1-N1", "name": "...", "group": "...", "level": "..." } ],
    "salaryItems": [ { "category": "G1-N1", "concept": "salario_base", "label": "...", "amount": 1234.56,
                       "unit": "mes", "salarial": true, "source": "tabla y página" } ],
    "conditions": { "annualHours": 1752, "vacationDays": 30, "vacationDaysType": "naturales", "extraPayments": 2, "notes": "..." }
  } ],
  "pendingReview": [ "lo que el extractor no tiene seguro" ]
}
```

Precisiones sobre el formato (no lo cambian):

- `territory`: código INE de **comunidad** si es autonómico y de **provincia** si es provincial o de empresa (los dos
  son de 2 cifras: lo decide `scope`). Estatal, sin territorio. Autonómico y provincial lo exigen.
- `cnae`: letra de sección o 2 a 4 cifras (sin punto: `"7820"`).
- `salaryItems[].category`: `null` o ausente = vale para todas las categorías; si se indica, tiene que estar en
  `categories` de la misma versión. `concept`, en minúsculas y con guiones bajos; `amount`, número; `salarial`, por
  defecto `true`.
- `publications[].number` es la clave de la publicación (única por convenio); `id` solo enlaza las versiones del mismo
  fichero.
- Lo que venga en `conditions` además de los campos de arriba se guarda en `extra` (p. ej. antigüedad).
- `pendingReview` se copia a cada versión cargada del fichero.

### Mi ETT

| Qué | Cómo |
|---|---|
| Datos legales de cada sociedad | `company_legal_profiles` (1:1): nombre comercial, forma jurídica, CNAE (4 cifras), convenio del personal de estructura, autorización de ETT (número, fecha, ámbito estatal o autonómico con su comunidad), registro mercantil (registro, tomo, folio, hoja, inscripción), representante legal (nombre, tipo y número de documento, cargo), mutua, servicio de prevención, autorización RED, garantía financiera (tipo, entidad, importe, vencimiento) y del certificado digital **solo metadatos** (titular, emisor, caducidad): nunca el fichero ni la contraseña |
| Facturación de cada sociedad | `company_billing_settings` (1:1): IBAN, BIC, forma de pago (tabla maestra), condiciones, IVA (21 por defecto), retención, moneda, email de facturación, dirección de facturación (NULL = la fiscal) y si se factura centralizado o por sucursal |
| Series | `number_series` admite `credit_note` (rectificativas, prefijo REC). `tenant.manage` crea series y cambia prefijo, cifras y por dónde siguen (para venir de otro programa), **nunca hacia atrás** (`TN409`) ni de clase, ámbito o año |
| CCC | `contribution_accounts`: sociedad, sucursal opcional, código de 11 cifras con control `(provincia+número) mod 97` (`private.valid_ccc`), provincia generada de las 2 primeras cifras, tipo `mission`/`structure` |
| Servicios que factura | `billable_services`: código, nombre, cobro (`percentage`, `per_person`, `per_unit`, `fixed`), valor por defecto y unidad. Cada ETT (existentes y nuevas) empieza con selección, formación PRL, reconocimiento médico, gestión de nóminas y desplazamientos, a 0 |
| Ajustes de presupuestos | `tenants.quote_min_margin_percent` (NULL = sin mínimo) y `quote_no_response_days` (15). Se usan en la fase 4 |
| Usuarios | `memberships.department`, `invited_at`, `invited_by`. La API invita con la service_role de Auth; lee email, último acceso e invitación pendiente con `private.membership_auth_info()` y busca cuentas por email con `private.find_auth_user()` (las dos solo con `users.manage`). Al revocar, `private.invited_user_removable()` dice si se puede borrar también la cuenta |

Leer: cualquier miembro de la ETT (el representante, la autorización y el IBAN salen en CPD, contratos y facturas).
Escribir: `tenant.manage`.

## Fase 4: presupuestos

Migración `20261117000100_quotes.sql`; pantalla `apps/web/src/views/PresupuestosView.jsx` y notas
`design/cambios/*presupuestos*`. Tests: `db/tests/18_presupuestos.sql` y `apps/api/test/presupuestos.test.ts`.

| Tabla | Qué |
|---|---|
| `quotes` | El presupuesto: número de la serie `quote` de su sociedad (`private.next_number`, sin huecos), sociedad, sucursal propietaria, cliente (NULL al duplicar «para otro cliente»), de qué presupuesto se creó y, si pasó a obsoleto, motivo, quién y cuándo. No se borra nunca |
| `quote_versions` | Cada versión es una **copia completa**: cabecera (título, contacto, comercial, fechas, modalidad, forma de pago, IVA, garantía, notas, condiciones), margen objetivo (`percent` o `per_hour`), tipos de la Seguridad Social (`ss_rates`), costes internos (`cost_concepts`) y extras por defecto (`default_extras`) en jsonb, estado, aprobación del margen y quién/cuándo de cada paso. La actual es la de número más alto |
| `quote_positions` | Puestos: convenio de la ETT, versión publicada del convenio global y categoría, periodo de esa versión y **mínimo por hora del convenio** (los dos los pone la base de datos), valores que dio el convenio (`agreement_values`) y campos cambiados a mano (`manual_fields`), parámetros retributivos, personas, horas, tarifa, margen propio, costes internos aplicados (`costs`) y conceptos extra (`extras`) |

Estados de la versión: `draft` → `in_preparation` ↔ `draft` → `sent` → `pending_signature` → `accepted` / `rejected`
(con motivo, tabla maestra `quote_rejection_reason`); `superseded` al crear la versión siguiente; `obsolete` cuando el
presupuesto pasa a obsoleto (y se crea otro con número nuevo). Solo `draft` e `in_preparation` se editan.

Reglas en la base de datos:

- **Salario por debajo del convenio de la empresa usuaria**: bloquea siempre (art. 11 de la Ley 14/1994), sin
  aprobación posible. `private.agreement_minimum_salary_hour()` calcula el mínimo desde las tablas publicadas (base
  anual, o mensual × (12 + pagas), o diaria × 365, más el plus de convenio × 12, entre las horas anuales) y el trigger
  compara `(base + plus × 12) / horas` del puesto. Error `TNSAL` (la API: 422 `salario_bajo_convenio`). El mínimo
  se calcula siempre en la base de datos: no se puede falsear desde fuera.
- **Margen por debajo del mínimo** (`tenants.quote_min_margin_percent`): al enviar, si algún puesto queda por debajo
  y la versión no está aprobada, error `TNAPR` (409 `requiere_aprobacion`). Aprobar exige `quotes.approve_margin`;
  quién pidió y quién decidió, y cuándo, los pone la base de datos. Cambiar el presupuesto (no el cálculo) anula la
  aprobación. El margen de cada puesto lo calcula la API (`calc_margin_percent`): la base de datos solo lo compara.
- Lo enviado no cambia (`TN409`); solo la versión actual cambia de estado; los puestos de una versión cerrada no se
  tocan.
- Documentos: `documents.entity_type` admite `quote` (escribe quien puede editar el presupuesto). Cada ETT tiene de
  serie los tipos «Propuesta de presupuesto», «Presupuesto firmado por el cliente», «Condiciones o pliego del cliente» y
  «Correo del cliente», y los motivos de rechazo de la pantalla (`private.seed_quote_catalogs`).
- Historial: `quote`, `quote_version` (con resúmenes propios: «Envío al cliente (v1)», «Aprobación del margen»...)
  y `quote_position`. Las columnas `calc_*` (el cálculo guardado) no cuentan como cambios.

Permisos nuevos: `quotes.manage` (admin, director de zona, comercial), `quotes.approve_margin` (admin, director de
zona) y `quotes.view_costs` (admin, director de zona; `20261117000200_quotes_view_costs.sql`): ver y cambiar costes
internos y margen («Ver como comercial» de la pantalla). Sin él, la API no los devuelve ni deja cambiarlos. Leer: `module.comercial`, `quotes.manage` o `quotes.approve_margin`, en las sucursales a las que se tiene acceso.

**Seguimiento de convenios por ETT (`tenant_agreement_*`): no se ha hecho.** Presupuestos no lo necesita: el puesto
apunta directamente a la versión publicada del convenio global a través de `collective_agreements.global_agreement_id`
y guarda la versión y el periodo usados. Queda para más adelante: avisar a la ETT de una versión nueva de un convenio
que usa, qué presupuestos enviados o aceptados quedan con tablas antiguas, y enlazar `professional_categories` con las
categorías del convenio global (`agreement_category_id`), que encaja mejor con Peticiones y Contratos.

## Fase 5: peticiones

Migración `20261117000300_requests.sql`; pantalla `apps/web/src/views/PeticionesView.jsx` y notas
`design/cambios/2026-10-28-peticiones-*`, `2026-11-09-peticiones-buscador-y-documentos.md` y
`2026-11-09-reunion-cpd-presupuestos.md`. Tests: `db/tests/19_peticiones.sql`, `apps/api/test/peticiones.test.ts` y
`apps/api/test/peticiones-horario.test.ts`.

| Tabla | Qué |
|---|---|
| `requests` | Una petición = **un puesto de una versión aceptada** de un presupuesto no obsoleto (un puesto puede tener varias: una por turno o por fechas). Número de la serie `request` de su sociedad. Al crearla, **la base de datos copia** del puesto nombre, descripción, convenio, versión del convenio global y su periodo, categoría (con su código), nivel, mínimo del convenio, salario por hora, tarifa, conceptos extra (salario y tarifa) y el cálculo completo (`calc_result`); no cambian nunca. Además: plazas (`positions_count`), fechas, turno, jornada, horario semanal (jsonb) y horas por semana, centro y firmante del cliente, responsable, sucursal, referencia de pedido, tareas, cualificación, riesgos, EPIs, carnés, supuesto de utilización y justificación, estado (con motivo de cancelación) y el CPD previo |
| `request_slots` | Una fila por plaza, que mantiene la base de datos con `positions_count` (subir añade, bajar quita las últimas por cubrir). Hoy todas `open`; `reserved`, `covered`, `started` y `left` llegan con candidatos (fase 6) y contratos y altas (fase 7) |

Estados: `new`, `publishing`, `selecting`, `covered`, `in_progress`, `closed` y `cancelled`. Se cambian a mano y
libremente, como en el pipeline (la nota de diseño deja por confirmar si «Cubierta» y «En curso» serán automáticos).
Cancelar exige motivo; al salir de cancelada se borra. Cerrada o cancelada solo admite cambiar el estado (reabrir).
Las peticiones no se borran.

Reglas en la base de datos:

- Solo de un puesto de una versión aceptada de un presupuesto no obsoleto (`TN409`). Origen y copia no cambian (`TN422`).
- **CPD previo**: `pre_cpd_status` (`pending`, `generated`, `sent`, `reviewed`; enviado y revisado se marcan a mano,
  sin firma electrónica). Si después de generarlo cambia algo de lo que sale en él (centro, fechas, plazas, horario,
  tareas, riesgos, supuesto...), `pre_cpd_outdated` pasa a true. Las comprobaciones para generarlo están en la API.
- **Art. 11 de la Ley 14/1994 con tablas nuevas**: la petición conserva el salario del presupuesto, pero
  `private.request_current_agreement()` da el mínimo de la versión publicada vigente para la misma categoría (por
  código). Si queda por encima del salario copiado, la API lo avisa y no deja generar el CPD.
- Quien tiene `requests.manage` ve los presupuestos **aceptados** de su sucursal (para elegir el puesto), aunque no
  tenga `module.comercial` (`private.quote_visible_for_requests`, en la RLS de `quotes`).
- Documentos: `documents.entity_type` admite `request`. Tipos de serie nuevos (`private.seed_request_catalogs`): «CPD
  previo (condiciones de la puesta a disposición)», «Pedido u orden de compra del cliente», «Evaluación de riesgos del
  cliente» y «Otro documento».
- Historial: `request`, con resúmenes propios («Pasa a en selección», «Cancelada: motivo», «CPD previo generado»,
  «CPD previo enviado al cliente», «CPD previo revisado por el cliente»).

Permiso nuevo: `requests.manage` (admin, director de zona, comercial, selección y laboral). Leer: `requests.manage`,
`module.comercial`, `module.seleccion` o `module.laboral`, en sus sucursales. Costes y margen de la copia del cálculo:
`quotes.view_costs` (la API los oculta sin él).

**Art. 8 de la Ley 14/1994 (huelga, trabajos especialmente peligrosos, despidos previos): no implementado, pendiente de
decidir.** Bloquea las fases 7 a 9. La columna `requests.legal_checks` (jsonb, siempre null) queda reservada para guardar
el resultado de esos controles; si hacen falta datos del cliente (despidos en los 12 meses anteriores, huelga en
curso) o del puesto (actividades del RD 216/1999, anexo), irán en `clients` y en la petición.

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
- Supabase Storage `supabase/storage-api:v1.81.0` (contenedor `tramitnow-storage-local`, `127.0.0.1:54325`; el 5000
  lo usa AirPlay en macOS), con los ficheros en un volumen. Al arrancar crea su esquema `storage`, que la migración de
  documentos necesita (crea el bucket). Las claves `ANON_KEY` y `SERVICE_ROLE_KEY` locales están en `local/dev.env`.

No uses `docker compose up` a mano con el compose cambiado sobre una base que quieras conservar: puede recrear el
contenedor de Postgres con un volumen nuevo (vacío). Si pasa, `reset.sh` lo deja todo como al principio.

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

7. Convenios globales (desde la fase 3): con `db/data/convenios/` copiado al NAS (como en el paso 2, añadiendo `data`),
   carga los ficheros con `cargar-convenios.sh` (ver "Cargar convenios"). Para dar de alta a alguien del equipo de
   contenidos (con su usuario ya creado en Auth):

   ```bash
   sudo docker exec -it supabase-db psql -U postgres -d postgres -c "insert into public.platform_content_editors (user_id, note) select id, 'equipo de contenidos' from auth.users where email = 'CORREO'"
   ```

8. Presupuestos (desde la fase 4): solo `migrate.sh`; la migración da a cada ETT los permisos, los motivos de rechazo y
   los tipos de documento de serie. Para el PDF de la propuesta, la API necesita Storage (ya configurado en la fase 1).

9. Peticiones (desde la fase 5): solo `migrate.sh`; la migración da a cada ETT el permiso `requests.manage` y los tipos
   de documento del servicio. Para el CPD previo, cada sociedad necesita en Mi ETT el número de autorización y el
   representante legal con su documento.

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

- Fase 4: tipos de la Seguridad Social y AT/EP por CNAE de `apps/api/src/calc/quote.ts` marcados [verificar]; costes
  internos y coeficientes de los extras por defecto, [por confirmar]. Si el margen mínimo es por puesto o sobre el total
  (hoy por puesto, como la pantalla). Puestos «Otro / personalizado» sin tabla de convenio: no se puede
  comprobar el art. 11 (hoy se permite enviarlos; ¿bloquear el envío?). Recordatorio al cliente y tarea de
  aprobación en Inicio (fase 12).

- Fase 5: lista de supuestos de utilización y sus duraciones orientativas, [verificar] con quien lleve lo laboral.
  Controles del art. 8 de la Ley 14/1994 (pendiente de decidir; bloquea las fases 7 a 9). Si «Cubierta» y «En curso»
  pasan solos (al cubrir todas las plazas y al llegar el inicio). Firma electrónica y envío real del CPD (proveedor
  pendiente). Portales de empleo y portales propios de la ETT. Candidatos, CPD por persona, contratos y altas (fases 6 y 7).

- Fase 3: el margen mínimo, ¿solo en %, o también en €/h? (hoy %). Plazo máximo entre el boletín y la publicación en
  TramitNOW, y quién del equipo de contenidos extrae y quién revisa. Avisos de vencimiento de la garantía y del
  certificado (hoy solo los devuelve la API al leer los datos legales). Historial de Mi ETT (datos legales, facturación,
  usuarios) en `activity_log`.

- Resto de tablas del modelo (ofertas, peticiones, candidatos, trabajadores, comunicaciones, importaciones),
  siguiendo las reglas de arriba, con su historial (`private.log_activity`) y sus documentos (`documents`).
- Datos personales (NIF, Nº SS, IBAN, documentos): cifrado a nivel de columna y auditoría de accesos.
- Más catálogos oficiales globales: ocupaciones CNO-11 (y el código de 8 dígitos del SEPE para Contrat@),
  grupos y clases de la CNAE (hoy solo secciones y divisiones, en `cnae_activities`), regímenes de la Seguridad Social, tipos de documento de identidad (`client_centers.cnae_code` y
  `ss_regime_code` pasarán a FK). `professional_categories.cno_code`
  pasará a FK cuando exista el de ocupaciones.
- Catálogo global de convenios, con tablas salariales por versión y cambios retroactivos: propuesta en
  `docs/convenios-globales.md`. Cambia `collective_agreements` (nuevo `global_agreement_id`), así que
  conviene decidirlo antes de cargar datos reales.
- Sucursal activa para los roles `branch` (`seleccion`, `comercial`): hoy el JWT lleva todas sus sucursales.
- Alta de usuarios e invitaciones desde la API (service_role), y portal de cliente.
