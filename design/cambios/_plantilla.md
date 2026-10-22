# <Pantalla>: <tema en pocas palabras>

- **Fecha**: AAAA-MM-DD
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, <primer commit>..<último commit>
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/#/<ruta>, <pestaña o paso concreto>

## Resumen

<Dos o tres frases: qué problema había y qué se ha hecho.>

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/<X>View.jsx` | `design/<x>.html` | <pestaña, bloque, tabla...> |

## Cambios

Uno por apartado, de lo más visible a lo menos:

### <Bloque o elemento>

- **Antes**: <cómo era>
- **Ahora**: <cómo es: disposición, textos exactos, colores y clases de Tailwind relevantes>
- **Comportamiento**: <qué pasa al hacer clic, estados vacíos, carga, error...>
- **Por qué**: <motivo>

## Componentes y estilo

- **Nuevos o modificados**: <nombre del componente, fichero, para qué sirve, si debería ir a `src/ui/`>
- **Colores, tamaños o iconos nuevos**: <o "ninguno">

## Datos

Campos que la pantalla muestra o pide y que cambian respecto a la maqueta. Desarrollo los contrasta con
`docs/modelo-backend.md`.

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| <petición, posición, candidato...> | <nombre> | nuevo / cambiado / eliminado | <texto, fecha, importe, lista: A/B/C> | <obligatorio, calculado, por confirmar...> |

<Si no cambian datos: "Sin cambios de datos".>

## Dudas y pendientes

- <Decisiones tomadas sin estar seguros, valores de ejemplo por confirmar, cosas que necesitan a Enric.>
