// Datos de Mi ETT (FichaEttView.jsx): carga, guardado y traducción entre la forma de la API y la de la pantalla.
// La vista solo recibe datos y funciones; no sabe si vienen de apps/api o de los datos de ejemplo (modo demo).
//
// - Sociedades, sucursales, direcciones, usuarios (con alta e invitación), datos legales y facturación de cada
//   sociedad, series, CCC, servicios que factura la ETT y ajustes de presupuestos: repositorios con API.
// - Plantillas, portales, historial de Mi ETT y responsable de cada sucursal: `ettSettings`, que aún no tiene
//   API. En modo real `ajustes` es null y la vista lo muestra como «Disponible próximamente».
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  repos,
  useData,
  type Address,
  type AutonomousCommunity,
  type BillableService,
  type Branch,
  type CatalogItem,
  type CollectiveAgreement,
  type Company,
  type CompanyBillingSettings,
  type CompanyBillingSettingsInput,
  type CompanyLegal,
  type CompanyLegalInput,
  type CompanyType,
  type ContributionAccount,
  type EttPortals,
  type EttSettings,
  type GuaranteeType,
  type Membership,
  type MembershipContextInput,
  type NumberSeries,
  type Province,
  type Repositories,
  type Role,
  type TenantSettings,
} from '../../data';
import { useSesion } from '../../sesion';
export { mensajeError } from '../comun/datos';
import { direccionVista, fechaCorta, fechaHora, guardarDireccion, mensajeError, provincias, quitarDireccionNueva, vacioANull, type DireccionVista } from '../comun/datos';

// ---------------------------------------------------------------------------
// Forma de la pantalla
// ---------------------------------------------------------------------------

export type SociedadVista = { id: string; code: string; name: string; tipo: string };

export type SucursalVista = {
  id: string;
  companyId: string;
  sociedad: string;
  code: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
  /** undefined: aún no se guarda (modo real); null: sin asignar. */
  manager: string | null | undefined;
  /** Usuarios con esta sucursal en su alcance; «—» si no se pueden ver los usuarios. */
  activeUsers: number | string;
  /** Porcentaje de la ficha rellenado (teléfono, email y dirección). */
  completion: number;
  status: string;
  isHeadquarters: boolean;
};

/** Sucursal de un usuario: '*' todas, '' sin asignar, o el id de la sucursal. */
export type ValorSucursal = string;

export type UsuarioVista = {
  id: string;
  name: string;
  email: string;
  role: string;
  roleId: string;
  department: string;
  branch: string;
  branchValue: ValorSucursal;
  /** 'active', 'blocked', 'inactive' o 'pending' (invitación sin aceptar). */
  status: string;
  /** Estado de la membresía: active, blocked o inactive. */
  membershipStatus: Membership['status'];
  statusLabel: string;
  lastLogin: string;
  /** Invitado y aún sin aceptar: se puede volver a generar el enlace o revocar. */
  esInvitacion: boolean;
};

/** Fila de la tabla de CCC. */
export type CccVista = { id?: string; numero: string; provincia: string; tipo: string; sucursal: string; sucursalId: string };

/** Fila de la tabla de servicios. `cobro`: las claves de FORMAS_COBRO (serviciosDemo.js). */
export type ServicioVista = { id: string; nombre: string; cobro: string; valor: number; unidad: string; activo: boolean; nuevo?: boolean };

const TIPOS_SOCIEDAD: Record<CompanyType, string> = {
  ett: 'Empresa de trabajo temporal',
  services: 'Servicios',
  merchandising: 'Merchandising',
  other: 'Otra',
};

const ESTADOS_USUARIO: Record<Membership['status'], string> = { active: 'Activo', blocked: 'Bloqueado', inactive: 'Inactivo' };

const NO_DISPONIBLE = (que: string) => new ApiError(501, 'no_disponible', `Disponible próximamente: ${que} aún no está en la API.`);

export const TIPOS_GARANTIA: Record<GuaranteeType, string> = {
  bank_guarantee: 'Aval bancario',
  surety_insurance: 'Seguro de caución',
  cash_deposit: 'Depósito en efectivo',
  other: 'Otra',
};
export const TIPOS_DOCUMENTO = { dni: 'DNI', nie: 'NIE', passport: 'Pasaporte' } as const;

const TIPOS_CCC: Record<ContributionAccount['staffType'], string> = { mission: 'Personas en misión', structure: 'Personal de estructura' };
const COBROS: Record<string, BillableService['chargeMode']> = { porcentaje: 'percentage', persona: 'per_person', unidad: 'per_unit', fijo: 'fixed' };
const cobroVista = (modo: BillableService['chargeMode']) => Object.entries(COBROS).find(([, m]) => m === modo)?.[0] ?? 'fijo';

