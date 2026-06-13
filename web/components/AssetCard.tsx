export interface AssetCardProps {
  ticker: string;
  name: string;
  kind: "crypto" | "equity";
  confidence: number;
  onChainMomentum: number;
  priceDeltaPercent: number;
  agreementLabel: string;
}

function barColor(value: number) {
  if (value >= 70) return "bg-emerald-500";
  if (value >= 40) return "bg-amber-500";
  return "bg-zinc-500";
}

function agreementTone(label: string) {
  if (label === "Confirmed trend") return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
  if (label === "Narrative only") return "text-amber-400 bg-amber-500/10 border-amber-500/30";
  if (label === "Quiet accumulation") return "text-sky-400 bg-sky-500/10 border-sky-500/30";
  return "text-zinc-400 bg-zinc-800/60 border-zinc-700";
}

export default function AssetCard({
  ticker,
  name,
  kind,
  confidence,
  onChainMomentum,
  priceDeltaPercent,
  agreementLabel,
}: AssetCardProps) {
  const socialScore = Math.round(confidence * 100);
  const deltaSign = priceDeltaPercent >= 0 ? "+" : "";

  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-lg shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold tracking-tight text-white">
              {ticker}
            </span>
            {kind === "equity" && (
              <span className="rounded-full border border-violet-500/40 bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-300">
                Tokenized equity
              </span>
            )}
            {kind === "crypto" && (
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                Crypto
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-zinc-400">{name}</p>
        </div>
        <span
          className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${agreementTone(agreementLabel)}`}
        >
          {agreementLabel}
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-500">
            <span>Social mindshare</span>
            <span className="font-medium text-zinc-300">{socialScore}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full transition-all ${barColor(socialScore)}`}
              style={{ width: `${socialScore}%` }}
            />
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-500">
            <span>On-chain momentum</span>
            <span className="font-medium text-zinc-300">
              {onChainMomentum}{" "}
              <span className={priceDeltaPercent >= 0 ? "text-emerald-400" : "text-rose-400"}>
                ({deltaSign}{priceDeltaPercent.toFixed(1)}%)
              </span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full transition-all ${barColor(onChainMomentum)}`}
              style={{ width: `${onChainMomentum}%` }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
