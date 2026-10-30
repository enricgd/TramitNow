// Pantalla de acceso de los portales. Cada portal tiene su dirección y su acceso:
// - Trabajadores: DNI o NIE y código por SMS, sin contraseña.
// - Empresas: correo y contraseña. La cuenta la crea la ETT (Empresas → Contactos) y llega una invitación.
// Misma estructura que el acceso del ERP (src/Login.tsx), con el logo y el nombre de la ETT.
// El color sale del tema: índigo en trabajadores y azul petróleo en empresas (tema-empresa en empresas.html).
import React, { useState } from 'react';
import { ArrowLeft, Lock, Smartphone, Mail } from 'lucide-react';

const ETT = { nombre: 'ETT Global People', siglas: 'EG', subdominio: 'ettglobal' };

const TEXTOS = {
    trabajador: {
        etiqueta: 'Portal del trabajador',
        titulo: <>Tus contratos, nóminas<br />y horas, en el móvil.</>,
        texto: 'Firma tu contrato, descarga tus nóminas y avísanos si no puedes ir a trabajar.',
        ruta: 'trabajadores',
    },
    empresa: {
        etiqueta: 'Área de empresas',
        titulo: <>Tu personal, sus horas<br />y tus facturas, al día.</>,
        texto: 'Pide personal, valida los partes de horas y firma los documentos de cada misión.',
        ruta: 'empresas',
    },
};

const campo = 'w-full h-[49px] border border-slate-200 rounded-[9px] px-3.5 text-sm text-slate-900 bg-white outline-none transition placeholder:text-slate-400 focus:border-indigo-600 focus:ring-3 focus:ring-indigo-600/15';
const enlace = 'text-indigo-700 text-[13px] font-semibold hover:underline';
const boton = 'w-full h-[50px] rounded-[9px] bg-indigo-700 text-white font-bold text-[15px] shadow-sm transition hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-default';

function Campo({ label, children }) {
    return (
        <label className="block mb-5">
            <span className="block text-[13px] font-semibold mb-2 text-slate-800">{label}</span>
            {children}
        </label>
    );
}

