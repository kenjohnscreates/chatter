# FastAPI service for Chatter's web migration.
# Not a sponsor integration file; sponsor-specific logic lands elsewhere.
# Keeps research callable from the web while later T5/T8 modules are pending.

from __future__ import annotations

import json
import os
import re
import ssl
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

try:
    import certifi

    _SSL_CONTEXT: ssl.SSLContext | None = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    _SSL_CONTEXT = None

from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from core.research import run_research
from api.gemini import summarize_markdown
from api.ens import mint_subname, publish_brief, read_records
from api.uniswap_data import get_assets, load_token_list

# Load repo-root .env so server secrets (DYNAMIC_API_KEY etc.) resolve without a launcher.
_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
if _ENV_PATH.exists():
    for _line in _ENV_PATH.read_text(encoding="utf-8").splitlines():
        _line = _line.strip()
        if not _line or _line.startswith("#") or "=" not in _line:
            continue
        _key, _, _val = _line.partition("=")
        os.environ[_key.strip()] = _val.strip()


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


class SummarizeRequest(BaseModel):
    keyword: str = ""
    markdown: str = ""
    cached: bool = True


class EnsMintRequest(BaseModel):
    ownerAddress: str
    paymentTxHash: str | None = None


class EnsBriefRequest(BaseModel):
    ownerAddress: str
    subname: str | None = None
    brief: Any = None


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
def summarize(req: SummarizeRequest) -> dict:
    keyword = req.keyword.strip()
    markdown = req.markdown
    if not markdown and keyword:
        cached = _cached_research(keyword)
        if not cached.get("ok"):
            raise HTTPException(status_code=404, detail=cached.get("stderr", "cached result not found"))
        markdown = str(cached.get("markdown", ""))
    if not markdown:
        raise HTTPException(status_code=400, detail="markdown or keyword is required")
    return summarize_markdown(markdown, keyword=keyword or None, use_cache=req.cached)


# --- Dynamic Flow paywall (Dynamic prize) ---------------------------------
# Creates the $1 Base Sepolia USDC checkout config server-side so the dyn_ API
# token is NEVER exposed to the browser. The browser then runs the per-payment
# transaction steps with the short-lived dct_ session token (see web/lib/flow.ts).
DYNAMIC_API_BASE = os.environ.get("DYNAMIC_API_BASE", "https://app.dynamicauth.com/api/v0")
BASE_SEPOLIA_CHAIN_ID = "84532"
BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"

_checkout_cache: dict[str, str] = {}


def _create_flow_checkout() -> str:
    api_key = os.environ.get("DYNAMIC_API_KEY")
    environment_id = os.environ.get("DYNAMIC_ENVIRONMENT_ID")
    treasury = os.environ.get("CHATTER_TREASURY_ADDRESS")
    if not api_key or not environment_id or not treasury:
        raise HTTPException(
            status_code=500,
            detail="Flow paywall not configured: set DYNAMIC_API_KEY, DYNAMIC_ENVIRONMENT_ID, CHATTER_TREASURY_ADDRESS",
        )

    cache_key = f"{environment_id}:{treasury}"
    if cache_key in _checkout_cache:
        return _checkout_cache[cache_key]

    payload = {
        "mode": "payment",
        "settlementConfig": {
            "strategy": "cheapest",
            "settlements": [
                {
                    "chainName": "EVM",
                    "chainId": BASE_SEPOLIA_CHAIN_ID,
                    "tokenAddress": BASE_SEPOLIA_USDC,
                    "symbol": "USDC",
                    "tokenDecimals": 6,
                    "isNative": False,
                }
            ],
        },
        "destinationConfig": {
            "destinations": [
                {"chainName": "EVM", "type": "address", "identifier": treasury}
            ]
        },
        "enableOrchestration": True,
    }

    request = urllib.request.Request(
        f"{DYNAMIC_API_BASE}/environments/{environment_id}/checkouts",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            # Dynamic's WAF (Cloudflare) blocks the default Python-urllib UA (err 1010).
            "User-Agent": "chatter-flow/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30, context=_SSL_CONTEXT) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")
        raise HTTPException(status_code=502, detail=f"Flow checkout creation failed: {detail}") from exc
    except urllib.error.URLError as exc:
        raise HTTPException(status_code=502, detail=f"Flow checkout request failed: {exc.reason}") from exc

    checkout_id = data.get("id")
    if not isinstance(checkout_id, str):
        raise HTTPException(status_code=502, detail="Flow checkout response missing id")

    _checkout_cache[cache_key] = checkout_id
    return checkout_id


@app.post("/checkout")
def checkout() -> dict:
    return {"checkoutId": _create_flow_checkout()}


@app.post("/ens/mint")
def ens_mint(req: EnsMintRequest) -> dict:
    owner = req.ownerAddress.strip()
    if not owner.startswith("0x") or len(owner) != 42:
        raise HTTPException(status_code=400, detail="ownerAddress must be a 0x-prefixed wallet")
    try:
        return mint_subname(owner, payment_tx_hash=req.paymentTxHash)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"ENS mint failed: {exc}") from exc


@app.get("/ens/records")
def ens_records(subname: str = Query(..., min_length=3)) -> dict:
    try:
        records = read_records(subname.strip().lower())
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"ENS read failed: {exc}") from exc
    return {"subname": subname.strip().lower(), "records": records}


@app.post("/ens/brief")
def ens_brief(req: EnsBriefRequest) -> dict:
    owner = req.ownerAddress.strip()
    if not owner.startswith("0x") or len(owner) != 42:
        raise HTTPException(status_code=400, detail="ownerAddress must be a 0x-prefixed wallet")
    if req.brief is None:
        raise HTTPException(status_code=400, detail="brief is required")
    try:
        return publish_brief(
            owner,
            req.brief,
            subname=req.subname.strip().lower() if req.subname else None,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"ENS brief publish failed: {exc}") from exc


@app.on_event("startup")
def _warm_token_list() -> None:
    load_token_list()


@app.get("/assets")
def assets(tickers: str = "") -> dict:
    symbols = [ticker.strip() for ticker in tickers.split(",") if ticker.strip()]
    if not symbols:
        return {"assets": []}
    return get_assets(symbols)
