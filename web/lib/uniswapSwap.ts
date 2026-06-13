// Uniswap Trading API swap client (Uniswap prize — execution half of the integration).
// Runs check_approval -> quote -> (Permit2 sign) -> swap and broadcasts from the
// user's Dynamic embedded wallet on Ethereum Sepolia (the only testnet with routable
// liquidity for our key; see docs/UNISWAP_FEEDBACK.md). Quote path also serves the
// disabled tokenized-equity case, which the API itself blocks ("Token is blocked").

import { encodeFunctionData, formatUnits, parseAbi } from "viem";
import type { PaymentPublicClient, PaymentWalletClient } from "@/lib/flow";

const TRADING_API = "https://trade-api.gateway.uniswap.org/v1";
const API_KEY = process.env.NEXT_PUBLIC_UNISWAP_API_KEY ?? "";

export const SWAP_CHAIN_ID = 11155111; // Ethereum Sepolia
export const SWAP_CHAIN_NAME = "Ethereum Sepolia";
const EXPLORER_TX = "https://sepolia.etherscan.io/tx/";

// Verified Sepolia tokens with Trading API liquidity. WETH is the input; UNI is the
// only routable output, so non-UNI tickers fall back to it as a labelled demo proxy.
const WETH_SEPOLIA = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14" as const;
const UNI_SEPOLIA = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984" as const;
const SEPOLIA_OUT: Record<string, { address: `0x${string}`; symbol: string }> = {
  UNI: { address: UNI_SEPOLIA, symbol: "UNI" },
};

// 0.001 WETH — small, faucet-friendly input amount (18 decimals).
export const SWAP_INPUT_WEI = BigInt("1000000000000000");
export const SWAP_INPUT_LABEL = "0.001 WETH";

// signTypedData (Permit2) + readContract (WETH balance) on top of the shared clients.
export interface SwapWalletClient extends PaymentWalletClient {
  signTypedData: (args: {
    domain: Record<string, unknown>;
    types: Record<string, unknown>;
    primaryType: string;
    message: Record<string, unknown>;
  }) => Promise<`0x${string}`>;
}
export interface SwapPublicClient extends PaymentPublicClient {
  readContract: (args: {
    address: `0x${string}`;
    abi: unknown;
    functionName: string;
    args: unknown[];
  }) => Promise<unknown>;
}

export type SwapStatus =
  | "idle"
  | "wrapping"
  | "approving"
  | "quoting"
  | "signing"
  | "swapping"
  | "done"
  | "failed";

export interface SwapResult {
  txHash: `0x${string}`;
  explorerUrl: string;
  outAmount: string; // human-readable
  outSymbol: string;
  isDemoProxy: boolean;
}

interface TradeTx {
  to: `0x${string}`;
  data: `0x${string}`;
  value?: string;
}
interface QuoteResponse {
  routing: string;
  quote: { output?: { amount: string; token: string } };
  permitData: {
    domain: Record<string, unknown>;
    types: Record<string, unknown>;
    values: Record<string, unknown>;
  } | null;
}

const WETH_ABI = parseAbi([
  "function deposit() payable",
  "function balanceOf(address) view returns (uint256)",
]);

