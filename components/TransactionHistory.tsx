"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";

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

const NATIVE_SYMBOL: Record<number, string> = {
  1: "ETH",
  8453: "ETH",
  42161: "ETH",
  137: "MATIC",
  10: "ETH",
  56: "BNB",
};

type OurTx = {
  id: string;
  tx_hash: string;
  chain_id: number;
  address: string;
  action_type: string;
  from_token: string | null;
  to_token: string | null;
  from_chain_id: number | null;
  to_chain_id: number | null;
  from_amount: string | null;
  to_amount: string | null;
  from_amount_usd: string | null;
  to_amount_usd: string | null;
  created_at: string;
};

type TokenTransferDisplay = {
  direction: "sent" | "received";
  amount: string;
  symbol: string;
};

type WalletHistoryTx = {
  hash: string;
  chainId: number;
  timeStamp: number;
  from: string;
  to: string;
  value: string;
  isError: boolean;
  viaDeltaChain?: OurTx;
  tokenTransfers?: TokenTransferDisplay[];
};

function formatTimeAgo(ts: number) {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - ts;
  const diffMins = Math.floor(diff / 60);
  const diffHours = Math.floor(diff / 3600);
  const diffDays = Math.floor(diff / 86400);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(ts * 1000).toLocaleDateString();
}

function getActionLabel(actionType: string): string {
  const labels: Record<string, string> = {
    swap: "Swap",
    bridge: "Bridge",
    send: "Send",
    wrap: "Wrap",
    unwrap: "Unwrap",
  };
  return labels[actionType] ?? actionType;
}

function formatAction(tx: WalletHistoryTx): string {
  if (tx.viaDeltaChain) {
    const { action_type, from_token, to_token, from_chain_id, to_chain_id } = tx.viaDeltaChain;
    const from = from_token ?? "?";
    const to = to_token ?? "?";
    switch (action_type) {
      case "swap":
        return `${from} → ${to}`;
      case "bridge":
        return `${from} → ${to}${from_chain_id && to_chain_id ? ` (${CHAIN_NAME[from_chain_id] ?? from_chain_id} → ${CHAIN_NAME[to_chain_id] ?? to_chain_id})` : ""}`;
      case "send":
        return `Sent ${from}`;
      case "wrap":
        return `${from} → ${to}`;
      case "unwrap":
        return `${from} → ${to}`;
      default:
        return action_type;
    }
  }
  if (tx.tokenTransfers?.length) {
    const sent = tx.tokenTransfers.filter((t) => t.direction === "sent");
    const received = tx.tokenTransfers.filter((t) => t.direction === "received");
    if (sent.length && received.length) {
      return `${sent.map((t) => `${t.amount} ${t.symbol}`).join(", ")} → ${received.map((t) => `${t.amount} ${t.symbol}`).join(", ")}`;
    }
    if (sent.length) return `Sent ${sent.map((t) => `${t.amount} ${t.symbol}`).join(", ")}`;
    if (received.length) return `Received ${received.map((t) => `${t.amount} ${t.symbol}`).join(", ")}`;
  }
  const val = BigInt(tx.value);
  if (val > BigInt(0)) return "Transfer";
  return "Transaction";
}

function formatNativeAmount(value: string, chainId: number): string | null {
  const val = BigInt(value);
  if (val === BigInt(0)) return null;
  const sym = NATIVE_SYMBOL[chainId] ?? "ETH";
  const formatted = formatUnits(val, 18);
  const num = parseFloat(formatted);
  if (num >= 1000) return `${num.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${sym}`;
  if (num >= 1) return `${num.toFixed(4)} ${sym}`;
  if (num >= 0.0001) return `${num.toFixed(6)} ${sym}`;
  return `${formatted} ${sym}`;
}

