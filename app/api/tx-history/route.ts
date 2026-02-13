import { NextRequest, NextResponse } from "next/server";

const EXPLORER_API: Record<number, string> = {
  1: "https://api.etherscan.io",
  8453: "https://api.basescan.org",
  42161: "https://api.arbiscan.io",
  137: "https://api.polygonscan.com",
  56: "https://api.bscscan.com",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const chainId = searchParams.get("chainId");
  const apiKey = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;

  if (!address || !chainId) {
    return NextResponse.json({ error: "address and chainId required" }, { status: 400 });
  }

  const base = EXPLORER_API[Number(chainId)];
  if (!base) {
    return NextResponse.json({ error: "Unsupported chain" }, { status: 400 });
  }

  const url = new URL("/api", base);
  url.searchParams.set("module", "account");
  url.searchParams.set("action", "txlist");
  url.searchParams.set("address", address);
  url.searchParams.set("sort", "desc");
  url.searchParams.set("page", "1");
  url.searchParams.set("offset", "50");
  if (apiKey) url.searchParams.set("apikey", apiKey);

  try {
    const res = await fetch(url.toString());
    const data = await res.json().catch(() => ({}));
    if (data.status === "0" && data.message !== "OK") {
      return NextResponse.json({ transactions: [] });
    }
    const txs = Array.isArray(data.result) ? data.result : [];
    return NextResponse.json({ transactions: txs });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
