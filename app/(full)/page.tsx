import { AppNav, Demo } from "@/app/demo";

export default function Home() {
  return (
    <main className="page-shell">
      <AppNav />

      <section className="hero-shell">
        <div className="hero-copy">
          <p className="eyebrow">Open-source starter app</p>
          <h1>Bring Topaz ID login to your dapp on any Topaz chain.</h1>
          <p>
            This demo shows how a normal app can use <code>@topazdex/id-connect</code> to add
            Topaz ID on BNB Chain, Robinhood Chain, Base, Ethereum, and Arc, resolve public
            profiles, and send smart-wallet transactions through the built-in client — with
            plain wagmi as the fallback for every other wallet.
          </p>
          <div className="hero-actions">
            <a className="btn btn--secondary" href="https://github.com/topazdex/topaz-id-connect-demo" target="_blank" rel="noreferrer">
              View demo repo
            </a>
            <a className="text-link" href="https://www.npmjs.com/package/@topazdex/id-connect" target="_blank" rel="noreferrer">
              npm package ↗
            </a>
          </div>
        </div>

        <div className="install-card">
          <span>Install</span>
          <code>yarn add @topazdex/id-connect @privy-io/cross-app-connect viem</code>
        </div>
      </section>

      <Demo />
    </main>
  );
}
