import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const inputMint = searchParams.get("inputMint");
  const outputMint = searchParams.get("outputMint");
  const amount = searchParams.get("amount");
  const slippageBps = searchParams.get("slippageBps") || "50";

  if (!inputMint || !outputMint || !amount) {
    return NextResponse.json({ error: "inputMint, outputMint, amount required" }, { status: 400 });
  }

  const url = new URL("https://api.jup.ag/swap/v1/quote");
  url.searchParams.set("inputMint", inputMint);
  url.searchParams.set("outputMint", outputMint);
  url.searchParams.set("amount", amount);
  url.searchParams.set("slippageBps", slippageBps);
  url.searchParams.set("restrictIntermediateTokens", "true");

  const solanaFeeRecipient = process.env.NEXT_PUBLIC_SOLANA_FEE_RECIPIENT;
  if (solanaFeeRecipient) {
    url.searchParams.set("platformFeeBps", "10");
  }

  const apiKey = process.env.JUPITER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Solana swaps are temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(url.toString(), {
      headers: { "x-api-key": apiKey },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ error: data?.error || data?.message || "Jupiter quote failed", details: data }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Quote failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
