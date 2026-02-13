import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { metaMaskWallet, coinbaseWallet, walletConnectWallet, injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { base, arbitrum, polygon, bsc, mainnet } from "wagmi/chains";

const baseUrl = process.env.NEXT_PUBLIC_ALCHEMY_BASE_URL;
const arbitrumUrl = process.env.NEXT_PUBLIC_ALCHEMY_ARBITRUM_URL;
const polygonUrl = process.env.NEXT_PUBLIC_ALCHEMY_POLYGON_URL;
const bnbUrl = process.env.NEXT_PUBLIC_ALCHEMY_BNB_URL;
const ethUrl = process.env.NEXT_PUBLIC_ALCHEMY_ETH_URL;

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Popular",
      wallets: [coinbaseWallet, metaMaskWallet, walletConnectWallet],
    },
    {
      groupName: "Recommended",
      wallets: [injectedWallet],
    },
  ],
  { appName: "Gasless DEX Aggregator", projectId }
);

export const config = createConfig({
  connectors,
  chains: [base, arbitrum, polygon, bsc, mainnet],
  transports: {
    [base.id]: baseUrl ? http(baseUrl) : http(),
    [arbitrum.id]: arbitrumUrl ? http(arbitrumUrl) : http(),
    [polygon.id]: polygonUrl ? http(polygonUrl) : http(),
    [bsc.id]: bnbUrl ? http(bnbUrl) : http(),
    [mainnet.id]: ethUrl ? http(ethUrl) : http(),
  },
  ssr: true,
});
