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

const NATIVE_BY_CHAIN: Record<number, string> = {
  8453: "ETH (native)",
  42161: "ETH (native)",
  137: "MATIC (native)",
  56: "BNB (native)",
  1: "ETH (native)",
};

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          How it works
        </h1>
        <p className="text-slate-200 mb-8">
          Swaps, available pairs, and what you’ll see before you confirm (sign-only or one tx).
        </p>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-sky-300 mb-3">
            How swaps work
          </h2>
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4 sm:p-5 text-slate-200 text-sm space-y-3">
            <p>
              Pick a chain, enter an amount, choose From/To tokens, and hit <strong>Get started</strong>. You can sell tokens (USDC, USDT, WETH, etc.) or native (ETH, BNB, MATIC), and receive any listed token or real native.
            </p>
            <p>
              Before you confirm, the app shows exactly what you’ll do: <strong>Sign only</strong> (no gas - we submit the tx), or <strong>Approve / one transaction</strong> (you pay gas once). So you always see whether the swap is gasless or requires gas before confirming.
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-sky-300 mb-3">
            What you send vs what you receive
          </h2>
          <ul className="space-y-2 text-slate-200 text-sm">
            <li>
              <strong className="text-white">Sending (From):</strong> If you choose ETH, BNB, or MATIC in the dropdown, you’re sending <strong>native</strong> chain currency (one tx, you pay gas). If you choose USDC, USDT, WETH, etc., you’re sending that token; the confirm step will show whether it’s sign-only or requires a tx.
            </li>
            <li>
              <strong className="text-white">Receiving (To):</strong> Choose <strong>“ETH (native)”</strong> (or BNB/MATIC native) to receive real chain currency. Choose WETH, WBNB, or WMATIC to receive <strong>wrapped</strong>; we show “Receiving WETH (wrapped), not native” so it’s clear. Stables (USDC, USDT) are received as usual.
            </li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-sky-300 mb-3">
            Sending to a different wallet (recipient address)
          </h2>
          <p className="text-slate-200 text-sm mb-2">
            If you enter another address in “Send to different address”, that address only receives the <strong>output</strong> of the swap. All of the following still apply:
          </p>
          <ul className="space-y-1.5 text-slate-200 text-sm list-disc list-inside mb-2">
            <li><strong className="text-white">What you sell</strong> always comes from <strong>your connected wallet</strong> only. No one else’s funds are used.</li>
            <li><strong className="text-white">0x</strong> runs the swap (DEX routing, execution). The app only forwards your recipient address to 0x.</li>
            <li><strong className="text-white">The 0.1% fee</strong> goes to the app; the rest of the output goes to you (or to the address you entered).</li>
          </ul>
          <p className="text-slate-200 text-sm">
            So: your tokens in → 0x swaps them → output (minus fee) goes to the address you chose. Nobody is “covering” your swap; you’re only choosing where the result is sent.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-sky-300 mb-3">
            What allowance is and who it applies to
          </h2>
          <p className="text-slate-200 text-sm mb-2">
            When you <strong>sell a token</strong> (e.g. USDT, USDC), the chain requires you to “approve” a contract to spend that token. That permission is called an <strong>allowance</strong>.
          </p>
          <ul className="space-y-1.5 text-slate-200 text-sm list-disc list-inside mb-2">
            <li>The <strong>user</strong> (the swapper) sets the allowance. If a one-time “Approve” is needed, the <strong>user</strong> signs that transaction and pays gas for it (once per token).</li>
            <li>The app and the app operator do not set or pay for the user’s allowance. The app only shows an “Approve” button when 0x says allowance is required.</li>
            <li>If the swap fails with “transfer amount exceeds allowance”, it means the user’s allowance was too low; the user needs to approve again (or approve a higher amount) and retry.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-sky-300 mb-3">
            Available pairs by chain
          </h2>
          <p className="text-slate-200 text-sm mb-4">
            Same-chain swaps only. You can swap between any listed tokens and optionally <strong>receive real native</strong> (ETH, BNB, MATIC) via the “To” dropdown.
          </p>
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 bg-slate-800/80">
                  <th className="text-left py-3 px-4 font-medium text-white">Chain</th>
                  <th className="text-left py-3 px-4 font-medium text-white">Tokens (from/to)</th>
                  <th className="text-left py-3 px-4 font-medium text-white">Receive as native</th>
                </tr>
              </thead>
              <tbody className="text-slate-200">
                {CHAINS.map((chain) => (
                  <tr
                    key={chain.id}
                    className="border-b border-slate-700/30 last:border-0"
                  >
                    <td className="py-3 px-4 font-medium text-white">{chain.name}</td>
                    <td className="py-3 px-4">
                      {(CHAIN_TOKENS[chain.id] ?? []).map((t) => t.symbol).join(", ")}
                    </td>
                    <td className="py-3 px-4 text-sky-300">
                      {NATIVE_BY_CHAIN[chain.id] ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Any pair between these tokens on the same chain is supported. BNB has no USDC (USDT + WBNB only). You’ll see at confirm time whether the swap is sign-only or requires a transaction (you pay gas).
          </p>
        </section>

        <section className="mb-10 rounded-xl bg-slate-800/40 border border-slate-700/30 p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-sky-300 mb-2">
            Need help?
          </h2>
          <p className="text-sm text-slate-200 mb-2">
            Questions or issues? Reach out on Telegram.
          </p>
          <a
            href="https://t.me/brandonxbxgh"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 hover:text-sky-300 font-medium text-sm"
          >
            t.me/brandonxbxgh →
          </a>
        </section>

        <p className="text-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-sky-500 hover:bg-sky-400 px-5 py-2.5 text-sm font-medium text-white transition-colors"
          >
            Back to Swap
          </Link>
        </p>
      </div>
    </main>
  );
}
