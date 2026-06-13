"use client";

import { useMemo, useState } from "react";
import AssetCard from "@/components/AssetCard";
import TopicCard from "@/components/TopicCard";
import {
  postResearch,
  postSummarize,
  type Asset,
  type ResearchResult,
  type SummarizeResponse,
} from "@/lib/api";
import { mockOnChainForAsset } from "@/lib/mockOnChain";

const DEMO_KEYWORDS = [
  "restaking",
  "Nvidia AI chips",
  "solana",
  "tokenized equities",
  "Base blockchain",
];

type RowStatus = "queued" | "researching" | "summarizing" | "done" | "error";

interface TopicRow {
  result: ResearchResult;
  summary?: SummarizeResponse;
  status: RowStatus;
  error?: string;
}

function parseKeywords(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((k) => k.trim())
    .filter(Boolean);
}

export default function ResearchPage() {
  const [input, setInput] = useState("");
  const [rows, setRows] = useState<TopicRow[]>([]);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [globalError, setGlobalError] = useState<string | null>(null);

  const keywords = useMemo(() => parseKeywords(input), [input]);
  const count = keywords.length;
  const validCount = count >= 5 && count <= 20;

  const allAssets = useMemo(() => {
    const seen = new Set<string>();
    const assets: (Asset & { keyword: string })[] = [];
    for (const row of rows) {
      if (!row.summary) continue;
      for (const asset of row.summary.assets) {
        const key = asset.ticker.toUpperCase();
        if (seen.has(key)) continue;
        seen.add(key);
        assets.push({ ...asset, keyword: row.result.keyword });
      }
    }
    return assets;
  }, [rows]);

  async function runResearch() {
    if (!validCount) return;

    setGlobalError(null);
    setPhase("running");

    const placeholders: TopicRow[] = keywords.map((keyword) => ({
      result: {
        keyword,
        ok: false,
        markdown: "",
        stderr: "",
        exit_code: 0,
      },
      status: "queued",
    }));
    setRows(placeholders);

    try {
      setRows((prev) =>
        prev.map((row) => ({ ...row, status: "researching" as const })),
      );

      const { results } = await postResearch(keywords, true);

      const nextRows: TopicRow[] = results.map((result) => ({
        result,
        status: result.ok ? ("summarizing" as const) : ("error" as const),
        error: result.ok ? undefined : result.stderr || "Research failed",
      }));
      setRows(nextRows);

      const summarized = await Promise.all(
        nextRows.map(async (row) => {
          if (!row.result.ok || !row.result.markdown) return row;
          try {
            const summary = await postSummarize(
              row.result.keyword,
              row.result.markdown,
              true,
            );
            return { ...row, summary, status: "done" as const };
          } catch (err) {
            return {
              ...row,
              status: "error" as const,
              error: err instanceof Error ? err.message : "Summarize failed",
            };
          }
        }),
      );

      setRows(summarized);
      setPhase("done");
    } catch (err) {
      setGlobalError(
        err instanceof Error ? err.message : "Research request failed",
      );
      setPhase("idle");
      setRows([]);
    }
  }

  function loadDemo() {
    setInput(DEMO_KEYWORDS.join("\n"));
    setRows([]);
    setPhase("idle");
    setGlobalError(null);
  }

  return (
    <div className="min-h-full bg-zinc-950 text-zinc-100">
      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                Enter your keywords
              </h1>
              <p className="mt-1 text-sm text-zinc-400">
                5–20 topics — mix crypto and companies (e.g. restaking, Nvidia
                AI chips)
              </p>
            </div>
            <button
              type="button"
              onClick={loadDemo}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              Try demo keywords
            </button>
          </div>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={6}
            placeholder={"restaking\nNvidia AI chips\nsolana"}
            className="mt-4 w-full resize-y rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span
              className={`text-sm ${validCount ? "text-zinc-400" : "text-amber-400"}`}
            >
              {count}/20 keywords
              {count > 0 && count < 5 && " — need at least 5"}
              {count > 20 && " — max 20"}
            </span>
            <button
              type="button"
              disabled={!validCount || phase === "running"}
              onClick={runResearch}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {phase === "running" ? "Running research…" : "Run research"}
            </button>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            ~1 min per topic; demo topics are instant (cached).
          </p>
        </section>

        {globalError && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
          >
            <strong className="font-medium">Error:</strong> {globalError}
            <button
              type="button"
              onClick={runResearch}
              disabled={!validCount}
              className="ml-3 underline hover:text-white disabled:opacity-40"
            >
              Retry
            </button>
          </div>
        )}

        {phase === "running" && rows.length === 0 && (
          <div className="mt-8 flex items-center gap-3 text-sm text-zinc-400">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-indigo-400" />
            Starting research…
          </div>
        )}

        {rows.length > 0 && (
          <>
            <section className="mt-10">
              <h2 className="mb-4 text-lg font-semibold text-white">
                What&apos;s trending
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {rows.map((row) => (
                  <TopicCard
                    key={row.result.keyword}
                    result={row.result}
                    summary={row.summary}
                    status={row.status}
                    error={row.error}
                  />
                ))}
              </div>
            </section>

            {allAssets.length > 0 && (
              <section className="mt-10">
                <h2 className="mb-4 text-lg font-semibold text-white">
                  What&apos;s tradable
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {allAssets.map((asset) => {
                    const mock = mockOnChainForAsset(
                      asset.ticker,
                      asset.confidence,
                    );
                    return (
                      <AssetCard
                        key={asset.ticker}
                        ticker={asset.ticker}
                        name={asset.name}
                        kind={asset.kind}
                        confidence={asset.confidence}
                        onChainMomentum={mock.onChainMomentum}
                        priceDeltaPercent={mock.priceDeltaPercent}
                        agreementLabel={mock.agreementLabel}
                      />
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
