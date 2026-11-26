# Plan de desarrollo a partir del diseño (13/11/2026)

> Propuesta para revisar con el equipo. Parte del estado de la rama `design` en `0ffd610` (57 notas de cambios,
> todas «pendiente») y de lo que ya hay en `development`.

## 1. Dónde estamos

### Lo que ya funciona de verdad (base de datos + API, desplegado en el NAS)

- Multi-ETT con RLS: ETT, sociedades, sucursales, usuarios, roles y permisos, `/v1/me`.
- Catálogos oficiales comunes: comunidades, provincias, municipios del INE, países, claves de contrato.
- Catálogos laborales por ETT: convenios, categorías, tipos de contrato, conceptos de nómina.
- Direcciones y **empresas cliente**: clientes, centros, contactos y facturación.
- La web tiene su capa de datos (`src/data`) lista, pero **ninguna pantalla la usa todavía**.

### Lo que ha diseñado el diseñador (todo con datos de ejemplo)

El recorrido completo del ERP, de la entrada del cliente al cobro:

```
Empresas → Presupuestos → Peticiones → Candidatos / Selección → Contratos y altas
        → Personal en misión → Horas e incidencias → Facturación
```

Además:

- **Inicio** (tareas, agenda, indicadores), **cabecera** (buscador global y avisos) y **Mi ETT**.
- **Portal del trabajador** (`/trabajadores`): solo personas contratadas; entra con DNI y código por SMS o correo.
  Horas, avisos de ausencia, PRL, modelo 145, documentos, «Tu primer día».
- **Área de empresas** (`/empresas`): contactos del cliente invitados por la ETT, con permisos. En la fase 1:
  personal en misión e incidencias, validar horas, presupuestos y facturas, firmar CPD y documentos.
  «Pedir personal», prórrogas y «terminar antes» están hechos pero ocultos.
- **Web corporativa** de TramitNOW en cuatro versiones para elegir (`web.html` a `web4.html`), en castellano y
  catalán.

### Estado de la rama `design`

- Sin conflictos con `development`. Todavía no ha abierto la PR del bloque.
- Ha tocado `apps/web/vite.config.ts` (fuera de su zona) para compilar siete páginas: ERP, dos portales y cuatro
  webs. El cambio es razonable, pero hace que la compilación del NAS publique también los portales y las webs
  con datos de ejemplo (ver fase 0).
- Los datos de ejemplo están mucho mejor: ya no hay DNI con formato válido ni fotos externas. Quedan 4 emails de
  gmail, outlook y live.

## 2. Cómo proponemos trabajar

- **Por módulos completos y en el orden del recorrido.** Cada módulo usa los datos del anterior (no hay presupuesto
  sin empresa, ni petición sin presupuesto, ni factura sin horas). Así, cada fase deja una parte de la aplicación
  funcionando de verdad, de principio a fin.
- **Cada módulo, de abajo arriba:** tablas con RLS y tests → rutas en la API con tests → repositorio en la web →
  la pantalla del diseñador conectada → sus notas marcadas como incorporadas.
- **La pantalla manda.** Lo que el diseñador ha resuelto en pantalla es la especificación; las notas dicen qué datos
  hacen falta. `docs/modelo-backend.md` se actualiza con lo que cambie.
- **El modo demo se mantiene.** Cada repositorio tiene su versión en memoria, para que el diseñador y
  `ejemplo.henrik11.duckdns.org` sigan funcionando con datos de ejemplo.
- **Lo que no depende del flujo va en paralelo:** la web corporativa y las decisiones de producto.

## 3. Fases

