"use client";

import { useState, useCallback } from "react";
import { useAccount, useChainId, useSwitchChain, useWalletClient, useBalance } from "wagmi";
import { parseUnits, isAddress } from "viem";
import { mainnet } from "viem/chains";
import { createPublicClient, http, getEnsAddress } from "viem";
import { QRCodeSVG } from "qrcode.react";
import { CHAINS, TOKENS_BY_CHAIN } from "@/lib/send-tokens";

const ERC20_TRANSFER_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

function isEnsName(value: string): boolean {
  return value.endsWith(".eth") && value.length > 4;
}

export function SendReceive({
  activeTab,
  onTabChange,
}: {
  activeTab: "send" | "receive";
  onTabChange: (tab: "send" | "receive") => void;
}) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { data: walletClient } = useWalletClient();

  const [sendChainId, setSendChainId] = useState(8453);
  const [sendToken, setSendToken] = useState(TOKENS_BY_CHAIN[8453]?.[0] ?? { address: "", symbol: "", decimals: 18 });
  const [sendAmount, setSendAmount] = useState("");
  const [sendRecipient, setSendRecipient] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolvingEns, setResolvingEns] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendTxHash, setSendTxHash] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [receiveChainId, setReceiveChainId] = useState(8453);
  const [receiveToken, setReceiveToken] = useState(TOKENS_BY_CHAIN[8453]?.[1] ?? { address: "", symbol: "USDC", decimals: 6 });

  const tokensForSend = TOKENS_BY_CHAIN[sendChainId] ?? TOKENS_BY_CHAIN[1];
  const tokensForReceive = TOKENS_BY_CHAIN[receiveChainId] ?? TOKENS_BY_CHAIN[1];

  const { data: sendBalance } = useBalance({
    address: address ?? undefined,
    chainId: sendChainId,
    token: sendToken.isNative ? undefined : (sendToken.address as `0x${string}`),
  });

  const resolveEns = useCallback(async (name: string) => {
    if (!name.endsWith(".eth")) return null;
    try {
      const client = createPublicClient({
        chain: mainnet,
        transport: http(process.env.NEXT_PUBLIC_ALCHEMY_ETH_URL || "https://eth.llamarpc.com"),
      });
      const ensName = name.toLowerCase().replace(/\.eth$/i, "");
      return await getEnsAddress(client, { name: ensName });
    } catch {
      return null;
    }
  }, []);

  const handleRecipientChange = useCallback(
    async (value: string) => {
      setSendRecipient(value);
      setResolvedAddress(null);
      if (isEnsName(value)) {
        setResolvingEns(true);
        try {
          const resolved = await resolveEns(value);
          setResolvedAddress(resolved ?? null);
        } finally {
          setResolvingEns(false);
        }
      } else if (value && isAddress(value)) {
        setResolvedAddress(value);
      }
    },
    [resolveEns]
  );

  const recipientAddress = resolvedAddress ?? (sendRecipient && isAddress(sendRecipient) ? sendRecipient : null);

  const handleSend = useCallback(async () => {
    if (!walletClient || !address || !recipientAddress || !sendAmount) return;
    const amountWei = parseUnits(sendAmount, sendToken.decimals);
    if (amountWei === BigInt(0)) return;

    if (chainId !== sendChainId) {
      setSendError("Please switch to the correct chain first.");
      return;
    }

    setSending(true);
    setSendError(null);
    setSendTxHash(null);
    try {
      if (sendToken.isNative) {
        const hash = await walletClient.sendTransaction({
          to: recipientAddress as `0x${string}`,
          value: amountWei,
          chain: undefined,
        });
        setSendTxHash(hash);
      } else {
        const hash = await walletClient.writeContract({
          address: sendToken.address as `0x${string}`,
          abi: ERC20_TRANSFER_ABI,
          functionName: "transfer",
          args: [recipientAddress as `0x${string}`, amountWei],
        });
        setSendTxHash(hash);
      }
      setSendAmount("");
      setSendRecipient("");
      setResolvedAddress(null);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  }, [walletClient, address, recipientAddress, sendAmount, sendToken, chainId, sendChainId, switchChain]);

  const copyAddress = useCallback(() => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [address]);

  const EXPLORER_URL: Record<number, string> = {
    1: "https://etherscan.io",
    8453: "https://basescan.org",
    42161: "https://arbiscan.io",
    137: "https://polygonscan.com",
    10: "https://optimism.etherscan.io",
    56: "https://bscscan.com",
  };
  const explorerUrl = EXPLORER_URL[sendChainId] ?? "https://etherscan.io";

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex rounded-xl bg-[var(--swap-pill-bg)] border border-[var(--swap-pill-border)] p-1">
        <button
          type="button"
          onClick={() => onTabChange("send")}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "send" ? "bg-[var(--swap-accent)]/20 text-[var(--swap-accent)]" : "text-slate-400 hover:text-white"
          }`}
        >
          Send
        </button>
        <button
          type="button"
          onClick={() => onTabChange("receive")}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "receive" ? "bg-[var(--swap-accent)]/20 text-[var(--swap-accent)]" : "text-slate-400 hover:text-white"
          }`}
        >
          Receive
        </button>
      </div>

      {activeTab === "send" ? (
        /* Send form */
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[var(--delta-text-muted)] mb-1.5">Chain</label>
            <select
              value={sendChainId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setSendChainId(id);
                const tokens = TOKENS_BY_CHAIN[id];
                setSendToken(tokens?.[0] ?? sendToken);
              }}
              className="w-full rounded-xl bg-[var(--swap-pill-bg)] border border-[var(--swap-pill-border)] px-4 py-3 text-white"
            >
              {CHAINS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[var(--delta-text-muted)] mb-1.5">Token</label>
            <select
              value={sendToken.symbol}
              onChange={(e) => {
                const t = tokensForSend.find((x) => x.symbol === e.target.value);
                if (t) setSendToken(t);
              }}
              className="w-full rounded-xl bg-[var(--swap-pill-bg)] border border-[var(--swap-pill-border)] px-4 py-3 text-white"
            >
              {tokensForSend.map((t) => (
                <option key={t.symbol} value={t.symbol}>
                  {t.symbol}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs text-[var(--delta-text-muted)]">Amount</label>
              {sendBalance?.formatted != null && chainId === sendChainId && (
                <button
                  type="button"
                  onClick={() => setSendAmount(sendBalance.formatted)}
                  className="text-xs text-[var(--swap-accent)] hover:underline"
                >
                  Max
                </button>
              )}
            </div>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={sendAmount}
              onChange={(e) => setSendAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              className="w-full rounded-xl bg-[var(--swap-pill-bg)] border border-[var(--swap-pill-border)] px-4 py-3 text-white placeholder-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--delta-text-muted)] mb-1.5">Recipient (address or ENS)</label>
            <input
              type="text"
              placeholder="0x... or name.eth"
              value={sendRecipient}
              onChange={(e) => handleRecipientChange(e.target.value)}
              className="w-full rounded-xl bg-[var(--swap-pill-bg)] border border-[var(--swap-pill-border)] px-4 py-3 text-white placeholder-slate-500"
            />
            {resolvingEns && <p className="mt-1 text-xs text-amber-400">Resolving ENS…</p>}
            {sendRecipient && !recipientAddress && !resolvingEns && isEnsName(sendRecipient) && (
              <p className="mt-1 text-xs text-red-400">ENS not found</p>
            )}
          </div>
          {chainId !== sendChainId && switchChain && (
            <button
              type="button"
              onClick={() => switchChain({ chainId: sendChainId })}
              className="w-full rounded-xl border border-amber-400/50 text-amber-400 py-2.5 text-sm font-medium hover:bg-amber-400/10 transition-colors"
            >
              Switch to {CHAINS.find((c) => c.id === sendChainId)?.name}
            </button>
          )}
          <button
            type="button"
            onClick={handleSend}
            disabled={!recipientAddress || !sendAmount || sending || chainId !== sendChainId}
            className="w-full rounded-xl bg-[var(--swap-accent)] text-white font-semibold py-3 px-4 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {sending ? "Sending…" : "Send"}
          </button>
          {sendError && <p className="text-sm text-red-400">{sendError}</p>}
          {sendTxHash && (
            <a
              href={`${explorerUrl}/tx/${sendTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-sky-400 hover:underline"
            >
              View transaction →
            </a>
          )}
        </div>
      ) : (
        /* Receive */
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[var(--delta-text-muted)] mb-1.5">Receive on chain</label>
            <select
              value={receiveChainId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setReceiveChainId(id);
                const tokens = TOKENS_BY_CHAIN[id];
                setReceiveToken(tokens?.[1] ?? tokens?.[0] ?? receiveToken);
              }}
              className="w-full rounded-xl bg-[var(--swap-pill-bg)] border border-[var(--swap-pill-border)] px-4 py-3 text-white"
            >
              {CHAINS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[var(--delta-text-muted)] mb-1.5">Token to receive</label>
            <select
              value={receiveToken.symbol}
              onChange={(e) => {
                const t = tokensForReceive.find((x) => x.symbol === e.target.value);
                if (t) setReceiveToken(t);
              }}
              className="w-full rounded-xl bg-[var(--swap-pill-bg)] border border-[var(--swap-pill-border)] px-4 py-3 text-white"
            >
              {tokensForReceive.map((t) => (
                <option key={t.symbol} value={t.symbol}>
                  {t.symbol}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-[var(--delta-text-muted)]">
            Send <span className="text-white font-medium">{receiveToken.symbol}</span> on{" "}
            <span className="text-white font-medium">{CHAINS.find((c) => c.id === receiveChainId)?.name}</span> to this
            address:
          </p>
          <div className="rounded-xl bg-[var(--swap-pill-bg)] border border-[var(--swap-pill-border)] p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="shrink-0">
              <QRCodeSVG value={address ?? ""} size={140} level="M" includeMargin />
            </div>
            <div className="flex-1 min-w-0 w-full sm:w-auto">
              <p className="font-mono text-sm text-white break-all">{address}</p>
              <button
                type="button"
                onClick={copyAddress}
                className="mt-2 text-sm text-[var(--swap-accent)] hover:underline"
              >
                {copied ? "Copied!" : "Copy address"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
