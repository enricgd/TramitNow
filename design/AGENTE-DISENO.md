# Guía para el agente del diseñador

Este documento es para el agente de IA (Claude Code) con el que trabaja el diseñador. Léelo entero antes
de empezar una sesión en la rama `design`. Las normas generales del proyecto están en `CLAUDE.md`.

## Qué es esto y quién hace qué

TramitNOW es un ERP web para Empresas de Trabajo Temporal (ETT). La aplicación web está en `apps/web` y
hoy funciona en **modo demo**: todas las pantallas llevan datos de ejemplo y no se conectan a nada.

| Quién | Dónde trabaja | Qué produce |
|---|---|---|
| **Diseñador + tú** | `apps/web` (rama `design`) | La app ya diseñada, más una nota de cambios en `design/cambios/` |
| **Agente de diseño de Enric** | `design/*.html` | Maquetas de pantallas completas (HTML autocontenidos) |
| **Desarrollo (Enric)** | `apps/web`, `apps/api`, `db/` | Conexión a datos reales, login, API |

Lo que diseñáis **ya es la aplicación**: no hay que traducirlo después. Por eso tus cambios tienen que ser
código limpio que desarrollo pueda conectar a datos reales sin rehacerlo.

`design/*.html` son las maquetas originales. **No las edites**: son de Enric y su agente. Úsalas como
referencia de estilo y para pantallas que aún no están en la app. Lo que tú cambies se lo cuentas con una
nota de cambios (ver más abajo), y su agente actualiza las maquetas a partir de ella.

## Ejecutar la app en local

El diseñador trabaja en **Windows**. Solo necesita, una vez:

