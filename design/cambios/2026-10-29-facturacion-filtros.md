# Facturación: buscador y filtros de cliente, petición, fechas y estado, agrupado por cliente

- **Fecha**: 2026-10-29
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, b32851e
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/#/facturacion.

## Resumen

Facturación pasa a usar el mismo criterio que Horas e incidencias: una barra de filtros combinables y las facturas
agrupadas por cliente.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/FacturacionView.jsx` | — | Filtros, «Por facturar» y lista de facturas |

## Cambios

- **Barra de filtros arriba**, que se aplica a «Por facturar» y a las facturas:
  - **Buscar**: número, cliente, petición, puesto o concepto de las líneas, sin importar los acentos.
  - **Cliente**, con cuántas facturas tiene.
  - **Petición**, que aparece al elegir cliente.
  - **Fecha de emisión**: este año (por defecto), este mes, mes pasado, últimos 3 meses, todo o entre dos fechas.
    Los borradores cuentan por el mes que facturan.
  - **Estado**.
  - Debajo, las fechas exactas que se están mirando.
- **«Por facturar»** respeta los filtros y avisa si los filtros lo dejan vacío.
- **Facturas agrupadas por cliente**, en bloques que se pliegan. La cabecera de cada bloque dice el número de
  facturas, lo facturado, lo pendiente y las vencidas.
- La columna «Cliente y periodo» pasa a **«Periodo y peticiones»**: el mes y las peticiones (código y puesto) de
  cada factura, o «Sin petición (líneas manuales)».

## Componentes y estilo

- Solo componentes comunes. Iconos nuevos: `CalendarDays` y `ChevronDown`.
