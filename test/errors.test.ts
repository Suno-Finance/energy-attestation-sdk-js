import { describe, it, expect } from "vitest";
import {
  EnergySDKError,
  ConfigurationError,
  ContractRevertError,
  TransactionError,
  ContractErrorCode,
  decodeContractError,
} from "../src/errors.js";
import {
  registryInterface,
  resolverInterface,
  encodeRegistryError,
  encodeResolverError,
} from "./helpers/mocks.js";

describe("Error classes", () => {
  describe("EnergySDKError", () => {
    it("sets name and message", () => {
      const err = new EnergySDKError("test");
      expect(err.name).toBe("EnergySDKError");
      expect(err.message).toBe("test");
    });

    it("is an instance of Error", () => {
      expect(new EnergySDKError("test")).toBeInstanceOf(Error);
    });
  });

  describe("ConfigurationError", () => {
    it("sets name and message", () => {
      const err = new ConfigurationError("bad config");
      expect(err.name).toBe("ConfigurationError");
      expect(err.message).toBe("bad config");
    });

    it("is an instance of EnergySDKError", () => {
      expect(new ConfigurationError("test")).toBeInstanceOf(EnergySDKError);
    });
  });

  describe("ContractRevertError", () => {
    it("sets all properties", () => {
      const err = new ContractRevertError("TestError", { foo: "bar" }, "0xdeadbeef", "registry");
      expect(err.name).toBe("ContractRevertError");
      expect(err.errorName).toBe("TestError");
      expect(err.errorArgs).toEqual({ foo: "bar" });
      expect(err.rawData).toBe("0xdeadbeef");
      expect(err.source).toBe("registry");
    });

    it("formats message with error name and source", () => {
      const err = new ContractRevertError("Foo", {}, "0x", "resolver");
      expect(err.message).toBe("Contract reverted: Foo (source: resolver)");
    });

    it("is an instance of EnergySDKError", () => {
      expect(new ContractRevertError("X", {}, "0x", "unknown")).toBeInstanceOf(EnergySDKError);
    });
  });

  describe("TransactionError", () => {
    it("sets message and originalError", () => {
      const orig = new Error("rpc failed");
      const err = new TransactionError("tx failed", orig);
      expect(err.name).toBe("TransactionError");
      expect(err.message).toBe("tx failed");
      expect(err.originalError).toBe(orig);
    });

    it("is an instance of EnergySDKError", () => {
      expect(new TransactionError("test", null)).toBeInstanceOf(EnergySDKError);
    });
  });
});

