# Portal del trabajador: de momento, solo para personas contratadas

- **Fecha**: 2026-10-30
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, (pendiente)
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/trabajadores.html

## Resumen

Decisión del diseñador: por ahora, el portal del trabajador es solo para quien trabaja o ha trabajado con la ETT.
Más adelante se decidirá si se abre también a candidatos. Resuelve la duda de `2026-10-30-portales-acceso-y-empresas.md`.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/portal/PortalCandidato.jsx` | — | Se quitan Ofertas y Mis candidaturas |
| `src/portal/Acceso.jsx` | — | El acceso dice para quién es |
| `src/views/FichaEttView.jsx` | — | Mi ETT → Portales: descripción del portal del trabajador |

## Cambios

- **Fuera del portal**:
  - La sección **Ofertas**, con el buscador, el filtro de provincia y «Me interesa».
  - El bloque **Mis candidaturas** de Inicio.
- **Menú**: Inicio, Contratos, Horas, Nóminas y Perfil. En el móvil vuelve a tener cinco iconos.
- **Acceso**: dice que el portal es «para quien trabaja o ha trabajado con nosotros».
- **Mi ETT → Portales**: la descripción ya no habla de ofertas.

## Dudas y pendientes

- **Si se abre a candidatos más adelante**, se recuperan Ofertas y Mis candidaturas, que están en el commit 91ff429.
  Habrá que decidir cómo se da de alta alguien que la ETT aún no tiene.
- **Para Enric**: solo pueden entrar las personas con al menos un contrato con la ETT, en curso, pendiente de firmar
  o terminado. La publicación de ofertas de Peticiones («Portal de candidatos», `…/candidatos`) queda aparte y
  pendiente de decidir.
