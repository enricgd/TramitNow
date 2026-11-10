# Facturación: desglose de las horas por persona

- **Fecha**: 2026-11-10
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, (pendiente)
- **Cómo verlo**: `npm --prefix apps/web run dev` → Facturación.
  - Abre F2026-0094 (agosto) para ver el desglose y la diferencia de Adrián.
  - O «Preparar borrador» de octubre y elige «Por persona» en las líneas.

## Resumen

Petición del diseñador: la factura agrupaba las horas por concepto (por ejemplo, «Mozo/a de almacén · horas normales
· 945 h»). Se tiene que poder desglosar por persona, con las horas de cada candidato.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/FacturacionView.jsx` | — | Horas de cada persona, líneas por persona, desglose en la factura y anexo en la vista previa |

## Cambios

- **Desglose por persona** en cada factura de horas, debajo de las líneas:
  - Una fila por persona, con sus horas por concepto (normales, extra, fin de semana, festivas…), el total de horas y
    el importe.
  - La última fila suma todo y cuadra con las líneas.
  - Si las horas facturadas de alguien no son las validadas en sus partes, se marca en ámbar con un aviso. Por
    ejemplo, en F2026-0094: Adrián Vela facturadas 157,5 h y validadas 150 h. Es la diferencia de agosto que ya
    avisaba Horas e incidencias.
- **Cómo salen las líneas en la factura**: en el borrador se elige **«Por concepto»** (resumen, como hasta ahora) o
  **«Por persona»** (una línea por persona y concepto, por ejemplo «Garazi Uribe Arana · horas normales · octubre de
  2026 (PET-2026-0044) · 75,11 h × 18,40 €»).
  - Una vez emitida, la factura se queda como se emitió («Líneas por concepto» o «Líneas por persona»).
- **Vista previa**: si las líneas van por concepto, la factura lleva un **anexo «Horas por persona»** al final, para
  que el cliente vea de quién son las horas.
- Las rectificativas desglosan igual, en negativo.
- Datos de ejemplo: los mismos de Horas e incidencias. Julio, agosto y septiembre son los 6 mozos de PET-2026-0031;
  octubre (por facturar), los 9 camareros de PET-2026-0044.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Factura | detalle | nuevo | concepto / persona | Cómo salen las líneas; se fija al emitir |
| Línea de factura | persona | nuevo | id de la persona | Solo en las facturas por persona |

## Dudas y pendientes

- **Por confirmar**:
  - Si cada cliente tiene que tener por defecto cómo quiere las facturas (por concepto o por persona). Se podría
    guardar en su ficha de Empresas → Facturación.
  - **Redondeo**: por persona, cada línea se redondea a céntimos, así que la base puede variar unos céntimos frente a
    la factura por concepto (octubre: 18.682,05 € por persona y 18.682,07 € por concepto).
- **Para Enric**: las horas por persona salen de los partes validados de cada persona en Horas e incidencias, no de
  un total del mes.
