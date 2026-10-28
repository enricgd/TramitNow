// Catálogos oficiales globales (db/README.md, "Módulo 1"): comunes a todas las ETT y de solo lectura.
// Los puede leer cualquier usuario con sesión, tenga ETT activa o no. Cambian como mucho una vez al año,
// así que el cliente puede guardarlos en caché.

import { createRoute, z } from '@hono/zod-openapi';
import { withUser } from '../lib/context.js';
import { likePattern } from '../lib/db.js';
import { notFound } from '../lib/errors.js';
import { bearerSecurity, createRouter, errorResponses, jsonContent, listOf } from '../lib/openapi.js';

const tags = ['Catálogos oficiales'];
const twoDigits = z.string().regex(/^[0-9]{2}$/);

const AutonomousCommunitySchema = z.object({ code: z.string(), name: z.string() }).openapi('AutonomousCommunity');
const ProvinceSchema = z
  .object({ code: z.string(), name: z.string(), autonomousCommunityCode: z.string() })
  .openapi('Province');
const MunicipalitySchema = z
  .object({
    code: z.string().openapi({ description: 'CPRO+CMUN del INE', example: '28079' }),
    provinceCode: z.string(),
    checkDigit: z.string(),
    name: z.string(),
    active: z.boolean().openapi({ description: 'false: ya no figura en la relación del INE' }),
  })
  .openapi('Municipality');
const CountrySchema = z
  .object({
    code: z.string().openapi({ description: 'ISO 3166-1 alfa-2', example: 'ES' }),
    alpha3: z.string(),
    numericCode: z.string(),
    name: z.string(),
    euMember: z.boolean(),
    eeaMember: z.boolean(),
  })
  .openapi('Country');
const ContractKeySchema = z
  .object({
    code: z.string().openapi({ description: 'Clave TGSS-SEPE', example: '402' }),
    name: z.string(),
    duration: z.enum(['indefinite', 'temporary']),
    workingTime: z.enum(['full_time', 'part_time', 'fixed_discontinuous']),
    isConversion: z.boolean(),
    active: z.boolean(),
    notes: z.string().nullable(),
  })
  .openapi('ContractKey');

const MunicipalityQuery = z
  .object({
    provinceCode: twoDigits.optional(),
    q: z.string().trim().min(2).max(100).optional().openapi({ description: 'Busca en el nombre (mínimo 2 letras)' }),
    includeInactive: z.stringbool().default(false),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .refine((v) => v.provinceCode || v.q, { message: 'Indica provinceCode o q: la lista entera tiene más de 8.000 municipios' });

export const catalogs = createRouter()
  .openapi(
    createRoute({
      method: 'get',
      path: '/catalogs/autonomous-communities',
      tags,
      summary: 'Comunidades y ciudades autónomas (INE)',
      security: bearerSecurity,
      responses: { 200: jsonContent(listOf(AutonomousCommunitySchema), 'Comunidades'), ...errorResponses(401) },
    }),
    async (c) => {
      const data = await withUser(c, (tx) => tx`select code, name from public.autonomous_communities order by code`);
      return c.json({ data: [...data] } as never, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/catalogs/provinces',
      tags,
      summary: 'Provincias (INE)',
      security: bearerSecurity,
      request: { query: z.object({ autonomousCommunityCode: twoDigits.optional() }) },
      responses: { 200: jsonContent(listOf(ProvinceSchema), 'Provincias'), ...errorResponses(400, 401) },
    }),
    async (c) => {
      const { autonomousCommunityCode } = c.req.valid('query');
      const data = await withUser(
        c,
        (tx) => tx`
          select code, name, autonomous_community_code from public.provinces
          ${autonomousCommunityCode ? tx`where autonomous_community_code = ${autonomousCommunityCode}` : tx``}
          order by name
        `,
      );
      return c.json({ data: [...data] } as never, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/catalogs/municipalities',
      tags,
      summary: 'Busca municipios (INE)',
      description: 'Para los selectores: exige provincia o texto. Por defecto solo los vigentes.',
      security: bearerSecurity,
      request: { query: MunicipalityQuery },
      responses: { 200: jsonContent(listOf(MunicipalitySchema), 'Municipios'), ...errorResponses(400, 401) },
    }),
    async (c) => {
      const { provinceCode, q, includeInactive, limit } = c.req.valid('query');
      const data = await withUser(
        c,
        (tx) => tx`
          select code, province_code, check_digit, name, active from public.municipalities
          where true
            ${provinceCode ? tx`and province_code = ${provinceCode}` : tx``}
            ${q ? tx`and name ilike ${likePattern(q)}` : tx``}
            ${includeInactive ? tx`` : tx`and active`}
          order by name limit ${limit}
        `,
      );
      return c.json({ data: [...data] } as never, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/catalogs/municipalities/{code}',
      tags,
      summary: 'Ver un municipio (INE)',
      security: bearerSecurity,
      request: {
        params: z.object({ code: z.string().regex(/^[0-9]{5}$/).openapi({ param: { name: 'code', in: 'path' }, example: '28079' }) }),
      },
      responses: { 200: jsonContent(MunicipalitySchema, 'Municipio'), ...errorResponses(400, 401, 404) },
    }),
    async (c) => {
      const { code } = c.req.valid('param');
      const [row] = await withUser(
        c,
        (tx) => tx`select code, province_code, check_digit, name, active from public.municipalities where code = ${code}`,
      );
      if (!row) throw notFound('El municipio no existe');
      return c.json(row as never, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/catalogs/countries',
      tags,
      summary: 'Países (ISO 3166-1)',
      security: bearerSecurity,
      request: { query: z.object({ q: z.string().trim().min(1).max(100).optional() }) },
      responses: { 200: jsonContent(listOf(CountrySchema), 'Países'), ...errorResponses(400, 401) },
    }),
    async (c) => {
      const { q } = c.req.valid('query');
      const data = await withUser(
        c,
        (tx) => tx`
          select code, alpha3, numeric_code, name, eu_member, eea_member from public.countries
          ${q ? tx`where name ilike ${likePattern(q)} or code = upper(${q})` : tx``}
          order by name
        `,
      );
      return c.json({ data: [...data] } as never, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/catalogs/contract-keys',
      tags,
      summary: 'Claves oficiales de contrato (TGSS-SEPE)',
      security: bearerSecurity,
      request: { query: z.object({ includeInactive: z.stringbool().default(false) }) },
      responses: { 200: jsonContent(listOf(ContractKeySchema), 'Claves de contrato'), ...errorResponses(400, 401) },
    }),
    async (c) => {
      const { includeInactive } = c.req.valid('query');
      const data = await withUser(
        c,
        (tx) => tx`
          select code, name, duration, working_time, is_conversion, active, notes from public.contract_keys
          ${includeInactive ? tx`` : tx`where active`}
          order by code
        `,
      );
      return c.json({ data: [...data] } as never, 200);
    },
  );
