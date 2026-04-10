# Teardown Command TODO Plan (Stub Adapter)

## Phase 1 — Trivial Prototype (first working `universe teardown`)

## Phase 1 — Trivial Prototype (first working `universe list`)

## Phase 1 — Trivial Prototype (first working `universe teardown`)

- [ ] CODE: Define teardown port contract and typed teardown error
  - Feature: Add `TeardownClient` port (request/response types) and `TeardownError` in the CLI error taxonomy.
  - Acceptance:
    - `src/ports/teardown-client.ts` exports a documented interface with one teardown method.
    - Teardown request includes normalized manifest and target environment (`preview` default).
    - Teardown response includes project `name`, `environment`, and a deterministic result/receipt.
    - `TeardownError` has one stable user-facing message style and one stable exit code.

- [ ] CODE: Implement stub teardown adapter with deterministic behavior
  - Feature: Add `StubTeardownClient` adapter that simulates teardown without network access.
  - Acceptance:
    - Stub returns a deterministic teardown result for the same project/environment pair.
    - Result includes stable fields suitable for snapshot tests.
    - Adapter can simulate failure for explicit test fixtures (e.g., sentinel project names).
    - Adapter performs no external network calls.

- [ ] CODE: Promote `teardown` from deferred to implemented CLI handler
  - Feature: Implement `universe teardown [directory] [environment]` in `runCli` and remove `teardown` from deferred command set.
  - Acceptance:
    - `teardown` reads `platform.yaml` from `[directory]` or `cwd` when omitted.
    - Missing `platform.yaml` returns typed missing-manifest error path.
    - Invalid manifest returns typed manifest-invalid error with validation reason.
    - Valid manifest is passed to `TeardownClient`; successful result exits `0`.
    - Success output includes project name, environment, and deterministic rendered teardown result.

- [ ] TASK: Wire container and dependency graph for teardown
  - Acceptance:
    - `src/container.ts` exports `teardownClient` wired to `StubTeardownClient` in spike mode.
    - CLI dependency composition includes `teardownClient` without breaking existing commands.
    - Help text and usage strings remain accurate after teardown promotion.

## Phase 2 — Behavior Hardening and UX Consistency

- [ ] CODE: Add teardown argument validation and usage guards
  - Feature: Enforce bounded teardown arguments and deterministic defaults.
  - Acceptance:
    - Command accepts `universe teardown`, `universe teardown [directory]`, and `universe teardown [directory] [environment]`.
    - Invalid arity returns stable usage guidance and non-zero exit code.
    - Unsupported environment value returns typed unsupported-combination style error.
    - Environment defaults to `preview` when omitted.

- [ ] CODE: Add non-blocking observability calls for teardown flow
  - Feature: Emit teardown telemetry through `ObservabilityClient` using safe wrappers.
  - Acceptance:
    - Teardown request start, success, and failure are tracked with non-sensitive fields only.
    - Observability failures do not change teardown result or exit code.
    - No tokens, credentials, or raw environment values are emitted in telemetry payloads.

- [ ] TASK: Align teardown UX copy with existing command output style
  - Acceptance:
    - Error and success copy follows existing imperative/actionable tone.
    - Teardown output remains deterministic for snapshot-friendly testing.

## Phase 3 — Test Coverage, Guardrails, and Documentation

- [ ] CODE: Add unit tests for teardown stub adapter and port contract behavior
  - Feature: Create `StubTeardownClient` tests covering success, deterministic results, and simulated failures.
  - Acceptance:
    - Tests verify deterministic result field values.
    - Tests verify failure path raises `TeardownError`.
    - Tests verify state isolation between adapter instances when applicable.

- [ ] CODE: Add CLI integration tests for teardown success and error paths
  - Feature: Extend `src/cli.test.ts` teardown coverage for implemented behavior.
  - Acceptance:
    - Success path validates output and exit code `0`.
    - Missing manifest path validates typed missing-manifest error exit code.
    - Invalid manifest path validates typed manifest-invalid error exit code.
    - Teardown-client failure path validates typed teardown error exit code.
    - Deferred-command test set excludes `teardown` and still validates remaining deferred commands.

- [ ] CODE: Add E2E flow for create-then-teardown and container guard
  - Feature: Add `teardown.e2e` coverage and spike container guard for teardown wiring.
  - Acceptance:
    - E2E test scaffolds with `create`, then successfully runs `teardown` against generated `platform.yaml`.
    - E2E test covers at least one teardown failure fixture with deterministic assertion.
    - Container guard test asserts `teardownClient` is an instance of `StubTeardownClient`.

- [ ] TASK: Update design docs and migration notes for teardown promotion
  - Acceptance:
    - `design/future-command-expansion.md` marks `teardown` as implemented in spike mode.
    - `design/assumptions-register.md` records teardown-specific assumptions and validation outcomes.
    - Any remaining unknowns for real teardown adapter migration are captured explicitly.

## Traceability Matrix

| Requirement ID | Requirement                                                                            | TODO Items                                           |
| -------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| TDN-01         | `teardown` is promoted from `DeferredCommandError` to a full command handler           | Phase 1 / Item 3                                     |
| TDN-02         | Teardown reads `platform.yaml` from provided directory or `cwd` by default             | Phase 1 / Item 3                                     |
| TDN-03         | Missing/invalid manifest paths return typed, deterministic errors                      | Phase 1 / Item 3; Phase 3 / Item 2                   |
| TDN-04         | Teardown uses a stubbed port adapter (no external network calls)                       | Phase 1 / Item 1; Phase 1 / Item 2; Phase 1 / Item 4 |
| TDN-05         | Success output is deterministic and includes project, environment, and rendered result | Phase 1 / Item 2; Phase 1 / Item 3; Phase 2 / Item 3 |
| TDN-06         | Teardown flow is observable but non-blocking and secret-safe                           | Phase 2 / Item 2                                     |
| TDN-07         | CLI, adapter, and E2E tests cover teardown success and failure paths                   | Phase 3 / Item 1; Phase 3 / Item 2; Phase 3 / Item 3 |
| TDN-08         | Spike-mode guardrail prevents accidental non-stub teardown wiring                      | Phase 3 / Item 3                                     |
| TDN-09         | Teardown migration assumptions and next-step unknowns are documented                   | Phase 3 / Item 4                                     |
