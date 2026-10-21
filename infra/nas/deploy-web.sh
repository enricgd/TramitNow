#!/bin/sh
# Compila apps/web y la publica en el NAS. Se ejecuta desde el Mac.
# Caddy sirve la carpeta directamente: no hace falta reiniciar ningún contenedor.
#
# Uso:  NAS=usuario@ip-del-nas sh infra/nas/deploy-web.sh
set -e

: "${NAS:?Indica el NAS, por ejemplo: NAS=Enric@192.168.2.10 sh infra/nas/deploy-web.sh}"
DEST=/volume1/docker/tramitnow/caddy/site/

cd "$(dirname "$0")/../../apps/web"

if [ -n "$(git status --porcelain .)" ]; then
  echo "Aviso: apps/web tiene cambios sin commitear; la versión desplegada no corresponderá a un commit."
fi

npm ci
npm run build
rsync -av --delete dist/ "$NAS:$DEST"

echo "Desplegado $(git rev-parse --short HEAD) en https://demo.henrik11.duckdns.org"
