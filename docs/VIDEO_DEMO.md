# Chatter video demo guide

## Status

| Item | Status |
|------|--------|
| Silent / screen-only demo video (localhost) | **Done** |
| Talking-head version | Use **Narration script** below |
| Deployed URL in video | Not required for submission |
| Live finalist judging prep | See **Judging talking points** at bottom |

---

## What the demo actually does

1. **last30days** scrapes social sources (Reddit, YouTube, GitHub, Bluesky, etc.) per keyword.
2. **Gemini** turns that markdown into themes, sentiment, momentum, and suggested tickers.
3. **Uniswap API** adds on-chain volume/price for those tickers.

For the web demo we **pre-run** steps 1–2 via `scripts/build_demo_cache.py` and commit results under `api/demo_cache/`. The UI **replays** that cache so recording stays fast and reliable.

The **inline progress bar is UX simulation only** (~10 seconds by default). It paces the demo while cached data loads; it does not fabricate evidence.

---

## Narration script (~3 min, talking-head + screen)

Record voiceover while screen-recording localhost, or cut between face cam and screen. **Less slides, more demo.**

### 0:00 — Hook (15s)

> "Chatter answers one question: where is the chatter — and can you act on it?
>
> We took an open-source GTM research tool, wrapped it in a web app, and wired it to **pay, research, and trade** — with **no traditional user database**. Your wallet, your ENS name, your receipt."

**Screen:** Landing page.

---

### 0:15 — Dynamic: walletless → wallet (25s)

> "Sign in with email — no wallet required. **Dynamic** creates an embedded wallet automatically. Same flow works with an external wallet.
>
> This is the **Wallet Glow Up**: our desktop PyQt research app becomes a monetized web product where anyone can participate."

**Screen:** Dynamic login → address appears in header.

**WOW:** Embedded wallet for no-wallet users; email/social + wallet in one SDK.

---

### 0:40 — Dynamic Flow: pay $1 on Base Sepolia (30s)

> "Pay **one dollar** to unlock a research run. This is **Fireblocks Flow** on Base Sepolia — pay with whatever you hold; Flow settles to USDC in our treasury.
>
> The server creates the checkout config — our API key never hits the browser."

**Screen:** Paywall → quote → confirm → **Paid ✓** → payment receipt with Base Sepolia explorer link.

**WOW:** Multi-chain paywall; REST checkout (not headless SDK) after we hit auth-sharing issues between Dynamic packages.

**Challenge we overcame:** Cloudflare blocked Python's default User-Agent on checkout creation — fixed with explicit UA + certifi SSL. Dynamic WaaS wallet creation raced connectors — removed custom auto-create, let the SDK handle it.

---

### 1:10 — Research pipeline (45s)

> "Hit **Run demo** — five keywords mixing crypto and companies: restaking, Nvidia AI chips, Solana, tokenized equities, Base blockchain.
>
> The progress bar paces the experience while we load **pre-indexed results** from our real pipeline: last30days scrape → Gemini brief → ticker extraction. The data isn't made up — we built it with `build_demo_cache.py` and committed it to the repo.
>
> Each topic card is a trend brief. Open **Research receipt** on any topic — that's the actual scrape sources plus Gemini output, with a **Pre-indexed** badge so we're honest."

**Screen:** Run demo → ~10s inline progress bar → topic cards → open Research receipt on one topic.

**WOW:** Continuity story — extended our existing open-source `last30days-skill` into a FastAPI + Next.js product without PyQt.

**Honest line:** "For the demo we replay cache so judges see a reliable take; live scrape is one env flag away."

---

### 1:55 — Uniswap: social × on-chain (40s)

> "Below that: **what's tradable**. Every asset pairs **social mindshare** from Gemini with **on-chain momentum** from Uniswap — volume and 24-hour price delta. When both agree, we label it a **confirmed trend**; when they diverge, we tell you if it's narrative-only or quiet accumulation.
>
> **Tokenized equities** — Tesla, NVIDIA — show up with a badge. Uniswap's API blocks execution on those pools for compliance, so we **quote and display** but disable the swap button with a clear note. That's not a bug — it's the v4 compliance story.
>
> On crypto assets, **swap** runs the full Trading API pipeline: check approval, Permit2 signature, quote, broadcast — from the same embedded wallet."

**Screen:** Asset cards with momentum bars + equity badge → click Swap on a crypto card → Sepolia tx.

**WOW:** Tokenized equities angle (launched during the hackathon) — trends aren't just coins anymore. Real testnet swap txids in `docs/SUBMISSION_TXIDS.md`.

**Challenges we overcame:**
- No documented market-data REST endpoint for our API key — worked around via Uniswap's data gateway GraphQL with server-side caching (6 RPS limit).
- Testnet swap routing: Base Sepolia had **no quotes**; only **Ethereum Sepolia WETH→UNI** worked after probing. Native ETH failed — we wrap to WETH first.
- Documented all of this in `docs/UNISWAP_FEEDBACK.md` per the Uniswap team's request.

---

### 2:35 — ENS: no user database (30s)

> "Scroll down — this is the **ENS** beat. When you pay, we mint a subname under **chatterchatter.eth** on **mainnet** — tied to your wallet, like `u4dd10ee5.chatterchatter.eth`. It's not a vanity picker; it's a **portable receipt** — same wallet, same name every time.
>
> After research completes, your brief is written to **`com.chatter.brief`** on that name. Open the ENS app — it's real, on-chain, not hard-coded in our UI. **Chatter has no user database** — ENS is the account system and the receipt ledger."

**Screen:** EnsReceipt → expand `com.chatter.brief` → **View in ENS app**.

**WOW:** Mainnet ENS subnames + text records; server publishes brief then transfers ownership — users don't need mainnet ETH.

