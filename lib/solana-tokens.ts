/** Solana token mints for Jupiter */

export const SOL_MINT = "So11111111111111111111111111111111111111112";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

export const SOLANA_TOKENS = [
  { mint: SOL_MINT, symbol: "SOL", decimals: 9 },
  { mint: USDC_MINT, symbol: "USDC", decimals: 6 },
  { mint: USDT_MINT, symbol: "USDT", decimals: 6 },
] as const;
