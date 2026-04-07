import { isAddress } from "ethers";
import type { SDKContext, TxResult } from "../types.js";
import { ConfigurationError, decodeContractError } from "../errors.js";
import { sendTx } from "../utils/transaction.js";

export class EnergyTypeModule {
  constructor(private ctx: SDKContext) {}

  /**
   * Registers a new energy type on-chain.
   * Only callable by the energy type admin.
   * @param id - uint8 energy type ID (1–255; 0 is reserved for consumer).
   * @param name - Human-readable name for the energy type (e.g. "solar_pv").
   * @returns The transaction hash.
   * @throws {ConfigurationError} If `id` is 0 (reserved for consumer).
   * @throws {ContractRevertError} If the caller is not the energy type admin.
   */
  async registerEnergyType(id: number, name: string): Promise<TxResult> {
    if (id === 0) {
      throw new ConfigurationError(
        "Energy type ID 0 is reserved for consumer projects and cannot be registered",
      );
    }
    const receipt = await sendTx(
      (overrides) =>
        this.ctx.registry.registerEnergyType(id, name, ...(overrides ? [overrides] : [])),
      this.ctx,
    );
    return { txHash: receipt.hash };
  }

  /**
   * Removes an energy type from the registry.
   * Only callable by the energy type admin.
   * @param id - uint8 energy type ID to remove.
   * @returns The transaction hash.
   * @throws {ContractRevertError} If the caller is not the energy type admin.
   */
  async removeEnergyType(id: number): Promise<TxResult> {
    const receipt = await sendTx(
      (overrides) => this.ctx.registry.removeEnergyType(id, ...(overrides ? [overrides] : [])),
      this.ctx,
    );
    return { txHash: receipt.hash };
  }

  /**
   * Transfers the energy type admin role to a new address.
   * Only callable by the current energy type admin.
   * @param newAdmin - Valid Ethereum address of the new admin.
   * @returns The transaction hash.
   * @throws {ConfigurationError} If `newAdmin` is not a valid Ethereum address.
   * @throws {ContractRevertError} If the caller is not the current energy type admin.
   */
  async transferEnergyTypeAdmin(newAdmin: string): Promise<TxResult> {
    if (!isAddress(newAdmin)) {
      throw new ConfigurationError("newAdmin must be a valid Ethereum address");
    }
    const receipt = await sendTx(
      (overrides) =>
        this.ctx.registry.transferEnergyTypeAdmin(newAdmin, ...(overrides ? [overrides] : [])),
      this.ctx,
    );
    return { txHash: receipt.hash };
  }

  /**
   * Estimates the gas cost of `registerEnergyType`.
   * @param id - The energy type ID.
   * @param name - The energy type name.
   * @returns Estimated gas units as a bigint.
   */
  async estimateRegisterEnergyTypeGas(id: number, name: string): Promise<bigint> {
    try {
      return await this.ctx.registry.registerEnergyType.estimateGas(id, name);
    } catch (error) {
      throw decodeContractError(error, this.ctx.registryInterface, this.ctx.resolverInterface);
    }
  }

  /**
   * Estimates the gas cost of `removeEnergyType`.
   * @param id - The energy type ID.
   * @returns Estimated gas units as a bigint.
   */
  async estimateRemoveEnergyTypeGas(id: number): Promise<bigint> {
    try {
      return await this.ctx.registry.removeEnergyType.estimateGas(id);
    } catch (error) {
      throw decodeContractError(error, this.ctx.registryInterface, this.ctx.resolverInterface);
    }
  }

  /**
   * Estimates the gas cost of `transferEnergyTypeAdmin`.
   * @param newAdmin - The new admin address.
   * @returns Estimated gas units as a bigint.
   * @throws {ConfigurationError} If `newAdmin` is not a valid Ethereum address.
   */
  async estimateTransferEnergyTypeAdminGas(newAdmin: string): Promise<bigint> {
    if (!isAddress(newAdmin)) {
      throw new ConfigurationError("newAdmin must be a valid Ethereum address");
    }
    try {
      return await this.ctx.registry.transferEnergyTypeAdmin.estimateGas(newAdmin);
    } catch (error) {
      throw decodeContractError(error, this.ctx.registryInterface, this.ctx.resolverInterface);
    }
  }
}
