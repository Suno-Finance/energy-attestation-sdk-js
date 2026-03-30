import { isAddress } from "ethers";
import type { SDKContext, CreateWatcherResult, TxResult } from "../types.js";
import { ConfigurationError, decodeContractError } from "../errors.js";
import { sendTx } from "../utils/transaction.js";

export class WatcherModule {
  constructor(private ctx: SDKContext) {}

  async createWatcher(name: string): Promise<CreateWatcherResult> {
    const receipt = await sendTx(
      (overrides) => this.ctx.registry.registerWatcher(name, ...(overrides ? [overrides] : [])),
      this.ctx,
    );

    for (const log of receipt.logs) {
      try {
        const parsed = this.ctx.registryInterface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (parsed?.name === "WatcherRegistered") {
          return { watcherId: BigInt(parsed.args[0]), txHash: receipt.hash };
        }
      } catch {
        // Not a registry log, skip
      }
    }

    throw new ConfigurationError(
      "WatcherRegistered event not found in transaction logs — watcher ID could not be determined",
    );
  }

  async transferWatcherOwnership(watcherId: number | bigint, newOwner: string): Promise<TxResult> {
    if (!isAddress(newOwner)) {
      throw new ConfigurationError("newOwner must be a valid Ethereum address");
    }
    const receipt = await sendTx(
      (overrides) =>
        this.ctx.registry.transferWatcherOwnership(
          watcherId,
          newOwner,
          ...(overrides ? [overrides] : []),
        ),
      this.ctx,
    );
    return { txHash: receipt.hash };
  }

  async estimateCreateWatcherGas(name: string): Promise<bigint> {
    try {
      return await this.ctx.registry.registerWatcher.estimateGas(name);
    } catch (error) {
      throw decodeContractError(error, this.ctx.registryInterface, this.ctx.resolverInterface);
    }
  }

  async estimateTransferWatcherOwnershipGas(
    watcherId: number | bigint,
    newOwner: string,
  ): Promise<bigint> {
    if (!isAddress(newOwner)) {
      throw new ConfigurationError("newOwner must be a valid Ethereum address");
    }
    try {
      return await this.ctx.registry.transferWatcherOwnership.estimateGas(watcherId, newOwner);
    } catch (error) {
      throw decodeContractError(error, this.ctx.registryInterface, this.ctx.resolverInterface);
    }
  }
}
