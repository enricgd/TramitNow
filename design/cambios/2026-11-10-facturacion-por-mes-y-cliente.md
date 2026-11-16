# Facturación: organizada por mes y cliente, pensada para cientos de clientes

- **Fecha**: 2026-11-10
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, 91c2902
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/#/facturacion
  - Pestaña «Facturar el mes»: «Seleccionar las N listas para facturar» → «Emitir facturas».
  - Pulsar un cliente → ficha de facturación → «Añadir servicio».
  - «Nueva factura» → buscador de clientes.

## Resumen

Facturación estaba pensada para pocos clientes: tarjetas «Por facturar», una lista de servicios aparte y las facturas
agrupadas por cliente. Una ETT grande puede tener 400 clientes, y así no se puede trabajar.

Ahora la pantalla se organiza como se trabaja de verdad: **cada mes, una factura por cliente**.
- La pestaña **«Facturar el mes»** es una tabla con una fila por cliente, filtros, orden, páginas y acciones en bloque.
- **Añadir servicio** está dentro del cliente, porque el servicio va a su factura del mes.
- La pestaña **«Facturas»** es una lista plana con páginas.
- Para elegir cliente se usa un **buscador** (nombre o CIF), no un desplegable.

La demo lleva 36 clientes de ejemplo más (inventados) para que se note la escala.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/FacturacionView.jsx` | — | Toda la vista principal; nueva ficha del cliente; buscador de clientes. La ficha de la factura y los modales no cambian. |
| `src/views/serviciosDemo.js` | — | Solo el comentario |

## Cambios

### Pestañas

- **Antes**: una sola página con KPIs, filtros, tabla por sucursal, tarjetas «Por facturar», lista de servicios y facturas agrupadas por cliente.
- **Ahora**: `Tabs` con «Facturar el mes» (contador: clientes del mes sin facturar) y «Facturas» (contador: facturas con los filtros).
- La cabecera solo tiene «Nueva factura». «Añadir servicio a facturar» ya no está en la cabecera: va en el cliente.

### «Facturar el mes»

- **Filtros**:
  - **Mes**: los meses con horas, servicios o facturas. Por defecto, el que tiene más clientes pendientes.
  - **Buscar cliente** por nombre o CIF.
  - **Sucursal**, solo si se ve más de una.
  - **Estado**: Pendientes de facturar (por defecto) / Listas para facturar / Esperando horas / En borrador / Ya facturadas / Todos los clientes del mes.
- **KPIs** (clic = filtrar): Listas para facturar · Esperando horas · En borrador · Ya facturadas («De N clientes con actividad»).
- **Tabla**: una fila por cliente con horas o servicios en el mes.
  - Columnas: casilla · Cliente (CIF, sucursal, nº de peticiones) · Horas · Servicios (nº · importe) · Base · Estado · acciones.
  - Se puede ordenar por Cliente, Horas, Base y Estado. Por defecto se ordena por estado: esperando, lista, borrador, facturada.
  - Los estados son estos:
    - «Esperando horas · faltan N partes» (warning): hay horas sin validar.
    - «Lista para facturar» (success): todas validadas, sin factura.
    - «En borrador» (neutral).
    - «F2026-0108 · emitida, sin enviar» u otro estado de la factura del mes, con su tono.
  - El botón de la fila depende del estado: «Preparar factura» (lista), «Ver borrador» (borrador) o «Ver factura» (facturada).
  - Menú **⋯**: Abrir el cliente · Añadir servicio a facturar · Preparar factura / Ver borrador · Ir a Horas e incidencias (si espera horas) · Ver sus facturas · Nueva factura a mano.
  - Pulsar la fila abre la **ficha de facturación del cliente**.
  - **25 por página**. El pie dice «1–25 de N clientes · Base de los filtrados: X €».
- **Selección y acciones en bloque**:
  - Hay casillas por fila y una en la cabecera para marcar toda la página. El enlace «Seleccionar las N listas para facturar» marca de golpe las que están listas.
  - Con algo marcado aparece una barra fija (`sticky`, fondo `bg-indigo-50`) con estas acciones:
    - **Preparar borradores**: uno por cliente.
    - **Emitir facturas**: emite solo las que tienen todas las horas validadas, con números correlativos, y avisa de las que se quedan sin emitir.
    - **Enviar por correo**: las emitidas, al correo de facturación de cada cliente.
    - **PDF**: las facturas del mes de los marcados.
    - **Excel**: una fila por cliente con horas, servicios, base y estado.
    - **Quitar selección**.
- **Por qué**: con cientos de clientes, el trabajo de fin de mes es «facturar a todos los que están listos» de una vez, y vigilar los que esperan horas.

### Ficha de facturación del cliente (nueva)

- Es un `Drawer` (`max-w-2xl`) con el nombre del cliente. Debajo, el CIF, la sucursal y el correo de facturación, y un badge con el estado del mes.
- **Pestaña del mes** (por ejemplo, «Octubre de 2026»):
  - Horas por petición: horas, tarifa, presupuesto, importe y «Validadas» o «Faltan N partes».
  - Servicios del mes, con su importe y si están por facturar, en el borrador o en la factura emitida.
  - El botón **«Añadir servicio»** abre el mismo formulario de antes con el cliente ya puesto.
  - Base de la factura del mes, con «Preparar factura» / «Preparar borrador» / «Ver borrador» / «Ver F2026-…» y «Nueva factura».
  - Si el cliente tiene otros meses sin facturar, lo avisa con enlaces para cambiar de mes.
- **Facturas**: todas las del cliente, con total y estado. Al pulsar una se abre la ficha de la factura.
- **Datos de facturación**: razón social, CIF, dirección, correo, forma de pago, días fijos, IVA y detalle de las facturas (por concepto o por persona). Incluye un enlace «Cambiarlos en la ficha de Empresas».
- Desde Empresas («Añadir servicio a facturar») ahora se abre esta ficha con el formulario de servicio.

### «Facturas»

- **KPIs**: En borrador · Pendiente de cobro · Vencidas.
- **Filtros**: los de antes. El filtro de cliente ahora es el buscador.
- La tabla «Facturación por sucursal» y el menú «Descargar (n)» se quedan como estaban.
- **Lista plana** con páginas de 25.
  - Columnas: Número · Cliente (enlace a su ficha, y sucursal) · Periodo · Emisión · Vencimiento · Total · Pendiente · Estado · descargar PDF.
  - Ya no se agrupa por cliente: con 400 clientes los grupos no se pueden recorrer.

### Buscador de clientes

- Se usa en «Nueva factura», en el formulario de servicio y en el filtro de cliente de «Facturas». Sustituye a los desplegables.
- Se escribe el nombre o el CIF y salen hasta 8 resultados, cada uno con nombre, CIF y sucursal, y «Por facturar» si tiene algo pendiente. Si hay más resultados, dice «y N más: sigue escribiendo para afinar».
- Sin escribir nada, salen primero los clientes con algo por facturar. Enter elige el primero.
- Con el cliente elegido, se ve en una caja con «Cambiar» (o «Quitar» en el filtro).

### Quitado

- Las tarjetas «Por facturar».
- La sección «Servicios (además de las horas)».
- Los bloques de facturas por cliente.
- El botón de cabecera «Añadir servicio a facturar».
- Los textos que hablaban de «Por facturar» ahora dicen «pendientes de facturar» o «entra en la factura de [mes] de [cliente]».

## Componentes y estilo

- **Nuevo**: `BuscadorCliente` (en `FacturacionView.jsx`), un combobox con búsqueda por nombre o CIF y destacados primero.
  - Debería ir a `src/ui/` y usarse en todas las pantallas donde se elige cliente: Presupuestos, Peticiones, Horas…
  - En real, la búsqueda irá a la API con paginación, no en memoria.
- **Patrón nuevo**: tabla con selección y barra de acciones en bloque (`sticky`). También sirve para otras listas largas.
- **Iconos nuevos**: `MoreHorizontal`, `ArrowUpDown`, `ChevronLeft`, `ChevronRight`, `Search`.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Cliente | sucursal | usado | id de sucursal | La sucursal del cliente se lee de su ficha (en la demo, de los clientes nuevos) |
| Factura | estado del mes por cliente | calculado | esperando / lista / borrador / facturada | No se guarda: sale de las horas, los servicios y las facturas del mes |

Las acciones en bloque necesitan endpoints en lote en `apps/api`: preparar borradores, emitir (con numeración
correlativa sin huecos, en una transacción) y enviar por correo. Sin cambios en el esquema.

## Dudas y pendientes

- **Emitir en bloque**: ¿pedir confirmación con el número de facturas y el total antes de emitir? En la demo emite directamente.
- **Envío por correo en bloque**: en real, cola de envíos con estado por factura (enviado, rebotado).
- Los 36 clientes de ejemplo son inventados (nombres, CIF y correos `.example`).
