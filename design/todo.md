# TODO

## Phase 1: Shared output infrastructure

- [x] TASK: Create `src/output/logger.ts` — `Logger` interface (`info`, `warn`, `success`, `error`) and `clackLogger` default wrapping `log` from `@clack/prompts`
- [x] TASK: Create `src/output/write-json.ts` — `writeJson(command, ok, data)` calling `process.stdout.write(JSON.stringify(buildEnvelope(...)) + "\n")`

## Phase 2: Migrate handlers with existing tests

- [x] CODE: Migrate `login` handler to Logger + writeJson
  - Feature: Replace any direct output / `deps.write` in `src/commands/login/index.ts` with `deps.log` (Logger) for human output and `writeJson` for JSON output; add `log: Logger` to `LoginDeps` defaulting to `clackLogger`
  - Files: `src/commands/login/index.ts`, `src/commands/login/index.test.ts`
  - Acceptance:
    - `log.success` is called with the expected message when login succeeds
    - `writeJson` is called with `("login", true, <data>)` when `--json` is passed
    - Handler returns `{ exitCode: 0 }` (no `output` field used)

- [x] CODE: Migrate `logout` handler to Logger + writeJson
  - Feature: Replace direct output in `src/commands/logout/index.ts` with `deps.log` and `writeJson`; add `log: Logger` to `LogoutDeps` defaulting to `clackLogger`
  - Files: `src/commands/logout/index.ts`, `src/commands/logout/index.test.ts`
  - Acceptance:
    - `log.success` is called with the expected message on success
    - `writeJson` is called with `("logout", true, <data>)` when `--json` is passed
    - Handler returns `{ exitCode: 0 }` (no `output` field used)

- [x] CODE: Migrate `whoami` handler to Logger + writeJson
  - Feature: Replace direct output in `src/commands/whoami/index.ts` with `deps.log` and `writeJson`; add `log: Logger` to `WhoamiDeps` defaulting to `clackLogger`
  - Files: `src/commands/whoami/index.ts`, `src/commands/whoami/index.test.ts`
  - Acceptance:
    - `log.success` is called with identity info when not using `--json`
    - `writeJson` is called with `("whoami", true, <data>)` when `--json` is passed
    - Handler returns `{ exitCode: 0 }` (no `output` field used)

- [x] CODE: Migrate `list` handler to Logger + writeJson
  - Feature: Replace direct output in `src/commands/list/index.ts` with `deps.log` and `writeJson`; add `log: Logger` to `ListDeps` defaulting to `clackLogger`
  - Files: `src/commands/list/index.ts`, `src/commands/list/index.test.ts`
  - Acceptance:
    - `log.success` is called with the deploys table when not using `--json`
    - `writeJson` is called with `("list", true, <data>)` when `--json` is passed
    - Handler returns `{ exitCode: 0 }` (no `output` field used)

- [x] CODE: Migrate `promote` handler to Logger + writeJson
  - Feature: Replace direct output in `src/commands/promote/index.ts` with `deps.log` and `writeJson`; add `log: Logger` to `PromoteDeps` defaulting to `clackLogger`
  - Files: `src/commands/promote/index.ts`, `src/commands/promote/index.test.ts`
  - Acceptance:
    - `log.success` is called with the expected message on success
    - `writeJson` is called with `("promote", true, <data>)` when `--json` is passed
    - Handler returns `{ exitCode: 0 }` (no `output` field used)

- [x] CODE: Migrate `rollback` handler to Logger + writeJson
  - Feature: Replace direct output in `src/commands/rollback/index.ts` with `deps.log` and `writeJson`; add `log: Logger` to `RollbackDeps` defaulting to `clackLogger`
  - Files: `src/commands/rollback/index.ts`, `src/commands/rollback/index.test.ts`
  - Acceptance:
    - `log.success` is called with the expected message on success
    - `writeJson` is called with `("rollback", true, <data>)` when `--json` is passed
    - Handler returns `{ exitCode: 0 }` (no `output` field used)

- [x] CODE: Migrate `deploy` handler to Logger + writeJson
  - Feature: Replace `DeployLog` with shared `Logger`, replace `deps.write` with `writeJson` in `src/commands/deploy/index.ts`; add `log: Logger` to `DeployDeps` defaulting to `clackLogger`
  - Files: `src/commands/deploy/index.ts`, `src/commands/deploy/index.test.ts`
  - Acceptance:
    - `DeployLog` interface is removed; `deps.log` is typed as `Logger`
    - `log.warn` is called when git working tree is dirty
    - `log.success` is called with the deploy summary when not using `--json`
    - `writeJson` is called with `("deploy", true, <data>)` when `--json` is passed
    - Handler returns `{ exitCode: 0 }` (no `output` field used)

