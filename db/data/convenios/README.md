# Datos de convenios del catálogo global

Primeros convenios del catálogo global (ver `docs/convenios-globales.md`). Cada fichero `<regcon>.json` es un
convenio con sus publicaciones oficiales, sus versiones (una por periodo con tablas distintas), las categorías
y los importes de cada versión. Lo importa el cargador de las tablas globales.

**Estado: borrador extraído, pendiente de la revisión a cuatro ojos.** Ningún dato está publicado para las ETT
hasta que otra persona lo compare con el boletín (ver «Cómo revisar» al final).

Extraído el 16/11/2026. Todos los importes salen del BOE (boe.es); webs de terceros solo se usaron para
localizar las publicaciones.

## Convenios

| Fichero | Convenio | REGCON | Versiones | Categorías | Importes |
|---|---|---|---|---|---|
| `99009525011995.json` | VI Convenio colectivo estatal de empresas de trabajo temporal | 99009525011995 | 2018, 2019, 1/1/2020-30/11/2020, desde 1/12/2020 | 7 | 36 |
| `99000875011981.json` | Convenio colectivo estatal de industrias cárnicas | 99000875011981 | 2024, 2025 provisional, 2025 definitiva | 13 | 339 |
| `99012145012002.json` | III Convenio colectivo de ámbito estatal del sector de contact center | 99012145012002 | 2022, 2023, 2024, 2025, 2026 | 12 (10 desde 2024) | 192 |

Importes = filas de `salaryItems` sumando todas las versiones.

### Por qué estos dos convenios sectoriales

Se pedían dos convenios **estatales con tablas nacionales** muy usados en puesta a disposición:

- **Industrias cárnicas**: la industria alimentaria es de los sectores con más puesta a disposición (picos de
  producción, campañas, rotación alta en mataderos y salas de despiece), y el convenio estatal tiene una única
  tabla nacional por categoría. Vigente hasta el 31/12/2025 y en ultraactividad hasta que se firme otro (art. 4).
- **Contact center**: sector de servicios con mucha contratación por campañas y altas rotaciones de
  teleoperadores, habitual en ETT. Tabla nacional por niveles. Vigente hasta el 31/12/2026 (art. 6), con tablas
  de 2025 y 2026 ya publicadas.

Descartados: grandes almacenes (también nacional y muy usado en campañas; candidato para la siguiente tanda, con
cinco revisiones salariales entre 2024 y 2026), logística y transporte de mercancías (el acuerdo estatal no
trae tablas; van por convenios provinciales), hostelería y comercio (tablas provinciales).

## Fuentes

### Empresas de trabajo temporal (99009525011995)

| id | Publicación | Tipo | Qué aporta |
|---|---|---|---|
| p1 | [BOE-A-2018-17954](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2018-17954), BOE 28/12/2018 | texto_inicial | Texto: jornada, vacaciones, pagas, nocturnidad, horas extra |
| p2 | [BOE-A-2019-4622](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2019-4622), BOE 29/03/2019 | correccion_errores | Tabla salarial corregida y definitiva (pág. 32498): origen de todas las versiones |
| p3 | [BOE-A-2025-9798](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-9798), BOE 17/05/2025 | sentencia | Decreto de la Audiencia Nacional sobre el art. 36.1.l); no cambia importes |

Las tablas son solo para el **personal de estructura** de la ETT. Al personal puesto a disposición se le paga,
como mínimo, lo que fija el convenio de la empresa usuaria (art. 11 de la Ley 14/1994 y arts. 31 a 34 del
convenio). No hay tablas posteriores a 2020 ni VII Convenio en el BOE (comprobado en las referencias posteriores
del documento y en el buscador del BOE): está en prórroga y la última versión queda abierta.

### Industrias cárnicas (99000875011981)

| id | Publicación | Tipo | Qué aporta |
|---|---|---|---|
| p1 | [BOE-A-2025-13965](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-13965), BOE 07/07/2025 | texto_inicial | Tabla definitiva 2024 (pág. 90484), provisional 2025 (pág. 90485), jornada, vacaciones, pagas |
| p2 | [BOE-A-2026-3593](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-3593), BOE 16/02/2026 | revision_salarial | Las tablas provisionales de 2025 pasan a definitivas sin cambios (IPC de diciembre de 2025: 2,9 %) |

