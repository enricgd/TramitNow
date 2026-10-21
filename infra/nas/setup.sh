#!/bin/sh
# Prepara el stack de TramitNOW en el NAS como Proyecto de UGOS. Se puede volver a ejecutar.
#
#   1. Descarga la carpeta docker/ oficial de Supabase en una versión fijada.
#   2. Crea proyecto/.env con secretos generados (solo la primera vez).
#   3. Genera proyecto/docker-compose.yaml: el compose oficial + nuestro override en un único
#      fichero, con rutas absolutas y las variables apuntando al .env.
#
# Uso:  sh setup.sh                 primera instalación (no toca un proyecto existente)
#       sh setup.sh --regenerate    vuelve a generar proyecto/docker-compose.yaml
#                                   (se pierden los cambios hechos a mano en ese fichero)
set -e

# Commit de supabase/supabase (rama master, 2026-10-21). Para actualizar: cambiar y usar --regenerate.
SUPABASE_REF=5491fb60bc0f27b8909a83100d79499aa7667ee5
DOMAIN=henrik11.duckdns.org

cd "$(dirname "$0")"
HERE=$(pwd)

# UGOS no siempre trae git: si falta, se usa desde un contenedor.
if ! command -v git >/dev/null 2>&1; then
  git() { docker run --rm -v "$HERE":"$HERE" -w "$HERE" alpine/git "$@"; }
fi

if [ ! -d supabase/.git ]; then
  git clone --filter=blob:none --no-checkout --sparse https://github.com/supabase/supabase.git supabase
  git -C supabase sparse-checkout set docker
fi
git -C supabase fetch --depth 1 origin "$SUPABASE_REF"
git -C supabase checkout -q "$SUPABASE_REF"

# UGOS exige que existan todas las rutas montadas antes de crear el Proyecto.
mkdir -p proyecto backups supabase/docker/volumes/db/data

# Los contenedores (postgres, envoy) no corren como root: necesitan poder leer los ficheros
# montados, y las carpetas compartidas de UGOS los crean sin permiso para "otros".
chmod -R a+rX supabase/docker/volumes caddy

if [ ! -f proyecto/.env ]; then
  cd proyecto
  cp ../supabase/docker/.env.example .env
  sh ../supabase/docker/utils/generate-keys.sh --update-env >/dev/null
  rm -f .env.old

  set_env() { sed -i "s|^$1=.*$|$1=$2|" .env; }
  sed -i '/^COMPOSE_FILE=/d' .env
  set_env SUPABASE_PUBLIC_URL "https://api.$DOMAIN"
  set_env API_EXTERNAL_URL "https://api.$DOMAIN/auth/v1"
  set_env SITE_URL "https://demo.$DOMAIN"
  set_env ADDITIONAL_REDIRECT_URLS "http://localhost:5173"
  set_env DISABLE_SIGNUP "true"
  set_env ENABLE_PHONE_SIGNUP "false"
  set_env STUDIO_DEFAULT_ORGANIZATION "TramitNOW"
  set_env STUDIO_DEFAULT_PROJECT "Demo"

  demo_password=$(openssl rand -hex 12)
  demo_hash=$(docker run --rm caddy:2.10 caddy hash-password --plaintext "$demo_password")
  cat >> .env <<EOF

############
# TramitNOW
############
DOMAIN=$DOMAIN
# Token de https://www.duckdns.org (no subir nunca a git)
DUCKDNS_TOKEN=
ACME_EMAIL=
# El 443 del NAS lo usa UGOS: el router redirige su 443 externo a este puerto.
CADDY_HTTPS_PORT=4443
# Acceso básico a la demo. Contraseña en claro: $demo_password
DEMO_USER=demo
DEMO_PASSWORD_HASH='$demo_hash'
EOF
  chmod 600 .env
  cd "$HERE"
  echo "Creado proyecto/.env. Rellena DUCKDNS_TOKEN y ACME_EMAIL antes de arrancar."
  echo "Usuario de la demo: demo / $demo_password (también anotado en el .env)."
fi

if [ ! -f proyecto/docker-compose.yaml ] || [ "$1" = "--regenerate" ]; then
  # El override se copia junto al oficial para que sus rutas ../../ se resuelvan igual.
  cp docker-compose.override.yml supabase/docker/docker-compose.override.yml
  (cd supabase/docker && docker compose -f docker-compose.yml -f docker-compose.override.yml \
    config --no-interpolate) > proyecto/docker-compose.yaml.tmp
  {
    echo "# GENERADO por infra/nas/setup.sh a partir de Supabase $SUPABASE_REF"
    echo "# + infra/nas/docker-compose.override.yml. Los cambios hechos aquí a mano se pierden"
    echo "# con 'setup.sh --regenerate': llévalos también al repo."
    cat proyecto/docker-compose.yaml.tmp
  } > proyecto/docker-compose.yaml
  rm proyecto/docker-compose.yaml.tmp
  echo "Generado proyecto/docker-compose.yaml."
else
  echo "proyecto/docker-compose.yaml ya existe; no se toca (usa --regenerate para rehacerlo)."
fi

echo "Listo. En UGOS: Docker > Proyecto > Crear, con la ruta $HERE/proyecto"
echo "O por SSH: sh $HERE/compose.sh up -d --build"
