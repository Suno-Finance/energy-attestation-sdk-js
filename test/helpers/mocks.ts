import { vi } from "vitest";
import { Interface, ZeroHash } from "ethers";
import { ENERGY_REGISTRY_ABI } from "../../src/abi/EnergyRegistry.js";
import { ENERGY_ATTESTATION_RESOLVER_ABI } from "../../src/abi/EnergyAttestationResolver.js";
import { EAS_ABI } from "../../src/abi/EAS.js";
import type { SDKContext } from "../../src/types.js";

export const registryInterface = new Interface(ENERGY_REGISTRY_ABI);
export const resolverInterface = new Interface(ENERGY_ATTESTATION_RESOLVER_ABI);
export const easInterface = new Interface(EAS_ABI);

export function createMockLog(iface: Interface, eventName: string, args: unknown[]) {
  const event = iface.getEvent(eventName);
  if (!event) throw new Error(`Event ${eventName} not found`);
  const encoded = iface.encodeEventLog(event, args);
  return { topics: encoded.topics, data: encoded.data };
}

export function createMockReceipt(logs: { topics: string[]; data: string }[], hash = "0xabcd") {
  return { hash, logs };
}

export function createMockTx(receipt: ReturnType<typeof createMockReceipt>) {
  return { wait: vi.fn().mockResolvedValue(receipt) };
}

/** Create a mock contract method with an attached .estimateGas mock */
function mockMethod() {
  const fn = vi.fn() as ReturnType<typeof vi.fn> & { estimateGas: ReturnType<typeof vi.fn> };
  fn.estimateGas = vi.fn();
  return fn;
}

export function createMockContext(overrides?: Partial<SDKContext>): SDKContext {
  const schemaUID = "0x" + "ab".repeat(32);

  const mockRegistry = {
    registerWatcher: mockMethod(),
    registerProject: mockMethod(),
    addAttester: mockMethod(),
    removeAttester: mockMethod(),
    addAttesters: mockMethod(),
    removeAttesters: mockMethod(),
    addWatcherAttester: mockMethod(),
    removeWatcherAttester: mockMethod(),
    deregisterProject: mockMethod(),
    transferProject: mockMethod(),
    setProjectMetadataURI: mockMethod(),
    transferWatcherOwnership: mockMethod(),
    getWatcher: vi.fn(),
    getProject: vi.fn(),
    isProjectRegistered: vi.fn(),
    isWatcherRegistered: vi.fn(),
    getProjectLastTimestamp: vi.fn(),
    getTotalGeneratedEnergy: vi.fn(),
    getTotalConsumedEnergy: vi.fn(),
    getTotalGeneratedEnergyByWatcher: vi.fn(),
    getTotalConsumedEnergyByWatcher: vi.fn(),
    getWatcherProjects: vi.fn(),
    isProjectAttester: vi.fn(),
    isWatcherAttester: vi.fn(),
    getProjectMetadataURI: vi.fn(),
    getProjectEnergyType: vi.fn(),
    getReplacementUID: vi.fn(),
    getAttestedPeriodUID: vi.fn(),
    getAttestedPeriodStartUID: vi.fn(),
    getNextProjectId: vi.fn(),
    getNextWatcherId: vi.fn(),
    getProjectWatcherId: vi.fn(),
    getProjectType: vi.fn(),
    isAuthorizedResolver: vi.fn(),
    isEnergyTypeRegistered: vi.fn(),
    getEnergyTypeName: vi.fn(),
    getEnergyTypeAdmin: vi.fn(),
    interface: registryInterface,
  };

  const mockEAS = {
    attest: mockMethod(),
    multiAttest: mockMethod(),
    revoke: mockMethod(),
    getAttestation: vi.fn(),
    interface: easInterface,
  };

  return {
    registry: mockRegistry as unknown as SDKContext["registry"],
    eas: mockEAS as unknown as SDKContext["eas"],
    schemaUID,
    registryInterface,
    resolverInterface,
    signer: { getAddress: vi.fn() } as unknown as SDKContext["signer"],
    provider: {
      getFeeData: vi.fn().mockResolvedValue({}),
      send: vi.fn().mockResolvedValue({ baseFeePerGas: "0x174876E800" }), // 100 gwei default
    } as unknown as SDKContext["provider"],
    tx: { minPriorityFeeGwei: 25, maxFeeMultiplier: 2, retryCount: 0, retryDelayMs: 1000 },
    gasStrategy: "eip1559" as const,
    ...overrides,
  };
}

export function createMockAttestReceipt(uid = ZeroHash) {
  const log = createMockLog(easInterface, "Attested", [
    "0x0000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000001",
    uid,
    "0x" + "ab".repeat(32),
  ]);
  return createMockReceipt([log]);
}

/** Encode a registry custom error as a hex data string (simulates on-chain revert) */
export function encodeRegistryError(errorName: string, args: unknown[]): string {
  return registryInterface.encodeErrorResult(errorName, args);
}

/** Encode a resolver custom error as a hex data string (simulates on-chain revert) */
export function encodeResolverError(errorName: string, args: unknown[]): string {
  return resolverInterface.encodeErrorResult(errorName, args);
}

/** Helper to get the mock fn from a context object */
export function getMock(obj: unknown, method: string): ReturnType<typeof vi.fn> {
  return (obj as Record<string, ReturnType<typeof vi.fn>>)[method];
}

/** Create a simple successful tx + receipt for write operations */
export function mockSuccessfulTx(hash = "0xtxhash") {
  const receipt = createMockReceipt([], hash);
  return createMockTx(receipt);
}
