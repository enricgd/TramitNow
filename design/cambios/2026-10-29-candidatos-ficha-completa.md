# Candidatos: ver y comprobar documentos, datos que faltan, experiencia y relación con la ETT

- **Fecha**: 2026-10-29
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, 5e74a67
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/#/candidatos.
  - Ficha de Mohamed El Amrani: datos que faltan y NIE caducado.
  - Ficha de Carlos Gómez Moreno: ficha casi completa, con experiencia y formación.

## Resumen

En la ficha del candidato se veía el estado de la documentación, pero no el documento: «Ver» solo mostraba un aviso.
Tampoco había forma de saber qué datos faltaban, la experiencia era solo un número de años y no se veía si la
persona había tenido contratos o había estado en peticiones. Todo esto se ve y se edita ahora desde la propia ficha.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/CandidatosView.jsx` | `design/candidatos.html` | Ficha del candidato: Resumen, Datos personales, Perfil y carnés, Documentos; ventana para ver un documento |

## Cambios

### Ver y comprobar un documento
- «Ver» (en Documentos) y las tarjetas de DNI y RGPD del Resumen abren el documento en una ventana:
  - **Vista previa**: en la demo, una representación del DNI o NIE con los datos de la ficha, o del consentimiento
    RGPD firmado. En real, el fichero subido (PDF o imagen) con zoom.
  - **Datos**: tipo, caducidad y estado (quién lo comprobó y cuándo).
  - **«Comprueba que»**: lo que hay que mirar.
    - DNI o NIE: nombre, número y caducidad iguales a los de la ficha; foto y firma legibles, por las dos caras.
    - RGPD: firmado por la persona, fecha de firma, cesión de datos a los clientes.
  - Acciones:
    - **Es correcto**: queda «Comprobado por … el …». No sale si el documento está caducado.
    - **Rechazar**, con el motivo: ilegible, no coincide con la ficha, caducado, falta una cara, sin firmar u otro.
      Después, **«Pedir de nuevo por email»**.
    - **Renovar** y **Descargar**.
- Documento nuevo con estado **Rechazado** (rojo), con el motivo en la lista.

### Datos que faltan (en el Resumen)
- Una lista con todo lo que falta en la ficha, y un botón **«Completar»** que lleva a la pestaña y la abre en
  edición:
  - Documento de identidad (que falta o está caducado).
  - Consentimiento RGPD.
  - Documentos sin validar o rechazados.
  - Número de la Seguridad Social y cuenta bancaria.
  - Datos personales: fecha de nacimiento, nacionalidad, dirección y código postal.
  - Idiomas.
  - Experiencia laboral (si indica años, pero no las empresas).
- Si no falta nada: «Ficha completa».

### Relación con la ETT (en el Resumen)
- Contratos con la ETT, peticiones en las que ha participado y en cuántas está en selección ahora.
- La lista de contratos: petición, puesto, cliente, fechas y estado. Si no tiene ninguno: «Nunca ha tenido contrato
  con la ETT».
- Enlace a la pestaña Candidaturas.

### Datos personales
- Campos nuevos, que se ven y se editan:
  - Fecha de nacimiento, con la edad.
  - Nacionalidad.
  - Dirección.
  - **Código postal**: al escribirlo, **rellena la provincia** (por las dos primeras cifras) y, si lo conoce, la
    población.
  - **Cuenta bancaria (IBAN)**.
- Lo que falta sale en ámbar («Falta»).
- Validaciones: el código postal tiene 5 cifras y el IBAN es español (ES y 22 cifras).

### Perfil y carnés: experiencia y formación
- **Experiencia laboral**: una o varias, con empresa, puesto, desde, hasta (vacío si sigue) y funciones. Se añaden y
  se quitan.
- **Formación**: título o curso, centro y año.

### Datos de ejemplo
- Varios candidatos de la base tienen fecha de nacimiento, nacionalidad, dirección, IBAN, experiencia y formación.
  Al resto les faltan, para que se vea la lista de «Datos que faltan».
- El código postal se rellena a partir de la población cuando se conoce.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Candidato | fecha de nacimiento, nacionalidad, dirección, código postal, IBAN | nuevo | | El IBAN es dato sensible: solo lo ve quien lleva laboral y nómina |
| Experiencia del candidato | empresa, puesto, desde, hasta, funciones | nuevo | lista | |
| Formación del candidato | título, centro, año | nuevo | lista | |
| Documento del candidato | estado, comprobado por y cuándo, motivo de rechazo | cambiado | pendiente / verificado / rechazado | |

## Dudas y pendientes

- **Para Enric**:
  - **Código postal → provincia y población**: en la demo, la provincia sale de las dos primeras cifras y la
    población de un listado corto de ejemplo. En real, con el listado completo de códigos postales.
  - **Buscador de calles**: para escribir la dirección con autocompletado y que las calles queden unificadas (por
    ejemplo, con el callejero oficial de CartoCiudad o el de Correos). No es urgente, pero mejora la calidad de los
    datos y el cálculo de distancias.
  - La vista previa real de los ficheros (PDF e imagen) y su descarga.
  - Que «Relación con la ETT» salga de los contratos reales (Contratos y altas y Personal en misión).
