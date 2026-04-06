import { describe, it, expect } from "vitest";
import { ZeroAddress, ZeroHash } from "ethers";
import { AttestationModule } from "../../src/modules/AttestationModule.js";
import { createMockContext, getMock, encodeRegistryError } from "../helpers/mocks.js";
import { ConfigurationError, ContractRevertError } from "../../src/errors.js";
import type { AttestParams } from "../../src/types.js";
import { encodeAttestationData } from "../../src/encoding.js";

const VALID_PARAMS: AttestParams = {
  projectId: 1,
  readings: [1000n, 2000n, 3000n],
  readingIntervalMinutes: 60,
  fromTimestamp: 1700000000,
  method: "iot",
};

describe("AttestationModule — gas estimation", () => {
  describe("estimateAttestGas", () => {
    it("returns estimated gas as bigint", async () => {
      const ctx = createMockContext();
      getMock(ctx.eas, "attest").estimateGas.mockResolvedValue(120000n);

      const mod = new AttestationModule(ctx);
      const gas = await mod.estimateAttestGas(VALID_PARAMS);

      expect(gas).toBe(120000n);
    });

    it("calls eas.attest.estimateGas with correct structure", async () => {
      const ctx = createMockContext();
      getMock(ctx.eas, "attest").estimateGas.mockResolvedValue(100000n);

      const mod = new AttestationModule(ctx);
      await mod.estimateAttestGas(VALID_PARAMS);

      const callArgs = getMock(ctx.eas, "attest").estimateGas.mock.calls[0][0];
      expect(callArgs.schema).toBe(ctx.schemaUID);
      expect(callArgs.data.refUID).toBe(ZeroHash);
      expect(callArgs.data.revocable).toBe(true);
    });

    it("throws ConfigurationError on invalid params", async () => {
      const ctx = createMockContext();
      const mod = new AttestationModule(ctx);
      await expect(mod.estimateAttestGas({ ...VALID_PARAMS, readings: [] })).rejects.toThrow(
        ConfigurationError,
      );
    });

    it("decodes contract revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("ProjectNotRegistered", [1]);
      getMock(ctx.eas, "attest").estimateGas.mockRejectedValue({ data });

      const mod = new AttestationModule(ctx);
      await expect(mod.estimateAttestGas(VALID_PARAMS)).rejects.toThrow(ContractRevertError);
    });
  });

  describe("estimateOverwriteAttestationGas", () => {
    const refUID = "0x" + "ee".repeat(32);

    function mockOriginalAttestation(
      ctx: ReturnType<typeof createMockContext>,
      params: AttestParams = VALID_PARAMS,
    ) {
      getMock(ctx.eas, "getAttestation").mockResolvedValue({
        uid: refUID,
        schema: ZeroHash,
        time: 0n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: ZeroHash,
        recipient: ZeroAddress,
        attester: ZeroAddress,
        revocable: true,
        data: encodeAttestationData(params),
      });
      // Registry reports no replacement by default
      getMock(ctx.registry, "getReplacementUID").mockResolvedValue(ZeroHash);
    }

    it("returns attest + revoke gas when both succeed", async () => {
      const ctx = createMockContext();
      mockOriginalAttestation(ctx);
      getMock(ctx.eas, "attest").estimateGas.mockResolvedValue(130000n);
      getMock(ctx.eas, "revoke").estimateGas.mockResolvedValue(40000n);

      const mod = new AttestationModule(ctx);
      const gas = await mod.estimateOverwriteAttestationGas({ ...VALID_PARAMS, refUID });

      expect(gas).toBe(170000n);
    });

    it("falls back to 50_000n when revoke estimation fails", async () => {
      const ctx = createMockContext();
      mockOriginalAttestation(ctx);
      getMock(ctx.eas, "attest").estimateGas.mockResolvedValue(130000n);
      getMock(ctx.eas, "revoke").estimateGas.mockRejectedValue(new Error("gas estimation failed"));

      const mod = new AttestationModule(ctx);
      const gas = await mod.estimateOverwriteAttestationGas({ ...VALID_PARAMS, refUID });

      expect(gas).toBe(180000n); // 130000n + 50_000n fallback
    });

    it("calls eas.attest.estimateGas with provided refUID", async () => {
      const ctx = createMockContext();
      mockOriginalAttestation(ctx);
      getMock(ctx.eas, "attest").estimateGas.mockResolvedValue(130000n);

      const mod = new AttestationModule(ctx);
      await mod.estimateOverwriteAttestationGas({ ...VALID_PARAMS, refUID });

      const callArgs = getMock(ctx.eas, "attest").estimateGas.mock.calls[0][0];
      expect(callArgs.data.refUID).toBe(refUID);
    });

    it("throws ConfigurationError on zero refUID", async () => {
      const ctx = createMockContext();
      const mod = new AttestationModule(ctx);
      await expect(
        mod.estimateOverwriteAttestationGas({ ...VALID_PARAMS, refUID: ZeroHash }),
      ).rejects.toThrow(ConfigurationError);
    });

    it("throws ConfigurationError on empty refUID", async () => {
      const ctx = createMockContext();
      const mod = new AttestationModule(ctx);
      await expect(
        mod.estimateOverwriteAttestationGas({ ...VALID_PARAMS, refUID: "" }),
      ).rejects.toThrow(ConfigurationError);
    });

    it("throws ConfigurationError when attestation does not exist", async () => {
      const ctx = createMockContext();
      getMock(ctx.eas, "getAttestation").mockResolvedValue({ uid: ZeroHash });

      const mod = new AttestationModule(ctx);
      await expect(
        mod.estimateOverwriteAttestationGas({ ...VALID_PARAMS, refUID }),
      ).rejects.toThrow(ConfigurationError);
    });

    it("throws ConfigurationError when attestation is already replaced", async () => {
      const ctx = createMockContext();
      mockOriginalAttestation(ctx);
      getMock(ctx.registry, "getReplacementUID").mockResolvedValue("0x" + "cc".repeat(32));

      const mod = new AttestationModule(ctx);
      await expect(
        mod.estimateOverwriteAttestationGas({ ...VALID_PARAMS, refUID }),
      ).rejects.toThrow(ConfigurationError);
    });

    it("throws ConfigurationError on fromTimestamp mismatch", async () => {
      const ctx = createMockContext();
      mockOriginalAttestation(ctx);

      const mod = new AttestationModule(ctx);
      await expect(
        mod.estimateOverwriteAttestationGas({
          ...VALID_PARAMS,
          fromTimestamp: VALID_PARAMS.fromTimestamp + 3600,
          refUID,
        }),
      ).rejects.toThrow(ConfigurationError);
    });

    it("throws ConfigurationError on toTimestamp mismatch", async () => {
      const ctx = createMockContext();
      mockOriginalAttestation(ctx);

      const mod = new AttestationModule(ctx);
      await expect(
        mod.estimateOverwriteAttestationGas({
          ...VALID_PARAMS,
          readings: [500n, 600n, 700n, 800n],
          refUID,
        }),
      ).rejects.toThrow(ConfigurationError);
    });

    it("validates attestation params before fetching original", async () => {
      const ctx = createMockContext();
      const mod = new AttestationModule(ctx);
      await expect(
        mod.estimateOverwriteAttestationGas({ ...VALID_PARAMS, projectId: 0, refUID }),
      ).rejects.toThrow(ConfigurationError);
      expect(getMock(ctx.eas, "getAttestation")).not.toHaveBeenCalled();
    });
  });
});
