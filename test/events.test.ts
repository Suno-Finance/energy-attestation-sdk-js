/**
 * ABI event encoding tests (Section 5 coverage)
 *
 * These tests verify that the on-chain event ABIs are correctly defined in the
 * SDK by round-trip encoding each event with representative arguments and
 * confirming that ethers.js can decode the result back to the original values.
 *
 * A failure here means the ABI in src/abi/ has drifted from the deployed contract
 * (wrong parameter types, wrong indexed flags, missing fields, etc.).
 */

import { describe, it, expect } from "vitest";
import { Interface } from "ethers";
import { ENERGY_REGISTRY_ABI } from "../src/abi/EnergyRegistry.js";

const ADDR1 = "0x0000000000000000000000000000000000000001";
const ADDR2 = "0x0000000000000000000000000000000000000002";
const ADDR3 = "0x0000000000000000000000000000000000000003";
const UID1 = "0x" + "aa".repeat(32);
const UID2 = "0x" + "bb".repeat(32);

const iface = new Interface(ENERGY_REGISTRY_ABI);

function encodeAndDecode(eventName: string, args: unknown[]) {
  const event = iface.getEvent(eventName);
  if (!event) throw new Error(`Event "${eventName}" not found in ABI`);
  const encoded = iface.encodeEventLog(event, args);
  return iface.decodeEventLog(event, encoded.data, encoded.topics);
}

