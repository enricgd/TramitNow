# Contratos y altas: bandeja de expedientes, flujo alineado con Peticiones y sin datos internos

- **Fecha**: 2026-10-28
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, 2fbd1cb
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/#/laboral → pulsar una petición o una persona.

## Resumen

La pantalla mostraba una sola petición con datos que no coincidían con Peticiones: otro presupuesto, otra ciudad,
otras fechas y otras personas. También enseñaba el salario base y el coeficiente, y el CPD no seguía el flujo
acordado. Se rehace con el sistema común:

- Una **bandeja con los expedientes de todas las peticiones**, ordenada por fecha de inicio.
- El **detalle de cada petición**.
- La **ficha del expediente** de cada persona.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/LaboralView.jsx` | `design/laboral.html` | Toda la pantalla (rehecha) |
| `src/views/PeticionesView.jsx` | `design/peticiones.html` | Nombres de ejemplo: nadie está en dos peticiones a la vez |
| `src/Inicio.tsx`, `src/Header.tsx` | — | Tareas, agenda, actividad, avisos y buscador con las personas y los pasos nuevos |

## Cambios

### Expediente de cada persona: 5 pasos en orden
1. **Documentación**: DNI o NIE, NSS, cuenta bancaria y RGPD.
2. **CPD firmado por la empresa**: se genera cuando el cliente confirma a la persona (en Peticiones).
3. **Contrato firmado por la persona**: no se puede enviar hasta que el CPD esté firmado.
4. **Formación PRL y EPIs**.
5. **Alta en la Seguridad Social**: necesita la documentación en regla y el contrato firmado.

- **Estados de cada paso**: hecho, en curso, pendiente y bloqueado. Cada paso tiene fecha límite respecto al inicio:
  la documentación 3 días antes, el CPD 2 días antes, y el contrato, la PRL y el alta el día antes.
- Si un paso depende de otro, lo dice ("Espera al CPD firmado") y no ofrece la acción.
- **El expediente se abre cuando el cliente confirma a la persona.** Las plazas pendientes del cliente, por cubrir o
  con baja salen en el detalle de la petición, con el botón "Ir a Peticiones".

### Bandeja (entrada de la sección)
- **Indicadores**: expedientes pendientes, los que empiezan en 3 días o menos con pasos sin hacer, bloqueados y CPD
  sin firmar por la empresa. Se pulsan para filtrar.
- **Filtros**: buscador, estado (pendientes por defecto, bloqueados, completos o todos), paso que falta, petición y
  responsable.
- **Por persona** (tabla), ordenada por fecha de inicio:
  - Columnas: persona, petición, inicio (con "Empieza en N días" en rosa si quedan 3 o menos y en ámbar si quedan
    7 o menos), los 5 pasos, la próxima tarea y el botón de esa tarea.
  - Botones posibles: "Pedir documento", "Recordar a la empresa", "Enviar a firmar", "Asignar formación",
    "Comunicar alta"…
- **Por petición** (tarjetas): puesto · turno, cliente, inicio, expedientes completos, y cuántos faltan de cada paso.

### Detalle de una petición
- **Cabecera**:
  - Puesto · turno, cliente, centro, fechas, responsable y enlace a la petición en Peticiones.
  - Acciones de grupo: "Enviar contratos a firmar (N)" y "Comunicar altas (N)". Solo actúan sobre los expedientes
    que ya pueden hacerlo.
- **Indicadores**: personas frente a plazas, completos, pendientes por paso y bloqueos.
- **Condiciones del presupuesto**: categoría, convenio, salario y estado del CPD previo.
  - **Ya no se muestran la tarifa ni el coeficiente**: "La tarifa al cliente y el margen no se ven aquí; solo en
    Presupuestos, para dirección".
- **Expedientes** de la petición, más las plazas sin expediente, y **Actividad**: lo que se va haciendo queda
  registrado.

### Ficha del expediente (panel lateral)
- Persona, petición, plaza, DNI y contacto. Barra de progreso y "Empieza el … · en N días".
- **Los 5 pasos**, cada uno con su estado, una explicación, la fecha límite y su acción.
  - En el CPD y el contrato en curso, "Marcar firmado" simula la firma en la demo.
- **Comunicar alta** (ventana): fecha de alta, tipo de contrato y grupo de cotización.
- **Asignar formación** (ventana): curso, fecha y entrega de EPIs.
- Enlace a la ficha del candidato.

### Datos de ejemplo alineados
- Las mismas peticiones, personas, fechas y cliente que en Peticiones:
  - PET-2026-0048: 5 operarios/as, empiezan el 03/11.
  - PET-2026-0050: 2 carretilleros/as confirmados, de 4.
  - PET-2026-0045: 4 ayudantes de cocina.
  - PET-2026-0044: en curso, 9 personas y 1 baja.
- En Peticiones, las personas generadas ya no se repiten entre peticiones.
- **Inicio y la cabecera** cuentan lo mismo:
  - NIE caducado de Mamadou Diallo (bloquea el contrato).
  - Alta de Ainhoa Larrazabal Urkijo.
  - 3 CPD pendientes de firma de la empresa.

## Componentes y estilo

- **Nuevo** (dentro de `LaboralView.jsx`): `PasosExpediente`, las etiquetas de los 5 pasos con su estado.
- **Reutilizados**: `Page`, `PageHeader`, `KpiTile`, `Segmented`, `Drawer`, `Modal`, `Field`, `Notice` y `EmptyState`.
- Se quita todo el estilo propio de la maqueta.
- Fechas en formato dd/mm/aaaa. Estados nuevos en el buscador de la cabecera: "En incorporación" y "Bloqueado".
- Sin colores nuevos.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Expediente laboral | — | nuevo o confirmar | uno por persona y plaza confirmada | Se crea al confirmar la plaza |
| Expediente laboral | pasos | cambiado | doc, cpd, contrato, prl, alta; cada uno hecho / en curso / pendiente / bloqueado + fecha | Orden y dependencias: contrato tras CPD; alta tras doc y contrato |
| Expediente laboral | alta | nuevo | fecha de alta, tipo de contrato, grupo de cotización, respuesta del Sistema RED | |
| Expediente laboral | prl | nuevo | curso, fecha, EPIs entregados | |
| Actividad de la petición | — | nuevo | texto, quién y cuándo | |

## Dudas y pendientes

- **Por confirmar con quien lleve lo laboral**:
  - Los plazos de cada paso: 3, 2 y 1 días antes del inicio.
  - Si el contrato con la persona tiene que esperar de verdad al CPD firmado o pueden ir a la vez.
  - El tipo de contrato y el grupo de cotización por defecto (502 y 06 son de ejemplo).
- **Para Enric**:
  - La comunicación real con el Sistema RED.
  - La firma electrónica del contrato y del CPD.
  - Los avisos por email al pedir documentos (con el enlace al portal de candidatos).
- Hay entradas del menú (Personal en misión, Horas e incidencias) que siguen deshabilitadas. El paso siguiente
  natural después del alta sería "Personal en misión".