### Contact center (99012145012002)

| id | Publicación | Tipo | Qué aporta |
|---|---|---|---|
| p1 | [BOE-A-2023-13741](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2023-13741), BOE 09/06/2023 | texto_inicial | Anexos I y II con tablas 2022, 2023 y 2024 (págs. 82518-82519) |
| p2 | [BOE-A-2025-8781](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-8781), BOE 02/05/2025 | revision_salarial | Tablas 2025 (págs. 59757-59758), nivel 10 ajustado al SMI |
| p3 | [BOE-A-2026-5300](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-5300), BOE 06/03/2026 | revision_salarial | Tablas 2026 (+3,4 %) y dietas (págs. 33613-33614) |
| p4 | [BOE-A-2024-3432](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-3432), BOE 22/02/2024 | sentencia | Nulidad parcial del art. 30.1 (permisos); no cambia importes |
| p5 | [BOE-A-2026-17492](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-17492), BOE 10/08/2026 | sentencia | Ilegalidad parcial del art. 30.1; no cambia importes |

No incluida (no cambia importes y el formato no tiene tipo para ella): modificación del art. 27, consolidación
de jornada, [BOE-A-2025-22414](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-22414).

## Cómo se ha extraído

1. Localización: para cada convenio se tomó el texto en el BOE y su lista oficial de «referencias posteriores»
   (análisis del documento en boe.es), que enlaza todas las revisiones salariales, correcciones y sentencias.
   Se completó con el buscador del BOE (sección III) para descartar convenios o tablas más nuevos.
2. Extracción: los importes se leyeron por programa de las tablas HTML oficiales
   (`https://www.boe.es/diario_boe/txt.php?id=...`), celda a celda y por posición, y se convirtieron del formato
   español (`30.694,020`) a número **sin redondear**: se conservan los tres decimales cuando el BOE los trae.
3. Página de cada dato (`source`): se tomó del PDF oficial (`https://www.boe.es/boe/dias/.../pdfs/<id>.pdf`).
4. Condiciones (jornada, vacaciones, pagas) leídas a mano del articulado; el artículo y la página van en
   `conditions.notes`.

## Cómo se ha comprobado (segunda pasada)

Una comprobación independiente de la extracción, sobre otra fuente: el **texto de los PDF oficiales**, no el HTML.

- **Importe a importe**: cada uno de los 567 importes se buscó en la fila y columna que le toca de la tabla del
  PDF. Coinciden todos. La fila del nivel 10 de cárnicas sale desordenada al extraer el PDF (celdas partidas):
  se comparó como conjunto de valores y su orden se confirmó con las fórmulas de abajo.
- **Página citada**: cada importe aparece escrito en la página del BOE que dice su `source`.
- **Coherencia aritmética** (detecta erratas del boletín o columnas cruzadas):
  - ETT: cada columna = anterior × (1 + % de la tabla), a céntimo, niveles 3 a 7.
  - Cárnicas: 2025 = 2024 × 1,03 en salario diario; nocturnidad = diario × 0,31 / 6,666 (anexo 7);
    retribución de vacaciones = salario diario; niveles 1-7: anual = mensual × 14; niveles 8-13:
    anual = diario × (días del año + 60), 426 en 2024 y 425 en 2025.
  - Contact center: salario base 2023 = 2022 × 1,035; 2024 = 2023 × 1,03; 2026 = 2025 × 1,034.
- **Formato**: JSON válido (`python3 -m json.tool`), REGCON de 14 dígitos, cada importe apunta a una categoría y
  publicación existentes, unidades dentro de las permitidas.

Resultado: 3.942 comprobaciones, 0 discrepancias. Ninguna comprobación automática sustituye a la revisión humana.

## Decisiones de formato y ajustes que harían falta

El contrato con el cargador se ha respetado, con estas decisiones que conviene confirmar:

