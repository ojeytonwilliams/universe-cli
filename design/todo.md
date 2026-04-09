# Promote Command TODO Plan (Stub Adapter)

## Phase 1 — Trivial Prototype (first working `universe promote`)

- [x] CODE: Define promote port contract and typed promote error
  - Feature: Add `PromoteClient` port (request/receipt types) and `PromotionError` in the CLI error taxonomy.
  - Acceptance:
    - `src/ports/promote-client.ts` exports a documented interface with one promote method.
    - Promote request includes normalized manifest and target environment (`production` default in promote flow).
    - Promote receipt includes deterministic `promotionId`, project `name`, and `targetEnvironment`.
    - `PromotionError` has one stable user-facing message style and one stable exit code.

- [x] CODE: Implement stub promote adapter with deterministic behavior
  - Feature: Add `StubPromoteClient` adapter that simulates a successful promotion without network access.
  - Acceptance:
    - First promotion for a project/target returns `promotionId` `stub-promote-<name>-<target>-1`.
    - Repeated promotions for the same project/target increment sequence deterministically.
    - Adapter can simulate promotion failure for explicit test fixtures (for example, sentinel project names).
    - Adapter performs no external network calls.

- [x] CODE: Promote `promote` from deferred to implemented CLI handler
  - Feature: Implement `universe promote [directory] [target-environment]` in `runCli` and remove `promote` from deferred command set.
  - Acceptance:
    - `promote` reads `platform.yaml` from `[directory]` or `cwd` when omitted.
    - Missing `platform.yaml` returns typed missing-manifest error path.
    - Invalid manifest returns typed manifest-invalid error with validation reason.
    - Valid manifest is passed to `PromoteClient` and successful result exits `0`.
    - Success output includes project name, target environment, and promotion ID.

- [x] TASK: Wire container and dependency graph for promote
  - Acceptance:
    - `src/container.ts` exports `promoteClient` wired to `StubPromoteClient` in spike mode.
    - CLI dependency composition includes `promoteClient` without breaking existing commands.
    - Help text and usage strings remain accurate after promote promotion.

## Phase 2 — Behavior Hardening and UX Consistency

- [ ] CODE: Add promote argument validation and usage guards
  - Feature: Enforce bounded promote arguments and deterministic defaults.
  - Acceptance:
    - Command accepts `universe promote`, `universe promote [directory]`, and `universe promote [directory] [target-environment]`.
    - Invalid arity returns stable usage guidance and non-zero exit code.
    - Unsupported target environment returns typed unsupported-combination style error.
    - Target environment defaults to `production` when omitted.

- [ ] CODE: Add non-blocking observability calls for promote flow
  - Feature: Emit promote lifecycle telemetry through `ObservabilityClient` using safe wrappers.
  - Acceptance:
    - Promote start, success, and failure are tracked with non-sensitive fields only.
    - Observability failures do not change promote result or exit code.
    - No tokens, credentials, or raw environment values are emitted in telemetry payloads.

- [ ] TASK: Align promote UX copy with existing command output style
  - Acceptance:
    - Error and success copy follows existing imperative/actionable tone.
    - Promote output remains deterministic for snapshot-friendly testing.

## Phase 3 — Test Coverage, Guardrails, and Documentation

- [ ] CODE: Add unit tests for promote stub adapter and port contract behavior
  - Feature: Create `StubPromoteClient` tests covering success, sequencing, and simulated failures.
  - Acceptance:
    - Tests verify deterministic promotion ID format and incrementing behavior.
    - Tests verify failure path raises `PromotionError`.
    - Tests verify state isolation between adapter instances.

- [ ] CODE: Add CLI integration tests for promote success and error paths
  - Feature: Extend `src/cli.test.ts` promote coverage for implemented behavior.
  - Acceptance:
    - Success path validates output and exit code `0`.
    - Missing manifest path validates typed missing-manifest error exit code.
    - Invalid manifest path validates typed manifest-invalid error exit code.
    - Promote-client failure path validates typed promotion error exit code.
    - Deferred-command test set excludes `promote` and still validates remaining deferred commands.

- [ ] CODE: Add E2E flow for create-then-promote and container guard
  - Feature: Add `promote.e2e` coverage and spike container guard for promote wiring.
  - Acceptance:
    - E2E test scaffolds with `create`, then successfully runs `promote` against generated `platform.yaml`.
    - E2E test covers at least one promote failure fixture with deterministic assertion.
    - Container guard test asserts `promoteClient` is an instance of `StubPromoteClient`.

- [ ] TASK: Update design docs and migration notes for promote promotion
  - Acceptance:
    - `design/future-command-expansion.md` marks `promote` as implemented in spike mode.
    - `design/assumptions-register.md` records promote-specific assumptions and validation outcomes.
    - Any remaining unknowns for real promote adapter migration are captured explicitly.

## Traceability Matrix

| Requirement ID | Requirement                                                                          | TODO Items                                           |
| -------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| PRM-01         | `promote` is promoted from `DeferredCommandError` to a full command handler          | Phase 1 / Item 3                                     |
| PRM-02         | Promote reads `platform.yaml` from provided directory or `cwd` by default            | Phase 1 / Item 3                                     |
| PRM-03         | Missing/invalid manifest paths return typed, deterministic errors                    | Phase 1 / Item 3; Phase 3 / Item 2                   |
| PRM-04         | Promote uses a stubbed port adapter (no external network calls)                      | Phase 1 / Item 1; Phase 1 / Item 2; Phase 1 / Item 4 |
| PRM-05         | Success output is deterministic and includes project/target environment/promotion ID | Phase 1 / Item 2; Phase 1 / Item 3; Phase 2 / Item 3 |
| PRM-06         | Promote flow is observable but non-blocking and secret-safe                          | Phase 2 / Item 2                                     |
| PRM-07         | CLI, adapter, and E2E tests cover promote success and failure paths                  | Phase 3 / Item 1; Phase 3 / Item 2; Phase 3 / Item 3 |
| PRM-08         | Spike-mode guardrail prevents accidental non-stub promote wiring                     | Phase 3 / Item 3                                     |
| PRM-09         | Promote migration assumptions and next-step unknowns are documented                  | Phase 3 / Item 4                                     |
