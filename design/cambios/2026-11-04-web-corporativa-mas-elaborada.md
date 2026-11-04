# Web corporativa: más contenido y más efectos

- **Fecha**: 2026-11-04
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, (pendiente)
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/web.html (en una ventana ancha y bajando poco
  a poco)

## Resumen

El diseñador pidió una web «más elaborada y con algún efecto más». Sobre el rediseño de
`2026-10-30-web-corporativa-rediseno.md`, se añaden cuatro secciones nuevas y varios efectos. Todo está en castellano y
catalán. Las cifras son hechos del producto, no datos inventados.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/web/WebCorporativa.jsx` | — | Portada, cifras, manifiesto, equipo, seguridad, cómo empezamos y pie |
| `src/web/animaciones.jsx` | — | Nuevos: `Contador`, `useProgresoScroll`, `TextoQueSeIlumina` y `TarjetaViva` |
| `src/web/web.css` | — | Manchas, avisos flotantes, foco de luz, líneas que fluyen y barra de perfiles |
| `src/web/textos.js` | — | Textos de las secciones nuevas |

## Cambios

### Secciones nuevas
- **Cifras del producto** (después de la franja), con contador animado:
  - 6 pasos, del presupuesto a la factura.
  - 9 módulos conectados entre sí.
  - 2 portales con la marca de la ETT.
  - 100 % web.
- **Manifiesto**: «Cada semana, tu ETT mueve cientos de horas, contratos y facturas…». Se **ilumina palabra a palabra
  al hacer scroll**.
- **Para todo tu equipo**:
  - Cinco perfiles en pestañas: Dirección, Comercial, Selección, Laboral y Administración.
  - Cada uno con lo que hace, tres puntos y una maqueta de lo que ve.
  - Los perfiles **pasan solos** cada 6 segundos, con una barrita que se llena, desde que la sección aparece en
    pantalla hasta que se pulsa uno.
- **Cómo empezamos**: cuatro pasos (análisis, migración, formación y arranque) unidos por una **línea que se rellena
  al bajar**. Los pasos se encienden al llegar. En el ordenador va en horizontal y en el móvil, en vertical.

### Efectos nuevos
- **Barra de progreso de lectura**, arriba del todo.
- **Portada**:
  - Manchas de color de los azules del logo que flotan despacio en el fondo.
  - En el ordenador, **avisos que van llegando** alrededor de la maqueta, como en la aplicación: «Parte validado por el
    cliente», «CPD firmado», «Factura emitida» y «Nueva petición». Aparecen uno detrás de otro y flotan suavemente.
- **Maquetas**: las filas entran una detrás de otra al cambiar de paso o de perfil.
- **Tarjetas de módulos «vivas»**: se inclinan un poco y llevan un foco de luz que sigue al ratón.
- **Seguridad**: un dibujo con TramitNow en el centro y cada ETT con su candado. Las conexiones «fluyen» y el centro
  late.
- **Pie**: la marca TramitNow en grande y semitransparente.
- **Barra inferior de «Pide una demo»**: ahora también se esconde al llegar al pie.

Con «reducir movimiento» activado, nada de esto se mueve: los contadores muestran el número final, el manifiesto se
ve entero y los perfiles no pasan solos.

## Dudas y pendientes

- Siguen pendientes los datos de contacto reales, los textos legales y si las maquetas se cambian por capturas
  reales.
- **Por confirmar**: los pasos de «Cómo empezamos» no llevan plazos. Si hay unos plazos habituales, por ejemplo «en
  4 semanas», se pueden añadir.
