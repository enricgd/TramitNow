# tramitNow

Proyecto Firebase con frontend Next.js, Cloud Functions, Firebase
Authentication, Data Connect y PostgreSQL en Cloud SQL.

## Infraestructura actual

| Recurso | Valor |
| --- | --- |
| Proyecto Firebase / Google Cloud | `tramitnow-development` |
| Servicio Data Connect | `tramitnow-sql-service` |
| Instancia Cloud SQL | `tramitnow-sql-instance` |
| Base de datos PostgreSQL | `tramitnow-sql-database` |
| Region Cloud SQL / Data Connect | `us-east4` |
| Region Cloud Functions | `us-central1` |
| Hosting | `https://tramitnow-development.web.app` |

Cloud Functions y Cloud SQL estan actualmente en regiones diferentes. Esto
puede aumentar latencia y coste de red. Antes de produccion conviene evaluar su
alineacion; mover una instancia o cambiar la region de Functions requiere una
migracion planificada.

## Estructura

- `web/`: frontend Next.js y Firebase Authentication.
- `functions/`: API HTTP desplegada como Cloud Functions.
- `dataconnect/`: esquema y conector de Firebase Data Connect.
- `sql/`: modelo PostgreSQL de referencia, triggers y RLS complementario.
- `api/`: cliente generado de Data Connect.

## Requisitos

- Node.js 24 para `functions`.
- npm.
- Firebase CLI autenticada con acceso al proyecto.
- Google Cloud CLI para administrar Cloud SQL desde terminal (opcional).
- Cloud SQL Auth Proxy para conexiones locales seguras (recomendado).

```powershell
npm install -g firebase-tools
firebase login
firebase use tramitnow-development
```

## Variables de entorno

Crear los archivos locales a partir de los ejemplos:

```powershell
Copy-Item web/.env.example web/.env.local
Copy-Item functions/.env.example functions/.env
```

Despues, completar los valores reales. Nunca subir `web/.env.local`,
`functions/.env`, `.secret.local`, claves privadas ni archivos de cuentas de
servicio.

### Frontend

`web/.env.local` contiene:

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Identificador de la aplicacion web Firebase. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Dominio de Firebase Authentication. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Proyecto utilizado por el SDK web. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Identificador de la aplicacion web. |

Las variables `NEXT_PUBLIC_*` se incluyen en el JavaScript del navegador. No
deben contener contrasenas ni secretos administrativos.

### Cloud Functions

`functions/.env` contiene:

| Variable | Uso |
| --- | --- |
| `DB_USER` | Usuario PostgreSQL utilizado por Functions. |
| `DB_PASSWORD` | Contrasena PostgreSQL. Es un secreto. |
| `DB_NAME` | Base de datos de Cloud SQL. |
| `INSTANCE_CONNECTION_NAME` | Nombre `proyecto:region:instancia`. |
| `WEB_ORIGIN` | Origen exacto permitido por CORS. |
| `SUPERADMIN_UID` | UID autorizado para el bootstrap de superadmin. |
| `SUPERADMIN_EMAIL` | Correo autorizado para el bootstrap de superadmin. |

Debe configurarse `SUPERADMIN_UID` o `SUPERADMIN_EMAIL`. Si se configuran ambos,
el usuario autenticado debe coincidir con ambos. `GRAPHQL_URL` no es utilizado
por el codigo actual y por eso no aparece en el ejemplo.

Firebase admite archivos `.env` para Functions, pero recomienda Secret Manager
para credenciales. La migracion de `DB_PASSWORD` a Secret Manager requiere
declarar y vincular el secreto en las opciones de cada Function antes del
despliegue; no basta con crear el secreto en la consola.

## Instalacion local

```powershell
cd web
npm ci
npm run dev
```

En otra terminal:

```powershell
cd functions
npm ci
```

