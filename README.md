# Gasless DEX Aggregator

A multi-chain swap interface using the **0x Gasless API v2**. Users sign a message instead of paying gas — perfect for onboarding users with zero ETH/MATIC.

## Features

- **Gasless swaps** — Sign EIP-712, we relay the transaction
- **0.12% same-chain / 0.15% cross-chain fee** — `swapFeeBps: 12` and Across `appFee` to your `swapFeeRecipient`
- **Multi-chain** — Base (primary), Arbitrum, Polygon
- **$0 budget** — Vercel hosting + free-tier Alchemy + 0x API

## Tech Stack

- **Framework:** Next.js 14 (App Router) + Tailwind CSS
- **Web3:** wagmi + viem
- **Wallet:** RainbowKit
- **RPC:** Alchemy (Base, Arbitrum, Polygon)
- **API:** 0x Gasless v2

---

## Step-by-Step Setup

### 1. Clone & Install

```bash
cd gasless-dex
npm install
```

### 2. Get Your API Keys (all free)

| Service | Where | Notes |
|---------|-------|-------|
| **0x API** | [dashboard.0x.org](https://dashboard.0x.org) | Required for swaps |
| **Alchemy** | [alchemy.com](https://www.alchemy.com/) | One key works for Base, Arbitrum, Polygon |
| **WalletConnect** | [cloud.walletconnect.com](https://cloud.walletconnect.com) | Optional; for mobile wallets |

### 3. Create `.env.local`

Copy the example and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_ZERO_EX_API_KEY=your_0x_api_key
NEXT_PUBLIC_ALCHEMY_BASE_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
NEXT_PUBLIC_ALCHEMY_ARBITRUM_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
NEXT_PUBLIC_ALCHEMY_POLYGON_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
NEXT_PUBLIC_SWAP_FEE_RECIPIENT=0xYourWalletAddressForFees
```

**Fee recipient:** This is your wallet. You earn 0.12% on same-chain swaps and 0.15% on cross-chain swaps.

**WalletConnect (optional):** Add `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` if you want mobile wallet support. Without it, MetaMask/browser wallets still work.

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), connect your wallet, and try a swap.

### 5. Deploy to Vercel (free)

```bash
npm run build
```

Push to GitHub, then:

1. Go to [vercel.com](https://vercel.com)
2. Import your repo
3. Add the same env vars in Project Settings → Environment Variables
4. Deploy

---

## How Gasless Swaps Work

1. **Quote** — Call `GET /gasless/quote` with `chainId`, `sellToken`, `buyToken`, `sellAmount`, `taker`, and your fee params.
2. **Sign** — User signs two EIP-712 messages in their wallet (no gas):
   - **Approval** (if token supports Permit) — gasless allowance
   - **Trade** — the swap itself
3. **Submit** — POST signed data to `POST /gasless/submit`.
4. **Status** — Poll `GET /gasless/status/{tradeHash}` until `confirmed`.

The 0x API relays the transaction and pays gas. Users only sign.

---

## EIP-712 Signature Handling

wagmi’s `useWalletClient` exposes `signTypedData`, which matches the EIP-712 flow:

```ts
const sig = await walletClient.signTypedData({
  account: address,
  domain: quote.trade.eip712.domain,
  types: quote.trade.eip712.types,
  primaryType: quote.trade.eip712.primaryType,
  message: quote.trade.eip712.message,
});
```

The raw signature is 65 bytes: `r` (32) + `s` (32) + `v` (1). We split it in `lib/signature.ts` and send `{ r, s, v, signatureType: 2 }` to the 0x submit endpoint.

---

## Monetization

- `swapFeeBps: "12"` → 0.12% same-chain fee; cross-chain uses Across `appFee` (0.15%)
- `swapFeeRecipient` → your wallet
- `swapFeeToken` → sell or buy token (we use sell token)

Fees are charged per trade and sent to your `swapFeeRecipient`.

---

## Token Support

Some tokens need a one-time **standard approval** (e.g. native WETH). If the 0x quote returns `approval: null` but `issues.allowance != null`, the user must approve the Permit2/AllowanceHolder contract once with gas. After that, future swaps can be gasless.

Supported by default: USDC (gasless approval), WETH/WMATIC (may need initial approval).

---

## File Structure

```
gasless-dex/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── providers.tsx
├── components/
│   └── Swap.tsx
├── lib/
│   ├── api.ts       # 0x Gasless quote/submit/status
│   ├── chains.ts    # Chain configs + token addresses
│   ├── signature.ts # EIP-712 signature splitting
│   └── wagmi.ts     # wagmi + RainbowKit config
├── .env.example
└── README.md
```

---

## Cost Breakdown ($0)

| Service | Free Tier |
|---------|-----------|
| Vercel | 100 GB bandwidth, serverless |
| Alchemy | 300M compute units/month |
| 0x API | Free (check dashboard for limits) |
| RainbowKit | Free |

---

## Troubleshooting

- **"NEXT_PUBLIC_ZERO_EX_API_KEY is not set"** — Add it to `.env.local` and restart `npm run dev`.
- **"No liquidity available"** — Try a different amount or pair (e.g. USDC ↔ WETH).
- **"This token requires a one-time approval"** — User must approve the spender once with gas; later swaps can be gasless.
- **WalletConnect not working** — Add `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` from [cloud.walletconnect.com](https://cloud.walletconnect.com).

---

Built with 0x Gasless API v2 • [0x Docs](https://0x.org/docs/upgrading/upgrading_to_gasless_v2)
