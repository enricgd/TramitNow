import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  FileSignature,
  ShieldCheck,
  PhoneCall,
  Send,
  UserSearch,
  Check,
  Undo2,
  UserPlus,
  Building2,
  Calculator,
  Search,
  CalendarClock,
  ArrowRight,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import { Page, PageHeader, Card, SectionTitle, KpiTile, Badge, Button, IconButton, Tabs, EmptyState, type Tone } from './ui';

// Datos de ejemplo del panel. Cuando haya backend, saldrán de apps/api (tareas, agenda e indicadores del usuario).
type Tarea = {
  id: string;
  tone: Tone;
  icon: LucideIcon;
  titulo: string;
  contexto: string;
  plazo: string;
  urgente: boolean;
  hoy: boolean;
  accion: string;
  ruta: string;
};

const INITIAL_TAREAS: Tarea[] = [
  { id: 't1', tone: 'danger', icon: AlertTriangle, titulo: 'DNI caducado de Carlos Mendoza Vidal', contexto: 'Bloquea el alta · PET-2026-0048', plazo: 'Atrasada 1 día', urgente: true, hoy: true, accion: 'Pedir documento', ruta: 'laboral' },
  { id: 't2', tone: 'warning', icon: ShieldCheck, titulo: 'Alta en Seguridad Social de Miguel Torres Navarro', contexto: 'Inicio el 03/11/2026 · PET-2026-0048', plazo: 'Hoy', urgente: true, hoy: true, accion: 'Tramitar alta', ruta: 'laboral' },
  { id: 't3', tone: 'warning', icon: FileSignature, titulo: '3 contratos pendientes de firma', contexto: 'Trans-Logística Ibérica Norte, S.L.', plazo: 'Hoy', urgente: false, hoy: true, accion: 'Enviar a firma', ruta: 'laboral' },
  { id: 't3b', tone: 'warning', icon: FileSignature, titulo: 'Aprobar el margen de PRE-2026-0047', contexto: 'Carretillero/a al 13,8 % (mínimo 15 %) · Mediterránea Agrícola y Envasado', plazo: 'Hoy', urgente: false, hoy: true, accion: 'Revisar margen', ruta: 'presupuestos' },
  { id: 't4', tone: 'info', icon: UserSearch, titulo: '3 plazas sin cubrir', contexto: 'PET-2026-0049 · Operario/a de almacén · turno de tarde', plazo: 'Empieza en 6 días', urgente: false, hoy: false, accion: 'Buscar candidatos', ruta: 'peticiones' },
  { id: 't5', tone: 'info', icon: PhoneCall, titulo: 'Llamar a Mohamed El Amrani', contexto: 'Por contactar desde hace 2 días', plazo: 'Hoy', urgente: false, hoy: true, accion: 'Llamar', ruta: 'candidatos' },
  { id: 't6', tone: 'neutral', icon: Send, titulo: 'Presupuesto PRE-2026-0045 sin respuesta', contexto: 'Enviado hace 6 días · Talleres Metalmecánicos Getafe, S.A.', plazo: 'Esta semana', urgente: false, hoy: false, accion: 'Recordar al cliente', ruta: 'presupuestos' },
];

const AGENDA = [
  { hora: '09:30', texto: 'Entrevista · Ainhoa Larrazabal Urkijo', tipo: 'Entrevista', tone: 'accent' as Tone },
  { hora: '11:00', texto: 'Llamada de seguimiento · Distribuciones Cantábrico', tipo: 'Cliente', tone: 'neutral' as Tone },
  { hora: '12:30', texto: 'Curso PRL · Ana López Serrano', tipo: 'Formación', tone: 'warning' as Tone },
  { hora: '16:00', texto: 'Incorporación · Laura García Moreno', tipo: 'Incorporación', tone: 'success' as Tone },
];

const COBERTURA = [
  { id: 'PET-2026-0049', titulo: 'Operario/a de almacén · turno de tarde', cliente: 'Trans-Logística Ibérica Norte, S.L.', cubiertas: 0, total: 3 },
  { id: 'PET-2026-0050', titulo: 'Carretillero/a · turno de tarde', cliente: 'Trans-Logística Ibérica Norte, S.L.', cubiertas: 2, total: 4 },
  { id: 'PET-2026-0046', titulo: 'Cocinero/a · jornada partida', cliente: 'Hostelería & Eventos Premium BCN, S.L.', cubiertas: 0, total: 2 },
];

