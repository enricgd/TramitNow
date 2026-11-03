# Peticiones: una petición = un puesto, listado con pipeline y crear peticiones desde el presupuesto

- **Fecha**: 2026-10-28
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, 93edb75
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/#/peticiones. Para crear peticiones desde
  un presupuesto: #/presupuestos → vista pipeline → arrastrar PRE-2026-0048 a Aceptado → "Aceptar y crear peticiones".

## Resumen

Regla de negocio que fija el diseñador:

- **Las peticiones siempre vienen de un presupuesto aceptado.**
- **Una petición tiene un solo puesto.**
- **Un puesto puede tener varias peticiones**, por ejemplo una por turno o por fechas.

Antes, una petición tenía varias posiciones (POS-001, POS-002), cada una con su horario. Ahora cada petición es un
puesto con un horario, sus plazas y su difusión, y las peticiones del mismo presupuesto se ven juntas.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/PeticionesView.jsx` | `design/peticiones.html` | Todo: datos, listado, pipeline, ficha, pestañas y ventanas |
| `src/views/PresupuestosView.jsx` | `design/presupuestos.html` | "Crear petición" pasa a "Crear peticiones" con reparto; presupuesto aceptado PRE-2026-0042 en el listado |
| `src/Header.tsx`, `src/Inicio.tsx` | — | Datos de ejemplo de peticiones alineados con los nuevos códigos |
| `src/ui/Layout.tsx` | — | Los botones de la cabecera de página bajan de línea en móvil en lugar de cortarse |

## Cambios

### Datos de ejemplo
- 9 peticiones, cada una de un puesto:
  - **PRE-2026-0042** (Trans-Logística Ibérica Norte, aceptado):
    - Operario/a de almacén, turno de mañana: 5 plazas.
    - Operario/a de almacén, turno de tarde: 3 plazas. Entre las dos suman las 8 personas del puesto.
    - Carretillero/a, turno de tarde: 4 plazas.
  - **PRE-2026-0041** (Hostelería): camarero/a de sala, camarero/a de barra, ayudante de cocina y cocinero/a.
  - Una cerrada y una cancelada (con motivo).
- Los datos de Trans-Logística coinciden con Presupuestos: CIF, contacto Marta Gómez Arana, convenio de Bizkaia y
  tarifas 17,65 y 19,80 €/h.
- PRE-2026-0048 sigue en borrador para poder probar todo el recorrido del presupuesto. Por eso las peticiones de
  ejemplo salen de **PRE-2026-0042**, un presupuesto aceptado nuevo que se añade al listado de Presupuestos.

### Listado
- Una fila por petición: puesto · turno, cliente y presupuesto, fechas, cobertura (x de y plazas), portales,
  responsable y estado.
  - Si empieza en 7 días o menos y le faltan plazas, sale "Empieza en N días" en ámbar.
- **Indicadores**: activas, plazas por cubrir, peticiones que empiezan en 7 días con plazas sin cubrir, y candidaturas.
- **Filtros**: buscador, estado (por defecto "Activas"), cliente, presupuesto y responsable, con "Limpiar".
- **Agrupar por presupuesto**: separa las filas por presupuesto, con el número de peticiones y de plazas.
- **Vista pipeline**: una columna por estado (Nueva → En difusión → En selección → Cubierta → En curso → Cerrada, más
  Cancelada). Las tarjetas se arrastran para cambiar de estado.
- **Nueva petición**:
  1. Hay que elegir un presupuesto aceptado y uno de sus puestos. Cada puesto muestra cuántas personas tiene y
     cuántas ya están en peticiones.
  2. Después, turno, plazas e inicio. Las plazas se proponen con las que faltan por repartir.
  3. Si las plazas superan las personas del presupuesto, sale un aviso, pero se puede crear.

### Ficha de la petición
- **Cabecera**: puesto · turno como título, cliente, centro, fechas y un enlace al presupuesto.
  - Acciones: cambiar estado, "Duplicar con otro horario" y "Publicar cambios".
- **Indicadores**: plazas cubiertas, candidatos en proceso, portales activos y días hasta el inicio.
  - "Días hasta el inicio" sale en ámbar si quedan 7 o menos y faltan plazas.
- **Pestañas**:
  - **Resumen**:
    - El puesto tal como viene del presupuesto, en solo lectura: categoría, convenio, salario, tarifa, EPIs y carnés.
      Lleva un aviso de que salario, tarifa y conceptos extra no se cambian aquí.
    - Cliente y servicio.
    - Las **peticiones del mismo presupuesto**, con "mismo puesto" o "esta petición" y el reparto: "8 personas en el
      presupuesto, 8 repartidas en 2 peticiones". Si no coinciden, se avisa en ámbar.
  - **Horario**: un solo horario, sin selector de posiciones.
  - **Plazas y candidatos**: tabla con todas las plazas (persona, incorporación y contrato), con Asignar y Liberar plaza.
  - **Difusión en portales**: por petición. El contenido común se rellena con el puesto y el turno. Con "Copiar de una
    petición hermana" se reutiliza la publicación de otra petición del mismo puesto.
  - **Contratos y altas**: estado del contrato y del alta de cada persona, con el enlace a Contratos y altas, más los
    documentos del servicio.
  - **Actividad**: historial de la petición.
- **Se quitan** las pestañas Posiciones y Presupuesto, y la ventana "Copiar horario a otra posición".

### Duplicar con otro horario
- Sustituye a "Copiar horario a otra posición".
- Crea otra petición del mismo puesto y presupuesto, con su propio turno, plazas y fechas, y la abre.
- Avisa (sin bloquear) si con ella las plazas no cuadran con las personas del presupuesto.

### Presupuestos: crear peticiones
- "Crear petición" pasa a ser **"Crear peticiones"**. Por defecto propone una petición por puesto, con todas sus
  personas y un turno.
- **"+ Dividir"** reparte un puesto en dos peticiones: reparte las plazas y propone otro turno.
  - Las filas añadidas se pueden quitar.
- Si las plazas de un puesto no suman sus personas, sale un aviso en ámbar, pero no bloquea.
- El botón dice cuántas se crearán ("Crear 3 peticiones").
- El indicador del presupuesto pasa a "Peticiones" (por ejemplo, "PET-2026-0052 a 0054"), y el botón a "Ver peticiones".

## Componentes y estilo

- **Nuevos** (dentro de `PeticionesView.jsx`):
  - `PipelinePeticiones`.
  - `contenidoDe`: contenido de la publicación a partir de la petición.
  - Utilidades `hermanasDe`, `diasHasta` y `fechaCorta`.
- **Reutilizados**: `Segmented`, `Notice`, `EmptyState`, `Field`, `TextInput` y `SectionTitle`.
- **Iconos nuevos**: `List`, `SquareKanban` y `GripVertical`. Sin colores nuevos.
- `PageHeader`: las acciones hacen `flex-wrap`, para que en móvil no se corten los botones.
- Nombres de turno en minúscula: "Turno de mañana", "Turno de tarde", "Turno de noche", "Jornada partida".

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Petición | presupuestoId + puesto del presupuesto | cambiado | referencia a **un** puesto del presupuesto (antes, lista de posiciones) | Obligatorio: no hay peticiones sin presupuesto |
| Petición | plazas | nuevo | entero ≥ 1 | Parte de las personas del puesto en el presupuesto |
| Petición | horario | cambiado | un horario por petición (antes, uno por posición) | |
| Petición | estado | cambiado | Nueva, En difusión, En selección, Cubierta, En curso, Cerrada, Cancelada | |
| Petición | motivoCancelacion | nuevo | texto | Solo si está cancelada |
| Petición | responsable | nuevo (o confirmar) | referencia a usuario de la ETT | Para filtrar |
| Publicación en portales | — | cambiado | una por petición | Se puede copiar de otra petición del mismo puesto |

## Dudas y pendientes

- **Para Enric**:
  - Crear de verdad las peticiones desde "Crear peticiones" y "Nueva petición". Ahora en Presupuestos solo sale el
    aviso, y en Peticiones se crean en la memoria de la pantalla.
  - ¿Hay que impedir que las plazas superen las personas del presupuesto? Ahora solo se avisa.
- **Por confirmar con el equipo**: los estados de la petición y si "Cubierta" y "En curso" se cambian solos (al
  cubrir todas las plazas y al llegar la fecha de inicio) o a mano.
- **Candidatos** (`CandidatosView.jsx`) sigue con el modelo anterior: peticiones con posiciones POS-01 y POS-02. Habrá
  que alinearlo cuando se trabaje esa sección.
- Contratos y altas (`LaboralView.jsx`) ya mostraba "Operario/a de almacén · PET-2026-0048" y encaja con el modelo
  nuevo. Sus fechas de ejemplo siguen siendo las antiguas.
- Los portales activos de cada petición son de ejemplo. Al cambiar de petición, la lista de portales se recarga con
  su número.
