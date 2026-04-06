import { ZeroAddress, ZeroHash } from "ethers";
import type {
  SDKContext,
  AttestParams,
  OverwriteAttestParams,
  AttestResult,
  BatchAttestResult,
  TxResult,
  ZeroPeriodParams,
} from "../types.js";
import { encodeAttestationData, decodeAttestationData, computeToTimestamp } from "../encoding.js";
import { DEFAULT_ZERO_PERIOD_METHOD, TOPIC0_ATTESTED } from "../constants.js";
import { findEventLog, findAllEventLogs } from "../utils/events.js";
import { decodeContractError, ConfigurationError } from "../errors.js";
import { getTxOverrides } from "../utils/transaction.js";

function validateParams(params: AttestParams): void {
  if (params.projectId <= 0) {
    throw new ConfigurationError("projectId must be a positive integer");
  }
  if (params.readings.length === 0) {
    throw new ConfigurationError("readings must not be empty");
  }
  if (params.readingIntervalMinutes <= 0) {
    throw new ConfigurationError("readingIntervalMinutes must be a positive integer");
  }
  if (params.fromTimestamp <= 0) {
    throw new ConfigurationError("fromTimestamp must be a positive integer");
  }
  if (!params.method || params.method.trim().length === 0) {
    throw new ConfigurationError("method must not be empty");
  }
}

async function submitAttestation(
  ctx: SDKContext,
  params: AttestParams,
  refUID: string,
): Promise<AttestResult> {
  validateParams(params);

  const data = encodeAttestationData(params);

  try {
    const overrides = await getTxOverrides(ctx);
    const tx = await ctx.eas.attest(
      {
        schema: ctx.schemaUID,
        data: {
          recipient: ZeroAddress,
          expirationTime: 0n,
          revocable: true,
          refUID,
          data,
          value: 0n,
        },
      },
      overrides,
    );

    const receipt = await tx.wait();

    const attestedLog = findEventLog(receipt, ctx.eas.interface, TOPIC0_ATTESTED);
    const uid = attestedLog ? (attestedLog.args.uid as string) : "";

    return { uid, txHash: receipt.hash as string };
  } catch (error) {
    throw decodeContractError(error, ctx.registryInterface, ctx.resolverInterface);
  }
}

async function estimateAttestGas(
  ctx: SDKContext,
  params: AttestParams,
  refUID: string,
): Promise<bigint> {
  validateParams(params);

  const data = encodeAttestationData(params);

  try {
    return await ctx.eas.attest.estimateGas({
      schema: ctx.schemaUID,
      data: {
        recipient: ZeroAddress,
        expirationTime: 0n,
        revocable: true,
        refUID,
        data,
        value: 0n,
      },
    });
  } catch (error) {
    throw decodeContractError(error, ctx.registryInterface, ctx.resolverInterface);
  }
}

async function validateOverwriteParams(
  ctx: SDKContext,
  params: OverwriteAttestParams,
): Promise<void> {
  if (!params.refUID || params.refUID === ZeroHash) {
    throw new ConfigurationError("refUID must be a non-zero bytes32 attestation UID");
  }

  validateParams(params);

  // Pre-flight: fetch original to give clear errors before spending gas.
  // The resolver's onAttest hook enforces the same rules on-chain, but surfacing
  // them here avoids a failed transaction with a raw contract revert.
  const original = await ctx.eas.getAttestation(params.refUID);

  if (!original || original.uid === ZeroHash) {
    throw new ConfigurationError(`attestation ${params.refUID} does not exist`);
  }

  // Check the registry — not EAS revocationTime — because the resolver blocks direct
  // revocations, so revocationTime stays 0 forever even after a replacement is recorded.
  const replacementUID = await ctx.registry.getReplacementUID(params.refUID);
  if (replacementUID !== ZeroHash) {
    throw new ConfigurationError(
      `attestation ${params.refUID} is already replaced — it cannot be overwritten again`,
    );
  }

  // Decode original data and verify the replacement covers the exact same period.
  // The resolver contract enforces ReplacementPeriodMismatch on-chain, but we validate
  // here to surface a readable error message before the transaction is sent.
  const originalData = decodeAttestationData(original.data as string);
  const originalTo = computeToTimestamp(
    Number(originalData.fromTimestamp),
    originalData.readingCount,
    originalData.readingIntervalMinutes,
  );
  const replacementTo = computeToTimestamp(
    params.fromTimestamp,
    params.readings.length,
    params.readingIntervalMinutes,
  );

  if (BigInt(params.fromTimestamp) !== originalData.fromTimestamp) {
    throw new ConfigurationError(
      `fromTimestamp mismatch: replacement starts at ${params.fromTimestamp} but original starts at ${originalData.fromTimestamp}`,
    );
  }

  if (replacementTo !== originalTo) {
    throw new ConfigurationError(
      `toTimestamp mismatch: replacement ends at ${replacementTo} but original ends at ${originalTo} — period must be identical`,
    );
  }
}