| Fase | Qué | Tamaño | Depende de |
|---|---|---|---|
| 0 | Juntar el diseño y ordenar | S | PR del diseñador |
| 1 | Cimientos comunes | M | 0 |
| 2 | Empresas de verdad | M | 1, decisiones de clientes |
| 3 | Convenios y tablas salariales | M-L | decisión «hacer o licenciar» |
| 4 | Presupuestos | L | 2, 3 |
| 5 | Peticiones | M | 4 |
| 6 | Candidatos y selección | L | 1, decisión de datos personales |
| 7 | Contratos y altas | XL (por partes) | 5, 6, tipo de firma en la app (pregunta 1) |
| 8 | Personal en misión | M | 7 |
| 9 | Horas e incidencias | M | 8 |
| 10 | Facturación | L | 9, VeriFactu |
| 11 | Portales | L | 9 (y 10 para facturas) |
| 12 | Inicio, avisos y buscador | M | módulos que alimentan |
| — | Web corporativa | S-M | elegir versión |
| — | Alta de ETT y usuarios, correo, CI | M | antes de la primera ETT real |

Tamaños orientativos: S, unos días; M, una o dos semanas; L, más de dos semanas; XL, más de un mes.

### Fase 0. Juntar el diseño y ordenar

- El diseñador cambia los 4 emails reales y abre la PR de `design` a `development`. La juntamos.
- Subir `development` a GitHub (hoy lleva sin subir la web de ejemplo, `a9b228a`).
- La compilación del NAS (`npm run build`) solo debe llevar el ERP; los portales y la web corporativa se
  compilan aparte cuando tengan backend o despliegue propio. La de ejemplo puede llevarlo todo.
- El agente de diseño de Enric pasa las 57 notas a «incorporado» y actualiza las maquetas de `design/`.
- Volver a publicar `ejemplo.` con el resultado.

### Fase 1. Cimientos comunes

Lo usan casi todas las pantallas; conviene hacerlo una vez y bien:

- **Cabecera y Mi ETT con datos reales** (la «fase 2» pendiente): `/v1/me`, ETT activa, sociedades, sucursales y
  usuarios. La API ya existe.
- **Sucursal en cada entidad de trabajo y filtro por sucursal** según el rol (presupuestos, peticiones, horas,
  facturas...). Las notas lo piden en todas las listas.
- **Documentos**: una sola tabla de documentos con su entidad (empresa, presupuesto, petición, candidato,
  expediente...), tipo, estado de validación, caducidad, visible en portal; ficheros en Supabase Storage con
  enlaces firmados por la API.
- **Historial de actividad** («dejar rastro de quién y cuándo»), común a todas las fichas.
- **Tablas maestras**: pantalla y API sobre `catalog_items` para sectores, formas de pago, motivos de rechazo, de
  baja y de fin, tipos de documento, incidencias...
- **Numeración por series** sin huecos (presupuestos, peticiones, facturas) y **búsqueda en servidor con
  paginación** para los selectores grandes (400 clientes, 400 presupuestos).

### Fase 2. Empresas de verdad

- Cerrar las 7 decisiones pendientes del equipo sobre el modelo de clientes (roles de contacto, suspender,
  borrado, sector, convenio por defecto, documentos, días de pago).
- Añadir lo nuevo: alta rápida en estado borrador desde un presupuesto, factura por concepto o por persona,
  acceso al portal de cada contacto (se guarda ya, se usa en la fase 11).
- Conectar `EmpresasView` a la API. **Es la primera pantalla real de punta a punta** y sirve de patrón para las
  demás.

### Fase 3. Convenios y tablas salariales

- Fases 0 y 1 de `docs/convenios-globales.md`: catálogo global versionado y los primeros convenios.
- Lo pide Presupuestos: los parámetros retributivos de cada puesto se rellenan solos con convenio, categoría y
  nivel, y se guarda qué se cambió a mano.

### Fase 4. Presupuestos

Versiones con copia completa, puestos con personas y horas, conceptos y costes en % o €/h (solo uno), extras,
margen en % o €/h, aprobación por debajo del margen mínimo, rechazo con motivo, pasar a obsoleto y crear otro,
documentos, PDF de la propuesta en el servidor. Guarda la versión del convenio usada.

### Fase 5. Peticiones

Una petición = un puesto de un presupuesto aceptado: plazas, horario, estados, responsable, sucursal, documentos
del servicio, CPD previo. La publicación en portales de empleo queda para más adelante.

