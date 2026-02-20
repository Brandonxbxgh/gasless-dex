import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://rpc.ankr.com/solana";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const publicKey = searchParams.get("publicKey");
  const mint = searchParams.get("mint");

  if (!publicKey) {
    return NextResponse.json({ error: "publicKey required" }, { status: 400 });
  }

  try {
    const connection = new Connection(RPC);
    const pubkey = new PublicKey(publicKey);

    if (mint === SOL_MINT || !mint) {
      const bal = await connection.getBalance(pubkey);
      return NextResponse.json({ balance: bal / 1e9, decimals: 9 });
    }

    const accounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
      mint: new PublicKey(mint),
    });
    const uiAmt = accounts.value[0]?.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0;
    return NextResponse.json({ balance: Number(uiAmt), decimals: 6 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Balance fetch failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
