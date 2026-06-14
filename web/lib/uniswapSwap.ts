// Uniswap Trading API swap client (Uniswap prize — execution half of the integration).
// Runs check_approval -> quote -> (Permit2 sign) -> swap and broadcasts from the
// user's Dynamic embedded wallet on Ethereum Sepolia (the only testnet with routable
// liquidity for our key; see docs/UNISWAP_FEEDBACK.md). Quote path also serves the
// disabled tokenized-equity case, which the API itself blocks ("Token is blocked").

import {
  encodeFunctionData,
  formatEther,
  formatUnits,
  parseAbi,
  parseEther,
} from "viem";
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

// Default input is small so faucet-funded Sepolia wallets can swap + pay gas.
export const SWAP_DEFAULT_ETH = "0.0001";
export const SWAP_MIN_ETH = "0.00001";
export const SWAP_MAX_ETH = "1";
const GAS_BUFFER_WEI = parseEther("0.0003");

export function parseSwapAmount(eth: string): bigint {
  const trimmed = eth.trim();
  if (!trimmed || !/^\d*\.?\d+$/.test(trimmed)) {
    throw new Error("Enter a valid ETH amount.");
  }
  const wei = parseEther(trimmed);
  const min = parseEther(SWAP_MIN_ETH);
  const max = parseEther(SWAP_MAX_ETH);
  if (wei < min) throw new Error(`Minimum swap is ${SWAP_MIN_ETH} ETH.`);
  if (wei > max) throw new Error(`Maximum swap is ${SWAP_MAX_ETH} ETH.`);
  return wei;
}

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
  getBalance: (args: { address: `0x${string}` }) => Promise<bigint>;
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
  amountWei: bigint,
): Promise<{ outAmount: string; outSymbol: string; isDemoProxy: boolean }> {
  const out = resolveOut(ticker);
  const q = await tradeFetch<QuoteResponse>("/quote", {
    type: "EXACT_INPUT",
    tokenInChainId: SWAP_CHAIN_ID,
    tokenOutChainId: SWAP_CHAIN_ID,
    tokenIn: WETH_SEPOLIA,
    tokenOut: out.address,
    amount: amountWei.toString(),
    swapper,
  });
  const raw = q.quote.output?.amount ?? "0";
  return {
    outAmount: formatUnits(BigInt(raw), 18),
    outSymbol: out.symbol,
    isDemoProxy: out.isDemoProxy,
  };
}

async function ensureSwapFunds(
  swapper: `0x${string}`,
  amountWei: bigint,
  publicClient: SwapPublicClient,
): Promise<void> {
  const [wethBalance, ethBalance] = await Promise.all([
    publicClient.readContract({
      address: WETH_SEPOLIA,
      abi: WETH_ABI,
      functionName: "balanceOf",
      args: [swapper],
    }) as Promise<bigint>,
    publicClient.getBalance({ address: swapper }),
  ]);
  const wrapNeeded = amountWei > wethBalance ? amountWei - wethBalance : BigInt(0);
  const totalNeeded = wrapNeeded + GAS_BUFFER_WEI;
  if (ethBalance < totalNeeded) {
    const have = formatEther(ethBalance);
    const need = formatEther(totalNeeded);
    throw new Error(
      `Insufficient Sepolia ETH. You have ${have} ETH but need ~${need} ETH ` +
        `(swap amount + gas). Get test ETH from a Sepolia faucet.`,
    );
  }
}

// Full execution: wrap (if needed) -> approve Permit2 -> quote -> sign -> swap -> send.
export async function executeSwap(params: {
  ticker: string;
  swapper: `0x${string}`;
  amountWei: bigint;
  walletClient: SwapWalletClient;
  publicClient: SwapPublicClient;
  onStatus?: (s: SwapStatus) => void;
}): Promise<SwapResult> {
  const { ticker, swapper, amountWei, walletClient, publicClient, onStatus } =
    params;
  const out = resolveOut(ticker);

  await ensureSwapFunds(swapper, amountWei, publicClient);

  // 1. Ensure the wallet holds enough WETH; wrap native ETH if short.
  const balance = (await publicClient.readContract({
    address: WETH_SEPOLIA,
    abi: WETH_ABI,
    functionName: "balanceOf",
    args: [swapper],
  })) as bigint;
  if (balance < amountWei) {
    onStatus?.("wrapping");
    const wrapHash = await walletClient.sendTransaction({
      to: WETH_SEPOLIA,
      data: encodeFunctionData({ abi: WETH_ABI, functionName: "deposit" }),
      value: amountWei - balance,
    });
    await publicClient.waitForTransactionReceipt({ hash: wrapHash });
  }

  // 2. check_approval — send the ERC-20 approve to Permit2 if one is returned.
  onStatus?.("approving");
  const approval = await tradeFetch<{ approval: TradeTx | null }>(
    "/check_approval",
    {
      walletAddress: swapper,
      amount: amountWei.toString(),
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
    amount: amountWei.toString(),
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
