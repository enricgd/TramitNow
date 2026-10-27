#!/bin/sh
# Entorno local desde cero: Postgres + Supabase Auth, migraciones y ETT DEMO con un usuario administrador.
#   sh db/local/reset.sh && sh db/tests/run.sh
# Borra los volúmenes: se pierde todo lo que hubiera en la base local.
set -eu

HERE=$(cd "$(dirname "$0")" && pwd)
COMPOSE="docker compose -f $HERE/docker-compose.yml --env-file $HERE/dev.env"
. "$HERE/dev.env"
PSQL="docker exec -i tramitnow-db-local psql -U postgres -d postgres"

$COMPOSE down -v --remove-orphans
$COMPOSE up -d --wait

# Supabase Auth crea su esquema (auth.users completo, auth.jwt()...) al arrancar; esperar a que acabe.
until echo "select 'auth.jwt'::regproc" | $PSQL -q >/dev/null 2>&1; do sleep 1; done

PSQL="$PSQL" sh "$HERE/../scripts/migrate.sh"

# La API se conecta como tramitnow_api. Dentro del contenedor (127.0.0.1) no pide contraseña; desde el Mac
# (apps/api y sus tests, por el puerto 54322) usa API_DB_PASSWORD de dev.env.
echo "alter role tramitnow_api login password :'pw'" | $PSQL -q -v ON_ERROR_STOP=1 -v pw="$API_DB_PASSWORD"

# Usuario demo por la API de administración de Auth, con un JWT de service_role firmado con el secreto local.
b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }
now=$(date +%s)
header=$(printf '%s' '{"alg":"HS256","typ":"JWT"}' | b64url)
payload=$(printf '{"role":"service_role","iat":%s,"exp":%s}' "$now" $((now + 300)) | b64url)
signature=$(printf '%s' "$header.$payload" | openssl dgst -sha256 -hmac "$JWT_SECRET" -binary | b64url)

curl -fsS -o /dev/null http://127.0.0.1:9999/admin/users \
  -H "Authorization: Bearer $header.$payload.$signature" \
  -H 'Content-Type: application/json' \
  -d "{\"email\": \"$DEMO_EMAIL\", \"password\": \"$DEMO_PASSWORD\", \"email_confirm\": true,
       \"user_metadata\": {\"full_name\": \"$DEMO_NAME\"}}"

$PSQL -q -v email="$DEMO_EMAIL" < "$HERE/../seeds/demo-tenant.sql"

echo "Listo. Usuario demo en db/local/dev.env; web: cd apps/web && npm run dev"
