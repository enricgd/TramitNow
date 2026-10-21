"use client";

import Link from "next/link";

// En el modelo multi-tenant los usuarios no se autorregistran: los provisiona
// el superadministrador (admins de ETT) o el administrador de cada ETT.
export default function RegisterPage() {
  return (
    <main style={{ padding: "2rem", maxWidth: "480px", margin: "0 auto" }}>
      <h1>Registre</h1>
      <p style={{ color: "#555", lineHeight: 1.6 }}>
        El registre directe està deshabilitat. Els comptes els crea
        l&apos;administrador de la teva ETT. Si necessites accés, contacta amb
        ell perquè et doni d&apos;alta.
      </p>
      <p style={{ marginTop: "1.5rem" }}>
        <Link href="/login">← Tornar a l&apos;inici de sessió</Link>
      </p>
    </main>
  );
}
