import { NextRequest, NextResponse } from "next/server";

const ZERO_EX_API_KEY = process.env.NEXT_PUBLIC_ZERO_EX_API_KEY || process.env.ZERO_EX_API_KEY;

export async function POST(request: NextRequest) {
  if (!ZERO_EX_API_KEY) {
    return NextResponse.json(
      { error: "0x API key not configured." },
      { status: 500 }
    );
  }
  try {
    const body = await request.json();
    const res = await fetch("https://api.0x.org/gasless/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "0x-api-key": ZERO_EX_API_KEY,
        "0x-version": "v2",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.reason || data?.message || `0x API ${res.status}`, details: data },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Submit failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
