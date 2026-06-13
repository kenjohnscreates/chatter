"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import AssetCard from "@/components/AssetCard";
import AssetDetail from "@/components/AssetDetail";
import EnsReceipt from "@/components/EnsReceipt";
import FlowStepper, { type FlowStage } from "@/components/FlowStepper";
import Paywall from "@/components/Paywall";
import ScanPanel, { type ScanStep } from "@/components/ScanPanel";
import TopicCard, { type CardAccent } from "@/components/TopicCard";

const CARD_ACCENTS: CardAccent[] = ["yellow", "orange", "green", "white"];
import {
  agreementLabel,
  getAssets,
  postResearch,
  postSummarize,
  type Asset,
  type OnChainAsset,
  type ResearchResult,
  type SummarizeResponse,
} from "@/lib/api";
import {
  ensStorageKey,
  mintEnsSubname,
  publishEnsBrief,
  type EnsMintResult,
} from "@/lib/ens";
import type { FlowResult } from "@/lib/flow";

function paidStorageKey(address?: string): string {
  return `chatter:paid:${(address ?? "anon").toLowerCase()}`;
}

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

function rowsToScanSteps(rows: TopicRow[]): { label: string; status: ScanStep }[] {
  const hasQueued = rows.some((r) => r.status === "queued");
  const hasResearching = rows.some((r) => r.status === "researching");
  const hasSummarizing = rows.some((r) => r.status === "summarizing");
  const allDone = rows.every((r) => r.status === "done" || r.status === "error");

  return [
    { label: "Parsing matrix inputs", status: hasResearching || hasSummarizing || allDone ? "done" : hasQueued ? "active" : "pending" },
    { label: "Establishing on-chain connections", status: hasSummarizing || allDone ? "done" : hasResearching ? "active" : "pending" },
    { label: "Indexing social layers", status: allDone ? "done" : hasSummarizing ? "active" : "pending" },
    { label: "Calculating mindshare variance", status: allDone ? "done" : "pending" },
  ];
}

