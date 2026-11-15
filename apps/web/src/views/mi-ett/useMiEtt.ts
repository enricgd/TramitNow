// Datos de Mi ETT (FichaEttView.jsx): carga, guardado y traducción entre la forma de la API y la de la pantalla.
// La vista solo recibe datos y funciones; no sabe si vienen de apps/api o de los datos de ejemplo (modo demo).
//
// - Sociedades, sucursales, direcciones, roles y usuarios: repositorios con API (companies, branches,
//   addresses, roles, memberships).
// - Lo demás (datos legales de ETT, facturación, CCC, servicios, plantillas, portales, actividad,
//   invitaciones): `ettSettings`, que aún no tiene API. En modo real `ajustes` es null y la vista lo muestra
//   como «Disponible próximamente».
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  repos,
  useData,
  type Address,
  type AddressInput,
  type Branch,
  type Company,
  type CompanyType,
  type EttContributionAccount,
  type EttPortals,
  type EttService,
  type EttSettings,
  type Membership,
  type Province,
  type Repositories,
  type Role,
} from '../../data';
import { useSesion } from '../../sesion';

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
  /** 'active' o, si no, el texto del estado. */
  status: string;
  statusLabel: string;
  lastLogin: string;
  esInvitacion: boolean;
};

const TIPOS_SOCIEDAD: Record<CompanyType, string> = {
  ett: 'Empresa de trabajo temporal',
  services: 'Servicios',
  merchandising: 'Merchandising',
  other: 'Otra',
};

const ESTADOS_USUARIO: Record<Membership['status'], string> = { active: 'Activo', blocked: 'Bloqueado', inactive: 'Inactivo' };

const NO_DISPONIBLE = (que: string) => new ApiError(501, 'no_disponible', `Disponible próximamente: ${que} aún no está en la API.`);

/** Texto para mostrar de un error de la API, con el detalle de los campos si lo hay. */
export function mensajeError(e: unknown): string {
  if (e instanceof ApiError) {
    const campos = e.details?.map((d) => `${d.path}: ${d.message}`).join('; ');
    return campos ? `${e.message} (${campos})` : e.message;
  }
  return e instanceof Error ? e.message : String(e);
}

const fechaCorta = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const vacioANull = (texto: string | undefined) => (texto?.trim() ? texto.trim() : null);

// ---------------------------------------------------------------------------
// Direcciones: la pantalla usa texto libre (dirección, CP, localidad, provincia); la API, códigos oficiales.
// ---------------------------------------------------------------------------

type DireccionVista = { address: string; postalCode: string; city: string; province: string; country: string };

let provinciasCache: Promise<Province[]> | undefined;
const provincias = () => (provinciasCache ??= repos.catalogs.provinces().catch((e) => ((provinciasCache = undefined), Promise.reject(e))));

// Los nombres de municipio no cambian: se piden una vez por sesión.
const municipios = new Map<string, Promise<string | undefined>>();
const nombreMunicipio = (r: Repositories, code: string) => {
  if (!municipios.has(code)) municipios.set(code, r.catalogs.municipality(code).then((m) => m.name, () => (municipios.delete(code), undefined)));
  return municipios.get(code)!;
};

function textoCalle(a: Address) {
  const calle = [a.streetType, a.street].filter(Boolean).join(' ');
  return `${calle}${a.number ? ` ${a.number}` : ''}${a.door ? `, ${a.door}` : ''}`;
}

async function direccionVista(r: Repositories, a: Address | undefined, todas: Province[]): Promise<DireccionVista> {
  if (!a) return { address: '', postalCode: '', city: '', province: '', country: '' };
  const municipio = a.municipalityCode ? await nombreMunicipio(r, a.municipalityCode) : undefined;
  return {
    address: textoCalle(a),
    postalCode: a.postalCode ?? '',
    city: municipio ?? a.city ?? '',
    province: todas.find((p) => p.code === a.provinceCode)?.name ?? '',
    country: a.countryCode === 'ES' ? 'España' : a.countryCode,
  };
}

