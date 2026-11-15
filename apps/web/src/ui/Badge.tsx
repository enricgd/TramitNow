import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

// El color de un estado sale siempre de aquí: success = correcto/activo, warning = aviso/pendiente,
// danger = error/urgente, info = informativo, accent = en curso, neutral = sin estado.
export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

export const TONOS: Record<Tone, { badge: string; dot: string; text: string; soft: string }> = {
  neutral: { badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400', text: 'text-slate-600', soft: 'bg-slate-50' },
  success: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', text: 'text-emerald-700', soft: 'bg-emerald-50' },
  warning: { badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', text: 'text-amber-700', soft: 'bg-amber-50' },
  danger: { badge: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', text: 'text-rose-700', soft: 'bg-rose-50' },
  info: { badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', text: 'text-blue-700', soft: 'bg-blue-50' },
  accent: { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500', text: 'text-indigo-700', soft: 'bg-indigo-50' },
};

export function Badge({
  tone = 'neutral',
  dot,
  icon: Icon,
  title,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  icon?: LucideIcon;
  title?: string;
  children: ReactNode;
}) {
  const t = TONOS[tone];
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] font-medium whitespace-nowrap ${t.badge}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />}
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  );
}

// Iniciales en círculo, sin degradados.
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const iniciales = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
  const tam = { sm: 'w-7 h-7 text-[11px]', md: 'w-8 h-8 text-xs', lg: 'w-12 h-12 text-base' }[size];
  return (
    <div className={`${tam} rounded-full bg-indigo-50 text-indigo-700 font-semibold flex items-center justify-center shrink-0`}>
      {iniciales}
    </div>
  );
}
