"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function Brand() {
  return (
    <a className="brand" href="https://id.topazdex.com" target="_blank" rel="noreferrer">
      <span className="brand__mark">T</span>
      <span>
        <span className="brand__eyebrow">Topaz</span>
        <span className="brand__name">ID Demo</span>
      </span>
    </a>
  );
}

function ModeToggle() {
  const pathname = usePathname() ?? "/";
  const onMinimal = pathname.startsWith("/minimal");

  return (
    <div className="mode-toggle" role="tablist" aria-label="Integration mode">
      <Link href="/" role="tab" aria-current={onMinimal ? undefined : "page"}>
        Full picker
      </Link>
      <Link href="/minimal" role="tab" aria-current={onMinimal ? "page" : undefined}>
        Minimal
      </Link>
    </div>
  );
}

export function NavShell({ accountSlot }: { accountSlot: ReactNode }) {
  return (
    <header className="topnav">
      <Brand />

      <div className="nav-center">
        <ModeToggle />
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
      </div>

      {accountSlot}
    </header>
  );
}
