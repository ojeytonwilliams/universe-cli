# Deploy Command TODO Plan (Stub Adapter)

## Phase 1 — Trivial Prototype (first working `universe deploy`)

- [x] CODE: Define deploy port contract and typed deploy error
  - Feature: Add `DeployClient` port (request/receipt types) and `DeploymentError` in the CLI error taxonomy.
  - Acceptance:
    - `src/ports/deploy-client.ts` exports a documented interface with a single deploy method.
    - Deploy request includes normalized manifest and target environment (`preview` default).
    - Deploy receipt includes deterministic `deploymentId`, project `name`, and `environment`.
    - `DeploymentError` has one stable user-facing message style and one stable exit code.

- [x] CODE: Implement stub deploy adapter with deterministic behavior
  - Feature: Add `StubDeployClient` adapter that simulates a successful deployment without network access.
  - Acceptance:
    - First deploy for a project/environment returns `deploymentId` `stub-<name>-<environment>-1`.
    - Repeated deploys for the same project/environment increment the sequence number deterministically.
    - Adapter can simulate failure for explicit test fixtures (e.g., known sentinel project name).
    - Adapter performs no external network calls.

- [x] CODE: Promote `deploy` from deferred to implemented CLI handler
  - Feature: Implement `universe deploy [directory] [environment]` in `runCli` and remove `deploy` from deferred command set.
  - Acceptance:
    - `deploy` reads `platform.yaml` from `[directory]` or `cwd` when omitted.
    - Missing `platform.yaml` returns typed missing-manifest error path.
    - Invalid manifest returns typed manifest-invalid error with validation reason.
    - Valid manifest is passed to `DeployClient` and successful result exits `0`.
    - Success output includes project name, environment, and deployment ID.

- [x] TASK: Wire container and dependency graph for deploy
  - Acceptance:
    - `src/container.ts` exports `deployClient` wired to `StubDeployClient` in spike mode.
    - CLI dependency composition includes `deployClient` without breaking existing commands.
    - Help text and usage strings remain accurate after deploy promotion.

## Phase 2 — Behavior Hardening and UX Consistency

- [x] CODE: Add deploy argument validation and usage guards
  - Feature: Enforce bounded deploy arguments and deterministic defaults.
  - Acceptance:
    - Command accepts `universe deploy`, `universe deploy [directory]`, and `universe deploy [directory] [environment]`.
    - Invalid arity returns stable usage guidance and non-zero exit code.
    - Unsupported environment value returns typed unsupported-combination style error.
    - Environment defaults to `preview` when omitted.

- [x] CODE: Add non-blocking observability calls for deploy flow
  - Feature: Emit deploy lifecycle telemetry through `ObservabilityClient` using safe wrappers.
  - Acceptance:
    - Deploy start, success, and failure are tracked with non-sensitive fields only.
    - Observability failures do not change deploy result or exit code.
    - No tokens, credentials, or raw environment values are emitted in telemetry payloads.

- [x] TASK: Align deploy UX copy with existing command output style
  - Acceptance:
    - Error and success copy follows existing imperative/actionable tone.
    - Deploy output remains deterministic for snapshot-friendly testing.

## Phase 3 — Test Coverage, Guardrails, and Documentation

- [x] CODE: Add unit tests for deploy stub adapter and port contract behavior
  - Feature: Create `StubDeployClient` tests covering success, sequencing, and simulated failures.
  - Acceptance:
    - Tests verify deterministic deployment ID format and incrementing behavior.
    - Tests verify failure path raises `DeploymentError`.
    - Tests verify state isolation between adapter instances.

- [x] CODE: Add CLI integration tests for deploy success and error paths
  - Feature: Extend `src/cli.test.ts` deploy coverage for implemented behavior.
  - Acceptance:
    - Success path validates output and exit code `0`.
    - Missing manifest path validates typed missing-manifest error exit code.
    - Invalid manifest path validates typed manifest-invalid error exit code.
    - Deploy-client failure path validates typed deployment error exit code.
    - Deferred-command test set excludes `deploy` and still validates remaining deferred commands.

- [x] CODE: Add E2E flow for create-then-deploy and container guard
  - Feature: Add `deploy.e2e` coverage and spike container guard for deploy wiring.
  - Acceptance:
    - E2E test scaffolds with `create`, then successfully runs `deploy` against generated `platform.yaml`.
    - E2E test covers at least one deploy failure fixture with deterministic assertion.
    - Container guard test asserts `deployClient` is an instance of `StubDeployClient`.

- [x] TASK: Update design docs and migration notes for deploy promotion
  - Acceptance:
    - `design/future-command-expansion.md` marks `deploy` as implemented in spike mode.
    - `design/assumptions-register.md` records deploy-specific assumptions and validation outcomes.
    - Any remaining unknowns for real deploy adapter migration are captured explicitly.

## Traceability Matrix

| Requirement ID | Requirement                                                                    | TODO Items                                           |
| -------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------- |
| DPL-01         | `deploy` is promoted from `DeferredCommandError` to a full command handler     | Phase 1 / Item 3                                     |
| DPL-02         | Deploy reads `platform.yaml` from provided directory or `cwd` by default       | Phase 1 / Item 3                                     |
| DPL-03         | Missing/invalid manifest paths return typed, deterministic errors              | Phase 1 / Item 3; Phase 3 / Item 2                   |
| DPL-04         | Deploy uses a stubbed port adapter (no external network calls)                 | Phase 1 / Item 1; Phase 1 / Item 2; Phase 1 / Item 4 |
| DPL-05         | Success output is deterministic and includes project/environment/deployment ID | Phase 1 / Item 2; Phase 1 / Item 3; Phase 2 / Item 3 |
| DPL-06         | Deploy flow is observable but non-blocking and secret-safe                     | Phase 2 / Item 2                                     |
| DPL-07         | CLI, adapter, and E2E tests cover deploy success and failure paths             | Phase 3 / Item 1; Phase 3 / Item 2; Phase 3 / Item 3 |
| DPL-08         | Spike-mode guardrail prevents accidental non-stub deploy wiring                | Phase 3 / Item 3                                     |
| DPL-09         | Deploy migration assumptions and next-step unknowns are documented             | Phase 3 / Item 4                                     |
