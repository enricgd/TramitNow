# Web corporativa: versión 4, con las nuevas webs de referencia

- **Fecha**: 2026-11-12
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, 90155af
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/web4.html. Para comparar, las versiones 1, 2 y 3 están enlazadas en la barra de arriba.

## Resumen

El diseñador pasó nueve webs de referencia de diseño, usabilidad y efectos:

- incredibles.dev
- developios.com
- nomu.store
- indisea.com
- plnty.app
- statusisup.com
- showcase.8am.com
- stripe.com
- revolut.com

Se hizo una **versión 4 aparte** (`web4.html`) que parte de la versión 3 (Poppins, azules del logo, fondo cálido) y toma
una idea concreta de cada referencia. Las versiones 1, 2 y 3 no cambian, salvo el enlace a la 4 en su barra de demo.
Sigue pendiente decidir qué versión se queda.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `web4.html`, `src/web/v4.jsx` | — | **Nuevos**: página y entrada (añaden IBM Plex Mono para las etiquetas) |
| `src/web/WebV4.jsx` | — | **Nuevo**: la versión 4 |
| `src/web/v4.css` | — | **Nuevo**: efectos de la versión 4 |
| `src/web/textosV4.js` | — | **Nuevo**: textos nuevos en castellano y catalán (el resto sale de `textos.js` y `textosPerk.js`) |
| `vite.config.ts` | — | Entrada `web4` |
| `src/web/WebCorporativa.jsx`, `WebPerk.jsx`, `WebMezcla.jsx` | — | Enlace «Versión 4» en la barra de demo |

## Cambios (de arriba abajo)

### Portada (idea de Stripe)
- Banda de **degradado de los azules del logo que se mueve despacio**, con tres manchas de color (azul, turquesa y violeta) flotando, **cortada en diagonal** abajo (`clip-path`).
- Titular blanco, alineado a la izquierda: «Tu ETT, del presupuesto a la factura.».
- Botones blanco («Pide una demo») y con borde («Ver cómo funciona»).
- A la derecha, la aplicación flota un poco (`.levita`) y lleva un aviso «Parte validado por el cliente».
- La cabecera flotante va en blanco sobre la banda y pasa a la versión clara al bajar.

### «Preparado para trabajar con»
- Etiqueta en letra monoespaciada (IBM Plex Mono, idea de statusisup) y los nombres en gris azulado: Contrat@, SILTRA, Sistema RED, Certific@2, Firma electrónica, Remesas SEPA.

### Manifiesto
- El mismo texto que se ilumina de la versión 3.

### «Un mes en tu ETT» (ideas de 8am, Revolut y nomu)
- **En pantalla ancha** la sección mide 5,2 pantallas de alto y su contenido se queda fijo (`sticky`):
  - A la izquierda, los seis pasos (.01 Presupuesto … .06 Factura) con su icono y una línea que se rellena. El paso activo se despliega con su texto; al pulsar uno, la página baja hasta él.
  - A la derecha, la pantalla de ese paso (las mismas maquetas de la versión 1) con un aviso del resultado que entra desde abajo: «Presupuesto aceptado por el cliente», «4 peticiones creadas, una por turno», «12 candidatos encajan con la plaza», «Contrato firmado y alta comunicada», «Parte validado por el cliente», «Factura emitida y enviada». Arriba a la derecha, «04 / 06».
- **En móvil o con «reducir movimiento»**: pestañas con icono (desplazables en horizontal) y debajo el paso con su pantalla.

### Mosaico de módulos (idea de Stripe)
- Siete tarjetas de distintos tamaños (cuadrícula de 6 columnas), cada una con una **miniatura que se mueve** cuando la sección entra en pantalla:
  - **Presupuestos**: barras que crecen y «15 % margen medio» que cuenta.
  - **CPD y contratos**: una firma que se dibuja y el sello «Firmado».
  - **Horas**: las casillas L–V de tres personas se validan una tras otra y aparece «Validado por el cliente».
  - **Factura**: las líneas aparecen una a una y la base imponible cuenta hasta 18.659,80 €. Los importes cuadran: 640 h × 17,90 €, 352 h × 19,55 € y 12 h extra × 26,85 €.
  - **Portal del trabajador** (tarjeta azul): un móvil al que llegan los avisos.
  - **Sucursales**: barras por sucursal con un punto verde que late.
  - **Avisos**: una pila de avisos que va rotando (NIE caducado, CPD pendientes, contratos que terminan, factura vencida).
- Las tarjetas mantienen la inclinación y el foco de luz al pasar el ratón (`TarjetaViva`).

### Conexiones (idea de Indisea)
- Sección azul. TramitNow en el centro, con un halo que late, y ocho conexiones alrededor unidas con **líneas que fluyen y puntos que viajan** por ellas:
  - Contrat@, Sistema RED, SILTRA y Certific@2
  - Bancos, Contabilidad, Firma electrónica y Portales de empleo
- En móvil, el logo arriba y las conexiones en una cuadrícula de 2 columnas.

### Pilares (idea de incredibles)
- Los cuatro pilares de la versión 3 como **tarjetas que se apilan** al bajar (`sticky`, cada una 26 px más abajo).
- Número .01–.04 en letra monoespaciada, icono que se dibuja y texto grande. La tercera tarjeta es azul.

### Seguridad, «Cómo empezamos», preguntas, formulario, cierre y pie
- Seguridad en azul oscuro con el dibujo de ETT separadas.
- «Cómo empezamos» en cuatro tarjetas .01–.04 que se activan cuando la línea de arriba las alcanza (idea de developios).
- El resto, como en la versión 3. El cierre usa la misma banda de degradado que la portada.

### Detalles generales
- **Grano** muy suave sobre toda la página (idea de incredibles; SVG `feTurbulence`, 6 % de opacidad).
- Etiquetas de sección en letra monoespaciada.
- Con «reducir movimiento» todo queda quieto: el recorrido pasa a pestañas, las miniaturas se ven en su estado final y no hay puntos viajando.

## Componentes y estilo

- Hooks nuevos en `WebV4.jsx`: `useAncho` (pantalla ancha) y `useAvanceFijo` (avance dentro de una sección con un bloque fijo).
  - Si la versión 4 se queda, conviene moverlos a `animaciones.jsx`.
- Sin librerías nuevas: CSS, `IntersectionObserver` y `requestAnimationFrame`.
  - No se ha puesto el scroll con inercia de incredibles (librería Lenis). Se puede añadir si se quiere.
- Letra nueva: **IBM Plex Mono** (Google Fonts), solo en las etiquetas y los números de paso.

## Datos

Sin cambios de datos. Todo son textos y cifras de ejemplo.

## Dudas y pendientes

- **Conexiones**: hay que confirmar con Enric cuáles serán reales en la primera versión. Contrat@, SILTRA, Sistema RED y Certific@2 son servicios públicos; «Contabilidad» y «Bancos» no nombran marcas a propósito.
- **Revolut** no se pudo abrir en el navegador integrado. Se tomó la idea de su forma de fijar el producto al hacer scroll, por lo que se conoce de la web.
- Decidir qué versión se queda (1, 2, 3 o 4) o qué partes de cada una.
