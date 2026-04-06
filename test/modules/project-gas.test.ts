import { describe, it, expect } from "vitest";
import { ProjectModule } from "../../src/modules/ProjectModule.js";
import { createMockContext, getMock, encodeRegistryError } from "../helpers/mocks.js";
import { EnergyType } from "../../src/types.js";
import { ContractRevertError } from "../../src/errors.js";

describe("ProjectModule — gas estimation", () => {
  describe("estimateCreateProjectGas", () => {
    it("returns estimated gas as bigint", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "registerProject").estimateGas.mockResolvedValue(95000n);

      const mod = new ProjectModule(ctx);
      const gas = await mod.estimateCreateProjectGas(1, "Solar Farm Alpha", EnergyType.SOLAR_PV);

      expect(gas).toBe(95000n);
    });

    it("passes correct args to estimateGas", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "registerProject").estimateGas.mockResolvedValue(95000n);

      const mod = new ProjectModule(ctx);
      await mod.estimateCreateProjectGas(2n, "Wind Farm", EnergyType.WIND_ONSHORE);

      expect(getMock(ctx.registry, "registerProject").estimateGas).toHaveBeenCalledWith(
        2n,
        "Wind Farm",
        EnergyType.WIND_ONSHORE,
      );
    });

    it("decodes contract revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("WatcherNotRegistered", [99]);
      getMock(ctx.registry, "registerProject").estimateGas.mockRejectedValue({ data });

      const mod = new ProjectModule(ctx);
      await expect(mod.estimateCreateProjectGas(99, "Test", 0)).rejects.toThrow(
        ContractRevertError,
      );
    });
  });

  describe("estimateDeregisterProjectGas", () => {
    it("returns estimated gas as bigint", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "deregisterProject").estimateGas.mockResolvedValue(40000n);

      const mod = new ProjectModule(ctx);
      const gas = await mod.estimateDeregisterProjectGas(3);

      expect(gas).toBe(40000n);
    });

    it("passes correct projectId to estimateGas", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "deregisterProject").estimateGas.mockResolvedValue(40000n);

      const mod = new ProjectModule(ctx);
      await mod.estimateDeregisterProjectGas(42n);

      expect(getMock(ctx.registry, "deregisterProject").estimateGas).toHaveBeenCalledWith(42n);
    });

    it("decodes contract revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("ProjectNotRegistered", [3]);
      getMock(ctx.registry, "deregisterProject").estimateGas.mockRejectedValue({ data });

      const mod = new ProjectModule(ctx);
      await expect(mod.estimateDeregisterProjectGas(3)).rejects.toThrow(ContractRevertError);
    });
  });

  describe("estimateTransferProjectGas", () => {
    it("returns estimated gas as bigint", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "transferProject").estimateGas.mockResolvedValue(50000n);

      const mod = new ProjectModule(ctx);
      const gas = await mod.estimateTransferProjectGas(1, 2);

      expect(gas).toBe(50000n);
    });

    it("passes correct args to estimateGas", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "transferProject").estimateGas.mockResolvedValue(50000n);

      const mod = new ProjectModule(ctx);
      await mod.estimateTransferProjectGas(5n, 10n);

      expect(getMock(ctx.registry, "transferProject").estimateGas).toHaveBeenCalledWith(5n, 10n);
    });

    it("decodes contract revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("ProjectNotRegistered", [1]);
      getMock(ctx.registry, "transferProject").estimateGas.mockRejectedValue({ data });

      const mod = new ProjectModule(ctx);
      await expect(mod.estimateTransferProjectGas(1, 2)).rejects.toThrow(ContractRevertError);
    });
  });

  describe("estimateSetProjectMetadataURIGas", () => {
    it("returns estimated gas as bigint", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "setProjectMetadataURI").estimateGas.mockResolvedValue(35000n);

      const mod = new ProjectModule(ctx);
      const gas = await mod.estimateSetProjectMetadataURIGas(3, "ipfs://metadata");

      expect(gas).toBe(35000n);
    });

    it("passes correct args to estimateGas", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "setProjectMetadataURI").estimateGas.mockResolvedValue(35000n);

      const mod = new ProjectModule(ctx);
      await mod.estimateSetProjectMetadataURIGas(7n, "https://example.com/meta.json");

      expect(getMock(ctx.registry, "setProjectMetadataURI").estimateGas).toHaveBeenCalledWith(
        7n,
        "https://example.com/meta.json",
      );
    });

    it("decodes contract revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("ProjectNotRegistered", [3]);
      getMock(ctx.registry, "setProjectMetadataURI").estimateGas.mockRejectedValue({ data });

      const mod = new ProjectModule(ctx);
      await expect(mod.estimateSetProjectMetadataURIGas(3, "ipfs://x")).rejects.toThrow(
        ContractRevertError,
      );
    });
  });
});
