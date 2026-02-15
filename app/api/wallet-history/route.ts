import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const EXPLORER_API: Record<number, string> = {
  1: "https://api.etherscan.io/api",
  8453: "https://api.basescan.org/api",
  42161: "https://api.arbiscan.io/api",
  137: "https://api.polygonscan.com/api",
  10: "https://api-optimistic.etherscan.io/api",
  56: "https://api.bscscan.com/api",
};

const CHAIN_IDS = [1, 8453, 42161, 137, 10, 56] as const;

type ExplorerTx = {
  hash: string;
  timeStamp: string;
  from: string;
  to: string;
  value: string;
  isError?: string;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  if (!address || typeof address !== "string") {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  const apiKey = process.env.ETHERSCAN_API_KEY;
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

  if (!apiKey) {
    const ourTxs = supabase
      ? ((await supabase.from("transactions").select("*").eq("address", address.toLowerCase()).order("created_at", { ascending: false }).limit(limit)).data ?? [])
      : [];
    return NextResponse.json({
      transactions: ourTxs.map((t) => ({
        hash: t.tx_hash,
        chainId: t.chain_id,
        timeStamp: Math.floor(new Date(t.created_at).getTime() / 1000),
        from: address,
        to: "",
        value: "0",
        isError: false,
        viaDeltaChain: t,
      })),
    });
  }

  try {
    const [ourTxs, ...chainResults] = await Promise.all([
      supabase
        ? supabase
            .from("transactions")
            .select("*")
            .eq("address", address.toLowerCase())
            .then((r) => r.data ?? [])
        : Promise.resolve([]),
      ...CHAIN_IDS.map(async (chainId) => {
        const url = `${EXPLORER_API[chainId]}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=15&sort=desc&apikey=${apiKey}`;
        const res = await fetch(url, { next: { revalidate: 30 } });
        const data = (await res.json()) as { status: string; result?: ExplorerTx[]; message?: string };
        if (data.status !== "1" || !Array.isArray(data.result)) return [];
        return (data.result as ExplorerTx[]).map((tx) => ({
          hash: tx.hash,
          chainId,
          timeStamp: parseInt(tx.timeStamp, 10),
          from: tx.from,
          to: tx.to,
          value: tx.value,
          isError: tx.isError === "1",
        }));
      }),
    ]);

    const ourTxSet = new Set(ourTxs.map((t: { chain_id: number; tx_hash: string }) => `${t.chain_id}:${t.tx_hash.toLowerCase()}`));
    const ourTxMap = new Map(ourTxs.map((t: { chain_id: number; tx_hash: string }) => [`${t.chain_id}:${t.tx_hash.toLowerCase()}`, t]));

    const allTxs: {
      hash: string;
      chainId: number;
      timeStamp: number;
      from: string;
      to: string;
      value: string;
      isError: boolean;
      viaDeltaChain?: typeof ourTxs[0];
    }[] = [];

    for (const txs of chainResults) {
      for (const tx of txs) {
        allTxs.push({
          hash: tx.hash,
          chainId: tx.chainId,
          timeStamp: tx.timeStamp,
          from: tx.from,
          to: tx.to,
          value: tx.value,
          isError: tx.isError,
          viaDeltaChain: ourTxSet.has(`${tx.chainId}:${tx.hash.toLowerCase()}`)
            ? ourTxMap.get(`${tx.chainId}:${tx.hash.toLowerCase()}`)
            : undefined,
        });
      }
    }

    allTxs.sort((a, b) => b.timeStamp - a.timeStamp);
    const limited = allTxs.slice(0, limit);

    return NextResponse.json({ transactions: limited });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch wallet history";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
