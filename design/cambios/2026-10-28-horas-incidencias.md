# Horas e incidencias: parte semanal, validación del cliente y cierre del mes

- **Fecha**: 2026-10-28
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, (pendiente)
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/#/horas. Para probar los reparos: "Corregir" en la
  semana del 12/10; para rellenar un parte: "Completar" en esta semana; para el cierre: pestaña "Cierre del mes".

## Resumen

"Horas e incidencias" era una entrada del menú desactivada, sin maqueta ni especificación. Ahora es una pantalla nueva,
diseñada directamente con el sistema común, que sigue a Personal en misión. Recoge las horas que trabaja cada persona
en misión en un **parte semanal por petición**, que **valida el cliente**, y al **cerrar el mes** las pasa a facturación
y a nómina. Del programa antiguo se aprovecha la idea de la "validación de presencias" del portal de empresas, y del
presupuesto, los conceptos de horas (normal, extra, nocturna, de fin de semana y festiva).

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/HorasView.jsx` | — (no hay maqueta) | Pantalla nueva |
| `src/App.tsx` | `design/laboral.html` (menú) | La entrada "Horas e incidencias" se activa |
| `src/Inicio.tsx` | — | Tarea nueva "Parte de horas con reparos del cliente" |

## Cambios

### Entrada de la sección
- **Indicadores** que se pulsan para filtrar: partes en borrador, pendientes del cliente, con reparos y meses por cerrar
  (meses ya terminados sin pasar a facturación y a nómina).
- Dos pestañas: **Partes semanales** y **Cierre del mes**.
- **Partes semanales**: tabla con un parte por petición y semana, de la más reciente a la más antigua.
  - Columnas: semana ("Esta semana", "Semana pasada" o el mes), petición, personas, horas, horas extra, incidencias
    y estado.
  - Botón según el estado: "Completar" (borrador), "Corregir" (con reparos) o "Ver".
  - Filtros: estado (por defecto, lo que está por hacer) y petición.

### Parte semanal de una petición
- Cabecera con cliente, centro y horario, y flechas para ir a la **semana anterior o siguiente**.
- Indicadores de la semana: total de horas, normales, extra, fin de semana y festivas, e incidencias.
- **Tabla persona × día** (de lunes a domingo). Cada día lleva en la cabecera las horas del horario, "Libre" o
  "Festivo". A la derecha van los totales por concepto y el total.
  - Un día se pulsa para cambiar las horas trabajadas y las extra, o para poner una incidencia y una nota.
  - Los días que **no cuadran con el horario** o pasan de 9 horas salen en ámbar.
  - "—" significa que ese día la persona no está en misión; "?" que el día ya pasó y no tiene horas.
- **"Rellenar con el horario"**: pone las horas previstas en los días que faltan hasta hoy. Luego solo se corrigen las
  excepciones.
- **Incidencias de un día**: baja médica, accidente de trabajo, ausencia justificada o injustificada, vacaciones,
  permiso retribuido (todas dejan el día sin horas) y retraso (con las horas reales).
- **Las bajas médicas de Personal en misión entran solas** (Youssef Amrani desde el 24/10).
- Cómo se reparten las horas por concepto: festivo → festivas; sábado o domingo → fin de semana; turno de noche →
  nocturnas (la columna solo sale en peticiones de noche); el resto → normales. Las extra se apuntan aparte.

### Estados del parte
- **Borrador** → **Pendiente del cliente** (enviado) → **Validado** o **Con reparos** → **Cerrado**.
- Solo se puede cambiar en borrador. "Volver a borrador" desde pendiente; "Corregir" desde con reparos, y luego
  "Reenviar al cliente". El comentario del cliente queda visible mientras se corrige.
- El cliente lo valida en su portal de empresas. Si lo hace por email, en papel o por teléfono, está **"Validar en
  nombre del cliente"**: quién, cómo y el justificante (obligatorio salvo por teléfono, que avisa de que no queda
  justificante).
- Actividad del parte: lo que se va haciendo queda registrado.

### Cierre del mes
- **Mes natural**. Para cada petición con horas en el mes: personas, horas normales, extra, de fin de semana,
  festivas y total.
- Se puede cerrar cuando el cliente ha validado **todos los partes con días de ese mes**. Si falta alguno, se dice
  cuál y se puede abrir desde ahí.
- **"Pasar a facturación"** y **"Pasar a nómina"**, por separado. Cuando un mes tiene las dos, sus partes pasan a
  «Cerrado» (si una semana cae entre dos meses, se cierra cuando lo están los dos).
- **"Ver por persona"**: días, horas por concepto e incidencias de cada persona en el mes; es lo que va a nómina.
- **Solo horas, sin importes**: las tarifas y el margen están en Presupuestos.

### Datos de ejemplo (alineados con Personal en misión)
- **PET-2026-0044** (9 camareros/as, jornada partida de 38 h, desde el 10/10):
  - Apertura el sábado 10 y el domingo 11 (horas de fin de semana); el 12/10, festivo trabajado.
  - Semana del 05/10 validada en el portal.
  - Semana del 12/10 **con reparos**: el cliente dice que Pablo Ruiz Cano no hizo la hora extra del martes 13.
  - Semana del 19/10 pendiente del cliente: retraso de Daniel Sousa Prieto, ausencia justificada de Irene Campos Gil,
    horas extra en la cena de clausura y la baja de Youssef Amrani.
  - Esta semana, en borrador, con el día de hoy sin rellenar.
- **PET-2026-0031** (6 mozos/as, de julio a septiembre): todos los partes cerrados y los tres meses pasados a
  facturación y a nómina.

## Componentes y estilo

- Solo componentes comunes: `Page`, `PageHeader`, `KpiTile`, `Tabs`, `Notice`, `Card`, `Drawer`, `Modal`, `Field`,
  `Select`, `IconButton` y `EmptyState`. Sin componentes ni colores nuevos.
- Iconos nuevos: `Wand2`, `FileCheck2`, `Receipt`, `Wallet` y `CalendarRange`.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Parte de horas | petición, semana (lunes), estado | nuevo | borrador / enviado / con reparos / validado / cerrado | Uno por petición y semana |
| Parte de horas | envío, reparos, validación | nuevo | fecha de envío; texto del cliente; quién, cómo, fecha y justificante | La validación puede ser del cliente en el portal o de la ETT en su nombre |
| Línea de parte | persona, fecha, horas, horas extra, incidencia, nota | nuevo | horas decimales | Las horas por concepto se calculan con el calendario de festivos y el turno |
| Incidencia de día | tipo | nuevo (tabla maestra) | baja médica, accidente, ausencia justificada o injustificada, vacaciones, permiso, retraso + "deja el día sin horas" | Compartida con Personal en misión |
| Festivo | fecha, nombre, ámbito | nuevo (tabla maestra) | nacional, autonómico o local | Cada centro tiene su calendario |
| Cierre de mes | petición, mes, pasado a facturación, pasado a nómina | nuevo | fechas | |

## Dudas y pendientes

- **Por confirmar con quien lleve lo laboral o la facturación**:
  - Parte por semana y cierre por mes natural (hay clientes que facturan por quincenas).
  - Las 9 horas diarias como aviso; depende del convenio.
  - Si el cliente puede introducir las horas en su portal además de validarlas (como opción por cliente).
  - Si las vacaciones de una persona en misión se pueden disfrutar o siempre van al finiquito.
- **Para Enric**:
  - Que las incidencias de Personal en misión y de aquí sean la misma tabla. En la demo, la baja de Youssef se copia,
    pero registrar el alta en Personal en misión no cambia el parte.
  - El calendario de festivos por centro (nacional, autonómico y local).
  - La validación del cliente en el portal de empresas y el envío del email del parte.
  - El fichaje desde el portal de candidatos, más adelante, rellenaría este mismo parte.
  - Pasar a facturación y a nómina de verdad.
- **Siguiente sección**: "Facturación", que parte de los meses cerrados de aquí.
