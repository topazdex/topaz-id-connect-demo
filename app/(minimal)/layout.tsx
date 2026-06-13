import { headers } from "next/headers";
import { MinimalProviders } from "@/app/minimal-providers";

export default async function MinimalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookie = (await headers()).get("cookie");

  return <MinimalProviders cookie={cookie}>{children}</MinimalProviders>;
}
