"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SUPPORT_TELEGRAM = "https://t.me/brandonxbxgh";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-700/50 bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80">
      <nav className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-white hover:text-sky-300 transition-colors"
        >
          DeltaChainLabs
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname === "/"
                ? "bg-sky-500/20 text-sky-300"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            Swap
          </Link>
          <Link
            href="/how-it-works"
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname === "/how-it-works"
                ? "bg-sky-500/20 text-sky-300"
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
