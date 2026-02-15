"use client";

import { useState, useCallback, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { VersionedTransaction, PublicKey } from "@solana/web3.js";
import { SOLANA_TOKENS, SOL_MINT, USDC_MINT } from "@/lib/solana-tokens";

export function SolanaSwap() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [sellMint, setSellMint] = useState(SOL_MINT);
  const [buyMint, setBuyMint] = useState(USDC_MINT);
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const sellToken = SOLANA_TOKENS.find((t) => t.mint === sellMint);
  const buyToken = SOLANA_TOKENS.find((t) => t.mint === buyMint);
  const amountRaw = amount && sellToken ? Math.floor(parseFloat(amount) * Math.pow(10, sellToken.decimals)) : 0;

  const [sellBalance, setSellBalance] = useState<string | null>(null);
  const [buyBalance, setBuyBalance] = useState<string | null>(null);
  useEffect(() => {
    if (!publicKey || !connection) {
      setSellBalance(null);
      setBuyBalance(null);
      return;
    }
    let cancelled = false;
    const fetchBalances = async () => {
      try {
        if (sellMint === SOL_MINT) {
          const bal = await connection.getBalance(publicKey);
          if (!cancelled) setSellBalance((bal / 1e9).toLocaleString("en-US", { maximumFractionDigits: 9 }));
        } else {
          const accounts = await connection.getParsedTokenAccountsByOwner(publicKey, { mint: new PublicKey(sellMint) });
          const info = accounts.value[0]?.account?.data?.parsed?.info;
          const uiAmt = info?.tokenAmount?.uiAmount ?? 0;
          if (!cancelled) setSellBalance(Number(uiAmt).toLocaleString("en-US", { maximumFractionDigits: 9 }));
        }
        if (buyMint === SOL_MINT) {
          const bal = await connection.getBalance(publicKey);
          if (!cancelled) setBuyBalance((bal / 1e9).toLocaleString("en-US", { maximumFractionDigits: 9 }));
        } else {
          const accounts = await connection.getParsedTokenAccountsByOwner(publicKey, { mint: new PublicKey(buyMint) });
          const info = accounts.value[0]?.account?.data?.parsed?.info;
          const uiAmt = info?.tokenAmount?.uiAmount ?? 0;
          if (!cancelled) setBuyBalance(Number(uiAmt).toLocaleString("en-US", { maximumFractionDigits: 9 }));
        }
      } catch {
        if (!cancelled) {
          setSellBalance(null);
          setBuyBalance(null);
        }
      }
    };
    fetchBalances();
    return () => { cancelled = true; };
  }, [publicKey, connection, sellMint, buyMint]);

  const fetchQuote = useCallback(async () => {
    if (!amountRaw || amountRaw <= 0) return;
    setLoading(true);
    setError(null);
    setQuote(null);
    try {
      const res = await fetch(
        `/api/jupiter-quote?inputMint=${encodeURIComponent(sellMint)}&outputMint=${encodeURIComponent(buyMint)}&amount=${amountRaw}&slippageBps=100`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Quote failed");
      setQuote(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Quote failed");
    } finally {
      setLoading(false);
    }
  }, [sellMint, buyMint, amountRaw]);

  const executeSwap = useCallback(async () => {
    if (!publicKey || !quote || !sendTransaction) return;
    setSwapping(true);
    setError(null);
    try {
      const swapRes = await fetch("/api/jupiter-swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPublicKey: publicKey.toBase58(),
          quoteResponse: quote as object,
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
        }),
      });
      const swapData = await swapRes.json();
      if (!swapRes.ok) throw new Error(swapData?.error || "Swap failed");

      const swapTxBuf = Uint8Array.from(atob(swapData.swapTransaction), (c) => c.charCodeAt(0));
      const tx = VersionedTransaction.deserialize(swapTxBuf);

      const sig = await sendTransaction(tx, connection, { skipPreflight: false });
      setTxHash(sig);
      setQuote(null);
      setAmount("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Swap failed");
    } finally {
      setSwapping(false);
    }
  }, [publicKey, quote, connection, sendTransaction]);

  const outAmountFormatted = quote && buyToken && typeof quote.outAmount === "string"
    ? (parseInt(quote.outAmount, 10) / Math.pow(10, buyToken.decimals)).toLocaleString("en-US", { maximumFractionDigits: 9 })
    : "0";

  return (
    <div className="w-full max-w-md mx-auto rounded-3xl border p-6 sm:p-8 bg-[var(--delta-card)] border-[var(--swap-pill-border)] shadow-xl">
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-white mb-1">Solana Swap</h1>
      <p className="text-center text-[var(--delta-text-muted)] text-sm mb-6">Powered by Jupiter</p>

      {!publicKey ? (
        <div className="py-12 flex flex-col items-center gap-5">
          <p className="text-[var(--delta-text-muted)] text-base">Connect your Solana wallet to swap</p>
          <WalletMultiButton className="!bg-[var(--swap-accent)] !rounded-xl" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl bg-[var(--swap-pill-bg)] border border-[var(--swap-pill-border)] p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[var(--delta-text-muted)]">Sell</p>
              {sellBalance != null && sellToken && (
                <span className="text-xs text-slate-400">Balance: {sellBalance} {sellToken.symbol}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9.]/g, "");
                  setAmount(v);
                  setQuote(null);
                }}
                className="flex-1 bg-transparent text-white text-2xl font-medium outline-none placeholder:text-slate-500"
              />
              <select
                value={sellMint}
                onChange={(e) => { setSellMint(e.target.value); setQuote(null); }}
                className="rounded-xl bg-[var(--delta-card)] border border-[var(--swap-pill-border)] text-white text-sm px-3 py-2"
              >
                {SOLANA_TOKENS.map((t) => (
                  <option key={t.mint} value={t.mint}>{t.symbol}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-2xl bg-[var(--swap-pill-bg)] border border-[var(--swap-pill-border)] p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[var(--delta-text-muted)]">Buy</p>
              {buyBalance != null && buyToken && (
                <span className="text-xs text-slate-400">Balance: {buyBalance} {buyToken.symbol}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 text-white text-2xl font-medium">{outAmountFormatted}</div>
              <select
                value={buyMint}
                onChange={(e) => { setBuyMint(e.target.value); setQuote(null); }}
                className="rounded-xl bg-[var(--delta-card)] border border-[var(--swap-pill-border)] text-white text-sm px-3 py-2"
              >
                {SOLANA_TOKENS.filter((t) => t.mint !== sellMint).map((t) => (
                  <option key={t.mint} value={t.mint}>{t.symbol}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex flex-col gap-2">
            <button
              onClick={fetchQuote}
              disabled={!amount || parseFloat(amount) <= 0 || loading}
              className="w-full py-4 rounded-2xl bg-[#2d2d3d] hover:bg-[#3d3d4d] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--swap-accent)] font-semibold text-base"
            >
              {loading ? "Getting quote..." : "Get quote"}
            </button>
            {quote && (
              <button
                onClick={executeSwap}
                disabled={swapping}
                className="w-full py-4 rounded-2xl bg-[var(--swap-accent)] hover:opacity-90 disabled:opacity-50 text-white font-semibold text-base"
              >
                {swapping ? "Swapping..." : "Swap"}
              </button>
            )}
          </div>

          {txHash && (
            <a
              href={`https://solscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-sm text-sky-400 hover:underline"
            >
              View on Solscan
            </a>
          )}

          <p className="text-xs text-slate-500 text-center mt-4">
            Add NEXT_PUBLIC_SOLANA_RPC in .env for better performance (e.g. Helius, QuickNode)
          </p>
        </div>
      )}
    </div>
  );
}