describe("decodeContractError", () => {
  it("decodes a registry error (ProjectNotRegistered)", () => {
    const data = encodeRegistryError("ProjectNotRegistered", [42]);
    const result = decodeContractError({ data }, registryInterface, resolverInterface);
    expect(result).toBeInstanceOf(ContractRevertError);
    const err = result as ContractRevertError;
    expect(err.errorName).toBe("ProjectNotRegistered");
    expect(err.source).toBe("registry");
    expect(err.errorArgs.projectId).toBe("42");
  });

  it("decodes a registry error (NonSequentialAttestation)", () => {
    const data = encodeRegistryError("NonSequentialAttestation", [1, 100, 200]);
    const result = decodeContractError({ data }, registryInterface, resolverInterface);
    const err = result as ContractRevertError;
    expect(err.errorName).toBe("NonSequentialAttestation");
    expect(err.source).toBe("registry");
    expect(err.errorArgs.projectId).toBe("1");
    expect(err.errorArgs.expectedFrom).toBe("100");
    expect(err.errorArgs.actualFrom).toBe("200");
  });

  it("decodes a resolver error (UnauthorizedAttester)", () => {
    const data = encodeResolverError("UnauthorizedAttester", [
      "0x0000000000000000000000000000000000000001",
    ]);
    const result = decodeContractError({ data }, registryInterface, resolverInterface);
    const err = result as ContractRevertError;
    expect(err.errorName).toBe("UnauthorizedAttester");
    expect(err.source).toBe("resolver");
    expect(err.errorArgs.attester).toBe("0x0000000000000000000000000000000000000001");
  });

  it("decodes a resolver error with no args (InvalidMethod)", () => {
    const data = encodeResolverError("InvalidMethod", []);
    const result = decodeContractError({ data }, registryInterface, resolverInterface);
    const err = result as ContractRevertError;
    expect(err.errorName).toBe("InvalidMethod");
    expect(err.source).toBe("resolver");
    expect(err.errorArgs).toEqual({});
  });

  it("prioritizes registry over resolver when both could match", () => {
    // ProjectNotRegistered exists in both, but registry is tried first
    const data = encodeRegistryError("ProjectNotRegistered", [5]);
    const result = decodeContractError({ data }, registryInterface, resolverInterface);
    expect((result as ContractRevertError).source).toBe("registry");
  });

  it("returns unknown ContractRevertError for unrecognized data", () => {
    const result = decodeContractError(
      { data: "0xdeadbeef" },
      registryInterface,
      resolverInterface,
    );
    const err = result as ContractRevertError;
    expect(err.errorName).toBe("UnknownError");
    expect(err.source).toBe("unknown");
    expect(err.rawData).toBe("0xdeadbeef");
  });

  it("returns TransactionError when no data field", () => {
    const result = decodeContractError(
      { message: "nonce too low" },
      registryInterface,
      resolverInterface,
    );
    expect(result).toBeInstanceOf(TransactionError);
    expect(result.message).toBe("nonce too low");
  });

  it("returns TransactionError with default message when no data and no message", () => {
    const result = decodeContractError({}, registryInterface, resolverInterface);
    expect(result).toBeInstanceOf(TransactionError);
    expect(result.message).toBe("Transaction failed");
  });

  it("converts bigint args to string", () => {
    const data = encodeRegistryError("PeriodAlreadyAttested", [1, 1700000000, 1700003600]);
    const result = decodeContractError({ data }, registryInterface, resolverInterface);
    const err = result as ContractRevertError;
    // All uint64 args should be stringified
    expect(typeof err.errorArgs.projectId).toBe("string");
    expect(typeof err.errorArgs.fromTimestamp).toBe("string");
    expect(typeof err.errorArgs.toTimestamp).toBe("string");
  });
});

describe("ContractErrorCode", () => {
  it("all values are strings matching their key names", () => {
    for (const [key, value] of Object.entries(ContractErrorCode)) {
      expect(value).toBe(key);
    }
  });

  it("contains all known registry error names", () => {
    expect(ContractErrorCode.ProjectNotRegistered).toBe("ProjectNotRegistered");
    expect(ContractErrorCode.WatcherNotRegistered).toBe("WatcherNotRegistered");
    expect(ContractErrorCode.AttesterAlreadyAuthorized).toBe("AttesterAlreadyAuthorized");
    expect(ContractErrorCode.AttesterNotAuthorized).toBe("AttesterNotAuthorized");
    expect(ContractErrorCode.PeriodAlreadyAttested).toBe("PeriodAlreadyAttested");
    expect(ContractErrorCode.NonSequentialAttestation).toBe("NonSequentialAttestation");
    expect(ContractErrorCode.AttestationAlreadyReplaced).toBe("AttestationAlreadyReplaced");
    expect(ContractErrorCode.ReplacementPeriodMismatch).toBe("ReplacementPeriodMismatch");
    expect(ContractErrorCode.UnauthorizedWatcherOwner).toBe("UnauthorizedWatcherOwner");
    expect(ContractErrorCode.DirectRevocationBlocked).toBe("DirectRevocationBlocked");
  });

  it("contains all known resolver error names", () => {
    expect(ContractErrorCode.UnauthorizedAttester).toBe("UnauthorizedAttester");
    expect(ContractErrorCode.InvalidMethod).toBe("InvalidMethod");
    expect(ContractErrorCode.InvalidTimestamps).toBe("InvalidTimestamps");
    expect(ContractErrorCode.InvalidReadingCount).toBe("InvalidReadingCount");
    expect(ContractErrorCode.InvalidReadingsLength).toBe("InvalidReadingsLength");
    expect(ContractErrorCode.TimestampOverflow).toBe("TimestampOverflow");
    expect(ContractErrorCode.ReplacementProjectMismatch).toBe("ReplacementProjectMismatch");
  });

  it("can be used for safe error matching with ContractRevertError", () => {
    const data = encodeRegistryError("ProjectNotRegistered", [1]);
    const result = decodeContractError({ data }, registryInterface, resolverInterface);
    const err = result as ContractRevertError;
    expect(err.errorName).toBe(ContractErrorCode.ProjectNotRegistered);
  });
});
