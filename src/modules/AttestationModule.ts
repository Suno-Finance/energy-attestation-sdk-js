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
    const tx = await ctx.eas.attest({
      schema: ctx.schemaUID,
      data: {
        recipient: ZeroAddress,
        expirationTime: 0n,
        revocable: true,
        refUID,
        data,
        value: 0n,
      },
    }, overrides);

    const receipt = await tx.wait();

    let uid = "";
    for (const log of receipt.logs) {
      try {
        const parsed = ctx.eas.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (parsed?.name === "Attested") {
          uid = parsed.args.uid as string;
          break;
        }
      } catch {
        // Not an EAS log, skip
      }
    }

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

  async attest(params: AttestParams): Promise<AttestResult> {
    return submitAttestation(this.ctx, params, ZeroHash);
  }

  async overwriteAttestation(params: OverwriteAttestParams): Promise<AttestResult> {
    await validateOverwriteParams(this.ctx, params);
    // Single transaction: the resolver's onAttest hook detects the non-zero refUID,
    // validates the period, revokes the original internally, and records the replacement.
    // Direct EAS revocation is blocked by the resolver (DirectRevocationBlocked).
    return submitAttestation(this.ctx, params, params.refUID);
  }

  async estimateAttestGas(params: AttestParams): Promise<bigint> {
    return estimateAttestGas(this.ctx, params, ZeroHash);
  }

  async estimateOverwriteAttestationGas(params: OverwriteAttestParams): Promise<bigint> {
    await validateOverwriteParams(this.ctx, params);
    return estimateAttestGas(this.ctx, params, params.refUID);
  }

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
      const tx = await this.ctx.eas.multiAttest([
        { schema: this.ctx.schemaUID, data: attestationData },
      ], overrides);
      const receipt = await tx.wait();

      const uids: string[] = [];
      for (const log of receipt.logs) {
        try {
          const parsed = this.ctx.eas.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });
          if (parsed?.name === "Attested") {
            uids.push(parsed.args.uid as string);
          }
        } catch {
          // Not an EAS log, skip
        }
      }

      return { uids, txHash: receipt.hash as string };
    } catch (error) {
      throw decodeContractError(error, this.ctx.registryInterface, this.ctx.resolverInterface);
    }
  }

  async attestZeroPeriod(params: ZeroPeriodParams): Promise<AttestResult> {
    if (params.projectId <= 0) {
      throw new ConfigurationError("projectId must be a positive integer");
    }

    const lastTimestamp = await this.ctx.registry.getProjectLastTimestamp(params.projectId);
    const fromTimestamp = Number(BigInt(lastTimestamp));

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
        method: params.method ?? "0 report",
        metadataURI: params.metadataURI,
      },
      ZeroHash,
    );
  }

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

  async estimateAttestZeroPeriodGas(params: ZeroPeriodParams): Promise<bigint> {
    if (params.projectId <= 0) {
      throw new ConfigurationError("projectId must be a positive integer");
    }

    const lastTimestamp = await this.ctx.registry.getProjectLastTimestamp(params.projectId);
    const fromTimestamp = Number(BigInt(lastTimestamp));

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
        method: params.method ?? "0 report",
        metadataURI: params.metadataURI,
      },
      ZeroHash,
    );
  }

  async revokeAttestation(uid: string): Promise<TxResult> {
    if (!uid || uid === ZeroHash) {
      throw new ConfigurationError("uid must be a non-zero bytes32 attestation UID");
    }

    try {
      const overrides = await getTxOverrides(this.ctx);
      const tx = await this.ctx.eas.revoke({
        schema: this.ctx.schemaUID,
        data: { uid, value: 0n },
      }, overrides);
      const receipt = await tx.wait();
      return { txHash: receipt.hash as string };
    } catch (error) {
      throw decodeContractError(error, this.ctx.registryInterface, this.ctx.resolverInterface);
    }
  }

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
