"use client";

export type ScanStep = "pending" | "active" | "done";

export interface ScanPanelProps {
  steps: { label: string; status: ScanStep }[];
  estimateSeconds?: number;
  progressPercent?: number;
  header?: string;
}

function DotIcon({ status }: { status: ScanStep }) {
  if (status === "done")
    return <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-signal bg-signal" />;
  if (status === "active")
    return <span className="inline-block h-3.5 w-3.5 animate-pulse rounded-full border-2 border-signal bg-signal/50" />;
  return <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-ink/30" />;
}

export default function ScanPanel({
  steps,
  estimateSeconds,
  progressPercent,
  header = "Scanning...",
}: ScanPanelProps) {
  const doneCount = steps.filter((s) => s.status === "done").length;
  const stepProgress = steps.length > 0 ? (doneCount / steps.length) * 100 : 0;
  const progress = progressPercent ?? stepProgress;

  return (
    <div className="dotted-bg-light relative rounded border-[3px] border-ink bg-signal p-8 sm:p-14 hard-shadow">
      <div className="mx-auto max-w-lg rounded-xl border-[3px] border-ink bg-[#d9d6cf] px-8 py-8 shadow-[8px_8px_0_rgba(0,0,0,0.85)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-ink/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-signal text-lg">&#10022;</span>
            <h2 className="font-display text-2xl font-black tracking-tight">{header}</h2>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/50">* executing *</span>
        </div>

        {/* Steps */}
        <ul className="mt-6 space-y-4">
          {steps.map((step) => (
            <li key={step.label} className="flex items-center gap-3">
              <DotIcon status={step.status} />
              <span className={`font-mono text-sm uppercase tracking-wide ${step.status === "pending" ? "text-ink/40" : "text-ink"}`}>
                {step.label}
              </span>
            </li>
          ))}
        </ul>

        {/* Progress bar */}
        <div className="mt-8 h-5 overflow-hidden rounded-full border-[3px] border-ink bg-white">
          <div
            className="striped-bar h-full transition-all duration-500"
            style={{ width: `${Math.max(progress, 5)}%` }}
          />
        </div>

        {/* Decorative ticker + estimate */}
        <div className="mt-4 flex items-center justify-between">
          <span className="font-mono text-xs tracking-[0.3em] text-ink/30">
            &middot; &ldquo; &middot;&middot; &ldquo; &middot; : &middot; &bull; &middot;&middot; &bull; &middot;
          </span>
          {estimateSeconds !== undefined && (
            <span className="font-mono text-xs uppercase tracking-wider text-signal">
              Est. time: {estimateSeconds} seconds
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
