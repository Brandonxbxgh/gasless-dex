import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "DeltaChainLabs | Gasless Swap",
  description: "Swap stable ↔ native with zero gas. Sign a message, we pay the gas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[var(--delta-bg)] bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 text-[var(--delta-text)] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
