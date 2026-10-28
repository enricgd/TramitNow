# Todas las pantallas: sistema visual común

- **Fecha**: 2026-10-27
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, aún sin commit
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173 y recorrer el menú: Empresas,
  Presupuestos, Peticiones, Candidatos, Contratos y altas y Mi ETT.

## Resumen

Tras validar el piloto de Candidatos (ver `2026-10-27-candidatos-sistema-comun.md`), el mismo sistema se aplica
al resto de pantallas. Todas usan ahora la cabecera de página común, los mismos indicadores, pestañas, filtros,
etiquetas de estado y botones, y las mismas normas de color, esquinas, sombras y texto.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/PeticionesView.jsx` | `design/peticiones.html` | Barra superior, listado, cabecera de la ficha, indicadores, pestañas, ventanas |
| `src/views/LaboralView.jsx` | `design/laboral.html` | Migas, cabecera, pestañas de petición, indicadores, aviso de condiciones |
| `src/views/EmpresasView.jsx` | `design/empresas.html` | Aviso de contexto, cabecera, listado, cabecera de la ficha, pestañas |
| `src/views/PresupuestosView.jsx` | `design/presupuestos.html` | Cabecera oscura de módulo, listado, cabecera del detalle, indicadores, pestañas, estados |
| `src/views/FichaEttView.jsx` | `design/fichaett.html` | Cabecera, identidad, pestañas |
| `src/ui/Layout.tsx`, `src/ui/Tabs.tsx` | — | `KpiTile` admite texto auxiliar y contenido; migas con acción; pestañas con aviso |

## Cambios comunes a todas

- **Cabecera de página** (`PageHeader`): título, contador o estado, una línea de datos clave y, a la derecha,
  como mucho un botón principal y dos secundarios. Las fichas llevan migas ("Peticiones › PET-2026-0048") que
  vuelven al listado.
- **Fuera de las páginas**:
  - Barras superiores propias, migas con "ERP ETT" y cajas de "Presupuesto origen bloqueado".
  - Selectores de densidad ("Cómodo / Compacto") y botones de "información del prototipo".
  - Avatares con degradado.
- **Indicadores** (`KpiTile`): misma tarjeta blanca con punto de color, cifra y una línea de ayuda.
- **Pestañas** (`Tabs`): subrayado índigo, sin iconos, nombres cortos y contadores en gris.
- **Listados**: la búsqueda y los filtros van dentro de la tarjeta de la tabla. Cabeceras de tabla en minúscula,
  filas compactas y acción "Abrir", "Ver" o "Editar" como botón secundario pequeño.
- **Color**: el índigo es el único color de acción. Los botones principales verdes (Empresas) o morados
  (Presupuestos) pasan a índigo. Sin degradados ni morado, cian, naranja o rojo puro.
- **Ventanas y paneles**: fondo `bg-slate-900/30` sin desenfoque y cabeceras blancas en lugar de negras.
- **Texto**: sin `font-bold`/`font-black` (pasan a `font-semibold`), sin mayúsculas forzadas y sin "&" en los textos.
- **Al entrar** en Empresas, Presupuestos y Peticiones se ve primero el listado; antes se abría directamente una ficha.

## Cambios por pantalla

### Peticiones
- Listado: "Peticiones" con cuatro indicadores (En selección, Posiciones solicitadas, Candidaturas de portales,
  Tiempo medio de cobertura), buscador y filtro "Activas / Todas / Cerradas".
- Ficha: migas, título, estado y una línea con cliente, centro, fechas y presupuesto de origen.
  - Acciones: "Portales (5)" y "Publicar cambios".
  - Indicadores: cobertura total con barra, cada posición y portales.
  - Pestañas: Resumen, Presupuesto, Posiciones, Horarios y turnos (con punto ámbar si hay cambios sin guardar),
    Difusión en portales, Contratos y anexos, Trazabilidad.

### Contratos y altas
- Cabecera con migas "Contratos y altas › PET-2026-0048", estado "En incorporación" y acciones "Sincronizar",
  "Enviar contratos a firma" y "Tramitar altas pendientes" (principal).
- **Se quita la barra de pestañas de la petición** (Resumen, Presupuesto heredado, Posiciones...): repetía la ficha
  de Peticiones y en esta pantalla solo funcionaba "Laboral".
- Cinco indicadores comunes (asignadas, completos, pendientes, bloqueos, progreso).
- Las condiciones del presupuesto pasan a un aviso gris de una línea.

### Empresas
- El aviso ámbar de "Contexto activo" pasa a un aviso dentro de la página.
- Listado:
  - Preparación: etiqueta de estado y, debajo, "✓ Alta ✓ Presupuesto · Operativa · Factura".
  - El texto de "alta progresiva" pasa a un aviso informativo al pie.
- Ficha:
  - Acciones: "Editar ficha" y "Crear presupuesto". "Añadir contacto" y "Añadir centro" quedan dentro de sus pestañas.
  - Se quita el bloque de pasos 1-2-3-4 de la cabecera: el detalle está en la pestaña Resumen.

### Presupuestos
- **Desaparece la cabecera oscura de módulo** ("ERP ETT · v3 Cotización").
  - Sus acciones van a la cabecera de página: Editar o Nueva versión; en edición, Cancelar, Guardar borrador y
    Guardar cambios.
  - El estado de guardado pasa a una etiqueta junto al título: "Cambios sin guardar" o "Guardado".
  - El cambio de rol de la demo pasa a un desplegable discreto: "Ver como dirección / comercial".
- Indicadores: tarifa media, coste medio, margen (con rol comercial salen como "—") y Petición, con el botón
  "Crear petición" cuando el presupuesto está aceptado.
- Estados con la etiqueta común: Borrador (gris), En preparación (ámbar), Enviado y Pendiente de firma (azul),
  Aceptado (verde), Rechazado (rosa).

### Mi ETT
- Cabecera:
  - Estado: etiquetas "ETT acreditada" y "Configuración al 82%".
  - Línea de datos: razón social, CIF, sede y última actualización.
  - Acciones: "Exportar PDF" y "Editar datos fiscales".
- Pestañas comunes; Facturación lleva el punto ámbar mientras falte el IBAN.

## Componentes y estilo

- **Modificados**:
  - `KpiTile`: admite `hint` (línea auxiliar) y contenido propio (barra, botón).
  - `PageHeader`: las migas admiten acción (`onClick`).
  - `Tabs`: admite `alert` (punto ámbar).
- **Colores, tamaños o iconos nuevos**: ninguno.

## Datos

- Sin cambios de campos.
- **Fotos e imágenes externas eliminadas**: los candidatos de Peticiones y Contratos y altas tenían fotos de personas
  reales de un banco de imágenes. Ahora se ven iniciales, y el campo `foto` queda a `null`. El logotipo de Mi ETT
  tampoco carga ya una imagen externa (`logoUrl: null`).

## Ventanas y paneles con los componentes comunes

- Las ventanas y paneles de todas las pantallas usan ahora `Modal` y `Drawer` (`src/ui/Overlay.tsx`): 27 en total.
  - **Candidatos**: asignar a petición, contactar, alta rápida, importar de portales, acción masiva.
  - **Peticiones**: asignar candidato a la plaza, ficha personal, copiar horario, personalización de portal,
    vista previa, restaurar contenido común, sincronización con portales.
  - **Contratos y altas**: panel del expediente y ventana de cada trámite.
  - **Empresas**: descartar cambios, reglas de diseño (antes en negro) y los formularios del panel de alta y edición.
  - **Presupuestos**: paneles de posición y de concepto, resumen de cambios, eliminar posición, nueva versión.
  - **Mi ETT**: paneles de datos fiscales, facturación, sucursal y usuario, y la confirmación de cambio sensible.
- **Todas iguales**:
  - Cabecera blanca con título corto, subtítulo y aspa.
  - Contenido con margen de 20 px y pie gris con las acciones a la derecha.
  - Se cierran con Esc o pulsando fuera.
  - Desaparecen los iconos de colores de las cabeceras.
- **Confirmaciones** ("¿Eliminar esta posición?", "¿Descartar los cambios sin guardar?"...): la pregunta es el título,
  una frase explica la consecuencia y los botones van en el pie.
- El formulario de alta rápida de Candidatos sigue enviándose desde el botón del pie (`form="form-alta-candidato"`).
- `Drawer`: la barra bajo la cabecera (pestañas, avisos) ya no lleva margen propio; cada barra pone el suyo.

## Títulos en minúscula

- Títulos, etiquetas de campo, cabeceras de tabla, botones y pestañas pasan a llevar mayúscula solo al principio.
  Por ejemplo, "Configuración Independiente de Horario por Posición" pasa a "Configuración independiente de
  horario por posición".
- **Se mantienen** las siglas (ETT, CPD, PRL, TGSS, IBAN, IVA...), los códigos (PET-2026-0048, POS-001), los nombres
  de personas, empresas y lugares, los nombres de portales (InfoJobs, LinkedIn...) y "Seguridad Social".
- **No se han tocado los datos**: nombres de turnos, puestos, convenios de ejemplo o plantillas siguen como estaban.
- Algunos textos cambian además de redacción: "Editar Copy" pasa a "Editar texto", "Sincronizar a Portales" a
  "Sincronizar con portales", "Match Recomendado" a "Recomendado" y "Tarjetas Visuales" a "Tarjetas".

## Dudas y pendientes

- Los botones dentro de las ventanas mantienen sus clases (ya unificadas), pero aún no son el componente `Button`.
- Los datos de ejemplo (turnos, puestos, plantillas, convenios) siguen con mayúscula en cada palabra. Si se quiere,
  se cambian también, pero son datos, no textos de la interfaz.
- Para Enric: "Contratos y altas" muestra una sola petición. Falta decidir si el menú debe abrir antes una bandeja
  con todas las peticiones en incorporación (la vista "bandeja laboral global" ya existe en la demo).
- Para Enric: el cambio de rol de Presupuestos es solo para la demo; en real dependerá del perfil del usuario.
- Los datos de ejemplo de las maquetas incluyen DNI con formato válido y emails de dominios reales; conviene
  cambiarlos por valores claramente inventados.
