import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";

import type { Metadata } from "next";
import { headers } from "next/headers";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Topaz ID Connect — Demo",
  description:
    "A minimal dapp showing one-click Topaz ID login on BNB Chain with @topazdex/id-connect.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookie = (await headers()).get("cookie");

  return (
    <html lang="en">
      <body>
        <Providers cookie={cookie}>{children}</Providers>
      </body>
    </html>
  );
}
