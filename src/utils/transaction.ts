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
 */
export async function sendTx(
  call: (overrides?: TxOverrides) => Promise<{ wait(): Promise<TxReceipt> }>,
  ctx: SDKContext,
): Promise<TxReceipt> {
  try {
    const overrides = await getTxOverrides(ctx);
    const tx = await call(overrides);
    return (await tx.wait()) as TxReceipt;
  } catch (error) {
    throw decodeContractError(error, ctx.registryInterface, ctx.resolverInterface);
  }
}
