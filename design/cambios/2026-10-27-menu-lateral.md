# Estructura común: menú lateral por fases de trabajo

- **Fecha**: 2026-10-27
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, c36fd59
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173, barra lateral izquierda (desde ancho `md`)

## Resumen

El menú lateral mezclaba lo comercial y lo operativo en un bloque sin título, y "Laboral" se llamaba igual
que su grupo. Ahora las opciones se agrupan por el recorrido de trabajo de una ETT (cliente → presupuesto →
petición → selección → contrato → misión → horas → factura) y los ajustes van fijos abajo.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/App.tsx` (`NAV`, `Sidebar`, `SidebarSection`) | Todas las que llevan barra lateral (`laboral.html`, `peticiones.html`, `fichaett.html`, `candidatos.html`, `empresas.html`, `presupuestos.html`) | Barra lateral completa |
| `src/Inicio.tsx` | — | Tarjeta "Laboral" de la portada pasa a "Contratos y altas" |

## Cambios

### Grupos y opciones del menú

- **Antes**: bloque sin título (Inicio, Peticiones, Presupuestos, Empresas y clientes, Candidatos, Selección),
  "Operativa y Laboral" (Laboral, Incorporaciones, Personal en misión, Horas e incidencias, Facturación) y
  "Gestión y Soporte" (Documentos, Informes, Mi ETT, Configuración).
- **Ahora** (textos exactos, icono de lucide entre paréntesis):
  - *(sin título)*: Inicio (`LayoutDashboard`)
  - **Comercial**: Empresas (`Building2`), Presupuestos (`Calculator`)
  - **Operativa**: Peticiones (`Inbox`, contador `14`), Candidatos (`Users`), Selección (`UserCheck`)
  - **Laboral**: Contratos y altas (`FileSignature`), Personal en misión (`Briefcase`), Horas e incidencias (`Clock`)
  - **Gestión**: Facturación (`Receipt`), Informes (`BarChart3`), Documentos (`FileText`)
  - **Ajustes**, fijo al pie: Mi ETT (`Building`), Usuarios y permisos (`ShieldCheck`), Tablas maestras (`Database`), Configuración (`Settings`)
- **Comportamiento**: igual que antes. Las opciones sin pantalla salen en gris con el aviso "Próximamente".
  El grupo Ajustes no se desplaza con el resto: queda encima de la versión, separado por `border-t border-slate-800`.
- **Por qué**: el orden explica el negocio y cada perfil encuentra su zona; los ajustes se usan poco y no deben
  competir con el trabajo diario.

### Opciones renombradas, quitadas y nuevas

- "Laboral" → **"Contratos y altas"**. La ruta sigue siendo `#/laboral`.
- "Empresas y clientes" → **"Empresas"**, ruta `#/empresas`. En el buscador de la cabecera el grupo también
  se llama "Empresas".

### Pantallas vinculadas al menú

- **Antes**: solo Peticiones, Laboral y Mi ETT abrían pantalla.
- **Ahora** también abren pantalla Empresas (`#/empresas`), Presupuestos (`#/presupuestos`) y Candidatos
  (`#/candidatos`). Se han importado tal cual de las maquetas con `scripts/import-design.py`, sin retoques:
  `src/views/EmpresasView.jsx`, `PresupuestosView.jsx` y `CandidatosView.jsx`.
- El script admite ahora maquetas sin barra lateral propia (`presupuestos.html` no la tiene).
- Las animaciones propias de esas maquetas (`animate-drawer`, `animate-pulse-subtle`) pasan a `src/index.css`.
- Pendiente de diseño: Presupuestos conserva su cabecera oscura de módulo ("ERP ETT · v3 Cotización", selector
  de rol, Listado, Editar presupuesto). Queda como una segunda barra oscura bajo la cabecera común y habrá que
  integrarla. Candidatos y Empresas muestran migas de pan con nombres de ETT distintos ("Talentia Express ETT").
- **Quitada "Incorporaciones"**: la pantalla de Contratos y altas ya lleva los expedientes de incorporación.
- **Nuevas**: "Usuarios y permisos" (`#/usuarios`) y "Tablas maestras" (`#/tablas`: convenios, categorías,
  tipos de contrato, puestos). Aún sin pantalla.

## Componentes y estilo

- **Nuevos o modificados**: `SidebarSection` en `src/App.tsx` pinta un grupo (título + enlaces). `NavSection`
  tiene un campo nuevo, `pie`, para fijar un grupo al final de la barra.
- **Colores, tamaños o iconos nuevos**: iconos `ShieldCheck` y `Database`. Sin colores nuevos.

## Datos

Sin cambios de datos.

## Dudas y pendientes

- ¿"Selección" como opción propia o solo dentro de cada petición? Se ha dejado aparte porque quien selecciona
  trabaja con muchas peticiones a la vez.
- ¿"Presupuestos" u "Ofertas"? El programa antiguo dice "Ofertas"; se mantiene "Presupuestos" como en las maquetas.
- ¿Hace falta "Incorporaciones" como paso propio? Se ha quitado.
- Para Enric: más adelante, mostrar el menú según el perfil del usuario (selección no necesita ver Facturación).
- El rótulo "Módulos principales" de arriba se mantiene; con los grupos con título quizá sobra.
