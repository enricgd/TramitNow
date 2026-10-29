# Candidatos: candidaturas con el modelo de una petición, un puesto

- **Fecha**: 2026-10-29
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, (pendiente)
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/#/candidatos.
  - Ficha de Elena Sánchez Pascual → «Candidaturas» → «Proponer al cliente».
  - Botón «Asignar» de cualquier persona.

## Resumen

La pestaña «Candidaturas» de la ficha solo enseñaba la misión asignada. El asistente «Asignar a petición» seguía el
modelo antiguo: una petición con varias posiciones y un paso para elegir la posición, y la opción de cubrir una
plaza directamente sin que el cliente la confirmara. Ahora sigue el modelo de Peticiones: **una petición = un
puesto**, y la plaza se reserva hasta que el cliente la confirma.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/CandidatosView.jsx` | `design/candidatos.html` | Pestaña «Candidaturas», asistente de asignación, datos de ejemplo de las peticiones |

## Cambios

### Candidaturas de cada persona
- Cada persona tiene una lista de candidaturas: petición, plaza (si la hay), estado y fecha.
- **Estados, en el orden de Peticiones**:
  - En selección: pendiente de entrevista o de proponerla al cliente.
  - Propuesta al cliente: plaza reservada; el cliente la confirma en Peticiones.
  - Confirmada: CPD y expediente en Contratos y altas hasta el primer día.
  - En misión.
  - Finalizada, Baja o Descartada.
- **Pestaña «Candidaturas»** de la ficha:
  - «Candidaturas activas» y «Anteriores».
  - Cada tarjeta muestra el puesto y el turno, el cliente, el centro, la plaza, el estado con su explicación y la
    fecha («Empieza el…» si está confirmada, «Desde el…» si está en misión).
  - Enlace según el estado: Peticiones, Contratos y altas o Personal en misión.
  - En selección: «Proponer al cliente» (abre el asistente en el paso de la plaza) y «Descartar».
  - Botón «Asignar a una petición».
- Datos de ejemplo, sacados de lo que ya había:
  - Los camareros/as de PET-2026-0044 salen «En misión».
  - Las personas que se incorporan salen «Confirmada».
  - Los mozos/as de PET-2026-0031 salen con la candidatura «Finalizada».
  - Sara Benítez Lago sale con «Baja» en la plaza 3 de PET-2026-0044.
  - Elena Sánchez y David Castillo están «En selección» en PET-2026-0049 y PET-2026-0050, sin plaza.

### Asistente «Asignar a petición»: de 4 a 3 pasos
1. **Petición**: buscador y una tarjeta por petición con plazas por cubrir.
   - Cada tarjeta muestra puesto y turno, cliente, centro, fecha de inicio, plazas libres y requisitos.
   - Si la persona ya tiene una candidatura en esa petición, lo avisa.
2. **Plaza y modalidad**:
   - «Añadir a la selección»: queda en selección, sin ocupar plaza.
   - «Proponer al cliente»: se elige una plaza vacante, que queda «Pendiente del cliente».
   - Las plazas ocupadas o reservadas dicen por quién.
3. **Comprobar y confirmar**: las mismas comprobaciones de antes (documento de identidad, RGPD, carnés, turno) y el
   resumen. El botón dice lo que hará: «Añadir a la selección» o «Proponer al cliente».
- Se quita el paso «Posición y turno» y la opción de cubrir una plaza directamente: la confirma el cliente en
  Peticiones, que es cuando se genera el CPD.
- En la demo, PET-2026-0049 tiene sus 3 plazas vacantes y PET-2026-0050 tiene 2 cubiertas, 1 pendiente del cliente
  y 1 vacante, como en Peticiones.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Candidatura | persona, petición, plaza, estado, fecha, nota | nuevo o confirmar | en selección / propuesta al cliente / confirmada / en misión / finalizada / baja / descartada | Una persona puede estar en selección en varias peticiones a la vez |

## Dudas y pendientes

- **Para Enric**:
  - Que la candidatura y la plaza de Peticiones sean el mismo dato. En la demo, proponer desde Candidatos no
    cambia Peticiones.
  - Que al confirmar el cliente cambie sola a «Confirmada».
