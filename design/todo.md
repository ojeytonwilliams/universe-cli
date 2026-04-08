# Universe CLI Spike — Implementation TODO Plan

## Phase 0 — Foundations (Create-First Skeleton)

- [x] TASK: Define repository structure and command execution flow for the reduced CLI spike
  - Deliverable: architecture note documenting command layer, ports, local adapters, and stub-command boundaries.
  - Acceptance:
    - Architecture note is created at `plans/universe-cli/architecture.md`.
    - Architecture document names every external boundary as a port.
    - No command directly imports infrastructure-specific implementations.

- [x] TASK: Set up test harness and quality gates for stub-only execution
  - Deliverable: unit, contract, and CLI integration test scaffolding.
  - Acceptance:
    - Tests can run locally without network access.
    - A guard test/assertion fails if a real adapter is wired in spike mode.
    - CI/local test gate includes unit + contract + CLI suites and is executable via one documented command.

- [x] TASK: Define shared error taxonomy and CLI output conventions
  - Deliverable: canonical error classes/codes + output style guide.
  - Acceptance:
    - At least 5 core error categories are defined and mapped to exit codes.
    - Includes one standardized non-implemented error contract used by all 8 stubbed commands.
    - Includes `InvalidNameError`, `TargetDirectoryExistsError`, `UnsupportedRuntimeError`, `UnsupportedFrameworkError`, `UnsupportedCombinationError`, `InvalidMultiSelectError`, `MissingLayerError`, `LayerConflictError`, `ScaffoldWriteError`, and `DeferredCommandError`.
    - Example command outputs are covered by snapshot/golden tests.
    - Standardized non-implemented contract defines exact message template and exit code for all 8 deferred commands.

- [x] TASK: Add minimal observability guardrails for the spike
  - Deliverable: `ObservabilityClient` port + default stub/no-op client + centralized command runner boundary.
  - Acceptance:
    - All commands depend on the `ObservabilityClient` port, with stub/no-op as the only spike implementation.
    - No integration with real o11y backends occurs during spike implementation.
    - O11y is best-effort and cannot block command success/failure.
    - Contract tests verify o11y failures are swallowed and command exit behavior remains unchanged.

- [x] TASK: Create and maintain spike assumptions register
  - Deliverable: living assumptions log used by the create-first phases.
  - Reference: `plans/universe-cli/assumptions-register.md`
  - Acceptance:
    - Captures current known assumptions at spike start.
    - Records reduced-matrix decisions and future expansion triggers.

---

## Phase 1 — Command Surface + Stub Contract

- [x] CODE: Implement CLI command routing for all 9 commands
  - Feature: preserve public command surface while narrowing functional scope. The commands are `create`, `register`, `deploy`, `promote`, `rollback`, `logs`, `status`, `list`, and `teardown`.
  - Acceptance:
    - `universe --help` shows all 9 commands.
    - All non-`create` commands are invocable.

- [x] CODE: Implement shared non-implemented stub behavior for the 8 deferred commands
  - Feature: deterministic placeholder behavior for `register`, `deploy`, `promote`, `rollback`, `logs`, `status`, `list`, and `teardown`.
  - Acceptance:
    - Each deferred command exits non-zero.
    - Each deferred command emits the same standardized “not implemented in spike” contract.

- [x] TASK: Test completion gate for stubbed commands
  - Acceptance:
    - CLI tests verify help output and stubbed-command behavior.
    - Snapshot/golden tests verify standardized error output.

---

## Phase 2 — `universe create` Prompt Flow and Validation

- [ ] CODE: Implement interactive `create` prompt flow
  - Feature: collect name, runtime, framework, databases, and platform services.
  - Acceptance:
    - Prompts follow this order: name, runtime, framework, databases, platform services, confirmation.
    - Prompt flow is interactive-only.
    - Includes a final confirmation summary before files are written.
    - User receives actionable feedback for invalid input.

- [ ] CODE: Implement `create` input validation
  - Feature: validate names and supported combinations before scaffolding.
  - Acceptance:
    - Name must be lowercase kebab-case, start with a letter, and be 3–50 characters long.
    - Invalid name formats are rejected with typed validation errors.
    - Existing target directory is rejected safely.
    - `None` excludes all other values in the same multi-select group.
    - Unsupported runtime/framework/service combinations fail with clear unsupported-in-spike errors.

- [ ] TASK: Lock the supported matrix for the spike
  - Deliverable: explicit support table for generated template combinations.
  - Acceptance:
    - Supports Node.js (TypeScript) + Express.
    - Supports Node.js (TypeScript) + None.
    - Supports Static + None.
    - Supports PostgreSQL, Redis, Auth, Email, and Analytics only within the supported Node.js paths.
    - Supports `None` only for Static databases and platform services.
    - Explicitly documents deferred options: Python, Go, Next.js, Fastify, Hono, Flask, MongoDB, SQLite.

