# TODO — `universe register`

`register` is the first command to go through the contract-first, stub-backed cycle after
`create`. Port contract definition is the implementation gate (FR-12): no adapter or
command code is written until the contracts for `ProjectReaderPort` and
`RegistrationClient` are agreed.

## Phase 1: Contract definition (implementation gate)

- [x] TASK: Define `ProjectReaderPort` contract
  - Files: `src/ports/project-reader.ts`
  - Acceptance:
    - Interface declares `readFile(filePath: string): Promise<string>`.
    - Throws `ManifestNotFoundError` when the file does not exist; any other filesystem error propagates as-is.
    - File contains no implementation code.
    - Exported and importable via `import type`.

- [x] TASK: Define `RegistrationClient` contract
  - Files: `src/ports/registration-client.ts`
  - Acceptance:
    - Interface declares `register(manifest: PlatformManifest): Promise<RegistrationReceipt>`.
    - `RegistrationReceipt` type is defined in the same file and captures the fields the real platform service will return (at minimum: `registrationId: string`, `name: string`).
    - Throws `RegistrationError` on failure.
    - File contains no implementation code.
    - Imports `PlatformManifest` type from `src/services/platform-manifest-service.ts`.

- [x] TASK: Extend error taxonomy with `register`-specific errors
  - Files: `src/errors/cli-errors.ts`, `src/errors/cli-errors.test.ts`
  - Acceptance:
    - `ManifestNotFoundError` (exit 11): message includes the attempted file path.
    - `ManifestInvalidError` (exit 12): message includes the file path and the validation reason.
    - `RegistrationError` (exit 13): message includes the project name and the failure reason.
    - Exit codes 11–13 added to `EXIT_CODES`; the existing uniqueness test continues to pass.
    - All three classes are snapshot-tested in `cli-errors.test.ts`.

## Phase 2: `ProjectReader` adapter

- [ ] CODE: `LocalProjectReader` adapter
  - Feature: Read the content of an existing file from the local filesystem, mapping `ENOENT` to `ManifestNotFoundError`.
  - Files: `src/adapters/local-project-reader.ts`, `src/adapters/local-project-reader.test.ts`
  - Acceptance:
    - `readFile(filePath)` resolves with the UTF-8 string content of the file when it exists.
    - `readFile(filePath)` throws `ManifestNotFoundError` (with the path) when the file does not exist.
    - Any other filesystem error propagates as-is without wrapping.
    - Unit tests cover the success and `ENOENT` paths using a real temp directory (no mocks).

## Phase 3: `RegistrationClient` stub adapter

- [ ] CODE: `StubRegistrationClient` adapter
  - Feature: A stub adapter that simulates realistic registration behaviour, fulfilling `RegistrationClient` until the real platform service exists.
  - Files: `src/adapters/stub-registration-client.ts`, `src/adapters/stub-registration-client.test.ts`
  - Acceptance:
    - `register(manifest)` returns a `RegistrationReceipt` with a deterministic fabricated `registrationId` derived from the project name (e.g. `stub-<name>`) and the manifest `name`.
    - Simulates an already-registered failure: a second call with the same project name throws `RegistrationError`.
    - In-memory state is reset on construction; each test creates a fresh instance.
    - Unit tests cover: first registration succeeds and returns a receipt, second registration for the same name throws `RegistrationError`, app and static manifests both succeed.
    - `src/container.ts` is updated to wire `StubRegistrationClient`.
    - The spike-guard test in `src/container.test.ts` is updated to include `StubRegistrationClient`.

## Phase 4: `register` command

- [ ] CODE: `register` command implementation
  - Feature: Implement `universe register [directory]` — reads `platform.yaml`, validates it, submits to `RegistrationClient`, and exits 0 with the project name and registration ID on success.
  - Files: `src/cli.ts`, `src/bin.ts`
  - Acceptance:
    - `register` is removed from `DEFERRED_COMMANDS` in `src/cli.ts`.
    - `CliDependencies` gains `projectReader` and `registrationClient` as inline structural types.
    - `universe register` (no args) resolves `platform.yaml` relative to `cwd`.
    - `universe register <dir>` resolves `platform.yaml` relative to the given directory.
    - Arguments beyond one optional directory return exit 1 with an actionable message.
    - A missing `platform.yaml` throws `ManifestNotFoundError` (exit 11).
    - A malformed or schema-invalid `platform.yaml` throws `ManifestInvalidError` (exit 12); both YAML parse errors and `ZodError` are caught and wrapped.
    - A `RegistrationError` from the client returns exit 13.
    - On success, exits 0 and output contains the project name and registration ID.
    - `src/bin.ts` wires `LocalProjectReader` and `StubRegistrationClient`.

- [ ] CODE: CLI unit tests for `register`
  - Feature: Unit test coverage for all `register` command paths via `runCli`.
  - Files: `src/cli.test.ts`
  - Acceptance:
    - Happy path: exits 0, output contains the project name and registration ID.
    - Missing `platform.yaml`: exits 11.
    - Invalid `platform.yaml` (bad YAML): exits 12.
    - Invalid `platform.yaml` (fails schema): exits 12.
    - Registration client throws `RegistrationError`: exits 13.
    - Extra arguments beyond one directory: exits 1.

- [ ] CODE: E2E test for `create` → `register` flow
  - Feature: End-to-end test that scaffolds a project with `create` then registers it with `register`, verifying both commands succeed in sequence.
  - Files: `src/register.e2e.test.ts`
  - Acceptance:
    - `create` is run (via `runCli`) to scaffold a Node.js project in a temp directory.
    - `register` is run (via `runCli`) against the scaffolded directory.
    - `register` exits 0 and output contains the project name and registration ID.
    - A second `register` call against the same directory exits 13 (already registered).
    - Temp directory is cleaned up after the test.

## Traceability Matrix

| PRD Requirement ID | TODO Item                                                                         | Status       |
| ------------------ | --------------------------------------------------------------------------------- | ------------ |
| FR-1               | Phase 4 / CODE: `register` command implementation (remove from DEFERRED_COMMANDS) | not started  |
| FR-8               | Phase 3 / CODE: `StubRegistrationClient` (simulates realistic behaviour)          | not started  |
| FR-10              | Phase 1 / TASK: Define `ProjectReaderPort` and `RegistrationClient` contracts     | not started  |
| FR-11              | (existing — migration notes in `design/future-command-expansion.md`)              | pre-existing |
| FR-12              | Phase 1 / TASK: Contract definition gate                                          | not started  |
| FR-12              | Phase 4 / CODE: `register` command implementation + E2E test                      | not started  |
