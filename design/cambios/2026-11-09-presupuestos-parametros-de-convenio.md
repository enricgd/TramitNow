# Presupuestos: los parámetros retributivos tienen que salir del convenio (solo para desarrollo)

- **Fecha**: 2026-11-09
- **Estado**: pendiente <!-- el agente de Enric lo cambia a "incorporado (AAAA-MM-DD)" -->
- **Rama y commits**: `design`, sin cambios en la demo
- **Cómo verlo**: Presupuestos → un presupuesto → Posiciones → «Editar» en un puesto → «Parámetros retributivos de
  convenio».

## Resumen

Decisión del diseñador: en el panel de cada puesto, los **parámetros retributivos** se tienen que **rellenar solos con
el convenio, la categoría y el nivel elegidos**. En la demo se escriben a mano y **no se cambia**: es una nota para
programarlo así en la aplicación real.

## Dónde está

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/PresupuestosView.jsx` | `design/presupuestos.html` | Panel del puesto: convenio, categoría, nivel y «Parámetros retributivos de convenio» |

## Cómo tiene que funcionar

1. Al elegir **convenio + categoría profesional + grupo/nivel**, se rellenan con la tabla salarial vigente de ese
   convenio:
   - Salario base anual.
   - Plus de convenio al mes (y los demás pluses fijos que tenga la tabla).
   - Pagas anuales.
   - Horas anuales.
   - Horas por día.
2. Junto a los campos, una etiqueta **«Del convenio»** con el año de la tabla, por ejemplo «Tablas 2026».
3. **Se pueden cambiar a mano** (por ejemplo, si el cliente paga por encima de convenio):
   - El campo cambiado deja de llevar «Del convenio».
   - Hay que poder volver al valor del convenio con un clic.
4. **No se puede pagar por debajo del convenio**: si el salario queda por debajo del de la tabla, aviso claro, que
   impide enviar el presupuesto o pide aprobación de dirección (por decidir).
5. Al **cambiar de convenio, categoría o nivel**, los valores se vuelven a cargar. Si se habían cambiado a mano, antes
   se pregunta si se sobrescriben.
6. Con «Otro / personalizado» en el convenio, la categoría o el nivel, no hay tabla: los campos quedan vacíos y se
   rellenan a mano.
7. Los **coeficientes de los conceptos extra** (hora extra, nocturna, fin de semana, festiva) también tienen que salir
   del convenio, cuando los tenga.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Convenio | ámbito, sector, vigencia | nuevo | | En Tablas maestras |
| Tabla salarial del convenio | convenio, año, categoría, grupo/nivel, salario base anual, pluses al mes, pagas, horas anuales, horas por día, coeficientes de horas extra/nocturna/fin de semana/festiva | nuevo | | Una por convenio y año |
| Puesto del presupuesto | tabla salarial usada (convenio y año), campos cambiados a mano | nuevo | | Para saber qué viene del convenio y qué no |

## Dudas y pendientes

- **Por decidir**: si pagar por debajo de convenio bloquea el envío o pide la aprobación de dirección.
- **Para Enric**: de dónde salen las tablas salariales. Pueden darse de alta a mano en Tablas maestras o importarse
  (BOE o boletines provinciales). Cuando sale la tabla de un año nuevo, hay que decidir qué pasa con los presupuestos
  ya enviados.
