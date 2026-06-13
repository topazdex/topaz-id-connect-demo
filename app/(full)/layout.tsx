import { headers } from "next/headers";
import { Providers } from "@/app/providers";

export default async function FullLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookie = (await headers()).get("cookie");

  return <Providers cookie={cookie}>{children}</Providers>;
}
