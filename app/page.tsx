import { Swap } from "@/components/Swap";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent mb-2">
          DeltaChainLabs
        </h1>
        <p className="text-slate-400 text-sm sm:text-base">
          Gasless swap — stable ↔ native on Base, Arbitrum, Polygon, BNB & Ethereum
        </p>
      </div>
      <Swap />
      <p className="mt-6 text-xs text-slate-500 text-center max-w-sm">
        Powered by 0x. Your keys stay in your wallet.
      </p>
    </main>
  );
}
