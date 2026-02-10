import Link from "next/link";

const CHAINS = [
  { id: 8453, name: "Base" },
  { id: 42161, name: "Arbitrum" },
  { id: 137, name: "Polygon" },
  { id: 56, name: "BNB Smart Chain" },
  { id: 1, name: "Ethereum" },
] as const;

const CHAIN_TOKENS: Record<number, { symbol: string; name: string }[]> = {
  8453: [
    { symbol: "USDC", name: "USD Coin" },
    { symbol: "USDT", name: "Tether" },
    { symbol: "WETH", name: "Wrapped ETH" },
  ],
  42161: [
    { symbol: "USDC", name: "USD Coin" },
    { symbol: "USDT", name: "Tether" },
    { symbol: "WETH", name: "Wrapped ETH" },
  ],
  137: [
    { symbol: "USDC", name: "USD Coin" },
    { symbol: "USDT", name: "Tether" },
    { symbol: "WMATIC", name: "Wrapped MATIC" },
  ],
  56: [
    { symbol: "USDT", name: "Tether" },
    { symbol: "WBNB", name: "Wrapped BNB" },
  ],
  1: [
    { symbol: "USDC", name: "USD Coin" },
    { symbol: "USDT", name: "Tether" },
    { symbol: "WETH", name: "Wrapped ETH" },
  ],
};

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          How it works
        </h1>
        <p className="text-slate-400 mb-8">
          Swaps, available pairs, and when you pay gas vs when you don’t.
        </p>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-indigo-300 mb-3">
            Two types of swaps
          </h2>
          <div className="space-y-6 text-slate-300">
            <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4 sm:p-5">
              <h3 className="font-medium text-white mb-2">Gasless (no gas)</h3>
              <p className="text-sm leading-relaxed mb-2">
                When you <strong>sell a token</strong> (e.g. USDC, USDT, WETH, WBNB, WMATIC), you only sign a message. We submit the transaction and pay gas. You receive the buy token in your wallet with no extra step.
              </p>
              <p className="text-xs text-slate-400">
                Pairs: stable ↔ wrapped native, or stable ↔ stable on the same chain. You receive <strong>wrapped</strong> (WETH, WBNB, WMATIC), not native ETH/BNB/MATIC.
              </p>
            </div>
            <div className="rounded-xl bg-slate-800/60 border border-amber-500/20 p-4 sm:p-5">
              <h3 className="font-medium text-white mb-2">Requires gas (you pay)</h3>
              <p className="text-sm leading-relaxed mb-2">
                When you <strong>sell native</strong> ETH, BNB, or MATIC, you send one transaction from your wallet. You pay gas for that transaction. This is the only way to swap native chain currency on our app.
              </p>
              <p className="text-xs text-slate-400">
                Pairs: native ETH/BNB/MATIC → USDC, USDT, or wrapped. Fee is taken in the token you’re <strong>receiving</strong> (e.g. USDT when you sell BNB).
              </p>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-indigo-300 mb-3">
            What you send vs what you receive
          </h2>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>
              <strong className="text-white">Sending (From):</strong> If you choose ETH, BNB, or MATIC in the dropdown, you’re sending <strong>native</strong> chain currency (one tx, you pay gas). If you choose USDC, USDT, WETH, etc., you’re sending that token (gasless when applicable).
            </li>
            <li>
              <strong className="text-white">Receiving (To):</strong> If you choose WETH, WBNB, or WMATIC, you receive <strong>wrapped</strong> tokens, not native. We show “Receiving WETH (wrapped), not native” so it’s clear. Stables (USDC, USDT) are received as usual.
            </li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-indigo-300 mb-3">
            Available pairs by chain
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            Same-chain swaps only. Supported tokens per network:
          </p>
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 bg-slate-800/80">
                  <th className="text-left py-3 px-4 font-medium text-white">Chain</th>
                  <th className="text-left py-3 px-4 font-medium text-white">Tokens</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {CHAINS.map((chain) => (
                  <tr
                    key={chain.id}
                    className="border-b border-slate-700/30 last:border-0"
                  >
                    <td className="py-3 px-4 font-medium text-white">{chain.name}</td>
                    <td className="py-3 px-4">
                      {(CHAIN_TOKENS[chain.id] ?? []).map((t) => t.symbol).join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Any pair between these tokens on the same chain is supported. BNB has no USDC (USDT + WBNB only).
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-indigo-300 mb-3">
            Gasless vs requires gas (summary)
          </h2>
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4 sm:p-5 text-sm text-slate-300 space-y-2">
            <p>
              <strong className="text-white">Gasless:</strong> Sell USDC, USDT, WETH, WBNB, or WMATIC → you sign, we pay gas. You receive the buy token (stables or wrapped).
            </p>
            <p>
              <strong className="text-amber-300/90">Requires gas:</strong> Sell native ETH, BNB, or MATIC → you send one tx and pay gas. You receive stables or wrapped.
            </p>
          </div>
        </section>

        <section className="mb-10 rounded-xl bg-slate-800/40 border border-slate-700/30 p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-indigo-300 mb-2">
            Need help?
          </h2>
          <p className="text-sm text-slate-400 mb-2">
            Questions or issues? Reach out on Telegram.
          </p>
          <a
            href="https://t.me/brandonxbxgh"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 font-medium text-sm"
          >
            t.me/brandonxbxgh →
          </a>
        </section>

        <p className="text-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white transition-colors"
          >
            Back to Swap
          </Link>
        </p>
      </div>
    </main>
  );
}
