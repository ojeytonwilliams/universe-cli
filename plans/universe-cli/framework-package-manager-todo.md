# TODO — Create Extensibility: Framework Layers + Package Manager Selection

Requirements reference: `plans/universe-cli/framework-package-manager-prd.md`

---

## Phase 1 — Create input and validation contract (FR-1, FR-2)

- [x] CODE: Rename `node_ts` → `node`, add `typescript` framework option, and add package-manager selection to create prompt contract
  - Feature: runtime value corrected to `node`; TypeScript promoted to a selectable framework; Node-only package-manager choice (`pnpm`, `bun`) captured in create selections
  - Files: `src/ports/prompt.ts`, `src/adapters/clack-prompt-adapter.ts`, `src/adapters/clack-prompt-adapter.test.ts`
  - Acceptance:
    - `RUNTIME_OPTIONS.NODE_TS` renamed to `RUNTIME_OPTIONS.NODE` with value `"node"`; label remains "Node.js (TypeScript)" for now
    - `FRAMEWORK_OPTIONS` gains `TYPESCRIPT: "typescript"`; `FRAMEWORK_LABELS` gains corresponding label
    - `src/ports/prompt.ts` defines `PACKAGE_MANAGER_OPTIONS` (`pnpm`, `bun`), `PACKAGE_MANAGER_LABELS`, `PackageManagerOption` type, and `packageManager` field on `CreateSelections` (following the existing constants pattern)
    - Prompt asks for package manager only when runtime is `node`
    - Prompt confirmation includes selected package manager for Node
    - Static flow remains unchanged and does not request package manager
    - Tests are written first and initially fail, then pass after implementation

- [x] CODE: Enforce runtime/framework/package-manager compatibility in validation
  - Feature: invalid combinations fail before scaffold write
  - Files: `src/services/create-input-validation-service.ts`, `src/services/create-input-validation-service.test.ts`
  - Acceptance:
    - `node` runtime requires a supported package manager (`pnpm` or `bun`)
    - `static_web` rejects non-empty package-manager choice
    - `static_web` rejects `typescript` or `express` framework choice
    - Typed validation errors are asserted in tests
    - Tests are written first and initially fail, then pass after implementation

- [x] TASK: Document accepted selection tuples for this increment
  - Acceptance:
    - Matrix note added to planning docs covering all valid combinations: `node`+`typescript`+`pnpm`, `node`+`typescript`+`bun`, `node`+`express`+`pnpm`, `node`+`express`+`bun`, `node`+`none`+`pnpm`, `node`+`none`+`bun`, `static_web`+`none`+no-manager

---

## Phase 2 — Layer model refactor for extensibility (FR-3, FR-4, FR-5, FR-6, NFR-3)

- [ ] CODE: Add package-manager layer stage and data-driven framework resolution
  - Feature: layer ordering includes manager stage for Node and removes hardcoded framework branching requirement for future additions
  - Files: `src/services/layer-composition-service.ts`, `src/services/layer-composition-service.test.ts`
  - Acceptance:
    - Deterministic order: `always` → `base/{runtime}` → `package-managers/{manager}` (Node only) → `frameworks/{framework}` → `services/{service}`
    - Layer resolver uses `selections.runtime === "node"` (not `"node_ts"`) to gate PM stage
    - Missing layer and conflict error behavior remains typed and covered by tests
    - Layer-resolution tests include Node+pnpm, Node+bun, Static
    - Tests are written first and initially fail, then pass after implementation

- [ ] CODE: Rename and slim down the runtime layer
  - Feature: `base/node-js-typescript` becomes `base/node` containing only Node.js execution-environment primitives
  - Files: `src/services/layers/base-node-js-typescript-layer.ts` → rename to `src/services/layers/base-node-layer.ts`, relevant layer tests/snapshots
  - Acceptance:
    - File renamed; all imports updated
    - `base/node` contains: `Procfile`, `docker-compose.dev.yml` (command: `sh start.sh`)
    - `base/node` excludes: TypeScript devDep, `tsconfig.json`, `src/index.ts`, all scripts (`build`, `dev`, `start`, `preinstall`), `pnpm-workspace.yaml`
    - Tests/snapshots updated and passing
    - Tests are written first and initially fail, then pass after implementation

