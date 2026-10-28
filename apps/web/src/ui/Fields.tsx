import { useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { Button, IconButton } from './Button';

// Clases comunes de cualquier campo, para inputs que aún no usan estos componentes.
export const CAMPO =
  'h-8 bg-white border border-slate-200 rounded-lg px-2.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500';

export function SearchInput({
  value,
  onChange,
  placeholder,
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${CAMPO} w-full pl-8 pr-7`} />
      {value && (
        <button type="button" title="Borrar" onClick={() => onChange('')} className="absolute right-2 top-2 text-slate-400 hover:text-slate-600">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// Desplegable de filtro: la primera opción hace de etiqueta ("Todos los estados").
export function Select({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select className={`${CAMPO} pr-7 ${className}`} {...rest}>
      {children}
    </select>
  );
}

// Desplegable de una lista categorizada que permite dar de alta una opción nueva sin salir del formulario.
// Úsalo en todo lo que se pueda categorizar (sectores, puestos, tipos de documento...): mejor elegir que escribir.
export function SelectConAlta({
  value,
  onChange,
  options,
  onAdd,
  placeholder = 'Selecciona una opción',
  nuevoPlaceholder = 'Nombre de la nueva opción',
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  onAdd: (v: string) => void;
  placeholder?: string;
  nuevoPlaceholder?: string;
}) {
  const [creando, setCreando] = useState(false);
  const [nuevo, setNuevo] = useState('');
  const [error, setError] = useState('');

  const cerrar = () => {
    setCreando(false);
    setNuevo('');
    setError('');
  };
  const guardar = () => {
    const n = nuevo.trim();
    if (!n) return setError('Escribe un nombre.');
    const existente = options.find((o) => o.toLowerCase() === n.toLowerCase());
    if (!existente) onAdd(n);
    onChange(existente ?? n);
    cerrar();
  };

  if (!creando) {
    return (
      <div className="flex gap-2">
        <Select value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 min-w-0 w-full">
          <option value="">{placeholder}</option>
          {/* Si el valor guardado no está en la lista, se muestra igualmente */}
          {(value && !options.includes(value) ? [value, ...options] : options).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
        <Button icon={Plus} onClick={() => setCreando(true)} title="Añadir una opción que no está en la lista">
          Añadir
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <TextInput
          autoFocus
          value={nuevo}
          placeholder={nuevoPlaceholder}
          onChange={(e) => {
            setNuevo(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              guardar();
            } else if (e.key === 'Escape') {
              e.stopPropagation();
              cerrar();
            }
          }}
        />
        <Button variant="primary" onClick={guardar}>
          Guardar
        </Button>
        <IconButton icon={X} title="Cancelar" onClick={cerrar} className="shrink-0 h-8 w-8" />
      </div>
      {error ? (
        <p className="text-[11px] text-rose-600">{error}</p>
      ) : (
        <p className="text-[11px] text-slate-400">Se añadirá a la lista y quedará elegida.</p>
      )}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium text-slate-600">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

export function TextInput({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${CAMPO} w-full ${className}`} {...rest} />;
}
