// Clientes de la ETT activa (db/README.md, "Módulo 2" y "Fase 2"): empresas cliente, centros de trabajo, contactos y
// facturación. Leer clientes, centros y contactos: cualquier miembro. Escribir: clients.manage en la sucursal
// del cliente (o del centro); las RLS lo comprueban. Facturación: clients.billing.manage, también para leer.
//
// Eliminar clientes, centros y contactos es una baja lógica recuperable (`?deleted=true` y `POST /{id}/restore`);
// lo que ya se ha usado no se elimina (409 `en_uso`): se desactiva (clientes, centros) o se suspende (contactos).

import { createRoute, z } from '@hono/zod-openapi';
import { withTenant } from '../lib/context.js';
import { crudRoutes } from '../lib/crud.js';
import { pickDefined } from '../lib/db.js';
import { notFound } from '../lib/errors.js';
import {
  IdParams,
  Timestamp,
  bearerSecurity,
  createRouter,
  errorResponses,
  jsonBody,
  jsonContent,
  nullableText,
} from '../lib/openapi.js';

const base = { id: z.guid(), createdAt: Timestamp, updatedAt: Timestamp };
/** Solo en las listas con `?deleted=true`; null en lo activo. */
const deletedAt = Timestamp.nullable().openapi({ description: 'Cuándo se eliminó (null si está activo)' });
const date = z.iso.date().nullable();
/** NIF, CCC, documentos: sin espacios, puntos ni guiones y en mayúsculas. */
const normalized = (max: number, pattern = /^[A-Z0-9]+$/, message = 'Solo letras y números') =>
  z
    .string()
    .transform((v) => v.replace(/[\s.\-/]/g, '').toUpperCase())
    .pipe(z.string().min(1).max(max).regex(pattern, message))
    .nullable();

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------
const ClientStatus = z.enum(['prospect', 'active', 'inactive']).openapi({ description: 'prospect: en captación' });

const clientFields = {
  companyId: z.guid(),
  branchId: z.guid().openapi({ description: 'Sucursal propietaria; decide quién puede editarlo' }),
  code: z.string().trim().min(1).max(30),
  legalName: z.string().trim().min(1).max(220),
  tradeName: nullableText(220),
  taxIdType: z.enum(['nif', 'nie', 'vat_eu', 'other']),
  taxId: normalized(30).openapi({ description: 'Único por sociedad. Se guarda sin espacios ni guiones', example: 'B00000000' }),
  ownerUserId: z.guid().nullable().openapi({ description: 'Responsable de la ETT asignado' }),
  clientTypeId: z.guid().nullable(),
  businessGroupId: z.guid().nullable(),
  activity: nullableText(250),
  sectorCode: z
    .string()
    .regex(/^([A-Z]|[0-9]{2})$/, 'Sección (letra) o división (2 dígitos) de la CNAE')
    .nullable()
    .openapi({ description: 'Sector: código CNAE-2009 de GET /v1/cnae', example: '52' }),
  defaultAgreementId: z
    .guid()
    .nullable()
    .openapi({ description: 'Convenio por defecto: lo heredan los centros sin convenio propio' }),
  startDate: date,
  status: ClientStatus,
  blocked: z.boolean(),
  blockedReason: z.string().max(2000).nullable(),
  addressId: z.guid().nullable(),
  phone: nullableText(40),
  fax: nullableText(40),
  email: z.email().max(200).nullable(),
  website: nullableText(250),
  onlineCpdPricePrinting: z.boolean(),
  observations: z.string().max(8000).nullable(),
};

