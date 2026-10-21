# Base de datos

PostgreSQL (vía Supabase). El esquema se gestionará con migraciones en `db/migrations/` (pendiente).

## Punto de partida

`reference/backend_model_ett_tramitnow.sql` viene del proyecto Firebase anterior y se generó a partir de
`docs/modelo-backend.md` y `docs/inventario-pantallas.md`. Tiene 39 tablas, `tenant_id` en todas,
borrado lógico (`deleted_at`), triggers de `updated_at` y RLS por tenant.

## Cambios necesarios antes de convertirlo en migraciones

1. **Usuarios.** Hoy `users` pertenece a un tenant (`tenant_id`, `firebase_uid`, `password_hash`, email único
   por tenant). Con Supabase Auth, la identidad vive en `auth.users` (global). Pasar a:
   - `profiles` (1:1 con `auth.users`: nombre, teléfono, estado).
   - `memberships` (`user_id`, `tenant_id`, rol). Un usuario puede pertenecer a varias ETT.
   - `user_contexts` se mantiene para el alcance por empresa/sucursal.
2. **Contexto en RLS.** Las políticas leen `current_setting('app.tenant_id')` / `app.rol`, que fija el backend.
   Si la web accede directamente a Supabase, deben leer los claims del JWT (`auth.jwt()`).
   El rol `superadmin` no puede depender de un ajuste que el propio cliente pueda fijar, y
   `set_backend_tenant_context` no debe quedar expuesta como RPC.
3. **Claves foráneas compuestas** (`tenant_id`, `id`), para que sea imposible referenciar filas de otra ETT.
4. **Datos personales** (NIF, Nº SS, IBAN, documentos): decidir cifrado a nivel de columna y auditoría de accesos.

## Roles (de `tipos_de_usuarios.drawio`, vía el proyecto anterior)

| Rol | Módulos | Alcance |
|---|---|---|
| `superadmin` | Plataforma | Todas las ETT |
| `admin` | Administración ETT, Laboral, Selección, Comercial | Toda la ETT |
| `laboral` | Laboral | Toda la ETT |
| `director_zona` | Laboral, Selección, Comercial | Sus sucursales |
| `seleccion` | Selección | Una sucursal activa |
| `comercial` | Comercial | Una sucursal activa |

A esto se añadirán los usuarios del portal de cliente (`client_portal_users`) y, si se hace, del portal de trabajador.

En el JWT van solo el tenant activo, el rol y las sucursales. Los permisos detallados se resuelven
en el servidor a partir de tablas, para poder revocarlos al instante.
