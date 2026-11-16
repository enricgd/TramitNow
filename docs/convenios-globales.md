# Catálogo global de convenios colectivos

> Propuesta (29/10/2026). Pendiente de revisar antes de tocar el esquema. Los puntos legales marcados con
> **[verificar]** hay que confirmarlos con la asesoría laboral.

## 1. Qué queremos ofrecer

Hoy cada ETT mete a mano, una a una, las tablas de los convenios que aplica, y cada ETT repite el mismo
trabajo con los mismos convenios. TramitNOW mantendría un **catálogo único de convenios, revisado y al día**,
que todas las ETT usan directamente:

- El texto del convenio, sus categorías y sus tablas salariales por año, con la fuente de cada dato.
- **Aviso cuando sale una revisión** (tablas nuevas, corrección de errores, sentencia), con el impacto
  concreto en cada ETT: qué clientes, contratos y trabajadores afecta, y cuánto.
- **Cambios retroactivos resueltos**: cuando unas tablas se publican con efectos atrasados, TramitNOW calcula
  las diferencias y prepara la regularización, tanto para pagar a los trabajadores como para repercutirla a
  la empresa usuaria.

Es especialmente valioso en una ETT porque el trabajador cedido tiene derecho, como mínimo, a la retribución
que fija para su puesto el convenio de la empresa usuaria (art. 11 de la Ley 14/1994). Una ETT no aplica un
convenio, sino los de todos sus clientes.

## 2. Principios

1. **Lo publicado no se edita.** Cada cambio en un convenio es una versión nueva. Una versión publicada no se
   modifica ni se borra; si tenía un error, se publica otra que la sustituye.
2. **Dos fechas en cada dato** (modelo bitemporal):
   - *desde cuándo aplica* (vigencia, fecha de efectos);
   - *desde cuándo lo sabemos* (fecha de publicación en el boletín y en TramitNOW).

   Así se puede responder tanto «¿cuánto valía la hora en marzo?» como «¿cuánto creíamos en abril que valía
   en marzo?», que es lo que se pagó y lo que hay que regularizar.
3. **Los documentos guardan lo que usaron.** Presupuestos, peticiones, contratos, nóminas y facturas copian
   los importes y la versión del convenio con la que se calcularon (ya lo dice «Histórico de precios» en
   `modelo-backend.md`). Una versión nueva nunca cambia un documento cerrado: genera regularizaciones, que
   son documentos nuevos enlazados al original.
4. **La ETT decide.** El catálogo propone y avisa; la ETT acepta cada versión (o la sigue automáticamente si
   lo ha configurado así), puede añadir sus mejoras y siempre puede corregir un valor para su caso.
5. **Siempre hay parte propia de cada ETT.** Convenios de empresa de un cliente, pactos de mejora y
   categorías propias de un cliente siguen siendo datos de la ETT, con las mismas herramientas.

## 3. Modelo de datos

### Capa global (sin `tenant_id`, como los municipios)

| Tabla | Qué guarda |
|---|---|
| `agreements` | El convenio: código REGCON (14 dígitos), nombre, ámbito (estatal, autonómico, provincial, empresa), territorio, sector (CNAE), vigencia general, estado, convenio al que sustituye. |
| `agreement_publications` | Cada publicación oficial: boletín, fecha, número, enlace y tipo (texto inicial, revisión salarial, tablas provisionales, corrección de errores, sentencia o anulación). Es la fuente de cada versión. |
| `agreement_versions` | Una versión de las condiciones económicas: fecha de efectos desde y hasta, publicación de origen, versión a la que sustituye, tipo de cambio, si es provisional, estado (`borrador`, `en_revision`, `publicada`, `retirada`), quién la extrajo, quién la revisó y quién la publicó, y fecha de publicación en TramitNOW. |
| `agreement_categories` | Grupos, niveles y categorías del convenio, con su vigencia (pueden aparecer o desaparecer con el tiempo). |
| `agreement_salary_items` | Los importes de cada versión, por categoría y concepto: salario base, pluses, pagas extra, precio de la hora extra, porcentajes de nocturnidad... con unidad (hora, día, mes, año) y si es salarial o extrasalarial. |
| `agreement_conditions` | Otras condiciones por versión que afectan al cálculo: jornada anual, vacaciones, número de pagas, antigüedad, complemento de IT. Campos tipados para lo que usemos en cálculos y texto para el resto. |

