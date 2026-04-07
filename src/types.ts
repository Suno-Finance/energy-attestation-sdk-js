import type { AbstractSigner, Contract, Interface, Provider } from "ethers";

export enum Network {
  POLYGON = "polygon",
  AMOY = "amoy",
  CELO = "celo",
}

/** Common reading interval presets, expressed in minutes. */
export enum Interval {
  Hourly = 60,
  FourHours = 240,
  EightHours = 480,
  TwelveHours = 720,
  Daily = 1440,
  Weekly = 10080,
  Biweekly = 20160,
  FourWeeks = 40320,
}

export enum EnergyType {
  CONSUMER = 0,
  SOLAR_PV = 1,
  WIND_ONSHORE = 2,
  WIND_OFFSHORE = 3,
  HYDRO = 4,
  BIOMASS = 5,
  GEOTHERMAL = 6,
  OCEAN_TIDAL = 7,
  NUCLEAR = 8,
  NATURAL_GAS = 9,
  COAL = 10,
  OIL = 11,
  STORAGE_DISCHARGE = 12,
  HYDROGEN_FUEL_CELL = 13,
}

/** Config for private-key initialization (scripts, IoT devices, backends). */
export interface PrivateKeySDKConfig {
  /** Hex-encoded private key (with or without 0x prefix) */
  privateKey: string;
  /** Target network — determines default addresses and RPC */
  network: Network;
  /** JSON-RPC endpoint URL. Defaults to the network's public RPC if omitted. */
  rpcUrl?: string;
  /** EnergyRegistry contract address. Auto-resolved for officially supported networks. */
  registryAddress?: string;
  /** EAS schema UID (bytes32). Auto-resolved for officially supported networks. */
  schemaUID?: string;
  /** EAS core contract address. Auto-resolved for all networks with EAS deployed. */
  easAddress?: string;
  /** Optional transaction fee policy overrides for write calls. */
  tx?: TxFeeConfig;
}

/** Config for signer-based initialization (browser wallets, multisigs). */
export interface SignerSDKConfig {
  /** An ethers AbstractSigner with an attached provider (e.g. from BrowserProvider.getSigner()). */
  signer: AbstractSigner;
  /** Target network — determines default addresses and RPC */
  network: Network;
  /** EnergyRegistry contract address. Auto-resolved for officially supported networks. */
  registryAddress?: string;
  /** EAS schema UID (bytes32). Auto-resolved for officially supported networks. */
  schemaUID?: string;
  /** EAS core contract address. Auto-resolved for all networks with EAS deployed. */
  easAddress?: string;
  /** Optional transaction fee policy overrides for write calls. */
  tx?: TxFeeConfig;
}

/** @deprecated Use {@link PrivateKeySDKConfig} instead. */
export type EnergySDKConfig = PrivateKeySDKConfig;

export interface AttestParams {
  projectId: number;
  readings: bigint[];
  /** Minutes between readings. Accepts a plain number or an {@link Interval} enum value. */
  readingIntervalMinutes: Interval | number;
  fromTimestamp: number | bigint;
  method: string;
  metadataURI?: string;
}

export interface AttestationData {
  projectId: bigint;
  readingCount: number;
  readingIntervalMinutes: number;
  readings: bigint[];
  fromTimestamp: bigint;
  method: string;
  metadataURI: string;
}

export interface OverwriteAttestParams extends AttestParams {
  refUID: string;
}

export interface ZeroPeriodParams {
  projectId: number;
  interval: Interval;
  method?: string;
  metadataURI?: string;
}

export interface TxResult {
  txHash: string;
}

export interface CreateWatcherResult {
  watcherId: bigint;
  name: string;
  txHash: string;
}

export interface CreateProjectResult {
  projectId: bigint;
  name: string;
  energyType: number;
  txHash: string;
}

export interface AttestResult {
  uid: string;
  txHash: string;
}

export interface BatchAttestResult {
  uids: string[];
  txHash: string;
}

export interface Watcher {
  owner: string;
  registered: boolean;
  name: string;
}

export interface Project {
  watcherId: bigint;
  registered: boolean;
  energyType: number;
  name: string;
}

export interface ProjectStats {
  project: Project;
  totalGenerated: bigint;
  totalConsumed: bigint;
  lastTimestamp: bigint;
  metadataURI: string;
}

export interface WatcherStats {
  watcher: Watcher;
  totalGenerated: bigint;
  totalConsumed: bigint;
}

export interface SDKContext {
  registry: Contract;
  eas: Contract;
  schemaUID: string;
  registryInterface: Interface;
  resolverInterface: Interface;
  signer: AbstractSigner;
  provider: Provider;
  tx: Required<TxFeeConfig>;
  gasStrategy: "eip1559" | "legacy";
}

export interface TxFeeConfig {
  /** Minimum EIP-1559 priority fee in gwei that SDK will enforce. */
  minPriorityFeeGwei?: number;
  /** Multiplier applied to provider maxFeePerGas (or gasPrice fallback). */
  maxFeeMultiplier?: number;
  /** Number of times to retry a failed transaction (default: 0). */
  retryCount?: number;
  /** Delay in ms between retries, doubles on each attempt (default: 1000). */
  retryDelayMs?: number;
}
