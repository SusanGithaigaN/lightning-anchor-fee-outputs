const API_BASE = "http://localhost:3000/api/v1";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    if (res.status === 402) {
      throw new Error("Please pay the Lightning invoice first.");
    }
    throw new Error(data?.error || data?.message || `Request failed (${res.status})`);
  }

  if (!data.success) {
    throw new Error(data?.error || "Unknown error");
  }

  return data.data as T;
}

export interface FeeEstimate {
  childFeeNeeded: number;
  feasible: boolean;
  totalFeeNeeded: number;
  parentTxSize?: number;
  parentFeeRate?: number;
}

export interface Invoice {
  paymentHash: string;
  invoice: string;
  amountSats: number;
}

export interface PaymentStatus {
  paid: boolean;
}

export interface BroadcastResult {
  childTxid: string;
  feePaid: number;
}

export interface BlockchainInfo {
  blocks: number;
  chain: string;
  bestblockhash?: string;
}

export interface MonitorStatus {
  active: boolean;
  trackedTransactions?: number;
}

export const api = {
  estimateFee: (txid: string, anchorIndex: number, targetFeeRate: number) =>
    request<FeeEstimate>("/feebump/estimate", {
      method: "POST",
      body: JSON.stringify({ txid, anchorIndex, targetFeeRate }),
    }),

  createInvoice: (amountSats: number, memo?: string) =>
    request<Invoice>("/lightning/create-invoice", {
      method: "POST",
      body: JSON.stringify({ amountSats, memo }),
    }),

  checkPayment: (hash: string) =>
    request<PaymentStatus>(`/lightning/payment/${hash}`),

  createFeeBump: (txid: string, anchorIndex: number, targetFeeRate: number) =>
    request<BroadcastResult>("/feebump/create", {
      method: "POST",
      body: JSON.stringify({ txid, anchorIndex, targetFeeRate }),
    }),

  broadcastFeeBump: (txid: string, anchorIndex: number, targetFeeRate: number, paymentHash: string) =>
    request<BroadcastResult>("/feebump/broadcast", {
      method: "POST",
      body: JSON.stringify({ txid, anchorIndex, targetFeeRate, paymentHash }),
    }),

  getBlockchainInfo: () => request<BlockchainInfo>("/bitcoin/info"),

  startMonitoring: () =>
    request<{ message: string }>("/monitor/start", { method: "POST" }),

  getMonitorStatus: () => request<MonitorStatus>("/monitor/status"),
};
