// Sesión de trabajo: el usuario, la ETT activa y sus sucursales (GET /v1/me, o los datos de ejemplo en modo
// demo), y la sucursal con la que está trabajando. Se carga una vez para toda la app (Root.tsx) y cualquier
// pantalla la lee con useSesion().
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { repos, useData, type ApiError, type Me } from './data';

const CLAVE_SUCURSAL = 'tramitnow.sucursal';

/** Sucursal elegida en la cabecera: un id de me.branches, o null para todas las que ve el usuario. */
export type SucursalActiva = string | null;

export type Sesion = {
  me: Me | undefined;
  loading: boolean;
  error: ApiError | undefined;
  reload: () => void;
  sucursal: SucursalActiva;
  cambiarSucursal: (id: SucursalActiva) => void;
  /** Cambia la ETT activa y recarga la app con el token nuevo. */
  cambiarEtt: (tenantId: string) => Promise<void>;
};

const SesionContext = createContext<Sesion | null>(null);

function leerSucursal(): SucursalActiva {
  try {
    return localStorage.getItem(CLAVE_SUCURSAL);
  } catch {
    return null;
  }
}

export function SesionProvider({ children }: { children: ReactNode }) {
  const { data: me, loading, error, reload } = useData((r) => r.session.me(), []);
  const [elegida, setElegida] = useState<SucursalActiva>(leerSucursal);

  const cambiarSucursal = useCallback((id: SucursalActiva) => {
    setElegida(id);
    try {
      if (id) localStorage.setItem(CLAVE_SUCURSAL, id);
      else localStorage.removeItem(CLAVE_SUCURSAL);
    } catch {
      // Sin almacenamiento (modo privado): solo dura hasta recargar.
    }
  }, []);

  const cambiarEtt = useCallback(async (tenantId: string) => {
    await repos.session.changeTenant(tenantId);
    cambiarSucursal(null);
    window.location.reload();
  }, [cambiarSucursal]);

  // Si la sucursal guardada ya no es de las que ve (otra ETT, otro usuario), se vuelve a todas.
  const sucursal = me && elegida && me.branches.some((b) => b.id === elegida) ? elegida : null;

  return (
    <SesionContext.Provider value={{ me, loading, error, reload, sucursal, cambiarSucursal, cambiarEtt }}>
      {children}
    </SesionContext.Provider>
  );
}

export function useSesion(): Sesion {
  const sesion = useContext(SesionContext);
  if (!sesion) throw new Error('useSesion necesita <SesionProvider> (ver Root.tsx)');
  return sesion;
}