/**
 * Guarda la dirección escrita en la pantalla. La provincia sale del código postal (sus dos primeras cifras
 * son el código INE de la provincia) o del nombre; la localidad se busca en el catálogo de municipios y,
 * si no se encuentra una sola, se guarda como texto. Devuelve el id de la dirección (nueva o la misma).
 */
async function guardarDireccion(actual: Address | undefined, d: Omit<DireccionVista, 'country'>): Promise<string | null> {
  const antes = actual ? { address: textoCalle(actual), postalCode: actual.postalCode ?? '' } : undefined;
  const texto = d.address.trim();
  const cp = d.postalCode.trim();
  const ciudad = d.city.trim();
  if (!texto && !cp && !ciudad) return actual?.id ?? null;

  let provinceCode: string | null = /^\d{5}$/.test(cp) ? cp.slice(0, 2) : null;
  if (!provinceCode && d.province.trim()) {
    provinceCode = (await provincias()).find((p) => normalizar(p.name) === normalizar(d.province))?.code ?? null;
  }
  let municipalityCode: string | null = null;
  let city: string | null = ciudad || null;
  if (ciudad.length >= 2) {
    const encontrados = await repos.catalogs.municipalities(provinceCode ? { provinceCode, q: ciudad } : { q: ciudad });
    const exactos = encontrados.filter((m) => normalizar(m.name) === normalizar(ciudad));
    if (exactos.length === 1) {
      municipalityCode = exactos[0].code;
      provinceCode = exactos[0].provinceCode;
      city = null;
    }
  }

  // Si la calle no ha cambiado, se conservan tipo de vía, número y puerta tal como estaban.
  const calle: AddressInput =
    actual && antes?.address === texto
      ? {}
      : { streetType: null, street: texto || null, number: null, door: null };
  const data: AddressInput = { ...calle, postalCode: cp || null, city, municipalityCode, provinceCode, countryCode: 'ES' };
  if (actual) {
    await repos.addresses.update(actual.id, data);
    return actual.id;
  }
  return (await repos.addresses.create(data)).id;
}

/** Si se ha creado una dirección para un registro que luego no se ha podido guardar, se borra. */
async function quitarDireccionNueva(nueva: string | null | undefined, anterior: string | null | undefined) {
  if (nueva && nueva !== anterior) await repos.addresses.remove(nueva).catch(() => {});
}

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
  /** null si aún no hay API (modo real). */
  ajustes: EttSettings | null;
};

