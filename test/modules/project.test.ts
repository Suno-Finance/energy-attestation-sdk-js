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
    describe("consumer project (energyType = 0)", () => {
      it("succeeds and returns projectId and txHash", async () => {
        const ctx = createMockContext();
        const log = createMockLog(registryInterface, "ProjectRegistered", [5n, 1n, "City Grid", 0]);
        getMock(ctx.registry, "registerProject").mockResolvedValue(
          createMockTx(createMockReceipt([log], "0xconsumerhash")),
        );

        const result = await new ProjectModule(ctx).createProject(
          1,
          "City Grid",
          EnergyType.CONSUMER,
        );

        expect(result.projectId).toBe(5n);
        expect(result.txHash).toBe("0xconsumerhash");
      });

      it("does not call isEnergyTypeRegistered (type 0 is always valid)", async () => {
        const ctx = createMockContext();
        const log = createMockLog(registryInterface, "ProjectRegistered", [1n, 1n, "Consumer", 0]);
        getMock(ctx.registry, "registerProject").mockResolvedValue(
          createMockTx(createMockReceipt([log])),
        );

        await new ProjectModule(ctx).createProject(1, "Consumer", EnergyType.CONSUMER);

        expect(getMock(ctx.registry, "isEnergyTypeRegistered")).not.toHaveBeenCalled();
      });

      it("passes energyType 0 to the contract", async () => {
        const ctx = createMockContext();
        const log = createMockLog(registryInterface, "ProjectRegistered", [1n, 2n, "Factory", 0]);
        getMock(ctx.registry, "registerProject").mockResolvedValue(
          createMockTx(createMockReceipt([log])),
        );

        await new ProjectModule(ctx).createProject(2n, "Factory", EnergyType.CONSUMER);

        expect(getMock(ctx.registry, "registerProject")).toHaveBeenCalledWith(
          2n,
          "Factory",
          EnergyType.CONSUMER,
          expect.anything(),
        );
      });
    });

    describe("generator project (energyType > 0, registered)", () => {
      it("succeeds and returns projectId and txHash", async () => {
        const ctx = createMockContext();
        getMock(ctx.registry, "isEnergyTypeRegistered").mockResolvedValue(true);
        const log = createMockLog(registryInterface, "ProjectRegistered", [
          3n,
          1n,
          "Solar Farm",
          1,
        ]);
        getMock(ctx.registry, "registerProject").mockResolvedValue(
          createMockTx(createMockReceipt([log], "0xsolarhash")),
        );

        const result = await new ProjectModule(ctx).createProject(
          1,
          "Solar Farm",
          EnergyType.SOLAR_PV,
        );

        expect(result.projectId).toBe(3n);
        expect(result.txHash).toBe("0xsolarhash");
      });

      it("calls isEnergyTypeRegistered before submitting the transaction", async () => {
        const ctx = createMockContext();
        getMock(ctx.registry, "isEnergyTypeRegistered").mockResolvedValue(true);
        const log = createMockLog(registryInterface, "ProjectRegistered", [1n, 1n, "Wind", 2]);
        getMock(ctx.registry, "registerProject").mockResolvedValue(
          createMockTx(createMockReceipt([log])),
        );

        await new ProjectModule(ctx).createProject(1, "Wind", EnergyType.WIND_ONSHORE);

        expect(getMock(ctx.registry, "isEnergyTypeRegistered")).toHaveBeenCalledWith(
          EnergyType.WIND_ONSHORE,
        );
      });

      it("passes energyType to the contract", async () => {
        const ctx = createMockContext();
        getMock(ctx.registry, "isEnergyTypeRegistered").mockResolvedValue(true);
        const log = createMockLog(registryInterface, "ProjectRegistered", [1n, 1n, "Hydro", 4]);
        getMock(ctx.registry, "registerProject").mockResolvedValue(
          createMockTx(createMockReceipt([log])),
        );

        await new ProjectModule(ctx).createProject(1, "Hydro", EnergyType.HYDRO);

        expect(getMock(ctx.registry, "registerProject")).toHaveBeenCalledWith(
          1,
          "Hydro",
          EnergyType.HYDRO,
          expect.anything(),
        );
      });
    });

    describe("unregistered energy type", () => {
      it("throws ConfigurationError before submitting the transaction", async () => {
        const ctx = createMockContext();
        getMock(ctx.registry, "isEnergyTypeRegistered").mockResolvedValue(false);

        await expect(new ProjectModule(ctx).createProject(1, "Test", 99)).rejects.toThrow(
          ConfigurationError,
        );
      });

      it("does not call registerProject when the energy type check fails", async () => {
        const ctx = createMockContext();
        getMock(ctx.registry, "isEnergyTypeRegistered").mockResolvedValue(false);

        await new ProjectModule(ctx).createProject(1, "Test", 99).catch(() => {});

        expect(getMock(ctx.registry, "registerProject")).not.toHaveBeenCalled();
      });

      it("error message includes the invalid energy type", async () => {
        const ctx = createMockContext();
        getMock(ctx.registry, "isEnergyTypeRegistered").mockResolvedValue(false);

        const err = await new ProjectModule(ctx).createProject(1, "Test", 99).catch((e) => e);

        expect(err).toBeInstanceOf(ConfigurationError);
        expect(err.message).toContain("99");
      });
    });

    describe("contract revert handling", () => {
      it("throws ConfigurationError when ProjectRegistered event is missing from receipt", async () => {
        const ctx = createMockContext();
        getMock(ctx.registry, "isEnergyTypeRegistered").mockResolvedValue(true);
        getMock(ctx.registry, "registerProject").mockResolvedValue(
          createMockTx(createMockReceipt([], "0xnoevent")),
        );

        const err = await new ProjectModule(ctx)
          .createProject(1, "Test", EnergyType.SOLAR_PV)
          .catch((e) => e);

        expect(err).toBeInstanceOf(ConfigurationError);
        expect(err.message).toContain("0xnoevent");
      });

      it("decodes WatcherNotRegistered revert", async () => {
        const ctx = createMockContext();
        getMock(ctx.registry, "isEnergyTypeRegistered").mockResolvedValue(true);
        getMock(ctx.registry, "registerProject").mockRejectedValue({
          data: encodeRegistryError("WatcherNotRegistered", [99]),
        });

        const err = await new ProjectModule(ctx)
          .createProject(99, "Test", EnergyType.SOLAR_PV)
          .catch((e) => e);
        expect(err).toBeInstanceOf(ContractRevertError);
        expect((err as ContractRevertError).errorName).toBe("WatcherNotRegistered");
      });

      it("decodes UnauthorizedWatcherOwner revert", async () => {
        const ctx = createMockContext();
        getMock(ctx.registry, "isEnergyTypeRegistered").mockResolvedValue(true);
        getMock(ctx.registry, "registerProject").mockRejectedValue({
          data: encodeRegistryError("UnauthorizedWatcherOwner", [
            "0x0000000000000000000000000000000000000001",
            2,
          ]),
        });

        const err = await new ProjectModule(ctx)
          .createProject(2, "Test", EnergyType.SOLAR_PV)
          .catch((e) => e);
        expect(err).toBeInstanceOf(ContractRevertError);
        expect((err as ContractRevertError).errorName).toBe("UnauthorizedWatcherOwner");
      });

      it("decodes contract-level InvalidEnergyType revert (SDK pre-flight passed but contract rejects)", async () => {
        const ctx = createMockContext();
        getMock(ctx.registry, "isEnergyTypeRegistered").mockResolvedValue(true);
        getMock(ctx.registry, "registerProject").mockRejectedValue({
          data: encodeRegistryError("InvalidEnergyType", [5]),
        });

        const err = await new ProjectModule(ctx).createProject(1, "Test", 5).catch((e) => e);
        expect(err).toBeInstanceOf(ContractRevertError);
        expect((err as ContractRevertError).errorName).toBe("InvalidEnergyType");
      });
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
      expect(getMock(ctx.registry, "deregisterProject")).toHaveBeenCalledWith(
        42n,
        expect.anything(),
      );
    });

    it("decodes ProjectNotRegistered revert", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("ProjectNotRegistered", [3]);
      getMock(ctx.registry, "deregisterProject").mockRejectedValue({ data });

      const err = await new ProjectModule(ctx).deregisterProject(3).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("ProjectNotRegistered");
    });

    it("decodes UnauthorizedWatcherOwner revert", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("UnauthorizedWatcherOwner", [
        "0x0000000000000000000000000000000000000001",
        1,
      ]);
      getMock(ctx.registry, "deregisterProject").mockRejectedValue({ data });

      const err = await new ProjectModule(ctx).deregisterProject(3).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("UnauthorizedWatcherOwner");
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

    it("decodes ProjectNotRegistered revert", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("ProjectNotRegistered", [1]);
      getMock(ctx.registry, "transferProject").mockRejectedValue({ data });

      const err = await new ProjectModule(ctx).transferProject(1, 2).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("ProjectNotRegistered");
    });

    it("decodes WatcherNotRegistered revert (destination watcher does not exist)", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("WatcherNotRegistered", [99]);
      getMock(ctx.registry, "transferProject").mockRejectedValue({ data });

      const err = await new ProjectModule(ctx).transferProject(1, 99).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("WatcherNotRegistered");
    });

    it("decodes UnauthorizedWatcherOwner revert", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("UnauthorizedWatcherOwner", [
        "0x0000000000000000000000000000000000000001",
        1,
      ]);
      getMock(ctx.registry, "transferProject").mockRejectedValue({ data });

      const err = await new ProjectModule(ctx).transferProject(1, 2).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("UnauthorizedWatcherOwner");
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

      const err = await new ProjectModule(ctx).setProjectMetadataURI(3, "ipfs://x").catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("ProjectNotRegistered");
    });

    it("decodes UnauthorizedWatcherOwner revert", async () => {
      const ctx = createMockContext();
      const data = encodeRegistryError("UnauthorizedWatcherOwner", [
        "0x0000000000000000000000000000000000000001",
        1,
      ]);
      getMock(ctx.registry, "setProjectMetadataURI").mockRejectedValue({ data });

      const err = await new ProjectModule(ctx).setProjectMetadataURI(3, "ipfs://x").catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("UnauthorizedWatcherOwner");
    });

    it("accepts empty string URI (valid — clears the metadata)", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "setProjectMetadataURI").mockResolvedValue(
        createMockTx(createMockReceipt([], "0xclear")),
      );

      const result = await new ProjectModule(ctx).setProjectMetadataURI(1, "");
      expect(result.txHash).toBe("0xclear");
      expect(getMock(ctx.registry, "setProjectMetadataURI")).toHaveBeenCalledWith(
        1,
        "",
        expect.anything(),
      );
    });
  });

  describe("estimateCreateProjectGas", () => {
    it("returns estimated gas as bigint", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "registerProject").estimateGas.mockResolvedValue(80000n);

      const gas = await new ProjectModule(ctx).estimateCreateProjectGas(
        1,
        "Solar Farm",
        EnergyType.SOLAR_PV,
      );
      expect(gas).toBe(80000n);
    });

    it("decodes contract revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "registerProject").estimateGas.mockRejectedValue({
        data: encodeRegistryError("WatcherNotRegistered", [99]),
      });

      const err = await new ProjectModule(ctx)
        .estimateCreateProjectGas(99, "Test", EnergyType.SOLAR_PV)
        .catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("WatcherNotRegistered");
    });
  });

  describe("estimateDeregisterProjectGas", () => {
    it("returns estimated gas as bigint", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "deregisterProject").estimateGas.mockResolvedValue(40000n);

      const gas = await new ProjectModule(ctx).estimateDeregisterProjectGas(1);
      expect(gas).toBe(40000n);
    });

    it("decodes contract revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "deregisterProject").estimateGas.mockRejectedValue({
        data: encodeRegistryError("ProjectNotRegistered", [1]),
      });

      const err = await new ProjectModule(ctx).estimateDeregisterProjectGas(1).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("ProjectNotRegistered");
    });
  });

  describe("estimateTransferProjectGas", () => {
    it("returns estimated gas as bigint", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "transferProject").estimateGas.mockResolvedValue(55000n);

      const gas = await new ProjectModule(ctx).estimateTransferProjectGas(1, 2);
      expect(gas).toBe(55000n);
    });

    it("decodes contract revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "transferProject").estimateGas.mockRejectedValue({
        data: encodeRegistryError("WatcherNotRegistered", [2]),
      });

      const err = await new ProjectModule(ctx).estimateTransferProjectGas(1, 2).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("WatcherNotRegistered");
    });
  });

  describe("estimateSetProjectMetadataURIGas", () => {
    it("returns estimated gas as bigint", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "setProjectMetadataURI").estimateGas.mockResolvedValue(30000n);

      const gas = await new ProjectModule(ctx).estimateSetProjectMetadataURIGas(1, "ipfs://Qm");
      expect(gas).toBe(30000n);
    });

    it("decodes contract revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "setProjectMetadataURI").estimateGas.mockRejectedValue({
        data: encodeRegistryError("ProjectNotRegistered", [1]),
      });

      const err = await new ProjectModule(ctx)
        .estimateSetProjectMetadataURIGas(1, "ipfs://x")
        .catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("ProjectNotRegistered");
    });
  });
});
