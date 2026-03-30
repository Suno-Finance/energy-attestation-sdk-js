# energy-attestation-sdk

TypeScript SDK for the **Energy Attestation Service** — an on-chain public good that enables any energy project to publicly attest energy data using the [Ethereum Attestation Service (EAS)](https://attest.org).

Website: [attest.energy](https://attest.energy)

---

## Table of Contents

- [What is this?](#what-is-this)
  - [How it works](#how-it-works)
  - [Key concepts](#key-concepts)
  - [Data model](#data-model)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage Examples](#usage-examples)
  - [Sequential attestations (IoT device loop)](#sequential-attestations-iot-device-loop)
  - [Correcting a previous attestation](#correcting-a-previous-attestation)
  - [Querying project state](#querying-project-state)
  - [Managing attesters](#managing-attesters)
  - [Querying indexed data (EnergyQuery)](#querying-indexed-data-energyquery)
- [Configuration](#configuration)
  - [PrivateKeySDKConfig](#privatekeysdkconfig)
  - [SignerSDKConfig](#signersdkconfig)
  - [Transaction Fee Policy](#transaction-fee-policy)
  - [EnergyQueryConfig](#energyqueryconfig)
  - [Supported Networks](#supported-networks)
- [API Reference](#api-reference)
  - [Modules overview](#modules)
  - [sdk.watchers](#sdkwatchers)
  - [sdk.projects](#sdkprojects)
  - [sdk.attesters](#sdkattesters)
  - [sdk.attestations](#sdkattestations)
  - [sdk.read](#sdkread)
  - [EnergyQuery](#energyquery)
- [Gas Estimation](#gas-estimation)
- [Error Handling](#error-handling)
  - [Error types](#error-types)
  - [Common contract errors](#common-contract-errors)
- [Energy Types](#energy-types)
- [Utilities](#utilities)
- [Architecture](#architecture)
- [License](#license)

---

## What is this?

The Energy Attestation Service provides a trustless, immutable ledger for energy generation and consumption data. Energy projects — solar farms, wind turbines, grid consumers, IoT devices — submit periodic readings that are permanently recorded on-chain via EAS attestations.

This SDK wraps the on-chain smart contracts so you can interact with the protocol from **Node.js backends**, **IoT devices**, and **browser dApps** without dealing with ABI encoding, contract addresses, or EAS internals.

### How it works

```
Your App / IoT Device
        │
        ▼
   EnergySDK            ← this package
        │
        ▼
   EAS (attest)          ← Ethereum Attestation Service
        │
        ▼
   Resolver              ← validates readings, checks authorization
        │
        ▼
   EnergyRegistry        ← permanent state: projects, watchers, energy totals
```

1. You initialize the SDK with a private key and an RPC endpoint.
2. You call `sdk.attestations.attest(...)` with your energy readings.
3. The SDK ABI-encodes the data and submits it to EAS on-chain.
4. EAS triggers the **Resolver**, which validates the data (authorization, timestamps, reading format).
5. If valid, the Resolver writes the results to the **EnergyRegistry** (permanent state).
6. The SDK parses the transaction receipt and returns the attestation UID.

### Key concepts

| Concept         | Description                                                                                                                                                             |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Watcher**     | An organization or entity that owns energy projects (e.g., a utility company, a solar farm operator). Anyone can register as a watcher — it's permissionless.           |
| **Project**     | A specific energy generation site or consumption point under a watcher (e.g., "Solar Farm Alpha", "Building 7 Grid Import"). Each project has a fixed energy type.      |
| **Attester**    | A wallet authorized to submit energy readings for a project. Can be an IoT device, an auditor, or the project operator. Whitelisted per-project or per-watcher.         |
| **Attestation** | A set of energy readings for a time period, permanently recorded on-chain. Attestations form a **sequential chain** — each starts exactly where the previous one ended. |
| **Replacement** | Corrections are done by submitting a new attestation that references the old one (via `refUID`). The original stays on-chain for audit; totals update atomically.       |

### Data model

Each attestation contains:

| Field                    | Type        | Description                                                |
| ------------------------ | ----------- | ---------------------------------------------------------- |
| `projectId`              | `uint64`    | The project these readings belong to                       |
| `readings`               | `uint256[]` | Energy per interval in **watt-hours** (Wh, not kWh)        |
| `readingIntervalMinutes` | `uint32`    | Minutes between each reading (e.g., `Interval.Hourly` = 60) |
| `fromTimestamp`          | `uint64`    | Start of the reporting period (Unix seconds)               |
| `method`                 | `string`    | How data was collected: `"iot"`, `"manual"`, `"estimated"` |
| `metadataURI`            | `string`    | Optional IPFS/HTTPS link to supporting evidence            |

> **Note:** The `toTimestamp` is derived on-chain: `fromTimestamp + readings.length * readingIntervalMinutes * 60`.
>
> Energy is always expressed in **watt-hours (Wh)** as `uint256` to avoid floating-point precision issues on-chain.

---

## Installation

```bash
npm install energy-attestation-sdk ethers
```

> **Requirements:** Node.js >= 18, ethers.js v6

### Graph API key

`EnergyQuery` queries the Energy Attestation subgraphs hosted on [The Graph](https://thegraph.com). Querying requires a **free API key** from The Graph Studio:

1. Go to [thegraph.com/studio](https://thegraph.com/studio) and sign in
2. Navigate to **API Keys** → **Create API key**
3. Pass it to `EnergyQuery` via the `apiKey` option

The subgraphs are deployed and maintained by the Energy Attestation Service — you only need your own key, not your own subgraph.

---

## Quick Start

### Node.js / IoT / Scripts (private key)

```typescript
import { EnergySDK, Network, Interval, EnergyType } from "energy-attestation-sdk";

// --- Section 1: Watcher wallet (owner) registers watcher + project ---
//
// This wallet will OWN the watcher and project.
const watcherSdk = await EnergySDK.fromPrivateKey({
  privateKey: process.env.WATCHER_PRIVATE_KEY!,
  network: Network.AMOY,
});

// 1. Register a watcher (organization)
const { watcherId } = await watcherSdk.watchers.createWatcher("My Energy Company");

// 2. Register a solar generation project
const { projectId } = await watcherSdk.projects.createProject(
  watcherId,
  "Solar Farm Alpha",
  EnergyType.SOLAR_PV,
);

// --- Section 2: Separate attester wallet submits readings ---
//
// This wallet is DIFFERENT from the watcher owner wallet.
const attesterSdk = await EnergySDK.fromPrivateKey({
  privateKey: process.env.ATTESTER_PRIVATE_KEY!,
  network: Network.AMOY,
});

// 3. Watcher owner authorizes the attester wallet for this project
await watcherSdk.attesters.addAttester(projectId, attesterSdk.address);

// 4. Attester submits 4 hourly readings (Wh per hour)
const { uid, txHash } = await attesterSdk.attestations.attest({
  projectId: Number(projectId),
  readings: [1500n, 1800n, 2100n, 1900n],
  readingIntervalMinutes: Interval.Hourly, // or a custom number in minutes
  fromTimestamp: 1700000000,
  method: "iot",
  metadataURI: "ipfs://Qm...",
});

console.log(`Attestation UID: ${uid}`);
console.log(`Transaction: ${txHash}`);
```

### Browser dApp (MetaMask, WalletConnect, etc.)

```typescript
import { EnergySDK, Network } from "energy-attestation-sdk";
import { BrowserProvider } from "ethers";

// Connect to the user's browser wallet
const browserProvider = new BrowserProvider(window.ethereum);
const signer = await browserProvider.getSigner();

const sdk = await EnergySDK.fromSigner({
  signer,
  network: Network.CELO,
});

// All SDK methods work identically — the signer handles transaction signing
const { watcherId } = await sdk.watchers.createWatcher("My Organization");
console.log(`Connected as: ${sdk.address}`);
```

---

## Usage Examples

### Sequential attestations (IoT device loop)

Attestations must form a **continuous chain** with no gaps. Use `getProjectLastTimestamp()` to determine where the next one starts:

```typescript
// Get the chain tip — next attestation must start here
const lastTimestamp = await sdk.read.getProjectLastTimestamp(projectId);
const fromTimestamp =
  lastTimestamp === 0n
    ? Math.floor(Date.now() / 1000) - 3600 // First attestation: start 1 hour ago
    : Number(lastTimestamp); // Continue the chain

await sdk.attestations.attest({
  projectId: 1,
  readings: [2500n],
  readingIntervalMinutes: Interval.Hourly,
  fromTimestamp,
  method: "iot",
});
```

### Recording a zero period (downtime, gap fill)

When a device is offline or data is unavailable, use `attestZeroPeriod` to keep the chain continuous. `fromTimestamp` is automatically fetched from the project's last attested timestamp — no manual bookkeeping needed.

> **Note:** You can also record zeros with the regular `attest()` method by passing `readings: [0n]` directly. `attestZeroPeriod` is just a convenience wrapper that handles the timestamp lookup and zero-filling for you.

```typescript
// Record a full day of zero output (e.g., device was offline)
const { uid } = await sdk.attestations.attestZeroPeriod({
  projectId: 1,
  interval: Interval.Daily,           // covers exactly 1 day
  method: "downtime",                 // optional — defaults to "0 report"
  metadataURI: "ipfs://Qm...",        // optional — link to incident report
});
```

The zero period is fully replaceable later with real readings at any granularity, as long as the replacement covers the same total time window:

```typescript
// Replace the daily zero with 24 hourly real readings
const lastTimestamp = await sdk.read.getProjectLastTimestamp(1);

await sdk.attestations.overwriteAttestation({
  projectId: 1,
  readings: [1500n, 1800n, 2100n, /* ...21 more hourly readings */],
  readingIntervalMinutes: Interval.Hourly,
  fromTimestamp: Number(lastTimestamp) - Interval.Daily * 60, // start of the zero period
  method: "iot",
  refUID: uid,
});
```

### Correcting a previous attestation

If readings were wrong, submit a **replacement**. This is a **single transaction** — the resolver's `onAttest` hook detects the non-zero `refUID`, validates that the period is identical, and calls `recordReplacement` on the registry atomically. The original attestation is marked as replaced on-chain; totals are updated in the same transaction.

```typescript
const { uid: newUid } = await sdk.attestations.overwriteAttestation({
  projectId: 1,
  readings: [2800n], // Corrected readings
  readingIntervalMinutes: Interval.Hourly,
  fromTimestamp: 1700000000, // Must match original period exactly
  method: "manual",
  metadataURI: "ipfs://Qm...", // Link to correction justification
  refUID: "0xabc...def", // UID of the attestation being replaced
});
```

> **Important:** The replacement must cover the **exact same time period** (same `fromTimestamp` and derived `toTimestamp`). Only the readings, method, and metadata can change.

The SDK pre-validates the period match by fetching the original attestation before sending the transaction, surfacing mismatches as a `ConfigurationError` without spending gas. The resolver enforces the same rules on-chain as a final guarantee.

### Querying project state

All read methods are **gas-free** view calls:

```typescript
// Project info
const project = await sdk.read.getProject(projectId);
console.log(`${project.name} — type: ${project.energyType}, active: ${project.registered}`);

// Energy totals (in Wh)
const generated = await sdk.read.getTotalGeneratedEnergy(projectId);
console.log(`Total generated: ${generated} Wh (${generated / 1000n} kWh)`);

// Watcher-level aggregates
const watcherTotal = await sdk.read.getTotalGeneratedEnergyByWatcher(watcherId);

// Check if an address is authorized to submit readings
const canAttest = await sdk.read.isProjectAttester(projectId, "0x...");
```

### Querying indexed data (EnergyQuery)

`EnergyQuery` is a standalone class — no private key needed — for querying the indexed subgraph. It enables listing, filtering, pagination, and time-series queries that aren't possible with on-chain calls alone:

```typescript
import { EnergyQuery, Network } from "energy-attestation-sdk";

const query = new EnergyQuery({
  network: Network.AMOY,
  apiKey: process.env.GRAPH_API_KEY,
});

// Global protocol stats
const protocol = await query.getProtocol();
console.log(`Total projects: ${protocol.totalProjects}`);
console.log(`Total generated: ${protocol.totalGeneratedWh} Wh`);

// List all registered watchers
const watchers = await query.getWatchers({ registered: true });

// Get a single watcher with its projects, attesters, and ownership history
const watcher = await query.getWatcher("1");

// List projects for a watcher, ordered by total generation
const projects = await query.getProjects({
  watcherId: "1",
  orderBy: "totalGeneratedWh",
  orderDirection: "desc",
});

// All active attestations for a project within a time range
const attestations = await query.getAttestations({
  projectId: "42",
  replaced: false,
  fromTimestamp_gte: "1700000000",
  fromTimestamp_lte: "1710000000",
});

// Daily energy snapshots for charting
const snapshots = await query.getDailySnapshots({
  projectId: "42",
  dateFrom: "2025-01-01",
  dateTo: "2025-01-31",
});
// => [{ date: "2025-01-01", generatedWh: "1250000", consumedWh: "0", attestationCount: 24 }, ...]

// List all authorized attesters for a project
const attesters = await query.getProjectAttesters("42", { active: true });
```

> **Note:** `EnergyQuery` requires a deployed subgraph for the target network. Amoy is supported out of the box. For Polygon and Celo pass an explicit `subgraphUrl` once the subgraph is deployed on those networks.

---

### Managing attesters

Watcher owners control who can submit readings. Authorization works at two levels:

```typescript
// --- Per-project authorization ---

// Authorize specific devices/wallets for a single project
await sdk.attesters.addAttester(projectId, "0xIoTDevice1...");
await sdk.attesters.addAttester(projectId, "0xAuditor...");

// Batch operations (single transaction)
await sdk.attesters.addAttesters(projectId, ["0xDevice1...", "0xDevice2...", "0xDevice3..."]);

// --- Watcher-wide authorization ---

// Authorize a wallet across ALL projects under a watcher
await sdk.attesters.addWatcherAttester(watcherId, "0xCompanyBackend...");

// --- Revoke access ---

await sdk.attesters.removeAttester(projectId, "0xOldDevice...");
```

---

## Configuration

The SDK supports two initialization methods:

- **`EnergySDK.fromPrivateKey(config)`** — for Node.js scripts, IoT devices, and backends
- **`EnergySDK.fromSigner(config)`** — for browser wallets (MetaMask, WalletConnect) and multisig signers

### `PrivateKeySDKConfig`

| Field             | Type      | Required | Description                                                    |
| ----------------- | --------- | -------- | -------------------------------------------------------------- |
| `privateKey`      | `string`  | Yes      | Hex-encoded private key (with or without 0x)                   |
| `network`         | `Network` | Yes      | Target network — determines all default addresses and RPC      |
| `rpcUrl`          | `string`  | No       | JSON-RPC endpoint URL. Defaults to the network's public RPC.   |
| `registryAddress` | `string`  | No       | EnergyRegistry contract address. Auto-resolved if available.   |
| `schemaUID`       | `string`  | No       | EAS schema UID (bytes32). Auto-resolved if available.          |
| `easAddress`      | `string`  | No       | EAS core contract address. Auto-resolved if available.         |
| `tx`              | `TxFeeConfig` | No   | Optional fee policy for write transactions (EIP-1559 overrides). |

### `SignerSDKConfig`

| Field             | Type              | Required | Description                                                    |
| ----------------- | ----------------- | -------- | -------------------------------------------------------------- |
| `signer`          | `AbstractSigner`  | Yes      | An ethers.js signer with an attached provider                  |
| `network`         | `Network`         | Yes      | Target network — determines all default addresses              |
| `registryAddress` | `string`          | No       | EnergyRegistry contract address. Auto-resolved if available.   |
| `schemaUID`       | `string`          | No       | EAS schema UID (bytes32). Auto-resolved if available.          |
| `easAddress`      | `string`          | No       | EAS core contract address. Auto-resolved if available.         |
| `tx`              | `TxFeeConfig`     | No       | Optional fee policy for write transactions (EIP-1559 overrides). |

> `rpcUrl` is not needed for `fromSigner` — the signer carries its own provider.

### `Transaction Fee Policy`

To avoid low-tip rejections on some RPCs/networks, the SDK applies a safe EIP-1559 policy to all write calls (`create*`, `attest*`, `revoke*`, etc.).

Default behavior:

- `minPriorityFeeGwei: 25`
- `maxFeeMultiplier: 2`

Optional config type:

```typescript
type TxFeeConfig = {
  minPriorityFeeGwei?: number; // minimum priority fee (tip) in gwei
  maxFeeMultiplier?: number;   // multiplier applied to provider maxFeePerGas (or gasPrice fallback)
};
```

Example override:

```typescript
const sdk = await EnergySDK.fromSigner({
  signer,
  network: Network.CELO,
  tx: {
    minPriorityFeeGwei: 30,
    maxFeeMultiplier: 2,
  },
});
```

### `EnergyQueryConfig`

| Field         | Type      | Required | Description                                                                 |
| ------------- | --------- | -------- | --------------------------------------------------------------------------- |
| `network`     | `Network` | Yes      | Target network — determines the default subgraph URL                        |
| `apiKey`      | `string`  | Yes*     | Your personal API key from [The Graph Studio](https://thegraph.com/studio). Required to query the hosted subgraphs. |
| `subgraphUrl` | `string`  | No       | Override the default subgraph URL (e.g. for self-hosted deployments)        |

> \* Each developer brings their own free API key. The subgraphs are shared infrastructure — you don't need to deploy your own.

```typescript
const query = new EnergyQuery({
  network: Network.AMOY,
  apiKey: process.env.GRAPH_API_KEY,
});

const query = new EnergyQuery({
  network: Network.POLYGON,
  apiKey: process.env.GRAPH_API_KEY,
});

const query = new EnergyQuery({
  network: Network.CELO,
  apiKey: process.env.GRAPH_API_KEY,
});
```

### Supported Networks

| Network                | Enum              | Registry                                     | Schema UID                                                             | Subgraph |
| ---------------------- | ----------------- | -------------------------------------------- | ---------------------------------------------------------------------- | -------- |
| Celo Mainnet           | `Network.CELO`    | `0x644Dd384FCF5d94da98Bf8F6F10C448426974d29` | `0xbca196f2a002d6c29cddd85eb41637d2804d50c5c37faae85c15b375253844ef`   | ✅ Live  |
| Polygon Mainnet        | `Network.POLYGON` | `0x644Dd384FCF5d94da98Bf8F6F10C448426974d29` | `0xbca196f2a002d6c29cddd85eb41637d2804d50c5c37faae85c15b375253844ef`   | ✅ Live  |
| Polygon Amoy (testnet) | `Network.AMOY`    | `0xeD6fe3145c1a390114ebEeD03d24963D92c197B5` | `0x826d8672ade4ea0c0c2d7133e3095f010faa3b3dca331641835adbc7ac4384ce`   | ✅ Live  |

All three networks are fully supported — all addresses and subgraph URLs are auto-resolved, zero config needed.

### Init examples

```typescript
// --- Private key (scripts, IoT, backends) ---

// Simplest — everything auto-resolved (Amoy)
const sdk = await EnergySDK.fromPrivateKey({
  privateKey: process.env.PRIVATE_KEY,
  network: Network.AMOY,
});

// Production — custom RPC to avoid rate limits
const sdk = await EnergySDK.fromPrivateKey({
  privateKey: process.env.PRIVATE_KEY,
  network: Network.CELO,
  rpcUrl: "https://my-alchemy-endpoint.com",
});

// --- Browser wallet (MetaMask, WalletConnect, etc.) ---

import { BrowserProvider } from "ethers";

const signer = await new BrowserProvider(window.ethereum).getSigner();
const sdk = await EnergySDK.fromSigner({
  signer,
  network: Network.CELO,
});
```

---

## API Reference

### Modules

The SDK is organized into five focused modules, each accessible as a property on the SDK instance:

```typescript
sdk.watchers; //     WatcherModule  — create and manage watchers (organizations)
sdk.projects; //     ProjectModule  — create and manage energy projects
sdk.attesters; //    AttesterModule — manage attester authorization
sdk.attestations; // AttestationModule — submit and correct energy readings
sdk.read; //         ReadModule     — query on-chain state (view functions, no gas)
```

Additionally, the SDK exposes the underlying ethers.js objects for advanced use:

```typescript
sdk.address; //  The signer's wallet address (string)
sdk.signer; //   The ethers.js AbstractSigner instance
sdk.provider; // The ethers.js Provider instance
```

---

### `sdk.watchers`

| Method                                                        | Returns                 | Description                             |
| ------------------------------------------------------------- | ----------------------- | --------------------------------------- |
| `createWatcher(name)`                                         | `{ watcherId, txHash }` | Register a new watcher (permissionless) |
| `transferWatcherOwnership(watcherId, newOwner)`               | `{ txHash }`            | Transfer watcher to a new owner         |
| `estimateCreateWatcherGas(name)`                              | `bigint`                | Estimate gas for `createWatcher`        |
| `estimateTransferWatcherOwnershipGas(watcherId, newOwner)`    | `bigint`                | Estimate gas for `transferWatcherOwnership` |

---

### `sdk.projects`

| Method                                       | Returns                 | Description                                        |
| -------------------------------------------- | ----------------------- | -------------------------------------------------- |
| `createProject(watcherId, name, energyType)` | `{ projectId, txHash }` | Register a project under a watcher                 |
| `deregisterProject(projectId)`               | `{ txHash }`            | Deactivate a project (no new attestations allowed) |
| `transferProject(projectId, toWatcherId)`    | `{ txHash }`            | Move a project to a different watcher              |
| `setProjectMetadataURI(projectId, uri)`      | `{ txHash }`            | Set/update IPFS or HTTPS metadata link             |

---

### `sdk.attesters`

| Method                                       | Returns      | Description                                   |
| -------------------------------------------- | ------------ | --------------------------------------------- |
| `addAttester(projectId, attester)`           | `{ txHash }` | Authorize a wallet for a specific project     |
| `removeAttester(projectId, attester)`        | `{ txHash }` | Revoke project-level authorization            |
| `addAttesters(projectId, attesters[])`       | `{ txHash }` | Batch authorize multiple wallets              |
| `removeAttesters(projectId, attesters[])`    | `{ txHash }` | Batch revoke multiple wallets                 |
| `addWatcherAttester(watcherId, attester)`    | `{ txHash }` | Authorize across all projects under a watcher |
| `removeWatcherAttester(watcherId, attester)` | `{ txHash }` | Revoke watcher-wide authorization             |

---

### `sdk.attestations`

| Method                              | Returns                 | Description                                                       |
| ----------------------------------- | ----------------------- | ----------------------------------------------------------------- |
| `attest(params)`                    | `{ uid, txHash }`       | Submit new energy readings for a project                          |
| `overwriteAttestation(params)`      | `{ uid, txHash }`       | Replace a previous attestation (correction flow)                  |
| `attestBatch(params[])`             | `{ uids[], txHash }`    | Submit multiple attestations in a single transaction              |
| `attestZeroPeriod(params)`          | `{ uid, txHash }`       | Record a zero-energy period; replaceable later with real readings |
| `revokeAttestation(uid)`            | `{ txHash }`            | Invalidate an attestation without a replacement                   |

#### `AttestParams`

```typescript
{
  projectId: number;                     // The project to submit readings for
  readings: bigint[];                    // Energy in Wh per interval
  readingIntervalMinutes: Interval | number; // Minutes between readings (e.g., Interval.Hourly or 60)
  fromTimestamp: number;                 // Start of period (Unix seconds)
  method: string;                        // "manual" | "iot" | "estimated"
  metadataURI?: string;                  // Optional IPFS/HTTPS link to evidence
}
```

#### `OverwriteAttestParams`

Extends `AttestParams` with:

- `refUID: string` — the bytes32 UID of the attestation being replaced.

> The replacement must cover the **exact same time period** as the original (same `fromTimestamp` and derived `toTimestamp`).

#### `ZeroPeriodParams`

```typescript
{
  projectId: number;   // The project to record the zero period for
  interval: Interval;  // Length of the period (e.g., Interval.Daily)
  method?: string;     // Defaults to "0 report"
  metadataURI?: string;
}
```

`fromTimestamp` is auto-fetched from the project's last attested timestamp. The replacement can use any interval combination that covers the same total duration — for example, a `Interval.Daily` zero period can later be replaced with 24 hourly readings.

#### `BatchAttestResult`

```typescript
{
  uids: string[];  // EAS UIDs for each submitted attestation (order matches input params)
  txHash: string;  // Transaction hash
}
```

#### Revoking an attestation

Use `revokeAttestation` to permanently invalidate a specific attestation without providing a replacement. Once revoked, the EAS UID is marked as revoked on-chain.

> **Important:** The `EnergyAttestationResolver` **blocks direct revocations** (`DirectRevocationBlocked`) to preserve the sequential attestation chain. `revokeAttestation` will revert on-chain if a resolver is attached to the schema. Use `overwriteAttestation` whenever you have corrected data to submit. Only call `revokeAttestation` in cases where no replacement data exists — for example, to invalidate a fraudulent or test attestation on a schema without a blocking resolver.

```typescript
const { txHash } = await sdk.attestations.revokeAttestation(
  "0xabc...def", // EAS UID of the attestation to revoke
);
```

---

### `sdk.read`

All methods are **gas-free** view calls — they query on-chain state directly without sending transactions:

> For listing, filtering, pagination, time-series, and aggregated queries, use [`EnergyQuery`](#energyquery) instead.

| Method                                        | Returns    | Description                                   |
| --------------------------------------------- | ---------- | --------------------------------------------- |
| `getWatcher(watcherId)`                       | `Watcher`  | Watcher metadata (owner, name, active)        |
| `getProject(projectId)`                       | `Project`  | Project metadata (watcher, name, energy type) |
| `isProjectRegistered(projectId)`              | `boolean`  | Whether a project is active                   |
| `isWatcherRegistered(watcherId)`              | `boolean`  | Whether a watcher is active                   |
| `getProjectLastTimestamp(projectId)`          | `bigint`   | Chain tip — where next attestation must start |
| `getTotalGeneratedEnergy(projectId)`          | `bigint`   | Cumulative Wh generated by a project          |
| `getTotalConsumedEnergy(projectId)`           | `bigint`   | Cumulative Wh consumed by a project           |
| `getTotalGeneratedEnergyByWatcher(watcherId)` | `bigint`   | Cumulative Wh generated across all projects   |
| `getTotalConsumedEnergyByWatcher(watcherId)`  | `bigint`   | Cumulative Wh consumed across all projects    |
| `getWatcherProjects(watcherId)`               | `bigint[]` | All project IDs under a watcher               |
| `isProjectAttester(projectId, attester)`      | `boolean`  | Check project-level authorization             |
| `isWatcherAttester(watcherId, attester)`      | `boolean`  | Check watcher-level authorization             |
| `getProjectMetadataURI(projectId)`            | `string`   | IPFS/HTTPS metadata link                      |
| `getProjectEnergyType(projectId)`             | `number`   | Energy type ID (0 = consumer, 1+ = generator) |
| `getReplacementUID(uid)`                      | `string`   | Follow the replacement chain for audit        |
| `getAttestedPeriodUID(projectId, from, to)`   | `string`   | Look up which attestation covers a period     |
| `getAttestedPeriodStartUID(projectId, from)`  | `string`   | Look up attestation by start timestamp only   |
| `getNextProjectId()`                          | `bigint`   | Next project ID that will be assigned         |
| `getNextWatcherId()`                          | `bigint`   | Next watcher ID that will be assigned         |
| `getProjectWatcherId(projectId)`              | `bigint`   | Which watcher owns a project                  |
| `getProjectType(projectId)`                   | `number`   | Raw energy type ID for a project              |
| `isAuthorizedResolver(resolver)`              | `boolean`  | Check if an address is an authorized resolver |
| `isEnergyTypeRegistered(id)`                  | `boolean`  | Check if an energy type ID is registered      |
| `getEnergyTypeName(id)`                       | `string`      | Human-readable name for an energy type ID                |
| `getEnergyTypeAdmin()`                        | `string`      | Address of the energy type admin                         |
| `getWatcherProjectsWithDetails(watcherId)`    | `Project[]`   | All projects under a watcher with full metadata          |
| `getAttestationData(uid)`                     | `AttestationData` | Fetch and decode attestation data by EAS UID         |
| `getProjectStats(projectId)`                  | `ProjectStats` | Project metadata + energy totals + last timestamp in one call |

#### `AttestationData`

The decoded attestation data returned by `getAttestationData(uid)`:

```typescript
{
  projectId: bigint;
  readingCount: number;
  readingIntervalMinutes: number;
  readings: bigint[];        // Individual Wh readings
  fromTimestamp: bigint;     // Period start (Unix seconds)
  method: string;            // "manual" | "iot" | "estimated"
  metadataURI: string;       // "" if not set
}
```

```typescript
// Fetch and decode an attestation directly from the chain
const data = await sdk.read.getAttestationData("0xabc...def");
console.log(data.projectId);    // 1n
console.log(data.readings);     // [1500n, 1800n, 2100n]
console.log(data.fromTimestamp); // 1700000000n
```

#### `ProjectStats`

```typescript
{
  project: Project;       // Metadata (name, watcherId, energyType, registered)
  totalGenerated: bigint; // Cumulative Wh generated
  totalConsumed: bigint;  // Cumulative Wh consumed
  lastTimestamp: bigint;  // Chain tip — where next attestation must start
  metadataURI: string;    // IPFS/HTTPS metadata link
}
```

---

### `EnergyQuery`

`EnergyQuery` is a **standalone class** — independent of `EnergySDK`, no private key required — for querying the indexed subgraph. All methods return typed entities and support filtering and pagination.

> BigInt fields (energy totals, timestamps, block numbers) are returned as `string` to avoid JavaScript precision loss. Convert with `BigInt(value)` when arithmetic is needed.

#### Protocol

| Method          | Returns                       | Description                                     |
| --------------- | ----------------------------- | ----------------------------------------------- |
| `getProtocol()` | `SubgraphProtocol \| null`    | Global stats: total watchers, projects, energy  |

#### Energy Types

| Method            | Returns                 | Description                          |
| ----------------- | ----------------------- | ------------------------------------ |
| `getEnergyTypes()` | `SubgraphEnergyType[]` | All registered energy types with totals |

#### Watchers

| Method                                      | Returns                          | Description                                                   |
| ------------------------------------------- | -------------------------------- | ------------------------------------------------------------- |
| `getWatcher(id)`                            | `SubgraphWatcherDetail \| null`  | Single watcher with projects, attesters, and ownership history |
| `getWatchers(filters?)`                     | `SubgraphWatcher[]`              | List watchers with optional filtering and pagination          |
| `getWatcherOwnershipHistory(watcherId)`     | `SubgraphWatcherOwnershipTransfer[]` | Full ownership transfer history for a watcher            |

#### `WatcherFilters`

| Field            | Type                                                         | Default      |
| ---------------- | ------------------------------------------------------------ | ------------ |
| `first`          | `number`                                                     | `100`        |
| `skip`           | `number`                                                     | `0`          |
| `orderBy`        | `"createdAt" \| "totalGeneratedWh" \| "totalConsumedWh" \| "projectCount"` | `"createdAt"` |
| `orderDirection` | `"asc" \| "desc"`                                            | `"desc"`     |
| `registered`     | `boolean`                                                    | —            |
| `owner`          | `string`                                                     | —            |

#### Projects

| Method              | Returns                   | Description                                         |
| ------------------- | ------------------------- | --------------------------------------------------- |
| `getProject(id)`    | `SubgraphProject \| null` | Single project with watcher and energy type info    |
| `getProjects(filters?)` | `SubgraphProject[]`   | List projects with optional filtering and pagination |

#### `ProjectFilters`

| Field            | Type                                                                       | Default      |
| ---------------- | -------------------------------------------------------------------------- | ------------ |
| `first`          | `number`                                                                   | `100`        |
| `skip`           | `number`                                                                   | `0`          |
| `orderBy`        | `"createdAt" \| "totalGeneratedWh" \| "totalConsumedWh" \| "attestationCount"` | `"createdAt"` |
| `orderDirection` | `"asc" \| "desc"`                                                          | `"desc"`     |
| `watcherId`      | `string`                                                                   | —            |
| `energyTypeId`   | `string` — use `"0"` for consumers, `"1"`–`"13"` for generators           | —            |
| `registered`     | `boolean`                                                                  | —            |

#### Attestations

| Method                      | Returns                             | Description                                        |
| --------------------------- | ----------------------------------- | -------------------------------------------------- |
| `getAttestation(uid)`       | `SubgraphEnergyAttestation \| null` | Single attestation by EAS UID (bytes32 hex)        |
| `getAttestations(filters?)` | `SubgraphEnergyAttestation[]`       | List attestations with optional filtering and pagination |

#### `AttestationFilters`

| Field               | Type                                              | Default          |
| ------------------- | ------------------------------------------------- | ---------------- |
| `first`             | `number`                                          | `100`            |
| `skip`              | `number`                                          | `0`              |
| `orderBy`           | `"fromTimestamp" \| "blockTimestamp" \| "energyWh"` | `"fromTimestamp"` |
| `orderDirection`    | `"asc" \| "desc"`                                 | `"asc"`          |
| `projectId`         | `string`                                          | —                |
| `attester`          | `string`                                          | —                |
| `replaced`          | `boolean` — `false` returns only active attestations | —             |
| `fromTimestamp_gte` | `string` — Unix seconds                           | —                |
| `fromTimestamp_lte` | `string` — Unix seconds                           | —                |

#### Daily Snapshots

| Method                       | Returns                    | Description                                          |
| ---------------------------- | -------------------------- | ---------------------------------------------------- |
| `getDailySnapshots(filters)` | `SubgraphDailySnapshot[]`  | Day-bucketed energy totals, useful for charts        |

#### `DailySnapshotFilters`

| Field            | Type              | Default | Required |
| ---------------- | ----------------- | ------- | -------- |
| `projectId`      | `string`          | —       | Yes      |
| `dateFrom`       | `string` (YYYY-MM-DD) | —   | No       |
| `dateTo`         | `string` (YYYY-MM-DD) | —   | No       |
| `first`          | `number`          | `365`   | No       |
| `skip`           | `number`          | `0`     | No       |
| `orderDirection` | `"asc" \| "desc"` | `"asc"` | No       |

#### Attesters

| Method                                    | Returns                      | Description                                     |
| ----------------------------------------- | ---------------------------- | ----------------------------------------------- |
| `getProjectAttesters(projectId, filters?)` | `SubgraphProjectAttester[]` | Attesters authorized for a specific project     |
| `getWatcherAttesters(watcherId, filters?)` | `SubgraphWatcherAttester[]` | Attesters authorized at the watcher level       |

Both accept an optional `AttesterFilters` with `{ first?, skip?, active? }`.

---

## Gas Estimation

Every write method has a corresponding `estimate*Gas` variant that performs a dry-run simulation and returns the estimated gas units as a `bigint` — **without sending a transaction**. This is useful for fee budgeting, preflight checks, or surfacing authorization errors before committing gas.

```typescript
// Estimate gas before attesting
const gas = await sdk.attestations.estimateAttestGas({
  projectId: 1,
  readings: [1500n, 1800n],
  readingIntervalMinutes: 60,
  fromTimestamp: 1700000000,
  method: "iot",
});
console.log(`Estimated gas: ${gas}`); // e.g. 120000n

// Estimate gas for a correction
const gas = await sdk.attestations.estimateOverwriteAttestationGas({
  ...params,
  refUID: "0xabc...def",
});
```

Gas estimation methods apply the **same input validation** as their transaction counterparts and decode contract reverts into typed errors — so calling `estimateAttestGas` for an unauthorized attester throws a `ContractRevertError` with `errorName: "UnauthorizedAttester"`, the same as `attest` would.

### Available estimate methods

#### `sdk.watchers`

| Method                                                     | Estimates gas for                      |
| ---------------------------------------------------------- | -------------------------------------- |
| `estimateCreateWatcherGas(name)`                           | `createWatcher(name)`                  |
| `estimateTransferWatcherOwnershipGas(watcherId, newOwner)` | `transferWatcherOwnership(...)`        |

#### `sdk.attestations`

| Method                                    | Estimates gas for                |
| ----------------------------------------- | -------------------------------- |
| `estimateAttestGas(params)`               | `attest(params)`                 |
| `estimateOverwriteAttestationGas(params)` | `overwriteAttestation(params)`   |
| `estimateAttestBatchGas(params[])`        | `attestBatch(params[])`          |
| `estimateAttestZeroPeriodGas(params)`     | `attestZeroPeriod(params)`       |
| `estimateRevokeAttestationGas(uid)`       | `revokeAttestation(uid)`         |

#### `sdk.projects`

| Method                                            | Estimates gas for                    |
| ------------------------------------------------- | ------------------------------------ |
| `estimateCreateProjectGas(watcherId, name, type)` | `createProject(...)`                 |
| `estimateDeregisterProjectGas(projectId)`         | `deregisterProject(projectId)`       |
| `estimateTransferProjectGas(projectId, watcherId)`| `transferProject(...)`               |
| `estimateSetProjectMetadataURIGas(projectId, uri)`| `setProjectMetadataURI(...)`         |

#### `sdk.attesters`

| Method                                              | Estimates gas for                      |
| --------------------------------------------------- | -------------------------------------- |
| `estimateAddAttesterGas(projectId, attester)`       | `addAttester(...)`                     |
| `estimateRemoveAttesterGas(projectId, attester)`    | `removeAttester(...)`                  |
| `estimateAddAttestersGas(projectId, attesters[])`   | `addAttesters(...)`                    |
| `estimateRemoveAttestersGas(projectId, attesters[])`| `removeAttesters(...)`                 |
| `estimateAddWatcherAttesterGas(watcherId, attester)`| `addWatcherAttester(...)`              |
| `estimateRemoveWatcherAttesterGas(watcherId, attester)` | `removeWatcherAttester(...)`       |

---

## Error Handling

The SDK decodes on-chain revert reasons into typed errors. Contract errors from both the **resolver** (validation layer) and the **registry** (state layer) are automatically identified and surfaced:

```typescript
import { ContractRevertError, ConfigurationError, ContractErrorCode } from "energy-attestation-sdk";

try {
  await sdk.attestations.attest(params);
} catch (error) {
  if (error instanceof ContractRevertError) {
    console.error(`Contract error: ${error.errorName}`);
    console.error(`Source: ${error.source}`); // "resolver" | "registry" | "unknown"
    console.error(`Args: ${JSON.stringify(error.errorArgs)}`);
    console.error(`Raw data: ${error.rawData}`);
  }
}
```

### `ContractErrorCode`

Use `ContractErrorCode` for safe, refactor-proof error matching instead of comparing raw strings:

```typescript
import { ContractRevertError, ContractErrorCode } from "energy-attestation-sdk";

try {
  await sdk.attestations.attest(params);
} catch (error) {
  if (error instanceof ContractRevertError) {
    switch (error.errorName) {
      case ContractErrorCode.ProjectNotRegistered:
        console.error("Project does not exist or was deregistered");
        break;
      case ContractErrorCode.NonSequentialAttestation:
        console.error("Gap in attestation sequence — fromTimestamp must follow last attestation");
        break;
      case ContractErrorCode.UnauthorizedAttester:
        console.error("This wallet is not authorized to attest for this project");
        break;
      case ContractErrorCode.PeriodAlreadyAttested:
        console.error("This time period already has an attestation — use overwriteAttestation");
        break;
    }
  }
}
```

### Error types

| Error                 | When                                                               |
| --------------------- | ------------------------------------------------------------------ |
| `ConfigurationError`  | Invalid SDK config or method params (caught **before** sending tx) |
| `ContractRevertError` | On-chain revert with decoded error name, args, and source contract |
| `TransactionError`    | Transaction failure without decodable revert data                  |

### Common contract errors

| Error                        | Source   | Meaning                                                  |
| ---------------------------- | -------- | -------------------------------------------------------- |
| `UnauthorizedAttester`       | Resolver | Wallet is not whitelisted for this project               |
| `ProjectNotRegistered`       | Both     | Project ID doesn't exist or was deregistered             |
| `NonSequentialAttestation`   | Registry | `fromTimestamp` doesn't match the previous `toTimestamp` |
| `PeriodAlreadyAttested`      | Registry | This exact time period already has an attestation        |
| `InvalidReadingsLength`      | Resolver | `readings.length` doesn't match `readingCount`           |
| `InvalidMethod`              | Resolver | Empty method string                                      |
| `ReplacementPeriodMismatch`  | Both     | Replacement attestation covers a different period        |
| `AttestationAlreadyReplaced` | Registry | The referenced attestation was already replaced once     |
| `WatcherNotRegistered`       | Registry | Watcher ID doesn't exist                                 |
| `UnauthorizedWatcherOwner`   | Registry | Caller is not the watcher's owner                        |
| `InvalidTimestamps`          | Resolver | Derived `toTimestamp` is not after `fromTimestamp`       |

---

## Energy Types

Projects are classified by their energy source at registration. This classification is **permanent** and determines how readings are accumulated:

- **Consumer** (`energyType = 0`) — readings flow into the **consumed** accumulator
- **Generator** (`energyType = 1–13`) — readings flow into the **generated** accumulator

```typescript
import { EnergyType } from "energy-attestation-sdk";

// Consumer
EnergyType.CONSUMER; //  0 — grid import, operational load

// Generators
EnergyType.SOLAR_PV; //  1
EnergyType.WIND_ONSHORE; //  2
EnergyType.WIND_OFFSHORE; //  3
EnergyType.HYDRO; //  4
EnergyType.BIOMASS; //  5
EnergyType.GEOTHERMAL; //  6
EnergyType.OCEAN_TIDAL; //  7
EnergyType.NUCLEAR; //  8
EnergyType.NATURAL_GAS; //  9
EnergyType.COAL; // 10
EnergyType.OIL; // 11
EnergyType.STORAGE_DISCHARGE; // 12
EnergyType.HYDROGEN_FUEL_CELL; // 13
```

> New energy types can be added on-chain by the energy type admin without redeploying contracts.

### Interval presets

You can use the exported `Interval` enum to avoid minute-conversion mistakes:

```typescript
import { Interval } from "energy-attestation-sdk";

Interval.Hourly; // 60
Interval.FourHours; // 240
Interval.EightHours; // 480
Interval.TwelveHours; // 720
Interval.Daily; // 1440
Interval.Weekly; // 10080
Interval.Biweekly; // 20160
Interval.FourWeeks; // 40320
```

`readingIntervalMinutes` still accepts custom minute values when needed.

---

## Utilities

The SDK exports low-level helpers for advanced use cases such as custom integrations, off-chain verification, or building your own transaction flow:

```typescript
import {
  encodeAttestationData, // ABI-encode attestation params into bytes
  decodeAttestationData, // Decode bytes back into structured params
  computeToTimestamp, //    Derive toTimestamp from from + count * interval
  sumReadings, //           Sum a bigint[] of readings into total Wh
  ATTESTATION_SCHEMA, //   The EAS schema string
  ENERGY_TYPE_NAMES, //    Map of energy type IDs to human-readable names
  CHAIN_IDS, //             EVM chain IDs for all supported networks
} from "energy-attestation-sdk";

// Example: compute the end timestamp of a 24-hour hourly report
const toTimestamp = computeToTimestamp(1700000000, 24, 60);
// => 1700086400 (1700000000 + 24 * 60 * 60)

// Example: sum readings to get total energy
const total = sumReadings([1500n, 1800n, 2100n, 1900n]);
// => 7300n Wh

// Example: switch MetaMask to the correct network before signing
import { CHAIN_IDS, Network } from "energy-attestation-sdk";

await window.ethereum.request({
  method: "wallet_switchEthereumChain",
  params: [{ chainId: "0x" + CHAIN_IDS[Network.CELO].toString(16) }],
});
```

---

## Architecture

The SDK exposes two independent entry points:

```
┌─────────────────────────────────────────────────────────────┐
│                        EnergySDK                            │
│                    (requires private key)                    │
│                                                             │
│  sdk.attestations.attest()                                  │
│       │                                                     │
│       ▼                                                     │
│  ABI-encode data ──► EAS.attest() ──► on-chain tx           │
│                                                             │
│  sdk.watchers / sdk.projects / sdk.attesters                │
│       │                                                     │
│       ▼                                                     │
│  EnergyRegistry.method() ──► on-chain tx                    │
│                                                             │
│  sdk.read.*                                                 │
│       │                                                     │
│       ▼                                                     │
│  EnergyRegistry.view() ──► no gas, read-only                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       EnergyQuery                           │
│                (no private key required)                    │
│                                                             │
│  query.getAttestations() / getProjects() / getDailySnapshots│
│       │                                                     │
│       ▼                                                     │
│  GraphQL ──► The Graph subgraph ──► indexed on-chain data   │
└─────────────────────────────────────────────────────────────┘
```

**On-chain contracts:**

- **EnergyRegistry** — Permanent state contract. Stores watchers, projects, attester whitelists, and cumulative energy totals. This contract persists across resolver upgrades — all data remains intact.
- **EnergyAttestationResolver** — EAS resolver that validates attestation data (readings, timestamps, authorization) and delegates state writes to the registry. Stateless and replaceable without data migration.

**Key design decisions:**

- Attestations are submitted through EAS's `attest()` function, which triggers the resolver's `onAttest` hook for validation before data is recorded.
- **Direct revocations are blocked** to preserve the sequential attestation chain. Corrections are always done via the replacement mechanism (`overwriteAttestation`).
- The resolver can be upgraded independently — just deploy a new one, authorize it on the registry, and pause the old one. No data migration needed.
- `EnergyQuery` is fully independent — frontends, dashboards, and analytics tools can query indexed data without a wallet or RPC connection.

---

## License

MIT
