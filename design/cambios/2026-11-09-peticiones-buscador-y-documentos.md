# Buscador de presupuestos al crear una petición, crear peticiones al aceptar y documentos del servicio

- **Fecha**: 2026-11-09
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, (pendiente)
- **Cómo verlo**: `npm --prefix apps/web run dev`.
  - Peticiones → «Nueva petición».
  - Peticiones → PET-2026-0050 → Contratos y altas → «Documentos del servicio».
  - Presupuestos → PRE-2026-0045 → «Aceptado» → «Solo marcar».

## Resumen

Tres peticiones del diseñador:

1. Para elegir el presupuesto al crear algo nuevo, un desplegable no sirve cuando hay 400 presupuestos.
2. Desde un presupuesto, un botón para crear la petición cuando el cliente lo acepta.
3. En Peticiones → Contratos y altas, poder subir documentos del servicio. El presupuesto firmado tiene que salir solo,
   más los que se suban.

Sobre el punto 1: el desplegable de presupuestos está en «Nueva petición» (Peticiones), que es donde se elige un
presupuesto. Al crear un presupuesto se elige la empresa, y ahí ya hay un buscador.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/PeticionesView.jsx` | `design/peticiones.html` | Nueva petición (buscador), documentos del servicio y ventana para subir |
| `src/views/PresupuestosView.jsx` | `design/presupuestos.html` | Aviso de «Crear peticiones» en el presupuesto aceptado y botón en la lista |

## Cambios

### 1. Buscador de presupuestos en «Nueva petición»
- En lugar del desplegable, un **buscador** por cliente, CIF, código o título.
- Debajo, los resultados en tarjetas: código y versión, cliente, título, fecha de aceptación y cuántas personas quedan
  **sin petición** («5 sin petición» o «Todo en peticiones»).
- Sin buscar, salen primero los que tienen personas sin petición y después los más recientes. Se enseñan 8 como
  máximo («Y 392 más: afina la búsqueda»).
- Al elegir uno, queda fijado con el botón «Cambiar», y debajo salen sus puestos, como antes.
- Se añaden a la demo los presupuestos aceptados de las otras peticiones de ejemplo: PRE-2026-0029 y PRE-2026-0033.

### 2. Crear las peticiones al aceptar el presupuesto
- **Ya existía**: al marcar un presupuesto como aceptado, la ventana ofrece «Aceptar y crear peticiones», y en la
  cabecera del presupuesto aceptado sale el botón «Crear peticiones».
- **Para que se vea más**:
  - En el presupuesto aceptado sin peticiones, un **aviso verde** encima de las pestañas: «El cliente ha aceptado el
    presupuesto. Ya puedes crear las peticiones», con el botón **«Crear peticiones»**.
  - En la **lista de presupuestos**, los aceptados sin peticiones llevan el botón «Crear peticiones», que abre el
    presupuesto.

### 3. Documentos del servicio (Peticiones → Contratos y altas)
- Botón **«Subir documento»**. La ventana pide:
  - Tipo: presupuesto firmado por el cliente, pedido u orden de compra, evaluación de riesgos del cliente, correo del
    cliente u otro documento.
  - Nombre (opcional).
  - El archivo.
- El **presupuesto firmado sale solo**, el primero de la lista: `Presupuesto_PRE-2026-0042_v1_firmado.pdf`, «firmado
  por el cliente el 14/10/2026 · sale solo del presupuesto aceptado».
- Después, los documentos subidos (tipo, fecha y quién), que se pueden descargar o quitar, y los que ya había (CPD
  previo y riesgos PRL).

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Documento del servicio | petición, tipo, nombre, archivo, fecha, autor | nuevo | | Archivo en Storage |

## Dudas y pendientes

- **Para Enric**:
  - El buscador de presupuestos tiene que buscar en el servidor (`apps/api`), con paginación, y solo entre los
    aceptados.
  - El «presupuesto firmado» de la petición es el mismo documento que se sube en Presupuestos → Documentos (tipo
    «Presupuesto firmado por el cliente»). Si no se ha subido, se usa la propuesta generada de esa versión.
- **Por confirmar**: si los documentos subidos a una petición tienen que verse también en el Área de empresas del
  cliente.
