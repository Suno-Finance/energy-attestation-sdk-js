# Contributing to energy-attestation-sdk

Thank you for your interest in contributing. This document covers everything you need to get started.

---

## Table of Contents

- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [Development workflow](#development-workflow)
- [Scripts](#scripts)
- [Code standards](#code-standards)
- [Testing guidelines](#testing-guidelines)
- [Submitting a pull request](#submitting-a-pull-request)
- [Reporting bugs](#reporting-bugs)
- [Security vulnerabilities](#security-vulnerabilities)

---

## Getting started

### Prerequisites

- Node.js >= 18
- npm >= 9
- An ethers.js v6 compatible environment

### Setup

```bash
git clone https://github.com/Suno-Finance/energy-attestation-sdk-js.git
cd energy-attestation-sdk-js
npm install
```

Verify everything works:

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

---

## Project structure

```
src/
  index.ts                  # Public exports
  EnergySDK.ts              # Main SDK entry point
  EnergyQuery.ts            # Standalone subgraph query client
  errors.ts                 # Error classes and ContractErrorCode enum
  networks.ts               # Per-network addresses, RPC URLs, chain IDs
  types.ts                  # Shared TypeScript types
  modules/
    AttestationModule.ts    # attest, overwriteAttestation, attestBatch, etc.
    AttesterModule.ts       # addAttester, removeAttester, etc.
    ProjectModule.ts        # createProject, deregisterProject, etc.
    WatcherModule.ts        # createWatcher, transferWatcherOwnership
    ReadModule.ts           # All view/read-only contract calls
  abi/
    EnergyRegistry.ts       # ABI for the EnergyRegistry contract
    EnergyAttestationResolver.ts
test/
  modules/                  # Unit tests mirroring src/modules/
  helpers/
    mocks.ts                # Shared mock factories (createMockContext, getMock, etc.)
```

---

## Development workflow

1. **Fork** the repository and create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Make your changes — keep commits focused and atomic.
3. Run the full check suite before opening a PR:
   ```bash
   npm run lint && npm run typecheck && npm test && npm run format:check
   ```
4. Push your branch and open a pull request against `main`.

---

## Scripts

| Command                | Description                           |
| ---------------------- | ------------------------------------- |
| `npm run build`        | Compile CJS + ESM output with tsup    |
| `npm test`             | Run all tests once                    |
| `npm run test:watch`   | Run tests in watch mode               |
| `npm run lint`         | Run ESLint                            |
| `npm run format`       | Format all files with Prettier        |
| `npm run format:check` | Check formatting without writing      |
| `npm run typecheck`    | TypeScript type check (no emit)       |

---

## Code standards

### TypeScript

- Strict mode is enabled — no `any`, no implicit returns, no unused variables.
- Use `type` imports: `import type { Foo } from "./foo.js"`.
- Unused parameters must be prefixed with `_` (e.g. `_newImplementation`).
- All public-facing functions and types should have JSDoc comments.

### Linting

ESLint 9 with `typescript-eslint` strict rules. Key enforced rules:

- `@typescript-eslint/no-explicit-any`
- `@typescript-eslint/consistent-type-imports`
- `@typescript-eslint/no-unused-expressions`

Run `npm run lint` to check. Most issues are auto-fixable with `npm run lint -- --fix`.

### Formatting

Prettier with the project `.prettierrc`. Run `npm run format` before committing. The CI will fail on formatting violations.

---

## Testing guidelines

- **Framework:** Vitest
- **All contract interactions are mocked** — no live RPC calls in tests. Use `createMockContext()` from `test/helpers/mocks.ts`.
- **Coverage expectations:**
  - Every module method needs at least: happy path, correct args passed, `ConfigurationError` for invalid input (where applicable), `ContractRevertError` for on-chain revert decoding.
  - Gas estimation methods follow the same pattern.
- **Test file location:** `test/modules/<ModuleName>.test.ts` and `test/modules/<ModuleName>-gas.test.ts`.

### Adding a test

```typescript
import { describe, it, expect } from "vitest";
import { createMockContext, getMock, encodeRegistryError } from "../helpers/mocks.js";
import { ContractRevertError } from "../../src/errors.js";

describe("MyModule", () => {
  it("returns expected result", async () => {
    const ctx = createMockContext();
    getMock(ctx.registry, "myMethod").mockResolvedValue(...);

    const mod = new MyModule(ctx);
    const result = await mod.myMethod(...);

    expect(result).toBe(...);
  });
});
```

---

## Submitting a pull request

- **One concern per PR** — bug fix, feature, or refactor. Not all three.
- **Update the changelog** — add an entry under `## [Unreleased]` in `CHANGELOG.md` describing your change.
- **Update docs** — if you add or change a public method, update the API Reference table in `README.md`.
- **Tests required** — PRs without tests for new behavior will not be merged.
- The CI must pass (lint + typecheck + tests + build) before review.

---

## Reporting bugs

Open a [GitHub issue](https://github.com/Suno-Finance/energy-attestation-sdk-js/issues) with:

- SDK version (`npm list energy-attestation-sdk`)
- Node.js version (`node -v`)
- Minimal reproduction (code snippet or repo)
- Expected vs actual behavior
- Full error message and stack trace if applicable

---

## Security vulnerabilities

**Do not open a public issue for security vulnerabilities.**

See [SECURITY.md](SECURITY.md) for the responsible disclosure process.
