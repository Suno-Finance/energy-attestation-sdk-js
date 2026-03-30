import { describe, it, expect } from "vitest";
import { WatcherModule } from "../../src/modules/WatcherModule.js";
import { createMockContext, getMock, encodeRegistryError } from "../helpers/mocks.js";
import { ConfigurationError, ContractRevertError } from "../../src/errors.js";

const ADDR1 = "0x0000000000000000000000000000000000000001";

describe("WatcherModule — gas estimation", () => {
  describe("estimateCreateWatcherGas", () => {
    it("returns estimated gas as bigint", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "registerWatcher").estimateGas.mockResolvedValue(80000n);

      const mod = new WatcherModule(ctx);
      const gas = await mod.estimateCreateWatcherGas("My Watcher");

      expect(gas).toBe(80000n);
    });

    it("passes name to estimateGas", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "registerWatcher").estimateGas.mockResolvedValue(80000n);

      const mod = new WatcherModule(ctx);
      await mod.estimateCreateWatcherGas("Solar IoT");

      expect(getMock(ctx.registry, "registerWatcher").estimateGas).toHaveBeenCalledWith(
        "Solar IoT",
      );
    });

    it("decodes contract revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("OwnableUnauthorizedAccount", [ADDR1]);
      getMock(ctx.registry, "registerWatcher").estimateGas.mockRejectedValue({ data });

      const mod = new WatcherModule(ctx);
      await expect(mod.estimateCreateWatcherGas("Test")).rejects.toThrow(ContractRevertError);
    });
  });

  describe("estimateTransferWatcherOwnershipGas", () => {
    it("returns estimated gas as bigint", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "transferWatcherOwnership").estimateGas.mockResolvedValue(55000n);

      const mod = new WatcherModule(ctx);
      const gas = await mod.estimateTransferWatcherOwnershipGas(1, ADDR1);

      expect(gas).toBe(55000n);
    });

    it("passes correct args to estimateGas", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "transferWatcherOwnership").estimateGas.mockResolvedValue(55000n);

      const mod = new WatcherModule(ctx);
      await mod.estimateTransferWatcherOwnershipGas(5n, ADDR1);

      expect(getMock(ctx.registry, "transferWatcherOwnership").estimateGas).toHaveBeenCalledWith(
        5n,
        ADDR1,
      );
    });

    it("throws ConfigurationError for invalid newOwner address", async () => {
      const ctx = createMockContext();
      const mod = new WatcherModule(ctx);
      await expect(
        mod.estimateTransferWatcherOwnershipGas(1, "not-an-address"),
      ).rejects.toThrow(ConfigurationError);
    });

    it("decodes contract revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("WatcherNotRegistered", [99]);
      getMock(ctx.registry, "transferWatcherOwnership").estimateGas.mockRejectedValue({ data });

      const mod = new WatcherModule(ctx);
      await expect(mod.estimateTransferWatcherOwnershipGas(99, ADDR1)).rejects.toThrow(
        ContractRevertError,
      );
    });
  });
});
