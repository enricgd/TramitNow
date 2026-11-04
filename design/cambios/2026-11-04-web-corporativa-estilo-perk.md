# Web corporativa: versión «estilo Perk», aparte para comparar

- **Fecha**: 2026-11-04
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, 0dbdb8a
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/web2.html. Desde la barra de arriba se pasa
  de una versión a la otra; la actual sigue en http://localhost:5173/web.html.

## Resumen

El diseñador quería ver cómo sería la web si se pareciera más a perk.com. Es una **segunda versión aparte**
(`web2.html`), para elegir entre las dos. Usa los mismos textos en castellano y catalán, y los propios de esta versión
están en un fichero aparte.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `web2.html`, `src/web/perk.jsx` | — | **Nuevo**: página de la versión estilo Perk, con la letra DM Sans |
| `src/web/WebPerk.jsx` | — | **Nuevo**: la versión estilo Perk |
| `src/web/textosPerk.js` | — | **Nuevo**: textos propios de esta versión, en castellano y catalán |
| `src/web/WebCorporativa.jsx` | — | Exporta las maquetas y enlaza a la versión estilo Perk |
| `vite.config.ts` | — | Compila también `web2.html` |

## Cambios

### Estilo
- **Fondo crema** (`#F4F2EC`) en vez de blanco, y **bloques beige** (`#EAE7DE`) con esquinas muy redondeadas, planos y
  sin sombras.
- **Texto en el azul marino del logo**. El **azul claro del logo** (`#4197CB`) es el único acento: el botón «Pide una
  demo», relleno y con el texto marino, como la lima de Perk.
- **Letra DM Sans de peso medio**, grande y con las letras juntas. Solo en esta página; el ERP y los portales no
  cambian.
- Animaciones discretas: los bloques aparecen al bajar, hay un contador y un carrusel.

### Estructura
1. **Cabecera flotante** en crema y portada con el titular centrado, los botones en forma de píldora y el producto
   (el ERP y el portal del trabajador) dentro de un gran bloque beige.
2. **Franja oscura** con lo que pide la ley, en el sitio de los logos de clientes de Perk.
3. **Frase con cifra**: «Un solo programa. **6**\* pasos del presupuesto a la factura.» El asterisco explica los seis
   pasos.
4. **El producto en pestañas**, dentro de un bloque beige: Presupuesto, Selección, Contrato y alta, Horas y Factura.
   Cada una lleva su texto, lo que incluye y la maqueta.
5. **Cuatro pilares**: Cumplimiento, Visibilidad, Sencillez y Tiempo.
6. **Carrusel de funciones**, con flechas: Horas, CPD, Caducidades, CCC, Facturas, Prórrogas y Portales. Al pasar el
   ratón, la tarjeta se marca en azul claro.
7. **«Potente para tu ETT, sencillo para todos»**: dirección, selección, laboral y administración, y en azul oscuro
   las empresas cliente y los trabajadores (los portales).
8. **Todo lo que necesitas saber**: cómo empezamos, seguridad (en azul oscuro) y preguntas frecuentes.
9. **Pide una demo** (con el texto del precio a medida) y el **cierre** en un bloque azul oscuro: «Tu equipo hace el
   trabajo de verdad. TramitNow se ocupa del resto.».
10. **Pie** claro con la marca TramitNow en grande, casi transparente.

No se ha copiado lo que no tenemos: valoraciones, «10.000+ empresas», casos de clientes con fotos ni cifras de ahorro.

## Dudas y pendientes

- **Decidir** con cuál de las dos versiones nos quedamos, o qué partes de cada una.
- **Para Enric**: DM Sans se carga desde Google Fonts. Si se queda esta versión, conviene servir la letra desde nuestro
  propio dominio (por el RGPD y por la velocidad).
