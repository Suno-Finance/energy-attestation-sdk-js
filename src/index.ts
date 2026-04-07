export { EnergySDK } from "./EnergySDK.js";
export { EnergyQuery } from "./EnergyQuery.js";

export type {
  PrivateKeySDKConfig,
  SignerSDKConfig,
  EnergySDKConfig,
  AttestParams,
  OverwriteAttestParams,
  AttestResult,
  AttestationData,
  BatchAttestResult,
  ZeroPeriodParams,
  TxResult,
  CreateWatcherResult,
  CreateProjectResult,
  Watcher,
  Project,
  ProjectStats,
  WatcherStats,
} from "./types.js";

export { Network, Interval, EnergyType } from "./types.js";

export {
  EnergySDKError,
  ConfigurationError,
  ContractRevertError,
  TransactionError,
  ContractErrorCode,
} from "./errors.js";
export type { ContractErrorCode as ContractErrorCodeType } from "./errors.js";

export {
  encodeAttestationData,
  decodeAttestationData,
  computeToTimestamp,
  sumReadings,
} from "./encoding.js";

export { ATTESTATION_SCHEMA, ENERGY_TYPE_NAMES, DEFAULT_ZERO_PERIOD_METHOD } from "./constants.js";

export { getNetworkConfig, CHAIN_IDS } from "./networks.js";
export type { NetworkConfig } from "./networks.js";

export type {
  EnergyQueryConfig,
  SubgraphProtocol,
  SubgraphEnergyType,
  SubgraphWatcher,
  SubgraphWatcherDetail,
  SubgraphProjectSummary,
  SubgraphProject,
  SubgraphEnergyAttestation,
  SubgraphDailySnapshot,
  SubgraphProjectAttester,
  SubgraphWatcherAttester,
  SubgraphWatcherOwnershipTransfer,
  WatcherFilters,
  ProjectFilters,
  AttestationFilters,
  DailySnapshotFilters,
  AttesterFilters,
  PageResult,
} from "./query-types.js";
