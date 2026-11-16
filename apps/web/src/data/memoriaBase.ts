// Ayudas de los repositorios en memoria (memoria.ts, memoriaEmpresas.ts): se comportan como la API
// (paginación, errores, copias de los datos) para que las pantallas funcionen igual en los dos modos.
import { ApiError, type Page, type PageQuery } from './tipos';

export const NOW = '2026-10-27T10:00:00.000Z';
export const stamp = { createdAt: NOW, updatedAt: NOW };
export const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

let nextId = 1000;
/** Id para lo que se crea en la demo. */
export const newId = () => id(nextId++);

// Un poco de espera, para que se vean los estados de carga como con la API.
export const delay = <T>(value: T, ms = 150) => new Promise<T>((resolve) => setTimeout(() => resolve(structuredClone(value)), ms));

export function page<T>(items: T[], query: PageQuery = {}): Promise<Page<T>> {
  const { limit = 50, offset = 0 } = query;
  return delay({ data: items.slice(offset, offset + limit), pagination: { limit, offset, total: items.length } });
}

export function find<T extends { id: string }>(items: T[], itemId: string): T {
  const item = items.find((x) => x.id === itemId);
  if (!item) throw new ApiError(404, 'no_encontrado', 'No existe o no tienes acceso');
  return item;
}

export function matches(text: string | undefined, ...fields: (string | null | undefined)[]) {
  if (!text) return true;
  const needle = text.toLowerCase();
  return fields.some((f) => f?.toLowerCase().includes(needle));
}

export function checkUniqueCode<T extends { id: string; code: string }>(items: T[], code: string, exceptId?: string) {
  if (items.some((x) => x.code === code && x.id !== exceptId)) {
    throw new ApiError(409, 'conflicto', `Ya existe otro con el código ${code}`);
  }
}

export const touch = <T extends { updatedAt: string }>(item: T, data: object) =>
  Object.assign(item, data, { updatedAt: new Date().toISOString() });
