import { describe, it, expect } from "vitest";
import { findEventLog, findAllEventLogs } from "../../src/utils/events.js";
import {
  registryInterface,
  easInterface,
  createMockLog,
  createMockReceipt,
} from "../helpers/mocks.js";
import { TOPIC0_WATCHER_REGISTERED, TOPIC0_ATTESTED } from "../../src/constants.js";

const WATCHER_ID = 1n;
const OWNER = "0x0000000000000000000000000000000000000001";
const WATCHER_NAME = "Test Watcher";
const UID_A = "0x" + "aa".repeat(32);
const UID_B = "0x" + "bb".repeat(32);
const SCHEMA_UID = "0x" + "ab".repeat(32);
const ATTESTER = "0x0000000000000000000000000000000000000002";

describe("findEventLog", () => {
  it("returns parsed log when topic0 matches", () => {
    const log = createMockLog(registryInterface, "WatcherRegistered", [
      WATCHER_ID,
      WATCHER_NAME,
      OWNER,
    ]);
    const receipt = createMockReceipt([log]);
    const result = findEventLog(receipt, registryInterface, TOPIC0_WATCHER_REGISTERED);
    expect(result).not.toBeNull();
    expect(result?.name).toBe("WatcherRegistered");
  });

  it("returns null when no log matches topic0", () => {
    const receipt = createMockReceipt([]);
    const result = findEventLog(receipt, registryInterface, TOPIC0_WATCHER_REGISTERED);
    expect(result).toBeNull();
  });

  it("skips logs with a different topic0 and returns null", () => {
    // Put an Attested log in the receipt but search for WatcherRegistered
    const log = createMockLog(easInterface, "Attested", [
      "0x0000000000000000000000000000000000000000",
      ATTESTER,
      UID_A,
      SCHEMA_UID,
    ]);
    const receipt = createMockReceipt([log]);
    const result = findEventLog(receipt, registryInterface, TOPIC0_WATCHER_REGISTERED);
    expect(result).toBeNull();
  });

  it("finds the correct log when mixed logs are present", () => {
    const irrelevantLog = createMockLog(easInterface, "Attested", [
      "0x0000000000000000000000000000000000000000",
      ATTESTER,
      UID_A,
      SCHEMA_UID,
    ]);
    const targetLog = createMockLog(registryInterface, "WatcherRegistered", [
      WATCHER_ID,
      WATCHER_NAME,
      OWNER,
    ]);
    const receipt = createMockReceipt([irrelevantLog, targetLog]);
    const result = findEventLog(receipt, registryInterface, TOPIC0_WATCHER_REGISTERED);
    expect(result).not.toBeNull();
    expect(result?.name).toBe("WatcherRegistered");
    expect(result?.args[0]).toBe(WATCHER_ID);
  });

  it("handles logs with no topics gracefully", () => {
    const receipt = createMockReceipt([{ topics: [], data: "0x" }]);
    const result = findEventLog(receipt, registryInterface, TOPIC0_WATCHER_REGISTERED);
    expect(result).toBeNull();
  });
});

describe("findAllEventLogs", () => {
  it("returns all matching logs", () => {
    const logA = createMockLog(easInterface, "Attested", [
      "0x0000000000000000000000000000000000000000",
      ATTESTER,
      UID_A,
      SCHEMA_UID,
    ]);
    const logB = createMockLog(easInterface, "Attested", [
      "0x0000000000000000000000000000000000000000",
      ATTESTER,
      UID_B,
      SCHEMA_UID,
    ]);
    const receipt = createMockReceipt([logA, logB]);
    const results = findAllEventLogs(receipt, easInterface, TOPIC0_ATTESTED);
    expect(results).toHaveLength(2);
    expect(results[0].args.uid).toBe(UID_A);
    expect(results[1].args.uid).toBe(UID_B);
  });

  it("returns empty array when no log matches", () => {
    const receipt = createMockReceipt([]);
    const results = findAllEventLogs(receipt, easInterface, TOPIC0_ATTESTED);
    expect(results).toHaveLength(0);
  });

  it("skips logs with a different topic0", () => {
    const log = createMockLog(registryInterface, "WatcherRegistered", [
      WATCHER_ID,
      WATCHER_NAME,
      OWNER,
    ]);
    const receipt = createMockReceipt([log]);
    const results = findAllEventLogs(receipt, easInterface, TOPIC0_ATTESTED);
    expect(results).toHaveLength(0);
  });

  it("only returns logs matching topic0 when mixed logs are present", () => {
    const irrelevantLog = createMockLog(registryInterface, "WatcherRegistered", [
      WATCHER_ID,
      WATCHER_NAME,
      OWNER,
    ]);
    const targetLog = createMockLog(easInterface, "Attested", [
      "0x0000000000000000000000000000000000000000",
      ATTESTER,
      UID_A,
      SCHEMA_UID,
    ]);
    const receipt = createMockReceipt([irrelevantLog, targetLog]);
    const results = findAllEventLogs(receipt, easInterface, TOPIC0_ATTESTED);
    expect(results).toHaveLength(1);
    expect(results[0].args.uid).toBe(UID_A);
  });
});
