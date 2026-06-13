# Demo cache builder for Chatter (T3).
# Runs T1 run_research() over DEMO_KEYWORDS and writes api/demo_cache/<slug>.json.
# Re-runnable — overwrites existing files. Never call live during demos.

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

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
    path = CACHE_DIR / f"{_slug(kw)}.json"
    with path.open("w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    status = "ok" if result.get("ok") else f"FAIL({result.get('exit_code')})"
    print(f"{status:6}  {kw}  ->  {path.name}")
