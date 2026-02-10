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
      <body className="min-h-screen bg-[var(--delta-bg)] text-[var(--delta-text)] antialiased">
        <Providers>
          <div className="relative z-10 min-h-screen">
            <Header />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
