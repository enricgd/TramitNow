# Stack de demo en el NAS (UGREEN DXP2800)

Supabase autoalojado (versión fijada en `setup.sh`) + Caddy con HTTPS + copia de seguridad diaria,
gestionado como **Proyecto de UGOS**. Solo para demos: **nunca datos reales de personas**.

| Servicio | Dónde se ve |
|---|---|
| Demo web | `https://demo.henrik11.duckdns.org` (usuario y contraseña en el `.env`) |
| Web de ejemplo | `https://ejemplo.henrik11.duckdns.org` (sin login, solo datos de ejemplo; ver "Web de ejemplo") |
| API propia (`apps/api`) | `https://api.henrik11.duckdns.org/v1/...` y `/openapi.json` |
| Supabase Auth y Storage | `https://api.henrik11.duckdns.org` (`/auth/v1`, `/storage/v1`; PostgREST no se publica) |
| Supabase Studio | `http://192.168.2.8:8000` (solo red local; usuario `supabase`, contraseña `DASHBOARD_PASSWORD` del `.env`) |
| Postgres | Solo dentro de Docker |
| Backups | `backups/` (un `.dump` diario, 14 días) |

No se incluyen realtime, edge functions ni el pooler, para ahorrar RAM.

## Qué hay en el NAS

```
/volume1/docker/tramitnow/
  proyecto/         ← la carpeta del Proyecto de UGOS
    docker-compose.yaml  generado: Supabase oficial + docker-compose.override.yml en un solo fichero
    .env                 contraseñas y claves (solo existe en el NAS)
  caddy/            Caddyfile, Dockerfile y página provisional de la demo
  api/              código de apps/api para compilar su imagen (lo copia deploy-api.sh)
  backups/
  supabase/         copia de la configuración oficial de Supabase (la usa setup.sh)
  setup.sh, compose.sh, docker-compose.override.yml
```

La referencia es el repo: `docker-compose.override.yml` y `caddy/`. El `proyecto/docker-compose.yaml`
se genera a partir de ellos. Si cambias algo desde UGOS, pásalo también al repo; si no,
se perderá la próxima vez que se regenere.

## Instalación

Desde el Mac, copia esta carpeta al NAS (el `rsync` de UGOS no deja escribir en `/volume1/docker`,
por eso se usa `tar` por SSH):

```bash
ssh Enric@192.168.2.8 mkdir -p /volume1/docker/tramitnow
```

```bash
COPYFILE_DISABLE=1 tar --no-mac-metadata --no-xattrs -C infra/nas -czf - . | ssh Enric@192.168.2.8 tar -xzf - -C /volume1/docker/tramitnow
```

En el NAS:

```bash
ssh Enric@192.168.2.8
cd /volume1/docker/tramitnow
sudo sh setup.sh
```

Edita `proyecto/.env` y rellena `DUCKDNS_TOKEN` y `ACME_EMAIL`.

Después, en UGOS: **Docker → Proyecto → Crear**, con la ruta `/volume1/docker/tramitnow/proyecto`.
UGOS usará el `docker-compose.yaml` que ya hay en la carpeta. El primer arranque tarda unos minutos
(descarga imágenes y compila Caddy).

Sin UGOS, lo mismo por SSH:

```bash
sudo sh compose.sh up -d --build
```

## Router UniFi

- Redirección de puertos: TCP 443 externo → `192.168.2.8:4443` (el 443 del NAS lo usa UGOS). Ningún otro puerto.
- Restringir el origen a España (o a las IPs necesarias) y activar IPS/IDS.
- Reserva una IP fija para el NAS en el DHCP.

## Uso diario

Arrancar, parar y ver logs desde el Proyecto en UGOS, o por SSH:

```bash
sudo sh compose.sh stop
```

```bash
sudo sh compose.sh start
```

## Actualizar

Tras cambiar `docker-compose.override.yml`, `caddy/` o la versión de Supabase en el repo:

```bash
COPYFILE_DISABLE=1 tar --no-mac-metadata --no-xattrs -C infra/nas --exclude ./proyecto --exclude ./backups --exclude ./supabase --exclude ./caddy/site --exclude ./caddy/site-ejemplo -czf - . | ssh Enric@192.168.2.8 tar -xzf - -C /volume1/docker/tramitnow
```

(`caddy/site` y `caddy/site-ejemplo` se excluyen porque ahí están las webs desplegadas; ver "Desplegar la web").

```bash
sudo sh setup.sh --regenerate
```

Y volver a desplegar el Proyecto en UGOS (o `sudo sh compose.sh up -d --build`).
El `.env` no se toca.

Si solo ha cambiado el `Caddyfile`, Docker no recrea Caddy (su configuración es la misma) y sigue
con el fichero anterior. Hay que reiniciarlo:

```bash
sudo docker restart tramitnow-caddy-1
```

## Desplegar la web

`apps/web` se compila en el Mac y se copia a `caddy/site/` del NAS. Caddy la sirve al momento:
no se reinicia nada y Supabase no se toca.

La primera vez, crea `apps/web/.env.production.local` a partir de `apps/web/.env.example` con la URL
de Supabase y la `ANON_KEY` del `proyecto/.env` del NAS (es pública por diseño; el fichero no se sube a git).
El login de la web va contra Supabase Auth en `https://api.henrik11.duckdns.org/auth/v1`.

```bash
sh infra/nas/deploy-web.sh
```

Requisitos: SSH activado en UGOS y Node instalado en el Mac. Para no escribir la contraseña
en cada despliegue, copia tu clave SSH al NAS una vez:

```bash
ssh-copy-id Enric@192.168.2.8
```

La versión desplegada (`versión-commit`) aparece abajo en la barra lateral.

## Web de ejemplo

`https://ejemplo.henrik11.duckdns.org` es la web en modo demo, la misma que ve el diseñador con
`npm run dev`: entra sin login y usa solo datos de ejemplo que viven en el navegador. No lleva la anon key
ni las URL de Supabase o de la API, así que no puede leer ni escribir nada en la base de datos. Por eso
está abierta, sin usuario ni contraseña, y con `X-Robots-Tag: noindex`. Sirve para que producto valide
las pantallas. Lo que se cambie en ella se pierde al recargar.

Por defecto se compila la rama `design` de GitHub, con `development` fusionada encima solo para compilar:

```bash
sh infra/nas/deploy-web-ejemplo.sh
```

```bash
sh infra/nas/deploy-web-ejemplo.sh origin/development
```

El script se niega a publicar si la rama no se fusiona sola o si la compilación contiene claves o URL
del NAS. Se copia a `caddy/site-ejemplo/`; Caddy la sirve al momento.

## API

`apps/api` corre como servicio `api` del proyecto (imagen compilada en el NAS a partir de `api/`). Caddy
publica solo `/v1/*` y `/openapi.json` en `https://api.henrik11.duckdns.org`; `/health` queda dentro de Docker.
Se conecta a Postgres como `tramitnow_api` y verifica los tokens con el `JWT_SECRET` de Supabase (HS256).

### Primera vez

Antes, las migraciones de `db/` aplicadas (`db/README.md`, "Aplicar en el NAS", pasos 1 a 4).

1. Genera una contraseña para `tramitnow_api` en el NAS (solo letras y números, para que valga tal cual en una URL)
   y apúntala en `proyecto/.env`, al final del bloque de TramitNOW:

   ```bash
   ssh Enric@192.168.2.8
   cd /volume1/docker/tramitnow
   openssl rand -hex 32
   ```

   ```bash
   sudo nano proyecto/.env
   ```

   ```
   # Conexión de apps/api (rol tramitnow_api, sin privilegios propios)
   API_DATABASE_URL=postgresql://tramitnow_api:LA_CONTRASEÑA@db:5432/postgres
   ```

   `SUPABASE_JWT_SECRET` no hace falta: el servicio usa el `JWT_SECRET` que ya está en el `.env`.