const euros = (n: number | null) => (n == null ? '' : `${n.toLocaleString('es-ES', { maximumFractionDigits: 2 })} €`);
const porcentaje = (n: number) => `${n.toLocaleString('es-ES', { maximumFractionDigits: 2 })} %`;
const ibanVista = (iban: string | null) => (iban ? iban.replace(/(.{4})/g, '$1 ').trim() : '');
const cccVista = (code: string) => `${code.slice(0, 2)} ${code.slice(2, 9)} ${code.slice(9)}`;
const numero = (texto: string | undefined) => {
  const limpio = (texto ?? '').replace(/[€%\s]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  return limpio === '' ? null : Number(limpio);
};
const AÑO = new Date().getFullYear();

// ---------------------------------------------------------------------------
// Carga
// ---------------------------------------------------------------------------

type Carga = {
  sociedades: Company[];
  sucursales: Branch[];
  direcciones: Record<string, Address>;
  vistasDireccion: Record<string, DireccionVista>;
  roles: Role[];
  /** null si el usuario no puede verlos (users.manage). */
  miembros: Membership[] | null;
  errorMiembros?: string;
  /** Por id de sociedad. */
  legales: Record<string, { legal: CompanyLegal; warnings: string[] }>;
  facturaciones: Record<string, CompanyBillingSettings>;
  series: NumberSeries[];
  cuentas: ContributionAccount[];
  servicios: BillableService[];
  presupuestos: TenantSettings;
  formasPago: CatalogItem[];
  convenios: CollectiveAgreement[];
  comunidades: AutonomousCommunity[];
  provincias: Province[];
  /** null si aún no hay API (modo real). */
  ajustes: EttSettings | null;
};

async function cargar(r: Repositories): Promise<Carga> {
  const [sociedades, sucursales, roles, miembros, ajustes, todasProvincias, series, cuentas, servicios, presupuestos, formasPago, convenios, comunidades] =
    await Promise.all([
      r.companies.list({ limit: 200 }).then((p) => p.data),
      r.branches.list({ limit: 200 }).then((p) => p.data),
      r.roles.list().catch(() => [] as Role[]),
      r.memberships.list({ limit: 200 }).then(
        (p) => ({ data: p.data as Membership[] | null, error: undefined as string | undefined }),
        (e) => ({ data: null, error: mensajeError(e) }),
      ),
      r.ettSettings.get().catch((e) => {
        if (e instanceof ApiError && e.code === 'no_disponible') return null;
        throw e;
      }),
      provincias().catch(() => [] as Province[]),
      r.numberSeries.list({ year: AÑO }),
      r.contributionAccounts.list({ limit: 200, status: 'active' }).then((p) => p.data),
      r.billableServices.list({ limit: 200 }).then((p) => p.data),
      r.tenantSettings.get(),
      r.catalogItems.list({ type: 'payment_method', status: 'active', limit: 200 }).then((p) => p.data),
      r.collectiveAgreements.list({ limit: 200 }).then((p) => p.data),
      r.catalogs.autonomousCommunities().catch(() => [] as AutonomousCommunity[]),
    ]);

  const activas = sociedades.filter((c) => c.status === 'active');
  const [legales, facturaciones] = await Promise.all([
    Promise.all(activas.map(async (c) => [c.id, await r.companyLegal.get(c.id)] as const)),
    Promise.all(activas.map(async (c) => [c.id, await r.companyBilling.get(c.id)] as const)),
  ]);

  const ids = [...new Set([...sociedades, ...sucursales].map((x) => x.addressId).filter((x): x is string => !!x))];
  const lista = await Promise.all(ids.map((id) => r.addresses.get(id).catch(() => undefined)));
  const direcciones = Object.fromEntries(lista.filter((a): a is Address => !!a).map((a) => [a.id, a]));
  const vistas = await Promise.all(ids.map(async (id) => [id, await direccionVista(r, direcciones[id], todasProvincias)] as const));

  return {
    sociedades,
    sucursales,
    direcciones,
    vistasDireccion: Object.fromEntries(vistas),
    roles,
    miembros: miembros.data,
    errorMiembros: miembros.error,
    legales: Object.fromEntries(legales),
    facturaciones: Object.fromEntries(facturaciones),
    series,
    cuentas,
    servicios,
    presupuestos,
    formasPago,
    convenios,
    comunidades,
    provincias: todasProvincias,
    ajustes,
  };
}

// Campos de los datos legales: clave de la pantalla → campo de la API.
const CAMPOS_LEGALES: [string, keyof CompanyLegalInput][] = [
  ['tradeName', 'tradeName'],
  ['companyType', 'legalForm'],
  ['cnae', 'cnaeCode'],
  ['convenioId', 'staffAgreementId'],
  ['autorizacion', 'ettAuthorizationNumber'],
  ['fechaAutorizacion', 'ettAuthorizationDate'],
  ['ambitoAutorizacion', 'ettAuthorizationScope'],
  ['comunidadAutorizacion', 'ettAuthorizationCommunityCode'],
  ['registroMercantil', 'commercialRegistry'],
  ['tomo', 'registryVolume'],
  ['folio', 'registryFolio'],
  ['hoja', 'registrySheet'],
  ['inscripcion', 'registryEntry'],
  ['representante', 'legalRepName'],
  ['representanteTipoDoc', 'legalRepIdType'],
  ['representanteDni', 'legalRepIdNumber'],
  ['representanteCargo', 'legalRepPosition'],
  ['mutua', 'mutualInsurer'],
  ['servicioPrevencion', 'preventionService'],
  ['redAutorizacion', 'redAuthorization'],
  ['garantiaTipoId', 'guaranteeType'],
  ['garantiaEntidad', 'guaranteeEntity'],
  ['garantiaImporte', 'guaranteeAmount'],
  ['garantiaVence', 'guaranteeExpiresOn'],
  ['certificadoTitular', 'certificateHolder'],
  ['certificadoEmisor', 'certificateIssuer'],
  ['certificadoCaduca', 'certificateExpiresOn'],
];

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMiEtt() {
  const { me } = useSesion();
  const { data, loading, error, reload } = useData(cargar, []);
  const [sociedadElegida, setSociedadElegida] = useState<string>();

  // Borradores de lo que se edita en la propia tabla (servicios) o formulario (portales) antes de «Guardar».
  const [servicios, setServicios] = useState<ServicioVista[]>([]);
  const [portales, setPortales] = useState<EttPortals | null>(null);
  const [actividad, setActividad] = useState<EttSettings['activity']>([]);
  useEffect(() => {
    setServicios(
      (data?.servicios ?? []).map((x) => ({ id: x.id, nombre: x.name, cobro: cobroVista(x.chargeMode), valor: x.defaultValue, unidad: x.unit, activo: x.status === 'active' })),
    );
    setPortales(data?.ajustes?.portals ?? null);
    setActividad(data?.ajustes?.activity ?? []);
  }, [data]);

  const ajustes = data?.ajustes ?? null;
  const sucursalesActivas = useMemo(() => (data?.sucursales ?? []).filter((b) => b.status === 'active'), [data]);

  // La sociedad que se ve: la elegida, la de la sucursal por defecto o la primera de tipo ETT.
  const sociedad: Company | undefined = useMemo(() => {
    const todas = (data?.sociedades ?? []).filter((c) => c.status === 'active');
    const porDefecto = sucursalesActivas.find((b) => b.isDefault)?.companyId;
    return (
      todas.find((c) => c.id === sociedadElegida) ??
      todas.find((c) => c.id === porDefecto) ??
      todas.find((c) => c.companyType === 'ett') ??
      todas[0]
    );
  }, [data, sociedadElegida, sucursalesActivas]);

  const legal = sociedad ? data?.legales[sociedad.id]?.legal : undefined;
  const facturacion = sociedad ? data?.facturaciones[sociedad.id] : undefined;
  const serieDe = useCallback(
    (kind: NumberSeries['documentKind']) =>
      data?.series.find((x) => x.documentKind === kind && x.companyId === sociedad?.id && !x.branchId) ??
      data?.series.find((x) => x.documentKind === kind && !x.companyId && !x.branchId),
    [data, sociedad],
  );

  const company = useMemo(() => {
    if (!data || !sociedad) return undefined;
    const dir = (sociedad.addressId && data.vistasDireccion[sociedad.addressId]) || { address: '', postalCode: '', city: '', province: '', country: '' };
    const l = legal;
    const f = facturacion;
    const facturas = serieDe('invoice');
    const rectificativas = serieDe('credit_note');
    return {
      id: sociedad.id,
      legalName: sociedad.name,
      tradeName: l?.tradeName ?? (sociedad.companyType === 'ett' ? me?.activeTenant?.tradeName : null) ?? '',
      cif: sociedad.taxId ?? '',
      companyType: l?.legalForm ?? TIPOS_SOCIEDAD[sociedad.companyType],
      ...dir,
      country: dir.country || 'España',
      phone: sociedad.phone ?? '',
      email: sociedad.email ?? '',
      web: sociedad.website ?? '',
      logoUrl: null,
      lastUpdated: `Actualizado el ${fechaCorta([sociedad.updatedAt, l?.updatedAt, f?.updatedAt].filter((x): x is string => !!x).sort().at(-1)!)}`,

      // Datos legales (vacíos si aún no se han rellenado).
      cnae: l?.cnaeCode ?? '',
      convenioId: l?.staffAgreementId ?? '',
      convenio: data.convenios.find((a) => a.id === l?.staffAgreementId)?.name ?? '',
      autorizacion: l?.ettAuthorizationNumber ?? '',
      fechaAutorizacion: l?.ettAuthorizationDate ?? '',
      ambitoAutorizacion: l?.ettAuthorizationScope ?? '',
      comunidadAutorizacion: l?.ettAuthorizationCommunityCode ?? '',
      ambitoAutorizacionTexto:
        l?.ettAuthorizationScope === 'regional'
          ? `Autonómica${l.ettAuthorizationCommunityCode ? ` (${data.comunidades.find((c) => c.code === l.ettAuthorizationCommunityCode)?.name ?? l.ettAuthorizationCommunityCode})` : ''}`
          : l?.ettAuthorizationScope === 'state'
            ? 'Estatal'
            : '',
      registroMercantil: l?.commercialRegistry ?? '',
      tomo: l?.registryVolume ?? '',
      folio: l?.registryFolio ?? '',
      hoja: l?.registrySheet ?? '',
      inscripcion: l?.registryEntry ?? '',
      representante: l?.legalRepName ?? '',
      representanteTipoDoc: l?.legalRepIdType ?? 'dni',
      representanteDni: l?.legalRepIdNumber ?? '',
      representanteCargo: l?.legalRepPosition ?? '',
      mutua: l?.mutualInsurer ?? '',
      servicioPrevencion: l?.preventionService ?? '',
      redAutorizacion: l?.redAuthorization ?? '',
      garantiaTipoId: l?.guaranteeType ?? '',
      garantiaTipo: l?.guaranteeType ? TIPOS_GARANTIA[l.guaranteeType] : '',
      garantiaEntidad: l?.guaranteeEntity ?? '',
      garantiaImporte: euros(l?.guaranteeAmount ?? null),
      garantiaImporteNumero: l?.guaranteeAmount == null ? '' : String(l.guaranteeAmount),
      garantiaVence: l?.guaranteeExpiresOn ?? '',
      certificadoTitular: l?.certificateHolder ?? '',
      certificadoEmisor: l?.certificateIssuer ?? '',
      certificadoCaduca: l?.certificateExpiresOn ?? '',

      // Facturación.
      billingSeries: facturas?.prefix ?? '',
      proximaFactura: facturas?.nextFormatted ?? '',
      proximaFacturaNumero: facturas?.nextNumber ?? 1,
      invoicePrefix: rectificativas?.prefix ?? '',
      proximaRectificativa: rectificativas?.nextFormatted ?? '',
      proximaRectificativaNumero: rectificativas?.nextNumber ?? 1,
      vatRate: f ? porcentaje(f.vatRate) : '',
      vatRateNumero: f?.vatRate ?? 21,
      withholdingRate: f ? porcentaje(f.withholdingRate) : '',
      withholdingRateNumero: f?.withholdingRate ?? 0,
      iban: ibanVista(f?.iban ?? null),
      swiftBic: f?.swiftBic ?? '',
      paymentMethodId: f?.paymentMethodId ?? '',
      paymentMethod: data.formasPago.find((x) => x.id === f?.paymentMethodId)?.name ?? '',
      paymentTerms: f?.paymentTerms ?? '',
      currency: f?.currency ?? 'EUR',
      adminEmail: f?.billingEmail ?? '',
      billingBranchMode: f?.branchMode ?? 'centralized',
    };
  }, [data, sociedad, legal, facturacion, serieDe, me]);

  const nombreSucursal = useCallback((id: string) => data?.sucursales.find((b) => b.id === id)?.name ?? 'Sucursal desconocida', [data]);

  const branches: SucursalVista[] = useMemo(() => {
    if (!data) return [];
    return sucursalesActivas.map((b) => {
      const dir = b.addressId ? data.vistasDireccion[b.addressId] : undefined;
      const rellenos = [b.phone, b.email, b.addressId].filter(Boolean).length;
      return {
        id: b.id,
        companyId: b.companyId,
        sociedad: data.sociedades.find((c) => c.id === b.companyId)?.name ?? '',
        code: b.code,
        name: b.name,
        address: dir?.address ?? '',
        postalCode: dir?.postalCode ?? '',
        city: dir?.city ?? '',
        phone: b.phone ?? '',
        email: b.email ?? '',
        manager: ajustes ? (ajustes.branchManagers[b.id] ?? null) : undefined,
        activeUsers: data.miembros
          ? data.miembros.filter((m) => m.status === 'active' && m.contexts.some((c) => c.branchId === b.id)).length
          : '—',
        completion: Math.round(((2 + rellenos) / 5) * 100),
        status: b.status,
        isHeadquarters: b.isDefault,
      };
    });
  }, [data, sucursalesActivas, ajustes]);

  const users: UsuarioVista[] = useMemo(() => {
    if (!data?.miembros) return [];
    // Un rol de alcance «tenant» (administrador, laboral) ve todas las sucursales aunque no tenga contextos.
    const alcance = (contexts: { branchId: string | null }[], scope: Membership['role']['scope']): [string, ValorSucursal] => {
      if (scope === 'tenant') return ['Todas', '*'];
      if (contexts.length === 0) return ['Sin asignar', ''];
      if (contexts.some((c) => c.branchId === null)) return ['Todas', '*'];
      const ids = contexts.map((c) => c.branchId!);
      // Con varias, el selector del cajón muestra la primera.
      return [ids.map(nombreSucursal).join(', '), ids[0]];
    };
    return data.miembros.map((m): UsuarioVista => {
      const [branch, branchValue] = alcance(m.contexts, m.role.scope);
      const pendiente = m.invitationPending && m.status === 'active';
      return {
        id: m.id,
        name: m.fullName || m.email || '',
        email: m.email ?? '',
        role: m.role.name,
        roleId: m.role.id,
        department: m.department || '—',
        branch,
        branchValue,
        status: pendiente ? 'pending' : m.status,
        membershipStatus: m.status,
        statusLabel: pendiente ? 'Invitación pendiente' : ESTADOS_USUARIO[m.status],
        lastLogin: m.lastSignInAt ? fechaHora(m.lastSignInAt) : 'Nunca',
        esInvitacion: m.invitationPending,
      };
    });
  }, [data, nombreSucursal]);

  const ccc: CccVista[] = useMemo(() => {
    if (!data || !sociedad) return [];
    return data.cuentas
      .filter((c) => c.companyId === sociedad.id)
      .map((c) => ({
        id: c.id,
        numero: cccVista(c.code),
        provincia: data.provincias.find((p) => p.code === c.provinceCode)?.name ?? c.provinceCode,
        tipo: TIPOS_CCC[c.staffType],
        sucursal: c.branchId ? nombreSucursal(c.branchId) : 'Toda la sociedad',
        sucursalId: c.branchId ?? '',
      }));
  }, [data, sociedad, nombreSucursal]);

  // ---- Guardar ------------------------------------------------------------

  const actualizarAjustes = useCallback(
    async (parte: Partial<EttSettings>, que: string) => {
      if (!ajustes) throw NO_DISPONIBLE(que);
      await repos.ettSettings.update(parte);
    },
    [ajustes],
  );

  /** Apunta un cambio en la actividad (solo mientras la actividad sea de ejemplo: la real la llevará la API). */
  const registrar = useCallback(
    (action: string, type = 'system') => {
      if (!ajustes) return;
      const lista = [
        { id: `act-${Date.now()}`, timestamp: 'Ahora mismo', user: `${me?.user.fullName ?? 'Tú'} (tú)`, action, type },
        ...actividad,
      ];
      setActividad(lista);
      repos.ettSettings.update({ activity: lista }).catch(() => {});
    },
    [ajustes, actividad, me],
  );

  /**
   * Datos fiscales: los de la sociedad (nombre, CIF, contacto y dirección) y sus datos legales (registro,
   * representante, garantía...). `valores` usa las claves de `company`; solo se envía lo que ha cambiado.
   */
  const guardarFiscal = useCallback(
    async (valores: Record<string, string>) => {
      if (!sociedad || !data || !company) return;
      if ('legalName' in valores && !valores.legalName.trim()) {
        throw new ApiError(400, 'validacion', 'La razón social es obligatoria');
      }

      // Datos legales primero: si no son válidos (p. ej. el DNI del representante), no se cambia nada más.
      const legales: CompanyLegalInput = {};
      for (const [clave, campo] of CAMPOS_LEGALES) {
        if (!(clave in valores)) continue;
        const texto = valores[clave].trim();
        const antes = String(company[clave as keyof typeof company] ?? '');
        if (clave === 'garantiaImporte') {
          const n = numero(texto);
          if (n !== null && Number.isNaN(n)) throw new ApiError(400, 'validacion', 'El importe de la garantía no es un número');
          if (n !== (legal?.guaranteeAmount ?? null)) legales.guaranteeAmount = n;
          continue;
        }
        if (clave === 'cnae' && texto && !/^\d{4}$/.test(texto)) throw new ApiError(400, 'validacion', 'El CNAE es una clase de 4 cifras, por ejemplo 7820');
        if (texto !== antes) Object.assign(legales, { [campo]: texto || null });
      }
      if (legales.ettAuthorizationScope !== undefined && legales.ettAuthorizationScope !== 'regional') legales.ettAuthorizationCommunityCode = null;
      if ((legales.ettAuthorizationScope ?? legal?.ettAuthorizationScope) === 'regional' && !(valores.comunidadAutorizacion ?? company.comunidadAutorizacion)) {
        throw new ApiError(400, 'validacion', 'Indica la comunidad autónoma de la autorización');
      }
      // El tipo de documento va con el número (si no, la API no puede comprobar la letra).
      if (legales.legalRepIdNumber && !legal?.legalRepIdType && legales.legalRepIdType === undefined) {
        legales.legalRepIdType = (valores.representanteTipoDoc || 'dni') as CompanyLegal['legalRepIdType'];
      }
      if (Object.keys(legales).length) await repos.companyLegal.save(sociedad.id, legales);

      const cambios: Partial<Company> = {};
      const campos: [keyof typeof valores, keyof Company][] = [
        ['legalName', 'name'],
        ['cif', 'taxId'],
        ['phone', 'phone'],
        ['email', 'email'],
        ['web', 'website'],
      ];
      for (const [clave, campo] of campos) {
        if (!(clave in valores)) continue;
        const nuevo = campo === 'name' ? valores[clave].trim() : vacioANull(valores[clave]);
        if (nuevo !== sociedad[campo]) Object.assign(cambios, { [campo]: nuevo });
      }

      if (['address', 'postalCode', 'city', 'province'].some((k) => k in valores)) {
        const cambiada = ['address', 'postalCode', 'city', 'province'].some(
          (k) => k in valores && (valores[k] ?? '').trim() !== String(company[k as keyof typeof company] ?? ''),
        );
        if (cambiada) {
          const actual = sociedad.addressId ? data.direcciones[sociedad.addressId] : undefined;
          const addressId = await guardarDireccion(actual, {
            address: valores.address ?? company.address,
            postalCode: valores.postalCode ?? company.postalCode,
            city: valores.city ?? company.city,
            province: valores.province ?? company.province,
          });
          if (addressId !== sociedad.addressId) cambios.addressId = addressId;
        }
      }
      if (Object.keys(cambios).length) {
        await repos.companies.update(sociedad.id, cambios).catch(async (e) => {
          await quitarDireccionNueva(cambios.addressId, sociedad.addressId);
          reload();
          throw e;
        });
      }
      reload();
    },
    [sociedad, data, company, legal, reload],
  );

  /**
   * Facturación de la sociedad y sus series de facturas y rectificativas de este año. `valores` usa las claves
   * de `company`; `paymentMethodId` 'otro' crea la forma de pago `customPaymentMethod` en la tabla maestra.
   */
  const guardarFacturacion = useCallback(
    async (valores: Record<string, string>) => {
      if (!sociedad || !company) return;
      const f = facturacion;
      const cambios: CompanyBillingSettingsInput = {};
      const texto = (k: string) => (valores[k] ?? '').trim();

      if ('iban' in valores && texto('iban').replace(/\s/g, '') !== (f?.iban ?? '')) cambios.iban = texto('iban') || null;
      if ('swiftBic' in valores && texto('swiftBic') !== (f?.swiftBic ?? '')) cambios.swiftBic = texto('swiftBic') || null;
      if ('paymentTerms' in valores && texto('paymentTerms') !== (f?.paymentTerms ?? '')) cambios.paymentTerms = texto('paymentTerms') || null;
      if ('adminEmail' in valores && texto('adminEmail') !== (f?.billingEmail ?? '')) cambios.billingEmail = texto('adminEmail') || null;
      if ('billingBranchMode' in valores && valores.billingBranchMode !== (f?.branchMode ?? 'centralized')) {
        cambios.branchMode = valores.billingBranchMode as CompanyBillingSettings['branchMode'];
      }
      for (const [clave, campo] of [['vatRate', 'vatRate'], ['withholdingRate', 'withholdingRate']] as const) {
        if (!(clave in valores)) continue;
        const n = numero(valores[clave]);
        if (n === null || Number.isNaN(n) || n < 0 || n > 100) throw new ApiError(400, 'validacion', `${clave === 'vatRate' ? 'El IVA' : 'La retención'} tiene que ser un porcentaje entre 0 y 100`);
        if (n !== (f?.[campo] ?? (campo === 'vatRate' ? 21 : 0))) cambios[campo] = n;
      }
      if ('paymentMethodId' in valores) {
        let metodo = valores.paymentMethodId || null;
        if (metodo === 'otro') {
          const nombre = texto('customPaymentMethod');
          if (!nombre) throw new ApiError(400, 'validacion', 'Escribe la forma de pago');
          metodo = (await repos.catalogItems.create({ type: 'payment_method', name: nombre })).id;
        }
        if (metodo !== (f?.paymentMethodId ?? null)) cambios.paymentMethodId = metodo;
      }

      // Series: prefijo y número por el que sigue (nunca hacia atrás: la API responde 409).
      for (const [kind, prefijo, siguiente] of [
        ['invoice', 'billingSeries', 'proximaFacturaNumero'],
        ['credit_note', 'invoicePrefix', 'proximaRectificativaNumero'],
      ] as const) {
        if (!(prefijo in valores) && !(siguiente in valores)) continue;
        const actual = serieDe(kind);
        const prefix = prefijo in valores ? texto(prefijo) : undefined;
        const n = siguiente in valores ? Number(texto(siguiente)) : undefined;
        if (n !== undefined && (!Number.isInteger(n) || n < 1)) throw new ApiError(400, 'validacion', 'El próximo número tiene que ser un entero mayor que 0');
        if (actual && (actual.companyId === sociedad.id || !actual.companyId) && actual.year === AÑO) {
          const patch = {
            ...(prefix !== undefined && prefix !== actual.prefix ? { prefix } : {}),
            ...(n !== undefined && n !== actual.nextNumber ? { nextNumber: n } : {}),
          };
          if (Object.keys(patch).length) await repos.numberSeries.update(actual.id, patch);
        } else if (prefix || n) {
          await repos.numberSeries.create({ documentKind: kind, year: AÑO, companyId: sociedad.id, ...(prefix ? { prefix } : {}), ...(n ? { nextNumber: n } : {}) });
        }
      }

      if (Object.keys(cambios).length) await repos.companyBilling.save(sociedad.id, cambios);
      reload();
    },
    [sociedad, company, facturacion, serieDe, reload],
  );

  const guardarPresupuestos = useCallback(
    async (valores: { margenMinimo: string; diasSinRespuesta: string }) => {
      const margen = numero(valores.margenMinimo);
      if (margen !== null && Number.isNaN(margen)) throw new ApiError(400, 'validacion', 'El margen mínimo tiene que ser un porcentaje');
      const dias = Number(valores.diasSinRespuesta);
      if (!Number.isInteger(dias) || dias < 1 || dias > 365) throw new ApiError(400, 'validacion', 'Los días sin respuesta van de 1 a 365');
      await repos.tenantSettings.update({ quoteMinMarginPercent: margen, quoteNoResponseDays: dias });
      reload();
    },
    [reload],
  );

  /** Crea (id null) o edita una sucursal. `valores` usa las claves de SucursalVista, más `companyId` al crearla. */
  const guardarSucursal = useCallback(
    async (id: string | null, valores: Partial<Record<keyof SucursalVista, string | boolean>>) => {
      if (!data) return;
      const texto = (k: keyof SucursalVista) => String(valores[k] ?? '').trim();
      if (!texto('name')) throw new ApiError(400, 'validacion', 'Introduce el nombre de la sucursal');
      if (!texto('code')) throw new ApiError(400, 'validacion', 'Introduce el código de la sucursal');
      const actual = id ? data.sucursales.find((b) => b.id === id) : undefined;
      const vista = id ? branches.find((b) => b.id === id) : undefined;
      const dirActual = actual?.addressId ? data.direcciones[actual.addressId] : undefined;

      let addressId = actual?.addressId ?? null;
      const dirCambiada = !vista || texto('address') !== vista.address || texto('city') !== vista.city;
      if (dirCambiada) {
        addressId = await guardarDireccion(dirActual, { address: texto('address'), postalCode: dirActual?.postalCode ?? '', city: texto('city'), province: '' });
      }
      const campos = {
        code: texto('code'),
        name: texto('name'),
        phone: vacioANull(texto('phone')),
        email: vacioANull(texto('email')),
        ...(valores.isHeadquarters ? { isDefault: true } : {}),
        ...(addressId !== (actual?.addressId ?? null) ? { addressId } : {}),
      };
      const guardada = await (actual
        ? repos.branches.update(actual.id, campos)
        : repos.branches.create({ ...campos, companyId: String(valores.companyId || sociedad?.id) })
      ).catch(async (e) => {
        await quitarDireccionNueva(addressId, actual?.addressId);
        throw e;
      });

      if (ajustes && 'manager' in valores) {
        await repos.ettSettings.update({ branchManagers: { ...ajustes.branchManagers, [guardada.id]: texto('manager') } });
      }
      reload();
      return guardada;
    },
    [data, branches, sociedad, ajustes, reload],
  );

  const desactivarSucursal = useCallback(
    async (id: string) => {
      await repos.branches.update(id, { status: 'inactive' });
      reload();
    },
    [reload],
  );

  const guardarCcc = useCallback(
    async (fila: CccVista) => {
      if (!sociedad) return;
      const datos = {
        code: fila.numero.replace(/\D/g, ''),
        staffType: (Object.entries(TIPOS_CCC).find(([, t]) => t === fila.tipo)?.[0] ?? 'mission') as ContributionAccount['staffType'],
        branchId: fila.sucursalId || null,
      };
      if (fila.id) await repos.contributionAccounts.update(fila.id, datos);
      else await repos.contributionAccounts.create({ ...datos, companyId: sociedad.id });
      reload();
    },
    [sociedad, reload],
  );

  const eliminarCcc = useCallback(
    async (id: string) => {
      await repos.contributionAccounts.remove(id);
      reload();
    },
    [reload],
  );

  /** Guarda el borrador de servicios: crea los nuevos (sin los que no tienen nombre) y cambia los editados. */
  const guardarServicios = useCallback(async () => {
    const originales = new Map((data?.servicios ?? []).map((x) => [x.id, x]));
    const usados = new Set((data?.servicios ?? []).map((x) => x.code));
    const codigo = (nombre: string) => {
      const base = nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 26) || 'SERVICIO';
      let c = base;
      for (let i = 2; usados.has(c); i++) c = `${base}_${i}`;
      usados.add(c);
      return c;
    };
    for (const x of servicios) {
      if (!x.nombre.trim()) {
        if (x.nuevo) continue;
        throw new ApiError(400, 'validacion', 'Todos los servicios necesitan un nombre');
      }
      const campos = {
        name: x.nombre.trim(),
        chargeMode: COBROS[x.cobro] ?? 'fixed',
        defaultValue: Number(x.valor) || 0,
        unit: x.unidad.trim() || 'servicio',
        status: x.activo ? ('active' as const) : ('inactive' as const),
      };
      const antes = originales.get(x.id);
      if (!antes) await repos.billableServices.create({ ...campos, code: codigo(campos.name) });
      else if ((Object.keys(campos) as (keyof typeof campos)[]).some((k) => campos[k] !== antes[k])) await repos.billableServices.update(x.id, campos);
    }
    reload();
  }, [servicios, data, reload]);

  const guardarPortales = useCallback(async () => {
    if (portales) await actualizarAjustes({ portals: portales }, 'la configuración de los portales');
    reload();
  }, [portales, actualizarAjustes, reload]);

  type DatosUsuario = { name: string; email: string; roleId: string; branchValue: ValorSucursal; department: string; status?: Membership['status'] };

  /** Alcance de la pantalla ('*' todas, '' ninguna o una sucursal) → contextos de la API. */
  const contextos = useCallback(
    (valor: ValorSucursal): MembershipContextInput[] => {
      if (!data) return [];
      if (valor === '*') return data.sociedades.filter((c) => c.status === 'active').map((c) => ({ companyId: c.id, branchId: null, isDefault: c.id === sociedad?.id }));
      if (!valor) return [];
      const b = data.sucursales.find((x) => x.id === valor);
      return b ? [{ companyId: b.companyId, branchId: b.id }] : [];
    },
    [data, sociedad],
  );

  /** Da de alta e invita. Devuelve el enlace para enviarlo a mano (null si ya tenía cuenta en TramitNOW). */
  const invitarUsuario = useCallback(
    async (u: DatosUsuario) => {
      const creado = await repos.memberships.create({
        email: u.email.trim(),
        fullName: u.name.trim(),
        roleId: u.roleId,
        department: vacioANull(u.department),
        contexts: contextos(u.branchValue),
      });
      reload();
      return { url: creado.inviteUrl, existingUser: creado.existingUser, nombre: creado.membership.fullName, email: creado.membership.email ?? u.email };
    },
    [contextos, reload],
  );

  /** Rol, departamento, estado y sucursal. El alcance solo se envía si ha cambiado (sustituye todo el que hubiera). */
  const guardarUsuario = useCallback(
    async (id: string, u: DatosUsuario) => {
      const actual = users.find((x) => x.id === id);
      const departamento = vacioANull(u.department);
      await repos.memberships.update(id, {
        ...(u.roleId !== actual?.roleId ? { roleId: u.roleId } : {}),
        ...(departamento !== (actual?.department === '—' ? null : actual?.department ?? null) ? { department: departamento } : {}),
        ...(u.status && u.status !== actual?.membershipStatus ? { status: u.status } : {}),
        ...(u.branchValue !== actual?.branchValue ? { contexts: contextos(u.branchValue) } : {}),
      });
      reload();
    },
    [users, contextos, reload],
  );

  const reenviarInvitacion = useCallback(
    async (id: string) => {
      const { inviteUrl } = await repos.memberships.resendInvitation(id);
      reload();
      return inviteUrl;
    },
    [reload],
  );

  const revocarInvitacion = useCallback(
    async (id: string) => {
      await repos.memberships.revokeInvitation(id);
      reload();
    },
    [reload],
  );

  return {
    /** 'cargando' solo la primera vez: al recargar tras guardar se siguen viendo los datos. */
    estado: data ? ('listo' as const) : loading ? ('cargando' as const) : ('error' as const),
    error: error ? mensajeError(error) : undefined,
    reintentar: reload,
    /** Plantillas, portales, historial y responsables de sucursal (sin API todavía) disponibles (modo demo). */
    hayAjustes: !!ajustes,
    company,
    /** Avisos de la API: garantía o certificado vencidos o a punto de vencer. */
    avisosLegales: sociedad ? (data?.legales[sociedad.id]?.warnings ?? []) : [],
    sociedades: (data?.sociedades ?? []).filter((c) => c.status === 'active').map((c): SociedadVista => ({ id: c.id, code: c.code, name: c.name, tipo: TIPOS_SOCIEDAD[c.companyType] })),
    sociedadId: sociedad?.id,
    elegirSociedad: setSociedadElegida,
    branches,
    users,
    errorUsuarios: data?.errorMiembros,
    roles: data?.roles ?? [],
    ccc,
    convenios: (data?.convenios ?? []).filter((a) => a.status === 'active' || a.id === legal?.staffAgreementId).map((a) => ({ id: a.id, name: a.name })),
    comunidades: data?.comunidades ?? [],
    formasPago: (data?.formasPago ?? []).map((x) => ({ id: x.id, name: x.name })),
    presupuestos: {
      margenMinimo: data?.presupuestos.quoteMinMarginPercent == null ? '' : String(data.presupuestos.quoteMinMarginPercent),
      diasSinRespuesta: String(data?.presupuestos.quoteNoResponseDays ?? 15),
    },
    templates: ajustes?.templates ?? [],
    activity: actividad,
    servicios,
    setServicios,
    portales,
    portalesGuardados: ajustes?.portals ?? null,
    setPortales,
    registrar,
    guardarFiscal,
    guardarFacturacion,
    guardarPresupuestos,
    guardarSucursal,
    desactivarSucursal,
    guardarCcc,
    eliminarCcc,
    guardarServicios,
    guardarPortales,
    invitarUsuario,
    guardarUsuario,
    reenviarInvitacion,
    revocarInvitacion,
  };
}
