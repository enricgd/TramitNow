// Web corporativa de TramitNow (tramitnow.com). La aplicación y los portales van en subdominios:
// app.tramitnow.com (ERP) y {ett}.tramitnow.com (portales de cada ETT).
// Inspirada en las referencias del diseñador: fondos claros y titulares grandes (Holded, Factorial), cabecera
// flotante (Perk), y aparecer al hacer scroll e iconos que se dibujan (harbour.space).
// Colores del logo: azul marino #003A70 y azul claro #4197CB. Las «capturas» son maquetas con los datos de la demo.
import React, { useEffect, useRef, useState } from 'react';
import {
    ArrowRight, Check, CheckCircle2, ChevronDown, Building2, Calculator, ClipboardList, Users, FileSignature, BriefcaseBusiness,
    Clock, Receipt, Settings2, Network, Globe, RefreshCw, DatabaseBackup, ShieldCheck, History, Server, Lock, FileLock2, KeyRound,
    MoveRight, GraduationCap, Headphones, Smartphone, Monitor, Mail, Phone, MapPin, Menu, X,
} from 'lucide-react';
import { TEXTOS, CONTACTO } from './textos';
import { Aparece, IconoDibujado, TitularPorPalabras, movimientoReducido } from './animaciones';

const ICONOS_MODULOS = [Building2, Calculator, ClipboardList, Users, FileSignature, BriefcaseBusiness, Clock, Receipt, Settings2];
const ICONOS_VENTAJAS = [Network, Globe, RefreshCw, DatabaseBackup, KeyRound, History];
const ICONOS_SEGURIDAD = [Server, Lock, FileLock2, ShieldCheck];
const ICONOS_ACOMPANAMOS = [MoveRight, GraduationCap, Headphones];
// Módulos en tarjetas de distintos tamaños: índice en TEXTOS.modulos.lista y columnas que ocupa
const BENTO = [[6, 2], [7, 1], [0, 1], [1, 1], [2, 1], [3, 1], [4, 2], [5, 1], [8, 1]];

// Contenido de las maquetas de cada paso del recorrido (datos de ejemplo de la demo)
const MAQUETAS = [
    { titulo: 'PRE-2026-0042 · Campaña logística otoño', estado: ['Aceptado', 'ok'], cabecera: ['Puesto', 'Tarifa', 'Margen'], filas: [['Operario/a de almacén', '17,90 €/h', '14 %'], ['Carretillero/a', '19,55 €/h', '15 %']], pie: 'Total previsto: 105.792 €' },
    { titulo: 'PET-2026-0050 · Carretillero/a · tarde', estado: ['En selección', 'azul'], cabecera: ['Plaza', 'Persona', 'Estado'], filas: [['1', 'Unai García Zabaleta', 'Confirmada'], ['2', 'Carlos Manuel Ortiz Reyes', 'Confirmada'], ['3', 'David Aranguren Sola', 'Propuesta'], ['4', '—', 'Por cubrir']] },
    { titulo: 'Candidatos para carretillero/a · Bizkaia', estado: ['12 encontrados', 'azul'], cabecera: ['Persona', 'Encaje', 'Documentos'], filas: [['David Castillo Ruiz', '89 %', 'Al día'], ['Ibai Zubizarreta Lasa', '88 %', 'Al día'], ['Leire Ortuzar Bengoa', '80 %', 'Falta el carné']] },
    { titulo: 'Unai García Zabaleta · PET-2026-0050', estado: ['Empieza el 10/11', 'azul'], cabecera: ['Paso', 'Estado', ''], filas: [['Documentación', 'Hecho', ''], ['CPD firmado por la empresa', 'Hecho', ''], ['Contrato', 'Pendiente de firma', ''], ['Formación PRL y EPI', '06/11', ''], ['Alta en la Seguridad Social', 'Pendiente', '']] },
    { titulo: 'Parte semanal · Camarero/a de sala', estado: ['Validado por el cliente', 'ok'], cabecera: ['Persona', 'L M X J V', 'Total'], filas: [['Garazi Uribe Arana', '8 8 8 8 6+2', '40 h'], ['Daniel Sousa Prieto', '8 8 7,33 8 6', '37,33 h'], ['Irene Campos Gil', '8 8 8 Aus. 6', '30 h']], pie: 'Validado por Montse Ferrer el 13/10 a las 09:12' },
    { titulo: 'F2026-0101 · Septiembre de 2026', estado: ['Pendiente de cobro', 'aviso'], cabecera: ['Concepto', 'Horas', 'Importe'], filas: [['Base imponible', '992 h', '16.781,70 €'], ['IVA 21 %', '', '3.524,16 €']], pie: 'Total: 20.305,86 €' },
];
const TONO = { ok: 'bg-emerald-50 text-emerald-700', azul: 'bg-sky-50 text-sky-700', aviso: 'bg-amber-50 text-amber-700' };
const BIEN = ['Hecho', 'Confirmada', 'Al día'];

