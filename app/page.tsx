import { Swap } from "@/components/Swap";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 pt-8 sm:p-6 sm:pt-10 circuit-bg">
      <Swap />
      <p className="mt-6 text-sm text-slate-300 text-center max-w-sm">
        Powered by 0x. Your keys stay in your wallet.
      </p>
    </main>
  );
}
