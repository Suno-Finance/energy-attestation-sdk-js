import { describe, it, expect } from "vitest";
import {
  encodeAttestationData,
  decodeAttestationData,
  computeToTimestamp,
  sumReadings,
} from "../src/encoding.js";
import type { AttestParams } from "../src/types.js";

describe("encodeAttestationData", () => {
  const baseParams: AttestParams = {
    projectId: 1,
    readings: [1000n, 2000n, 3000n],
    readingIntervalMinutes: 60,
    fromTimestamp: 1700000000,
    method: "iot",
    metadataURI: "ipfs://abc",
  };

  it("produces a non-empty hex string", () => {
    const encoded = encodeAttestationData(baseParams);
    expect(encoded).toMatch(/^0x[0-9a-f]+$/i);
  });

  it("defaults metadataURI to empty string when undefined", () => {
    const params = { ...baseParams, metadataURI: undefined };
    const encoded = encodeAttestationData(params);
    const decoded = decodeAttestationData(encoded);
    expect(decoded.metadataURI).toBe("");
  });

  it("handles a single reading", () => {
    const params = { ...baseParams, readings: [42n] };
    const encoded = encodeAttestationData(params);
    const decoded = decodeAttestationData(encoded);
    expect(decoded.readingCount).toBe(1);
    expect(decoded.readings).toEqual([42n]);
  });

  it("handles very large reading values", () => {
    const largeValue = 2n ** 128n;
    const params = { ...baseParams, readings: [largeValue] };
    const encoded = encodeAttestationData(params);
    const decoded = decodeAttestationData(encoded);
    expect(decoded.readings[0]).toBe(largeValue);
  });

  it("handles empty metadataURI string", () => {
    const params = { ...baseParams, metadataURI: "" };
    const encoded = encodeAttestationData(params);
    const decoded = decodeAttestationData(encoded);
    expect(decoded.metadataURI).toBe("");
  });

  it("preserves special characters in method and metadataURI", () => {
    const params = {
      ...baseParams,
      method: "iot/v2.1 (beta)",
      metadataURI: "https://example.com/data?id=1&fmt=json#section",
    };
    const encoded = encodeAttestationData(params);
    const decoded = decodeAttestationData(encoded);
    expect(decoded.method).toBe("iot/v2.1 (beta)");
    expect(decoded.metadataURI).toBe("https://example.com/data?id=1&fmt=json#section");
  });
});

describe("decodeAttestationData", () => {
  it("round-trips correctly with encodeAttestationData", () => {
    const params: AttestParams = {
      projectId: 42,
      readings: [100n, 200n, 300n, 400n],
      readingIntervalMinutes: 15,
      fromTimestamp: 1700000000,
      method: "manual",
      metadataURI: "ipfs://Qmtest",
    };
    const encoded = encodeAttestationData(params);
    const decoded = decodeAttestationData(encoded);

    expect(decoded.projectId).toBe(42n);
    expect(decoded.readingCount).toBe(4);
    expect(decoded.readingIntervalMinutes).toBe(15);
    expect(decoded.readings).toEqual([100n, 200n, 300n, 400n]);
    expect(decoded.fromTimestamp).toBe(1700000000n);
    expect(decoded.method).toBe("manual");
    expect(decoded.metadataURI).toBe("ipfs://Qmtest");
  });

  it("returns bigint for projectId and fromTimestamp", () => {
    const params: AttestParams = {
      projectId: 1,
      readings: [1n],
      readingIntervalMinutes: 60,
      fromTimestamp: 1700000000,
      method: "iot",
    };
    const encoded = encodeAttestationData(params);
    const decoded = decodeAttestationData(encoded);
    expect(typeof decoded.projectId).toBe("bigint");
    expect(typeof decoded.fromTimestamp).toBe("bigint");
  });

  it("returns number for readingCount and readingIntervalMinutes", () => {
    const params: AttestParams = {
      projectId: 1,
      readings: [1n],
      readingIntervalMinutes: 60,
      fromTimestamp: 1700000000,
      method: "iot",
    };
    const encoded = encodeAttestationData(params);
    const decoded = decodeAttestationData(encoded);
    expect(typeof decoded.readingCount).toBe("number");
    expect(typeof decoded.readingIntervalMinutes).toBe("number");
  });
});

describe("computeToTimestamp", () => {
  it("computes correctly for hourly readings", () => {
    // 4 readings × 60 min × 60 sec = 14400 seconds
    expect(computeToTimestamp(1700000000, 4, 60)).toBe(1700014400);
  });

  it("computes correctly for 15-minute readings", () => {
    // 24 readings × 15 min × 60 sec = 21600 seconds
    expect(computeToTimestamp(1700000000, 24, 15)).toBe(1700021600);
  });

  it("computes correctly for a single reading", () => {
    // 1 reading × 60 min × 60 sec = 3600 seconds
    expect(computeToTimestamp(1700000000, 1, 60)).toBe(1700003600);
  });

  it("returns fromTimestamp when readingCount is 0", () => {
    expect(computeToTimestamp(1700000000, 0, 60)).toBe(1700000000);
  });

  it("returns fromTimestamp when readingIntervalMinutes is 0", () => {
    expect(computeToTimestamp(1700000000, 10, 0)).toBe(1700000000);
  });

  it("handles large readingCount", () => {
    // 8760 readings (1 year of hourly) × 60 min × 60 sec = 31536000
    expect(computeToTimestamp(1700000000, 8760, 60)).toBe(1731536000);
  });
});

describe("sumReadings", () => {
  it("sums multiple readings", () => {
    expect(sumReadings([1000n, 2000n, 3000n])).toBe(6000n);
  });

  it("returns 0 for empty array", () => {
    expect(sumReadings([])).toBe(0n);
  });

  it("returns the value for single element", () => {
    expect(sumReadings([42n])).toBe(42n);
  });

  it("handles very large values", () => {
    const large = 2n ** 128n;
    expect(sumReadings([large, large])).toBe(large * 2n);
  });

  it("handles zero readings in array", () => {
    expect(sumReadings([0n, 1000n, 0n, 2000n])).toBe(3000n);
  });

  it("handles all zeros", () => {
    expect(sumReadings([0n, 0n, 0n])).toBe(0n);
  });
});
