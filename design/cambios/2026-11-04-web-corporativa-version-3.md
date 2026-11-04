# Web corporativa: versión 3, mezcla de las dos, con Poppins

- **Fecha**: 2026-11-04
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, 2fc090d
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/web3.html. La barra de arriba enlaza las tres
  versiones: `web.html` (1), `web2.html` (2, estilo Perk) y `web3.html` (3, mezcla).

## Resumen

El diseñador pidió una tercera versión que mezcle las otras dos y use **Poppins, la letra del logo**. Es otra página
aparte, para comparar. Los textos son los mismos de las otras versiones, en castellano y catalán.

## Qué toma de cada versión

| De la versión 2 (estilo Perk) | De la versión 1 |
|---|---|
| Fondo cálido (`#FAF8F4`) y bloques grandes muy redondeados (`#F1EDE4`) | Los azules del logo y su degradado en los bloques oscuros (franja, seguridad, cierre y tarjetas de portales) |
| Botones en forma de píldora y cabecera flotante | Botón principal en el azul `#1769aa` y punto final del titular en azul claro |
| El producto en pestañas dentro de un gran bloque | Titular que aparece palabra a palabra |
| Cuatro pilares | Maqueta que se endereza al bajar, con avisos flotantes y manchas de color en el fondo |
| Carrusel de funciones con flechas | Cifras con contador y manifiesto que se ilumina al bajar |
| «Potente para tu ETT, sencillo para todos» | Iconos que se dibujan solos y tarjetas con foco de luz que sigue al ratón |
| Preguntas frecuentes con «+» | Dibujo animado de seguridad y línea de «Cómo empezamos» que se rellena al bajar |
| Cierre en un gran bloque oscuro | Barra de progreso de lectura y barra inferior de «Pide una demo» |

Además:
- Las **pestañas del producto pasan solas** cada 7 segundos, con una barrita que se llena, hasta que se pulsa una (como
  los perfiles de la versión 1).
- El precio a medida va junto al formulario de demo.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `web3.html`, `src/web/mezcla.jsx` | — | **Nuevo**: página de la versión 3, con Poppins |
| `src/web/WebMezcla.jsx` | — | **Nuevo**: la versión 3 |
| `src/web/WebCorporativa.jsx` | — | Exporta el dibujo de seguridad y la línea de «Cómo empezamos». El texto del círculo se reduce para que quepa con Poppins |
| `src/web/WebPerk.jsx`, `src/web/WebCorporativa.jsx` | — | La barra de la demo enlaza las tres versiones |
| `vite.config.ts` | — | Compila también `web3.html` |

## Dudas y pendientes

- **Decidir** la versión definitiva. Después se borran las otras dos y se ordena el código: ahora cada versión tiene
  su propia copia de la maqueta del producto y del formulario.
- **Para Enric**: Poppins se carga desde Google Fonts. Si es la definitiva, conviene servirla desde nuestro propio
  dominio (por el RGPD y por la velocidad). Al ser la letra del logo, podría usarse también en el ERP y en los
  portales, si se decide.
