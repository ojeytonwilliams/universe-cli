# Rollback Command TODO Plan (Stub Adapter)

## Phase 1 — Trivial Prototype (first working `universe rollback`)

- [x] CODE: Define rollback port contract and typed rollback error
  - Feature: Add `RollbackClient` port (request/receipt types) and `RollbackError` in the CLI error taxonomy.
  - Acceptance:
    - `src/ports/rollback-client.ts` exports a documented interface with one rollback method.
    - Rollback request includes normalized manifest and target environment (`production` default in rollback flow).
    - Rollback receipt includes deterministic `rollbackId`, project `name`, and `targetEnvironment`.
    - `RollbackError` has one stable user-facing message style and one stable exit code.

- [x] CODE: Implement stub rollback adapter with deterministic behavior
  - Feature: Add `StubRollbackClient` adapter that simulates a successful rollback without network access.
  - Acceptance:
    - First rollback for a project/target returns `rollbackId` `stub-rollback-<name>-<target>-1`.
    - Repeated rollbacks for the same project/target increment sequence deterministically.
    - Adapter can simulate rollback failure for explicit test fixtures (for example, sentinel project names).
    - Adapter performs no external network calls.

- [x] CODE: Promote `rollback` from deferred to implemented CLI handler
  - Feature: Implement `universe rollback [directory] [target-environment]` in `runCli` and remove `rollback` from deferred command set.
  - Acceptance:
    - `rollback` reads `platform.yaml` from `[directory]` or `cwd` when omitted.
    - Missing `platform.yaml` returns typed missing-manifest error path.
    - Invalid manifest returns typed manifest-invalid error with validation reason.
    - Valid manifest is passed to `RollbackClient` and successful result exits `0`.
    - Success output includes project name, target environment, and rollback ID.

- [x] TASK: Wire container and dependency graph for rollback
  - Acceptance:
    - `src/container.ts` exports `rollbackClient` wired to `StubRollbackClient` in spike mode.
    - CLI dependency composition includes `rollbackClient` without breaking existing commands.
    - Help text and usage strings remain accurate after rollback promotion.

## Phase 2 — Behavior Hardening and UX Consistency

- [x] CODE: Add rollback argument validation and usage guards
  - Feature: Enforce bounded rollback arguments and deterministic defaults.
  - Acceptance:
    - Command accepts `universe rollback`, `universe rollback [directory]`, and `universe rollback [directory] [target-environment]`.
    - Invalid arity returns stable usage guidance and non-zero exit code.
    - Unsupported target environment returns typed unsupported-combination style error.
    - Target environment defaults to `production` when omitted.

- [x] CODE: Add non-blocking observability calls for rollback flow
  - Feature: Emit rollback lifecycle telemetry through `ObservabilityClient` using safe wrappers.
  - Acceptance:
    - Rollback start, success, and failure are tracked with non-sensitive fields only.
    - Observability failures do not change rollback result or exit code.
    - No tokens, credentials, or raw environment values are emitted in telemetry payloads.

- [x] TASK: Align rollback UX copy with existing command output style
  - Acceptance:
    - Error and success copy follows existing imperative/actionable tone.
    - Rollback output remains deterministic for snapshot-friendly testing.

## Phase 3 — Test Coverage, Guardrails, and Documentation

- [x] CODE: Add unit tests for rollback stub adapter and port contract behavior
  - Feature: Create `StubRollbackClient` tests covering success, sequencing, and simulated failures.
  - Acceptance:
    - Tests verify deterministic rollback ID format and incrementing behavior.
    - Tests verify failure path raises `RollbackError`.
    - Tests verify state isolation between adapter instances.

- [x] CODE: Add CLI integration tests for rollback success and error paths
  - Feature: Extend `src/cli.test.ts` rollback coverage for implemented behavior.
  - Acceptance:
    - Success path validates output and exit code `0`.
    - Missing manifest path validates typed missing-manifest error exit code.
    - Invalid manifest path validates typed manifest-invalid error exit code.
    - Rollback-client failure path validates typed rollback error exit code.
    - Deferred-command test set excludes `rollback` and still validates remaining deferred commands.

- [x] CODE: Add E2E flow for create-then-rollback and container guard
  - Feature: Add `rollback.e2e` coverage and spike container guard for rollback wiring.
  - Acceptance:
    - E2E test scaffolds with `create`, then successfully runs `rollback` against generated `platform.yaml`.
    - E2E test covers at least one rollback failure fixture with deterministic assertion.
    - Container guard test asserts `rollbackClient` is an instance of `StubRollbackClient`.

- [x] TASK: Update design docs and migration notes for rollback promotion
  - Acceptance:
    - `design/future-command-expansion.md` marks `rollback` as implemented in spike mode.
    - `design/assumptions-register.md` records rollback-specific assumptions and validation outcomes.
    - Any remaining unknowns for real rollback adapter migration are captured explicitly.

## Traceability Matrix

| Requirement ID | Requirement                                                                         | TODO Items                                           |
| -------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------- |
| RLB-01         | `rollback` is promoted from `DeferredCommandError` to a full command handler        | Phase 1 / Item 3                                     |
| RLB-02         | Rollback reads `platform.yaml` from provided directory or `cwd` by default          | Phase 1 / Item 3                                     |
| RLB-03         | Missing/invalid manifest paths return typed, deterministic errors                   | Phase 1 / Item 3; Phase 3 / Item 2                   |
| RLB-04         | Rollback uses a stubbed port adapter (no external network calls)                    | Phase 1 / Item 1; Phase 1 / Item 2; Phase 1 / Item 4 |
| RLB-05         | Success output is deterministic and includes project/target environment/rollback ID | Phase 1 / Item 2; Phase 1 / Item 3; Phase 2 / Item 3 |
| RLB-06         | Rollback flow is observable but non-blocking and secret-safe                        | Phase 2 / Item 2                                     |
| RLB-07         | CLI, adapter, and E2E tests cover rollback success and failure paths                | Phase 3 / Item 1; Phase 3 / Item 2; Phase 3 / Item 3 |
| RLB-08         | Spike-mode guardrail prevents accidental non-stub rollback wiring                   | Phase 3 / Item 3                                     |
| RLB-09         | Rollback migration assumptions and next-step unknowns are documented                | Phase 3 / Item 4                                     |
