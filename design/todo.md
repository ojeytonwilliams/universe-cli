# TODO

## Phase 1: Move create's private modules

- [ ] TASK: Move `src/package-manager/` to `src/commands/create/package-manager/`
  - Move all files verbatim; do not change their contents
  - Update `src/commands.ts` imports to use the new path

- [ ] TASK: Move `src/prompt/` to `src/commands/create/prompt/`
  - Move all files verbatim; do not change their contents
  - Update `src/commands.ts` imports to use the new path

- [ ] TASK: Update `src/bin.ts` imports for moved modules
  - `./prompt/prompt.port.js` → `./commands/create/prompt/prompt.port.js`
  - `./prompt/clack-prompt.js` → `./commands/create/prompt/clack-prompt.js`
  - `./package-manager/package-manager.service.js` → `./commands/create/package-manager/package-manager.service.js`
  - `./package-manager/pnpm-package-manager.js` → `./commands/create/package-manager/pnpm-package-manager.js`
  - `./package-manager/bun-package-manager.js` → `./commands/create/package-manager/bun-package-manager.js`

- [ ] TASK: Update all integration test imports for moved modules
  - All 9 test files import `StubPackageManager` and `PackageManagerService` from `../package-manager/` — update to `../commands/create/package-manager/`
  - All 9 test files import `Prompt` / `CreateSelections` from `../prompt/` — update to `../commands/create/prompt/`

- [ ] TASK: Confirm `pnpm test` passes, then delete old `src/package-manager/` and `src/prompt/` directories

## Phase 2: Split `commands.ts` into per-command directories

- [ ] TASK: Extract `readAndValidateManifest` from `src/commands.ts` to `src/services/platform-manifest-service.ts`
  - Add as an exported function alongside the existing service
  - It is used by all 8 non-create commands so belongs in `services/` per the boundary rules

- [ ] TASK: Move `handleCreate` to `src/commands/create/index.ts`
  - Update the import of `readAndValidateManifest` (not used by create, no change needed)
  - Export `handleCreate` from the new location

- [ ] TASK: Move each remaining handler to its own `src/commands/<name>/index.ts`
  - `handleRegister` → `src/commands/register/index.ts`
  - `handleDeploy` → `src/commands/deploy/index.ts`
  - `handlePromote` → `src/commands/promote/index.ts`
  - `handleRollback` → `src/commands/rollback/index.ts`
  - `handleLogs` → `src/commands/logs/index.ts`
  - `handleStatus` → `src/commands/status/index.ts`
  - `handleList` → `src/commands/list/index.ts`
  - `handleTeardown` → `src/commands/teardown/index.ts`
  - Each file imports `readAndValidateManifest` from `../../services/platform-manifest-service.js`
  - `CliResult` and `HandlerResult` types should be re-exported from one canonical location (e.g. `src/commands/create/index.ts` or a shared `src/commands/types.ts`)

- [ ] TASK: Update `src/bin.ts` to import each handler from its new location
  - Replace the single `from "./commands.js"` import block with per-command imports

- [ ] TASK: Confirm `pnpm test` passes, then delete `src/commands.ts`
