# Facturación: descargar en PDF y en Excel, y facturación por sucursal

- **Fecha**: 2026-11-10
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, 617a5c5
- **Cómo verlo**: `npm --prefix apps/web run dev` → Facturación.
  - Botón «Descargar (n)» encima de las facturas.
  - Icono de descarga en cada factura.
  - Tabla «Facturación por sucursal».

## Resumen

Peticiones del diseñador:
1. Las facturas emitidas se tienen que poder **descargar**, para enviarlas por correo uno mismo o pasarlas a la unidad
   contable.
2. Descargar los datos en **Excel**, para trabajarlos como se quiera.
3. Ver la **facturación por sucursales**.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/FacturacionView.jsx` | — | Descargas (PDF y Excel), filtro y tabla por sucursal |

## Cambios

### Descargar la factura en PDF
- **Una factura**: botón «Descargar PDF» en el cajón de la factura y en su vista previa, e icono de descarga en cada
  fila de la lista.
- **Varias a la vez**: «Descargar» → «PDF de todas» descarga las facturas emitidas que se ven con los filtros, una por
  página. Por ejemplo, las de un mes para la gestoría.
- El PDF es el mismo que la vista previa: datos de la ETT y del cliente, líneas, totales, forma de pago y el anexo o
  resumen de horas e importe por persona.
- En la demo se abre la factura lista para imprimir y, desde ahí, «Guardar como PDF».
- Los borradores no se descargan: primero hay que emitirlos.

### Descargar en Excel
- Botón **«Descargar (n)»** encima de las facturas, con lo que se ve con los filtros (n = facturas emitidas). Dos
  opciones:
  - **Una fila por factura**: número, tipo, a qué factura rectifica, fechas de emisión y vencimiento, cliente, CIF,
    sucursal, periodo, peticiones, base imponible, IVA, retención, total, cobrado, pendiente, estado y cómo salen las
    líneas.
  - **Líneas y horas por persona**: una fila por persona y concepto (petición, persona, concepto, horas, precio e
    importe), y las líneas manuales tal cual.
- Se descarga un `.csv` que Excel abre directamente: separado por punto y coma, con coma decimal y acentos bien.

### Facturación por sucursal
- **Filtro «Sucursal»** junto a «Cliente», como en Presupuestos, Peticiones y Horas. Solo sale a quien ve más de una
  sucursal.
  - Filtra «Por facturar», las facturas, los indicadores de arriba y las descargas.
  - El desplegable de clientes solo enseña los de la sucursal elegida.
- **Tabla «Facturación por sucursal»**, viendo todas: facturas, facturado, pendiente de cobro, vencido y por facturar
  (base) de cada sucursal, con las fechas y el cliente elegidos. Al pulsar una sucursal, se filtra por ella.
  - En la demo: Delegación Norte, 4 facturas, 61.258,62 € facturados y 40.247,27 € pendientes. Sucursal Barcelona,
    sin facturas y 18.682,07 € por facturar.
- Cada cliente lleva la etiqueta de su sucursal en la lista de facturas.

## Dudas y pendientes

- **Para Enric**:
  - El PDF tiene que generarse en el servidor, con el diseño definitivo de factura, y guardarse al emitir: la factura
    no cambia aunque cambien después los datos del cliente.
  - El «PDF de todas» podría ser un ZIP con un PDF por factura.
  - Si hace falta un `.xlsx` real (con formato o varias hojas), se genera en el servidor.
  - La sucursal de cada factura tiene que guardarse en la factura, no sacarse del cliente.
- **Por confirmar**: si la gestoría necesita un formato concreto para importar en su programa de contabilidad
  (A3, Sage, Contasol…). Se podría añadir como otra opción de descarga.
