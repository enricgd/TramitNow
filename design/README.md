# Diseño

Aquí trabajan dos agentes de IA distintos. **Mira cuál eres antes de tocar nada:**

| Si eres... | Trabajas en | Rama | Instrucciones |
|---|---|---|---|
| **El agente del diseñador** (retoca la app) | `apps/web` y `design/cambios/` | `design` | [`AGENTE-DISENO.md`](AGENTE-DISENO.md) |
| **El agente de diseño de Enric** (maquetas) | `design/*.html` | rama propia desde `development` | Esta página |

Nadie más edita las maquetas: desarrollo las usa como referencia visual para `apps/web`.

## Maquetas

Cada archivo es una pantalla (o módulo) autocontenida: React 18 + Tailwind 4 + lucide-react,
cargados desde CDN.

| Archivo | Módulo |
|---|---|
| `login.html` | Login y recuperación de contraseña |
| `fichaett.html` | Mi ETT (organización propia) |
| `empresas.html` | Empresas y clientes |
| `presupuestos.html` | Editor de presupuestos y cotización |
| `peticiones.html` | Gestión de peticiones operativas |
| `laboral.html` | Petición: pestaña Laboral |
| `candidatos.html` | Gestión de candidatos |

## Pasos para el agente de diseño de Enric

1. **Al empezar**: `git fetch origin` y crea una rama desde `origin/development`
   (`git switch -c maquetas/<tema> origin/development`).
2. **Lee las notas pendientes** de [`cambios/`](cambios/) (`Estado: pendiente`): son los cambios que el
   diseñador ya ha hecho en la app. La versión buena de esas partes es el código de `apps/web` que indica
   cada nota (rama `design`, o `development` si ya está integrada), no la maqueta.
3. **Previsualiza** con el servidor **"maquetas"** de `.claude/launch.json` (o `npm --prefix apps/web run maquetas`):
   http://localhost:5174 muestra un índice y **la página se recarga sola al guardar**. Si abres el
   `.html` directamente como fichero, el navegador no ve los cambios hasta que lo vuelves a abrir.
4. **Edita** las maquetas: actualiza las que las notas marcan como desactualizadas y diseña lo nuevo.
   Al terminar con una nota, cambia su estado a `incorporado (AAAA-MM-DD)`.
5. **Commit y PR** hacia `development`. Si la maqueta es una pantalla nueva, añádela a la tabla de arriba
   y al índice `index.html`.

## Convenciones

- Nombres de archivo en minúsculas, sin acentos ni espacios (`nueva-pantalla.html`).
- Para cambiar una pantalla existente, sobrescribir el mismo archivo: el historial queda en git.
- Los datos que aparecen en los diseños son de ejemplo. Nunca usar datos reales de personas.
- Colores, tipografía y densidad: los mismos que la app (ver "Normas de diseño" en `AGENTE-DISENO.md`).

## Notas de cambios

El diseñador trabaja directamente sobre `apps/web`. Cada bloque deja una nota en [`cambios/`](cambios/)
(a partir de `cambios/_plantilla.md`) con qué ha cambiado, dónde está la versión buena, qué maquetas han
quedado desactualizadas y qué datos nuevos implica. Es el puente entre la app y las maquetas.
