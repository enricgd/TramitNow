# Todas las pantallas: el contenido ocupa todo el ancho

- **Fecha**: 2026-10-28
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, aún sin commit
- **Cómo verlo**: `npm --prefix apps/web run dev` y abrir cualquier pantalla en un monitor ancho (1920 px o más).
  En Empresas → una empresa → Contactos se ve el cambio más claro.

## Resumen

En pantallas anchas quedaba una franja vacía a la derecha, porque el contenido tenía un ancho máximo (1536 px en
la página y entre 896 y 1152 px en algunas pestañas). Ahora el contenido ocupa todo el espacio disponible y se adapta a
cualquier resolución. Si en el futuro hace falta un panel lateral, irá en ese espacio, pero mientras tanto lo usa
la tabla o el contenido principal.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/ui/Layout.tsx` (`Page`) | Todas | Sin ancho máximo |
| `src/views/*.jsx` | Todas | Cabeceras de ficha sin ancho máximo; pestañas de Empresas y Mi ETT sin `max-w-4xl/5xl/6xl` |

## Cambios

- **Página** (`Page` y las cabeceras de ficha): se quita `max-w-screen-2xl mx-auto`. Solo quedan los márgenes
  laterales (`px-4 sm:px-6`).
- **Pestañas de Empresas** (Resumen, Datos generales, Contactos, Centros, Facturación, Documentos, Historial) y
  **de Mi ETT**: se quitan los anchos máximos.
- **Tarjetas de contactos y centros**: la rejilla de 2 columnas fijas pasa a `repeat(auto-fit, minmax(340px, 1fr))`.
  Las tarjetas se estiran hasta llenar la fila. Con 2 contactos en 1920 px salen dos tarjetas de la mitad del ancho
  cada una; si hay más, se reparten en tantas columnas como quepan, con un mínimo de 340 px por tarjeta.
- **Se mantiene** el ancho máximo de los párrafos explicativos (`max-w-2xl`), para que se lean bien, y el de las ventanas.

Comprobado sin desbordes a 1280 px y a 1920 px en todas las pantallas.

## Componentes y estilo

- `Page` ya no limita el ancho. Sin colores ni componentes nuevos.

## Datos

Sin cambios de datos.

## Dudas y pendientes

- En monitores muy anchos (más de 2500 px), algunas tablas pueden quedar con columnas muy separadas. Si pasa, se
  puede limitar el ancho de las columnas de texto en lugar del de la página.
