"use client";

import { useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { logout } from "@/lib/auth";
import { callApi, ApiError } from "@/lib/api";
import { useRouter } from "next/navigation";

// ─── tipos ────────────────────────────────────────────────────────────────
interface Perfil { rol: string; tenantId: string | null; companyId: string | null; branchId: string | null; branches: string[]; email?: string }
interface Modulo { codigo: string; nombre: string }
interface Ett { ett_id: string; nombre: string; cif: string | null; activa: boolean; num_sucursales: number; num_usuarios: number }
interface Sucursal { sucursal_id: string; nombre: string; es_sede: boolean }
interface UsuarioETT { usuario_id: string; email: string; nombre: string; apellido: string; rol: string; sucursal_id: string | null; activo: boolean; sucursales: string[] }

const ROL_COLOR: Record<string, string> = {
  superadmin: "#be123c", admin: "#7c3aed", laboral: "#0891b2",
  director_zona: "#ca8a04", seleccion: "#2563eb", comercial: "#16a34a",
};
const ROLES_ETT = ["laboral", "director_zona", "seleccion", "comercial", "admin"];

function Chip({ rol }: { rol: string }) {
  return (
    <span style={{ padding: "0.15rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: "bold", background: ROL_COLOR[rol] || "#666", color: "white" }}>
      {rol}
    </span>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  // datos superadmin
  const [etts, setEtts] = useState<Ett[]>([]);
  // datos admin
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioETT[]>([]);

  const manejarError = useCallback((err: unknown) => {
    if (err instanceof ApiError && err.status === 401) { router.push("/login"); return; }
    setError(err instanceof Error ? err.message : "Error inesperat");
  }, [router]);

  const cargarSuperadmin = useCallback(async (u: User) => {
    try { const d = await callApi<{ etts: Ett[] }>(u, "listarETTs"); setEtts(d.etts); }
    catch (e) { manejarError(e); }
  }, [manejarError]);

  const cargarAdmin = useCallback(async (u: User) => {
    try {
      const [s, us] = await Promise.all([
        callApi<{ sucursales: Sucursal[] }>(u, "listarSucursales"),
        callApi<{ usuarios: UsuarioETT[] }>(u, "listarUsuariosETT"),
      ]);
      setSucursales(s.sucursales);
      setUsuarios(us.usuarios);
    } catch (e) { manejarError(e); }
  }, [manejarError]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) { router.push("/login"); return; }
      setUser(currentUser);
      try {
        const d = await callApi<{ perfil: Perfil; modulos: Modulo[] }>(currentUser, "miPerfil");
        setPerfil(d.perfil);
        setModulos(d.modulos);
        if (d.perfil.rol === "superadmin") cargarSuperadmin(currentUser);
        if (d.perfil.rol === "admin") cargarAdmin(currentUser);
      } catch (e) { manejarError(e); }
    });
    return () => unsub();
  }, [router, cargarSuperadmin, cargarAdmin, manejarError]);

  const handleLogout = async () => { await logout(); router.push("/login"); };

  if (!user) return <main style={{ padding: "2rem" }}>Carregant...</main>;
  if (!perfil) return <main style={{ padding: "2rem" }}>Carregant perfil... {error && <span style={{ color: "red" }}>{error}</span>}</main>;

  return (
    <main style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ margin: 0 }}>tramitNow</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ color: "#666" }}>{user.email}</span>
          <Chip rol={perfil.rol} />
          <button onClick={handleLogout}>Tancar sessió</button>
        </div>
      </div>

      {mensaje && <p style={{ color: "green", fontWeight: "bold" }}>{mensaje}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Menú de módulos accesibles (todos los roles) */}
      <section style={{ marginBottom: "2rem" }}>
        <h3>Mòduls disponibles</h3>
        {modulos.length === 0 ? <p style={{ color: "#888" }}>Cap mòdul assignat.</p> : (
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {modulos.map((m) => (
              <div key={m.codigo} style={{ padding: "0.75rem 1.25rem", border: "1px solid #ddd", borderRadius: "8px", background: "#fafafa" }}>
                <strong>{m.nombre}</strong>
                <div style={{ fontSize: "0.75rem", color: "#999" }}>{m.codigo}</div>
              </div>
            ))}
          </div>
        )}
        <p style={{ color: "#aaa", fontSize: "0.8rem", marginTop: "0.5rem" }}>
          Els mòduls funcionals (Laboral, Selecció, Comercial) estan pendents de definir.
        </p>
      </section>

      {perfil.rol === "superadmin" && (
        <PanelSuperadmin user={user} etts={etts} recargar={() => cargarSuperadmin(user)} setMensaje={setMensaje} manejarError={manejarError} />
      )}
      {perfil.rol === "admin" && (
        <PanelAdmin user={user} sucursales={sucursales} usuarios={usuarios} recargar={() => cargarAdmin(user)} setMensaje={setMensaje} manejarError={manejarError} />
      )}
    </main>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PANEL SUPERADMIN — gestión de ETTs
