"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  avatarForWallet,
  displayNameForWallet,
  shortenAddress,
} from "@topazdex/id-connect";
import { useTopazIdProfile } from "@topazdex/id-connect/react";
import { useAccount } from "wagmi";
import { ChainsPanel } from "./chains-panel";
import { NavShell } from "./nav";
import { SelfSend } from "./self-send";
import { SwapSection } from "./swap-section";

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

function ActionConnectButton() {
  return (
    <ConnectButton.Custom>
      {({ mounted, openConnectModal }) => (
        <button className="btn" onClick={openConnectModal} disabled={!mounted} type="button">
          Connect with Topaz ID
        </button>
      )}
    </ConnectButton.Custom>
  );
}

export function Demo() {
  return (
    <section className="demo-panel">
      <div className="demo-panel__header">
        <p className="eyebrow">Live connector demo</p>
        <h1>Topaz ID for any app on BNB, Robinhood, Base, Ethereum, or Arc.</h1>
        <p>
          Use the nav account button to connect with Topaz ID, then this sample dapp reads the
          connected wallet, resolves the user&apos;s Topaz ID profile, switches between the five
          supported chains, sends through the smart-wallet client, and swaps BNB for your
          project&apos;s token on BNB Chain.
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

      <ChainsPanel />

      <SwapSection connectSlot={<SwapConnectButton />} />

      <SelfSend
        connectSlot={<ActionConnectButton />}
        idleCopy="Use the account button in the top-right nav to open the wallet picker."
      />
    </section>
  );
}
