import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DeltaChainLabs | Swap, Bridge & Buy",
    short_name: "DeltaChainLabs",
    description: "Swap tokens. Bridge chains. Buy crypto with fiat. All in one place.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0d0f",
    theme_color: "#fc72ff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
