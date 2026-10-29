# Personas de ejemplo unificadas entre pantallas y buscador de la cabecera al día

- **Fecha**: 2026-10-29
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, (pendiente)
- **Cómo verlo**: `npm --prefix apps/web run dev`.
  - Busca a Ainhoa Larrazabal Urkijo en Candidatos, en Contratos y altas y en el buscador de la cabecera: el mismo
    DNI (00000127N).
  - La selección de PET-2026-0049 en Peticiones tiene las mismas personas que Candidatos.

## Resumen

Peticiones tenía sus propios candidatos de ejemplo (códigos «CND-…»), distintos de los de Candidatos («CAN-…»).
Contratos y altas y Personal en misión usaban DNI y teléfonos genéricos, y el buscador de la cabecera mostraba
datos antiguos: un cliente y un presupuesto que no existen, y a Ainhoa como «Disponible». Ahora todas las pantallas
usan las mismas personas.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/personasDemo.js` | — | **Nuevo**: código, DNI, teléfono y email de ejemplo de cada persona, compartidos |
| `src/views/PeticionesView.jsx` | `design/peticiones.html` | Plazas y selección con los códigos de Candidatos |
| `src/views/CandidatosView.jsx` | `design/candidatos.html` | 12 personas nuevas: las de la selección de Peticiones |
| `src/views/LaboralView.jsx` | `design/laboral.html` | DNI, teléfono y email de cada expediente |
| `src/views/MisionView.jsx` | — | DNI y teléfono de cada persona en misión |
| `src/Header.tsx` | — | Resultados de ejemplo del buscador |

## Cambios

- **`personasDemo.js`**: lista de las personas que salen en varias pantallas, con su número de candidato. De ahí
  salen el código (CAN-0xxx), el DNI (o NIE), el teléfono y el email, iguales en todas las pantallas.
- **Peticiones**:
  - Las personas de las plazas (PET-2026-0048, 0050, 0044, 0045 y 0031) llevan el código y los datos de Candidatos.
  - La bolsa y la selección usan códigos CAN- en vez de CND-.
  - Se añaden **Elena Sánchez Pascual** (entrevista en PET-2026-0049) y **David Castillo Ruiz** (entrevista en
    PET-2026-0050), que ya estaban en selección en Candidatos.
  - Las valoraciones ya no nombran empresas reales.
- **Candidatos**: se añaden las **12 personas de la selección de Peticiones**, con su candidatura en la misma
  petición y etapa.
  - Los inscritos salen como «Nuevo»; el resto, «En selección».
  - David Aranguren Sola está «Propuesta al cliente» en la plaza 3 de PET-2026-0050, como en Peticiones.
  - Kepa Iturriaga y Fatima Zahra El Idrissi tienen el DNI caducado, como en Peticiones («documentación no en
    vigor»).
- **Contratos y altas y Personal en misión**: el DNI, el teléfono y el email de cada persona son los de Candidatos.
- **Buscador de la cabecera**:
  - Ainhoa Larrazabal sale «En incorporación» en PET-2026-0048, y los DNI son los de Candidatos.
  - El cliente «Distribuciones Cantábrico» y el presupuesto «PRE-2026-0053», que no existían en ninguna pantalla,
    se sustituyen por Hostelería & Eventos Premium BCN y PRE-2026-0045.
  - El importe de PRE-2026-0042 es el del presupuesto: 105.792 €.

## Dudas y pendientes

- **Para Enric**: `personasDemo.js` es solo para la demo; en real, cada persona sale de `apps/api` con su código de
  candidato, y las plazas, expedientes y misiones apuntan a ese código.
