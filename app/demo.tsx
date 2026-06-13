"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  avatarForWallet,
  displayNameForWallet,
  shortenAddress,
} from "@topazdex/id-connect";
import { useTopazIdProfile } from "@topazdex/id-connect/react";
import { useEffect, useState } from "react";
import { getAddress, isAddress, parseEther, type Address } from "viem";
import { useAccount, useSendTransaction } from "wagmi";
import { DEFAULT_SWAP_TOKEN_ADDRESS } from "@/lib/swap";
import { SwapCard } from "./swap-card";

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
  return (
    <header className="topnav">
      <a className="brand" href="https://id.topazdex.com" target="_blank" rel="noreferrer">
        <span className="brand__mark">T</span>
        <span>
          <span className="brand__eyebrow">Topaz</span>
          <span className="brand__name">ID Demo</span>
        </span>
      </a>

      <nav className="navlinks" aria-label="Demo links">
        <a href="https://github.com/topazdex/topaz-id-connect" target="_blank" rel="noreferrer">
          Package
        </a>
        <a href="https://github.com/topazdex/topaz-id-connect-demo" target="_blank" rel="noreferrer">
          Demo repo
        </a>
        <a href="https://id.topazdex.com/developers" target="_blank" rel="noreferrer">
          Docs
        </a>
      </nav>

      <ProfileAccountButton />
    </header>
  );
}

function SwapSection() {
  const [tokenInput, setTokenInput] = useState("");
  const [tokenAddress, setTokenAddress] = useState<Address>(DEFAULT_SWAP_TOKEN_ADDRESS);
  const [tokenInputError, setTokenInputError] = useState<string | null>(null);

  const applyToken = () => {
    const trimmed = tokenInput.trim().toLowerCase();
    if (!isAddress(trimmed)) {
      setTokenInputError("That doesn't look like a valid BEP-20 contract address.");
      return;
    }
    setTokenAddress(getAddress(trimmed));
    setTokenInputError(null);
  };

  const resetToken = () => {
    setTokenAddress(DEFAULT_SWAP_TOKEN_ADDRESS);
    setTokenInput("");
    setTokenInputError(null);
  };

  return (
    <div className="swap-section">
      <div className="swap-section__copy">
        <p className="eyebrow">On-chain action</p>
        <h2>Swap BNB for your token.</h2>
        <p>
          A working BNB ↔ TOPAZ swap using the direct concentrated-liquidity route on the Topaz
          SwapRouter, with a live QuoterV2 quote, wallet balances, USD values and logos from
          Dexscreener, slippage protection, and the ERC-20 approval flow handled for you.
        </p>
        <p>
          In your own app, set <code>NEXT_PUBLIC_SWAP_TOKEN_ADDRESS</code> to your token&apos;s
          contract address — symbol, decimals, price, and logo are all resolved automatically.
          Try it live:
        </p>
        <div className="token-switcher">
          <input
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") applyToken();
            }}
            placeholder="Paste any BEP-20 token address…"
            spellCheck={false}
            autoComplete="off"
            aria-label="Token contract address"
          />
          <button className="btn btn--secondary" onClick={applyToken} type="button">
            Use token
          </button>
        </div>
        {tokenInputError && <p className="tx tx--err">{tokenInputError}</p>}
        {tokenAddress !== DEFAULT_SWAP_TOKEN_ADDRESS && (
          <p className="token-switcher__active">
            Swapping <code>{tokenAddress}</code>{" "}
            <button className="text-link token-switcher__reset" onClick={resetToken} type="button">
              Reset to default
            </button>
          </p>
        )}
      </div>
      <SwapCard key={tokenAddress} tokenAddress={tokenAddress} />
    </div>
  );
}

export function Demo() {
  const { address, isConnected } = useAccount();
  const { data: profile } = useTopazIdProfile(address);
  const { sendTransactionAsync, isPending } = useSendTransaction();

  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  // Connection state can differ between SSR and first client render; gate on
  // mount so hydration always sees the disconnected markup on both sides.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const connected = mounted && isConnected && Boolean(address);

  const sendSelfTx = async () => {
    if (!address) return;
    setTxHash(null);
    setTxError(null);
    try {
      const hash = await sendTransactionAsync({
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

      <SwapSection />

      <div className="action-card">
        <div>
          <h2>{connected ? "Try a wallet action" : "Connect to try it"}</h2>
          <p>
            {connected
              ? profile?.found === false
                ? "Connected. This wallet does not have a Topaz ID profile yet, so the nav falls back to the address."
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
