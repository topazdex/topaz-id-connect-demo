"use client";

import { isTopazIdGasSponsored, topazIdChainInfo } from "@topazdex/id-connect";
import { useTopazIdClient, useTopazIdProfile } from "@topazdex/id-connect/react";
import { useState, type ReactNode } from "react";
import { useAccount, usePublicClient, useSendTransaction } from "wagmi";
import { useHydrated } from "./use-hydrated";

type Outcome = "confirming" | "confirmed" | "reverted" | "unresolved";

type Settled = { outcome: Outcome; link: `0x${string}` };

const OUTCOME_LABEL: Record<Outcome, string> = {
  confirming: "Sent — waiting for confirmation…",
  confirmed: "Confirmed",
  reverted: "Reverted",
  unresolved: "Sent — receipt not resolved yet",
};

// RainbowKit-free: shared by the full and the minimal route. Sends go through
// the Topaz ID smart-wallet client when connected with Topaz ID and fall back
// to plain wagmi for every other wallet.
export function SelfSend({
  connectSlot,
  idleCopy,
}: {
  connectSlot: ReactNode;
  idleCopy: string;
}) {
  const { address, chainId, isConnected } = useAccount();
  const { data: profile } = useTopazIdProfile(address);
  const { data: topazClient } = useTopazIdClient();
  const { sendTransactionAsync, isPending } = useSendTransaction();
  const publicClient = usePublicClient();

  const [tx, setTx] = useState<{ hash: `0x${string}`; outcome: Outcome } | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const connected = useHydrated() && isConnected && Boolean(address);
  const chain = topazIdChainInfo(chainId);
  const currency = chain?.nativeCurrency ?? "native token";
  const explorer = chain?.explorerUrl ?? "https://bscscan.com";

  // A Topaz ID send can return a UserOperation hash instead of a transaction
  // hash; waitForReceipt resolves either and reports the operation's own
  // outcome. Other wallets use viem's plain receipt wait.
  const settle = async (hash: `0x${string}`): Promise<Settled> => {
    if (topazClient) {
      const receipt = await topazClient.waitForReceipt(hash, { timeout: 60_000 });
      if (!receipt) return { outcome: "unresolved", link: hash };
      return {
        outcome: receipt.status === "0x1" ? "confirmed" : "reverted",
        link: receipt.transactionHash,
      };
    }
    if (!publicClient) return { outcome: "unresolved", link: hash };
    try {
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
      return { outcome: receipt.status === "success" ? "confirmed" : "reverted", link: hash };
    } catch {
      return { outcome: "unresolved", link: hash };
    }
  };

  const sendSelfTx = async () => {
    if (!address) return;
    setTx(null);
    setTxError(null);
    try {
      const hash = topazClient
        ? await topazClient.sendTransaction({ to: address, value: 0n })
        : await sendTransactionAsync({ to: address, value: 0n });
      setTx({ hash, outcome: "confirming" });
      const { outcome, link } = await settle(hash);
      setTx({ hash: link, outcome });
    } catch (err) {
      setTxError(err instanceof Error ? err.message : "Transaction failed");
    }
  };

  let copy = idleCopy;
  if (connected) {
    if (profile?.found === false) {
      copy =
        "Connected. This wallet has no Topaz ID profile yet, so the nav falls back to the address.";
    } else if (topazClient) {
      copy = `Connected with Topaz ID on ${chain?.name ?? "an unsupported chain"}. ${
        isTopazIdGasSponsored(chainId)
          ? "Gas is sponsored by Topaz ID here, so the send below costs nothing."
          : `The smart wallet pays gas in ${currency} here, so it needs a small ${currency} balance first.`
      } The button sends through the smart-wallet client (useTopazIdClient) and confirms with waitForReceipt.`;
    } else {
      copy = "Connected with another wallet — the send below falls back to plain wagmi.";
    }
  }

  return (
    <>
      <div className="action-card">
        <div>
          <h2>{connected ? "Try a wallet action" : "Connect to try it"}</h2>
          <p>{copy}</p>
        </div>

        {connected && address ? (
          <button
            className="btn"
            onClick={sendSelfTx}
            disabled={isPending || tx?.outcome === "confirming"}
            type="button"
          >
            {isPending
              ? "Confirm in wallet…"
              : tx?.outcome === "confirming"
                ? "Confirming…"
                : `Send 0 ${currency} to yourself`}
          </button>
        ) : (
          connectSlot
        )}
      </div>

      {tx && (
        <a
          className={tx.outcome === "reverted" ? "tx tx--err" : "tx tx--ok"}
          href={`${explorer}/tx/${tx.hash}`}
          target="_blank"
          rel="noreferrer"
        >
          {OUTCOME_LABEL[tx.outcome]} — view on {chain?.name ?? "the explorer"} ↗
        </a>
      )}
      {txError && <p className="tx tx--err">{txError}</p>}
    </>
  );
}
