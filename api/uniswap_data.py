# Uniswap prize, market data half: turns a ticker into a tradable asset card.
# Resolves ticker->address via the Uniswap default token list (scam filter: never guess),
# reads 24h volume + price delta and discovers tokenized equities via the Uniswap data gateway.
# Every Uniswap response is cached server-side (>=60s TTL) to respect the 6 RPS API key limit.

from __future__ import annotations

import math
import os
import threading
import time
from datetime import date
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parent.parent
FEEDBACK_DOC = ROOT / "docs" / "UNISWAP_FEEDBACK.md"

TOKEN_LIST_URL = "https://tokens.uniswap.org"
GATEWAY_URL = "https://interface.gateway.uniswap.org/v1/graphql"
CACHE_TTL = 60.0  # >=60s; Uniswap API key is rate limited to 6 RPS.
EQUITY_KEYWORDS = ("tokenized", "xstock", "x stock", " stock")

_session = httpx.Client(
    timeout=20.0,
    headers={
        "Origin": "https://app.uniswap.org",
        "Content-Type": "application/json",
        "User-Agent": "chatter/1.0",
    },
)

_cache: dict[str, tuple[float, object]] = {}
_cache_lock = threading.Lock()
_token_index: dict[str, dict] = {}
_token_index_ready = False
_token_index_lock = threading.Lock()
_logged_feedback: set[str] = set()


def _api_key() -> str:
    key = os.environ.get("UNISWAP_API_KEY", "").strip()
    if key:
        return key
    env = ROOT / ".env"
    if env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("UNISWAP_API_KEY="):
                return line.split("=", 1)[1].strip()
    return ""


def _log_feedback(endpoint: str, expected: str, actual: str) -> None:
    dedupe = f"{endpoint}|{actual}"
    if dedupe in _logged_feedback:
        return
    _logged_feedback.add(dedupe)
    try:
        FEEDBACK_DOC.parent.mkdir(parents=True, exist_ok=True)
        entry = (
            f"\n## {date.today().isoformat()} — {endpoint}\n"
            f"- Expected: {expected}\n"
            f"- Actual: {actual}\n"
        )
        with FEEDBACK_DOC.open("a", encoding="utf-8") as f:
            f.write(entry)
    except OSError:
        pass


def _cached(key: str, producer):
    now = time.monotonic()
    with _cache_lock:
        hit = _cache.get(key)
        if hit and now - hit[0] < CACHE_TTL:
            return hit[1]
    value = producer()
    with _cache_lock:
        _cache[key] = (now, value)
    return value


def _graphql(query: str, variables: dict, *, endpoint: str) -> dict:
    headers = {}
    key = _api_key()
    if key:
        headers["x-api-key"] = key
    try:
        resp = _session.post(GATEWAY_URL, json={"query": query, "variables": variables}, headers=headers)
        body = resp.json()
    except (httpx.HTTPError, ValueError) as exc:
        _log_feedback(endpoint, "200 with JSON body", f"request failed: {exc!r}")
        return {}
    if resp.status_code != 200 or body.get("errors"):
        _log_feedback(endpoint, "200 without GraphQL errors", f"status={resp.status_code} body={str(body)[:200]}")
    return body.get("data") or {}


_TOKEN_QUERY = """
query Token($chain: Chain!, $address: String) {
  token(chain: $chain, address: $address) {
    symbol name address chain
    market(currency: USD) {
      price { value }
      pricePercentChange(duration: DAY) { value }
      volume(duration: DAY) { value }
    }
  }
}
""".strip()

_SEARCH_QUERY = """
query Search($searchQuery: String!) {
  searchTokens(searchQuery: $searchQuery) {
    symbol name chain address standard
    project { name isSpam safetyLevel }
    market(currency: USD) {
      price { value }
      pricePercentChange(duration: DAY) { value }
      volume(duration: DAY) { value }
    }
  }
}
""".strip()


def load_token_list() -> None:
    """Fetch + index the Uniswap default token list (mainnet). Cached at startup."""
    global _token_index_ready
    with _token_index_lock:
        if _token_index_ready:
            return
        index: dict[str, dict] = {
            "ETH": {"symbol": "ETH", "name": "Ethereum", "address": None, "chain": "ETHEREUM"},
        }
        try:
            data = _session.get(TOKEN_LIST_URL).json()
            for tok in data.get("tokens", []):
                if tok.get("chainId") != 1:
                    continue
                index.setdefault(
                    str(tok.get("symbol", "")).upper(),
                    {
                        "symbol": tok.get("symbol"),
                        "name": tok.get("name"),
                        "address": tok.get("address"),
                        "chain": "ETHEREUM",
                    },
                )
        except (httpx.HTTPError, ValueError) as exc:
            _log_feedback(TOKEN_LIST_URL, "token list JSON", f"fetch failed: {exc!r}")
        _token_index.update(index)
        _token_index_ready = True


