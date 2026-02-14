"use client";

import { useAccount } from "wagmi";

const CHANGELLY_MERCHANT_ID = process.env.NEXT_PUBLIC_CHANGELLY_MERCHANT_ID || "";

function buildWidgetUrl(destinationAddress?: string): string {
  const params = new URLSearchParams({
    amount: "100",
    v: "3",
    type: "no-rev-share",
    color: "fc72ff",
    headerId: "1",
    logo: "hide",
    buyButtonTextId: "1",
  });
  if (CHANGELLY_MERCHANT_ID) {
    params.set("merchant_id", CHANGELLY_MERCHANT_ID);
  }
  if (destinationAddress) {
    params.set("address", destinationAddress);
  }
  return `https://widget.changelly.com?${params.toString()}`;
}

export default function BuyPage() {
  const { address } = useAccount();
  const widgetUrl = buildWidgetUrl(address);

  return (
    <main className="min-h-screen flex flex-col items-center p-4 pt-8 sm:p-6 sm:pt-10 orb-bg bg-[var(--delta-bg)] relative z-10">
      <div className="w-full max-w-lg mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 text-center">
          Buy crypto
        </h1>
        <p className="text-sm text-[var(--delta-text-muted)] text-center mb-6">
          Buy crypto with card, bank transfer, or Apple Pay. Powered by Changelly.
        </p>

        {address && (
          <p className="text-xs text-[var(--delta-text-muted)] mb-2 text-center">
            Wallet: {address.slice(0, 6)}…{address.slice(-4)}
          </p>
        )}

        <div className="rounded-2xl border border-[var(--swap-pill-border)] bg-[var(--delta-card)] overflow-hidden shadow-xl">
          <iframe
            key={widgetUrl}
            src={widgetUrl}
            width="100%"
            height="630"
            frameBorder="0"
            allow="camera"
            className="min-h-[500px] sm:min-h-[630px]"
            title="Buy crypto with Changelly"
          />
        </div>

        <p className="mt-4 text-xs text-[var(--delta-text-muted)] text-center">
          ~2% fee. KYC handled by Changelly&apos;s providers. You can paste your wallet address in the widget to receive crypto directly.
        </p>
      </div>
    </main>
  );
}
