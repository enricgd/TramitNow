# Área de empresas: lo que se oculta en la primera fase

- **Fecha**: 2026-11-11
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, (pendiente)
- **Cómo verlo**: `npm --prefix apps/web run dev`.
  - http://localhost:5173/empresas.html → entrar como Marta → menú y «Personal en misión».
  - ERP → Empresas → Trans-Logística → Contactos → permisos del Área de empresas.

## Resumen

Revisado el Área de empresas con el diseñador, en la primera fase **no se ofrece al cliente**:

- la sección **«Pedir personal»**;
- en **«Personal en misión»**, pedir una **prórroga** o **terminar antes** una misión.

No se borra nada: queda hecho y oculto con dos interruptores (`FASE_1` en `src/portal/permisosEmpresa.js`), para
activarlo cuando se decida. En «Personal en misión» se mantiene «Incidencia».

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/portal/permisosEmpresa.js` | — | Interruptores `FASE_1`; el permiso «Pedir personal» desaparece de la lista |
| `src/portal/PortalEmpresa.jsx` | — | Menú, Inicio, Personal en misión, Presupuestos y facturas |
| `src/portal/Acceso.jsx` | — | Texto de la pantalla de acceso |
| `src/views/EmpresasView.jsx` | `design/empresas.html` | Permisos del contacto en el Área de empresas |
| `src/views/FichaEttView.jsx` | `design/fichaett.html` | Correo de invitación y descripción del Área de empresas |
| `src/web/textos.js` | — | Puntos del Área de empresas en la web corporativa |

## Cambios

### Pedir personal

- **Antes**: sección en el menú, KPI «Peticiones abiertas» con enlace, permiso «Pedir personal» en Empresas → Contactos.
- **Ahora**:
  - No sale en el menú.
  - El KPI se queda, pero sin enlace.
  - El permiso desaparece de la lista de permisos, al dar acceso y en la ficha del contacto. Si un contacto ya lo tenía, se ignora.
  - En «Presupuestos y facturas», el texto dice «Si necesitas otro puesto, pídeselo a [contacto de la ETT] y te enviaremos un presupuesto».
- **Textos**: «pedir personal» desaparece de los siguientes sitios:
  - la pantalla de acceso: «Consulta tu personal en misión, valida los partes de horas y firma los documentos de cada misión»;
  - el correo de invitación por defecto (Mi ETT);
  - la descripción del Área de empresas en Mi ETT;
  - los puntos de la web corporativa («Ve a su personal en misión»).

### Personal en misión: prórroga y terminar antes

- **Antes**: cada persona tenía los botones «Prórroga», «Terminar antes» e «Incidencia».
- **Ahora**: solo «Incidencia».
  - El permiso dice «Personal en misión · ver quién trabaja y comunicar incidencias».
  - El aviso de Inicio «[Persona] termina el …» ya no lleva «Pedir prórroga». Ahora dice «Si la necesitas más tiempo, díselo a [contacto de la ETT]», con el botón «Ver», que lleva a Personal en misión.
- **Por qué**: en esta fase las prórrogas y los finales anticipados los gestiona la ETT desde el ERP (Personal en misión), hablando con el cliente.

## Componentes y estilo

- Sin cambios.

## Datos

Sin cambios de datos. El permiso `pedir` puede seguir guardado en los contactos, pero en la fase 1 no da acceso a nada.

## Dudas y pendientes

- Con esto, del hueco «lo que se pide desde los portales no llega al ERP» solo quedan las **incidencias** del cliente y los avisos del portal del trabajador. Falta decidir dónde las recibe la ETT (Inicio, Personal en misión, Horas).
