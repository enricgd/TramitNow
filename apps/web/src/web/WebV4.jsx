// Web corporativa de TramitNow, versión 4 (web4.html). Parte de la versión 3 (Poppins, azules del logo, fondo cálido)
// y añade ideas de las webs de referencia del diseñador:
// - Stripe: portada con una banda de degradado en movimiento y un mosaico de módulos con miniaturas vivas.
// - 8am y Revolut: «Un mes en tu ETT», la maqueta queda fija y cambia paso a paso al bajar.
// - nomu: en el móvil, ese recorrido son pestañas con la pantalla de cada paso.
// - Indisea: las conexiones con la Administración, unidas a TramitNow con líneas que fluyen.
// - incredibles: grano muy suave de fondo y los pilares en tarjetas que se apilan.
// - developios y statusisup: pasos numerados .01 y etiquetas en letra monoespaciada.
// Sin librerías nuevas. Con «reducir movimiento», todo se ve quieto y el recorrido pasa a pestañas.
import React, { useEffect, useRef, useState } from 'react';
import {
    ArrowRight, Check, ChevronDown, Menu, X, Mail, Phone, MapPin, CheckCircle2, ShieldCheck, Eye, Sparkles, Timer,
    Calculator, Inbox, UserSearch, FileSignature, Clock, Receipt, Server, Lock, FileLock2, Plus, Bell, Smartphone, Building2,
} from 'lucide-react';
import { TEXTOS, CONTACTO } from './textos';
import { TEXTOS_PERK } from './textosPerk';
import { TEXTOS_V4 } from './textosV4';
import { MAQUETAS, EttsSeparadas } from './WebCorporativa';
import { Aparece, Contador, IconoDibujado, TarjetaViva, TextoQueSeIlumina, useVisible, useProgresoScroll, movimientoReducido } from './animaciones';

const MONO = { fontFamily: "'IBM Plex Mono', ui-monospace, monospace" };
const ICONOS_PASOS = [Calculator, Inbox, UserSearch, FileSignature, Clock, Receipt];
const ICONOS_PILARES = [ShieldCheck, Eye, Sparkles, Timer];
const ICONOS_SEGURIDAD = [Server, Lock, FileLock2, ShieldCheck];
const BIEN = ['Hecho', 'Confirmada', 'Al día', 'Aceptado'];
const TONO = { ok: 'bg-emerald-50 text-emerald-700', azul: 'bg-sky-50 text-sky-700', aviso: 'bg-amber-50 text-amber-700' };
const FORM_VACIO = { nombre: '', ett: '', email: '', telefono: '', sucursales: '0', mensaje: '', privacidad: false };
const DEGRADADO = 'bg-[linear-gradient(145deg,#003A70,#155b8e_62%,#1b7c9f)]';
const leerIdioma = () => { try { return localStorage.getItem('tramitnow-idioma') === 'ca' ? 'ca' : 'es'; } catch { return 'es'; } };
// Posición de cada conexión alrededor de TramitNow (en un lienzo de 1000 × 560)
const NODOS = [[500, 60], [800, 120], [920, 280], [800, 440], [500, 500], [200, 440], [80, 280], [200, 120]];

// Pantalla ancha (para el recorrido fijo al hacer scroll)
function useAncho(minimo = 1024) {
    const [ancho, setAncho] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= minimo : true));
    useEffect(() => {
        const medir = () => setAncho(window.innerWidth >= minimo);
        window.addEventListener('resize', medir);
        return () => window.removeEventListener('resize', medir);
    }, [minimo]);
    return ancho;
}

// Avance (0 a 1) dentro de una sección alta con un bloque fijo: 0 al llegar arriba, 1 al terminar
function useAvanceFijo(activo) {
    const ref = useRef(null);
    const [avance, setAvance] = useState(0);
    useEffect(() => {
        if (!activo) return undefined;
        let pendiente = false;
        const medir = () => {
            pendiente = false;
            const el = ref.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            const recorrido = r.height - window.innerHeight;
            setAvance(Math.max(0, Math.min(1, recorrido > 0 ? -r.top / recorrido : 0)));
        };
        const alMover = () => { if (!pendiente) { pendiente = true; requestAnimationFrame(medir); } };
        medir();
        window.addEventListener('scroll', alMover, { passive: true });
        window.addEventListener('resize', alMover);
        return () => { window.removeEventListener('scroll', alMover); window.removeEventListener('resize', alMover); };
    }, [activo]);
    return [ref, avance];
}

