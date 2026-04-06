import { describe, it, expect } from "vitest";
import { ZeroAddress, ZeroHash, AbiCoder } from "ethers";
import { AttestationModule } from "../../src/modules/AttestationModule.js";
import {
  createMockContext,
  createMockAttestReceipt,
  createMockTx,
  getMock,
  encodeRegistryError,
  encodeResolverError,
} from "../helpers/mocks.js";
import { ConfigurationError, ContractRevertError } from "../../src/errors.js";
import { Interval } from "../../src/types.js";
import { DEFAULT_ZERO_PERIOD_METHOD } from "../../src/constants.js";

const PROJECT_ID = 1;
const LAST_TIMESTAMP = 1700000000n;
const ATTEST_UID = "0x" + "ff".repeat(32);

function setupMock(ctx: ReturnType<typeof createMockContext>, lastTimestamp = LAST_TIMESTAMP) {
  getMock(ctx.registry, "getProjectLastTimestamp").mockResolvedValue(lastTimestamp);
  const receipt = createMockAttestReceipt(ATTEST_UID);
  getMock(ctx.eas, "attest").mockResolvedValue(createMockTx(receipt));
}

function decodeAttestData(ctx: ReturnType<typeof createMockContext>) {
  const callArgs = getMock(ctx.eas, "attest").mock.calls[0][0];
  return AbiCoder.defaultAbiCoder().decode(
    ["uint64", "uint32", "uint32", "uint256[]", "uint64", "string", "string"],
    callArgs.data.data,
  );
}

