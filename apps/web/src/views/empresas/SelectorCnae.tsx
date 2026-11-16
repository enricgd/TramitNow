// Sector de la empresa: una división del catálogo común CNAE-2009, con búsqueda por código o por nombre.
import { useMemo, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { CAMPO } from '../../ui';

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function SelectorCnae({
  value,
  onChange,
  opciones,
}: {
  value: string;
  onChange: (code: string) => void;
  opciones: { code: string; name: string }[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const elegida = opciones.find((o) => o.code === value);
  const encontradas = useMemo(() => {
    const q = normalizar(texto.trim());
    return opciones.filter((o) => !q || o.code.startsWith(q) || normalizar(o.name).includes(q));
  }, [opciones, texto]);

  const elegir = (code: string) => {
    onChange(code);
    setAbierto(false);
    setTexto('');
  };

  return (
    <div className="relative">
      {abierto ? (
        <input
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={() => setTimeout(() => setAbierto(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setAbierto(false);
            if (e.key === 'Enter') {
              e.preventDefault();
              if (encontradas[0]) elegir(encontradas[0].code);
            }
          }}
          placeholder="Busca por actividad o código CNAE: logística, 52, hostelería..."
          className={`${CAMPO} w-full`}
          aria-label="Buscar sector CNAE"
        />
      ) : (
        <button type="button" onClick={() => setAbierto(true)} className={`${CAMPO} w-full flex items-center justify-between gap-2 text-left`}>
          <span className={`truncate ${elegida || value ? '' : 'text-slate-400'}`}>
            {elegida ? `${elegida.code} · ${elegida.name}` : value ? `CNAE ${value}` : 'Selecciona un sector (CNAE)'}
          </span>
          <span className="flex items-center gap-1 shrink-0">
            {value && (
              <X
                className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600"
                aria-label="Quitar el sector"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
              />
            )}
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </span>
        </button>
      )}
      {abierto && (
        <ul className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg text-xs">
          {encontradas.length === 0 && <li className="px-3 py-2 text-slate-400">Ninguna actividad con «{texto}»</li>}
          {encontradas.map((o) => (
            <li key={o.code}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => elegir(o.code)}
                className={`w-full text-left px-3 py-1.5 hover:bg-indigo-50 ${o.code === value ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}
              >
                <span className="font-mono text-slate-400 mr-1.5">{o.code}</span>
                {o.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
