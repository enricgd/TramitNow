#!/bin/sh
# Copia apps/api al NAS (/volume1/docker/tramitnow/api) y la recompila y reinicia. Se ejecuta desde el Mac.
# El servicio `api` está en docker-compose.override.yml; antes, una vez, sigue "API" en infra/nas/README.md.
#
# Uso:  sh infra/nas/deploy-api.sh                (NAS por defecto: Enric@192.168.2.8)
#       NAS=usuario@ip sh infra/nas/deploy-api.sh
set -e

NAS=${NAS:-Enric@192.168.2.8}
DIR=/volume1/docker/tramitnow

cd "$(dirname "$0")/../../apps/api"

if [ -n "$(git status --porcelain .)" ]; then
  echo "Aviso: apps/api tiene cambios sin commitear; la versión desplegada no corresponderá a un commit."
fi

# Solo lo que necesita el Dockerfile (sin node_modules, tests ni .env).
COPYFILE_DISABLE=1 tar --no-mac-metadata --no-xattrs -czf - Dockerfile .dockerignore package.json package-lock.json \
  tsconfig.json tsconfig.build.json src | ssh "$NAS" "
  set -e
  rm -rf '$DIR/api.nuevo' && mkdir -p '$DIR/api.nuevo'
  tar -xzf - -C '$DIR/api.nuevo'
  rm -rf '$DIR/api' && mv '$DIR/api.nuevo' '$DIR/api'
  chmod -R a+rX '$DIR/api'
"

# Pide la contraseña de sudo en el NAS.
ssh -t "$NAS" "cd $DIR && sudo sh compose.sh up -d --build api"

echo "Desplegada $(git rev-parse --short HEAD). Comprueba: curl -s https://api.henrik11.duckdns.org/openapi.json | head -c 200"