export const clients = crudRoutes({
  path: '/clients',
  table: 'clients',
  name: 'Client',
  tag: 'Clientes',
  names: { one: 'el cliente', many: 'los clientes' },
  schema: z
    .object({
      ...base,
      ...clientFields,
      startDate: z.string().nullable(),
      readiness: z
        .object({
          centers: z.number().int().openapi({ description: 'Centros activos (no eliminados)' }),
          contacts: z.number().int().openapi({ description: 'Contactos activos (no eliminados), suspendidos incluidos' }),
          hasBilling: z.boolean().openapi({ description: 'Tiene datos de facturación (lo ve cualquier miembro, sin los datos)' }),
        })
        .openapi({ description: 'Solo lectura: resumen para la preparación (lista para presupuestar, operar, facturar)' }),
      deletedAt,
    })
    .openapi('Client'),
  fields: clientFields,
  required: ['companyId', 'branchId', 'code', 'legalName'],
  createDefaults: { status: ClientStatus.default('active'), taxIdType: clientFields.taxIdType.default('nif') },
  columns: `id, company_id, branch_id, code, legal_name, trade_name, tax_id_type, tax_id, owner_user_id, client_type_id,
    business_group_id, activity, sector_code, default_agreement_id, to_char(start_date, 'YYYY-MM-DD') as start_date,
    status, blocked, blocked_reason, address_id, phone, fax, email, website, online_cpd_price_printing, observations,
    private.client_readiness(tenant_id, id) as readiness, created_at, updated_at, deleted_at`,
  permission: 'clients.manage',
  search: ['code', 'legal_name', 'trade_name', 'tax_id'],
  filters: {
    status: ClientStatus.optional(),
    companyId: z.guid().optional(),
    blocked: z.stringbool().optional(),
    sectorCode: z
      .string()
      .regex(/^([A-Z]|[0-9]{2})$/)
      .optional()
      .openapi({ description: 'Sector CNAE; una sección (letra) incluye sus divisiones' }),
  },
  where: (tx, q) => [
    ...(q.companyId ? [tx`company_id = ${q.companyId}`] : []),
    ...(q.blocked !== undefined ? [tx`blocked = ${q.blocked}`] : []),
    ...(q.sectorCode
      ? [
          tx`(sector_code = ${q.sectorCode}
              or sector_code in (select code from public.cnae_activities where parent_code = ${q.sectorCode}))`,
        ]
      : []),
  ],
  orderBy: 'legal_name, code',
  branchColumn: 'branch_id',
  restorable: true,
});

// ---------------------------------------------------------------------------
// Centros de trabajo
// ---------------------------------------------------------------------------
const centerFields = {
  clientId: z.guid(),
  branchId: z.guid().openapi({ description: 'Sucursal de la ETT que gestiona el centro' }),
  code: z.string().trim().min(1).max(30),
  name: z.string().trim().min(1).max(200),
  taxId: normalized(30).openapi({ description: 'Si el centro tiene NIF propio' }),
  ccc: normalized(11, /^[0-9]{11}$/, 'Código de cuenta de cotización: 11 dígitos').openapi({ example: '28000000000' }),
  isSelfEmployedCcc: z.boolean(),
  cnaeCode: z.string().regex(/^[0-9]{4}$/, 'CNAE-2009 de 4 dígitos').nullable(),
  ssRegimeCode: z.string().regex(/^[0-9]{4}$/).nullable(),
  blocked: z.boolean().openapi({ description: 'En pantalla, «Inactivo»' }),
  addressId: z.guid().nullable(),
  phone: nullableText(40),
  email: z.email().max(200).nullable(),
  clientAgreementId: z
    .guid()
    .nullable()
    .openapi({ description: 'Convenio de la empresa usuaria en este centro; null: el del cliente (defaultAgreementId)' }),
  payrollAgreementId: z.guid().nullable(),
  grdaAgreementId: z.guid().nullable(),
  projectCode: nullableText(50),
  tcCompanyId: z.guid().nullable(),
  tcBranchId: z.guid().nullable(),
  accessInstructions: z.string().max(8000).nullable().openapi({ description: 'Instrucciones de acceso y PRL' }),
  notes: z.string().max(8000).nullable(),
};

export const clientCenters = crudRoutes({
  path: '/client-centers',
  table: 'client_centers',
  name: 'ClientCenter',
  tag: 'Clientes',
  names: { one: 'el centro de trabajo', many: 'los centros de trabajo' },
  schema: z
    .object({
      ...base,
      ...centerFields,
      effectiveClientAgreementId: z
        .guid()
        .nullable()
        .openapi({ description: 'Solo lectura: clientAgreementId o, si es null, el convenio por defecto del cliente' }),
      deletedAt,
    })
    .openapi('ClientCenter'),
  fields: centerFields,
  required: ['clientId', 'branchId', 'code', 'name'],
  columns: `id, client_id, branch_id, code, name, tax_id, ccc, is_self_employed_ccc, cnae_code, ss_regime_code, blocked,
    address_id, phone, email, client_agreement_id, payroll_agreement_id, grda_agreement_id, project_code, tc_company_id,
    tc_branch_id, access_instructions, notes,
    coalesce(client_agreement_id, (
      select c.default_agreement_id from public.clients c
      where c.tenant_id = client_centers.tenant_id and c.id = client_centers.client_id
    )) as effective_client_agreement_id,
    created_at, updated_at, deleted_at`,
  permission: 'clients.manage',
  hasStatus: false,
  search: ['code', 'name', 'ccc'],
  filters: { clientId: z.guid().optional() },
  where: (tx, q) => (q.clientId ? [tx`client_id = ${q.clientId}`] : []),
  branchColumn: 'branch_id',
  restorable: true,
});

// ---------------------------------------------------------------------------
// Contactos (datos personales: DNI/NIE solo de quien firma los CPD)
// ---------------------------------------------------------------------------
const ContactRole = z
  .enum(['commercial', 'requester', 'operations', 'billing', 'hr', 'prevention', 'management', 'other'])
  .openapi({ description: 'other: «Otro», con su texto en otherRole' });

