const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8765";

export interface ResearchResult {
  keyword: string;
  ok: boolean;
  markdown: string;
  stderr: string;
  exit_code: number;
}

export interface ResearchResponse {
  results: ResearchResult[];
}

export interface Asset {
  ticker: string;
  name: string;
  kind: "crypto" | "equity";
  confidence: number;
}

export interface SummarizeResponse {
  themes: string[];
  sentiment: string;
  momentum_score: number;
  assets: Asset[];
}

async function parseJson<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `${label} failed (${res.status})${detail ? `: ${detail}` : ""}`,
    );
  }
  return res.json() as Promise<T>;
}

export async function postResearch(
  keywords: string[],
  cached = true,
): Promise<ResearchResponse> {
  const res = await fetch(`${API_BASE}/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keywords, cached }),
  });
  return parseJson<ResearchResponse>(res, "Research");
}

export async function postSummarize(
  keyword: string,
  markdown: string,
  cached = true,
): Promise<SummarizeResponse> {
  const res = await fetch(`${API_BASE}/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword, markdown, cached }),
  });
  return parseJson<SummarizeResponse>(res, `Summarize (${keyword})`);
}

export interface OnChainAsset {
  ticker: string;
  name: string;
  kind: "crypto" | "equity" | "unknown";
  status: "verified" | "unverified";
  badge: string | null;
  momentum_score: number;
  price: number | null;
  price_change_24h: number | null;
  volume_24h: number | null;
}

export async function getAssets(tickers: string[]): Promise<OnChainAsset[]> {
  if (tickers.length === 0) return [];
  const res = await fetch(
    `${API_BASE}/assets?tickers=${encodeURIComponent(tickers.join(","))}`,
  );
  const data = await parseJson<{ assets: OnChainAsset[] }>(res, "Assets");
  return data.assets;
}

/** Prefer verified on-chain kind over social extraction (e.g. SPX → SPX6900 crypto). */
export function resolvedAssetKind(
  socialKind: Asset["kind"],
  onChain?: Pick<OnChainAsset, "kind" | "status">,
): Asset["kind"] {
  if (onChain?.status === "verified" && onChain.kind !== "unknown") {
    return onChain.kind;
  }
  return socialKind;
}

export function agreementLabel(
  socialConfidence: number,
  onChainMomentum: number,
): string {
  const socialHigh = socialConfidence >= 0.6;
  const chainHigh = onChainMomentum >= 60;
  if (socialHigh && chainHigh) return "Confirmed trend";
  if (socialHigh && !chainHigh) return "Narrative only";
  if (!socialHigh && chainHigh) return "Quiet accumulation";
  return "Watch";
}
