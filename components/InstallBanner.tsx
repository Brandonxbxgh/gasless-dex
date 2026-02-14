"use client";

import { useState, useEffect } from "react";

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<{ prompt: () => Promise<{ outcome: string }> } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone);
    const stored = localStorage.getItem("pwa-install-dismissed");
    if (stored) setDismissed(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt((e as any));
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", "1");
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", "1");
  };

  if (isStandalone || dismissed || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 rounded-xl bg-[var(--delta-card)] border border-[var(--swap-pill-border)] p-4 shadow-xl flex items-center gap-3">
      <span className="text-2xl" aria-hidden>📱</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">Install app</p>
        <p className="text-xs text-[var(--delta-text-muted)]">Add to home screen for quick access</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 rounded-lg bg-[var(--swap-accent)] text-white text-sm font-medium hover:opacity-90"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white text-sm"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
