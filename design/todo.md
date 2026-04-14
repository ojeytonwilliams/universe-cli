# Create Command Extension — TODO

Requirements reference: `plans/universe-cli/create-extension-prd.md`

---

## Phase 1 — Centralize dependency versions and update to major ranges (FR-13, FR-14 partial)

- [x] CODE: Extract dependency versions to a centralized config and update docker-compose to use pnpm
  - Feature: all version intent strings live in one file as major-version ranges; `docker-compose.dev.yml` uses pnpm
  - Files: `src/services/layers/dependency-versions.ts` (new), `src/services/layers/base-node-js-typescript-layer.ts`, `src/services/layers/frameworks-layer.ts`
  - Acceptance:
    - `src/services/layers/dependency-versions.ts` exports a single const object mapping each dependency name to a `^major` range (e.g. `"express": "^5"`, `"typescript": "^5"`)
    - `base-node-js-typescript-layer.ts` imports version strings from `dependency-versions.ts`; no hardcoded version string remains in the file
    - `frameworks-layer.ts` imports version strings from `dependency-versions.ts`; no hardcoded version string remains in the file
    - `docker-compose.dev.yml` template uses `pnpm install && pnpm dev` instead of npm equivalents
    - `pnpm test` passes (snapshot tests updated to reflect range version strings and docker-compose change; exact version pinning is deferred to Phase 3)

---

## Phase 2 — pnpm supply chain security scaffold artefacts (FR-14)

- [x] CODE: Add `.npmrc` and `only-allow` enforcement to Node.js scaffold
  - Feature: generated Node.js projects include pnpm security hardening files
  - Files: `src/services/layers/base-node-js-typescript-layer.ts`
  - Acceptance:
    - Generated `.npmrc` contains `blockExoticSubdeps=true`, `minimumReleaseAge=1440`, `trustPolicy=no-downgrade`, and `engine-strict=true` on separate lines
    - Generated `package.json` includes `"preinstall": "npx only-allow pnpm"` in `scripts`
    - Static scaffold (`base-static-layer.ts`) is not modified and generates no `.npmrc`
    - `pnpm test` passes (integration test snapshots updated to include `.npmrc` and the `preinstall` script)

---

## Phase 3 — PackageManager port and pnpm adapter (FR-15)

- [ ] CODE: Define PackageManager port and error type
  - Feature: typed port interface for package manager install operations
  - Files: `src/ports/package-manager.ts`, `src/errors/cli-errors.ts`
  - Acceptance:
    - `PackageManager` interface exported from `src/ports/package-manager.ts` with method `install(projectDirectory: string): Promise<void>`
    - `PackageInstallError` exported from `src/errors/cli-errors.ts` as a `CliError` subclass with a unique exit code not used by any existing error
    - `pnpm test` and `pnpm lint` pass

- [ ] CODE: Implement PnpmPackageManagerAdapter
  - Feature: pnpm-backed install adapter that pins exact versions into `package.json` after install
  - Files: `src/adapters/pnpm-package-manager-adapter.ts`, `src/adapters/pnpm-package-manager-adapter.test.ts`
  - Acceptance:
    - `PnpmPackageManagerAdapter.install(dir)` performs three steps in sequence: (1) runs `pnpm install` in `dir`, (2) reads exact resolved versions of all direct dependencies from the generated `pnpm-lock.yaml`, (3) overwrites the version values in `package.json` with the exact resolved versions (e.g. `"^5"` becomes `"5.1.2"`)
    - After `install` completes, `package.json` contains no range specifiers — all dependency versions are exact
    - When any step exits non-zero or fails, `install` rejects with `PackageInstallError`
    - Unit tests verify: correct pnpm command is invoked; `package.json` is updated with versions read from the lockfile; a non-zero exit from pnpm produces `PackageInstallError` (using a test double for the subprocess mechanism and filesystem reads, not a real pnpm call)
    - `pnpm test` and `pnpm lint` pass