// usuariosDemo (solo empresas): para elegir con qué usuario entrar en la demo
export default function Acceso({ tipo, onEntrar, telefono = '', usuariosDemo = [] }) {
    const t = TEXTOS[tipo];
    const [paso, setPaso] = useState(tipo === 'trabajador' ? 'dni' : 'login'); // dni, codigo | login, olvido, invitacion
    const [dni, setDni] = useState('');
    const [codigo, setCodigo] = useState('');
    const [porEmail, setPorEmail] = useState(false);
    const [email, setEmail] = useState('');
    const [clave, setClave] = useState('');
    const [clave2, setClave2] = useState('');
    const [aviso, setAviso] = useState(null); // { tipo: 'ok' | 'error', texto }

    const dniValido = /^[XYZ]?\d{7,8}[A-Z]$/.test(dni);
    const ir = (p) => { setPaso(p); setAviso(null); };

    const enviar = (e) => {
        e.preventDefault();
        setAviso(null);
        if (paso === 'dni') {
            if (!dniValido) return setAviso({ tipo: 'error', texto: 'Escribe el DNI o NIE con la letra, sin espacios ni guiones.' });
            return ir('codigo');
        }
        if (paso === 'codigo') return onEntrar();
        if (paso === 'olvido') return setAviso({ tipo: 'ok', texto: 'Si el correo es de un usuario del Área de empresas, recibirás un enlace para crear una contraseña nueva.' });
        if (paso === 'invitacion') {
            if (clave.length < 8) return setAviso({ tipo: 'error', texto: 'La contraseña tiene que tener al menos 8 caracteres.' });
            if (clave !== clave2) return setAviso({ tipo: 'error', texto: 'Las dos contraseñas no coinciden.' });
        }
        const usuario = usuariosDemo.find(u => u.email === email.trim().toLowerCase());
        if (paso === 'login' && !usuario) return setAviso({ tipo: 'error', texto: 'El correo o la contraseña no son correctos.' });
        return onEntrar(usuario || usuariosDemo[0]);
    };

    const titulos = {
        dni: ['Entra con tu DNI', 'Para quien trabaja o ha trabajado con nosotros. Escribe el DNI o NIE que diste a la ETT y te enviaremos un código para entrar, sin contraseñas.'],
        codigo: ['Escribe el código', porEmail ? 'Te lo hemos enviado a tu correo. Caduca en 10 minutos.' : `Te lo hemos enviado por SMS al móvil acabado en ${telefono.replace(/\D/g, '').slice(-3)}. Caduca en 10 minutos.`],
        login: ['Iniciar sesión', 'Entra con el correo y la contraseña de tu empresa.'],
        olvido: ['Recordar contraseña', 'Escribe tu correo y te enviaremos un enlace para crear una contraseña nueva.'],
        invitacion: ['Crea tu contraseña', `${ETT.nombre} te ha dado acceso al Área de empresas. Elige la contraseña con la que entrarás.`],
    }[paso];

    return (
        <div className="min-h-screen flex flex-col bg-slate-100">
            {/* Barra de la demo (no sale en real) */}
            <div className="bg-slate-900 text-slate-200 text-xs">
                <div className="max-w-5xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
                    <span>Demo · en real: {ETT.subdominio}.tramitnow.com/{t.ruta}</span>
                    <a href="/" className="inline-flex items-center gap-1 text-indigo-300 hover:text-white"><ArrowLeft className="w-3.5 h-3.5" />Volver al ERP</a>
                </div>
            </div>

            <div className="flex-1 grid place-items-center p-3.5 sm:p-7">
                <main className="w-full max-w-[1000px] bg-white rounded-[18px] sm:rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-2 md:min-h-[600px] shadow-[0_24px_70px_rgba(28,54,82,0.13)]">
                    {/* Marca de la ETT */}
                    <section className="relative overflow-hidden text-white bg-linear-to-br from-indigo-950 via-indigo-800 to-indigo-600 px-6 py-5 flex flex-row items-center justify-between gap-4 md:flex-col md:items-stretch md:px-12 md:py-[54px]">
                        <span className="hidden md:block absolute w-[420px] h-[420px] -right-[190px] top-[60px] rounded-full border border-white/12" />
                        <span className="hidden md:block absolute w-[300px] h-[300px] -right-[130px] top-[120px] rounded-full border border-white/12" />
                        <div className="relative flex items-center gap-3">
                            <span className="w-11 h-11 md:w-14 md:h-14 rounded-full bg-white text-indigo-800 flex items-center justify-center font-bold md:text-lg">{ETT.siglas}</span>
                            <span>
                                <span className="block font-semibold md:text-lg">{ETT.nombre}</span>
                                <span className="block md:hidden text-xs text-white/75">{t.etiqueta}</span>
                            </span>
                        </div>
                        <div className="relative hidden md:block max-w-[380px]">
                            <div className="text-xs uppercase tracking-[0.16em] text-white/70 font-bold">{t.etiqueta}</div>
                            <h1 className="text-[34px] leading-[1.16] mt-3.5 mb-4 tracking-[-0.03em] font-bold">{t.titulo}</h1>
                            <p className="text-[15px] leading-[1.7] text-white/80">{t.texto}</p>
                        </div>
                        <div className="relative hidden md:block text-xs text-white/70">Funciona con <span className="font-semibold text-white">TramitNow</span></div>
                    </section>

                    {/* Formulario */}
                    <section className="flex items-center justify-center px-6 pt-9 pb-10 md:py-[62px] md:px-[clamp(30px,6vw,72px)]">
                        <div className="w-full max-w-[380px]">
                            <h2 className="text-[26px] md:text-[28px] tracking-[-0.03em] font-bold text-slate-900 mb-2">{titulos[0]}</h2>
                            <p className="mb-8 text-slate-500 text-sm leading-[1.55]">{titulos[1]}</p>

                            <form onSubmit={enviar} noValidate>
                                {paso === 'dni' && (
                                    <Campo label="DNI o NIE">
                                        <input autoFocus autoComplete="username" placeholder="12345678Z" value={dni} onChange={(e) => setDni(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ''))} className={`${campo} font-mono tracking-wider`} />
                                    </Campo>
                                )}
                                {paso === 'codigo' && (
                                    <>
                                        <Campo label="Código de 6 cifras">
                                            <input autoFocus inputMode="numeric" autoComplete="one-time-code" placeholder="000000" maxLength={6} value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))} className={`${campo} text-center text-lg font-mono tracking-[0.5em]`} />
                                        </Campo>
                                        <div className="flex flex-wrap justify-between gap-2 -mt-2 mb-6">
                                            <button type="button" className={enlace} onClick={() => setAviso({ tipo: 'ok', texto: `Te hemos enviado un código nuevo${porEmail ? ' a tu correo' : ' por SMS'}.` })}>Reenviar el código</button>
                                            <button type="button" className={enlace} onClick={() => { setPorEmail(!porEmail); setAviso(null); }}>{porEmail ? 'Recibirlo por SMS' : 'Recibirlo por correo'}</button>
                                        </div>
                                    </>
                                )}
                                {['login', 'olvido'].includes(paso) && (
                                    <Campo label="Correo electrónico">
                                        <input autoFocus type="email" autoComplete="username" placeholder="nombre@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} className={campo} />
                                    </Campo>
                                )}
                                {paso === 'login' && (
                                    <>
                                        <Campo label="Contraseña">
                                            <input type="password" autoComplete="current-password" placeholder="Tu contraseña" value={clave} onChange={(e) => setClave(e.target.value)} className={campo} />
                                        </Campo>
                                        <div className="text-right -mt-2 mb-6"><button type="button" className={enlace} onClick={() => ir('olvido')}>¿Has olvidado tu contraseña?</button></div>
                                    </>
                                )}
                                {paso === 'invitacion' && (
                                    <>
                                        <Campo label="Correo electrónico">
                                            <input value={usuariosDemo[0]?.email || ''} readOnly className={`${campo} bg-slate-50 text-slate-600`} />
                                        </Campo>
                                        <Campo label="Contraseña nueva">
                                            <input type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={clave} onChange={(e) => setClave(e.target.value)} className={campo} />
                                        </Campo>
                                        <Campo label="Repite la contraseña">
                                            <input type="password" autoComplete="new-password" value={clave2} onChange={(e) => setClave2(e.target.value)} className={campo} />
                                        </Campo>
                                    </>
                                )}
                                <button type="submit" className={boton} disabled={(paso === 'dni' && !dni) || (paso === 'codigo' && codigo.length !== 6) || (['login', 'olvido'].includes(paso) && !email) || (paso === 'login' && !clave)}>
                                    {{ dni: 'Enviarme el código', codigo: 'Entrar', login: 'Entrar', olvido: 'Enviar el enlace', invitacion: 'Guardar y entrar' }[paso]}
                                </button>
                            </form>

                            {aviso && (
                                <div role={aviso.tipo === 'error' ? 'alert' : 'status'} className={`mt-4 px-3.5 py-3 rounded-[9px] text-[13px] leading-normal ${aviso.tipo === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{aviso.texto}</div>
                            )}

                            <div className="mt-6 text-[13px] text-slate-500 space-y-2">
                                {paso === 'dni' && <p className="flex items-start gap-2"><Smartphone className="w-4 h-4 mt-0.5 shrink-0" />¿Has cambiado de móvil? Llama a tu oficina de {ETT.nombre} para actualizarlo.</p>}
                                {paso === 'codigo' && <button type="button" className={enlace} onClick={() => { ir('dni'); setCodigo(''); }}>← Cambiar el DNI</button>}
                                {paso === 'login' && <p className="flex items-start gap-2"><Mail className="w-4 h-4 mt-0.5 shrink-0" />¿Es la primera vez? Entra desde el enlace de la invitación que te enviamos por correo.</p>}
                                {['olvido', 'invitacion'].includes(paso) && <button type="button" className={enlace} onClick={() => ir('login')}>← Volver al inicio de sesión</button>}
                            </div>

                            <div className="flex items-center gap-3 text-slate-400 text-[11px] mt-7 mb-4 before:h-px before:flex-1 before:bg-slate-200 after:h-px after:flex-1 after:bg-slate-200">ACCESO SEGURO</div>
                            <div className="flex items-center justify-center gap-2 text-slate-500 text-xs"><Lock className="w-3.5 h-3.5" />Tus datos están protegidos</div>

                            {/* Ayudas de la demo */}
                            <div className="mt-7 rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500 space-y-1.5">
                                <div className="font-semibold text-slate-600">Demo</div>
                                {tipo === 'trabajador' && <p>Vale cualquier DNI o NIE bien escrito y cualquier código de 6 cifras. Entras como Unai García Zabaleta.</p>}
                                {tipo === 'empresa' && (
                                    <>
                                        <p>Elige un usuario (vale cualquier contraseña):</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {usuariosDemo.map(u => <button key={u.email} type="button" onClick={() => { setEmail(u.email); setClave('demo'); ir('login'); }} className="rounded-md bg-slate-100 px-2 py-1 text-slate-700 hover:bg-indigo-50 hover:text-indigo-800">{u.nombre} · {u.empresaCorta}</button>)}
                                        </div>
                                        <button type="button" className={enlace} onClick={() => ir('invitacion')}>Ver la pantalla de la invitación</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}
