import {
  encodeFunctionData,
  formatUnits,
  isAddress,
  parseAbi,
  zeroAddress,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";

export const BNB_CHAIN_ID = 56;

export const WBNB_ADDRESS: Address = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
export const TOPAZ_TOKEN_ADDRESS: Address = "0xdf002282C1474C9592780618Adda7EaA99998Abd";

export const TOPAZ_SWAP_ROUTER: Address = "0x9B63CA87919617d042A89663492dB3c8686e0CaE";
export const TOPAZ_QUOTER_V2: Address = "0x7CCB89bB9BdEF68688F39a2c22d249fD1D9759f1";
export const TOPAZ_CL_FACTORY: Address = "0x73DC984D9490286E735548f61dfCCec67Af82ed9";

function envAddress(value: string | undefined, fallback: Address): Address {
  if (!value) return fallback;
  if (!isAddress(value)) {
    throw new Error(`NEXT_PUBLIC_SWAP_TOKEN_ADDRESS is not a valid address: ${value}`);
  }
  return value;
}

function envTickSpacing(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`NEXT_PUBLIC_SWAP_TICK_SPACING must be a positive integer: ${value}`);
  }
  return parsed;
}

export const DEFAULT_SWAP_TOKEN_ADDRESS = envAddress(
  process.env.NEXT_PUBLIC_SWAP_TOKEN_ADDRESS,
  TOPAZ_TOKEN_ADDRESS,
);

export const SWAP_TICK_SPACING_OVERRIDE = envTickSpacing(
  process.env.NEXT_PUBLIC_SWAP_TICK_SPACING,
);

// Topaz CL tick spacings, ordered by how likely a volatile WBNB pair lives there
export const TICK_SPACING_CANDIDATES = [200, 100, 50, 2000, 1] as const;

export const DEFAULT_SLIPPAGE_BPS = 100n;
export const SLIPPAGE_OPTIONS_BPS = [50n, 100n, 300n] as const;
export const QUOTE_REFRESH_MS = 10_000;

export const swapRouterAbi = parseAbi([
  "struct ExactInputSingleParams { address tokenIn; address tokenOut; int24 tickSpacing; address recipient; uint256 deadline; uint256 amountIn; uint256 amountOutMinimum; uint160 sqrtPriceLimitX96; }",
  "function exactInputSingle(ExactInputSingleParams params) payable returns (uint256 amountOut)",
  "function unwrapWETH9(uint256 amountMinimum, address recipient) payable",
  "function refundETH() payable",
  "function multicall(bytes[] data) payable returns (bytes[] results)",
]);

export const quoterV2Abi = parseAbi([
  "struct QuoteExactInputSingleParams { address tokenIn; address tokenOut; uint256 amountIn; int24 tickSpacing; uint160 sqrtPriceLimitX96; }",
  "function quoteExactInputSingle(QuoteExactInputSingleParams params) returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",
]);

export const clFactoryAbi = parseAbi([
  "function getPool(address tokenA, address tokenB, int24 tickSpacing) view returns (address pool)",
]);

export type SwapPool = {
  tickSpacing: number;
  address: Address;
};

export async function detectSwapPool(
  client: Pick<PublicClient, "readContract">,
  token: Address,
): Promise<SwapPool | null> {
  const candidates =
    SWAP_TICK_SPACING_OVERRIDE !== null
      ? [SWAP_TICK_SPACING_OVERRIDE]
      : TICK_SPACING_CANDIDATES;
  for (const tickSpacing of candidates) {
    const pool = await client.readContract({
      address: TOPAZ_CL_FACTORY,
      abi: clFactoryAbi,
      functionName: "getPool",
      args: [WBNB_ADDRESS, token, tickSpacing],
    });
    if (pool !== zeroAddress) return { tickSpacing, address: pool };
  }
  return null;
}

export function applySlippage(amountOut: bigint, slippageBps: bigint): bigint {
  return (amountOut * (10_000n - slippageBps)) / 10_000n;
}

export function swapDeadline(): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + 20 * 60);
}

export function formatTokenAmount(
  value: bigint,
  decimals: number,
  significantDigits = 6,
): string {
  const num = Number(formatUnits(value, decimals));
  if (!Number.isFinite(num)) return formatUnits(value, decimals);
  return num.toLocaleString("en-US", { maximumSignificantDigits: significantDigits });
}

type SwapCallParams = {
  token: Address;
  tickSpacing: number;
  amountIn: bigint;
  amountOutMinimum: bigint;
  recipient: Address;
  deadline: bigint;
};

export function buildBnbToTokenCalls({
  token,
  tickSpacing,
  amountIn,
  amountOutMinimum,
  recipient,
  deadline,
}: SwapCallParams): Hex[] {
  const swap = encodeFunctionData({
    abi: swapRouterAbi,
    functionName: "exactInputSingle",
    args: [
      {
        tokenIn: WBNB_ADDRESS,
        tokenOut: token,
        tickSpacing,
        recipient,
        deadline,
        amountIn,
        amountOutMinimum,
        sqrtPriceLimitX96: 0n,
      },
    ],
  });
  const refund = encodeFunctionData({
    abi: swapRouterAbi,
    functionName: "refundETH",
  });
  return [swap, refund];
}

export function buildTokenToBnbCalls({
  token,
  tickSpacing,
  amountIn,
  amountOutMinimum,
  recipient,
  deadline,
}: SwapCallParams): Hex[] {
  // WBNB is delivered to the router itself so unwrapWETH9 can pay out native BNB
  const swap = encodeFunctionData({
    abi: swapRouterAbi,
    functionName: "exactInputSingle",
    args: [
      {
        tokenIn: token,
        tokenOut: WBNB_ADDRESS,
        tickSpacing,
        recipient: TOPAZ_SWAP_ROUTER,
        deadline,
        amountIn,
        amountOutMinimum,
        sqrtPriceLimitX96: 0n,
      },
    ],
  });
  const unwrap = encodeFunctionData({
    abi: swapRouterAbi,
    functionName: "unwrapWETH9",
    args: [amountOutMinimum, recipient],
  });
  return [swap, unwrap];
}
