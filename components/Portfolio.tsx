"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { fetchPortfolioBalances, type PortfolioEntry } from "@/lib/portfolio";

const EXPLORER_URL: Record<number, string> = {
  1: "https://etherscan.io",
  8453: "https://basescan.org",
  42161: "https://arbiscan.io",
  137: "https://polygonscan.com",
  10: "https://optimism.etherscan.io",
  56: "https://bscscan.com",
};

function truncateAddress(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatBalance(bal: string): string {
  const n = parseFloat(bal);
  if (n >= 1e6) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n >= 1) return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
  if (n >= 0.0001) return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
  return n.toExponential(2);
}

export function Portfolio() {
  const { address, isConnected } = useAccount();
  const [entries, setEntries] = useState<PortfolioEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPortfolio = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const balances = await fetchPortfolioBalances(address as `0x${string}`);
      const symbols = Array.from(new Set(balances.map((e) => e.symbol)));
      const priceRes = await fetch(`/api/coingecko/simple-price?symbols=${symbols.join(",")}`);
      const prices = (await priceRes.json()) as Record<string, number>;

      const withPrices = balances.map((e) => {
        const priceUsd = prices[e.symbol] ?? null;
        const valueUsd = priceUsd != null ? parseFloat(e.balance) * priceUsd : null;
        return { ...e, priceUsd, valueUsd };
      });
      withPrices.sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0));
      setEntries(withPrices);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load portfolio");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected && address) {
      loadPortfolio();
    } else {
      setEntries([]);
    }
  }, [isConnected, address, loadPortfolio]);

  const totalUsd = entries.reduce((sum, e) => sum + (e.valueUsd ?? 0), 0);

  if (!isConnected) {
    return (
      <div className="w-full max-w-2xl mx-auto rounded-3xl border p-6 sm:p-8 bg-[var(--delta-card)] border-[var(--swap-pill-border)] shadow-xl">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">Portfolio</h1>
        <div className="py-12 flex flex-col items-center gap-5">
          <p className="text-[var(--delta-text-muted)] text-base">Connect your wallet to view your portfolio</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto rounded-3xl border p-6 sm:p-8 bg-[var(--delta-card)] border-[var(--swap-pill-border)] shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Portfolio</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">{address ? truncateAddress(address) : ""}</span>
          <button
            type="button"
            onClick={loadPortfolio}
            disabled={loading}
            className="text-xs text-[var(--swap-accent)] hover:opacity-80 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {loading && entries.length === 0 ? (
        <div className="py-12 text-center text-[var(--delta-text-muted)]">Loading balances…</div>
      ) : error ? (
        <div className="py-12 text-center text-red-400">{error}</div>
      ) : entries.length === 0 ? (
        <div className="py-12 text-center text-[var(--delta-text-muted)]">No balances found across supported chains</div>
      ) : (
        <>
          <div className="rounded-xl bg-[var(--swap-pill-bg)] border border-[var(--swap-pill-border)] p-4 mb-6">
            <p className="text-xs text-[var(--delta-text-muted)] mb-1">Total value</p>
            <p className="text-2xl font-bold text-white">
              ${totalUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {entries.map((e) => (
              <div
                key={`${e.chainId}-${e.symbol}`}
                className="flex items-center justify-between rounded-xl bg-[var(--swap-pill-bg)] border border-[var(--swap-pill-border)] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-white">{e.symbol}</span>
                  <span className="text-xs text-slate-500">{e.chainName}</span>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">{formatBalance(e.balance)} {e.symbol}</p>
                  {e.valueUsd != null && (
                    <p className="text-xs text-slate-400">
                      ${e.valueUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
                <a
                  href={`${EXPLORER_URL[e.chainId]}/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sky-400 hover:underline ml-2"
                >
                  View
                </a>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