describe("AttestationModule.attestZeroPeriod", () => {
  // --- Return value ---

  it("returns uid and txHash from the receipt", async () => {
    const ctx = createMockContext();
    setupMock(ctx);

    const mod = new AttestationModule(ctx);
    const result = await mod.attestZeroPeriod({ projectId: PROJECT_ID, interval: Interval.Hourly });

    expect(result.uid).toBe(ATTEST_UID);
    expect(result.txHash).toBeDefined();
  });

  // --- Encoded data ---

  it("submits exactly one zero reading", async () => {
    const ctx = createMockContext();
    setupMock(ctx);

    const mod = new AttestationModule(ctx);
    await mod.attestZeroPeriod({ projectId: PROJECT_ID, interval: Interval.Hourly });

    const decoded = decodeAttestData(ctx);
    expect(decoded[3].map(BigInt)).toEqual([0n]);
    expect(Number(decoded[1])).toBe(1); // readingCount
  });

  it("encodes the correct projectId", async () => {
    const ctx = createMockContext();
    setupMock(ctx);

    const mod = new AttestationModule(ctx);
    await mod.attestZeroPeriod({ projectId: PROJECT_ID, interval: Interval.Hourly });

    const decoded = decodeAttestData(ctx);
    expect(Number(decoded[0])).toBe(PROJECT_ID);
  });

  it.each([
    ["Hourly", Interval.Hourly],
    ["FourHours", Interval.FourHours],
    ["EightHours", Interval.EightHours],
    ["TwelveHours", Interval.TwelveHours],
    ["Daily", Interval.Daily],
    ["Weekly", Interval.Weekly],
    ["Biweekly", Interval.Biweekly],
    ["FourWeeks", Interval.FourWeeks],
  ])("uses %s interval as readingIntervalMinutes", async (_name, interval) => {
    const ctx = createMockContext();
    setupMock(ctx);

    const mod = new AttestationModule(ctx);
    await mod.attestZeroPeriod({ projectId: PROJECT_ID, interval });

    const decoded = decodeAttestData(ctx);
    expect(Number(decoded[2])).toBe(interval);
  });

  it("uses fromTimestamp from getProjectLastTimestamp", async () => {
    const ctx = createMockContext();
    setupMock(ctx, 1700003600n);

    const mod = new AttestationModule(ctx);
    await mod.attestZeroPeriod({ projectId: PROJECT_ID, interval: Interval.Hourly });

    expect(getMock(ctx.registry, "getProjectLastTimestamp")).toHaveBeenCalledWith(PROJECT_ID);
    const decoded = decodeAttestData(ctx);
    expect(Number(decoded[4])).toBe(1700003600);
  });

  it("defaults method to '0 report'", async () => {
    const ctx = createMockContext();
    setupMock(ctx);

    const mod = new AttestationModule(ctx);
    await mod.attestZeroPeriod({ projectId: PROJECT_ID, interval: Interval.Hourly });

    const decoded = decodeAttestData(ctx);
    expect(decoded[5]).toBe(DEFAULT_ZERO_PERIOD_METHOD);
  });

  it("uses provided method when supplied", async () => {
    const ctx = createMockContext();
    setupMock(ctx);

    const mod = new AttestationModule(ctx);
    await mod.attestZeroPeriod({
      projectId: PROJECT_ID,
      interval: Interval.Hourly,
      method: "downtime",
    });

    const decoded = decodeAttestData(ctx);
    expect(decoded[5]).toBe("downtime");
  });

  it("passes metadataURI when provided", async () => {
    const ctx = createMockContext();
    setupMock(ctx);

    const mod = new AttestationModule(ctx);
    await mod.attestZeroPeriod({
      projectId: PROJECT_ID,
      interval: Interval.Hourly,
      metadataURI: "ipfs://abc",
    });

    const decoded = decodeAttestData(ctx);
    expect(decoded[6]).toBe("ipfs://abc");
  });

  it("defaults metadataURI to empty string when not provided", async () => {
    const ctx = createMockContext();
    setupMock(ctx);

    const mod = new AttestationModule(ctx);
    await mod.attestZeroPeriod({ projectId: PROJECT_ID, interval: Interval.Hourly });

    const decoded = decodeAttestData(ctx);
    expect(decoded[6]).toBe("");
  });

  // --- EAS attest call structure ---

  it("calls eas.attest with correct schema and standard fields", async () => {
    const ctx = createMockContext();
    setupMock(ctx);

    const mod = new AttestationModule(ctx);
    await mod.attestZeroPeriod({ projectId: PROJECT_ID, interval: Interval.Hourly });

    const callArgs = getMock(ctx.eas, "attest").mock.calls[0][0];
    expect(callArgs.schema).toBe(ctx.schemaUID);
    expect(callArgs.data.recipient).toBe(ZeroAddress);
    expect(callArgs.data.expirationTime).toBe(0n);
    expect(callArgs.data.revocable).toBe(true);
    expect(callArgs.data.value).toBe(0n);
    expect(callArgs.data.refUID).toBe(ZeroHash);
  });

  // --- Validation errors ---

  it("throws ConfigurationError on zero projectId", async () => {
    const ctx = createMockContext();
    const mod = new AttestationModule(ctx);
    await expect(mod.attestZeroPeriod({ projectId: 0, interval: Interval.Hourly })).rejects.toThrow(
      ConfigurationError,
    );
  });

  it("throws ConfigurationError on negative projectId", async () => {
    const ctx = createMockContext();
    const mod = new AttestationModule(ctx);
    await expect(
      mod.attestZeroPeriod({ projectId: -1, interval: Interval.Hourly }),
    ).rejects.toThrow(ConfigurationError);
  });

  it("throws ConfigurationError when project has no prior attestation (lastTimestamp = 0)", async () => {
    const ctx = createMockContext();
    getMock(ctx.registry, "getProjectLastTimestamp").mockResolvedValue(0n);

    const mod = new AttestationModule(ctx);
    await expect(
      mod.attestZeroPeriod({ projectId: PROJECT_ID, interval: Interval.Hourly }),
    ).rejects.toThrow(ConfigurationError);
  });

  // --- Contract revert handling ---

  it("decodes contract revert into ContractRevertError", async () => {
    const ctx = createMockContext();
    getMock(ctx.registry, "getProjectLastTimestamp").mockResolvedValue(LAST_TIMESTAMP);
    const data = encodeRegistryError("ProjectNotRegistered", [PROJECT_ID]);
    getMock(ctx.eas, "attest").mockRejectedValue({ data });

    const mod = new AttestationModule(ctx);
    await expect(
      mod.attestZeroPeriod({ projectId: PROJECT_ID, interval: Interval.Hourly }),
    ).rejects.toThrow(ContractRevertError);
  });

  it("decodes UnauthorizedAttester revert", async () => {
    const ctx = createMockContext();
    getMock(ctx.registry, "getProjectLastTimestamp").mockResolvedValue(LAST_TIMESTAMP);
    const data = encodeResolverError("UnauthorizedAttester", [
      "0x0000000000000000000000000000000000000001",
    ]);
    getMock(ctx.eas, "attest").mockRejectedValue({ data });

    const err = await new AttestationModule(ctx)
      .attestZeroPeriod({ projectId: PROJECT_ID, interval: Interval.Hourly })
      .catch((e) => e);
    expect(err).toBeInstanceOf(ContractRevertError);
    expect((err as ContractRevertError).errorName).toBe("UnauthorizedAttester");
  });

  it("decodes NonSequentialAttestation (registry) revert", async () => {
    const ctx = createMockContext();
    getMock(ctx.registry, "getProjectLastTimestamp").mockResolvedValue(LAST_TIMESTAMP);
    getMock(ctx.eas, "attest").mockRejectedValue({
      data: encodeRegistryError("NonSequentialAttestation", [PROJECT_ID, 1700003600, 1700007200]),
    });
    const err = await new AttestationModule(ctx)
      .attestZeroPeriod({ projectId: PROJECT_ID, interval: Interval.Hourly })
      .catch((e) => e);
    expect(err).toBeInstanceOf(ContractRevertError);
    expect((err as ContractRevertError).errorName).toBe("NonSequentialAttestation");
  });

  it("decodes PeriodAlreadyAttested (registry) revert", async () => {
    const ctx = createMockContext();
    getMock(ctx.registry, "getProjectLastTimestamp").mockResolvedValue(LAST_TIMESTAMP);
    getMock(ctx.eas, "attest").mockRejectedValue({
      data: encodeRegistryError("PeriodAlreadyAttested", [PROJECT_ID, 1700000000, 1700003600]),
    });
    const err = await new AttestationModule(ctx)
      .attestZeroPeriod({ projectId: PROJECT_ID, interval: Interval.Hourly })
      .catch((e) => e);
    expect(err).toBeInstanceOf(ContractRevertError);
    expect((err as ContractRevertError).errorName).toBe("PeriodAlreadyAttested");
  });

  it("decodes TimestampOverflow (resolver) revert", async () => {
    const ctx = createMockContext();
    getMock(ctx.registry, "getProjectLastTimestamp").mockResolvedValue(LAST_TIMESTAMP);
    getMock(ctx.eas, "attest").mockRejectedValue({
      data: encodeResolverError("TimestampOverflow", []),
    });
    const err = await new AttestationModule(ctx)
      .attestZeroPeriod({ projectId: PROJECT_ID, interval: Interval.Hourly })
      .catch((e) => e);
    expect(err).toBeInstanceOf(ContractRevertError);
    expect((err as ContractRevertError).errorName).toBe("TimestampOverflow");
  });
});
