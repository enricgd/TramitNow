# Empresas y Presupuestos: el circuito de un cliente nuevo ya no se corta

- **Fecha**: 2026-11-11
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, 803cc05
- **Cómo verlo**: `npm --prefix apps/web run dev`.
  - Empresas → abrir una empresa → «Crear presupuesto».
  - Presupuestos → «Nuevo presupuesto» → escribir una empresa que no existe → «Darla de alta aquí».

## Resumen

En el repaso del flujo completo (de la entrada del cliente al cobro) salió que el paso **cliente → presupuesto** estaba cortado:

- En la ficha de Empresas, «Crear presupuesto», «Crear presupuesto comercial ahora» y «Nuevo presupuesto ETT» solo mostraban un aviso. No abrían nada.
- En un presupuesto, si la empresa no existía, el enlace «Dar de alta en Empresas» sacaba de la pantalla y se perdía el presupuesto empezado.

Ahora los dos sentidos funcionan.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/EmpresasView.jsx` | `design/empresas.html` | Los tres botones de crear presupuesto de la ficha |
| `src/views/PresupuestosView.jsx` | `design/presupuestos.html` | Pestaña Empresa: alta rápida; presupuesto nuevo que llega desde Empresas |
| `src/views/traspasos.js` | — | **Nuevo**: paso de datos entre pantallas, solo para la demo |

## Cambios

### Empresas → «Crear presupuesto»

- **Antes**: aviso «Iniciando presupuesto para…» y nada más.
- **Ahora**: abre Presupuestos con un **presupuesto nuevo** en la pestaña Empresa, con estos datos ya rellenos:
  - la empresa: razón social, CIF, sector y población
  - el **contacto destinatario de presupuestos** (si no hay, el principal)
  - el comercial responsable
- Se muestra el aviso «Presupuesto nuevo para [empresa]: revisa el contacto y sigue con los puestos».
- Vale para los tres botones de la ficha: el de la cabecera, «Crear presupuesto comercial ahora» y «Nuevo presupuesto ETT».

### Presupuesto → empresa que no existe

- **Antes**: «No hay ninguna empresa con "…"» y un enlace «Dar de alta en Empresas» que salía del presupuesto.
- **Ahora**: «**Darla de alta aquí**» abre, debajo del buscador, un recuadro «Empresa nueva» (`border-indigo-200 bg-indigo-50/40`) con lo mínimo para presupuestar:
  - Razón social * (rellena con lo buscado), CIF *, sector o actividad, población (provincia).
  - Convenio de su actividad (opcional: «Sin decidir (se elige en cada puesto)»).
  - Contacto que recibe el presupuesto: nombre y apellidos *, cargo, email *, teléfono.
  - Botones «Cancelar» y «Dar de alta y usarla» (desactivado hasta que estén los obligatorios y el email sea válido).
- Al darla de alta se queda elegida en el presupuesto y aparece un aviso (`Notice` info): «Empresa dada de alta desde este presupuesto, con los datos mínimos. Antes de crear peticiones, completa su ficha en Empresas (centros de trabajo, datos de facturación y documentación).»
- **Por qué**: para enviar una oferta no hacen falta centros, datos de facturación ni documentos (la ficha de Empresas ya lo dice). Esos datos sí hacen falta para las peticiones, los contratos y las facturas.

## Componentes y estilo

- Sin componentes nuevos. Colores ya usados en el proyecto.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Empresa | (alta rápida) | nuevo flujo | razón social, CIF, sector, población, convenio, un contacto | En real: alta por la API en estado «Borrador inicial», con el contacto marcado como destinatario de presupuestos |

`traspasos.js` usa `sessionStorage` solo porque en la demo cada pantalla tiene sus propios datos. En real no hace falta:
Presupuestos recibe el id de la empresa (por ejemplo `#/presupuestos?nuevo&empresa=<id>`) y la lee de la API. En la demo,
la empresa dada de alta desde el presupuesto no aparece en la lista de Empresas; en real sí, como borrador.

## Dudas y pendientes

- **Decidido con el diseñador (2026-11-11)**: «Crear peticiones» **no se bloquea** aunque la ficha de la empresa esté incompleta. Solo se avisa. Los datos que falten se piden en el paso que los necesita (contratos, facturación).
