import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TramitNow Web",
  description: "Login amb Firebase i connexió al backend",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ca">
      <body>{children}</body>
    </html>
  );
}