"use client";

// Uniswap swap button (Uniswap prize — execution half of the integration).
// Buys a trending crypto asset with a real WETH->UNI swap on Ethereum Sepolia via the
// Trading API, signed by the user's Dynamic embedded wallet. Tokenized equities are
// quote-only: the Trading API blocks their tokens, so execution is disabled by design.
// UX mirrors Paywall.tsx (busy / disabled / error+retry states).

import { useState } from "react";
import { useDynamicContext, useSwitchNetwork } from "@dynamic-labs/sdk-react-core";
import { isEthereumWallet } from "@dynamic-labs/ethereum";
import {
  SWAP_CHAIN_ID,
  SWAP_CHAIN_NAME,
  SWAP_INPUT_LABEL,
  executeSwap,
  type SwapPublicClient,
  type SwapResult,
  type SwapStatus,
  type SwapWalletClient,
} from "@/lib/uniswapSwap";

export interface SwapButtonProps {
  ticker: string;
  kind: "crypto" | "equity";
  swappable: boolean; // verified crypto with an on-chain address
  priceUsd?: number | null; // for the equity indicative quote
}

const STATUS_LABEL: Record<SwapStatus, string> = {
  idle: `Swap ${SWAP_INPUT_LABEL}`,
  wrapping: "Wrapping ETH…",
  approving: "Approving Permit2…",
  quoting: "Getting quote…",
  signing: "Confirm in wallet…",
  swapping: "Swapping…",
  done: "Swapped ✓",
  failed: "Retry swap",
};

function isBusy(s: SwapStatus): boolean {
  return (
    s === "wrapping" ||
    s === "approving" ||
    s === "quoting" ||
    s === "signing" ||
    s === "swapping"
  );
}

export default function SwapButton({
  ticker,
  kind,
  swappable,
  priceUsd,
}: SwapButtonProps) {
  const { primaryWallet } = useDynamicContext();
  const switchNetwork = useSwitchNetwork();
  const [status, setStatus] = useState<SwapStatus>("idle");
  const [result, setResult] = useState<SwapResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Quote-only path: tokenized equities are compliance-gated at the Trading API.
  if (kind === "equity") {
    return (
      <div className="mt-4 rounded-xl border border-violet-500/30 bg-violet-500/5 px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Indicative price</span>
          <span className="font-medium text-zinc-200">
            {typeof priceUsd === "number" ? `$${priceUsd.toFixed(2)}` : "—"}
          </span>
        </div>
        <button
          type="button"
          disabled
          className="mt-3 w-full cursor-not-allowed rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-500"
        >
          Execution disabled
        </button>
        <p className="mt-2 text-xs text-violet-300/80">
          Tokenized equity — quote only. Pools are compliance-gated (KYC/geo); the
          Uniswap Trading API blocks the token for execution.
        </p>
      </div>
    );
  }

  const walletReady = !!primaryWallet && isEthereumWallet(primaryWallet);
  const busy = isBusy(status);

  if (!swappable) {
    return (
      <p className="mt-4 text-xs text-zinc-500">
        Unverified token — not swappable on testnet.
      </p>
    );
  }

  async function swap() {
    if (!primaryWallet || !isEthereumWallet(primaryWallet)) return;
    setError(null);
    setStatus("wrapping");
    try {
      try {
        await switchNetwork({ wallet: primaryWallet, network: SWAP_CHAIN_ID });
      } catch {
        // already on Sepolia or switching unsupported — continue.
      }
      const walletClient =
        (await primaryWallet.getWalletClient()) as SwapWalletClient;
      const publicClient =
        (await primaryWallet.getPublicClient()) as SwapPublicClient;

      const res = await executeSwap({
        ticker,
        swapper: primaryWallet.address as `0x${string}`,
        walletClient,
        publicClient,
        onStatus: setStatus,
      });
      setResult(res);
      setStatus("done");
    } catch (err) {
      setStatus("failed");
      const message = err instanceof Error ? err.message : "Swap failed";
      setError(
        /reject|denied|user/i.test(message)
          ? "Swap cancelled in wallet."
          : message,
      );
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={swap}
        disabled={!walletReady || busy || status === "done"}
        className="inline-flex w-full items-center justify-center rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy && (
          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        )}
        {!walletReady ? "Connect wallet to swap" : STATUS_LABEL[status]}
      </button>

      <p className="mt-2 text-xs text-zinc-500">
        Real swap on {SWAP_CHAIN_NAME} via the Uniswap Trading API.
      </p>

      {status === "done" && result && (
        <div className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          Bought {Number(result.outAmount).toFixed(4)} {result.outSymbol}
          {result.isDemoProxy && (
            <span className="text-emerald-300/70">
              {" "}
              (testnet demo pair — only WETH→UNI has Sepolia liquidity)
            </span>
          )}
          .{" "}
          <a
            href={result.explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-white"
          >
            View tx ↗
          </a>
        </div>
      )}

      {status === "failed" && error && (
        <div
          role="alert"
          className="mt-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
        >
          {error}
        </div>
      )}
    </div>
  );
}
