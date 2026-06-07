import { Demo } from "./demo";

export default function Home() {
  return (
    <main className="page">
      <section className="card">
        <header className="card__header">
          <h1>Topaz ID Connect</h1>
          <p>
            One-click login with a Topaz ID global wallet on BNB Chain, powered by{" "}
            <code>@topazdex/id-connect</code>.
          </p>
        </header>
        <Demo />
      </section>
      <footer className="footer">
        <a href="https://www.npmjs.com/package/@topazdex/id-connect">npm</a>
        <span>·</span>
        <a href="https://github.com/topazdex/topaz-id-connect">GitHub</a>
        <span>·</span>
        <a href="https://id.topazdex.com/developers">Docs</a>
      </footer>
    </main>
  );
}