const leerIdioma = () => { try { return localStorage.getItem('tramitnow-idioma') === 'ca' ? 'ca' : 'es'; } catch { return 'es'; } };
const FORM_VACIO = { nombre: '', ett: '', email: '', telefono: '', sucursales: '0', mensaje: '', privacidad: false };

export default function WebCorporativa() {
    const [idioma, setIdioma] = useState(leerIdioma);
    const [paso, setPaso] = useState(0);
    const [abierta, setAbierta] = useState(0); // pregunta frecuente abierta
    const [menuMovil, setMenuMovil] = useState(false);
    const [compacta, setCompacta] = useState(false); // cabecera al hacer scroll
    const [barra, setBarra] = useState(false); // barra inferior de «Pide una demo»
    const [form, setForm] = useState(FORM_VACIO);
    const [enviado, setEnviado] = useState(false);
    const t = TEXTOS[idioma];

    const heroRef = useRef(null);
    const maquetaRef = useRef(null);
    const demoRef = useRef(null);
    const pasosRef = useRef([]);

    useEffect(() => { document.documentElement.lang = idioma; }, [idioma]);

    // Cabecera compacta y maqueta de la portada que se endereza al bajar
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
                if (maquetaRef.current && !reducido) {
                    const p = Math.min(y / 420, 1);
                    maquetaRef.current.style.transform = `perspective(1600px) rotateX(${(1 - p) * 16}deg) translateY(${(1 - p) * 24}px) scale(${0.93 + 0.07 * p})`;
                }
            });
        };
        alMover();
        window.addEventListener('scroll', alMover, { passive: true });
        return () => window.removeEventListener('scroll', alMover);
    }, []);

    // Barra inferior: aparece al dejar atrás la portada y se esconde en el formulario
    useEffect(() => {
        if (!('IntersectionObserver' in window)) return undefined;
        const vistos = { hero: true, demo: false };
        const io = new IntersectionObserver((entradas) => {
            entradas.forEach(e => { vistos[e.target === heroRef.current ? 'hero' : 'demo'] = e.isIntersecting; });
            setBarra(!vistos.hero && !vistos.demo);
        });
        if (heroRef.current) io.observe(heroRef.current);
        if (demoRef.current) io.observe(demoRef.current);
        return () => io.disconnect();
    }, []);

    // Recorrido: el paso activo es el que está en el centro de la pantalla (ordenador)
    useEffect(() => {
        if (!('IntersectionObserver' in window)) return undefined;
        const io = new IntersectionObserver((entradas) => {
            entradas.forEach(e => { if (e.isIntersecting) setPaso(Number(e.target.dataset.paso)); });
        }, { rootMargin: '-45% 0px -50% 0px' });
        pasosRef.current.forEach(el => el && io.observe(el));
        return () => io.disconnect();
    }, []);

    const cambiarIdioma = (i) => {
        setIdioma(i);
        try { localStorage.setItem('tramitnow-idioma', i); } catch { /* sin almacenamiento */ }
    };
    const enlaces = [['producto', '#producto'], ['recorrido', '#como-funciona'], ['portales', '#portales'], ['seguridad', '#seguridad'], ['contacto', '#demo']];
    const formOk = form.nombre.trim() && form.ett.trim() && /\S+@\S+\.\S+/.test(form.email) && form.privacidad;
    const chips = movimientoReducido() ? t.hecho.chips : [...t.hecho.chips, ...t.hecho.chips];

    const etiqueta = (texto, claro) => <div className={`text-xs font-bold uppercase tracking-[0.16em] ${claro ? 'text-sky-200' : 'text-[#4197CB]'}`}>{texto}</div>;
    const titulo = (texto, claro, centrado) => <h2 className={`text-[34px] md:text-5xl leading-[1.08] font-bold tracking-[-0.035em] mt-3 ${claro ? 'text-white' : 'text-[#003A70]'} ${centrado ? 'text-center' : ''}`}>{texto}</h2>;
    const boton = 'inline-flex items-center justify-center gap-2 rounded-full px-6 h-12 font-semibold text-[15px] transition whitespace-nowrap';
    const botonPrincipal = `${boton} bg-[#1769aa] text-white shadow-[0_8px_20px_rgba(23,105,170,0.28)] hover:bg-[#10598f] hover:-translate-y-px`;

    const maqueta = (m) => (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-[0_24px_60px_rgba(0,58,112,0.14)] overflow-hidden text-left">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-900 truncate">{m.titulo}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${TONO[m.estado[1]]}`}>{m.estado[0]}</span>
            </div>
            <div className="px-4 py-2">
                <div className="grid grid-cols-[1.6fr_1fr_1fr] gap-2 py-1.5 text-[11px] font-medium text-slate-400">{m.cabecera.map((c, i) => <span key={i} className={i === 2 ? 'text-right' : ''}>{c}</span>)}</div>
                {m.filas.map((f, i) => (
                    <div key={i} className="grid grid-cols-[1.6fr_1fr_1fr] gap-2 py-2 border-t border-slate-100 text-[13px]">
                        <span className="text-slate-800 truncate">{f[0]}</span>
                        <span className={BIEN.includes(f[1]) ? 'text-emerald-700' : 'text-slate-600'}>{BIEN.includes(f[1]) && <Check className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />}{f[1]}</span>
                        <span className={`text-right ${BIEN.includes(f[2]) ? 'text-emerald-700' : ['Por cubrir', 'Falta el carné'].includes(f[2]) ? 'text-amber-700' : 'text-slate-800'}`}>{f[2]}</span>
                    </div>
                ))}
            </div>
            {m.pie && <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-600">{m.pie}</div>}
        </div>
    );

    // Maqueta del ERP en el navegador, con el portal del trabajador en el móvil (portada)
    const pantallas = () => (
        <div className="relative">
            <div className="rounded-2xl bg-white shadow-[0_40px_100px_rgba(0,58,112,0.22)] ring-1 ring-slate-200 overflow-hidden">
                <div className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-50 border-b border-slate-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-300" /><span className="w-2.5 h-2.5 rounded-full bg-amber-300" /><span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
                    <span className="mx-auto w-48 sm:w-72 rounded-md bg-white border border-slate-200 px-2 py-0.5 text-center text-[10px] text-slate-400">app.tramitnow.com</span>
                </div>
                <div className="flex text-left">
                    <div className="hidden sm:block w-36 bg-[#0f1b33] p-3 space-y-1.5">
                        <img src="/logo-tramitnow.svg" alt="" className="h-4 brightness-0 invert mb-4" />
                        {['Inicio', 'Empresas', 'Presupuestos', 'Peticiones', 'Candidatos', 'Contratos y altas', 'Horas', 'Facturación'].map((x, i) => <div key={x} className={`rounded-md px-2 py-1.5 text-[10px] ${i === 0 ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>{x}</div>)}
                    </div>
                    <div className="flex-1 p-4 sm:p-6 space-y-4 min-w-0 bg-slate-50/50">
                        <div><div className="text-[15px] font-semibold text-slate-900">Buenos días, Begoña</div><div className="text-[10px] text-slate-500">Delegación Norte · jueves 29 de octubre</div></div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[['Peticiones abiertas', '4', 'bg-indigo-500'], ['En misión hoy', '17', 'bg-emerald-500'], ['Partes por validar', '2', 'bg-amber-500'], ['Por cobrar', '40.247 €', 'bg-sky-500']].map(([l, v, c]) => (
                                <div key={l} className="rounded-lg border border-slate-200 bg-white p-2.5"><div className="flex items-center gap-1 text-[9px] text-slate-500"><span className={`w-1.5 h-1.5 rounded-full ${c}`} />{l}</div><div className="text-base font-semibold text-slate-900 mt-0.5">{v}</div></div>
                            ))}
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white">
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
            <div className="absolute -bottom-8 -right-3 sm:-right-10 w-[128px] sm:w-[170px] rounded-[24px] bg-[#0f1b33] p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
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

    // Mini maquetas de las tarjetas grandes de módulos
    const miniModulo = (i) => {
        if (i === 6) return (
            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-3 text-[11px]">
                {[['Garazi Uribe', [8, 8, 8, 8, '6+2']], ['Daniel Sousa', [8, 8, 7.33, 8, 6]], ['Irene Campos', [8, 8, 8, 'Aus.', 6]]].map(([n, d]) => (
                    <div key={n} className="grid grid-cols-[1.4fr_repeat(5,1fr)] gap-1 py-1 items-center">
                        <span className="text-slate-700 truncate">{n}</span>
                        {d.map((h, k) => <span key={k} className={`text-center rounded ${h === 'Aus.' ? 'bg-sky-50 text-sky-700' : String(h).includes('+') ? 'text-indigo-700' : 'text-slate-600'}`}>{typeof h === 'number' ? String(h).replace('.', ',') : h}</span>)}
                    </div>
                ))}
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-emerald-700"><ShieldCheck className="w-3.5 h-3.5" />Validado por el cliente</div>
            </div>
        );
        if (i === 4) return (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-5 gap-2 text-[11px]">
                {[['Documentación', true], ['CPD', true], ['Contrato', false], ['PRL y EPI', false], ['Alta SS', false]].map(([n, ok], k) => (
                    <div key={n} className={`rounded-lg border px-2.5 py-2 ${ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : k === 2 ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-500'}`}>
                        {ok ? <Check className="w-3.5 h-3.5 mb-0.5" /> : <span className="block w-3.5 h-3.5 mb-0.5 rounded-full border border-current" />}{n}
                    </div>
                ))}
            </div>
        );
        if (i === 7) return (
            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-3 text-[11px] space-y-1">
                <div className="flex justify-between text-slate-500"><span>F2026-0101</span><span className="text-amber-700">Pendiente</span></div>
                <div className="text-lg font-semibold text-slate-900">20.305,86 €</div>
                <div className="text-slate-500">992 h validadas · septiembre</div>
            </div>
        );
        return null;
    };

    return (
        <div className="min-h-screen bg-white text-slate-700">
            {/* Barra de la demo */}
            <div className="bg-slate-900 text-slate-300 text-xs">
                <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
                    <span>Demo · web corporativa · en real: tramitnow.com</span>
                    <a href="/" className="text-indigo-300 hover:text-white">Ir a la demo del ERP</a>
                </div>
            </div>

            {/* CABECERA FLOTANTE */}
            <div className={`sticky top-0 z-40 px-3 transition-all duration-300 ${compacta ? 'pt-2' : 'pt-4'} -mb-[76px]`}>
                <header className={`max-w-6xl mx-auto rounded-full border transition-all duration-300 ${compacta ? 'bg-white/90 border-slate-200 shadow-[0_8px_30px_rgba(0,58,112,0.10)] backdrop-blur' : 'bg-white/60 border-white/80 backdrop-blur'}`}>
                    <div className={`flex items-center gap-6 pl-5 pr-2 transition-all duration-300 ${compacta ? 'h-14' : 'h-16'}`}>
                        <a href="#inicio" className="shrink-0"><img src="/logo-tramitnow.svg" alt="TramitNow" className="h-6 sm:h-7 w-auto" /></a>
                        <nav className="hidden lg:flex items-center gap-6 text-sm text-slate-600">
                            {enlaces.map(([k, href]) => <a key={k} href={href} className="hover:text-[#003A70]">{t.menu[k]}</a>)}
                        </nav>
                        <div className="ml-auto flex items-center gap-2 sm:gap-3">
                            <div className="flex rounded-full border border-slate-200 bg-white p-0.5 text-xs" role="group" aria-label="Idioma">
                                {['es', 'ca'].map(i => <button key={i} type="button" onClick={() => cambiarIdioma(i)} aria-pressed={idioma === i} className={`px-2.5 py-1 rounded-full font-semibold ${idioma === i ? 'bg-[#003A70] text-white' : 'text-slate-500 hover:text-slate-800'}`}>{i.toUpperCase()}</button>)}
                            </div>
                            <a href="/" className="hidden md:inline text-sm font-semibold text-[#003A70] hover:underline whitespace-nowrap">{t.acceder}</a>
                            <span className="hidden md:block"><a href="#demo" className={`${botonPrincipal} h-10 px-5 text-sm`}>{t.demo}</a></span>
                            <button type="button" className="lg:hidden p-2 text-slate-600" aria-label="Menú" aria-expanded={menuMovil} onClick={() => setMenuMovil(!menuMovil)}>{menuMovil ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
                        </div>
                    </div>
                </header>
                {menuMovil && (
                    <nav className="lg:hidden max-w-6xl mx-auto mt-2 rounded-3xl border border-slate-200 bg-white shadow-lg px-5 py-4 space-y-1">
                        {enlaces.map(([k, href]) => <a key={k} href={href} onClick={() => setMenuMovil(false)} className="block py-2 text-slate-700">{t.menu[k]}</a>)}
                        <a href="/" className="block py-2 font-semibold text-[#003A70]">{t.acceder}</a>
                        <a href="#demo" onClick={() => setMenuMovil(false)} className={`${botonPrincipal} w-full mt-2`}>{t.demo}</a>
                    </nav>
                )}
            </div>

            {/* PORTADA: clara, titular centrado y la maqueta del ERP debajo */}
            <section id="inicio" ref={heroRef} className="relative overflow-hidden bg-[radial-gradient(70%_55%_at_50%_0%,#d7ebf8_0%,rgba(255,255,255,0)_70%),radial-gradient(35%_40%_at_95%_35%,#e3eefb_0%,rgba(255,255,255,0)_70%),radial-gradient(35%_40%_at_5%_45%,#e6f3f8_0%,rgba(255,255,255,0)_70%)]">
                <div className="relative max-w-6xl mx-auto px-4 pt-36 md:pt-44 pb-24 md:pb-32 text-center">
                    <Aparece><div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-[#1769aa]"><span className="w-1.5 h-1.5 rounded-full bg-[#4197CB]" />{t.hero.etiqueta}</div></Aparece>
                    <TitularPorPalabras key={idioma} texto={t.hero.titulo} final={<span className="text-[#4197CB]">.</span>} className="text-[44px] sm:text-6xl md:text-7xl leading-[1.02] font-bold tracking-[-0.045em] text-[#003A70] mt-6 max-w-4xl mx-auto" />
                    <Aparece retraso={500}><p className="text-lg md:text-xl leading-relaxed text-slate-500 mt-6 max-w-2xl mx-auto">{t.hero.texto}</p></Aparece>
                    <Aparece retraso={650}>
                        <div className="flex flex-wrap justify-center gap-3 mt-9">
                            <a href="#demo" className={botonPrincipal}>{t.demo}<ArrowRight className="w-4 h-4" /></a>
                            <a href="#como-funciona" className={`${boton} border border-slate-300 bg-white text-[#003A70] hover:border-[#4197CB]`}>{t.hero.secundario}</a>
                        </div>
                        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6 text-sm text-slate-500">{t.hero.notas.map(n => <span key={n} className="inline-flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#4197CB]" />{n}</span>)}</div>
                    </Aparece>
                    <div ref={maquetaRef} className="mt-16 md:mt-20 max-w-5xl mx-auto pr-3 sm:pr-8 origin-top will-change-transform">{pantallas()}</div>
                </div>
            </section>

            {/* FRANJA EN MOVIMIENTO: lo que pide la ley */}
            <section className="border-y border-slate-200 bg-slate-50 py-6 overflow-hidden">
                <div className="text-center text-xs font-bold uppercase tracking-[0.16em] text-slate-400 mb-4 px-4">{t.hecho.titulo}</div>
                <div className="relative [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
                    <div className="marquesina flex w-max gap-3">
                        {chips.map((c, i) => <span key={i} className="shrink-0 rounded-full bg-white border border-slate-200 px-4 py-2 text-sm text-slate-600 whitespace-nowrap">{c}</span>)}
                    </div>
                </div>
            </section>

            {/* CÓMO FUNCIONA: avanza con el scroll en el ordenador; pestañas en el móvil */}
            <section id="como-funciona" className="scroll-mt-20 max-w-6xl mx-auto px-4 py-24 md:py-32">
                <Aparece className="max-w-2xl">
                    {etiqueta(t.recorrido.etiqueta)}
                    {titulo(t.recorrido.titulo)}
                    <p className="text-lg text-slate-500 mt-4">{t.recorrido.texto}</p>
                </Aparece>

                {/* Ordenador */}
                <div className="hidden lg:grid grid-cols-2 gap-16 mt-12">
                    <div>
                        {t.recorrido.pasos.map((p, i) => (
                            <div key={i} ref={el => { pasosRef.current[i] = el; }} data-paso={i} className={`min-h-[62vh] flex flex-col justify-center border-l-2 pl-8 transition-colors duration-500 ${paso === i ? 'border-[#1769aa]' : 'border-slate-200'}`}>
                                <div className={`transition-opacity duration-500 ${paso === i ? 'opacity-100' : 'opacity-35'}`}>
                                    <div className="text-sm font-semibold text-[#4197CB]">{String(i + 1).padStart(2, '0')} · {p.corto}</div>
                                    <h3 className="text-3xl font-bold text-[#003A70] tracking-[-0.025em] mt-2">{p.titulo}</h3>
                                    <p className="text-slate-600 leading-relaxed mt-3 text-lg">{p.texto}</p>
                                    <ul className="mt-5 space-y-2">{p.puntos.map(x => <li key={x} className="flex items-center gap-2.5 text-slate-700"><span className="w-5 h-5 rounded-full bg-sky-100 text-[#1769aa] flex items-center justify-center"><Check className="w-3.5 h-3.5" /></span>{x}</li>)}</ul>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div>
                        <div className="sticky top-28">
                            <div className="rounded-3xl bg-[linear-gradient(145deg,#e4f1fa,#f6f9fc)] p-10">
                                <div className="flex gap-1.5 mb-6">{MAQUETAS.map((_, i) => <span key={i} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i <= paso ? 'bg-[#1769aa]' : 'bg-white'}`} />)}</div>
                                <div key={paso} className="animate-fade-in">{maqueta(MAQUETAS[paso])}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Móvil y tableta */}
                <div className="lg:hidden">
                    <div className="mt-10 flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                        {t.recorrido.pasos.map((p, i) => (
                            <button key={i} type="button" onClick={() => setPaso(i)} className={`shrink-0 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium border transition ${paso === i ? 'bg-[#003A70] border-[#003A70] text-white' : 'border-slate-200 text-slate-600'}`}>
                                <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${paso === i ? 'bg-white text-[#003A70]' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</span>{p.corto}
                            </button>
                        ))}
                    </div>
                    <div className="mt-8 grid grid-cols-1 gap-8">
                        <div>
                            <h3 className="text-2xl font-bold text-[#003A70] tracking-[-0.02em]">{t.recorrido.pasos[paso].titulo}</h3>
                            <p className="text-slate-600 leading-relaxed mt-3">{t.recorrido.pasos[paso].texto}</p>
                            <ul className="mt-5 space-y-2">{t.recorrido.pasos[paso].puntos.map(x => <li key={x} className="flex items-center gap-2.5 text-slate-700"><Check className="w-4 h-4 text-[#1769aa]" />{x}</li>)}</ul>
                        </div>
                        <div className="rounded-2xl bg-[linear-gradient(145deg,#e4f1fa,#f6f9fc)] p-5 min-w-0">{maqueta(MAQUETAS[paso])}</div>
                    </div>
                </div>
            </section>

            {/* MÓDULOS EN TARJETAS DE DISTINTOS TAMAÑOS */}
            <section id="producto" className="scroll-mt-20 bg-slate-50 border-y border-slate-200">
                <div className="max-w-6xl mx-auto px-4 py-24 md:py-32">
                    <Aparece className="text-center">
                        {etiqueta(t.modulos.etiqueta)}
                        {titulo(t.modulos.titulo, false, true)}
                        <p className="text-lg text-slate-500 mt-4">{t.modulos.subtitulo}</p>
                    </Aparece>
                    <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {BENTO.map(([i, ancho], k) => {
                            const [n, d] = t.modulos.lista[i];
                            return (
                                <Aparece key={i} retraso={(k % 3) * 90} className={ancho === 2 ? 'md:col-span-2' : ''}>
                                    <div className={`h-full rounded-3xl border border-slate-200 bg-white p-7 transition hover:border-[#4197CB] hover:shadow-[0_16px_40px_rgba(0,58,112,0.10)] ${ancho === 2 ? 'bg-[linear-gradient(160deg,#ffffff_40%,#eef6fc)]' : ''}`}>
                                        <IconoDibujado icono={ICONOS_MODULOS[i]} className="w-9 h-9 text-[#1769aa]" retraso={(k % 3) * 120} />
                                        <div className={`mt-4 font-bold text-[#003A70] tracking-[-0.02em] ${ancho === 2 ? 'text-2xl' : 'text-xl'}`}>{n}</div>
                                        <p className="text-slate-500 mt-1.5 leading-relaxed">{d}</p>
                                        {miniModulo(i)}
                                    </div>
                                </Aparece>
                            );
                        })}
                        <Aparece retraso={180}>
                            <a href="#portales" className="group h-full min-h-[180px] rounded-3xl bg-[#003A70] text-white p-7 flex flex-col justify-between hover:bg-[#0b467f] transition">
                                <span className="text-xl font-bold tracking-[-0.02em]">{t.modulos.mas}</span>
                                <ArrowRight className="w-6 h-6 text-sky-300 transition-transform group-hover:translate-x-1" />
                            </a>
                        </Aparece>
                    </div>
                </div>
            </section>

            {/* PORTALES */}
            <section id="portales" className="scroll-mt-20 max-w-6xl mx-auto px-4 py-24 md:py-32">
                <Aparece className="max-w-2xl">
                    {etiqueta(t.portales.etiqueta)}
                    {titulo(t.portales.titulo)}
                    <p className="text-lg text-slate-500 mt-4">{t.portales.texto}</p>
                </Aparece>
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[[t.portales.trabajador, Smartphone, 'tuett.tramitnow.com/trabajadores'], [t.portales.empresa, Monitor, 'tuett.tramitnow.com/empresas']].map(([p, Icono, url], k) => (
                        <Aparece key={p.titulo} retraso={k * 120}>
                            <div className="h-full rounded-3xl border border-slate-200 p-8 bg-[linear-gradient(180deg,#ffffff,#f3f8fc)]">
                                <IconoDibujado icono={Icono} className="w-10 h-10 text-[#1769aa]" />
                                <div className="mt-4 font-bold text-[#003A70] text-2xl tracking-[-0.02em]">{p.titulo}</div>
                                <div className="text-sm text-[#4197CB] font-medium">{url}</div>
                                <p className="text-slate-600 mt-4">{p.texto}</p>
                                <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">{p.puntos.map(x => <li key={x} className="flex items-center gap-2 text-slate-700"><Check className="w-4 h-4 text-[#1769aa] shrink-0" />{x}</li>)}</ul>
                            </div>
                        </Aparece>
                    ))}
                </div>
            </section>

            {/* POR QUÉ TRAMITNOW (el único bloque oscuro, con el pie) */}
            <section className="relative overflow-hidden text-white bg-[linear-gradient(145deg,#003A70,#155b8e_62%,#1b7c9f)]">
                <span className="absolute w-[620px] h-[620px] -left-[260px] -bottom-[320px] rounded-full border border-white/10" />
                <span className="absolute w-[460px] h-[460px] -right-[200px] -top-[200px] rounded-full border border-white/10" />
                <div className="relative max-w-6xl mx-auto px-4 py-24 md:py-32">
                    <Aparece>
                        {etiqueta(t.ventajas.etiqueta, true)}
                        {titulo(t.ventajas.titulo, true)}
                    </Aparece>
                    <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
                        {t.ventajas.lista.map(([n, d], i) => (
                            <Aparece key={n} retraso={(i % 3) * 100}>
                                <IconoDibujado icono={ICONOS_VENTAJAS[i]} className="w-9 h-9 text-sky-300" retraso={(i % 3) * 150} />
                                <div className="mt-4 font-semibold text-xl">{n}</div>
                                <p className="text-sky-100/80 mt-1.5 leading-relaxed">{d}</p>
                            </Aparece>
                        ))}
                    </div>
                </div>
            </section>

            {/* SEGURIDAD Y ACOMPAÑAMIENTO */}
            <section id="seguridad" className="scroll-mt-20 max-w-6xl mx-auto px-4 py-24 md:py-32 grid grid-cols-1 lg:grid-cols-2 gap-16">
                <div>
                    <Aparece>{etiqueta(t.seguridad.etiqueta)}{titulo(t.seguridad.titulo)}</Aparece>
                    <div className="mt-10 space-y-6">
                        {t.seguridad.lista.map(([n, d], i) => (
                            <Aparece key={n} retraso={i * 80} className="flex gap-4">
                                <span className="w-12 h-12 shrink-0 rounded-2xl bg-sky-50 flex items-center justify-center"><IconoDibujado icono={ICONOS_SEGURIDAD[i]} className="w-6 h-6 text-[#1769aa]" retraso={i * 120} /></span>
                                <div><div className="font-semibold text-[#003A70] text-lg">{n}</div><p className="text-slate-500">{d}</p></div>
                            </Aparece>
                        ))}
                    </div>
                </div>
                <div>
                    <Aparece>{etiqueta(t.acompanamos.etiqueta)}{titulo(t.acompanamos.titulo)}</Aparece>
                    <div className="mt-10 space-y-4">
                        {t.acompanamos.lista.map(([n, d], i) => (
                            <Aparece key={n} retraso={i * 80}>
                                <div className="rounded-3xl border border-slate-200 p-6 flex gap-4">
                                    <IconoDibujado icono={ICONOS_ACOMPANAMOS[i]} className="w-8 h-8 text-[#1769aa] shrink-0" retraso={i * 120} />
                                    <div><div className="font-semibold text-[#003A70] text-lg">{n}</div><p className="text-slate-500">{d}</p></div>
                                </div>
                            </Aparece>
                        ))}
                    </div>
                    <Aparece retraso={200}>
                        <div className="mt-6 rounded-3xl bg-[linear-gradient(145deg,#e4f1fa,#f3f8fc)] p-7">
                            <div className="font-bold text-[#003A70] text-xl tracking-[-0.02em]">{t.precio.titulo}</div>
                            <p className="text-slate-600 mt-2">{t.precio.texto}</p>
                            <a href="#demo" className={`${botonPrincipal} mt-5`}>{t.precio.boton}<ArrowRight className="w-4 h-4" /></a>
                        </div>
                    </Aparece>
                </div>
            </section>

            {/* PREGUNTAS FRECUENTES */}
            <section className="bg-slate-50 border-y border-slate-200">
                <div className="max-w-3xl mx-auto px-4 py-24">
                    <Aparece>{titulo(t.faq.titulo, false, true)}</Aparece>
                    <div className="mt-10 space-y-3">
                        {t.faq.lista.map(([p, r], i) => (
                            <Aparece key={p} retraso={i * 60}>
                                <div className={`rounded-2xl border bg-white transition ${abierta === i ? 'border-[#4197CB] shadow-[0_10px_30px_rgba(0,58,112,0.08)]' : 'border-slate-200'}`}>
                                    <button type="button" onClick={() => setAbierta(abierta === i ? -1 : i)} aria-expanded={abierta === i} className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left font-semibold text-[#003A70]">
                                        {p}<ChevronDown className={`w-5 h-5 shrink-0 text-slate-400 transition-transform ${abierta === i ? 'rotate-180' : ''}`} />
                                    </button>
                                    {abierta === i && <p className="px-6 pb-5 -mt-1 text-slate-600 leading-relaxed">{r}</p>}
                                </div>
                            </Aparece>
                        ))}
                    </div>
                </div>
            </section>

            {/* PIDE UNA DEMO */}
            <section id="demo" ref={demoRef} className="scroll-mt-20 max-w-6xl mx-auto px-4 py-24 md:py-32 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-12">
                <Aparece>
                    {titulo(t.formulario.titulo)}
                    <p className="text-lg text-slate-500 mt-4">{t.formulario.texto}</p>
                    <div className="mt-8 space-y-3 text-slate-700">
                        <a href={`mailto:${CONTACTO.email}`} className="flex items-center gap-3 hover:text-[#1769aa]"><Mail className="w-5 h-5 text-[#4197CB]" />{CONTACTO.email}</a>
                        <a href={`tel:${CONTACTO.telefono.replace(/\s/g, '')}`} className="flex items-center gap-3 hover:text-[#1769aa]"><Phone className="w-5 h-5 text-[#4197CB]" />{CONTACTO.telefono}</a>
                        <div className="flex items-center gap-3"><MapPin className="w-5 h-5 text-[#4197CB]" />{CONTACTO.direccion}</div>
                    </div>
                </Aparece>
                <Aparece retraso={120}>
                    <div className="rounded-3xl border border-slate-200 shadow-[0_24px_60px_rgba(0,58,112,0.10)] p-6 sm:p-8">
                        {enviado ? (
                            <div className="text-center py-10">
                                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                                <p className="mt-4 text-lg text-slate-800">{t.formulario.gracias}</p>
                                <button type="button" onClick={() => { setEnviado(false); setForm(FORM_VACIO); }} className="mt-4 text-sm font-semibold text-[#1769aa] hover:underline">{t.formulario.otra}</button>
                            </div>
                        ) : (
                            <form onSubmit={(e) => { e.preventDefault(); if (formOk) setEnviado(true); }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[['nombre', 'text', 'name'], ['ett', 'text', 'organization'], ['email', 'email', 'email'], ['telefono', 'tel', 'tel']].map(([k, tipo, auto]) => (
                                    <label key={k} className="block">
                                        <span className="block text-[13px] font-semibold text-slate-800 mb-1.5">{t.formulario[k]}</span>
                                        <input type={tipo} autoComplete={auto} value={form[k]} onChange={(e) => setForm(f => ({ ...f, [k]: e.target.value }))} className="w-full h-12 rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-[#1769aa] focus:ring-3 focus:ring-[#1769aa]/15" />
                                    </label>
                                ))}
                                <label className="block sm:col-span-2">
                                    <span className="block text-[13px] font-semibold text-slate-800 mb-1.5">{t.formulario.sucursales}</span>
                                    <select value={form.sucursales} onChange={(e) => setForm(f => ({ ...f, sucursales: e.target.value }))} className="w-full h-12 rounded-xl border border-slate-200 px-3 text-sm bg-white outline-none focus:border-[#1769aa]">
                                        {t.formulario.opcionesSucursales.map((o, i) => <option key={o} value={i}>{o}</option>)}
                                    </select>
                                </label>
                                <label className="block sm:col-span-2">
                                    <span className="block text-[13px] font-semibold text-slate-800 mb-1.5">{t.formulario.mensaje}</span>
                                    <textarea rows={3} value={form.mensaje} onChange={(e) => setForm(f => ({ ...f, mensaje: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#1769aa] focus:ring-3 focus:ring-[#1769aa]/15" />
                                </label>
                                <label className="sm:col-span-2 flex items-start gap-2 text-sm text-slate-600">
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

            {/* PIE */}
            <footer className="bg-[#002a52] text-sky-100/80 pb-20 md:pb-0">
                <div className="max-w-6xl mx-auto px-4 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-sm">
                    <div className="lg:col-span-2">
                        <img src="/logo-tramitnow.svg" alt="TramitNow" className="h-7 w-auto brightness-0 invert" />
                        <p className="mt-3 max-w-xs">{t.pie.lema}</p>
                    </div>
                    <div className="space-y-2">{enlaces.map(([k, href]) => <a key={k} href={href} className="block hover:text-white">{t.menu[k]}</a>)}</div>
                    <div className="space-y-2"><div>{CONTACTO.email}</div><div>{CONTACTO.telefono}</div><div>{CONTACTO.direccion}</div></div>
                </div>
                <div className="border-t border-white/10">
                    <div className="max-w-6xl mx-auto px-4 py-5 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <span>© {new Date().getFullYear()} TramitNow. {t.pie.derechos}</span>
                        <span className="flex gap-4">{t.pie.legal.map(l => <a key={l} href="#" className="hover:text-white">{l}</a>)}</span>
                    </div>
                </div>
            </footer>

            {/* BARRA INFERIOR DE «PIDE UNA DEMO» (aparece después de la portada) */}
            <div className={`fixed bottom-4 inset-x-0 z-40 px-3 transition-all duration-500 ${barra ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'}`} aria-hidden={!barra}>
                <div className="max-w-xl mx-auto flex items-center justify-between gap-3 rounded-full bg-white/90 backdrop-blur border border-slate-200 shadow-[0_12px_40px_rgba(0,58,112,0.18)] pl-5 pr-1.5 py-1.5">
                    <span className="text-sm font-medium text-[#003A70] truncate">{t.barra.texto}</span>
                    <a href="#demo" tabIndex={barra ? 0 : -1} className={`${botonPrincipal} h-10 px-4 text-sm`}>{t.barra.boton}</a>
                </div>
            </div>
        </div>
    );
}
