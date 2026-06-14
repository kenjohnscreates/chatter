# Chatter — integration explainer

**Demo path:** sign in → pay $1 → run research → topic + asset cards → swap (crypto) → ENS receipt at bottom.

**Live app:** [chatterethglobal.vercel.app](https://chatterethglobal.vercel.app)

**On-chain proof:** [docs/SUBMISSION_TXIDS.md](docs/SUBMISSION_TXIDS.md)

---

## Product — Pay → Research → Act

Chatter is an open-source GTM mindshare tool (PyQt desktop app wrapping [last30days-skill](https://github.com/mvanhorn/last30days-skill)). For ETHGlobal NYC we extended it into a monetized web app: users pay once, run keyword research across social sources, get AI trend briefs, see tradable assets with on-chain momentum, optionally swap on testnet, and own the result on an ENS name. **Chatter has no user database** — wallet login, payment receipts, and research briefs live on-chain or in the client.

**Continuity (Extend Open Source):** same research pipeline (`core/research.py`, `scripts/build_demo_cache.py`), new `api/` + `web/` layers. Demo replays pre-indexed cache for reliability; live scrape is one env flag away.

---

## Dynamic — embedded wallets + Flow paywall

**What was built:** Email/social or external-wallet login via Dynamic; embedded wallets are created automatically for users without one. A **$1 Fireblocks Flow** checkout on **Base Sepolia** gates research — pay with supported assets, Flow settles to USDC. Server creates checkout configs (API key never in browser); client completes the transaction with the user's Dynamic session.

**Why it matters:** Walletless users get the full stack (pay → research → swap → ENS) from a single login — the "Wallet Glow Up" from desktop PyQt to web.

**Files:** `web/components/DynamicLogin.tsx`, `web/lib/flow.ts`, `web/components/Paywall.tsx`, `web/components/PaymentReceipt.tsx`, `api/main.py` (checkout REST routes)

**Submission writeup (Dynamic):**  
Chatter uses Dynamic for auth and embedded wallets so anyone can sign in with email and immediately get an address for Base Sepolia payments, Sepolia swaps, and ENS ownership. Flow checkout unlocks each research run; hit real WAF/SSL and WaaS race conditions during integration and documented fixes in the repo. Payment success unlocks research and triggers ENS subname minting.

---

## Uniswap — market data + testnet swap

**What was built:** Server-side Uniswap data gateway (GraphQL) resolves tickers to tokens, fetches 24h volume and price change, discovers **tokenized equities** (Tesla, NVIDIA, etc.), and pairs social mindshare with on-chain momentum on asset cards. Swap execution uses the **Uniswap Trading API** from the embedded wallet on **Ethereum Sepolia** (WETH→UNI — the only liquid testnet pair found). Tokenized equities are quote/display only when the API blocks execution (v4 compliance).

**Why it matters:** Trending is not just chatter — labeled when social and on-chain signals agree ("confirmed trend" vs narrative-only vs quiet accumulation).

**Files:** `api/uniswap_data.py`, `web/lib/uniswapSwap.ts`, `web/components/SwapButton.tsx`, `web/components/AssetCard.tsx`  
**Feedback log:** [docs/UNISWAP_FEEDBACK.md](docs/UNISWAP_FEEDBACK.md)

**Submission writeup (Uniswap):**  
Chatter maps Gemini-extracted tickers to Uniswap market data and renders agreement labels between social and on-chain momentum. Execute real testnet swaps via check_approval → Permit2 → quote → swap (proxied through Cloud Run in production), with txids in SUBMISSION_TXIDS. Logged API gaps (no key-authenticated market REST, Base Sepolia routing dead ends, equity pool blocks) in UNISWAP_FEEDBACK per the team's on-site request.

---

## ENS — subnames + research brief on mainnet

**What was built:** On payment, the server mints a deterministic subname under **chatterchatter.eth** on **Ethereum mainnet** (e.g. `u4dd10ee5.chatterchatter.eth` from wallet address). After research, the Gemini brief is written to **`com.chatter.brief`** via PublicResolver, then wrapped ownership transfers to the user. UI resolves records live — nothing hard-coded.

**Why it matters:** ENS is the account and receipt layer; research portability without a Chatter backend user table.

**Files:** `api/ens.py`, `web/lib/ens.ts`, `web/components/EnsReceipt.tsx`, `api/main.py` (`/ens/mint`, `/ens/brief`)

**Note:** Sepolia v1 registration was closed during the event; shipped mainnet v1 NameWrapper instead of v2 alpha or CCIP.

**Submission writeup (ENS):**  
Chatter mints mainnet subnames under chatterchatter.eth when users pay, publishes their research brief to com.chatter.brief, and transfers ownership so the result is verifiable in the official ENS app. Subnames are wallet-derived receipts, not vanity picks. Server signer publishes records so users don't need mainnet ETH for the write path.

---

## Gemini — in-product AI (not a prize claim)

Raw scrape markdown from last30days is summarized into themes, sentiment, momentum score, and suggested tickers (`api/gemini.py`). Outputs are cached beside demo data for fast, honest demos.

**File:** `api/gemini.py`

---

## AI tools used to build Chatter

| Tool | Role |
|------|------|
| **Cursor** | Implementation from directed specs ([docs/PRD.md](docs/PRD.md), [docs/HACKATHON_PLAN.md](docs/HACKATHON_PLAN.md), task prompts) |
| **Gemini** | Product feature — trend briefs and asset extraction from scrape output |
| **last30days-skill** | Open-source research engine (pre-existing; not LLM-generated) |

The product concept and architecture are ours; Cursor accelerated wiring sponsor SDKs and UI. Plan and PRD files in `docs/` are the auditable "directed AI" artifacts judges can read.

---

## File map (60-second judge scan)

| Partner | Primary files |
|---------|-----------------|
| Dynamic | `web/components/DynamicLogin.tsx`, `web/lib/flow.ts`, `web/components/Paywall.tsx`, `api/main.py` |
| Uniswap | `api/uniswap_data.py`, `web/lib/uniswapSwap.ts`, `web/components/SwapButton.tsx` |
| ENS | `api/ens.py`, `web/lib/ens.ts`, `web/components/EnsReceipt.tsx` |
| Research | `core/research.py`, `api/gemini.py`, `scripts/build_demo_cache.py` |
