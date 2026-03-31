import { describe, it, expect } from "vitest";
import { AttesterModule } from "../../src/modules/AttesterModule.js";
import {
  createMockContext,
  createMockReceipt,
  createMockTx,
  getMock,
  encodeRegistryError,
} from "../helpers/mocks.js";
import { ConfigurationError, ContractRevertError } from "../../src/errors.js";

const ADDR1 = "0x0000000000000000000000000000000000000001";
const ADDR2 = "0x0000000000000000000000000000000000000002";
const ADDR3 = "0x0000000000000000000000000000000000000003";

function setupMock(ctx: ReturnType<typeof createMockContext>, method: string, hash = "0xtx") {
  const receipt = createMockReceipt([], hash);
  const mockTx = createMockTx(receipt);
  getMock(ctx.registry, method).mockResolvedValue(mockTx);
}

describe("AttesterModule", () => {
  describe("addAttester", () => {
    it("returns txHash as object", async () => {
      const ctx = createMockContext();
      setupMock(ctx, "addAttester", "0xadd");
      const mod = new AttesterModule(ctx);
      const result = await mod.addAttester(1, ADDR1);
      expect(result.txHash).toBe("0xadd");
    });

    it("passes correct args to contract", async () => {
      const ctx = createMockContext();
      setupMock(ctx, "addAttester");
      const mod = new AttesterModule(ctx);
      await mod.addAttester(5n, ADDR2);
      expect(getMock(ctx.registry, "addAttester")).toHaveBeenCalledWith(5n, ADDR2, expect.anything());
    });

    it("throws ConfigurationError for invalid attester address", async () => {
      const ctx = createMockContext();
      const mod = new AttesterModule(ctx);
      await expect(mod.addAttester(1, "not-an-address")).rejects.toThrow(ConfigurationError);
    });

    it("decodes contract revert (AttesterAlreadyAuthorized)", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("AttesterAlreadyAuthorized", [ADDR1, 1]);
      getMock(ctx.registry, "addAttester").mockRejectedValue({ data });
      const mod = new AttesterModule(ctx);
      await expect(mod.addAttester(1, ADDR1)).rejects.toThrow(ContractRevertError);
    });
  });

  describe("removeAttester", () => {
    it("returns txHash as object", async () => {
      const ctx = createMockContext();
      setupMock(ctx, "removeAttester", "0xremove");
      const mod = new AttesterModule(ctx);
      const result = await mod.removeAttester(1, ADDR1);
      expect(result.txHash).toBe("0xremove");
    });

    it("passes correct args to contract", async () => {
      const ctx = createMockContext();
      setupMock(ctx, "removeAttester");
      const mod = new AttesterModule(ctx);
      await mod.removeAttester(3n, ADDR1);
      expect(getMock(ctx.registry, "removeAttester")).toHaveBeenCalledWith(
        3n,
        ADDR1,
        expect.anything(),
      );
    });

    it("throws ConfigurationError for invalid attester address", async () => {
      const ctx = createMockContext();
      const mod = new AttesterModule(ctx);
      await expect(mod.removeAttester(1, "0xbad")).rejects.toThrow(ConfigurationError);
    });

    it("decodes contract revert (AttesterNotAuthorized)", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("AttesterNotAuthorized", [ADDR1, 1]);
      getMock(ctx.registry, "removeAttester").mockRejectedValue({ data });
      const mod = new AttesterModule(ctx);
      await expect(mod.removeAttester(1, ADDR1)).rejects.toThrow(ContractRevertError);
    });
  });

  describe("addAttesters", () => {
    it("returns txHash as object", async () => {
      const ctx = createMockContext();
      setupMock(ctx, "addAttesters", "0xbatch");
      const mod = new AttesterModule(ctx);
      const result = await mod.addAttesters(1, [ADDR1, ADDR2]);
      expect(result.txHash).toBe("0xbatch");
    });

    it("passes correct args to contract", async () => {
      const ctx = createMockContext();
      setupMock(ctx, "addAttesters");
      const mod = new AttesterModule(ctx);
      await mod.addAttesters(2, [ADDR1, ADDR2, ADDR3]);
      expect(getMock(ctx.registry, "addAttesters")).toHaveBeenCalledWith(
        2,
        [ADDR1, ADDR2, ADDR3],
        expect.anything(),
      );
    });

    it("throws ConfigurationError when any address is invalid", async () => {
      const ctx = createMockContext();
      const mod = new AttesterModule(ctx);
      await expect(mod.addAttesters(1, [ADDR1, "bad-address"])).rejects.toThrow(ConfigurationError);
    });

    it("decodes contract revert (EmptyAttesterArray)", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("EmptyAttesterArray", []);
      getMock(ctx.registry, "addAttesters").mockRejectedValue({ data });
      const mod = new AttesterModule(ctx);
      await expect(mod.addAttesters(1, [])).rejects.toThrow(ContractRevertError);
    });
  });

  describe("removeAttesters", () => {
    it("returns txHash as object", async () => {
      const ctx = createMockContext();
      setupMock(ctx, "removeAttesters", "0xbatchrm");
      const mod = new AttesterModule(ctx);
      const result = await mod.removeAttesters(1, [ADDR1]);
      expect(result.txHash).toBe("0xbatchrm");
    });

    it("passes correct args to contract", async () => {
      const ctx = createMockContext();
      setupMock(ctx, "removeAttesters");
      const mod = new AttesterModule(ctx);
      await mod.removeAttesters(4n, [ADDR2, ADDR3]);
      expect(getMock(ctx.registry, "removeAttesters")).toHaveBeenCalledWith(
        4n,
        [ADDR2, ADDR3],
        expect.anything(),
      );
    });

    it("throws ConfigurationError when any address is invalid", async () => {
      const ctx = createMockContext();
      const mod = new AttesterModule(ctx);
      await expect(mod.removeAttesters(1, ["not-valid"])).rejects.toThrow(ConfigurationError);
    });

    it("decodes contract revert (AttesterNotAuthorized)", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("AttesterNotAuthorized", [ADDR1, 1]);
      getMock(ctx.registry, "removeAttesters").mockRejectedValue({ data });
      const mod = new AttesterModule(ctx);
      await expect(mod.removeAttesters(1, [ADDR1])).rejects.toThrow(ContractRevertError);
    });
  });

  describe("addWatcherAttester", () => {
    it("returns txHash as object", async () => {
      const ctx = createMockContext();
      setupMock(ctx, "addWatcherAttester", "0xwatcheradd");
      const mod = new AttesterModule(ctx);
      const result = await mod.addWatcherAttester(1, ADDR1);
      expect(result.txHash).toBe("0xwatcheradd");
    });

    it("passes correct args to contract", async () => {
      const ctx = createMockContext();
      setupMock(ctx, "addWatcherAttester");
      const mod = new AttesterModule(ctx);
      await mod.addWatcherAttester(10n, ADDR3);
      expect(getMock(ctx.registry, "addWatcherAttester")).toHaveBeenCalledWith(
        10n,
        ADDR3,
        expect.anything(),
      );
    });

    it("throws ConfigurationError for invalid attester address", async () => {
      const ctx = createMockContext();
      const mod = new AttesterModule(ctx);
      await expect(mod.addWatcherAttester(1, "not-an-address")).rejects.toThrow(ConfigurationError);
    });

    it("decodes contract revert (WatcherNotRegistered)", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("WatcherNotRegistered", [99]);
      getMock(ctx.registry, "addWatcherAttester").mockRejectedValue({ data });
      const mod = new AttesterModule(ctx);
      await expect(mod.addWatcherAttester(99, ADDR1)).rejects.toThrow(ContractRevertError);
    });
  });

  describe("removeWatcherAttester", () => {
    it("returns txHash as object", async () => {
      const ctx = createMockContext();
      setupMock(ctx, "removeWatcherAttester", "0xwatcherrm");
      const mod = new AttesterModule(ctx);
      const result = await mod.removeWatcherAttester(1, ADDR1);
      expect(result.txHash).toBe("0xwatcherrm");
    });

    it("passes correct args to contract", async () => {
      const ctx = createMockContext();
      setupMock(ctx, "removeWatcherAttester");
      const mod = new AttesterModule(ctx);
      await mod.removeWatcherAttester(3n, ADDR2);
      expect(getMock(ctx.registry, "removeWatcherAttester")).toHaveBeenCalledWith(
        3n,
        ADDR2,
        expect.anything(),
      );
    });

    it("throws ConfigurationError for invalid attester address", async () => {
      const ctx = createMockContext();
      const mod = new AttesterModule(ctx);
      await expect(mod.removeWatcherAttester(1, "bad")).rejects.toThrow(ConfigurationError);
    });

    it("decodes contract revert (AttesterNotAuthorized)", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("AttesterNotAuthorized", [ADDR1, 0]);
      getMock(ctx.registry, "removeWatcherAttester").mockRejectedValue({ data });
      const mod = new AttesterModule(ctx);
      await expect(mod.removeWatcherAttester(1, ADDR1)).rejects.toThrow(ContractRevertError);
    });
  });
});
