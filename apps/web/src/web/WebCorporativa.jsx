// Web corporativa de TramitNow (tramitnow.com). La aplicación y los portales van en subdominios:
// app.tramitnow.com (ERP) y {ett}.tramitnow.com (portales de cada ETT).
// Colores del logo: azul marino #003A70 y azul claro #4197CB, con el degradado de la pantalla de acceso del ERP.
// Las «capturas» son maquetas hechas con los mismos datos de ejemplo de la demo.
import React, { useEffect, useState } from 'react';
import {
    ArrowRight, Check, CheckCircle2, ChevronDown, Building2, Calculator, ClipboardList, Users, FileSignature, BriefcaseBusiness,
    Clock, Receipt, Settings2, Network, Globe, RefreshCw, DatabaseBackup, ShieldCheck, History, Server, Lock, FileLock2, KeyRound,
    MoveRight, GraduationCap, Headphones, Smartphone, Monitor, Mail, Phone, MapPin, Menu, X,
} from 'lucide-react';
import { TEXTOS, CONTACTO } from './textos';

const ICONOS_MODULOS = [Building2, Calculator, ClipboardList, Users, FileSignature, BriefcaseBusiness, Clock, Receipt, Settings2];
const ICONOS_VENTAJAS = [Network, Globe, RefreshCw, DatabaseBackup, KeyRound, History];
const ICONOS_SEGURIDAD = [Server, Lock, FileLock2, ShieldCheck];
const ICONOS_ACOMPANAMOS = [MoveRight, GraduationCap, Headphones];

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

const leerIdioma = () => { try { return localStorage.getItem('tramitnow-idioma') === 'ca' ? 'ca' : 'es'; } catch { return 'es'; } };

