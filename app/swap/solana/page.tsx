import { SolanaWalletProvider } from "@/components/SolanaWalletProvider";
import { SolanaSwap } from "@/components/SolanaSwap";

export default function SolanaSwapPage() {
  return (
    <SolanaWalletProvider>
      <main className="min-h-screen flex flex-col items-center justify-center p-4 pt-8 sm:p-6 sm:pt-10 orb-bg bg-[var(--delta-bg)] relative z-10">
        <SolanaSwap />
        <p className="mt-6 text-sm text-[var(--delta-text-muted)] text-center max-w-md">
          Swap SOL, USDC, USDT on Solana. Powered by Jupiter.
        </p>
      </main>
    </SolanaWalletProvider>
  );
}
