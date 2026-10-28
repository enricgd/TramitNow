// Escribe la especificación OpenAPI en openapi.json sin arrancar el servidor ni conectar a la base de datos.
//   npm run openapi            → apps/api/openapi.json (no se sube a git)

import { writeFileSync } from 'node:fs';
import { createApp } from '../src/app.js';
import { createSql } from '../src/lib/db.js';

// postgres.js no conecta hasta la primera consulta: aquí no hay ninguna.
const sql = createSql('postgresql://tramitnow_api@localhost/postgres');
const app = createApp({ sql, config: { jwtSecret: 'x'.repeat(32), jwtAudience: 'authenticated', corsOrigins: [] }, log: false });
const res = await app.request('/openapi.json');
writeFileSync(new URL('../openapi.json', import.meta.url), JSON.stringify(await res.json(), null, 2) + '\n');
await sql.end();
console.log('Escrito apps/api/openapi.json');
