# Horas e incidencias: filtro por sucursal

- **Fecha**: 2026-11-10
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, 4033cb8
- **Cómo verlo**: `npm --prefix apps/web run dev` → Horas e incidencias → «Sucursal», en Partes semanales y en Cierre del mes.

## Resumen

Petición del diseñador: el mismo filtro por sucursal de Presupuestos y Peticiones
(`2026-11-09-filtro-por-sucursal.md`), también en Horas e incidencias.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/HorasView.jsx` | — | Filtros de Partes semanales y de Cierre del mes |

## Cambios

- **Filtro «Sucursal»** en las dos pestañas, antes de «Cliente». Solo sale a quien ve más de una sucursal.
- Filtra los partes, los bloques de cada cliente, el resumen de arriba y las filas del cierre del mes. Se combina con
  el buscador, el cliente, la petición, las fechas y el estado, y «Limpiar» también lo quita.
- El desplegable de **clientes solo enseña los de esa sucursal**. Si se cambia de sucursal y el cliente elegido no es
  de ella, se quita.
- Las dos pestañas comparten el filtro: lo que se elige en una se mantiene al pasar a la otra.

## Dudas y pendientes

- **Para Enric**: como en Presupuestos y Peticiones, en la demo la sucursal sale del cliente. En real, es la de la
  petición de cada parte.
