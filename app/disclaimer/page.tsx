import Link from "next/link";

export const metadata = {
  title: "Disclaimer | DeltaChainLabs",
  description: "Disclaimer, powered-by attributions, and liability information for DeltaChainLabs.",
};

export default function DisclaimerPage() {
  return (
    <main className="min-h-screen flex flex-col items-center p-4 pt-8 sm:p-6 sm:pt-10 orb-bg bg-[var(--delta-bg)] relative z-10">
      <div className="w-full max-w-2xl mx-auto rounded-3xl border p-6 sm:p-8 bg-[var(--delta-card)] border-[var(--swap-pill-border)] shadow-xl">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Disclaimer</h1>
        <p className="text-sm text-[var(--delta-text-muted)] mb-8">
          Last updated: February 2025
        </p>

        {/* Powered by */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">Powered By</h2>
          <p className="text-sm text-slate-300 mb-4">
            DeltaChainLabs is a non-custodial interface. We do not execute trades, hold funds, or custody assets. The following third-party services power our features:
          </p>
          <ul className="space-y-3 text-sm text-slate-300">
            <li>
              <strong className="text-white">Same-chain swaps & wrap/unwrap:</strong>{" "}
              <a href="https://0x.org" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">0x API</a>
              {" "}— DEX aggregator for optimal swap routes
            </li>
            <li>
              <strong className="text-white">Cross-chain bridge:</strong>{" "}
              <a href="https://across.to" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">Across Protocol</a>
              {" "}— Fast cross-chain transfers
            </li>
            <li>
              <strong className="text-white">Buy with fiat:</strong>{" "}
              <a href="https://changelly.com" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">Changelly</a>
              {" "}— Fiat-to-crypto purchases
            </li>
            <li>
              <strong className="text-white">Solana swaps:</strong>{" "}
              <a href="https://jup.ag" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">Jupiter</a>
              {" "}— Solana DEX aggregator
            </li>
            <li>
              <strong className="text-white">Portfolio & prices:</strong> Public RPCs,{" "}
              <a href="https://coingecko.com" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">CoinGecko</a>
              {" "}— Balance and price data
            </li>
          </ul>
        </section>

        {/* Non-custodial */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">Non-Custodial</h2>
          <p className="text-sm text-slate-300">
            You connect your own wallet (e.g. MetaMask, Rainbow). We never hold your private keys, seed phrase, or funds. All transactions are signed by you in your wallet. We only provide an interface to build and submit transactions.
          </p>
        </section>

        {/* No liability */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">No Liability</h2>
          <p className="text-sm text-slate-300 mb-3">
            <strong className="text-amber-400/90">USE AT YOUR OWN RISK.</strong> DeltaChainLabs, its operators, and affiliates:
          </p>
          <ul className="space-y-2 text-sm text-slate-300 list-disc list-inside">
            <li>Are <strong className="text-white">not liable</strong> for any loss of funds, whether from user error, smart contract bugs, bridge failures, third-party services, or any other cause</li>
            <li>Do <strong className="text-white">not guarantee</strong> the accuracy of quotes, prices, or displayed data</li>
            <li>Are <strong className="text-white">not responsible</strong> for the actions, security, or availability of 0x, Across, Changelly, Jupiter, or any other integrated service</li>
            <li>Do <strong className="text-white">not provide</strong> financial, investment, legal, or tax advice</li>
          </ul>
        </section>

        {/* Risks */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">Risks</h2>
          <p className="text-sm text-slate-300 mb-2">
            Cryptocurrency and DeFi involve significant risk. You may lose some or all of your funds. Risks include but are not limited to:
          </p>
          <ul className="space-y-1 text-sm text-slate-300 list-disc list-inside">
            <li>Smart contract vulnerabilities or exploits</li>
            <li>Bridge delays, failures, or hacks</li>
            <li>Third-party service downtime or errors</li>
            <li>Market volatility and impermanent loss</li>
            <li>Phishing, scams, and user error</li>
          </ul>
        </section>

        {/* No warranty */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">No Warranty</h2>
          <p className="text-sm text-slate-300">
            This interface is provided &quot;as is&quot; without warranty of any kind. We do not warrant that the service will be uninterrupted, error-free, or secure. By using DeltaChainLabs, you acknowledge that you have read, understood, and agree to this disclaimer.
          </p>
        </section>

        <div className="mt-8 pt-6 border-t border-[var(--swap-pill-border)]">
          <Link href="/" className="text-sm text-[var(--swap-accent)] hover:underline">
            ← Back to Swap
          </Link>
        </div>
      </div>
    </main>
  );
}
