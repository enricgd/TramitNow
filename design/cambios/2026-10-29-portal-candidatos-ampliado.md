# Portal de candidatos: horas, ausencias, prevención, IRPF y contacto con la ETT

- **Fecha**: 2026-10-29
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, (pendiente)
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/portal.html.
  - Inicio: «Tu primer día», lo pendiente y «Tu contacto».
  - Menú «Horas».
  - Contratos → el contrato pendiente.
  - Perfil → «Datos para la retención del IRPF».

## Resumen

Cinco ampliaciones del portal de candidatos (ver `2026-10-29-portal-candidatos.md`). Todas aprovechan que el
portal y el ERP comparten la base de datos: lo que la persona ve sale del ERP, y lo que envía llega al ERP.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/portal/PortalCandidato.jsx` | — | Inicio, Contratos, Horas (nueva), Nóminas y Perfil |

## Cambios

### 1. Mis horas (sección nueva en el menú)
- Los **partes validados** por la empresa, en modo consulta. Salen de Horas e incidencias.
- Filtro por mes. Arriba van los totales del mes: horas normales, horas extra e incidencias, que son lo que se paga en
  la nómina.
- Una tarjeta por semana con el estado «Validado». Al abrirla se ven los días: entrada, salida, horas, extra e
  incidencia (festivo, cita médica, ausencia justificada), y quién lo validó y cuándo.
- **«¿Algo no cuadra?»** avisa a su contacto de la ETT de esa semana.
- Si tiene una incorporación próxima, avisa de cuándo saldrá el primer parte.
- En la demo salen los partes de su contrato de 2025 (julio a septiembre).

### 2. Avisar de una ausencia
- Botón en Mis horas y en «Tu primer día».
- **Tipos**: no puedo ir, llegaré tarde, cita médica, baja médica o accidente de trabajo.
- **Campos**: fechas (o la hora, si llega tarde o tiene cita médica), un comentario y un justificante (foto o PDF).
- **Mensajes según el tipo**:
  - Baja: no hace falta traer el parte de baja, que llega de la Seguridad Social.
  - Accidente: hay que ir a la mutua, no al centro de salud, y llamar al 112 si es grave.
- El aviso queda en «Mis avisos» como «Recibido por la ETT».

### 3. Prevención de riesgos (PRL)
- En el contrato pendiente, un bloque **Prevención de riesgos** con tres cosas:
  - **Información de los riesgos del puesto**: riesgos de carretillero/a y cómo evitarlos. Se confirma con «He
    leído y entiendo…» y queda «Leída el …».
  - **Formación PRL**: fecha, hora y lugar. El certificado aparece al terminar.
  - **Recibí de los EPI**: la lista de equipos y «Los he recibido», que se firma.
- En Inicio salen como pendientes: «Lee los riesgos de tu puesto» y «Firma el recibí de tus EPI».
- En Nóminas → Otros documentos se añade el certificado de formación PRL de 2025.

### 4. Datos para la retención del IRPF (modelo 145)
- Bloque nuevo en Perfil, y pendiente en Inicio mientras no se rellene.
- **Campos**:
  - Situación familiar (las tres del modelo), con el NIF del cónyuge si hace falta.
  - Hijos menores de 25 años y, de ellos, cuántos tienen menos de 3.
  - Personas mayores de 65 años a su cargo.
  - Discapacidad.
  - Hipoteca de la vivienda habitual anterior a 2013.
  - Pensión compensatoria.
- Se firma con «Declaro que estos datos son ciertos».
- Una vez enviado, queda «Comunicado el …», con «Actualizar» y «Descargar el modelo firmado».
- Aviso: en los territorios forales (Bizkaia, Gipuzkoa, Álava y Navarra) el formulario es otro, pero los datos son
  parecidos.

### 5. Contacto en la ETT y primer día
- **Tu primer día** (en Inicio, con una incorporación próxima):
  - Fecha y hora (15 minutos antes del turno) y por quién preguntar: el contacto del cliente.
  - Dirección, cómo llegar y qué llevar.
  - Botones «Cómo llegar» y «Avisar de una ausencia».
- **Tu contacto en ETT Global People**: Ane Uriarte (responsable de PET-2026-0050), con su horario, para llamarla o
  escribirle.
- El menú inferior del móvil pasa a seis iconos.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Aviso de ausencia | persona, contrato, tipo, desde, hasta, hora, comentario, justificante, estado, enviado | nuevo | falta / retraso / médico / baja / accidente | Llega como incidencia a Personal en misión y a Horas |
| Prevención (por contrato) | riesgos leídos (fecha), recibí de los EPI (fecha), formación (fecha, lugar, certificado) | nuevo | | Completa «Formación PRL y EPIs» de Contratos y altas |
| Puesto | riesgos y medidas, EPI | nuevo | listas | Lo rellena la ETT o su servicio de prevención |
| Persona | datos del modelo 145 (situación, NIF del cónyuge, hijos, menores de 3, ascendientes, discapacidad, vivienda, pensión), fecha de comunicación | nuevo | | Lo usa la nómina |
| Petición | punto de encuentro, hora de llegada, por quién preguntar, cómo llegar, qué llevar | nuevo | | Para «Tu primer día» |

## Dudas y pendientes

- **Por confirmar**:
  - Si la persona puede discutir un parte ya validado («¿Algo no cuadra?») o solo avisar.
  - Quién prepara la información de riesgos de cada puesto.
- **Para Enric**:
  - Que los avisos de ausencia creen la incidencia en Personal en misión y en el parte de Horas.
  - Que las confirmaciones de PRL y del modelo 145 queden firmadas, con fecha y hora, y se puedan descargar desde
    el ERP.
  - Usar el formulario foral cuando el centro de trabajo esté en el País Vasco o en Navarra.
