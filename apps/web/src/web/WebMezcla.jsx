// Web corporativa de TramitNow, versión 3 (web3.html): mezcla de las otras dos, con la letra del logo (Poppins).
// - De la versión estilo Perk (web2.html): fondo cálido, bloques grandes muy redondeados y planos, botones en píldora,
//   el producto en pestañas, los pilares, el carrusel de funciones y «Potente para tu ETT, sencillo para todos».
// - De la versión 1 (web.html): los azules del logo con sus degradados, el titular palabra a palabra, la maqueta que se
//   endereza con avisos flotantes, cifras, manifiesto que se ilumina, iconos que se dibujan, el dibujo de seguridad,
//   la línea de «Cómo empezamos», la barra de progreso y la barra inferior de «Pide una demo».
import React, { useEffect, useRef, useState } from 'react';
import {
    ArrowRight, ArrowLeft, Check, ChevronDown, Menu, X, Mail, Phone, MapPin, CheckCircle2, ShieldCheck, Eye, Sparkles, Timer,
    LayoutDashboard, UserSearch, FileSignature, Receipt, Building2, Smartphone, Plus, Server, Lock, FileLock2, ClipboardList,
} from 'lucide-react';
import { TEXTOS, CONTACTO } from './textos';
import { TEXTOS_PERK } from './textosPerk';
import { MAQUETAS, EttsSeparadas, LineaEmpezar } from './WebCorporativa';
import { Aparece, Contador, IconoDibujado, TarjetaViva, TextoQueSeIlumina, TitularPorPalabras, useVisible, movimientoReducido } from './animaciones';

const AREAS = [0, 2, 3, 4, 5]; // pasos del recorrido que salen como pestañas del producto
const DURACION_AREA = 7000;
const ICONOS_PILARES = [ShieldCheck, Eye, Sparkles, Timer];
const ICONOS_TODOS = [LayoutDashboard, UserSearch, FileSignature, Receipt, Building2, Smartphone];
const ICONOS_SEGURIDAD = [Server, Lock, FileLock2, ShieldCheck];
const ICONOS_AVISOS = [CheckCircle2, FileSignature, Receipt, ClipboardList];
const BIEN = ['Hecho', 'Confirmada', 'Al día', 'Aceptado'];
const TONO = { ok: 'bg-emerald-50 text-emerald-700', azul: 'bg-sky-50 text-sky-700', aviso: 'bg-amber-50 text-amber-700' };
const FORM_VACIO = { nombre: '', ett: '', email: '', telefono: '', sucursales: '0', mensaje: '', privacidad: false };
const DEGRADADO = 'bg-[linear-gradient(145deg,#003A70,#155b8e_62%,#1b7c9f)]';
const leerIdioma = () => { try { return localStorage.getItem('tramitnow-idioma') === 'ca' ? 'ca' : 'es'; } catch { return 'es'; } };