export default function WebCorporativa() {
    const [idioma, setIdioma] = useState(leerIdioma);
    const [paso, setPaso] = useState(0);
    const [abierta, setAbierta] = useState(0); // pregunta frecuente abierta
    const [menuMovil, setMenuMovil] = useState(false);
    const [form, setForm] = useState({ nombre: '', ett: '', email: '', telefono: '', sucursales: '0', mensaje: '', privacidad: false });
    const [enviado, setEnviado] = useState(false);
    const t = TEXTOS[idioma];
    useEffect(() => { document.documentElement.lang = idioma; }, [idioma]);

    const cambiarIdioma = (i) => {
        setIdioma(i);
        try { localStorage.setItem('tramitnow-idioma', i); } catch { /* sin almacenamiento */ }
    };
    const enlaces = [['producto', '#producto'], ['recorrido', '#como-funciona'], ['portales', '#portales'], ['seguridad', '#seguridad'], ['contacto', '#demo']];
    const formOk = form.nombre.trim() && form.ett.trim() && /\S+@\S+\.\S+/.test(form.email) && form.privacidad;

    const Etiqueta = ({ children, claro }) => <div className={`text-xs font-bold uppercase tracking-[0.16em] ${claro ? 'text-sky-200' : 'text-[#4197CB]'}`}>{children}</div>;
    const Titulo = ({ children, claro }) => <h2 className={`text-3xl md:text-[40px] leading-tight font-bold tracking-[-0.03em] mt-3 ${claro ? 'text-white' : 'text-[#003A70]'}`}>{children}</h2>;
    const boton = 'inline-flex items-center justify-center gap-2 rounded-[10px] px-5 h-12 font-semibold text-[15px] transition';
    const botonPrincipal = `${boton} bg-[#1769aa] text-white shadow-[0_7px_16px_rgba(23,105,170,0.25)] hover:bg-[#10598f]`;

    const maqueta = (m) => (
        <div className="rounded-xl bg-white border border-slate-200 shadow-[0_24px_60px_rgba(0,58,112,0.14)] overflow-hidden text-left">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-900 truncate">{m.titulo}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${TONO[m.estado[1]]}`}>{m.estado[0]}</span>
            </div>
            <div className="px-4 py-2">
                <div className="grid grid-cols-[1.6fr_1fr_1fr] gap-2 py-1.5 text-[11px] font-medium text-slate-400">{m.cabecera.map((c, i) => <span key={i} className={i === 2 ? 'text-right' : ''}>{c}</span>)}</div>
                {m.filas.map((f, i) => (
                    <div key={i} className="grid grid-cols-[1.6fr_1fr_1fr] gap-2 py-2 border-t border-slate-100 text-[13px]">
                        <span className="text-slate-800 truncate">{f[0]}</span>
                        <span className={['Hecho', 'Confirmada', 'Al día'].includes(f[1]) ? 'text-emerald-700' : 'text-slate-600'}>{['Hecho', 'Confirmada', 'Al día'].includes(f[1]) && <Check className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />}{f[1]}</span>
                        <span className={`text-right ${['Confirmada', 'Al día'].includes(f[2]) ? 'text-emerald-700' : f[2] === 'Por cubrir' || f[2] === 'Falta el carné' ? 'text-amber-700' : 'text-slate-800'}`}>{f[2]}</span>
                    </div>
                ))}
            </div>
            {m.pie && <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-600">{m.pie}</div>}
        </div>
    );

    // Maqueta del ERP en un navegador y del portal del trabajador en un móvil (portada)
    const pantallas = () => (
        <div className="relative">
            <div className="rounded-2xl bg-white/95 shadow-[0_30px_80px_rgba(0,0,0,0.35)] overflow-hidden">
                <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 border-b border-slate-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-300" /><span className="w-2.5 h-2.5 rounded-full bg-amber-300" /><span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
                    <span className="ml-3 flex-1 rounded-md bg-white px-2 py-0.5 text-[10px] text-slate-400">app.tramitnow.com</span>
                </div>
                <div className="flex text-left">
                    <div className="hidden sm:block w-28 bg-[#0f1b33] p-2.5 space-y-1.5">
                        <img src="/logo-tramitnow.svg" alt="" className="h-3.5 brightness-0 invert mb-3" />
                        {['Inicio', 'Empresas', 'Presupuestos', 'Peticiones', 'Candidatos', 'Contratos', 'Horas', 'Facturación'].map((x, i) => <div key={x} className={`rounded px-1.5 py-1 text-[9px] ${i === 0 ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>{x}</div>)}
                    </div>
                    <div className="flex-1 p-3 sm:p-4 space-y-3 min-w-0">
                        <div className="text-[13px] font-semibold text-slate-900">Buenos días, Begoña</div>
                        <div className="grid grid-cols-3 gap-2">
                            {[['Peticiones abiertas', '4'], ['En misión hoy', '17'], ['Partes por validar', '2']].map(([l, v]) => (
                                <div key={l} className="rounded-lg border border-slate-200 p-2"><div className="text-[9px] text-slate-500">{l}</div><div className="text-base font-semibold text-slate-900">{v}</div></div>
                            ))}
                        </div>
                        <div className="rounded-lg border border-slate-200">
                            {[['PET-2026-0050 · Carretillero/a', '2 de 4', 'bg-indigo-500 w-1/2'], ['PET-2026-0049 · Operario/a', '0 de 3', 'bg-indigo-500 w-0'], ['PET-2026-0044 · Camarero/a', '9 de 10', 'bg-emerald-500 w-[90%]']].map(([a, b, c]) => (
                                <div key={a} className="flex items-center gap-2 px-2.5 py-2 border-b border-slate-100 last:border-0 text-[10px]">
                                    <span className="flex-1 text-slate-700 truncate">{a}</span>
                                    <span className="w-16 h-1 rounded-full bg-slate-100 overflow-hidden"><span className={`block h-full ${c}`} /></span>
                                    <span className="w-9 text-right text-slate-500">{b}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            {/* Móvil con el portal del trabajador */}
            <div className="absolute -bottom-10 -right-2 sm:-right-8 w-[130px] sm:w-[150px] rounded-[22px] bg-[#0f1b33] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
                <div className="rounded-[17px] bg-slate-50 overflow-hidden text-left">
                    <div className="bg-white px-2.5 py-2 flex items-center gap-1.5 border-b border-slate-100"><span className="w-4 h-4 rounded-full bg-indigo-600 text-[6px] text-white flex items-center justify-center font-bold">EG</span><span className="text-[8px] font-semibold text-slate-800">ETT Global People</span></div>
                    <div className="p-2 space-y-1.5">
                        <div className="text-[10px] font-semibold text-slate-900">Hola, Unai</div>
                        <div className="rounded-md bg-indigo-50 border border-indigo-100 p-1.5 text-[7px] text-slate-700">Empiezas el 10/11 · Carretillero/a</div>
                        {['Firma tu contrato', 'Lee los riesgos del puesto', 'Añade tu cuenta'].map(x => <div key={x} className="rounded-md bg-white border border-slate-200 p-1.5 text-[7px] text-slate-800 flex justify-between">{x}<span className="text-indigo-600">›</span></div>)}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-white text-slate-700">
            {/* Barra de la demo */}
            <div className="bg-slate-900 text-slate-300 text-xs">
                <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
                    <span>Demo · web corporativa · en real: tramitnow.com</span>
                    <a href="/" className="text-indigo-300 hover:text-white">Ir a la demo del ERP</a>
                </div>
            </div>

            {/* CABECERA */}
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200/70">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-6">
                    <a href="#inicio" className="shrink-0"><img src="/logo-tramitnow.svg" alt="TramitNow" className="h-7 w-auto" /></a>
                    <nav className="hidden lg:flex items-center gap-6 text-sm text-slate-600">
                        {enlaces.map(([k, href]) => <a key={k} href={href} className="hover:text-[#003A70]">{t.menu[k]}</a>)}
                    </nav>
                    <div className="ml-auto flex items-center gap-3">
                        <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs" role="group" aria-label="Idioma">
                            {['es', 'ca'].map(i => <button key={i} type="button" onClick={() => cambiarIdioma(i)} aria-pressed={idioma === i} className={`px-2 py-1 rounded-md font-semibold ${idioma === i ? 'bg-[#003A70] text-white' : 'text-slate-500 hover:text-slate-800'}`}>{i.toUpperCase()}</button>)}
                        </div>
                        <a href="/" className="hidden md:inline text-sm font-semibold text-[#003A70] hover:underline whitespace-nowrap">{t.acceder}</a>
                        <span className="hidden md:block"><a href="#demo" className={`whitespace-nowrap ${botonPrincipal} h-10 px-4 text-sm`}>{t.demo}</a></span>
                        <button type="button" className="lg:hidden p-2 -mr-2 text-slate-600" aria-label="Menú" onClick={() => setMenuMovil(!menuMovil)}>{menuMovil ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
                    </div>
                </div>
                {menuMovil && (
                    <nav className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
                        {enlaces.map(([k, href]) => <a key={k} href={href} onClick={() => setMenuMovil(false)} className="block py-2 text-slate-700">{t.menu[k]}</a>)}
                        <a href="/" className="block py-2 font-semibold text-[#003A70]">{t.acceder}</a>
                        <a href="#demo" onClick={() => setMenuMovil(false)} className={`${botonPrincipal} w-full mt-2`}>{t.demo}</a>
                    </nav>
                )}
            </header>

            {/* PORTADA */}
            <section id="inicio" className="relative overflow-hidden text-white bg-[linear-gradient(145deg,#003A70,#155b8e_62%,#1b7c9f)]">
                <span className="absolute w-[620px] h-[620px] -right-[260px] -top-[120px] rounded-full border border-white/10" />
                <span className="absolute w-[460px] h-[460px] -right-[180px] -top-[40px] rounded-full border border-white/10" />
                <div className="relative max-w-6xl mx-auto px-4 pt-16 pb-24 md:pt-24 md:pb-32 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-14 items-center">
                    <div>
                        <Etiqueta claro>{t.hero.etiqueta}</Etiqueta>
                        <h1 className="text-[40px] md:text-[56px] leading-[1.05] font-bold tracking-[-0.04em] mt-4">{t.hero.titulo}</h1>
                        <p className="text-lg md:text-xl leading-relaxed text-sky-100/90 mt-5 max-w-xl">{t.hero.texto}</p>
                        <div className="flex flex-wrap gap-3 mt-8">
                            <a href="#demo" className={`${boton} bg-white text-[#003A70] hover:bg-sky-50`}>{t.demo}<ArrowRight className="w-4 h-4" /></a>
                            <a href="#como-funciona" className={`${boton} border border-white/40 text-white hover:bg-white/10`}>{t.hero.secundario}</a>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-8 text-sm text-sky-100/90">{t.hero.notas.map(n => <span key={n} className="inline-flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-sky-300" />{n}</span>)}</div>
                    </div>
                    <div className="pr-4 sm:pr-8">{pantallas()}</div>
                </div>
            </section>

            {/* HECHO PARA ETT */}
            <section className="border-b border-slate-200 bg-slate-50">
                <div className="max-w-6xl mx-auto px-4 py-10 text-center">
                    <div className="text-sm font-semibold text-[#003A70]">{t.hecho.titulo}</div>
                    <div className="flex flex-wrap justify-center gap-2 mt-4">{t.hecho.chips.map(c => <span key={c} className="rounded-full bg-white border border-slate-200 px-3.5 py-1.5 text-sm text-slate-600">{c}</span>)}</div>
                </div>
            </section>

            {/* RECORRIDO */}
            <section id="como-funciona" className="scroll-mt-16 max-w-6xl mx-auto px-4 py-20 md:py-28">
                <div className="max-w-2xl">
                    <Etiqueta>{t.recorrido.etiqueta}</Etiqueta>
                    <Titulo>{t.recorrido.titulo}</Titulo>
                    <p className="text-lg text-slate-500 mt-4">{t.recorrido.texto}</p>
                </div>
                <div className="mt-10 flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                    {t.recorrido.pasos.map((p, i) => (
                        <button key={i} type="button" onClick={() => setPaso(i)} className={`shrink-0 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium border transition ${paso === i ? 'bg-[#003A70] border-[#003A70] text-white' : 'border-slate-200 text-slate-600 hover:border-[#4197CB]'}`}>
                            <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${paso === i ? 'bg-white text-[#003A70]' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</span>{p.corto}
                        </button>
                    ))}
                </div>
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                    <div>
                        <h3 className="text-2xl font-bold text-[#003A70] tracking-[-0.02em]">{t.recorrido.pasos[paso].titulo}</h3>
                        <p className="text-slate-600 leading-relaxed mt-3">{t.recorrido.pasos[paso].texto}</p>
                        <ul className="mt-5 space-y-2">{t.recorrido.pasos[paso].puntos.map(x => <li key={x} className="flex items-center gap-2.5 text-slate-700"><span className="w-5 h-5 rounded-full bg-sky-100 text-[#1769aa] flex items-center justify-center"><Check className="w-3.5 h-3.5" /></span>{x}</li>)}</ul>
                        {paso < 5 && <button type="button" onClick={() => setPaso(paso + 1)} className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1769aa] hover:underline">{t.recorrido.pasos[paso + 1].corto}<ArrowRight className="w-4 h-4" /></button>}
                    </div>
                    <div className="rounded-2xl bg-[linear-gradient(145deg,#eaf4fb,#f6f9fc)] p-5 sm:p-10">{maqueta(MAQUETAS[paso])}</div>
                </div>
            </section>

            {/* MÓDULOS */}
            <section id="producto" className="scroll-mt-16 bg-slate-50 border-y border-slate-200">
                <div className="max-w-6xl mx-auto px-4 py-20 md:py-28">
                    <Etiqueta>{t.modulos.etiqueta}</Etiqueta>
                    <Titulo>{t.modulos.titulo}</Titulo>
                    <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {t.modulos.lista.map(([n, d], i) => {
                            const Icono = ICONOS_MODULOS[i];
                            return (
                                <div key={n} className="rounded-2xl bg-white border border-slate-200 p-6 hover:border-[#4197CB] hover:shadow-[0_12px_30px_rgba(0,58,112,0.08)] transition">
                                    <span className="w-11 h-11 rounded-xl bg-sky-50 text-[#1769aa] flex items-center justify-center"><Icono className="w-5 h-5" /></span>
                                    <div className="mt-4 font-semibold text-[#003A70] text-lg">{n}</div>
                                    <p className="text-slate-500 mt-1 leading-relaxed">{d}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* PORTALES */}
            <section id="portales" className="scroll-mt-16 max-w-6xl mx-auto px-4 py-20 md:py-28">
                <div className="max-w-2xl">
                    <Etiqueta>{t.portales.etiqueta}</Etiqueta>
                    <Titulo>{t.portales.titulo}</Titulo>
                    <p className="text-lg text-slate-500 mt-4">{t.portales.texto}</p>
                </div>
                <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[[t.portales.trabajador, Smartphone, 'tuett.tramitnow.com/trabajadores'], [t.portales.empresa, Monitor, 'tuett.tramitnow.com/empresas']].map(([p, Icono, url]) => (
                        <div key={p.titulo} className="rounded-2xl border border-slate-200 p-7 bg-[linear-gradient(180deg,#ffffff,#f6f9fc)]">
                            <div className="flex items-center gap-3">
                                <span className="w-11 h-11 rounded-xl bg-[#003A70] text-white flex items-center justify-center"><Icono className="w-5 h-5" /></span>
                                <div><div className="font-semibold text-[#003A70] text-lg">{p.titulo}</div><div className="text-xs text-[#4197CB] font-medium">{url}</div></div>
                            </div>
                            <p className="text-slate-600 mt-4">{p.texto}</p>
                            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">{p.puntos.map(x => <li key={x} className="flex items-center gap-2 text-slate-700 text-sm"><Check className="w-4 h-4 text-[#1769aa]" />{x}</li>)}</ul>
                        </div>
                    ))}
                </div>
            </section>

            {/* POR QUÉ TRAMITNOW */}
            <section className="relative overflow-hidden text-white bg-[linear-gradient(145deg,#003A70,#155b8e_62%,#1b7c9f)]">
                <span className="absolute w-[520px] h-[520px] -left-[220px] -bottom-[260px] rounded-full border border-white/10" />
                <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-28">
                    <Etiqueta claro>{t.ventajas.etiqueta}</Etiqueta>
                    <Titulo claro>{t.ventajas.titulo}</Titulo>
                    <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-8">
                        {t.ventajas.lista.map(([n, d], i) => {
                            const Icono = ICONOS_VENTAJAS[i];
                            return (
                                <div key={n}>
                                    <Icono className="w-6 h-6 text-sky-300" />
                                    <div className="mt-3 font-semibold text-lg">{n}</div>
                                    <p className="text-sky-100/80 mt-1 leading-relaxed">{d}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* SEGURIDAD Y ACOMPAÑAMIENTO */}
            <section id="seguridad" className="scroll-mt-16 max-w-6xl mx-auto px-4 py-20 md:py-28 grid grid-cols-1 lg:grid-cols-2 gap-14">
                <div>
                    <Etiqueta>{t.seguridad.etiqueta}</Etiqueta>
                    <Titulo>{t.seguridad.titulo}</Titulo>
                    <div className="mt-8 space-y-5">
                        {t.seguridad.lista.map(([n, d], i) => {
                            const Icono = ICONOS_SEGURIDAD[i];
                            return (
                                <div key={n} className="flex gap-4">
                                    <span className="w-10 h-10 shrink-0 rounded-xl bg-sky-50 text-[#1769aa] flex items-center justify-center"><Icono className="w-5 h-5" /></span>
                                    <div><div className="font-semibold text-[#003A70]">{n}</div><p className="text-slate-500">{d}</p></div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div>
                    <Etiqueta>{t.acompanamos.etiqueta}</Etiqueta>
                    <Titulo>{t.acompanamos.titulo}</Titulo>
                    <div className="mt-8 space-y-4">
                        {t.acompanamos.lista.map(([n, d], i) => {
                            const Icono = ICONOS_ACOMPANAMOS[i];
                            return (
                                <div key={n} className="rounded-2xl border border-slate-200 p-5 flex gap-4">
                                    <span className="w-10 h-10 shrink-0 rounded-xl bg-[#003A70] text-white flex items-center justify-center"><Icono className="w-5 h-5" /></span>
                                    <div><div className="font-semibold text-[#003A70]">{n}</div><p className="text-slate-500">{d}</p></div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-6 rounded-2xl bg-sky-50 p-6">
                        <div className="font-semibold text-[#003A70] text-lg">{t.precio.titulo}</div>
                        <p className="text-slate-600 mt-1">{t.precio.texto}</p>
                        <a href="#demo" className={`${botonPrincipal} mt-4`}>{t.precio.boton}<ArrowRight className="w-4 h-4" /></a>
                    </div>
                </div>
            </section>

            {/* PREGUNTAS FRECUENTES */}
            <section className="bg-slate-50 border-y border-slate-200">
                <div className="max-w-3xl mx-auto px-4 py-20 md:py-24">
                    <Titulo>{t.faq.titulo}</Titulo>
                    <div className="mt-8 divide-y divide-slate-200 rounded-2xl bg-white border border-slate-200">
                        {t.faq.lista.map(([p, r], i) => (
                            <div key={p}>
                                <button type="button" onClick={() => setAbierta(abierta === i ? -1 : i)} aria-expanded={abierta === i} className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left font-semibold text-[#003A70]">
                                    {p}<ChevronDown className={`w-5 h-5 shrink-0 text-slate-400 transition-transform ${abierta === i ? 'rotate-180' : ''}`} />
                                </button>
                                {abierta === i && <p className="px-6 pb-5 -mt-1 text-slate-600 leading-relaxed">{r}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* PIDE UNA DEMO */}
            <section id="demo" className="scroll-mt-16 max-w-6xl mx-auto px-4 py-20 md:py-28 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-12">
                <div>
                    <Titulo>{t.formulario.titulo}</Titulo>
                    <p className="text-lg text-slate-500 mt-4">{t.formulario.texto}</p>
                    <div className="mt-8 space-y-3 text-slate-700">
                        <a href={`mailto:${CONTACTO.email}`} className="flex items-center gap-3 hover:text-[#1769aa]"><Mail className="w-5 h-5 text-[#4197CB]" />{CONTACTO.email}</a>
                        <a href={`tel:${CONTACTO.telefono.replace(/\s/g, '')}`} className="flex items-center gap-3 hover:text-[#1769aa]"><Phone className="w-5 h-5 text-[#4197CB]" />{CONTACTO.telefono}</a>
                        <div className="flex items-center gap-3"><MapPin className="w-5 h-5 text-[#4197CB]" />{CONTACTO.direccion}</div>
                    </div>
                </div>
                <div className="rounded-2xl border border-slate-200 shadow-[0_24px_60px_rgba(0,58,112,0.10)] p-6 sm:p-8">
                    {enviado ? (
                        <div className="text-center py-10">
                            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                            <p className="mt-4 text-lg text-slate-800">{t.formulario.gracias}</p>
                            <button type="button" onClick={() => { setEnviado(false); setForm({ nombre: '', ett: '', email: '', telefono: '', sucursales: '0', mensaje: '', privacidad: false }); }} className="mt-4 text-sm font-semibold text-[#1769aa] hover:underline">{t.formulario.otra}</button>
                        </div>
                    ) : (
                        <form onSubmit={(e) => { e.preventDefault(); if (formOk) setEnviado(true); }} className="grid sm:grid-cols-2 gap-4">
                            {[['nombre', 'text', 'name'], ['ett', 'text', 'organization'], ['email', 'email', 'email'], ['telefono', 'tel', 'tel']].map(([k, tipo, auto]) => (
                                <label key={k} className="block">
                                    <span className="block text-[13px] font-semibold text-slate-800 mb-1.5">{t.formulario[k]}</span>
                                    <input type={tipo} autoComplete={auto} value={form[k]} onChange={(e) => setForm(f => ({ ...f, [k]: e.target.value }))} className="w-full h-12 rounded-[9px] border border-slate-200 px-3.5 text-sm outline-none focus:border-[#1769aa] focus:ring-3 focus:ring-[#1769aa]/15" />
                                </label>
                            ))}
                            <label className="block sm:col-span-2">
                                <span className="block text-[13px] font-semibold text-slate-800 mb-1.5">{t.formulario.sucursales}</span>
                                <select value={form.sucursales} onChange={(e) => setForm(f => ({ ...f, sucursales: e.target.value }))} className="w-full h-12 rounded-[9px] border border-slate-200 px-3 text-sm bg-white outline-none focus:border-[#1769aa]">
                                    {t.formulario.opcionesSucursales.map((o, i) => <option key={o} value={i}>{o}</option>)}
                                </select>
                            </label>
                            <label className="block sm:col-span-2">
                                <span className="block text-[13px] font-semibold text-slate-800 mb-1.5">{t.formulario.mensaje}</span>
                                <textarea rows={3} value={form.mensaje} onChange={(e) => setForm(f => ({ ...f, mensaje: e.target.value }))} className="w-full rounded-[9px] border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#1769aa] focus:ring-3 focus:ring-[#1769aa]/15" />
                            </label>
                            <label className="sm:col-span-2 flex items-start gap-2 text-sm text-slate-600">
                                <input type="checkbox" checked={form.privacidad} onChange={(e) => setForm(f => ({ ...f, privacidad: e.target.checked }))} className="mt-0.5 rounded border-slate-300 text-[#1769aa]" />
                                <span><a href="#privacidad" className="underline">{t.formulario.privacidad}</a></span>
                            </label>
                            <button type="submit" disabled={!formOk} className={`${botonPrincipal} sm:col-span-2 disabled:opacity-50 disabled:shadow-none`}>{t.formulario.enviar}</button>
                            <p className="sm:col-span-2 text-xs text-slate-400 text-center">{t.formulario.demoAviso}</p>
                        </form>
                    )}
                </div>
            </section>

            {/* PIE */}
            <footer className="bg-[#002a52] text-sky-100/80">
                <div className="max-w-6xl mx-auto px-4 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-sm">
                    <div className="lg:col-span-2">
                        <img src="/logo-tramitnow.svg" alt="TramitNow" className="h-7 w-auto brightness-0 invert" />
                        <p className="mt-3 max-w-xs">{t.pie.lema}</p>
                    </div>
                    <div className="space-y-2">
                        {enlaces.map(([k, href]) => <a key={k} href={href} className="block hover:text-white">{t.menu[k]}</a>)}
                    </div>
                    <div className="space-y-2">
                        <div>{CONTACTO.email}</div><div>{CONTACTO.telefono}</div><div>{CONTACTO.direccion}</div>
                    </div>
                </div>
                <div className="border-t border-white/10">
                    <div className="max-w-6xl mx-auto px-4 py-5 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <span>© {new Date().getFullYear()} TramitNow. {t.pie.derechos}</span>
                        <span className="flex gap-4">{t.pie.legal.map(l => <a key={l} href="#" className="hover:text-white">{l}</a>)}</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
