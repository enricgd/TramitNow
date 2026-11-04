// Web corporativa de TramitNow, versión «estilo Perk» (web2.html), para compararla con la de web.html.
// Rasgos de Perk: fondo crema, letra de peso medio (DM Sans), un solo acento vivo (aquí, el azul claro del logo),
// bloques grandes muy redondeados y planos, frases con cifra destacada y animaciones discretas.
// Los textos comunes salen de textos.js y los propios de esta versión, de textosPerk.js.
import React, { useEffect, useRef, useState } from 'react';
import {
    ArrowRight, ArrowLeft, Check, ChevronDown, Menu, X, Mail, Phone, MapPin, CheckCircle2, ShieldCheck, Eye, Sparkles, Timer,
    LayoutDashboard, UserSearch, FileSignature, Receipt, Building2, Smartphone, Plus, Server, Lock, FileLock2,
} from 'lucide-react';
import { TEXTOS, CONTACTO } from './textos';
import { TEXTOS_PERK } from './textosPerk';
import { MAQUETAS } from './WebCorporativa';
import { Aparece, Contador, IconoDibujado, movimientoReducido } from './animaciones';

const AREAS = [0, 2, 3, 4, 5]; // pasos del recorrido que salen como pestañas del producto
const ICONOS_PILARES = [ShieldCheck, Eye, Sparkles, Timer];
const ICONOS_TODOS = [LayoutDashboard, UserSearch, FileSignature, Receipt, Building2, Smartphone];
const ICONOS_SEGURIDAD = [Server, Lock, FileLock2, ShieldCheck];
const BIEN = ['Hecho', 'Confirmada', 'Al día', 'Aceptado'];
const TONO = { ok: 'bg-emerald-50 text-emerald-700', azul: 'bg-sky-50 text-sky-700', aviso: 'bg-amber-50 text-amber-700' };
const FORM_VACIO = { nombre: '', ett: '', email: '', telefono: '', sucursales: '0', mensaje: '', privacidad: false };
const leerIdioma = () => { try { return localStorage.getItem('tramitnow-idioma') === 'ca' ? 'ca' : 'es'; } catch { return 'es'; } };

