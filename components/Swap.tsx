"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useAccount, useChainId, useSwitchChain, useWalletClient, usePublicClient, useDisconnect, useReadContract, useBalance } from "wagmi";
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
import { addToHistory } from "@/lib/history";

const ERC20_APPROVE_ABI = [
  { inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], name: "approve", outputs: [{ type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

const WETH_WITHDRAW_ABI = [
  { inputs: [{ name: "wad", type: "uint256" }], name: "withdraw", outputs: [], stateMutability: "nonpayable", type: "function" },
] as const;

const NATIVE_SYMBOL_BY_CHAIN: Record<SupportedChainId, string> = {
  8453: "ETH",
  42161: "ETH",
  137: "MATIC",
  56: "BNB",
  1: "ETH",
};

const CHAIN_NAME: Record<SupportedChainId, string> = {
  8453: "Base",
  42161: "Arbitrum",
  137: "Polygon",
  56: "BNB",
  1: "Ethereum",
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

/** Prefer fee in stablecoin (USDC/USDT); otherwise use buy token, else sell token */
function getPreferredFeeToken(
  sellToken: `0x${string}`,
  buyToken: `0x${string}`,
  tokens: { address: `0x${string}`; symbol: string }[]
): `0x${string}` {
  const sellSym = tokens.find((t) => t.address === sellToken)?.symbol;
  const buySym = buyToken === NATIVE_TOKEN_ADDRESS ? undefined : tokens.find((t) => t.address === buyToken)?.symbol;
  const isStable = (s: string | undefined) => s === "USDC" || s === "USDT";
  if (isStable(buySym)) return buyToken;
  if (isStable(sellSym)) return sellToken;
  return buyToken !== NATIVE_TOKEN_ADDRESS ? buyToken : sellToken;
}

/** 0x Allowance Holder (same on BNB, Ethereum, Base, etc.) - used when 0x doesn't return issues.allowance */
const ALLOWANCE_HOLDER = "0x0000000000001fF3684f28c67538d4D072C22734" as const;

function truncateAddress(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// Base decimals per symbol (wrapped natives shown as WETH/WBNB/WMATIC in UI)
const TOKEN_DECIMALS: Record<string, number> = {
  USDC: 6,
  USDT: 6,
  WETH: 18,
  WBNB: 18,
  WMATIC: 18,
  ETH: 18,
  MATIC: 18,
  BNB: 18,
};

// BNB Chain USDT is 18 decimals (Binance-Peg BSC-USD); other chains use 6 for USDT
function getTokenDecimals(symbol: string, chainId: SupportedChainId): number {
  if (chainId === 56 && symbol === "USDT") return 18;
  return TOKEN_DECIMALS[symbol] ?? 18;
}

// Only native/supported tokens per chain; wrapped natives labeled as WETH/WBNB/WMATIC (gasless gives wrapped, not native)
const TOKEN_OPTIONS: Record<SupportedChainId, { address: `0x${string}`; symbol: string }[]> = {
  8453: [
    { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`, symbol: "USDC" },
    { address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2" as `0x${string}`, symbol: "USDT" },
    { address: "0x4200000000000000000000000000000000000006" as `0x${string}`, symbol: "WETH" },
  ],
  42161: [
    { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`, symbol: "USDC" },
    { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" as `0x${string}`, symbol: "USDT" },
    { address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as `0x${string}`, symbol: "WETH" },
  ],
  137: [
    { address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as `0x${string}`, symbol: "USDC" },
    { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" as `0x${string}`, symbol: "USDT" },
    { address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270" as `0x${string}`, symbol: "WMATIC" },
  ],
  56: [
    { address: "0x55d398326f99059fF775485246999027B3197955" as `0x${string}`, symbol: "USDT" },
    { address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c" as `0x${string}`, symbol: "WBNB" },
  ],
  1: [
    { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as `0x${string}`, symbol: "USDC" },
    { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7" as `0x${string}`, symbol: "USDT" },
    { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as `0x${string}`, symbol: "WETH" },
  ],
};

// Minimum sell amount (0x rejects tiny amounts): 1 for 6-decimals, 0.001 for 18
const MIN_SELL_AMOUNT: Record<string, number> = {
  USDC: 1,
  USDT: 1,
  WETH: 0.001,
  WBNB: 0.001,
  WMATIC: 0.001,
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
  const publicClient = usePublicClient();
  const { disconnect } = useDisconnect();

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
  const [amountMode, setAmountMode] = useState<"token" | "usd">("token");
  const [usdInput, setUsdInput] = useState("");
  const [quote, setQuote] = useState<GaslessQuoteResponse | null>(null);
  const [swapQuote, setSwapQuote] = useState<SwapQuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [swapStatus, setSwapStatus] = useState<"idle" | "signing" | "submitting" | "success" | "error">("idle");
  const [swapError, setSwapError] = useState<string | null>(null);
  const [tradeHash, setTradeHash] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [customRecipient, setCustomRecipient] = useState("");
  const [showCustomRecipient, setShowCustomRecipient] = useState(false);
  const [receiveUsd, setReceiveUsd] = useState<number | null>(null);
  const [needsManualApproval, setNeedsManualApproval] = useState(false);
  const [approvingInProgress, setApprovingInProgress] = useState(false);

  useEffect(() => {
    if (!quote && !swapQuote) setReceiveUsd(null);
  }, [quote, swapQuote]);

  const isSellingNative = sellToken === WRAPPED_NATIVE[supportedChainId];
  const isBuyingNative = buyToken === NATIVE_TOKEN_ADDRESS;
  const isUnwrap = sellToken === WRAPPED_NATIVE[supportedChainId] && buyToken === NATIVE_TOKEN_ADDRESS;

  const tokens = useMemo(
    () => TOKEN_OPTIONS[supportedChainId] ?? TOKEN_OPTIONS[8453],
    [supportedChainId]
  );

  const sellSymbolForLogic = tokens.find((t) => t.address === sellToken)?.symbol ?? "USDC";

  const { data: sellBalanceRaw } = useReadContract({
    address: sellToken,
    abi: ERC20_APPROVE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  const { data: nativeBalance } = useBalance({ address: buyToken === NATIVE_TOKEN_ADDRESS ? address : undefined });

  const { data: buyBalanceRaw } = useReadContract({
    address: buyToken !== NATIVE_TOKEN_ADDRESS ? buyToken : undefined,
    abi: ERC20_APPROVE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  const sellBalanceFormatted = useMemo(() => {
    if (!sellBalanceRaw || typeof sellBalanceRaw !== "bigint") return null;
    const dec = getTokenDecimals(sellSymbolForLogic, supportedChainId);
    return formatUnits(sellBalanceRaw, dec);
  }, [sellBalanceRaw, sellSymbolForLogic, supportedChainId]);

  const buySymbolForDisplay = buyToken === NATIVE_TOKEN_ADDRESS
    ? (NATIVE_SYMBOL_BY_CHAIN[supportedChainId] ?? "ETH")
    : (tokens.find((t) => t.address === buyToken)?.symbol ?? "?");

  const buyBalanceFormatted = useMemo(() => {
    if (buyToken === NATIVE_TOKEN_ADDRESS && nativeBalance?.value != null) {
      return formatUnits(nativeBalance.value, 18);
    }
    if (buyBalanceRaw != null && typeof buyBalanceRaw === "bigint") {
      const sym = tokens.find((t) => t.address === buyToken)?.symbol ?? "ETH";
      return formatUnits(buyBalanceRaw, getTokenDecimals(sym, supportedChainId));
    }
    return null;
  }, [buyToken, nativeBalance?.value, buyBalanceRaw, tokens, supportedChainId]);

  const handleMaxClick = useCallback(() => {
    if (!sellBalanceFormatted) return;
    const amt = parseFloat(sellBalanceFormatted);
    if (amt <= 0) return;
    setSellAmount(sellBalanceFormatted);
    setQuote(null);
    setSwapQuote(null);
  }, [sellBalanceFormatted]);

  const buyTokenOptions = useMemo(() => [
    ...tokens,
    { address: NATIVE_TOKEN_ADDRESS as `0x${string}`, symbol: NATIVE_SYMBOL_BY_CHAIN[supportedChainId] ?? "ETH", isNative: true as const },
  ], [tokens, supportedChainId]);

  const sellTokenOptions = tokens;

  const [sellTokenPriceUsd, setSellTokenPriceUsd] = useState<number | null>(null);
  useEffect(() => {
    const addr = isSellingNative ? WRAPPED_NATIVE[supportedChainId] : sellToken;
    if (!addr) return;
    fetch(`/api/token-price?chainId=${supportedChainId}&address=${encodeURIComponent(addr)}`)
      .then((r) => r.json())
      .then((d: { usd?: number | null }) => setSellTokenPriceUsd(typeof d?.usd === "number" ? d.usd : null))
      .catch(() => setSellTokenPriceUsd(null));
  }, [supportedChainId, sellToken, isSellingNative]);

  const feeParams = useMemo(() => {
    if (!SWAP_FEE_RECIPIENT) return {};
    const preferredFeeToken = getPreferredFeeToken(sellToken, buyToken, tokens);
    return {
      swapFeeBps: SWAP_FEE_BPS,
      swapFeeRecipient: SWAP_FEE_RECIPIENT,
      swapFeeToken: preferredFeeToken,
      tradeSurplusRecipient: SWAP_FEE_RECIPIENT,
    };
  }, [sellToken, buyToken, tokens]);

  const receiveAddress = customRecipient.trim() && isAddress(customRecipient.trim())
    ? customRecipient.trim()
    : address ?? "";

  const displaySellSymbol = isUnwrap
    ? (supportedChainId === 56 ? "WBNB" : supportedChainId === 137 ? "WMATIC" : "WETH")
    : (isSellingNative ? (NATIVE_SYMBOL_BY_CHAIN[supportedChainId] ?? "ETH") : sellSymbolForLogic);
  const sellSymbol = displaySellSymbol;
  const minSellAmount = MIN_SELL_AMOUNT[sellSymbolForLogic] ?? 1;
  const effectiveSellAmount = amountMode === "usd" && usdInput
    ? (() => {
        const price = sellTokenPriceUsd;
        if (!price || price <= 0) return "";
        const amt = parseFloat(usdInput) / price;
        return amt > 0 ? String(amt) : "";
      })()
    : sellAmount;
  const amountNum = effectiveSellAmount ? parseFloat(effectiveSellAmount) : 0;
  const isBelowMin = amountNum > 0 && amountNum < minSellAmount;

  const fetchQuote = useCallback(async () => {
    let amountToUse: number;
    if (amountMode === "usd" && usdInput) {
      let price = sellTokenPriceUsd;
      if (!price || price <= 0) {
        try {
          const addr = isSellingNative ? WRAPPED_NATIVE[supportedChainId] : sellToken;
          const r = await fetch(`/api/token-price?chainId=${supportedChainId}&address=${encodeURIComponent(addr!)}`);
          const d = (await r.json()) as { usd?: number | null };
          price = typeof d?.usd === "number" ? d.usd : 0;
          if (price > 0) setSellTokenPriceUsd(price);
        } catch {
          price = 0;
        }
        if (!price || price <= 0) {
          setQuoteError("Unable to get token price for USD conversion. Try token amount mode.");
          return;
        }
      }
      amountToUse = parseFloat(usdInput) / price;
    } else {
      amountToUse = parseFloat(sellAmount);
    }
    if (!address || !(amountMode === "usd" ? usdInput : sellAmount) || amountToUse <= 0) return;
    const sellSymbolForLogic = tokens.find((t) => t.address === sellToken)?.symbol ?? "USDC";
    const minAmount = MIN_SELL_AMOUNT[sellSymbolForLogic] ?? 1;
    const amountNum = amountToUse;
    if (amountNum < minAmount) {
      const displaySym = isSellingNative ? (NATIVE_SYMBOL_BY_CHAIN[supportedChainId] ?? "ETH") : sellSymbolForLogic;
      setQuoteError(`Minimum sell amount is ${minAmount} ${displaySym}. Try at least ${minAmount} ${displaySym} or check your wallet balance.`);
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
      const decimals = getTokenDecimals(sellSymbolForLogic, supportedChainId);
      const amountWei = parseUnits(String(amountToUse), decimals).toString();

      // Use Swap API for native ETH trades (gasless API may not support native)
      const useSwapApi = isSellingNative || isBuyingNative;
      if (useSwapApi) {
        const res = await getSwapQuote({
          chainId: supportedChainId,
          sellToken: isSellingNative ? NATIVE_TOKEN_ADDRESS : sellToken,
          buyToken: isBuyingNative ? NATIVE_TOKEN_ADDRESS : buyToken,
          sellAmount: amountWei,
          taker: address,
          recipient: receiveAddress && receiveAddress !== address ? receiveAddress : undefined,
          swapFeeBps: feeParams.swapFeeBps,
          swapFeeRecipient: feeParams.swapFeeRecipient,
          swapFeeToken: feeParams.swapFeeToken ?? (isSellingNative ? buyToken : sellToken),
          tradeSurplusRecipient: feeParams.tradeSurplusRecipient,
          slippageBps: 100,
        });
        if (res.liquidityAvailable && res.transaction) {
          const buyDecimals = isBuyingNative ? 18 : getTokenDecimals(tokens.find((t) => t.address === buyToken)?.symbol ?? "ETH", supportedChainId);
          const buyAmountHuman = Number(formatUnits(BigInt(res.buyAmount), buyDecimals));
          setSwapQuote(res);
          try {
            const priceAddress = isBuyingNative ? WRAPPED_NATIVE[supportedChainId] : buyToken;
            const priceRes = await fetch(
              `/api/token-price?chainId=${supportedChainId}&address=${encodeURIComponent(priceAddress)}`
            );
            const { usd } = (await priceRes.json()) as { usd?: number | null };
            if (typeof usd === "number" && usd > 0) {
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
        const displaySym = isSellingNative ? (NATIVE_SYMBOL_BY_CHAIN[supportedChainId] ?? "ETH") : sellSymbolForLogic;
        const entered = amountMode === "usd" ? `$${usdInput}` : sellAmount;
        setQuoteError(`Sell at least ${minAmount} ${displaySym} (you entered ${entered}). Check your wallet balance.`);
      } else if (
        (lower.includes("sell amount too small") || lower.includes("provided sell amount too small")) &&
        amountNum >= minAmount
      ) {
        const onBnb = supportedChainId === 56;
        setQuoteError(
          onBnb
            ? "On BNB Smart Chain the protocol requires a higher minimum for gasless swaps (try $50-100+ USDT), or use Ethereum/Base/Arbitrum for smaller amounts."
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
  }, [address, supportedChainId, sellToken, buyToken, sellAmount, usdInput, amountMode, sellTokenPriceUsd, feeParams, tokens, receiveAddress, isSellingNative, isBuyingNative]);

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
          addToHistory({
            chainId: supportedChainId,
            chainName: CHAIN_NAME[supportedChainId] ?? "Unknown",
            txHash: statusRes.transactionHash,
            tradeHash: hash,
            sellSymbol: sellSymbol,
            buySymbol: buyToken === NATIVE_TOKEN_ADDRESS ? (NATIVE_SYMBOL_BY_CHAIN[supportedChainId] ?? "ETH") : (tokens.find((t) => t.address === buyToken)?.symbol ?? "?"),
            sellAmount: formatUnits(BigInt(quote.sellAmount), getTokenDecimals(sellSymbolForLogic, supportedChainId)),
            buyAmount: formatUnits(BigInt(quote.buyAmount), buyToken === NATIVE_TOKEN_ADDRESS ? 18 : getTokenDecimals(tokens.find((t) => t.address === buyToken)?.symbol ?? "ETH", supportedChainId)),
          });
          setSwapStatus("success");
        } else {
          setSwapStatus("success");
        }
      } catch (e) {
        setSwapError(e instanceof Error ? e.message : "Swap failed");
        setSwapStatus("error");
      }
    },
    [quote, address, walletClient, supportedChainId, sellSymbol, buyToken, tokens, sellSymbolForLogic]
  );

  const doApprove = useCallback(async () => {
    if (!quote || !walletClient || !address) return;
    const spender = (quote.issues?.allowance?.spender ?? ALLOWANCE_HOLDER) as `0x${string}`;
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
      setSwapError(null);
      setSwapStatus("signing");
      await signAndSubmitTrade(null);
    } catch (e) {
      setSwapError(e instanceof Error ? e.message : "Approval failed");
      setSwapStatus("error");
    } finally {
      setApprovingInProgress(false);
    }
  }, [quote, walletClient, address, sellToken, signAndSubmitTrade]);

  const doApproveForSwapQuote = useCallback(async () => {
    if (!swapQuote?.transaction?.to || !walletClient || !address) return;
    // 0x: use allowanceTarget or issues.allowance.spender - never Settler, only AllowanceHolder
    const spender = (swapQuote.allowanceTarget || swapQuote.issues?.allowance?.spender || swapQuote.transaction.to) as `0x${string}`;
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
      setSwapStatus("signing");
      // Refetch quote - 0x quotes expire ~60s, approval can take 30-60s. Stale quote = revert.
      const freshQuote = await getSwapQuote({
        chainId: supportedChainId,
        sellToken,
        buyToken,
        sellAmount: swapQuote.sellAmount,
        taker: address,
        recipient: receiveAddress && receiveAddress !== address ? receiveAddress : undefined,
        swapFeeBps: feeParams.swapFeeBps,
        swapFeeRecipient: feeParams.swapFeeRecipient,
        swapFeeToken: feeParams.swapFeeToken ?? sellToken,
        tradeSurplusRecipient: feeParams.tradeSurplusRecipient,
        slippageBps: 100,
      });
      if (!freshQuote?.transaction) {
        setSwapError("Quote expired. Please try again.");
        setSwapStatus("error");
        setApprovingInProgress(false);
        return;
      }
      setSwapQuote(freshQuote);
      const tx = freshQuote.transaction;
      const hash = await walletClient.sendTransaction({
        to: tx.to as `0x${string}`,
        data: tx.data as `0x${string}`,
        value: BigInt(tx.value || 0),
      });
      setTxHash(hash);
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === "reverted") {
          setSwapError("Transaction failed on chain. Try again or use WETH instead of native ETH for gasless swaps.");
          setSwapStatus("error");
          setApprovingInProgress(false);
          return;
        }
      }
      addToHistory({
        chainId: supportedChainId,
        chainName: CHAIN_NAME[supportedChainId] ?? "Unknown",
        txHash: hash,
        sellSymbol,
        buySymbol: buyToken === NATIVE_TOKEN_ADDRESS ? (NATIVE_SYMBOL_BY_CHAIN[supportedChainId] ?? "ETH") : (tokens.find((t) => t.address === buyToken)?.symbol ?? "?"),
        sellAmount: formatUnits(BigInt(freshQuote.sellAmount), getTokenDecimals(sellSymbolForLogic, supportedChainId)),
        buyAmount: formatUnits(BigInt(freshQuote.buyAmount), buyToken === NATIVE_TOKEN_ADDRESS ? 18 : getTokenDecimals(tokens.find((t) => t.address === buyToken)?.symbol ?? "ETH", supportedChainId)),
      });
      setSwapStatus("success");
    } catch (e) {
      let msg = e instanceof Error ? e.message : "Approval or swap failed";
      if (/rejected|declined/i.test(msg)) {
        msg += " For zero-gas swaps, choose WETH/WBNB/WMATIC instead of native ETH/BNB/MATIC in the To field.";
      }
      setSwapError(msg);
      setSwapStatus("error");
    } finally {
      setApprovingInProgress(false);
    }
  }, [swapQuote, walletClient, publicClient, address, sellToken, buyToken, supportedChainId, receiveAddress, feeParams]);

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
          value: BigInt(tx.value || 0),
        });
        setTxHash(hash);
        if (publicClient) {
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          if (receipt.status === "reverted") {
            setSwapError("Transaction failed on chain. Try again or use WETH instead of native ETH for gasless swaps.");
            setSwapStatus("error");
            return;
          }
        }
        addToHistory({
          chainId: supportedChainId,
          chainName: CHAIN_NAME[supportedChainId] ?? "Unknown",
          txHash: hash,
          sellSymbol,
          buySymbol: buyToken === NATIVE_TOKEN_ADDRESS ? (NATIVE_SYMBOL_BY_CHAIN[supportedChainId] ?? "ETH") : (tokens.find((t) => t.address === buyToken)?.symbol ?? "?"),
          sellAmount: formatUnits(BigInt(swapQuote.sellAmount), getTokenDecimals(sellSymbolForLogic, supportedChainId)),
          buyAmount: formatUnits(BigInt(swapQuote.buyAmount), buyToken === NATIVE_TOKEN_ADDRESS ? 18 : getTokenDecimals(tokens.find((t) => t.address === buyToken)?.symbol ?? "ETH", supportedChainId)),
        });
        setSwapStatus("success");
        return;
      }
      if (!quote) return;
      const tokenApprovalRequired = quote.issues?.allowance != null;
      const gaslessApprovalAvailable = quote.approval != null;

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
          "This token needs a one-time approval (you pay gas once). Click Approve below, then sign in your wallet. Without enough allowance, the swap fails."
        );
        setSwapStatus("error");
        return;
      }

      await signAndSubmitTrade(approvalDataToSubmit);
    } catch (e) {
      let msg = e instanceof Error ? e.message : "Swap failed";
      if (/rejected|declined/i.test(msg)) {
        msg += " For zero-gas swaps, choose WETH/WBNB/WMATIC instead of native in the To field.";
      }
      setSwapError(msg);
      setSwapStatus("error");
    }
  }, [quote, swapQuote, address, walletClient, publicClient, signAndSubmitTrade]);

  const resetSwap = useCallback(() => {
    setSwapStatus("idle");
    setSwapError(null);
    setTradeHash(null);
    setTxHash(null);
    setNeedsManualApproval(false);
    setSwapQuote(null);
  }, []);

  const doUnwrap = useCallback(async () => {
    if (!walletClient || !address || !sellAmount || parseFloat(sellAmount) <= 0) return;
    const wrappedAddr = WRAPPED_NATIVE[supportedChainId];
    if (!wrappedAddr) return;
    setSwapStatus("signing");
    setSwapError(null);
    try {
      const amountWei = parseUnits(sellAmount, 18);
      const hash = await walletClient.writeContract({
        address: wrappedAddr,
        abi: WETH_WITHDRAW_ABI,
        functionName: "withdraw",
        args: [amountWei],
      });
      setTxHash(hash);
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === "reverted") {
          setSwapError("Unwrap failed");
          setSwapStatus("error");
          return;
        }
      }
      addToHistory({
        chainId: supportedChainId,
        chainName: CHAIN_NAME[supportedChainId] ?? "Unknown",
        txHash: hash,
        sellSymbol: NATIVE_SYMBOL_BY_CHAIN[supportedChainId] === "ETH" ? "WETH" : supportedChainId === 56 ? "WBNB" : "WMATIC",
        buySymbol: NATIVE_SYMBOL_BY_CHAIN[supportedChainId] ?? "ETH",
        sellAmount,
        buyAmount: sellAmount,
      });
      setSwapStatus("success");
      setSellAmount("");
    } catch (e) {
      setSwapError(e instanceof Error ? e.message : "Unwrap failed");
      setSwapStatus("error");
    }
  }, [walletClient, address, sellAmount, supportedChainId, publicClient]);

  const flipTokens = useCallback(() => {
    const newSell = buyToken === NATIVE_TOKEN_ADDRESS ? WRAPPED_NATIVE[supportedChainId] : buyToken;
    const newBuy = sellToken === WRAPPED_NATIVE[supportedChainId] ? (NATIVE_TOKEN_ADDRESS as `0x${string}`) : sellToken;
    setSellToken(newSell);
    setBuyToken(newBuy);
    setQuote(null);
    setSwapQuote(null);
  }, [sellToken, buyToken, supportedChainId]);

  const chainColor = { 8453: "var(--chain-base)", 42161: "var(--chain-arbitrum)", 137: "var(--chain-polygon)", 56: "var(--chain-bsc)", 1: "var(--chain-mainnet)" }[supportedChainId] ?? "var(--chain-base)";

  const sellUsdDisplay = amountMode === "token" && sellAmount && sellTokenPriceUsd && sellTokenPriceUsd > 0
    ? parseFloat(sellAmount) * sellTokenPriceUsd
    : amountMode === "usd" && usdInput
      ? parseFloat(usdInput)
      : null;

  const feeDisplay = useMemo(() => {
    const fee = quote?.fees?.integratorFee ?? swapQuote?.fees?.integratorFee;
    if (!fee) return null;
    const feeSym = tokens.find((t) => t.address === fee.token)?.symbol ?? sellSymbol ?? NATIVE_SYMBOL_BY_CHAIN[supportedChainId] ?? "ETH";
    const feeDec = getTokenDecimals(feeSym, supportedChainId);
    return `${formatUnits(BigInt(fee.amount), feeDec)} ${feeSym}`;
  }, [quote?.fees?.integratorFee, swapQuote?.fees?.integratorFee, tokens, sellSymbol, supportedChainId]);

  return (
    <div className="w-full max-w-md mx-auto rounded-3xl border p-6 sm:p-8 bg-[var(--delta-card)] border-[var(--swap-pill-border)] shadow-xl">
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-white mb-1">
        Swap anytime, anywhere.
      </h1>
      <p className="text-center text-[var(--delta-text-muted)] text-sm mb-6">DeltaChainLabs</p>

      {!isConnected ? (
        <div className="py-12 flex flex-col items-center gap-5">
          <p className="text-[var(--delta-text-muted)] text-base">Connect your wallet to swap</p>
          <ConnectButton />
        </div>
      ) : (
        <div key={address ?? "connected"}>
        <>
          {/* Top bar: chain + wallet */}
          <div className="flex items-center justify-between gap-3 mb-5">
            <select
              value={supportedChainId}
              onChange={(e) => switchChain?.({ chainId: Number(e.target.value) as SupportedChainId })}
              className="rounded-2xl text-white text-sm font-medium px-4 py-2.5 border-0 cursor-pointer focus:ring-2 focus:ring-[var(--swap-accent)] appearance-none bg-no-repeat bg-right pr-9 shrink-0"
              style={{ backgroundColor: chainColor, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
              aria-label="Select network"
            >
              {supportedChains.map((ch) => (
                <option key={ch.id} value={ch.id}>{ch.name}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">{address ? truncateAddress(address) : ""}</span>
              <button type="button" onClick={() => setShowCustomRecipient(!showCustomRecipient)} className="text-xs text-slate-500 hover:text-slate-300">Custom</button>
              <button type="button" onClick={() => disconnect()} className="text-xs text-slate-500 hover:text-white">Disconnect</button>
            </div>
          </div>
          {showCustomRecipient && (
            <div className="mb-4">
              <input
                type="text"
                placeholder="Send to different address (0x...)"
                value={customRecipient}
                onChange={(e) => { setCustomRecipient(e.target.value); setQuote(null); }}
                className="w-full bg-[var(--swap-pill-bg)] text-white text-sm rounded-xl px-4 py-2.5 border border-[var(--swap-pill-border)] placeholder:text-slate-500 focus:ring-1 focus:ring-[var(--swap-accent)]"
              />
              {customRecipient.trim() && !isAddress(customRecipient.trim()) && (
                <p className="text-xs text-amber-400 mt-1">Enter a valid EVM address</p>
              )}
            </div>
          )}

          <div className="space-y-0">
            {/* Sell panel - Uniswap style */}
            <div className="rounded-2xl bg-[var(--swap-pill-bg)] border border-[var(--swap-pill-border)] p-4 sm:p-5">
              <p className="text-xs text-[var(--delta-text-muted)] mb-3">Sell</p>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {amountMode === "token" ? (
                    <>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={sellAmount}
                        onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ""); setSellAmount(v); setQuote(null); }}
                        className="w-full bg-transparent text-white text-3xl sm:text-4xl font-medium outline-none placeholder:text-slate-500"
                      />
                      <p className="text-sm text-[var(--delta-text-muted)] mt-1">
                        {sellUsdDisplay != null ? `$${sellUsdDisplay.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0"}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-slate-400 text-2xl">$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={usdInput}
                          onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ""); setUsdInput(v); setQuote(null); }}
                          className="w-full bg-transparent text-white text-3xl sm:text-4xl font-medium outline-none placeholder:text-slate-500"
                        />
                      </div>
                      <p className="text-xs text-[var(--delta-text-muted)] mt-1">
                        <button type="button" onClick={() => setAmountMode("token")} className="hover:text-white">Token amount</button>
                      </p>
                    </>
                  )}
                </div>
                <select
                  value={sellToken}
                  onChange={(e) => { setSellToken(e.target.value as `0x${string}`); setQuote(null); setSwapQuote(null); }}
                  className="rounded-xl bg-[var(--delta-card)] border border-[var(--swap-pill-border)] text-white text-sm px-3 py-2"
                  aria-label="Select token to sell"
                >
                  {sellTokenOptions.map((t) => (
                    <option key={t.address} value={t.address}>
                      {t.symbol}
                    </option>
                  ))}
                </select>
              </div>
              {isSellingNative && (
                <p className="text-xs text-amber-400 mt-2">Sending native (you pay gas)</p>
              )}
              <div className="flex items-center justify-between gap-2 mt-2">
                <div className="flex items-center gap-2">
                  {amountMode === "token" ? (
                    <>
                      <button type="button" onClick={handleMaxClick} disabled={!sellBalanceFormatted || parseFloat(sellBalanceFormatted) <= 0} className="text-xs font-medium text-[var(--swap-accent)] hover:text-[var(--swap-accent)]/80 disabled:opacity-50 disabled:cursor-not-allowed">Max</button>
                      <button type="button" onClick={() => setAmountMode("usd")} className="text-xs text-[var(--delta-text-muted)] hover:text-white">Enter $ amount</button>
                    </>
                  ) : null}
                </div>
                {sellBalanceFormatted != null && (
                  <span className="text-xs text-slate-500">Balance: {parseFloat(sellBalanceFormatted).toLocaleString("en-US", { maximumFractionDigits: 6 })} {sellSymbol}</span>
                )}
              </div>
            </div>

            {/* Swap direction button */}
            <div className="flex justify-center -my-3 relative z-10">
              <button
                type="button"
                onClick={flipTokens}
                className="p-2.5 rounded-full bg-[var(--delta-card)] border-2 border-[var(--delta-bg)] text-white hover:bg-[var(--swap-pill-bg)] transition"
                aria-label="Swap from and to"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>
            </div>

            {/* Buy panel */}
            <div className="rounded-2xl bg-[var(--swap-pill-bg)] border border-[var(--swap-pill-border)] p-4 sm:p-5">
              {isBuyingNative && (
                <p className="text-xs text-amber-400 mb-2">Receiving native {NATIVE_SYMBOL_BY_CHAIN[supportedChainId] ?? "ETH"} (network fees apply). Use {supportedChainId === 56 ? "WBNB" : supportedChainId === 137 ? "WMATIC" : "WETH"} for gasless.</p>
              )}
              <p className="text-xs text-[var(--delta-text-muted)] mb-3">Buy</p>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-white text-3xl sm:text-4xl font-medium truncate">
                    {isUnwrap
                      ? (sellAmount || "0")
                      : (quote || swapQuote)
                        ? formatUnits(
                            BigInt((quote ?? swapQuote)!.buyAmount),
                            isBuyingNative ? 18 : getTokenDecimals(tokens.find((t) => t.address === buyToken)?.symbol ?? "ETH", supportedChainId)
                          )
                        : "0"}
                  </div>
                  <p className="text-sm text-[var(--delta-text-muted)] mt-1">
                    {receiveUsd != null && receiveUsd > 0 && `~ $${receiveUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
                    {buyBalanceFormatted != null && (
                      <span className={receiveUsd != null && receiveUsd > 0 ? "ml-2" : ""}>Balance: {parseFloat(buyBalanceFormatted).toLocaleString("en-US", { maximumFractionDigits: 6 })} {buySymbolForDisplay}</span>
                    )}
                  </p>
                </div>
                <select
                  value={buyToken}
                  onChange={(e) => { setBuyToken(e.target.value as `0x${string}`); setQuote(null); setSwapQuote(null); }}
                  className="rounded-xl bg-[var(--delta-card)] border border-[var(--swap-pill-border)] text-white text-sm px-3 py-2"
                  aria-label="Select token to receive"
                >
                  {buyTokenOptions.map((t) => (
                    <option key={t.address} value={t.address}>
                      {"isNative" in t && t.isNative ? `${t.symbol} (native)` : t.symbol}
                    </option>
                  ))}
                </select>
              </div>
              {feeDisplay && !isUnwrap && (
                <p className="text-xs text-slate-400 mt-1.5">Fee (0.1%): {feeDisplay}</p>
              )}
            </div>
          </div>

          {quoteError && (
            <p className="text-red-400 text-xs font-medium mt-3 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">{quoteError}</p>
          )}

          <div className="mt-4 flex flex-col gap-2.5">
            {swapStatus === "idle" && (
              <>
                {isBelowMin && !isUnwrap && (
                  <p className="text-amber-400 text-xs">Min: {minSellAmount} {sellSymbol}</p>
                )}
                {isUnwrap ? (
                  <button
                    onClick={doUnwrap}
                    disabled={!sellAmount || parseFloat(sellAmount) <= 0}
                    className="w-full py-4 rounded-2xl bg-[var(--swap-accent)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-base transition mt-5"
                  >
                    Unwrap to {NATIVE_SYMBOL_BY_CHAIN[supportedChainId] ?? "ETH"}
                  </button>
                ) : (
                  <button
                    onClick={fetchQuote}
                    disabled={!(amountMode === "usd" ? usdInput : sellAmount) || (amountMode === "usd" ? parseFloat(usdInput || "0") <= 0 : amountNum <= 0) || quoteLoading || isBelowMin}
                    className="w-full py-4 rounded-2xl bg-[#2d2d3d] hover:bg-[#3d3d4d] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--swap-accent)] font-semibold text-base transition mt-5"
                  >
                    {quoteLoading ? "Getting quote..." : "Get started"}
                  </button>
                )}
                {quote && !isSellingNative && !quote.approval && (
                  <button
                    type="button"
                    onClick={doApprove}
                    disabled={approvingInProgress}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-semibold text-sm"
                  >
                    {approvingInProgress ? "Check wallet" : `Approve ${sellSymbol}`}
                  </button>
                )}
                {swapQuote && !isSellingNative && (
                  <button
                    type="button"
                    onClick={doApproveForSwapQuote}
                    disabled={approvingInProgress}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-semibold text-sm"
                  >
                    {approvingInProgress ? "Check wallet" : "Approve & Swap"}
                  </button>
                )}
                {(quote || swapQuote) && !(swapQuote && !isSellingNative) && (
                  <button
                    onClick={executeSwap}
                    className="w-full py-4 rounded-2xl bg-[#2d2d3d] hover:bg-[#3d3d4d] text-[var(--swap-accent)] font-semibold text-base transition"
                  >
                    Swap
                  </button>
                )}
              </>
            )}
            {(swapStatus === "signing" || swapStatus === "submitting") && (
              <div className="space-y-2">
                <p className="text-center text-amber-300 font-medium py-2 text-sm">
                  {swapStatus === "signing" ? "Check your wallet - sign the request (signature, not a transaction)." : "Submitting..."}
                </p>
                <p className="text-center text-slate-300 text-xs">If nothing appeared: check your wallet app for the request, or disconnect and reconnect. If you already signed, check your wallet balance or tx history - the swap may have gone through; click Cancel to reset.</p>
                <button
                  type="button"
                  onClick={resetSwap}
                  className="w-full py-2 rounded-lg border border-slate-600 text-slate-300 hover:text-white text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
            {swapStatus === "success" && (
              <div className="space-y-2">
                <p className="text-sky-300 text-center font-medium">Swap complete!</p>
                {txHash && (
                  <a
                    href={`${EXPLORER_URL[supportedChainId] || "https://basescan.org"}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center text-sm text-sky-400 hover:underline"
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
                      {approvingInProgress ? "Check wallet" : `Approve ${sellSymbol}`}
                    </button>
                  )}
                  {swapQuote && !isSellingNative && (
                    <button
                      onClick={doApproveForSwapQuote}
                      disabled={approvingInProgress}
                      className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-semibold"
                    >
                      {approvingInProgress ? "Check wallet" : "Approve & Swap"}
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

          <p className="text-xs text-slate-500 mt-4 text-center">
            Approve first if prompted.
          </p>
          <p className="text-xs text-slate-500 mt-1 text-center">
            DeltaChainLabs | Powered by 0x
          </p>
        </>
        </div>
      )}
    </div>
  );
}
