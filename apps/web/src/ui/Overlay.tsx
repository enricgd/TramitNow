import { useEffect, type ReactNode } from 'react';
import { X, Trash2, AlertTriangle, type LucideIcon } from 'lucide-react';
import { Button } from './Button';
import { Notice } from './Layout';

function useEsc(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
}

function Cabecera({ title, subtitle, leading, status, onClose }: { title: ReactNode; subtitle?: ReactNode; leading?: ReactNode; status?: ReactNode; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200 shrink-0">
      <div className="flex items-start gap-3 min-w-0">
        {leading}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {status}
          </div>
          {subtitle && <div className="mt-0.5 text-xs text-slate-500">{subtitle}</div>}
        </div>
      </div>
      <button type="button" title="Cerrar" aria-label="Cerrar" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Panel lateral para fichas. Cabecera blanca, contenido con scroll y pie con las acciones.
export function Drawer({
  title,
  subtitle,
  leading,
  status,
  toolbar,
  footer,
  onClose,
  width = 'max-w-3xl',
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  status?: ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  width?: string;
  children: ReactNode;
}) {
  useEsc(onClose);
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className={`relative w-full ${width} bg-white h-full shadow-lg flex flex-col animate-drawer`}>
        <Cabecera title={title} subtitle={subtitle} leading={leading} status={status} onClose={onClose} />
        {toolbar && <div className="shrink-0">{toolbar}</div>}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2 shrink-0">{footer}</div>}
      </div>
    </div>
  );
}

// Ventana centrada para acciones cortas (formularios, confirmaciones, asistentes).
export function Modal({
  title,
  subtitle,
  status,
  toolbar,
  footer,
  onClose,
  size = 'max-w-lg',
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  status?: ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  size?: string;
  children: ReactNode;
}) {
  useEsc(onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className={`relative w-full ${size} bg-white rounded-xl border border-slate-200 shadow-lg flex flex-col max-h-[90vh] animate-fade-in`}>
        <Cabecera title={title} subtitle={subtitle} status={status} onClose={onClose} />
        {toolbar && <div className="shrink-0">{toolbar}</div>}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 rounded-b-xl flex items-center justify-end gap-2 shrink-0">{footer}</div>}
      </div>
    </div>
  );
}

// Confirmación de acciones que no se pueden deshacer (eliminar). Siempre avisa de que no habrá vuelta atrás y,
// si tiene sentido, ofrece una alternativa reversible (por ejemplo, "Suspender" en lugar de eliminar).
export function Confirmar({
  title,
  children,
  confirmLabel = 'Eliminar',
  onConfirm,
  onClose,
  alternativa,
}: {
  title: ReactNode;
  children?: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  alternativa?: { label: string; icon?: LucideIcon; onClick: () => void };
}) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      size="max-w-md"
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          {alternativa && (
            <Button icon={alternativa.icon} onClick={alternativa.onClick}>
              {alternativa.label}
            </Button>
          )}
          <Button variant="danger" icon={Trash2} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-xs text-slate-600">
        {children}
        <Notice tone="danger" icon={AlertTriangle}>
          Una vez eliminado no se podrá recuperar.
        </Notice>
      </div>
    </Modal>
  );
}
