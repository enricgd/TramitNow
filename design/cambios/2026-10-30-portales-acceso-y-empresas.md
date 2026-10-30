# Portales: dos direcciones con su acceso, Área de empresas y permisos desde el ERP

- **Fecha**: 2026-10-30
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, dc5841f
- **Cómo verlo**: `npm --prefix apps/web run dev`.
  - Portal del trabajador: http://localhost:5173/trabajadores.html (antes `portal.html`).
  - Área de empresas: http://localhost:5173/empresas.html.
  - Desde el ERP: Mi ETT → Portales, y Empresas → una empresa → Contactos.

## Resumen

Los dos portales van ahora por separado, cada uno con su dirección y su pantalla de acceso:

| | Portal del trabajador | Área de empresas |
|---|---|---|
| Dirección real | `{subdominio}.tramitnow.com/trabajadores` | `{subdominio}.tramitnow.com/empresas` |
| Quién entra | Quien trabaja o ha trabajado con la ETT | Los contactos del cliente a los que la ETT da acceso |
| Acceso | DNI o NIE y código por SMS (o por correo), sin contraseña | Correo y contraseña, con invitación de la ETT para el primer acceso |
| Color | Índigo | Azul petróleo |
| Pensado para | El móvil | El ordenador |
| Menú | Lateral, y abajo en el móvil | Horizontal arriba |

Decisiones del diseñador:
- Dos direcciones diferenciadas, una para empresas cliente y otra para trabajadores.
- **Sin «Candidatos propuestos»**: la selección la hace la ETT y la empresa ve a las personas cuando ya están
  confirmadas.
- **Los usuarios de cada empresa se gestionan desde el ERP**, no desde el portal.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `trabajadores.html`, `src/portal/trabajadores.jsx` | — | Antes `portal.html` y `main.jsx`: ahora entran por el acceso |
| `empresas.html`, `src/portal/empresas.jsx` | — | **Nuevo**: página del Área de empresas |
| `src/portal/Acceso.jsx` | `design/login.html` (estructura) | **Nuevo**: acceso de los dos portales |
| `src/portal/PortalEmpresa.jsx` | — | **Nuevo**: el Área de empresas |
| `src/portal/permisosEmpresa.js` | — | **Nuevo**: permisos del Área de empresas, compartidos con el ERP |
| `src/portal/PortalCandidato.jsx` | — | Textos de «Portal del trabajador» y botón «Salir» |
| `src/index.css` | — | Tema `tema-empresa`: el índigo pasa a azul petróleo |
| `src/views/EmpresasView.jsx` | `design/empresas.html` | Contactos: acceso al Área de empresas y permisos |
| `src/views/FichaEttView.jsx` | `design/fichaett.html` | Portales: las dos direcciones, cómo se accede y el correo de invitación |
| `vite.config.ts` | — | Compila tres páginas: ERP, trabajadores y empresas |

## Cambios

### Pantalla de acceso (los dos portales)
- **Misma estructura que el acceso del ERP**, pero el panel de la izquierda lleva el **logo y el nombre de la ETT**,
  el nombre del portal y «Funciona con TramitNow». En el móvil, el panel queda como una franja arriba.
- **Trabajador**:
  1. DNI o NIE, que se comprueba que esté bien escrito.
  2. Código de 6 cifras por SMS al móvil que tiene la ETT («acabado en 131»).
  3. Opciones para reenviar el código, recibirlo por correo o cambiar el DNI. Si ha cambiado de móvil, tiene que
     llamar a la oficina.
- **Empresa**:
  - Correo y contraseña, con «¿Has olvidado tu contraseña?».
  - Pantalla de la **invitación**, donde se crea la contraseña la primera vez.
- **Ayudas de la demo**:
  - Trabajador: vale cualquier DNI y código.
  - Empresa: botones para entrar con cada usuario de ejemplo.
- Los dos portales tienen «Salir». La sesión de la demo dura mientras la pestaña está abierta.

### Área de empresas
- **Cabecera**:
  - A la izquierda, el logo de la ETT con la etiqueta «Área de empresas».
  - A la derecha, la empresa cliente y quién ha entrado.
  - Debajo, el **menú horizontal**. Solo salen las secciones que permiten los permisos del usuario, con un número
    en las que tienen algo pendiente.
- **Inicio**:
  - Indicadores: trabajando hoy, empiezan pronto, peticiones abiertas y cosas pendientes.
  - **Pendiente**, según los permisos: partes por validar, CPD por firmar, evaluaciones de riesgos que faltan,
    facturas vencidas y personas que terminan en 15 días o menos («Pedir prórroga»).
  - Próximas incorporaciones y **su contacto en la ETT**: Nuria Castells para Hostelería y Ane Uriarte para
    Trans-Logística.
- **Pedir personal**:
  - Sus peticiones, con fechas, turno, plazas cubiertas (barra de avance) y estado: Recibida, Buscando personas,
    Cubierta, En curso o Finalizada.
  - Formulario «Pedir personal»: puesto del presupuesto aceptado u otro (en ese caso, se le enviará presupuesto),
    personas, turno, fechas, centro y requisitos.