Pendiente por las decisiones del 19/11/2026: los riesgos del puesto pueden venir como documento del cliente (su
evaluación de riesgos) adjunto a la petición, en lugar del texto. El CPD previo se genera con uno u otro.

### Fase 6. Candidatos y selección

Ficha, perfiles, carnés, habilidades e idiomas como tablas maestras con sinónimos, documentos con caducidad y
avisos, candidaturas por petición con etapas, consentimiento y supresión RGPD. Es el primer módulo con muchos datos
personales: cifrado de columnas y auditoría de accesos según «Decisiones tomadas (17/11/2026)».

### Fase 7. Contratos y altas

Expediente por persona y plaza con sus pasos (documentación, CPD, contrato, PRL, EPI, alta) y dependencias. Lo que
se hace fuera (Sistema RED, Contrat@, copia básica) se registra a mano, con aviso de plazos; las integraciones,
después. El CPD lleva el representante y el DNI del firmante de la ETT (Mi ETT). Alcance según «Decisiones tomadas
(19/11/2026)», que lo amplía bastante; se hace por partes:

1. **Expediente y bloqueos legales**: art. 8 de la Ley 14/1994 (huelga, trabajos peligrosos, puestos amortizados,
   cliente ETT), formación PRL y vigilancia de la salud, y alta en la Seguridad Social con su justificante. Los
   demás pasos avisan.
2. **Contratos de circunstancias de la producción y sustitución**, con plantilla común y cláusulas de cada ETT, y
   **contratos por día**: se generan en bloque a partir de los días de la misión, cada uno con su alta, su baja y su
   comunicación.
3. **Firma del CPD por el cliente en la app**: los contactos del cliente entran (por invitación) y solo ven y firman
   sus CPD. Es la primera pieza del área de empresas de la fase 11. Tipo de firma: pendiente de la revisión de la
   pregunta 1 (ver decisiones).
4. **Formativo** y, al final, **fijo-discontinuo de ETT** (art. 10.3 de la Ley 14/1994: llamamientos y periodos
   sin actividad).

### Fase 8. Personal en misión

Misión desde el primer día, prórrogas con sus adendas, incidencias (misma tabla que Horas), cierre con motivo, baja
en la Seguridad Social y finiquito. La indemnización de fin de contrato se paga prorrateada en el salario hora (art. 11
de la Ley 14/1994), así que el finiquito no la incluye. Avisos de fin de misión a 15 y 7 días y de la baja en la
Seguridad Social (3 días naturales **[verificar]**).

### Fase 9. Horas e incidencias

Parte semanal por petición, validación del cliente (quién, cómo, cuándo, prueba) o de la ETT en su nombre, reparos,
calendario de festivos por centro, cierre de mes hacia facturación y nómina.

### Fase 10. Facturación

Una factura por cliente y mes, líneas guardadas siempre por persona + puesto + concepto (la factura por concepto es
solo cómo se imprime), servicios (selección, formación...), series, emisión en bloque en una transacción,
rectificativas, cobros, PDF en el servidor guardado al emitir, Excel, envío por correo con cola.
**VeriFactu** y factura electrónica: confirmar requisitos y plazos antes de empezar esta fase.

### Fase 11. Portales

- Dos accesos aparte en Auth: trabajadores con código por SMS o correo asociado al DNI; empresas con correo y
  contraseña por invitación.
- Un modelo de permisos nuevo: la sesión del portal solo ve lo suyo (el trabajador, sus datos; el contacto, su
  cliente según sus permisos). Todo por `apps/api`.
- Área de empresas, fase 1: validar horas, personal en misión e incidencias, presupuestos y facturas. El acceso de
  los contactos y la firma del CPD llegan antes, en la fase 7.
- Portal del trabajador: horas, avisos de ausencia, PRL, modelo 145, documentos, primer día.
- Subdominio por ETT (`{ett}.tramitnow.com`) y su configuración en Mi ETT.

