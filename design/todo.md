# Status Command TODO Plan (Stub Adapter)

## Phase 1 — Trivial Prototype (first working `universe status`)

- [x] CODE: Define status port contract and typed status error
  - Feature: Add `StatusClient` port (request/response types) and `StatusError` in the CLI error taxonomy.
  - Acceptance:
    - `src/ports/status-client.ts` exports a documented interface with one status retrieval method.
    - Status request includes normalized manifest and target environment (`preview` default).
    - Status response includes project `name`, `environment`, deployment `state`, and any deterministic metadata fields.
    - `StatusError` has one stable user-facing message style and one stable exit code.

- [x] CODE: Implement stub status adapter with deterministic behavior
  - Feature: Add `StubStatusClient` adapter that simulates project status retrieval without network access.
  - Acceptance:
    - Stub returns a deterministic status snapshot for the same project/environment pair.
    - Snapshot includes stable `state` and `updatedAt` fields suitable for snapshot tests.
    - Adapter can simulate retrieval failure for explicit test fixtures (for example, sentinel project names).
    - Adapter performs no external network calls.

- [x] CODE: Promote `status` from deferred to implemented CLI handler
  - Feature: Implement `universe status [directory] [environment]` in `runCli` and remove `status` from deferred command set.
  - Acceptance:
    - `status` reads `platform.yaml` from `[directory]` or `cwd` when omitted.
    - Missing `platform.yaml` returns typed missing-manifest error path.
    - Invalid manifest returns typed manifest-invalid error with validation reason.
    - Valid manifest is passed to `StatusClient`; successful result exits `0`.
    - Success output includes project name, environment, and deterministic rendered status snapshot.

- [x] TASK: Wire container and dependency graph for status
  - Acceptance:
    - `src/container.ts` exports `statusClient` wired to `StubStatusClient` in spike mode.
    - CLI dependency composition includes `statusClient` without breaking existing commands.
    - Help text and usage strings remain accurate after status promotion.

## Phase 2 — Behavior Hardening and UX Consistency

- [ ] CODE: Add status argument validation and usage guards
  - Feature: Enforce bounded status arguments and deterministic defaults.
  - Acceptance:
    - Command accepts `universe status`, `universe status [directory]`, and `universe status [directory] [environment]`.
    - Invalid arity returns stable usage guidance and non-zero exit code.
    - Unsupported environment value returns typed unsupported-combination style error.
    - Environment defaults to `preview` when omitted.

- [ ] CODE: Add non-blocking observability calls for status flow
  - Feature: Emit status retrieval telemetry through `ObservabilityClient` using safe wrappers.
  - Acceptance:
    - Status request start, success, and failure are tracked with non-sensitive fields only.
    - Observability failures do not change status result or exit code.
    - No tokens, credentials, or raw environment values are emitted in telemetry payloads.

- [ ] TASK: Align status UX copy with existing command output style
  - Acceptance:
    - Error and success copy follows existing imperative/actionable tone.
    - Status output remains deterministic for snapshot-friendly testing.

## Phase 3 — Test Coverage, Guardrails, and Documentation

- [ ] CODE: Add unit tests for status stub adapter and port contract behavior
  - Feature: Create `StubStatusClient` tests covering success, deterministic snapshots, and simulated failures.
  - Acceptance:
    - Tests verify deterministic state and metadata field values.
    - Tests verify failure path raises `StatusError`.
    - Tests verify state isolation between adapter instances when applicable.

- [ ] CODE: Add CLI integration tests for status success and error paths
  - Feature: Extend `src/cli.test.ts` status coverage for implemented behavior.
  - Acceptance:
    - Success path validates output and exit code `0`.
    - Missing manifest path validates typed missing-manifest error exit code.
    - Invalid manifest path validates typed manifest-invalid error exit code.
    - Status-client failure path validates typed status error exit code.
    - Deferred-command test set excludes `status` and still validates remaining deferred commands.

- [ ] CODE: Add E2E flow for create-then-status and container guard
  - Feature: Add `status.e2e` coverage and spike container guard for status wiring.
  - Acceptance:
    - E2E test scaffolds with `create`, then successfully runs `status` against generated `platform.yaml`.
    - E2E test covers at least one status failure fixture with deterministic assertion.
    - Container guard test asserts `statusClient` is an instance of `StubStatusClient`.

- [ ] TASK: Update design docs and migration notes for status promotion
  - Acceptance:
    - `design/future-command-expansion.md` marks `status` as implemented in spike mode.
    - `design/assumptions-register.md` records status-specific assumptions and validation outcomes.
    - Any remaining unknowns for real status adapter migration are captured explicitly.

## Traceability Matrix

| Requirement ID | Requirement                                                                                     | TODO Items                                           |
| -------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| STS-01         | `status` is promoted from `DeferredCommandError` to a full command handler                      | Phase 1 / Item 3                                     |
| STS-02         | Status reads `platform.yaml` from provided directory or `cwd` by default                        | Phase 1 / Item 3                                     |
| STS-03         | Missing/invalid manifest paths return typed, deterministic errors                               | Phase 1 / Item 3; Phase 3 / Item 2                   |
| STS-04         | Status uses a stubbed port adapter (no external network calls)                                  | Phase 1 / Item 1; Phase 1 / Item 2; Phase 1 / Item 4 |
| STS-05         | Success output is deterministic and includes project, environment, and rendered status snapshot | Phase 1 / Item 2; Phase 1 / Item 3; Phase 2 / Item 3 |
| STS-06         | Status flow is observable but non-blocking and secret-safe                                      | Phase 2 / Item 2                                     |
| STS-07         | CLI, adapter, and E2E tests cover status success and failure paths                              | Phase 3 / Item 1; Phase 3 / Item 2; Phase 3 / Item 3 |
| STS-08         | Spike-mode guardrail prevents accidental non-stub status wiring                                 | Phase 3 / Item 3                                     |
| STS-09         | Status migration assumptions and next-step unknowns are documented                              | Phase 3 / Item 4                                     |
