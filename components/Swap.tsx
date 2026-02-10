"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useAccount, useChainId, useSwitchChain, useWalletClient } from "wagmi";
import { parseUnits, formatUnits, isAddress, maxUint256 } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  getGaslessQuote,
  getSwapQuote,
  submitGaslessSwap,
  getGaslessStatus,
  NATIVE_TOKEN_ADDRESS,
  type GaslessQuoteResponse,
  type SwapQuoteResponse,
} from "@/lib/api";
import { splitSignature, SignatureType } from "@/lib/signature";
import {
  supportedChains,
  WRAPPED_NATIVE,
  getDefaultSellToken,
  type SupportedChainId,
} from "@/lib/chains";

const ERC20_APPROVE_ABI = [
  { inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], name: "approve", outputs: [{ type: "bool" }], stateMutability: "nonpayable", type: "function" },
] as const;

const NATIVE_SYMBOL_BY_CHAIN: Record<SupportedChainId, string> = {
  8453: "ETH",
  42161: "ETH",
  137: "MATIC",
  56: "BNB",
  1: "ETH",
};

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

// Base decimals per symbol (most chains use these)
const TOKEN_DECIMALS: Record<string, number> = {
  USDC: 6,
  USDT: 6,
  ETH: 18,
  MATIC: 18,
  BNB: 18,
};

// BNB Chain USDT is 18 decimals (Binance-Peg BSC-USD); other chains use 6 for USDT
function getTokenDecimals(symbol: string, chainId: SupportedChainId): number {
  if (chainId === 56 && symbol === "USDT") return 18;
  return TOKEN_DECIMALS[symbol] ?? 18;
}

// Only native/supported tokens per chain (no bridged tokens; BNB has no native USDC)
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
    { address: "0x55d398326f99059fF775485246999027B3197955" as `0x${string}`, symbol: "USDT" },
    { address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c" as `0x${string}`, symbol: "BNB" },
  ],
  1: [
    { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as `0x${string}`, symbol: "USDC" },
    { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7" as `0x${string}`, symbol: "USDT" },
    { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as `0x${string}`, symbol: "ETH" },
  ],
};

