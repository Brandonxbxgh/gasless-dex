import { CrossChainSwap } from "@/components/CrossChainSwap";

export default function CrossChainSwapPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 pt-8 sm:p-6 sm:pt-10 orb-bg bg-[var(--delta-bg)] relative z-10">
      <CrossChainSwap />
      <p className="mt-6 text-sm text-[var(--delta-text-muted)] text-center max-w-md">
        Swap across Ethereum, Base, Arbitrum, Polygon, Optimism & BNB. Powered by Across.
      </p>
    </main>
  );
}
