import Link from "next/link";

const CHAINS = [
  { id: 1, name: "Ethereum" },
  { id: 8453, name: "Base" },
  { id: 42161, name: "Arbitrum" },
  { id: 137, name: "Polygon" },
  { id: 10, name: "Optimism" },
  { id: 56, name: "BNB Smart Chain" },
] as const;

const CHAIN_TOKENS: Record<number, string[]> = {
  1: ["ETH", "USDC", "USDT", "WETH"],
  8453: ["ETH", "USDC", "USDT", "WETH"],
  42161: ["ETH", "USDC", "USDT", "WETH"],
  137: ["MATIC", "USDC", "USDT", "WMATIC"],
  10: ["ETH", "USDC", "USDT", "WETH"],
  56: ["BNB", "USDT", "WBNB"],
};

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
          How it works
        </h1>
        <p className="text-slate-300 text-lg mb-12">
          A complete guide to buying crypto, swapping, wrapping, and bridging on DeltaChainLabs.
        </p>

        {/* Overview */}
        <section className="mb-14">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[var(--swap-accent)]/20 text-[var(--swap-accent)] flex items-center justify-center text-sm font-bold">1</span>
            Overview
          </h2>
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-6 text-slate-200 space-y-4">
            <p>
              DeltaChainLabs lets you buy crypto with fiat, swap tokens, wrap/unwrap native currency, and bridge across chains. Connect your wallet, pick your action, and execute.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="rounded-xl bg-slate-900/60 border border-slate-700/40 p-4">
                <p className="font-semibold text-white mb-1">Buy</p>
                <p className="text-sm text-slate-400">Buy crypto with card, bank transfer, or Apple Pay. Powered by Changelly.</p>
              </div>
              <div className="rounded-xl bg-slate-900/60 border border-slate-700/40 p-4">
                <p className="font-semibold text-white mb-1">Swap</p>
                <p className="text-sm text-slate-400">Same-chain token swaps. Gasless for ERC20↔ERC20.</p>
              </div>
              <div className="rounded-xl bg-slate-900/60 border border-slate-700/40 p-4">
                <p className="font-semibold text-white mb-1">Wrap</p>
                <p className="text-sm text-slate-400">Convert native ↔ wrapped (e.g. ETH ↔ WETH). 1:1, no spread.</p>
              </div>
              <div className="rounded-xl bg-slate-900/60 border border-slate-700/40 p-4">
                <p className="font-semibold text-white mb-1">Bridge</p>
                <p className="text-sm text-slate-400">Cross-chain swaps. Powered by Across. ~2–10 seconds.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Buy tab */}
        <section className="mb-14">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[var(--swap-accent)]/20 text-[var(--swap-accent)] flex items-center justify-center text-sm font-bold">2</span>
            Buy crypto — fiat on-ramp
          </h2>
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-6 text-slate-200 space-y-4">
            <p>
              The <Link href="/buy" className="text-sky-400 hover:underline">Buy</Link> page lets you purchase crypto with fiat (USD, EUR, etc.) using a card, bank transfer, or Apple Pay. Powered by <a href="https://changelly.com" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">Changelly</a>.
            </p>
            <ul className="space-y-2 text-sm">
              <li><strong className="text-white">~2% fee</strong> — Changelly&apos;s service fee; no extra app fees.</li>
              <li><strong className="text-white">Multiple providers</strong> — Changelly routes you to the best offer from MoonPay, Simplex, Banxa, Transak, or Wert based on your region and payment method.</li>
              <li><strong className="text-white">KYC</strong> — Handled by the provider (e.g. MoonPay) during checkout. We never see or store your identity data.</li>
              <li><strong className="text-white">Wallet address</strong> — Connect your wallet and we pre-fill the destination address so crypto goes straight to you. You can also paste any address in the widget.</li>
            </ul>
            <p className="text-sm text-slate-400">
              Available in 200+ countries including the US. Processing typically takes 5–40 minutes.
            </p>
          </div>
        </section>

        {/* Best quotes / DEX aggregation */}
        <section className="mb-14">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[var(--swap-accent)]/20 text-[var(--swap-accent)] flex items-center justify-center text-sm font-bold">3</span>
            We find you the best quotes
          </h2>
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-6 text-slate-200 space-y-4">
            <p>
              For same-chain swaps, we use the <strong className="text-white">0x API</strong> — a DEX aggregator that compares liquidity across many sources to find you the best rate.
            </p>
            <p>
              Instead of checking Uniswap, PancakeSwap, Curve, Balancer, SushiSwap, and others one by one, we query them all at once. The API returns the <strong className="text-white">optimal route</strong> — whether that’s a single DEX or a split across multiple pools — so you get the best output for your trade.
            </p>
            <p className="text-sm text-slate-400">
              The quote breakdown shows the route and all fees before you confirm. No guesswork — you see exactly what you’ll receive.
            </p>
          </div>
        </section>

        {/* Swap Tab */}
        <section className="mb-14">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[var(--swap-accent)]/20 text-[var(--swap-accent)] flex items-center justify-center text-sm font-bold">4</span>
            Swap tab — same-chain swaps
          </h2>
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-6 text-slate-200 space-y-4">
            <p>
              Swap any supported token for another on the <strong className="text-white">same chain</strong>. From and To chains are locked to the same network.
            </p>
            <div>
              <h3 className="font-medium text-white mb-2">Gasless vs. paid</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <span className="text-emerald-400 shrink-0">●</span>
                  <span><strong className="text-white">Gasless:</strong> ERC20 ↔ ERC20 (e.g. USDC → WETH). You sign only; we submit the transaction. No gas from you.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400 shrink-0">●</span>
                  <span><strong className="text-white">Paid gas:</strong> When native (ETH, BNB, MATIC) is involved — either selling or receiving — you pay gas for one transaction.</span>
                </li>
              </ul>
            </div>
            <p className="text-sm text-slate-400">
              The quote breakdown shows exactly what you’ll pay before you confirm.
            </p>
          </div>
        </section>

        {/* Wrap Tab */}
        <section className="mb-14">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[var(--swap-accent)]/20 text-[var(--swap-accent)] flex items-center justify-center text-sm font-bold">5</span>
            Wrap tab — native ↔ wrapped
          </h2>
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-6 text-slate-200 space-y-4">
            <p>
              Convert between <strong className="text-white">native</strong> chain currency (ETH, BNB, MATIC) and its <strong className="text-white">wrapped</strong> form (WETH, WBNB, WMATIC).
            </p>
            <ul className="space-y-2 text-sm">
              <li><strong className="text-white">Wrap:</strong> Native → Wrapped (e.g. 1 ETH → 1 WETH). You pay gas.</li>
              <li><strong className="text-white">Unwrap:</strong> Wrapped → Native (e.g. 1 WETH → 1 ETH). You pay gas.</li>
            </ul>
            <p>
              Exchange is <strong className="text-white">1:1</strong> — no spread or swap fee. Only network gas applies.
            </p>
          </div>
        </section>

        {/* Bridge Tab */}
        <section className="mb-14">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[var(--swap-accent)]/20 text-[var(--swap-accent)] flex items-center justify-center text-sm font-bold">6</span>
            Bridge tab — cross-chain swaps
          </h2>
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-6 text-slate-200 space-y-4">
            <p>
              Swap tokens <strong className="text-white">across chains</strong> — e.g. USDC on Base → ETH on Arbitrum. Powered by <a href="https://across.to" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">Across Protocol</a>.
            </p>
            <ul className="space-y-2 text-sm">
              <li>Select different chains for From and To.</li>
              <li>Fills typically complete in <strong className="text-white">~2–10 seconds</strong>.</li>
              <li>You pay gas only on the <strong className="text-white">origin chain</strong>; the bridge handles the rest.</li>
              <li>Using Ledger? Have it ready — sign within 60 seconds. Quotes expire quickly.</li>
            </ul>
            <p className="text-sm text-slate-400">
              Get a fresh quote right before swapping; we auto-refresh before execution.
            </p>
          </div>
        </section>

        {/* Fees */}
        <section className="mb-14">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[var(--swap-accent)]/20 text-[var(--swap-accent)] flex items-center justify-center text-sm font-bold">7</span>
            Fees
          </h2>
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-6 text-slate-200 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="text-left py-3 font-medium text-white">Action</th>
                    <th className="text-left py-3 font-medium text-white">App fee</th>
                    <th className="text-left py-3 font-medium text-white">Other</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  <tr className="border-b border-slate-700/50">
                    <td className="py-3">Buy crypto (fiat)</td>
                    <td className="py-3">None</td>
                    <td className="py-3">~2% Changelly fee; provider fees</td>
                  </tr>
                  <tr className="border-b border-slate-700/50">
                    <td className="py-3">Same-chain swap</td>
                    <td className="py-3">0.12%</td>
                    <td className="py-3">Gas if native involved; 0x fee</td>
                  </tr>
                  <tr className="border-b border-slate-700/50">
                    <td className="py-3">Wrap / Unwrap</td>
                    <td className="py-3">None</td>
                    <td className="py-3">Network gas only</td>
                  </tr>
                  <tr className="border-b border-slate-700/50">
                    <td className="py-3">Cross-chain bridge</td>
                    <td className="py-3">0.15%</td>
                    <td className="py-3">Bridge + gas on origin chain</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-slate-400">
              The quote breakdown shows each fee with USD estimates before you confirm.
            </p>
          </div>
        </section>

        {/* Tokens: Native vs Wrapped */}
        <section className="mb-14">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[var(--swap-accent)]/20 text-[var(--swap-accent)] flex items-center justify-center text-sm font-bold">8</span>
            Native vs. wrapped tokens
          </h2>
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-6 text-slate-200 space-y-4">
            <p>
              <strong className="text-white">Native</strong> (ETH, BNB, MATIC) is the chain’s base currency. <strong className="text-white">Wrapped</strong> (WETH, WBNB, WMATIC) is an ERC20 that represents it 1:1.
            </p>
            <ul className="space-y-2 text-sm">
              <li><strong className="text-white">Sending native:</strong> One transaction; you pay gas.</li>
              <li><strong className="text-white">Sending wrapped:</strong> ERC20 transfer; may be gasless if paired with another ERC20.</li>
              <li><strong className="text-white">Receiving native:</strong> You get real chain currency. Requires gas for the swap.</li>
              <li><strong className="text-white">Receiving wrapped:</strong> You get the ERC20. Can be gasless.</li>
            </ul>
          </div>
        </section>

        {/* Allowance */}
        <section className="mb-14">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[var(--swap-accent)]/20 text-[var(--swap-accent)] flex items-center justify-center text-sm font-bold">9</span>
            Token allowance
          </h2>
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-6 text-slate-200 space-y-4">
            <p>
              When you <strong className="text-white">sell a token</strong> (USDC, USDT, WETH, etc.), the chain requires you to approve a contract to spend it. That permission is called <strong className="text-white">allowance</strong>.
            </p>
            <ul className="space-y-2 text-sm">
              <li>If the app shows <strong className="text-white">Approve</strong>, you must sign that transaction once (you pay gas).</li>
              <li>After approval, future swaps with that token may be gasless (sign-only).</li>
              <li>Native (ETH, BNB, MATIC) does not need allowance — you send it directly.</li>
            </ul>
          </div>
        </section>

        {/* Supported chains & tokens */}
        <section className="mb-14">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[var(--swap-accent)]/20 text-[var(--swap-accent)] flex items-center justify-center text-sm font-bold">10</span>
            Supported chains & tokens
          </h2>
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-600 bg-slate-800/80">
                    <th className="text-left py-3 px-4 font-medium text-white">Chain</th>
                    <th className="text-left py-3 px-4 font-medium text-white">Tokens</th>
                  </tr>
                </thead>
                <tbody className="text-slate-200">
                  {CHAINS.map((chain) => (
                    <tr key={chain.id} className="border-b border-slate-700/30 last:border-0">
                      <td className="py-3 px-4 font-medium text-white">{chain.name}</td>
                      <td className="py-3 px-4">{(CHAIN_TOKENS[chain.id] ?? []).join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400 p-4 pt-2">
              BNB has no USDC (USDT + WBNB only). Any pair between listed tokens on the same chain is supported for Swap. Bridge supports all listed chains.
            </p>
          </div>
        </section>

        {/* Quote flow */}
        <section className="mb-14">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[var(--swap-accent)]/20 text-[var(--swap-accent)] flex items-center justify-center text-sm font-bold">11</span>
            Quote flow & tips
          </h2>
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-6 text-slate-200 space-y-4">
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Enter amount and select From/To tokens (and chains for Bridge).</li>
              <li>Click <strong className="text-white">Get quote</strong>. The quote breakdown shows fees, estimated output, and gas.</li>
              <li>Quotes refresh every 30 seconds and expire after ~30s. For Bridge, get a fresh quote right before swapping.</li>
              <li>Click <strong className="text-white">Swap</strong> (or Wrap/Unwrap). Approve if prompted, then sign.</li>
              <li>After success, use <strong className="text-white">View transaction</strong> to check on the explorer, or <strong className="text-white">Next swap</strong> to start over.</li>
            </ol>
            <p className="text-sm text-amber-400/90">
              If a transaction fails on-chain, we’ll show “View failed transaction” and you can retry with a fresh quote.
            </p>
          </div>
        </section>

        {/* Solana */}
        <section className="mb-14">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[var(--swap-accent)]/20 text-[var(--swap-accent)] flex items-center justify-center text-sm font-bold">12</span>
            Solana swaps
          </h2>
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-6 text-slate-200 space-y-4">
            <p>
              The <Link href="/swap/solana" className="text-sky-400 hover:underline">Solana</Link> page offers swaps on Solana via Jupiter. Connect a Solana wallet (e.g. Phantom) and swap SOL, USDC, USDT.
            </p>
            <p className="text-sm text-slate-400">
              Solana swaps are separate from the EVM Swap/Wrap/Bridge interface.
            </p>
          </div>
        </section>

        {/* Support */}
        <section className="mb-12 rounded-2xl bg-slate-800/40 border border-slate-700/40 p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Need help?</h2>
          <p className="text-slate-200 text-sm mb-3">
            Questions or issues? Reach out on Telegram.
          </p>
          <a
            href="https://t.me/brandonxbxgh"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 font-medium text-sm"
          >
            t.me/brandonxbxgh
            <span aria-hidden>→</span>
          </a>
        </section>

        <p className="text-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-[var(--swap-accent)] hover:opacity-90 px-6 py-3 text-sm font-medium text-white transition-colors"
          >
            Back to Swap
          </Link>
        </p>
      </div>
    </main>
  );
}
