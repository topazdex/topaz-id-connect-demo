import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";
import { topazIdWallet, TOPAZ_ID_CHAIN } from "@topazdex/id-connect/connectors";
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

export const wagmiConfig = createConfig({
  chains: [TOPAZ_ID_CHAIN],
  transports: { [TOPAZ_ID_CHAIN.id]: http() },
  connectors,
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
