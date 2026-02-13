"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
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
import { WRAPPED_NATIVE, type SupportedChainId } from "@/lib/chains";
import { addToHistory } from "@/lib/history";

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
  const [acrossQuote, setAcrossQuote] = useState<{ approvalTxns?: { to: string; data: string; value?: string }[]; swapTx: { to: string; data: string; value?: string }; steps?: { bridge?: { outputAmount: string; tokenOut?: { decimals: number } } } } | null>(null);
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [needsManualApproval, setNeedsManualApproval] = useState(false);
  const [approvingInProgress, setApprovingInProgress] = useState(false);

  const isSameChain = fromChainId === toChainId;
  const needsChainSwitch = isConnected && chainId !== fromChainId;
  const inputTokens = TOKENS_BY_CHAIN[fromChainId] ?? TOKENS_BY_CHAIN[8453];
  const outputTokens = TOKENS_BY_CHAIN[toChainId] ?? TOKENS_BY_CHAIN[8453];

  const isInputNative = inputToken.address === NATIVE_TOKEN;
  const isOutputNative = outputToken.address === NATIVE_TOKEN;
  const isWrap = isSameChain && isInputNative && !isOutputNative && outputToken.symbol.startsWith("W");
  const isUnwrap = isSameChain && !isInputNative && inputToken.symbol.startsWith("W") && isOutputNative;

  const inputTokenForBalance = isInputNative ? undefined : (inputToken.address as `0x${string}`);
  const { data: inputBalanceRaw } = useReadContract({
    address: inputTokenForBalance,
    abi: ERC20_APPROVE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });
  const { data: nativeBalance } = useBalance({ address: isInputNative ? address : undefined });
  const { data: outputBalanceRaw } = useReadContract({
    address: isOutputNative ? undefined : (outputToken.address as `0x${string}`),
    abi: ERC20_APPROVE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });
  const { data: outputNativeBalance } = useBalance({ address: isOutputNative ? address : undefined });

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


  const outputAmount = useMemo(() => {
    if (isWrap || isUnwrap) return amount || "0";
    if (acrossQuote?.steps?.bridge?.outputAmount && acrossQuote.steps.bridge.tokenOut)
      return formatUnits(BigInt(acrossQuote.steps.bridge.outputAmount), acrossQuote.steps.bridge.tokenOut.decimals);
    if (quote) return formatUnits(BigInt(quote.buyAmount), getTokenDecimals(outputToken.symbol, toChainId));
    if (swapQuote) return formatUnits(BigInt(swapQuote.buyAmount), getTokenDecimals(outputToken.symbol, toChainId));
    return "0";
  }, [isWrap, isUnwrap, amount, acrossQuote, quote, swapQuote, outputToken.symbol, toChainId]);

  const hasQuote = !!(quote || swapQuote || acrossQuote);
  const canExecute = hasQuote || isWrap || isUnwrap;

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
          if (res.liquidityAvailable) setQuote(res);
          else setError("No liquidity available");
        }
      } else {
        const amountWei = parseUnits(amount, inputToken.decimals).toString();
        const res = await fetch(
          `/api/across-quote?tradeType=exactInput&amount=${amountWei}&inputToken=${inputToken.address}&outputToken=${outputToken.address}&originChainId=${fromChainId}&destinationChainId=${toChainId}&depositor=${address}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Quote failed");
        setAcrossQuote(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Quote failed");
    } finally {
      setLoading(false);
    }
  }, [address, amount, inputToken, outputToken, fromChainId, toChainId, isSameChain, isInputNative, isOutputNative]);

  const executeSameChain = useCallback(async () => {
    if (!walletClient || !address) return;
    setSwapping(true);
    setError(null);

    try {
      if (isWrap) {
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
        if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
        addToHistory({ chainId: fromChainId, chainName: CHAIN_NAME[fromChainId], txHash: hash, sellSymbol: inputToken.symbol, buySymbol: outputToken.symbol, sellAmount: amount, buyAmount: amount });
        setAmount("");
        setQuote(null);
        setSwapQuote(null);
      } else if (isUnwrap) {
        const amountWei = parseUnits(amount, 18);
        const wrappedAddr = WRAPPED_BY_CHAIN[fromChainId] as `0x${string}`;
        const hash = await walletClient.writeContract({
          address: wrappedAddr,
          abi: WETH_ABI,
          functionName: "withdraw",
          args: [amountWei],
        });
        setTxHash(hash);
        if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
        addToHistory({ chainId: fromChainId, chainName: CHAIN_NAME[fromChainId], txHash: hash, sellSymbol: inputToken.symbol, buySymbol: outputToken.symbol, sellAmount: amount, buyAmount: amount });
        setAmount("");
        setQuote(null);
        setSwapQuote(null);
      } else if (swapQuote?.transaction) {
        const spender = (swapQuote.allowanceTarget || swapQuote.issues?.allowance?.spender || swapQuote.transaction.to) as `0x${string}`;
        const sellAddr = inputToken.address as `0x${string}`;
        if (swapQuote.issues?.allowance && !isInputNative) {
          await walletClient.writeContract({ address: sellAddr, abi: ERC20_APPROVE_ABI, functionName: "approve", args: [spender, maxUint256] });
          const fresh = await getSwapQuote({
            chainId: fromChainId, sellToken: sellAddr, buyToken: (isOutputNative ? NATIVE_TOKEN_ADDRESS : outputToken.address) as `0x${string}`,
            sellAmount: swapQuote.sellAmount, taker: address, swapFeeBps: SWAP_FEE_BPS, swapFeeRecipient: SWAP_FEE_RECIPIENT, swapFeeToken: outputToken.address as `0x${string}`, tradeSurplusRecipient: SWAP_FEE_RECIPIENT, slippageBps: 100,
          });
          if (!fresh?.transaction) { setError("Quote expired"); setSwapping(false); return; }
          setSwapQuote(fresh);
        }
        const tx = (swapQuote.transaction ?? (await getSwapQuote({ chainId: fromChainId, sellToken: sellAddr, buyToken: (isOutputNative ? NATIVE_TOKEN_ADDRESS : outputToken.address) as `0x${string}`, sellAmount: swapQuote.sellAmount, taker: address, swapFeeBps: SWAP_FEE_BPS, swapFeeRecipient: SWAP_FEE_RECIPIENT, swapFeeToken: outputToken.address as `0x${string}`, tradeSurplusRecipient: SWAP_FEE_RECIPIENT, slippageBps: 100 })).transaction);
        const hash = await walletClient.sendTransaction({ to: tx!.to as `0x${string}`, data: tx!.data as `0x${string}`, value: BigInt(tx!.value || 0) });
        setTxHash(hash);
        if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
        addToHistory({
          chainId: fromChainId, chainName: CHAIN_NAME[fromChainId], txHash: hash,
          sellSymbol: inputToken.symbol, buySymbol: outputToken.symbol,
          sellAmount: formatUnits(BigInt(swapQuote.sellAmount), inputToken.decimals),
          buyAmount: formatUnits(BigInt(swapQuote.buyAmount), getTokenDecimals(outputToken.symbol, fromChainId)),
        });
        setAmount("");
        setSwapQuote(null);
      } else if (quote) {
        const tokenApprovalRequired = quote.issues?.allowance != null;
        const gaslessApprovalAvailable = quote.approval != null;
        let approvalData: SignedApprovalData | null = null;
        if (tokenApprovalRequired && gaslessApprovalAvailable && quote.approval) {
          const sig = await walletClient.signTypedData({
            account: address,
            domain: quote.approval.eip712.domain,
            types: quote.approval.eip712.types as Record<string, { name: string; type: string }[]>,
            primaryType: quote.approval.eip712.primaryType,
            message: quote.approval.eip712.message,
          });
          const split = splitSignature(sig as `0x${string}`);
          approvalData = { type: quote.approval.type, eip712: quote.approval.eip712, signature: { ...split, signatureType: SignatureType.EIP712 } };
        } else if (tokenApprovalRequired && !gaslessApprovalAvailable) {
          setNeedsManualApproval(true);
          setError("Approve token first, then try again.");
          setSwapping(false);
          return;
        }
        const tradeSig = await walletClient.signTypedData({
          account: address,
          domain: quote.trade.eip712.domain,
          types: quote.trade.eip712.types as Record<string, { name: string; type: string }[]>,
          primaryType: quote.trade.eip712.primaryType,
          message: quote.trade.eip712.message,
        });
        const tradeSplit = splitSignature(tradeSig as `0x${string}`);
        const { tradeHash: th } = await submitGaslessSwap({
          trade: { type: quote.trade.type, eip712: quote.trade.eip712, signature: { ...tradeSplit, signatureType: SignatureType.EIP712 } },
          approval: approvalData ?? undefined,
          chainId: fromChainId,
        });
        let st = await getGaslessStatus(th, fromChainId);
        for (let i = 0; i < 20 && st.status !== "confirmed"; i++) { await new Promise((r) => setTimeout(r, 2000)); st = await getGaslessStatus(th, fromChainId); }
        if (st.transactionHash) {
          setTxHash(st.transactionHash);
          addToHistory({ chainId: fromChainId, chainName: CHAIN_NAME[fromChainId], txHash: st.transactionHash, tradeHash: th, sellSymbol: inputToken.symbol, buySymbol: outputToken.symbol, sellAmount: formatUnits(BigInt(quote.sellAmount), inputToken.decimals), buyAmount: formatUnits(BigInt(quote.buyAmount), getTokenDecimals(outputToken.symbol, fromChainId)) });
        }
        setAmount("");
        setQuote(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Swap failed");
    } finally {
      setSwapping(false);
    }
  }, [walletClient, address, publicClient, isWrap, isUnwrap, amount, inputToken, outputToken, fromChainId, swapQuote, quote, isInputNative, isOutputNative]);

  const executeCrossChain = useCallback(async () => {
    if (!acrossQuote || !walletClient || !address) return;
    setSwapping(true);
    setError(null);
    try {
      if (needsChainSwitch && switchChain) {
        await switchChain({ chainId: fromChainId });
        await new Promise((r) => setTimeout(r, 1000));
      }
      if (acrossQuote.approvalTxns?.length) {
        for (const a of acrossQuote.approvalTxns) {
          const h = await walletClient.sendTransaction({ to: a.to as `0x${string}`, data: a.data as `0x${string}`, value: a.value ? BigInt(a.value) : undefined });
          if (publicClient) await publicClient.waitForTransactionReceipt({ hash: h });
        }
      }
      const s = acrossQuote.swapTx;
      const hash = await walletClient.sendTransaction({ to: s.to as `0x${string}`, data: s.data as `0x${string}`, value: s.value ? BigInt(s.value) : undefined });
      setTxHash(hash);
      setAmount("");
      setAcrossQuote(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Swap failed");
    } finally {
      setSwapping(false);
    }
  }, [acrossQuote, walletClient, address, publicClient, needsChainSwitch, switchChain, fromChainId]);

  const execute = useCallback(() => {
    if (isSameChain) executeSameChain();
    else executeCrossChain();
  }, [isSameChain, executeSameChain, executeCrossChain]);

  const primaryAction = useMemo(() => {
    if (isWrap) return "Wrap";
    if (isUnwrap) return "Unwrap";
    if (hasQuote) return "Swap";
    return "Get quote";
  }, [isWrap, isUnwrap, hasQuote]);

  const isPrimaryDisabled = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) return true;
    if (loading || swapping) return true;
    if (isSameChain && !isWrap && !isUnwrap && !hasQuote) return false;
    if (isSameChain && (isWrap || isUnwrap)) return false;
    if (isSameChain && hasQuote) return false;
    if (!isSameChain && !hasQuote) return false;
    return false;
  }, [amount, loading, swapping, isSameChain, isWrap, isUnwrap, hasQuote]);

  return (
    <div className="w-full max-w-md mx-auto rounded-3xl border p-6 sm:p-8 bg-[var(--delta-card)] border-[var(--swap-pill-border)] shadow-xl">
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-white mb-1">Swap</h1>
      <p className="text-center text-[var(--delta-text-muted)] text-sm mb-6">Swap, wrap, unwrap, or bridge across chains</p>

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
          </div>

          <div>
            <p className="text-xs text-[var(--delta-text-muted)] mb-2">To</p>
            <select
              value={toChainId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setToChainId(id);
                setOutputToken(TOKENS_BY_CHAIN[id]?.[0] ?? outputTokens[0]);
                setQuote(null);
                setSwapQuote(null);
                setAcrossQuote(null);
              }}
              className="w-full rounded-xl bg-[var(--swap-pill-bg)] border border-[var(--swap-pill-border)] text-white text-sm px-3 py-2 mb-2"
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
          </div>

          {needsChainSwitch && (
            <p className="text-amber-400 text-xs">Switch to {CHAINS.find((c) => c.id === fromChainId)?.name} to execute</p>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex flex-col gap-2">
            <button
              onClick={primaryAction === "Get quote" ? fetchQuote : execute}
              disabled={isPrimaryDisabled || needsChainSwitch}
              className="w-full py-4 rounded-2xl bg-[#2d2d3d] hover:bg-[#3d3d4d] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--swap-accent)] font-semibold text-base"
            >
              {loading ? "Getting quote..." : swapping ? "Swapping..." : primaryAction}
            </button>
            {needsManualApproval && quote?.issues?.allowance && (
              <button
                onClick={async () => {
                  setApprovingInProgress(true);
                  try {
                    await walletClient?.writeContract({
                      address: inputToken.address as `0x${string}`,
                      abi: ERC20_APPROVE_ABI,
                      functionName: "approve",
                      args: [(quote.issues.allowance.spender ?? ALLOWANCE_HOLDER) as `0x${string}`, maxUint256],
                    });
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
          </div>

          {txHash && (
            <a href={`${EXPLORER_URL[fromChainId] ?? "https://basescan.org"}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="block text-center text-sm text-sky-400 hover:underline">
              View transaction
            </a>
          )}

          <p className="text-xs text-slate-500 text-center mt-4">
            {isSameChain ? "Same-chain swaps use 0x. Wrap/unwrap is 1:1." : "Cross-chain swaps take ~2-10 seconds. Gas on origin chain only."}
          </p>
        </div>
      )}
    </div>
  );
}
