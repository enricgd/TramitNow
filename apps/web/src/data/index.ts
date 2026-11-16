// Punto de entrada de la capa de datos para las pantallas:
//
//   import { repos, useData } from '../data';
//   const { data: branches, loading, error, reload } = useData((r) => r.branches.list(), []);
//   await repos.branches.update(id, { phone });
//
// En modo demo (`npm run dev`) los datos son de ejemplo y en memoria; si no, vienen de apps/api.
import { useCallback, useEffect, useState, type DependencyList } from 'react';
import { DEMO } from '../modo';
import { apiRepositories } from './api';
import { memoryRepositories } from './memoria';
import type { Repositories } from './repositorios';
import { ApiError } from './tipos';

export * from './tipos';
export type { Repositories } from './repositorios';

export const repos: Repositories = DEMO ? memoryRepositories() : apiRepositories();

export type DataState<T> = {
  data: T | undefined;
  loading: boolean;
  error: ApiError | undefined;
  reload: () => void;
};

/** Carga datos al montar la pantalla (y cuando cambian `deps`). `reload()` vuelve a pedirlos tras guardar. */
export function useData<T>(load: (r: Repositories) => Promise<T>, deps: DependencyList): DataState<T> {
  const [state, setState] = useState<Omit<DataState<T>, 'reload'>>({ data: undefined, loading: true, error: undefined });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let current = true;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    load(repos).then(
      (data) => current && setState({ data, loading: false, error: undefined }),
      (e) =>
        current &&
        setState((s) => ({
          ...s,
          loading: false,
          error: e instanceof ApiError ? e : new ApiError(0, 'error_interno', String(e?.message ?? e)),
        })),
    );
    return () => {
      current = false;
    };
  }, [...deps, version]);

  return { ...state, reload };
}
