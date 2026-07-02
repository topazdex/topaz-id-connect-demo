"use client";

import { useQuery } from "@tanstack/react-query";
import { useTopazIdClient } from "@topazdex/id-connect/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { erc20Abi, formatUnits, parseEther, parseUnits, type Address } from "viem";
import {
  useAccount,
  useBalance,
  usePublicClient,
  useReadContract,
  useReadContracts,
  useSimulateContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import {
  BNB_LOGO_URL,
  formatUsd,
  useTokenMarketData,
} from "@/lib/dexscreener";
import {
  BNB_CHAIN_ID,
  DEFAULT_SLIPPAGE_BPS,
  QUOTE_REFRESH_MS,
  SLIPPAGE_OPTIONS_BPS,
  SWAP_TICK_SPACING_OVERRIDE,
  TOPAZ_QUOTER_V2,
  TOPAZ_SWAP_ROUTER,
  WBNB_ADDRESS,
  applySlippage,
  buildBnbToTokenCalls,
  buildTokenToBnbCalls,
  detectSwapPool,
  formatTokenAmount,
  quoterV2Abi,
  swapDeadline,
  swapRouterAbi,
} from "@/lib/swap";
import { useHydrated } from "./use-hydrated";

const GAS_RESERVE_WEI = parseEther("0.001");

type Direction = "bnb-to-token" | "token-to-bnb";
type TxKind = "approve" | "swap";

function friendlySwapError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/user rejected|user denied/i.test(message)) {
    return "Transaction rejected in wallet.";
  }
  if (/too little received|insufficient_output/i.test(message)) {
    return "Price moved beyond your slippage tolerance — refresh the quote or raise slippage.";
  }
  if (/insufficient funds/i.test(message)) {
    return "Insufficient BNB to cover the swap plus gas.";
  }
  return message.split("\n")[0];
}

function TokenChip({ symbol, logoUrl }: { symbol: string; logoUrl: string | null }) {
  return (
    <span className="swap-field__token">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="swap-field__token-logo" src={logoUrl} alt="" />
      ) : (
        <span
          className="swap-field__token-logo swap-field__token-logo--fallback"
          aria-hidden="true"
        >
          {symbol.slice(0, 1)}
        </span>
      )}
      {symbol}
    </span>
  );
}