export default function WebPerk() {
    const [idioma, setIdioma] = useState(leerIdioma);
    const [area, setArea] = useState(0);
    const [abierta, setAbierta] = useState(0);
    const [menuMovil, setMenuMovil] = useState(false);
    const [compacta, setCompacta] = useState(false);
    const [form, setForm] = useState(FORM_VACIO);
    const [enviado, setEnviado] = useState(false);
    const carrusel = useRef(null);
    const t = TEXTOS[idioma];
    const p = TEXTOS_PERK[idioma];

    useEffect(() => { document.documentElement.lang = idioma; }, [idioma]);
    useEffect(() => {
        const alMover = () => setCompacta(window.scrollY > 24);
        alMover();
        window.addEventListener('scroll', alMover, { passive: true });
        return () => window.removeEventListener('scroll', alMover);
    }, []);

    const cambiarIdioma = (i) => { setIdioma(i); try { localStorage.setItem('tramitnow-idioma', i); } catch { /* sin almacenamiento */ } };
    const moverCarrusel = (dir) => carrusel.current?.scrollBy({ left: dir * 340, behavior: movimientoReducido() ? 'auto' : 'smooth' });
    const enlaces = [['producto', '#producto'], ['recorrido', '#funciones'], ['portales', '#todos'], ['seguridad', '#seguridad'], ['contacto', '#demo']];
    const formOk = form.nombre.trim() && form.ett.trim() && /\S+@\S+\.\S+/.test(form.email) && form.privacidad;
    const chips = movimientoReducido() ? t.hecho.chips : [...t.hecho.chips, ...t.hecho.chips];

    const boton = 'inline-flex items-center justify-center gap-2 rounded-full px-6 h-12 font-medium text-[15px] transition whitespace-nowrap';
    const botonAcento = `${boton} bg-[#4197CB] text-[#002a52] hover:bg-[#5aa7d6]`;
    const botonBorde = `${boton} border border-[#003A70]/25 text-[#003A70] hover:border-[#003A70]/60`;
    const titulo = (texto, extra = '') => <h2 className={`text-[34px] md:text-[52px] leading-[1.06] font-medium tracking-[-0.035em] text-[#003A70] ${extra}`}>{texto}</h2>;
    const etiqueta = (texto) => <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#003A70]/60">{texto}</div>;

    // Maqueta plana (sin sombras), como las capturas de Perk
    const maqueta = (m) => (
        <div className="rounded-2xl bg-white border border-[#DDD8CC] overflow-hidden text-left">
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

    // Producto en la portada: el ERP en el navegador y el portal del trabajador en el móvil
    const producto = () => (
        <div className="relative max-w-4xl mx-auto">
            <div className="rounded-2xl bg-white border border-[#DDD8CC] overflow-hidden">
                <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-slate-100">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#DDD8CC]" /><span className="w-2.5 h-2.5 rounded-full bg-[#DDD8CC]" /><span className="w-2.5 h-2.5 rounded-full bg-[#DDD8CC]" />
                    <span className="mx-auto w-48 sm:w-72 rounded-md bg-[#F4F2EC] px-2 py-0.5 text-center text-[10px] text-slate-500">app.tramitnow.com</span>
                </div>
                <div className="flex text-left">
                    <div className="hidden sm:block w-36 bg-[#0f1b33] p-3 space-y-1.5">
                        <img src="/logo-tramitnow.svg" alt="" className="h-4 brightness-0 invert mb-4" />
                        {['Inicio', 'Empresas', 'Presupuestos', 'Peticiones', 'Candidatos', 'Contratos y altas', 'Horas', 'Facturación'].map((x, i) => <div key={x} className={`rounded-md px-2 py-1.5 text-[10px] ${i === 0 ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>{x}</div>)}
                    </div>
                    <div className="flex-1 p-4 sm:p-6 space-y-4 min-w-0">
                        <div><div className="text-[15px] font-semibold text-slate-900">Buenos días, Begoña</div><div className="text-[10px] text-slate-500">Delegación Norte</div></div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[['Peticiones abiertas', '4'], ['En misión hoy', '13'], ['Partes por validar', '1'], ['Por cobrar', '40.247 €']].map(([l, v]) => (
                                <div key={l} className="rounded-lg border border-slate-200 p-2.5"><div className="text-[9px] text-slate-500">{l}</div><div className="text-base font-semibold text-slate-900 mt-0.5">{v}</div></div>
                            ))}
                        </div>
                        <div className="rounded-lg border border-slate-200">
                            {[['PET-2026-0050 · Carretillero/a', '2 de 4', 'bg-indigo-500 w-1/2'], ['PET-2026-0049 · Operario/a de almacén', '0 de 3', 'bg-indigo-500 w-0'], ['PET-2026-0044 · Camarero/a de sala', '9 de 10', 'bg-emerald-500 w-[90%]']].map(([a, b, c]) => (
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
            <div className="absolute -bottom-10 -right-2 sm:-right-12 w-[120px] sm:w-[165px] rounded-[24px] bg-[#0f1b33] p-1.5">
                <div className="rounded-[19px] bg-[#F4F2EC] overflow-hidden text-left">
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
        <div className="min-h-screen bg-[#F4F2EC] text-[#2a3a4f]" style={{ fontFamily: "'DM Sans', ui-sans-serif, system-ui, sans-serif" }}>
            {/* Barra de la demo */}
            <div className="bg-[#0E2238] text-slate-300 text-xs">
                <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
                    <span>Demo · web corporativa, versión estilo Perk · en real: tramitnow.com</span>
                    <span className="flex gap-4"><a href="/web.html" className="text-sky-300 hover:text-white">Versión 1</a><a href="/web3.html" className="text-sky-300 hover:text-white">Versión 3 (mezcla)</a><a href="/" className="text-sky-300 hover:text-white">ERP</a></span>
                </div>
            </div>

            {/* CABECERA FLOTANTE */}
            <div className={`sticky top-0 z-40 px-3 transition-all duration-300 ${compacta ? 'pt-2' : 'pt-4'}`}>
                <header className={`max-w-6xl mx-auto rounded-full border transition-all duration-300 ${compacta ? 'bg-[#F4F2EC]/95 border-[#DDD8CC] backdrop-blur' : 'bg-[#EAE7DE]/70 border-transparent'}`}>
                    <div className="flex items-center gap-6 pl-5 pr-2 h-14">
                        <a href="#inicio" className="shrink-0"><img src="/logo-tramitnow.svg" alt="TramitNow" className="h-6 w-auto" /></a>
                        <nav className="hidden lg:flex items-center gap-6 text-[15px] text-[#003A70]/80">
                            {enlaces.map(([k, href]) => <a key={k} href={href} className="hover:text-[#003A70]">{t.menu[k]}</a>)}
                        </nav>
                        <div className="ml-auto flex items-center gap-2 sm:gap-3">
                            <div className="flex rounded-full border border-[#DDD8CC] bg-[#F4F2EC] p-0.5 text-xs" role="group" aria-label="Idioma">
                                {['es', 'ca'].map(i => <button key={i} type="button" onClick={() => cambiarIdioma(i)} aria-pressed={idioma === i} className={`px-2.5 py-1 rounded-full font-medium ${idioma === i ? 'bg-[#003A70] text-white' : 'text-[#003A70]/60 hover:text-[#003A70]'}`}>{i.toUpperCase()}</button>)}
                            </div>
                            <a href="/" className="hidden md:inline text-[15px] font-medium text-[#003A70] hover:underline">{t.acceder}</a>
                            <span className="hidden md:block"><a href="#demo" className={`${botonAcento} h-10 px-5 text-sm`}>{t.demo}</a></span>
                            <button type="button" className="lg:hidden p-2 text-[#003A70]" aria-label="Menú" aria-expanded={menuMovil} onClick={() => setMenuMovil(!menuMovil)}>{menuMovil ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
                        </div>
                    </div>
                </header>
                {menuMovil && (
                    <nav className="lg:hidden max-w-6xl mx-auto mt-2 rounded-3xl bg-[#F4F2EC] border border-[#DDD8CC] px-5 py-4 space-y-1">
                        {enlaces.map(([k, href]) => <a key={k} href={href} onClick={() => setMenuMovil(false)} className="block py-2 text-[#003A70]">{t.menu[k]}</a>)}
                        <a href="/" className="block py-2 font-medium text-[#003A70]">{t.acceder}</a>
                        <a href="#demo" onClick={() => setMenuMovil(false)} className={`${botonAcento} w-full mt-2`}>{t.demo}</a>
                    </nav>
                )}
            </div>

            {/* PORTADA */}
            <section id="inicio" className="max-w-6xl mx-auto px-4 pt-16 md:pt-24 text-center">
                <Aparece>
                    <h1 className="text-[42px] sm:text-6xl md:text-[76px] leading-[1.02] font-medium tracking-[-0.045em] text-[#003A70] max-w-4xl mx-auto">{t.hero.titulo}.</h1>
                    <p className="text-lg md:text-xl text-[#003A70]/70 mt-6 max-w-2xl mx-auto">{t.hero.texto}</p>
                </Aparece>
                <Aparece retraso={150}>
                    <div className="flex flex-col sm:flex-row justify-center gap-3 mt-9 max-w-md sm:max-w-none mx-auto">
                        <a href="#demo" className={botonAcento}>{t.demo}<ArrowRight className="w-4 h-4" /></a>
                        <a href="#producto" className={botonBorde}>{p.verProducto}<ChevronDown className="w-4 h-4" /></a>
                    </div>
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6 text-sm text-[#003A70]/60">{t.hero.notas.map(n => <span key={n} className="inline-flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#4197CB]" />{n}</span>)}</div>
                </Aparece>
                <Aparece retraso={300}>
                    <div className="mt-14 rounded-[32px] bg-[#EAE7DE] px-4 sm:px-12 pt-10 sm:pt-14 pb-16">{producto()}</div>
                </Aparece>
            </section>

            {/* FRANJA OSCURA: lo que pide la ley, en el sitio de los logos de clientes */}
            <section className="mt-16 bg-[#0E2238] py-7 overflow-hidden">
                <div className="[mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
                    <div className="marquesina flex w-max gap-10">
                        {chips.map((c, i) => <span key={i} className="shrink-0 text-[13px] font-medium uppercase tracking-[0.12em] text-white/70 whitespace-nowrap">{c}</span>)}
                    </div>
                </div>
            </section>

            {/* FRASE CON CIFRA */}
            <section className="max-w-4xl mx-auto px-4 py-24 md:py-32 text-center">
                <Aparece>
                    <h2 className="text-[38px] md:text-[64px] leading-[1.04] font-medium tracking-[-0.04em] text-[#003A70]">
                        {p.frase.antes}<br /><span className="text-[#4197CB]"><Contador hasta={p.frase.cifra} /></span><sup className="text-[0.45em] align-super text-[#4197CB]">*</sup> {p.frase.despues}
                    </h2>
                    <p className="text-lg text-[#003A70]/70 mt-6 max-w-2xl mx-auto">{p.frase.texto}</p>
                    <a href="#producto" className={`${botonAcento} mt-8`}>{p.areas}<ArrowRight className="w-4 h-4" /></a>
                    <p className="text-xs text-[#003A70]/45 mt-6">* {t.recorrido.pasos.map(x => x.corto).join(' · ')}</p>
                </Aparece>
            </section>

            {/* EL PRODUCTO EN PESTAÑAS */}
            <section id="producto" className="scroll-mt-24 max-w-6xl mx-auto px-4">
                <div className="rounded-[32px] bg-[#EAE7DE] p-5 sm:p-8 md:p-12">
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="tablist">
                        {AREAS.map((idx, i) => (
                            <button key={idx} type="button" role="tab" aria-selected={area === i} onClick={() => setArea(i)} className={`shrink-0 rounded-full px-5 py-2.5 text-[15px] font-medium transition ${area === i ? 'bg-[#003A70] text-white' : 'bg-[#F4F2EC] text-[#003A70] hover:bg-white'}`}>{t.recorrido.pasos[idx].corto}</button>
                        ))}
                    </div>
                    <div key={area} className="mt-8 md:mt-12 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center animate-fade-in">
                        <div>
                            <h3 className="text-3xl md:text-[40px] leading-tight font-medium tracking-[-0.03em] text-[#003A70]">{t.recorrido.pasos[AREAS[area]].titulo}</h3>
                            <p className="text-lg text-[#003A70]/70 mt-4 leading-relaxed">{t.recorrido.pasos[AREAS[area]].texto}</p>
                            <div className="flex flex-wrap gap-2 mt-6">{t.recorrido.pasos[AREAS[area]].puntos.map(x => <span key={x} className="inline-flex items-center gap-1.5 rounded-full bg-[#F4F2EC] px-3.5 py-1.5 text-sm text-[#003A70]"><Check className="w-3.5 h-3.5 text-[#4197CB]" />{x}</span>)}</div>
                        </div>
                        <div className="min-w-0">{maqueta(MAQUETAS[AREAS[area]])}</div>
                    </div>
                </div>
            </section>

            {/* CUATRO PILARES */}
            <section className="max-w-6xl mx-auto px-4 py-24 md:py-32">
                <Aparece>{titulo(p.pilares.titulo, 'text-center')}</Aparece>
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {p.pilares.lista.map(([eti, tit, txt], i) => {
                        const Icono = ICONOS_PILARES[i];
                        return (
                            <Aparece key={eti} retraso={(i % 2) * 120}>
                                <div className="h-full rounded-[28px] bg-[#EAE7DE] p-8 md:p-10">
                                    <span className="w-11 h-11 rounded-full bg-[#4197CB]/20 text-[#003A70] flex items-center justify-center"><Icono className="w-5 h-5" strokeWidth={1.75} /></span>
                                    <div className="mt-8">{etiqueta(eti)}</div>
                                    <h3 className="text-2xl md:text-[30px] leading-tight font-medium tracking-[-0.025em] text-[#003A70] mt-2">{tit}</h3>
                                    <p className="text-[#003A70]/70 mt-3 leading-relaxed">{txt}</p>
                                </div>
                            </Aparece>
                        );
                    })}
                </div>
            </section>

            {/* CARRUSEL DE FUNCIONES */}
            <section id="funciones" className="scroll-mt-24 pb-24 md:pb-32">
                <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-end justify-between gap-6">
                    <Aparece className="max-w-2xl">
                        {titulo(p.funciones.titulo)}
                        <p className="text-lg text-[#003A70]/70 mt-4">{p.funciones.texto}</p>
                    </Aparece>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => moverCarrusel(-1)} aria-label={p.funciones.anterior} className="w-12 h-12 rounded-full border border-[#003A70]/25 text-[#003A70] flex items-center justify-center hover:bg-[#EAE7DE]"><ArrowLeft className="w-5 h-5" /></button>
                        <button type="button" onClick={() => moverCarrusel(1)} aria-label={p.funciones.siguiente} className="w-12 h-12 rounded-full border border-[#003A70]/25 text-[#003A70] flex items-center justify-center hover:bg-[#EAE7DE]"><ArrowRight className="w-5 h-5" /></button>
                    </div>
                </div>
                <div ref={carrusel} className="mt-10 flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-4 px-4 pb-4 [scrollbar-width:none] max-w-[calc(72rem+2rem)] mx-auto">
                    {p.funciones.lista.map(([eti, tit, txt], i) => (
                        <Aparece key={eti} retraso={Math.min(i, 3) * 90} className="snap-start shrink-0">
                            <div className="group w-[280px] sm:w-[320px] h-[340px] rounded-[28px] bg-[#EAE7DE] border-2 border-transparent hover:border-[#4197CB] hover:bg-white p-7 flex flex-col justify-between transition">
                                <span className="self-start inline-flex items-center gap-1 rounded-full border border-[#003A70]/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#003A70]/70 group-hover:border-[#4197CB] group-hover:text-[#003A70]"><Plus className="w-3 h-3" />{eti}</span>
                                <div>
                                    <h3 className="text-2xl leading-tight font-medium tracking-[-0.025em] text-[#003A70]">{tit}</h3>
                                    <p className="text-[#003A70]/70 mt-3 leading-relaxed">{txt}</p>
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
                    <p className="text-lg text-[#003A70]/70 mt-4">{p.todos.texto}</p>
                </Aparece>
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {p.todos.tarjetas.map(([eti, tit, txt], i) => {
                        const portal = i >= 4;
                        return (
                            <Aparece key={eti} retraso={(i % 3) * 100}>
                                <div className={`h-full rounded-[28px] overflow-hidden ${portal ? 'bg-[#0E2238] text-white' : 'bg-[#EAE7DE]'}`}>
                                    <div className={`h-36 flex items-center justify-center ${portal ? 'bg-[linear-gradient(160deg,#16335a,#0E2238)]' : 'bg-[linear-gradient(160deg,#e2ded3,#EAE7DE)]'}`}>
                                        <span className={`w-20 h-20 rounded-full flex items-center justify-center ${portal ? 'bg-white/10' : 'bg-[#F4F2EC]'}`}>
                                            <IconoDibujado icono={ICONOS_TODOS[i]} className={`w-9 h-9 ${portal ? 'text-[#4197CB]' : 'text-[#003A70]'}`} retraso={(i % 3) * 120} />
                                        </span>
                                    </div>
                                    <div className="p-7">
                                        <div className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${portal ? 'text-[#4197CB]' : 'text-[#003A70]/60'}`}>{eti}</div>
                                        <h3 className={`text-[22px] leading-tight font-medium tracking-[-0.02em] mt-2 ${portal ? 'text-white' : 'text-[#003A70]'}`}>{tit}</h3>
                                        <p className={`mt-2 leading-relaxed ${portal ? 'text-white/70' : 'text-[#003A70]/70'}`}>{txt}</p>
                                    </div>
                                </div>
                            </Aparece>
                        );
                    })}
                </div>
            </section>

            {/* TODO LO QUE NECESITAS SABER: cómo empezamos, seguridad y preguntas */}
            <section className="max-w-6xl mx-auto px-4 pb-24 md:pb-32">
                <Aparece>{titulo(p.recursos.titulo)}</Aparece>
                <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Aparece>
                        <div id="empezar" className="scroll-mt-24 h-full rounded-[28px] bg-[#EAE7DE] p-8 md:p-10">
                            {etiqueta(t.empezar.etiqueta)}
                            <h3 className="text-2xl md:text-[30px] leading-tight font-medium tracking-[-0.025em] text-[#003A70] mt-2">{t.empezar.titulo}</h3>
                            <ol className="mt-8 space-y-5">
                                {t.empezar.pasos.map(([tit, txt], i) => (
                                    <li key={tit} className="flex gap-4">
                                        <span className="w-9 h-9 shrink-0 rounded-full bg-[#4197CB] text-[#002a52] font-medium flex items-center justify-center">{i + 1}</span>
                                        <div><div className="font-medium text-[#003A70]">{tit}</div><p className="text-[#003A70]/70 text-[15px]">{txt}</p></div>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </Aparece>
                    <Aparece retraso={120}>
                        <div id="seguridad" className="scroll-mt-24 h-full rounded-[28px] bg-[#0E2238] p-8 md:p-10 text-white">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4197CB]">{t.seguridad.etiqueta}</div>
                            <h3 className="text-2xl md:text-[30px] leading-tight font-medium tracking-[-0.025em] mt-2">{t.seguridad.titulo}</h3>
                            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {t.seguridad.lista.map(([tit, txt], i) => {
                                    const Icono = ICONOS_SEGURIDAD[i];
                                    return (
                                        <div key={tit}>
                                            <Icono className="w-6 h-6 text-[#4197CB]" strokeWidth={1.75} />
                                            <div className="font-medium mt-3">{tit}</div>
                                            <p className="text-white/65 text-[15px] mt-1">{txt}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </Aparece>
                </div>
                <div id="faq" className="scroll-mt-24 mt-4 rounded-[28px] bg-[#EAE7DE] p-8 md:p-10">
                    <h3 className="text-2xl md:text-[30px] leading-tight font-medium tracking-[-0.025em] text-[#003A70]">{t.faq.titulo}</h3>
                    <div className="mt-6 divide-y divide-[#DDD8CC] border-t border-[#DDD8CC]">
                        {t.faq.lista.map(([pr, r], i) => (
                            <div key={pr}>
                                <button type="button" onClick={() => setAbierta(abierta === i ? -1 : i)} aria-expanded={abierta === i} className="w-full flex items-center justify-between gap-4 py-5 text-left text-lg font-medium text-[#003A70]">
                                    {pr}<span className={`w-8 h-8 shrink-0 rounded-full border border-[#003A70]/25 flex items-center justify-center transition-transform ${abierta === i ? 'rotate-45' : ''}`}><Plus className="w-4 h-4" /></span>
                                </button>
                                {abierta === i && <p className="pb-5 -mt-1 text-[#003A70]/70 leading-relaxed max-w-3xl animate-fade-in">{r}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* PIDE UNA DEMO */}
            <section id="demo" className="scroll-mt-24 max-w-6xl mx-auto px-4 pb-24 md:pb-32 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-12">
                <Aparece>
                    {titulo(t.formulario.titulo)}
                    <p className="text-lg text-[#003A70]/70 mt-4">{t.formulario.texto}</p>
                    <p className="text-[#003A70]/70 mt-6">{t.precio.texto}</p>
                    <div className="mt-8 space-y-3 text-[#003A70]">
                        <a href={`mailto:${CONTACTO.email}`} className="flex items-center gap-3 hover:underline"><Mail className="w-5 h-5 text-[#4197CB]" />{CONTACTO.email}</a>
                        <a href={`tel:${CONTACTO.telefono.replace(/\s/g, '')}`} className="flex items-center gap-3 hover:underline"><Phone className="w-5 h-5 text-[#4197CB]" />{CONTACTO.telefono}</a>
                        <div className="flex items-center gap-3"><MapPin className="w-5 h-5 text-[#4197CB]" />{CONTACTO.direccion}</div>
                    </div>
                </Aparece>
                <Aparece retraso={120}>
                    <div className="rounded-[28px] bg-white border border-[#DDD8CC] p-6 sm:p-8">
                        {enviado ? (
                            <div className="text-center py-10">
                                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                                <p className="mt-4 text-lg text-slate-800">{t.formulario.gracias}</p>
                                <button type="button" onClick={() => { setEnviado(false); setForm(FORM_VACIO); }} className="mt-4 text-sm font-medium text-[#003A70] underline">{t.formulario.otra}</button>
                            </div>
                        ) : (
                            <form onSubmit={(e) => { e.preventDefault(); if (formOk) setEnviado(true); }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[['nombre', 'text', 'name'], ['ett', 'text', 'organization'], ['email', 'email', 'email'], ['telefono', 'tel', 'tel']].map(([k, tipo, auto]) => (
                                    <label key={k} className="block">
                                        <span className="block text-[13px] font-medium text-[#003A70] mb-1.5">{t.formulario[k]}</span>
                                        <input type={tipo} autoComplete={auto} value={form[k]} onChange={(e) => setForm(f => ({ ...f, [k]: e.target.value }))} className="w-full h-12 rounded-xl bg-[#F4F2EC] border border-transparent px-3.5 text-[15px] outline-none focus:border-[#4197CB] focus:bg-white" />
                                    </label>
                                ))}
                                <label className="block sm:col-span-2">
                                    <span className="block text-[13px] font-medium text-[#003A70] mb-1.5">{t.formulario.sucursales}</span>
                                    <select value={form.sucursales} onChange={(e) => setForm(f => ({ ...f, sucursales: e.target.value }))} className="w-full h-12 rounded-xl bg-[#F4F2EC] border border-transparent px-3 text-[15px] outline-none focus:border-[#4197CB]">
                                        {t.formulario.opcionesSucursales.map((o, i) => <option key={o} value={i}>{o}</option>)}
                                    </select>
                                </label>
                                <label className="block sm:col-span-2">
                                    <span className="block text-[13px] font-medium text-[#003A70] mb-1.5">{t.formulario.mensaje}</span>
                                    <textarea rows={3} value={form.mensaje} onChange={(e) => setForm(f => ({ ...f, mensaje: e.target.value }))} className="w-full rounded-xl bg-[#F4F2EC] border border-transparent px-3.5 py-2.5 text-[15px] outline-none focus:border-[#4197CB] focus:bg-white" />
                                </label>
                                <label className="sm:col-span-2 flex items-start gap-2 text-sm text-[#003A70]/70">
                                    <input type="checkbox" checked={form.privacidad} onChange={(e) => setForm(f => ({ ...f, privacidad: e.target.checked }))} className="mt-0.5 rounded border-slate-300" />
                                    <span><a href="#privacidad" className="underline">{t.formulario.privacidad}</a></span>
                                </label>
                                <button type="submit" disabled={!formOk} className={`${botonAcento} sm:col-span-2 disabled:opacity-50`}>{t.formulario.enviar}</button>
                                <p className="sm:col-span-2 text-xs text-slate-400 text-center">{t.formulario.demoAviso}</p>
                            </form>
                        )}
                    </div>
                </Aparece>
            </section>

            {/* CIERRE */}
            <section className="max-w-6xl mx-auto px-4 pb-16">
                <Aparece>
                    <div className="rounded-[32px] bg-[#0E2238] px-6 py-16 md:px-16 md:py-24 text-center">
                        <h2 className="text-[34px] md:text-[56px] leading-[1.06] font-medium tracking-[-0.035em] text-white max-w-4xl mx-auto">{p.cierre.titulo}</h2>
                        <a href="#demo" className={`${botonAcento} mt-10`}>{t.demo}<ArrowRight className="w-4 h-4" /></a>
                    </div>
                </Aparece>
            </section>

            {/* PIE */}
            <footer className="max-w-6xl mx-auto px-4 pb-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-[15px] text-[#003A70]/75 border-t border-[#DDD8CC] pt-12">
                    <div className="lg:col-span-2">
                        <img src="/logo-tramitnow.svg" alt="TramitNow" className="h-7 w-auto" />
                        <p className="mt-3 max-w-xs">{t.pie.lema}</p>
                    </div>
                    <div className="space-y-2">{enlaces.map(([k, href]) => <a key={k} href={href} className="block hover:text-[#003A70]">{t.menu[k]}</a>)}</div>
                    <div className="space-y-2"><div>{CONTACTO.email}</div><div>{CONTACTO.telefono}</div><div>{CONTACTO.direccion}</div></div>
                </div>
                <div className="mt-10 overflow-hidden" aria-hidden="true">
                    <div className="text-[19vw] lg:text-[200px] font-medium tracking-[-0.06em] leading-[0.85] text-[#003A70]/[0.07] select-none">TramitNow</div>
                </div>
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-[#003A70]/55">
                    <span>© {new Date().getFullYear()} TramitNow. {t.pie.derechos}</span>
                    <span className="flex gap-4">{t.pie.legal.map(l => <a key={l} href="#" className="hover:text-[#003A70]">{l}</a>)}</span>
                </div>
            </footer>
        </div>
    );
}
