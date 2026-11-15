import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import pkg from './package.json' with { type: 'json' };
import { fileURLToPath } from 'node:url';

// Versión visible en la barra lateral: versión del package + commit, para saber qué hay desplegado.
const commit = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'local';
  }
})();

// Páginas que se compilan: el ERP (index.html), los dos portales (trabajadores y empresas) y la web corporativa en
// cuatro versiones para comparar (web.html, web2.html estilo Perk, web3.html la mezcla y web4.html).
// La compilación del NAS (`npm run build`) solo lleva el ERP: los portales y la web aún son solo de ejemplo.
// La de ejemplo (`npm run build:ejemplo`) las lleva todas.
const page = (file: string) => fileURLToPath(new URL(`./${file}`, import.meta.url));
const PAGES = {
  erp: page('index.html'),
  trabajadores: page('trabajadores.html'),
  empresas: page('empresas.html'),
  web: page('web.html'),
  web2: page('web2.html'),
  web3: page('web3.html'),
  web4: page('web4.html'),
};

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  server: {
    // Supabase Auth local (db/local/reset.sh) y apps/api local (`npm run dev` en apps/api), para
    // `npm run dev:real`. En el NAS la web llama a VITE_SUPABASE_URL y VITE_API_URL directamente.
    proxy: {
      '/auth/v1': { target: 'http://127.0.0.1:9999', rewrite: (path) => path.replace(/^\/auth\/v1/, '') },
      '/v1': { target: 'http://127.0.0.1:3000' },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(`${pkg.version}-${commit}`),
  },
  build: {
    rollupOptions: {
      input: mode === 'ejemplo' ? PAGES : { erp: PAGES.erp },
    },
  },
}));
