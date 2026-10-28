import type { ReactNode } from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { TONOS, type Tone } from './Badge';

// Contenedor de todas las pantallas: mismo ancho máximo y mismos márgenes.
export function Page({ children }: { children: ReactNode }) {
  return <div className="w-full px-4 sm:px-6 py-5 space-y-4">{children}</div>;
}

export type Miga = { label: string; href?: string; onClick?: () => void };

// Cabecera de página única. Acciones: como mucho un botón principal y dos secundarios.
export function PageHeader({
  title,
  count,
  subtitle,
  breadcrumbs,
  status,
  actions,
}: {
  title: ReactNode;
  count?: number;
  subtitle?: ReactNode;
  breadcrumbs?: Miga[];
  status?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-[11px] text-slate-500">
          {breadcrumbs.map((m, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3 h-3 text-slate-400" />}
              {m.href || m.onClick ? (
                <a href={m.href ?? '#'} onClick={m.onClick && ((e) => { e.preventDefault(); m.onClick?.(); })} className="hover:text-slate-800">
                  {m.label}
                </a>
              ) : (
                <span className="text-slate-700">{m.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-semibold text-slate-900 tracking-tight">{title}</h1>
            {count !== undefined && (
              <span className="text-xs font-medium text-slate-500 bg-slate-100 rounded-md px-1.5 py-0.5">{count}</span>
            )}
            {status}
          </div>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl border border-slate-200 shadow-xs ${className}`}>{children}</div>;
}

// Título de un bloque dentro de una tarjeta o panel.
export function SectionTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2">
      <h3 className="text-sm font-semibold text-slate-900">{children}</h3>
      {actions}
    </div>
  );
}

// Indicador numérico. Si lleva onClick, funciona como filtro rápido (marcado cuando active).
export function KpiTile({
  label,
  value,
  hint,
  tone = 'neutral',
  active,
  onClick,
  children,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
  active?: boolean;
  onClick?: () => void;
  children?: ReactNode;
}) {
  const t = TONOS[tone];
  const base = 'text-left rounded-xl border bg-white px-3.5 py-2.5 transition-colors';
  const estado = active ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-slate-300';
  const contenido = (
    <>
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
        {tone !== 'neutral' && <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />}
        {label}
      </div>
      <div className="mt-0.5 text-lg font-semibold text-slate-900">{value}</div>
      {hint && <div className="text-[11px] text-slate-500">{hint}</div>}
      {children}
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={`${base} ${estado}`}>
      {contenido}
    </button>
  ) : (
    <div className={`${base} border-slate-200`}>{contenido}</div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="py-12 px-6 text-center">
      <Icon className="w-8 h-8 text-slate-300 mx-auto" />
      <div className="mt-2 text-sm font-medium text-slate-800">{title}</div>
      {text && <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Aviso dentro de una página o panel (no a pantalla completa).
export function Notice({ tone = 'info', icon: Icon, children }: { tone?: Tone; icon?: LucideIcon; children: ReactNode }) {
  const t = TONOS[tone];
  return (
    <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${t.soft} ${t.text}`}>
      {Icon && <Icon className="w-4 h-4 shrink-0 mt-px" />}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
