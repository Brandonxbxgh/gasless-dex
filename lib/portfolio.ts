import { createPublicClient, http, formatUnits, parseAbi } from "viem";
import { mainnet, base, arbitrum, polygon, optimism, bsc } from "viem/chains";

const NATIVE_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

const CHAINS = [
  { id: 1, name: "Ethereum", chain: mainnet },
  { id: 8453, name: "Base", chain: base },
  { id: 42161, name: "Arbitrum", chain: arbitrum },
  { id: 137, name: "Polygon", chain: polygon },
  { id: 10, name: "Optimism", chain: optimism },
  { id: 56, name: "BNB", chain: bsc },
] as const;

const TOKENS_BY_CHAIN: Record<number, { address: string; symbol: string; decimals: number; isNative?: boolean }[]> = {
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

const RPC_URLS: Record<number, string> = {
  1: process.env.NEXT_PUBLIC_ALCHEMY_ETH_URL || "https://eth.llamarpc.com",
  8453: process.env.NEXT_PUBLIC_ALCHEMY_BASE_URL || "https://mainnet.base.org",
  42161: process.env.NEXT_PUBLIC_ALCHEMY_ARBITRUM_URL || "https://arb1.arbitrum.io/rpc",
  137: process.env.NEXT_PUBLIC_ALCHEMY_POLYGON_URL || "https://polygon-rpc.com",
  10: process.env.NEXT_PUBLIC_ALCHEMY_OPTIMISM_URL || "https://mainnet.optimism.io",
  56: process.env.NEXT_PUBLIC_ALCHEMY_BNB_URL || "https://bsc-dataseed.binance.org",
};

const BALANCE_ABI = parseAbi(["function balanceOf(address account) view returns (uint256)"]);

export interface PortfolioEntry {
  chainId: number;
  chainName: string;
  symbol: string;
  balance: string;
  balanceRaw: bigint;
  decimals: number;
  priceUsd: number | null;
  valueUsd: number | null;
}

export async function fetchPortfolioBalances(address: `0x${string}`): Promise<PortfolioEntry[]> {
  const allEntries: PortfolioEntry[] = [];

  const chainPromises = CHAINS.map(async ({ id, name, chain }) => {
    const tokens = TOKENS_BY_CHAIN[id] ?? [];
    const url = RPC_URLS[id];
    const client = createPublicClient({
      chain,
      transport: http(url),
    });

    const entries: PortfolioEntry[] = [];
    for (const token of tokens) {
      try {
        let balanceRaw: bigint;
        if (token.isNative) {
          balanceRaw = await client.getBalance({ address });
        } else {
          balanceRaw = await client.readContract({
            address: token.address as `0x${string}`,
            abi: BALANCE_ABI,
            functionName: "balanceOf",
            args: [address],
          });
        }
        if (balanceRaw === BigInt(0)) continue;

        const balance = formatUnits(balanceRaw, token.decimals);
        entries.push({
          chainId: id,
          chainName: name,
          symbol: token.symbol,
          balance,
          balanceRaw,
          decimals: token.decimals,
          priceUsd: null,
          valueUsd: null,
        });
      } catch {
        // Skip failed token fetches (e.g. RPC rate limit)
      }
    }
    return entries;
  });

  const results = await Promise.all(chainPromises);
  for (const entries of results) {
    allEntries.push(...entries);
  }

  return allEntries;
}
