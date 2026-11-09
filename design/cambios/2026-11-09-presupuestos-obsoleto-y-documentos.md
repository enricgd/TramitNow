# Presupuestos: pasar a obsoleto y crear uno nuevo, y añadir documentos

- **Fecha**: 2026-11-09
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, (pendiente)
- **Cómo verlo**: `npm --prefix apps/web run dev` → Presupuestos.
  - En la lista, el icono del archivador de cada fila.
  - Dentro de un presupuesto: Resumen, Versiones y Documentos.

## Resumen

Dos peticiones del diseñador para Presupuestos:

1. Un botón para pasar un presupuesto a **obsoleto** y **crear uno nuevo a partir de él**. Lo pidió en Resumen y en
   Versiones; se añade también en la lista de presupuestos.
2. Un botón en **Documentos** para **añadir documentos**.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/PresupuestosView.jsx` | `design/presupuestos.html` | Estado «Obsoleto», lista, Resumen, Versiones, cabecera, Documentos y ventanas nuevas |

## Cambios

### 1. Pasar a obsoleto y crear uno nuevo
- **Dónde está el botón**:
  - **Resumen**: bloque «¿Este presupuesto ya no sirve?».
  - **Versiones**: junto a «Generar nueva versión manual», con la explicación de la diferencia entre las dos.
  - **Lista de presupuestos**: icono de archivador en cada fila, para hacerlo sin abrir el presupuesto (por ejemplo,
    con el filtro «Caducados»).
- **Ventana de confirmación**:
  - Explica qué pasa y pide el **motivo**: caducado sin respuesta del cliente, el cliente pide otras condiciones,
    cambian las tablas del convenio, error en el presupuesto u otro motivo.
  - Si estaba aceptado, avisa de que sus peticiones siguen con sus tarifas hasta que se acepte el nuevo.
- **Al confirmar**:
  - El original pasa al estado nuevo **«Obsoleto»**: queda cerrado, ya no se puede enviar ni aceptar, y se queda
    para consultar. Lleva un aviso con el motivo, la fecha y un enlace al nuevo, y en la cabecera «Ver PRE-…».
  - Se crea un **presupuesto nuevo con número nuevo** que copia la empresa, el contacto, el comercial, los puestos,
    los costes internos, los extras, el margen y las condiciones. Se abre en Borrador para revisarlo, con un aviso
    «Creado a partir de PRE-…».
  - Los dos quedan en la lista y en Actividad, con quién lo hizo y el motivo.
- **Diferencia con «Nueva versión»**:
  - Nueva versión: sigue siendo el **mismo presupuesto** (v2, v3…), para negociar con el cliente.
  - Obsoleto y nuevo: el presupuesto **deja de valer** y empieza otro.
- El estado «Obsoleto» sale en el filtro de estados y en la vista por estados (pipeline).

### 2. Añadir documentos
- Botón **«Añadir documento»** en la pestaña Documentos. La ventana pide:
  - Tipo: presupuesto firmado por el cliente, condiciones o pliego del cliente, correo del cliente u otro documento.
  - Nombre (opcional).
  - El archivo.
  - «Solo uso interno».
- Debajo de los documentos generados, la lista **«Documentos añadidos»**, con el tipo, el archivo, la fecha y quién lo
  añadió, y botones para descargar o quitar.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Presupuesto | estado | cambiado | + «Obsoleto» | Cerrado, solo consulta |
| Presupuesto | obsoleto (motivo, fecha, sustituidoPor), creadoDesde | nuevo | | Enlace entre el original y el nuevo |
| Documento del presupuesto | tipo, nombre, archivo, interno, fecha, autor | nuevo | | Archivo en Storage |

## Dudas y pendientes

- **Por confirmar**: si un presupuesto aceptado con peticiones en curso se puede pasar a obsoleto (ahora se puede, con
  aviso), o hay que impedirlo.
- **Por confirmar**: si los documentos añadidos se pueden enviar al cliente desde aquí, o solo se guardan.
- **Para Enric**: el número nuevo sale de la serie de presupuestos. El obsoleto no se borra nunca.
