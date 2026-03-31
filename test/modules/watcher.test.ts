import { describe, it, expect } from "vitest";
import { WatcherModule } from "../../src/modules/WatcherModule.js";
import {
  createMockContext,
  createMockTx,
  createMockLog,
  createMockReceipt,
  getMock,
  encodeRegistryError,
  registryInterface,
} from "../helpers/mocks.js";
import { ConfigurationError, ContractRevertError } from "../../src/errors.js";

describe("WatcherModule", () => {
  describe("createWatcher", () => {
    it("returns watcherId from event", async () => {
      const ctx = createMockContext();
      const log = createMockLog(registryInterface, "WatcherRegistered", [
        5n,
        "Test Watcher",
        "0x0000000000000000000000000000000000000001",
      ]);
      const receipt = createMockReceipt([log], "0xtxhash");
      const mockTx = createMockTx(receipt);
      getMock(ctx.registry, "registerWatcher").mockResolvedValue(mockTx);

      const mod = new WatcherModule(ctx);
      const result = await mod.createWatcher("Test Watcher");

      expect(result.watcherId).toBe(5n);
      expect(result.txHash).toBe("0xtxhash");
    });

    it("passes name to contract call", async () => {
      const ctx = createMockContext();
      const log = createMockLog(registryInterface, "WatcherRegistered", [
        1n,
        "My Company",
        "0x0000000000000000000000000000000000000001",
      ]);
      const receipt = createMockReceipt([log]);
      const mockTx = createMockTx(receipt);
      getMock(ctx.registry, "registerWatcher").mockResolvedValue(mockTx);

      const mod = new WatcherModule(ctx);
      await mod.createWatcher("My Company");

      expect(getMock(ctx.registry, "registerWatcher")).toHaveBeenCalledWith(
        "My Company",
        expect.anything(),
      );
    });

    it("throws ConfigurationError when WatcherRegistered event not found in logs", async () => {
      const ctx = createMockContext();
      const receipt = createMockReceipt([], "0xnoevent");
      const mockTx = createMockTx(receipt);
      getMock(ctx.registry, "registerWatcher").mockResolvedValue(mockTx);

      const mod = new WatcherModule(ctx);
      const err = await mod.createWatcher("Test").catch((e) => e);
      expect(err).toBeInstanceOf(ConfigurationError);
      expect(err.message).toContain("0xnoevent");
    });

    it("decodes contract revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("WatcherNotRegistered", [99]);
      getMock(ctx.registry, "registerWatcher").mockRejectedValue({ data });

      const mod = new WatcherModule(ctx);
      await expect(mod.createWatcher("Test")).rejects.toThrow(ContractRevertError);
    });
  });

  describe("transferWatcherOwnership", () => {
    it("returns txHash as object", async () => {
      const ctx = createMockContext();
      const receipt = createMockReceipt([], "0xtransferhash");
      const mockTx = createMockTx(receipt);
      getMock(ctx.registry, "transferWatcherOwnership").mockResolvedValue(mockTx);

      const mod = new WatcherModule(ctx);
      const result = await mod.transferWatcherOwnership(
        5,
        "0x0000000000000000000000000000000000000002",
      );

      expect(result.txHash).toBe("0xtransferhash");
    });

    it("passes correct args to contract", async () => {
      const ctx = createMockContext();
      const receipt = createMockReceipt([]);
      const mockTx = createMockTx(receipt);
      getMock(ctx.registry, "transferWatcherOwnership").mockResolvedValue(mockTx);

      const mod = new WatcherModule(ctx);
      await mod.transferWatcherOwnership(7n, "0x0000000000000000000000000000000000000099");

      expect(getMock(ctx.registry, "transferWatcherOwnership")).toHaveBeenCalledWith(
        7n,
        "0x0000000000000000000000000000000000000099",
        expect.anything(),
      );
    });

    it("accepts bigint watcherId", async () => {
      const ctx = createMockContext();
      const receipt = createMockReceipt([], "0xbigint");
      const mockTx = createMockTx(receipt);
      getMock(ctx.registry, "transferWatcherOwnership").mockResolvedValue(mockTx);

      const mod = new WatcherModule(ctx);
      const result = await mod.transferWatcherOwnership(
        999n,
        "0x0000000000000000000000000000000000000001",
      );
      expect(result.txHash).toBe("0xbigint");
    });

    it("throws ConfigurationError for invalid newOwner address", async () => {
      const ctx = createMockContext();
      const mod = new WatcherModule(ctx);
      await expect(mod.transferWatcherOwnership(5, "not-an-address")).rejects.toThrow(
        ConfigurationError,
      );
    });

    it("decodes contract revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("UnauthorizedWatcherOwner", [
        "0x0000000000000000000000000000000000000001",
        5,
      ]);
      getMock(ctx.registry, "transferWatcherOwnership").mockRejectedValue({ data });

      const mod = new WatcherModule(ctx);
      await expect(
        mod.transferWatcherOwnership(5, "0x0000000000000000000000000000000000000002"),
      ).rejects.toThrow(ContractRevertError);
    });
  });
});
