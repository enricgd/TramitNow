#!/bin/sh
# Compila apps/web y la publica en el NAS. Se ejecuta desde el Mac.
# Caddy sirve la carpeta directamente: no hace falta reiniciar ningún contenedor.
#
# Uso:  sh infra/nas/deploy-web.sh                (NAS por defecto: Enric@192.168.2.8)
#       NAS=usuario@ip sh infra/nas/deploy-web.sh
set -e

NAS=${NAS:-Enric@192.168.2.8}
DEST=/volume1/docker/tramitnow/caddy/site

cd "$(dirname "$0")/../../apps/web"

if [ -n "$(git status --porcelain .)" ]; then
  echo "Aviso: apps/web tiene cambios sin commitear; la versión desplegada no corresponderá a un commit."
fi

# Las URL de Supabase y de la API y la anon key se incrustan al compilar (ver apps/web/.env.example).
if ! grep -qs '^VITE_SUPABASE_ANON_KEY=.' .env.production.local || ! grep -qs '^VITE_API_URL=.' .env.production.local; then
  echo "Falta apps/web/.env.production.local con VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY y VITE_API_URL (copia .env.example)."
  exit 1
fi

npm ci
npm run build

# Se copia con tar por SSH: el rsync de UGOS no permite escribir en /volume1/docker.
# El contenido se sustituye dentro de la carpeta (no se renombra) porque Caddy la tiene montada.
COPYFILE_DISABLE=1 tar --no-mac-metadata --no-xattrs -C dist -czf - . | ssh "$NAS" "
  set -e
  tmp=\$(mktemp -d)
  tar -xzf - -C \"\$tmp\"
  find '$DEST' -mindepth 1 -delete
  cp -R \"\$tmp\"/. '$DEST'/
  chmod -R a+rX '$DEST'
  rm -rf \"\$tmp\"
"

echo "Desplegado $(git rev-parse --short HEAD) en https://demo.henrik11.duckdns.org"
