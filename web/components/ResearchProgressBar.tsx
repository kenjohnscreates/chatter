"use client";

export interface ResearchProgressBarProps {
  progressPercent: number;
  label?: string;
}

export default function ResearchProgressBar({
  progressPercent,
  label = "Scanning…",
}: ResearchProgressBarProps) {
  const progress = Math.max(2, Math.min(100, progressPercent));

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 px-2 sm:px-4">
      <div className="h-2.5 overflow-hidden rounded-full border-2 border-signal bg-white">
        <div
          className="striped-bar h-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="truncate text-center font-mono text-[10px] uppercase tracking-wider text-signal">
        {label}
      </span>
    </div>
  );
}
