# Área de empresas: el mismo color de TramitNow

- **Fecha**: 2026-10-30
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, b329894
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/empresas.html

## Resumen

Decisión del diseñador: el Área de empresas usa el **índigo de TramitNow**, como el resto. Al ser un portal de
TramitNow, tiene que llevar su color. Ya se distingue bastante del portal del trabajador por la estructura: menú
horizontal, pensado para el ordenador y con tablas. Deja sin efecto el azul petróleo de
`2026-10-30-portales-acceso-y-empresas.md`.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `empresas.html` | — | Sin la clase `tema-empresa` |
| `src/index.css` | — | Se quita el tema `tema-empresa` |
| `src/views/EmpresasView.jsx` | — | Etiquetas de permisos en índigo |
| `src/views/FichaEttView.jsx` | — | Mi ETT → Portales: ya no habla de colores distintos |

## Cambios

- **Área de empresas** (acceso incluido): índigo de TramitNow, igual que el ERP y el portal del trabajador.
- **Etiquetas de permisos** en los contactos de Empresas: también en índigo.
- **Mi ETT → Portales**: «usan el logo y el nombre de la ETT, con los colores de TramitNow».
