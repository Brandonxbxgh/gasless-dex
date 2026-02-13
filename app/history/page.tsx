"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAccount, useChainId } from "wagmi";
import { getHistory, clearHistory, type HistoryEntry } from "@/lib/history";
import { formatUnits } from "viem";

const CHAIN_NAME: Record<number, string> = {
  8453: "Base",
  42161: "Arbitrum",
  137: "Polygon",
  56: "BNB",
  1: "Ethereum",
};

const EXPLORER_URL: Record<number, string> = {
  8453: "https://basescan.org",
  42161: "https://arbiscan.io",
  137: "https://polygonscan.com",
  56: "https://bscscan.com",
  1: "https://etherscan.io",
};

function formatDateTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

type UnifiedEntry = 
  | { type: "swap"; data: HistoryEntry }
  | { type: "chain"; data: { hash: string; chainId: number; chainName: string; timestamp: number; value?: string } };

export default function HistoryPage() {
  const { address, isConnected } = useAccount();
  const [entries, setEntries] = useState<UnifiedEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    const local = getHistory();
    const localEntries: UnifiedEntry[] = local.map((e) => ({ type: "swap" as const, data: e }));

    if (isConnected && address) {
      setLoading(true);
      try {
        const chains = [8453, 42161, 137, 56, 1];
        const seenHashes = new Set(local.map((e) => e.txHash.toLowerCase()));
        const chainTxs: UnifiedEntry[] = [];

        const results = await Promise.all(
          chains.map((cid) =>
            fetch(`/api/tx-history?address=${encodeURIComponent(address)}&chainId=${cid}`).then((r) => r.json().catch(() => ({})))
          )
        );

        for (let i = 0; i < chains.length; i++) {
          const cid = chains[i];
          const txs = results[i]?.transactions ?? [];
          for (const tx of txs.slice(0, 10)) {
            const h = (tx.hash || "").toLowerCase();
            if (!h || seenHashes.has(h)) continue;
            seenHashes.add(h);
            const ts = typeof tx.timeStamp === "string" ? parseInt(tx.timeStamp, 10) * 1000 : tx.timeStamp ?? Date.now();
            chainTxs.push({
              type: "chain",
              data: {
                hash: tx.hash,
                chainId: cid,
                chainName: CHAIN_NAME[cid] ?? "Unknown",
                timestamp: ts,
                value: tx.value,
              },
            });
          }
        }

        const combined = [...localEntries, ...chainTxs].sort((a, b) => {
          const ta = a.type === "swap" ? a.data.timestamp : a.data.timestamp;
          const tb = b.type === "swap" ? b.data.timestamp : b.data.timestamp;
          return tb - ta;
        });
        setEntries(combined);
      } catch {
        setEntries(localEntries);
      } finally {
        setLoading(false);
      }
    } else {
      setEntries(localEntries);
    }
  }, [isConnected, address]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleClear = () => {
    clearHistory();
    loadHistory();
  };

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          Transaction History
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          {isConnected
            ? "Swaps from this session + on-chain transactions (permanent, any device)"
            : "Connect wallet to see on-chain history across devices"}
        </p>

        {loading && (
          <p className="text-slate-500 text-sm mb-4">Loading on-chain history...</p>
        )}

        {entries.length === 0 && !loading ? (
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-8 text-center">
            <p className="text-slate-400 mb-4">No transactions yet</p>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-[var(--swap-accent)] hover:opacity-90 px-5 py-2.5 text-sm font-medium text-white transition-colors"
            >
              Go to Swap
            </Link>
          </div>
        ) : (
          <>
            <div className="flex justify-end gap-3 mb-4">
              {isConnected && (
                <button
                  onClick={loadHistory}
                  disabled={loading}
                  className="text-xs text-slate-500 hover:text-white transition-colors disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Refresh"}
                </button>
              )}
              <button
                onClick={handleClear}
                className="text-xs text-slate-500 hover:text-red-400 transition-colors"
              >
                Clear stored swaps
              </button>
            </div>
            <div className="space-y-2">
              {entries.map((entry, i) => {
                if (entry.type === "swap") {
                  const e = entry.data;
                  return (
                    <a
                      key={e.id}
                      href={`${EXPLORER_URL[e.chainId] ?? "https://basescan.org"}/tx/${e.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-xl bg-slate-800/60 border border-slate-700/50 p-4 hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-white font-medium truncate">
                            {parseFloat(e.sellAmount).toLocaleString("en-US", { maximumFractionDigits: 6 })} {e.sellSymbol} → {parseFloat(e.buyAmount).toLocaleString("en-US", { maximumFractionDigits: 6 })} {e.buySymbol}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {e.chainName} · {formatDateTime(e.timestamp)}
                          </p>
                        </div>
                        <span className="text-slate-400 text-sm shrink-0">View →</span>
                      </div>
                    </a>
                  );
                }
                const e = entry.data;
                const valueEth = e.value ? formatUnits(BigInt(e.value), 18) : null;
                return (
                  <a
                    key={`${e.chainId}-${e.hash}-${i}`}
                    href={`${EXPLORER_URL[e.chainId] ?? "https://basescan.org"}/tx/${e.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl bg-slate-800/60 border border-slate-700/50 p-4 hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate">
                          Transaction {e.hash.slice(0, 10)}...
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {e.chainName} · {formatDateTime(e.timestamp)}
                          {valueEth && parseFloat(valueEth) > 0 && ` · ${parseFloat(valueEth).toLocaleString("en-US", { maximumFractionDigits: 6 })} ETH`}
                        </p>
                      </div>
                      <span className="text-slate-400 text-sm shrink-0">View →</span>
                    </div>
                  </a>
                );
              })}
            </div>
          </>
        )}

        <p className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-slate-700 hover:bg-slate-600 px-5 py-2.5 text-sm font-medium text-white transition-colors"
          >
            Back to Swap
          </Link>
        </p>
      </div>
    </main>
  );
}
