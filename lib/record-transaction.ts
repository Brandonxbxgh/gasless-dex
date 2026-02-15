export type TransactionAction = "swap" | "bridge" | "send" | "wrap" | "unwrap";

export async function recordTransaction(params: {
  txHash: string;
  chainId: number;
  address: string;
  actionType: TransactionAction;
  fromToken?: string;
  toToken?: string;
  fromChainId?: number;
  toChainId?: number;
  fromAmount?: string;
  toAmount?: string;
  fromAmountUsd?: string;
  toAmountUsd?: string;
}) {
  try {
    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  } catch {
    // Silently fail - don't block UX
  }
}
