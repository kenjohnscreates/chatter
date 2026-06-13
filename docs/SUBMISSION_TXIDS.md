# Submission transaction IDs

On-chain transactions produced by Chatter during the hackathon, for sponsor
prize verification (Uniswap requires real txids demonstrating onchain execution).

## Uniswap Trading API — swap execution (T10)

- Chain: **Ethereum Sepolia** (chainId 11155111)
- Pair: **WETH → UNI** (only Sepolia pair with Trading API liquidity — see
  `docs/UNISWAP_FEEDBACK.md`)
- Flow: `POST /check_approval` → ERC-20 approve to Permit2 → `POST /quote` →
  EIP-712 Permit2 signature → `POST /swap` → send tx from the Dynamic embedded wallet.

Swapper: `0xD428294070595052d9E0607f28CDf51b52156d2A` (test wallet), input 0.001 WETH → 0.0211 UNI.

| Date | Step | Tx hash | Explorer |
|------|------|---------|----------|
| 2026-06-13 | **Swap** (WETH→UNI) | `0x933cab9d2cd00987152ccc9b49f2ced9aa8fb0bfb165bbe405457dde85242186` | https://sepolia.etherscan.io/tx/0x933cab9d2cd00987152ccc9b49f2ced9aa8fb0bfb165bbe405457dde85242186 |
| 2026-06-13 | Permit2 approve (WETH) | `0xce2873aa0134b00c1ad663d49e38b0da854199c256ee059d1ad9449feadaa935` | https://sepolia.etherscan.io/tx/0xce2873aa0134b00c1ad663d49e38b0da854199c256ee059d1ad9449feadaa935 |
| 2026-06-13 | Wrap ETH→WETH | `0xb7d720e13802bb1498eec15b5acace86e3dde8b6173ac13a9c7ed4979268b4a0` | https://sepolia.etherscan.io/tx/0xb7d720e13802bb1498eec15b5acace86e3dde8b6173ac13a9c7ed4979268b4a0 |

The swap above was produced by running the exact `web/lib/uniswapSwap.ts` pipeline
(`check_approval → quote → Permit2 EIP-712 signature → swap → broadcast`). In the app
the identical functions run from `SwapButton`, signed by the user's Dynamic embedded
wallet. To reproduce from the UI: log in (Dynamic email OTP), fund the embedded wallet
with Sepolia ETH, then click **Swap 0.001 WETH** on any verified crypto asset card.

> Append rows as swaps land. Explorer base: https://sepolia.etherscan.io/tx/&lt;hash&gt;
