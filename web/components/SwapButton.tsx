"use client";

// Uniswap swap button (Uniswap prize — execution half of the integration).
// Buys a trending crypto asset with a real WETH->UNI swap on Ethereum Sepolia via the
// Trading API, signed by the user's Dynamic embedded wallet. Tokenized equities are
// quote-only: the Trading API blocks their tokens, so execution is disabled by design.
// UX mirrors Paywall.tsx (busy / disabled / error+retry states).

import { useEffect, useState } from "react";
import { useDynamicContext, useSwitchNetwork } from "@dynamic-labs/sdk-react-core";
import { isEthereumWallet } from "@dynamic-labs/ethereum";
import {
  SWAP_CHAIN_ID,
  SWAP_CHAIN_NAME,
  SWAP_DEFAULT_ETH,
  SWAP_MAX_ETH,
  SWAP_MIN_ETH,
  executeSwap,
  getSwapQuote,
  parseSwapAmount,
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

const BUSY_LABEL: Record<Exclude<SwapStatus, "idle" | "done" | "failed">, string> = {
  wrapping: "Wrapping ETH…",
  approving: "Approving Permit2…",
  quoting: "Getting quote…",
  signing: "Confirm in wallet…",
  swapping: "Swapping…",
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
  const [amountEth, setAmountEth] = useState(SWAP_DEFAULT_ETH);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [status, setStatus] = useState<SwapStatus>("idle");
  const [result, setResult] = useState<SwapResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quoteOut, setQuoteOut] = useState<{
    outAmount: string;
    outSymbol: string;
    isDemoProxy: boolean;
  } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const walletReady = !!primaryWallet && isEthereumWallet(primaryWallet);
  const busy = isBusy(status);

  useEffect(() => {
    if (!walletReady || !swappable || kind !== "crypto") {
      setQuoteOut(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const amountWei = parseSwapAmount(amountEth);
        setAmountError(null);
        setQuoteLoading(true);
        const q = await getSwapQuote(
          ticker,
          primaryWallet!.address as string,
          amountWei,
        );
        if (!cancelled) setQuoteOut(q);
      } catch (err) {
        if (!cancelled) {
          setQuoteOut(null);
          setAmountError(
            err instanceof Error ? err.message : "Invalid amount",
          );
        }
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [amountEth, ticker, walletReady, swappable, kind, primaryWallet]);

  // Quote-only path: tokenized equities are compliance-gated at the Trading API.
  if (kind === "equity") {
    return (
      <div className="mt-4 rounded border-2 border-purple-600/40 bg-purple-50 px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink/50">Indicative price</span>
          <span className="font-bold text-ink">
            {typeof priceUsd === "number" ? `$${priceUsd.toFixed(2)}` : "—"}
          </span>
        </div>
        <button
          type="button"
          disabled
          className="mt-3 w-full cursor-not-allowed rounded border-2 border-ink/20 bg-ink/5 px-4 py-2 text-sm font-bold text-ink/40"
        >
          Execution disabled
        </button>
        <p className="mt-2 text-xs text-purple-700/80">
          Tokenized equity — quote only. Pools are compliance-gated (KYC/geo); the
          Uniswap Trading API blocks the token for execution.
        </p>
      </div>
    );
  }

  if (!swappable) {
    return (
      <p className="mt-4 text-xs text-ink/40">
        Unverified token — not swappable on testnet.
      </p>
    );
  }

  function onAmountChange(value: string) {
    setAmountEth(value);
    setAmountError(null);
    if (status === "failed" || status === "done") {
      setStatus("idle");
      setError(null);
      setResult(null);
    }
  }

  function buttonLabel(): string {
    if (!walletReady) return "Connect wallet to swap";
    if (busy) return BUSY_LABEL[status as keyof typeof BUSY_LABEL];
    if (status === "done") return "Swapped ✓";
    if (status === "failed") return "Retry swap";
    return `Swap ${amountEth || SWAP_DEFAULT_ETH} ETH`;
  }

  async function swap() {
    if (!primaryWallet || !isEthereumWallet(primaryWallet)) return;
    setError(null);
    let amountWei: bigint;
    try {
      amountWei = parseSwapAmount(amountEth);
      setAmountError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid amount";
      setAmountError(message);
      return;
    }
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
        amountWei,
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
          : /insufficient funds/i.test(message)
            ? "Insufficient Sepolia ETH for this swap. Lower the amount or get test ETH from a faucet."
            : message,
      );
    }
  }

  const swapDisabled =
    !walletReady || busy || status === "done" || !!amountError;

  return (
    <div className="mt-4">
      <label className="block text-xs font-bold text-ink/60">
        Amount (ETH on Sepolia)
        <div className="mt-1 flex items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={amountEth}
            onChange={(e) => onAmountChange(e.target.value)}
            disabled={busy || status === "done"}
            placeholder={SWAP_DEFAULT_ETH}
            className="w-full rounded border-2 border-ink bg-white px-3 py-2 font-mono text-sm text-ink outline-none focus:ring-2 focus:ring-signal/40 disabled:opacity-50"
          />
          <span className="shrink-0 font-mono text-xs text-ink/40">WETH</span>
        </div>
      </label>
      <p className="mt-1 font-mono text-[10px] text-ink/40">
        {SWAP_MIN_ETH}–{SWAP_MAX_ETH} ETH
      </p>
      {amountError && (
        <p className="mt-1 text-xs text-signal">{amountError}</p>
      )}
      {walletReady && !amountError && (
        <p className="mt-2 text-xs text-ink/60">
          {quoteLoading
            ? "Estimating output…"
            : quoteOut
              ? `≈ ${Number(quoteOut.outAmount).toFixed(4)} ${quoteOut.outSymbol}${
                  quoteOut.isDemoProxy ? " (demo pair)" : ""
                }`
              : "Enter an amount for a quote"}
        </p>
      )}

      <button
        type="button"
        onClick={swap}
        disabled={swapDisabled}
        className="mt-3 inline-flex w-full items-center justify-center rounded border-2 border-ink bg-signal px-4 py-2.5 font-display text-sm font-bold text-white transition hover:translate-x-0.5 hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy && (
          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        )}
        {buttonLabel()}
      </button>

      <p className="mt-2 font-mono text-[10px] text-ink/40">
        Real swap on {SWAP_CHAIN_NAME} via the Uniswap Trading API.
      </p>

      {status === "done" && result && (
        <div className="mt-2 rounded border-2 border-accent-green/40 bg-accent-green/5 px-3 py-2 text-xs text-ink/70">
          Bought {Number(result.outAmount).toFixed(4)} {result.outSymbol}
          {result.isDemoProxy && (
            <span className="text-ink/50">
              {" "}
              (testnet demo pair — only WETH→UNI has Sepolia liquidity)
            </span>
          )}
          .{" "}
          <a
            href={result.explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="font-bold underline hover:text-ink"
          >
            View tx ↗
          </a>
        </div>
      )}

      {status === "failed" && error && (
        <div
          role="alert"
          className="mt-2 rounded border-2 border-signal/40 bg-signal/5 px-3 py-2 text-xs text-signal"
        >
          {error}
        </div>
      )}
    </div>
  );
}
