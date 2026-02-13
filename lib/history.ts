/** Transaction history stored in localStorage (per browser) */

export interface HistoryEntry {
  id: string;
  chainId: number;
  chainName: string;
  txHash: string;
  tradeHash?: string;
  sellSymbol: string;
  buySymbol: string;
  sellAmount: string;
  buyAmount: string;
  timestamp: number;
}

/** Blockchain tx from explorer API - for cross-device history */
export interface BlockchainTx {
  hash: string;
  chainId: number;
  chainName: string;
  timestamp: number;
  value?: string;
  from?: string;
  to?: string;
}

const STORAGE_KEY = "gasless-dex-history";
const MAX_ENTRIES = 50;

export function addToHistory(entry: Omit<HistoryEntry, "id" | "timestamp">): void {
  if (typeof window === "undefined") return;
  const item: HistoryEntry = {
    ...entry,
    id: `${entry.chainId}-${entry.txHash}-${Date.now()}`,
    timestamp: Date.now(),
  };
  const list = getHistory();
  list.unshift(item);
  const trimmed = list.slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // quota exceeded, ignore
  }
}

export function getHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
