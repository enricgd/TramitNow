// Facturación: de las horas cerradas en Horas e incidencias a la factura, el envío y el cobro.
// No partió de ninguna maqueta de design/: se diseñó directamente con el sistema común.
import React, { useState, useMemo } from 'react';
import {
    Receipt, Building2, Send, CheckCircle2, AlertTriangle, Info, X, Plus, Trash2, Eye, FileCheck2, Wallet,
    ArrowUpRight, Clock, Undo2, BellRing, FileMinus2, CalendarDays, ChevronDown
} from 'lucide-react';
import {
    Page, PageHeader, Card, SectionTitle, KpiTile, EmptyState, Notice, Button, IconButton, Badge, SearchInput,
    Select, Field, TextInput, Modal, Drawer, Confirmar
} from '../ui';

// ==========================================
// DATOS DE EJEMPLO (los mismos clientes, peticiones y horas que en Peticiones y Horas e incidencias)
// ==========================================
const ETT = {
    nombre: 'ETT Global Servicios Temporales, S.L.', cif: 'B00000000', direccion: 'C/ Ejemplo 1, 48001 Bilbao (Bizkaia)',
    autorizacion: '00/0000-ETT', iban: 'ES00 0000 0000 0000 0000 0000',
};
// Datos de facturación de la ficha del cliente (Empresas)
const CLIENTES = {
    translog: {
        nombre: 'Trans-Logística Ibérica Norte, S.L.', cif: 'B-87654321',
        direccion: 'Polígono Industrial Artunduaga, Pabellón 14, 48970 Basauri (Bizkaia)',
        iva: 21, retencion: 0, pago: 'Transferencia a 60 días', diasPago: 60, diasFijos: [10, 25],
        email: 'facturacion@translog-norte.es', fichaIncompleta: 'Falta el IBAN y la evaluación de riesgo.',
    },
    hosteleria: {
        nombre: 'Hostelería & Eventos Premium BCN, S.L.', cif: 'B-99887766', direccion: 'Passeig de Gràcia 112, 4º, 08008 Barcelona',
        iva: 21, retencion: 0, pago: 'Transferencia a 30 días', diasPago: 30, diasFijos: [],
        email: 'facturacion@premiumeventsbcn.cat',
    },
};
// Tarifa por hora del presupuesto aceptado; los recargos son los del presupuesto (EXTRAS_DEFECTO)
const PETICIONES = {
    'PET-2026-0031': { cliente: 'translog', puesto: 'Mozo/a de almacén', presupuesto: 'PRE-2026-0029', tarifa: 16.90 },
    'PET-2026-0044': { cliente: 'hosteleria', puesto: 'Camarero/a de sala', presupuesto: 'PRE-2026-0041', tarifa: 18.40 },
};
const CONCEPTOS = [
    { id: 'normales', texto: 'horas normales', recargo: 1 },
    { id: 'extra', texto: 'horas extra', recargo: 1.5 },
    { id: 'nocturnas', texto: 'horas nocturnas', recargo: 1.25 },
    { id: 'finde', texto: 'horas de fin de semana', recargo: 1.5 },
    { id: 'festivas', texto: 'horas festivas', recargo: 1.75 },
];
// Meses pasados a facturación desde Horas e incidencias. listo: todos los partes validados.
const HORAS_INICIALES = [
    { petId: 'PET-2026-0031', mes: '2026-07', horas: { normales: 1027.5 }, listo: true },
    // Agosto se facturó con 945 h; los partes validados suman 937,5 (Horas e incidencias avisa de la diferencia)
    { petId: 'PET-2026-0031', mes: '2026-08', horas: { normales: 945 }, listo: true },
    { petId: 'PET-2026-0031', mes: '2026-09', horas: { normales: 990, extra: 2 }, listo: true },
    { petId: 'PET-2026-0044', mes: '2026-10', horas: { normales: 667.33, extra: 4, finde: 144, festivas: 72 }, listo: false, partesPendientes: 2 },
];
const MOTIVOS_RECTIFICACION = ['Error en las horas', 'Error en la tarifa', 'Error en los datos del cliente', 'Otro'];

