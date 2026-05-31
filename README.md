# Chatter

Chatter is a Go-To-Market tool that lets brands, individuals, or startups see where the "chatter" is for their keywords. Enter 5–20 keywords and get a report on which social platforms and projects hold mindshare over the past 30 days—so you can plan marketing and content around real trends.

Desktop app to run [last30days-skill](https://github.com/mvanhorn/last30days-skill) on multiple topics in parallel.

## Current status

**Last updated:** pre-hackathon baseline (May 2026)

This repo is the starting point for [ETHGlobal New York 2026](https://ethglobal.com/) under the **Extend Open Source** track. Hackathon work has **not started yet** — everything below describes what exists today vs. what will be added during the event.

### Shipped today (baseline)

| Component | Status |
|-----------|--------|
| Desktop app (PyQt6) | Working |
| Parallel keyword research | Up to 6 topics at once |
| Skill bootstrap | Auto-clones `last30days-skill` on first launch |
| Settings / setup UI | API key editor, source docs, diagnose |
| Web frontend (`web/`) | Not started |
| API layer (`api/`) | Not started |
| Web3 / wallet integration | Not started |

**Stack:** Python 3.12+, PyQt6, certifi. No blockchain dependencies in the codebase yet.

### Planned during hackathon

Wallet-connected web app: research keywords → AI trend brief → on-chain token prices → swap + publish to ENS.

Full plan: [docs/HACKATHON_PLAN.md](docs/HACKATHON_PLAN.md)

| Addition | Target prizes |
|----------|---------------|
| `web/` — Next.js frontend | — |
| `api/` — FastAPI service wrapping research + Gemini | Google Cloud |
| Dynamic SDK auth | Dynamic |
| ENS identity + trend brief text records | ENS |
| Chainlink price feeds + 1inch prices/swaps | Chainlink, 1inch |
| Cloud Run deploy | Google Cloud |

When hackathon work lands, this section will be updated to reflect completed milestones.

## Requirements

- Python 3.12+ (same interpreter used to run the app is offered to `last30days.py`; install 3.12+ on PATH)
- `git` (first launch clones the skill into `~/.local/share/chatter/last30days-skill`)
- **HTTPS:** `certifi` is required on many macOS Python installs (included in `requirements.txt`). Chatter passes `SSL_CERT_FILE` into the skill so Reddit/HN and other TLS calls verify correctly. Without it you may see empty results and `CERTIFICATE_VERIFY_FAILED` in stderr.
- **APIs:** Not required for Reddit, Hacker News, Polymarket, and GitHub (`gh`). Optional keys and tools (X, YouTube via `yt-dlp`, ScrapeCreators, Brave, …) are documented in the app under **Setup & sources** and in the skill README; edit **Settings…** for `~/.config/last30days/.env`.

## Run

```bash
cd /path/to/chatter
python3 -m pip install -r requirements.txt
PYTHONPATH=. python3 main.py
```

Outputs are also written under `~/Documents/Last30Days/` by the skill.
