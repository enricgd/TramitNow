import { useEffect, useState, type ComponentType } from 'react';
import {
  LayoutDashboard,
  Inbox,
  Calculator,
  Building2,
  Users,
  UserCheck,
  Briefcase,
  Clock,
  Receipt,
  FileText,
  BarChart3,
  Settings,
  ShieldCheck,
  Database,
  Building,
  FileSignature,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import LaboralView from './views/LaboralView.jsx';
import PeticionesView from './views/PeticionesView.jsx';
import FichaEttView from './views/FichaEttView.jsx';
import EmpresasView from './views/EmpresasView.jsx';
import PresupuestosView from './views/PresupuestosView.jsx';
import CandidatosView from './views/CandidatosView.jsx';
import MisionView from './views/MisionView.jsx';
import HorasView from './views/HorasView.jsx';
import Inicio from './Inicio';
import Header from './Header';

export type CurrentUser = { name: string; email: string; role: string };

// Estructura común sacada de design/laboral.html. Las entradas sin vista aún salen deshabilitadas.
type NavItem = { id: string; label: string; icon: LucideIcon; view?: ComponentType; badge?: string };
// pie: el grupo va fijo al final de la barra, separado del trabajo diario.
type NavSection = { title?: string; pie?: boolean; items: NavItem[] };

// Ordenado según el recorrido de trabajo: cliente → presupuesto → petición → selección → contrato → misión → horas → factura.
const NAV: NavSection[] = [
  {
    items: [{ id: 'inicio', label: 'Inicio', icon: LayoutDashboard, view: Inicio }],
  },
  {
    title: 'Comercial',
    items: [
      { id: 'empresas', label: 'Empresas', icon: Building2, view: EmpresasView },
      { id: 'presupuestos', label: 'Presupuestos', icon: Calculator, view: PresupuestosView },
    ],
  },
  {
    title: 'Operativa',
    items: [
      { id: 'peticiones', label: 'Peticiones', icon: Inbox, view: PeticionesView, badge: '14' },
      { id: 'candidatos', label: 'Candidatos', icon: Users, view: CandidatosView },
      { id: 'seleccion', label: 'Selección', icon: UserCheck },
    ],
  },
  {
    title: 'Laboral',
    items: [
      { id: 'laboral', label: 'Contratos y altas', icon: FileSignature, view: LaboralView },
      { id: 'mision', label: 'Personal en misión', icon: Briefcase, view: MisionView },
      { id: 'horas', label: 'Horas e incidencias', icon: Clock, view: HorasView },
    ],
  },
  {
    title: 'Gestión',
    items: [
      { id: 'facturacion', label: 'Facturación', icon: Receipt },
      { id: 'informes', label: 'Informes', icon: BarChart3 },
      { id: 'documentos', label: 'Documentos', icon: FileText },
    ],
  },
  {
    title: 'Ajustes',
    pie: true,
    items: [
      { id: 'mi-ett', label: 'Mi ETT', icon: Building, view: FichaEttView },
      { id: 'usuarios', label: 'Usuarios y permisos', icon: ShieldCheck },
      { id: 'tablas', label: 'Tablas maestras', icon: Database },
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

export default function App({ user, onSignOut }: { user: CurrentUser; onSignOut: () => void }) {
  const [active, setActive] = useState(currentId);

  useEffect(() => {
    const onHash = () => setActive(currentId());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const View = ITEMS.find((i) => i.id === active)?.view ?? Inicio;

  return (
    <div className="h-screen flex flex-col bg-slate-100/70 text-slate-800">
      <Header user={user} onSignOut={onSignOut} />

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
        <main className="flex-1 min-w-0 overflow-y-auto bg-slate-50">
          <View />
        </main>
      </div>
    </div>
  );
}

function Sidebar({ active }: { active: string }) {
  return (
    <aside className="w-56 bg-slate-900 text-slate-300 flex-col shrink-0 select-none border-r border-slate-800 hidden md:flex">
      <div className="p-3 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Módulos Principales</div>
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto text-xs">
        {NAV.filter((s) => !s.pie).map((section, i) => (
          <SidebarSection key={i} section={section} active={active} />
        ))}
      </nav>
      <nav className="px-2 pb-2 border-t border-slate-800 text-xs">
        {NAV.filter((s) => s.pie).map((section, i) => (
          <SidebarSection key={i} section={section} active={active} />
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

function SidebarSection({ section, active }: { section: NavSection; active: string }) {
  return (
    <div className="space-y-0.5">
      {section.title && (
        <div className="pt-2 pb-1 text-[11px] uppercase tracking-wider text-slate-500 font-semibold px-3">{section.title}</div>
      )}
      {section.items.map((item) => (
        <SidebarLink key={item.id} item={item} isActive={item.id === active} />
      ))}
    </div>
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
