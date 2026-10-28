# Empresas: categoría, listas con alta de opciones y gestión de documentos

- **Fecha**: 2026-10-28
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, aún sin commit
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/#/empresas

## Resumen

El listado muestra la categoría de cada empresa y se puede filtrar por ella. El sector deja de ser texto libre y
pasa a una lista con botón "Añadir" para dar de alta un sector nuevo. Ese mismo recurso queda como componente común
para todo lo que se pueda categorizar. El rol del contacto admite "Otro" con texto libre. Los documentos se pueden
ver en un visor y eliminar con confirmación.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/EmpresasView.jsx` | `design/empresas.html` | Listado, formulario de empresa (sector), formulario de contacto (rol), pestaña Documentos |
| `src/ui/Fields.tsx` | — | Nuevo componente `SelectConAlta` |

## Cambios

### Listado: categoría
- **Antes**: el sector salía en gris pequeño bajo el nombre.
- **Ahora**:
  - Columna **Categoría** con etiqueta gris (Logística y almacén, Industria metalúrgica, Agroalimentario,
    Hostelería y eventos...).
  - Bajo el nombre se ve el nombre comercial, si es distinto.
  - Nuevo filtro **"Todas las categorías"** junto a los demás.
  - Una categoría creada desde el formulario aparece también en el filtro.

### Sector o actividad: lista con "Añadir"
- **Antes**: campo de texto libre ("Logística, Metalurgia, Hostelería, Agro...").
- **Ahora**: desplegable ordenado alfabéticamente y botón **"+ Añadir"** a la derecha.
- **Comportamiento**:
  - "Añadir" cambia la fila a un campo "Nombre del nuevo sector" con los botones **Guardar** y ✕.
  - **Enter** guarda y **Esc** cancela, sin cerrar el panel.
  - Al guardar, el sector se añade a la lista y queda elegido.
  - Si ya existía (sin distinguir mayúsculas), se elige el existente en vez de duplicarlo.
  - Si se guarda vacío: "Escribe un nombre.".
- **Recurso común**: `SelectConAlta` en `src/ui/Fields.tsx`. Usarlo en todo lo que sea categorizable: puestos,
  convenios, tipos de documento, motivos, etc.

### Rol / perfil del contacto: "Otro"
- Se añade la opción **"Otro"** al final de los roles (Comercial, Solicitante, Operativo...).
- Al marcarla aparece un campo: "¿Qué función tiene? Ej. Responsable de calidad". Es obligatorio si "Otro" está marcado.
- Se guarda con el texto escrito, que aparece en la ficha del contacto como una etiqueta más y como rol elegible al editarlo.
- Corregido: los roles sin marcar se ponían en índigo oscuro al pasar el ratón y el texto no se leía.

### Documentos
- **Antes**: "Ver" solo mostraba un aviso ("Visualizando CIF demo..."). Solo había "Descargar" o "Ver", y no se podía eliminar.
- **Ahora**:
  - **Cada documento**: icono, nombre (se puede pulsar), quién lo subió, fecha y tamaño, etiqueta de tipo
    (Contrato, CIF) y de estado (Validado en verde, Borrador en ámbar).
  - **Acciones**: "Ver", descargar (icono) y **eliminar** (icono de papelera, en rosa al pasar el ratón).
  - **Visor** (ventana ancha):
    - Barra con "Página 1 de N" y zoom (50 %–200 %).
    - Vista previa del documento a la izquierda y sus datos a la derecha: tipo, empresa, subido por, fecha, tamaño y páginas.
    - Pie: "Eliminar" (a la izquierda, en rosa), "Descargar" y "Cerrar".
  - **Eliminar** (desde la lista o desde el visor): confirmación "¿Eliminar este documento?".
    - El texto dice qué se borra, que no se puede deshacer y que en el historial quedará quién lo eliminó y cuándo.
    - Botones: "Cancelar" y "Eliminar" (peligro).
    - Al confirmar se quita de la lista, se cierra el visor si estaba abierto y sale un aviso.
  - **Sin documentos**: "Sin documentos" con el botón "Subir documento".

## Componentes y estilo

- **Nuevo**: `SelectConAlta` (`src/ui/Fields.tsx`): desplegable con alta de opciones.
- **Iconos nuevos de lucide**: `Upload`, `Download`, `ZoomIn` y `ZoomOut`.
- Sin colores nuevos.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Empresa | sector | cambiado | referencia a la tabla de sectores (antes texto libre) | Valores de ejemplo pasados a categorías cortas |
| Sector | nombre | nuevo (tabla maestra) | texto, único sin distinguir mayúsculas | Se puede dar de alta desde el formulario; ¿por ETT o global? |
| Contacto | types | cambiado | lista de roles; puede incluir texto libre ("Otro") | |
| Documento de empresa | id, nombre, tipo, subidoPor, fecha, tamano, estado, paginas | nuevo (antes fijo en pantalla) | tipo: Contrato / CIF / ...; estado: Validado / Borrador | El fichero iría a Storage |
| Documento de empresa | borrado | nuevo | eliminación definitiva + entrada en el historial | Confirmar si es borrado real o lógico (ver dudas) |

## Dudas y pendientes

- Para Enric:
  - ¿Quién puede dar de alta sectores? Puede hacerlo cualquier usuario, o solo administración (y el resto lo propone).
  - ¿Los sectores son de cada ETT o comunes?
  - La tabla maestra encajaría en el futuro apartado "Tablas maestras" del menú.
- Para Enric: el borrado de documentos. Se ha diseñado como definitivo, como pide el diseñador por seguridad (que la
  empresa no conserve el documento), dejando solo el rastro en el historial. Hay que confirmar si la normativa obliga
  a conservar algún documento (por ejemplo, contratos) y bloquear el borrado en esos tipos.
- La vista previa es simulada. En real, el visor mostraría el PDF o la imagen desde Storage.
- "Subir documento" sigue simulado (aviso).