const contactFields = {
  clientId: z.guid(),
  centerId: z.guid().nullable().openapi({ description: 'Centro del mismo cliente; null: del cliente en general' }),
  name: z.string().trim().min(1).max(160),
  position: nullableText(120),
  department: nullableText(120),
  phone: nullableText(40),
  mobile: nullableText(40),
  email: z.email().max(200).nullable(),
  roles: z.array(ContactRole).max(8),
  otherRole: nullableText(120).openapi({ description: 'Obligatorio con el rol other; si no, null' }),
  validatesHours: z.boolean().openapi({ description: 'Valida las horas de los trabajadores en misión' }),
  suspended: z.boolean().openapi({ description: 'Suspendido: no se usa, pero no se elimina (lo usado no se elimina)' }),
  isMain: z.boolean().openapi({ description: 'Contacto principal (uno por cliente)' }),
  isQuoteRecipient: z.boolean(),
  signsCpds: z.boolean(),
  documentType: z.enum(['nif', 'nie', 'passport', 'other']).nullable().openapi({ description: 'Solo si signsCpds' }),
  documentNumber: normalized(30).openapi({ description: 'Solo si signsCpds' }),
  receivesDigitalSignature: z.boolean(),
  sendCollectionClaims: z.boolean(),
  invoiceSendType: z.enum(['email', 'postal', 'portal']).nullable(),
  sortOrder: z.number().int().nullable(),
  notes: z.string().max(4000).nullable(),
};

export const clientContacts = crudRoutes({
  path: '/client-contacts',
  table: 'client_contacts',
  name: 'ClientContact',
  tag: 'Clientes',
  names: { one: 'el contacto', many: 'los contactos' },
  schema: z
    .object({
      ...base,
      ...contactFields,
      suspendedAt: Timestamp.nullable().openapi({ description: 'Solo lectura: cuándo se suspendió' }),
      suspendedBy: z.guid().nullable().openapi({ description: 'Solo lectura: quién lo suspendió' }),
      deletedAt,
    })
    .openapi('ClientContact'),
  fields: contactFields,
  required: ['clientId', 'name'],
  columns: `id, client_id, center_id, name, position, department, phone, mobile, email, roles, other_role, validates_hours,
    suspended, is_main, is_quote_recipient, signs_cpds, document_type, document_number, receives_digital_signature,
    send_collection_claims, invoice_send_type, sort_order, notes, suspended_at, suspended_by, created_at, updated_at,
    deleted_at`,
  permission: 'clients.manage',
  hasStatus: false,
  search: ['name', 'email', 'position'],
  filters: { clientId: z.guid().optional(), centerId: z.guid().optional(), suspended: z.stringbool().optional() },
  where: (tx, q) => [
    ...(q.clientId ? [tx`client_id = ${q.clientId}`] : []),
    ...(q.centerId ? [tx`center_id = ${q.centerId}`] : []),
    ...(q.suspended !== undefined ? [tx`suspended = ${q.suspended}`] : []),
  ],
  orderBy: 'is_main desc, sort_order nulls last, name',
  restorable: true,
});

// ---------------------------------------------------------------------------
// Facturación del cliente (1:1)
// ---------------------------------------------------------------------------
const BILLING_PERMISSION = 'clients.billing.manage';
/** Plazo máximo de pago entre empresas (Ley 3/2004, de medidas de lucha contra la morosidad). */
const LEGAL_MAX_PAYMENT_DAYS = 60;

const billingFields = {
  paymentMethodId: z.guid().nullable(),
  paymentTermDays: z.number().int().min(0).max(365).nullable(),
  fixedPaymentDays: z
    .array(z.number().int().min(1).max(31))
    .min(1)
    .max(3)
    .nullable()
    .openapi({ description: 'Días fijos de pago (como mucho 3). 31 = último día del mes; si el mes no tiene ese día, su último día' }),
  iban: normalized(34, /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/, 'IBAN no válido'),
  swiftBic: normalized(11, /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, 'BIC no válido'),
  b2bDirectDebit: z.boolean(),
  invoiceClientId: z.guid().nullable().openapi({ description: 'Cliente al que se factura, si es otro' }),
  invoiceTypeId: z.guid().nullable(),
  invoicePrintModelId: z.guid().nullable(),
  copiesCount: z.number().int().min(1).max(10),
  sendInvoicesByPostalMail: z.boolean(),
  generateEInvoice: z.boolean(),
  fixedInvoiceText: z.string().max(4000).nullable(),
  fixedInvoiceTextPosition: z.enum(['before', 'after']).nullable(),
  vatSpecialCauseId: z.guid().nullable(),
  equivalenceSurcharge: z.boolean(),
  retentionTypeId: z.guid().nullable(),
  riskLimit: z.number().min(0).nullable(),
  riskNotes: z.string().max(4000).nullable(),
  accountingAccount: nullableText(50),
  supplierReference: nullableText(80),
  sellerUserId: z.guid().nullable(),
  statisticalSectorId: z.guid().nullable(),
  offerMarginPercent: z.number().nullable(),
  offerCoefficient: z.number().nullable(),
  invoiceLayout: z
    .enum(['by_person', 'by_concept'])
    .openapi({ description: 'Cómo se imprime la factura: por persona (por defecto) o por concepto' }),
};

