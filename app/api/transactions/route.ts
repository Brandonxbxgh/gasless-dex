import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { TransactionAction } from "@/lib/record-transaction";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  if (!address || typeof address !== "string") {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

  if (!supabase) {
    return NextResponse.json({ transactions: [] });
  }

  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("address", address.toLowerCase())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Supabase transactions fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ transactions: data ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch transactions";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ ok: true });
  }

  try {
    const body = await request.json();
    const {
      txHash,
      chainId,
      address,
      actionType,
      fromToken,
      toToken,
      fromChainId,
      toChainId,
    } = body as {
      txHash: string;
      chainId: number;
      address: string;
      actionType: TransactionAction;
      fromToken?: string;
      toToken?: string;
      fromChainId?: number;
      toChainId?: number;
    };

    if (!txHash || !chainId || !address || !actionType) {
      return NextResponse.json(
        { error: "txHash, chainId, address, actionType required" },
        { status: 400 }
      );
    }

    const validActions: TransactionAction[] = ["swap", "bridge", "send", "wrap", "unwrap"];
    if (!validActions.includes(actionType)) {
      return NextResponse.json({ error: "invalid actionType" }, { status: 400 });
    }

    const { error } = await supabase.from("transactions").insert({
      tx_hash: txHash,
      chain_id: chainId,
      address: address.toLowerCase(),
      action_type: actionType,
      from_token: fromToken ?? null,
      to_token: toToken ?? null,
      from_chain_id: fromChainId ?? null,
      to_chain_id: toChainId ?? null,
    });

    if (error) {
      console.error("Supabase transactions insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to record transaction";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
