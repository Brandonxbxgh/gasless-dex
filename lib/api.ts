/**
 * 0x Gasless API v2 - via Next.js API routes (avoids CORS, keeps key server-side)
 * Docs: https://0x.org/docs/upgrading/upgrading_to_gasless_v2
 */

export interface GaslessPriceParams {
  chainId: number;
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  taker?: string;
  recipient?: string; // optional; defaults to taker if not set
  swapFeeBps?: string;
  swapFeeRecipient?: string;
  swapFeeToken?: string;
  tradeSurplusRecipient?: string;
  slippageBps?: number;
}

export interface GaslessQuoteParams extends GaslessPriceParams {
  taker: string; // Required for quote
}

export interface GaslessQuoteResponse {
  approval?: {
    type: string;
    hash: string;
    eip712: EIP712Data;
  };
  trade: {
    type: string;
    hash: string;
    eip712: EIP712Data;
  };
  sellAmount: string;
  buyAmount: string;
  minBuyAmount: string;
  sellToken: string;
  buyToken: string;
  fees?: {
    integratorFee?: { amount: string; token: string; type: string };
    zeroExFee?: { amount: string; token: string; type: string };
    gasFee?: { amount: string; token: string; type: string };
  };
  issues?: {
    allowance?: { actual: string; spender: string };
    balance?: { token: string; actual: string; expected: string };
    simulationIncomplete?: boolean;
  };
  liquidityAvailable: boolean;
  route?: { fills: unknown[]; tokens: { address: string; symbol: string }[] };
}

export interface EIP712Data {
  types: Record<string, { name: string; type: string }[]>;
  domain: Record<string, unknown>;
  message: Record<string, unknown>;
  primaryType: string;
}

export interface SubmitRequestBody {
  trade: SignedTradeData;
  approval?: SignedApprovalData;
  chainId: number;
}

export interface SignedTradeData {
  type: string;
  eip712: EIP712Data;
  signature: {
    r: string;
    s: string;
    v: number;
    signatureType: number;
  };
}

export interface SignedApprovalData {
  type: string;
  eip712: EIP712Data;
  signature: {
    r: string;
    s: string;
    v: number;
    signatureType: number;
  };
}

async function handleResponse(res: Response) {
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json")
    ? await res.json().catch(() => ({}))
    : {};
  if (!res.ok) {
    const msg = data?.error || data?.reason || data?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") search.set(k, String(v));
  }
  return search.toString();
}

/** Get firm quote (taker required) - via our API route to avoid CORS */
export async function getGaslessQuote(
  params: GaslessQuoteParams
): Promise<GaslessQuoteResponse> {
  const qs = buildQuery({
    chainId: params.chainId,
    sellToken: params.sellToken,
    buyToken: params.buyToken,
    sellAmount: params.sellAmount,
    taker: params.taker,
    recipient: params.recipient,
    swapFeeBps: params.swapFeeBps,
    swapFeeRecipient: params.swapFeeRecipient,
    swapFeeToken: params.swapFeeToken,
    tradeSurplusRecipient: params.tradeSurplusRecipient,
    slippageBps: params.slippageBps ?? 100,
  });
  const res = await fetch(`/api/quote?${qs}`);
  return handleResponse(res) as Promise<GaslessQuoteResponse>;
}

/** Submit signed gasless swap */
export async function submitGaslessSwap(
  body: SubmitRequestBody
): Promise<{ tradeHash: string }> {
  const res = await fetch("/api/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse(res) as Promise<{ tradeHash: string }>;
}

/** Check trade status */
export async function getGaslessStatus(
  tradeHash: string,
  chainId: number
): Promise<{ status: string; transactionHash?: string }> {
  const res = await fetch(`/api/status/${encodeURIComponent(tradeHash)}?chainId=${chainId}`);
  return handleResponse(res) as Promise<{ status: string; transactionHash?: string }>;
}
