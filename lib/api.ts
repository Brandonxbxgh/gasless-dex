/**
 * 0x Gasless API v2 - Quote, Submit, and Status
 * Docs: https://0x.org/docs/upgrading/upgrading_to_gasless_v2
 */

const BASE_URL = "https://api.0x.org";

function getHeaders(): HeadersInit {
  const apiKey = process.env.NEXT_PUBLIC_ZERO_EX_API_KEY;
  if (!apiKey) throw new Error("NEXT_PUBLIC_ZERO_EX_API_KEY is not set");
  return {
    "Content-Type": "application/json",
    "0x-api-key": apiKey,
    "0x-version": "v2",
  };
}

export interface GaslessPriceParams {
  chainId: number;
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  taker?: string;
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

async function fetchJsonOrThrow(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (!res.ok || !ct.includes("application/json")) {
    const bodyText = await res.text().catch(() => "<unreadable body>");
    throw new Error(`0x API Error ${res.status}: ${bodyText}`);
  }
  return res.json();
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") search.set(k, String(v));
  }
  return search.toString();
}

/** Get indicative price (no taker required) */
export async function getGaslessPrice(
  params: GaslessPriceParams
): Promise<GaslessQuoteResponse> {
  const qs = buildQuery({
    chainId: params.chainId,
    sellToken: params.sellToken,
    buyToken: params.buyToken,
    sellAmount: params.sellAmount,
    taker: params.taker,
    swapFeeBps: params.swapFeeBps,
    swapFeeRecipient: params.swapFeeRecipient,
    swapFeeToken: params.swapFeeToken,
    tradeSurplusRecipient: params.tradeSurplusRecipient,
    slippageBps: params.slippageBps ?? 100,
  });
  const res = await fetch(`${BASE_URL}/gasless/price?${qs}`, {
    headers: getHeaders(),
  });
  return fetchJsonOrThrow(res);
}

/** Get firm quote (taker required) - includes EIP-712 data for signing */
export async function getGaslessQuote(
  params: GaslessQuoteParams
): Promise<GaslessQuoteResponse> {
  const qs = buildQuery({
    chainId: params.chainId,
    sellToken: params.sellToken,
    buyToken: params.buyToken,
    sellAmount: params.sellAmount,
    taker: params.taker,
    swapFeeBps: params.swapFeeBps,
    swapFeeRecipient: params.swapFeeRecipient,
    swapFeeToken: params.swapFeeToken,
    tradeSurplusRecipient: params.tradeSurplusRecipient,
    slippageBps: params.slippageBps ?? 100,
  });
  const res = await fetch(`${BASE_URL}/gasless/quote?${qs}`, {
    headers: getHeaders(),
  });
  return fetchJsonOrThrow(res);
}

/** Submit signed gasless swap */
export async function submitGaslessSwap(
  body: SubmitRequestBody
): Promise<{ tradeHash: string }> {
  const res = await fetch(`${BASE_URL}/gasless/submit`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  return fetchJsonOrThrow(res);
}

/** Check trade status */
export async function getGaslessStatus(
  tradeHash: string,
  chainId: number
): Promise<{ status: string; transactionHash?: string }> {
  const qs = buildQuery({ chainId });
  const res = await fetch(`${BASE_URL}/gasless/status/${tradeHash}?${qs}`, {
    headers: getHeaders(),
  });
  return fetchJsonOrThrow(res);
}
