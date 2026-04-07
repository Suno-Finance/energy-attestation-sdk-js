import { describe, it, expect } from "vitest";
import { ReadModule } from "../../src/modules/ReadModule.js";
import { createMockContext, getMock } from "../helpers/mocks.js";

// ---------------------------------------------------------------------------
// getOwner
// ---------------------------------------------------------------------------

describe("ReadModule.getOwner", () => {
  it("returns the owner address", async () => {
    const ctx = createMockContext();
    getMock(ctx.registry, "owner").mockResolvedValue("0x0000000000000000000000000000000000000099");

    const owner = await new ReadModule(ctx).getOwner();

    expect(owner).toBe("0x0000000000000000000000000000000000000099");
  });

  it("calls registry.owner with no arguments", async () => {
    const ctx = createMockContext();
    getMock(ctx.registry, "owner").mockResolvedValue("0x0000000000000000000000000000000000000001");

    await new ReadModule(ctx).getOwner();

    expect(getMock(ctx.registry, "owner")).toHaveBeenCalledWith();
  });
});

// ---------------------------------------------------------------------------
// getPendingOwner
// ---------------------------------------------------------------------------

describe("ReadModule.getPendingOwner", () => {
  it("returns the pending owner address", async () => {
    const ctx = createMockContext();
    getMock(ctx.registry, "pendingOwner").mockResolvedValue(
      "0x0000000000000000000000000000000000000088",
    );

    const pending = await new ReadModule(ctx).getPendingOwner();

    expect(pending).toBe("0x0000000000000000000000000000000000000088");
  });

  it("returns zero address when no transfer is pending", async () => {
    const ctx = createMockContext();
    getMock(ctx.registry, "pendingOwner").mockResolvedValue(
      "0x0000000000000000000000000000000000000000",
    );

    const pending = await new ReadModule(ctx).getPendingOwner();

    expect(pending).toBe("0x0000000000000000000000000000000000000000");
  });

  it("calls registry.pendingOwner with no arguments", async () => {
    const ctx = createMockContext();
    getMock(ctx.registry, "pendingOwner").mockResolvedValue(
      "0x0000000000000000000000000000000000000000",
    );

    await new ReadModule(ctx).getPendingOwner();

    expect(getMock(ctx.registry, "pendingOwner")).toHaveBeenCalledWith();
  });
});

// ---------------------------------------------------------------------------
// getWatcherStats
// ---------------------------------------------------------------------------

describe("ReadModule.getWatcherStats", () => {
  function setupWatcher(ctx: ReturnType<typeof createMockContext>) {
    getMock(ctx.registry, "getWatcher").mockResolvedValue({
      owner: "0x0000000000000000000000000000000000000001",
      registered: true,
      name: "Green Energy Co",
    });
    getMock(ctx.registry, "getTotalGeneratedEnergyByWatcher").mockResolvedValue(500000n);
    getMock(ctx.registry, "getTotalConsumedEnergyByWatcher").mockResolvedValue(120000n);
  }

  it("returns combined watcher metadata and energy totals", async () => {
    const ctx = createMockContext();
    setupWatcher(ctx);

    const stats = await new ReadModule(ctx).getWatcherStats(1);

    expect(stats.watcher.name).toBe("Green Energy Co");
    expect(stats.watcher.registered).toBe(true);
    expect(stats.totalGenerated).toBe(500000n);
    expect(stats.totalConsumed).toBe(120000n);
  });

  it("calls all three underlying methods with the same watcherId", async () => {
    const ctx = createMockContext();
    setupWatcher(ctx);

    await new ReadModule(ctx).getWatcherStats(7n);

    expect(getMock(ctx.registry, "getWatcher")).toHaveBeenCalledWith(7n);
    expect(getMock(ctx.registry, "getTotalGeneratedEnergyByWatcher")).toHaveBeenCalledWith(7n);
    expect(getMock(ctx.registry, "getTotalConsumedEnergyByWatcher")).toHaveBeenCalledWith(7n);
  });

  it("normalises numeric watcherId to bigint for totals", async () => {
    const ctx = createMockContext();
    setupWatcher(ctx);

    const stats = await new ReadModule(ctx).getWatcherStats(3);

    expect(typeof stats.totalGenerated).toBe("bigint");
    expect(typeof stats.totalConsumed).toBe("bigint");
  });

  it("returns zero totals for a watcher with no attestations", async () => {
    const ctx = createMockContext();
    getMock(ctx.registry, "getWatcher").mockResolvedValue({
      owner: "0x0000000000000000000000000000000000000001",
      registered: true,
      name: "Empty Watcher",
    });
    getMock(ctx.registry, "getTotalGeneratedEnergyByWatcher").mockResolvedValue(0n);
    getMock(ctx.registry, "getTotalConsumedEnergyByWatcher").mockResolvedValue(0n);

    const stats = await new ReadModule(ctx).getWatcherStats(99);

    expect(stats.totalGenerated).toBe(0n);
    expect(stats.totalConsumed).toBe(0n);
  });

  it("accepts bigint watcherId", async () => {
    const ctx = createMockContext();
    setupWatcher(ctx);

    const stats = await new ReadModule(ctx).getWatcherStats(999n);

    expect(stats.watcher.name).toBe("Green Energy Co");
  });
});
