"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useAccount, useChainId, useSwitchChain, useWalletClient } from "wagmi";
import { parseUnits, formatUnits } from "viem";
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
};

const SWAP_FEE_BPS = "10"; // 0.1%
const SWAP_FEE_RECIPIENT = process.env.NEXT_PUBLIC_SWAP_FEE_RECIPIENT || "";

const TOKEN_DECIMALS: Record<string, number> = {
  USDC: 6,
  WETH: 18,
  WMATIC: 18,
};

const TOKEN_OPTIONS: Record<SupportedChainId, { address: `0x${string}`; symbol: string }[]> = {
  8453: [
    { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`, symbol: "USDC" },
    { address: "0x4200000000000000000000000000000000000006" as `0x${string}`, symbol: "WETH" },
  ],
  42161: [
    { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`, symbol: "USDC" },
    { address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as `0x${string}`, symbol: "WETH" },
  ],
  137: [
    { address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as `0x${string}`, symbol: "USDC" },
    { address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270" as `0x${string}`, symbol: "WMATIC" },
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
  const [sellAmount, setSellAmount] = useState("");
  const [quote, setQuote] = useState<GaslessQuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [swapStatus, setSwapStatus] = useState<"idle" | "signing" | "submitting" | "success" | "error">("idle");
  const [swapError, setSwapError] = useState<string | null>(null);
  const [tradeHash, setTradeHash] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

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

  const fetchQuote = useCallback(async () => {
    if (!address || !sellAmount || parseFloat(sellAmount) <= 0) return;
    setQuoteError(null);
    setQuote(null);
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
        ...feeParams,
      });
      if (res.liquidityAvailable) {
        setQuote(res);
      } else {
        setQuoteError("No liquidity available for this trade");
      }
    } catch (e) {
      setQuoteError(e instanceof Error ? e.message : "Failed to fetch quote");
    } finally {
      setQuoteLoading(false);
    }
  }, [address, supportedChainId, sellToken, buyToken, sellAmount, feeParams, tokens]);

  const executeSwap = useCallback(async () => {
    if (!quote || !address || !walletClient) return;
    setSwapStatus("signing");
    setSwapError(null);
    try {
      const tokenApprovalRequired = quote.issues?.allowance != null;
      const gaslessApprovalAvailable = quote.approval != null;

      let approvalDataToSubmit = null;

      if (tokenApprovalRequired && gaslessApprovalAvailable && quote.approval) {
        const approvalSig = await walletClient.signTypedData({
          account: address,
          domain: quote.approval.eip712.domain as object,
          types: quote.approval.eip712.types as object,
          primaryType: quote.approval.eip712.primaryType,
          message: quote.approval.eip712.message as object,
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

      const tradeSig = await walletClient.signTypedData({
        account: address,
        domain: quote.trade.eip712.domain as object,
        types: quote.trade.eip712.types as object,
        primaryType: quote.trade.eip712.primaryType,
        message: quote.trade.eip712.message as object,
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
        statusRes = await getGaslessStatus(hash, chainId);
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
  }, [quote, address, walletClient, chainId, supportedChainId]);

  const resetSwap = useCallback(() => {
    setSwapStatus("idle");
    setSwapError(null);
    setTradeHash(null);
    setTxHash(null);
  }, []);

  return (
    <div className="w-full max-w-md mx-auto rounded-2xl bg-zinc-900/80 border border-zinc-700/50 p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Gasless Swap</h2>
        <div className="flex gap-2">
          {supportedChains.map((ch) => (
            <button
              key={ch.id}
              onClick={() => switchChain?.({ chainId: ch.id })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                supportedChainId === ch.id
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                  : "bg-zinc-800 text-zinc-400 hover:text-white border border-transparent"
              }`}
            >
              {ch.name}
            </button>
          ))}
        </div>
      </div>

      {!isConnected ? (
        <div className="py-8 flex flex-col items-center gap-4">
          <p className="text-zinc-400 text-sm">Connect your wallet to swap</p>
          <ConnectButton />
        </div>
      ) : (
        <>
          <div className="space-y-4">
            <div className="rounded-xl bg-zinc-800/50 p-4 border border-zinc-700/30">
              <label className="text-xs text-zinc-500 block mb-2">You pay</label>
              <div className="flex justify-between items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.0"
                  value={sellAmount}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9.]/g, "");
                    setSellAmount(v);
                  }}
                  className="bg-transparent text-white text-xl font-medium w-full outline-none placeholder:text-zinc-600"
                />
                <select
                  value={sellToken}
                  onChange={(e) => setSellToken(e.target.value as `0x${string}`)}
                  className="bg-zinc-700/50 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600"
                >
                  {tokens.map((t) => (
                    <option key={t.address} value={t.address}>
                      {t.symbol}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-xl bg-zinc-800/50 p-4 border border-zinc-700/30">
              <label className="text-xs text-zinc-500 block mb-2">You receive</label>
              <div className="flex justify-between items-center gap-2">
                <span className="text-white text-xl font-medium">
                  {quote
                    ? formatUnits(
                        BigInt(quote.buyAmount),
                        TOKEN_DECIMALS[tokens.find((t) => t.address === buyToken)?.symbol ?? "WETH"] ?? 18
                      )
                    : "0.0"}
                </span>
                <select
                  value={buyToken}
                  onChange={(e) => setBuyToken(e.target.value as `0x${string}`)}
                  className="bg-zinc-700/50 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600"
                >
                  {tokens.map((t) => (
                    <option key={t.address} value={t.address}>
                      {t.symbol}
                    </option>
                  ))}
                </select>
              </div>
              {quote?.fees?.integratorFee && (
                <p className="text-xs text-zinc-500 mt-2">
                  Fee (0.1%): {formatUnits(BigInt(quote.fees.integratorFee.amount), 6)} {quote.route?.tokens?.[0]?.symbol}
                </p>
              )}
            </div>
          </div>

          {quoteError && (
            <p className="text-red-400 text-sm mt-2">{quoteError}</p>
          )}

          <div className="mt-6 flex flex-col gap-3">
            {swapStatus === "idle" && (
              <>
                <button
                  onClick={fetchQuote}
                  disabled={!sellAmount || parseFloat(sellAmount) <= 0 || quoteLoading}
                  className="w-full py-3 rounded-xl bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition"
                >
                  {quoteLoading ? "Getting quote..." : "Get Quote"}
                </button>
                {quote && (
                  <button
                    onClick={executeSwap}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition"
                  >
                    Sign & Swap (No Gas!)
                  </button>
                )}
              </>
            )}
            {(swapStatus === "signing" || swapStatus === "submitting") && (
              <p className="text-center text-amber-400 py-2">
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
                    className="block text-center text-sm text-emerald-400/80 hover:underline"
                  >
                    View on explorer
                  </a>
                )}
                <button
                  onClick={resetSwap}
                  className="w-full py-2 rounded-lg border border-zinc-600 text-zinc-400 hover:text-white text-sm"
                >
                  New Swap
                </button>
              </div>
            )}
            {swapStatus === "error" && (
              <div className="space-y-2">
                <p className="text-red-400 text-sm">{swapError}</p>
                <button
                  onClick={resetSwap}
                  className="w-full py-2 rounded-lg border border-zinc-600 text-zinc-400 hover:text-white text-sm"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>

          <p className="text-xs text-zinc-500 mt-4 text-center">
            Gasless swaps powered by 0x. Sign a message, no gas needed.
          </p>
        </>
      )}
    </div>
  );
}
