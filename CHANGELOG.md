# Changelog

## [2.2.0] - 2026-04-09

### Phase 2 — YAML Config Serialisation

- **YAML parse and serialise in `LayerCompositionService`** ([src/services/layer-composition-service.ts](src/services/layer-composition-service.ts)): `.yaml`/`.yml` config files are now parsed with the `yaml` library instead of `JSON.parse`, and `stringifyConfig` emits valid human-readable YAML for those paths; JSON round-trip behavior is unchanged.
- **YAML serialisation tests** ([src/services/layer-composition-service.test.ts](src/services/layer-composition-service.test.ts)): added four cases covering YAML-only merge, `.yml` merge, JSON-only round-trip preservation, and combined JSON+YAML layer resolution.

## [2.1.0] - 2026-04-09

### Phase 1 — E2E Test Strategy Refactor

- **Combination coverage at unit level** ([src/services/layer-composition-service.test.ts](src/services/layer-composition-service.test.ts)): added 65 parameterised tests covering every allowed runtime/framework/database/service combination; each asserts resolved layer names against a computed expectation using the default registry with no filesystem I/O.
- **Replaced exhaustive e2e power-set loop with smoke tests** ([src/create.e2e.test.ts](src/create.e2e.test.ts)): removed the 65-combination loop and its helpers; added three representative e2e paths (Node.js + Express + all services, Node.js + no framework/services, Static) to keep integration coverage meaningful without CI cost.

## [2.0.0] - 2026-04-09

### Refactor Phase 5 — Simplify Composition and Contracts

- **Updated `CliDependencies` to use inline structural types for services** ([src/cli.ts](src/cli.ts)): replaced port interface imports (`CreateInputValidator`, `LayerResolver`, `PlatformManifestGenerator`) with minimal inline types that express only what the CLI needs from each service; `PromptPort`, `FilesystemWriter`, and `ObservabilityClient` remain as explicit port imports.
- **Removed port interface type annotations from CLI tests** ([src/cli.test.ts](src/cli.test.ts)): test doubles now carry explicit parameter types without referencing the deleted port interfaces; `ResolvedLayerSet` is imported from the service that owns it.
- **Deleted the three obsolete port interfaces** (`src/ports/create-input-validator.ts`, `src/ports/layer-resolver.ts`, `src/ports/platform-manifest-generator.ts`): only true external-boundary ports remain in `src/ports/`.

## [1.9.0] - 2026-04-09

### Refactor Phase 4 — Move `LocalPlatformManifestGenerator` into `src/services`

- **Created `PlatformManifestService`** ([src/services/platform-manifest-service.ts](src/services/platform-manifest-service.ts)): moved runtime-specific manifest construction out of `src/adapters/` into `src/services/` where pure application logic belongs.
- **Deleted `LocalPlatformManifestGenerator`** (`src/adapters/local-platform-manifest-generator.ts`): removed the misclassified adapter and its test; all coverage now lives alongside the service.
- **Updated entry point and E2E wiring** ([src/bin.ts](src/bin.ts), [src/create.e2e.test.ts](src/create.e2e.test.ts)): replaced adapter import with service import at all call sites.
- **Aligned future manifest work** ([design/further-work/create.md](design/further-work/create.md), [design/summary.md](design/summary.md), [design/prd.md](design/prd.md)): `PlatformManifestGenerator` removed from port lists; `PlatformManifestService` recorded as internal service; schema validation and serialisation noted as service-level additions, not new adapter boundaries.

## [1.8.0] - 2026-04-09

### Refactor Phase 3 — Move `LocalLayerResolver` into `src/services`