async function tradeFetch<T>(path: string, body: unknown): Promise<T> {
  if (!API_KEY) throw new Error("Missing NEXT_PUBLIC_UNISWAP_API_KEY");
  const res = await fetch(`${TRADING_API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.errorCode) {
    const detail = data?.detail || data?.errorCode || res.statusText;
    throw new Error(`Uniswap ${path} (${res.status}): ${detail}`);
  }
  return data as T;
}

function resolveOut(ticker: string): {
  address: `0x${string}`;
  symbol: string;
  isDemoProxy: boolean;
} {
  const hit = SEPOLIA_OUT[ticker.toUpperCase()];
  if (hit) return { ...hit, isDemoProxy: false };
  return { address: UNI_SEPOLIA, symbol: "UNI", isDemoProxy: true };
}

// Read-only quote for display (works for any verified crypto ticker on Sepolia).
export async function getSwapQuote(
  ticker: string,
  swapper: string,
): Promise<{ outAmount: string; outSymbol: string; isDemoProxy: boolean }> {
  const out = resolveOut(ticker);
  const q = await tradeFetch<QuoteResponse>("/quote", {
    type: "EXACT_INPUT",
    tokenInChainId: SWAP_CHAIN_ID,
    tokenOutChainId: SWAP_CHAIN_ID,
    tokenIn: WETH_SEPOLIA,
    tokenOut: out.address,
    amount: SWAP_INPUT_WEI.toString(),
    swapper,
  });
  const raw = q.quote.output?.amount ?? "0";
  return {
    outAmount: formatUnits(BigInt(raw), 18),
    outSymbol: out.symbol,
    isDemoProxy: out.isDemoProxy,
  };
}

// Full execution: wrap (if needed) -> approve Permit2 -> quote -> sign -> swap -> send.
export async function executeSwap(params: {
  ticker: string;
  swapper: `0x${string}`;
  walletClient: SwapWalletClient;
  publicClient: SwapPublicClient;
  onStatus?: (s: SwapStatus) => void;
}): Promise<SwapResult> {
  const { ticker, swapper, walletClient, publicClient, onStatus } = params;
  const out = resolveOut(ticker);

  // 1. Ensure the wallet holds enough WETH; wrap native ETH if short.
  const balance = (await publicClient.readContract({
    address: WETH_SEPOLIA,
    abi: WETH_ABI,
    functionName: "balanceOf",
    args: [swapper],
  })) as bigint;
  if (balance < SWAP_INPUT_WEI) {
    onStatus?.("wrapping");
    const wrapHash = await walletClient.sendTransaction({
      to: WETH_SEPOLIA,
      data: encodeFunctionData({ abi: WETH_ABI, functionName: "deposit" }),
      value: SWAP_INPUT_WEI - balance,
    });
    await publicClient.waitForTransactionReceipt({ hash: wrapHash });
  }

  // 2. check_approval — send the ERC-20 approve to Permit2 if one is returned.
  onStatus?.("approving");
  const approval = await tradeFetch<{ approval: TradeTx | null }>(
    "/check_approval",
    {
      walletAddress: swapper,
      amount: SWAP_INPUT_WEI.toString(),
      token: WETH_SEPOLIA,
      chainId: SWAP_CHAIN_ID,
    },
  );
  if (approval.approval) {
    const approvalHash = await walletClient.sendTransaction({
      to: approval.approval.to,
      data: approval.approval.data,
    });
    await publicClient.waitForTransactionReceipt({ hash: approvalHash });
  }

  // 3. quote
  onStatus?.("quoting");
  const quote = await tradeFetch<QuoteResponse>("/quote", {
    type: "EXACT_INPUT",
    tokenInChainId: SWAP_CHAIN_ID,
    tokenOutChainId: SWAP_CHAIN_ID,
    tokenIn: WETH_SEPOLIA,
    tokenOut: out.address,
    amount: SWAP_INPUT_WEI.toString(),
    swapper,
  });

  // 4. Sign the Permit2 typed data when the quote requires it.
  onStatus?.("signing");
  let signature: `0x${string}` | undefined;
  if (quote.permitData) {
    const { domain, types, values } = quote.permitData;
    const cleanTypes = { ...types } as Record<string, unknown>;
    delete cleanTypes.EIP712Domain;
    signature = await walletClient.signTypedData({
      domain,
      types: cleanTypes,
      primaryType: "PermitSingle",
      message: values,
    });
  }

  // 5. swap — returns the ready-to-send transaction.
  const swapResp = await tradeFetch<{ swap: TradeTx }>("/swap", {
    quote: quote.quote,
    ...(quote.permitData && signature
      ? { permitData: quote.permitData, signature }
      : {}),
  });

  // 6. Broadcast and confirm.
  onStatus?.("swapping");
  const txHash = await walletClient.sendTransaction({
    to: swapResp.swap.to,
    data: swapResp.swap.data,
    value: swapResp.swap.value ? BigInt(swapResp.swap.value) : BigInt(0),
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  onStatus?.("done");
  const raw = quote.quote.output?.amount ?? "0";
  return {
    txHash,
    explorerUrl: `${EXPLORER_TX}${txHash}`,
    outAmount: formatUnits(BigInt(raw), 18),
    outSymbol: out.symbol,
    isDemoProxy: out.isDemoProxy,
  };
}
