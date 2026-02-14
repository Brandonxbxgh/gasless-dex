import { Portfolio } from "@/components/Portfolio";

export default function PortfolioPage() {
  return (
    <main className="min-h-screen flex flex-col items-center p-4 pt-8 sm:p-6 sm:pt-10 orb-bg bg-[var(--delta-bg)] relative z-10">
      <Portfolio />
      <p className="mt-6 text-sm text-[var(--delta-text-muted)] text-center max-w-md">
        Balances across Ethereum, Base, Arbitrum, Polygon, Optimism & BNB.
      </p>
    </main>
  );
}
