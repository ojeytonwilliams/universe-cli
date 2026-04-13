# TODO

Scope note: `logs` and `status` still genuinely operate against a selected environment. The removal below applies only to `deploy`, `list`, `promote`, `rollback`, and `teardown`, where the environment is implicit in the command semantics.

## Phase 1: Remove explicit environment args from command entrypoints

- [x] CODE: Remove explicit environment parsing from the five affected handlers
  - Feature: `deploy`, `list`, `promote`, `rollback`, and `teardown` no longer parse or validate `argv[2]` as `environment`/`targetEnvironment`
  - Files: src/commands.ts
  - Acceptance:
    - Too-many-args guards change from `argv.length > 3` to `argv.length > 2` for all 5 commands
    - Usage strings become:
      - `universe deploy [directory]`
      - `universe list [directory]`
      - `universe promote [directory]`
      - `universe rollback [directory]`
      - `universe teardown [directory]`
    - `const environment = argv[2]` / `const targetEnvironment = argv[2]` lines are deleted
    - Preview/production validation blocks are deleted for those 5 commands
    - Fixed command semantics are expressed in the handler body instead of via argv:
      - `deploy` uses preview
      - `list` uses preview
      - `promote` uses production
      - `rollback` uses production
      - `teardown` does not accept an environment selector

- [x] CODE: Remove environment context wiring from CLI command definitions
  - Feature: observability for the 5 affected commands no longer includes synthetic `environment` or `targetEnvironment` context derived from argv
  - Files: src/cli.ts
  - Acceptance:
    - `context` is removed from the `deploy`, `list`, `promote`, `rollback`, and `teardown` entries in `COMMANDS`
    - `safeTrack()` receives `{}` for those commands unless handler metadata adds something else later
    - `logs` and `status` keep their existing environment context wiring

## Phase 2: Remove environment from affected port contracts end-to-end

- [x] CODE: Remove environment fields from request types
  - Feature: affected request contracts carry only the manifest because the command semantics already fix the target environment
  - Files: src/ports/deploy-client.ts, src/ports/list-client.ts, src/ports/promote-client.ts, src/ports/rollback-client.ts, src/ports/teardown-client.ts
  - Acceptance:
    - `DeployRequest`, `ListRequest`, `PromoteRequest`, `RollbackRequest`, and `TeardownRequest` are each `{ manifest: PlatformManifest }`
    - No affected handler passes `environment` or `targetEnvironment` to those clients anymore

- [x] CODE: Remove environment fields from response/receipt types
  - Feature: the implicit environment no longer flows back through the port layer either
  - Files: src/ports/deploy-client.ts, src/ports/list-client.ts, src/ports/promote-client.ts, src/ports/rollback-client.ts, src/ports/teardown-client.ts, src/commands.ts
  - Acceptance:
    - `DeployReceipt` no longer has `environment`
    - `ListResponse` no longer has `environment`
    - `PromoteReceipt`, `RollbackReceipt`, and `TeardownReceipt` no longer have `targetEnvironment`
    - Any user-facing output that still mentions preview/production is produced from fixed command semantics in `src/commands.ts`, not from adapter return values

## Phase 3: Update stub adapters to match the simplified contracts

- [x] CODE: Simplify affected stub adapters
  - Feature: stub clients stop branching on request environment/targetEnvironment because that input no longer exists
  - Files: src/adapters/stub-deploy-client.ts, src/adapters/stub-list-client.ts, src/adapters/stub-promote-client.ts, src/adapters/stub-rollback-client.ts, src/adapters/stub-teardown-client.ts
  - Acceptance:
    - Stub adapter method parameters match the new request contracts
    - Returned objects match the new receipt/response contracts
    - Per-environment counter keys are replaced with project-scoped deterministic behaviour where needed
    - Generated IDs no longer require caller-supplied environment input

- [x] CODE: Rewrite adapter unit tests for the five affected stubs
  - Feature: adapter tests assert the new implicit-environment behaviour instead of exercising environment permutations that no longer exist
  - Files: src/adapters/stub-deploy-client.test.ts, src/adapters/stub-list-client.test.ts, src/adapters/stub-promote-client.test.ts, src/adapters/stub-rollback-client.test.ts, src/adapters/stub-teardown-client.test.ts
  - Acceptance:
    - Tests no longer call the affected adapters with `environment`/`targetEnvironment`
    - Tests that assert independent counters per environment are removed or replaced with project-scoped expectations
    - Success-path assertions use the new receipt/response shapes

## Phase 4: Update command and CLI tests across all affected commands

- [x] CODE: Update shared CLI coverage for `deploy`, `promote`, and `rollback`
  - Feature: top-level command tests in `src/cli.test.ts` stop asserting removed environment argument behaviour
  - Files: src/cli.test.ts
  - Acceptance:
    - Invalid-environment tests are removed for `deploy`, `promote`, and `rollback`
    - "defaults to preview/production when omitted" tests are removed for those commands
    - Too-many-args cases become `['cmd', '/dir', 'extra']`
    - Test doubles for the affected clients use manifest-only request types and the simplified receipt/response shapes

- [x] CODE: Update dedicated CLI coverage for `list` and `teardown`
  - Feature: command-specific suites align with manifest-only requests and implicit environments
  - Files: src/cli.list.test.ts, src/cli.teardown.test.ts
  - Acceptance:
    - Invalid-environment and default-environment tests are removed
    - Too-many-args cases become `['list', '/dir', 'extra']` and `['teardown', '/dir', 'extra']`
    - Stubbed client signatures and expectations drop `environment`/`targetEnvironment`

- [x] CODE: Update observability assertions for the five affected commands
  - Feature: tests stop expecting environment context on `*.start`, `*.success`, and `*.failure` events for the simplified commands
  - Files: src/cli.test.ts, src/cli.list.test.ts, src/cli.teardown.test.ts
  - Acceptance:
    - No test asserts `environment`/`targetEnvironment` context for `deploy`, `list`, `promote`, `rollback`, or `teardown`
    - Existing `logs` and `status` observability coverage remains intact

## Phase 5: Check integration coverage and finish validation

- [x] CODE: Review integration coverage for the five affected commands
  - Feature: end-to-end tests continue to cover the commands after the environment argument is removed from the public surface and adapter contracts
  - Files: src/integration-tests/deploy.test.ts, src/integration-tests/list.test.ts, src/integration-tests/promote.test.ts, src/integration-tests/rollback.test.ts, src/integration-tests/teardown.test.ts, src/integration-tests/adapter-stubs.ts
  - Acceptance:
    - Integration helpers compile against the new port contracts
    - No integration test invokes the affected commands with an environment argument
    - Output assertions still reflect the intended fixed semantics where appropriate

- [x] TASK: Run validation after the refactor
  - Acceptance:
    - `pnpm test` passes
    - `pnpm lint` passes
    - `pnpm check` passes
