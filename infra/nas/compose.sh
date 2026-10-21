#!/bin/sh
# Ejecuta docker compose sobre el proyecto de TramitNOW desde cualquier carpeta
# (equivale a los botones del Proyecto en UGOS).
#   sh compose.sh up -d --build   arrancar / actualizar
#   sh compose.sh stop            parar (los datos se conservan)
#   sh compose.sh start           volver a arrancar
#   sh compose.sh ps | logs -f caddy
cd "$(dirname "$0")/proyecto" && exec docker compose "$@"