### Fase 12. Inicio, avisos y buscador

Tareas generadas por reglas (documento caducado, alta pendiente, presupuesto sin respuesta...), avisos por usuario,
indicadores y buscador global de la cabecera. Va al final porque se alimenta de todos los módulos.

### En paralelo: web corporativa

Elegir versión y borrar las otras, datos de contacto y textos legales reales, letras servidas desde nuestro dominio,
formulario de demo con consentimiento, HTML estático para buscadores y despliegue propio en `tramitnow.com`.

### Antes de la primera ETT real

Alta de ETT y de usuarios por el superadmin con invitaciones, correo saliente (SMTP), CI en GitHub con protección de
ramas, copias de seguridad fuera del NAS y un entorno que no sea el NAS de casa.

## 4. Decisiones que bloquean

| Decisión | Bloquea | Quién |
|---|---|---|
| ~~Las 7 del modelo de clientes~~ (decidido) | Fase 2 | Equipo |
| ~~Convenios: hacerlo nosotros o licenciar~~ (nosotros); convenios siguientes según los clientes de las primeras ETT | Fase 3 | Equipo / negocio |
| ~~Pagar por debajo de convenio~~ (se bloquea) | Fase 4 | Producto |
| ~~Margen mínimo y días sin respuesta~~ (configurable por ETT) | Fase 4 | Producto |
| ~~Cifrado de datos personales y auditoría de accesos~~ (decidido) | Fase 6 | Enric |
| Firma dentro de la app (simple) desde la fase 7, en vez de firmar fuera y subir (revisar la pregunta 1) | Fase 7, partes 2 y 3 | Enric |
| Proveedor y tipo de firma avanzada (preguntas 2 y 3, aplazadas) | Más adelante | Enric |
| Qué pasos del expediente bloquean, aparte de los legales (pregunta 21, aplazada) | No bloquea: por defecto, avisan | Torre |
| ~~Quién prepara los riesgos de cada puesto (PRL)~~ (documento del cliente) | Fases 5 y 7 | Producto / laboral |
| ~~Plazos laborales de ejemplo~~ (decidido, con puntos a verificar) | Fases 7 y 8 | Laboral |
| Series de facturación por sucursal, retenciones, IVA de servicios | Fase 10 | Administración |
| VeriFactu y factura electrónica | Fase 10 | Asesoría |
| Proveedor de SMS para el portal del trabajador | Fase 11 | Enric |
| Versión de la web corporativa | Web | Equipo |

### Decisiones tomadas (16/11/2026)

- **Modelo de clientes (fase 2)**: aceptadas las 7 propuestas. Eliminar es una baja lógica recuperable desde un
  filtro «Eliminados»; lo usado solo se suspende o desactiva. Hecho y desplegado.
- **Convenios (fase 3)**: los cargamos nosotros (con IA o a mano), como ventaja frente a la competencia. Primeros:
  el convenio estatal de ETT y dos convenios estatales muy habituales en la puesta a disposición.
- **Presupuestos (fase 4)**:
  - Un salario por debajo del convenio de la empresa usuaria **se bloquea siempre** (art. 11 de la Ley 14/1994);
    no hay aprobación que lo permita.
  - Un margen por debajo del mínimo pide la aprobación de un responsable.
  - El coste para el cliente se desglosa: salario de convenio, Seguridad Social de la empresa, parte proporcional
    de vacaciones y de la indemnización de fin de contrato (12 días por año) y margen.
  - Margen mínimo y días sin respuesta, configurables por ETT en Mi ETT. Por defecto, sin margen mínimo y aviso a
    los 15 días.

### Decisiones tomadas (17/11/2026)

