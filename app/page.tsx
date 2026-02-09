import { Swap } from "@/components/Swap";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Gasless DEX Aggregator
        </h1>
        <p className="text-zinc-400">
          Swap on Base, Arbitrum, Polygon, BNB & Ethereum — zero gas, just sign
        </p>
      </div>
      <Swap />
      <p className="mt-6 text-xs text-zinc-600 text-center max-w-sm">
        Powered by 0x Gasless API. Your keys stay in your wallet. We relay the transaction.
      </p>
    </main>
  );
}
