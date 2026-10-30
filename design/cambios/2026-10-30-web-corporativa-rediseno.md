# Web corporativa: rediseño con las referencias del diseñador

- **Fecha**: 2026-10-30
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, (pendiente)
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/web.html (mejor en una ventana ancha y
  bajando poco a poco)

## Resumen

Rediseño de la web de `2026-10-30-web-corporativa.md` con las referencias que pasó el diseñador:

| Referencia | Qué se ha tomado |
|---|---|
| Holded | Portada clara con el titular grande y centrado, el punto final en color y la maqueta del producto debajo. Titulares cortos («Selecciona. Contrata. Factura.»). Barra inferior con «Pide una demo» |
| Perk | Cabecera flotante y redondeada |
| Factorial | Degradado muy suave de fondo en la portada y franja en movimiento |
| harbour.space | Iconos de línea que se dibujan al aparecer y contenido que aparece al hacer scroll |

No se ha copiado lo que no tenemos o no hace falta: valoraciones, «+17.000 empresas», logos de clientes, demos con
IA ni aviso de cookies (la web no usa cookies de seguimiento). Los textos son los mismos, con algunos titulares
nuevos, en castellano y catalán.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/web/WebCorporativa.jsx` | — | Toda la página |
| `src/web/animaciones.jsx` | — | **Nuevo**: aparecer al entrar en pantalla, iconos que se dibujan y titular palabra a palabra |
| `src/web/web.css` | — | **Nuevo**: animaciones (trazo, palabras y franja) |
| `src/web/textos.js` | — | Titular de módulos, barra inferior y tarjeta «Y además, portales…» |
| `src/web/main.jsx` | — | Carga `web.css` |

## Cambios

1. **Cabecera flotante**:
   - Una «píldora» blanca semitransparente que se queda arriba y se compacta al bajar.
   - En el móvil, el menú se abre debajo.
2. **Portada clara**:
   - Fondo blanco con un degradado muy suave de los azules del logo.
   - Etiqueta «ERP para empresas de trabajo temporal».
   - Titular grande y centrado, que **aparece palabra a palabra**, con el punto final en azul claro.
   - Debajo, la **maqueta del ERP**: empieza inclinada y se endereza al hacer scroll. Lleva encima el móvil con el
     portal del trabajador.
3. **Franja en movimiento** con lo que pide la ley (CPD, CCC, Sistema RED, PRL…). Se para al pasar el ratón.
4. **Cómo funciona**:
   - **En el ordenador avanza con el scroll**: a la izquierda, los 6 pasos uno debajo de otro, y el que está en el
     centro de la pantalla se resalta. A la derecha, una barra de progreso y la maqueta del paso, que se queda fija.
   - En el móvil y la tableta, pestañas.
5. **Módulos en tarjetas de distintos tamaños**:
   - Titular «Selecciona. Contrata. Factura.».
   - Horas e incidencias y Contratos y altas ocupan dos columnas y llevan una mini maqueta (el parte semanal y los
     5 pasos del alta). Facturación lleva la factura de septiembre.
   - Una tarjeta azul, «Y además, portales…», lleva a Portales.
6. **Iconos que se dibujan solos** al aparecer: en los módulos, los portales, las ventajas, la seguridad y el
   acompañamiento.
7. **Contenido que aparece al bajar**: títulos, tarjetas, preguntas frecuentes y formulario suben suavemente, uno
   detrás de otro.
8. **El azul oscuro**, solo en «Por qué TramitNow» y en el pie.
9. **Barra inferior fija** («¿Te enseñamos TramitNow en 30 minutos?» y «Pide una demo»). Aparece al dejar atrás la
   portada y se esconde al llegar al formulario.

### Movimiento reducido
Si la persona tiene activado «reducir movimiento» en su ordenador o su móvil, no hay animaciones: todo se ve
directamente, la franja no se mueve y la maqueta de la portada no se inclina.

## Dudas y pendientes

- Siguen pendientes los datos de contacto reales, los textos legales y si las maquetas se cambian por capturas
  reales (ver la nota anterior).
- **Para Enric**: las animaciones usan IntersectionObserver y CSS, sin librerías. Si la web se genera como HTML
  estático, el contenido tiene que verse aunque no cargue el JavaScript.
