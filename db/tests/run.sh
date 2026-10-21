#!/bin/sh
# Ejecuta los tests pgTAP de db/tests/ contra la base local (nunca contra el NAS).
# Cada fichero corre en una transacción que se deshace: datos de prueba en _fixtures.sql.
#
#   sh db/tests/run.sh             todos
#   sh db/tests/run.sh 02_aislamiento.sql
set -eu

PSQL=${PSQL:-docker exec -i tramitnow-db-local psql -U postgres -d postgres}
DIR=$(cd "$(dirname "$0")" && pwd)

if [ $# -gt 0 ]; then files=$*; else files=$(cd "$DIR" && ls [0-9]*.sql); fi

failed=0
for f in $files; do
  out=$({
    echo "\\set ON_ERROR_STOP 1"
    echo "begin;"
    echo "create extension if not exists pgtap with schema extensions;"
    cat "$DIR/_fixtures.sql"
    cat "$DIR/$f"
    echo "rollback;"
  } | $PSQL -X -q -t -A 2>&1) || true
  if printf '%s\n' "$out" | grep -Eq '^not ok|ERROR|Looks like'; then
    echo "FALLA $f"
    printf '%s\n' "$out" | grep -Ev '^ok ' | sed 's/^/  /'
    failed=1
  else
    echo "ok    $f ($(printf '%s\n' "$out" | grep -c '^ok ') comprobaciones)"
  fi
done

exit $failed