2. Habilita el login de `tramitnow_api` con esa contraseña (paso 5 de "Aplicar en el NAS" en `db/README.md`;
   `\password` la pide sin que quede en el historial):

   ```bash
   sudo docker exec -it supabase-db psql -U postgres -d postgres -c 'alter role tramitnow_api login'
   ```

   ```bash
   sudo docker exec -it supabase-db psql -U postgres -d postgres -c '\password tramitnow_api'
   ```

3. Desde el Mac, lleva `docker-compose.override.yml` y el `Caddyfile` nuevos al NAS (comando de "Actualizar")
   y, en el NAS, regenera el proyecto:

   ```bash
   sudo sh setup.sh --regenerate
   ```

4. Desde el Mac, copia la API y arráncala (pide la contraseña de sudo del NAS):

   ```bash
   sh infra/nas/deploy-api.sh
   ```

   Hasta que exista `api/` no se puede volver a desplegar el Proyecto en UGOS: el servicio `api` se compila desde ahí.

5. Caddy no relee el `Caddyfile` solo:

   ```bash
   sudo docker restart tramitnow-caddy-1
   ```

6. Comprueba, desde el Mac:

   ```bash
   curl -s https://api.henrik11.duckdns.org/openapi.json | head -c 200
   ```

   ```bash
   curl -s https://api.henrik11.duckdns.org/v1/me
   ```

   La segunda debe responder `401` con `{"error":{"code":"no_autenticado",...}}`. Con un token (ver "Probar con
   Apidog" en `apps/README.md`), `/v1/me` devuelve el usuario y su ETT. Logs: `sudo sh compose.sh logs -f api`.

### Actualizar la API

```bash
sh infra/nas/deploy-api.sh
```

**Documentos (desde noviembre de 2026).** La API firma las URL de Supabase Storage con la `SERVICE_ROLE_KEY` del
`.env` (variables `STORAGE_URL`, `STORAGE_PUBLIC_URL` y `SUPABASE_SERVICE_ROLE_KEY` del servicio `api` en
`docker-compose.override.yml`). La primera vez: aplicar las migraciones (la de documentos crea el bucket privado
`documents`, así que Storage tiene que estar en marcha), llevar el override nuevo al NAS, `sudo sh setup.sh
--regenerate` y volver a desplegar la API. Sin esas variables la API arranca igual, pero las rutas de ficheros
responden `503 servicio_no_disponible`.

**Invitar usuarios (desde la fase 3).** La API da de alta e invita usuarios en Supabase Auth con la misma
`SERVICE_ROLE_KEY` (variables `AUTH_URL`, `INVITE_REDIRECT_URL` y `AUTH_SENDS_INVITES` del servicio `api` en
`docker-compose.override.yml`). Llevar el override nuevo al NAS, `sudo sh setup.sh --regenerate` y volver a desplegar
la API. Mientras no haya SMTP, la respuesta trae el enlace de invitación para enviarlo a mano.
`INVITE_REDIRECT_URL` es la web, acabada en `/`: en el NAS, `https://demo.<dominio>/` (el override lo pone como
`https://demo.${DOMAIN}/`). La API no usa el `action_link` de Auth (apuntaría a `https://api.<dominio>/verify`): monta
el enlace como `<INVITE_REDIRECT_URL>verify?token=<hashed_token>&type=invite`, y la página `/verify` de la web lo
canjea con `verifyOtp`. Por eso no hace falta añadir esa URL a las redirecciones permitidas de Auth.

Si se activan algún día las claves asimétricas de Supabase Auth (`JWT_KEYS`, ES256), la API tendrá que
verificar con el JWKS en vez de con `JWT_SECRET`.

## Pasar a SSD

Las rutas del proyecto son absolutas. Para moverlo: parar, mover toda la carpeta `tramitnow/`
al volumen del SSD, ejecutar allí `sudo sh setup.sh --regenerate` y volver a crear el Proyecto en UGOS.

## Restaurar un backup

```bash
sudo sh compose.sh exec -T db pg_restore -U postgres -d postgres --clean < backups/tramitnow-AAAA-MM-DD.dump
```