describe("Registry ABI events", () => {
  describe("AttesterAdded", () => {
    it("encodes and decodes correctly", () => {
      const decoded = encodeAndDecode("AttesterAdded", [1n, ADDR1]);
      expect(decoded.projectId).toBe(1n);
      expect(decoded.attester.toLowerCase()).toBe(ADDR1.toLowerCase());
    });
  });

  describe("AttesterRemoved", () => {
    it("encodes and decodes correctly", () => {
      const decoded = encodeAndDecode("AttesterRemoved", [2n, ADDR2]);
      expect(decoded.projectId).toBe(2n);
      expect(decoded.attester.toLowerCase()).toBe(ADDR2.toLowerCase());
    });
  });

  describe("WatcherAttesterAdded", () => {
    it("encodes and decodes correctly", () => {
      const decoded = encodeAndDecode("WatcherAttesterAdded", [5n, ADDR1]);
      expect(decoded.watcherId).toBe(5n);
      expect(decoded.attester.toLowerCase()).toBe(ADDR1.toLowerCase());
    });
  });

  describe("WatcherAttesterRemoved", () => {
    it("encodes and decodes correctly", () => {
      const decoded = encodeAndDecode("WatcherAttesterRemoved", [7n, ADDR2]);
      expect(decoded.watcherId).toBe(7n);
      expect(decoded.attester.toLowerCase()).toBe(ADDR2.toLowerCase());
    });
  });

  describe("WatcherOwnershipTransferred", () => {
    it("encodes and decodes correctly", () => {
      const decoded = encodeAndDecode("WatcherOwnershipTransferred", [3n, ADDR1, ADDR2]);
      expect(decoded.watcherId).toBe(3n);
      expect(decoded.previousOwner.toLowerCase()).toBe(ADDR1.toLowerCase());
      expect(decoded.newOwner.toLowerCase()).toBe(ADDR2.toLowerCase());
    });
  });

  describe("WatcherRegistered", () => {
    it("encodes and decodes correctly", () => {
      const decoded = encodeAndDecode("WatcherRegistered", [10n, "My Watcher", ADDR1]);
      expect(decoded.watcherId).toBe(10n);
      expect(decoded.name).toBe("My Watcher");
      expect(decoded.owner.toLowerCase()).toBe(ADDR1.toLowerCase());
    });
  });

  describe("ProjectRegistered", () => {
    it("encodes and decodes correctly", () => {
      const decoded = encodeAndDecode("ProjectRegistered", [42n, 1n, "Solar Farm", 1]);
      expect(decoded.projectId).toBe(42n);
      expect(decoded.watcherId).toBe(1n);
      expect(decoded.name).toBe("Solar Farm");
      expect(Number(decoded.energyType)).toBe(1);
    });

    it("handles consumer type (energyType = 0)", () => {
      const decoded = encodeAndDecode("ProjectRegistered", [1n, 2n, "Factory", 0]);
      expect(Number(decoded.energyType)).toBe(0);
    });
  });

  describe("ProjectDeregistered", () => {
    it("encodes and decodes correctly", () => {
      const decoded = encodeAndDecode("ProjectDeregistered", [99n]);
      expect(decoded.projectId).toBe(99n);
    });
  });

  describe("ProjectTransferred", () => {
    it("encodes and decodes correctly", () => {
      const decoded = encodeAndDecode("ProjectTransferred", [5n, 1n, 2n]);
      expect(decoded.projectId).toBe(5n);
      expect(decoded.fromWatcherId).toBe(1n);
      expect(decoded.toWatcherId).toBe(2n);
    });
  });

  describe("ProjectMetadataURISet", () => {
    it("encodes and decodes correctly", () => {
      const decoded = encodeAndDecode("ProjectMetadataURISet", [3n, "ipfs://Qm123"]);
      expect(decoded.projectId).toBe(3n);
      expect(decoded.uri).toBe("ipfs://Qm123");
    });

    it("handles empty URI", () => {
      const decoded = encodeAndDecode("ProjectMetadataURISet", [1n, ""]);
      expect(decoded.uri).toBe("");
    });
  });

  describe("EnergyAttested", () => {
    it("encodes and decodes correctly", () => {
      const decoded = encodeAndDecode("EnergyAttested", [
        7n,           // projectId (indexed)
        UID1,         // uid (indexed)
        1700000000n,  // fromTimestamp
        1700003600n,  // toTimestamp
        3600000n,     // energyWh
        ADDR1,        // attester (indexed)
        1,            // energyType
        "ipfs://meta",// metadataURI
        [3600000n],   // readings
      ]);
      expect(decoded.projectId).toBe(7n);
      expect(decoded.uid).toBe(UID1);
      expect(decoded.fromTimestamp).toBe(1700000000n);
      expect(decoded.toTimestamp).toBe(1700003600n);
      expect(decoded.energyWh).toBe(3600000n);
      expect(decoded.attester.toLowerCase()).toBe(ADDR1.toLowerCase());
      expect(Number(decoded.energyType)).toBe(1);
      expect(decoded.metadataURI).toBe("ipfs://meta");
      expect(decoded.readings.map(BigInt)).toEqual([3600000n]);
    });

    it("handles multiple readings", () => {
      const readings = [1000n, 2000n, 3000n];
      const decoded = encodeAndDecode("EnergyAttested", [
        1n, UID1, 1700000000n, 1700010800n, 6000n, ADDR1, 0, "", readings,
      ]);
      expect(decoded.readings.map(BigInt)).toEqual(readings);
    });

    it("handles zero-energy reading (zero period)", () => {
      const decoded = encodeAndDecode("EnergyAttested", [
        2n, UID1, 1700000000n, 1700003600n, 0n, ADDR2, 1, "", [0n],
      ]);
      expect(decoded.energyWh).toBe(0n);
      expect(decoded.readings.map(BigInt)).toEqual([0n]);
    });
  });

  describe("EnergyReplaced", () => {
    it("encodes and decodes correctly", () => {
      const decoded = encodeAndDecode("EnergyReplaced", [
        5n,           // projectId (indexed)
        UID1,         // oldUid (indexed)
        UID2,         // newUid
        1700000000n,  // fromTimestamp
        1700003600n,  // toTimestamp
        1000n,        // oldEnergyWh
        1200n,        // newEnergyWh
        ADDR3,        // attester (indexed)
        "ipfs://new", // metadataURI
        [1200n],      // newReadings
      ]);
      expect(decoded.projectId).toBe(5n);
      expect(decoded.oldUid).toBe(UID1);
      expect(decoded.newUid).toBe(UID2);
      expect(decoded.oldEnergyWh).toBe(1000n);
      expect(decoded.newEnergyWh).toBe(1200n);
      expect(decoded.attester.toLowerCase()).toBe(ADDR3.toLowerCase());
      expect(decoded.metadataURI).toBe("ipfs://new");
      expect(decoded.newReadings.map(BigInt)).toEqual([1200n]);
    });
  });

  describe("EnergyRevoked", () => {
    it("encodes and decodes correctly", () => {
      const decoded = encodeAndDecode("EnergyRevoked", [
        8n,      // projectId (indexed)
        500n,    // energyWh
        ADDR2,   // attester (indexed)
        1,       // energyType
      ]);
      expect(decoded.projectId).toBe(8n);
      expect(decoded.energyWh).toBe(500n);
      expect(decoded.attester.toLowerCase()).toBe(ADDR2.toLowerCase());
      expect(Number(decoded.energyType)).toBe(1);
    });
  });

  describe("EnergyTypeRegistered", () => {
    it("encodes and decodes correctly", () => {
      const decoded = encodeAndDecode("EnergyTypeRegistered", [3, "WIND_OFFSHORE"]);
      expect(Number(decoded.id)).toBe(3);
      expect(decoded.name).toBe("WIND_OFFSHORE");
    });
  });

  describe("EnergyTypeRemoved", () => {
    it("encodes and decodes correctly", () => {
      const decoded = encodeAndDecode("EnergyTypeRemoved", [2, "WIND_ONSHORE"]);
      expect(Number(decoded.id)).toBe(2);
      expect(decoded.name).toBe("WIND_ONSHORE");
    });
  });

  describe("EnergyTypeAdminTransferred", () => {
    it("encodes and decodes correctly", () => {
      const decoded = encodeAndDecode("EnergyTypeAdminTransferred", [ADDR1, ADDR2]);
      expect(decoded.previousAdmin.toLowerCase()).toBe(ADDR1.toLowerCase());
      expect(decoded.newAdmin.toLowerCase()).toBe(ADDR2.toLowerCase());
    });
  });

  describe("ResolverAuthorized", () => {
    it("encodes and decodes correctly", () => {
      const decoded = encodeAndDecode("ResolverAuthorized", [ADDR1]);
      expect(decoded.resolver.toLowerCase()).toBe(ADDR1.toLowerCase());
    });
  });

  describe("ResolverDeauthorized", () => {
    it("encodes and decodes correctly", () => {
      const decoded = encodeAndDecode("ResolverDeauthorized", [ADDR2]);
      expect(decoded.resolver.toLowerCase()).toBe(ADDR2.toLowerCase());
    });
  });

  describe("OwnershipTransferred", () => {
    it("encodes and decodes correctly", () => {
      const decoded = encodeAndDecode("OwnershipTransferred", [ADDR1, ADDR2]);
      expect(decoded.previousOwner.toLowerCase()).toBe(ADDR1.toLowerCase());
      expect(decoded.newOwner.toLowerCase()).toBe(ADDR2.toLowerCase());
    });
  });

  describe("OwnershipTransferStarted", () => {
    it("encodes and decodes correctly", () => {
      const decoded = encodeAndDecode("OwnershipTransferStarted", [ADDR1, ADDR2]);
      expect(decoded.previousOwner.toLowerCase()).toBe(ADDR1.toLowerCase());
      expect(decoded.newOwner.toLowerCase()).toBe(ADDR2.toLowerCase());
    });
  });

  describe("Initialized", () => {
    it("encodes and decodes correctly", () => {
      const decoded = encodeAndDecode("Initialized", [1n]);
      expect(decoded.version).toBe(1n);
    });
  });

  describe("Upgraded", () => {
    it("encodes and decodes correctly", () => {
      const decoded = encodeAndDecode("Upgraded", [ADDR3]);
      expect(decoded.implementation.toLowerCase()).toBe(ADDR3.toLowerCase());
    });
  });
});
