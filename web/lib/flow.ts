// Dynamic Flow paywall client (Dynamic prize — "pay with anything" $1 checkout).
// Runs the per-payment Flow checkout state machine from the browser against
// Dynamic's HTTP API. The dyn_ server token is NEVER used here — only the
// short-lived dct_ session token minted when the transaction is created.
// Checkout config creation lives server-side (api/main.py POST /checkout).

import { parseAbi } from "viem";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8765";
const DYNAMIC_API_BASE =
  process.env.NEXT_PUBLIC_DYNAMIC_API_BASE ?? "https://app.dynamicauth.com/api/v0";
const ENVIRONMENT_ID = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID ?? "";

export const PRICE_USD = "1.00";
export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const BASE_SEPOLIA_EXPLORER_TX = "https://sepolia.basescan.org/tx/";
export const BASE_SEPOLIA_USDC =
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;

export type FlowStatus =
  | "idle"
  | "creating"
  | "quoting"
  | "awaiting_signature"
  | "broadcasting"
  | "settling"
  | "settled"
  | "failed";

export interface FlowResult {
  transactionId: string;
  txHash: string;
}

// Minimal structural types so this file stays decoupled from the wallet SDK.
export interface PaymentWalletClient {
  sendTransaction: (args: {
    to: `0x${string}`;
    data?: `0x${string}`;
    value?: bigint;
  }) => Promise<`0x${string}`>;
  writeContract: (args: {
    address: `0x${string}`;
    abi: unknown;
    functionName: string;
    args: unknown[];
  }) => Promise<`0x${string}`>;
}

export interface PaymentPublicClient {
  waitForTransactionReceipt: (args: {
    hash: `0x${string}`;
  }) => Promise<unknown>;
}

interface SigningPayload {
  evmTransaction: { to: string; data: string; value: string };
  evmApproval?: { tokenAddress: string; spenderAddress: string; amount: string };
}

interface CheckoutTransaction {
  id: string;
  executionState?: string;
  settlementState?: string;
  riskState?: string;
  txHash?: string;
  quote?: { signingPayload?: SigningPayload; fees?: { totalFeeUsd?: string } };
}

const TERMINAL_EXECUTION = new Set(["cancelled", "expired", "failed"]);
const TERMINAL_SETTLEMENT = new Set(["completed", "failed"]);

async function dynamicFetch<T>(
  path: string,
  init: { method: "POST" | "GET"; body?: unknown; sessionToken?: string },
): Promise<T> {
  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (init.sessionToken)
    headers["x-dynamic-checkout-session-token"] = init.sessionToken;

  const res = await fetch(`${DYNAMIC_API_BASE}${path}`, {
    method: init.method,
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Flow ${path} (${res.status})${detail ? `: ${detail}` : ""}`);
  }
  return res.json() as Promise<T>;
}

// Step 0: ask our backend to create (or reuse) the $1 checkout config.
export async function createCheckout(): Promise<string> {
  const res = await fetch(`${API_BASE}/checkout`, { method: "POST" });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Checkout config failed (${res.status})${detail ? `: ${detail}` : ""}`,
    );
  }
  const data = (await res.json()) as { checkoutId?: string };
  if (!data.checkoutId) throw new Error("Checkout config missing checkoutId");
  return data.checkoutId;
}

async function pollSettlement(
  transactionId: string,
  onStatus?: (s: FlowStatus) => void,
): Promise<CheckoutTransaction> {
  for (;;) {
    const tx = await dynamicFetch<CheckoutTransaction>(
      `/sdk/${ENVIRONMENT_ID}/transactions/${transactionId}`,
      { method: "GET" },
    );
    if (
      TERMINAL_EXECUTION.has(tx.executionState ?? "") ||
      TERMINAL_SETTLEMENT.has(tx.settlementState ?? "")
    ) {
      return tx;
    }
    onStatus?.("settling");
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

// Runs createTransaction -> attachSource -> quote -> prepare -> sign/broadcast
// -> notify -> poll. Resolves once funds settle to the treasury, throws on
// any failure / user rejection so the caller can surface a retry.
export async function runCheckout(params: {
  walletClient: PaymentWalletClient;
  publicClient?: PaymentPublicClient;
  address: string;
  checkoutId: string;
  onStatus?: (status: FlowStatus) => void;
}): Promise<FlowResult> {
  const { walletClient, publicClient, address, checkoutId, onStatus } = params;
  if (!ENVIRONMENT_ID) throw new Error("Missing NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID");

  onStatus?.("creating");
  const created = await dynamicFetch<{
    sessionToken: string;
    transaction: CheckoutTransaction;
  }>(`/sdk/${ENVIRONMENT_ID}/checkouts/${checkoutId}/transactions`, {
    method: "POST",
    body: { amount: PRICE_USD, currency: "USD" },
  });
  const sessionToken = created.sessionToken;
  const transactionId = created.transaction.id;

  await dynamicFetch<CheckoutTransaction>(
    `/sdk/${ENVIRONMENT_ID}/transactions/${transactionId}/source`,
    {
      method: "POST",
      sessionToken,
      body: {
        sourceType: "wallet",
        fromAddress: address,
        fromChainId: String(BASE_SEPOLIA_CHAIN_ID),
        fromChainName: "EVM",
      },
    },
  );

  onStatus?.("quoting");
  await dynamicFetch<CheckoutTransaction>(
    `/sdk/${ENVIRONMENT_ID}/transactions/${transactionId}/quote`,
    {
      method: "POST",
      sessionToken,
      body: { fromTokenAddress: BASE_SEPOLIA_USDC },
    },
  );

  const prepared = await dynamicFetch<CheckoutTransaction>(
    `/sdk/${ENVIRONMENT_ID}/transactions/${transactionId}/prepare`,
    {
      method: "POST",
      sessionToken,
      body: {
        assertBalanceForGasCost: true,
        assertBalanceForTransferAmount: true,
      },
    },
  );

  const signingPayload = prepared.quote?.signingPayload;
  if (!signingPayload?.evmTransaction) {
    throw new Error("Flow prepare returned no signing payload");
  }

  onStatus?.("awaiting_signature");
  if (signingPayload.evmApproval) {
    const { tokenAddress, spenderAddress, amount } = signingPayload.evmApproval;
    const approvalHash = await walletClient.writeContract({
      address: tokenAddress as `0x${string}`,
      abi: parseAbi(["function approve(address, uint256) returns (bool)"]),
      functionName: "approve",
      args: [spenderAddress as `0x${string}`, BigInt(amount)],
    });
    await publicClient?.waitForTransactionReceipt({ hash: approvalHash });
  }

  const txHash = await walletClient.sendTransaction({
    to: signingPayload.evmTransaction.to as `0x${string}`,
    data: signingPayload.evmTransaction.data as `0x${string}`,
    value: BigInt(signingPayload.evmTransaction.value),
  });

  onStatus?.("broadcasting");
  await dynamicFetch<CheckoutTransaction>(
    `/sdk/${ENVIRONMENT_ID}/transactions/${transactionId}/broadcast`,
    { method: "POST", sessionToken, body: { txHash } },
  );

  const final = await pollSettlement(transactionId, onStatus);
  if (final.settlementState !== "completed") {
    throw new Error(
      `Payment did not settle (execution: ${final.executionState ?? "?"}, settlement: ${final.settlementState ?? "?"})`,
    );
  }

  onStatus?.("settled");
  return { transactionId, txHash };
}
