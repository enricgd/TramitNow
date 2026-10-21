# Archivo

Proyectos anteriores, solo como referencia. No se despliegan ni se mantienen.

## firebase-legacy

Primer intento con Next.js + Firebase Auth + Data Connect (Cloud SQL en `us-east4`) + Cloud Functions.

Lo aprovechable:

- `sql/backend_model_ett_tramitnow.sql`: modelo completo (39 tablas, `tenant_id` + RLS). Copiado a `db/reference/`.
- `functions/index.js`: definición de roles y alcance por sucursal (`ROLE_DEFINITIONS`, `canAccessBranch`),
  resumidos en `db/README.md`.

El resto (`api/` en Python es una plantilla de pedidos/productos, `web/` es un login básico) no se reutiliza.

Si el proyecto `tramitnow-development` llegó a tener datos reales, están en EE. UU. (`us-east4`):
conviene borrarlos o migrarlos y cerrar el proyecto.