// ==========================================
// UTILIDADES
// ==========================================
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const hoyIso = () => new Date().toISOString().slice(0, 10);
const fechaES = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');
const sumar = (iso, n) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const diasEntre = (a, b) => Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000);
const nombreMes = (mes) => `${MESES[Number(mes.slice(5)) - 1]} de ${mes.slice(0, 4)}`;
const mayus = (t) => t.replace(/^./, s => s.toUpperCase());
const redondear = (n) => Math.round(n * 100) / 100;
const euros = (n) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', useGrouping: 'always' });
const num = (n) => n.toLocaleString('es-ES', { maximumFractionDigits: 2, useGrouping: 'always' });
// Vencimiento: días de la forma de pago y, si el cliente tiene días fijos de pago, el siguiente de ellos
const vencimientoDe = (cliente, emision) => {
    let d = sumar(emision, cliente.diasPago);
    if (!cliente.diasFijos.length) return d;
    for (let i = 0; i < 32 && !cliente.diasFijos.includes(Number(d.slice(8))); i++) d = sumar(d, 1);
    return d;
};
const lineasDesdeHoras = (h) => {
    const pet = PETICIONES[h.petId];
    return CONCEPTOS.filter(c => h.horas[c.id]).map(c => ({
        id: `${h.petId}-${h.mes}-${c.id}`, petId: h.petId, mes: h.mes,
        concepto: `${pet.puesto} · ${c.texto} · ${nombreMes(h.mes)} (${h.petId})`,
        cantidad: h.horas[c.id], unidad: 'h', precio: redondear(pet.tarifa * c.recargo),
    }));
};
const totalesDe = (f) => {
    const cliente = CLIENTES[f.cliente];
    const base = redondear(f.lineas.reduce((s, l) => s + redondear(l.cantidad * l.precio), 0));
    const iva = redondear(base * cliente.iva / 100);
    const retencion = redondear(base * cliente.retencion / 100);
    const total = redondear(base + iva - retencion);
    const cobrado = redondear(f.cobros.reduce((s, c) => s + c.importe, 0));
    return { base, iva, retencion, total, cobrado, pendiente: redondear(total - cobrado) };
};
const estadoDe = (f) => {
    if (f.estado === 'borrador') return { id: 'borrador', texto: 'Borrador', tono: 'neutral' };
    if (f.rectifica) return { id: 'rectificativa', texto: 'Rectificativa', tono: 'neutral' };
    if (f.anulada) return { id: 'anulada', texto: 'Anulada', tono: 'neutral' };
    const t = totalesDe(f);
    if (t.pendiente <= 0) return { id: 'cobrada', texto: 'Cobrada', tono: 'success' };
    if (f.vencimiento < hoyIso()) return { id: 'vencida', texto: t.cobrado ? 'Vencida · cobro parcial' : 'Vencida', tono: 'danger' };
    if (t.cobrado) return { id: 'parcial', texto: 'Cobro parcial', tono: 'warning' };
    if (f.estado === 'emitida') return { id: 'emitida', texto: 'Emitida, sin enviar', tono: 'info' };
    return { id: 'enviada', texto: 'Pendiente de cobro', tono: 'accent' };
};
const PENDIENTES_COBRO = ['emitida', 'enviada', 'parcial', 'vencida'];
const PERIODOS = [
    { id: 'anio', texto: 'Este año' },
    { id: 'este_mes', texto: 'Este mes' },
    { id: 'mes_pasado', texto: 'Mes pasado' },
    { id: 'tres_meses', texto: 'Últimos 3 meses' },
    { id: 'todo', texto: 'Todo' },
    { id: 'fechas', texto: 'Entre dos fechas…' },
];
const finDeMes = (mes) => sumar(`${sumar(`${mes}-28`, 4).slice(0, 7)}-01`, -1);
const rangoDe = (periodo, desde, hasta) => {
    const hoy = hoyIso();
    const mes = hoy.slice(0, 7);
    const mesPasado = sumar(`${mes}-01`, -1).slice(0, 7);
    switch (periodo) {
        case 'este_mes': return [`${mes}-01`, finDeMes(mes)];
        case 'mes_pasado': return [`${mesPasado}-01`, finDeMes(mesPasado)];
        case 'tres_meses': return [sumar(hoy, -91), hoy];
        case 'todo': return ['0000-01-01', '9999-12-31'];
        case 'fechas': return [desde || '0000-01-01', hasta || '9999-12-31'];
        default: return [`${hoy.slice(0, 4)}-01-01`, `${hoy.slice(0, 4)}-12-31`];
    }
};
const normalizar = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const peticionesDe = (f) => [...new Set(f.lineas.filter(l => l.petId).map(l => l.petId))];
// Fecha con la que se filtra: la de emisión, o el mes del borrador
const fechaFiltro = (f) => f.emision || (/^\d{4}-\d{2}$/.test(f.periodo) ? `${f.periodo}-01` : hoyIso());

const factura = (numero, cliente, periodo, emision, lineas, extra = {}) => ({
    id: numero, numero, cliente, periodo, emision, vencimiento: vencimientoDe(CLIENTES[cliente], emision),
    estado: 'enviada', lineas, cobros: [], historial: [{ fecha: emision, texto: `Factura ${numero} emitida y enviada a ${CLIENTES[cliente].email}` }],
    ...extra,
});
const INITIAL_FACTURAS = [
    factura('F2026-0079', 'translog', 'Formación PRL', '2026-07-15', [
        { id: 'prl', concepto: 'Curso PRL de carretilla elevadora (6 personas)', cantidad: 6, unidad: 'ud.', precio: 85, manual: true },
    ], { historial: [{ fecha: '2026-07-15', texto: 'Factura F2026-0079 emitida y enviada a facturacion@translog-norte.es' }, { fecha: '2026-10-01', texto: 'Recordatorio de pago enviado' }] }),
    factura('F2026-0087', 'translog', '2026-07', '2026-08-03', lineasDesdeHoras(HORAS_INICIALES[0])),
    factura('F2026-0094', 'translog', '2026-08', '2026-09-02', lineasDesdeHoras(HORAS_INICIALES[1])),
    factura('F2026-0101', 'translog', '2026-09', '2026-10-02', lineasDesdeHoras(HORAS_INICIALES[2])),
];
// Julio, cobrada en el día fijo de pago
INITIAL_FACTURAS[1].cobros = [{ fecha: '2026-10-10', importe: totalesDe(INITIAL_FACTURAS[1]).total, nota: 'Transferencia' }];
INITIAL_FACTURAS[1].historial.push({ fecha: '2026-10-10', texto: 'Cobrada' });
const PRIMER_NUMERO = 108;

