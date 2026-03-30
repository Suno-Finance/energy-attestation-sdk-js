import type { SDKContext, CreateProjectResult, TxResult } from "../types.js";
import type { EnergyType } from "../types.js";
import { ConfigurationError, decodeContractError } from "../errors.js";
import { sendTx } from "../utils/transaction.js";

export class ProjectModule {
  constructor(private ctx: SDKContext) {}

  async createProject(
    watcherId: number | bigint,
    name: string,
    energyType: EnergyType | number,
  ): Promise<CreateProjectResult> {
    const receipt = await sendTx(
      (overrides) =>
        this.ctx.registry.registerProject(watcherId, name, energyType, ...(overrides ? [overrides] : [])),
      this.ctx,
    );

    for (const log of receipt.logs) {
      try {
        const parsed = this.ctx.registryInterface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (parsed?.name === "ProjectRegistered") {
          return { projectId: BigInt(parsed.args[0]), txHash: receipt.hash };
        }
      } catch {
        // Not a registry log, skip
      }
    }

    throw new ConfigurationError(
      "ProjectRegistered event not found in transaction logs — project ID could not be determined",
    );
  }

  async deregisterProject(projectId: number | bigint): Promise<TxResult> {
    const receipt = await sendTx(
      (overrides) => this.ctx.registry.deregisterProject(projectId, ...(overrides ? [overrides] : [])),
      this.ctx,
    );
    return { txHash: receipt.hash };
  }

  async transferProject(
    projectId: number | bigint,
    toWatcherId: number | bigint,
  ): Promise<TxResult> {
    const receipt = await sendTx(
      (overrides) =>
        this.ctx.registry.transferProject(projectId, toWatcherId, ...(overrides ? [overrides] : [])),
      this.ctx,
    );
    return { txHash: receipt.hash };
  }

  async setProjectMetadataURI(projectId: number | bigint, uri: string): Promise<TxResult> {
    const receipt = await sendTx(
      (overrides) =>
        this.ctx.registry.setProjectMetadataURI(projectId, uri, ...(overrides ? [overrides] : [])),
      this.ctx,
    );
    return { txHash: receipt.hash };
  }

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

  async estimateDeregisterProjectGas(projectId: number | bigint): Promise<bigint> {
    try {
      return await this.ctx.registry.deregisterProject.estimateGas(projectId);
    } catch (error) {
      throw decodeContractError(error, this.ctx.registryInterface, this.ctx.resolverInterface);
    }
  }

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

  async estimateSetProjectMetadataURIGas(
    projectId: number | bigint,
    uri: string,
  ): Promise<bigint> {
    try {
      return await this.ctx.registry.setProjectMetadataURI.estimateGas(projectId, uri);
    } catch (error) {
      throw decodeContractError(error, this.ctx.registryInterface, this.ctx.resolverInterface);
    }
  }
}
