"use client";

import { TOPAZ_ID_CHAIN_IDS, TOPAZ_ID_CHAIN_INFO } from "@topazdex/id-connect";
import { useAccount, useSwitchChain } from "wagmi";
import { useHydrated } from "./use-hydrated";

// RainbowKit-free on purpose: this panel renders on both the full and the
// minimal route, and chain switching is plain wagmi either way.
export function ChainsPanel() {
  const { chainId, isConnected } = useAccount();
  const { switchChain, isPending, variables } = useSwitchChain();
  const connected = useHydrated() && isConnected;

  return (
    <>
      <div className="demo-panel__header">
        <p className="eyebrow">Chains</p>
        <h2>One wallet, five chains.</h2>
        <p>
          The connected smart wallet has the same address on every chain Topaz ID supports.
          Topaz ID sponsors gas on BNB Chain; on the other chains the wallet pays gas from its
          own balance, so fund it with that chain&apos;s native currency before sending.
        </p>
      </div>

      <div className="demo-grid">
        {TOPAZ_ID_CHAIN_IDS.map((id) => {
          const info = TOPAZ_ID_CHAIN_INFO[id];
          const active = connected && chainId === id;
          const switching = isPending && variables?.chainId === id;

          return (
            <div className="feature-card" key={id}>
              <span className="feature-card__icon">{id}</span>
              <h2>{info.name}</h2>
              <p>
                {info.gasSponsored
                  ? "Gas sponsored by Topaz ID."
                  : `Gas paid by the wallet in ${info.nativeCurrency}.`}
              </p>
              {connected && (
                <button
                  className={active ? "btn" : "btn btn--secondary"}
                  onClick={() => switchChain({ chainId: id })}
                  disabled={active || isPending}
                  type="button"
                >
                  {active ? "Connected" : switching ? "Switching…" : `Switch to ${info.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
