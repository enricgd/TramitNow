# Horas e incidencias: varias peticiones por semana, filtro de fechas, facturas y validación del cliente

- **Fecha**: 2026-10-29
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, 6f51a49
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/#/horas.
  - Varias peticiones: la semana que viene.
  - Diferencia con la factura: periodo «Últimos 3 meses», semanas de agosto.
  - Validación: la semana pasada → «Simular validación en el portal» o «Validar en nombre del cliente».

## Resumen

Revisión de Horas e incidencias tras los comentarios del diseñador:

- Con una sola petición en la demo no se veía cómo quedaría con varias.
- Faltaba un filtro de fechas para revisar horas anteriores y detectar diferencias con las facturas.
- No quedaba claro quién valida las horas ni qué era el «justificante».
- Volver del parte a la lista era difícil.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/HorasView.jsx` | — | Lista, parte semanal, envío y validación |
| `src/ui/Layout.tsx` | — | Botón «Volver» en `PageHeader` |
| `src/views/EmpresasView.jsx` | `design/empresas.html` | Rol de contacto «Valida horas»; contacto Montse Ferrer en Hostelería |
| `src/views/FacturacionView.jsx` | — | Agosto facturado con 945 h (para el ejemplo de diferencia); dirección de Hostelería como en Empresas |

## Cambios

### Lista de partes: varias peticiones, periodo y totales
- **Agrupada por semana**: una cabecera por semana («Del 26/10 al 01/11/2026 · Esta semana · 1 petición · 192 h») y
  debajo una fila por petición. La columna «Semana» desaparece; la petición es el enlace al parte.
- **Filtro de periodo**:
  - Últimas 4 semanas y la próxima (por defecto), esta semana, semana pasada, semana que viene, este mes, mes
    pasado, últimos 3 meses, todo, o **entre dos fechas**.
  - Se suman los filtros de **cliente**, petición y estado (por defecto, todos).
- **Totales del periodo filtrado**: número de partes y peticiones; horas normales, extra, de fin de semana,
  festivas y total. Sirve para cuadrar con lo facturado.
- **Semana que viene**: aparecen los partes de las peticiones que trabajarán, con el estado «Próxima semana» y
  «Empieza el …». Se rellenan a partir del lunes.
  - En la demo: PET-2026-0044, PET-2026-0048 (empieza el 03/11) y PET-2026-0045 (empieza el 05/11).
- **Columna «Factura»**: la factura en la que entraron las horas de cada parte, o «Sin facturar».
  - Si las horas facturadas de ese mes no coinciden con las validadas, sale «Diferencia en agosto: 7,5 h».
  - En la demo, F2026-0094 se facturó con 945 h, pero los partes validados de agosto suman 937,5 h (la ausencia
    del 10/08).
- **Cierre del mes**: dice en qué factura entró el mes y si coincide. Si no coincide, avisa con enlace a
  Facturación para hacer la rectificativa.
- Los indicadores de borrador, pendientes y con reparos filtran sin límite de fechas.

### Quién valida las horas
- **Siempre las valida el cliente.** La ETT las prepara y se las envía.
- **En la ficha de Empresas**, los contactos tienen un rol nuevo: **«Valida horas»**.
  - En la demo: Montse Ferrer (jefa de sala) en Hostelería y Javier Ugarte Elorza en Trans-Logística.
- **Enviar al cliente** abre una ventana para elegir **a qué contactos** se envía (por defecto, los que validan
  horas) con su email. Les llega un email con el enlace al parte en el **portal de empresas**.
- **Pendiente del cliente**: el parte dice a quién se envió y cuándo, y cómo lo valida.
- **Dos formas de validar**:
  1. **En el portal de empresas**: el contacto valida o pone reparos. Queda registrado quién, el día y la hora.
     - En la demo: «Simular validación en el portal» y «Simular reparos».
  2. **Validar en nombre del cliente**, cuando contesta por email o firma el parte en papel:
     - Se elige el **contacto del cliente** de la lista, no se escribe a mano.
     - Se elige **cómo**: email, parte firmado en papel o teléfono (se mantiene de momento, con el aviso de que no
       deja prueba).
     - Se sube la **prueba de la conformidad** (antes «Justificante»): el email del cliente guardado como PDF o
       .eml, o el parte firmado escaneado.
     - El texto aclara que no es un documento para firmar: sirve para demostrar que el cliente aprobó las horas si
       luego discute la factura.
- **«Parte en PDF»**: abre el parte listo para imprimir o guardar en PDF, con las horas de cada persona y casillas
  de firma del cliente y de la ETT.
- El aviso de validado distingue «en el portal de empresas el … a las …» de «lo registró la ETT con la prueba …».

### Volver atrás
- **`PageHeader`**: cuando hay migas, sale un botón **«← Volver»** junto al título que lleva a la primera miga.
- Aparece igual en todas las pantallas de detalle: parte de horas, detalle de petición (Peticiones y Contratos y
  altas), presupuesto y empresa.

## Componentes y estilo

- **Cambio en un componente común**: `PageHeader` añade el botón «Volver» cuando recibe migas.
- Iconos nuevos: `Printer` y `MonitorCheck`.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Contacto de cliente | roles | nuevo valor | «Valida horas» | Quién recibe los partes |
| Parte de horas | enviado a | nuevo | lista de contactos | |
| Parte de horas | validación | cambiado | quién (contacto), cómo (portal / email / papel / teléfono), fecha, hora, prueba (fichero), registrado por la ETT sí o no | |
| Parte de horas | reparos de | nuevo | contacto | |
| Factura | horas por petición y mes | usar | | Para comparar con las horas validadas |

## Dudas y pendientes

- **Por confirmar**: si el teléfono se quita como forma de validar más adelante.
- **Para Enric**:
  - El portal de empresas: validar y poner reparos; el email con el enlace.
  - Que la diferencia con la factura salga de los datos reales de Facturación. En la demo, las horas facturadas
    están fijas en Horas.
  - El PDF del parte: en la demo se usa la impresión del navegador.
