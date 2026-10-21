#!/bin/sh
# Base local desde cero: borra el contenedor y su volumen, lo levanta, prepara auth y aplica las migraciones.
#   sh db/local/reset.sh && sh db/tests/run.sh
set -eu

HERE=$(cd "$(dirname "$0")" && pwd)
COMPOSE="docker compose -f $HERE/docker-compose.yml"

$COMPOSE down -v --remove-orphans
$COMPOSE up -d --wait
# El arranque inicial de la imagen reinicia Postgres una vez; esperar a que acepte conexiones de verdad.
until docker exec tramitnow-db-local psql -U postgres -d postgres -c 'select 1' >/dev/null 2>&1; do sleep 1; done

docker exec -i tramitnow-db-local psql -q -v ON_ERROR_STOP=1 -U supabase_admin -d postgres < "$HERE/auth-stub.sql"
PSQL="docker exec -i tramitnow-db-local psql -U postgres -d postgres" sh "$HERE/../scripts/migrate.sh"
