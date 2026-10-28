# Presupuestos: filtros y pipeline, presupuesto vacío, pestaña Empresa y tarificación detallada

- **Fecha**: 2026-10-28
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, aún sin commit
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/#/presupuestos

## Resumen

El listado gana filtros y una vista por estados (pipeline). "Nuevo presupuesto" empieza vacío, en una pestaña
**Empresa** con buscador que rellena los datos del cliente. Los puestos parten del convenio de la empresa. La
tarificación separa lo **interno** (costes, EPIs, revisión médica, margen) de lo que ve el **cliente** (salario,
tarifa y conceptos extra), según lo que explican los audios del equipo comercial.

## Criterio de tarificación (de los audios)

- **EPIs, revisión médica y demás costes son cálculos internos.** El cliente no ve el desglose: los recoge el
  porcentaje que se aplica para llegar a la tarifa. La propuesta que se envía solo lleva **salario y tarifa**.
- **Conceptos extra** (hora extra, nocturna, fin de semana, festiva...): cada uno con su salario y su tarifa, y con
  la posibilidad de aplicar un coeficiente distinto a cada uno.
- **Todos los conceptos extra tienen que estar en la oferta**, aunque no se quieran imprimir en la propuesta. Si el
  trabajador hace, por ejemplo, horas extra y no estaban en la oferta, no se pueden facturar desde la petición y hay
  que hacerlo aparte.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/PresupuestosView.jsx` | `design/presupuestos.html` | Listado, nuevo presupuesto, pestañas Resumen, Empresa (nueva), Posiciones, Escandallo, Versiones y Documentos; panel del puesto |

## Cambios

### Listado
- **Filtros**: buscador (cliente, título o código), estado, comercial y validez (vigentes, caducan en 7 días,
  caducados), con "Limpiar".
- La validez sale en ámbar si caduca en 7 días y en rosa si ya ha caducado.
- **Vista pipeline** (botón a la derecha de los filtros): una columna por estado (Borrador, En preparación, Enviado,
  Pendiente de firma, Aceptado, Rechazado) con su contador.
  - Cada tarjeta muestra código, cliente, título, puestos, tarifa media, validez y comercial.
  - **Se arrastran entre columnas para cambiar de estado.**

### Nuevo presupuesto
- **Antes**: abría el presupuesto de ejemplo ya relleno.
- **Ahora**: empieza vacío, con número nuevo (PRE-2026-0049) y en la pestaña Empresa.
  - Validez por defecto: 30 días.
  - Margen objetivo: 18 % (por confirmar).
  - Trae los conceptos internos de siempre.
- Hasta que hay un puesto, en lugar de tarifa media, coste y margen sale el aviso "Este presupuesto aún no tiene puestos...".
- "Cancelar" en un presupuesto nuevo sin guardar lo descarta y vuelve al listado. Al guardarlo aparece en el listado.

### Pestaña Empresa (nueva)
- **Buscador inteligente**: al escribir 2 letras sugiere empresas por nombre, CIF o sector. Al elegir una se rellenan:
  - Razón social, CIF, sector y ubicación.
  - El **convenio de su actividad**.
  - El primer contacto, con email y teléfono, y su comercial.
- Si no la encuentra: "Dar de alta en Empresas".
- Tres tarjetas:
  - **Empresa**: datos y convenio.
  - **Contacto**: desplegable con los contactos de la empresa. Si no tiene, aviso y campo libre.
  - **Gestión comercial**: comercial, fecha de emisión y validez.
- **Resumen** ya no se edita: muestra empresa, contacto y gestión comercial en solo lectura, con el botón "Cambiar
  empresa, contacto o comercial".

### Puestos (panel de alta y edición)
- **Convenio**: se carga solo con el de la empresa ("Cargado del convenio de la actividad de la empresa. Se valida
  con la categoría y el nivel"). Se puede cambiar o **dar de alta uno nuevo** con "+ Añadir".
- **Tarifa**:
  - Margen objetivo por puesto (vacío = el del presupuesto) y tarifa al cliente.
  - Enlace "Usar la sugerida: X €/h", que calcula coste / (1 − margen).
  - La tarifa empieza vacía.
- Desglose en vivo (ver abajo) y **tabla de conceptos extra editable**:
  - Coeficiente de salario.
  - Coeficiente de tarifa: vacío = el mismo factor que la hora normal.
  - Casilla "En la propuesta".

### Tarjeta de cada puesto: barra de coste detallada
- **Barra**: salario (índigo) + cada coste interno (ámbar oscuro los legales, ámbar claro los demás) + margen (verde) = tarifa.
- **Debajo, tabla con cada línea en €/h y en % de la tarifa**:
  - Salario bruto.
  - Seguridad Social, indemnización, absentismo, EPIs, revisión médica...
  - Coste total ETT, margen y **tarifa al cliente**.
- Etiqueta "Interno: el cliente no lo ve".
- Si la tarifa no cubre el coste: aviso en rosa. Si la tarifa no coincide con la sugerida, se indica cuál sería.
- **Caja "En la propuesta al cliente"**: salario y tarifa, más la tabla de conceptos extra (salario, tarifa y si se imprime).
- **Con "Ver como comercial"** solo se ve esta caja: los costes internos y el margen se ocultan.

### Escandallo y costes
- **Margen ETT objetivo** del presupuesto, editable.
- Aviso: "Todo lo de esta pestaña es interno...".
- Nueva columna "En la propuesta: No, interno".
- **Conceptos extra facturables por defecto**: se copian a cada puesto nuevo, con la nota de que siempre quedan en la oferta.
- Nombres más cortos: "EPIs (calzado S3, chaleco y guantes anticorte)" y "Revisión médica inicial y formación PRL".

### Costes internos por puesto (no por presupuesto)
- **Antes**: el escandallo era del presupuesto y cada concepto se aplicaba igual a todos los puestos.
- **Ahora**: el escandallo del presupuesto define los conceptos y su **valor por defecto**, y **cada puesto decide si
  se le aplica cada uno y con qué valor**. Por ejemplo, un puesto muy físico tiene más absentismo y uno de oficina no
  necesita EPIs.
- **Conceptos que van siempre en cada presupuesto** (también en los nuevos): provisión de absentismo y contingencias,
  EPIs, y revisión médica y formación PRL.
  - Llevan la etiqueta "Siempre incluido · se ajusta por puesto" y no se pueden eliminar del presupuesto. Si un puesto
    no los necesita, se desmarcan en ese puesto.
- Los legales (Seguridad Social e indemnización) se aplican siempre, con el valor del presupuesto.
- **Dos sitios para ajustarlo**:
  - **Escandallo → "Qué se aplica en cada puesto"**: tabla con los conceptos en filas y los puestos en columnas. En cada
    celda, una casilla (aplica o no) y el valor (vacío = el de por defecto).
  - **Panel del puesto → "Costes internos de este puesto"**: la misma lista solo para ese puesto. Los conceptos
    desmarcados salen tachados.
- En el desglose de la tarjeta, un valor propio se marca como "(propio del puesto)".
- Ejemplo de la demo: el carretillero tiene un absentismo del 3,2 % (el defecto es 2,15 %).

### Documentos
- Dos documentos: la **propuesta** (para el cliente) y el **escandallo interno** (etiqueta "Interno").
- Acciones de cada documento: descargar, enviar a firma (solo la propuesta) y **eliminar** con la confirmación común.
- Un documento eliminado queda "(sin generar)", con el botón **Generar** para volver a crearlo con los datos actuales.
  El botón no se activa si el presupuesto aún no tiene puestos.

### Versiones
- Se añade una explicación de cómo funcionan (ver "Cómo funcionan las versiones" abajo).

## Cómo funcionan las versiones

1. Mientras el presupuesto está en **borrador o en preparación**, se edita sobre la misma versión (v1).
2. Al **enviarlo al cliente** queda cerrado, para que lo enviado no cambie (estados Enviado, Pendiente de firma,
   Aceptado).
3. Para cambiarlo después: **"Nueva versión"**, que crea una copia editable v2 en borrador. La v1 queda en el historial
   como sustituida, con su tarifa media y margen, para poder comparar.
4. "Generar nueva versión manual" hace lo mismo sin esperar a que esté cerrado. Sirve, por ejemplo, para preparar una
   alternativa más barata.

## Componentes y estilo

- **Nuevos** (dentro de `PresupuestosView.jsx`):
  - `DesgloseTarifa`: barra, tabla y caja de lo que ve el cliente.
  - `TablaExtras`: conceptos extra, editable o de solo lectura.
  - `PestanaEmpresa`: buscador y tarjetas de empresa, contacto y comercial.
  - `PipelinePresupuestos`: columnas por estado con arrastrar y soltar.
- **Reutilizados**: `SelectConAlta` (convenio), `Confirmar` (documentos), `Segmented` (tabla / pipeline).
- **Iconos nuevos**: `EyeOff`, `List`, `SquareKanban` y `GripVertical`. Sin colores nuevos.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Presupuesto | empresaId, sector, ciudad, convenioEmpresa | nuevo | referencia a empresa + datos copiados | Se rellenan al elegir la empresa |
| Presupuesto | margenObjetivo | nuevo | porcentaje (18 % de ejemplo) | Margen sobre la tarifa |
| Presupuesto | extrasDefecto | nuevo | lista de conceptos extra | Plantilla para los puestos nuevos |
| Puesto | margenObjetivo | nuevo | porcentaje opcional | Vacío = el del presupuesto |
| Puesto | extras | nuevo | lista: concepto, coefSalario, coefTarifa (opcional), mostrar (sí/no) | **Siempre se guardan en la oferta** para poder facturarlos; "mostrar" solo decide si se imprimen |
| Concepto de escandallo | recomendado | nuevo | sí/no | Absentismo, EPIs y revisión médica: siempre en cada presupuesto. Todos son internos: nunca salen en la propuesta |
| Puesto | conceptos | nuevo | por concepto: aplica (sí/no) y valor (opcional) | Vacío = valor del presupuesto; los legales no se pueden desmarcar |
| Empresa | convenio | nuevo (o confirmar si existe) | referencia a convenio | Convenio de su actividad; los puestos parten de él |
| Convenio | — | tabla maestra ampliable | texto | Se pueden dar de alta desde el puesto |

## Dudas y pendientes

- **Para Enric**:
  - Buscar el convenio de la empresa según su actividad (CNAE) y validar categoría y nivel contra las tablas del convenio.
  - El buscador de empresas usa ahora una lista de ejemplo dentro de Presupuestos; en real, la API de Empresas.
- **Por confirmar**: los coeficientes de ejemplo de los conceptos extra (1,5 horas extra; 1,25 nocturna; 1,5 fin de
  semana; 1,75 festiva) dependen de cada convenio. Si alguno se factura con otro coeficiente, se indica en "Coef. tarifa".
- La fórmula de la tarifa sugerida usa el margen sobre la tarifa. Hay que confirmar con el equipo si lo calculan así o
  como recargo sobre el coste.
- Cambiar de estado arrastrando en el pipeline no pide confirmación. Quizá algunos cambios, como pasar a "Aceptado",
  deberían pedirla.
- Los PDF y Excel siguen siendo simulados.
