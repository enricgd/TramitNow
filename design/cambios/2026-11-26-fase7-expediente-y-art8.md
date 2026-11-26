# Contratos y altas, Peticiones y Empresas: expediente con registros y bloqueos legales (hecho en desarrollo, para revisar)

- **Fecha**: 2026-11-26
- **Estado**: pendiente <!-- la hizo desarrollo sin maqueta: el diseñador la revisa y la ajusta -->
- **Rama y commits**: `claude/fase1-frontend-16f087` (desarrollo, no `design`)
- **Cómo verlo**: `npm --prefix apps/web run dev` → #/laboral (abrir un expediente), #/peticiones/PET-2026-0047
  (pestaña «Contratos y altas») y #/empresas (Editar ficha → Más datos).

## Resumen

La fase 7 (parte 1) conecta Contratos y altas con la API y añade los controles legales del art. 8 de la Ley 14/1994.
Desarrollo lo ha resuelto con los componentes que ya había, sin diseño nuevo. **Pedimos al diseñador que lo revise y
lo ajuste.**

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/LaboralView.jsx` | `design/laboral.html` | Panel del expediente, ventanas de registro, indicadores y filtros |
| `src/views/PeticionesView.jsx` | `design/peticiones.html` | Tarjeta del CPD previo (declaraciones, peligroso, CPD firmado) y dos ventanas |
| `src/views/EmpresasView.jsx` | `design/empresas.html` | Casilla «Esta empresa es una ETT» y aviso en la ficha |

## Cambios

### Contratos y altas

- **Qué bloquea y qué avisa**: cada paso dice «Bloquea el inicio» (CPD, contrato, PRL y salud, alta) o «Solo avisa»
  (documentación; el EPI, Contrat@ y la copia básica avisan dentro de su paso). Arriba del panel, una caja verde
  «Listo para empezar» o roja «No puede empezar hasta que se resuelva:» con la lista, y una ámbar con los avisos.
- **Panel del expediente**: en cada paso, los avisos de la API (icono según gravedad) y lo registrado, con sus
  botones:
  - Documentación: DNI/NIE, NSS, IBAN y documentos de la persona; enlace a su ficha para validarlos.
  - CPD: firmado (fecha y documento) y las declaraciones del art. 8; «Registrar CPD firmado» (es de la petición).
  - Contrato: cada contrato (clave, modalidad, fechas, firmado, Contrat@ y copia básica con su plazo); «Registrar
    contrato», «Editar», «Anular».
  - PRL: formación (fecha, horas, certificado), vigilancia de la salud (apto / no apto / renuncia y fecha, nunca el
    diagnóstico) y entrega de EPI.
  - Alta: fecha de efectos y justificante.
- **Ventanas de registro** (Modal): una por cosa, con aviso «Sin esto, X no puede empezar» cuando bloquea y los
  justificantes como campo de archivo.
- **Indicadores**: «Falta algo legal», «Empiezan en 7 días sin estar listos», «Bloqueados» (art. 8 o no apto) y
  «CPD sin firmar».
- **Filtro de estado**: todos los abiertos, falta algo legal, listos, bloqueados y completos.
- Quitado: acciones de grupo, actividad del detalle de la petición y filtro por responsable.
- En la tabla, bajo los pasos, «Listo para empezar» o «No puede empezar: N pendientes». En móvil, tarjetas.

### Peticiones (pestaña «Contratos y altas», tarjeta del CPD previo)

- **Declaraciones del cliente (art. 8)**: «No hay huelga en el centro» y «No ha amortizado estos puestos», con quién
  lo declara, cuándo, cómo y quién lo registró; botón «Registrar»/«Cambiar» que abre una ventana (qué declara,
  contacto, fecha, canal y nota).
- **Trabajo especialmente peligroso**: con o sin excepción y su base; «Registrar excepción» abre una ventana.
- **Cliente ETT** y **CPD firmado por la empresa**: una línea cada uno.
- Las comprobaciones que bloquean llevan debajo su explicación en lenguaje claro, y el título dice «No se puede
  generar: el art. 8 de la Ley 14/1994 no permite la cesión» cuando es eso.
- «Datos del servicio»: debajo de los riesgos, que vale la evaluación de riesgos del cliente subida en Documentos.

### Empresas

- En «Más datos» del formulario, casilla «Esta empresa es una ETT» con la explicación. En la ficha, aviso rojo
  «Marcada como ETT».

## Componentes y estilo

- **Nuevos o modificados**: ninguno de `src/ui/`; dentro de `LaboralView.jsx`, `ListoParaEmpezar`, `Avisos` y
  `CampoArchivo` (pequeños).
- **Colores, tamaños o iconos nuevos**: ninguno.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Expediente | pasos, avisos, listo, próxima tarea | nuevo | de la API | La web no calcula nada |
| Contrato | clave, modalidad, fechas, firma, Contrat@, copia básica | nuevo | — | Varios por expediente |
| Petición | declaraciones art. 8, excepción de peligroso, CPD firmado | nuevo | — | — |
| Empresa | es una ETT | nuevo | sí / no | Bloquea siempre |

## Dudas y pendientes

- ¿Las declaraciones y la excepción deberían estar en una pestaña propia de la petición («Legal»)?
- El panel del expediente es largo en móvil: quizá pasos plegables.
- La firma del CPD por el cliente en la app (parte 3) cambiará el paso «CPD».
