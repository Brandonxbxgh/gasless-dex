import { Swap } from "@/components/Swap";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 pt-8 sm:p-6 sm:pt-10">
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3 drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          DeltaChainLabs
        </h1>
        <p className="text-slate-200 text-base sm:text-lg font-medium max-w-md mx-auto leading-relaxed">
          Gasless swap — stable ↔ native on Base, Arbitrum, Polygon, BNB & Ethereum
        </p>
      </div>
      <Swap />
      <p className="mt-6 text-sm text-slate-300 text-center max-w-sm bg-slate-800/50 rounded-lg px-4 py-2 border border-emerald-500/25">
        Powered by 0x. Your keys stay in your wallet.
      </p>
    </main>
  );
}
