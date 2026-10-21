import { useEffect, useState, type ComponentType } from 'react';
import {
  LayoutDashboard,
  Inbox,
  Calculator,
  Building2,
  Users,
  UserCheck,
  UserPlus,
  Briefcase,
  Clock,
  Receipt,
  FileText,
  BarChart3,
  Settings,
  Building,
  FileSignature,
  Search,
  Bell,
  HelpCircle,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import LaboralView from './views/LaboralView.jsx';
import PeticionesView from './views/PeticionesView.jsx';
import FichaEttView from './views/FichaEttView.jsx';
import Inicio from './Inicio';

// Estructura común sacada de design/laboral.html. Las entradas sin vista aún salen deshabilitadas.
type NavItem = { id: string; label: string; icon: LucideIcon; view?: ComponentType; badge?: string };
type NavSection = { title?: string; items: NavItem[] };

const NAV: NavSection[] = [
  {
    items: [
      { id: 'inicio', label: 'Inicio', icon: LayoutDashboard, view: Inicio },
      { id: 'peticiones', label: 'Peticiones', icon: Inbox, view: PeticionesView, badge: '14' },
      { id: 'presupuestos', label: 'Presupuestos', icon: Calculator },
      { id: 'empresas', label: 'Empresas y clientes', icon: Building2 },
      { id: 'candidatos', label: 'Candidatos', icon: Users },
      { id: 'seleccion', label: 'Selección', icon: UserCheck },
    ],
  },
  {
    title: 'Operativa y Laboral',
    items: [
      { id: 'laboral', label: 'Laboral', icon: FileSignature, view: LaboralView },
      { id: 'incorporaciones', label: 'Incorporaciones', icon: UserPlus },
      { id: 'mision', label: 'Personal en misión', icon: Briefcase },
      { id: 'horas', label: 'Horas e incidencias', icon: Clock },
      { id: 'facturacion', label: 'Facturación', icon: Receipt },
    ],
  },
  {
    title: 'Gestión y Soporte',
    items: [
      { id: 'documentos', label: 'Documentos', icon: FileText },
      { id: 'informes', label: 'Informes', icon: BarChart3 },
      { id: 'mi-ett', label: 'Mi ETT', icon: Building, view: FichaEttView },
      { id: 'configuracion', label: 'Configuración', icon: Settings },
    ],
  },
];

const ITEMS = NAV.flatMap((s) => s.items);
const AVAILABLE = ITEMS.filter((i) => i.view);

function currentId() {
  const id = window.location.hash.replace(/^#\/?/, '');
  return AVAILABLE.some((i) => i.id === id) ? id : 'inicio';
}

export default function App() {
  const [active, setActive] = useState(currentId);

  useEffect(() => {
    const onHash = () => setActive(currentId());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const View = ITEMS.find((i) => i.id === active)?.view ?? Inicio;

  return (
    <div className="h-screen flex flex-col bg-slate-100/70 text-slate-800">
      <Header />

      {/* Navegación en móvil: la barra lateral solo aparece desde md */}
      <nav className="md:hidden flex gap-1 overflow-x-auto bg-slate-900 px-2 py-1.5 text-xs">
        {AVAILABLE.map((item) => (
          <a
            key={item.id}
            href={`#/${item.id}`}
            className={`shrink-0 px-3 py-1.5 rounded-lg ${item.id === active ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar active={active} />
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <View />
        </main>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 z-30 shadow-xs">
      <div className="flex items-center gap-4">
        <a href="#/inicio" className="flex items-center gap-2 pr-4 border-r border-slate-200">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-700 to-blue-500 flex items-center justify-center text-white font-bold text-base shadow-sm">
            TN
          </div>
          <div className="leading-tight">
            <div className="font-bold text-sm tracking-tight text-slate-900 flex items-center gap-1.5">
              TramitNow{' '}
              <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-200">
                ERP SaaS
              </span>
            </div>
            <div className="text-[11px] text-slate-400">Gestión Integral para ETT</div>
          </div>
        </a>

        <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg">
          <div className="w-5 h-5 rounded bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">EG</div>
          <div className="text-xs font-medium text-slate-700">ETT Global Servicios Temporales, S.L.</div>
          <span className="text-[10px] bg-slate-200 text-slate-600 px-1 rounded">Delegación Norte</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative hidden md:block w-64">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar petición, NIF, DNI..."
            className="w-full bg-slate-50 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
        <button className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
        </button>
        <button className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <HelpCircle className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-semibold">EM</div>
          <div className="hidden lg:block text-left leading-tight">
            <div className="text-xs font-semibold text-slate-800">Elena Morán</div>
            <div className="text-[10px] text-slate-400">Responsable Laboral</div>
          </div>
        </div>
      </div>
    </header>
  );
}

function Sidebar({ active }: { active: string }) {
  return (
    <aside className="w-56 bg-slate-900 text-slate-300 flex-col shrink-0 select-none border-r border-slate-800 hidden md:flex">
      <div className="p-3 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Módulos Principales</div>
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto text-xs">
        {NAV.map((section, i) => (
          <div key={i} className="space-y-0.5">
            {section.title && (
              <div className="pt-2 pb-1 text-[11px] uppercase tracking-wider text-slate-500 font-semibold px-3">{section.title}</div>
            )}
            {section.items.map((item) => (
              <SidebarLink key={item.id} item={item} isActive={item.id === active} />
            ))}
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
        <span>v{__APP_VERSION__}</span>
        <span className="inline-flex items-center gap-1 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Demo
        </span>
      </div>
    </aside>
  );
}

function SidebarLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon;
  if (!item.view) {
    return (
      <span title="Próximamente" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 cursor-not-allowed">
        <Icon className="w-4 h-4" />
        <span>{item.label}</span>
      </span>
    );
  }
  return (
    <a
      href={`#/${item.id}`}
      className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
        isActive ? 'bg-indigo-600 text-white font-medium shadow-xs' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
      }`}
    >
      <span className="flex items-center gap-2.5">
        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
        <span>{item.label}</span>
      </span>
      {item.badge && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isActive ? 'bg-indigo-700/80' : 'bg-slate-800 text-slate-400'}`}>
          {item.badge}
        </span>
      )}
      {!item.badge && isActive && <ArrowRight className="w-3.5 h-3.5" />}
    </a>
  );
}