- **Created `LayerCompositionService`** ([src/services/layer-composition-service.ts](src/services/layer-composition-service.ts)): moved layer ordering, conflict detection, config merging, and the default layer registry out of `src/adapters/` into `src/services/`; `ResolvedLayer` and `ResolvedLayerSet` types are now owned by this service.
- **Deleted `LocalLayerResolver`** (`src/adapters/local-layer-resolver.ts`): removed the misclassified adapter and its test; all coverage now lives alongside the service.
- **Updated entry point, E2E wiring** ([src/bin.ts](src/bin.ts), [src/create.e2e.test.ts](src/create.e2e.test.ts)): replaced adapter import with service import at all call sites; `LayerRegistry` type also imported from the service.
- **Recorded layer registry as internal data** ([design/summary.md](design/summary.md), [design/prd.md](design/prd.md)): `LayerResolver` removed from port lists; `LayerCompositionService` recorded as an internal service that owns the registry; future template/serialisation work noted as extending the service, not adding a new adapter boundary.

## [1.7.0] - 2026-04-09

### Refactor Phase 2 — Move `DefaultCreateInputValidator` into `src/services`

- **Created `CreateInputValidationService`** ([src/services/create-input-validation-service.ts](src/services/create-input-validation-service.ts)): moved create-name rules and runtime/framework/services compatibility checks out of `src/adapters/` into `src/services/` where pure application logic belongs.
- **Deleted `DefaultCreateInputValidator`** (`src/adapters/default-create-input-validator.ts`): removed the misclassified adapter and its test; all coverage now lives alongside the service.
- **Updated entry point and E2E wiring** ([src/bin.ts](src/bin.ts), [src/create.e2e.test.ts](src/create.e2e.test.ts)): replaced adapter import with service import at all call sites.
- **Removed adapter framing from design docs** ([design/summary.md](design/summary.md), [design/prd.md](design/prd.md)): `CreateInputValidator` removed from port lists; `CreateInputValidationService` recorded as an internal service.

## [1.6.0] - 2026-04-09

### Refactor Phase 1 — Refactor Plan and Target Boundaries

- **Reclassified three misplaced adapters as internal services** ([plans/universe-cli/architecture.md](plans/universe-cli/architecture.md)): documented that `DefaultCreateInputValidator`, `LocalLayerResolver`, and `LocalPlatformManifestGenerator` contain pure create-flow policy and belong in `src/services/`, not in `src/adapters/` behind port interfaces.
- **Fixed port boundary** ([plans/universe-cli/architecture.md](plans/universe-cli/architecture.md)): confirmed that `PromptPort`, `FilesystemWriter`, and `ObservabilityClient` are the only true external boundaries; the three validator/resolver/generator port interfaces will be deleted.
- **Recorded migration strategy** ([plans/universe-cli/architecture.md](plans/universe-cli/architecture.md)): one-pass import updates per class with no compatibility re-exports; migration points identified as `src/bin.ts`, `src/cli.ts` (`CliDependencies`), and affected test files.

## [1.5.0] - 2026-04-08

### Phase 4 — Tests, Documentation, and Migration Notes

- **Expanded create E2E coverage** ([src/create.e2e.test.ts](src/create.e2e.test.ts)): added a matrix-wide `create` flow test so every allowed runtime/framework/services combination is exercised end-to-end and verified to scaffold successfully.
- **Locked scaffold output snapshots** ([src/create.e2e.test.ts](src/create.e2e.test.ts)): added explicit Node.js and Static generated-file snapshots to make artifact regressions visible as future adapters and templates evolve.
- **Added conflict behavior E2E checks** ([src/create.e2e.test.ts](src/create.e2e.test.ts)): added end-to-end assertions for config merge overwrite behavior and non-config collision failures to protect deterministic layer-composition guarantees.
- **Covered remaining spike command flows** ([src/create.e2e.test.ts](src/create.e2e.test.ts)): validated all 8 deferred commands plus create validation/conflict failures in one integration-oriented suite to close the Phase 4 command-flow gate.
- **Documented create assumptions and unknowns** ([plans/universe-cli/assumptions-register.md](plans/universe-cli/assumptions-register.md)): tracked assumptions and open questions that arose implementing `universe create`.
- **Defined deferred-command migration notes** ([design/future-command-expansion.md](design/future-command-expansion.md)): documented how stubbed commands evolve from the shared deferred contract and what shared infrastructure can be reused when `register` is implemented.

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
