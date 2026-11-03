# Inicio: panel con lo pendiente y el resumen del día (beta)

- **Fecha**: 2026-10-27
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, c36fd59
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/#/inicio

## Resumen

La portada era la presentación de la demo, con tres accesos a módulos. Ahora es un panel de trabajo: qué hay
pendiente, qué toca hoy y cómo van las peticiones, con acciones directas desde la propia pantalla. Es una
primera versión para validar el planteamiento.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/Inicio.tsx` | — (no había maqueta de inicio) | Pantalla completa |
| `src/ui/Tabs.tsx` | — | Las pestañas ya no muestran una barra de desplazamiento vertical sobrante (afectaba a todas las pantallas) |

## Cambios

### Cabecera
- Saludo según la hora ("Buenos días / Buenas tardes / Buenas noches"), fecha y resumen: "Tienes 6 tareas
  pendientes, 2 urgentes". Sin botones: las acciones están en el propio panel.

### Indicadores (5)
- Peticiones abiertas, plazas por cubrir, expedientes bloqueados, presupuestos sin firmar y personas en misión,
  cada uno con su color de estado y una línea de ayuda. **Al pulsarlos se va a la pantalla correspondiente.**

### Pendiente (bloque principal)
- Lista de tareas con icono y color según el tipo: rosa urgente, ámbar pendiente, azul informativo, gris sin prisa.
  Cada tarea muestra título, contexto (petición, cliente), plazo ("Atrasada 1 día" en rosa, "Hoy", "Vence mañana")
  y **un botón con la acción directa** ("Pedir documento", "Tramitar alta", "Enviar a firma", "Buscar candidatos",
  "Llamar", "Recordar al cliente"). Las urgentes llevan el botón principal y el resto, el secundario.
- Pestañas "Todas / Urgentes / Para hoy" con contador.
- El botón ✓ marca la tarea como hecha. Abajo aparece "1 tarea hecha hoy · Deshacer".
- Sin tareas: "Todo al día".

### Columna derecha
- **Accesos rápidos**: nuevo candidato, nueva empresa, nuevo presupuesto y buscar, que abre el buscador de la
  cabecera como Ctrl+K.
- **Agenda de hoy**: hora, qué es y etiqueta de tipo (entrevista, cliente, formación, incorporación).

### Seguimiento
- **Cobertura de peticiones**: cada petición abierta con barra de plazas cubiertas (índigo; verde si está
  completa) y botón "Buscar candidatos", o la etiqueta "Cubierta".
- **Selección esta semana**: embudo candidaturas → contactados → entrevistas → asignados, con barras de un solo
  color y el porcentaje final.
- **Incorporaciones por semana**: barras de las últimas 8 semanas. La actual va en índigo fuerte y el valor sale
  al pasar el ratón; debajo, el dato de la semana y la media.
- **Actividad reciente**: últimos movimientos con punto de color y cuánto hace.

## Componentes y estilo

- Usa los componentes comunes: `Page`, `PageHeader`, `KpiTile`, `Card`, `SectionTitle`, `Tabs`, `Badge`, `Button`,
  `IconButton` y `EmptyState`.
- Nuevos dentro del fichero: `FilaTarea`, `Acceso` (botón de acceso rápido) y `GraficoBarras` (barras verticales
  de una serie, sin librería de gráficos). Si se usan en más pantallas, se moverán a `src/ui/`.
- Sin colores nuevos. Iconos nuevos de lucide: `UserSearch`, `Undo2` y `CalendarClock`.

## Datos

Todo es de ejemplo y está al principio de `src/Inicio.tsx`. Para hacerlo real, desarrollo necesitará:

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Tarea | tipo / tono | nuevo | urgente, pendiente, informativa, sin prisa | Generada por el sistema o creada por un usuario |
| Tarea | título, contexto | nuevo | texto | Contexto = petición, cliente o candidato relacionado |
| Tarea | vencimiento | nuevo | fecha | En pantalla, relativo ("Hoy", "Atrasada 1 día") |
| Tarea | acción y destino | nuevo | texto + pantalla | Qué botón se muestra y adónde lleva |
| Tarea | hecha | nuevo | sí/no + fecha | Por usuario; permite deshacer |
| Evento de agenda | hora, texto, tipo | nuevo | hora, texto, lista | Entrevista, cliente, formación, incorporación |
| Indicadores | — | calculados | números | Peticiones, plazas, bloqueos, presupuestos, personas en misión |
| Actividad | texto, fecha, tono | nuevo | texto, fecha, lista | Puede salir del registro de auditoría |

## Dudas y pendientes

- Para Enric: de dónde salen las tareas (reglas automáticas: DNI caducado, alta pendiente, presupuesto sin
  respuesta en N días...) y si se pueden crear a mano.
- ¿Panel igual para todos o según el perfil? Selección vería más candidatos; comercial, más presupuestos.
- Las acciones directas de las tareas llevan hoy a la pantalla correspondiente; lo ideal es que abran directamente
  la ficha o la ventana concreta (por ejemplo, el alta de Miguel Torres).
- Los gráficos son una primera aproximación; falta una vista en tabla para accesibilidad.