Lectura: cualquier usuario autenticado ve las versiones **publicadas**. Los borradores y las versiones en
revisión solo los ve el equipo de contenidos de TramitNOW, que es un rol de plataforma nuevo, distinto del
superadmin y sin acceso a los datos de las ETT.

### Capa de cada ETT

La tabla que ya existe, `collective_agreements` (con `tenant_id`), sigue siendo la que usan clientes, centros,
categorías y presupuestos, con un campo nuevo:

- `global_agreement_id` → `agreements`. Si está informado, es un convenio del catálogo global y sus datos
  vienen de allí. Si está vacío, es un convenio propio de la ETT (por ejemplo, el convenio de empresa de un
  cliente), con la misma estructura de versiones y tablas, pero de la ETT.

Así no cambian las claves ajenas que ya tenemos (clientes, centros y categorías apuntan a convenios de la ETT)
y conviven convenios globales y propios. Además:

| Tabla | Qué guarda |
|---|---|
| `tenant_agreement_settings` | Cómo sigue la ETT cada convenio global: aceptar versiones automáticamente o revisarlas una a una, y a quién avisar. |
| `tenant_agreement_versions` | Qué versión global ha aceptado la ETT y cuándo (o si la ha pospuesto), para saber con qué calcula hoy. |
| `tenant_salary_overrides` | Mejoras o correcciones de la ETT sobre un importe global, con vigencia propia y, opcionalmente, solo para un cliente o un centro. |
| `professional_categories.agreement_category_id` | Enlace de la categoría o puesto de la ETT con la categoría del convenio global, de donde sale su salario. |

### Lo que deben guardar los módulos que vienen

Para que la retroactividad funcione, cada módulo que calcule con convenio guarda, además de los importes, la
versión usada (`agreement_version_id`) y el periodo al que corresponde:

- presupuestos (`offers`, que ya prevé `agreement_price_year`) y peticiones;
- contratos y asignaciones;
- partes de horas, nóminas y facturas a la empresa usuaria.

## 4. Cómo entra una versión nueva

1. **Detección.** Se vigilan el BOE, los boletines autonómicos y provinciales y el REGCON para los convenios
   del catálogo. Cualquier ETT puede avisar de una publicación o pedir un convenio nuevo.
2. **Extracción.** Se extraen las tablas del PDF (con ayuda de IA) a una versión en `borrador`, enlazada a su
   publicación.
3. **Revisión a cuatro ojos.** Otra persona del equipo compara la versión con el boletín. Hasta que no la
   revisa nadie distinto de quien la extrajo, no se puede publicar.
4. **Publicación.** La versión pasa a `publicada` con su fecha. Desde ese momento la ven las ETT.
5. **Aviso e impacto** (sección 5). Las ETT reciben el aviso con lo que les afecta.

Compromiso de servicio a definir: plazo máximo entre la publicación en el boletín y la publicación en
TramitNOW.

## 5. Cambios retroactivos

Es habitual que las tablas de un año se publiquen meses después de su fecha de efectos, o que unas tablas
provisionales se sustituyan por las definitivas. El sistema lo trata siempre igual:

### 5.1 Análisis de impacto

Al publicarse una versión con efectos en el pasado, se calcula para cada ETT que usa el convenio:

- qué clientes, centros, contratos y trabajadores tuvieron actividad en el periodo afectado;
- la diferencia por trabajador, mes y concepto entre **lo que se pagó realmente** (los importes guardados en
  nóminas y partes) y lo que corresponde con la versión nueva;
- el coste empresa añadido (Seguridad Social) y lo que se puede repercutir a cada cliente según las
  condiciones de su presupuesto.

La comparación es siempre contra lo pagado, no contra la versión anterior. Así, si un mismo periodo se
revisa dos veces (tablas provisionales y después definitivas), no se cuentan las diferencias dos veces.

### 5.2 Decisión de la ETT

