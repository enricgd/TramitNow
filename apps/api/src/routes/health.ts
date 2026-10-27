// Estado del servicio, sin autenticación. Lo usa el healthcheck de Docker.

import { createRoute, z } from '@hono/zod-openapi';
import { createRouter, jsonContent } from '../lib/openapi.js';

const HealthSchema = z.object({ status: z.enum(['ok', 'error']), database: z.enum(['ok', 'error']) }).openapi('Health');

export const health = createRouter().openapi(
  createRoute({
    method: 'get',
    path: '/health',
    tags: ['Sistema'],
    summary: 'Estado de la API y de la conexión a la base de datos',
    responses: {
      200: jsonContent(HealthSchema, 'Todo bien'),
      503: jsonContent(HealthSchema, 'Sin conexión a la base de datos'),
    },
  }),
  async (c) => {
    try {
      // Como tramitnow_api, sin cambiar de rol: no lee ninguna tabla.
      await c.get('sql')`select 1`;
      return c.json({ status: 'ok' as const, database: 'ok' as const }, 200);
    } catch (err) {
      console.error('health: sin conexión a la base de datos', err);
      return c.json({ status: 'error' as const, database: 'error' as const }, 503);
    }
  },
);

