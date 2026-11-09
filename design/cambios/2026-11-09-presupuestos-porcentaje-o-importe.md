# Presupuestos: costes internos y extras en % o en €, y solo cuenta uno

- **Fecha**: 2026-11-09
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, a1f9640
- **Cómo verlo**: `npm --prefix apps/web run dev` → Presupuestos → PRE-2026-0048 → Posiciones. Con «Editar», la tabla «Qué se
  aplica en cada puesto»; o «Añadir extra» en un puesto, que abre su panel.

## Resumen

Aclaración del diseñador sobre `2026-11-09-reunion-cpd-presupuestos.md`: lo de escoger porcentaje o cantidad se
refería a los **costes internos** (por ejemplo, EPIs y revisión médica), que pueden ir en € o en %, y a los
**conceptos extra**, que funcionan igual. Si salen dos campos para rellenar, **solo vale uno**: nunca cuentan los
dos.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/PresupuestosView.jsx` | `design/presupuestos.html` | Costes internos por puesto, tarifa de los extras y cálculo |

## Cambios

### Costes internos de cada puesto
- En el panel del puesto y en la tabla «Qué se aplica en cada puesto», cada coste interno que no es legal (absentismo,
  EPIs, revisión médica y formación PRL, y los que se añadan) tiene **dos casillas: % y €/h**.
  - **Al escribir en una, la otra se vacía**, así que solo cuenta una.
  - Vacías: el valor por defecto del presupuesto, que se ve en gris en su casilla. Por ejemplo, EPIs: 0,18 €/h.
  - En %, el coste se calcula **sobre el salario**. Si el concepto ya era un porcentaje, sobre su base de siempre.
- Los costes legales (Seguridad Social e indemnización) no cambian: siempre con su valor.

### Tarifa de los conceptos extra
- La columna «Coef. tarifa» pasa a ser **«Tarifa en % o €/h»**, con dos casillas:
  - **+%**: recargo sobre la tarifa de la hora normal. Por ejemplo, hora extra +60 % sobre 17,65 €/h = 28,24 €/h.
  - **€/h**: la tarifa directamente, por ejemplo 30 €/h.
  - Igual que en los costes: al escribir en una, la otra se vacía, y vacías se calcula como hasta ahora (en gris, el
    % y los € que salen).
- Funciona en los extras de cada puesto, en los añadidos a mano y en los extras por defecto del presupuesto.

### Margen
- Las dos casillas del margen (% o €/h) que se hicieron antes siguen igual. Funcionan con la misma regla: solo cuenta
  una.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Ajuste de un coste en un puesto | porcentaje, importe | nuevo | % sobre el salario; €/h | Solo uno lleno. Sustituye a `valor` (los guardados se pasan a su casilla) |
| Concepto extra | recargoTarifa, tarifaManual | nuevo | % sobre la tarifa normal; €/h | Solo uno lleno. Sustituye a `coefTarifa` |

## Dudas y pendientes

- **Por confirmar**: el % de un coste fijo (EPIs, revisión médica) se calcula sobre el salario por hora. Si «al total»
  quería decir sobre el coste total o sobre la tarifa, se cambia la base.
- **Por confirmar**: si las casillas del margen (% o €/h) se quedan o se quitan.
