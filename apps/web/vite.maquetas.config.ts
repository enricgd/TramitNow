import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Sirve las maquetas de design/ con recarga automática (npm run maquetas → http://localhost:5174).
// Son HTML autocontenidos con React y Tailwind desde CDN: Vite solo los sirve y recarga al guardar.
export default defineConfig({
  root: fileURLToPath(new URL('../../design', import.meta.url)),
  server: { port: 5174, strictPort: true },
});
