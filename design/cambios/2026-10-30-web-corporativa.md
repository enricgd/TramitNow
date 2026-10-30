# Web corporativa de TramitNow: primera versión

- **Fecha**: 2026-10-30
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, (pendiente)
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/web.html

## Resumen

Primera versión de la web corporativa, para gerentes y responsables de ETT. Es una página larga con los apartados
del menú, en **castellano y catalán**.

En real irá en la raíz, **tramitnow.com**, y el resto en subdominios:
- El ERP, en `app.tramitnow.com`.
- Los portales de cada ETT, en `{ett}.tramitnow.com/trabajadores` y `{ett}.tramitnow.com/empresas`.

Decisiones del diseñador:
- No se habla del sistema de la competencia (ni de servidores ni de escritorios remotos): se destacan las ventajas
  propias.
- No hay precios: solo «Pedir presupuesto».
- Se pueden prometer la migración de datos, la formación y los servidores en la UE.
- Los datos de contacto son de ejemplo de momento.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `web.html`, `src/web/main.jsx` | — | **Nuevo**: página de la web corporativa, aparte del ERP |
| `src/web/WebCorporativa.jsx` | — | **Nuevo**: la web |
| `src/web/textos.js` | — | **Nuevo**: textos en castellano y catalán, y datos de contacto (de ejemplo) |
| `vite.config.ts` | — | Compila también `web.html` |

## Cambios

### Apartados
1. **Cabecera fija**:
   - Logo y menú: Producto, Cómo funciona, Portales, Seguridad y Contacto.
   - Selector **ES / CA**, que se recuerda en el navegador.
   - «Acceder» (al ERP) y «Pide una demo».
   - En el móvil, el menú se abre con un botón.
2. **Portada**:
   - Titular: «El ERP de tu ETT, en la nube».
   - Texto: «Peticiones, selección, contratos, horas y facturación en un solo lugar, para toda tu red de
     sucursales».
   - Botones «Pide una demo» y «Ver cómo funciona», y dos notas: datos en servidores de la UE y migración y
     formación incluidas.
   - A la derecha, una maqueta del ERP en el navegador y del portal del trabajador en el móvil.
3. **Hecho para ETT**: autorización administrativa, CCC por provincia, Sistema RED, CPD, prevención de riesgos
   (RD 216/1999), garantía financiera, y facturas y rectificativas.
4. **Cómo funciona**: el recorrido en 6 pestañas (presupuesto, petición, selección, contrato y alta, horas y
   factura). Cada una tiene su explicación, tres puntos y una maqueta de la pantalla con los datos de ejemplo de la
   demo.
5. **Producto**: tarjetas con los 9 módulos del ERP.
6. **Portales**: portal del trabajador y Área de empresas, con lo que hace cada uno y su dirección.
7. **Por qué TramitNow** (en positivo):
   - Todas las sucursales juntas y acceso desde cualquier lugar.
   - Siempre al día y copias de seguridad automáticas.
   - Permisos por rol y sucursal, y todo queda registrado.
8. **Seguridad**: servidores en la UE, cada ETT separada, RGPD y conexión cifrada.
9. **Te acompañamos**: migración de datos, formación del equipo y soporte en castellano y catalán.
10. **Precio a la medida** de cada ETT, con el botón «Pedir presupuesto».
11. **Preguntas frecuentes**, desplegables.
12. **Pide una demo**: formulario con nombre, ETT, correo, teléfono, número de sucursales, mensaje y privacidad, y
    un mensaje de gracias. En la demo no envía nada.
13. **Pie**: logo, menú, contacto y enlaces legales.

### Estilo
- **Colores del logo**: azul marino `#003A70` y azul claro `#4197CB`, con el degradado y el botón de la pantalla de
  acceso del ERP. El índigo de la aplicación solo sale en las maquetas.
- Titulares grandes, mucho aire y fondos que alternan blanco y gris muy claro.
- Sin logos de clientes, testimonios ni cifras inventadas.

## Dudas y pendientes

- **Por confirmar**:
  - Los datos de contacto reales: correo, teléfono y dirección (`src/web/textos.js`).
  - Los textos legales: aviso legal, privacidad y cookies. Ahora son enlaces vacíos.
  - Si las maquetas se cambian por capturas reales de la aplicación.
- **Para Enric**:
  - Despliegue propio en `tramitnow.com`, separado de `app.` y de los portales.
  - «Acceder» tiene que llevar a `app.tramitnow.com`.
  - El formulario de demo tiene que enviar la solicitud, por correo o al CRM, con el consentimiento de privacidad.
  - Para que salga bien en buscadores, conviene que la web se genere como HTML estático (sin depender de
    JavaScript para el contenido), con título y descripción en cada idioma.
