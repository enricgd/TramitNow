import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

// Un solo botón para toda la app. Por pantalla o panel: como mucho un "primary".
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTES: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs',
  secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-xs',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50',
};

const TAMANOS = {
  sm: 'h-7 px-2.5 gap-1.5 text-xs',
  md: 'h-8 px-3 gap-1.5 text-xs',
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: keyof typeof TAMANOS;
  icon?: LucideIcon;
  children?: ReactNode;
};

export function Button({ variant = 'secondary', size = 'md', icon: Icon, className = '', children, ...rest }: Props) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors disabled:opacity-50 disabled:pointer-events-none ${VARIANTES[variant]} ${TAMANOS[size]} ${className}`}
      {...rest}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      {children}
    </button>
  );
}

// Botón solo con icono (acciones de fila, cerrar...). El título es obligatorio: es lo que se lee al pasar el ratón.
export function IconButton({
  icon: Icon,
  title,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; title: string }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors ${className}`}
      {...rest}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
