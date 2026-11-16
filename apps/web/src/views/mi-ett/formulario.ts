// Los cajones de Mi ETT usan campos no controlados con id (`edit-legalName`, `branch-code`...). Esto lee los
// que estén en pantalla; los que no existen no se devuelven (así no se borra lo que el cajón no muestra).
export function leerCampos(prefijo: string, claves: string[]): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const clave of claves) {
    const campo = document.getElementById(`${prefijo}${clave}`) as HTMLInputElement | HTMLSelectElement | null;
    if (campo) valores[clave] = campo.type === 'checkbox' ? String((campo as HTMLInputElement).checked) : campo.value;
  }
  return valores;
}
