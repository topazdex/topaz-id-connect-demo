"use client";

import { TopazIdProvider } from "@topazdex/id-connect/react";
import type { ReactNode } from "react";

export function MinimalProviders({
  children,
  cookie,
}: {
  children: ReactNode;
  cookie?: string | null;
}) {
  return <TopazIdProvider cookie={cookie}>{children}</TopazIdProvider>;
}
