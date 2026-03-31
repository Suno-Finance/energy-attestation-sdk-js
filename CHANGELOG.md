# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
