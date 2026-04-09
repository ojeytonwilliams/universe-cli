# Logs Command TODO Plan (Stub Adapter)

## Phase 1 — Trivial Prototype (first working `universe logs`)

- [x] CODE: Define logs port contract and typed logs error
  - Feature: Add `LogsClient` port (request/response types) and `LogsError` in the CLI error taxonomy.
  - Acceptance:
    - `src/ports/logs-client.ts` exports a documented interface with one logs retrieval method.
    - Logs request includes normalized manifest and target environment (`preview` default in logs flow).
    - Logs response includes project `name`, `environment`, and deterministic ordered log entries.
    - `LogsError` has one stable user-facing message style and one stable exit code.

- [x] CODE: Implement stub logs adapter with deterministic behavior
  - Feature: Add `StubLogsClient` adapter that simulates log retrieval without network access.
  - Acceptance:
    - Stub returns a deterministic list of log entries for the same project/environment pair.
    - Log entries include stable timestamp, level, and message fields suitable for snapshot tests.
    - Adapter can simulate retrieval failure for explicit test fixtures (for example, sentinel project names).
    - Adapter performs no external network calls.

- [x] CODE: Promote `logs` from deferred to implemented CLI handler
  - Feature: Implement `universe logs [directory] [environment]` in `runCli` and remove `logs` from deferred command set.
  - Acceptance:
    - `logs` reads `platform.yaml` from `[directory]` or `cwd` when omitted.
    - Missing `platform.yaml` returns typed missing-manifest error path.
    - Invalid manifest returns typed manifest-invalid error with validation reason.
    - Valid manifest is passed to `LogsClient` and successful result exits `0`.
    - Success output includes project name, environment, and deterministic rendered log lines.

- [x] TASK: Wire container and dependency graph for logs
  - Acceptance:
    - `src/container.ts` exports `logsClient` wired to `StubLogsClient` in spike mode.
    - CLI dependency composition includes `logsClient` without breaking existing commands.
    - Help text and usage strings remain accurate after logs promotion.

## Phase 2 — Behavior Hardening and UX Consistency

- [x] CODE: Add logs argument validation and usage guards
  - Feature: Enforce bounded logs arguments and deterministic defaults.
  - Acceptance:
    - Command accepts `universe logs`, `universe logs [directory]`, and `universe logs [directory] [environment]`.
    - Invalid arity returns stable usage guidance and non-zero exit code.
    - Unsupported environment value returns typed unsupported-combination style error.
    - Environment defaults to `preview` when omitted.

- [x] CODE: Add non-blocking observability calls for logs flow
  - Feature: Emit logs retrieval telemetry through `ObservabilityClient` using safe wrappers.
  - Acceptance:
    - Logs request start, success, and failure are tracked with non-sensitive fields only.
    - Observability failures do not change logs result or exit code.
    - No tokens, credentials, or raw environment values are emitted in telemetry payloads.

- [x] TASK: Align logs UX copy with existing command output style
  - Acceptance:
    - Error and success copy follows existing imperative/actionable tone.
    - Logs output remains deterministic for snapshot-friendly testing.

## Phase 3 — Test Coverage, Guardrails, and Documentation

- [ ] CODE: Add unit tests for logs stub adapter and port contract behavior
  - Feature: Create `StubLogsClient` tests covering success, deterministic entries, and simulated failures.
  - Acceptance:
    - Tests verify deterministic entry ordering and stable field values.
    - Tests verify failure path raises `LogsError`.
    - Tests verify state isolation between adapter instances when applicable.

- [ ] CODE: Add CLI integration tests for logs success and error paths
  - Feature: Extend `src/cli.test.ts` logs coverage for implemented behavior.
  - Acceptance:
    - Success path validates output and exit code `0`.
    - Missing manifest path validates typed missing-manifest error exit code.
    - Invalid manifest path validates typed manifest-invalid error exit code.
    - Logs-client failure path validates typed logs error exit code.
    - Deferred-command test set excludes `logs` and still validates remaining deferred commands.

- [ ] CODE: Add E2E flow for create-then-logs and container guard
  - Feature: Add `logs.e2e` coverage and spike container guard for logs wiring.
  - Acceptance:
    - E2E test scaffolds with `create`, then successfully runs `logs` against generated `platform.yaml`.
    - E2E test covers at least one logs failure fixture with deterministic assertion.
    - Container guard test asserts `logsClient` is an instance of `StubLogsClient`.

- [ ] TASK: Update design docs and migration notes for logs promotion
  - Acceptance:
    - `design/future-command-expansion.md` marks `logs` as implemented in spike mode.
    - `design/assumptions-register.md` records logs-specific assumptions and validation outcomes.
    - Any remaining unknowns for real logs adapter migration are captured explicitly.

## Traceability Matrix

| Requirement ID | Requirement                                                                               | TODO Items                                           |
| -------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| LOG-01         | `logs` is promoted from `DeferredCommandError` to a full command handler                  | Phase 1 / Item 3                                     |
| LOG-02         | Logs reads `platform.yaml` from provided directory or `cwd` by default                    | Phase 1 / Item 3                                     |
| LOG-03         | Missing/invalid manifest paths return typed, deterministic errors                         | Phase 1 / Item 3; Phase 3 / Item 2                   |
| LOG-04         | Logs uses a stubbed port adapter (no external network calls)                              | Phase 1 / Item 1; Phase 1 / Item 2; Phase 1 / Item 4 |
| LOG-05         | Success output is deterministic and includes project, environment, and rendered log lines | Phase 1 / Item 2; Phase 1 / Item 3; Phase 2 / Item 3 |
| LOG-06         | Logs flow is observable but non-blocking and secret-safe                                  | Phase 2 / Item 2                                     |
| LOG-07         | CLI, adapter, and E2E tests cover logs success and failure paths                          | Phase 3 / Item 1; Phase 3 / Item 2; Phase 3 / Item 3 |
| LOG-08         | Spike-mode guardrail prevents accidental non-stub logs wiring                             | Phase 3 / Item 3                                     |
| LOG-09         | Logs migration assumptions and next-step unknowns are documented                          | Phase 3 / Item 4                                     |