- **Personal en misión**:
  - Por petición: cada persona con sus fechas y su estado (Trabajando, Empieza pronto, De baja o Terminada).
  - Para cada persona puede **pedir una prórroga**, **terminar antes** o comunicar una **incidencia** (no se ha
    presentado, retraso, accidente, etc.). Lo que pide queda en «Lo que has pedido a la ETT».
  - Por protección de datos solo se ven el nombre y las fechas, sin DNI ni teléfono.
- **Horas**:
  - Los partes semanales que envía la ETT, con filtro por mes.
  - Al abrir uno se ve la tabla de personas por día, con horas extra, festivos e incidencias explicadas.
  - **Validar**: con «Confirmo que las horas… son correctas». Queda registrado quién, el día y la hora, que es la
    prueba de la conformidad. Es la versión real de lo que en Horas e incidencias se simulaba con «Validar en
    nombre del cliente».
  - **Poner reparos**: un texto que llega a la ETT, que corrige el parte.
- **Presupuestos y facturas**: los presupuestos aceptados y las facturas, con el estado (pagada, por pagar o
  vencida), el total pendiente y la descarga.
- **Documentos**:
  - **CPD por firmar**, uno a uno o todos a la vez, con un código enviado por correo.
  - **Evaluación de riesgos de cada puesto**: la empresa usuaria tiene que darla antes de que empiece la persona
    (RD 216/1999). Es lo que el trabajador lee en «Riesgos de tu puesto».
  - Documentos de la ETT: autorización administrativa, certificados de estar al corriente con la Seguridad Social
    y con Hacienda, y garantía financiera.
- **Mi cuenta**:
  - Sus datos, de los que solo puede cambiar el teléfono.
  - **Sus permisos**, que solo puede ver: los da la ETT.
  - Los avisos por correo y el cambio de contraseña.
- **Demo**: en la barra de arriba, «Ver como» cambia de usuario.
  - Montse Ferrer (Hostelería): horas y personal en misión, con un parte por validar.
  - Sergi Pujol (Hostelería): todo menos horas.
  - Marta Gómez (Trans-Logística): todo menos horas, con 3 CPD por firmar, la evaluación de riesgos de carretillero
    pendiente y una factura vencida.
  - Javier Ugarte (Trans-Logística): horas (partes de verano validados), personal en misión y documentos.

### ERP: acceso al Área de empresas (Empresas → Contactos)
- Cada contacto tiene un interruptor **«Acceso al Área de empresas»**:
  - **Al activarlo** se abre una ventana con los **permisos**: pedir personal, personal en misión, validar horas,
    presupuestos y facturas, y firmar documentos.
    - Los permisos se proponen según los roles del contacto. Por ejemplo, «Valida horas» da «Validar horas».
    - Avisa si se le da «Validar horas» sin el rol «Valida horas».
  - Con «Enviar invitación», al contacto le llega el correo para crear su contraseña.
  - **Al desactivarlo**, deja de poder entrar.
- En la tarjeta del contacto se ven sus permisos, su último acceso (o «aún no ha entrado») y «Cambiar permisos».
- Los cuatro contactos de Hostelería y Trans-Logística tienen el acceso de la demo.

### ERP: Mi ETT → Portales
- Las dos direcciones, `…/empresas` y `…/trabajadores`, con qué incluye cada portal, **cómo se accede** y un botón
  para verlo.
- El correo de bienvenida de empresas pasa a ser la **invitación** («Elige tu contraseña aquí»). Se envía al dar
  acceso a un contacto.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Contacto del cliente | acceso al portal (activo, desde, invitado, último acceso), permisos | nuevo | pedir / personal / horas / facturas / documentos | La ETT lo gestiona; es la cuenta de Auth del portal |
| Parte semanal | validación (quién, fecha, hora, desde dónde), reparos (texto, quién) | cambiado | | Desde el portal, el canal es «Área de empresas» |
| Solicitud de la empresa | tipo, persona, fecha, comentario, motivo, enviada | nuevo | prórroga / terminar antes / incidencia | Llega a Personal en misión |
| Petición | origen | nuevo | ETT / Área de empresas | Las pedidas desde el portal llegan como «Recibida», sin número |
| Puesto del cliente | evaluación de riesgos (archivo, fecha) | nuevo | | Obligatoria antes de la primera incorporación |
| CPD | firma de la empresa (quién, fecha, código) | cambiado | | Firma con código por correo |

## Dudas y pendientes

- **Por confirmar**:
  - Si alguien que nunca ha trabajado con la ETT puede entrar en el portal del trabajador para ver ofertas. Ahora
    entra cualquiera que la ETT tenga dado de alta, y «Ofertas» sigue.
  - En Peticiones, la publicación de ofertas sigue llamándose «Portal de candidatos» con la dirección
    `…/candidatos`. Hay que decidir si las ofertas públicas van en el portal del trabajador o en una página
    pública aparte.
  - Si la empresa puede pedir personal para un puesto que no está en su presupuesto, o solo para los suyos.
- **Para Enric**:
  - Dos entradas de Auth separadas: los trabajadores entran con OTP por SMS o correo asociado al DNI, y las
    empresas con correo y contraseña e invitación.
  - Cada sesión solo ve lo suyo:
    - El trabajador, sus datos.
    - La empresa, los de su cliente, filtrados por sus permisos.
  - Todo pasa por `apps/api`.
  - El tema de color, por ETT: ahora es el índigo de TramitNow para el trabajador y el azul petróleo para
    empresas.
