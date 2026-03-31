import { isAddress } from "ethers";
import type { SDKContext, TxResult } from "../types.js";
import { ConfigurationError, decodeContractError } from "../errors.js";
import { sendTx } from "../utils/transaction.js";

function validateAddress(address: string, label: string): void {
  if (!isAddress(address)) {
    throw new ConfigurationError(`${label} must be a valid Ethereum address`);
  }
}

function validateAddresses(addresses: string[], label: string): void {
  for (const addr of addresses) {
    validateAddress(addr, label);
  }
}

export class AttesterModule {
  constructor(private ctx: SDKContext) {}

  /**
   * Authorises a single attester address to submit attestations for a project.
   * @param projectId - The project to authorise the attester for.
   * @param attester - Valid Ethereum address to authorise.
   * @returns The transaction hash.
   * @throws {ConfigurationError} If `attester` is not a valid address.
   * @throws {ContractRevertError} If the contract reverts.
   */
  async addAttester(projectId: number | bigint, attester: string): Promise<TxResult> {
    validateAddress(attester, "attester");
    const receipt = await sendTx(
      (overrides) =>
        this.ctx.registry.addAttester(projectId, attester, ...(overrides ? [overrides] : [])),
      this.ctx,
    );
    return { txHash: receipt.hash };
  }

  /**
   * Removes an attester's authorisation for a specific project.
   * @param projectId - The project to remove the attester from.
   * @param attester - Valid Ethereum address to deauthorise.
   * @returns The transaction hash.
   * @throws {ConfigurationError} If `attester` is not a valid address.
   * @throws {ContractRevertError} If the contract reverts.
   */
  async removeAttester(projectId: number | bigint, attester: string): Promise<TxResult> {
    validateAddress(attester, "attester");
    const receipt = await sendTx(
      (overrides) =>
        this.ctx.registry.removeAttester(projectId, attester, ...(overrides ? [overrides] : [])),
      this.ctx,
    );
    return { txHash: receipt.hash };
  }

  /**
   * Batch-authorises multiple attester addresses for a project in a single transaction.
   * @param projectId - The project to authorise the attesters for.
   * @param attesters - Array of valid Ethereum addresses to authorise.
   * @returns The transaction hash.
   * @throws {ConfigurationError} If any address in `attesters` is invalid.
   * @throws {ContractRevertError} If the contract reverts.
   */
  async addAttesters(projectId: number | bigint, attesters: string[]): Promise<TxResult> {
    validateAddresses(attesters, "attester");
    const receipt = await sendTx(
      (overrides) =>
        this.ctx.registry.addAttesters(projectId, attesters, ...(overrides ? [overrides] : [])),
      this.ctx,
    );
    return { txHash: receipt.hash };
  }

  /**
   * Batch-removes multiple attester authorisations for a project in a single transaction.
   * @param projectId - The project to deauthorise the attesters from.
   * @param attesters - Array of valid Ethereum addresses to deauthorise.
   * @returns The transaction hash.
   * @throws {ConfigurationError} If any address in `attesters` is invalid.
   * @throws {ContractRevertError} If the contract reverts.
   */
  async removeAttesters(projectId: number | bigint, attesters: string[]): Promise<TxResult> {
    validateAddresses(attesters, "attester");
    const receipt = await sendTx(
      (overrides) =>
        this.ctx.registry.removeAttesters(projectId, attesters, ...(overrides ? [overrides] : [])),
      this.ctx,
    );
    return { txHash: receipt.hash };
  }

  /**
   * Authorises an attester at the watcher level (applies to all projects under the watcher).
   * @param watcherId - The watcher to authorise the attester for.
   * @param attester - Valid Ethereum address to authorise.
   * @returns The transaction hash.
   * @throws {ConfigurationError} If `attester` is not a valid address.
   * @throws {ContractRevertError} If the contract reverts.
   */
  async addWatcherAttester(watcherId: number | bigint, attester: string): Promise<TxResult> {
    validateAddress(attester, "attester");
    const receipt = await sendTx(
      (overrides) =>
        this.ctx.registry.addWatcherAttester(watcherId, attester, ...(overrides ? [overrides] : [])),
      this.ctx,
    );
    return { txHash: receipt.hash };
  }

  /**
   * Removes a watcher-level attester authorisation.
   * @param watcherId - The watcher to remove the attester from.
   * @param attester - Valid Ethereum address to deauthorise.
   * @returns The transaction hash.
   * @throws {ConfigurationError} If `attester` is not a valid address.
   * @throws {ContractRevertError} If the contract reverts.
   */
  async removeWatcherAttester(watcherId: number | bigint, attester: string): Promise<TxResult> {
    validateAddress(attester, "attester");
    const receipt = await sendTx(
      (overrides) =>
        this.ctx.registry.removeWatcherAttester(watcherId, attester, ...(overrides ? [overrides] : [])),
      this.ctx,
    );
    return { txHash: receipt.hash };
  }

  /** Estimates the gas cost of `addAttester`. */
  async estimateAddAttesterGas(projectId: number | bigint, attester: string): Promise<bigint> {
    try {
      return await this.ctx.registry.addAttester.estimateGas(projectId, attester);
    } catch (error) {
      throw decodeContractError(error, this.ctx.registryInterface, this.ctx.resolverInterface);
    }
  }

  /** Estimates the gas cost of `removeAttester`. */
  async estimateRemoveAttesterGas(projectId: number | bigint, attester: string): Promise<bigint> {
    try {
      return await this.ctx.registry.removeAttester.estimateGas(projectId, attester);
    } catch (error) {
      throw decodeContractError(error, this.ctx.registryInterface, this.ctx.resolverInterface);
    }
  }

  /** Estimates the gas cost of `addAttesters`. */
  async estimateAddAttestersGas(projectId: number | bigint, attesters: string[]): Promise<bigint> {
    try {
      return await this.ctx.registry.addAttesters.estimateGas(projectId, attesters);
    } catch (error) {
      throw decodeContractError(error, this.ctx.registryInterface, this.ctx.resolverInterface);
    }
  }

  /** Estimates the gas cost of `removeAttesters`. */
  async estimateRemoveAttestersGas(
    projectId: number | bigint,
    attesters: string[],
  ): Promise<bigint> {
    try {
      return await this.ctx.registry.removeAttesters.estimateGas(projectId, attesters);
    } catch (error) {
      throw decodeContractError(error, this.ctx.registryInterface, this.ctx.resolverInterface);
    }
  }

  /** Estimates the gas cost of `addWatcherAttester`. */
  async estimateAddWatcherAttesterGas(
    watcherId: number | bigint,
    attester: string,
  ): Promise<bigint> {
    try {
      return await this.ctx.registry.addWatcherAttester.estimateGas(watcherId, attester);
    } catch (error) {
      throw decodeContractError(error, this.ctx.registryInterface, this.ctx.resolverInterface);
    }
  }

  /** Estimates the gas cost of `removeWatcherAttester`. */
  async estimateRemoveWatcherAttesterGas(
    watcherId: number | bigint,
    attester: string,
  ): Promise<bigint> {
    try {
      return await this.ctx.registry.removeWatcherAttester.estimateGas(watcherId, attester);
    } catch (error) {
      throw decodeContractError(error, this.ctx.registryInterface, this.ctx.resolverInterface);
    }
  }
}
