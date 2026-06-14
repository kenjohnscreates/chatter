"use client";

// Dynamic Flow paywall (Dynamic prize — Flow / "pay with anything" track).
// S2 of USER_FLOW: unlock a research run for $1 in USDC on Base Sepolia.
// Signs with the user's Dynamic embedded wallet via the dct_ session token only;
// the dyn_ server token stays server-side (api/main.py POST /checkout).
// Interface is intentionally small + stable so a plain-USDC-transfer fallback
// (PRD T7 fallback) can swap in without touching downstream screens.

import { useState } from "react";
import { useDynamicContext, useSwitchNetwork } from "@dynamic-labs/sdk-react-core";
import { isEthereumWallet } from "@dynamic-labs/ethereum";
import {
  BASE_SEPOLIA_CHAIN_ID,
  PRICE_USD,
  createCheckout,
  runCheckout,
  type FlowResult,
  type FlowStatus,
  type PaymentPublicClient,
  type PaymentWalletClient,
} from "@/lib/flow";

export interface PaywallProps {
  // Fires once the $1 payment settles on-chain. T9 hooks the ENS subname mint here.
  onPaymentSuccess?: (result: FlowResult) => void;
}

const STATUS_LABEL: Record<FlowStatus, string> = {
  idle: `Pay $1 to unlock`,
  creating: "Preparing checkout…",
  quoting: "Getting quote…",
  awaiting_signature: "Confirm in your wallet…",
  broadcasting: "Broadcasting…",
  settling: "Settling payment…",
  settled: "Paid ✓",
  failed: "Retry payment",
};

function isBusy(status: FlowStatus): boolean {
  return (
    status === "creating" ||
    status === "quoting" ||
    status === "awaiting_signature" ||
    status === "broadcasting" ||
    status === "settling"
  );
}

export default function Paywall({ onPaymentSuccess }: PaywallProps) {
  const { primaryWallet } = useDynamicContext();
  const switchNetwork = useSwitchNetwork();
  const [status, setStatus] = useState<FlowStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const walletReady = !!primaryWallet && isEthereumWallet(primaryWallet);
  const busy = isBusy(status);

  async function pay() {
    if (!primaryWallet || !isEthereumWallet(primaryWallet)) return;

    setError(null);
    setStatus("creating");
    try {
      try {
        await switchNetwork({ wallet: primaryWallet, network: BASE_SEPOLIA_CHAIN_ID });
      } catch {
        // Wallet may already be on Base Sepolia, or switching is unsupported — continue.
      }

      const walletClient = (await primaryWallet.getWalletClient()) as PaymentWalletClient;
      const publicClient = (await primaryWallet.getPublicClient()) as PaymentPublicClient;
      const checkoutId = await createCheckout();

      const result = await runCheckout({
        walletClient,
        publicClient,
        address: primaryWallet.address,
        checkoutId,
        onStatus: setStatus,
      });

      setStatus("settled");
      onPaymentSuccess?.(result);
    } catch (err) {
      setStatus("failed");
      const message = err instanceof Error ? err.message : "Payment failed";
      setError(
        /reject|denied|user/i.test(message)
          ? "Payment cancelled in wallet."
          : message,
      );
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="win-chrome hard-shadow bg-paper">
        <div className="win-chrome-bar bg-signal">
          <span className="win-chrome-dot win-chrome-dot--red" />
          <span className="win-chrome-dot win-chrome-dot--yellow" />
          <span className="win-chrome-dot win-chrome-dot--green" />
        </div>
        <div className="px-8 py-10 text-center">
          <span className="inline-flex items-center rounded border-2 border-ink/20 bg-ink/5 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-ink/60">
            Dynamic Flow &middot; Base Sepolia
          </span>
          <h2 className="mt-5 font-display text-2xl font-black tracking-tight">
            Pay ${PRICE_USD.replace(".00", "")} To See Today&apos;s Trends
          </h2>
          <p className="mt-3 text-sm text-ink/60">
            Pay in USDC from your wallet. Flow auto-converts from any supported
            token — pay with whatever you hold.
          </p>

          <button
            type="button"
            onClick={pay}
            disabled={!walletReady || busy}
            className="mt-8 inline-flex w-full items-center justify-center rounded border-[3px] border-ink bg-signal px-5 py-3.5 font-display text-base font-bold text-white transition hover:translate-x-0.5 hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy && (
              <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {!walletReady ? "Setting up your wallet…" : STATUS_LABEL[status]}
          </button>

          <p className="mt-4 font-mono text-[10px] text-ink/40">
            Settles to the Chatter treasury &middot; testnet USDC, no real funds.
          </p>

          {status === "failed" && error && (
            <div
              role="alert"
              className="mt-5 rounded border-2 border-signal/40 bg-signal/5 px-4 py-3 text-left text-sm text-signal"
            >
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
