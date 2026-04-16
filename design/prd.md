# PRD — CLI Layer Responsibility Refactor

## Overview

Redistribute responsibilities across `bin.ts`, `cli.ts`, and `commands.ts` so each layer has a single, clear concern. Currently `cli.ts` acts as a pass-through for dependencies it doesn't own, coupling the routing layer to the full `Services` and `Adapters` interfaces. This refactor removes that coupling.

## Problem

`cli.ts` (`runCli`) receives the full `{ services, adapters }` dependency bundle and forwards it to command handlers. It only uses `observability` for its own logic. This means:

- `cli.ts` imports `Services` and `Adapters` types it doesn't need
- Argument validation (bad arg counts, invalid env values, unknown commands) is scattered across `cli.ts` and per-command handler definitions inside `cli.ts`
- The `CommandHandler` type in `cli.ts` knows about the full dependency surface
- Observability is called for non-semantic failures (unknown command, bad args) that aren't worth tracking

## Goals

- `cli.ts` (`runCli`) knows nothing about `Services`, `Adapters`, or `argv`
- All argument parsing, command routing, and validation happens in `bin.ts` before `runCli` is called
- Command handlers in `commands.ts` receive a flat deps object (no `services`/`adapters` nesting)
- Observability is only called for real command execution outcomes, not validation failures
- `--help` is handled entirely in `bin.ts`; it is not a command passed to `runCli`

## Target Architecture

### `bin.ts`

Owns everything before dispatch:

1. Parse `process.argv`
2. If `--help` / `-h` / no command: print help text, set exit code, exit — never calls `runCli`
3. If unknown command: print error, set exit code, exit — never calls `runCli`
4. Validate argv shape for the matched command (arg counts, valid env values); on failure: print error, set exit code, exit
5. Construct all concrete adapters and services
6. Bind deps to the matched handler, producing a zero-argument thunk `() => Promise<HandlerResult>`
7. Call `runCli(command, thunk, observability)`

### `cli.ts` (`runCli`)

Owns only dispatch and observability:

```ts
const runCli = async (
  command: string,
  handler: () => Promise<HandlerResult>,
  observability: ObservabilityClient,
): Promise<CliResult>
```

- Calls `observability.safeTrack(`${command}.start`)`
- Awaits `handler()`
- On success: calls `observability.safeTrack(`${command}.success`, result.meta)`
- On `CliError`: calls `observability.safeError` + `safeTrack(`${command}.failure`)`, returns error exit code
- On unknown error: rethrows

No knowledge of `argv`, `Services`, `Adapters`, or command names beyond the string passed in.

### `commands.ts`

Each handler receives a flat deps object — no `{ services, adapters }` nesting. There is no shared `Deps` interface; each handler declares its own inline dep type with exactly the members it needs.

```ts
// Before
const handleDeploy = async (
  { projectDirectory },
  deps: {
    services: Pick<Services, "platformManifestGenerator">;
    adapters: Pick<Adapters, "deployClient" | "projectReader">;
  },
)

// After
const handleDeploy = async (
  { projectDirectory },
  deps: {
    platformManifestGenerator: PlatformManifestGenerator;
    deployClient: DeployClient;
    projectReader: ProjectReaderPort;
  },
)
```

`commands.ts` removes the `Services` and `Adapters` interfaces entirely. `HandlerResult` and `CliResult` remain exported.

## What Does Not Change

- The `BadArgumentsError` type and its exit code
- Observability call sites and behaviour for successful/failed commands
- The `HandlerResult` shape
- The port and adapter interfaces themselves
- Test coverage — existing tests must continue to pass; no new tests are required for this refactor

## Phases

### Phase 1 — Flatten `commands.ts` deps

- Merge `Services` and `Adapters` into a single `Deps` interface
- Update every handler signature to use `Pick<Deps, ...>` instead of nested `services`/`adapters`
- Update `bin.ts` and any tests that construct handler deps
- `cli.ts` is unchanged in this phase

### Phase 2 — Move validation and routing to `bin.ts`

- Move the `COMMANDS` map and all `BadArgumentsError` throw logic out of `cli.ts` into `bin.ts`
- Move `--help` handling into `bin.ts`
- `bin.ts` binds deps to each handler producing a zero-arg thunk
- `bin.ts` calls `runCli(command, thunk, observability)` only after successful validation

### Phase 3 — Slim `runCli`

- Remove `argv`, `cwd`, `Services`, `Adapters`, and `CommandHandler` from `cli.ts`
- Update `runCli` to the new three-argument signature
- Remove `CliDependencies` interface; it is no longer needed
- Verify `cli.ts` imports only `ObservabilityClient` and types from `commands.ts`
