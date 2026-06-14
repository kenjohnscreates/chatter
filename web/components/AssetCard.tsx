import SwapButton from "@/components/SwapButton";

export interface AssetCardProps {
  ticker: string;
  name: string;
  kind: "crypto" | "equity";
  confidence: number;
  onChainMomentum: number;
  priceDeltaPercent: number;
  agreementLabel: string;
  swapEnabled?: boolean;
  priceUsd?: number | null;
  onClick?: () => void;
}

function barColor(value: number) {
  if (value >= 70) return "bg-accent-green";
  if (value >= 40) return "bg-accent-orange";
  return "bg-ink/30";
}

function agreementTone(label: string) {
  if (label === "Confirmed trend") return "bg-accent-green text-ink";
  if (label === "Narrative only") return "bg-accent-orange text-ink";
  if (label === "Quiet accumulation") return "bg-sky-400 text-ink";
  return "bg-paper text-ink";
}

export default function AssetCard({
  ticker,
  name,
  kind,
  confidence,
  onChainMomentum,
  priceDeltaPercent,
  agreementLabel,
  swapEnabled = false,
  priceUsd,
  onClick,
}: AssetCardProps) {
  const socialScore = Math.round(confidence * 100);
  const deltaSign = priceDeltaPercent >= 0 ? "+" : "";

  return (
    <article
      className={`rounded border-[3px] border-ink bg-white p-5 hard-shadow-sm transition ${onClick ? "cursor-pointer hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display text-xl font-black tracking-tight text-ink">
              {ticker}
            </span>
            {kind === "equity" && (
              <span className="rounded border-2 border-ink bg-pink px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-ink">
                Tokenized equity
              </span>
            )}
            {kind === "crypto" && (
              <span className="rounded border-2 border-ink bg-sky-300 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-ink">
                Crypto
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm font-medium text-ink/60">{name}</p>
        </div>
        <span
          className={`rounded border-2 border-ink px-2.5 py-1 text-[10px] font-black uppercase ${agreementTone(agreementLabel)}`}
        >
          {agreementLabel}
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-ink/50">
            <span>Social</span>
            <span className="font-black text-ink">{socialScore}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full border-2 border-ink bg-paper">
            <div
              className={`h-full transition-all ${barColor(socialScore)}`}
              style={{ width: `${socialScore}%` }}
            />
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-ink/50">
            <span>On-chain</span>
            <span className="font-black text-ink">
              {onChainMomentum}{" "}
              <span className={priceDeltaPercent >= 0 ? "text-accent-green" : "text-signal"}>
                ({deltaSign}{priceDeltaPercent.toFixed(1)}%)
              </span>
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full border-2 border-ink bg-paper">
            <div
              className={`h-full transition-all ${barColor(onChainMomentum)}`}
              style={{ width: `${onChainMomentum}%` }}
            />
          </div>
        </div>
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        className={onClick ? "cursor-default" : undefined}
      >
        <SwapButton
          ticker={ticker}
          kind={kind}
          swappable={swapEnabled}
          priceUsd={priceUsd}
        />
      </div>
    </article>
  );
}
