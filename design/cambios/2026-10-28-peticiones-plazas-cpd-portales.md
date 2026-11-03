# Peticiones: plazas y candidatos, CPD previo y por persona, y portales propios de la ETT

- **Fecha**: 2026-10-28
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, 5c2fba9
- **Cómo verlo**: `npm --prefix apps/web run dev`:
  - http://localhost:5173/#/peticiones → PET-2026-0050 → pestañas Plazas y candidatos, Difusión en portales y
    Contratos y altas.
  - http://localhost:5173/#/mi-ett → pestaña Portales.

## Resumen

La pestaña Plazas y candidatos pasa a cubrir todo el recorrido de cada plaza:

1. Se propone a una persona.
2. El cliente la confirma en su portal.
3. Se genera su CPD y se envía a firmar.
4. La persona se incorpora.
5. Si alguien se va, queda la baja con su motivo y se busca un sustituto.

Además se ve el embudo de candidatos de la petición. Se añaden los dos portales propios de la ETT (empresas y
candidatos), que se activan en cada petición y viven en un subdominio de TramitNOW. También los correos de
bienvenida y el CPD previo, para que la empresa tenga las condiciones antes de la incorporación.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/PeticionesView.jsx` | `design/peticiones.html` | Plazas y candidatos, ventana de proponer, dar de baja, Contratos y altas, Difusión en portales |
| `src/views/FichaEttView.jsx` | `design/fichaett.html` | Pestaña nueva Portales |
| `src/ui/Fields.tsx` | — | Componente nuevo `Interruptor` |

## Cambios

### Plazas
- **Estados de una plaza**:
  - Por cubrir.
  - Pendiente del cliente: propuesta, esperando su confirmación.
  - Cubierta: confirmada.
  - Incorporada: ya ha empezado.
  - Baja: la persona se fue; muestra quién era y el motivo.
- **Acciones según el estado**:
  - Por cubrir: Proponer.
  - Pendiente del cliente: Retirar o Confirmar. En la demo, "Confirmar" simula que el cliente confirma en su portal.
  - Cubierta o incorporada: Dar de baja, y "Recordar CPD" si no está firmado.
  - Baja: Buscar sustituto.
- **Columna CPD**: "Se genera al confirmar", "Pendiente de firma" o "Firmado". A 2 días del inicio, un CPD sin firmar
  muestra "Bloquea la incorporación".
- **Aviso** de cómo se confirma: en el portal del cliente o, si el portal está desactivado en la petición, a mano.
- **Dar de baja** (ventana):
  - Motivo, en un desplegable ampliable: no se presentó, renuncia, no supera el periodo de prueba, a petición del
    cliente, fin de la necesidad.
  - Notas opcionales.
  - Si la persona ya había empezado, avisa de que hay que tramitar la baja en la Seguridad Social.
  - No es un borrado: la persona y el motivo quedan en el historial.

### Candidatos de esta petición
- **Embudo con contadores por etapa**: Inscritos, Preseleccionados, Entrevista, Propuestos al cliente, Aceptados y
  Descartados. Pulsar una etapa filtra la lista.
- **Tabla**: persona, origen (portal de candidatos, InfoJobs, Indeed, base de datos), afinidad, requisitos, etapa
  (se cambia desde un desplegable) y "Proponer" para la primera plaza libre.
  - Si la persona ya está en una plaza, se indica cuál.
- El indicador "Candidatos en proceso" de la ficha sale de este embudo (preseleccionados, entrevista y propuestos).

### Ventana de proponer candidato
- Por defecto, solo los candidatos del mismo puesto. Con "Ver también los de otros puestos" salen todos.
- Hay un buscador por nombre, carné o localidad.
- **Requisitos de cada persona frente a la petición**: carné (por ejemplo, de carretillero o de manipulador de
  alimentos), disponibilidad en el turno de la petición y documentación en vigor. Cada uno se marca en verde o en rosa.
  - Si falla alguno, se puede proponer igualmente, con el aviso "bloquea el contrato hasta resolver…".
- Quien ya está en otra plaza sale el último, con el aviso y sin poder proponerlo.
- Si se busca un sustituto de una baja, se ve el motivo de la baja.

### CPD (Contratos y altas de la petición)
- **CPD previo**, por petición: las condiciones de la puesta a disposición para que la empresa las tenga antes de
  que haya personas.
  - Contenido: causa, puesto y cualificación, riesgos y EPIs, centro, horario, duración y precio.
  - Estados: sin enviar, enviado sin revisar, revisado por el cliente.
  - Botones "Ver condiciones" y "Enviar al cliente" o "Reenviar". Se envía al email del contacto y, si el portal de
    empresas está activo, queda allí.
- **CPD de cada persona**: se genera al confirmar la plaza y se envía a firmar.
  - La tabla muestra, por persona: CPD con la empresa, contrato con la persona y alta en la Seguridad Social. El
    contrato y el alta esperan a que el CPD esté firmado.
  - Acciones: "Recordar" y "Descargar CPD".
- Se quita el antiguo "CPD de la petición" único, porque el CPD va por persona.

### Portales propios de la ETT (en Difusión en portales de cada petición)
- **Portal de empresas** (`https://ettglobal.tramitnow.com/empresas`): la empresa ve la petición, confirma a las
  personas, firma los CPD y valida las presencias.
