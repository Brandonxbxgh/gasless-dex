import { NextResponse } from "next/server";

const COINGECKO_IDS: Record<string, string> = {
  ETH: "ethereum",
  WETH: "ethereum",
  SOL: "solana",
  USDC: "usd-coin",
  USDT: "tether",
  DAI: "dai",
  MATIC: "matic-network",
  WMATIC: "matic-network",
  BNB: "binancecoin",
  WBNB: "binancecoin",
  DOGE: "dogecoin",
  PEPE: "pepe",
  SHIB: "shiba-inu",
  UNI: "uniswap",
  LINK: "chainlink",
  AAVE: "aave",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get("symbols")?.split(",").filter(Boolean) ?? [];
  const ids = Array.from(new Set(symbols.map((s) => COINGECKO_IDS[s] ?? s.toLowerCase()).filter(Boolean)));
  if (ids.length === 0) {
    return NextResponse.json({});
  }
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd`,
      { next: { revalidate: 60 } }
    );
    const data = (await res.json()) as Record<string, { usd: number }>;
    const bySymbol: Record<string, number> = {};
    for (const [id, prices] of Object.entries(data)) {
      const sym = Object.entries(COINGECKO_IDS).find(([, v]) => v === id)?.[0] ?? id.toUpperCase();
      bySymbol[sym] = prices?.usd ?? 0;
    }
    return NextResponse.json(bySymbol);
  } catch (e) {
    return NextResponse.json({}, { status: 500 });
  }
}
