import { describe, it, expect } from "vitest";
import { AttesterModule } from "../../src/modules/AttesterModule.js";
import { createMockContext, getMock, encodeRegistryError } from "../helpers/mocks.js";
import { ContractRevertError } from "../../src/errors.js";

const ADDR1 = "0x0000000000000000000000000000000000000001";
const ADDR2 = "0x0000000000000000000000000000000000000002";
const ADDR3 = "0x0000000000000000000000000000000000000003";

describe("AttesterModule — gas estimation", () => {
  describe("estimateAddAttesterGas", () => {
    it("returns estimated gas as bigint", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "addAttester").estimateGas.mockResolvedValue(60000n);

      const mod = new AttesterModule(ctx);
      const gas = await mod.estimateAddAttesterGas(1, ADDR1);

      expect(gas).toBe(60000n);
    });

    it("passes correct args to estimateGas", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "addAttester").estimateGas.mockResolvedValue(60000n);

      const mod = new AttesterModule(ctx);
      await mod.estimateAddAttesterGas(5n, ADDR2);

      expect(getMock(ctx.registry, "addAttester").estimateGas).toHaveBeenCalledWith(5n, ADDR2);
    });

    it("decodes contract revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("AttesterAlreadyAuthorized", [ADDR1, 1]);
      getMock(ctx.registry, "addAttester").estimateGas.mockRejectedValue({ data });

      const mod = new AttesterModule(ctx);
      await expect(mod.estimateAddAttesterGas(1, ADDR1)).rejects.toThrow(ContractRevertError);
    });
  });

  describe("estimateRemoveAttesterGas", () => {
    it("returns estimated gas as bigint", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "removeAttester").estimateGas.mockResolvedValue(45000n);

      const mod = new AttesterModule(ctx);
      expect(await mod.estimateRemoveAttesterGas(1, ADDR1)).toBe(45000n);
    });

    it("passes correct args to estimateGas", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "removeAttester").estimateGas.mockResolvedValue(45000n);

      const mod = new AttesterModule(ctx);
      await mod.estimateRemoveAttesterGas(3n, ADDR1);

      expect(getMock(ctx.registry, "removeAttester").estimateGas).toHaveBeenCalledWith(3n, ADDR1);
    });

    it("decodes contract revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("AttesterNotAuthorized", [ADDR1, 1]);
      getMock(ctx.registry, "removeAttester").estimateGas.mockRejectedValue({ data });

      const mod = new AttesterModule(ctx);
      await expect(mod.estimateRemoveAttesterGas(1, ADDR1)).rejects.toThrow(ContractRevertError);
    });
  });

  describe("estimateAddAttestersGas", () => {
    it("returns estimated gas as bigint", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "addAttesters").estimateGas.mockResolvedValue(90000n);

      const mod = new AttesterModule(ctx);
      expect(await mod.estimateAddAttestersGas(1, [ADDR1, ADDR2])).toBe(90000n);
    });

    it("passes correct args to estimateGas", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "addAttesters").estimateGas.mockResolvedValue(90000n);

      const mod = new AttesterModule(ctx);
      await mod.estimateAddAttestersGas(2, [ADDR1, ADDR2, ADDR3]);

      expect(getMock(ctx.registry, "addAttesters").estimateGas).toHaveBeenCalledWith(2, [
        ADDR1,
        ADDR2,
        ADDR3,
      ]);
    });

    it("decodes contract revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("EmptyAttesterArray", []);
      getMock(ctx.registry, "addAttesters").estimateGas.mockRejectedValue({ data });

      const mod = new AttesterModule(ctx);
      await expect(mod.estimateAddAttestersGas(1, [])).rejects.toThrow(ContractRevertError);
    });
  });

  describe("estimateRemoveAttestersGas", () => {
    it("returns estimated gas as bigint", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "removeAttesters").estimateGas.mockResolvedValue(80000n);

      const mod = new AttesterModule(ctx);
      expect(await mod.estimateRemoveAttestersGas(1, [ADDR1])).toBe(80000n);
    });

    it("passes correct args to estimateGas", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "removeAttesters").estimateGas.mockResolvedValue(80000n);

      const mod = new AttesterModule(ctx);
      await mod.estimateRemoveAttestersGas(4n, [ADDR2, ADDR3]);

      expect(getMock(ctx.registry, "removeAttesters").estimateGas).toHaveBeenCalledWith(4n, [
        ADDR2,
        ADDR3,
      ]);
    });

    it("decodes contract revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("AttesterNotAuthorized", [ADDR1, 1]);
      getMock(ctx.registry, "removeAttesters").estimateGas.mockRejectedValue({ data });

      const mod = new AttesterModule(ctx);
      await expect(mod.estimateRemoveAttestersGas(1, [ADDR1])).rejects.toThrow(ContractRevertError);
    });
  });

  describe("estimateAddWatcherAttesterGas", () => {
    it("returns estimated gas as bigint", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "addWatcherAttester").estimateGas.mockResolvedValue(65000n);

      const mod = new AttesterModule(ctx);
      expect(await mod.estimateAddWatcherAttesterGas(1, ADDR1)).toBe(65000n);
    });

    it("passes correct args to estimateGas", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "addWatcherAttester").estimateGas.mockResolvedValue(65000n);

      const mod = new AttesterModule(ctx);
      await mod.estimateAddWatcherAttesterGas(10n, ADDR3);

      expect(getMock(ctx.registry, "addWatcherAttester").estimateGas).toHaveBeenCalledWith(
        10n,
        ADDR3,
      );
    });

    it("decodes contract revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("WatcherNotRegistered", [99]);
      getMock(ctx.registry, "addWatcherAttester").estimateGas.mockRejectedValue({ data });

      const mod = new AttesterModule(ctx);
      await expect(mod.estimateAddWatcherAttesterGas(99, ADDR1)).rejects.toThrow(
        ContractRevertError,
      );
    });
  });

  describe("estimateRemoveWatcherAttesterGas", () => {
    it("returns estimated gas as bigint", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "removeWatcherAttester").estimateGas.mockResolvedValue(55000n);

      const mod = new AttesterModule(ctx);
      expect(await mod.estimateRemoveWatcherAttesterGas(1, ADDR1)).toBe(55000n);
    });

    it("passes correct args to estimateGas", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "removeWatcherAttester").estimateGas.mockResolvedValue(55000n);

      const mod = new AttesterModule(ctx);
      await mod.estimateRemoveWatcherAttesterGas(3n, ADDR2);

      expect(getMock(ctx.registry, "removeWatcherAttester").estimateGas).toHaveBeenCalledWith(
        3n,
        ADDR2,
      );
    });

    it("decodes contract revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("AttesterNotAuthorized", [ADDR1, 0]);
      getMock(ctx.registry, "removeWatcherAttester").estimateGas.mockRejectedValue({ data });

      const mod = new AttesterModule(ctx);
      await expect(mod.estimateRemoveWatcherAttesterGas(1, ADDR1)).rejects.toThrow(
        ContractRevertError,
      );
    });
  });
});
