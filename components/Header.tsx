"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const SUPPORT_TELEGRAM = "https://t.me/brandonxbxgh";

const NAV_ITEMS: { href: string; label: string; external?: boolean }[] = [
  { href: "/", label: "Swap" },
  { href: "/buy", label: "Buy" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/swap/solana", label: "Solana" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/disclaimer", label: "Disclaimer" },
  { href: SUPPORT_TELEGRAM, label: "Support", external: true },
];

function NavLink({
  href,
  label,
  external,
  isActive,
  onNavigate,
}: {
  href: string;
  label: string;
  external?: boolean;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  const className = `block rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
    isActive ? "bg-[var(--swap-accent)]/20 text-[var(--swap-accent)]" : "text-slate-300 hover:bg-slate-800 hover:text-white"
  }`;
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={onNavigate}>
        <span aria-hidden>💬</span> {label}
      </a>
    );
  }
  return <Link href={href} className={className} onClick={onNavigate}>{label}</Link>;
}

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" || pathname === "/swap/crosschain";
    if (href === SUPPORT_TELEGRAM) return false;
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[var(--delta-bg)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--delta-bg)]/80">
      <nav className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-white hover:text-[var(--swap-accent)] transition-colors"
        >
          DeltaChainLabs
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1 sm:gap-2">
          {NAV_ITEMS.map((item) => (
            item.external ? (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors text-slate-300 hover:bg-slate-800 hover:text-white inline-flex items-center gap-1.5`}
              >
                <span aria-hidden>💬</span> Support
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(item.href) ? "bg-[var(--swap-accent)]/20 text-[var(--swap-accent)]" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            )
          ))}
        </div>

        {/* Mobile hamburger */}
        <div className="flex md:hidden items-center">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/5 bg-[var(--delta-bg)]/98 backdrop-blur">
          <div className="mx-auto max-w-4xl px-4 py-3 space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                external={item.external}
                isActive={isActive(item.href)}
                onNavigate={() => setMenuOpen(false)}
              />
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
