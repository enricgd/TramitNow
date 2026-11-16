#!/bin/sh
# Carga en el catálogo global los convenios de db/data/convenios/*.json (o los ficheros indicados). Cada versión
# queda en «en revisión» hasta que el equipo de contenidos la revise y la publique (API: /v1/agreement-versions).
# Formato de los ficheros: db/README.md, "Convenios globales". Volver a cargar no duplica nada: lo que no ha cambiado
# no se toca y lo ya publicado nunca se modifica (sale un AVISO).
#
# Cada fichero va en su propia transacción: si uno tiene un error, no se carga nada de él y se sigue con el resto.
#
# PSQL es el comando psql a usar, como en migrate.sh; recibe el SQL por la entrada estándar. Ejemplos:
#   PSQL="docker exec -i tramitnow-db-local psql -U postgres -d postgres" sh db/scripts/cargar-convenios.sh
#   PSQL="docker exec -i supabase-db psql -U postgres -d postgres" sh db/scripts/cargar-convenios.sh   (NAS)
#   sh db/scripts/cargar-convenios.sh db/tests/convenios/ejemplo.json
#
# EXTRAIDO_POR (opcional): email de la persona del equipo de contenidos que preparó los ficheros. Esa persona no
# podrá revisar sus versiones (revisión a cuatro ojos). Sin él, la extracción queda como automática.
set -eu

PSQL=${PSQL:-psql}
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
EXTRAIDO_POR=${EXTRAIDO_POR:-}

if [ -n "$EXTRAIDO_POR" ]; then
  case "$EXTRAIDO_POR" in
    *\'* | *\\* | *" "*) echo "EXTRAIDO_POR no es un email válido" >&2; exit 2 ;;
  esac
  extractor="'$EXTRAIDO_POR'"
else
  extractor="null"
fi

if [ $# -gt 0 ]; then
  set -- "$@"
else
  set -- "$ROOT"/db/data/convenios/*.json
fi

loaded=0
failed=0
for f in "$@"; do
  if [ ! -f "$f" ]; then
    echo "No hay ficheros de convenios que cargar ($f)"
    continue
  fi
  if grep -q '\$convenio\$' "$f"; then
    echo "FALLA $f: contiene el texto \$convenio\$, que el cargador usa como delimitador" >&2
    failed=$((failed + 1))
    continue
  fi
  echo "Cargando $(basename "$f")"
  if out=$(
    {
      echo "\\set ON_ERROR_STOP 1"
      echo "set client_min_messages = warning;"
      printf 'select private.load_agreement_file($convenio$'
      cat "$f"
      printf '$convenio$::jsonb, %s);\n' "$extractor"
    } | $PSQL -X -q -t -A --single-transaction 2>&1
  ); then
    printf '%s\n' "$out" | sed '/^$/d; s/^/  /'
    loaded=$((loaded + 1))
  else
    printf '%s\n' "$out" | sed '/^$/d; /^CONTEXT:/d; s/^psql:[^E]*ERROR: */ERROR: /; s/^/  /' >&2
    echo "FALLA $f: no se ha cargado nada de este fichero" >&2
    failed=$((failed + 1))
  fi
done

echo "Ficheros cargados: $loaded. Con errores: $failed."
[ "$failed" -eq 0 ]