## Phase 3: Migrate handlers without existing tests

- [x] TASK: Migrate `register` handler — replace `output: "Registered..."` with `log.success(...)`, add `log: Logger` to deps defaulting to `clackLogger`, return `{ exitCode: 0, output: "" }`
- [x] TASK: Migrate `logs` handler — replace `output: "Logs for..."` with `log.success(...)`, add `log: Logger` to deps defaulting to `clackLogger`, return `{ exitCode: 0, output: "" }`
- [x] TASK: Migrate `status` handler — replace `output: "Status of..."` with `log.success(...)`, add `log: Logger` to deps defaulting to `clackLogger`, return `{ exitCode: 0, output: "" }`
- [x] TASK: Migrate `teardown` handler — replace `output: "Tore down..."` with `log.success(...)`, add `log: Logger` to deps defaulting to `clackLogger`, return `{ exitCode: 0, output: "" }`
- [x] TASK: Migrate `create` handler — replace `output: "Scaffolded..."` with `log.success(...)`, add `log: Logger` to deps defaulting to `clackLogger`, return `{ exitCode: 0, output: "" }`

## Phase 4: Remove `output` from `HandlerResult`

- [x] TASK: Remove `output` from `HandlerResult` interface in `src/commands/create/index.ts` and update all return sites to `{ exitCode }` only
- [x] TASK: Remove the `output` write from `bin.ts` (`process.stdout.write(`${output}\n`)`)
- [x] TASK: Remove `output` from the return type and return sites in `dispatch.ts` that feed `bin.ts` (Commander's own `capturedOutput` path — --help, --version, errors — is separate and stays)

## Phase 5: Update tests

- [x] TASK: Update `dispatch.test.ts` — remove `result.output` assertions for handler output; add `log` stub to `createDispatchDeps`; add `log.success` assertions for phase-3 handlers
- [x] TASK: Update integration tests — add `log` stub to deps where handlers now require it

## Traceability Matrix

| Requirement ID   | TODO Item                                                                                                                           | Status |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------ |
| REQ-1            | Phase 1 / TASK: Create `src/output/logger.ts`                                                                                       | mapped |
| REQ-2            | Phase 1 / TASK: Create `src/output/write-json.ts`                                                                                   | mapped |
| REQ-3 (login)    | Phase 2 / CODE: Migrate `login` handler                                                                                             | mapped |
| REQ-3 (logout)   | Phase 2 / CODE: Migrate `logout` handler                                                                                            | mapped |
| REQ-3 (whoami)   | Phase 2 / CODE: Migrate `whoami` handler                                                                                            | mapped |
| REQ-3 (list)     | Phase 2 / CODE: Migrate `list` handler                                                                                              | mapped |
| REQ-3 (promote)  | Phase 2 / CODE: Migrate `promote` handler                                                                                           | mapped |
| REQ-3 (rollback) | Phase 2 / CODE: Migrate `rollback` handler                                                                                          | mapped |
| REQ-3 (deploy)   | Phase 2 / CODE: Migrate `deploy` handler                                                                                            | mapped |
| REQ-4 (register) | Phase 3 / TASK: Migrate `register` handler                                                                                          | mapped |
| REQ-4 (logs)     | Phase 3 / TASK: Migrate `logs` handler                                                                                              | mapped |
| REQ-4 (status)   | Phase 3 / TASK: Migrate `status` handler                                                                                            | mapped |
| REQ-4 (teardown) | Phase 3 / TASK: Migrate `teardown` handler                                                                                          | mapped |
| REQ-4 (create)   | Phase 3 / TASK: Migrate `create` handler                                                                                            | mapped |
| REQ-5            | Phase 4 / TASK: Remove `output` from `HandlerResult`                                                                                | mapped |
| REQ-6            | Phase 4 / TASK: Remove output write from `bin.ts` and `dispatch.ts`                                                                 | mapped |
| REQ-7            | Phase 5 / TASK: Update `dispatch.test.ts` and integration tests                                                                     | mapped |
| NFR-1            | Phase 1 / TASK: Create `src/output/logger.ts` (clack injectable); Phase 1 / TASK: Create `src/output/write-json.ts` (stdout direct) | mapped |
| NFR-2            | Phase 2 / CODE: all handler migrations (writeJson spy pattern)                                                                      | mapped |
