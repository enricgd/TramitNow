# Despliegue del modelo ETT

El esquema que Firebase SQL Connect migra a Cloud SQL es
`dataconnect/schema/schema.gql`. Se ha contrastado con estos tres documentos:

- `Modelo_backend_tablas_ETT_TramitNOW.docx`
- `Inventario_pantallas_ETT_TramitNOW (1).docx`
- `tipos_de_usuarios.drawio (1).pdf`

El resultado contiene 39 tablas. Los campos adicionales detectados solo en el
inventario de pantallas se han integrado en empresa, facturacion, centros,
calculo de ofertas y lineas de precio. El PDF define los seis roles y su
alcance de empresa/sucursal, implementados en Functions mediante `roles`,
`user_roles` y `user_contexts`.

## Validacion local

```powershell
firebase dataconnect:compile `
  --service tramitnow-sql-service `
  --location us-east4
```

## Despliegue recomendado

Para migrar unicamente el esquema SQL Connect, sin desplegar Functions ni
Hosting:

```powershell
firebase deploy --only dataconnect:tramitnow-sql-service:schema
```

Para desplegar tambien el conector `example`:

```powershell
firebase deploy --only dataconnect:tramitnow-sql-service
```

Revisar el plan SQL que muestra la CLI antes de aceptarlo y no usar `--force`
en el primer despliegue.

`schemaValidation` esta en `COMPATIBLE`: el despliegue ajustara Cloud SQL a las 39
tablas de `schema.gql` y eliminara tablas antiguas que no figuren en el modelo,
incluidas las tablas de demostracion de pedidos. Esta eliminacion es deliberada
y destructiva para los datos que existan en esas tablas antiguas.

Las Cloud Functions ya usan `tenants`, `companies`, `branches`, `users`,
`roles`, `user_roles` y `user_contexts`. Para minimizar el intervalo entre
esquema y codigo, desplegar primero el esquema y despues Functions/Hosting:

```powershell
firebase deploy --only dataconnect:tramitnow-sql-service:schema
firebase deploy --only functions,hosting
```

Un `firebase deploy` sin `--only` desplegara las tres superficies configuradas
(Data Connect, Functions y Hosting), no solamente las tablas.

Antes de usar `setupSuperadmin`, definir `SUPERADMIN_UID` o
`SUPERADMIN_EMAIL` en la configuracion de entorno de Functions. El endpoint no
permite el autoascenso del primer usuario si no existe esa lista explicita.

## SQL complementario

`sql/backend_model_ett_tramitnow.sql` documenta constraints `CHECK`, triggers
de `updated_at` y RLS por tenant que el lenguaje de esquema de SQL Connect no
representa. `firebase deploy` no ejecuta ese archivo. Las operaciones de Data
Connect deben aplicar autenticacion y filtro por `tenantId`; el conector de
ejemplo permanece con `@auth(level: NO_ACCESS)`.