**Challenges we overcame:**
- Sepolia v1 ENS registration is **closed** for new names — pivoted to **mainnet v1** with parent `chatterchatter.eth`.
- Rejected ENS v2 alpha (resettable state) and CCIP wildcard (time-box) in favor of shippable NameWrapper mint.
- Deferred NFT transfer until after brief publish so the server signer can write records.

---

### 3:05 — Close (15s)

> "Pay on Base Sepolia. Research social mindshare. Match it to on-chain momentum — including tokenized stocks. Swap on testnet. Own the result on your ENS name.
>
> Built with Dynamic, Uniswap, and ENS during ETHGlobal New York. Repo is open source, txids are in the README, and we logged Uniswap API feedback for the team. Thanks."

**Screen:** Dashboard wide shot or logo.

---

## WOW summary (quick reference)

| Partner | Wow moment | One-liner |
|---------|------------|-----------|
| **Dynamic** | Email → embedded wallet → Flow $1 pay-anything | "Walletless users get a full DeFi stack in one login." |
| **Uniswap** | Social + on-chain agreement labels; tokenized equity badge; live Sepolia swap | "Trending means chatter *and* liquidity agree." |
| **ENS** | Mainnet subname + `com.chatter.brief` verifiable in official ENS app | "No user DB — your research lives on your name." |
| **Product** | PyQt → web; real pipeline, honest cached demo | "Extend Open Source: we shipped a monetized web layer on last30days." |

---

## Challenges overcome (for judges / submission copy)

1. **Dynamic Flow** — Headless SDK didn't share auth with React SDK → server-side REST checkout + client `dct_` session token. WAF/SSL fixes on Python checkout creation.
2. **Dynamic WaaS** — Custom `createWalletAccount` raced connectors → removed; SDK built-in auto-create.
3. **Uniswap data** — No key-authenticated market-data REST → gateway GraphQL + 60s server cache.
4. **Uniswap testnet** — Base Sepolia unusable for swaps → probed chains; Sepolia WETH→UNI only liquid pair; wrap ETH client-side.
5. **Tokenized equities** — API returns `Forbidden: Token is blocked` → quote-only UX by design.
6. **ENS Sepolia dead end** — v1 registration closed → mainnet parent `chatterchatter.eth`, wallet-derived subnames.
7. **Demo reliability** — Pre-indexed cache + simulated progress bar so live scrape never blocks a judge demo.

---

## Judging talking points (live finalist — prep later)

**60-second pitch:** Pay → Research → Act. Social mindshare meets on-chain momentum. No user database — ENS owns the receipt.

**If asked "is the research live?"**  
"We replay pre-indexed output built by the same pipeline (`build_demo_cache.py`). Live mode is `NEXT_PUBLIC_RESEARCH_LIVE=true`. The progress bar paces cached loads — honest in the video."

**If asked "why that ENS name?"**  
"Deterministic from your wallet — `u` + first 8 hex chars. It's a receipt ID you own on mainnet, not a vanity registrar."

**If asked "why three chains?"**  
"Base Sepolia for Flow paywall, Ethereum Sepolia for Uniswap swap liquidity, Ethereum mainnet for ENS — each integration's real network."

**If asked about AI:**  
"Cursor helped implement from our PRD and plan docs. **Gemini** is in the product — it summarizes scrape output. The *idea* is our existing open-source GTM tool, not LLM-generated."

**Partner file map:** `api/ens.py` (ENS), `web/lib/flow.ts` + `api/main.py` checkout (Dynamic), `api/uniswap_data.py` + `web/lib/uniswapSwap.ts` (Uniswap).

---

## Build / refresh cache

```bash
# Requires last30days-skill, Python 3.12+, GEMINI_API_KEY in repo .env
python scripts/build_demo_cache.py
```

Writes `api/demo_cache/<slug>.json` (markdown) and `<slug>.summary.json` (Gemini).

---

## Run locally

```bash
# terminal 1
uvicorn api.main:app --port 8765

# terminal 2
cd web && npm run dev
```

### Recording flow

1. Sign in, complete $1 paywall once (or skip via localStorage — see below).
2. **Load demo keywords** or **Run demo** (one click).
3. Inline progress bar (~10s) → topic cards → asset cards with swap.
4. Optional: **Research receipt** on a topic.
5. Scroll to **EnsReceipt** → ENS app link.

---

## Env vars (`web/.env.local`)

| Variable | Default | Meaning |
|----------|---------|---------|
| `NEXT_PUBLIC_RESEARCH_LIVE` | `false` | `true` = live last30days per request |
| `NEXT_PUBLIC_SIMULATE_RESEARCH_MS` | `10000` | Cached run progress duration; `0` = instant |

---

## Demo state between takes

Unlock is stored in browser `localStorage` per wallet address.

**Skip paywall** (no new Flow tx):

```js
localStorage.setItem('chatter:paid:' + '<your-address>'.toLowerCase(), '1')
```

**Re-run payment** (new Flow tx for recording):

- Local dev: click **Reset payment (demo)** on the keyword screen.
- Console:

```js
localStorage.removeItem('chatter:paid:' + '<your-address>'.toLowerCase())
localStorage.removeItem('chatter:ens:' + '<your-address>'.toLowerCase())
localStorage.removeItem('chatter:lastPaymentTx:' + '<your-address>'.toLowerCase())
```

Each real payment needs ~$1 USDC on Base Sepolia. After payment, the receipt shows a Base Sepolia explorer link before keyword entry.

---

## Submission checklist (after video)

1. Granular git commits + push
2. EXPLAINER.md + README + project page screenshots
3. `docs/SUBMISSION_TXIDS.md` + `docs/UNISWAP_FEEDBACK.md` + Uniswap feedback form
4. Deploy (finalist requirement — last step)
