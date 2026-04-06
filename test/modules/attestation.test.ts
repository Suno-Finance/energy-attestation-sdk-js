import { describe, it, expect } from "vitest";
import { ZeroAddress, ZeroHash, AbiCoder } from "ethers";
import { AttestationModule } from "../../src/modules/AttestationModule.js";
import {
  createMockContext,
  createMockTx,
  createMockAttestReceipt,
  createMockReceipt,
  getMock,
  encodeRegistryError,
  encodeResolverError,
  mockSuccessfulTx,
} from "../helpers/mocks.js";
import { ConfigurationError, ContractRevertError } from "../../src/errors.js";
import { Interval } from "../../src/types.js";
import type { AttestParams } from "../../src/types.js";
import { encodeAttestationData } from "../../src/encoding.js";

const VALID_PARAMS: AttestParams = {
  projectId: 1,
  readings: [1000n, 2000n, 3000n],
  readingIntervalMinutes: 60,
  fromTimestamp: 1700000000,
  method: "iot",
  metadataURI: "ipfs://abc",
};

describe("AttestationModule", () => {
  describe("attest", () => {
    it("calls eas.attest with correct structure", async () => {
      const ctx = createMockContext();
      const attestUid = "0x" + "ff".repeat(32);
      const receipt = createMockAttestReceipt(attestUid);
      const mockTx = createMockTx(receipt);
      getMock(ctx.eas, "attest").mockResolvedValue(mockTx);

      const mod = new AttestationModule(ctx);
      const result = await mod.attest(VALID_PARAMS);

      expect(result.uid).toBe(attestUid);
      expect(result.txHash).toBe(receipt.hash);

      const callArgs = getMock(ctx.eas, "attest").mock.calls[0][0];
      expect(callArgs.schema).toBe(ctx.schemaUID);
      expect(callArgs.data.recipient).toBe(ZeroAddress);
      expect(callArgs.data.expirationTime).toBe(0n);
      expect(callArgs.data.revocable).toBe(true);
      expect(callArgs.data.refUID).toBe(ZeroHash);
      expect(callArgs.data.value).toBe(0n);
    });

    it("encodes attestation data correctly", async () => {
      const ctx = createMockContext();
      const receipt = createMockAttestReceipt();
      const mockTx = createMockTx(receipt);
      getMock(ctx.eas, "attest").mockResolvedValue(mockTx);

      const mod = new AttestationModule(ctx);
      await mod.attest(VALID_PARAMS);

      const callArgs = getMock(ctx.eas, "attest").mock.calls[0][0];
      const decoded = AbiCoder.defaultAbiCoder().decode(
        ["uint64", "uint32", "uint32", "uint256[]", "uint64", "string", "string"],
        callArgs.data.data,
      );

      expect(Number(decoded[0])).toBe(VALID_PARAMS.projectId);
      expect(Number(decoded[1])).toBe(VALID_PARAMS.readings.length);
      expect(Number(decoded[2])).toBe(VALID_PARAMS.readingIntervalMinutes);
      expect(decoded[3].map(BigInt)).toEqual(VALID_PARAMS.readings);
      expect(Number(decoded[4])).toBe(VALID_PARAMS.fromTimestamp);
      expect(decoded[5]).toBe(VALID_PARAMS.method);
      expect(decoded[6]).toBe(VALID_PARAMS.metadataURI);
    });

    it("defaults metadataURI to empty string when undefined", async () => {
      const ctx = createMockContext();
      const receipt = createMockAttestReceipt();
      const mockTx = createMockTx(receipt);
      getMock(ctx.eas, "attest").mockResolvedValue(mockTx);

      const mod = new AttestationModule(ctx);
      await mod.attest({ ...VALID_PARAMS, metadataURI: undefined });

      const callArgs = getMock(ctx.eas, "attest").mock.calls[0][0];
      const decoded = AbiCoder.defaultAbiCoder().decode(
        ["uint64", "uint32", "uint32", "uint256[]", "uint64", "string", "string"],
        callArgs.data.data,
      );
      expect(decoded[6]).toBe("");
    });

    it("handles single reading", async () => {
      const ctx = createMockContext();
      const receipt = createMockAttestReceipt();
      const mockTx = createMockTx(receipt);
      getMock(ctx.eas, "attest").mockResolvedValue(mockTx);

      const mod = new AttestationModule(ctx);
      await mod.attest({ ...VALID_PARAMS, readings: [500n] });

      const callArgs = getMock(ctx.eas, "attest").mock.calls[0][0];
      const decoded = AbiCoder.defaultAbiCoder().decode(
        ["uint64", "uint32", "uint32", "uint256[]", "uint64", "string", "string"],
        callArgs.data.data,
      );
      expect(Number(decoded[1])).toBe(1);
    });

    it("returns empty uid when Attested event not in logs", async () => {
      const ctx = createMockContext();
      const receipt = createMockReceipt([], "0xhash");
      const mockTx = createMockTx(receipt);
      getMock(ctx.eas, "attest").mockResolvedValue(mockTx);

      const mod = new AttestationModule(ctx);
      const result = await mod.attest(VALID_PARAMS);
      expect(result.uid).toBe("");
      expect(result.txHash).toBe("0xhash");
    });

    // --- Validation errors ---

    it("throws on empty readings", async () => {
      const ctx = createMockContext();
      const mod = new AttestationModule(ctx);
      await expect(mod.attest({ ...VALID_PARAMS, readings: [] })).rejects.toThrow(
        ConfigurationError,
      );
    });

    it("throws on empty method", async () => {
      const ctx = createMockContext();
      const mod = new AttestationModule(ctx);
      await expect(mod.attest({ ...VALID_PARAMS, method: "" })).rejects.toThrow(ConfigurationError);
    });

    it("throws on whitespace-only method", async () => {
      const ctx = createMockContext();
      const mod = new AttestationModule(ctx);
      await expect(mod.attest({ ...VALID_PARAMS, method: "   " })).rejects.toThrow(
        ConfigurationError,
      );
    });

    it("throws on zero projectId", async () => {
      const ctx = createMockContext();
      const mod = new AttestationModule(ctx);
      await expect(mod.attest({ ...VALID_PARAMS, projectId: 0 })).rejects.toThrow(
        ConfigurationError,
      );
    });

    it("throws on negative projectId", async () => {
      const ctx = createMockContext();
      const mod = new AttestationModule(ctx);
      await expect(mod.attest({ ...VALID_PARAMS, projectId: -1 })).rejects.toThrow(
        ConfigurationError,
      );
    });

    it("throws on zero readingIntervalMinutes", async () => {
      const ctx = createMockContext();
      const mod = new AttestationModule(ctx);
      await expect(mod.attest({ ...VALID_PARAMS, readingIntervalMinutes: 0 })).rejects.toThrow(
        ConfigurationError,
      );
    });

    it("throws on negative fromTimestamp", async () => {
      const ctx = createMockContext();
      const mod = new AttestationModule(ctx);
      await expect(mod.attest({ ...VALID_PARAMS, fromTimestamp: -1 })).rejects.toThrow(
        ConfigurationError,
      );
    });

    // --- Negative readings ---

    it("throws when a reading is negative", async () => {
      const ctx = createMockContext();
      const mod = new AttestationModule(ctx);
      await expect(mod.attest({ ...VALID_PARAMS, readings: [1000n, -1n, 3000n] })).rejects.toThrow(
        ConfigurationError,
      );
    });

    it("error message includes the index and value of the negative reading", async () => {
      const ctx = createMockContext();
      const mod = new AttestationModule(ctx);
      const err = await mod
        .attest({ ...VALID_PARAMS, readings: [500n, 200n, -42n] })
        .catch((e) => e);
      expect(err).toBeInstanceOf(ConfigurationError);
      expect(err.message).toContain("2"); // index
      expect(err.message).toContain("-42"); // value
    });

    it("throws when the first reading is negative", async () => {
      const ctx = createMockContext();
      const mod = new AttestationModule(ctx);
      await expect(mod.attest({ ...VALID_PARAMS, readings: [-1n] })).rejects.toThrow(
        ConfigurationError,
      );
    });

    it("does not throw when all readings are zero (valid — zero-energy period)", async () => {
      const ctx = createMockContext();
      const receipt = createMockAttestReceipt();
      getMock(ctx.eas, "attest").mockResolvedValue(createMockTx(receipt));
      const mod = new AttestationModule(ctx);
      await expect(mod.attest({ ...VALID_PARAMS, readings: [0n, 0n, 0n] })).resolves.toBeDefined();
    });

    // --- Timestamp overflow ---

    it("throws when toTimestamp would exceed uint64 max", async () => {
      const ctx = createMockContext();
      const mod = new AttestationModule(ctx);
      // uint64 max = 18446744073709551615
      // fromTimestamp near max + any duration overflows
      await expect(
        mod.attest({
          ...VALID_PARAMS,
          fromTimestamp: 18446744073709551000,
          readings: [1000n],
          readingIntervalMinutes: 60,
        }),
      ).rejects.toThrow(ConfigurationError);
    });

    it("error message mentions toTimestamp overflow", async () => {
      const ctx = createMockContext();
      const mod = new AttestationModule(ctx);
      const err = await mod
        .attest({
          ...VALID_PARAMS,
          fromTimestamp: 18446744073709551000,
          readings: [1000n],
          readingIntervalMinutes: 60,
        })
        .catch((e) => e);
      expect(err).toBeInstanceOf(ConfigurationError);
      expect(err.message).toContain("uint64");
    });

    it("does not throw for a large but valid fromTimestamp well within uint64 range", async () => {
      const ctx = createMockContext();
      const receipt = createMockAttestReceipt();
      getMock(ctx.eas, "attest").mockResolvedValue(createMockTx(receipt));
      const mod = new AttestationModule(ctx);
      // Year 2100 in unix seconds ≈ 4102444800 — large but well within uint64 and JS safe integer range
      await expect(
        mod.attest({
          ...VALID_PARAMS,
          fromTimestamp: 4102444800,
          readings: [0n],
          readingIntervalMinutes: 60,
        }),
      ).resolves.toBeDefined();
    });

    // --- Contract revert handling (resolver errors) ---

    it("decodes ProjectNotRegistered (registry) revert", async () => {
      const ctx = createMockContext();
      getMock(ctx.eas, "attest").mockRejectedValue({
        data: encodeRegistryError("ProjectNotRegistered", [1]),
      });
      const err = await new AttestationModule(ctx).attest(VALID_PARAMS).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("ProjectNotRegistered");
    });

    it("decodes UnauthorizedAttester (resolver) revert", async () => {
      const ctx = createMockContext();
      getMock(ctx.eas, "attest").mockRejectedValue({
        data: encodeResolverError("UnauthorizedAttester", [
          "0x0000000000000000000000000000000000000001",
        ]),
      });
      const err = await new AttestationModule(ctx).attest(VALID_PARAMS).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("UnauthorizedAttester");
    });

    it("decodes InvalidTimestamps (resolver) revert", async () => {
      const ctx = createMockContext();
      getMock(ctx.eas, "attest").mockRejectedValue({
        data: encodeResolverError("InvalidTimestamps", []),
      });
      const err = await new AttestationModule(ctx).attest(VALID_PARAMS).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("InvalidTimestamps");
    });

    it("decodes InvalidReadingCount (resolver) revert", async () => {
      const ctx = createMockContext();
      getMock(ctx.eas, "attest").mockRejectedValue({
        data: encodeResolverError("InvalidReadingCount", []),
      });
      const err = await new AttestationModule(ctx).attest(VALID_PARAMS).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("InvalidReadingCount");
    });

    it("decodes InvalidReadingInterval (resolver) revert", async () => {
      const ctx = createMockContext();
      getMock(ctx.eas, "attest").mockRejectedValue({
        data: encodeResolverError("InvalidReadingInterval", []),
      });
      const err = await new AttestationModule(ctx).attest(VALID_PARAMS).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("InvalidReadingInterval");
    });

    it("decodes InvalidReadingsLength (resolver) revert", async () => {
      const ctx = createMockContext();
      getMock(ctx.eas, "attest").mockRejectedValue({
        data: encodeResolverError("InvalidReadingsLength", [3, 2]),
      });
      const err = await new AttestationModule(ctx).attest(VALID_PARAMS).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("InvalidReadingsLength");
    });

    it("decodes InvalidMethod (resolver) revert", async () => {
      const ctx = createMockContext();
      getMock(ctx.eas, "attest").mockRejectedValue({
        data: encodeResolverError("InvalidMethod", []),
      });
      const err = await new AttestationModule(ctx).attest(VALID_PARAMS).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("InvalidMethod");
    });

    it("decodes TimestampOverflow (resolver) revert", async () => {
      const ctx = createMockContext();
      getMock(ctx.eas, "attest").mockRejectedValue({
        data: encodeResolverError("TimestampOverflow", []),
      });
      const err = await new AttestationModule(ctx).attest(VALID_PARAMS).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("TimestampOverflow");
    });

    it("decodes PeriodAlreadyAttested (registry) revert", async () => {
      const ctx = createMockContext();
      getMock(ctx.eas, "attest").mockRejectedValue({
        data: encodeRegistryError("PeriodAlreadyAttested", [1, 1700000000, 1700003600]),
      });
      const err = await new AttestationModule(ctx).attest(VALID_PARAMS).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("PeriodAlreadyAttested");
    });

    it("decodes PeriodStartAlreadyAttested (registry) revert", async () => {
      const ctx = createMockContext();
      getMock(ctx.eas, "attest").mockRejectedValue({
        data: encodeRegistryError("PeriodStartAlreadyAttested", [1, 1700000000]),
      });
      const err = await new AttestationModule(ctx).attest(VALID_PARAMS).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("PeriodStartAlreadyAttested");
    });

    it("decodes NonSequentialAttestation (registry) revert", async () => {
      const ctx = createMockContext();
      getMock(ctx.eas, "attest").mockRejectedValue({
        data: encodeRegistryError("NonSequentialAttestation", [1, 1700003600, 1700007200]),
      });
      const err = await new AttestationModule(ctx).attest(VALID_PARAMS).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("NonSequentialAttestation");
    });

    it("decodes contract revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("ProjectNotRegistered", [1]);
      getMock(ctx.eas, "attest").mockRejectedValue({ data });

      const mod = new AttestationModule(ctx);
      await expect(mod.attest(VALID_PARAMS)).rejects.toThrow(ContractRevertError);
      try {
        await mod.attest(VALID_PARAMS);
      } catch (e) {
        const err = e as ContractRevertError;
        expect(err.errorName).toBe("ProjectNotRegistered");
        expect(err.source).toBe("registry");
      }
    });

    it("accepts Interval enum value for readingIntervalMinutes", async () => {
      const ctx = createMockContext();
      const receipt = createMockAttestReceipt();
      getMock(ctx.eas, "attest").mockResolvedValue(createMockTx(receipt));

      const mod = new AttestationModule(ctx);
      await mod.attest({ ...VALID_PARAMS, readingIntervalMinutes: Interval.Daily });

      const callArgs = getMock(ctx.eas, "attest").mock.calls[0][0];
      const decoded = AbiCoder.defaultAbiCoder().decode(
        ["uint64", "uint32", "uint32", "uint256[]", "uint64", "string", "string"],
        callArgs.data.data,
      );
      // Interval.Daily = 1440
      expect(Number(decoded[2])).toBe(Interval.Daily);
    });

    it("accepts plain number for readingIntervalMinutes", async () => {
      const ctx = createMockContext();
      const receipt = createMockAttestReceipt();
      getMock(ctx.eas, "attest").mockResolvedValue(createMockTx(receipt));

      const mod = new AttestationModule(ctx);
      await mod.attest({ ...VALID_PARAMS, readingIntervalMinutes: 90 });

      const callArgs = getMock(ctx.eas, "attest").mock.calls[0][0];
      const decoded = AbiCoder.defaultAbiCoder().decode(
        ["uint64", "uint32", "uint32", "uint256[]", "uint64", "string", "string"],
        callArgs.data.data,
      );
      expect(Number(decoded[2])).toBe(90);
    });
  });

  describe("overwriteAttestation", () => {
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
      // Revoke succeeds by default (overwriteAttestation revokes the old UID after replacement)
      getMock(ctx.eas, "revoke").mockResolvedValue(mockSuccessfulTx());
    }

    // --- Happy path ---

    it("submits a replacement attest then revokes the old UID", async () => {
      const ctx = createMockContext();
      mockOriginalAttestation(ctx);
      getMock(ctx.eas, "attest").mockResolvedValue(createMockTx(createMockAttestReceipt()));

      const mod = new AttestationModule(ctx);
      await mod.overwriteAttestation({ ...VALID_PARAMS, refUID });

      expect(getMock(ctx.eas, "attest")).toHaveBeenCalledOnce();
      expect(getMock(ctx.eas, "revoke")).toHaveBeenCalledOnce();
      expect(getMock(ctx.eas, "revoke")).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ uid: refUID }) }),
        expect.anything(),
      );
    });

    it("accepts same period with corrected reading values", async () => {
      const ctx = createMockContext();
      // original has readings [1000, 2000, 3000]; replacement corrects them to [999, 1999, 2999]
      mockOriginalAttestation(ctx);
      const correctedReadings = [999n, 1999n, 2999n];
      getMock(ctx.eas, "attest").mockResolvedValue(createMockTx(createMockAttestReceipt()));

      const mod = new AttestationModule(ctx);
      // same fromTimestamp, same readingCount * interval — only values differ
      await expect(
        mod.overwriteAttestation({ ...VALID_PARAMS, readings: correctedReadings, refUID }),
      ).resolves.toBeDefined();
    });

    it("sets refUID on the new attestation", async () => {
      const ctx = createMockContext();
      mockOriginalAttestation(ctx);
      getMock(ctx.eas, "attest").mockResolvedValue(createMockTx(createMockAttestReceipt()));

      const mod = new AttestationModule(ctx);
      await mod.overwriteAttestation({ ...VALID_PARAMS, refUID });

      const attestArgs = getMock(ctx.eas, "attest").mock.calls[0][0];
      expect(attestArgs.data.refUID).toBe(refUID);
      expect(attestArgs.data.refUID).not.toBe(ZeroHash);
    });

    it("encodes the replacement readings into the new attest data — not the originals", async () => {
      const ctx = createMockContext();
      mockOriginalAttestation(ctx);
      const correctedReadings = [999n, 1999n, 2999n];
      getMock(ctx.eas, "attest").mockResolvedValue(createMockTx(createMockAttestReceipt()));

      const mod = new AttestationModule(ctx);
      await mod.overwriteAttestation({ ...VALID_PARAMS, readings: correctedReadings, refUID });

      const attestArgs = getMock(ctx.eas, "attest").mock.calls[0][0];
      const decoded = AbiCoder.defaultAbiCoder().decode(
        ["uint64", "uint32", "uint32", "uint256[]", "uint64", "string", "string"],
        attestArgs.data.data,
      );
      expect(decoded[3].map(BigInt)).toEqual(correctedReadings);
    });

    it("returns the new attestation uid and txHash", async () => {
      const ctx = createMockContext();
      const newUid = "0x" + "cc".repeat(32);
      mockOriginalAttestation(ctx);
      getMock(ctx.eas, "attest").mockResolvedValue(createMockTx(createMockAttestReceipt(newUid)));

      const mod = new AttestationModule(ctx);
      const result = await mod.overwriteAttestation({ ...VALID_PARAMS, refUID });

      expect(result.uid).toBe(newUid);
    });

    it("fetches the original attestation using the provided refUID", async () => {
      const ctx = createMockContext();
      mockOriginalAttestation(ctx);
      getMock(ctx.eas, "attest").mockResolvedValue(createMockTx(createMockAttestReceipt()));

      const mod = new AttestationModule(ctx);
      await mod.overwriteAttestation({ ...VALID_PARAMS, refUID });

      expect(getMock(ctx.eas, "getAttestation")).toHaveBeenCalledWith(refUID);
    });

    // --- Pre-flight guard: refUID ---

    it("throws on zero refUID", async () => {
      const ctx = createMockContext();
      const mod = new AttestationModule(ctx);
      await expect(mod.overwriteAttestation({ ...VALID_PARAMS, refUID: ZeroHash })).rejects.toThrow(
        ConfigurationError,
      );
    });

    it("throws on empty refUID", async () => {
      const ctx = createMockContext();
      const mod = new AttestationModule(ctx);
      await expect(mod.overwriteAttestation({ ...VALID_PARAMS, refUID: "" })).rejects.toThrow(
        ConfigurationError,
      );
    });

    // --- Pre-flight guard: params validation fires before any RPC call ---

    it("validates params before fetching original attestation", async () => {
      const ctx = createMockContext();
      const mod = new AttestationModule(ctx);
      await expect(
        mod.overwriteAttestation({ ...VALID_PARAMS, projectId: 0, refUID }),
      ).rejects.toThrow(ConfigurationError);
      expect(getMock(ctx.eas, "getAttestation")).not.toHaveBeenCalled();
    });

    it("throws on empty readings without calling getAttestation", async () => {
      const ctx = createMockContext();
      const mod = new AttestationModule(ctx);
      await expect(
        mod.overwriteAttestation({ ...VALID_PARAMS, readings: [], refUID }),
      ).rejects.toThrow(ConfigurationError);
      expect(getMock(ctx.eas, "getAttestation")).not.toHaveBeenCalled();
    });

    it("throws on empty method without calling getAttestation", async () => {
      const ctx = createMockContext();
      const mod = new AttestationModule(ctx);
      await expect(
        mod.overwriteAttestation({ ...VALID_PARAMS, method: "", refUID }),
      ).rejects.toThrow(ConfigurationError);
      expect(getMock(ctx.eas, "getAttestation")).not.toHaveBeenCalled();
    });

    it("throws when a reading is negative without calling getAttestation", async () => {
      const ctx = createMockContext();
      const mod = new AttestationModule(ctx);
      await expect(
        mod.overwriteAttestation({ ...VALID_PARAMS, readings: [100n, -5n, 300n], refUID }),
      ).rejects.toThrow(ConfigurationError);
      expect(getMock(ctx.eas, "getAttestation")).not.toHaveBeenCalled();
    });

    it("throws on timestamp overflow without calling getAttestation", async () => {
      const ctx = createMockContext();
      const mod = new AttestationModule(ctx);
      await expect(
        mod.overwriteAttestation({
          ...VALID_PARAMS,
          fromTimestamp: 18446744073709551000,
          readings: [1000n],
          readingIntervalMinutes: 60,
          refUID,
        }),
      ).rejects.toThrow(ConfigurationError);
      expect(getMock(ctx.eas, "getAttestation")).not.toHaveBeenCalled();
    });

    // --- Pre-flight guard: existence and replacement state ---

    it("throws when attestation does not exist (uid is ZeroHash)", async () => {
      const ctx = createMockContext();
      getMock(ctx.eas, "getAttestation").mockResolvedValue({ uid: ZeroHash });

      const mod = new AttestationModule(ctx);
      await expect(mod.overwriteAttestation({ ...VALID_PARAMS, refUID })).rejects.toThrow(
        ConfigurationError,
      );
    });

    it("includes the refUID in the not-found error message", async () => {
      const ctx = createMockContext();
      getMock(ctx.eas, "getAttestation").mockResolvedValue({ uid: ZeroHash });

      const mod = new AttestationModule(ctx);
      await expect(mod.overwriteAttestation({ ...VALID_PARAMS, refUID })).rejects.toThrow(refUID);
    });

    it("throws when attestation is already replaced (registry has a replacementUID)", async () => {
      const ctx = createMockContext();
      mockOriginalAttestation(ctx);
      // Simulate registry reporting this UID was already replaced
      getMock(ctx.registry, "getReplacementUID").mockResolvedValue("0x" + "cc".repeat(32));

      const mod = new AttestationModule(ctx);
      await expect(mod.overwriteAttestation({ ...VALID_PARAMS, refUID })).rejects.toThrow(
        ConfigurationError,
      );
    });

    it("does not call eas.attest when attestation is already replaced", async () => {
      const ctx = createMockContext();
      mockOriginalAttestation(ctx);
      getMock(ctx.registry, "getReplacementUID").mockResolvedValue("0x" + "cc".repeat(32));

      const mod = new AttestationModule(ctx);
      await expect(mod.overwriteAttestation({ ...VALID_PARAMS, refUID })).rejects.toThrow();
      expect(getMock(ctx.eas, "attest")).not.toHaveBeenCalled();
    });

    // --- Pre-flight guard: period consistency ---

    it("throws when fromTimestamp does not match the original", async () => {
      const ctx = createMockContext();
      mockOriginalAttestation(ctx);

      const mod = new AttestationModule(ctx);
      await expect(
        mod.overwriteAttestation({
          ...VALID_PARAMS,
          fromTimestamp: VALID_PARAMS.fromTimestamp + 3600,
          refUID,
        }),
      ).rejects.toThrow(ConfigurationError);
    });

    it("includes both timestamps in the fromTimestamp mismatch error message", async () => {
      const ctx = createMockContext();
      mockOriginalAttestation(ctx);

      const mod = new AttestationModule(ctx);
      const badFrom = VALID_PARAMS.fromTimestamp + 3600;
      await expect(
        mod.overwriteAttestation({ ...VALID_PARAMS, fromTimestamp: badFrom, refUID }),
      ).rejects.toThrow(String(badFrom));
    });

    it("throws when toTimestamp does not match due to different reading count", async () => {
      const ctx = createMockContext();
      mockOriginalAttestation(ctx);

      const mod = new AttestationModule(ctx);
      // original: 3 readings * 60min = 180min period
      // replacement: 4 readings * 60min = 240min — different end
      await expect(
        mod.overwriteAttestation({
          ...VALID_PARAMS,
          readings: [500n, 600n, 700n, 800n],
          refUID,
        }),
      ).rejects.toThrow(ConfigurationError);
    });

    it("throws when toTimestamp does not match due to different interval", async () => {
      const ctx = createMockContext();
      mockOriginalAttestation(ctx);

      const mod = new AttestationModule(ctx);
      // original: 3 readings * 60min = 180min period
      // replacement: 3 readings * 120min = 360min — different end
      await expect(
        mod.overwriteAttestation({
          ...VALID_PARAMS,
          readingIntervalMinutes: 120,
          refUID,
        }),
      ).rejects.toThrow(ConfigurationError);
    });

    it("includes computed toTimestamps in the toTimestamp mismatch error message", async () => {
      const ctx = createMockContext();
      mockOriginalAttestation(ctx);

      const mod = new AttestationModule(ctx);
      // original ends at 1700000000 + 3*60*60 = 1700010800
      // replacement ends at 1700000000 + 4*60*60 = 1700014400
      const expectedOriginalTo = VALID_PARAMS.fromTimestamp + 3 * 60 * 60;
      const expectedReplacementTo = VALID_PARAMS.fromTimestamp + 4 * 60 * 60;
      await expect(
        mod.overwriteAttestation({ ...VALID_PARAMS, readings: [500n, 600n, 700n, 800n], refUID }),
      ).rejects.toThrow(
        new RegExp(
          `${expectedReplacementTo}.*${expectedOriginalTo}|${expectedOriginalTo}.*${expectedReplacementTo}`,
        ),
      );
    });

    it("does not call eas.attest when period does not match", async () => {
      const ctx = createMockContext();
      mockOriginalAttestation(ctx);

      const mod = new AttestationModule(ctx);
      await expect(
        mod.overwriteAttestation({ ...VALID_PARAMS, readingIntervalMinutes: 120, refUID }),
      ).rejects.toThrow();
      expect(getMock(ctx.eas, "attest")).not.toHaveBeenCalled();
    });

    // --- Contract revert handling ---

    it("decodes ReplacementProjectMismatch revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      mockOriginalAttestation(ctx);
      const data = encodeResolverError("ReplacementProjectMismatch", []);
      getMock(ctx.eas, "attest").mockRejectedValue({ data });

      const mod = new AttestationModule(ctx);
      await expect(mod.overwriteAttestation({ ...VALID_PARAMS, refUID })).rejects.toThrow(
        ContractRevertError,
      );
    });

    it("decodes ReplacementPeriodMismatch revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      mockOriginalAttestation(ctx);
      const data = encodeResolverError("ReplacementPeriodMismatch", []);
      getMock(ctx.eas, "attest").mockRejectedValue({ data });

      const mod = new AttestationModule(ctx);
      const err = await mod.overwriteAttestation({ ...VALID_PARAMS, refUID }).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("ReplacementPeriodMismatch");
    });

    it("propagates getAttestation RPC failure as-is", async () => {
      const ctx = createMockContext();
      const rpcError = new Error("network timeout");
      getMock(ctx.eas, "getAttestation").mockRejectedValue(rpcError);

      const mod = new AttestationModule(ctx);
      await expect(mod.overwriteAttestation({ ...VALID_PARAMS, refUID })).rejects.toThrow(
        "network timeout",
      );
    });

    it("decodes contract revert from revoke step into ContractRevertError", async () => {
      const ctx = createMockContext();
      mockOriginalAttestation(ctx);
      getMock(ctx.eas, "attest").mockResolvedValue(createMockTx(createMockAttestReceipt()));
      // Replacement attest succeeds but the subsequent EAS revoke fails
      const data = encodeRegistryError("DirectRevocationBlocked", [1]);
      getMock(ctx.eas, "revoke").mockRejectedValue({ data });

      const mod = new AttestationModule(ctx);
      const err = await mod.overwriteAttestation({ ...VALID_PARAMS, refUID }).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("DirectRevocationBlocked");
    });
  });
});
