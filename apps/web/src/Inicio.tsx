import { Inbox, FileSignature, Building, ArrowRight, Info, type LucideIcon } from 'lucide-react';

const MODULOS: { id: string; titulo: string; texto: string; icon: LucideIcon }[] = [
  {
    id: 'peticiones',
    titulo: 'Peticiones',
    texto: 'Bandeja de peticiones de personal de las empresas cliente, con plazas, candidatos asignados y seguimiento.',
    icon: Inbox,
  },
  {
    id: 'laboral',
    titulo: 'Laboral',
    texto: 'Expedientes de incorporación de una petición: alta en Seguridad Social, PRL, contrato y CPD.',
    icon: FileSignature,
  },
  {
    id: 'mi-ett',
    titulo: 'Mi ETT',
    texto: 'Ficha de la propia ETT: datos fiscales, sucursales, usuarios, permisos y configuración.',
    icon: Building,
  },
];

export default function Inicio() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Demo desplegada
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">TramitNow · ERP para ETT</h1>
        <p className="mt-2 text-sm text-slate-600 max-w-2xl">
          Primera versión navegable de la plataforma. Las pantallas son los diseños de trabajo, todavía sin conectar a la base de datos.
          Iremos sustituyéndolas por la aplicación real módulo a módulo.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {MODULOS.map(({ id, titulo, texto, icon: Icon }) => (
          <a
            key={id}
            href={`#/${id}`}
            className="group bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all flex flex-col"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Icon className="w-5 h-5" />
            </div>
            <h2 className="mt-3 text-sm font-semibold text-slate-900">{titulo}</h2>
            <p className="mt-1 text-xs text-slate-500 flex-1">{texto}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 group-hover:gap-2 transition-all">
              Abrir <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </a>
        ))}
      </section>

      <p className="flex items-start gap-2 text-xs text-slate-500">
        <Info className="w-4 h-4 shrink-0 text-slate-400" />
        Todos los nombres, documentos y datos que aparecen son ficticios.
      </p>
    </div>
  );
}
