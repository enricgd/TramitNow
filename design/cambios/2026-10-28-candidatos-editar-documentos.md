# Candidatos: editar la ficha, eliminar candidato y documentos caducados

- **Fecha**: 2026-10-28
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design` (ver el commit que añade esta nota)
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/#/candidatos → abrir a Mohamed El Amrani
  (tiene el NIE y el carné caducados) o a Carlos Gómez Moreno (carné a punto de caducar).

## Resumen

En la ficha del candidato los datos eran de solo lectura y los documentos no tenían fecha de caducidad. Ahora:

- Se pueden editar los datos personales, el perfil y la disponibilidad.
- Se puede eliminar un candidato.
- Los documentos caducados o a punto de caducar se ven en la ficha y en la lista, se pueden renovar o eliminar, y se
  puede avisar al candidato por email, a mano o de forma automática.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/CandidatosView.jsx` | `design/candidatos.html` | Ficha (pestañas Resumen, Datos personales, Perfil y carnés, Disponibilidad, Documentos y RGPD), pie de la ficha, lista (columna Documentación) y ventanas nuevas |

## Cambios

### Editar la ficha
- Las pestañas **Datos personales**, **Perfil y carnés** y **Disponibilidad** muestran los datos en lectura, con un
  botón **Editar**. Al editar salen los campos y abajo "Cancelar" y "Guardar cambios". Cambiar de pestaña o cerrar
  la ficha descarta la edición.
- **Datos personales**:
  - Campos: nombre, apellidos, DNI o NIE, caducidad del documento, teléfono, email, población, provincia y número de
    la Seguridad Social.
  - Se comprueba que nombre, apellidos y teléfono no estén vacíos, el formato del DNI o NIE y el del email.
  - Si cambia la caducidad del DNI, también cambia la del documento.
- **Perfil y carnés**:
  - Perfil principal y años de experiencia.
  - Listas editables (añadir y quitar etiquetas): otros perfiles que puede cubrir, permisos y carnés, habilidades e
    idiomas.
  - Vehículo propio.
- **Disponibilidad**:
  - Estado. No se puede cambiar si está en misión.
  - Turnos (mañana, tarde, noche, jornada partida, fines de semana), que se marcan pulsando.
  - Incorporación (inmediata, en una o dos semanas, o a partir de una fecha) y distancia máxima en km.
  - Notas.
- Cada cambio guardado queda en el **Historial** ("Datos actualizados").

### Eliminar candidato
- Botón "Eliminar" en el pie de la ficha, con la confirmación común: "Se borran sus datos personales, sus
  documentos y su historial (por ejemplo, si ejerce su derecho de supresión del RGPD)".
  - Ofrece la alternativa reversible "Marcar como descartado".
- Si está en misión no se puede eliminar: lo explica y pide terminar antes la misión.

### Documentos
- Cada documento tiene **fecha de caducidad** y un **estado**: Vigente, Caduca en N días (30 días o menos),
  Caducado, Sin caducidad o Pendiente de validar.
- **Aviso arriba** si hay documentos caducados o a punto de caducar, con el botón **Avisar por email**. Si está
  caducado el DNI o el RGPD, añade "Bloquea nuevas asignaciones".
- **Acciones por documento**:
  - **Renovar** (en los caducados o a punto): sube el nuevo, que sustituye al anterior y queda "Pendiente de validar".
  - **Validar** (en los pendientes).
  - Ver, descargar y **eliminar**. Eliminar usa la confirmación común; si el documento está caducado, ofrece
    "Renovarlo en su lugar".
- **Subir documento**:
  - Tipo: DNI/NIE, Seguridad Social, RGPD, carné de carretillero, formación PRL, manipulador de alimentos, permiso de
    conducir, CV u otro.
  - Archivo y fecha de caducidad, obligatoria para el DNI/NIE.
- **Avisar por email** (ventana):
  - Asunto y mensaje ya redactados con la lista de documentos y sus fechas, y el enlace al portal de candidatos.
    Se pueden cambiar antes de enviar.
  - Casilla "Recordárselo cada 7 días hasta que los renueve".
  - El envío queda en el historial, y en cada documento sale "Aviso de renovación enviado el …".
- **Avisar automáticamente** (interruptor por candidato, activo por defecto): email 30 días antes de que caduque y
  otro el día que caduca.
- **Resumen** de la ficha: aviso de documentos por renovar, con el botón "Ver documentos". La pestaña Documentos
  lleva un punto de aviso.
- **Lista de candidatos**:
  - La columna Documentación añade la etiqueta "N por renovar": rosa si hay alguno caducado y ámbar si solo están a
    punto.
  - El filtro de documentación con alertas también los incluye.

## Componentes y estilo

- **Nuevo** (dentro de `CandidatosView.jsx`): `ListaEditable`, etiquetas que se añaden y quitan.
- **Reutilizados**: `Confirmar`, `Interruptor`, `Notice`, `Field`, `TextInput` y `SectionTitle`.
- Fechas en formato dd/mm/aaaa en la ficha. "Perfil y carnets" pasa a "Perfil y carnés". Sin colores nuevos.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Documento de candidato | caducidad | nuevo | fecha opcional | Obligatoria en DNI/NIE |
| Documento de candidato | estado | cambiado | pendiente de validar / verificado; caducado y caduca pronto se calculan con la fecha | |
| Documento de candidato | avisoEnviado | nuevo | fecha | Último aviso de renovación |
| Documento de candidato | tipo | cambiado | tabla maestra de tipos | |
| Candidato | otherProfiles | nuevo | lista de texto | Otros perfiles que puede cubrir |
| Candidato | turnos | nuevo | lista: mañana, tarde, noche, partida, fines de semana | Sustituye al texto `preferredShift` |
| Candidato | incorporacion, incorporacionFecha, radioKm, notasDisponibilidad | nuevo | texto, fecha, entero y texto | |
| Candidato | avisoAutomatico | nuevo | sí/no | Avisos automáticos de caducidad |
| Candidato | — | borrado | eliminación definitiva | Derecho de supresión del RGPD; dejar constancia de quién y cuándo |

## Dudas y pendientes

- **Portal de candidatos**: el candidato podrá subir y renovar sus documentos y cambiar sus datos desde el portal.
  Se diseñará con los portales. Los emails ya enlazan a `ettglobal.tramitnow.com/candidatos`.
- **Por confirmar**:
  - Los 30 días de antelación del aviso y los 7 días entre recordatorios.
  - Cuánto dura el consentimiento RGPD. En la demo se ha supuesto 3 años.
  - Qué documentos bloquean una asignación. Ahora: DNI/NIE y RGPD caducados.
- **Para Enric**:
  - El envío real de los emails y la tarea programada de los avisos automáticos.
  - La subida real de archivos a Storage.
- La ficha sigue mostrando las peticiones con el modelo antiguo (POS-01, POS-02). Falta alinear Candidaturas con el
  modelo "una petición = un puesto".
