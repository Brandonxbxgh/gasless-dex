"use client";

import { useState, useEffect } from "react";

export function MetaMaskBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("metamask-tip-dismissed");
    if (stored) setDismissed(true);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("metamask-tip-dismissed", "1");
  };

  const handleCopy = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (dismissed) return null;

  return (
    <div className="bg-sky-500/15 border-b border-sky-500/30 px-4 py-2.5 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-center">
      <p className="text-sky-200 text-sm">
        <strong>MetaMask users:</strong> For reliable network switching, open this site in MetaMask&apos;s{" "}
        <strong>Explore</strong> tab (browser icon) instead of WalletConnect from Chrome/Safari.
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs font-medium text-sky-300 hover:text-sky-200 underline"
        >
          {copied ? "Copied!" : "Copy URL"}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-sky-400 hover:text-sky-200 text-sm px-1"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
