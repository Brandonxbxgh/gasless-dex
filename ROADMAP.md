# DeltaChainLabs gasless-dex — Roadmap

## Done
- **Support tab** — Nav link to Telegram (@brandonxbxgh).
- **How it works page** — Explains swaps, gasless vs requires gas, available pairs, and what you send/receive.

---

## Next (in order)

### 1. Separate gasless vs requires-gas in the UI
- In the Swap UI, cleanly separate:
  - **Gasless** — Pairs that only need a signature (e.g. USDC ↔ WETH, USDT ↔ WBNB).
  - **Requires gas** — Pairs where the user pays gas (e.g. native ETH/BNB/MATIC → stable/wrapped).
- Options: tabs (“Gasless” / “With gas”), or two sections, or a filter. Keep it minimal and professional.

### 2. Receive in real native tokens
- Today: buying “WETH/WBNB/WMATIC” gives **wrapped** only.
- Goal: offer “Receive native ETH/BNB/MATIC” so the user gets real native in their wallet.
- Implementation: check if 0x Swap API supports `buyToken: native` (or equivalent); if yes, add native as a receive option and use that in the quote/tx. If the API only delivers wrapped, consider an unwrap step (e.g. WETH → ETH) in the same flow or as a follow-up.

### 3. Swap from wrapped to stable / native
- **Wrapped → stable** (e.g. WETH → USDC): already supported via gasless (ERC20 sell).
- **Wrapped → native** (e.g. WETH → ETH): add “unwrap” or a swap that buys native (if 0x supports it). May tie into “receive native” above.

### 4. Bridging (later)
- Cross-chain bridging is out of scope for the current 0x gasless/swap setup. Can be revisited when you want to add a bridge provider or multi-chain flow.

---

## Suggested order of work
1. **UI separation** (gasless vs requires gas) — improves clarity without new APIs.
2. **Receive native** — depends on 0x capabilities; then unwrap/wrapped→native can follow.
