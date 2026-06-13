# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

A Next.js demo dapp showcasing **Topaz ID Connect** wallet integration on BNB Chain.

## Commands

- `yarn dev` — start dev server
- `yarn build` — production build
- `yarn start` — run production server
- `yarn typecheck` — `tsc --noEmit`; run this to verify changes (no test scripts configured)
- `yarn lint` — ESLint via `next lint` (`next/core-web-vitals`)

Use **Yarn 4** (`packageManager` field, `yarn.lock`). Do not use npm or pnpm.

## Stack

- Next.js 15 (App Router), React 19, TypeScript 5.6 (`strict: true`, target ES2021)
- Path alias `@/*` → `./*`
- Vanilla CSS with custom properties in `app/globals.css` — no Tailwind/PostCSS
- Wallet stack: `wagmi` + `viem` (pinned 2.52.0) + `@rainbow-me/rainbowkit`, configured in `lib/wagmi.ts`

## Topaz ID integration

- `@topazdex/id-connect` provides `topazIdWallet()` and `TOPAZ_ID_CHAIN` (imported from `@topazdex/id-connect/rainbow-kit`), wired into the RainbowKit picker in `lib/wagmi.ts`.
- Identity via `useTopazIdProfile(address)` (from `@topazdex/id-connect/react`), used in `app/demo.tsx`.
- SSR is enabled: wagmi uses `cookieStorage`, and `app/layout.tsx` hydrates initial state from cookies via `cookieToInitialState()`. Preserve this flow when touching providers.

## Token swap integration

- `lib/swap.ts` holds Topaz contract addresses (SwapRouter, QuoterV2, CLFactory, WBNB, TOPAZ), minimal `parseAbi` ABIs, pool detection, and the multicall calldata builders. `app/swap-card.tsx` is the UI; the token it swaps comes in as a prop (the demo's `SwapSection` lets visitors paste any BEP-20 address, keyed so the card remounts per token).
- Direct CL route only: `exactInputSingle` at one tick spacing, wrapped in `multicall`. BNB→token sends native BNB (`value = amountIn` + `refundETH`); token→BNB swaps with `recipient = SwapRouter` then `unwrapWETH9` to the user (this recipient indirection is required for native BNB output — don't "simplify" it away).
- The WBNB/<token> pool is auto-detected via `detectSwapPool()` (first existing pool in tick-spacing preference order 200, 100, 50, 2000, 1); `NEXT_PUBLIC_SWAP_TICK_SPACING` pins one instead.
- Quotes use `QuoterV2.quoteExactInputSingle` via wagmi `useSimulateContract` (the quoter is intentionally non-view; it cannot be called with `useReadContract`).
- Slippage is enforced via `amountOutMinimum` — never 0.
- `lib/dexscreener.ts` fetches USD price + logo from the public Dexscreener `token-pairs/v1/bsc` endpoint (no API key), picking the most-liquid pair where the token is the base side. WBNB's top pair often has no image, hence the hardcoded `BNB_LOGO_URL` fallback.
- Layout gotcha: the swap card lives in a CSS grid and several children render `white-space: nowrap` content (balances, chips, detail rows). The `min-width: 0` rules on `.swap-card`, `.swap-card > *`, and `.swap-field > *` stop intrinsic min-content widths from overflowing the column — keep them when restyling.

## Environment

- `NEXT_PUBLIC_WC_PROJECT_ID` (required) — WalletConnect/Reown project ID (free at https://cloud.reown.com). RainbowKit requires it even though Topaz ID uses a popup flow. See `.env.local.example`.
- `NEXT_PUBLIC_SWAP_TOKEN_ADDRESS` (optional) — default token paired against BNB in the swap card; defaults to TOPAZ. Symbol/decimals are read on-chain; price/logo from Dexscreener.
- `NEXT_PUBLIC_SWAP_TICK_SPACING` (optional) — pins the WBNB/<token> CL pool tick spacing; unset means auto-detect across standard spacings.

## Gotchas

- `next.config.ts` intentionally silences harmless wallet-library build warnings via `config.ignoreWarnings` (`@react-native-async-storage`, `pino-pretty`, dynamic-require critical-dependency). These are expected — don't try to "fix" them.
