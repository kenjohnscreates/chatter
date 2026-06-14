"use client";

import SwapButton from "@/components/SwapButton";

export interface AssetDetailProps {
  ticker: string;
  name: string;
  kind: "crypto" | "equity";
  socialScore: number;
  onChainMomentum: number;
  priceDeltaPercent: number;
  agreementLabel: string;
  themes?: string[];
  sentiment?: string;
  swapEnabled: boolean;
  priceUsd?: number | null;
  onClose: () => void;
}

function MomentumSparkline({ momentum, delta }: { momentum: number; delta: number }) {
  const points: string[] = [];
  const base = Math.max(10, momentum - 30);
  for (let i = 0; i <= 6; i++) {
    const y = 80 - (base + (momentum - base) * (i / 6) + Math.sin(i * 1.2) * 8);
    points.push(`${i * 50},${y}`);
  }
  return (
    <svg viewBox="0 0 300 100" className="h-32 w-full" preserveAspectRatio="none">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="var(--signal)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text x="270" y={Number(points[6].split(",")[1]) - 8} fill="var(--accent-green)" fontSize="11" fontFamily="monospace">
        {delta >= 0 ? "+" : ""}{delta.toFixed(0)}%
      </text>
    </svg>
  );
}

export default function AssetDetail({
  ticker,
  name,
  kind,
  socialScore,
  onChainMomentum,
  priceDeltaPercent,
  agreementLabel,
  themes,
  sentiment,
  swapEnabled,
  priceUsd,
  onClose,
}: AssetDetailProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-4xl rounded border-[3px] border-ink bg-paper hard-shadow overflow-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded border-2 border-ink bg-white font-bold text-ink hover:bg-ink hover:text-white transition"
        >
          &times;
        </button>

        <div className="grid md:grid-cols-[2fr_1fr] gap-0">
          {/* Left: main content */}
          <div className="border-r-0 md:border-r-[3px] border-ink p-8">
            {/* Ticker + score */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-ink/60">&#9670;</span>
                  <h2 className="font-display text-3xl font-black tracking-tight">{name}</h2>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-sm text-ink/50">{ticker}</span>
                  {kind === "equity" && (
                    <span className="rounded border-2 border-purple-600/40 bg-purple-50 px-2 py-0.5 text-[10px] font-bold uppercase text-purple-700">
                      Tokenized equity
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-[10px] uppercase tracking-wider text-ink/40">Social Score</p>
                <p className="font-display text-4xl font-black text-ink">{socialScore.toFixed(1)}</p>
              </div>
            </div>

            {/* Sparkline */}
            <div className="mt-6">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/40">Momentum (7d)</p>
              <MomentumSparkline momentum={onChainMomentum} delta={priceDeltaPercent} />
              <div className="mt-1 flex justify-between font-mono text-[9px] uppercase text-ink/30">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>
            </div>

            {/* Braille row + real swap entry */}
            <div className="mt-6 border-t-2 border-ink/10 pt-5">
              <span className="font-mono text-xs tracking-[0.3em] text-ink/20">
                . &ldquo; .&ldquo; &ldquo; . &ldquo;
              </span>
              <SwapButton
                ticker={ticker}
                kind={kind}
                swappable={swapEnabled}
                priceUsd={priceUsd}
              />
            </div>
          </div>

          {/* Right: sidebar */}
          <div className="flex flex-col gap-0">
            {/* Historical scores (illustrative) */}
            <div className="border-b-[3px] border-ink p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/40">Historical Scores</p>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-bold">Today</span>
                  <span className="font-mono font-bold">{socialScore.toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-sm text-ink/60">
                  <span>Yesterday</span>
                  <span className="font-mono">{(socialScore - 2.8).toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-sm text-ink/60">
                  <span>7d Ago</span>
                  <span className="font-mono">{(socialScore - 10.6).toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-sm text-ink/60">
                  <span>30d Ago</span>
                  <span className="font-mono">{(socialScore - 16.1).toFixed(1)}</span>
                </div>
              </div>
            </div>

            {/* Correlated themes */}
            {themes && themes.length > 0 && (
              <div className="border-b-[3px] border-ink p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/40">Correlated Themes</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {themes.slice(0, 5).map((t) => (
                    <span key={t} className="rounded border-2 border-ink px-3 py-1 text-xs font-bold uppercase">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sentiment */}
            {sentiment && (
              <div className="bg-ink p-6 text-white flex-1 flex flex-col justify-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">Sentiment Analysis</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-white/80">&#10022;</span>
                  <span className="font-display text-xl font-black capitalize">{sentiment}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
