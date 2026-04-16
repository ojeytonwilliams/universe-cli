# TODO — CLI Layer Responsibility Refactor

Requirements reference: `design/prd.md`

---

## Phase 1 — Flatten `commands.ts` deps

- [x] CODE: Remove `services`/`adapters` nesting from handler signatures in `commands.ts`
  - Feature: Replace nested `{ services: { ... }, adapters: { ... } }` dep objects with a flat inline type per handler; no shared `Deps` interface is introduced
  - Files:
    - `src/commands.ts` — remove `Services` and `Adapters` interfaces; update all nine handler signatures and `readAndValidateManifest` to declare a flat inline dep type (e.g. `{ platformManifestGenerator: PlatformManifestGenerator; deployClient: DeployClient; projectReader: ProjectReaderPort }`) using only the members each handler actually needs; keep `HandlerResult` and `CliResult` as exports
  - Acceptance:
    - `Services` and `Adapters` interfaces are removed from `commands.ts`
    - No shared merged `Deps` interface is introduced
    - Every handler and `readAndValidateManifest` declares its own flat inline dep type with no `services:` or `adapters:` nesting
    - `bin.ts` still compiles — it constructs and passes a flat object satisfying each handler's inline dep type

- [x] CODE: Update `commands.test.ts` dep construction to flat shape
  - Feature: Remove `services:` / `adapters:` nesting from all dep objects constructed in `commands.test.ts`
  - Files:
    - `src/commands.test.ts` — flatten all `{ services: { ... }, adapters: { ... } }` literals into a single flat object
  - Acceptance:
    - All `commands.test.ts` tests pass without modification to assertions
    - No `services:` or `adapters:` keys appear in dep object literals in the file

- [x] CODE: Update integration test dep construction to flat shape
  - Feature: Remove `services:` / `adapters:` nesting from dep objects in all integration tests
  - Files:
    - `src/integration-tests/create.test.ts`
    - `src/integration-tests/deploy.test.ts`
    - `src/integration-tests/list.test.ts`
    - `src/integration-tests/logs.test.ts`
    - `src/integration-tests/promote.test.ts`
    - `src/integration-tests/register.test.ts`
    - `src/integration-tests/rollback.test.ts`
    - `src/integration-tests/status.test.ts`
    - `src/integration-tests/teardown.test.ts`
  - Acceptance:
    - All integration tests pass without modification to assertions
    - No `services:` or `adapters:` keys appear in dep object literals in any of these files

- [x] TASK: Validation gate — Phase 1
  - `pnpm test` passes
  - `pnpm lint` passes
  - `pnpm check` passes

---

## Phase 2 — Move routing and validation to `bin.ts`; slim `runCli`

- [ ] CODE: Extract routing, validation, and help into a testable `route` function; update `runCli` signature
  - Feature: `bin.ts` owns all argv parsing, `--help` handling, unknown-command detection, and per-command arg validation. `runCli` is reduced to a three-argument observability wrapper `(command, handler, observability)`. A named `route` function (exported for testing) encapsulates the dispatch logic so tests do not require a live process.
  - Files:
    - `src/bin.ts` — add exported `route(argv, deps, observability)` function containing: `--help`/`-h`/no-command branch (prints `HELP_TEXT`, returns `CliResult` directly), unknown-command branch (returns `BadArgumentsError` result directly), per-command arg-count and env-value validation (throws `BadArgumentsError` on failure), thunk binding (closes over deps), and call to `runCli(command, thunk, observability)`; top-level script calls `route(process.argv.slice(2), deps, observability)` and writes output
    - `src/cli.ts` — replace `CliDependencies`, `CommandDef`, `CommandHandler`, `COMMANDS`, and the `argv`-based switch with the slimmed signature: `runCli(command: string, handler: () => Promise<HandlerResult>, observability: ObservabilityClient): Promise<CliResult>`; body calls `observability.safeTrack(start)`, awaits `handler()`, tracks success/failure, rethrows unknown errors; remove all imports of `Services`, `Adapters`, `BadArgumentsError`, `handleCreate`, etc.
    - `src/cli.test.ts` — restructure: (a) tests for `--help`, unknown commands, and per-command bad-arg validation now call `route` instead of `runCli`; (b) observability tracking tests call `runCli` directly with a pre-bound stub thunk; (c) remove the `CliDependencies`-shaped `createDeps` helper; add a minimal `createDeps` that returns the three arguments `runCli` now expects
  - Acceptance:
    - `runCli` signature is `(command: string, handler: () => Promise<HandlerResult>, observability: ObservabilityClient) => Promise<CliResult>`
    - `cli.ts` imports only `ObservabilityClient` (port) and `HandlerResult`/`CliResult` (from `commands.ts`); zero imports of `Services`, `Adapters`, `BadArgumentsError`, or any command handler
    - `--help` and `-h` and no-argument invocation return exit code 0 and the full help text without calling `runCli`
    - Unknown command returns exit code matching `BadArgumentsError.exitCode` and an appropriate message without calling `runCli`
    - Per-command over-argument calls (e.g. `deploy /dir extra`) return the expected `BadArgumentsError` message and exit code without calling `runCli`
    - Invalid env-value calls (e.g. `logs /dir staging`) return the expected `BadArgumentsError` message and exit code without calling `runCli`
    - Observability is tracked only for commands that reach `runCli`; no observability calls occur for help, unknown-command, or bad-arg branches
    - All previously passing `cli.test.ts` assertions continue to pass under the restructured tests

- [ ] TASK: Validation gate — Phase 2
  - `pnpm test` passes
  - `pnpm lint` passes
  - `pnpm check` passes

---

## Traceability Matrix

| Requirement ID                                       | TODO Item                                                                | Status |
| ---------------------------------------------------- | ------------------------------------------------------------------------ | ------ |
| Goal: flat deps in commands.ts                       | Phase 1 / CODE: Remove services/adapters nesting from handler signatures | mapped |
| Goal: flat deps — test updates                       | Phase 1 / CODE: Update commands.test.ts dep construction                 | mapped |
| Goal: flat deps — test updates                       | Phase 1 / CODE: Update integration test dep construction                 | mapped |
| Goal: bin.ts owns argv/routing/validation            | Phase 2 / CODE: Extract route function; update runCli signature          | mapped |
| Goal: runCli has no argv/Services/Adapters knowledge | Phase 2 / CODE: Extract route function; update runCli signature          | mapped |
| Goal: --help handled in bin.ts only                  | Phase 2 / CODE: Extract route function; update runCli signature          | mapped |
| Goal: observability only on real command execution   | Phase 2 / CODE: Extract route function; update runCli signature          | mapped |
| Constraint: existing tests must continue to pass     | Phase 1 / TASK: Validation gate                                          | mapped |
| Constraint: existing tests must continue to pass     | Phase 2 / TASK: Validation gate                                          | mapped |