export default function WebV4() {
    const [idioma, setIdioma] = useState(leerIdioma);
    const [abierta, setAbierta] = useState(0);
    const [menuMovil, setMenuMovil] = useState(false);
    const [compacta, setCompacta] = useState(false);
    const [barra, setBarra] = useState(false);
    const [form, setForm] = useState(FORM_VACIO);
    const [enviado, setEnviado] = useState(false);
    const [pasoMovil, setPasoMovil] = useState(0);
    const [aviso, setAviso] = useState(0);
    const t = TEXTOS[idioma];
    const p = TEXTOS_PERK[idioma];
    const v = TEXTOS_V4[idioma];

    const ancho = useAncho();
    const fijo = ancho && !movimientoReducido(); // recorrido fijo al bajar, o pestañas
    const [mesRef, avance] = useAvanceFijo(fijo);
    const paso = Math.min(5, Math.floor(avance * 6));
    const [mosaicoRef, mosaicoVisible] = useVisible(0.2);
    const [empezarRef, progresoEmpezar] = useProgresoScroll();

    const progresoRef = useRef(null);
    const heroRef = useRef(null);
    const demoRef = useRef(null);
    const pieRef = useRef(null);

    useEffect(() => { document.documentElement.lang = idioma; }, [idioma]);

    // Scroll: cabecera compacta y barra de progreso
    useEffect(() => {
        let pendiente = false;
        const alMover = () => {
            if (pendiente) return;
            pendiente = true;
            requestAnimationFrame(() => {
                pendiente = false;
                const y = window.scrollY;
                setCompacta(y > 24);
                const total = document.documentElement.scrollHeight - window.innerHeight;
                if (progresoRef.current) progresoRef.current.style.transform = `scaleX(${total > 0 ? y / total : 0})`;
            });
        };
        alMover();
        window.addEventListener('scroll', alMover, { passive: true });
        return () => window.removeEventListener('scroll', alMover);
    }, []);

    // Barra inferior: después de la portada, salvo en el formulario y el pie
    useEffect(() => {
        if (!('IntersectionObserver' in window)) return undefined;
        const vistos = new Map();
        const io = new IntersectionObserver((entradas) => {
            entradas.forEach(e => vistos.set(e.target, e.isIntersecting));
            setBarra(![...vistos.values()].some(Boolean));
        });
        [heroRef, demoRef, pieRef].forEach(r => { if (r.current) { vistos.set(r.current, r === heroRef); io.observe(r.current); } });
        return () => io.disconnect();
    }, []);

    // Avisos del mosaico: van pasando mientras se ve
    useEffect(() => {
        if (!mosaicoVisible || movimientoReducido()) return undefined;
        const id = setInterval(() => setAviso(a => (a + 1) % 4), 2600);
        return () => clearInterval(id);
    }, [mosaicoVisible]);

    const cambiarIdioma = (i) => { setIdioma(i); try { localStorage.setItem('tramitnow-idioma', i); } catch { /* sin almacenamiento */ } };
    // Desde la lista del recorrido: baja hasta ese paso
    const irAPaso = (i) => {
        const el = mesRef.current;
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: top + ((i + 0.5) / 6) * (el.offsetHeight - window.innerHeight), behavior: 'smooth' });
    };
    const enlaces = [['producto', '#producto'], ['recorrido', '#mes'], ['conexiones', '#conexiones'], ['seguridad', '#seguridad'], ['contacto', '#demo']];
    const formOk = form.nombre.trim() && form.ett.trim() && /\S+@\S+\.\S+/.test(form.email) && form.privacidad;

    const boton = 'inline-flex items-center justify-center gap-2 rounded-full px-6 h-12 font-medium text-[15px] transition whitespace-nowrap';
    const botonPrincipal = `${boton} bg-[#1769aa] text-white shadow-[0_8px_20px_rgba(23,105,170,0.25)] hover:bg-[#10598f] hover:-translate-y-px`;
    const titulo = (texto, extra = '', claro = false) => <h2 className={`text-[32px] md:text-[48px] leading-[1.1] font-semibold tracking-[-0.035em] ${claro ? 'text-white' : 'text-[#003A70]'} ${extra}`}>{texto}</h2>;
    const etiqueta = (texto, claro = false) => <div style={MONO} className={`text-[12px] font-medium uppercase tracking-[0.14em] ${claro ? 'text-sky-300' : 'text-[#4197CB]'}`}>{texto}</div>;

    const maqueta = (m) => (
        <div className="rounded-2xl bg-white border border-[#E6E1D6] shadow-[0_20px_50px_rgba(0,58,112,0.10)] overflow-hidden text-left">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-900 truncate">{m.titulo}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${TONO[m.estado[1]]}`}>{m.estado[0]}</span>
            </div>
            <div className="px-4 py-2">
                <div className="grid grid-cols-[1.6fr_1fr_1fr] gap-2 py-1.5 text-[11px] text-slate-400">{m.cabecera.map((c, i) => <span key={i} className={i === 2 ? 'text-right' : ''}>{c}</span>)}</div>
                {m.filas.map((f, i) => (
                    <div key={i} className="grid grid-cols-[1.6fr_1fr_1fr] gap-2 py-2 border-t border-slate-100 text-[13px] animate-fade-in" style={{ animationDelay: `${100 + i * 100}ms`, animationFillMode: 'both' }}>
                        <span className="text-slate-800 truncate">{f[0]}</span>
                        <span className={BIEN.includes(f[1]) ? 'text-emerald-700' : 'text-slate-600'}>{BIEN.includes(f[1]) && <Check className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />}{f[1]}</span>
                        <span className={`text-right ${BIEN.includes(f[2]) ? 'text-emerald-700' : ['Por cubrir', 'Falta el carné'].includes(f[2]) ? 'text-amber-700' : 'text-slate-800'}`}>{f[2]}</span>
                    </div>
                ))}
            </div>
            {m.pie && <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-600">{m.pie}</div>}
        </div>
    );

    // El ERP en el navegador (portada)
    const producto = () => (
        <div className="rounded-2xl bg-white ring-1 ring-black/5 shadow-[0_40px_90px_rgba(0,30,70,0.35)] overflow-hidden">
            <div className="flex items-center gap-1.5 px-3 py-2.5 bg-[#FAF8F4] border-b border-slate-100">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-300" /><span className="w-2.5 h-2.5 rounded-full bg-amber-300" /><span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
                <span className="mx-auto w-44 sm:w-60 rounded-md bg-white border border-slate-200 px-2 py-0.5 text-center text-[10px] text-slate-400">app.tramitnow.com</span>
            </div>
            <div className="flex text-left">
                <div className="hidden sm:block w-32 bg-[#0f1b33] p-3 space-y-1.5">
                    <img src="/logo-tramitnow.svg" alt="" className="h-4 brightness-0 invert mb-4" />
                    {['Inicio', 'Presupuestos', 'Peticiones', 'Candidatos', 'Contratos', 'Horas', 'Facturación'].map((x, i) => <div key={x} className={`rounded-md px-2 py-1.5 text-[10px] ${i === 0 ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>{x}</div>)}
                </div>
                <div className="flex-1 p-4 sm:p-5 space-y-3.5 min-w-0">
                    <div><div className="text-[15px] font-semibold text-slate-900">Buenos días, Begoña</div><div className="text-[10px] text-slate-500">Delegación Norte</div></div>
                    <div className="grid grid-cols-2 gap-2">
                        {[['Peticiones abiertas', '4', 'bg-indigo-500'], ['En misión hoy', '13', 'bg-emerald-500'], ['Partes por validar', '1', 'bg-amber-500'], ['Por cobrar', '40.247 €', 'bg-sky-500']].map(([l, val, c]) => (
                            <div key={l} className="rounded-lg border border-slate-200 p-2.5"><div className="flex items-center gap-1 text-[9px] text-slate-500"><span className={`w-1.5 h-1.5 rounded-full ${c}`} />{l}</div><div className="text-base font-semibold text-slate-900 mt-0.5">{val}</div></div>
                        ))}
                    </div>
                    <div className="rounded-lg border border-slate-200">
                        {[['PET-2026-0050 · Carretillero/a', '2 de 4', 'bg-indigo-500 w-1/2'], ['PET-2026-0044 · Camarero/a de sala', '9 de 10', 'bg-emerald-500 w-[90%]'], ['PET-2026-0045 · Ayudante de cocina', '4 de 4', 'bg-emerald-500 w-full']].map(([a, b, c]) => (
                            <div key={a} className="flex items-center gap-3 px-3 py-2.5 border-b border-slate-100 last:border-0 text-[11px]">
                                <span className="flex-1 text-slate-700 truncate">{a}</span>
                                <span className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden"><span className={`block h-full rounded-full ${c}`} /></span>
                                <span className="w-10 text-right text-slate-500">{b}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    // Pantalla de un paso del recorrido, con el resultado que aparece encima
    const pantallaPaso = (i) => (
        <div key={i} className="relative animate-fade-in">
            {maqueta(MAQUETAS[i])}
            <div className="absolute -bottom-6 -left-4 sm:-left-8 resultado">
                <div className="flex items-center gap-2.5 rounded-2xl bg-white border border-[#E6E1D6] shadow-[0_16px_40px_rgba(0,58,112,0.16)] pl-2.5 pr-4 py-2.5">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-50 text-emerald-600"><CheckCircle2 className="w-4 h-4" /></span>
                    <span><span className="block text-[13px] font-medium text-slate-800">{v.mes.resultados[i]}</span><span className="block text-[11px] text-slate-400">{v.mes.ahora}</span></span>
                </div>
            </div>
        </div>
    );

    // Tarjeta del mosaico
    const tesela = (clase, [tit, txt], contenido, oscura = false) => (
        <TarjetaViva className={`h-full rounded-[28px] overflow-hidden flex flex-col ${oscura ? `${DEGRADADO} text-white` : 'bg-[#F1EDE4]'} ${clase}`}>
            <div className="p-6 md:p-7">
                <h3 className={`text-[20px] md:text-[22px] leading-tight font-semibold tracking-[-0.02em] ${oscura ? 'text-white' : 'text-[#003A70]'}`}>{tit}</h3>
                <p className={`mt-2 text-[15px] leading-relaxed ${oscura ? 'text-white/75' : 'text-[#003A70]/70'}`}>{txt}</p>
            </div>
            <div className="mt-auto px-6 md:px-7 pb-6 md:pb-7">{contenido}</div>
        </TarjetaViva>
    );
    const vivo = mosaicoVisible ? 'vivo' : '';

    return (
        <div className="min-h-screen bg-[#FAF8F4] text-[#2a3a4f]" style={{ fontFamily: "'Poppins', ui-sans-serif, system-ui, sans-serif" }}>
            {/* Grano muy suave sobre toda la página */}
            <div className="grano pointer-events-none fixed inset-0 z-30" aria-hidden="true" />
            {/* Progreso de lectura */}
            <div ref={progresoRef} className="fixed top-0 inset-x-0 h-[3px] z-50 origin-left bg-[linear-gradient(90deg,#003A70,#1769aa,#4197CB)]" style={{ transform: 'scaleX(0)' }} />

            {/* Barra de la demo */}
            <div className="bg-[#0E2238] text-slate-300 text-xs">
                <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
                    <span>{v.barraDemo}</span>
                    <span className="flex gap-4"><a href="/web.html" className="text-sky-300 hover:text-white">Versión 1</a><a href="/web2.html" className="text-sky-300 hover:text-white">Versión 2</a><a href="/web3.html" className="text-sky-300 hover:text-white">Versión 3</a><a href="/" className="text-sky-300 hover:text-white">ERP</a></span>
                </div>
            </div>

            {/* CABECERA FLOTANTE */}
            <div className={`sticky top-0 z-40 px-3 transition-all duration-300 ${compacta ? 'pt-2' : 'pt-4'} -mb-[72px]`}>
                <header className={`max-w-6xl mx-auto rounded-full border transition-all duration-300 ${compacta ? 'bg-white/90 border-[#E6E1D6] shadow-[0_8px_30px_rgba(0,58,112,0.08)] backdrop-blur' : 'bg-white/15 border-white/25 backdrop-blur'}`}>
                    <div className="flex items-center gap-6 pl-5 pr-2 h-14">
                        <a href="#inicio" className="shrink-0"><img src="/logo-tramitnow.svg" alt="TramitNow" className={`h-6 w-auto transition ${compacta ? '' : 'brightness-0 invert'}`} /></a>
                        <nav className={`hidden lg:flex items-center gap-5 whitespace-nowrap text-[14px] ${compacta ? 'text-[#003A70]/75' : 'text-white/85'}`}>
                            {enlaces.map(([k, href]) => <a key={k} href={href} className={compacta ? 'hover:text-[#003A70]' : 'hover:text-white'}>{v.menu[k]}</a>)}
                        </nav>
                        <div className="ml-auto flex items-center gap-2 sm:gap-3">
                            <div className="flex rounded-full border border-[#E6E1D6] bg-white p-0.5 text-xs" role="group" aria-label="Idioma">
                                {['es', 'ca'].map(i => <button key={i} type="button" onClick={() => cambiarIdioma(i)} aria-pressed={idioma === i} className={`px-2.5 py-1 rounded-full font-medium ${idioma === i ? 'bg-[#003A70] text-white' : 'text-[#003A70]/60 hover:text-[#003A70]'}`}>{i.toUpperCase()}</button>)}
                            </div>
                            <a href="/" className={`hidden md:inline text-[14px] font-medium hover:underline ${compacta ? 'text-[#003A70]' : 'text-white'}`}>{t.acceder}</a>
                            <span className="hidden md:block"><a href="#demo" className={`${botonPrincipal} h-10 px-5 text-sm`}>{t.demo}</a></span>
                            <button type="button" className={`lg:hidden p-2 ${compacta ? 'text-[#003A70]' : 'text-white'}`} aria-label="Menú" aria-expanded={menuMovil} onClick={() => setMenuMovil(!menuMovil)}>{menuMovil ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
                        </div>
                    </div>
                </header>
                {menuMovil && (
                    <nav className="lg:hidden max-w-6xl mx-auto mt-2 rounded-3xl bg-white border border-[#E6E1D6] shadow-lg px-5 py-4 space-y-1">
                        {enlaces.map(([k, href]) => <a key={k} href={href} onClick={() => setMenuMovil(false)} className="block py-2 text-[#003A70]">{v.menu[k]}</a>)}
                        <a href="/" className="block py-2 font-medium text-[#003A70]">{t.acceder}</a>
                        <a href="#demo" onClick={() => setMenuMovil(false)} className={`${botonPrincipal} w-full mt-2`}>{t.demo}</a>
                    </nav>
                )}
            </div>

            {/* PORTADA: banda de degradado en movimiento, cortada en diagonal, con la aplicación encima */}
            <section id="inicio" ref={heroRef} className="relative">
                <div className="banda absolute inset-0 overflow-hidden" aria-hidden="true">
                    <span className="mancha absolute -top-40 -left-24 w-[560px] h-[560px] rounded-full bg-[#4197CB]/55 blur-3xl" />
                    <span className="mancha mancha-2 absolute top-10 right-[-10%] w-[620px] h-[620px] rounded-full bg-[#2bb3c0]/35 blur-3xl" />
                    <span className="mancha mancha-3 absolute bottom-[-30%] left-[30%] w-[520px] h-[520px] rounded-full bg-[#7c6cf2]/25 blur-3xl" />
                </div>
                <div className="relative max-w-6xl mx-auto px-4 pt-32 md:pt-40 pb-24 lg:pb-32 grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] gap-12 items-center">
                    <div>
                        <Aparece><div style={MONO} className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3.5 py-1.5 text-[12px] uppercase tracking-[0.12em] text-white"><span className="w-1.5 h-1.5 rounded-full bg-sky-300" />{t.hero.etiqueta}</div></Aparece>
                        <Aparece retraso={120}><h1 className="text-[40px] sm:text-[56px] md:text-[66px] leading-[1.03] font-semibold tracking-[-0.045em] text-white mt-6">{v.hero.titulo}<span className="text-sky-300">.</span></h1></Aparece>
                        <Aparece retraso={260}><p className="text-lg md:text-xl text-white/80 mt-6 max-w-xl">{v.hero.texto}</p></Aparece>
                        <Aparece retraso={400}>
                            <div className="flex flex-col sm:flex-row gap-3 mt-9 max-w-md sm:max-w-none">
                                <a href="#demo" className={`${boton} bg-white text-[#003A70] shadow-[0_8px_24px_rgba(0,20,50,0.25)] hover:-translate-y-px`}>{t.demo}<ArrowRight className="w-4 h-4" /></a>
                                <a href="#mes" className={`${boton} border border-white/40 text-white hover:bg-white/10`}>{t.hero.secundario}<ChevronDown className="w-4 h-4" /></a>
                            </div>
                            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-6 text-sm text-white/75">{t.hero.notas.map(n => <span key={n} className="inline-flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-sky-300" />{n}</span>)}</div>
                        </Aparece>
                    </div>
                    <Aparece retraso={300} className="relative lg:translate-y-16">
                        <div className="levita">{producto()}</div>
                        <div className="hidden sm:block absolute -left-8 -bottom-8">
                            <div className="bambolea flex items-center gap-2.5 rounded-2xl bg-white border border-[#E6E1D6] shadow-[0_16px_40px_rgba(0,58,112,0.18)] pl-2.5 pr-4 py-2.5">
                                <span className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-50 text-emerald-600"><CheckCircle2 className="w-4 h-4" /></span>
                                <span><span className="block text-[13px] font-medium text-slate-800 whitespace-nowrap">{t.avisos[0]}</span><span className="block text-[11px] text-slate-400">{v.mes.ahora}</span></span>
                            </div>
                        </div>
                    </Aparece>
                </div>
            </section>

            {/* PREPARADO PARA: sellos en letra monoespaciada */}
            <section className="max-w-6xl mx-auto px-4 pt-16 md:pt-24">
                <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-10">
                    <span style={MONO} className="shrink-0 text-[12px] uppercase tracking-[0.14em] text-[#003A70]/50">{v.preparado}</span>
                    <div className="flex flex-wrap gap-x-8 gap-y-3">{v.sellos.map(s => <span key={s} className="text-[17px] font-semibold tracking-[-0.01em] text-[#003A70]/45">{s}</span>)}</div>
                </div>
            </section>

            {/* MANIFIESTO */}
            <section className="max-w-5xl mx-auto px-4 py-24 md:py-32">
                <TextoQueSeIlumina texto={t.manifiesto} className="text-[26px] md:text-[44px] leading-[1.25] font-semibold tracking-[-0.03em] text-center" />
            </section>

            {/* UN MES EN TU ETT: en pantalla ancha, la maqueta queda fija y cambia al bajar; si no, pestañas */}
            <section id="mes" className="scroll-mt-24">
                {fijo ? (
                    <div ref={mesRef} style={{ height: '520vh' }} className="relative">
                        <div className="sticky top-0 h-screen flex items-center pt-16">
                            <div className="max-w-6xl w-full mx-auto px-4 grid grid-cols-[0.95fr_1.05fr] gap-14 items-center">
                                <div>
                                    {etiqueta(v.mes.etiqueta)}
                                    {titulo(v.mes.titulo, 'mt-3 !text-[40px]')}
                                    <p className="text-[#003A70]/60 mt-3">{v.mes.texto}</p>
                                    <ol className="mt-8 relative">
                                        <span className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-[#E6E1D6] rounded-full" />
                                        <span className="absolute left-[19px] top-2 w-0.5 bg-[linear-gradient(180deg,#1769aa,#4197CB)] rounded-full transition-[height] duration-300" style={{ height: `calc(${avance * 100}% - 16px)` }} />
                                        {t.recorrido.pasos.map((x, i) => {
                                            const Icono = ICONOS_PASOS[i];
                                            const activo = i === paso;
                                            return (
                                                <li key={x.corto} className="relative">
                                                    <button type="button" onClick={() => irAPaso(i)} className="w-full flex items-start gap-4 py-2 text-left">
                                                        <span className={`relative z-10 w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all duration-500 ${i <= paso ? 'bg-[#1769aa] text-white' : 'bg-white text-slate-400 ring-2 ring-[#E6E1D6]'} ${activo ? 'shadow-[0_0_0_6px_rgba(65,151,203,0.2)]' : ''}`}><Icono className="w-4 h-4" /></span>
                                                        <span className="min-w-0 pt-2">
                                                            <span className={`flex items-baseline gap-2 transition-colors ${activo ? 'text-[#003A70]' : 'text-[#003A70]/45'}`}>
                                                                <span style={MONO} className="text-[12px]">.0{i + 1}</span>
                                                                <span className="text-[17px] font-semibold">{x.corto}</span>
                                                            </span>
                                                            <span className={`grid transition-all duration-500 ${activo ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0'}`}>
                                                                <span className="overflow-hidden text-[15px] text-[#003A70]/70 leading-relaxed">{x.texto}</span>
                                                            </span>
                                                        </span>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ol>
                                </div>
                                <div className="relative rounded-[32px] bg-[#F1EDE4] p-10 min-h-[440px] flex items-center">
                                    <span style={MONO} className="absolute top-6 right-8 text-[12px] text-[#003A70]/40">{String(paso + 1).padStart(2, '0')} / 06</span>
                                    <div className="w-full">{pantallaPaso(paso)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-6xl mx-auto px-4 py-8">
                        {etiqueta(v.mes.etiqueta)}
                        {titulo(v.mes.titulo, 'mt-3')}
                        <div className="mt-8 flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 [scrollbar-width:none]" role="tablist">
                            {t.recorrido.pasos.map((x, i) => {
                                const Icono = ICONOS_PASOS[i];
                                return (
                                    <button key={x.corto} type="button" role="tab" aria-selected={pasoMovil === i} onClick={() => setPasoMovil(i)} className={`shrink-0 flex items-center gap-2 rounded-2xl px-4 py-3 text-left transition ${pasoMovil === i ? 'bg-white shadow-[0_8px_24px_rgba(0,58,112,0.10)] text-[#003A70]' : 'text-[#003A70]/60'}`}>
                                        <Icono className="w-4 h-4" /><span className="text-[14px] font-medium whitespace-nowrap">{x.corto}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-4 rounded-[28px] bg-[#F1EDE4] p-5 sm:p-8">
                            <div style={MONO} className="text-[12px] text-[#4197CB]">.0{pasoMovil + 1}</div>
                            <h3 className="text-[24px] leading-tight font-semibold tracking-[-0.02em] text-[#003A70] mt-1">{t.recorrido.pasos[pasoMovil].titulo}</h3>
                            <p className="text-[#003A70]/70 mt-2 leading-relaxed">{t.recorrido.pasos[pasoMovil].texto}</p>
                            <div className="mt-6 pb-6 pl-4 sm:pl-8">{pantallaPaso(pasoMovil)}</div>
                        </div>
                    </div>
                )}
            </section>

            {/* MOSAICO DE MÓDULOS con miniaturas vivas */}
            <section id="producto" ref={mosaicoRef} className={`scroll-mt-24 max-w-6xl mx-auto px-4 py-24 md:py-32 ${vivo}`}>
                <Aparece className="max-w-2xl">
                    {etiqueta(v.mosaico.etiqueta)}
                    {titulo(v.mosaico.titulo, 'mt-3')}
                    <p className="text-lg text-[#003A70]/65 mt-4">{v.mosaico.texto}</p>
                </Aparece>
                <div className="mt-12 grid grid-cols-1 md:grid-cols-6 gap-4">
                    {/* Margen: barras que crecen */}
                    <Aparece className="md:col-span-4">
                        {tesela('', v.mosaico.margen, (
                            <div className="flex items-end gap-6">
                                <div className="flex-1 flex items-end gap-2 h-32">
                                    {[48, 62, 55, 74, 68, 88, 80].map((h, i) => (
                                        <span key={i} className="flex-1 rounded-t-lg bg-[linear-gradient(180deg,#4197CB,#1769aa)] crece" style={{ height: `${h}%`, animationDelay: `${i * 90}ms` }} />
                                    ))}
                                </div>
                                <div className="text-right">
                                    <div className="text-5xl font-semibold tracking-[-0.04em] text-[#003A70]">{mosaicoVisible ? <Contador hasta={15} sufijo=" %" /> : '0 %'}</div>
                                    <div style={MONO} className="text-[12px] uppercase tracking-[0.12em] text-[#003A70]/50 mt-1">{v.mosaico.margenMedio}</div>
                                </div>
                            </div>
                        ))}
                    </Aparece>
                    {/* Firma: el trazo se dibuja */}
                    <Aparece retraso={100} className="md:col-span-2">
                        {tesela('', v.mosaico.firma, (
                            <div className="rounded-2xl bg-white border border-[#E6E1D6] p-4">
                                <div className="text-[11px] text-slate-400">CPD · PET-2026-0050 · Unai García Zabaleta</div>
                                <svg viewBox="0 0 240 70" className="w-full h-16 mt-1" aria-hidden="true">
                                    <path className="firma-trazo" d="M8 48 C 28 10, 40 64, 58 34 S 86 20, 96 44 S 120 58, 132 30 C 140 14, 150 54, 168 40 S 196 22, 232 36" fill="none" stroke="#003A70" strokeWidth="2.4" strokeLinecap="round" />
                                </svg>
                                <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[12px]"><span className="text-slate-500">13/11/2026 · 10:42</span><span className="sello-firmado inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700"><Check className="w-3 h-3" />{v.mosaico.firmado}</span></div>
                            </div>
                        ))}
                    </Aparece>
                    {/* Horas: las casillas se rellenan */}
                    <Aparece className="md:col-span-2">
                        {tesela('', v.mosaico.horas, (
                            <div className="rounded-2xl bg-white border border-[#E6E1D6] p-4">
                                <div className="grid grid-cols-[1fr_repeat(5,28px)] gap-1.5 text-[11px] text-slate-400 mb-1.5"><span />{v.mosaico.dias.map(d => <span key={d} className="text-center">{d}</span>)}</div>
                                {['Garazi U.', 'Daniel S.', 'Irene C.'].map((n, f) => (
                                    <div key={n} className="grid grid-cols-[1fr_repeat(5,28px)] gap-1.5 items-center py-0.5">
                                        <span className="text-[12px] text-slate-700 truncate">{n}</span>
                                        {[8, 8, 8, 8, 6].map((h, d) => <span key={d} className="casilla h-7 rounded-md flex items-center justify-center text-[11px] font-medium" style={{ animationDelay: `${(f * 5 + d) * 160}ms` }}>{h}</span>)}
                                    </div>
                                ))}
                                <div className="sello-firmado mt-2.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[12px] font-medium text-emerald-700" style={{ animationDelay: '2.6s' }}><Check className="w-3 h-3" />{v.mosaico.validado}</div>
                            </div>
                        ))}
                    </Aparece>
                    {/* Factura: líneas y total */}
                    <Aparece retraso={100} className="md:col-span-2">
                        {tesela('', v.mosaico.factura, (
                            <div className="rounded-2xl bg-white border border-[#E6E1D6] p-4 text-[12px]">
                                <div className="flex justify-between text-slate-400"><span>F2026-0108</span><span>Octubre 2026</span></div>
                                {v.mosaico.lineas.map(([c, imp], i) => (
                                    <div key={c} className="linea-factura flex justify-between gap-2 py-1.5 border-t border-slate-100 mt-1.5" style={{ animationDelay: `${300 + i * 350}ms` }}><span className="text-slate-700 truncate">{c}</span><span className="text-slate-900 whitespace-nowrap">{imp}</span></div>
                                ))}
                                <div className="flex justify-between pt-2 mt-1 border-t border-slate-200 font-semibold text-[#003A70]"><span>{v.mosaico.base}</span><span>{mosaicoVisible ? <><Contador hasta={18659} duracion={1800} />,80 €</> : '0,00 €'}</span></div>
                            </div>
                        ))}
                    </Aparece>
                    {/* Portal del trabajador: avisos que llegan al móvil */}
                    <Aparece retraso={200} className="md:col-span-2">
                        {tesela('', v.mosaico.portal, (
                            <div className="mx-auto w-[190px] rounded-[26px] bg-[#0f1b33] p-1.5 shadow-[0_20px_40px_rgba(0,0,0,0.25)]">
                                <div className="rounded-[21px] bg-slate-50 px-2.5 py-3 space-y-2 min-h-[150px]">
                                    <div className="flex items-center gap-1.5"><Smartphone className="w-3 h-3 text-indigo-600" /><span className="text-[9px] font-semibold text-slate-700">ETT Global People</span></div>
                                    {v.mosaico.notificaciones.map((n, i) => (
                                        <div key={n} className="notifica rounded-lg bg-white border border-slate-200 px-2 py-1.5 text-[9px] text-slate-800 flex items-center gap-1.5" style={{ animationDelay: `${i * 0.9}s` }}><Bell className="w-2.5 h-2.5 text-indigo-600 shrink-0" />{n}</div>
                                    ))}
                                </div>
                            </div>
                        ), true)}
                    </Aparece>
                    {/* Sucursales */}
                    <Aparece className="md:col-span-3">
                        {tesela('', v.mosaico.sucursales, (
                            <div className="space-y-3">
                                {v.mosaico.listaSucursales.map(([n, num], i) => (
                                    <div key={n} className="flex items-center gap-3 text-[14px]">
                                        <span className="relative w-2.5 h-2.5"><span className="absolute inset-0 rounded-full bg-emerald-500" /><span className="late absolute inset-0 rounded-full bg-emerald-400" style={{ animationDelay: `${i * 0.6}s` }} /></span>
                                        <span className="w-36 text-[#003A70] truncate">{n}</span>
                                        <span className="flex-1 h-2 rounded-full bg-white overflow-hidden"><span className="crece-ancho block h-full rounded-full bg-[linear-gradient(90deg,#1769aa,#4197CB)]" style={{ width: `${(num / 13) * 100}%`, animationDelay: `${i * 150}ms` }} /></span>
                                        <span className="w-24 text-right text-[#003A70]/70">{num} {v.mosaico.enMision}</span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </Aparece>
                    {/* Avisos que van pasando */}
                    <Aparece retraso={100} className="md:col-span-3">
                        {tesela('', v.mosaico.avisos, (
                            <div className="relative h-[124px]">
                                {v.mosaico.listaAvisos.map((a, i) => {
                                    const pos = (i - aviso + 4) % 4; // 0 delante, 1 y 2 detrás, 3 saliendo
                                    return (
                                        <div key={a} className="absolute inset-x-0 top-0 transition-all duration-700 ease-out" style={{ transform: `translateY(${pos * 14}px) scale(${1 - pos * 0.05})`, opacity: pos === 3 ? 0 : 1 - pos * 0.25, zIndex: 4 - pos }}>
                                            <div className="flex items-center gap-3 rounded-2xl bg-white border border-[#E6E1D6] px-4 py-3 shadow-[0_10px_30px_rgba(0,58,112,0.08)]">
                                                <span className={`w-8 h-8 rounded-full flex items-center justify-center ${i === 0 || i === 3 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}><Bell className="w-4 h-4" /></span>
                                                <span className="text-[14px] font-medium text-slate-800">{a}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </Aparece>
                </div>
            </section>

            {/* CONEXIONES: TramitNow en el centro y líneas que fluyen hacia cada servicio */}
            <section id="conexiones" className={`scroll-mt-24 ${DEGRADADO} relative overflow-hidden`}>
                <span className="absolute w-[720px] h-[720px] -right-[260px] -top-[300px] rounded-full border border-white/10" />
                <div className="relative max-w-6xl mx-auto px-4 py-24 md:py-28">
                    <Aparece className="max-w-3xl">
                        {etiqueta(v.conexiones.etiqueta, true)}
                        {titulo(v.conexiones.titulo, 'mt-3', true)}
                        <p className="text-lg text-white/70 mt-4">{v.conexiones.texto}</p>
                    </Aparece>
                    {/* Pantalla ancha: el dibujo */}
                    <div className="hidden lg:block relative mt-14 aspect-[1000/560]">
                        <svg viewBox="0 0 1000 560" className="absolute inset-0 w-full h-full" aria-hidden="true">
                            {NODOS.map(([x, y], i) => (
                                <g key={i}>
                                    <line x1="500" y1="280" x2={x} y2={y} stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
                                    <line className="fluye" x1="500" y1="280" x2={x} y2={y} stroke="rgba(125,211,252,0.7)" strokeWidth="1.5" />
                                    {!movimientoReducido() && (
                                        <circle r="3.5" fill="#7dd3fc">
                                            <animateMotion dur={`${2.6 + (i % 3) * 0.5}s`} repeatCount="indefinite" begin={`${i * 0.35}s`} path={`M500 280 L${x} ${y}`} />
                                        </circle>
                                    )}
                                </g>
                            ))}
                        </svg>
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                            <span className="late absolute inset-[-18px] rounded-[32px] bg-sky-300/20" />
                            <div className="relative rounded-[28px] bg-white px-8 py-6 shadow-[0_30px_70px_rgba(0,20,50,0.4)]"><img src="/logo-tramitnow.svg" alt="TramitNow" className="h-8 w-auto" /></div>
                        </div>
                        {v.conexiones.nodos.map(([n, d], i) => (
                            <div key={n} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${NODOS[i][0] / 10}%`, top: `${(NODOS[i][1] / 560) * 100}%` }}>
                                <Aparece retraso={i * 90}>
                                    <div className="rounded-2xl bg-[#0b3f6b] border border-white/25 shadow-[0_12px_30px_rgba(0,20,50,0.3)] px-4 py-2.5 text-center min-w-[150px]">
                                        <div className="text-[15px] font-semibold text-white">{n}</div>
                                        <div className="text-[12px] text-white/65">{d}</div>
                                    </div>
                                </Aparece>
                            </div>
                        ))}
                    </div>
                    {/* Móvil y tablet: lista */}
                    <div className="lg:hidden mt-10">
                        <div className="rounded-[24px] bg-white px-6 py-5 flex justify-center"><img src="/logo-tramitnow.svg" alt="TramitNow" className="h-7 w-auto" /></div>
                        <div className="mx-auto w-0.5 h-8 bg-white/30" />
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {v.conexiones.nodos.map(([n, d]) => (
                                <div key={n} className="rounded-2xl bg-white/10 border border-white/20 px-4 py-3">
                                    <div className="text-[15px] font-semibold text-white">{n}</div>
                                    <div className="text-[12px] text-white/65">{d}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* PILARES: tarjetas que se apilan al bajar */}
            <section className="max-w-6xl mx-auto px-4 pt-24 md:pt-32">
                <Aparece className="max-w-2xl">
                    {etiqueta(v.pilares.etiqueta)}
                    {titulo(p.pilares.titulo, 'mt-3')}
                </Aparece>
                <div className="mt-12">
                    {p.pilares.lista.map(([eti, tit, txt], i) => {
                        const oscura = i === 2;
                        return (
                            <div key={eti} className="sticky pb-6" style={{ top: `${104 + i * 26}px` }}>
                                <div className={`rounded-[32px] p-8 md:p-12 min-h-[300px] grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-8 items-center shadow-[0_-12px_40px_rgba(0,58,112,0.06)] ${oscura ? `${DEGRADADO} text-white` : i % 2 ? 'bg-white border border-[#E6E1D6]' : 'bg-[#F1EDE4]'}`}>
                                    <div>
                                        <span style={MONO} className={`text-[13px] ${oscura ? 'text-sky-300' : 'text-[#4197CB]'}`}>.0{i + 1}</span>
                                        <div className={`mt-6 w-16 h-16 rounded-2xl flex items-center justify-center ${oscura ? 'bg-white/10' : 'bg-white'}`}><IconoDibujado icono={ICONOS_PILARES[i]} className={`w-8 h-8 ${oscura ? 'text-sky-300' : 'text-[#1769aa]'}`} /></div>
                                    </div>
                                    <div>
                                        <div style={MONO} className={`text-[12px] uppercase tracking-[0.14em] ${oscura ? 'text-sky-300' : 'text-[#4197CB]'}`}>{eti}</div>
                                        <h3 className={`text-[28px] md:text-[36px] leading-tight font-semibold tracking-[-0.03em] mt-2 ${oscura ? 'text-white' : 'text-[#003A70]'}`}>{tit}</h3>
                                        <p className={`mt-4 text-[17px] leading-relaxed ${oscura ? 'text-white/75' : 'text-[#003A70]/70'}`}>{txt}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* SEGURIDAD */}
            <section className="max-w-6xl mx-auto px-4 pt-20 md:pt-28">
                <Aparece>
                    <div id="seguridad" className="scroll-mt-24 rounded-[32px] bg-[#0E2238] p-8 md:p-12 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center relative overflow-hidden">
                        <div className="relative">
                            {etiqueta(t.seguridad.etiqueta, true)}
                            {titulo(t.seguridad.titulo, 'mt-3', true)}
                            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {t.seguridad.lista.map(([tit, txt], i) => (
                                    <div key={tit}>
                                        <IconoDibujado icono={ICONOS_SEGURIDAD[i]} className="w-7 h-7 text-sky-300" retraso={i * 120} />
                                        <div className="font-medium text-white mt-3">{tit}</div>
                                        <p className="text-white/70 text-[15px] mt-1">{txt}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="relative"><EttsSeparadas nombres={t.separadas} /></div>
                    </div>
                </Aparece>
            </section>

            {/* CÓMO EMPEZAMOS: pasos numerados con una línea que se rellena */}
            <section className="max-w-6xl mx-auto px-4 py-24 md:py-32">
                <Aparece className="max-w-2xl">
                    {etiqueta(v.empezar.etiqueta)}
                    {titulo(t.empezar.titulo, 'mt-3')}
                </Aparece>
                <div ref={empezarRef} className="relative mt-12">
                    <span className="hidden lg:block absolute left-0 right-0 top-0 h-0.5 bg-[#E6E1D6] rounded-full" />
                    <span className="hidden lg:block absolute left-0 top-0 h-0.5 bg-[linear-gradient(90deg,#1769aa,#4197CB)] rounded-full" style={{ width: `${progresoEmpezar * 100}%` }} />
                    <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:pt-8">
                        {t.empezar.pasos.map(([tit, txt], i) => (
                            <li key={tit} className={`rounded-[24px] p-6 transition-colors duration-500 ${progresoEmpezar >= (i + 0.5) / 4 ? 'bg-white border border-[#E6E1D6] shadow-[0_16px_40px_rgba(0,58,112,0.06)]' : 'bg-[#F1EDE4] border border-transparent'}`}>
                                <span style={MONO} className="text-[13px] text-[#4197CB]">.0{i + 1}</span>
                                <div className="text-[19px] font-semibold text-[#003A70] mt-6 leading-snug">{tit}</div>
                                <p className="text-[#003A70]/65 mt-2 text-[15px] leading-relaxed">{txt}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* PREGUNTAS FRECUENTES */}
            <section id="faq" className="scroll-mt-24 max-w-4xl mx-auto px-4 pb-24 md:pb-32">
                <Aparece>{titulo(t.faq.titulo, 'text-center')}</Aparece>
                <div className="mt-10 divide-y divide-[#E6E1D6] border-y border-[#E6E1D6]">
                    {t.faq.lista.map(([pr, r], i) => (
                        <div key={pr}>
                            <button type="button" onClick={() => setAbierta(abierta === i ? -1 : i)} aria-expanded={abierta === i} className="w-full flex items-center justify-between gap-4 py-5 text-left text-[17px] font-medium text-[#003A70]">
                                {pr}<span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition ${abierta === i ? 'rotate-45 bg-[#1769aa] text-white' : 'border border-[#003A70]/20'}`}><Plus className="w-4 h-4" /></span>
                            </button>
                            {abierta === i && <p className="pb-5 -mt-1 text-[#003A70]/70 leading-relaxed max-w-3xl animate-fade-in">{r}</p>}
                        </div>
                    ))}
                </div>
            </section>

            {/* PIDE UNA DEMO */}
            <section id="demo" ref={demoRef} className="scroll-mt-24 max-w-6xl mx-auto px-4 pb-24 md:pb-32 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-12">
                <Aparece>
                    {titulo(t.formulario.titulo)}
                    <p className="text-lg text-[#003A70]/70 mt-4">{t.formulario.texto}</p>
                    <div className="mt-6 rounded-[24px] bg-[#F1EDE4] p-6">
                        <div className="font-semibold text-[#003A70]">{t.precio.titulo}</div>
                        <p className="text-[#003A70]/70 mt-1 text-[15px]">{t.precio.texto}</p>
                    </div>
                    <div className="mt-8 space-y-3 text-[#003A70]">
                        <a href={`mailto:${CONTACTO.email}`} className="flex items-center gap-3 hover:underline"><Mail className="w-5 h-5 text-[#4197CB]" />{CONTACTO.email}</a>
                        <a href={`tel:${CONTACTO.telefono.replace(/\s/g, '')}`} className="flex items-center gap-3 hover:underline"><Phone className="w-5 h-5 text-[#4197CB]" />{CONTACTO.telefono}</a>
                        <div className="flex items-center gap-3"><MapPin className="w-5 h-5 text-[#4197CB]" />{CONTACTO.direccion}</div>
                    </div>
                </Aparece>
                <Aparece retraso={120}>
                    <div className="rounded-[28px] bg-white border border-[#E6E1D6] shadow-[0_24px_60px_rgba(0,58,112,0.08)] p-6 sm:p-8">
                        {enviado ? (
                            <div className="text-center py-10">
                                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                                <p className="mt-4 text-lg text-slate-800">{t.formulario.gracias}</p>
                                <button type="button" onClick={() => { setEnviado(false); setForm(FORM_VACIO); }} className="mt-4 text-sm font-medium text-[#1769aa] underline">{t.formulario.otra}</button>
                            </div>
                        ) : (
                            <form onSubmit={(e) => { e.preventDefault(); if (formOk) setEnviado(true); }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[['nombre', 'text', 'name'], ['ett', 'text', 'organization'], ['email', 'email', 'email'], ['telefono', 'tel', 'tel']].map(([k, tipo, auto]) => (
                                    <label key={k} className="block">
                                        <span className="block text-[13px] font-medium text-[#003A70] mb-1.5">{t.formulario[k]}</span>
                                        <input type={tipo} autoComplete={auto} value={form[k]} onChange={(e) => setForm(f => ({ ...f, [k]: e.target.value }))} className="w-full h-12 rounded-xl bg-[#FAF8F4] border border-[#E6E1D6] px-3.5 text-[15px] outline-none focus:border-[#1769aa] focus:bg-white" />
                                    </label>
                                ))}
                                <label className="block sm:col-span-2">
                                    <span className="block text-[13px] font-medium text-[#003A70] mb-1.5">{t.formulario.sucursales}</span>
                                    <select value={form.sucursales} onChange={(e) => setForm(f => ({ ...f, sucursales: e.target.value }))} className="w-full h-12 rounded-xl bg-[#FAF8F4] border border-[#E6E1D6] px-3 text-[15px] outline-none focus:border-[#1769aa]">
                                        {t.formulario.opcionesSucursales.map((o, i) => <option key={o} value={i}>{o}</option>)}
                                    </select>
                                </label>
                                <label className="block sm:col-span-2">
                                    <span className="block text-[13px] font-medium text-[#003A70] mb-1.5">{t.formulario.mensaje}</span>
                                    <textarea rows={3} value={form.mensaje} onChange={(e) => setForm(f => ({ ...f, mensaje: e.target.value }))} className="w-full rounded-xl bg-[#FAF8F4] border border-[#E6E1D6] px-3.5 py-2.5 text-[15px] outline-none focus:border-[#1769aa] focus:bg-white" />
                                </label>
                                <label className="sm:col-span-2 flex items-start gap-2 text-sm text-[#003A70]/70">
                                    <input type="checkbox" checked={form.privacidad} onChange={(e) => setForm(f => ({ ...f, privacidad: e.target.checked }))} className="mt-0.5 rounded border-slate-300 text-[#1769aa]" />
                                    <span><a href="#privacidad" className="underline">{t.formulario.privacidad}</a></span>
                                </label>
                                <button type="submit" disabled={!formOk} className={`${botonPrincipal} sm:col-span-2 disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0`}>{t.formulario.enviar}</button>
                                <p className="sm:col-span-2 text-xs text-slate-400 text-center">{t.formulario.demoAviso}</p>
                            </form>
                        )}
                    </div>
                </Aparece>
            </section>

            {/* CIERRE: la misma banda de degradado que la portada */}
            <section className="max-w-6xl mx-auto px-4 pb-16">
                <Aparece>
                    <div className="relative overflow-hidden rounded-[32px] px-6 py-16 md:px-16 md:py-24 text-center">
                        <div className="banda-cierre absolute inset-0" aria-hidden="true">
                            <span className="mancha absolute -top-32 -left-20 w-[460px] h-[460px] rounded-full bg-[#4197CB]/55 blur-3xl" />
                            <span className="mancha mancha-2 absolute -bottom-40 right-0 w-[520px] h-[520px] rounded-full bg-[#2bb3c0]/35 blur-3xl" />
                        </div>
                        <h2 className="relative text-[32px] md:text-[52px] leading-[1.1] font-semibold tracking-[-0.035em] text-white max-w-4xl mx-auto">{p.cierre.titulo}</h2>
                        <a href="#demo" className={`relative ${boton} bg-white text-[#003A70] hover:bg-sky-50 mt-10`}>{t.demo}<ArrowRight className="w-4 h-4" /></a>
                    </div>
                </Aparece>
            </section>

            {/* PIE */}
            <footer ref={pieRef} className="max-w-6xl mx-auto px-4 pb-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-[15px] text-[#003A70]/75 border-t border-[#E6E1D6] pt-12">
                    <div className="lg:col-span-2">
                        <img src="/logo-tramitnow.svg" alt="TramitNow" className="h-7 w-auto" />
                        <p className="mt-3 max-w-xs">{t.pie.lema}</p>
                    </div>
                    <div className="space-y-2">{enlaces.map(([k, href]) => <a key={k} href={href} className="block hover:text-[#003A70]">{v.menu[k]}</a>)}</div>
                    <div className="space-y-2"><div>{CONTACTO.email}</div><div>{CONTACTO.telefono}</div><div>{CONTACTO.direccion}</div></div>
                </div>
                <div className="mt-10 overflow-hidden" aria-hidden="true">
                    <div className="text-[18vw] lg:text-[196px] font-semibold tracking-[-0.06em] leading-[0.9] text-transparent bg-clip-text bg-[linear-gradient(180deg,rgba(0,58,112,0.12),rgba(65,151,203,0.02))] select-none">TramitNow</div>
                </div>
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-[#003A70]/55">
                    <span>© {new Date().getFullYear()} TramitNow. {t.pie.derechos}</span>
                    <span className="flex gap-4">{t.pie.legal.map(l => <a key={l} href="#" className="hover:text-[#003A70]">{l}</a>)}</span>
                </div>
            </footer>

            {/* BARRA INFERIOR DE «PIDE UNA DEMO» */}
            <div className={`fixed bottom-4 inset-x-0 z-40 px-3 transition-all duration-500 ${barra ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'}`} aria-hidden={!barra}>
                <div className="max-w-xl mx-auto flex items-center justify-between gap-3 rounded-full bg-white/90 backdrop-blur border border-[#E6E1D6] shadow-[0_12px_40px_rgba(0,58,112,0.16)] pl-5 pr-1.5 py-1.5">
                    <span className="text-sm font-medium text-[#003A70] truncate">{t.barra.texto}</span>
                    <a href="#demo" tabIndex={barra ? 0 : -1} className={`${botonPrincipal} h-10 px-4 text-sm`}>{t.barra.boton}</a>
                </div>
            </div>
        </div>
    );
}
