# Facturación: servicios además de las horas (selección, formación…) y nueva factura

- **Fecha**: 2026-11-10
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, (pendiente)
- **Cómo verlo**: `npm --prefix apps/web run dev`.
  - Mi ETT → Facturación → «Servicios que factura la ETT».
  - Facturación → «Añadir servicio a facturar», «Nueva factura», «Por facturar» y «Servicios».
  - Empresas → un cliente → Facturación → «Añadir servicio a facturar».

## Resumen

La nota «afegir creació de factures a mà per processos de selecció» venía de que la ETT, además de ceder personal,
hace **otros servicios** que también factura: **selección de personal** para que el cliente contrate directamente,
formación, reconocimientos médicos… Hasta ahora las facturas solo salían de las horas.

Lo que se acordó con el diseñador: cada servicio **se registra cuando se hace** y aparece en **«Por facturar»** con las
horas de ese cliente y mes, para que **no se quede nada sin facturar**. Para casos sueltos, **«Nueva factura»**.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/serviciosDemo.js` | — | **Nuevo**: catálogo de servicios y formas de cobro, compartido |
| `src/views/FichaEttView.jsx` | `design/fichaett.html` | Facturación: catálogo de servicios |
| `src/views/FacturacionView.jsx` | — | Servicios registrados, «Por facturar», nueva factura, líneas de servicio y descargas |
| `src/views/EmpresasView.jsx` | `design/empresas.html` | Ficha → Facturación: «Añadir servicio a facturar» |

## Cambios

### 1. Catálogo de servicios (Mi ETT → Facturación)
- Tabla **«Servicios que factura la ETT»**, editable. Cada servicio tiene nombre, cómo se cobra, precio o %, unidad y
  si está activo. Se pueden añadir servicios propios.
- De serie:

| Servicio | Cómo se cobra | Por defecto |
|---|---|---|
| Selección de personal | % del salario bruto anual de la persona contratada | 15 % |
| Formación PRL | Por persona | 85 € |
| Reconocimiento médico | Por persona | 45 € |
| Gestión de nóminas | Por unidad (nómina) | 12 € |
| Desplazamientos | Por unidad (km) | 0,26 € |
| Otro servicio | Importe fijo | — |

### 2. Registrar un servicio («Añadir servicio a facturar»)
- **Desde dónde**:
  - Facturación, en la cabecera y en la sección «Servicios».
  - La ficha del cliente en Empresas: abre Facturación con el cliente ya elegido.
  - Un borrador de factura: «Añadir servicio» lo añade directamente a esa factura.
- **Formulario**: cliente, servicio, fecha, descripción y petición o proceso (opcional).
  - En **selección**, el salario bruto anual y el %: el importe se calcula solo (por ejemplo, 15 % de 38.000 € =
    5.700 €).
  - En el resto, la cantidad y el precio del catálogo, que se puede cambiar.

### 3. «Por facturar» con horas y servicios
- Cada cliente y mes junta sus **horas y sus servicios pendientes**. Por ejemplo: «Hostelería · octubre: 887,33 h + 1
  servicio · 18.862,07 € de base».
- Un servicio sin horas (una selección para un cliente al que no se le cede personal) sale en su propia tarjeta.
- Al preparar la factura, salen las líneas de horas y las de servicios. Si se registra un servicio después de
  preparar el borrador, al abrirlo desde «Por facturar» se añade al borrador.
- Las líneas de servicio llevan la etiqueta «Servicio». En un borrador se pueden quitar, y el servicio vuelve a «Por
  facturar».

### 4. Lista «Servicios (además de las horas)»
- Todos los servicios registrados, con su importe y su estado: **Por facturar**, **En borrador** o **Facturado en
  F2026-…** (al pulsar, abre la factura). Así nunca se cobra dos veces.

### 5. «Nueva factura»
- Botón en la cabecera de Facturación: se elige el cliente y se crea un **borrador vacío**, al que se añaden servicios
  o líneas libres. Después se emite, se envía, se cobra y se descarga como las demás.

### Otros
- Nuevo cliente en Facturación: **Manufacturas Metálicas del Henares** (selección de personal, sin cesión).
- La tabla «Facturación por sucursal» y la descarga de Excel por persona incluyen los servicios.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Servicio del catálogo | nombre, cómo se cobra, precio o %, unidad, activo | nuevo | porcentaje / persona / unidad / fijo | Por ETT |
| Servicio registrado | cliente, servicio, fecha, descripción, referencia, cantidad y precio, o salario y % | nuevo | | Pendiente hasta que entra en una factura |
| Línea de factura | servicio | nuevo | id del servicio registrado | Para saber qué servicios están facturados |

## Dudas y pendientes

- **Por confirmar**:
  - Si algún servicio lleva un IVA distinto (por ejemplo, formación o reconocimientos médicos exentos). Ahora toda la
    factura lleva el IVA del cliente.
  - Si la **importación desde Excel** de servicios hace falta («subidas de importes»): quedó para más adelante.
- **Para Enric**:
  - El módulo **Selección** (ahora desactivado en el menú): al cerrar un proceso con una contratación, tendría que
    registrar solo el servicio a facturar.
  - En la demo, el catálogo que se edita en Mi ETT no llega a Facturación, porque cada pantalla tiene sus datos de
    ejemplo. En real es el mismo.
