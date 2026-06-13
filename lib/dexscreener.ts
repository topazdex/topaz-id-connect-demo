import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { Address } from "viem";

const DEXSCREENER_TOKEN_PAIRS_URL = "https://api.dexscreener.com/token-pairs/v1/bsc";

// Dexscreener's top WBNB pair often carries no token image, so fall back to a stable CDN
export const BNB_LOGO_URL =
  "https://assets-cdn.trustwallet.com/blockchains/smartchain/assets/0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c/logo.png";

type DexscreenerToken = {
  address: string;
  name: string;
  symbol: string;
};

type DexscreenerPair = {
  chainId: string;
  dexId: string;
  baseToken: DexscreenerToken;
  quoteToken: DexscreenerToken;
  priceUsd?: string;
  liquidity?: { usd?: number };
  info?: { imageUrl?: string } | null;
};

export type TokenMarketData = {
  priceUsd: number | null;
  logoUrl: string | null;
};

export async function fetchTokenMarketData(address: Address): Promise<TokenMarketData> {
  const response = await fetch(`${DEXSCREENER_TOKEN_PAIRS_URL}/${address}`);
  if (!response.ok) {
    throw new Error(`Dexscreener request failed with status ${response.status}`);
  }
  const pairs = (await response.json()) as DexscreenerPair[];

  const basePairs = pairs
    .filter((pair) => pair.baseToken.address.toLowerCase() === address.toLowerCase())
    .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));

  const priceUsd = basePairs.find((pair) => pair.priceUsd)?.priceUsd;
  const logoUrl = basePairs.find((pair) => pair.info?.imageUrl)?.info?.imageUrl;

  return {
    priceUsd: priceUsd ? Number(priceUsd) : null,
    logoUrl: logoUrl ?? null,
  };
}

export function useTokenMarketData(address: Address): UseQueryResult<TokenMarketData> {
  return useQuery({
    queryKey: ["dexscreener-token", address.toLowerCase()],
    queryFn: () => fetchTokenMarketData(address),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });
}

export function formatUsd(value: number): string {
  if (value > 0 && value < 0.01) {
    return `$${value.toLocaleString("en-US", { maximumSignificantDigits: 3 })}`;
  }
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}
