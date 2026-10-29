# Horas e incidencias: filtro de cliente junto a fechas y estado, y clientes plegables

- **Fecha**: 2026-10-29
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, (pendiente)
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/#/horas → pestaña «Partes semanales».

## Resumen

Las tarjetas de cliente (una por cliente, encima de la lista) no aguantan si hay muchos clientes a la vez: serían
un scroll infinito. Se sustituyen por un **filtro de cliente** que va junto a los de fechas y estado. Los tres se
combinan.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/HorasView.jsx` | — | Filtros y bloques de cliente de «Partes semanales» |

## Cambios

- **Una sola barra de filtros**, con su etiqueta encima:
  - **Cliente**: «Todos los clientes (N)» o uno concreto. Cada cliente dice cuántas peticiones tiene en esas fechas
    o «sin partes en estas fechas».
  - **Fechas**: el mismo periodo que antes, con «Desde» y «Hasta» si se elige «Entre dos fechas…».
  - **Estado**.
  - Debajo, las fechas exactas que cubre y, si se ha elegido una petición, «Solo PET-… · ver todas las
    peticiones».
- **Se quitan las tarjetas de cliente.** Por defecto se ven todos los clientes, cada uno en su bloque, y el filtro
  deja solo uno.
- **Cada bloque de cliente se pliega y despliega** pulsando su cabecera, que dice peticiones, horas y partes por
  hacer. Así, con muchos clientes, se puede dejar abierto solo el que interesa.

## Componentes y estilo

- Solo componentes comunes. Icono nuevo: `ChevronDown` para plegar.

## Dudas y pendientes

- Con muchos clientes, el desplegable de cliente podría necesitar buscador. Se puede usar el mismo selector con
  búsqueda que en Candidatos cuando haya datos reales.
