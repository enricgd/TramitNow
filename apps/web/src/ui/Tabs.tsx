import type { LucideIcon } from 'lucide-react';

// alert: punto ámbar junto al nombre (por ejemplo, cambios sin guardar en esa pestaña).
export type Tab = { id: string; label: string; icon?: LucideIcon; count?: number; alert?: boolean };

// Pestañas subrayadas. Mismo aspecto en fichas, paneles y ventanas.
export function Tabs({ tabs, active, onChange, className = '' }: { tabs: Tab[]; active: string; onChange: (id: string) => void; className?: string }) {
  return (
    <div className={`flex items-center gap-4 border-b border-slate-200 overflow-x-auto overflow-y-hidden text-xs ${className}`}>
      {tabs.map((t) => {
        const activa = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`flex items-center gap-1.5 py-2.5 -mb-px border-b-2 whitespace-nowrap font-medium transition-colors ${
              activa ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.icon && <t.icon className="w-3.5 h-3.5" />}
            {t.label}
            {t.alert && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Cambios sin guardar" />}
            {t.count !== undefined && (
              <span className={`text-[10px] px-1.5 rounded-md ${activa ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Selector de dos o tres opciones excluyentes (tabla / tarjetas...).
export function Segmented({
  options,
  value,
  onChange,
}: {
  options: { id: string; title: string; icon: LucideIcon }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          title={o.title}
          aria-label={o.title}
          onClick={() => onChange(o.id)}
          className={`p-1.5 rounded-md transition-colors ${value === o.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <o.icon className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  );
}
