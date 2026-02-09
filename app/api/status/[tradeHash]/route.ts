import { NextRequest, NextResponse } from "next/server";

const ZERO_EX_API_KEY = process.env.NEXT_PUBLIC_ZERO_EX_API_KEY || process.env.ZERO_EX_API_KEY;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tradeHash: string }> }
) {
  if (!ZERO_EX_API_KEY) {
    return NextResponse.json({ error: "0x API key not configured." }, { status: 500 });
  }
  const { tradeHash } = await params;
  const chainId = request.nextUrl.searchParams.get("chainId");
  if (!tradeHash || !chainId) {
    return NextResponse.json({ error: "tradeHash and chainId required" }, { status: 400 });
  }
  try {
    const url = `https://api.0x.org/gasless/status/${tradeHash}?chainId=${chainId}`;
    const res = await fetch(url, {
      headers: {
        "0x-api-key": ZERO_EX_API_KEY,
        "0x-version": "v2",
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.reason || data?.message || `0x API ${res.status}` },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Status check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
