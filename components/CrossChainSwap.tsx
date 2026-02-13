"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount, useChainId, useSwitchChain, useWalletClient, usePublicClient } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const ACROSS_CHAINS = [
  { id: 1, name: "Ethereum" },
  { id: 8453, name: "Base" },
  { id: 42161, name: "Arbitrum" },
  { id: 137, name: "Polygon" },
  { id: 10, name: "Optimism" },
  { id: 56, name: "BNB" },
] as const;

const NATIVE_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

const TOKENS_BY_CHAIN: Record<number, { address: string; symbol: string; decimals: number; isNative?: boolean }[]> = {
  1: [
    { address: NATIVE_TOKEN, symbol: "ETH", decimals: 18, isNative: true },
    { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", decimals: 6 },
    { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", decimals: 6 },
    { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "WETH", decimals: 18 },
  ],
  8453: [
    { address: NATIVE_TOKEN, symbol: "ETH", decimals: 18, isNative: true },
    { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", decimals: 6 },
    { address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", symbol: "USDT", decimals: 6 },
    { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", decimals: 18 },
  ],
  42161: [
    { address: NATIVE_TOKEN, symbol: "ETH", decimals: 18, isNative: true },
    { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", decimals: 6 },
    { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", symbol: "USDT", decimals: 6 },
    { address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", symbol: "WETH", decimals: 18 },
  ],
  137: [
    { address: NATIVE_TOKEN, symbol: "MATIC", decimals: 18, isNative: true },
    { address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", symbol: "USDC", decimals: 6 },
    { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", symbol: "USDT", decimals: 6 },
    { address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", symbol: "WMATIC", decimals: 18 },
  ],
  10: [
    { address: NATIVE_TOKEN, symbol: "ETH", decimals: 18, isNative: true },
    { address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", symbol: "USDC", decimals: 6 },
    { address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", symbol: "USDT", decimals: 6 },
    { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", decimals: 18 },
  ],
  56: [
    { address: NATIVE_TOKEN, symbol: "BNB", decimals: 18, isNative: true },
    { address: "0x55d398326f99059fF775485246999027B3197955", symbol: "USDT", decimals: 18 },
    { address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", symbol: "WBNB", decimals: 18 },
  ],
};

const EXPLORER_URL: Record<number, string> = {
  1: "https://etherscan.io",
  8453: "https://basescan.org",
  42161: "https://arbiscan.io",
  137: "https://polygonscan.com",
  10: "https://optimism.etherscan.io",
  56: "https://bscscan.com",
};

export function CrossChainSwap() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [originChainId, setOriginChainId] = useState(1);
  const [destChainId, setDestChainId] = useState(8453);
  const [inputToken, setInputToken] = useState(TOKENS_BY_CHAIN[1][0]);
  const [outputToken, setOutputToken] = useState(TOKENS_BY_CHAIN[8453][0]);
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<{
    approvalTxns?: { to: string; data: string; value?: string }[];
    swapTx: { to: string; data: string; value?: string };
    steps?: { bridge?: { outputAmount: string; tokenOut?: { decimals: number } } };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const inputTokens = TOKENS_BY_CHAIN[originChainId] ?? TOKENS_BY_CHAIN[1];
  const outputTokens = TOKENS_BY_CHAIN[destChainId] ?? TOKENS_BY_CHAIN[8453];

  useEffect(() => {
    if (originChainId === destChainId) {
      const next = ACROSS_CHAINS.find((c) => c.id !== originChainId);
      if (next) {
        setDestChainId(next.id);
        const tokens = TOKENS_BY_CHAIN[next.id];
        setOutputToken(tokens?.[0] ?? { address: "", symbol: "", decimals: 18 });
        setQuote(null);
      }
    }
  }, [originChainId, destChainId]);

  const isSameChain = originChainId === destChainId;
  const needsChainSwitch = isConnected && chainId !== originChainId;

  const fetchQuote = useCallback(async () => {
    if (!address || !amount || parseFloat(amount) <= 0 || isSameChain) return;
    setLoading(true);
    setError(null);
    setQuote(null);
    try {
      const amountWei = parseUnits(amount, inputToken.decimals).toString();
      const res = await fetch(
        `/api/across-quote?tradeType=exactInput&amount=${amountWei}&inputToken=${inputToken.address}&outputToken=${outputToken.address}&originChainId=${originChainId}&destinationChainId=${destChainId}&depositor=${address}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Quote failed");
      setQuote(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Quote failed");
    } finally {
      setLoading(false);
    }
  }, [address, amount, inputToken, outputToken, originChainId, destChainId, isSameChain]);

  const executeSwap = useCallback(async () => {
    if (!quote || !walletClient || !address) return;
    setSwapping(true);
    setError(null);
    try {
      if (needsChainSwitch && switchChain) {
        await switchChain({ chainId: originChainId });
        await new Promise((r) => setTimeout(r, 1000));
      }
      if (quote.approvalTxns?.length) {
        for (const approval of quote.approvalTxns) {
          const hash = await walletClient.sendTransaction({
            to: approval.to as `0x${string}`,
            data: approval.data as `0x${string}`,
            value: approval.value ? BigInt(approval.value) : undefined,
          });
          if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
        }
      }
      const swap = quote.swapTx;
      const hash = await walletClient.sendTransaction({
        to: swap.to as `0x${string}`,
        data: swap.data as `0x${string}`,
        value: swap.value ? BigInt(swap.value) : undefined,
      });
      setTxHash(hash);
      setQuote(null);
      setAmount("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Swap failed");
    } finally {
      setSwapping(false);
    }
  }, [quote, walletClient, address, needsChainSwitch, switchChain, originChainId, publicClient]);

  const outputAmount = quote?.steps?.bridge?.outputAmount && quote.steps.bridge.tokenOut
    ? formatUnits(BigInt(quote.steps.bridge.outputAmount), quote.steps.bridge.tokenOut.decimals)
    : null;

  return (
    <div className="w-full max-w-md mx-auto rounded-3xl border p-6 sm:p-8 bg-[var(--delta-card)] border-[var(--swap-pill-border)] shadow-xl">
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-white mb-1">Cross-Chain Swap</h1>
      <p className="text-center text-[var(--delta-text-muted)] text-sm mb-6">Powered by Across</p>

      {!isConnected ? (
        <div className="py-12 flex flex-col items-center gap-5">
          <p className="text-[var(--delta-text-muted)] text-base">Connect your wallet to swap across chains</p>
          <ConnectButton />
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-xs text-[var(--delta-text-muted)] mb-2">From</p>
            <select
              value={originChainId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setOriginChainId(id);
                setInputToken(TOKENS_BY_CHAIN[id]?.[0] ?? inputTokens[0]);
                setQuote(null);
              }}
              className="w-full rounded-xl bg-[var(--swap-pill-bg)] border border-[var(--swap-pill-border)] text-white text-sm px-3 py-2 mb-2"
            >
              {ACROSS_CHAINS.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
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
                className="flex-1 rounded-xl bg-[var(--swap-pill-bg)] border border-[var(--swap-pill-border)] text-white px-3 py-2"
              />
              <select
                value={inputToken.address}
                onChange={(e) => {
                  const t = inputTokens.find((x) => x.address === e.target.value);
                  if (t) setInputToken(t);
                  setQuote(null);
                }}
                className="rounded-xl bg-[var(--delta-card)] border border-[var(--swap-pill-border)] text-white text-sm px-3 py-2 w-28"
              >
                {inputTokens.map((t) => (
                  <option key={t.address} value={t.address}>{t.symbol}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <p className="text-xs text-[var(--delta-text-muted)] mb-2">To</p>
            <select
              value={destChainId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setDestChainId(id);
                setOutputToken(TOKENS_BY_CHAIN[id]?.[0] ?? outputTokens[0]);
                setQuote(null);
              }}
              className="w-full rounded-xl bg-[var(--swap-pill-bg)] border border-[var(--swap-pill-border)] text-white text-sm px-3 py-2 mb-2"
            >
              {ACROSS_CHAINS.filter((c) => c.id !== originChainId).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="flex items-center gap-2 rounded-xl bg-[var(--swap-pill-bg)] border border-[var(--swap-pill-border)] px-3 py-2">
              <span className="flex-1 text-white text-lg font-medium">
                {outputAmount ?? "0"}
              </span>
              <select
                value={outputToken.address}
                onChange={(e) => {
                  const t = outputTokens.find((x) => x.address === e.target.value);
                  if (t) setOutputToken(t);
                  setQuote(null);
                }}
                className="rounded-lg bg-[var(--delta-card)] border border-[var(--swap-pill-border)] text-white text-sm px-2 py-1.5"
              >
                {outputTokens.map((t) => (
                  <option key={t.address} value={t.address}>{t.symbol}</option>
                ))}
              </select>
            </div>
          </div>

          {isSameChain && (
            <p className="text-amber-400 text-xs">Select different chains for cross-chain swap</p>
          )}
          {needsChainSwitch && (
            <p className="text-amber-400 text-xs">Switch to {ACROSS_CHAINS.find((c) => c.id === originChainId)?.name} to execute</p>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex flex-col gap-2">
            <button
              onClick={fetchQuote}
              disabled={!amount || parseFloat(amount) <= 0 || loading || isSameChain}
              className="w-full py-4 rounded-2xl bg-[#2d2d3d] hover:bg-[#3d3d4d] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--swap-accent)] font-semibold text-base"
            >
              {loading ? "Getting quote..." : "Get quote"}
            </button>
            {quote && (
              <button
                onClick={executeSwap}
                disabled={swapping || needsChainSwitch}
                className="w-full py-4 rounded-2xl bg-[var(--swap-accent)] hover:opacity-90 disabled:opacity-50 text-white font-semibold text-base"
              >
                {swapping ? "Swapping..." : "Swap"}
              </button>
            )}
          </div>

          {txHash && (
            <a
              href={`${EXPLORER_URL[originChainId] ?? "https://basescan.org"}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-sm text-sky-400 hover:underline"
            >
              View transaction
            </a>
          )}

          <p className="text-xs text-slate-500 text-center mt-4">
            Cross-chain swaps take ~2-10 seconds. You pay gas on the origin chain only.
          </p>
        </div>
      )}
    </div>
  );
}
