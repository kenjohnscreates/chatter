import type { ResearchResult, SummarizeResponse } from "@/lib/api";

export interface TopicCardProps {
  result: ResearchResult;
  summary?: SummarizeResponse;
  status: "queued" | "researching" | "summarizing" | "done" | "error";
  error?: string;
}

const STATUS_LABEL: Record<TopicCardProps["status"], string> = {
  queued: "Queued",
  researching: "Researching",
  summarizing: "Summarizing",
  done: "Done",
  error: "Error",
};

function sentimentTone(sentiment: string) {
  const s = sentiment.toLowerCase();
  if (s.includes("bull")) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
  if (s.includes("bear")) return "text-rose-400 bg-rose-500/10 border-rose-500/30";
  if (s.includes("mixed")) return "text-amber-400 bg-amber-500/10 border-amber-500/30";
  return "text-zinc-400 bg-zinc-800/60 border-zinc-700";
}

export default function TopicCard({
  result,
  summary,
  status,
  error,
}: TopicCardProps) {
  const loading = status !== "done" && status !== "error";
  const momentum = summary?.momentum_score ?? 0;

  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-lg shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-white">
            {result.keyword}
          </h3>
          {!result.ok && status === "done" && (
            <p className="mt-1 text-sm text-rose-400">
              {result.stderr || "Research failed"}
            </p>
          )}
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-300 ${loading ? "animate-pulse" : ""}`}
        >
          {loading && (
            <span className="inline-block h-2 w-2 rounded-full bg-indigo-400" />
          )}
          {STATUS_LABEL[status]}
        </span>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}

      {summary && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${sentimentTone(summary.sentiment)}`}
            >
              {summary.sentiment}
            </span>
            <span className="text-xs text-zinc-500">
              Momentum {momentum}/100
            </span>
          </div>

          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
              <span>Mindshare strength</span>
              <span className="font-medium text-zinc-300">{momentum}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${momentum}%` }}
              />
            </div>
          </div>

          {summary.themes.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {summary.themes.slice(0, 4).map((theme) => (
                <span
                  key={theme}
                  className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-300"
                >
                  {theme}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {loading && !summary && (
        <div className="mt-4 space-y-2">
          <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-800" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-800" />
          <div className="h-2 w-full animate-pulse rounded bg-zinc-800" />
        </div>
      )}
    </article>
  );
}
