import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import pkg from './package.json' with { type: 'json' };

// Versión visible en la barra lateral: versión del package + commit, para saber qué hay desplegado.
const commit = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'local';
  }
})();

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Supabase Auth local (db/local/reset.sh). En el NAS la web llama a VITE_SUPABASE_URL directamente.
    proxy: {
      '/auth/v1': { target: 'http://127.0.0.1:9999', rewrite: (path) => path.replace(/^\/auth\/v1/, '') },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(`${pkg.version}-${commit}`),
  },
});
