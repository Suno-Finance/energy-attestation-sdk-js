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

  async addAttester(projectId: number | bigint, attester: string): Promise<TxResult> {
    validateAddress(attester, "attester");
    const receipt = await sendTx(
      (overrides) =>
        this.ctx.registry.addAttester(projectId, attester, ...(overrides ? [overrides] : [])),
      this.ctx,
    );
    return { txHash: receipt.hash };
  }

  async removeAttester(projectId: number | bigint, attester: string): Promise<TxResult> {
    validateAddress(attester, "attester");
    const receipt = await sendTx(
      (overrides) =>
        this.ctx.registry.removeAttester(projectId, attester, ...(overrides ? [overrides] : [])),
      this.ctx,
    );
    return { txHash: receipt.hash };
  }

  async addAttesters(projectId: number | bigint, attesters: string[]): Promise<TxResult> {
    validateAddresses(attesters, "attester");
    const receipt = await sendTx(
      (overrides) =>
        this.ctx.registry.addAttesters(projectId, attesters, ...(overrides ? [overrides] : [])),
      this.ctx,
    );
    return { txHash: receipt.hash };
  }

  async removeAttesters(projectId: number | bigint, attesters: string[]): Promise<TxResult> {
    validateAddresses(attesters, "attester");
    const receipt = await sendTx(
      (overrides) =>
        this.ctx.registry.removeAttesters(projectId, attesters, ...(overrides ? [overrides] : [])),
      this.ctx,
    );
    return { txHash: receipt.hash };
  }

  async addWatcherAttester(watcherId: number | bigint, attester: string): Promise<TxResult> {
    validateAddress(attester, "attester");
    const receipt = await sendTx(
      (overrides) =>
        this.ctx.registry.addWatcherAttester(watcherId, attester, ...(overrides ? [overrides] : [])),
      this.ctx,
    );
    return { txHash: receipt.hash };
  }

  async removeWatcherAttester(watcherId: number | bigint, attester: string): Promise<TxResult> {
    validateAddress(attester, "attester");
    const receipt = await sendTx(
      (overrides) =>
        this.ctx.registry.removeWatcherAttester(watcherId, attester, ...(overrides ? [overrides] : [])),
      this.ctx,
    );
    return { txHash: receipt.hash };
  }

  async estimateAddAttesterGas(projectId: number | bigint, attester: string): Promise<bigint> {
    try {
      return await this.ctx.registry.addAttester.estimateGas(projectId, attester);
    } catch (error) {
      throw decodeContractError(error, this.ctx.registryInterface, this.ctx.resolverInterface);
    }
  }

  async estimateRemoveAttesterGas(projectId: number | bigint, attester: string): Promise<bigint> {
    try {
      return await this.ctx.registry.removeAttester.estimateGas(projectId, attester);
    } catch (error) {
      throw decodeContractError(error, this.ctx.registryInterface, this.ctx.resolverInterface);
    }
  }

  async estimateAddAttestersGas(projectId: number | bigint, attesters: string[]): Promise<bigint> {
    try {
      return await this.ctx.registry.addAttesters.estimateGas(projectId, attesters);
    } catch (error) {
      throw decodeContractError(error, this.ctx.registryInterface, this.ctx.resolverInterface);
    }
  }

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
