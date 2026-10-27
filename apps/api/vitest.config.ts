import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// Los tests van contra la base local de db/local (sh db/local/reset.sh), nunca contra el NAS.
const devEnv = Object.fromEntries(
  readFileSync(new URL('../../db/local/dev.env', import.meta.url), 'utf8')
    .split('\n')
    .map((line) => line.match(/^([A-Z_]+)=(.*)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map(([, key, value]) => [key, value!.replace(/^"(.*)"$/, '$1')]),
);

const env = {
  DATABASE_URL: `postgresql://tramitnow_api:${devEnv.API_DB_PASSWORD}@127.0.0.1:54322/postgres`,
  ADMIN_DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  SUPABASE_JWT_SECRET: devEnv.JWT_SECRET!,
  AUTH_URL: 'http://127.0.0.1:9999',
  DEMO_EMAIL: devEnv.DEMO_EMAIL!,
  DEMO_PASSWORD: devEnv.DEMO_PASSWORD!,
};
// `test.env` no llega al globalSetup, que corre en este proceso: se fija también aquí.
Object.assign(process.env, env);

export default defineConfig({
  test: {
    globalSetup: ['test/global-setup.ts'],
    // Comparten los datos de prueba confirmados en la base local: un fichero detrás de otro.
    fileParallelism: false,
    testTimeout: 15000,
    env,
  },
});
