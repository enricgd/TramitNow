// Lo eliminado de una ficha (contactos, centros o documentos): la baja es lógica y desde aquí se recupera.
import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button, Card, EmptyState, Notice } from '../../ui';
import { Archive } from 'lucide-react';
import type { EliminadoVista } from './useEmpresas';

export function Eliminados({
  titulo,
  vacio,
  cargar,
  onRestaurar,
}: {
  titulo: string;
  vacio: string;
  cargar: () => Promise<EliminadoVista[]>;
  /** Devuelve false si no se ha podido recuperar (la vista ya ha avisado del motivo). */
  onRestaurar: (id: string) => Promise<boolean>;
}) {
  const [items, setItems] = useState<EliminadoVista[]>();
  const [error, setError] = useState<string>();
  const [recuperando, setRecuperando] = useState<string>();

  useEffect(() => {
    let actual = true;
    cargar().then(
      (x) => actual && setItems(x),
      (e) => actual && setError(e?.message ?? 'No se han podido cargar'),
    );
    return () => {
      actual = false;
    };
  }, [cargar]);

  const restaurar = async (id: string) => {
    setRecuperando(id);
    if (await onRestaurar(id)) setItems((x) => x?.filter((i) => i.id !== id));
    setRecuperando(undefined);
  };

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200">
        <h4 className="text-xs font-semibold text-slate-900">{titulo}</h4>
        <p className="text-[11px] text-slate-500">No salen en la ficha ni en presupuestos y peticiones. Se pueden recuperar con todos sus datos.</p>
      </div>
      {error ? (
        <div className="p-4"><Notice tone="danger">{error}</Notice></div>
      ) : !items ? (
        <div className="p-4 text-xs text-slate-400">Cargando…</div>
      ) : items.length === 0 ? (
        <EmptyState icon={Archive} title="No hay nada eliminado" text={vacio} />
      ) : (
        <ul className="divide-y divide-slate-100 text-xs">
          {items.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-800 truncate">{i.nombre}</div>
                <div className="text-[11px] text-slate-500">{[i.detalle, i.fecha].filter(Boolean).join(' · ')}</div>
              </div>
              <Button size="sm" icon={RotateCcw} disabled={recuperando === i.id} onClick={() => restaurar(i.id)}>
                {recuperando === i.id ? 'Recuperando…' : 'Recuperar'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
