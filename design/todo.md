# TODO

## Phase 1: Scaffold Files Tree

- [ ] TASK: Create `/files/` directory tree with all scaffold files and `.gitkeep` sentinels per the structure in `plans/universe-cli/layer-file-repository.md` — covering `always/`, `runtime/`, `package-manager/`, `framework/`, `service/`, and `database/` subtrees

## Phase 2: Codegen Script

- [ ] CODE: Write `scripts/generate-layer-files.mjs` codegen script
  - Feature: Plain ESM script that walks `/files/{type}/{key}/`, validates filesystem/JSON consistency (stale-folder check and missing-folder check both run before any writes), then injects the `files` key into every layer JSON
  - Files: `scripts/generate-layer-files.mjs`
  - Acceptance:
    - `node scripts/generate-layer-files.mjs` populates `files` in all six layer JSONs with correct UTF-8 content
    - `.gitkeep` is excluded from every generated `files` map
    - A folder containing only `.gitkeep` produces `files: {}`
    - Script exits with an informative error when a `/files/` subfolder has no matching JSON entry (stale folder)
    - Script exits with an informative error when a JSON entry has no matching folder (missing folder)
    - Neither check writes anything; both must pass before any JSON is touched
- [ ] CODE: Add `.gitkeep` presence validation to `scripts/generate-layer-files.mjs`
  - Feature: Before processing, verify every `/files/{type}/{key}/` folder contains a `.gitkeep` file; emit a distinct, actionable error message for each violation type
  - Files: `scripts/generate-layer-files.mjs`
  - Acceptance:
    - When a folder has a matching JSON entry but no `.gitkeep`, the script exits with: `Error: files/{type}/{key}/ is missing a .gitkeep — please add one`
    - When a folder has no `.gitkeep` AND no matching JSON entry, the script exits with: `Error: files/{type}/{key}/ has no .gitkeep and no entry in {type}.json — add the JSON entry or remove the folder`
    - All `.gitkeep` checks run as part of the pre-write validation pass (no writes occur if any check fails)
    - A folder that has a `.gitkeep` plus other files passes validation and proceeds to codegen normally

## Phase 3: Layer JSON Restructuring

- [ ] TASK: Strip the `files` key from `layers/runtime.json`, `layers/package-manager.json`, `layers/framework.json`, `layers/service.json`, and `layers/database.json`
- [ ] TASK: Restructure `layers/always.json` to `{ "always": {} }` (add top-level `"always"` key, remove any existing `files` content)
- [ ] TASK: Run `node scripts/generate-layer-files.mjs` and verify the output in each JSON matches the file content in the corresponding `/files/` subtree

## Phase 4: Schema and Service Updates

- [ ] CODE: Update `AlwaysSchema` in `src/commands/create/layer-composition/schemas/layers.ts`
  - Feature: Change `AlwaysSchema` from `z.strictObject({ files: ... })` to a record keyed by `z.literal("always")` matching the new `{ "always": { files: ... } }` shape
  - Files: `src/commands/create/layer-composition/schemas/layers.ts`
  - Acceptance:
    - Schema validates `{ "always": { "files": { ... } } }` and rejects any other shape
    - Parsing the restructured `always.json` through the schema succeeds without errors
- [ ] CODE: Update `layer-composition-service.ts` to remove the manual `always` wrapper
  - Feature: Change `always: { always: alwaysLayer }` to `always: alwaysLayer` since `alwaysLayer` is already keyed by `"always"` post-restructure
  - Files: `src/commands/create/layer-composition/layer-composition-service.ts`
  - Acceptance:
    - Layer composition service correctly resolves `always` layer files at runtime
    - All existing layer-composition tests pass

## Phase 5: Tooling Integration and Validation

- [ ] TASK: Add `"files/**"` to the `exclude` array in `tsconfig.json` so TypeScript ignores scaffold `.ts`/`.tsx` files that use template variables and uninstalled imports
- [ ] TASK: Add `files/**` to the oxlint ignore config so the linter skips scaffold files
- [ ] CODE: Wire up Vitest `globalSetup` to run codegen before tests
  - Feature: Add `scripts/vitest-setup.mjs` that imports and calls `generateLayerFiles()`, then register it under `globalSetup` in `vitest.config.ts` so JSON files are written once in the main process before any test worker imports them
  - Files: `scripts/vitest-setup.mjs`, `vitest.config.ts`
  - Acceptance:
    - Running `pnpm test` without pre-running codegen still produces populated layer JSONs before any test runs
    - No test worker receives stale or empty `files` values
- [ ] TASK: Add `"codegen": "node scripts/generate-layer-files.mjs"` to `package.json` scripts
- [ ] TASK: Run `pnpm test`; confirm all tests pass with no failures

## Traceability Matrix

| Requirement ID                          | TODO Item                                                 | Status |
| --------------------------------------- | --------------------------------------------------------- | ------ |
| REQ-1 (files tree)                      | Phase 1 / TASK: Create `/files/` directory tree           | mapped |
| REQ-2 (codegen script)                  | Phase 2 / CODE: Write `scripts/generate-layer-files.mjs`  | mapped |
| REQ-3 (validation before writes)        | Phase 2 / CODE: Write `scripts/generate-layer-files.mjs`  | mapped |
| REQ-11 (.gitkeep presence check)        | Phase 2 / CODE: Add `.gitkeep` presence validation        | mapped |
| REQ-4 (strip files from JSONs)          | Phase 3 / TASK: Strip `files` key from layer JSONs        | mapped |
| REQ-4 (restructure always.json)         | Phase 3 / TASK: Restructure `layers/always.json`          | mapped |
| REQ-4 (verify round-trip)               | Phase 3 / TASK: Run codegen and verify output             | mapped |
| REQ-5 (AlwaysSchema)                    | Phase 4 / CODE: Update `AlwaysSchema`                     | mapped |
| REQ-6 (layer-composition-service)       | Phase 4 / CODE: Update `layer-composition-service.ts`     | mapped |
| REQ-7 (TypeScript exclusion)            | Phase 5 / TASK: Add `files/**` to `tsconfig.json` exclude | mapped |
| REQ-8 (oxlint exclusion)                | Phase 5 / TASK: Add `files/**` to oxlint ignore config    | mapped |
| REQ-9 (Vitest globalSetup)              | Phase 5 / CODE: Wire up Vitest `globalSetup`              | mapped |
| REQ-10 (codegen script in package.json) | Phase 5 / TASK: Add `codegen` script to `package.json`    | mapped |
| NFR-1 (plain ESM, no transpiler)        | Phase 2 / CODE: Write `scripts/generate-layer-files.mjs`  | mapped |
| NFR-2 (atomic validation)               | Phase 2 / CODE: Write `scripts/generate-layer-files.mjs`  | mapped |
| NFR-3 (SEA compatibility)               | Phase 4 / CODE: Update `layer-composition-service.ts`     | mapped |
| NFR-4 (committed JSONs reflect files/)  | Phase 3 / TASK: Run codegen and verify output             | mapped |
