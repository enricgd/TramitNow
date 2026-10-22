# Stack de demo en el NAS (UGREEN DXP2800)

Supabase autoalojado (versión fijada en `setup.sh`) + Caddy con HTTPS + copia de seguridad diaria,
gestionado como **Proyecto de UGOS**. Solo para demos: **nunca datos reales de personas**.

| Servicio | Dónde se ve |
|---|---|
| Demo web | `https://demo.henrik11.duckdns.org` (usuario y contraseña en el `.env`) |
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
COPYFILE_DISABLE=1 tar --no-mac-metadata -C infra/nas -czf - . | ssh Enric@192.168.2.8 tar -xzf - -C /volume1/docker/tramitnow
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
COPYFILE_DISABLE=1 tar --no-mac-metadata -C infra/nas --exclude ./proyecto --exclude ./backups --exclude ./supabase --exclude ./caddy/site -czf - . | ssh Enric@192.168.2.8 tar -xzf - -C /volume1/docker/tramitnow
```

(`caddy/site` se excluye porque ahí está la web desplegada; ver "Desplegar la web").

```bash
sudo sh setup.sh --regenerate
```

Y volver a desplegar el Proyecto en UGOS (o `sudo sh compose.sh up -d --build`).
El `.env` no se toca.

## Desplegar la web

`apps/web` se compila en el Mac y se copia a `caddy/site/` del NAS. Caddy la sirve al momento:
no se reinicia nada y Supabase no se toca.

```bash
sh infra/nas/deploy-web.sh
```

Requisitos: SSH activado en UGOS y Node instalado en el Mac. Para no escribir la contraseña
en cada despliegue, copia tu clave SSH al NAS una vez:

```bash
ssh-copy-id Enric@192.168.2.8
```

La versión desplegada (`versión-commit`) aparece abajo en la barra lateral.

## Pasar a SSD

Las rutas del proyecto son absolutas. Para moverlo: parar, mover toda la carpeta `tramitnow/`
al volumen del SSD, ejecutar allí `sudo sh setup.sh --regenerate` y volver a crear el Proyecto en UGOS.

## Restaurar un backup

```bash
sudo sh compose.sh exec -T db pg_restore -U postgres -d postgres --clean < backups/tramitnow-AAAA-MM-DD.dump
```
