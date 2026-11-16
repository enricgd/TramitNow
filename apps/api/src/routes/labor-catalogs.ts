// Catálogos laborales de la ETT activa (db/README.md, "Módulo 1"): convenios, categorías profesionales,
// tipos de contrato y conceptos de nómina. Leer: cualquier miembro. Escribir: labor_catalogs.manage.

import { z } from '@hono/zod-openapi';
import { crudRoutes } from '../lib/crud.js';
import { Status, Timestamp, nullableText } from '../lib/openapi.js';

const PERMISSION = 'labor_catalogs.manage';
const code = (max: number) => z.string().trim().min(1).max(max);
const name = (max: number) => z.string().trim().min(1).max(max);
const date = z.iso.date().nullable();
const base = { id: z.guid(), createdAt: Timestamp, updatedAt: Timestamp };

// ---------------------------------------------------------------------------
// Convenios
// ---------------------------------------------------------------------------
const AgreementScope = z.enum(['state', 'regional', 'provincial', 'local', 'company', 'other']);

const agreementFields = {
  code: code(30),
  name: name(250),
  officialCode: z.string().regex(/^[0-9]{14}$/, 'Código REGCON de 14 dígitos').nullable(),
  scope: AgreementScope,
  autonomousCommunityCode: z.string().regex(/^[0-9]{2}$/).nullable(),
  provinceCode: z.string().regex(/^[0-9]{2}$/).nullable(),
  validFrom: date,
  validTo: date,
  notes: z.string().max(4000).nullable(),
  status: Status,
};

export const collectiveAgreements = crudRoutes({
  path: '/collective-agreements',
  table: 'collective_agreements',
  name: 'CollectiveAgreement',
  tag: 'Convenios',
  names: { one: 'el convenio', many: 'los convenios' },
  schema: z.object({ ...base, ...agreementFields, validFrom: z.string().nullable(), validTo: z.string().nullable() }).openapi('CollectiveAgreement'),
  fields: agreementFields,
  required: ['code', 'name'],
  columns: `id, code, name, official_code, scope, autonomous_community_code, province_code,
    to_char(valid_from, 'YYYY-MM-DD') as valid_from, to_char(valid_to, 'YYYY-MM-DD') as valid_to, notes, status, created_at, updated_at`,
  permission: PERMISSION,
  search: ['code', 'name', 'official_code'],
  filters: { provinceCode: z.string().regex(/^[0-9]{2}$/).optional(), scope: AgreementScope.optional() },
  where: (tx, q) => [
    ...(q.provinceCode ? [tx`province_code = ${q.provinceCode}`] : []),
    ...(q.scope ? [tx`scope = ${q.scope}`] : []),
  ],
});

// ---------------------------------------------------------------------------
// Categorías profesionales y puestos ("Categorías TTI-SRV")
// ---------------------------------------------------------------------------
const CategoryKind = z.enum(['position', 'category']);

const categoryFields = {
  code: code(30),
  name: name(200),
  kind: CategoryKind,
  agreementId: z.guid().nullable(),
  agreementLevel: nullableText(60),
  cnoCode: z.string().regex(/^[0-9]{4}$/, 'Código CNO-11 de 4 dígitos').nullable(),
  contributionGroup: z.number().int().min(1).max(11).nullable(),
  statisticalCode: nullableText(30),
  companyId: z.guid().nullable().openapi({ description: 'Ámbito: null = toda la ETT' }),
  branchId: z.guid().nullable().openapi({ description: 'Ámbito: una sucursal de la sociedad indicada' }),
  status: Status,
};

