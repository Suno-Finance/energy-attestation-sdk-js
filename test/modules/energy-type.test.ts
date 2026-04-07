import { describe, it, expect } from "vitest";
import { EnergyTypeModule } from "../../src/modules/EnergyTypeModule.js";
import {
  createMockContext,
  createMockTx,
  createMockReceipt,
  getMock,
  encodeRegistryError,
} from "../helpers/mocks.js";
import { ConfigurationError, ContractRevertError } from "../../src/errors.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeModule() {
  const ctx = createMockContext();
  return { ctx, mod: new EnergyTypeModule(ctx) };
}

function setupSuccessfulTx(
  ctx: ReturnType<typeof createMockContext>,
  method: string,
  hash = "0xtxhash",
) {
  const receipt = createMockReceipt([], hash);
  getMock(ctx.registry, method).mockResolvedValue(createMockTx(receipt));
}

// ---------------------------------------------------------------------------
// registerEnergyType
// ---------------------------------------------------------------------------

describe("EnergyTypeModule.registerEnergyType", () => {
  it("returns txHash on success", async () => {
    const { ctx, mod } = makeModule();
    setupSuccessfulTx(ctx, "registerEnergyType", "0xreg");

    const result = await mod.registerEnergyType(14, "new_source");

    expect(result.txHash).toBe("0xreg");
  });

  it("passes id and name to contract", async () => {
    const { ctx, mod } = makeModule();
    setupSuccessfulTx(ctx, "registerEnergyType");

    await mod.registerEnergyType(5, "biomass");

    expect(getMock(ctx.registry, "registerEnergyType")).toHaveBeenCalledWith(
      5,
      "biomass",
      expect.anything(),
    );
  });

  it("throws ConfigurationError when id is 0 (consumer reserved)", async () => {
    const { mod } = makeModule();
    await expect(mod.registerEnergyType(0, "consumer")).rejects.toThrow(ConfigurationError);
  });

  it("ConfigurationError for id=0 includes descriptive message", async () => {
    const { mod } = makeModule();
    const err = await mod.registerEnergyType(0, "consumer").catch((e) => e);
    expect((err as ConfigurationError).message).toMatch(/reserved/i);
  });

  it("does not call the contract when id is 0", async () => {
    const { ctx, mod } = makeModule();
    await mod.registerEnergyType(0, "consumer").catch(() => {});
    expect(getMock(ctx.registry, "registerEnergyType")).not.toHaveBeenCalled();
  });

  it("decodes UnauthorizedEnergyTypeAdmin revert into ContractRevertError", async () => {
    const { ctx, mod } = makeModule();
    const data = encodeRegistryError("UnauthorizedEnergyTypeAdmin", [
      "0x0000000000000000000000000000000000000001",
    ]);
    getMock(ctx.registry, "registerEnergyType").mockRejectedValue({ data });

    const err = await mod.registerEnergyType(14, "new_source").catch((e) => e);
    expect(err).toBeInstanceOf(ContractRevertError);
    expect((err as ContractRevertError).errorName).toBe("UnauthorizedEnergyTypeAdmin");
  });

  it("decodes InvalidEnergyType revert into ContractRevertError", async () => {
    const { ctx, mod } = makeModule();
    const data = encodeRegistryError("InvalidEnergyType", [0]);
    getMock(ctx.registry, "registerEnergyType").mockRejectedValue({ data });

    const err = await mod.registerEnergyType(255, "overflow").catch((e) => e);
    expect(err).toBeInstanceOf(ContractRevertError);
    expect((err as ContractRevertError).errorName).toBe("InvalidEnergyType");
  });
});

// ---------------------------------------------------------------------------
// removeEnergyType
// ---------------------------------------------------------------------------

