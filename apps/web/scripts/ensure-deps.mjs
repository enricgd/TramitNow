// Se ejecuta antes de `npm run dev` (script "predev").
// Instala las dependencias si faltan o si package-lock.json ha cambiado desde la última instalación,
// para que "abre la app" funcione en un clon recién hecho o tras cambiar de rama.
import { execSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';

const instalado = 'node_modules/.package-lock.json';

const desactualizado =
  !existsSync(instalado) || statSync('package-lock.json').mtimeMs > statSync(instalado).mtimeMs;

if (desactualizado) {
  console.log('Instalando dependencias de apps/web...');
  execSync('npm install', { stdio: 'inherit' });
}
