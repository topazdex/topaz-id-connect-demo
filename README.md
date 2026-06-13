# Topaz ID Connect — Demo

A minimal Next.js (App Router) dapp showing one-click **Topaz ID** login on BNB
Chain using [`@topazdex/id-connect`](https://www.npmjs.com/package/@topazdex/id-connect).

It demonstrates the four things most integrators need:

1. **Connect** — Topaz ID in the RainbowKit picker (`topazIdWallet`).
2. **Identity** — render the user's Topaz ID name + avatar with
   `useTopazIdProfile` instead of a bare address.
3. **Sign** — send a transaction through the Topaz ID consent popup
   (`useSendTransaction`).
4. **Swap** — a working BNB ↔ TOPAZ token swap through the Topaz
   SwapRouter, with a live quote, balances, slippage, and the ERC-20
   approval flow.

## Run it

```bash
yarn install
cp .env.local.example .env.local   # add a WalletConnect (Reown) project id
yarn dev
```

Open http://localhost:3000.

> RainbowKit's `connectorsForWallets` requires a WalletConnect (Reown) project
> id — get one free at [cloud.reown.com](https://cloud.reown.com). The Topaz ID
> connector itself uses a popup flow and does **not** use WalletConnect, but the
> value is still required by RainbowKit's config.

## Where the integration lives

| File | What it shows |
| --- | --- |
| [`lib/wagmi.ts`](lib/wagmi.ts) | `topazIdWallet()` + `TOPAZ_ID_CHAIN` in a wagmi config |
| [`app/providers.tsx`](app/providers.tsx) | `WagmiProvider` + React Query + `RainbowKitProvider` |
| [`app/layout.tsx`](app/layout.tsx) | SSR hydration via `cookieToInitialState` |
| [`app/demo.tsx`](app/demo.tsx) | `ConnectButton`, `useTopazIdProfile`, `useSendTransaction` |
| [`lib/swap.ts`](lib/swap.ts) | Topaz contract addresses, ABIs, pool detection, swap calldata builders |
| [`lib/dexscreener.ts`](lib/dexscreener.ts) | USD prices + token logos from the Dexscreener API |
| [`app/swap-card.tsx`](app/swap-card.tsx) | Live quote (QuoterV2), balances, USD values, approve + swap flow |

## The swap card

The swap defaults to **BNB ↔ TOPAZ** through the direct
concentrated-liquidity route on the Topaz `SwapRouter`
(`exactInputSingle` wrapped in `multicall`):

- **BNB → token** sends native BNB (`value = amountIn`, `refundETH` for
  dust) — no approval needed.
- **Token → BNB** swaps to the router and `unwrapWETH9` pays out native
  BNB — the card surfaces the ERC-20 `approve` step first when the
  allowance is too low.
- Quotes come from `QuoterV2.quoteExactInputSingle` and refresh every
  10 seconds; `amountOutMinimum` enforces the selected slippage
  (0.5% / 1% / 3%).
- BNB and token balances refresh automatically after each confirmed
  transaction.
- USD values, token prices, and logos come from the free
  [Dexscreener API](https://docs.dexscreener.com/api/reference) (the
  most-liquid pair where the token is the base side), refreshed every
  minute. No API key needed.
- The WBNB/&lt;token&gt; pool is auto-detected on the Topaz `CLFactory`
  across the standard tick spacings (200, 100, 50, 2000, 1).

### Make it swap your token

Most projects want their own token swappable in their dapp. The demo
has a "paste any BEP-20 token address" input so you can see the card
adapt live — symbol and decimals are read on-chain, price and logo come
from Dexscreener, and the pool is auto-detected.

In your own app, just set one env var:

```bash
# your token's BEP-20 contract address (default: TOPAZ)
NEXT_PUBLIC_SWAP_TOKEN_ADDRESS=0xYourToken

# optional: pin a specific tick spacing instead of auto-detecting
# NEXT_PUBLIC_SWAP_TICK_SPACING=200
```

Your token needs a WBNB concentrated-liquidity pool on
[Topaz](https://topazdex.com) — the card shows a clear message if none
exists.

## License

MIT
