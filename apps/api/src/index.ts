// Arranque del servidor HTTP.

import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createSql } from './lib/db.js';

const config = loadConfig();
const sql = createSql(config.databaseUrl, { max: config.dbPoolMax });
const app = createApp({ sql, config });

const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`TramitNOW API escuchando en http://localhost:${info.port}`);
});

async function shutdown(signal: string) {
  console.log(`${signal}: cerrando`);
  server.close();
  await sql.end({ timeout: 5 });
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