- [ ] TASK: Lock the Static scaffold convention
  - Deliverable: explicit Static project layout and local-serving convention.
  - Acceptance:
    - Static starter files live under `public/`.
    - Static scaffolds use `serve` as the single local webserver for this spike.
    - Static `docker-compose.dev.yml` and `Procfile` both start `serve` against `public/`.

---

## Phase 3 — Layer Composition and Artifact Generation

- [ ] CODE: Implement deterministic layer resolution for `create`
  - Feature: assemble scaffold from runtime, framework, service, and always-on layers.
  - Acceptance:
    - Composition follows `always/` + `base/{runtime}` + `frameworks/{framework}` + `services/{each}`.
    - Services are resolved in stable sorted order.
    - Same inputs produce the same resolved layer set.
    - Configuration merging is allowed only for `.json`, `.yaml`, and `.yml` files.
    - Configuration merge semantics are explicit: later layers add missing keys and overwrite earlier values on direct key conflicts.
    - Any non-configuration file path collision fails with `LayerConflictError` before files are written.
    - Conflicts introduced within the same layer stage fail with `LayerConflictError`.
    - Missing layers fail with typed errors.

- [ ] CODE: Generate required project artifacts
  - Feature: write the starter project to disk.
  - Acceptance:
    - Generates project folder, runtime-specific starter source files, `platform.yaml`, `README.md`, `docker-compose.dev.yml`, `Procfile`, and `.gitignore`.
    - Every supported scaffold, including `Static`, includes `docker-compose.dev.yml` for a unified local DX.
    - Static scaffolds write HTML/CSS/JS starter files into `public/`.
    - Node.js (TypeScript) scaffolds include `src/index.ts`, `package.json`, and `tsconfig.json`.
    - Static scaffolds include `public/index.html`, `public/styles.css`, and `public/main.js`.
    - Does not call or mutate any registration/provisioning state.
    - Leaves no partial scaffold after unrecoverable write failure.

- [ ] CODE: Generate `platform.yaml` from selected inputs
  - Feature: derive developer-facing platform metadata from `create` selections.
  - Acceptance:
    - Uses ADR-007 service naming.
    - Includes selected services and appropriate stack shape.
    - Static scaffolds use the static-oriented schema when applicable.
    - App stacks include the required `name`, `owner`, `domain`, `environments`, `services`, and `resources` fields.
    - Static stacks include the required `name`, `stack`, `domain`, and `environments` fields.
    - Selected services appear in stable order.

---

## Phase 4 — Tests, Documentation, and Migration Notes

- [ ] TASK: Test completion gate for `create`
  - Acceptance:
    - Unit tests cover validation and layer selection.
    - Contract tests pass for `PromptPort`, `CreateInputValidator`, `LayerResolver`, `FilesystemWriter`, `PlatformManifestGenerator`, and `ObservabilityClient`.
    - CLI tests verify prompt flow and generated artifacts.
    - Tests cover the legal/illegal selection matrix.
    - Snapshot tests cover Static and Node.js scaffold outputs.
    - E2E tests iterate every allowed runtime/framework/services combination in spike scope and confirm a project folder is created for each successful `create` flow.
    - E2E tests cover all remaining CLI command flows in spike scope (`create` validation/conflict failures and all 8 deferred commands).
    - E2E conflict tests cover config merge overwrite behavior and non-config collision failure behavior.

- [ ] TASK: Document assumptions, unknowns, and future adapter needs for `create`
  - Acceptance:
    - Documents current assumptions and unknowns for template/layer interfaces.
    - Documents required future adapter capabilities and matrix-expansion triggers.
    - Appends any new assumptions discovered during `create` implementation to the assumptions register.

- [ ] TASK: Define future-command expansion notes
  - Acceptance:
    - Documents how the 8 stubbed commands will evolve from the shared non-implemented contract.
    - Identifies what shared infrastructure can be reused when `register` is implemented later.

---

## Requirement-to-TODO Traceability

- FR-1 (public command surface): Phase 1
- FR-2 (`create` local scaffolding): Phases 2–3
- FR-3 (`create` prompt model): Phase 2
- FR-4 (curated supported matrix): Phase 2
- FR-5 (generated artifacts): Phase 3
- FR-6 (`platform.yaml` generation): Phase 3
- FR-7 (layer composition and validation): Phases 2–3
- FR-8 (stub-only architecture): Phases 0–1
- FR-9 (error taxonomy and UX): Phases 0–2
- FR-10 (contract-driven adapters): Phases 0, 3, 4
- FR-11 (migration path readiness): Phases 0, 4
