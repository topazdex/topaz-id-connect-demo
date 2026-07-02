"use client";

import { useState, type ReactNode } from "react";
import { getAddress, isAddress, type Address } from "viem";
import { DEFAULT_SWAP_TOKEN_ADDRESS } from "@/lib/swap";
import { SwapCard } from "./swap-card";

export function SwapSection({ connectSlot }: { connectSlot: ReactNode }) {
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
      <SwapCard key={tokenAddress} tokenAddress={tokenAddress} connectSlot={connectSlot} />
    </div>
  );
}
