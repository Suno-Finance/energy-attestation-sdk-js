# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-04-06

### Added

- **Pre-flight validation for negative readings** — `attest`, `overwriteAttestation`, and `attestBatch` now throw `ConfigurationError` immediately if any value in `readings` is negative, instead of silently encoding it as a huge `uint256`.
- **Pre-flight validation for timestamp overflow** — throws `ConfigurationError` before sending when `fromTimestamp + readingCount × readingIntervalMinutes × 60` would exceed `uint64` max, surfacing the issue without spending gas.
- **Expanded test coverage** — new tests for all previously untested contract revert paths across `AttestationModule`, `AttestZeroPeriod`, `AttestBatch`, `AttestRevoke`, `ProjectModule`, and `AttesterModule`; ABI event round-trip tests for all 22 registry contract events.

### Fixed

- **MetaMask `eth_maxPriorityFeePerGas` warnings** — the SDK no longer calls `provider.getFeeData()`, which internally triggered this unsupported RPC method on Celo and caused noisy wallet console warnings. Fee data is now fetched via direct RPC calls (`eth_getBlockByNumber` for EIP-1559 networks, `eth_gasPrice` for legacy).
- **`createProject` rejecting consumer projects** — `EnergyType.CONSUMER` (value `0`) was incorrectly blocked by the SDK's pre-flight energy type check. The contract always allows `energyType = 0` without a registration check, and the SDK now matches this behaviour.

### Changed

- **`gasStrategy` added to `NetworkConfig` and `SDKContext`** — all built-in networks are configured as `"eip1559"`. A `"legacy"` strategy is available for future networks that do not support EIP-1559.
- **`AttestParams.fromTimestamp` widened to `number | bigint`** — accepts `bigint` in addition to `number` for greater precision when working with timestamps near `uint64` boundaries.

---

## [1.0.0] - 2026-04-01

### Changed

- **Updated Celo Mainnet contract addresses** — `EnergyRegistry` proxy (`0xA5B5f895091d79d1f099531cDB8cb896F17ec4C1`), `EnergyAttestationResolver` (`0x5d2f202cAE2D321C5f595baaE359956c3a9Ff02D`), and schema UID (`0xb9c136082a935b39c6e276ea137ac489bdc090aac17a116347c7ea90442ef7e0`) following fresh mainnet deployment.
- **Updated Polygon Mainnet contract addresses** — same registry, resolver, and schema UID as Celo above, reflecting new mainnet deployment.
- **Updated Polygon default RPC** — switched from `polygon-rpc.com` (deprecated) to `polygon-bor-rpc.publicnode.com`.

---

## [0.4.1] - 2026-03-31

### Added

- **Async pagination helpers** — `iterateWatchers`, `iterateProjects`, and `iterateAttestations` on `EnergyQuery` for cursor-based iteration over large result sets.
- **`sdk.network` property** — exposed on the `EnergySDK` instance for downstream inspection.
- **`retryCount` / `retryDelayMs` on `TxFeeConfig`** — configurable retry behaviour for transaction submission.
- **`utils/events`** — internal event parsing utilities, now covered by tests.
- **`utils/transaction`** — internal transaction helpers, now covered by tests.
- **Extended test coverage** — `EnergyQuery`, `EnergySDK` init, event utils, and transaction utils all gain dedicated test suites.

### Changed

- **`EnergyQuery` list methods** return `PageResult<T>` with cursor metadata instead of bare arrays.
- **`ReadModule` numeric normalisation** — all contract numeric outputs (IDs, totals, timestamps, arrays) are consistently normalised to `bigint`.
- **Network preflight resilience** — `EnergySDK.fromPrivateKey` and `fromSigner` now wrap `provider.getNetwork()` in a timeout and treat DNS / connection failures as recoverable during chain-ID validation.

### Fixed

- **`estimateOverwriteAttestationGas`** — fixed fallback logic that could produce mixed-type runtime errors when revoke gas estimation fails.

---

## [0.2.0] - 2026-03-31

### Added

- **UUPS upgradeable registry** — `EnergyRegistry` is now deployed behind an ERC-1967 UUPS proxy. The proxy address is permanent across all future contract upgrades.
- **New Amoy deployment** — Updated registry proxy address (`0x059D4655941204cf6aaC1cF578Aa9dc5D3ed6B39`) and schema UID (`0x4673141c77c3d54962edf6ef7f25a0c62656f9bd08138b4c4f9561413c235435`) for Polygon Amoy testnet.
- **Expanded `ContractErrorCode`** — Added `InvalidInitialization`, `UUPSUnauthorizedCallContext`, and `ERC1967InvalidImplementation` for proxy-related revert handling.
- **Full contract error reference** — README now documents all ~30 revert errors from the registry and resolver with source and meaning.
- **`ConfigurationError` conditions reference** — README documents every pre-transaction validation that throws before spending gas (invalid addresses, missing provider, chain ID mismatch, `attestZeroPeriod` prerequisites, `overwriteAttestation` pre-checks).
- **`fromSigner` requirements documented** — Signer must have an attached provider; chain ID is validated against the configured network at init time.
- **README badges** — npm version, downloads, CI status, license, Node and ethers peer dep badges.
- **CI workflow** — Lint, typecheck, test, and build run on every push to `main` and on all pull requests.

### Changed

- `registryAddress` in all SDK config types now explicitly refers to the **proxy** address, not the implementation address.

---

## [0.1.0] - 2026-01-01

### Added

- Initial release.
- `EnergySDK.fromPrivateKey` and `EnergySDK.fromSigner` initialization.
- `sdk.watchers` — `createWatcher`, `transferWatcherOwnership` and gas estimates.
- `sdk.projects` — `createProject`, `deregisterProject`, `transferProject`, `setProjectMetadataURI` and gas estimates.
- `sdk.attesters` — `addAttester`, `removeAttester`, `addAttesters`, `removeAttesters`, `addWatcherAttester`, `removeWatcherAttester` and gas estimates.
- `sdk.attestations` — `attest`, `overwriteAttestation`, `attestBatch`, `attestZeroPeriod`, `revokeAttestation` and gas estimates.
- `sdk.read` — full set of view methods for on-chain state queries.
- `EnergyQuery` — standalone GraphQL client for The Graph subgraph (watchers, projects, attestations, daily snapshots, attesters).
- `EnergyType`, `Interval`, `ContractErrorCode` enums.
- Utility exports: `encodeAttestationData`, `decodeAttestationData`, `computeToTimestamp`, `sumReadings`, `ATTESTATION_SCHEMA`, `ENERGY_TYPE_NAMES`, `CHAIN_IDS`.
- Support for Celo mainnet, Polygon mainnet, and Polygon Amoy testnet.
- EIP-1559 fee policy with configurable `minPriorityFeeGwei` and `maxFeeMultiplier`.
