"""Convierte un HTML de design/ en un componente de vista para apps/web, tal cual.

Solo para pantallas nuevas: si la vista ya existe, se sobrescribe y se pierden sus cambios.

Toma el script de React del diseño, quita el arranque (createRoot) y la barra lateral
propia (la estructura común la pone App.tsx) y exporta App como <Nombre>View.

Uso (desde apps/web):
    python3 scripts/import-design.py laboral LaboralView --strip-header
    python3 scripts/import-design.py peticiones PeticionesView
"""
import argparse
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[3]

p = argparse.ArgumentParser()
p.add_argument("design", help="nombre del fichero en design/ sin .html")
p.add_argument("component", help="nombre del componente exportado")
p.add_argument("--strip-header", action="store_true",
               help="quita también la primera <header> del layout (cuando duplica la cabecera común)")
args = p.parse_args()

html = (ROOT / "design" / f"{args.design}.html").read_text(encoding="utf-8")
m = re.search(r'<script type="text/babel"[^>]*>(.*)</script>', html, re.S)
if not m:
    sys.exit("No se encuentra el script de React en el diseño")
lines = m.group(1).splitlines()


def drop_block(lines, start_pat, end_pat, after=0, required=True):
    """Elimina desde la primera línea que casa con start_pat (a partir de 'after') hasta end_pat."""
    for i in range(after, len(lines)):
        if re.search(start_pat, lines[i]):
            for j in range(i, len(lines)):
                if re.search(end_pat, lines[j]):
                    return lines[:i] + lines[j + 1:], i
    if required:
        sys.exit(f"No se encuentra el bloque {start_pat}")
    return lines, None


app_start = next(i for i, l in enumerate(lines) if re.match(r"\s*function App\(", l))
# Algunos diseños (presupuestos.html) no llevan barra lateral propia.
lines, _ = drop_block(lines, r"<aside\b", r"</aside>", app_start, required=False)
if args.strip_header:
    lines, _ = drop_block(lines, r"<header\b", r"</header>", app_start)

src = "\n".join(lines)
src = re.sub(r"^\s*import \{ createRoot \} from 'react-dom/client';\n", "", src, flags=re.M)
src = re.sub(r"^\s*(const root = )?createRoot\(.*\n(\s*root\.render\(.*\n)?", "", src, flags=re.M)
src = re.sub(r"^(\s*)function App\(", rf"\1export default function {args.component}(", src, count=1, flags=re.M)

# El diseño ocupa toda la ventana; aquí vive dentro del área de contenido.
first_root = re.search(r'return \(\s*<div className="([^"]*)"', src[src.index(f"function {args.component}("):])
if first_root:
    cls = first_root.group(1)
    new_cls = cls.replace("min-h-screen", "min-h-full").replace("h-screen", "h-full")
    src = src.replace(f'<div className="{cls}"', f'<div className="{new_cls}"', 1)

# Quitar la indentación de 8 espacios del <script> original.
src = "\n".join(l[8:] if l.startswith("        ") else l for l in src.splitlines()).strip() + "\n"

header = (f"// Partió de design/{args.design}.html (scripts/import-design.py). "
          f"Ahora se edita aquí directamente: no regenerar.\n")
out = pathlib.Path(__file__).resolve().parents[1] / "src" / "views" / f"{args.component}.jsx"
out.write_text(header + src, encoding="utf-8")
print(out.relative_to(ROOT), len(src.splitlines()), "líneas")
