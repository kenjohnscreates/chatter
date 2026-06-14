# Demo cache builder for Chatter (T3).
# Runs last30days scrape + Gemini summarize; writes api/demo_cache/<slug>.json + .summary.json.
# Re-runnable — overwrites existing files.

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from api.gemini import summarize_markdown
from core.research import run_research

# --- edit this list freely ---
DEMO_KEYWORDS = [
    "restaking",
    "Nvidia AI chips",
    "solana",
    "tokenized equities",
    "Base blockchain",
]
# -----------------------------

CACHE_DIR = Path(__file__).resolve().parents[1] / "api" / "demo_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _slug(keyword: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", keyword.lower()).strip("-")
    return slug or "keyword"


for kw in DEMO_KEYWORDS:
    result = run_research(kw)
    slug = _slug(kw)
    path = CACHE_DIR / f"{slug}.json"
    with path.open("w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    status = "ok" if result.get("ok") else f"FAIL({result.get('exit_code')})"
    print(f"{status:6}  {kw}  ->  {path.name}")

    if result.get("ok") and result.get("markdown"):
        summary = summarize_markdown(
            str(result["markdown"]),
            keyword=kw,
            use_cache=False,
        )
        summary_path = CACHE_DIR / f"{slug}.summary.json"
        with summary_path.open("w", encoding="utf-8") as f:
            json.dump(summary, f, ensure_ascii=False, indent=2)
        print(f"       summarize -> {summary_path.name}")
