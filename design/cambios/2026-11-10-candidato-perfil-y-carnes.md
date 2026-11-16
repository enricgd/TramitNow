# Ficha del candidato: «Otros» en carnés, sin perfiles secundarios y perfil principal en desplegable

- **Fecha**: 2026-11-10
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, f1047ba
- **Cómo verlo**: `npm --prefix apps/web run dev` → Candidatos → un candidato → pestaña «Perfil y carnés» → «Editar».

## Resumen

Tres cambios que pidió el diseñador en la ficha del candidato:

1. En «Permisos de conducir y carnés», la opción **Otros**.
2. **Quitar** el campo «Otros perfiles que puede cubrir»: no hace falta.
3. El **perfil principal no se autocompleta**.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/CandidatosView.jsx` | `design/candidatos.html` | Pestaña «Perfil y carnés» (ver y editar) y listado de carnés |

## Cambios

- **Permisos de conducir y carnés**:
  - Nueva opción **«Otros»**, en el listado y con un botón «+ Otros» junto al título.
  - Al marcarla aparece el campo «Otros permisos o carnés: ¿cuáles?», para escribirlos.
  - En la ficha se ven así: «Permiso B, Carné de carretillero, Otros: Carné de grúa autopropulsada».
- **Otros perfiles que puede cubrir**: ya no aparece, ni al ver ni al editar. Los datos que ya hubiera se conservan
  para la búsqueda, pero no se enseñan.
- **Perfil principal**:
  - Antes era un buscador con sugerencias mientras se escribía; ahora es un **desplegable normal**, con los perfiles
    agrupados por sector (Logística, Transporte, Industria, Hostelería…).
  - Al final está «Otro perfil (añadir al listado)…», que deja escribir uno nuevo y lo añade al listado.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Candidato | otrosCarnes | nuevo | texto | Solo si tiene «Otros» en permisos y carnés |
| Candidato | otherProfiles | sin uso en pantalla | | Se puede quitar del modelo si no se usa en búsquedas |

## Dudas y pendientes

- **Por confirmar**: si «Otros perfiles» también sobra en la búsqueda de candidatos para una petición (ahora un
  candidato aparece también por sus perfiles secundarios).
