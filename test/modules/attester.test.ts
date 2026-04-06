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
      expect(getMock(ctx.registry, "addAttester")).toHaveBeenCalledWith(
        5n,
        ADDR2,
        expect.anything(),
      );
    });

    it("throws ConfigurationError for invalid attester address", async () => {
      const ctx = createMockContext();
      await expect(new AttesterModule(ctx).addAttester(1, "not-an-address")).rejects.toThrow(
        ConfigurationError,
      );
    });

    it("decodes AttesterAlreadyAuthorized revert", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "addAttester").mockRejectedValue({
        data: encodeRegistryError("AttesterAlreadyAuthorized", [ADDR1, 1]),
      });
      const err = await new AttesterModule(ctx).addAttester(1, ADDR1).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("AttesterAlreadyAuthorized");
    });

    it("decodes ProjectNotRegistered revert", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "addAttester").mockRejectedValue({
        data: encodeRegistryError("ProjectNotRegistered", [1]),
      });
      const err = await new AttesterModule(ctx).addAttester(1, ADDR1).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("ProjectNotRegistered");
    });

    it("decodes UnauthorizedWatcherOwner revert", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "addAttester").mockRejectedValue({
        data: encodeRegistryError("UnauthorizedWatcherOwner", [ADDR1, 1]),
      });
      const err = await new AttesterModule(ctx).addAttester(1, ADDR1).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("UnauthorizedWatcherOwner");
    });
  });

  describe("removeAttester", () => {
    it("returns txHash as object", async () => {
      const ctx = createMockContext();
      setupMock(ctx, "removeAttester", "0xremove");
      const result = await new AttesterModule(ctx).removeAttester(1, ADDR1);
      expect(result.txHash).toBe("0xremove");
    });

    it("passes correct args to contract", async () => {
      const ctx = createMockContext();
      setupMock(ctx, "removeAttester");
      await new AttesterModule(ctx).removeAttester(3n, ADDR1);
      expect(getMock(ctx.registry, "removeAttester")).toHaveBeenCalledWith(
        3n,
        ADDR1,
        expect.anything(),
      );
    });

    it("throws ConfigurationError for invalid attester address", async () => {
      const ctx = createMockContext();
      await expect(new AttesterModule(ctx).removeAttester(1, "0xbad")).rejects.toThrow(
        ConfigurationError,
      );
    });

    it("decodes AttesterNotAuthorized revert", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "removeAttester").mockRejectedValue({
        data: encodeRegistryError("AttesterNotAuthorized", [ADDR1, 1]),
      });
      const err = await new AttesterModule(ctx).removeAttester(1, ADDR1).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("AttesterNotAuthorized");
    });

    it("decodes ProjectNotRegistered revert", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "removeAttester").mockRejectedValue({
        data: encodeRegistryError("ProjectNotRegistered", [1]),
      });
      const err = await new AttesterModule(ctx).removeAttester(1, ADDR1).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("ProjectNotRegistered");
    });

    it("decodes UnauthorizedWatcherOwner revert", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "removeAttester").mockRejectedValue({
        data: encodeRegistryError("UnauthorizedWatcherOwner", [ADDR1, 1]),
      });
      const err = await new AttesterModule(ctx).removeAttester(1, ADDR1).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("UnauthorizedWatcherOwner");
    });
  });

  describe("addAttesters", () => {
    it("returns txHash as object", async () => {
      const ctx = createMockContext();
      setupMock(ctx, "addAttesters", "0xbatch");
      const result = await new AttesterModule(ctx).addAttesters(1, [ADDR1, ADDR2]);
      expect(result.txHash).toBe("0xbatch");
    });

    it("passes correct args to contract", async () => {
      const ctx = createMockContext();
      setupMock(ctx, "addAttesters");
      await new AttesterModule(ctx).addAttesters(2, [ADDR1, ADDR2, ADDR3]);
      expect(getMock(ctx.registry, "addAttesters")).toHaveBeenCalledWith(
        2,
        [ADDR1, ADDR2, ADDR3],
        expect.anything(),
      );
    });

    it("throws ConfigurationError when any address is invalid", async () => {
      const ctx = createMockContext();
      await expect(new AttesterModule(ctx).addAttesters(1, [ADDR1, "bad-address"])).rejects.toThrow(
        ConfigurationError,
      );
    });

    it("decodes EmptyAttesterArray revert", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "addAttesters").mockRejectedValue({
        data: encodeRegistryError("EmptyAttesterArray", []),
      });
      const err = await new AttesterModule(ctx).addAttesters(1, []).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("EmptyAttesterArray");
    });

    it("decodes ProjectNotRegistered revert", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "addAttesters").mockRejectedValue({
        data: encodeRegistryError("ProjectNotRegistered", [1]),
      });
      const err = await new AttesterModule(ctx).addAttesters(1, [ADDR1]).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("ProjectNotRegistered");
    });

    it("decodes UnauthorizedWatcherOwner revert", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "addAttesters").mockRejectedValue({
        data: encodeRegistryError("UnauthorizedWatcherOwner", [ADDR1, 1]),
      });
      const err = await new AttesterModule(ctx).addAttesters(1, [ADDR1]).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("UnauthorizedWatcherOwner");
    });
  });

  describe("removeAttesters", () => {
    it("returns txHash as object", async () => {
      const ctx = createMockContext();
      setupMock(ctx, "removeAttesters", "0xbatchrm");
      const result = await new AttesterModule(ctx).removeAttesters(1, [ADDR1]);
      expect(result.txHash).toBe("0xbatchrm");
    });

    it("passes correct args to contract", async () => {
      const ctx = createMockContext();
      setupMock(ctx, "removeAttesters");
      await new AttesterModule(ctx).removeAttesters(4n, [ADDR2, ADDR3]);
      expect(getMock(ctx.registry, "removeAttesters")).toHaveBeenCalledWith(
        4n,
        [ADDR2, ADDR3],
        expect.anything(),
      );
    });

    it("throws ConfigurationError when any address is invalid", async () => {
      const ctx = createMockContext();
      await expect(new AttesterModule(ctx).removeAttesters(1, ["not-valid"])).rejects.toThrow(
        ConfigurationError,
      );
    });

    it("decodes AttesterNotAuthorized revert", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "removeAttesters").mockRejectedValue({
        data: encodeRegistryError("AttesterNotAuthorized", [ADDR1, 1]),
      });
      const err = await new AttesterModule(ctx).removeAttesters(1, [ADDR1]).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("AttesterNotAuthorized");
    });

    it("decodes ProjectNotRegistered revert", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "removeAttesters").mockRejectedValue({
        data: encodeRegistryError("ProjectNotRegistered", [1]),
      });
      const err = await new AttesterModule(ctx).removeAttesters(1, [ADDR1]).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("ProjectNotRegistered");
    });

    it("decodes UnauthorizedWatcherOwner revert", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "removeAttesters").mockRejectedValue({
        data: encodeRegistryError("UnauthorizedWatcherOwner", [ADDR1, 1]),
      });
      const err = await new AttesterModule(ctx).removeAttesters(1, [ADDR1]).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("UnauthorizedWatcherOwner");
    });
  });

  describe("addWatcherAttester", () => {
    it("returns txHash as object", async () => {
      const ctx = createMockContext();
      setupMock(ctx, "addWatcherAttester", "0xwatcheradd");
      const result = await new AttesterModule(ctx).addWatcherAttester(1, ADDR1);
      expect(result.txHash).toBe("0xwatcheradd");
    });

    it("passes correct args to contract", async () => {
      const ctx = createMockContext();
      setupMock(ctx, "addWatcherAttester");
      await new AttesterModule(ctx).addWatcherAttester(10n, ADDR3);
      expect(getMock(ctx.registry, "addWatcherAttester")).toHaveBeenCalledWith(
        10n,
        ADDR3,
        expect.anything(),
      );
    });

    it("throws ConfigurationError for invalid attester address", async () => {
      const ctx = createMockContext();
      await expect(new AttesterModule(ctx).addWatcherAttester(1, "not-an-address")).rejects.toThrow(
        ConfigurationError,
      );
    });

    it("decodes WatcherNotRegistered revert", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "addWatcherAttester").mockRejectedValue({
        data: encodeRegistryError("WatcherNotRegistered", [99]),
      });
      const err = await new AttesterModule(ctx).addWatcherAttester(99, ADDR1).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("WatcherNotRegistered");
    });

    it("decodes UnauthorizedWatcherOwner revert", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "addWatcherAttester").mockRejectedValue({
        data: encodeRegistryError("UnauthorizedWatcherOwner", [ADDR1, 1]),
      });
      const err = await new AttesterModule(ctx).addWatcherAttester(1, ADDR1).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("UnauthorizedWatcherOwner");
    });

    it("decodes AttesterAlreadyAuthorized revert", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "addWatcherAttester").mockRejectedValue({
        data: encodeRegistryError("AttesterAlreadyAuthorized", [ADDR1, 1]),
      });
      const err = await new AttesterModule(ctx).addWatcherAttester(1, ADDR1).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("AttesterAlreadyAuthorized");
    });
  });

  describe("estimateAddAttesterGas", () => {
    it("returns estimated gas as bigint", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "addAttester").estimateGas.mockResolvedValue(50000n);
      const gas = await new AttesterModule(ctx).estimateAddAttesterGas(1, ADDR1);
      expect(gas).toBe(50000n);
    });

    it("decodes contract revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "addAttester").estimateGas.mockRejectedValue({
        data: encodeRegistryError("ProjectNotRegistered", [1]),
      });
      const err = await new AttesterModule(ctx).estimateAddAttesterGas(1, ADDR1).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("ProjectNotRegistered");
    });
  });

  describe("estimateRemoveAttesterGas", () => {
    it("returns estimated gas as bigint", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "removeAttester").estimateGas.mockResolvedValue(45000n);
      const gas = await new AttesterModule(ctx).estimateRemoveAttesterGas(1, ADDR1);
      expect(gas).toBe(45000n);
    });

    it("decodes contract revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "removeAttester").estimateGas.mockRejectedValue({
        data: encodeRegistryError("AttesterNotAuthorized", [ADDR1, 1]),
      });
      const err = await new AttesterModule(ctx).estimateRemoveAttesterGas(1, ADDR1).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("AttesterNotAuthorized");
    });
  });

  describe("estimateAddAttestersGas", () => {
    it("returns estimated gas as bigint", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "addAttesters").estimateGas.mockResolvedValue(70000n);
      const gas = await new AttesterModule(ctx).estimateAddAttestersGas(1, [ADDR1, ADDR2]);
      expect(gas).toBe(70000n);
    });

    it("decodes contract revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "addAttesters").estimateGas.mockRejectedValue({
        data: encodeRegistryError("ProjectNotRegistered", [1]),
      });
      const err = await new AttesterModule(ctx).estimateAddAttestersGas(1, [ADDR1]).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("ProjectNotRegistered");
    });
  });

  describe("estimateRemoveAttestersGas", () => {
    it("returns estimated gas as bigint", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "removeAttesters").estimateGas.mockResolvedValue(65000n);
      const gas = await new AttesterModule(ctx).estimateRemoveAttestersGas(1, [ADDR1]);
      expect(gas).toBe(65000n);
    });

    it("decodes contract revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "removeAttesters").estimateGas.mockRejectedValue({
        data: encodeRegistryError("AttesterNotAuthorized", [ADDR1, 1]),
      });
      const err = await new AttesterModule(ctx)
        .estimateRemoveAttestersGas(1, [ADDR1])
        .catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("AttesterNotAuthorized");
    });
  });

  describe("estimateAddWatcherAttesterGas", () => {
    it("returns estimated gas as bigint", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "addWatcherAttester").estimateGas.mockResolvedValue(55000n);
      const gas = await new AttesterModule(ctx).estimateAddWatcherAttesterGas(1, ADDR1);
      expect(gas).toBe(55000n);
    });

    it("decodes contract revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "addWatcherAttester").estimateGas.mockRejectedValue({
        data: encodeRegistryError("WatcherNotRegistered", [1]),
      });
      const err = await new AttesterModule(ctx)
        .estimateAddWatcherAttesterGas(1, ADDR1)
        .catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("WatcherNotRegistered");
    });
  });

  describe("estimateRemoveWatcherAttesterGas", () => {
    it("returns estimated gas as bigint", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "removeWatcherAttester").estimateGas.mockResolvedValue(48000n);
      const gas = await new AttesterModule(ctx).estimateRemoveWatcherAttesterGas(1, ADDR1);
      expect(gas).toBe(48000n);
    });

    it("decodes contract revert into ContractRevertError", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "removeWatcherAttester").estimateGas.mockRejectedValue({
        data: encodeRegistryError("AttesterNotAuthorized", [ADDR1, 0]),
      });
      const err = await new AttesterModule(ctx)
        .estimateRemoveWatcherAttesterGas(1, ADDR1)
        .catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("AttesterNotAuthorized");
    });
  });

  describe("removeWatcherAttester", () => {
    it("returns txHash as object", async () => {
      const ctx = createMockContext();
      setupMock(ctx, "removeWatcherAttester", "0xwatcherrm");
      const result = await new AttesterModule(ctx).removeWatcherAttester(1, ADDR1);
      expect(result.txHash).toBe("0xwatcherrm");
    });

    it("passes correct args to contract", async () => {
      const ctx = createMockContext();
      setupMock(ctx, "removeWatcherAttester");
      await new AttesterModule(ctx).removeWatcherAttester(3n, ADDR2);
      expect(getMock(ctx.registry, "removeWatcherAttester")).toHaveBeenCalledWith(
        3n,
        ADDR2,
        expect.anything(),
      );
    });

    it("throws ConfigurationError for invalid attester address", async () => {
      const ctx = createMockContext();
      await expect(new AttesterModule(ctx).removeWatcherAttester(1, "bad")).rejects.toThrow(
        ConfigurationError,
      );
    });

    it("decodes AttesterNotAuthorized revert", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "removeWatcherAttester").mockRejectedValue({
        data: encodeRegistryError("AttesterNotAuthorized", [ADDR1, 0]),
      });
      const err = await new AttesterModule(ctx).removeWatcherAttester(1, ADDR1).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("AttesterNotAuthorized");
    });

    it("decodes WatcherNotRegistered revert", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "removeWatcherAttester").mockRejectedValue({
        data: encodeRegistryError("WatcherNotRegistered", [99]),
      });
      const err = await new AttesterModule(ctx).removeWatcherAttester(99, ADDR1).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("WatcherNotRegistered");
    });

    it("decodes UnauthorizedWatcherOwner revert", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "removeWatcherAttester").mockRejectedValue({
        data: encodeRegistryError("UnauthorizedWatcherOwner", [ADDR1, 1]),
      });
      const err = await new AttesterModule(ctx).removeWatcherAttester(1, ADDR1).catch((e) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).errorName).toBe("UnauthorizedWatcherOwner");
    });
  });
});