- **Portal de candidatos** (`…/candidatos/ofertas/PET-…`): oferta pública. Quien se inscribe entra como «Inscrito».
- Cada portal tiene un **interruptor** para activarlo en esa petición y una casilla de **bienvenida**:
  - **Empresas**: al activar el portal por primera vez, se envía la bienvenida al contacto y se indica la fecha.
  - **Candidatos**: la bienvenida se envía a quien se inscribe o se propone.
- "Más opciones del portal: pendientes de definir", para cuando lleguen las opciones.

### Mi ETT → Portales (pestaña nueva)
- **Subdominio** (`ettglobal.tramitnow.com`), con la dirección de los dos portales.
  - Si se cambia, avisa de que los enlaces enviados dejarán de funcionar.
- **Correos de bienvenida** para empresas y para candidatos:
  - Activo por defecto (interruptor), asunto y texto, con las variables {empresa}, {nombre}, {ett} y {enlace}.
  - Botón "Enviarme una prueba".

## Componentes y estilo

- **Nuevo en `src/ui`**: `Interruptor`, para activar o desactivar.
- **Nuevo dentro de `PeticionesView.jsx`**: `Requisitos`, las etiquetas de cumple o no cumple.
- **Reutilizados**: `SelectConAlta` (motivo de baja), `Notice`, `EmptyState` y `SearchInput`.
- Sin colores nuevos. Se quitan los emojis de la antigua ventana de asignar.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Plaza | estado | cambiado | vacante, reservada, cubierta, incorporada, baja | Antes: cubierta / vacante |
| Plaza | motivoBaja, bajaDe | nuevo | texto + referencia a la persona | Historial de bajas y sustituciones |
| Plaza | cpd | nuevo | sin generar, enviado, firmado | CPD por persona; referencia al documento generado |
| Motivo de baja | nombre | nuevo (tabla maestra) | texto | Ampliable |
| Candidatura (candidato en petición) | etapa | nuevo | inscrito, preseleccionado, entrevista, propuesto, aceptado, descartado | Con fecha y origen |
| Candidato | turnos, carnés, documentación en vigor | nuevo o confirmar | listas y sí/no | Para comprobar requisitos |
| Petición | cpdPrevio | nuevo | estado + fecha de envío | |
| Petición | portalEmpresas, portalCandidatos | nuevo | sí/no | |
| Petición | bienvenidaEmpresas, bienvenidaCandidatos | nuevo | sí/no + fecha de envío | |
| ETT | subdominio | nuevo | texto único | |
| ETT | plantillas de bienvenida | nuevo | asunto, texto y activo por defecto, para empresas y para candidatos | |

## Dudas y pendientes

- **Opciones de los portales**: el diseñador las pasará. De momento solo hay el interruptor y la bienvenida.
- **CPD, por confirmar con quien lleve lo laboral en la ETT**:
  - El CPD se hace por escrito y firmado antes de que la persona empiece.
  - Se ha supuesto un CPD por persona y puesta a disposición, y un CPD previo con las condiciones.
  - El margen de 2 días para bloquear es de ejemplo.
- **Para Enric**:
  - La firma digital del CPD (proveedor) y el envío real de correos.
  - Usar la configuración de firma de la empresa que ya está en la especificación: autoriza firma de CPD, email de
    CPD y contactos que firman.
  - Las inscripciones reales desde el portal de candidatos.
- El subdominio está fijo en Peticiones (`ettglobal`). En real saldría de la configuración de Mi ETT.
- Candidatos (`CandidatosView.jsx`) sigue con el modelo antiguo de peticiones con posiciones.
