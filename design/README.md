# Diseño

Cada archivo es una pantalla (o módulo) autocontenida: React 18 + Tailwind 4 + lucide-react,
cargados desde CDN. Se abren directamente en el navegador.

| Archivo | Módulo |
|---|---|
| `fichaett.html` | Mi ETT (organización propia) |
| `empresas.html` | Empresas y clientes |
| `presupuestos.html` | Editor de presupuestos y cotización |
| `peticiones.html` | Gestión de peticiones operativas |
| `laboral.html` | Petición: pestaña Laboral |
| `candidatos.html` | Gestión de candidatos |

## Convenciones

- Nombres de archivo en minúsculas, sin acentos ni espacios (`nueva-pantalla.html`).
- Para cambiar una pantalla existente, sobrescribir el mismo archivo: el historial queda en git.
- Los datos que aparecen en los diseños son de ejemplo. Nunca usar datos reales de personas.
- Desarrollo no edita esta carpeta: es la referencia visual de lo que hay que implementar en `apps/web`.