export default function WebMezcla() {
    const [idioma, setIdioma] = useState(leerIdioma);
    const [area, setArea] = useState(0);
    const [areaAuto, setAreaAuto] = useState(true); // las pestañas del producto pasan solas hasta que se pulsa una
    const [abierta, setAbierta] = useState(0);
    const [menuMovil, setMenuMovil] = useState(false);
    const [compacta, setCompacta] = useState(false);
    const [barra, setBarra] = useState(false);
    const [form, setForm] = useState(FORM_VACIO);
    const [enviado, setEnviado] = useState(false);
    const t = TEXTOS[idioma];
    const p = TEXTOS_PERK[idioma];

    const progresoRef = useRef(null);
    const maquetaRef = useRef(null);
    const heroRef = useRef(null);
    const demoRef = useRef(null);
    const pieRef = useRef(null);
    const carrusel = useRef(null);
    const [productoRef, productoVisible] = useVisible(0.3);

    useEffect(() => { document.documentElement.lang = idioma; }, [idioma]);

    // Scroll: cabecera compacta, barra de progreso y maqueta de la portada que se endereza
    useEffect(() => {
        const reducido = movimientoReducido();
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
                if (maquetaRef.current && !reducido) {
                    const k = Math.min(y / 420, 1);
                    maquetaRef.current.style.transform = `perspective(1600px) rotateX(${(1 - k) * 14}deg) translateY(${(1 - k) * 20}px) scale(${0.94 + 0.06 * k})`;
                }
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

    // Pestañas del producto: pasan solas mientras se ven, hasta que se pulsa una
    useEffect(() => {
        if (!areaAuto || !productoVisible || movimientoReducido()) return undefined;
        const id = setTimeout(() => setArea(a => (a + 1) % AREAS.length), DURACION_AREA);
        return () => clearTimeout(id);
    }, [area, areaAuto, productoVisible]);

    const cambiarIdioma = (i) => { setIdioma(i); try { localStorage.setItem('tramitnow-idioma', i); } catch { /* sin almacenamiento */ } };
    const moverCarrusel = (dir) => carrusel.current?.scrollBy({ left: dir * 340, behavior: movimientoReducido() ? 'auto' : 'smooth' });
    const enlaces = [['producto', '#producto'], ['recorrido', '#funciones'], ['portales', '#todos'], ['seguridad', '#seguridad'], ['contacto', '#demo']];
    const formOk = form.nombre.trim() && form.ett.trim() && /\S+@\S+\.\S+/.test(form.email) && form.privacidad;
    const chips = movimientoReducido() ? t.hecho.chips : [...t.hecho.chips, ...t.hecho.chips];

    const boton = 'inline-flex items-center justify-center gap-2 rounded-full px-6 h-12 font-medium text-[15px] transition whitespace-nowrap';
    const botonPrincipal = `${boton} bg-[#1769aa] text-white shadow-[0_8px_20px_rgba(23,105,170,0.25)] hover:bg-[#10598f] hover:-translate-y-px`;
    const botonBorde = `${boton} border border-[#003A70]/20 bg-white/60 text-[#003A70] hover:border-[#4197CB]`;
    const titulo = (texto, extra = '', claro = false) => <h2 className={`text-[32px] md:text-[48px] leading-[1.1] font-semibold tracking-[-0.035em] ${claro ? 'text-white' : 'text-[#003A70]'} ${extra}`}>{texto}</h2>;
    const etiqueta = (texto, claro = false) => <div className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${claro ? 'text-sky-300' : 'text-[#4197CB]'}`}>{texto}</div>;

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

    // El ERP en el navegador y el portal del trabajador en el móvil
    const producto = () => (
        <div className="relative">
            <div className="rounded-2xl bg-white ring-1 ring-[#E6E1D6] shadow-[0_40px_90px_rgba(0,58,112,0.18)] overflow-hidden">
                <div className="flex items-center gap-1.5 px-3 py-2.5 bg-[#FAF8F4] border-b border-slate-100">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-300" /><span className="w-2.5 h-2.5 rounded-full bg-amber-300" /><span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
                    <span className="mx-auto w-48 sm:w-72 rounded-md bg-white border border-slate-200 px-2 py-0.5 text-center text-[10px] text-slate-400">app.tramitnow.com</span>
                </div>
                <div className="flex text-left">
                    <div className="hidden sm:block w-36 bg-[#0f1b33] p-3 space-y-1.5">
                        <img src="/logo-tramitnow.svg" alt="" className="h-4 brightness-0 invert mb-4" />
                        {['Inicio', 'Empresas', 'Presupuestos', 'Peticiones', 'Candidatos', 'Contratos y altas', 'Horas', 'Facturación'].map((x, i) => <div key={x} className={`rounded-md px-2 py-1.5 text-[10px] ${i === 0 ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>{x}</div>)}
                    </div>
                    <div className="flex-1 p-4 sm:p-6 space-y-4 min-w-0">
                        <div><div className="text-[15px] font-semibold text-slate-900">Buenos días, Begoña</div><div className="text-[10px] text-slate-500">Delegación Norte</div></div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[['Peticiones abiertas', '4', 'bg-indigo-500'], ['En misión hoy', '13', 'bg-emerald-500'], ['Partes por validar', '1', 'bg-amber-500'], ['Por cobrar', '40.247 €', 'bg-sky-500']].map(([l, v, c]) => (
                                <div key={l} className="rounded-lg border border-slate-200 p-2.5"><div className="flex items-center gap-1 text-[9px] text-slate-500"><span className={`w-1.5 h-1.5 rounded-full ${c}`} />{l}</div><div className="text-base font-semibold text-slate-900 mt-0.5">{v}</div></div>
                            ))}
                        </div>
                        <div className="rounded-lg border border-slate-200">
                            {[['PET-2026-0050 · Carretillero/a', '2 de 4', 'bg-indigo-500 w-1/2'], ['PET-2026-0049 · Operario/a de almacén', '0 de 3', 'bg-indigo-500 w-0'], ['PET-2026-0044 · Camarero/a de sala', '9 de 10', 'bg-emerald-500 w-[90%]'], ['PET-2026-0045 · Ayudante de cocina', '4 de 4', 'bg-emerald-500 w-full']].map(([a, b, c]) => (
                                <div key={a} className="flex items-center gap-3 px-3 py-2.5 border-b border-slate-100 last:border-0 text-[11px]">
                                    <span className="flex-1 text-slate-700 truncate">{a}</span>
                                    <span className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden"><span className={`block h-full rounded-full ${c}`} /></span>
                                    <span className="w-10 text-right text-slate-500">{b}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <div className="absolute -bottom-10 -right-2 sm:-right-12 w-[120px] sm:w-[165px] rounded-[24px] bg-[#0f1b33] p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.3)]">
                <div className="rounded-[19px] bg-slate-50 overflow-hidden text-left">
                    <div className="bg-white px-2.5 py-2 flex items-center gap-1.5 border-b border-slate-100"><span className="w-4 h-4 rounded-full bg-indigo-600 text-[6px] text-white flex items-center justify-center font-bold">EG</span><span className="text-[8px] font-semibold text-slate-800">ETT Global People</span></div>
                    <div className="p-2 space-y-1.5">
                        <div className="text-[11px] font-semibold text-slate-900">Hola, Unai</div>
                        <div className="rounded-md bg-indigo-50 border border-indigo-100 p-1.5 text-[7px] text-slate-700">Empiezas el 10/11 · Carretillero/a</div>
                        {['Firma tu contrato', 'Lee los riesgos del puesto', 'Añade tu cuenta'].map(x => <div key={x} className="rounded-md bg-white border border-slate-200 p-1.5 text-[7px] text-slate-800 flex justify-between">{x}<span className="text-indigo-600">›</span></div>)}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#FAF8F4] text-[#2a3a4f]" style={{ fontFamily: "'Poppins', ui-sans-serif, system-ui, sans-serif" }}>
            {/* Progreso de lectura */}
            <div ref={progresoRef} className="fixed top-0 inset-x-0 h-[3px] z-50 origin-left bg-[linear-gradient(90deg,#003A70,#1769aa,#4197CB)]" style={{ transform: 'scaleX(0)' }} />

            {/* Barra de la demo */}
            <div className="bg-[#0E2238] text-slate-300 text-xs">
                <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
                    <span>Demo · web corporativa, versión 3 (mezcla) · en real: tramitnow.com</span>
                    <span className="flex gap-4"><a href="/web.html" className="text-sky-300 hover:text-white">Versión 1</a><a href="/web2.html" className="text-sky-300 hover:text-white">Versión 2 (Perk)</a><a href="/" className="text-sky-300 hover:text-white">ERP</a></span>
                </div>
            </div>

            {/* CABECERA FLOTANTE */}
            <div className={`sticky top-0 z-40 px-3 transition-all duration-300 ${compacta ? 'pt-2' : 'pt-4'} -mb-[72px]`}>
                <header className={`max-w-6xl mx-auto rounded-full border transition-all duration-300 ${compacta ? 'bg-white/90 border-[#E6E1D6] shadow-[0_8px_30px_rgba(0,58,112,0.08)] backdrop-blur' : 'bg-white/50 border-white/70 backdrop-blur'}`}>
                    <div className="flex items-center gap-6 pl-5 pr-2 h-14">
                        <a href="#inicio" className="shrink-0"><img src="/logo-tramitnow.svg" alt="TramitNow" className="h-6 w-auto" /></a>
                        <nav className="hidden lg:flex items-center gap-6 text-[14px] text-[#003A70]/75">
                            {enlaces.map(([k, href]) => <a key={k} href={href} className="hover:text-[#003A70]">{t.menu[k]}</a>)}
                        </nav>
                        <div className="ml-auto flex items-center gap-2 sm:gap-3">
                            <div className="flex rounded-full border border-[#E6E1D6] bg-white p-0.5 text-xs" role="group" aria-label="Idioma">
                                {['es', 'ca'].map(i => <button key={i} type="button" onClick={() => cambiarIdioma(i)} aria-pressed={idioma === i} className={`px-2.5 py-1 rounded-full font-medium ${idioma === i ? 'bg-[#003A70] text-white' : 'text-[#003A70]/60 hover:text-[#003A70]'}`}>{i.toUpperCase()}</button>)}
                            </div>
                            <a href="/" className="hidden md:inline text-[14px] font-medium text-[#003A70] hover:underline">{t.acceder}</a>
                            <span className="hidden md:block"><a href="#demo" className={`${botonPrincipal} h-10 px-5 text-sm`}>{t.demo}</a></span>
                            <button type="button" className="lg:hidden p-2 text-[#003A70]" aria-label="Menú" aria-expanded={menuMovil} onClick={() => setMenuMovil(!menuMovil)}>{menuMovil ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
                        </div>
                    </div>
                </header>
                {menuMovil && (
                    <nav className="lg:hidden max-w-6xl mx-auto mt-2 rounded-3xl bg-white border border-[#E6E1D6] shadow-lg px-5 py-4 space-y-1">
                        {enlaces.map(([k, href]) => <a key={k} href={href} onClick={() => setMenuMovil(false)} className="block py-2 text-[#003A70]">{t.menu[k]}</a>)}
                        <a href="/" className="block py-2 font-medium text-[#003A70]">{t.acceder}</a>
                        <a href="#demo" onClick={() => setMenuMovil(false)} className={`${botonPrincipal} w-full mt-2`}>{t.demo}</a>
                    </nav>
                )}
            </div>

            {/* PORTADA: fondo cálido con manchas azules, titular palabra a palabra y la maqueta en un gran bloque */}
            <section id="inicio" ref={heroRef} className="relative overflow-hidden">
                <span className="mancha absolute -top-32 left-[6%] w-[440px] h-[440px] rounded-full bg-[#4197CB]/20 blur-3xl" />
                <span className="mancha mancha-2 absolute top-32 right-[0%] w-[380px] h-[380px] rounded-full bg-[#1769aa]/12 blur-3xl" />
                <div className="relative max-w-6xl mx-auto px-4 pt-36 md:pt-44 text-center">
                    <Aparece><div className="inline-flex items-center gap-2 rounded-full border border-[#4197CB]/30 bg-white/70 px-3.5 py-1.5 text-xs font-medium text-[#1769aa]"><span className="w-1.5 h-1.5 rounded-full bg-[#4197CB]" />{t.hero.etiqueta}</div></Aparece>
                    <TitularPorPalabras key={idioma} texto={t.hero.titulo} final={<span className="text-[#4197CB]">.</span>} className="text-[40px] sm:text-6xl md:text-[72px] leading-[1.05] font-semibold tracking-[-0.045em] text-[#003A70] mt-6 max-w-4xl mx-auto" />
                    <Aparece retraso={500}><p className="text-lg md:text-xl text-[#003A70]/65 mt-6 max-w-2xl mx-auto">{t.hero.texto}</p></Aparece>
                    <Aparece retraso={650}>
                        <div className="flex flex-col sm:flex-row justify-center gap-3 mt-9 max-w-md sm:max-w-none mx-auto">
                            <a href="#demo" className={botonPrincipal}>{t.demo}<ArrowRight className="w-4 h-4" /></a>
                            <a href="#producto" className={botonBorde}>{p.verProducto}<ChevronDown className="w-4 h-4" /></a>
                        </div>
                        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6 text-sm text-[#003A70]/60">{t.hero.notas.map(n => <span key={n} className="inline-flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#4197CB]" />{n}</span>)}</div>
                    </Aparece>
                    <div className="relative mt-14 rounded-[32px] bg-[#F1EDE4] px-4 sm:px-12 pt-10 sm:pt-14 pb-16">
                        <div ref={maquetaRef} className="max-w-4xl mx-auto origin-top will-change-transform">{producto()}</div>
                        {t.avisos.map((texto, i) => {
                            const Icono = ICONOS_AVISOS[i];
                            const sitio = ['-left-6 top-20', '-left-10 bottom-24', '-right-8 top-8', '-right-14 top-1/2'][i];
                            return (
                                <div key={texto} className={`hidden lg:block absolute ${sitio} z-10`}>
                                    <Aparece retraso={1100 + i * 450}>
                                        <div className="bambolea flex items-center gap-2.5 rounded-2xl bg-white border border-[#E6E1D6] shadow-[0_16px_40px_rgba(0,58,112,0.14)] pl-2.5 pr-4 py-2.5 text-left" style={{ animationDelay: `${i * -1.4}s` }}>
                                            <span className={`w-8 h-8 rounded-full flex items-center justify-center ${i === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-sky-50 text-[#1769aa]'}`}><Icono className="w-4 h-4" /></span>
                                            <span><span className="block text-[13px] font-medium text-slate-800 whitespace-nowrap">{texto}</span><span className="block text-[11px] text-slate-400">{idioma === 'ca' ? 'ara mateix' : 'ahora mismo'}</span></span>
                                        </div>
                                    </Aparece>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* FRANJA OSCURA: lo que pide la ley */}
            <section className={`mt-16 ${DEGRADADO} py-7 overflow-hidden`}>
                <div className="[mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
                    <div className="marquesina flex w-max gap-10">
                        {chips.map((c, i) => <span key={i} className="shrink-0 text-[13px] font-medium uppercase tracking-[0.12em] text-white/80 whitespace-nowrap">{c}</span>)}
                    </div>
                </div>
            </section>

            {/* CIFRAS Y MANIFIESTO */}
            <section className="max-w-6xl mx-auto px-4 pt-20 md:pt-28">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {t.cifras.map(([n, suf, texto], i) => (
                        <Aparece key={texto} retraso={i * 100}>
                            <div className="h-full rounded-[28px] bg-[#F1EDE4] p-6 md:p-8">
                                <div className="text-5xl md:text-6xl font-semibold tracking-[-0.04em] text-transparent bg-clip-text bg-[linear-gradient(135deg,#003A70,#4197CB)]"><Contador hasta={n} sufijo={suf} /></div>
                                <div className="text-[#003A70]/65 mt-2 text-[15px]">{texto}</div>
                            </div>
                        </Aparece>
                    ))}
                </div>
            </section>
            <section className="max-w-5xl mx-auto px-4 py-24 md:py-32">
                <TextoQueSeIlumina texto={t.manifiesto} className="text-[26px] md:text-[44px] leading-[1.25] font-semibold tracking-[-0.03em] text-center" />
            </section>

            {/* EL PRODUCTO EN PESTAÑAS: pasan solas hasta que se pulsa una */}
            <section id="producto" ref={productoRef} className="scroll-mt-24 max-w-6xl mx-auto px-4">
                <Aparece className="text-center max-w-3xl mx-auto mb-10">
                    {etiqueta(t.recorrido.etiqueta)}
                    {titulo(t.recorrido.titulo, 'mt-3')}
                </Aparece>
                <div className="rounded-[32px] bg-[#F1EDE4] p-5 sm:p-8 md:p-12">
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="tablist">
                        {AREAS.map((idx, i) => (
                            <button key={idx} type="button" role="tab" aria-selected={area === i} onClick={() => { setArea(i); setAreaAuto(false); }} className={`relative overflow-hidden shrink-0 rounded-full px-5 py-2.5 text-[14px] font-medium transition ${area === i ? 'bg-[#003A70] text-white' : 'bg-white text-[#003A70] hover:bg-white/70'}`}>
                                {t.recorrido.pasos[idx].corto}
                                {area === i && areaAuto && productoVisible && <span key={`barra-${area}`} className="llena absolute left-0 bottom-0 h-0.5 bg-[#4197CB]" style={{ animationDuration: `${DURACION_AREA}ms` }} />}
                            </button>
                        ))}
                    </div>
                    <div key={area} className="mt-8 md:mt-12 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center animate-fade-in">
                        <div>
                            <div className="text-sm font-medium text-[#4197CB]">{String(AREAS[area] + 1).padStart(2, '0')} · {t.recorrido.pasos[AREAS[area]].corto}</div>
                            <h3 className="text-3xl md:text-[38px] leading-tight font-semibold tracking-[-0.03em] text-[#003A70] mt-2">{t.recorrido.pasos[AREAS[area]].titulo}</h3>
                            <p className="text-lg text-[#003A70]/70 mt-4 leading-relaxed">{t.recorrido.pasos[AREAS[area]].texto}</p>
                            <div className="flex flex-wrap gap-2 mt-6">{t.recorrido.pasos[AREAS[area]].puntos.map(x => <span key={x} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm text-[#003A70]"><Check className="w-3.5 h-3.5 text-[#4197CB]" />{x}</span>)}</div>
                        </div>
                        <div className="min-w-0">{maqueta(MAQUETAS[AREAS[area]])}</div>
                    </div>
                </div>
            </section>

            {/* PILARES: tarjetas vivas con iconos que se dibujan */}
            <section className="max-w-6xl mx-auto px-4 py-24 md:py-32">
                <Aparece>{titulo(p.pilares.titulo, 'text-center')}</Aparece>
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {p.pilares.lista.map(([eti, tit, txt], i) => (
                        <Aparece key={eti} retraso={(i % 2) * 120}>
                            <TarjetaViva className="h-full rounded-[28px] bg-[#F1EDE4] p-8 md:p-10 overflow-hidden">
                                <IconoDibujado icono={ICONOS_PILARES[i]} className="w-10 h-10 text-[#1769aa]" retraso={(i % 2) * 150} />
                                <div className="mt-8">{etiqueta(eti)}</div>
                                <h3 className="text-2xl md:text-[28px] leading-tight font-semibold tracking-[-0.025em] text-[#003A70] mt-2">{tit}</h3>
                                <p className="text-[#003A70]/70 mt-3 leading-relaxed">{txt}</p>
                            </TarjetaViva>
                        </Aparece>
                    ))}
                </div>
            </section>

            {/* CARRUSEL DE FUNCIONES */}
            <section id="funciones" className="scroll-mt-24 pb-24 md:pb-32">
                <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-end justify-between gap-6">
                    <Aparece className="max-w-2xl">
                        {titulo(p.funciones.titulo)}
                        <p className="text-lg text-[#003A70]/65 mt-4">{p.funciones.texto}</p>
                    </Aparece>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => moverCarrusel(-1)} aria-label={p.funciones.anterior} className="w-12 h-12 rounded-full border border-[#003A70]/20 bg-white text-[#003A70] flex items-center justify-center hover:border-[#4197CB]"><ArrowLeft className="w-5 h-5" /></button>
                        <button type="button" onClick={() => moverCarrusel(1)} aria-label={p.funciones.siguiente} className="w-12 h-12 rounded-full bg-[#1769aa] text-white flex items-center justify-center hover:bg-[#10598f]"><ArrowRight className="w-5 h-5" /></button>
                    </div>
                </div>
                <div ref={carrusel} className="mt-10 flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-4 px-4 pb-4 [scrollbar-width:none] max-w-[calc(72rem+2rem)] mx-auto">
                    {p.funciones.lista.map(([eti, tit, txt], i) => (
                        <Aparece key={eti} retraso={Math.min(i, 3) * 90} className="snap-start shrink-0">
                            <div className={`group w-[280px] sm:w-[320px] h-[340px] rounded-[28px] p-7 flex flex-col justify-between transition border-2 ${i === 0 ? `${DEGRADADO} border-transparent text-white` : 'bg-[#F1EDE4] border-transparent hover:border-[#4197CB] hover:bg-white'}`}>
                                <span className={`self-start inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${i === 0 ? 'border-white/30 text-white/85' : 'border-[#003A70]/20 text-[#003A70]/70 group-hover:border-[#4197CB] group-hover:text-[#1769aa]'}`}><Plus className="w-3 h-3" />{eti}</span>
                                <div>
                                    <h3 className={`text-[22px] leading-tight font-semibold tracking-[-0.02em] ${i === 0 ? 'text-white' : 'text-[#003A70]'}`}>{tit}</h3>
                                    <p className={`mt-3 leading-relaxed text-[15px] ${i === 0 ? 'text-white/75' : 'text-[#003A70]/70'}`}>{txt}</p>
                                </div>
                            </div>
                        </Aparece>
                    ))}
                </div>
            </section>

            {/* POTENTE PARA TU ETT, SENCILLO PARA TODOS */}
            <section id="todos" className="scroll-mt-24 max-w-6xl mx-auto px-4 pb-24 md:pb-32">
                <Aparece className="text-center max-w-3xl mx-auto">
                    {titulo(p.todos.titulo)}
                    <p className="text-lg text-[#003A70]/65 mt-4">{p.todos.texto}</p>
                </Aparece>
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {p.todos.tarjetas.map(([eti, tit, txt], i) => {
                        const portal = i >= 4;
                        return (
                            <Aparece key={eti} retraso={(i % 3) * 100}>
                                <TarjetaViva className={`h-full rounded-[28px] overflow-hidden ${portal ? `${DEGRADADO} text-white` : 'bg-[#F1EDE4]'}`}>
                                    <div className="p-7">
                                        <span className={`w-14 h-14 rounded-2xl flex items-center justify-center ${portal ? 'bg-white/10' : 'bg-white'}`}>
                                            <IconoDibujado icono={ICONOS_TODOS[i]} className={`w-7 h-7 ${portal ? 'text-sky-300' : 'text-[#1769aa]'}`} retraso={(i % 3) * 120} />
                                        </span>
                                        <div className={`mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] ${portal ? 'text-sky-300' : 'text-[#4197CB]'}`}>{eti}</div>
                                        <h3 className={`text-[21px] leading-tight font-semibold tracking-[-0.02em] mt-2 ${portal ? 'text-white' : 'text-[#003A70]'}`}>{tit}</h3>
                                        <p className={`mt-2 leading-relaxed text-[15px] ${portal ? 'text-white/75' : 'text-[#003A70]/70'}`}>{txt}</p>
                                    </div>
                                </TarjetaViva>
                            </Aparece>
                        );
                    })}
                </div>
            </section>

            {/* SEGURIDAD (con el dibujo animado) Y CÓMO EMPEZAMOS (con la línea que se rellena) */}
            <section className="max-w-6xl mx-auto px-4 pb-24 md:pb-32 space-y-4">
                <Aparece>
                    <div id="seguridad" className={`scroll-mt-24 rounded-[32px] ${DEGRADADO} p-8 md:p-12 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center relative overflow-hidden`}>
                        <span className="absolute w-[520px] h-[520px] -right-[220px] -top-[220px] rounded-full border border-white/10" />
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
                <div id="empezar" className="scroll-mt-24 rounded-[32px] bg-[#F1EDE4] p-8 md:p-12">
                    <Aparece className="max-w-2xl">
                        {etiqueta(t.empezar.etiqueta)}
                        {titulo(t.empezar.titulo, 'mt-3')}
                    </Aparece>
                    <LineaEmpezar pasos={t.empezar.pasos} />
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

            {/* CIERRE */}
            <section className="max-w-6xl mx-auto px-4 pb-16">
                <Aparece>
                    <div className={`relative overflow-hidden rounded-[32px] ${DEGRADADO} px-6 py-16 md:px-16 md:py-24 text-center`}>
                        <span className="absolute w-[620px] h-[620px] -left-[260px] -bottom-[340px] rounded-full border border-white/10" />
                        <span className="absolute w-[420px] h-[420px] -right-[160px] -top-[220px] rounded-full border border-white/10" />
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
                    <div className="space-y-2">{enlaces.map(([k, href]) => <a key={k} href={href} className="block hover:text-[#003A70]">{t.menu[k]}</a>)}</div>
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
