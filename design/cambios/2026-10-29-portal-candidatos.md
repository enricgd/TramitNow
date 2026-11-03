# Portal de candidatos: primera versión, aparte del ERP

- **Fecha**: 2026-10-29
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, 91ff429
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/portal.html, o desde el ERP: Mi ETT → Portales → «Ver
  el portal de candidatos». Para verlo como en el móvil, reduce la ventana.

## Resumen

Primera versión del portal de candidatos, a partir del esquema del diseñador: Contratos (activos y pasados), Nóminas,
Ofertas y Perfil, con el logo de la ETT y la persona arriba, y TramitNow al pie. Se añade **Inicio**, con lo que la
persona tiene que hacer ahora.

Es **otra página, aparte del ERP** (`portal.html`), con su propio diseño. Comparte los componentes y los colores de
TramitNow, pero con más aire, tarjetas en vez de tablas y pensada primero para el móvil. El portal de empresas vendrá
cuando estén sus opciones.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `portal.html`, `src/portal/main.jsx` | — | **Nuevo**: segunda página, aparte del ERP |
| `src/portal/PortalCandidato.jsx` | — | **Nuevo**: el portal de candidatos |
| `vite.config.ts` | — | Compila las dos páginas (`index.html` y `portal.html`) |
| `src/views/FichaEttView.jsx` | — | Mi ETT → Portales: botón «Ver el portal de candidatos» |
| `src/views/CandidatosView.jsx` | — | Unai García Zabaleta: contrato de 2025 y carné de carretillero, como en su portal |

## Cambios

### Estructura
- **Cabecera**:
  - A la izquierda, el logo y el nombre de la ETT.
  - A la derecha, la persona con su NIF y «Editar perfil», como en el esquema.
- **Menú**: Inicio, Contratos (Activos y Pasados), Nóminas, Ofertas y Perfil.
  - En el ordenador va a la izquierda, como en el esquema. En el móvil va abajo, con iconos.
  - Inicio lleva un número con lo pendiente.
- **Pie**: «Funciona con TramitNow».
- **Barra de la demo** arriba (en real no sale):
  - Dice que en real estará en el subdominio de la ETT.
  - «Viendo como candidato» y «Empresa: próximamente».
  - Enlace para volver al ERP.

### Secciones
- **Inicio** (nuevo):
  - «Tu próxima incorporación»: fecha, puesto, turno y centro.
  - **Pendiente**: firmar el contrato, añadir la cuenta bancaria, renovar el carné que caduca en 22 días y la
    formación PRL (fecha y lugar). Cada cosa tiene su botón.
  - **Mis candidaturas**, con su estado.
- **Contratos**:
  - Activos y Pasados, como en el esquema: empresa, puesto, fecha de alta, fin previsto, fecha de fin, estado y
    contrato.
  - El pendiente lleva **«Firmar contrato»**: resumen → «He leído el contrato» → código por SMS de 6 cifras →
    firmado. En la demo vale cualquier código.
  - «Descargar contrato».
- **Nóminas**:
  - Por **mes** (en vez de «Fecha alta»), con el contrato, el neto y «Descargar». Filtro por año.
  - **Otros documentos**: finiquito, certificado de empresa (para el paro) y certificado de retenciones.
- **Ofertas**:
  - Buscador y filtro de provincia (por defecto, la de la persona).
  - Cada oferta: puesto, **sector** (no el nombre del cliente, por confidencialidad), población, fechas, turno y
    requisitos.
  - Botón **«Me interesa»**: la oferta queda «En selección» en Mis candidaturas.
- **Perfil**:
  - Datos personales del esquema (nombre, apellidos, NIF, teléfono, email, población, provincia, documento y cuenta
    bancaria), más dirección, código postal (rellena provincia y población) y Seguridad Social.
  - El NIF no se edita: se cambia subiendo el documento nuevo.
  - La cuenta bancaria y la Seguridad Social quedan **«Pendiente de que la ETT lo revise»**.
  - **Mis documentos** con su caducidad y «Subir nuevo» (foto o PDF), que queda «Pendiente de validar».
  - **Disponibilidad**: los turnos en los que puede trabajar.

### Datos de ejemplo
- La persona es **Unai García Zabaleta**, la misma de Candidatos y Contratos y altas: carretillero en PET-2026-0050,
  empieza el 10/11 y tiene el contrato pendiente de firmar.
- Para que se vean Contratos pasados y Nóminas: trabajó en la campaña de verano de 2025 (PET-2025-0087), con tres
  nóminas, finiquito y certificados.
  - En Candidatos sale igual: dos contratos con la ETT y el carné de carretillero que caduca el 20/11.

## Componentes y estilo

- Reutiliza los comunes (`Card`, `Button`, `Badge`, `Notice`, `Modal`, `Field`, `TextInput`, `Select`, `SearchInput`)
  y los colores de TramitNow. Letra más grande, más espacio y tarjetas.
- El rosa del esquema no se usa. En real, el color de acento podría ser el de la ETT (configurable en Mi ETT →
  Portales). Por defecto, el índigo de TramitNow.

## Dudas y pendientes

- **Por confirmar**:
  - Si en las ofertas se puede mostrar el nombre del cliente.
  - Si la nómina se publica el último día del mes.
  - Qué documentos se descargan además de las nóminas.
- **Para Enric**:
  - Que el portal vaya en su propio despliegue y en el subdominio de cada ETT (`ettglobal.tramitnow…`).
  - Acceso sin contraseña: DNI y código por SMS o email.
  - Firma electrónica real del contrato.
  - Que «Me interesa», los datos y los documentos que cambia la persona lleguen a Candidatos (pendientes de validar).
- **Siguiente**: el portal de empresas, cuando estén sus opciones.
