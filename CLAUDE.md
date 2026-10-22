# TramitNOW: notas para Claude

ERP web multi-ETT. Ver README.md para estructura y flujo.

- **Si estás en la rama `design` (trabajo del diseñador), lee y sigue `design/AGENTE-DISENO.md` antes de empezar.**
- `design/*.html` son las maquetas de Enric: no se editan desde `apps/web`. Cuando se pida "pasar un diseño a la demo",
  implementarlo en `apps/web` extrayendo layout y componentes comunes; no copiar el HTML tal cual.
  Los cambios hechos directamente en `apps/web` se describen en `design/cambios/` (ver `design/AGENTE-DISENO.md`).
- La especificación canónica está en `docs/*.md` (no en los .docx de `docs/originales/`).
- Toda tabla de negocio lleva `tenant_id` y RLS. Ver `db/README.md` antes de tocar el esquema.
- La web accede a los datos solo a través de `apps/api` (ver "Acceso a datos" en README.md). En la web,
  el cliente de Supabase se usa únicamente para Auth (login, sesión) y Storage; nunca `supabase.from(...)`.
  Las pantallas usan repositorios, no llamadas directas a la API.
- Nunca datos personales reales en código, fixtures, diseños ni commits. `docs/legacy-fotos/` está fuera de git por eso.
- `archive/` es solo referencia; no se modifica.
- Textos de la interfaz y documentación en español.