describe("EnergyTypeModule.removeEnergyType", () => {
  it("returns txHash on success", async () => {
    const { ctx, mod } = makeModule();
    setupSuccessfulTx(ctx, "removeEnergyType", "0xrem");

    const result = await mod.removeEnergyType(5);

    expect(result.txHash).toBe("0xrem");
  });

  it("passes id to contract", async () => {
    const { ctx, mod } = makeModule();
    setupSuccessfulTx(ctx, "removeEnergyType");

    await mod.removeEnergyType(3);

    expect(getMock(ctx.registry, "removeEnergyType")).toHaveBeenCalledWith(3, expect.anything());
  });

  it("decodes UnauthorizedEnergyTypeAdmin revert into ContractRevertError", async () => {
    const { ctx, mod } = makeModule();
    const data = encodeRegistryError("UnauthorizedEnergyTypeAdmin", [
      "0x0000000000000000000000000000000000000001",
    ]);
    getMock(ctx.registry, "removeEnergyType").mockRejectedValue({ data });

    const err = await mod.removeEnergyType(3).catch((e) => e);
    expect(err).toBeInstanceOf(ContractRevertError);
    expect((err as ContractRevertError).errorName).toBe("UnauthorizedEnergyTypeAdmin");
  });

  it("decodes EnergyTypeNotRegistered revert into ContractRevertError", async () => {
    const { ctx, mod } = makeModule();
    const data = encodeRegistryError("EnergyTypeNotRegistered", [99]);
    getMock(ctx.registry, "removeEnergyType").mockRejectedValue({ data });

    const err = await mod.removeEnergyType(99).catch((e) => e);
    expect(err).toBeInstanceOf(ContractRevertError);
    expect((err as ContractRevertError).errorName).toBe("EnergyTypeNotRegistered");
  });
});

// ---------------------------------------------------------------------------
// transferEnergyTypeAdmin
// ---------------------------------------------------------------------------

describe("EnergyTypeModule.transferEnergyTypeAdmin", () => {
  const validAdmin = "0x0000000000000000000000000000000000000042";

  it("returns txHash on success", async () => {
    const { ctx, mod } = makeModule();
    setupSuccessfulTx(ctx, "transferEnergyTypeAdmin", "0xtransfer");

    const result = await mod.transferEnergyTypeAdmin(validAdmin);

    expect(result.txHash).toBe("0xtransfer");
  });

  it("passes newAdmin to contract", async () => {
    const { ctx, mod } = makeModule();
    setupSuccessfulTx(ctx, "transferEnergyTypeAdmin");

    await mod.transferEnergyTypeAdmin(validAdmin);

    expect(getMock(ctx.registry, "transferEnergyTypeAdmin")).toHaveBeenCalledWith(
      validAdmin,
      expect.anything(),
    );
  });

  it("throws ConfigurationError for non-address string", async () => {
    const { mod } = makeModule();
    await expect(mod.transferEnergyTypeAdmin("not-an-address")).rejects.toThrow(ConfigurationError);
  });

  it("throws ConfigurationError for empty string", async () => {
    const { mod } = makeModule();
    await expect(mod.transferEnergyTypeAdmin("")).rejects.toThrow(ConfigurationError);
  });

  it("does not call the contract for invalid address", async () => {
    const { ctx, mod } = makeModule();
    await mod.transferEnergyTypeAdmin("bad").catch(() => {});
    expect(getMock(ctx.registry, "transferEnergyTypeAdmin")).not.toHaveBeenCalled();
  });

  it("decodes UnauthorizedEnergyTypeAdmin revert into ContractRevertError", async () => {
    const { ctx, mod } = makeModule();
    const data = encodeRegistryError("UnauthorizedEnergyTypeAdmin", [
      "0x0000000000000000000000000000000000000001",
    ]);
    getMock(ctx.registry, "transferEnergyTypeAdmin").mockRejectedValue({ data });

    const err = await mod.transferEnergyTypeAdmin(validAdmin).catch((e) => e);
    expect(err).toBeInstanceOf(ContractRevertError);
    expect((err as ContractRevertError).errorName).toBe("UnauthorizedEnergyTypeAdmin");
  });
});

// ---------------------------------------------------------------------------
// estimateRegisterEnergyTypeGas
// ---------------------------------------------------------------------------