def _market_fields(market: dict | None) -> dict:
    market = market or {}

    def _val(node):
        return node.get("value") if isinstance(node, dict) else None

    return {
        "price": _val(market.get("price")),
        "price_change_24h": _val(market.get("pricePercentChange")),
        "volume_24h": _val(market.get("volume")),
    }


def _momentum_score(volume_24h, price_change_24h) -> int:
    """0-100 blend: 60% liquidity (log volume), 40% 24h price direction."""
    vol = float(volume_24h or 0.0)
    vol_score = max(0.0, min(100.0, (math.log10(max(vol, 1.0)) - 2.0) / 7.0 * 100.0))
    delta = float(price_change_24h or 0.0)
    delta_norm = max(-1.0, min(1.0, delta / 10.0))  # +-10% saturates
    score = 0.6 * vol_score + 0.4 * (50.0 + 50.0 * delta_norm)
    return int(round(max(0.0, min(100.0, score))))


def _crypto_asset(symbol: str, entry: dict) -> dict:
    data = _cached(
        f"token:{entry['chain']}:{entry['address']}",
        lambda: _graphql(
            _TOKEN_QUERY,
            {"chain": entry["chain"], "address": entry["address"]},
            endpoint="gateway token query",
        ),
    )
    token = (data or {}).get("token") or {}
    market = _market_fields(token.get("market"))
    return {
        "ticker": symbol,
        "name": token.get("name") or entry.get("name") or symbol,
        "kind": "crypto",
        "status": "verified",
        "chain": entry["chain"],
        "address": entry["address"],
        "badge": None,
        "momentum_score": _momentum_score(market["volume_24h"], market["price_change_24h"]),
        **market,
    }


def _discover_equity(symbol: str) -> dict | None:
    data = _cached(
        f"search:{symbol}",
        lambda: _graphql(_SEARCH_QUERY, {"searchQuery": symbol}, endpoint="gateway searchTokens"),
    )
    results = (data or {}).get("searchTokens") or []
    best = None
    best_volume = -1.0
    for item in results:
        project = item.get("project") or {}
        if project.get("isSpam"):
            continue  # scam filter: never surface flagged impersonators
        sym = str(item.get("symbol") or "").upper()
        if not sym.startswith(symbol):
            continue
        text = f"{item.get('name', '')} {project.get('name', '')}".lower()
        if not any(k in text for k in EQUITY_KEYWORDS):
            continue
        volume = float(_market_fields(item.get("market"))["volume_24h"] or 0.0)
        if volume > best_volume:
            best, best_volume = item, volume
    if best is None:
        return None
    market = _market_fields(best.get("market"))
    project = best.get("project") or {}
    return {
        "ticker": symbol,
        "name": (project.get("name") or best.get("name") or symbol),
        "kind": "equity",
        "status": "verified",
        "chain": best.get("chain"),
        "address": best.get("address"),
        "badge": "Tokenized equity",
        "momentum_score": _momentum_score(market["volume_24h"], market["price_change_24h"]),
        **market,
    }


def _unverified(symbol: str) -> dict:
    return {
        "ticker": symbol,
        "name": symbol,
        "kind": "unknown",
        "status": "unverified",
        "chain": None,
        "address": None,
        "badge": None,
        "price": None,
        "price_change_24h": None,
        "volume_24h": None,
        "momentum_score": 0,
    }


def resolve_asset(ticker: str) -> dict:
    symbol = ticker.upper().strip()
    if not symbol:
        return _unverified(symbol)
    load_token_list()
    return _cached(f"asset:{symbol}", lambda: _resolve_asset(symbol))


def _resolve_asset(symbol: str) -> dict:
    entry = _token_index.get(symbol)
    if entry:
        return _crypto_asset(symbol, entry)
    equity = _discover_equity(symbol)
    if equity:
        return equity
    return _unverified(symbol)  # unmatched ticker: never guess an address


def get_assets(tickers: list[str]) -> dict:
    return {"assets": [resolve_asset(t) for t in tickers]}
