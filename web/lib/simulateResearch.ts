import type { ScanStep } from "@/components/ScanPanel";

export type SimRowStatus = "queued" | "researching" | "summarizing" | "done" | "error";

const SCAN_LABELS = [
  "Parsing matrix inputs",
  "Establishing on-chain connections",
  "Indexing social layers",
  "Calculating mindshare variance",
] as const;

export interface SimulationState {
  progressPercent: number;
  scanSteps: { label: string; status: ScanStep }[];
  rowStatuses: SimRowStatus[];
  header: "Scanning..." | "Summarizing...";
}

function scanStepsFromProgress(progress: number): SimulationState["scanSteps"] {
  const activeIndex = Math.min(
    SCAN_LABELS.length - 1,
    Math.floor((progress / 100) * SCAN_LABELS.length),
  );
  return SCAN_LABELS.map((label, i) => ({
    label,
    status: (i < activeIndex
      ? "done"
      : i === activeIndex
        ? "active"
        : "pending") as ScanStep,
  }));
}

function rowStatusesFromProgress(
  keywordCount: number,
  progress: number,
): SimRowStatus[] {
  if (keywordCount === 0) return [];
  return Array.from({ length: keywordCount }, (_, i) => {
    const slice = 100 / keywordCount;
    const base = i * slice;
    if (progress < base + slice * 0.15) return "queued";
    if (progress < base + slice * 0.85) return "researching";
    return "summarizing";
  });
}

/** Timed UX simulation for cached demo runs (data fetched separately). */
export function runSimulatedResearch(
  keywordCount: number,
  durationMs: number,
  onTick: (state: SimulationState) => void,
): Promise<void> {
  const ticks = 20;
  const stepMs = durationMs / ticks;

  return new Promise((resolve) => {
    let tick = 0;
    const interval = setInterval(() => {
      const progress = Math.min(100, (tick / ticks) * 100);
      onTick({
        progressPercent: progress,
        scanSteps: scanStepsFromProgress(progress),
        rowStatuses: rowStatusesFromProgress(keywordCount, progress),
        header: progress >= 55 ? "Summarizing..." : "Scanning...",
      });
      tick += 1;
      if (tick > ticks) {
        clearInterval(interval);
        resolve();
      }
    }, stepMs);
  });
}

export const RESEARCH_LIVE =
  process.env.NEXT_PUBLIC_RESEARCH_LIVE === "true";

/** Default 10s simulated scan for cached demo runs. Set to 0 for instant. */
export const SIMULATE_RESEARCH_MS = (() => {
  const raw = process.env.NEXT_PUBLIC_SIMULATE_RESEARCH_MS;
  if (raw === "0") return 0;
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (!Number.isNaN(n) && n >= 0) return n;
  }
  return 10_000;
})();
