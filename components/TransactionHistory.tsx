"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";

const EXPLORER_URL: Record<number, string> = {
  1: "https://etherscan.io",
  8453: "https://basescan.org",
  42161: "https://arbiscan.io",
  137: "https://polygonscan.com",
  10: "https://optimism.etherscan.io",
  56: "https://bscscan.com",
};

const CHAIN_NAME: Record<number, string> = {
  1: "Ethereum",
  8453: "Base",
  42161: "Arbitrum",
  137: "Polygon",
  10: "Optimism",
  56: "BNB",
};

type StoredTx = {
  id: string;
  tx_hash: string;
  chain_id: number;
  address: string;
  action_type: string;
  from_token: string | null;
  to_token: string | null;
  from_chain_id: number | null;
  to_chain_id: number | null;
  created_at: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

function formatAction(action: string, fromToken?: string | null, toToken?: string | null, fromChain?: number | null, toChain?: number | null) {
  const from = fromToken ?? "?";
  const to = toToken ?? "?";
  switch (action) {
    case "swap":
      return `${from} → ${to}`;
    case "bridge":
      return `${from} → ${to}${fromChain && toChain ? ` (${CHAIN_NAME[fromChain] ?? fromChain} → ${CHAIN_NAME[toChain] ?? toChain})` : ""}`;
    case "send":
      return `Sent ${from}`;
    case "wrap":
      return `${from} → ${to}`;
    case "unwrap":
      return `${from} → ${to}`;
    default:
      return action;
  }
}

export function TransactionHistory() {
  const { address } = useAccount();
  const [txs, setTxs] = useState<StoredTx[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setTxs([]);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/transactions?address=${encodeURIComponent(address)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setTxs(data.transactions ?? []);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load");
        setTxs([]);
      })
      .finally(() => setLoading(false));
  }, [address]);

  if (!address) return null;

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--delta-text-muted)]">
        Transactions performed through DeltaChainLabs
      </p>
      {loading ? (
        <p className="text-sm text-[var(--delta-text-muted)] py-4 text-center">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-400 py-4 text-center">{error}</p>
      ) : txs.length === 0 ? (
        <p className="text-sm text-[var(--delta-text-muted)] py-4 text-center">
          No transactions yet. Swaps, bridges, and sends will appear here.
        </p>
      ) : (
        <div className="space-y-2 max-h-[320px] overflow-y-auto">
          {txs.map((tx) => (
            <a
              key={tx.id}
              href={`${EXPLORER_URL[tx.chain_id] ?? "https://etherscan.io"}/tx/${tx.tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 rounded-xl bg-[var(--swap-pill-bg)] border border-[var(--swap-pill-border)] px-4 py-3 hover:border-[var(--swap-accent)]/30 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-white font-medium truncate">
                  {formatAction(tx.action_type, tx.from_token, tx.to_token, tx.from_chain_id, tx.to_chain_id)}
                </p>
                <p className="text-xs text-[var(--delta-text-muted)]">
                  {formatDate(tx.created_at)} · {CHAIN_NAME[tx.chain_id] ?? `Chain ${tx.chain_id}`}
                </p>
              </div>
              <span className="shrink-0 text-xs px-2 py-0.5 rounded-md bg-[var(--swap-accent)]/20 text-[var(--swap-accent)]">
                via DeltaChainLabs
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
