# Topaz ID Connect — Demo

A minimal Next.js (App Router) dapp showing one-click **Topaz ID** login on BNB
Chain using [`@topazdex/id-connect`](https://www.npmjs.com/package/@topazdex/id-connect).

It demonstrates the three things most integrators need:

1. **Connect** — Topaz ID in the RainbowKit picker (`topazIdWallet`).
2. **Identity** — render the user's Topaz ID name + avatar with
   `useTopazIdProfile` instead of a bare address.
3. **Sign** — send a transaction through the Topaz ID consent popup
   (`useSendTransaction`).

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

## License

MIT
