"use client";

// ENS receipt layer (ENS prize — account/receipt after Flow payment).
// Resolves com.chatter.* text records live from Ethereum mainnet PublicResolver;
// no hard-coded brief content — everything shown comes from on-chain reads.

import { useEffect, useState } from "react";
import { BASE_SEPOLIA_EXPLORER_TX } from "@/lib/flow";
import { readEnsRecords, type EnsRecords } from "@/lib/ens";

export interface EnsReceiptProps {
  subname: string;
  ensAppUrl?: string;
  compact?: boolean;
  refreshKey?: number;
}

function parseBrief(raw?: string): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { raw };
  }
}

export default function EnsReceipt({
  subname,
  ensAppUrl,
  compact = false,
  refreshKey = 0,
}: EnsReceiptProps) {
  const [records, setRecords] = useState<EnsRecords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void readEnsRecords(subname)
      .then((data) => {
        if (!cancelled) setRecords(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "ENS resolution failed");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [subname, refreshKey]);

  const brief = parseBrief(records?.["com.chatter.brief"]);
  const appUrl = ensAppUrl ?? `https://app.ens.domains/${subname}`;

  if (compact) {
    return (
      <div className="rounded border-2 border-accent-green bg-accent-green/5 px-4 py-3 text-left">
        <p className="font-display text-sm font-bold text-accent-green">{subname}</p>
        <a
          href={appUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-xs text-accent-green/80 underline hover:text-accent-green"
        >
          View in ENS app
        </a>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-md rounded border-[3px] border-ink bg-white p-8 text-center hard-shadow">
      <span className="inline-flex items-center rounded border-2 border-accent-green/40 bg-accent-green/5 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-accent-green">
        ENS &middot; Ethereum mainnet
      </span>
      <h2 className="mt-5 font-display text-2xl font-black tracking-tight text-ink">
        You now own {subname}
      </h2>
      <p className="mt-2 text-sm text-ink/60">
        Your research reports are saved to your name — portable, permanent, yours.
      </p>

      {loading && (
        <p className="mt-6 text-sm text-ink/50">Resolving records&hellip;</p>
      )}

      {error && (
        <div
          role="alert"
          className="mt-6 rounded border-2 border-signal/40 bg-signal/5 px-4 py-3 text-sm text-signal"
        >
          {error}
        </div>
      )}

      {records && !loading && (
        <div className="mt-6 space-y-3 rounded border-2 border-ink/10 bg-paper p-4 text-left text-sm">
          {records.description && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-ink/40">
                description
              </p>
              <p className="mt-1 text-ink/80">{records.description}</p>
            </div>
          )}
          {records["com.chatter.paymentTx"] && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-ink/40">
                com.chatter.paymentTx
              </p>
              <a
                href={`${BASE_SEPOLIA_EXPLORER_TX}${records["com.chatter.paymentTx"]}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block break-all font-mono text-xs text-signal underline hover:text-ink"
              >
                {records["com.chatter.paymentTx"]}
              </a>
            </div>
          )}
          {brief && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-ink/40">
                com.chatter.brief
              </p>
              <pre className="mt-1 max-h-40 overflow-auto rounded bg-ink/5 p-2 font-mono text-xs text-ink/70">
                {JSON.stringify(brief, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      <a
        href={appUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-flex items-center justify-center rounded border-2 border-ink px-5 py-2.5 font-display text-sm font-bold text-ink transition hover:bg-ink hover:text-white"
      >
        View in ENS app
      </a>
    </section>
  );
}
