import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type RefObject } from 'react';
import {
  Search,
  SearchX,
  Bell,
  HelpCircle,
  LogOut,
  Loader2,
  History,
  X,
  Inbox,
  Users,
  Building2,
  Calculator,
  AlertTriangle,
  FileSignature,
  CheckCircle2,
  Info,
  CheckCheck,
  Settings,
  BookOpen,
  Keyboard,
  Sparkles,
  LifeBuoy,
  Activity,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { ROLE_LABELS } from './auth/session';
import type { CurrentUser } from './App';

// Datos de ejemplo del buscador. Cuando haya backend, la búsqueda irá a apps/api a través de un repositorio.
type TipoResultado = 'peticion' | 'candidato' | 'cliente' | 'presupuesto';
type Resultado = { id: string; tipo: TipoResultado; titulo: string; detalle: string; estado?: string; ruta?: string };

const INITIAL_BUSQUEDA: Resultado[] = [
  { id: 'p1', tipo: 'peticion', titulo: 'PET-2026-0049 · Operario/a de almacén · turno de tarde', detalle: 'Trans-Logística Ibérica Norte, S.L. · 0/3 cubiertas', estado: 'En selección', ruta: 'peticiones' },
  { id: 'p2', tipo: 'peticion', titulo: 'PET-2026-0047 · Camarero/a de barra · turno de noche', detalle: 'Hostelería & Eventos Premium BCN, S.L. · 0/3 cubiertas', estado: 'Nueva', ruta: 'peticiones' },
  { id: 'p3', tipo: 'peticion', titulo: 'PET-2026-0048 · Operario/a de almacén · turno de mañana', detalle: 'Trans-Logística Ibérica Norte, S.L. · 5/5 cubiertas', estado: 'Cubierta', ruta: 'peticiones' },
  { id: 'c1', tipo: 'candidato', titulo: 'Mamadou Diallo', detalle: 'NIE X0000000T · Operario/a de almacén · PET-2026-0048', estado: 'Bloqueado', ruta: 'laboral' },
  { id: 'c2', tipo: 'candidato', titulo: 'Unai García Zabaleta', detalle: 'DNI 00000131Q · Carretillero/a · PET-2026-0050', estado: 'En incorporación', ruta: 'laboral' },
  { id: 'c3', tipo: 'candidato', titulo: 'Ainhoa Larrazabal Urkijo', detalle: 'DNI 00000127N · Operario/a de almacén · PET-2026-0048', estado: 'En incorporación', ruta: 'laboral' },
  { id: 'c4', tipo: 'candidato', titulo: 'Iker Agirrebeitia Mendia', detalle: 'DNI 00000130S · Operario/a de almacén · PET-2026-0048', estado: 'En incorporación', ruta: 'laboral' },
  { id: 'e1', tipo: 'cliente', titulo: 'Trans-Logística Ibérica Norte, S.L.', detalle: 'CIF B-87654321 · Basauri (Bizkaia) · 2 peticiones en selección' },
  { id: 'e2', tipo: 'cliente', titulo: 'Hostelería & Eventos Premium BCN, S.L.', detalle: 'CIF B-99887766 · Barcelona · 1 petición en curso y 3 por empezar' },
  { id: 'b1', tipo: 'presupuesto', titulo: 'PRE-2026-0042 v1 · Campaña logística otoño HUB central', detalle: 'Trans-Logística Ibérica Norte, S.L. · 105.792,00 €', estado: 'Aceptado' },
  { id: 'b2', tipo: 'presupuesto', titulo: 'PRE-2026-0045 v1 · Operarios/as soldadura y mecanizado metal 24/7', detalle: 'Manufacturas Metálicas del Henares, S.A. · 64.512,00 €', estado: 'Enviado' },
];

const GRUPOS: { tipo: TipoResultado; titulo: string; icon: LucideIcon }[] = [
  { tipo: 'peticion', titulo: 'Peticiones', icon: Inbox },
  { tipo: 'candidato', titulo: 'Candidatos', icon: Users },
  { tipo: 'cliente', titulo: 'Empresas', icon: Building2 },
  { tipo: 'presupuesto', titulo: 'Presupuestos', icon: Calculator },
];

const BUSQUEDAS_RECIENTES = ['PET-2026-0048', 'Mendoza', 'Distribuciones Cantábrico'];

// Mismos colores que el resto de la app: emerald = correcto, amber = pendiente, blue = informativo.
const ESTADO_COLOR: Record<string, string> = {
  'En selección': 'bg-blue-50 text-blue-700 border-blue-200',
  Nueva: 'bg-amber-50 text-amber-700 border-amber-200',
  Cubierta: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'En misión': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'En incorporación': 'bg-blue-50 text-blue-700 border-blue-200',
  Bloqueado: 'bg-rose-50 text-rose-700 border-rose-200',
  Disponible: 'bg-blue-50 text-blue-700 border-blue-200',
  Aceptado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Enviado: 'bg-amber-50 text-amber-700 border-amber-200',
};

type TipoAviso = 'urgente' | 'pendiente' | 'correcto' | 'info';
type Aviso = { id: string; tipo: TipoAviso; titulo: string; texto: string; hace: string; leido: boolean; ruta?: string };

const INITIAL_AVISOS: Aviso[] = [
  { id: 'a1', tipo: 'urgente', titulo: 'NIE caducado: Mamadou Diallo', texto: 'Bloquea el contrato en PET-2026-0048. Pide el documento renovado.', hace: 'Hace 10 min', leido: false, ruta: 'laboral' },
  { id: 'a2', tipo: 'pendiente', titulo: '3 CPD pendientes de firma de la empresa', texto: 'PET-2026-0048 y PET-2026-0050', hace: 'Hace 1 h', leido: false, ruta: 'laboral' },
  { id: 'a3', tipo: 'correcto', titulo: 'Presupuesto PRE-2026-0042 aceptado', texto: 'Trans-Logística Ibérica Norte, S.L. Ya se han creado sus 3 peticiones.', hace: 'Hace 3 h', leido: false, ruta: 'peticiones' },
  { id: 'a4', tipo: 'info', titulo: '12 candidaturas nuevas desde portales', texto: 'PET-2026-0049 · Operario/a de almacén · turno de tarde', hace: 'Ayer', leido: true, ruta: 'peticiones' },
  { id: 'a5', tipo: 'info', titulo: 'Mantenimiento programado', texto: 'Domingo de 02:00 a 04:00. La app no estará disponible.', hace: 'Hace 2 días', leido: true },
];

const AVISO_ESTILO: Record<TipoAviso, { icon: LucideIcon; color: string }> = {
  urgente: { icon: AlertTriangle, color: 'bg-rose-50 text-rose-600' },
  pendiente: { icon: FileSignature, color: 'bg-amber-50 text-amber-600' },
  correcto: { icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
  info: { icon: Info, color: 'bg-blue-50 text-blue-600' },
};

const ATAJOS: { teclas: string[]; texto: string }[] = [
  { teclas: ['Ctrl', 'K'], texto: 'Buscar en toda la app' },
  { teclas: ['↑', '↓'], texto: 'Moverse por los resultados' },
  { teclas: ['Enter'], texto: 'Abrir el resultado marcado' },
  { teclas: ['Esc'], texto: 'Cerrar buscador, menús y ventanas' },
  { teclas: ['?'], texto: 'Ver estos atajos' },
];

function initials(name: string) {
  const parts = name.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
}

// Quita acentos y mayúsculas para comparar ("cantabrico" encuentra "Cantábrico"). Conserva la longitud.
function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function useCerrarAlSalir(ref: RefObject<HTMLElement | null>, abierto: boolean, cerrar: () => void) {
  useEffect(() => {
    if (!abierto) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cerrar();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && cerrar();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [ref, abierto, cerrar]);
}

// La ETT y la sucursal siguen siendo de ejemplo hasta que apps/api dé los datos de la ETT activa.
export default function Header({ user, onSignOut }: { user: CurrentUser; onSignOut: () => void }) {
  const [buscadorMovil, setBuscadorMovil] = useState(false);
  const [atajos, setAtajos] = useState(false);

  // "?" abre los atajos, salvo cuando se está escribiendo en un campo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) && !t.isContentEditable) setAtajos(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between gap-3 shrink-0 z-30 shadow-xs relative">
      <div className="flex items-center gap-5 min-w-0">
        <a href="#/inicio" title="Inicio" className="shrink-0">
          <img src="/logo-tramitnow.svg" alt="TramitNow" className="h-6 w-auto" />
        </a>

        <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg min-w-0">
          <div className="w-5 h-5 rounded bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">EG</div>
          <div className="text-xs font-medium text-slate-700 truncate">ETT Global Servicios Temporales, S.L.</div>
          <span className="text-[10px] bg-slate-200 text-slate-600 px-1 rounded shrink-0">Delegación Norte</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Buscador movil={buscadorMovil} onCerrarMovil={() => setBuscadorMovil(false)} />
        <BotonIcono titulo="Buscar" className="md:hidden" onClick={() => setBuscadorMovil(true)}>
          <Search className="w-4 h-4" />
        </BotonIcono>
        <MenuAvisos />
        <MenuAyuda onAtajos={() => setAtajos(true)} />

        <div className="flex items-center gap-2 pl-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-semibold">
            {initials(user.name)}
          </div>
          <div className="hidden lg:block text-left leading-tight" title={user.email}>
            <div className="text-xs font-semibold text-slate-800">{user.name}</div>
            <div className="text-[10px] text-slate-400">{ROLE_LABELS[user.role] ?? user.role}</div>
          </div>
          <BotonIcono titulo="Cerrar sesión" onClick={onSignOut}>
            <LogOut className="w-4 h-4" />
          </BotonIcono>
        </div>
      </div>

      {atajos && <VentanaAtajos onCerrar={() => setAtajos(false)} />}
    </header>
  );
}

function BotonIcono({
  titulo,
  activo,
  className = '',
  onClick,
  children,
}: {
  titulo: string;
  activo?: boolean;
  className?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      onClick={onClick}
      className={`relative p-2 rounded-lg transition-colors ${
        activo ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
      } ${className}`}
    >
      {children}
    </button>
  );
}

function Tecla({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded border border-slate-200 bg-white text-[10px] font-sans font-medium text-slate-500 shadow-xs">
      {children}
    </kbd>
  );
}

function Resaltado({ texto, busqueda }: { texto: string; busqueda: string }) {
  const i = normalizar(texto).indexOf(normalizar(busqueda));
  if (!busqueda || i < 0) return <>{texto}</>;
  return (
    <>
      {texto.slice(0, i)}
      <mark className="bg-amber-100 text-slate-900 rounded-sm">{texto.slice(i, i + busqueda.length)}</mark>
      {texto.slice(i + busqueda.length)}
    </>
  );
}

// Buscador global. Los resultados aparecen mientras se escribe (con una pequeña espera, como hará la API).
function Buscador({ movil, onCerrarMovil }: { movil: boolean; onCerrarMovil: () => void }) {
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);
  // Resultados junto a la búsqueda que los produjo: mientras no coincida con lo escrito, se está cargando.
  const [respuesta, setRespuesta] = useState<{ busqueda: string; resultados: Resultado[] }>({ busqueda: '', resultados: [] });
  const [marcado, setMarcado] = useState(0);
  const caja = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  const busqueda = texto.trim();
  const buscando = busqueda.length >= 2;
  const cargando = buscando && respuesta.busqueda !== busqueda;
  const resultados = respuesta.resultados;

  const cerrar = () => {
    setAbierto(false);
    campo.current?.blur();
    onCerrarMovil();
  };
  useCerrarAlSalir(caja, abierto || movil, cerrar);

  useEffect(() => {
    if (movil) campo.current?.focus();
  }, [movil]);

  // Ctrl+K (o Cmd+K) lleva al buscador desde cualquier pantalla.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        campo.current?.focus();
        setAbierto(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!buscando) return;
    const t = setTimeout(() => {
      const q = normalizar(busqueda);
      setRespuesta({ busqueda, resultados: INITIAL_BUSQUEDA.filter((r) => normalizar(`${r.titulo} ${r.detalle}`).includes(q)) });
      setMarcado(0);
    }, 350);
    return () => clearTimeout(t);
  }, [busqueda, buscando]);

  // Como mucho 3 por grupo, en el orden de GRUPOS; la lista plana sirve para moverse con las flechas.
  const grupos = useMemo(
    () =>
      GRUPOS.map((g) => {
        const todos = resultados.filter((r) => r.tipo === g.tipo);
        return { ...g, total: todos.length, items: todos.slice(0, 3) };
      }).filter((g) => g.total > 0),
    [resultados],
  );
  const lista = grupos.flatMap((g) => g.items);

  const abrir = (r: Resultado) => {
    if (r.ruta) window.location.hash = `#/${r.ruta}`;
    setTexto('');
    cerrar();
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (!buscando || cargando || lista.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMarcado((m) => (m + 1) % lista.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMarcado((m) => (m - 1 + lista.length) % lista.length);
    } else if (e.key === 'Enter') {
      abrir(lista[marcado]);
    }
  };

  return (
    <div
      ref={caja}
      className={
        movil
          ? 'fixed inset-x-0 top-0 z-40 bg-white p-2 shadow-lg border-b border-slate-200 md:static md:p-0 md:shadow-none md:border-0'
          : 'relative hidden md:block'
      }
    >
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-2.5 top-2 text-slate-400" />
          <input
            ref={campo}
            type="text"
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setAbierto(true);
            }}
            onFocus={() => setAbierto(true)}
            onKeyDown={onKeyDown}
            placeholder="Buscar petición, candidato, NIF, empresa..."
            className={`w-full bg-slate-50 pl-8 pr-14 py-1.5 text-xs rounded-lg border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
              movil ? '' : 'md:w-64 lg:w-80 lg:focus:w-96'
            }`}
          />
          <div className="absolute right-2 top-1.5 flex items-center gap-1">
            {cargando && <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />}
            {texto ? (
              <button type="button" title="Borrar" onClick={() => setTexto('')} className="p-0.5 rounded text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              !movil && (
                <span className="hidden lg:flex gap-0.5">
                  <Tecla>Ctrl</Tecla>
                  <Tecla>K</Tecla>
                </span>
              )
            )}
          </div>
        </div>
        {movil && (
          <button type="button" onClick={cerrar} className="md:hidden text-xs font-medium text-slate-500 px-2 py-1.5">
            Cancelar
          </button>
        )}
      </div>

      {(abierto || movil) && (
        <div
          className={`bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden text-xs ${
            movil ? 'mt-2' : 'absolute right-0 top-full mt-1.5 w-[30rem] z-40'
          }`}
        >
          <div className="max-h-[70vh] overflow-y-auto">
            {!buscando && <SinBusqueda onElegir={(t) => setTexto(t)} />}

            {buscando && cargando && resultados.length === 0 && <ResultadosCargando />}

            {buscando && !cargando && lista.length === 0 && (
              <div className="px-4 py-8 text-center">
                <SearchX className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="mt-2 text-sm font-medium text-slate-700">Sin resultados para «{busqueda}»</div>
                <div className="mt-1 text-slate-500">Prueba con el número de petición, el NIF o parte del nombre.</div>
              </div>
            )}

            {buscando && lista.length > 0 && (
              <div className={`py-1 transition-opacity ${cargando ? 'opacity-50' : ''}`}>
                {grupos.map((g) => (
                  <div key={g.tipo} className="py-1">
                    <div className="flex items-center justify-between px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <span>{g.titulo}</span>
                      {g.total > g.items.length && (
                        <button type="button" className="normal-case tracking-normal font-medium text-indigo-600 hover:underline">
                          Ver los {g.total}
                        </button>
                      )}
                    </div>
                    {g.items.map((r) => {
                      const i = lista.indexOf(r);
                      return (
                        <FilaResultado
                          key={r.id}
                          resultado={r}
                          icon={g.icon}
                          busqueda={busqueda}
                          marcado={i === marcado}
                          onMarcar={() => setMarcado(i)}
                          onAbrir={() => abrir(r)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="hidden md:flex items-center gap-3 px-3 py-2 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Tecla>↑</Tecla>
              <Tecla>↓</Tecla> moverse
            </span>
            <span className="flex items-center gap-1">
              <Tecla>Enter</Tecla> abrir
            </span>
            <span className="flex items-center gap-1">
              <Tecla>Esc</Tecla> cerrar
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function SinBusqueda({ onElegir }: { onElegir: (texto: string) => void }) {
  return (
    <div className="py-2">
      <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Búsquedas recientes</div>
      {BUSQUEDAS_RECIENTES.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onElegir(t)}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50"
        >
          <History className="w-3.5 h-3.5 text-slate-400" />
          {t}
        </button>
      ))}
      <div className="mx-3 mt-2 rounded-lg bg-slate-50 px-3 py-2 text-slate-500">
        Busca en peticiones, candidatos, empresas y presupuestos: por número, nombre, NIF/DNI o empresa.
      </div>
    </div>
  );
}

function ResultadosCargando() {
  return (
    <div className="py-2 animate-pulse">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-lg bg-slate-100" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 w-2/3 rounded bg-slate-100" />
            <div className="h-2 w-1/2 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FilaResultado({
  resultado: r,
  icon: Icon,
  busqueda,
  marcado,
  onMarcar,
  onAbrir,
}: {
  resultado: Resultado;
  icon: LucideIcon;
  busqueda: string;
  marcado: boolean;
  onMarcar: () => void;
  onAbrir: () => void;
}) {
  return (
    <button
      type="button"
      onMouseEnter={onMarcar}
      onClick={onAbrir}
      className={`w-full flex items-center gap-3 px-3 py-2 text-left ${marcado ? 'bg-indigo-50' : ''}`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${marcado ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-slate-800 truncate">
          <Resaltado texto={r.titulo} busqueda={busqueda} />
        </div>
        <div className="text-[11px] text-slate-500 truncate">
          <Resaltado texto={r.detalle} busqueda={busqueda} />
        </div>
      </div>
      {r.estado && (
        <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border ${ESTADO_COLOR[r.estado] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
          {r.estado}
        </span>
      )}
      {!r.ruta && <span className="shrink-0 text-[10px] text-slate-400">Próximamente</span>}
      {r.ruta && marcado && <ChevronRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
    </button>
  );
}

function MenuAvisos() {
  const [abierto, setAbierto] = useState(false);
  const [avisos, setAvisos] = useState(INITIAL_AVISOS);
  const [soloSinLeer, setSoloSinLeer] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  useCerrarAlSalir(caja, abierto, () => setAbierto(false));

  const sinLeer = avisos.filter((a) => !a.leido).length;
  const visibles = soloSinLeer ? avisos.filter((a) => !a.leido) : avisos;

  const abrir = (a: Aviso) => {
    setAvisos((lista) => lista.map((x) => (x.id === a.id ? { ...x, leido: true } : x)));
    if (a.ruta) {
      window.location.hash = `#/${a.ruta}`;
      setAbierto(false);
    }
  };

  return (
    <div ref={caja} className="relative">
      <BotonIcono titulo="Avisos" activo={abierto} onClick={() => setAbierto(!abierto)}>
        <Bell className="w-4 h-4" />
        {sinLeer > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-semibold leading-4 text-center ring-2 ring-white">
            {sinLeer}
          </span>
        )}
      </BotonIcono>

      {abierto && (
        <div className="fixed inset-x-2 top-14 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-1.5 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden text-xs z-40">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <div className="text-sm font-semibold text-slate-900">Avisos</div>
            <button
              type="button"
              disabled={sinLeer === 0}
              onClick={() => setAvisos((lista) => lista.map((a) => ({ ...a, leido: true })))}
              className="flex items-center gap-1 font-medium text-indigo-600 hover:underline disabled:text-slate-300 disabled:no-underline"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Marcar todo como leído
            </button>
          </div>

          <div className="flex gap-1 px-4 border-b border-slate-100">
            {[
              { valor: false, texto: 'Todos' },
              { valor: true, texto: `Sin leer (${sinLeer})` },
            ].map((p) => (
              <button
                key={p.texto}
                type="button"
                onClick={() => setSoloSinLeer(p.valor)}
                className={`px-2 py-1.5 -mb-px border-b-2 font-medium ${
                  soloSinLeer === p.valor ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {p.texto}
              </button>
            ))}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {visibles.length === 0 && (
              <div className="px-4 py-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <div className="mt-2 text-sm font-medium text-slate-700">Estás al día</div>
                <div className="mt-1 text-slate-500">No tienes avisos sin leer.</div>
              </div>
            )}
            {visibles.map((a) => {
              const { icon: Icon, color } = AVISO_ESTILO[a.tipo];
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => abrir(a)}
                  className={`w-full flex gap-3 px-4 py-3 text-left hover:bg-slate-50 ${a.leido ? '' : 'bg-indigo-50/40'}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-slate-800 ${a.leido ? '' : 'font-semibold'}`}>{a.titulo}</div>
                    <div className="mt-0.5 text-slate-500">{a.texto}</div>
                    <div className="mt-1 text-[11px] text-slate-400">{a.hace}</div>
                  </div>
                  {!a.leido && <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" title="Sin leer" />}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-slate-50">
            <button type="button" className="font-medium text-indigo-600 hover:underline">
              Ver todos los avisos
            </button>
            <button type="button" className="flex items-center gap-1 text-slate-500 hover:text-slate-700">
              <Settings className="w-3.5 h-3.5" /> Preferencias
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuAyuda({ onAtajos }: { onAtajos: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  useCerrarAlSalir(caja, abierto, () => setAbierto(false));

  const opciones: { icon: LucideIcon; titulo: string; texto: string; extra?: ReactNode; onClick?: () => void }[] = [
    { icon: BookOpen, titulo: 'Centro de ayuda', texto: 'Guías paso a paso de cada módulo' },
    {
      icon: Keyboard,
      titulo: 'Atajos de teclado',
      texto: 'Trabaja más rápido sin ratón',
      extra: <Tecla>?</Tecla>,
      onClick: () => {
        setAbierto(false);
        onAtajos();
      },
    },
    {
      icon: Sparkles,
      titulo: 'Novedades',
      texto: 'Qué ha cambiado en esta versión',
      extra: <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 rounded">Nuevo</span>,
    },
    { icon: LifeBuoy, titulo: 'Contactar con soporte', texto: 'Abre una incidencia al equipo de soporte' },
  ];

  return (
    <div ref={caja} className="relative">
      <BotonIcono titulo="Ayuda" activo={abierto} onClick={() => setAbierto(!abierto)}>
        <HelpCircle className="w-4 h-4" />
      </BotonIcono>

      {abierto && (
        <div className="fixed inset-x-2 top-14 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-1.5 sm:w-72 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden text-xs z-40">
          <div className="p-1.5">
            {opciones.map((o) => (
              <button
                key={o.titulo}
                type="button"
                onClick={o.onClick}
                className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left hover:bg-slate-50"
              >
                <o.icon className="w-4 h-4 text-slate-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800">{o.titulo}</div>
                  <div className="text-[11px] text-slate-500">{o.texto}</div>
                </div>
                {o.extra}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-500" /> Todo funciona con normalidad
            </span>
            <span>v{__APP_VERSION__}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function VentanaAtajos({ onCerrar }: { onCerrar: () => void }) {
  const caja = useRef<HTMLDivElement>(null);
  useCerrarAlSalir(caja, true, onCerrar);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <div ref={caja} className="w-full max-w-sm bg-white rounded-xl shadow-lg border border-slate-200 text-xs">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Keyboard className="w-4 h-4 text-slate-500" /> Atajos de teclado
          </div>
          <button type="button" title="Cerrar" onClick={onCerrar} className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-2">
          {ATAJOS.map((a) => (
            <div key={a.texto} className="flex items-center justify-between px-2 py-2">
              <span className="text-slate-700">{a.texto}</span>
              <span className="flex gap-1">
                {a.teclas.map((t) => (
                  <Tecla key={t}>{t}</Tecla>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