- **Datos personales (fase 6)**:
  - **Cifrado campo a campo solo de lo sensible**: DNI/NIE, número de la Seguridad Social, IBAN y datos de salud y
    discapacidad. Nombre, teléfono, email y localidad quedan en claro para buscar y filtrar. El DNI/NIE lleva además
    una huella (HMAC) para buscar sin descifrar.
  - **Cifra y descifra la API** (AES-256-GCM), con la clave fuera de la base de datos y versionada para poder
    rotarla. Una copia o un acceso directo a la base solo ve datos cifrados.
  - **Auditoría de accesos**: quién y cuándo abre la ficha de una persona, ve un dato sensible (en pantalla va
    tapado, con «ver»), descarga un documento o exporta un listado. Registro que no se modifica, visible para el
    administrador y el responsable de protección de datos. Los listados no se registran. Conservación: 2 años
    **[verificar]**.
  - **Documentos**: Storage privado con enlaces que caducan, sin cifrar fichero a fichero de momento.
  - **Copias**: cifrar la copia diaria del NAS y guardar otra fuera del NAS antes de la primera ETT real.

### Decisiones tomadas (19/11/2026)

Preguntas de la fase 7, contestadas en `ejemplo.henrik11.duckdns.org/preguntasTorre` (Enric el 18/11, Torre el
19/11). El número es el de la pregunta en esa página. Lo marcado **[verificar]** lo confirma la asesoría.

- **Firma**:
  - 1: sin proveedor por ahora; el expediente queda preparado para conectarlo. **A revisar**: con contratos por día
    (13) y el cliente firmando en la app (23), firmar fuera y subir cada documento no es viable. Propuesta: firma
    simple en la app (quién, cuándo y desde dónde) para el trabajador y el cliente desde la fase 7 **[verificar]**.
  - 2 y 3: proveedor y tipo de firma avanzada, aplazados.
  - 4: un firmante por ETT, con el modelo preparado para uno por sucursal.
- **Prevención de riesgos**:
  - 5: el cliente envía su evaluación de riesgos en un documento y la ETT la adjunta (cambia la fase 5: hoy el CPD
    previo exige el texto) **[verificar]** que el anexo cumple el RD 216/1999.
  - 6: sin formación PRL y vigilancia de la salud registradas, la misión no empieza.
  - 7: la entrega de EPI es un paso del expediente que no bloquea.
- **Art. 8 de la Ley 14/1994**:
  - 8: el cliente declara en el CPD que no hay huelga; si la hay en el centro, se bloquea.
  - 9: trabajos especialmente peligrosos, bloqueados salvo excepción marcada por la ETT con su base.
  - 10: puestos amortizados en los 12 meses anteriores, por declaración del cliente (quién y cuándo).
  - 11: si el cliente está marcado como ETT, se bloquea.
- **Contratos**:
  - 12: todas las modalidades, también formativo y fijo-discontinuo de ETT **[verificar]**.
  - 13: en misiones de días sueltos, un contrato por cada día, con aviso del recargo de los contratos cortos
    **[verificar]**.
  - 14: modelo común con los datos de Contrat@ más cláusulas propias de cada ETT.
  - 15: Contrat@ y copia básica, registro a mano con aviso del plazo **[verificar]**.
- **Seguridad Social**:
  - 16: sin el alta registrada (con justificante), la misión no empieza.
  - 17: Sistema RED, más adelante; primero registro a mano.
- **Plazos** **[verificar]**:
  - 18: máximos legales configurables por ETT, con avisos a 15 y 7 días del fin.
  - 19: aviso automático de la baja en la Seguridad Social (3 días naturales).
  - 20: indemnización de fin de contrato prorrateada en el salario hora, como ya calculan los presupuestos; la fase 8
    no la incluye en el finiquito.
- **Expediente**:
  - 21: qué pasos bloquean, aparte de los legales, aplazado. Mientras, solo avisan.
  - 22: un permiso por tipo de paso.
  - 23: el cliente firma el CPD en la app ya en la fase 7.

## 5. Siguiente paso propuesto

Fase 0 en cuanto el diseñador abra la PR, y fase 1 (cimientos y cabecera/Mi ETT reales) mientras el equipo cierra
las decisiones de clientes. Con eso, la fase 2 deja Empresas funcionando de verdad y sirve de patrón para el resto.
