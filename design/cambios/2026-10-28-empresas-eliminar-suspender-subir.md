# Empresas: suspender o eliminar contactos y centros, facturación con listas y subida de documentos

- **Fecha**: 2026-10-28
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, c36fd59
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/#/empresas → abrir una empresa →
  pestañas Contactos, Centros, Facturación y Documentos ("Subir documento" → "Probar con archivos de ejemplo")

## Resumen

Regla general para todo lo que se pueda borrar: **siempre se confirma** y el mensaje avisa de que no se podrá
recuperar. Cuando tiene sentido, se ofrece una alternativa reversible: suspender un contacto o desactivar un centro.
Además, los datos de facturación pasan a ser listas ampliables y se diseña la ventana de subir documentos.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/EmpresasView.jsx` | `design/empresas.html` | Contactos, Centros, Facturación, Documentos y ventana de subida (`SubirDocumentos`) |
| `src/ui/Overlay.tsx` | — | Nuevo componente `Confirmar` |
| `src/ui/Fields.tsx` | — | `SelectConAlta` muestra el valor guardado aunque no esté en la lista |

## Cambios

### Confirmación común de borrado (`Confirmar`)
- Ventana con la pregunta como título ("¿Eliminar a Marta Gómez Arana?"), una explicación de qué se pierde y siempre
  el aviso en rosa "Una vez eliminado no se podrá recuperar.".
- Botones: Cancelar · alternativa reversible (si la hay) · "Eliminar definitivamente" (estilo peligro).
- La usan contactos, centros y documentos. Debe usarse en cualquier borrado de la app.

### Contactos
- Cada tarjeta tiene tres iconos: editar, **suspender / reactivar** y **eliminar**.
- **Suspendido**: la tarjeta se atenúa y lleva la etiqueta ámbar "Suspendido". Deja de recibir presupuestos y avisos
  y se reactiva con el mismo botón.
- **Eliminar**: confirmación con la alternativa "Suspender". Si es el contacto principal, añade el aviso
  "Es el contacto principal: tendrás que elegir otro.".

### Centros
- Igual que contactos: editar, **desactivar / reactivar** y **eliminar**.
- **Inactivo**: tarjeta atenuada con la etiqueta "Inactivo"; no se podrá usar en peticiones nuevas.
- **Eliminar**: confirmación con la alternativa "Desactivar". Si se elimina el último centro, la empresa deja de
  estar lista para operar.

### Facturación
- Forma de pago, días fijos de pago y régimen de IVA dejan de ser texto bloqueado. Ahora son desplegables con "+ Añadir".
- Valores de ejemplo:
  - **Forma de pago**: transferencia a 30 o 60 días, recibo SEPA a 30 o 60 días, confirming a 90 días, al contado.
  - **Días de pago**: sin día fijo, día 5, día 10, días 10 y 25, día 15, último día del mes.
  - **IVA**: régimen general 21 %, reducido 10 %, exento, inversión del sujeto pasivo, recargo de equivalencia, IGIC.
- Si una empresa tiene guardado un valor que no está en la lista (por ejemplo "Confirming bancario"), se muestra igual.
- El IBAN de ejemplo pasa a `ES00 0000 •••• 0000`, claramente inventado.

### Subir documentos (ventana nueva)
- Se abre desde "Subir documento", tanto en la cabecera de la pestaña como en el estado vacío.
- **Zona de arrastre**:
  - Texto: "Arrastra aquí los archivos o pulsa para elegirlos · PDF, JPG o PNG · hasta 10 MB por archivo · puedes
    subir varios a la vez".
  - Se resalta en índigo al arrastrar encima.
  - En la demo hay un enlace "Probar con archivos de ejemplo".
- **Por cada archivo**:
  - Nombre, tamaño y botón para quitarlo de la lista.
  - Si no vale (formato o tamaño), se marca en rosa con el motivo y no se sube.
  - **Tipo de documento** (obligatorio): desplegable con "+ Añadir". Tipos de ejemplo: contrato, CIF, escrituras,
    certificados de Hacienda y de la Seguridad Social, mandato SEPA, acuerdo de confidencialidad, póliza de seguro.
    Si el nombre del archivo contiene "CIF" o "contrato", el tipo se propone solo.
  - **Caduca el** (opcional), con la ayuda "Avisaremos antes de que caduque".
  - **Quién lo puede ver**: "Solo el equipo de la ETT" o "También el cliente, en su portal".
  - **Notas** (opcional).
- **Pie**: cuántos archivos están listos y a cuántos les falta el tipo. Botón "Subir N documentos", desactivado
  hasta que todos los válidos tengan tipo.
- **Al subir**: barra de progreso en cada archivo. Después, los documentos aparecen en la lista como **"Pendiente de
  validar"** (ámbar), con caducidad y "visible para el cliente" si se indicó.
- **Aviso al pie de la ventana**: los documentos nuevos quedan pendientes de validar, y los documentos personales de
  trabajadores (DNI, nóminas) no se suben aquí, sino en la ficha de cada persona.

## Componentes y estilo

- **Nuevos**:
  - `Confirmar` (`src/ui/Overlay.tsx`): confirmación de borrado con alternativa opcional.
  - `SubirDocumentos` (dentro de `EmpresasView.jsx`). Si se usa en más pantallas (candidatos, Mi ETT), pasará a `src/ui/`.
- **Iconos nuevos de lucide**: `CirclePause`, `CirclePlay`, `CloudUpload` y `FileImage`.
- Sin colores nuevos.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Contacto | suspendido | nuevo | sí/no | Suspendido: no recibe presupuestos ni avisos |
| Centro | suspendido | nuevo | sí/no | Inactivo: no se puede usar en peticiones nuevas |
| Contacto / Centro | — | borrado | eliminación definitiva | Dejar rastro en el historial (quién y cuándo) |
| Facturación | paymentMethod, fixedPayDays, vatRegime | cambiado | referencias a tablas maestras (antes texto) | Ampliables desde el formulario |
| Forma de pago, días de pago, régimen de IVA, tipo de documento | nombre | nuevo (tablas maestras) | texto único | Valores de ejemplo, **por confirmar** con administración |
| Documento de empresa | caduca | nuevo | fecha opcional | Para avisos de caducidad |
| Documento de empresa | visibleCliente | nuevo | sí/no | Visible en el portal del cliente |
| Documento de empresa | notas | nuevo | texto opcional | |
| Documento de empresa | estado | cambiado | Pendiente de validar / Validado / Borrador | Los subidos entran como pendientes de validar |

## Dudas y pendientes

- Para Enric:
  - ¿Se puede eliminar un contacto o un centro que aparece en peticiones o presupuestos abiertos? Lo lógico es
    impedirlo y ofrecer solo suspender o desactivar.
  - ¿Quién valida los documentos subidos, y con qué pantalla?
  - ¿Quién puede ampliar las listas de facturación? Quizá solo administración.
- Los porcentajes y modalidades de IVA son de ejemplo y están **por confirmar**.
- La subida es simulada: no se envía ningún archivo. En real, los archivos irían a Storage.