La ETT ve el impacto y decide, por convenio y si quiere por cliente:

- **aceptar** la versión, que pasa a usarse en lo nuevo y genera las regularizaciones del pasado;
- **aceptar con ajustes**, si tiene una mejora propia que absorbe parte de la subida;
- **posponerla**, con un aviso recurrente mientras no la resuelva.

### 5.3 Regularizaciones

Al aceptar, se preparan documentos nuevos enlazados a los originales, nunca cambios en los cerrados:

- **Atrasos a los trabajadores**, en una nómina de atrasos o en la siguiente nómina, también para
  trabajadores que ya no están en activo (con su finiquito complementario).
- **Seguridad Social**: liquidación complementaria de atrasos. El plazo de ingreso sin recargo llega hasta
  el último día del mes siguiente a la publicación del convenio **[verificar]**.
- **IRPF**: los atrasos de años anteriores se imputan al año en que se devengaron **[verificar]** el
  tratamiento en retenciones y certificados.
- **Facturación a la empresa usuaria**: factura de las diferencias (salario, coste de Seguridad Social y el
  margen pactado en el presupuesto), si las condiciones con el cliente permiten repercutir revisiones de
  convenio. Factura nueva o rectificativa según el criterio fiscal **[verificar]**.

El sistema avisa de los plazos de cada regularización y deja registro de quién la aprobó.

### 5.4 Casos especiales

- **Rebajas** (corrección de errores a la baja, anulación judicial): se calcula el impacto igual, pero nunca
  se proponen descuentos automáticos a los trabajadores. La ETT decide caso por caso.
- **Convenio sin tablas del año en curso** (ultraactividad, negociación en marcha): se sigue con la última
  versión publicada y se marca como «pendiente de revisión», para avisar de que puede llegar un cambio
  retroactivo y para que la ETT pueda pactarlo ya con el cliente.
- **Correcciones del propio catálogo** (un error nuestro): se publica una versión que sustituye a la errónea
  y se sigue el mismo flujo de impacto. Queda registrado como corrección de TramitNOW.

## 6. Calidad y responsabilidad

- Cada importe enlaza a su publicación oficial, y la ETT puede ver el boletín desde la propia pantalla.
- Historial público de cambios por convenio: qué cambió, cuándo y por qué.
- Botón para que una ETT avise de un posible error, con seguimiento.
- Condiciones del servicio: el catálogo es una ayuda; la ETT valida los datos que aplica y puede corregirlos.
  Hay que redactarlas con un abogado.
- Las ETT nunca ven los datos de otras ETT: el catálogo es común, el uso que hace cada una no.

## 7. Fases

| Fase | Qué incluye | Depende de |
|---|---|---|
| 0 | Cambiar el modelo ahora: tablas globales vacías, `global_agreement_id` en `collective_agreements` y rol de equipo de contenidos. | Nada; cuesta poco porque aún no hay datos reales. |
| 1 | Catálogo con los convenios más usados: estatal de ETT y los 20-30 de los sectores principales de los clientes. Pantallas internas de extracción y revisión. | Fase 0. |
| 2 | Tablas salariales en presupuestos y peticiones («precios de convenio para el año»), guardando la versión usada. | Módulo de ofertas. |
| 3 | Avisos de versiones nuevas y análisis de impacto. | Contratos y partes de horas. |
| 4 | Regularizaciones: atrasos, Seguridad Social y facturación de diferencias. | Nóminas y facturación. |

## 8. Decisiones abiertas

- **Hacerlo o licenciarlo.** Extraer los datos nosotros o licenciarlos a una editorial jurídica y añadir
  nuestra capa de versiones e impacto. Se puede empezar haciéndolo nosotros con pocos convenios y decidir
  con datos de coste reales.
- **Cobertura inicial.** Qué convenios entran en la fase 1, según los sectores de las primeras ETT.
- **Modelo comercial.** Si va incluido en el producto o es un extra.
- **Por defecto**, aceptar versiones automáticamente o revisarlas una a una.
- **Equipo de contenidos.** Quién extrae y quién revisa, y con qué plazo.
- Los puntos legales marcados con **[verificar]**.