- [ ] CODE: Wire PackageManager into container and create handler
  - Feature: create handler calls `packageManager.install` for Node.js scaffolds
  - Files: `src/container.ts`, `src/commands.ts`
  - Acceptance:
    - `PnpmPackageManagerAdapter` is wired in `src/container.ts` and the spike-guard test asserts it
    - `Adapters` type in `src/commands.ts` includes `packageManager: PackageManager`
    - The create handler calls `packageManager.install(targetDirectory)` after `filesystemWriter.writeProject` and only when the selected runtime is Node.js (not static)
    - Integration tests inject an inline `PackageManager` test double and still pass
    - `pnpm test` passes

---

## Phase 4 — RepoInitialiser port and git adapter (FR-16)

- [ ] CODE: Define RepoInitialiser port and error type
  - Feature: typed port interface for repository initialisation
  - Files: `src/ports/repo-initialiser.ts`, `src/errors/cli-errors.ts`
  - Acceptance:
    - `RepoInitialiser` interface exported from `src/ports/repo-initialiser.ts` with method `initialise(projectDirectory: string): Promise<void>`
    - `RepoInitialisationError` exported from `src/errors/cli-errors.ts` as a `CliError` subclass with a unique exit code not used by any existing error (including `PackageInstallError`)
    - `pnpm test` and `pnpm lint` pass

- [ ] CODE: Implement GitRepoInitialiserAdapter
  - Feature: git-backed repo initialiser adapter
  - Files: `src/adapters/git-repo-initialiser-adapter.ts`, `src/adapters/git-repo-initialiser-adapter.test.ts`
  - Acceptance:
    - `GitRepoInitialiserAdapter.initialise(dir)` runs `git init`, `git add .`, and `git commit -m "chore: initial commit"` in `dir`, in that order
    - When any command exits non-zero, `initialise` rejects with `RepoInitialisationError`
    - Unit tests verify correct command sequence and that any non-zero exit produces `RepoInitialisationError` (using a test double for subprocess, not a real git call)
    - `pnpm test` and `pnpm lint` pass

- [ ] CODE: Wire RepoInitialiser into container and create handler
  - Feature: create handler calls `repoInitialiser.initialise` for all scaffold types
  - Files: `src/container.ts`, `src/commands.ts`
  - Acceptance:
    - `GitRepoInitialiserAdapter` is wired in `src/container.ts` and the spike-guard test asserts it
    - `Adapters` type includes `repoInitialiser: RepoInitialiser`
    - The create handler calls `repoInitialiser.initialise(targetDirectory)` after `packageManager.install` (for Node.js) or after `filesystemWriter.writeProject` (for static)
    - `PackageInstallError` propagates without calling `repoInitialiser.initialise`
    - Integration tests inject an inline `RepoInitialiser` test double and still pass
    - `pnpm test` passes

---

## Phase 5 — Integration tests and validation (FR-17)

- [ ] CODE: Update integration tests to cover the extended create flow
  - Feature: integration tests reflect the full Phase 1–4 create flow using inline test doubles for the new adapters
  - Files: `src/integration-tests/create.test.ts`
  - Acceptance:
    - Integration test helper injects inline test doubles for `packageManager` and `repoInitialiser` (e.g. `{ install: vi.fn() }`)
    - At least one Node.js scenario asserts that `packageManager.install` is called with the correct target directory
    - At least one static scenario asserts that `packageManager.install` is not called
    - At least one scenario (Node.js and one Static) asserts that `repoInitialiser.initialise` is called with the correct target directory
    - Snapshot tests still pass with updated artefacts from Phases 1–2
    - `pnpm test` passes

- [ ] TASK: Run full validation
  - Acceptance:
    - `pnpm test` passes
    - `pnpm lint` passes
    - `pnpm check` passes

---

## Traceability Matrix

| PRD Requirement | TODO Phase / Item                                                |
| --------------- | ---------------------------------------------------------------- |
| FR-13           | Phase 1 — Centralize dependency versions                         |
| FR-14           | Phase 1 (docker-compose), Phase 2 (`.npmrc`, `only-allow`)       |
| FR-15           | Phase 3 — PackageManager port, adapter, wiring                   |
| FR-16           | Phase 4 — RepoInitialiser port, adapter, wiring                  |
| FR-17           | Phase 3 & 4 (handler wiring), Phase 5 (integration tests)        |
| Error taxonomy  | Phase 3 (PackageInstallError), Phase 4 (RepoInitialisationError) |
