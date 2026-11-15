import type { ReactNode } from 'react';
import { AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Layout';

// Estados comunes de una pantalla con datos: cargando, error al cargar y lo que aún no está en la API.

/** Esqueleto mientras carga la pantalla: misma estructura que una página (cabecera, pestañas, tarjetas). */
export function CargandoPagina({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="w-full px-4 sm:px-6 py-5 space-y-4 animate-pulse" role="status" aria-label={texto}>
      <div className="space-y-2">
        <div className="h-5 w-40 rounded bg-slate-200" />
        <div className="h-3 w-72 max-w-full rounded bg-slate-200" />
      </div>
      <div className="h-8 w-full rounded bg-slate-100" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-white border border-slate-200" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-white border border-slate-200" />
    </div>
  );
}

/** No se han podido cargar los datos: el mensaje de la API y un botón para reintentar. */
export function ErrorCarga({ titulo = 'No se han podido cargar los datos', mensaje, onReintentar }: { titulo?: string; mensaje?: string; onReintentar?: () => void }) {
  return (
    <Card className="p-8 text-center">
      <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
      <div className="mt-2 text-sm font-medium text-slate-800">{titulo}</div>
      {mensaje && <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">{mensaje}</p>}
      {onReintentar && (
        <div className="mt-4">
          <Button icon={RefreshCw} onClick={onReintentar}>Reintentar</Button>
        </div>
      )}
    </Card>
  );
}

/** Bloque que aún no tiene datos reales (falta su ruta en apps/api). En modo demo se ven los de ejemplo. */
export function Proximamente({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <Card className="p-6 flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
        <Clock className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900">{titulo}</h3>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md border text-[11px] font-medium bg-slate-100 text-slate-600 border-slate-200">Disponible próximamente</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">{children ?? 'Esta parte todavía no guarda datos reales.'}</p>
      </div>
    </Card>
  );
}