export default function FacturacionView() {
    const [facturas, setFacturas] = useState(INITIAL_FACTURAS);
    const [horas, setHoras] = useState(HORAS_INICIALES);
    const [siguiente, setSiguiente] = useState({ F: PRIMER_NUMERO, R: 4 });
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');
    const [filtroCliente, setFiltroCliente] = useState('');
    const [filtroPeticion, setFiltroPeticion] = useState('');
    const [periodo, setPeriodo] = useState('anio');
    const [desde, setDesde] = useState('');
    const [hasta, setHasta] = useState('');
    const [plegados, setPlegados] = useState([]);
    const [abierta, setAbierta] = useState(null);
    const [previa, setPrevia] = useState(false);
    const [linea, setLinea] = useState(null); // { concepto, cantidad, precio }
    const [lineaAEliminar, setLineaAEliminar] = useState(null);
    const [descartar, setDescartar] = useState(false);
    const [cobro, setCobro] = useState(null); // { fecha, importe, nota }
    const [rectificar, setRectificar] = useState(null); // { motivo, nota, nueva }
    const [toast, setToast] = useState(null);

    const showToast = (t) => { setToast(t); setTimeout(() => setToast(null), 3800); };
    const actualizar = (id, cambios, texto) => {
        setFacturas(prev => prev.map(f => {
            if (f.id !== id) return f;
            const n = { ...f, ...(typeof cambios === 'function' ? cambios(f) : cambios) };
            if (texto) n.historial = [...n.historial, { fecha: hoyIso(), texto }];
            return n;
        }));
        if (texto) showToast(texto);
    };

    // Meses con horas que aún no tienen factura (o solo un borrador), agrupados por cliente y mes
    const facturado = (h) => facturas.find(f => !f.anulada && !f.rectifica && f.lineas.some(l => l.petId === h.petId && l.mes === h.mes));
    const porFacturar = useMemo(() => {
        const grupos = {};
        horas.forEach(h => {
            const f = facturado(h);
            if (f && f.estado !== 'borrador') return;
            const k = `${PETICIONES[h.petId].cliente}|${h.mes}`;
            (grupos[k] = grupos[k] || { cliente: PETICIONES[h.petId].cliente, mes: h.mes, horas: [], borrador: null }).horas.push(h);
            if (f) grupos[k].borrador = f.id;
        });
        return Object.values(grupos).sort((a, b) => b.mes.localeCompare(a.mes));
    }, [horas, facturas]);
    const [rangoDesde, rangoHasta] = rangoDe(periodo, desde, hasta);
    const textoPeticion = (petId) => `${petId} ${PETICIONES[petId].puesto}`;
    const porFacturarFiltrado = porFacturar
        .filter(g => !filtroCliente || g.cliente === filtroCliente)
        .filter(g => !filtroPeticion || g.horas.some(h => h.petId === filtroPeticion))
        .filter(g => `${g.mes}-01` <= rangoHasta && finDeMes(g.mes) >= rangoDesde)
        .filter(g => { const q = normalizar(busqueda.trim()); return !q || normalizar([CLIENTES[g.cliente].nombre, nombreMes(g.mes), ...g.horas.map(h => textoPeticion(h.petId))].join(' ')).includes(q); });

    const lista = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        return facturas
            .filter(f => {
                const e = estadoDe(f).id;
                if (!filtroEstado) return true;
                if (filtroEstado === 'pendientes') return PENDIENTES_COBRO.includes(e);
                return e === filtroEstado;
            })
            .filter(f => !filtroCliente || f.cliente === filtroCliente)
            .filter(f => !filtroPeticion || peticionesDe(f).includes(filtroPeticion))
            .filter(f => fechaFiltro(f) >= rangoDesde && fechaFiltro(f) <= rangoHasta)
            .filter(f => !q || normalizar([f.numero || 'borrador', CLIENTES[f.cliente].nombre, f.periodo, /^\d{4}-\d{2}$/.test(f.periodo) ? nombreMes(f.periodo) : '', ...peticionesDe(f).map(textoPeticion), ...f.lineas.map(l => l.concepto)].join(' ')).includes(normalizar(q)))
            .sort((a, b) => (a.estado === 'borrador' ? -1 : b.estado === 'borrador' ? 1 : b.emision.localeCompare(a.emision)));
    }, [facturas, busqueda, filtroEstado, filtroCliente, filtroPeticion, rangoDesde, rangoHasta]);
    const pendientes = facturas.filter(f => PENDIENTES_COBRO.includes(estadoDe(f).id));
    const vencidas = facturas.filter(f => estadoDe(f).id === 'vencida');
    const suma = (l) => l.reduce((s, f) => s + totalesDe(f).pendiente, 0);
    const hayFiltros = busqueda || filtroEstado || filtroCliente || filtroPeticion || periodo !== 'anio';
    const limpiar = () => { setBusqueda(''); setFiltroEstado(''); setFiltroCliente(''); setFiltroPeticion(''); setPeriodo('anio'); setDesde(''); setHasta(''); };
    const etiqueta = (texto, icono) => <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600">{icono}{texto}</span>;
    const f = facturas.find(x => x.id === abierta);

    const prepararFactura = (g) => {
        if (g.borrador) { setAbierta(g.borrador); return; }
        const id = `borrador-${Date.now()}`;
        setFacturas(prev => [...prev, {
            id, numero: null, cliente: g.cliente, periodo: g.mes, emision: null, vencimiento: null, estado: 'borrador',
            lineas: g.horas.flatMap(lineasDesdeHoras), cobros: [], historial: [{ fecha: hoyIso(), texto: 'Borrador preparado con las horas de Horas e incidencias' }],
        }]);
        setAbierta(id);
    };
    const horasDe = (fac) => horas.filter(h => fac.lineas.some(l => l.petId === h.petId && l.mes === h.mes));
    const simularHorasValidadas = (fac) => {
        setHoras(prev => prev.map(h => (fac.lineas.some(l => l.petId === h.petId && l.mes === h.mes) ? { ...h, listo: true, partesPendientes: 0 } : h)));
        actualizar(fac.id, {}, 'El cliente ha validado todas las horas del mes: ya se puede emitir');
    };
    const emitir = () => {
        const numero = `F2026-${String(siguiente.F).padStart(4, '0')}`;
        setSiguiente(s => ({ ...s, F: s.F + 1 }));
        actualizar(f.id, { numero, estado: 'emitida', emision: hoyIso(), vencimiento: vencimientoDe(CLIENTES[f.cliente], hoyIso()) }, `Factura ${numero} emitida. Ya no se puede cambiar.`);
    };
    const confirmarCobro = () => {
        actualizar(f.id, (x) => ({ cobros: [...x.cobros, { fecha: cobro.fecha, importe: redondear(Number(cobro.importe)), nota: cobro.nota }] }),
            `Cobro de ${euros(Number(cobro.importe))} registrado en ${f.numero}`);
        setCobro(null);
    };
    const confirmarRectificacion = () => {
        const numero = `R2026-${String(siguiente.R).padStart(4, '0')}`;
        setSiguiente(s => ({ ...s, R: s.R + 1 }));
        const nuevas = [{
            id: numero, numero, cliente: f.cliente, periodo: f.periodo, emision: hoyIso(), vencimiento: hoyIso(), estado: 'emitida', rectifica: f.numero,
            motivo: rectificar.motivo, lineas: f.lineas.map(l => ({ ...l, cantidad: -l.cantidad })), cobros: [],
            historial: [{ fecha: hoyIso(), texto: `Rectificativa de ${f.numero}: ${rectificar.motivo.toLowerCase()}${rectificar.nota ? `. ${rectificar.nota}` : ''}` }],
        }];
        if (rectificar.nueva) {
            nuevas.push({
                id: `borrador-${Date.now()}`, numero: null, cliente: f.cliente, periodo: f.periodo, emision: null, vencimiento: null, estado: 'borrador',
                lineas: f.lineas.map(l => ({ ...l })), cobros: [], historial: [{ fecha: hoyIso(), texto: `Borrador para sustituir a ${f.numero}` }],
            });
        }
        setFacturas(prev => [...prev.map(x => (x.id === f.id ? { ...x, anulada: numero, historial: [...x.historial, { fecha: hoyIso(), texto: `Anulada por la rectificativa ${numero}` }] } : x)), ...nuevas]);
        showToast(`Rectificativa ${numero} emitida${rectificar.nueva ? ' y borrador nuevo preparado' : ''}`);
        setRectificar(null);
        setAbierta(rectificar.nueva ? nuevas[1].id : numero);
    };

    return (
        <>
            <Page>
                <PageHeader
                    title="Facturación"
                    count={pendientes.length}
                    subtitle="Las horas validadas de cada mes se convierten en la factura al cliente. Aquí se emite, se envía y se sigue el cobro."
                />

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <KpiTile label="Por facturar" tone="accent" value={porFacturar.filter(g => !g.borrador).length} hint="Meses con horas sin factura" onClick={() => document.getElementById('por-facturar')?.scrollIntoView({ behavior: 'smooth' })} />
                    <KpiTile label="En borrador" value={facturas.filter(x => x.estado === 'borrador').length} hint="Por revisar y emitir" active={filtroEstado === 'borrador'} onClick={() => setFiltroEstado('borrador')} />
                    <KpiTile label="Pendiente de cobro" tone="info" value={euros(suma(pendientes))} hint={`${pendientes.length} ${pendientes.length === 1 ? 'factura' : 'facturas'}`} active={filtroEstado === 'pendientes'} onClick={() => setFiltroEstado('pendientes')} />
                    <KpiTile label="Vencidas" tone="danger" value={euros(suma(vencidas))} hint={`${vencidas.length} ${vencidas.length === 1 ? 'factura' : 'facturas'}`} active={filtroEstado === 'vencida'} onClick={() => setFiltroEstado('vencida')} />
                </div>

                {/* FILTROS: los mismos que en Horas e incidencias, para «Por facturar» y para las facturas */}
                <Card className="p-3">
                    <div className="flex flex-wrap items-end gap-3">
                        <label className="flex flex-col gap-1 min-w-[200px] flex-1 sm:flex-none sm:w-64">
                            {etiqueta('Buscar')}
                            <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Número, cliente, petición o puesto..." />
                        </label>
                        <label className="flex flex-col gap-1 min-w-[220px] flex-1 sm:flex-none">
                            {etiqueta('Cliente', <Building2 className="w-3.5 h-3.5 text-slate-400" />)}
                            <Select value={filtroCliente} onChange={(e) => { setFiltroCliente(e.target.value); setFiltroPeticion(''); }} aria-label="Cliente">
                                <option value="">Todos los clientes</option>
                                {Object.entries(CLIENTES).map(([id, c]) => { const n = facturas.filter(x => x.cliente === id).length; return <option key={id} value={id}>{c.nombre} · {n} {n === 1 ? 'factura' : 'facturas'}</option>; })}
                            </Select>
                        </label>
                        {filtroCliente && (
                            <label className="flex flex-col gap-1 min-w-[220px] flex-1 sm:flex-none">
                                {etiqueta('Petición')}
                                <Select value={filtroPeticion} onChange={(e) => setFiltroPeticion(e.target.value)} aria-label="Petición">
                                    <option value="">Todas las peticiones del cliente</option>
                                    {Object.entries(PETICIONES).filter(([, p]) => p.cliente === filtroCliente).map(([id, p]) => <option key={id} value={id}>{id} · {p.puesto}</option>)}
                                </Select>
                            </label>
                        )}
                        <label className="flex flex-col gap-1">
                            {etiqueta('Fecha de emisión', <CalendarDays className="w-3.5 h-3.5 text-slate-400" />)}
                            <Select value={periodo} onChange={(e) => setPeriodo(e.target.value)} aria-label="Periodo">
                                {PERIODOS.map(p => <option key={p.id} value={p.id}>{p.texto}</option>)}
                            </Select>
                        </label>
                        {periodo === 'fechas' && <>
                            <label className="flex flex-col gap-1">{etiqueta('Desde')}<TextInput type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-auto!" /></label>
                            <label className="flex flex-col gap-1">{etiqueta('Hasta')}<TextInput type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-auto!" /></label>
                        </>}
                        <label className="flex flex-col gap-1">
                            {etiqueta('Estado')}
                            <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} aria-label="Estado">
                                <option value="">Todos los estados</option>
                                <option value="borrador">Borrador</option>
                                <option value="pendientes">Pendientes de cobro (todas)</option>
                                <option value="vencida">Vencidas</option>
                                <option value="cobrada">Cobradas</option>
                                <option value="anulada">Anuladas</option>
                                <option value="rectificativa">Rectificativas</option>
                            </Select>
                        </label>
                        {hayFiltros && <Button size="sm" variant="ghost" icon={X} onClick={limpiar}>Limpiar</Button>}
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">{rangoDesde > '0000-01-01' ? `Del ${fechaES(rangoDesde)}` : 'Desde el principio'}{rangoHasta < '9999-12-31' ? ` al ${fechaES(rangoHasta)}` : ''}. Los borradores cuentan por el mes que facturan.</p>
                </Card>

                {/* POR FACTURAR */}
                <div id="por-facturar" className="space-y-2">
                    <SectionTitle>Por facturar</SectionTitle>
                    {porFacturarFiltrado.length === 0 ? (
                        <Card className="p-4 text-xs text-slate-500">{porFacturar.length ? 'No hay horas por facturar con estos filtros.' : 'No hay horas pendientes de facturar.'}</Card>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {porFacturarFiltrado.map(g => {
                                const cliente = CLIENTES[g.cliente];
                                const listo = g.horas.every(h => h.listo);
                                const faltan = g.horas.reduce((s, h) => s + (h.partesPendientes || 0), 0);
                                const total = g.horas.reduce((s, h) => s + Object.values(h.horas).reduce((a, b) => a + b, 0), 0);
                                return (
                                    <Card key={`${g.cliente}|${g.mes}`} className="p-4 space-y-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <div className="text-sm font-medium text-slate-900">{cliente.nombre}</div>
                                                <div className="text-[11px] text-slate-500">{mayus(nombreMes(g.mes))} · {g.horas.map(h => `${h.petId} (${PETICIONES[h.petId].puesto.toLowerCase()})`).join(', ')}</div>
                                            </div>
                                            <Badge tone={g.borrador ? 'neutral' : listo ? 'success' : 'warning'} dot>{g.borrador ? 'En borrador' : listo ? 'Horas validadas' : 'Esperando horas'}</Badge>
                                        </div>
                                        <div className="text-xs text-slate-700">
                                            {num(total)} h · {euros(g.horas.flatMap(lineasDesdeHoras).reduce((s, l) => s + redondear(l.cantidad * l.precio), 0))} de base con las tarifas del presupuesto
                                            {!listo && <span className="block text-amber-700 mt-0.5">Faltan {faltan} partes por validar en Horas e incidencias. Puedes preparar el borrador, pero no emitirlo.</span>}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Button size="sm" variant={listo || g.borrador ? 'primary' : 'secondary'} icon={Receipt} onClick={() => prepararFactura(g)}>
                                                {g.borrador ? 'Ver borrador' : listo ? 'Preparar factura' : 'Preparar borrador'}
                                            </Button>
                                            {!listo && <Button size="sm" variant="ghost" icon={ArrowUpRight} onClick={() => { window.location.hash = '#/horas'; }}>Horas e incidencias</Button>}
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* FACTURAS, agrupadas por cliente */}
                <SectionTitle>Facturas</SectionTitle>
                {lista.length === 0 ? (
                    <Card><EmptyState icon={Receipt} title="No hay facturas con estos filtros" action={hayFiltros && <Button onClick={limpiar}>Limpiar filtros</Button>} /></Card>
                ) : Object.keys(CLIENTES).filter(c => lista.some(x => x.cliente === c)).map(c => {
                    const delCliente = lista.filter(x => x.cliente === c);
                    const plegado = plegados.includes(c);
                    const totalCliente = delCliente.filter(x => x.estado !== 'borrador' && !x.anulada).reduce((s, x) => s + totalesDe(x).total, 0);
                    const pendienteCliente = delCliente.filter(x => PENDIENTES_COBRO.includes(estadoDe(x).id)).reduce((s, x) => s + totalesDe(x).pendiente, 0);
                    const vencidasCliente = delCliente.filter(x => estadoDe(x).id === 'vencida').length;
                    return (
                        <Card key={c} className="overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setPlegados(prev => (prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]))}
                                aria-expanded={!plegado}
                                className={`w-full flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50 ${plegado ? '' : 'border-b border-slate-200'}`}
                            >
                                <span className="flex items-center gap-2 min-w-0">
                                    <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${plegado ? '-rotate-90' : ''}`} />
                                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                                    <span className="text-sm font-semibold text-slate-900">{CLIENTES[c].nombre}</span>
                                </span>
                                <span className="text-xs text-slate-500">
                                    {delCliente.length} {delCliente.length === 1 ? 'factura' : 'facturas'} · {euros(totalCliente)} facturado · {euros(pendienteCliente)} pendiente
                                    {vencidasCliente > 0 && <span className="text-rose-700"> · {vencidasCliente} {vencidasCliente === 1 ? 'vencida' : 'vencidas'}</span>}
                                </span>
                            </button>
                            {!plegado && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                                                <th className="py-2 px-3 font-medium">Número</th>
                                                <th className="py-2 px-3 font-medium">Periodo y peticiones</th>
                                                <th className="py-2 px-3 font-medium">Emisión</th>
                                                <th className="py-2 px-3 font-medium">Vencimiento</th>
                                                <th className="py-2 px-3 font-medium text-right">Total</th>
                                                <th className="py-2 px-3 font-medium text-right">Pendiente</th>
                                                <th className="py-2 px-3 font-medium">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {delCliente.map(x => {
                                                const tt = totalesDe(x);
                                                const e = estadoDe(x);
                                                const d = x.vencimiento ? diasEntre(hoyIso(), x.vencimiento) : null;
                                                const pets = peticionesDe(x);
                                                return (
                                                    <tr key={x.id} onClick={() => setAbierta(x.id)} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer">
                                                        <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-900">{x.numero || <span className="text-slate-500">Borrador</span>}</td>
                                                        <td className="py-2.5 px-3">
                                                            <span className="block text-slate-800">{/^\d{4}-\d{2}$/.test(x.periodo) ? mayus(nombreMes(x.periodo)) : x.periodo}{x.rectifica ? ` · rectifica ${x.rectifica}` : ''}</span>
                                                            <span className="text-[11px] text-slate-500">{pets.length ? pets.map(p => `${p} · ${PETICIONES[p].puesto}`).join(', ') : 'Sin petición (líneas manuales)'}</span>
                                                        </td>
                                                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">{fechaES(x.emision)}</td>
                                                        <td className="py-2.5 px-3 whitespace-nowrap">
                                                            <div className="text-slate-700">{x.rectifica ? '—' : fechaES(x.vencimiento)}</div>
                                                            {PENDIENTES_COBRO.includes(e.id) && d != null && <div className={`text-[11px] ${d < 0 ? 'text-rose-700' : 'text-slate-500'}`}>{d < 0 ? `hace ${-d} días` : d === 0 ? 'hoy' : `en ${d} días`}</div>}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right whitespace-nowrap text-slate-900">{euros(tt.total)}</td>
                                                        <td className="py-2.5 px-3 text-right whitespace-nowrap text-slate-700">{PENDIENTES_COBRO.includes(e.id) ? euros(tt.pendiente) : <span className="text-slate-300">—</span>}</td>
                                                        <td className="py-2.5 px-3"><Badge tone={e.tono} dot>{e.texto}</Badge></td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Card>
                    );
                })}
                <Notice tone="neutral" icon={Info}>Las tarifas son las del presupuesto aceptado de cada petición. El coste y el margen solo se ven en Presupuestos.</Notice>
            </Page>

            {/* FICHA DE LA FACTURA */}
            {f && (() => {
                const cliente = CLIENTES[f.cliente];
                const t = totalesDe(f);
                const e = estadoDe(f);
                const borrador = f.estado === 'borrador';
                const hs = horasDe(f);
                const horasListas = hs.every(h => h.listo);
                const faltan = hs.reduce((s, h) => s + (h.partesPendientes || 0), 0);
                const vencimientoPrevisto = f.vencimiento || vencimientoDe(cliente, hoyIso());
                const diasVencida = f.vencimiento ? diasEntre(f.vencimiento, hoyIso()) : 0;
                const cobrable = PENDIENTES_COBRO.includes(e.id);
                return (
                    <Drawer
                        onClose={() => setAbierta(null)}
                        width="max-w-3xl"
                        title={f.numero ? `Factura ${f.numero}` : 'Borrador de factura'}
                        status={<Badge tone={e.tono} dot>{e.texto}</Badge>}
                        subtitle={`${cliente.nombre} · ${/^\d{4}-\d{2}$/.test(f.periodo) ? mayus(nombreMes(f.periodo)) : f.periodo}`}
                        footer={<>
                            {borrador && <Button variant="ghost" icon={Trash2} className="mr-auto text-rose-600!" onClick={() => setDescartar(true)}>Descartar borrador</Button>}
                            {!borrador && !f.rectifica && !f.anulada && <Button variant="ghost" icon={FileMinus2} className="mr-auto" onClick={() => setRectificar({ motivo: MOTIVOS_RECTIFICACION[0], nota: '', nueva: true })}>Rectificar</Button>}
                            <Button icon={Eye} onClick={() => setPrevia(true)}>Vista previa</Button>
                            {borrador && <Button variant="primary" icon={FileCheck2} disabled={!horasListas || !f.lineas.length} title={horasListas ? undefined : 'Faltan horas por validar'} onClick={emitir}>Emitir factura</Button>}
                            {f.estado === 'emitida' && !f.rectifica && <Button variant="primary" icon={Send} onClick={() => actualizar(f.id, { estado: 'enviada' }, `Factura ${f.numero} enviada a ${cliente.email}`)}>Enviar al cliente</Button>}
                            {f.rectifica && f.estado === 'emitida' && <Button variant="primary" icon={Send} onClick={() => actualizar(f.id, { estado: 'enviada' }, `Rectificativa ${f.numero} enviada a ${cliente.email}`)}>Enviar al cliente</Button>}
                            {cobrable && f.estado !== 'emitida' && <Button variant="primary" icon={Wallet} onClick={() => setCobro({ fecha: hoyIso(), importe: t.pendiente, nota: '' })}>Registrar cobro</Button>}
                        </>}
                    >
                        <div className="space-y-5 text-xs">
                            {borrador && !horasListas && (
                                <Notice tone="warning" icon={Clock}>
                                    <span className="flex flex-wrap items-center justify-between gap-2">
                                        <span>Faltan {faltan} partes por validar en Horas e incidencias. Las horas pueden cambiar y la factura no se puede emitir todavía.</span>
                                        <Button size="sm" title="En la demo simula que el cliente valida los partes" onClick={() => simularHorasValidadas(f)}>Simular horas validadas</Button>
                                    </span>
                                </Notice>
                            )}
                            {borrador && horasListas && <Notice tone="info" icon={Info}>Revisa las líneas y emite la factura. Al emitirla se le da número y ya no se puede cambiar; para corregirla habría que hacer una rectificativa.</Notice>}
                            {e.id === 'vencida' && (
                                <Notice tone="danger" icon={AlertTriangle}>
                                    <span className="flex flex-wrap items-center justify-between gap-2">
                                        <span>Vencida hace {diasVencida} días. Quedan {euros(t.pendiente)} por cobrar.</span>
                                        <Button size="sm" icon={BellRing} onClick={() => actualizar(f.id, {}, `Recordatorio de pago de ${f.numero} enviado a ${cliente.email}`)}>Recordar al cliente</Button>
                                    </span>
                                </Notice>
                            )}
                            {f.anulada && <Notice tone="neutral" icon={Undo2}>Anulada por la rectificativa {f.anulada}.</Notice>}
                            {f.rectifica && <Notice tone="neutral" icon={FileMinus2}>Rectifica la factura {f.rectifica}: {f.motivo.toLowerCase()}. Si ya estaba cobrada, el importe se devuelve o se compensa en la siguiente.</Notice>}

                            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2"><dt className="text-[11px] text-slate-500">Cliente</dt><dd className="text-slate-900">{cliente.nombre} · CIF {cliente.cif}<span className="block text-slate-500">{cliente.direccion}</span></dd></div>
                                <div><dt className="text-[11px] text-slate-500">Se envía a</dt><dd className="text-slate-900 break-all">{cliente.email}</dd></div>
                                <div><dt className="text-[11px] text-slate-500">Emisión</dt><dd className="text-slate-900">{f.emision ? fechaES(f.emision) : 'Al emitirla'}</dd></div>
                                <div><dt className="text-[11px] text-slate-500">Forma de pago</dt><dd className="text-slate-900">{cliente.pago}{cliente.diasFijos.length ? ` · días ${cliente.diasFijos.join(' y ')}` : ''}</dd></div>
                                <div><dt className="text-[11px] text-slate-500">Vencimiento</dt><dd className="text-slate-900">{f.rectifica ? '—' : `${fechaES(vencimientoPrevisto)}${f.vencimiento ? '' : ' (si se emite hoy)'}`}</dd></div>
                            </dl>
                            {cliente.fichaIncompleta && (
                                <Notice tone="warning" icon={Building2}>
                                    <span className="flex flex-wrap items-center justify-between gap-2">
                                        <span>La ficha del cliente tiene datos de facturación sin completar. {cliente.fichaIncompleta} No impide facturar por transferencia.</span>
                                        <Button size="sm" icon={ArrowUpRight} onClick={() => { window.location.hash = '#/empresas'; }}>Ficha del cliente</Button>
                                    </span>
                                </Notice>
                            )}

                            {/* LÍNEAS */}
                            <div className="space-y-2">
                                <SectionTitle actions={borrador && <Button size="sm" icon={Plus} onClick={() => setLinea({ concepto: '', cantidad: 1, precio: '' })}>Añadir línea</Button>}>Líneas</SectionTitle>
                                <div className="overflow-x-auto rounded-lg border border-slate-200">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                                                <th className="py-2 px-3 font-medium">Concepto</th>
                                                <th className="py-2 px-3 font-medium text-right">Cantidad</th>
                                                <th className="py-2 px-3 font-medium text-right">Precio</th>
                                                <th className="py-2 px-3 font-medium text-right">Importe</th>
                                                {borrador && <th className="py-2 px-2" aria-label="Acciones"></th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {f.lineas.map(l => (
                                                <tr key={l.id} className="border-b border-slate-100 last:border-0">
                                                    <td className="py-2 px-3 text-slate-800">{l.concepto}{l.manual && <span className="block text-[11px] text-slate-500">Línea manual</span>}</td>
                                                    <td className="py-2 px-3 text-right whitespace-nowrap">{num(l.cantidad)} {l.unidad}</td>
                                                    <td className="py-2 px-3 text-right whitespace-nowrap">{euros(l.precio)}</td>
                                                    <td className="py-2 px-3 text-right whitespace-nowrap text-slate-900">{euros(redondear(l.cantidad * l.precio))}</td>
                                                    {borrador && <td className="py-1 px-2 text-right">{l.manual && <IconButton icon={Trash2} title="Quitar línea" onClick={() => setLineaAEliminar(l)} />}</td>}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {f.lineas.some(l => l.petId) && <p className="text-[11px] text-slate-500">Horas de Horas e incidencias por la tarifa del presupuesto ({[...new Set(f.lineas.filter(l => l.petId).map(l => `${PETICIONES[l.petId].presupuesto}: ${euros(PETICIONES[l.petId].tarifa)}/h`))].join(', ')}). Recargos: extra y fin de semana × 1,5; nocturna × 1,25; festiva × 1,75.</p>}
                                <dl className="ml-auto w-full sm:w-72 space-y-1">
                                    <div className="flex justify-between"><dt className="text-slate-500">Base imponible</dt><dd>{euros(t.base)}</dd></div>
                                    <div className="flex justify-between"><dt className="text-slate-500">IVA ({cliente.iva} %)</dt><dd>{euros(t.iva)}</dd></div>
                                    {cliente.retencion > 0 && <div className="flex justify-between"><dt className="text-slate-500">Retención ({cliente.retencion} %)</dt><dd>−{euros(t.retencion)}</dd></div>}
                                    <div className="flex justify-between border-t border-slate-200 pt-1 text-sm"><dt className="font-medium text-slate-900">Total</dt><dd className="font-medium text-slate-900">{euros(t.total)}</dd></div>
                                    {t.cobrado !== 0 && <div className="flex justify-between text-emerald-700"><dt>Cobrado</dt><dd>{euros(t.cobrado)}</dd></div>}
                                    {cobrable && <div className="flex justify-between"><dt className="text-slate-500">Pendiente</dt><dd className="text-slate-900">{euros(t.pendiente)}</dd></div>}
                                </dl>
                            </div>

                            {/* COBROS */}
                            {!borrador && !f.rectifica && (
                                <div className="space-y-2">
                                    <SectionTitle>Cobros</SectionTitle>
                                    {f.cobros.length === 0 ? <p className="text-slate-500">Sin cobros registrados.</p> : (
                                        <ul className="space-y-1.5">
                                            {f.cobros.map((c, i) => (
                                                <li key={i} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                                                    <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" />{fechaES(c.fecha)}{c.nota ? ` · ${c.nota}` : ''}</span>
                                                    <span className="text-slate-900">{euros(c.importe)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}

                            {/* HISTORIAL */}
                            <div className="space-y-2">
                                <SectionTitle>Historial</SectionTitle>
                                <ol className="space-y-2">
                                    {[...f.historial].reverse().map((h, k) => (
                                        <li key={k} className="flex items-start gap-2.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                            <span><span className="text-slate-800">{h.texto}</span><span className="block text-[11px] text-slate-500">{fechaES(h.fecha)}</span></span>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        </div>
                    </Drawer>
                );
            })()}

            {/* VISTA PREVIA */}
            {previa && f && (() => {
                const cliente = CLIENTES[f.cliente];
                const t = totalesDe(f);
                return (
                    <Modal title="Vista previa" subtitle="Así la recibe el cliente" onClose={() => setPrevia(false)} size="max-w-3xl" footer={<Button onClick={() => setPrevia(false)}>Cerrar</Button>}>
                        <div className="rounded-lg border border-slate-200 p-4 sm:p-6 space-y-5 text-xs text-slate-800 bg-white">
                            <div className="flex flex-wrap justify-between gap-4">
                                <div>
                                    <div className="text-sm font-medium text-slate-900">{ETT.nombre}</div>
                                    <div className="text-slate-500">CIF {ETT.cif} · {ETT.direccion}</div>
                                    <div className="text-slate-500">Empresa de trabajo temporal autorizada n.º {ETT.autorizacion}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-base text-slate-900">{f.rectifica ? 'Factura rectificativa' : 'Factura'} {f.numero || '(borrador)'}</div>
                                    <div className="text-slate-500">Fecha: {fechaES(f.emision || hoyIso())}</div>
                                    {f.rectifica && <div className="text-slate-500">Rectifica: {f.rectifica}</div>}
                                </div>
                            </div>
                            <div className="rounded-md bg-slate-50 p-3">
                                <div className="text-[11px] text-slate-500">Cliente</div>
                                <div className="text-slate-900">{cliente.nombre} · CIF {cliente.cif}</div>
                                <div className="text-slate-600">{cliente.direccion}</div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[480px] text-left">
                                    <thead><tr className="border-b border-slate-300 text-[11px] text-slate-500"><th className="py-1.5 font-medium">Concepto</th><th className="py-1.5 pl-3 font-medium text-right">Cantidad</th><th className="py-1.5 pl-3 font-medium text-right">Precio</th><th className="py-1.5 pl-3 font-medium text-right">Importe</th></tr></thead>
                                    <tbody>{f.lineas.map(l => <tr key={l.id} className="border-b border-slate-100"><td className="py-1.5 pr-2">{l.concepto}</td><td className="py-1.5 pl-3 text-right whitespace-nowrap">{num(l.cantidad)} {l.unidad}</td><td className="py-1.5 pl-3 text-right whitespace-nowrap">{euros(l.precio)}</td><td className="py-1.5 pl-3 text-right whitespace-nowrap">{euros(redondear(l.cantidad * l.precio))}</td></tr>)}</tbody>
                                </table>
                            </div>
                            <dl className="ml-auto w-full sm:w-64 space-y-1">
                                <div className="flex justify-between"><dt>Base imponible</dt><dd>{euros(t.base)}</dd></div>
                                <div className="flex justify-between"><dt>IVA {cliente.iva} %</dt><dd>{euros(t.iva)}</dd></div>
                                <div className="flex justify-between border-t border-slate-300 pt-1 text-sm text-slate-900"><dt>Total</dt><dd>{euros(t.total)}</dd></div>
                            </dl>
                            {!f.rectifica && <div className="text-slate-600">Forma de pago: {cliente.pago.toLowerCase()} a {ETT.iban}. Vencimiento: {fechaES(f.vencimiento || vencimientoDe(cliente, hoyIso()))}.</div>}
                        </div>
                    </Modal>
                );
            })()}

            {/* AÑADIR LÍNEA */}
            {linea && f && (
                <Modal title="Añadir línea" subtitle="Por ejemplo, un desplazamiento o un ajuste pactado con el cliente" onClose={() => setLinea(null)} size="max-w-md"
                    footer={<>
                        <Button onClick={() => setLinea(null)}>Cancelar</Button>
                        <Button variant="primary" icon={Plus} disabled={!linea.concepto || !Number(linea.cantidad) || linea.precio === ''} onClick={() => {
                            actualizar(f.id, (x) => ({ lineas: [...x.lineas, { id: `m-${Date.now()}`, concepto: linea.concepto, cantidad: Number(linea.cantidad), unidad: 'ud.', precio: Number(linea.precio), manual: true }] }), `Línea añadida: ${linea.concepto}`);
                            setLinea(null);
                        }}>Añadir</Button>
                    </>}
                >
                    <div className="space-y-4 text-xs">
                        <Field label="Concepto"><TextInput value={linea.concepto} onChange={(e) => setLinea(l => ({ ...l, concepto: e.target.value }))} /></Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Cantidad"><TextInput type="number" step="0.01" value={linea.cantidad} onChange={(e) => setLinea(l => ({ ...l, cantidad: e.target.value }))} /></Field>
                            <Field label="Precio (€)" hint="En negativo para un descuento"><TextInput type="number" step="0.01" value={linea.precio} onChange={(e) => setLinea(l => ({ ...l, precio: e.target.value }))} /></Field>
                        </div>
                    </div>
                </Modal>
            )}
            {lineaAEliminar && f && (
                <Confirmar title="Quitar la línea" confirmLabel="Quitar" onClose={() => setLineaAEliminar(null)} onConfirm={() => {
                    actualizar(f.id, (x) => ({ lineas: x.lineas.filter(l => l.id !== lineaAEliminar.id) }), `Línea quitada: ${lineaAEliminar.concepto}`);
                    setLineaAEliminar(null);
                }}>
                    Se quita «{lineaAEliminar.concepto}» del borrador.
                </Confirmar>
            )}
            {descartar && f && (
                <Confirmar title="Descartar el borrador" confirmLabel="Descartar" onClose={() => setDescartar(false)} onConfirm={() => {
                    setFacturas(prev => prev.filter(x => x.id !== f.id));
                    setDescartar(false); setAbierta(null);
                    showToast('Borrador descartado. Las horas vuelven a «Por facturar».');
                }}>
                    Las horas vuelven a «Por facturar». No se ha emitido ninguna factura, así que no hace falta rectificativa.
                </Confirmar>
            )}

            {/* REGISTRAR COBRO */}
            {cobro && f && (
                <Modal title="Registrar cobro" subtitle={`${f.numero} · pendiente ${euros(totalesDe(f).pendiente)}`} onClose={() => setCobro(null)} size="max-w-md"
                    footer={<>
                        <Button onClick={() => setCobro(null)}>Cancelar</Button>
                        <Button variant="primary" icon={Wallet} disabled={!cobro.fecha || !(Number(cobro.importe) > 0)} onClick={confirmarCobro}>Registrar</Button>
                    </>}
                >
                    <div className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Fecha"><TextInput type="date" value={cobro.fecha} onChange={(e) => setCobro(c => ({ ...c, fecha: e.target.value }))} /></Field>
                            <Field label="Importe (€)"><TextInput type="number" step="0.01" value={cobro.importe} onChange={(e) => setCobro(c => ({ ...c, importe: e.target.value }))} /></Field>
                        </div>
                        <Field label="Nota (opcional)"><TextInput value={cobro.nota} onChange={(e) => setCobro(c => ({ ...c, nota: e.target.value }))} placeholder="Por ejemplo: transferencia" /></Field>
                        {Number(cobro.importe) > 0 && Number(cobro.importe) < totalesDe(f).pendiente && <Notice tone="info" icon={Info}>Cobro parcial: quedarán {euros(redondear(totalesDe(f).pendiente - Number(cobro.importe)))} pendientes.</Notice>}
                    </div>
                </Modal>
            )}

            {/* RECTIFICAR */}
            {rectificar && f && (
                <Modal title={`Rectificar ${f.numero}`} subtitle="Una factura emitida no se borra: se anula con una rectificativa" onClose={() => setRectificar(null)} size="max-w-md"
                    footer={<>
                        <Button onClick={() => setRectificar(null)}>Cancelar</Button>
                        <Button variant="primary" icon={FileMinus2} onClick={confirmarRectificacion}>Emitir rectificativa</Button>
                    </>}
                >
                    <div className="space-y-4 text-xs">
                        <Field label="Motivo">
                            <Select value={rectificar.motivo} onChange={(e) => setRectificar(r => ({ ...r, motivo: e.target.value }))} className="w-full">
                                {MOTIVOS_RECTIFICACION.map(m => <option key={m} value={m}>{m}</option>)}
                            </Select>
                        </Field>
                        <Field label="Nota (opcional)"><TextInput value={rectificar.nota} onChange={(e) => setRectificar(r => ({ ...r, nota: e.target.value }))} /></Field>
                        <label className="flex items-start gap-2 text-slate-700">
                            <input type="checkbox" checked={rectificar.nueva} onChange={(e) => setRectificar(r => ({ ...r, nueva: e.target.checked }))} className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                            Preparar un borrador nuevo con las mismas líneas para corregirlo y emitirlo
                        </label>
                        <Notice tone="info" icon={Info}>Se emite la rectificativa con las mismas líneas en negativo ({euros(-totalesDe(f).total)}) y la factura queda anulada.</Notice>
                    </div>
                </Modal>
            )}

            {toast && (
                <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-lg text-sm animate-fade-in max-w-md">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>{toast}</span>
                    <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white" aria-label="Cerrar aviso"><X className="w-4 h-4" /></button>
                </div>
            )}
        </>
    );
}
