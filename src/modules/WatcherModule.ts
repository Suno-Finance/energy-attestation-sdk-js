import { isAddress } from "ethers";
import type { SDKContext, CreateWatcherResult, TxResult } from "../types.js";
import { ConfigurationError, decodeContractError } from "../errors.js";
import { sendTx } from "../utils/transaction.js";
import { findEventLog } from "../utils/events.js";
import { TOPIC0_WATCHER_REGISTERED } from "../constants.js";

export class WatcherModule {
  constructor(private ctx: SDKContext) {}

  /**
   * Registers a new watcher on-chain under the caller's address.
   * @param name - Human-readable display name for the watcher organisation.
   * @returns The assigned watcher ID and the transaction hash.
   * @throws {ConfigurationError} If the WatcherRegistered event is not found in the receipt.
   * @throws {ContractRevertError} If the registry contract reverts.
   */
  async createWatcher(name: string): Promise<CreateWatcherResult> {
    const receipt = await sendTx(
      (overrides) => this.ctx.registry.registerWatcher(name, ...(overrides ? [overrides] : [])),
      this.ctx,
    );

    const parsed = findEventLog(receipt, this.ctx.registryInterface, TOPIC0_WATCHER_REGISTERED);
    if (parsed) return { watcherId: BigInt(parsed.args[0]), txHash: receipt.hash };
    throw new ConfigurationError(
      `WatcherRegistered event not found in transaction (tx: ${receipt.hash}) — watcher ID could not be determined`,
    );
  }

  /**
   * Transfers ownership of a watcher to a new Ethereum address.
   * @param watcherId - The numeric ID of the watcher to transfer.
   * @param newOwner - Valid Ethereum address of the new owner.
   * @returns The transaction hash.
   * @throws {ConfigurationError} If `newOwner` is not a valid address.
   * @throws {ContractRevertError} If the caller is not the current owner.
   */
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

  /**
   * Estimates the gas cost of `createWatcher`.
   * @param name - The watcher name to use in the estimate.
   * @returns Estimated gas units as a bigint.
   */
  async estimateCreateWatcherGas(name: string): Promise<bigint> {
    try {
      return await this.ctx.registry.registerWatcher.estimateGas(name);
    } catch (error) {
      throw decodeContractError(error, this.ctx.registryInterface, this.ctx.resolverInterface);
    }
  }

  /**
   * Estimates the gas cost of `transferWatcherOwnership`.
   * @param watcherId - The watcher ID to transfer.
   * @param newOwner - Valid Ethereum address of the new owner.
   * @returns Estimated gas units as a bigint.
   * @throws {ConfigurationError} If `newOwner` is not a valid address.
   */
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
