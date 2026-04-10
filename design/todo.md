# List Command TODO Plan (Stub Adapter)

## Phase 1 — Trivial Prototype (first working `universe list`)

## Phase 1 — Trivial Prototype (first working `universe list`)

- [ ] CODE: Define list port contract and typed list error
  - Feature: Add `ListClient` port (request/response types) and `ListError` in the CLI error taxonomy.
  - Acceptance:
    - `src/ports/list-client.ts` exports a documented interface with one list retrieval method.
    - List request includes normalized manifest and target environment (`preview` default).
    - List response includes project `name`, `environment`, and a deterministic ordered list of deployments or resources.
    - `ListError` has one stable user-facing message style and one stable exit code.

- [ ] CODE: Implement stub list adapter with deterministic behavior
  - Feature: Add `StubListClient` adapter that simulates project listing without network access.
  - Acceptance:
    - Stub returns a deterministic list of deployments/resources for the same project/environment pair.
    - List entries include stable fields suitable for snapshot tests.
    - Adapter can simulate retrieval failure for explicit test fixtures (for example, sentinel project names).
    - Adapter performs no external network calls.

- [ ] CODE: Promote `list` from deferred to implemented CLI handler
  - Feature: Implement `universe list [directory] [environment]` in `runCli` and remove `list` from deferred command set.
  - Acceptance:
    - `list` reads `platform.yaml` from `[directory]` or `cwd` when omitted.
    - Missing `platform.yaml` returns typed missing-manifest error path.
    - Invalid manifest returns typed manifest-invalid error with validation reason.
    - Valid manifest is passed to `ListClient`; successful result exits `0`.
    - Success output includes project name, environment, and deterministic rendered list output.

- [ ] TASK: Wire container and dependency graph for list
  - Acceptance:
    - `src/container.ts` exports `listClient` wired to `StubListClient` in spike mode.
    - CLI dependency composition includes `listClient` without breaking existing commands.
    - Help text and usage strings remain accurate after list promotion.

## Phase 2 — Behavior Hardening and UX Consistency

- [ ] CODE: Add list argument validation and usage guards
  - Feature: Enforce bounded list arguments and deterministic defaults.
  - Acceptance:
    - Command accepts `universe list`, `universe list [directory]`, and `universe list [directory] [environment]`.
    - Invalid arity returns stable usage guidance and non-zero exit code.
    - Unsupported environment value returns typed unsupported-combination style error.
    - Environment defaults to `preview` when omitted.

- [ ] CODE: Add non-blocking observability calls for list flow
  - Feature: Emit list retrieval telemetry through `ObservabilityClient` using safe wrappers.
  - Acceptance:
    - List request start, success, and failure are tracked with non-sensitive fields only.
    - Observability failures do not change list result or exit code.
    - No tokens, credentials, or raw environment values are emitted in telemetry payloads.

- [ ] TASK: Align list UX copy with existing command output style
  - Acceptance:
    - Error and success copy follows existing imperative/actionable tone.
    - List output remains deterministic for snapshot-friendly testing.

## Phase 3 — Test Coverage, Guardrails, and Documentation

- [ ] CODE: Add unit tests for list stub adapter and port contract behavior
  - Feature: Create `StubListClient` tests covering success, deterministic entries, and simulated failures.
  - Acceptance:
    - Tests verify deterministic entry ordering and stable field values.
    - Tests verify failure path raises `ListError`.
    - Tests verify state isolation between adapter instances when applicable.

- [ ] CODE: Add CLI integration tests for list success and error paths
  - Feature: Extend `src/cli.test.ts` list coverage for implemented behavior.
  - Acceptance:
    - Success path validates output and exit code `0`.
    - Missing manifest path validates typed missing-manifest error exit code.
    - Invalid manifest path validates typed manifest-invalid error exit code.
    - List-client failure path validates typed list error exit code.
    - Deferred-command test set excludes `list` and still validates remaining deferred commands.

- [ ] CODE: Add E2E flow for create-then-list and container guard
  - Feature: Add `list.e2e` coverage and spike container guard for list wiring.
  - Acceptance:
    - E2E test scaffolds with `create`, then successfully runs `list` against generated `platform.yaml`.
    - E2E test covers at least one list failure fixture with deterministic assertion.
    - Container guard test asserts `listClient` is an instance of `StubListClient`.

- [ ] TASK: Update design docs and migration notes for list promotion
  - Acceptance:
    - `design/future-command-expansion.md` marks `list` as implemented in spike mode.
    - `design/assumptions-register.md` records list-specific assumptions and validation outcomes.
    - Any remaining unknowns for real list adapter migration are captured explicitly.

## Traceability Matrix

| Requirement ID | Requirement                                                                                 | TODO Items                                           |
| -------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| LST-01         | `list` is promoted from `DeferredCommandError` to a full command handler                    | Phase 1 / Item 3                                     |
| LST-02         | List reads `platform.yaml` from provided directory or `cwd` by default                      | Phase 1 / Item 3                                     |
| LST-03         | Missing/invalid manifest paths return typed, deterministic errors                           | Phase 1 / Item 3; Phase 3 / Item 2                   |
| LST-04         | List uses a stubbed port adapter (no external network calls)                                | Phase 1 / Item 1; Phase 1 / Item 2; Phase 1 / Item 4 |
| LST-05         | Success output is deterministic and includes project, environment, and rendered list output | Phase 1 / Item 2; Phase 1 / Item 3; Phase 2 / Item 3 |
| LST-06         | List flow is observable but non-blocking and secret-safe                                    | Phase 2 / Item 2                                     |
| LST-07         | CLI, adapter, and E2E tests cover list success and failure paths                            | Phase 3 / Item 1; Phase 3 / Item 2; Phase 3 / Item 3 |
| LST-08         | Spike-mode guardrail prevents accidental non-stub list wiring                               | Phase 3 / Item 3                                     |
| LST-09         | List migration assumptions and next-step unknowns are documented                            | Phase 3 / Item 4                                     |