1. **Git para Windows** (https://git-scm.com/download/win), con las opciones por defecto. Claude Code lo
   usa también como terminal (Git Bash).
2. **Node.js 22 LTS** (https://nodejs.org, instalador `.msi`), con las opciones por defecto.
3. **La app de escritorio de Claude**, pestaña Code, abierta sobre la carpeta del repo.

No hace falta Docker, base de datos, Supabase, claves ni ficheros `.env`.

Para arrancar, usa el servidor **"web"** de `.claude/launch.json` (herramienta de vista previa del
navegador integrado). Equivale a ejecutar, desde la raíz del repo:

```bash
npm --prefix apps/web run dev
```

- La primera vez instala las dependencias sola (`apps/web/scripts/ensure-deps.mjs`); tarda un minuto.
  También reinstala si `package-lock.json` cambia al traer cambios de otra rama.
- Se abre en http://localhost:5173 y **entra directamente con un "Usuario Demo"**, sin login.
- Cada cambio en un fichero se ve al instante, sin recargar.
- Las pantallas se eligen con la barra lateral o por URL: `#/peticiones`, `#/laboral`, `#/mi-ett`.

Si algo falla:

| Síntoma | Solución |
|---|---|
| `Port 5173 is already in use` | Ya hay un servidor abierto: reutilízalo o páralo antes de arrancar otro. |
| `EPERM` / `EBUSY` al instalar | Para el servidor de desarrollo y vuelve a arrancar (Windows bloquea ficheros en uso). |
| `npm` no se reconoce | Node no está instalado o la app de Claude se abrió antes de instalarlo: reinicia la app. |
| Pide login | Se ha arrancado con `npm run dev:real`. Usa `npm run dev`. |

`npm run dev:real` es el modo con login de verdad: lo usa desarrollo con la base de datos local. El
diseñador no lo necesita.

## Mapa de `apps/web`

```
apps/web/
  src/
    App.tsx          Estructura común: cabecera, barra lateral (NAV) y navegación por #/ruta
    Root.tsx         Modo demo o login. No tocar la lógica.
    Login.tsx        Pantalla de login (solo se ve con dev:real). Se puede retocar lo visual.
    Inicio.tsx       Portada
    views/           Una pantalla por fichero:
      PeticionesView.jsx   (de design/peticiones.html)
      LaboralView.jsx      (de design/laboral.html)
      FichaEttView.jsx     (de design/fichaett.html, "Mi ETT")
    auth/            Sesión de Supabase. No tocar.
    index.css        Tailwind y estilos globales (scrollbar, animaciones)
  scripts/           ensure-deps.mjs, import-design.py
```

Las vistas de `src/views/` nacieron copiando el HTML de `design/`. **Ahora se editan directamente**: son
el código de la app. No vuelvas a generarlas con `import-design.py` (borraría los cambios).

### Añadir una pantalla nueva

- Si existe la maqueta en `design/` (por ejemplo `candidatos.html`):
  ```bash
  cd apps/web && py scripts/import-design.py candidatos CandidatosView
  ```
  (en Windows el comando de Python es `py`; si no está instalado, crea la vista a mano siguiendo la maqueta).
- Si no existe, crea `src/views/NombreView.jsx` desde cero.
- Después añade `view: NombreView` a su entrada en `NAV` (`src/App.tsx`). Las entradas sin `view`
  aparecen deshabilitadas ("Próximamente").

## Normas de diseño

- **Estilos solo con clases de Tailwind 4.** Nada de CSS suelto salvo en `index.css` y si es global.
- **Paleta** (la que ya usa la app): `slate` para fondos, bordes y texto; `indigo` como color principal
  (botones, selección, enlaces); `emerald` = correcto/activo, `amber` = aviso/pendiente,
  `rose` = error/urgente, `blue` = informativo. No introduzcas colores nuevos sin anotarlo en la nota.
- **Densidad de ERP**: texto base `text-xs`/`text-sm`, esquinas `rounded-lg`, sombras suaves
  (`shadow-xs`, `shadow-sm`). Es una herramienta de trabajo diario: mucha información, bien ordenada.
- **Iconos**: `lucide-react` (versión 0.474.0). Comprueba que el icono existe en esa versión.
- **Componentes repetidos**: si un patrón (botón, insignia de estado, campo, pestaña, tabla, cajón lateral)
  ya existe en una vista, reutilízalo igual. Si lo creas nuevo, hazlo como componente con nombre dentro
  del fichero y anótalo en la nota. Más adelante se moverán a `src/ui/`.
- **Textos en español**, con el vocabulario del sector (petición, posición, candidato, alta, contrato,
  convenio, cliente, sucursal...). Consulta `docs/inventario-pantallas.md` si dudas de un término.
- **Responsive**: comprueba también en ancho de móvil (en el navegador integrado se puede cambiar el
  tamaño). La barra lateral se oculta por debajo de `md`.
- **Sin dependencias nuevas** (`npm install algo`) sin que Enric lo apruebe: pon la propuesta en la nota.

### Qué no tocar

`db/`, `infra/`, `archive/`, `docs/`, `design/*.html`, `src/auth/`, la lógica de `src/Root.tsx`,
`vite.config.ts`, `package.json` y `.claude/`. Si un cambio de diseño lo necesita, anótalo en la nota como
pregunta para Enric.

## Datos de ejemplo

Cada vista guarda sus datos al principio del fichero, en constantes como `INITIAL_PETICION`,
`INITIAL_POSICIONES`, `INITIAL_EXPEDIENTES` o `initialCompanyData`. Mientras no haya backend, ahí es donde
se cambian o se añaden.

**Sí:**
- Inventar datos verosímiles del sector (empresas, puestos, convenios, turnos, importes) para que la
  pantalla se vea como en uso real, incluidos casos límite: nombres muy largos, listas vacías, muchos
  elementos, estados de error.
- Si añades un campo a un objeto, añádelo a **todos** los elementos de esa lista, con la misma forma.
- Emails `@example.com`, teléfonos y documentos claramente inventados (IBAN `ES00 0000 ...`).

**No:**
- **Nunca datos reales de personas** (nombres completos reales, DNI/NIE, teléfonos, emails, fotos), ni
  CIF o datos de empresas reales. Si te pasan una captura o un Excel real, inventa datos equivalentes.
- No conectes a nada: ni `fetch`, ni Supabase, ni `apps/api`. Tampoco imágenes de servicios externos;
  si hace falta una imagen, va en `apps/web/public/`.
- No presentes como reales cifras legales o de negocio (porcentajes de cotización, tablas salariales de
  convenio, plazos legales). Pon un valor de ejemplo y anótalo en la nota como "por confirmar".

Un campo nuevo en pantalla casi siempre implica un dato nuevo en la base de datos. Por eso la nota tiene
una sección de datos: es lo que más necesita desarrollo.

## Día a día con Git

Se trabaja siempre en la rama **`design`**.

1. **Al empezar**: `git switch design` y `git pull`. Si Enric avisa de novedades en `development`,
   `git fetch origin && git merge origin/development` (si hay conflictos, para y pregunta).
2. **Durante**: commits pequeños, uno por cambio que tenga sentido solo ("Peticiones: tabla de posiciones
   más compacta"). Mensajes en español.
3. **Antes de cada commit**: `npm --prefix apps/web run build` tiene que pasar, la pantalla se ve bien y
   la consola del navegador no muestra errores.
4. **Al terminar la sesión**: actualiza la nota de cambios, haz commit y `git push`.
5. **Cuando un bloque esté listo**: abre una PR de `design` hacia `development`, con un resumen y enlaces a
   sus notas de cambio. Con `gh pr create --base development` si GitHub CLI está instalado; si no, en
   https://github.com/enricgd/TramitNow, "Compare & pull request" sobre la rama `design`.

## Nota de cambios (lo más importante)

Cada bloque de trabajo deja una nota en `design/cambios/`, copiando `design/cambios/_plantilla.md` como
`AAAA-MM-DD-tema.md` (por ejemplo `2026-11-03-peticiones-posiciones.md`). Si ese día se sigue con el mismo
tema, se actualiza la misma nota.

La nota sirve para que, al volver al agente de diseño de Enric o a desarrollo, sepan **de dónde coger las
cosas y qué ha cambiado** sin leer el código. Escríbela pensando que el lector no ve la app ni el diff:

- **Autocontenida**: qué pantalla, qué cambia y por qué, en lenguaje de diseño.
- **Dónde está la verdad ahora**: qué fichero de `apps/web` tiene la versión buena y qué maqueta de
  `design/` ha quedado desactualizada, y en qué partes.
- **Concreta**: clases de Tailwind, colores, textos exactos, estados nuevos, comportamiento al hacer clic.
- **Datos**: cada campo nuevo, cambiado o eliminado, con su tipo y valores posibles.
- **Dudas**: lo que habéis decidido sin estar seguros y lo que necesita respuesta de Enric.

La nota se incluye en el mismo commit (o el último del bloque) que los cambios que describe.

## Para el agente de Enric (al recibir el trabajo)

1. Lee las notas de `design/cambios/` con `Estado: pendiente`.
2. Para cada una, la fuente buena es el código de `apps/web` que indica la nota (rama `design` o
   `development` si ya está integrada), no la maqueta antigua.
3. Actualiza las maquetas de `design/` que la nota marca como desactualizadas y revisa la sección de datos
   contra `docs/modelo-backend.md`.
4. Cambia el estado de la nota a `incorporado (AAAA-MM-DD)`.
