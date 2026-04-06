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
  gasPrice?: bigint;
}

type RpcProvider = { send(method: string, params: unknown[]): Promise<string> };

function rpc(provider: SDKContext["provider"]): RpcProvider {
  return provider as unknown as RpcProvider;
}

export async function getTxOverrides(ctx: SDKContext): Promise<TxOverrides> {
  const multiplier = BigInt(Math.max(1, Math.floor(ctx.tx.maxFeeMultiplier)));

  // Legacy networks (e.g. Celo): call eth_gasPrice directly.
  // getFeeData() internally calls eth_maxPriorityFeePerGas which many networks
  // and wallet providers (MetaMask) don't support, producing noisy RPC warnings.
  if (ctx.gasStrategy === "legacy") {
    const gasPrice = BigInt(await rpc(ctx.provider).send("eth_gasPrice", []));
    return { gasPrice: gasPrice * multiplier };
  }

  // EIP-1559 path: derive fees from the latest block's baseFeePerGas.
  // Avoids getFeeData() and its eth_maxPriorityFeePerGas call entirely.
  const block = await rpc(ctx.provider).send("eth_getBlockByNumber", ["latest", false]);
  const baseFee = BigInt((block as unknown as { baseFeePerGas?: string }).baseFeePerGas ?? "0x0");
  const minPriority = parseUnits(String(ctx.tx.minPriorityFeeGwei), "gwei");
  const maxFeePerGas = baseFee * multiplier + minPriority;

  return {
    maxPriorityFeePerGas: minPriority,
    maxFeePerGas,
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
