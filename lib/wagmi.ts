import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { topazIdWallet, TOPAZ_ID_CHAIN } from "@topazdex/id-connect/rainbow-kit";
import { cookieStorage, createConfig, createStorage, http } from "wagmi";

const projectId =
  process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "YOUR_WALLETCONNECT_PROJECT_ID";

const connectors = connectorsForWallets(
  [
    { groupName: "Sign in", wallets: [topazIdWallet()] },
    {
      groupName: "Other wallets",
      wallets: [
        metaMaskWallet,
        walletConnectWallet,
        rainbowWallet,
        injectedWallet,
      ],
    },
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
