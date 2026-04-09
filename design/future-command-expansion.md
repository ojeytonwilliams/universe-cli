# Future Command Expansion Notes (Phase 4)

## Purpose

Document how the remaining deferred commands evolve from the shared non-implemented contract.

## Current Stub Contract

The deferred commands are:

- `rollback`
- `logs`
- `status`
- `list`
- `teardown`

Each command currently:

- Is invocable from `runCli`.
- Returns `DeferredCommandError`.
- Shares one exact message template and one exact non-zero exit code.

This keeps user-facing behavior deterministic while preserving command discoverability.

## Implemented Commands (Spike Mode)

The following commands have been promoted from deferred to fully implemented against behaviour-simulating stub adapters:

| Command    | Port Contract        | Stub Adapter             | Promoted In |
| ---------- | -------------------- | ------------------------ | ----------- |
| `register` | `RegistrationClient` | `StubRegistrationClient` | v2.8.0      |
| `deploy`   | `DeployClient`       | `StubDeployClient`       | v2.10.0     |
| `promote`  | `PromoteClient`      | `StubPromoteClient`      | v2.12.0     |

Each implemented command:

- Reads `platform.yaml` via `ProjectReaderPort` / `LocalProjectReader`.
- Validates the manifest via `PlatformManifestService.validateManifest`.
- Delegates to its port adapter.
- Emits lifecycle telemetry via `safeTrack` (deploy) or errors via `safeError`.
- Has typed error classes with stable exit codes.

## Migration Path by Command

### Stage 1: Replace stub handlers with command-specific use-cases

For each deferred command:

1. Add a command-specific application use-case behind ports.
2. Keep CLI argument parsing and output formatting in `runCli`.
3. Convert command failures into typed `CliError` subclasses.
4. Preserve help output and command names.

### Stage 2: Introduce real adapters incrementally

- Start with `register` as the first non-stub command.
- Add production adapters behind ports while keeping local stub implementations for tests.
- Keep a guard test for spike mode so accidental real-adapter wiring stays detectable.

### Stage 3: Expand contract and automation

- Add command-specific contract tests per port.
- Add E2E flows for success/failure paths per command.
- Keep standardized error style and exit semantics across commands.

## Shared Infrastructure Reusable for `register`

`register` can reuse the following existing infrastructure directly:

- `runCli` command dispatch and result contract (`CliResult`).
- Shared typed error base (`CliError`) and exit-code mapping style.
- `ObservabilityClient` + `safeError`/`safeTrack` best-effort behavior.
- Existing deferred command test patterns for CLI flow assertions.
- Current dependency-injection style used by `create` tests (prompt/validator/writer style).

## New Adapter Capabilities Needed for `register`

When `register` is implemented, expected new ports/adapters include:

- Project state reader (read generated project metadata and manifest safely).
- Registration API client (stub + real implementation).
- Identity/owner resolution adapter.
- Optional artifact validation adapter (manifest/schema checks).

These should follow the same contract-first approach used in `create`.

## Matrix Expansion Triggers and Impact

If matrix expansion is approved (new runtimes/frameworks/services), defer command expansion should align with:

- Additional validation rules and typed errors.
- Additional layer/template resolution rules.
- Updated E2E matrix coverage budgets.
- Potential split between local-only commands and platform-backed commands.

This keeps command migration and create-matrix growth coordinated rather than diverging.
