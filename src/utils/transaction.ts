import type { SDKContext } from "../types.js";
import { parseUnits } from "ethers";
import { decodeContractError } from "../errors.js";

export interface TxReceipt {
  hash: string;
  logs: { topics: readonly string[]; data: string }[];
}

export interface TxOverrides {
  maxPriorityFeePerGas?: bigint;
  maxFeePerGas?: bigint;
}

export async function getTxOverrides(ctx: SDKContext): Promise<TxOverrides> {
  const feeData = await ctx.provider.getFeeData();
  const minPriority = parseUnits(String(ctx.tx.minPriorityFeeGwei), "gwei");

  const observedPriority = feeData.maxPriorityFeePerGas ?? 0n;
  const maxPriorityFeePerGas = observedPriority > minPriority ? observedPriority : minPriority;

  const feeSeed = feeData.maxFeePerGas ?? feeData.gasPrice ?? maxPriorityFeePerGas;
  const multiplier = BigInt(Math.max(1, Math.floor(ctx.tx.maxFeeMultiplier)));
  const maxFeePerGas = feeSeed * multiplier;

  return {
    maxPriorityFeePerGas,
    maxFeePerGas: maxFeePerGas >= maxPriorityFeePerGas ? maxFeePerGas : maxPriorityFeePerGas * 2n,
  };
}

/**
 * Executes a contract call, waits for the transaction receipt, and returns it.
 * Wraps contract errors into typed SDK errors via `decodeContractError`.
 * Retries transient failures up to `ctx.tx.retryCount` times with exponential backoff.
 * Does not retry when the error has a `.data` field (deterministic contract revert).
 */
export async function sendTx(
  call: (overrides?: TxOverrides) => Promise<{ wait(): Promise<TxReceipt> }>,
  ctx: SDKContext,
): Promise<TxReceipt> {
  const maxAttempts = 1 + (ctx.tx.retryCount ?? 0);
  const baseDelayMs = ctx.tx.retryDelayMs ?? 1000;

  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * 2 ** (attempt - 1)));
    }
    try {
      const overrides = await getTxOverrides(ctx);
      const tx = await call(overrides);
      return (await tx.wait()) as TxReceipt;
    } catch (error) {
      // Don't retry deterministic contract reverts (they have encoded error data).
      if (error != null && typeof error === "object" && "data" in error) {
        throw decodeContractError(error, ctx.registryInterface, ctx.resolverInterface);
      }
      lastError = error;
    }
  }
  throw decodeContractError(lastError, ctx.registryInterface, ctx.resolverInterface);
}
