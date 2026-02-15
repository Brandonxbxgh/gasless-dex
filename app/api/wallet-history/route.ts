import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const ETHERSCAN_V2_API = "https://api.etherscan.io/v2/api";
const CHAIN_IDS = [1, 8453, 42161, 137, 10, 56] as const;

type ExplorerTx = {
  hash: string;
  timeStamp: string;
  from: string;
  to: string;
  value: string;
  isError?: string;
  functionName?: string;
};

type InternalTx = {
  hash: string;
  from: string;
  to: string;
  value: string;
  type: string;
};

type TokenTransfer = {
  hash?: string;
  timeStamp?: string;
  from: string;
  to: string;
  value: string;
  tokenSymbol: string;
  tokenDecimal: string;
};

type TokenTransferDisplay = {
  direction: "sent" | "received";
  amount: string;
  symbol: string;
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

  const formatTokenAmount = (value: string, decimals: string): string => {
    const val = BigInt(value);
    const dec = parseInt(decimals, 10) || 18;
    const num = Number(val) / Math.pow(10, dec);
    if (num >= 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (num >= 1) return num.toFixed(4);
    if (num >= 0.0001) return num.toFixed(6);
    return num.toString();
  };

  const fetchChainTxs = async (chainId: number) => {
    const url = `${ETHERSCAN_V2_API}?chainid=${chainId}&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=15&sort=desc&apikey=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 30 } });
    const data = (await res.json()) as { status: string; result?: ExplorerTx[] | string; message?: string };
    if (data.status !== "1" || !Array.isArray(data.result)) {
      const errMsg = typeof data.result === "string" ? data.result : (data.message ?? "unknown");
      console.warn(`[wallet-history] chain ${chainId} txlist failed:`, errMsg);
      return [];
    }
    return (data.result as ExplorerTx[]).map((tx) => ({
      hash: tx.hash,
      chainId,
      timeStamp: parseInt(tx.timeStamp, 10),
      from: tx.from,
      to: tx.to,
      value: tx.value,
      isError: tx.isError === "1",
      functionName: tx.functionName ?? null,
    }));
  };

  const fetchChainInternalTxs = async (chainId: number): Promise<InternalTx[]> => {
    const url = `${ETHERSCAN_V2_API}?chainid=${chainId}&module=account&action=txlistinternal&address=${address}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc&apikey=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 30 } });
    const data = (await res.json()) as { status: string; result?: InternalTx[] | string; message?: string };
    if (data.status !== "1" || !Array.isArray(data.result)) return [];
    return data.result as InternalTx[];
  };

  const fetchChainTokenTxs = async (chainId: number): Promise<TokenTransfer[]> => {
    const url = `${ETHERSCAN_V2_API}?chainid=${chainId}&module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc&apikey=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 30 } });
    const data = (await res.json()) as { status: string; result?: TokenTransfer[] | string; message?: string };
    if (data.status !== "1" || !Array.isArray(data.result)) return [];
    return data.result as TokenTransfer[];
  };

  try {
    const ourTxs = supabase
      ? ((await supabase.from("transactions").select("*").eq("address", address.toLowerCase())).data ?? [])
      : [];

    const addrLower = address.toLowerCase();

    const chainResults = await Promise.all(
      CHAIN_IDS.map(async (chainId, i) => {
        await new Promise((r) => setTimeout(r, i * 250));
        const [txs, tokenTxs, internalTxs] = await Promise.all([
          fetchChainTxs(chainId),
          fetchChainTokenTxs(chainId),
          fetchChainInternalTxs(chainId),
        ]);
        return { chainId, txs, tokenTxs, internalTxs };
      })
    );

    const internalTxByHash = new Map<string, { value: string; type: string }[]>();
    for (const { chainId, internalTxs } of chainResults) {
      for (const it of internalTxs) {
        if (!it.hash || BigInt(it.value || "0") === BigInt(0)) continue;
        const key = `${chainId}:${it.hash.toLowerCase()}`;
        const existing = internalTxByHash.get(key) ?? [];
        existing.push({ value: it.value, type: it.type || "call" });
        internalTxByHash.set(key, existing);
      }
    }

    const tokenTxByHash = new Map<string, TokenTransferDisplay[]>();
    for (const { chainId, tokenTxs } of chainResults) {
      for (const tt of tokenTxs) {
        const h = (tt as { hash?: string }).hash;
        if (!h) continue;
        const key = `${chainId}:${h.toLowerCase()}`;
        const existing = tokenTxByHash.get(key) ?? [];
        const direction = tt.from.toLowerCase() === addrLower ? "sent" : "received";
        const amount = formatTokenAmount(tt.value, tt.tokenDecimal);
        existing.push({ direction, amount, symbol: tt.tokenSymbol || "?" });
        tokenTxByHash.set(key, existing);
      }
    }

    const ourTxSet = new Set(ourTxs.map((t: { chain_id: number; tx_hash: string }) => `${t.chain_id}:${t.tx_hash.toLowerCase()}`));
    const ourTxMap = new Map(ourTxs.map((t: { chain_id: number; tx_hash: string }) => [`${t.chain_id}:${t.tx_hash.toLowerCase()}`, t]));

    const txKeysSeen = new Set<string>();
    const allTxs: {
      hash: string;
      chainId: number;
      timeStamp: number;
      from: string;
      to: string;
      value: string;
      isError: boolean;
      functionName?: string | null;
      viaDeltaChain?: typeof ourTxs[0];
      tokenTransfers?: TokenTransferDisplay[];
      internalTransfers?: { value: string; type: string }[];
    }[] = [];

    for (const { chainId, txs } of chainResults) {
      for (const tx of txs) {
        const key = `${chainId}:${tx.hash.toLowerCase()}`;
        txKeysSeen.add(key);
        const internalTransfers = internalTxByHash.get(key);
        allTxs.push({
          hash: tx.hash,
          chainId,
          timeStamp: tx.timeStamp,
          from: tx.from,
          to: tx.to,
          value: tx.value,
          isError: tx.isError,
          functionName: tx.functionName,
          viaDeltaChain: ourTxSet.has(key) ? ourTxMap.get(key) : undefined,
          tokenTransfers: tokenTxByHash.get(key),
          internalTransfers: internalTransfers?.length ? internalTransfers : undefined,
        });
      }
    }

    for (const { chainId, tokenTxs } of chainResults) {
      for (const tt of tokenTxs) {
        const h = tt.hash;
        if (!h) continue;
        const key = `${chainId}:${h.toLowerCase()}`;
        if (txKeysSeen.has(key)) continue;
        txKeysSeen.add(key);
        const ts = tt.timeStamp ? parseInt(tt.timeStamp, 10) : 0;
        const tokenTransfers = tokenTxByHash.get(key);
        if (!tokenTransfers?.length) continue;
        allTxs.push({
          hash: h,
          chainId,
          timeStamp: ts,
          from: tt.from,
          to: tt.to,
          value: "0",
          isError: false,
          viaDeltaChain: ourTxSet.has(key) ? ourTxMap.get(key) : undefined,
          tokenTransfers,
          internalTransfers: internalTxByHash.get(key),
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
