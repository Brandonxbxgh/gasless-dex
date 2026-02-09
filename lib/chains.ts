import { base, arbitrum, polygon } from "viem/chains";

// Chain configs for the app
export const supportedChains = [base, arbitrum, polygon] as const;
export type SupportedChainId = (typeof supportedChains)[number]["id"];

// Native wrapped token addresses per chain (WETH/WMATIC)
export const WRAPPED_NATIVE: Record<number, `0x${string}`> = {
  [base.id]: "0x4200000000000000000000000000000000000006" as `0x${string}`,
  [arbitrum.id]: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as `0x${string}`,
  [polygon.id]: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270" as `0x${string}`,
};

// USDC addresses per chain (common stablecoin for quotes)
export const USDC_ADDRESS: Record<number, `0x${string}`> = {
  [base.id]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`,
  [arbitrum.id]: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`,
  [polygon.id]: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as `0x${string}`,
};