1. **`category: null` = para todas las categorías.** Pluses que el convenio fija igual para todos (plus de
   idioma, nocturnidad y transporte de contact center, bolsa de vacaciones de cárnicas, nocturnidad y horas
   extra del ETT en %) se han cargado una vez con `category: null` en lugar de repetirlos por categoría. El
   cargador tiene que aceptarlo, o habría que añadir un `"applies": "todas"`.
2. **Conceptos.** Se ha usado un `concept` distinto para cada columna, para que `(category, concept)` sea único
   dentro de una versión: `salario_base` (anual), `salario_base_mensual`, `salario_base_diario`,
   `valor_hora_descuento`, `retribucion_vacaciones_dia`, `hora_extra`, `nocturnidad`, `plus_penosidad`,
   `plus_penosidad_ruido`, `plus_idioma`, `plus_transporte`, `recargo_festivo`, `recargo_festivo_especial`,
   `recargo_domingo`, `teletrabajo_30h_o_mas`, `teletrabajo_menos_30h`, `dieta_una_comida`, `dieta_dos_comidas`,
   `complemento_vacaciones_dia_natural`, `complemento_vacaciones_dia_laborable`. Convendría fijar este
   vocabulario en el esquema.
3. **Faltan unidades**: `km` (kilometraje), `punto` (precio punto prima) y por comida o pernocta (dietas de
   cárnicas). Esos importes se han dejado fuera y están en `pendingReview`.
4. **Puestos de cada nivel.** Los convenios asignan muchos puestos a cada nivel salarial (art. 41 de contact
   center, art. 27 de cárnicas, art. 21 del ETT). El formato solo tiene `name`; para enlazar las categorías de
   la ETT con las del convenio vendría bien una lista `positions` (o `aliases`) por categoría.
5. **`group`** es null en ETT y contact center: sus niveles mezclan grupos profesionales.
6. **Provisional y definitiva con los mismos importes** (cárnicas 2025): se cargan dos versiones con el mismo
   periodo, la provisional de p1 y la definitiva de p2. El cargador debe tratar la segunda como sustituta.
7. **Tipo de publicación `modificacion`**: no existe; hace falta para modificaciones parciales del texto que
   no son corrección de errores (ver contact center).
8. **Importes que no son pagos**: `valor_hora_descuento` (cárnicas) es el valor para descontar horas de
   ausencia, no un concepto que se cobre. Va como `salarial: true` porque el formato no tiene otra opción.
9. **Antigüedad**: ninguno de los tres convenios tiene una tabla de antigüedad que cargar (ETT: no hay;
   cárnicas: solo la consolidada a 1994, que es personal). Para convenios con trienios por categoría hará falta
   otra estructura.

## Pendiente de revisar

Cada fichero tiene su lista `pendingReview`. Lo más importante:

- **ETT**: el art. 5.1 fija la vigencia «desde el 1 de enero de 2011 hasta el 31 de diciembre de 2020»
  (copiado tal cual); la tabla de 2020 deja los niveles 1 y 2 por debajo del SMI actual; bono guardería sin
  importes revisados publicados; el nivel 0 no tiene importe.
- **Cárnicas**: celda suelta «0,000» en la fila del nivel 10 de 2024 (ignorada); nivel «T» por 7 en la tabla
  de 2025; importe de las pagas extra no explícito; sin tablas de 2026.
- **Contact center**: recargos de festivos y domingos de 2022-2024 solo para los niveles 6 a 11 (los demás
  «se calculan» y no se han calculado); dietas y kilometraje solo para 2026; errata «IPC real del año 2026» en
  el acta de 2026.
- CNAE puesto a nivel de división (78, 10, 82); afinar si el catálogo usa clases.

## Cómo revisar (cuatro ojos)

Para cada versión: abrir el PDF del BOE en la página que indica `source` y comparar la tabla fila a fila con
`salaryItems` (las categorías están en el mismo orden que en el boletín). Comprobar las condiciones en los
artículos citados en `conditions.notes` y decidir cada punto de `pendingReview`. Quien revise no puede ser
quien extrajo los datos.
