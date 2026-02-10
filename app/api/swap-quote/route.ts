import { NextRequest, NextResponse } from "next/server";

const ZERO_EX_API_KEY = process.env.NEXT_PUBLIC_ZERO_EX_API_KEY || process.env.ZERO_EX_API_KEY;

/** 0x uses this address to mean "native token" (ETH, BNB, MATIC, etc.) */
export const NATIVE_TOKEN_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

export async function GET(request: NextRequest) {
  if (!ZERO_EX_API_KEY) {
    return NextResponse.json(
      { error: "0x API key not configured." },
      { status: 500 }
    );
  }
  const { searchParams } = new URL(request.url);
  const url = new URL("https://api.0x.org/swap/allowance-holder/quote");
  searchParams.forEach((value, key) => url.searchParams.set(key, value));
  try {
    const res = await fetch(url.toString(), {
      headers: {
        "Content-Type": "application/json",
        "0x-api-key": ZERO_EX_API_KEY,
        "0x-version": "v2",
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.reason || data?.message || `0x Swap API ${res.status}`, details: data },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Swap quote failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
