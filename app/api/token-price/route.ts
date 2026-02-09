import { NextRequest, NextResponse } from "next/server";

const CHAIN_TO_PLATFORM: Record<string, string> = {
  "1": "ethereum",
  "56": "binance-smart-chain",
  "137": "polygon-pos",
  "42161": "arbitrum-one",
  "8453": "base",
};

export async function GET(request: NextRequest) {
  const chainId = request.nextUrl.searchParams.get("chainId");
  const address = request.nextUrl.searchParams.get("address");
  if (!chainId || !address) {
    return NextResponse.json({ error: "chainId and address required" }, { status: 400 });
  }
  const platform = CHAIN_TO_PLATFORM[chainId];
  if (!platform) {
    return NextResponse.json({ error: "Unsupported chain for price" }, { status: 400 });
  }
  try {
    const url = `https://api.coingecko.com/api/v3/simple/token_price/${platform}?contract_addresses=${encodeURIComponent(address)}&vs_currencies=usd`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    const data = (await res.json().catch(() => ({}))) as Record<string, { usd?: number }>;
    const lower = address.toLowerCase();
    const price = data[lower]?.usd ?? null;
    return NextResponse.json({ usd: price });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Price fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
