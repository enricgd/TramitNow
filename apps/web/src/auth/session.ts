import { useEffect, useState } from 'react';
import { createClient, type Session } from '@supabase/supabase-js';

// Supabase se usa solo para Auth (y más adelante Storage). Los datos irán por apps/api.
// En desarrollo, Vite reenvía /auth/v1 al Supabase Auth local (ver vite.config.ts y db/README.md).
const url = import.meta.env.VITE_SUPABASE_URL || window.location.origin;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (import.meta.env.DEV ? 'local' : '');

export const authConfigError = anonKey
  ? null
  : 'Falta VITE_SUPABASE_ANON_KEY en la compilación (ver apps/web/.env.example).';

export const supabase = createClient(url, anonKey || 'sin-configurar', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// Claims que añade el hook de token (db/migrations/*_access_token_hook.sql).
export type Claims = {
  sub: string;
  email?: string;
  tenant_id: string | null;
  app_role: string | null;
  branch_ids: string[];
  user_metadata?: { full_name?: string };
};

export function claimsOf(session: Session): Claims {
  const payload = session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(
    Array.from(atob(payload), (c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''),
  );
  return JSON.parse(json);
}

export const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadmin',
  admin: 'Administrador',
  laboral: 'Laboral',
  director_zona: 'Director de zona',
  seleccion: 'Selección',
  comercial: 'Comercial',
};

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  // Ha llegado desde el enlace de "recordar contraseña": tiene que poner una nueva.
  | { status: 'recovery' }
  | { status: 'signedIn'; session: Session; claims: Claims };

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    const apply = (session: Session | null) =>
      setState(session ? { status: 'signedIn', session, claims: claimsOf(session) } : { status: 'signedOut' });

    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setState({ status: 'recovery' });
      else apply(session);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return state;
}
