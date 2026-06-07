"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  avatarForWallet,
  displayNameForWallet,
  shortenAddress,
} from "@topazdex/id-connect";
import { useTopazIdProfile } from "@topazdex/id-connect/react";
import { useState } from "react";
import { parseEther } from "viem";
import { useAccount, useSendTransaction } from "wagmi";

export function Demo() {
  const { address, isConnected } = useAccount();
  const { data: profile, isLoading: profileLoading } =
    useTopazIdProfile(address);
  const { sendTransactionAsync, isPending } = useSendTransaction();

  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

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

  const label = displayNameForWallet(profile ?? null, address ?? "");
  const avatar = avatarForWallet(profile ?? null);

  return (
    <div className="demo">
      <ConnectButton />

      {isConnected && address && (
        <div className="profile">
          <div className="profile__identity">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="profile__avatar" src={avatar} alt="" />
            ) : (
              <div className="profile__avatar profile__avatar--placeholder" />
            )}
            <div>
              <div className="profile__name">
                {profileLoading ? "Loading…" : label}
              </div>
              <div className="profile__address">{shortenAddress(address)}</div>
            </div>
          </div>

          {profile && !profile.found && (
            <p className="hint">
              This wallet has no Topaz ID profile yet — falling back to the
              address.
            </p>
          )}

          <button
            className="btn"
            onClick={sendSelfTx}
            disabled={isPending}
            type="button"
          >
            {isPending ? "Confirm in Topaz ID…" : "Send 0 BNB to yourself"}
          </button>

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
        </div>
      )}
    </div>
  );
}