// ════════════════════════════════════════════════════════════════════════════
function PanelSuperadmin({ user, etts, recargar, setMensaje, manejarError }: {
  user: User; etts: Ett[]; recargar: () => void;
  setMensaje: (s: string) => void; manejarError: (e: unknown) => void;
}) {
  const [form, setForm] = useState({ nombre: "", cif: "", adminEmail: "", adminPassword: "", adminNombre: "", adminApellido: "", sucursales: "" });
  const [creando, setCreando] = useState(false);

  const crear = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setCreando(true);
    try {
      const sucursales = form.sucursales.split(",").map((s) => s.trim()).filter(Boolean).map((nombre) => ({ nombre, esSede: false }));
      await callApi(user, "crearETT", {
        nombre: form.nombre, cif: form.cif || null,
        sucursales,
        adminUsuario: { email: form.adminEmail, password: form.adminPassword, nombre: form.adminNombre, apellido: form.adminApellido },
      });
      setMensaje(`ETT "${form.nombre}" creada amb el seu administrador`);
      setForm({ nombre: "", cif: "", adminEmail: "", adminPassword: "", adminNombre: "", adminApellido: "", sucursales: "" });
      recargar();
    } catch (err) { manejarError(err); } finally { setCreando(false); }
  };

  const toggleEstado = async (ett: Ett) => {
    try { await callApi(user, "cambiarEstadoETT", { ettId: ett.ett_id, activa: !ett.activa }); recargar(); }
    catch (err) { manejarError(err); }
  };

  return (
    <section>
      <h2>Administració de la plataforma</h2>

      <h3>Crear ETT</h3>
      <form onSubmit={crear} style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "1fr 1fr", maxWidth: "640px", marginBottom: "1.5rem" }}>
        <input placeholder="Nom de l'ETT *" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
        <input placeholder="CIF" value={form.cif} onChange={(e) => setForm({ ...form, cif: e.target.value })} />
        <input style={{ gridColumn: "1 / 3" }} placeholder="Sucursals (separades per comes)" value={form.sucursales} onChange={(e) => setForm({ ...form, sucursales: e.target.value })} />
        <input placeholder="Nom admin" value={form.adminNombre} onChange={(e) => setForm({ ...form, adminNombre: e.target.value })} />
        <input placeholder="Cognom admin" value={form.adminApellido} onChange={(e) => setForm({ ...form, adminApellido: e.target.value })} />
        <input type="email" placeholder="Email admin *" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} required />
        <input type="password" placeholder="Contrasenya admin *" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} required minLength={6} />
        <button type="submit" disabled={creando} style={{ gridColumn: "1 / 3" }}>{creando ? "Creant..." : "Crear ETT + administrador"}</button>
      </form>

      <h3>ETTs ({etts.length})</h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr style={{ borderBottom: "2px solid #ccc", textAlign: "left" }}>
          <th style={{ padding: "0.4rem" }}>#</th><th>Nom</th><th>CIF</th><th>Sucursals</th><th>Usuaris</th><th>Estat</th><th></th>
        </tr></thead>
        <tbody>
          {etts.map((e) => (
            <tr key={e.ett_id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "0.4rem" }}>{e.ett_id}</td>
              <td>{e.nombre}</td>
              <td>{e.cif || "—"}</td>
              <td>{e.num_sucursales}</td>
              <td>{e.num_usuarios}</td>
              <td>{e.activa ? <span style={{ color: "green" }}>Activa</span> : <span style={{ color: "#999" }}>Inactiva</span>}</td>
              <td><button onClick={() => toggleEstado(e)}>{e.activa ? "Desactivar" : "Activar"}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PANEL ADMIN ETT — sucursales y usuarios
// ════════════════════════════════════════════════════════════════════════════
function PanelAdmin({ user, sucursales, usuarios, recargar, setMensaje, manejarError }: {
  user: User; sucursales: Sucursal[]; usuarios: UsuarioETT[]; recargar: () => void;
  setMensaje: (s: string) => void; manejarError: (e: unknown) => void;
}) {
  const [nuevaSucursal, setNuevaSucursal] = useState("");
  const [uForm, setUForm] = useState({ email: "", password: "", nombre: "", apellido: "", rol: "seleccion", sucursalId: "", sucursales: [] as string[] });

  const crearSucursal = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    try { await callApi(user, "crearSucursal", { nombre: nuevaSucursal }); setNuevaSucursal(""); setMensaje("Sucursal creada"); recargar(); }
    catch (err) { manejarError(err); }
  };

  const crearUsuario = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    try {
      const body: Record<string, unknown> = { email: uForm.email, password: uForm.password, nombre: uForm.nombre, apellido: uForm.apellido, rol: uForm.rol };
      if (uForm.rol === "seleccion" || uForm.rol === "comercial") body.sucursalId = uForm.sucursalId;
      if (uForm.rol === "director_zona") body.sucursales = uForm.sucursales;
      await callApi(user, "crearUsuarioETT", body);
      setMensaje(`Usuari ${uForm.email} creat`);
      setUForm({ email: "", password: "", nombre: "", apellido: "", rol: "seleccion", sucursalId: "", sucursales: [] });
      recargar();
    } catch (err) { manejarError(err); }
  };

  const toggleUsuario = async (u: UsuarioETT) => {
    try { await callApi(user, "cambiarEstadoUsuario", { usuarioId: u.usuario_id, activo: !u.activo }); recargar(); }
    catch (err) { manejarError(err); }
  };

  const necesitaSucursal = uForm.rol === "seleccion" || uForm.rol === "comercial";
  const necesitaZona = uForm.rol === "director_zona";

  return (
    <section>
      <h2>Administració de l&apos;ETT</h2>

      {/* Sucursales */}
      <h3>Sucursals ({sucursales.length})</h3>
      <form onSubmit={crearSucursal} style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <input placeholder="Nova sucursal" value={nuevaSucursal} onChange={(e) => setNuevaSucursal(e.target.value)} required />
        <button type="submit">Afegir</button>
      </form>
      <ul>{sucursales.map((s) => <li key={s.sucursal_id}>{s.nombre} {s.es_sede && <em>(seu)</em>}</li>)}</ul>

      {/* Crear usuario */}
      <h3 style={{ marginTop: "2rem" }}>Crear usuari</h3>
      <form onSubmit={crearUsuario} style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "1fr 1fr", maxWidth: "640px", marginBottom: "1.5rem" }}>
        <input placeholder="Nom" value={uForm.nombre} onChange={(e) => setUForm({ ...uForm, nombre: e.target.value })} />
        <input placeholder="Cognom" value={uForm.apellido} onChange={(e) => setUForm({ ...uForm, apellido: e.target.value })} />
        <input type="email" placeholder="Email *" value={uForm.email} onChange={(e) => setUForm({ ...uForm, email: e.target.value })} required />
        <input type="password" placeholder="Contrasenya *" value={uForm.password} onChange={(e) => setUForm({ ...uForm, password: e.target.value })} required minLength={6} />
        <select value={uForm.rol} onChange={(e) => setUForm({ ...uForm, rol: e.target.value, sucursalId: "", sucursales: [] })}>
          {ROLES_ETT.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        {necesitaSucursal && (
          <select value={uForm.sucursalId} onChange={(e) => setUForm({ ...uForm, sucursalId: e.target.value })} required>
            <option value="">— Sucursal —</option>
            {sucursales.map((s) => <option key={s.sucursal_id} value={s.sucursal_id}>{s.nombre}</option>)}
          </select>
        )}
        {necesitaZona && (
          <select multiple value={uForm.sucursales} onChange={(e) => setUForm({ ...uForm, sucursales: Array.from(e.target.selectedOptions, (o) => o.value) })} style={{ gridColumn: "1 / 3", minHeight: "80px" }}>
            {sucursales.map((s) => <option key={s.sucursal_id} value={s.sucursal_id}>{s.nombre}</option>)}
          </select>
        )}
        <button type="submit" style={{ gridColumn: "1 / 3" }}>Crear usuari</button>
      </form>

      {/* Lista de usuarios */}
      <h3>Usuaris ({usuarios.length})</h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr style={{ borderBottom: "2px solid #ccc", textAlign: "left" }}>
          <th style={{ padding: "0.4rem" }}>Nom</th><th>Email</th><th>Rol</th><th>Sucursal/Zona</th><th>Estat</th><th></th>
        </tr></thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.usuario_id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "0.4rem" }}>{u.nombre} {u.apellido}</td>
              <td>{u.email}</td>
              <td><Chip rol={u.rol} /></td>
              <td>{u.rol === "director_zona" ? `zona: ${u.sucursales.join(", ")}` : (u.sucursal_id ?? "—")}</td>
              <td>{u.activo ? <span style={{ color: "green" }}>Actiu</span> : <span style={{ color: "#999" }}>Inactiu</span>}</td>
              <td><button onClick={() => toggleUsuario(u)}>{u.activo ? "Desactivar" : "Activar"}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
