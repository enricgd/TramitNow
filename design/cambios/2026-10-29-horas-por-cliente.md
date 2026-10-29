# Horas e incidencias: partes por fecha, cliente y petición

- **Fecha**: 2026-10-29
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, 82fd42d
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/#/horas → pestaña «Partes semanales».

## Resumen

La lista de partes, agrupada solo por semana, no dejaba ver bien qué pasa con cada cliente. El diseñador pide
recorrerla en este orden: **fecha → cliente → petición y puesto**. La pestaña «Partes semanales» se rehace así.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/HorasView.jsx` | — | Pestaña «Partes semanales» |

## Cambios

1. **Fechas**, arriba:
   - El periodo: últimas 4 semanas y la próxima (por defecto), esta semana, semana pasada, semana que viene, este
     mes, mes pasado, últimos 3 meses, todo o entre dos fechas.
   - Al lado, las fechas exactas que cubre («Del 28/09/2026 al 08/11/2026») y el filtro de estado.
2. **Cliente**: una tarjeta por cliente con partes en esas fechas, más «Todos los clientes».
   - Cada tarjeta dice cuántas peticiones tiene, las horas y cuántos partes hay por hacer.
   - Al pulsar una, solo se ve ese cliente.
3. **Petición y puesto**: una tarjeta por cliente, con su nombre bien visible, y dentro una fila por petición.
   - Cada fila lleva el código, el puesto, el turno y el centro.
   - **Una columna por semana** del periodo, con el estado del parte (Borrador, Pendiente, Reparos, Validado,
     Cerrado, Próxima) y sus horas. Se pulsa para abrir el parte.
   - Al final, el total de horas de la petición en esas fechas y la factura en la que entraron, con el aviso si
     hay diferencia.
   - Al pulsar la petición se ve solo esa; al volver a pulsarla, todas las del cliente.
- Encima de las tarjetas, los totales de lo que se está viendo: normales, extra, fin de semana, festivas y total.
- Los filtros de cliente y petición en desplegables desaparecen; los sustituyen las tarjetas y las filas.

## Componentes y estilo

- Solo componentes comunes. Las tarjetas de cliente son botones con el mismo estilo de selección que el resto de la
  app (borde y fondo indigo cuando están elegidas).

## Dudas y pendientes

- Con muchas semanas (por ejemplo, «Todo»), la tabla de cada cliente se desplaza en horizontal.
- Si un cliente tiene muchas peticiones, se podría plegar su tarjeta. Lo vemos cuando haya datos reales.
