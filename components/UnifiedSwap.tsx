"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
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
  type SignedApprovalData,
} from "@/lib/api";
import { splitSignature, SignatureType } from "@/lib/signature";
import { addToHistory } from "@/lib/history";

export type SwapTabId = "swap" | "wrap" | "bridge";

const ERC20_APPROVE_ABI = [
  { inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], name: "approve", outputs: [{ type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

const WETH_ABI = [
  { inputs: [{ name: "wad", type: "uint256" }], name: "withdraw", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "deposit", outputs: [], stateMutability: "payable", type: "function" },
] as const;

const CHAINS = [
  { id: 1, name: "Ethereum" },
  { id: 8453, name: "Base" },
  { id: 42161, name: "Arbitrum" },
  { id: 137, name: "Polygon" },
  { id: 10, name: "Optimism" },
  { id: 56, name: "BNB" },
] as const;

const NATIVE_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const ALLOWANCE_HOLDER = "0x0000000000001fF3684f28c67538d4D072C22734" as const;

const CHAIN_NAME: Record<number, string> = { 1: "Ethereum", 8453: "Base", 42161: "Arbitrum", 137: "Polygon", 10: "Optimism", 56: "BNB" };
const EXPLORER_URL: Record<number, string> = {
  1: "https://etherscan.io", 8453: "https://basescan.org", 42161: "https://arbiscan.io",
  137: "https://polygonscan.com", 10: "https://optimism.etherscan.io", 56: "https://bscscan.com",
};

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

const WRAPPED_BY_CHAIN: Record<number, string> = {
  1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  8453: "0x4200000000000000000000000000000000000006",
  42161: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  137: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
  10: "0x4200000000000000000000000000000000000006",
  56: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
};

const SWAP_FEE_BPS = "10";
const SWAP_FEE_RECIPIENT = process.env.NEXT_PUBLIC_SWAP_FEE_RECIPIENT || "";

function truncateAddress(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function getTokenDecimals(symbol: string, chainId: number): number {
  if (chainId === 56 && symbol === "USDT") return 18;
  const dec: Record<string, number> = { USDC: 6, USDT: 6, WETH: 18, WBNB: 18, WMATIC: 18, ETH: 18, MATIC: 18, BNB: 18 };
  return dec[symbol] ?? 18;
}

export function UnifiedSwap() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { disconnect } = useDisconnect();

  const [fromChainId, setFromChainId] = useState(8453);
  const [toChainId, setToChainId] = useState(8453);
  const [inputToken, setInputToken] = useState(TOKENS_BY_CHAIN[8453][1]);
  const [outputToken, setOutputToken] = useState(TOKENS_BY_CHAIN[8453][0]);
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<GaslessQuoteResponse | null>(null);
  const [swapQuote, setSwapQuote] = useState<SwapQuoteResponse | null>(null);
  const [acrossQuote, setAcrossQuote] = useState<{
    approvalTxns?: { to: string; data: string; value?: string }[];
    swapTx: { to: string; data: string; value?: string; gas?: string; maxFeePerGas?: string; maxPriorityFeePerGas?: string };
    expectedOutputAmount?: string;
    outputToken?: { decimals: number };
    fees?: { total?: { amount: string; amountUsd?: string; token?: { decimals: number; symbol: string } }; originGas?: { amount: string; amountUsd?: string } };
    quoteExpiryTimestamp?: number;
  } | null>(null);
  const [quoteReceivedAt, setQuoteReceivedAt] = useState<number | null>(null);
  const [quoteCountdown, setQuoteCountdown] = useState<number | null>(null);
  const [estimatedGasWei, setEstimatedGasWei] = useState<bigint | null>(null);
  const [gasPriceWei, setGasPriceWei] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txChainId, setTxChainId] = useState<number | null>(null);
  const [completedAction, setCompletedAction] = useState<"wrap" | "unwrap" | "swap" | "bridge" | null>(null);
  const [showSignConfirm, setShowSignConfirm] = useState(false);
  const [needsManualApproval, setNeedsManualApproval] = useState(false);
  const [approvingInProgress, setApprovingInProgress] = useState(false);
  const [inputTokenPriceUsd, setInputTokenPriceUsd] = useState<number | null>(null);
  const [outputTokenPriceUsd, setOutputTokenPriceUsd] = useState<number | null>(null);
  const [nativeTokenPriceUsd, setNativeTokenPriceUsd] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<SwapTabId>("swap");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const setTab = useCallback((tab: SwapTabId) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    setQuote(null);
    setSwapQuote(null);
    setAcrossQuote(null);
    setQuoteReceivedAt(null);
    setError(null);
    setShowSignConfirm(false);
    if (tab === "swap") {
      setToChainId((prev) => (prev !== fromChainId ? fromChainId : prev));
    } else if (tab === "wrap") {
      setToChainId(fromChainId);
      const tokens = TOKENS_BY_CHAIN[fromChainId] ?? TOKENS_BY_CHAIN[8453];
      const native = tokens.find((t) => t.isNative) ?? tokens[0];
      const wrapped = tokens.find((t) => t.symbol.startsWith("W")) ?? tokens[1];
      setInputToken(native);
      setOutputToken(wrapped);
    } else if (tab === "bridge") {
      if (fromChainId === toChainId) {
        const other = CHAINS.find((c) => c.id !== fromChainId);
        if (other) setToChainId(other.id);
      }
    }
  }, [fromChainId]);

  useEffect(() => {
    if (activeTab === "swap" || activeTab === "wrap") setToChainId((prev) => (prev !== fromChainId ? fromChainId : prev));
  }, [activeTab, fromChainId]);

  useEffect(() => {
    if (activeTab === "bridge" && fromChainId === toChainId) {
      const other = CHAINS.find((c) => c.id !== fromChainId);
      if (other) setToChainId(other.id);
    }
  }, [activeTab, fromChainId, toChainId]);

  useEffect(() => {
    if (activeTab === "wrap") {
      const tokens = TOKENS_BY_CHAIN[fromChainId] ?? TOKENS_BY_CHAIN[8453];
      const native = tokens.find((t) => t.isNative) ?? tokens[0];
      const wrapped = tokens.find((t) => t.symbol.startsWith("W")) ?? tokens[1];
      setInputToken((prev) => {
        const inChain = (TOKENS_BY_CHAIN[fromChainId] ?? []).some((t) => t.address === prev.address);
        return inChain ? prev : native;
      });
      setOutputToken((prev) => {
        const outChain = (TOKENS_BY_CHAIN[fromChainId] ?? []).some((t) => t.address === prev.address);
        return outChain ? prev : wrapped;
      });
    }
  }, [activeTab, fromChainId]);

  const isSameChain = fromChainId === toChainId;
  const needsChainSwitch = isConnected && chainId !== fromChainId;
  const allInputTokens = TOKENS_BY_CHAIN[fromChainId] ?? TOKENS_BY_CHAIN[8453];
  const allOutputTokens = TOKENS_BY_CHAIN[toChainId] ?? TOKENS_BY_CHAIN[8453];
  const wrapTokens = useMemo(() => {
    const t = TOKENS_BY_CHAIN[fromChainId] ?? TOKENS_BY_CHAIN[8453];
    return t.filter((x) => x.isNative || x.symbol.startsWith("W"));
  }, [fromChainId]);
  const inputTokens = activeTab === "wrap" ? wrapTokens : allInputTokens;
  const outputTokens = activeTab === "wrap" ? wrapTokens : allOutputTokens;

  const isInputNative = inputToken.address === NATIVE_TOKEN;
  const isOutputNative = outputToken.address === NATIVE_TOKEN;
  const isWrap = isSameChain && isInputNative && !isOutputNative && outputToken.symbol.startsWith("W");
  const isUnwrap = isSameChain && !isInputNative && inputToken.symbol.startsWith("W") && isOutputNative;
  const effectiveIsWrap = activeTab === "wrap" && isWrap;
  const effectiveIsUnwrap = activeTab === "wrap" && isUnwrap;

  const inputPriceAddr = isInputNative ? WRAPPED_BY_CHAIN[fromChainId] : inputToken.address;
  const outputPriceAddr = isOutputNative ? WRAPPED_BY_CHAIN[toChainId] : outputToken.address;

  useEffect(() => {
    if (!inputPriceAddr) return;
    fetch(`/api/token-price?chainId=${fromChainId}&address=${encodeURIComponent(inputPriceAddr)}`)
      .then((r) => r.json())
      .then((d: { usd?: number | null }) => setInputTokenPriceUsd(typeof d?.usd === "number" ? d.usd : null))
      .catch(() => setInputTokenPriceUsd(null));
  }, [fromChainId, inputPriceAddr]);

  useEffect(() => {
    if (!outputPriceAddr) return;
    fetch(`/api/token-price?chainId=${toChainId}&address=${encodeURIComponent(outputPriceAddr)}`)
      .then((r) => r.json())
      .then((d: { usd?: number | null }) => setOutputTokenPriceUsd(typeof d?.usd === "number" ? d.usd : null))
      .catch(() => setOutputTokenPriceUsd(null));
  }, [toChainId, outputPriceAddr]);

  const nativePriceAddr = WRAPPED_BY_CHAIN[fromChainId];
  useEffect(() => {
    if (!nativePriceAddr) return;
    fetch(`/api/token-price?chainId=${fromChainId}&address=${encodeURIComponent(nativePriceAddr)}`)
      .then((r) => r.json())
      .then((d: { usd?: number | null }) => setNativeTokenPriceUsd(typeof d?.usd === "number" ? d.usd : null))
      .catch(() => setNativeTokenPriceUsd(null));
  }, [fromChainId, nativePriceAddr]);

  const inputUsdValue = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0 || inputTokenPriceUsd == null) return null;
    return parseFloat(amount) * inputTokenPriceUsd;
  }, [amount, inputTokenPriceUsd]);

  const inputTokenForBalance = isInputNative ? undefined : (inputToken.address as `0x${string}`);
  const { data: inputBalanceRaw } = useReadContract({
    address: inputTokenForBalance,
    abi: ERC20_APPROVE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: fromChainId,
  });
  const { data: nativeBalance } = useBalance({ address: isInputNative ? address : undefined, chainId: fromChainId });
  const { data: outputBalanceRaw } = useReadContract({
    address: isOutputNative ? undefined : (outputToken.address as `0x${string}`),
    abi: ERC20_APPROVE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: toChainId,
  });
  const { data: outputNativeBalance } = useBalance({ address: isOutputNative ? address : undefined, chainId: toChainId });

  const inputBalanceFormatted = useMemo(() => {
    if (isInputNative && nativeBalance?.value != null) return formatUnits(nativeBalance.value, 18);
    if (inputBalanceRaw != null && typeof inputBalanceRaw === "bigint") return formatUnits(inputBalanceRaw, inputToken.decimals);
    return null;
  }, [isInputNative, nativeBalance?.value, inputBalanceRaw, inputToken.decimals]);

  const outputBalanceFormatted = useMemo(() => {
    if (isOutputNative && outputNativeBalance?.value != null) return formatUnits(outputNativeBalance.value, 18);
    if (outputBalanceRaw != null && typeof outputBalanceRaw === "bigint") return formatUnits(outputBalanceRaw, outputToken.decimals);
    return null;
  }, [isOutputNative, outputNativeBalance?.value, outputBalanceRaw, outputToken.decimals]);


  const swapTabWithWrapSelection = activeTab === "swap" && (isWrap || isUnwrap);
  const outputAmount = useMemo(() => {
    if (isWrap || isUnwrap) return amount || "0";
    if (acrossQuote?.expectedOutputAmount) {
      const dec = acrossQuote.outputToken?.decimals ?? getTokenDecimals(outputToken.symbol, toChainId);
      return formatUnits(BigInt(acrossQuote.expectedOutputAmount), dec);
    }
    if (quote) return formatUnits(BigInt(quote.buyAmount), getTokenDecimals(outputToken.symbol, toChainId));
    if (swapQuote) return formatUnits(BigInt(swapQuote.buyAmount), getTokenDecimals(outputToken.symbol, toChainId));
    return "0";
  }, [isWrap, isUnwrap, amount, acrossQuote, quote, swapQuote, outputToken.symbol, toChainId]);

  const outputUsdValue = useMemo(() => {
    if (!outputAmount || parseFloat(outputAmount) <= 0 || outputTokenPriceUsd == null) return null;
    return parseFloat(outputAmount) * outputTokenPriceUsd;
  }, [outputAmount, outputTokenPriceUsd]);

  const hasQuote = !!(quote || swapQuote || acrossQuote);
  const canExecute = hasQuote || effectiveIsWrap || effectiveIsUnwrap;

  const resetForNextAction = useCallback(() => {
    setTxHash(null);
    setTxChainId(null);
    setCompletedAction(null);
    setError(null);
    setShowSignConfirm(false);
    setAmount("");
    setQuote(null);
    setSwapQuote(null);
    setAcrossQuote(null);
    setQuoteReceivedAt(null);
    setNeedsManualApproval(false);
  }, []);

  const handleMax = useCallback(() => {
    if (inputBalanceFormatted && parseFloat(inputBalanceFormatted) > 0) {
      setAmount(inputBalanceFormatted);
      setQuote(null);
      setSwapQuote(null);
      setAcrossQuote(null);
    }
  }, [inputBalanceFormatted]);

  const fetchQuote = useCallback(async () => {
    if (!address || !amount || parseFloat(amount) <= 0) return;
    setLoading(true);
    setError(null);
    setQuote(null);
    setSwapQuote(null);
    setAcrossQuote(null);
    setQuoteReceivedAt(null);
    setQuoteCountdown(null);
    setEstimatedGasWei(null);
    setGasPriceWei(null);

    try {
      if (isSameChain) {
        const amountWei = parseUnits(amount, inputToken.decimals).toString();
        const sellAddr = isInputNative ? NATIVE_TOKEN_ADDRESS : inputToken.address;
        const buyAddr = isOutputNative ? NATIVE_TOKEN_ADDRESS : outputToken.address;
        const useSwapApi = isInputNative || isOutputNative;

        if (useSwapApi) {
          const res = await getSwapQuote({
            chainId: fromChainId,
            sellToken: sellAddr,
            buyToken: buyAddr,
            sellAmount: amountWei,
            taker: address,
            swapFeeBps: SWAP_FEE_BPS,
            swapFeeRecipient: SWAP_FEE_RECIPIENT,
            swapFeeToken: outputToken.address,
            tradeSurplusRecipient: SWAP_FEE_RECIPIENT,
            slippageBps: 100,
          });
          if (res.liquidityAvailable && res.transaction) {
            setSwapQuote(res);
            setQuoteReceivedAt(Date.now());
          } else setError("No liquidity available");
        } else {
          const res = await getGaslessQuote({
            chainId: fromChainId,
            sellToken: sellAddr as `0x${string}`,
            buyToken: buyAddr as `0x${string}`,
            sellAmount: amountWei,
            taker: address,
            swapFeeBps: SWAP_FEE_BPS,
            swapFeeRecipient: SWAP_FEE_RECIPIENT,
            swapFeeToken: outputToken.address as `0x${string}`,
            tradeSurplusRecipient: SWAP_FEE_RECIPIENT,
            slippageBps: 100,
          });
          if (res.liquidityAvailable) {
            setQuote(res);
            setQuoteReceivedAt(Date.now());
          } else setError("No liquidity available");
        }
      } else {
        const amountWei = parseUnits(amount, inputToken.decimals).toString();
        const inputAddr = isInputNative ? WRAPPED_BY_CHAIN[fromChainId] : inputToken.address;
        const outputAddr = isOutputNative ? WRAPPED_BY_CHAIN[toChainId] : outputToken.address;
        const res = await fetch(
          `/api/across-quote?tradeType=exactInput&amount=${amountWei}&inputToken=${inputAddr}&outputToken=${outputAddr}&originChainId=${fromChainId}&destinationChainId=${toChainId}&depositor=${address}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Quote failed");
        const bridge = data.steps?.bridge;
        const swapTx = data.swapTx ?? bridge?.swapTx;
        const expectedOutputAmount = data.expectedOutputAmount ?? bridge?.expectedOutputAmount;
        const outputTokenInfo = data.outputToken ?? bridge?.tokenOut;
        const fees = data.fees ?? (bridge?.fees?.totalRelay ? {
          total: { amount: bridge.fees.totalRelay.total, token: bridge.tokenOut ?? { decimals: 18, symbol: "ETH" } },
          originGas: bridge.fees.relayerGas ? { amount: bridge.fees.relayerGas.total } : undefined,
        } : undefined);
        setAcrossQuote({
          approvalTxns: data.approvalTxns,
          swapTx,
          expectedOutputAmount,
          outputToken: outputTokenInfo ? { decimals: outputTokenInfo.decimals ?? 18 } : undefined,
          fees,
          quoteExpiryTimestamp: data.quoteExpiryTimestamp ?? (Date.now() + 30000),
        });
        setQuoteReceivedAt(Date.now());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Quote failed");
    } finally {
      setLoading(false);
    }
  }, [address, amount, inputToken, outputToken, fromChainId, toChainId, isSameChain, isInputNative, isOutputNative]);

  const quoteRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchQuoteRef = useRef(fetchQuote);
  fetchQuoteRef.current = fetchQuote;
  useEffect(() => {
    if (!hasQuote || effectiveIsWrap || effectiveIsUnwrap) {
      if (quoteRefreshRef.current) {
        clearInterval(quoteRefreshRef.current);
        quoteRefreshRef.current = null;
      }
      return;
    }
    quoteRefreshRef.current = setInterval(() => {
      fetchQuoteRef.current();
    }, 30000);
    return () => {
      if (quoteRefreshRef.current) clearInterval(quoteRefreshRef.current);
    };
  }, [hasQuote, effectiveIsWrap, effectiveIsUnwrap]);

  useEffect(() => {
    if (!quoteReceivedAt || !hasQuote || effectiveIsWrap || effectiveIsUnwrap) {
      setQuoteCountdown(null);
      return;
    }
    const QUOTE_TTL = 30;
    const update = () => {
      const elapsed = Math.floor((Date.now() - quoteReceivedAt) / 1000);
      const left = Math.max(0, QUOTE_TTL - elapsed);
      setQuoteCountdown(left);
      if (left <= 0) setQuoteReceivedAt(null);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [quoteReceivedAt, hasQuote, effectiveIsWrap, effectiveIsUnwrap]);

  useEffect(() => {
    if (!acrossQuote || !address || chainId !== fromChainId) {
      setEstimatedGasWei(null);
      setGasPriceWei(null);
      return;
    }
    const s = acrossQuote.swapTx;
    if (!s?.to || !s?.data) return;
    const client = publicClient;
    if (!client) return;
    Promise.all([
      client.estimateGas({
        account: address as `0x${string}`,
        to: s.to as `0x${string}`,
        data: s.data as `0x${string}`,
        value: s.value ? BigInt(s.value) : undefined,
      }),
      client.getGasPrice(),
    ])
      .then(([gas, price]) => {
        setEstimatedGasWei(gas);
        setGasPriceWei(price);
      })
      .catch(() => {
        setEstimatedGasWei(null);
        setGasPriceWei(null);
      });
  }, [acrossQuote, address, chainId, fromChainId, publicClient]);

  const executeSameChain = useCallback(async () => {
    if (!walletClient || !address) return;
    setSwapping(true);
    setError(null);

    try {
      if (effectiveIsWrap) {
        const amountWei = parseUnits(amount, 18);
        const wrappedAddr = WRAPPED_BY_CHAIN[fromChainId] as `0x${string}`;
        const hash = await walletClient.writeContract({
          address: wrappedAddr,
          abi: WETH_ABI,
          functionName: "deposit",
          args: [],
          value: amountWei,
        });
        setTxHash(hash);
        setTxChainId(fromChainId);
        if (publicClient) {
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          if (receipt.status === "reverted") {
            setError("Transaction failed on-chain.");
            setSwapping(false);
            return;
          }
        }
        setCompletedAction("wrap");
        addToHistory({ chainId: fromChainId, chainName: CHAIN_NAME[fromChainId], txHash: hash, sellSymbol: inputToken.symbol, buySymbol: outputToken.symbol, sellAmount: amount, buyAmount: amount });
        setAmount("");
        setQuote(null);
        setSwapQuote(null);
      } else if (effectiveIsUnwrap) {
        const amountWei = parseUnits(amount, 18);
        const wrappedAddr = WRAPPED_BY_CHAIN[fromChainId] as `0x${string}`;
        const hash = await walletClient.writeContract({
          address: wrappedAddr,
          abi: WETH_ABI,
          functionName: "withdraw",
          args: [amountWei],
        });
        setTxHash(hash);
        setTxChainId(fromChainId);
        if (publicClient) {
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          if (receipt.status === "reverted") {
            setError("Transaction failed on-chain.");
            setSwapping(false);
            return;
          }
        }
        setCompletedAction("unwrap");
        addToHistory({ chainId: fromChainId, chainName: CHAIN_NAME[fromChainId], txHash: hash, sellSymbol: inputToken.symbol, buySymbol: outputToken.symbol, sellAmount: amount, buyAmount: amount });
        setAmount("");
        setQuote(null);
        setSwapQuote(null);
      } else if (swapQuote?.transaction) {
        const spender = (swapQuote.allowanceTarget || swapQuote.issues?.allowance?.spender || swapQuote.transaction.to) as `0x${string}`;
        const sellAddr = inputToken.address as `0x${string}`;
        if (swapQuote.issues?.allowance && !isInputNative) {
          const approveHash = await walletClient.writeContract({ address: sellAddr, abi: ERC20_APPROVE_ABI, functionName: "approve", args: [spender, maxUint256] });
          if (publicClient) await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }
        const fresh = await getSwapQuote({
          chainId: fromChainId, sellToken: sellAddr, buyToken: (isOutputNative ? NATIVE_TOKEN_ADDRESS : outputToken.address) as `0x${string}`,
          sellAmount: swapQuote.sellAmount, taker: address, swapFeeBps: SWAP_FEE_BPS, swapFeeRecipient: SWAP_FEE_RECIPIENT, swapFeeToken: outputToken.address as `0x${string}`, tradeSurplusRecipient: SWAP_FEE_RECIPIENT, slippageBps: 100,
        });
        if (!fresh?.transaction) { setError("Quote expired — get a fresh quote and try again"); setSwapping(false); return; }
        setSwapQuote(fresh);
        setQuoteReceivedAt(Date.now());
        const tx = fresh.transaction;
        const gasParams = tx?.gas && tx?.gasPrice
          ? { gas: BigInt(tx.gas), gasPrice: BigInt(tx.gasPrice) }
          : tx?.maxFeePerGas && tx?.maxPriorityFeePerGas
            ? { maxFeePerGas: BigInt(tx.maxFeePerGas), maxPriorityFeePerGas: BigInt(tx.maxPriorityFeePerGas) }
            : {};
        const hash = await walletClient.sendTransaction({
          to: tx.to as `0x${string}`,
          data: tx.data as `0x${string}`,
          value: BigInt(tx.value || 0),
          ...gasParams,
        });
        setTxHash(hash);
        setTxChainId(fromChainId);
        if (publicClient) {
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          if (receipt.status === "reverted") {
            setError("Transaction failed on-chain. Get a fresh quote and try again.");
            setSwapping(false);
            return;
          }
        }
        setCompletedAction("swap");
        addToHistory({
          chainId: fromChainId, chainName: CHAIN_NAME[fromChainId], txHash: hash,
          sellSymbol: inputToken.symbol, buySymbol: outputToken.symbol,
          sellAmount: formatUnits(BigInt(fresh.sellAmount), inputToken.decimals),
          buyAmount: formatUnits(BigInt(fresh.buyAmount), getTokenDecimals(outputToken.symbol, fromChainId)),
        });
        setAmount("");
        setSwapQuote(null);
      } else if (quote) {
        const amountWei = parseUnits(amount, inputToken.decimals).toString();
        const sellAddr = (isInputNative ? NATIVE_TOKEN_ADDRESS : inputToken.address) as `0x${string}`;
        const buyAddr = (isOutputNative ? NATIVE_TOKEN_ADDRESS : outputToken.address) as `0x${string}`;
        const fresh = await getGaslessQuote({
          chainId: fromChainId, sellToken: sellAddr, buyToken: buyAddr, sellAmount: amountWei,
          taker: address, swapFeeBps: SWAP_FEE_BPS, swapFeeRecipient: SWAP_FEE_RECIPIENT,
          swapFeeToken: outputToken.address as `0x${string}`, tradeSurplusRecipient: SWAP_FEE_RECIPIENT, slippageBps: 100,
        });
        if (!fresh?.liquidityAvailable) { setError("Quote expired — get a fresh quote and try again"); setSwapping(false); return; }
        setQuote(fresh);
        setQuoteReceivedAt(Date.now());
        const tokenApprovalRequired = fresh.issues?.allowance != null;
        const gaslessApprovalAvailable = fresh.approval != null;
        let approvalData: SignedApprovalData | null = null;
        if (tokenApprovalRequired && gaslessApprovalAvailable && fresh.approval) {
          const sig = await walletClient.signTypedData({
            account: address,
            domain: fresh.approval.eip712.domain,
            types: fresh.approval.eip712.types as Record<string, { name: string; type: string }[]>,
            primaryType: fresh.approval.eip712.primaryType,
            message: fresh.approval.eip712.message,
          });
          const split = splitSignature(sig as `0x${string}`);
          approvalData = { type: fresh.approval.type, eip712: fresh.approval.eip712, signature: { ...split, signatureType: SignatureType.EIP712 } };
        } else if (tokenApprovalRequired && !gaslessApprovalAvailable) {
          setNeedsManualApproval(true);
          setError("Approve token first, then try again.");
          setSwapping(false);
          return;
        }
        const tradeSig = await walletClient.signTypedData({
          account: address,
          domain: fresh.trade.eip712.domain,
          types: fresh.trade.eip712.types as Record<string, { name: string; type: string }[]>,
          primaryType: fresh.trade.eip712.primaryType,
          message: fresh.trade.eip712.message,
        });
        const tradeSplit = splitSignature(tradeSig as `0x${string}`);
        const { tradeHash: th } = await submitGaslessSwap({
          trade: { type: fresh.trade.type, eip712: fresh.trade.eip712, signature: { ...tradeSplit, signatureType: SignatureType.EIP712 } },
          approval: approvalData ?? undefined,
          chainId: fromChainId,
        });
        let st = await getGaslessStatus(th, fromChainId);
        for (let i = 0; i < 20 && st.status !== "confirmed"; i++) { await new Promise((r) => setTimeout(r, 2000)); st = await getGaslessStatus(th, fromChainId); }
        if (st.transactionHash) {
          setTxHash(st.transactionHash);
          setTxChainId(fromChainId);
          setCompletedAction("swap");
          addToHistory({ chainId: fromChainId, chainName: CHAIN_NAME[fromChainId], txHash: st.transactionHash, tradeHash: th, sellSymbol: inputToken.symbol, buySymbol: outputToken.symbol, sellAmount: formatUnits(BigInt(fresh.sellAmount), inputToken.decimals), buyAmount: formatUnits(BigInt(fresh.buyAmount), getTokenDecimals(outputToken.symbol, fromChainId)) });
        }
        setAmount("");
        setQuote(null);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Swap failed";
      if (msg.toLowerCase().includes("reject") || msg.toLowerCase().includes("declined")) {
        setError("Transaction was rejected. If your wallet showed \"could not load rate fees\", approve the token first (click Approve if shown), get a fresh quote, then try again.");
      } else {
        setError(msg);
      }
    } finally {
      setSwapping(false);
    }
  }, [walletClient, address, publicClient, effectiveIsWrap, effectiveIsUnwrap, amount, inputToken, outputToken, fromChainId, swapQuote, quote, isInputNative, isOutputNative]);

  const executeCrossChain = useCallback(async () => {
    if (!acrossQuote || !walletClient || !address) return;
    setSwapping(true);
    setError(null);
    try {
      if (needsChainSwitch && switchChain) {
        await switchChain({ chainId: fromChainId });
        await new Promise((r) => setTimeout(r, 1000));
      }
      const amountWei = parseUnits(amount, inputToken.decimals).toString();
      const inputAddr = isInputNative ? WRAPPED_BY_CHAIN[fromChainId] : inputToken.address;
      const outputAddr = isOutputNative ? WRAPPED_BY_CHAIN[toChainId] : outputToken.address;
      const res = await fetch(
        `/api/across-quote?tradeType=exactInput&amount=${amountWei}&inputToken=${inputAddr}&outputToken=${outputAddr}&originChainId=${fromChainId}&destinationChainId=${toChainId}&depositor=${address}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Quote failed");
      const bridge = data.steps?.bridge;
      const swapTx = data.swapTx ?? bridge?.swapTx;
      const expectedOutputAmount = data.expectedOutputAmount ?? bridge?.expectedOutputAmount;
      const outputTokenInfo = data.outputToken ?? bridge?.tokenOut;
      const fees = data.fees ?? (bridge?.fees?.totalRelay ? {
        total: { amount: bridge.fees.totalRelay.total, token: bridge.tokenOut ?? { decimals: 18, symbol: "ETH" } },
        originGas: bridge.fees.relayerGas ? { amount: bridge.fees.relayerGas.total } : undefined,
      } : undefined);
      const freshQuote = {
        approvalTxns: data.approvalTxns,
        swapTx,
        expectedOutputAmount,
        outputToken: outputTokenInfo ? { decimals: outputTokenInfo.decimals ?? 18 } : undefined,
        fees,
        quoteExpiryTimestamp: data.quoteExpiryTimestamp ?? (Date.now() + 30000),
      };
      if (!swapTx?.to || !swapTx?.data) {
        setError("Quote expired — get a fresh quote and try again");
        setSwapping(false);
        return;
      }
      setAcrossQuote(freshQuote);
      setQuoteReceivedAt(Date.now());
      if (freshQuote.approvalTxns?.length) {
        for (const a of freshQuote.approvalTxns) {
          const h = await walletClient.sendTransaction({ to: a.to as `0x${string}`, data: a.data as `0x${string}`, value: a.value ? BigInt(a.value) : undefined });
          if (publicClient) await publicClient.waitForTransactionReceipt({ hash: h });
        }
      }
      const s = freshQuote.swapTx;
      const gasParams =
        estimatedGasWei != null && gasPriceWei != null
          ? { gas: (estimatedGasWei * BigInt(120)) / BigInt(100), gasPrice: gasPriceWei }
          : s.maxFeePerGas && s.maxPriorityFeePerGas
            ? { maxFeePerGas: BigInt(s.maxFeePerGas), maxPriorityFeePerGas: BigInt(s.maxPriorityFeePerGas) }
            : {};
      const hash = await walletClient.sendTransaction({
        to: s.to as `0x${string}`,
        data: s.data as `0x${string}`,
        value: s.value ? BigInt(s.value) : undefined,
        ...gasParams,
      });
      setTxHash(hash);
      setTxChainId(fromChainId);
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === "reverted") {
          setError("Transaction failed on-chain (e.g. InvalidQuoteTimestamp). Use Retry with fresh quote below.");
          setSwapping(false);
          return;
        }
      }
      setCompletedAction("bridge");
      setAmount("");
      setAcrossQuote(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Swap failed";
      setError(msg);
    } finally {
      setSwapping(false);
    }
  }, [acrossQuote, walletClient, address, publicClient, needsChainSwitch, switchChain, fromChainId, toChainId, amount, inputToken, outputToken, isInputNative, isOutputNative, estimatedGasWei, gasPriceWei]);

  const isQuoteExpiredError = error != null && (
    error.toLowerCase().includes("invalidquotetimestamp") ||
    error.toLowerCase().includes("quote expired") ||
    error.toLowerCase().includes("transaction failed on-chain")
  );

  const execute = useCallback(() => {
    if (isSameChain) executeSameChain();
    else {
      setShowSignConfirm(true);
    }
  }, [isSameChain, executeSameChain]);

  const confirmAndExecuteCrossChain = useCallback(() => {
    setShowSignConfirm(false);
    executeCrossChain();
  }, [executeCrossChain]);

  const quoteBreakdown = useMemo(() => {
    type FeeItem = { label: string; value: string; valueUsd?: string };
    const toUsdStr = (amountWei: bigint, decimals: number, priceUsd: number | null) => {
      if (priceUsd == null) return undefined;
      const v = Number(amountWei) / 10 ** decimals * priceUsd;
      return `$${v.toFixed(4)}`;
    };

    if (swapQuote) {
      const sources = swapQuote.route?.fills?.map((f) => f.source).filter(Boolean) ?? [];
      const gasWei = swapQuote.transaction?.gas && swapQuote.transaction?.gasPrice
        ? BigInt(swapQuote.transaction.gas) * BigInt(swapQuote.transaction.gasPrice)
        : swapQuote.totalNetworkFee ? BigInt(swapQuote.totalNetworkFee) : null;
      const feeItems: FeeItem[] = [];
      if (swapQuote.fees?.integratorFee?.amount) {
        const dec = getTokenDecimals(outputToken.symbol, fromChainId);
        const amt = BigInt(swapQuote.fees.integratorFee.amount);
        feeItems.push({
          label: "App fee (0.1%)",
          value: `${formatUnits(amt, dec)} ${outputToken.symbol}`,
          valueUsd: toUsdStr(amt, dec, outputTokenPriceUsd),
        });
      }
      if (swapQuote.fees?.zeroExFee?.amount) {
        const dec = getTokenDecimals(outputToken.symbol, fromChainId);
        const amt = BigInt(swapQuote.fees.zeroExFee.amount);
        feeItems.push({
          label: "0x fee",
          value: `${formatUnits(amt, dec)} ${outputToken.symbol}`,
          valueUsd: toUsdStr(amt, dec, outputTokenPriceUsd),
        });
      }
      if (swapQuote.fees?.gasFee?.amount) {
        const dec = getTokenDecimals(outputToken.symbol, fromChainId);
        const amt = BigInt(swapQuote.fees.gasFee.amount);
        feeItems.push({
          label: "Network fee",
          value: `${formatUnits(amt, dec)} ${outputToken.symbol}`,
          valueUsd: toUsdStr(amt, dec, outputTokenPriceUsd),
        });
      }
      const gasUsd = gasWei != null && nativeTokenPriceUsd != null
        ? `$${(Number(gasWei) / 1e18 * nativeTokenPriceUsd).toFixed(4)}`
        : undefined;
      const totalUsd = [...feeItems.map((f) => f.valueUsd?.replace(/[$,]/g, "")).filter(Boolean), gasUsd?.replace(/[$,]/g, "")].reduce((sum, s) => sum + parseFloat(s!), 0);
      return { type: "swap" as const, sources, gasWei, gasUsd, feeItems, totalFeesUsd: totalUsd > 0 ? `$${totalUsd.toFixed(4)}` : undefined };
    }
    if (quote) {
      const fills = (quote.route?.fills ?? []) as { source?: string }[];
      const sources = fills.map((f) => f.source).filter(Boolean);
      const feeItems: FeeItem[] = [];
      if (quote.fees?.integratorFee?.amount) {
        const dec = getTokenDecimals(outputToken.symbol, fromChainId);
        const amt = BigInt(quote.fees.integratorFee.amount);
        feeItems.push({
          label: "App fee (0.1%)",
          value: `${formatUnits(amt, dec)} ${outputToken.symbol}`,
          valueUsd: toUsdStr(amt, dec, outputTokenPriceUsd),
        });
      }
      if (quote.fees?.zeroExFee?.amount) {
        const dec = getTokenDecimals(outputToken.symbol, fromChainId);
        const amt = BigInt(quote.fees.zeroExFee.amount);
        feeItems.push({
          label: "0x fee",
          value: `${formatUnits(amt, dec)} ${outputToken.symbol}`,
          valueUsd: toUsdStr(amt, dec, outputTokenPriceUsd),
        });
      }
      const totalUsd = feeItems.map((f) => f.valueUsd?.replace(/[$,]/g, "")).filter(Boolean).reduce((sum, s) => sum + parseFloat(s!), 0);
      return { type: "gasless" as const, sources, gasWei: null, gasUsd: undefined, feeItems, totalFeesUsd: totalUsd > 0 ? `$${totalUsd.toFixed(4)}` : undefined };
    }
    if (acrossQuote) {
      const feeItems: FeeItem[] = [];
      if (acrossQuote.fees?.total?.amount && acrossQuote.fees.total.token) {
        const dec = acrossQuote.fees.total.token.decimals ?? 6;
        const sym = acrossQuote.fees.total.token.symbol ?? "USDC";
        const amt = BigInt(acrossQuote.fees.total.amount);
        const usd = acrossQuote.fees.total.amountUsd
          ? `$${parseFloat(acrossQuote.fees.total.amountUsd).toFixed(4)}`
          : toUsdStr(amt, dec, outputTokenPriceUsd ?? (sym === "USDC" || sym === "USDT" ? 1 : null));
        feeItems.push({
          label: "Bridge + fees",
          value: `${formatUnits(amt, dec)} ${sym}`,
          valueUsd: usd,
        });
      }
      const gasWei =
        estimatedGasWei && gasPriceWei
          ? estimatedGasWei * gasPriceWei
          : acrossQuote.fees?.originGas?.amount
            ? BigInt(acrossQuote.fees.originGas.amount)
            : null;
      const gasUsd = gasWei != null && nativeTokenPriceUsd != null
        ? `$${(Number(gasWei) / 1e18 * nativeTokenPriceUsd).toFixed(4)}`
        : undefined;
      const totalUsd = [...feeItems.map((f) => f.valueUsd?.replace(/[$,]/g, "")).filter(Boolean), gasUsd?.replace(/[$,]/g, "")].reduce((sum, s) => sum + parseFloat(s!), 0);
      return { type: "crosschain" as const, sources: ["Across"], gasWei, gasUsd, feeItems, totalFeesUsd: totalUsd > 0 ? `$${totalUsd.toFixed(4)}` : undefined };
    }
    return null;
  }, [swapQuote, quote, acrossQuote, outputToken.symbol, fromChainId, estimatedGasWei, gasPriceWei, outputTokenPriceUsd, nativeTokenPriceUsd]);

  const isGetQuoteDisabled = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) return true;
    if (loading || swapping) return true;
    if (effectiveIsWrap || effectiveIsUnwrap) return true;
    if (swapTabWithWrapSelection) return true;
    if (activeTab === "bridge" && isSameChain) return true;
    return false;
  }, [amount, loading, swapping, effectiveIsWrap, effectiveIsUnwrap, swapTabWithWrapSelection, activeTab, isSameChain]);

  const isSwapDisabled = useMemo(() => {
    if (!hasQuote || effectiveIsWrap || effectiveIsUnwrap) return true;
    if (loading || swapping) return true;
    if (needsChainSwitch) return true;
    return false;
  }, [hasQuote, effectiveIsWrap, effectiveIsUnwrap, loading, swapping, needsChainSwitch]);

  const TAB_LABELS: { id: SwapTabId; label: string }[] = [
    { id: "swap", label: "Swap" },
    { id: "wrap", label: "Wrap" },
    { id: "bridge", label: "Bridge" },
  ];

  return (
    <div className="w-full max-w-md mx-auto rounded-3xl border p-6 sm:p-8 bg-[var(--delta-card)] border-[var(--swap-pill-border)] shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Swap</h1>
          <span className="md:hidden text-sm font-medium text-[var(--swap-accent)] bg-[var(--swap-accent)]/20 px-2.5 py-1 rounded-lg">
            {TAB_LABELS.find((t) => t.id === activeTab)?.label ?? activeTab}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen((o) => !o)}
          className="md:hidden p-2 -mr-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <div className="hidden md:flex rounded-xl bg-[var(--swap-pill-bg)] border border-[var(--swap-pill-border)] p-1 mb-4">
        {TAB_LABELS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id ? "bg-[var(--swap-accent)] text-white" : "text-[var(--delta-text-muted)] hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-200 ${
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!mobileMenuOpen}
      >
        <div
          className="absolute inset-0 bg-black/60"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden
        />
        <div
          className={`absolute right-0 top-0 bottom-0 w-64 max-w-[85vw] bg-[var(--delta-card)] border-l border-[var(--swap-pill-border)] shadow-2xl flex flex-col transition-transform duration-200 ${
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between p-4 border-b border-[var(--swap-pill-border)]">
            <span className="text-white font-semibold">Select action</span>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="p-4 flex flex-col gap-1">
            {TAB_LABELS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`w-full text-left py-3 px-4 rounded-xl text-base font-medium transition-colors ${
                  activeTab === id ? "bg-[var(--swap-accent)] text-white" : "text-[var(--delta-text-muted)] hover:bg-white/5 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {!isConnected ? (
        <div className="py-12 flex flex-col items-center gap-5">
          <p className="text-[var(--delta-text-muted)] text-base">Connect your wallet</p>
          <ConnectButton />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-slate-400 font-mono">{address ? truncateAddress(address) : ""}</span>
            <button type="button" onClick={() => disconnect()} className="text-xs text-slate-500 hover:text-white">Disconnect</button>
          </div>

          <div>
            <p className="text-xs text-[var(--delta-text-muted)] mb-2">From</p>
            <select
              value={fromChainId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setFromChainId(id);
                setInputToken(TOKENS_BY_CHAIN[id]?.[1] ?? inputTokens[0]);
                setQuote(null);
                setSwapQuote(null);
                setAcrossQuote(null);
                setQuoteReceivedAt(null);
                setShowSignConfirm(false);
              }}
              className="w-full rounded-xl bg-[var(--swap-pill-bg)] border border-[var(--swap-pill-border)] text-white text-sm px-3 py-2 mb-2"
            >
              {CHAINS.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9.]/g, "");
                  setAmount(v);
                  setQuote(null);
                  setSwapQuote(null);
                  setAcrossQuote(null);
                  setQuoteReceivedAt(null);
                  setShowSignConfirm(false);
                }}
                className="flex-1 rounded-xl bg-[var(--swap-pill-bg)] border border-[var(--swap-pill-border)] text-white px-3 py-2"
              />
              <select
                value={inputToken.address}
                onChange={(e) => {
                  const t = inputTokens.find((x) => x.address === e.target.value);
                  if (t) setInputToken(t);
                  setQuote(null);
                  setSwapQuote(null);
                  setAcrossQuote(null);
                  setQuoteReceivedAt(null);
                  setShowSignConfirm(false);
                }}
                className="rounded-xl bg-[var(--delta-card)] border border-[var(--swap-pill-border)] text-white text-sm px-3 py-2 w-28"
              >
                {inputTokens.map((t) => (
                  <option key={t.address} value={t.address}>{t.symbol}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between mt-1">
              <button type="button" onClick={handleMax} disabled={!inputBalanceFormatted || parseFloat(inputBalanceFormatted) <= 0} className="text-xs font-medium text-[var(--swap-accent)] hover:opacity-80 disabled:opacity-50">Max</button>
              {inputBalanceFormatted != null && (
                <span className="text-xs text-slate-500">Balance: {parseFloat(inputBalanceFormatted).toLocaleString("en-US", { maximumFractionDigits: 6 })} {inputToken.symbol}</span>
              )}
            </div>
            {inputUsdValue != null && inputUsdValue > 0 && (
              <p className="text-xs text-slate-400 mt-1">≈ ${inputUsdValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</p>
            )}
          </div>

          <div>
            <p className="text-xs text-[var(--delta-text-muted)] mb-2">To {activeTab !== "bridge" && "(same chain)"}</p>
            <select
              value={toChainId}
              onChange={(e) => {
                if (activeTab === "bridge") {
                  const id = Number(e.target.value);
                  setToChainId(id);
                  setOutputToken(TOKENS_BY_CHAIN[id]?.[0] ?? outputTokens[0]);
                  setQuote(null);
                  setSwapQuote(null);
                  setAcrossQuote(null);
                  setQuoteReceivedAt(null);
                  setShowSignConfirm(false);
                }
              }}
              disabled={activeTab !== "bridge"}
              className={`w-full rounded-xl border text-white text-sm px-3 py-2 mb-2 ${
                activeTab === "bridge"
                  ? "bg-[var(--swap-pill-bg)] border-[var(--swap-pill-border)]"
                  : "bg-[var(--swap-pill-bg)]/60 border-[var(--swap-pill-border)]/60 cursor-not-allowed opacity-80"
              }`}
            >
              {CHAINS.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="flex gap-2 items-center rounded-xl bg-[var(--swap-pill-bg)] border border-[var(--swap-pill-border)] px-3 py-2">
              <span className="flex-1 text-white text-lg font-medium">{outputAmount}</span>
              <select
                value={outputToken.address}
                onChange={(e) => {
                  const t = outputTokens.find((x) => x.address === e.target.value);
                  if (t) setOutputToken(t);
                  setQuote(null);
                  setSwapQuote(null);
                  setAcrossQuote(null);
                  setQuoteReceivedAt(null);
                  setShowSignConfirm(false);
                }}
                className="rounded-lg bg-[var(--delta-card)] border border-[var(--swap-pill-border)] text-white text-sm px-2 py-1.5"
              >
                {outputTokens.map((t) => (
                  <option key={t.address} value={t.address}>{t.symbol}</option>
                ))}
              </select>
            </div>
            {outputBalanceFormatted != null && (
              <p className="text-xs text-slate-500 mt-1">Balance: {parseFloat(outputBalanceFormatted).toLocaleString("en-US", { maximumFractionDigits: 6 })} {outputToken.symbol}</p>
            )}
            {outputUsdValue != null && outputUsdValue > 0 && (
              <p className="text-xs text-slate-400 mt-1">≈ ${outputUsdValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</p>
            )}
          </div>

          {needsChainSwitch && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 space-y-2">
              <p className="text-amber-400 text-xs">Your wallet is on a different network. The transaction must be sent from {CHAINS.find((c) => c.id === fromChainId)?.name}.</p>
              <button
                type="button"
                onClick={() => switchChain?.({ chainId: fromChainId })}
                className="w-full text-xs font-medium text-amber-400 hover:text-amber-300 px-3 py-2 rounded-lg border border-amber-500/50 hover:bg-amber-500/10"
              >
                Switch to {CHAINS.find((c) => c.id === fromChainId)?.name}
              </button>
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {txHash && swapping && (
            <p className="text-center text-sm text-amber-400/90">
              Confirming transaction…{" "}
              <a href={`${EXPLORER_URL[txChainId ?? fromChainId] ?? "https://basescan.org"}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">
                View on explorer
              </a>
            </p>
          )}
          {txHash && !completedAction && !swapping && error && (
            <a href={`${EXPLORER_URL[txChainId ?? fromChainId] ?? "https://basescan.org"}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="block text-center text-sm text-sky-400 hover:underline">
              View failed transaction
            </a>
          )}

          <div className="flex flex-col gap-2">
            {txHash && completedAction ? (
              <>
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-center">
                  <p className="text-emerald-400 font-semibold text-lg">
                    {completedAction === "wrap" && "Wrap complete"}
                    {completedAction === "unwrap" && "Unwrap complete"}
                    {completedAction === "swap" && "Swap complete"}
                    {completedAction === "bridge" && "Bridge complete"}
                    {!completedAction && "Complete"}
                  </p>
                </div>
                <a
                  href={`${EXPLORER_URL[txChainId ?? fromChainId] ?? "https://basescan.org"}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-2xl bg-[#2d2d3d] hover:bg-[#3d3d4d] text-sky-400 font-semibold text-base text-center border border-sky-500/30"
                >
                  View transaction
                </a>
                <button
                  onClick={resetForNextAction}
                  className="w-full py-4 rounded-2xl bg-[var(--swap-accent)] hover:opacity-90 text-white font-semibold text-base"
                >
                  Next swap
                </button>
              </>
            ) : (
              <>
            {swapTabWithWrapSelection && (
              <p className="text-amber-400/90 text-sm text-center py-2">Use the Wrap tab for native ↔ wrapped</p>
            )}
            {!(effectiveIsWrap || effectiveIsUnwrap) && (
              <button
                onClick={fetchQuote}
                disabled={isGetQuoteDisabled}
                className="w-full py-3 rounded-2xl bg-[#2d2d3d] hover:bg-[#3d3d4d] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--swap-accent)] font-semibold text-base"
              >
                {loading ? "Getting quote..." : "Get quote"}
              </button>
            )}

            {(effectiveIsWrap || effectiveIsUnwrap) && (
              <button
                onClick={execute}
                disabled={!amount || parseFloat(amount) <= 0 || swapping || needsChainSwitch}
                className="w-full py-4 rounded-2xl bg-[#2d2d3d] hover:bg-[#3d3d4d] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--swap-accent)] font-semibold text-base"
              >
                {swapping ? "Swapping..." : effectiveIsWrap ? "Wrap" : "Unwrap"}
              </button>
            )}

            {hasQuote && quoteBreakdown && !effectiveIsWrap && !effectiveIsUnwrap && (
              <div className="rounded-xl bg-[var(--swap-pill-bg)] border border-[var(--swap-pill-border)] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Quote breakdown</p>
                  {quoteCountdown != null && (
                    <span className={`text-xs font-mono ${quoteCountdown <= 10 ? "text-amber-400" : "text-slate-500"}`}>
                      {quoteCountdown}s
                    </span>
                  )}
                </div>
                {quoteBreakdown.sources.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Route:</span>
                    <span className="text-sm text-white">{quoteBreakdown.sources.join(" → ")}</span>
                  </div>
                )}
                {quoteBreakdown.feeItems.map((f) => (
                  <div key={f.label} className="flex justify-between items-baseline text-sm gap-2">
                    <span className="text-slate-500">{f.label}</span>
                    <span className="text-right">
                      <span className="text-white">{f.value}</span>
                      {f.valueUsd && <span className="text-slate-400 ml-1">({f.valueUsd})</span>}
                    </span>
                  </div>
                ))}
                {quoteBreakdown.gasWei != null && (
                  <>
                    <div className="flex justify-between items-baseline text-sm gap-2">
                      <span className="text-slate-500">Est. gas</span>
                      <span className="text-right">
                        <span className="text-white">~{formatUnits(quoteBreakdown.gasWei, 18)} {fromChainId === 137 ? "MATIC" : fromChainId === 56 ? "BNB" : "ETH"}</span>
                        {quoteBreakdown.gasUsd && (
                          <span className="text-slate-400 ml-1">({quoteBreakdown.gasUsd})</span>
                        )}
                      </span>
                    </div>
                    {gasPriceWei != null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Gas price</span>
                        <span className="text-white">~{formatUnits(gasPriceWei, 9)} Gwei</span>
                      </div>
                    )}
                  </>
                )}
                {quoteBreakdown.totalFeesUsd && (
                  <div className="flex justify-between text-sm font-medium pt-2 border-t border-slate-700/50 mt-1">
                    <span className="text-slate-400">Total fees</span>
                    <span className="text-white">{quoteBreakdown.totalFeesUsd}</span>
                  </div>
                )}
                {quoteBreakdown.type === "gasless" && (
                  <p className="text-xs text-emerald-400">Gasless — no gas to pay</p>
                )}
                {quoteBreakdown.type === "crosschain" && (
                  <p className="text-xs text-amber-400/90">Using Ledger? Have it ready before clicking Swap — sign within 60 seconds.</p>
                )}
                {quoteBreakdown.type !== "gasless" && needsChainSwitch && (
                  <p className="text-xs text-amber-400">Switch to origin chain to see gas estimate</p>
                )}
                <p className="text-xs text-slate-500 pt-1">
                  {quoteCountdown != null ? `Quote expires in ${quoteCountdown}s` : "Quote refreshes every 30s"}
                </p>
                <p className="text-xs text-amber-400/90 pt-2 border-t border-slate-700/50 mt-2">
                  <strong>Wallet shows &quot;could not load fee rates&quot;?</strong> Approve the token first (click Approve if shown), get a fresh quote, then try Swap again. We pass gas to your wallet to avoid this.
                </p>
              </div>
            )}

            {showSignConfirm && !isSameChain && hasQuote && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 space-y-3">
                <p className="text-amber-400 text-sm font-medium">
                  Have your Ledger ready and unlocked. We&apos;ll fetch a fresh quote and prompt you to sign. Sign within 60 seconds.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSignConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl bg-[#2d2d3d] hover:bg-[#3d3d4d] text-slate-300 font-medium text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmAndExecuteCrossChain}
                    disabled={swapping}
                    className="flex-1 py-2.5 rounded-xl bg-[var(--swap-accent)] hover:opacity-90 disabled:opacity-50 text-white font-semibold text-sm"
                  >
                    {swapping ? "Fetching & signing..." : "Continue to sign"}
                  </button>
                </div>
              </div>
            )}
            {hasQuote && !effectiveIsWrap && !effectiveIsUnwrap && !showSignConfirm && (
              <button
                onClick={execute}
                disabled={isSwapDisabled}
                className="w-full py-4 rounded-2xl bg-[var(--swap-accent)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-base"
              >
                {swapping ? "Swapping..." : "Swap"}
              </button>
            )}
            {isQuoteExpiredError && (
              <button
                onClick={async () => {
                  setError(null);
                  await fetchQuote();
                  if (!isSameChain) setShowSignConfirm(true);
                }}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm"
              >
                Retry with fresh quote
              </button>
            )}

            {needsManualApproval && quote?.issues?.allowance && (
              <button
                onClick={async () => {
                  setApprovingInProgress(true);
                  setError(null);
                  try {
                    const approveHash = await walletClient?.writeContract({
                      address: inputToken.address as `0x${string}`,
                      abi: ERC20_APPROVE_ABI,
                      functionName: "approve",
                      args: [(quote?.issues?.allowance?.spender ?? ALLOWANCE_HOLDER) as `0x${string}`, maxUint256],
                    });
                    if (approveHash && publicClient) await publicClient.waitForTransactionReceipt({ hash: approveHash });
                    setNeedsManualApproval(false);
                    execute();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Approval failed");
                  } finally {
                    setApprovingInProgress(false);
                  }
                }}
                disabled={approvingInProgress}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-semibold text-sm"
              >
                {approvingInProgress ? "Check wallet" : `Approve ${inputToken.symbol}`}
              </button>
            )}
              </>
            )}
          </div>

          <p className="text-xs text-slate-500 text-center mt-4">
            {isSameChain ? "Same-chain swaps use 0x. Wrap/unwrap is 1:1." : "Cross-chain swaps take ~2-10 seconds. Gas on origin chain only."}
          </p>
        </div>
      )}
    </div>
  );
}
