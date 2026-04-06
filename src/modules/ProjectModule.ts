import type { SDKContext, CreateProjectResult, TxResult } from "../types.js";
import type { EnergyType } from "../types.js";
import { ConfigurationError, decodeContractError } from "../errors.js";
import { sendTx } from "../utils/transaction.js";
import { findEventLog } from "../utils/events.js";
import { TOPIC0_PROJECT_REGISTERED } from "../constants.js";

export class ProjectModule {
  constructor(private ctx: SDKContext) {}

  /**
   * Registers a new energy project under a watcher.
   * @param watcherId - ID of the watcher that owns this project.
   * @param name - Human-readable name for the project.
   * @param energyType - Energy type enum value or numeric type ID.
   * @returns The assigned project ID and the transaction hash.
   * @throws {ConfigurationError} If the energy type is not registered, or if the event is not found in the receipt.
   * @throws {ContractRevertError} If the registry contract reverts.
   */
  async createProject(
    watcherId: number | bigint,
    name: string,
    energyType: EnergyType | number,
  ): Promise<CreateProjectResult> {
    // energyType 0 (consumer) is always valid — the contract allows it without registration.
    const isRegistered =
      energyType === 0 || (await this.ctx.registry.isEnergyTypeRegistered(energyType));
    if (!isRegistered) {
      throw new ConfigurationError(`Energy type ${energyType} is not registered`);
    }

    const receipt = await sendTx(
      (overrides) =>
        this.ctx.registry.registerProject(
          watcherId,
          name,
          energyType,
          ...(overrides ? [overrides] : []),
        ),
      this.ctx,
    );

    const parsed = findEventLog(receipt, this.ctx.registryInterface, TOPIC0_PROJECT_REGISTERED);
    if (parsed) return { projectId: BigInt(parsed.args[0]), txHash: receipt.hash };
    throw new ConfigurationError(
      `ProjectRegistered event not found in transaction (tx: ${receipt.hash}) — project ID could not be determined`,
    );
  }

  /**
   * Deregisters a project, preventing future attestations.
   * @param projectId - The numeric ID of the project to deregister.
   * @returns The transaction hash.
   * @throws {ContractRevertError} If the contract reverts (e.g. caller is not the watcher owner).
   */
  async deregisterProject(projectId: number | bigint): Promise<TxResult> {
    const receipt = await sendTx(
      (overrides) =>
        this.ctx.registry.deregisterProject(projectId, ...(overrides ? [overrides] : [])),
      this.ctx,
    );
    return { txHash: receipt.hash };
  }

  /**
   * Transfers a project to a different watcher.
   * @param projectId - The numeric ID of the project to transfer.
   * @param toWatcherId - The numeric ID of the destination watcher.
   * @returns The transaction hash.
   * @throws {ContractRevertError} If the contract reverts.
   */
  async transferProject(
    projectId: number | bigint,
    toWatcherId: number | bigint,
  ): Promise<TxResult> {
    const receipt = await sendTx(
      (overrides) =>
        this.ctx.registry.transferProject(
          projectId,
          toWatcherId,
          ...(overrides ? [overrides] : []),
        ),
      this.ctx,
    );
    return { txHash: receipt.hash };
  }

  /**
   * Sets the metadata URI for a project (e.g. an IPFS or HTTPS link to project details).
   * @param projectId - The numeric ID of the project to update.
   * @param uri - The new metadata URI string.
   * @returns The transaction hash.
   * @throws {ContractRevertError} If the contract reverts.
   */
  async setProjectMetadataURI(projectId: number | bigint, uri: string): Promise<TxResult> {
    const receipt = await sendTx(
      (overrides) =>
        this.ctx.registry.setProjectMetadataURI(projectId, uri, ...(overrides ? [overrides] : [])),
      this.ctx,
    );
    return { txHash: receipt.hash };
  }

  /**
   * Estimates the gas cost of `createProject`.
   * @param watcherId - The watcher ID to use in the estimate.
   * @param name - The project name to use in the estimate.
   * @param energyType - The energy type value to use in the estimate.
   * @returns Estimated gas units as a bigint.
   */
  async estimateCreateProjectGas(
    watcherId: number | bigint,
    name: string,
    energyType: EnergyType | number,
  ): Promise<bigint> {
    try {
      return await this.ctx.registry.registerProject.estimateGas(watcherId, name, energyType);
    } catch (error) {
      throw decodeContractError(error, this.ctx.registryInterface, this.ctx.resolverInterface);
    }
  }

  /**
   * Estimates the gas cost of `deregisterProject`.
   * @param projectId - The project ID to use in the estimate.
   * @returns Estimated gas units as a bigint.
   */
  async estimateDeregisterProjectGas(projectId: number | bigint): Promise<bigint> {
    try {
      return await this.ctx.registry.deregisterProject.estimateGas(projectId);
    } catch (error) {
      throw decodeContractError(error, this.ctx.registryInterface, this.ctx.resolverInterface);
    }
  }

  /**
   * Estimates the gas cost of `transferProject`.
   * @param projectId - The project ID to use in the estimate.
   * @param toWatcherId - The destination watcher ID to use in the estimate.
   * @returns Estimated gas units as a bigint.
   */
  async estimateTransferProjectGas(
    projectId: number | bigint,
    toWatcherId: number | bigint,
  ): Promise<bigint> {
    try {
      return await this.ctx.registry.transferProject.estimateGas(projectId, toWatcherId);
    } catch (error) {
      throw decodeContractError(error, this.ctx.registryInterface, this.ctx.resolverInterface);
    }
  }

  /**
   * Estimates the gas cost of `setProjectMetadataURI`.
   * @param projectId - The project ID to use in the estimate.
   * @param uri - The metadata URI to use in the estimate.
   * @returns Estimated gas units as a bigint.
   */
  async estimateSetProjectMetadataURIGas(projectId: number | bigint, uri: string): Promise<bigint> {
    try {
      return await this.ctx.registry.setProjectMetadataURI.estimateGas(projectId, uri);
    } catch (error) {
      throw decodeContractError(error, this.ctx.registryInterface, this.ctx.resolverInterface);
    }
  }
}
