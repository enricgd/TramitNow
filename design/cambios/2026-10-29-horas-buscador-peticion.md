# Horas e incidencias: buscador y filtro de petición, también en el cierre del mes

- **Fecha**: 2026-10-29
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, (pendiente)
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/#/horas, en las dos pestañas.

## Resumen

Un cliente puede tener muchas peticiones a la vez. Se añaden un **buscador** y un **filtro de petición**, y el
**cierre del mes** pasa a usar los mismos filtros, agrupado por cliente.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/HorasView.jsx` | — | Filtros de «Partes semanales» y de «Cierre del mes» |

## Cambios

### Filtros comunes a las dos pestañas
- **Buscar**: busca por código de petición, puesto, turno, cliente o centro, sin importar los acentos.
- **Cliente**.
- **Petición**: aparece al elegir un cliente y lista todas sus peticiones (código, puesto y turno). Las que no
  tienen datos en las fechas o el mes elegidos lo indican.
- Los filtros de cliente, petición y búsqueda **se comparten entre las dos pestañas**: si eliges un cliente en
  «Partes semanales» y pasas a «Cierre del mes», sigue elegido.

### Partes semanales
- Orden de la barra: Buscar · Cliente · Petición · Fechas · Estado. Se combinan todos.

### Cierre del mes
- Barra de filtros: Buscar · Cliente · Petición · Mes · **Estado del cierre** (faltan partes por validar, listos para
  cerrar, al día con el mes en curso, cerrados).
- **Agrupado por cliente**: un título por cliente con sus peticiones y las horas del mes, y debajo la tarjeta de
  cada petición (que ya no repite el cliente; muestra el centro).
- Si los filtros dejan la lista vacía, lo dice y ofrece limpiar los filtros.

## Componentes y estilo

- Solo componentes comunes (`SearchInput`, `Select`, `Card`).