- [ ] CODE: Introduce `frameworks/typescript`, update `frameworks/express`, and add PM-layer artifacts
  - Feature: TypeScript is a framework; PM layers own `start.sh` and PM-specific scripts
  - Files: `src/services/layers/frameworks-layer.ts`, `src/services/layers/package-managers-layer.ts` (new), integration snapshots/tests
  - Acceptance:
    - `frameworks/typescript` contributes: TypeScript devDependency, `tsconfig.json`, `src/index.ts` (minimal TS HTTP server), `build: "tsc -p tsconfig.json"`, `start: "node dist/index.js"`
    - `frameworks/express` contributes: express dependency, TypeScript devDependency, express-specific `src/index.ts`, `build` and `start` scripts
    - `frameworks/none` remains empty
    - `package-managers/pnpm` layer contributes: `pnpm-workspace.yaml`, `start.sh` (content: `pnpm install && pnpm dev`), `dev: "pnpm run build && pnpm run start"` script, `preinstall: "npx only-allow pnpm"` script
    - `package-managers/bun` layer contributes: `start.sh` (content: `bun install && bun dev`), `dev: "bun run build && bun run start"` script (no preinstall hook in v1)
    - Static output excludes all Node package-manager artifacts
    - Tests are written first and initially fail, then pass after implementation

---

## Phase 3 — Package manager service orchestration (FR-7, NFR-2)

- [ ] CODE: Introduce package manager service abstraction over manager adapters
  - Feature: one service handles manager dispatch and install workflow
  - Files: `src/services/package-manager-service.ts` (new), `src/ports/package-manager.ts`, service tests (new)
  - Acceptance:
    - Service API accepts validated selection context and target directory
    - Service dispatches to pnpm or bun adapter based on selection
    - Service encapsulates `specifyDeps` + `install` sequence for Node
    - Service tests verify adapter dispatch and error propagation
    - Tests are written first and initially fail, then pass after implementation

- [ ] CODE: Add bun adapter and wire service into create flow
  - Feature: Node create supports `bun` without changing command-handler complexity
  - Files: `src/adapters/bun-package-manager-adapter.ts` (new), `src/adapters/bun-package-manager-adapter.test.ts` (new), `src/commands.ts`, `src/bin.ts`, `src/integration-tests/adapter-stubs.ts`
  - Acceptance:
    - `handleCreate` uses one package-manager service dependency
    - Static runtime does not execute package-manager operations
    - Bun adapter `specifyDeps` runs `bun install --frozen-lockfile` (lockfile-only resolution) then `bun list --json` to extract installed versions, then pins exact versions in `package.json` — matching pnpm's two-step approach
    - Bun adapter `install` runs `bun install` to install pinned deps
    - Bun adapter command behavior is covered by unit tests
    - Existing pnpm behavior remains covered
    - Tests are written first and initially fail, then pass after implementation

---

## Phase 4 — Integration stabilization and regression safety (FR-8, NFR-1)

- [ ] CODE: Expand create integration tests for manager/runtime/framework combinations
  - Feature: create flow coverage includes Node+typescript+pnpm, Node+express+pnpm, Node+typescript+bun, Static
  - Files: `src/integration-tests/create.test.ts`, `src/integration-tests/__snapshots__/create.test.ts.snap`, selection helpers in related tests if needed
  - Acceptance:
    - Integration scenarios assert correct package-manager service invocation for Node
    - Static scenario asserts no package-manager service invocation
    - Scaffold snapshots cover: `node`+`typescript`+`pnpm`, `node`+`express`+`pnpm`, `node`+`typescript`+`bun`, `static_web`+`none`
    - Snapshots are deterministic and updated
    - Tests are written first and initially fail, then pass after implementation

- [ ] TASK: Run full validation gate
  - Acceptance:
    - `pnpm test` passes
    - `pnpm lint` passes
    - `pnpm check` passes

---

## Traceability Matrix

| PRD Requirement ID | TODO Item                                                                                                                                 | Status |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| FR-1               | Phase 1 / CODE: Rename `node_ts` → `node`, add `typescript` framework option, and add package-manager selection to create prompt contract | mapped |
| FR-2               | Phase 1 / CODE: Enforce runtime/framework/package-manager compatibility in validation                                                     | mapped |
| FR-3               | Phase 2 / CODE: Add package-manager layer stage and data-driven framework resolution                                                      | mapped |
| FR-4               | Phase 2 / CODE: Rename and slim down the runtime layer                                                                                    | mapped |
| FR-5               | Phase 2 / CODE: Introduce `frameworks/typescript`, update `frameworks/express`, and add PM-layer artifacts                                | mapped |
| FR-6               | Phase 2 / CODE: Introduce `frameworks/typescript`, update `frameworks/express`, and add PM-layer artifacts                                | mapped |
| FR-7               | Phase 3 / CODE: Introduce package manager service abstraction over manager adapters                                                       | mapped |
| FR-7               | Phase 3 / CODE: Add bun adapter and wire service into create flow                                                                         | mapped |
| FR-8               | Phase 4 / CODE: Expand create integration tests for manager/runtime combinations                                                          | mapped |
| NFR-1              | Phase 4 / CODE: Expand create integration tests for manager/runtime combinations                                                          | mapped |
| NFR-2              | Phase 3 / CODE: Introduce package manager service abstraction over manager adapters                                                       | mapped |
| NFR-3              | Phase 2 / CODE: Add package-manager layer stage and data-driven framework resolution                                                      | mapped |