const BillingSchema = z
  .object({ ...base, clientId: z.guid(), ...billingFields, iban: z.string().nullable(), swiftBic: z.string().nullable() })
  .openapi('ClientBilling');
const BillingUpdateSchema = z.strictObject(billingFields).partial().openapi('ClientBillingUpdate');
const BillingResponse = z
  .object({
    billing: BillingSchema,
    warnings: z.array(z.string()).openapi({ description: 'Avisos que no impiden guardar (p. ej. plazo de pago legal)' }),
  })
  .openapi('ClientBillingResult');

const billingColumns = `id, client_id, payment_method_id, payment_term_days, fixed_payment_days, iban, swift_bic,
  b2b_direct_debit, invoice_client_id, invoice_type_id, invoice_print_model_id, copies_count, send_invoices_by_postal_mail,
  generate_e_invoice, fixed_invoice_text, fixed_invoice_text_position, vat_special_cause_id, equivalence_surcharge,
  retention_type_id, risk_limit::float8 as risk_limit, risk_notes, accounting_account, supplier_reference, seller_user_id,
  statistical_sector_id, offer_margin_percent::float8 as offer_margin_percent, offer_coefficient::float8 as offer_coefficient,
  invoice_layout, created_at, updated_at`;

function billingWarnings(billing: { paymentTermDays: number | null }): string[] {
  return billing.paymentTermDays !== null && billing.paymentTermDays > LEGAL_MAX_PAYMENT_DAYS
    ? [`El plazo de pago supera los ${LEGAL_MAX_PAYMENT_DAYS} días que permite la Ley 3/2004 entre empresas`]
    : [];
}

export const clientBilling = createRouter()
  .openapi(
    createRoute({
      method: 'get',
      path: '/clients/{id}/billing',
      tags: ['Clientes'],
      summary: 'Ver la facturación de un cliente',
      description: `Requiere \`${BILLING_PERMISSION}\`. 404 si el cliente aún no tiene datos de facturación.`,
      security: bearerSecurity,
      request: { params: IdParams },
      responses: { 200: jsonContent(BillingResponse, 'Facturación'), ...errorResponses(400, 401, 403, 404) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const billing = await withTenant(c, { permission: BILLING_PERMISSION }, async (tx, ctx) => {
        const [row] = await tx`
          select ${tx.unsafe(billingColumns)} from public.client_billing_profiles
          where tenant_id = ${ctx.tenantId} and client_id = ${id} and deleted_at is null
        `;
        if (!row) throw notFound('El cliente no tiene datos de facturación');
        return row as z.infer<typeof BillingSchema>;
      });
      return c.json({ billing, warnings: billingWarnings(billing) }, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'put',
      path: '/clients/{id}/billing',
      tags: ['Clientes'],
      summary: 'Guardar la facturación de un cliente',
      description: `Crea o actualiza; solo cambia los campos enviados. Requiere \`${BILLING_PERMISSION}\`.`,
      security: bearerSecurity,
      request: { params: IdParams, body: jsonBody(BillingUpdateSchema) },
      responses: { 200: jsonContent(BillingResponse, 'Facturación guardada'), ...errorResponses(400, 401, 403, 404, 422) },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const patch = pickDefined(c.req.valid('json'), Object.keys(billingFields) as (keyof typeof billingFields)[]);
      const billing = await withTenant(c, { permission: BILLING_PERMISSION }, async (tx, ctx) => {
        const [client] = await tx`
          select id from public.clients where tenant_id = ${ctx.tenantId} and id = ${id} and deleted_at is null
        `;
        if (!client) throw notFound('El cliente no existe');
        const values = { ...patch, tenantId: ctx.tenantId, clientId: id };
        const [row] = await tx`
          insert into public.client_billing_profiles ${tx(values)}
          on conflict (tenant_id, client_id) do update set ${
            Object.keys(patch).length ? tx(patch) : tx`updated_at = now()`
          }
          returning ${tx.unsafe(billingColumns)}
        `;
        return row as z.infer<typeof BillingSchema>;
      });
      return c.json({ billing, warnings: billingWarnings(billing) }, 200);
    },
  );
