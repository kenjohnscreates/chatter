"use client";

import EnsReceipt from "@/components/EnsReceipt";
import { BASE_SEPOLIA_EXPLORER_TX } from "@/lib/flow";
import type { EnsMintResult } from "@/lib/ens";

export interface PaymentReceiptProps {
  txHash: string;
  ensMint?: EnsMintResult | null;
  onContinue: () => void;
}

export default function PaymentReceipt({
  txHash,
  ensMint,
  onContinue,
}: PaymentReceiptProps) {
  const explorerUrl = `${BASE_SEPOLIA_EXPLORER_TX}${txHash}`;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <section className="win-chrome hard-shadow bg-paper">
        <div className="win-chrome-bar bg-signal">
          <span className="win-chrome-dot win-chrome-dot--red" />
          <span className="win-chrome-dot win-chrome-dot--yellow" />
          <span className="win-chrome-dot win-chrome-dot--green" />
        </div>
        <div className="px-8 py-10 text-center">
          <span className="inline-flex items-center rounded border-2 border-accent-green/40 bg-accent-green/5 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-accent-green">
            Dynamic Flow &middot; Base Sepolia
          </span>
          <h2 className="mt-5 font-display text-2xl font-black tracking-tight">
            Paid — research unlocked
          </h2>
          <p className="mt-2 text-sm text-ink/60">
            Your $1 payment settled on-chain.
          </p>
          <a
            href={explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-block break-all font-mono text-xs text-signal underline hover:text-ink"
          >
            View transaction
          </a>
          <button
            type="button"
            onClick={onContinue}
            className="mt-8 inline-flex w-full items-center justify-center rounded border-[3px] border-ink bg-signal px-5 py-3.5 font-display text-base font-bold text-white transition hover:translate-x-0.5 hover:translate-y-0.5"
          >
            Enter your keywords
          </button>
        </div>
      </section>

      {ensMint && (
        <EnsReceipt
          subname={ensMint.subname}
          ensAppUrl={ensMint.ensAppUrl}
          compact
        />
      )}
    </div>
  );
}
