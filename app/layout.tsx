import type { Metadata } from "next";
import Link from "next/link";
import { Providers } from "./providers";
import { Header } from "@/components/Header";
import { InstallBanner } from "@/components/InstallBanner";
import "./globals.css";

export const metadata: Metadata = {
  title: "DeltaChainLabs | Swap, Bridge & Buy",
  description: "Swap tokens. Bridge chains. Buy crypto with fiat. All in one place.",
  openGraph: {
    title: "DeltaChainLabs | Swap, Bridge & Buy",
    description: "Swap tokens. Bridge chains. Buy crypto with fiat. All in one place.",
  },
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
          <div className="relative z-10 min-h-screen flex flex-col">
            <Header />
            <div className="flex-1">{children}</div>
            <footer className="py-4 px-4 sm:px-6 border-t border-white/5">
              <div className="mx-auto max-w-4xl flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-[var(--delta-text-muted)]">
                <Link href="/disclaimer" className="hover:text-white transition-colors">
                  Disclaimer &amp; Powered By
                </Link>
                <span className="hidden sm:inline">·</span>
                <Link href="/how-it-works" className="hover:text-white transition-colors">
                  How it works
                </Link>
              </div>
            </footer>
            <InstallBanner />
          </div>
        </Providers>
      </body>
    </html>
  );
}
