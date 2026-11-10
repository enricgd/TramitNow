# Facturación: horas detalladas por persona y puesto en todas las facturas

- **Fecha**: 2026-11-10
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, (pendiente)
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/#/facturacion
  - «Facturar el mes» → pulsar un cliente → «Horas por persona».
  - Preparar una factura → «Desglose por persona» (columna Puesto) → «Vista previa».
  - Seleccionar clientes → «Excel por persona». En «Facturas» → «Descargar» → «Excel: horas por persona y puesto».

## Resumen

El diseñador recuerda que **todas las facturas tienen que guardar las horas detalladas por candidato y puesto**, porque
después se necesitan para estadísticas: horas por persona, por puesto, por cliente, por mes...

Esto vale aunque el cliente quiera la factura impresa «por concepto». La forma de imprimirla solo cambia cómo se ve; el
detalle por persona y puesto se guarda siempre. En la demo, ahora todas las facturas de horas tienen ese detalle,
también las de los 36 clientes de ejemplo.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/FacturacionView.jsx` | — | Datos de ejemplo, ficha del cliente, desglose, vista previa, PDF y Excel |

## Cambios

### Ficha de facturación del cliente

- Cada petición del mes se muestra como «Puesto · PET-…», con el número de personas.
- Debajo hay un desplegable **«Horas por persona»**: nombre, horas por concepto, total de horas e importe.

### Ficha de la factura: «Desglose por persona»

- **Antes**: las columnas eran Persona y las horas por concepto. La petición solo salía si había varias.
- **Ahora**: hay una columna **Puesto**, con la petición debajo, siempre. El total dice «N personas · N puestos».

### Líneas «por persona», vista previa y PDF

- Las líneas por persona dicen el puesto: «Ane Etxeberria Goikoetxea · Mozo/a de almacén · horas normales · octubre de 2026 (PET-2026-0200)».
- El resumen o anexo por persona de la vista previa y del PDF tiene la columna «Puesto y petición».

### Excel para estadísticas

- **«Facturas» → Descargar → «Excel: horas por persona y puesto»** (antes «líneas y horas por persona»).
  - Columnas: Número · Fecha de emisión · Cliente · Sucursal · Petición · **Puesto** · Persona · **Mes** · Concepto · Cantidad · Unidad · Precio · Importe.
- **«Facturar el mes» → selección → «Excel por persona»** (nuevo).
  - Saca las horas del mes de los clientes marcados, estén facturadas o no.
  - Columnas: Cliente · CIF · Sucursal · Petición · Puesto · Persona · Mes · Concepto · Horas · Precio · Importe · Factura (número o estado).

## Componentes y estilo

- Sin componentes nuevos. Se usa `<details>` nativo para plegar las personas en la ficha del cliente.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Línea de factura (horas) | candidato | obligatorio | referencia al candidato o trabajador | Siempre, aunque la factura se imprima por concepto |
| Línea de factura (horas) | puesto / posición | obligatorio | referencia a la posición de la petición | Para estadísticas por puesto |
| Línea de factura (horas) | petición, mes, concepto, horas, precio | se mantiene | | Concepto: normales / extra / nocturnas / fin de semana / festivas |
| Factura | detalle | se mantiene | por concepto / por persona | Solo es la **presentación** de la factura |

**Propuesta para desarrollo**: guardar las líneas de horas siempre a nivel persona + puesto + concepto, y calcular las
líneas resumidas por concepto al imprimir. Así las estadísticas salen de una consulta sobre las líneas, sin volver a
los partes de horas.

## Dudas y pendientes

- ¿Hace falta una pantalla de estadísticas (horas y facturación por puesto, cliente, persona y mes), o de momento basta con el Excel?
- Servicios (selección, formación...): ¿se asocian también a personas, por ejemplo formación PRL de 2 personas concretas? En la demo no.
