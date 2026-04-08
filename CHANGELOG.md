# Changelog

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
