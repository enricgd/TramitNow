#!/bin/sh
# Ejecuta los tests pgTAP de db/tests/ contra la base local (nunca contra el NAS).
# Cada fichero corre en una transacción que se deshace: datos de prueba en _fixtures.sql.
# Los ficheros que empiezan por "-- conexion: tramitnow_api" se ejecutan conectando como el rol de la API;
# como esa conexión no ve datos sin confirmar, para ellos los datos de prueba se confirman y se borran
# después con _cleanup.sql.
#
#   sh db/tests/run.sh             todos
#   sh db/tests/run.sh 02_aislamiento.sql
set -eu

PSQL=${PSQL:-docker exec -i tramitnow-db-local psql -U postgres -d postgres}
PSQL_API=${PSQL_API:-docker exec -i tramitnow-db-local psql -h 127.0.0.1 -U tramitnow_api -d postgres}
DIR=$(cd "$(dirname "$0")" && pwd)

if [ $# -gt 0 ]; then files=$*; else files=$(cd "$DIR" && ls [0-9]*.sql); fi

# Test normal: datos de prueba y test en la misma transacción, que se deshace.
run_rollback() {
  {
    echo "\\set ON_ERROR_STOP 1"
    echo "begin;"
    echo "create extension if not exists pgtap with schema extensions;"
    cat "$DIR/_fixtures.sql"
    cat "$DIR/$1"
    echo "rollback;"
  } | $PSQL -X -q -t -A 2>&1
}

# Test como tramitnow_api: datos de prueba confirmados, test en otra conexión y limpieza al final.
run_api() {
  {
    echo "\\set ON_ERROR_STOP 1"
    cat "$DIR/_cleanup.sql"
    echo "begin;"
    echo "create extension if not exists pgtap with schema extensions;"
    echo "grant usage on schema extensions to tramitnow_api;"
    cat "$DIR/_fixtures.sql"
    echo "commit;"
  } | $PSQL -X -q -t -A 2>&1
  {
    echo "\\set ON_ERROR_STOP 1"
    echo "begin;"
    echo "set local search_path = public, extensions;"
    cat "$DIR/$1"
    echo "rollback;"
  } | $PSQL_API -X -q -t -A 2>&1
  $PSQL -X -q -t -A < "$DIR/_cleanup.sql" 2>&1
}

# Por si una ejecución anterior de un test de la API se cortó antes de limpiar.
$PSQL -X -q < "$DIR/_cleanup.sql" >/dev/null 2>&1 || true

failed=0
for f in $files; do
  if head -n 1 "$DIR/$f" | grep -q '^-- conexion: tramitnow_api'; then
    out=$(run_api "$f") || true
  else
    out=$(run_rollback "$f") || true
  fi
  if printf '%s\n' "$out" | grep -Eq '^not ok|ERROR|FATAL|Looks like' || ! printf '%s\n' "$out" | grep -q '^ok '; then
    echo "FALLA $f"
    printf '%s\n' "$out" | grep -Ev '^ok ' | sed 's/^/  /'
    failed=1
  else
    echo "ok    $f ($(printf '%s\n' "$out" | grep -c '^ok ') comprobaciones)"
  fi
done

exit $failed
