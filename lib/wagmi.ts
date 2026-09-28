import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";
import {
  arc,
  base,
  bsc,
  mainnet,
  robinhood,
  TOPAZ_ID_CHAINS,
} from "@topazdex/id-connect/chains";
import { topazIdWallet } from "@topazdex/id-connect/connectors";
import { cookieStorage, createConfig, createStorage, http } from "wagmi";

const projectId =
  process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "YOUR_WALLETCONNECT_PROJECT_ID";

// Installed browser wallets (MetaMask, Rabby, Rainbow, …) are surfaced
// automatically by wagmi's EIP-6963 discovery, so they are deliberately not
// listed here. Listing an injected wallet explicitly renders it a second time
// next to its discovered entry (the duplicate-wallet bug). Only WalletConnect,
// which is not an injected provider, is added by hand.
const connectors = connectorsForWallets(
  [
    { groupName: "Sign in", wallets: [topazIdWallet()] },
    { groupName: "Other wallets", wallets: [walletConnectWallet] },
  ],
  { appName: "Topaz ID Demo", projectId },
);

// Every chain Topaz ID supports. BNB Chain is first, so Topaz ID connects there
// (the swap card is BNB-only); the user can switch to any of the others. Use a
// subset in your own app if you only deploy to some of them.
export const wagmiConfig = createConfig({
  chains: TOPAZ_ID_CHAINS,
  transports: {
    [bsc.id]: http(),
    [robinhood.id]: http(),
    [base.id]: http(),
    [mainnet.id]: http(),
    [arc.id]: http(),
  },
  connectors,
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
