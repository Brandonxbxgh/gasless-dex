"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { fetchPortfolioBalances, type PortfolioEntry } from "@/lib/portfolio";
import { SendReceive } from "@/components/SendReceive";

const EXPLORER_URL: Record<number, string> = {
  1: "https://etherscan.io",
  8453: "https://basescan.org",
  42161: "https://arbiscan.io",
  137: "https://polygonscan.com",
  10: "https://optimism.etherscan.io",
  56: "https://bscscan.com",
};

/** Color palette for donut chart - distinct, accessible colors */
const CHART_COLORS = [
  "#fc72ff", // swap-accent
  "#0ea5e9", // delta-primary
  "#22c55e", // green
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#6366f1", // indigo
  "#14b8a6", // teal
];

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

/** SVG donut chart - segments by value, color-coded with percentages */
function DonutChart({
  data,
  total,
  size = 160,
  strokeWidth = 24,
}: {
  data: { label: string; value: number; color: string }[];
  total: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {data.map((d, i) => {
          const pct = total > 0 ? d.value / total : 0;
          const dashLength = pct * circumference;
          const dashOffset = -offset;
          offset += dashLength;

          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLength} ${circumference}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">
          {data.length}
        </span>
        <span className="text-xs text-[var(--delta-text-muted)]">assets</span>
      </div>
    </div>
  );
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

  /** Aggregate by symbol for donut chart (merge same token across chains) */
  const chartData = useMemo(() => {
    const bySymbol: Record<string, { value: number; label: string }> = {};
    for (const e of entries) {
      const v = e.valueUsd ?? 0;
      if (v <= 0) continue;
      if (!bySymbol[e.symbol]) bySymbol[e.symbol] = { value: 0, label: e.symbol };
      bySymbol[e.symbol].value += v;
    }
    return Object.values(bySymbol)
      .sort((a, b) => b.value - a.value)
      .map((d, i) => ({ ...d, color: CHART_COLORS[i % CHART_COLORS.length] }));
  }, [entries]);

  /** Aggregate by chain for summary */
  const byChain = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries) {
      const v = e.valueUsd ?? 0;
      map[e.chainName] = (map[e.chainName] ?? 0) + v;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [entries]);

  const chainCount = byChain.length;
  const assetCount = entries.length;

  type PortfolioTab = "overview" | "send" | "receive";
  const [portfolioTab, setPortfolioTab] = useState<PortfolioTab>("overview");

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

      {/* Portfolio tabs: Overview | Send | Receive */}
      <div className="flex rounded-xl bg-[var(--swap-pill-bg)] border border-[var(--swap-pill-border)] p-1 mb-6">
        <button
          type="button"
          onClick={() => setPortfolioTab("overview")}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            portfolioTab === "overview" ? "bg-[var(--swap-accent)]/20 text-[var(--swap-accent)]" : "text-slate-400 hover:text-white"
          }`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setPortfolioTab("send")}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            portfolioTab === "send" ? "bg-[var(--swap-accent)]/20 text-[var(--swap-accent)]" : "text-slate-400 hover:text-white"
          }`}
        >
          Send
        </button>
        <button
          type="button"
          onClick={() => setPortfolioTab("receive")}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            portfolioTab === "receive" ? "bg-[var(--swap-accent)]/20 text-[var(--swap-accent)]" : "text-slate-400 hover:text-white"
          }`}
        >
          Receive
        </button>
      </div>

      {portfolioTab === "send" || portfolioTab === "receive" ? (
        <SendReceive
          activeTab={portfolioTab}
          onTabChange={(tab) => setPortfolioTab(tab)}
        />
      ) : loading && entries.length === 0 ? (
        <div className="py-12 text-center text-[var(--delta-text-muted)]">Loading balances…</div>
      ) : error ? (
        <div className="py-12 text-center text-red-400">{error}</div>
      ) : entries.length === 0 ? (
        <div className="py-12 text-center text-[var(--delta-text-muted)]">No balances found across supported chains</div>
      ) : (
        <>
          {/* Total value + summary stats */}
          <div className="rounded-xl bg-[var(--swap-pill-bg)] border border-[var(--swap-pill-border)] p-4 mb-6">
            <p className="text-xs text-[var(--delta-text-muted)] mb-1">Total value</p>
            <p className="text-2xl sm:text-3xl font-bold text-white">
              ${totalUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <span className="text-[var(--delta-text-muted)]">
                <span className="text-white font-medium">{assetCount}</span> holdings
              </span>
              <span className="text-[var(--delta-text-muted)]">
                <span className="text-white font-medium">{chainCount}</span> chains
              </span>
            </div>
          </div>

          {/* Donut chart + legend */}
          <div className="flex flex-col sm:flex-row items-center gap-6 mb-6 p-4 rounded-xl bg-[var(--swap-pill-bg)] border border-[var(--swap-pill-border)]">
            <DonutChart data={chartData} total={totalUsd} size={160} strokeWidth={22} />
            <div className="flex-1 w-full sm:w-auto">
              <p className="text-xs text-[var(--delta-text-muted)] mb-2 font-medium">Allocation by asset</p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {chartData.map((d, i) => {
                  const pct = totalUsd > 0 ? (d.value / totalUsd) * 100 : 0;
                  return (
                    <div key={i} className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="shrink-0 w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: d.color }}
                        />
                        <span className="text-white font-medium truncate">{d.label}</span>
                      </div>
                      <span className="text-[var(--delta-text-muted)] shrink-0">
                        {pct >= 0.1 ? pct.toFixed(1) : "<0.1"}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* By chain breakdown */}
          {byChain.length > 1 && (
            <div className="mb-6 p-4 rounded-xl bg-[var(--swap-pill-bg)] border border-[var(--swap-pill-border)]">
              <p className="text-xs text-[var(--delta-text-muted)] mb-2 font-medium">Value by chain</p>
              <div className="flex flex-wrap gap-2">
                {byChain.map(([chain, val]) => {
                  const pct = totalUsd > 0 ? (val / totalUsd) * 100 : 0;
                  return (
                    <span
                      key={chain}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--delta-card)] border border-[var(--swap-pill-border)] text-xs"
                    >
                      <span className="text-white font-medium">{chain}</span>
                      <span className="text-[var(--delta-text-muted)]">
                        ${val.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                        {pct >= 0.1 && (
                          <span className="ml-0.5 opacity-80">({pct.toFixed(0)}%)</span>
                        )}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Holdings table */}
          <div>
            <p className="text-xs text-[var(--delta-text-muted)] mb-2 font-medium">Holdings</p>
            <div className="space-y-2 max-h-[360px] overflow-y-auto">
              {entries.map((e) => {
                const pct = totalUsd > 0 && e.valueUsd != null ? (e.valueUsd / totalUsd) * 100 : null;
                const chartColor = chartData.find((d) => d.label === e.symbol)?.color ?? CHART_COLORS[0];
                return (
                  <div
                    key={`${e.chainId}-${e.symbol}`}
                    className="flex items-center justify-between gap-3 rounded-xl bg-[var(--swap-pill-bg)] border border-[var(--swap-pill-border)] px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="shrink-0 w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: chartColor }}
                      />
                      <div>
                        <span className="font-medium text-white">{e.symbol}</span>
                        <span className="text-xs text-slate-500 ml-2">{e.chainName}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-white font-medium">
                        {formatBalance(e.balance)} {e.symbol}
                      </p>
                      {e.valueUsd != null && (
                        <p className="text-xs text-slate-400">
                          ${e.valueUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          {pct != null && pct >= 0.1 && (
                            <span className="text-[var(--delta-text-muted)] ml-1">({pct.toFixed(1)}%)</span>
                          )}
                        </p>
                      )}
                    </div>
                    <a
                      href={`${EXPLORER_URL[e.chainId]}/address/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-sky-400 hover:underline shrink-0"
                    >
                      View
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
