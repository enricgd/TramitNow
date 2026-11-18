#!/bin/sh
# Publica la página de preguntas (infra/nas/preguntas) en https://ejemplo.henrik11.duckdns.org/preguntasTorre/.
# Copia el código al NAS y reinicia el contenedor. Las respuestas (preguntas-datos/) no se tocan.
#
# Uso:  sh infra/nas/deploy-preguntas.sh
set -e

NAS=${NAS:-Enric@192.168.2.8}
SSH_KEY=${SSH_KEY:-$HOME/.ssh/id_ed25519_enricgd}
DIR=/volume1/docker/tramitnow

cd "$(dirname "$0")/preguntas"
node -e 'JSON.parse(require("fs").readFileSync("preguntas.json","utf8"))'

COPYFILE_DISABLE=1 tar --no-mac-metadata --no-xattrs -czf - server.js index.html preguntas.json | ssh -i "$SSH_KEY" "$NAS" "
  set -e
  mkdir -p '$DIR/preguntas' '$DIR/preguntas-datos'
  tar -xzf - -C '$DIR/preguntas'
  chmod -R a+rX '$DIR/preguntas'
  cd '$DIR/proyecto' && sudo -n docker compose up -d preguntas && sudo -n docker compose restart preguntas
"

echo "Publicado en https://ejemplo.henrik11.duckdns.org/preguntasTorre/"
