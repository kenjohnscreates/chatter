import type { ResearchResult, SummarizeResponse } from "@/lib/api";

export type CardAccent = "white" | "orange" | "green" | "yellow";

export interface TopicCardProps {
  result: ResearchResult;
  summary?: SummarizeResponse;
  status: "queued" | "researching" | "summarizing" | "done" | "error";
  error?: string;
  accent?: CardAccent;
  onReceiptClick?: () => void;
}

const STATUS_LABEL: Record<TopicCardProps["status"], string> = {
  queued: "Queued",
  researching: "Researching",
  summarizing: "Summarizing",
  done: "Done",
  error: "Error",
};

const ACCENT_BG: Record<CardAccent, string> = {
  white: "bg-white",
  orange: "bg-accent-orange",
  green: "bg-accent-green",
  yellow: "bg-accent-yellow",
};

export default function TopicCard({
  result,
  summary,
  status,
  error,
  accent = "white",
  onReceiptClick,
}: TopicCardProps) {
  const loading = status !== "done" && status !== "error";
  const momentum = summary?.momentum_score ?? 0;

  return (
    <article className={`rounded border-[3px] border-ink p-5 hard-shadow-sm ${ACCENT_BG[accent]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-black tracking-tight text-ink">
            {result.keyword}
          </h3>
          {!result.ok && status === "done" && (
            <p className="mt-1 text-sm font-bold text-ink">
              {result.stderr || "Research failed"}
            </p>
          )}
        </div>
        <span
          className={`rounded border-2 border-ink bg-paper px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-ink ${loading ? "animate-pulse" : ""}`}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>

      {error && (
        <p className="mt-3 rounded border-2 border-ink bg-white px-3 py-2 text-sm font-bold text-signal">
          {error}
        </p>
      )}

      {summary && (
        <>
          {/* Big mindshare number */}
          <div className="mt-4 flex items-end justify-between">
            <p className="font-display text-6xl font-black leading-none text-ink">
              {momentum}
            </p>
            <span className="rounded border-2 border-ink bg-paper px-2.5 py-0.5 text-xs font-black uppercase text-ink">
              {summary.sentiment}
            </span>
          </div>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink/60">
            Mindshare strength / 100
          </p>

          <div className="mt-3 h-3 overflow-hidden rounded-full border-2 border-ink bg-paper">
            <div
              className="h-full bg-ink transition-all"
              style={{ width: `${momentum}%` }}
            />
          </div>

          {summary.themes.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {summary.themes.slice(0, 4).map((theme) => (
                <span
                  key={theme}
                  className="rounded border-2 border-ink bg-paper px-2 py-0.5 text-xs font-bold text-ink"
                >
                  {theme}
                </span>
              ))}
            </div>
          )}

          {onReceiptClick && (
            <button
              type="button"
              onClick={onReceiptClick}
              className="mt-4 font-mono text-[10px] font-bold uppercase tracking-wider text-ink/50 underline hover:text-ink"
            >
              Research receipt
            </button>
          )}
        </>
      )}

      {loading && !summary && (
        <div className="mt-4 space-y-2">
          <div className="h-3 w-2/3 animate-pulse rounded bg-ink/15" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-ink/15" />
          <div className="h-2 w-full animate-pulse rounded bg-ink/15" />
        </div>
      )}
    </article>
  );
}
