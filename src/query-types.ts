import type { Network } from "./types.js";

// ---------------------------------------------------------------------------
// EnergyQuery config
// ---------------------------------------------------------------------------

export interface EnergyQueryConfig {
  /** Target network — determines the default subgraph URL */
  network: Network;
  /**
   * The Graph subgraph endpoint URL.
   * Auto-resolved from the network config when available.
   * Required for networks without a pre-configured subgraph.
   */
  subgraphUrl?: string;
  /**
   * Your personal API key from The Graph Studio (thegraph.com/studio → API Keys).
   * Required to query the Energy Attestation subgraphs.
   * Each developer uses their own free key — the subgraphs are shared infrastructure.
   */
  apiKey?: string;
}

// ---------------------------------------------------------------------------
// Subgraph entity types
//
// GraphQL `BigInt` fields are serialized as `string` to avoid JavaScript
// precision loss. Convert with `BigInt(value)` when arithmetic is needed.
// ---------------------------------------------------------------------------

export interface SubgraphProtocol {
  totalWatchers: number;
  totalProjects: number;
  totalAttestations: number;
  /** Accumulated watt-hours generated across all projects */
  totalGeneratedWh: string;
  /** Accumulated watt-hours consumed across all projects */
  totalConsumedWh: string;
  energyTypeAdmin: string;
}

export interface SubgraphEnergyType {
  /** uint8 energy type ID as string (e.g. "1" for solar_pv) */
  id: string;
  name: string;
  registered: boolean;
  totalGeneratedWh: string;
}

export interface SubgraphWatcher {
  /** watcherId as string */
  id: string;
  name: string;
  owner: string;
  registered: boolean;
  totalGeneratedWh: string;
  totalConsumedWh: string;
  projectCount: number;
  /** Unix timestamp as string */
  createdAt: string;
  createdAtBlock: string;
}

export interface SubgraphWatcherDetail extends SubgraphWatcher {
  projects: SubgraphProjectSummary[];
  watcherAttesters: SubgraphWatcherAttesterSummary[];
  ownershipHistory: SubgraphOwnershipTransferSummary[];
}

export interface SubgraphProjectSummary {
  id: string;
  name: string;
  registered: boolean;
  totalGeneratedWh: string;
  totalConsumedWh: string;
  lastToTimestamp: string;
  metadataURI: string | null;
  attestationCount: number;
  energyType: { id: string; name: string } | null;
}

export interface SubgraphWatcherAttesterSummary {
  id: string;
  attester: string;
  active: boolean;
  addedAt: string;
  addedAtBlock: string;
}

export interface SubgraphOwnershipTransferSummary {
  id: string;
  previousOwner: string;
  newOwner: string;
  timestamp: string;
  blockNumber: string;
  txHash: string;
}

export interface SubgraphProject {
  /** projectId as string */
  id: string;
  name: string;
  registered: boolean;
  totalGeneratedWh: string;
  totalConsumedWh: string;
  /** Unix timestamp of the latest attestation period end */
  lastToTimestamp: string;
  metadataURI: string | null;
  attestationCount: number;
  /** Unix timestamp as string */
  createdAt: string;
  createdAtBlock: string;
  watcher: { id: string; name: string };
  /** null = consumer project */
  energyType: { id: string; name: string } | null;
}

export interface SubgraphEnergyAttestation {
  /** EAS attestation UID (bytes32 hex) */
  id: string;
  /** Unix timestamp of period start */
  fromTimestamp: string;
  /** Unix timestamp of period end */
  toTimestamp: string;
  /** Total energy in watt-hours */
  energyWh: string;
  attester: string;
  metadataURI: string | null;
  /** Individual readings in watt-hours (each as string) */
  readings: string[];
  replaced: boolean;
  replacedBy: { id: string } | null;
  replaces: { id: string } | null;
  blockTimestamp: string;
  blockNumber: string;
  txHash: string;
  project: { id: string; name: string };
  energyType: { id: string; name: string } | null;
}

export interface SubgraphDailySnapshot {
  /** Format: "{projectId}-{YYYY-MM-DD}" */
  id: string;
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Unix timestamp of day start */
  timestamp: string;
  generatedWh: string;
  consumedWh: string;
  attestationCount: number;
  project: { id: string; name: string };
}

export interface SubgraphProjectAttester {
  /** Format: "{projectId}-{attesterAddress}" */
  id: string;
  attester: string;
  active: boolean;
  addedAt: string;
  addedAtBlock: string;
  project: { id: string; name: string };
}

export interface SubgraphWatcherAttester {
  /** Format: "{watcherId}-{attesterAddress}" */
  id: string;
  attester: string;
  active: boolean;
  addedAt: string;
  addedAtBlock: string;
  watcher: { id: string; name: string };
}

export interface SubgraphWatcherOwnershipTransfer {
  /** Format: "{txHash}-{logIndex}" */
  id: string;
  previousOwner: string;
  newOwner: string;
  timestamp: string;
  blockNumber: string;
  txHash: string;
  watcher: { id: string; name: string };
}

// ---------------------------------------------------------------------------
// Query filter types
// ---------------------------------------------------------------------------

export interface WatcherFilters {
  /** Max results to return. Default: 100. Max: 1000. */
  first?: number;
  /** Results to skip for pagination. Default: 0. */
  skip?: number;
  orderBy?: "createdAt" | "totalGeneratedWh" | "totalConsumedWh" | "projectCount";
  orderDirection?: "asc" | "desc";
  /** Filter by registration status */
  registered?: boolean;
  /** Filter by owner address */
  owner?: string;
}

export interface ProjectFilters {
  first?: number;
  skip?: number;
  orderBy?: "createdAt" | "totalGeneratedWh" | "totalConsumedWh" | "attestationCount";
  orderDirection?: "asc" | "desc";
  /** Filter by watcher ID */
  watcherId?: string;
  /**
   * Filter by energy type ID.
   * Use "0" for consumer projects.
   * Use the numeric string ("1", "2", …) for generator types.
   */
  energyTypeId?: string;
  /** Filter by registration status */
  registered?: boolean;
}

export interface AttestationFilters {
  first?: number;
  skip?: number;
  orderBy?: "fromTimestamp" | "blockTimestamp" | "energyWh";
  orderDirection?: "asc" | "desc";
  /** Filter by project ID */
  projectId?: string;
  /** Filter by attester address */
  attester?: string;
  /** Filter by replacement status. Use false to get only active attestations. */
  replaced?: boolean;
  /** Minimum fromTimestamp in Unix seconds (as string) */
  fromTimestamp_gte?: string;
  /** Maximum fromTimestamp in Unix seconds (as string) */
  fromTimestamp_lte?: string;
}

export interface DailySnapshotFilters {
  /** Project ID to query snapshots for */
  projectId: string;
  /** Start date in YYYY-MM-DD format (inclusive) */
  dateFrom?: string;
  /** End date in YYYY-MM-DD format (inclusive) */
  dateTo?: string;
  /** Max results. Default: 365. */
  first?: number;
  skip?: number;
  orderDirection?: "asc" | "desc";
}

export interface AttesterFilters {
  first?: number;
  skip?: number;
  /** Filter by active status */
  active?: boolean;
}
