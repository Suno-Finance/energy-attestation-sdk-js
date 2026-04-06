import { describe, it, expect } from "vitest";
import { ReadModule } from "../../src/modules/ReadModule.js";
import { createMockContext, getMock } from "../helpers/mocks.js";

describe("ReadModule.getProjectStats", () => {
  it("returns combined stats for a project", async () => {
    const ctx = createMockContext();
    getMock(ctx.registry, "getProject").mockResolvedValue({
      watcherId: 1n,
      registered: true,
      energyType: 1,
      name: "Solar Farm",
    });
    getMock(ctx.registry, "getTotalGeneratedEnergy").mockResolvedValue(5000n);
    getMock(ctx.registry, "getTotalConsumedEnergy").mockResolvedValue(200n);
    getMock(ctx.registry, "getProjectLastTimestamp").mockResolvedValue(1700000000n);
    getMock(ctx.registry, "getProjectMetadataURI").mockResolvedValue("ipfs://metadata");

    const mod = new ReadModule(ctx);
    const stats = await mod.getProjectStats(3);

    expect(stats.project.name).toBe("Solar Farm");
    expect(stats.project.watcherId).toBe(1n);
    expect(stats.totalGenerated).toBe(5000n);
    expect(stats.totalConsumed).toBe(200n);
    expect(stats.lastTimestamp).toBe(1700000000n);
    expect(stats.metadataURI).toBe("ipfs://metadata");
  });

  it("calls all registry methods with the same projectId", async () => {
    const ctx = createMockContext();
    getMock(ctx.registry, "getProject").mockResolvedValue({
      watcherId: 2n,
      registered: true,
      energyType: 0,
      name: "Consumer",
    });
    getMock(ctx.registry, "getTotalGeneratedEnergy").mockResolvedValue(0n);
    getMock(ctx.registry, "getTotalConsumedEnergy").mockResolvedValue(1000n);
    getMock(ctx.registry, "getProjectLastTimestamp").mockResolvedValue(1700001000n);
    getMock(ctx.registry, "getProjectMetadataURI").mockResolvedValue("");

    const mod = new ReadModule(ctx);
    await mod.getProjectStats(7n);

    expect(getMock(ctx.registry, "getProject")).toHaveBeenCalledWith(7n);
    expect(getMock(ctx.registry, "getTotalGeneratedEnergy")).toHaveBeenCalledWith(7n);
    expect(getMock(ctx.registry, "getTotalConsumedEnergy")).toHaveBeenCalledWith(7n);
    expect(getMock(ctx.registry, "getProjectLastTimestamp")).toHaveBeenCalledWith(7n);
    expect(getMock(ctx.registry, "getProjectMetadataURI")).toHaveBeenCalledWith(7n);
  });

  it("returns bigint values for energy and timestamp", async () => {
    const ctx = createMockContext();
    getMock(ctx.registry, "getProject").mockResolvedValue({
      watcherId: 1n,
      registered: true,
      energyType: 1,
      name: "Wind",
    });
    getMock(ctx.registry, "getTotalGeneratedEnergy").mockResolvedValue("9999");
    getMock(ctx.registry, "getTotalConsumedEnergy").mockResolvedValue("0");
    getMock(ctx.registry, "getProjectLastTimestamp").mockResolvedValue("1700005000");
    getMock(ctx.registry, "getProjectMetadataURI").mockResolvedValue("ipfs://wind");

    const mod = new ReadModule(ctx);
    const stats = await mod.getProjectStats(1);

    expect(typeof stats.totalGenerated).toBe("bigint");
    expect(typeof stats.totalConsumed).toBe("bigint");
    expect(typeof stats.lastTimestamp).toBe("bigint");
    expect(stats.totalGenerated).toBe(9999n);
  });
});
