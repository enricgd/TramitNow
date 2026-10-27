// Carga los datos de prueba de db/tests/_fixtures.sql (ETT A y B, usuarios ficticios) confirmados en la
// base local, y los borra al terminar con db/tests/_cleanup.sql. No toca la ETT DEMO.

import { readFileSync } from 'node:fs';
import postgres from 'postgres';

const read = (name: string) => readFileSync(new URL(`../../../db/tests/${name}`, import.meta.url), 'utf8');

function adminSql() {
  return postgres(process.env.ADMIN_DATABASE_URL!, { max: 1, onnotice: () => {} });
}

export async function setup() {
  const sql = adminSql();
  try {
    await sql`select 1`;
  } catch (err) {
    throw new Error(
      'No hay base local en 127.0.0.1:54322. Arranca Docker Desktop y ejecuta: sh db/local/reset.sh\n' + String(err),
    );
  }
  try {
    await sql.unsafe(read('_cleanup.sql'));
    await sql.begin((tx) => tx.unsafe(read('_fixtures.sql')));
  } finally {
    await sql.end();
  }

  // Comprueba que la API puede conectarse como tramitnow_api (contraseña de db/local/dev.env).
  const api = postgres(process.env.DATABASE_URL!, { max: 1 });
  try {
    await api`select 1`;
  } catch (err) {
    throw new Error(
      'No se puede conectar como tramitnow_api. ¿Es la base local anterior a apps/api? Vuelve a ejecutar sh db/local/reset.sh\n' +
        String(err),
    );
  } finally {
    await api.end();
  }
}

export async function teardown() {
  const sql = adminSql();
  try {
    await sql.unsafe(read('_cleanup.sql'));
  } finally {
    await sql.end();
  }
}
