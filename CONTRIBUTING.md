# Contributing

## Development Setup

```bash
git clone git@gitlab.com:suno-finance/energy-attestation-sdk-js.git
cd energy-attestation-sdk-js
npm install
```

## Scripts

| Command              | Description                  |
| -------------------- | ---------------------------- |
| `npm run build`      | Build CJS + ESM with tsup    |
| `npm run test`       | Run tests once               |
| `npm run test:watch` | Run tests in watch mode      |
| `npm run lint`       | Run ESLint                   |
| `npm run format`     | Format with Prettier         |
| `npm run typecheck`  | Run TypeScript type checking |

## Standards

### Code Quality

All code must pass before merge:

```bash
npm run lint && npm run typecheck && npm run test && npm run format:check
```

### Linting

- ESLint 9 with TypeScript strict rules
- `@typescript-eslint/no-explicit-any` is enforced
- `@typescript-eslint/consistent-type-imports` is enforced
- Unused variables must be prefixed with `_`

### Formatting

- Prettier with the project `.prettierrc` config
- Run `npm run format` before committing

### Testing

- Vitest for all tests
- Unit tests for every module method
- Mock contract calls — no live RPC in tests
- Test files live in `test/` mirroring the `src/` structure

## Pull Requests

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all checks pass: `npm run lint && npm run typecheck && npm run test && npm run format:check`
4. Submit a merge request with a clear description
