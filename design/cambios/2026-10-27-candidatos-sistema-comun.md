# Candidatos: piloto del sistema visual común

- **Fecha**: 2026-10-27
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, aún sin commit
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/#/candidatos. Abrir una ficha (icono del ojo),
  "Asignar", "Contactar", "Importar de portales" y "Nuevo candidato".

## Resumen

Cada pantalla venía de una maqueta distinta y tenía su propia forma de cabecera, botones, colores y ventanas.
Se crea un juego de componentes comunes (`src/ui/`) y se aplica primero a Candidatos como piloto. Si se
valida, se aplicará igual al resto de pantallas.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/ui/*` (nuevo) | — | Componentes comunes |
| `src/views/CandidatosView.jsx` | `design/candidatos.html` | Toda la pantalla |
| `src/App.tsx` | — | El área de contenido ya no se ensancha con tablas anchas (`min-w-0`) |

## Normas del sistema común

- **Una sola plantilla de página**: cabecera de página (título, contador, subtítulo de una línea, acciones a
  la derecha), indicadores y una tarjeta con filtros y contenido. Ancho máximo `max-w-screen-2xl`, márgenes `px-6 py-5`.
- **Acciones**: como mucho un botón principal (índigo) por pantalla o ventana; el resto, secundarios (blancos con borde).
- **Color**: `slate` para la estructura y el índigo para la acción. Para los estados, verde (correcto), ámbar
  (pendiente), rosa (error), azul (informativo) e índigo (en curso). Sin degradados ni colores decorativos:
  desaparecen el azul como color principal, el morado, el cian y el naranja.
- **Esquinas**: `rounded-lg` en controles y `rounded-xl` en tarjetas y ventanas. **Sombras**: `shadow-xs` en
  tarjetas y `shadow-lg` solo en menús, paneles y ventanas.
- **Texto**: título de página `text-lg font-semibold`, títulos de bloque `text-sm font-semibold`, texto `text-xs`
  y auxiliar `text-[11px]`. Sin `font-black`, sin títulos en mayúsculas forzadas y sin "&" en los textos.
- **Ventanas y paneles**: cabecera blanca con título y aspa, contenido y pie gris con las acciones a la derecha.
  Todas se cierran con Esc.

## Cambios en Candidatos

### Cabecera de la página

- **Antes**: barra propia con migas de pan ("Talentia Express ETT › Gestión de Talento › Candidatos"), píldora
  "Conexión Portales: InfoJobs & LinkedIn Activos" y botones; debajo, un bloque con título, icono, descripción larga
  y tres mini indicadores de colores.
- **Ahora**: "Candidatos" + contador, una línea de subtítulo y dos acciones: "Importar de portales" (secundario) y
  "Nuevo candidato" (principal). Sin migas (es un listado), sin píldora de conexión y sin nombre de ETT.

### Indicadores y vistas rápidas

- **Antes**: tres indicadores arriba y, aparte, cuatro botones redondos de "Vistas rápidas" con los mismos números.
- **Ahora**: cuatro indicadores que también filtran (Todos, Disponibles ya, En misión, Documentación o RGPD pendiente).
  El activo lleva el borde índigo.

### Filtros

- Una sola fila dentro de la tarjeta de la tabla: buscador, tres desplegables sin etiqueta delante (la primera opción
  hace de etiqueta: "Todos los estados", "Toda la documentación", "Todos los orígenes"), "Limpiar" cuando hay
  filtros y, a la derecha, el cambio tabla/tarjetas.
- Selección múltiple: la barra negra pasa a una franja índigo clara encima de la tabla con "Asignar a petición"
  (principal), "Contactar" y "Pedir documentación".

### Tabla

- **Antes**: 11 columnas, cabeceras en mayúsculas, avatar con degradado, código del candidato junto al nombre,
  tres columnas separadas para DNI, NSS y RGPD, logotipos de color para el origen y cajas azules para la misión.
- **Ahora**: 8 columnas: Candidato, Contacto, Ubicación, **Documentación**, Origen, Estado, Petición o misión y
  acciones.
  - Documentación: tres etiquetas pequeñas, "DNI", "NSS" y "RGPD", en verde, ámbar o rosa. Al pasar el ratón,
    el detalle (número, caducidad).
  - Avatar: iniciales en índigo claro, sin degradado.
  - Misión: texto normal en dos líneas.
  - Acciones de fila: "Asignar" (secundario) y los iconos de contactar y ver ficha.
- Sin resultados: mensaje y botón "Limpiar filtros" dentro de la tarjeta.

### Ficha del candidato (panel lateral)

- **Antes**: cabecera negra con avatar con degradado, barra gris oscura con teléfono, email y botones, y pestañas
  con iconos y nombres largos ("Resumen & Alertas", "Perfil Profesional & Carnets"...).
- **Ahora**: cabecera blanca (avatar, nombre, estado, categoría, código, origen, teléfono y email). Pestañas comunes
  sin iconos y con nombres cortos: Resumen, Datos personales, Perfil y carnets, Disponibilidad, Documentos y RGPD,
  Candidaturas, Historial. Pie con "Contactar" y "Asignar a petición".

### Ventanas (asignar, contactar, alta rápida, importar, acciones masivas)

- Cabeceras negras o con degradado azul → blancas. Botones con el estilo común; "Confirmar asignación" pasa de
  verde a principal índigo. Logotipos de portales en gris neutro.

## Componentes y estilo

- **Nuevos** (`src/ui/`):
  - `Button` (principal, secundario, discreto, peligro) e `IconButton`.
  - `Badge` (etiqueta de estado con tonos fijos) y `Avatar`.
  - `Page`, `PageHeader`, `Card`, `SectionTitle`, `KpiTile` (indicador que puede filtrar), `EmptyState` y `Notice`.
  - `Tabs` y `Segmented` (selector tabla/tarjetas).
  - `Drawer` (panel lateral) y `Modal` (ventana).
  - `SearchInput`, `Select`, `Field` y `TextInput`.
- **Colores, tamaños o iconos nuevos**: ninguno; se reducen.
- `scripts/import-design.py` admite maquetas sin barra lateral propia.

## Datos

Sin cambios de datos. Los textos de estado se muestran más cortos ("En misión", "En selección", "Por contactar"),
pero los valores guardados son los mismos.

## Dudas y pendientes

- Las ventanas internas (asistente, contactar, alta, importar, masivas) se han unificado por estilo, pero aún no usan
  los componentes `Modal` y `Button`. Se pasarán cuando se valide el piloto.
- Algunos textos interiores siguen con mayúsculas en cada palabra ("Competencias y Certificados"); se dejarán en
  minúscula al pasar las demás pantallas.
- Los datos de ejemplo de Candidatos (DNI, NSS, emails de dominios reales) vienen de la maqueta. Habría que cambiarlos
  por valores claramente inventados (`@example.com`, `00000000T`).
- La píldora de conexión con portales desaparece de la cabecera; su sitio natural es la ventana "Importar de portales".
