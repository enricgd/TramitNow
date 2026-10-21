import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "./firebase";

const FUNCTIONS_BASE = "https://us-central1-tramitnow-development.cloudfunctions.net";

// En el modelo real los usuarios NO se autorregistran: los crea el superadmin
// (admins de ETT) o el admin de la ETT (resto de roles). Aquí solo hay login.

export interface Perfil {
  rol: string;
  tenantId: string | null;
  companyId: string | null;
  branchId: string | null;
  branches: string[];
  email?: string;
}
export interface Modulo { codigo: string; nombre: string }

async function iniciarSesionEnServidor(firebaseToken: string) {
  const response = await fetch(`${FUNCTIONS_BASE}/iniciarSesion`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${firebaseToken}`,
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Error iniciando sesión en servidor");
  return data as { perfil: Perfil; modulos: Modulo[] };
}

export async function loginWithEmail(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const token = await cred.user.getIdToken();
  const data = await iniciarSesionEnServidor(token);
  return { cred, ...data };
}

export async function logout() {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const token = await currentUser.getIdToken();
      await fetch(`${FUNCTIONS_BASE}/cerrarSesion`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // ignorar errores de red en logout
    }
  }
  return signOut(auth);
}
