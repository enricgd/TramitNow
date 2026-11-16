// Direcciones de la ETT activa (de sociedades, sucursales y, más adelante, clientes y trabajadores).
// Municipio, provincia y país son los códigos oficiales de los catálogos globales (GET /v1/catalogs/...).
// Leer: cualquier miembro. Escribir: addresses.write.

import { z } from '@hono/zod-openapi';
import { crudRoutes } from '../lib/crud.js';
import { Timestamp, nullableText } from '../lib/openapi.js';

const fields = {
  streetType: nullableText(20).openapi({ example: 'Calle' }),
  street: nullableText(200),
  number: nullableText(20),
  door: nullableText(20).openapi({ description: 'Piso, puerta, escalera...' }),
  postalCode: nullableText(20),
  city: nullableText(120).openapi({ description: 'Población en texto libre: fuera de España, o núcleo que no es municipio' }),
  municipalityCode: z.string().regex(/^[0-9]{5}$/).nullable().openapi({ description: 'Municipio del INE; de la provincia indicada' }),
  provinceCode: z.string().regex(/^[0-9]{2}$/).nullable().openapi({ description: 'Provincia del INE; solo en España' }),
  countryCode: z.string().regex(/^[A-Z]{2}$/).openapi({ description: 'ISO 3166-1 alfa-2', example: 'ES' }),
  geoZoneId: z.guid().nullable().openapi({ description: 'Zona geográfica propia de la ETT (catalog_items)' }),
};

export const addresses = crudRoutes({
  path: '/addresses',
  table: 'addresses',
  name: 'Address',
  tag: 'Direcciones',
  names: { one: 'la dirección', many: 'las direcciones' },
  schema: z.object({ id: z.guid(), ...fields, createdAt: Timestamp, updatedAt: Timestamp }).openapi('Address'),
  fields,
  required: [],
  createDefaults: { countryCode: fields.countryCode.default('ES') },
  columns: `id, street_type, street, number, door, postal_code, city, municipality_code, province_code, country_code,
    geo_zone_id, created_at, updated_at`,
  permission: 'addresses.write',
  hasStatus: false,
  orderBy: 'created_at',
});
