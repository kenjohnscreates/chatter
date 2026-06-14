# Deploy — Cloud Run (API) + Vercel (web)

T11: public URL for judges — login → cached research → dashboard → swap → ENS.

## Architecture

| Service | Host | Notes |
|---------|------|-------|
| `web/` | **Vercel** | Next.js; set `NEXT_PUBLIC_*` env vars |
| `api/` | **Google Cloud Run** | FastAPI; secrets via env / Secret Manager |

Point `NEXT_PUBLIC_API_BASE_URL` at the Cloud Run URL. Set `CORS_ALLOWED_ORIGINS` on the API to your Vercel origin(s).

---

## 1. API — Cloud Run

### Prerequisites

- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (`gcloud`)
- A GCP project with Cloud Run + Artifact Registry enabled
- Billing enabled (Cloud Run free tier may cover demo traffic)

### Build and deploy

```bash
export PROJECT_ID=your-gcp-project
export REGION=us-central1
export SERVICE=chatter-api

gcloud config set project "$PROJECT_ID"

# One-time: enable APIs
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com

# Build from repo root (clones last30days-skill inside the image)
gcloud builds submit --tag "gcr.io/${PROJECT_ID}/${SERVICE}" -f api/Dockerfile .

# Deploy (set secrets via --set-env-vars or Secret Manager in production)
gcloud run deploy "$SERVICE" \
  --image "gcr.io/${PROJECT_ID}/${SERVICE}" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "CORS_ALLOWED_ORIGINS=https://YOUR-VERCEL-APP.vercel.app" \
  --set-env-vars "GEMINI_API_KEY=...,UNISWAP_API_KEY=...,DYNAMIC_API_KEY=dyn_...,DYNAMIC_ENVIRONMENT_ID=...,CHATTER_TREASURY_ADDRESS=0x...,ENS_PARENT_NAME=chatterchatter.eth,ENS_RPC_URL=...,ENS_SIGNER_PRIVATE_KEY=0x..."
```

Copy the service URL (e.g. `https://chatter-api-xxxxx-uc.a.run.app`). Health check:

```bash
curl -s "https://YOUR-API-URL/assets?tickers=ETH" | head
```

### Env vars (API)

| Variable | Required | Notes |
|----------|----------|-------|
| `GEMINI_API_KEY` | Yes | Summarize + live research |
| `UNISWAP_API_KEY` | Yes | Market data |
| `DYNAMIC_API_KEY` | Yes | Server-only `dyn_` token |
| `DYNAMIC_ENVIRONMENT_ID` | Yes | Same as Dynamic dashboard |
| `CHATTER_TREASURY_ADDRESS` | Yes | Base Sepolia USDC recipient |
| `ENS_PARENT_NAME` | Yes | `chatterchatter.eth` |
| `ENS_SIGNER_PRIVATE_KEY` | Yes | Mainnet signer (never commit) |
| `ENS_RPC_URL` | Yes | Mainnet RPC |
| `CORS_ALLOWED_ORIGINS` | Prod | Comma-separated Vercel URL(s) |
| `DYNAMIC_API_BASE` | No | Default Dynamic API host |

**Security:** prefer [Secret Manager](https://cloud.google.com/run/docs/configuring/secrets) for `DYNAMIC_API_KEY` and `ENS_SIGNER_PRIVATE_KEY`.

### Local Docker smoke test

```bash
docker build -f api/Dockerfile -t chatter-api .
docker run --rm -p 8080:8080 --env-file .env chatter-api
curl -s localhost:8080/assets?tickers=ETH
```

---

## 2. Web — Vercel

### Prerequisites

- [Vercel CLI](https://vercel.com/docs/cli) or GitHub integration
- Dynamic dashboard: add production URL to allowed origins / redirect URLs

### Deploy

```bash
cd web
vercel link          # first time
vercel env add NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID
vercel env add NEXT_PUBLIC_API_BASE_URL    # Cloud Run URL, no trailing slash
vercel env add NEXT_PUBLIC_RESEARCH_LIVE   # false for demo
vercel env add NEXT_PUBLIC_SIMULATE_RESEARCH_MS  # 10000
vercel --prod
```

Or connect the GitHub repo in Vercel UI:

- **Root directory:** `web`
- **Framework:** Next.js (auto-detected)

### Env vars (web)

| Variable | Example | Notes |
|----------|---------|-------|
| `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` | from Dynamic dashboard | Public |
| `NEXT_PUBLIC_API_BASE_URL` | `https://chatter-api-….run.app` | Cloud Run URL |
| `NEXT_PUBLIC_RESEARCH_LIVE` | `false` | Cached demo for judges |
| `NEXT_PUBLIC_SIMULATE_RESEARCH_MS` | `10000` | Progress bar pacing |

`NEXT_PUBLIC_UNISWAP_API_KEY` — only if swap calls from browser need it (see `web/lib/uniswapSwap.ts`).

### Dynamic checklist

After deploy, update Dynamic environment:

- Allowed origins: `https://your-app.vercel.app`
- Redirect URLs if using OAuth providers

---

## 3. Post-deploy smoke test

1. Open Vercel URL → sign in (email OTP)
2. Pay $1 Flow on Base Sepolia → receipt link works
3. **Run demo** → topic + asset cards load
4. Swap on a crypto card (Sepolia ETH in embedded wallet)
5. ENS receipt resolves + **View in ENS app**

Record any new txids in [SUBMISSION_TXIDS.md](SUBMISSION_TXIDS.md).

---

## 4. Cut order if blocked

- **CORS errors** → set `CORS_ALLOWED_ORIGINS` exactly (scheme + host, no trailing slash)
- **Flow 502** → verify `DYNAMIC_API_KEY`, treasury address, Cloud Run egress
- **ENS 503** → `ENS_RPC_URL` + signer ETH on mainnet
- **Swap fails** → user needs Sepolia ETH; only WETH→UNI pair works on testnet

Demo path works with `NEXT_PUBLIC_RESEARCH_LIVE=false` — no live scrape required on Cloud Run.
