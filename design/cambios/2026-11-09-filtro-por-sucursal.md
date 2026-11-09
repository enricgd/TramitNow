# Presupuestos y Peticiones: filtro por sucursal

- **Fecha**: 2026-11-09
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, 92c22c0
- **Cómo verlo**: `npm --prefix apps/web run dev` → Presupuestos o Peticiones → desplegable «Todas las sucursales».

## Resumen

Petición del diseñador: en Presupuestos y en Peticiones se tiene que poder filtrar por sucursal. El filtro solo lo
tiene quien ve más de una sucursal; quien ve solo la suya no lo necesita.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/sucursalesDemo.js` | — | **Nuevo**: sucursales de la ETT, la de cada cliente y las que ve el usuario |
| `src/views/PresupuestosView.jsx` | `design/presupuestos.html` | Lista: filtro y sucursal de cada presupuesto |
| `src/views/PeticionesView.jsx` | `design/peticiones.html` | Lista: filtro y sucursal de cada petición |

## Cambios

- **Filtro «Todas las sucursales»** en la barra de filtros de las dos listas, con las sucursales que ve el usuario:
  Delegación Norte (Bilbao) y Sucursal Barcelona. Se combina con los demás filtros y «Limpiar» también lo quita.
- **Solo sale a quien ve más de una sucursal.** En la demo el usuario es administrador y ve las dos.
- En cada fila, delante del título (en Presupuestos) o del presupuesto (en Peticiones), la sucursal: «Norte ·» o
  «Barcelona ·».
- Las listas ya solo enseñan lo de las sucursales que ve el usuario. En la demo son todas, así que no cambia nada.
- Sucursal de los datos de ejemplo:
  - Delegación Norte: Trans-Logística y Manufacturas Metálicas del Henares.
  - Sucursal Barcelona: Hostelería & Eventos y Mediterránea Agrícola.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Presupuesto | sucursal | nuevo | id de sucursal | La del comercial al crearlo; se puede cambiar |
| Petición | sucursal | nuevo | id de sucursal | Por defecto, la del presupuesto |

## Dudas y pendientes

- **Para Enric**:
  - En la demo, la sucursal sale del cliente. En real, cada presupuesto y cada petición tienen que **guardar su
    propia sucursal**, porque un cliente puede trabajar con varias.
  - Las sucursales que ve cada usuario salen de su rol y su alcance (JWT, `branch_ids`).
  - El filtro tiene que ir también en las demás listas que se trabajan por sucursal: Candidatos, Contratos y altas,
    Personal en misión, Horas y Facturación. Queda para la fase 2 de roles y sucursales.
- **Por confirmar**: si quien ve varias sucursales tiene que entrar con todas a la vez o con la última que eligió.