export class AttestationModule {
  constructor(private ctx: SDKContext) {}

  /**
   * Submits a single energy attestation to EAS.
   * @param params - The attestation parameters including projectId, readings, and timestamps.
   * @returns The EAS attestation UID and transaction hash.
   * @throws {ConfigurationError} If the params fail validation.
   * @throws {ContractRevertError} If the resolver or EAS contract reverts.
   */
  async attest(params: AttestParams): Promise<AttestResult> {
    return submitAttestation(this.ctx, params, ZeroHash);
  }

  /**
   * Replaces an existing attestation by submitting a corrected one and revoking the original.
   * The replacement must cover the exact same time period as the original.
   * @param params - The attestation parameters plus `refUID` of the attestation to replace.
   * @returns The new attestation UID and transaction hash.
   * @throws {ConfigurationError} If the original attestation does not exist, is already replaced, or the period does not match.
   * @throws {ContractRevertError} If the resolver or EAS contract reverts.
   */
  async overwriteAttestation(params: OverwriteAttestParams): Promise<AttestResult> {
    await validateOverwriteParams(this.ctx, params);
    // Step 1: submit the replacement attestation (refUID triggers the resolver's replacement logic)
    const result = await submitAttestation(this.ctx, params, params.refUID);
    // Step 2: revoke the old attestation on EAS so it shows as revoked on EAS explorer.
    // The resolver's onRevoke now allows revocation of already-replaced attestations.
    try {
      const overrides = await getTxOverrides(this.ctx);
      const revokeTx = await this.ctx.eas.revoke(
        {
          schema: this.ctx.schemaUID,
          data: { uid: params.refUID, value: 0n },
        },
        overrides,
      );
      await revokeTx.wait();
    } catch (error) {
      throw decodeContractError(error, this.ctx.registryInterface, this.ctx.resolverInterface);
    }
    return result;
  }

  /** Estimates the gas cost of `attest`. */
  async estimateAttestGas(params: AttestParams): Promise<bigint> {
    return estimateAttestGas(this.ctx, params, ZeroHash);
  }

  /** Estimates the combined gas cost of `overwriteAttestation` (attest + revoke). */
  async estimateOverwriteAttestationGas(params: OverwriteAttestParams): Promise<bigint> {
    await validateOverwriteParams(this.ctx, params);
    const attestGas = await estimateAttestGas(this.ctx, params, params.refUID);
    let revokeGas: bigint;
    try {
      const estimated = await this.ctx.eas.revoke.estimateGas({
        schema: this.ctx.schemaUID,
        data: { uid: params.refUID, value: 0n },
      });
      revokeGas = typeof estimated === "bigint" ? estimated : 50_000n;
    } catch {
      revokeGas = 50_000n;
    }
    return attestGas + revokeGas;
  }

  /**
   * Submits multiple energy attestations in a single `multiAttest` transaction.
   * @param paramsList - Array of attestation parameter objects. Must not be empty.
   * @returns An array of EAS attestation UIDs and the transaction hash.
   * @throws {ConfigurationError} If `paramsList` is empty or any entry fails validation.
   * @throws {ContractRevertError} If the resolver or EAS contract reverts.
   */
  async attestBatch(paramsList: AttestParams[]): Promise<BatchAttestResult> {
    if (paramsList.length === 0) {
      throw new ConfigurationError("paramsList must not be empty");
    }
    for (const params of paramsList) {
      validateParams(params);
    }

    const attestationData = paramsList.map((params) => ({
      recipient: ZeroAddress,
      expirationTime: 0n,
      revocable: true,
      refUID: ZeroHash,
      data: encodeAttestationData(params),
      value: 0n,
    }));

    try {
      const overrides = await getTxOverrides(this.ctx);
      const tx = await this.ctx.eas.multiAttest(
        [{ schema: this.ctx.schemaUID, data: attestationData }],
        overrides,
      );
      const receipt = await tx.wait();

      const uids = findAllEventLogs(receipt, this.ctx.eas.interface, TOPIC0_ATTESTED).map(
        (p) => p.args.uid as string,
      );

      return { uids, txHash: receipt.hash as string };
    } catch (error) {
      throw decodeContractError(error, this.ctx.registryInterface, this.ctx.resolverInterface);
    }
  }

