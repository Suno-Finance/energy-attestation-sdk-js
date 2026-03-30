import { describe, it, expect } from "vitest";
import { AttestationModule } from "../../src/modules/AttestationModule.js";
import {
  createMockContext,
  createMockTx,
  createMockLog,
  createMockReceipt,
  getMock,
  easInterface,
  encodeRegistryError,
} from "../helpers/mocks.js";
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

describe("AttestationModule.attestBatch", () => {
  it("returns uids and txHash from Attested events", async () => {
    const ctx = createMockContext();
    const uid1 = "0x" + "aa".repeat(32);
    const uid2 = "0x" + "bb".repeat(32);
    const log1 = createMockLog(easInterface, "Attested", [
      "0x0000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000001",
      uid1,
      "0x" + "ab".repeat(32),
    ]);
    const log2 = createMockLog(easInterface, "Attested", [
      "0x0000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000001",
      uid2,
      "0x" + "ab".repeat(32),
    ]);
    const receipt = createMockReceipt([log1, log2], "0xbatchhash");
    getMock(ctx.eas, "multiAttest").mockResolvedValue(createMockTx(receipt));

    const mod = new AttestationModule(ctx);
    const result = await mod.attestBatch([PARAMS, PARAMS2]);

    expect(result.uids).toEqual([uid1, uid2]);
    expect(result.txHash).toBe("0xbatchhash");
  });

  it("calls multiAttest with correct structure", async () => {
    const ctx = createMockContext();
    const receipt = createMockReceipt([], "0xhash");
    getMock(ctx.eas, "multiAttest").mockResolvedValue(createMockTx(receipt));

    const mod = new AttestationModule(ctx);
    await mod.attestBatch([PARAMS]);

    const callArgs = getMock(ctx.eas, "multiAttest").mock.calls[0][0];
    expect(Array.isArray(callArgs)).toBe(true);
    expect(callArgs[0].schema).toBe(ctx.schemaUID);
    expect(callArgs[0].data).toHaveLength(1);
    expect(callArgs[0].data[0].recipient).toBeDefined();
    expect(callArgs[0].data[0].revocable).toBe(true);
  });

  it("returns empty uids when no Attested events in logs", async () => {
    const ctx = createMockContext();
    const receipt = createMockReceipt([], "0xhash");
    getMock(ctx.eas, "multiAttest").mockResolvedValue(createMockTx(receipt));

    const mod = new AttestationModule(ctx);
    const result = await mod.attestBatch([PARAMS]);
    expect(result.uids).toEqual([]);
    expect(result.txHash).toBe("0xhash");
  });

  it("throws ConfigurationError for empty paramsList", async () => {
    const ctx = createMockContext();
    const mod = new AttestationModule(ctx);
    await expect(mod.attestBatch([])).rejects.toThrow(ConfigurationError);
  });

  it("throws ConfigurationError if any params are invalid (zero projectId)", async () => {
    const ctx = createMockContext();
    const mod = new AttestationModule(ctx);
    await expect(mod.attestBatch([{ ...PARAMS, projectId: 0 }])).rejects.toThrow(
      ConfigurationError,
    );
  });

  it("throws ConfigurationError if any params are invalid (empty readings)", async () => {
    const ctx = createMockContext();
    const mod = new AttestationModule(ctx);
    await expect(mod.attestBatch([PARAMS, { ...PARAMS2, readings: [] }])).rejects.toThrow(
      ConfigurationError,
    );
  });

  it("decodes contract revert into ContractRevertError", async () => {
    const ctx = createMockContext();
    const data = encodeRegistryError("ProjectNotRegistered", [1]);
    getMock(ctx.eas, "multiAttest").mockRejectedValue({ data });

    const mod = new AttestationModule(ctx);
    await expect(mod.attestBatch([PARAMS])).rejects.toThrow(ContractRevertError);
  });
});
