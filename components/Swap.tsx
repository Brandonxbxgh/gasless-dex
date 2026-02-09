"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useAccount, useChainId, useSwitchChain, useWalletClient } from "wagmi";
import { parseUnits, formatUnits, isAddress } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  getGaslessQuote,
  submitGaslessSwap,
  getGaslessStatus,
  type GaslessQuoteResponse,
} from "@/lib/api";
import { splitSignature, SignatureType } from "@/lib/signature";
import {
  supportedChains,
  WRAPPED_NATIVE,
  USDC_ADDRESS,
  type SupportedChainId,
} from "@/lib/chains";

const EXPLORER_URL: Record<SupportedChainId, string> = {
  8453: "https://basescan.org",
  42161: "https://arbiscan.io",
  137: "https://polygonscan.com",
  56: "https://bscscan.com",
  1: "https://etherscan.io",
};

const SWAP_FEE_BPS = "10";
const SWAP_FEE_RECIPIENT = process.env.NEXT_PUBLIC_SWAP_FEE_RECIPIENT || "";

function truncateAddress(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// Display as native names (ETH, BNB, MATIC); we still use wrapped token addresses for the API
const TOKEN_DECIMALS: Record<string, number> = {
  USDC: 6,
  USDT: 6,
  ETH: 18,
  MATIC: 18,
  BNB: 18,
};

// Stables (USDC, USDT) + native per chain so you can swap e.g. BNB ↔ USDT
const TOKEN_OPTIONS: Record<SupportedChainId, { address: `0x${string}`; symbol: string }[]> = {
  8453: [
    { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`, symbol: "USDC" },
    { address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2" as `0x${string}`, symbol: "USDT" },
    { address: "0x4200000000000000000000000000000000000006" as `0x${string}`, symbol: "ETH" },
  ],
  42161: [
    { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`, symbol: "USDC" },
    { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" as `0x${string}`, symbol: "USDT" },
    { address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as `0x${string}`, symbol: "ETH" },
  ],
  137: [
    { address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as `0x${string}`, symbol: "USDC" },
    { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" as `0x${string}`, symbol: "USDT" },
    { address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270" as `0x${string}`, symbol: "MATIC" },
  ],
  56: [
    { address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d" as `0x${string}`, symbol: "USDC" },
    { address: "0x55d398326f99059fF775485246999027B3197955" as `0x${string}`, symbol: "USDT" },
    { address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c" as `0x${string}`, symbol: "BNB" },
  ],
  1: [
    { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as `0x${string}`, symbol: "USDC" },
    { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7" as `0x${string}`, symbol: "USDT" },
    { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as `0x${string}`, symbol: "ETH" },
  ],
};

export function Swap() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const supportedChainId = supportedChains.some((c) => c.id === chainId)
    ? (chainId as SupportedChainId)
    : 8453;
  const { data: walletClient } = useWalletClient();

  const [sellToken, setSellToken] = useState<`0x${string}`>(
    () => USDC_ADDRESS[supportedChainId] || TOKEN_OPTIONS[8453][0].address
  );
  const [buyToken, setBuyToken] = useState<`0x${string}`>(
    () => WRAPPED_NATIVE[supportedChainId] || TOKEN_OPTIONS[8453][1].address
  );
  useEffect(() => {
    setSellToken(USDC_ADDRESS[supportedChainId] || TOKEN_OPTIONS[8453][0].address);
    setBuyToken(WRAPPED_NATIVE[supportedChainId] || TOKEN_OPTIONS[8453][1].address);
    setQuote(null);
  }, [supportedChainId]);

  // Refresh state when wallet connects or chain changes (fixes WalletConnect not updating)
  useEffect(() => {
    if (isConnected && address) {
      setQuote(null);
      setQuoteError(null);
      setReceiveUsd(null);
    }
  }, [isConnected, address]);

  const [sellAmount, setSellAmount] = useState("");
  const [quote, setQuote] = useState<GaslessQuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [swapStatus, setSwapStatus] = useState<"idle" | "signing" | "submitting" | "success" | "error">("idle");
  const [swapError, setSwapError] = useState<string | null>(null);
  const [tradeHash, setTradeHash] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [customRecipient, setCustomRecipient] = useState("");
  const [receiveUsd, setReceiveUsd] = useState<number | null>(null);

  useEffect(() => {
    if (!quote) setReceiveUsd(null);
  }, [quote]);

  const tokens = useMemo(
    () => TOKEN_OPTIONS[supportedChainId] ?? TOKEN_OPTIONS[8453],
    [supportedChainId]
  );

  const feeParams = useMemo(() => {
    if (!SWAP_FEE_RECIPIENT) return {};
    return {
      swapFeeBps: SWAP_FEE_BPS,
      swapFeeRecipient: SWAP_FEE_RECIPIENT,
      swapFeeToken: sellToken,
      tradeSurplusRecipient: SWAP_FEE_RECIPIENT,
    };
  }, [sellToken]);

  const receiveAddress = customRecipient.trim() && isAddress(customRecipient.trim())
    ? customRecipient.trim()
    : address ?? "";

  const fetchQuote = useCallback(async () => {
    if (!address || !sellAmount || parseFloat(sellAmount) <= 0) return;
    setQuoteError(null);
    setQuote(null);
    setReceiveUsd(null);
    setQuoteLoading(true);
    try {
      const sellSymbol = tokens.find((t) => t.address === sellToken)?.symbol ?? "USDC";
      const decimals = TOKEN_DECIMALS[sellSymbol] ?? 6;
      const amountWei = parseUnits(sellAmount, decimals).toString();
      const res = await getGaslessQuote({
        chainId: supportedChainId,
        sellToken,
        buyToken,
        sellAmount: amountWei,
        taker: address,
        recipient: receiveAddress && receiveAddress !== address ? receiveAddress : undefined,
        ...feeParams,
      });
      if (res.liquidityAvailable) {
        setQuote(res);
        try {
          const priceRes = await fetch(
            `/api/token-price?chainId=${supportedChainId}&address=${encodeURIComponent(buyToken)}`
          );
          const { usd } = (await priceRes.json()) as { usd?: number | null };
          if (typeof usd === "number" && usd > 0) {
            const buyDecimals = TOKEN_DECIMALS[tokens.find((t) => t.address === buyToken)?.symbol ?? "ETH"] ?? 18;
            const buyAmountHuman = Number(formatUnits(BigInt(res.buyAmount), buyDecimals));
            setReceiveUsd(buyAmountHuman * usd);
          }
        } catch {
          setReceiveUsd(null);
        }
      } else {
        setQuoteError("No liquidity available for this trade");
      }
    } catch (e) {
      setQuoteError(e instanceof Error ? e.message : "Failed to fetch quote");
    } finally {
      setQuoteLoading(false);
    }
  }, [address, supportedChainId, sellToken, buyToken, sellAmount, feeParams, tokens, receiveAddress]);

  const executeSwap = useCallback(async () => {
    if (!quote || !address || !walletClient) return;
    setSwapStatus("signing");
    setSwapError(null);
    try {
      const tokenApprovalRequired = quote.issues?.allowance != null;
      const gaslessApprovalAvailable = quote.approval != null;

      let approvalDataToSubmit = null;

      if (tokenApprovalRequired && gaslessApprovalAvailable && quote.approval) {
        const a = quote.approval.eip712;
        const approvalSig = await walletClient.signTypedData({
          account: address,
          domain: a.domain,
          types: a.types as Record<string, { name: string; type: string }[]>,
          primaryType: a.primaryType,
          message: a.message,
        });
        const split = splitSignature(approvalSig as `0x${string}`);
        approvalDataToSubmit = {
          type: quote.approval.type,
          eip712: quote.approval.eip712,
          signature: {
            ...split,
            signatureType: SignatureType.EIP712,
          },
        };
      } else if (tokenApprovalRequired && !gaslessApprovalAvailable) {
        setSwapError("This token requires a one-time approval. Please approve in your wallet first.");
        setSwapStatus("error");
        return;
      }

      const t = quote.trade.eip712;
      const tradeSig = await walletClient.signTypedData({
        account: address,
        domain: t.domain,
        types: t.types as Record<string, { name: string; type: string }[]>,
        primaryType: t.primaryType,
        message: t.message,
      });
      const tradeSplit = splitSignature(tradeSig as `0x${string}`);
      const tradeDataToSubmit = {
        type: quote.trade.type,
        eip712: quote.trade.eip712,
        signature: {
          ...tradeSplit,
          signatureType: SignatureType.EIP712,
        },
      };

      setSwapStatus("submitting");
      const { tradeHash: hash } = await submitGaslessSwap({
        trade: tradeDataToSubmit,
        approval: approvalDataToSubmit ?? undefined,
        chainId: supportedChainId,
      });
      setTradeHash(hash);

      let statusRes = await getGaslessStatus(hash, supportedChainId);
      let attempts = 0;
      while (statusRes.status !== "confirmed" && attempts < 20) {
        await new Promise((r) => setTimeout(r, 2000));
        statusRes = await getGaslessStatus(hash, supportedChainId);
        attempts++;
      }
      if (statusRes.status === "confirmed" && statusRes.transactionHash) {
        setTxHash(statusRes.transactionHash);
        setSwapStatus("success");
      } else {
        setSwapStatus("success");
      }
    } catch (e) {
      setSwapError(e instanceof Error ? e.message : "Swap failed");
      setSwapStatus("error");
    }
  }, [quote, address, walletClient, supportedChainId]);

  const resetSwap = useCallback(() => {
    setSwapStatus("idle");
    setSwapError(null);
    setTradeHash(null);
    setTxHash(null);
  }, []);

  const flipTokens = useCallback(() => {
    setSellToken(buyToken);
    setBuyToken(sellToken);
    setQuote(null);
  }, [sellToken, buyToken]);

  return (
    <div className="w-full max-w-md mx-auto rounded-2xl border border-[var(--delta-card-border)] p-4 sm:p-6 shadow-2xl bg-[var(--delta-card)] backdrop-blur-sm ring-1 ring-white/5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <h2 className="text-lg sm:text-xl font-semibold text-white">Swap</h2>
        <div className="flex flex-wrap gap-1.5">
          {supportedChains.map((ch) => (
            <button
              key={ch.id}
              onClick={() => switchChain?.({ chainId: ch.id })}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                supportedChainId === ch.id
                  ? "bg-indigo-500/40 text-indigo-200 border border-indigo-400/60 shadow-sm"
                  : "bg-slate-700/70 text-slate-300 hover:text-white hover:bg-slate-600/70 border border-slate-600/50"
              }`}
            >
              {ch.name}
            </button>
          ))}
        </div>
      </div>

      {!isConnected ? (
        <div className="py-8 flex flex-col items-center gap-4">
          <p className="text-[var(--delta-text-muted)] text-base font-medium">Connect your wallet to swap</p>
          <ConnectButton />
        </div>
      ) : (
        <div key={address ?? "connected"}>
        <>
          <div className="rounded-lg bg-slate-800/60 border border-slate-600/40 px-3 py-2 mb-4 space-y-1">
            <p className="text-xs text-slate-500">
              Connected: <span className="text-slate-300 font-mono">{address ? truncateAddress(address) : ""}</span>
            </p>
            <p className="text-xs text-slate-500">
              Receiving to: <span className="text-slate-300 font-mono">{receiveAddress ? truncateAddress(receiveAddress) : ""}</span>
            </p>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Send to different address (optional)</label>
              <input
                type="text"
                placeholder="0x..."
                value={customRecipient}
                onChange={(e) => {
                  setCustomRecipient(e.target.value);
                  setQuote(null);
                }}
                className="w-full bg-slate-700/80 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
              {customRecipient.trim() && !isAddress(customRecipient.trim()) && (
                <p className="text-xs text-amber-400 mt-1">Enter a valid EVM address</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {/* From row: amount + token dropdown */}
            <div className="rounded-xl bg-slate-800/80 p-3 sm:p-4 border border-slate-600/50">
              <label className="text-xs font-medium text-slate-400 block mb-2">From</label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.0"
                  value={sellAmount}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9.]/g, "");
                    setSellAmount(v);
                  }}
                  className="flex-1 min-w-0 bg-transparent text-white text-lg font-medium outline-none placeholder:text-slate-500 focus:ring-0"
                />
                <select
                  value={sellToken}
                  onChange={(e) => {
                    setSellToken(e.target.value as `0x${string}`);
                    setQuote(null);
                  }}
                  className="bg-slate-700 text-white rounded-lg px-3 py-2 text-sm font-medium border border-slate-600 min-w-[5rem] sm:min-w-[6rem] cursor-pointer focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  aria-label="Select token to sell"
                >
                  {tokens.map((t) => (
                    <option key={t.address} value={t.address}>
                      {t.symbol}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Flip button */}
            <div className="flex justify-center -my-1">
              <button
                type="button"
                onClick={flipTokens}
                className="p-1.5 rounded-full bg-slate-700 hover:bg-indigo-500/30 border border-slate-600 hover:border-indigo-400/50 text-slate-300 hover:text-indigo-300 transition"
                aria-label="Swap from and to"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
            </div>

            {/* To row: amount + token dropdown */}
            <div className="rounded-xl bg-slate-800/80 p-3 sm:p-4 border border-slate-600/50">
              <label className="text-xs font-medium text-slate-400 block mb-2">To</label>
              <div className="flex gap-2 items-center">
                <span className="flex-1 min-w-0 text-white text-lg font-medium truncate">
                  {quote
                    ? formatUnits(
                        BigInt(quote.buyAmount),
                        TOKEN_DECIMALS[tokens.find((t) => t.address === buyToken)?.symbol ?? "ETH"] ?? 18
                      )
                    : "0.0"}
                </span>
                <select
                  value={buyToken}
                  onChange={(e) => {
                    setBuyToken(e.target.value as `0x${string}`);
                    setQuote(null);
                  }}
                  className="bg-slate-700 text-white rounded-lg px-3 py-2 text-sm font-medium border border-slate-600 min-w-[5rem] sm:min-w-[6rem] cursor-pointer focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  aria-label="Select token to receive"
                >
                  {tokens.map((t) => (
                    <option key={t.address} value={t.address}>
                      {t.symbol}
                    </option>
                  ))}
                </select>
              </div>
              {quote?.fees?.integratorFee && (
                <p className="text-xs text-slate-400 mt-2">
                  Fee (0.1%): {formatUnits(BigInt(quote.fees.integratorFee.amount), 6)} {tokens.find((t) => t.address === sellToken)?.symbol}
                </p>
              )}
              {receiveUsd != null && receiveUsd > 0 && (
                <p className="text-sm text-emerald-400/90 font-medium mt-2">
                  ≈ ${receiveUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </p>
              )}
            </div>
          </div>

          {quoteError && (
            <p className="text-red-400 text-sm font-medium mt-2 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">{quoteError}</p>
          )}

          <div className="mt-5 flex flex-col gap-3">
            {swapStatus === "idle" && (
              <>
                <button
                  onClick={fetchQuote}
                  disabled={!sellAmount || parseFloat(sellAmount) <= 0 || quoteLoading}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition"
                >
                  {quoteLoading ? "Getting quote..." : "Get Quote"}
                </button>
                {quote && (
                  <button
                    onClick={executeSwap}
                    className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold transition"
                  >
                    Sign & Swap (No Gas!)
                  </button>
                )}
              </>
            )}
            {(swapStatus === "signing" || swapStatus === "submitting") && (
              <p className="text-center text-amber-300 font-medium py-2 text-sm">
                {swapStatus === "signing" ? "Check your wallet to sign..." : "Submitting..."}
              </p>
            )}
            {swapStatus === "success" && (
              <div className="space-y-2">
                <p className="text-emerald-400 text-center font-medium">Swap complete!</p>
                {txHash && (
                  <a
                    href={`${EXPLORER_URL[supportedChainId] || "https://basescan.org"}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center text-sm text-cyan-400 hover:underline"
                  >
                    View on explorer
                  </a>
                )}
                <button
                  onClick={resetSwap}
                  className="w-full py-2 rounded-lg border border-slate-600 text-slate-300 hover:text-white text-sm font-medium"
                >
                  New Swap
                </button>
              </div>
            )}
            {swapStatus === "error" && (
              <div className="space-y-2">
                <p className="text-red-400 text-sm font-medium">{swapError}</p>
                <button
                  onClick={resetSwap}
                  className="w-full py-2 rounded-lg border border-slate-600 text-slate-300 hover:text-white text-sm font-medium"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 mt-3 text-center">
            EVM wallets only. Tokens you sell leave your connected wallet; tokens you receive are sent to the address above (or your wallet if no custom address).
          </p>
          <p className="text-sm text-slate-400 mt-2 text-center">
            Gasless by DeltaChainLabs · Powered by 0x
          </p>
        </>
        </div>
      )}
    </div>
  );
}
