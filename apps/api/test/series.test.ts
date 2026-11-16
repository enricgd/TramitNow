// Numeración sin huecos (private.next_number) con transacciones de verdad a la vez, como las haría la API.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Claims } from '../src/lib/auth.js';
import { type Sql, createSql, withClaims } from '../src/lib/db.js';
import { T, USER, adminSql, closeAll, hookClaims } from './helpers.js';

const YEAR = 2099;
let claims: Claims;
const pools: Sql[] = [];
const pool = (max: number) => {
  const sql = createSql(process.env.DATABASE_URL!, { max });
  pools.push(sql);
  return sql;
};

const next = async (sql: Sql, kind: string, hold?: Promise<void>, fail = false) =>
  withClaims(sql, claims, async (tx) => {
    const [row] = await tx<{ number: number }[]>`select number from private.next_number(${T.A}, ${kind}, ${YEAR})`;
    if (hold) await hold;
    if (fail) throw new Error('deshacer');
    return row!.number;
  });

beforeAll(async () => {
  claims = (await hookClaims(USER.adminA)) as Claims;
});
afterAll(async () => {
  await adminSql`delete from public.number_series where tenant_id = ${T.A} and year = ${YEAR}`;
  await Promise.all(pools.map((sql) => sql.end()));
  await closeAll();
});

describe('series de numeración', () => {
  it('la segunda transacción espera a que la primera termine y sigue donde lo dejó', async () => {
    const one = pool(1);
    const two = pool(1);
    let release!: () => void;
    const hold = new Promise<void>((resolve) => (release = resolve));

    const first = next(one, 'quote', hold);
    // Damos tiempo a que la primera tome el número y se quede con la fila bloqueada.
    await new Promise((resolve) => setTimeout(resolve, 200));
    let secondDone = false;
    const second = next(two, 'quote').then((n) => ((secondDone = true), n));
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(secondDone).toBe(false);

    release();
    const [a, b] = await Promise.all([first, second]);
    expect([a, b]).toEqual([1, 2]);
  });

  it('si la primera se deshace, la que esperaba usa su número: no quedan huecos', async () => {
    const one = pool(1);
    const two = pool(1);
    let release!: () => void;
    const hold = new Promise<void>((resolve) => (release = resolve));

    const failed = next(one, 'request', hold, true).catch(() => null);
    await new Promise((resolve) => setTimeout(resolve, 200));
    const second = next(two, 'request');
    await new Promise((resolve) => setTimeout(resolve, 200));
    release();
    expect(await failed).toBeNull();
    expect(await second).toBe(1);
  });

  it('muchas a la vez, algunas deshechas: los números confirmados son 1..N sin repetir ni saltar', async () => {
    const sql = pool(8);
    const results = await Promise.all(
      Array.from({ length: 40 }, (_, i) => next(sql, 'invoice', undefined, i % 4 === 3).catch(() => null)),
    );
    const committed = results.filter((n): n is number => n !== null).sort((x, y) => x - y);
    expect(committed).toHaveLength(30);
    expect(committed).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    const [series] = await adminSql<{ n: number }[]>`
      select last_number as n from public.number_series where tenant_id = ${T.A} and document_kind = 'invoice' and year = ${YEAR}
    `;
    expect(series?.n).toBe(30);
  });
});