function truncateHash(hash: string) {
  if (!hash || hash.length < 12) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-6)}`;
}

export function TransactionHistory() {
  const { address } = useAccount();
  const [txs, setTxs] = useState<WalletHistoryTx[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setTxs([]);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/wallet-history?address=${encodeURIComponent(address)}`)
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

  useEffect(() => {
    fetch("/api/coingecko/simple-price?symbols=ETH,MATIC,BNB")
      .then((r) => r.json())
      .then((data) => setPrices(data ?? {}))
      .catch(() => {});
  }, []);

  const getUsdForNative = (value: string, chainId: number): string | null => {
    const val = BigInt(value);
    if (val === BigInt(0)) return null;
    const sym = NATIVE_SYMBOL[chainId] ?? "ETH";
    const price = prices[sym];
    if (price == null || price <= 0) return null;
    const amount = Number(formatUnits(val, 18));
    const usd = amount * price;
    if (usd < 0.0001) return null;
    if (usd < 0.01) return "<$0.01";
    return `$${usd < 1 ? usd.toFixed(2) : usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
  };

  if (!address) return null;

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--delta-text-muted)]">
        All recent transactions. Ones performed through DeltaChainLabs are clearly marked.
      </p>
      {loading ? (
        <p className="text-sm text-[var(--delta-text-muted)] py-4 text-center">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-400 py-4 text-center">{error}</p>
      ) : txs.length === 0 ? (
        <p className="text-sm text-[var(--delta-text-muted)] py-4 text-center">
          No transactions found. Swaps, bridges, and sends will appear here.
        </p>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {txs.map((tx) => {
            const txId = `${tx.chainId}-${tx.hash}`;
            const isExpanded = expandedId === txId;
            const explorerUrl = `${EXPLORER_URL[tx.chainId] ?? "https://etherscan.io"}/tx/${tx.hash}`;
            const actionLabel = tx.viaDeltaChain
              ? getActionLabel(tx.viaDeltaChain.action_type)
              : tx.tokenTransfers?.length
                ? (tx.tokenTransfers.some((t) => t.direction === "sent") && tx.tokenTransfers.some((t) => t.direction === "received") ? "Swap" : tx.tokenTransfers.some((t) => t.direction === "sent") ? "Send" : "Receive")
                : BigInt(tx.value) > BigInt(0)
                  ? "Transfer"
                  : "Transaction";
            const nativeAmount = formatNativeAmount(tx.value, tx.chainId);
            const usdAmount = getUsdForNative(tx.value, tx.chainId);

            return (
              <div
                key={txId}
                className="rounded-xl bg-[var(--swap-pill-bg)] border border-[var(--swap-pill-border)] overflow-hidden transition-colors hover:border-[var(--swap-accent)]/20"
              >
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-white/10 text-slate-300">
                          {actionLabel}
                        </span>
                        {tx.viaDeltaChain && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-[var(--swap-accent)]/25 text-[var(--swap-accent)] border border-[var(--swap-accent)]/30">
                            via DeltaChainLabs
                          </span>
                        )}
                      </div>
                      <p className="text-white font-medium mt-1.5 truncate">
                        {formatAction(tx)}
                        {tx.isError && <span className="text-red-400 ml-1">(failed)</span>}
                      </p>
                      <p className="text-xs text-[var(--delta-text-muted)] mt-0.5">
                        {formatTimeAgo(tx.timeStamp)} · {CHAIN_NAME[tx.chainId] ?? `Chain ${tx.chainId}`}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[var(--swap-accent)]/20 text-[var(--swap-accent)] hover:bg-[var(--swap-accent)]/30 transition-colors"
                      >
                        View tx
                      </a>
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : txId)}
                        className="text-xs font-medium px-2 py-1.5 rounded-lg bg-white/10 text-slate-400 hover:text-white hover:bg-white/15 transition-colors"
                      >
                        {isExpanded ? "Less" : "Details"}
                      </button>
                    </div>
                  </div>

                  {(tx.viaDeltaChain?.from_amount || nativeAmount || tx.tokenTransfers?.length) && !isExpanded && (
                    <p className="text-sm text-slate-300 mt-2">
                      {tx.viaDeltaChain?.from_amount
                        ? `${tx.viaDeltaChain.from_amount} ${tx.viaDeltaChain.from_token ?? ""}`
                        : tx.tokenTransfers?.length
                          ? tx.tokenTransfers.map((t) => `${t.amount} ${t.symbol}`).join(" · ")
                          : nativeAmount}
                      {(tx.viaDeltaChain?.from_amount_usd || usdAmount) && (
                        <span className="ml-2 text-emerald-400/90">
                          {tx.viaDeltaChain?.from_amount_usd ? `$${tx.viaDeltaChain.from_amount_usd}` : usdAmount}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {isExpanded && (
                  <div className="border-t border-[var(--swap-pill-border)] bg-black/20 px-4 py-3 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      {tx.viaDeltaChain ? (
                        <>
                          <div>
                            <p className="text-xs text-[var(--delta-text-muted)] uppercase tracking-wide mb-0.5">Asset sent</p>
                            <p className="text-white font-medium">
                              {tx.viaDeltaChain.from_amount ?? "—"} {tx.viaDeltaChain.from_token ?? ""}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[var(--delta-text-muted)] uppercase tracking-wide mb-0.5">USD value</p>
                            <p className="text-emerald-400 font-medium">
                              {tx.viaDeltaChain.from_amount_usd ? `$${tx.viaDeltaChain.from_amount_usd}` : "—"}
                            </p>
                          </div>
                          {(tx.viaDeltaChain.to_amount || tx.viaDeltaChain.to_amount_usd) && (
                            <>
                              <div>
                                <p className="text-xs text-[var(--delta-text-muted)] uppercase tracking-wide mb-0.5">Asset received</p>
                                <p className="text-white font-medium">
                                  {tx.viaDeltaChain.to_amount ?? "—"} {tx.viaDeltaChain.to_token ?? ""}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-[var(--delta-text-muted)] uppercase tracking-wide mb-0.5">Received USD</p>
                                <p className="text-emerald-400 font-medium">
                                  {tx.viaDeltaChain.to_amount_usd ? `$${tx.viaDeltaChain.to_amount_usd}` : "—"}
                                </p>
                              </div>
                            </>
                          )}
                          <div className="sm:col-span-2">
                            <p className="text-xs text-[var(--delta-text-muted)] uppercase tracking-wide mb-0.5">Blockchain</p>
                            <p className="text-white font-medium">
                              {CHAIN_NAME[tx.chainId] ?? `Chain ${tx.chainId}`}
                              {tx.viaDeltaChain.from_chain_id != null && tx.viaDeltaChain.to_chain_id != null && tx.viaDeltaChain.from_chain_id !== tx.viaDeltaChain.to_chain_id && (
                                <span className="text-slate-400 ml-1">
                                  ({CHAIN_NAME[tx.viaDeltaChain.from_chain_id]} → {CHAIN_NAME[tx.viaDeltaChain.to_chain_id]})
                                </span>
                              )}
                            </p>
                          </div>
                        </>
                      ) : tx.tokenTransfers?.length ? (
                        <>
                          {tx.tokenTransfers.map((t, i) => (
                            <div key={i}>
                              <p className="text-xs text-[var(--delta-text-muted)] uppercase tracking-wide mb-0.5">
                                {t.direction === "sent" ? "Sent" : "Received"}
                              </p>
                              <p className="text-white font-medium">
                                {t.amount} {t.symbol}
                              </p>
                            </div>
                          ))}
                          <div className="sm:col-span-2">
                            <p className="text-xs text-[var(--delta-text-muted)] uppercase tracking-wide mb-0.5">Blockchain</p>
                            <p className="text-white font-medium">{CHAIN_NAME[tx.chainId] ?? `Chain ${tx.chainId}`}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <p className="text-xs text-[var(--delta-text-muted)] uppercase tracking-wide mb-0.5">Amount</p>
                            <p className="text-white font-medium">{nativeAmount ?? "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[var(--delta-text-muted)] uppercase tracking-wide mb-0.5">USD value</p>
                            <p className="text-emerald-400 font-medium">{usdAmount ?? "—"}</p>
                          </div>
                          <div className="sm:col-span-2">
                            <p className="text-xs text-[var(--delta-text-muted)] uppercase tracking-wide mb-0.5">Blockchain</p>
                            <p className="text-white font-medium">{CHAIN_NAME[tx.chainId] ?? `Chain ${tx.chainId}`}</p>
                          </div>
                        </>
                      )}
                      <div className="sm:col-span-2">
                        <p className="text-xs text-[var(--delta-text-muted)] uppercase tracking-wide mb-0.5">Transaction hash</p>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono text-slate-400 bg-black/30 px-2 py-1 rounded truncate max-w-[200px]">
                            {truncateHash(tx.hash)}
                          </code>
                          <button
                            type="button"
                            onClick={() => copyHash(tx.hash)}
                            className="text-xs text-[var(--swap-accent)] hover:underline"
                          >
                            Copy
                          </button>
                          <a
                            href={explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[var(--swap-accent)] hover:underline"
                          >
                            View on explorer
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
