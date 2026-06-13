# Uniswap API feedback / DX friction

Log of API errors, unclear docs, and DX friction hit while building Chatter's
Uniswap integration (T8 market data, T10 swaps). Requested by the Uniswap team on site.

## 2026-06-13 — market data API key vs. endpoint

- Expected: the issued `UNISWAP_API_KEY` (6 RPS) to unlock a documented REST endpoint
  for token 24h volume + price delta.
- Actual: the hosted "Uniswap API" key is swap/quote only; there is no documented
  market-data REST endpoint that accepts `x-api-key`. The deprecated `api.uniswap.info`
  v2 endpoints are gone, and docs point to subgraphs (which need a separate The Graph
  gateway key). Worked around it via the interface data gateway GraphQL
  (`interface.gateway.uniswap.org/v1/graphql`, `token` + `searchTokens`), which serves
  the data the app UI uses but is undocumented for external builders. Friction:
  a documented, key-authenticated market-data endpoint would remove this guesswork.

<!-- Append new entries below; automated entries are added by api/uniswap_data.py. -->
