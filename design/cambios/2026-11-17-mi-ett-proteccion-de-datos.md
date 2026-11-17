# Mi ETT: pestaña «Protección de datos» (hecha en desarrollo, para revisar)

- **Fecha**: 2026-11-17
- **Estado**: pendiente <!-- la hizo desarrollo sin maqueta: el diseñador la revisa y la ajusta -->
- **Rama y commits**: `claude/fase1-frontend-16f087` (desarrollo, no `design`)
- **Cómo verlo**: `npm --prefix apps/web run dev` → http://localhost:5173/#/mi-ett, pestaña «Protección de datos».

## Resumen

Para registrar el consentimiento de la bolsa de candidatos, la ETT tiene que haber publicado antes su texto de
privacidad, y no había dónde hacerlo. Desarrollo ha añadido una pestaña en Mi ETT con lo mínimo y con los componentes
que ya había en esa pantalla, sin diseño nuevo. **Pedimos al diseñador que la revise y la ajuste** (textos,
disposición, o moverla a otro sitio si lo ve mejor).

## Dónde está la versión buena

| Fichero de `apps/web` | Maqueta de `design/` desactualizada | Partes afectadas |
|---|---|---|
| `src/views/FichaEttView.jsx` | `design/fichaett.html` | Pestaña nueva «Protección de datos» (entre «Portales» y «Actividad») y dos ventanas |

## Cambios

### Pestaña «Protección de datos»

- **Antes**: no existía.
- **Ahora**: dos tarjetas (`Card` + `SectionTitle`, como el resto de Mi ETT).
  1. **Texto de privacidad de la bolsa de candidatos**: una explicación corta y la lista de versiones publicadas, de la
     más nueva a la más antigua. Cada una es un `<details>` con «Versión X», la etiqueta «Vigente» (verde) en la más
     nueva o «Anterior» en las demás, y «Publicada el dd/mm/aaaa, hh:mm por Nombre» a la derecha; al abrirla se ve el
     texto. Arriba a la derecha, el botón «Publicar versión nueva».
  2. **Plazos**: tres campos numéricos con su ayuda debajo y «Guardar»: duración del consentimiento de bolsa (meses,
     1–120), aviso de documentos que caducan (días, 1–365) y conservación de la auditoría de accesos (meses, 12–120).
- **Comportamiento**:
  - Sin ninguna versión publicada, la lista es un aviso naranja: sin texto no se puede registrar el consentimiento de
    nadie. La pestaña lleva entonces el punto de alerta.
  - Solo quien tiene el permiso de protección de datos (`privacy.manage`) ve «Publicar versión nueva» y puede cambiar
    los plazos; los demás los ven desactivados.
- **Por qué**: la API exige el texto vigente para registrar el consentimiento y no lo trae de serie (lo redacta la
  asesoría de cada ETT).

### Ventana «Publicar versión nueva del texto de privacidad»

- **Ahora**: `Modal` con «Nombre de la versión» (sugerencia: la fecha, 2026-11) y un área de texto de 10 filas que
  arranca con el texto vigente para retocarlo. Botones «Cancelar» y «Revisar y publicar».
- **Comportamiento**: «Revisar y publicar» abre una segunda ventana, «¿Publicar la versión X?», que explica que pasa a
  ser la vigente y avisa (`Notice` naranja) de que **no se puede editar ni borrar**. «Volver» regresa al formulario;
  «Publicar» la publica. Si el nombre ya existe, sale el aviso de error «Ya hay una versión con ese nombre».

## Componentes y estilo

- **Nuevos o modificados**: ninguno; `Card`, `SectionTitle`, `Notice`, `Badge`, `Modal`, `TextInput` y `Button` de
  la propia pantalla.
- **Colores, tamaños o iconos nuevos**: ninguno.

## Datos

| Entidad | Campo | Cambio | Tipo y valores | Notas |
|---|---|---|---|---|
| Texto de privacidad | versión, texto, fecha, quién lo publicó | nuevo en pantalla | texto libre | Lo publicado no cambia |
| Ajustes de la ETT | meses del consentimiento, días de aviso, meses de auditoría | nuevo en pantalla | enteros | 24, 30 y 24 por defecto |

## Dudas y pendientes

- ¿Mi ETT es el sitio, o debería ir en Configuración o en una pantalla propia de protección de datos?
- Solo hay un texto, el de la bolsa de candidatos. Si llegan otros (portal del candidato, trabajadores), la tarjeta
  tendrá que elegir de cuál se trata.
- Ahora el área de texto es plana; quizá convenga una vista previa o comparar con la versión anterior.
- En la demo hay una versión de ejemplo con un texto inventado y marcado «TEXTO DE EJEMPLO, NO VÁLIDO».
