# Flujo de diseño con IA

El diseñador trabaja **directamente sobre `apps/web`** con Claude Code, viendo la app en vivo.
Lo que diseña ya es la aplicación, no un borrador que haya que traducir después.

## Puesta en marcha (una sola vez)

1. **Acceso al repo**: invitarle como colaborador en GitHub a `enricgd/TramitNow`.
2. **Instalar**: Git, Node 22 y la app de escritorio de Claude (pestaña Code). Necesita su propia suscripción a Claude.
3. **Clonar el repo** y abrir la carpeta en Claude Code. Si se atasca con git, el propio Claude le ayuda.

## Ver los cambios en directo

El repo ya incluye la configuración del servidor de desarrollo (`.claude/launch.json`).
Basta con pedirle a Claude "abre la app": la arranca y la muestra en el navegador integrado, junto al chat.

Cada cambio que Claude hace en un fichero se ve en menos de un segundo, sin recargar.
También se puede abrir `http://localhost:5173` en cualquier navegador.

## Día a día

1. Pedir a Claude una rama nueva, por ejemplo `diseno/candidatos`.
2. Iterar sobre la pantalla viéndola en vivo ("haz la tabla más compacta", "añade un filtro por estado"…).
3. Cuando esté lista, pedir a Claude que haga commit y abra una PR hacia `development`.
4. Enric revisa la PR (o se la pasa a Claude para revisarla), la integra y despliega con `sh infra/nas/deploy-web.sh`.

`main` y `development` deben estar protegidas en GitHub para que nada entre sin PR.

## Base de datos

**El diseñador no necesita acceso a la base de datos.**

- Hoy la web no usa la base de datos: las pantallas llevan datos de ejemplo.
- Cuando se conecte el backend, la app tendrá dos modos:
  - **Modo demo** (por defecto en local): datos ficticios en memoria. Es el modo de trabajo del diseñador: sin conexión, sin claves, sin riesgo.
  - **Modo real**: login con Supabase y datos a través de la API (`apps/api`). Solo para probar login y datos de verdad.
- Si alguna vez necesita ver la app conectada, se le da un **usuario de prueba** en Supabase, como a cualquier usuario. Nunca acceso a Studio ni a Postgres.

## Preparación pendiente antes de que empiece

1. **Librería de componentes base** en `apps/web/src/ui/` (botón, tarjeta, insignia de estado, pestañas,
   tabla, cajón lateral, campos de formulario), extraída de los patrones que se repiten en `design/`.
   Sin ella, cada pantalla volvería a inventar sus propios botones.
2. **Las vistas pasan a ser código normal.** Hoy `src/views/*.jsx` se generan desde `design/` con
   `scripts/import-design.py` y no se editan a mano. Con este flujo se editan directamente y `design/`
   queda como archivo histórico.
3. **Reglas de diseño en `CLAUDE.md`**: usar siempre los componentes de `src/ui/`, colores y espaciados
   de Tailwind del proyecto, datos siempre ficticios, una rama y una PR por cambio. Así la IA del diseñador
   sigue las mismas normas que el resto del proyecto.
4. **Guía de arranque** (`docs/onboarding-diseno.md`) con la instalación paso a paso y este flujo.
5. **Subir `development` a GitHub.**
