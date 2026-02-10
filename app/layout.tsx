import type { Metadata } from "next";
import { Providers } from "./providers";
import { Header } from "@/components/Header";
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
      <body className="min-h-screen bg-[var(--delta-bg)] text-[var(--delta-text)] antialiased relative overflow-x-hidden">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.08),transparent),linear-gradient(to_bottom,rgba(26,29,35,0.98),#1a1d23)] pointer-events-none" aria-hidden />
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
