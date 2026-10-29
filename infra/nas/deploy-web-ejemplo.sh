#!/bin/sh
# Compila apps/web en modo demo (datos de ejemplo, sin login, sin Supabase ni API) y la publica en
# https://ejemplo.henrik11.duckdns.org, para que producto valide las pantallas. Se ejecuta desde el Mac.
#
# Por defecto compila la rama design de GitHub (lo último del diseñador), con development fusionada
# encima solo para compilar (no se sube nada). Se puede elegir otra rama o commit, y con BASE la rama
# que se fusiona (por ejemplo BASE=development para probar commits locales aún sin subir).
#
# Uso:  sh infra/nas/deploy-web-ejemplo.sh                    rama design
#       sh infra/nas/deploy-web-ejemplo.sh origin/development
#       NAS=usuario@ip sh infra/nas/deploy-web-ejemplo.sh
set -e

NAS=${NAS:-Enric@192.168.2.8}
SSH_KEY=${SSH_KEY:-$HOME/.ssh/id_ed25519_enricgd}
DEST=/volume1/docker/tramitnow/caddy/site-ejemplo
REF=${1:-origin/design}
BASE=${BASE:-origin/development}

REPO=$(cd "$(dirname "$0")/../.." && pwd)
TMP=$(mktemp -d)
trap 'git -C "$REPO" worktree remove --force "$TMP/web" 2>/dev/null; rm -rf "$TMP"' EXIT

git -C "$REPO" fetch -q origin
git -C "$REPO" worktree add -q --detach "$TMP/web" "$REF"
cd "$TMP/web"

# El modo de ejemplo (src/modo.ts) llega por development: si la rama aún no lo tiene, se fusiona aquí.
if ! git merge-base --is-ancestor "$BASE" HEAD; then
  if ! git -c user.name=deploy -c user.email=deploy@example.test merge -q --no-edit "$BASE"; then
    echo "La rama $REF no se fusiona sola con $BASE: hay conflictos. No se despliega."
    exit 1
  fi
fi
VERSION=$(git rev-parse --short HEAD)

cd apps/web
npm ci --no-audit --no-fund
npm run build:ejemplo

# Esta compilación no debe llevar la anon key ni las URL del NAS.
if grep -rqE 'eyJhbGci|duckdns' dist-ejemplo; then
  echo "La compilación de ejemplo contiene claves o URL del NAS. No se despliega."
  exit 1
fi

# Igual que deploy-web.sh: tar por SSH y se sustituye el contenido de la carpeta, que Caddy tiene montada.
COPYFILE_DISABLE=1 tar --no-mac-metadata --no-xattrs -C dist-ejemplo -czf - . | ssh -i "$SSH_KEY" "$NAS" "
  set -e
  mkdir -p '$DEST'
  tmp=\$(mktemp -d)
  tar -xzf - -C \"\$tmp\"
  find '$DEST' -mindepth 1 -delete
  cp -R \"\$tmp\"/. '$DEST'/
  chmod -R a+rX '$DEST'
  rm -rf \"\$tmp\"
"

echo "Desplegado $REF ($VERSION) en https://ejemplo.henrik11.duckdns.org"
