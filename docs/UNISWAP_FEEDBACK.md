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

## 2026-06-13 — Trading API testnet support (T10 swap execution)

- Endpoint: `POST https://trade-api.gateway.uniswap.org/v1/quote`
- Expected: a documented list of supported testnets; PRD targeted Base Sepolia for the demo swap.
- Actual: of the testnets we probed with our key, only **Ethereum Sepolia (11155111)**
  returns routable quotes, and only for the **WETH→UNI** pair (Uniswap-deployed Sepolia
  tokens). Base Sepolia (84532) and Unichain Sepolia (1301) both return
  `{"errorCode":"ResourceNotFound","detail":"No quotes available"}` for ETH/USDC.
  Friction: there is no published "supported testnet chains + liquid pairs" reference,
  so picking a demo chain required brute-force probing.

## 2026-06-13 — Native ETH has no route on Sepolia

- Endpoint: `POST /v1/quote`, chain 11155111.
- Expected: native ETH (`0xEeee…EEeE`) routable like on mainnet (mainnet ETH→USDC quotes fine).
- Actual: native ETH→UNI on Sepolia returns `ResourceNotFound: No quotes available`;
  the wrapped `WETH` (`0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14`) → UNI works.
  Worked around by wrapping ETH→WETH client-side before quoting. Friction: native-ETH
  auto-wrap routing that works on mainnet silently fails on this testnet.

## 2026-06-13 — Tokenized equities blocked at the API (expected, good signal)

- Endpoint: `POST /v1/quote`, chain 1, tokenOut = Tesla xStock (TSLAX,
  `0x8ad3c73f833d3f9a523ab01476625f269aeb7cf0`).
- Expected: a quote (read-only) or a clear "execution not permitted" flag.
- Actual: `{"errorCode":"Forbidden","detail":"Token is blocked"}`. Confirms compliance
  gating is enforced server-side for tokenized equities — matches our quote-only,
  execution-disabled UX. Minor friction: a structured "complianceBlocked" flag would be
  easier to branch on than a generic `Forbidden`.

## 2026-06-13 — API key is secret but CORS permits browser calls

- Endpoint: `OPTIONS /v1/quote`.
- Observation: the gateway reflects arbitrary `Origin` (echoed `http://localhost:3000`)
  and allows the `x-api-key` request header, so a browser app can call the Trading API
  directly. Because the same key is rate-limited (6 RPS) and shared with market data, a
  documented public/client-safe key scope (or a CORS allowlist) would help builders avoid
  leaking the privileged key. For this hackathon demo we call client-direct on testnet and
  recommend a server proxy for production.

<!-- Append new entries below; automated entries are added by api/uniswap_data.py. -->
