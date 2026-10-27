// Composición de la API: middlewares comunes, autenticación en /v1 y especificación OpenAPI.

import { OpenAPIHono } from '@hono/zod-openapi';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { z } from 'zod';
import type { Config } from './config.js';
import { requireAuth } from './lib/auth.js';
import type { AppEnv } from './lib/context.js';
import type { Sql } from './lib/db.js';
import { ApiError, errorBody, handleError } from './lib/errors.js';
import { branches } from './routes/branches.js';
import { companies } from './routes/companies.js';
import { health } from './routes/health.js';
import { me } from './routes/me.js';
import { memberships } from './routes/memberships.js';
import { roles } from './routes/roles.js';

// Mensajes de validación en español.
z.config(z.locales.es());

export const API_VERSION = '0.1.0';

export function createApp(options: { sql: Sql; config: Pick<Config, 'jwtSecret' | 'jwtAudience' | 'corsOrigins'>; log?: boolean }) {
  const { sql, config } = options;
  const app = new OpenAPIHono<AppEnv>();

  app.onError(handleError);
  app.notFound((c) => c.json(errorBody('no_encontrado', 'Ruta no encontrada'), 404));

  if (options.log !== false) app.use(logger());
  app.use(secureHeaders());
  app.use(
    cors({
      origin: config.corsOrigins,
      allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Authorization', 'Content-Type'],
      maxAge: 600,
    }),
  );
  app.use(
    bodyLimit({
      maxSize: 1024 * 1024,
      onError: () => {
        throw new ApiError(413, 'validacion', 'La petición es demasiado grande (máximo 1 MB)');
      },
    }),
  );
  app.use(async (c, next) => {
    c.set('sql', sql);
    await next();
  });

  app.route('/', health);

  app.use('/v1/*', requireAuth({ secret: config.jwtSecret, audience: config.jwtAudience }));
  app.route('/v1', me);
  app.route('/v1', companies);
  app.route('/v1', branches);
  app.route('/v1', roles);
  app.route('/v1', memberships);

  app.openAPIRegistry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'access_token de Supabase Auth (POST /auth/v1/token?grant_type=password)',
  });
  app.doc31('/openapi.json', {
    openapi: '3.1.0',
    info: {
      title: 'TramitNOW API',
      version: API_VERSION,
      description:
        'Única puerta a los datos de TramitNOW. Convenciones (errores, paginación, permisos) en apps/README.md.',
    },
    servers: [{ url: 'https://api.henrik11.duckdns.org', description: 'Demo (NAS)' }, { url: 'http://localhost:3000', description: 'Local' }],
  });

  return app;
}
