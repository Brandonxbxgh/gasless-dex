import { UnifiedSwap } from "@/components/UnifiedSwap";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 pt-8 sm:p-6 sm:pt-10 orb-bg bg-[var(--delta-bg)] relative z-10">
      <UnifiedSwap />
      <p className="mt-6 text-sm text-[var(--delta-text-muted)] text-center max-w-md">
        Swap tokens. Bridge chains. Buy crypto with fiat. <span className="text-[var(--swap-accent)]">All in one place.</span>
      </p>
    </main>
  );
}
