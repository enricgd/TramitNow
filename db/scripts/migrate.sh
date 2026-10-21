#!/bin/sh
# Aplica en orden las migraciones de db/migrations/ que aún no estén aplicadas.
# Cada migración va en su propia transacción y se registra en supabase_migrations.schema_migrations
# (la misma tabla que usa la CLI de Supabase).
#
# PSQL es el comando psql a usar; recibe el SQL por la entrada estándar. Ejemplos:
#   PSQL="docker exec -i supabase-db psql -U postgres -d postgres" sh db/scripts/migrate.sh
#   PSQL="psql postgresql://postgres:postgres@localhost:54322/postgres" sh db/scripts/migrate.sh
set -eu

PSQL=${PSQL:-psql}
DIR=$(cd "$(dirname "$0")/../migrations" && pwd)

echo "
set client_min_messages = warning;
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);" | $PSQL -q -v ON_ERROR_STOP=1

applied=$(echo "select version from supabase_migrations.schema_migrations;" | $PSQL -At -v ON_ERROR_STOP=1)

pending=0
for f in "$DIR"/*.sql; do
  base=$(basename "$f" .sql)
  version=${base%%_*}
  name=${base#*_}
  if printf '%s\n' "$applied" | grep -qx "$version"; then
    continue
  fi
  echo "Aplicando $base"
  {
    cat "$f"
    echo
    echo "insert into supabase_migrations.schema_migrations (version, name) values ('$version', '$name');"
  } | $PSQL -q -v ON_ERROR_STOP=1 --single-transaction
  pending=$((pending + 1))
done

echo "Migraciones aplicadas: $pending"
