#!/bin/sh
# Publica la web corporativa (un solo HTML) en https://web.henrik11.duckdns.org. Se ejecuta desde el Mac.
# Caddy sirve la carpeta directamente: no hace falta reiniciar ningún contenedor.
#
# Uso:  sh infra/nas/deploy-web-corporativa.sh                 publica web-corporativa/index.html
#       sh infra/nas/deploy-web-corporativa.sh otra-version.html
set -e

NAS=${NAS:-Enric@192.168.2.8}
SSH_KEY=${SSH_KEY:-$HOME/.ssh/id_ed25519_enricgd}
DEST=/volume1/docker/tramitnow/caddy/site-corporativa
REPO=$(cd "$(dirname "$0")/../.." && pwd)
FICHERO=${1:-$REPO/web-corporativa/index.html}

if [ ! -s "$FICHERO" ]; then
  echo "No encuentro $FICHERO."
  exit 1
fi

# Se escribe en un temporal y se mueve dentro de la carpeta, que Caddy tiene montada.
ssh -i "$SSH_KEY" "$NAS" "
  set -e
  mkdir -p '$DEST'
  cat > '$DEST/.index.html.nuevo'
  mv '$DEST/.index.html.nuevo' '$DEST/index.html'
  chmod -R a+rX '$DEST'
" < "$FICHERO"

echo "Publicado $(basename "$FICHERO") en https://web.henrik11.duckdns.org"
