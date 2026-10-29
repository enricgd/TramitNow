# Peticiones: reparto del puesto, en la petición y en el presupuesto aceptado

- **Fecha**: 2026-10-28
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, 9b10001
- **Cómo verlo**:
  - Petición: http://localhost:5173/#/peticiones → PET-2026-0048 → Resumen.
  - Presupuesto: #/presupuestos → pipeline → arrastrar PRE-2026-0048 a Aceptado → "Aceptar y crear peticiones" →
    "Dividir" → crear → abrir el presupuesto → Posiciones.

## Resumen

El diseñador no veía clara la regla "una petición = un puesto; un puesto puede tener varias peticiones". El cuadro
"Peticiones del presupuesto" de la ficha mezclaba las peticiones del mismo puesto con las de otros puestos, y en el
presupuesto no se veía cómo se habían repartido las personas.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/PeticionesView.jsx` | `design/peticiones.html` | Resumen: el cuadro "Peticiones del presupuesto" pasa a "Reparto del puesto" |
| `src/views/PresupuestosView.jsx` | `design/presupuestos.html` | Tarjeta de cada puesto (pestaña Posiciones) |

## Cambios

### Petición → Resumen → "Reparto del puesto"
- Texto: "El presupuesto PRE-2026-0042 v1 pide 8 operario/a de almacén. Están repartidos en 2 peticiones, una por
  horario o fechas."
- **Barra partida**: un tramo por petición del mismo puesto, con plazas y turno. Esta petición va en índigo fuerte y
  las otras en índigo claro. Si faltan personas, sale un tramo gris "N sin petición".
- **Resultado del reparto**:
  - En verde: "Repartidas las 8 personas del presupuesto".
  - En ámbar si faltan ("Faltan N personas…") o si sobran plazas ("revísalo con el cliente").
- Tabla con **solo las peticiones de este puesto**: turno, "esta petición", fechas, plazas y cubiertas, y estado.
- Los otros puestos del mismo presupuesto quedan aparte, en una línea discreta al pie: "Otros puestos del mismo
  presupuesto: Carretillero/a… (PET-2026-0050)".
- Se mantiene el botón "Duplicar con otro horario".

### Presupuesto → tarjeta de cada puesto
- **Solo si el presupuesto está aceptado**: en cualquier otro estado no tiene sentido y no se muestra nada.
- Línea "Peticiones:" con cada petición del puesto (turno, plazas y código, con enlace a Peticiones) y "8 de 8
  personas", en verde si cuadra y en ámbar si no.
- Si está aceptado pero aún no se han creado: "Peticiones: aún no se han creado".
- Para esto, "Crear peticiones" guarda el reparto (código, puesto, turno y plazas de cada petición).

## Componentes y estilo

Sin componentes ni colores nuevos.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Presupuesto | peticionesCreadas | nuevo | lista: código, puesto, turno y plazas | En real se obtiene de las peticiones que apuntan al presupuesto; no hace falta guardarlo aparte |

## Dudas y pendientes

- El enlace del presupuesto abre el listado de Peticiones, no la petición concreta. Las peticiones creadas desde
  Presupuestos en la demo no existen en la pantalla de Peticiones, porque cada pantalla tiene sus propios datos de
  ejemplo.
