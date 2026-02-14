import type { Metadata } from "next";
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
          <div className="relative z-10 min-h-screen">
            <Header />
            {children}
            <InstallBanner />
          </div>
        </Providers>
      </body>
    </html>
  );
}