export default function ResearchPage() {
  const { primaryWallet } = useDynamicContext();
  const [input, setInput] = useState("");
  const [rows, setRows] = useState<TopicRow[]>([]);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [ensMint, setEnsMint] = useState<EnsMintResult | null>(null);
  const [ensMinting, setEnsMinting] = useState(false);
  const [ensError, setEnsError] = useState<string | null>(null);
  const [onChainByTicker, setOnChainByTicker] = useState<
    Record<string, OnChainAsset>
  >({});
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  const address = primaryWallet?.address;
  const remintAttempted = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPaid(window.localStorage.getItem(paidStorageKey(address)) === "1");
    const stored = window.localStorage.getItem(ensStorageKey(address));
    if (stored) {
      try {
        setEnsMint(JSON.parse(stored) as EnsMintResult);
      } catch {
        // ignore corrupt cache
      }
    }
  }, [address]);

  useEffect(() => {
    if (!paid || !address || ensMint || remintAttempted.current) return;
    remintAttempted.current = true;
    let cancelled = false;
    setEnsMinting(true);
    void mintEnsSubname(address)
      .then((minted) => {
        if (cancelled) return;
        setEnsMint(minted);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(ensStorageKey(address), JSON.stringify(minted));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setEnsError(err instanceof Error ? err.message : "ENS mint failed");
        }
      })
      .finally(() => {
        if (!cancelled) setEnsMinting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [paid, address, ensMint]);

  async function handlePaymentSuccess(result: FlowResult) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(paidStorageKey(address), "1");
    }
    setPaid(true);
    if (!address) return;

    setEnsMinting(true);
    setEnsError(null);
    try {
      const minted = await mintEnsSubname(address, result.txHash);
      setEnsMint(minted);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ensStorageKey(address), JSON.stringify(minted));
      }
    } catch (err) {
      setEnsError(err instanceof Error ? err.message : "ENS mint failed");
    } finally {
      setEnsMinting(false);
    }
  }

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

  const summaryByKeyword = useMemo(() => {
    const map: Record<string, SummarizeResponse> = {};
    for (const row of rows) {
      if (row.summary) map[row.result.keyword] = row.summary;
    }
    return map;
  }, [rows]);

  useEffect(() => {
    if (allAssets.length === 0) {
      setOnChainByTicker({});
      return;
    }
    const tickers = allAssets.map((a) => a.ticker);
    let cancelled = false;
    void getAssets(tickers).then((assets) => {
      if (cancelled) return;
      const map: Record<string, OnChainAsset> = {};
      for (const asset of assets) {
        map[asset.ticker.toUpperCase()] = asset;
      }
      setOnChainByTicker(map);
    });
    return () => {
      cancelled = true;
    };
  }, [allAssets]);

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

      if (ensMint?.subname && address && summarized.some((row) => row.summary)) {
        const brief = {
          topics: summarized
            .filter((row) => row.summary)
            .map((row) => ({
              keyword: row.result.keyword,
              sentiment: row.summary?.sentiment,
              momentum_score: row.summary?.momentum_score,
              themes: row.summary?.themes,
              assets: row.summary?.assets,
            })),
        };
        await publishEnsBrief({
          ownerAddress: address,
          subname: ensMint.subname,
          brief,
        });
      }
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

  const currentStage: FlowStage = !paid
    ? "paywall"
    : phase === "running"
      ? "scanning"
      : phase === "done" && selectedAsset
        ? "asset"
        : phase === "done"
          ? "dashboard"
          : "research";

  if (!paid) {
    return (
      <div className="min-h-full bg-paper text-ink">
        <FlowStepper current="paywall" />
        <main className="mx-auto max-w-6xl px-6 py-16">
          <Paywall onPaymentSuccess={handlePaymentSuccess} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-paper text-ink">
      <FlowStepper current={currentStage} />
      <main className="mx-auto max-w-6xl px-6 py-10">
        {ensMinting && (
          <p className="mb-6 text-center text-sm font-medium text-accent-green">
            Minting your chatterethglobal.eth subname on Ethereum&hellip;
          </p>
        )}
        {ensError && (
          <div
            role="alert"
            className="mb-6 rounded border-2 border-accent-orange/40 bg-accent-orange/5 px-4 py-3 text-sm text-accent-orange"
          >
            ENS mint: {ensError}
          </div>
        )}
        {ensMint && (
          <div className="mb-10">
            <EnsReceipt
              subname={ensMint.subname}
              ensAppUrl={ensMint.ensAppUrl}
            />
          </div>
        )}

        {/* Keyword entry */}
        <section className="rounded border-[3px] border-ink bg-white p-6 hard-shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-2xl font-black tracking-tight">
                Enter your keywords
              </h1>
              <p className="mt-1 text-sm text-ink/50">
                5&ndash;20 topics &mdash; mix crypto and companies (e.g. restaking, Nvidia
                AI chips)
              </p>
            </div>
            <button
              type="button"
              onClick={loadDemo}
              className="rounded border-2 border-ink px-3 py-1.5 text-sm font-bold transition hover:bg-ink hover:text-white"
            >
              Try demo keywords
            </button>
          </div>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={6}
            placeholder={"restaking\nNvidia AI chips\nsolana"}
            className="mt-4 w-full resize-y rounded border-2 border-ink/20 bg-paper px-4 py-3 font-mono text-sm text-ink placeholder:text-ink/30 focus:border-ink focus:outline-none"
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span
              className={`font-mono text-sm ${validCount ? "text-ink/50" : "text-signal font-bold"}`}
            >
              {count}/20 keywords
              {count > 0 && count < 5 && " — need at least 5"}
              {count > 20 && " — max 20"}
            </span>
            <button
              type="button"
              disabled={!validCount || phase === "running"}
              onClick={runResearch}
              className="rounded border-[3px] border-ink bg-signal px-5 py-2.5 font-display text-sm font-bold text-white transition hover:translate-x-0.5 hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {phase === "running" ? "Running research…" : "Run research"}
            </button>
          </div>
          <p className="mt-2 font-mono text-[10px] text-ink/40">
            ~1 min per topic; demo topics are instant (cached).
          </p>
        </section>

        {globalError && (
          <div
            role="alert"
            className="mt-6 rounded border-2 border-signal/40 bg-signal/5 px-4 py-3 text-sm text-signal"
          >
            <strong className="font-bold">Error:</strong> {globalError}
            <button
              type="button"
              onClick={runResearch}
              disabled={!validCount}
              className="ml-3 underline hover:text-ink disabled:opacity-40"
            >
              Retry
            </button>
          </div>
        )}

        {/* Scanning panel */}
        {phase === "running" && (
          <div className="mt-10">
            <ScanPanel
              steps={rowsToScanSteps(rows)}
              estimateSeconds={rows.length * 4}
            />
          </div>
        )}

        {/* Results */}
        {rows.length > 0 && phase === "done" && (
          <>
            <section className="mt-10">
              <h2 className="mb-4 font-display text-xl font-black tracking-tight">
                What&apos;s trending
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {rows.map((row, i) => (
                  <TopicCard
                    key={row.result.keyword}
                    result={row.result}
                    summary={row.summary}
                    status={row.status}
                    error={row.error}
                    accent={CARD_ACCENTS[i % CARD_ACCENTS.length]}
                  />
                ))}
              </div>
            </section>

            {allAssets.length > 0 && (
              <section className="mt-10">
                <h2 className="mb-4 font-display text-xl font-black tracking-tight">
                  What&apos;s tradable
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {allAssets.map((asset) => {
                    const onChain = onChainByTicker[asset.ticker.toUpperCase()];
                    const momentum = onChain?.momentum_score ?? 0;
                    const delta = onChain?.price_change_24h ?? 0;
                    return (
                      <AssetCard
                        key={asset.ticker}
                        ticker={asset.ticker}
                        name={onChain?.name ?? asset.name}
                        kind={asset.kind}
                        confidence={asset.confidence}
                        onChainMomentum={momentum}
                        priceDeltaPercent={delta}
                        agreementLabel={agreementLabel(
                          asset.confidence,
                          momentum,
                        )}
                        swapEnabled={
                          asset.kind === "crypto" &&
                          onChain?.status === "verified"
                        }
                        priceUsd={onChain?.price ?? null}
                        onClick={() => setSelectedAsset(asset.ticker)}
                      />
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {/* Asset detail overlay */}
        {selectedAsset && (() => {
          const asset = allAssets.find((a) => a.ticker === selectedAsset);
          if (!asset) return null;
          const onChain = onChainByTicker[asset.ticker.toUpperCase()];
          const momentum = onChain?.momentum_score ?? 0;
          const delta = onChain?.price_change_24h ?? 0;
          const summary = summaryByKeyword[asset.keyword];
          return (
            <AssetDetail
              ticker={asset.ticker}
              name={onChain?.name ?? asset.name}
              kind={asset.kind}
              socialScore={Math.round(asset.confidence * 100)}
              onChainMomentum={momentum}
              priceDeltaPercent={delta}
              agreementLabel={agreementLabel(asset.confidence, momentum)}
              themes={summary?.themes}
              sentiment={summary?.sentiment}
              swapEnabled={asset.kind === "crypto" && onChain?.status === "verified"}
              priceUsd={onChain?.price ?? null}
              onClose={() => setSelectedAsset(null)}
            />
          );
        })()}
      </main>
    </div>
  );
}
