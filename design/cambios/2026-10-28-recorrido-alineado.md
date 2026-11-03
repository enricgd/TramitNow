# Recorrido alineado: presupuestos con sus datos, candidatos del recorrido y enlaces entre pantallas

- **Fecha**: 2026-10-28
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, d9c1d09
- **Cómo verlo**: `npm --prefix apps/web run dev`. Por ejemplo:
  - Presupuestos → PRE-2026-0041: sus cuatro puestos y sus peticiones PET-2026-0044 a 0047.
  - Candidatos → estado «En misión» o «En incorporación».

## Resumen

Al repasar el recorrido completo, de Presupuestos a Facturación, salieron tres problemas:

- Todos los presupuestos abrían el mismo borrador.
- Los candidatos no eran las personas que aparecen en el resto de pantallas.
- Faltaban enlaces entre pantallas consecutivas.

Se arreglan los tres. Los enlaces siguen llevando al listado de la pantalla, no a la ficha concreta (ver Pendientes).

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/PresupuestosView.jsx` | `design/presupuestos.html` | Detalle de cada presupuesto; listado con PRE-2026-0029 y PRE-2026-0033; forma de pago "Transferencia a 60 días" |
| `src/views/CandidatosView.jsx` | `design/candidatos.html` | Personas del recorrido, estado «En incorporación», peticiones del asistente de asignación, ciudades |
| `src/views/PeticionesView.jsx` | `design/peticiones.html` | Botón "Personal en misión" en peticiones en curso |
| `src/views/LaboralView.jsx` | `design/laboral.html` | Enlaces a Personal en misión |
| `src/views/MisionView.jsx` | — | Botón "Horas e incidencias" en la ficha |
| `src/views/HorasView.jsx` | — | Enlace a Facturación en los meses pasados a facturación |
| `src/views/FacturacionView.jsx` | — | CIF y email de los clientes, los mismos que en Presupuestos |

## Cambios

### 1. Cada presupuesto abre sus propios datos
- Antes, cualquier presupuesto de la lista abría el borrador PRE-2026-0048. Ahora cada uno abre los suyos: cliente,
  contacto, CIF, convenio, forma de pago, puestos, tarifas y, si está aceptado, sus peticiones.
- **PRE-2026-0042** (aceptado, Trans-Logística): operario/a y carretillero/a. Reparto:
  - PET-2026-0048: mañana, 5 plazas.
  - PET-2026-0049: tarde, 3 plazas.
  - PET-2026-0050: carretilleros/as de tarde, 4 plazas.
- **PRE-2026-0041** (aceptado, Hostelería): cuatro puestos y sus peticiones PET-2026-0044 a 0047.
  - Camarero/a de sala a 18,40 €/h, la tarifa que usa Facturación.
- **Nuevos en la lista**, porque las peticiones ya los nombraban:
  - **PRE-2026-0029**: campaña de verano, PET-2026-0031, mozo/a a 16,90 €/h.
  - **PRE-2026-0033**: v2, envasado nocturno, PET-2026-0036, que está cancelada.
- El resto (PRE-2026-0047, 0046, 0045 y 0038) tiene puestos coherentes con su título. En PRE-2026-0047, el
  carretillero/a sale al 13,8 % de margen, como dice la tarea de Inicio.
- La lista muestra el mismo importe, tarifa media y margen que el detalle.
- Lo cambiado en un presupuesto se conserva al abrir otro y volver, durante la sesión.
- Las versiones de ejemplo (v1 y comparación) solo están en PRE-2026-0048.
- Nueva forma de pago en el catálogo: "Transferencia bancaria a 60 días", la de Trans-Logística en Empresas y
  Facturación.

### 2. Candidatos: las mismas personas que en el resto del recorrido
- **En misión** (9): los camareros/as de PET-2026-0044, con su plaza.
- **En incorporación** (11), un estado nuevo con su filtro: las personas de Contratos y altas en PET-2026-0048,
  0050 y 0045, con su plaza y su primer día.
  - Mamadou Diallo, con el NIE caducado.
  - La ficha dice "Se incorpora a…" en vez de "Está en misión en…".
- **Disponibles tras su misión** (6): los mozos/as de PET-2026-0031, que terminaron el 30/09.
- **No disponible**: Sara Benítez Lago, la baja de la plaza 3 de PET-2026-0044.
- **Los 8 candidatos que ya había** pasan de Madrid (Coslada) a Bizkaia, cerca del centro de Basauri, con fechas de
  contacto de septiembre y octubre.
  - Marta Rivas y Javier Navarro, que estaban en misión en una PET-2026-0048 que no existía así, quedan disponibles.
  - Elena Sánchez y David Castillo están en selección para PET-2026-0049 y PET-2026-0050.
  - Mohamed El Amrani está por contactar desde hace 2 días, como dice Inicio.
- **El asistente de asignación** usa las peticiones que tienen plazas por cubrir: PET-2026-0049, 0050, 0046 y 0047,
  cada una con un solo puesto.
- Catálogo de perfiles: «camarero/a de sala» es sinónimo de Camarero/a.

### 3. Enlaces que faltaban en la cadena
- **Peticiones**: una petición en curso tiene "Personal en misión" en la pestaña Contratos y altas.
- **Contratos y altas**:
  - La ficha de un expediente completo tiene "Personal en misión".
  - El detalle de una petición ya empezada enlaza con Personal en misión.
- **Personal en misión**: la ficha de cada persona tiene "Horas e incidencias".
- **Horas e incidencias**: en el cierre del mes, "En facturación desde…" lleva a Facturación.

## Componentes y estilo

- Sin componentes nuevos. Estado de candidato nuevo: «En incorporación», en color indigo.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Candidato | estado | nuevo valor | «En incorporación» | Desde que el cliente lo confirma hasta su primer día |
| Presupuesto | forma de pago | nuevo valor | Transferencia bancaria a 60 días | Tabla maestra |

## Dudas y pendientes

- **Para Enric**:
  - Los enlaces llevan al listado de cada pantalla, no a la ficha. Hacen falta rutas con el identificador
    (`#/peticiones/PET-2026-0044`, `#/presupuestos/PRE-2026-0041`…), que encajan mejor con la navegación real.
  - Cada pantalla sigue teniendo sus datos de ejemplo. Lo que se hace en una no llega a la siguiente hasta que todo
    salga de `apps/api`.
