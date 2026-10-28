import { useEffect, useState } from 'react';
import App, { type CurrentUser } from './App';
import Login from './Login';
import { supabase, useAuth } from './auth/session';
import { DEMO } from './modo';

const NO_TENANT = 'Tu usuario no tiene acceso a ninguna ETT. Pide a tu administrador que te dé de alta.';

// Modo demo (ver src/modo.ts): entra sin login con un usuario ficticio.
const DEMO_USER: CurrentUser = { name: 'Usuario Demo', email: 'demo@example.com', role: 'admin' };

export default function Root() {
  return DEMO ? <App user={DEMO_USER} onSignOut={() => {}} /> : <AuthRoot />;
}

// Sin sesión válida se muestra el login. Con sesión, la app (de momento con datos de ejemplo).
function AuthRoot() {
  const auth = useAuth();
  const [message, setMessage] = useState<string>();

  const withoutTenant = auth.status === 'signedIn' && !auth.claims.tenant_id;
  useEffect(() => {
    if (withoutTenant) {
      setMessage(NO_TENANT);
      supabase.auth.signOut();
    }
  }, [withoutTenant]);

  if (auth.status === 'loading' || withoutTenant) return <div className="min-h-screen bg-[#f2f6fa]" />;
  if (auth.status === 'recovery') return <Login initialMode="recovery" />;
  if (auth.status === 'signedOut') return <Login message={message} />;

  const { claims } = auth;
  return (
    <App
      user={{
        name: claims.user_metadata?.full_name || claims.email || '',
        email: claims.email ?? '',
        role: claims.app_role ?? '',
      }}
      onSignOut={() => {
        setMessage(undefined);
        supabase.auth.signOut();
      }}
    />
  );
}