async function cargar(r: Repositories): Promise<Carga> {
  const [sociedades, sucursales, roles, miembros, ajustes, todasProvincias] = await Promise.all([
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
    ajustes,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMiEtt() {
  const { me } = useSesion();
  const { data, loading, error, reload } = useData(cargar, []);
  const [sociedadElegida, setSociedadElegida] = useState<string>();

  // Borradores de lo que se edita en la propia tabla (servicios) o formulario (portales) antes de «Guardar».
  const [servicios, setServicios] = useState<EttService[]>([]);
  const [portales, setPortales] = useState<EttPortals | null>(null);
  const [actividad, setActividad] = useState<EttSettings['activity']>([]);
  useEffect(() => {
    setServicios(data?.ajustes?.services ?? []);
    setPortales(data?.ajustes?.portals ?? null);
    setActividad(data?.ajustes?.activity ?? []);
  }, [data]);

  const ajustes = data?.ajustes ?? null;
  const sucursalesActivas = useMemo(() => (data?.sucursales ?? []).filter((b) => b.status === 'active'), [data]);

  // La sociedad que se ve: la elegida, la de la sucursal por defecto o la primera de tipo ETT.
  const sociedad: Company | undefined = useMemo(() => {
    const todas = data?.sociedades ?? [];
    const porDefecto = sucursalesActivas.find((b) => b.isDefault)?.companyId;
    return (
      todas.find((c) => c.id === sociedadElegida) ??
      todas.find((c) => c.id === porDefecto) ??
      todas.find((c) => c.companyType === 'ett') ??
      todas[0]
    );
  }, [data, sociedadElegida, sucursalesActivas]);

  const company = useMemo(() => {
    if (!data || !sociedad) return undefined;
    const dir = (sociedad.addressId && data.vistasDireccion[sociedad.addressId]) || { address: '', postalCode: '', city: '', province: '', country: '' };
    const { nombreComercial, formaJuridica, ...legal } = ajustes?.legal ?? ({} as Partial<EttSettings['legal']>);
    return {
      id: sociedad.id,
      legalName: sociedad.name,
      tradeName: nombreComercial ?? me?.activeTenant?.tradeName ?? '',
      cif: sociedad.taxId ?? '',
      companyType: formaJuridica ?? TIPOS_SOCIEDAD[sociedad.companyType],
      ...dir,
      country: dir.country || 'España',
      phone: sociedad.phone ?? '',
      email: sociedad.email ?? '',
      web: sociedad.website ?? '',
      logoUrl: null,
      lastUpdated: `Actualizado el ${fechaCorta(sociedad.updatedAt)}`,
      ...legal,
      ...(ajustes?.billing ?? {}),
    };
  }, [data, sociedad, ajustes, me]);

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
    const miembros = data.miembros.map((m): UsuarioVista => {
      const extra = ajustes?.users[m.id];
      const [branch, branchValue] = alcance(m.contexts, m.role.scope);
      return {
        id: m.id,
        name: m.fullName,
        email: extra?.email ?? '',
        role: m.role.name,
        roleId: m.role.id,
        department: extra?.departamento ?? '—',
        branch,
        branchValue,
        status: m.status === 'active' ? 'active' : m.status,
        statusLabel: ESTADOS_USUARIO[m.status],
        lastLogin: extra?.ultimoAcceso ?? '',
        esInvitacion: false,
      };
    });
    const invitaciones = (ajustes?.invitations ?? []).map((i): UsuarioVista => ({
      id: i.id,
      name: i.name,
      email: i.email,
      role: data.roles.find((r) => r.id === i.roleId)?.name ?? '',
      roleId: i.roleId,
      department: '—',
      branch: i.branchId === '*' ? 'Todas' : i.branchId ? nombreSucursal(i.branchId) : 'Sin asignar',
      branchValue: i.branchId ?? '',
      status: 'pending',
      statusLabel: 'Invitación pendiente',
      lastLogin: 'Nunca',
      esInvitacion: true,
    }));
    return [...miembros, ...invitaciones];
  }, [data, ajustes, nombreSucursal]);

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
   * Datos fiscales: los de la sociedad van a la API (nombre, CIF, contacto y dirección); los de ETT (registro,
   * representante, garantía...), a `ettSettings`, si está disponible. `valores` usa las claves de `company`.
   */
  const guardarFiscal = useCallback(
    async (valores: Record<string, string>) => {
      if (!sociedad || !data) return;
      if ('legalName' in valores && !valores.legalName.trim()) {
        throw new ApiError(400, 'validacion', 'La razón social es obligatoria');
      }
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

      if (['address', 'postalCode', 'city', 'province'].some((k) => k in valores) && company) {
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
          throw e;
        });
      }

      if (ajustes) {
        const legal = { ...ajustes.legal };
        for (const clave of Object.keys(legal) as (keyof typeof legal)[]) {
          const origen = clave === 'nombreComercial' ? 'tradeName' : clave === 'formaJuridica' ? 'companyType' : clave;
          if (origen in valores) legal[clave] = valores[origen];
        }
        await repos.ettSettings.update({ legal });
      }
      reload();
    },
    [sociedad, data, company, ajustes, reload],
  );

  const guardarFacturacion = useCallback(
    async (valores: Partial<EttSettings['billing']>) => {
      await actualizarAjustes({ billing: { ...ajustes!.billing, ...valores } }, 'la facturación de la ETT');
      reload();
    },
    [actualizarAjustes, ajustes, reload],
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
    async (fila: EttContributionAccount) => {
      const lista = ajustes?.contributionAccounts ?? [];
      const nueva = fila.id ? lista.map((c) => (c.id === fila.id ? fila : c)) : [...lista, { ...fila, id: `ccc-${Date.now()}` }];
      await actualizarAjustes({ contributionAccounts: nueva }, 'los CCC');
      reload();
    },
    [ajustes, actualizarAjustes, reload],
  );

  const eliminarCcc = useCallback(
    async (id: string) => {
      await actualizarAjustes({ contributionAccounts: (ajustes?.contributionAccounts ?? []).filter((c) => c.id !== id) }, 'los CCC');
      reload();
    },
    [ajustes, actualizarAjustes, reload],
  );

  /** Guarda el borrador de servicios (sin los que no tienen nombre). */
  const guardarServicios = useCallback(async () => {
    const lista = servicios.filter((x) => x.nombre.trim()).map(({ nuevo: _nuevo, ...x }: EttService & { nuevo?: boolean }) => x);
    await actualizarAjustes({ services: lista }, 'los servicios');
    reload();
  }, [servicios, actualizarAjustes, reload]);

  const guardarPortales = useCallback(async () => {
    if (portales) await actualizarAjustes({ portals: portales }, 'la configuración de los portales');
    reload();
  }, [portales, actualizarAjustes, reload]);

  type DatosUsuario = { name: string; email: string; roleId: string; branchValue: ValorSucursal };

  const invitarUsuario = useCallback(
    async (u: DatosUsuario) => {
      const invitacion = { id: `inv-${Date.now()}`, name: u.name, email: u.email, roleId: u.roleId, branchId: u.branchValue || null, createdAt: new Date().toISOString() };
      await actualizarAjustes({ invitations: [...(ajustes?.invitations ?? []), invitacion] }, 'invitar usuarios');
      reload();
    },
    [ajustes, actualizarAjustes, reload],
  );

  /** Solo las invitaciones pendientes: cambiar el rol o las sucursales de un usuario aún no está en la API. */
  const guardarUsuario = useCallback(
    async (id: string, u: DatosUsuario) => {
      const invitaciones = ajustes?.invitations ?? [];
      if (!invitaciones.some((i) => i.id === id)) throw NO_DISPONIBLE('cambiar el rol o las sucursales de un usuario');
      await actualizarAjustes(
        { invitations: invitaciones.map((i) => (i.id === id ? { ...i, name: u.name, email: u.email, roleId: u.roleId, branchId: u.branchValue || null } : i)) },
        'invitar usuarios',
      );
      reload();
    },
    [ajustes, actualizarAjustes, reload],
  );

  return {
    /** 'cargando' solo la primera vez: al recargar tras guardar se siguen viendo los datos. */
    estado: data ? ('listo' as const) : loading ? ('cargando' as const) : ('error' as const),
    error: error ? mensajeError(error) : undefined,
    reintentar: reload,
    /** Lo que aún no tiene API está disponible (modo demo). */
    hayAjustes: !!ajustes,
    company,
    sociedades: (data?.sociedades ?? []).filter((c) => c.status === 'active').map((c): SociedadVista => ({ id: c.id, code: c.code, name: c.name, tipo: TIPOS_SOCIEDAD[c.companyType] })),
    sociedadId: sociedad?.id,
    elegirSociedad: setSociedadElegida,
    branches,
    users,
    errorUsuarios: data?.errorMiembros,
    roles: data?.roles ?? [],
    ccc: ajustes?.contributionAccounts ?? [],
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
    guardarSucursal,
    desactivarSucursal,
    guardarCcc,
    eliminarCcc,
    guardarServicios,
    guardarPortales,
    invitarUsuario,
    guardarUsuario,
  };
}
