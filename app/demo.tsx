"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  avatarForWallet,
  displayNameForWallet,
  shortenAddress,
} from "@topazdex/id-connect";
import { useTopazIdClient, useTopazIdProfile } from "@topazdex/id-connect/react";
import { useState } from "react";
import { parseEther } from "viem";
import { useAccount, useSendTransaction } from "wagmi";
import { NavShell } from "./nav";
import { SwapSection } from "./swap-section";
import { useHydrated } from "./use-hydrated";

function ProfileAccountButton() {
  const { address } = useAccount();
  const { data: profile, isLoading: profileLoading } =
    useTopazIdProfile(address);

  return (
    <ConnectButton.Custom>
      {({ account, chain, mounted, openAccountModal, openChainModal, openConnectModal }) => {
        const ready = mounted;
        const connected = ready && account && chain && address;

        if (!ready) {
          return <div className="account-button account-button--skeleton" />;
        }

        if (!connected) {
          return (
            <button className="account-button account-button--connect" onClick={openConnectModal} type="button">
              Connect with Topaz ID
            </button>
          );
        }

        if (chain.unsupported) {
          return (
            <button className="account-button account-button--warning" onClick={openChainModal} type="button">
              Wrong network
            </button>
          );
        }

        const label = profileLoading
          ? "Loading profile…"
          : displayNameForWallet(profile ?? null, address);
        const avatar = avatarForWallet(profile ?? null);

        return (
          <button className="account-button" onClick={openAccountModal} type="button">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="account-button__avatar" src={avatar} alt="" />
            ) : (
              <span className="account-button__avatar account-button__avatar--fallback" />
            )}
            <span className="account-button__copy">
              <span className="account-button__name">{label}</span>
              <span className="account-button__address">{shortenAddress(address)}</span>
            </span>
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}

export function AppNav() {
  return <NavShell accountSlot={<ProfileAccountButton />} />;
}

function SwapConnectButton() {
  return (
    <ConnectButton.Custom>
      {({ mounted, openConnectModal }) => (
        <button
          className="btn swap-card__cta"
          onClick={openConnectModal}
          disabled={!mounted}
          type="button"
        >
          Connect to swap
        </button>
      )}
    </ConnectButton.Custom>
  );
}

export function Demo() {
  const { address, isConnected } = useAccount();
  const { data: profile } = useTopazIdProfile(address);
  const { data: topazClient } = useTopazIdClient();
  const { sendTransactionAsync, isPending } = useSendTransaction();

  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const connected = useHydrated() && isConnected && Boolean(address);

  const sendSelfTx = async () => {
    if (!address) return;
    setTxHash(null);
    setTxError(null);
    try {
      const hash = topazClient
        ? await topazClient.sendTransaction({ to: address, value: parseEther("0") })
        : await sendTransactionAsync({
            to: address,
            value: parseEther("0"),
            chainId: 56,
          });
      setTxHash(hash);
    } catch (err) {
      setTxError(err instanceof Error ? err.message : "Transaction failed");
    }
  };

  return (
    <section className="demo-panel">
      <div className="demo-panel__header">
        <p className="eyebrow">Live connector demo</p>
        <h1>Topaz ID for any BNB Chain app.</h1>
        <p>
          Use the nav account button to connect with Topaz ID, then this sample dapp can read the
          connected wallet, resolve the user&apos;s Topaz ID profile, show token balances, and swap
          BNB for your project&apos;s token through the Topaz SwapRouter.
        </p>
      </div>

      <div className="demo-grid">
        <div className="feature-card">
          <span className="feature-card__icon">01</span>
          <h2>Wallet login</h2>
          <p>
            Let users connect with Topaz ID using email or Google, while keeping a familiar wallet
            connector flow.
          </p>
        </div>
        <div className="feature-card">
          <span className="feature-card__icon">02</span>
          <h2>Profile-aware UI</h2>
          <p>
            Once connected, the account button uses the user&apos;s Topaz ID name and avatar instead of
            showing only a wallet address.
          </p>
        </div>
        <div className="feature-card">
          <span className="feature-card__icon">03</span>
          <h2>Token swap</h2>
          <p>
            Quote and swap BNB for your project&apos;s token through the Topaz SwapRouter — point an
            env var at your token contract and the swap card adapts.
          </p>
        </div>
      </div>

      <SwapSection connectSlot={<SwapConnectButton />} />

      <div className="action-card">
        <div>
          <h2>{connected ? "Try a wallet action" : "Connect to try it"}</h2>
          <p>
            {connected
              ? profile?.found === false
                ? "Connected. This wallet does not have a Topaz ID profile yet, so the nav falls back to the address."
                : topazClient
                  ? "Connected with Topaz ID — the button below sends through the smart-wallet client (useTopazIdClient). Other wallets fall back to plain wagmi."
                  : "Connected. Click the account pill in the nav to open account options like disconnect."
              : "Use the account button in the top-right nav to open the wallet picker."}
          </p>
        </div>

        {connected && address ? (
          <button className="btn" onClick={sendSelfTx} disabled={isPending} type="button">
            {isPending ? "Confirm in wallet…" : "Send 0 BNB to yourself"}
          </button>
        ) : (
          <ConnectButton.Custom>
            {({ mounted, openConnectModal }) => (
              <button className="btn" onClick={openConnectModal} disabled={!mounted} type="button">
                Connect with Topaz ID
              </button>
            )}
          </ConnectButton.Custom>
        )}
      </div>

      {txHash && (
        <a
          className="tx tx--ok"
          href={`https://bscscan.com/tx/${txHash}`}
          target="_blank"
          rel="noreferrer"
        >
          Sent — view on BscScan ↗
        </a>
      )}
      {txError && <p className="tx tx--err">{txError}</p>}
    </section>
  );
}
