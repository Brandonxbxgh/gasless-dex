# Vertex – Game Plan & Routes

> **Platform name:** Vertex  
> **Saved:** Feb 15, 2025  
> **Status:** Ready to start Phase 1

---

## Project Overview

| Item | Choice |
|------|--------|
| **Strategy** | Triangular arbitrage (primary), Grid trading (secondary) |
| **Chain** | Solana |
| **DEX** | Jupiter |
| **Custody** | Bot holds wallet key – fully autonomous, no per-trade signing |
| **KYC** | None – DEX-only, wallet-based |
| **Target** | 0.3–0.4% daily on $500–1K |
| **Deployment** | 100% free – Oracle Cloud / own machine, Supabase free, Vercel free |

---

## Requirements Summary

- Fully AI-operated, no manual signing
- Daily payout to designated wallet OR reinvest toggle
- Dashboard: profit charts (7d/30d), trade history, bot controls
- No subscriptions – only spend when depositing to trade

---

## Phase 1: Foundation

1. Project structure (bot + dashboard)
2. Solana wallet from env (Keypair)
3. Jupiter API – quote + swap
4. Supabase schema (trades, settings, daily snapshots)
5. Test: execute one swap

---

## Phase 2: Trading Engine

1. Define arb pairs (e.g. USDC ↔ SOL ↔ USDT)
2. Quote fetching for A→B→C→A loop
3. Profit calculation (minus fees)
4. Min profit threshold
5. Execution flow (3-hop or Jupiter route)
6. Slippage handling

---

## Phase 3: Bot Core

1. Main loop (scan → execute → wait)
2. Rate limiting
3. Trade logging to Supabase
4. Error handling
5. Balance tracking
6. Config (min profit, pairs, intervals)

---

## Phase 4: Payout System

1. Settings table (reinvest_enabled, payout_wallet)
2. Reinvest toggle logic
3. Daily P&L snapshot
4. Payout logic (compute profit, send to wallet)
5. Payout scheduler (cron)
6. Payout logging

---

## Phase 5: Dashboard

1. Next.js + Tailwind
2. API routes (trades, stats, settings, bot control)
3. Stats cards (balance, 24h/7d P&L, win rate)
4. Profit charts (7d, 30d, 90d)
5. Trade history table
6. Bot controls (Start/Stop/Pause, Reinvest)
7. Settings panel (payout wallet, min profit)
8. Live updates

---

## Phase 6: Polish

1. Telegram/Discord alerts
2. CSV export
3. Dark/light mode
4. Mobile responsive
5. Failed trades view
6. Documentation

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Bot | Node.js / TypeScript |
| Dashboard | Next.js, React, Tailwind |
| Database | Supabase (Postgres) |
| Charts | Recharts |
| Solana | @solana/web3.js |
| Jupiter | Jupiter REST API |

---

## Free Deployment Routes

| Component | Free Option |
|-----------|-------------|
| Bot | Oracle Cloud free VM or own machine |
| Database | Supabase free tier |
| Dashboard | Vercel free tier |
| RPC | Helius free tier or public RPC |

---

## Arb Pairs (Expected)

- USDC ↔ SOL ↔ USDT
- (Expand as needed)

---

## Platform: Vertex

Multi-feature income platform. First product: Solana triangular arbitrage bot. Additional features/income opportunities to be added over time.
