import { describe, it, expect } from "vitest";
import { AbiCoder } from "ethers";
import { ReadModule } from "../../src/modules/ReadModule.js";
import { createMockContext, getMock } from "../helpers/mocks.js";

describe("ReadModule.getWatcherProjectsWithDetails", () => {
  it("returns full Project objects for each project ID", async () => {
    const ctx = createMockContext();
    getMock(ctx.registry, "getWatcherProjects").mockResolvedValue([1n, 2n]);
    getMock(ctx.registry, "getProject")
      .mockResolvedValueOnce({ watcherId: 1n, registered: true, energyType: 1, name: "Solar" })
      .mockResolvedValueOnce({ watcherId: 1n, registered: true, energyType: 2, name: "Wind" });

    const mod = new ReadModule(ctx);
    const projects = await mod.getWatcherProjectsWithDetails(1);

    expect(projects).toHaveLength(2);
    expect(projects[0].name).toBe("Solar");
    expect(projects[1].name).toBe("Wind");
    expect(projects[0].watcherId).toBe(1n);
  });

  it("returns empty array when watcher has no projects", async () => {
    const ctx = createMockContext();
    getMock(ctx.registry, "getWatcherProjects").mockResolvedValue([]);

    const mod = new ReadModule(ctx);
    const projects = await mod.getWatcherProjectsWithDetails(5);

    expect(projects).toEqual([]);
  });

  it("fetches all project details in parallel (one getProject call per ID)", async () => {
    const ctx = createMockContext();
    getMock(ctx.registry, "getWatcherProjects").mockResolvedValue([10n, 20n, 30n]);
    getMock(ctx.registry, "getProject").mockResolvedValue({
      watcherId: 1n,
      registered: true,
      energyType: 0,
      name: "P",
    });

    const mod = new ReadModule(ctx);
    await mod.getWatcherProjectsWithDetails(1);

    expect(getMock(ctx.registry, "getProject")).toHaveBeenCalledTimes(3);
    expect(getMock(ctx.registry, "getProject")).toHaveBeenCalledWith(10n);
    expect(getMock(ctx.registry, "getProject")).toHaveBeenCalledWith(20n);
    expect(getMock(ctx.registry, "getProject")).toHaveBeenCalledWith(30n);
  });

  it("returns Project objects with bigint watcherId", async () => {
    const ctx = createMockContext();
    getMock(ctx.registry, "getWatcherProjects").mockResolvedValue([3n]);
    getMock(ctx.registry, "getProject").mockResolvedValue({
      watcherId: "7",
      registered: true,
      energyType: 4,
      name: "Hydro",
    });

    const mod = new ReadModule(ctx);
    const [project] = await mod.getWatcherProjectsWithDetails(1);

    expect(project.watcherId).toBe(7n);
    expect(typeof project.watcherId).toBe("bigint");
  });
});

describe("ReadModule.getAttestationData", () => {
  function encodeAttestData(
    projectId: bigint,
    readingCount: number,
    intervalMinutes: number,
    readings: bigint[],
    fromTimestamp: bigint,
    method: string,
    metadataURI: string,
  ): string {
    return AbiCoder.defaultAbiCoder().encode(
      ["uint64", "uint32", "uint32", "uint256[]", "uint64", "string", "string"],
      [projectId, readingCount, intervalMinutes, readings, fromTimestamp, method, metadataURI],
    );
  }

  it("decodes attestation data from chain", async () => {
    const ctx = createMockContext();
    const encodedData = encodeAttestData(5n, 1, 60, [1000n], 1700000000n, "iot", "ipfs://meta");
    getMock(ctx.eas, "getAttestation").mockResolvedValue({ data: encodedData });

    const mod = new ReadModule(ctx);
    const uid = "0x" + "aa".repeat(32);
    const result = await mod.getAttestationData(uid);

    expect(result.projectId).toBe(5n);
    expect(result.readingIntervalMinutes).toBe(60);
    expect(result.readings).toEqual([1000n]);
    expect(result.fromTimestamp).toBe(1700000000n);
    expect(result.method).toBe("iot");
    expect(result.metadataURI).toBe("ipfs://meta");
  });

  it("calls eas.getAttestation with the provided uid", async () => {
    const ctx = createMockContext();
    const encodedData = encodeAttestData(1n, 1, 1440, [500n], 1700000000n, "manual", "");
    getMock(ctx.eas, "getAttestation").mockResolvedValue({ data: encodedData });

    const mod = new ReadModule(ctx);
    const uid = "0x" + "bb".repeat(32);
    await mod.getAttestationData(uid);

    expect(getMock(ctx.eas, "getAttestation")).toHaveBeenCalledWith(uid);
  });

  it("returns bigint values for projectId, fromTimestamp, and each reading", async () => {
    const ctx = createMockContext();
    const encodedData = encodeAttestData(99n, 3, 60, [100n, 200n, 300n], 1700009000n, "iot", "");
    getMock(ctx.eas, "getAttestation").mockResolvedValue({ data: encodedData });

    const mod = new ReadModule(ctx);
    const result = await mod.getAttestationData("0x" + "cc".repeat(32));

    expect(typeof result.projectId).toBe("bigint");
    expect(typeof result.fromTimestamp).toBe("bigint");
    expect(result.readings.every((r) => typeof r === "bigint")).toBe(true);
    expect(result.readings).toEqual([100n, 200n, 300n]);
  });
});