  /**
   * Submits a zero-energy attestation for a gap period (e.g. offline time or zero generation).
   * The `fromTimestamp` is automatically set to the project's last attested timestamp.
   * @param params - The zero period parameters including projectId and interval.
   * @returns The EAS attestation UID and transaction hash.
   * @throws {ConfigurationError} If the project has no prior attestation to anchor the period.
   * @throws {ContractRevertError} If the resolver or EAS contract reverts.
   */
  async attestZeroPeriod(params: ZeroPeriodParams): Promise<AttestResult> {
    if (params.projectId <= 0) {
      throw new ConfigurationError("projectId must be a positive integer");
    }

    const lastTimestamp = await this.ctx.registry.getProjectLastTimestamp(params.projectId);
    const fromTimestamp = Number(lastTimestamp);

    if (fromTimestamp <= 0) {
      throw new ConfigurationError(
        "project has no prior attestation — provide an explicit fromTimestamp via attest()",
      );
    }

    return submitAttestation(
      this.ctx,
      {
        projectId: params.projectId,
        readings: [0n],
        readingIntervalMinutes: params.interval,
        fromTimestamp,
        method: params.method ?? DEFAULT_ZERO_PERIOD_METHOD,
        metadataURI: params.metadataURI,
      },
      ZeroHash,
    );
  }

  /** Estimates the gas cost of `attestBatch`. */
  async estimateAttestBatchGas(paramsList: AttestParams[]): Promise<bigint> {
    if (paramsList.length === 0) {
      throw new ConfigurationError("paramsList must not be empty");
    }
    for (const params of paramsList) {
      validateParams(params);
    }

    const attestationData = paramsList.map((params) => ({
      recipient: ZeroAddress,
      expirationTime: 0n,
      revocable: true,
      refUID: ZeroHash,
      data: encodeAttestationData(params),
      value: 0n,
    }));

    try {
      return await this.ctx.eas.multiAttest.estimateGas([
        { schema: this.ctx.schemaUID, data: attestationData },
      ]);
    } catch (error) {
      throw decodeContractError(error, this.ctx.registryInterface, this.ctx.resolverInterface);
    }
  }

  /** Estimates the gas cost of `attestZeroPeriod`. */
  async estimateAttestZeroPeriodGas(params: ZeroPeriodParams): Promise<bigint> {
    if (params.projectId <= 0) {
      throw new ConfigurationError("projectId must be a positive integer");
    }

    const lastTimestamp = await this.ctx.registry.getProjectLastTimestamp(params.projectId);
    const fromTimestamp = Number(lastTimestamp);

    if (fromTimestamp <= 0) {
      throw new ConfigurationError(
        "project has no prior attestation — provide an explicit fromTimestamp via attest()",
      );
    }

    return estimateAttestGas(
      this.ctx,
      {
        projectId: params.projectId,
        readings: [0n],
        readingIntervalMinutes: params.interval,
        fromTimestamp,
        method: params.method ?? DEFAULT_ZERO_PERIOD_METHOD,
        metadataURI: params.metadataURI,
      },
      ZeroHash,
    );
  }

  /**
   * Revokes an attestation by UID on EAS.
   * @param uid - The bytes32 attestation UID to revoke.
   * @returns The transaction hash.
   * @throws {ConfigurationError} If `uid` is missing or zero.
   * @throws {ContractRevertError} If the resolver or EAS contract reverts.
   */
  async revokeAttestation(uid: string): Promise<TxResult> {
    if (!uid || uid === ZeroHash) {
      throw new ConfigurationError("uid must be a non-zero bytes32 attestation UID");
    }

    try {
      const overrides = await getTxOverrides(this.ctx);
      const tx = await this.ctx.eas.revoke(
        {
          schema: this.ctx.schemaUID,
          data: { uid, value: 0n },
        },
        overrides,
      );
      const receipt = await tx.wait();
      return { txHash: receipt.hash as string };
    } catch (error) {
      throw decodeContractError(error, this.ctx.registryInterface, this.ctx.resolverInterface);
    }
  }

  /** Estimates the gas cost of `revokeAttestation`. */
  async estimateRevokeAttestationGas(uid: string): Promise<bigint> {
    if (!uid || uid === ZeroHash) {
      throw new ConfigurationError("uid must be a non-zero bytes32 attestation UID");
    }

    try {
      return await this.ctx.eas.revoke.estimateGas({
        schema: this.ctx.schemaUID,
        data: { uid, value: 0n },
      });
    } catch (error) {
      throw decodeContractError(error, this.ctx.registryInterface, this.ctx.resolverInterface);
    }
  }
}
