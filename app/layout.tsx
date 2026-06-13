import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Topaz ID Connect — Demo",
  description:
    "A minimal dapp showing one-click Topaz ID login on BNB Chain with @topazdex/id-connect.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
