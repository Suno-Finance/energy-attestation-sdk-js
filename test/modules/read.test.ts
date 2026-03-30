import { describe, it, expect } from "vitest";
import { ReadModule } from "../../src/modules/ReadModule.js";
import { createMockContext, getMock } from "../helpers/mocks.js";
import { ZeroHash } from "ethers";

const ADDR1 = "0x0000000000000000000000000000000000000001";

describe("ReadModule", () => {
  describe("getWatcher", () => {
    it("returns correctly shaped Watcher", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getWatcher").mockResolvedValue({
        owner: ADDR1,
        registered: true,
        name: "My Watcher",
      });
      const mod = new ReadModule(ctx);
      const result = await mod.getWatcher(1);
      expect(result).toEqual({ owner: ADDR1, registered: true, name: "My Watcher" });
    });

    it("accepts bigint watcherId", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getWatcher").mockResolvedValue({
        owner: ADDR1,
        registered: false,
        name: "Old",
      });
      const mod = new ReadModule(ctx);
      await mod.getWatcher(5n);
      expect(getMock(ctx.registry, "getWatcher")).toHaveBeenCalledWith(5n);
    });
  });

  describe("getProject", () => {
    it("returns correctly shaped Project with bigint watcherId", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getProject").mockResolvedValue({
        watcherId: 2n,
        registered: true,
        energyType: 1,
        name: "Solar Farm",
      });
      const mod = new ReadModule(ctx);
      const result = await mod.getProject(3);
      expect(result.watcherId).toBe(2n);
      expect(result.registered).toBe(true);
      expect(result.energyType).toBe(1);
      expect(result.name).toBe("Solar Farm");
    });

    it("converts watcherId to bigint", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getProject").mockResolvedValue({
        watcherId: 7,
        registered: true,
        energyType: 0,
        name: "Test",
      });
      const mod = new ReadModule(ctx);
      const result = await mod.getProject(1);
      expect(typeof result.watcherId).toBe("bigint");
      expect(result.watcherId).toBe(7n);
    });
  });

  describe("isProjectRegistered", () => {
    it("returns true for registered project", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "isProjectRegistered").mockResolvedValue(true);
      const mod = new ReadModule(ctx);
      expect(await mod.isProjectRegistered(1)).toBe(true);
    });

    it("returns false for unregistered project", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "isProjectRegistered").mockResolvedValue(false);
      const mod = new ReadModule(ctx);
      expect(await mod.isProjectRegistered(999)).toBe(false);
    });
  });

  describe("isWatcherRegistered", () => {
    it("returns true for registered watcher", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "isWatcherRegistered").mockResolvedValue(true);
      const mod = new ReadModule(ctx);
      expect(await mod.isWatcherRegistered(1)).toBe(true);
    });

    it("returns false for unregistered watcher", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "isWatcherRegistered").mockResolvedValue(false);
      const mod = new ReadModule(ctx);
      expect(await mod.isWatcherRegistered(0)).toBe(false);
    });
  });

  describe("getProjectLastTimestamp", () => {
    it("returns bigint timestamp", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getProjectLastTimestamp").mockResolvedValue(1700003600n);
      const mod = new ReadModule(ctx);
      const result = await mod.getProjectLastTimestamp(1);
      expect(result).toBe(1700003600n);
      expect(typeof result).toBe("bigint");
    });

    it("returns 0n for project with no attestations", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getProjectLastTimestamp").mockResolvedValue(0n);
      const mod = new ReadModule(ctx);
      expect(await mod.getProjectLastTimestamp(1)).toBe(0n);
    });
  });

  describe("getTotalGeneratedEnergy", () => {
    it("returns bigint energy total", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getTotalGeneratedEnergy").mockResolvedValue(1000000n);
      const mod = new ReadModule(ctx);
      expect(await mod.getTotalGeneratedEnergy(1)).toBe(1000000n);
    });

    it("returns 0n when no energy attested", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getTotalGeneratedEnergy").mockResolvedValue(0n);
      const mod = new ReadModule(ctx);
      expect(await mod.getTotalGeneratedEnergy(1)).toBe(0n);
    });
  });

  describe("getTotalConsumedEnergy", () => {
    it("returns bigint energy total", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getTotalConsumedEnergy").mockResolvedValue(500000n);
      const mod = new ReadModule(ctx);
      expect(await mod.getTotalConsumedEnergy(1)).toBe(500000n);
    });
  });

  describe("getTotalGeneratedEnergyByWatcher", () => {
    it("returns bigint aggregate", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getTotalGeneratedEnergyByWatcher").mockResolvedValue(5000000n);
      const mod = new ReadModule(ctx);
      expect(await mod.getTotalGeneratedEnergyByWatcher(1)).toBe(5000000n);
    });
  });

  describe("getTotalConsumedEnergyByWatcher", () => {
    it("returns bigint aggregate", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getTotalConsumedEnergyByWatcher").mockResolvedValue(2500000n);
      const mod = new ReadModule(ctx);
      expect(await mod.getTotalConsumedEnergyByWatcher(1)).toBe(2500000n);
    });
  });

  describe("getWatcherProjects", () => {
    it("returns array of bigint project IDs", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getWatcherProjects").mockResolvedValue([1n, 2n, 5n]);
      const mod = new ReadModule(ctx);
      const result = await mod.getWatcherProjects(1);
      expect(result).toEqual([1n, 2n, 5n]);
      result.forEach((id) => expect(typeof id).toBe("bigint"));
    });

    it("returns empty array for watcher with no projects", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getWatcherProjects").mockResolvedValue([]);
      const mod = new ReadModule(ctx);
      expect(await mod.getWatcherProjects(99)).toEqual([]);
    });

    it("converts all elements to bigint when contract returns numbers", async () => {
      const ctx = createMockContext();
      // Contract may return numeric types before ethers coerces them
      getMock(ctx.registry, "getWatcherProjects").mockResolvedValue([1, 2, 3] as unknown as bigint[]);
      const mod = new ReadModule(ctx);
      const result = await mod.getWatcherProjects(1);
      result.forEach((id) => expect(typeof id).toBe("bigint"));
    });
  });

  describe("isProjectAttester", () => {
    it("returns true when authorized", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "isProjectAttester").mockResolvedValue(true);
      const mod = new ReadModule(ctx);
      expect(await mod.isProjectAttester(1, ADDR1)).toBe(true);
    });

    it("returns false when not authorized", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "isProjectAttester").mockResolvedValue(false);
      const mod = new ReadModule(ctx);
      expect(await mod.isProjectAttester(1, ADDR1)).toBe(false);
    });

    it("passes correct args", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "isProjectAttester").mockResolvedValue(true);
      const mod = new ReadModule(ctx);
      await mod.isProjectAttester(5n, ADDR1);
      expect(getMock(ctx.registry, "isProjectAttester")).toHaveBeenCalledWith(5n, ADDR1);
    });
  });

  describe("isWatcherAttester", () => {
    it("returns true when authorized", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "isWatcherAttester").mockResolvedValue(true);
      const mod = new ReadModule(ctx);
      expect(await mod.isWatcherAttester(1, ADDR1)).toBe(true);
    });

    it("returns false when not authorized", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "isWatcherAttester").mockResolvedValue(false);
      const mod = new ReadModule(ctx);
      expect(await mod.isWatcherAttester(1, ADDR1)).toBe(false);
    });
  });

  describe("getProjectMetadataURI", () => {
    it("returns URI string", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getProjectMetadataURI").mockResolvedValue("ipfs://Qmtest");
      const mod = new ReadModule(ctx);
      expect(await mod.getProjectMetadataURI(1)).toBe("ipfs://Qmtest");
    });

    it("returns empty string when no URI set", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getProjectMetadataURI").mockResolvedValue("");
      const mod = new ReadModule(ctx);
      expect(await mod.getProjectMetadataURI(1)).toBe("");
    });
  });

  describe("getProjectEnergyType", () => {
    it("returns number for consumer", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getProjectEnergyType").mockResolvedValue(0);
      const mod = new ReadModule(ctx);
      const result = await mod.getProjectEnergyType(1);
      expect(result).toBe(0);
      expect(typeof result).toBe("number");
    });

    it("returns number for generator", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getProjectEnergyType").mockResolvedValue(1);
      const mod = new ReadModule(ctx);
      expect(await mod.getProjectEnergyType(1)).toBe(1);
    });
  });

  describe("getReplacementUID", () => {
    it("returns replacement UID", async () => {
      const ctx = createMockContext();
      const newUid = "0x" + "ff".repeat(32);
      getMock(ctx.registry, "getReplacementUID").mockResolvedValue(newUid);
      const mod = new ReadModule(ctx);
      expect(await mod.getReplacementUID("0x" + "aa".repeat(32))).toBe(newUid);
    });

    it("returns zero hash when not replaced", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getReplacementUID").mockResolvedValue(ZeroHash);
      const mod = new ReadModule(ctx);
      expect(await mod.getReplacementUID("0x" + "aa".repeat(32))).toBe(ZeroHash);
    });
  });

  describe("getAttestedPeriodUID", () => {
    it("returns attestation UID for a period", async () => {
      const ctx = createMockContext();
      const uid = "0x" + "cc".repeat(32);
      getMock(ctx.registry, "getAttestedPeriodUID").mockResolvedValue(uid);
      const mod = new ReadModule(ctx);
      expect(await mod.getAttestedPeriodUID(1, 1700000000, 1700003600)).toBe(uid);
    });

    it("passes correct args", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getAttestedPeriodUID").mockResolvedValue(ZeroHash);
      const mod = new ReadModule(ctx);
      await mod.getAttestedPeriodUID(5n, 100n, 200n);
      expect(getMock(ctx.registry, "getAttestedPeriodUID")).toHaveBeenCalledWith(5n, 100n, 200n);
    });

    it("returns zero hash for free period", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getAttestedPeriodUID").mockResolvedValue(ZeroHash);
      const mod = new ReadModule(ctx);
      expect(await mod.getAttestedPeriodUID(1, 1700000000, 1700003600)).toBe(ZeroHash);
    });
  });

  describe("getAttestedPeriodStartUID", () => {
    it("returns attestation UID for a period start", async () => {
      const ctx = createMockContext();
      const uid = "0x" + "dd".repeat(32);
      getMock(ctx.registry, "getAttestedPeriodStartUID").mockResolvedValue(uid);
      const mod = new ReadModule(ctx);
      expect(await mod.getAttestedPeriodStartUID(1, 1700000000)).toBe(uid);
    });

    it("passes correct args", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getAttestedPeriodStartUID").mockResolvedValue(ZeroHash);
      const mod = new ReadModule(ctx);
      await mod.getAttestedPeriodStartUID(5n, 100n);
      expect(getMock(ctx.registry, "getAttestedPeriodStartUID")).toHaveBeenCalledWith(5n, 100n);
    });

    it("returns zero hash when no attestation starts at timestamp", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getAttestedPeriodStartUID").mockResolvedValue(ZeroHash);
      const mod = new ReadModule(ctx);
      expect(await mod.getAttestedPeriodStartUID(1, 1700000000)).toBe(ZeroHash);
    });
  });

  describe("getNextProjectId", () => {
    it("returns bigint", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getNextProjectId").mockResolvedValue(5n);
      const mod = new ReadModule(ctx);
      const result = await mod.getNextProjectId();
      expect(result).toBe(5n);
      expect(typeof result).toBe("bigint");
    });

    it("returns 1n when no projects registered", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getNextProjectId").mockResolvedValue(1n);
      const mod = new ReadModule(ctx);
      expect(await mod.getNextProjectId()).toBe(1n);
    });
  });

  describe("getNextWatcherId", () => {
    it("returns bigint", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getNextWatcherId").mockResolvedValue(3n);
      const mod = new ReadModule(ctx);
      const result = await mod.getNextWatcherId();
      expect(result).toBe(3n);
      expect(typeof result).toBe("bigint");
    });

    it("returns 1n when no watchers registered", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getNextWatcherId").mockResolvedValue(1n);
      const mod = new ReadModule(ctx);
      expect(await mod.getNextWatcherId()).toBe(1n);
    });
  });

  describe("getProjectWatcherId", () => {
    it("returns bigint watcherId", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getProjectWatcherId").mockResolvedValue(2n);
      const mod = new ReadModule(ctx);
      const result = await mod.getProjectWatcherId(1);
      expect(result).toBe(2n);
      expect(typeof result).toBe("bigint");
    });

    it("passes correct args", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getProjectWatcherId").mockResolvedValue(1n);
      const mod = new ReadModule(ctx);
      await mod.getProjectWatcherId(10n);
      expect(getMock(ctx.registry, "getProjectWatcherId")).toHaveBeenCalledWith(10n);
    });
  });

  describe("getProjectType", () => {
    it("returns number", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getProjectType").mockResolvedValue(1);
      const mod = new ReadModule(ctx);
      const result = await mod.getProjectType(1);
      expect(result).toBe(1);
      expect(typeof result).toBe("number");
    });

    it("returns 0 for consumer", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getProjectType").mockResolvedValue(0);
      const mod = new ReadModule(ctx);
      expect(await mod.getProjectType(1)).toBe(0);
    });
  });

  describe("isAuthorizedResolver", () => {
    it("returns true for authorized resolver", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "isAuthorizedResolver").mockResolvedValue(true);
      const mod = new ReadModule(ctx);
      expect(await mod.isAuthorizedResolver(ADDR1)).toBe(true);
    });

    it("returns false for unauthorized resolver", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "isAuthorizedResolver").mockResolvedValue(false);
      const mod = new ReadModule(ctx);
      expect(await mod.isAuthorizedResolver(ADDR1)).toBe(false);
    });

    it("passes correct args", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "isAuthorizedResolver").mockResolvedValue(true);
      const mod = new ReadModule(ctx);
      await mod.isAuthorizedResolver(ADDR1);
      expect(getMock(ctx.registry, "isAuthorizedResolver")).toHaveBeenCalledWith(ADDR1);
    });
  });

  describe("isEnergyTypeRegistered", () => {
    it("returns true for registered type", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "isEnergyTypeRegistered").mockResolvedValue(true);
      const mod = new ReadModule(ctx);
      expect(await mod.isEnergyTypeRegistered(1)).toBe(true);
    });

    it("returns false for unregistered type", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "isEnergyTypeRegistered").mockResolvedValue(false);
      const mod = new ReadModule(ctx);
      expect(await mod.isEnergyTypeRegistered(99)).toBe(false);
    });

    it("returns true for id 0 (CONSUMER type)", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "isEnergyTypeRegistered").mockResolvedValue(true);
      const mod = new ReadModule(ctx);
      expect(await mod.isEnergyTypeRegistered(0)).toBe(true);
    });
  });

  describe("getEnergyTypeName", () => {
    it("returns name string", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getEnergyTypeName").mockResolvedValue("solar_pv");
      const mod = new ReadModule(ctx);
      expect(await mod.getEnergyTypeName(1)).toBe("solar_pv");
    });

    it("returns empty string for unregistered type", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getEnergyTypeName").mockResolvedValue("");
      const mod = new ReadModule(ctx);
      expect(await mod.getEnergyTypeName(99)).toBe("");
    });
  });

  describe("getEnergyTypeAdmin", () => {
    it("returns admin address", async () => {
      const ctx = createMockContext();
      getMock(ctx.registry, "getEnergyTypeAdmin").mockResolvedValue(ADDR1);
      const mod = new ReadModule(ctx);
      expect(await mod.getEnergyTypeAdmin()).toBe(ADDR1);
    });
  });
});