export const professionalCategories = crudRoutes({
  path: '/professional-categories',
  table: 'professional_categories',
  name: 'ProfessionalCategory',
  tag: 'Categorías profesionales',
  names: { one: 'la categoría', many: 'las categorías' },
  schema: z.object({ ...base, ...categoryFields }).openapi('ProfessionalCategory'),
  fields: categoryFields,
  required: ['code', 'name'],
  columns: `id, code, name, kind, agreement_id, agreement_level, cno_code, contribution_group, statistical_code,
    company_id, branch_id, status, created_at, updated_at`,
  permission: PERMISSION,
  search: ['code', 'name'],
  filters: {
    agreementId: z.guid().optional(),
    companyId: z.guid().optional(),
    branchId: z.guid().optional(),
    cnoCode: z.string().regex(/^[0-9]{4}$/).optional(),
    kind: CategoryKind.optional(),
  },
  where: (tx, q) => [
    ...(q.agreementId ? [tx`agreement_id = ${q.agreementId}`] : []),
    ...(q.companyId ? [tx`company_id = ${q.companyId}`] : []),
    ...(q.branchId ? [tx`branch_id = ${q.branchId}`] : []),
    ...(q.cnoCode ? [tx`cno_code = ${q.cnoCode}`] : []),
    ...(q.kind ? [tx`kind = ${q.kind}`] : []),
  ],
});

// ---------------------------------------------------------------------------
// Tipos de contrato (cada uno con su clave oficial TGSS-SEPE)
// ---------------------------------------------------------------------------
const ContributionMode = z.enum(['percentages', 'fixed_amounts']);

const contractTypeFields = {
  code: code(10),
  name: name(200),
  contractKeyCode: z.string().regex(/^[1-5][0-9]{2}$/, 'Clave oficial de 3 dígitos (GET /v1/catalogs/contract-keys)'),
  contributionMode: ContributionMode,
  status: Status,
};

export const contractTypes = crudRoutes({
  path: '/contract-types',
  table: 'contract_types',
  name: 'ContractType',
  tag: 'Tipos de contrato',
  names: { one: 'el tipo de contrato', many: 'los tipos de contrato' },
  schema: z.object({ ...base, ...contractTypeFields }).openapi('ContractType'),
  fields: contractTypeFields,
  required: ['code', 'name', 'contractKeyCode'],
  columns: 'id, code, name, contract_key_code, contribution_mode, status, created_at, updated_at',
  permission: PERMISSION,
  search: ['code', 'name'],
  filters: { contractKeyCode: z.string().regex(/^[0-9]{3}$/).optional() },
  where: (tx, q) => (q.contractKeyCode ? [tx`contract_key_code = ${q.contractKeyCode}`] : []),
  orderBy: 'code',
});

// ---------------------------------------------------------------------------
// Conceptos de nómina y de coste
// ---------------------------------------------------------------------------
const ConceptType = z.enum([
  'normal_hour', 'overtime', 'salary_supplement', 'allowance', 'employer_cost', 'discount', 'other',
]);
const Calculation = z.enum(['percentage', 'fixed_hour', 'fixed_day', 'fixed_month', 'fixed']);
const CalculationBase = z.enum([
  'gross_hourly_salary', 'total_salary_cost', 'contribution_base', 'hourly_rate', 'effective_hours',
]);

const conceptFields = {
  code: code(30),
  name: name(200),
  description: z.string().max(4000).nullable(),
  conceptType: ConceptType,
  calculation: Calculation,
  defaultValue: z.number().nullable(),
  calculationBase: CalculationBase.nullable().openapi({ description: 'Obligatoria si calculation = percentage, y solo entonces' }),
  isSalary: z.boolean(),
  isMandatory: z.boolean(),
  printOnOffer: z.boolean(),
  printOnInvoiceCpd: z.boolean(),
  printOnSalaryCpd: z.boolean(),
  printOnContract: z.boolean(),
  status: Status,
};

export const payrollConcepts = crudRoutes({
  path: '/payroll-concepts',
  table: 'payroll_concepts',
  name: 'PayrollConcept',
  tag: 'Conceptos de nómina',
  names: { one: 'el concepto', many: 'los conceptos' },
  schema: z.object({ ...base, ...conceptFields }).openapi('PayrollConcept'),
  fields: conceptFields,
  required: ['code', 'name'],
  // numeric llega como texto: se convierte a número para la API.
  columns: `id, code, name, description, concept_type, calculation, default_value::float8 as default_value,
    calculation_base, is_salary, is_mandatory, print_on_offer, print_on_invoice_cpd, print_on_salary_cpd,
    print_on_contract, status, created_at, updated_at`,
  permission: PERMISSION,
  search: ['code', 'name'],
  filters: { conceptType: ConceptType.optional() },
  where: (tx, q) => (q.conceptType ? [tx`concept_type = ${q.conceptType}`] : []),
});
