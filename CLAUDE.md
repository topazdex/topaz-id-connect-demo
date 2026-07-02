# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

A Next.js demo dapp showcasing **Topaz ID Connect** wallet integration on BNB Chain.

## Commands

- `yarn dev` — start dev server (Turbopack)
- `yarn build` — production build (Turbopack)
- `yarn start` — run production server
- `yarn typecheck` — `tsc --noEmit`; run this to verify changes (no test scripts configured)
- `yarn lint` — ESLint flat config (`eslint .`); `eslint.config.mjs` spreads `eslint-config-next/core-web-vitals`

Use **Yarn 4** (`packageManager` field, `yarn.lock`). Do not use npm or pnpm.

## Stack

- Next.js 16 (App Router, Turbopack default), React 19, TypeScript 5.6 (`strict: true`, target ES2021)
- Path alias `@/*` → `./*`
- Vanilla CSS with custom properties in `app/globals.css` — no Tailwind/PostCSS
- Wallet stack: `wagmi` + `viem` (pinned 2.52.0) + `@rainbow-me/rainbowkit`, configured in `lib/wagmi.ts`

## Topaz ID integration

- The demo ships **two integration styles** as parallel route groups; the root `app/layout.tsx` is provider-free (just `<html>`/`<body>` + global CSS) and each group supplies its own provider stack. `app/nav.tsx` holds the shared nav + the `/` ↔ `/minimal` mode toggle and is deliberately RainbowKit-free so the minimal route never bundles it.
  - **`app/(full)/` → `/`** (full RainbowKit multi-wallet picker): `app/(full)/layout.tsx` reads the request cookie and wraps children in `Providers` (`app/providers.tsx`). `@topazdex/id-connect` provides `topazIdWallet()` and `TOPAZ_ID_CHAIN` (imported from `@topazdex/id-connect/connectors`), wired into the picker in `lib/wagmi.ts`. UI in `app/demo.tsx`.
  - **`app/(minimal)/` → `/minimal`** (Topaz-ID-only, no RainbowKit): `app/(minimal)/layout.tsx` passes the cookie to `TopazIdProvider` (`app/minimal-providers.tsx`); `app/minimal-demo.tsx` connects with `useTopazIdLogin()` and reads identity with `useTopazIdProfile()`. Do not import RainbowKit (e.g. `ConnectButton`) into this route — that's the point of contrast.
- Identity via `useTopazIdProfile(address)` (from `@topazdex/id-connect/react`), used in both `app/demo.tsx` and `app/minimal-demo.tsx`.
- **Sends go through the smart-wallet client** (`@topazdex/id-connect` ≥ 0.4.0): `useTopazIdClient()` returns `{ data: client, isTopazId }`; `data` is `undefined` for non-Topaz wallets, so every send site branches `topazClient ? topazClient.sendTransaction(...) : <wagmi fallback>`. Keep that fallback — the full route lists other wallets. The client also exposes `sendCalls` (atomic batch, one popup) and `writeContract`; framework-agnostic apps would use `createTopazIdClient` from `@topazdex/id-connect/actions`. Pass `value` as a bigint and let the SDK format it — the Topaz popup requires a plain JSON number and rejects hex quantity strings (do not pre-encode `value`); that mismatch is why raw wagmi value-bearing sends fail.
- SSR is enabled: wagmi uses `cookieStorage`, and each route-group layout hydrates initial state from cookies (the full route via `cookieToInitialState()` in `Providers`; the minimal route via the `cookie` prop on `TopazIdProvider`). Preserve this flow when touching providers.

## Token swap integration

- `lib/swap.ts` holds Topaz contract addresses (SwapRouter, QuoterV2, CLFactory, WBNB, TOPAZ), minimal `parseAbi` ABIs, pool detection, and the multicall calldata builders. `app/swap-card.tsx` is the UI; the token it swaps comes in as a prop (the demo's `SwapSection` lets visitors paste any BEP-20 address, keyed so the card remounts per token).
- Direct CL route only: `exactInputSingle` at one tick spacing, wrapped in `multicall`. BNB→token sends native BNB (`value = amountIn` + `refundETH`); token→BNB swaps with `recipient = SwapRouter` then `unwrapWETH9` to the user (this recipient indirection is required for native BNB output — don't "simplify" it away).
- Execution paths in `app/swap-card.tsx`: with a Topaz ID connection (`useTopazIdClient().data` set), approval + swap go out as ONE `sendCalls` bundle (single consent popup, atomic) or a single `writeContract` when no approval is needed; for every other wallet the classic wagmi `writeContractAsync` approve-then-swap flow runs. Preserve both paths.
- Confirmation in `app/swap-card.tsx` is receipt-tolerant (`settleTx`): `waitForTransactionReceipt` with a 60s timeout, then balance/allowance refetches regardless — smart-wallet flows can return a hash `eth_getTransactionReceipt` never resolves, so never pin the UI on the receipt alone.
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

- `next.config.ts` carries an empty `turbopack: {}` config. Next 16 errors on a `webpack` config with no `turbopack` config, and Turbopack resolves the wallet libraries' optional/dynamic deps (`@react-native-async-storage`, `pino-pretty`, dynamic-require) cleanly — so the old webpack `ignoreWarnings` block is gone and isn't needed. Don't re-add a `webpack()` function unless you also intend to opt back out of Turbopack.
- SSR mount-gating goes through `useHydrated()` (`app/use-hydrated.ts`), a `useSyncExternalStore` hook that returns `false` on the server + first client render, then `true`. Use it instead of a `useState`+`useEffect(setMounted(true))` pattern — `eslint-config-next@16`'s `react-hooks/set-state-in-effect` rule rejects the latter.