const EMBUDO = [
  { etapa: 'Candidaturas', valor: 63 },
  { etapa: 'Contactados', valor: 28 },
  { etapa: 'Entrevistas', valor: 12 },
  { etapa: 'Asignados', valor: 7 },
];

const INCORPORACIONES = [
  { semana: 'S36', valor: 4 },
  { semana: 'S37', valor: 6 },
  { semana: 'S38', valor: 3 },
  { semana: 'S39', valor: 8 },
  { semana: 'S40', valor: 5 },
  { semana: 'S41', valor: 9 },
  { semana: 'S42', valor: 7 },
  { semana: 'S43', valor: 11 },
];

const ACTIVIDAD = [
  { hace: 'Hace 10 min', texto: 'Presupuesto PRE-2026-0048 aceptado por el cliente', tone: 'success' as Tone },
  { hace: 'Hace 1 h', texto: '12 candidaturas nuevas desde InfoJobs y LinkedIn', tone: 'info' as Tone },
  { hace: 'Hace 3 h', texto: 'Laura García Moreno: expediente completo', tone: 'success' as Tone },
  { hace: 'Ayer', texto: 'DNI de Carlos Mendoza Vidal marcado como caducado', tone: 'danger' as Tone },
];

const orden = (t: Tarea) => INITIAL_TAREAS.findIndex((x) => x.id === t.id);

const ir = (ruta: string) => {
  window.location.hash = `#/${ruta}`;
};

function saludo() {
  const h = new Date().getHours();
  return h < 14 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
}

