"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import AssetCard from "@/components/AssetCard";
import AssetDetail from "@/components/AssetDetail";
import EnsReceipt from "@/components/EnsReceipt";
import Paywall from "@/components/Paywall";
import PaymentReceipt from "@/components/PaymentReceipt";
import ResearchReceipt from "@/components/ResearchReceipt";
import ResearchProgressBar from "@/components/ResearchProgressBar";
import { type ScanStep } from "@/components/ScanPanel";
import TopicCard, { type CardAccent } from "@/components/TopicCard";

const CARD_ACCENTS: CardAccent[] = ["yellow", "orange", "green", "white"];
import {
  agreementLabel,
  getAssets,
  resolvedAssetKind,
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
import {
  DEMO_RESET_ENABLED,
  clearDemoUnlock,
  isPaid,
  markPaid,
  saveLastPaymentTx,
} from "@/lib/demoState";
import type { FlowResult } from "@/lib/flow";
import {
  RESEARCH_LIVE,
  SIMULATE_RESEARCH_MS,
  runSimulatedResearch,
  type SimulationState,
} from "@/lib/simulateResearch";

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
  const [ensPublishError, setEnsPublishError] = useState<string | null>(null);
  const [ensPublishing, setEnsPublishing] = useState(false);
  const [receiptRefreshKey, setReceiptRefreshKey] = useState(0);
  const [onChainByTicker, setOnChainByTicker] = useState<
    Record<string, OnChainAsset>
  >({});
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [simState, setSimState] = useState<SimulationState | null>(null);
  const [receiptRow, setReceiptRow] = useState<TopicRow | null>(null);
  const [lastRunCached, setLastRunCached] = useState(true);
  const [paymentTxHash, setPaymentTxHash] = useState<string | null>(null);
  const [showPaymentReceipt, setShowPaymentReceipt] = useState(false);

  const address = primaryWallet?.address;
  const remintAttempted = useRef(false);

  useEffect(() => {
    remintAttempted.current = false;
  }, [address]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPaid(isPaid(address));
    const stored = address
      ? window.localStorage.getItem(ensStorageKey(address))
      : null;
    if (stored) {
      try {
        setEnsMint(JSON.parse(stored) as EnsMintResult);
      } catch {
        setEnsMint(null);
      }
    } else {
      setEnsMint(null);
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
    remintAttempted.current = true;
    if (address) {
      markPaid(address);
      saveLastPaymentTx(address, result.txHash);
    }
    setPaid(true);
    setPaymentTxHash(result.txHash);
    setShowPaymentReceipt(true);
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

  function resetDemoPayment() {
    if (!address) return;
    const ok = window.confirm(
      "Reset demo payment? This clears your local unlock and shows the paywall again. You will need to pay $1 USDC on Base Sepolia to continue.",
    );
    if (!ok) return;
    clearDemoUnlock(address);
    remintAttempted.current = false;
    setPaid(false);
    setEnsMint(null);
    setEnsError(null);
    setEnsPublishError(null);
    setPaymentTxHash(null);
    setShowPaymentReceipt(false);
    setRows([]);
    setPhase("idle");
    setGlobalError(null);
    setInput("");
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

  function buildSlimBrief(summarized: TopicRow[]) {
    return {
      topics: summarized
        .filter((row) => row.summary)
        .map((row) => ({
          keyword: row.result.keyword,
          sentiment: row.summary?.sentiment,
          momentum_score: row.summary?.momentum_score,
        })),
    };
  }

  async function publishBriefFromRows(summarized: TopicRow[]) {
    if (!ensMint?.subname || !address || !summarized.some((row) => row.summary)) {
      return;
    }
    setEnsPublishing(true);
    setEnsPublishError(null);
    try {
      await publishEnsBrief({
        ownerAddress: address,
        subname: ensMint.subname,
        brief: buildSlimBrief(summarized),
      });
      setReceiptRefreshKey((key) => key + 1);
    } catch (err) {
      setEnsPublishError(
        err instanceof Error ? err.message : "ENS publish failed",
      );
    } finally {
      setEnsPublishing(false);
    }
  }

  async function fetchResearchPipeline(
    kws: string[],
    useCache: boolean,
  ): Promise<TopicRow[]> {
    const { results } = await postResearch(kws, useCache);
    const nextRows: TopicRow[] = results.map((result) => ({
      result,
      status: result.ok ? ("summarizing" as const) : ("error" as const),
      error: result.ok ? undefined : result.stderr || "Research failed",
    }));

    return Promise.all(
      nextRows.map(async (row) => {
        if (!row.result.ok || !row.result.markdown) return row;
        try {
          const summary = await postSummarize(
            row.result.keyword,
            row.result.markdown,
            useCache,
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
  }

  async function runResearch(opts?: {
    keywords?: string[];
    forceCached?: boolean;
  }) {
    const kws = opts?.keywords ?? keywords;
    const useCache = opts?.forceCached ?? !RESEARCH_LIVE;
    const shouldSimulate = useCache && SIMULATE_RESEARCH_MS > 0;

    if (kws.length < 5 || kws.length > 20) return;

    setGlobalError(null);
    setEnsPublishError(null);
    setLastRunCached(useCache);
    setPhase("running");
    setSimState(null);
    setReceiptRow(null);

    const placeholders: TopicRow[] = kws.map((keyword) => ({
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
      const fetchPromise = fetchResearchPipeline(kws, useCache);

      let summarized: TopicRow[];
      if (shouldSimulate) {
        const [, result] = await Promise.all([
          runSimulatedResearch(kws.length, SIMULATE_RESEARCH_MS, (state) => {
            setSimState(state);
            setRows((prev) =>
              prev.map((row, i) => ({
                ...row,
                status: state.rowStatuses[i] ?? row.status,
              })),
            );
          }),
          fetchPromise,
        ]);
        summarized = result;
      } else {
        setRows((prev) =>
          prev.map((row) => ({ ...row, status: "researching" as const })),
        );
        summarized = await fetchPromise;
      }

      setRows(summarized);
      setSimState(null);
      setPhase("done");
      await publishBriefFromRows(summarized);
    } catch (err) {
      setGlobalError(
        err instanceof Error ? err.message : "Research request failed",
      );
      setPhase("idle");
      setRows([]);
      setSimState(null);
      return;
    }
  }

  async function retryEnsPublish() {
    if (phase !== "done" || rows.length === 0) return;
    await publishBriefFromRows(rows);
  }

  function loadDemo() {
    setInput(DEMO_KEYWORDS.join("\n"));
    setRows([]);
    setPhase("idle");
    setGlobalError(null);
    setEnsPublishError(null);
    setSimState(null);
  }

  function runDemo() {
    setInput(DEMO_KEYWORDS.join("\n"));
    void runResearch({ keywords: DEMO_KEYWORDS, forceCached: true });
  }

  const scanSteps = simState?.scanSteps ?? rowsToScanSteps(rows);
  const scanProgressValue =
    simState?.progressPercent ??
    (scanSteps.length > 0
      ? (scanSteps.filter((s) => s.status === "done").length / scanSteps.length) *
        100
      : 0);
  const scanLabel =
    simState?.header ??
    scanSteps.find((s) => s.status === "active")?.label ??
    "Scanning…";

  if (!paid) {
    return (
      <div className="min-h-full bg-paper text-ink">
        <main className="mx-auto max-w-6xl px-6 py-16">
          <Paywall onPaymentSuccess={handlePaymentSuccess} />
        </main>
      </div>
    );
  }

  if (showPaymentReceipt && paymentTxHash) {
    return (
      <div className="min-h-full bg-paper text-ink">
        <main className="mx-auto max-w-6xl px-6 py-16">
          {ensMinting && (
            <p className="mb-6 text-center text-sm font-medium text-accent-green">
              Minting your chatterchatter.eth subname on Ethereum&hellip;
            </p>
          )}
          {ensError && (
            <div
              role="alert"
              className="mb-6 mx-auto max-w-md rounded border-2 border-accent-orange/40 bg-accent-orange/5 px-4 py-3 text-sm text-accent-orange"
            >
              ENS mint: {ensError}
            </div>
          )}
          <PaymentReceipt
            txHash={paymentTxHash}
            ensMint={ensMint}
            onContinue={() => setShowPaymentReceipt(false)}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-paper text-ink">
      <main className="mx-auto max-w-6xl px-6 py-10">
        {ensMinting && (
          <p className="mb-6 text-center text-sm font-medium text-accent-green">
            Minting your chatterchatter.eth subname on Ethereum&hellip;
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
            <div className="flex flex-wrap gap-2">
              {DEMO_RESET_ENABLED && (
                <button
                  type="button"
                  onClick={resetDemoPayment}
                  className="rounded border-2 border-ink/30 px-3 py-1.5 text-sm font-medium text-ink/50 transition hover:border-signal hover:text-signal"
                >
                  Reset payment (demo)
                </button>
              )}
              <button
                type="button"
                onClick={loadDemo}
                disabled={phase === "running"}
                className="rounded border-2 border-ink px-3 py-1.5 text-sm font-bold transition hover:bg-ink hover:text-white disabled:opacity-40"
              >
                Load demo keywords
              </button>
              <button
                type="button"
                disabled={phase === "running" || ensMinting}
                onClick={runDemo}
                className="rounded border-2 border-signal bg-signal px-3 py-1.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
              >
                Run demo
              </button>
            </div>
          </div>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={6}
            disabled={phase === "running"}
            placeholder={"restaking\nNvidia AI chips\nsolana"}
            className="mt-4 w-full resize-y rounded border-2 border-ink/20 bg-paper px-4 py-3 font-mono text-sm text-ink placeholder:text-ink/30 focus:border-ink focus:outline-none disabled:opacity-60"
          />

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span
              className={`shrink-0 font-mono text-sm ${validCount ? "text-ink/50" : "text-signal font-bold"}`}
            >
              {count}/20 keywords
              {count > 0 && count < 5 && " — need at least 5"}
              {count > 20 && " — max 20"}
            </span>
            {phase === "running" && (
              <ResearchProgressBar
                progressPercent={scanProgressValue}
                label={scanLabel}
              />
            )}
            <button
              type="button"
              disabled={!validCount || phase === "running" || ensMinting}
              onClick={() => void runResearch()}
              className={`shrink-0 rounded border-[3px] border-ink bg-signal px-5 py-2.5 font-display text-sm font-bold text-white transition hover:translate-x-0.5 hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 ${phase !== "running" ? "ml-auto" : ""}`}
            >
              {phase === "running" ? "Running research…" : "Run research"}
            </button>
          </div>
          <p className="mt-2 font-mono text-[10px] text-ink/40">
            {RESEARCH_LIVE
              ? "Live search — about 1 min per keyword."
              : `Demo uses pre-indexed results; inline bar simulates ~${Math.round(SIMULATE_RESEARCH_MS / 1000)}s pacing.`}
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
              onClick={() => void runResearch()}
              disabled={!validCount}
              className="ml-3 underline hover:text-ink disabled:opacity-40"
            >
              Retry
            </button>
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
                    onReceiptClick={() => setReceiptRow(row)}
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
                    const kind = resolvedAssetKind(asset.kind, onChain);
                    return (
                      <AssetCard
                        key={asset.ticker}
                        ticker={asset.ticker}
                        name={onChain?.name ?? asset.name}
                        kind={kind}
                        confidence={asset.confidence}
                        onChainMomentum={momentum}
                        priceDeltaPercent={delta}
                        agreementLabel={agreementLabel(
                          asset.confidence,
                          momentum,
                        )}
                        swapEnabled={
                          kind === "crypto" &&
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
          const kind = resolvedAssetKind(asset.kind, onChain);
          const summary = summaryByKeyword[asset.keyword];
          return (
            <AssetDetail
              ticker={asset.ticker}
              name={onChain?.name ?? asset.name}
              kind={kind}
              socialScore={Math.round(asset.confidence * 100)}
              onChainMomentum={momentum}
              priceDeltaPercent={delta}
              agreementLabel={agreementLabel(asset.confidence, momentum)}
              themes={summary?.themes}
              sentiment={summary?.sentiment}
              swapEnabled={kind === "crypto" && onChain?.status === "verified"}
              priceUsd={onChain?.price ?? null}
              onClose={() => setSelectedAsset(null)}
            />
          );
        })()}

        {ensMint && (
          <div className="mt-16">
            <EnsReceipt
              subname={ensMint.subname}
              ensAppUrl={ensMint.ensAppUrl}
              refreshKey={receiptRefreshKey}
            />
            {ensPublishing && (
              <p className="mt-3 text-center text-sm text-ink/50">
                Publishing research to ENS&hellip;
              </p>
            )}
            {ensPublishError && (
              <div
                role="alert"
                className="mt-4 rounded border-2 border-signal/40 bg-signal/5 px-4 py-3 text-sm text-signal"
              >
                <strong className="font-bold">ENS publish:</strong> {ensPublishError}
                <button
                  type="button"
                  onClick={() => void retryEnsPublish()}
                  disabled={ensPublishing || phase !== "done"}
                  className="ml-3 underline hover:text-ink disabled:opacity-40"
                >
                  Retry ENS publish
                </button>
              </div>
            )}
          </div>
        )}

        {receiptRow && (
          <ResearchReceipt
            result={receiptRow.result}
            summary={receiptRow.summary}
            preIndexed={lastRunCached}
            onClose={() => setReceiptRow(null)}
          />
        )}
      </main>
    </div>
  );
}
