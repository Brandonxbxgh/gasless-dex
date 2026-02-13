/**
 * Across Protocol Swap API - cross-chain swaps
 * Docs: https://docs.across.to/developer-quickstart/crosschain-swap
 */

const ACROSS_API = "https://app.across.to/api";

export interface AcrossQuoteParams {
  tradeType: "exactInput" | "minOutput" | "exactOutput";
  amount: string;
  inputToken: string;
  outputToken: string;
  originChainId: number;
  destinationChainId: number;
  depositor: string;
  recipient?: string;
  slippage?: string;
}

export interface AcrossQuoteResponse {
  approvalTxns?: { to: string; data: string; value?: string }[];
  swapTx: { to: string; data: string; value?: string };
  steps?: {
    bridge?: { outputAmount: string; tokenOut?: { decimals: number; symbol: string } };
    swap?: { outputAmount: string };
  };
}

export async function getAcrossQuote(params: AcrossQuoteParams): Promise<AcrossQuoteResponse> {
  const search = new URLSearchParams();
  search.set("tradeType", params.tradeType);
  search.set("amount", params.amount);
  search.set("inputToken", params.inputToken);
  search.set("outputToken", params.outputToken);
  search.set("originChainId", String(params.originChainId));
  search.set("destinationChainId", String(params.destinationChainId));
  search.set("depositor", params.depositor);
  if (params.recipient) search.set("recipient", params.recipient);
  if (params.slippage) search.set("slippage", params.slippage);

  const res = await fetch(`${ACROSS_API}/swap/approval?${search.toString()}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || data?.error || `Across API ${res.status}`;
    throw new Error(msg);
  }
  return data;
}
