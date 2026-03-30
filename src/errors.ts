import type { Interface } from "ethers";

/**
 * All known contract revert error names from the EnergyRegistry and EnergyAttestationResolver.
 * Use these constants for safe, refactor-proof error handling instead of raw strings.
 *
 * @example
 * ```ts
 * } catch (e) {
 *   if (e instanceof ContractRevertError && e.errorName === ContractErrorCode.ProjectNotRegistered) {
 *     // handle it
 *   }
 * }
 * ```
 */
export const ContractErrorCode = {
  // Registry errors
  AttestationAlreadyReplaced: "AttestationAlreadyReplaced",
  AttestationNotFound: "AttestationNotFound",
  AttesterAlreadyAuthorized: "AttesterAlreadyAuthorized",
  AttesterNotAuthorized: "AttesterNotAuthorized",
  DirectRevocationBlocked: "DirectRevocationBlocked",
  EmptyAttesterArray: "EmptyAttesterArray",
  EnergyTypeNotRegistered: "EnergyTypeNotRegistered",
  InvalidEnergyType: "InvalidEnergyType",
  NonSequentialAttestation: "NonSequentialAttestation",
  OwnableInvalidOwner: "OwnableInvalidOwner",
  OwnableUnauthorizedAccount: "OwnableUnauthorizedAccount",
  PeriodAlreadyAttested: "PeriodAlreadyAttested",
  PeriodStartAlreadyAttested: "PeriodStartAlreadyAttested",
  ProjectNotRegistered: "ProjectNotRegistered",
  ReplacementPeriodMismatch: "ReplacementPeriodMismatch",
  UnauthorizedEnergyTypeAdmin: "UnauthorizedEnergyTypeAdmin",
  UnauthorizedResolver: "UnauthorizedResolver",
  UnauthorizedWatcherOwner: "UnauthorizedWatcherOwner",
  WatcherNotRegistered: "WatcherNotRegistered",
  // Resolver errors
  AccessDenied: "AccessDenied",
  EnforcedPause: "EnforcedPause",
  ExpectedPause: "ExpectedPause",
  InsufficientValue: "InsufficientValue",
  InvalidEAS: "InvalidEAS",
  InvalidLength: "InvalidLength",
  InvalidMethod: "InvalidMethod",
  InvalidReadingCount: "InvalidReadingCount",
  InvalidReadingInterval: "InvalidReadingInterval",
  InvalidReadingsLength: "InvalidReadingsLength",
  InvalidTimestamps: "InvalidTimestamps",
  NotPayable: "NotPayable",
  ReplacementProjectMismatch: "ReplacementProjectMismatch",
  TimestampOverflow: "TimestampOverflow",
  UnauthorizedAttester: "UnauthorizedAttester",
} as const;

export type ContractErrorCode = (typeof ContractErrorCode)[keyof typeof ContractErrorCode];

export class EnergySDKError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnergySDKError";
  }
}

export class ConfigurationError extends EnergySDKError {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export class ContractRevertError extends EnergySDKError {
  constructor(
    public readonly errorName: string,
    public readonly errorArgs: Record<string, unknown>,
    public readonly rawData: string,
    public readonly source: "resolver" | "registry" | "unknown",
  ) {
    super(`Contract reverted: ${errorName} (source: ${source})`);
    this.name = "ContractRevertError";
  }
}

export class TransactionError extends EnergySDKError {
  constructor(
    message: string,
    public readonly originalError: unknown,
  ) {
    super(message);
    this.name = "TransactionError";
  }
}

export function decodeContractError(
  error: unknown,
  registryInterface: Interface,
  resolverInterface: Interface,
): ContractRevertError | TransactionError {
  const err = error as { data?: string; message?: string };
  const data = err.data;

  if (data) {
    try {
      const decoded = registryInterface.parseError(data);
      if (decoded) {
        const args: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(decoded.args.toObject())) {
          args[key] = typeof value === "bigint" ? value.toString() : value;
        }
        return new ContractRevertError(decoded.name, args, data, "registry");
      }
    } catch {
      // Not a registry error, try resolver
    }

    try {
      const decoded = resolverInterface.parseError(data);
      if (decoded) {
        const args: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(decoded.args.toObject())) {
          args[key] = typeof value === "bigint" ? value.toString() : value;
        }
        return new ContractRevertError(decoded.name, args, data, "resolver");
      }
    } catch {
      // Not a resolver error either
    }

    return new ContractRevertError("UnknownError", {}, data, "unknown");
  }

  return new TransactionError(err.message ?? "Transaction failed", error);
}