// Minimum sell amount (0x rejects tiny amounts): 1 for 6-decimals, 0.001 for 18
const MIN_SELL_AMOUNT: Record<string, number> = {
  USDC: 1,
  USDT: 1,
  ETH: 0.001,
  MATIC: 0.001,
  BNB: 0.001,
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
    () => getDefaultSellToken(supportedChainId)
  );
  const [buyToken, setBuyToken] = useState<`0x${string}`>(
    () => WRAPPED_NATIVE[supportedChainId] || TOKEN_OPTIONS[8453][1].address
  );
  useEffect(() => {
    setSellToken(getDefaultSellToken(supportedChainId));
    setBuyToken(WRAPPED_NATIVE[supportedChainId] || TOKEN_OPTIONS[8453][1].address);
    setQuote(null);
    setSwapQuote(null);
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
  const [swapQuote, setSwapQuote] = useState<SwapQuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [swapStatus, setSwapStatus] = useState<"idle" | "signing" | "submitting" | "success" | "error">("idle");
  const [swapError, setSwapError] = useState<string | null>(null);
  const [tradeHash, setTradeHash] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [customRecipient, setCustomRecipient] = useState("");
  const [receiveUsd, setReceiveUsd] = useState<number | null>(null);
  const [needsManualApproval, setNeedsManualApproval] = useState(false);
  const [approvingInProgress, setApprovingInProgress] = useState(false);

  useEffect(() => {
    if (!quote && !swapQuote) setReceiveUsd(null);
  }, [quote, swapQuote]);

  const isSellingNative = sellToken === WRAPPED_NATIVE[supportedChainId];

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

  const sellSymbol = tokens.find((t) => t.address === sellToken)?.symbol ?? "USDC";
  const minSellAmount = MIN_SELL_AMOUNT[sellSymbol] ?? 1;
  const amountNum = sellAmount ? parseFloat(sellAmount) : 0;
  const isBelowMin = amountNum > 0 && amountNum < minSellAmount;

  const fetchQuote = useCallback(async () => {
    if (!address || !sellAmount || parseFloat(sellAmount) <= 0) return;
    const sellSymbol = tokens.find((t) => t.address === sellToken)?.symbol ?? "USDC";
    const minAmount = MIN_SELL_AMOUNT[sellSymbol] ?? 1;
    const amountNum = parseFloat(sellAmount);
    if (amountNum < minAmount) {
      setQuoteError(`Minimum sell amount is ${minAmount} ${sellSymbol}. Try at least ${minAmount} ${sellSymbol} or check your wallet balance.`);
      setQuote(null);
      setSwapQuote(null);
      return;
    }
    setQuoteError(null);
    setQuote(null);
    setSwapQuote(null);
    setReceiveUsd(null);
    setQuoteLoading(true);
    try {
      const decimals = getTokenDecimals(sellSymbol, supportedChainId);
      const amountWei = parseUnits(sellAmount, decimals).toString();

      if (isSellingNative) {
        const res = await getSwapQuote({
          chainId: supportedChainId,
          sellToken: NATIVE_TOKEN_ADDRESS,
          buyToken,
          sellAmount: amountWei,
          taker: address,
          recipient: receiveAddress && receiveAddress !== address ? receiveAddress : undefined,
          swapFeeBps: feeParams.swapFeeBps,
          swapFeeRecipient: feeParams.swapFeeRecipient,
          swapFeeToken: buyToken,
          tradeSurplusRecipient: feeParams.tradeSurplusRecipient,
          slippageBps: 100,
        });
        if (res.liquidityAvailable && res.transaction) {
          setSwapQuote(res);
          try {
            const priceRes = await fetch(
              `/api/token-price?chainId=${supportedChainId}&address=${encodeURIComponent(buyToken)}`
            );
            const { usd } = (await priceRes.json()) as { usd?: number | null };
            if (typeof usd === "number" && usd > 0) {
              const buySymbolForDecimals = tokens.find((t) => t.address === buyToken)?.symbol ?? "ETH";
              const buyDecimals = getTokenDecimals(buySymbolForDecimals, supportedChainId);
              const buyAmountHuman = Number(formatUnits(BigInt(res.buyAmount), buyDecimals));
              setReceiveUsd(buyAmountHuman * usd);
            }
          } catch {
            setReceiveUsd(null);
          }
        } else {
          setQuoteError("No liquidity available for this trade");
        }
      } else {
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
              const buySymbolForDecimals = tokens.find((t) => t.address === buyToken)?.symbol ?? "ETH";
              const buyDecimals = getTokenDecimals(buySymbolForDecimals, supportedChainId);
              const buyAmountHuman = Number(formatUnits(BigInt(res.buyAmount), buyDecimals));
              setReceiveUsd(buyAmountHuman * usd);
            }
          } catch {
            setReceiveUsd(null);
          }
        } else {
          setQuoteError("No liquidity available for this trade");
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to fetch quote";
      const lower = msg.toLowerCase();
      const isAmountOrBalanceError =
        lower.includes("insufficient balance") ||
        lower.includes("sell amount too small") ||
        lower.includes("provided sell amount too small");
      if (isAmountOrBalanceError && amountNum < minAmount) {
        setQuoteError(`Sell at least ${minAmount} ${sellSymbol} (you entered ${sellAmount}). Check your wallet balance.`);
      } else if (
        (lower.includes("sell amount too small") || lower.includes("provided sell amount too small")) &&
        amountNum >= minAmount
      ) {
        const onBnb = supportedChainId === 56;
        setQuoteError(
          onBnb
            ? "On BNB Smart Chain the protocol requires a higher minimum for gasless swaps (try $50–100+ USDT), or use Ethereum/Base/Arbitrum for smaller amounts."
            : "The protocol requires a larger minimum for this pair on this network. Try a higher amount, or use Ethereum/Base/Arbitrum where smaller trades may be supported."
        );
      } else if (lower.includes("insufficient balance") && isSellingNative) {
        const nativeName = NATIVE_SYMBOL_BY_CHAIN[supportedChainId] ?? "ETH";
        setQuoteError(`You don't have enough ${nativeName} for this trade. Check your wallet balance.`);
      } else {
        setQuoteError(msg);
      }
    } finally {
      setQuoteLoading(false);
    }
  }, [address, supportedChainId, sellToken, buyToken, sellAmount, feeParams, tokens, receiveAddress, isSellingNative]);

  type ApprovalPayload = {
    type: string;
    eip712: { types: Record<string, { name: string; type: string }[]>; domain: Record<string, unknown>; message: Record<string, unknown>; primaryType: string };
    signature: { r: string; s: string; v: number; signatureType: number };
  };

  const signAndSubmitTrade = useCallback(
    async (approvalDataToSubmit: ApprovalPayload | null) => {
      if (!quote || !address || !walletClient) return;
      setSwapStatus("signing");
      setSwapError(null);
      try {
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
    },
    [quote, address, walletClient, supportedChainId]
  );

  const doApprove = useCallback(async () => {
    if (!quote?.issues?.allowance || !walletClient || !address) return;
    const spender = quote.issues.allowance.spender as `0x${string}`;
    setApprovingInProgress(true);
    setSwapError(null);
    setSwapStatus("signing");
    try {
      await walletClient.writeContract({
        address: sellToken,
        abi: ERC20_APPROVE_ABI,
        functionName: "approve",
        args: [spender, maxUint256],
      });
      setNeedsManualApproval(false);
      await signAndSubmitTrade(null);
    } catch (e) {
      setSwapError(e instanceof Error ? e.message : "Approval failed");
      setSwapStatus("error");
    } finally {
      setApprovingInProgress(false);
    }
  }, [quote, walletClient, address, sellToken, signAndSubmitTrade]);

  const executeSwap = useCallback(async () => {
    if ((!quote && !swapQuote) || !address || !walletClient) return;
    setSwapStatus("signing");
    setSwapError(null);
    setNeedsManualApproval(false);
    try {
      if (swapQuote?.transaction) {
        const tx = swapQuote.transaction;
        const hash = await walletClient.sendTransaction({
          to: tx.to as `0x${string}`,
          data: tx.data as `0x${string}`,
          value: BigInt(tx.value),
          gas: tx.gas ? BigInt(tx.gas) : undefined,
          gasPrice: tx.gasPrice ? BigInt(tx.gasPrice) : undefined,
        });
        setTxHash(hash);
        setSwapStatus("success");
        return;
      }
      const tokenApprovalRequired = quote!.issues?.allowance != null;
      const gaslessApprovalAvailable = quote!.approval != null;

      let approvalDataToSubmit: ApprovalPayload | null = null;

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
        setNeedsManualApproval(true);
        setSwapError(
          "This token needs a one-time approval (you’ll pay gas once). Click “Approve” below, then sign in your wallet."
        );
        setSwapStatus("error");
        return;
      }

      await signAndSubmitTrade(approvalDataToSubmit);
    } catch (e) {
      setSwapError(e instanceof Error ? e.message : "Swap failed");
      setSwapStatus("error");
    }
  }, [quote, swapQuote, address, walletClient, signAndSubmitTrade]);

  const resetSwap = useCallback(() => {
    setSwapStatus("idle");
    setSwapError(null);
    setTradeHash(null);
    setTxHash(null);
    setNeedsManualApproval(false);
    setSwapQuote(null);
  }, []);

  const flipTokens = useCallback(() => {
    setSellToken(buyToken);
    setBuyToken(sellToken);
    setQuote(null);
    setSwapQuote(null);
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
                  {(quote || swapQuote)
                    ? formatUnits(
                        BigInt((quote ?? swapQuote)!.buyAmount),
                        getTokenDecimals(tokens.find((t) => t.address === buyToken)?.symbol ?? "ETH", supportedChainId)
                      )
                    : "0.0"}
                </span>
                <select
                  value={buyToken}
                  onChange={(e) => {
                    setBuyToken(e.target.value as `0x${string}`);
                    setQuote(null);
                    setSwapQuote(null);
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
              {(quote?.fees?.integratorFee || swapQuote?.fees?.integratorFee) && (
                <p className="text-xs text-slate-400 mt-2">
                  Fee (0.1%): {quote?.fees?.integratorFee
                    ? `${formatUnits(BigInt(quote.fees.integratorFee.amount), getTokenDecimals(sellSymbol, supportedChainId))} ${sellSymbol}`
                    : swapQuote?.fees?.integratorFee
                      ? `${formatUnits(BigInt(swapQuote.fees.integratorFee.amount), getTokenDecimals(tokens.find((t) => t.address === buyToken)?.symbol ?? "ETH", supportedChainId))} ${tokens.find((t) => t.address === buyToken)?.symbol ?? ""}`
                      : ""}
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
                {isBelowMin && (
                  <p className="text-amber-400 text-sm">Minimum sell amount: {minSellAmount} {sellSymbol}</p>
                )}
                <button
                  onClick={fetchQuote}
                  disabled={!sellAmount || amountNum <= 0 || quoteLoading || isBelowMin}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition"
                >
                  {quoteLoading ? "Getting quote..." : "Get Quote"}
                </button>
                {(quote || swapQuote) && (
                  <button
                    onClick={executeSwap}
                    className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold transition"
                  >
                    {swapQuote ? "Sign & Swap (you pay gas)" : "Sign & Swap (No Gas!)"}
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
                <div className="flex flex-col gap-2">
                  {needsManualApproval && quote?.issues?.allowance && (
                    <button
                      onClick={doApprove}
                      disabled={approvingInProgress}
                      className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-semibold"
                    >
                      {approvingInProgress ? "Check your wallet…" : `Approve ${sellSymbol} (pay gas once)`}
                    </button>
                  )}
                  <button
                    onClick={resetSwap}
                    className="w-full py-2 rounded-lg border border-slate-600 text-slate-300 hover:text-white text-sm font-medium"
                  >
                    Try Again
                  </button>
                </div>
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
