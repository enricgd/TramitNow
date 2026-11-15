// Datos de la cabecera (Header.tsx): la ETT activa, la sucursal y el usuario (de la sesión), el buscador
// global y los avisos (de sus repositorios). La cabecera solo pinta: aquí se carga, se guarda y se traduce
// de la forma de la API a la de la pantalla.
import { useCallback, useEffect, useState } from 'react';
import { repos, useData, type AppNotification, type SearchResult } from '../data';
import { useSesion, type SucursalActiva } from '../sesion';

export type TipoResultado = 'peticion' | 'candidato' | 'cliente' | 'presupuesto';
export type Resultado = { id: string; tipo: TipoResultado; titulo: string; detalle: string; estado?: string; ruta?: string };

export type TipoAviso = 'urgente' | 'pendiente' | 'correcto' | 'info';
export type Aviso = { id: string; tipo: TipoAviso; titulo: string; texto: string; hace: string; leido: boolean; ruta?: string };

const TIPO_RESULTADO: Record<SearchResult['type'], TipoResultado> = {
  request: 'peticion',
  candidate: 'candidato',
  client: 'cliente',
  quote: 'presupuesto',
};

const TIPO_AVISO: Record<AppNotification['kind'], TipoAviso> = {
  urgent: 'urgente',
  pending: 'pendiente',
  success: 'correcto',
  info: 'info',
};

/** «Hace 10 min», «Hace 3 h», «Ayer», «Hace 2 días». */
export function haceCuanto(iso: string, ahora = Date.now()) {
  const minutos = Math.max(0, Math.round((ahora - new Date(iso).getTime()) / 60_000));
  if (minutos < 1) return 'Ahora mismo';
  if (minutos < 60) return `Hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'Ayer' : `Hace ${dias} días`;
}

function siglas(nombre: string) {
  const palabras = nombre.replace(/,.*$/, '').split(/\s+/).filter((p) => /^[A-ZÁÉÍÓÚÑ]/.test(p));
  return (palabras.length > 1 ? palabras[0][0] + palabras[1][0] : nombre.slice(0, 2)).toUpperCase();
}

export type EttActiva = {
  cargando: boolean;
  /** Mensaje para mostrar si no se ha podido cargar. */
  error?: string;
  reintentar: () => void;
  ett?: { siglas: string; nombre: string };
  /** ETT a las que puede cambiar (si hay más de una, la cabecera muestra el selector). */
  etts: { id: string; nombre: string }[];
  ettId?: string;
  cambiarEtt: (id: string) => Promise<void>;
  sucursales: { id: string; nombre: string }[];
  sucursal: SucursalActiva;
  cambiarSucursal: (id: SucursalActiva) => void;
  usuario?: { nombre: string; rol: string; email: string };
};

export function useEttActiva(): EttActiva {
  const { me, loading, error, reload, sucursal, cambiarSucursal, cambiarEtt } = useSesion();
  const tenant = me?.activeTenant;
  return {
    cargando: loading,
    error: error?.message,
    reintentar: reload,
    ett: tenant ? { siglas: siglas(tenant.tradeName || tenant.legalName), nombre: tenant.legalName } : undefined,
    etts: (me?.tenants ?? []).map((t) => ({ id: t.id, nombre: t.legalName })),
    ettId: tenant?.id,
    cambiarEtt,
    sucursales: (me?.branches ?? []).map((b) => ({ id: b.id, nombre: b.name })),
    sucursal,
    cambiarSucursal,
    usuario: me ? { nombre: me.user.fullName, rol: me.role?.name ?? (me.isSuperadmin ? 'Superadmin' : ''), email: me.user.email ?? '' } : undefined,
  };
}

/**
 * Resultados del buscador global para `busqueda` (a partir de 2 letras). `respuesta.busqueda` dice a qué
 * búsqueda corresponden: mientras no coincida con la escrita, se está cargando.
 */
export function useBusqueda(busqueda: string) {
  const [respuesta, setRespuesta] = useState<{ busqueda: string; resultados: Resultado[] }>({ busqueda: '', resultados: [] });
  const [error, setError] = useState<string>();
  const { data: recientes = [] } = useData((r) => r.search.recent(), []);

  useEffect(() => {
    if (busqueda.length < 2) return;
    let actual = true;
    // Espera a que deje de escribir antes de buscar.
    const t = setTimeout(() => {
      repos.search.query(busqueda).then(
        (resultados) => {
          if (!actual) return;
          setError(undefined);
          setRespuesta({
            busqueda,
            resultados: resultados.map((r) => ({
              id: r.id,
              tipo: TIPO_RESULTADO[r.type],
              titulo: r.title,
              detalle: r.detail,
              estado: r.status ?? undefined,
              ruta: r.route ?? undefined,
            })),
          });
        },
        (e) => {
          if (!actual) return;
          setError(e?.message ?? 'No se ha podido buscar');
          setRespuesta({ busqueda, resultados: [] });
        },
      );
    }, 200);
    return () => {
      actual = false;
      clearTimeout(t);
    };
  }, [busqueda]);

  return { respuesta, recientes, error, deEjemplo: !!repos.search.sample };
}

export function useAvisos() {
  const { data, reload } = useData((r) => r.notifications.list(), []);
  // Copia local para marcar como leído al momento, sin esperar a la API.
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  useEffect(() => {
    if (!data) return;
    const ahora = Date.now();
    setAvisos(
      data.map((a) => ({
        id: a.id,
        tipo: TIPO_AVISO[a.kind],
        titulo: a.title,
        texto: a.text,
        hace: haceCuanto(a.createdAt, ahora),
        leido: a.read,
        ruta: a.route ?? undefined,
      })),
    );
  }, [data]);

  const marcarLeido = useCallback(
    (id: string) => {
      setAvisos((lista) => lista.map((a) => (a.id === id ? { ...a, leido: true } : a)));
      repos.notifications.markRead(id).catch(reload);
    },
    [reload],
  );

  const marcarTodos = useCallback(() => {
    setAvisos((lista) => lista.map((a) => ({ ...a, leido: true })));
    repos.notifications.markAllRead().catch(reload);
  }, [reload]);

  return { avisos, marcarLeido, marcarTodos, deEjemplo: !!repos.notifications.sample };
}
