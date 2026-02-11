import { Swap } from "@/components/Swap";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 pt-8 sm:p-6 sm:pt-10 orb-bg bg-[var(--delta-bg)] relative z-10">
      <Swap />
      <p className="mt-6 text-sm text-[var(--delta-text-muted)] text-center max-w-md">
        Buy and sell crypto with <span className="text-[var(--swap-accent)]">zero app fees</span> on Base, Arbitrum, Polygon & more.
      </p>
    </main>
  );
}
