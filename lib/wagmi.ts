import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base, arbitrum, polygon } from "wagmi/chains";
import { http } from "viem";

const baseUrl = process.env.NEXT_PUBLIC_ALCHEMY_BASE_URL;
const arbitrumUrl = process.env.NEXT_PUBLIC_ALCHEMY_ARBITRUM_URL;
const polygonUrl = process.env.NEXT_PUBLIC_ALCHEMY_POLYGON_URL;

export const config = getDefaultConfig({
  appName: "Gasless DEX Aggregator",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  chains: [base, arbitrum, polygon],
  transports: {
    [base.id]: baseUrl ? http(baseUrl) : http(),
    [arbitrum.id]: arbitrumUrl ? http(arbitrumUrl) : http(),
    [polygon.id]: polygonUrl ? http(polygonUrl) : http(),
  },
  ssr: true,
});