El codigo actual de Functions conecta siempre mediante el socket Unix
`/cloudsql/INSTANCE_CONNECTION_NAME`, pensado para el entorno desplegado. En
Windows no debe asumirse que los endpoints con base de datos funcionaran en el
emulador. Para desarrollo local completo hay que adaptar primero el `Pool` de
`functions/index.js` para admitir `DB_HOST=127.0.0.1` y `DB_PORT=5432`, y usarlo
con Cloud SQL Auth Proxy. No debe sustituirse el socket de produccion por una IP
publica fija.

Para CORS local, `functions/.env.local` debe contener
`WEB_ORIGIN=http://localhost:3000`. Este archivo tambien esta ignorado.

## Acceso para el equipo

El acceso al repositorio de GitHub no concede acceso a Firebase ni Google
Cloud. Cada companero debe utilizar su propia cuenta y recibir solo los permisos
necesarios desde **Firebase Console > Project settings > Users and permissions**
o desde **Google Cloud Console > IAM**.

- Para usar Cloud SQL Auth Proxy: rol `Cloud SQL Client`.
- Para consultar configuracion sin modificarla: permisos de solo lectura.
- Para administrar usuarios, redes o copias: un rol de Cloud SQL administrativo
  concedido solo a quienes realicen esas tareas.
- Para desplegar: permisos de Firebase y Google Cloud ajustados al entorno.

No distribuir archivos JSON de cuentas de servicio. Para trabajo local se
prefiere autenticacion individual con `gcloud` y `firebase login`.

## Cambiar la contrasena de PostgreSQL

La rotacion debe coordinarse con Functions y con los clientes como DBeaver. Si
se cambia la contrasena en Cloud SQL pero no en Functions, la API dejara de
conectar hasta que se vuelva a desplegar.

### Desde Google Cloud Console

1. Abrir Google Cloud Console y seleccionar `tramitnow-development`.
2. Ir a **Cloud SQL > tramitnow-sql-instance > Users**.
3. En el usuario correspondiente, abrir el menu y seleccionar **Change
   password**.
4. Introducir una contrasena fuerte y guardarla en el gestor de secretos de la
   empresa.
5. Actualizar `DB_PASSWORD` en `functions/.env` sin subir el archivo a Git.
6. Desplegar Functions y probar inicio de sesion y una operacion de lectura.
7. Actualizar DBeaver u otros clientes que usen esa cuenta.

### Desde Google Cloud CLI

El modo interactivo evita guardar la contrasena en el historial:

```powershell
gcloud auth login
gcloud config set project tramitnow-development
gcloud sql users set-password postgres `
  --instance=tramitnow-sql-instance `
  --prompt-for-password
```

No escribir la contrasena con `--password=...` ni dentro de una consulta SQL.

### Secuencia recomendada

1. Confirmar que existe una copia de seguridad reciente.
2. Avisar de una posible interrupcion corta.
3. Cambiar la contrasena en Cloud SQL.
4. Actualizar solo los almacenes privados y archivos locales que la usan.
5. Ejecutar `firebase deploy --only functions`.
6. Probar las funciones y revisar logs.
7. Revocar la contrasena anterior y eliminar copias inseguras.

Para una rotacion sin interrupcion, crear un usuario de aplicacion nuevo con
privilegios minimos, desplegar Functions con sus credenciales, verificarlo y
despues retirar el usuario anterior. No se recomienda compartir la cuenta
`postgres` entre personas o aplicaciones.

## Conexion local recomendada: Cloud SQL Auth Proxy

El proxy es preferible a exponer PostgreSQL directamente. Cifra la conexion y
usa IAM para autorizar el acceso. El usuario o cuenta de servicio necesita el
rol `Cloud SQL Client`.

1. Instalar Google Cloud CLI y Cloud SQL Auth Proxy.
2. Autenticarse con una cuenta autorizada:

```powershell
gcloud auth application-default login
```

3. Iniciar el proxy en una terminal:

```powershell
.\cloud-sql-proxy.exe --port 5432 `
  tramitnow-development:us-east4:tramitnow-sql-instance
