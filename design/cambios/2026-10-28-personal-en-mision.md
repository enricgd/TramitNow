# Personal en misión: pantalla nueva con fin de contrato, prórrogas e incidencias

- **Fecha**: 2026-10-28
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, 9c650cb
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/#/mision. Para probar el fin de contrato:
  "Decidir el fin" en Aitana Roca Vidal o en Marc Puig Soler. Para la baja médica: Youssef Amrani.

## Resumen

"Personal en misión" era una entrada del menú desactivada, sin maqueta ni especificación. Ahora es una pantalla nueva,
diseñada directamente con el sistema común, que sigue a Contratos y altas. Muestra a las personas que ya trabajan en
el cliente y permite gestionar lo que pasa durante la misión, sobre todo el fin de contrato: prorrogar o finalizar.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/MisionView.jsx` | — (no hay maqueta) | Pantalla nueva |
| `src/App.tsx` | `design/laboral.html` (menú) | La entrada "Personal en misión" se activa |
| `src/Inicio.tsx` | — | Tarea nueva "2 contratos terminan el 10/11" |

## Cambios

### Listado
- **Indicadores** que se pulsan para filtrar:
  - En misión (y en cuántas peticiones).
  - Terminan en 15 días: hay que decidir si se prorrogan.
  - De baja médica.
  - Finalizadas en los últimos 30 días.
- **Aviso de próximas incorporaciones**: "Se incorporan pronto 11 personas…", con el enlace a Contratos y altas.
  Esas personas siguen allí hasta su primer día.
- **Filtros**: buscador, estado (en misión, terminan pronto, de baja médica, finalizadas o todas) y petición.
- **Tabla**, ordenada por fin previsto:
  - Columnas: persona, petición, inicio, fin previsto ("en N días", en ámbar si quedan 15 o menos; "Prorrogada"
    si la hay), días trabajados y estado.
  - Las que terminan pronto tienen el botón **"Decidir el fin"**.
- **Estados**: En misión · Termina pronto · De baja médica · Termina el dd/mm (fin ya decidido) · Finalizada (con
  "Cierre pendiente" si faltan tareas).

### Ficha de la misión (panel lateral)
- **Datos**: cliente y centro, responsable, inicio y días trabajados, fin previsto, tipo de contrato y fecha de firma
  del CPD.
- **Fin de contrato**: botones **Prorrogar** y **Finalizar**. Si termina en 15 días o menos, avisa de que hay que
  decidirlo con el cliente.
- **Prorrogar** (ventana):
  - Nueva fecha de fin, que tiene que ser posterior a la actual, y una nota.
  - Explica qué hay que firmar: la adenda al CPD (la empresa) y la prórroga del contrato (la persona), con la opción
    de enviar las dos ahora.
  - **Avisa si el contrato supera los 6 meses** que permite el contrato por circunstancias de la producción (12 si
    lo amplía el convenio).
  - En la ficha queda la prórroga con el estado de las dos firmas y "Marcar firmadas" para simularlo en la demo.
- **Finalizar** (ventana):
  - Último día y motivo: fin de la campaña, a petición del cliente, renuncia, no supera el periodo de prueba,
    despido disciplinario u otro. Nota opcional.
  - Casilla "Buscar sustituto": la plaza queda como «Baja» en Peticiones. Se marca sola si el motivo no es el fin
    de la campaña.
  - Crea las **tareas de cierre**: baja en la Seguridad Social (en los 3 días hábiles siguientes) y finiquito con
    certificado de empresa. Cada una tiene "Marcar hecho".
- **Incidencias**:
  - Tipos: baja médica (IT), accidente de trabajo, ausencia, retraso, amonestación u otro. Con fechas y nota.
  - Una baja médica sin fecha de fin pone a la persona «De baja médica», con el botón "Registrar alta médica".
  - El accidente de trabajo recuerda que hay que comunicarlo en Delt@ en 5 días hábiles.
- **Historial** de la misión.

### Datos de ejemplo (alineados con las otras pantallas)
- **PET-2026-0044**: 9 camareros/as en misión desde el 10/10.
  - Dos con contrato hasta el 10/11 (terminan pronto).
  - Una baja médica desde el 24/10.
  - Un retraso registrado.
- **PET-2026-0031**: 6 mozos/as que terminaron el 30/09 por fin de campaña.
- Próximas incorporaciones: PET-2026-0048, PET-2026-0045 y PET-2026-0050, tal como están en Contratos y altas.

## Componentes y estilo

- Solo componentes comunes: `Page`, `PageHeader`, `KpiTile`, `Notice`, `Drawer`, `Modal`, `Field`, `Select` y
  `EmptyState`. Sin componentes ni colores nuevos.
- Iconos nuevos: `CalendarPlus`, `CalendarX2` y `HeartPulse`.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Misión (persona en un puesto) | inicio, fin previsto, estado | nuevo | fechas + en misión / baja médica / finalizada | Se crea cuando el expediente está completo y llega el primer día |
| Misión | prórrogas | nuevo | lista: desde, hasta, firma de la adenda del CPD, firma del contrato, nota | |
| Misión | cierre | nuevo | fecha, motivo, nota, baja en la SS hecha, finiquito hecho | |
| Motivo de fin | nombre | nuevo (tabla maestra) | texto | |
| Incidencia de misión | tipo, desde, hasta, nota | nuevo | tipo de una tabla maestra | La baja médica abierta cambia el estado |
| Misión | historial | nuevo | fecha + texto | |

## Dudas y pendientes

- **Por confirmar con quien lleve lo laboral**:
  - Los 15 días de aviso antes del fin.
  - El máximo de 6 meses, o el que fije cada convenio.
  - Los motivos de fin.
  - Que la baja en la Seguridad Social se comunique en los 3 días hábiles siguientes.
- **Para Enric**:
  - El paso automático de Contratos y altas a Personal en misión el primer día.
  - La adenda del CPD y la prórroga con firma electrónica.
  - La baja real en el Sistema RED.
  - Que al finalizar se marque de verdad la plaza en Peticiones.
- **Siguiente sección**: "Horas e incidencias", con las horas trabajadas de cada misión, que luego se facturan.
