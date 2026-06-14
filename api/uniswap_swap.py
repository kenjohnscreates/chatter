# Uniswap Trading API proxy (Uniswap prize — server-side swap routes).
# Forwards check_approval / quote / swap to trade-api.gateway.uniswap.org with the
# server UNISWAP_API_KEY so the browser never needs NEXT_PUBLIC_UNISWAP_API_KEY.

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import httpx
from fastapi import HTTPException

TRADING_API = "https://trade-api.gateway.uniswap.org/v1"
ROOT = Path(__file__).resolve().parent.parent

_client = httpx.Client(timeout=30.0)


def _api_key() -> str:
    key = os.environ.get("UNISWAP_API_KEY", "").strip()
    if key:
        return key
    env = ROOT / ".env"
    if env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("UNISWAP_API_KEY="):
                return line.partition("=")[2].strip()
    raise HTTPException(
        status_code=503,
        detail="Uniswap Trading API not configured: set UNISWAP_API_KEY",
    )


def proxy_trading_api(path: str, body: dict[str, Any]) -> dict[str, Any]:
    if path not in ("/check_approval", "/quote", "/swap"):
        raise HTTPException(status_code=400, detail=f"Unsupported Trading API path: {path}")

    api_key = _api_key()
    try:
        resp = _client.post(
            f"{TRADING_API}{path}",
            json=body,
            headers={
                "Content-Type": "application/json",
                "x-api-key": api_key,
            },
        )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Uniswap {path} request failed: {exc}",
        ) from exc

    try:
        data = resp.json()
    except ValueError:
        data = {}

    if not isinstance(data, dict):
        data = {}

    if not resp.is_success or data.get("errorCode"):
        detail = data.get("detail") or data.get("errorCode") or resp.reason_phrase
        status = resp.status_code if 400 <= resp.status_code < 600 else 502
        raise HTTPException(
            status_code=status,
            detail=f"Uniswap {path} ({resp.status_code}): {detail}",
        )

    return data
