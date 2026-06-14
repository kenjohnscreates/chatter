export interface ResearchProvenance {
  sources: string[];
  evidenceTotal: number | null;
  syncedDate: string | null;
  footerLines: string[];
}

const SOURCES_LINE =
  /- Sources:\s*\d+\s*active\s*\(([^)]+)\)/i;
const EVIDENCE_LINE = /- Total evidence:\s*(\d+)\s*items/i;
const SYNCED_LINE = /synced\s+(\d{4}-\d{2}-\d{2})/i;
const FOOTER_LINE = /^[├└│─\s].*(?:Reddit|YouTube|TikTok|Instagram|HN|Bluesky|GitHub|Web|Polymarket)/i;

export function parseResearchMarkdown(markdown: string): ResearchProvenance {
  const sources: string[] = [];
  let evidenceTotal: number | null = null;
  let syncedDate: string | null = null;
  const footerLines: string[] = [];

  const sourcesMatch = markdown.match(SOURCES_LINE);
  if (sourcesMatch?.[1]) {
    for (const part of sourcesMatch[1].split(",")) {
      const name = part.trim();
      if (name) sources.push(name);
    }
  }

  const evidenceMatch = markdown.match(EVIDENCE_LINE);
  if (evidenceMatch?.[1]) {
    evidenceTotal = Number.parseInt(evidenceMatch[1], 10);
  }

  const syncedMatch = markdown.match(SYNCED_LINE);
  if (syncedMatch?.[1]) syncedDate = syncedMatch[1];

  let inFooter = false;
  for (const line of markdown.split("\n")) {
    if (line.includes("All agents reported back")) inFooter = true;
    if (inFooter && FOOTER_LINE.test(line)) {
      const cleaned = line.replace(/^[├└│─\s]+/, "").trim();
      if (cleaned) footerLines.push(cleaned);
    }
  }

  return { sources, evidenceTotal, syncedDate, footerLines };
}
