# Facturación: de las horas cerradas a la factura, el envío y el cobro

- **Fecha**: 2026-10-28
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, a6ada07
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/#/facturacion.
  - Para crear una factura: "Preparar borrador" en Hostelería (octubre) → "Simular horas validadas" → "Emitir factura".
  - Para la rectificativa: abrir F2026-0094 → "Rectificar".

## Resumen

"Facturación" era una entrada del menú desactivada, sin maqueta ni especificación. Ahora es una pantalla nueva,
diseñada directamente con el sistema común, que sigue a Horas e incidencias. Convierte las horas validadas de cada mes
en la factura al cliente, con las tarifas del presupuesto aceptado y los datos de facturación de la ficha del cliente.
Permite emitirla, enviarla, registrar los cobros y corregirla con una rectificativa.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/FacturacionView.jsx` | — (no hay maqueta) | Pantalla nueva |
| `src/App.tsx` | `design/laboral.html` (menú) | La entrada "Facturación" se activa |
| `src/Inicio.tsx` | — | Tarea nueva "Factura F2026-0079 vencida" |
| `src/views/HorasView.jsx` | — | Fechas de paso a facturación y nómina alineadas con las facturas |
| `src/ui/Overlay.tsx` | — | El pie de `Drawer` y `Modal` pasa a varias líneas si no cabe (móvil) |

## Cambios

### Entrada de la sección
- **Indicadores**:
  - Por facturar: meses con horas sin factura.
  - En borrador.
  - Pendiente de cobro: importe y número de facturas.
  - Vencidas: importe y número de facturas.
  - Se pulsan para filtrar; "Por facturar" lleva al bloque de abajo.
- **Por facturar**: una tarjeta por **cliente y mes**, con las peticiones, las horas y la base que saldría con las
  tarifas del presupuesto.
  - Si faltan partes por validar en Horas, lo dice: se puede **preparar el borrador**, pero no emitirlo.
- **Facturas**: número, cliente y periodo, emisión, vencimiento ("en N días", o "hace N días" en rosa), total,
  pendiente y estado.
  - Filtros: buscador, estado y cliente.

### Factura (panel lateral)
- **Datos**: cliente con CIF y dirección fiscal, email de envío, fecha de emisión, forma de pago con los días fijos
  de pago, y vencimiento.
- **Vencimiento calculado**: fecha de emisión más los días de la forma de pago y, si el cliente tiene días fijos de
  pago, el siguiente de ellos. Por ejemplo, Trans-Logística: 60 días y los días 10 y 25.
- **Aviso si la ficha del cliente tiene datos de facturación sin completar**, con enlace a la ficha. No bloquea.
- **Líneas generadas desde las horas**: una por petición y concepto (normales, extra, nocturnas, fin de semana y
  festivas). Cada una son las horas por la tarifa del presupuesto con su recargo (× 1,5, × 1,25 y × 1,75, los del
  presupuesto).
  - En borrador se pueden **añadir líneas manuales** (desplazamientos, ajustes, descuentos en negativo) y quitarlas,
    con confirmación.
- **Totales**: base imponible, IVA según el cliente, retención si la tiene, total, cobrado y pendiente.
- **Vista previa**: la factura como la recibe el cliente, con los datos de la ETT y su número de autorización.
- **Historial** de la factura.

### Estados y acciones
- **Borrador** → **Emitir factura**: se le da el número de la serie (F2026-…), la fecha de hoy y el vencimiento. Ya
  no se puede cambiar.
  - "Descartar borrador", con confirmación: las horas vuelven a "Por facturar".
- **Emitida, sin enviar** → **Enviar al cliente** (al email de facturas de la ficha).
- **Pendiente de cobro** → **Registrar cobro**: fecha, importe y nota. Admite **cobros parciales**.
- Al llegar al total pasa a **Cobrada**. Si pasa el vencimiento con importe pendiente, pasa a **Vencida**, con
  "Recordar al cliente".
- **Rectificar**: una factura emitida no se borra.
  - Se elige el motivo y se emite una **rectificativa** (serie R2026-…) con las mismas líneas en negativo; la
    original queda **Anulada**.
  - Opcionalmente prepara un **borrador nuevo** con las mismas líneas para corregirlo y emitirlo.
- **Solo se ven tarifas e importes de venta**: el coste y el margen siguen solo en Presupuestos.

### Datos de ejemplo (alineados con Horas e incidencias y Empresas)
- **Trans-Logística** (PET-2026-0031, mozos/as a 16,90 €/h, transferencia a 60 días, días 10 y 25):
  - Julio: F2026-0087, cobrada el 10/10.
  - Agosto: F2026-0094, pendiente de cobro (vence el 10/11).
  - Septiembre: F2026-0101, pendiente de cobro (vence el 10/12); incluye 2 horas extra.
  - F2026-0079: formación PRL, línea manual, **vencida** desde el 25/09.
  - Su ficha tiene datos de facturación sin completar, como en Empresas.
- **Hostelería** (PET-2026-0044, camareros/as a 18,40 €/h, transferencia a 30 días): octubre **por facturar**, a la
  espera de los 2 partes sin validar. Lleva horas de fin de semana y festivas.
- La siguiente factura es la F2026-0108 y la siguiente rectificativa, la R2026-0004.

## Componentes y estilo

- Solo componentes comunes: `Page`, `PageHeader`, `KpiTile`, `Card`, `SectionTitle`, `Notice`, `Drawer`, `Modal`,
  `Confirmar`, `Field`, `Select`, `SearchInput`, `IconButton` y `EmptyState`. Sin colores nuevos.
- **Cambio en un componente común**: el pie de `Drawer` y de `Modal` admite varias líneas (`flex-wrap`), para que en
  móvil no se corten los botones.
- Importes en euros con formato español y separador de miles siempre (también en 4 cifras: 3.974,40 €).
- Iconos nuevos: `FileMinus2` y `BellRing`.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Factura | serie y número, cliente, periodo, fecha de emisión, vencimiento, estado | nuevo | borrador / emitida / enviada; cobrada y vencida se calculan | Número correlativo por serie, sin huecos |
| Línea de factura | concepto, cantidad, unidad, precio, petición, mes, manual | nuevo | | Las de horas guardan la petición y el mes de los que salen |
| Factura rectificativa | factura rectificada, motivo | nuevo | serie R | La original queda anulada |
| Cobro | factura, fecha, importe, nota | nuevo | admite varios por factura | |
| Cliente (ficha) | IVA, retención, forma de pago, días de la forma de pago, días fijos de pago, email de facturas | usar o confirmar | | Ya están en la ficha de Empresas |
| Petición | tarifa por hora y recargos | usar | del presupuesto aceptado | |

## Dudas y pendientes

- **Por confirmar con quien lleve la facturación**:
  - Una factura por cliente y mes, con una línea por petición y concepto. ¿Hay clientes que quieran una por petición
    o por centro? En la ficha del cliente se podría elegir, como el "Tipos de facturación" del programa antiguo.
  - Las series de numeración (F y R) y si cada delegación tiene la suya.
  - Si alguna vez se aplica retención.
- **Para Enric**:
  - **VeriFactu / Sistema de facturación verificable** y la **factura electrónica** entre empresas: requisitos y
    plazos legales por confirmar.
  - PDF de la factura y envío real por email.
  - La conciliación de cobros con el banco.
  - Que la tarifa salga de la versión aceptada del presupuesto de cada petición. En la demo es un dato fijo.
  - Que los meses lleguen de verdad desde Horas e incidencias. En la demo, "Simular horas validadas" hace de cliente.
