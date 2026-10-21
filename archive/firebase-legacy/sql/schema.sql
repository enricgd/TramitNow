-- tramitNow - Esquema backend documental ETT.
-- Fuentes: Modelo_backend_tablas, Inventario_pantallas y tipos_de_usuarios,
-- materializados en:
--   sql/backend_model_ett_tramitnow.sql
--
-- Firebase SQL Connect crea las tablas desde dataconnect/schema/schema.gql.
-- Este wrapper aplica la variante PostgreSQL completa (checks, triggers y RLS)
-- solo cuando se ejecuta expresamente con psql; firebase deploy no lo lee.

\ir backend_model_ett_tramitnow.sql
