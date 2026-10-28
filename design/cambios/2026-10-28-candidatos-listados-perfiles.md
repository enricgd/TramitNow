# Candidatos: listados homogéneos de perfiles, carnés, habilidades e idiomas, y filtro por perfil

- **Fecha**: 2026-10-28
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design` (ver el commit que añade esta nota)
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/#/candidatos:
  - Filtros "Todos los perfiles" y "Carnés, habilidades e idiomas".
  - Buscar «toro».
  - Abrir un candidato → Perfil y carnés → Editar.

## Resumen

La base de datos de candidatos no depende de un presupuesto: hay muchos tipos de perfil y antes solo había cuatro
categorías fijas, sin poder añadir más. Además, carnés, habilidades e idiomas eran texto libre, así que una misma cosa
podía escribirse de varias maneras («carretilla», «carretilla frontal», «toro»…) y luego no se encontraba.

Ahora todo sale de **listados homogéneos con sinónimos**: se busca por cualquiera de los nombres, se guarda siempre el
mismo y, si no existe, se añade al listado.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/CandidatosView.jsx` | `design/candidatos.html` | Filtros, tabla (columna nueva), buscador, ficha (Perfil y carnés) y alta rápida |

## Cambios

### Listados (con sinónimos)
- **Perfiles**: unos 30 perfiles agrupados por sector: logística, transporte, industria, hostelería, comercio,
  limpieza, oficina, agricultura, construcción y cuidados.
  - Ejemplo: «Carretillero/a» también se encuentra por carretillera, conductor de carretilla, toro o mozo
    especializado.
- **Permisos y carnés**: permisos B, C1, C, C+E y D, CAP, ADR, carretillero, PEMP, puente grúa, manipulador de
  alimentos y PRL de 20 h y 60 h.
- **Habilidades**: picking con radiofrecuencia (también «picking con PDA», «RF»), picking por voz, tipos de carretilla,
  transpaletas, paletizado, carga y descarga, control de stock, SGA/SAP, atención al cliente, etc.
- **Idiomas**: español, inglés, francés, alemán, italiano, portugués, catalán, euskera, gallego, árabe, rumano y chino.
  - Nivel: Nativo, C2, C1, B2, B1, A2 o A1.
  - Siempre con el formato «Inglés (B1)».
- Los datos antiguos se pasan al nombre del listado. Por ejemplo:
  - «Carnet Carretillero UNE 58451» → «Carné de carretillero».
  - «Francés (Medio)» → «Francés (B1)».
  - «Reponedor nocturno / Carretillero» → principal «Reponedor/a» y otro perfil «Carretillero/a».

### Ficha → Perfil y carnés → Editar
- **Perfil principal**, **otros perfiles**, **permisos y carnés** y **habilidades** usan un buscador del listado:
  - Al escribir, sugiere por nombre o por sinónimo («Carretillero/a · también «toro»») e indica el grupo.
  - Si no existe, ofrece **«Añadir «…» al listado»**. El valor nuevo queda disponible para todos los candidatos.
- **Idiomas**: se busca el idioma (o se añade uno nuevo), se elige el nivel y se pulsa "Añadir". Si el idioma ya
  estaba, se actualiza su nivel.
- Un aviso explica que se elija del listado para que todos usen los mismos nombres.

### Tabla y filtros
- Columna nueva **Perfil principal**, con «También: …» si tiene otros perfiles. Pulsar el perfil filtra por él.
- Filtro **Todos los perfiles**:
  - Agrupado por sector y con el número de candidatos de cada perfil.
  - Solo salen los perfiles que tiene algún candidato.
  - Cuenta tanto el perfil principal como los otros perfiles.
- Filtro **Carnés, habilidades e idiomas**: permisos y carnés, habilidades e idiomas (sin tener en cuenta el nivel).
- El **buscador** también encuentra por sinónimos: «toro» encuentra a los carretilleros y a quien tiene el carné de
  carretillero.
- "Limpiar" quita también estos dos filtros.
- **Alta rápida**: el perfil se elige del listado completo, agrupado por sector.

## Componentes y estilo

- **Nuevos** (dentro de `CandidatosView.jsx`):
  - `SelectorCatalogo`: buscador con sugerencias, sinónimos y "Añadir al listado".
  - `SelectorIdiomas`.
  - Utilidades `normalizarTexto` (ignora mayúsculas y acentos), `buscarExacto`, `homogeneizar` y `textoBuscable`.
- Se quita `ListaEditable`, sustituida por el buscador del listado.
- Si se usa en más pantallas (por ejemplo, en el puesto del presupuesto o en Tablas maestras), `SelectorCatalogo`
  pasará a `src/ui/`.
- Sin colores nuevos.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Perfil profesional | nombre, grupo (sector), sinónimos | nuevo (tabla maestra) | texto + lista de texto | Ampliable desde la ficha del candidato |
| Permiso o carné | nombre, grupo, sinónimos | nuevo (tabla maestra) | | |
| Habilidad | nombre, grupo, sinónimos | nuevo (tabla maestra) | | |
| Idioma | nombre | nuevo (tabla maestra) | | Nivel: Nativo, C2…A1 |
| Candidato | category, otherProfiles | cambiado | referencia a perfil (antes, texto libre) | |
| Candidato | drivingLicenses, skills | cambiado | referencias a los listados | |
| Candidato | languages | cambiado | idioma + nivel | |

## Dudas y pendientes

- **¿Quién puede añadir valores a los listados?** Ahora lo puede hacer cualquiera desde la ficha. Quizá convenga que
  los valores nuevos queden "pendientes de revisar" en Tablas maestras, para evitar duplicados.
- Los sinónimos de ejemplo son orientativos: el equipo debería revisarlos.
- **Para Enric**: crear las tablas maestras y migrar los textos actuales con la misma lógica de sinónimos.
