"use client";

import { TOPAZ_ID_CHAINS } from "@topazdex/id-connect/chains";
import { TopazIdProvider } from "@topazdex/id-connect/react";
import type { ReactNode } from "react";

// `chains` accepts any subset of TOPAZ_ID_CHAINS; the first entry is the chain
// Topaz ID connects on. Omit it for BNB Chain only.
export function MinimalProviders({
  children,
  cookie,
}: {
  children: ReactNode;
  cookie?: string | null;
}) {
  return (
    <TopazIdProvider chains={TOPAZ_ID_CHAINS} cookie={cookie}>
      {children}
    </TopazIdProvider>
  );
}
