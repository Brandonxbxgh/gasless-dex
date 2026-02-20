import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const RPC_ENDPOINTS = [
  process.env.NEXT_PUBLIC_SOLANA_RPC,
  "https://rpc.ankr.com/solana",
  "https://api.mainnet-beta.solana.com",
].filter(Boolean) as string[];

async function fetchBalance(rpc: string, publicKey: string, mint: string | null): Promise<{ balance: number; decimals: number }> {
  const connection = new Connection(rpc, { commitment: "confirmed" });
  const pubkey = new PublicKey(publicKey);

  if (mint === SOL_MINT || !mint) {
    const bal = await connection.getBalance(pubkey);
    return { balance: bal / 1e9, decimals: 9 };
  }

  const accounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
    mint: new PublicKey(mint),
  });
  const uiAmt = accounts.value[0]?.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0;
  return { balance: Number(uiAmt), decimals: 6 };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const publicKey = searchParams.get("publicKey");
  const mint = searchParams.get("mint");

  if (!publicKey) {
    return NextResponse.json({ error: "publicKey required" }, { status: 400 });
  }

  const rpcs = RPC_ENDPOINTS.length > 0 ? RPC_ENDPOINTS : ["https://rpc.ankr.com/solana"];
  let lastError: Error | null = null;

  for (const rpc of rpcs) {
    try {
      const result = await fetchBalance(rpc, publicKey, mint);
      return NextResponse.json(result);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error("Balance fetch failed");
    }
  }

  const msg = lastError?.message ?? "Balance fetch failed";
  return NextResponse.json({ error: msg }, { status: 500 });
}
