import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <h1>TramitNow</h1>
      <p>Aplicació amb autenticació Firebase</p>

      <div style={{ display: "flex", gap: "12px" }}>
        <Link href="/login">Iniciar sessió</Link>
        <Link href="/register">Registrar-se</Link>
      </div>
    </main>
  );
}