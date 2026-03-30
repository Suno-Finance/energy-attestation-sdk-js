import { describe, it, expect } from "vitest";
import { ZeroHash } from "ethers";
import { AttestationModule } from "../../src/modules/AttestationModule.js";
import {
  createMockContext,
  createMockTx,
  createMockReceipt,
  getMock,
  encodeRegistryError,
} from "../helpers/mocks.js";
import { ConfigurationError, ContractRevertError } from "../../src/errors.js";

const VALID_UID = "0x" + "aa".repeat(32);

describe("AttestationModule.revokeAttestation", () => {
  it("calls eas.revoke with correct structure", async () => {
    const ctx = createMockContext();
    const receipt = createMockReceipt([], "0xrevokehash");
    getMock(ctx.eas, "revoke").mockResolvedValue(createMockTx(receipt));

    const mod = new AttestationModule(ctx);
    const result = await mod.revokeAttestation(VALID_UID);

    expect(result.txHash).toBe("0xrevokehash");
    const callArgs = getMock(ctx.eas, "revoke").mock.calls[0][0];
    expect(callArgs.schema).toBe(ctx.schemaUID);
    expect(callArgs.data.uid).toBe(VALID_UID);
    expect(callArgs.data.value).toBe(0n);
  });

  it("throws ConfigurationError for empty uid", async () => {
    const ctx = createMockContext();
    const mod = new AttestationModule(ctx);
    await expect(mod.revokeAttestation("")).rejects.toThrow(ConfigurationError);
  });

  it("throws ConfigurationError for ZeroHash uid", async () => {
    const ctx = createMockContext();
    const mod = new AttestationModule(ctx);
    await expect(mod.revokeAttestation(ZeroHash)).rejects.toThrow(ConfigurationError);
  });

  it("decodes contract revert into ContractRevertError", async () => {
    const ctx = createMockContext();
    const data = encodeRegistryError("AttestationNotFound", [VALID_UID]);
    getMock(ctx.eas, "revoke").mockRejectedValue({ data });

    const mod = new AttestationModule(ctx);
    await expect(mod.revokeAttestation(VALID_UID)).rejects.toThrow(ContractRevertError);
  });
});

describe("AttestationModule.estimateRevokeAttestationGas", () => {
  it("returns estimated gas as bigint", async () => {
    const ctx = createMockContext();
    getMock(ctx.eas, "revoke").estimateGas.mockResolvedValue(45000n);

    const mod = new AttestationModule(ctx);
    const gas = await mod.estimateRevokeAttestationGas(VALID_UID);

    expect(gas).toBe(45000n);
  });

  it("calls estimateGas with correct schema and uid", async () => {
    const ctx = createMockContext();
    getMock(ctx.eas, "revoke").estimateGas.mockResolvedValue(45000n);

    const mod = new AttestationModule(ctx);
    await mod.estimateRevokeAttestationGas(VALID_UID);

    const callArgs = getMock(ctx.eas, "revoke").estimateGas.mock.calls[0][0];
    expect(callArgs.schema).toBe(ctx.schemaUID);
    expect(callArgs.data.uid).toBe(VALID_UID);
    expect(callArgs.data.value).toBe(0n);
  });

  it("throws ConfigurationError for empty uid", async () => {
    const ctx = createMockContext();
    const mod = new AttestationModule(ctx);
    await expect(mod.estimateRevokeAttestationGas("")).rejects.toThrow(ConfigurationError);
  });

  it("throws ConfigurationError for ZeroHash uid", async () => {
    const ctx = createMockContext();
    const mod = new AttestationModule(ctx);
    await expect(mod.estimateRevokeAttestationGas(ZeroHash)).rejects.toThrow(ConfigurationError);
  });

  it("decodes contract revert into ContractRevertError", async () => {
    const ctx = createMockContext();
    const data = encodeRegistryError("AttestationNotFound", [VALID_UID]);
    getMock(ctx.eas, "revoke").estimateGas.mockRejectedValue({ data });

    const mod = new AttestationModule(ctx);
    await expect(mod.estimateRevokeAttestationGas(VALID_UID)).rejects.toThrow(ContractRevertError);
  });
});
