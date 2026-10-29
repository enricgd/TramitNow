# Mi ETT: CCC, autorización, garantía, certificado y datos alineados con el resto

- **Fecha**: 2026-10-29
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, (pendiente)
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/#/mi-ett → pestañas Resumen y Datos fiscales.

## Resumen

Mi ETT no tenía los datos que una empresa de trabajo temporal necesita por ley o para sus trámites: CCC,
autorización administrativa, garantía financiera, mutua, registro mercantil, representante legal y certificado
digital. Además, sus datos de ejemplo no cuadraban con el resto de la demo: sede en Barcelona con sucursales en
Girona y Lleida, otros usuarios y otras series de factura.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/FichaEttView.jsx` | `design/fichaett.html` | Resumen, Datos fiscales, Facturación, Sucursales, Usuarios, Plantillas y Actividad (datos) |
| `src/views/codigosPostales.js` | — | **Nuevo**: código postal → provincia y población, compartido por Candidatos y Mi ETT |
| `src/views/CandidatosView.jsx` | — | Usa `codigosPostales.js` en vez de su copia |

## Cambios

### Datos fiscales: bloques nuevos
- **Empresa de trabajo temporal y registro**:
  - N.º de autorización administrativa de ETT (el mismo que imprime Facturación) y fecha de autorización.
  - CNAE 7820.
  - Convenio del personal de estructura.
  - Registro mercantil (tomo, folio y hoja).
  - Representante legal, que firma contratos y CPD: nombre, cargo y DNI.
- **Seguridad Social: códigos de cuenta de cotización (CCC)**:
  - Una **tabla de CCC**, no un único campo: número, provincia, para quién (personas en misión o personal de
    estructura) y sucursal.
  - Se añaden, se editan y se eliminan (con confirmación).
  - El número se valida (11 cifras) y se formatea («48 0000001 01»). La provincia sale de las dos primeras cifras.
  - Debajo, la mutua colaboradora y el servicio de prevención.
- **Garantía financiera** (obligatoria): tipo, entidad, importe y vencimiento, con el estado («Vence en 40 días»).
- **Certificado digital y Sistema RED**: n.º de autorización RED y caducidad del certificado de empresa, con el
  estado.
- El panel «Editar datos fiscales» incluye todos estos campos, en secciones.
- El **código postal rellena la provincia** y, si la conoce, la población.

### Resumen: lo que falta o caduca pronto
- Sustituye al bloque fijo de avisos. Una lista calculada, cada aviso con «Revisar», que lleva a la pestaña:
  - Garantía financiera o certificado digital que vencen en 60 días o menos.
  - Sucursales sin CCC de personas en misión o de personal de estructura.
  - IBAN que falta.
  - Usuarios sin sucursal.
  - Plantillas incompletas.
- En la cabecera, «ETT autorizada n.º …» y el número de avisos (o «Todo en regla»).
- Las tarjetas de estado usan datos reales: sucursales, número de roles y CCC.

### Datos alineados con el resto de pantallas
- **Sede**: Delegación Norte (Bilbao), con CIF, dirección, autorización e IBAN iguales a los de Facturación.
  **Sucursales**: Delegación Norte (Bilbao) y Sucursal Barcelona. Se quitan Girona y Lleida.
- **Usuarios**: los que aparecen en las demás pantallas, con su sucursal:
  - Dirección: Begoña Arrieta Lasa.
  - Responsables de sucursal: Ane Uriarte y Nuria Castells.
  - Selección: Jon Ibarra y Ana Gómez.
  - Comercial: Elena Navarro, Carlos Mendoza y Laura Vidal.
  - Administración: Lucía Santos.
  - Gestión laboral: Marcos Rubio, sin sucursal (para el aviso).
- **Facturación**:
  - Series **F2026-** (facturas) y **R2026-** (rectificativas), con el próximo número: F2026-0108 y R2026-0004,
    como en Facturación.
  - El IBAN ya está completo.
- **Plantillas y actividad** con fechas de 2026 y hechos de la demo: el CCC de Barcelona, la factura F2026-0101, la
  apertura de Barcelona y la renovación de la garantía.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| ETT | autorización, fecha, CNAE, convenio, registro mercantil (tomo, folio, hoja), representante (nombre, DNI, cargo), mutua, servicio de prevención | nuevo | | |
| ETT | garantía financiera: tipo, entidad, importe, vencimiento | nuevo | | Aviso 60 días antes |
| ETT | autorización Sistema RED, caducidad del certificado | nuevo | | Aviso 60 días antes |
| CCC | número, provincia, tipo, sucursal | nuevo | personas en misión / personal de estructura | Varios por ETT |
| ETT | serie de facturas, serie de rectificativas, próximos números | cambiado | | Las de Facturación |

## Dudas y pendientes

- **Por confirmar con quien lleve lo laboral**: si hace falta un CCC de personal de estructura en cada sucursal o
  basta con el de la sede, y con cuántos días de antelación avisar de la garantía y del certificado.
- **Para Enric**:
  - Usar el CCC de la provincia del centro al comunicar el alta en el Sistema RED, y que el CCC, la autorización y
    el representante salgan en el contrato y en el CPD.
  - El listado completo de códigos postales (`codigosPostales.js` es un ejemplo corto).
