export const NATIVE_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
export const ALLOWANCE_HOLDER = "0x0000000000001fF3684f28c67538d4D072C22734" as const;

export const CHAINS = [
  { id: 1, name: "Ethereum" },
  { id: 8453, name: "Base" },
  { id: 42161, name: "Arbitrum" },
  { id: 137, name: "Polygon" },
  { id: 10, name: "Optimism" },
  { id: 56, name: "BNB" },
] as const;

export const CHAIN_NAME: Record<number, string> = {
  1: "Ethereum",
  8453: "Base",
  42161: "Arbitrum",
  137: "Polygon",
  10: "Optimism",
  56: "BNB",
};

export const EXPLORER_URL: Record<number, string> = {
  1: "https://etherscan.io",
  8453: "https://basescan.org",
  42161: "https://arbiscan.io",
  137: "https://polygonscan.com",
  10: "https://optimism.etherscan.io",
  56: "https://bscscan.com",
};

export const TOKENS_BY_CHAIN: Record<
  number,
  { address: string; symbol: string; decimals: number; isNative?: boolean }[]
> = {
  1: [
    { address: NATIVE_TOKEN, symbol: "ETH", decimals: 18, isNative: true },
    { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", decimals: 6 },
    { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", decimals: 6 },
    { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "WETH", decimals: 18 },
  ],
  8453: [
    { address: NATIVE_TOKEN, symbol: "ETH", decimals: 18, isNative: true },
    { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", decimals: 6 },
    { address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", symbol: "USDT", decimals: 6 },
    { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", decimals: 18 },
  ],
  42161: [
    { address: NATIVE_TOKEN, symbol: "ETH", decimals: 18, isNative: true },
    { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", decimals: 6 },
    { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", symbol: "USDT", decimals: 6 },
    { address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", symbol: "WETH", decimals: 18 },
  ],
  137: [
    { address: NATIVE_TOKEN, symbol: "MATIC", decimals: 18, isNative: true },
    { address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", symbol: "USDC", decimals: 6 },
    { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", symbol: "USDT", decimals: 6 },
    { address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", symbol: "WMATIC", decimals: 18 },
  ],
  10: [
    { address: NATIVE_TOKEN, symbol: "ETH", decimals: 18, isNative: true },
    { address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", symbol: "USDC", decimals: 6 },
    { address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", symbol: "USDT", decimals: 6 },
    { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", decimals: 18 },
  ],
  56: [
    { address: NATIVE_TOKEN, symbol: "BNB", decimals: 18, isNative: true },
    { address: "0x55d398326f99059fF775485246999027B3197955", symbol: "USDT", decimals: 18 },
    { address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", symbol: "WBNB", decimals: 18 },
  ],
};

export const WRAPPED_BY_CHAIN: Record<number, string> = {
  1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  8453: "0x4200000000000000000000000000000000000006",
  42161: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  137: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
  10: "0x4200000000000000000000000000000000000006",
  56: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
};

export const SWAP_FEE_BPS = "12";

export function getTokenDecimals(symbol: string, chainId: number): number {
  if (chainId === 56 && symbol === "USDT") return 18;
  const dec: Record<string, number> = {
    USDC: 6,
    USDT: 6,
    WETH: 18,
    WBNB: 18,
    WMATIC: 18,
    ETH: 18,
    MATIC: 18,
    BNB: 18,
  };
  return dec[symbol] ?? 18;
}

export function truncateAddress(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
