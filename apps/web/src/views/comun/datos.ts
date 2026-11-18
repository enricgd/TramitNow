// Ayudas comunes de los hooks de pantalla (useMiEtt, useEmpresas...): mensajes de error, fechas y direcciones.
// Traducen entre la forma de la API y la de las pantallas; las vistas no las usan directamente.
import { ApiError, repos, type Address, type AddressInput, type Province, type Repositories } from '../../data';

/** Texto para mostrar de un error de la API, con el detalle de los campos si lo hay. */
export function mensajeError(e: unknown): string {
  if (e instanceof ApiError) {
    // Un campo que la pantalla ya usa y la API todavía no tiene (la API rechaza las llaves que no conoce).
    const desconocidas = e.details?.map((d) => d.message.match(/^Llaves? desconocidas?: (.+)$/)?.[1]).filter(Boolean);
    if (desconocidas?.length) return `Disponible próximamente: la API aún no admite ${desconocidas.join(', ')}`;
    const campos = e.details?.map((d) => `${d.path}: ${d.message}`).join('; ');
    return campos ? `${e.message} (${campos})` : e.message;
  }
  return e instanceof Error ? e.message : String(e);
}

export const esError = (e: unknown, code: string) => e instanceof ApiError && e.code === code;

// Las fechas, con el formato único de la web (ui/formato.ts).
export { fecha as fechaCorta, fechaHora } from '../../ui/formato';
export const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
export const vacioANull = (texto: string | undefined | null) => (texto?.trim() ? texto.trim() : null);

// ---------------------------------------------------------------------------
// Direcciones: las pantallas usan texto libre (dirección, CP, localidad, provincia); la API, códigos oficiales.
// ---------------------------------------------------------------------------

export type DireccionVista = { address: string; postalCode: string; city: string; province: string; country: string };

/** País de la pantalla ↔ código ISO. «Otro» y los demás se guardan sin código de municipio. */
const PAISES: Record<string, string> = { España: 'ES', Portugal: 'PT', Francia: 'FR' };
export const codigoPais = (pais: string | undefined) => PAISES[pais ?? ''] ?? (pais && /^[A-Z]{2}$/.test(pais) ? pais : 'ES');
export const nombrePais = (codigo: string) => Object.entries(PAISES).find(([, c]) => c === codigo)?.[0] ?? 'Otro';

let provinciasCache: Promise<Province[]> | undefined;
export const provincias = () =>
  (provinciasCache ??= repos.catalogs.provinces().catch((e) => ((provinciasCache = undefined), Promise.reject(e))));

// Los nombres de municipio no cambian: se piden una vez por sesión.
const municipios = new Map<string, Promise<string | undefined>>();
export const nombreMunicipio = (r: Repositories, code: string) => {
  if (!municipios.has(code)) municipios.set(code, r.catalogs.municipality(code).then((m) => m.name, () => (municipios.delete(code), undefined)));
  return municipios.get(code)!;
};

export function textoCalle(a: Address) {
  const calle = [a.streetType, a.street].filter(Boolean).join(' ');
  return `${calle}${a.number ? ` ${a.number}` : ''}${a.door ? `, ${a.door}` : ''}`;
}

export async function direccionVista(r: Repositories, a: Address | undefined, todas: Province[]): Promise<DireccionVista> {
  if (!a) return { address: '', postalCode: '', city: '', province: '', country: 'España' };
  const municipio = a.municipalityCode ? await nombreMunicipio(r, a.municipalityCode) : undefined;
  return {
    address: textoCalle(a),
    postalCode: a.postalCode ?? '',
    city: municipio ?? a.city ?? '',
    province: todas.find((p) => p.code === a.provinceCode)?.name ?? '',
    country: nombrePais(a.countryCode),
  };
}

/**
 * Guarda la dirección escrita en la pantalla. En España, la provincia sale del código postal (sus dos primeras
 * cifras son el código INE de la provincia) o del nombre, y la localidad se busca en el catálogo de municipios;
 * si no se encuentra una sola, se guarda como texto. Devuelve el id de la dirección (nueva o la misma).
 */
export async function guardarDireccion(
  actual: Address | undefined,
  d: Omit<DireccionVista, 'country'> & { country?: string },
): Promise<string | null> {
  const antes = actual ? { address: textoCalle(actual) } : undefined;
  const texto = d.address.trim();
  const cp = d.postalCode.trim();
  const ciudad = d.city.trim();
  const countryCode = codigoPais(d.country);
  if (!texto && !cp && !ciudad) return actual?.id ?? null;

  let provinceCode: string | null = null;
  let municipalityCode: string | null = null;
  let city: string | null = ciudad || null;
  if (countryCode === 'ES') {
    provinceCode = /^\d{5}$/.test(cp) ? cp.slice(0, 2) : null;
    if (!provinceCode && d.province.trim()) {
      provinceCode = (await provincias()).find((p) => normalizar(p.name) === normalizar(d.province))?.code ?? null;
    }
    if (ciudad.length >= 2) {
      const encontrados = await repos.catalogs.municipalities(provinceCode ? { provinceCode, q: ciudad } : { q: ciudad });
      const exactos = encontrados.filter((m) => normalizar(m.name) === normalizar(ciudad));
      if (exactos.length === 1) {
        municipalityCode = exactos[0].code;
        provinceCode = exactos[0].provinceCode;
        city = null;
      }
    }
  }

  // Si la calle no ha cambiado, se conservan tipo de vía, número y puerta tal como estaban.
  const calle: AddressInput =
    actual && antes?.address === texto ? {} : { streetType: null, street: texto || null, number: null, door: null };
  const data: AddressInput = { ...calle, postalCode: cp || null, city, municipalityCode, provinceCode, countryCode };
  if (actual) {
    await repos.addresses.update(actual.id, data);
    return actual.id;
  }
  return (await repos.addresses.create(data)).id;
}

/** Si se ha creado una dirección para un registro que luego no se ha podido guardar, se borra. */
export async function quitarDireccionNueva(nueva: string | null | undefined, anterior: string | null | undefined) {
  if (nueva && nueva !== anterior) await repos.addresses.remove(nueva).catch(() => {});
}