export default function Inicio() {
  const [tareas, setTareas] = useState(INITIAL_TAREAS);
  const [hechas, setHechas] = useState<Tarea[]>([]);
  const [filtro, setFiltro] = useState('todas');

  const visibles = useMemo(
    () => tareas.filter((t) => filtro === 'todas' || (filtro === 'urgentes' ? t.urgente : t.hoy)),
    [tareas, filtro],
  );
  const urgentes = tareas.filter((t) => t.urgente).length;
  const fecha = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  const completar = (t: Tarea) => {
    setTareas((l) => l.filter((x) => x.id !== t.id));
    setHechas((l) => [t, ...l]);
  };
  const deshacer = () => {
    const [ultima, ...resto] = hechas;
    if (!ultima) return;
    setHechas(resto);
    setTareas((l) => [...l, ultima].sort((a, b) => orden(a) - orden(b)));
  };

  return (
    <Page>
      <PageHeader
        title={saludo()}
        subtitle={
          <span className="first-letter:uppercase">
            {fecha} · {tareas.length === 0 ? 'No tienes tareas pendientes.' : `Tienes ${tareas.length} tareas pendientes${urgentes ? `, ${urgentes} urgentes` : ''}.`}
          </span>
        }
      />

      {/* Indicadores: cada uno lleva a su pantalla */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiTile label="Peticiones abiertas" tone="accent" value="14" hint="8 en selección" onClick={() => ir('peticiones')} />
        <KpiTile label="Plazas por cubrir" tone="warning" value="10" hint="de 26 solicitadas" onClick={() => ir('peticiones')} />
        <KpiTile label="Expedientes bloqueados" tone="danger" value="1" hint="DNI caducado" onClick={() => ir('laboral')} />
        <KpiTile label="Presupuestos sin firmar" tone="info" value="2" hint="18.200 € en juego" onClick={() => ir('presupuestos')} />
        <KpiTile label="Personas en misión" tone="success" value="23" hint="2 terminan esta semana" onClick={() => ir('candidatos')} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Pendiente */}
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="px-4 pt-4">
            <SectionTitle>Pendiente</SectionTitle>
          </div>
          <Tabs
            className="px-4"
            active={filtro}
            onChange={setFiltro}
            tabs={[
              { id: 'todas', label: 'Todas', count: tareas.length },
              { id: 'urgentes', label: 'Urgentes', count: urgentes },
              { id: 'hoy', label: 'Para hoy', count: tareas.filter((t) => t.hoy).length },
            ]}
          />
          {visibles.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Todo al día" text="No queda nada pendiente en esta vista." />
          ) : (
            <ul>
              {visibles.map((t) => (
                <FilaTarea key={t.id} tarea={t} onHecha={() => completar(t)} />
              ))}
            </ul>
          )}
          {hechas.length > 0 && (
            <div className="flex items-center justify-between gap-2 px-4 py-2 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                {hechas.length === 1 ? '1 tarea hecha hoy' : `${hechas.length} tareas hechas hoy`}
              </span>
              <Button size="sm" variant="ghost" icon={Undo2} onClick={deshacer}>
                Deshacer
              </Button>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          {/* Accesos rápidos */}
          <Card className="p-4">
            <SectionTitle>Accesos rápidos</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              <Acceso icon={UserPlus} texto="Nuevo candidato" onClick={() => ir('candidatos')} />
              <Acceso icon={Building2} texto="Nueva empresa" onClick={() => ir('empresas')} />
              <Acceso icon={Calculator} texto="Nuevo presupuesto" onClick={() => ir('presupuestos')} />
              <Acceso
                icon={Search}
                texto="Buscar"
                extra="Ctrl K"
                onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
              />
            </div>
          </Card>

          {/* Agenda */}
          <Card className="p-4">
            <SectionTitle actions={<CalendarClock className="w-4 h-4 text-slate-400" />}>Agenda de hoy</SectionTitle>
            <ol className="space-y-2.5">
              {AGENDA.map((a) => (
                <li key={a.hora} className="flex items-start gap-3 text-xs">
                  <span className="w-10 shrink-0 font-mono text-slate-500 pt-0.5">{a.hora}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-slate-800">{a.texto}</div>
                    <div className="mt-0.5">
                      <Badge tone={a.tone}>{a.tipo}</Badge>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Cobertura de peticiones */}
        <Card className="p-4 lg:col-span-2">
          <SectionTitle
            actions={
              <Button size="sm" variant="ghost" onClick={() => ir('peticiones')}>
                Ver todas <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            }
          >
            Cobertura de peticiones
          </SectionTitle>
          <ul className="divide-y divide-slate-100">
            {COBERTURA.map((p) => {
              const completa = p.cubiertas === p.total;
              const pct = Math.round((p.cubiertas / p.total) * 100);
              return (
                <li key={p.id} className="py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1 basis-56">
                    <div className="text-xs font-medium text-slate-900 truncate">{p.titulo}</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {p.id} · {p.cliente}
                    </div>
                  </div>
                  <div className="w-40 shrink-0" title={`${p.cubiertas} de ${p.total} plazas cubiertas (${pct} %)`}>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                      <span>
                        {p.cubiertas} de {p.total}
                      </span>
                      <span className="text-slate-400">{pct} %</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full rounded-full ${completa ? 'bg-emerald-500' : 'bg-indigo-600'}`} style={{ width: `${Math.max(pct, 2)}%` }} />
                    </div>
                  </div>
                  <div className="w-36 shrink-0 text-right">
                    {completa ? (
                      <Badge tone="success" icon={Check}>
                        Cubierta
                      </Badge>
                    ) : (
                      <Button size="sm" icon={UserSearch} onClick={() => ir('peticiones')}>
                        Buscar candidatos
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Embudo de selección */}
        <Card className="p-4">
          <SectionTitle>Selección esta semana</SectionTitle>
          <div className="space-y-2.5">
            {EMBUDO.map((e) => (
              <div key={e.etapa} className="text-xs" title={`${e.etapa}: ${e.valor}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-600">{e.etapa}</span>
                  <span className="font-semibold text-slate-900">{e.valor}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(e.valor / EMBUDO[0].valor) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            {Math.round((EMBUDO[3].valor / EMBUDO[0].valor) * 100)} % de las candidaturas acaban asignadas.
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Incorporaciones por semana */}
        <Card className="p-4 lg:col-span-2">
          <SectionTitle>Incorporaciones por semana</SectionTitle>
          <GraficoBarras datos={INCORPORACIONES} />
        </Card>

        {/* Actividad reciente */}
        <Card className="p-4">
          <SectionTitle>Actividad reciente</SectionTitle>
          <ol className="space-y-3">
            {ACTIVIDAD.map((a, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs">
                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${PUNTO[a.tone]}`} />
                <div>
                  <div className="text-slate-800">{a.texto}</div>
                  <div className="text-[11px] text-slate-400">{a.hace}</div>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </Page>
  );
}

const PUNTO: Record<Tone, string> = {
  neutral: 'bg-slate-400',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-blue-500',
  accent: 'bg-indigo-500',
};

const ICONO_TONO: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-500',
  success: 'bg-emerald-50 text-emerald-600',
  warning: 'bg-amber-50 text-amber-600',
  danger: 'bg-rose-50 text-rose-600',
  info: 'bg-blue-50 text-blue-600',
  accent: 'bg-indigo-50 text-indigo-600',
};

function FilaTarea({ tarea: t, onHecha }: { tarea: Tarea; onHecha: () => void }) {
  const atrasada = t.plazo.startsWith('Atrasada');
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ICONO_TONO[t.tone]}`}>
        <t.icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1 basis-48">
        <div className="text-xs font-medium text-slate-900">{t.titulo}</div>
        <div className="text-[11px] text-slate-500">{t.contexto}</div>
      </div>
      <span className={`text-[11px] whitespace-nowrap ${atrasada ? 'text-rose-600 font-medium' : 'text-slate-500'}`}>{t.plazo}</span>
      <div className="flex items-center gap-1">
        <Button size="sm" variant={t.urgente ? 'primary' : 'secondary'} onClick={() => ir(t.ruta)}>
          {t.accion}
        </Button>
        <IconButton icon={Check} title="Marcar como hecha" onClick={onHecha} />
      </div>
    </li>
  );
}

function Acceso({ icon: Icon, texto, extra, onClick }: { icon: LucideIcon; texto: string; extra?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-2 rounded-lg border border-slate-200 p-3 text-left hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
    >
      <Icon className="w-4 h-4 text-indigo-600" />
      <span className="text-xs font-medium text-slate-800">{texto}</span>
      {extra && <span className="text-[10px] text-slate-400 -mt-1.5">{extra}</span>}
    </button>
  );
}

// Barras verticales de una sola serie: sin leyenda (el título la nombra) y con el valor al pasar el ratón.
function GraficoBarras({ datos }: { datos: { semana: string; valor: number }[] }) {
  const max = Math.max(...datos.map((d) => d.valor));
  const techo = Math.ceil(max / 4) * 4;
  const media = datos.reduce((s, d) => s + d.valor, 0) / datos.length;
  return (
    <div>
      <div className="relative h-40">
        {[0, 0.5, 1].map((f) => (
          <div key={f} className="absolute inset-x-0 border-t border-slate-100" style={{ bottom: `${f * 100}%` }}>
            <span className="absolute -top-2 -left-0.5 -translate-x-full pr-1 text-[10px] text-slate-400">{Math.round(techo * f)}</span>
          </div>
        ))}
        <div className="absolute inset-0 ml-4 flex items-end gap-2">
          {datos.map((d, i) => (
            <div key={d.semana} className="group relative flex-1 h-full flex items-end" title={`${d.semana}: ${d.valor} incorporaciones`}>
              <div
                className={`w-full rounded-t ${i === datos.length - 1 ? 'bg-indigo-600' : 'bg-indigo-300 group-hover:bg-indigo-400'} transition-colors`}
                style={{ height: `${(d.valor / techo) * 100}%` }}
              />
              <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-full mb-1 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity" style={{ bottom: `${(d.valor / techo) * 100}%` }}>
                {d.valor}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="ml-4 mt-1.5 flex gap-2">
        {datos.map((d) => (
          <span key={d.semana} className="flex-1 text-center text-[10px] text-slate-400">
            {d.semana}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Esta semana: <span className="font-semibold text-slate-800">{datos[datos.length - 1].valor}</span> · media de las últimas 8: {media.toFixed(1).replace('.', ',')}
      </p>
    </div>
  );
}
