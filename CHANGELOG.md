# Changelog

## [1.4.0] - 2026-04-08

### Phase 3 — Layer Composition and Artifact Generation

- **Deterministic scaffold composition** ([src/adapters/local-layer-resolver.ts](src/adapters/local-layer-resolver.ts), [src/ports/layer-resolver.ts](src/ports/layer-resolver.ts)): added an explicit layer resolver so `create` now applies `always`, runtime, framework, and service layers in a stable order with typed failures for missing layers, same-stage collisions, and unsafe non-config overwrites.
- **Write-safe local scaffolding** ([src/adapters/local-filesystem-writer.ts](src/adapters/local-filesystem-writer.ts), [src/ports/filesystem-writer.ts](src/ports/filesystem-writer.ts), [src/cli.ts](src/cli.ts)): moved `create` from confirmation-only output to actual project generation so the spike proves end-to-end artifact writing while rolling back partial output on unrecoverable failures.
- **Starter artifact generation** ([src/adapters/local-layer-resolver.ts](src/adapters/local-layer-resolver.ts), [src/bin.ts](src/bin.ts)): locked in Node.js and Static starter files plus shared artifacts (`README.md`, `.gitignore`, `docker-compose.dev.yml`, `Procfile`) so the supported matrix now produces runnable local scaffolds instead of placeholders.
- **Platform manifest derivation** ([src/adapters/local-platform-manifest-generator.ts](src/adapters/local-platform-manifest-generator.ts), [src/ports/platform-manifest-generator.ts](src/ports/platform-manifest-generator.ts)): generated `platform.yaml` directly from `create` selections to make the spike validate ADR-aligned stack metadata, stable service ordering, and distinct app vs static shapes.
- **Phase 3 regression coverage** ([src/adapters/local-layer-resolver.test.ts](src/adapters/local-layer-resolver.test.ts), [src/adapters/local-filesystem-writer.test.ts](src/adapters/local-filesystem-writer.test.ts), [src/adapters/local-platform-manifest-generator.test.ts](src/adapters/local-platform-manifest-generator.test.ts), [src/cli.test.ts](src/cli.test.ts)): added focused tests so future phases can expand adapters without regressing deterministic composition, rollback behavior, or manifest output.

## [1.3.0] - 2026-04-08

### Phase 2 — `universe create` Prompt Flow and Validation

- **Interactive create UX** (`src/adapters/clack-prompt-adapter.ts`, `src/cli.ts`): replaced the deferred `create` stub with an interactive-only flow so the spike can validate onboarding behavior before scaffold generation is implemented.
- **Prompt contract + ordering** (`src/ports/prompt-port.ts`, `src/adapters/clack-prompt-adapter.test.ts`): codified the prompt port and enforced the exact Name → Runtime → Framework → Databases → Platform services → Confirmation sequence to keep downstream phases deterministic.
- **Runtime-aware options** (`src/adapters/clack-prompt-adapter.ts`): filtered framework and multi-select choices by runtime so unsupported paths are prevented at selection time, reducing invalid combinations before generation logic lands.
- **Typed input validation** (`src/ports/create-input-validator.ts`, `src/adapters/default-create-input-validator.ts`): added central validation for name rules, existing-target checks, `None` exclusivity, and supported matrix enforcement to produce stable, typed error behavior ahead of artifact writing.
- **Shared CLI error base class** (`src/errors/cli-errors.ts`, `src/cli.ts`): introduced `CliError` so command handling can rely on `instanceof` rather than structural `exitCode` checks, keeping typed CLI failures explicit as more commands are implemented.
- **Validation coverage in CLI and unit tests** (`src/cli.test.ts`, `src/adapters/default-create-input-validator.test.ts`): ensured actionable feedback reaches users and that phase-locked constraints are regression-tested.
- **Matrix and static convention locks** (`design/create-supported-matrix.md`, `design/static-scaffold-convention.md`): documented the reduced spike matrix and static serving contract explicitly to prevent scope drift while Phase 3 builds layer/artifact generation.

## [1.2.0] - 2026-04-08

### Phase 1 — Command Surface + Stub Contract

- **CLI routing** (`src/cli.ts`): `runCli(argv, observability)` dispatches all 9 ADR-007 commands. Returns a `CliResult` with exit code and output string.
- **Help text**: `universe --help` lists all 9 commands with descriptions.
- **Deferred command stubs**: `register`, `deploy`, `promote`, `rollback`, `logs`, `status`, `list`, and `teardown` each exit non-zero and emit the standardized `DeferredCommandError` message.
- **CLI tests** (`src/cli.test.ts`): snapshot-verified help output; all 8 deferred commands verified to exit non-zero and contain their command name; standardized message format snapshot-locked.

## [1.1.0] - 2026-04-08

### Phase 0 — Foundations

- **Architecture note** (`plans/universe-cli/architecture.md`): documents hexagonal layer diagram, port interfaces, adapter contracts, test suite structure, and error exit code table.
- **Assumptions register** (`plans/universe-cli/assumptions-register.md`): captures spike-start assumptions, reduced-matrix decisions, and open questions.
- **Error taxonomy** (`src/errors/cli-errors.ts`): ten typed error classes (`InvalidNameError`, `TargetDirectoryExistsError`, `UnsupportedRuntimeError`, `UnsupportedFrameworkError`, `UnsupportedCombinationError`, `InvalidMultiSelectError`, `MissingLayerError`, `LayerConflictError`, `ScaffoldWriteError`, `DeferredCommandError`) each mapped to a unique exit code (1–10). Snapshot tests cover all message formats; exit-code uniqueness is verified in `cli-errors.test.ts`.
- **Standardized deferred-command contract**: `DeferredCommandError` carries a fixed message template and exit code used by all 8 non-`create` commands.
- **`ObservabilityClient` port** (`src/ports/observability-client.ts`): interface with `safeTrack` / `safeError` wrappers that swallow client errors to keep o11y best-effort.
- **`StubObservabilityClient` adapter** (`src/adapters/stub-observability-client.ts`): no-op spike implementation.
- **Spike container** (`src/container.ts`): wires stub adapters; guard test enforces that only stub classes are wired.
- **Quality gates**: scoped TypeScript `include` to `src/**/*`; 18 tests pass, lint and type-check are clean.
