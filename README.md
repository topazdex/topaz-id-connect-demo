# Topaz ID Connect — Demo

A minimal Next.js (App Router) dapp showing one-click **Topaz ID** login on
BNB Chain, Robinhood Chain, Base, Ethereum, and Arc using
[`@topazdex/id-connect`](https://www.npmjs.com/package/@topazdex/id-connect).

It demonstrates the five things most integrators need:

1. **Connect** — Topaz ID in the RainbowKit picker (`topazIdWallet`).
2. **Identity** — render the user's Topaz ID name + avatar with
   `useTopazIdProfile` instead of a bare address.
3. **Chains** — every Topaz ID chain in one wagmi config (`TOPAZ_ID_CHAINS`),
   a switcher, and per-chain gas facts from `TOPAZ_ID_CHAIN_INFO` (Topaz
   sponsors gas on BNB Chain only).
4. **Send** — transactions go through the Topaz ID **smart-wallet client**
   (`useTopazIdClient`), confirmed with `waitForReceipt` (which also resolves
   UserOperation hashes), with plain wagmi (`useSendTransaction`) as the
   fallback for other wallets.
5. **Swap** — a working BNB ↔ TOPAZ token swap through the Topaz
   SwapRouter on BNB Chain, with a live quote, balances, slippage, and the
   ERC-20 approval flow — batched into a **single confirmation** (`sendCalls`)
   when connected with Topaz ID.

It ships **two integration styles**, switchable with the toggle in the nav:

- **`/` — Full picker:** Topaz ID alongside MetaMask, WalletConnect, and
  Rainbow in a RainbowKit multi-wallet picker (`lib/wagmi.ts` +
  `RainbowKitProvider`). Includes the swap card.
- **`/minimal` — Minimal:** just Topaz ID via `TopazIdProvider` +
  `useTopazIdLogin()` — one provider, one hook, no RainbowKit (this route
  doesn't even bundle it).

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

The root `app/layout.tsx` is provider-free; each route group owns its own
provider stack, so the two styles stay fully isolated.

**Full picker (`/`)**

| File | What it shows |
| --- | --- |
| [`lib/wagmi.ts`](lib/wagmi.ts) | `topazIdWallet()` (from `@topazdex/id-connect/connectors`) + all five `TOPAZ_ID_CHAINS` (from `@topazdex/id-connect/chains`) in a wagmi config |
| [`app/(full)/layout.tsx`](app/(full)/layout.tsx) | SSR hydration via `cookieToInitialState`, wrapping `Providers` |
| [`app/providers.tsx`](app/providers.tsx) | `WagmiProvider` + React Query + `RainbowKitProvider` |
| [`app/demo.tsx`](app/demo.tsx) | `ConnectButton` + `useTopazIdProfile` account pill, composing the shared panels below |
| [`app/chains-panel.tsx`](app/chains-panel.tsx) | The five chains with gas facts (`TOPAZ_ID_CHAIN_INFO`) and a `useSwitchChain` switcher — shared by both routes |
| [`app/self-send.tsx`](app/self-send.tsx) | `useTopazIdClient` send + `waitForReceipt` confirmation, chain-aware copy and explorer link, wagmi fallback — shared by both routes |
| [`lib/swap.ts`](lib/swap.ts) | Topaz contract addresses, ABIs, pool detection, swap calldata builders |
| [`lib/dexscreener.ts`](lib/dexscreener.ts) | USD prices + token logos from the Dexscreener API |
| [`app/swap-card.tsx`](app/swap-card.tsx) | Live quote (QuoterV2), balances, USD values, approve + swap — one batched confirmation on Topaz ID (`sendCalls`), classic two-step flow on other wallets |

**Minimal (`/minimal`)**

| File | What it shows |
| --- | --- |
| [`app/(minimal)/layout.tsx`](app/(minimal)/layout.tsx) | Passes the request cookie to `TopazIdProvider` for SSR |
| [`app/minimal-providers.tsx`](app/minimal-providers.tsx) | The entire setup: `<TopazIdProvider chains={TOPAZ_ID_CHAINS} cookie={cookie}>` |
| [`app/minimal-demo.tsx`](app/minimal-demo.tsx) | `useTopazIdLogin()` + `useTopazIdProfile()`, composing the same chains and send panels — no RainbowKit |
| [`app/nav.tsx`](app/nav.tsx) | Shared nav + the mode toggle (RainbowKit-free, used by both routes) |

## Chains

Topaz ID smart wallets run on five chains, and the wallet has the **same address
on each**. The demo lists all of them in its wagmi config (`TOPAZ_ID_CHAINS`,
BNB Chain first, so that's the chain Topaz ID connects on) and lets you switch
with a button; a real app lists just the chains it deploys to.

| Chain | Id | Gas |
| --- | --- | --- |
| BNB Chain | 56 | Sponsored by Topaz ID |
| Robinhood Chain | 4663 | Paid by the wallet in ETH |
| Base | 8453 | Paid by the wallet in ETH |
| Ethereum | 1 | Paid by the wallet in ETH |
| Arc | 5042 | Paid by the wallet in USDC |

`TOPAZ_ID_CHAIN_INFO` and `isTopazIdGasSponsored` (root entry) drive the copy:
on BNB Chain the send is free for the user, elsewhere the smart wallet needs a
small native balance for gas. The swap card is BNB-only and shows a
"Switch to BNB Chain" button on any other chain.

## Sending transactions (the smart-wallet client)

The connected Topaz ID account is a **smart contract wallet**, and the smoothest
way to transact with it is the high-level client that ships with
`@topazdex/id-connect`:

```tsx
import { useTopazIdClient } from "@topazdex/id-connect/react";

const { data: topazClient, isTopazId } = useTopazIdClient();

// single send — pass value as a bigint; the SDK formats it for the popup
const hash = await topazClient?.sendTransaction({ to, value: parseEther("0.01") });

// confirm — resolves UserOperation hashes and reports the operation's outcome
const receipt = await topazClient?.waitForReceipt(hash);

// approval + action in ONE consent popup, executed atomically
await topazClient?.sendCalls({
  calls: [approveCall, swapCall],
});
```

Two wire-format details the SDK hides (and why raw wagmi sends fail): the Topaz
popup accepts native `value` only as a plain JSON number — wagmi's hex encoding
is rejected, which is what breaks value-bearing transactions on raw connector
integrations. And if the popup rejects a `sendCalls` bundle, the SDK
automatically falls back to sequential sends (one popup per call); pass
`atomicRequired: true` to opt out.

`data` is `undefined` when the connected wallet isn't Topaz ID, so the drop-in
pattern for a multi-wallet dapp is exactly what this demo does everywhere:

```ts
const hash = topazClient
  ? await topazClient.sendTransaction({ to, value })
  : await sendTransactionAsync({ to, value }); // any other wallet
```

Framework-agnostic apps (no React) can do the same via `createTopazIdProvider`
from `@topazdex/id-connect/provider` and `createTopazIdClient` from
`@topazdex/id-connect/actions`. See the
[package README](https://github.com/topazdex/topaz-id-connect#sending-transactions)
for the full API.

## The swap card

The swap defaults to **BNB ↔ TOPAZ** through the direct
concentrated-liquidity route on the Topaz `SwapRouter`
(`exactInputSingle` wrapped in `multicall`):

- **BNB → token** sends native BNB (`value = amountIn`, `refundETH` for
  dust) — no approval needed.
- **Token → BNB** swaps to the router and `unwrapWETH9` pays out native
  BNB — when the allowance is too low, Topaz ID connections batch the
  ERC-20 `approve` + swap into **one confirmation** (`sendCalls`); other
  wallets get the classic two-step approve-then-swap flow.
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
