import { describe, it, expect } from "vitest";
import { AttestationModule } from "../../src/modules/AttestationModule.js";
import { createMockContext, getMock, encodeRegistryError } from "../helpers/mocks.js";
import { ConfigurationError, ContractRevertError } from "../../src/errors.js";
import type { AttestParams } from "../../src/types.js";

const PARAMS: AttestParams = {
  projectId: 1,
  readings: [1000n],
  readingIntervalMinutes: 60,
  fromTimestamp: 1700000000,
  method: "iot",
};

const PARAMS2: AttestParams = {
  projectId: 1,
  readings: [2000n],
  readingIntervalMinutes: 60,
  fromTimestamp: 1700003600,
  method: "iot",
};

describe("AttestationModule.estimateAttestBatchGas", () => {
  it("returns estimated gas as bigint", async () => {
    const ctx = createMockContext();
    getMock(ctx.eas, "multiAttest").estimateGas.mockResolvedValue(150000n);

    const mod = new AttestationModule(ctx);
    const gas = await mod.estimateAttestBatchGas([PARAMS, PARAMS2]);

    expect(gas).toBe(150000n);
  });

  it("calls estimateGas with correct schema and data count", async () => {
    const ctx = createMockContext();
    getMock(ctx.eas, "multiAttest").estimateGas.mockResolvedValue(150000n);

    const mod = new AttestationModule(ctx);
    await mod.estimateAttestBatchGas([PARAMS, PARAMS2]);

    const callArgs = getMock(ctx.eas, "multiAttest").estimateGas.mock.calls[0][0];
    expect(Array.isArray(callArgs)).toBe(true);
    expect(callArgs[0].schema).toBe(ctx.schemaUID);
    expect(callArgs[0].data).toHaveLength(2);
  });

  it("throws ConfigurationError for empty paramsList", async () => {
    const ctx = createMockContext();
    const mod = new AttestationModule(ctx);
    await expect(mod.estimateAttestBatchGas([])).rejects.toThrow(ConfigurationError);
  });

  it("throws ConfigurationError if any params are invalid", async () => {
    const ctx = createMockContext();
    const mod = new AttestationModule(ctx);
    await expect(mod.estimateAttestBatchGas([{ ...PARAMS, projectId: 0 }])).rejects.toThrow(
      ConfigurationError,
    );
  });

  it("decodes contract revert into ContractRevertError", async () => {
    const ctx = createMockContext();
    const data = encodeRegistryError("ProjectNotRegistered", [1]);
    getMock(ctx.eas, "multiAttest").estimateGas.mockRejectedValue({ data });

    const mod = new AttestationModule(ctx);
    await expect(mod.estimateAttestBatchGas([PARAMS])).rejects.toThrow(ContractRevertError);
  });
});

describe("AttestationModule.estimateAttestZeroPeriodGas", () => {
  it("returns estimated gas as bigint", async () => {
    const ctx = createMockContext();
    getMock(ctx.registry, "getProjectLastTimestamp").mockResolvedValue(1700000000n);
    getMock(ctx.eas, "attest").estimateGas.mockResolvedValue(90000n);

    const mod = new AttestationModule(ctx);
    const gas = await mod.estimateAttestZeroPeriodGas({
      projectId: 1,
      interval: 60,
    });

    expect(gas).toBe(90000n);
  });

  it("fetches lastTimestamp and uses it as fromTimestamp", async () => {
    const ctx = createMockContext();
    getMock(ctx.registry, "getProjectLastTimestamp").mockResolvedValue(1700005000n);
    getMock(ctx.eas, "attest").estimateGas.mockResolvedValue(90000n);

    const mod = new AttestationModule(ctx);
    await mod.estimateAttestZeroPeriodGas({ projectId: 3, interval: 1440 });

    expect(getMock(ctx.registry, "getProjectLastTimestamp")).toHaveBeenCalledWith(3);
    const callArgs = getMock(ctx.eas, "attest").estimateGas.mock.calls[0][0];
    expect(callArgs.data.data).toBeDefined();
  });

  it("throws ConfigurationError when lastTimestamp is 0", async () => {
    const ctx = createMockContext();
    getMock(ctx.registry, "getProjectLastTimestamp").mockResolvedValue(0n);

    const mod = new AttestationModule(ctx);
    await expect(mod.estimateAttestZeroPeriodGas({ projectId: 1, interval: 60 })).rejects.toThrow(
      ConfigurationError,
    );
  });

  it("throws ConfigurationError for invalid projectId", async () => {
    const ctx = createMockContext();
    const mod = new AttestationModule(ctx);
    await expect(mod.estimateAttestZeroPeriodGas({ projectId: 0, interval: 60 })).rejects.toThrow(
      ConfigurationError,
    );
  });
});
