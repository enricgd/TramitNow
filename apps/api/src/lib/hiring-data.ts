// Lecturas compartidas por peticiones y expedientes (fase 7): datos del art. 8 y evaluación de riesgos adjunta.

import { z } from '@hono/zod-openapi';
import type { Tx } from './db.js';
import type { Art8Input } from './hiring.js';
import { Timestamp } from './openapi.js';

export const DeclarationKind = z.enum(['strike', 'downsized_positions'])
  .openapi({ description: 'strike: huelga en el centro (art. 8.a); downsized_positions: puestos amortizados en 12 meses (art. 8.c)' });
export const DeclarationChannel = z.enum(['email', 'paper', 'phone', 'in_person', 'app', 'other']);

export const DeclarationSchema = z
  .object({
    id: z.guid(),
    kind: DeclarationKind,
    affirmative: z.boolean().openapi({ description: 'true: lo hay (hay huelga / hubo amortización) y bloquea; false: el cliente declara que no' }),
    contactId: z.guid().nullable(),
    contactName: z.string().nullable(),
    channel: DeclarationChannel,
    declaredAt: z.string(),
    documentId: z.guid().nullable(),
    notes: z.string().nullable(),
    recordedByName: z.string().nullable(),
    recordedAt: Timestamp,
  })
  .openapi('RequestDeclaration');
export type Declaration = z.infer<typeof DeclarationSchema>;

export const IssueSchema = z
  .object({
    code: z.string(),
    severity: z.enum(['blocked', 'required', 'warning'])
      .openapi({ description: 'blocked: prohibición (no se puede empezar); required: paso legal pendiente; warning: solo avisa' }),
    message: z.string(),
    dueDate: z.string().optional(),
  })
  .openapi('HiringIssue');

export const Art8Schema = z
  .object({
    clientIsEtt: z.boolean(),
    hazardousWork: z.boolean(),
    hazardousException: z.object({ basis: z.string(), byName: z.string().nullable(), at: Timestamp }).nullable(),
    declarations: z.object({ strike: DeclarationSchema.nullable(), downsizedPositions: DeclarationSchema.nullable() }),
    history: z.array(DeclarationSchema).openapi({ description: 'Todas las declaraciones registradas, la última primero' }),
    issues: z.array(IssueSchema).openapi({ description: 'Con el criterio del expediente: falta de declaración = required' }),
  })
  .openapi('RequestArt8');

export interface Art8Data {
  input: Art8Input;
  clientIsEtt: boolean;
  hazardousWork: boolean;
  hazardousException: { basis: string; byName: string | null; at: string } | null;
  strike: Declaration | null;
  downsizedPositions: Declaration | null;
  history: Declaration[];
}

/** Datos del art. 8 de varias peticiones. */
export async function loadArt8(tx: Tx, tenantId: string, requestIds: string[]): Promise<Map<string, Art8Data>> {
  const out = new Map<string, Art8Data>();
  if (!requestIds.length) return out;
  const rows = await tx<{ id: string; clientIsEtt: boolean; hazardousWork: boolean; basis: string | null; byName: string | null; at: string | null }[]>`
    select r.id, c.is_ett as client_is_ett, r.hazardous_work, r.hazardous_exception_basis as basis,
           p.full_name as by_name, r.hazardous_exception_at as at
    from public.requests r
    join public.clients c on c.tenant_id = r.tenant_id and c.id = r.client_id
    left join public.profiles p on p.id = r.hazardous_exception_by
    where r.tenant_id = ${tenantId} and r.id in ${tx(requestIds)}
  `;
  const decls = await tx<(Declaration & { requestId: string })[]>`
    select d.id, d.request_id, d.kind, d.affirmative, d.contact_id, cc.name as contact_name, d.channel,
           to_char(d.declared_at, 'YYYY-MM-DD') as declared_at, d.document_id, d.notes, p.full_name as recorded_by_name,
           d.recorded_at
    from public.request_declarations d
    left join public.client_contacts cc on cc.tenant_id = d.tenant_id and cc.id = d.contact_id
    left join public.profiles p on p.id = d.recorded_by
    where d.tenant_id = ${tenantId} and d.request_id in ${tx(requestIds)}
    order by d.recorded_at desc
  `;
  for (const r of rows) {
    const history = decls.filter((d) => d.requestId === r.id).map(({ requestId: _, ...d }) => d);
    const strike = history.find((d) => d.kind === 'strike') ?? null;
    const downsizedPositions = history.find((d) => d.kind === 'downsized_positions') ?? null;
    const hazardousException = r.basis ? { basis: r.basis, byName: r.byName, at: r.at! } : null;
    out.set(r.id, {
      input: {
        clientIsEtt: r.clientIsEtt,
        hazardousWork: r.hazardousWork,
        hazardousException: hazardousException !== null,
        strike: strike && { affirmative: strike.affirmative },
        downsizedPositions: downsizedPositions && { affirmative: downsizedPositions.affirmative },
      },
      clientIsEtt: r.clientIsEtt,
      hazardousWork: r.hazardousWork,
      hazardousException,
      strike,
      downsizedPositions,
      history,
    });
  }
  return out;
}

/** Evaluación de riesgos del cliente adjunta a cada petición (la última no rechazada). */
export async function loadRisksDocuments(tx: Tx, tenantId: string, requestIds: string[]) {
  const out = new Map<string, { documentId: string; name: string }>();
  if (!requestIds.length) return out;
  const rows = await tx<{ requestId: string; documentId: string; name: string }[]>`
    select distinct on (d.entity_id) d.entity_id as request_id, d.id as document_id, d.name
    from public.documents d join public.catalog_items t on t.tenant_id = d.tenant_id and t.id = d.type_id
    where d.tenant_id = ${tenantId} and d.entity_type = 'request' and d.entity_id in ${tx(requestIds)}
      and t.code = 'request_risk_assessment' and d.deleted_at is null and d.status <> 'rejected'
    order by d.entity_id, d.uploaded_at desc
  `;
  for (const r of rows) out.set(r.requestId, { documentId: r.documentId, name: r.name });
  return out;
}
