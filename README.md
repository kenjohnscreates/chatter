# Chatter

**See where the chatter is. Pay $1. Act on the trend.**

Chatter is a Go-To-Market mindshare tool: enter keywords, see where conversation lives across Reddit, HN, GitHub, Polymarket, and more! Act on trends with onchain data and swaps.

Built for **[ETHGlobal New York 2026](https://ethglobal.com/)** (Extend Open Source / Continuity). Partner integrations: **Dynamic**, **Uniswap**, **ENS**.

**Live demo:** [Loom](https://www.loom.com/share/51af84da07b84e2892fa58e55d2ea0d5)) · API: [Cloud Run](https://chatter-api-mzhygltoda-uc.a.run.app)

---

## Hackathon status

**Last updated:** June 2026 — **shipped and deployed** for ETHGlobal NYC submission.

| Milestone | Status |
|-----------|--------|
| FastAPI + demo cache + Gemini briefs | Done |
| Next.js web app (landing, research, dashboard) | Done |
| Dynamic login + embedded wallets | Done |
| Flow $1 paywall (Base Sepolia) | Done |
| Uniswap market data + tokenized equity badges | Done |
| Uniswap testnet swap (Sepolia WETH→UNI) | Done — [txids](docs/SUBMISSION_TXIDS.md) |
| ENS mainnet subnames (`*.chatterchatter.eth`) + brief records | Done — [txids](docs/SUBMISSION_TXIDS.md) |
| Demo video | Done |
| Production deploy (Vercel + Cloud Run) | Done — [docs/DEPLOY.md](docs/DEPLOY.md) |

**Quick links**

- [EXPLAINER.md](EXPLAINER.md) — one paragraph per integration (submission copy)
- [docs/SUBMISSION_TXIDS.md](docs/SUBMISSION_TXIDS.md) — Flow, Uniswap, and ENS transaction hashes
- [docs/DEPLOY.md](docs/DEPLOY.md) — Cloud Run + Vercel deploy steps
- [docs/UNISWAP_FEEDBACK.md](docs/UNISWAP_FEEDBACK.md) — API feedback for Uniswap team
- [docs/PRD.md](docs/PRD.md) — task breakdown and acceptance criteria
- [docs/USER_FLOW.md](docs/USER_FLOW.md) — screen-by-screen demo path

---

## Try the live app

1. Open [chatterethglobal.vercel.app](https://chatterethglobal.vercel.app)
2. Sign in with email (Dynamic embedded wallet)
3. Pay $1 on Base Sepolia → **Run demo** → asset cards → swap (Sepolia ETH) → ENS receipt

**Demo reset (same funded wallet):** DevTools → Application → Local Storage → delete `chatter:paid:*`, `chatter:ens:*`, `chatter:lastPaymentTx:*` for your address, then reload. Local dev has a **Reset payment (demo)** button.

**Pre-fund embedded wallet:** Base Sepolia USDC (~$1 per paywall run) + Ethereum Sepolia ETH (swap gas).

---

## Demo flow

1. **Sign in** — email/social or wallet (Dynamic creates embedded wallet)
2. **Pay $1** — Fireblocks Flow on Base Sepolia
3. **Run demo** — cached research from real pipeline (last30days → Gemini); ~10s progress bar is UX pacing only
4. **Dashboard** — topic cards + asset cards (social × on-chain momentum)
5. **Swap** — Sepolia WETH→UNI on verified crypto assets (equities quote-only)
6. **ENS receipt** — `u<wallet-hex>.chatterchatter.eth` with `com.chatter.brief` on mainnet

---

## Run locally

### API

```bash
pip install -r api/requirements.txt
# .env: GEMINI_API_KEY, DYNAMIC_*, UNISWAP_API_KEY, ENS_* (see .env.example)
uvicorn api.main:app --port 8765
```

### Web

```bash
cd web
cp .env.local.example .env.local   # Dynamic env ID, API URL, feature flags
npm install && npm run dev
```

Open http://localhost:3000. Use **Reset payment (demo)** on the keyword screen to re-record the paywall.

---

## Architecture

```
PyQt desktop (baseline)          Hackathon web layer
─────────────────────────          ────────────────────
last30days-skill  ──►  core/research.py  ──►  api/main.py  ◄──►  web/ (Next.js)
                              │                    │
                              ▼                    ├── Dynamic (auth + Flow)
                         api/gemini.py            ├── Uniswap (data + swap)
                         api/demo_cache/          └── ENS (mint + brief)
```

**Chains:** Base Sepolia (Flow), Ethereum Sepolia (swap), Ethereum mainnet (ENS parent `chatterchatter.eth`).

**Production:** Next.js on Vercel → FastAPI on Google Cloud Run (`chatter-eth-global`). Uniswap Trading API calls proxy through the API (server-side key).

---

## AI attribution

| What | How |
|------|-----|
| **Product idea** | Existing open-source GTM tool + hackathon PRD (not LLM-invented) |
| **Research engine** | [last30days-skill](https://github.com/mvanhorn/last30days-skill) |
| **Trend briefs** | **Gemini** in-product (`api/gemini.py`) |
| **Implementation** | **Cursor** agents directed by [docs/PRD.md](docs/PRD.md) and [docs/HACKATHON_PLAN.md](docs/HACKATHON_PLAN.md) |

We committed granular task history (~25 commits) per ETHGlobal guidance. Plan docs in `docs/` are the directed-AI artifacts.

---

## Desktop app (pre-hackathon baseline)

The original PyQt6 app still runs in parallel — parallel keyword research, skill bootstrap, settings UI.

```bash
python3 -m pip install -r requirements.txt
PYTHONPATH=. python3 main.py
```

Outputs also land under `~/Documents/Last30Days/` via the skill.

**Requirements:** Python 3.12+, `git`, `certifi` (TLS for scrape sources). Optional API keys documented in-app under Setup & sources.

---

## License

See repository license file. `last30days-skill` is a separate upstream dependency.
