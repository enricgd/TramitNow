# Presupuestos: importes, revisión antes de enviar, propuesta, aceptar/rechazar, versiones, duplicar y seguimiento

- **Fecha**: 2026-10-28
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, aún sin commit
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/#/presupuestos → "Editar" en PRE-2026-0048 →
  "Enviar al cliente". Con "Ver como dirección" se puede aprobar el margen.

## Resumen

Ocho mejoras acordadas con el diseñador sobre la sección de Presupuestos, que completan el recorrido desde el
cálculo hasta la petición.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/PresupuestosView.jsx` | `design/presupuestos.html` | Listado, pipeline, cabecera e indicadores del detalle, puestos, Versiones, Documentos y ventanas nuevas |
| `src/Inicio.tsx` | — | Tarea nueva "Aprobar el margen de PRE-2026-0047" |

## Cambios

### 1. Importe total
- Cada puesto tiene **personas** y **horas por persona** (de todo el servicio).
  - En el panel del puesto se ve el cálculo: "4 × 480 h = 1.920 h · facturación 38.016 € · margen 4.569 €".
- **Indicadores del presupuesto**:
  - Facturación estimada, con personas y horas, sin conceptos extra.
  - Margen total en € y en %; solo lo ve dirección.
  - Tarifa media, con el coste medio como texto auxiliar.
  - Petición.
- **Listado**: columna **Importe**.
- **Pipeline**: cada columna suma sus importes ("Aceptado 2 · 101.400 €") y cada tarjeta muestra el suyo.

### 2. Revisión antes de enviar y aprobación de dirección
- "Enviar al cliente" (solo en borrador o en preparación) abre una **lista de comprobación**:
  - Empresa, contacto con email, comercial, validez futura.
  - Al menos un puesto, todos con tarifa, ninguna tarifa por debajo del coste.
  - Margen ≥ 15 % en todos los puestos.
- Cada punto que falla tiene "Corregir", que lleva a la pestaña donde se arregla.
- **Errores** → solo "Ir a corregir".
- **Margen por debajo del mínimo** → "Pedir aprobación a dirección".
  - El presupuesto queda "Pendiente de aprobación", con un aviso ámbar.
  - Dirección (con "Ver como dirección") ve en ese aviso los botones **Aprobar** y **Pedir cambios**.
  - En Inicio aparece la tarea "Aprobar el margen de PRE-2026-0047".
  - Una vez aprobado se puede enviar, y se marca "Margen aprobado".
- Todo bien → "Enviar al cliente": el presupuesto pasa a Enviado y queda cerrado.

### 3. Vista previa de la propuesta
- Desde la cabecera ("Vista previa"), desde la revisión y desde Documentos.
- Página con lo que recibe el cliente:
  - ETT, código, fechas y destinatario.
  - Por puesto: personas, convenio, y la hora ordinaria y los conceptos extra marcados para imprimir, cada uno con
    salario y tarifa.
  - Condiciones y espacio para las firmas.
- **Nada interno**: ni costes, ni margen, ni EPIs.

### 4. Aceptado → crear petición; motivo al rechazar
- **Acciones en la cabecera según el estado**:
  - Borrador o En preparación: Vista previa · Editar · **Enviar al cliente**.
  - Enviado o Pendiente de firma: Rechazado · Nueva versión · **Aceptado**.
  - Aceptado: **Crear petición** (o "Ver PET-…" si ya existe).
  - Rechazado o Sustituido: **Nueva versión**.
- **Aceptado**, desde la cabecera o arrastrando en el pipeline: pide confirmación y ofrece "Aceptar y crear petición".
  - **Crear petición** muestra qué pasa (puestos con convenio, personas, tarifa y número de conceptos extra) y pide el inicio previsto.
  - Todos los conceptos extra pasan a la petición, también los que no se imprimieron, para poder facturarlos.
  - El indicador "Petición" muestra el código creado.
- **Rechazado**, desde la cabecera o arrastrando: hay que indicar el **motivo**.
  - Es un desplegable con "+ Añadir": precio, plazo de incorporación, eligió a la competencia, cancela el proyecto,
    sin respuesta del cliente.
  - Hay un campo de notas opcional.
  - El motivo sale en el listado, en el pipeline y en el detalle.

### 5. Comparar versiones
- **Versiones** muestra la versión actual (etiqueta "Actual") y las anteriores, con facturación, tarifa media, margen y estado.
- **"Comparar con la actual"** abre una tabla con la versión anterior frente a la actual:
  - De cada puesto: tarifa y personas, con las etiquetas "Nuevo" o "Quitado".
  - Facturación, margen total y validez.
  - Lo que cambia, en amarillo.
- Al crear una versión nueva, la anterior se guarda para poder compararla.
- En la demo: PRE-2026-0048 está en la **v2** y la **v1** queda como sustituida, con otras tarifas y un carretillero menos.

### 6. Duplicar
- Icono de copiar en cada fila del listado ("Duplicar para otro cliente").
- Crea un presupuesto nuevo con los mismos puestos, costes internos, conceptos extra y condiciones, **sin empresa**, y
  lo abre en la pestaña Empresa para elegirla.

### 7. Seguimiento de presupuestos sin respuesta
- Los enviados o pendientes de firma con **5 días o más sin respuesta** muestran "Sin respuesta · N días" en ámbar, en
  el listado y en el pipeline.
- En el listado tienen además el botón "Recordar".
- Encaja con la tarea "Recordar al cliente" del panel de Inicio.

### 8. Otros
- Fechas del presupuesto de ejemplo actualizadas: validez 27/11/2026.

## Componentes y estilo

- **Nuevos** (dentro de `PresupuestosView.jsx`):
  - `VistaPropuesta`: la propuesta como la ve el cliente.
  - `ComparacionVersiones`: tabla de versión anterior frente a la actual.
  - `revisarPresupuesto` y `totalesDe`: comprobaciones e importes.
- Constantes `MARGEN_MINIMO` (15 %) y `DIAS_RECORDATORIO` (5), **por confirmar**.
- Sin colores nuevos.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Puesto | personas | nuevo | entero ≥ 1 | |
| Puesto | horasPersona | nuevo | horas de todo el servicio | Para la facturación estimada |
| Presupuesto | aprobacion | nuevo | estado (pendiente / aprobada / rechazada) + motivo | Quién y cuándo, para auditoría |
| Presupuesto | motivoRechazo, notasRechazo | nuevo | referencia a tabla de motivos + texto | Motivos ampliables |
| Presupuesto | peticionCreada | nuevo | referencia a la petición | |
| Presupuesto | versiones | nuevo | copia completa de cada versión anterior | Para comparar |
| Presupuesto | fecha de envío | nuevo | fecha | Para calcular los días sin respuesta |
| Motivo de rechazo | nombre | nuevo (tabla maestra) | texto | |

## Dudas y pendientes

- **Por confirmar con el equipo**:
  - El margen mínimo que exige aprobación (15 % de ejemplo).
  - Los días sin respuesta para avisar (5).
  - ¿El mínimo es por puesto o sobre el total del presupuesto? (Ahora es por puesto.)
- **Para Enric**:
  - Crear la petición de verdad con los datos del presupuesto: puestos, conceptos extra y convenio.
  - El envío real por email o firma electrónica.
  - Las notificaciones de aprobación a dirección.
- La facturación estimada no incluye conceptos extra, porque no se sabe cuántas horas extra habrá.
- Todas las filas del listado abren el mismo presupuesto de ejemplo.
