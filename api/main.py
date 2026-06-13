# FastAPI service for Chatter's web migration.
# Not a sponsor integration file; sponsor-specific logic lands elsewhere.
# Keeps research callable from the web while later T5/T8 modules are pending.

from __future__ import annotations

import json
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from core.research import run_research


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

CACHE_DIR = Path(__file__).resolve().parent / "demo_cache"
MAX_WORKERS = 6


class ResearchRequest(BaseModel):
    keywords: list[str] = Field(default_factory=list)
    cached: bool = False


def _slug(keyword: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", keyword.lower()).strip("-")
    return slug or "keyword"


def _missing_cache(keyword: str) -> dict:
    return {
        "keyword": keyword,
        "ok": False,
        "markdown": "",
        "stderr": "cached result not found",
        "exit_code": -1,
    }


def _cached_research(keyword: str) -> dict:
    path = CACHE_DIR / f"{_slug(keyword)}.json"
    try:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        return _missing_cache(keyword)
    except (OSError, json.JSONDecodeError) as exc:
        item = _missing_cache(keyword)
        item["stderr"] = str(exc)
        return item

    if isinstance(data, dict):
        return {"keyword": keyword, **data}
    item = _missing_cache(keyword)
    item["stderr"] = "cached result is not a JSON object"
    return item


@app.post("/research")
def research(req: ResearchRequest, cached: bool = Query(False)) -> dict:
    keywords = [keyword.strip() for keyword in req.keywords if keyword.strip()]
    use_cache = req.cached or cached
    if not keywords:
        return {"results": []}

    if use_cache:
        return {"results": [_cached_research(keyword) for keyword in keywords]}

    results: list[dict | None] = [None] * len(keywords)
    worker_count = min(MAX_WORKERS, len(keywords))
    with ThreadPoolExecutor(max_workers=worker_count) as pool:
        futures = {pool.submit(run_research, keyword): idx for idx, keyword in enumerate(keywords)}
        for future in as_completed(futures):
            results[futures[future]] = future.result()
    return {"results": results}


@app.post("/summarize")
def summarize() -> None:
    raise HTTPException(status_code=501, detail="summarize is not implemented")


@app.get("/assets")
def assets(tickers: str = "") -> None:
    raise HTTPException(status_code=501, detail="assets is not implemented")
