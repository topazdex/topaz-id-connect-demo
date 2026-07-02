"use client";

import {
  avatarForWallet,
  displayNameForWallet,
  shortenAddress,
} from "@topazdex/id-connect";
import {
  useTopazIdClient,
  useTopazIdLogin,
  useTopazIdProfile,
} from "@topazdex/id-connect/react";
import { useState } from "react";
import { parseEther } from "viem";
import { useAccount, useSendTransaction } from "wagmi";
import { NavShell } from "./nav";
import { SwapSection } from "./swap-section";
import { useHydrated } from "./use-hydrated";

const PROVIDER_SNIPPET = `// app/(minimal)/layout.tsx — one provider, no RainbowKit
import { TopazIdProvider } from "@topazdex/id-connect/react";

export default async function Layout({ children }) {
  const cookie = (await headers()).get("cookie");
  return <TopazIdProvider cookie={cookie}>{children}</TopazIdProvider>;
}`;

const HOOK_SNIPPET = `// any client component
import { useTopazIdLogin } from "@topazdex/id-connect/react";

const { login, logout, isPending } = useTopazIdLogin();
return <button onClick={login}>Sign in with Topaz ID</button>;`;

const CLIENT_SNIPPET = `// send through the smart wallet — no hand-rolled RPC
import { useTopazIdClient } from "@topazdex/id-connect/react";

const { data: topazClient } = useTopazIdClient();

await topazClient?.sendTransaction({ to, value: parseEther("0.01") });

// approval + action in ONE confirmation popup
await topazClient?.sendCalls({ calls: [approveCall, swapCall] });`;

function MinimalAccountButton() {
  const { address, isConnected } = useAccount();
  const { login, logout, isPending } = useTopazIdLogin();
  const { data: profile, isLoading: profileLoading } = useTopazIdProfile(address);
  const hydrated = useHydrated();

  if (!hydrated) {
    return <div className="account-button account-button--skeleton" />;
  }

  if (!isConnected || !address) {
    return (
      <button
        className="account-button account-button--connect"
        onClick={() => login()}
        disabled={isPending}
        type="button"
      >
        {isPending ? "Connecting…" : "Connect with Topaz ID"}
      </button>
    );
  }

  const label = profileLoading
    ? "Loading profile…"
    : displayNameForWallet(profile ?? null, address);
  const avatar = avatarForWallet(profile ?? null);

  return (
    <button
      className="account-button"
      onClick={() => logout()}
      title="Disconnect"
      type="button"
    >
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
}

function SwapConnectButton() {
  const { login, isPending } = useTopazIdLogin();
  const hydrated = useHydrated();

  return (
    <button
      className="btn swap-card__cta"
      onClick={() => login()}
      disabled={!hydrated || isPending}
      type="button"
    >
      {isPending ? "Connecting…" : "Connect to swap"}
    </button>
  );
}

export function MinimalDemo() {
  const { address, isConnected } = useAccount();
  const { login, isPending: loginPending } = useTopazIdLogin();
  const { data: profile } = useTopazIdProfile(address);
  const { data: topazClient } = useTopazIdClient();
  const { sendTransactionAsync, isPending: txPending } = useSendTransaction();

  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const hydrated = useHydrated();
  const connected = hydrated && isConnected && Boolean(address);

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
    <main className="page-shell">
      <NavShell accountSlot={<MinimalAccountButton />} />

      <section className="hero-shell">
        <div className="hero-copy">
          <p className="eyebrow">Lightweight path</p>
          <h1>Just Topaz ID. No wallet picker.</h1>
          <p>
            The same app, wired with <code>TopazIdProvider</code> and{" "}
            <code>useTopazIdLogin()</code> instead of RainbowKit. One provider sets up wagmi
            and React Query for you, and a single hook drives the consent popup — this route
            never bundles RainbowKit or any other connector.
          </p>
          <div className="hero-actions">
            <a className="text-link" href="https://www.npmjs.com/package/@topazdex/id-connect" target="_blank" rel="noreferrer">
              npm package ↗
            </a>
          </div>
        </div>

        <div className="install-card">
          <span>Provider</span>
          <pre className="snippet">{PROVIDER_SNIPPET}</pre>
        </div>
      </section>

      <section className="demo-panel">
        <div className="demo-panel__header">
          <p className="eyebrow">Live connector demo</p>
          <h1>Three lines to a signed-in user.</h1>
          <p>
            Use the account button in the nav to connect with Topaz ID, then this page reads
            the connected wallet, resolves the profile, and sends a transaction — all without
            RainbowKit on the page.
          </p>
        </div>

        <div className="demo-grid">
          <div className="feature-card">
            <span className="feature-card__icon">01</span>
            <h2>One provider</h2>
            <p>
              <code>TopazIdProvider</code> creates the wagmi config (BNB Chain + the Topaz ID
              connector) and a React Query client. No <code>createConfig</code>, no{" "}
              <code>QueryClientProvider</code>.
            </p>
          </div>
          <div className="feature-card">
            <span className="feature-card__icon">02</span>
            <h2>One hook</h2>
            <p>
              <code>useTopazIdLogin()</code> returns <code>login</code>, <code>logout</code>,
              and <code>isPending</code> — it finds the connector and opens the consent popup,
              no modal library required.
            </p>
          </div>
          <div className="feature-card">
            <span className="feature-card__icon">03</span>
            <h2>Same identity</h2>
            <p>
              <code>useTopazIdProfile()</code> resolves the user&apos;s Topaz ID name and avatar,
              exactly like the full demo — the nav pill updates the moment you connect.
            </p>
          </div>
        </div>

        <div className="install-card">
          <span>Hook</span>
          <pre className="snippet">{HOOK_SNIPPET}</pre>
        </div>

        <div className="install-card">
          <span>Smart-wallet client</span>
          <pre className="snippet">{CLIENT_SNIPPET}</pre>
        </div>

        <div className="action-card">
          <div>
            <h2>{connected ? "Try a wallet action" : "Connect to try it"}</h2>
            <p>
              {connected
                ? profile?.found === false
                  ? "Connected. This wallet has no Topaz ID profile yet, so the nav falls back to the address."
                  : "Connected through TopazIdProvider — the send below goes through useTopazIdClient's smart-wallet client, and wagmi hooks still work for reads."
                : "Click below (or the nav button) to open the Topaz ID consent popup. SSR keeps you connected across refresh via the request cookie."}
            </p>
          </div>

          {connected && address ? (
            <button className="btn" onClick={sendSelfTx} disabled={txPending} type="button">
              {txPending ? "Confirm in wallet…" : "Send 0 BNB to yourself"}
            </button>
          ) : (
            <button
              className="btn"
              onClick={() => login()}
              disabled={!hydrated || loginPending}
              type="button"
            >
              {loginPending ? "Connecting…" : "Connect with Topaz ID"}
            </button>
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

        <SwapSection connectSlot={<SwapConnectButton />} />

        <p className="swap-card__note">
          That swap card is the exact same component as the full demo — it runs through{" "}
          <code>TopazIdProvider</code> with no RainbowKit on the page. Want the multi-wallet
          picker (MetaMask, WalletConnect, Rainbow) instead? Switch to the{" "}
          <strong>Full picker</strong> route with the toggle in the nav.
        </p>
      </section>
    </main>
  );
}
