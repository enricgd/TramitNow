import { useState, type FormEvent, type ReactNode } from 'react';
import { supabase, authConfigError } from './auth/session';

// Pantalla de acceso, a partir de design/login.html.
// mode "recovery": se llega desde el enlace del correo de "recordar contraseña".
type Mode = 'login' | 'forgot' | 'recovery';

export default function Login({ initialMode = 'login', message }: { initialMode?: Mode; message?: string }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(
    authConfigError ? { kind: 'error', text: authConfigError } : message ? { kind: 'error', text: message } : null,
  );

  const switchTo = (next: Mode) => {
    setMode(next);
    setNotice(null);
    setPassword('');
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setNotice({
            kind: 'error',
            text:
              error.code === 'invalid_credentials'
                ? 'El correo o la contraseña no son correctos.'
                : 'No se ha podido iniciar sesión. Inténtalo de nuevo en unos minutos.',
          });
        }
      } else if (mode === 'forgot') {
        // Misma respuesta exista o no el correo, para no revelar qué usuarios hay.
        await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        setNotice({
          kind: 'ok',
          text: 'Si el correo corresponde a un usuario de TramitNow, recibirás un enlace para crear una contraseña nueva.',
        });
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          setNotice({
            kind: 'error',
            text:
              error.code === 'weak_password'
                ? 'La contraseña es demasiado débil. Usa al menos 8 caracteres.'
                : 'No se ha podido cambiar la contraseña. Pide otro enlace.',
          });
        }
      }
    } catch {
      setNotice({ kind: 'error', text: 'No se ha podido conectar con el servicio de acceso.' });
    } finally {
      setBusy(false);
    }
  }

  const texts = {
    login: { title: 'Iniciar sesión', intro: 'Introduce tus credenciales para acceder a tu cuenta.', submit: 'Entrar' },
    forgot: {
      title: 'Recordar contraseña',
      intro: 'Introduce tu correo electrónico y te indicaremos cómo recuperar el acceso.',
      submit: 'Enviar instrucciones',
    },
    recovery: { title: 'Nueva contraseña', intro: 'Elige la contraseña con la que entrarás a partir de ahora.', submit: 'Guardar contraseña' },
  }[mode];

  return (
    <div className="min-h-screen grid place-items-center bg-[#f2f6fa] p-3.5 sm:p-7 text-[#172b43]">
      <main className="w-full max-w-[1080px] bg-white rounded-[18px] sm:rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-2 md:min-h-[650px] shadow-[0_24px_70px_rgba(28,54,82,0.13)]">
        <section
          aria-label="Marca TramitNow"
          className="relative overflow-hidden text-white bg-[linear-gradient(145deg,#103b68,#155b8e_62%,#1b7c9f)] px-6.5 py-5.5 min-h-[150px] flex flex-row items-center justify-between gap-4 md:flex-col md:items-stretch md:px-12 md:py-[54px]"
        >
          <span className="hidden md:block absolute w-[420px] h-[420px] -right-[190px] top-[60px] rounded-full border border-white/12" />
          <span className="hidden md:block absolute w-[300px] h-[300px] -right-[130px] top-[120px] rounded-full border border-white/12" />
          <img src="/logo-tramitnow.svg" alt="TramitNow" className="relative w-[170px] md:w-[220px] h-auto brightness-0 invert" />
          <div className="relative hidden md:block max-w-[390px]">
            <div className="text-xs uppercase tracking-[0.16em] text-[#a9ddeb] font-bold">Portal de gestión</div>
            <h1 className="text-4xl leading-[1.16] mt-3.5 mb-4 tracking-[-0.035em] font-bold">
              Todo tu trabajo,
              <br />
              en un solo lugar.
            </h1>
            <p className="text-[15px] leading-[1.7] text-[#d5e7f1]">
              Accede a TramitNow para gestionar tus procesos de forma sencilla y segura.
            </p>
          </div>
          <div className="relative text-right md:text-left text-[11px] md:text-xs text-[#c4dbe8]">Acceso privado · TramitNow</div>
        </section>

        <section className="flex items-center justify-center px-6.5 pt-[38px] pb-[42px] md:py-[62px] md:px-[clamp(30px,6vw,78px)]">
          <div className="w-full max-w-[390px]">
            <h2 className="text-[26px] md:text-[29px] tracking-[-0.03em] font-bold mb-2">{texts.title}</h2>
            <p className="mb-8 text-[#6b7b8d] text-sm leading-[1.55]">{texts.intro}</p>

            <form onSubmit={onSubmit}>
              {mode !== 'recovery' && (
                <Field label="Usuario o correo electrónico" htmlFor="email">
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    placeholder="nombre@empresa.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </Field>
              )}
              {mode !== 'forgot' && (
                <Field label="Contraseña" htmlFor="password">
                  <input
                    id="password"
                    type="password"
                    autoComplete={mode === 'recovery' ? 'new-password' : 'current-password'}
                    placeholder={mode === 'recovery' ? 'Mínimo 8 caracteres' : 'Introduce tu contraseña'}
                    minLength={mode === 'recovery' ? 8 : undefined}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                  />
                </Field>
              )}
              {mode === 'login' && (
                <div className="text-right -mt-[7px] mb-[23px]">
                  <a href="#recuperar" onClick={(e) => (e.preventDefault(), switchTo('forgot'))} className={linkClass}>
                    ¿Has olvidado tu contraseña?
                  </a>
                </div>
              )}
              <button
                type="submit"
                disabled={busy || !!authConfigError}
                className="w-full h-[50px] rounded-[9px] bg-[#1769aa] text-white font-bold text-[15px] cursor-pointer shadow-[0_7px_16px_rgba(23,105,170,0.18)] transition duration-150 hover:bg-[#10598f] hover:-translate-y-px disabled:opacity-60 disabled:cursor-default disabled:hover:translate-y-0 disabled:hover:bg-[#1769aa]"
              >
                {busy ? 'Un momento…' : texts.submit}
              </button>
            </form>

            {notice && (
              <div
                role={notice.kind === 'error' ? 'alert' : 'status'}
                className={`mt-[18px] px-3.5 py-3 rounded-[9px] text-[13px] leading-normal ${
                  notice.kind === 'ok' ? 'bg-[#ecf8f5] text-[#17614f]' : 'bg-[#fdf0f0] text-[#9b2c2c]'
                }`}
              >
                {notice.text}
              </div>
            )}

            <div className="flex items-center gap-3 text-[#9aa8b5] text-[11px] mt-[27px] mb-[18px] before:content-[''] before:h-px before:flex-1 before:bg-[#e8edf2] after:content-[''] after:h-px after:flex-1 after:bg-[#e8edf2]">
              ACCESO SEGURO
            </div>
            <div className="flex items-center justify-center gap-2 text-[#7b8997] text-xs">
              <LockIcon /> Tu sesión está protegida
            </div>

            {mode === 'forgot' && (
              <div className="mt-5 text-[13px]">
                <a href="#login" onClick={(e) => (e.preventDefault(), switchTo('login'))} className={linkClass}>
                  ← Volver al inicio de sesión
                </a>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

const inputClass =
  'w-full h-[49px] border border-[#dce5ee] rounded-[9px] px-3.5 text-sm text-[#172b43] bg-white outline-none transition duration-150 placeholder:text-[#a1adba] focus:border-[#1769aa] focus:shadow-[0_0_0_3px_rgba(23,105,170,0.12)]';

const linkClass = 'text-[#1769aa] text-[13px] font-semibold no-underline hover:underline';

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="mb-5">
      <label htmlFor={htmlFor} className="block text-[13px] font-semibold mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="1" y="7" width="12" height="8" rx="2" />
      <path d="M4 7V4.5a3 3 0 0 1 6 0V7" />
    </svg>
  );
}
