# Facturación: cada cliente elige cómo quiere la factura, y el PDF lleva el importe por persona

- **Fecha**: 2026-11-10
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, f42f740
- **Cómo verlo**: `npm --prefix apps/web run dev`.
  - Empresas → un cliente → Facturación → «Cómo quiere las facturas de horas».
  - Facturación → «Preparar borrador» de octubre (Hostelería) o F2026-0101 → «Vista previa».

## Resumen

Sigue a `2026-11-10-facturacion-desglose-por-persona.md`. El diseñador decidió:

1. Que **cada cliente** tenga guardado si quiere las facturas de horas por concepto o por persona.
2. Que en la **vista previa de la factura**, que es lo que después sale en el PDF, aparezca también el **importe
   desglosado por persona**.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/EmpresasView.jsx` | `design/empresas.html` | Ficha → Facturación: campo nuevo |
| `src/views/FacturacionView.jsx` | — | Borrador según el cliente, aviso si se cambia y resumen por persona en la vista previa |

## Cambios

### Preferencia del cliente (Empresas → Facturación)
- Campo nuevo **«Cómo quiere las facturas de horas»**:
  - **Por concepto**: una línea por tipo de hora, con anexo de horas e importe por persona.
  - **Por persona**: una línea por persona y tipo de hora.
- Datos de ejemplo: Trans-Logística la quiere por concepto y Hostelería, por persona.

### Facturación
- Al **preparar el borrador**, las líneas salen como quiere el cliente, y el historial lo dice («…por persona como
  quiere el cliente»).
- En una factura concreta se puede cambiar. Si no coincide con lo que quiere el cliente, sale el aviso «El cliente
  las quiere por…».
- Las rectificativas, y el borrador que las sustituye, mantienen el modo de la factura original.

### Vista previa (lo que sale en el PDF)
- Al final de la factura, una tabla con **cada persona**: sus horas por concepto, el total de horas y el **importe**
  (sin IVA), con una fila de totales que cuadra con la base imponible.
  - Si las líneas van por concepto, se titula «Anexo: horas e importe por persona». Por ejemplo, F2026-0101: 6
    personas, 992 h, 16.781,70 €.
  - Si van por persona, «Resumen por persona», para ver el importe de cada una de un vistazo. Por ejemplo, el
    borrador de octubre: 9 personas, 887,33 h, 18.682,05 €.
- El importe de cada persona se redondea igual que las líneas de la factura, así que el desglose del cajón y el de la
  vista previa siempre suman lo mismo que la factura por persona.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Empresa (facturación) | facturaDetalle | nuevo | concepto / persona | Valor por defecto de sus facturas de horas |

## Dudas y pendientes

- **Para Enric**: el PDF de la factura tiene que llevar esta tabla tal cual. Si las líneas van por persona, la tabla
  es el resumen; si van por concepto, es un anexo de la misma factura, no un documento aparte.