```

4. Configurar DBeaver:

| Campo | Valor |
| --- | --- |
| Host | `127.0.0.1` |
| Port | `5432` |
| Database | `tramitnow-sql-database` |
| Username | Usuario PostgreSQL asignado |
| Password | Contrasena almacenada de forma segura |

El proxy debe escuchar solamente en `127.0.0.1`, nunca en `0.0.0.0`.

## Conexion directa mediante IP publica

Usar esta opcion solo cuando el proxy no sea viable. Cloud Functions no la
necesita: el backend se conecta mediante `/cloudsql/INSTANCE_CONNECTION_NAME`.

### Autorizar una IP desde la consola

1. Obtener la IPv4 publica del equipo que se conectara.
2. Ir a **Cloud SQL > tramitnow-sql-instance > Connections > Networking**.
3. Activar **Public IP** si todavia no esta activa.
4. Pulsar **Add network**.
5. Anadir un nombre identificable y la IP con mascara `/32`, por ejemplo
   `203.0.113.10/32`.
6. Guardar y esperar a que termine la actualizacion de la instancia.
7. Configurar DBeaver con la IP publica, puerto `5432`, base de datos, usuario,
   contrasena y SSL.

Nunca autorizar `0.0.0.0/0`. Si cambia la IP publica del companero, sustituir la
entrada anterior. Eliminar accesos temporales al terminar el trabajo.

### Administrar redes con Google Cloud CLI

Primero revisar las redes existentes:

```powershell
gcloud sql instances describe tramitnow-sql-instance `
  --project=tramitnow-development
```

Para asignar IP publica si no existe:

```powershell
gcloud sql instances patch tramitnow-sql-instance `
  --project=tramitnow-development `
  --assign-ip
```

El parametro `--authorized-networks` reemplaza la lista completa. Al actualizar
deben incluirse tanto las redes que se quieren conservar como la nueva IP:

```powershell
gcloud sql instances patch tramitnow-sql-instance `
  --project=tramitnow-development `
  --authorized-networks="IP_EXISTENTE_1/32,IP_NUEVA/32"
```

Para borrar todas las redes autorizadas:

```powershell
gcloud sql instances patch tramitnow-sql-instance `
  --project=tramitnow-development `
  --clear-authorized-networks
```

## Despliegue

Validar y desplegar primero el esquema, despues Functions y Hosting:

```powershell
firebase dataconnect:compile `
  --service tramitnow-sql-service `
  --location us-east4

firebase deploy --only dataconnect:tramitnow-sql-service:schema
firebase deploy --only functions,hosting
```

El esquema usa validacion `COMPATIBLE`. Revisar siempre el plan SQL antes de
aceptar cambios destructivos.

## Lista de seguridad para la entrega

- Mantener el repositorio privado y dar acceso mediante cuentas individuales.
- No compartir la contrasena de `postgres`; usar usuarios individuales o un
  usuario de aplicacion con privilegios minimos.
- Guardar secretos en el gestor corporativo y planificar la migracion de
  `DB_PASSWORD` a Secret Manager.
- Preferir Cloud SQL Auth Proxy o IP privada.
- Si se usa IP publica, autorizar IPs `/32`, exigir SSL y evitar `0.0.0.0/0`.
- Revisar y eliminar periodicamente redes autorizadas que ya no se utilicen.
- Activar copias de seguridad, recuperacion a un punto en el tiempo y politicas
  de contrasena antes de produccion.
- Conceder `Cloud SQL Client` solo a identidades que necesiten conectarse.
- Rotar cualquier credencial que haya sido enviada por chat o correo.

## Documentacion oficial

- [Entorno y secretos de Cloud Functions](https://firebase.google.com/docs/functions/config-env)
- [Usuarios y contrasenas de Cloud SQL para PostgreSQL](https://cloud.google.com/sql/docs/postgres/create-manage-users)
- [Configurar IP publica y redes autorizadas](https://cloud.google.com/sql/docs/postgres/configure-ip)
- [Conectar con Cloud SQL Auth Proxy](https://cloud.google.com/sql/docs/postgres/connect-auth-proxy)
- [Buenas practicas de Cloud SQL](https://cloud.google.com/sql/docs/postgres/best-practices)