describe("EnergyTypeModule.estimateRegisterEnergyTypeGas", () => {
  it("returns estimated gas as bigint", async () => {
    const { ctx, mod } = makeModule();
    getMock(ctx.registry, "registerEnergyType").estimateGas.mockResolvedValue(80000n);

    const gas = await mod.estimateRegisterEnergyTypeGas(14, "new_source");

    expect(gas).toBe(80000n);
  });

  it("passes id and name to estimateGas", async () => {
    const { ctx, mod } = makeModule();
    getMock(ctx.registry, "registerEnergyType").estimateGas.mockResolvedValue(80000n);

    await mod.estimateRegisterEnergyTypeGas(7, "geothermal_plus");

    expect(getMock(ctx.registry, "registerEnergyType").estimateGas).toHaveBeenCalledWith(
      7,
      "geothermal_plus",
    );
  });

  it("decodes contract revert from estimateGas into ContractRevertError", async () => {
    const { ctx, mod } = makeModule();
    const data = encodeRegistryError("UnauthorizedEnergyTypeAdmin", [
      "0x0000000000000000000000000000000000000001",
    ]);
    getMock(ctx.registry, "registerEnergyType").estimateGas.mockRejectedValue({ data });

    const err = await mod.estimateRegisterEnergyTypeGas(14, "new").catch((e) => e);
    expect(err).toBeInstanceOf(ContractRevertError);
  });
});

// ---------------------------------------------------------------------------
// estimateRemoveEnergyTypeGas
// ---------------------------------------------------------------------------

describe("EnergyTypeModule.estimateRemoveEnergyTypeGas", () => {
  it("returns estimated gas as bigint", async () => {
    const { ctx, mod } = makeModule();
    getMock(ctx.registry, "removeEnergyType").estimateGas.mockResolvedValue(50000n);

    const gas = await mod.estimateRemoveEnergyTypeGas(5);

    expect(gas).toBe(50000n);
  });

  it("decodes contract revert from estimateGas into ContractRevertError", async () => {
    const { ctx, mod } = makeModule();
    const data = encodeRegistryError("EnergyTypeNotRegistered", [99]);
    getMock(ctx.registry, "removeEnergyType").estimateGas.mockRejectedValue({ data });

    const err = await mod.estimateRemoveEnergyTypeGas(99).catch((e) => e);
    expect(err).toBeInstanceOf(ContractRevertError);
    expect((err as ContractRevertError).errorName).toBe("EnergyTypeNotRegistered");
  });
});

// ---------------------------------------------------------------------------
// estimateTransferEnergyTypeAdminGas
// ---------------------------------------------------------------------------

describe("EnergyTypeModule.estimateTransferEnergyTypeAdminGas", () => {
  const validAdmin = "0x0000000000000000000000000000000000000042";

  it("returns estimated gas as bigint", async () => {
    const { ctx, mod } = makeModule();
    getMock(ctx.registry, "transferEnergyTypeAdmin").estimateGas.mockResolvedValue(40000n);

    const gas = await mod.estimateTransferEnergyTypeAdminGas(validAdmin);

    expect(gas).toBe(40000n);
  });

  it("throws ConfigurationError for invalid address", async () => {
    const { mod } = makeModule();
    await expect(mod.estimateTransferEnergyTypeAdminGas("bad")).rejects.toThrow(ConfigurationError);
  });

  it("decodes contract revert from estimateGas into ContractRevertError", async () => {
    const { ctx, mod } = makeModule();
    const data = encodeRegistryError("UnauthorizedEnergyTypeAdmin", [
      "0x0000000000000000000000000000000000000001",
    ]);
    getMock(ctx.registry, "transferEnergyTypeAdmin").estimateGas.mockRejectedValue({ data });

    const err = await mod.estimateTransferEnergyTypeAdminGas(validAdmin).catch((e) => e);
    expect(err).toBeInstanceOf(ContractRevertError);
  });
});
