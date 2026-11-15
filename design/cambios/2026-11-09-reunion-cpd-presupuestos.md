# Reunión de flujo: DNI del firmante en el CPD y Presupuestos más sencillo

- **Fecha**: 2026-11-09
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, 69430cb
- **Cómo verlo**: `npm --prefix apps/web run dev`.
  - Presupuestos → PRE-2026-0048 → pestaña **Posiciones** → «Editar» en un puesto.
  - Peticiones → PET-2026-0050 → Contratos y altas → «Ver condiciones».

## Resumen

Primeros cambios que salen de la reunión de revisión del flujo de pantallas:

1. En el CPD tiene que aparecer el DNI del responsable de la ETT, que es quien lo firma.
2. En Presupuestos:
   - Unir las pestañas «Posiciones» y «Escandallo y costes» en una sola, llamada «Posiciones», donde se puedan
     añadir extras a cada posición.
   - Al crear el presupuesto, dos casillas editables para poner el margen en porcentaje o en importe.
   - Poner solo «EPIs», sin la lista de equipos.
   - Quitar la columna «Coef. salario» de los conceptos extra de cada puesto.

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/ettDemo.js` | — | **Nuevo**: representante legal de la ETT y n.º de autorización, compartidos |
| `src/views/PeticionesView.jsx` | `design/peticiones.html` | CPD previo: quién firma por cada parte y n.º de autorización |
| `src/portal/PortalEmpresa.jsx` | — | Firma del CPD: quién lo firma por la ETT |
| `src/views/FichaEttView.jsx` | `design/fichaett.html` | El representante sale de `ettDemo.js` (mismos datos) |
| `src/views/PresupuestosView.jsx` | `design/presupuestos.html` | Pestaña Posiciones (unida), margen en % o €/h, extras propios, EPIs y Coef. salario |

## Cambios

### 1. CPD: quién lo firma
- En el **CPD previo** (Peticiones → Contratos y altas → «Ver condiciones»):
  - Bloque **«Firma por la ETT»**: Begoña Arrieta Lasa, administradora única, **DNI 00000099K**. Es el representante
    legal de Mi ETT («firma contratos y CPD»).
  - Bloque **«Firma por la empresa usuaria»**: el contacto del cliente.
  - Junto al nombre de la ETT, su n.º de autorización administrativa.
- En el **Área de empresas**, al firmar un CPD, se indica quién lo firma por la ETT, con su DNI.

### 2. Presupuestos: una sola pestaña «Posiciones»
- Las pestañas pasan a ser: Resumen · Empresa · **Posiciones** · Condiciones · Versiones · Documentos · Actividad.
- En **Posiciones**, de arriba abajo:
  1. Las tarjetas de cada puesto, que ahora enseñan sus **conceptos extra** con la tarifa y el botón **«Añadir
     extra»**.
  2. Debajo, «Margen y costes internos» (lo que antes era «Escandallo y costes»): el margen objetivo, los costes
     internos, qué se aplica en cada puesto y los conceptos extra por defecto.
- **Conceptos extra propios**: en el panel del puesto (y en los de por defecto) hay una línea para **añadir un
  concepto extra** con nombre, por ejemplo «Plus de peligrosidad». En el puesto se escribe su salario por hora y la
  tarifa se calcula como en los demás. Los añadidos se pueden quitar.

### 3. Margen en porcentaje o en importe
- **Dos casillas editables**: **%** (sobre la tarifa) y **€/h** (sobre el coste). Cuenta la que se rellena; la otra
  enseña en gris lo que sale.
  - En el presupuesto: margen objetivo por defecto, en % o en €/h.
  - En cada puesto: igual. Vacías = el del presupuesto.
- La **tarifa sugerida** sale del margen elegido: con %, coste ÷ (1 − margen); con €/h, coste + importe.

### 4. EPIs
- El coste interno se llama solo **«EPIs»**, sin la lista de equipos («calzado S3, chaleco y guantes»). Descripción:
  «Equipos de protección individual que necesite el puesto».

### 5. Conceptos extra de cada puesto, sin «Coef. salario»
- En el panel del puesto ya no sale la columna **«Coef. salario»**. El salario de cada extra sale del convenio (el
  coeficiente se define en los conceptos extra por defecto del presupuesto). Quedan «Salario», «Coef. tarifa»,
  «Tarifa» y «En la propuesta».

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Presupuesto | margenTipo, margenImporte | nuevo | porcentaje / importe; €/h | margenObjetivo sigue siendo el % |
| Puesto del presupuesto | margenTipo, margenImporte | nuevo | porcentaje / importe; €/h | Vacíos = los del presupuesto |
| Concepto extra | propio, salarioManual | nuevo | sí/no; €/h | Extras añadidos a mano, con su salario |

## Dudas y pendientes

- **Por confirmar**: hemos entendido «escoger el porcentaje o la cantidad» como el **margen**. Si se refería a otro
  campo (por ejemplo, los costes internos, que ya pueden ser en % o en importe fijo desde «Tipo de cálculo»), se
  cambia.
- En Peticiones, la ficha de la petición sigue indicando qué EPI lleva el puesto («Calzado S3, chaleco…»), porque es
  información para el CPD y la PRL. Si también hay que quitarlo allí, se quita.
- **Para Enric**: el CPD tiene que sacar el representante de la ficha de la ETT (Mi ETT → Datos fiscales). Si una
  sucursal tiene su propio apoderado, habría que poder elegirlo.
