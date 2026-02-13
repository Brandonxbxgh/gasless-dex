"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SUPPORT_TELEGRAM = "https://t.me/brandonxbxgh";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[var(--delta-bg)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--delta-bg)]/80">
      <nav className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-white hover:text-[var(--swap-accent)] transition-colors"
        >
          DeltaChainLabs
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname === "/"
                ? "bg-[var(--swap-accent)]/20 text-[var(--swap-accent)]"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            Swap
          </Link>
          <Link
            href="/swap/solana"
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname === "/swap/solana"
                ? "bg-[var(--swap-accent)]/20 text-[var(--swap-accent)]"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            Solana
          </Link>
          <Link
            href="/history"
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname === "/history"
                ? "bg-[var(--swap-accent)]/20 text-[var(--swap-accent)]"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            History
          </Link>
          <Link
            href="/how-it-works"
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname === "/how-it-works"
                ? "bg-[var(--swap-accent)]/20 text-[var(--swap-accent)]"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            How it works
          </Link>
          <a
            href={SUPPORT_TELEGRAM}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors inline-flex items-center gap-1.5"
          >
            <span aria-hidden>💬</span>
            Support
          </a>
        </div>
      </nav>
    </header>
  );
}
