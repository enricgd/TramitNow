# Apps

Pendiente de crear.

- `web/`: SPA con Vite + React + TypeScript + Tailwind + TanStack Router/Query.
  Las pantallas acceden a los datos solo a través de repositorios (`src/data/`), con dos
  implementaciones: en memoria (demo, con datos de ejemplo opcionales) y Supabase/API (real).
- `api/`: Node (Hono) para la lógica de negocio: generación de documentos, integraciones
  (Contrat@, SILTRA, Sistema RED), procesos programados.
