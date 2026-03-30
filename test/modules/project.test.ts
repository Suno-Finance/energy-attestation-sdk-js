import { describe, it, expect } from "vitest";
import { ProjectModule } from "../../src/modules/ProjectModule.js";
import {
  createMockContext,
  createMockTx,
  createMockLog,
  createMockReceipt,
  getMock,
  encodeRegistryError,
  registryInterface,
} from "../helpers/mocks.js";
import { EnergyType } from "../../src/types.js";
import { ConfigurationError, ContractRevertError } from "../../src/errors.js";

describe("ProjectModule", () => {
  describe("createProject", () => {
    it("returns projectId from event", async () => {
      const ctx = createMockContext();
      const log = createMockLog(registryInterface, "ProjectRegistered", [
        3n,
        1n,
        "Solar Farm Alpha",
        1,
      ]);
      const receipt = createMockReceipt([log], "0xprojecthash");
      const mockTx = createMockTx(receipt);
      getMock(ctx.registry, "registerProject").mockResolvedValue(mockTx);

      const mod = new ProjectModule(ctx);
      const result = await mod.createProject(1, "Solar Farm Alpha", EnergyType.SOLAR_PV);

      expect(result.projectId).toBe(3n);
      expect(result.txHash).toBe("0xprojecthash");
    });

    it("passes correct args to contract", async () => {
      const ctx = createMockContext();
      const log = createMockLog(registryInterface, "ProjectRegistered", [1n, 2n, "Test", 0]);
      const receipt = createMockReceipt([log]);
      const mockTx = createMockTx(receipt);
      getMock(ctx.registry, "registerProject").mockResolvedValue(mockTx);

      const mod = new ProjectModule(ctx);
      await mod.createProject(2n, "Test", EnergyType.CONSUMER);

      expect(getMock(ctx.registry, "registerProject")).toHaveBeenCalledWith(
        2n,
        "Test",
        EnergyType.CONSUMER,
        expect.anything(),
      );
    });

    it("accepts numeric energyType", async () => {
      const ctx = createMockContext();
      const log = createMockLog(registryInterface, "ProjectRegistered", [1n, 1n, "Wind", 2]);
      const receipt = createMockReceipt([log]);
      const mockTx = createMockTx(receipt);
      getMock(ctx.registry, "registerProject").mockResolvedValue(mockTx);

      const mod = new ProjectModule(ctx);
      await mod.createProject(1, "Wind", 2);

      expect(getMock(ctx.registry, "registerProject")).toHaveBeenCalledWith(
        1,
        "Wind",
        2,
        expect.anything(),
      );
    });

    it("throws ConfigurationError when ProjectRegistered event not found in logs", async () => {
      const ctx = createMockContext();
      const receipt = createMockReceipt([], "0xnoevent");
      const mockTx = createMockTx(receipt);
      getMock(ctx.registry, "registerProject").mockResolvedValue(mockTx);

      const mod = new ProjectModule(ctx);
      await expect(mod.createProject(1, "Test", 0)).rejects.toThrow(ConfigurationError);
    });

    it("decodes contract revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("WatcherNotRegistered", [99]);
      getMock(ctx.registry, "registerProject").mockRejectedValue({ data });

      const mod = new ProjectModule(ctx);
      await expect(mod.createProject(99, "Test", 0)).rejects.toThrow(ContractRevertError);
    });
  });

  describe("deregisterProject", () => {
    it("returns txHash as object", async () => {
      const ctx = createMockContext();
      const receipt = createMockReceipt([], "0xderegister");
      const mockTx = createMockTx(receipt);
      getMock(ctx.registry, "deregisterProject").mockResolvedValue(mockTx);

      const mod = new ProjectModule(ctx);
      const result = await mod.deregisterProject(3);
      expect(result.txHash).toBe("0xderegister");
    });

    it("passes projectId to contract", async () => {
      const ctx = createMockContext();
      const receipt = createMockReceipt([]);
      const mockTx = createMockTx(receipt);
      getMock(ctx.registry, "deregisterProject").mockResolvedValue(mockTx);

      const mod = new ProjectModule(ctx);
      await mod.deregisterProject(42n);
      expect(getMock(ctx.registry, "deregisterProject")).toHaveBeenCalledWith(42n, expect.anything());
    });

    it("decodes contract revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("ProjectNotRegistered", [3]);
      getMock(ctx.registry, "deregisterProject").mockRejectedValue({ data });

      const mod = new ProjectModule(ctx);
      await expect(mod.deregisterProject(3)).rejects.toThrow(ContractRevertError);
    });
  });

  describe("transferProject", () => {
    it("returns txHash as object", async () => {
      const ctx = createMockContext();
      const receipt = createMockReceipt([], "0xtransfer");
      const mockTx = createMockTx(receipt);
      getMock(ctx.registry, "transferProject").mockResolvedValue(mockTx);

      const mod = new ProjectModule(ctx);
      const result = await mod.transferProject(1, 2);
      expect(result.txHash).toBe("0xtransfer");
    });

    it("passes correct args to contract", async () => {
      const ctx = createMockContext();
      const receipt = createMockReceipt([]);
      const mockTx = createMockTx(receipt);
      getMock(ctx.registry, "transferProject").mockResolvedValue(mockTx);

      const mod = new ProjectModule(ctx);
      await mod.transferProject(5n, 10n);
      expect(getMock(ctx.registry, "transferProject")).toHaveBeenCalledWith(
        5n,
        10n,
        expect.anything(),
      );
    });

    it("decodes contract revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("ProjectNotRegistered", [1]);
      getMock(ctx.registry, "transferProject").mockRejectedValue({ data });

      const mod = new ProjectModule(ctx);
      await expect(mod.transferProject(1, 2)).rejects.toThrow(ContractRevertError);
    });
  });

  describe("setProjectMetadataURI", () => {
    it("returns txHash as object", async () => {
      const ctx = createMockContext();
      const receipt = createMockReceipt([], "0xmetadata");
      const mockTx = createMockTx(receipt);
      getMock(ctx.registry, "setProjectMetadataURI").mockResolvedValue(mockTx);

      const mod = new ProjectModule(ctx);
      const result = await mod.setProjectMetadataURI(3, "ipfs://metadata");
      expect(result.txHash).toBe("0xmetadata");
    });

    it("passes correct args to contract", async () => {
      const ctx = createMockContext();
      const receipt = createMockReceipt([]);
      const mockTx = createMockTx(receipt);
      getMock(ctx.registry, "setProjectMetadataURI").mockResolvedValue(mockTx);

      const mod = new ProjectModule(ctx);
      await mod.setProjectMetadataURI(7n, "https://example.com/meta.json");
      expect(getMock(ctx.registry, "setProjectMetadataURI")).toHaveBeenCalledWith(
        7n,
        "https://example.com/meta.json",
        expect.anything(),
      );
    });

    it("decodes contract revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("ProjectNotRegistered", [3]);
      getMock(ctx.registry, "setProjectMetadataURI").mockRejectedValue({ data });

      const mod = new ProjectModule(ctx);
      await expect(mod.setProjectMetadataURI(3, "ipfs://x")).rejects.toThrow(ContractRevertError);
    });
  });
});