export function SwapCard({
  tokenAddress,
  connectSlot,
}: {
  tokenAddress: Address;
  connectSlot: ReactNode;
}) {
  const { address, isConnected } = useAccount();

  const mounted = useHydrated();

  const [direction, setDirection] = useState<Direction>("bnb-to-token");
  const [amountInput, setAmountInput] = useState("");
  const [slippageBps, setSlippageBps] = useState<bigint>(DEFAULT_SLIPPAGE_BPS);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [txKind, setTxKind] = useState<TxKind | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const { data: tokenMeta } = useReadContracts({
    allowFailure: false,
    contracts: [
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "symbol",
        chainId: BNB_CHAIN_ID,
      },
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "decimals",
        chainId: BNB_CHAIN_ID,
      },
    ],
  });
  const tokenSymbol = tokenMeta?.[0] ?? "TOKEN";
  const tokenDecimals = tokenMeta?.[1] ?? 18;

  const publicClient = usePublicClient({ chainId: BNB_CHAIN_ID });
  const { data: pool, isPending: poolDetecting } = useQuery({
    queryKey: ["topaz-swap-pool", tokenAddress.toLowerCase()],
    enabled: Boolean(publicClient),
    staleTime: Infinity,
    queryFn: () => {
      if (!publicClient) throw new Error("Public client unavailable");
      return detectSwapPool(publicClient, tokenAddress);
    },
  });
  const poolMissing = pool === null;

  const { data: tokenMarket } = useTokenMarketData(tokenAddress);
  const { data: bnbMarket } = useTokenMarketData(WBNB_ADDRESS);
  const tokenLogo = tokenMarket?.logoUrl ?? null;
  const bnbLogo = bnbMarket?.logoUrl ?? BNB_LOGO_URL;
  const tokenPriceUsd = tokenMarket?.priceUsd ?? null;
  const bnbPriceUsd = bnbMarket?.priceUsd ?? null;

  const { data: bnbBalance, refetch: refetchBnbBalance } = useBalance({
    address,
    chainId: BNB_CHAIN_ID,
  });

  const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: BNB_CHAIN_ID,
    query: { enabled: Boolean(address) },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, TOPAZ_SWAP_ROUTER] : undefined,
    chainId: BNB_CHAIN_ID,
    query: { enabled: Boolean(address) },
  });

  const isBnbIn = direction === "bnb-to-token";
  const inputSymbol = isBnbIn ? "BNB" : tokenSymbol;
  const outputSymbol = isBnbIn ? tokenSymbol : "BNB";
  const inputDecimals = isBnbIn ? 18 : tokenDecimals;
  const outputDecimals = isBnbIn ? tokenDecimals : 18;
  const inputBalance = isBnbIn ? bnbBalance?.value : tokenBalance;
  const outputBalance = isBnbIn ? tokenBalance : bnbBalance?.value;
  const inputLogo = isBnbIn ? bnbLogo : tokenLogo;
  const outputLogo = isBnbIn ? tokenLogo : bnbLogo;
  const inputPriceUsd = isBnbIn ? bnbPriceUsd : tokenPriceUsd;
  const outputPriceUsd = isBnbIn ? tokenPriceUsd : bnbPriceUsd;

  const amountIn = useMemo(() => {
    if (!amountInput) return null;
    try {
      const parsed = parseUnits(amountInput, inputDecimals);
      return parsed > 0n ? parsed : null;
    } catch {
      return null;
    }
  }, [amountInput, inputDecimals]);

  const quoteEnabled = amountIn !== null && Boolean(pool);
  const {
    data: quote,
    error: quoteError,
    isFetching: quoteFetching,
  } = useSimulateContract({
    address: TOPAZ_QUOTER_V2,
    abi: quoterV2Abi,
    functionName: "quoteExactInputSingle",
    args: [
      {
        tokenIn: isBnbIn ? WBNB_ADDRESS : tokenAddress,
        tokenOut: isBnbIn ? tokenAddress : WBNB_ADDRESS,
        amountIn: amountIn ?? 0n,
        tickSpacing: pool?.tickSpacing ?? 200,
        sqrtPriceLimitX96: 0n,
      },
    ],
    chainId: BNB_CHAIN_ID,
    query: { enabled: quoteEnabled, refetchInterval: QUOTE_REFRESH_MS },
  });

  const expectedOut = quoteEnabled ? quote?.result[0] : undefined;
  const minOut =
    expectedOut !== undefined ? applySlippage(expectedOut, slippageBps) : undefined;

  const inputUsd =
    amountIn !== null && inputPriceUsd !== null
      ? Number(formatUnits(amountIn, inputDecimals)) * inputPriceUsd
      : null;
  const outputUsd =
    expectedOut !== undefined && outputPriceUsd !== null
      ? Number(formatUnits(expectedOut, outputDecimals)) * outputPriceUsd
      : null;

  const rate = useMemo(() => {
    if (amountIn === null || expectedOut === undefined) return null;
    const inNum = Number(formatUnits(amountIn, inputDecimals));
    const outNum = Number(formatUnits(expectedOut, outputDecimals));
    if (!Number.isFinite(inNum) || !Number.isFinite(outNum) || inNum === 0) return null;
    return outNum / inNum;
  }, [amountIn, expectedOut, inputDecimals, outputDecimals]);

  const insufficient =
    amountIn !== null && inputBalance !== undefined && amountIn > inputBalance;

  const needsApproval =
    !isBnbIn && amountIn !== null && allowance !== undefined && allowance < amountIn;

  const { writeContractAsync, isPending: writePending } = useWriteContract();
  const { data: topazClient } = useTopazIdClient();
  const [topazPending, setTopazPending] = useState(false);
  const { isLoading: txConfirming, isSuccess: txConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash ?? undefined,
      chainId: BNB_CHAIN_ID,
    });

  useEffect(() => {
    if (!txConfirmed) return;
    void refetchBnbBalance();
    void refetchTokenBalance();
    void refetchAllowance();
  }, [txConfirmed, refetchBnbBalance, refetchTokenBalance, refetchAllowance]);

  const resetTxState = () => {
    setTxHash(null);
    setTxKind(null);
    setTxError(null);
  };

  const flipDirection = () => {
    setDirection((current) =>
      current === "bnb-to-token" ? "token-to-bnb" : "bnb-to-token",
    );
    setAmountInput("");
    resetTxState();
  };

  const fillMaxAmount = () => {
    if (inputBalance === undefined) return;
    const max = isBnbIn
      ? inputBalance > GAS_RESERVE_WEI
        ? inputBalance - GAS_RESERVE_WEI
        : 0n
      : inputBalance;
    setAmountInput(formatUnits(max, inputDecimals));
  };

  const approve = async () => {
    if (!address || amountIn === null) return;
    resetTxState();
    try {
      const hash = await writeContractAsync({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [TOPAZ_SWAP_ROUTER, amountIn],
        chainId: BNB_CHAIN_ID,
      });
      setTxKind("approve");
      setTxHash(hash);
    } catch (err) {
      setTxError(friendlySwapError(err));
    }
  };

  const swap = async () => {
    if (!address || amountIn === null || minOut === undefined || !pool) return;
    resetTxState();
    try {
      const params = {
        token: tokenAddress,
        tickSpacing: pool.tickSpacing,
        amountIn,
        amountOutMinimum: minOut,
        recipient: address,
        deadline: swapDeadline(),
      };
      const calls = isBnbIn
        ? buildBnbToTokenCalls(params)
        : buildTokenToBnbCalls(params);
      const hash = await writeContractAsync({
        address: TOPAZ_SWAP_ROUTER,
        abi: swapRouterAbi,
        functionName: "multicall",
        args: [calls],
        value: isBnbIn ? amountIn : 0n,
        chainId: BNB_CHAIN_ID,
      });
      setTxKind("swap");
      setTxHash(hash);
    } catch (err) {
      setTxError(friendlySwapError(err));
    }
  };

  const swapWithTopazId = async () => {
    if (!topazClient || !address || amountIn === null || minOut === undefined || !pool) return;
    resetTxState();
    setTopazPending(true);
    try {
      const params = {
        token: tokenAddress,
        tickSpacing: pool.tickSpacing,
        amountIn,
        amountOutMinimum: minOut,
        recipient: address,
        deadline: swapDeadline(),
      };
      const calls = isBnbIn
        ? buildBnbToTokenCalls(params)
        : buildTokenToBnbCalls(params);
      const swapCall = {
        address: TOPAZ_SWAP_ROUTER,
        abi: swapRouterAbi,
        functionName: "multicall",
        args: [calls],
        ...(isBnbIn ? { value: amountIn } : {}),
      };
      const hash = needsApproval
        ? await topazClient.sendCalls({
            calls: [
              {
                address: tokenAddress,
                abi: erc20Abi,
                functionName: "approve",
                args: [TOPAZ_SWAP_ROUTER, amountIn],
              },
              swapCall,
            ],
          })
        : await topazClient.writeContract(swapCall);
      setTxKind("swap");
      setTxHash(hash);
    } catch (err) {
      setTxError(friendlySwapError(err));
    } finally {
      setTopazPending(false);
    }
  };

  const confirmPending = writePending || topazPending;
  const busy = confirmPending || txConfirming;
  const swapNow = Boolean(topazClient) || !needsApproval;

  let buttonLabel = needsApproval
    ? topazClient
      ? `Approve ${tokenSymbol} + swap`
      : `Approve ${tokenSymbol}`
    : "Swap";
  if (poolDetecting) buttonLabel = "Finding pool…";
  else if (poolMissing) buttonLabel = "No pool for this pair";
  else if (amountIn === null) buttonLabel = "Enter an amount";
  else if (insufficient) buttonLabel = `Insufficient ${inputSymbol} balance`;
  else if (confirmPending) buttonLabel = "Confirm in wallet…";
  else if (txConfirming) buttonLabel = txKind === "approve" ? "Approving…" : "Swapping…";
  else if (quoteError) buttonLabel = "No route available";
  else if (swapNow && expectedOut === undefined && quoteFetching)
    buttonLabel = "Fetching quote…";

  const buttonDisabled =
    poolDetecting ||
    poolMissing ||
    amountIn === null ||
    insufficient ||
    busy ||
    Boolean(quoteError) ||
    (swapNow && minOut === undefined);

  const onAction = topazClient ? swapWithTopazId : needsApproval ? approve : swap;

  return (
    <div className="swap-card">
      <div className="swap-card__head">
        <h2>Swap</h2>
        <span className="swap-card__route">Topaz SwapRouter · direct CL route</span>
      </div>

      <div className="swap-field">
        <div className="swap-field__top">
          <span>You pay</span>
          <button
            className="swap-field__max"
            onClick={fillMaxAmount}
            disabled={inputBalance === undefined}
            type="button"
          >
            Balance: {inputBalance !== undefined
              ? formatTokenAmount(inputBalance, inputDecimals)
              : "—"}{" "}
            · Max
          </button>
        </div>
        <div className="swap-field__row">
          <input
            value={amountInput}
            onChange={(event) => {
              setAmountInput(event.target.value);
              setTxError(null);
            }}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.0"
            aria-label={`Amount of ${inputSymbol} to swap`}
          />
          <TokenChip symbol={inputSymbol} logoUrl={inputLogo} />
        </div>
        {inputUsd !== null && (
          <span className="swap-field__usd">≈ {formatUsd(inputUsd)}</span>
        )}
      </div>

      <button
        className="swap-flip"
        onClick={flipDirection}
        aria-label="Flip swap direction"
        type="button"
      >
        ⇅
      </button>

      <div className="swap-field">
        <div className="swap-field__top">
          <span>You receive (estimated)</span>
          <span className="swap-field__balance">
            Balance: {outputBalance !== undefined
              ? formatTokenAmount(outputBalance, outputDecimals)
              : "—"}
          </span>
        </div>
        <div className="swap-field__row">
          <span
            className={
              quoteFetching
                ? "swap-field__out swap-field__out--loading"
                : "swap-field__out"
            }
          >
            {expectedOut !== undefined
              ? formatTokenAmount(expectedOut, outputDecimals)
              : "0.0"}
          </span>
          <TokenChip symbol={outputSymbol} logoUrl={outputLogo} />
        </div>
        {outputUsd !== null && (
          <span className="swap-field__usd">≈ {formatUsd(outputUsd)}</span>
        )}
      </div>

      <dl className="swap-details">
        <div>
          <dt>{tokenSymbol} price</dt>
          <dd>{tokenPriceUsd !== null ? formatUsd(tokenPriceUsd) : "—"}</dd>
        </div>
        <div>
          <dt>Rate</dt>
          <dd>
            {rate !== null
              ? `1 ${inputSymbol} ≈ ${rate.toLocaleString("en-US", {
                  maximumSignificantDigits: 6,
                })} ${outputSymbol}`
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Min received</dt>
          <dd>
            {minOut !== undefined
              ? `${formatTokenAmount(minOut, outputDecimals)} ${outputSymbol}`
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Slippage</dt>
          <dd className="swap-slippage">
            {SLIPPAGE_OPTIONS_BPS.map((bps) => (
              <button
                key={bps.toString()}
                className={bps === slippageBps ? "is-active" : undefined}
                onClick={() => setSlippageBps(bps)}
                type="button"
              >
                {Number(bps) / 100}%
              </button>
            ))}
          </dd>
        </div>
      </dl>

      {mounted && isConnected && address ? (
        <button
          className="btn swap-card__cta"
          onClick={() => void onAction()}
          disabled={buttonDisabled}
          type="button"
        >
          {buttonLabel}
        </button>
      ) : (
        connectSlot
      )}

      {poolMissing && (
        <p className="tx tx--err">
          No WBNB concentrated-liquidity pool was found for this token on Topaz
          {SWAP_TICK_SPACING_OVERRIDE !== null
            ? ` at tick spacing ${SWAP_TICK_SPACING_OVERRIDE}`
            : ""}
          . The token needs a WBNB CL pool before it can be swapped here.
        </p>
      )}
      {!poolDetecting && !poolMissing && quoteError !== null && amountIn !== null && (
        <p className="tx tx--err">
          Quote failed — the pool may not have enough liquidity for this trade size.
        </p>
      )}
      {txError && <p className="tx tx--err">{txError}</p>}
      {txHash && (
        <a
          className="tx tx--ok"
          href={`https://bscscan.com/tx/${txHash}`}
          target="_blank"
          rel="noreferrer"
        >
          {txConfirming
            ? "Pending — view on BscScan ↗"
            : txKind === "approve"
              ? "Approved — now hit Swap ↗"
              : "Swapped — view on BscScan ↗"}
        </a>
      )}

      <p className="swap-card__note">
        Live quote from QuoterV2, refreshed every {QUOTE_REFRESH_MS / 1000}s. Prices and
        logos via Dexscreener.
        {pool
          ? ` Swaps go through the WBNB/${tokenSymbol} concentrated-liquidity pool (tick spacing ${pool.tickSpacing}).`
          : ""}
        {topazClient
          ? " Connected with Topaz ID — approval and swap batch into a single confirmation via the smart-wallet client."
          : ""}
      </p>
    </div>
  );
}
