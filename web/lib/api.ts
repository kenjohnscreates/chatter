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
