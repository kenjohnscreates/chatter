# Integration checks

Record of every "Verify before coding" item from [PRD.md](PRD.md). The build agent fills the Result column before writing code against that integration. Planning-session findings from 2026-10-15 are pre-filled.

| # | Integration | Check | Result | Date | Evidence |
|---|-------------|-------|--------|------|----------|
| 1 | Supabase | Sign in with Ethereum supported as Auth provider | VERIFIED | 2026-10-15 | https://supabase.com/docs/guides/auth/auth-web3 |
| 2 | Supabase | Org and existing projects identified; new project needed | VERIFIED | 2026-10-15 | org `rgaokjdjsmgddeihtgvl`, projects ample-ip-dev, ample-giveaway |
| 3 | Supabase | pg_cron and pg_net available on new project | PENDING | | |
| 4 | Vercel | Teams identified; AMPLE team id `team_reQXlL0CNPQuUXXfY5AInkKY` | VERIFIED | 2026-10-15 | Vercel MCP list_teams |
| 5 | Vercel | Next.js 16 route handler API confirmed from node_modules docs | PENDING | | |
| 6 | Stripe | Account, test keys, webhook secret | PENDING | | No Stripe tool in planning session |
| 7 | Bankr gateway | Base URL, auth header, credit model, 402 on zero credits | VERIFIED (secondary source) | 2026-10-15 | github.com/BankrBot/skills bankr/SKILL.md |
| 8 | Bankr gateway | `claude-opus-5-5` listed in `/v1/models` with price | PENDING | | |
| 9 | Bankr gateway | Anthropic-compatible path accepts `output_config.format` | PENDING | | |
| 10 | Bankr Wallet API | Endpoints for me, swap-quote, swap, idempotencyKey | VERIFIED (secondary source) | 2026-10-15 | same skill file |
| 11 | Bankr Wallet API | Deposit webhook exists | NOT FOUND | 2026-10-15 | No mention in skill file or search; design assumes none |
| 12 | $AMPD | Contract symbol, decimals, supply on Base | UNVERIFIED | 2026-10-15 | RPC blocked in planning environment |
| 13 | $AMPD | Address confirmed by official Ample source | PENDING | | |
| 14 | last30days | Source keys list and compact emit keeps URLs | PENDING | | |
| 15 | Droplet | Python 3.12+, outbound access, static IP | PENDING | | |
| 16 | GitHub | Repo `chatter-ample` created | BLOCKED | 2026-10-15 | GitHub app returned 403 on create; Kenny creates it |
