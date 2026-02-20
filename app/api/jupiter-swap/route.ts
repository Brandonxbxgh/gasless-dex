import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

export async function POST(request: NextRequest) {
  const apiKey = process.env.JUPITER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Solana swaps are temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const solanaFeeRecipient = process.env.NEXT_PUBLIC_SOLANA_FEE_RECIPIENT;

    if (solanaFeeRecipient && body.quoteResponse) {
      const outputMint = body.quoteResponse.outputMint;
      if (outputMint) {
        try {
          const feeAccount = getAssociatedTokenAddressSync(
            new PublicKey(outputMint),
            new PublicKey(solanaFeeRecipient)
          );
          body.feeAccount = feeAccount.toBase58();
        } catch {
          // Invalid address or mint — skip fee
        }
      }
    }

    const res = await fetch("https://api.jup.ag/swap/v1/swap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ error: data?.error || data?.message || "Jupiter swap failed", details: data }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Swap failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
